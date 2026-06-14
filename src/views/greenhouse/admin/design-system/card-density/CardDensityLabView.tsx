'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { CompositionShell, type CompositionShellComposition } from '@/components/greenhouse/primitives'
import MetricSummaryCard from '@/components/greenhouse/primitives/MetricSummaryCard'
import MetricTrendCard, { type MetricTrendPoint } from '@/components/greenhouse/primitives/MetricTrendCard'
import { MOTION_DURATION_S } from '@/components/greenhouse/motion/core/tokens'
import { useAnimate, stagger } from '@/libs/FramerMotion'
import { startViewTransition } from '@/lib/motion/view-transition'

/**
 * Lab interno del Adaptive Card density contract (TASK-1115). INTERNAL ONLY — los clientes nunca lo ven.
 * Specimen vivo: el MISMO card a tres anchos fijos (full / condensed / peek), con `density='auto'`, para
 * verificar la **condensación honesta** (cada modo es una versión real más chica; el dato clave —el value—
 * nunca desaparece; nunca clip/overflow). El card se adapta a SU propio ancho (container query), NO al shell:
 * cuando una región del Composition Shell condensa, su query dispara sola. Verificado desktop+mobile vía GVC.
 */

// Anchos elegidos para caer en cada fit mode (breakpoints CARD_DENSITY_BREAKPOINTS: condensed 360 / peek 200).
const WIDTHS: { mode: string; label: string; width: number }[] = [
  { mode: 'full', label: 'full · ≥ 360px', width: 460 },
  { mode: 'condensed', label: 'condensed · 200–359px', width: 280 },
  { mode: 'peek', label: 'peek · < 200px', width: 150 }
]

const TREND_SERIES: MetricTrendPoint[] = [
  { label: 'Ene', value: 82.1 },
  { label: 'Feb', value: 84.6 },
  { label: 'Mar', value: 83.2 },
  { label: 'Abr', value: 86.0 },
  { label: 'May', value: 87.4 }
]

const RPA_SERIES: MetricTrendPoint[] = [
  { label: 'Ene', value: 1.41 },
  { label: 'Feb', value: 1.36 },
  { label: 'Mar', value: 1.33 },
  { label: 'Abr', value: 1.29 },
  { label: 'May', value: 1.27 }
]

// Valores objetivo de las cards de la secuencia macro: el conteo sube de 0 → estos en cada Reproducir.
const SEQ_TARGET_VALUES = { otd: 87.4, rpa: 1.27 } as const

const SpecimenRow = ({ title, render }: { title: string; render: (width: number) => ReactNode }) => (
  <Stack spacing={3} data-capture={`card-density-row-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <Typography variant='subtitle2'>{title}</Typography>
    {/* Los specimens son de ancho FIJO (para forzar cada fit mode). En viewports angostos no caben → el
        scroll va CONTENIDO acá (overflow-x), accesible por teclado (role=region + aria-label + tabindex=0),
        NUNCA scroll horizontal de página. Patrón canónico GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1. */}
    <Box
      role='region'
      aria-label={`${title} — comparativa de densidad (desplazá para ver full / condensed / peek)`}
      tabIndex={0}
      sx={theme => ({
        overflowX: 'auto',
        pb: 2,
        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
      })}
    >
      <Stack direction='row' spacing={5} alignItems='flex-start' sx={{ width: 'max-content' }}>
        {WIDTHS.map(w => (
          <Stack key={w.mode} spacing={2}>
            <Typography variant='caption' color='text.secondary'>
              {w.label}
            </Typography>
            {/* Contenedor de ancho fijo = el card resuelve su fit mode desde este ancho (container query). */}
            <Box sx={{ width: w.width }}>{render(w.width)}</Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  </Stack>
)

const modeForWidth = (w: number): string => (w < 200 ? 'peek' : w < 360 ? 'condensed' : 'full')

/**
 * Monta su contenido SOLO cuando entra al viewport (IntersectionObserver, `rootMargin` adelantado). El Lab
 * acumula muchos charts pesados (Recharts × N); montarlos todos en el primer paint lo hace lento. Con lazy-mount
 * el primer paint renderiza solo lo de arriba; cada sección monta al hacer scroll. Reserva alto para no saltar
 * el layout. Compatible con GVC (al hacer scroll a un mark, la sección monta y se captura).
 */
const LazyMount = ({ children, minHeight = 360 }: { children: ReactNode; minHeight?: number }) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (shown) return
    const node = ref.current

    if (!node || typeof IntersectionObserver === 'undefined') {
      setShown(true)

      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '300px' }
    )

    io.observe(node)

    return () => io.disconnect()
  }, [shown])

  return (
    <Box ref={ref} sx={{ minHeight: shown ? undefined : minHeight }}>
      {shown ? children : null}
    </Box>
  )
}

const CardDensityLabView = () => {
  const [composition, setComposition] = useState<CompositionShellComposition>('split')
  // Driver continuo: el ancho del contenedor cambia gradualmente → la container query de las cards dispara
  // sola y morfean su caja + despliegan/pliegan su contenido de forma fluida (sin View Transition de por medio).
  const [driverWidth, setDriverWidth] = useState(460)

  // El host dispara el morph del shell; las cards adentro re-evalúan su fit mode al cambiar su ancho.
  const changeComposition = (next: CompositionShellComposition) => {
    if (next === composition) return
    void startViewTransition(() => setComposition(next))
  }

  // Secuencia MACRO: orquestación garantizada de varias cards como UNA coreografía escalonada (el "Transformer
  // armándose"). Imperativo vía `useAnimate` → corre SOLO en el cliente al apretar el botón (post-mount) →
  // SSR-safe (las cards renderizan en estado final; la animación no toca el primer paint). `stagger` garantiza
  // el orden + el beat; no hay variant inheritance (lo que rompía SSR en el shell). Tokens canónicos.
  const [seqScope, animateSeq] = useAnimate()
  // `playToken` cambia en cada Reproducir → re-monta las cards de la secuencia (por su `key`) → el chart se
  // dibuja solo (Recharts area draw-in re-corre en cada mount). Confiable e independiente del conteo.
  const [playToken, setPlayToken] = useState(0)
  // El conteo lo MANEJA el Lab (no el AnimatedCounter interno, que gatea en un IntersectionObserver asíncrono y
  // al re-montar salta directo al objetivo). Una rampa rAF sube `seqValues` 0 → objetivo con easing; la card solo
  // renderiza el número que recibe → sube sí o sí, sin depender del IO/spring interno. Determinista + replay-proof.
  const [seqValues, setSeqValues] = useState<{ otd: number; rpa: number }>(SEQ_TARGET_VALUES)
  const rampRafRef = useRef<number | null>(null)

  useEffect(() => () => { if (rampRafRef.current !== null) cancelAnimationFrame(rampRafRef.current) }, [])

  // Ensamble (nivel máximo "armándose"): la CAJA de cada card entra encogida + inclinada en 3D (rotateX) + abajo y
  // se acomoda con rebote (easeOutBack), escalonada (`stagger`); a la vez el chart se dibuja solo (re-monte) y el
  // número sube contando. Imperativo + client-only → SSR-safe. Replay confiable.
  const playSequence = () => {
    setPlayToken(token => token + 1) // re-monta → el chart se redibuja
    setSeqValues({ otd: 0, rpa: 0 }) // arranca el conteo desde 0

    if (rampRafRef.current !== null) cancelAnimationFrame(rampRafRef.current)
    // El número sube parejo con easeInOut (NO front-loaded) durante toda la ventana del ensamble, terminando
    // junto/después del barrido del chart — nunca antes. Antes (easeOutCubic) terminaba temprano y el chart
    // "entraba después de que el número ya estaba listo"; al no terminar temprano, esa sensación desaparece.
    const COUNT_MS = 720
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
    const start = performance.now()

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / COUNT_MS)
      const k = easeInOutCubic(p)

      setSeqValues({
        otd: Math.round(SEQ_TARGET_VALUES.otd * k * 10) / 10,
        rpa: Math.round(SEQ_TARGET_VALUES.rpa * k * 100) / 100
      })
      rampRafRef.current = p < 1 ? requestAnimationFrame(tick) : null
    }

    rampRafRef.current = requestAnimationFrame(tick)

    void animateSeq(
      '[data-seq-card]',
      { opacity: [0, 1], scale: [0.82, 1], y: [44, 0], rotateX: [-14, 0] },
      { delay: stagger(0.12, { startDelay: 0.05 }), duration: MOTION_DURATION_S.extended, ease: [0.34, 1.56, 0.64, 1] }
    )
  }

  return (
    <Stack
      spacing={8}
      // `overflowX: clip` = red de seguridad ISSUE-015: este Lab nunca debe producir scroll horizontal de
      // página. No afecta el scroll vertical ni los scroll-containers internos (la fila de specimens tiene su
      // propio overflow-x:auto). Belt-and-suspenders sobre los fixes de min-content de los grids de abajo.
      sx={{ p: { xs: 4, md: 6 }, overflowX: 'clip' }}
      data-capture='card-density-lab'
    >
    <Box>
      <Typography variant='h4'>Adaptive Card — density contract</Typography>
      <Typography variant='body1' color='text.secondary' sx={{ mt: 1 }}>
        Capacidad hermana del Composition Shell (TASK-1115). El mismo card a tres anchos con{' '}
        <code>density=&apos;auto&apos;</code>: <strong>full</strong> (todo), <strong>condensed</strong> (versión
        real más chica), <strong>peek</strong> (solo el dato clave). El card responde a su propio ancho
        (container query), no al shell. El value nunca desaparece; nunca clipea.
      </Typography>
    </Box>

    {/* Driver continuo — arrastrá el ancho y mirá el morph fluido (coreografía Transformer, sin View Transition). */}
    <Stack spacing={4} data-capture='driver-continuo-section'>
      <Box>
        <Typography variant='h5'>Driver continuo — arrastrá para ver el morph</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          Cambiá el ancho del contenedor gradualmente. Las cards (<code>density=&apos;auto&apos;</code>) morfean su
          caja y <strong>despliegan/pliegan</strong> su contenido de forma continua (no es un salto): el chart se
          encoge, los metadatos se pliegan desde altura 0, el dato clave nunca desaparece. Sin View Transition de
          por medio — es la fluidez real de la card.
        </Typography>
      </Box>
      <Stack direction='row' spacing={4} alignItems='center'>
        <Slider
          value={driverWidth}
          onChange={(_, v) => setDriverWidth(Array.isArray(v) ? v[0] : v)}
          min={140}
          max={540}
          step={1}
          aria-label='Ancho del contenedor de las cards'
          sx={{ maxWidth: 360 }}
        />
        <Typography variant='subtitle2' sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 132 }}>
          {driverWidth}px · {modeForWidth(driverWidth)}
        </Typography>
      </Stack>
      <Box sx={{ width: driverWidth, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <MetricSummaryCard
          density='auto'
          title='RpA Global'
          value='1.27'
          subtitle='benchmark adaptado · dato confiable'
          icon='tabler-target-arrow'
          iconColor='primary'
          tooltip='Rondas por aprobación'
          statusLabel='Confiable'
          statusTone='success'
          statusIcon='tabler-circle-check'
        />
        <MetricTrendCard
          density='auto'
          title='OTD%'
          metricName='On-Time Delivery'
          periodLabel='Mensual · May 2026'
          value={87.4}
          series={TREND_SERIES}
          tone='success'
          format='percentage'
          deltaUnit='pts'
        />
      </Box>
    </Stack>

    {/* Secuencia MACRO — apretá "Reproducir" y mirá la cascada escalonada: la coreografía orquestada. */}
    <Stack spacing={4} data-capture='secuencia-macro-section'>
      <Box>
        <Typography variant='h5'>Secuencia macro — el Transformer armándose</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          Apretá <strong>Reproducir</strong>: las cards entran en <strong>secuencia escalonada</strong> — cada una
          arranca un beat después de la anterior, no todas juntas. Es la coreografía orquestada y garantizada: el
          orden y el ritmo los gobierna un solo dueño (<code>stagger</code>). Imperativo + client-only → SSR-safe.
        </Typography>
      </Box>
      <Box>
        <Button
          variant='contained'
          startIcon={<i className='tabler-player-play-filled' />}
          onClick={playSequence}
          data-capture='secuencia-macro-play'
        >
          Reproducir secuencia
        </Button>
      </Box>
      <Box
        ref={seqScope}
        sx={{
          display: 'grid',
          gap: 4,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          alignItems: 'start',
          // `perspective` da profundidad real al rotateX del ensamble (la inclinación 3D se ve, no es plana).
          perspective: '1200px',
          '& > *': { minWidth: 0 }
        }}
      >
        <Box data-seq-card>
          <MetricTrendCard
            key={playToken}
            title='OTD%'
            metricName='On-Time Delivery'
            periodLabel='Mensual · May 2026'
            value={seqValues.otd}
            series={TREND_SERIES}
            tone='success'
            format='percentage'
            deltaUnit='pts'
          />
        </Box>
        <Box data-seq-card>
          <MetricSummaryCard
            key={playToken}
            title='RpA Global'
            value='1.27'
            subtitle='benchmark adaptado'
            icon='tabler-target-arrow'
            iconColor='primary'
            statusLabel='Confiable'
            statusTone='success'
            statusIcon='tabler-circle-check'
          />
        </Box>
        <Box data-seq-card>
          <MetricTrendCard
            key={playToken}
            title='RpA'
            metricName='Rondas por aprobación'
            periodLabel='Mensual · May 2026'
            value={seqValues.rpa}
            series={RPA_SERIES}
            tone='success'
            format='decimal'
            deltaUnit='pts'
          />
        </Box>
      </Box>
    </Stack>

    <LazyMount>
      <SpecimenRow
        title='MetricSummaryCard (KPI)'
        render={() => (
          <MetricSummaryCard
            density='auto'
            title='RpA Global'
            value='1.27'
            subtitle='benchmark adaptado · dato confiable'
            icon='tabler-target-arrow'
            iconColor='primary'
            tooltip='Rondas por aprobación'
            statusLabel='Confiable'
            statusTone='success'
            statusIcon='tabler-circle-check'
          />
        )}
      />
    </LazyMount>

    <LazyMount>
      <SpecimenRow
        title='MetricTrendCard (KPI + tendencia)'
        render={() => (
          <MetricTrendCard
            density='auto'
            title='OTD%'
            metricName='On-Time Delivery'
            periodLabel='Mensual · May 2026'
            value={87.4}
            series={TREND_SERIES}
            tone='success'
            format='percentage'
            deltaUnit='pts'
          />
        )}
      />
    </LazyMount>

    {/* The Seam (La Costura) — las dos capacidades jugando juntas dentro de un shell real. */}
    <LazyMount minHeight={520}>
    <Stack spacing={4} data-capture='the-seam-section'>
      <Box>
        <Typography variant='h5'>The Seam (La Costura) — Composition Shell × Adaptive Card</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          Las dos jugando, con morph fluido. El Composition Shell mueve las regiones (View Transitions); los
          charts adentro (<code>density=&apos;auto&apos;</code>) se adaptan a su propio ancho. Cambiá de composición: en{' '}
          <strong>single</strong> el primary es ancho → los <code>MetricTrendCard</code> en modo full (chart
          completo + nombre + período); en <strong>split</strong> el primary se estrecha para dejar lugar al
          aside → los mismos charts condensan solos (sparkline reducido, sin metadatos). Nadie se cablea: la
          costura es el ancho (container query).
        </Typography>
      </Box>
      <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
        {(['single', 'split'] as const).map(c => (
          <Button
            key={c}
            variant={composition === c ? 'contained' : 'tonal'}
            onClick={() => changeComposition(c)}
            data-capture={`the-seam-control-${c}`}
          >
            {c}
          </Button>
        ))}
      </Stack>
      <CompositionShell
        composition={composition}
        fluidity='rich'
        regions={{
          primary: (
            <Box
              sx={{
                display: 'grid',
                gap: 4,
                // En xs (teléfono) los charts apilan: 2 columnas no bajan de su min-content (~232px c/u) y
                // empujarían el scrollWidth de página. Desde sm vuelven lado a lado (donde se ve el morph).
                gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
                alignItems: 'start',
                '& > *': { minWidth: 0 }
              }}
            >
              <MetricTrendCard
                density='auto'
                title='OTD%'
                metricName='On-Time Delivery'
                periodLabel='Mensual · May 2026'
                value={87.4}
                series={TREND_SERIES}
                tone='success'
                format='percentage'
                deltaUnit='pts'
              />
              <MetricTrendCard
                density='auto'
                title='RpA'
                metricName='Rondas por aprobación'
                periodLabel='Mensual · May 2026'
                value={1.27}
                series={RPA_SERIES}
                tone='success'
                format='decimal'
                deltaUnit='pts'
              />
            </Box>
          ),
          aside: (
            <MetricSummaryCard
              density='auto'
              title='Assets activos'
              value='688'
              subtitle='en movimiento'
              icon='tabler-box'
              iconColor='primary'
              statusLabel='Estable'
              statusTone='success'
              statusIcon='tabler-circle-check'
            />
          )
        }}
      />
    </Stack>
    </LazyMount>
  </Stack>
  )
}

export default CardDensityLabView
