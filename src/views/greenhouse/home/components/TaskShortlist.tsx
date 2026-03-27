// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import { styled } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import MuiTimeline from '@mui/lab/Timeline'
import TimelineDot from '@mui/lab/TimelineDot'
import TimelineItem from '@mui/lab/TimelineItem'
import TimelineContent from '@mui/lab/TimelineContent'
import TimelineSeparator from '@mui/lab/TimelineSeparator'
import TimelineConnector from '@mui/lab/TimelineConnector'
import type { TimelineProps } from '@mui/lab/Timeline'

// Type Imports
import type { PendingTask } from '@/types/home'

// Styled Timeline component
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

interface Props {
  tasks: PendingTask[]
}

const TaskShortlist = ({ tasks }: Props) => {
  if (tasks.length === 0) {
    return (
      <Card className='h-full flex flex-col justify-center items-center p-8 gap-4 shadow-sm'>
        <i className='tabler-clipboard-check text-5xl text-success-main opacity-20' />
        <Typography variant='h6' className='text-text-secondary text-center'>
          ¡Todo al día! No tienes tareas pendientes.
        </Typography>
      </Card>
    )
  }

  return (
    <Card className='h-full shadow-sm border border-secondary-100 dark:border-secondary-900/10'>
      <CardHeader
        avatar={<i className='tabler-list-check text-xl text-primary-main' />}
        title='Pendientes hoy'
        titleTypographyProps={{ variant: 'h6', className: 'font-bold' }}
        sx={{ '& .MuiCardHeader-avatar': { mr: 2 } }}
      />
      <CardContent className='flex flex-col gap-6 pbe-5'>
        <Timeline>
          {tasks.map((task, index) => (
            <TimelineItem key={task.id}>
              <TimelineSeparator>
                <TimelineDot 
                  color={task.priority === 'high' ? 'error' : task.type === 'finance' ? 'info' : 'primary'} 
                  variant='outlined' 
                  className='bs-[12px] is-[12px] border-2'
                />
                {index !== tasks.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent className='pb-6'>
                <div className='flex flex-wrap items-center justify-between gap-x-2 mbe-1'>
                  <Typography className='font-bold' color='text.primary' variant='body2'>
                    {task.title}
                  </Typography>
                  {task.dueDate && (
                    <Typography variant='caption' className='text-text-disabled'>
                      Vence: {new Date(task.dueDate).toLocaleDateString()}
                    </Typography>
                  )}
                </div>
                <Typography variant='caption' className='mbe-2 line-clamp-2 block'>
                  {task.description}
                </Typography>
                {task.ctaRoute && (
                  <Button 
                    component={Link} 
                    href={task.ctaRoute} 
                    size='small' 
                    variant='tonal' 
                    className='mt-2 rounded-full px-4 h-7 text-xs'
                  >
                    {task.ctaLabel || 'Ver detalles'}
                  </Button>
                )}
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  )
}

export default TaskShortlist
