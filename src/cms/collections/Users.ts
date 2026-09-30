import { APIError, type CollectionConfig, type Where } from 'payload'
import { administrator, adminField, isAI, readOnlyAI } from '../access'
import { withinLimit, clientIP } from '../../lib/rate-limit'

// PASSWORD_SIGN_IN: "all" (default), "admins" (administrators only, as a break-glass fallback
// once Google sign-in is set up) or "off". AI connection accounts always use their own
// credentials through the local bridge and are unaffected.
export const passwordPolicy = () =>
  (['all', 'admins', 'off'].includes(process.env.PASSWORD_SIGN_IN || '')
    ? process.env.PASSWORD_SIGN_IN
    : 'all') as 'all' | 'admins' | 'off'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200,
    maxLoginAttempts: 5,
    lockTime: 600000,
    cookies: { secure: process.env.SITE_ENV !== 'local', sameSite: 'Lax' },
  },
  admin: {
    useAsTitle: 'email',
    group: 'Administration',
    defaultColumns: ['name', 'email', 'role', 'updatedAt'],
  },
  access: {
    create: administrator,
    delete: administrator,
    read: ({ req }) =>
      req.user?.role === 'admin' ? true : req.user ? { id: { equals: req.user.id } } : false,
    // AI accounts are managed by administrators; they cannot change their own login details.
    update: ({ req }) =>
      readOnlyAI(req.user) || isAI(req.user)
        ? false
        : req.user?.role === 'admin'
          ? true
          : req.user
            ? { id: { equals: req.user.id } }
            : false,
  },
  hooks: {
    beforeOperation: [
      async ({ operation, req, args }) => {
        const http = req.payloadAPI !== 'local'
        // Accounts are created by administrators or the protected /setup page, never by an
        // anonymous "first user" registration on a freshly deployed site.
        if (operation === 'create' && http && !req.user)
          throw new APIError('Create the first administrator at /setup.', 403)
        // Password sign-in policy is enforced before any password is checked, so a disabled
        // password neither confirms a guess nor can be reset.
        const policy = passwordPolicy()
        if (
          http &&
          policy !== 'all' &&
          ['login', 'forgotPassword', 'resetPassword'].includes(operation)
        ) {
          const data = (args as { data?: { email?: string; token?: string } }).data || {}
          const where: Where | null = data.email
            ? { email: { equals: String(data.email).toLowerCase() } }
            : data.token
              ? { resetPasswordToken: { equals: String(data.token) } }
              : null
          const found = where
            ? (
                await req.payload.find({
                  collection: 'users',
                  where,
                  limit: 1,
                  depth: 0,
                  overrideAccess: true,
                  showHiddenFields: true,
                })
              ).docs[0]
            : null
          if (policy === 'off' || found?.role !== 'admin')
            throw new APIError('Password sign-in is turned off. Use Sign in with Google.', 403)
        }
        if (http && (operation === 'login' || operation === 'forgotPassword')) {
          const key = clientIP(req.headers)
          // Per network address; generous enough for an office sharing one IP. Local development
          // (test suites sign in repeatedly) uses a much higher ceiling.
          const limit = process.env.SITE_ENV === 'local' ? 1000 : 60
          if (!(await withinLimit(req.payload, `auth-${operation}`, key, limit, 900)))
            throw new APIError('Too many attempts. Wait a few minutes and try again.', 429)
        }
        return args
      },
    ],
    beforeLogin: [
      ({ user, req }) => {
        const policy = passwordPolicy()
        if (req.payloadAPI === 'local' || user.role === 'ai' || policy === 'all') return user
        if (policy === 'admins' && user.role === 'admin') return user
        throw new APIError('Password sign-in is turned off. Use Sign in with Google.', 403)
      },
    ],
  },
  fields: [
    {
      name: 'aiReadOnly',
      type: 'checkbox',
      defaultValue: false,
      label: 'Read-only AI connection',
      admin: {
        description:
          'Production AI connections can read content and approvals but cannot change them.',
      },
      access: { create: adminField, update: adminField },
    },
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        'admin',
        'editor',
        { label: 'AI contributor (cannot approve or publish)', value: 'ai' },
      ],
      access: { create: adminField, update: adminField },
    },
    {
      // Google's stable account ID, linked on first Google sign-in. Never shown or editable.
      name: 'googleSub',
      type: 'text',
      unique: true,
      index: true,
      admin: { hidden: true },
      access: { read: adminField, create: () => false, update: () => false },
    },
  ],
}
