export type Evidence = {
  id: number
  statement: string
  sourceNote: string
  sourceURL?: string
  verifiedAt?: string
}
export type Recommendation = {
  issue: string
  urls: string[]
  reason: string
  evidenceIDs: number[]
  suggestedAction: string
  objective: string
  confidence: 'low' | 'medium' | 'high'
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'accepted' | 'dismissed' | 'completed'
}
export type AltTextInput = {
  image: { base64: string; mimeType: string }
  context: string
  approvedFacts: Evidence[]
}
export type AltTextResult = { text: string; needsReview: boolean; reason?: string }
export interface AIProvider {
  suggestAltText(input: AltTextInput): Promise<AltTextResult>
  recommend(input: {
    title: string
    content: string
    strategy: string
    approvedFacts: Evidence[]
  }): Promise<Recommendation[]>
}
export interface SearchPerformanceProvider {
  fetchPages(range: {
    from: string
    to: string
  }): Promise<{ url: string; clicks: number; impressions: number; position: number }[]>
}
export interface CrawlProvider {
  inventory(url: string): Promise<{ url: string; title: string; status: number; links: string[] }[]>
}
export interface TopicResearchProvider {
  research(topics: string[]): Promise<{ topic: string; evidenceURL: string; note: string }[]>
}
export interface WebResearchProvider {
  search(query: string): Promise<{ title: string; url: string; excerpt: string }[]>
}
export interface PagePerformanceProvider {
  measure(url: string): Promise<{ url: string; lcpMs: number; cls: number; inpMs?: number }>
}

// Runtime AI suggestions are a replaceable integration; this interface cannot publish content.
export class DisabledAIProvider implements AIProvider {
  async suggestAltText(): Promise<AltTextResult> {
    return {
      text: '',
      needsReview: true,
      reason: 'Automatic descriptions are not configured. Add an image description manually.',
    }
  }
  async recommend(): Promise<Recommendation[]> {
    return []
  }
}
