'use client'

import {
  Children,
  Fragment,
  forwardRef,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type HTMLAttributes,
  type Key,
  type ReactNode,
  type SyntheticEvent
} from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import type { AutocompleteCloseReason } from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import InputBase from '@mui/material/InputBase'
import Paper from '@mui/material/Paper'
import type { PaperProps } from '@mui/material/Paper'
import Popover from '@mui/material/Popover'
import Popper from '@mui/material/Popper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, styled, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'

export type ContextChipStatus = 'empty' | 'filled' | 'invalid' | 'locked' | 'blocking-empty'

export type ContextChipProminence = 'primary' | 'inline'

export interface ContextChipOption {
  value: string
  label: string
  secondary?: string
  logoUrl?: string | null
  disabled?: boolean
  meta?: Record<string, unknown>
}

interface ContextChipCommonProps {
  icon: string
  label: string
  value?: string | null
  placeholder?: string
  status?: ContextChipStatus
  required?: boolean
  disabled?: boolean
  errorMessage?: string | null
  testId?: string
  ariaLabel?: string

  /**
   * Visual prominence tier.
   * - `primary` (default): full chip box, 44px touch target, for required/party-level context.
   * - `inline`: no box, inline underline-on-hover, for secondary terms (business line, currency, duration, validity).
   * Popover behavior is identical across tiers.
   */
  prominence?: ContextChipProminence

  /** Micro-label shown below the chip when status='blocking-empty' (e.g. "Requerido"). */
  requiredHint?: string

  /** Compact boxed treatment for dense workbench rails. */
  density?: 'regular' | 'compact'

  /**
   * When true, the chip fills 100% of its parent width and drops the 40ch cap.
   * Use only when wrapping the chip in a sized flex/grid cell that controls width.
   * Only applies to `prominence='primary'`; ignored for `inline`.
   */
  fullWidth?: boolean
}

interface ContextChipPopoverNotice {
  tone?: 'default' | 'info' | 'warning' | 'error'
  message: string
  actionLabel?: string
  onAction?: () => void
}

interface ContextChipSelectProps extends ContextChipCommonProps {
  mode?: 'select'
  options: ContextChipOption[]
  selectedValue?: string | null
  onSelectChange: (value: string | null) => void
  onOptionSelect?: (option: ContextChipOption | null) => void
  noOptionsText?: string
  loading?: boolean
  loadingText?: string
  searchPlaceholder?: string
  inputValue?: string
  onInputValueChange?: (value: string) => void
  filterOptions?: (options: ContextChipOption[], inputValue: string) => ContextChipOption[]
  renderOption?: (option: ContextChipOption) => ReactNode
  popoverNotice?: ContextChipPopoverNotice
  liveMessage?: string

  /** Popper width. Default 360. */
  popoverWidth?: number
}

interface ContextChipCustomProps extends ContextChipCommonProps {
  mode: 'custom'
  popoverContent: ReactNode | ((ctx: { close: () => void }) => ReactNode)
  popoverWidth?: number
}

export type ContextChipProps = ContextChipSelectProps | ContextChipCustomProps

const isCustomMode = (props: ContextChipProps): props is ContextChipCustomProps =>
  props.mode === 'custom'

/**
 * Styled search input that lives at the top of the popper.
 * Borderless — the Paper provides the visual boundary.
 */
const StyledSearchInput = styled(InputBase)(({ theme }) => ({
  margin: theme.spacing(1, 1, 0.75),
  padding: theme.spacing(0.75, 1),
  width: `calc(100% - ${theme.spacing(2)})`,
  minHeight: 38,
  border: `1px solid ${alpha(theme.palette.divider, 0.92)}`,
  borderRadius: `${theme.shape.customBorderRadius.md}px`,
  backgroundColor: alpha(theme.palette.background.default, 0.58),
  boxShadow: 'none',
  transition: theme.transitions.create(['border-color', 'box-shadow', 'background-color'], {
    duration: theme.transitions.duration.shortest
  }),
  '&:focus-within': {
    borderColor: alpha(theme.palette.primary.main, 0.38),
    backgroundColor: theme.palette.background.paper,
    boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.055)}`
  },
  '& input': {
    borderRadius: 0,
    padding: 0,
    fontFamily: theme.typography.fontFamily,
    ...theme.typography.body2,
    lineHeight: 1.35
  },
  '& input::placeholder': {
    color: theme.palette.text.secondary,
    opacity: 0.82
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:focus-within': {
      transform: 'none'
    }
  }
}))

const buildOptionInitials = (label: string): string => {
  const words = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return '—'
  if (words.length === 1) return words[0]?.slice(0, 2).toUpperCase() ?? '—'

  return `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toUpperCase()
}

/**
 * Resolves the background tint color for the popover notice footer based on
 * its semantic tone. Extracted to module scope for testability and to keep the
 * render tree small.
 */
const resolveNoticeBackground = (
  theme: Theme,
  tone: ContextChipPopoverNotice['tone']
): string => {
  switch (tone) {
    case 'error':
      return alpha(theme.palette.error.main, 0.06)
    case 'warning':
      return alpha(theme.palette.warning.main, 0.08)
    case 'info':
      return alpha(theme.palette.info.main, 0.08)
    default:
      return alpha(theme.palette.text.primary, 0.03)
  }
}

/**
 * Props that the custom Autocomplete Paper accepts, in addition to the standard
 * MUI `PaperProps`. `notice` is the data to render in the footer; `onAfterAction`
 * is invoked after the footer's action fires, so the consumer (ContextChip) can
 * close the popover.
 */
interface ContextChipPaperProps extends PaperProps {
  notice?: ContextChipPopoverNotice
  onAfterAction?: () => void
}

/**
 * Custom Paper component for MUI Autocomplete that renders the popover listbox
 * AND the optional notice footer inside the same absolutely-positioned Paper.
 *
 * This is necessary because MUI Autocomplete with `open disablePortal` renders
 * its listbox Paper as absolutely positioned. A sibling element placed after
 * the Autocomplete in static flow would be occluded by this absolute Paper.
 * By injecting the notice inside the same Paper, both the listbox and notice
 * share the same positioning context and stack correctly.
 *
 * `forwardRef` preserves MUI's ref-forwarding contract for focus management.
 */
const ContextChipAutocompletePaper = forwardRef<HTMLDivElement, ContextChipPaperProps>(
  function ContextChipAutocompletePaper({ children, notice, onAfterAction, sx, ...paperRest }, ref) {
    const theme = useTheme()

    return (
      <Paper
        {...paperRest}
        ref={ref}
        sx={[
          { boxShadow: 'none', borderRadius: 0, margin: 0, border: 'none' },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
        ]}
      >
        <Box sx={{ minWidth: 0 }}>{Children.toArray(children)}</Box>
        {notice ? (
          <Stack
            direction='row'
            spacing={1}
            alignItems='flex-start'
            justifyContent='space-between'
            sx={{
              px: 1.5,
              py: 1.25,
              borderTop: `1px solid ${theme.palette.divider}`,
              backgroundColor: resolveNoticeBackground(theme, notice.tone)
            }}
          >
            <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.4 }}>
              {notice.message}
            </Typography>
            {notice.actionLabel && notice.onAction ? (
              <Button
                size='small'
                variant='text'
                color={notice.tone === 'error' ? 'error' : 'primary'}
                onClick={event => {
                  event.preventDefault()
                  event.stopPropagation()
                  notice.onAction?.()
                  onAfterAction?.()
                }}
                sx={{ minWidth: 'auto', px: 0.75, alignSelf: 'center' }}
              >
                {notice.actionLabel}
              </Button>
            ) : null}
          </Stack>
        ) : null}
      </Paper>
    )
  }
)

/**
 * Context chip — compact display + popover editor for one contextual field.
 *
 * Built on MUI's GitHub Picker pattern (Autocomplete with `open` forced true
 * inside a Popper anchored to the chip). Delivers enterprise-grade keyboard
 * navigation (arrow keys, Enter, Escape), screen-reader a11y, search, and
 * option grouping out-of-the-box.
 *
 * Modes:
 * - `select` (default): Popper + Autocomplete with inline search input and
 *   filterable options. Click chip → popper opens → option renders → click
 *   or Enter → selects and closes. 2 clicks total.
 * - `custom`: Popover with arbitrary content (number/date inputs).
 */
const ContextChip = forwardRef<HTMLButtonElement, ContextChipProps>(function ContextChip(props, ref) {
  const {
    icon,
    label,
    value,
    placeholder,
    status: statusProp,
    required = false,
    disabled = false,
    errorMessage,
    testId,
    ariaLabel,
    prominence = 'primary',
    requiredHint,
    density = 'regular',
    fullWidth = false
  } = props

  const stableIdBase = useMemo(() => {
    const raw = `${testId ?? ariaLabel ?? label}-${icon}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    return `context-chip-${raw || 'field'}`
  }, [ariaLabel, icon, label, testId])

  const labelId = `${stableIdBase}-label`
  const errorId = `${stableIdBase}-error`
  const liveRegionId = `${stableIdBase}-live`
  const autocompleteId = `${stableIdBase}-autocomplete`

  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const openedAtRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [internalInputValue, setInternalInputValue] = useState('')

  const status: ContextChipStatus = statusProp ?? (value ? 'filled' : 'empty')
  const isInteractive = status !== 'locked' && !disabled

  const handleOpen = (event?: MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault()
    event?.stopPropagation()
    openedAtRef.current = Date.now()
    setOpen(true)
  }

  const handleClose = () => {
    if (Date.now() - openedAtRef.current < 250) return
    setOpen(false)
  }

  const handleAutocompleteClose = (_event: SyntheticEvent, reason: AutocompleteCloseReason) => {
    if (reason === 'escape') handleClose()
  }

  const resolvedValue = value ?? ''
  const displayText = resolvedValue.length > 0 ? resolvedValue : placeholder ?? ''

  const selectedOption =
    !isCustomMode(props) && props.selectedValue
      ? props.options.find(o => o.value === props.selectedValue) ?? null
      : null

  const inputValue = !isCustomMode(props) ? (props.inputValue ?? internalInputValue) : ''
  const selectOptionsCount = !isCustomMode(props) ? props.options.length : 0
  const isSelectLoading = !isCustomMode(props) && props.loading === true

  // Notice to render inside the Autocomplete Paper footer. Only defined for
  // select mode — custom mode has no listbox to pair a notice with.
  const popoverNoticeForPaper = !isCustomMode(props) ? props.popoverNotice : undefined

  // Memoize the PaperComponent so MUI Autocomplete doesn't re-mount the Paper
  // (and re-focus the input) on every parent render. The memo key bakes in the
  // notice + close handler because those drive the render output.
  const autocompletePaperComponent = useMemo(() => {
    const MemoizedPaper = forwardRef<HTMLDivElement, PaperProps>(function MemoizedPaper(
      paperProps,
      paperRef
    ) {
      return (
        <ContextChipAutocompletePaper
          {...paperProps}
          ref={paperRef}
          notice={popoverNoticeForPaper}
          onAfterAction={handleClose}
        />
      )
    })

    return MemoizedPaper
  }, [popoverNoticeForPaper])

  return (
    <>
      <Box
        component='button'
        type='button'
        ref={node => {
          const buttonNode = node as HTMLButtonElement | null

          anchorRef.current = buttonNode
          if (typeof ref === 'function') ref(buttonNode)
          else if (ref) ref.current = buttonNode
        }}
        disabled={!isInteractive}
        onClick={handleOpen}
        aria-haspopup={isCustomMode(props) ? 'dialog' : 'listbox'}
        aria-expanded={open}
        aria-label={ariaLabel ?? `${label}${value ? `: ${value}` : ''}`}
        aria-describedby={[errorMessage ? errorId : null, !isCustomMode(props) && props.liveMessage ? liveRegionId : null]
          .filter(Boolean)
          .join(' ') || undefined}
        aria-invalid={status === 'invalid'}
        aria-labelledby={labelId}
        aria-required={required}
        data-testid={testId}
        sx={theme => {
          const isOpen = open
          const isFilled = status === 'filled'
          const isInvalid = status === 'invalid'
          const isLocked = status === 'locked'
          const isBlocking = status === 'blocking-empty'
          const isInline = prominence === 'inline'
          const isCompact = density === 'compact'

          const borderColor = isInvalid
            ? theme.palette.error.main
            : isBlocking
              ? theme.palette.warning.main
              : isOpen
                ? theme.palette.primary.main
                : alpha(theme.palette.divider, 1)

          const bgColor = isLocked
            ? theme.palette.action.disabledBackground
            : isBlocking
              ? alpha(theme.palette.warning.main, 0.08)
            : isFilled
                ? theme.palette.background.default
                : isInvalid
                  ? alpha(theme.palette.error.main, 0.06)
                  : 'transparent'

          const textColor = isFilled
            ? theme.palette.text.primary
              : isInvalid
                ? theme.palette.error.main
                : isBlocking
                  ? theme.palette.warning.dark
                : isLocked
                  ? theme.palette.text.disabled
                  : theme.palette.text.primary

          // Inline prominence: no box, inline text with hover underline, same popover behavior.
          if (isInline) {
            return {
              minHeight: 34,
              minWidth: 0,
              font: 'inherit',
              appearance: 'none',
              cursor: isInteractive ? 'pointer' : 'default',
              px: 0.85,
              py: 0.45,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              border: `1px solid ${alpha(theme.palette.divider, 0.88)}`,
              backgroundColor: theme.palette.background.paper,
              color: textColor,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              textAlign: 'left',
              boxShadow: 'none',
        transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
                duration: 200,
                easing: 'cubic-bezier(0.2, 0, 0, 1)'
              }),
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              '&:hover': isInteractive
                ? {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    borderColor: alpha(theme.palette.primary.main, 0.32),
                  }
                : undefined,
              '&:active': isInteractive ? { transform: 'translateY(0)' } : undefined,
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2
              },
              '&:disabled': { opacity: 1, pointerEvents: 'none' }
            }
          }

          // Primary prominence: boxed chip (default).
          return {
              minHeight: isCompact ? 40 : 44,
              minWidth: 0,
              font: 'inherit',
              appearance: 'none',
              cursor: isInteractive ? 'pointer' : 'default',

            // fullWidth makes the chip claim 100% of its parent flex/grid cell and
            // drops the natural 40ch content-cap so a distributed-row layout can
            // balance 3 chips across the strip instead of leaving dead space.
            width: fullWidth ? '100%' : undefined,
            maxWidth: fullWidth ? 'none' : '40ch',
            px: isCompact ? 1.25 : 2,
            py: isCompact ? 0.75 : 1.25,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,

            // Solid border on all states (2026 enterprise — Linear, Stripe).
            // Dashed empty borders read as "broken field"; solid + subtle
            // divider alpha reads as "unpopulated field ready for input".
            border: `1px solid ${borderColor}`,
            backgroundColor: bgColor,
            color: textColor,
            display: 'inline-flex',
            alignItems: 'center',
            gap: isCompact ? 0.75 : 1,
            textAlign: 'left',
            boxShadow: isOpen
              ? `0 8px 22px -22px ${alpha(theme.palette.primary.main, 0.76)}, 0 0 0 3px ${alpha(theme.palette.primary.main, 0.075)}`
              : isFilled
                ? `inset 0 0 0 1px ${alpha(theme.palette.common.black, 0.025)}`
                : 'none',
            transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
              duration: 200,
              easing: 'cubic-bezier(0.2, 0, 0, 1)'
            }),
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            '&:hover': isInteractive
              ? {
                  borderColor: isBlocking ? theme.palette.warning.main : theme.palette.primary.main,
                  backgroundColor: isBlocking
                    ? alpha(theme.palette.warning.main, 0.12)
                    : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06),
                  boxShadow: isOpen
                    ? `0 8px 22px -22px ${alpha(theme.palette.primary.main, 0.76)}, 0 0 0 3px ${alpha(theme.palette.primary.main, 0.075)}`
                    : 'none'
                }
              : undefined,
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2
            },
            '&:disabled': { opacity: 1, pointerEvents: 'none' }
          }
        }}
      >
        {prominence === 'inline' ? (
          <>
            <Box
              component='i'
              className={
                status === 'invalid'
                  ? 'tabler-alert-triangle'
                  : status === 'blocking-empty'
                    ? 'tabler-alert-circle'
                    : status === 'locked'
                      ? 'tabler-lock'
                      : icon
              }
              aria-hidden='true'
              sx={{ fontSize: 16, flexShrink: 0, color: status === 'filled' ? 'primary.main' : 'text.secondary' }}
            />
            <Typography
              id={labelId}
              component='span'
              variant='body2'
              sx={{
                fontWeight: status === 'filled' ? 600 : 400,
                color: 'inherit',
                lineHeight: 1.35,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {displayText}
            </Typography>
          </>
        ) : (
          <>
            <Box
              component='i'
              className={
                status === 'invalid'
                  ? 'tabler-alert-triangle'
                  : status === 'blocking-empty'
                    ? 'tabler-alert-circle'
                    : status === 'locked'
                      ? 'tabler-lock'
                      : icon
              }
              aria-hidden='true'
              sx={theme => ({
                width: 32,
                height: 32,
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  status === 'blocking-empty'
                    ? alpha(theme.palette.warning.main, 0.12)
                    : status === 'filled'
                      ? alpha(theme.palette.primary.main, 0.12)
                      : theme.palette.background.default,
                border: `1px solid ${
                  status === 'blocking-empty'
                    ? alpha(theme.palette.warning.main, 0.24)
                    : status === 'filled'
                      ? alpha(theme.palette.primary.main, 0.22)
                      : theme.palette.divider
                }`,
                color:
                  status === 'blocking-empty'
                    ? 'warning.dark'
                    : status === 'filled'
                      ? 'primary.main'
                      : 'text.secondary',
                fontSize: 17,
                flexShrink: 0
              })}
            />
            <Stack spacing={density === 'compact' ? 0.15 : 0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                id={labelId}
                variant='caption'
                sx={{
                  lineHeight: 1.25,
                  color: 'text.secondary',
                  fontWeight: 600,
                  letterSpacing: 0
                }}
              >
                {label}
                {required ? (
                  <Box component='span' aria-hidden='true' sx={{ color: 'error.main', ml: 0.25 }}>
                    *
                  </Box>
                ) : null}
              </Typography>
              <Typography
                variant='body1'
                sx={{
                  fontWeight: status === 'filled' ? 600 : 400,
                  color: status === 'empty' ? 'text.secondary' : 'inherit',
                  lineHeight: 1.35,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {status === 'blocking-empty' ? (
                  <Box component='span' sx={{ color: 'warning.dark', fontWeight: 600 }}>
                    {displayText}
                  </Box>
                ) : (
                  displayText
                )}
              </Typography>
            </Stack>
            {status !== 'locked' ? (
              <Box
                component='i'
                className='tabler-chevron-down'
                aria-hidden='true'
                sx={{
                  fontSize: 16,
                  flexShrink: 0,
                  transition: 'transform 150ms ease-out',
                  transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
                }}
              />
            ) : null}
          </>
        )}
      </Box>

      {prominence === 'primary' && status === 'blocking-empty' && requiredHint ? (
        <Typography
          variant='caption'
          component='span'
          sx={{
            display: 'block',
            mt: 0.5,
            color: 'warning.main',
            fontWeight: 600,
            lineHeight: 1.2
          }}
          aria-hidden='true'
        >
          {requiredHint}
        </Typography>
      ) : null}

      {errorMessage ? (
        <Tooltip
          open={status === 'invalid' && !open}
          title={errorMessage}
          arrow
          placement='bottom-start'
          disableInteractive
        >
          <Box component='span' id={errorId} sx={visuallyHidden}>
            {errorMessage}
          </Box>
        </Tooltip>
      ) : null}

      {!isCustomMode(props) && props.liveMessage ? (
        <Box id={liveRegionId} component='span' aria-live='polite' data-gvc-ignore-layout='true' sx={visuallyHidden}>
          {props.liveMessage}
        </Box>
      ) : null}

      {isCustomMode(props) ? (
        <Popover
          open={open && isInteractive}
          anchorEl={anchorRef.current}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: theme => ({
                mt: 1,
                width: props.popoverWidth ?? 320,
                maxWidth: 'calc(100vw - 32px)',
                // Semantic elevation (TASK-1051): anchored contextual popover → `floating`.
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.greenhouseElevation.floating.borderColor}`,
                boxShadow: theme.greenhouseElevation.floating.boxShadow
              })
            }
          }}
        >
          <Box role='dialog' aria-labelledby={labelId} sx={{ p: 2.5 }}>
            {typeof props.popoverContent === 'function'
              ? props.popoverContent({ close: handleClose })
              : props.popoverContent}
          </Box>
        </Popover>
      ) : (
        <Popper
          open={open && isInteractive}
          anchorEl={anchorRef.current}
          placement='bottom-start'
          sx={{ zIndex: theme => theme.zIndex.modal }}
          modifiers={[
            { name: 'offset', options: { offset: [0, 4] } },
            { name: 'preventOverflow', options: { padding: 16 } }
          ]}
        >
          <ClickAwayListener mouseEvent='onMouseDown' touchEvent='onTouchStart' onClickAway={handleClose}>
            <Paper
              elevation={0}
              sx={theme => ({
                width: props.popoverWidth ?? 360,
                maxWidth: 'calc(100vw - 32px)',
                // Semantic elevation (TASK-1051): anchored contextual popover → `floating`.
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.greenhouseElevation.floating.borderColor}`,
                boxShadow: theme.greenhouseElevation.floating.boxShadow,
                overflow: 'hidden'
              })}
              role='dialog'
              aria-labelledby={labelId}
            >
              <Stack
                direction='row'
                spacing={1.25}
                alignItems='center'
                sx={theme => ({
                  px: 1.25,
                  py: 1,
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.82)}`,
                  backgroundColor: alpha(theme.palette.background.default, 0.46)
                })}
              >
                <Box
                  component='span'
                  aria-hidden='true'
                  sx={theme => ({
                    width: 30,
                    height: 30,
                    borderRadius: `${theme.shape.customBorderRadius.md}px`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`
                  })}
                >
	                    <i className={icon} aria-hidden='true' style={{ fontSize: 17 }} />
                </Box>
                <Stack spacing={0.15} sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant='subtitle2' sx={{ lineHeight: 1.2 }}>
                    {label}
                  </Typography>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                    sx={{ lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {(selectedOption?.label ?? displayText) || (props.searchPlaceholder ?? 'Selecciona una opción')}
                  </Typography>
                </Stack>
                <Typography
                  variant='caption'
                  sx={theme => ({
                    px: 0.9,
                    py: 0.35,
                    borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                    color: isSelectLoading || selectOptionsCount > 0 ? 'primary.main' : 'text.secondary',
                    backgroundColor:
                      isSelectLoading || selectOptionsCount > 0
                        ? alpha(theme.palette.primary.main, 0.12)
                        : alpha(theme.palette.text.primary, 0.05),
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  })}
                >
                  {isSelectLoading
                    ? 'Consultando'
                    : selectOptionsCount === 1
                      ? '1 resultado'
                      : `${selectOptionsCount} resultados`}
                </Typography>
              </Stack>
              <Autocomplete<ContextChipOption, false, true, false>
                id={autocompleteId}
                open
                onClose={handleAutocompleteClose}
                disablePortal
                disableCloseOnSelect={false}
                autoHighlight
                value={selectedOption ?? undefined}
                inputValue={inputValue}
                onInputChange={(_event, nextInputValue) => {
                  if (props.onInputValueChange) {
                    props.onInputValueChange(nextInputValue)
                  } else {
                    setInternalInputValue(nextInputValue)
                  }
                }}
                onChange={(_event, newValue) => {
                  props.onSelectChange(newValue?.value ?? null)
                  props.onOptionSelect?.(newValue ?? null)
                  handleClose()
                }}
                options={props.options}
                getOptionLabel={option => option.label}
                getOptionKey={option => `${option.value}-${option.label}-${props.options.indexOf(option)}`}
                getOptionDisabled={option => option.disabled === true}
                isOptionEqualToValue={(opt, val) => opt.value === val.value}
                loading={props.loading}
                loadingText={
                  <Stack direction='row' spacing={1.25} alignItems='center'>
                    <CircularProgress size={18} thickness={4} />
                    <Stack spacing={0.2}>
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {props.loadingText ?? 'Cargando…'}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Actualizando opciones disponibles.
                      </Typography>
                    </Stack>
                  </Stack>
                }
                noOptionsText={
                  isSelectLoading ? (
                    <Stack direction='row' spacing={1.25} alignItems='center'>
                      <CircularProgress size={18} thickness={4} />
                      <Stack spacing={0.2}>
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                          {props.loadingText ?? 'Cargando…'}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          Actualizando opciones disponibles.
                        </Typography>
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack direction='row' spacing={1.25} alignItems='flex-start'>
                    <Box
                      component='span'
                      aria-hidden='true'
                      sx={theme => ({
                        mt: 0.1,
                        width: 28,
                        height: 28,
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                        backgroundColor: alpha(theme.palette.text.primary, 0.05)
                      })}
                    >
                      <i className='tabler-search-off' aria-hidden='true' style={{ fontSize: 16 }} />
                    </Box>
                    <Stack spacing={0.2}>
                      <Typography variant='body2' sx={{ fontWeight: 600 }}>
                        {props.noOptionsText ?? 'Sin resultados'}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Ajusta la búsqueda o revisa el contexto seleccionado.
                      </Typography>
                    </Stack>
                  </Stack>
                  )
                }
                filterOptions={(options, { inputValue }) => {
                  if (props.filterOptions) {
                    return props.filterOptions(options, inputValue)
                  }

                  const query = inputValue.trim().toLowerCase()

                  if (!query) return options

                  return options.filter(
                    o =>
                      o.label.toLowerCase().includes(query) ||
                      (o.secondary ? o.secondary.toLowerCase().includes(query) : false) ||
                      o.value.toLowerCase().includes(query)
                  )
                }}
                renderInput={params => (
                  <StyledSearchInput
                    ref={params.InputProps.ref}
                    inputProps={params.inputProps}
                    autoFocus
                    placeholder={props.searchPlaceholder ?? 'Buscar…'}
                    startAdornment={
                      <InputAdornment position='start' sx={{ mr: 1 }}>
                        <i className='tabler-search' aria-hidden='true' style={{ fontSize: 18 }} />
                      </InputAdornment>
                    }
                    endAdornment={
                      <InputAdornment position='end' sx={{ ml: 1, display: { xs: 'none', sm: 'flex' } }}>
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={theme => ({
                            px: 0.75,
                            py: 0.25,
                            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                            border: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
                            backgroundColor: alpha(theme.palette.background.default, 0.72),
                            lineHeight: 1.15
                          })}
                        >
                          Enter
                        </Typography>
                      </InputAdornment>
                    }
                  />
                )}
                renderOption={(optionProps: HTMLAttributes<HTMLLIElement>, option, optionState) => {
                  const {
                    key: _muiOptionKey,
                    style: optionStyle,
                    ...resolvedOptionProps
                  } = optionProps as HTMLAttributes<HTMLLIElement> & { key?: Key }

                  void _muiOptionKey

                  const isSelected = option.value === selectedOption?.value
                  const optionKey = `${option.value}-${option.label}-${optionState.index}`

                  const optionContent = props.renderOption ? (
                    props.renderOption(option)
                  ) : (
                    <>
                      <Typography variant='body2' sx={{ fontWeight: 600, lineHeight: 1.3, width: '100%' }}>
                        {option.label}
                      </Typography>
                      {option.secondary ? (
                        <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.2, width: '100%' }}>
                          {option.secondary}
                        </Typography>
                      ) : null}
                    </>
                  )

                  return (
                    <Fragment key={optionKey}>
                    <li
                      {...resolvedOptionProps}
                      style={{
                        ...optionStyle,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}
                    >
                      <Box
                        component='span'
                        aria-hidden='true'
                        sx={theme => ({
                          position: 'relative',
                          width: 30,
                          height: 30,
                          borderRadius: `${theme.shape.customBorderRadius.md}px`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: isSelected ? 'primary.main' : 'text.secondary',
                          backgroundColor: isSelected
                            ? alpha(theme.palette.primary.main, 0.1)
                            : alpha(theme.palette.text.primary, 0.04),
                          border: `1px solid ${
                            isSelected ? alpha(theme.palette.primary.main, 0.2) : alpha(theme.palette.divider, 0.8)
                          }`
                        })}
                      >
                        {option.logoUrl ? (
                          <Box
                            component='img'
                            src={option.logoUrl}
                            alt=''
                            loading='lazy'
                            onError={event => {
                              event.currentTarget.style.display = 'none'
                            }}
                            sx={theme => ({
                              position: 'absolute',
                              inset: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              p: 0.5,
                              borderRadius: `${theme.shape.customBorderRadius.md}px`,
                              backgroundColor: theme.palette.background.paper
                            })}
                          />
                        ) : null}
                        <Typography variant='caption' component='span' sx={{ fontWeight: 700, lineHeight: 1 }}>
                          {buildOptionInitials(option.label)}
                        </Typography>
                      </Box>
	                      <Stack spacing={0.1} sx={{ minWidth: 0, flex: 1 }}>
                        {optionContent}
                      </Stack>
                      <Box
                        component='span'
                        aria-hidden='true'
                        sx={theme => ({
                          width: 26,
                          height: 26,
                          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: isSelected ? 'primary.main' : 'text.disabled',
                          opacity: isSelected ? 1 : 0,
                          transform: isSelected ? 'scale(1)' : 'scale(0.92)',
                          transition: theme.transitions.create(['opacity', 'transform'], {
                            duration: theme.transitions.duration.shortest
                          }),
                          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
                        })}
                      >
                        <i className='tabler-check' aria-hidden='true' style={{ fontSize: 17 }} />
                      </Box>
                    </li>
                    </Fragment>
                  )
                }}
                slotProps={{
                  paper: {
                    sx: {
                      boxShadow: 'none',
                      borderRadius: 0,
                      margin: 0,
                      border: 'none'
                    }
                  },
                  listbox: {
                    sx: theme => ({
	                      maxHeight: 292,
	                      padding: theme.spacing(0.25, 1, 1),
                      '& .MuiAutocomplete-option': {
                        borderRadius: `${theme.shape.customBorderRadius.md}px`,
	                        padding: theme.spacing(0.85, 1),
	                        margin: theme.spacing(0.25, 0),
	                        minHeight: 50,
                        alignItems: 'center !important',
                        border: '1px solid transparent',
                        transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'color'], {
                          duration: theme.transitions.duration.shortest
                        }),
                        '&.Mui-focused': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.035),
                          borderColor: alpha(theme.palette.primary.main, 0.14),
                          boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.045)}`
                        },
                        '&[aria-disabled="true"]': {
                          opacity: 0.56
                        }
                      },
                      '& .MuiAutocomplete-option[aria-selected="true"]': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.09),
                        borderColor: alpha(theme.palette.primary.main, 0.3),
                        color: theme.palette.text.primary
                      },
                      '& .MuiAutocomplete-loading, & .MuiAutocomplete-noOptions': {
                        margin: theme.spacing(0.25, 1.25, 1.25),
                        padding: theme.spacing(1.35, 1.5),
                        borderRadius: `${theme.shape.customBorderRadius.md}px`,
                        backgroundColor: alpha(theme.palette.background.default, 0.62),
                        border: `1px solid ${alpha(theme.palette.divider, 0.72)}`,
                        color: theme.palette.text.secondary
                      }
                    })
                  }
                }}

                // PaperComponent injects the popoverNotice footer INSIDE the
                // Autocomplete's absolutely-positioned Paper so the notice sits
                // below the listbox without being occluded by it in static flow.
                // Memoized via `autocompletePaperComponent` above.
                PaperComponent={autocompletePaperComponent}
              />
            </Paper>
          </ClickAwayListener>
        </Popper>
      )}
    </>
  )
})

export default ContextChip
