import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal, ReliabilitySeverity } from '@/types/reliability'

export const DESIGN_HANDOFF_ORPHAN_SURFACES_SIGNAL_ID = 'design_system.handoff.orphan_surfaces'

type OrphanSurfacesRow = {
  implemented_count: number
  orphan_count: number
  blank_surface_count: number
  duplicate_surface_count: number
  duplicate_entry_count: number
}

const severityForCount = (count: number): ReliabilitySeverity => (count === 0 ? 'ok' : count > 5 ? 'error' : 'warning')

export const getDesignHandoffOrphanSurfacesSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<OrphanSurfacesRow>(
      `WITH implemented_entries AS (
         SELECT entry_id,
                NULLIF(TRIM(implemented_surface_key), '') AS surface_key
           FROM greenhouse_core.design_handoff_entries
          WHERE status = 'implemented'
       ),
       duplicate_surfaces AS (
         SELECT surface_key,
                COUNT(*)::int AS entry_count
           FROM implemented_entries
          WHERE surface_key IS NOT NULL
          GROUP BY surface_key
         HAVING COUNT(*) > 1
       )
       SELECT COUNT(*)::int AS implemented_count,
              (
                COUNT(*) FILTER (WHERE i.surface_key IS NULL)
                + COALESCE((SELECT COUNT(*) FROM duplicate_surfaces), 0)
              )::int AS orphan_count,
              COUNT(*) FILTER (WHERE i.surface_key IS NULL)::int AS blank_surface_count,
              COALESCE((SELECT COUNT(*) FROM duplicate_surfaces), 0)::int AS duplicate_surface_count,
              COALESCE((SELECT SUM(entry_count - 1) FROM duplicate_surfaces), 0)::int AS duplicate_entry_count
         FROM implemented_entries i`
    )

    const implementedCount = rows[0]?.implemented_count ?? 0
    const orphanCount = rows[0]?.orphan_count ?? 0
    const blankSurfaceCount = rows[0]?.blank_surface_count ?? 0
    const duplicateSurfaceCount = rows[0]?.duplicate_surface_count ?? 0
    const duplicateEntryCount = rows[0]?.duplicate_entry_count ?? 0

    return {
      signalId: DESIGN_HANDOFF_ORPHAN_SURFACES_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getDesignHandoffOrphanSurfacesSignal',
      label: 'Design handoff orphan surfaces',
      severity: severityForCount(orphanCount),
      summary:
        orphanCount === 0
          ? `${implementedCount} handoff${implementedCount === 1 ? '' : 's'} implementado${implementedCount === 1 ? '' : 's'} con surface key unica.`
          : `${orphanCount} drift${orphanCount === 1 ? '' : 's'} conservador${orphanCount === 1 ? '' : 'es'} detectado${orphanCount === 1 ? '' : 's'}: surface vacia o duplicada en handoffs implementados.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'orphan_count', value: String(orphanCount) },
        { kind: 'metric', label: 'implemented_count', value: String(implementedCount) },
        { kind: 'metric', label: 'blank_surface_count', value: String(blankSurfaceCount) },
        { kind: 'metric', label: 'duplicate_surface_count', value: String(duplicateSurfaceCount) },
        { kind: 'metric', label: 'duplicate_entry_count', value: String(duplicateEntryCount) },
        { kind: 'metric', label: 'steady_state', value: '0' },
        {
          kind: 'doc',
          label: 'Conservative definition',
          value:
            'Sin route registry DB canonico, este signal cuenta implemented_surface_key vacio o duplicado; route evidence orphaning queda para el schema V2/API reader.'
        },
        { kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_entries' }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'platform', {
      tags: { source: 'reliability_signal_design_handoff_orphan_surfaces' }
    })

    return {
      signalId: DESIGN_HANDOFF_ORPHAN_SURFACES_SIGNAL_ID,
      moduleKey: 'platform',
      kind: 'drift',
      source: 'getDesignHandoffOrphanSurfacesSignal',
      label: 'Design handoff orphan surfaces',
      severity: 'unknown',
      summary:
        'No fue posible leer el signal de orphan surfaces de handoff. Verifica la tabla base de TASK-1120 antes de evaluar drift.',
      observedAt,
      evidence: [
        { kind: 'metric', label: 'steady_state', value: '0' },
        { kind: 'sql', label: 'Source table', value: 'greenhouse_core.design_handoff_entries' }
      ]
    }
  }
}
