import 'server-only'

/**
 * Perfil de identidad SINTÉTICO para los live tests del dominio Hiring.
 *
 * Por qué existe (incidente 2026-08-17): los `*.live.test.ts` anclaban su fixture con
 * `SELECT profile_id FROM greenhouse_core.identity_profiles WHERE active = true LIMIT 1`.
 * Sin `ORDER BY`, ese `LIMIT 1` es no determinista y cae sobre **cualquier persona real** de
 * la base — que es única y compartida por dev, staging y producción. Cuando cayó sobre un
 * colaborador activo, `reconcileCandidateFacet` le creó una ficha de candidato, el ops-worker
 * le materializó una membresía del Banco de Talento y un evento de consentimiento: una
 * persona real quedó registrada como candidata sin haber postulado ni consentido nada, por
 * pura mecánica de test.
 *
 * La corrección no es limpiar después: es no tocar a nadie real. Los live tests anclan en
 * este perfil dedicado, reconocible por su `profile_id` y su dominio de correo, que además
 * la purga gobernada (`pnpm hiring:candidates:purge-test-facets`) puede identificar sin
 * ambigüedad.
 *
 * **NUNCA** volver a resolver el ancla de un test con "el primer perfil activo": el fixture
 * no puede elegir a una persona real como sujeto de prueba.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * Id estable del sujeto COMPARTIDO. Sirve para los tests que sólo necesitan «una identidad
 * sintética» y no mutan nada que otro archivo pueda observar.
 *
 * ⚠️ **NO sirve cuando el test muta al sujeto** (le crea postulaciones, propuestas o asignaciones).
 * Para eso está `resolveLiveTestCandidateFixture(scope)`, más abajo: ver la razón ahí.
 */
export const LIVE_TEST_IDENTITY_PROFILE_ID = 'identity-live-test-hiring-fixture'

const LIVE_TEST_IDENTITY_EMAIL = 'live-test-hiring-fixture@live-test.invalid'

/**
 * Devuelve el `profile_id` sintético, creándolo si no existe. Idempotente y seguro de correr
 * en paralelo (`ON CONFLICT DO NOTHING`). Nunca devuelve el perfil de una persona real.
 */
export const resolveLiveTestIdentityProfileId = async (): Promise<string> => {
  // TASK-1748 — la procedencia se DECLARA en el nacimiento del dato. Sin esta columna el fixture
  // nacía `real` (el default del dominio, que es el correcto: omitir deja el dato VISIBLE, nunca
  // oculto), o sea: el sujeto de todos los live tests de Hiring quedaba registrado como una persona
  // real en la base única y compartida, y cualquier ficha que un test le creara entraba al Banco de
  // Talento como candidata legítima. Declararlo acá es la mitad del arreglo; la fila que ya existe
  // se corrige por el camino gobernado (`pnpm hiring:data:mark-synthetic`), que deja audit con actor y motivo.
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.identity_profiles
       (profile_id, profile_type, canonical_email, full_name, status, active, data_origin)
     VALUES ($1, 'candidate', $2, 'LIVE-TEST Hiring Fixture', 'active', true, 'smoke_test')
     ON CONFLICT (profile_id) DO NOTHING`,
    [LIVE_TEST_IDENTITY_PROFILE_ID, LIVE_TEST_IDENTITY_EMAIL]
  )

  return LIVE_TEST_IDENTITY_PROFILE_ID
}

// ── Aislamiento por scope (2026-08-23) ──────────────────────────────────────────────────────────

/**
 * 🔴 **Un sujeto compartido no es aislamiento, y bajo ejecución paralela produce rojos que parecen
 * flakiness.**
 *
 * Incidente que lo motiva (2026-08-23): tres `*.live.test.ts` de assignment-policy resolvían su
 * fixture con la MISMA consulta —`… WHERE canonical_email ~* '^(task-…|qa\.careers\+)' AND
 * data_origin <> 'real' ORDER BY ip.profile_id LIMIT 2`— sobre un pool de **3 perfiles**. Al correr
 * en paralelo los tres tomaban **los mismos dos**, se creaban postulaciones sobre el mismo
 * `candidate_facet` y las propuestas se invalidaban entre sí: 6 tests rojos con
 * `assessment_assignment_proposal_stale`. Aislados pasaban los tres.
 *
 * El síntoma invita al arreglo equivocado —serializar los archivos, o repartir el pool con `OFFSET`
 * por índice— y los dos son deuda: el primero castiga a toda la suite por un acoplamiento que sigue
 * ahí, y el segundo se rompe con el cuarto archivo. **La causa es el pool compartido sin protocolo
 * de asignación, así que la corrección es no compartir.**
 *
 * Cada archivo deriva su propio sujeto desde un `scope` textual. Es determinista (mismo scope →
 * misma fila, así que las corridas repetidas no acumulan filas), idempotente bajo concurrencia
 * (`ON CONFLICT DO NOTHING`) y **no necesita coordinación**: un archivo nuevo elige su scope y
 * queda aislado por construcción, sin registro central que mantener ni índices que repartir.
 *
 * Conserva las tres propiedades que ISSUE-159 exigía: nunca toca a una persona real, declara
 * `data_origin='smoke_test'` en el nacimiento del dato, y mantiene el dominio de correo reconocible
 * para que la purga gobernada lo identifique sin ambigüedad.
 */
export interface LiveTestCandidateFixture {
  profileId: string
  candidateFacetId: string
}

const scopeSlug = (scope: string): string => {
  const slug = scope
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!slug) {
    // Falla fuerte: un scope vacío devolvería el sujeto compartido y reintroduciría en silencio
    // exactamente el acoplamiento que esta función existe para eliminar.
    throw new Error('resolveLiveTestCandidateFixture requiere un scope no vacío (usa el nombre del archivo de test).')
  }

  return slug.slice(0, 60)
}

/**
 * Devuelve —creándolos si no existen— el perfil y la ficha de candidato sintéticos EXCLUSIVOS de
 * este `scope`. Usa el nombre del archivo de test como scope.
 */
export const resolveLiveTestCandidateFixture = async (scope: string): Promise<LiveTestCandidateFixture> => {
  const slug = scopeSlug(scope)
  const profileId = `${LIVE_TEST_IDENTITY_PROFILE_ID}--${slug}`

  // 🔴 **El dominio NO es `.invalid`, y la asimetría con el sujeto compartido es deliberada.**
  //
  // `.invalid` está reservado por RFC 2606 justamente para que nada llegue nunca ahí, y por eso es
  // el dominio correcto para un fixture que no ejercita envíos. Pero el dominio lo lee también
  // `resolveRecipientReadiness` (`assignment-policy/assign.ts:142`), que bloquea con
  // `unverified_recipient` a todo destinatario indeliverable — una guarda correcta y que no hay que
  // relajar. Un fixture en `.invalid` no puede llegar a `assigned`, así que los tests del ciclo de
  // asignación necesitan un dominio que la guarda acepte.
  //
  // Se usa el dominio de la organización con un local-part inconfundible: pasa la guarda, la purga
  // gobernada lo identifica, y NO matchea el patrón del pool sembrado
  // (`^(task-[0-9]+|qa\.careers\+)`), así que ninguna consulta que barra ese pool va a recoger
  // estos sujetos y reintroducir el acoplamiento por la puerta de atrás.
  //
  // El buzón no existe: el correo que salga rebota. Aun así, los tests que llegan a `assigned`
  // retiran su evento del outbox DENTRO del propio test — el publisher corre cada 2 minutos sobre
  // esta misma base y esperar al `afterAll` es apostarle al reloj.
  const email = `live-test-hiring-fixture+${slug}@efeonce.org`

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.identity_profiles
       (profile_id, profile_type, canonical_email, full_name, status, active, data_origin)
     VALUES ($1, 'candidate', $2, $3, 'active', true, 'smoke_test')
     ON CONFLICT (profile_id) DO NOTHING`,
    [profileId, email, `LIVE-TEST Hiring Fixture (${slug})`]
  )

  // La ficha se ancla al perfil, no al revés: `candidate_facet` tiene un único registro por
  // identidad en este contexto, así que se busca antes de insertar y se relee después — el
  // `ON CONFLICT DO NOTHING` de otra corrida concurrente no devuelve fila.
  const existing = await runGreenhousePostgresQuery<{ candidate_facet_id: string }>(
    `SELECT candidate_facet_id FROM greenhouse_hiring.candidate_facet
      WHERE identity_profile_id = $1 ORDER BY created_at LIMIT 1`,
    [profileId]
  )

  if (existing[0]) return { profileId, candidateFacetId: existing[0].candidate_facet_id }

  const inserted = await runGreenhousePostgresQuery<{ candidate_facet_id: string }>(
    `INSERT INTO greenhouse_hiring.candidate_facet (identity_profile_id, source, status)
     VALUES ($1, 'manual', 'active')
     RETURNING candidate_facet_id`,
    [profileId]
  )

  if (inserted[0]) return { profileId, candidateFacetId: inserted[0].candidate_facet_id }

  // Carrera perdida contra otra corrida del mismo scope: releer en vez de fallar.
  const reread = await runGreenhousePostgresQuery<{ candidate_facet_id: string }>(
    `SELECT candidate_facet_id FROM greenhouse_hiring.candidate_facet
      WHERE identity_profile_id = $1 ORDER BY created_at LIMIT 1`,
    [profileId]
  )

  if (!reread[0]) throw new Error(`No se pudo resolver el candidate_facet del fixture live-test "${slug}".`)

  return { profileId, candidateFacetId: reread[0].candidate_facet_id }
}

/**
 * Variante para los tests que necesitan VARIOS sujetos distintos (p. ej. dos postulaciones a la
 * misma vacante). Deriva un sub-scope por índice, así que los sujetos son estables entre corridas
 * y siguen aislados de los de cualquier otro archivo.
 *
 * El `count` se pide explícito en vez de inferirse: un test que necesita dos sujetos y recibe uno
 * fallaría con un error de dominio confuso, en vez de decir que le faltó fixture.
 */
export const resolveLiveTestCandidateFixtures = async (
  scope: string,
  count: number
): Promise<LiveTestCandidateFixture[]> => {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('resolveLiveTestCandidateFixtures requiere un count entero >= 1.')
  }

  const fixtures: LiveTestCandidateFixture[] = []

  // Secuencial a propósito: son 1-3 filas y en paralelo competirían por el mismo `ON CONFLICT`
  // sin ganar nada medible.
  for (let index = 1; index <= count; index += 1) {
    fixtures.push(await resolveLiveTestCandidateFixture(`${scope}-${index}`))
  }

  return fixtures
}
