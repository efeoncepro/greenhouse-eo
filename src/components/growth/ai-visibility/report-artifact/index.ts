/**
 * TASK-1252 — AI Visibility Report Artifact · barrel.
 *
 * Sistema reusable del informe (Full API Parity: un modelo, muchos consumers).
 * Consumers (TASK-1241 público, TASK-1248 cliente, TASK-1250 attachment) importan
 * desde aquí: el MODEL/adapters (puro) + los render adapters por target.
 *
 *  - `model` (puro): variants, disclosure matrix, mapeo dimensión→nivel, adapters
 *    DTO→`ReportArtifactModel`. Sin JSX/IO.
 *  - `web/AiVisibilityReportArtifact`: render React/MUI (charts vivos, motion).
 *  - `print/AiVisibilityReportPrint`: render print/PDF-safe (estático, sin JS).
 *  - `fixtures`: sample reports para harness/tests.
 */

export * from './model'
export { default as AiVisibilityReportArtifact } from './web/AiVisibilityReportArtifact'
export type { AiVisibilityReportArtifactProps, ReportHeader } from './web/AiVisibilityReportArtifact'
export { default as AiVisibilityReportPrint } from './print/AiVisibilityReportPrint'
export type { AiVisibilityReportPrintProps } from './print/AiVisibilityReportPrint'
