import { APIError, type CollectionConfig } from 'payload'
import { authenticated } from '../access'

export const Fonts: CollectionConfig = {
  slug: 'fonts',
  labels: { singular: 'Font file', plural: 'Font files' },
  admin: {
    group: 'Website',
    useAsTitle: 'name',
    description:
      'Upload licensed WOFF2 or WOFF webfonts (up to 2 MB each). Add each regular, bold or italic file separately, then select them together in Theme tokens.',
  },
  access: { read: () => true, create: authenticated, update: authenticated, delete: authenticated },
  upload: {
    staticDir: 'font-files',
    mimeTypes: ['font/woff2', 'font/woff'],
    filesRequiredOnCreate: true,
  },
  hooks: {
    beforeOperation: [
      ({ req, operation }) => {
        if ((operation !== 'create' && operation !== 'update') || !req.file) return
        const file = req.file
        const bytes = file.data
        const signature = bytes.subarray(0, 4).toString('ascii')
        const extension = signature === 'wOF2' ? 'woff2' : signature === 'wOFF' ? 'woff' : null
        const minimumLength = extension === 'woff2' ? 48 : 44
        if (
          !extension ||
          !file.name.toLowerCase().endsWith(`.${extension}`) ||
          bytes.length < minimumLength ||
          bytes.length > 2 * 1024 * 1024 ||
          bytes.readUInt32BE(8) !== bytes.length ||
          bytes.readUInt16BE(12) === 0
        ) {
          throw new APIError('Upload a valid WOFF2 or WOFF webfont, no larger than 2 MB.', 400)
        }
        // Browsers sometimes send application/octet-stream for a valid font.
        file.mimetype = `font/${extension}`
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'For example: Brand Sans Regular, Brand Sans Bold, or Brand Sans Variable.',
      },
    },
    {
      name: 'weightFrom',
      label: 'Weight',
      type: 'number',
      required: true,
      min: 100,
      max: 900,
      defaultValue: 400,
      validate: (v: unknown) =>
        (typeof v === 'number' && Number.isInteger(v) && v >= 100 && v <= 900) ||
        'Enter a whole weight from 100 to 900.',
      admin: {
        description:
          'Regular is 400, bold is 700. For a variable font, enter its lowest supported weight.',
      },
    },
    {
      name: 'weightTo',
      label: 'Maximum weight (variable fonts only)',
      type: 'number',
      min: 100,
      max: 900,
      validate: (v: unknown, { siblingData }: { siblingData: { weightFrom?: number } }) =>
        v == null ||
        (typeof v === 'number' &&
          Number.isInteger(v) &&
          v >= (siblingData.weightFrom ?? 100) &&
          v <= 900) ||
        'Maximum weight must be at least the starting weight and no greater than 900.',
      admin: {
        description:
          'Leave empty for a single-weight font. For a variable font, enter its highest supported weight.',
      },
    },
    {
      name: 'style',
      type: 'select',
      options: ['normal', 'italic'],
      required: true,
      defaultValue: 'normal',
    },
  ],
}
