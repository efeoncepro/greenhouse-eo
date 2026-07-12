/**
 * TASK-1391 — Constraints de render derivadas del requisito-set (PURO, browser-safe).
 *
 * "Admisibilidad" no es solo peso: formato, páginas y ACCESIBILIDAD también dejan una oferta
 * fuera. Estas constraints se FIJAN en el job al encolar (snapshot del requisito-set de ese
 * momento) y el worker falla cerrado contra ellas — nunca contra un default global re-leído.
 *
 * Accesibilidad es el caso arquitectónico: `Chromium print-to-PDF` emite PDF SIN taguear — el
 * motor NO puede producir PDF/UA. Si el RFP la exige, el render se rechaza al encolar
 * (`accessibility_unsupported`): mejor no ofertar que entregar un artefacto inadmisible.
 * La detección es CONSERVADORA a propósito (mejor un falso positivo que un humano revisa,
 * que un PDF inadmisible presentado).
 */

import type { ProposalRenderRequirementRef } from './render-projection'

export interface ProposalRenderConstraints {
  /** Límite de peso del PDF en MB. Default 20 (admisibilidad de portal) si el RFP no declara. */
  maxPdfMb: number
  /** El límite vino del RFP (true) o es el default global (false). */
  maxPdfMbFromRfp: boolean
  /** Máximo de páginas si el RFP lo declara. */
  maxPages: number | null
  /** El RFP exige accesibilidad (PDF/UA · Section 508 · EAA · WCAG) → el render NO puede cumplir. */
  accessibilityRequired: boolean
  /** requirementIds que originaron cada constraint (trazabilidad al requisito-set). */
  sourceRequirementIds: string[]
}

export const DEFAULT_MAX_PDF_MB = 20

const ACCESSIBILITY_PATTERNS = [
  /pdf\s*\/?\s*ua/i,
  /section\s*508/i,
  /\bEAA\b/,
  /european accessibility act/i,
  /\bWCAG\b/i,
  /accesib/i, // accesible / accesibilidad (es) — conservador
  /accessib/i // accessible / accessibility (en)
]

const MAX_MB_PATTERN = /(\d+(?:[.,]\d+)?)\s*(?:MB|megabytes?)/i
const MAX_PAGES_PATTERN = /(?:m[áa]x(?:imo)?\s*(?:de)?\s*)?(\d{1,3})\s*(?:p[áa]ginas?|l[áa]minas?|pages?|slides?)/i

const textOf = (req: ProposalRenderRequirementRef): string =>
  `${req.label} ${req.value ?? ''}`.trim()

/**
 * Deriva las constraints de render desde los requisitos declarados de la Proposal.
 * Solo mira requisitos de tipos que hablan del ARCHIVO/entregable (`format`, `excluyente`,
 * `sla` no aplica a archivo pero un excluyente puede declarar accesibilidad).
 */
export const extractRenderConstraints = (
  requirements: readonly ProposalRenderRequirementRef[]
): ProposalRenderConstraints => {
  let maxPdfMb = DEFAULT_MAX_PDF_MB
  let maxPdfMbFromRfp = false
  let maxPages: number | null = null
  let accessibilityRequired = false
  const sourceRequirementIds: string[] = []

  for (const req of requirements) {
    const text = textOf(req)

    if (ACCESSIBILITY_PATTERNS.some(rx => rx.test(text))) {
      accessibilityRequired = true
      sourceRequirementIds.push(req.requirementId)
    }

    if (req.requirementKind !== 'format' && req.requirementKind !== 'excluyente') continue

    const mb = MAX_MB_PATTERN.exec(text)

    if (mb) {
      const parsed = Number.parseFloat(mb[1]!.replace(',', '.'))

      if (Number.isFinite(parsed) && parsed > 0) {
        // Si el RFP declara más de un límite, gana el MÁS restrictivo (fail-closed).
        maxPdfMb = maxPdfMbFromRfp ? Math.min(maxPdfMb, parsed) : parsed
        maxPdfMbFromRfp = true
        sourceRequirementIds.push(req.requirementId)
      }
    }

    const pages = MAX_PAGES_PATTERN.exec(text)

    if (pages && /m[áa]x/i.test(text)) {
      const parsed = Number.parseInt(pages[1]!, 10)

      if (Number.isFinite(parsed) && parsed > 0) {
        maxPages = maxPages === null ? parsed : Math.min(maxPages, parsed)
        sourceRequirementIds.push(req.requirementId)
      }
    }
  }

  return {
    maxPdfMb,
    maxPdfMbFromRfp,
    maxPages,
    accessibilityRequired,
    sourceRequirementIds: [...new Set(sourceRequirementIds)]
  }
}
