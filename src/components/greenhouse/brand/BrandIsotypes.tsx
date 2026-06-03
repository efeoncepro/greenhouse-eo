'use client'

// TASK-998 — Isotipos de marca (Notion / Microsoft Teams) para superficies de
// integración. Decorativos (aria-hidden) — el significado lo cargan los labels de
// texto adyacentes. Paths de marca oficiales (simple-icons), monocromos por marca.

import Box from '@mui/material/Box'

interface IsotypeProps {
  size?: number
}

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
    <svg width={size * 0.62} height={size * 0.62} viewBox='0 0 24 24' fill='#000' role='img'>
      <path d='M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933l3.405-.187zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.354-1.632z' />
    </svg>
  </Box>
)

/**
 * Isotipo Microsoft Teams — mark púrpura oficial (#5059C9).
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
    <svg width={size} height={size} viewBox='0 0 24 24' fill='#5059C9' role='img'>
      <path d='M20.625 8.127q.78 0 1.327.547.548.546.548 1.326v4.875q0 1.027-.502 1.9a3.75 3.75 0 0 1-1.362 1.36 3.65 3.65 0 0 1-1.885.503q-.65 0-1.27-.176a4.7 4.7 0 0 1-1.022 1.512 4.8 4.8 0 0 1-1.512 1.02 4.6 4.6 0 0 1-1.83.369q-1.21 0-2.273-.516a4.95 4.95 0 0 1-1.74-1.412 4.9 4.9 0 0 1-.93-2.038H2.731q-.715 0-1.225-.51a1.67 1.67 0 0 1-.51-1.225V7.84q0-.714.51-1.224.51-.51 1.225-.51h6.387a4.9 4.9 0 0 1 .93-2.04 4.95 4.95 0 0 1 1.74-1.41A5.3 5.3 0 0 1 14.062 2q1.06 0 1.992.404.93.404 1.628 1.102.697.697 1.101 1.627.405.932.405 1.992 0 .516-.106 1.01h1.538zM12.937 7.07q0-.598-.293-1.102a2.2 2.2 0 0 0-.785-.79 2.1 2.1 0 0 0-1.09-.288q-.598 0-1.102.287a2.2 2.2 0 0 0-.79.79 2.1 2.1 0 0 0-.288 1.103v.117h4.348zm-3.351 9.621q.61.99 1.611 1.564 1.002.574 2.18.574.879 0 1.652-.34a4.3 4.3 0 0 0 1.36-.926 4.4 4.4 0 0 0 .925-1.365q.34-.774.34-1.652V9.79h-3.024v4.875q0 .714-.51 1.224-.51.51-1.224.51z' />
    </svg>
  </Box>
)
