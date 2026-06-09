'use client'

// TASK-998 — Isotipos de marca (Notion / Microsoft Teams) para superficies de
// integración. Decorativos (aria-hidden) — el significado lo cargan los labels de
// texto adyacentes. Usan los glyphs Tabler ya bundleados (mismo sistema de iconos
// que todo el portal) en vez de paths SVG hand-transcritos, que rendían como un
// blob malformado (caso Teams) y arrastraban marcas retiradas de simple-icons.

import Box from '@mui/material/Box'

interface IsotypeProps {
  size?: number
}

// Colores de marca canónicos.
const TEAMS_PURPLE = '#5059C9'
const HUBSPOT_ORANGE = '#FF7A59'

/**
 * Isotipo Notion — glyph "N" negro sobre cuadro blanco redondeado (lockup canónico
 * de la marca en superficies claras).
 */
export const NotionIsotype = ({ size = 28 }: IsotypeProps) => (
  <Box
    aria-hidden
    sx={{
      width: size,
      height: size,
      borderRadius: `${Math.round(size * 0.22)}px`,
      bgcolor: 'common.white',
      border: theme => `1px solid ${theme.palette.divider}`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}
  >
    <i className='tabler-brand-notion' style={{ fontSize: Math.round(size * 0.62), color: 'var(--mui-palette-common-black)', lineHeight: 1 }} />
  </Box>
)

/**
 * Isotipo Microsoft Teams — glyph Tabler púrpura oficial (#5059C9).
 */
export const TeamsIsotype = ({ size = 28 }: IsotypeProps) => (
  <Box
    aria-hidden
    sx={{
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}
  >
    <i className='tabler-brand-teams' style={{ fontSize: size, color: TEAMS_PURPLE, lineHeight: 1 }} />
  </Box>
)

/**
 * Isotipo HubSpot — "sprocket" naranja oficial (#FF7A59). Tabler NO tiene un
 * brand-hubspot, así que el path es el oficial de **simple-icons** (iconify),
 * verificado — NO hand-authored. Si Tabler agrega brand-hubspot al bundle,
 * migrar a `<i className='tabler-brand-hubspot'>` como Notion/Teams.
 */
export const HubSpotIsotype = ({ size = 28 }: IsotypeProps) => (
  <Box
    aria-hidden
    sx={{
      width: size,
      height: size,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}
  >
    <svg width={size} height={size} viewBox='0 0 24 24' role='img' style={{ color: HUBSPOT_ORANGE }}>
      <path
        fill='currentColor'
        d='M18.164 7.93V5.084a2.2 2.2 0 0 0 1.267-1.978v-.067A2.2 2.2 0 0 0 17.238.845h-.067a2.2 2.2 0 0 0-2.193 2.193v.067a2.2 2.2 0 0 0 1.252 1.973l.013.006v2.852a6.2 6.2 0 0 0-2.969 1.31l.012-.01l-7.828-6.095A2.497 2.497 0 1 0 4.3 4.656l-.012.006l7.697 5.991a6.2 6.2 0 0 0-1.038 3.446a6.2 6.2 0 0 0 1.147 3.607l-.013-.02l-2.342 2.343a2 2 0 0 0-.58-.095h-.002a2.033 2.033 0 1 0 2.033 2.033a2 2 0 0 0-.1-.595l.005.014l2.317-2.317a6.247 6.247 0 1 0 4.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 1 1 3.215-3.207v.002a3.206 3.206 0 0 1-3.207 3.207z'
      />
    </svg>
  </Box>
)
