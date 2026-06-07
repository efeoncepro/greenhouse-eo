'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import { useDropzone } from 'react-dropzone'

import useReducedMotion from '@/hooks/useReducedMotion'
import { getMicrocopy } from '@/lib/copy'

export type GreenhouseEvidenceAttachmentState = 'idle' | 'dragging' | 'uploading' | 'scanning' | 'verified' | 'rejected' | 'disabled'
export type GreenhouseEvidenceAttachmentVariant = 'compact' | 'panel'

export type GreenhouseEvidenceAttachmentDropzoneProps = {
  state: GreenhouseEvidenceAttachmentState
  title: ReactNode
  description?: ReactNode
  acceptedLabel?: ReactNode
  fileName?: ReactNode
  fileMeta?: ReactNode
  progress?: number
  variant?: GreenhouseEvidenceAttachmentVariant
  browseLabel?: ReactNode
  replaceLabel?: ReactNode
  removeLabel?: ReactNode
  onBrowse?: () => void
  onRemove?: () => void
  onDropFiles?: (files: File[]) => void
  disabled?: boolean
  ariaLabel?: string
  dataCapture?: string
}

const t = getMicrocopy()

const STATE_META: Record<GreenhouseEvidenceAttachmentState, { icon: string; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' | null; label: string }> = {
  idle: { icon: 'tabler-cloud-upload', tone: 'primary', label: 'Listo para cargar' },
  dragging: { icon: 'tabler-cloud-up', tone: 'primary', label: 'Soltar evidencia' },
  uploading: { icon: 'tabler-upload', tone: 'primary', label: 'Subiendo' },
  scanning: { icon: 'tabler-shield-search', tone: 'info', label: 'Verificando' },
  verified: { icon: 'tabler-shield-check', tone: 'success', label: 'Verificado' },
  rejected: { icon: 'tabler-shield-x', tone: 'error', label: t.states.rejected },
  disabled: { icon: 'tabler-lock', tone: null, label: t.states.unavailable }
}

const MOTION_EASING = 'cubic-bezier(0.2, 0, 0, 1)'

const getMain = (theme: Theme, state: GreenhouseEvidenceAttachmentState) => {
  const tone = STATE_META[state].tone

  return tone ? theme.palette[tone].main : theme.palette.text.disabled
}

const clampProgress = (progress: number | undefined) => Math.max(0, Math.min(100, progress ?? 0))

const GreenhouseEvidenceAttachmentDropzone = ({
  state,
  title,
  description,
  acceptedLabel,
  fileName,
  fileMeta,
  progress,
  variant = 'panel',
  browseLabel = 'Buscar archivo',
  replaceLabel = 'Reemplazar',
  removeLabel = 'Quitar',
  onBrowse,
  onRemove,
  onDropFiles,
  disabled = false,
  ariaLabel,
  dataCapture
}: GreenhouseEvidenceAttachmentDropzoneProps) => {
  const reduced = useReducedMotion()
  const isDisabled = disabled || state === 'disabled'
  const isBusy = state === 'uploading' || state === 'scanning'
  const hasFile = Boolean(fileName)
  const isCompact = variant === 'compact'

  const { getInputProps, getRootProps, isDragActive, open } = useDropzone({
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: isDisabled || isBusy,
    onDropAccepted: files => {
      if (files.length > 0) {
        onDropFiles?.(files)
      }
    }
  })

  const visualState: GreenhouseEvidenceAttachmentState = isDisabled ? 'disabled' : isDragActive ? 'dragging' : state
  const stateMeta = STATE_META[visualState]
  const stateLabel = stateMeta.label
  const progressValue = clampProgress(progress)
  const role = visualState === 'rejected' ? 'alert' : 'status'
  const live = visualState === 'rejected' ? 'assertive' : 'polite'

  const handleBrowse = () => {
    onBrowse?.()
    open()
  }

  return (
    <Box
      {...getRootProps()}
      role={role}
      aria-live={live}
      aria-label={ariaLabel}
      aria-busy={isBusy ? 'true' : undefined}
      data-state={visualState}
      data-variant={variant}
      data-capture={dataCapture}
      sx={theme => {
        const main = getMain(theme, visualState)

        return {
          position: 'relative',
          overflow: 'hidden',
          p: isCompact ? 2 : 3,
          border: `1px solid ${alpha(main, visualState === 'idle' ? 0.18 : 0.32)}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          backgroundColor: visualState === 'idle' ? alpha(theme.palette.background.paper, 0.94) : alpha(main, 0.04),
          outline: isDragActive ? `2px solid ${alpha(main, 0.28)}` : 'none',
          outlineOffset: 2,
          transition: reduced
            ? 'none'
            : theme.transitions.create(['border-color', 'background-color', 'outline-color'], {
                duration: 150,
                easing: MOTION_EASING
              }),
          '@keyframes gh-evidence-pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.45 }
          }
        }
      }}
    >
      <input {...getInputProps()} />
      <Stack spacing={isCompact ? 2 : 2.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
          <Stack direction='row' spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
            <Box
              aria-hidden='true'
              sx={theme => {
                const main = getMain(theme, visualState)

                return {
                  display: 'grid',
                  placeItems: 'center',
                  width: 38,
                  height: 38,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  color: main,
                  border: `1px solid ${alpha(main, 0.24)}`,
                  backgroundColor: alpha(main, 0.075),
                  flexShrink: 0,
                  overflow: 'hidden'
                }
              }}
            >
              <Box
                component='i'
                className={stateMeta.icon}
                sx={{
                  display: 'block',
                  fontSize: 22,
                  lineHeight: 1,
                  animation: isBusy && !reduced ? 'gh-evidence-pulse 1200ms cubic-bezier(0.2, 0, 0, 1) infinite' : undefined,
                  '&::before': { display: 'block' }
                }}
              />
            </Box>
            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                <Typography variant='body2' sx={{ fontWeight: 800 }}>
                  {title}
                </Typography>
                <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 800 }}>
                  {stateLabel}
                </Typography>
              </Stack>
              {description ? (
                <Typography variant='caption' color='text.secondary'>
                  {description}
                </Typography>
              ) : null}
              {acceptedLabel ? (
                <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700 }}>
                  {acceptedLabel}
                </Typography>
              ) : null}
            </Stack>
          </Stack>

          <Stack direction='row' spacing={1} alignItems='center' sx={{ flexShrink: 0 }}>
            <Button type='button' size='small' variant='tonal' onClick={handleBrowse} disabled={isDisabled || isBusy}>
              {hasFile ? replaceLabel : browseLabel}
            </Button>
            {hasFile && onRemove ? (
              <Button type='button' size='small' variant='text' color='secondary' onClick={onRemove} disabled={isDisabled || isBusy}>
                {removeLabel}
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {hasFile ? (
          <Box
            sx={theme => ({
              p: 1.5,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
              backgroundColor: alpha(theme.palette.text.primary, 0.018)
            })}
          >
            <Stack direction='row' spacing={1.25} alignItems='center'>
              <Box component='i' className='tabler-file-description' aria-hidden='true' sx={{ color: 'text.secondary', fontSize: 18 }} />
              <Stack spacing={0.125} sx={{ minWidth: 0 }}>
                <Typography variant='body2' sx={{ fontWeight: 800 }} noWrap>
                  {fileName}
                </Typography>
                {fileMeta ? (
                  <Typography variant='caption' color='text.secondary'>
                    {fileMeta}
                  </Typography>
                ) : null}
              </Stack>
            </Stack>
          </Box>
        ) : null}

        {isBusy ? (
          <LinearProgress
            variant={progressValue > 0 ? 'determinate' : 'indeterminate'}
            value={progressValue > 0 ? progressValue : undefined}
            sx={theme => ({
              height: 4,
              borderRadius: 999,
              backgroundColor: alpha(getMain(theme, visualState), 0.12),
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                transition: reduced ? 'none' : undefined
              }
            })}
          />
        ) : null}
      </Stack>
    </Box>
  )
}

export default GreenhouseEvidenceAttachmentDropzone
