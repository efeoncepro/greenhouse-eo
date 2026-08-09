/**
 * TASK-1310 — SEO report artifact adapters.
 *
 * DTO → shared ReportArtifactModel is pure; web and print are separate render targets. The SEO
 * surface payload is client-safe and does not alter the AEO adapters.
 */

export * from './contracts'
export * from './model'
export { default as SeoReportArtifact } from './web/SeoReportArtifact'
export type { SeoReportArtifactProps } from './web/SeoReportArtifact'
export { default as SeoReportPrint } from './print/SeoReportPrint'
export type { SeoReportPrintProps } from './print/SeoReportPrint'
