import { notFound } from 'next/navigation'

import type { Metadata } from 'next'

import TalentPoolDeskView from '@/views/greenhouse/hiring/TalentPoolDeskView'
import { getMicrocopy } from '@/lib/copy'
import type { HiringApplicationDocumentsViewModel } from '@/lib/hiring/documents'
import type { SearchTalentPoolResult, TalentPoolProfileDto } from '@/lib/hiring/talent-pool'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Banco de talento — evidencia visual segura | Greenhouse',
  robots: { index: false, follow: false }
}

const observedAt = '2026-08-15T14:00:00.000Z'
const freshUntil = '2027-02-15T14:00:00.000Z'

const buildProfile = (
  id: string,
  displayName: string,
  applicationRef: string,
  capabilityKey: string,
  seniority: string,
  countryCode: string,
  availability: string,
  resultBand: string
): TalentPoolProfileDto => ({
  talentProfileId: id,
  displayName,
  lifecycleStatus: 'pool_eligible',
  aggregateVersion: 3,
  futureConsentExpiresAt: '2027-08-15T14:00:00.000Z',
  availability,
  seniority,
  countryCode,
  access: {
    discoverable: true,
    contactable: true,
    allowedActions: ['read', 'update_availability', 'invite', 'withdraw'],
    reasonCodes: ['future_consent_current']
  },
  evidenceCoverage: 'structured',
  evidenceFreshness: 'current',
  evidence: [
    {
      sourceType: 'assessment_competency',
      sourceRef: `assessment:${id}`,
      applicationRef,
      capabilityKey,
      seniority,
      languageCode: 'es',
      countryCode,
      availability,
      evidenceState: 'evaluated',
      resultBand,
      observedAt,
      freshUntil,
      isStale: false
    }
  ],
  updatedAt: observedAt
})

const profiles: TalentPoolProfileDto[] = [
  buildProfile(
    'EO-TLP-DEMO-01',
    'Andrea Campos',
    'EO-HAPP-DEMO-01',
    'account_management',
    'Senior',
    'CL',
    'inmediata',
    'evidencia sólida'
  ),
  buildProfile(
    'EO-TLP-DEMO-02',
    'Diego Fuentes',
    'EO-HAPP-DEMO-02',
    'content_strategy',
    'Mid',
    'CO',
    '15 días',
    'evidencia consistente'
  ),
  buildProfile(
    'EO-TLP-DEMO-03',
    'Valentina Cruz',
    'EO-HAPP-DEMO-03',
    'client_success',
    'Senior',
    'PE',
    '30 días',
    'evidencia sólida'
  ),
  buildProfile(
    'EO-TLP-DEMO-04',
    'Matías Silva',
    'EO-HAPP-DEMO-04',
    'content_creation',
    'Mid',
    'CL',
    'inmediata',
    'evidencia consistente'
  )
]

const initialResult: SearchTalentPoolResult = { items: profiles, nextCursor: null }

const previewDocuments: Record<string, HiringApplicationDocumentsViewModel> = Object.fromEntries(
  profiles.map((profile, index) => {
    const applicationId = profile.evidence[0]?.applicationRef ?? `EO-HAPP-DEMO-${index + 1}`

    return [
      applicationId,
      {
        applicationId,
        candidateFacetId: `EO-HCF-DEMO-${index + 1}`,
        files: [
          {
            rowKey: `EO-ASSET-DEMO-${index + 1}`,
            kind: 'cv',
            fileName: `cv-ejemplo-${index + 1}.pdf`,
            mimeType: 'application/pdf',
            sizeBytes: 148_000,
            uploadedAt: observedAt,
            status: 'available',
            openHref: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCg==',
            downloadHref: null
          }
        ],
        links: [],
        quarantinedCount: 0
      }
    ]
  })
)

export default function TalentPoolSafeEvidencePage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  return (
    <TalentPoolDeskView
      copy={getMicrocopy('es-CL').hiringDesk}
      initialResult={initialResult}
      initialFilters={{ query: '', capability: '', seniority: '', language: '', country: '', availability: '' }}
      openings={[
        {
          openingId: 'EO-HOPEN-DEMO-01',
          label: profiles[0]?.evidence[0]?.capabilityKey ?? '',
          status: 'active'
        },
        {
          openingId: 'EO-HOPEN-DEMO-02',
          label: profiles[1]?.evidence[0]?.capabilityKey ?? '',
          status: 'active'
        }
      ]}
      readEnabled
      inviteEnabled
      canInvite
      previewDocuments={previewDocuments}
    />
  )
}
