'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Comparación de iteración de color — Dirección D (anterior) vs Restraint (nueva).
// Mockup interno. NO tokeniza nada (hex literales a propósito). Compara SOLO las
// superficies de decisión: el azul, botones, link/nav, verdes, charts, dark.
// Las semánticas de feedback son idénticas en ambas (ya eran modernas + AA) y se
// muestran una sola vez. Doc de razonamiento: docs/operations/proposals/TASK-1053-*.md
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const DARK_SURFACE = '#25293C'
const ERROR = '#DC2E39'
const ERROR_DARK = '#C01D27'

type Palette = {
  key: 'd' | 'r'
  label: string
  tagline: string
  accent: string
  navy: string
  accentDark: string
  accentRamp: string[]
  brandInk: string
  brandPop: string
  greens: { hex: string; label: string }[]
  greenNote: string
  blueNote: string
  chart: string[]
  chartNote: string
}

const D: Palette = {
  key: 'd',
  label: 'Dirección D — anterior',
  tagline: 'Doble-navy oscuro + 5 hues de marca + charts sobre el primary.',
  accent: '#024C8F',
  navy: '#023C70',
  accentDark: '#6BA6E8',
  accentRamp: ['#E1EAF2', '#BDD0E2', '#90B0CE', '#4E82B1', '#024C8F', '#024078', '#013461', '#01284A', '#011B33'],
  brandInk: '#3E7A12',
  brandPop: '#6EC207',
  greens: [
    { hex: '#3E7A12', label: 'canon olivo' },
    { hex: '#6EC207', label: 'vivid lima' }
  ],
  greenNote: 'Dos verdes (olivo + lima): ninguno confiado.',
  blueNote: 'Navy y acento son dos azules oscuros casi iguales → corporativo/pesado.',
  chart: ['#024C8F', '#155CAD', '#023C70', '#1A5EB8', '#013461', '#0362BA'],
  chartNote: 'Sin paleta categórica → las series caen en navy/azules oscuros. Muro de azul, baja diferenciación.'
}

const R: Palette = {
  key: 'r',
  label: 'Restraint v1 — nueva',
  tagline: 'Un acento confiado; navy = su shade oscuro; un verde; charts categóricos.',
  accent: '#0375DB',
  navy: '#023C70',
  accentDark: '#6FACF0',
  accentRamp: ['#CFE4FA', '#A6CDF5', '#6FACF0', '#2E8BE8', '#0375DB', '#0362BA', '#024C8F', '#023C70', '#00284D'],
  brandInk: '#4B8405',
  brandPop: '#6EC207',
  greens: [
    { hex: '#4B8405', label: 'green marca (uno)' },
    { hex: '#6EC207', label: 'pop' }
  ],
  greenNote: 'Un verde crisp + su pop. El olivo se elimina.',
  blueNote: 'Navy es el step oscuro del MISMO ramp. Una sola familia de azul.',
  chart: ['#0375DB', '#6EC207', '#FF6500', '#7C3AED', '#06B6D4', '#EC4899'],
  chartNote: 'Paleta categórica VIBRANTE anclada a la marca (azul · lima · naranja + violeta · cian · magenta). Pop, distinta. Verificar Coblis + color nunca solo.'
}

const SEM = [
  { role: 'Info', ink: '#155CAD', tint: '#E8F1FD', border: '#C2DBF7', icon: 'tabler-info-circle' },
  { role: 'Success', ink: '#11703F', tint: '#E7F6EE', border: '#BCE6CF', icon: 'tabler-circle-check' },
  { role: 'Warning', ink: '#8A5A00', tint: '#FFF4D6', border: '#F5D98A', icon: 'tabler-alert-triangle' },
  { role: 'Error', ink: '#C01D27', tint: '#FDECEC', border: '#F5C2C4', icon: 'tabler-circle-x' }
]

const BAR_HEIGHTS = [68, 44, 82, 36, 58, 50]

const DARK_PAPER = '#2F3349'
const DARK_TEXT = 'rgba(255,255,255,0.92)'
const DARK_DIM = 'rgba(255,255,255,0.60)'

// Charts en dark: misma paleta vibrante, levantada en luminosidad para popear sobre charcoal
// (el azul #0375DB queda dim sobre dark → se sube a #3B8EE8). Dark = derivación propia, no invertir.
const CHART_DARK = ['#3B8EE8', '#7FD42A', '#FF8A3D', '#9B6BF0', '#22C9E4', '#F25BAC']

const SEM_DARK = [
  { role: 'Info', fg: '#6FB0F0', icon: 'tabler-info-circle' },
  { role: 'Success', fg: '#5FC891', icon: 'tabler-circle-check' },
  { role: 'Warning', fg: '#E8B84B', icon: 'tabler-alert-triangle' },
  { role: 'Error', fg: '#F08A8F', icon: 'tabler-circle-x' }
]

const Swatch = ({ hex, label, sub }: { hex: string; label: string; sub?: string }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minInlineSize: 0 }}>
    <Box sx={theme => ({ bgcolor: hex, blockSize: 40, borderRadius: `${theme.shape.customBorderRadius.sm}px`, border: `1px solid ${theme.palette.divider}` })} />
    <Typography sx={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.3 }}>{label}</Typography>
    {sub ? (
      <Typography color='text.secondary' sx={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
        {sub}
      </Typography>
    ) : null}
  </Box>
)

const Block = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box>
    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.75, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {title}
    </Typography>
    {children}
  </Box>
)

const PaletteColumn = ({ p }: { p: Palette }) => (
  <Card variant='outlined' sx={{ borderColor: p.key === 'r' ? p.accent : undefined, borderWidth: p.key === 'r' ? 2 : 1 }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 800 }}>
          {p.label}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          {p.tagline}
        </Typography>
      </Box>

      <Block title='El azul'>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
          <Swatch hex={p.accent} label='Acento (CTA/links)' sub={p.accent} />
          <Swatch hex={p.navy} label='Navy (shell)' sub={p.navy} />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {p.accentRamp.map(h => (
            <Box key={h} sx={{ flex: 1, blockSize: 18, bgcolor: h, borderRadius: '2px' }} />
          ))}
        </Box>
        <Typography color='text.secondary' sx={{ fontSize: 10.5, mt: 0.5 }}>
          {p.blueNote}
        </Typography>
      </Block>

      <Block title='Botones'>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant='contained' sx={{ bgcolor: p.accent, '&:hover': { bgcolor: p.navy } }} startIcon={<i className='tabler-check' />}>
            Primario
          </Button>
          <Button variant='outlined' sx={{ color: p.brandInk, borderColor: p.brandInk, '&:hover': { borderColor: p.brandInk } }} startIcon={<i className='tabler-sparkles' />}>
            Marca
          </Button>
          <Button variant='contained' sx={{ bgcolor: ERROR, '&:hover': { bgcolor: ERROR_DARK } }} startIcon={<i className='tabler-trash' />}>
            Destructivo
          </Button>
        </Box>
      </Block>

      <Block title='Link + nav activo'>
        <Stack spacing={0.75}>
          <Typography sx={{ fontSize: 13 }}>
            Ver el{' '}
            <Box component='span' sx={{ color: p.accent, fontWeight: 600, textDecoration: 'underline' }}>
              reporte completo
            </Box>{' '}
            del cliente.
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {['Resumen', 'Equipo', 'Finanzas'].map((t, i) => (
              <Box
                key={t}
                sx={{
                  px: 1.25,
                  py: 0.5,
                  borderRadius: '6px',
                  fontSize: 12.5,
                  fontWeight: 600,
                  ...(i === 0 ? { bgcolor: p.accent, color: '#FFFFFF' } : { color: 'text.secondary' })
                }}
              >
                {t}
              </Box>
            ))}
          </Box>
        </Stack>
      </Block>

      <Block title='Verde(s) de marca'>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {p.greens.map(g => (
            <Swatch key={g.hex} hex={g.hex} label={g.label} sub={g.hex} />
          ))}
        </Box>
        <Typography color='text.secondary' sx={{ fontSize: 10.5, mt: 0.5 }}>
          {p.greenNote}
        </Typography>
      </Block>

      <Block title='Charts (varias series)'>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, blockSize: 110, borderBottom: '1px solid', borderColor: 'divider' }}>
          {BAR_HEIGHTS.map((h, i) => (
            <Box key={i} sx={{ flex: 1, blockSize: `${h}%`, bgcolor: p.chart[i % p.chart.length], borderRadius: '3px 3px 0 0' }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
          {p.chart.map(c => (
            <Box key={c} sx={{ inlineSize: 14, blockSize: 14, borderRadius: '3px', bgcolor: c }} />
          ))}
        </Box>
        <Typography color='text.secondary' sx={{ fontSize: 10.5, mt: 0.5 }}>
          {p.chartNote}
        </Typography>
      </Block>
    </CardContent>
  </Card>
)

const DarkShowcase = () => (
  <Box sx={theme => ({ bgcolor: DARK_SURFACE, borderRadius: `${theme.shape.customBorderRadius.lg}px`, p: { xs: 2.5, md: 3.5 }, display: 'flex', flexDirection: 'column', gap: 2.5 })}>
    <Box>
      <Typography variant='overline' sx={{ color: R.accentDark, fontWeight: 800 }}>
        Dark mode · darkSemi
      </Typography>
      <Typography variant='h6' sx={{ color: DARK_TEXT, fontWeight: 800 }}>
        Restraint en charcoal
      </Typography>
      <Typography sx={{ color: DARK_DIM, fontSize: 12.5, maxInlineSize: 720 }}>
        En dark, D y Restraint convergen (ambos levantan el acento a un azul claro). El acento, las semánticas y los charts
        se derivan para el charcoal — no es «invertir el claro»: el azul de los charts se sube para popear sobre el oscuro.
      </Typography>
    </Box>

    <Box sx={{ bgcolor: DARK_PAPER, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant='contained' size='small' sx={{ bgcolor: R.accentDark, color: DARK_SURFACE, fontWeight: 700, '&:hover': { bgcolor: '#8FBFF0' } }} startIcon={<i className='tabler-check' />}>
          Primario
        </Button>
        <Typography sx={{ fontSize: 13, color: DARK_TEXT }}>
          Ver el{' '}
          <Box component='span' sx={{ color: R.accentDark, fontWeight: 600, textDecoration: 'underline' }}>
            reporte
          </Box>
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
          {['Resumen', 'Equipo'].map((t, i) => (
            <Box
              key={t}
              sx={{ px: 1.25, py: 0.5, borderRadius: '6px', fontSize: 12.5, fontWeight: 600, ...(i === 0 ? { bgcolor: R.accentDark, color: DARK_SURFACE } : { color: DARK_DIM }) }}
            >
              {t}
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {SEM_DARK.map(s => (
          <Box key={s.role} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, border: `1px solid ${s.fg}`, borderRadius: '999px', px: 1.1, py: 0.35 }}>
            <i className={s.icon} style={{ color: s.fg, fontSize: 13 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: s.fg }}>{s.role}</Typography>
          </Box>
        ))}
      </Box>

      <Box>
        <Typography sx={{ fontSize: 11, color: DARK_DIM, mb: 0.75 }}>Charts — paleta vibrante derivada para dark</Typography>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, blockSize: 96, borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          {BAR_HEIGHTS.map((h, i) => (
            <Box key={i} sx={{ flex: 1, blockSize: `${h}%`, bgcolor: CHART_DARK[i % CHART_DARK.length], borderRadius: '3px 3px 0 0' }} />
          ))}
        </Box>
      </Box>
    </Box>
  </Box>
)

const BrandColorComparisonMockupView = () => (
  <Box data-capture='brand-color-comparison' sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxInlineSize: 1200, mx: 'auto' }}>
    <Stack spacing={1.5}>
      <Typography variant='overline' sx={{ color: '#0375DB', fontWeight: 800 }}>
        Iteración de color · comparación
      </Typography>
      <Typography variant='h4'>Dirección D vs Restraint</Typography>
      <Typography variant='body1' color='text.secondary' sx={{ maxInlineSize: 820 }}>
        Misma arquitectura de sistema; cambia la elección de hues de marca. La columna derecha (Restraint) usa UN acento
        confiado (azul vibrante), colapsa el navy al mismo azul, deja un solo verde crisp y le da a los charts su paleta
        categórica. Las semánticas de feedback son idénticas en ambas.
      </Typography>
    </Stack>

    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          Semánticas de feedback — IGUALES en ambas (ya eran modernas + AA)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {SEM.map(s => (
            <Box key={s.role} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: s.tint, color: s.ink, border: `1px solid ${s.border}`, borderRadius: '999px', px: 1.25, py: 0.4 }}>
              <i className={s.icon} style={{ color: s.ink, fontSize: 14 }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: s.ink }}>{s.role}</Typography>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, alignItems: 'start' }}>
      <PaletteColumn p={D} />
      <PaletteColumn p={R} />
    </Box>

    <DarkShowcase />
  </Box>
)

export default BrandColorComparisonMockupView
