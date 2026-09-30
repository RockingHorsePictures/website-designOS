import type { GlobalConfig, Field } from 'payload'
import { authenticated, humanField } from '../access'
import { linkFields } from '../fields/shared'
import { safeLink } from '../../lib/urls'
import { defaultLocale, localeLabel, supportedLocales } from '../../lib/locales'
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
    {
      type: 'collapsible',
      label: 'Brand assets',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'logo',
          label: 'Main logo',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description:
              'Used in the website header. A transparent PNG or WebP works well. Leave empty to display the company name.',
          },
        },
        {
          name: 'inverseLogo',
          label: 'Logo for dark backgrounds',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description:
              'Optional light version, available to the website designer for dark sections.',
          },
        },
        {
          name: 'siteIcon',
          label: 'Browser icon',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description:
              'A square PNG, ideally 512 × 512 pixels. This appears in browser tabs and bookmarks.',
          },
        },
      ],
    },
    { name: 'description', type: 'textarea', localized: true },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    {
      name: 'address',
      type: 'textarea',
      admin: { description: 'Postal address shown in Contact sections. One line per row.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'language',
          type: 'text',
          defaultValue: 'en',
          validate: (v: unknown) =>
            !v ||
            (typeof v === 'string' && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(v)) ||
            'Use a language tag such as en, en-GB or fr.',
          admin: { width: '50%', description: 'Website language, for example en-GB.' },
        },
        {
          name: 'organizationType',
          label: 'Organisation type (for search engines)',
          type: 'select',
          defaultValue: 'Organization',
          options: [
            'Organization',
            'Corporation',
            'LocalBusiness',
            'ProfessionalService',
            'NGO',
            'EducationalOrganization',
            'MedicalOrganization',
            'SportsOrganization',
            'PerformingGroup',
          ],
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'footerText', type: 'textarea', localized: true },
    { name: 'socialLinks', type: 'array', fields: linkFields },
    { name: 'legalLinks', type: 'array', fields: linkFields },
    { name: 'defaultShareImage', type: 'upload', relationTo: 'media' },
    {
      name: 'languages',
      label: 'Additional languages',
      type: 'select',
      hasMany: true,
      options: supportedLocales
        .filter((l) => l.code !== defaultLocale)
        .map((l) => ({ label: l.label, value: l.code })),
      admin: {
        description: `The main language is ${localeLabel(defaultLocale)}. Add languages to translate pages; untranslated fields show the main language. Translated pages live at /<code>/… (for example /fr/about).`,
      },
    },
    {
      type: 'collapsible',
      label: 'Announcement bar',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'announcement',
          type: 'group',
          label: false,
          fields: [
            { name: 'enabled', type: 'checkbox', defaultValue: false },
            { name: 'text', type: 'text', localized: true },
            { name: 'linkLabel', type: 'text', localized: true },
            {
              name: 'linkURL',
              type: 'text',
              validate: (v: unknown) =>
                !v || (typeof v === 'string' && safeLink(v)) || 'Use a safe link.',
            },
            { name: 'dismissible', type: 'checkbox', defaultValue: true },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Analytics & cookies',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'analytics',
          type: 'group',
          label: false,
          // Decides who receives visitor data / site ownership proofs: people only, never AI.
          access: { create: humanField, update: humanField },
          fields: [
            {
              name: 'provider',
              type: 'select',
              defaultValue: 'none',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Vercel Web Analytics (cookie-free)', value: 'vercel' },
                { label: 'Plausible (cookie-free)', value: 'plausible' },
                { label: 'Fathom (cookie-free)', value: 'fathom' },
                { label: 'Umami (cookie-free)', value: 'umami' },
                { label: 'Google Analytics 4 (uses cookies; asks consent)', value: 'ga4' },
              ],
            },
            {
              name: 'siteId',
              label: 'Site ID / domain / measurement ID',
              type: 'text',
              admin: {
                condition: (_, sibling) => !['none', 'vercel'].includes(sibling?.provider),
                description:
                  'Plausible: your domain · Fathom: site ID · Umami: website ID · GA4: G-XXXXXXX',
              },
              validate: (v: unknown) =>
                !v ||
                (typeof v === 'string' && /^[A-Za-z0-9._-]{1,80}$/.test(v)) ||
                'Check the ID.',
            },
            {
              name: 'scriptURL',
              label: 'Umami script URL',
              type: 'text',
              admin: { condition: (_, sibling) => sibling?.provider === 'umami' },
              validate: (v: unknown) =>
                !v || (typeof v === 'string' && /^https:\/\/[^\s"'<>]+$/.test(v)) || 'Use https.',
            },
          ],
        },
        {
          name: 'consent',
          type: 'group',
          label: 'Cookie notice',
          fields: [
            {
              name: 'message',
              type: 'textarea',
              localized: true,
              defaultValue:
                'We use cookies to understand how our website is used. You can accept or decline analytics cookies.',
            },
            { name: 'policyURL', type: 'text', label: 'Privacy policy link' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Search engine verification',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'verification',
          type: 'group',
          label: false,
          // Decides who receives visitor data / site ownership proofs: people only, never AI.
          access: { create: humanField, update: humanField },
          fields: [
            { name: 'google', label: 'Google Search Console code', type: 'text' },
            { name: 'bing', label: 'Bing Webmaster code', type: 'text' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Page not found (404)',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'notFound',
          type: 'group',
          label: false,
          fields: [
            { name: 'heading', type: 'text', localized: true, defaultValue: 'Page not found' },
            {
              name: 'message',
              type: 'textarea',
              localized: true,
              defaultValue: 'The page you were looking for has moved or no longer exists.',
            },
          ],
        },
      ],
    },
  ],
}
export const Theme: GlobalConfig = {
  slug: 'theme',
  label: 'Theme tokens',
  admin: { group: 'Website' },
  access: publicAccess,
  versions: { max: 20 },
  fields: [
    {
      type: 'collapsible',
      label: 'Colours',
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: Object.entries(tokenDefaults).map(
            ([name, value]): Field => ({
              name,
              ...(name === 'canvas' ? { label: 'Background' } : {}),
              type: 'text',
              required: true,
              defaultValue: value,
              admin: { width: '50%', components: { Field: '/src/editor/ColorField#ColorField' } },
              validate: (v: unknown) =>
                validColor(v) || 'Use a six-digit hex colour, for example #333333.',
            }),
          ),
        },
      ],
    },
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
          name: 'bodyFontFiles',
          label: 'Custom body font files',
          type: 'relationship',
          relationTo: 'fonts',
          hasMany: true,
          admin: {
            condition: (data) => data.bodyFont === 'custom',
            description:
              'Select the regular, bold and italic files from one font family, or its variable font file. You can create and upload a font here.',
          },
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
          name: 'headingFontFiles',
          label: 'Custom heading font files',
          type: 'relationship',
          relationTo: 'fonts',
          hasMany: true,
          admin: {
            condition: (data) => data.headingFont === 'custom',
            description:
              'Choose files from one font family. Match the heading weight to a weight supported by your files.',
          },
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
        {
          name: 'approved',
          type: 'checkbox',
          defaultValue: false,
          access: { create: humanField, update: humanField },
        },
      ],
    },
    {
      name: 'allowSearchCrawlers',
      label: 'Allow search engines (Google, Bing and others)',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'allowAnswerEngines',
      label: 'Allow AI answer engines to read and cite the site',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'ChatGPT search, Perplexity, Claude and similar assistants fetching pages to answer questions and link to you.',
      },
    },
    {
      name: 'allowTrainingCrawlers',
      label: 'Allow AI model-training crawlers',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}
