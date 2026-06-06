'use client'

// TASK-1044 — Canonical typography reference (INTERNAL design-system surface).
//
// The authoritative, current-state reference of the Greenhouse typography system,
// rendered LIVE from the SoT (`typographyScale`). This is NOT the mockup
// (`/typography/mockup` holds the AS-IS↔TO-BE redesign record + decisions) — this
// is the canonical space: families, weights, the role scale, real applications,
// the contract↔runtime bridge, the unit policy, and governance. Everything here
// derives from `src/components/theme/typography-tokens.ts`; the rules an agent
// applies live in DESIGN.md / V1 / CLAUDE.md, not in this view.

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import {
  controlText,
  fontFamilies,
  fontWeights,
  SECONDARY_VARIANT_TOKENS,
  TYPOGRAPHY_VARIANT_BRIDGE,
  typographyScale
} from '@/components/theme/typography-tokens'

type ScaleKey = keyof typeof typographyScale

// rem → px for the spec column (the runtime unit is rem; px shown for reference).
const remToPx = (rem: string): number => Math.round(parseFloat(rem) * 16 * 100) / 100

const weightLabel = (w: number): string => {
  const entry = Object.entries(fontWeights).find(([, value]) => value === w)

  return entry ? `${entry[1]} ${entry[0]}` : String(w)
}

const familyLabel = (stack: string): 'Poppins' | 'Geist' => (stack.includes('Poppins') ? 'Poppins' : 'Geist')

// Contract (kebab) name per SoT token — the §15.1 mapping, for the spec columns.
const CONTRACT_NAME: Partial<Record<ScaleKey, string>> = {
  headlineDisplay: 'headline-display',
  headlineLg: 'headline-lg',
  headlineMd: 'headline-md',
  pageTitle: 'page-title',
  sectionTitle: 'section-title',
  subheader: 'subheader',
  labelLg: 'label-lg',
  labelMd: 'label-md',
  labelSm: 'label-sm',
  bodyLg: 'body-lg',
  bodyMd: 'body-md',
  bodySm: 'body-sm',
  overline: 'overline',
  numericId: 'numeric-id',
  numericAmount: 'numeric-amount',
  kpiValue: 'kpi-value'
}

// MUI variant per token: primary bridge (1:1) + secondary variants that reuse a value.
const variantOf = (key: ScaleKey): string | null => {
  const primary = (TYPOGRAPHY_VARIANT_BRIDGE as Record<string, string>)[key]

  if (primary) return primary
  const secondary = Object.entries(SECONDARY_VARIANT_TOKENS).find(([, token]) => token === key)

  return secondary ? secondary[0] : null
}

// When-to-use note per token (the semantic intent).
const USAGE: Record<ScaleKey, string> = {
  headlineDisplay: 'Momento display máximo — marketing / splash. Poppris. Raro en producto.',
  headlineLg: 'Display grande (h2).',
  headlineMd: 'Display medio (h3).',
  pageTitle: 'Título de página de producto (h4). Domina la jerarquía visual.',
  sectionTitle: 'Encabezado de sección dentro de cards y drawers (h5). Dialog title.',
  subheader: 'Subtítulo / primary de list item (subtitle1).',
  labelLg: 'Label grande / Button size=large.',
  labelMd: 'Label canónico de control (el variant button). Tab, Chip, h6.',
  labelSm: 'Label chico / metadata enfatizada.',
  bodyLg: 'Copy legible primario (body1).',
  bodyMd: 'Copy denso de producto, celdas de tabla, helpers (body2).',
  bodySm: 'Metadata, timestamps, caption (caption). subtitle2.',
  overline: 'Label compacto en mayúsculas sobre valores.',
  numericId: 'IDs / códigos — Geist + tabular-nums.',
  numericAmount: 'Montos — Geist + tabular-nums.',
  kpiValue: 'Valor hero de KPI — Geist + tabular-nums.'
}

// Tiers for grouping the scale.
const TIERS: { label: string; tokens: ScaleKey[] }[] = [
  { label: 'Display (Poppins)', tokens: ['headlineDisplay', 'headlineLg', 'headlineMd'] },
  { label: 'Títulos', tokens: ['pageTitle', 'sectionTitle', 'subheader'] },
  { label: 'Labels', tokens: ['labelLg', 'labelMd', 'labelSm'] },
  { label: 'Body', tokens: ['bodyLg', 'bodyMd', 'bodySm'] },
  { label: 'Overline', tokens: ['overline'] },
  { label: 'Numéricos (tabular-nums)', tokens: ['numericId', 'numericAmount', 'kpiValue'] }
]

const SAMPLE_TEXT: Partial<Record<ScaleKey, string>> = {
  numericId: 'EO-2026-0042',
  numericAmount: '$ 1.284.500',
  kpiValue: '85,8%'
}

// ── presentational primitives ───────────────────────────────────────────────

const tokenSx = (key: ScaleKey): SxProps<Theme> => {
  const t = typographyScale[key] as Record<string, string | number>

  return {
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
    lineHeight: t.lineHeight,
    ...(t.letterSpacing ? { letterSpacing: t.letterSpacing } : {}),
    ...(t.fontVariantNumeric ? { fontVariantNumeric: t.fontVariantNumeric } : {})
  }
}

const Section = ({
  num,
  title,
  hint,
  dataCapture,
  children
}: {
  num: string
  title: string
  hint?: string
  dataCapture?: string
  children: React.ReactNode
}) => (
  <Card id={dataCapture} data-capture={dataCapture} sx={{ mb: 3, scrollMarginTop: 24 }}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, p: { xs: 3, md: 4 } }}>
      <Box>
        <Typography variant='overline' color='text.secondary'>
          {num}
        </Typography>
        <Typography variant='h5'>{title}</Typography>
        {hint ? (
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5, maxWidth: 720 }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
      {children}
    </CardContent>
  </Card>
)

const SpecChip = ({ label }: { label: string }) => (
  <Chip size='small' variant='tonal' color='secondary' label={label} sx={{ fontFamily: fontFamilies.text }} />
)

// One token: live specimen + full spec.
const TokenSpecimen = ({ tokenKey }: { tokenKey: ScaleKey }) => {
  const t = typographyScale[tokenKey] as Record<string, string | number>
  const rem = String(t.fontSize)
  const variant = variantOf(tokenKey)
  const contract = CONTRACT_NAME[tokenKey]

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 320px' },
        gap: { xs: 1.5, md: 3 },
        alignItems: 'center',
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      {/* live specimen */}
      <Box sx={{ minWidth: 0 }}>
        <Box component='span' sx={{ ...tokenSx(tokenKey), display: 'block', color: 'text.primary' }}>
          {SAMPLE_TEXT[tokenKey] ?? 'Greenhouse by Efeonce'}
        </Box>
        <Typography variant='caption' color='text.secondary' sx={{ mt: 0.75, display: 'block' }}>
          {USAGE[tokenKey]}
        </Typography>
      </Box>

      {/* spec */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {contract ? <SpecChip label={contract} /> : null}
          <SpecChip label={tokenKey} />
          {variant ? <SpecChip label={`MUI: ${variant}`} /> : null}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 1.5, rowGap: 0.25 }}>
          {[
            ['Familia', familyLabel(String(t.fontFamily))],
            ['Tamaño', `${rem} · ${remToPx(rem)}px`],
            ['Peso', weightLabel(Number(t.fontWeight))],
            ['Interlineado', String(t.lineHeight)],
            ...(t.letterSpacing ? [['Tracking', String(t.letterSpacing)] as const] : []),
            ...(t.fontVariantNumeric ? [['Numérico', String(t.fontVariantNumeric)] as const] : [])
          ].map(([k, v]) => (
            <Box key={k} sx={{ display: 'contents' }}>
              <Typography variant='caption' color='text.secondary'>
                {k}
              </Typography>
              <Typography variant='caption' sx={{ fontWeight: fontWeights.semibold, fontVariantNumeric: 'tabular-nums' }}>
                {v}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

// ── view ─────────────────────────────────────────────────────────────────────

const TOC = [
  { id: 'familias', label: '1 · Familias' },
  { id: 'escala', label: '2 · Escala de roles' },
  { id: 'aplicaciones', label: '3 · Aplicaciones' },
  { id: 'bridge', label: '4 · Bridge contrato↔runtime' },
  { id: 'unidades', label: '5 · Unidades' },
  { id: 'gobernanza', label: '6 · Gobernanza' }
] as const

const FAMILY_WEIGHTS: { weight: number; label: string }[] = [
  { weight: 400, label: 'Regular' },
  { weight: 500, label: 'Medium' },
  { weight: 600, label: 'SemiBold' },
  { weight: 700, label: 'Bold' },
  { weight: 800, label: 'ExtraBold' }
]

const CanonicalTypographyView = () => {
  return (
    <Box sx={{ maxWidth: 1080, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 3, md: 4 } }}>
      {/* Portada */}
      <Box sx={{ mb: 3 }}>
        <AxisWordmark variant='auto' height={36} sx={{ mb: 1.5 }} />
        <Typography variant='overline' color='text.secondary'>
          Design System · Interno
        </Typography>
        <Typography variant='h4' sx={{ mb: 0.5 }}>
          Tipografía — referencia canónica
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 760 }}>
          El sistema de tipografía de Greenhouse, renderizado vivo desde el Source of Truth
          (<code>typographyScale</code>). Dos familias, una escala de 8 tamaños, roles semánticos y
          gobernanza de 3 capas. Esta vista es el <strong>espacio canónico</strong>; las reglas que un
          agente aplica viven en <code>DESIGN.md</code> / V1 / <code>CLAUDE.md</code>. El{' '}
          <Box component={Link} href='/admin/design-system/typography/mockup' sx={{ color: 'primary.main' }}>
            mockup
          </Box>{' '}
          guarda el registro del rediseño (AS-IS↔TO-BE + decisiones).
        </Typography>
        <Stack direction='row' spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <SpecChip label='SoT: typography-tokens.ts' />
          <SpecChip label='drift-guard: 3 capas' />
          <SpecChip label='Escala viva (no estática)' />
        </Stack>
      </Box>

      {/* TOC */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {TOC.map(item => (
            <Button
              key={item.id}
              size='small'
              variant='tonal'
              color='secondary'
              component={Link}
              href={`#${item.id}`}
              sx={{ textTransform: 'none' }}
            >
              {item.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* 1 · Familias */}
      <Section
        num='1'
        title='Familias'
        dataCapture='familias'
        hint='Exactamente dos familias activas, variable fonts. Poppins solo para display (headline-* + page-title); Geist para todo lo demás. Numéricos en Geist con tabular-nums — nunca monospace.'
      >
        {[
          { name: 'Poppins', role: 'Display', stack: fontFamilies.display, note: 'headline-display / lg / md + page-title. Solo display.' },
          { name: 'Geist', role: 'Texto', stack: fontFamilies.text, note: 'Body, controles, tablas, labels, IDs, KPIs. Todo lo no-display.' }
        ].map(fam => (
          <Box key={fam.name} sx={{ py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
              <Box component='span' sx={{ fontFamily: fam.stack, fontSize: 24, fontWeight: 600 }}>
                {fam.name}
              </Box>
              <SpecChip label={fam.role} />
              <Typography variant='caption' color='text.secondary'>
                {fam.note}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
              {FAMILY_WEIGHTS.map(w => (
                <Box key={w.weight} sx={{ textAlign: 'center' }}>
                  <Box component='span' sx={{ fontFamily: fam.stack, fontSize: 28, fontWeight: w.weight, display: 'block' }}>
                    Ag
                  </Box>
                  <Typography variant='caption' color='text.secondary'>
                    {w.weight} {w.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
        <Typography variant='caption' color='text.secondary'>
          Pesos con rol: <strong>400</strong> body · <strong>600</strong> labels/títulos/botones ·{' '}
          <strong>700</strong> énfasis fuerte reservado · <strong>800</strong> display/KPI. El{' '}
          <strong>500</strong> está cargado pero sin rol (evaluado y descartado — imperceptible a 14px).
        </Typography>
      </Section>

      {/* 2 · Escala de roles */}
      <Section
        num='2'
        title='Escala de roles'
        dataCapture='escala'
        hint='Ladder de 8 tamaños (12·13·14·16·20·24·28·32). Cada token: specimen vivo + nombre de contrato, token del SoT, variante MUI, tamaño (rem·px), peso, interlineado, tracking.'
      >
        {TIERS.map(tier => (
          <Box key={tier.label} sx={{ mb: 1 }}>
            <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
              {tier.label}
            </Typography>
            {tier.tokens.map(tk => (
              <TokenSpecimen key={tk} tokenKey={tk} />
            ))}
          </Box>
        ))}
      </Section>

      {/* 3 · Aplicaciones */}
      <Section
        num='3'
        title='Aplicaciones'
        dataCapture='aplicaciones'
        hint='Cómo se aplican los roles en componentes reales. El agente emite el variant POR NOMBRE — nunca un fontSize inline.'
      >
        {/* page header */}
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant='overline' color='text.secondary'>
            Header de página
          </Typography>
          <Typography variant='h4'>Operaciones</Typography>
          <Typography variant='subtitle1' color='text.secondary'>
            Delivery, campañas y estructura
          </Typography>
        </Box>

        {/* card section */}
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant='h5' sx={{ mb: 1 }}>
            Resumen de la cuenta
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <Box>
              <Typography variant='overline' color='text.secondary'>
                OTD Global
              </Typography>
              <Typography variant='h3' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                85,8%
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                Benchmark externo · confianza alta
              </Typography>
            </Box>
            <Box>
              <Typography variant='overline' color='text.secondary'>
                ID de ciclo
              </Typography>
              <Typography variant='body1' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: fontWeights.semibold }}>
                EO-2026-0042
              </Typography>
              <Typography variant='caption' color='text.secondary' sx={{ display: 'block' }}>
                Actualizado hace 2 h
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* controls */}
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant='overline' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
            Controles (label-md / control-text)
          </Typography>
          <Stack direction='row' spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <Button variant='contained' size='small'>
              Guardar
            </Button>
            <Button variant='contained' size='medium'>
              Confirmar
            </Button>
            <Button variant='contained' size='large'>
              Continuar
            </Button>
            <Chip label='Activo' color='success' variant='tonal' />
            <Chip label='Pendiente' color='warning' variant='tonal' />
          </Stack>
        </Box>
      </Section>

      {/* 4 · Bridge */}
      <Section
        num='4'
        title='Bridge contrato↔runtime'
        dataCapture='bridge'
        hint='El mapeo es código (TYPOGRAPHY_VARIANT_BRIDGE + SECONDARY_VARIANT_TOKENS), verificado en CI — no una tabla manual.'
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'auto auto auto', columnGap: 2, rowGap: 0.5, alignItems: 'baseline' }}>
          <Typography variant='overline' color='text.secondary'>
            Contrato
          </Typography>
          <Typography variant='overline' color='text.secondary'>
            Token SoT
          </Typography>
          <Typography variant='overline' color='text.secondary'>
            Variante MUI
          </Typography>
          {(Object.keys(typographyScale) as ScaleKey[]).map(key => (
            <Box key={key} sx={{ display: 'contents' }}>
              <Typography variant='body2' sx={{ fontFamily: fontFamilies.text }}>
                {CONTRACT_NAME[key] ?? '—'}
              </Typography>
              <Typography variant='body2' sx={{ fontFamily: fontFamilies.text, fontWeight: fontWeights.semibold }}>
                {key}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {variantOf(key) ?? '— (vía control)'}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant='caption' color='text.secondary'>
          <code>controlText</code> ramp: Button sm/md = {remToPx(controlText.sm)}/{remToPx(controlText.md)}px,
          Button lg = {remToPx(controlText.lg)}px. <code>h6</code> reusa <code>label-md</code>;{' '}
          <code>subtitle2</code> se gobierna vía <code>body-sm</code>.
        </Typography>
      </Section>

      {/* 5 · Unidades */}
      <Section
        num='5'
        title='Unidades'
        dataCapture='unidades'
        hint='Este contrato es agent-facing: el agente emite el variant por nombre, nunca un tamaño crudo. Las unidades respetan accesibilidad.'
      >
        <Box component='ul' sx={{ m: 0, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography component='li' variant='body2'>
            <strong>font-size = <code>rem</code></strong> — escala con la preferencia de fuente del usuario + zoom (WCAG 1.4.4). `px` lo rompería.
          </Typography>
          <Typography component='li' variant='body2'>
            <strong>line-height = unit-less</strong> (`1.5`) — multiplica el font-size, escala correctamente.
          </Typography>
          <Typography component='li' variant='body2'>
            <strong>letter-spacing = <code>em</code></strong> — relativo al texto, escala con él.
          </Typography>
          <Typography component='li' variant='body2'>
            <strong>borders / hairlines / focus-ring = <code>px</code></strong> — NO deben escalar con la fuente.
          </Typography>
          <Typography component='li' variant='body2' color='text.secondary'>
            PDF usa <code>pt</code> (docs densos) y email <code>px</code>+fallbacks — cada medio tiene su adapter; mismo SSOT semántico.
          </Typography>
        </Box>
      </Section>

      {/* 6 · Gobernanza */}
      <Section
        num='6'
        title='Gobernanza'
        dataCapture='gobernanza'
        hint='Una fuente, 3 capas movidas juntas, un guard que rompe CI si divergen.'
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {[
            {
              t: 'Source of Truth',
              d: 'src/components/theme/typography-tokens.ts — primitivos → typographyScale → bridge + controlText. Agregá un rol acá, nunca un tamaño inline.'
            },
            {
              t: 'Runtime',
              d: 'mergedTheme.ts deriva cada variante del SoT (overrides Button-large/Tab/DialogTitle). Cero hardcode.'
            },
            {
              t: 'Contrato agente',
              d: 'DESIGN.md §Typography (compacto) + V1 §3 (extendido). Front-matter + prosa + V1 §15.1 guardados.'
            },
            {
              t: 'Drift-guard',
              d: 'typography-drift.test.ts rompe CI si runtime ≡ SoT ≡ DESIGN.md (front-matter+prosa) ≡ V1 §15.1 divergen.'
            },
            {
              t: 'Charts',
              d: 'Los 43 charts consumen el SoT vía los wrappers AppReactApexCharts/AppRecharts. ECharts canvas → getChartTypographyFromTheme.'
            },
            {
              t: 'Lint',
              d: 'greenhouse/no-fontsize-inline-typography (warn) bloquea fontSize inline en <Typography>; rule-tests en CI.'
            }
          ].map(card => (
            <Box key={card.t} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant='subtitle2' sx={{ fontWeight: fontWeights.semibold }}>
                {card.t}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                {card.d}
              </Typography>
            </Box>
          ))}
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography variant='caption' color='text.secondary'>
          Reglas duras: NUNCA <code>fontSize</code> inline · NUNCA monospace (numéricos = Geist + tabular-nums) ·
          NUNCA editar <code>@core/theme/*</code> · NUNCA un token sin consumidor · SIEMPRE mover las 3 capas juntas.
        </Typography>
      </Section>
    </Box>
  )
}

export default CanonicalTypographyView
