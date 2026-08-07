/**
 * Lista forense de workflow runs excluidos del check `pending_without_jobs`.
 *
 * Existe para UN solo caso: un run que la PROPIA infraestructura de GitHub dejó en un
 * estado interno roto e inmanejable (todas las vías de la API agotadas y verificadas),
 * y que por lo tanto matchea la firma del deadlock (queued + jobs vacíos + >5min) sin
 * ser un deadlock nuestro. Sin esta lista, un residuo así bloquea TODO release futuro
 * hasta que GitHub lo recolecte — con `main` ya servido por Vercel y sin manifest, que
 * es exactamente el estado que el control plane prohíbe dejar.
 *
 * Reglas duras:
 * - **NUNCA** agregar una entrada sin haber agotado y DOCUMENTADO las vías de la API
 *   (`cancel`, `force-cancel`, `rerun`, `DELETE`, desalojo por concurrency, workflow
 *   disable/enable). Si alguna funciona, se usa esa — esta lista es el último recurso.
 * - **SIEMPRE** con `expiresAt`: al vencer, el run vuelve a contar. Si GitHub ya lo
 *   recolectó, la entrada vencida es inerte; si sigue vivo, el check vuelve a bloquear
 *   y un humano revisa (nunca una exclusión permanente en silencio).
 * - La exclusión aplica SOLO al preflight de release. La reliability signal
 *   `platform.release.pending_without_jobs` NO la consume: el dashboard conserva
 *   visibilidad total del residuo mientras exista.
 * - Toda entrada queda en la evidencia del preflight (`ignored[]`) — el manifest del
 *   release registra que se promovió con la exclusión activa.
 */

export interface IgnoredPendingRun {
  runId: number
  /** Razón forense: qué es el run, por qué es inmanejable, qué vías se agotaron. */
  reason: string
  /** Fecha de alta (YYYY-MM-DD). */
  addedAt: string
  /** Vencimiento (YYYY-MM-DD, exclusivo): desde ese día el run vuelve a contar. */
  expiresAt: string
}

export const IGNORED_PENDING_RUNS: readonly IgnoredPendingRun[] = [
  {
    runId: 31126022507,
    reason:
      'Zombie del major outage de GitHub Actions 2026-08-06: re-run de ops-worker-deploy quedó en estado interno contradictorio ("Cannot cancel a workflow re-run that has not yet queued" + "This workflow is already running"). Agotados: cancel/force-cancel (409), DELETE (403), rerun (rechazado), desalojo por concurrency (run nuevo success, zombie intacto), workflow disable/enable (sin efecto). El worker ya sirve el SHA del run (26005a619) desde el break-glass documentado en Handoff 2026-08-06.',
    addedAt: '2026-08-07',
    expiresAt: '2026-08-21'
  }
]

/** Ids vigentes (no vencidos) a excluir; `now` inyectable para tests. */
export const activeIgnoredRunIds = (now: Date = new Date()): Set<number> => {
  const today = now.toISOString().slice(0, 10)

  return new Set(
    IGNORED_PENDING_RUNS.filter(entry => entry.expiresAt > today).map(entry => entry.runId)
  )
}
