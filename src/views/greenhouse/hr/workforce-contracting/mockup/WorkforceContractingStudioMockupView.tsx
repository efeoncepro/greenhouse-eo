'use client'

import { useMemo, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import CustomAvatar from '@core/components/mui/Avatar'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import {
  OperationalPanel,
  type OperationalStatusTone
} from '@/components/greenhouse/primitives'
import { GH_WORKFORCE_CONTRACTING } from '@/lib/copy/workforce-contracting'
import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'

import {
  builderFacts,
  collaboratorDocuments,
  contractingCases,
  contractingMetrics,
  readinessItems,
  reviewSections,
  type ContractingCase,
  type ContractingMode,
  type ContractingTone
} from './data'

const toneToStatusTone = (tone: ContractingTone): OperationalStatusTone => tone

const parityMeta = (parity: ContractingCase['parityStatus']) => {
  if (parity === 'ok') {
    return { label: 'ES+EN OK', tone: 'success' as OperationalStatusTone, icon: 'tabler-language' }
  }

  if (parity === 'warning') {
    return { label: 'ES+EN revisar', tone: 'warning' as OperationalStatusTone, icon: 'tabler-language' }
  }

  return { label: 'ES+EN bloquea', tone: 'error' as OperationalStatusTone, icon: 'tabler-language-off' }
}

const stateMeta = (state: 'complete' | 'warning' | 'blocked') => {
  if (state === 'complete') return { tone: 'success' as OperationalStatusTone, icon: 'tabler-circle-check', label: 'Completo' }
  if (state === 'warning') return { tone: 'warning' as OperationalStatusTone, icon: 'tabler-alert-circle', label: 'Revisar' }

  return { tone: 'error' as OperationalStatusTone, icon: 'tabler-circle-x', label: 'Bloquea' }
}

const sectionParityMeta = (parity: 'ok' | 'warning' | 'blocked') => {
  if (parity === 'ok') return { label: 'OK', tone: 'success' as OperationalStatusTone, icon: 'tabler-check' }
  if (parity === 'warning') return { label: 'Atención', tone: 'warning' as OperationalStatusTone, icon: 'tabler-alert-triangle' }

  return { label: 'Bloqueante', tone: 'error' as OperationalStatusTone, icon: 'tabler-lock-exclamation' }
}

const modeLabels: Record<ContractingMode, { label: string; icon: string; capture: string }> = {
  command: { label: GH_WORKFORCE_CONTRACTING.commandCenter, icon: 'tabler-layout-dashboard', capture: 'mode-command' },
  builder: { label: GH_WORKFORCE_CONTRACTING.guidedBuilder, icon: 'tabler-route', capture: 'mode-builder' },
  review: { label: GH_WORKFORCE_CONTRACTING.bilingualReview, icon: 'tabler-columns-3', capture: 'mode-review' }
}

const StatusPill = ({
  label,
  tone = 'secondary',
  icon
}: {
  label: string
  tone?: OperationalStatusTone
  icon?: string
}) => {
  const theme = useTheme()
  const palette = theme.palette[tone]
  const borderColor = tone === 'secondary' ? theme.palette.divider : alpha(palette.main, 0.32)
  const backgroundColor = tone === 'secondary' ? alpha(theme.palette.text.primary, 0.055) : alpha(palette.main, 0.105)

  return (
    <Box
      component='span'
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        width: 'fit-content',
        maxWidth: '100%',
        borderRadius: 999,
        border: `1px solid ${borderColor}`,
        bgcolor: backgroundColor,
        color: 'text.primary',
        px: 1.35,
        py: 0.35,
        fontSize: '0.8125rem',
        fontWeight: 700,
        lineHeight: 1.35,
        whiteSpace: 'nowrap'
      }}
    >
      {icon ? <i className={icon} aria-hidden='true' /> : null}
      <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </Box>
    </Box>
  )
}

const WorkforceContractingStudioMockupView = () => {
  const theme = useTheme()
  const [mode, setMode] = useState<ContractingMode>('review')
  const [selectedId, setSelectedId] = useState(contractingCases[1].id)

  const selectedCase = useMemo(
    () => contractingCases.find(item => item.id === selectedId) ?? contractingCases[0],
    [selectedId]
  )

  return (
    <Stack
      spacing={{ xs: 3, md: 5 }}
      data-capture='workforce-contracting-studio-mockup'
      sx={{
        '& .MuiTypography-root, & .MuiCardHeader-subheader': {
          color: theme => `${theme.palette.text.primary} !important`
        },
        '& .MuiButton-outlinedPrimary, & .MuiButton-textPrimary': {
          color: theme => `${theme.palette.primary.dark} !important`,
          borderColor: theme => `${theme.palette.primary.dark} !important`
        }
      }}
    >
      <Header mode={mode} onModeChange={setMode} />

      <MetricStrip />

      {mode === 'command' ? <CommandCenter selectedCase={selectedCase} onSelectCase={setSelectedId} /> : null}
      {mode === 'builder' ? <GuidedBuilder /> : null}
      {mode === 'review' ? <BilingualReview selectedCase={selectedCase} /> : null}

      <CollaboratorPreview />

      <Card
        sx={{
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          boxShadow: 'none'
        }}
      >
        <CardContent sx={{ py: 2.5 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
            <Stack direction='row' spacing={1.5} alignItems='center'>
              <CustomAvatar skin='light' color='info' variant='rounded'>
                <i className='tabler-info-circle' aria-hidden='true' />
              </CustomAvatar>
              <Box>
                <Typography variant='subtitle2'>Mockup Product Design · no toca runtime productivo</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Las acciones, firmas, PDF y emails son estados simulados para aprobar dirección visual.
                </Typography>
              </Box>
            </Stack>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <StatusPill label='GVC target' tone='primary' icon='tabler-camera' />
              <StatusPill label='ES+EN first' tone='success' icon='tabler-language' />
              <StatusPill label='IA con límites' tone='info' icon='tabler-sparkles' />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

const Header = ({
  mode,
  onModeChange
}: {
  mode: ContractingMode
  onModeChange: (mode: ContractingMode) => void
}) => (
  <Card
    data-capture='workforce-contracting-header'
    sx={theme => ({
      borderRadius: 2,
      border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
      borderTop: `3px solid ${theme.palette.primary.main}`,
      boxShadow: 'none'
    })}
  >
    <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent='space-between' gap={3}>
          <Stack spacing={1.5} sx={{ minWidth: 0, maxWidth: 780 }}>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <StatusPill label={GH_WORKFORCE_CONTRACTING.requiredLanguages} tone='success' icon='tabler-language' />
              <StatusPill label={GH_WORKFORCE_CONTRACTING.authoritativeSpanish} tone='primary' icon='tabler-gavel' />
              <StatusPill label={GH_WORKFORCE_CONTRACTING.aiGuardrail} tone='info' icon='tabler-sparkles' />
            </Stack>
            <Box>
              <Typography variant='h3' sx={{ fontSize: { xs: 28, md: 36 }, lineHeight: 1.1 }}>
                {GH_WORKFORCE_CONTRACTING.mockupTitle}
              </Typography>
              <Typography color='text.secondary' sx={{ mt: 1, maxWidth: 720 }}>
                Prepara cartas oferta y contratos laborales bilingües con redacción asistida, validación determinista,
                aprobación humana y firma futura por ZapSign.
              </Typography>
            </Box>
          </Stack>

          <Stack alignItems={{ xs: 'stretch', lg: 'flex-end' }} spacing={1.5}>
            <Button
              variant='contained'
              startIcon={<i className='tabler-file-plus' aria-hidden='true' />}
              sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start', lg: 'flex-end' } }}
            >
              {GH_WORKFORCE_CONTRACTING.createDocument}
            </Button>
            <Typography variant='caption' color='text.secondary'>
              Ruta mockup: /hr/workforce/contracts/mockup
            </Typography>
          </Stack>
        </Stack>

        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_event, nextMode: ContractingMode | null) => {
            if (nextMode) onModeChange(nextMode)
          }}
          aria-label={GH_WORKFORCE_CONTRACTING.aria.prototypeMode}
          sx={{
            alignSelf: 'flex-start',
            flexWrap: 'wrap',
            gap: 1,
            '& .MuiToggleButtonGroup-grouped': {
              borderRadius: 1,
              border: theme => `1px solid ${theme.palette.divider} !important`,
              mx: 0
            }
          }}
        >
          {(Object.keys(modeLabels) as ContractingMode[]).map(item => (
            <ToggleButton key={item} value={item} aria-label={modeLabels[item].label} data-capture={modeLabels[item].capture}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <i className={modeLabels[item].icon} aria-hidden='true' />
                <span>{modeLabels[item].label}</span>
              </Stack>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Stack>
    </CardContent>
  </Card>
)

const MetricStrip = () => (
  <Box
    data-capture='workforce-contracting-kpis'
    sx={{
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        sm: 'repeat(2, minmax(0, 1fr))',
        lg: 'repeat(5, minmax(0, 1fr))'
      },
      gap: 2
    }}
  >
    {contractingMetrics.map(metric => (
      <Card key={metric.label} sx={{ boxShadow: 'none', border: theme => `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction='row' justifyContent='space-between' alignItems='center' spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='h4' sx={{ lineHeight: 1 }}>
                <AnimatedCounter value={metric.value} />
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                {metric.label}
              </Typography>
            </Box>
            <CustomAvatar skin='light' color={metric.tone} variant='rounded'>
              <i className={metric.icon} aria-hidden='true' />
            </CustomAvatar>
          </Stack>
        </CardContent>
      </Card>
    ))}
  </Box>
)

const CommandCenter = ({
  selectedCase,
  onSelectCase
}: {
  selectedCase: ContractingCase
  onSelectCase: (id: string) => void
}) => {
  const theme = useTheme()

  return (
    <Box
      data-capture='workforce-contracting-command-center'
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px', xl: 'minmax(0, 1fr) 380px' },
        gap: 3
      }}
    >
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <Stack spacing={0}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ p: 3 }}>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {['Todos', 'Cartas oferta', 'Contratos', 'Chile', 'Internacional', 'Riesgo'].map((filter, index) => (
                  <StatusPill key={filter} label={filter} tone={index === 0 ? 'primary' : 'secondary'} />
                ))}
              </Stack>
              <Button variant='outlined' size='small' startIcon={<i className='tabler-adjustments-horizontal' aria-hidden='true' />}>
                Filtros
              </Button>
            </Stack>
            <Divider />
            <Box sx={{ overflowX: 'auto' }} tabIndex={0} aria-label={GH_WORKFORCE_CONTRACTING.aria.commandQueueTable}>
              <Table sx={{ minWidth: 980 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Persona</TableCell>
                    <TableCell>Documento</TableCell>
                    <TableCell>Pack jurisdiccional</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Paridad</TableCell>
                    <TableCell>Riesgo</TableCell>
                    <TableCell>Próxima acción</TableCell>
                    <TableCell>Vence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contractingCases.map(item => {
                    const parity = parityMeta(item.parityStatus)
                    const selected = item.id === selectedCase.id

                    return (
                      <TableRow
                        key={item.id}
                        hover
                        selected={selected}
                        onClick={() => onSelectCase(item.id)}
                        sx={{
                          cursor: 'pointer',
                          '&.Mui-selected': {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            boxShadow: `inset 3px 0 0 ${theme.palette.primary.main}`
                          }
                        }}
                      >
                        <TableCell>
                          <Stack direction='row' spacing={1.5} alignItems='center'>
                            <CustomAvatar skin='filled' color='primary' size={34}>
                              {item.initials}
                            </CustomAvatar>
                            <Box>
                              <Typography variant='subtitle2'>{item.personName}</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {item.publicId} · {item.role}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>{item.documentKind}</TableCell>
                        <TableCell>{item.jurisdictionPack}</TableCell>
                        <TableCell>
                          <StatusPill label={item.statusLabel} tone={toneToStatusTone(item.statusTone)} />
                        </TableCell>
                        <TableCell>
                          <StatusPill label={parity.label} tone={parity.tone} icon={parity.icon} />
                        </TableCell>
                        <TableCell>
                          <StatusPill label={item.riskLabel} tone={toneToStatusTone(item.riskTone)} />
                        </TableCell>
                        <TableCell>{item.nextAction}</TableCell>
                        <TableCell>
                          <Typography color={item.status === 'blocked' ? 'error.main' : 'text.primary'}>{item.dueDate}</Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <CaseRail selectedCase={selectedCase} />
    </Box>
  )
}

const CaseRail = ({ selectedCase }: { selectedCase: ContractingCase }) => {
  const parity = parityMeta(selectedCase.parityStatus)

  return (
    <Card data-capture='workforce-contracting-case-rail' sx={{ boxShadow: 'none', border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Stack direction='row' justifyContent='space-between' spacing={2}>
            <Box>
              <Typography variant='h5'>{selectedCase.personName}</Typography>
              <Typography variant='body2' color='text.secondary'>
                {selectedCase.documentKind} · {selectedCase.jurisdictionPack}
              </Typography>
            </Box>
            <StatusPill label={selectedCase.publicId} tone='primary' />
          </Stack>

          <Stack spacing={1.4}>
            {[
              ['Email', selectedCase.personEmail],
              ['Área', selectedCase.area],
              ['Rol', selectedCase.role],
              ['Inicio', selectedCase.startDate],
              ['Compensación', selectedCase.compensation],
              ['Entidad', selectedCase.entity],
              ['Modalidad', selectedCase.workMode]
            ].map(([label, value]) => (
              <Stack key={label} direction='row' justifyContent='space-between' gap={2}>
                <Typography variant='body2' color='text.secondary'>{label}</Typography>
                <Typography variant='body2' sx={{ textAlign: 'right', maxWidth: 210 }}>{value}</Typography>
              </Stack>
            ))}
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <Typography variant='subtitle2'>Preparación del caso</Typography>
              <StatusPill label={selectedCase.statusLabel} tone={toneToStatusTone(selectedCase.statusTone)} />
            </Stack>
            <StatusPill label={parity.label} tone={parity.tone} icon={parity.icon} />
            {selectedCase.missingFacts.length > 0 ? (
              <Box>
                <Typography variant='subtitle2' color='error.main' sx={{ mb: 1 }}>
                  Datos faltantes ({selectedCase.missingFacts.length})
                </Typography>
                <Stack spacing={0.75}>
                  {selectedCase.missingFacts.map(fact => (
                    <Typography key={fact} variant='body2' color='text.secondary'>
                      • {fact}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Stack>

          <Divider />

          <Stack spacing={1.5}>
            <Typography variant='subtitle2'>Línea de tiempo</Typography>
            {selectedCase.timeline.map(item => (
              <Stack key={`${item.label}-${item.detail}`} direction='row' spacing={1.5} alignItems='flex-start'>
                <Box
                  sx={theme => ({
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: `${item.tone}.main`,
                    mt: 0.7,
                    boxShadow: `0 0 0 4px ${alpha(theme.palette[item.tone].main, 0.12)}`
                  })}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant='body2' fontWeight={600}>{item.label}</Typography>
                  <Typography variant='caption' color='text.secondary'>{item.detail} · {item.actor}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>

          <Button fullWidth variant='contained' startIcon={<i className='tabler-columns-3' aria-hidden='true' />}>
            {GH_WORKFORCE_CONTRACTING.reviewBilingualDraft}
          </Button>
          <Stack direction='row' spacing={1}>
            <Button fullWidth variant='outlined' color='error'>Anular</Button>
            <Button fullWidth variant='outlined'>Asignar</Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

const GuidedBuilder = () => {
  const completed = readinessItems.filter(item => item.state === 'complete').length

  return (
    <Stack spacing={3} data-capture='workforce-contracting-guided-builder'>
      <StepperPreview activeStep={2} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 1.05fr 1fr' },
          gap: 3,
          alignItems: 'stretch'
        }}
      >
        <OperationalPanel
          title='Datos capturados'
          subheader='Fuente: Person 360 + Workforce Activation'
          icon='tabler-database'
          fullHeight
          action={<Button size='small'>Editar todo</Button>}
        >
          <Stack spacing={0.5}>
            {builderFacts.map(fact => {
              const meta = stateMeta(fact.state)

              return (
                <Stack
                  key={fact.label}
                  direction='row'
                  spacing={1.5}
                  alignItems='center'
                  sx={theme => ({
                    py: 1.4,
                    borderBottom: `1px solid ${theme.palette.divider}`
                  })}
                >
                  <CustomAvatar skin='light' color={meta.tone} variant='rounded' size={36}>
                    <i className={fact.icon} aria-hidden='true' />
                  </CustomAvatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant='body2' color='text.secondary'>{fact.label}</Typography>
                    <Typography variant='subtitle2'>{fact.value}</Typography>
                    <Typography variant='caption' color='text.secondary'>{fact.helper}</Typography>
                  </Box>
                  <Box sx={{ color: `${meta.tone}.main` }}>
                    <i className={meta.icon} aria-hidden='true' />
                  </Box>
                </Stack>
              )
            })}
          </Stack>
        </OperationalPanel>

        <OperationalPanel
          title='Validación legal'
          subheader={`Chile dependiente · ${completed} / ${readinessItems.length} completo`}
          icon='tabler-scale'
          iconColor='warning'
          fullHeight
        >
          <Stack spacing={2}>
            <LinearProgress
              variant='determinate'
              value={(completed / readinessItems.length) * 100}
              aria-label={GH_WORKFORCE_CONTRACTING.aria.legalReadinessProgress}
              sx={{ height: 8, borderRadius: 999 }}
            />
            {readinessItems.map(item => {
              const meta = stateMeta(item.state)

              return (
                <Box
                  key={item.label}
                  sx={theme => ({
                    p: 1.5,
                    borderRadius: 1,
                    border: `1px solid ${alpha(theme.palette[meta.tone].main, 0.28)}`,
                    bgcolor: alpha(theme.palette[meta.tone].main, 0.05)
                  })}
                >
                  <Stack direction='row' spacing={1.25} alignItems='flex-start'>
                    <Box sx={{ color: `${meta.tone}.main`, mt: 0.25 }}>
                      <i className={meta.icon} aria-hidden='true' />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='subtitle2'>{item.label}</Typography>
                      <Typography variant='caption' color='text.secondary'>{item.helper}</Typography>
                    </Box>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        </OperationalPanel>

        <OperationalPanel
          title='Asistente IA'
          subheader='Claude redacta, Greenhouse valida'
          icon='tabler-sparkles'
          iconColor='info'
          fullHeight
        >
          <Stack spacing={2.5}>
            <Stack direction='row' justifyContent='space-between' alignItems='center'>
              <Typography variant='subtitle2'>Estado del draft</Typography>
              <StatusPill label='Listo para generar' tone='success' icon='tabler-circle-check' />
            </Stack>
            <Typography variant='body2' color='text.secondary'>
              Se usarán solo datos permitidos, pack Chile dependiente y salida estructurada para español e inglés.
            </Typography>
            <Box>
              <Typography variant='subtitle2' sx={{ mb: 1 }}>Fuentes usadas</Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {['Código del Trabajo', 'Ley 21.561', 'Plantilla CL v3.2', 'Person 360'].map(source => (
                  <StatusPill key={source} label={source} tone='secondary' />
                ))}
              </Stack>
            </Box>
            <Box>
              <Typography variant='subtitle2' sx={{ mb: 1 }}>Supuestos aplicados</Typography>
              {['Lugar principal: Santiago, requiere confirmación.', 'Sin exclusividad pactada.', 'Variable anual marcada como riesgo.'].map(item => (
                <Typography key={item} variant='body2' color='text.secondary'>• {item}</Typography>
              ))}
            </Box>
            <Box
              sx={theme => ({
                p: 2,
                borderRadius: 1,
                border: `1px solid ${alpha(theme.palette.success.main, 0.24)}`,
                bgcolor: alpha(theme.palette.success.main, 0.06)
              })}
            >
              <Typography variant='subtitle2' color='success.main'>
                Este borrador será ES + EN
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                El texto en español queda como idioma autoritativo para Chile.
              </Typography>
            </Box>
            <Button variant='contained' size='large' startIcon={<i className='tabler-sparkles' aria-hidden='true' />}>
              {GH_WORKFORCE_CONTRACTING.generateBilingualDraft}
            </Button>
          </Stack>
        </OperationalPanel>
      </Box>

      <ActionBar
        status='Guardado automático hace 2 min'
        primary='Ver revisión bilingüe'
        secondary='Validar datos'
      />
    </Stack>
  )
}

const StepperPreview = ({ activeStep }: { activeStep: number }) => {
  const steps = ['Datos', 'Validación + draft IA', 'Revisión bilingüe', 'Aprobación', 'PDF/Firma']

  return (
    <Card sx={{ boxShadow: 'none', border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardContent sx={{ py: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
          {steps.map((step, index) => {
            const isActive = index + 1 === activeStep
            const isDone = index + 1 < activeStep

            return (
              <Stack key={step} direction='row' alignItems='center' spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                <CustomAvatar
                  skin={isActive || isDone ? 'filled' : 'light'}
                  color={isDone ? 'success' : isActive ? 'primary' : 'secondary'}
                  size={34}
                >
                  {isDone ? <i className='tabler-check' aria-hidden='true' /> : index + 1}
                </CustomAvatar>
                <Typography variant='subtitle2' color={isActive ? 'primary.main' : 'text.primary'}>
                  {step}
                </Typography>
                {index < steps.length - 1 ? <Divider sx={{ flex: 1, display: { xs: 'none', md: 'block' } }} /> : null}
              </Stack>
            )
          })}
        </Stack>
      </CardContent>
    </Card>
  )
}

const BilingualReview = ({ selectedCase }: { selectedCase: ContractingCase }) => (
  <Stack spacing={3} data-capture='workforce-contracting-bilingual-review'>
    <Card sx={{ boxShadow: 'none', border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction={{ xs: 'column', xl: 'row' }} justifyContent='space-between' spacing={2}>
          <Stack spacing={1}>
            <Typography variant='h4'>Revisión bilingüe</Typography>
            <Typography color='text.secondary'>
              {selectedCase.personName} · {selectedCase.role} · {selectedCase.jurisdictionPack}
            </Typography>
          </Stack>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <StatusPill label={GH_WORKFORCE_CONTRACTING.requiredLanguages} tone='success' icon='tabler-language' />
            <StatusPill label='Idioma autoritativo: español' tone='primary' icon='tabler-gavel' />
            <StatusPill label='Paridad 8/9' tone='warning' icon='tabler-chart-donut' />
          </Stack>
        </Stack>
      </CardContent>
    </Card>

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 320px', xl: 'minmax(0, 1fr) 360px' },
        gap: 3,
        alignItems: 'start'
      }}
    >
      <Card sx={{ boxShadow: 'none', border: theme => `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ p: 2.5 }}>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              <Button variant='outlined' size='small' startIcon={<i className='tabler-columns-3' aria-hidden='true' />}>{GH_WORKFORCE_CONTRACTING.compare}</Button>
              <Button variant='outlined' size='small' startIcon={<i className='tabler-database-search' aria-hidden='true' />}>{GH_WORKFORCE_CONTRACTING.showSources}</Button>
            </Stack>
            <Stack direction='row' spacing={1} alignItems='center'>
              <Button variant='outlined' size='small' startIcon={<i className='tabler-arrow-left' aria-hidden='true' />}>{GH_WORKFORCE_CONTRACTING.previousIssue}</Button>
              <Typography variant='caption' color='text.secondary'>2 de 9</Typography>
              <Button variant='outlined' size='small' endIcon={<i className='tabler-arrow-right' aria-hidden='true' />}>{GH_WORKFORCE_CONTRACTING.nextIssue}</Button>
            </Stack>
          </Stack>
          <Divider />
          <Box sx={{ overflowX: 'auto' }} tabIndex={0} aria-label={GH_WORKFORCE_CONTRACTING.aria.bilingualReviewTable}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 80 }}>Sección</TableCell>
                  <TableCell>Español (idioma autoritativo)</TableCell>
                  <TableCell>English</TableCell>
                  <TableCell sx={{ width: 170 }}>Paridad</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reviewSections.map(section => {
                  const meta = sectionParityMeta(section.parity)

                  return (
                    <TableRow
                      key={section.code}
                      sx={theme => ({
                        bgcolor: section.parity === 'blocked' ? alpha(theme.palette.error.main, 0.055) : undefined,
                        boxShadow: section.parity === 'blocked' ? `inset 3px 0 0 ${theme.palette.error.main}` : undefined
                      })}
                    >
                      <TableCell>
                        <Typography variant='subtitle2' color={section.parity === 'blocked' ? 'error.main' : 'text.primary'}>
                          {section.code}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Typography variant='subtitle2'>{section.spanishHeading}</Typography>
                        <Typography variant='body2' color='text.secondary'>{section.spanishBody}</Typography>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Typography variant='subtitle2'>{section.englishHeading}</Typography>
                        <Typography variant='body2' color='text.secondary'>{section.englishBody}</Typography>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={1}>
                          <StatusPill label={meta.label} tone={meta.tone} icon={meta.icon} />
                          <Typography variant='caption' color={section.parity === 'blocked' ? 'error.main' : 'text.secondary'}>
                            {section.note}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      <ValidationRail />
    </Box>

    <ActionBar
      status='1 bloqueante debe resolverse antes de aprobar o generar PDF'
      primary={GH_WORKFORCE_CONTRACTING.requestChanges}
      secondary={GH_WORKFORCE_CONTRACTING.approveBilingualDraft}
      disabledLabel={GH_WORKFORCE_CONTRACTING.generatePdf}
      primaryIcon='tabler-message'
      secondaryIcon='tabler-circle-check'
      secondaryDisabled
    />
  </Stack>
)

const ValidationRail = () => {
  const theme = useTheme()

  const validationChartOptions: ApexOptions = {
    chart: { type: 'donut', toolbar: { show: false }, background: 'transparent', sparkline: { enabled: true } },
    labels: ['Validado', 'Advertencia', 'Bloqueante'],
    colors: [theme.palette.success.main, theme.palette.warning.main, theme.palette.error.main],
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: { width: 0 },
    tooltip: {
      enabled: true,
      y: {
        formatter: value => `${value} sección${value === 1 ? '' : 'es'}`
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%'
        }
      }
    }
  }

  return (
    <Card data-capture='workforce-contracting-validation-rail' sx={{ boxShadow: 'none', border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant='h6'>Resumen de validación</Typography>
            <Stack direction='row' alignItems='center' spacing={2} sx={{ mt: 2 }}>
              <Box aria-hidden='true' sx={{ width: 78, height: 78, flex: '0 0 auto' }}>
                <AppReactApexCharts
                  type='donut'
                  width={78}
                  height={78}
                  options={validationChartOptions}
                  series={[7, 1, 1]}
                />
              </Box>
              <Box>
                <Typography variant='h3' sx={{ lineHeight: 1 }}>8/9</Typography>
                <Typography variant='body2' color='text.secondary'>Paridad estructural</Typography>
              </Box>
            </Stack>
          </Box>

        <Divider />

        <Box>
          <Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
            <Typography variant='subtitle2'>Bloqueantes</Typography>
            <Typography variant='h6' color='error.main'>1</Typography>
          </Stack>
          <Box
            sx={theme => ({
              p: 1.5,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.error.main, 0.06),
              border: `1px solid ${alpha(theme.palette.error.main, 0.24)}`
            })}
          >
            <Typography variant='subtitle2' color='error.main'>4.1 Remuneración variable</Typography>
            <Typography variant='body2' color='text.secondary'>
              Divergencia material: discrecionalidad vs derecho a bonificación.
            </Typography>
          </Box>
        </Box>

        <Box>
          <Typography variant='subtitle2' sx={{ mb: 1 }}>Notas del revisor</Typography>
          <Stack spacing={1.2}>
            {['Revisar redacción de 4.1 para reflejar criterios objetivos.', 'Confirmar lugar principal antes del PDF.', 'Mantener español como texto autoritativo.'].map(note => (
              <Typography key={note} variant='body2' color='text.secondary'>• {note}</Typography>
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography variant='subtitle2' sx={{ mb: 1 }}>Supuestos de Claude</Typography>
          <Stack spacing={1}>
            {['"Bonificación anual" se interpreta como pago sujeto a desempeño.', 'No se detectó pacto de exclusividad.', 'El anexo de funciones está disponible como fuente.'].map(note => (
              <Typography key={note} variant='caption' color='text.secondary'>• {note}</Typography>
            ))}
          </Stack>
        </Box>

        <Box>
          <Typography variant='subtitle2' sx={{ mb: 1 }}>Checklist de aprobación</Typography>
          {['HR pendiente', 'Legal pendiente', 'Finance pendiente'].map(item => (
            <Stack key={item} direction='row' spacing={1} alignItems='center' sx={{ py: 0.75 }}>
              <i className='tabler-circle' aria-hidden='true' />
              <Typography variant='body2'>{item}</Typography>
            </Stack>
          ))}
        </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

const ActionBar = ({
  status,
  primary,
  secondary,
  disabledLabel,
  primaryIcon = 'tabler-circle-check',
  secondaryIcon = 'tabler-message',
  secondaryDisabled = false
}: {
  status: string
  primary: string
  secondary: string
  disabledLabel?: string
  primaryIcon?: string
  secondaryIcon?: string
  secondaryDisabled?: boolean
}) => (
  <Card
    sx={{
      position: 'sticky',
      bottom: 16,
      zIndex: 2,
      boxShadow: theme => theme.shadows[8],
      border: theme => `1px solid ${theme.palette.divider}`
    }}
  >
    <CardContent sx={{ py: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
        <Stack direction='row' spacing={1.5} alignItems='center'>
          <Box sx={{ color: 'info.main' }}>
            <i className='tabler-info-circle' aria-hidden='true' />
          </Box>
          <Typography variant='body2' color='text.secondary'>{status}</Typography>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pr: { md: 8 } }}>
          <Button disabled={secondaryDisabled} variant='outlined' startIcon={<i className={secondaryIcon} aria-hidden='true' />}>{secondary}</Button>
          <Button variant='contained' startIcon={<i className={primaryIcon} aria-hidden='true' />}>{primary}</Button>
          {disabledLabel ? (
            <Button disabled variant='outlined' startIcon={<i className='tabler-file-type-pdf' aria-hidden='true' />}>{disabledLabel}</Button>
          ) : null}
        </Stack>
      </Stack>
    </CardContent>
  </Card>
)

const CollaboratorPreview = () => (
  <OperationalPanel
    title='Portal colaborador'
    subheader='Preview de /my/offers y /my/contracts: simple, bilingüe y sin edición legal'
    icon='tabler-user-check'
    iconColor='success'
  >
    <Box
      data-capture='workforce-contracting-collaborator-preview'
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        gap: 2
      }}
    >
      {collaboratorDocuments.map(item => (
        <Box
          key={item.title}
          sx={theme => ({
            p: 2,
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette[item.tone].main, 0.24)}`,
            bgcolor: alpha(theme.palette[item.tone].main, 0.05)
          })}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant='subtitle2'>{item.title}</Typography>
              <Typography variant='body2' color='text.secondary'>{item.helper}</Typography>
              <Stack direction='row' spacing={1} sx={{ mt: 1 }} flexWrap='wrap' useFlexGap>
                <StatusPill label={item.status} tone={toneToStatusTone(item.tone)} />
                <StatusPill label='ES+EN' tone='success' icon='tabler-language' />
              </Stack>
            </Box>
            <Button variant={item.tone === 'warning' ? 'contained' : 'outlined'} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
              {item.action}
            </Button>
          </Stack>
        </Box>
      ))}
    </Box>
  </OperationalPanel>
)

export default WorkforceContractingStudioMockupView
