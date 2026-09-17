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

const clp = (amount: unknown, currency: unknown = 'CLP') =>
  typeof amount === 'number' ? `${currency} ${Math.round(amount).toLocaleString('es-CL')}` : '—'

const day = (iso: unknown) => (typeof iso === 'string' ? iso.slice(0, 10) : '—')

export const formatOpportunity = (payload: unknown) => {
  if (!isRecord(payload)) return asJson(payload)

  // Código público repetido: se listan en el orden recibido y NUNCA se elige uno (contrato de la tool).
  if (payload.multiple_matches && Array.isArray(payload.candidates)) {
    const lines = ['Hay varias oportunidades con ese código. Repite con --type <type> o --buyer <entidad>:']

    ;(payload.candidates as AnyRecord[]).forEach((candidate, index) => {
      const summary = Object.entries(candidate)
        .filter(([, value]) => value !== null && typeof value !== 'object')
        .map(([key, value]) => `${key}=${value}`)
        .join(' · ')

      lines.push(`  ${index + 1}. ${summary}`)
    })

    return lines.join('\n')
  }

  if (typeof payload.code !== 'string') return asJson(payload)

  const currency = payload.currency ?? 'CLP'

  const lines = [
    `${payload.code} · ${payload.type_label ?? payload.type ?? ''} · ${payload.status ?? 'sin estado'}`,
    String(payload.name ?? ''),
    '',
    `Comprador:  ${payload.buyer_name ?? '—'}${payload.buyer_unit_name ? ` (${payload.buyer_unit_name})` : ''}${payload.buyer_tax_number ? ` · ${payload.buyer_tax_number}` : ''}`,
    `Región:     ${payload.buyer_region ?? '—'}`,
    `Monto est.: ${clp(payload.estimated_amount, currency)}`,
    `Fechas:     publicada ${day(payload.published_at)} · cierre ${day(payload.closes_at)} · adjudicación ${day(payload.awarded_at)}`
  ]

  if (Array.isArray(payload.items) && payload.items.length) {
    lines.push('', `Ítems (${payload.items.length}):`)

    for (const item of payload.items as AnyRecord[]) {
      lines.push(`  ${item.number ?? '·'}. ${item.quantity ?? ''} ${item.unit ?? ''} — ${item.description ?? ''}`.replace(/\s+—/, ' —'))

      for (const offer of (Array.isArray(item.offers) ? item.offers : []) as AnyRecord[]) {
        lines.push(`       oferta: ${offer.provider_name ?? offer.name ?? '?'} · ${clp(offer.total_amount ?? offer.amount, currency)}`)
      }
    }
  }

  if (Array.isArray(payload.winners) && payload.winners.length) {
    lines.push('', 'Adjudicados:')

    for (const winner of payload.winners as AnyRecord[]) {
      lines.push(`  ${winner.name ?? winner.provider_name ?? '?'}${winner.tax_number ? ` · ${winner.tax_number}` : ''} · ${clp(winner.amount ?? winner.awarded_amount, currency)}`)
    }
  }

  if (payload.items_omitted) lines.push('', `Ítems omitidos por tamaño: ${payload.items_omitted}`)
  if (Array.isArray(payload.notes) && payload.notes.length) lines.push('', ...payload.notes.map(note => `Nota: ${note}`))

  return lines.join('\n')
}

export const formatProviderReport = (payload: unknown) => {
  if (!isRecord(payload) || !isRecord(payload.provider) || !isRecord(payload.summary)) return asJson(payload)

  const summary = payload.summary
  const currency = summary.currency ?? 'CLP'
  const period = isRecord(payload.period) ? payload.period : {}
  const orders = isRecord(summary.purchase_orders) ? summary.purchase_orders : {}

  const lines = [
    `${payload.provider.name} · ${payload.provider.tax_number} · ${payload.provider.country}`,
    `Período: ${period.from ?? '?'} → ${period.to ?? '?'} (ventana rodante, base ${period.date_basis ?? '?'})`,
    '',
    `Participaciones ${summary.participations} · adjudicadas ${summary.awarded} · win rate ${summary.win_rate_pct}%`,
    `Ofertado ${clp(summary.offered_amount, currency)} · adjudicado ${clp(summary.awarded_amount, currency)} · órdenes de compra ${orders.count ?? 0} (${clp(orders.amount, currency)})`
  ]

  const section = (title: string, rows: unknown, render: (row: AnyRecord) => string) => {
    if (!Array.isArray(rows) || !rows.length) return

    lines.push('', `${title}:`, ...(rows as AnyRecord[]).map(row => `  ${render(row)}`))
  }

  section('Principales compradores', payload.top_buyers, row => `${row.name} · ${row.participations} part. · ${row.awarded} adj. · ${clp(row.awarded_amount, currency)}`)
  section('Rubros', payload.top_sectors, row => `${row.share_pct}% · ${row.name}`)
  section('Competidores que ganaron', payload.top_competitors, row => `${row.name} · ${row.opportunities_won} oport. · ${clp(row.awarded_amount, currency)}`)
  section('Compradores por orden de compra', payload.po_top_buyers, row => `${row.name} · ${clp(row.amount ?? row.total_amount, currency)}`)

  const applications = isRecord(payload.applications) ? payload.applications : null

  section('Oportunidades', applications?.items, row => {
    const winners = Array.isArray(row.awarded_providers) && row.awarded_providers.length
      ? ` · ganó ${(row.awarded_providers as AnyRecord[]).map(provider => provider.name).join(', ')}`
      : ''

    return `${row.publish_date ?? '—'} ${row.code} · ${row.status} · ${row.buyer_name} · ofertó ${clp(row.offered_amount, row.currency ?? currency)}${row.is_awarded ? ' · ADJUDICADA' : ''}${winners}`
  })

  if (applications?.has_more) {
    lines.push('', `Hay más oportunidades: repite con --cursor ${applications.next_cursor ?? '<next_cursor>'} o sube --limit (máx. 50).`)
  }

  section('Ítems adjudicados recientes', payload.recent_awarded_items, row => asJson(row).replace(/\s+/g, ' '))
  section('Precio propio vs ganador', payload.lost_items_pricing, row => asJson(row).replace(/\s+/g, ' '))

  if (Array.isArray(payload.notes) && payload.notes.length) lines.push('', ...payload.notes.map(note => `Nota: ${note}`))

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
    case 'opportunity':
      return formatOpportunity(payload)
    case 'provider':
      return formatProviderReport(payload)
    default:
      return asJson(payload)
  }
}
