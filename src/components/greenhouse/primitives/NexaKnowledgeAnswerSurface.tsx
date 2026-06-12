'use client'

import { type ReactNode } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import GreenhouseChip from './GreenhouseChip'
import GreenhouseStatusDot from './GreenhouseStatusDot'
import GreenhouseThinkingBeat from './GreenhouseThinkingBeat'
import NexaComposer, { NexaComposerActionButton, NexaComposerInput } from './NexaComposer'
import NexaSenderMark from './NexaSenderMark'
import {
  resolveNexaKnowledgeAnswerSurfaceKind,
  resolveNexaKnowledgeAnswerSurfaceVariant,
  type NexaKnowledgeAnswerSurfaceKind,
  type NexaKnowledgeAnswerSurfaceVariant
} from './nexa-knowledge-answer-surface-controller'

export type NexaKnowledgeAnswerTraceStepState = 'complete' | 'active' | 'pending'

export interface NexaKnowledgeAnswerTraceStep {
  id: string
  label: string
  description: string
  metadata: string
  state: NexaKnowledgeAnswerTraceStepState
}

export interface NexaKnowledgeAnswerSource {
  id: string
  title: string
}

export interface NexaKnowledgeAnswerModeOption<TMode extends string = string> {
  value: TMode
  label: string
}

export interface NexaKnowledgeAnswerProofTab<TTab extends string = string> {
  value: TTab
  label: string
}

export interface NexaKnowledgeAnswerSurfaceProps<TMode extends string = string, TTab extends string = string> {
  variant?: NexaKnowledgeAnswerSurfaceVariant
  kind?: NexaKnowledgeAnswerSurfaceKind
  question: string
  conversationStarted?: boolean
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: () => void
  isThinking?: boolean
  commandPlaceholder: string
  followUpPlaceholder: string
  sendLabel: string
  mode: TMode
  modeOptions: readonly NexaKnowledgeAnswerModeOption<TMode>[]
  onModeChange: (value: TMode) => void
  modeHelper: ReactNode
  modeSelectorAriaLabel: string
  traceSteps: readonly NexaKnowledgeAnswerTraceStep[]
  responseTitle: string
  assistantName?: string
  responseThinkingLabel: string
  responseModeLabel: string
  answerIntro: ReactNode
  answerSteps: readonly string[]
  sourcesLabel: string
  sources: readonly NexaKnowledgeAnswerSource[]
  warningTitle: string
  warningBody: string
  warningAction?: ReactNode
  responseActions?: ReactNode
  proofTitle: string
  proofTab: TTab
  proofTabs: readonly NexaKnowledgeAnswerProofTab<TTab>[]
  onProofTabChange: (value: TTab) => void
  proofTabsAriaLabel: string
  proofContent: ReactNode
}

const traceStepMotionSx = {
  '@keyframes nexa-knowledge-step-in': {
    '0%': { opacity: 0, transform: 'translateY(5px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  },
  animation: 'nexa-knowledge-step-in 0.22s cubic-bezier(0.2, 0, 0, 1) both',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
}

const messageMotionSx = {
  '@keyframes nexa-knowledge-message-in': {
    '0%': { opacity: 0, transform: 'translateY(8px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  },
  animation: 'nexa-knowledge-message-in 0.24s cubic-bezier(0.2, 0, 0, 1) both',
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
}

const sectionHeaderSx = {
  px: { xs: 4, md: 5 },
  py: 3,
  minBlockSize: 56,
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  justifyContent: 'space-between',
  gap: 3,
  '& > *': { minInlineSize: 0 },
  '& > .MuiTabs-root': { maxInlineSize: '100%' }
}

const TraceStepCard = ({ step, index, isLast }: { step: NexaKnowledgeAnswerTraceStep; index: number; isLast: boolean }) => {
  const theme = useTheme()
  const active = step.state === 'active'
  const complete = step.state === 'complete'

  return (
    <Box
      data-capture={`nexa-knowledge-step-${step.id}`}
      sx={{
        position: 'relative',
        flex: 1,
        minInlineSize: { xs: 0, md: 0 },
        px: { xs: 3, md: 4 },
        py: 3,
        borderInlineEnd: { xs: 0, md: !isLast ? `1px solid ${theme.palette.divider}` : 0 },
        borderBlockEnd: {
          xs: !isLast ? `1px solid ${theme.palette.divider}` : '2px solid transparent',
          md: active ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent'
        },
        backgroundColor: active ? alpha(theme.palette.primary.main, 0.04) : 'transparent',
        animationDelay: `${index * 0.04}s`,
        ...traceStepMotionSx
      }}
    >
      <Stack direction='row' spacing={3} alignItems='flex-start'>
        <Box
          sx={{
            inlineSize: 28,
            blockSize: 28,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            flex: '0 0 auto',
            color: complete || active ? theme.palette.primary.contrastText : theme.palette.text.secondary,
            backgroundColor: complete ? theme.palette.success.main : active ? theme.palette.primary.main : theme.palette.action.selected
          }}
        >
          <Typography variant='caption' sx={{ color: 'inherit', fontWeight: 600 }}>
            {index + 1}
          </Typography>
        </Box>

        <Stack spacing={1} sx={{ minInlineSize: 0 }}>
          <Stack direction='row' spacing={2} alignItems='center'>
            <Typography variant='h6' sx={{ color: theme.palette.text.primary }}>
              {step.label}
            </Typography>
            {complete ? <GreenhouseStatusDot tone='success' ariaLabel='Paso completado' /> : null}
          </Stack>
          <Typography variant='caption' color='text.secondary'>
            {step.description}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {step.metadata}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}

const NexaQuestionBubble = ({ question }: { question: string }) => {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', minInlineSize: 0, ...messageMotionSx }} data-capture='nexa-knowledge-question-bubble'>
      <Box
        sx={{
          maxInlineSize: { xs: '100%', md: '78%' },
          minInlineSize: 0,
          px: 4,
          py: 3,
          borderRadius: `${theme.shape.customBorderRadius.xl}px ${theme.shape.customBorderRadius.xl}px ${theme.shape.customBorderRadius.xs}px ${theme.shape.customBorderRadius.xl}px`,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.primary.main, 0.06),
          boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.05)}`
        }}
      >
        <Typography variant='body2' sx={{ overflowWrap: 'anywhere' }}>
          {question}
        </Typography>
      </Box>
    </Box>
  )
}

const NexaAnswerBubble = ({
  question,
  title,
  assistantName = 'Nexa',
  modeLabel,
  thinkingLabel,
  answerIntro,
  answerSteps,
  sourcesLabel,
  sources,
  warningTitle,
  warningBody,
  warningAction,
  responseActions,
  isThinking
}: Pick<
  NexaKnowledgeAnswerSurfaceProps,
  | 'answerIntro'
  | 'answerSteps'
  | 'sourcesLabel'
  | 'sources'
  | 'warningTitle'
  | 'warningBody'
  | 'warningAction'
  | 'responseActions'
  | 'isThinking'
> & {
  question?: string
  title: string
  assistantName?: string
  modeLabel: string
  thinkingLabel: string
}) => {
  const theme = useTheme()
  const isConversation = Boolean(question)

  return (
    <Box
      sx={{ minInlineSize: 0, ...messageMotionSx, animationDelay: '0.08s' }}
      data-capture='nexa-knowledge-answer-bubble'
      aria-busy={isThinking ? true : undefined}
    >
      <Box
        sx={{
          minInlineSize: 0,
          border: `1px solid ${isThinking ? alpha(theme.palette.primary.main, 0.32) : theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          backgroundColor: theme.palette.background.paper,
          boxShadow: isThinking
            ? `0 18px 42px ${alpha(theme.palette.primary.main, 0.1)}`
            : `0 12px 34px ${alpha(theme.palette.common.black, 0.06)}`,
          overflow: 'hidden',
          transition: theme.transitions.create(['border-color', 'box-shadow'], {
            duration: theme.transitions.duration.short
          })
        }}
      >
        {!isConversation ? (
          <>
            <Box sx={sectionHeaderSx}>
              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap sx={{ minInlineSize: 0 }}>
                <Typography variant='h5'>{title}</Typography>
                {isThinking ? (
                  <Stack direction='row' spacing={1.5} alignItems='center' role='status' aria-live='polite'>
                    <GreenhouseThinkingBeat kind='nexa' variant='inline' />
                    <Typography variant='caption' color='text.secondary'>
                      {thinkingLabel}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
              <GreenhouseChip size='small' variant='label' tone='success' label={modeLabel} />
            </Box>
            <Divider />
          </>
        ) : null}

        <Stack spacing={4} sx={{ p: { xs: 4, md: 5 }, pt: isConversation ? { xs: 4, md: 5 } : undefined }}>
          {question ? <NexaQuestionBubble question={question} /> : null}

          {question ? (
            <Stack direction='row' spacing={2} alignItems='center' data-capture='nexa-knowledge-assistant-identity'>
              <NexaSenderMark size={30} />
              <Stack spacing={0}>
                <Typography variant='subtitle2'>{assistantName}</Typography>
                {isThinking ? (
                  <Stack direction='row' spacing={1.5} alignItems='center' role='status' aria-live='polite'>
                    <GreenhouseThinkingBeat kind='nexa' variant='inline' />
                    <Typography variant='caption' color='text.secondary'>
                      {thinkingLabel}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            </Stack>
          ) : null}

          <Typography variant='body2'>{answerIntro}</Typography>

          <Stack spacing={2}>
            {answerSteps.map((step, index) => (
              <Stack key={step} direction='row' spacing={3} alignItems='flex-start'>
                <Box
                  sx={{
                    inlineSize: 22,
                    blockSize: 22,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    color: theme.palette.success.main,
                    border: `1px solid ${theme.palette.success.main}`,
                    flex: '0 0 auto'
                  }}
                >
                  <Typography variant='caption' sx={{ color: 'inherit', fontWeight: 600 }}>
                    {index + 1}
                  </Typography>
                </Box>
                <Typography variant='body2'>{step}</Typography>
              </Stack>
            ))}
          </Stack>

          <Alert
            severity='warning'
            action={warningAction}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'auto minmax(0, 1fr)', sm: 'auto minmax(0, 1fr) auto' },
              columnGap: 3,
              rowGap: 2,
              alignItems: { xs: 'flex-start', sm: 'center' },
              '& .MuiAlert-icon': {
                gridColumn: '1',
                gridRow: { xs: '1 / span 2', sm: '1' },
                mr: 0,
                p: 0
              },
              '& .MuiAlert-message': {
                gridColumn: '2',
                gridRow: '1',
                minInlineSize: 0,
                inlineSize: '100%',
                p: 0
              },
              '& .MuiAlert-action': {
                gridColumn: { xs: '2', sm: '3' },
                gridRow: { xs: '2', sm: '1' },
                pt: 0,
                pl: 0,
                ml: 0,
                alignSelf: { xs: 'stretch', sm: 'center' },
                '& .MuiButtonBase-root': {
                  inlineSize: { xs: '100%', sm: 'auto' }
                }
              }
            }}
          >
            <Typography variant='h6'>{warningTitle}</Typography>
            <Typography variant='body2'>{warningBody}</Typography>
          </Alert>

          <Stack spacing={2}>
            <Typography variant='h6'>
              {sourcesLabel} ({sources.length})
            </Typography>
            <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap>
              {sources.map(source => (
                <GreenhouseChip
                  key={source.id}
                  size='medium'
                  variant='outlined'
                  tone='primary'
                  iconClassName='tabler-file-text'
                  label={source.title.replace('Manual: ', '').replace('Glosario: ', '')}
                />
              ))}
            </Stack>
          </Stack>

          {responseActions}
        </Stack>
      </Box>
    </Box>
  )
}

const NexaKnowledgeAnswerSurface = <TMode extends string = string, TTab extends string = string>({
  variant,
  kind,
  question,
  conversationStarted = true,
  draft,
  onDraftChange,
  onSubmit,
  isThinking = false,
  commandPlaceholder,
  followUpPlaceholder,
  sendLabel,
  mode,
  modeOptions,
  onModeChange,
  modeHelper,
  modeSelectorAriaLabel,
  traceSteps,
  responseTitle,
  assistantName,
  responseThinkingLabel,
  responseModeLabel,
  answerIntro,
  answerSteps,
  sourcesLabel,
  sources,
  warningTitle,
  warningBody,
  warningAction,
  responseActions,
  proofTitle,
  proofTab,
  proofTabs,
  onProofTabChange,
  proofTabsAriaLabel,
  proofContent
}: NexaKnowledgeAnswerSurfaceProps<TMode, TTab>) => {
  const theme = useTheme()
  const kindConfig = resolveNexaKnowledgeAnswerSurfaceKind(kind)
  const variantConfig = resolveNexaKnowledgeAnswerSurfaceVariant(variant, kind)
  const canSubmit = draft.trim().length > 0

  const submitAction = (
    <NexaComposerActionButton
      variant='send'
      icon='search'
      aria-label={sendLabel}
      onClick={onSubmit}
      disabled={!canSubmit}
    />
  )

  return (
    <Box
      role='region'
      aria-label={kindConfig.ariaLabel}
      aria-busy={isThinking ? true : undefined}
      data-state={conversationStarted ? (isThinking ? 'refining' : 'conversation') : 'idle'}
      data-capture='nexa-knowledge-answer-surface'
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.md}px`,
        backgroundColor: theme.palette.background.paper,
        boxShadow: isThinking ? `0 14px 38px ${alpha(theme.palette.primary.main, 0.08)}` : 'none',
        overflow: 'hidden',
        inlineSize: '100%',
        minInlineSize: 0,
        transition: theme.transitions.create('box-shadow', { duration: theme.transitions.duration.short })
      }}
    >
      {!conversationStarted ? (
        <Stack spacing={3} sx={{ p: { xs: 4, md: 5 } }} data-capture='nexa-knowledge-top-composer'>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Box sx={{ flex: '1 1 auto', minInlineSize: 0 }}>
              <NexaComposer kind='knowledgeAsk'>
                <NexaComposerInput
                  kind='knowledgeAsk'
                  fullWidth
                  value={draft}
                  placeholder={commandPlaceholder}
                  onChange={event => onDraftChange(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      onSubmit()
                    }
                  }}
                  inputProps={{ 'aria-label': commandPlaceholder }}
                  actionAdornment={submitAction}
                />
              </NexaComposer>
            </Box>
            <ToggleButtonGroup
              exclusive
              value={mode}
              onChange={(_, nextMode: TMode | null) => {
                if (nextMode) onModeChange(nextMode)
              }}
              aria-label={modeSelectorAriaLabel}
              size='small'
              sx={{
                display: 'grid',
                gridTemplateColumns: `repeat(${modeOptions.length}, minmax(0, 1fr))`,
                inlineSize: { xs: '100%', md: 'auto' },
                minInlineSize: 0,
                '& .MuiToggleButton-root': {
                  minInlineSize: { xs: 0, md: 92 },
                  borderRadius: `${theme.shape.customBorderRadius.sm}px`
                }
              }}
            >
              {modeOptions.map(option => (
                <ToggleButton key={option.value} value={option.value}>
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>

          <Stack direction='row' spacing={2} alignItems='center' role='status' aria-live='polite'>
            <GreenhouseStatusDot tone='success' ariaLabel='Estado de respuesta de Nexa' />
            <Typography variant='caption' color='text.secondary'>
              {modeHelper}
            </Typography>
          </Stack>
        </Stack>
      ) : null}

      {variantConfig.showTrace && !conversationStarted ? (
        <>
          <Divider />
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minInlineSize: 0 }} data-capture='nexa-knowledge-trace-steps'>
            {traceSteps.map((step, index) => (
              <TraceStepCard key={step.id} step={step} index={index} isLast={index === traceSteps.length - 1} />
            ))}
          </Box>
        </>
      ) : null}

      {!conversationStarted ? <Divider /> : null}

      <Box
        sx={{
          p: { xs: 4, md: 5 },
          display: 'grid',
          minInlineSize: 0,
          gridTemplateColumns:
            variantConfig.proofPlacement === 'sidecar'
              ? { xs: '1fr', xl: 'minmax(0, 0.92fr) minmax(420px, 1.08fr)' }
              : '1fr',
          gap: 5,
          alignItems: 'start',
          backgroundColor: alpha(theme.palette.primary.main, 0.015)
        }}
      >
        <Stack spacing={4} data-capture='nexa-knowledge-conversation-lane'>
          <Box>
            <NexaAnswerBubble
              question={conversationStarted ? question : undefined}
              title={responseTitle}
              assistantName={assistantName}
              modeLabel={responseModeLabel}
              thinkingLabel={responseThinkingLabel}
              answerIntro={answerIntro}
              answerSteps={answerSteps}
              sourcesLabel={sourcesLabel}
              sources={sources}
              warningTitle={warningTitle}
              warningBody={warningBody}
              warningAction={warningAction}
              responseActions={responseActions}
              isThinking={isThinking}
            />
          </Box>

          {conversationStarted ? (
            <Box data-capture='nexa-knowledge-follow-up-composer' sx={{ pl: { xs: 0, md: 11 } }}>
              <NexaComposer kind='knowledgeAsk'>
                <NexaComposerInput
                  kind='knowledgeAsk'
                  fullWidth
                  value={draft}
                  placeholder={followUpPlaceholder}
                  onChange={event => onDraftChange(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      onSubmit()
                    }
                  }}
                  inputProps={{ 'aria-label': followUpPlaceholder }}
                  actionAdornment={submitAction}
                />
              </NexaComposer>
            </Box>
          ) : null}
        </Stack>

        <Box
          data-capture='nexa-knowledge-proof-panel'
          sx={{
            minInlineSize: 0,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            backgroundColor: theme.palette.background.paper,
            boxShadow: `0 12px 34px ${alpha(theme.palette.common.black, 0.05)}`,
            overflow: 'hidden'
          }}
        >
          <Box sx={sectionHeaderSx}>
            <Typography variant='h5'>{proofTitle}</Typography>
            <Tabs
              value={proofTab}
              onChange={(_, value: TTab) => onProofTabChange(value)}
              aria-label={proofTabsAriaLabel}
              variant='scrollable'
              allowScrollButtonsMobile
              sx={{ minBlockSize: 36, '& .MuiTab-root': { minBlockSize: 36, minInlineSize: 72 } }}
            >
              {proofTabs.map(tab => (
                <Tab key={tab.value} value={tab.value} label={tab.label} />
              ))}
            </Tabs>
          </Box>
          <Divider />
          <Box sx={{ px: { xs: 4, md: 5 }, py: 2 }}>{proofContent}</Box>
        </Box>
      </Box>
    </Box>
  )
}

export default NexaKnowledgeAnswerSurface
