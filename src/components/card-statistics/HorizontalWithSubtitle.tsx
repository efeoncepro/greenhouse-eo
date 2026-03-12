import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import classnames from 'classnames'

import type { ThemeColor } from '@core/types'

import CustomAvatar from '@core/components/mui/Avatar'

export type HorizontalWithSubtitleData = {
  title: string
  stats: string
  avatarIcon: string
  avatarColor?: ThemeColor
  trend: 'positive' | 'negative' | 'neutral'
  trendNumber: string
  subtitle: string
  titleTooltip?: string
  footer?: string
  statusLabel?: string
  statusColor?: ThemeColor | 'default'
  statusIcon?: string
}

const getTrendColor = (trend: HorizontalWithSubtitleData['trend']) => {
  if (trend === 'negative') return 'error.main'
  if (trend === 'positive') return 'success.main'

  return 'text.secondary'
}

const getTrendPrefix = (trend: HorizontalWithSubtitleData['trend']) => {
  if (trend === 'negative') return '-'
  if (trend === 'positive') return '+'

  return ''
}

const HorizontalWithSubtitle = (props: HorizontalWithSubtitleData) => {
  const {
    title,
    stats,
    avatarIcon,
    avatarColor,
    trend,
    trendNumber,
    subtitle,
    titleTooltip,
    footer,
    statusLabel,
    statusColor = 'default',
    statusIcon
  } = props

  return (
    <Card>
      <CardContent className='flex flex-col gap-3'>
        <div className='flex justify-between gap-1'>
          <div className='flex flex-col gap-1 grow'>
            <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
              <Typography color='text.primary'>{title}</Typography>
              {titleTooltip ? (
                <Tooltip title={titleTooltip}>
                  <Box component='span' sx={{ color: 'text.secondary', display: 'inline-flex' }}>
                    <i className='tabler-info-circle text-base' />
                  </Box>
                </Tooltip>
              ) : null}
            </Stack>
            <div className='flex items-center gap-2 flex-wrap'>
              <Typography variant='h4'>{stats}</Typography>
              <Typography color={getTrendColor(trend)}>{`(${getTrendPrefix(trend)}${trendNumber})`}</Typography>
            </div>
            <Typography variant='body2'>{subtitle}</Typography>
          </div>
          <CustomAvatar color={avatarColor} skin='light' variant='rounded' size={42}>
            <i className={classnames(avatarIcon, 'text-[26px]')} />
          </CustomAvatar>
        </div>

        {statusLabel || footer ? <Divider /> : null}

        {statusLabel || footer ? (
          <Stack direction='row' justifyContent='space-between' gap={2} alignItems={{ xs: 'flex-start', sm: 'center' }} flexWrap='wrap'>
            {statusLabel ? (
              <Chip
                size='small'
                variant='tonal'
                color={statusColor === 'default' ? undefined : statusColor}
                icon={statusIcon ? <i className={statusIcon} /> : undefined}
                label={statusLabel}
              />
            ) : (
              <span />
            )}
            {footer ? (
              <Typography variant='caption' color='text.secondary' sx={{ maxWidth: 260 }}>
                {footer}
              </Typography>
            ) : null}
          </Stack>
        ) : null}
    </CardContent>
    </Card>
  )
}

export default HorizontalWithSubtitle
