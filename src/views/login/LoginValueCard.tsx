import type { ReactElement } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import type { ValueCardData } from './login-constants'

const iconPaths: Record<ValueCardData['icon'], ReactElement> = {
  visibility: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M12 5C5.636 5 2 12 2 12s3.636 7 10 7 10-7 10-7-3.636-7-10-7Z'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <circle cx='12' cy='12' r='3' stroke='currentColor' strokeWidth='1.8' />
    </svg>
  ),
  data: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <rect x='3' y='12' width='4' height='9' rx='1' stroke='currentColor' strokeWidth='1.8' />
      <rect x='10' y='8' width='4' height='13' rx='1' stroke='currentColor' strokeWidth='1.8' />
      <rect x='17' y='3' width='4' height='18' rx='1' stroke='currentColor' strokeWidth='1.8' />
    </svg>
  ),
  improvement: (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'>
      <path
        d='M3 17l6-6 4 4 8-8'
        stroke='currentColor'
        strokeWidth='1.8'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path d='M17 7h4v4' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  )
}

interface LoginValueCardProps {
  data: ValueCardData
}

const LoginValueCard = ({ data }: LoginValueCardProps) => {
  const { icon, iconBg, iconColor, title, subtitle } = data

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        bgcolor: 'rgba(255,255,255, 0.06)',
        border: '0.5px solid rgba(255,255,255, 0.08)',
        borderRadius: '10px',
        padding: '14px 16px'
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '8px',
          bgcolor: iconBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: iconColor
        }}
      >
        {iconPaths[icon]}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#fff', lineHeight: 1.4 }}>{title}</Typography>
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255, 0.4)', lineHeight: 1.4, mt: 0.25 }}>
          {subtitle}
        </Typography>
      </Box>
    </Box>
  )
}

export default LoginValueCard
