'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent
} from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

import GreenhouseNexaAnimatedMark from '../GreenhouseNexaAnimatedMark'
import NexaComposer, { NexaComposerActionButton, NexaComposerInput } from '../NexaComposer'

import {
  resolveNexaPromptDockCopy,
  resolveNexaPromptDockVariant,
  type NexaPromptDockVariantConfig
} from './nexa-prompt-dock-controller'
import type { NexaPromptDockProps, NexaPromptDockSubmitState } from './nexa-prompt-dock-types'

const getRadius = (theme: Theme, radius: NexaPromptDockVariantConfig['radius']) => {
  const radiusValue = theme.shape.customBorderRadius[radius]

  return `${radiusValue}px`
}

const isPromiseLike = (value: void | Promise<void>): value is Promise<void> =>
  typeof value === 'object' && value !== null && 'then' in value

const NexaPromptDock = ({
  variant,
  kind = 'quickAsk',
  copy,
  helperText,
  value,
  defaultValue = '',
  open,
  defaultOpen = false,
  disabled = false,
  autoFocusOnOpen = true,
  successDurationMs = 1500,
  onOpenChange,
  onDraftChange,
  onSubmit,
  dataCapture,
  sx
}: NexaPromptDockProps) => {
  const theme = useTheme()
  const panelId = useId()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const successTimerRef = useRef<number | null>(null)
  const config = resolveNexaPromptDockVariant(variant, kind)
  const resolvedCopy = resolveNexaPromptDockCopy(kind, copy)
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [internalDraft, setInternalDraft] = useState(defaultValue)
  const [submitState, setSubmitState] = useState<NexaPromptDockSubmitState>('idle')

  const isOpen = open ?? internalOpen
  const draft = value ?? internalDraft
  const draftTrimmed = draft.trim()
  const radius = getRadius(theme, config.radius)
  const submitting = submitState === 'submitting'
  const success = submitState === 'success'
  const collapsedLabel = success ? resolvedCopy.successLabel : resolvedCopy.collapsedLabel

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (disabled && nextOpen) return

      if (open === undefined) {
        setInternalOpen(nextOpen)
      }

      onOpenChange?.(nextOpen)
    },
    [disabled, onOpenChange, open]
  )

  const setDraft = useCallback(
    (nextDraft: string) => {
      if (value === undefined) {
        setInternalDraft(nextDraft)
      }

      onDraftChange?.(nextDraft)
    },
    [onDraftChange, value]
  )

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
  }, [])

  const showSuccess = useCallback(() => {
    clearSuccessTimer()
    setSubmitState('success')
    successTimerRef.current = window.setTimeout(() => {
      setSubmitState('idle')
      successTimerRef.current = null
    }, successDurationMs)
  }, [clearSuccessTimer, successDurationMs])

  const submitDraft = useCallback(() => {
    if (disabled || submitting || !draftTrimmed) return

    const result = onSubmit?.(draftTrimmed)

    if (isPromiseLike(result)) {
      setSubmitState('submitting')
      void result
        .then(() => {
          setDraft('')
          setOpen(false)
          showSuccess()
        })
        .catch(() => {
          setSubmitState('idle')
        })

      return
    }

    setDraft('')
    setOpen(false)
    showSuccess()
  }, [disabled, draftTrimmed, onSubmit, setDraft, setOpen, showSuccess, submitting])

  useEffect(() => {
    if (!isOpen || !autoFocusOnOpen) return

    const focusFrame = window.requestAnimationFrame(() => inputRef.current?.focus())

    return () => window.cancelAnimationFrame(focusFrame)
  }, [autoFocusOnOpen, isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target

      if (target instanceof Node && rootRef.current?.contains(target)) return

      setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, setOpen])

  useEffect(() => clearSuccessTimer, [clearSuccessTimer])

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitDraft()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)

      return
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submitDraft()
    }
  }

  const handleDraftChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft(event.target.value)
  }

  return (
    <Box
      ref={rootRef}
      data-capture={dataCapture}
      sx={[
        {
          inlineSize: '100%',
          minInlineSize: 0,
          maxInlineSize: config.maxInlineSize,
          color: 'text.primary'
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      {!isOpen ? (
        <Box
          component='button'
          type='button'
          disabled={disabled}
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
          sx={{
            minInlineSize: config.collapsedMinInlineSize,
            inlineSize: { xs: '100%', sm: 'auto' },
            minBlockSize: 44,
            px: 3,
            py: 1.5,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            borderRadius: radius,
            bgcolor: 'background.paper',
            color: 'text.primary',
            boxShadow: config.elevation,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            transition: theme.transitions.create(['border-color', 'box-shadow', 'transform', 'background-color'], {
              duration: theme.transitions.duration.shorter
            }),
            '&:hover': {
              borderColor: alpha(theme.palette.primary.main, 0.34),
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              transform: 'translateY(-1px)'
            },
            '&:focus-visible': {
              outline: `2px solid ${alpha(theme.palette.primary.main, 0.62)}`,
              outlineOffset: 3
            },
            '&:disabled': {
              cursor: 'default',
              opacity: 0.56,
              transform: 'none',
              boxShadow: 'none'
            },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:hover': { transform: 'none' }
            }
          }}
        >
          <Stack direction='row' spacing={2} alignItems='center' sx={{ minInlineSize: 0 }}>
            <GreenhouseNexaAnimatedMark kind='inlineMark' size='small' ariaLabel='Nexa' />
            <Typography
              component='span'
              variant='body2'
              sx={{ fontWeight: 600, minInlineSize: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {collapsedLabel}
            </Typography>
          </Stack>
          <Typography component='span' variant='caption' color='text.secondary' sx={{ display: { xs: 'none', sm: 'inline' }, whiteSpace: 'nowrap' }}>
            {resolvedCopy.shortcutLabel}
          </Typography>
          {success ? (
            <Box component='span' role='status' sx={visuallyHidden}>
              {resolvedCopy.successLabel}
            </Box>
          ) : null}
        </Box>
      ) : (
        <Box
          id={panelId}
          component='form'
          onSubmit={handleFormSubmit}
          sx={{
            minInlineSize: { xs: 0, sm: config.minInlineSize },
            inlineSize: '100%',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
            borderRadius: radius,
            bgcolor: 'background.paper',
            boxShadow: config.elevation,
            p: config.panelPadding,
            transition: theme.transitions.create(['box-shadow', 'border-color'], {
              duration: theme.transitions.duration.shorter
            })
          }}
        >
          <Stack spacing={2}>
            <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
              <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minInlineSize: 0 }}>
                <GreenhouseNexaAnimatedMark kind='inlineMark' size='small' ariaLabel='Nexa' />
                <Typography variant='body2' sx={{ fontWeight: 600 }} noWrap>
                  {resolvedCopy.expandedLabel}
                </Typography>
              </Stack>
              <Box
                component='button'
                type='button'
                aria-label={resolvedCopy.closeLabel}
                onClick={() => setOpen(false)}
                sx={{
                  inlineSize: 32,
                  blockSize: 32,
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                  borderRadius: '50%',
                  bgcolor: 'transparent',
                  color: 'text.secondary',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  transition: theme.transitions.create(['background-color', 'color', 'border-color'], {
                    duration: theme.transitions.duration.shorter
                  }),
                  '&:hover': {
                    bgcolor: alpha(theme.palette.text.primary, 0.06),
                    borderColor: alpha(theme.palette.text.primary, 0.16),
                    color: 'text.primary'
                  },
                  '&:focus-visible': {
                    outline: `2px solid ${alpha(theme.palette.primary.main, 0.62)}`,
                    outlineOffset: 2
                  }
                }}
              >
                <Box component='i' className='tabler-x' aria-hidden='true' sx={{ fontSize: 18 }} />
              </Box>
            </Stack>
            <NexaComposer kind={config.composerKind}>
              <NexaComposerInput
                kind={config.composerKind}
                inputRef={inputRef}
                value={draft}
                placeholder={resolvedCopy.placeholder}
                onChange={handleDraftChange}
                onKeyDown={handleKeyDown}
                disabled={disabled || submitting}
                shortcutLabel={
                  <Box component='span' sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    {resolvedCopy.shortcutLabel}
                  </Box>
                }
                actionAdornment={
                  <NexaComposerActionButton
                    variant='send'
                    aria-label={resolvedCopy.submitLabel}
                    onClick={submitDraft}
                    disabled={disabled || submitting || !draftTrimmed}
                  />
                }
              />
            </NexaComposer>
            {helperText ? (
              <Typography variant='caption' color='text.secondary'>
                {helperText}
              </Typography>
            ) : null}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

export default NexaPromptDock
