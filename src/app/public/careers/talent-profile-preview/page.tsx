import { notFound } from 'next/navigation'

import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'

import {
  CareersPublicShell,
  TalentPoolSelfServiceClient,
  type TalentPoolPublicProfile
} from '@/components/greenhouse/careers'
import { getMicrocopy, type Locale } from '@/lib/copy'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vista previa del banco de talento',
  robots: { index: false, follow: false }
}

const previewProfile: TalentPoolPublicProfile = {
  talentProfileId: 'EO-TLP-PREVIEW',
  lifecycleStatus: 'pool_eligible',
  futureConsentExpiresAt: '2027-08-16T00:00:00.000Z',
  availability: 'within_30_days',
  aggregateVersion: 2,
  access: {
    discoverable: true,
    contactable: true,
    allowedActions: ['read', 'update_availability', 'invite', 'withdraw'],
    reasonCodes: ['future_consent_current']
  },
  receipts: [
    {
      receiptId: 'EO-TPR-PREVIEW',
      purpose: 'future_opportunities',
      action: 'granted',
      occurredAt: '2026-08-16T00:00:00.000Z',
      expiresAt: '2027-08-16T00:00:00.000Z'
    }
  ]
}

export default async function TalentPoolSelfServicePreviewPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const locale = (await getLocale()) as Locale
  const copy = getMicrocopy(locale).careers

  return (
    <CareersPublicShell copy={copy} locale={locale} backHref='/public/careers' backLabel={copy.header.backToJobs}>
      <TalentPoolSelfServiceClient
        token='preview-token-never-sent'
        copy={copy}
        locale={locale}
        previewProfile={previewProfile}
      />
    </CareersPublicShell>
  )
}
