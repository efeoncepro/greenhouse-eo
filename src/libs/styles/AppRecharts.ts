'use client'

// MUI imports
import { styled } from '@mui/material/styles'

// Styled Components
const AppRecharts = styled('div')(({ theme }) => ({
  // TASK-1041 — gobierna familia + TAMAÑO del texto de chart desde el SoT
  // (caption = body-sm), una sola vez para los charts Recharts (espejo del
  // wrapper Apex). Targetea ejes/leyenda/labels SVG; cambiar el SoT propaga a
  // todos sin tocar cada chart. NO incluye títulos (van como header del Card).
  '& .recharts-text, & .recharts-cartesian-axis-tick-value, & .recharts-legend-item-text, & .recharts-label, & .recharts-polar-angle-axis-tick-value, & .recharts-polar-radius-axis-tick-value':
    {
      fontFamily: `${theme.typography.fontFamily} !important`,
      fontSize: `${theme.typography.caption.fontSize} !important`
    },
  '& .recharts-cartesian-grid-vertical, & .recharts-cartesian-grid-horizontal, & .recharts-polar-grid-angle, & .recharts-polar-radius-axis, & .recharts-cartesian-axis':
    {
      '& line': {
        stroke: 'var(--mui-palette-divider)'
      }
    },
  '& .recharts-polar-grid-concentric-polygon': {
    stroke: 'var(--mui-palette-divider)'
  },
  '& .recharts-tooltip-wrapper': {
    outline: 'none'
  },
  '& .recharts-default-tooltip': {
    border: 'none !important',
    boxShadow: 'var(--mui-customShadows-xs)',
    borderRadius: 'var(--mui-shape-borderRadius)',
    backgroundColor: 'var(--mui-palette-background-paper) !important'
  },
  '& .recharts-custom-tooltip': {
    padding: theme.spacing(2.5),
    boxShadow: 'var(--mui-customShadows-xs)',
    borderRadius: 'var(--mui-shape-borderRadius)',
    backgroundColor: 'var(--mui-palette-background-paper)'
  },
  '& .recharts-tooltip-cursor': {
    fill: 'var(--mui-palette-action-hover)'
  },
  '& .recharts-yAxis .recharts-cartesian-axis-ticks .recharts-cartesian-axis-tick .recharts-cartesian-axis-tick-value':
    {
      textAnchor: theme.direction === 'rtl' ? 'end' : undefined
    },
  '& .recharts-active-dot .recharts-dot': {
    fill: 'var(--mui-palette-secondary-main)'
  },
  '& .recharts-tooltip-item': {
    fontSize: '0.875rem',
    color: 'var(--mui-palette-text-primary) !important'
  },
  '& .recharts-text': {
    fontSize: '0.8125rem',
    fill: 'var(--mui-palette-text-disabled)'
  },
  '& .recharts-pie .recharts-sector, & .recharts-layer': {
    outline: 'none !important'
  }
}))

export default AppRecharts
