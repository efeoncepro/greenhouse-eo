/**
 * Limpia un fragmento de Markdown crudo a texto plano legible para el PREVIEW de fuentes
 * (la tarjeta de evidencia bajo la respuesta de Nexa). TASK-1124 follow-up.
 *
 * El cuerpo del chunk viene de Notion/Markdown y trae sintaxis estructural cruda (`##`,
 * `**bold**`, `>`, listas, links). En la respuesta del modelo ya saneamos los encabezados
 * (grounding/brief), pero el EXCERPT de la fuente se mostraba verbatim → el operador veía
 * `## Las 7 fases…`. Esta función produce un preview en prosa: sin marcadores estructurales
 * ni de énfasis, en una sola corrida de texto (el card ya trunca a ~220 chars).
 *
 * PURA (cero IO, client-safe). Conserva el TEXTO; solo quita la sintaxis Markdown.
 */
export const toPlainExcerpt = (text: string): string => {
  if (!text) {
    return ''
  }

  return (
    text
      // Encabezados ATX: quita los `#` de inicio de línea (preserva el título como texto).
      .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
      // Blockquote: quita el `>` de inicio de línea.
      .replace(/^[ \t]{0,3}>[ \t]?/gm, '')
      // Marcadores de lista no ordenada al inicio de línea (`-`, `*`, `+`).
      .replace(/^[ \t]{0,3}[-*+][ \t]+/gm, '')
      // Links/imágenes Markdown: conserva el texto, descarta la URL.
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Énfasis bold/italic (`**`, `__`, `*`, `_`) preservando el contenido.
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Code inline: quita los backticks.
      .replace(/`([^`]+)`/g, '$1')
      // Colapsa saltos de línea y espacios redundantes a una sola corrida de prosa.
      .replace(/\s+/g, ' ')
      .trim()
  )
}

const FENCE_RE = /^[ \t]{0,3}(?:```|~~~)/
// Encabezado ATX: indent (0-3) + `#`..`######` + espacio + contenido (+ cierre `#` opcional).
const ATX_HEADING_RE = /^([ \t]{0,3})#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/

/**
 * Baja los encabezados ATX (`#`, `##`, `###`…) a **negrita** en su propia línea, para la
 * RESPUESTA del chat de Nexa (TASK-1149).
 *
 * El contrato de voz prohíbe headers en el panel del chat (TASK-1138 `answerFormatting`): en
 * un panel denso de producto un H2 es demasiado pesado; la jerarquía va con **negrita** +
 * viñetas + párrafos cortos. Algunos providers (Claude vía auto-router) generan `## Título`
 * pese al prompt → esta capa determinística lo GARANTIZA en TODOS los providers, sin depender
 * del compliance probabilístico del LLM (defense-in-depth: el prompt reduce la frecuencia,
 * esto cierra el caso). El nightly de TASK-1127 lo detectó en staging (caso K6).
 *
 * A diferencia de `toPlainExcerpt` (que aplana TODO el Markdown para los previews), acá solo
 * se downgradean los HEADERS a negrita: viñetas, negritas, links y énfasis se preservan
 * (es la respuesta renderizable del chat). Preserva los bloques de código (no toca `##`
 * dentro de ``` ``` para no romper un ejemplo citado). Idempotente, pura, client-safe.
 */
export const downgradeStructuralHeadings = (text: string): string => {
  if (!text) {
    return ''
  }

  let inFence = false

  return text
    .split('\n')
    .map(line => {
      // Las líneas de fence (``` / ~~~) togglean el bloque de código y se preservan tal cual.
      if (FENCE_RE.test(line)) {
        inFence = !inFence

        return line
      }

      if (inFence) {
        return line
      }

      const match = line.match(ATX_HEADING_RE)

      if (!match) {
        return line
      }

      const indent = match[1] ?? ''
      const content = match[2].trim()

      // Idempotencia / no doble-envolver si el contenido del header ya es negrita completa.
      if (/^\*\*[\s\S]*\*\*$/.test(content)) {
        return `${indent}${content}`
      }

      return `${indent}**${content}**`
    })
    .join('\n')
}
