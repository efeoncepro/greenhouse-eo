'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import TimelineConnector from '@mui/lab/TimelineConnector'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import MuiTimeline from '@mui/lab/Timeline'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import type { TimelineProps } from '@mui/lab/Timeline'

import type { AdminUserDetail } from '@/lib/admin/get-admin-user-detail'

import { buildUserTimeline, formatRelativeDate } from './helpers'

const Timeline = styled(MuiTimeline)<TimelineProps>({
  paddingLeft: 0,
  paddingRight: 0,
  '& .MuiTimelineItem-root': {
    width: '100%',
    '&:before': {
      display: 'none'
    }
  }
})

const UserActivityTimeline = ({ data }: { data: AdminUserDetail }) => {
  const events = buildUserTimeline(data)

  return (
    <Card>
      <CardHeader title='User Activity Timeline' />
      <CardContent>
        <Timeline>
          {events.map((event, index) => (
            <TimelineItem key={event.id}>
              <TimelineSeparator>
                <TimelineDot color={event.color} />
                {index < events.length - 1 ? <TimelineConnector /> : null}
              </TimelineSeparator>
              <TimelineContent>
                <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-2.5'>
                  <Typography className='font-medium' color='text.primary'>
                    {event.title}
                  </Typography>
                  <Typography variant='caption' color='text.disabled'>
                    {formatRelativeDate(event.timestamp)}
                  </Typography>
                </div>
                <Typography>{event.caption}</Typography>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  )
}

export default UserActivityTimeline
