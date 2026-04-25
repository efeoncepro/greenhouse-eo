// TASK-629 — Test PDF render script.
//
// Generates 2 sample quotation PDFs to validate both rendering modes:
// - quote-pdf-sample-enterprise-*.pdf — full 8 sections (Globe LATAM
//   retainer USD 184,500 / 12 meses) with all conditional sections active.
// - quote-pdf-sample-compact-*.pdf — minimal 5 sections (small Wave
//   project < $5M CLP) testing the conditional-omit path.
//
// Output: tmp/  (gitignored)
//
// Run: pnpm tsx scripts/render-test-pdf.ts
//
// Required env (optional):
//   GREENHOUSE_QUOTE_VERIFICATION_SECRET — 32+ char string for QR signing.

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { renderQuotationPdf } from '@/lib/finance/pdf/render-quotation-pdf'

import type { RenderQuotationPdfInput } from '@/lib/finance/pdf/contracts'

const enterpriseInput: RenderQuotationPdfInput = {
  quotationId: 'quo-sample-001',
  quotationNumber: 'EFG-2026-00184',
  versionNumber: 2,
  currency: 'USD',
  quoteDate: '2026-04-24',
  validUntil: '2026-05-30',
  clientName: 'Banco Industrial Latinoamericano',
  organizationName: 'División Marketing & Growth',
  description:
    'Programa de crecimiento orgánico Globe LATAM 2026: estrategia de adquisición + retención multicanal con foco en Chile, Colombia y México. Modelo retainer mensual con KPIs compartidos y reportería ejecutiva trimestral. Consolida estrategia, contenidos, performance multicanal y reportería operativa, evitando la fragmentación habitual en agencias múltiples.',
  lineItems: [
    {
      label: 'Performance Lead Senior',
      description: '160 hrs/mes',
      descriptionRichHtml:
        '<p>Liderazgo del programa <strong>full-funnel</strong> con responsabilidad sobre KPIs trimestrales y governance del retainer.</p><ul><li>Reuniones de leadership trimestrales</li><li>Reportería ejecutiva mensual</li><li>Capacidad ajustable hasta ±20%</li></ul>',
      productCode: 'ROL-PERFLD-SR',
      bundleId: null,
      bundleLabel: null,
      quantity: 160,
      unit: 'Hora',
      unitPrice: 38,
      subtotalAfterDiscount: 6080
    },
    {
      label: 'Strategy Director',
      description: '40 hrs/mes',
      descriptionRichHtml: null,
      productCode: 'ROL-STRAT-DIR',
      bundleId: null,
      bundleLabel: null,
      quantity: 40,
      unit: 'Hora',
      unitPrice: 65,
      subtotalAfterDiscount: 2600
    },
    {
      label: 'Content Manager (×2)',
      description: '320 hrs/mes',
      descriptionRichHtml: null,
      productCode: 'ROL-CONT-MGR',
      bundleId: null,
      bundleLabel: null,
      quantity: 320,
      unit: 'Hora',
      unitPrice: 14,
      subtotalAfterDiscount: 4480
    },
    {
      label: 'Data Analyst',
      description: '80 hrs/mes',
      descriptionRichHtml: null,
      productCode: 'ROL-DATA-ANL',
      bundleId: null,
      bundleLabel: null,
      quantity: 80,
      unit: 'Hora',
      unitPrice: 12,
      subtotalAfterDiscount: 960
    },
    {
      label: 'Adobe Creative Cloud (4 seats)',
      description: 'Pass-through',
      descriptionRichHtml: null,
      productCode: 'TLS-ADOBE-CC',
      bundleId: null,
      bundleLabel: null,
      quantity: 4,
      unit: 'Licencia',
      unitPrice: 20,
      subtotalAfterDiscount: 80
    },
    {
      label: 'Setup & Onboarding (one-time)',
      description: 'Setup técnico, integraciones, training',
      descriptionRichHtml: null,
      productCode: 'SVC-SETUP',
      bundleId: null,
      bundleLabel: null,
      quantity: 1,
      unit: 'Proyecto',
      unitPrice: 14100,
      subtotalAfterDiscount: 14100
    }
  ],
  totals: {
    subtotal: 184500,
    totalDiscount: 0,
    total: 184500,
    tax: null
  },
  terms: [
    {
      title: 'Vigencia y aceptación',
      bodyResolved:
        'Esta propuesta es válida hasta el 30/05/2026. Pasada esa fecha requiere re-validación por parte de Efeonce, ya que tarifas, FX y disponibilidad de equipo pueden variar.',
      sortOrder: 1
    },
    {
      title: 'Facturación y pagos',
      bodyResolved:
        'Facturación los primeros 5 días hábiles del mes correspondiente al periodo de servicio. Plazo de pago: 15 días corridos desde emisión.',
      sortOrder: 2
    },
    {
      title: 'Confidencialidad',
      bodyResolved:
        'Toda información intercambiada entre las partes durante el ciclo de venta y ejecución es confidencial y permanece como tal por 5 años desde la finalización del contrato.',
      sortOrder: 3
    },
    {
      title: 'Propiedad intelectual',
      bodyResolved:
        'Los entregables creados específicamente para este programa son propiedad del cliente al pago efectivo de cada periodo. El stack tecnológico y know-how preexistente permanecen como propiedad de Efeonce.',
      sortOrder: 4
    }
  ],
  fxFooter: null,
  subBrand: 'globe',
  salesRep: {
    name: 'Julio Reyes',
    role: 'Account Lead · Efeonce Globe',
    email: 'jreyes@efeoncepro.com',
    phone: '+56 9 5847 2310'
  },
  legalEntity: null,
  milestones: [
    {
      dateLabel: 'Mayo 2026 · M0',
      title: 'Kick-off & onboarding',
      detail: 'Setup técnico + governance',
      amountLabel: 'USD 14,100'
    },
    {
      dateLabel: 'Junio 2026 · M1',
      title: 'Operación mensual #1',
      detail: 'Inicio del retainer',
      amountLabel: 'USD 14,200'
    },
    {
      dateLabel: 'Jul 2026 — Abr 2027',
      title: 'Operación mensual #2-#11',
      detail: '10 ciclos mensuales con QBR en M3 y M9',
      amountLabel: '10 × USD 14,200'
    },
    {
      dateLabel: 'Mayo 2027 · M12',
      title: 'Cierre + renewal review',
      detail: 'Última factura del ciclo',
      amountLabel: 'USD 14,200'
    }
  ],
  paymentMethods: {
    description:
      'Transferencia bancaria local (Chile · Banco BCI · Cta corriente 74-0000-187), transferencia internacional (USD), tarjeta corporativa (Visa/Mastercard).'
  },
  forceEnterpriseTemplate: true,
  totalInClp: 175000000
}

const compactInput: RenderQuotationPdfInput = {
  quotationId: 'quo-sample-002',
  quotationNumber: 'EFW-2026-00057',
  versionNumber: 1,
  currency: 'CLP',
  quoteDate: '2026-04-24',
  validUntil: '2026-05-15',
  clientName: 'Café Latino SpA',
  organizationName: null,
  description: 'Audit técnico AEO + roadmap de optimización SEO.',
  lineItems: [
    {
      label: 'Auditoría técnica AEO',
      description: 'Diagnóstico completo + roadmap',
      descriptionRichHtml: null,
      productCode: 'SVC-AEO-AUDIT',
      bundleId: null,
      bundleLabel: null,
      quantity: 1,
      unit: 'Proyecto',
      unitPrice: 2_500_000,
      subtotalAfterDiscount: 2_500_000
    },
    {
      label: 'Roadmap implementación',
      description: '90 días',
      descriptionRichHtml: null,
      productCode: 'SVC-AEO-ROAD',
      bundleId: null,
      bundleLabel: null,
      quantity: 1,
      unit: 'Proyecto',
      unitPrice: 1_500_000,
      subtotalAfterDiscount: 1_500_000
    }
  ],
  totals: {
    subtotal: 4_000_000,
    totalDiscount: 0,
    total: 4_760_000,
    tax: {
      code: 'cl_vat_19',
      label: 'IVA 19%',
      rate: 0.19,
      amount: 760_000,
      isExempt: false
    }
  },
  terms: [
    {
      title: 'Vigencia',
      bodyResolved: 'Esta propuesta es válida hasta el 15/05/2026.',
      sortOrder: 1
    },
    {
      title: 'Pago',
      bodyResolved: '50% al iniciar + 50% contra entrega del roadmap.',
      sortOrder: 2
    }
  ],
  fxFooter: null,
  subBrand: 'wave',
  salesRep: {
    name: 'Julio Reyes',
    role: 'Account Lead',
    email: 'jreyes@efeoncepro.com',
    phone: null
  },
  legalEntity: null,
  forceEnterpriseTemplate: false,
  totalInClp: 4_760_000  // Below the 50M threshold
}

const renderOne = async (
  label: string,
  input: RenderQuotationPdfInput
): Promise<void> => {
  console.log(`[test-pdf] Rendering ${label} sample...`)

  const startedAt = Date.now()
  const buffer = await renderQuotationPdf(input)
  const elapsed = Date.now() - startedAt

  const outputDir = resolve(process.cwd(), 'tmp')

  mkdirSync(outputDir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outputPath = resolve(outputDir, `quote-pdf-sample-${label}-${stamp}.pdf`)

  writeFileSync(outputPath, buffer)

  console.log(
    `[test-pdf] ✓ ${label}: ${(buffer.length / 1024).toFixed(1)} KB in ${elapsed}ms → ${outputPath}`
  )
}

const main = async () => {
  await renderOne('enterprise', enterpriseInput)
  await renderOne('compact', compactInput)
}

main().catch(error => {
  console.error('[test-pdf] FAILED:', error)
  process.exit(1)
})
