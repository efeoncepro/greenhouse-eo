'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import ExecutiveMiniStatCard from '@/components/greenhouse/ExecutiveMiniStatCard'
import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import type {
  OrganizationBrandAssetReviewCandidate,
  OrganizationBrandAssetReviewItem,
  OrganizationBrandAssetReviewOverview
} from '@/lib/account-360/organization-brand-assets'
import { getMicrocopy } from '@/lib/copy'

type Props = {
  overview: OrganizationBrandAssetReviewOverview
}

type BusyState = {
  key: string
  message: string
} | null

const sourceLabel: Record<OrganizationBrandAssetReviewCandidate['source'], string> = {
  hubspot_company: 'HubSpot',
  website_metadata: 'Sitio web',
  manual_upload: 'Manual',
  operator_url: 'URL'
}

const statusTone = (status: OrganizationBrandAssetReviewCandidate['status']) => {
  if (status === 'pending_review') return 'warning'
  if (status === 'failed') return 'error'
  if (status === 'accepted') return 'success'

  return 'default'
}

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'OR'

const apiJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers || {})
    }
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Request failed')
  }

  return payload as T
}

const AdminOrganizationLogoReviewView = ({ overview: initialOverview }: Props) => {
  const actionCopy = getMicrocopy().actions
  const [overview, setOverview] = useState(initialOverview)
  const [busy, setBusy] = useState<BusyState>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null)
  const [urlDrafts, setUrlDrafts] = useState<Record<string, string>>({})

  const coverage = useMemo(() => {
    if (overview.totals.nonOperatingOrganizations === 0) return 100

    return Math.round((overview.totals.withLogo / overview.totals.nonOperatingOrganizations) * 100)
  }, [overview.totals.nonOperatingOrganizations, overview.totals.withLogo])

  const refreshOverview = async () => {
    const next = await apiJson<OrganizationBrandAssetReviewOverview>('/api/admin/data-quality/organization-logos?limit=120')

    setOverview(next)
  }

  const runAction = async (key: string, message: string, action: () => Promise<void>) => {
    setBusy({ key, message })
    setNotice(null)

    try {
      await action()
      await refreshOverview()
      setNotice({ tone: 'success', message: 'Cola actualizada.' })
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'No se pudo completar la acción.' })
    } finally {
      setBusy(null)
    }
  }

  const uploadCandidate = async (item: OrganizationBrandAssetReviewItem, file: File | null) => {
    if (!file) return

    await runAction(`upload:${item.organizationId}`, 'Subiendo logo...', async () => {
      const form = new FormData()

      form.append('file', file)
      form.append('contextType', 'organization_logo_draft')
      form.append('metadataLabel', `Logo candidato ${item.organizationName}`)

      const uploaded = await apiJson<{ asset: { assetId: string } }>('/api/assets/private', {
        method: 'POST',
        body: form
      })

      await apiJson('/api/admin/data-quality/organization-logos/candidates', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: item.organizationId,
          assetId: uploaded.asset.assetId
        })
      })
    })
  }

  const createUrlCandidate = async (item: OrganizationBrandAssetReviewItem) => {
    const sourceUrl = urlDrafts[item.organizationId]?.trim()

    if (!sourceUrl) {
      setNotice({ tone: 'info', message: 'Ingresa una URL de imagen antes de crear el candidato.' })

      return
    }

    await runAction(`url:${item.organizationId}`, 'Leyendo imagen...', async () => {
      await apiJson('/api/admin/data-quality/organization-logos/candidates', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'operator_url',
          organizationId: item.organizationId,
          sourceUrl
        })
      })
      setUrlDrafts(current => ({ ...current, [item.organizationId]: '' }))
    })
  }

  const discoverCandidates = async (item: OrganizationBrandAssetReviewItem) => {
    await runAction(`discover:${item.organizationId}`, 'Buscando candidato...', async () => {
      await apiJson('/api/admin/data-quality/organization-logos/discover', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: item.organizationId,
          limit: 1
        })
      })
    })
  }

  const acceptCandidate = async (
    item: OrganizationBrandAssetReviewItem,
    candidate: OrganizationBrandAssetReviewCandidate
  ) => {
    if (!candidate.assetId) {
      setNotice({ tone: 'error', message: 'El candidato no tiene asset asociado.' })

      return
    }

    await runAction(`accept:${candidate.candidateId}`, 'Aplicando logo...', async () => {
      await apiJson(`/api/organizations/${encodeURIComponent(item.organizationId)}/brand-assets/logo`, {
        method: 'POST',
        body: JSON.stringify({
          assetId: candidate.assetId,
          candidateId: candidate.candidateId,
          reason: `TASK-999 ${sourceLabel[candidate.source]} review`
        })
      })
    })
  }

  const rejectCandidate = async (candidate: OrganizationBrandAssetReviewCandidate) => {
    await runAction(`reject:${candidate.candidateId}`, 'Rechazando candidato...', async () => {
      await apiJson(`/api/admin/data-quality/organization-logos/candidates/${encodeURIComponent(candidate.candidateId)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'reject',
          reason: 'Rechazado desde la cola TASK-999'
        })
      })
    })
  }

  return (
    <Stack spacing={4} data-capture='organization-logo-review-queue'>
      <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'flex-start' }} spacing={2}>
          <Box>
            <Typography variant='h4'>Logos de organizaciones</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1, maxInlineSize: 760 }}>
              Cola de revisión para logos comerciales de organizaciones no legales. Efeonce, operating entities y logos institucionales quedan protegidos por guard server-side.
            </Typography>
          </Box>
          <GreenhouseButton
            kind='primaryAction'
            variant='solid'
            tone='primary'
            size='small'
            leadingIconClassName='tabler-refresh'
            disabled={Boolean(busy)}
            onClick={() => runAction('refresh', 'Actualizando cola...', refreshOverview)}
          >
            Actualizar
          </GreenhouseButton>
        </Stack>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        <ExecutiveMiniStatCard
          eyebrow='Cobertura'
          tone={coverage === 100 ? 'success' : 'info'}
          title='Logo comercial'
          value={`${coverage}%`}
          detail={`${overview.totals.withLogo} de ${overview.totals.nonOperatingOrganizations} organizaciones no legales.`}
          icon='tabler-photo-check'
        />
        <ExecutiveMiniStatCard
          eyebrow='Pendientes'
          tone='error'
          title='Sin logo'
          value={String(overview.totals.missingLogo)}
          detail='Organizaciones no-operating sin asset canónico.'
          icon='tabler-alert-circle'
        />
        <ExecutiveMiniStatCard
          eyebrow='Review'
          tone='info'
          title='Candidatos'
          value={String(overview.totals.pendingCandidates)}
          detail='Listos para aceptar o rechazar.'
          icon='tabler-clipboard-check'
        />
        <ExecutiveMiniStatCard
          eyebrow='Protegidas'
          tone='success'
          title='Operating entities'
          value={String(overview.totals.protectedOperatingEntities)}
          detail='Fuera del flujo de enriquecimiento.'
          icon='tabler-shield-lock'
        />
      </Box>

      {busy && (
        <Alert severity='info' icon={<Box component='i' className='tabler-loader-2' aria-hidden />}>
          {busy.message}
          <LinearProgress sx={{ mt: 1 }} />
        </Alert>
      )}

      {notice && <Alert severity={notice.tone}>{notice.message}</Alert>}

      {overview.items.length === 0 ? (
        <Card variant='outlined'>
          <CardContent>
            <Stack alignItems='center' spacing={1.5} sx={{ py: 4, textAlign: 'center' }}>
              <Box component='i' className='tabler-circle-check' sx={{ fontSize: 48, color: 'success.main' }} aria-hidden />
              <Typography variant='h6'>No hay logos pendientes de revisión.</Typography>
              <Typography variant='body2' color='text.secondary'>
                Las organizaciones no legales tienen logo canónico o no requieren acción en este momento.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2.5}>
          {overview.items.map(item => (
            <Card key={item.organizationId} variant='outlined'>
              <CardContent>
                <Stack spacing={3}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2}>
                    <Stack direction='row' spacing={2} alignItems='center'>
                      <Avatar
                        src={item.logoUrl || undefined}
                        alt=''
                        sx={{
                          inlineSize: 52,
                          blockSize: 52,
                          bgcolor: 'action.selected',
                          color: 'text.primary',
                          fontWeight: 700
                        }}
                      >
                        {getInitials(item.organizationName)}
                      </Avatar>
                      <Box>
                        <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                          <Typography variant='h6'>{item.organizationName}</Typography>
                          <GreenhouseChip
                            size='small'
                            kind='status'
                            variant='label'
                            tone={item.logoAssetId ? 'success' : 'warning'}
                            label={item.logoAssetId ? 'Con logo' : 'Sin logo'}
                          />
                        </Stack>
                        <Typography variant='caption' color='text.secondary'>
                          {item.publicId || item.organizationId}
                          {item.websiteUrl ? ` · ${item.websiteUrl}` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                      <GreenhouseButton
                        component='label'
                        kind='primaryAction'
                        variant='solid'
                        tone='primary'
                        size='small'
                        leadingIconClassName='tabler-upload'
                        disabled={Boolean(busy)}
                      >
                        Subir logo
                        <Box
                          component='input'
                          type='file'
                          accept='image/png,image/jpeg,image/webp'
                          sx={{ display: 'none' }}
                          onChange={event => {
                            const file = event.currentTarget.files?.[0] ?? null

                            event.currentTarget.value = ''
                            void uploadCandidate(item, file)
                          }}
                        />
                      </GreenhouseButton>
                      {item.websiteUrl && (
                        <GreenhouseButton
                          kind='primaryAction'
                          variant='solid'
                          tone='primary'
                          size='small'
                          leadingIconClassName='tabler-sparkles'
                          disabled={Boolean(busy)}
                          onClick={() => void discoverCandidates(item)}
                        >
                          {actionCopy.search}
                        </GreenhouseButton>
                      )}
                    </Stack>
                  </Stack>

                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
                    <TextField
                      size='small'
                      label='URL de imagen'
                      value={urlDrafts[item.organizationId] ?? ''}
                      onChange={event => setUrlDrafts(current => ({ ...current, [item.organizationId]: event.target.value }))}
                      fullWidth
                    />
                    <GreenhouseButton
                      kind='primaryAction'
                      variant='solid'
                      tone='primary'
                      size='small'
                      leadingIconClassName='tabler-link-plus'
                      disabled={Boolean(busy)}
                      onClick={() => void createUrlCandidate(item)}
                    >
                      Crear candidato
                    </GreenhouseButton>
                  </Stack>

                  <Divider />

                  {item.pendingCandidates.length === 0 ? (
                    <Typography variant='body2' color='text.secondary'>
                      No hay candidatos pendientes para esta organización.
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gap: 2,
                        gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }
                      }}
                    >
                      {item.pendingCandidates.map(candidate => (
                        <Box
                          key={candidate.candidateId}
                          sx={theme => ({
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1,
                            p: 2,
                            display: 'grid',
                            gap: 2,
                            gridTemplateColumns: { xs: '1fr', sm: '96px minmax(0, 1fr)' },
                            alignItems: 'center'
                          })}
                        >
                          <Box
                            sx={{
                              inlineSize: 96,
                              blockSize: 96,
                              borderRadius: 1,
                              bgcolor: 'action.hover',
                              display: 'grid',
                              placeItems: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            {candidate.assetUrl ? (
                              <Box
                                component='img'
                                src={candidate.assetUrl}
                                alt=''
                                sx={{ maxInlineSize: '100%', maxBlockSize: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <Box component='i' className='tabler-photo-off' sx={{ fontSize: 28, color: 'text.disabled' }} aria-hidden />
                            )}
                          </Box>
                          <Stack spacing={1}>
                            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                              <GreenhouseChip
                                size='small'
                                kind='status'
                                variant='label'
                                tone={statusTone(candidate.status)}
                                label={candidate.status === 'pending_review' ? 'Pendiente' : 'Falló'}
                              />
                              <GreenhouseChip
                                size='small'
                                kind='attribute'
                                variant='outlined'
                                tone='default'
                                label={sourceLabel[candidate.source]}
                              />
                              {candidate.confidence !== null && (
                                <GreenhouseChip
                                  size='small'
                                  kind='metric'
                                  variant='outlined'
                                  tone='info'
                                  label={`${Math.round(candidate.confidence * 100)}%`}
                                />
                              )}
                            </Stack>
                            <Tooltip title={candidate.sourceUrl || candidate.candidateId} arrow>
                              <Typography variant='caption' color='text.secondary' noWrap>
                                {candidate.sourceUrl || candidate.candidateId}
                              </Typography>
                            </Tooltip>
                            {candidate.rejectionReason && (
                              <Typography variant='caption' color='error.main'>
                                {candidate.rejectionReason}
                              </Typography>
                            )}
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                              <GreenhouseButton
                                kind='primaryAction'
                                size='small'
                                leadingIconClassName='tabler-check'
                                disabled={Boolean(busy) || candidate.status !== 'pending_review' || !candidate.assetId}
                                onClick={() => void acceptCandidate(item, candidate)}
                              >
                                {actionCopy.approve}
                              </GreenhouseButton>
                              <GreenhouseButton
                                kind='destructiveAction'
                                variant='label'
                                size='small'
                                leadingIconClassName='tabler-x'
                                disabled={Boolean(busy) || candidate.status !== 'pending_review'}
                                onClick={() => void rejectCandidate(candidate)}
                              >
                                {actionCopy.reject}
                              </GreenhouseButton>
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  )
}

export default AdminOrganizationLogoReviewView
