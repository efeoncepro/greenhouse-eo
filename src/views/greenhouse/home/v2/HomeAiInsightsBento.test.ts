import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// ─── TASK-950 Slice 4 — Anti-regresión "Ver todos" CTA flip canonical ──────
//
// Antes (broken): `router.push('/agency/insights')` → 404 sistemático
// (drift TASK-696, descubierto live 2026-05-29 — la ruta nunca existió).
//
// Ahora (TASK-950 V1): `router.push('/nexa/insights')` → list page canonical
// (Slice 1+2+3 ya shipped en develop antes que este Slice 4 flippea el botón).
//
// El test scanea el source code (NO mock React render) — mismo pattern que
// `cron-staging-drift.test.ts` (TASK-775 Slice 5) y `column-parity` family.
// Lightweight (sin dom/router setup) y robusto contra refactor del botón JSX.
//
// Reglas duras del slice ordering canonical TASK-696:
//   - Este test DEBE shippear DESPUÉS del list page existente. Si el list page
//     no existe, el botón apunta a un 404 (peor que antes — esto exactamente
//     reproduce el bug class que cerramos).
//   - El test NUNCA aprueba `/agency/insights` ni patrones que matcheen el
//     legacy 404 broken target. Es un guard mecánico.

const HOME_AI_INSIGHTS_BENTO_PATH = resolve(
  process.cwd(),
  'src/views/greenhouse/home/v2/HomeAiInsightsBento.tsx'
)

describe('HomeAiInsightsBento — "Ver todos" CTA flip canonical (TASK-950 Slice 4)', () => {
  const source = readFileSync(HOME_AI_INSIGHTS_BENTO_PATH, 'utf8')

  it('navega a /nexa/insights (NO al legacy /agency/insights 404)', () => {
    expect(source).toContain("router.push('/nexa/insights')")
    expect(source).not.toContain("router.push('/agency/insights')")
    expect(source).not.toMatch(/['"]\/agency\/insights['"]/)
  })

  it('usa microcopy canonical `GH_NEXA.home_bento_view_all_cta` (cero literals JSX)', () => {
    expect(source).toContain('GH_NEXA.home_bento_view_all_cta')
    expect(source).not.toMatch(/>\s*Ver todos los insights del mes\s*</)
  })

  it('importa GH_NEXA desde el módulo canonical de copy de dominio', () => {
    expect(source).toMatch(/import\s*\{\s*GH_NEXA\s*\}\s*from\s*'@\/lib\/copy\/nexa'/)
    expect(source).not.toMatch(/import\s*\{\s*GH_NEXA\s*\}\s*from\s*'@\/config\/greenhouse-nomenclature'/)
  })
})
