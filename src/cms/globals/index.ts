import type { GlobalConfig, Field } from 'payload'
import { authenticated } from '../access'
import { linkFields } from '../fields/shared'
import { tokenDefaults, validColor } from '../../design-system/tokens'
import { fontOptions, weightOptions, typographyDefaults } from '../../design-system/typography'

const publicAccess = { read: () => true, update: authenticated }
export const Navigation: GlobalConfig = {
  slug: 'navigation',
  admin: { group: 'Website' },
  access: publicAccess,
  versions: { max: 20 },
  fields: ['primary', 'secondary', 'footer'].map((name) => ({
    name,
    type: 'array',
    fields: linkFields,
  })),
}
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  admin: { group: 'Website' },
  access: publicAccess,
  versions: { max: 20 },
  fields: [
    { name: 'companyName', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'footerText', type: 'textarea' },
    { name: 'socialLinks', type: 'array', fields: linkFields },
    { name: 'legalLinks', type: 'array', fields: linkFields },
    { name: 'defaultShareImage', type: 'upload', relationTo: 'media' },
  ],
}
export const Theme: GlobalConfig = {
  slug: 'theme',
  label: 'Theme tokens',
  admin: { group: 'Website' },
  access: publicAccess,
  versions: { max: 20 },
  fields: [
    ...Object.entries(tokenDefaults).map(
      ([name, value]): Field => ({
        name,
        type: 'text',
        required: true,
        defaultValue: value,
        validate: (v: unknown) =>
          validColor(v) || 'Use a six-digit hex colour, for example #333333.',
      }),
    ),
    {
      type: 'collapsible',
      label: 'Fonts & weights',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'bodyFont',
          label: 'Body font',
          type: 'select',
          options: fontOptions,
          defaultValue: typographyDefaults.bodyFont,
          required: true,
        },
        {
          name: 'headingFont',
          label: 'Heading font',
          type: 'select',
          options: fontOptions,
          defaultValue: typographyDefaults.headingFont,
          required: true,
        },
        {
          name: 'bodyWeight',
          label: 'Body weight',
          type: 'select',
          options: weightOptions,
          defaultValue: typographyDefaults.bodyWeight,
          required: true,
        },
        {
          name: 'headingWeight',
          label: 'Heading weight',
          type: 'select',
          options: weightOptions,
          defaultValue: typographyDefaults.headingWeight,
          required: true,
        },
        {
          name: 'emphasisWeight',
          label: 'Emphasis weight',
          type: 'select',
          options: weightOptions,
          defaultValue: typographyDefaults.emphasisWeight,
          required: true,
          admin: {
            description:
              'Used for bold/emphasised text. Choose a weight at least as heavy as the body weight.',
          },
        },
        {
          name: 'typographySample',
          type: 'ui',
          admin: {
            components: { Field: '/src/editor/TypographyPreview#TypographyPreview' },
          },
        },
      ],
    },
  ],
}
export const SearchProfile: GlobalConfig = {
  slug: 'search-profile',
  label: 'Search Strategy',
  admin: { group: 'Search & evidence' },
  access: { read: authenticated, update: authenticated },
  versions: { max: 20 },
  fields: [
    ...[
      'companyDescription',
      'proposition',
      'audiences',
      'sectors',
      'markets',
      'differentiators',
      'customerQuestions',
      'objectives',
      'topics',
      'searchIntents',
      'tone',
      'approvedTerminology',
      'prohibitedClaims',
      'researchNotes',
    ].map((name) => ({ name, type: 'textarea' as const })),
    { name: 'services', type: 'relationship', relationTo: 'services', hasMany: true },
    { name: 'approvedFacts', type: 'relationship', relationTo: 'approved-facts', hasMany: true },
    {
      name: 'referenceURLs',
      type: 'array',
      fields: [
        { name: 'url', type: 'text', required: true },
        { name: 'approved', type: 'checkbox', defaultValue: false },
      ],
    },
    { name: 'allowSearchCrawlers', type: 'checkbox', defaultValue: true },
    { name: 'allowTrainingCrawlers', type: 'checkbox', defaultValue: false },
  ],
}
