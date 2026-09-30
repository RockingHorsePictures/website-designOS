import type { Composition } from '../editor/registry/schema'

// A neutral starting homepage for new sites: structure only, with prompts to replace. Owners and
// AI builds are expected to redesign it; nothing here is company copy.
export function starterComposition(company = ''): Composition {
  return {
    root: { props: { pageHeader: 'hidden' } },
    content: [
      {
        type: 'Hero',
        props: {
          id: 'starter-hero',
          eyebrow: '',
          heading: company || 'Your website starts here',
          body: 'Replace this introduction with what you do and who it is for.',
          media: { image: null, alt: '', decorative: false },
          primary: { label: 'Get in touch', href: '/#contact' },
          secondary: { label: '', href: '' },
          layout: 'stacked',
        },
      },
      {
        type: 'Contact',
        props: {
          id: 'starter-contact',
          heading: 'Contact',
          body: '',
          showDetails: true,
          form: true,
          submitLabel: 'Send',
          successMessage: 'Thank you. We will reply soon.',
        },
      },
    ],
  }
}
