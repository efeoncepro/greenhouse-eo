import 'server-only'

import { getSearchConsoleConnection } from '@/lib/growth/search-console'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1306 — Estado de la fuente MEDIDA (Search Console) para el cockpit Overview.
 *
 * Distingue tres condiciones que la UI NO puede colapsar en una sola, porque llevan al
 * operador a acciones distintas:
 *   - `not_connected`  → falta el OAuth. Acción: conectar. Mostrar 0 acá sería mentir.
 *   - `no_snapshots`   → conexión viva, pero la captura diaria todavía no escribió nada.
 *                        Acción: esperar / revisar el scheduler. NO es "sin conexión".
 *   - `connected`      → hay al menos un día capturado; el panel puede rendir datos.
 *
 * ⚠️ La frescura sale de `seo_gsc_daily` (lo MATERIALIZADO), no de un read-through en
 * vivo a Google: el cockpit muestra hasta dónde llega el dato guardado, que es lo que
 * efectivamente alimenta los KPIs. Preguntarle a Google daría una fecha más nueva que
 * la que el panel puede graficar.
 */

export type SeoOverviewConnectionState = 'connected' | 'not_connected' | 'no_snapshots'

export interface SeoOverviewConnection {
  state: SeoOverviewConnectionState
  /** Último día con datos materializados (YYYY-MM-DD). `null` si no hay ninguno. */
  dataAsOf: string | null
}

export const readSeoOverviewConnection = async (organizationId: string): Promise<SeoOverviewConnection> => {
  const connection = await getSearchConsoleConnection(organizationId)

  // Mismo predicado que usa `readSearchConsoleAnalytics` para decidir `not_connected`:
  // una conexión a medio configurar (sin propiedad o sin token) NO es una conexión.
  if (!connection || connection.status !== 'active' || !connection.tokenSecretRef || !connection.siteUrl) {
    return { state: 'not_connected', dataAsOf: null }
  }

  const rows = await runGreenhousePostgresQuery<{ data_as_of: string | null }>(
    `SELECT MAX(capture_date)::text AS data_as_of
       FROM greenhouse_growth.seo_gsc_daily
      WHERE organization_id = $1`,
    [organizationId]
  )

  const dataAsOf = rows[0]?.data_as_of ?? null

  return dataAsOf ? { state: 'connected', dataAsOf } : { state: 'no_snapshots', dataAsOf: null }
}
