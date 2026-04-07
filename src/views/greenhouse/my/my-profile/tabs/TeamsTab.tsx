'use client'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import AvatarGroup from '@mui/material/AvatarGroup'
import Tooltip from '@mui/material/Tooltip'
import Chip from '@mui/material/Chip'

type TeamItem = {
  title: string
  avatar: string
  description: string
  extraMembers?: number
  chips: { title: string; color: 'primary' | 'success' | 'info' | 'warning' | 'error' | 'secondary' }[]
  avatarGroup: { name: string; avatar: string }[]
}

type Props = {
  data: TeamItem[]
}

const TeamsTab = ({ data }: Props) => {
  return (
    <Grid container spacing={6}>
      {data.map((item, index) => (
        <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
          <Card>
            <CardContent className='flex flex-col gap-4'>
              <div className='flex items-center gap-2'>
                <Avatar src={item.avatar} className='bs-[38px] is-[38px]' />
                <Typography variant='h5'>{item.title}</Typography>
              </div>
              <Typography>{item.description}</Typography>
              <div className='flex items-center justify-between flex-wrap gap-4'>
                <AvatarGroup
                  total={item.extraMembers ? item.extraMembers + item.avatarGroup.length : item.avatarGroup.length}
                  sx={{ '& .MuiAvatar-root': { width: '2rem', height: '2rem', fontSize: '1rem' } }}
                  className='items-center pull-up'
                >
                  {item.avatarGroup.map((person, idx) => (
                    <Tooltip key={idx} title={person.name}>
                      <Avatar src={person.avatar} alt={person.name} />
                    </Tooltip>
                  ))}
                </AvatarGroup>
                <div className='flex items-center gap-2'>
                  {item.chips.map((chip, idx) => (
                    <Chip key={idx} variant='tonal' size='small' label={chip.title} color={chip.color} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default TeamsTab
