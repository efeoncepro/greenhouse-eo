'use client'

import { useTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'

/**
 * Gauge de salud del sitio — arco SVG determinista, NO una librería de charts.
 *
 * Nació en el sidebar del cockpit (TASK-1306) y lo comparte la Auditoría (TASK-1309):
 * es la MISMA métrica (`seo_site_audit_runs.health_score`) leída en dos pantallas
 * hermanas, así que duplicar el dibujo sería invitar a que diverjan los umbrales y el
 * mismo sitio se viera "sano" en una pantalla y "en riesgo" en la otra.
 *
 * ⚠️ NO usar un radialBar de ApexCharts acá. Depende de medir su contenedor al montar;
 * dentro de una columna fluida mide 0 y el arco no se dibuja — un hueco en blanco, sin
 * error visible, verificado en GVC durante 1306. Un solo número entre 0 y 100 no
 * justifica esa fragilidad: el arco se calcula con `strokeDasharray` sobre un path fijo,
 * así que rinde igual en SSR, en el primer paint y en la captura, sin depender del ancho
 * disponible ni de un import dinámico.
 *
 * El color sigue el umbral de salud y va acompañado SIEMPRE del número — nunca es la
 * única señal (a11y: 8% de daltonismo no puede quedar sin el dato).
 *
 * `score === null` NO se renderiza acá: null y 0 son cosas distintas (score no calculado
 * vs sitio pésimo) y el consumer debe decir "Pendiente" con palabras. Ver TASK-1306.
 */

interface Props {
  /** Salud 0–100 ya resuelta como número. Para `null`, el consumer pinta su estado honesto. */
  score: number
  /** Lado del gauge en px. El default es el del sidebar; la Auditoría lo usa más grande. */
  size?: number
  /** `aria-label` ya interpolado con el score — el copy vive en la capa de copy. */
  ariaLabel: string
}

/** Arco de 270° (de -135° a 135°). El hueco inferior evita que un score bajo se lea como un círculo casi completo. */
const RADIUS = 54

/**
 * Tamaño del número dentro del arco, en unidades del `viewBox` — NO es tipografía de
 * documento y por eso no sale de una variante: escala con el `size` del gauge junto al
 * resto del dibujo, igual que `RADIUS`. Tokenizarlo como `h4` lo desacoplaría del arco y
 * el número dejaría de crecer con él.
 */
const SCORE_FONT_SIZE = '2rem'
const ARC_LENGTH = 2 * Math.PI * RADIUS * 0.75
const FULL_CIRCLE = 2 * Math.PI * RADIUS

const SeoHealthGauge = ({ score, size = 160, ariaLabel }: Props) => {
  const theme = useTheme()
  const rounded = Math.round(score)
  const progress = (Math.min(100, Math.max(0, rounded)) / 100) * ARC_LENGTH

  const tone =
    rounded >= 80 ? theme.palette.success.main : rounded >= 50 ? theme.palette.warning.main : theme.palette.error.main

  return (
    <Box role='img' aria-label={ariaLabel} sx={{ display: 'flex', justifyContent: 'center' }}>
      <Box component='svg' viewBox='0 0 140 140' sx={{ inlineSize: size, blockSize: size }} aria-hidden='true'>
        <circle
          cx='70'
          cy='70'
          r={RADIUS}
          fill='none'
          stroke={theme.palette.divider}
          strokeWidth='12'
          strokeLinecap='round'
          strokeDasharray={`${ARC_LENGTH} ${FULL_CIRCLE}`}
          transform='rotate(135 70 70)'
        />
        <circle
          cx='70'
          cy='70'
          r={RADIUS}
          fill='none'
          stroke={tone}
          strokeWidth='12'
          strokeLinecap='round'
          strokeDasharray={`${progress} ${FULL_CIRCLE}`}
          transform='rotate(135 70 70)'
        />
        <text
          x='70'
          y='78'
          textAnchor='middle'
          fill={theme.palette.text.primary}
          style={{ fontSize: SCORE_FONT_SIZE, fontWeight: 600 }}
        >
          {rounded}
        </text>
      </Box>
    </Box>
  )
}

export default SeoHealthGauge
