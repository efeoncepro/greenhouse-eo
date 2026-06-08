'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import type { AxisColorFamily } from '@core/theme/axis-tokens'
import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { GH_COLORS } from '@/config/greenhouse-nomenclature'

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

const TOKEN_FAMILIES: { key: AxisColorFamily; label: string }[] = [
  ...BRAND,
  ...FEEDBACK,
  { key: 'gray', label: 'Gray' }
]

const MAIN_TOKEN_FAMILIES = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const

const NEUTRAL_TOKENS = [
  'bodyBg',
  'paper',
  'bgWhite',
  'textPrimary',
  'textSecondary',
  'textDisabled',
  'divider',
  'actionHover',
  'snackbar'
] as const

const PROPOSED_BRAND_ACCENT_RAMP = {
  100: '#FFE0CC',
  200: '#FFC199',
  300: '#FFA266',
  400: '#FF8333',
  500: '#FF6500',
  600: '#E65B00',
  700: '#BF4C00',
  800: '#993D00',
  900: '#662900'
} as const

type AxisColorTokenReference = {
  name: string
  value: string
}

const formatRatio = (ratio: number) => `${ratio.toFixed(2)}:1`

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

const ProposedBrandAccentCard = () => {
  const theme = useTheme()
  const anchor = PROPOSED_BRAND_ACCENT_RAMP[500]
  const anchorOnWhite = contrast(anchor, theme.axis.neutral.light.bgWhite)
  const anchorWithInk = contrast(anchor, theme.axis.neutral.light.textPrimary)
  const anchorOnDark = contrast(anchor, theme.axis.neutral.dark.bodyBg)
  const whiteTextSafeSteps = RAMP_STEPS.filter(step => contrast(PROPOSED_BRAND_ACCENT_RAMP[step], theme.axis.neutral.light.bgWhite) >= 4.5)
  const darkInkFillSteps = RAMP_STEPS.filter(step => contrast(PROPOSED_BRAND_ACCENT_RAMP[step], theme.axis.neutral.light.textPrimary) >= 4.5)
  const darkSurfaceTextSteps = RAMP_STEPS.filter(step => contrast(PROPOSED_BRAND_ACCENT_RAMP[step], theme.axis.neutral.dark.bodyBg) >= 4.5)

  return (
    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant='h5'>Brand accent / tertiary orange</Typography>
          <Typography variant='body2' color='text.secondary'>
            Propuesta visual para probar el naranja real de marca. Aún no es token runtime, no reemplaza warning y no
            debe usarse como CTA por defecto.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box
            aria-hidden
            sx={theme => ({
              bgcolor: anchor,
              inlineSize: theme.spacing(7),
              blockSize: theme.spacing(7),
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              border: `1px solid ${theme.palette.divider}`
            })}
          />
          <Typography variant='h6'>Tertiary orange draft</Typography>
          <Typography variant='monoId' color='text.secondary'>
            anchor 500 {anchor}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 1 }}>
          <Box
            sx={theme => ({
              p: 2,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`
            })}
          >
            <Typography variant='overline' color='text.secondary'>
              Anchor 500
            </Typography>
            <Typography variant='body2' color='text.primary'>
              Seguro como acento de marca con tinta oscura: {formatRatio(anchorWithInk)}. No usar con texto blanco:
              {` ${formatRatio(anchorOnWhite)}`}.
            </Typography>
          </Box>
          <Box
            sx={theme => ({
              p: 2,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`
            })}
          >
            <Typography variant='overline' color='text.secondary'>
              Texto sobre claro
            </Typography>
            <Typography variant='body2' color='text.primary'>
              Para texto naranja sobre blanco, usar pasos {whiteTextSafeSteps.join(', ')}. Los pasos 100–600 son acento,
              no texto.
            </Typography>
          </Box>
          <Box
            sx={theme => ({
              p: 2,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.lg}px`
            })}
          >
            <Typography variant='overline' color='text.secondary'>
              Superficie oscura
            </Typography>
            <Typography variant='body2' color='text.primary'>
              Sobre dark bg, pasos {darkSurfaceTextSteps.join(', ')} pasan AA. Anchor 500: {formatRatio(anchorOnDark)}.
            </Typography>
          </Box>
        </Box>

        <Box
          sx={theme => ({
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 1,
            p: 2,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            bgcolor: theme.palette.warning.lightOpacity,
            border: `1px solid ${theme.palette.warning.mainOpacity}`
          })}
        >
          <Typography variant='body2' color='text.primary'>
            Fill con texto oscuro: pasos {darkInkFillSteps.join(', ')}.
          </Typography>
          <Typography variant='body2' color='text.primary'>
            Fill con texto blanco: usar solo pasos {whiteTextSafeSteps.join(', ')}.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, minmax(0, 1fr))', md: 'repeat(9, minmax(0, 1fr))' },
            gap: 1
          }}
        >
          {RAMP_STEPS.map(step => {
            const hex = PROPOSED_BRAND_ACCENT_RAMP[step]
            const ratioWhite = contrast(hex, theme.axis.neutral.light.bgWhite)
            const textSafe = ratioWhite >= 4.5

            return (
              <Box key={step} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box
                  aria-label={`tertiary-orange-${step} ${hex}`}
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
      </CardContent>
    </Card>
  )
}

const TokenReferenceRow = ({ name, value }: AxisColorTokenReference) => (
  <Box
    sx={theme => ({
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', sm: `${theme.spacing(8)} minmax(0, 1fr) minmax(108px, auto)` },
      alignItems: 'center',
      gap: 1.5,
      p: 1,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.md}px`
    })}
  >
    <Box
      aria-hidden
      sx={theme => ({
        bgcolor: value,
        inlineSize: theme.spacing(8),
        blockSize: theme.spacing(6),
        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
        border: `1px solid ${theme.palette.divider}`
      })}
    />
    <Typography variant='monoId' color='text.primary' sx={{ overflowWrap: 'anywhere' }}>
      {name}
    </Typography>
    <Typography variant='monoAmount' color='text.secondary'>
      {value}
    </Typography>
  </Box>
)

const TokenReferenceGroup = ({ title, description, tokens }: { title: string; description: string; tokens: AxisColorTokenReference[] }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
    <Box>
      <Typography variant='h6'>{title}</Typography>
      <Typography variant='body2' color='text.secondary'>
        {description}
      </Typography>
    </Box>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 1 }}>
      {tokens.map(token => (
        <TokenReferenceRow key={token.name} {...token} />
      ))}
    </Box>
  </Box>
)

const AxisTokenReference = () => {
  const theme = useTheme()

  const mainTokens = MAIN_TOKEN_FAMILIES.map(family => ({
    name: `theme.axis.main.${family}`,
    value: theme.axis.main[family]
  }))

  const rampTokens = TOKEN_FAMILIES.flatMap(family =>
    RAMP_STEPS.map(step => ({
      name: `theme.axis.ramp.${family.key}[${step}]`,
      value: theme.axis.ramp[family.key][step]
    }))
  )

  const opacityTokens = TOKEN_FAMILIES.flatMap(family =>
    OPACITY_STEPS.map(step => ({
      name: `theme.axis.opacity.${family.key}[${step}]`,
      value: theme.axis.opacity[family.key][step]
    }))
  )

  const neutralTokens = (['light', 'dark'] as const).flatMap(mode =>
    NEUTRAL_TOKENS.map(token => ({
      name: `theme.axis.neutral.${mode}.${token}`,
      value: theme.axis.neutral[mode][token]
    }))
  )

  return (
    <Card variant='outlined'>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant='h5'>Nombres de tokens</Typography>
          <Typography variant='body2' color='text.secondary'>
            Inventario runtime para copiar la referencia correcta sin transcribir HEX desde Figma. Cada fila muestra el
            path canónico y el color que resuelve hoy el theme.
          </Typography>
        </Box>

        <TokenReferenceGroup
          title='Main aliases'
          description='Aliases de uso rápido para el color principal de cada familia semántica.'
          tokens={mainTokens}
        />
        <TokenReferenceGroup
          title='Ramp tokens'
          description='Escala AXIS 100→900 por familia. Usa pasos concretos solo cuando el contrato lo pida.'
          tokens={rampTokens}
        />
        <TokenReferenceGroup
          title='Opacity tokens'
          description='Soft fills por familia sobre superficies claras y oscuras.'
          tokens={opacityTokens}
        />
        <TokenReferenceGroup
          title='Neutral tokens'
          description='Fondos, texto y separadores por modo.'
          tokens={neutralTokens}
        />
      </CardContent>
    </Card>
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

const ChartSwatch = ({ color, label }: { color: string; label: string }) => (
  <Box sx={{ textAlign: 'center', minInlineSize: 84 }}>
    <Box sx={{ height: 48, borderRadius: 1, bgcolor: color, mb: 0.75 }} />
    <Typography variant='caption' sx={{ display: 'block', fontWeight: 600 }}>
      {label}
    </Typography>
    <Typography variant='caption' color='text.secondary' sx={{ fontSize: 10 }}>
      {color.toUpperCase()}
    </Typography>
  </Box>
)

const CHART_CATEGORICAL_LABELS = ['Serie 1', 'Serie 2', 'Serie 3', 'Serie 4', 'Serie 5', 'Serie 6']

const ChartPaletteCard = () => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant='h5'>Charts — paleta «Deep-bright» (TASK-1053)</Typography>
        <Typography variant='body2' color='text.secondary'>
          SoT propio de charts (<code>@core/theme/axis-chart.ts</code>), independiente de marca y semánticos. Toda serie
          sale de acá vía <code>GH_COLORS.chart.*</code>. Colorblind-safe (CVD-min ΔE 12.9) y sin chocar con
          info/success/warning/error (ΔE ≥23). <strong>Color nunca solo</strong>: legend/labels obligatorios.
        </Typography>
      </Box>

      <Box>
        <Typography variant='subtitle2' sx={{ mb: 1 }}>
          Categórica (series arbitrarias · CSC fases · multi-serie) — light
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {GH_COLORS.chart.categorical.map((c, i) => (
            <ChartSwatch key={c} color={c} label={CHART_CATEGORICAL_LABELS[i]} />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant='subtitle2' sx={{ mb: 1 }}>
          Categórica — dark (charcoal)
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {GH_COLORS.chart.categoricalDark.map((c, i) => (
            <ChartSwatch key={c} color={c} label={CHART_CATEGORICAL_LABELS[i]} />
          ))}
        </Box>
      </Box>

      <Box>
        <Typography variant='subtitle2' sx={{ mb: 1 }}>
          Direccional (Finanzas / deltas) — siempre con signo +/− o ícono ▲/▼
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <ChartSwatch color={GH_COLORS.chart.directional.positive} label='Positivo' />
          <ChartSwatch color={GH_COLORS.chart.directional.negative} label='Negativo' />
          <ChartSwatch color={GH_COLORS.chart.directional.neutral} label='Neutral' />
        </Box>
      </Box>
    </CardContent>
  </Card>
)

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

    <ProposedBrandAccentCard />

    <ChartPaletteCard />

    <AxisTokenReference />
  </Box>
)

export default AxisColorLabView
