'use client'

import type { ReactNode } from 'react'
import { useId } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

import useReducedMotion from '@/hooks/useReducedMotion'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import { getMicrocopy } from '@/lib/copy'

import type { AdaptiveSidecarKind } from './adaptive-sidecar-controller'

export type ContextualSidecarState = 'idle' | 'loading' | 'saving' | 'error'
export type ContextualSidecarChrome = 'adaptive' | 'contained'

export interface ContextualSidecarProps {
  title: ReactNode
  subtitle?: ReactNode
  eyebrow?: ReactNode
  icon?: string
  iconColor?: ThemeColor
  kind?: AdaptiveSidecarKind
  state?: ContextualSidecarState
  errorMessage?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  children: ReactNode
  chrome?: ContextualSidecarChrome
  motionKey?: string
  onClose?: () => void
  closeLabel?: string
  id?: string
  labelledBy?: string
  dataCapture?: string
}

const GREENHOUSE_COPY = getMicrocopy()

const ContextualSidecar = ({
  title,
  subtitle,
  eyebrow,
  icon,
  iconColor = 'primary',
  kind = 'inspector',
  state = 'idle',
  errorMessage,
  actions,
  footer,
  children,
  chrome = 'adaptive',
  motionKey,
  onClose,
  closeLabel = GREENHOUSE_COPY.aria.closeDrawer,
  id,
  labelledBy,
  dataCapture
}: ContextualSidecarProps) => {
  const generatedId = useId()
  const headingId = labelledBy ?? id ?? `contextual-sidecar-${generatedId}`
  const isBusy = state === 'loading' || state === 'saving'
  const prefersReducedMotion = useReducedMotion()

  return (
    <Box
      component='aside'
      role='complementary'
      aria-labelledby={headingId}
      aria-busy={isBusy ? 'true' : undefined}
      data-sidecar-kind={kind}
      data-capture={dataCapture}
      sx={theme => ({
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
        bgcolor:
          chrome === 'adaptive'
            ? theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.96)
              : alpha(theme.palette.background.paper, 0.98)
            : 'background.paper',
        border: chrome === 'contained' ? `1px solid ${theme.palette.divider}` : 0,
        borderRadius: chrome === 'contained' ? { xs: 0, md: `${theme.shape.customBorderRadius.lg}px` } : 0,
        overflow: 'hidden',
        boxShadow: chrome === 'contained' ? { xs: 0, md: theme.shadows[2] } : 'none'
      })}
    >
      <Box
        sx={theme => ({
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 0.86),
          backdropFilter: 'saturate(180%) blur(10px)',
          borderBlockEnd: `1px solid ${alpha(theme.palette.divider, 0.72)}`
        })}
      >
        {isBusy ? <LinearProgress aria-hidden='true' /> : null}
        <Stack direction='row' spacing={3} alignItems='flex-start' sx={{ px: 4, py: 3.5 }}>
          {icon ? (
            <CustomAvatar
              skin='light'
              color={iconColor}
              variant='rounded'
              sx={theme => ({
                boxShadow: `0 0 0 1px ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.06 : 0.62)}`
              })}
            >
              <i className={icon} aria-hidden='true' />
            </CustomAvatar>
          ) : null}
          <Stack spacing={1} sx={{ minWidth: 0, flex: 1 }}>
            {eyebrow ? (
              <Typography variant='caption' color='text.secondary'>
                {eyebrow}
              </Typography>
            ) : null}
            <Typography id={headingId} variant='h6' sx={{ overflowWrap: 'anywhere' }}>
              {title}
            </Typography>
            {subtitle ? (
              <Typography variant='body2' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
                {subtitle}
              </Typography>
            ) : null}
          </Stack>
          {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
          {onClose ? (
            <IconButton
              size='small'
              aria-label={closeLabel}
              onClick={onClose}
              sx={theme => ({
                flexShrink: 0,
                border: `1px solid ${alpha(theme.palette.divider, 0.74)}`,
                bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.42 : 0.72),
                '&:hover': {
                  bgcolor: alpha(theme.palette.action.hover, 0.9),
                  boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.26 : 0.1)}`
                }
              })}
            >
              <i className='tabler-x' aria-hidden='true' />
            </IconButton>
          ) : null}
        </Stack>
      </Box>
      {state === 'error' && errorMessage ? (
        <Box sx={{ px: 4, pt: 4 }}>
          <Alert severity='error'>{errorMessage}</Alert>
        </Box>
      ) : null}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 4, py: 4 }}>
        <AnimatePresence mode='wait' initial={false}>
          <Box
            key={motionKey ?? `${kind}-${state}`}
            component={motion.div}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8, filter: 'blur(2px)' }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6, filter: 'blur(1px)' }}
            transition={
              prefersReducedMotion
                ? undefined
                : {
                    duration: 0.22,
                    ease: 'easeOut'
                  }
            }
          >
            {children}
          </Box>
        </AnimatePresence>
      </Box>
      {footer ? (
        <>
          <Divider />
          <Box
            sx={theme => ({
              p: 4,
              bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.92 : 0.96),
              backdropFilter: 'saturate(180%) blur(8px)'
            })}
          >
            {footer}
          </Box>
        </>
      ) : null}
    </Box>
  )
}

export default ContextualSidecar
