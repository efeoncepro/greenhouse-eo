'use client'

import type { ReactNode } from 'react'

import AvatarGroup from '@mui/material/AvatarGroup'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'

// Import directo (NO el barrel de primitives): GreenhouseActivityTimeline (en primitives) importa este
// archivo → importar el barrel acá crearía un ciclo.
import GreenhouseBrandLogoMark from '@/components/greenhouse/primitives/GreenhouseBrandLogoMark'
import type { GreenhouseBrandLogoKind } from '@/components/greenhouse/primitives/greenhouse-brand-logo-controller'
import { getInitials } from '@/utils/getInitials'

export type TeamAvatarGroupMember = {
  name: string
  avatarUrl: string | null
}

/** Variante brand: una marca por slot (isotipo de motor/integración) en vez de avatar de persona. */
export type TeamAvatarGroupBrand = {
  /** Proveedor canónico (`openai`/`anthropic`/`gemini`/`google_ai_overview`/`perplexity`). */
  provider: string
  /** Nombre legible del producto (ChatGPT/Claude/Gemini/Perplexity) — tooltip + a11y. */
  name: string
}

// Mapeo provider → isotipo canónico (espeja `ENGINE_LOGO_KIND` del report-artifact, misma fuente de marcas).
const ENGINE_LOGO_KIND: Record<string, GreenhouseBrandLogoKind> = {
  gemini: 'geminiColor',
  google_ai_overview: 'geminiColor',
  openai: 'gptIsotype',
  anthropic: 'claudeIsologo'
}

// Tooltip AXIS (Figma Design System, node 216:135965): fondo `snackbar` + texto blanco + label-sm +
// radius sm + padding 12/5 + arrow direccional. El radius/padding/color/fontSize ya vienen del override
// global `MuiTooltip` (Vuexy); acá sólo se completa el fondo `snackbar` + peso semibold + color del arrow.
// Mapeado a token (`theme.axis.neutral[mode].snackbar`), NO HEX crudo (Figma Implementation Contract).
const axisTooltipSlotProps = {
  tooltip: {
    sx: (theme: Theme) => ({
      backgroundColor: theme.axis.neutral[theme.palette.mode].snackbar,
      fontWeight: 600,
      // Compacto para isotipos chicos, pero sobre caption/body-sm y no sobre overline/caps.
      fontSize: theme.typography.caption.fontSize,
      lineHeight: 1.45,
      paddingInline: theme.spacing(2),
      paddingBlock: '3px'
    })
  },
  arrow: {
    // Arrow de MUI (cuadrado rotado clipeado por `overflow:hidden` del contenedor) con la punta redondeada
    // vía `border-radius` en el `::before` — imita el chevron AXIS sin romper el clip nativo. (El SVG-mask
    // exacto de AXIS se descartó: desbordaba el contenedor y agrandaba el triángulo.)
    sx: (theme: Theme) => ({
      color: theme.axis.neutral[theme.palette.mode].snackbar,
      '&::before': { borderRadius: '3px' }
    })
  },
  // Sin flip → el arrow siempre apunta hacia abajo (placement `top` determinista; hay espacio arriba).
  popper: {
    modifiers: [{ name: 'flip', enabled: false }]
  }
}

type TeamAvatarGroupProps = {
  /** Variante personas (default). Lista de miembros a mostrar. */
  members?: TeamAvatarGroupMember[]
  /**
   * Variante marca (TASK-1248): isotipos de motor/integración en vez de avatars de persona, precedidos
   * por un `label` inline. Si se pasa `brands`, se ignora `members`.
   */
  brands?: TeamAvatarGroupBrand[]
  /** Texto inline que precede al grupo (solo variante marca), p.ej. "Evaluado en". */
  label?: ReactNode
  /** Maximum slots before showing +N overflow (default: 4) */
  max?: number
  /** Avatar diameter in pixels (default: 32) */
  size?: number
  /** Show tooltip with name on hover (default: true) */
  showTooltip?: boolean
}

// Disco circular OPACO con el isotipo del motor. `background.default` (opaco, theme-aware) → al solaparse
// el disco de adelante tapa al de atrás de verdad (sin la "lente" Venn que generaba un fondo alfa). El ring
// blanco (`background.paper`) recorta el solape, como en un AvatarGroup canónico.
const BrandDisc = ({ brand, size }: { brand: TeamAvatarGroupBrand; size: number }) => {
  const kind = ENGINE_LOGO_KIND[brand.provider]
  const glyphSize = Math.round(size * 0.52)

  const inner =
    brand.provider === 'perplexity' ? (
      <i className='logos-perplexity-icon' aria-hidden style={{ fontSize: glyphSize }} />
    ) : kind ? (
      <GreenhouseBrandLogoMark
        kind={kind}
        size='small'
        decorative
        sx={{
          inlineSize: glyphSize,
          blockSize: glyphSize,
          '& > span': {
            inlineSize: glyphSize,
            blockSize: glyphSize
          }
        }}
      />
    ) : (
      <i className='tabler-robot' aria-hidden style={{ fontSize: glyphSize }} />
    )

  return (
    <CustomAvatar
      size={size}
      sx={theme => ({
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.secondary,
        border: `2px solid ${theme.palette.background.paper}`
      })}
    >
      {inner}
    </CustomAvatar>
  )
}

// Overflow `+N` con el mismo disco/ring que los slots.
const OverflowDisc = ({ count, size, overlap }: { count: number; size: number; overlap: number }) => (
  <Box
    sx={theme => ({
      ml: `${-overlap}px`,
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: theme.palette.background.default,
      border: `2px solid ${theme.palette.background.paper}`,
      color: theme.palette.text.secondary,
      fontSize: theme.typography.caption.fontSize,
      fontWeight: 600
    })}
  >
    +{count}
  </Box>
)

const TeamAvatarGroup = ({
  members = [],
  brands,
  label,
  max = 4,
  size = 32,
  showTooltip = true
}: TeamAvatarGroupProps) => {
  // ── Variante marca (isotipos + label inline) ─────────────────────────────────
  // Solape explícito (no MUI AvatarGroup): así cada slot se puede envolver en el Tooltip AXIS sin que el
  // wrapper rompa el margen negativo del solape. Conserva ring blanco + lift al hover (pull-up) + `+N`.
  if (brands) {
    if (brands.length === 0) return null

    const groupLabel = brands.map(b => b.name).join(', ')
    // Solape sutil: se distinguen los isotipos pero siguen solapados (no pegados).
    const overlap = Math.round(size * 0.18)
    const shown = brands.slice(0, max)
    const overflow = brands.length - shown.length

    return (
      <Stack direction='row' spacing={2} alignItems='center'>
        {label ? (
          <Typography variant='body2' color='text.secondary'>
            {label}
          </Typography>
        ) : null}
        <Box
          sx={{ display: 'flex', alignItems: 'center' }}
          role='img'
          aria-label={label ? `${label}: ${groupLabel}` : groupLabel}
        >
          {shown.map((brand, index) => {
            const slot = (
              <Box
                sx={theme => ({
                  ml: index === 0 ? 0 : `${-overlap}px`,
                  zIndex: shown.length - index,
                  borderRadius: '50%',
                  transition: theme.transitions.create(['transform', 'box-shadow'], {
                    easing: 'ease',
                    duration: theme.transitions.duration.shorter
                  }),
                  '&:hover': {
                    zIndex: shown.length + 1,
                    transform: 'translateY(-5px)',
                    boxShadow: 'var(--mui-customShadows-md)'
                  }
                })}
              >
                <BrandDisc brand={brand} size={size} />
              </Box>
            )

            return showTooltip ? (
              <Tooltip key={index} title={brand.name} arrow placement='top' slotProps={axisTooltipSlotProps}>
                {slot}
              </Tooltip>
            ) : (
              <Box key={index}>{slot}</Box>
            )
          })}
          {overflow > 0 ? <OverflowDisc count={overflow} size={size} overlap={overlap} /> : null}
        </Box>
      </Stack>
    )
  }

  // ── Variante personas (default, byte-idéntica a V1) ──────────────────────────
  if (members.length === 0) return null

  return (
    <AvatarGroup max={max} className='flex items-center pull-up'>
      {members.map((member, index) => {
        const avatar = member.avatarUrl ? (
          <CustomAvatar key={index} src={member.avatarUrl} size={size} alt={member.name} />
        ) : (
          <CustomAvatar key={index} color='primary' skin='light-static' size={size}>
            {getInitials(member.name)}
          </CustomAvatar>
        )

        return showTooltip ? (
          <Tooltip key={index} title={member.name}>
            {avatar}
          </Tooltip>
        ) : (
          avatar
        )
      })}
    </AvatarGroup>
  )
}

export default TeamAvatarGroup
