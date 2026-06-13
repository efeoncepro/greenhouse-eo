'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import { motionCss } from '@/components/greenhouse/motion'

import GreenhouseButton from '../GreenhouseButton'
import GreenhouseThinkingBeat from '../GreenhouseThinkingBeat'
import NexaSenderMark from '../NexaSenderMark'
import NexaExpressiveText, { getNexaExpressiveTextPlainText } from '../nexa-expressive-text/NexaExpressiveText'
import {
  resolveNexaConversationBubbleKind,
  resolveNexaConversationBubbleVariant
} from './nexa-conversation-bubble-controller'
import type {
  NexaConversationBubbleAction,
  NexaConversationBubbleProps,
  NexaConversationBubbleTone,
  NexaConversationBubbleVariant
} from './nexa-conversation-bubble-types'

const tonePalette = (theme: Theme, tone: NexaConversationBubbleTone) => {
  const map = {
    neutral: {
      main: theme.palette.text.secondary,
      soft: alpha(theme.palette.text.primary, 0.035),
      border: theme.palette.divider,
      text: theme.palette.text.primary
    },
    info: {
      main: theme.palette.primary.main,
      soft: alpha(theme.palette.primary.main, 0.04),
      border: alpha(theme.palette.primary.main, 0.16),
      text: theme.palette.text.primary
    },
    success: {
      main: theme.palette.success.main,
      soft: alpha(theme.palette.success.main, 0.04),
      border: alpha(theme.palette.success.main, 0.16),
      text: theme.palette.text.primary
    },
    warning: {
      main: theme.palette.warning.main,
      soft: alpha(theme.palette.warning.main, 0.035),
      border: alpha(theme.palette.warning.main, 0.18),
      text: theme.palette.text.primary
    },
    error: {
      main: theme.palette.error.main,
      soft: alpha(theme.palette.error.main, 0.04),
      border: alpha(theme.palette.error.main, 0.18),
      text: theme.palette.text.primary
    }
  } satisfies Record<NexaConversationBubbleTone, { main: string; soft: string; border: string; text: string }>

  return map[tone]
}

const bubbleSurface = (
  theme: Theme,
  variant: NexaConversationBubbleVariant,
  tone: NexaConversationBubbleTone,
  minimal: boolean
) => {
  const palette = tonePalette(theme, tone)

  if (variant === 'userQuestion') {
    return {
      backgroundColor: alpha(theme.palette.primary.main, minimal ? 0.055 : 0.08),
      borderColor: alpha(theme.palette.primary.main, minimal ? 0.14 : 0.2),
      color: theme.palette.text.primary
    }
  }

  if (variant === 'systemNotice') {
    return {
      backgroundColor: minimal ? alpha(palette.main, 0.018) : palette.soft,
      borderColor: minimal ? alpha(palette.main, 0.12) : palette.border,
      color: palette.text
    }
  }

  if (variant === 'assistantFollowUp') {
    return {
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
      borderColor: alpha(theme.palette.primary.main, 0.16),
      color: theme.palette.text.primary
    }
  }

  return {
    backgroundColor: minimal ? alpha(theme.palette.background.paper, 0.72) : theme.palette.background.paper,
    borderColor: minimal ? alpha(theme.palette.divider, 0.72) : theme.palette.divider,
    color: theme.palette.text.primary
  }
}

const renderAction = (action: NexaConversationBubbleAction) => (
  <GreenhouseButton
    key={action.label}
    kind={action.kind ?? 'inlineAction'}
    variant={action.variant ?? 'text'}
    tone={action.tone ?? 'primary'}
    size='small'
    leadingIconClassName={action.iconClassName}
    disabled={action.disabled}
    onClick={action.onClick}
  >
    {action.label}
  </GreenhouseButton>
)

const nexaWordmarkInlineSx = (theme: Theme) => ({
  fontFamily: theme.typography.h4.fontFamily,
  fontWeight: 600,
  fontSize: '1rem',
  lineHeight: 1,
  letterSpacing: 0.1,
  color: theme.palette.text.secondary
})

const NexaAssistantIdentity = ({ assistantName }: { assistantName: string }) => (
  <Stack direction='row' spacing={1.25} alignItems='center'>
    <NexaSenderMark />
    <Typography component='span' sx={nexaWordmarkInlineSx}>
      {assistantName}
    </Typography>
  </Stack>
)

const conversationEntranceSx = (variant: NexaConversationBubbleVariant) => {
  const isUser = variant === 'userQuestion'
  const isSystem = variant === 'systemNotice'

  return {
    '--nexa-bubble-enter-x': isUser ? '10px' : isSystem ? '0px' : '-3px',
    '--nexa-bubble-enter-y': isUser ? '2px' : isSystem ? '4px' : '7px',
    '--nexa-bubble-enter-scale': isSystem ? '0.998' : '0.996',
    transformOrigin: isUser ? '100% 100%' : '0 0',
    willChange: 'opacity, transform',
    '@keyframes nexa-conversation-bubble-enter': {
      '0%': {
        opacity: 0,
        transform: 'translate3d(var(--nexa-bubble-enter-x), var(--nexa-bubble-enter-y), 0) scale(var(--nexa-bubble-enter-scale))'
      },
      '100%': {
        opacity: 1,
        transform: 'translate3d(0, 0, 0) scale(1)'
      }
    },
    animation: `nexa-conversation-bubble-enter ${motionCss.duration.medium} ${motionCss.ease.emphasized} both`,
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      transform: 'none',
      willChange: 'auto'
    }
  }
}

const NexaConversationBubble = ({
  variant,
  kind,
  body,
  title,
  metaLabel,
  assistantName = 'Nexa',
  senderLabel = 'Tú',
  tone,
  thinkingLabel,
  actions = [],
  dataCapture
}: NexaConversationBubbleProps) => {
  const kindConfig = resolveNexaConversationBubbleKind(kind)
  const variantConfig = resolveNexaConversationBubbleVariant(variant, kind)
  const resolvedTone = tone ?? kindConfig.tone
  const resolvedVariant = variantConfig.variant
  const isUser = resolvedVariant === 'userQuestion'
  const isThinking = resolvedVariant === 'assistantThinking'
  const isSystem = resolvedVariant === 'systemNotice'
  const hasDirectActions = actions.length > 0
  const isMinimal = !hasDirectActions && resolvedVariant !== 'assistantFollowUp'
  const role = resolvedTone === 'error' && isSystem ? 'alert' : variantConfig.role

  if (!isUser && !isSystem) {
    return (
      <Stack
        data-capture={dataCapture}
        data-variant={resolvedVariant}
        data-kind={kindConfig.kind}
        role={isThinking ? 'status' : role}
        aria-live={isThinking || role ? 'polite' : undefined}
        aria-busy={isThinking ? true : undefined}
        aria-label={isThinking ? thinkingLabel ?? getNexaExpressiveTextPlainText(body) : undefined}
        spacing={isThinking ? 0.75 : 1.1}
        sx={{
          inlineSize: '100%',
          ...conversationEntranceSx(resolvedVariant)
        }}
      >
        <NexaAssistantIdentity assistantName={assistantName} />

        {isThinking ? (
          <Stack direction='row' spacing={1.25} alignItems='center' sx={{ pt: 0.25 }}>
            <Box aria-hidden sx={{ width: 28, flexShrink: 0 }} />
            <GreenhouseThinkingBeat kind='nexa' variant='inline' motion='wave' dotCount={5} dotSize={7} decorative />
          </Stack>
        ) : (
          <Stack direction='row' spacing={1.25} alignItems='flex-start'>
            <Box aria-hidden sx={{ width: 28, flexShrink: 0 }} />
            <Box
              sx={theme => {
                const surface = bubbleSurface(theme, resolvedVariant, resolvedTone, isMinimal)

                return {
                  position: 'relative',
                  maxInlineSize: { xs: 'calc(100% - 40px)', md: 720 },
                  minInlineSize: 0,
                  px: isMinimal ? 1.8 : 2.25,
                  py: isMinimal ? 1.35 : 1.75,
                  border: `1px solid ${surface.borderColor}`,
                  borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                  borderStartStartRadius: 0,
                  backgroundColor: surface.backgroundColor,
                  color: surface.color,
                  boxShadow: isMinimal ? 'none' : theme.greenhouseElevation.raised.boxShadow,
                  transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
                    duration: theme.transitions.duration.shorter
                  }),
                  '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none'
                  }
                }
              }}
            >
              {metaLabel ? (
                <NexaExpressiveText value={metaLabel} variant='caption' color='text.secondary' sx={{ display: 'block', mb: title || body ? 0.75 : 0 }} />
              ) : null}
              <Stack spacing={0.85}>
                {title ? <NexaExpressiveText value={title} variant='h6' /> : null}
                <NexaExpressiveText value={body} variant='body2' color='text.secondary' sx={{ maxInlineSize: '68ch' }} />
                {actions.length ? (
                  <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap sx={{ pt: 0.35 }}>
                    {actions.map(renderAction)}
                  </Stack>
                ) : null}
              </Stack>
            </Box>
          </Stack>
        )}
      </Stack>
    )
  }

  return (
    <Stack
      data-capture={dataCapture}
      data-variant={resolvedVariant}
      data-kind={kindConfig.kind}
      role={role}
      aria-live={role ? 'polite' : undefined}
      aria-busy={isThinking ? true : undefined}
      direction={isUser ? 'row-reverse' : 'row'}
      spacing={1.25}
      alignItems='flex-start'
      sx={{
        inlineSize: '100%',
        justifyContent:
          variantConfig.align === 'end' ? 'flex-start' : variantConfig.align === 'center' ? 'center' : 'flex-start',
        ...conversationEntranceSx(resolvedVariant)
      }}
    >
      <Box
        sx={theme => {
          const surface = bubbleSurface(theme, resolvedVariant, resolvedTone, isMinimal)

          return {
            position: 'relative',
            maxInlineSize: isSystem ? { xs: '100%', md: 760 } : { xs: 'calc(100% - 44px)', md: isUser ? 640 : 720 },
            minInlineSize: 0,
            px: isSystem ? (isMinimal ? 1.5 : 2) : isMinimal ? 1.8 : 2.25,
            py: isMinimal ? 1.35 : 1.75,
            border: `1px solid ${surface.borderColor}`,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            borderEndEndRadius: isUser ? 0 : undefined,
            backgroundColor: surface.backgroundColor,
            color: surface.color,
            boxShadow: isMinimal || isSystem ? 'none' : theme.greenhouseElevation.raised.boxShadow,
            transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow'], {
              duration: theme.transitions.duration.shorter
            }),
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none'
            }
          }
        }}
      >
        {variantConfig.showHeader || metaLabel ? (
          <Stack
            direction='row'
            spacing={isThinking ? 0.6 : 1}
            alignItems='center'
            flexWrap='wrap'
            useFlexGap
            sx={{ mb: isThinking ? 0.2 : title || body ? 0.75 : 0 }}
          >
            {variantConfig.showHeader ? (
              <Typography variant='subtitle2' color='text.primary'>
                {senderLabel}
              </Typography>
            ) : null}
            {metaLabel ? (
              <NexaExpressiveText value={metaLabel} variant='caption' color='text.secondary' />
            ) : null}
          </Stack>
        ) : null}

        {isSystem ? (
          <Stack direction='row' spacing={1.25} alignItems='flex-start'>
            <Box
              component='span'
              aria-hidden
              sx={theme => {
                const palette = tonePalette(theme, resolvedTone)

                return {
                  mt: 0.25,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: palette.main,
                  fontSize: 20,
                  flexShrink: 0
                }
              }}
            >
              <i className={kindConfig.iconClassName ?? 'tabler-info-circle'} />
            </Box>
            <Stack spacing={0.35} sx={{ minInlineSize: 0 }}>
              {title ? <NexaExpressiveText value={title} variant='h6' /> : null}
              <NexaExpressiveText value={body} variant='body2' color='text.secondary' sx={{ maxInlineSize: '72ch' }} />
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={0.85}>
            {title ? <NexaExpressiveText value={title} variant='h6' /> : null}
            <NexaExpressiveText value={body} variant='body2' color='text.secondary' sx={{ maxInlineSize: '68ch' }} />
            {actions.length ? (
              <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap sx={{ pt: 0.35 }}>
                {actions.map(renderAction)}
              </Stack>
            ) : null}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}

export default NexaConversationBubble
