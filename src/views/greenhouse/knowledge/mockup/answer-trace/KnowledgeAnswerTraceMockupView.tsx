'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha, useTheme, type Theme } from '@mui/material/styles'

import CustomTextField from '@core/components/mui/TextField'

import {
  GreenhouseBreadcrumbs,
  GreenhouseButton,
  GreenhouseChip,
  NexaKnowledgeAnswerSurface,
  GreenhouseStatusDot,
} from '@/components/greenhouse/primitives'
import { GH_KNOWLEDGE_COPY } from '@/lib/copy/knowledge'

import {
  answerSteps,
  contextHooks,
  evalRows,
  learningPaths,
  manualSections,
  packetRows,
  sourceExcerpts,
  traceSteps,
  type AnswerMode,
  type ProofTab,
  type StatusTone
} from './data'

const toneToChipTone = (tone?: StatusTone) => {
  if (tone === 'default' || !tone) return 'default'
  if (tone === 'primary') return 'primary'

  return tone
}

const panelSx = (theme: Theme) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: `${theme.shape.customBorderRadius.md}px`,
  boxShadow: 'none',
  inlineSize: '100%',
  minInlineSize: 0,
  overflow: 'hidden'
})

const sectionHeaderSx = {
  px: { xs: 4, md: 5 },
  py: 3,
  minBlockSize: 56,
  display: 'flex',
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  justifyContent: 'space-between',
  gap: 3,
  '& > *': { minInlineSize: 0 }
}

const SourceCard = ({ source }: { source: (typeof sourceExcerpts)[number] }) => {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.4fr 0.9fr' }, gap: 4, py: 4 }}>
      <Stack spacing={3}>
        <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
          <Box
            sx={{
              inlineSize: 28,
              blockSize: 28,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              display: 'grid',
              placeItems: 'center',
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.08)
            }}
          >
            <i className='tabler-file-text' aria-hidden='true' />
          </Box>
          <Typography variant='h6'>{source.title}</Typography>
          <GreenhouseChip size='small' variant='label' tone='primary' label={source.version} />
          <GreenhouseChip size='small' variant='label' tone='success' label={source.freshness} />
        </Stack>
        <Typography variant='caption' color='text.secondary'>
          Ruta: {source.route}
        </Typography>
        <Box
          sx={{
            borderInlineStart: `3px solid ${theme.palette.primary.main}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            px: 4,
            py: 3
          }}
        >
          <Typography variant='body2'>{source.quote}</Typography>
        </Box>
        <Typography variant='caption' color='text.secondary'>
          Ancla de cita: {source.anchor}
        </Typography>
      </Stack>

      <Stack spacing={2}>
        <Typography variant='caption' color='text.secondary'>
          Owner
        </Typography>
        <Typography variant='body2'>{source.owner}</Typography>
        <Typography variant='caption' color='text.secondary'>
          Última revisión
        </Typography>
        <Typography variant='body2'>{source.reviewedAt}</Typography>
        <Typography variant='caption' color='text.secondary'>
          Seleccionado porque
        </Typography>
        <Stack direction='row' spacing={2} alignItems='center'>
          <GreenhouseStatusDot tone='success' ariaLabel={GH_KNOWLEDGE_COPY.aria.alignedSource} />
          <Typography variant='body2' color='success.main'>
            {source.whySelected}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  )
}

const PacketRows = () => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, columnGap: 6 }}>
    {packetRows.map(row => (
      <Stack
        key={row.label}
        direction='row'
        spacing={4}
        alignItems='flex-start'
        justifyContent='space-between'
        sx={{ py: 2, borderBlockEnd: theme => `1px solid ${theme.palette.divider}` }}
      >
        <Typography variant='caption' color='text.secondary'>
          {row.label}
        </Typography>
        {row.tone ? (
          <GreenhouseChip size='small' variant='label' tone={toneToChipTone(row.tone)} label={row.value} />
        ) : (
          <Typography variant='body2' sx={{ textAlign: 'end', overflowWrap: 'anywhere' }}>
            {row.value}
          </Typography>
        )}
      </Stack>
    ))}
  </Box>
)

const EvalsPanel = () => (
  <Stack spacing={0}>
    {evalRows.map(row => (
      <Stack
        key={row.label}
        direction='row'
        spacing={4}
        alignItems='center'
        justifyContent='space-between'
        sx={{ py: 3, borderBlockEnd: theme => `1px solid ${theme.palette.divider}` }}
      >
        <Stack spacing={1}>
          <Typography variant='h6'>{row.label}</Typography>
          <Typography variant='caption' color='text.secondary'>
            {row.value}
          </Typography>
        </Stack>
        <GreenhouseChip size='small' variant='label' tone={toneToChipTone(row.tone)} label={row.status} />
      </Stack>
    ))}
  </Stack>
)

const TraceProofPanel = () => {
  const theme = useTheme()

  return (
    <Stack spacing={0} data-capture='knowledge-proof-trace-steps'>
      {traceSteps.map((step, index) => (
        <Stack
          key={step.id}
          direction='row'
          spacing={3}
          alignItems='flex-start'
          sx={{
            py: 3,
            borderBlockEnd: index === traceSteps.length - 1 ? 0 : `1px solid ${theme.palette.divider}`
          }}
        >
          <Box
            sx={{
              inlineSize: 28,
              blockSize: 28,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              flex: '0 0 auto',
              color: step.state === 'pending' ? theme.palette.text.secondary : theme.palette.primary.contrastText,
              backgroundColor:
                step.state === 'complete'
                  ? theme.palette.success.main
                  : step.state === 'active'
                    ? theme.palette.primary.main
                    : theme.palette.action.selected
            }}
          >
            <Typography variant='caption' sx={{ color: 'inherit', fontWeight: 600 }}>
              {index + 1}
            </Typography>
          </Box>

          <Stack spacing={1} sx={{ minInlineSize: 0 }}>
            <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
              <Typography variant='h6'>{step.label}</Typography>
              {step.state === 'active' ? <GreenhouseChip size='small' variant='label' tone='primary' label='Activo' /> : null}
              {step.state === 'complete' ? <GreenhouseStatusDot tone='success' ariaLabel={GH_KNOWLEDGE_COPY.aria.completedStep} /> : null}
            </Stack>
            <Typography variant='caption' color='text.secondary'>
              {step.description}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {step.metadata}
            </Typography>
          </Stack>
        </Stack>
      ))}
    </Stack>
  )
}

const LearningPathRail = () => {
  const theme = useTheme()

  return (
    <Box sx={panelSx(theme)} data-capture='knowledge-learning-paths'>
      <Box sx={sectionHeaderSx}>
        <Typography variant='h5'>Rutas de aprendizaje</Typography>
      </Box>
      <Divider />
      <Stack spacing={0}>
        {learningPaths.map(path => (
          <Box
            key={path.label}
            sx={{
              px: 4,
              py: 3,
              borderInlineStart: path.active ? `3px solid ${theme.palette.primary.main}` : '3px solid transparent',
              backgroundColor: path.active ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
              borderBlockEnd: `1px solid ${theme.palette.divider}`
            }}
          >
            <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={3}>
              <Stack spacing={1}>
                <Typography variant='h6'>{path.label}</Typography>
                <Typography variant='caption' color='text.secondary'>
                  {path.docs}
                </Typography>
              </Stack>
              <Typography variant='caption' color='text.secondary'>
                {path.progress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant='determinate'
              value={path.progress}
              aria-label={`Progreso de ${path.label}`}
              sx={{
                mt: 2,
                blockSize: 4,
                borderRadius: '9999px',
                backgroundColor: alpha(theme.palette.primary.main, 0.12)
              }}
            />
          </Box>
        ))}
      </Stack>
      <Box sx={{ p: 4 }}>
        <GreenhouseButton variant='text' size='small' trailingIconClassName='tabler-arrow-right' fullWidth>
          Ver todas las rutas
        </GreenhouseButton>
      </Box>
    </Box>
  )
}

const ManualReader = () => {
  const theme = useTheme()

  return (
    <Box sx={panelSx(theme)} data-capture='knowledge-manual-reader'>
      <Box sx={sectionHeaderSx}>
        <Stack direction='row' alignItems='center' spacing={2} flexWrap='wrap' useFlexGap>
          <Typography variant='h5'>{GH_KNOWLEDGE_COPY.manualTitle}</Typography>
          <GreenhouseChip size='small' variant='label' tone='default' label='v4.3' />
          <GreenhouseChip size='small' variant='label' tone='success' label='Actual' />
          <GreenhouseChip size='small' variant='label' tone='success' label='agent_allowed' />
        </Stack>
        <Tooltip title={GH_KNOWLEDGE_COPY.openDocument}>
          <IconButton size='small' aria-label={GH_KNOWLEDGE_COPY.openDocument}>
            <i className='tabler-external-link' />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />

      <Stack
        direction='row'
        spacing={2}
        sx={{
          px: 5,
          py: 2,
          overflowX: 'auto',
          '& > *': { flex: '0 0 auto' }
        }}
      >
        {manualSections.map(section => (
          <GreenhouseButton
            key={section.id}
            size='small'
            variant={section.active ? 'solid' : 'text'}
            tone={section.active ? 'primary' : 'secondary'}
          >
            {section.label}
          </GreenhouseButton>
        ))}
      </Stack>
      <Divider />

      <Box sx={{ p: { xs: 4, md: 5 }, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.45fr 0.75fr' }, gap: 5 }}>
        <Stack spacing={4}>
          <Stack spacing={2}>
            <Typography variant='h5'>1. Propósito</Typography>
            <Typography variant='body2' color='text.secondary'>
              Mi Desempeño te permite revisar tus objetivos, ver feedback y dar seguimiento a tu crecimiento profesional
              dentro de Greenhouse.
            </Typography>
          </Stack>

          <Alert severity='success' icon={<i className='tabler-bulb' aria-hidden='true' />}>
            Consejo: usa Mi Desempeño para alinear prioridades con tu líder y registrar avances de impacto.
          </Alert>

          <Stack spacing={2}>
            <Typography variant='h5'>2. Acceder a Mi Desempeño</Typography>
            <Typography variant='body2' color='text.secondary'>
              Desde Home, haz clic en el acceso rápido Mi Desempeño o ingresa desde el menú principal.
            </Typography>
          </Stack>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '0.8fr 1fr' }, gap: 3 }}>
            <Box
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                overflow: 'hidden'
              }}
            >
              {['Home', 'Mi Desempeño', 'Mis objetivos', 'Feedback'].map((item, index) => (
                <Stack
                  key={item}
                  direction='row'
                  spacing={2}
                  alignItems='center'
                  sx={{
                    px: 3,
                    py: 2,
                    backgroundColor: index === 1 ? alpha(theme.palette.primary.main, 0.08) : 'transparent'
                  }}
                >
                  <i className={index === 1 ? 'tabler-chart-dots-3' : 'tabler-circle'} aria-hidden='true' />
                  <Typography variant='caption'>{item}</Typography>
                </Stack>
              ))}
            </Box>

            <Box
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                p: 3
              }}
            >
              <Stack direction='row' justifyContent='space-between' alignItems='center'>
                <Typography variant='h6'>Mis objetivos</Typography>
                <GreenhouseChip size='small' variant='label' tone='info' label='60%' />
              </Stack>
              <Stack spacing={2} sx={{ mt: 3 }}>
                {[72, 54, 38].map(value => (
                  <LinearProgress key={value} variant='determinate' value={value} aria-label={`Objetivo ${value}%`} />
                ))}
              </Stack>
            </Box>
          </Box>
        </Stack>

        <Stack spacing={4}>
          <Box
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              p: 4
            }}
          >
            <Typography variant='h6'>Contextual help hooks</Typography>
            <Stack spacing={3} sx={{ mt: 3 }}>
              {contextHooks.map(hook => (
                <Stack key={hook.title} direction='row' spacing={3}>
                  <Box
                    sx={{
                      inlineSize: 34,
                      blockSize: 34,
                      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main
                    }}
                  >
                    <i className={hook.icon} aria-hidden='true' />
                  </Box>
                  <Stack spacing={1}>
                    <Typography variant='h6'>{hook.title}</Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {hook.body}
                    </Typography>
                  </Stack>
                </Stack>
              ))}
            </Stack>
            <GreenhouseButton variant='outlined' size='small' fullWidth sx={{ mt: 4 }}>
              Ver todos los hooks
            </GreenhouseButton>
          </Box>

          <Box
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: `${theme.shape.customBorderRadius.sm}px`,
              p: 4
            }}
          >
            <Typography variant='h6'>Salud del documento</Typography>
            <Stack spacing={2} sx={{ mt: 3 }}>
              {['Encabezados estables', 'Sin secretos / PII', 'Política agentic permitida', 'Última revisión: 07 may 2025'].map(
                item => (
                  <Stack key={item} direction='row' spacing={2} alignItems='center'>
                    <GreenhouseStatusDot tone='success' ariaLabel={GH_KNOWLEDGE_COPY.aria.documentHealthOk} />
                    <Typography variant='caption'>{item}</Typography>
                  </Stack>
                )
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  )
}

const KnowledgeAnswerTraceMockupView = () => {
  const theme = useTheme()
  const [proofTab, setProofTab] = useState<ProofTab>('sources')
  const [mode, setMode] = useState<AnswerMode>('human')
  const [questionDraft, setQuestionDraft] = useState('')
  const [selectedQuestion, setSelectedQuestion] = useState<string>(GH_KNOWLEDGE_COPY.selectedQuestion)
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [feedback, setFeedback] = useState('useful')
  const [copiedUri, setCopiedUri] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  const feedbackOptions = [
    { value: 'useful', icon: 'tabler-thumb-up', label: GH_KNOWLEDGE_COPY.feedbackUseful },
    { value: 'not-useful', icon: 'tabler-thumb-down', label: GH_KNOWLEDGE_COPY.feedbackNotUseful },
    { value: 'incorrect', icon: 'tabler-alert-triangle', label: GH_KNOWLEDGE_COPY.feedbackIncorrect }
  ] as const

  const submitNexaQuestion = () => {
    const nextQuestion = questionDraft.trim()

    if (!nextQuestion) return

    setSelectedQuestion(nextQuestion)
    setQuestionDraft('')
    setHasAskedQuestion(true)
    setProofTab('trace')

    setIsThinking(true)
    window.setTimeout(() => setIsThinking(false), 700)
  }

  const proofContent = useMemo(() => {
    if (proofTab === 'trace') return <TraceProofPanel />
    if (proofTab === 'packet') return <PacketRows />
    if (proofTab === 'evals') return <EvalsPanel />

    return (
      <Stack spacing={0} divider={<Divider />}>
        {sourceExcerpts.map(source => (
          <SourceCard key={source.id} source={source} />
        ))}
        <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 3 }}>
          <Typography variant='caption' color='text.secondary'>
            Ver más fuentes filtradas (1)
          </Typography>
          <GreenhouseChip size='small' variant='label' tone='success' label='agent_allowed' />
        </Stack>
      </Stack>
    )
  }, [proofTab])

  return (
    <Stack spacing={5} data-capture='knowledge-answer-trace-page'>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={4} alignItems={{ md: 'flex-start' }}>
        <Stack spacing={2}>
          <GreenhouseBreadcrumbs
            kind='pageHierarchy'
            items={[
              { label: GH_KNOWLEDGE_COPY.breadcrumbRoot, href: '/home' },
              { label: GH_KNOWLEDGE_COPY.breadcrumbCurrent }
            ]}
          />
          <Stack spacing={1}>
            <Typography variant='surfaceHeroTitle'>{GH_KNOWLEDGE_COPY.pageTitle}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {GH_KNOWLEDGE_COPY.pageSubtitle}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap>
          <GreenhouseButton variant='outlined' tone='secondary' leadingIconClassName='tabler-message' size='small'>
            {GH_KNOWLEDGE_COPY.sendFeedback}
          </GreenhouseButton>
          <GreenhouseButton variant='outlined' tone='secondary' leadingIconClassName='tabler-download' trailingIconClassName='tabler-chevron-down' size='small'>
            {GH_KNOWLEDGE_COPY.export}
          </GreenhouseButton>
        </Stack>
      </Stack>

      <NexaKnowledgeAnswerSurface<AnswerMode, ProofTab>
        kind='knowledgeAnswerTrace'
        question={selectedQuestion}
        conversationStarted={hasAskedQuestion}
        draft={questionDraft}
        onDraftChange={setQuestionDraft}
        onSubmit={submitNexaQuestion}
        isThinking={isThinking}
        commandPlaceholder={GH_KNOWLEDGE_COPY.commandPlaceholder}
        followUpPlaceholder={GH_KNOWLEDGE_COPY.followUpPlaceholder}
        sendLabel={GH_KNOWLEDGE_COPY.sendQuestion}
        mode={mode}
        modeOptions={[
          { value: 'human', label: GH_KNOWLEDGE_COPY.mode.human },
          { value: 'nexa', label: GH_KNOWLEDGE_COPY.mode.nexa },
          { value: 'mcp', label: GH_KNOWLEDGE_COPY.mode.mcp }
        ]}
        onModeChange={setMode}
        modeHelper={GH_KNOWLEDGE_COPY.currentModeHelper[mode]}
        modeSelectorAriaLabel={GH_KNOWLEDGE_COPY.aria.modeSelector}
        traceSteps={traceSteps}
        responseTitle={GH_KNOWLEDGE_COPY.responseTitle}
        assistantName={GH_KNOWLEDGE_COPY.assistantName}
        responseThinkingLabel={GH_KNOWLEDGE_COPY.responseThinkingLabel}
        responseModeLabel={`Modo ${GH_KNOWLEDGE_COPY.mode[mode]}`}
        answerIntro={
          <>
            {GH_KNOWLEDGE_COPY.answer} Las métricas ICO son{' '}
            <Box component='strong' sx={{ fontWeight: 600 }}>
              Impacto, Colaboración y Orientación al Cliente
            </Box>
            , cada una con su definición y escala de 0 a 100.
          </>
        }
        answerSteps={answerSteps}
        sourcesLabel={GH_KNOWLEDGE_COPY.sourcesLabel}
        sources={sourceExcerpts}
        warningTitle={GH_KNOWLEDGE_COPY.operationalDataWarning}
        warningBody={GH_KNOWLEDGE_COPY.operationalDataWarningBody}
        warningAction={
          <GreenhouseButton variant='outlined' tone='secondary' size='small'>
            {GH_KNOWLEDGE_COPY.consultData}
          </GreenhouseButton>
        }
        responseActions={
          <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap>
            <GreenhouseButton variant='outlined' leadingIconClassName='tabler-external-link'>
              {GH_KNOWLEDGE_COPY.openManual}
            </GreenhouseButton>
            <GreenhouseButton variant='outlined' tone='secondary' leadingIconClassName='tabler-bookmark'>
              {GH_KNOWLEDGE_COPY.saveGuide}
            </GreenhouseButton>
            <GreenhouseButton variant='outlined' tone='secondary' leadingIconClassName='tabler-flag'>
              {GH_KNOWLEDGE_COPY.reportGap}
            </GreenhouseButton>
          </Stack>
        }
        proofTitle={GH_KNOWLEDGE_COPY.proofTitle}
        proofTab={proofTab}
        proofTabs={[
          { value: 'sources', label: GH_KNOWLEDGE_COPY.evidenceTabs.sources },
          { value: 'trace', label: GH_KNOWLEDGE_COPY.evidenceTabs.trace },
          { value: 'packet', label: GH_KNOWLEDGE_COPY.evidenceTabs.packet },
          { value: 'evals', label: GH_KNOWLEDGE_COPY.evidenceTabs.evals }
        ]}
        onProofTabChange={setProofTab}
        proofTabsAriaLabel={GH_KNOWLEDGE_COPY.aria.proofTabs}
        proofContent={proofContent}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '280px minmax(0, 1fr)' },
          gap: 5,
          alignItems: 'start',
          minInlineSize: 0,
          '& > *': { minInlineSize: 0 }
        }}
      >
        <LearningPathRail />
        <Stack spacing={5}>
          <ManualReader />

          <Box sx={panelSx(theme)} data-capture='knowledge-agent-consumption'>
            <Box sx={sectionHeaderSx}>
              <Stack spacing={1}>
                <Typography variant='h5'>{GH_KNOWLEDGE_COPY.agentTitle} (Nexa y MCP)</Typography>
                <Typography variant='caption' color='text.secondary'>
                  Esta respuesta es consumible por agentes bajo política agent_allowed.
                </Typography>
              </Stack>
              <GreenhouseChip size='small' variant='label' tone='success' label='agent_allowed' />
            </Box>
            <Divider />
            <Box
              sx={{
                p: { xs: 4, md: 5 },
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 4
              }}
            >
              <Box
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                  p: 4
                }}
              >
                <Typography variant='h6'>MCP URI</Typography>
                <Stack direction='row' spacing={2} alignItems='center' sx={{ mt: 3 }}>
                  <Typography variant='body2' color='primary.main' sx={{ overflowWrap: 'anywhere' }}>
                    greenhouse://knowledge/document/mi-desempeno
                  </Typography>
                  <Tooltip title={copiedUri ? GH_KNOWLEDGE_COPY.copiedUri : GH_KNOWLEDGE_COPY.copyUri}>
                    <IconButton
                      size='small'
                      aria-label={copiedUri ? GH_KNOWLEDGE_COPY.copiedUri : GH_KNOWLEDGE_COPY.copyUri}
                      color={copiedUri ? 'success' : 'default'}
                      onClick={() => {
                        setCopiedUri(true)
                        window.setTimeout(() => setCopiedUri(false), 1600)
                      }}
                    >
                      <i className={copiedUri ? 'tabler-check' : 'tabler-copy'} />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Typography variant='caption' color='text.secondary'>
                  Formato: knowledge_document
                </Typography>
              </Box>

              <Box
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                  p: 4
                }}
              >
                <Stack direction='row' spacing={3} alignItems='center' justifyContent='space-between'>
                  <Stack direction='row' spacing={2} alignItems='center'>
                    <i className='tabler-braces' aria-hidden='true' />
                    <Typography variant='h6'>KnowledgeRetrievalPacket</Typography>
                  </Stack>
                  <GreenhouseButton variant='text' size='small' trailingIconClassName='tabler-download'>
                    {GH_KNOWLEDGE_COPY.viewFullPacket}
                  </GreenhouseButton>
                </Stack>
                <Typography variant='caption' color='text.secondary'>
                  Formato: v1.0 · 3 chunks incluidos · 1 filtrado.
                </Typography>
              </Box>
            </Box>
            <Divider />
            <Stack direction='row' spacing={2} alignItems='center' sx={{ px: { xs: 4, md: 5 }, py: 3 }}>
              <i className='tabler-shield-check' aria-hidden='true' />
              <Typography variant='caption' color='text.secondary'>
                {GH_KNOWLEDGE_COPY.agentDisclosure}
              </Typography>
            </Stack>
          </Box>

          <Box
            sx={{
              ...panelSx(theme),
              inlineSize: '100%',
              maxInlineSize: { xs: 'calc(100vw - 48px)', md: 'none' },
              minInlineSize: 0,
              overflow: 'hidden'
            }}
            data-capture='knowledge-feedback'
          >
            <Box sx={{ pl: { xs: 4, md: 5 }, pr: { xs: 4, md: 16 }, py: 4 }}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={3}
                alignItems={{ xs: 'stretch', lg: 'center' }}
                justifyContent='space-between'
              >
                <Stack direction='row' spacing={3} alignItems='flex-start' sx={{ minInlineSize: 0 }}>
                  <Box
                    sx={{
                      inlineSize: 36,
                      blockSize: 36,
                      borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                      display: 'grid',
                      placeItems: 'center',
                      flex: '0 0 auto',
                      color: theme.palette.primary.main,
                      backgroundColor: alpha(theme.palette.primary.main, 0.08)
                    }}
                  >
                    <i className='tabler-message-report' aria-hidden='true' />
                  </Box>
                  <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
                    <Typography variant='h5'>{GH_KNOWLEDGE_COPY.feedbackQuestion}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {GH_KNOWLEDGE_COPY.feedbackIntro}
                    </Typography>
                  </Stack>
                </Stack>

                {feedbackSubmitted ? (
                  <GreenhouseChip
                    size='small'
                    variant='label'
                    tone='success'
                    label={GH_KNOWLEDGE_COPY.feedbackRegisteredShort}
                    iconClassName='tabler-check'
                  />
                ) : null}
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(300px, 0.82fr) minmax(220px, 0.7fr) auto 56px' },
                  gap: 3,
                  alignItems: 'center',
                  mt: 4
                }}
              >
                <ToggleButtonGroup
                  exclusive
                  value={feedback}
                  onChange={(_, value: string | null) => {
                    if (value) {
                      setFeedback(value)
                      setFeedbackSubmitted(false)
                    }
                  }}
                  aria-label={GH_KNOWLEDGE_COPY.aria.feedbackSelector}
                  size='small'
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                    gap: 2,
                    inlineSize: '100%',

                    '& .MuiToggleButtonGroup-grouped': {
                      m: 0,
                      minBlockSize: 44,
                      justifyContent: 'flex-start',
                      gap: 2,
                      px: 3,
                      py: 2,
                      color: theme.palette.text.secondary,
                      border: `1px solid ${theme.palette.divider} !important`,
                      borderRadius: `${theme.shape.customBorderRadius.sm}px !important`,
                      textTransform: 'none',
                      transition: theme.transitions.create(['background-color', 'border-color', 'color'], {
                        duration: theme.transitions.duration.shortest
                      }),

                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.04)
                      },

                      '&.Mui-selected': {
                        color: theme.palette.primary.main,
                        borderColor: `${alpha(theme.palette.primary.main, 0.34)} !important`,
                        backgroundColor: alpha(theme.palette.primary.main, 0.08),

                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.12)
                        }
                      },

                      '&.Mui-focusVisible': {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: 2
                      }
                    }
                  }}
                >
                  {feedbackOptions.map(option => (
                    <ToggleButton key={option.value} value={option.value}>
                      <i className={option.icon} aria-hidden='true' />
                      <Typography variant='button' component='span' sx={{ color: 'inherit', whiteSpace: 'nowrap' }}>
                        {option.label}
                      </Typography>
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>

                <CustomTextField
                  fullWidth
                  size='small'
                  placeholder={GH_KNOWLEDGE_COPY.feedbackPlaceholder}
                  aria-label={GH_KNOWLEDGE_COPY.feedbackCommentLabel}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position='start'>
                        <i className='tabler-pencil' aria-hidden='true' />
                      </InputAdornment>
                    )
                  }}
                />
                <GreenhouseButton
                  kind='primaryAction'
                  size='small'
                  reserveInlineSize={148}
                  leadingIconClassName={feedbackSubmitted ? 'tabler-check' : undefined}
                  onClick={() => setFeedbackSubmitted(true)}
                  sx={{
                    justifySelf: { xs: 'stretch', md: 'end' }
                  }}
                >
                  {GH_KNOWLEDGE_COPY.feedbackSubmit}
                </GreenhouseButton>
              </Box>
              {feedbackSubmitted ? (
                <Alert
                  severity='success'
                  variant='outlined'
                  sx={{
                    mt: 3,
                    py: 1,
                    alignItems: 'center',
                    borderColor: alpha(theme.palette.success.main, 0.32),
                    borderRadius: `${theme.shape.customBorderRadius.sm}px`
                  }}
                  role='status'
                  data-capture='knowledge-feedback-success'
                >
                  {GH_KNOWLEDGE_COPY.feedbackRegistered}
                </Alert>
              ) : null}
            </Box>
          </Box>
        </Stack>
      </Box>
    </Stack>
  )
}

export default KnowledgeAnswerTraceMockupView
