'use client'

import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import AvatarGroup from '@mui/material/AvatarGroup'
import Tooltip from '@mui/material/Tooltip'

import CustomAvatar from '@core/components/mui/Avatar'

type ProjectItem = {
  title: string
  client: string
  avatar: string
  budget: string
  budgetSpent: string
  startDate: string
  deadline: string
  description: string
  hours: string
  daysLeft: number
  chipColor: 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary'
  totalTask: number
  completedTask: number
  members: string
  comments: number
  avatarGroup: { name: string; avatar: string }[]
}

type Props = {
  data: ProjectItem[]
}

const ProjectsTab = ({ data }: Props) => {
  return (
    <Grid container spacing={6}>
      {data.map((item, index) => (
        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
          <Card>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-center gap-4'>
                <CustomAvatar src={item.avatar} size={38} />
                <div>
                  <Typography variant='h5'>{item.title}</Typography>
                  <Typography>
                    <span className='font-medium'>Cliente: </span>
                    {item.client}
                  </Typography>
                </div>
              </div>
              <div className='flex items-center justify-between flex-wrap gap-4'>
                <div className='rounded bg-actionHover plb-2 pli-3'>
                  <div className='flex'>
                    <Typography className='font-medium' color='text.primary'>
                      {item.budgetSpent}
                    </Typography>
                    <Typography>{`/${item.budget}`}</Typography>
                  </div>
                  <Typography>Presupuesto</Typography>
                </div>
                <div className='flex flex-col'>
                  <div className='flex'>
                    <Typography className='font-medium' color='text.primary'>
                      Inicio:&nbsp;
                    </Typography>
                    <Typography>{item.startDate}</Typography>
                  </div>
                  <div className='flex'>
                    <Typography className='font-medium' color='text.primary'>
                      Plazo:&nbsp;
                    </Typography>
                    <Typography>{item.deadline}</Typography>
                  </div>
                </div>
              </div>
              <Typography>{item.description}</Typography>
            </CardContent>
            <Divider />
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-center justify-between'>
                <div className='flex'>
                  <Typography className='font-medium' color='text.primary'>
                    Horas totales:&nbsp;
                  </Typography>
                  <Typography>{item.hours}</Typography>
                </div>
                <Chip
                  variant='tonal'
                  size='small'
                  color={item.chipColor}
                  label={`${item.daysLeft} dias restantes`}
                />
              </div>
              <div>
                <div className='flex items-center justify-between mbe-2'>
                  <Typography variant='caption' className='text-textSecondary'>
                    {`Tareas: ${item.completedTask}/${item.totalTask}`}
                  </Typography>
                  <Typography variant='caption' className='text-textSecondary'>
                    {`${Math.round((item.completedTask / item.totalTask) * 100)}% Completado`}
                  </Typography>
                </div>
                <LinearProgress
                  color='primary'
                  variant='determinate'
                  value={Math.round((item.completedTask / item.totalTask) * 100)}
                  className='bs-2'
                />
              </div>
              <div className='flex items-center justify-between'>
                <div className='flex items-center grow gap-3'>
                  <AvatarGroup className='items-center pull-up'>
                    {item.avatarGroup.map((person, idx) => (
                      <Tooltip key={idx} title={person.name}>
                        <CustomAvatar src={person.avatar} alt={person.name} size={32} />
                      </Tooltip>
                    ))}
                  </AvatarGroup>
                  <Typography variant='body2' className='grow'>
                    {item.members}
                  </Typography>
                </div>
                <div className='flex items-center gap-1'>
                  <i className='tabler-message-dots' />
                  <Typography>{item.comments}</Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default ProjectsTab
