'use client'

import { useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import {
  MOTION_DURATION_MS,
  MOTION_EASE,
  Motion,
  motionCss,
  prefersReducedMotion,
  type MotionDurationToken,
  type MotionEaseToken
} from '@/components/greenhouse/motion'

// Internal Motion Lab (TASK-1045). Live museum rendered from the motion token
// SoT + the canonical <Motion> primitive. NOT where the rules live — the rules
// live in DESIGN.md / V1 / CLAUDE.md; this is the visual reference.

const DURATION_ROWS = Object.entries(MOTION_DURATION_MS) as [MotionDurationToken, number][]
const EASE_ROWS = Object.keys(MOTION_EASE) as MotionEaseToken[]

const CodeBlock = ({ children }: { children: string }) => (
  <Box
    component='pre'
    sx={{
      m: 0,
      p: 3,
      borderRadius: 2,
      bgcolor: 'action.hover',
      border: '1px solid',
      borderColor: 'divider',
      overflowX: 'auto',
      fontSize: '0.8125rem',
      lineHeight: 1.6,
      color: 'text.secondary',
      whiteSpace: 'pre'
    }}
  >
    {children}
  </Box>
)

const SectionHeader = ({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) => (
  <Stack spacing={0.75}>
    <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
      {eyebrow}
    </Typography>
    <Typography variant='h5' sx={{ fontWeight: 800 }}>
      {title}
    </Typography>
    <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 760 }}>
      {description}
    </Typography>
  </Stack>
)

const DemoCard = ({
  title,
  description,
  snippet,
  onReplay,
  replayLabel = 'Reproducir',
  children
}: {
  title: string
  description: string
  snippet: string
  onReplay?: () => void
  replayLabel?: string
  children: ReactNode
}) => (
  <Card variant='outlined'>
    <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction='row' alignItems='flex-start' justifyContent='space-between' gap={2} flexWrap='wrap'>
        <Stack spacing={0.5}>
          <Typography variant='h6' sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 520 }}>
            {description}
          </Typography>
        </Stack>
        {onReplay ? (
          <Button
            onClick={onReplay}
            variant='tonal'
            color='primary'
            size='small'
            startIcon={<i className='tabler-refresh' />}
          >
            {replayLabel}
          </Button>
        ) : null}
      </Stack>
      <Box
        sx={{
          p: 4,
          borderRadius: 2,
          bgcolor: 'background.default',
          border: '1px dashed',
          borderColor: 'divider',
          minHeight: 132,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {children}
      </Box>
      <CodeBlock>{snippet}</CodeBlock>
    </CardContent>
  </Card>
)

const DemoPanel = ({ children }: { children: ReactNode }) => (
  <Box
    sx={{
      px: 4,
      py: 3,
      borderRadius: 2,
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: 2,
      textAlign: 'center',
      minWidth: 220
    }}
  >
    {children}
  </Box>
)

const StaggerRow = ({ label }: { label: string }) => (
  <Box
    sx={{
      px: 3,
      py: 2,
      borderRadius: 2,
      bgcolor: 'background.paper',
      border: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }}
  >
    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
    <Typography variant='body2'>{label}</Typography>
  </Box>
)

const MotionLabView = () => {
  const [entranceKey, setEntranceKey] = useState(0)
  const [staggerKey, setStaggerKey] = useState(0)
  const [timelineKey, setTimelineKey] = useState(0)
  const [motionOff, setMotionOff] = useState(false)

  const reducedAtLoad = typeof window !== 'undefined' ? prefersReducedMotion() : false

  return (
    <Stack spacing={6} sx={{ pb: 8 }}>
      {/* Header */}
      <Stack spacing={1.5}>
        <Typography variant='overline' color='primary' sx={{ fontWeight: 800 }}>
          Design System · Motion
        </Typography>
        <Typography variant='h4' sx={{ fontWeight: 800 }}>
          Motion Lab — primitiva GSAP
        </Typography>
        <Typography variant='body1' color='text.secondary' sx={{ maxWidth: 820 }}>
          Referencia viva de la primitiva de motion de Greenhouse. El tier cinemático / orquestado / scroll corre sobre
          GSAP detrás de <code>&lt;Motion&gt;</code> y <code>useGreenhouseGSAP</code>; hover, tap y toggles simples
          siguen en CSS. Todo lo de abajo se renderiza desde el SoT de tokens y respeta <code>prefers-reduced-motion</code>.
        </Typography>
        <Stack direction='row' spacing={1} sx={{ pt: 0.5 }} flexWrap='wrap' useFlexGap>
          <Chip size='small' color='primary' variant='tonal' label='useGreenhouseGSAP' icon={<i className='tabler-bolt' />} />
          <Chip size='small' variant='tonal' label='4 variants oficiales' icon={<i className='tabler-stack-2' />} />
          <Chip
            size='small'
            color={reducedAtLoad ? 'warning' : 'success'}
            variant='tonal'
            label={reducedAtLoad ? 'reduced-motion: ON (tu sistema)' : 'reduced-motion: respetado'}
            icon={<i className='tabler-accessible' />}
          />
        </Stack>
      </Stack>

      <Divider />

      {/* Tokens */}
      <Stack spacing={3}>
        <SectionHeader
          eyebrow='Tokens'
          title='Duraciones y easing'
          description='Escala fija del design system. GSAP consume los mismos valores en segundos y las curvas registradas como CustomEase tienen paridad exacta con sus cubic-bezier de CSS.'
        />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems='stretch'>
          <Card variant='outlined' sx={{ flex: 1 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                Duración
              </Typography>
              <Stack spacing={1.5}>
                {DURATION_ROWS.map(([token, ms]) => (
                  <Stack key={token} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {token}
                    </Typography>
                    <Stack direction='row' alignItems='center' spacing={2} sx={{ flex: 1, justifyContent: 'flex-end' }}>
                      <Box
                        aria-hidden
                        sx={{ height: 6, borderRadius: 9999, bgcolor: 'primary.main', width: `${ms / 6}px`, maxWidth: 120 }}
                      />
                      <Typography variant='body2' color='text.secondary' sx={{ minWidth: 56, textAlign: 'right' }}>
                        {ms} ms
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
          <Card variant='outlined' sx={{ flex: 1 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant='h6' sx={{ fontWeight: 800 }}>
                Easing
              </Typography>
              <Stack spacing={1.5}>
                {EASE_ROWS.map(token => (
                  <Stack key={token} direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
                    <Typography variant='body2' sx={{ fontWeight: 600 }}>
                      {token}
                    </Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {motionCss.ease[token]}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Stack>

      <Divider />

      {/* Variants */}
      <Stack spacing={3}>
        <SectionHeader
          eyebrow='Variants'
          title='Modos funcionales oficiales'
          description='Cada variant es un modo (no un skin). Los kinds semánticos resuelven a estas variants. Reproducí cada demo para ver la entrada.'
        />

        <DemoCard
          title='entrance'
          description='Un elemento entra al montar (fade + leve desplazamiento). Bajo reduced-motion: cross-fade sin desplazamiento.'
          onReplay={() => setEntranceKey(k => k + 1)}
          snippet={"<Motion variant='entrance'>\n  <Panel>Contenido</Panel>\n</Motion>"}
        >
          <Motion key={entranceKey} variant='entrance' disabled={motionOff}>
            <DemoPanel>
              <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                Panel
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                entró al montar
              </Typography>
            </DemoPanel>
          </Motion>
        </DemoCard>

        <DemoCard
          title='stagger'
          description='Los hijos directos entran en secuencia. Bajo reduced-motion: aparecen juntos, solo opacidad.'
          onReplay={() => setStaggerKey(k => k + 1)}
          snippet={"<Motion kind='listMount'>\n  {rows.map(r => <Row key={r.id} />)}\n</Motion>"}
        >
          <Motion key={staggerKey} variant='stagger' disabled={motionOff}>
            <Stack spacing={1.5} sx={{ width: '100%', maxWidth: 320 }}>
              <StaggerRow label='Primera fila' />
              <StaggerRow label='Segunda fila' />
              <StaggerRow label='Tercera fila' />
              <StaggerRow label='Cuarta fila' />
            </Stack>
          </Motion>
        </DemoCard>

        <DemoCard
          title='timeline'
          description='Secuencia orquestada vía build callback (escape hatch declarativo). El reduced-motion colapsa las duraciones.'
          onReplay={() => setTimelineKey(k => k + 1)}
          snippet={
            "<Motion\n  variant='timeline'\n  build={(ctx, tl) => {\n    if (ctx.reduced) return\n    tl.from('.dot', { scale: 0, autoAlpha: 0, stagger: 0.12, ease: 'back.out(1.7)' })\n  }}\n>\n  {dots}\n</Motion>"
          }
        >
          <Motion
            key={timelineKey}
            variant='timeline'
            disabled={motionOff}
            build={(ctx, tl) => {
              if (ctx.reduced) return
              tl.from('.gh-motion-dot', { scale: 0, autoAlpha: 0, stagger: 0.12, ease: 'back.out(1.7)' })
            }}
          >
            <Stack direction='row' spacing={2}>
              {[0, 1, 2, 3, 4].map(i => (
                <Box
                  key={i}
                  className='gh-motion-dot'
                  sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'primary.main' }}
                />
              ))}
            </Stack>
          </Motion>
        </DemoCard>

        <DemoCard
          title='scrollReveal'
          description='Se revela al entrar en viewport (ScrollTrigger, una sola vez). Bajo reduced-motion: queda visible sin animación. Hacé scroll para verlo.'
          snippet={"<Motion kind='sectionReveal'>\n  <SectionCard />\n</Motion>"}
        >
          <Motion variant='scrollReveal' disabled={motionOff}>
            <DemoPanel>
              <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
                Sección
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                revelada al hacer scroll
              </Typography>
            </DemoPanel>
          </Motion>
        </DemoCard>
      </Stack>

      <Divider />

      {/* Reduced motion */}
      <Stack spacing={3}>
        <SectionHeader
          eyebrow='Accesibilidad'
          title='Contrato prefers-reduced-motion'
          description='El contrato está horneado en useGreenhouseGSAP vía gsap.matchMedia — ninguna surface puede saltárselo. Cuando el sistema operativo pide reduced-motion, las entradas se vuelven cross-fade/snap, el scroll-reveal queda visible y los timelines colapsan.'
        />
        <Card variant='outlined'>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Stack direction='row' alignItems='center' justifyContent='space-between' gap={2} flexWrap='wrap'>
              <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 560 }}>
                El estado real lo decide tu sistema operativo. Para inspeccionar el estado “sin animación”, podés
                deshabilitar las demos de arriba (las renderiza en su estado final, idéntico a un fallo de JS — el
                contenido nunca queda oculto).
              </Typography>
              <Button
                onClick={() => setMotionOff(v => !v)}
                variant={motionOff ? 'contained' : 'tonal'}
                color='primary'
                size='small'
                startIcon={<i className={motionOff ? 'tabler-player-play' : 'tabler-player-pause'} />}
              >
                {motionOff ? 'Reactivar motion' : 'Mostrar estado sin motion'}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Stack>
  )
}

export default MotionLabView
