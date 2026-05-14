'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import { ROLE_CODES } from '@/config/role-codes'
import type { PersonDetail, PersonDetailAssignment } from '@/types/people'

import CompensationDrawer, { type CompensationSavePayload } from '@views/greenhouse/payroll/CompensationDrawer'
import CompleteIntakeDrawer, {
  type CompleteIntakeDrawerMember
} from '@views/greenhouse/admin/workforce-activation/CompleteIntakeDrawer'
import EditProfileDrawer from './drawers/EditProfileDrawer'
import AddPersonMembershipDrawer from './drawers/AddPersonMembershipDrawer'
import EditPersonMembershipDrawer, { type MembershipRowData } from './drawers/EditPersonMembershipDrawer'
import PersonProfileHeader from './PersonProfileHeader'
import PersonTabs from './PersonTabs'

type Props = {
  memberId: string
}

const PersonView = ({ memberId }: Props) => {
  const { data: session } = useSession()
  const [detail, setDetail] = useState<PersonDetail | null>(null)
  const [loading, setLoading] = useState(true)

  // Admin drawer state
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [compensationOpen, setCompensationOpen] = useState(false)
  const [completeIntakeOpen, setCompleteIntakeOpen] = useState(false)
  const [membershipDrawerOpen, setMembershipDrawerOpen] = useState(false)
  const [editMembership, setEditMembership] = useState<{ membership: MembershipRowData; assignment?: PersonDetailAssignment } | null>(null)
  const [membershipReloadKey, setMembershipReloadKey] = useState(0)

  const isAdmin = session?.user?.roleCodes?.includes(ROLE_CODES.EFEONCE_ADMIN) ?? false

  // TASK-873 Slice 3 — espejo client-side del gate runtime.ts (Slice 1):
  // `hasRouteGroup(subject, 'hr') || hasRole(EFEONCE_ADMIN) || hasRole(FINANCE_ADMIN)`.
  // El endpoint backend revalida la capability vía `can()` server-side, por
  // lo que este check es solo para esconder el botón a roles sin permiso;
  // un click optimista del usuario sin capability igualmente recibe 403
  // con copy redacted via toast canonical (drawer maneja el branching).
  const roleCodes = session?.user?.roleCodes ?? []
  const routeGroups = session?.user?.routeGroups ?? []

  const canCompleteIntake =
    routeGroups.includes('hr') ||
    roleCodes.includes(ROLE_CODES.EFEONCE_ADMIN) ||
    roleCodes.includes(ROLE_CODES.FINANCE_ADMIN)

  const loadDetail = useCallback(async () => {
    const res = await fetch(`/api/people/${memberId}`)

    if (res.ok) {
      setDetail(await res.json())
    }
  }, [memberId])

  useEffect(() => {
    const load = async () => {
      await loadDetail()
      setLoading(false)
    }

    load()
  }, [loadDetail])

  const handleDeactivate = async () => {
    if (!detail) return

    setDeactivating(true)

    try {
      const res = await fetch(`/api/admin/team/members/${detail.member.memberId}/deactivate`, { method: 'POST' })

      if (res.ok) {
        toast.success(`${detail.member.displayName} fue desactivado`)
        await loadDetail()
      } else {
        const data = await res.json().catch(() => ({}))

        toast.error(data.error || 'Error al desactivar colaborador')
      }
    } catch {
      toast.error('Error de conexión al desactivar')
    } finally {
      setDeactivating(false)
    }
  }

  const handleEditProfileSuccess = async () => {
    toast.success('Perfil actualizado')
    await loadDetail()
  }

  const handleMembershipSuccess = async () => {
    toast.success('Vinculado a la organización.')
    setMembershipReloadKey(k => k + 1)
    await loadDetail()
  }

  const handleEditMembershipSuccess = async () => {
    toast.success('Membresía actualizada.')
    setMembershipReloadKey(k => k + 1)
    await loadDetail()
  }

  const handleSaveCompensation = async ({ mode, input, versionId }: CompensationSavePayload) => {
    const isUpdate = mode === 'update' && versionId

    const res = await fetch(isUpdate ? `/api/hr/payroll/compensation/${versionId}` : '/api/hr/payroll/compensation', {
      method: isUpdate ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))

      throw new Error(data.error || 'Error al guardar compensación')
    }

    toast.success(isUpdate ? 'Compensación actualizada' : 'Nueva versión de compensación creada')
    await loadDetail()
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!detail) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color='text.secondary'>No se encontró este colaborador.</Typography>
        <Button component={Link} href='/people' variant='tonal' sx={{ mt: 2 }}>
          Volver al equipo
        </Button>
      </Box>
    )
  }

  return (
    <>
      {/* Full-width layout: header → tabs → content */}
      <Stack spacing={6}>
        <PersonProfileHeader
          detail={detail}
          isAdmin={isAdmin}
          onEditProfile={() => setEditProfileOpen(true)}
          onDeactivate={() => setDeactivateConfirmOpen(true)}
          onEditCompensation={() => setCompensationOpen(true)}
          canCompleteIntake={canCompleteIntake}
          onCompleteIntake={() => setCompleteIntakeOpen(true)}
        />
        <PersonTabs
          detail={detail}
          isAdmin={isAdmin}
          membershipReloadKey={membershipReloadKey}
          onNewMembership={() => setMembershipDrawerOpen(true)}
          onEditMembership={(membership, assignment) => setEditMembership({ membership, assignment })}
          onEditCompensation={isAdmin ? () => setCompensationOpen(true) : undefined}
        />
      </Stack>

      {canCompleteIntake && (
        <CompleteIntakeDrawer
          open={completeIntakeOpen}
          member={
            detail.member.workforceIntakeStatus &&
            detail.member.workforceIntakeStatus !== 'completed'
              ? ({
                  memberId: detail.member.memberId,
                  displayName: detail.member.displayName,
                  primaryEmail: detail.member.publicEmail || detail.member.internalEmail,
                  workforceIntakeStatus: detail.member.workforceIntakeStatus,
                  identityProfileId: detail.member.identityProfileId,
                  createdAt: null,
                  ageDays: null
                } satisfies CompleteIntakeDrawerMember)
              : null
          }
          onClose={() => setCompleteIntakeOpen(false)}
          onCompleted={async () => {
            await loadDetail()
          }}
        />
      )}
      {isAdmin && (
        <>
          <EditProfileDrawer
            open={editProfileOpen}
            member={detail.member}
            onClose={() => setEditProfileOpen(false)}
            onSuccess={handleEditProfileSuccess}
          />
          <CompensationDrawer
            open={compensationOpen}
            onClose={() => setCompensationOpen(false)}
            existingVersion={detail.currentCompensation ?? null}
            memberId={detail.member.memberId}
            memberName={detail.member.displayName}
            onSave={handleSaveCompensation}
          />
          <AddPersonMembershipDrawer
            open={membershipDrawerOpen}
            memberId={detail.member.memberId}
            memberName={detail.member.displayName}
            onClose={() => setMembershipDrawerOpen(false)}
            onSuccess={handleMembershipSuccess}
          />
          <EditPersonMembershipDrawer
            open={!!editMembership}
            memberId={detail.member.memberId}
            membership={editMembership?.membership ?? null}
            assignment={editMembership?.assignment}
            onClose={() => setEditMembership(null)}
            onSuccess={handleEditMembershipSuccess}
          />
          <ConfirmDialog
            open={deactivateConfirmOpen}
            setOpen={setDeactivateConfirmOpen}
            title={`¿Desactivar a ${detail.member.displayName}?`}
            description='Esta acción marcará al colaborador como inactivo. No podrá ser asignado a nuevas cuentas.'
            confirmLabel='Desactivar'
            confirmColor='error'
            loading={deactivating}
            onConfirm={handleDeactivate}
          />
        </>
      )}
    </>
  )
}

export default PersonView
