/**
 * TASK-1846 — deduplicación de `plan.limits` en el RENDER, no en el planner.
 *
 * Por qué acá y no en `editorial/deterministic-planner.ts`: los planes se CONGELAN
 * (`insight_editorial_plans`, inmutable) y su contenido alimenta el `issued_hash`. Arreglarlo en el
 * planner no limpiaría los planes ya congelados —que igual se van a renderizar— y sí cambiaría el
 * hash para entradas idénticas. El plan registra fielmente un límite por rechazo; la PRESENTACIÓN
 * colapsa las líneas idénticas.
 *
 * El duplicado nace porque el nivel superior descarta el `detail` del rechazo
 * (`${module}: ${REJECTION_TEXT[reason]}.`), así que N rechazos de un mismo módulo por un mismo
 * motivo producen N copias sin información distinta. En los capítulos el `detail` sí se conserva,
 * y por eso ahí casi nunca colapsan.
 *
 * NO muta el plan: devuelve una copia lista para render.
 */

import type { EditorialPlanV1 } from '../contracts/plan'

/** Colapsa líneas idénticas preservando el orden de primera aparición. */
export const dedupeLimitLines = (limits: readonly string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []

  for (const line of limits) {
    // El trim evita que un espacio final haga pasar por distinta una línea idéntica.
    const key = line.trim()

    if (key.length === 0 || seen.has(key)) continue

    seen.add(key)
    out.push(line)
  }

  return out
}

/**
 * Plan listo para render: límites deduplicados arriba y en cada capítulo.
 * Devuelve una copia; el plan congelado nunca se toca.
 */
export const withDedupedLimits = (plan: EditorialPlanV1): EditorialPlanV1 => ({
  ...plan,
  limits: dedupeLimitLines(plan.limits),
  chapters: plan.chapters.map(chapter => ({
    ...chapter,
    limits: dedupeLimitLines(chapter.limits)
  }))
})
