'use client'

import { useState } from 'react'

import { toast } from 'sonner'

import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'

import { motion, AnimatePresence } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import GreenhouseFileUploader, { type UploadedFileValue } from '@/components/greenhouse/GreenhouseFileUploader'
import { GreenhouseButton, GreenhouseChip, GreenhouseFloatingSurface } from '@/components/greenhouse/primitives'
import { MOTION_DURATION_S, MOTION_EASE } from '@/components/greenhouse/motion/core/tokens'
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

type LogoMethod = 'upload' | 'ai' | 'url'

type ApplyCandidateResponse = {
  candidate_id?: string
  asset_id?: string | null
}

const EASE = MOTION_EASE.standard.cubicBezier

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
  const prefersReduced = useReducedMotion()
  const [busy, setBusy] = useState<string | null>(null)
  const [method, setMethod] = useState<LogoMethod>('upload')
  const [logoUrlDraft, setLogoUrlDraft] = useState('')
  const [aiHint, setAiHint] = useState('')
  const [uploadedLogo, setUploadedLogo] = useState<UploadedFileValue | null>(null)

  const footerCopy = isOperatingEntity ? copy.logoEditorProtectedHint : copy.logoEditorFileHint
  const isGenerating = busy != null && method === 'ai'

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

  const fetchFromUrlAndApply = async () => {
    const sourceUrl = logoUrlDraft.trim()

    if (!sourceUrl) {
      toast.info(copy.logoUrlRequired)

      return
    }

    setBusy(copy.searchingLogo)

    try {
      const candidateResponse = await fetch('/api/admin/data-quality/organization-logos/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'operator_url', organizationId, sourceUrl })
      })

      const candidate = (await candidateResponse.json().catch(() => ({}))) as ApplyCandidateResponse & { error?: string }

      if (!candidateResponse.ok || !candidate.asset_id) {
        throw new Error(candidate.error || copy.logoUpdateFailed)
      }

      // Stage the URL result as the pending draft → the single "Guardar logo" commit applies it,
      // same as upload/AI. The operator sees the result in the preview before committing.
      setUploadedLogo({
        assetId: candidate.asset_id,
        filename: `${organizationId}-url-logo`,
        mimeType: 'image/*',
        sizeBytes: 0,
        downloadUrl: `/api/assets/private/${encodeURIComponent(candidate.asset_id)}`,
        asset: { assetId: candidate.asset_id } as UploadedFileValue['asset']
      })
      setLogoUrlDraft('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.logoUpdateFailed)
    } finally {
      setBusy(null)
    }
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

      // Drop the AI draft into the shared slot → preview lights up and the "Guardar logo" commit takes
      // over (attachOrganizationLogoAsset re-checks the operating-entity guardrail). Operator reviews first.
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
        reason: `workspace_avatar_${method}`
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
      width={500}
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
              // Hover/focus reveals a soft scrim over the avatar with a centered edit glyph — the
              // canonical "change image" affordance (Google/Slack/Linear). No corner badge.
              '& [data-logo-edit-indicator="true"]': {
                opacity: 0,
                transition: theme.transitions.create('opacity', { duration: theme.transitions.duration.shorter })
              },
              '& [data-logo-edit-glyph="true"]': {
                transform: 'scale(0.82)',
                transition: theme.transitions.create('transform', { duration: theme.transitions.duration.shorter })
              },
              '@media (hover: hover)': {
                '&:hover [data-logo-edit-indicator="true"]': { opacity: 1 },
                '&:hover [data-logo-edit-glyph="true"]': { transform: 'scale(1)' }
              },
              '&:focus-visible [data-logo-edit-indicator="true"]': { opacity: 1 },
              '&:focus-visible [data-logo-edit-glyph="true"]': { transform: 'scale(1)' },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 3
              },
              '@media (prefers-reduced-motion: reduce)': {
                '& [data-logo-edit-indicator="true"], & [data-logo-edit-glyph="true"]': { transition: 'none' },
                '& [data-logo-edit-glyph="true"]': { transform: 'none' }
              }
            })}
          >
            {avatar}
            <Box
              aria-hidden
              data-logo-edit-indicator='true'
              sx={theme => ({
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                color: 'common.white',
                bgcolor: alpha(theme.palette.common.black, 0.46),
                backdropFilter: 'blur(1px)'
              })}
            >
              <Box
                data-logo-edit-glyph='true'
                sx={theme => ({
                  display: 'grid',
                  placeItems: 'center',
                  inlineSize: size >= 72 ? 32 : 26,
                  blockSize: size >= 72 ? 32 : 26,
                  borderRadius: '50%',
                  bgcolor: alpha(theme.palette.common.white, 0.18),
                  fontSize: size >= 72 ? 18 : 15
                })}
              >
                <i className='tabler-pencil' aria-hidden='true' />
              </Box>
            </Box>
          </Box>
        )
      }}
      content={({ close }) => (
        <Stack spacing={3}>
          {/* Header */}
          <Stack direction='row' spacing={2} alignItems='center' sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Box sx={{ flexShrink: 0 }}>{avatar}</Box>
            <Box sx={{ minInlineSize: 0, flex: '1 1 180px' }}>
              <Typography variant='subtitle1' color='text.primary' sx={{ fontWeight: 600 }}>
                {copy.changeLogo}
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
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
              sx={{ flexShrink: 0, maxInlineSize: '100%' }}
            />
          </Stack>

          {/* Before → after preview */}
          <Box
            sx={theme => ({
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
              alignItems: 'center',
              columnGap: 2,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.default',
              px: 3,
              py: 2.5
            })}
          >
            <PreviewSlot label={copy.currentLogo} imageUrl={logoUrl} emptyLabel={copy.logoCurrentEmpty} />
            <Box aria-hidden sx={{ color: 'text.disabled', display: 'grid', placeItems: 'center' }}>
              <i className='tabler-arrow-right text-[20px]' />
            </Box>
            <PreviewSlot
              label={uploadedLogo ? copy.logoReadyToSave : copy.noNewLogoPreview}
              imageUrl={uploadedLogo?.downloadUrl}
              draft={Boolean(uploadedLogo)}
              loading={isGenerating}
              prefersReduced={prefersReduced}
            />
          </Box>

          {/* Method selector */}
          <ToggleButtonGroup
            exclusive
            size='small'
            value={method}
            disabled={Boolean(busy)}
            onChange={(_, value: LogoMethod | null) => value && setMethod(value)}
            aria-label={copy.logoMethodAria}
            sx={{ display: 'flex', '& .MuiToggleButton-root': { flex: 1, gap: 1.5, py: 1.5, textTransform: 'none' } }}
          >
            <ToggleButton value='upload'>
              <i className='tabler-upload' aria-hidden='true' />
              {copy.logoMethodUpload}
            </ToggleButton>
            <ToggleButton value='ai'>
              <i className='tabler-sparkles' aria-hidden='true' />
              {copy.logoMethodAi}
            </ToggleButton>
            <ToggleButton value='url'>
              <i className='tabler-world' aria-hidden='true' />
              {copy.logoMethodUrl}
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Active method panel — cross-fades on switch */}
          <Box sx={{ minBlockSize: 132 }}>
            <AnimatePresence mode='wait' initial={false}>
              <motion.div
                key={method}
                initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: prefersReduced ? 0 : MOTION_DURATION_S.standard, ease: EASE }}
              >
                {method === 'upload' && (
                  <GreenhouseFileUploader
                    contextType='organization_logo_draft'
                    value={uploadedLogo}
                    onChange={setUploadedLogo}
                    title={copy.logoUploaderTitle}
                    helperText=''
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
                )}

                {method === 'ai' && (
                  <Stack spacing={1.5}>
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
                      kind='secondaryAction'
                      variant='outlined'
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
                )}

                {method === 'url' && (
                  <Stack spacing={1.5}>
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
                      kind='secondaryAction'
                      variant='outlined'
                      tone='primary'
                      leadingIconClassName='tabler-world-search'
                      disabled={Boolean(busy)}
                      onClick={() => void fetchFromUrlAndApply()}
                      fullWidth
                    >
                      {actionCopy.search}
                    </GreenhouseButton>
                    <Typography variant='caption' color='text.secondary'>
                      {copy.logoUrlHelper}
                    </Typography>
                  </Stack>
                )}
              </motion.div>
            </AnimatePresence>
          </Box>

          {/* Inline busy state — honest, with AI time estimate */}
          <AnimatePresence initial={false}>
            {busy && (
              <motion.div
                key='logo-editor-busy'
                initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: prefersReduced ? 0 : MOTION_DURATION_S.standard, ease: EASE }}
                style={{ overflow: 'hidden' }}
              >
                <Stack spacing={1}>
                  <Stack direction='row' spacing={1.5} alignItems='baseline' flexWrap='wrap'>
                    <Typography variant='caption' color='text.primary'>{busy}</Typography>
                    {isGenerating && (
                      <Typography variant='caption' color='text.secondary'>{copy.logoAiEstimate}</Typography>
                    )}
                  </Stack>
                  <LinearProgress />
                </Stack>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Condensed governance note */}
          <Stack direction='row' spacing={1.5} alignItems='flex-start' sx={{ color: 'text.secondary' }}>
            <Box sx={{ color: 'success.main', display: 'grid', placeItems: 'center', pt: 0.25 }}>
              <i className='tabler-shield-check text-[18px]' aria-hidden='true' />
            </Box>
            <Typography variant='caption' color='text.secondary'>
              {footerCopy}
            </Typography>
          </Stack>

          {/* Footer — single primary action */}
          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5} justifyContent='flex-end'>
            <GreenhouseButton
              kind='secondaryAction'
              variant='outlined'
              tone='primary'
              disabled={Boolean(busy)}
              onClick={close}
              sx={{ minInlineSize: { sm: 120 } }}
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

const PreviewSlot = ({
  label,
  imageUrl,
  emptyLabel,
  draft,
  loading,
  prefersReduced
}: {
  label: string
  imageUrl?: string | null
  emptyLabel?: string
  draft?: boolean
  loading?: boolean
  prefersReduced?: boolean
}) => (
  <Stack spacing={1} alignItems='center' sx={{ minInlineSize: 0 }}>
    <Box
      sx={theme => ({
        position: 'relative',
        inlineSize: 64,
        blockSize: 64,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        border: draft ? `1px solid ${theme.palette.primary.main}` : `1px ${imageUrl ? 'solid' : 'dashed'} ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        boxShadow: draft ? theme.greenhouseElevation.raised.boxShadow : theme.greenhouseElevation.none.boxShadow
      })}
    >
      {/* Anticipatory loading: the new-logo slot breathes softly while AI generates — modern, not a spinner. */}
      {loading && (
        <motion.div
          aria-hidden
          initial={false}
          animate={prefersReduced ? { opacity: 0.6 } : { opacity: [0.35, 0.75, 0.35] }}
          transition={prefersReduced ? { duration: 0 } : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', inset: 0, background: 'var(--mui-palette-primary-lighterOpacity)' }}
        />
      )}
      {imageUrl ? (
        <motion.img
          key={imageUrl}
          src={imageUrl}
          alt={label}
          loading='lazy'
          initial={prefersReduced ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: prefersReduced ? 0 : MOTION_DURATION_S.medium, ease: EASE }}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
        />
      ) : emptyLabel ? (
        <Typography variant='caption' color='text.secondary' sx={{ px: 1, textAlign: 'center' }}>
          {emptyLabel}
        </Typography>
      ) : (
        <Box sx={{ color: 'text.secondary', display: 'grid', placeItems: 'center' }}>
          <i className='tabler-photo text-[22px]' aria-hidden='true' />
        </Box>
      )}
    </Box>
    <Typography variant='caption' color={draft ? 'primary.main' : 'text.secondary'} noWrap>
      {label}
    </Typography>
  </Stack>
)

export default OrganizationLogoAvatarEditor
