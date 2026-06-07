'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { AxisColorFamily } from '@core/theme/axis-tokens'
import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'

// --- WCAG contrast helpers (lab-local; the audit lives here, not in the theme) ---
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

const RampSwatch = ({ family }: { family: AxisColorFamily }) => {
  const theme = useTheme()

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: 'repeat(9, minmax(0, 1fr))' },
        gap: 1
      }}
    >
      {RAMP_STEPS.map(step => {
        const hex = theme.axis.ramp[family][step]
        const ratioWhite = contrast(hex, theme.axis.neutral.light.bgWhite)
        const textSafe = ratioWhite >= 4.5

        return (
          <Box key={step} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Specimen: the background is the AXIS token being documented. */}
            <Box
              aria-label={`${family}-${step} ${hex}`}
              sx={theme => ({
                bgcolor: hex,
                minBlockSize: theme.spacing(13),
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.palette.divider}`
              })}
            />
            <Box sx={{ px: 0.5 }}>
              <Typography variant='monoId' color='text.primary'>
                {step}
              </Typography>
              <Typography variant='monoAmount' color='text.secondary' sx={{ display: 'block' }}>
                {hex}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {textSafe ? 'AA texto' : `${ratioWhite.toFixed(1)}:1`}
              </Typography>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

const FamilyCard = ({ family, label }: { family: AxisColorFamily; label: string }) => {
  const theme = useTheme()
  const main = family === 'gray' ? theme.axis.ramp.gray[500] : theme.axis.main[family as keyof typeof theme.axis.main]
  const opacitySurfaces = [theme.axis.neutral.light.bgWhite, theme.axis.neutral.dark.paper] as const

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          aria-hidden
          sx={theme => ({
            bgcolor: main,
            inlineSize: theme.spacing(7),
            blockSize: theme.spacing(7),
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            border: `1px solid ${theme.palette.divider}`
          })}
        />
        <Typography variant='h6'>{label}</Typography>
        <Typography variant='monoId' color='text.secondary'>
          main {main}
        </Typography>
      </Box>
      <RampSwatch family={family} />
      {/* opacity soft-fills over light + dark surfaces (graduated 8 → 38%) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {opacitySurfaces.map(surface => (
            <Box
              key={surface}
              sx={theme => ({
                bgcolor: surface,
                p: 1,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                gap: 0.5
              })}
            >
              {OPACITY_STEPS.map(op => (
                <Box
                  key={op}
                  aria-label={`${family} opacity ${op}`}
                  sx={theme => ({
                    bgcolor: theme.axis.opacity[family][op],
                    flex: 1,
                    minBlockSize: theme.spacing(6),
                    borderRadius: `${theme.shape.customBorderRadius.sm}px`
                  })}
                />
              ))}
            </Box>
          ))}
        </Box>
        <Typography variant='caption' color='text.secondary'>
          Opacidad 8 · 16 · 24 · 32 · 38 — sobre claro y oscuro
        </Typography>
      </Box>
    </Box>
  )
}

const NeutralPanel = ({ mode }: { mode: 'light' | 'dark' }) => {
  const theme = useTheme()
  const n = theme.axis.neutral[mode]

  return (
    <Box
      sx={theme => ({
        bgcolor: n.bodyBg,
        p: 2.5,
        borderRadius: `${theme.shape.customBorderRadius.xxl}px`,
        border: `1px solid ${n.divider}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5
      })}
    >
      <Typography variant='overline' sx={{ color: n.textPrimary }}>
        {mode}
      </Typography>
      <Box
        sx={theme => ({
          bgcolor: n.paper,
          borderColor: n.divider,
          p: 2,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          border: '1px solid',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5
        })}
      >
        <Typography variant='body2' sx={{ color: n.textPrimary }}>
          text.primary · {n.textPrimary}
        </Typography>
        <Typography variant='caption' sx={{ color: n.textSecondary }}>
          text.secondary · {n.textSecondary}
        </Typography>
        <Typography variant='caption' sx={{ color: n.textDisabled }}>
          text.disabled · {n.textDisabled}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {[
          ['bodyBg', n.bodyBg],
          ['paper', n.paper],
          ['divider', n.divider]
        ].map(([k, v]) => (
          <Typography key={k} variant='monoAmount' sx={{ color: n.textSecondary }}>
            {k}: {v}
          </Typography>
        ))}
      </Box>
    </Box>
  )
}

const AxisColorLabView = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      maxInlineSize: theme => theme.spacing(275),
      mx: 'auto'
    }}
  >
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <AxisWordmark variant='auto' height={44} />
      <Typography variant='h4'>
        Paleta AXIS — referencia completa
      </Typography>
      <Typography variant='body2' color='text.secondary'>
        Referencia viva de todos los tokens de color de AXIS (ramps 100→900 + opacity 8/16/24/32/38 + neutrales
        light/dark), consumidos desde el SoT <code>@core/theme/axis-tokens.ts</code>. En cada paso del ramp:{' '}
        <strong>✓ texto</strong> = contraste ≥4.5:1 sobre blanco (apto para texto chico); si no, muestra el ratio real.
        Fuente de verdad upstream: AXIS en Figma (<code>yyMksCoijfMaIoYplXKZaR</code>, nodo <code>11205:5341</code>).
        Superficie interna — no visible para clientes.
      </Typography>
    </Box>

    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant='h5'>
          Marca
        </Typography>
        {BRAND.map(f => (
          <FamilyCard key={f.key} family={f.key} label={f.label} />
        ))}
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant='h5'>
          Feedback (semánticos)
        </Typography>
        {FEEDBACK.map(f => (
          <FamilyCard key={f.key} family={f.key} label={f.label} />
        ))}
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant='h5'>
          Neutral (gray)
        </Typography>
        <FamilyCard family='gray' label='Gray' />
      </CardContent>
    </Card>

    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant='h5'>
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

export default AxisColorLabView
