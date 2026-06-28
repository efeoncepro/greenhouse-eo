/**
 * TASK-1267 — Growth AI Visibility · Entity probes barrel.
 *
 * Probes del eje `entity` (backbone de entidad de la marca EN EL MUNDO). A diferencia de
 * structural/agentic (que prueban el sitio del sujeto vía `ctx.fetcher` SSRF-guarded), estos
 * consultan APIs PÚBLICAS de terceros vía `ctx.entity.fetch` (host-allowlisted) y degradan
 * a `skipped/no_entity_context` si el sub-contexto de entidad no fue inyectado.
 */

import { type Probe } from '../contracts'
import { knowledgeGraphProbe } from './knowledge-graph'
import { wikidataProbe } from './wikidata'

export const ENTITY_PROBES: Probe[] = [knowledgeGraphProbe, wikidataProbe]

export { knowledgeGraphProbe, wikidataProbe }
