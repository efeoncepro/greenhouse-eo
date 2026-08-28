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
 * 2. **Entitlement per-org**: sin `module_assignment` `seo_v2` vigente el target "no existe"
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
 *
 * ═══ TASK-1659 — la intención declarada ═══
 *
 * Una membresía ahora puede declarar POR QUÉ existe: `target` (compromiso con el cliente) u
 * `opportunity` (demanda medida que se está empujando). Es un eje ORTOGONAL a `source`, que
 * dice quién ejecutó el write.
 *
 * Dos decisiones que rigen todo lo de abajo:
 *
 * 1. **Sin default.** Quien no declara escribe `NULL`. Asumir `opportunity` sería el mismo
 *    error que backfillear la columna: afirmar que alguien clasificó la keyword cuando nadie
 *    lo hizo, e inflar el KPI de oportunidades con filas que nadie miró.
 * 2. **Cambiar de intención es cerrar + abrir, nunca un `UPDATE`.** El dato que sostiene el
 *    reporte de avance no es "esta keyword es objetivo" sino "es objetivo desde marzo, y en
 *    marzo estaba en la 45". Un `UPDATE` destruye justo eso. Y ese cambio **no consume cupo**:
 *    el conteo vigente no se mueve, así que reclasificar sigue siendo posible con el set lleno
 *    — que es cuando más falta hace.
 */

import 'server-only'

import { withTransaction } from '@/lib/db'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { appendDiscoveryActionTx } from './keyword-discovery/queue'

import {
  SEO_KEYWORD_SET_UPDATED_EVENT,
  SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
  type SeoKeywordIntent,
  type SeoKeywordTrackOutcome,
  type SeoKeywordTrackSource,
  type SeoKeywordUntrackOutcome,
  type TrackKeywordsResult,
  type UntrackKeywordsResult
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
  /**
   * TASK-1659 — intención declarada de la membresía.
   *
   * 🔴 **Sin default.** Es tentador asumir `opportunity` para no romper callers viejos, y
   * sería el mismo error que backfillear la columna: afirmar que alguien clasificó la
   * keyword cuando nadie lo hizo. Quien no declara escribe `NULL`, y los readers tratan la
   * ausencia explícita. La lente Oportunidades declara `opportunity` en su propia llamada —
   * ahí sí hay alguien diciéndolo.
   *
   * Pasar una intención distinta a la vigente CIERRA la membresía actual y abre otra: el dato
   * de reporte no es "esta keyword es objetivo" sino "es objetivo desde marzo, y en marzo
   * estaba en la 45".
   */
  intent?: SeoKeywordIntent
  /**
   * TASK-1659 — quién asumió el compromiso, cuando difiere de `actor` (quién ejecutó el
   * INSERT). Es el caso de un agente que agrega la keyword por encargo de una persona. Por
   * defecto es `actor`.
   */
  intentDeclaredBy?: string
  /**
   * TASK-1692 — de qué candidato de discovery nació esta promoción.
   *
   * OPCIONAL: quien no la declara se comporta exactamente como antes. Quien SÍ la declara
   * obtiene una fila `promoted_to_tracking` en el ledger de decisiones, escrita en la MISMA
   * transacción que abre la membresía — o pasan las dos cosas, o no pasa ninguna.
   *
   * Responde la pregunta que ningún otro store contesta: *esta membresía nació de ESTE
   * candidato, de ESTA corrida, decidida por ESTA persona*. No es un segundo almacén de "esta
   * keyword se está midiendo" — eso lo sigue diciendo `seo_keyword_set_members`.
   */
  discoveryProvenance?: { candidateId: string; runId: string }
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
  /** TASK-1659 — intención declarada; `undefined` = el caller no declaró nada. */
  intent?: SeoKeywordIntent
  /** TASK-1659 — autor del compromiso. Sólo se usa si `intent` viene declarada. */
  intentDeclaredBy?: string
  /** Keywords ya normalizadas y deduplicadas, con su validez resuelta. */
  requested: Array<{ keyword: string; valid: boolean }>
  /**
   * TASK-1692 — procedencia de discovery ya VALIDADA por el caller (el candidato existe y es
   * de esta organización). Cuando viene, el ledger se escribe dentro de esta transacción.
   */
  discoveryProvenance?: { candidateId: string; runId: string }
}

export interface ApplyKeywordTrackingResult {
  keywordSetId: string
  outcomes: SeoKeywordTrackOutcome[]
  activeKeywordCount: number
  /** TASK-1659 — cuántas membresías cambiaron de intención (cerradas y reabiertas). */
  intentChangedCount: number
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
  // TASK-1659 — se trae también la intención vigente: sin ella no se puede distinguir
  // "ya la seguíamos igual" (no-op) de "ya la seguíamos como oportunidad y ahora es un
  // compromiso" (cambio real que hay que historiar).
  const activeRows = await client.query<{ keyword: string; intent: string | null }>(
    `SELECT m.keyword, m.intent
       FROM greenhouse_growth.seo_keyword_set_members m
       JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
      WHERE s.seo_target_id = $1
        AND m.effective_to IS NULL
        FOR UPDATE OF m`,
    [input.seoTargetId]
  )

  const activeIntentByKeyword = new Map<string, SeoKeywordIntent | null>(
    activeRows.rows.map(row => [row.keyword, (row.intent as SeoKeywordIntent | null) ?? null])
  )

  const active = new Set(activeIntentByKeyword.keys())
  const outcomes: SeoKeywordTrackOutcome[] = []
  const toInsert: string[] = []
  const toRedeclare: Array<{ keyword: string; previousIntent: SeoKeywordIntent | null }> = []

  // La autoría acompaña a la declaración o no se escribe ninguna de las dos: es el CHECK
  // `seo_keyword_set_members_intent_authorship_check` expresado del lado del command.
  const declaredBy = input.intent ? (input.intentDeclaredBy ?? input.actor) : null

  for (const entry of input.requested) {
    if (!entry.valid) {
      outcomes.push({ keyword: entry.keyword, status: 'invalid' })
      continue
    }

    if (active.has(entry.keyword)) {
      const currentIntent = activeIntentByKeyword.get(entry.keyword) ?? null

      // Sin intención pedida no se toca nada: un caller viejo no debe reescribir la historia
      // de una membresía que alguien ya declaró. Y declarar lo mismo dos veces es un no-op
      // idempotente, no un error ni una fila nueva.
      if (!input.intent || input.intent === currentIntent) {
        outcomes.push({
          keyword: entry.keyword,
          status: 'already_tracked',
          ...(currentIntent ? { intent: currentIntent } : {})
        })
        continue
      }

      // Cambio real de intención. NO consume cupo: el conteo vigente no se mueve porque se
      // cierra una y se abre otra. Cobrarle techo a un cambio de intención bloquearía
      // reclasificar justo cuando el set está lleno, que es cuando más falta hace.
      toRedeclare.push({ keyword: entry.keyword, previousIntent: currentIntent })
      outcomes.push({
        keyword: entry.keyword,
        status: 'intent_changed',
        intent: input.intent,
        ...(currentIntent ? { previousIntent: currentIntent } : {})
      })
      continue
    }

    // El techo se evalúa contra el conteo PROYECTADO, no contra el inicial: un lote de 40
    // con 5 cupos libres agrega 5 y rebota 35, en vez de rebotar el lote entero o pasarse.
    if (active.size + toInsert.length >= input.capacity) {
      outcomes.push({ keyword: entry.keyword, status: 'capacity_exceeded' })
      continue
    }

    toInsert.push(entry.keyword)
    outcomes.push({
      keyword: entry.keyword,
      status: 'tracked',
      ...(input.intent ? { intent: input.intent } : {})
    })
  }

  // ── TASK-1659: cambio de intención = cerrar + abrir, NUNCA un UPDATE de la columna ──────
  //
  // Un `UPDATE intent = 'target'` destruiría exactamente el dato que hace posible el reporte
  // de avance ("es objetivo desde marzo, y en marzo estaba en la 45"). La tabla ya es
  // append-only con ventanas: se reusa ese mecanismo.
  //
  // El cierre va ANTES del INSERT dentro de la MISMA transacción, porque el índice único
  // parcial `(keyword_set_id, keyword) WHERE effective_to IS NULL` no admite dos vigentes.
  if (toRedeclare.length > 0) {
    const redeclareKeywords = toRedeclare.map(entry => entry.keyword)

    // 🔴 `clock_timestamp()` y NO `NOW()`: `NOW()` devuelve el timestamp de INICIO de la
    // transacción, así que cerrar una membresía creada en esa misma transacción produciría
    // `effective_to = effective_from` y reventaría el CHECK (23514) — el `>` es estricto.
    // Mismo hallazgo que `untrackKeywords`, y los mocks no lo atrapan.
    await client.query(
      `UPDATE greenhouse_growth.seo_keyword_set_members m
          SET effective_to = clock_timestamp()
         FROM greenhouse_growth.seo_keyword_sets s
        WHERE s.keyword_set_id = m.keyword_set_id
          AND s.seo_target_id = $1
          AND m.effective_to IS NULL
          AND m.keyword = ANY($2::text[])`,
      [input.seoTargetId, redeclareKeywords]
    )

    // La membresía nueva nace en el set destino de ESTE command. Si la anterior vivía en otro
    // set del mismo target, el cambio de intención la consolida acá — el techo y el gasto son
    // del target, no del set.
    await client.query(
      `INSERT INTO greenhouse_growth.seo_keyword_set_members
                   (keyword_set_id, keyword, created_by, source, intent, intent_declared_by, intent_declared_at)
            SELECT $1, keyword, $2, $3, $4, $5, clock_timestamp()
              FROM UNNEST($6::text[]) AS keyword
       ON CONFLICT (keyword_set_id, keyword) WHERE effective_to IS NULL DO NOTHING`,
      [keywordSetId, input.actor, input.source, input.intent, declaredBy, redeclareKeywords]
    )
  }

  let inserted = 0

  if (toInsert.length > 0) {
    // `DO NOTHING` sobre el índice único parcial: última línea de defensa contra una carrera
    // que el `FOR UPDATE` no cubriera (otra transacción que creó el set en paralelo). Si
    // rebota, la membresía ya existe — que es el estado deseado.
    const insertResult = await client.query(
      `INSERT INTO greenhouse_growth.seo_keyword_set_members
                   (keyword_set_id, keyword, created_by, source, intent, intent_declared_by, intent_declared_at)
            SELECT $1, keyword, $2, $3, $4, $5,
                   CASE WHEN $4::text IS NULL THEN NULL ELSE clock_timestamp() END
              FROM UNNEST($6::text[]) AS keyword
       ON CONFLICT (keyword_set_id, keyword) WHERE effective_to IS NULL DO NOTHING`,
      [keywordSetId, input.actor, input.source, input.intent ?? null, declaredBy, toInsert]
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
  //
  // TASK-1659 — un cambio de intención TAMBIÉN es un cambio real del set aunque
  // `activeKeywordCount` no se mueva: cerró una membresía y abrió otra. Emitir sólo por
  // `inserted > 0` dejaría esa transición invisible para todo downstream.
  const intentChangedCount = toRedeclare.length

  if (inserted > 0 || intentChangedCount > 0) {
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
          intentChangedCount,
          declaredIntent: input.intent ?? null,
          activeKeywordCount,
          source: input.source,
          actor: input.actor
        }
      },
      client as never
    )
  }

  // ── TASK-1692 — la decisión queda registrada donde nace, no donde se reporta ──────
  //
  // 🔴 Dentro de ESTA transacción: o hay membresía y fila, o no hay ninguna. Si el writer
  // viviera en el consumer, entre la llamada que abre la membresía y la que la registra habría
  // una red — y cuando se cae queda el compromiso de gasto hecho y la decisión sin autor.
  if (input.discoveryProvenance) {
    for (const outcome of outcomes) {
      // Sólo hubo promoción en estos tres. `capacity_exceeded` e `invalid` NO dejan fila:
      // registrar un intento fallido como decisión de promoción sería exactamente la clase de
      // mentira que el ledger existe para evitar.
      if (outcome.status !== 'tracked' && outcome.status !== 'already_tracked' && outcome.status !== 'intent_changed') {
        continue
      }

      const appended = await appendDiscoveryActionTx(client, {
        organizationId: input.organizationId,
        candidateId: input.discoveryProvenance.candidateId,
        actionKind: 'promoted_to_tracking',
        actor: input.actor,
        // Clave derivada del outcome DURABLE: dos decisiones distintas sobre el mismo candidato
        // (seguir, y después reclasificar) son dos hechos y dejan dos filas.
        idempotencyKey: `promoted:${keywordSetId}:${input.discoveryProvenance.candidateId}:${outcome.status}`,
        metadata: {
          outcome: outcome.status,
          // La ausencia de `intent` se escribe como AUSENCIA, jamás como default: asumir
          // `opportunity` afirmaría una clasificación que nadie hizo (invariante TASK-1659).
          ...(outcome.intent ? { intent: outcome.intent } : {}),
          keywordSetId,
          runId: input.discoveryProvenance.runId
        }
      })

      if (!appended.ok) {
        // Falla CERRADA. La procedencia se validó antes de abrir la transacción, así que un
        // fallo acá es un problema real — y una membresía cuya procedencia no se puede probar
        // es peor que ninguna membresía: sería atribución sin respaldo en un log de auditoría.
        throw new Error(`seo_discovery_action_append_failed:${appended.errorCode}`)
      }
    }
  }

  return { keywordSetId, outcomes, activeKeywordCount, intentChangedCount }
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

    // TASK-1692 — la procedencia se valida ANTES de abrir la transacción, igual que el target y
    // el entitlement. Así el append de adentro no puede fallar por tenant, y quien declaró una
    // procedencia inválida recibe un código que dice qué pasó en vez de un `query_failed`.
    if (options.discoveryProvenance) {
      const candidateId = options.discoveryProvenance.candidateId.trim()

      const candidates = candidateId
        ? await runGreenhousePostgresQuery<{ candidate_id: string }>(
            `SELECT candidate_id
               FROM greenhouse_growth.seo_keyword_discovery_candidates
              WHERE candidate_id = $1
                AND organization_id = $2`,
            [candidateId, target.organization_id]
          )
        : []

      if (!candidates[0]) {
        return { ok: false, errorCode: 'invalid_discovery_provenance', status: null }
      }
    }

    const result = await withTransaction(client =>
      applyKeywordTracking(client, {
        seoTargetId,
        organizationId: target.organization_id,
        setName,
        capacity,
        actor,
        source,
        intent: options.intent,
        intentDeclaredBy: options.intentDeclaredBy,
        requested,
        ...(options.discoveryProvenance ? { discoveryProvenance: options.discoveryProvenance } : {})
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


/**
 * Deja de seguir keywords: cierra su ventana de membresía.
 *
 * ═══ POR QUÉ ESTE COMMAND EXISTE ═══
 *
 * Sin él, `trackKeywords` era una puerta de una sola dirección: el set tiene techo, la UI
 * decía "deja de seguir alguna" y no había forma de hacerlo desde el portal — un callejón
 * sin salida diseñado. Y algo más importante: **es lo que hace reversible el gasto**. Seguir
 * una keyword compromete al proveedor en cada ciclo del rank capture; sin la contraparte,
 * ese compromiso era permanente.
 *
 * ⚠️ NO BORRA NADA. `seo_keyword_set_members` es append-only con trigger anti-DELETE
 * (TASK-1299): dejar de seguir es cerrar `effective_to`, no eliminar la fila. El histórico
 * de qué se midió y cuándo es justamente lo que permite explicar una factura pasada — y el
 * índice único parcial (`WHERE effective_to IS NULL`) deja volver a seguir la misma keyword
 * después, creando una membresía nueva sin chocar con la cerrada.
 */
export const untrackKeywords = async (
  seoTargetId: string,
  keywords: string[],
  actor: string,
  options: { env?: NodeJS.ProcessEnv } = {}
): Promise<UntrackKeywordsResult> => {
  const env = options.env ?? process.env

  if (!isSeoModuleEnabled(env)) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const capacity = resolveTrackedKeywordCapacity(env)
  const seen = new Set<string>()
  const requested: Array<{ keyword: string; valid: boolean }> = []

  for (const raw of keywords.slice(0, MAX_KEYWORDS_PER_CALL)) {
    const keyword = normalizeTrackedKeyword(typeof raw === 'string' ? raw : '')
    const valid = keyword.length > 0 && keyword.length <= MAX_KEYWORD_LENGTH

    if (seen.has(keyword)) continue

    seen.add(keyword)
    requested.push({ keyword, valid })
  }

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

    // ⚠️ A diferencia de `trackKeywords`, acá NO se exige `status = 'active'`. Dejar de
    // seguir siempre tiene que poder hacerse: si el target se pausó con el set lleno,
    // bloquear la salida dejaría el gasto congelado sin forma de bajarlo.
    const entitlement = await resolveSeoEntitlement(target.organization_id, env)

    if (!entitlement.hasModule) {
      return { ok: false, errorCode: 'no_entitlement', status: null }
    }

    const result = await withTransaction(async client => {
      const valid = requested.filter(entry => entry.valid).map(entry => entry.keyword)

      const closed = await client.query<{ keyword: string }>(
        // 🔴 `clock_timestamp()` y NO `NOW()`.
        //
        // `NOW()` devuelve el timestamp de INICIO de la transacción, así que cerrar una
        // membresía creada en esa misma transacción produce `effective_to = effective_from`
        // y revienta el CHECK `effective_to > effective_from` (23514) — el `>` es estricto.
        // `clock_timestamp()` avanza dentro de la transacción y siempre queda posterior.
        //
        // Lo encontró el sanity contra PG real; los mocks del TS lo daban por bueno, que es
        // exactamente para lo que existe el gate TASK-893.
        `UPDATE greenhouse_growth.seo_keyword_set_members m
            SET effective_to = clock_timestamp()
           FROM greenhouse_growth.seo_keyword_sets s
          WHERE s.keyword_set_id = m.keyword_set_id
            AND s.seo_target_id = $1
            AND m.effective_to IS NULL
            AND m.keyword = ANY($2::text[])
        RETURNING m.keyword`,
        [seoTargetId, valid]
      )

      const closedSet = new Set(closed.rows.map(row => row.keyword))

      const outcomes: SeoKeywordUntrackOutcome[] = requested.map(entry => ({
        keyword: entry.keyword,
        status: !entry.valid ? 'invalid' : closedSet.has(entry.keyword) ? 'untracked' : 'not_tracked'
      }))

      const remaining = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n
           FROM greenhouse_growth.seo_keyword_set_members m
           JOIN greenhouse_growth.seo_keyword_sets s ON s.keyword_set_id = m.keyword_set_id
          WHERE s.seo_target_id = $1
            AND m.effective_to IS NULL`,
        [seoTargetId]
      )

      const activeKeywordCount = Number(remaining.rows[0]?.n ?? 0)

      // Mismo evento que el alta: lo que downstream necesita saber es que el set CAMBIÓ y
      // cuántas keywords se están midiendo ahora. Un tipo de evento aparte obligaría a cada
      // consumer a manejar dos formas de la misma noticia.
      if (closedSet.size > 0) {
        await publishOutboxEvent(
          {
            aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
            aggregateId: seoTargetId,
            eventType: SEO_KEYWORD_SET_UPDATED_EVENT,
            payload: {
              seoTargetId,
              organizationId: target.organization_id,
              untrackedCount: closedSet.size,
              activeKeywordCount,
              actor
            }
          },
          client as never
        )
      }

      return { outcomes, activeKeywordCount }
    })

    return {
      ok: true,
      seoTargetId,
      organizationId: target.organization_id,
      outcomes: result.outcomes,
      activeKeywordCount: result.activeKeywordCount,
      capacity
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_untrack_keywords_command' },
      extra: { seoTargetId, actor, requested: requested.length }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
