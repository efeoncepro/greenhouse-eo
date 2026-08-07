/**
 * TASK-1308 — Command canónico `trackKeywords`: agregar keywords al set monitoreado.
 *
 * Primitive gobernado (Full API Parity): lo consumen la UI operador, Nexa y el lane
 * ecosystem/MCP contra el MISMO contrato. Ningún consumer escribe
 * `seo_keyword_set_members` por su cuenta.
 *
 * ═══ La decisión que da forma a todo este archivo ═══
 *
 * 🔴 **Seguir una keyword es un COMPROMISO DE GASTO DIFERIDO, no un INSERT.** El write en sí
 * no cuesta nada; lo que cuesta es lo que pasa después: el rank capture diario (TASK-1303)
 * paga DataForSEO **por cada keyword vigente del set, todos los días**, hasta que alguien la
 * deje de seguir. Un botón "Seguir" en una tabla de 50 filas, un bucle de reintentos, o un
 * agente entusiasta pueden comprometer presupuesto ilimitado con una acción que a los ojos
 * del capability check parece barata.
 *
 * De ahí salen las tres defensas que un INSERT normal no tendría:
 *
 * 1. **Techo gobernado por target** (`resolveTrackedKeywordCapacity`). El exceso se rechaza
 *    con un outcome tipado, NUNCA en silencio y NUNCA con una excepción — el operador tiene
 *    que poder leer "el set está lleno" y decidir qué sacar.
 * 2. **Entitlement per-org**: sin `module_assignment` `seo_v1` vigente el target "no existe"
 *    para este command. Es el mismo chokepoint conceptual que `enforceSeoRunEntitlement`,
 *    pero acá NO se consume allowance ni budget: seguir no gasta hoy, gasta mañana. Cobrar
 *    allowance de site-audit por seguir una keyword sería cobrar dos veces por cosas
 *    distintas.
 * 3. **Outcome por keyword**, nunca un booleano: un caller que sólo ve `ok: true` no puede
 *    distinguir "agregué 3" de "rebotaron 40 contra el techo".
 *
 * ═══ Append-only ═══
 *
 * `seo_keyword_set_members` tiene trigger anti-DELETE (TASK-1299) e índice único parcial
 * `(keyword_set_id, keyword) WHERE effective_to IS NULL`. Este command **sólo inserta**:
 * dejar de seguir es cerrar la ventana con `effective_to` y es OTRO command (follow-up
 * declarado en la task). Mezclar ambos acá haría que un "Seguir" con un bug pudiera cerrar
 * membresías vigentes.
 */

import 'server-only'

import { withTransaction } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import {
  SEO_KEYWORD_SET_UPDATED_EVENT,
  SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
  type SeoKeywordTrackOutcome,
  type SeoKeywordTrackSource,
  type TrackKeywordsResult
} from './contracts'
import { resolveSeoEntitlement } from './entitlement'
import { isSeoModuleEnabled } from './flags'

/**
 * Nombre del set por defecto de un target.
 *
 * Un target puede tener varios sets (por cluster, por campaña), pero "Seguir" desde el mapa
 * de oportunidades no pide elegir uno: el operador está diciendo "quiero medir esto", no
 * "quiero organizarlo". El set se resuelve get-or-create para que la primera keyword seguida
 * de un target funcione sin setup previo — hasta hoy los sets sólo los creaban scripts de
 * seed, así que sin esto el primer "Seguir" de cualquier cliente nuevo fallaría.
 */
export const DEFAULT_KEYWORD_SET_NAME = 'Seguimiento principal'

/**
 * Techo de keywords vigentes por target.
 *
 * Es el freno del gasto diferido. El número sale del orden de magnitud del rank capture:
 * ~1 llamada por keyword×engine×device por día. Configurable por env para poder subirlo a
 * un cliente grande sin tocar código, pero con default conservador: el default correcto de
 * un límite de gasto es el que duele antes de que duela la factura.
 */
export const TRACKED_KEYWORDS_CAPACITY_ENV = 'GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET'
const DEFAULT_TRACKED_KEYWORDS_CAPACITY = 200

/** Techo de largo de una keyword. Más que esto no es una query, es un párrafo pegado. */
const MAX_KEYWORD_LENGTH = 255

/** Techo de tamaño del lote por llamada — acota el costo de UNA request. */
const MAX_KEYWORDS_PER_CALL = 100

export const resolveTrackedKeywordCapacity = (env: NodeJS.ProcessEnv = process.env): number => {
  const parsed = Number.parseInt(env[TRACKED_KEYWORDS_CAPACITY_ENV] ?? '', 10)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TRACKED_KEYWORDS_CAPACITY
}

/**
 * Normalización de la keyword.
 *
 * GSC entrega las queries en minúscula y con espacios simples; el operador copia y pega
 * desde cualquier lado. Sin normalizar, `"Pintura Berel "` y `"pintura berel"` serían dos
 * membresías vigentes distintas — dos llamadas al proveedor por día por la MISMA query, y
 * dos series que se leerían como keywords diferentes.
 */
export const normalizeTrackedKeyword = (raw: string): string => raw.trim().replace(/\s+/g, ' ').toLowerCase()

export interface TrackKeywordsOptions {
  /** Procedencia del write. Queda en la fila para poder auditar quién comprometió gasto. */
  source?: SeoKeywordTrackSource
  /** Nombre del set destino. Por defecto el set principal del target. */
  keywordSetName?: string
  env?: NodeJS.ProcessEnv
}

interface TargetRow extends Record<string, unknown> {
  organization_id: string
  status: string
}

/** Cliente transaccional mínimo — evita atar este módulo al tipo `PoolClient` de `pg`. */
interface TrackKeywordsClient {
  query: <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows: T[]; rowCount: number | null }>
}

export interface ApplyKeywordTrackingInput {
  seoTargetId: string
  organizationId: string
  setName: string
  capacity: number
  actor: string
  source: SeoKeywordTrackSource
  /** Keywords ya normalizadas y deduplicadas, con su validez resuelta. */
  requested: Array<{ keyword: string; valid: boolean }>
}

export interface ApplyKeywordTrackingResult {
  keywordSetId: string
  outcomes: SeoKeywordTrackOutcome[]
  activeKeywordCount: number
}

/**
 * Núcleo transaccional del command, exportado para que el sanity live lo ejercite EXACTO.
 *
 * Gate TASK-893: el SQL de acá (upsert del set, `FOR UPDATE OF` sobre el JOIN, `UNNEST` +
 * `ON CONFLICT … WHERE effective_to IS NULL`) tiene que correr contra PostgreSQL real, y
 * `trackKeywords` toma su conexión del pool — un sanity no podría ver su transacción. Por eso
 * el script llama a ESTA función sobre una conexión fijada dentro de una transacción que
 * aborta, en vez de copiar las queries: una copia puede quedar verde probando una versión
 * vieja.
 */
export const applyKeywordTracking = async (
  client: TrackKeywordsClient,
  input: ApplyKeywordTrackingInput
): Promise<ApplyKeywordTrackingResult> => {
  // Get-or-create del set. `ON CONFLICT DO UPDATE` sobre la única constraint del par
  // (target, name) para que el RETURNING traiga fila también cuando ya existía —
  // `DO NOTHING` no devuelve nada y obligaría a un segundo SELECT dentro de la tx.
  const setRows = await client.query<{ keyword_set_id: string }>(
    `INSERT INTO greenhouse_growth.seo_keyword_sets (seo_target_id, name)
          VALUES ($1, $2)
     ON CONFLICT (seo_target_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING keyword_set_id`,
    [input.seoTargetId, input.setName]
  )

  const keywordSetId = setRows.rows[0]?.keyword_set_id

  if (!keywordSetId) {
    throw new Error('seo_keyword_set_upsert_returned_no_row')
  }

  // Conteo de membresías vigentes del TARGET (no del set): el gasto lo dispara el target
  // completo — el rank capture barre todos sus sets. Contar sólo el set destino dejaría
  // abierta la puerta de repartir 10.000 keywords en 50 sets.
  //
  // `FOR UPDATE OF m` serializa dos "Seguir" concurrentes contra el mismo techo: sin esto,
  // dos clicks simultáneos leerían 199 los dos y ambos insertarían.
  const activeRows = await client.query<{ keyword: string }>(
    `SELECT m.keyword
       FROM greenhouse_growth.seo_keyword_set_members m
       JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
      WHERE s.seo_target_id = $1
        AND m.effective_to IS NULL
        FOR UPDATE OF m`,
    [input.seoTargetId]
  )

  const active = new Set(activeRows.rows.map(row => row.keyword))
  const outcomes: SeoKeywordTrackOutcome[] = []
  const toInsert: string[] = []

  for (const entry of input.requested) {
    if (!entry.valid) {
      outcomes.push({ keyword: entry.keyword, status: 'invalid' })
      continue
    }

    if (active.has(entry.keyword)) {
      outcomes.push({ keyword: entry.keyword, status: 'already_tracked' })
      continue
    }

    // El techo se evalúa contra el conteo PROYECTADO, no contra el inicial: un lote de 40
    // con 5 cupos libres agrega 5 y rebota 35, en vez de rebotar el lote entero o pasarse.
    if (active.size + toInsert.length >= input.capacity) {
      outcomes.push({ keyword: entry.keyword, status: 'capacity_exceeded' })
      continue
    }

    toInsert.push(entry.keyword)
    outcomes.push({ keyword: entry.keyword, status: 'tracked' })
  }

  let inserted = 0

  if (toInsert.length > 0) {
    // `DO NOTHING` sobre el índice único parcial: última línea de defensa contra una carrera
    // que el `FOR UPDATE` no cubriera (otra transacción que creó el set en paralelo). Si
    // rebota, la membresía ya existe — que es el estado deseado.
    const insertResult = await client.query(
      `INSERT INTO greenhouse_growth.seo_keyword_set_members
                   (keyword_set_id, keyword, created_by, source)
            SELECT $1, keyword, $2, $3
              FROM UNNEST($4::text[]) AS keyword
       ON CONFLICT (keyword_set_id, keyword) WHERE effective_to IS NULL DO NOTHING`,
      [keywordSetId, input.actor, input.source, toInsert]
    )

    inserted = insertResult.rowCount ?? 0
  }

  const activeKeywordCount = active.size + inserted

  // Outbox DENTRO de la transacción (ése es el punto del patrón): el evento y el cambio de
  // estado se confirman o se pierden juntos. Publicarlo después dejaría la ventana en que el
  // INSERT commitea y el proceso muere antes de emitir — un set que creció sin que nadie
  // downstream se entere.
  //
  // Sólo cuando el set REALMENTE cambió: un evento por cada click idempotente llenaría la
  // tabla de ruido que ningún consumer necesita procesar.
  if (inserted > 0) {
    await publishOutboxEvent(
      {
        aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
        aggregateId: input.seoTargetId,
        eventType: SEO_KEYWORD_SET_UPDATED_EVENT,
        // Coordenadas, nunca los datos: cualquier consumer re-lee PG por `keywordSetId`.
        payload: {
          seoTargetId: input.seoTargetId,
          organizationId: input.organizationId,
          keywordSetId,
          trackedCount: inserted,
          activeKeywordCount,
          source: input.source,
          actor: input.actor
        }
      },
      client as never
    )
  }

  return { keywordSetId, outcomes, activeKeywordCount }
}

export const trackKeywords = async (
  seoTargetId: string,
  keywords: string[],
  actor: string,
  options: TrackKeywordsOptions = {}
): Promise<TrackKeywordsResult> => {
  const env = options.env ?? process.env

  if (!isSeoModuleEnabled(env)) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const source: SeoKeywordTrackSource = options.source ?? 'operator_ui'
  const setName = options.keywordSetName?.trim() || DEFAULT_KEYWORD_SET_NAME
  const capacity = resolveTrackedKeywordCapacity(env)

  // Dedupe ANTES de tocar la base, preservando el orden de llegada: un lote con la misma
  // keyword repetida no debe producir dos outcomes contradictorios ('tracked' y luego
  // 'already_tracked') para la misma cadena.
  const seen = new Set<string>()
  const requested: Array<{ keyword: string; valid: boolean }> = []

  for (const raw of keywords.slice(0, MAX_KEYWORDS_PER_CALL)) {
    const keyword = normalizeTrackedKeyword(typeof raw === 'string' ? raw : '')
    const valid = keyword.length > 0 && keyword.length <= MAX_KEYWORD_LENGTH

    // El dedupe cubre también las inválidas: dos cadenas vacías son el mismo problema
    // reportado dos veces, no dos problemas.
    if (seen.has(keyword)) continue

    seen.add(keyword)
    requested.push({ keyword, valid })
  }

  // "Ninguna keyword usable llegó" es `no_keywords`, aunque el arreglo tuviera elementos:
  // un lote entero de basura no es un lote parcialmente exitoso.
  if (!requested.some(entry => entry.valid)) {
    return { ok: false, errorCode: 'no_keywords', status: null }
  }

  try {
    const targets = await runGreenhousePostgresQuery<TargetRow>(
      `SELECT organization_id, status
         FROM greenhouse_growth.seo_targets
        WHERE seo_target_id = $1`,
      [seoTargetId]
    )

    const target = targets[0]

    if (!target) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    // Un target pausado no debe crecer su set: las keywords nuevas entrarían al ciclo de
    // gasto en cuanto alguien lo reactive, sin que nadie haya vuelto a decidirlo.
    if (target.status !== 'active') {
      return { ok: false, errorCode: 'target_not_active', status: null }
    }

    // Chokepoint per-org: el módulo se contrata POR ORGANIZACIÓN. Sin assignment vigente
    // este target no existe para el command, venga de la UI, de Nexa o del lane MCP.
    const entitlement = await resolveSeoEntitlement(target.organization_id, env)

    if (!entitlement.hasModule) {
      return { ok: false, errorCode: 'no_entitlement', status: null }
    }

    const result = await withTransaction(client =>
      applyKeywordTracking(client, {
        seoTargetId,
        organizationId: target.organization_id,
        setName,
        capacity,
        actor,
        source,
        requested
      })
    )

    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      keywordSetId: result.keywordSetId,
      outcomes: result.outcomes,
      activeKeywordCount: result.activeKeywordCount,
      capacity
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_track_keywords_command' },
      extra: { seoTargetId, actor, requested: requested.length }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
