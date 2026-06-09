'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import { GreenhouseButton, GreenhouseChip, GreenhouseFloatingSurface } from '@/components/greenhouse/primitives'
import { GH_ORGANIZATION_WORKSPACE } from '@/lib/copy/agency'
import { getMicrocopy } from '@/lib/copy'

type Props = {
  organizationId: string
  organizationName: string
  logoUrl?: string | null
  fallbackInitials: string
  editable: boolean
  isOperatingEntity?: boolean
  size?: number
  onUpdated?: () => void | Promise<void>
}

type ApplyCandidateResponse = {
  candidate_id?: string
  asset_id?: string | null
}

const applyLogoAsset = async ({
  organizationId,
  assetId,
  candidateId,
  reason
}: {
  organizationId: string
  assetId: string
  candidateId?: string | null
  reason: string
}) => {
  const response = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/brand-assets/logo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetId,
      candidateId: candidateId || null,
      reason
    })
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : GH_ORGANIZATION_WORKSPACE.shell.actions.logoUpdateFailed)
  }
}

const OrganizationLogoAvatarEditor = ({
  organizationId,
  organizationName,
  logoUrl,
  fallbackInitials,
  editable,
  isOperatingEntity,
  size = 56,
  onUpdated
}: Props) => {
  const actionCopy = getMicrocopy().actions
  const copy = GH_ORGANIZATION_WORKSPACE.shell.actions
  const [busy, setBusy] = useState<string | null>(null)
  const [logoUrlDraft, setLogoUrlDraft] = useState('')
  const [aiHint, setAiHint] = useState('')
  const [uploadedLogo, setUploadedLogo] = useState<UploadedFileValue | null>(null)

  const footerCopy = isOperatingEntity
    ? copy.logoEditorProtectedHint
    : copy.logoEditorFileHint

  const run = async (message: string, action: () => Promise<void>, close?: () => void) => {
    setBusy(message)

    try {
      await action()
      toast.success(copy.logoUpdated)
      await onUpdated?.()
      close?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.logoUpdateFailed)
    } finally {
      setBusy(null)
    }
  }

  const fetchFromUrlAndApply = async (close?: () => void) => {
    const sourceUrl = logoUrlDraft.trim()

    if (!sourceUrl) {
      toast.info(copy.logoUrlRequired)

      return
    }

    await run(copy.searchingLogo, async () => {
      const candidateResponse = await fetch('/api/admin/data-quality/organization-logos/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'operator_url',
          organizationId,
          sourceUrl
        })
      })

      const candidate = (await candidateResponse.json().catch(() => ({}))) as ApplyCandidateResponse & { error?: string }

      if (!candidateResponse.ok || !candidate.asset_id) {
        throw new Error(candidate.error || copy.logoUpdateFailed)
      }

      await applyLogoAsset({
        organizationId,
        assetId: candidate.asset_id,
        candidateId: candidate.candidate_id || null,
        reason: 'workspace_avatar_url'
      })
      setLogoUrlDraft('')
    }, close)
  }

  const generateAiLogo = async () => {
    setBusy(copy.logoAiGenerating)

    try {
      const response = await fetch(`/api/organizations/${encodeURIComponent(organizationId)}/brand-assets/logo/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ styleHint: aiHint.trim() || null })
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok || !payload?.asset?.assetId) {
        throw new Error(typeof payload.error === 'string' ? payload.error : copy.logoAiFailed)
      }

      // Drop the AI draft into the same slot the uploader/URL flows use → preview lights up and the
      // existing "Aplicar" button takes over (it goes through attachOrganizationLogoAsset, which
      // re-checks the operating-entity guardrail). The operator reviews before committing.
      setUploadedLogo({
        assetId: payload.asset.assetId,
        filename: payload.asset.filename,
        mimeType: payload.asset.mimeType,
        sizeBytes: payload.asset.sizeBytes,
        downloadUrl: payload.downloadUrl,
        asset: payload.asset
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.logoAiFailed)
    } finally {
      setBusy(null)
    }
  }

  const applyUploadedLogo = async (close?: () => void) => {
    if (!uploadedLogo?.assetId) {
      toast.info(copy.logoUploadRequired)

      return
    }

    await run(copy.applyingLogo, async () => {
      await applyLogoAsset({
        organizationId,
        assetId: uploadedLogo.assetId,
        reason: 'workspace_avatar_upload'
      })
      setUploadedLogo(null)
    }, close)
  }

  const avatar = (
    <CustomAvatar variant='rounded' skin='light' color='primary' size={size}>
      {logoUrl ? (
        <Box
          component='img'
          src={logoUrl}
          alt=''
          loading='lazy'
          sx={{ width: '100%', height: '100%', objectFit: 'contain', p: size >= 80 ? 2 : 1, bgcolor: 'background.paper' }}
        />
      ) : (
        <Typography variant={size >= 80 ? 'h3' : 'h5'} sx={{ fontWeight: 700 }}>
          {fallbackInitials}
        </Typography>
      )}
    </CustomAvatar>
  )

  const renderPreviewMark = (imageUrl: string | null | undefined, label: string) => (
    <CustomAvatar variant='rounded' skin='light' color='primary' size={64}>
      {imageUrl ? (
        <Box
          component='img'
          src={imageUrl}
          alt={label}
          loading='lazy'
          sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 2, bgcolor: 'background.paper' }}
        />
      ) : (
        <Typography variant='h5' sx={{ fontWeight: 700 }}>
          {fallbackInitials}
        </Typography>
      )}
    </CustomAvatar>
  )

  const renderNewLogoPreview = () => {
    if (uploadedLogo?.downloadUrl) {
      return renderPreviewMark(uploadedLogo.downloadUrl, copy.newLogoPreview)
    }

    return (
      <Box
        sx={theme => ({
          display: 'grid',
          placeItems: 'center',
          inlineSize: 64,
          blockSize: 64,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          border: `1px dashed ${theme.palette.divider}`,
          bgcolor: 'action.hover',
          color: 'text.secondary'
        })}
      >
        <i className='tabler-photo-plus text-[24px]' aria-hidden />
      </Box>
    )
  }

  if (!editable || isOperatingEntity) {
    return (
      <Stack spacing={1} alignItems='center'>
        {avatar}
        {isOperatingEntity && (
          <GreenhouseChip
            size='small'
            kind='status'
            variant='label'
            tone='success'
            iconClassName='tabler-shield-lock'
            label={copy.protected}
          />
        )}
      </Stack>
    )
  }

  return (
    <GreenhouseFloatingSurface
      variant='inlineEditor'
      placement='bottom-start'
      width={520}
      ariaLabel={copy.changeLogo}
      dataCapture='organization-logo-avatar-editor'
      dismissOnOutsidePress={!busy}
      anchor={anchorProps => {
        const { ref, ...triggerProps } = anchorProps

        return (
          <Box
            component='button'
            type='button'
            ref={ref}
            {...triggerProps}
            aria-label={copy.changeLogo}
            data-capture='organization-logo-avatar-trigger'
            sx={theme => ({
              position: 'relative',
              display: 'inline-flex',
              p: 0,
              border: 0,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              bgcolor: 'transparent',
              cursor: 'pointer',
              '& [data-logo-edit-indicator="true"]': {
                opacity: 0,
                transition: theme.transitions.create(['border-color', 'box-shadow', 'color', 'opacity', 'transform'], {
                  duration: theme.transitions.duration.shortest
                })
              },
              '&:hover [data-logo-edit-indicator="true"], &:focus-visible [data-logo-edit-indicator="true"]': {
                opacity: 1,
                color: 'primary.main',
                borderColor: 'primary.light',
                boxShadow: theme.greenhouseElevation.raised.boxShadow,
                transform: 'translateY(-1px)'
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 3
              }
            })}
          >
            {avatar}
            <Box
              aria-hidden
              data-logo-edit-indicator='true'
              sx={theme => ({
                position: 'absolute',
                insetInlineEnd: -5,
                insetBlockEnd: -5,
                display: 'grid',
                placeItems: 'center',
                inlineSize: 24,
                blockSize: 24,
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                bgcolor: 'background.paper',
                color: 'text.secondary',
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.greenhouseElevation.none.boxShadow
              })}
            >
              <i className='tabler-pencil' />
            </Box>
          </Box>
        )
      }}
      content={({ close }) => (
        <Stack spacing={2.5}>
          <Stack direction='row' spacing={1.5} alignItems='center'>
            <Box sx={{ flexShrink: 0 }}>{avatar}</Box>
            <Box sx={{ minInlineSize: 0, flex: 1 }}>
              <Typography variant='subtitle1' color='text.primary' sx={{ fontWeight: 600 }}>
                {copy.changeLogo}
              </Typography>
              <Typography variant='caption' color='text.secondary' noWrap>
                {organizationName}
              </Typography>
            </Box>
            <GreenhouseChip
              size='small'
              kind='status'
              variant='label'
              tone='success'
              iconClassName='tabler-building'
              label={copy.clientOrganization}
            />
          </Stack>

          <Divider />

          <Stack
            direction='row'
            alignItems='center'
            justifyContent='center'
            spacing={{ xs: 2, sm: 4 }}
            sx={theme => ({
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              bgcolor: 'action.hover',
              px: 3,
              py: 2.5
            })}
          >
            <Stack spacing={1} alignItems='center' sx={{ minInlineSize: 96 }}>
              <Typography variant='caption' color='text.secondary'>
                {copy.currentLogo}
              </Typography>
              {renderPreviewMark(logoUrl, copy.currentLogo)}
            </Stack>
            <Box sx={{ color: 'text.secondary', display: 'grid', placeItems: 'center' }}>
              <i className='tabler-arrow-right text-[22px]' aria-hidden />
            </Box>
            <Stack spacing={1} alignItems='center' sx={{ minInlineSize: 120 }}>
              <Typography variant='caption' color='text.secondary'>
                {uploadedLogo ? copy.newLogoPreview : copy.noNewLogoPreview}
              </Typography>
              {renderNewLogoPreview()}
            </Stack>
          </Stack>

          <Typography variant='body2' color='text.secondary'>
            {copy.logoEditorDescription}
          </Typography>

          {busy && (
            <Box>
              <Typography variant='caption' color='text.secondary'>
                {busy}
              </Typography>
              <LinearProgress sx={{ mt: 1 }} />
            </Box>
          )}

          <GreenhouseFileUploader
            contextType='organization_logo_draft'
            value={uploadedLogo}
            onChange={setUploadedLogo}
            title={copy.logoUploaderTitle}
            helperText={copy.logoUploaderHelper}
            emptyTitle={copy.logoUploaderEmptyTitle}
            emptyDescription={copy.logoUploaderEmptyDescription}
            browseCta={copy.logoUploaderBrowse}
            replaceCta={copy.logoUploaderReplace}
            uploadingCta={copy.uploadingLogo}
            removeCta={copy.logoUploaderRemove}
            disabled={Boolean(busy)}
            metadataLabel={`${copy.changeLogo}: ${organizationName}`}
            acceptedMimeTypes={['image/png', 'image/jpeg', 'image/webp']}
            maxSizeBytes={5 * 1024 * 1024}
          />

          <Divider />

          <Stack spacing={1.25}>
            <TextField
              size='small'
              label={copy.logoUrlLabel}
              value={logoUrlDraft}
              disabled={Boolean(busy)}
              onChange={event => setLogoUrlDraft(event.target.value)}
              placeholder={copy.logoUrlPlaceholder}
              fullWidth
            />
            <GreenhouseButton
              kind='primaryAction'
              variant='solid'
              tone='primary'
              leadingIconClassName='tabler-world-search'
              disabled={Boolean(busy)}
              onClick={() => void fetchFromUrlAndApply(close)}
              fullWidth
            >
              {actionCopy.search}
            </GreenhouseButton>
            <Typography variant='caption' color='text.secondary'>
              {copy.logoUrlHelper}
            </Typography>
          </Stack>

          <Divider />

          <Stack spacing={1.25} data-capture='organization-logo-ai-generate'>
            <TextField
              size='small'
              label={copy.logoAiLabel}
              value={aiHint}
              disabled={Boolean(busy)}
              onChange={event => setAiHint(event.target.value)}
              placeholder={copy.logoAiPlaceholder}
              fullWidth
              multiline
              minRows={2}
            />
            <GreenhouseButton
              kind='primaryAction'
              variant='solid'
              tone='primary'
              leadingIconClassName='tabler-sparkles'
              disabled={Boolean(busy)}
              onClick={() => void generateAiLogo()}
              fullWidth
            >
              {copy.logoAiGenerate}
            </GreenhouseButton>
            <Typography variant='caption' color='text.secondary'>
              {copy.logoAiHelper}
            </Typography>
          </Stack>

          <Box
            sx={theme => ({
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start',
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              bgcolor: 'success.50',
              border: `1px solid ${theme.palette.success.light}`,
              color: 'text.secondary',
              p: 3
            })}
          >
            <Box sx={{ color: 'success.main', display: 'grid', placeItems: 'center', pt: 0.25 }}>
              <i className='tabler-shield-check text-[20px]' aria-hidden />
            </Box>
            <Stack spacing={0.5}>
              <Typography variant='caption' color='text.secondary'>
                {copy.logoLegalProtectionNotice}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {footerCopy}
              </Typography>
            </Stack>
          </Box>

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} justifyContent='flex-end'>
            <GreenhouseButton
              kind='secondaryAction'
              variant='outlined'
              tone='primary'
              disabled={Boolean(busy)}
              onClick={close}
              sx={{ minInlineSize: { sm: 132 } }}
            >
              {actionCopy.cancel}
            </GreenhouseButton>
            <GreenhouseButton
              kind='primaryAction'
              variant='solid'
              tone='primary'
              leadingIconClassName='tabler-check'
              disabled={Boolean(busy) || !uploadedLogo}
              onClick={() => void applyUploadedLogo(close)}
              sx={{ minInlineSize: { sm: 156 } }}
            >
              {copy.applyLogo}
            </GreenhouseButton>
          </Stack>
        </Stack>
      )}
    />
  )
}

export default OrganizationLogoAvatarEditor
