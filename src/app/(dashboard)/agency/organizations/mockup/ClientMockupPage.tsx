'use client'

import dynamic from 'next/dynamic'

const OrganizationListEnterpriseMockupView = dynamic(
  () => import('@/views/greenhouse/organizations/mockup/OrganizationListEnterpriseMockupView'),
  { ssr: false }
)

const OrganizationListEnterpriseMockupClientPage = () => <OrganizationListEnterpriseMockupView />

export default OrganizationListEnterpriseMockupClientPage
