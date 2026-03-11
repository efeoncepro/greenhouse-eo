import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
  const { title, stats, avatarIcon, avatarColor, trend, trendNumber, subtitle } = props

  return (
    <Card>
      <CardContent className='flex justify-between gap-1'>
        <div className='flex flex-col gap-1 grow'>
          <Typography color='text.primary'>{title}</Typography>
          <div className='flex items-center gap-2 flex-wrap'>
            <Typography variant='h4'>{stats}</Typography>
            <Typography color={getTrendColor(trend)}>{`(${getTrendPrefix(trend)}${trendNumber})`}</Typography>
          </div>
          <Typography variant='body2'>{subtitle}</Typography>
        </div>
        <CustomAvatar color={avatarColor} skin='light' variant='rounded' size={42}>
          <i className={classnames(avatarIcon, 'text-[26px]')} />
        </CustomAvatar>
      </CardContent>
    </Card>
  )
}

export default HorizontalWithSubtitle
