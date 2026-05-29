// ─── TASK-950 Slice 3 hotfix — Pure href builders canonical (client + server safe) ──
//
// Extracted from `nexa-insight-drill-reader.ts` (server-only) so client
// components (`'use client'` cards, drawers, future surfaces) can import the
// pure href builder without pulling the entire PG reader transitively into
// the client bundle (Turbopack rejects `child_process` / `dns` from `@grpc/grpc-js`).
//
// Bug class fuente: CLAUDE.md "Task Closing Quality Gate" 2026-05-13 TASK-827.
// El detector canonical fue Turbopack `next build` (no detectable por tsc/lint).
//
// Reglas duras:
//   - Este archivo NO debe agregar `import 'server-only'`.
//   - NUNCA importar desde `@/lib/{db,observability/capture,...}` ni cualquier
//     módulo que dependa transitivamente de Node-only APIs.
//   - Pure functions only. Single source of truth para href format de Nexa.

/**
 * Construye el href canonical del detail page de Nexa Insights.
 *
 * @param id - signalId canonical (`EO-AIS-*`) o enrichmentId (`EO-AIE-*`)
 *   para share permalinks. El reader del detail acepta ambos prefixes y
 *   resuelve la fila vigente correspondiente (TASK-947).
 *
 * @returns Path absoluto `/nexa/insights/<id>` (NO incluye origin).
 */
export const buildNexaInsightDrillHref = (id: string): string =>
  `/nexa/insights/${id}`
