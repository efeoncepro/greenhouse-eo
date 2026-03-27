'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'
import HorizontalWithSubtitle from '@components/card-statistics/HorizontalWithSubtitle'

import type { OrganizationDetailData } from '../types'

// ── Types for Snapshot ──

interface ExecutiveSnapshot {
  organizationId: string
  periodYear: number
  periodMonth: number
  economics: {
    totalRevenueClp: number
    totalLaborCostClp: number
    adjustedMarginClp: number
    adjustedMarginPercent: number | null
    activeFte: number | null
    clientCount: number
  } | null
  delivery: {
    totalProjects: number
    activeProjects: number
    totalTasks: number
    completedTasks: number
    avgRpa: number
    overallHealth: 'green' | 'yellow' | 'red'
  } | null
  operations: {
    rpaAvg: number
    otdPct: number
    ftr_pct: number
    throughputCount: number
    pipelineVelocity: number
    activeTasks: number
  } | null
  taxHealth: {
    overallCoveragePercent: number
    discrepancyCount: number
    orphanDteCount: number
  } | null
  computedAt: string
}

// ── Helpers ──

const formatCLP = (amount: number): string =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount)

const marginColor = (value: number | null): 'success' | 'warning' | 'error' | 'secondary' => {
  if (value == null) return 'secondary'
  if (value >= 30) return 'success'
  if (value >= 15) return 'warning'

  return 'error'
}

const healthColor = (health: string | undefined): 'success' | 'warning' | 'error' | 'secondary' => {
  if (health === 'green') return 'success'
  if (health === 'yellow') return 'warning'
  if (health === 'red') return 'error'

  return 'secondary'
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'secondary'> = {
  active: 'success',
  inactive: 'secondary',
  prospect: 'warning'
}

const OrganizationOverviewTab = ({ detail }: Props) => {
  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      try {
        const res = await fetch(`/api/organizations/${detail.organizationId}/executive`)

        if (res.ok) {
          setSnapshot(await res.json())
        }
      } catch (error) {
        console.error('Failed to fetch executive snapshot:', error)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [detail.organizationId])

  const spaces = detail.spaces ?? []

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Grid container spacing={6}>
      {/* Executive KPIs */}
      {snapshot && (
        <>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Ingresos (Snapshot)'
              stats={snapshot.economics ? formatCLP(snapshot.economics.totalRevenueClp) : '—'}
              subtitle={snapshot.economics?.activeFte ? `${snapshot.economics.activeFte.toFixed(1)} FTE proyectados` : 'Sin datos económicos'}
              avatarIcon='tabler-currency-dollar'
              avatarColor='primary'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Margen Ajustado'
              stats={snapshot.economics?.adjustedMarginPercent != null ? `${snapshot.economics.adjustedMarginPercent.toFixed(1)}%` : '—'}
              subtitle='Rentabilidad estimada'
              avatarIcon='tabler-chart-pie'
              avatarColor={marginColor(snapshot.economics?.adjustedMarginPercent ?? null)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Delivery Health'
              stats={snapshot.delivery ? `${snapshot.delivery.activeProjects} / ${snapshot.delivery.totalProjects}` : '—'}
              subtitle='Proyectos Activos'
              avatarIcon='tabler-rocket'
              avatarColor={healthColor(snapshot.delivery?.overallHealth)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <HorizontalWithSubtitle
              title='Tax Coverage'
              stats={snapshot.taxHealth ? `${snapshot.taxHealth.overallCoveragePercent.toFixed(1)}%` : '—'}
              subtitle={`${snapshot.taxHealth?.discrepancyCount ?? 0} discrepancias`}
              avatarIcon='tabler-reconciliation'
              avatarColor={snapshot.taxHealth && snapshot.taxHealth.discrepancyCount > 0 ? 'warning' : 'success'}
            />
          </Grid>

          {/* Operational Details (ICO) */}
          {snapshot.operations && (
            <Grid size={{ xs: 12 }}>
              <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
                <CardHeader
                  title='Rendimiento Operativo (ICO)'
                  subheader='Métricas de eficiencia y throughput en tiempo real'
                  avatar={
                    <Avatar variant='rounded' sx={{ bgcolor: 'secondary.lightOpacity' }}>
                      <i className='tabler-bolt' style={{ fontSize: 22, color: 'var(--mui-palette-secondary-main)' }} />
                    </Avatar>
                  }
                />
                <Divider />
                <CardContent>
                  <Grid container spacing={4}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant='h5' sx={{ mb: 1 }}>{snapshot.operations.rpaAvg.toFixed(1)}</Typography>
                        <Typography variant='body2' color='text.secondary'>Ratio RpA (Consumo)</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant='h5' sx={{ mb: 1 }}>{snapshot.operations.otdPct.toFixed(0)}%</Typography>
                        <Typography variant='body2' color='text.secondary'>On-Time Delivery</Typography>
                      </Box>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant='h5' sx={{ mb: 1 }}>{snapshot.operations.throughputCount}</Typography>
                        <Typography variant='body2' color='text.secondary'>Throughput (Tareas/mes)</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}
        </>
      )}

      {/* Spaces Table */}
      <Grid size={{ xs: 12 }}>
        <Card elevation={0} sx={{ border: t => `1px solid ${t.palette.divider}` }}>
          <CardHeader
            title={`Spaces (${spaces.length})`}
            subheader='Tenants operativos asociados a esta organización'
            avatar={
              <Avatar variant='rounded' sx={{ bgcolor: 'info.lightOpacity' }}>
                <i className='tabler-layout-grid' style={{ fontSize: 22, color: 'var(--mui-palette-info-main)' }} />
              </Avatar>
            }
          />
          <Divider />
          {spaces.length === 0 ? (
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 4 }} role='status'>
                <Typography variant='h6' sx={{ mb: 1 }}>Sin Spaces</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Esta organización aún no tiene tenants operativos asociados.
                </Typography>
              </Box>
            </CardContent>
          ) : (
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Space</TableCell>
                    <TableCell>ID</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Client ID</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {spaces.map(space => (
                    <TableRow key={space.spaceId} hover>
                      <TableCell>
                        <Typography variant='body2' fontWeight={600}>
                          {space.clientId ? (
                            <Link
                              href={`/admin/tenants/${space.clientId}`}
                              style={{ color: 'inherit', textDecoration: 'none' }}
                            >
                              {space.spaceName}
                            </Link>
                          ) : (
                            space.spaceName
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {space.publicId}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant='body2' color='text.secondary'>{space.spaceType}</Typography>
                      </TableCell>
                      <TableCell>
                        <CustomChip
                          round='true'
                          size='small'
                          variant='tonal'
                          color={STATUS_COLOR[space.status] ?? 'secondary'}
                          label={space.status}
                        />
                      </TableCell>
                      <TableCell>
                        {space.clientId ? (
                          <Typography variant='body2' sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {space.clientId}
                          </Typography>
                        ) : (
                          <Typography variant='body2' color='text.secondary'>—</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Grid>
    </Grid>
  )
}

type Props = {
  detail: OrganizationDetailData
}

export default OrganizationOverviewTab
