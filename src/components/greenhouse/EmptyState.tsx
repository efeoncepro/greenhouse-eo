'use client'

import { type ReactNode, Suspense, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'
import { alpha, useTheme } from '@mui/material/styles'

import useReducedMotion from '@/hooks/useReducedMotion'
import Lottie from '@/libs/Lottie'

type EmptyStateProps = {
  icon?: string
  animatedIcon?: string
  title: string
  description: string
  action?: ReactNode
  minHeight?: number
}

const EmptyState = ({
  icon = 'tabler-layout-dashboard-off',
  animatedIcon,
  title,
  description,
  action,
  minHeight = 220
}: EmptyStateProps) => {
  const theme = useTheme()
  const prefersReduced = useReducedMotion()
  const [lottieError, setLottieError] = useState(false)

  const showLottie = Boolean(animatedIcon) && !lottieError && !prefersReduced

  return (
    <Box
      sx={{
        minHeight,
        p: 4,
        borderRadius: 3,
        border: `1px dashed ${alpha(theme.palette.text.secondary, 0.22)}`,
        backgroundColor: alpha(theme.palette.action.hover, 0.48),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Stack spacing={1.5} alignItems='center' textAlign='center' sx={{ maxWidth: 360 }}>
        {showLottie ? (
          <Suspense fallback={<StaticIcon icon={icon} theme={theme} />}>
            <LottieIcon src={animatedIcon!} onError={() => setLottieError(true)} />
          </Suspense>
        ) : (
          <StaticIcon icon={icon} theme={theme} />
        )}
        <Typography variant='h6'>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {description}
        </Typography>
        {action}
      </Stack>
    </Box>
  )
}

/* ── Subcomponents ────────────────────────────────── */

function StaticIcon({ icon, theme }: { icon: string; theme: Theme }) {
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: alpha(theme.palette.text.secondary, 0.08),
        color: 'text.secondary'
      }}
    >
      <i className={icon} style={{ fontSize: 24 }} />
    </Box>
  )
}

function LottieIcon({ src, onError }: { src: string; onError: () => void }) {
  const [data, setData] = useState<object | null>(null)

  // Fetch JSON once on mount
  useState(() => {
    fetch(src)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)

        return r.json()
      })
      .then(setData)
      .catch(onError)
  })

  if (!data) return null

  return <Lottie animationData={data} loop style={{ width: 64, height: 64 }} />
}

export default EmptyState
