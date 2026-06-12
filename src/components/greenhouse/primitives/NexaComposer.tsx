'use client'

import { forwardRef, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import InputAdornment from '@mui/material/InputAdornment'
import { alpha, useTheme } from '@mui/material/styles'
import type { SxProps, Theme } from '@mui/material/styles'
import type { TextFieldProps } from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'

import GreenhouseNexaAnimatedMark from './GreenhouseNexaAnimatedMark'
import NexaGlowBorder from './NexaGlowBorder'
import { GREENHOUSE_NEXA_BRAND_COLORS } from './greenhouse-nexa-brand-controller'
import {
  resolveNexaComposerKind,
  resolveNexaComposerVariant,
  type NexaComposerKind,
  type NexaComposerVariant
} from './nexa-composer-controller'

/**
 * NexaComposer — primitive canónica del campo de composición de Nexa.
 *
 * Patrón **Primitive + Variants + Kinds**: `chat` cubre el composer conversacional y
 * `command` cubre entradas compactas tipo command/search con Nexa mark + shortcut.
 * Kinds como `knowledgeAsk` resuelven a una variant oficial sin forkear el glow ni el
 * input.
 *
 * **Runtime-agnóstica.** No importa `@assistant-ui/react`. La consumer cablea el runtime
 * (assistant-ui `ComposerPrimitive.Root/.Input/.Send/.Cancel`) vía `asChild` sobre estas
 * partes:
 *
 * ```tsx
 * <ComposerPrimitive.Root>
 *   <NexaComposer disclaimer={COPY.composer_disclaimer}>
 *     <ComposerPrimitive.Input asChild>
 *       <NexaComposerInput placeholder={COPY.composer_placeholder} endAdornment={
 *         isRunning
 *           ? <ComposerPrimitive.Cancel asChild><NexaComposerActionButton variant='stop' aria-label={ariaStop} /></ComposerPrimitive.Cancel>
 *           : <ComposerPrimitive.Send asChild><NexaComposerActionButton variant='send' aria-label={ariaSend} /></ComposerPrimitive.Send>
 *       } />
 *     </ComposerPrimitive.Input>
 *   </NexaComposer>
 * </ComposerPrimitive.Root>
 * ```
 *
 * Tokens: cero hardcode — radius `theme.shape.customBorderRadius`, colores brand Nexa SSOT
 * (`GREENHOUSE_NEXA_BRAND_COLORS`), tipografía SoT (`caption`), transitions del theme.
 * a11y/reduced-motion horneados (`aria-label` obligatorio en el botón, `:disabled` styling,
 * el glow respeta `prefers-reduced-motion` internamente).
 */

// ──────────────────────────────────────────────────────────────────────────────
// Action button (send / stop) — variants de la misma familia visual
// ──────────────────────────────────────────────────────────────────────────────

export type NexaComposerActionVariant = 'send' | 'stop'

export interface NexaComposerActionButtonProps {
  /** `send` = navy en reposo → teal al hover (energiza). `stop` = navy → gris (calma). */
  variant: NexaComposerActionVariant
  /** Etiqueta accesible obligatoria (la consumer la trae del copy es-CL canónico). */
  'aria-label': string
  onClick?: () => void
  disabled?: boolean
}

/**
 * Botón circular del composer. `Box component='button'` (no `IconButton`) para controlar el
 * fondo sin que el `:hover` de MUI lo pise. `send` = navy→teal; `stop` = navy→gris.
 * forwardRef + spread → válido como target `asChild` de `ComposerPrimitive.Send`/`.Cancel`.
 */
export const NexaComposerActionButton = forwardRef<HTMLButtonElement, NexaComposerActionButtonProps>(
  ({ variant, disabled, onClick, ...rest }, ref) => {
    const theme = useTheme()
    const { midnightNavy, electricTeal } = GREENHOUSE_NEXA_BRAND_COLORS
    const isStop = variant === 'stop'

    return (
      <Box
        ref={ref}
        component='button'
        type='button'
        onClick={onClick}
        disabled={disabled}
        {...rest}
        sx={{
          width: 30,
          height: 30,
          flexShrink: 0,
          p: 0,
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: midnightNavy,
          color: 'common.white',
          boxShadow: `0 1px 3px ${alpha(midnightNavy, 0.32)}`,
          transition: theme.transitions.create(['background-color', 'color', 'transform', 'box-shadow'], {
            duration: theme.transitions.duration.shortest
          }),
          '&:hover': isStop
            ? {
                // Detener = acción NEUTRAL (no destructiva): hover gris calma, no energiza.
                bgcolor: alpha(theme.palette.text.primary, 0.14),
                color: midnightNavy,
                transform: 'translateY(-1px)',
                boxShadow: `0 2px 6px ${alpha(theme.palette.common.black, 0.16)}`
              }
            : {
                bgcolor: electricTeal,
                color: midnightNavy,
                transform: 'translateY(-1px) scale(1.04)',
                boxShadow: `0 2px 8px ${alpha(electricTeal, 0.45)}`
              },
          '&:hover svg': isStop ? { fill: midnightNavy } : { stroke: midnightNavy },
          '&:active': { transform: 'scale(0.94)' },
          '&:focus-visible': isStop
            ? { outline: 'none', boxShadow: `0 0 0 3px ${alpha(theme.palette.text.primary, 0.28)}` }
            : { outline: 'none', boxShadow: `0 0 0 3px ${alpha(electricTeal, 0.5)}` },
          '&:disabled': {
            bgcolor: alpha(theme.palette.text.primary, 0.08),
            color: 'action.disabled',
            boxShadow: 'none',
            cursor: 'default',
            transform: 'none'
          },
          '&:disabled svg': { stroke: theme.palette.action.disabled }
        }}
      >
        {isStop ? (
          <Box component='svg' aria-hidden viewBox='0 0 24 24' sx={{ width: 11, height: 11, fill: theme.palette.common.white }}>
            <rect x='6' y='6' width='12' height='12' rx='2.5' />
          </Box>
        ) : (
          <Box
            component='svg'
            aria-hidden
            viewBox='0 0 24 24'
            fill='none'
            sx={{
              width: 15,
              height: 15,
              stroke: theme.palette.common.white,
              strokeWidth: 2.25,
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            }}
          >
            <path d='M12 19V5' />
            <path d='M5 12l7-7 7 7' />
          </Box>
        )}
      </Box>
    )
  }
)

NexaComposerActionButton.displayName = 'NexaComposerActionButton'

// ──────────────────────────────────────────────────────────────────────────────
// Input — CustomTextField Vuexy con la caja FILLED anulada (el glow pinta TODO)
// ──────────────────────────────────────────────────────────────────────────────

export type NexaComposerInputProps = TextFieldProps & {
  variant?: NexaComposerVariant
  kind?: NexaComposerKind
  leadingAdornment?: ReactNode
  /** Adorno final (botón send/stop). Se inyecta en `slotProps.input.endAdornment`. */
  endAdornment?: ReactNode
  shortcutLabel?: ReactNode
  showNexaMark?: boolean
}

/**
 * El input del composer. Anula por completo el box de la variante FILLED de Vuexy
 * (radius/sombra/underline/fondo) → el input NO dibuja ninguna caja; el borde + el acento de
 * foco los pinta `NexaGlowBorder` en la MISMA caja (sin box anidado de radio distinto).
 * forwardRef + spread → válido como target `asChild` de `ComposerPrimitive.Input`.
 */
export const NexaComposerInput = forwardRef<HTMLDivElement, NexaComposerInputProps>(
  (
    {
      endAdornment,
      leadingAdornment,
      multiline,
      minRows,
      maxRows,
      autoComplete = 'off',
      slotProps,
      sx,
      variant,
      kind,
      shortcutLabel,
      showNexaMark,
      inputProps,
      ...rest
    },
    ref
  ) => {
    const config = resolveNexaComposerVariant(variant, kind)
    const kindConfig = resolveNexaComposerKind(kind)
    const resolvedShortcut = shortcutLabel ?? config.shortcutLabel
    const shouldShowNexaMark = showNexaMark ?? config.showNexaMark

    const resolvedLeadingAdornment = leadingAdornment ?? (shouldShowNexaMark ? (
      <GreenhouseNexaAnimatedMark kind='inlineMark' size='small' ariaLabel='Nexa' />
    ) : null)

    const resolvedEndAdornment = endAdornment ?? (resolvedShortcut ? (
      <Typography variant='caption' color='text.secondary' sx={{ whiteSpace: 'nowrap' }}>
        {resolvedShortcut}
      </Typography>
    ) : null)

    return (
      <CustomTextField
        ref={ref}
        fullWidth
        multiline={multiline ?? config.multiline}
        minRows={minRows ?? config.minRows}
        maxRows={maxRows ?? config.maxRows}
        autoComplete={autoComplete}
        inputProps={{
          'aria-label': kindConfig.ariaLabel,
          ...inputProps
        }}
        sx={[
          {
            '& .MuiInputBase-root, & .MuiFilledInput-root': {
              minBlockSize: config.minBlockSize,
              borderRadius: `${config.inputRadius}px`,
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              py: 0.5,
              border: 'none !important',
              backgroundColor: 'transparent !important',
              boxShadow: 'none !important',
              color: 'text.primary',
              '&:before, &:after': { display: 'none' },
              '&:hover': { border: 'none !important', backgroundColor: 'transparent !important', boxShadow: 'none !important' },
              '&.Mui-focused': { border: 'none !important', backgroundColor: 'transparent !important', boxShadow: 'none !important' }
            }
          },
          ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
        ]}
        slotProps={{
          ...slotProps,
          input: {
            ...(slotProps?.input as object | undefined),
            startAdornment: resolvedLeadingAdornment ? (
              <InputAdornment position='start'>{resolvedLeadingAdornment}</InputAdornment>
            ) : undefined,
            endAdornment: resolvedEndAdornment ? (
              <InputAdornment
                position='end'
                sx={config.endAdornmentAlign === 'bottom' ? { alignSelf: 'flex-end', mb: '5px' } : { alignSelf: 'center' }}
              >
                {resolvedEndAdornment}
              </InputAdornment>
            ) : undefined
          }
        }}
        {...rest}
      />
    )
  }
)

NexaComposerInput.displayName = 'NexaComposerInput'

// ──────────────────────────────────────────────────────────────────────────────
// Root shell — outer container + NexaGlowBorder + disclaimer
// ──────────────────────────────────────────────────────────────────────────────

export interface NexaComposerProps {
  variant?: NexaComposerVariant
  kind?: NexaComposerKind
  /** El input cableado al runtime (ej. `<ComposerPrimitive.Input asChild><NexaComposerInput …/></…>`). */
  children: ReactNode
  /** Texto legal/aviso bajo el composer. One-off a 11px (bajo el piso del SoT, aprobado). */
  disclaimer?: ReactNode
  /** Color del anillo de foco que pinta el glow. Default `primary.main`. */
  focusRingColor?: string
  /** Radio del glow. Default 14 (alineado con el radius interno del input). */
  radius?: number
  /** Grosor del anillo. Default resuelto por variant/kind. */
  thickness?: number
  /** sx opcional para el disclaimer (raro; el default ya es el aprobado). */
  disclaimerSx?: SxProps<Theme>
}

/**
 * Presentación INTRÍNSECA del composer: glow + disclaimer. El **placement** (sticky, bgcolor,
 * maxWidth, `data-capture`) lo gobierna la consumer en su contenedor — así la primitive no
 * asume dónde vive (chat flotante sticky / Home / futuros surfaces).
 */
const NexaComposer = ({ children, disclaimer, focusRingColor, radius, thickness, disclaimerSx, variant, kind }: NexaComposerProps) => {
  const theme = useTheme()
  const config = resolveNexaComposerVariant(variant, kind)

  return (
    <>
      <NexaGlowBorder radius={radius ?? config.radius} thickness={thickness ?? config.thickness} focusRingColor={focusRingColor ?? theme.palette.primary.main}>
        {children}
      </NexaGlowBorder>
      {disclaimer ? (
        <Box
          component='span'
          sx={[
            {
              typography: 'caption',
              color: 'text.disabled',
              textAlign: 'center',
              display: 'block',
              mt: 1,
              fontSize: '0.6875rem',
              letterSpacing: 0.1
            },
            ...(Array.isArray(disclaimerSx) ? disclaimerSx : disclaimerSx ? [disclaimerSx] : [])
          ]}
        >
          {disclaimer}
        </Box>
      ) : null}
    </>
  )
}

export default NexaComposer
