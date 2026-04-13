'use client'

import Box from '@mui/material/Box'
import CardActionArea from '@mui/material/CardActionArea'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_TEAM } from '@/config/greenhouse-nomenclature'

type TeamExpansionGhostCardProps = {
  minHeight?: number
  onClick: () => void
  variant?: 'card' | 'row'
}

const TeamExpansionGhostCard = ({ minHeight = 280, onClick, variant = 'card' }: TeamExpansionGhostCardProps) => {
  if (variant === 'row') {
    return (
      <Box
        sx={{
          borderRadius: 3,
          border: theme => `1px dashed ${theme.palette.customColors.lightAlloy}`,
          bgcolor: 'background.default',
          overflow: 'hidden'
        }}
      >
        <CardActionArea
          onClick={onClick}
          sx={{
            minHeight: 88,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            p: 2.5,
            textAlign: 'left'
          }}
        >
          <Stack direction='row' spacing={2} alignItems='center' sx={{ minWidth: 0 }}>
            <Box
              sx={theme => ({
                width: 40,
                height: 40,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 999,
                bgcolor: theme.palette.warning.lighterOpacity,
                color: theme.palette.warning.main,
                flexShrink: 0
              })}
            >
              <i className='tabler-plus text-[20px]' />
            </Box>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant='subtitle2'>{GH_TEAM.expand_title}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {GH_TEAM.expand_subtitle}
              </Typography>
            </Stack>
          </Stack>

          <Box sx={{ color: theme => theme.palette.warning.main, flexShrink: 0 }}>
            <i className='tabler-arrow-right text-[18px]' />
          </Box>
        </CardActionArea>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        borderRadius: 3,
        border: theme => `1px dashed ${theme.palette.customColors.lightAlloy}`,
        bgcolor: 'background.default',
        overflow: 'hidden'
      }}
    >
      <CardActionArea
        onClick={onClick}
        sx={{
          minHeight,
          display: 'grid',
          placeItems: 'center',
          p: 3,
          textAlign: 'center'
        }}
      >
        <Stack spacing={1.5} alignItems='center'>
          <Box
            sx={theme => ({
              width: 48,
              height: 48,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 999,
              bgcolor: theme.palette.warning.lighterOpacity,
              color: theme.palette.warning.main
            })}
          >
            <i className='tabler-plus text-[24px]' />
          </Box>
          <Typography variant='h6'>{GH_TEAM.expand_title}</Typography>
          <Typography variant='body2' color='text.secondary'>
            {GH_TEAM.expand_subtitle}
          </Typography>
        </Stack>
      </CardActionArea>
    </Box>
  )
}

export default TeamExpansionGhostCard
