'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'

import EmptyState from '@/components/greenhouse/EmptyState'
import { OperationalStatusBadge, type OperationalStatusTone } from '@/components/greenhouse/primitives'
import { GH_WORKFORCE_CONTRACTING as C } from '@/lib/copy/workforce-contracting'
import { formatDate } from '@/lib/format'
import type { CollaboratorContractingItem } from '@/lib/workforce/contracting/readers'

type Kind = 'offer_letter' | 'employment_contract'

interface Props {
  kind: Kind
  items: CollaboratorContractingItem[]
}

const CLOSED_STATUSES = ['rejected', 'expired', 'withdrawn', 'voided', 'superseded', 'signature_failed']
const DONE_STATUSES = ['accepted', 'fully_signed', 'registered_external', 'converted_to_contract']

// Collaborator-facing coarse status (groups the internal lifecycle into 4 honest buckets).
const collaboratorStatus = (
  item: CollaboratorContractingItem
): { label: string; tone: OperationalStatusTone } => {
  const { status, signatureReadinessStatus: sig } = item

  if (CLOSED_STATUSES.includes(status)) return { label: C.collaborator.statusClosed, tone: 'secondary' }
  if (status === 'active') return { label: C.collaborator.statusActive, tone: 'success' }
  if (DONE_STATUSES.includes(status)) return { label: C.collaborator.statusDone, tone: 'success' }

  if (sig === 'pending_signature' || ['sent_for_signature', 'partially_signed', 'sent', 'viewed'].includes(status)) {
    return { label: C.collaborator.statusPendingSignature, tone: 'warning' }
  }

  if (sig === 'ready_for_signature' || sig === 'ready_for_pdf') {
    return { label: C.collaborator.statusReadyToSign, tone: 'info' }
  }

  return { label: C.collaborator.statusPreparing, tone: 'secondary' }
}

const MyContractingDocumentsView = ({ kind, items }: Props) => {
  const theme = useTheme()
  const isOffer = kind === 'offer_letter'

  const title = isOffer ? C.collaborator.offersTitle : C.collaborator.contractsTitle
  const subtitle = isOffer ? C.collaborator.offersSubtitle : C.collaborator.contractsSubtitle
  const kindLabel = isOffer ? C.kindLabels.offer_letter : C.kindLabels.employment_contract

  return (
    <Stack spacing={{ xs: 3, md: 4 }} data-capture='my-contracting-documents'>
      <Box>
        <Typography variant='h4'>{title}</Typography>
        <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 640 }}>
          {subtitle}
        </Typography>
      </Box>

      {items.length === 0 ? (
        <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
          <CardContent>
            <EmptyState
              icon={isOffer ? 'tabler-file-text' : 'tabler-file-certificate'}
              title={isOffer ? C.collaborator.emptyOffersTitle : C.collaborator.emptyContractsTitle}
              description={isOffer ? C.collaborator.emptyOffersBody : C.collaborator.emptyContractsBody}
            />
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {items.map(item => {
            const statusMeta = collaboratorStatus(item)
            const signable = item.signatureReadinessStatus === 'ready_for_signature' || item.signatureReadinessStatus === 'pending_signature'
            const signed = item.signatureReadinessStatus === 'signed'

            return (
              <Card key={item.caseId} sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2} alignItems={{ md: 'center' }}>
                    <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
                      <CustomAvatar skin='light' color={statusMeta.tone === 'secondary' ? 'secondary' : statusMeta.tone} variant='rounded'>
                        <i className={isOffer ? 'tabler-file-text' : 'tabler-file-certificate'} aria-hidden='true' />
                      </CustomAvatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant='subtitle1'>{kindLabel}</Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {C.detail.notAvailable === item.updatedAt ? '' : `Actualizado ${formatDate(item.updatedAt, { day: '2-digit', month: 'short', year: 'numeric' }, 'es-CL')}`}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
                      <OperationalStatusBadge tone={statusMeta.tone} label={statusMeta.label} />
                      <OperationalStatusBadge tone='success' label={C.collaborator.bilingual} icon='tabler-language' />
                    </Stack>
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} spacing={1.5}>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <i className='tabler-lock' aria-hidden='true' /> {C.collaborator.readOnlyNote}
                    </Typography>
                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                      {signed ? (
                        <Button size='small' variant='outlined' disabled startIcon={<i className='tabler-download' aria-hidden='true' />}>
                          {C.collaborator.downloadSigned} · {C.collaborator.comingSoon}
                        </Button>
                      ) : signable ? (
                        <Button size='small' variant='contained' disabled startIcon={<i className='tabler-writing-sign' aria-hidden='true' />}>
                          {C.collaborator.openSignature} · {C.collaborator.comingSoon}
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}
    </Stack>
  )
}

export default MyContractingDocumentsView
