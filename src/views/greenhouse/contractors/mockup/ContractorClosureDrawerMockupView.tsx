'use client'

// TASK-984 — Contractor Closure Drawer MOCKUP (visual reference for GVC + product
// design review). Renders the closure drawer content with typed mock data in its
// canonical states (sin bloqueadores / con bloqueadores / cerrado). Reference-only:
// the runtime is `ContractorClosureDrawer.tsx` (fetch-backed). Mockups are excluded
// from the route-reachability gate (TASK-982) and live under /mockup.

import { useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import CustomTextField from '@core/components/mui/TextField'

import { getMicrocopy } from '@/lib/copy'
import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { CONTRACTOR_CLOSURE_REASONS } from '@/lib/contractor-engagements'
import type {
  ContractorClosureBlockerCode,
  ContractorClosureReadinessResult
} from '@/lib/contractor-engagements'

const aria = getMicrocopy('es-CL').aria

type MockState = 'no_blockers' | 'with_blockers' | 'closed'

const MOCK_READINESS: Record<MockState, ContractorClosureReadinessResult> = {
  no_blockers: {
    ready: true,
    blockers: [],
    advisories: [
      {
        code: 'access_handoff_reminder',
        message:
          'Recuerda gestionar el access offboarding por separado: el cierre contractual no desactiva accesos.'
      }
    ],
    evaluatedAt: '2026-06-01T00:00:00.000Z'
  },
  with_blockers: {
    ready: false,
    blockers: [
      { code: 'open_work_submissions', message: 'Hay 2 envíos de trabajo sin resolver.', acknowledged: false },
      { code: 'open_payables', message: 'Hay 1 payable sin liquidar.', acknowledged: false }
    ],
    advisories: [
      {
        code: 'access_handoff_reminder',
        message:
          'Recuerda gestionar el access offboarding por separado: el cierre contractual no desactiva accesos.'
      }
    ],
    evaluatedAt: '2026-06-01T00:00:00.000Z'
  },
  closed: { ready: true, blockers: [], advisories: [], evaluatedAt: '2026-06-01T00:00:00.000Z' }
}

const SectionLabel = ({ text }: { text: string }) => (
  <Typography
    variant='caption'
    sx={{ color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', mb: 1 }}
  >
    {text}
  </Typography>
)

const ContractorClosureDrawerMockupView = () => {
  const theme = useTheme()

  const [mockState, setMockState] = useState<MockState>('with_blockers')
  const [acknowledged, setAcknowledged] = useState<Set<ContractorClosureBlockerCode>>(new Set())
  const [causal, setCausal] = useState('')
  const [reason, setReason] = useState('')

  const readiness = MOCK_READINESS[mockState]
  const alreadyClosed = mockState === 'closed'
  const allAck = readiness.blockers.every(b => acknowledged.has(b.code))

  const toggleAck = (code: ContractorClosureBlockerCode) =>
    setAcknowledged(prev => {
      const next = new Set(prev)

      if (next.has(code)) next.delete(code)
      else next.add(code)

      return next
    })

  return (
    <Box sx={{ p: 6 }}>
      <Stack spacing={4}>
        <Box>
          <Typography variant='h4' sx={{ fontWeight: 600 }}>
            Mockup — Cierre contractor (drawer)
          </Typography>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            Referencia visual para GVC + revisión de diseño. Estados canónicos del drawer.
          </Typography>
        </Box>

        <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap data-capture='state-toggle'>
          <Button data-capture-toggle='no_blockers' variant={mockState === 'no_blockers' ? 'contained' : 'tonal'} onClick={() => setMockState('no_blockers')}>
            Sin bloqueadores
          </Button>
          <Button data-capture-toggle='with_blockers' variant={mockState === 'with_blockers' ? 'contained' : 'tonal'} onClick={() => setMockState('with_blockers')}>
            Con bloqueadores
          </Button>
          <Button data-capture-toggle='closed' variant={mockState === 'closed' ? 'contained' : 'tonal'} onClick={() => setMockState('closed')}>
            Cerrado
          </Button>
        </Stack>
      </Stack>

      <Drawer
        anchor='right'
        open
        variant='persistent'
        slotProps={{ paper: { sx: { width: { xs: '100vw', sm: 520 } } } }}
      >
        <Box role='dialog' aria-labelledby='closure-mock-title' sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: { xs: 5, sm: 6 }, pb: 4 }}>
            <Stack direction='row' justifyContent='space-between' alignItems='flex-start' spacing={3}>
              <Stack spacing={1}>
                <Typography id='closure-mock-title' variant='h5' sx={{ fontWeight: 700 }}>
                  {C.closure.drawerTitle}
                </Typography>
                <Typography variant='body2' sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Camila Rivas
                </Typography>
                <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
                  <CustomChip round='true' size='small' variant='tonal' color='secondary' label='EO-CENG-DEMO' />
                  <CustomChip
                    round='true'
                    size='small'
                    variant='tonal'
                    color={alreadyClosed ? 'success' : 'warning'}
                    label={alreadyClosed ? C.lifecycle.state.ended : C.lifecycle.state.active}
                  />
                </Stack>
              </Stack>
              <IconButton aria-label={aria.closeDrawer}>
                <i className='tabler-x' />
              </IconButton>
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ p: { xs: 5, sm: 6 }, flex: 1, overflowY: 'auto' }} data-capture='drawer-body'>
            <Stack spacing={6}>
              <Alert severity='info' icon={<i className='tabler-info-circle' />}>
                {C.closure.notFiniquitoNote}
              </Alert>

              {alreadyClosed ? (
                <>
                  <Alert severity='success' icon={<i className='tabler-circle-check' />} role='status'>
                    {C.closure.closedNote}
                  </Alert>
                  <Box>
                    <SectionLabel text={C.closure.summaryLabel} />
                    <Stack spacing={1.5}>
                      {[
                        [C.closure.causalLabel, C.closure.causal.contract_completed],
                        [C.closure.effectiveDateLabel, '2026-05-31'],
                        [C.closure.postClosureStateLabel, C.closure.postClosureBlocked],
                        [C.closure.executedAtLabel, '2026-06-01']
                      ].map(([label, value]) => (
                        <Stack key={label} direction='row' justifyContent='space-between' alignItems='baseline' spacing={3} sx={{ py: 0.5 }}>
                          <Typography variant='body2' sx={{ color: 'text.secondary', flexShrink: 0 }}>
                            {label}
                          </Typography>
                          <Typography variant='body2' sx={{ fontWeight: 500, textAlign: 'right' }}>
                            {value}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                </>
              ) : null}

              {!alreadyClosed ? (
              <Box>
                <SectionLabel text={C.closure.readinessLabel} />
                {readiness.blockers.length === 0 ? (
                  <Stack direction='row' spacing={2} alignItems='center' sx={{ color: 'success.main' }}>
                    <i className='tabler-circle-check' style={{ fontSize: 18 }} aria-hidden />
                    <Typography variant='body2'>{C.closure.noBlockers}</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={3}>
                    {readiness.blockers.map(b => {
                      const ack = acknowledged.has(b.code)

                      return (
                        <Box
                          key={b.code}
                          sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: `${theme.shape.customBorderRadius.lg}px`, p: 4 }}
                        >
                          <Stack direction='row' spacing={3} justifyContent='space-between' alignItems='flex-start'>
                            <Stack direction='row' spacing={2} alignItems='flex-start' sx={{ minWidth: 0 }}>
                              <i
                                className={ack ? 'tabler-circle-check' : 'tabler-alert-triangle'}
                                style={{ fontSize: 18, marginTop: 2, flexShrink: 0, color: ack ? theme.palette.success.main : theme.palette.warning.main }}
                                aria-hidden
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant='subtitle2' sx={{ fontWeight: 600, color: 'text.primary' }}>
                                  {C.closure.blocker[b.code]}
                                </Typography>
                                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                                  {b.message}
                                </Typography>
                              </Box>
                            </Stack>
                            {ack ? <CustomChip round='true' size='small' variant='tonal' color='success' label={C.closure.acknowledgedTag} /> : null}
                          </Stack>
                          <FormControlLabel
                            sx={{ mt: 2 }}
                            control={<Checkbox checked={ack} onChange={() => toggleAck(b.code)} size='small' />}
                            label={<Typography variant='body2'>{C.closure.acknowledgeCta}</Typography>}
                          />
                        </Box>
                      )
                    })}
                  </Stack>
                )}
              </Box>
              ) : null}

              {!alreadyClosed && readiness.advisories.length > 0 ? (
                <Box>
                  <SectionLabel text={C.closure.advisoriesLabel} />
                  <Stack spacing={2}>
                    {readiness.advisories.map(a => (
                      <Stack key={a.code} direction='row' spacing={2} alignItems='flex-start' sx={{ color: 'text.secondary' }}>
                        <i className='tabler-info-circle' style={{ fontSize: 18, marginTop: 2, flexShrink: 0 }} aria-hidden />
                        <Box>
                          <Typography variant='body2' sx={{ fontWeight: 500, color: 'text.primary' }}>
                            {C.closure.advisory[a.code]}
                          </Typography>
                          <Typography variant='caption'>{a.message}</Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              ) : null}

              {!alreadyClosed ? (
                <>
                  <Divider />
                  <Stack spacing={4}>
                    <CustomTextField select fullWidth label={C.closure.causalLabel} value={causal} onChange={e => setCausal(e.target.value)}>
                      <MenuItem value='' disabled>
                        {C.closure.causalPlaceholder}
                      </MenuItem>
                      {CONTRACTOR_CLOSURE_REASONS.map(value => (
                        <MenuItem key={value} value={value}>
                          {C.closure.causal[value]}
                        </MenuItem>
                      ))}
                    </CustomTextField>

                    <CustomTextField type='date' fullWidth label={C.closure.effectiveDateLabel} slotProps={{ inputLabel: { shrink: true } }} />

                    <CustomTextField
                      fullWidth
                      multiline
                      minRows={3}
                      label={C.closure.reasonLabel}
                      helperText={C.closure.reasonHelper}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                    />

                    <FormControlLabel
                      control={<Switch />}
                      label={
                        <Box>
                          <Typography variant='body2'>{C.closure.postClosureToggle}</Typography>
                          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                            {C.closure.postClosureHelper}
                          </Typography>
                        </Box>
                      }
                    />
                  </Stack>
                </>
              ) : null}
            </Stack>
          </Box>

          {!alreadyClosed ? (
            <>
              <Divider />
              <Box sx={{ p: { xs: 5, sm: 6 } }}>
                <Stack direction='row' spacing={2} justifyContent='flex-end' alignItems='center' flexWrap='wrap' useFlexGap>
                  <Button variant='tonal' color='secondary'>
                    {C.closure.initiateCta}
                  </Button>
                  <Button variant='contained' color='primary' startIcon={<i className='tabler-door-exit' />} disabled={!allAck}>
                    {C.closure.executeCta}
                  </Button>
                </Stack>
                {!allAck ? (
                  <Typography variant='caption' sx={{ color: 'text.secondary', display: 'block', mt: 2, textAlign: 'right' }}>
                    {C.closure.executeDisabledHint}
                  </Typography>
                ) : null}
              </Box>
            </>
          ) : null}
        </Box>
      </Drawer>
    </Box>
  )
}

export default ContractorClosureDrawerMockupView
