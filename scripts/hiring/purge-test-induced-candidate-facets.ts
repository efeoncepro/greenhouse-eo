/**
 * TASK-1739 — Purga gobernada de fichas de candidato INDUCIDAS POR TESTS sobre personas reales.
 *
 * Por qué existe: los `*.live.test.ts` del dominio hiring construían su fixture tomando "los
 * primeros perfiles activos con correo" de `identity_profiles`. Cuando esa consulta cae sobre un
 * colaborador real, `reconcileCandidateFacet` le crea una ficha de candidato, el ops-worker le
 * materializa una membresía del Banco de Talento y un evento de consentimiento — todo por
 * mecánica, sin que la persona haya postulado ni consentido nada. Caso fuente 2026-08-17: un
 * colaborador ACTIVO apareció en el Banco de Talento con consentimiento `not_captured`.
 *
 * Qué borra y qué NO. SÓLO purga una ficha que cumple las TRES condiciones a la vez:
 *   1. `created_by` está en la allowlist de autores sintéticos (fixtures de test),
 *   2. tiene CERO postulaciones, handoffs y solicitudes de activación,
 *   3. su consentimiento es `not_captured` — o sea la persona nunca aceptó nada.
 * Si falta cualquiera, ABORTA esa ficha y la reporta. Una ficha con una postulación real es
 * historia que ocurrió: no se borra, se conserva.
 *
 * El borrado corre con el perfil `ops` a propósito: `greenhouse_runtime` NO tiene DELETE sobre
 * estas tablas por diseño, y este script no es una excepción a esa regla — es el acto humano
 * que la regla contempla.
 *
 * Uso:
 *   # 1. DRY-RUN (default, read-only): imprime el plan y las precondiciones de cada ficha.
 *   pnpm hiring:candidates:purge-test-facets
 *
 *   # 2. APPLY sobre fichas explícitas (nunca "todas las que encuentre"):
 *   pnpm hiring:candidates:purge-test-facets --apply --facets cndf-aaa,cndf-bbb
 *
 * La salida trae nombre y correo: es stdout local del operador. No pegarla en logs compartidos.
 *
 * CONEXIÓN: el borrado corre con el perfil `ops` aplicado sobre el CLIENTE CANÓNICO
 * (`applyGreenhousePostgresProfile('ops')` + `withGreenhousePostgresTransaction`), no con un
 * `pg.Client` propio. La primera versión abría su propio cliente TCP y moría con `ECONNRESET`
 * contra el proxy local, mientras el cliente canónico —que usa Cloud SQL Connector— servía sin
 * problema: el corte era del cliente TCP, no de la base. Además el repo prohíbe instanciar pools
 * fuera de `src/lib/postgres/client.ts`, así que la corrección cierra las dos cosas a la vez.
 * El perfil `ops` NO es opcional: `greenhouse_app` (runtime) responde `permission denied` sobre
 * estas tablas por diseño, verificado en vivo.
 */
import { applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import {
  closeGreenhousePostgres,
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction,
} from '@/lib/postgres/client'

/** Autores que SÓLO puede haber escrito un fixture. Nunca incluir un user-id humano real. */
const SYNTHETIC_AUTHORS = new Set([
  'user-live-test',
  'user-live-test-proposal',
  'user-live-test-2',
  'user-live-test-3',
  'user-live-test-racer',
  'user-reviewer',
  'user-smoke-test',
])

const argValue = (flag: string): string | null => {
  const i = process.argv.indexOf(flag)

  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null
}

interface FacetRow extends Record<string, unknown> {
  candidate_facet_id: string
  full_name: string
  canonical_email: string
  created_by: string | null
  consent_status: string | null
  created_at: Date
  member_status: string | null
  apps: number
  handoffs: number
  activations: number
}

const loadCandidates = async (facetIds: string[] | null): Promise<FacetRow[]> =>
  runGreenhousePostgresQuery<FacetRow>(
    `SELECT cf.candidate_facet_id, ip.full_name, ip.canonical_email, cf.created_by,
            cf.consent_status, cf.created_at, m.status AS member_status,
            (SELECT COUNT(*)::int FROM greenhouse_hiring.hiring_application
              WHERE candidate_facet_id = cf.candidate_facet_id)                        AS apps,
            (SELECT COUNT(*)::int FROM greenhouse_hiring.hiring_handoff
              WHERE candidate_facet_id = cf.candidate_facet_id)                        AS handoffs,
            (SELECT COUNT(*)::int FROM greenhouse_hr.hiring_activation_request
              WHERE candidate_facet_id = cf.candidate_facet_id)                        AS activations
       FROM greenhouse_hiring.candidate_facet cf
       JOIN greenhouse_core.identity_profiles ip ON ip.profile_id = cf.identity_profile_id
       LEFT JOIN greenhouse_core.members m ON m.identity_profile_id = ip.profile_id
      WHERE cf.created_by = ANY($1::text[])
        AND ($2::text[] IS NULL OR cf.candidate_facet_id = ANY($2::text[]))
      ORDER BY cf.created_at DESC`,
    [Array.from(SYNTHETIC_AUTHORS), facetIds],
  )

/** Las tres condiciones. Devuelve el motivo del rechazo, o null si es purgable. */
const rejectionReason = (row: FacetRow): string | null => {
  if (!row.created_by || !SYNTHETIC_AUTHORS.has(row.created_by)) return `created_by="${row.created_by}" no es un fixture`
  if (Number(row.apps) > 0) return `tiene ${row.apps} postulación(es) — es historia real`
  if (Number(row.handoffs) > 0) return `tiene ${row.handoffs} handoff(s)`
  if (Number(row.activations) > 0) return `tiene ${row.activations} solicitud(es) de activación`

  if (row.consent_status && row.consent_status !== 'not_captured') {
    return `consentimiento "${row.consent_status}" — la persona SÍ aceptó algo`
  }

  return null
}

const main = async () => {
  const apply = process.argv.includes('--apply')
  const facetsArg = argValue('--facets')
  const facetIds = facetsArg ? facetsArg.split(',').map(s => s.trim()).filter(Boolean) : null

  if (apply && !facetIds) {
    console.error('\n  --apply exige --facets <id,id>. Nunca se purga "todo lo que encuentre".\n')
    process.exit(1)
  }

  const rows = await loadCandidates(facetIds)

  console.log(`\n══ Fichas de candidato con autor de fixture: ${rows.length} ══\n`)

  const purgeable: FacetRow[] = []

  for (const row of rows) {
    const reason = rejectionReason(row)

    console.log(`  ${reason ? '⛔' : '✅'} ${row.candidate_facet_id}`)
    console.log(`     ${row.full_name} <${row.canonical_email}>  member=${row.member_status ?? '—'}`)
    console.log(`     autor=${row.created_by}  consent=${row.consent_status}  creada=${String(row.created_at).slice(0, 19)}`)
    console.log(`     ${reason ? `NO se purga: ${reason}` : 'purgable: sin historia y sin consentimiento'}\n`)

    if (!reason) purgeable.push(row)
  }

  if (!apply) {
    console.log(`  DRY-RUN. Purgables: ${purgeable.length}. Para aplicar:`)
    console.log(`  pnpm hiring:candidates:purge-test-facets --apply --facets ${purgeable.map(r => r.candidate_facet_id).join(',') || '<id>'}\n`)

    return
  }

  // El perfil `ops` se aplica sobre las env vars canónicas y el borrado corre por el cliente
  // canónico (Cloud SQL Connector). Un `pg.Client` propio contra el proxy moría con ECONNRESET.
  applyGreenhousePostgresProfile('ops')
  // Cerrar el pool abierto con el perfil runtime del dry-run: el próximo query lo reabre como `ops`.
  await closeGreenhousePostgres({ source: 'close' })

  for (const row of purgeable) {
    await withGreenhousePostgresTransaction(async client => {
      const memberships = await client.query<{ membership_id: string }>(
        `SELECT membership_id FROM greenhouse_hiring.talent_pool_membership WHERE candidate_facet_id = $1`,
        [row.candidate_facet_id],
      )

      const ids = memberships.rows.map(r => r.membership_id)

      if (ids.length > 0) {
        // Orden obligatorio: todas las FK son RESTRICT.
        for (const table of [
          'talent_pool_self_service_token',
          'talent_pool_invitation',
          'talent_pool_evidence_projection',
          'talent_pool_activity',
          'talent_pool_consent_event',
        ]) {
          const r = await client.query(
            `DELETE FROM greenhouse_hiring.${table} WHERE membership_id = ANY($1::text[])`,
            [ids],
          )

          if (r.rowCount) console.log(`  ${table}: ${r.rowCount}`)
        }

        const m = await client.query(
          `DELETE FROM greenhouse_hiring.talent_pool_membership WHERE candidate_facet_id = $1`,
          [row.candidate_facet_id],
        )

        console.log(`  talent_pool_membership: ${m.rowCount}`)
      }

      const f = await client.query(
        `DELETE FROM greenhouse_hiring.candidate_facet WHERE candidate_facet_id = $1`,
        [row.candidate_facet_id],
      )

      console.log(`  candidate_facet: ${f.rowCount}  → ${row.candidate_facet_id}`)
    })
  }

  const left = await loadCandidates(purgeable.map(r => r.candidate_facet_id))

  console.log(`\n  Verificación post-apply: quedan ${left.length} de las purgadas (debe ser 0).\n`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[purge-test-facets] falló:', error)
    process.exit(1)
  })
