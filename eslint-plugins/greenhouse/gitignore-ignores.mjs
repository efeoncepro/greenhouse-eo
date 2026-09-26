// `.gitignore` → ignores de ESLint flat config.
//
// ESLint 9 NO lee `.gitignore`. En un checkout compartido eso convierte cualquier artefacto que git
// ya ignora —copias mutantes de un arnés, scripts de scratch, salidas generadas— en errores que
// bloquean el pre-push de todas las sesiones. Pasó cinco veces: `ai-generations/**`, `generated/**`,
// `.captures/**`, `.tmp/**` y, el 2026-09-25, una copia `.componer-cta@mut-*.regresion.mjs` que
// `.gitignore` ya excluía. Cada vez se cerró sumando un patrón al `ignores` global; esto cierra la
// clase: lo que git no versiona, ESLint no lo juzga.
//
// Conversión equivalente a `includeIgnoreFile` de `@eslint/compat` (sin sumar la dependencia):
// - un patrón sin `/`, o con `/` sólo al final, vale en cualquier profundidad → `**/<patrón>`;
// - un `/` inicial ancla a la raíz y se quita;
// - `dir/**` también cubre lo que hay dentro (`dir/**/*`);
// - `!` niega; `{` y `(` se escapan porque en minimatch son sintaxis y en gitignore son literales.
import { readFileSync } from 'node:fs'

// `{` y `(` sin escapar (fuera de un escape previo) → se les antepone `\\`.
const MINIMATCH_LITERALS = new RegExp(String.raw`(?=((?:\\.|[^{(])*))\1([{(])`, 'guy')

export const convertGitignorePattern = pattern => {
  const isNegated = pattern.startsWith('!')
  const negatedPrefix = isNegated ? '!' : ''
  const body = (isNegated ? pattern.slice(1) : pattern).trimEnd()

  if (['', '**', '/**', '**/'].includes(body)) return `${negatedPrefix}${body}`

  const firstSlash = body.indexOf('/')
  const anywherePrefix = firstSlash < 0 || firstSlash === body.length - 1 ? '**/' : ''
  const withoutLeadingSlash = firstSlash === 0 ? body.slice(1) : body
  const escaped = withoutLeadingSlash.replaceAll(MINIMATCH_LITERALS, '$1\\$2')
  const insideSuffix = body.endsWith('/**') ? '/*' : ''

  return `${negatedPrefix}${anywherePrefix}${escaped}${insideSuffix}`
}

export const parseGitignore = content =>
  content
    .split(/\r?\n/u)
    .filter(line => line.trim() !== '' && !line.startsWith('#'))
    .map(convertGitignorePattern)

/** Bloque de flat config con los patrones de un `.gitignore`. Sin archivo, no ignora nada. */
export const gitignoreIgnores = gitignorePath => {
  let content = ''

  try {
    content = readFileSync(gitignorePath, 'utf8')
  } catch {
    return { name: 'greenhouse/gitignore', ignores: [] }
  }

  return { name: 'greenhouse/gitignore', ignores: parseGitignore(content) }
}
