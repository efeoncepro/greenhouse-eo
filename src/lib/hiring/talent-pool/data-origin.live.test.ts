import { afterAll, describe, expect, it } from 'vitest'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { searchTalentPool } from './readers'

/**
 * TASK-1748 Slice 1 — la exclusión es POR PROCEDENCIA, no por ciclo de vida (live PG).
 *
 * Éste es el test que la task existe para escribir. Hasta ahora las 11 fichas sintéticas no
 * aparecían en el Banco de Talento, pero por un accidente: quedaron en
 * `lifecycle_status='needs_reconsent'` y el `baseSelect` sólo sirve
 * `('active_process','pool_eligible','paused')`. Un test que sólo comprobara «no aparecen» habría
 * pasado igual antes y después del cambio, sin probar absolutamente nada.
 *
 * Por eso el sujeto se fuerza al estado MÁS servible que existe (`pool_eligible`): si el filtro de
 * procedencia no operara, esa persona inventada aparecería. Es la única forma de distinguir «está
 * oculta porque la ocultamos» de «está oculta de casualidad».
 *
 * DOS decisiones de fixture, las dos aprendidas en vivo:
 *
 * 1. **Se toma prestada una membresía YA sintética y se restaura**, en vez de crear una nueva. El
 *    perfil `runtime` no tiene `DELETE` sobre `talent_pool_membership` ni sobre
 *    `talent_pool_consent_event` (verificado: `permission denied`), así que un fixture creado acá
 *    NO se puede limpiar y quedaría de residuo permanente en la base — que es única y compartida por
 *    dev, staging y producción.
 * 2. **El sujeto se elige comprobando que su procedencia NO es real**, nunca «el primer perfil
 *    activo» (`ISSUE-159`): ese anclaje ya registró una vez a un colaborador real como candidato.
 *    Si no hay ninguna membresía sintética, el test se salta en vez de fabricar una.
 */

const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

type Subject = { membershipId: string; publicId: string; lifecycleStatus: string }

let subject: Subject | null = null

const loadSyntheticSubject = async (): Promise<Subject | null> => {
  const rows = await runGreenhousePostgresQuery<{
    membership_id: string
    public_id: string
    lifecycle_status: string
  }>(
    `SELECT m.membership_id, m.public_id, m.lifecycle_status
       FROM greenhouse_hiring.talent_pool_membership m
       JOIN greenhouse_hiring.candidate_facet cf ON cf.candidate_facet_id = m.candidate_facet_id
       JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = cf.identity_profile_id
      WHERE ip.data_origin <> 'real'
      ORDER BY m.membership_id
      LIMIT 1`
  )

  const row = rows[0]

  if (!row) return null

  return { membershipId: row.membership_id, publicId: row.public_id, lifecycleStatus: row.lifecycle_status }
}

/**
 * Devuelve el `updated_at` REAL que quedó en la fila. No se puede fijar desde acá: la tabla lo pisa
 * con la hora del servidor de base (verificado en vivo — se escribió `NOW() - 1 minuto` y quedó
 * `NOW()`), así que hay que leerlo, no suponerlo.
 */
const setLifecycle = async (membershipId: string, lifecycleStatus: string): Promise<string> => {
  const rows = await runGreenhousePostgresQuery<{ updated_at: Date | string }>(
    `UPDATE greenhouse_hiring.talent_pool_membership
        SET lifecycle_status = $2
      WHERE membership_id = $1
      RETURNING updated_at`,
    [membershipId, lifecycleStatus]
  )

  return new Date(rows[0]!.updated_at).toISOString()
}

/**
 * La búsqueda congela un `snapshotAt` tomado del reloj de NODE y filtra `m.updated_at <= snapshotAt`.
 * El `updated_at` lo pone el reloj del SERVIDOR DE BASE. Si la base va unos segundos adelante, la
 * fila recién tocada queda fuera del snapshot y el test falla por una razón que no tiene nada que
 * ver con la procedencia — pasó exactamente así en la primera corrida de este archivo, y seis
 * segundos después el mismo test pasó. Esperar al reloj local es determinista; un `sleep` fijo no.
 */
const waitForSnapshotToCover = async (updatedAt: string) => {
  const target = Date.parse(updatedAt) + 250

  while (Date.now() < target) {
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

const findSubject = async (input: Parameters<typeof searchTalentPool>[0], publicId: string) => {
  // Se pagina hasta encontrarlo o agotar: el Banco tiene ~58 perfiles reales servibles y el sujeto
  // no tiene por qué caer en la primera página. Mirar sólo la primera daría un falso «no aparece».
  let cursor: string | undefined
  let found = false
  let pages = 0

  do {
    const page = await searchTalentPool({ ...input, cursor, cursorBinding: 'task-1748-live-test', limit: 50 })

    found = page.items.some(item => item.talentProfileId === publicId)
    cursor = page.nextCursor ?? undefined
    pages += 1
  } while (!found && cursor && pages < 20)

  return found
}

describe.skipIf(!hasPgConfig)('TASK-1748 — el Banco de Talento excluye por procedencia (live PG)', () => {
  afterAll(async () => {
    if (!hasPgConfig || !subject) return

    // Restaurar es obligatorio, no cortesía: el sujeto es una fila viva de la base compartida. Sólo
    // se restaura `lifecycle_status`; `updated_at` lo gobierna la base y quedará bumpeado, que es
    // inocuo (es una columna de proyección, no un dato del candidato).
    await setLifecycle(subject.membershipId, subject.lifecycleStatus)
  })

  it('una membresía sintética en el estado MÁS servible sigue sin aparecer', async () => {
    subject = await loadSyntheticSubject()

    if (!subject) {
      // Sin sujeto sintético no hay nada que probar, y fabricar uno dejaría residuo permanente.
      expect(subject).toBeNull()

      return
    }

    await waitForSnapshotToCover(await setLifecycle(subject.membershipId, 'pool_eligible'))

    process.env.HIRING_SYNTHETIC_DATA_FILTER_ENABLED = 'true'

    // Pre-condición: sin el filtro SÍ aparece. Sin este assert, el de abajo pasaría también si el
    // sujeto no fuera servible por cualquier otra razón, y el test no probaría nada.
    expect(await findSubject({ includeSynthetic: true }, subject.publicId)).toBe(true)

    // Y con el filtro no aparece, estando en el estado más servible del ciclo de vida.
    expect(await findSubject({}, subject.publicId)).toBe(false)

    // El flag OFF lo devuelve: la invisibilidad es del filtro, no del sujeto.
    process.env.HIRING_SYNTHETIC_DATA_FILTER_ENABLED = 'false'
    expect(await findSubject({}, subject.publicId)).toBe(true)
  })
})
