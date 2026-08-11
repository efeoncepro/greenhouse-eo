/**
 * TASK-1685 — Baseline verificable de la visibilidad del portal cliente.
 *
 * Responde las dos preguntas que la task exige medir **antes y después** de cambiar la
 * semántica de la puerta:
 *
 *   1. **¿Qué superficies alcanza cada organización por módulo contratado?** Los "24 pares"
 *      de `ISSUE-148`. El invariante duro de la task es que este conjunto **no puede
 *      encogerse**: ningún cliente pierde una superficie que su organización contrató.
 *   2. **¿El menú y la puerta coinciden?** Delega en la señal canónica
 *      `identity.client_portal.menu_gate_divergence` en vez de replicar sus reglas — si el
 *      script tuviera su propia copia, sería la tercera fuente de verdad justo en el
 *      verificador de que no haya dos.
 *
 * **Los conteos se DERIVAN, no se fijan.** No hay ningún "esperado 24" ni "esperado 0"
 * hardcodeado: un assignment nuevo cambia legítimamente el primer número, y un gate que
 * exigiera el literal fallaría por hacer lo correcto. El script imprime el estado; comparar
 * dos corridas es trabajo del operador o del diff.
 *
 * Read-only puro. Ninguna escritura, ninguna mutación.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/identity/client-portal-visibility-baseline.ts
 *
 * Requiere el proxy de Cloud SQL arriba (`pnpm pg:connect`).
 */

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

import { query } from '@/lib/db'

interface PairRow {
  email: string
  organization_name: string | null
  view_code: string
  [key: string]: unknown
}

/**
 * El filtro replica exactamente el del resolver canónico
 * (`resolveClientPortalModulesForOrganization`): assignment vigente, módulo no deprecado,
 * status activo o piloto, y piloto no expirado. Si el resolver cambia sus predicados, este
 * script tiene que seguirlo — por eso van comentados uno a uno.
 */
const PAIRS_SQL = `
  WITH active_client_users AS (
    SELECT user_id, email, organization_id, organization_name
    FROM greenhouse_serving.session_360
    WHERE tenant_type = 'client' AND active AND organization_id IS NOT NULL
  ), org_module_views AS (
    SELECT a.organization_id, unnest(m.view_codes) AS view_code
    FROM greenhouse_client_portal.module_assignments a
    JOIN greenhouse_client_portal.modules m ON m.module_key = a.module_key
    WHERE a.effective_to IS NULL          -- assignment vigente
      AND m.effective_to IS NULL          -- módulo no deprecado
      AND a.status IN ('active','pilot')
      AND (a.expires_at IS NULL OR a.expires_at > now())
  )
  SELECT u.email, u.organization_name, v.view_code
  FROM active_client_users u
  JOIN org_module_views v ON v.organization_id = u.organization_id
  ORDER BY u.organization_name NULLS LAST, u.email, v.view_code
`

const main = async () => {
  const pairs = await query<PairRow>(PAIRS_SQL)

  console.log('\n═══ Superficies alcanzadas por módulo contratado (pares usuario × vista) ═══\n')

  for (const pair of pairs) {
    console.log(`  ${pair.organization_name ?? '(sin organización)'} · ${pair.email} · ${pair.view_code}`)
  }

  const organizations = new Set(pairs.map(pair => pair.organization_name ?? 'null'))

  console.log(`\n  total pares: ${pairs.length}`)
  console.log(`  organizaciones con al menos una superficie: ${organizations.size}`)
  console.log('\n  ⚠️  Este conjunto NUNCA puede encogerse entre dos corridas salvo que un')
  console.log('      assignment se haya dado de baja a propósito. Si encogió sin eso, un')
  console.log('      cliente perdió una superficie que contrató.')

  const { getClientPortalMenuGateDivergenceSignal } = await import(
    '@/lib/reliability/queries/client-portal-menu-gate-divergence'
  )

  const signal = await getClientPortalMenuGateDivergenceSignal()

  console.log('\n═══ Divergencia menú ↔ puerta (señal canónica) ═══\n')
  console.log(`  severidad : ${signal.severity}`)
  console.log(`  resumen   : ${signal.summary}\n`)

  for (const evidence of signal.evidence ?? []) {
    console.log(`  ${evidence.label}: ${evidence.value}`)
  }

  console.log('')
  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
