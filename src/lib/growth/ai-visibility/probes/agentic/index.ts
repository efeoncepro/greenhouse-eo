/**
 * TASK-1266 — Growth AI Visibility · Agentic-web readiness probes (eje `agentic`).
 *
 * Probes que miden la operabilidad agéntica: "¿te pueden usar los agentes?". Se completan
 * en Slice 3 (.well-known/mcp, API discoverability, DOM semántico, potentialAction, WebMCP
 * tools). El array vive aquí para que el registry sea estable desde el substrate (Slice 1).
 */

import { type Probe } from '../contracts'

export const AGENTIC_PROBES: Probe[] = []
