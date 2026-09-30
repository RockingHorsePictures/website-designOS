import { z } from 'zod'
import { embedAllowed, safeLink } from '../../lib/urls'
import { listingOrders } from '../../lib/ordering'

// Section contracts: the stored shape of every editor-facing section. Pure TypeScript so the CMS
// config, CLI tools and tests can import it. Renderers live in src/components/sections and Puck
// fields in ./config.tsx; tests/unit/registry.test.ts keeps all three in step.
//
// This base library is a structural safety net so owners can build and extend pages after launch.
// It is not a design template. Bespoke site designs add their own sections (see docs/SECTIONS.md) and
// may restyle or replace these renderers, keeping each section's stored props compatible.

const text = z.string().max(10000)
const short = z.string().max(300)
const id = z.number().int().positive()
const href = z.string().refine(safeLink, 'Use a safe internal link or https URL.')
const optionalHref = z.string().refine((v) => v === '' || safeLink(v), 'Use a safe link.')
export const mediaRef = z
  .object({ image: id.nullable(), alt: short, decorative: z.boolean() })
  .strict()
export const linkRef = z.object({ label: short, href: optionalHref }).strict()
const factRef = id.nullable()
const mode = z.enum(['all', 'manual'])
// How a list section orders its records; 'default' follows Site Settings → Listing order.
export const sectionOrders = ['default', ...listingOrders] as const
const order = z.enum(sectionOrders).optional()

// Entrance animation presets, defined in code (src/styles/proof.css). Optional on every section;
// reduced-motion preferences always turn them off.
export const motionPresets = ['none', 'fade', 'rise', 'zoom', 'slide'] as const
const section = <T extends string, P extends z.ZodRawShape>(type: T, props: P) =>
  z
    .object({
      type: z.literal(type),
      props: z
        .object({ id: z.string().min(1), motion: z.enum(motionPresets).optional(), ...props })
        .strict(),
    })
    .strict()

const leafSchemas = {
  // Original proof sections: IDs and props are stored in existing pages; keep them compatible.
  Intro: section('Intro', { heading: text, body: text, style: z.enum(['plain', 'surface']) }),
  CallToAction: section('CallToAction', { heading: text, body: text, label: text, href }),
  SelectedProjects: section('SelectedProjects', {
    heading: text,
    mode: z.enum(['latest', 'featured', 'manual']),
    order,
    projectIds: z.array(id).max(24),
    limit: z.number().int().min(1).max(24),
  }),
  Hero: section('Hero', {
    eyebrow: short,
    heading: text,
    body: text,
    media: mediaRef,
    primary: linkRef,
    secondary: linkRef,
    layout: z.enum(['stacked', 'split', 'background']),
  }),
  Text: section('Text', { heading: text, body: text, width: z.enum(['narrow', 'wide']) }),
  TextMedia: section('TextMedia', {
    heading: text,
    body: text,
    media: mediaRef,
    link: linkRef,
    mediaPosition: z.enum(['start', 'end']),
  }),
  Media: section('Media', {
    media: mediaRef,
    caption: short,
    size: z.enum(['content', 'wide', 'full']),
  }),
  Gallery: section('Gallery', {
    heading: text,
    items: z.array(z.object({ media: mediaRef, caption: short }).strict()).max(48),
  }),
  Video: section('Video', {
    heading: text,
    provider: z.enum(['vimeo', 'youtube']),
    videoId: z.string().regex(/^[A-Za-z0-9_-]{0,32}$/, 'Enter the video ID only.'),
    title: short,
    description: text,
    transcript: text,
    uploadDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Use YYYY-MM-DD.'),
    poster: mediaRef,
  }),
  Features: section('Features', {
    heading: text,
    intro: text,
    columns: z.enum(['2', '3', '4']),
    items: z
      .array(z.object({ title: short, body: text, link: linkRef, media: mediaRef }).strict())
      .max(24),
  }),
  Stats: section('Stats', {
    heading: text,
    items: z.array(z.object({ value: short, label: short, factId: factRef }).strict()).max(12),
  }),
  Quotes: section('Quotes', {
    heading: text,
    items: z
      .array(
        z
          .object({ quote: text, name: short, role: short, organisation: short, factId: factRef })
          .strict(),
      )
      .max(12),
  }),
  Logos: section('Logos', { heading: text, mode, order, clientIds: z.array(id).max(48) }),
  FAQ: section('FAQ', {
    heading: text,
    items: z.array(z.object({ question: short, answer: text }).strict()).max(40),
    structuredData: z.boolean(),
  }),
  Services: section('Services', {
    heading: text,
    mode,
    order,
    serviceIds: z.array(id).max(48),
    limit: z.number().int().min(1).max(48),
  }),
  Team: section('Team', {
    heading: text,
    mode,
    order,
    memberIds: z.array(id).max(100),
    limit: z.number().int().min(1).max(100),
  }),
  Contact: section('Contact', {
    heading: text,
    body: text,
    showDetails: z.boolean(),
    form: z.boolean(),
    submitLabel: short,
    successMessage: short,
  }),
  Steps: section('Steps', {
    heading: text,
    intro: text,
    items: z.array(z.object({ title: short, body: text }).strict()).max(12),
  }),
  Pricing: section('Pricing', {
    heading: text,
    intro: text,
    plans: z
      .array(
        z
          .object({
            name: short,
            price: short,
            period: short,
            description: text,
            features: text,
            link: linkRef,
            highlighted: z.boolean(),
          })
          .strict(),
      )
      .max(6),
    note: text,
  }),
  Posts: section('Posts', {
    heading: text,
    mode: z.enum(['latest', 'featured', 'category', 'manual']),
    order,
    categoryId: id.nullable(),
    postIds: z.array(id).max(24),
    limit: z.number().int().min(1).max(24),
  }),
  Form: section('Form', { heading: text, body: text, formId: id.nullable() }),
  Embed: section('Embed', {
    title: short,
    url: z.string().refine((v) => v === '' || embedAllowed(v), 'Use a supported embed link.'),
    aspect: z.enum(['16:9', '4:3', '1:1', 'tall']),
    caption: short,
  }),
  GlobalBlock: section('GlobalBlock', { blockId: id.nullable() }),
}
// Columns hold other sections (not further columns) in up to three slots.
const leafSection = z.discriminatedUnion(
  'type',
  Object.values(leafSchemas) as unknown as [
    (typeof leafSchemas)[keyof typeof leafSchemas],
    ...(typeof leafSchemas)[keyof typeof leafSchemas][],
  ],
)
const slot = z.array(leafSection).max(12)
export const sectionSchemas = {
  ...leafSchemas,
  Columns: section('Columns', {
    layout: z.enum(['1-1', '2-1', '1-2', '1-1-1']),
    align: z.enum(['start', 'center']),
    first: slot,
    second: slot,
    third: slot,
  }),
}
export type SectionType = keyof typeof sectionSchemas
export type SectionOf<T extends SectionType> = z.infer<(typeof sectionSchemas)[T]>
export type SectionProps<T extends SectionType> = Omit<SectionOf<T>['props'], 'id'>
export type AnySection = { [T in SectionType]: SectionOf<T> }[SectionType]

const emptyMedia = { image: null, alt: '', decorative: false }
const emptyLink = { label: '', href: '' }
// Editor metadata and starting values. Defaults are neutral and empty: they are never copy.
export const sectionMeta: {
  [T in SectionType]: {
    label: string
    category: 'Layout' | 'Text' | 'Media' | 'Records' | 'Proof' | 'Actions'
    description: string
    defaults: SectionProps<T>
  }
} = {
  Intro: {
    label: 'Introduction',
    category: 'Text',
    description: 'A heading and short paragraph.',
    defaults: { heading: '', body: '', style: 'plain' },
  },
  CallToAction: {
    label: 'Call to action',
    category: 'Actions',
    description: 'A prompt with one link.',
    defaults: { heading: '', body: '', label: '', href: '/' },
  },
  SelectedProjects: {
    label: 'Selected case studies',
    category: 'Records',
    description: 'Case study records, by latest, featured or chosen.',
    defaults: { heading: '', mode: 'latest', order: 'default', projectIds: [], limit: 3 },
  },
  Hero: {
    label: 'Hero',
    category: 'Text',
    description: 'Opening statement with optional image and actions.',
    defaults: {
      eyebrow: '',
      heading: '',
      body: '',
      media: emptyMedia,
      primary: emptyLink,
      secondary: emptyLink,
      layout: 'stacked',
    },
  },
  Text: {
    label: 'Text',
    category: 'Text',
    description: 'Formatted text: paragraphs, subheadings, lists and links.',
    defaults: { heading: '', body: '', width: 'narrow' },
  },
  TextMedia: {
    label: 'Text and image',
    category: 'Media',
    description: 'Text beside an image.',
    defaults: { heading: '', body: '', media: emptyMedia, link: emptyLink, mediaPosition: 'end' },
  },
  Media: {
    label: 'Image',
    category: 'Media',
    description: 'One image with an optional caption.',
    defaults: { media: emptyMedia, caption: '', size: 'content' },
  },
  Gallery: {
    label: 'Gallery',
    category: 'Media',
    description: 'A set of images.',
    defaults: { heading: '', items: [] },
  },
  Video: {
    label: 'Video',
    category: 'Media',
    description: 'A Vimeo or YouTube video with transcript.',
    defaults: {
      heading: '',
      provider: 'vimeo',
      videoId: '',
      title: '',
      description: '',
      transcript: '',
      uploadDate: '',
      poster: emptyMedia,
    },
  },
  Features: {
    label: 'Feature list',
    category: 'Text',
    description: 'Short items in columns, each with optional link and image.',
    defaults: { heading: '', intro: '', columns: '3', items: [] },
  },
  Stats: {
    label: 'Figures',
    category: 'Proof',
    description: 'Key figures. Link each to an approved fact.',
    defaults: { heading: '', items: [] },
  },
  Quotes: {
    label: 'Testimonials',
    category: 'Proof',
    description: 'Attributed quotes. Link each to an approved fact.',
    defaults: { heading: '', items: [] },
  },
  Logos: {
    label: 'Client logos',
    category: 'Proof',
    description: 'Logos from Client records.',
    defaults: { heading: '', mode: 'all', order: 'default', clientIds: [] },
  },
  FAQ: {
    label: 'Questions and answers',
    category: 'Text',
    description: 'Visible questions and answers; can publish FAQ structured data.',
    defaults: { heading: '', items: [], structuredData: true },
  },
  Services: {
    label: 'Services',
    category: 'Records',
    description: 'Service records, all or chosen.',
    defaults: { heading: '', mode: 'all', order: 'default', serviceIds: [], limit: 12 },
  },
  Team: {
    label: 'Team',
    category: 'Records',
    description: 'Team Member records, all or chosen.',
    defaults: { heading: '', mode: 'all', order: 'default', memberIds: [], limit: 24 },
  },
  Contact: {
    label: 'Contact',
    category: 'Actions',
    description: 'Contact details from Site Settings and an optional enquiry form.',
    defaults: {
      heading: '',
      body: '',
      showDetails: true,
      form: true,
      submitLabel: 'Send',
      successMessage: 'Thank you. We will reply soon.',
    },
  },
  Steps: {
    label: 'Steps',
    category: 'Text',
    description: 'A numbered process or sequence.',
    defaults: { heading: '', intro: '', items: [] },
  },
  Pricing: {
    label: 'Pricing',
    category: 'Actions',
    description: 'Plans or packages with features and an action each.',
    defaults: { heading: '', intro: '', plans: [], note: '' },
  },
  Posts: {
    label: 'Blog posts',
    category: 'Records',
    description: 'Latest, featured, by category or chosen blog posts.',
    defaults: {
      heading: '',
      mode: 'latest',
      order: 'default',
      categoryId: null,
      postIds: [],
      limit: 3,
    },
  },
  Form: {
    label: 'Form',
    category: 'Actions',
    description: 'A form built under Enquiries → Forms.',
    defaults: { heading: '', body: '', formId: null },
  },
  Embed: {
    label: 'Embed',
    category: 'Media',
    description: 'A map, booking calendar, form, audio or design from a supported service.',
    defaults: { title: '', url: '', aspect: '16:9', caption: '' },
  },
  GlobalBlock: {
    label: 'Reusable block',
    category: 'Layout',
    description: 'Sections from a reusable block, edited once for every page.',
    defaults: { blockId: null },
  },
  Columns: {
    label: 'Columns',
    category: 'Layout',
    description: 'Two or three columns, each holding its own sections.',
    defaults: { layout: '1-1', align: 'start', first: [], second: [], third: [] },
  },
}
export const sectionTypes = Object.keys(sectionSchemas) as SectionType[]

// Page-level composer options. `pageHeader: hidden` lets the first Hero supply the page's h1.
export const rootProps = z
  .object({ pageHeader: z.enum(['default', 'hidden']).optional() })
  .passthrough()
export const compositionSchema = z
  .object({
    root: z.object({ props: rootProps.optional() }).passthrough(),
    content: z
      .array(
        z.discriminatedUnion(
          'type',
          sectionTypes.map((type) => sectionSchemas[type]) as unknown as [
            (typeof sectionSchemas)[SectionType],
            ...(typeof sectionSchemas)[SectionType][],
          ],
        ),
      )
      .max(60),
    // Puck emits an empty zones object even when nested drop zones are disabled.
    zones: z.object({}).strict().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = allSections(data.content as AnySection[]).map((s) => s.props.id)
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'Section IDs must be unique.' })
  })
export type Composition = { root: { props?: z.infer<typeof rootProps> }; content: AnySection[] }
export const emptyComposition: Composition = { root: { props: {} }, content: [] }
// Reusable blocks cannot contain other reusable blocks (no loops).
export const blockCompositionSchema = compositionSchema.superRefine((data, ctx) => {
  if (allSections(data.content as AnySection[]).some((s) => s.type === 'GlobalBlock'))
    ctx.addIssue({ code: 'custom', message: 'A reusable block cannot contain another one.' })
})
export const columnSlots = ['first', 'second', 'third'] as const
// Every section including those nested in Columns, in reading order.
export function allSections(content: AnySection[]): AnySection[] {
  return content.flatMap((s) =>
    s.type === 'Columns'
      ? [s, ...columnSlots.flatMap((slot) => (s.props[slot] || []) as AnySection[])]
      : [s],
  )
}

// Media IDs referenced anywhere in a composition (heroes, galleries, posters, feature images).
export function compositionMedia(composition: Composition): number[] {
  const found = new Set<number>()
  const visit = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(visit)
    else if (value && typeof value === 'object') {
      const v = value as Record<string, unknown>
      if ('image' in v && 'decorative' in v && typeof v.image === 'number') found.add(v.image)
      Object.values(v).forEach(visit)
    }
  }
  composition.content.forEach((s) => visit(s.props))
  return [...found]
}
// A machine-readable description of every section, for AI tools composing pages.
export function sectionCatalog() {
  return sectionTypes.map((type) => ({
    type,
    ...sectionMeta[type],
    props: z.toJSONSchema(sectionSchemas[type].shape.props),
  }))
}
