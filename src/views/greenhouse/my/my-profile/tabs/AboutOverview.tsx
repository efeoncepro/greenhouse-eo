'use client'

import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import CardContent from '@mui/material/CardContent'

type CommonItem = {
  icon: string
  property: string
  value: string
}

type TeamItem = {
  property: string
  value: string
}

type Props = {
  about: CommonItem[]
  contacts: CommonItem[]
  overview: CommonItem[]
  teams: TeamItem[]
}

const renderList = (list: CommonItem[]) => {
  return (
    list.length > 0 &&
    list.map((item, index) => (
      <div key={index} className='flex items-center gap-2'>
        <i className={item.icon} />
        <div className='flex items-center flex-wrap gap-2'>
          <Typography className='font-medium'>
            {`${item.property.charAt(0).toUpperCase() + item.property.slice(1)}:`}
          </Typography>
          <Typography>{item.value.charAt(0).toUpperCase() + item.value.slice(1)}</Typography>
        </div>
      </div>
    ))
  )
}

const renderTeams = (teams: TeamItem[]) => {
  return (
    teams.length > 0 &&
    teams.map((item, index) => (
      <div key={index} className='flex items-center flex-wrap gap-2'>
        <Typography className='font-medium'>
          {item.property.charAt(0).toUpperCase() + item.property.slice(1)}
        </Typography>
        <Typography>{item.value.charAt(0).toUpperCase() + item.value.slice(1)}</Typography>
      </div>
    ))
  )
}

const AboutOverview = ({ about, contacts, overview, teams }: Props) => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                Sobre mi
              </Typography>
              {renderList(about)}
            </div>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                Contacto
              </Typography>
              {renderList(contacts)}
            </div>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                Equipos
              </Typography>
              {renderTeams(teams)}
            </div>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent className='flex flex-col gap-6'>
            <div className='flex flex-col gap-4'>
              <Typography className='uppercase' variant='body2' color='text.disabled'>
                Resumen
              </Typography>
              {renderList(overview)}
            </div>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AboutOverview
