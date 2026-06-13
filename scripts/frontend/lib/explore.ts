/**
 * GVC explore — helpers puros para el modo de autoría (TASK-1098, Capa 2/3).
 *
 * El modo explore observa la página VIVA y le da al agente lo que necesita para
 * autorar un scenario sin adivinar: el árbol de accesibilidad + una lista de
 * elementos direccionables con su `getByRole(...)` sugerido. Es el `spawn →
 * inspect → discard` de microsoft/webwright aplicado a la AUTORÍA — read-only.
 *
 * Estos helpers son puros (sin IO/Playwright) para testearlos sin browser:
 * - `parseAriaSnapshot`: árbol de accesibilidad (texto) → candidatos.
 * - `suggestRoleLocator`: role + name → `getByRole('button', { name: 'X' })`.
 * - `slugifyRoute`: ruta → slug estable para la carpeta de sesión.
 */

/** Roles con los que un agente típicamente interactúa o ancla un scenario. */
export const INTERACTIVE_ROLES = new Set<string>([
  'button',
  'link',
  'tab',
  'textbox',
  'searchbox',
  'combobox',
  'checkbox',
  'radio',
  'switch',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'slider',
  'spinbutton',
  'treeitem'
])

export interface ExploreCandidate {
  role: string
  /** Nombre accesible (vacío para contenedores sin nombre). */
  name: string
  /** Para headings: nivel (h1..h6). */
  level?: number
  /** ¿Es un rol con el que el agente interactúa/ancla? */
  interactive: boolean
  /** Locator user-facing sugerido: `getByRole('button', { name: 'X' })`. */
  suggestedLocator: string
  /**
   * ¿El `getByRole` sugerido resuelve a EXACTAMENTE un nodo? Lo completa el CLI
   * contra la página viva (round-trip de count). `undefined` = no validado.
   */
  unique?: boolean
  /** Bounding box del primer match (lo completa el CLI). */
  boundingBox?: { x: number; y: number; width: number; height: number } | null
}

const ARIA_LINE = /^(\s*)-\s+([a-z][a-z0-9-]*)(?:\s+"((?:[^"\\]|\\.)*)")?(?:\s*\[([^\]]*)\])?/i

const unescapeAriaName = (raw: string): string => raw.replace(/\\(.)/g, '$1')

/**
 * Parsea el texto de `locator.ariaSnapshot()` (formato YAML-ish de Playwright:
 * `- role "name" [attrs]`) a una lista de candidatos. Tolerante: ignora líneas
 * que no matchean (texto suelto, `/url:`, etc.).
 */
export const parseAriaSnapshot = (snapshot: string): ExploreCandidate[] => {
  const candidates: ExploreCandidate[] = []

  for (const line of snapshot.split('\n')) {
    const match = ARIA_LINE.exec(line)

    if (!match) continue

    const role = match[2].toLowerCase()
    const name = match[3] !== undefined ? unescapeAriaName(match[3]) : ''
    const attrs = match[4] ?? ''

    // `text` no es un rol direccionable; los contenedores sin nombre tampoco
    // aportan un locator útil (pero sí headings/landmarks con nombre).
    if (role === 'text') continue

    const levelMatch = /level\s*=\s*(\d+)/.exec(attrs)
    const level = levelMatch ? Number(levelMatch[1]) : undefined
    const interactive = INTERACTIVE_ROLES.has(role)

    candidates.push({
      role,
      name,
      level,
      interactive,
      suggestedLocator: suggestRoleLocator(role, name)
    })
  }

  return candidates
}

const escapeJsString = (value: string): string => value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

/** role + name → locator user-facing canónico (preferido sobre CSS/nth-child). */
export const suggestRoleLocator = (role: string, name: string): string =>
  name ? `getByRole('${role}', { name: '${escapeJsString(name)}' })` : `getByRole('${role}')`

/** Ruta → slug estable (carpeta de sesión `.captures/_explore/<slug>/`). */
export const slugifyRoute = (route: string): string => {
  const slug = route
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  return slug || 'root'
}

export interface ExploreProbeResult {
  /** Selector Playwright probado (`role=button[name="X"]`, CSS, etc.). */
  spec: string
  count: number
  samples: { text: string; boundingBox: { x: number; y: number; width: number; height: number } | null }[]
}

/** Acciones que explore puede *performar* para observar una microinteracción. Read-only: NUNCA fill/press (mutación). */
export type ExploreInteractionKind = 'hover' | 'focus' | 'click'

const INTERACTION_KINDS = new Set<ExploreInteractionKind>(['hover', 'focus', 'click'])

/**
 * Parsea `--interaction '<kind>:<selector>'` → `{ kind, selector }`. El primer
 * `:` separa el kind del selector (el selector puede contener `:` como en
 * `role=tab[name="X"]`). Puro.
 */
export const parseInteractionSpec = (spec: string): { kind: ExploreInteractionKind; selector: string } => {
  const sep = spec.indexOf(':')

  if (sep < 0) throw new Error(`--interaction inválido (formato '<hover|focus|click>:<selector>'): "${spec}"`)

  const kind = spec.slice(0, sep).trim().toLowerCase()
  const selector = spec.slice(sep + 1).trim()

  if (!INTERACTION_KINDS.has(kind as ExploreInteractionKind)) {
    throw new Error(`--interaction kind inválido "${kind}" (solo hover|focus|click — read-only)`)
  }

  if (!selector) throw new Error(`--interaction sin selector: "${spec}"`)

  return { kind: kind as ExploreInteractionKind, selector }
}

/** Nombre kebab-case estable para una interacción (del kind + selector). */
export const interactionName = (kind: ExploreInteractionKind, selector: string): string => {
  const slug = selector
    .replace(/\[data-capture="?([^"\]]+)"?\]/i, '$1')
    .replace(/role=([a-z]+)(?:\[name="?([^"\]]+)"?\])?/i, '$1-$2')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40)

  return `${kind}-${slug || 'target'}`.replace(/-+$/g, '')
}

export interface ExploreInteractionFrameObservation {
  /** before | feedback | settled */
  label: string
  /** ms relativo a la acción. */
  atMs: number
  screenshotPath: string
}

export interface ExploreInteraction {
  name: string
  action: { kind: ExploreInteractionKind; selector: string }
  /** ¿La acción resolvió a un nodo visible? (graceful degrade si no). */
  resolved: boolean
  frames: ExploreInteractionFrameObservation[]
  error?: string
}

export interface ExploreSession {
  route: string
  env: string
  capturedAt: string
  ariaSnapshotPath: string
  screenshotPath: string
  /** Marcadores de región estables que GVC usa para clip/readiness. */
  markers: { selector: string; count: number }[]
  candidates: ExploreCandidate[]
  probes: ExploreProbeResult[]
  /** Microinteracciones observadas (TASK-1099). Vacío = baseline estático. */
  interactions: ExploreInteraction[]
}
