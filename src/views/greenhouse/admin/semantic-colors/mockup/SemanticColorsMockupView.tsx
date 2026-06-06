'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import { SEMANTIC_COMPARISONS, SURFACES, hexToRgba } from './data'
import type { SemanticComparison, SwatchCell } from './data'

type Mode = 'light' | 'dark'

/** A single rendered sample: soft-alert + chip + status line + ratio badge, on the mode's surface. */
const Sample = ({
  cell,
  mode,
  icon,
  label,
  caption
}: {
  cell: SwatchCell
  mode: Mode
  icon: string
  label: string
  caption: string
}) => {
  const surface = SURFACES[mode]

  return (
    <Box
      style={{ background: surface.paper, borderColor: surface.border }}
      sx={{ p: 3, borderRadius: 2, border: '1px solid', display: 'flex', flexDirection: 'column', gap: 2.5 }}
    >
      {/* cell label + ratio verdict */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant='caption' sx={{ fontWeight: 600, letterSpacing: 0.4 }} style={{ color: surface.muted }}>
          {caption}
        </Typography>
        <Box
          style={{
            color: cell.pass ? '#2E7D32' : '#BB1954',
            background: hexToRgba(cell.pass ? '#2E7D32' : '#BB1954', mode === 'dark' ? 0.22 : 0.12)
          }}
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            fontSize: 12,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums'
          }}
        >
          <i className={cell.pass ? 'tabler-check' : 'tabler-x'} style={{ fontSize: 14 }} />
          {cell.ratio.toFixed(2)}:1
        </Box>
      </Box>

      {/* soft alert */}
      <Box
        style={{ background: hexToRgba(cell.tint, mode === 'dark' ? 0.16 : 0.12), borderColor: cell.tint }}
        sx={{ p: 2, borderRadius: 1.5, borderLeft: '3px solid', display: 'flex', gap: 1.5 }}
      >
        <i className={icon} style={{ color: cell.tint, fontSize: 22, marginTop: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 14 }} style={{ color: cell.tint }}>
            {label} de ejemplo
          </Typography>
          <Typography sx={{ fontSize: 13 }} style={{ color: surface.body }}>
            Mensaje del cuerpo con el color neutro de texto.
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }} style={{ color: cell.tint }}>
            Línea en color {label.toLowerCase()} (este es el que falla).
          </Typography>
        </Box>
      </Box>

      {/* chip + status line */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        <Box
          style={{ background: hexToRgba(cell.tint, mode === 'dark' ? 0.22 : 0.16), color: cell.tint }}
          sx={{ px: 1.5, py: 0.5, borderRadius: 4, fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
        >
          <i className={icon} style={{ fontSize: 14 }} />
          {label}
        </Box>
        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }} style={{ color: cell.tint }}>
          <i className={icon} style={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 600 }} style={{ color: cell.tint }}>
            Estado
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}

const SemanticRow = ({ item, mode }: { item: SemanticComparison; mode: Mode }) => {
  const data = item[mode]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant='overline' sx={{ fontWeight: 700, opacity: 0.7 }}>
          {mode === 'light' ? 'Light' : 'Dark'} · Actual
        </Typography>
        <Sample cell={data.actual} mode={mode} icon={item.icon} label={item.label} caption='tinta actual' />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant='overline' sx={{ fontWeight: 700, opacity: 0.7 }}>
          {mode === 'light' ? 'Light' : 'Dark'} · Propuesta
          {data.proposed.unchanged ? ' (se mantiene)' : ''}
        </Typography>
        <Sample
          cell={data.proposed}
          mode={mode}
          icon={item.icon}
          label={item.label}
          caption={data.proposed.unchanged ? `${data.proposed.tint} · sin cambio` : `${data.proposed.tint} · nueva tinta`}
        />
      </Box>
    </Box>
  )
}

const SemanticColorsMockupView = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1100, mx: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant='h4' sx={{ fontWeight: 700 }}>
          Colores semánticos — contraste a11y (mockup)
        </Typography>
        <Typography variant='body2' color='text.secondary'>
          Comparación visual de la tinta semántica actual vs la propuesta contrast-safe (WCAG 2.2 AA, texto ≥4.5:1).
          El primary no cambia. Cada celda muestra el color usado como tinta — soft-alert, chip, ícono y status text —
          que es donde el contraste se rompe. Los rellenos (botones contained) no se tocan porque MUI ya elige el texto correcto.
        </Typography>
      </Box>

      {SEMANTIC_COMPARISONS.map(item => (
        <Card key={item.key} variant='outlined'>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                style={{ background: hexToRgba(item.light.actual.tint, 0.16), color: item.light.actual.tint }}
                sx={{ width: 44, height: 44, borderRadius: 2, display: 'grid', placeItems: 'center' }}
              >
                <i className={item.icon} style={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant='h6' sx={{ fontWeight: 700 }}>
                  {item.label}
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  {item.usage}
                </Typography>
              </Box>
            </Box>

            <SemanticRow item={item} mode='light' />
            <SemanticRow item={item} mode='dark' />
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

export default SemanticColorsMockupView
