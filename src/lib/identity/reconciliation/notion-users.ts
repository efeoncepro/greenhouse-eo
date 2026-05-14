import 'server-only'

import type { DiscoveredIdentity } from './types'

interface NotionUsersResponse {
  object: 'list'
  results: Array<{
    object: 'user'
    id: string
    type?: string
    name?: string | null
    person?: {
      email?: string | null
    }
    bot?: unknown
  }>
  has_more: boolean
  next_cursor: string | null
}

export class NotionUsersDiscoveryUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotionUsersDiscoveryUnavailableError'
  }
}

const NOTION_API_VERSION = '2022-06-28'
const MAX_NOTION_USERS = 500

export const listNotionWorkspaceUsers = async (): Promise<DiscoveredIdentity[]> => {
  const token = process.env.NOTION_TOKEN

  if (!token) {
    throw new NotionUsersDiscoveryUnavailableError('NOTION_TOKEN is not configured')
  }

  const users: DiscoveredIdentity[] = []
  let startCursor: string | null = null

  do {
    const url = new URL('https://api.notion.com/v1/users')

    url.searchParams.set('page_size', '100')
    if (startCursor) url.searchParams.set('start_cursor', startCursor)

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_API_VERSION
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new NotionUsersDiscoveryUnavailableError(`Notion users.list failed with HTTP ${response.status}`)
    }

    const payload = (await response.json()) as NotionUsersResponse

    for (const user of payload.results) {
      if (user.object !== 'user' || user.type === 'bot') continue

      users.push({
        sourceSystem: 'notion',
        sourceObjectType: 'user',
        sourceObjectId: user.id,
        sourceDisplayName: user.name ?? null,
        sourceEmail: user.person?.email ?? null,
        discoveredIn: 'notion.users.list',
        occurrenceCount: 1
      })
    }

    startCursor = payload.has_more ? payload.next_cursor : null
  } while (startCursor && users.length < MAX_NOTION_USERS)

  return users
}
