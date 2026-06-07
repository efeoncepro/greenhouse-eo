'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { axisRamp, axisOpacity, axisNeutral, axisMain } from '@core/theme/axis-tokens'
import type { AxisColorFamily } from '@core/theme/axis-tokens'
import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'

// --- WCAG contrast helpers (mockup-local; the audit lives here, not in the theme) ---
const channel = (c: number) => {
  const s = c / 255

  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string) => {
  const h = hex.replace('#', '').slice(0, 6)
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const contrast = (a: string, b: string) => {
  const la = luminance(a)
  const lb = luminance(b)

  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const RAMP_STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const
const OPACITY_STEPS = [8, 16, 24, 32, 38] as const
const LOADING_LAB_ROUTE = '/admin/design-system/loaders'
const MICROINTERACTIONS_LAB_ROUTE = '/admin/design-system/microinteractions'
const TYPOGRAPHY_ROUTE = '/admin/design-system/typography'
const CHARTS_LAB_ROUTE = '/admin/design-system/charts'
const UTILITIES_LAB_ROUTE = '/admin/design-system/utilities'
const FLOATING_SURFACES_LAB_ROUTE = '/admin/design-system/floating-surfaces'

const BRAND: { key: AxisColorFamily; label: string }[] = [
  { key: 'primary', label: 'Primary (Efeonce)' },
  { key: 'secondary', label: 'Secondary (lime)' }
]

const FEEDBACK: { key: AxisColorFamily; label: string }[] = [
  { key: 'success', label: 'Success' },
  { key: 'warning', label: 'Warning' },
  { key: 'error', label: 'Error' },
  { key: 'info', label: 'Info' }
]

const RampSwatch = ({ family }: { family: AxisColorFamily }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 0.75 }}>
    {RAMP_STEPS.map(step => {
      const hex = axisRamp[family][step]
      const ratioWhite = contrast(hex, '#ffffff')
      const textSafe = ratioWhite >= 4.5

      return (
        <Box key={step} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {/* pure color block — NO text on the color (guarantees legibility on every swatch) */}
          <Box style={{ background: hex }} sx={{ height: 52, borderRadius: 1 }} />
          {/* all metadata on the card surface — token text colors, ≥4.97:1 by construction */}
          <Box sx={{ px: 0.25 }}>
            <Typography color='text.primary' sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3 }}>
              {step}
            </Typography>
            <Typography
              color='text.secondary'
              sx={{ fontSize: 10, fontWeight: 600, fontVariantNumeric: 'tabular-nums', display: 'block', lineHeight: 1.4 }}
            >
              {hex}
            </Typography>
            <Typography color='text.secondary' sx={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.2 }}>
              {textSafe ? '✓ AA texto' : `${ratioWhite.toFixed(1)}:1`}
            </Typography>
          </Box>
        </Box>
      )
    })}
  </Box>
)

const FamilyCard = ({ family, label }: { family: AxisColorFamily; label: string }) => {
  const main = family === 'gray' ? axisRamp.gray[500] : axisMain[family as keyof typeof axisMain]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box style={{ background: main }} sx={{ width: 28, height: 28, borderRadius: 1.5 }} />
        <Typography sx={{ fontWeight: 700 }}>{label}</Typography>
        <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
          main {main}
        </Typography>
      </Box>
      <RampSwatch family={family} />
      {/* opacity soft-fills over light + dark surfaces (graduated 8 → 38%) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {(['#ffffff', axisNeutral.dark.paper] as const).map(surface => (
            <Box key={surface} style={{ background: surface }} sx={{ p: 1, borderRadius: 1, display: 'flex', gap: 0.5 }}>
              {OPACITY_STEPS.map(op => (
                <Box key={op} style={{ background: axisOpacity[family][op] }} sx={{ flex: 1, height: 24, borderRadius: 0.75 }} />
              ))}
            </Box>
          ))}
        </Box>
        <Typography color='text.secondary' sx={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.2 }}>
          Opacidad 8 · 16 · 24 · 32 · 38 — sobre claro y oscuro
        </Typography>
      </Box>
    </Box>
  )
}

const NeutralPanel = ({ mode }: { mode: 'light' | 'dark' }) => {
  const n = axisNeutral[mode]

  return (
    <Box style={{ background: n.bodyBg }} sx={{ p: 2.5, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant='overline' sx={{ fontWeight: 700 }} style={{ color: n.textPrimary }}>
        {mode}
      </Typography>
      <Box style={{ background: n.paper, borderColor: n.divider }} sx={{ p: 2, borderRadius: 1.5, border: '1px solid', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography sx={{ fontWeight: 600 }} style={{ color: n.textPrimary }}>
          text.primary · {n.textPrimary}
        </Typography>
        <Typography sx={{ fontSize: 13 }} style={{ color: n.textSecondary }}>
          text.secondary · {n.textSecondary}
        </Typography>
        <Typography sx={{ fontSize: 13 }} style={{ color: n.textDisabled }}>
          text.disabled · {n.textDisabled}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {[
          ['bodyBg', n.bodyBg],
          ['paper', n.paper],
          ['divider', n.divider]
        ].map(([k, v]) => (
          <Typography key={k} variant='caption' sx={{ fontVariantNumeric: 'tabular-nums' }} style={{ color: n.textSecondary }}>
            {k}: {v}
          </Typography>
        ))}
      </Box>
    </Box>
  )
}

const DesignSystemView = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 1100, mx: 'auto' }}>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <AxisWordmark variant='auto' height={44} />
      <Typography variant='h4' sx={{ fontWeight: 700 }}>
        Paleta AXIS — referencia completa
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        Referencia viva de todos los tokens de color de AXIS (ramps 100→900 + opacity 8/16/24/32/38 + neutrales light/dark),
        consumidos desde el SoT <code>@core/theme/axis-tokens.ts</code>. En cada paso del ramp: <strong>✓ texto</strong> = contraste ≥4.5:1
        sobre blanco (apto para texto chico); si no, muestra el ratio real. Fuente de verdad upstream: AXIS en Figma
        (<code>yyMksCoijfMaIoYplXKZaR</code>, nodo <code>11205:5341</code>). Superficie interna — no visible para clientes.
      </Typography>
    </Box>

    <Card variant='outlined'>
      <CardContent
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
            Tipografía
          </Typography>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
            Referencia canónica de tipografía
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 620 }}>
            Familias, escala de roles, aplicaciones, bridge contrato↔runtime, unidades y gobernanza — renderizado vivo desde el SoT.
          </Typography>
        </Stack>
        <Button
          component={Link}
          href={TYPOGRAPHY_ROUTE}
          variant='tonal'
          color='primary'
          size='small'
          startIcon={<i className='tabler-typography' />}
          endIcon={<i className='tabler-arrow-right' />}
        >
          Ver tipografía
        </Button>
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
            Laboratorios
          </Typography>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
            Utilities y timelines de actividad
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 620 }}>
            Primitive reusable para activity timeline basada en AXIS Figma, motion reducido y semántica de lista ordenada.
          </Typography>
        </Stack>
        <Button
          component={Link}
          href={UTILITIES_LAB_ROUTE}
          variant='tonal'
          color='primary'
          size='small'
          startIcon={<i className='tabler-list-details' />}
          endIcon={<i className='tabler-arrow-right' />}
        >
          Ver utilities
        </Button>
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
            Laboratorios
          </Typography>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
            Charts y visualizacion de datos
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 620 }}>
            Primitive reusable para charts enterprise basada en AXIS Figma, Recharts, tipografia SoT y fallback accesible.
          </Typography>
        </Stack>
        <Button
          component={Link}
          href={CHARTS_LAB_ROUTE}
          variant='tonal'
          color='primary'
          size='small'
          startIcon={<i className='tabler-chart-bar' />}
          endIcon={<i className='tabler-arrow-right' />}
        >
          Ver charts
        </Button>
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
            Laboratorios
          </Typography>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
            Loaders y estados de carga
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 620 }}>
            Subseccion interna para revisar microinteracciones de carga sin mezclar el canon de color AXIS.
          </Typography>
        </Stack>
        <Button
          component={Link}
          href={LOADING_LAB_ROUTE}
          variant='tonal'
          color='primary'
          size='small'
          startIcon={<i className='tabler-loader-2' />}
          endIcon={<i className='tabler-arrow-right' />}
        >
          Ver loaders
        </Button>
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
            Laboratorios
          </Typography>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
            Microinteracciones de acciones
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 620 }}>
            Subseccion interna para revisar feedback de comandos async, retry, exito/error y proteccion contra doble submit.
          </Typography>
        </Stack>
        <Button
          component={Link}
          href={MICROINTERACTIONS_LAB_ROUTE}
          variant='tonal'
          color='primary'
          size='small'
          startIcon={<i className='tabler-click' />}
          endIcon={<i className='tabler-arrow-right' />}
        >
          Ver microinteracciones
        </Button>
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3
        }}
      >
        <Stack spacing={0.75}>
          <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
            Laboratorios
          </Typography>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
            Floating surfaces ancladas
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 620 }}>
            Primitive canonica sobre Floating UI para popovers, action menus, evidence peeks, inline editors y
            validation bubbles, con positioning, foco y dismissal gobernados.
          </Typography>
        </Stack>
        <Button
          component={Link}
          href={FLOATING_SURFACES_LAB_ROUTE}
          variant='tonal'
          color='primary'
          size='small'
          startIcon={<i className='tabler-layout-navbar-expand' />}
          endIcon={<i className='tabler-arrow-right' />}
        >
          Ver floating surfaces
        </Button>
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant='h6' sx={{ fontWeight: 700 }}>
          Marca
        </Typography>
        {BRAND.map(f => (
          <FamilyCard key={f.key} family={f.key} label={f.label} />
        ))}
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant='h6' sx={{ fontWeight: 700 }}>
          Feedback (semánticos)
        </Typography>
        {FEEDBACK.map(f => (
          <FamilyCard key={f.key} family={f.key} label={f.label} />
        ))}
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant='h6' sx={{ fontWeight: 700 }}>
          Neutral (gray)
        </Typography>
        <FamilyCard family='gray' label='Gray' />
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant='h6' sx={{ fontWeight: 700 }}>
          Neutrales y superficies (light / dark)
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <NeutralPanel mode='light' />
          <NeutralPanel mode='dark' />
        </Box>
      </CardContent>
    </Card>
  </Box>
)

export default DesignSystemView
