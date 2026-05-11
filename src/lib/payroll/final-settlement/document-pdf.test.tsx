import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { renderFinalSettlementDocumentPdf } from './document-pdf'
import type { FinalSettlementDocumentSnapshot } from './document-types'

const extractText = async (buffer: Buffer): Promise<string> => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
    buf: Buffer
  ) => Promise<{ text: string }>

  const result = await pdfParse(buffer)

  return result.text
}

const snapshot: FinalSettlementDocumentSnapshot = {
  schemaVersion: 1,
  generatedAt: '2026-05-05T10:00:00.000Z',
  documentTemplateCode: 'cl_final_settlement_resignation_v1',
  documentTemplateVersion: '2026-05-11.v2',
  officialReferences: [],
  finalSettlement: {
    finalSettlementId: 'final-settlement-test',
    offboardingCaseId: 'offboarding-case-test',
    settlementVersion: 1,
    memberId: 'member-test',
    profileId: 'profile-test',
    personLegalEntityRelationshipId: 'rel-test',
    legalEntityOrganizationId: 'org-test',
    compensationVersionId: 'compensation-test',
    effectiveDate: '2026-04-30',
    lastWorkingDay: '2026-04-30',
    hireDateSnapshot: '2024-01-01',
    contractEndDateSnapshot: null,
    separationType: 'resignation',
    contractTypeSnapshot: 'indefinido',
    payRegimeSnapshot: 'chile',
    payrollViaSnapshot: 'internal',
    currency: 'CLP',
    grossTotal: 121963,
    deductionTotal: 0,
    netPayable: 121963,
    approvedAt: '2026-05-05T09:00:00.000Z',
    approvedByUserId: 'user-admin'
  },
  collaborator: {
    memberId: 'member-test',
    profileId: 'profile-test',
    displayName: 'Valentina Hoyos',
    legalName: 'Valentina Hoyos',
    primaryEmail: 'valentina@example.com',
    taxId: '12.345.678-9',
    jobTitle: 'People Ops'
  },
  employer: {
    organizationId: 'org-test',
    legalName: 'Efeonce SpA',
    taxId: '76.000.000-0',
    taxIdType: 'CL_RUT',
    legalAddress: 'Santiago, Chile',
    country: 'CL',
    source: 'settlement_legal_entity'
  },
  sourceSnapshot: {
    schemaVersion: 2,
    offboardingCaseId: 'offboarding-case-test',
    memberId: 'member-test',
    profileId: 'profile-test',
    personLegalEntityRelationshipId: 'rel-test',
    legalEntityOrganizationId: 'org-test',
    compensationVersionId: 'compensation-test',
    hireDate: '2024-01-01',
    lastAnnualVacationDate: null,
    effectiveDate: '2026-04-30',
    lastWorkingDay: '2026-04-30',
    contractEndDate: null,
    separationType: 'resignation',
    contractType: 'indefinido',
    payRegime: 'chile',
    payrollVia: 'internal',
    payrollOverlapLedger: { coveredByMonthlyPayroll: true }
  },
  breakdown: [
    {
      componentCode: 'proportional_vacation',
      label: 'Feriado proporcional',
      kind: 'earning',
      amount: 121963,
      basis: {
        businessVacationDays: 2.5,
        compensatedCalendarDays: 3,
        dailyVacationBase: 40654.333
      },
      formulaRef: 'proportional_vacation_v1',
      sourceRef: {},
      taxability: 'not_taxable',
      policyCode: 'proportional_vacation',
      legalTreatment: 'legal_indemnity',
      taxTreatment: 'non_income',
      previsionalTreatment: 'not_contribution_base',
      overlapBehavior: 'never_duplicate_monthly',
      evidence: {
        source: 'sii',
        label: 'SII: vacaciones proporcionales no constituyen renta'
      }
    }
  ],
  explanation: {
    schemaVersion: 1,
    engineVersion: 'cl-resignation-dependent-v1',
    generatedAt: '2026-05-05T10:00:00.000Z',
    summary: 'Liquidación final generada para renuncia voluntaria.',
    formulas: [],
    warnings: []
  },
  readiness: {
    status: 'ready',
    hasBlockers: false,
    checks: []
  },
  documentReadiness: {
    status: 'ready',
    hasBlockers: false,
    checks: []
  }
}

describe('renderFinalSettlementDocumentPdf', () => {
  it('renders the approved finiquito mockup landmarks and policy columns', async () => {
    const buffer = await renderFinalSettlementDocumentPdf(snapshot)

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
      buf: Buffer
    ) => Promise<{ text: string; numpages: number }>

    const { text, numpages } = await pdfParse(buffer)

    expect(numpages).toBe(1)
    expect(text.replace(/\s+/g, ' ')).toContain('Finiquito de contrato de trabajo')
    expect(text).toContain('Listo para firma')
    expect(text).not.toContain('Requiere revisión')
    expect(text).toContain('Documento GH-FIN-2026-')
    expect(text).toContain('Snapshot fs-v1')
    expect(text).toContain('Tratamiento')
    expect(text).toContain('Respaldo')
    expect(text).toContain('Feriado proporcional')
    const normalizedText = text.replace(/\s+/g, ' ')
    const lowerText = normalizedText.toLocaleLowerCase('es-CL')

    expect(normalizedText).toContain('Compensación por feriado proporcional')
    expect(normalizedText).toContain('Base de cálculo')
    expect(lowerText).toContain('días hábiles a indemnizar')
    expect(lowerText).toContain('días corridos compensados')
    expect(lowerText).toContain('base diaria')
    expect(normalizedText).toContain('Saldo de vacaciones + regla DT art. 73')
    expect(normalizedText).toContain('Fuente: saldo de vacaciones registrado y regla DT de feriado proporcional')
    expect(text).toContain('No tributable')
    expect(text).toContain('No imponible')
    expect(text).toContain('Relación y causal')
    expect(text).toContain('30-04-2026')
    expect(text).toContain('Chile dependiente')
    expect(text).toContain('nómina interna')
    expect(text).toContain('Constancia para firma y ratificación')
    expect(text).not.toContain('internal payroll')
    expect(text).not.toContain('Policy')
    expect(text).not.toContain('Evidencia estructurada')
    expect(text).not.toContain('Sin descuentos previsionales pendientes')
    expect(text).not.toContain('Monto líquido calculado en esta versión')
    expect(text).toContain('Documento confidencial')
    expect(text.toLocaleLowerCase('es-CL')).toContain('líquido / pago neto')
  })

  it('uses document readiness instead of settlement warnings for the visible issuance state', async () => {
    const buffer = await renderFinalSettlementDocumentPdf({
      ...snapshot,
      readiness: {
        status: 'needs_review',
        hasBlockers: false,
        checks: [
          {
            code: 'payroll_evidence_retention',
            status: 'warning',
            severity: 'warning',
            message: 'Debe conservarse evidencia operacional de cotizaciones previsionales previas al termino.'
          }
        ]
      },
      documentReadiness: {
        status: 'ready',
        hasBlockers: false,
        checks: []
      }
    })

    const text = await extractText(buffer)

    expect(text).toContain('Listo para firma')
    expect(text).not.toContain('Requiere revisión')
    expect(text).not.toContain('Readiness de emisión')
  })
})
