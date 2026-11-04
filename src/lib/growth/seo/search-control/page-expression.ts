import type { SeoContentScopeRuleV1 } from '../content-scope/contracts'

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * TASK-2033 / ISSUE-191 — expresión de página para la API de Search Console (RE2) con la MISMA semántica que
 * `isPathInContentScope`: la ruta, sin query ni fragmento ni barras finales, es la regla (`exact`) o empieza por la
 * regla seguida de `/` (`prefix`). Sin alcance, todo el host. El recorte lo hace Google: quien la usa no filtra filas.
 *
 * `includeSubdomains`: una propiedad de dominio pedida por su dominio raíz mide todos sus hosts (`berel.com`,
 * `www.berel.com`), como la serie diaria de Search Console de la propiedad.
 *
 * La paridad con el matcher se prueba ejercitando las DOS reglas sobre las mismas URLs
 * (`organic-traffic-value/__tests__/page-expression.test.ts`), nunca comparando el texto de la expresión.
 */
export const searchConsolePageExpression = (
  hostname: string,
  rules?: readonly SeoContentScopeRuleV1[],
  options: { includeSubdomains?: boolean } = {}
): string => {
  const host = `^https?://${options.includeSubdomains ? '([^/?#]+\\.)?' : ''}${escapeRegex(hostname)}`

  if (!rules || rules.length === 0) return `${host}/`

  const alternatives = rules.map(rule =>
    rule.kind === 'prefix' ? `${escapeRegex(rule.path)}(/.*|[?#].*)?$` : `${escapeRegex(rule.path)}/*([?#].*)?$`
  )

  return `${host}(${alternatives.join('|')})`
}

/**
 * Host que se mide de una propiedad de Search Console: la de dominio (`sc-domain:x.com`) mide el dominio y sus
 * subdominios; la de prefijo de URL (`https://blog.x.com/`), su host exacto.
 */
export const searchConsoleHostOf = (siteUrl: string): { hostname: string; includeSubdomains: boolean } => {
  if (siteUrl.startsWith('sc-domain:')) return { hostname: siteUrl.slice('sc-domain:'.length).toLowerCase(), includeSubdomains: true }

  return { hostname: new URL(siteUrl).hostname, includeSubdomains: false }
}
