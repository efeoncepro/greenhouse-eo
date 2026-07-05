#!/usr/bin/env node
/**
 * motion-overlay-guard — anti-rot contract for the `motion-design` overlay skill.
 *
 * The Greenhouse motion overlay (`.claude/skills/motion-design/SKILL.md` +
 * `.codex/skills/motion-design/SKILL.md`) routes agents to the REAL motion
 * system by name (imports, files, npm scripts, lint rule). If any of those get
 * renamed/moved, the skill silently rots — it keeps telling agents to import a
 * symbol that no longer exists. This guard pins that contract mechanically.
 *
 * It is NOT a runtime test of motion behavior — it asserts that every concrete
 * repo reference the overlay depends on still resolves. Run it after touching
 * `src/components/greenhouse/motion/**`, the motion barrel, or the overlay.
 *
 *   pnpm skills:motion-guard          # exits non-zero on drift
 *
 * When it fails: either the rename was intentional (update the overlay + this
 * contract in the same PR) or accidental (restore the symbol).
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const rel = p => join(ROOT, p)

// ── The pinned contract: what the overlay skill promises exists ──────────────

/** Files the overlay cites by path — must exist. */
const REQUIRED_FILES = [
  'src/components/greenhouse/motion/index.ts',
  'src/components/greenhouse/motion/Motion.tsx',
  'src/components/greenhouse/motion/variants.ts',
  'src/components/greenhouse/motion/kinds.ts',
  'src/components/greenhouse/motion/ViewTransitionLink.tsx',
  'src/components/greenhouse/motion/core/tokens.ts',
  'src/components/greenhouse/motion/core/reduced-motion.ts',
  'src/components/greenhouse/motion/core/use-greenhouse-gsap.ts',
  'src/components/greenhouse/motion/core/tokens.test.ts',
  'src/components/theme/motion-tokens.ts',
  'src/lib/motion/view-transition.ts',
  'src/hooks/useReducedMotion.ts',
  'src/components/greenhouse/primitives/composition-shell/composition-shell-motion.ts',
  'src/components/greenhouse/primitives/card-density/card-density-motion.ts',
  'src/components/greenhouse/primitives/GreenhouseThinkingBeat.tsx',
  'eslint-plugins/greenhouse/rules/no-direct-gsap-in-views.mjs',
  'docs/ui/motion/MOTION_TEMPLATE.md',
  'DESIGN.md',
  '.claude/skills/motion-design/SKILL.md'
]

/** Named symbols the overlay tells agents to import from the motion barrel. */
const REQUIRED_BARREL_EXPORTS = {
  'src/components/greenhouse/motion/index.ts': [
    'Motion',
    'MOTION_DURATION_MS',
    'MOTION_DURATION_S',
    'MOTION_EASE',
    'motionCss',
    'motionGsap',
    'cssCubicBezier',
    'useGreenhouseGSAP',
    'prefersReducedMotion',
    'MOTION_MEDIA_CONDITIONS',
    'MOTION_KIND_TO_VARIANT',
    'resolveVariant',
    'ViewTransitionLink'
  ],
  'src/lib/motion/view-transition.ts': ['startViewTransition', 'supportsViewTransitions'],
  'src/components/greenhouse/primitives/composition-shell/composition-shell-motion.ts': [
    'compositionRegionReveal',
    'compositionInterruptibleLayoutTransition',
    'COMPOSITION_STAGGER_STEP_S'
  ],
  'src/components/greenhouse/primitives/card-density/card-density-motion.ts': [
    'cardDensityLayoutTransition',
    'cardDensityRevealTransition',
    'cardAssembleTransition'
  ]
}

/** npm scripts the overlay tells agents to run. */
const REQUIRED_NPM_SCRIPTS = ['ui:motion-check', 'fe:capture:micro', 'fe:capture:diff', 'fe:capture:review']

/** Overlay copies that must stay in Claude/Codex parity. */
const OVERLAY_COPIES = ['.claude/skills/motion-design/SKILL.md', '.codex/skills/motion-design/SKILL.md']

// ── Checks ───────────────────────────────────────────────────────────────────

const errors = []

for (const f of REQUIRED_FILES) {
  if (!existsSync(rel(f))) errors.push(`MISSING FILE: ${f} (overlay cites it)`)
}

/** Strip line + block comments so a symbol only mentioned in prose can't pass. */
const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

for (const [file, symbols] of Object.entries(REQUIRED_BARREL_EXPORTS)) {
  if (!existsSync(rel(file))) continue // already reported by REQUIRED_FILES
  const code = stripComments(readFileSync(rel(file), 'utf8'))

  for (const sym of symbols) {
    if (!new RegExp(`\\b${sym}\\b`).test(code)) {
      errors.push(`MISSING EXPORT: ${sym} not found in ${file} (overlay tells agents to import it)`)
    }
  }
}

const pkg = JSON.parse(readFileSync(rel('package.json'), 'utf8'))

for (const s of REQUIRED_NPM_SCRIPTS) {
  if (!pkg.scripts?.[s]) errors.push(`MISSING NPM SCRIPT: "${s}" (overlay §10 tells agents to run it)`)
}

// Lint-rule registration
const eslintCfg = readFileSync(rel('eslint.config.mjs'), 'utf8')

if (!/no-direct-gsap-in-views/.test(eslintCfg)) {
  errors.push('LINT RULE UNREGISTERED: greenhouse/no-direct-gsap-in-views not referenced in eslint.config.mjs')
}

// Parity between overlay copies (headline anti-drift: both must exist)
for (const c of OVERLAY_COPIES) {
  if (!existsSync(rel(c))) errors.push(`OVERLAY PARITY: ${c} missing (Claude/Codex overlays must both exist)`)
}

// ── Report ───────────────────────────────────────────────────────────────────

if (errors.length) {
  console.error('✗ motion-overlay-guard: the motion-design overlay is out of sync with the repo.\n')
  for (const e of errors) console.error('  · ' + e)
  console.error(
    `\n${errors.length} issue(s). Fix the rename in the overlay (${OVERLAY_COPIES.join(' + ')}) ` +
      'and this contract in the same PR, or restore the symbol.'
  )
  process.exit(1)
}

console.log(
  `✓ motion-overlay-guard: ${REQUIRED_FILES.length} files, ` +
    `${Object.values(REQUIRED_BARREL_EXPORTS).flat().length} exports, ` +
    `${REQUIRED_NPM_SCRIPTS.length} scripts, lint rule + overlay parity all resolve.`
)
