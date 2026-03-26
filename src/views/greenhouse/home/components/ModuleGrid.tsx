// Next Imports
import Link from 'next/link'

// MUI Imports
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

// Component Imports
import CustomAvatar from '@core/components/mui/Avatar'

// Type Imports
import type { ModuleCard } from '@/types/home'

interface Props {
  modules: ModuleCard[]
}

const ModuleGrid = ({ modules }: Props) => {
  if (modules.length === 0) {
    return (
      <Box className='p-8 text-center'>
        <Typography variant='body2' className='text-text-secondary'>
          No hay módulos disponibles en tu capacidad actual.
        </Typography>
      </Box>
    )
  }

  return (
    <Box className='space-y-4'>
      <Typography variant='h6' className='font-bold ml-1'>
        Tus Módulos
      </Typography>
      <Grid container spacing={4}>
        {modules.map((module) => (
          <Grid key={module.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Link href={module.route} className='block h-full no-underline'>
              <Card 
                className='h-full shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border border-transparent hover:border-primary-main/20'
              >
                <CardContent className='flex flex-col gap-3 p-5'>
                  <Box className='flex justify-between items-start'>
                    <CustomAvatar
                      skin='light'
                      color={module.color}
                      variant='rounded'
                      className='bs-[42px] is-[42px] rounded-xl'
                    >
                      <i className={`${module.icon} text-2xl`} />
                    </CustomAvatar>
                    {module.isNew && (
                      <Typography
                        variant='caption'
                        className='bg-success-light text-success-main font-bold rounded-full px-2 h-5 flex items-center shadow-sm uppercase tracking-wider text-[10px]'
                      >
                        Nuevo
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <Typography variant='h6' className='font-bold truncate leading-snug'>
                      {module.title}
                    </Typography>
                    <Typography variant='caption' className='text-text-secondary line-clamp-2 mt-1 min-h-[32px]'>
                      {module.subtitle}
                    </Typography>
                  </Box>
                  <Box className='mt-1 flex items-center text-primary-main gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                    <Typography variant='caption' className='font-bold'>Explorar</Typography>
                    <i className='tabler-chevron-right text-xs' />
                  </Box>
                </CardContent>
              </Card>
            </Link>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default ModuleGrid
