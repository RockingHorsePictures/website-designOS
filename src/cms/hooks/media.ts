import type { CollectionBeforeChangeHook } from 'payload'
import { aiProvider } from '../../lib/ai/runtime'
import { reserveAICall } from '../../lib/ai/budget'

export const mediaDescription: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (data.decorative ?? originalDoc?.decorative) {
    data.alt = ''
    data.altSource = 'decorative'
    return data
  }
  if (data.alt && data.alt !== originalDoc?.alt && !req.context.aiSuggestion) {
    data.altSource = 'manual'
    return data
  }
  if (originalDoc?.altSource === 'manual' && !req.context.regenerateAlt) return data
  if (req.file && !data.alt && !req.context.skipAI) {
    data.altSource = 'needs-review'
    try {
      if (!(await reserveAICall(req.payload))) return data
      if (req.file.data.length > 8_000_000) return data
      // Uploads remain successful even when the provider is unavailable.
      const result = await aiProvider().suggestAltText({
        image: { base64: req.file.data.toString('base64'), mimeType: req.file.mimetype },
        context: data.context || data.caption || '',
        approvedFacts: [],
      })
      if (result.text) {
        data.alt = result.text
        data.altSource = 'ai-draft'
      }
    } catch {
      req.payload.logger.warn(
        'Automatic image description unavailable; manual description is available.',
      )
    }
  }
  return data
}
