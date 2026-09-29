// User agents grouped by purpose. Review periodically: vendors add and rename crawlers.
// Answer engines fetch pages to answer a person's question and usually cite/link the source.
export const answerEngineAgents = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'DuckAssistBot',
  'MistralAI-User',
]
// Training crawlers collect content for model training; they do not send visitors.
export const trainingAgents = [
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'meta-externalagent',
  'Bytespider',
  'cohere-training-data-crawler',
  'AI2Bot',
]
export const privatePaths = ['/admin', '/api', '/editor', '/preview', '/workspace-preview']
