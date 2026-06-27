'use client'

// TASK-1252 — AI Visibility Report Artifact · mockup harness (docs-only).
// Thin harness over the REAL feature-local artifact: switches variant + state and
// feeds `AiVisibilityReportArtifact` with a model derived from the real contract
// fixtures (GraderReport → public/client DTOs via the real builders). No invented
// data shape — the render is exercised against the canonical `ReportArtifactModel`.

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import Typography from '@mui/material/Typography'

import AiVisibilityReportArtifact from '@/components/growth/ai-visibility/report-artifact/web/AiVisibilityReportArtifact'
import AiVisibilityReportPrint from '@/components/growth/ai-visibility/report-artifact/print/AiVisibilityReportPrint'
import {
  modelFromClientReport,
  modelFromInternalReport,
  modelFromPublicReport,
  type ReportArtifactModel,
  type ReportArtifactVariant
} from '@/components/growth/ai-visibility/report-artifact/model'
import {
  SAMPLE_CLIENT_REPORT,
  SAMPLE_INTERNAL_REPORT,
  SAMPLE_PUBLIC_REPORT
} from '@/components/growth/ai-visibility/report-artifact/fixtures'
import {
  BLOCKING_STATES,
  HARNESS_COPY,
  MOCK_REPORT_HEADER,
  STATE_COPY,
  STATE_OPTIONS,
  VARIANT_OPTIONS,
  type ArtifactState
} from './mock-data'

const buildModel = (variant: ReportArtifactVariant, state: ArtifactState): ReportArtifactModel => {
  let model: ReportArtifactModel

  if (variant === 'clientPortal') model = modelFromClientReport(SAMPLE_CLIENT_REPORT)
  else if (variant === 'adminPreview') model = modelFromInternalReport(SAMPLE_INTERNAL_REPORT)
  else model = modelFromPublicReport(SAMPLE_PUBLIC_REPORT, variant)

  if (state === 'noTrend') {
    return { ...model, trend: { ...model.trend, status: 'sin_historico', overall: null } }
  }

  if (state === 'partial') {
    return { ...model, gate: { ...model.gate, status: 'partial' } }
  }

  return model
}

const ReportArtifactMockupView = () => {
  const [variant, setVariant] = useState<ReportArtifactVariant>('publicWeb')
  const [state, setState] = useState<ArtifactState>('ready')

  const model = useMemo(() => buildModel(variant, state), [variant, state])
  const isBlocking = BLOCKING_STATES.includes(state)

  return (
    <Stack spacing={6}>
      {/* Harness chrome — docs-only, not part of the artifact */}
      <Card variant='outlined' sx={{ borderStyle: 'dashed' }}>
        <CardContent>
          <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' spacing={4}>
            <Box>
              <Typography variant='overline' color='text.disabled'>
                {HARNESS_COPY.variantLabel}
              </Typography>
              <TabContext value={variant}>
                <TabList onChange={(_, value) => setVariant(value as ReportArtifactVariant)}>
                  {VARIANT_OPTIONS.map(option => (
                    <Tab
                      key={option.id}
                      value={option.id}
                      label={
                        <Stack direction='row' spacing={1} alignItems='center'>
                          <i className={option.icon} aria-hidden />
                          <span>{option.label}</span>
                        </Stack>
                      }
                    />
                  ))}
                </TabList>
              </TabContext>
              <Typography variant='caption' color='text.disabled' sx={{ mt: 1, display: 'block' }}>
                {HARNESS_COPY.sharedModelNote}
              </Typography>
            </Box>
            <Box>
              <Typography variant='overline' color='text.disabled' sx={{ display: 'block', mb: 1 }}>
                {HARNESS_COPY.stateLabel}
              </Typography>
              <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                {STATE_OPTIONS.map(option => (
                  <Chip
                    key={option.id}
                    size='small'
                    variant={state === option.id ? 'filled' : 'outlined'}
                    color={state === option.id ? 'primary' : 'secondary'}
                    label={option.label}
                    onClick={() => setState(option.id)}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {isBlocking ? (
        <Card variant='outlined'>
          <CardContent>
            <Stack spacing={1.5} alignItems='center' sx={{ py: 6 }}>
              <i className='tabler-info-circle' aria-hidden style={{ fontSize: '2rem', color: 'var(--mui-palette-text-secondary)' }} />
              <Typography variant='h5'>{STATE_COPY[state].title}</Typography>
              <Typography variant='body2' color='text.secondary' align='center' sx={{ maxWidth: 480 }}>
                {STATE_COPY[state].body}
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                El consumer (página pública / portal cliente) maneja este estado, no el artefacto.
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : variant === 'attachment' ? (
        <Card variant='outlined'>
          <CardContent sx={{ bgcolor: 'action.hover' }}>
            <AiVisibilityReportPrint model={model} header={MOCK_REPORT_HEADER} />
          </CardContent>
        </Card>
      ) : (
        <AiVisibilityReportArtifact model={model} header={MOCK_REPORT_HEADER} />
      )}
    </Stack>
  )
}

export default ReportArtifactMockupView
