/**
 * Genera isotipo, estilos y fuentes/licencias para el runtime sin `public/` de Cloud Run.
 * Fuentes: SVG institucional, tokens portables AXIS y brand pack local sin modificar.
 * `pages/brand-assets.test.ts` comprueba drift; GVC valida el comportamiento visual.
 *
 *   pnpm auth-server:brand-assets:generate
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { createAuthServerStyles } from './styles'
import { renderAuthFontAssetsModule } from './generate-font-assets'
import { generateStepUpController } from './step-up-controller-build'

const ROOT = process.cwd()
const SOURCE = join(ROOT, 'public/branding/SVG/isotipo-full-efeonce.svg')
const TARGET = join(ROOT, 'src/lib/auth-server/oauth/pages/efeonce-isotipo.generated.ts')

const svg = readFileSync(SOURCE, 'utf8').replace(/^<\?xml[^>]*>\s*/u, '').trim()

const output = `// GENERATED FILE — no editar a mano. Fuente: public/branding/SVG/isotipo-full-efeonce.svg
// Regenerar: pnpm auth-server:brand-assets:generate (TASK-1829)

export const EFEONCE_ISOTIPO_SVG = ${JSON.stringify(svg)}
`

writeFileSync(TARGET, output)
console.log(`[auth-server] brand asset generated → ${TARGET} (${svg.length} chars)`)

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
