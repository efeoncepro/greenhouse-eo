'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HTMLAttributes } from 'react'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { Background, Controls, MiniMap, ReactFlow, type Edge, type NodeTypes, Position, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'

import EmptyState from '@components/greenhouse/EmptyState'
import { GH_COLORS, GH_HR_NAV } from '@/config/greenhouse-nomenclature'
import type { HrOrgChartEdge, HrOrgChartMemberOption, HrOrgChartNode, HrOrgChartResponse } from '@/types/hr-core'
import { getInitials } from '@/utils/getInitials'

import OrgChartNodeCard, { type OrgChartNodeCardData, type OrgChartNodeCardNode } from '@/components/greenhouse/OrgChartNodeCard'

const NODE_WIDTH = 320
const NODE_HEIGHT = 228

const formatNumber = new Intl.NumberFormat('es-CL')

const formatCount = (value: number) => formatNumber.format(value)

const formatRegime = (value: HrOrgChartNode['payRegime']) => {
  if (value === 'chile') return 'Chile'
  if (value === 'international') return 'Internacional'

  return 'Sin dato'
}

const buildLayout = ({
  nodes,
  edges,
  focusedMemberId,
  onFocusMember
}: {
  nodes: HrOrgChartNode[]
  edges: HrOrgChartEdge[]
  focusedMemberId: string | null
  onFocusMember: (memberId: string | null) => void
}) => {
  const graph = new dagre.graphlib.Graph()

  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: 'TB',
    ranksep: 82,
    nodesep: 42,
    marginx: 24,
    marginy: 24
  })

  nodes.forEach(node => {
    graph.setNode(node.nodeId, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT
    })
  })

  edges.forEach(edge => {
    graph.setEdge(edge.source, edge.target)
  })

  dagre.layout(graph)

  const layoutedNodes: OrgChartNodeCardNode[] = nodes.map(node => {
    const layout = graph.node(node.nodeId)

    return {
      id: node.nodeId,
      type: 'orgChartNode',
      position: {
        x: layout.x - NODE_WIDTH / 2,
        y: layout.y - NODE_HEIGHT / 2
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        node,
        isFocused: focusedMemberId != null && node.memberId === focusedMemberId,
        onFocusMember
      }
    }
  })

  const layoutedEdges: Edge[] = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    animated: false,
    selectable: false,
    focusable: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: alpha(GH_COLORS.neutral.textSecondary, 0.35)
    },
    style: {
      stroke: alpha(GH_COLORS.neutral.textSecondary, 0.22),
      strokeWidth: 1.5
    }
  }))

  return { layoutedNodes, layoutedEdges }
}

const renderOption = (props: HTMLAttributes<HTMLLIElement>, option: HrOrgChartMemberOption) => (
  <li {...props}>
    <Stack direction='row' spacing={1.5} alignItems='center' sx={{ minWidth: 0, width: '100%' }}>
      <Avatar
        src={option.avatarUrl || undefined}
        sx={{
          width: 32,
          height: 32,
          bgcolor: option.isCurrentMember ? GH_COLORS.semantic.success.bg : GH_COLORS.role.development.bg,
          color: option.isCurrentMember ? GH_COLORS.semantic.success.text : GH_COLORS.role.development.textDark,
          flexShrink: 0
        }}
      >
        {getInitials(option.displayName)}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant='body2' fontWeight={600} noWrap title={option.displayName}>
          {option.displayName}
        </Typography>
        <Typography variant='caption' color='text.secondary' noWrap title={option.roleTitle ?? 'Sin cargo visible'}>
          {option.roleTitle ?? 'Sin cargo visible'}
          {option.departmentName ? ` · ${option.departmentName}` : ''}
        </Typography>
      </Box>
      {option.isCurrentMember ? <Chip size='small' label='Tú' color='primary' variant='outlined' /> : null}
    </Stack>
  </li>
)

const HrOrgChartView = () => {
  const theme = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const focusMemberId = searchParams.get('focusMemberId')
  const hasLoadedRef = useRef(false)

  const [payload, setPayload] = useState<HrOrgChartResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOrgChart = useCallback(async (requestedFocusMemberId: string | null, signal?: AbortSignal) => {
    if (hasLoadedRef.current) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const params = new URLSearchParams()

      if (requestedFocusMemberId) {
        params.set('focusMemberId', requestedFocusMemberId)
      }

      const response = await fetch(`/api/hr/core/org-chart${params.toString() ? `?${params.toString()}` : ''}`, {
        signal
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)

        throw new Error(body?.error || 'No fue posible cargar el organigrama.')
      }

      setPayload(await response.json())
      hasLoadedRef.current = true
    } catch (loadError: any) {
      if (loadError?.name !== 'AbortError') {
        setError(loadError?.message || 'No fue posible cargar el organigrama.')
        hasLoadedRef.current = true
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    void loadOrgChart(focusMemberId, controller.signal)

    return () => controller.abort()
  }, [focusMemberId, loadOrgChart])

  const handleFocusMember = useCallback(
    (memberId: string | null) => {
      const params = new URLSearchParams(searchParams.toString())

      if (memberId) {
        params.set('focusMemberId', memberId)
      } else {
        params.delete('focusMemberId')
      }

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname

      router.replace(nextUrl, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const activeFocusMemberId = payload?.focusMemberId ?? focusMemberId ?? payload?.currentMemberId ?? null

  const selectedNode = useMemo(() => {
    if (!payload || !activeFocusMemberId) {
      return null
    }

    return payload.nodes.find(node => node.nodeType === 'member' && node.memberId === activeFocusMemberId) ?? null
  }, [activeFocusMemberId, payload])

  const focusNodeName = selectedNode?.displayName ?? 'Selecciona una persona'
  const canOpenPeople = Boolean(selectedNode)

  const chart = useMemo(() => {
    if (!payload) {
      return { layoutedNodes: [], layoutedEdges: [] }
    }

    return buildLayout({
      nodes: payload.nodes,
      edges: payload.edges,
      focusedMemberId: activeFocusMemberId,
      onFocusMember: handleFocusMember
    })
  }, [activeFocusMemberId, handleFocusMember, payload])

  const nodeTypes = useMemo<NodeTypes>(() => ({ orgChartNode: OrgChartNodeCard }), [])

  if (loading && !payload) {
    return (
      <Stack spacing={4}>
        <Skeleton variant='rounded' height={56} />
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Skeleton variant='rounded' height={760} />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Skeleton variant='rounded' height={760} />
          </Grid>
        </Grid>
      </Stack>
    )
  }

  if (!payload) {
    return (
      <EmptyState
        icon='tabler-hierarchy-3'
        title='No pudimos cargar el organigrama'
        description={error || 'Intenta recargar la vista para seguir explorando la jerarquía.'}
        action={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <Button variant='contained' onClick={() => void loadOrgChart(focusMemberId)} startIcon={<i className='tabler-refresh' />}>
              Reintentar
            </Button>
            <Button component={Link} href='/hr/hierarchy' variant='tonal' color='secondary' startIcon={<i className='tabler-list-search' />}>
              Abrir jerarquía
            </Button>
          </Stack>
        }
        minHeight={340}
      />
    )
  }

  if (payload.nodes.length === 0) {
    return (
      <Stack spacing={3}>
        {error ? <Alert severity='warning' onClose={() => setError(null)}>{error}</Alert> : null}
        <EmptyState
          icon='tabler-hierarchy-3'
          title='No hay nodos visibles'
          description='No hay personas visibles para este scope en este momento. Abre la jerarquía tabular para revisar el árbol base.'
          action={
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button component={Link} href='/hr/hierarchy' variant='contained' startIcon={<i className='tabler-list-search' />}>
                Abrir jerarquía
              </Button>
              <Button component={Link} href='/people' variant='tonal' color='secondary' startIcon={<i className='tabler-users-group' />}>
                Abrir People
              </Button>
            </Stack>
          }
          minHeight={340}
        />
      </Stack>
    )
  }

  const accessLabel = payload.accessMode === 'broad' ? 'Vista completa' : 'Scope supervisor'

  const accessSubtitle =
    payload.accessMode === 'broad'
      ? 'Exploras la estructura organizacional completa visible para tu perfil.'
      : 'La vista se recorta al subárbol organizacional visible para tu alcance.'

  return (
    <Stack spacing={4}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={3}>
        <Box>
          <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
            <Typography variant='h4'>{GH_HR_NAV.orgChart.label}</Typography>
            <Chip size='small' label={accessLabel} variant='outlined' />
            {refreshing ? <Chip size='small' label='Actualizando' color='info' variant='outlined' /> : null}
          </Stack>
          <Typography variant='body2' color='text.secondary'>
            Estructura por áreas, responsables y adscripción vigente del equipo.
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {accessSubtitle}
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button component={Link} href='/hr/hierarchy' variant='tonal' color='secondary' startIcon={<i className='tabler-list-search' />}>
            Abrir jerarquía
          </Button>
          <Button component={Link} href={selectedNode ? `/people/${selectedNode.memberId}` : '/people'} variant='contained' startIcon={<i className='tabler-user-search' />}>
            {canOpenPeople ? 'Ver ficha' : 'Abrir People'}
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity='warning' onClose={() => setError(null)}>{error}</Alert> : null}

      <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
        <Chip size='small' label={`${formatCount(payload.summary.totalNodes)} nodos`} variant='outlined' />
        <Chip size='small' label={`${formatCount(payload.summary.departments)} áreas`} variant='outlined' />
        <Chip size='small' label={`${formatCount(payload.summary.members)} personas`} variant='outlined' />
        <Chip size='small' label={`${formatCount(payload.summary.roots)} raíces`} variant='outlined' />
        <Chip size='small' label={`Profundidad ${payload.summary.maxDepth}`} variant='outlined' />
        <Chip size='small' label={`${formatCount(payload.summary.delegatedApprovals)} delegaciones`} variant='outlined' />
        {payload.currentMemberId ? <Chip size='small' label='Mi posición marcada' color='primary' variant='outlined' /> : null}
      </Stack>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ overflow: 'hidden' }}>
            <CardHeader
              title='Mapa estructural'
              subheader='Usa zoom, pan y búsqueda para seguir áreas, responsables y personas sin perder el contexto.'
              action={
                <Button
                  size='small'
                  variant='tonal'
                  color='secondary'
                  onClick={() => handleFocusMember(payload.currentMemberId)}
                  disabled={!payload.currentMemberId}
                  startIcon={<i className='tabler-badge' />}
                >
                  Mi posición
                </Button>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, display: 'grid', gap: 2 }}>
                <Autocomplete
                  options={payload.memberOptions}
                  value={
                    selectedNode?.memberId
                      ? payload.memberOptions.find(option => option.memberId === selectedNode.memberId) ?? null
                      : null
                  }
                  onChange={(_, value) => handleFocusMember(value?.memberId ?? null)}
                  isOptionEqualToValue={(option, value) => option.memberId === value.memberId}
                  getOptionLabel={option => option.displayName}
                  renderOption={renderOption}
                  noOptionsText='No hay personas visibles con ese nombre.'
                  renderInput={params => (
                    <TextField
                      {...params}
                      label='Buscar persona'
                      placeholder='Escribe un nombre o cargo'
                      helperText='La búsqueda centra el mapa sobre las personas visibles y conserva el contexto por área o supervisor cuando falta la adscripción estructural.'
                    />
                  )}
                />

                <Box
                  sx={{
                    height: { xs: 620, lg: 760 },
                    borderRadius: 2,
                    border: `1px solid ${GH_COLORS.neutral.border}`,
                    overflow: 'hidden',
                    backgroundColor: alpha(theme.palette.background.paper, 0.7)
                  }}
                >
                  <ReactFlow
                    key={activeFocusMemberId ?? 'org-chart'}
                    nodes={chart.layoutedNodes}
                    edges={chart.layoutedEdges}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2, duration: 350, minZoom: 0.18, maxZoom: 1.5 }}
                    minZoom={0.18}
                    maxZoom={1.6}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    panOnScroll
                    panOnDrag
                    zoomOnScroll
                    zoomOnPinch
                    preventScrolling={false}
                    proOptions={{ hideAttribution: true }}
                    defaultEdgeOptions={{
                      type: 'smoothstep'
                    }}
                    defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
                  >
                    <Background gap={22} size={1} color={alpha(GH_COLORS.neutral.border, 0.7)} />
                    <MiniMap
                      zoomable
                      pannable
                      nodeColor={node =>
                        (() => {
                          const nodeData = node.data as OrgChartNodeCardData | undefined

                          if (nodeData?.isFocused) {
                            return GH_COLORS.semantic.info.source
                          }

                          if (nodeData?.node?.isCurrentMember) {
                            return GH_COLORS.semantic.success.source
                          }

                          return GH_COLORS.neutral.textSecondary
                        })()
                      }
                      nodeStrokeWidth={2}
                    />
                    <Controls showInteractive={false} position='bottom-right' />
                  </ReactFlow>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ position: { lg: 'sticky' }, top: { lg: 24 } }}>
            <CardHeader
              avatar={
                <Avatar
                  src={selectedNode?.avatarUrl || undefined}
                  sx={{
                    bgcolor: selectedNode?.isCurrentMember ? GH_COLORS.semantic.success.bg : GH_COLORS.role.development.bg,
                    color: selectedNode?.isCurrentMember ? GH_COLORS.semantic.success.text : GH_COLORS.role.development.textDark
                  }}
                >
                  {selectedNode ? getInitials(selectedNode.displayName) : 'GH'}
                </Avatar>
              }
              title={focusNodeName}
              subheader={selectedNode ? selectedNode.roleTitle ?? 'Sin cargo visible' : 'Selecciona una persona para ver el detalle del foco.'}
            />
            <Divider />
            <CardContent>
              {selectedNode ? (
                <Stack spacing={2.25}>
                  {selectedNode.placementMode === 'supervisor' ? (
                    <Alert severity='info'>
                      Esta persona aparece bajo su supervisor formal porque todavía no tiene adscripción estructural de departamento.
                    </Alert>
                  ) : null}

	                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
	                    {selectedNode.isCurrentMember ? <Chip size='small' label='Mi posición' color='primary' variant='outlined' /> : null}
	                    {selectedNode.isDirectReportToCurrentMember ? <Chip size='small' label='Reporte directo' color='success' variant='outlined' /> : null}
	                    {selectedNode.hasActiveDelegation ? <Chip size='small' label='Delegación activa' color='warning' variant='outlined' /> : null}
	                    {selectedNode.isDepartmentHead ? <Chip size='small' label='Responsable de área' color='info' variant='outlined' /> : null}
                      {selectedNode.placementMode === 'supervisor' ? (
                        <Chip size='small' label='Ubicación visual por supervisor' color='secondary' variant='outlined' />
                      ) : null}
	                  </Stack>

                  <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${GH_COLORS.neutral.border}`, bgcolor: GH_COLORS.neutral.bgSurface }}>
                      <Typography variant='caption' color='text.secondary'>
                        Adscripción
                      </Typography>
                      <Typography variant='body2' sx={{ mt: 0.25 }} noWrap title={selectedNode.departmentName ?? 'Sin adscripción directa'}>
                        {selectedNode.departmentName ?? 'Sin adscripción directa'}
                      </Typography>
                    </Box>
	                    <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${GH_COLORS.neutral.border}`, bgcolor: GH_COLORS.neutral.bgSurface }}>
	                      <Typography variant='caption' color='text.secondary'>
	                        Contexto visual
	                      </Typography>
	                      <Typography
                          variant='body2'
                          sx={{ mt: 0.25 }}
                          noWrap
                          title={selectedNode.contextDepartmentName ?? selectedNode.visualParentLabel ?? 'Sin contexto visible'}
                        >
	                        {selectedNode.contextDepartmentName ?? selectedNode.visualParentLabel ?? 'Sin contexto visible'}
	                      </Typography>
	                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${GH_COLORS.neutral.border}`, bgcolor: GH_COLORS.neutral.bgSurface }}>
                      <Typography variant='caption' color='text.secondary'>
                        Régimen
                      </Typography>
                      <Typography variant='body2' sx={{ mt: 0.25 }}>
                        {formatRegime(selectedNode.payRegime)}
                      </Typography>
                    </Box>
	                    <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${GH_COLORS.neutral.border}`, bgcolor: GH_COLORS.neutral.bgSurface }}>
	                      <Typography variant='caption' color='text.secondary'>
	                        Supervisor formal
	                      </Typography>
	                      <Typography variant='body2' sx={{ mt: 0.25 }} noWrap title={selectedNode.supervisorName ?? 'Sin dato'}>
	                        {selectedNode.supervisorName ?? 'Sin dato'}
	                      </Typography>
	                    </Box>
	                  </Box>

	                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
	                    <Chip size='small' label={`Directos ${formatCount(selectedNode.directReportsCount)}`} variant='outlined' />
	                    <Chip size='small' label={`Subárbol ${formatCount(selectedNode.subtreeSize)}`} variant='outlined' />
	                    <Chip size='small' label={`Profundidad ${selectedNode.depth}`} variant='outlined' />
	                  </Stack>

	                  <Box>
	                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
	                      Ruta estructural
	                    </Typography>
	                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
	                      {payload.breadcrumbs.map(crumb => (
	                        <Chip
	                          key={crumb.nodeId}
	                          label={crumb.label}
	                          size='small'
	                          variant={crumb.memberId === selectedNode.memberId ? 'filled' : 'outlined'}
	                          color={crumb.memberId === selectedNode.memberId ? 'primary' : 'default'}
	                          clickable={Boolean(crumb.memberId)}
	                          onClick={() => handleFocusMember(crumb.memberId)}
	                        />
	                      ))}
                    </Stack>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      component={Link}
                      href={`/people/${selectedNode.memberId}`}
                      variant='contained'
                      startIcon={<i className='tabler-user-search' />}
                      fullWidth
                    >
                      Ver ficha
                    </Button>
                    <Button
                      component={Link}
                      href='/hr/hierarchy'
                      variant='tonal'
                      color='secondary'
                      startIcon={<i className='tabler-list-search' />}
                      fullWidth
                    >
                      Abrir jerarquía
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <EmptyState
                  icon='tabler-user-search'
                  title='Selecciona una persona'
                  description='Haz foco sobre un nodo o usa la búsqueda para revisar su lugar en la cadena.'
                  minHeight={260}
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}

export default HrOrgChartView
