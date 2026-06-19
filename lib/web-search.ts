const TAVILY_URL = 'https://api.tavily.com/search'

export type SearchResult = {
  title: string
  url: string
  content: string
  score: number
}

export type WebSearchResponse = {
  answer?: string
  results: SearchResult[]
}

export async function searchWeb(query: string): Promise<WebSearchResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return null

  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 5,
      }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export function formatSearchContext(response: WebSearchResponse): string {
  const parts: string[] = ['--- WEB SEARCH RESULTS ---']
  if (response.answer) {
    parts.push(`Summary: ${response.answer}`)
  }
  parts.push('')
  for (const r of response.results) {
    parts.push(`- ${r.title}`)
    parts.push(`  URL: ${r.url}`)
    parts.push(`  ${r.content.slice(0, 500)}`)
    parts.push('')
  }
  parts.push('Use the above information to answer the user\'s question. Cite sources by mentioning the URL when referencing specific facts.')
  return parts.join('\n')
}

export const WEB_SEARCH_TOOL = {
  type: 'function' as const,
  function: {
    name: 'web_search',
    description: 'Search the web for current, up-to-date information. Use this when the user asks about recent events, specific facts, statistics, or any topic where accurate and timely information would improve the response.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query. Be specific and include relevant context.',
        },
      },
      required: ['query'],
    },
  },
}
