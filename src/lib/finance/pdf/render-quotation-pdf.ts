import 'server-only'

import { createElement } from 'react'

import { renderToBuffer } from '@react-pdf/renderer'

import { QuotationPdfDocument } from './quotation-pdf-document'

import type { RenderQuotationPdfInput } from './contracts'

export type {
  RenderQuotationPdfInput,
  QuotationPdfLineItem,
  QuotationPdfTotals,
  QuotationPdfTerm
} from './contracts'

/**
 * Render a quotation PDF into a Node Buffer.
 *
 * Uses `@react-pdf/renderer`'s server-side `renderToBuffer` so the caller
 * can stream the result through a Next.js Response.
 *
 * SECURITY: this renderer intentionally receives ONLY externally-safe fields
 * (label, description, quantity, unitPrice, subtotalAfterDiscount). Cost,
 * margin, and cost-breakdown data must never be passed in — keep the
 * firewall at the caller (the API route).
 */
export const renderQuotationPdf = async (
  input: RenderQuotationPdfInput
): Promise<Buffer> => {
  const element = createElement(QuotationPdfDocument, { input })

  // `renderToBuffer` types the argument as ReactElement<DocumentProps> (a
  // namespaced type in @react-pdf/renderer), but our wrapper component
  // returns a Document-bearing tree that satisfies it at runtime. Cast via
  // `unknown` keeps TS strict while matching the renderer contract.
  return renderToBuffer(element as unknown as Parameters<typeof renderToBuffer>[0])
}
