'use client'

// TASK-749 — Tab "Pago" en Person 360.
// Fuente PRIMARIA del Beneficiary Payment Profile del miembro. CRUD completo
// (crear, editar, aprobar, cancelar, revelar sensible) — todo via el componente
// reutilizable <PaymentProfilesPanel> en modo embedded (cards expandidos).
//
// Spec: docs/mockups/payment-profiles-dual-mockup.html (Surface 1).

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

import PaymentProfilesPanel from '@views/greenhouse/finance/payment-profiles/PaymentProfilesPanel'
import type { PersonDetail } from '@/types/people'

interface PersonPaymentTabProps {
  detail: PersonDetail
}

const PersonPaymentTab = ({ detail }: PersonPaymentTabProps) => {
  const { member } = detail

  return (
    <Card elevation={0} sx={theme => ({ border: `1px solid ${theme.palette.divider}` })}>
      <CardHeader
        title='Perfiles de pago'
        subheader='Define el rail por el que se pagan las obligaciones de esta persona. Cada moneda tiene su propio perfil con maker-checker.'
      />
      <CardContent>
        <PaymentProfilesPanel
          constrainedBeneficiary={{
            beneficiaryType: 'member',
            beneficiaryId: member.memberId,
            beneficiaryName: member.displayName,
            countryCode: member.profile?.locationCountry ?? null
          }}
        />
      </CardContent>
    </Card>
  )
}

export default PersonPaymentTab
