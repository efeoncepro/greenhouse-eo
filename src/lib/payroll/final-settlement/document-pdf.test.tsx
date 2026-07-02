import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { extractReactPdfText } from '@/test/react-pdf-text'
import { buildFinalSettlementDocumentElement } from './document-pdf'
import type { FinalSettlementDocumentSnapshot } from './document-types'

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

// Extract the finiquito document's text runs from the <Document> element (SSOT
// the production renderer also consumes), without rendering to a binary PDF.
// `normalized` joins every <Text> run with a single space, so cross-node phrase
// assertions read the same as the previous pdf-parse text — but deterministic
// in CI. `runs` preserves per-node boundaries for exact label checks.
const extract = (snap: FinalSettlementDocumentSnapshot): { runs: string[]; normalized: string } => {
  const { runs, normalized } = extractReactPdfText(buildFinalSettlementDocumentElement(snap))

  return { runs, normalized }
}

describe('renderFinalSettlementDocumentPdf', () => {
  it('renders the approved finiquito mockup landmarks and policy columns', () => {
    const { runs, normalized } = extract(snapshot)
    const lower = normalized.toLocaleLowerCase('es-CL')

    // Document produced text (replaces the old "PDF parseable / numpages>=1" check;
    // the element tree carries the real content, not a page count).
    expect(runs.length).toBeGreaterThan(0)

    expect(normalized).toContain('Finiquito de contrato de trabajo')
    expect(normalized).toContain('Listo para firma')
    expect(normalized).not.toContain('Requiere revisión')
    // TASK-863 V1.1 — metadata técnica movida del header top al footer auditoría.
    // El prefix "Documento" se quitó; el ID sigue presente en el footer.
    expect(normalized).toMatch(/GH-FIN-2026-[A-F0-9]{8}/)
    expect(normalized).toContain('Snapshot fs-v1')
    expect(normalized).toContain('Tratamiento')
    expect(normalized).toContain('Respaldo')
    expect(normalized).toContain('Feriado proporcional')

    expect(normalized).toContain('Compensación por feriado proporcional')
    expect(normalized).toContain('Base de cálculo')
    expect(lower).toContain('días hábiles a indemnizar')
    expect(lower).toContain('días corridos compensados')
    expect(lower).toContain('base diaria')
    expect(normalized).toContain('Saldo de vacaciones + regla DT art. 73')
    expect(normalized).toContain('Fuente: saldo de vacaciones registrado y regla DT de feriado proporcional')
    expect(normalized).toContain('No tributable')
    expect(normalized).toContain('No imponible')
    expect(normalized).toContain('Relación y causal')
    expect(normalized).toContain('30-04-2026')
    expect(normalized).toContain('Chile dependiente')
    expect(normalized).toContain('nómina interna')
    expect(normalized).toContain('Constancia para firma y ratificación')
    expect(normalized).not.toContain('internal payroll')
    expect(normalized).not.toContain('Policy')
    expect(normalized).not.toContain('Evidencia estructurada')
    expect(normalized).not.toContain('Sin descuentos previsionales pendientes')
    expect(normalized).not.toContain('Monto líquido calculado en esta versión')
    expect(normalized).toContain('Documento confidencial')
    expect(lower).toContain('líquido / pago neto')

    // TASK-862 Slice D — clausulas narrativas + Ley 21.389 + ministro de fe.
    expect(normalized).toContain('ARTÍCULO 159 N°2 DEL CÓDIGO DEL TRABAJO')
    expect(normalized).toContain('amplio, total y definitivo finiquito')
    expect(normalized).toContain('artículo 162 inciso 5°')
    expect(normalized).toContain('Ministro de fe')
    expect(normalized).toContain('Pendiente de ratificación')
    // TASK-863 V1.1 — footer consolidado: brand "Greenhouse · greenhouse.efeoncepro.com".
    // El walker captura el run aunque viva dentro de una caja pequeña (a diferencia
    // de pdf-parse, que a veces lo omitía).
    expect(normalized).toContain('Greenhouse · greenhouse.efeoncepro.com')
  })

  it('uses document readiness instead of settlement warnings for the visible issuance state', () => {
    const { normalized } = extract({
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

    expect(normalized).toContain('Listo para firma')
    expect(normalized).not.toContain('Requiere revisión')
    expect(normalized).not.toContain('Readiness de emisión')
  })
})
