/**
 * Mapper canónico `knowledge-search.v1` → cita inline de Nexa Answers. TASK-1101 (runtime) Slice 1.
 *
 * Traduce un `KnowledgeRetrievalChunk` (packet `knowledge-search.v1`, TASK-1083/1085) al `NexaCitationSource`
 * que consume el `NexaCitationMarker` + el evidence-peek (TASK-1096). Función PURA: cero IO, cero UI —
 * el puente entre el contrato de datos real y el contrato de cita del canvas.
 *
 * Es el SSOT de esta traducción: la UI humana (TASK-1084), Nexa (TASK-1085/1092) y el runtime del canvas
 * citan el MISMO mapeo. NO derivar números nuevos: `score` viene verbatim del chunk (SSOT del trace,
 * TASK-1083); `freshness` se mapea 1:1; `href` es la `humanUrl` canónica (anti-oracle: lo que el subject
 * puede abrir). No inventa confianza ni recorta evidencia más allá de un excerpt legible para el peek.
 */
import type { NexaCitationSource } from '@/components/greenhouse/primitives'
import type { KnowledgeFreshness } from '@/lib/knowledge/types'
import type { KnowledgeRetrievalChunk, KnowledgeRetrievalPacket } from '@/lib/knowledge/search/types'

/** Excerpt máximo del peek (caracteres). El chunk completo puede ser largo; el peek muestra un fragmento. */
const DEFAULT_MAX_EXCERPT_LENGTH = 280

/** `KnowledgeFreshness` → freshness de la cita. `deprecated`→`stale`; `unknown`→sin chip (honesto). */
const FRESHNESS_MAP: Record<KnowledgeFreshness, NexaCitationSource['freshness']> = {
  current: 'current',
  stale: 'stale',
  deprecated: 'stale',
  unknown: undefined
}

/** Normaliza el `citationLabel` del packet ("[1]") al marcador desnudo que renderiza el chip ("1"). */
export const normalizeCitationLabel = (citationLabel: string): string => {
  const stripped = citationLabel.replace(/[[\]\s]/g, '').trim()

  return stripped.length > 0 ? stripped : citationLabel.trim()
}

/** Recorta a un excerpt legible en frontera de palabra, con elipsis, colapsando whitespace. */
export const truncateCitationExcerpt = (text: string, maxLength = DEFAULT_MAX_EXCERPT_LENGTH): string => {
  const clean = text.trim().replace(/\s+/g, ' ')

  if (clean.length <= maxLength) return clean

  const cut = clean.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  const body = lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut

  return `${body.trimEnd()}…`
}

export interface MapCitationOptions {
  /** Excerpt máximo del peek (default 280). */
  maxExcerptLength?: number
}

/** Mapea UN chunk del packet a una cita inline. Pura. */
export const mapKnowledgeChunkToCitationSource = (
  chunk: KnowledgeRetrievalChunk,
  options?: MapCitationOptions
): NexaCitationSource => ({
  id: chunk.chunkId,
  label: normalizeCitationLabel(chunk.citationLabel),
  title: chunk.title,
  headingPath: chunk.headingPath.length > 0 ? chunk.headingPath : undefined,
  excerpt: truncateCitationExcerpt(chunk.text, options?.maxExcerptLength),
  score: chunk.score,
  freshness: FRESHNESS_MAP[chunk.freshness],
  // `humanUrl` es la surface Greenhouse canónica de lectura ("Abrir fuente"); NO `sourceUrl` (Notion externo).
  href: chunk.humanUrl.trim().length > 0 ? chunk.humanUrl : undefined
})

/** Mapea todos los chunks del packet a citas inline, preservando el orden del retrieval. */
export const mapKnowledgePacketToCitationSources = (
  packet: KnowledgeRetrievalPacket,
  options?: MapCitationOptions
): NexaCitationSource[] => packet.chunks.map(chunk => mapKnowledgeChunkToCitationSource(chunk, options))
