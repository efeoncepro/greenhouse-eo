'use client'

import { forwardRef, useId, useRef, useState, type ReactNode } from 'react'

import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import InputAdornment from '@mui/material/InputAdornment'
import Popover from '@mui/material/Popover'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

export type ContextChipStatus = 'empty' | 'filled' | 'invalid' | 'locked'

export interface ContextChipOption {
  value: string
  label: string
  secondary?: string
  disabled?: boolean
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
}

interface ContextChipSelectProps extends ContextChipCommonProps {
  mode?: 'select'
  options: ContextChipOption[]
  selectedValue?: string | null
  onSelectChange: (value: string | null) => void
  noOptionsText?: string
  loading?: boolean
  loadingText?: string
  searchPlaceholder?: string

  /** Popover width. Default 360. */
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
    ariaLabel
  } = props

  const labelId = useId()
  const errorId = useId()

  const anchorRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)

  const status: ContextChipStatus = statusProp ?? (value ? 'filled' : 'empty')
  const isInteractive = status !== 'locked' && !disabled

  const handleOpen = () => {
    if (!isInteractive) return
    setOpen(true)
  }

  const handleClose = () => setOpen(false)

  const resolvedValue = value ?? ''
  const displayText = resolvedValue.length > 0 ? resolvedValue : placeholder ?? ''

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
        aria-describedby={errorMessage ? errorId : undefined}
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

          const borderColor = isInvalid
            ? theme.palette.error.main
            : isFilled || isOpen
              ? theme.palette.primary.main
              : alpha(theme.palette.divider, 1)

          const bgColor = isLocked
            ? theme.palette.action.disabledBackground
            : isFilled
              ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.08)
              : isInvalid
                ? alpha(theme.palette.error.main, 0.06)
                : 'transparent'

          const textColor = isFilled
            ? theme.palette.primary.main
            : isInvalid
              ? theme.palette.error.main
              : isLocked
                ? theme.palette.text.disabled
                : theme.palette.text.primary

          return {
            minHeight: 40,
            minWidth: 0,
            maxWidth: 320,
            px: 1.75,
            py: 1,
            borderRadius: theme.shape.customBorderRadius.lg,
            border: status === 'empty' ? `1px dashed ${borderColor}` : `1px solid ${borderColor}`,
            backgroundColor: bgColor,
            color: textColor,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            textAlign: 'left',
            transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow', 'transform'], {
              duration: theme.transitions.duration.shortest
            }),
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none'
            },
            '&:hover': isInteractive
              ? {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.06)
                }
              : undefined,
            '&:active': isInteractive ? { transform: 'scale(0.98)' } : undefined,
            '&.Mui-focusVisible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2
            },
            '&.Mui-disabled': {
              opacity: 1,
              pointerEvents: 'none'
            }
          }
        }}
      >
        <Box
          component='i'
          className={status === 'invalid' ? 'tabler-alert-triangle' : status === 'locked' ? 'tabler-lock' : icon}
          aria-hidden='true'
          sx={{ fontSize: 16, flexShrink: 0 }}
        />
        <Stack spacing={0} sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            id={labelId}
            variant='caption'
            sx={{
              lineHeight: 1.1,
              fontWeight: 500,
              color: 'inherit',
              opacity: 0.7,
              textTransform: 'none',
              letterSpacing: 0,
              fontSize: '0.6875rem'
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
            variant='body2'
            sx={{
              fontWeight: status === 'filled' ? 600 : 400,
              color: status === 'empty' ? 'text.secondary' : 'inherit',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontStyle: status === 'empty' ? 'italic' : 'normal'
            }}
          >
            {displayText}
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
      </ButtonBase>

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
                borderRadius: theme.shape.customBorderRadius.md,
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
                width: props.popoverWidth ?? 360,
                maxWidth: 'calc(100vw - 32px)',
                borderRadius: theme.shape.customBorderRadius.md,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.shadows[6]
              })
            }
          }}
        >
          <Box sx={{ p: 1.5 }} role='dialog' aria-labelledby={labelId}>
            <Autocomplete<ContextChipOption, false, false, false>
              options={props.options}
              value={props.options.find(o => o.value === props.selectedValue) ?? null}
              open
              disablePortal
              autoHighlight
              openOnFocus
              getOptionLabel={option => option.label}
              isOptionEqualToValue={(opt, val) => opt.value === val.value}
              getOptionDisabled={opt => opt.disabled === true}
              loading={props.loading}
              loadingText={props.loadingText ?? 'Cargando…'}
              noOptionsText={props.noOptionsText ?? 'Sin resultados'}
              onChange={(_, newVal) => {
                props.onSelectChange(newVal?.value ?? null)
                handleClose()
              }}
              renderOption={(optionProps, option) => (
                <Box
                  component='li'
                  {...optionProps}
                  sx={{
                    display: 'flex !important',
                    flexDirection: 'column',
                    alignItems: 'flex-start !important',
                    gap: 0.25
                  }}
                >
                  <Typography variant='body2' sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                    {option.label}
                  </Typography>
                  {option.secondary ? (
                    <Typography variant='caption' color='text.secondary' sx={{ lineHeight: 1.2 }}>
                      {option.secondary}
                    </Typography>
                  ) : null}
                </Box>
              )}
              renderInput={params => (
                <TextField
                  {...params}
                  autoFocus
                  placeholder={props.searchPlaceholder ?? 'Buscar…'}
                  size='small'
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position='start'>
                          <i className='tabler-search' aria-hidden='true' style={{ fontSize: 18 }} />
                        </InputAdornment>
                      )
                    }
                  }}
                />
              )}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: { boxShadow: 'none', m: 0, mt: 0.5 }
                },
                listbox: {
                  sx: {
                    maxHeight: 320,
                    p: 0,
                    '& .MuiAutocomplete-option': {
                      px: 2,
                      py: 1.25,
                      borderRadius: 1,
                      mx: 0.5,
                      my: 0.25
                    }
                  }
                }
              }}
            />
          </Box>
        </Popover>
      )}
    </>
  )
})

export default ContextChip
