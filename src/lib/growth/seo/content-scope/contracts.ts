/**
 * TASK-2033 — alcance de contenido de una organización: qué parte de su sitio trabaja Efeonce.
 *
 * Es CONFIGURACIÓN versionada (append-only) del módulo SEO, anclada a la organización igual que la
 * propiedad de Search Console. Los readers dueños la aplican sobre la página de cada fila; quien la
 * consume (Efeonce Insights) sólo la declara y la sella, nunca filtra filas por su cuenta.
 *
 * Browser-safe: contrato, validación y matcher puros, sin I/O. El fragmento SQL equivalente vive en
 * `./sql.ts` y la paridad entre ambos se prueba contra PostgreSQL real.
 *
 * Pertenencia: una ruta está en el alcance si es igual a una regla `exact`, igual a una regla `prefix`
 * o empieza por `prefix + '/'`. `/articulos-viejos` NO pertenece a `/articulos`. La ruta se compara sin
 * esquema, host, query, fragmento ni barra final; por bytes, distinguiendo mayúsculas.
 */

export const SEO_CONTENT_SCOPE_RULE_KINDS = ['prefix', 'exact'] as const
export type SeoContentScopeRuleKind = (typeof SEO_CONTENT_SCOPE_RULE_KINDS)[number]

export interface SeoContentScopeRuleV1 {
  kind: SeoContentScopeRuleKind
  /** Ruta normalizada: empieza por `/`, sin barra final, sin query ni fragmento. */
  path: string
}

export interface SeoContentScopeV1 {
  organizationId: string
  version: number
  /** Nombre legible del contenido medido («Artículos, tutoriales e inspiración»). Sin cifras ni dominios. */
  label: string
  /** Orden canónico (tipo, ruta en bytes). Cero reglas = sitio completo. */
  rules: SeoContentScopeRuleV1[]
  createdAt: string
}

/** Lo mínimo que un reader necesita para recortar: las reglas. */
export interface SeoContentScopeFilter {
  rules: readonly SeoContentScopeRuleV1[]
}

export const SEO_CONTENT_SCOPE_MAX_RULES = 50
export const SEO_CONTENT_SCOPE_MAX_PATH_LENGTH = 200
/**
 * La etiqueta se imprime dentro de «Qué mide este informe», en la portada: 60 caracteres es lo que deja espacio al
 * resto de la frase. La columna admite más (120) para no exigir una migración si el molde cambia.
 */
export const SEO_CONTENT_SCOPE_MAX_LABEL_LENGTH = 60

/**
 * Ruta comparable de una URL o de una ruta: sin esquema ni host, sin query, sin fragmento, sin barras
 * finales. La raíz queda como cadena vacía. MISMAS operaciones de texto que `./sql.ts` (nunca `new URL`,
 * que recodifica caracteres y rompería la paridad con PostgreSQL).
 */
export const contentScopePathOf = (urlOrPath: string): string =>
  urlOrPath
    .replace(/^https?:\/\/[^/]+/, '')
    .split('?')[0]!
    .split('#')[0]!
    .replace(/\/+$/, '')

const byBytes = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/** Orden canónico y sin duplicados: dos listas con las mismas reglas son la misma versión. */
export const canonicalContentScopeRules = (rules: readonly SeoContentScopeRuleV1[]): SeoContentScopeRuleV1[] => {
  const seen = new Set<string>()
  const out: SeoContentScopeRuleV1[] = []

  for (const rule of rules) {
    const key = `${rule.kind}\u0000${rule.path}`

    if (seen.has(key)) continue
    seen.add(key)
    out.push({ kind: rule.kind, path: rule.path })
  }

  return out.sort((a, b) => byBytes(a.kind, b.kind) || byBytes(a.path, b.path))
}

/** Clave de igualdad de un alcance (reglas canónicas + etiqueta): decide si fijarlo escribe una versión. */
export const contentScopeKey = (label: string, rules: readonly SeoContentScopeRuleV1[]): string =>
  JSON.stringify({ label: label.trim(), rules: canonicalContentScopeRules(rules) })

export type ParseContentScopeRulesResult =
  | { ok: true; rules: SeoContentScopeRuleV1[] }
  | { ok: false; errors: string[] }

const isKind = (value: unknown): value is SeoContentScopeRuleKind =>
  typeof value === 'string' && (SEO_CONTENT_SCOPE_RULE_KINDS as readonly string[]).includes(value)

/**
 * Valida reglas que vienen de fuera (CLI, API, la columna JSON). No corrige en silencio: una ruta con
 * query, con barra final o sin `/` inicial se RECHAZA, porque «arreglarla» cambiaría lo que el operador
 * creyó declarar.
 */
export const parseSeoContentScopeRules = (input: unknown): ParseContentScopeRulesResult => {
  if (!Array.isArray(input)) return { ok: false, errors: ['Las reglas deben ser una lista.'] }

  if (input.length > SEO_CONTENT_SCOPE_MAX_RULES) {
    return { ok: false, errors: [`Un alcance admite hasta ${SEO_CONTENT_SCOPE_MAX_RULES} reglas; llegaron ${input.length}.`] }
  }

  const errors: string[] = []
  const rules: SeoContentScopeRuleV1[] = []

  input.forEach((raw, index) => {
    const where = `Regla ${index + 1}`

    if (typeof raw !== 'object' || raw === null) {
      errors.push(`${where}: debe ser un objeto con tipo y ruta.`)

      return
    }

    const { kind, path } = raw as { kind?: unknown; path?: unknown }

    if (!isKind(kind)) {
      errors.push(`${where}: el tipo debe ser uno de ${SEO_CONTENT_SCOPE_RULE_KINDS.join(', ')}.`)

      return
    }

    if (typeof path !== 'string' || path.length === 0) {
      errors.push(`${where}: falta la ruta.`)

      return
    }

    if (path.length > SEO_CONTENT_SCOPE_MAX_PATH_LENGTH) errors.push(`${where}: la ruta supera ${SEO_CONTENT_SCOPE_MAX_PATH_LENGTH} caracteres.`)
    if (!path.startsWith('/')) errors.push(`${where}: la ruta debe empezar por «/» (sin dominio): «${path}».`)
    if (path === '/') errors.push(`${where}: «/» sería el sitio completo; para medir todo el sitio se fija un alcance sin reglas.`)
    if (path.length > 1 && path.endsWith('/')) errors.push(`${where}: la ruta no lleva barra final: «${path}».`)
    if (/[?#\s]/.test(path)) errors.push(`${where}: la ruta no lleva query, fragmento ni espacios: «${path}».`)

    rules.push({ kind, path })
  })

  return errors.length > 0 ? { ok: false, errors } : { ok: true, rules: canonicalContentScopeRules(rules) }
}

/** `true` cuando el alcance recorta de verdad (tiene al menos una regla). */
export const isContentScopeActive = (scope: SeoContentScopeFilter | null | undefined): scope is SeoContentScopeFilter =>
  !!scope && scope.rules.length > 0

/** Pertenencia de una URL (o ruta) al alcance. Sin reglas, nada pertenece: quien no recorta no llama aquí. */
export const isPathInContentScope = (urlOrPath: string, rules: readonly SeoContentScopeRuleV1[]): boolean => {
  const path = contentScopePathOf(urlOrPath)

  return rules.some(rule => path === rule.path || (rule.kind === 'prefix' && path.startsWith(`${rule.path}/`)))
}
