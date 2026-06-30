/**
 * TASK-1266 — Growth AI Visibility · HTML/JSON-LD parsing helpers (Slice 2).
 *
 * Helpers PUROS de parseo tolerante para los probes que leen el HTML público del
 * sujeto (JSON-LD structured data, potentialAction agéntico, landmarks DOM). Sin
 * dependencias de render: parseo estático del markup servido. Tolerante a HTML mal
 * formado (no lanza; devuelve lo que pudo extraer).
 */

/** Extrae los bloques `<script type="application/ld+json">` y los parsea (los inválidos se descartan). */
export const extractJsonLdBlocks = (html: string): unknown[] => {
  const blocks: unknown[] = []
  const regex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi

  let match: RegExpExecArray | null

  while ((match = regex.exec(html)) !== null) {
    const raw = match[1]?.trim()

    if (!raw) continue

    try {
      blocks.push(JSON.parse(raw))
    } catch {
      // Bloque JSON-LD inválido → se descarta (no rompe el probe).
    }
  }

  return blocks
}

/**
 * Aplana JSON-LD a una lista de nodos: un bloque puede ser un objeto, un array, o
 * tener `@graph`. Devuelve los nodos-objeto para inspeccionar `@type`/`potentialAction`.
 */
export const flattenJsonLdNodes = (blocks: unknown[]): Record<string, unknown>[] => {
  const nodes: Record<string, unknown>[] = []

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item)

      return
    }

    if (value && typeof value === 'object') {
      const node = value as Record<string, unknown>

      nodes.push(node)

      if (Array.isArray(node['@graph'])) {
        for (const item of node['@graph']) visit(item)
      }
    }
  }

  for (const block of blocks) visit(block)

  return nodes
}

/** Normaliza `@type` (string | string[]) a un array de strings lower-case. */
export const jsonLdTypes = (node: Record<string, unknown>): string[] => {
  const raw = node['@type']

  if (typeof raw === 'string') return [raw.toLowerCase()]
  if (Array.isArray(raw)) return raw.filter((t): t is string => typeof t === 'string').map(t => t.toLowerCase())

  return []
}

/** Cuenta landmarks/semántica HTML estática (header/nav/main/footer/h1, ARIA roles). */
export interface DomSemanticsSnapshot {
  hasMain: boolean
  hasNav: boolean
  hasHeader: boolean
  hasFooter: boolean
  h1Count: number
  ariaLandmarkRoles: number
  titleLength: number
  metaDescriptionLength: number
}

const countMatches = (html: string, regex: RegExp): number => (html.match(regex) ?? []).length

export const analyzeDomSemantics = (html: string): DomSemanticsSnapshot => {
  const titleMatch = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  const metaDescMatch = /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i.exec(html)

  return {
    hasMain: /<main\b/i.test(html) || /role=["']main["']/i.test(html),
    hasNav: /<nav\b/i.test(html) || /role=["']navigation["']/i.test(html),
    hasHeader: /<header\b/i.test(html) || /role=["']banner["']/i.test(html),
    hasFooter: /<footer\b/i.test(html) || /role=["']contentinfo["']/i.test(html),
    h1Count: countMatches(html, /<h1\b/gi),
    ariaLandmarkRoles: countMatches(html, /role=["'](?:main|navigation|banner|contentinfo|complementary|search)["']/gi),
    titleLength: titleMatch ? titleMatch[1].trim().length : 0,
    metaDescriptionLength: metaDescMatch ? metaDescMatch[1].trim().length : 0
  }
}
