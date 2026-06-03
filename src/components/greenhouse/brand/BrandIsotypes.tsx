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

// Color de marca canónico de Microsoft Teams.
const TEAMS_PURPLE = '#5059C9'

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
      bgcolor: '#fff',
      border: theme => `1px solid ${theme.palette.divider}`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    }}
  >
    <i className='tabler-brand-notion' style={{ fontSize: Math.round(size * 0.62), color: '#000', lineHeight: 1 }} />
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
