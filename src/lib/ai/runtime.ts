import type { AIProvider, AltTextInput, AltTextResult, Recommendation } from './providers'
import { DisabledAIProvider } from './providers'

// Provider endpoint contract is documented in ARCHITECTURE.md; no vendor-specific SDK is required.
class HTTPAIProvider implements AIProvider {
  private async call(operation: string, input: unknown) {
    const base = process.env.AI_BASE_URL
    if (!base?.startsWith('https://')) throw new Error('AI provider must use HTTPS.')
    const response = await fetch(`${base.replace(/\/$/, '')}/${operation}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        model: process.env.AI_MODEL,
        input,
        rules:
          'Only approved facts may support factual claims. Never infer identities, locations, demographics, awards, outcomes or capabilities. Describe image purpose concisely. Suggestions require human review. Never publish.',
      }),
    })
    if (!response.ok) throw new Error(`AI provider error ${response.status}`)
    return response.json()
  }
  async suggestAltText(input: AltTextInput): Promise<AltTextResult> {
    const result = await this.call('alt-text', input)
    if (typeof result.text !== 'string' || result.text.length > 500)
      throw new Error('Invalid image description response.')
    return {
      text: result.text,
      needsReview: true,
      reason:
        typeof result.reason === 'string'
          ? result.reason
          : 'Review this AI suggestion before using it.',
    }
  }
  async recommend(): Promise<Recommendation[]> {
    return []
  } // Full Search Intelligence is outside this foundation phase.
}
export function aiProvider(): AIProvider {
  return process.env.AI_ENABLED === 'true' && process.env.AI_API_KEY && process.env.AI_BASE_URL
    ? new HTTPAIProvider()
    : new DisabledAIProvider()
}
