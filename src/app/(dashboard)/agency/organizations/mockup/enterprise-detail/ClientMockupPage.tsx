'use client'

import dynamic from 'next/dynamic'

const OrganizationWorkspaceEnterpriseDetailMockupView = dynamic(
  () => import('@/views/greenhouse/organizations/mockup/OrganizationWorkspaceEnterpriseDetailMockupView'),
  { ssr: false }
)

const OrganizationWorkspaceEnterpriseDetailMockupClientPage = () => <OrganizationWorkspaceEnterpriseDetailMockupView />

export default OrganizationWorkspaceEnterpriseDetailMockupClientPage
