/**
 * TASK-1266 — Growth AI Visibility · Agentic-web readiness probes (eje `agentic`).
 *
 * Probes que miden la operabilidad agéntica: "¿te pueden usar los agentes?". .well-known/mcp
 * + API discoverability + acciones estructuradas (potentialAction) + DOM semántico (HTTP
 * read-only) + WebMCP tools (headless, degrada a skipped sin Chromium). WebMCP es el TECHO,
 * no el único camino. Orden = el de ejecución secuencial del gatherer.
 */

import { type Probe } from '../contracts'
import { wellKnownMcpProbe } from './well-known-mcp'
import { apiDiscoverabilityProbe } from './api-discoverability'
import { structuredActionsProbe } from './structured-actions'
import { domSemanticsProbe } from './dom-semantics'
import { webmcpToolsProbe } from './webmcp-tools'

export const AGENTIC_PROBES: Probe[] = [
  wellKnownMcpProbe,
  apiDiscoverabilityProbe,
  structuredActionsProbe,
  domSemanticsProbe,
  webmcpToolsProbe
]
