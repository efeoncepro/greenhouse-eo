'use client'

// TASK-749 — Payment Profiles Panel reutilizable.
// Patron dual-surface: este Panel se monta tanto en /finance/payment-profiles
// (modo standalone, sin filtro fijo) como dentro de Person 360 / Shareholder 360
// (modo embedded, lockeado a un beneficiary).
//
// Spec: docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md.

import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { toast } from 'sonner'

import EmptyState from '@/components/greenhouse/EmptyState'
import { DataTableShell } from '@/components/greenhouse/data-table'
import type {
  BeneficiaryPaymentProfileBeneficiaryType,
  BeneficiaryPaymentProfileSafe,
  BeneficiaryPaymentProfileStatus
} from '@/types/payment-profiles'

import CreateProfileDialog from './CreateProfileDialog'
import ProfileDetailDrawer from './ProfileDetailDrawer'

const STATUS_LABEL: Record<BeneficiaryPaymentProfileStatus, string> = {
  draft: 'Borrador',
  pending_approval: 'Pendiente aprobacion',
  active: 'Activo',
  superseded: 'Reemplazado',
  cancelled: 'Cancelado'
}

const STATUS_COLOR: Record<
  BeneficiaryPaymentProfileStatus,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  draft: 'default',
  pending_approval: 'warning',
  active: 'success',
  superseded: 'secondary',
  cancelled: 'error'
}

export interface PaymentProfilesPanelProps {
  /**
   * Cuando se entrega, el panel solo muestra perfiles de este beneficiary y
   * pre-llena el dialog de creacion. Modo embedded (Person 360 / Shareholder 360).
   * Sin esto, el panel pinta el universo (no usado actualmente — la surface ops
   * tiene su propio shell con queue/drift).
   */
  constrainedBeneficiary?: {
    beneficiaryType: BeneficiaryPaymentProfileBeneficiaryType
    beneficiaryId: string
    beneficiaryName?: string | null
    countryCode?: string | null
  }
  /**
   * Si false, el boton "+ Agregar perfil" se oculta. Util para vistas read-only
   * o cuando el contenedor maneja el flujo de creacion por su lado.
   */
  allowCreate?: boolean
  /**
   * Cuando se ejecuta una accion (crear, aprobar, cancelar, supersede), el host
   * puede querer reaccionar (ej. recargar otro panel hermano).
   */
  onActionComplete?: () => void | Promise<void>
}

const PaymentProfilesPanel = ({
  constrainedBeneficiary,
  allowCreate = true,
  onActionComplete
}: PaymentProfilesPanelProps) => {
  const [profiles, setProfiles] = useState<BeneficiaryPaymentProfileSafe[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [drawerProfileId, setDrawerProfileId] = useState<string | null>(null)

  const loadProfiles = useCallback(async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()

      params.set('limit', '200')
      params.set('status', 'all')

      if (constrainedBeneficiary) {
        params.set('beneficiaryType', constrainedBeneficiary.beneficiaryType)
        params.set('beneficiaryId', constrainedBeneficiary.beneficiaryId)
      }

      const r = await fetch(`/api/admin/finance/payment-profiles?${params.toString()}`)

      if (!r.ok) {
        const json = await r.json().catch(() => ({}))

        toast.error(json.error ?? 'No fue posible cargar los perfiles de pago')

        return
      }

      const json = await r.json()

      setProfiles(json.items ?? [])
    } catch (e) {
      console.error(e)
      toast.error('Error de red al cargar los perfiles')
    } finally {
      setLoading(false)
    }
  }, [constrainedBeneficiary])

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  const handleProfileCreated = useCallback(async () => {
    setCreateOpen(false)
    toast.success('Perfil creado. Esperando aprobacion del checker.')
    await loadProfiles()
    await onActionComplete?.()
  }, [loadProfiles, onActionComplete])

  const handleDrawerActionComplete = useCallback(async () => {
    await loadProfiles()
    await onActionComplete?.()
  }, [loadProfiles, onActionComplete])

  const headerCopy = constrainedBeneficiary
    ? {
        title: 'Perfiles de pago',
        helper:
          constrainedBeneficiary.beneficiaryType === 'member'
            ? 'Define el rail por el que se pagan las obligaciones de esta persona. Cada moneda tiene su propio perfil con maker-checker.'
            : 'Perfil de pago del accionista. Maker-checker enforced antes de activar.'
      }
    : {
        title: 'Perfiles de pago',
        helper: 'Vista universal. Click en una fila para abrir el detalle.'
      }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
        justifyContent='space-between'
      >
        <Stack spacing={0.5}>
          <Typography variant='h6'>{headerCopy.title}</Typography>
          <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 560 }}>
            {headerCopy.helper}
          </Typography>
        </Stack>
        {allowCreate ? (
          <Button
            variant='contained'
            startIcon={<i className='tabler-plus' />}
            onClick={() => setCreateOpen(true)}
          >
            Agregar perfil
          </Button>
        ) : null}
      </Stack>

      {loading ? (
        <Box sx={{ py: 2 }}>
          <LinearProgress aria-label='Cargando perfiles de pago' />
        </Box>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon='tabler-id-badge'
          title='Sin perfiles de pago todavia'
          description={
            constrainedBeneficiary
              ? 'Crea el primer perfil para definir como pagar a esta persona.'
              : 'Cuando se creen perfiles, aparecen aca.'
          }
          action={
            allowCreate ? (
              <Button
                variant='contained'
                startIcon={<i className='tabler-plus' />}
                onClick={() => setCreateOpen(true)}
              >
                Agregar perfil
              </Button>
            ) : null
          }
        />
      ) : (
        <DataTableShell
          identifier='payment-profiles-panel'
          ariaLabel='Tabla de perfiles de pago'
          stickyFirstColumn
        >
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>Moneda</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Metodo</TableCell>
                <TableCell>Cuenta</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Maker</TableCell>
                <TableCell>Checker</TableCell>
                <TableCell>Vigente desde</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profiles.map(profile => (
                <TableRow
                  key={profile.profileId}
                  hover
                  onClick={() => setDrawerProfileId(profile.profileId)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography variant='body2' fontWeight={500}>
                      {profile.currency}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {profile.providerSlug ? (
                      <Chip size='small' variant='tonal' color='info' label={profile.providerSlug} />
                    ) : (
                      <Typography variant='caption' color='text.secondary'>
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>{profile.paymentMethod ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {profile.accountNumberMasked ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      variant='tonal'
                      color={STATUS_COLOR[profile.status]}
                      label={STATUS_LABEL[profile.status]}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption' color='text.secondary'>
                      {profile.createdBy.slice(0, 12)}…
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption' color='text.secondary'>
                      {profile.approvedBy ? `${profile.approvedBy.slice(0, 12)}…` : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption' color='text.secondary'>
                      {profile.activeFrom ?? '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      )}

      <CreateProfileDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleProfileCreated}
        prefillBeneficiary={constrainedBeneficiary}
      />

      <ProfileDetailDrawer
        profileId={drawerProfileId}
        onClose={() => setDrawerProfileId(null)}
        onActionComplete={handleDrawerActionComplete}
      />
    </Stack>
  )
}

export default PaymentProfilesPanel
