/**
 * TASK-1003 Slice 4 — backfill Efeonce/Sky: database ids → data_source ids.
 *
 * Migra los `notion_db_*` guardados (database ids legacy) a sus data_source ids
 * canónicos (modelo 2026) en el SSOT PG `greenhouse_core.space_notion_sources`.
 * Elimina el GET de resolución por corrida del resolver runtime (TASK-1003); deja
 * a Efeonce/Sky consistentes con los clientes nuevos (que ya nacen con data_source ids).
 *
 * SAFE: el `source_database_id` resultante es metadata (no join key); la resolución
 * de cliente/space es por space_id (verificado contra el view notion_workspace_360 y
 * el conformed). Idempotente (UPDATE filtrado por id viejo) + reversible (revertir ids).
 *
 * El BQ mirror `greenhouse.space_notion_sources` (lo que lee el sync para Efeonce/Sky)
 * se actualiza en el mismo flujo con `bq` DML — ver el runbook/comando que acompaña.
 *
 * Uso:
 *   set -a; source .env.local; set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/notion/backfill-task1003-data-source-ids.ts          # dry-run
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/notion/backfill-task1003-data-source-ids.ts --apply  # aplica PG
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')

// Mapping verificado en Slice 0 (GET /v1/databases/{id} → data_sources[0].id, todos 1:1)
const MAPPING: Record<string, { space: string; col: string; oldId: string; newId: string }[]> = {
  efeonce: [
    { space: 'spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad', col: 'notion_db_tareas', oldId: '3a54f0904be14158833533ba96557a73', newId: '5126d7d8-bf3f-454c-80f4-be31d1ca38d4' },
    { space: 'spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad', col: 'notion_db_proyectos', oldId: '15288d9b145940529acc75439bbd5470', newId: 'abaeb422-4538-44d8-b43f-026a907746a2' },
    { space: 'spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad', col: 'notion_db_sprints', oldId: '0c40f928047a4879ae702bfd0183520d', newId: '17f9ed19-280e-49fe-8b1f-57cecd58b849' },
    { space: 'spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad', col: 'notion_db_revisiones', oldId: 'f791ecc4f84c4cfc9d19fe0d42ec9a7f', newId: '15652bac-9d9b-435c-9d25-44969f3a8a94' },
  ],
  sky: [
    { space: 'spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9', col: 'notion_db_tareas', oldId: '23039c2fefe781389d1ec8238fc40523', newId: '23039c2f-efe7-81f8-af2d-000b67594d18' },
    { space: 'spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9', col: 'notion_db_proyectos', oldId: '23039c2fefe7817a8272ffe6be1a696a', newId: '23039c2f-efe7-8116-8a83-000b758078f8' },
    { space: 'spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9', col: 'notion_db_sprints', oldId: '27c39c2fefe780948dd2f4cc6dcf3dc6', newId: '27c39c2f-efe7-8043-8a5d-000b16376e2c' },
  ],
}

const ALLOWED_COLS = new Set(['notion_db_tareas', 'notion_db_proyectos', 'notion_db_sprints', 'notion_db_revisiones'])

const main = async () => {
  const all = [...MAPPING.efeonce, ...MAPPING.sky]
  let changed = 0

  for (const m of all) {
    if (!ALLOWED_COLS.has(m.col)) throw new Error(`col no permitida: ${m.col}`)

    const current = await runGreenhousePostgresQuery(
      `SELECT ${m.col} AS v FROM greenhouse_core.space_notion_sources WHERE space_id = $1`,
      [m.space],
    )

    const cur = (current as any[])[0]?.v ?? null
    const state = cur === m.newId ? 'ALREADY-NEW' : cur === m.oldId ? 'WILL-UPDATE' : `UNEXPECTED(${cur})`

    console.log(`  ${m.space.slice(0, 14)} ${m.col.padEnd(20)} ${state}  ${cur} -> ${m.newId}`)
    if (!APPLY) continue
    if (cur !== m.oldId) continue // idempotente: solo migra el id viejo conocido
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.space_notion_sources
          SET ${m.col} = $1, updated_at = NOW()
        WHERE space_id = $2 AND ${m.col} = $3`,
      [m.newId, m.space, m.oldId],
    )
    changed += 1
  }

  console.log(APPLY ? `\nPG: ${changed} columnas actualizadas.` : '\n(dry-run; pasar --apply para actualizar PG)')
}

main().then(() => process.exit(0)).catch((e) => { console.error('ERROR:', e?.message || e); process.exit(1) })
