import { alpha, type Theme } from '@mui/material/styles'

// TASK-1078 — Scrollbar canónico del chat de Nexa: thin + overlay auto-hide (oculto en
// reposo, revela con fade suave al hover/focus). Compartido por los dos paneles del modo
// expandido (rail de historial + conversación) → consistencia, sin el "doble scroll"
// chunky. El viewport de la conversación AÑADE encima la reveal por scroll-activity (vía
// el atributo `data-scrolling` del ancestro; ver NexaThread). reduced-motion → sin fade.
//
// NOTA: usa SOLO pseudo-clases (:hover/:focus-within), nunca atributos sobre el propio
// elemento scrollable — assistant-ui lo observa con un MutationObserver y mutarlo re-ancla
// el scroll al fondo (bug del up-scroll). Por eso la reveal por scroll-activity vive en el
// ancestro, no acá.
export const nexaThinScrollbarSx = (theme: Theme) => ({
  scrollbarWidth: 'thin' as const,
  scrollbarColor: 'transparent transparent',
  '&:hover, &:focus-within': {
    scrollbarColor: `${alpha(theme.palette.text.primary, 0.26)} transparent`
  },
  '&::-webkit-scrollbar': { width: 11, height: 11 },
  '&::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'transparent',
    borderRadius: 9999,
    border: '3px solid transparent',
    backgroundClip: 'padding-box',
    transition: 'background-color 320ms cubic-bezier(0.4, 0, 0.2, 1)'
  },
  '&:hover::-webkit-scrollbar-thumb, &:focus-within::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.text.primary, 0.24)
  },
  '&::-webkit-scrollbar-thumb:hover': { backgroundColor: alpha(theme.palette.text.primary, 0.36) }
  // reduced-motion (transition del thumb / scroll-behavior) lo agrega cada consumer en su
  // propio bloque `@media` para no colisionar el key al hacer spread.
})
