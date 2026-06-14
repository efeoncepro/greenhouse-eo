'use client'

import type { ReactNode } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

import OperationalStatusBadge, { type OperationalStatusTone } from './OperationalStatusBadge'
import { isCardDensityAtLeast, useContainerDensity, type CardDensityRequest } from './card-density'

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
  const { ref, density, containerType } = useContainerDensity(densityRequest)
  const isPeek = density === 'peek'
  // condensed o más estrecho: el subtitle (contexto secundario) cede; value + status (señal) sobreviven.
  const hideSubtitle = isCardDensityAtLeast(density, 'condensed')

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
              {subtitle && !hideSubtitle ? (
                <Typography variant='body2' color='text.secondary'>
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
            {/* El avatar/ícono es decorativo de jerarquía → cede en peek (el dato clave manda). */}
            {!isPeek ? (
              <CustomAvatar skin='light' color={iconColor} variant='rounded'>
                <i className={icon} aria-hidden='true' />
              </CustomAvatar>
            ) : null}
          </Stack>
          {/* El status es señal operativa (no decorativa) → sobrevive en condensed; solo cede en peek. */}
          {statusLabel && !isPeek ? (
            <OperationalStatusBadge label={statusLabel} tone={statusTone} icon={statusIcon} />
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default MetricSummaryCard
