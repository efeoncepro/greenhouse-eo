/**
 * Read-only helper: resolves SKY's GSC operator token (same connection as the canonical reader) and runs
 * paginated searchAnalytics.query against ANY property that token can read (blog or www). No writes anywhere.
 */
import { loadGreenhouseToolEnv } from '../../../../scripts/lib/load-greenhouse-tool-env'

export const ORG = 'org-b9977f96-f7ef-4afb-bb26-7355d78c981f'
export const BLOG = { siteUrl: 'https://blog.skyairline.com/', pageRegex: '^https?://blog\\.skyairline\\.com(/|$)' }
export const WWW = { siteUrl: 'https://www.skyairline.com/', pageRegex: '^https?://www\\.skyairline\\.com/blog(/|$)' }
/** Canonical SKY brand rule (scripts/seo/organic-traffic-value.ts default), RE2 form for GSC filters. */
export const BRAND_RE2 = '(?i)\\bsky\\b|skyairlines?'
export const BRAND_JS = /\bsky\b|skyairlines?/i

export type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

let token: { value: string; at: number } | null = null
let getToken: (() => Promise<string>) | null = null

export const init = async () => {
  loadGreenhouseToolEnv()
  const { getSearchConsoleConnection } = await import('../../../../src/lib/growth/search-console/connection-store')

  const { resolveSearchConsoleOAuthConfig, refreshAccessToken } = await import(
    '../../../../src/lib/growth/search-console/oauth-client'
  )

  const { resolveSecretByRef } = await import('../../../../src/lib/secrets/secret-manager')
  const c = await getSearchConsoleConnection(ORG)

  if (!c || c.status !== 'active' || !c.tokenSecretRef) throw new Error('gsc_not_connected')
  const cfg = await resolveSearchConsoleOAuthConfig()

  if (!cfg) throw new Error('gsc_oauth_config_missing')
  const refresh = await resolveSecretByRef(c.tokenSecretRef)

  if (!refresh) throw new Error('gsc_token_missing')

  getToken = async () => {
    if (!token || Date.now() - token.at > 40 * 60 * 1000) token = { value: await refreshAccessToken(cfg, refresh), at: Date.now() }
    
return token.value
  }
}

export const query = async (
  siteUrl: string,
  body: Record<string, unknown>,
  maxPages = 40
): Promise<Row[]> => {
  const all: Row[] = []

  for (let p = 0; p < maxPages; p++) {
    let res: Response | null = null

    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(
        `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${await getToken!()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, rowLimit: 25000, ...(p ? { startRow: p * 25000 } : {}) })
        }
      )
      if (res.status !== 429 && res.status < 500) break
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
    }

    if (!res!.ok) throw new Error(`gsc_query_failed_${res!.status}: ${(await res!.text()).slice(0, 300)}`)
    const json = (await res!.json()) as { rows?: Row[] }
    const rows = (json.rows ?? []).map(r => ({ ...r, keys: r.keys ?? [] }))

    all.push(...rows)
    if (rows.length < 25000) return all
  }

  throw new Error('pagination_limit_reached')
}

export const pageFilter = (regex: string, extra: Record<string, unknown>[] = []) => [
  { groupType: 'and', filters: [{ dimension: 'page', operator: 'includingRegex', expression: regex }, ...extra] }
]

export const csv = (rows: (string | number | null)[][]) =>
  rows
    .map(r => r.map(v => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(','))
    .join('\n') + '\n'
