'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { MOTION_DURATION_S, MOTION_EASE } from '@/components/greenhouse/motion/core/tokens'
import {
  CompositionShell,
  ContextCommandBar,
  GreenhouseButton,
  GreenhouseChip,
  InventoryList,
  OperationalSection,
  PreviewStage,
  SelectionRow,
  SignalStrip,
  WorkbenchHeader
} from '@/components/greenhouse/primitives'
import useReducedMotion from '@/hooks/useReducedMotion'
import { AnimatePresence, motion } from '@/libs/FramerMotion'
import { surfaceRecipesCopy as copy } from '@/lib/copy/surface-recipes'

type Archetype = 'workbench' | 'report' | 'settings'

const accessibleSpecimenSx = {
  '& .MuiChip-label': { color: 'text.primary' },
  '& .MuiButton-tonal': { color: 'text.primary' }
} as const

const EMPHASIZED_EASE = [...MOTION_EASE.emphasized.cubicBezier] as [number, number, number, number]

const surfaceContentTransition = (reduced: boolean) => ({
  duration: reduced ? 0 : MOTION_DURATION_S.medium,
  ease: EMPHASIZED_EASE
})

const IconTile = ({ icon, tone = 'primary' }: { icon: string; tone?: 'primary' | 'info' | 'success' | 'warning' }) => (
  <Box
    sx={theme => ({
      display: 'grid',
      placeItems: 'center',
      inlineSize: 40,
      blockSize: 40,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      bgcolor: `${tone}.lightOpacity`,
      color: `${tone}.main`
    })}
  >
    <i className={icon} aria-hidden='true' />
  </Box>
)

const ExecutiveEvidenceChart = () => {
  const reduced = useReducedMotion()

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' spacing={2}>
        <Stack spacing={0.5}>
          <Typography variant='subtitle1' color='text.primary'>
            Pipeline calificado acumulado
          </Typography>
          <Typography variant='body2' color='text.primary'>
            La aceleración comienza después del segundo contacto verificable.
          </Typography>
        </Stack>
        <GreenhouseChip label='+18% sobre objetivo' kind='metric' variant='label' tone='success' />
      </Stack>
      <Box
        sx={theme => ({
          color: 'primary.main',
          borderRadius: `${theme.shape.customBorderRadius.lg}px`,
          background: `linear-gradient(180deg, ${theme.palette.primary.lightOpacity}, transparent)`,
          px: { xs: 2, sm: 4 },
          pt: 4,
          pb: 2,
          overflowX: 'clip'
        })}
      >
        <svg
          viewBox='0 0 720 230'
          width='100%'
          role='img'
          aria-label='Pipeline calificado acumulado crece de 92 a 284 mil dólares entre abril y julio'
        >
          <defs>
            <linearGradient id='surface-recipe-area' x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0%' stopColor='currentColor' stopOpacity='0.3' />
              <stop offset='100%' stopColor='currentColor' stopOpacity='0' />
            </linearGradient>
          </defs>
          {[42, 94, 146, 198].map(y => (
            <line key={y} x1='24' x2='696' y1={y} y2={y} stroke='var(--mui-palette-divider)' strokeDasharray='4 8' />
          ))}
          <path
            d='M24 188 C92 180 132 164 192 150 C258 136 292 144 360 112 C426 82 470 98 528 68 C588 38 632 48 696 24 L696 210 L24 210 Z'
            fill='url(#surface-recipe-area)'
          />
          <path
            d='M24 188 C92 180 132 164 192 150 C258 136 292 144 360 112 C426 82 470 98 528 68 C588 38 632 48 696 24'
            fill='none'
            stroke='currentColor'
            strokeOpacity='0.24'
            strokeWidth='5'
            strokeLinecap='round'
          />
          <motion.path
            d='M24 188 C92 180 132 164 192 150 C258 136 292 144 360 112 C426 82 470 98 528 68 C588 38 632 48 696 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='5'
            strokeLinecap='round'
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduced ? 0 : MOTION_DURATION_S.extended, ease: EMPHASIZED_EASE }}
          />
          {[
            [24, 188],
            [192, 150],
            [360, 112],
            [528, 68],
            [696, 24]
          ].map(([cx, cy]) => (
            <circle
              key={`${cx}-${cy}`}
              cx={cx}
              cy={cy}
              r='6'
              fill='var(--mui-palette-background-paper)'
              stroke='currentColor'
              strokeWidth='4'
            />
          ))}
          <text x='24' y='226' fill='var(--mui-palette-text-secondary)'>
            Abr
          </text>
          <text x='238' y='226' fill='var(--mui-palette-text-secondary)'>
            May
          </text>
          <text x='466' y='226' fill='var(--mui-palette-text-secondary)'>
            Jun
          </text>
          <text x='670' y='226' fill='var(--mui-palette-text-secondary)'>
            Jul
          </text>
        </svg>
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          gap: 3,
          '& > *': { minWidth: 0 }
        }}
      >
        {[
          ['Account 360', 'US$ 132k', 'Mayor contribución'],
          ['Muestras de trabajo', 'US$ 94k', 'Mayor aceleración'],
          ['Contenido orgánico', 'US$ 58k', 'Mayor recurrencia']
        ].map(([label, value, note]) => (
          <Stack key={label} spacing={0.5} sx={{ borderInlineStart: '2px solid', borderColor: 'primary.main', ps: 2 }}>
            <Typography variant='caption' color='text.primary'>
              {label}
            </Typography>
            <Typography variant='h6' color='text.primary'>
              {value}
            </Typography>
            <Typography variant='caption' color='text.primary'>
              {note}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Stack>
  )
}

const SettingsProgress = () => (
  <Stack direction='row' alignItems='center' spacing={2} aria-label='Progreso de configuración: paso 1 de 2'>
    {[
      ['1', 'Señal'],
      ['2', 'Revisión']
    ].map(([number, label], index) => (
      <Stack key={number} direction='row' alignItems='center' spacing={2} sx={{ flex: index === 0 ? 1 : 0 }}>
        <Box
          sx={theme => ({
            display: 'grid',
            placeItems: 'center',
            inlineSize: 30,
            blockSize: 30,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: index === 0 ? 'primary.main' : 'action.hover',
            color: index === 0 ? 'primary.contrastText' : 'text.primary',
            border: '1px solid',
            borderColor: index === 0 ? 'primary.main' : 'divider',
            boxShadow: index === 0 ? theme.shadows[2] : 'none'
          })}
        >
          <Typography variant='caption' color='inherit'>
            {number}
          </Typography>
        </Box>
        <Typography variant='caption' color='text.primary'>
          {label}
        </Typography>
        {index === 0 ? (
          <Box sx={{ blockSize: 2, flex: 1, bgcolor: 'primary.mainOpacity', borderRadius: 9999 }} />
        ) : null}
      </Stack>
    ))}
  </Stack>
)

const WorkbenchSpecimen = () => {
  const [selected, setSelected] = useState('north')
  const reduced = useReducedMotion()
  const selectedItem = copy.workbench.items.find(item => item.id === selected) ?? copy.workbench.items[0]

  const navigator = (
    <InventoryList
      title={copy.workbench.inventory}
      count={`${copy.workbench.items.length} activas`}
      description={copy.workbench.inventoryDescription}
      dataCapture='recipe-workbench-inventory'
      variant='rail'
    >
      {copy.workbench.items.map((item, index) => (
        <SelectionRow
          key={item.id}
          title={item.title}
          subtitle={item.subtitle}
          meta={index === 0 ? 'Actualizada hace 12 min' : 'Actualizada hoy'}
          statusLabel={item.status}
          statusTone={item.tone}
          selected={selected === item.id}
          onSelect={() => setSelected(item.id)}
          leading={
            <IconTile
              icon={index === 0 ? 'tabler-sparkles' : 'tabler-bolt'}
              tone={index === 1 ? 'success' : 'primary'}
            />
          }
          dataCapture={`recipe-workbench-row-${item.id}`}
        />
      ))}
    </InventoryList>
  )

  const detail = (
    <Stack spacing={6} sx={{ minWidth: 0 }}>
      <AnimatePresence initial={false} mode='wait'>
        <Box
          key={selectedItem.id}
          component={motion.div}
          initial={reduced ? false : { y: 8 }}
          animate={{ y: 0 }}
          exit={reduced ? undefined : { y: -4 }}
          transition={surfaceContentTransition(reduced)}
          aria-live='polite'
        >
          <OperationalSection
            eyebrow='Activación seleccionada'
            title={
              <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap' useFlexGap>
                <Typography component='span' variant='h4'>
                  {selectedItem.title}
                </Typography>
                <GreenhouseChip
                  label={selectedItem.status}
                  kind='status'
                  variant='label'
                  tone={selectedItem.tone}
                  size='small'
                />
              </Stack>
            }
            description={selectedItem.description}
            variant='open'
            action={
              <GreenhouseButton
                kind='secondaryAction'
                variant='outlined'
                tone='primary'
                leadingIconClassName='tabler-pencil'
                sx={{ color: 'primary.dark', borderColor: 'primary.dark' }}
              >
                {copy.workbench.edit}
              </GreenhouseButton>
            }
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 0.8fr) minmax(0, 1.2fr)' },
                gap: { xs: 4, lg: 7 },
                pt: 2,
                '& > *': { minWidth: 0 }
              }}
            >
              <Stack spacing={3}>
                <Stack direction='row' spacing={3} alignItems='center'>
                  <IconTile icon='tabler-target-arrow' />
                  <Stack spacing={0.5}>
                    <Typography variant='overline' color='primary.dark'>
                      Confianza de la evidencia
                    </Typography>
                    <Typography variant='h2'>{selectedItem.confidence}</Typography>
                  </Stack>
                </Stack>
                <Stack direction='row' spacing={3} flexWrap='wrap' useFlexGap>
                  <Typography variant='caption' color='text.primary'>
                    Owner: Growth Studio
                  </Typography>
                  <Typography variant='caption' color='text.primary'>
                    Evidencia: {selectedItem.updated}
                  </Typography>
                  <Typography variant='caption' color='text.primary'>
                    {selectedItem.version}
                  </Typography>
                </Stack>
              </Stack>
              <Stack
                spacing={2}
                sx={{
                  borderInlineStart: { lg: '2px solid' },
                  borderBlockStart: { xs: '2px solid', lg: 'none' },
                  borderColor: 'primary.main',
                  ps: { lg: 5 },
                  pt: { xs: 4, lg: 0 }
                }}
              >
                <Typography variant='overline' color='primary.dark'>
                  {copy.workbench.insightTitle}
                </Typography>
                <Typography variant='body1'>{selectedItem.evidence}</Typography>
                <Typography variant='h5'>{selectedItem.recommendation}</Typography>
              </Stack>
            </Box>
          </OperationalSection>
        </Box>
      </AnimatePresence>
      <PreviewStage
        title={copy.workbench.previewTitle}
        description={copy.workbench.previewDescription}
        statusLabel={copy.workbench.previewStatus}
        kind='evidence'
        dataCapture='recipe-workbench-preview'
      >
        <Stack
          justifyContent='space-between'
          sx={theme => ({
            minBlockSize: 260,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            bgcolor: 'transparent',
            color: 'primary.contrastText',
            p: { xs: 4, md: 6 }
          })}
        >
          <GreenhouseChip
            label='Enterprise demand'
            kind='attribute'
            variant='outlined'
            tone='info'
            sx={{ alignSelf: 'flex-start' }}
          />
          <Stack spacing={3} sx={{ maxInlineSize: 620 }}>
            <Typography variant='h3' color='inherit' sx={{ maxInlineSize: 560 }}>
              Convierte intención compleja en una decisión clara.
            </Typography>
            <Typography variant='body1' color='inherit' sx={{ maxInlineSize: 520, opacity: 0.78 }}>
              Una experiencia enfocada en evidencia, velocidad y continuidad comercial.
            </Typography>
          </Stack>
        </Stack>
      </PreviewStage>
      <ContextCommandBar
        ariaLabel={copy.lab.aria.workbenchActions}
        context={selectedItem.context}
        status={selectedItem.check}
        secondaryActions={
          <GreenhouseButton kind='secondaryAction' variant='text' tone='primary'>
            Solicitar cambios
          </GreenhouseButton>
        }
        primaryAction={
          <GreenhouseButton kind='primaryAction' leadingIconClassName='tabler-check'>
            {copy.workbench.approve}
          </GreenhouseButton>
        }
      />
    </Stack>
  )

  return (
    <Stack
      data-surface-recipe='operational-workbench'
      data-capture='recipe-workbench'
      spacing={4}
      sx={accessibleSpecimenSx}
    >
      <WorkbenchHeader
        eyebrow={copy.workbench.eyebrow}
        title={copy.workbench.title}
        description={copy.workbench.description}
        statusLabel={copy.workbench.status}
        statusTone='success'
        secondaryActions={<GreenhouseButton kind='secondaryAction'>{copy.workbench.secondary}</GreenhouseButton>}
        primaryAction={
          <GreenhouseButton kind='primaryAction' leadingIconClassName='tabler-plus'>
            {copy.workbench.primary}
          </GreenhouseButton>
        }
        dataCapture='recipe-workbench-header'
        supporting={
          <SignalStrip
            signals={copy.workbench.signals}
            kind='insight'
            variant='integrated'
            dataCapture='recipe-workbench-signals'
            ariaLabel={copy.lab.aria.workbenchSignals}
          />
        }
      />
      <CompositionShell
        kind='workbench'
        fluidity='rich'
        instanceId='surface-recipes-workbench'
        asideLabel='Inventario de activaciones'
        detailLabel='Detalle de activación'
        regions={{ aside: navigator, primary: detail }}
      />
    </Stack>
  )
}

const ReportSpecimen = () => (
  <Stack data-surface-recipe='analytics-report' data-capture='recipe-report' spacing={4} sx={accessibleSpecimenSx}>
    <WorkbenchHeader
      eyebrow={copy.report.eyebrow}
      title={copy.report.title}
      description={copy.report.description}
      statusLabel={copy.report.status}
      statusTone='success'
      kind='report'
      secondaryActions={
        <GreenhouseButton
          kind='secondaryAction'
          variant='outlined'
          tone='primary'
          leadingIconClassName='tabler-download'
          sx={{ color: 'primary.dark', borderColor: 'primary.dark' }}
        >
          {copy.report.export}
        </GreenhouseButton>
      }
      dataCapture='recipe-report-header'
    />
    <SignalStrip
      signals={copy.report.signals}
      kind='insight'
      dataCapture='recipe-report-signals'
      ariaLabel={copy.lab.aria.reportSignals}
    />
    <CompositionShell
      composition='leadPlusContext'
      fluidity='rich'
      instanceId='surface-recipes-report'
      leadLabel='Conclusión ejecutiva'
      asideLabel='Contexto del reporte'
      regions={{
        lead: (
          <OperationalSection
            title={copy.report.narrativeTitle}
            description={copy.report.narrativeBody}
            kind='decision'
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4} alignItems={{ sm: 'flex-end' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant='h2' color='primary.main'>
                  +18%
                </Typography>
                <Typography variant='body2' color='inherit' sx={{ opacity: 0.74 }}>
                  sobre el objetivo de pipeline influido
                </Typography>
              </Box>
              <GreenhouseChip label='Tendencia sostenible' kind='metric' variant='spotlight' tone='success' />
            </Stack>
          </OperationalSection>
        ),
        primary: (
          <OperationalSection
            title={copy.report.evidenceTitle}
            description={copy.report.evidenceDescription}
            kind='evidence'
            variant='open'
            dataCapture='recipe-report-chart'
          >
            <ExecutiveEvidenceChart />
          </OperationalSection>
        ),
        aside: (
          <OperationalSection
            title='Lectura de Nexa'
            description='Lo que conviene observar la próxima semana'
            kind='content'
          >
            <Stack spacing={3}>
              <Typography variant='body2'>La calidad aumentó en cuentas con más de dos señales activas.</Typography>
              <Typography variant='body2'>El segmento SaaS mantiene la mayor aceleración y menor ciclo.</Typography>
              <GreenhouseButton kind='inlineAction' trailingIconClassName='tabler-arrow-right'>
                Abrir análisis
              </GreenhouseButton>
            </Stack>
          </OperationalSection>
        )
      }}
    />
  </Stack>
)

const SettingsSpecimen = () => {
  const [selected, setSelected] = useState('intent')
  const reduced = useReducedMotion()
  const selectedOption = copy.settings.options.find(option => option.id === selected) ?? copy.settings.options[0]

  return (
    <Stack data-surface-recipe='settings-flow' data-capture='recipe-settings' spacing={4} sx={accessibleSpecimenSx}>
      <WorkbenchHeader
        eyebrow={copy.settings.eyebrow}
        title={copy.settings.title}
        description={copy.settings.description}
        statusLabel={copy.settings.status}
        statusTone='warning'
        kind='settings'
        dataCapture='recipe-settings-header'
      />
      <CompositionShell
        composition='focused'
        fluidity='rich'
        instanceId='surface-recipes-settings'
        regions={{
          primary: (
            <Stack spacing={6} sx={{ maxInlineSize: 1040, mx: 'auto' }}>
              <SettingsProgress />
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.25fr) minmax(280px, 0.75fr)' },
                  gap: { xs: 6, md: 8 },
                  alignItems: 'start',
                  '& > *': { minWidth: 0 }
                }}
              >
                <OperationalSection
                  title={copy.settings.sectionTitle}
                  description={copy.settings.sectionDescription}
                  eyebrow='Paso 1 de 2'
                  variant='open'
                >
                  <Stack spacing={1} sx={{ borderBlockStart: '1px solid', borderColor: 'divider', pt: 2 }}>
                    {copy.settings.options.map(option => (
                      <SelectionRow
                        key={option.id}
                        title={option.title}
                        subtitle={option.subtitle}
                        meta={option.meta}
                        kind='settings'
                        selected={selected === option.id}
                        onSelect={() => setSelected(option.id)}
                        leading={
                          <IconTile
                            icon={option.id === 'intent' ? 'tabler-sparkles' : 'tabler-adjustments-horizontal'}
                            tone={option.id === 'intent' ? 'primary' : 'info'}
                          />
                        }
                        trailing={
                          selected === option.id ? (
                            <i className='tabler-circle-check-filled' aria-label='Seleccionada' />
                          ) : null
                        }
                        dataCapture={`recipe-settings-option-${option.id}`}
                      />
                    ))}
                  </Stack>
                </OperationalSection>
                <AnimatePresence initial={false} mode='wait'>
                  <Box
                    key={selectedOption.id}
                    component={motion.div}
                    initial={reduced ? false : { y: 8 }}
                    animate={{ y: 0 }}
                    exit={reduced ? undefined : { y: -4 }}
                    transition={surfaceContentTransition(reduced)}
                    aria-live='polite'
                  >
                    <OperationalSection
                      title={copy.settings.impactTitle}
                      description={selectedOption.impactBody}
                      kind='decision'
                    >
                      <Stack spacing={4}>
                        {selectedOption.impact.map((metric, index) => (
                          <Stack
                            key={metric.label}
                            spacing={0.5}
                            sx={{
                              pb: index < selectedOption.impact.length - 1 ? 3 : 0,
                              borderBlockEnd: index < selectedOption.impact.length - 1 ? '1px solid' : 'none',
                              borderColor: 'primary.mainOpacity'
                            }}
                          >
                            <Typography variant='h3'>{metric.value}</Typography>
                            <Typography variant='caption' color='inherit' sx={{ opacity: 0.76 }}>
                              {metric.label}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </OperationalSection>
                  </Box>
                </AnimatePresence>
              </Box>
              <ContextCommandBar
                ariaLabel={copy.lab.aria.settingsActions}
                context='La regla puede revertirse después de guardar'
                status='Última configuración activa: hace 8 días'
                kind='settings'
                secondaryActions={
                  <GreenhouseButton kind='secondaryAction' variant='text' tone='primary'>
                    {copy.settings.cancel}
                  </GreenhouseButton>
                }
                primaryAction={
                  <GreenhouseButton kind='primaryAction' leadingIconClassName='tabler-device-floppy'>
                    {copy.settings.save}
                  </GreenhouseButton>
                }
                sticky
                dataCapture='recipe-settings-command-bar'
              />
            </Stack>
          )
        }}
      />
    </Stack>
  )
}

const SurfaceRecipesLabView = () => {
  const [archetype, setArchetype] = useState<Archetype>('workbench')

  return (
    <Box sx={{ minWidth: 0, overflowX: 'clip', p: { xs: 4, md: 6 } }}>
      <Stack spacing={5}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={4}>
          <Stack spacing={1} sx={{ maxInlineSize: 760 }}>
            <Typography variant='overline' color='primary.main'>
              {copy.lab.eyebrow}
            </Typography>
            <Typography component='h1' variant='h3'>
              {copy.lab.title}
            </Typography>
            <Typography variant='body1' color='text.secondary'>
              {copy.lab.description}
            </Typography>
          </Stack>
          <Stack
            direction='row'
            spacing={1}
            flexWrap='wrap'
            useFlexGap
            aria-label='Seleccionar arquetipo'
            sx={theme => ({
              alignSelf: 'flex-start',
              borderRadius: `${theme.shape.customBorderRadius.lg}px`,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              p: 1
            })}
          >
            {(['workbench', 'report', 'settings'] as const).map(value => (
              <GreenhouseButton
                key={value}
                kind={archetype === value ? 'primaryAction' : 'inlineAction'}
                variant={archetype === value ? 'solid' : 'text'}
                size='small'
                onClick={() => setArchetype(value)}
                dataCapture={`recipe-tab-${value}`}
              >
                {copy.lab.tabs[value]}
              </GreenhouseButton>
            ))}
          </Stack>
        </Stack>
        {archetype === 'workbench' ? <WorkbenchSpecimen /> : null}
        {archetype === 'report' ? <ReportSpecimen /> : null}
        {archetype === 'settings' ? <SettingsSpecimen /> : null}
      </Stack>
    </Box>
  )
}

export default SurfaceRecipesLabView
