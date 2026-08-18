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

/** Id estable: los live tests son idempotentes y comparten el mismo sujeto sintético. */
export const LIVE_TEST_IDENTITY_PROFILE_ID = 'identity-live-test-hiring-fixture'

const LIVE_TEST_IDENTITY_EMAIL = 'live-test-hiring-fixture@live-test.invalid'

/**
 * Devuelve el `profile_id` sintético, creándolo si no existe. Idempotente y seguro de correr
 * en paralelo (`ON CONFLICT DO NOTHING`). Nunca devuelve el perfil de una persona real.
 */
export const resolveLiveTestIdentityProfileId = async (): Promise<string> => {
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_core.identity_profiles
       (profile_id, profile_type, canonical_email, full_name, status, active)
     VALUES ($1, 'candidate', $2, 'LIVE-TEST Hiring Fixture', 'active', true)
     ON CONFLICT (profile_id) DO NOTHING`,
    [LIVE_TEST_IDENTITY_PROFILE_ID, LIVE_TEST_IDENTITY_EMAIL]
  )

  return LIVE_TEST_IDENTITY_PROFILE_ID
}
