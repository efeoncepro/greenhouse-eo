'use client'

import { useState } from 'react'

import { useSession } from 'next-auth/react'

import { toast } from 'sonner'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'

import { ROLE_CODES } from '@/config/role-codes'

import OrganizationPeopleTab from '@/views/greenhouse/organizations/tabs/OrganizationPeopleTab'
import OrganizationProjectsTab from '@/views/greenhouse/organizations/tabs/OrganizationProjectsTab'
import AddMembershipDrawer from '@/views/greenhouse/organizations/drawers/AddMembershipDrawer'

import type { FacetContentProps } from '@/components/greenhouse/organization-workspace/types'

import useOrganizationDetail from './use-organization-detail'

/**
 * TASK-612 — Team facet (people + projects associated to the organization).
 *
 * Wrappea los legacy tabs `OrganizationPeopleTab` + `OrganizationProjectsTab`
 * en un único stack para coherencia visual con el shell.
 *
 * Add-membership drawer **wireado canónicamente** (ISSUE post V3 fix): el
 * facet maneja su propio state del drawer + `useOrganizationDetail.refresh`
 * para forzar re-fetch post-success. Mismo patrón que el legacy
 * `OrganizationView` (`addMembershipOpen` + `handleMembershipSuccess`),
 * preservado dentro del shell V2.
 *
 * El drawer es self-contained — el caller solo provee `organizationId` y
 * `spaces`. La toast notification + refresh son responsabilidad del facet.
 */

const TeamFacet = ({ organizationId }: FacetContentProps) => {
  const { data: session } = useSession()
  const isAdmin = session?.user?.roleCodes?.includes(ROLE_CODES.EFEONCE_ADMIN) ?? false
  const detailState = useOrganizationDetail(organizationId)

  const [addMembershipOpen, setAddMembershipOpen] = useState(false)

  const handleMembershipSuccess = () => {
    toast.success('Persona agregada a la organización.')
    detailState.refresh()
    setAddMembershipOpen(false)
  }

  return (
    <Stack spacing={6}>
      <OrganizationPeopleTab
        organizationId={organizationId}
        isAdmin={isAdmin}
        onAddMembership={() => setAddMembershipOpen(true)}
      />
      {detailState.status === 'ready' && (
        <Box>
          <OrganizationProjectsTab detail={detailState.detail} />
        </Box>
      )}
      <AddMembershipDrawer
        open={addMembershipOpen}
        organizationId={organizationId}
        spaces={detailState.status === 'ready' ? detailState.detail.spaces : null}
        onClose={() => setAddMembershipOpen(false)}
        onSuccess={handleMembershipSuccess}
      />
    </Stack>
  )
}

export default TeamFacet
