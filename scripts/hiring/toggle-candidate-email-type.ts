/**
 * TASK-1757 — Prender o apagar un tipo de correo candidate-facing, con evidencia.
 *
 * El kill-switch por tipo vive en `greenhouse_notifications.email_type_config` y se flipea SIN
 * redeploy, lo que lo hace la puerta correcta para un correo que llega a personas candidatas. Pero
 * flipearlo con SQL suelto no deja rastro de quién lo hizo ni de qué había antes, y en esta tabla
 * una fila **ausente significa ENCENDIDO** — un `INSERT` distraído enciende algo sin que nadie lo
 * note.
 *
 * Por eso es un comando y no una consulta a mano: exige el tipo explícito, muestra el estado actual
 * antes de tocarlo, corre en dry-run por defecto y sólo escribe con `--apply`.
 *
 *   pnpm hiring:email-type -- --type hiring_assessment_access_rotated            # ver estado
 *   pnpm hiring:email-type -- --type hiring_assessment_access_rotated --on --apply
 *   pnpm hiring:email-type -- --type hiring_assessment_access_rotated --off --apply
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

interface ConfigRow extends Record<string, unknown> {
  email_type: string
  enabled: boolean
  updated_at: string | null
}

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)

const value = (name: string): string | null => {
  const index = args.indexOf(`--${name}`)

  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : null
}

const emailType = value('type')
const turnOn = flag('on')
const turnOff = flag('off')
const apply = flag('apply')

const fail = (message: string): never => {
  console.error(`✖ ${message}`)
  process.exit(1)
}

if (!emailType) fail('Falta --type <email_type>.')
if (turnOn && turnOff) fail('--on y --off son mutuamente excluyentes.')

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

    const [current] = await runGreenhousePostgresQuery<ConfigRow>(
    `SELECT email_type, enabled, updated_at::text
       FROM greenhouse_notifications.email_type_config
      WHERE email_type = $1`,
    [emailType],
  )

  // Decirlo explícito: en esta tabla la ausencia NO es neutra.
  const currentLabel = current
    ? `${current.enabled ? 'ENCENDIDO' : 'APAGADO'} (actualizado ${current.updated_at ?? 'sin fecha'})`
    : 'SIN FILA — que en esta tabla significa ENCENDIDO por fail-open'

  console.log(`\nTipo:   ${emailType}`)
  console.log(`Estado: ${currentLabel}\n`)

  if (!turnOn && !turnOff) {
    console.log('Sin --on ni --off: sólo consulta. Nada que cambiar.')
    process.exit(0)
  }

  const target = turnOn

  if (current && current.enabled === target) {
    console.log(`Ya está ${target ? 'encendido' : 'apagado'}. Nada que hacer.`)
    process.exit(0)
  }

  if (!apply) {
    console.log(`DRY-RUN: pasaría a ${target ? 'ENCENDIDO' : 'APAGADO'}. Agrega --apply para escribir.`)
    process.exit(0)
  }

  // Upsert: si la fila no existía, crearla explícita es mejor que dejarla ausente y depender del
  // fail-open — el estado deja de ser implícito.
  const [updated] = await runGreenhousePostgresQuery<ConfigRow>(
    `INSERT INTO greenhouse_notifications.email_type_config (email_type, enabled)
          VALUES ($1, $2)
     ON CONFLICT (email_type) DO UPDATE
          SET enabled = EXCLUDED.enabled, updated_at = clock_timestamp()
       RETURNING email_type, enabled, updated_at::text`,
    [emailType, target],
  )

  console.log(`✔ ${updated.email_type} quedó ${updated.enabled ? 'ENCENDIDO' : 'APAGADO'} (${updated.updated_at}).`)
  console.log(`  Rollback inmediato y sin redeploy: --${target ? 'off' : 'on'} --apply\n`)

  process.exit(0)
}

void main()
