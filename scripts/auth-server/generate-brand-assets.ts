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
import { generateLoginController } from './login-controller-build'

const ROOT = process.cwd()
const SOURCE = join(ROOT, 'public/branding/SVG/isotipo-full-efeonce.svg')
/** Logotipo institucional en negativo: es el que va sobre el panel oscuro del acceso (TASK-1835). */
const LOGOTYPE_SOURCE = join(ROOT, 'public/branding/logo-negative.svg')

/**
 * Isotipos oficiales de las aplicaciones cliente, del registro curado del repo
 * (`public/images/logos/axis/`): NUNCA redibujados a mano.
 */
const CLIENT_MARK_SOURCES = {
  CLAUDE: 'public/images/logos/axis/claude-isologo.svg',
  GPT: 'public/images/logos/axis/gpt-isotype.svg',
  GEMINI: 'public/images/logos/axis/gemini-isotype.svg'
} as const

const TARGET = join(ROOT, 'src/lib/auth-server/oauth/pages/efeonce-isotipo.generated.ts')

const readBrandSvg = (path: string): string => sanitizeBrandSvg(readFileSync(path, 'utf8'))

const svg = readBrandSvg(SOURCE)
const logotype = readBrandSvg(LOGOTYPE_SOURCE)

/**
 * Las marcas de terceros se embeben TAL CUAL: `sanitizeBrandSvg` está hecho para los SVG de Efeonce
 * (una sola regla `.cls-1` en un `<defs><style>`) y acá haría daño — quita `<defs>` e `id`, que es
 * justo de lo que dependen los `clip-path="url(#…)"` de Gemini. Traen sus fills explícitos, así que
 * no necesitan normalización; lo único que se exige es que NO traigan `<style>`, porque la CSP del
 * emisor lo bloquearía por hash y la figura saldría negra.
 */
const readClientMarkSvg = (relativePath: string): string => {
  const svg = readFileSync(join(ROOT, relativePath), 'utf8').replace(/^<\?xml[^>]*>\s*/u, '').trim()

  if (/<style\b/u.test(svg)) {
    console.error(`[auth-server] ${relativePath}: la marca trae un <style> interno; la CSP lo bloquea y saldría negra.`)
    process.exit(1)
  }

  return svg
}

const clientMarks = Object.fromEntries(
  Object.entries(CLIENT_MARK_SOURCES).map(([key, relativePath]) => [key, readClientMarkSvg(relativePath)])
) as Record<keyof typeof CLIENT_MARK_SOURCES, string>

const output = `// GENERATED FILE — no editar a mano. Fuentes: public/branding/SVG/isotipo-full-efeonce.svg
// y public/branding/logo-negative.svg
// Regenerar: pnpm auth-server:brand-assets:generate (TASK-1829 / TASK-1835)

export const EFEONCE_ISOTIPO_SVG = ${JSON.stringify(svg)}

export const EFEONCE_LOGOTYPE_NEGATIVE_SVG = ${JSON.stringify(logotype)}

/** Marcas de terceros para la ficha de aplicación del consentimiento (ver client-marks.ts). */
export const CLIENT_MARK_CLAUDE_SVG = ${JSON.stringify(clientMarks.CLAUDE)}

export const CLIENT_MARK_GPT_SVG = ${JSON.stringify(clientMarks.GPT)}

export const CLIENT_MARK_GEMINI_SVG = ${JSON.stringify(clientMarks.GEMINI)}
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

void generateLoginController().catch(() => {
  console.error('[auth-server] login controller generation failed')
  process.exitCode = 1
})
