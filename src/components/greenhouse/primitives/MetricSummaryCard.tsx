'use client'

import { useEffect, useState, type ReactNode } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

import { motion, AnimatePresence } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'

import OperationalStatusBadge, { type OperationalStatusTone } from './OperationalStatusBadge'
import { isCardDensityAtLeast, useContainerDensity, type CardDensityRequest } from './card-density'
import {
  cardDensityLayoutTransition,
  cardDensityRevealTransition,
  cardDensityRevealStaggerSec
} from './card-density/card-density-motion'

export interface MetricSummaryCardProps {
  title: ReactNode
  value: ReactNode
  subtitle?: ReactNode
  icon: string
  iconColor?: ThemeColor
  tooltip?: string
  statusLabel?: ReactNode
  statusTone?: OperationalStatusTone
  statusIcon?: string
  /**
   * TASK-1115 — densidad adaptable (opt-in). `undefined` = `full` (legacy, byte-idéntico). `'auto'` = el
   * card se adapta a SU propio ancho (container query): `condensed` oculta el subtitle, `peek` deja solo
   * title + value (el dato clave nunca desaparece; condensación honesta, nunca clip).
   */
  density?: CardDensityRequest
}

/**
 * Consistent metric card for operational dashboards.
 *
 * Keeps null/empty values honest by letting callers pass fallback copy instead
 * of coercing missing data into numeric zeroes. Adaptive density (TASK-1115):
 * when dropped into a Composition Shell region that condenses, pass `density='auto'`
 * and the card shows a real smaller version (never clips).
 */
const MetricSummaryCard = ({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'primary',
  tooltip,
  statusLabel,
  statusTone = 'secondary',
  statusIcon,
  density: densityRequest
}: MetricSummaryCardProps) => {
  const reduced = useReducedMotion()
  // SSR-safe: el reveal sólo activa su `initial` (offset de entrada) tras montar; en el primer render (SSR +
  // hidratación) el contenido aparece en su estado final → sin hydration mismatch (patrón TASK-1117/CompositionShell).
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => setHasMounted(true), [])
  const { ref, density, containerType } = useContainerDensity(densityRequest)
  const isPeek = density === 'peek'
  // condensed o más estrecho: el subtitle (contexto secundario) cede; value + status (señal) sobreviven.
  const hideSubtitle = isCardDensityAtLeast(density, 'condensed')
  // Card adaptable (density definido): el cambio de fit mode (resize + reflow) se anima con framer `layout`
  // → el morph del card es fluido, no un salto. El path legacy (density undefined) NO usa motion.
  const adaptive = densityRequest !== undefined

  // `layout='position'` (no `size`): framer NO escala la caja → el texto NO se estira a-desproporción durante
  // el morph de ancho (la distorsión clásica de `layout`). El ancho lo sigue el contenedor (container query,
  // continuo) y la altura la maneja el unfold del contenido; layout solo coreografía la POSICIÓN (reorders).
  const motionProps = adaptive
    ? {
        component: motion.div,
        layout: reduced ? false : ('position' as const),
        transition: cardDensityLayoutTransition(reduced)
      }
    : {}

  // Reveal/unfold canónico (TASK-1115): el contenido que entra/sale entre densidades se DESPLIEGA desde altura
  // 0 (`height: 0↔auto` + opacity, `overflow: hidden` clipa el crecimiento) en vez de popear, mientras la caja
  // morfea con `layout`. AnimatePresence default mode (no popLayout: rompería el plegado del flujo). El desync
  // caja(200ms)/contenido(300ms) da el efecto Transformer. Solo en el path adaptable; legacy byte-idéntico.
  const reveal = (key: string, show: boolean, node: ReactNode, staggerIndex = 0): ReactNode => {
    if (!adaptive) return show ? node : null

    // Cascada: cada pieza arranca con un delay según su orden de lectura. Reduced-motion → sin delay.
    const delay = reduced ? 0 : staggerIndex * cardDensityRevealStaggerSec

    return (
      <AnimatePresence key={`reveal-${key}`} initial={false}>
        {show ? (
          <motion.div
            key={key}
            initial={hasMounted ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ ...cardDensityRevealTransition(reduced), delay }}
            style={{ overflow: 'hidden' }}
          >
            {node}
          </motion.div>
        ) : null}
      </AnimatePresence>
    )
  }

  const titleNode = (
    <Stack direction='row' spacing={1} alignItems='center' sx={{ minWidth: 0 }}>
      <Typography variant='subtitle1' sx={{ fontWeight: 600 }} noWrap>
        {title}
      </Typography>
      {tooltip ? (
        <Tooltip title={tooltip}>
          <i className='tabler-info-circle' style={{ fontSize: 16 }} aria-label={tooltip} />
        </Tooltip>
      ) : null}
    </Stack>
  )

  return (
    <Card
      ref={ref}
      {...motionProps}
      data-card-density={density}
      sx={theme => ({
        height: '100%',
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        containerType
      })}
    >
      <CardContent>
        <Stack spacing={hideSubtitle ? 2 : 4} sx={{ minHeight: isPeek ? 56 : hideSubtitle ? 84 : 124 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
            <Stack spacing={1} sx={{ minWidth: 0 }}>
              {titleNode}
              <Typography variant={isPeek ? 'h6' : 'h5'} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </Typography>
              {reveal(
                'subtitle',
                Boolean(subtitle) && !hideSubtitle,
                <Typography variant='body2' color='text.secondary'>
                  {subtitle}
                </Typography>
              )}
            </Stack>
            {/* El avatar/ícono es decorativo de jerarquía → cede en peek (el dato clave manda). */}
            {!isPeek ? (
              <CustomAvatar skin='light' color={iconColor} variant='rounded'>
                <i className={icon} aria-hidden='true' />
              </CustomAvatar>
            ) : null}
          </Stack>
          {/* El status es señal operativa (no decorativa) → sobrevive en condensed; solo cede en peek. */}
          {reveal(
            'status',
            Boolean(statusLabel) && !isPeek,
            <OperationalStatusBadge label={statusLabel} tone={statusTone} icon={statusIcon} />,
            1
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default MetricSummaryCard
