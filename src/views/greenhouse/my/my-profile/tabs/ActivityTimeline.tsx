'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import { styled } from '@mui/material/styles'
import MuiTimeline from '@mui/lab/Timeline'
import type { TimelineProps } from '@mui/lab/Timeline'

// Styled Components
const Timeline = styled(MuiTimeline)<TimelineProps>({
  '& .MuiTimelineItem-root': {
    '&:before': {
      display: 'none'
    }
  }
})

type ActivityItem = {
  title: string
  description: string
  time: string
  color: 'primary' | 'success' | 'info' | 'warning' | 'error'
  icon?: string
}

type Props = {
  activity: ActivityItem[]
}

const ActivityTimeline = ({ activity }: Props) => {
  return (
    <Card>
      <CardHeader
        title='Actividad reciente'
        avatar={<i className='tabler-activity text-textSecondary' />}
        titleTypographyProps={{ variant: 'h5' }}
      />
      <CardContent>
        <Timeline>
          {activity.map((item, index) => (
            <TimelineItem key={index}>
              <TimelineSeparator>
                <TimelineDot color={item.color} />
                {index < activity.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <div className='flex items-center justify-between flex-wrap gap-x-4 pbe-[7px]'>
                  <Typography className='text-textPrimary font-medium'>{item.title}</Typography>
                  <Typography variant='caption'>{item.time}</Typography>
                </div>
                <Typography className='mbe-2'>{item.description}</Typography>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  )
}

export default ActivityTimeline
