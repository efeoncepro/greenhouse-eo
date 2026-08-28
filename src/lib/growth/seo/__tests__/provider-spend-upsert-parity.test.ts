import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1696 — Paridad entre el `ON CONFLICT` del SQL productivo y la UNIQUE de la base.
 *
 * ⚠️ ES UN BUG DE DINERO Y ES SILENCIOSO. Si la constraint cubre 4 columnas y el `ON CONFLICT`
 * declara 3 (o al revés), PostgreSQL no encuentra el árbitro y el UPSERT falla; el transporte,
 * por contrato, observa el fallo del contador y NO invalida un resultado que el proveedor ya
 * cobró. Resultado: se gasta de verdad, el ledger no acumula, el gate de presupuesto lee de
 * menos y nadie ve un error. Se descubriría en la factura.
 *
 * El test no lee la constraint "esperada" de una constante: la extrae de las MIGRACIONES, que
 * son la única fuente que la base ejecutó de verdad. Barre todas y se queda con la definición
 * más reciente por timestamp de archivo — así una migración futura que vuelva a tocar la clave
 * queda cubierta sin editar este test.
 */

import { SEO_PROVIDER_SPEND_UPSERT_SQL } from '../provider-spend'

const MIGRATIONS_DIR = join(process.cwd(), 'migrations')
const CONSTRAINT_NAME = 'seo_provider_spend_daily_unique'

/** Última definición de la UNIQUE en el árbol de migraciones, por orden de timestamp. */
const readLatestUniqueColumns = (): string[] => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(name => name.endsWith('.sql'))
    .sort()

  let columns: string[] | null = null

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')

    // Cubre las dos formas: `CONSTRAINT <n> UNIQUE (...)` inline en el CREATE TABLE y
    // `ADD CONSTRAINT <n> UNIQUE (...)` de un ALTER. La Down Migration de 1696 restaura la
    // forma de 3 columnas, así que sólo se mira la sección Up de cada archivo.
    const upSection = sql.split('-- Down Migration')[0] ?? sql

    const matches = [
      ...upSection.matchAll(new RegExp(`CONSTRAINT\\s+${CONSTRAINT_NAME}\\s+UNIQUE\\s*(?:NULLS\\s+NOT\\s+DISTINCT\\s*)?\\(([^)]+)\\)`, 'g'))
    ]

    const last = matches.at(-1)

    if (last) {
      columns = (last[1] ?? '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
    }
  }

  expect(columns, `no se encontró ninguna definición de ${CONSTRAINT_NAME} en migrations/`).not.toBeNull()

  return columns ?? []
}

const readUpsertConflictColumns = (): string[] => {
  const match = SEO_PROVIDER_SPEND_UPSERT_SQL.match(/ON CONFLICT \(([^)]+)\)/)

  expect(match, 'el UPSERT productivo no declara ON CONFLICT').not.toBeNull()

  return (match?.[1] ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
}

describe('paridad ON CONFLICT ↔ UNIQUE de seo_provider_spend_daily (TASK-1696)', () => {
  it('el árbitro del UPSERT es exactamente la clave única vigente en la base', () => {
    // Si esto falla: cambiaste una de las dos mitades. NO ajustes el test — haz que la migración
    // y el writer vuelvan a decir lo mismo, en el mismo commit.
    expect(readUpsertConflictColumns()).toEqual(readLatestUniqueColumns())
  })

  it('la clave incluye consumidor Y base de costo: ni dos consumidores ni dos tipos de dólar colapsan', () => {
    // `consumer` separa "quién gastó"; `cost_basis` + `price_table_version` separan "qué tipo de
    // dólar es". Sin lo segundo, un dólar estimado entra por el DO UPDATE de la fila facturada
    // del día y queda reetiquetado como facturado — la mentira exacta que las columnas de
    // honestidad existen para impedir (encontrado ejercitando el SQL contra PG, no leyéndolo).
    expect(readLatestUniqueColumns()).toEqual([
      'organization_id',
      'family',
      'spend_date',
      'consumer',
      'cost_basis',
      'price_table_version'
    ])
  })
})
