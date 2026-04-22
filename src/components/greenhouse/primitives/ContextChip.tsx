'use client'

import {
  forwardRef,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type SyntheticEvent
} from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import type { AutocompleteCloseReason } from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import InputAdornment from '@mui/material/InputAdornment'
import InputBase from '@mui/material/InputBase'
import Paper from '@mui/material/Paper'
import Popover from '@mui/material/Popover'
import Popper from '@mui/material/Popper'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, styled } from '@mui/material/styles'

export type ContextChipStatus = 'empty' | 'filled' | 'invalid' | 'locked' | 'blocking-empty'

export type ContextChipProminence = 'primary' | 'inline'

export interface ContextChipOption {
  value: string
  label: string
  secondary?: string
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
  padding: theme.spacing(1.25, 1.5),
  width: '100%',
  borderBottom: `1px solid ${theme.palette.divider}`,
  '& input': {
    borderRadius: 0,
    padding: 0,
    fontSize: '0.875rem',
    fontFamily: theme.typography.fontFamily
  }
}))

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
    requiredHint
  } = props

  const labelId = useId()
  const errorId = useId()
  const liveRegionId = useId()

  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [internalInputValue, setInternalInputValue] = useState('')

  const status: ContextChipStatus = statusProp ?? (value ? 'filled' : 'empty')
  const isInteractive = status !== 'locked' && !disabled

  const handleOpen = () => {
    if (!isInteractive) return
    setOpen(true)
  }

  const handleClose = () => {
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

  return (
    <>
      <ButtonBase
        ref={node => {
          anchorRef.current = node
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
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
        focusRipple
        sx={theme => {
          const isOpen = open
          const isFilled = status === 'filled'
          const isInvalid = status === 'invalid'
          const isLocked = status === 'locked'
          const isBlocking = status === 'blocking-empty'
          const isInline = prominence === 'inline'

          const borderColor = isInvalid
            ? theme.palette.error.main
            : isBlocking
              ? theme.palette.warning.main
              : isFilled || isOpen
                ? theme.palette.primary.main
                : alpha(theme.palette.divider, 1)

          const bgColor = isLocked
            ? theme.palette.action.disabledBackground
            : isBlocking
              ? alpha(theme.palette.warning.main, 0.08)
              : isFilled
                ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08)
                : isInvalid
                  ? alpha(theme.palette.error.main, 0.06)
                  : 'transparent'

          const textColor = isFilled
            ? theme.palette.primary.main
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
              minHeight: 28,
              minWidth: 0,
              px: 0.5,
              py: 0.25,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              border: '1px solid transparent',
              backgroundColor: 'transparent',
              color: textColor,
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 0.75,
              textAlign: 'left',
              transition: theme.transitions.create(['background-color', 'border-color'], {
                duration: 200,
                easing: 'cubic-bezier(0.2, 0, 0, 1)'
              }),
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              '&:hover': isInteractive
                ? {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    textDecoration: 'underline',
                    textDecorationStyle: 'dotted',
                    textDecorationColor: theme.palette.primary.main,
                    textUnderlineOffset: 4
                  }
                : undefined,
              '&.Mui-focusVisible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2
              },
              '&.Mui-disabled': { opacity: 1, pointerEvents: 'none' }
            }
          }

          // Primary prominence: boxed chip (default).
          return {
            minHeight: 44,
            minWidth: 0,
            maxWidth: '40ch',
            px: 1.75,
            py: 1,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            border:
              status === 'empty'
                ? `1px dashed ${borderColor}`
                : `1px solid ${borderColor}`,
            backgroundColor: bgColor,
            color: textColor,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            textAlign: 'left',
            transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'transform'], {
              duration: 200,
              easing: 'cubic-bezier(0.2, 0, 0, 1)'
            }),
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            '&:hover': isInteractive
              ? {
                  borderColor: isBlocking ? theme.palette.warning.main : theme.palette.primary.main,
                  backgroundColor: isBlocking
                    ? alpha(theme.palette.warning.main, 0.12)
                    : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06)
                }
              : undefined,
            '&:active': isInteractive ? { transform: 'scale(0.98)' } : undefined,
            '&.Mui-focusVisible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2
            },
            '&.Mui-disabled': { opacity: 1, pointerEvents: 'none' }
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
              sx={{ fontSize: 14, flexShrink: 0 }}
            />
            <Typography
              id={labelId}
              component='span'
              variant='body2'
              sx={{
                fontWeight: status === 'filled' ? 500 : 400,
                color: 'inherit',
                lineHeight: 1.3,
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
              sx={{ fontSize: 16, flexShrink: 0 }}
            />
            <Stack spacing={0} sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                id={labelId}
                variant='overline'
                sx={{ lineHeight: 1.2, color: 'text.secondary' }}
              >
                {label}
                {required ? (
                  <Box component='span' aria-hidden='true' sx={{ color: 'error.main', ml: 0.25 }}>
                    *
                  </Box>
                ) : null}
              </Typography>
              <Typography
                variant={status === 'filled' ? 'subtitle2' : 'body2'}
                sx={{
                  fontWeight: status === 'filled' ? 500 : 400,
                  color:
                    status === 'empty' || status === 'blocking-empty' ? 'text.secondary' : 'inherit',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontStyle: status === 'empty' ? 'italic' : 'normal'
                }}
              >
                {status === 'blocking-empty' ? (
                  <Box component='span' sx={{ color: 'warning.dark', fontWeight: 500 }}>
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
      </ButtonBase>

      {prominence === 'primary' && status === 'blocking-empty' && requiredHint ? (
        <Typography
          variant='caption'
          component='span'
          sx={{
            display: 'block',
            mt: 0.5,
            color: 'warning.main',
            fontWeight: 500,
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
          <span
            id={errorId}
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
          >
            {errorMessage}
          </span>
        </Tooltip>
      ) : null}

      {!isCustomMode(props) && props.liveMessage ? (
        <Box
          id={liveRegionId}
          component='span'
          aria-live='polite'
          sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
        >
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
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.shadows[6]
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
          <ClickAwayListener onClickAway={handleClose}>
            <Paper
              elevation={0}
              sx={theme => ({
                width: props.popoverWidth ?? 360,
                maxWidth: 'calc(100vw - 32px)',
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.shadows[6],
                overflow: 'hidden'
              })}
              role='dialog'
              aria-labelledby={labelId}
            >
              <Autocomplete<ContextChipOption, false, true, false>
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
                getOptionDisabled={option => option.disabled === true}
                isOptionEqualToValue={(opt, val) => opt.value === val.value}
                loading={props.loading}
                loadingText={props.loadingText ?? 'Cargando…'}
                noOptionsText={props.noOptionsText ?? 'Sin resultados'}
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
                  />
                )}
                renderOption={(optionProps: HTMLAttributes<HTMLLIElement>, option) => {
                  const optionContent = props.renderOption ? (
                    props.renderOption(option)
                  ) : (
                    <>
                      <Typography variant='body2' sx={{ fontWeight: 500, lineHeight: 1.3, width: '100%' }}>
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
                    <li
                      {...optionProps}
                      key={option.value}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 2
                      }}
                    >
                      {optionContent}
                    </li>
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
                      maxHeight: 320,
                      padding: theme.spacing(0.5),
                      '& .MuiAutocomplete-option': {
                        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                        padding: theme.spacing(1.25, 1.75),
                        margin: theme.spacing(0.25, 0),
                        alignItems: 'flex-start !important'
                      },
                      '& .MuiAutocomplete-option[aria-selected="true"]': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                        color: theme.palette.primary.main
                      }
                    })
                  }
                }}
              />
              {props.popoverNotice ? (
                <Stack
                  direction='row'
                  spacing={1}
                  alignItems='flex-start'
                  justifyContent='space-between'
                  sx={theme => ({
                    px: 1.5,
                    py: 1.25,
                    borderTop: `1px solid ${theme.palette.divider}`,
                    backgroundColor:
                      props.popoverNotice?.tone === 'error'
                        ? alpha(theme.palette.error.main, 0.06)
                        : props.popoverNotice?.tone === 'warning'
                          ? alpha(theme.palette.warning.main, 0.08)
                          : props.popoverNotice?.tone === 'info'
                            ? alpha(theme.palette.info.main, 0.08)
                            : alpha(theme.palette.text.primary, 0.03)
                  })}
                >
                  <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.4 }}>
                    {props.popoverNotice.message}
                  </Typography>
                  {props.popoverNotice.actionLabel && props.popoverNotice.onAction ? (
                    <Button
                      size='small'
                      variant='text'
                      color={props.popoverNotice.tone === 'error' ? 'error' : 'primary'}
                      onClick={props.popoverNotice.onAction}
                      sx={{ minWidth: 'auto', px: 0.5, alignSelf: 'center' }}
                    >
                      {props.popoverNotice.actionLabel}
                    </Button>
                  ) : null}
                </Stack>
              ) : null}
            </Paper>
          </ClickAwayListener>
        </Popper>
      )}
    </>
  )
})

export default ContextChip
