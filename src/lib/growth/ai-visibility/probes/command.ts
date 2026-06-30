import 'server-only'

/**
 * TASK-1266 — Growth AI Visibility · Probe gatherer command (Slice 1, server-only).
 *
 * `gatherRunProbes` es el primitive canónico (Full API parity) del probe gatherer: dado un
 * run, resuelve el dominio del sujeto, decide los ejes habilitados por flag, ejecuta los
 * probes read-only y persiste `grader_probe_results`. Idempotente (upsert por run+kind).
 * Lo invoca el run-engine como post-step best-effort (gated, nunca tumba el run) y podrán
 * reusarlo readiness scorer / re-score / Nexa-MCP. NUNCA expone ruta pública directa.
 *
 * El `HeadlessRenderer` se inyecta (default null): los probes headless (CWV, WebMCP runtime)
 * degradan a `skipped/no_headless` hasta que se cablee Chromium en el worker (follow-up).
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { resolveSecret } from '@/lib/secrets/secret-manager'

import { isAgenticReadinessEnabled, isEntityProbesEnabled, isProbesEnabled } from '../flags'
import { getGraderProfile, getGraderRun } from '../store'
import { type EntityProbeContext, type HeadlessRenderer, type ProbeResult } from './contracts'
import { createEntityApiFetcher } from './entity-fetch'
import { runProbes } from './gatherer'
import { createProbeRegistry } from './registry'
import { createProbeFetcher, resolveSubjectSite } from './safe-fetch'
import { getProbeResults, upsertProbeResults } from './store'

export interface GatherRunProbesResult {
  results: ProbeResult[]
  /** Razón cuando no se ejecutó nada (flag off, sin website, etc.). null si corrió. */
  skippedReason: string | null
}

export interface GatherRunProbesOptions {
  /** Renderer headless inyectado (worker con Chromium). Default null → probes headless skip. */
  headless?: HeadlessRenderer | null
  /** fetch inyectable para tests. Default global fetch (vía createProbeFetcher). */
  fetchImpl?: typeof fetch
  /** Override de env para resolver flags en tests. Default process.env. */
  env?: NodeJS.ProcessEnv
}

/** Env var canónica de la API key del Google Knowledge Graph (resuelve `..._SECRET_REF`). */
const KNOWLEDGE_GRAPH_API_KEY_ENV = 'GOOGLE_KNOWLEDGE_GRAPH_API_KEY'

interface BuildEntityContextInput {
  brandName: string
  domain: string
  market: string
  locale: string
  fetchImpl?: typeof fetch
  env: NodeJS.ProcessEnv
}

/**
 * Arma el sub-contexto de entidad (TASK-1267): identidad de marca + fetcher externo
 * host-allowlisted + API key del Knowledge Graph resuelta server-side. La key se resuelve
 * best-effort: si no está configurada → null (el KG probe degrada honesto `not_configured`);
 * Wikidata/Reddit no requieren auth. Nunca lanza por la resolución del secret.
 */
const buildEntityContext = async (input: BuildEntityContextInput): Promise<EntityProbeContext> => {
  let knowledgeGraphApiKey: string | null = null

  try {
    const resolution = await resolveSecret({ envVarName: KNOWLEDGE_GRAPH_API_KEY_ENV, env: input.env })

    knowledgeGraphApiKey = resolution.value
  } catch (error) {
    captureWithDomain(error, 'growth', {
      level: 'info',
      tags: { source: 'growth_ai_visibility_probe_command', reason: 'kg_key_resolve_failed' }
    })
  }

  return {
    brandName: input.brandName,
    domain: input.domain,
    market: input.market,
    locale: input.locale,
    fetch: createEntityApiFetcher({ fetchImpl: input.fetchImpl }),
    knowledgeGraphApiKey
  }
}

/**
 * Corre los probes de un run y persiste sus results. Best-effort: ante cualquier
 * problema NO lanza (devuelve skippedReason + captura a observabilidad), porque la
 * readiness NUNCA debe degradar el run de percepción.
 */
export const gatherRunProbes = async (
  runId: string,
  options: GatherRunProbesOptions = {}
): Promise<GatherRunProbesResult> => {
  const env = options.env ?? process.env

  if (!isProbesEnabled(env)) {
    return { results: [], skippedReason: 'probes_disabled' }
  }

  try {
    const run = await getGraderRun(runId)

    if (!run) return { results: [], skippedReason: 'run_not_found' }

    const profile = await getGraderProfile(run.profileId)

    if (!profile) return { results: [], skippedReason: 'profile_not_found' }

    const site = resolveSubjectSite(profile.websiteUrl)

    if (!site) return { results: [], skippedReason: 'no_public_website' }

    const entityEnabled = isEntityProbesEnabled(env)

    const probes = createProbeRegistry({
      structural: true,
      agentic: isAgenticReadinessEnabled(env),
      entity: entityEnabled
    })

    if (probes.length === 0) return { results: [], skippedReason: 'no_probes_registered' }

    const fetcher = createProbeFetcher(site.baseUrl, { fetchImpl: options.fetchImpl })

    const entity = entityEnabled
      ? await buildEntityContext({
          brandName: profile.brandName,
          domain: site.domain,
          market: profile.market,
          locale: profile.locale,
          fetchImpl: options.fetchImpl,
          env
        })
      : null

    const results = await runProbes({
      runId,
      probes,
      ctx: {
        domain: site.domain,
        baseUrl: site.baseUrl,
        fetcher,
        headless: options.headless ?? null,
        entity
      }
    })

    await upsertProbeResults(results)

    return { results, skippedReason: null }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      level: 'error',
      tags: { source: 'growth_ai_visibility_probe_command', reason: 'gather_failed' },
      extra: { runId }
    })

    return { results: [], skippedReason: 'gather_failed' }
  }
}

/** Lectura de los probe results persistidos de un run (reader del primitive de parity). */
export const readRunProbes = async (runId: string): Promise<ProbeResult[]> => getProbeResults(runId)
