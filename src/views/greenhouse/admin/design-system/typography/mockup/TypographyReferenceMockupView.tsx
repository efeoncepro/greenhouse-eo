'use client'

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import FormControlLabel from '@mui/material/FormControlLabel'
import Link from '@mui/material/Link'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomTextField from '@core/components/mui/TextField'
import {
  fontFamilies,
  fontFeatures,
  fontSizes,
  fontWeights,
  letterSpacings,
  lineHeights,
  SECONDARY_VARIANT_TOKENS,
  TYPOGRAPHY_VARIANT_BRIDGE,
  typographyScale
} from '@/components/theme/typography-tokens'
import type { TypographyToken, TypographyTokenName } from '@/components/theme/typography-tokens'
import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'

// ─────────────────────────────────────────────────────────────────────────────
// Canonical typography document (TASK-1036 / TASK-1038). INTERNAL ONLY.
//
// Coherent top-down structure (info-architecture): primitives → semantic roles →
// applications → bridge → redesign proposal → cross-cutting concerns → governance.
// Everything renders LIVE from the Source of Truth (typography-tokens.ts), so the
// document never drifts from what ships. The drift-guard (typography-drift.test.ts)
// protects the same values in CI.
// ─────────────────────────────────────────────────────────────────────────────

// ── helpers ──────────────────────────────────────────────────────────────────
const remToPx = (rem: string) => {
  const value = parseFloat(rem)

  return Number.isNaN(value) ? rem : `${Math.round(value * 16)}px`
}

const familyOf = (token: TypographyToken) => (token.fontFamily.includes('Poppins') ? 'Poppins' : 'Geist')

const weightLabel = (weight: number) => {
  const entry = Object.entries(fontWeights).find(([, value]) => value === weight)

  return entry ? `${weight} · ${entry[0]}` : String(weight)
}

const CONTRACT_NAME: Record<TypographyTokenName, string> = {
  headlineDisplay: 'headline-display',
  headlineLg: 'headline-lg',
  headlineMd: 'headline-md',
  pageTitle: 'page-title',
  surfaceHeroTitle: 'surface-hero-title',
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

const runtimeVariant = (token: TypographyTokenName): string | null =>
  (TYPOGRAPHY_VARIANT_BRIDGE as Record<string, string>)[token] ?? null

const Section = ({
  id,
  title,
  hint,
  dataCapture,
  children
}: {
  id?: string
  title: string
  hint?: string
  dataCapture?: string
  children: React.ReactNode
}) => (
  <Card id={id} sx={{ mb: 3, scrollMarginTop: 24 }} data-capture={dataCapture}>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box>
        <Typography variant='h5'>{title}</Typography>
        {hint ? (
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
      {children}
    </CardContent>
  </Card>
)

// Resolved policy callout (TASK-1038 — decisions taken with the product-design +
// architecture skills). Green = decided, not an open question.
const Decision = ({ rationale, children }: { rationale?: string; children: React.ReactNode }) => (
  <Box
    sx={{
      display: 'flex',
      gap: 1,
      alignItems: 'flex-start',
      p: 1.5,
      borderRadius: 1,
      backgroundColor: 'success.lightOpacity',
      border: '1px solid',
      borderColor: 'success.main'
    }}
  >
    <Chip size='small' variant='tonal' color='success' label='Decisión' />
    <Box sx={{ mt: 0.25 }}>
      <Typography variant='body2'>{children}</Typography>
      {rationale ? (
        <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 0.5 }}>
          {rationale}
        </Typography>
      ) : null}
    </Box>
  </Box>
)

// ── token sample rows (Capa 2) ───────────────────────────────────────────────
type SampleProps = { token: TypographyTokenName; sample: string }

const TokenSample = ({ token, sample }: SampleProps) => {
  const variant = runtimeVariant(token)

  if (variant) {
    return (
      <Typography variant={variant as 'h1'} sx={{ color: 'text.primary' }}>
        {sample}
      </Typography>
    )
  }

  return <Typography sx={{ ...(typographyScale[token] as TypographyToken), color: 'text.primary' }}>{sample}</Typography>
}

const TokenMeta = ({ token }: { token: TypographyTokenName }) => {
  const t = typographyScale[token] as TypographyToken
  const variant = runtimeVariant(token)

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
      <Chip size='small' variant='tonal' color='primary' label={CONTRACT_NAME[token]} />
      <Chip
        size='small'
        variant='tonal'
        color={variant ? 'secondary' : 'default'}
        label={variant ? `variant: ${variant}` : 'sin variante (token SoT)'}
      />
      <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {familyOf(t)} · {remToPx(t.fontSize)} ({t.fontSize}) · {weightLabel(t.fontWeight)} · lh {t.lineHeight}
        {t.letterSpacing ? ` · ls ${t.letterSpacing}` : ''}
        {t.fontVariantNumeric ? ' · tabular-nums' : ''}
      </Typography>
    </Box>
  )
}

const TokenRow = ({ token, sample }: SampleProps) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    <TokenSample token={token} sample={sample} />
    <TokenMeta token={token} />
  </Box>
)

// ── application map (Capa 3) ─────────────────────────────────────────────────
const AppItem = ({
  context,
  maps,
  warn,
  children
}: {
  context: string
  maps: string
  warn?: string
  children: React.ReactNode
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 300px' },
      gap: 2,
      alignItems: 'center',
      py: 2,
      borderTop: '1px solid',
      borderColor: 'divider'
    }}
  >
    <Box sx={{ minWidth: 0 }}>{children}</Box>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography variant='caption' color='text.secondary'>
        {context}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Chip size='small' variant='tonal' color={warn ? 'default' : 'secondary'} label={maps} />
        {warn ? <Chip size='small' variant='tonal' color='warning' label={warn} /> : null}
      </Box>
    </Box>
  </Box>
)

// ── redesign proposal (Capa 5) ───────────────────────────────────────────────
const asIsPx = (token: TypographyTokenName) => Math.round(parseFloat((typographyScale[token] as TypographyToken).fontSize) * 16)

const TO_BE_PX: Partial<Record<TypographyTokenName, number>> = {
  pageTitle: 20,
  sectionTitle: 16,
  subheader: 14,
  labelMd: 14
}

const TO_BE_ARG: Partial<Record<TypographyTokenName, string>> = {
  pageTitle: 'Sube 16→20. Arregla la inversión: el título de página debe ser ≥ el de sección y > body.',
  sectionTitle: 'Baja 18→16. Subhead bajo page-title; se distingue del body por peso (600 vs 400).',
  subheader: 'Baja 15→14. Elimina el paso 15 (no perceptible). = body-md.',
  labelMd: 'Baja 15→14. Elimina el paso 15. Botones a 14px (Material Label-L / Stripe).'
}

const COMPARISON_ORDER: TypographyTokenName[] = [
  'headlineDisplay',
  'headlineLg',
  'headlineMd',
  'pageTitle',
  'sectionTitle',
  'subheader',
  'labelLg',
  'labelMd',
  'labelSm',
  'bodyLg',
  'bodyMd',
  'bodySm',
  'overline',
  'numericId',
  'numericAmount',
  'kpiValue'
]

const SAMPLE = 'Aa Greenhouse 123'

const SampleAt = ({ token, px }: { token: TypographyTokenName; px: number }) => (
  <Typography sx={{ ...(typographyScale[token] as TypographyToken), fontSize: `${px / 16}rem`, color: 'text.primary' }}>
    {SAMPLE}
  </Typography>
)

const ComparisonRow = ({ token }: { token: TypographyTokenName }) => {
  const asIs = asIsPx(token)
  const toBe = TO_BE_PX[token] ?? asIs
  const changed = toBe !== asIs

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '160px 1fr 1fr' },
        gap: 2,
        alignItems: 'start',
        py: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        ...(changed && { backgroundColor: 'action.hover', borderRadius: 1, px: 1 })
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Chip size='small' variant='tonal' color={changed ? 'primary' : 'default'} label={CONTRACT_NAME[token]} />
        <Typography variant='caption' color='text.secondary'>
          {runtimeVariant(token) ?? 'token SoT'}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant='overline' color='text.disabled'>
          AS-IS · {asIs}px
        </Typography>
        <SampleAt token={token} px={asIs} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant='overline' color={changed ? 'primary.main' : 'text.disabled'}>
            TO-BE · {toBe}px
          </Typography>
          {changed ? (
            <Chip
              size='small'
              variant='tonal'
              color={toBe > asIs ? 'success' : 'warning'}
              label={`${toBe > asIs ? '+' : ''}${toBe - asIs}px`}
            />
          ) : (
            <Chip size='small' variant='tonal' color='default' label='sin cambio' />
          )}
        </Box>
        <SampleAt token={token} px={toBe} />
        {changed ? (
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {TO_BE_ARG[token]}
          </Typography>
        ) : null}
      </Box>
    </Box>
  )
}

const AppCompare = ({
  context,
  change,
  changeColor = 'primary',
  asIs,
  toBe
}: {
  context: string
  change: string
  changeColor?: 'primary' | 'success' | 'warning'
  asIs: React.ReactNode
  toBe: React.ReactNode
}) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '160px 1fr 1fr' },
      gap: 2,
      alignItems: 'center',
      py: 2,
      borderTop: '1px solid',
      borderColor: 'divider'
    }}
  >
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography variant='caption' color='text.secondary'>
        {context}
      </Typography>
      <Box>
        <Chip size='small' variant='tonal' color={changeColor} label={change} />
      </Box>
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
      <Typography variant='overline' color='text.disabled'>
        AS-IS
      </Typography>
      {asIs}
    </Box>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
      <Typography variant='overline' color='primary.main'>
        TO-BE
      </Typography>
      {toBe}
    </Box>
  </Box>
)

// ── section content data ─────────────────────────────────────────────────────
const DISPLAY: SampleProps[] = [
  { token: 'headlineDisplay', sample: 'Empower your Growth' },
  { token: 'headlineLg', sample: 'Sección de marketing' },
  { token: 'headlineMd', sample: 'Identidad de página' },
  { token: 'pageTitle', sample: 'Título de página de producto' }
]

const STRUCTURE: SampleProps[] = [
  { token: 'sectionTitle', sample: 'Título de sección dentro de una card' },
  { token: 'subheader', sample: 'Subencabezado / primer ítem de lista' }
]

const LABELS: SampleProps[] = [
  { token: 'labelLg', sample: 'Label grande (16px)' },
  { token: 'labelMd', sample: 'Label medio — el variant button (15px)' },
  { token: 'labelSm', sample: 'Label chico (13px)' }
]

const BODY: SampleProps[] = [
  { token: 'bodyLg', sample: 'Texto principal de lectura. Geist 16px regular para párrafos cómodos.' },
  { token: 'bodyMd', sample: 'Texto de UI densa, celdas de tabla y helpers. Geist 14px regular.' },
  { token: 'bodySm', sample: 'Metadata, timestamps y "sugerido". Geist 13px.' },
  { token: 'overline', sample: 'Overline · subtotal · estado' }
]

const NUMERIC: SampleProps[] = [
  { token: 'numericId', sample: 'EO-CLI-0042 · SKU ECG-001' },
  { token: 'numericAmount', sample: '$ 4.823.681' },
  { token: 'kpiValue', sample: '$ 24.5M' }
]

const TOC = [
  { id: 'cap0', label: '0 · Portada' },
  { id: 'cap1', label: '1 · Primitivas' },
  { id: 'cap2', label: '2 · Roles semánticos (escala)' },
  { id: 'cap3', label: '3 · Aplicaciones' },
  { id: 'cap4', label: '4 · Bridge contrato ↔ runtime' },
  { id: 'cap5', label: '5 · Rediseño de escala (aplicado)' },
  { id: 'cap5b', label: '5b · Peso 500 (descartado)' },
  { id: 'cap6', label: '6 · Transversales' },
  { id: 'cap7', label: '7 · Gobernanza' }
]

const ICON_SIZES = [14, 16, 18, 20, 22] as const

const TypographyReferenceMockupView = () => {
  const [tab, setTab] = useState(0)

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', p: { xs: 3, md: 5 } }}>
      {/* ── 0 · Portada ──────────────────────────────────────────────────── */}
      <Box id='cap0' sx={{ mb: 3, scrollMarginTop: 24 }}>
        <AxisWordmark variant='auto' height={36} sx={{ mb: 1.5 }} />
        <Typography variant='h4' sx={{ mb: 1 }}>
          Tipografía — documento canónico de tokens y primitivas
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          Referencia interna viva del sistema de tipografía de Greenhouse. Todo se renderiza desde la fuente de verdad
          (<code>typographyScale</code> + primitivas en <code>src/components/theme/typography-tokens.ts</code>); el
          drift-guard <code>typography-drift.test.ts</code> lo protege en CI. Estructura en 3 capas (primitiva → semántica
          → aplicación) + propuesta de rediseño + transversales + gobernanza.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
          <Chip size='small' variant='tonal' color='success' label='SoT gobernado (TASK-1036)' />
          <Chip size='small' variant='tonal' color='success' label='Escala TASK-1038 — aplicada (runtime)' />
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant='overline' color='text.secondary'>
            Índice
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
            {TOC.map(item => (
              <Link key={item.id} href={`#${item.id}`} underline='hover' variant='body2'>
                {item.label}
              </Link>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* ── 1 · Primitivas ───────────────────────────────────────────────── */}
      <Section
        id='cap1'
        title='1 · Primitivas'
        hint='Los building blocks crudos. No se usan directo en producto: se componen en los roles semánticos (capa 2).'
      >
        {/* 1.1 Familias */}
        <Box>
          <Typography variant='overline' color='text.secondary'>
            1.1 Familias
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <Box>
              <Typography sx={{ fontFamily: fontFamilies.display, fontSize: 28, fontWeight: 700 }}>Poppins</Typography>
              <Typography variant='caption' color='text.secondary' display='block'>
                Display · headlines + page-title · pesos 600 / 700 / 800
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily: fontFamilies.text, fontSize: 28, fontWeight: 600 }}>Geist</Typography>
              <Typography variant='caption' color='text.secondary' display='block'>
                Texto base · body, controles, tablas, KPIs · pesos 400 / 600 / 700 / 800
              </Typography>
            </Box>
          </Box>
          <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
            Root Vuexy = 13.125px (no estándar); los rem fijos de la escala se resuelven contra el root del navegador
            (16px), por eso <code>1rem</code> rinde 16px. Prohibido monospace global.
          </Typography>
          <Typography variant='caption' color='warning.main' display='block' sx={{ mt: 0.5 }}>
            ⚠️ Web usa <code>next/font/google</code> (Geist variable, todos los pesos). PDF/email usan <code>.ttf</code>{' '}
            locales: Geist solo 400/500/700 → <strong>faltan 600 y 800</strong> que el SoT usa (section-title/labels 600,
            kpi 800). El adapter PDF (6.7) debe registrar todos los pesos o el peso se sintetiza (faux-bold).
          </Typography>
        </Box>
        <Divider />
        {/* 1.2 Pesos */}
        <Box>
          <Typography variant='overline' color='text.secondary'>
            1.2 Pesos
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
            {Object.entries(fontWeights).map(([name, weight]) => (
              <Box key={name}>
                <Typography sx={{ fontFamily: fontFamilies.text, fontSize: 22, fontWeight: weight }}>Aa</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {weight} · {name}
                </Typography>
              </Box>
            ))}
          </Box>
          <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
            Cobertura web (next/font/google): Geist 400/500/600/700/800 · Poppins 600/700/800 — exactamente lo que usa la
            escala. Roles: Geist 400 body · 600 fuerte (labels/section/numeric) · 700/800 (montos/KPI). Poppins 600/700/800
            (más pesado a mayor tamaño).
          </Typography>
          <Decision rationale='modern-ui: 500 es el peso workhorse de énfasis medio en producto (Linear/Vercel/Primer). Ya está cargado — cero costo, solo darle rol.'>
            <strong>500 (medium) no tiene rol en la escala</strong> (solo lo usan los internals de MUI). Enriquecer =
            darle un rol de <strong>énfasis medio</strong> (nav items, headers de tabla, labels sutiles), reservando 600
            para énfasis fuerte. Es la única «enriquecida» genuina; NO agregar pesos nuevos (token sin consumidor).
          </Decision>
        </Box>
        <Divider />
        {/* 1.3 Tamaños */}
        <Box>
          <Typography variant='overline' color='text.secondary'>
            1.3 Tamaños (ramp cruda)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
            {Object.entries(fontSizes).map(([name, size]) => (
              <Box key={name} sx={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                <Typography variant='caption' color='text.secondary' sx={{ minWidth: 110, fontVariantNumeric: 'tabular-nums' }}>
                  {name} · {remToPx(size)} ({size})
                </Typography>
                <Typography sx={{ fontFamily: fontFamilies.text, fontSize: size }}>Aa Greenhouse</Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Divider />
        {/* 1.4 Line-heights */}
        <Box>
          <Typography variant='overline' color='text.secondary'>
            1.4 Line-heights (namespace canónico)
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 1 }}>
            {Object.entries(lineHeights).map(([name, lh]) => (
              <Box key={name} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant='caption' color='text.secondary' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {name} · {lh}
                </Typography>
                <Typography sx={{ fontFamily: fontFamilies.text, fontSize: 14, lineHeight: lh }}>
                  Línea uno de muestra para ver el interlineado. Línea dos del mismo párrafo. Línea tres para confirmar.
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Divider />
        {/* 1.5 Letter-spacing + 1.6 Font-features */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              1.5 Letter-spacing
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
              {Object.entries(letterSpacings).map(([name, ls]) => (
                <Box key={name}>
                  <Typography sx={{ fontFamily: fontFamilies.text, fontSize: 14, letterSpacing: ls }}>
                    GREENHOUSE 123
                  </Typography>
                  <Typography variant='caption' color='text.secondary'>
                    {name} · {ls}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              1.6 Font-features (tabular-nums)
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
              <Box>
                <Typography variant='caption' color='text.secondary'>
                  proporcional
                </Typography>
                <Typography sx={{ fontFamily: fontFamilies.text, fontSize: 16 }}>
                  1.111
                  <br />
                  9.999
                </Typography>
              </Box>
              <Box>
                <Typography variant='caption' color='success.main'>
                  {fontFeatures.tabularNums}
                </Typography>
                <Typography sx={{ fontFamily: fontFamilies.text, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}>
                  1.111
                  <br />
                  9.999
                </Typography>
              </Box>
            </Box>
            <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
              Las cifras alinean en columna sin monospace. Lo usan numeric-id / numeric-amount / kpi-value.
            </Typography>
          </Box>
        </Box>
      </Section>

      {/* ── 2 · Roles semánticos ─────────────────────────────────────────── */}
      <Section
        id='cap2'
        title='2 · Roles semánticos (la escala)'
        hint='Lo que componés en producto. Cada rol = una composición de primitivas, con nombre semántico (DESIGN.md).'
      >
        <Typography variant='overline' color='text.secondary'>
          Display (Poppins)
        </Typography>
        {DISPLAY.map(row => (
          <TokenRow key={row.token} {...row} />
        ))}
        <Divider />
        <Typography variant='overline' color='text.secondary'>
          Estructura (Geist)
        </Typography>
        {STRUCTURE.map(row => (
          <TokenRow key={row.token} {...row} />
        ))}
        <Divider />
        <Typography variant='overline' color='text.secondary'>
          Etiquetas (Geist) — label-md es el variant button; lg/sm sin variante dedicada
        </Typography>
        {LABELS.map(row => (
          <TokenRow key={row.token} {...row} />
        ))}
        <Divider />
        <Typography variant='overline' color='text.secondary'>
          Cuerpo (Geist)
        </Typography>
        {BODY.map(row => (
          <TokenRow key={row.token} {...row} />
        ))}
        <Divider />
        <Typography variant='overline' color='text.secondary'>
          Numéricos y KPI (Geist + tabular-nums)
        </Typography>
        {NUMERIC.map(row => (
          <TokenRow key={row.token} {...row} />
        ))}
      </Section>

      {/* ── 3 · Aplicaciones ─────────────────────────────────────────────── */}
      <Section
        id='cap3'
        title='3 · Aplicaciones (rol → componente)'
        hint='Dónde va cada rol. Modelo A (rol semántico + mapa de aplicación), no tokens por componente. Cada componente se renderiza real y se anota con el token que de verdad resuelve. Chips ámbar = hallazgos (magic number o variante no gobernada en @core read-only).'
      >
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <Chip size='small' variant='tonal' color='warning' label='Tab label: 18px hardcoded (sin token)' />
          <Chip size='small' variant='tonal' color='warning' label='Tooltip / Badge / List-secondary: subtitle2 (no está en el SoT)' />
          <Chip size='small' variant='tonal' color='warning' label='Dialog title: h6 15px (chico)' />
        </Box>

        <Typography variant='overline' color='text.secondary'>
          Chrome
        </Typography>
        <AppItem context='Título de página' maps='page-title · h4 · 16px'>
          <Typography variant='h4'>Nueva cotización</Typography>
        </AppItem>
        <AppItem context='Título de sección (card / drawer)' maps='section-title · h5 · 18px'>
          <Typography variant='h5'>Ítems de la cotización</Typography>
        </AppItem>
        <AppItem context='Título de diálogo' maps='h6 · 15px' warn='chico para un título'>
          <Paper variant='outlined' sx={{ p: 2, maxWidth: 360 }}>
            <Typography variant='h6'>Confirmar acción</Typography>
            <Typography variant='body2' color='text.secondary'>
              Cuerpo del diálogo (body-md).
            </Typography>
          </Paper>
        </AppItem>
        <AppItem context='Breadcrumb' maps='body (heredado) · 16px'>
          <Breadcrumbs>
            <Link underline='hover' color='inherit' href='#cap3'>
              Finanzas
            </Link>
            <Link underline='hover' color='inherit' href='#cap3'>
              Cotizaciones
            </Link>
            <Typography color='text.primary'>Nueva</Typography>
          </Breadcrumbs>
        </AppItem>

        <Typography variant='overline' color='text.secondary'>
          Controles
        </Typography>
        <AppItem context='Botón (small / medium / large)' maps='label-md · button · 15px' warn='large = control-lg 17px'>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            <Button size='small' variant='contained'>
              Small
            </Button>
            <Button size='medium' variant='contained'>
              Medium
            </Button>
            <Button size='large' variant='contained'>
              Large
            </Button>
          </Box>
        </AppItem>
        <AppItem context='Campo de texto: label / input / helper' maps='label MUI / body / helper'>
          <Box sx={{ maxWidth: 320 }}>
            <CustomTextField fullWidth label='Etiqueta del campo' placeholder='Texto del input' helperText='Texto de ayuda' />
          </Box>
        </AppItem>
        <AppItem context='Chip' maps='body-md · 14px (root)'>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip label='Chip default' />
            <Chip size='small' label='Chip small' />
          </Box>
        </AppItem>
        <AppItem context='Checkbox / Switch label' maps='body (form-control-label)'>
          <FormControlLabel control={<Checkbox defaultChecked />} label='Opción seleccionable' />
        </AppItem>

        <Typography variant='overline' color='text.secondary'>
          Datos
        </Typography>
        <AppItem context='Tabla: header / celda' maps='body-md · 14px (header bold)'>
          <Table size='small' sx={{ maxWidth: 420 }}>
            <TableHead>
              <TableRow>
                <TableCell>Concepto</TableCell>
                <TableCell align='right'>Monto</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Servicio mensual</TableCell>
                <TableCell align='right'>
                  <Typography variant='monoAmount'>$ 1.250.000</Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </AppItem>
        <AppItem
          context='Lista: primario / secundario'
          maps='primario body-lg / secundario subtitle2'
          warn='subtitle2 fuera del SoT'
        >
          <List dense sx={{ maxWidth: 360 }}>
            <ListItem disableGutters>
              <ListItemText primary='Texto primario del ítem' secondary='Texto secundario (metadata)' />
            </ListItem>
          </List>
        </AppItem>
        <AppItem context='KPI: valor / label' maps='kpi-value 28px / overline'>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              MRR
            </Typography>
            <Typography variant='kpiValue'>$ 24.5M</Typography>
          </Box>
        </AppItem>

        <Typography variant='overline' color='text.secondary'>
          Navegación y feedback
        </Typography>
        <AppItem context='Tabs (label)' maps='1.125rem' warn='18px hardcoded · sin token'>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label='Resumen' />
            <Tab label='Detalle' />
            <Tab label='Historial' />
          </Tabs>
        </AppItem>
        <AppItem context='Alert: título / cuerpo' maps='título section-title (h5) / cuerpo body-lg'>
          <Alert severity='info' sx={{ maxWidth: 440 }}>
            <AlertTitle>Título de la alerta</AlertTitle>
            Cuerpo de la alerta con el detalle informativo.
          </Alert>
        </AppItem>
        <AppItem context='Tooltip' maps='subtitle2 · 13px' warn='subtitle2 fuera del SoT'>
          <Tooltip title='Texto del tooltip' arrow open placement='right'>
            <Button variant='tonal'>Hover / tooltip</Button>
          </Tooltip>
        </AppItem>
        <AppItem context='Badge' maps='subtitle2 · 13px' warn='subtitle2 fuera del SoT'>
          <Badge badgeContent={4} color='primary'>
            <Button variant='tonal'>Notificaciones</Button>
          </Badge>
        </AppItem>
      </Section>

      {/* ── 4 · Bridge ───────────────────────────────────────────────────── */}
      <Section
        id='cap4'
        title='4 · Bridge contrato ↔ runtime'
        hint='El mapeo nombre semántico (DESIGN.md) ↔ variante MUI vive como código (TYPOGRAPHY_VARIANT_BRIDGE), verificado en CI. La tabla se genera desde ese bridge.'
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {Object.entries(TYPOGRAPHY_VARIANT_BRIDGE).map(([token, variant]) => (
            <Box key={token} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant='monoId' sx={{ minWidth: 160 }}>
                {CONTRACT_NAME[token as TypographyTokenName]}
              </Typography>
              <Typography color='text.disabled'>→</Typography>
              <Typography variant='monoId'>{variant}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1 }} />
          {Object.entries(SECONDARY_VARIANT_TOKENS).map(([variant, token]) => (
            <Box key={variant} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant='monoId' sx={{ minWidth: 160 }}>
                {variant}
              </Typography>
              <Typography color='text.disabled'>reusa</Typography>
              <Typography variant='monoId'>{CONTRACT_NAME[token]}</Typography>
            </Box>
          ))}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant='monoId' sx={{ minWidth: 160 }}>
              {'<Button size="large">'}
            </Typography>
            <Typography color='text.disabled'>←</Typography>
            <Typography variant='monoId'>controlText.lg</Typography>
          </Box>
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            backgroundColor: 'warning.lightOpacity',
            border: '1px solid',
            borderColor: 'warning.main'
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.5 }}>
            <Chip size='small' variant='tonal' color='warning' label='Hallazgo' />
            <Typography variant='body2'>
              <code>subtitle2</code> es una variante MUI <strong>fuera del bridge</strong> con{' '}
              <strong>~267 consumidores</strong> en producto (no solo tooltip/badge/list).
            </Typography>
          </Box>
          <Typography variant='caption' color='text.secondary'>
            Es 13px / <strong>peso 400</strong> = <code>body-sm</code> (NO label-sm 13/600 — corrección del modelo
            previo). TO-BE: traer <code>subtitle2</code> al SoT como secondary variant reusando <code>body-sm</code>, y
            extender el drift-guard. Tamaño de migración: 267 callsites quedan gobernados de un solo movimiento.
          </Typography>
        </Box>
      </Section>

      {/* ── 5 · Rediseño de escala (TASK-1038 — aplicado) ───────────────────── */}
      <Card id='cap5' sx={{ mb: 3, scrollMarginTop: 24, borderColor: 'success.main', borderWidth: 1, borderStyle: 'solid' }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant='h5'>5 · Rediseño de escala (TASK-1038 — aplicado)</Typography>
          <Typography variant='body2' color='text.secondary'>
            La escala AS-IS no fue diseñada como escala: se acumuló de los defaults de Vuexy + nombres de la spec, con tres
            problemas estructurales. El TO-BE de abajo fue aprobado y <strong>ya es el runtime</strong> (2026-06-06): el SoT,
            <code>mergedTheme</code>, DESIGN.md y el drift-guard se movieron juntos. Se conserva el AS-IS↔TO-BE como registro
            del rediseño y su argumento.
          </Typography>
          <Box component='ul' sx={{ m: 0, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography component='li' variant='body2'>
              <strong>Inversión de jerarquía:</strong> <code>page-title</code> (16px) es más chico que{' '}
              <code>section-title</code> (18px) e igual que body.
            </Typography>
            <Typography component='li' variant='body2'>
              <strong>Goteo de 1px:</strong> 7 tamaños (12·13·14·15·16·17·18) en 6px. Sin razón modular.
            </Typography>
            <Typography component='li' variant='body2'>
              <strong>Sobre-granularidad:</strong> 15, 16 y 17 vivos a la vez. El tamaño casi no transporta jerarquía.
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Chip size='small' variant='tonal' color='warning' label='AS-IS: 11 tamaños' />
            <Chip size='small' variant='tonal' color='success' label='TO-BE: 8 tamaños (12·13·14·16·20·24·28·32)' />
            <Chip size='small' variant='tonal' color='primary' label='4 tokens cambian valor · 0 nuevos · 0 renombrados' />
          </Box>
        </CardContent>
      </Card>

      <Section
        id='cap5b'
        title='5.1 · Escala AS-IS vs TO-BE (token por token)'
        hint='Izquierda el valor actual del runtime; derecha la propuesta. Resaltados los que cambian, con su argumento.'
      >
        {COMPARISON_ORDER.map(token => (
          <ComparisonRow key={token} token={token} />
        ))}
      </Section>

      <Section
        id='cap5c'
        title='5.2 · Impacto en aplicaciones (AS-IS → TO-BE)'
        hint='Los mismos componentes con el tamaño actual y el propuesto. El TO-BE además resuelve los 3 hallazgos (tab/subtitle2/dialog pasan a token real).'
        dataCapture='apps-impact'
      >
        <AppCompare
          context='Título de página'
          change='+4px · arregla inversión'
          changeColor='success'
          asIs={<Typography variant='h4'>Nueva cotización</Typography>}
          toBe={<Typography variant='h4' sx={{ fontSize: '1.25rem' }}>Nueva cotización</Typography>}
        />
        <AppCompare
          context='Título de sección / Alert'
          change='−2px'
          changeColor='warning'
          asIs={<Typography variant='h5'>Ítems de la cotización</Typography>}
          toBe={<Typography variant='h5' sx={{ fontSize: '1rem' }}>Ítems de la cotización</Typography>}
        />
        <AppCompare
          context='Botón medium'
          change='15→14px'
          changeColor='warning'
          asIs={<Button variant='contained'>Guardar cambios</Button>}
          toBe={
            <Button variant='contained' sx={{ fontSize: '0.875rem' }}>
              Guardar cambios
            </Button>
          }
        />
        <AppCompare
          context='Botón large'
          change='17→16px · saca el 17 bespoke'
          changeColor='warning'
          asIs={
            <Button size='large' variant='contained'>
              Acción principal
            </Button>
          }
          toBe={
            <Button size='large' variant='contained' sx={{ fontSize: '1rem' }}>
              Acción principal
            </Button>
          }
        />
        <AppCompare
          context='Tabs (label)'
          change='18→14px · tokenizado'
          changeColor='success'
          asIs={
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label='Resumen' />
              <Tab label='Detalle' />
            </Tabs>
          }
          toBe={
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label='Resumen' sx={{ fontSize: '0.875rem' }} />
              <Tab label='Detalle' sx={{ fontSize: '0.875rem' }} />
            </Tabs>
          }
        />
        <AppCompare
          context='Título de diálogo'
          change='h6 15 → section-title 16 · tokenizado'
          changeColor='success'
          asIs={<Typography variant='h6'>Confirmar acción</Typography>}
          toBe={<Typography variant='h6' sx={{ fontSize: '1rem', fontWeight: 600 }}>Confirmar acción</Typography>}
        />
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant='overline' color='text.disabled'>
            Sin cambio visual (ya correctos o solo tokenizados)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            <Chip size='small' variant='tonal' color='secondary' label='Campo / chip / tabla / KPI — sin cambio' />
            <Chip size='small' variant='tonal' color='success' label='Tooltip / Badge / List-sec / subtitle2 (267) — 13px/400, gobernado vía body-sm' />
          </Box>
        </Box>
      </Section>

      {/* ── 5b · Propuesta peso 500 (TASK-1039) — pendiente aprobación ──────── */}
      <Card
        id='cap5b'
        data-capture='peso-500'
        sx={{ mb: 3, scrollMarginTop: 24, borderColor: 'divider', borderWidth: 1, borderStyle: 'solid' }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant='h5'>5b · Peso 500 — evaluado y descartado (TASK-1039)</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              Greenhouse salta de <strong>400 (body)</strong> a <strong>600 (labels/títulos)</strong>. Se evaluó dar rol
              al <strong>500</strong> como énfasis medio (la rampa 400/500/600 de Linear/Stripe/GitHub). La comparación
              live de abajo es la evidencia. <strong>Decisión: no se aplica</strong> — se conserva como récord del
              análisis.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'flex-start',
              p: 1.5,
              borderRadius: 1,
              backgroundColor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Chip size='small' variant='tonal' color='secondary' label='Decisión: no aplica' />
            <Typography variant='body2' sx={{ mt: 0.25 }}>
              Dos razones: <strong>(1)</strong> a 14px la diferencia 400→500 es casi imperceptible (el salto que el ojo
              lee es 400↔600); <strong>(2)</strong> el 500 <strong>ya rinde</strong> en la app vía Vuexy/MUI (label de
              Tab, stepper, custom-inputs) — nombrarlo en el SoT sería formalizar lo que ya pasa, con el costo de un 4º
              tier que mete la ambigüedad «¿esto va 400, 500 o 600?». Beneficio marginal &lt; costo de claridad.
            </Typography>
          </Box>

          {/* Comparación live 400 vs 500 vs 600 sobre ejemplos reales */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              {(['400 — body (hoy)', '500 — énfasis medio (descartado)', '600 — label (hoy)'] as const).map(h => (
                <Typography key={h} variant='overline' color='text.secondary'>{h}</Typography>
              ))}
            </Box>
            {([
              ['Ítem de nav', 'Finanzas'],
              ['Encabezado de tabla', 'Colaborador'],
              ['Tab', 'Resumen'],
              ['Metadata enfatizada', 'Actualizado hace 2h']
            ] as const).map(([role, text]) => (
              <Box key={role} sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 0.5 }}>{role}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, alignItems: 'baseline' }}>
                  {([400, 500, 600] as const).map(w => (
                    <Typography
                      key={w}
                      sx={{
                        fontFamily: fontFamilies.text,
                        fontSize: 14,
                        fontWeight: w,
                        color: w === 500 ? 'warning.main' : 'text.primary'
                      }}
                    >
                      {text}
                    </Typography>
                  ))}
                </Box>
              </Box>
            ))}
          </Box>

          <Box>
            <Typography variant='overline' color='text.secondary'>Mapping que se evaluó (descartado — récord)</Typography>
            <Box component='ul' sx={{ m: 0, mt: 0.5, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography component='li' variant='body2'>
                <strong>Ítems de nav</strong> (VerticalMenu) — hoy ~400, suben a 500 para legibilidad sin gritar.
              </Typography>
              <Typography component='li' variant='body2'>
                <strong>Encabezados de tabla</strong> (DataTableShell) — énfasis sutil vs el body de las celdas.
              </Typography>
              <Typography component='li' variant='body2'>
                <strong>Tab labels</strong> (CustomTabList) — entre body y label, hoy compiten o se pierden.
              </Typography>
              <Typography component='li' variant='body2' color='text.secondary'>
                <em>NO toca</em> títulos/botones (600) ni display (800). El 500 es additive — un tier nuevo con consumidores reales (regla modern-ui: no token sin consumidor).
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── 6 · Transversales ────────────────────────────────────────────── */}
      <Section
        id='cap6'
        dataCapture='transversales'
        title='6 · Transversales — qué más mapear / auditar / considerar'
        hint='Lo que un sistema de tipografía completo cubre más allá de la escala y las aplicaciones. Los bloques "Decisión" ya están resueltos con las skills de product design + arquitectura y quedan documentados como política.'
      >
        {/* 6.1 a11y */}
        <Box>
          <Typography variant='overline' color='text.secondary'>
            6.1 Accesibilidad (WCAG 2.2 AA)
          </Typography>
          <Box component='ul' sx={{ m: 0, pl: 3, mt: 0.5 }}>
            <Typography component='li' variant='body2'>
              Tamaños en <strong>rem</strong>, nunca px fijos en texto (1.4.4 resize hasta 200%).
            </Typography>
            <Typography component='li' variant='body2'>
              Line-height ≥ 1.5 en párrafos (piso 1.4.12) — ya lo respeta el namespace.
            </Typography>
            <Typography component='li' variant='body2'>
              Large-text (≥18px o ≥14px bold) baja el umbral de contraste a 3:1; el resto 4.5:1. Hay que saber qué rol
              califica. <em>Pendiente: sonda de contraste real por rol en light + dark.</em>
            </Typography>
          </Box>
        </Box>
        <Divider />
        {/* 6.2 color x type */}
        <Box>
          <Typography variant='overline' color='text.secondary'>
            6.2 Color × tipografía (texto sobre superficie)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 1 }}>
            <Typography color='text.primary'>text.primary — contenido principal</Typography>
            <Typography color='text.secondary'>text.secondary — metadata, helpers, de-énfasis</Typography>
            <Typography color='text.disabled'>text.disabled — deshabilitado / placeholder</Typography>
          </Box>
          <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
            La tipografía no cambia de tamaño en dark, pero el contraste de cada par se revalida (mode-independent salvo
            contraste).
          </Typography>
        </Box>
        <Divider />
        {/* 6.3 truncation */}
        <Box>
          <Typography variant='overline' color='text.secondary'>
            6.3 Truncation / overflow
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
            <Box sx={{ maxWidth: 240 }}>
              <Typography variant='caption' color='text.secondary'>
                1 línea · ellipsis
              </Typography>
              <Typography noWrap>Nombre de cliente muy largo que no entra en una sola línea</Typography>
            </Box>
            <Box sx={{ maxWidth: 240 }}>
              <Typography variant='caption' color='text.secondary'>
                2 líneas · line-clamp
              </Typography>
              <Typography sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                Descripción larga que se recorta a dos líneas con line-clamp para mantener la densidad de la tabla.
              </Typography>
            </Box>
          </Box>
          <Decision rationale='forms-ux + a11y-architect. El texto truncado debe exponer el valor completo (title/tooltip).'>
            <strong>1 línea ellipsis</strong> en slots de ancho fijo (celda, chip, nav, título de lista) con el valor
            completo en hover/detalle · <strong>2 líneas line-clamp</strong> en descripciones/previews ·{' '}
            <strong>wrap (nunca truncar)</strong> en body, labels y errores.
          </Decision>
        </Box>
        <Divider />
        {/* 6.4 i18n */}
        <Box>
          <Typography variant='overline' color='text.secondary'>
            6.4 i18n — el texto se diseña para crecer
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
            {['Guardar', 'Save', 'Salvar'].map(label => (
              <Box key={label} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
                <Typography variant='button'>{label}</Typography>
              </Box>
            ))}
          </Box>
          <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
            Clientes Globe internacionales: longitud variable ES/EN/PT, acentos, cobertura Latin de Geist/Poppins.
          </Typography>
          <Decision rationale='arch-architect: YAGNI + reversibilidad. Las logical properties mantienen RTL barato cuando emerja un cliente real; CJK es una iniciativa aparte gated por cliente.'>
            <strong>Latin-first</strong> (es-CL / en-US / pt). <strong>CJK y RTL fuera de scope</strong> por ahora, pero el
            sistema queda <strong>RTL-ready</strong> vía CSS logical properties (Vuexy ya usa <code>marginInline</code>).
            El texto se diseña para crecer (longitud variable, acentos — Geist/Poppins cubren Latin Extended).
          </Decision>
        </Box>
        <Divider />
        {/* 6.5 / 6.6 / 6.7 / 6.8 / 6.9 */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              6.5 Responsive / fluid type
            </Typography>
            <Decision rationale='modern-ui §2: producto = densidad compacta y predecible (Linear/Stripe/Vercel app). Fluid en producto causa thrash de layout.'>
              <strong>Fijo en producto</strong> (rem). <code>clamp()</code> fluid permitido <strong>solo</strong> en
              superficies marketing/login, nunca la escala de producto.
            </Decision>
          </Box>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              6.6 Tier display para marketing
            </Typography>
            <Decision rationale='design-system-governance: no token sin consumidor. Hoy nada en producto usa >32px.'>
              <strong>No ahora.</strong> Producto tope en headline-display 32px. Un tier <code>display-*</code> (40–64px,
              fluid permitido) se agrega <strong>solo</strong> cuando exista una superficie marketing/hero real que lo
              consuma.
            </Decision>
          </Box>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              6.7 Paridad PDF / email
            </Typography>
            <Decision rationale='arch-architect: SSOT + canonical primitive + medium variants. Espeja el precedente de color (axisSemanticHex gobierna theme + PDF tokens, TASK-1034 Slice 4). Wiring PDF/email-desde-SoT = follow-up.'>
              <strong>Un SSOT semántico</strong> (rol = familia + peso + tamaño relativo) gobierna web + PDF + email. Cada
              medio es un <strong>adapter fino</strong>: web→variant MUI, PDF→react-pdf StyleSheet derivado del SoT,
              email→inline + familia <strong>fallback</strong> (las fuentes custom no son confiables en clientes de email,
              pero size/peso/rol se preservan).
            </Decision>
          </Box>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              6.8 Boundary de íconos (NO es tipografía)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mt: 1 }}>
              {ICON_SIZES.map(size => (
                <Box key={size} sx={{ textAlign: 'center' }}>
                  <i className='tabler-square-rounded' style={{ fontSize: size }} aria-hidden='true' />
                  <Typography variant='caption' color='text.secondary' display='block'>
                    {size}px
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography variant='caption' color='text.secondary' display='block' sx={{ mt: 1 }}>
              La escala de íconos (14/16/18/20/22) es un sistema aparte. El audit confundió estos tamaños con texto —
              documentado para que no se vuelva a mezclar.
            </Typography>
          </Box>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              6.9 Tipografía de charts (superficie sin mapear)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 0.5 }}>
              <Chip size='small' variant='tonal' color='warning' label='~47 archivos con charts' />
              <Typography variant='body2' color='text.secondary'>
                ApexCharts / Recharts renderizan ejes, leyendas, tooltips y data-labels con su propia config de fuente —
                hoy usan defaults de la librería, no derivan del SoT.
              </Typography>
            </Box>
            <Decision rationale='dataviz-design + design-system-governance. El texto de charts es tipografía y debe respetar el sistema.'>
              El texto de charts deriva del SoT vía un <strong>adapter de chart</strong> (mapear axis/legend/tooltip a
              <code> body-sm</code>/<code>overline</code>/<code>numeric-amount</code> + familia Geist + tabular-nums en
              ejes numéricos). Follow-up de wiring, igual que PDF/email.
            </Decision>
          </Box>
          <Box>
            <Typography variant='overline' color='text.secondary'>
              6.10 Medida de línea (line-length / measure)
            </Typography>
            <Box sx={{ mt: 1, maxWidth: '65ch', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant='body1'>
                Este párrafo está limitado a 65 caracteres de ancho. La lectura óptima vive entre 45 y 75 caracteres por
                línea; más ancho cansa, más angosto fragmenta. El cuerpo de lectura larga debe acotar su medida.
              </Typography>
            </Box>
            <Decision rationale='modern-ui (readability). No aplica a tablas/UI densa, solo a lectura larga.'>
              El texto de lectura larga (body) se acota a <strong>~65ch</strong> (rango 45–75). No aplica a celdas de
              tabla, chips ni UI densa.
            </Decision>
          </Box>
        </Box>
      </Section>

      {/* ── 7 · Gobernanza ───────────────────────────────────────────────── */}
      <Section
        id='cap7'
        title='7 · Gobernanza'
        hint='Cómo se mantiene coherente el sistema.'
      >
        <Box component='ul' sx={{ m: 0, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography component='li' variant='body2'>
            <strong>Fuente de verdad:</strong> <code>src/components/theme/typography-tokens.ts</code> (primitivas +
            <code> typographyScale</code> + <code>controlText</code> + bridge).
          </Typography>
          <Typography component='li' variant='body2'>
            <strong>Drift-guard:</strong> <code>typography-drift.test.ts</code> (36 tests) — falla CI si runtime / contrato
            / SoT divergen.
          </Typography>
          <Typography component='li' variant='body2'>
            <strong>Gate de contrato:</strong> <code>pnpm design:lint</code> sobre DESIGN.md (0/0/1).
          </Typography>
          <Typography component='li' variant='body2'>
            <strong>Paridad 3 capas:</strong> SoT + mergedTheme + DESIGN.md + V1 §3 se mueven juntos.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          <Chip size='small' variant='tonal' color='error' label='NUNCA fontSize inline' />
          <Chip size='small' variant='tonal' color='error' label='NUNCA monospace' />
          <Chip size='small' variant='tonal' color='error' label='NUNCA editar @core/theme' />
          <Chip size='small' variant='tonal' color='error' label='NUNCA token sin consumidor' />
        </Box>
        <Typography variant='caption' color='text.secondary'>
          AS-IS: ~1.351 <code>fontSize</code> inline en <code>src/**/*.tsx</code>, pero la mayoría son tamaños de{' '}
          <strong>ícono</strong> (legítimo). El lint rule «no fontSize inline» debe distinguir ícono vs texto (por eso no
          es trivial); cuantificar el subset de texto-tipografía es un audit propio antes de promover el rule a error.
        </Typography>
      </Section>
    </Box>
  )
}

export default TypographyReferenceMockupView
