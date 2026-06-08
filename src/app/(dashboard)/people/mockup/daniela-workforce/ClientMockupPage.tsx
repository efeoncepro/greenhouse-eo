'use client'

import dynamic from 'next/dynamic'

const DanielaWorkforceProfileMockupView = dynamic(
  () => import('@/views/greenhouse/people/mockup/daniela-workforce/DanielaWorkforceProfileMockupView'),
  { ssr: false }
)

const DanielaWorkforceProfileMockupClientPage = () => <DanielaWorkforceProfileMockupView />

export default DanielaWorkforceProfileMockupClientPage
