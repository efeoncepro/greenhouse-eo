/**
 * TASK-1280 — Growth AI Visibility · Report header (SSOT del masthead render-ready).
 *
 * El `ReportArtifactModel` NO carga el nombre de la marca ni las fechas: el artifact
 * (web/print/PDF) los recibe como `ReportHeader` separado. Antes cada consumer (email,
 * operador, y ahora el endpoint público headless) formateaba la fecha + sintetizaba el
 * `periodLabel` por su cuenta → duplicación + drift de copy. Este módulo centraliza esa
 * derivación una sola vez. PURO (sin IO): sólo formatea strings a partir del nombre de la
 * organización + el `asOf` (ISO) del snapshot.
 */

import type { ReportHeader } from '@/components/growth/ai-visibility/report-artifact/web/AiVisibilityReportArtifact'

/** Fecha del reporte en es-CL (ej. "20 may 2025"), a partir del `asOf` ISO del snapshot. */
export const formatReportDate = (iso: string): string =>
  new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

/**
 * Arma el `ReportHeader` canónico (masthead) del informe. `organizationName` es la marca
 * evaluada que el propio usuario declaró (público-safe); `asOf` es el timestamp inmutable
 * del snapshot. El `periodLabel` es copy plantilla único (una sola fuente para email, PDF,
 * portal y el render público headless).
 */
export const buildReportHeader = (input: { organizationName: string; asOf: string }): ReportHeader => {
  const reportDate = formatReportDate(input.asOf)

  return {
    organizationName: input.organizationName,
    reportDate,
    periodLabel: `Diagnóstico al ${reportDate}`
  }
}
