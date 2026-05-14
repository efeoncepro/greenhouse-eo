import type { ReactElement } from 'react'

import { render } from '@react-email/render'
import { describe, expect, it } from 'vitest'

import BeneficiaryPaymentProfileChangedEmail from './BeneficiaryPaymentProfileChangedEmail'
import InvitationEmail from './InvitationEmail'
import LeaveRequestDecisionEmail from './LeaveRequestDecisionEmail'
import LeaveRequestPendingReviewEmail from './LeaveRequestPendingReviewEmail'
import LeaveRequestSubmittedEmail from './LeaveRequestSubmittedEmail'
import LeaveReviewConfirmationEmail from './LeaveReviewConfirmationEmail'
import MagicLinkEmail from './MagicLinkEmail'
import NotificationEmail from './NotificationEmail'
import PasswordResetEmail from './PasswordResetEmail'
import PayrollExportReadyEmail from './PayrollExportReadyEmail'
import PayrollLiquidacionV2Email from './PayrollLiquidacionV2Email'
import PayrollPaymentCancelledEmail from './PayrollPaymentCancelledEmail'
import PayrollPaymentCommittedEmail from './PayrollPaymentCommittedEmail'
import PayrollReceiptEmail from './PayrollReceiptEmail'
import QuoteSharePromptEmail from './QuoteSharePromptEmail'
import VerifyEmail from './VerifyEmail'
import WeeklyExecutiveDigestEmail from './WeeklyExecutiveDigestEmail'

type EmailBaselineCase = {
  name: string
  element: ReactElement
  tokenSnippets: string[]
}

const EMAIL_BASELINE_CASES: EmailBaselineCase[] = [
  {
    name: 'BeneficiaryPaymentProfileChangedEmail',
    element: (
      <BeneficiaryPaymentProfileChangedEmail
        fullName='Valentina Hoyos'
        kind='approved'
        bankName='Banco de Chile'
        accountNumberMasked='•••• 4321'
        currency='CLP'
        effectiveAt='2026-05-04'
        reason='Cuenta validada por Finance'
        requestedByMember
      />
    ),
    tokenSnippets: ['Valentina', 'Banco de Chile', '•••• 4321', 'Cuenta validada por Finance']
  },
  {
    name: 'InvitationEmail',
    element: (
      <InvitationEmail
        inviteUrl='https://greenhouse.efeoncepro.com/auth/accept-invite?token=baseline'
        inviterName='Julio Reyes'
        clientName='Efeonce Group'
        userName='Maria Gonzalez'
        locale='es'
      />
    ),
    tokenSnippets: ['Julio Reyes', 'Efeonce Group', 'Maria', 'token=baseline']
  },
  {
    name: 'LeaveRequestDecisionEmail',
    element: (
      <LeaveRequestDecisionEmail
        memberFirstName='Maria'
        actorName='Julio Reyes'
        leaveTypeName='Vacaciones'
        startDate='2026-04-14'
        endDate='2026-04-18'
        requestedDays={5}
        status='approved'
        notes='Aprobado segun calendario del equipo.'
        locale='es'
      />
    ),
    tokenSnippets: ['Maria', 'Julio', 'Vacaciones', '5 días']
  },
  {
    name: 'LeaveRequestPendingReviewEmail',
    element: (
      <LeaveRequestPendingReviewEmail
        reviewerFirstName='Julio'
        memberName='Andres Carlosama'
        leaveTypeName='Permiso por estudio'
        startDate='2026-04-09'
        endDate='2026-04-09'
        requestedDays={0.5}
        reason='Sustentacion de trabajo de fin de master.'
        locale='es'
      />
    ),
    tokenSnippets: ['Julio', 'Andres Carlosama', 'Permiso por estudio', '0.5 días']
  },
  {
    name: 'LeaveRequestSubmittedEmail',
    element: (
      <LeaveRequestSubmittedEmail
        memberFirstName='Maria'
        leaveTypeName='Vacaciones'
        startDate='2026-04-14'
        endDate='2026-04-18'
        requestedDays={5}
        reason='Descanso programado.'
        locale='es'
      />
    ),
    tokenSnippets: ['Maria', 'Vacaciones', '5 días', 'Descanso programado']
  },
  {
    name: 'LeaveReviewConfirmationEmail',
    element: (
      <LeaveReviewConfirmationEmail
        actorFirstName='Julio'
        memberName='Maria Gonzalez'
        leaveTypeName='Vacaciones'
        startDate='2026-04-14'
        endDate='2026-04-18'
        requestedDays={5}
        status='approved'
        notes='Aprobado.'
        locale='es'
      />
    ),
    tokenSnippets: ['Julio', 'Maria Gonzalez', 'Vacaciones', 'Aprobado']
  },
  {
    name: 'MagicLinkEmail',
    element: (
      <MagicLinkEmail
        magicLinkUrl='https://greenhouse.efeoncepro.com/auth/magic-link/consume?tokenId=baseline&token=baseline'
        userName='Maria Gonzalez'
        locale='es'
        expiresInMinutes={15}
      />
    ),
    tokenSnippets: ['Maria', '15 minutos', 'token=baseline']
  },
  {
    name: 'NotificationEmail',
    element: (
      <NotificationEmail
        title='Nuevo activo disponible para revision'
        body='El equipo de diseno subio 3 nuevos archivos al proyecto Campana Q2.'
        actionUrl='https://greenhouse.efeoncepro.com/delivery'
        actionLabel='Ver en Greenhouse'
        recipientName='Maria Gonzalez'
        locale='es'
        unsubscribeUrl='https://greenhouse.efeoncepro.com/api/email/unsubscribe/baseline'
      />
    ),
    tokenSnippets: ['Nuevo activo disponible para revision', 'Maria', 'Campana Q2', 'unsubscribe/baseline']
  },
  {
    name: 'PasswordResetEmail',
    element: (
      <PasswordResetEmail
        resetUrl='https://greenhouse.efeoncepro.com/auth/reset-password?token=baseline'
        userName='Maria Gonzalez'
        locale='es'
      />
    ),
    tokenSnippets: ['Maria', 'token=baseline']
  },
  {
    name: 'PayrollExportReadyEmail',
    element: (
      <PayrollExportReadyEmail
        periodLabel='Marzo 2026'
        entryCount={4}
        breakdowns={[
          { currency: 'CLP', regimeLabel: 'Chile', grossTotal: '$832.121', netTotal: '$595.657', entryCount: 2 },
          { currency: 'USD', regimeLabel: 'Internacional', grossTotal: 'US$2,696.27', netTotal: 'US$2,696.27', entryCount: 2 }
        ]}
        netTotalDisplay='$595.657 + US$2,696.27'
        exportedBy='julio@efeoncepro.com'
        exportedAt='28 mar 2026, 13:04'
        unsubscribeUrl='https://greenhouse.efeoncepro.com/api/email/unsubscribe/payroll-export'
      />
    ),
    tokenSnippets: ['Marzo 2026', '4', 'colaboradores', '$595.657 + US$2,696.27', 'julio@efeoncepro.com']
  },
  {
    name: 'PayrollLiquidacionV2Email',
    element: (
      <PayrollLiquidacionV2Email
        fullName='Valentina Hoyos'
        periodYear={2026}
        periodMonth={3}
        previousNetTotal={1480000}
        newNetTotal={1550000}
        currency='CLP'
        receiptUrl='https://greenhouse.efeoncepro.com/my/payroll/receipts/baseline'
      />
    ),
    tokenSnippets: ['Valentina', 'Marzo 2026', '$1.480.000', '$1.550.000']
  },
  {
    name: 'PayrollPaymentCancelledEmail',
    element: (
      <PayrollPaymentCancelledEmail
        fullName='Valentina Hoyos'
        periodYear={2026}
        periodMonth={5}
        entryCurrency='CLP'
        netTotal={1480000}
        payRegime='chile'
        cancellationReason='Banco rechazo la operacion.'
      />
    ),
    tokenSnippets: ['Valentina', 'Mayo 2026', '$1.480.000', 'Banco rechazo la operacion']
  },
  {
    name: 'PayrollPaymentCommittedEmail',
    element: (
      <PayrollPaymentCommittedEmail
        fullName='Valentina Hoyos'
        periodYear={2026}
        periodMonth={5}
        entryCurrency='CLP'
        netTotal={1480000}
        payRegime='chile'
        scheduledFor='2026-05-31'
        processorLabel='Banco de Chile'
      />
    ),
    tokenSnippets: ['Valentina', 'Mayo 2026', '$1.480.000', 'Banco de Chile']
  },
  {
    name: 'PayrollReceiptEmail',
    element: (
      <PayrollReceiptEmail
        fullName='Valentina Hoyos'
        periodYear={2026}
        periodMonth={3}
        entryCurrency='CLP'
        grossTotal={832121}
        totalDeductions={236465}
        netTotal={595656}
        payRegime='chile'
      />
    ),
    tokenSnippets: ['Valentina', 'Marzo 2026', '$832.121', '$595.656']
  },
  {
    name: 'QuoteSharePromptEmail',
    element: (
      <QuoteSharePromptEmail
        shareUrl='https://greenhouse.efeoncepro.com/q/baseline'
        quotationNumber='EFG-2026-00184'
        versionNumber={2}
        clientName='Banco Industrial Latinoamericano'
        recipientName='Maria Elena Vargas'
        totalLabel='USD 184,500'
        validUntilLabel='30/05/2026'
        senderName='Julio Reyes'
        senderRole='Account Lead - Efeonce Globe'
        senderEmail='jreyes@efeoncepro.com'
        customMessage='Te comparto la propuesta revisada.'
        hasPdfAttached
        pdfFileName='EFG-2026-00184-v2.pdf'
      />
    ),
    tokenSnippets: ['EFG-2026-00184', 'Banco Industrial Latinoamericano', 'Maria', 'USD 184,500']
  },
  {
    name: 'VerifyEmail',
    element: (
      <VerifyEmail
        verifyUrl='https://greenhouse.efeoncepro.com/auth/verify-email?token=baseline'
        userName='Maria Gonzalez'
        locale='es'
      />
    ),
    tokenSnippets: ['Maria', 'token=baseline']
  },
  {
    name: 'WeeklyExecutiveDigestEmail',
    element: (
      <WeeklyExecutiveDigestEmail
        periodLabel='Semana del 8 al 14 de abril de 2026'
        totalInsights={2}
        criticalCount={1}
        warningCount={1}
        infoCount={0}
        spacesAffected={1}
        spaces={[
          {
            name: 'Banco Industrial Latinoamericano',
            href: 'https://greenhouse.efeoncepro.com/spaces/bil',
            insights: [
              {
                severity: 'critical',
                headline: 'Margen bajo umbral',
                narrative: [{ type: 'text', value: 'El margen semanal quedo bajo el umbral operativo.' }],
                actionLabel: 'Abrir espacio',
                actionUrl: 'https://greenhouse.efeoncepro.com/spaces/bil'
              },
              {
                severity: 'warning',
                headline: 'Feedback pendiente',
                narrative: [{ type: 'text', value: 'Hay aprobaciones pendientes hace mas de 48 horas.' }]
              }
            ]
          }
        ]}
        portalUrl='https://greenhouse.efeoncepro.com'
        closingNote='Resumen automatico basado en los insights materializados.'
        unsubscribeUrl='https://greenhouse.efeoncepro.com/api/email/unsubscribe/weekly'
      />
    ),
    tokenSnippets: ['Semana del 8 al 14 de abril de 2026', '2 insights', 'Banco Industrial Latinoamericano', 'Margen bajo umbral']
  }
]

describe('email template baseline snapshots', () => {
  it('keeps beneficiary payment profile emails scoped to destination account only', async () => {
    const html = await render(
      <BeneficiaryPaymentProfileChangedEmail
        fullName='Felipe Zurita'
        kind='approved'
        bankName='Banco Falabella'
        accountNumberMasked='•••• 0996'
        currency='CLP'
        effectiveAt='2026-05-14'
        reason={null}
        requestedByMember
      />
    )

    expect(html).toContain('Banco Falabella')
    expect(html).toContain('•••• 0996')
    expect(html).not.toContain('Proveedor')
    expect(html).not.toContain('santander')
  })

  it.each(EMAIL_BASELINE_CASES.map(testCase => [testCase.name, testCase] as const))(
    'renders %s without changing output',
    async (_name, { element, tokenSnippets }) => {
    const html = await render(element)

    for (const snippet of tokenSnippets) {
      expect(html).toContain(snippet)
    }

    expect(html).toMatchSnapshot()
    }
  )
})
