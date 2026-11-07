/**
 * Escáner de referencias a feature flags (`*_ENABLED`) en código fuente.
 *
 * Fuente única que usa `scripts/ci/feature-flags-audit.mjs` para decidir qué flags tienen
 * lector real y en qué archivos. Ese mapa alimenta dos cosas que no son cosméticas: el reporte
 * de «env var muerta en Vercel» y, sobre todo, el gate ISSUE-150, que hace `exit 1` cuando un
 * flag está prendido en Production sin su código lector en `main`. Un flag que este escáner no
 * ve queda FUERA de ese gate sin que nada falle.
 *
 * Reconoce TRES formas de leer un flag. Sobre-incluir es preferible a sub-incluir: un falso
 * positivo cuesta registrar un flag de más en el ledger; un falso negativo es un flag
 * fail-closed vivo en producción sobre código que producción no tiene (ISSUE-150).
 *
 * 1. Acceso por punto sobre `process.env`: `process.env.FLAG_ENABLED`.
 * 2. Literal: `process.env['FLAG_ENABLED']`, o `env[FLAG_CONST]` con `const FLAG_CONST =
 *    'FLAG_ENABLED'`. El patrón de `src/lib/growth/seo/flags.ts` (2026-08-29: 91 callsites).
 * 3. Acceso por punto sobre un env INYECTADO: `(env: EnvSource = process.env) => env.FLAG_ENABLED`.
 *    Es el patrón de `src/lib/efeonce-insights/flags.ts`, que inyecta el env para poder
 *    probarlo. No nombra el flag como string ni lo lee de `process.env`, así que las formas
 *    1 y 2 no lo ven. Caso fuente 2026-11-07: `INSIGHTS_GENERATION_ENABLED`,
 *    `INSIGHTS_ISSUANCE_ENABLED` y `INSIGHTS_AUTHORING_AI_ENABLED` salían como «env var muerta»
 *    estando prendidos en Production con lector real.
 *
 * La forma 3 subsume a la 1 (cualquier `.FLAG_ENABLED`); se mantienen separadas para que el
 * contrato quede legible y cada forma tenga su caso en la prueba.
 */

const PROCESS_ENV_DOT_RE = /process\.env\.((?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED)\b/g
const LITERAL_RE = /['"`]((?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED)['"`]/g
const INJECTED_ENV_DOT_RE = /[\w$\])?]\.((?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED)\b/g

export const FLAG_NAME_RE = /^(?:NEXT_PUBLIC_)?[A-Z0-9_]+_ENABLED$/

const PATTERNS = [PROCESS_ENV_DOT_RE, LITERAL_RE, INJECTED_ENV_DOT_RE]

/**
 * Devuelve los nombres de flag que el texto lee, sin duplicados.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
export const extractFlagReferences = text => {
  const found = new Set()

  for (const re of PATTERNS) {
    re.lastIndex = 0
    let m

    while ((m = re.exec(text)) !== null) {
      if (FLAG_NAME_RE.test(m[1])) found.add(m[1])
    }
  }

  return found
}
