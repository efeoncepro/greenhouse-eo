/**
 * TASK-1676 / ISSUE-145 — Ancla canónica del diff de release.
 *
 * Devuelve el `target_sha` del último release **efectivamente desplegado** en una
 * rama, que es contra lo que el `release_batch_policy` tiene que comparar.
 *
 * ## Por qué existe este reader y no se usa `listRecentReleases`
 *
 * `manifest-store.ts` es el store completo del control plane: escribe, transiciona
 * estados y emite al outbox. El preflight sólo necesita **un SHA**, y corre en el
 * hot path de un job de CI donde arrastrar el grafo de escritura del manifest sería
 * traer un motor para leer una matrícula.
 *
 * Además `listRecentReleases` **no filtra por estado** — devuelve también `aborted`
 * y `rolled_back` ordenados por fecha. Eso no es un detalle teórico: en este mismo
 * repo conviven dos manifests con el `target_sha` `30140c662a79…`, uno `aborted`
 * (2026-08-07 12:08) y uno `released` (13:04). Un caller que tomara el primer row
 * podría anclarse a un release que nunca llegó a producción.
 *
 * ## Por qué sólo `released`
 *
 * `released` es el único estado que garantiza "esto está en producción y siguió
 * estándolo":
 *
 *   - `aborted` nunca llegó;
 *   - `rolled_back` llegó y se sacó — y como la transición mueve el estado, el filtro
 *     lo excluye solo, sin lógica extra. Anclarse a código revertido produciría un
 *     diff que omite justo lo que hay que volver a mirar;
 *   - `degraded` **sí** está desplegado (el código llegó, el health soft-falló). Se
 *     excluye a propósito por el invariante de TASK-1676: ante la duda, el gate ve
 *     de más y no de menos. El costo es un diff inflado si el release anterior quedó
 *     degradado; por eso el evidence del check declara qué base usó, para que un
 *     falso positivo se diagnostique en un vistazo en vez de investigarse.
 *
 * ## Orden
 *
 * `started_at DESC`, igual que `listRecentReleases`. Verificado sobre los 75
 * manifests de `main`: cero pares donde `completed_at` invierta el orden de
 * `started_at`. Ordenar por `completed_at` sería más literal pero es NULL en los
 * manifests degradados reales, así que introduciría un caso de borde a cambio de
 * nada.
 */

import 'server-only'

import { query } from '@/lib/db'

export interface LastReleasedRelease {
  /** SHA de 40 chars que quedó desplegado. */
  readonly targetSha: string

  /** Release id del manifest, para que el evidence sea auditable. */
  readonly releaseId: string

  /** Cuándo arrancó ese release (ISO). */
  readonly startedAt: string | null
}

/**
 * Último release en estado `released` para la rama. `null` cuando no hay ninguno
 * — caso legítimo en una rama sin historia de releases (hoy, cualquiera que no sea
 * `main`).
 *
 * Read-only puro: esta función NUNCA escribe `release_manifests` ni
 * `release_state_transitions`, que son append-only y propiedad del control plane.
 */
export const readLastReleasedRelease = async (params: {
  targetBranch: string
}): Promise<LastReleasedRelease | null> => {
  const rows = await query<{
    release_id: string
    target_sha: string
    started_at: Date | string | null
  }>(
    `SELECT release_id, target_sha, started_at
       FROM greenhouse_sync.release_manifests
      WHERE target_branch = $1
        AND state = 'released'
      ORDER BY started_at DESC
      LIMIT 1`,
    [params.targetBranch]
  )

  const row = rows[0]

  if (!row) return null

  return {
    targetSha: row.target_sha,
    releaseId: row.release_id,
    startedAt:
      row.started_at instanceof Date
        ? row.started_at.toISOString()
        : (row.started_at ?? null)
  }
}
