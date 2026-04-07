'use client'

import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import { getInitials } from '@/utils/getInitials'

type ConnectionItem = {
  name: string
  avatar: string
  designation: string
  projects: string
  tasks: string
  connections: string
  chips: { title: string; color: 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary' }[]
}

type Props = {
  data: ConnectionItem[]
}

const ConnectionsTab = ({ data }: Props) => {
  return (
    <Grid container spacing={6}>
      {data.map((item, index) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
          <Card>
            <CardContent className='flex items-center flex-col gap-6'>
              {item.avatar ? (
                <CustomAvatar src={item.avatar} className='!mbs-5' sx={{ width: 100, height: 100, fontSize: '2rem' }} />
              ) : (
                <CustomAvatar color='primary' skin='light-static' className='!mbs-5' sx={{ width: 100, height: 100, fontSize: '2rem' }}>
                  {getInitials(item.name)}
                </CustomAvatar>
              )}
              <div className='flex flex-col items-center'>
                <Typography variant='h5'>{item.name}</Typography>
                <Typography>{item.designation}</Typography>
              </div>
              <div className='flex items-center gap-4'>
                {item.chips.map((chip, idx) => (
                  <Chip key={idx} variant='tonal' label={chip.title} color={chip.color} size='small' />
                ))}
              </div>
              <div className='flex is-full items-center justify-around flex-wrap'>
                <div className='flex items-center flex-col'>
                  <Typography variant='h5'>{item.projects}</Typography>
                  <Typography>Proyectos</Typography>
                </div>
                <div className='flex items-center flex-col'>
                  <Typography variant='h5'>{item.tasks}</Typography>
                  <Typography>Tareas</Typography>
                </div>
                <div className='flex items-center flex-col'>
                  <Typography variant='h5'>{item.connections}</Typography>
                  <Typography>Conexiones</Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default ConnectionsTab
