/**
 * Diagnóstico read-only — «el pipeline de una vacante aparece vacío y han postulado muchos».
 *
 * NO escribe nada. Discrimina, en un solo pasado, entre las tres familias de causa que producen
 * ese mismo síntoma y que son indistinguibles desde la pantalla:
 *
 *   A. Las postulaciones NO existen  → el intake público las está rechazando (captcha/invalid/
 *      rate-limit) o nadie llegó al endpoint. Evidencia: `hiring_application_intake_events`.
 *   B. Las postulaciones existen pero el desk las FILTRA → `data_origin <> 'real'` heredado de la
 *      persona o de la vacante (TASK-1739, filtro ON en Production).
 *   C. Las postulaciones existen y son reales pero el snapshot las DESCARTA → tope de 120, o el
 *      `flatMap` de `getHiringDeskSnapshot` que las tira cuando su opening/demand no viajó.
 *
 * Uso (runtime path, Cloud SQL Connector — no requiere proxy):
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/_sanity-pipeline-empty-diagnosis.ts
 *
 * Vacantes bajo sospecha por defecto: EO-OPN-0674 (SEO Specialist) y EO-OPN-0675 (Director de Arte).
 * Override: OPENING_PUBLIC_IDS="EO-OPN-0674,EO-OPN-0675" en el entorno.
 */
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const TARGETS = (process.env.OPENING_PUBLIC_IDS ?? 'EO-OPN-0674,EO-OPN-0675')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)

const printTable = (label: string, rows: Record<string, unknown>[]) => {
  console.log(`\n── ${label} ──`)

  if (rows.length === 0) {
    console.log('  (sin filas)')

    return
  }

  console.table(rows)
}

const main = async () => {
  console.log(`Vacantes bajo diagnóstico: ${TARGETS.join(', ')}`)

  // 1. Estado de las vacantes. `data_origin <> 'real'` acá explica por sí solo el pipeline vacío:
  //    el desk filtra y el trigger propaga la procedencia a TODA postulación de esa vacante.
  printTable('1. Vacantes — estado, publicación y procedencia', await runGreenhousePostgresQuery(
    `SELECT o.public_id, o.opening_id, o.status, o.publication_status, o.visibility,
            o.data_origin AS opening_origin, o.published_at, o.demand_id,
            d.data_origin AS demand_origin,
            (d.demand_id IS NULL) AS demand_missing
       FROM greenhouse_hiring.hiring_opening o
       LEFT JOIN greenhouse_hiring.talent_demand d ON d.demand_id = o.demand_id
      WHERE o.public_id = ANY($1::text[])`,
    [TARGETS],
  ))

  // 2. LA pregunta central: ¿cuántas postulaciones hay realmente, y cuántas VE el desk?
  //    `visible_for_desk` aplica el mismo predicado que `getHiringDeskSnapshot`.
  printTable('2. Postulaciones por vacante — totales vs visibles en el desk', await runGreenhousePostgresQuery(
    `SELECT o.public_id,
            COUNT(a.application_id)::int AS total,
            COUNT(*) FILTER (WHERE a.data_origin = 'real')::int AS visible_for_desk,
            COUNT(*) FILTER (WHERE a.data_origin <> 'real')::int AS hidden_by_provenance,
            COUNT(*) FILTER (WHERE a.archived_at IS NOT NULL)::int AS archived,
            MIN(a.created_at) AS first_application,
            MAX(a.created_at) AS last_application
       FROM greenhouse_hiring.hiring_opening o
       LEFT JOIN greenhouse_hiring.hiring_application a ON a.opening_id = o.opening_id
      WHERE o.public_id = ANY($1::text[])
      GROUP BY o.public_id`,
    [TARGETS],
  ))

  // 3. Si algo quedó oculto por procedencia: de qué raíz viene. La persona es la sospechosa
  //    habitual (un perfil marcado en el lote del 2026-08-19 que vuelve a postular de verdad).
  printTable('3. Procedencia por raíz (sólo postulaciones no-real)', await runGreenhousePostgresQuery(
    `SELECT o.public_id, a.data_origin AS application_origin,
            ip.data_origin AS person_origin, o.data_origin AS opening_origin,
            COUNT(*)::int AS rows
       FROM greenhouse_hiring.hiring_application a
       JOIN greenhouse_hiring.hiring_opening o ON o.opening_id = a.opening_id
       JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = a.identity_profile_id
      WHERE o.public_id = ANY($1::text[]) AND a.data_origin <> 'real'
      GROUP BY o.public_id, a.data_origin, ip.data_origin, o.data_origin`,
    [TARGETS],
  ))

  // 4. Etapas. Una etapa fuera de las seis del enum NO tiene carril en el tablero: la tarjeta no
  //    se pinta en ninguna columna y el board se ve vacío aunque el contador diga otra cosa.
  printTable('4. Etapas presentes (una fuera del enum = tarjeta sin carril)', await runGreenhousePostgresQuery(
    `SELECT o.public_id, a.stage, a.decision, COUNT(*)::int AS rows,
            (a.stage NOT IN ('sourced','screening','shortlisted','interview','decision_pending','closed'))
              AS stage_has_no_lane
       FROM greenhouse_hiring.hiring_application a
       JOIN greenhouse_hiring.hiring_opening o ON o.opening_id = a.opening_id
      WHERE o.public_id = ANY($1::text[])
      GROUP BY o.public_id, a.stage, a.decision
      ORDER BY o.public_id, a.stage`,
    [TARGETS],
  ))

  // 5. Intake público: qué pasó con los INTENTOS de postular. Si acá hay `captcha_failed`,
  //    `invalid` o `rate_limited`, la postulación nunca llegó a existir — el problema es la puerta
  //    de entrada, no el desk. OJO: captcha/invalid se registran con opening_public_id NULL, así
  //    que esos dos sólo se pueden leer por fecha, no por vacante.
  printTable('5. Intentos de postulación (últimos 30 días, por outcome y día)', await runGreenhousePostgresQuery(
    `SELECT date_trunc('day', created_at)::date AS day, outcome,
            COALESCE(opening_public_id, '(no atribuido)') AS opening_public_id,
            COUNT(*)::int AS attempts
       FROM greenhouse_hiring.hiring_application_intake_events
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY 1, 2, 3
      ORDER BY 1 DESC, attempts DESC`,
  ))

  // 6. Contexto de volumen: el snapshot del desk topa en 120 postulaciones y 80 vacantes.
  printTable('6. Volumen global (contra los topes del snapshot: 120 apps / 80 openings)', await runGreenhousePostgresQuery(
    `SELECT (SELECT COUNT(*) FROM greenhouse_hiring.hiring_application WHERE data_origin = 'real')::int AS real_applications,
            (SELECT COUNT(*) FROM greenhouse_hiring.hiring_opening WHERE data_origin = 'real')::int AS real_openings,
            (SELECT COUNT(*) FROM greenhouse_hiring.talent_demand WHERE data_origin = 'real')::int AS real_demands`,
  ))
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
