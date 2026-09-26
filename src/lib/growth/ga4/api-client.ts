/**
 * Clientes REST de las Google Analytics 4 APIs (Admin v1beta + Data v1beta).
 *
 * `googleapis` NO es dep del repo → `fetch` + token de un `GoogleApiTokenProvider`
 * inyectable (mirror de `growth/gtm/api-client.ts`). Errores tipados (`Ga4ApiError`)
 * con status HTTP; el payload crudo de Google NUNCA se devuelve al cliente.
 *
 * Uso principal para la instrumentación: `Ga4DataClient.runRealtimeEventCounts` — cuenta
 * eventos en tiempo real por nombre, ideal para confirmar que un `gh_form_*` / `gh_cta_*`
 * está llegando a GA4 tras dispararlo en el sitio.
 */

import 'server-only'

import {
  GA4_ADMIN_API_BASE,
  GA4_DATA_API_BASE,
  type Ga4AccountSummary,
  type Ga4EventCountRow,
  type GoogleApiTokenProvider
} from './contracts'

export class Ga4ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'Ga4ApiError'
    this.status = status
  }
}

const request = async <T>(base: string, tokens: GoogleApiTokenProvider, path: string, init?: RequestInit): Promise<T> => {
  const token = await tokens.getAccessToken()
  const url = `${base}/${path.replace(/^\/+/, '')}`

  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers
    },
    cache: 'no-store'
  })

  if (!response.ok) {
    throw new Ga4ApiError(`GA4 ${init?.method ?? 'GET'} ${path} failed (${response.status})`, response.status)
  }

  return (await response.json()) as T
}

/** Admin API — descubrir cuentas y propiedades visibles para el token. */
export class Ga4AdminClient {
  constructor(private readonly tokens: GoogleApiTokenProvider) {}

  async listAccountSummaries(): Promise<Ga4AccountSummary[]> {
    type AccountRow = {
      account?: string
      displayName?: string
      propertySummaries?: Array<{ property?: string; displayName?: string; parent?: string }>
    }

    const accounts: AccountRow[] = []
    const seenTokens = new Set<string>()
    let pageToken: string | undefined

    do {
      const path = `accountSummaries?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
      const body = await request<{ accountSummaries?: AccountRow[]; nextPageToken?: string }>(GA4_ADMIN_API_BASE, this.tokens, path)

      accounts.push(...(body.accountSummaries ?? []))
      pageToken = body.nextPageToken?.trim() || undefined

      if (pageToken && seenTokens.has(pageToken)) throw new Error('GA4 account summaries pagination loop')
      if (pageToken) seenTokens.add(pageToken)
    } while (pageToken)

    return accounts
      .filter(
        (a): a is { account: string; displayName?: string; propertySummaries?: Array<{ property?: string; displayName?: string; parent?: string }> } =>
          typeof a.account === 'string'
      )
      .map(a => ({
        account: a.account,
        accountId: a.account.replace(/^accountSummaries\//, '').replace(/^accounts\//, ''),
        displayName: a.displayName ?? '',
        properties: (a.propertySummaries ?? [])
          .filter((p): p is { property: string; displayName?: string; parent?: string } => typeof p.property === 'string')
          .map(p => ({
            property: p.property,
            propertyId: p.property.replace(/^properties\//, ''),
            displayName: p.displayName ?? '',
            parent: p.parent ?? null
          }))
      }))
  }
}

/** Data API — reporting con token de usuario OAuth o service account autorizado en la propiedad. */
export class Ga4DataClient {
  constructor(private readonly tokens: GoogleApiTokenProvider) {}

  /** Informe histórico agregado. El caller controla dimensiones y filtros gobernados. */
  async runReport(propertyId: string, body: {
    dateRanges: Array<{ startDate: string; endDate: string }>
    dimensions: Array<{ name: string }>
    metrics: Array<{ name: string }>
    dimensionFilter?: Record<string, unknown>
    limit?: string
    offset?: string
  }): Promise<{
    dimensionHeaders?: Array<{ name: string }>
    metricHeaders?: Array<{ name: string }>
    rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>
    rowCount?: number
  }> {
    return request(GA4_DATA_API_BASE, this.tokens, `properties/${propertyId}:runReport`, {
      method: 'POST',
      body: JSON.stringify(body)
    })
  }

  /**
   * Conteo de eventos EN TIEMPO REAL por nombre (últimos ~30 min). El uso canónico para
   * verificar que un evento recién disparado en el sitio está llegando a GA4.
   */
  async runRealtimeEventCounts(propertyId: string): Promise<Ga4EventCountRow[]> {
    const body = await request<{
      rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>
    }>(GA4_DATA_API_BASE, this.tokens, `properties/${propertyId}:runRealtimeReport`, {
      method: 'POST',
      body: JSON.stringify({
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }]
      })
    })

    return (body.rows ?? []).map(row => ({
      eventName: row.dimensionValues?.[0]?.value ?? '',
      eventCount: Number(row.metricValues?.[0]?.value ?? 0)
    }))
  }
}
