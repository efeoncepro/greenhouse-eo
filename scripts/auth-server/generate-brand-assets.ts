/**
 * Genera isotipo, estilos y fuentes/licencias para el runtime sin `public/` de Cloud Run.
 * Fuentes: SVG institucional, tokens portables AXIS y brand pack local sin modificar.
 * `pages/brand-assets.test.ts` comprueba drift; GVC valida el comportamiento visual.
 *
 *   pnpm auth-server:brand-assets:generate
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { sanitizeBrandSvg } from './brand-svg'
import { createAuthServerStyles } from './styles'
import { renderAuthFontAssetsModule } from './generate-font-assets'
import { generateStepUpController } from './step-up-controller-build'

const ROOT = process.cwd()
const SOURCE = join(ROOT, 'public/branding/SVG/isotipo-full-efeonce.svg')
/** Logotipo institucional en negativo: es el que va sobre el panel oscuro del acceso (TASK-1835). */
const LOGOTYPE_SOURCE = join(ROOT, 'public/branding/logo-negative.svg')
/** Isotipo oficial de Claude, del registro curado del repo: NUNCA redibujado a mano. */
const CLAUDE_MARK_SOURCE = join(ROOT, 'public/images/logos/axis/claude-isologo.svg')
const TARGET = join(ROOT, 'src/lib/auth-server/oauth/pages/efeonce-isotipo.generated.ts')

const readBrandSvg = (path: string): string => sanitizeBrandSvg(readFileSync(path, 'utf8'))

const svg = readBrandSvg(SOURCE)
const logotype = readBrandSvg(LOGOTYPE_SOURCE)
const claudeMark = readBrandSvg(CLAUDE_MARK_SOURCE)

const output = `// GENERATED FILE — no editar a mano. Fuentes: public/branding/SVG/isotipo-full-efeonce.svg
// y public/branding/logo-negative.svg
// Regenerar: pnpm auth-server:brand-assets:generate (TASK-1829 / TASK-1835)

export const EFEONCE_ISOTIPO_SVG = ${JSON.stringify(svg)}

export const EFEONCE_LOGOTYPE_NEGATIVE_SVG = ${JSON.stringify(logotype)}

/** Marca de tercero para la ficha de aplicación del consentimiento (ver client-marks.ts). */
export const CLIENT_MARK_CLAUDE_SVG = ${JSON.stringify(claudeMark)}
`

writeFileSync(TARGET, output)
console.log(`[auth-server] brand asset generated → ${TARGET} (${svg.length} chars)`)

const stylesSource = readFileSync(join(ROOT, 'scripts/auth-server/styles.ts'), 'utf8')
const stylesTemplate = stylesSource.slice(stylesSource.indexOf('  return `') + 10)

if (stylesTemplate.split('`').length - 1 !== 1) {
  console.error(
    '[auth-server] styles.ts: hay un backtick dentro del template literal del CSS. Cierra la plantilla ' +
      'y el resto se evalúa como código. Los comentarios CSS de ese archivo van SIN backticks.'
  )
  process.exit(1)
}

const stylesTarget = join(ROOT, 'src/lib/auth-server/oauth/pages/styles.generated.ts')
const styles = createAuthServerStyles()

writeFileSync(stylesTarget, `// GENERATED FILE — canonical AXIS tokens via scripts/auth-server/styles.ts\n// Regenerate: pnpm auth-server:brand-assets:generate\n\nexport const AUTH_SERVER_STYLES = ${JSON.stringify(styles)}\n`)
console.log(`[auth-server] styles generated → ${stylesTarget} (${styles.length} chars)`)

const fontsTarget = join(ROOT, 'src/lib/auth-server/oauth/pages/fonts.generated.ts')

writeFileSync(fontsTarget, renderAuthFontAssetsModule(ROOT))
console.log(`[auth-server] fonts and licenses generated → ${fontsTarget}`)

void generateStepUpController().catch(() => {
  console.error('[auth-server] step-up controller generation failed')
  process.exitCode = 1
})
