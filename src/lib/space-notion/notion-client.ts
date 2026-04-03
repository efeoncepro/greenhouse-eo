import 'server-only'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

const notionHeaders = () => {
  const token = process.env.NOTION_TOKEN?.trim()

  if (!token) {
    throw new Error('NOTION_TOKEN not configured')
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION
  }
}

const buildUrl = (path: string, searchParams?: URLSearchParams) => {
  const url = new URL(`${NOTION_API}${path}`)

  if (searchParams) {
    url.search = searchParams.toString()
  }

  return url.toString()
}

export async function notionRequest<T>(
  path: string,
  init?: RequestInit & { searchParams?: URLSearchParams }
): Promise<T> {
  const response = await fetch(buildUrl(path, init?.searchParams), {
    ...init,
    headers: {
      ...notionHeaders(),
      ...(init?.headers ?? {})
    },
    signal: AbortSignal.timeout(30_000)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')

    throw new Error(`Notion API ${response.status}: ${text}`)
  }

  if (response.status === 204) {
    return null as T
  }

  return response.json() as Promise<T>
}
