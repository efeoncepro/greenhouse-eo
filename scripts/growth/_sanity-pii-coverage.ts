/**
 * TASK-1255 — Sanity live de cobertura de cifrado PII en Growth Forms, contra PG real.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-pii-coverage.ts
 *
 * Responde dos preguntas que ningun doc puede responder por si solo:
 *   1. cuantas submissions estan cifradas vs en claro;
 *   2. si existe siquiera un campo de identificador nacional en el corpus.
 *
 * 🔴 Lee SOLO nombres de clave, NUNCA valores: los valores son PII y no deben aparecer
 * en un log, un transcript ni un pantallazo. Un primer intento filtro por el TEXTO del
 * blob y dio 6 falsos positivos (texto libre que menciona "documento").
 *
 * Medicion 2026-09-01: 98 filas, 0 cifradas, 0 claves de identificador.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const r = await runGreenhousePostgresQuery<Record<string,string>>(`
    SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE encrypted_fields_json IS NOT NULL
                         AND encrypted_fields_json::text NOT IN ('{}','null'))::text AS cifradas,
      MIN(created_at)::text AS primera,
      MAX(created_at)::text AS ultima
    FROM greenhouse_growth.form_submission
  `)

  console.log('form_submission:', JSON.stringify(r[0]))

  // SOLO nombres de clave. NUNCA valores: son PII y no deben salir en un log.
  const keys = await runGreenhousePostgresQuery<Record<string,string>>(`
    SELECT k AS clave, COUNT(*)::text AS filas
    FROM greenhouse_growth.form_submission s,
         LATERAL jsonb_object_keys(s.normalized_fields_json) AS k
    WHERE k ~* '(rut|dni|cedula|national_?id|documento|passport)'
    GROUP BY k ORDER BY 2 DESC
  `)

  console.log('claves con pinta de identificador:', JSON.stringify(keys))
}

main().then(() => process.exit(0)).catch(e => { console.error('ERR', e?.message ?? e); process.exit(1) })
