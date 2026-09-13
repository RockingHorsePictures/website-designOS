import { z } from 'zod'
import { safeLink } from '../../lib/urls'

const text = z.string().max(10000)
const section = <T extends string, P extends z.ZodRawShape>(type: T, props: P) =>
  z
    .object({
      type: z.literal(type),
      props: z.object({ id: z.string().min(1), ...props }).strict(),
    })
    .strict()
export const sectionSchemas = {
  Intro: section('Intro', { heading: text, body: text, style: z.enum(['plain', 'surface']) }),
  CallToAction: section('CallToAction', {
    heading: text,
    body: text,
    label: text,
    href: z.string().refine(safeLink, 'Use a safe internal link or https URL.'),
  }),
  SelectedProjects: section('SelectedProjects', {
    heading: text,
    mode: z.enum(['latest', 'featured', 'manual']),
    projectIds: z.array(z.number().int().positive()).max(24),
    limit: z.number().int().min(1).max(24),
  }),
}
export const compositionSchema = z
  .object({
    root: z.object({ props: z.object({}).passthrough().optional() }).passthrough(),
    content: z
      .array(
        z.union([
          sectionSchemas.Intro,
          sectionSchemas.CallToAction,
          sectionSchemas.SelectedProjects,
        ]),
      )
      .max(40),
    // Puck emits an empty zones object even when nested drop zones are disabled.
    zones: z.object({}).strict().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ids = data.content.map((s) => s.props.id)
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: 'custom', message: 'Section IDs must be unique.' })
  })
export type Composition = z.infer<typeof compositionSchema>
export const emptyComposition: Composition = { root: { props: {} }, content: [] }
