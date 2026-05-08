'use client'

import { useSession } from 'next-auth/react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

import { ROLE_CODES } from '@/config/role-codes'

import OrganizationPeopleTab from '@/views/greenhouse/organizations/tabs/OrganizationPeopleTab'
import OrganizationProjectsTab from '@/views/greenhouse/organizations/tabs/OrganizationProjectsTab'

import type { FacetContentProps } from '@/components/greenhouse/organization-workspace/types'

import useOrganizationDetail from './use-organization-detail'

/**
 * TASK-612 — Team facet (people + projects associated to the organization).
 *
 * Wrappea los legacy tabs `OrganizationPeopleTab` + `OrganizationProjectsTab`
 * en un único stack para coherencia visual con el shell.
 *
 * Add-membership drawer NO se cablea desde acá: es responsabilidad del page-level
 * provider del workspace en futuras iteraciones. V1 deshabilita el botón pasando
 * un onAddMembership noop — admins pueden seguir usando la legacy view detrás
 * del flag mientras se planea el wire-up.
 */

const TeamFacet = ({ organizationId }: FacetContentProps) => {
  const { data: session } = useSession()
  const isAdmin = session?.user?.roleCodes?.includes(ROLE_CODES.EFEONCE_ADMIN) ?? false
  const detailState = useOrganizationDetail(organizationId)

  return (
    <Stack spacing={6}>
      <OrganizationPeopleTab
        organizationId={organizationId}
        isAdmin={isAdmin}
        onAddMembership={() => {
          // V1: no-op. Add-membership flow vive en legacy view detrás del flag.
        }}
      />
      {detailState.status === 'ready' && (
        <Box>
          <OrganizationProjectsTab detail={detailState.detail} />
        </Box>
      )}
    </Stack>
  )
}

export default TeamFacet
