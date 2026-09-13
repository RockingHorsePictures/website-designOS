import type { Access, FieldAccess } from 'payload'

export const readOnlyAI = (
  user: { role?: string; aiReadOnly?: boolean | null } | null | undefined,
) => user?.role === 'ai' && user.aiReadOnly === true

export const authenticated: Access = ({ req }) => Boolean(req.user)
export const administrator: Access = ({ req }) => req.user?.role === 'admin'
export const adminField: FieldAccess = ({ req }) => req.user?.role === 'admin'
export const publishedOrAuthenticated: Access = ({ req }) =>
  req.user ? true : { _status: { equals: 'published' } }
