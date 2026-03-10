'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import type { ApexOptions } from 'apexcharts'

import AppReactApexCharts from '@/libs/styles/AppReactApexCharts'
import type { GreenhouseDashboardData, GreenhouseDashboardProjectRisk } from '@/types/greenhouse-dashboard'

const statusColorMap: Record<string, string> = {
  active: 'var(--mui-palette-primary-main)',
  review: 'var(--mui-palette-warning-main)',
  changes: 'var(--mui-palette-error-main)',
  blocked: 'var(--mui-palette-secondary-main)',
  queued: 'var(--mui-palette-info-main)',
  completed: 'var(--mui-palette-success-main)',
  closed: 'var(--mui-palette-text-disabled)',
  other: 'var(--mui-palette-grey-500)'
}

const effortColorMap: Record<string, string> = {
  high: 'var(--mui-palette-error-main)',
  medium: 'var(--mui-palette-warning-main)',
  low: 'var(--mui-palette-success-main)',
  unknown: 'var(--mui-palette-info-main)'
}

const formatSyncedAt = (value: string | null) => {
  if (!value) {
    return 'sin sincronizacion registrada'
  }

  return new Date(value).toLocaleString('es-CL')
}

const formatDelta = (value: number) => {
  if (value > 0) {
    return `+${value}`
  }

  return String(value)
}

const getProjectTone = (project: GreenhouseDashboardProjectRisk) => {
  if (project.blockedTasks > 0 || project.reviewPressureTasks >= 6) {
    return 'error'
  }

  if ((project.onTimePct ?? 100) < 65 || project.reviewPressureTasks >= 3) {
    return 'warning'
  }

  return 'success'
}

const renderMetricList = (items: { label: string; value: string; detail: string }[]) => (
  <Stack spacing={2}>
    {items.map(item => (
      <Box
        key={item.label}
        sx={{
          p: 3,
          borderRadius: 3,
          bgcolor: 'action.hover',
          display: 'grid',
          gap: 0.5
        }}
      >
        <Typography variant='body2' color='text.secondary'>
          {item.label}
        </Typography>
        <Typography variant='h5'>{item.value}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {item.detail}
        </Typography>
      </Box>
    ))}
  </Stack>
)

type GreenhouseDashboardProps = {
  data: GreenhouseDashboardData
}

const GreenhouseDashboard = ({ data }: GreenhouseDashboardProps) => {
  const theme = useTheme()

  const throughputOptions: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    dataLabels: { enabled: false },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: {
        colors: 'var(--mui-palette-text-secondary)'
      }
    },
    stroke: {
      width: [0, 0]
    },
    plotOptions: {
      bar: {
        borderRadius: 8,
        columnWidth: '42%'
      }
    },
    colors: ['var(--mui-palette-primary-main)', 'var(--mui-palette-success-main)'],
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      strokeDashArray: 6,
      padding: {
        left: 0,
        right: 0,
        top: -12,
        bottom: -8
      }
    },
    xaxis: {
      categories: data.charts.throughput.map(item => item.label),
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: {
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        }
      }
    },
    tooltip: {
      shared: true,
      intersect: false
    }
  }

  const statusMixOptions: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    dataLabels: { enabled: false },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 8,
        barHeight: '54%',
        distributed: true
      }
    },
    colors: data.charts.statusMix.map(item => statusColorMap[item.key] || statusColorMap.other),
    grid: {
      borderColor: 'var(--mui-palette-divider)',
      strokeDashArray: 5,
      xaxis: {
        lines: { show: true }
      },
      padding: {
        top: -8,
        right: 8,
        left: 8,
        bottom: -10
      }
    },
    legend: { show: false },
    xaxis: {
      categories: data.charts.statusMix.map(item => item.label),
      labels: {
        style: {
          colors: 'var(--mui-palette-text-disabled)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'var(--mui-palette-text-secondary)',
          fontFamily: theme.typography.fontFamily,
          fontSize: theme.typography.body2.fontSize as string
        }
      }
    },
    tooltip: {
      y: {
        formatter: value => `${value} tareas`
      }
    }
  }

  const effortMixOptions: ApexOptions = {
    chart: {
      parentHeightOffset: 0,
      toolbar: { show: false }
    },
    labels: data.charts.effortMix.map(item => item.label),
    colors: data.charts.effortMix.map(item => effortColorMap[item.key] || effortColorMap.unknown),
    dataLabels: { enabled: false },
    stroke: {
      width: 4,
      colors: ['var(--mui-palette-background-paper)']
    },
    legend: {
      position: 'bottom',
      labels: {
        colors: 'var(--mui-palette-text-secondary)'
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Estimadas',
              formatter: () => String(data.charts.effortMix.reduce((sum, item) => sum + item.value, 0))
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter: value => `${value} tareas`
      }
    }
  }

  const onTimeOptions: ApexOptions = {
    stroke: { dashArray: 10 },
    labels: ['On-time portfolio'],
    colors: ['var(--mui-palette-success-main)'],
    states: {
      hover: {
        filter: { type: 'none' }
      },
      active: {
        filter: { type: 'none' }
      }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        opacityTo: 0.45,
        opacityFrom: 1,
        shadeIntensity: 0.45,
        stops: [30, 70, 100],
        inverseColors: false,
        gradientToColors: ['var(--mui-palette-success-main)']
      }
    },
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: { size: '58%' },
        track: { background: alpha(theme.palette.success.main, 0.12) },
        dataLabels: {
          name: {
            offsetY: -18,
            color: 'var(--mui-palette-text-secondary)',
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.body2.fontSize as string
          },
          value: {
            offsetY: 14,
            formatter: value => `${Math.round(value)}%`,
            color: 'var(--mui-palette-text-primary)',
            fontFamily: theme.typography.fontFamily,
            fontSize: theme.typography.h3.fontSize as string,
            fontWeight: 600
          }
        }
      }
    },
    grid: {
      padding: {
        top: -18,
        bottom: -4
      }
    }
  }

  const throughputSeries = [
    {
      name: 'Creadas',
      data: data.charts.throughput.map(item => item.created)
    },
    {
      name: 'Entregadas',
      data: data.charts.throughput.map(item => item.completed)
    }
  ]

  const statusMixSeries = [{ data: data.charts.statusMix.map(item => item.value) }]
  const effortMixSeries = data.charts.effortMix.map(item => item.value)
  const riskProjects = data.projects.slice(0, 5)
  const syncedAtLabel = formatSyncedAt(data.scope.lastSyncedAt)

  return (
    <Stack spacing={6}>
      <Card sx={{ overflow: 'hidden' }}>
        <CardContent
          sx={{
            p: { xs: 4, md: 6 },
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.18)} 0%, ${alpha(
              theme.palette.success.main,
              0.12
            )} 38%, ${alpha(theme.palette.background.paper, 0)} 100%)`
          }}
        >
          <Stack spacing={2.5}>
            <Chip label='Executive dashboard' color='primary' variant='outlined' sx={{ width: 'fit-content' }} />
            <Typography variant='h3'>La operacion del cliente ya se lee como una cartera, no como una lista de tareas.</Typography>
            <Typography color='text.secondary' sx={{ maxWidth: 860 }}>
              Greenhouse ahora muestra velocidad de entrega, salud on-time, presion de revision y proyectos bajo
              atencion para el alcance actual de este tenant. Alcance visible: {data.scope.projectCount} proyectos.
              Ultima sincronizacion: {syncedAtLabel}.
            </Typography>
            <Stack direction='row' flexWrap='wrap' gap={1.5}>
              <Chip color='success' variant='tonal' label={`${data.summary.completedLast30Days} entregadas en 30 dias`} />
              <Chip color='warning' variant='tonal' label={`${data.summary.reviewPressureTasks} con friccion de revision`} />
              <Chip color='error' variant='tonal' label={`${data.summary.projectsAtRisk} proyectos bajo observacion`} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
        }}
      >
        {data.kpis.map(kpi => (
          <Card key={kpi.label}>
            <CardContent>
              <Stack spacing={2}>
                <Chip label={kpi.label} color={kpi.tone} variant='outlined' sx={{ width: 'fit-content' }} />
                <Typography variant='h3'>{kpi.value}</Typography>
                <Typography color='text.secondary'>{kpi.detail}</Typography>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.6fr 1fr' } }}>
        <Card>
          <CardContent sx={{ height: '100%' }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Box>
                <Typography variant='h5'>Momentum de entrega</Typography>
                <Typography color='text.secondary'>
                  Compara el flujo de trabajo que entra contra el trabajo que ya esta saliendo al mercado.
                </Typography>
              </Box>
              <AppReactApexCharts type='bar' height={330} width='100%' series={throughputSeries} options={throughputOptions} />
              <Stack direction='row' flexWrap='wrap' gap={2}>
                <Chip
                  variant='tonal'
                  color={data.summary.netFlowLast30Days >= 0 ? 'success' : 'warning'}
                  label={`Flujo neto 30 dias: ${formatDelta(data.summary.netFlowLast30Days)}`}
                />
                <Chip variant='tonal' color='info' label={`${data.summary.completionRate}% del backlog ya esta completado`} />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ height: '100%' }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Box>
                <Typography variant='h5'>Salud del portfolio</Typography>
                <Typography color='text.secondary'>
                  El porcentaje on-time disponible hoy es la mejor señal ejecutiva real para cartera y predictibilidad.
                </Typography>
              </Box>
              <AppReactApexCharts
                type='radialBar'
                height={280}
                width='100%'
                series={[data.summary.avgOnTimePct]}
                options={onTimeOptions}
              />
              {renderMetricList([
                {
                  label: 'Proyectos saludables',
                  value: String(data.summary.healthyProjects),
                  detail: 'Portafolio con 75% o mas de cumplimiento on-time'
                },
                {
                  label: 'Proyectos bajo observacion',
                  value: String(data.summary.projectsAtRisk),
                  detail: 'Cumplimiento menor a 60% o sin dato confiable'
                },
                {
                  label: 'Comentarios abiertos',
                  value: String(data.summary.openFrameComments),
                  detail: 'Carga actual de feedback sin resolver en el alcance visible'
                }
              ])}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', xl: '1.2fr 1fr' } }}>
        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant='h5'>Mix operativo actual</Typography>
                <Typography color='text.secondary'>
                  Distribucion del trabajo visible entre cola, ejecucion, revision, cambios y cierre.
                </Typography>
              </Box>
              <AppReactApexCharts
                type='bar'
                height={320}
                width='100%'
                series={statusMixSeries}
                options={statusMixOptions}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ height: '100%' }}>
            <Stack spacing={3} sx={{ height: '100%' }}>
              <Box>
                <Typography variant='h5'>Carga por esfuerzo</Typography>
                <Typography color='text.secondary'>
                  No es capacidad contractual todavia, pero si una buena lectura de presion y mezcla de demanda.
                </Typography>
              </Box>
              <AppReactApexCharts
                type='donut'
                height={320}
                width='100%'
                series={effortMixSeries}
                options={effortMixOptions}
              />
              {renderMetricList([
                {
                  label: 'Trabajo activo',
                  value: String(data.summary.activeWorkItems),
                  detail: 'Incluye ejecucion, revision, cambios y tareas bloqueadas'
                },
                {
                  label: 'Trabajo en cola',
                  value: String(data.summary.queuedWorkItems),
                  detail: 'Demanda lista para entrar a la operacion'
                }
              ])}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Card>
        <CardContent>
          <Stack spacing={3}>
            <Box>
              <Typography variant='h5'>Proyectos bajo atencion</Typography>
              <Typography color='text.secondary'>
                El ranking combina salud on-time, carga activa, bloqueos y friccion de revision para priorizar lectura ejecutiva.
              </Typography>
            </Box>
            <Stack spacing={2}>
              {riskProjects.map(project => (
                <Box
                  key={project.id}
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: `1px solid ${theme.palette.divider}`,
                    display: 'grid',
                    gap: 2,
                    gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr 1fr auto' },
                    alignItems: 'center'
                  }}
                >
                  <Stack spacing={0.75}>
                    <Stack direction='row' flexWrap='wrap' gap={1} alignItems='center'>
                      <Typography variant='h6'>{project.name}</Typography>
                      <Chip size='small' label={project.status} color={getProjectTone(project)} variant='outlined' />
                    </Stack>
                    <Typography color='text.secondary'>
                      {project.activeWorkItems} activas, {project.reviewPressureTasks} con revision abierta, {project.blockedTasks}{' '}
                      bloqueadas.
                    </Typography>
                    {project.pageUrl ? (
                      <Link href={project.pageUrl} target='_blank' rel='noreferrer' underline='hover'>
                        Abrir origen en Notion
                      </Link>
                    ) : null}
                  </Stack>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      On-time
                    </Typography>
                    <Typography variant='h6'>{project.onTimePct === null ? 'Sin dato' : `${Math.round(project.onTimePct)}%`}</Typography>
                  </Box>
                  <Box>
                    <Typography variant='body2' color='text.secondary'>
                      Score de atencion
                    </Typography>
                    <Typography variant='h6'>{project.attentionScore.toFixed(1)}</Typography>
                  </Box>
                  <Stack direction='row' gap={1} flexWrap='wrap' justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
                    <Chip size='small' variant='tonal' color='warning' label={`${project.queuedWorkItems} en cola`} />
                    <Chip size='small' variant='tonal' color='info' label={`${project.openFrameComments} comments`} />
                  </Stack>
                </Box>
              ))}
              {riskProjects.length === 0 ? (
                <Box sx={{ p: 4, borderRadius: 3, border: `1px dashed ${theme.palette.divider}` }}>
                  <Typography>No hay proyectos con datos suficientes para este tenant todavia.</Typography>
                </Box>
              ) : null}
            </Stack>
            <Divider />
            <Typography color='text.secondary'>
              Nota: los tiempos de ejecucion, revision y cambios existen en Notion, pero hoy no vienen en formato numerico
              confiable. Esta Fase 2 prioriza velocidad, salud on-time, friccion y mezcla de demanda.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default GreenhouseDashboard
