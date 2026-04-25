// TASK-629 — Test PDF render script.
//
// Generates a sample enterprise quotation PDF using the new modular
// architecture (tokens + sections + flags + QR + fonts) WITHOUT touching
// the database. Sample data simulates a Globe LATAM enterprise retainer.
//
// Output: tmp/quote-pdf-sample-<timestamp>.pdf  (gitignored)
//
// Run: pnpm tsx scripts/render-test-pdf.ts
//
// Required env (optional):
//   GREENHOUSE_QUOTE_VERIFICATION_SECRET — 32+ char string for QR signing.

import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { renderQuotationPdf } from '@/lib/finance/pdf/render-quotation-pdf'

import type { RenderQuotationPdfInput } from '@/lib/finance/pdf/contracts'

const sampleInput: RenderQuotationPdfInput = {
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

const main = async () => {
  console.log('[test-pdf] Rendering sample quotation PDF...')

  const startedAt = Date.now()
  const buffer = await renderQuotationPdf(sampleInput)
  const elapsed = Date.now() - startedAt

  const outputDir = resolve(process.cwd(), 'tmp')

  mkdirSync(outputDir, { recursive: true })

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const outputPath = resolve(outputDir, `quote-pdf-sample-${stamp}.pdf`)

  writeFileSync(outputPath, buffer)

  console.log(
    `[test-pdf] ✓ Rendered ${(buffer.length / 1024).toFixed(1)} KB in ${elapsed}ms`
  )
  console.log(`[test-pdf] Output: ${outputPath}`)
}

main().catch(error => {
  console.error('[test-pdf] FAILED:', error)
  process.exit(1)
})
