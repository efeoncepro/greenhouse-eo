'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de color Greenhouse — PROPUESTA completa (product-design / Claude).
// Mockup interno. NO tokeniza nada: es la presentación de la dirección "D"
// (brand spine + verde disciplinado + ink-pairs + dual-mode) con ramps,
// accesibilidad y aplicaciones variadas. Todos los hex son literales a propósito
// (es una propuesta de color cruda, todavía no mapeada a axis-tokens).
//
// Reglas de gobierno demostradas:
//   1. El 500 de cada color de TRABAJO cae en [4.5–7] sobre blanco → un token
//      sirve como texto-sobre-blanco Y blanco-sobre-fill.
//   2. Warning = lógica de señal de tránsito: amber brillante como FILL con texto
//      OSCURO; ink ocre solo para texto sobre blanco. Nunca texto blanco en amber.
//   3. Pops de marca (vivid green, orange) = solo fill decorativo + ink-pair AA.
//   4. Dual-mode: cada color de trabajo tiene un dark-fg verificado sobre charcoal.
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
    label: 'Info',
    usage: 'Azul petróleo informativo. Acompaña al primary sin competir como CTA.',
    ramp: { 50: '#F4F8F9', 100: '#E5EDF2', 200: '#C6D9E2', 300: '#9FBECE', 400: '#6697B1', 500: '#256B8F', 600: '#1F5A78', 700: '#194961', 800: '#13384A', 900: '#0D2733' }
  },
  success: {
    label: 'Success',
    usage: 'Verde éxito profundo. Separado del green de marca. AA desde 500.',
    ramp: { 50: '#F4F8F6', 100: '#E4EFEA', 200: '#C5DCD1', 300: '#9CC4B1', 400: '#62A282', 500: '#1F7A4D', 600: '#1A6641', 700: '#155334', 800: '#103F28', 900: '#0B2C1C' }
  },
  warning: {
    label: 'Warning — amber (señal de tránsito)',
    usage: 'Amber brillante 300/400 como FILL con texto OSCURO. Texto sobre blanco → ink 700+ (#8F6200). Nunca texto blanco.',
    ramp: { 50: '#FFFBF0', 100: '#FFF3D1', 200: '#FFE49E', 300: '#FFD25C', 400: '#FFB703', 500: '#E0A006', 600: '#B5810A', 700: '#8F6200', 800: '#6B4900', 900: '#472F00' }
  },
  error: {
    label: 'Error',
    usage: 'Rojo institucional. Más adulto que coral. AA desde 500.',
    ramp: { 50: '#FBF4F4', 100: '#F6E5E5', 200: '#ECC6C8', 300: '#DE9EA1', 400: '#CB656A', 500: '#B4232A', 600: '#971D23', 700: '#7A181D', 800: '#5E1216', 900: '#410D0F' }
  },
  neutral: {
    label: 'Neutral — slate',
    usage: 'Texto, bordes, superficies y estados deshabilitados. AA desde 500.',
    ramp: { 50: '#F8F9F9', 100: '#EFF0F1', 200: '#DBDDE0', 300: '#BDC1C7', 400: '#9399A2', 500: '#5B6472', 600: '#4B525D', 700: '#3A4049', 800: '#2A2E34', 900: '#1B1E22' }
  }
}

type Semantic = { role: string; fill: string; onFill: string; ink: string; dark: string; icon: string }

const SEMANTICS: Semantic[] = [
  { role: 'Info', fill: '#256B8F', onFill: '#FFFFFF', ink: '#194961', dark: '#6FB0D6', icon: 'tabler-info-circle' },
  { role: 'Success', fill: '#1F7A4D', onFill: '#FFFFFF', ink: '#155334', dark: '#5FC08C', icon: 'tabler-circle-check' },
  { role: 'Warning', fill: '#FFB703', onFill: '#2A1A00', ink: '#8F6200', dark: '#E0A93E', icon: 'tabler-alert-triangle' },
  { role: 'Error', fill: '#B4232A', onFill: '#FFFFFF', ink: '#7A181D', dark: '#E8888D', icon: 'tabler-circle-x' }
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
      <Typography sx={{ fontSize: 9, fontWeight: 700, color: textSafe ? '#155334' : largeSafe ? '#8F6200' : 'text.disabled' }}>
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
        <Button variant='contained' sx={{ bgcolor: '#B4232A', '&:hover': { bgcolor: '#971D23' } }} startIcon={<i className='tabler-trash' />}>
          Destructivo
        </Button>
        <Button variant='contained' disabled startIcon={<i className='tabler-lock' />}>
          Deshabilitado
        </Button>
      </Box>
    </CardContent>
  </Card>
)

const ChipsDemo = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant='subtitle2'>Chips de estado + marca</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {SEMANTICS.map(s => (
          <Chip
            key={s.role}
            size='small'
            icon={<i className={s.icon} style={{ color: s.onFill === '#FFFFFF' ? '#FFFFFF' : s.onFill }} />}
            label={s.role}
            sx={{ bgcolor: s.fill, color: s.onFill, fontWeight: 700, '& .MuiChip-icon': { color: s.onFill } }}
          />
        ))}
        <Chip size='small' label='Marca' icon={<i className='tabler-leaf' style={{ color: SPINE.base }} />} sx={{ bgcolor: GREEN_VIVID, color: SPINE.base, fontWeight: 700, '& .MuiChip-icon': { color: SPINE.base } }} />
        <Chip size='small' label='En proceso' sx={{ bgcolor: SPINE.support, color: SPINE.action, fontWeight: 700 }} />
      </Box>
      <Typography variant='caption' color='text.secondary'>
        Outlined (tint + ink + borde): el patrón de bajo ruido para tablas y listas densas.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {SEMANTICS.map(s => {
          const fam = s.role.toLowerCase() as keyof typeof RAMPS
          const r = RAMPS[fam].ramp

          return (
            <Chip
              key={s.role}
              size='small'
              variant='outlined'
              icon={<i className={s.icon} style={{ color: s.ink }} />}
              label={s.role}
              sx={{ bgcolor: r['100'], color: s.ink, borderColor: r['300'], fontWeight: 700, '& .MuiChip-icon': { color: s.ink } }}
            />
          )
        })}
      </Box>
    </CardContent>
  </Card>
)

const AlertsDemo = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant='subtitle2'>Alertas / banners</Typography>
      {SEMANTICS.map(s => {
        const fam = s.role.toLowerCase() as keyof typeof RAMPS
        const r = RAMPS[fam].ramp

        return (
          <Box key={s.role} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', bgcolor: r['50'], border: `1px solid ${r['300']}`, borderRadius: '8px', p: 1.5 }}>
            <i className={s.icon} style={{ color: s.ink, fontSize: 18, marginTop: 2 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, color: s.ink, fontSize: 13.5 }}>{s.role}</Typography>
              <Typography sx={{ color: '#3A4049', fontSize: 12.5 }}>
                Mensaje de {s.role.toLowerCase()} con texto ink {s.ink} sobre tint {r['50']} — AA.
              </Typography>
            </Box>
          </Box>
        )
      })}
    </CardContent>
  </Card>
)

const KpiDemo = () => {
  const kpis = [
    { label: 'Margen', value: '42.8%', delta: '+3.1', icon: 'tabler-trending-up', sem: SEMANTICS[1] },
    { label: 'Riesgo cuentas', value: '6', delta: 'atención', icon: 'tabler-alert-triangle', sem: SEMANTICS[2] },
    { label: 'Bloqueos', value: '2', delta: 'crítico', icon: 'tabler-circle-x', sem: SEMANTICS[3] }
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
      {kpis.map(k => {
        const fam = k.sem.role.toLowerCase() as keyof typeof RAMPS
        const r = RAMPS[fam].ramp

        return (
          <Card key={k.label} variant='outlined'>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ bgcolor: r['100'], borderRadius: '8px', p: 0.75, display: 'flex' }}>
                  <i className={k.icon} style={{ color: k.sem.ink, fontSize: 18 }} />
                </Box>
                <Chip size='small' label={k.delta} sx={{ bgcolor: fam === 'warning' ? k.sem.fill : r['100'], color: fam === 'warning' ? k.sem.onFill : k.sem.ink, fontWeight: 700, height: 20 }} />
              </Box>
              <Typography variant='kpiValue' sx={{ color: '#1B1E22' }}>
                {k.value}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {k.label}
              </Typography>
            </CardContent>
          </Card>
        )
      })}
    </Box>
  )
}

const FormDemo = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant='subtitle2'>Formulario — default · foco · error</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Default</Typography>
          <Box sx={{ border: '1px solid #BDC1C7', borderRadius: '8px', px: 1.5, py: 1, color: '#3A4049', fontSize: 13 }}>Texto…</Box>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Foco (ring action)</Typography>
          <Box sx={{ border: `1px solid ${SPINE.action}`, outline: `2px solid ${SPINE.action}`, outlineOffset: 1, borderRadius: '8px', px: 1.5, py: 1, color: '#1B1E22', fontSize: 13 }}>Editando…</Box>
        </Box>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.5 }}>Error</Typography>
          <Box sx={{ border: '1px solid #B4232A', borderRadius: '8px', px: 1.5, py: 1, color: '#7A181D', fontSize: 13 }}>Valor inválido</Box>
          <Typography sx={{ fontSize: 11, color: '#7A181D', mt: 0.5 }}>Revisá este campo.</Typography>
        </Box>
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
    { icon: 'tabler-arrows-horizontal', t: 'Banda dual [4.5–7]', d: 'El 500 de cada color de trabajo cae en [4.5–7] sobre blanco → un solo token sirve como texto-sobre-blanco Y blanco-sobre-fill.' },
    { icon: 'tabler-traffic-lights', t: 'Warning = señal de tránsito', d: 'Amber brillante (#FFB703) como FILL con texto OSCURO (9.65:1). Ink ocre (#8F6200) solo para texto sobre blanco. Nunca texto blanco en amber.' },
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
              Dirección D: brand spine (navy identidad + azul acción) + verde de marca disciplinado + pops con ink-pairs +
              dual-mode. Cada color de trabajo es AA en light y dark; el warning sigue la lógica de señal de tránsito.
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
        <SectionHeading eyebrow='Principios' title='Accesibilidad como base' description='Las cuatro reglas que gobiernan toda la paleta. No son un check final: definen los valores.' />
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
