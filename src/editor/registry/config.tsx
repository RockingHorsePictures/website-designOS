import type { ComponentConfig, Config, Field, Fields } from '@puckeditor/core'
import type { Theme } from '../../payload-types'
import { tokenStyle } from '../../design-system/tokens'
import { typographyStyle } from '../../design-system/typography'
import { CustomFonts } from '../../design-system/CustomFonts'
import {
  sectionRenderers,
  type SectionContext,
  type SectionData,
  type MediaSummary,
  type ProjectSummary,
  type ServiceSummary,
  type PersonSummary,
  type ClientSummary,
  type ContactDetails,
} from '../../components/sections'
import { sectionMeta, sectionTypes, type SectionProps, type SectionType } from './schema'

// Records the composer can reference. Loaded by the authenticated editor page.
export type EditorData = {
  projects: ProjectSummary[]
  services: ServiceSummary[]
  team: PersonSummary[]
  clients: ClientSummary[]
  media: MediaSummary[]
  facts: { id: number; statement: string }[]
  contact: ContactDetails
}

const options = <T extends string>(pairs: [T, string][]) =>
  pairs.map(([value, label]) => ({ value, label }))
const heading: Field = { type: 'text', label: 'Heading' }
const body = (label = 'Text'): Field => ({
  type: 'textarea',
  label: `${label} (blank line = new paragraph; **bold**, [link](/path), "- " list)`,
})
const link = (label: string): Field => ({
  type: 'object',
  label,
  objectFields: {
    label: { type: 'text', label: 'Label (describe the destination)' },
    href: { type: 'text', label: 'Destination (/page, https://…, mailto:)' },
  },
})
function idPicker(label: string, items: { id: number; label: string }[]): Field<number[]> {
  return {
    type: 'custom',
    label,
    render: ({ value, onChange }) => (
      <fieldset>
        <legend>{label}</legend>
        {!items.length && <p>No records yet. Create them in the CMS first.</p>}
        {items.map((item) => (
          <label key={item.id} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={(value || []).includes(item.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...(value || []), item.id]
                    : (value || []).filter((id) => id !== item.id),
                )
              }
            />
            {item.label}
          </label>
        ))}
      </fieldset>
    ),
  }
}
function selectRecord(label: string, items: { id: number; label: string }[], empty: string): Field {
  return {
    type: 'custom',
    label,
    render: ({
      value,
      onChange,
      id,
    }: {
      value: number | null
      onChange: (v: number | null) => void
      id: string
    }) => (
      <label style={{ display: 'block' }}>
        {label}
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          style={{ display: 'block', width: '100%' }}
        >
          <option value="">{empty}</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    ),
  }
}
function mediaField(label: string, media: MediaSummary[]): Field {
  return {
    type: 'object',
    label,
    objectFields: {
      image: selectRecord(
        'Image from the media library',
        media.map((m) => ({ id: m.id, label: m.alt || m.caption || `Image ${m.id}` })),
        'No image',
      ),
      alt: { type: 'text', label: 'Description for this use (optional)' },
      decorative: {
        type: 'radio',
        label: 'Decorative here?',
        options: [
          { label: 'No', value: false },
          { label: 'Yes (empty alt)', value: true },
        ],
      },
    },
  }
}

type Props = { [T in SectionType]: SectionProps<T> }
export function sectionFields(data: EditorData): { [T in SectionType]: Fields<Props[T]> } {
  const facts = selectRecord(
    'Supporting approved fact',
    data.facts.map((f) => ({ id: f.id, label: f.statement.slice(0, 80) })),
    'None: needs evidence',
  )
  const media = (label = 'Image') => mediaField(label, data.media)
  return {
    Intro: {
      heading,
      body: { type: 'textarea', label: 'Text' },
      style: {
        type: 'select',
        options: options([
          ['plain', 'Plain'],
          ['surface', 'Surface'],
        ]),
      },
    },
    CallToAction: {
      heading,
      body: { type: 'textarea', label: 'Text' },
      label: { type: 'text', label: 'Link label' },
      href: { type: 'text', label: 'Link destination' },
    },
    SelectedProjects: {
      heading,
      mode: {
        type: 'select',
        options: options([
          ['latest', 'Latest'],
          ['featured', 'Featured'],
          ['manual', 'Choose projects'],
        ]),
      },
      projectIds: idPicker(
        'Case studies',
        data.projects.map((p) => ({ id: p.id, label: p.title })),
      ),
      limit: { type: 'number', min: 1, max: 24 },
    },
    Hero: {
      eyebrow: { type: 'text', label: 'Small line above the heading' },
      heading,
      body: body(),
      media: media(),
      primary: link('Main action'),
      secondary: link('Second action'),
      layout: {
        type: 'select',
        options: options([
          ['stacked', 'Stacked'],
          ['split', 'Side by side'],
          ['background', 'Image behind text'],
        ]),
      },
    },
    Text: {
      heading,
      body: body(),
      width: {
        type: 'select',
        options: options([
          ['narrow', 'Reading width'],
          ['wide', 'Wide'],
        ]),
      },
    },
    TextMedia: {
      heading,
      body: body(),
      media: media(),
      link: link('Link'),
      mediaPosition: {
        type: 'select',
        options: options([
          ['end', 'Image after text'],
          ['start', 'Image before text'],
        ]),
      },
    },
    Media: {
      media: media(),
      caption: { type: 'text', label: 'Caption' },
      size: {
        type: 'select',
        options: options([
          ['content', 'Text width'],
          ['wide', 'Wide'],
          ['full', 'Full width'],
        ]),
      },
    },
    Gallery: {
      heading,
      items: {
        type: 'array',
        label: 'Images',
        max: 48,
        arrayFields: { media: media(), caption: { type: 'text', label: 'Caption' } },
        defaultItemProps: { media: { image: null, alt: '', decorative: false }, caption: '' },
        getItemSummary: (item, i) => item.caption || `Image ${(i ?? 0) + 1}`,
      },
    },
    Video: {
      heading,
      provider: {
        type: 'select',
        options: options([
          ['vimeo', 'Vimeo'],
          ['youtube', 'YouTube'],
        ]),
      },
      videoId: { type: 'text', label: 'Video ID (numbers/letters from the video URL)' },
      title: { type: 'text', label: 'Video title' },
      description: body('Description'),
      transcript: { type: 'textarea', label: 'Transcript / accessible alternative' },
      uploadDate: { type: 'text', label: 'Upload date (YYYY-MM-DD)' },
      poster: media('Poster image'),
    },
    Features: {
      heading,
      intro: body('Introduction'),
      columns: {
        type: 'select',
        options: options([
          ['2', 'Two'],
          ['3', 'Three'],
          ['4', 'Four'],
        ]),
      },
      items: {
        type: 'array',
        label: 'Items',
        max: 24,
        arrayFields: {
          title: { type: 'text', label: 'Title' },
          body: body(),
          link: link('Link'),
          media: media(),
        },
        defaultItemProps: {
          title: '',
          body: '',
          link: { label: '', href: '' },
          media: { image: null, alt: '', decorative: false },
        },
        getItemSummary: (item, i) => item.title || `Item ${(i ?? 0) + 1}`,
      },
    },
    Stats: {
      heading,
      items: {
        type: 'array',
        label: 'Figures',
        max: 12,
        arrayFields: {
          value: { type: 'text', label: 'Figure' },
          label: { type: 'text', label: 'What it measures' },
          factId: facts,
        },
        defaultItemProps: { value: '', label: '', factId: null },
        getItemSummary: (item, i) => item.value || `Figure ${(i ?? 0) + 1}`,
      },
    },
    Quotes: {
      heading,
      items: {
        type: 'array',
        label: 'Quotes',
        max: 12,
        arrayFields: {
          quote: { type: 'textarea', label: 'Quote (exact words, with permission)' },
          name: { type: 'text', label: 'Name' },
          role: { type: 'text', label: 'Role' },
          organisation: { type: 'text', label: 'Organisation' },
          factId: facts,
        },
        defaultItemProps: { quote: '', name: '', role: '', organisation: '', factId: null },
        getItemSummary: (item, i) => item.name || `Quote ${(i ?? 0) + 1}`,
      },
    },
    Logos: {
      heading,
      mode: {
        type: 'select',
        options: options([
          ['all', 'All clients'],
          ['manual', 'Choose clients'],
        ]),
      },
      clientIds: idPicker(
        'Clients',
        data.clients.map((c) => ({ id: c.id, label: c.name })),
      ),
    },
    FAQ: {
      heading,
      items: {
        type: 'array',
        label: 'Questions',
        max: 40,
        arrayFields: {
          question: { type: 'text', label: 'Question' },
          answer: body('Answer'),
        },
        defaultItemProps: { question: '', answer: '' },
        getItemSummary: (item, i) => item.question || `Question ${(i ?? 0) + 1}`,
      },
      structuredData: {
        type: 'radio',
        label: 'Publish as FAQ structured data',
        options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ],
      },
    },
    Services: {
      heading,
      mode: {
        type: 'select',
        options: options([
          ['all', 'All services'],
          ['manual', 'Choose services'],
        ]),
      },
      serviceIds: idPicker(
        'Services',
        data.services.map((s) => ({ id: s.id, label: s.title })),
      ),
      limit: { type: 'number', min: 1, max: 48 },
    },
    Team: {
      heading,
      mode: {
        type: 'select',
        options: options([
          ['all', 'Everyone active'],
          ['manual', 'Choose people'],
        ]),
      },
      memberIds: idPicker(
        'People',
        data.team.map((p) => ({ id: p.id, label: `${p.name} (${p.role})` })),
      ),
      limit: { type: 'number', min: 1, max: 100 },
    },
    Contact: {
      heading,
      body: body(),
      showDetails: {
        type: 'radio',
        label: 'Show email, phone and address from Site Settings',
        options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ],
      },
      form: {
        type: 'radio',
        label: 'Include an enquiry form',
        options: [
          { label: 'Yes', value: true },
          { label: 'No', value: false },
        ],
      },
      submitLabel: { type: 'text', label: 'Button label' },
      successMessage: { type: 'text', label: 'Message after sending' },
    },
  } as { [T in SectionType]: Fields<Props[T]> }
}

export function editorSectionData(data: EditorData): SectionData {
  return {
    media: Object.fromEntries(data.media.map((m) => [m.id, m])),
    projects: data.projects,
    services: data.services,
    team: data.team,
    clients: data.clients,
    contact: data.contact,
  }
}

export function createPuckConfig(data: EditorData, theme: Theme): Config<Props> {
  const fields = sectionFields(data)
  const ctx: SectionContext = { data: editorSectionData(data), headingLevel: 2, editing: true }
  const components = Object.fromEntries(
    sectionTypes.map((type) => {
      const render = sectionRenderers[type] as (args: {
        props: unknown
        ctx: SectionContext
      }) => React.ReactNode
      const component: ComponentConfig<Props[typeof type]> = {
        label: sectionMeta[type].label,
        fields: fields[type] as Fields<Props[typeof type]>,
        defaultProps: sectionMeta[type].defaults as Props[typeof type],
        render: (props: Record<string, unknown>) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, puck, editMode, ...rest } = props
          return <>{render({ props: rest, ctx })}</>
        },
      }
      return [type, component]
    }),
  ) as Config<Props>['components']
  const categories: Record<string, { title: string; components: SectionType[] }> = {}
  for (const type of sectionTypes) {
    const category = sectionMeta[type].category
    ;(categories[category] ||= { title: category, components: [] }).components.push(type)
  }
  const root = {
    fields: {
      pageHeader: {
        type: 'radio',
        label: 'Page header',
        options: [
          { label: 'Show page title and summary', value: 'default' },
          { label: 'Hide (first Hero provides the main heading)', value: 'hidden' },
        ],
      },
    },
    defaultProps: { pageHeader: 'default' },
    render: ({ children }: { children?: React.ReactNode }) => (
      <div className="site-typography" style={{ ...tokenStyle(theme), ...typographyStyle(theme) }}>
        <CustomFonts theme={theme} />
        {children}
      </div>
    ),
  } as unknown as Config<Props>['root']
  return { root, categories, components }
}
