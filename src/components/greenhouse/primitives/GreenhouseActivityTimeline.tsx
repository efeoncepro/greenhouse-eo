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
import { typographyScale } from '@/components/theme/typography-tokens'

import { GREENHOUSE_ACTIVITY_TIMELINE_TOKENS } from './greenhouse-activity-timeline-controller'

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
  const tokens = GREENHOUSE_ACTIVITY_TIMELINE_TOKENS

  return (
    <Box
      aria-hidden='true'
      sx={{
        position: 'relative',
        width: tokens.dot.railInlineSize,
        display: 'flex',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <Box
        component={motion.div}
        initial={reduced ? false : { scaleY: 0, opacity: 0.4 }}
        animate={reduced ? undefined : { scaleY: 1, opacity: 1 }}
        transition={{ duration: tokens.motion.connectorDuration, ease: tokens.motion.easing }}
        sx={theme => ({
          display: isLast ? 'none' : 'block',
          position: 'absolute',
          top: tokens.dot.connectorTop,
          bottom: tokens.dot.connectorBlockOffset,
          left: tokens.dot.connectorInlineOffset,
          width: 0,
          transformOrigin: 'top',
          borderLeft: `1px solid ${alpha(theme.palette.text.primary, tokens.opacity.connector)}`
        })}
      />
      <Box
        sx={theme => {
          const main = getToneMain(theme, tone)

          return {
            position: 'relative',
            mt: 0.5,
            width: tokens.dot.size,
            height: tokens.dot.size,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: main,
            backgroundColor: alpha(
              main,
              tone === 'neutral' ? tokens.opacity.neutralDotSurface : tokens.opacity.semanticDotSurface
            ),
            boxShadow: `0 0 0 ${tokens.dot.surfaceRing}px ${theme.palette.background.paper}`
          }
        }}
      >
        <Box
          sx={theme => ({
            width: tokens.dot.innerSize,
            height: tokens.dot.innerSize,
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
      gap: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.spacing.attachmentGap,
      maxWidth: '100%',
      px: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.spacing.attachmentPaddingX,
      py: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.spacing.attachmentPaddingY,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      color: theme.palette.text.secondary,
      border: `1px solid ${alpha(theme.palette.text.primary, GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.opacity.border)}`,
      backgroundColor: alpha(theme.palette.background.paper, GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.opacity.attachmentSurface),
      boxShadow:
        theme.palette.mode === 'dark'
          ? 'none'
          : `0 ${GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.shadow.attachmentOffsetY}px ${GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.shadow.attachmentBlur}px ${alpha(
              theme.palette.text.primary,
              GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.opacity.attachmentShadow
            )}`
    })}
  >
    <Box
      aria-hidden='true'
      sx={theme => ({
        width: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.icon.attachmentInlineSize,
        height: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.icon.attachmentBlockSize,
        borderRadius: 0.5,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: theme.palette.error.contrastText,
        backgroundColor: theme.palette.error.dark,
        ...typographyScale.labelSm,
        '& > i': { fontSize: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.icon.attachmentGlyph }
      })}
    >
      {attachment.icon ?? <i className='tabler-file-type-pdf' />}
    </Box>
    <Typography variant='button' noWrap sx={{ minWidth: 0 }}>
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
      px: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.spacing.personPaddingX,
      py: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.spacing.personPaddingY,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      border: `1px solid ${alpha(theme.palette.text.primary, GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.opacity.personBorder)}`,
      backgroundColor: alpha(theme.palette.text.primary, GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.opacity.personSurface)
    })}
  >
    <Avatar
      src={person.avatarSrc}
      sx={{
        width: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.avatar.person,
        height: GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.avatar.person,
        ...typographyScale.labelSm
      }}
    >
      {person.initials}
    </Avatar>
    <Stack spacing={0} sx={{ minWidth: 0 }}>
      <Typography variant='button' noWrap>
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
      size={GREENHOUSE_ACTIVITY_TIMELINE_TOKENS.avatar.cluster}
    />
    {overflowLabel ? (
      <Typography variant='button' color='text.secondary'>
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
  const tokens = GREENHOUSE_ACTIVITY_TIMELINE_TOKENS

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
                width: tokens.icon.header,
                height: tokens.icon.header,
                display: 'grid',
                placeItems: 'center',
                color: alpha(theme.palette.text.primary, tokens.opacity.headerIcon),
                fontSize: tokens.icon.header,
                flexShrink: 0,
                '& > i': { fontSize: tokens.icon.header }
              })}
            >
              {icon ?? <i className='tabler-list-details' />}
            </Box>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              {title ? (
                <Typography variant='h6'>
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
            <Box aria-hidden='true' sx={{ width: tokens.icon.actionSpacer }} />
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
              initial={reduced ? false : { opacity: 0, y: tokens.motion.itemOffsetY }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{
                duration: tokens.motion.itemDuration,
                delay: index * tokens.motion.itemDelayStep,
                ease: tokens.motion.easing
              }}
              sx={{
                display: 'grid',
                gridTemplateColumns: `${tokens.dot.railInlineSize}px minmax(0, 1fr)`,
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
                  <Typography variant='h6' sx={{ minWidth: 0 }}>
                    {item.title}
                  </Typography>
                  {item.timestamp ? (
                    <Typography variant='monoId' color='text.disabled' sx={{ flexShrink: 0 }}>
                      {item.timestamp}
                    </Typography>
                  ) : null}
                </Stack>

                {item.description ? (
                  <Typography variant='body1' color='text.secondary'>
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
        maxWidth: variant === 'compact' ? tokens.card.compactMaxInlineSize : tokens.card.maxInlineSize,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        borderColor: alpha(theme.palette.text.primary, tokens.opacity.border),
        background:
          theme.palette.mode === 'dark'
            ? theme.palette.background.paper
            : `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.background.paper, tokens.opacity.cardGradientStop)} 100%)`,
        boxShadow:
          theme.palette.mode === 'dark'
            ? 'none'
            : `0 ${tokens.shadow.cardOffsetY}px ${tokens.shadow.cardBlur}px ${alpha(
                theme.palette.text.primary,
                tokens.opacity.cardShadow
              )}`,
        overflow: 'hidden'
      })}
    >
      <CardContent sx={{ p: '0 !important' }}>{content}</CardContent>
    </Card>
  )
}

export default GreenhouseActivityTimeline
