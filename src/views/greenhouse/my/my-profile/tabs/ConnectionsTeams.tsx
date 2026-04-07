'use client'

import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'

import CustomAvatar from '@core/components/mui/Avatar'

type ConnectionItem = {
  name: string
  avatar: string
  role: string
}

type TeamTechItem = {
  title: string
  avatar: string
  members: number
  chipText: string
  chipColor: 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary'
}

type Props = {
  connections: ConnectionItem[]
  teamsTech: TeamTechItem[]
}

const ConnectionsTeams = ({ connections, teamsTech }: Props) => {
  return (
    <>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Colegas' />
          <CardContent className='flex flex-col gap-4'>
            {connections.map((connection, index) => (
              <div key={index} className='flex items-center gap-2'>
                <div className='flex items-center grow gap-2'>
                  <CustomAvatar src={connection.avatar} size={38} />
                  <div className='flex grow flex-col'>
                    <Typography className='font-medium' color='text.primary'>
                      {connection.name}
                    </Typography>
                    <Typography variant='body2'>{connection.role}</Typography>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardHeader title='Equipos' />
          <CardContent className='flex flex-col gap-4'>
            {teamsTech.map((team, index) => (
              <div key={index} className='flex'>
                <div className='flex grow items-center gap-2'>
                  <CustomAvatar src={team.avatar} size={38} />
                  <div className='flex grow flex-col'>
                    <Typography className='font-medium' color='text.primary'>
                      {team.title}
                    </Typography>
                    <Typography variant='body2'>
                      {team.members} {team.members === 1 ? 'Miembro' : 'Miembros'}
                    </Typography>
                  </div>
                </div>
                <Chip color={team.chipColor} label={team.chipText} size='small' variant='tonal' />
              </div>
            ))}
          </CardContent>
        </Card>
      </Grid>
    </>
  )
}

export default ConnectionsTeams
