'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de color Greenhouse — PROPUESTA completa (product-design / Claude).
// Mockup interno. NO tokeniza nada: es la presentación de la dirección "D"
// (brand spine + verde disciplinado + ink-pairs + dual-mode) con ramps,
// accesibilidad y aplicaciones variadas. Todos los hex son literales a propósito
// (es una propuesta de color cruda, todavía no mapeada a axis-tokens).
//
// Reglas de gobierno demostradas:
//   1. Semánticas decopladas de marca (principio AXIS): fill vívido (fondo, con
//      blanco u oscuro encima) + ink oscuro SEPARADO para texto sobre blanco/tint.
//      Texto ≥4.5:1, bordes/íconos/UI ≥3:1. No se fuerza un solo token a hacer todo.
//   2. Warning = lógica de señal de tránsito: amber brillante como FILL con texto
//      OSCURO; ink ocre solo para texto sobre blanco. Nunca texto blanco en amber.
//   3. Estado nunca por color solo: siempre ícono + texto (WCAG 1.4.1).
//   4. Pops de marca (vivid green, orange) = solo fill decorativo + ink-pair AA.
//   5. Dual-mode: cada rol tiene un dark-fg verificado sobre charcoal.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'

const DESIGN_SYSTEM_ROUTE = '/admin/design-system'
const DARK_SURFACE = '#25293C'
const DARK_PAPER = '#2F3349'
const DARK_TEXT = 'rgba(255,255,255,0.92)'
const DARK_TEXT_DIM = 'rgba(255,255,255,0.62)'

// ── contrast helpers (auditoría local, no del theme) ──
const lin = (c: number) => {
  const s = c / 255

  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string) => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)

  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

const contrast = (a: string, b: string) => {
  const la = luminance(a)
  const lb = luminance(b)

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const ratio = (v: number) => `${v.toFixed(2)}:1`

// ── ramps (generados, anclados en los 500 de la propuesta) ──
type Ramp = Record<string, string>

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const

const RAMPS: Record<string, { label: string; usage: string; ramp: Ramp }> = {
  navy: {
    label: 'Navy — identidad',
    usage: 'Shell, navegación, headers institucionales. Raíz del logo.',
    ramp: { 50: '#F2F5F8', 100: '#E1E8EE', 200: '#BDCCDA', 300: '#90A9C0', 400: '#4E779B', 500: '#023C70', 600: '#02325E', 700: '#01294C', 800: '#011F3A', 900: '#011628' }
  },
  action: {
    label: 'Action blue — CTA',
    usage: 'Botón primario, links accionables, foco y estados activos.',
    ramp: { 50: '#F2F6F9', 100: '#E1EAF2', 200: '#BDD0E2', 300: '#90B0CE', 400: '#4E82B1', 500: '#024C8F', 600: '#024078', 700: '#013461', 800: '#01284A', 900: '#011B33' }
  },
  greenCanon: {
    label: 'Green canónico (muted)',
    usage: 'Verde de trabajo: texto, iconos, fills sobrios. AA desde 500.',
    ramp: { 50: '#F5F8F3', 100: '#E8EFE3', 200: '#CDDCC1', 300: '#AAC497', 400: '#78A259', 500: '#3E7A12', 600: '#34660F', 700: '#2A530C', 800: '#203F09', 900: '#162C06' }
  },
  greenVivid: {
    label: 'Green vivid — pop de marca',
    usage: 'SOLO fill decorativo (highlights, badges de marca). Texto → green-ink (700+).',
    ramp: { 50: '#F8FCF3', 100: '#EEF8E1', 200: '#D9EFBF', 300: '#BFE492', 400: '#9AD451', 500: '#6EC207', 600: '#5CA306', 700: '#4B8405', 800: '#396504', 900: '#284603' }
  },
  orange: {
    label: 'Orange — accent de marca',
    usage: 'SOLO fill/pop puntual de marca. Texto/icono → orange-ink (700+). No warning, no CTA.',
    ramp: { 50: '#FFF7F2', 100: '#FFEDE0', 200: '#FFD7BD', 300: '#FFBB8F', 400: '#FF934D', 500: '#FF6500', 600: '#D65500', 700: '#AD4500', 800: '#853500', 900: '#5C2400' }
  },
  info: {
    label: 'Info — azure',
    usage: 'Azul informativo limpio. Fill 500 (blanco AA), ink 700 para texto, tint 100 para banners.',
    ramp: { 50: '#EEF4FD', 100: '#E8F1FD', 200: '#C2DBF7', 300: '#94BEEE', 400: '#4E90DE', 500: '#1F6FD4', 600: '#1A5EB8', 700: '#155CAD', 800: '#114A8C', 900: '#0C376A' }
  },
  success: {
    label: 'Success — emerald',
    usage: 'Verde éxito vívido y limpio. Separado del green de marca. Fill 500 (blanco AA), ink para texto.',
    ramp: { 50: '#EDF7F1', 100: '#E7F6EE', 200: '#BCE6CF', 300: '#8FD3AE', 400: '#46A877', 500: '#157F47', 600: '#127140', 700: '#0F5E35', 800: '#0B4928', 900: '#073219' }
  },
  warning: {
    label: 'Warning — amber (señal de tránsito)',
    usage: 'Amber brillante como FILL con texto OSCURO. Texto sobre blanco → ink (#8A5A00). Nunca texto blanco.',
    ramp: { 50: '#FFFBF0', 100: '#FFF4D6', 200: '#F5D98A', 300: '#FFD25C', 400: '#FFB703', 500: '#E0A006', 600: '#B5810A', 700: '#8A5A00', 800: '#6B4900', 900: '#472F00' }
  },
  error: {
    label: 'Error — vermilion',
    usage: 'Rojo vívido y legible (no ladrillo). Fill 500 (blanco AA), ink para texto, tint para banners.',
    ramp: { 50: '#FDEDEE', 100: '#FDECEC', 200: '#F5C2C4', 300: '#ED9094', 400: '#E25A61', 500: '#DC2E39', 600: '#C01D27', 700: '#9E1820', 800: '#7B1219', 900: '#560C11' }
  },
  neutral: {
    label: 'Neutral — slate',
    usage: 'Texto, bordes, superficies y estados deshabilitados. AA desde 500.',
    ramp: { 50: '#F8F9F9', 100: '#EFF0F1', 200: '#DBDDE0', 300: '#BDC1C7', 400: '#9399A2', 500: '#5B6472', 600: '#4B525D', 700: '#3A4049', 800: '#2A2E34', 900: '#1B1E22' }
  }
}

type Semantic = { role: string; fill: string; onFill: string; ink: string; tint: string; border: string; dark: string; icon: string }

// Semánticas vívidas + AA en ambas bandas. Fill/dot/icono = 500 limpio;
// ink = step oscuro separado para texto-sobre-blanco/tint; tint = bg claro.
// Decoplado de marca (principio AXIS). Amber = traffic-sign (texto oscuro).
const SEMANTICS: Semantic[] = [
  { role: 'Info', fill: '#1F6FD4', onFill: '#FFFFFF', ink: '#155CAD', tint: '#E8F1FD', border: '#C2DBF7', dark: '#6FB0F0', icon: 'tabler-info-circle' },
  { role: 'Success', fill: '#157F47', onFill: '#FFFFFF', ink: '#11703F', tint: '#E7F6EE', border: '#BCE6CF', dark: '#5FC891', icon: 'tabler-circle-check' },
  { role: 'Warning', fill: '#FFB703', onFill: '#2A1A00', ink: '#8A5A00', tint: '#FFF4D6', border: '#F5D98A', dark: '#E8B84B', icon: 'tabler-alert-triangle' },
  { role: 'Error', fill: '#DC2E39', onFill: '#FFFFFF', ink: '#C01D27', tint: '#FDECEC', border: '#F5C2C4', dark: '#F08A8F', icon: 'tabler-circle-x' }
]

const SPINE = { base: '#023C70', action: '#024C8F', support: '#E8F1F8', actionDark: '#6BA6E8' }
const GREEN_CANON = '#3E7A12'
const GREEN_VIVID = '#6EC207'
const GREEN_DARK = '#8FD45A'
const ORANGE_POP = '#FF6500'
const ORANGE_INK = '#9A3D00'

// ── building blocks ──
const SectionHeading = ({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) => (
  <Stack spacing={0.75} sx={{ mb: 1 }}>
    <Typography variant='overline' sx={{ color: SPINE.action, fontWeight: 800 }}>
      {eyebrow}
    </Typography>
    <Typography variant='h5' sx={{ fontWeight: 800 }}>
      {title}
    </Typography>
    {description ? (
      <Typography variant='body2' color='text.secondary' sx={{ maxInlineSize: 880 }}>
        {description}
      </Typography>
    ) : null}
  </Stack>
)

const StepSwatch = ({ step, hex }: { step: string; hex: string }) => {
  const cw = contrast(hex, '#FFFFFF')
  const textSafe = cw >= 4.5
  const largeSafe = cw >= 3

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minInlineSize: 0 }}>
      <Box sx={theme => ({ bgcolor: hex, blockSize: 44, borderRadius: `${theme.shape.customBorderRadius.sm}px`, border: `1px solid ${theme.palette.divider}` })} />
      <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>{step}</Typography>
      <Typography color='text.secondary' sx={{ fontSize: 9.5, fontVariantNumeric: 'tabular-nums', display: 'block', lineHeight: 1.3 }}>
        {hex}
      </Typography>
      <Typography sx={{ fontSize: 9, fontWeight: 700, color: textSafe ? '#11703F' : largeSafe ? '#8A5A00' : 'text.disabled' }}>
        {textSafe ? '✓ texto' : largeSafe ? `${cw.toFixed(1)} grande` : `${cw.toFixed(1)} fill`}
      </Typography>
    </Box>
  )
}

const RampBlock = ({ label, usage, ramp }: { label: string; usage: string; ramp: Ramp }) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography variant='h6' sx={{ fontWeight: 800 }}>
          {label}
        </Typography>
        <Typography variant='caption' color='text.secondary'>
          {usage}
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 0.75 }}>
        {STEPS.map(s => (
          <StepSwatch key={s} step={s} hex={ramp[s]} />
        ))}
      </Box>
    </CardContent>
  </Card>
)

const DualModeSwatch = ({ role, fill, onFill, ink, dark, icon }: Semantic) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <i className={icon} style={{ color: ink, fontSize: 18 }} />
        <Typography variant='h6' sx={{ fontWeight: 800 }}>
          {role}
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <Box sx={theme => ({ bgcolor: '#FFFFFF', border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.md}px`, p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5 })}>
          <Box sx={{ bgcolor: fill, color: onFill, borderRadius: '999px', px: 1, py: 0.5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: onFill }}>fill {ratio(contrast(fill, onFill))}</Typography>
          </Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: ink }}>texto {ink}</Typography>
          <Typography color='text.secondary' sx={{ fontSize: 9.5 }}>
            ink/blanco {ratio(contrast(ink, '#FFFFFF'))}
          </Typography>
        </Box>
        <Box sx={{ bgcolor: DARK_SURFACE, borderRadius: '6px', p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ border: `1px solid ${dark}`, borderRadius: '999px', px: 1, py: 0.5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: dark }}>dark-fg</Typography>
          </Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: dark }}>texto {dark}</Typography>
          <Typography sx={{ fontSize: 9.5, color: DARK_TEXT_DIM }}>charcoal {ratio(contrast(dark, DARK_SURFACE))}</Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
)

// ── application demos ──
const ButtonsDemo = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant='subtitle2'>Botones</Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button variant='contained' sx={{ bgcolor: SPINE.action, '&:hover': { bgcolor: SPINE.base } }} startIcon={<i className='tabler-check' />}>
          Primario
        </Button>
        <Button variant='tonal' sx={{ color: SPINE.action, bgcolor: SPINE.support }} startIcon={<i className='tabler-arrow-right' />}>
          Secundario
        </Button>
        <Button variant='outlined' sx={{ color: GREEN_CANON, borderColor: GREEN_CANON, '&:hover': { borderColor: GREEN_CANON, bgcolor: '#F5F8F3' } }} startIcon={<i className='tabler-sparkles' />}>
          Marca
        </Button>
        <Button variant='contained' sx={{ bgcolor: '#DC2E39', '&:hover': { bgcolor: '#C01D27' } }} startIcon={<i className='tabler-trash' />}>
          Destructivo
        </Button>
        <Button variant='contained' disabled startIcon={<i className='tabler-lock' />}>
          Deshabilitado
        </Button>
      </Box>
    </CardContent>
  </Card>
)

const StatusDot = ({ color }: { color: string }) => (
  <Box component='span' sx={{ inlineSize: 8, blockSize: 8, borderRadius: '999px', bgcolor: color, flexShrink: 0 }} />
)

const ChipsDemo = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Typography variant='subtitle2'>Estado — tratamiento canónico</Typography>

      {/* 1. Tonal — el default enterprise (tint + ink, borde hairline) */}
      <Box>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.75 }}>
          Tonal (default) — tint suave + ink. Bajo ruido, escaneable.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {SEMANTICS.map(s => (
            <Box
              key={s.role}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                bgcolor: s.tint,
                color: s.ink,
                border: `1px solid ${s.border}`,
                borderRadius: '999px',
                px: 1.25,
                py: 0.4
              }}
            >
              <i className={s.icon} style={{ color: s.ink, fontSize: 14 }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: s.ink, lineHeight: 1.4 }}>{s.role}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* 2. Dot — para tablas / listas densas (patrón Linear) */}
      <Box>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.75 }}>
          Dot — para tablas y listas densas. El más sobrio.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {SEMANTICS.map(s => (
            <Box key={s.role} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <StatusDot color={s.fill} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#3A4049' }}>{s.role}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* 3. Sólido — excepción de alta urgencia (no es el default) */}
      <Box>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.75 }}>
          Sólido — solo alta urgencia (banner crítico, count que debe gritar). NO como estado inline default.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip size='small' label='Error · 3' sx={{ bgcolor: '#DC2E39', color: '#FFFFFF', fontWeight: 700 }} />
          <Chip size='small' label='Warning · 6' sx={{ bgcolor: '#FFB703', color: '#2A1A00', fontWeight: 700 }} />
        </Box>
      </Box>

      {/* Marca */}
      <Box>
        <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.75 }}>
          Marca — pop de identidad (no es estado).
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: '#EEF8E1', color: GREEN_CANON, border: '1px solid #D9EFBF', borderRadius: '999px', px: 1.25, py: 0.4 }}>
            <i className='tabler-leaf' style={{ color: GREEN_CANON, fontSize: 14 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: GREEN_CANON }}>Marca</Typography>
          </Box>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: SPINE.support, color: SPINE.action, borderRadius: '999px', px: 1.25, py: 0.4 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: SPINE.action }}>En proceso</Typography>
          </Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
)

const AlertsDemo = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant='subtitle2'>Alertas / banners</Typography>
      {SEMANTICS.map(s => (
        <Box key={s.role} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', bgcolor: s.tint, border: `1px solid ${s.border}`, borderRadius: '8px', p: 1.5 }}>
          <i className={s.icon} style={{ color: s.ink, fontSize: 18, marginTop: 2 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, color: s.ink, fontSize: 13.5 }}>{s.role}</Typography>
            <Typography sx={{ color: '#3A4049', fontSize: 12.5 }}>
              Mensaje de {s.role.toLowerCase()} con texto ink {s.ink} sobre tint {s.tint} — AA.
            </Typography>
          </Box>
        </Box>
      ))}
    </CardContent>
  </Card>
)

const KpiDemo = () => {
  const kpis = [
    { label: 'Margen', value: '42.8%', delta: '3.1%', kind: 'trend' as const, glyph: 'tabler-arrow-up-right', icon: 'tabler-trending-up', sem: SEMANTICS[1] },
    { label: 'Riesgo cuentas', value: '6', delta: 'Atención', kind: 'status' as const, glyph: '', icon: 'tabler-alert-triangle', sem: SEMANTICS[2] },
    { label: 'Bloqueos', value: '2', delta: 'Crítico', kind: 'status' as const, glyph: '', icon: 'tabler-circle-x', sem: SEMANTICS[3] }
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
      {kpis.map(k => {
        const s = k.sem

        return (
          <Card key={k.label} variant='outlined'>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ bgcolor: s.tint, borderRadius: '8px', p: 0.6, display: 'flex' }}>
                  <i className={k.icon} style={{ color: s.ink, fontSize: 16 }} />
                </Box>
                <Typography variant='caption' color='text.secondary'>
                  {k.label}
                </Typography>
              </Box>
              <Typography variant='kpiValue' sx={{ color: '#1B1E22', lineHeight: 1.1 }}>
                {k.value}
              </Typography>
              {/* delta inline — sin pill: glyph/dot + texto en ink */}
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, mt: 0.25 }}>
                {k.kind === 'trend' ? (
                  <i className={k.glyph} style={{ color: s.ink, fontSize: 14 }} />
                ) : (
                  <Box component='span' sx={{ inlineSize: 6, blockSize: 6, borderRadius: '999px', bgcolor: s.fill }} />
                )}
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: s.ink, lineHeight: 1.4 }}>{k.delta}</Typography>
                {k.kind === 'trend' ? (
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', ml: 0.25 }}>vs. mes ant.</Typography>
                ) : null}
              </Box>
            </CardContent>
          </Card>
        )
      })}
    </Box>
  )
}

type FieldState = 'default' | 'focus' | 'success' | 'error' | 'disabled'

const NEUTRAL_BORDER = '#BDC1C7'
const NEUTRAL_TEXT = '#1B1E22'
const NEUTRAL_DIM = '#5B6472'
const INFO = SEMANTICS[0]
const SUCCESS = SEMANTICS[1]
const WARNING = SEMANTICS[2]
const ERROR = SEMANTICS[3]

const FieldBox = ({
  label,
  value,
  state,
  helper,
  trailingIcon,
  placeholder
}: {
  label: string
  value?: string
  state: FieldState
  helper?: { text: string; tone: 'muted' | 'success' | 'error' | 'info' }
  trailingIcon?: string
  placeholder?: string
}) => {
  const borderColor =
    state === 'focus' ? SPINE.action : state === 'success' ? SUCCESS.fill : state === 'error' ? ERROR.fill : NEUTRAL_BORDER

  const helperColor =
    helper?.tone === 'success' ? SUCCESS.ink : helper?.tone === 'error' ? ERROR.ink : helper?.tone === 'info' ? INFO.ink : NEUTRAL_DIM

  const trailingColor = state === 'success' ? SUCCESS.fill : state === 'error' ? ERROR.fill : NEUTRAL_DIM

  return (
    <Box sx={{ opacity: state === 'disabled' ? 0.55 : 1 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5, color: NEUTRAL_TEXT }}>{label}</Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          border: `1px solid ${borderColor}`,
          ...(state === 'focus' ? { outline: `3px solid ${SPINE.support}`, outlineOffset: 0 } : {}),
          bgcolor: state === 'disabled' ? '#F4F5F6' : '#FFFFFF',
          borderRadius: '8px',
          px: 1.5,
          py: 1
        }}
      >
        <Typography sx={{ flex: 1, fontSize: 13, color: value ? NEUTRAL_TEXT : '#9399A2' }}>
          {value ?? placeholder}
          {state === 'focus' ? <Box component='span' sx={{ borderInlineStart: `2px solid ${SPINE.action}`, ml: 0.25, opacity: 0.9 }} /> : null}
        </Typography>
        {trailingIcon ? <i className={trailingIcon} style={{ color: trailingColor, fontSize: 16 }} /> : null}
      </Box>
      {helper ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          {helper.tone === 'success' ? <i className='tabler-circle-check' style={{ color: helperColor, fontSize: 13 }} /> : null}
          {helper.tone === 'error' ? <i className='tabler-alert-circle' style={{ color: helperColor, fontSize: 13 }} /> : null}
          {helper.tone === 'info' ? <i className='tabler-info-circle' style={{ color: helperColor, fontSize: 13 }} /> : null}
          <Typography sx={{ fontSize: 11.5, color: helperColor, fontWeight: helper.tone === 'muted' ? 400 : 600 }}>{helper.text}</Typography>
        </Box>
      ) : null}
    </Box>
  )
}

const FormDemo = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant='subtitle2'>Formulario — el sistema en su hábitat</Typography>
        <Typography variant='caption' color='text.secondary'>
          El foco usa el azul de acción; éxito · error · info usan su semántica con ícono + texto (nunca color solo).
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
        <FieldBox label='Nombre' value='María Fernanda Rivas' state='default' helper={{ text: 'Nombre legal completo.', tone: 'muted' }} />
        <FieldBox label='Cargo' value='Cuenta · Performance' state='focus' trailingIcon='tabler-chevron-down' helper={{ text: 'Editando…', tone: 'muted' }} />
        <FieldBox label='Correo corporativo' value='m.rivas@efeonce.org' state='success' trailingIcon='tabler-circle-check' helper={{ text: 'Disponible y verificado.', tone: 'success' }} />
        <FieldBox label='RUT' value='12.345.678-0' state='error' trailingIcon='tabler-alert-circle' helper={{ text: 'Dígito verificador inválido.', tone: 'error' }} />
      </Box>

      {/* hint informativo — strip tint info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: INFO.tint, border: `1px solid ${INFO.border}`, borderRadius: '8px', px: 1.5, py: 1 }}>
        <i className='tabler-info-circle' style={{ color: INFO.ink, fontSize: 16 }} />
        <Typography sx={{ fontSize: 12.5, color: INFO.ink }}>Los campos marcados se sincronizan con Identidad al guardar.</Typography>
      </Box>

      {/* checkbox action + warning inline */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ inlineSize: 18, blockSize: 18, borderRadius: '5px', bgcolor: SPINE.action, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className='tabler-check' style={{ color: '#FFFFFF', fontSize: 13 }} />
          </Box>
          <Typography sx={{ fontSize: 13, color: NEUTRAL_TEXT }}>Enviar invitación al portal</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <i className='tabler-alert-triangle' style={{ color: WARNING.ink, fontSize: 14 }} />
          <Typography sx={{ fontSize: 11.5, color: WARNING.ink, fontWeight: 600 }}>Sin RUT válido no se puede emitir contrato.</Typography>
        </Box>
      </Box>

      {/* acciones */}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button variant='text' sx={{ color: NEUTRAL_DIM }}>Cancelar</Button>
        <Button variant='contained' sx={{ bgcolor: SPINE.action, '&:hover': { bgcolor: SPINE.base } }} startIcon={<i className='tabler-device-floppy' />}>
          Guardar colaborador
        </Button>
      </Box>
    </CardContent>
  </Card>
)

const DarkShowcase = () => (
  <Card variant='outlined' sx={{ borderColor: 'rgba(255,255,255,0.12)' }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, bgcolor: DARK_PAPER }}>
      <Typography variant='subtitle2' sx={{ color: DARK_TEXT }}>
        Dark mode — mismos roles, dark-fg verificado
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <Button variant='contained' sx={{ bgcolor: SPINE.actionDark, color: DARK_SURFACE, '&:hover': { bgcolor: '#8FBFF0' } }} startIcon={<i className='tabler-check' />}>
          Primario
        </Button>
        <Button variant='outlined' sx={{ color: GREEN_DARK, borderColor: GREEN_DARK }} startIcon={<i className='tabler-sparkles' />}>
          Marca
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {SEMANTICS.map(s => (
          <Chip key={s.role} size='small' variant='outlined' icon={<i className={s.icon} style={{ color: s.dark }} />} label={s.role} sx={{ color: s.dark, borderColor: s.dark, fontWeight: 700, '& .MuiChip-icon': { color: s.dark } }} />
        ))}
      </Box>
      {SEMANTICS.slice(0, 2).map(s => (
        <Box key={s.role} sx={{ display: 'flex', gap: 1.25, alignItems: 'center', bgcolor: 'rgba(255,255,255,0.04)', border: `1px solid ${s.dark}`, borderRadius: '8px', p: 1.25 }}>
          <i className={s.icon} style={{ color: s.dark, fontSize: 18 }} />
          <Typography sx={{ color: DARK_TEXT, fontSize: 12.5 }}>
            {s.role}: texto claro {DARK_TEXT} + acento dark-fg {s.dark}.
          </Typography>
        </Box>
      ))}
    </CardContent>
  </Card>
)

const A11yRules = () => {
  const rules = [
    { icon: 'tabler-contrast', t: 'Texto e íconos AA siempre', d: 'Todo color que lleva texto cumple ≥4.5:1; bordes/íconos/UI ≥3:1. Las semánticas separan un fill vívido (fondo, con blanco u oscuro encima) de un ink oscuro para texto sobre blanco o tint.' },
    { icon: 'tabler-traffic-lights', t: 'Warning = señal de tránsito', d: 'Amber brillante (#FFB703) como FILL con texto OSCURO (9.65:1). Ink ocre (#8A5A00) solo para texto sobre blanco. Nunca texto blanco en amber.' },
    { icon: 'tabler-eye', t: 'Color nunca solo', d: 'Cada estado lleva ícono + texto además del color (no se distingue por color únicamente). Cumple WCAG 1.4.1 para daltonismo.' },
    { icon: 'tabler-droplet', t: 'Pops de marca = fill + ink-pair', d: 'Vivid green y orange son solo fill decorativo. Para texto/icono usan su ink AA (green-ink #3E7A12, orange-ink #9A3D00).' },
    { icon: 'tabler-moon', t: 'Dual-mode', d: 'Cada color de trabajo tiene un dark-fg (step claro) que da ≥4.5 sobre el charcoal. El borde sostiene la separación bajo forced-colors.' }
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      {rules.map(r => (
        <Card key={r.t} variant='outlined'>
          <CardContent sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Box sx={{ bgcolor: SPINE.support, borderRadius: '8px', p: 1, display: 'flex' }}>
              <i className={r.icon} style={{ color: SPINE.action, fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant='subtitle2' sx={{ fontWeight: 800 }}>
                {r.t}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {r.d}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

const BrandColorSystemMockupView = () => {
  const theme = useTheme()

  return (
    <Box data-capture='brand-color-system' sx={{ display: 'flex', flexDirection: 'column', gap: 5, maxInlineSize: theme.spacing(290), mx: 'auto' }}>
      {/* Header */}
      <Stack spacing={1.5}>
        <Button component={Link} href={DESIGN_SYSTEM_ROUTE} variant='text' color='secondary' size='small' startIcon={<i className='tabler-arrow-left' />} sx={{ alignSelf: 'flex-start', px: 0 }}>
          Design System
        </Button>
        <Box
          sx={theme => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto' },
            gap: 4,
            p: { xs: 4, md: 6 },
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.display}px`,
            bgcolor: theme.palette.background.paper
          })}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant='overline' sx={{ color: SPINE.action, fontWeight: 800 }}>
              Mockup interno · propuesta product-design · NO tokenizada
            </Typography>
            <Typography variant='h4'>Sistema de color Greenhouse</Typography>
            <Typography variant='body1' color='text.secondary'>
              Dirección D: brand spine (navy identidad + azul acción) + verde de marca disciplinado + pops con ink-pairs.
              Las semánticas de feedback son vívidas y decopladas de la marca (fill + ink separados, principio AXIS), AA en
              light y dark; el warning sigue la lógica de señal de tránsito.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip sx={{ bgcolor: SPINE.base, color: '#FFFFFF' }} label='Navy #023C70' />
              <Chip sx={{ bgcolor: SPINE.action, color: '#FFFFFF' }} label='Action #024C8F' />
              <Chip sx={{ bgcolor: GREEN_CANON, color: '#FFFFFF' }} label='Green #3E7A12' />
              <Chip sx={{ bgcolor: GREEN_VIVID, color: SPINE.base }} label='Vivid pop #6EC207' />
              <Chip sx={{ bgcolor: '#FFB703', color: '#2A1A00' }} label='Warning amber #FFB703' />
              <Chip sx={{ bgcolor: ORANGE_POP, color: '#FFFFFF' }} label='Orange #FF6500' />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', lg: 'center' } }}>
            <AxisWordmark variant='auto' height={96} />
          </Box>
        </Box>
      </Stack>

      {/* Accesibilidad primero */}
      <Box>
        <SectionHeading eyebrow='Principios' title='Accesibilidad como base' description='Los principios que gobiernan toda la paleta. No son un check final: definen los valores.' />
        <A11yRules />
      </Box>

      {/* Ramps */}
      <Box>
        <SectionHeading eyebrow='Tokens' title='Ramps completos (50 → 900)' description='Cada step anotado con su contraste sobre blanco: ✓ texto (≥4.5), grande/UI (≥3) o solo fill (<3).' />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(RAMPS).map(([key, r]) => (
            <RampBlock key={key} label={r.label} usage={r.usage} ramp={r.ramp} />
          ))}
        </Box>
      </Box>

      {/* Semánticas dual-mode */}
      <Box>
        <SectionHeading eyebrow='Feedback' title='Semánticas dual-mode' description='fill (fondo) · ink (texto sobre blanco) · dark-fg (sobre charcoal). Todas AA en ambos modos.' />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
          {SEMANTICS.map(s => (
            <DualModeSwatch key={s.role} {...s} />
          ))}
        </Box>
      </Box>

      {/* Pops de marca */}
      <Box>
        <SectionHeading eyebrow='Marca' title='Pops de marca + ink-pairs' description='Vivid green y orange viven como fill de identidad; para texto/icono se usa su ink AA.' />
        <Card variant='outlined'>
          <CardContent sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ bgcolor: GREEN_VIVID, borderRadius: '8px', px: 2, py: 1.25 }}>
              <Typography sx={{ color: SPINE.base, fontWeight: 800, fontSize: 13 }}>vivid green {GREEN_VIVID}</Typography>
            </Box>
            <Typography sx={{ color: GREEN_CANON, fontWeight: 700, fontSize: 13 }}>↳ texto → green-ink {GREEN_CANON} ({ratio(contrast(GREEN_CANON, '#FFFFFF'))})</Typography>
            <Box sx={{ bgcolor: ORANGE_POP, borderRadius: '8px', px: 2, py: 1.25 }}>
              <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: 13 }}>orange {ORANGE_POP}</Typography>
            </Box>
            <Typography sx={{ color: ORANGE_INK, fontWeight: 700, fontSize: 13 }}>↳ texto → orange-ink {ORANGE_INK} ({ratio(contrast(ORANGE_INK, '#FFFFFF'))})</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Aplicaciones */}
      <Box>
        <SectionHeading eyebrow='Aplicación' title='Ejemplos en producto' description='Cómo se ve la paleta aplicada — botones, chips, alertas, KPIs, formularios — en light y dark.' />
        <Box data-capture='color-system-apps' sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
            <ButtonsDemo />
            <ChipsDemo />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
            <AlertsDemo />
            <Stack spacing={2}>
              <KpiDemo />
              <FormDemo />
            </Stack>
          </Box>
          <DarkShowcase />
        </Box>
      </Box>

      {/* Gobernanza */}
      <Box>
        <SectionHeading eyebrow='Gobernanza' title='Cómo se tokeniza (cuando se apruebe)' />
        <Card variant='outlined'>
          <CardContent>
            <Stack component='ul' spacing={1} sx={{ pl: 3, m: 0 }}>
              <Typography component='li' variant='body2' color='text.secondary'>
                Flujo canónico: <strong>axis-tokens</strong> (ramps) → <strong>axis-semantic</strong> (roles) →{' '}
                <strong>mergedTheme</strong> → <strong>DESIGN.md §Color</strong> → <strong>V1</strong> → drift-guard, en un PR.
              </Typography>
              <Typography component='li' variant='body2' color='text.secondary'>
                Sonda de contraste como gate en CI (light + dark). Reemplaza el parche <strong>#2E7D32</strong> hardcodeado y
                cierra el gap AA de las semánticas (TASK-1048, extendida a toda la capa).
              </Typography>
              <Typography component='li' variant='body2' color='text.secondary'>
                Hasta entonces esto es <strong>solo propuesta</strong>: ningún token cambia. Es la referencia para decidir.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}

export default BrandColorSystemMockupView
