import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  findLicitalabOpportunity,
  listLicitalabOpportunityDocuments,
  type LicitalabRequestOptions
} from '@/lib/commercial/tenders/licitalab/client'

/**
 * `pnpm licitalab search` — discovery de oportunidades públicas.
 *
 * El MCP de LicitaLAB no busca (sólo consulta por código). El listado vive en la web autenticada, que ya lee el radar
 * `scripts/licitalab-radar-playwright.mjs`. Este módulo NO duplica ese scraping: lo ejecuta como proceso hijo, lee su
 * reporte protegido en `.auth/` y, opcionalmente, hidrata cada código con el MCP (`--enrich`).
 *
 * `--match` filtra localmente sobre lo que el radar recolectó (título, comprador, región): no es una búsqueda en
 * LicitaLAB, así que un término ausente en las primeras `--max` filas no aparece aunque exista más abajo.
 * El score del listado es priorización de LicitaLAB, nunca un GO.
 */

const RADAR_SCRIPT = join(process.cwd(), 'scripts', 'licitalab-radar-playwright.mjs')
const REPORTS_DIR = join('.auth', 'licitalab-radar-reports')
const ENRICH_CONCURRENCY = 3

export interface RadarOpportunity {
  code: string
  title: string | null
  scorePct: number | null
  buyer: string | null
  buyerRegion: string | null
  amountText: string | null
  closeText: string | null
}

export interface EnrichedOpportunity extends RadarOpportunity {
  detail: {
    status: string | null
    type: string | null
    estimatedAmount: number | null
    currency: string | null
    closesAt: string | null
  } | null
  detailError: string | null
  documents: { total: number; searchable: number } | null
  documentsError: string | null
}

export interface SearchResult {
  view: 'recommended' | 'all'
  collected: number
  match: string | null
  reportPath: string
  opportunities: Array<RadarOpportunity | EnrichedOpportunity>
  enriched: boolean
}

export class LicitalabSearchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LicitalabSearchError'
  }
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Todos los términos deben aparecer (sin tildes ni mayúsculas) en título, comprador o región. */
export const filterRadarOpportunities = <T extends RadarOpportunity>(opportunities: T[], match: string | null): T[] => {
  const terms = normalize(match ?? '')
    .split(/\s+/)
    .filter(Boolean)

  if (!terms.length) return opportunities

  return opportunities.filter(opportunity => {
    const haystack = normalize([opportunity.title, opportunity.buyer, opportunity.buyerRegion, opportunity.code].filter(Boolean).join(' '))

    return terms.every(term => haystack.includes(term))
  })
}

const runRadar = (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    // stdout del radar va a stderr: así `--json` deja stdout limpio para pipes.
    const child = spawn(process.execPath, [RADAR_SCRIPT, ...args], { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'] })

    let lastError = ''

    child.stdout.on('data', chunk => process.stderr.write(chunk))
    child.stderr.on('data', chunk => {
      lastError = String(chunk).trim() || lastError
      process.stderr.write(chunk)
    })

    child.on('error', error => reject(new LicitalabSearchError(`No se pudo ejecutar el radar: ${error.message}`)))
    child.on('close', code => {
      if (code === 0) return resolve()

      const message = lastError.replace(/^\[LICITALAB_RADAR\]\s*/, '') || `El radar terminó con código ${code}.`
      const hint = /no-login/.test(message) ? ' Quita --no-login para que el radar inicie sesión con la credencial guardada.' : ''

      reject(new LicitalabSearchError(`${message}.${hint}`.replace('..', '.')))
    })
  })

const mapWithConcurrency = async <T, R>(items: T[], limit: number, run: (item: T) => Promise<R>) => {
  const results = new Array<R>(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++

      results[index] = await run(items[index])
    }
  })

  await Promise.all(workers)

  return results
}

const enrichOpportunity = async (
  opportunity: RadarOpportunity,
  options: LicitalabRequestOptions & { userAccessToken: string }
): Promise<EnrichedOpportunity> => {
  const { userAccessToken, ...keyOptions } = options

  const [detail, documents] = await Promise.all([
    findLicitalabOpportunity({ code: opportunity.code }, { ...keyOptions, userAccessToken }),
    listLicitalabOpportunityDocuments({ code: opportunity.code }, keyOptions)
  ])

  const detailPayload = detail.ok ? (detail.payload as Record<string, unknown>) : null
  const documentList = documents.ok ? (documents.payload as { documents?: Array<{ supported?: boolean }> }).documents : null
  const multiple = Boolean(detailPayload?.multiple_matches)

  return {
    ...opportunity,
    detail:
      detailPayload && !multiple
        ? {
            status: typeof detailPayload.status === 'string' ? detailPayload.status : null,
            type: typeof detailPayload.type === 'string' ? detailPayload.type : null,
            estimatedAmount: typeof detailPayload.estimated_amount === 'number' ? detailPayload.estimated_amount : null,
            currency: typeof detailPayload.currency === 'string' ? detailPayload.currency : null,
            closesAt: typeof detailPayload.closes_at === 'string' ? detailPayload.closes_at : null
          }
        : null,
    detailError: detail.ok ? (multiple ? 'Varias oportunidades con este código: consulta con opportunity --type/--buyer.' : null) : detail.errorDetail,
    documents: Array.isArray(documentList)
      ? { total: documentList.length, searchable: documentList.filter(doc => doc.supported).length }
      : null,
    documentsError: documents.ok ? null : documents.errorDetail
  }
}

export const searchLicitalabOpportunities = async (input: {
  view: 'recommended' | 'all'
  max: number
  match: string | null
  headed: boolean
  allowLogin: boolean
  enrichWith: (LicitalabRequestOptions & { userAccessToken: string }) | null
}): Promise<SearchResult> => {
  const reportPath = join(REPORTS_DIR, `licitalab-search-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)

  const args = ['--view', input.view, '--max-opportunities', String(input.max), '--output', reportPath]

  if (!input.headed) args.push('--headless')
  if (!input.allowLogin) args.push('--no-login')

  await runRadar(args)

  const report = JSON.parse(await readFile(join(process.cwd(), reportPath), 'utf8')) as { opportunities?: RadarOpportunity[] }
  const collected = Array.isArray(report.opportunities) ? report.opportunities : []

  const filtered = filterRadarOpportunities(
    collected.map(({ code, title, scorePct, buyer, buyerRegion, amountText, closeText }) => ({
      code,
      title,
      scorePct,
      buyer,
      buyerRegion,
      amountText,
      closeText
    })),
    input.match
  )

  const enrichWith = input.enrichWith

  const opportunities = enrichWith
    ? await mapWithConcurrency(filtered, ENRICH_CONCURRENCY, opportunity => enrichOpportunity(opportunity, enrichWith))
    : filtered

  return { view: input.view, collected: collected.length, match: input.match, reportPath, opportunities, enriched: Boolean(enrichWith) }
}
