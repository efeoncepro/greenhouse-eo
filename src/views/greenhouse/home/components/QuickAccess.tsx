'use client'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import type { ModuleCard } from '@/types/home'

interface Props {
  modules: ModuleCard[]
}

const QuickAccess = ({ modules }: Props) => {
  const router = useRouter()

  if (modules.length === 0) return null

  return (
    <Box>
      <Typography variant='subtitle2' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', mb: 2 }}>
        Accesos directos
      </Typography>
      <Grid container spacing={3}>
        {modules.slice(0, 8).map(mod => (
          <Grid key={mod.id} size={{ xs: 6, sm: 3 }}>
            <Card
              elevation={0}
              sx={{
                border: theme => `1px solid ${theme.palette.divider}`,
                '&:hover': { boxShadow: theme => theme.shadows[4] },
                transition: 'box-shadow 0.2s'
              }}
            >
              <CardActionArea
                onClick={() => router.push(mod.route)}
                sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}
              >
                <CustomAvatar skin='light' color={mod.color} variant='rounded' sx={{ width: 40, height: 40 }}>
                  <i className={mod.icon} style={{ fontSize: '1.25rem' }} />
                </CustomAvatar>
                <Typography variant='body2' sx={{ fontWeight: 600, textAlign: 'center' }}>
                  {mod.title}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

export default QuickAccess
