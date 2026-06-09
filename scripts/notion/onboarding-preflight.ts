#!/usr/bin/env tsx
/**
 * TASK-1009 — CLI del preflight de onboarding Notion (read-only).
 *
 *   pnpm notion:onboarding-preflight <spaceId> [--json]
 *
 * Corre los 9 checks end-to-end (token → sync → raw → client_id → readiness →
 * template L1 → conformed → portal PG → freshness) para un space y reporta
 * verde/rojo por eslabón. NO muta nada. La auto-completación del checklist vive
 * en el endpoint gated (Slice 4), no acá.
 *
 * Requiere el shim de server-only (importa helpers server-side):
 *   tsx --require ./scripts/lib/server-only-shim.cjs scripts/notion/onboarding-preflight.ts <spaceId>
 */

import {
  getNotionOnboardingReadiness,
  type NotionOnboardingReadiness,
  type OnboardingCheckStatus
} from '../../src/lib/integrations/notion-onboarding-preflight'

const STATUS_GLYPH: Record<OnboardingCheckStatus, string> = {
  ok: '✓',
  fail: '✗',
  degraded: '⚠'
}

interface CliOptions {
  spaceId: string | null
  json: boolean
}

const parseArgs = (argv: readonly string[]): CliOptions => {
  const options: CliOptions = { spaceId: null, json: false }

  for (const arg of argv) {
    if (arg === '--json') {
      options.json = true
    } else if (arg.startsWith('--')) {
      throw new Error(`Flag desconocida: ${arg}`)
    } else if (!options.spaceId) {
      options.spaceId = arg.trim()
    }
  }

  return options
}

const formatHuman = (result: NotionOnboardingReadiness): string => {
  const lines: string[] = []

  lines.push(`=== Notion Onboarding Preflight · space ${result.spaceId} ===`)
  lines.push(`Verificado: ${result.checkedAt}`)
  lines.push('')

  for (const check of result.checks) {
    const tag = check.critical ? '' : ' (advisory)'

    lines.push(`${STATUS_GLYPH[check.status]} ${check.label}${tag}`)
    lines.push(`    ${check.detail}`)
  }

  lines.push('')
  lines.push(`readyToOnboard: ${result.readyToOnboard ? 'SÍ ✓' : 'NO ✗'}`)
  lines.push(result.summary)

  return lines.join('\n')
}

const main = async () => {
  const options = parseArgs(process.argv.slice(2))

  if (!options.spaceId) {
    process.stderr.write('Uso: pnpm notion:onboarding-preflight <spaceId> [--json]\n')
    process.exit(2)
  }

  const result = await getNotionOnboardingReadiness(options.spaceId)

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
  } else {
    process.stdout.write(`${formatHuman(result)}\n`)
  }

  // Read-only: exit 0 siempre verde-o-rojo; exit 1 solo si NO está listo, para
  // que CI/operador pueda gatear con el exit code sin parsear el output.
  process.exit(result.readyToOnboard ? 0 : 1)
}

main().catch(error => {
  process.stderr.write(`[notion:onboarding-preflight] error: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(2)
})
