#!/usr/bin/env node
/**
 * TASK-1389 — Nav Budget Gate.
 *
 * Mide el rail INTERNO contra el presupuesto del Contrato de Asignación de
 * Superficies (docs/architecture/agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md).
 *
 * Cómo mide: NO parsea el fuente de VerticalMenu.tsx (imperativo/condicional
 * → falsos positivos). Ejecuta el test de presupuesto, que renderiza el
 * componente con la sesión superadmin y evalúa el `menuData` REAL con el
 * evaluador compartido `src/lib/navigation/nav-budget.ts`. Además cross-checkea
 * el manifest de reachability: una ruta `/my/*` con `surface: 'sidebar'` es
 * violación.
 *
 * Severidad: nació directo en `error` — la condición de promoción de la spec
 * (TASK-1388 verde + sidebar bajo el tope) estaba cumplida y MEDIDA al
 * implementarlo (0 violaciones, precedente TASK-1680). `--warn` degrada a
 * advisory (exit 0 con reporte) si alguna emergencia lo exige.
 *
 * Usage:
 *   pnpm nav:budget            # error mode (default)
 *   pnpm nav:budget --warn     # advisory
 */

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..', '..')

const WARN_MODE = process.argv.includes('--warn')
const BUDGET_TEST = 'src/components/layout/vertical/VerticalMenu.budget.test.tsx'
const MANIFEST = join(REPO_ROOT, 'src', 'lib', 'navigation', 'route-reachability-manifest.ts')

const findings = []

// ── 1. Presupuesto del árbol real (vía el test del evaluador) ────────────────
const result = spawnSync('pnpm', ['vitest', 'run', BUDGET_TEST], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  shell: process.platform === 'win32'
})

if (result.status !== 0) {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`

  // El expect del test imprime las violaciones como JSON en su mensaje.
  findings.push(
    'El árbol real del rail interno viola el presupuesto (detalle en el output del test de abajo).'
  )
  console.error(output.split('\n').slice(-60).join('\n'))
}

// ── 2. Cross-check del manifest: /my/* jamás con surface sidebar ─────────────
const manifestSource = readFileSync(MANIFEST, 'utf8')
const declRe = /route:\s*'(\/my\/[^']*)'[\s\S]{0,400}?surface:\s*'([a-z-]+)'/g

let match

while ((match = declRe.exec(manifestSource)) !== null) {
  const [, route, surface] = match

  if (surface === 'sidebar') {
    findings.push(
      `Manifest: ${route} declara surface: 'sidebar' — lo personal vive en el avatar (Contrato de Superficies).`
    )
  }
}

// ── Veredicto ────────────────────────────────────────────────────────────────
if (findings.length) {
  const label = WARN_MODE ? 'WARN' : 'BLOCK'

  console.error(`\nnav-budget-gate: ${label} (${findings.length} finding(s))`)
  for (const finding of findings) console.error(`- ${finding}`)
  console.error(
    '\nContrato + presupuesto: docs/architecture/agent-invariants/NAVIGATION_SURFACE_ALLOCATION_CONTRACT.md'
  )
  process.exit(WARN_MODE ? 0 : 1)
}

console.log('✓ nav-budget-gate: el rail interno respeta el presupuesto (árbol real + manifest).')
