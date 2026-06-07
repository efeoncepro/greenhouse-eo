'use client'

import type { ReactNode } from 'react'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import { motion } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import TeamAvatarGroup from '@/components/greenhouse/TeamAvatarGroup'

export type GreenhouseActivityTimelineTone = 'success' | 'info' | 'warning' | 'error' | 'primary' | 'secondary' | 'neutral'
export type GreenhouseActivityTimelineVariant = 'card' | 'embedded' | 'compact'
export type GreenhouseActivityTimelineKind = 'activityTimeline' | 'auditTrail' | 'handoffTimeline' | 'documentTimeline' | 'custom'

export type GreenhouseActivityTimelineAttachment = {
  label: ReactNode
  icon?: ReactNode
  ariaLabel?: string
}

export type GreenhouseActivityTimelinePerson = {
  name: ReactNode
  description?: ReactNode
  avatarSrc?: string
  initials?: string
}

export type GreenhouseActivityTimelineAvatar = {
  id: string
  alt: string
  src?: string
  initials?: string
}

export type GreenhouseActivityTimelineItem = {
  id: string
  title: ReactNode
  timestamp?: ReactNode
  description?: ReactNode
  tone?: GreenhouseActivityTimelineTone
  attachment?: GreenhouseActivityTimelineAttachment
  person?: GreenhouseActivityTimelinePerson
  avatars?: GreenhouseActivityTimelineAvatar[]
  avatarOverflowLabel?: ReactNode
}

export type GreenhouseActivityTimelineProps = {
  title?: ReactNode
  subtitle?: ReactNode
  items: GreenhouseActivityTimelineItem[]
  variant?: GreenhouseActivityTimelineVariant
  kind?: GreenhouseActivityTimelineKind
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
  ariaLabel?: string
  dataCapture?: string
}

const TONE_TO_COLOR: Record<GreenhouseActivityTimelineTone, 'success' | 'info' | 'warning' | 'error' | 'primary' | 'secondary' | null> = {
  success: 'success',
  info: 'info',
  warning: 'warning',
  error: 'error',
  primary: 'primary',
  secondary: 'secondary',
  neutral: null
}

const getToneMain = (theme: Theme, tone: GreenhouseActivityTimelineTone) => {
  const paletteKey = TONE_TO_COLOR[tone]

  return paletteKey ? theme.palette[paletteKey].main : theme.palette.text.secondary
}

const TimelineDot = ({ tone = 'success', isLast }: { tone?: GreenhouseActivityTimelineTone; isLast: boolean }) => {
  const reduced = useReducedMotion()

  return (
    <Box
      aria-hidden='true'
      sx={{
        position: 'relative',
        width: 18,
        display: 'flex',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <Box
        component={motion.div}
        initial={reduced ? false : { scaleY: 0, opacity: 0.4 }}
        animate={reduced ? undefined : { scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.34, ease: [0.2, 0, 0, 1] }}
        sx={theme => ({
          display: isLast ? 'none' : 'block',
          position: 'absolute',
          top: 22,
          bottom: -22,
          left: 8.5,
          width: 0,
          transformOrigin: 'top',
          borderLeft: `1px solid ${alpha(theme.palette.text.primary, 0.12)}`
        })}
      />
      <Box
        sx={theme => {
          const main = getToneMain(theme, tone)

          return {
            position: 'relative',
            mt: 0.5,
            width: 18,
            height: 18,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: main,
            backgroundColor: alpha(main, tone === 'neutral' ? 0.11 : 0.18),
            boxShadow: `0 0 0 3px ${theme.palette.background.paper}`
          }
        }}
      >
        <Box
          sx={theme => ({
            width: 10,
            height: 10,
            borderRadius: '50%',
            backgroundColor: getToneMain(theme, tone)
          })}
        />
      </Box>
    </Box>
  )
}

const AttachmentPill = ({ attachment }: { attachment: GreenhouseActivityTimelineAttachment }) => (
  <Box
    aria-label={attachment.ariaLabel}
    sx={theme => ({
      display: 'inline-flex',
      alignItems: 'center',
      gap: 1,
      maxWidth: '100%',
      px: 1,
      py: 0.65,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      color: theme.palette.text.secondary,
      border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
      backgroundColor: alpha(theme.palette.background.paper, 0.86),
      boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 8px 18px rgba(47, 43, 61, 0.05)'
    })}
  >
    <Box
      aria-hidden='true'
      sx={theme => ({
        width: 18,
        height: 22,
        borderRadius: 0.5,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: theme.palette.error.contrastText,
        backgroundColor: theme.palette.error.dark,
        fontSize: 12,
        '& > i': { fontSize: 14 }
      })}
    >
      {attachment.icon ?? <i className='tabler-file-type-pdf' />}
    </Box>
    <Typography variant='body2' noWrap sx={{ minWidth: 0, fontWeight: 700 }}>
      {attachment.label}
    </Typography>
  </Box>
)

const PersonRow = ({ person }: { person: GreenhouseActivityTimelinePerson }) => (
  <Stack
    direction='row'
    spacing={1.25}
    alignItems='center'
    sx={theme => ({
      width: 'fit-content',
      maxWidth: '100%',
      px: 1,
      py: 0.75,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`,
      backgroundColor: alpha(theme.palette.text.primary, 0.025)
    })}
  >
    <Avatar src={person.avatarSrc} sx={{ width: 34, height: 34, fontSize: 12, fontWeight: 800 }}>
      {person.initials}
    </Avatar>
    <Stack spacing={0} sx={{ minWidth: 0 }}>
      <Typography variant='body2' noWrap sx={{ fontWeight: 700 }}>
        {person.name}
      </Typography>
      {person.description ? (
        <Typography variant='caption' color='text.secondary' noWrap>
          {person.description}
        </Typography>
      ) : null}
    </Stack>
  </Stack>
)

const AvatarCluster = ({ avatars, overflowLabel }: { avatars: GreenhouseActivityTimelineAvatar[]; overflowLabel?: ReactNode }) => (
  <Stack direction='row' spacing={1} alignItems='center' sx={{ pt: 0.25 }}>
    <TeamAvatarGroup
      members={avatars.map(avatar => ({
        name: avatar.alt,
        avatarUrl: avatar.src ?? null
      }))}
      max={4}
      size={34}
    />
    {overflowLabel ? (
      <Typography variant='body2' color='text.secondary' sx={{ fontWeight: 700 }}>
        {overflowLabel}
      </Typography>
    ) : null}
  </Stack>
)

const GreenhouseActivityTimeline = ({
  title = 'Activity Timeline',
  subtitle,
  items,
  variant = 'card',
  kind = 'activityTimeline',
  icon,
  actionLabel = 'Abrir acciones de timeline',
  onAction,
  ariaLabel,
  dataCapture
}: GreenhouseActivityTimelineProps) => {
  const reduced = useReducedMotion()
  const isEmbedded = variant === 'embedded'
  const isCompact = variant === 'compact'

  const content = (
    <Stack
      component='section'
      aria-label={ariaLabel ?? (typeof title === 'string' ? title : 'Activity timeline')}
      spacing={0}
      data-variant={variant}
      data-kind={kind}
      data-capture={dataCapture}
    >
      {title || subtitle || onAction ? (
        <Stack
          direction='row'
          alignItems='flex-start'
          justifyContent='space-between'
          spacing={2}
          sx={{ px: isEmbedded ? 0 : 3, pt: isEmbedded ? 0 : 3, pb: isCompact ? 1.5 : 2 }}
        >
          <Stack direction='row' spacing={1.5} alignItems='flex-start' sx={{ minWidth: 0 }}>
            <Box
              aria-hidden='true'
              sx={theme => ({
                mt: 0.25,
                width: 22,
                height: 22,
                display: 'grid',
                placeItems: 'center',
                color: alpha(theme.palette.text.primary, 0.78),
                fontSize: 22,
                flexShrink: 0,
                '& > i': { fontSize: 22 }
              })}
            >
              {icon ?? <i className='tabler-list-details' />}
            </Box>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              {title ? (
                <Typography variant='h6' sx={{ fontWeight: 800 }}>
                  {title}
                </Typography>
              ) : null}
              {subtitle ? (
                <Typography variant='body2' color='text.secondary'>
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
          {onAction ? (
            <Tooltip title={actionLabel}>
              <IconButton size='small' type='button' onClick={onAction} aria-label={actionLabel}>
                <i className='tabler-dots-vertical' />
              </IconButton>
            </Tooltip>
          ) : (
            <Box aria-hidden='true' sx={{ width: 34 }} />
          )}
        </Stack>
      ) : null}

      <Stack component='ol' sx={{ listStyle: 'none', m: 0, px: isEmbedded ? 0 : 3, pb: isEmbedded ? 0 : 3, pt: 0 }}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <Box
              key={item.id}
              component={motion.li}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: index * 0.045, ease: [0.2, 0, 0, 1] }}
              sx={{
                display: 'grid',
                gridTemplateColumns: '18px minmax(0, 1fr)',
                columnGap: 2,
                pb: isLast ? 0 : isCompact ? 2 : 2.5
              }}
            >
              <TimelineDot tone={item.tone} isLast={isLast} />
              <Stack spacing={isCompact ? 0.75 : 1} sx={{ minWidth: 0 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent='space-between'
                  spacing={{ xs: 0.35, sm: 2 }}
                  sx={{ minWidth: 0 }}
                >
                  <Typography variant='body1' sx={{ fontWeight: 500, minWidth: 0 }}>
                    {item.title}
                  </Typography>
                  {item.timestamp ? (
                    <Typography
                      variant='caption'
                      color='text.disabled'
                      sx={{ flexShrink: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {item.timestamp}
                    </Typography>
                  ) : null}
                </Stack>

                {item.description ? (
                  <Typography variant='body1' color='text.secondary' sx={{ fontWeight: 400 }}>
                    {item.description}
                  </Typography>
                ) : null}

                {item.attachment ? (
                  <Box sx={{ pt: 0.25 }}>
                    <AttachmentPill attachment={item.attachment} />
                  </Box>
                ) : null}

                {item.person ? <PersonRow person={item.person} /> : null}

                {item.avatars?.length ? <AvatarCluster avatars={item.avatars} overflowLabel={item.avatarOverflowLabel} /> : null}
              </Stack>
            </Box>
          )
        })}
      </Stack>
    </Stack>
  )

  if (isEmbedded) return content

  return (
    <Card
      variant='outlined'
      sx={theme => ({
        width: '100%',
        maxWidth: variant === 'compact' ? 460 : 554,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        borderColor: alpha(theme.palette.text.primary, 0.08),
        background:
          theme.palette.mode === 'dark'
            ? theme.palette.background.paper
            : `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.paper, 0.96)} 100%)`,
        boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 22px 54px rgba(47, 43, 61, 0.1)',
        overflow: 'hidden'
      })}
    >
      <CardContent sx={{ p: '0 !important' }}>{content}</CardContent>
    </Card>
  )
}

export default GreenhouseActivityTimeline
