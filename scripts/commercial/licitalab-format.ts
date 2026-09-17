/**
 * Salida legible de `pnpm licitalab`. Formatos derivados de payloads reales (2026-09-17); cualquier forma que no
 * reconozca cae a JSON indentado, así un cambio del proveedor nunca oculta datos.
 */

const CHUNK_PREVIEW_MAX_CHARS = 600

type AnyRecord = Record<string, unknown>

const isRecord = (value: unknown): value is AnyRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const asJson = (payload: unknown) => JSON.stringify(payload, null, 2)

const formatBytes = (bytes: unknown) => {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return '?'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const firstSentence = (text: unknown) => {
  if (typeof text !== 'string') return ''

  const sentence = text.split(/(?<=\.)\s/)[0] ?? text

  return sentence.length > 140 ? `${sentence.slice(0, 140)}…` : sentence
}

const collapseWhitespace = (text: string) => text.replace(/\s+/g, ' ').trim()

const formatTools = (payload: unknown) => {
  if (!Array.isArray(payload)) return asJson(payload)

  return [`${payload.length} tools:`, ...payload.map(tool => `  ${(tool as AnyRecord).name}  ${firstSentence((tool as AnyRecord).description)}`)].join(
    '\n'
  )
}

export const formatDocuments = (payload: unknown) => {
  if (!isRecord(payload) || !Array.isArray(payload.documents)) return asJson(payload)

  const lines = [`${payload.code} · ${payload.oppTypeLabel ?? payload.oppType ?? 'tipo desconocido'} · ${payload.total ?? payload.documents.length} documentos`]

  for (const doc of payload.documents as AnyRecord[]) {
    const mark = doc.supported ? '✓' : '✗'

    lines.push(`  ${mark} ${doc.name}  (${formatBytes(doc.size)})`)
  }

  if ((payload.documents as AnyRecord[]).some(doc => !doc.supported)) {
    lines.push('', '✗ = no se puede consultar con ask-docs (sin extracción de texto).')
  }

  return lines.join('\n')
}

const DOC_STATUS_NOTES: Record<string, string> = {
  partial: 'Resultado PARCIAL: faltan documentos por indexar; reintenta en ~60 s para la lectura completa.',
  indexing: 'Los documentos se están indexando recién: aún no hay texto. Reintenta en 30–60 s.',
  empty: 'La oportunidad no tiene documentos legibles.'
}

export const formatDocumentSearch = (payload: unknown, topK?: number) => {
  if (!isRecord(payload)) return asJson(payload)

  const status = typeof payload.status === 'string' ? payload.status : 'desconocido'
  const lines = [`${payload.code} · "${payload.query}" · status=${status}`]

  if (DOC_STATUS_NOTES[status]) lines.push(DOC_STATUS_NOTES[status])

  if (Array.isArray(payload.pending_documents) && payload.pending_documents.length) {
    lines.push(`Pendientes: ${payload.pending_documents.join(', ')}`)
  }

  if (!Array.isArray(payload.chunks)) return lines.join('\n')

  // El servidor no siempre respeta topK: se ordena por score y se recorta acá para cumplir lo pedido.
  const chunks = [...(payload.chunks as AnyRecord[])]
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
    .slice(0, topK ?? payload.chunks.length)

  chunks.forEach((chunk, index) => {
    const text = collapseWhitespace(String(chunk.text ?? ''))
    const preview = text.length > CHUNK_PREVIEW_MAX_CHARS ? `${text.slice(0, CHUNK_PREVIEW_MAX_CHARS)}…` : text
    const score = typeof chunk.score === 'number' ? chunk.score.toFixed(2) : '?'

    lines.push('', `[${index + 1}] ${chunk.filename} · p. ${chunk.pageNumber ?? '?'} · score ${score}`, preview)
  })

  return lines.join('\n')
}

const formatSupport = (payload: unknown) => (isRecord(payload) && typeof payload.answer === 'string' ? payload.answer : asJson(payload))

export const formatLicitalabResult = (command: string, payload: unknown, options: { topK?: number } = {}): string => {
  switch (command) {
    case 'tools':
      return formatTools(payload)
    case 'documents':
      return formatDocuments(payload)
    case 'ask-docs':
      return formatDocumentSearch(payload, options.topK)
    case 'support':
      return formatSupport(payload)
    default:
      return asJson(payload)
  }
}
