'use client'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

const MOCKUP_ROUTE = '/nexa/floating-chat/mockup'
const TASK_REF = 'TASK-1078'

const InlineCode = ({ children }: { children: string }) => (
  <Box
    component='span'
    sx={theme => ({
      px: DESIGN_SYSTEM_LAB_TOKENS.spacing.tight,
      py: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline,
      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
      color: theme.palette.text.primary,
      backgroundColor: alpha(theme.palette.text.primary, DESIGN_SYSTEM_LAB_TOKENS.opacity.codeBackground),
      ...typographyScale.labelSm,
      whiteSpace: 'nowrap'
    })}
  >
    {children}
  </Box>
)

const Section = ({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) => (
  <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.related}>
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline}>
      <Typography variant='overline' color='primary'>
        {eyebrow}
      </Typography>
      <Typography variant='h5'>{title}</Typography>
    </Stack>
    {children}
  </Stack>
)

const Card = ({ children }: { children: ReactNode }) => (
  <Box
    sx={theme => ({
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: 'background.paper'
    })}
  >
    {children}
  </Box>
)

// Anatomía: las 5 regiones del patrón (de arriba a abajo / izquierda a derecha).
const ANATOMY: { region: string; detail: string }[] = [
  { region: 'Header de presencia', detail: 'Cara real de Nexa + wordmark en Poppins + estado "En línea" con ping vivo + controles circulares (nueva conversación / expandir / cerrar).' },
  { region: 'Rail de conversaciones (glass)', detail: 'Glassmorfismo blanco (backdrop-filter); buscador con filtro, grupos temporales con jerarquía, item activo = píldora, kebab de acciones, estados empty / filtered-empty.' },
  { region: 'Cuerpo de conversación', detail: 'Thread headless (SDK) con avatar por-mensaje (NexaSenderMark) + runtime propio keyed → nueva conversación limpia y fluida.' },
  { region: 'Empty hero', detail: 'Saludo rotativo por nombre + chip de contexto + grilla de prompts contextuales (por pantalla/entidad) + firma de marca Efeonce sutil (solo aquí).' },
  { region: 'Composer', detail: 'Input sobre blanco (sin box propio) envuelto en NexaGlowBorder + botón enviar navy↔teal compacto. Disclaimer de confianza.' }
]

// Primitives / piezas que lo COMPONEN (es un organismo, no una primitive).
const COMPOSED_OF: { name: string; role: string; status: string }[] = [
  { name: 'NexaGlowBorder', role: 'Borde "línea de luz" del composer (dos capas + máscara + beam).', status: 'Primitive canónica ✅' },
  { name: 'NexaComposer', role: 'Input + botón enviar + glow como una unidad reusable.', status: 'A extraer ⏳ (follow-up)' },
  { name: 'NexaPresenceMark / Header', role: 'Cara/mark + nombre + dot "En línea" con ping.', status: 'A extraer ⏳' },
  { name: 'NexaSenderMark', role: 'Avatar por-mensaje (disco navy + glyph teal/sparkle blanco).', status: 'A extraer ⏳' },
  { name: 'NexaConversationRail', role: 'Rail de historial glass (search + grupos + items + estados).', status: 'Parte del patrón' },
  { name: 'NexaEmptyHero', role: 'Saludo + chip de contexto + prompts + firma.', status: 'Parte del patrón' },
  { name: 'GreenhouseFloatingSurface / AdaptiveSidecar', role: 'Anclaje del panel (modo expandible) / lane (modo C).', status: 'Primitives reusadas' }
]

// Modos de interacción (la preferencia user-facing futura).
const MODES: { mode: string; detail: string }[] = [
  { mode: 'Dock compacto (A)', detail: 'El más liviano. Panel chico anclado. [deferred]' },
  { mode: 'Panel expandible (B)', detail: 'Compacto ↔ ancho con rail de historial. Concepto vigente de esta task.' },
  { mode: 'Lane sidecar (C)', detail: 'Full-height in-flow (AdaptiveSidecarLayout), el contexto principal sigue visible. [deferred-but-committed]' }
]

const NexaChatLabView = () => (
  <Box
    data-capture='nexa-chat-lab'
    sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: DESIGN_SYSTEM_LAB_TOKENS.layout.sectionGap,
      maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.pageMaxInlineSize,
      mx: 'auto'
    }}
  >
    {/* Header */}
    <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.layout.headerGap}>
      <AxisWordmark variant='auto' height={DESIGN_SYSTEM_LAB_TOKENS.layout.logoBlockSize} sx={{ mb: DESIGN_SYSTEM_LAB_TOKENS.spacing.hairline }} />
      <Typography variant='overline' color='primary'>
        Nexa Chat Pattern
      </Typography>
      <Typography variant='h4'>Nexa Chat</Typography>
      <Typography variant='body2' color='text.secondary' sx={{ maxWidth: DESIGN_SYSTEM_LAB_TOKENS.layout.introMaxInlineSize }}>
        La superficie conversacional canónica de Nexa. Es un <strong>patrón compuesto</strong> (organismo), no una primitive
        suelta: compone un header de presencia, un rail de historial glass, el cuerpo de conversación, el empty hero y el
        composer. Las superficies donde aparece Nexa (botón flotante global, Home, futuros sidecars) deben reusar este
        patrón y sus <InlineCode>primitives</InlineCode>, sin forkear chats paralelos. Spec: <InlineCode>{TASK_REF}</InlineCode>.
      </Typography>
      <Box>
        <Button variant='contained' size='small' href={MOCKUP_ROUTE} startIcon={<i className='tabler-external-link' />}>
          Abrir el specimen vivo
        </Button>
      </Box>
    </Stack>

    {/* Clasificación */}
    <Section eyebrow='Clasificación' title='Patrón compuesto (composition)'>
      <Card>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='body2'>
            <strong>Es:</strong> un patrón / composición platform-level (igual categoría que <InlineCode>NexaInsightsBlock</InlineCode>).
            Ensambla primitives en un organismo reusable.
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            <strong>No es:</strong> una primitive única (tiene 5 regiones), ni un componente por-superficie (no se forkea
            por pantalla). Sus átomos sí son primitives (<InlineCode>NexaGlowBorder</InlineCode> y los que se extraerán).
          </Typography>
        </Stack>
      </Card>
    </Section>

    {/* Anatomía */}
    <Section eyebrow='Anatomía' title='Las 5 regiones'>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        {ANATOMY.map(item => (
          <Card key={item.region}>
            <Typography variant='subtitle2'>{item.region}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              {item.detail}
            </Typography>
          </Card>
        ))}
      </Stack>
    </Section>

    {/* Primitives que lo componen */}
    <Section eyebrow='Composición' title='Primitives y piezas que lo forman'>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        {COMPOSED_OF.map(item => (
          <Card key={item.name}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight} alignItems={{ sm: 'center' }} justifyContent='space-between'>
              <Box>
                <InlineCode>{item.name}</InlineCode>
                <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                  {item.role}
                </Typography>
              </Box>
              <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0, fontWeight: 600 }}>
                {item.status}
              </Typography>
            </Stack>
          </Card>
        ))}
      </Stack>
    </Section>

    {/* Modos */}
    <Section eyebrow='Modos de interacción' title='Dock / Expandible / Lane'>
      <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
        {MODES.map(item => (
          <Card key={item.mode}>
            <Typography variant='subtitle2'>{item.mode}</Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
              {item.detail}
            </Typography>
          </Card>
        ))}
      </Stack>
    </Section>

    {/* Reglas */}
    <Section eyebrow='Reglas de uso' title='Hacer / No hacer'>
      <Card>
        <Stack spacing={DESIGN_SYSTEM_LAB_TOKENS.spacing.tight}>
          <Typography variant='body2'>✓ Reusar este patrón + sus primitives en toda superficie donde aparezca Nexa.</Typography>
          <Typography variant='body2'>✓ Empty hero: saludo rotativo + prompts contextuales (por ruta/entidad/rol) + firma Efeonce solo aquí.</Typography>
          <Typography variant='body2'>✓ Composer siempre vía <InlineCode>NexaGlowBorder</InlineCode> (futuro <InlineCode>NexaComposer</InlineCode>); cero hardcode (tokens AXIS + brand Nexa SSOT + escala SoT).</Typography>
          <Typography variant='body2' color='error.main'>✗ No crear un chat de Nexa paralelo por pantalla ni reimplementar el composer/rail.</Typography>
          <Typography variant='body2' color='error.main'>✗ No usar la firma Efeonce fuera del empty state ni la cara real per-mensaje (ahí va el mark).</Typography>
        </Stack>
      </Card>
    </Section>
  </Box>
)

export default NexaChatLabView
