import type { Config } from '@puckeditor/core'
import {
  Intro,
  CallToAction,
  SelectedProjects,
  type ProjectSummary,
} from '../../components/sections'

type Props = {
  Intro: { heading: string; body: string; style: 'plain' | 'surface' }
  CallToAction: { heading: string; body: string; label: string; href: string }
  SelectedProjects: {
    heading: string
    mode: 'latest' | 'featured' | 'manual'
    projectIds: number[]
    limit: number
  }
}
export function createPuckConfig(projects: ProjectSummary[]): Config<Props> {
  return {
    root: { fields: {}, render: ({ children }) => <>{children}</> },
    components: {
      Intro: {
        label: 'Introduction',
        fields: {
          heading: { type: 'text' },
          body: { type: 'textarea' },
          style: {
            type: 'select',
            options: [
              { label: 'Plain', value: 'plain' },
              { label: 'Surface', value: 'surface' },
            ],
          },
        },
        defaultProps: { heading: '', body: '', style: 'plain' },
        render: Intro,
      },
      CallToAction: {
        label: 'Call to action',
        fields: {
          heading: { type: 'text' },
          body: { type: 'textarea' },
          label: { type: 'text', label: 'Link label' },
          href: { type: 'text', label: 'Link destination' },
        },
        defaultProps: { heading: '', body: '', label: '', href: '/' },
        render: CallToAction,
      },
      SelectedProjects: {
        label: 'Selected case studies',
        fields: {
          heading: { type: 'text' },
          mode: {
            type: 'select',
            options: [
              { label: 'Latest', value: 'latest' },
              { label: 'Featured', value: 'featured' },
              { label: 'Choose projects', value: 'manual' },
            ],
          },
          projectIds: {
            type: 'custom',
            label: 'Case studies',
            render: ({ value, onChange }) => (
              <fieldset>
                <legend>Select case studies</legend>
                {projects.map((p) => (
                  <label key={p.id} style={{ display: 'block' }}>
                    <input
                      type="checkbox"
                      checked={(value || []).includes(p.id)}
                      onChange={(e) =>
                        onChange(
                          e.target.checked
                            ? [...value, p.id]
                            : value.filter((id: number) => id !== p.id),
                        )
                      }
                    />
                    {p.title}
                  </label>
                ))}
              </fieldset>
            ),
          },
          limit: { type: 'number', min: 1, max: 24 },
        },
        defaultProps: { heading: '', mode: 'latest', projectIds: [], limit: 3 },
        render: ({ heading, mode, projectIds, limit }) => (
          <SelectedProjects
            heading={heading}
            projects={(mode === 'manual'
              ? projectIds
                  .map((id) => projects.find((p) => p.id === id))
                  .filter((p): p is ProjectSummary => Boolean(p))
              : projects.filter((p) => mode !== 'featured' || p.featured)
            ).slice(0, limit)}
          />
        ),
      },
    },
  }
}
