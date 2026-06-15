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
