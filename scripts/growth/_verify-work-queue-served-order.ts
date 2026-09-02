/**
 * TASK-1700 — Verificación live del orden SERVIDO contra el rank PERSISTIDO.
 *
 *   npx tsx --env-file=.env.local --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/growth/_verify-work-queue-served-order.ts
 *
 * SOLO LEE. Ejercita `readSeoWorkQueue` PAGINANDO de punta a punta, en vez de reimplementar
 * su `ORDER BY` en una query suelta: comparar el orden nuevo contra `rank_in_snapshot` con
 * un SQL propio sería una tautología —los dos dirían lo mismo por construcción— y no
 * ejercitaría el keyset, que es donde vivían los dos defectos de orden que este dominio ya
 * pagó. Compara CUENTA y SECUENCIA contra lo persistido.
 *
 * Corre contra `seot-efeonce-own-brand` a propósito: su curva de CTR es degenerada, así que
 * es 100 % banda 2/3 y es el único target donde el defecto discriminaba. Berel da verde con
 * el bug puesto y no prueba nada.
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { readSeoWorkQueue } from '@/lib/growth/seo/work-queue/reader'

const TARGETS = ['seot-efeonce-own-brand', 'seot-berel-mx']

const main = async () => {
  for (const target of TARGETS) {
    const persisted = await runGreenhousePostgresQuery<{
      normalized_keyword: string
      rank_in_snapshot: string
      score_band: string
    }>(
      `SELECT i.normalized_keyword, i.rank_in_snapshot::text, i.score_band::text
         FROM greenhouse_growth.seo_work_queue_items i
         JOIN (SELECT snapshot_id FROM greenhouse_growth.seo_work_queue_snapshots
                WHERE seo_target_id = $1 ORDER BY computed_at DESC LIMIT 1) s USING (snapshot_id)
        ORDER BY i.rank_in_snapshot ASC`,
      [target]
    )

    const served: string[] = []
    let cursor: string | null = null
    let pages = 0

    for (;;) {
      const res: Awaited<ReturnType<typeof readSeoWorkQueue>> = await readSeoWorkQueue(target, {
        limit: 25,
        cursor: cursor ?? undefined
      })

      if (!res.ok) {
        console.log(`${target}: reader devolvió ${res.errorCode}`)
        break
      }

      pages += 1
      served.push(...res.items.map(i => i.keyword))
      cursor = res.nextCursor
      if (!cursor) break

      if (pages > 200) {
        console.log('  ABORTO: más de 200 páginas, posible ciclo')
        break
      }
    }

    const expected = persisted.map(r => r.normalized_keyword)
    const bands = new Map<string, string>(persisted.map(r => [r.normalized_keyword, r.score_band]))
    const mismatch = expected.filter((k, i) => served[i] !== k)
    const byBand: Record<string, number> = {}

    for (const k of mismatch) {
      const b = bands.get(k) ?? '?'

      byBand[b] = (byBand[b] ?? 0) + 1
    }

    console.log(`\n${target}`)
    console.log(`  persistidos: ${expected.length}   servidos: ${served.length}   páginas: ${pages}`)
    console.log(`  CUENTA:    ${expected.length === served.length ? 'coincide' : `DIFIERE (faltan ${expected.length - served.length})`}`)
    console.log(`  SECUENCIA: ${mismatch.length === 0 ? 'coincide posición por posición' : `${mismatch.length} fuera de lugar`}`)
    if (mismatch.length) console.log(`    por banda: ${Object.entries(byBand).map(([b, n]) => `b${b}=${n}`).join(' ')}`)
    const dupes = served.length - new Set(served).size

    console.log(`  duplicados servidos: ${dupes}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('FALLÓ:', e instanceof Error ? e.message : e)
    process.exit(1)
  })
