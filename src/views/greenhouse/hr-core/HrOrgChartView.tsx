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
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { Background, Controls, MiniMap, ReactFlow, type Edge, type NodeTypes, Position, MarkerType } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'

import EmptyState from '@components/greenhouse/EmptyState'
import { GH_COLORS, GH_HR_NAV } from '@/config/greenhouse-nomenclature'
import { buildOrgLeadershipView, type HrOrgLeadershipEdge, type HrOrgLeadershipNode } from '@/lib/reporting-hierarchy/org-chart-leadership'
import type { HrOrgChartEdge, HrOrgChartMemberOption, HrOrgChartNode, HrOrgChartResponse } from '@/types/hr-core'
import { getInitials } from '@/utils/getInitials'

import OrgLeadershipNodeCard, {
  type OrgLeadershipNodeCardData,
  type OrgLeadershipNodeCardNode
} from '@/components/greenhouse/OrgLeadershipNodeCard'
import OrgChartNodeCard, { type OrgChartNodeCardData, type OrgChartNodeCardNode } from '@/components/greenhouse/OrgChartNodeCard'

const TASK407_ARIA_CAMBIAR_LECTURA_DEL_ORGANIGRAMA = "Cambiar lectura del organigrama"


const STRUCTURE_NODE_WIDTH = 320
const STRUCTURE_NODE_HEIGHT = 228
const LEADERSHIP_NODE_WIDTH = 320
const LEADERSHIP_NODE_HEIGHT = 268

const formatNumber = new Intl.NumberFormat('es-CL')

const formatCount = (value: number) => formatNumber.format(value)

const formatRegime = (value: HrOrgChartNode['payRegime']) => {
  if (value === 'chile') return 'Chile'
  if (value === 'international') return 'Internacional'

  return 'Sin dato'
}

type OrgChartViewMode = 'structure' | 'leaders'

const buildLayout = ({
  nodes,
  edges,
  focusedNodeId,
  onFocusMember,
  edgeColor
}: {
  nodes: HrOrgChartNode[]
  edges: HrOrgChartEdge[]
  focusedNodeId: string | null
  onFocusMember: (memberId: string | null) => void
  edgeColor: string
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
      width: STRUCTURE_NODE_WIDTH,
      height: STRUCTURE_NODE_HEIGHT
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
        x: layout.x - STRUCTURE_NODE_WIDTH / 2,
        y: layout.y - STRUCTURE_NODE_HEIGHT / 2
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        node,
        isFocused: focusedNodeId != null && node.nodeId === focusedNodeId,
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
      color: alpha(edgeColor, 0.35)
    },
    style: {
      stroke: alpha(edgeColor, 0.22),
      strokeWidth: 1.5
    }
  }))

  return { layoutedNodes, layoutedEdges }
}

const buildLeadershipLayout = ({
  nodes,
  edges,
  focusedNodeId,
  onFocusMember,
  edgeColor
}: {
  nodes: HrOrgLeadershipNode[]
  edges: HrOrgLeadershipEdge[]
  focusedNodeId: string | null
  onFocusMember: (memberId: string | null) => void
  edgeColor: string
}) => {
  const graph = new dagre.graphlib.Graph()

  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: 'TB',
    ranksep: 92,
    nodesep: 48,
    marginx: 24,
    marginy: 24
  })

  nodes.forEach(node => {
    graph.setNode(node.nodeId, {
      width: LEADERSHIP_NODE_WIDTH,
      height: LEADERSHIP_NODE_HEIGHT
    })
  })

  edges.forEach(edge => {
    graph.setEdge(edge.source, edge.target)
  })

  dagre.layout(graph)

  const layoutedNodes: OrgLeadershipNodeCardNode[] = nodes.map(node => {
    const layout = graph.node(node.nodeId)

    return {
      id: node.nodeId,
      type: 'orgLeadershipNode',
      position: {
        x: layout.x - LEADERSHIP_NODE_WIDTH / 2,
        y: layout.y - LEADERSHIP_NODE_HEIGHT / 2
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      data: {
        node,
        isFocused: focusedNodeId != null && node.nodeId === focusedNodeId,
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
      color: alpha(edgeColor, 0.35)
    },
    style: {
      stroke: alpha(edgeColor, 0.22),
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
          bgcolor: t => option.isCurrentMember ? t.palette.success.lighterOpacity : GH_COLORS.role.development.bg,
          color: t => option.isCurrentMember ? t.palette.success.main : GH_COLORS.role.development.textDark,
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
  const rawViewMode = searchParams.get('view')
  const viewMode: OrgChartViewMode = rawViewMode === 'leaders' ? 'leaders' : 'structure'
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

  const handleViewModeChange = useCallback(
    (_: unknown, nextViewMode: OrgChartViewMode | null) => {
      if (!nextViewMode || nextViewMode === viewMode) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())

      if (nextViewMode === 'structure') {
        params.delete('view')
      } else {
        params.set('view', nextViewMode)
      }

      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname

      router.replace(nextUrl, { scroll: false })
    },
    [pathname, router, searchParams, viewMode]
  )

  const activeFocusMemberId = payload?.focusMemberId ?? focusMemberId ?? payload?.currentMemberId ?? null
  const activeFocusNodeId = payload?.focusNodeId ?? null

  const selectedMember = useMemo(() => {
    if (!payload || !activeFocusMemberId) {
      return null
    }

    return payload.members.find(member => member.memberId === activeFocusMemberId) ?? null
  }, [activeFocusMemberId, payload])

  const focusNodeName = selectedMember?.displayName ?? 'Selecciona una persona'
  const canOpenPeople = Boolean(selectedMember)
  const chartEdgeColor = theme.palette.text.secondary

  const structureChart = useMemo(() => {
    if (!payload) {
      return { layoutedNodes: [], layoutedEdges: [] }
    }

    return buildLayout({
      nodes: payload.nodes,
      edges: payload.edges,
      focusedNodeId: activeFocusNodeId,
      onFocusMember: handleFocusMember,
      edgeColor: chartEdgeColor
    })
  }, [activeFocusNodeId, chartEdgeColor, handleFocusMember, payload])

  const leadershipView = useMemo(() => {
    if (!payload) {
      return { nodes: [], edges: [], focusNodeId: null, focusedLeaderMemberId: null }
    }

    return buildOrgLeadershipView({
      payload,
      focusMemberId: activeFocusMemberId
    })
  }, [activeFocusMemberId, payload])

  const leadershipChart = useMemo(() => {
    return buildLeadershipLayout({
      nodes: leadershipView.nodes,
      edges: leadershipView.edges,
      focusedNodeId: leadershipView.focusNodeId,
      onFocusMember: handleFocusMember,
      edgeColor: chartEdgeColor
    })
  }, [chartEdgeColor, handleFocusMember, leadershipView.edges, leadershipView.focusNodeId, leadershipView.nodes])

  const selectedLeaderNode = useMemo(() => {
    if (!selectedMember) {
      return null
    }

    return (
      leadershipView.nodes.find(node => node.memberId === selectedMember.memberId) ??
      leadershipView.nodes.find(node => node.memberId === leadershipView.focusedLeaderMemberId) ??
      null
    )
  }, [leadershipView.focusedLeaderMemberId, leadershipView.nodes, selectedMember])

  const chart = viewMode === 'leaders' ? leadershipChart : structureChart
  const activeGraphNodeCount = viewMode === 'leaders' ? leadershipView.nodes.length : payload?.nodes.length ?? 0

  const nodeTypes = useMemo<NodeTypes>(() => ({ orgChartNode: OrgChartNodeCard }), [])
  const leadershipNodeTypes = useMemo<NodeTypes>(() => ({ orgLeadershipNode: OrgLeadershipNodeCard }), [])
  const activeNodeTypes = viewMode === 'leaders' ? leadershipNodeTypes : nodeTypes

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

  if (activeGraphNodeCount === 0) {
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

  const chartTitle = viewMode === 'leaders' ? 'Mapa de liderazgo' : 'Mapa estructural'

  const chartSubtitle =
    viewMode === 'leaders'
      ? 'Agrupa líderes visibles y deja sus áreas asociadas como metadata para leer personas antes que cajas organizacionales.'
      : 'Usa zoom, pan y búsqueda para seguir áreas, responsables y personas sin perder el contexto.'

  const viewDescription =
    viewMode === 'leaders'
      ? 'Lectura alternativa por líderes, equipos visibles y áreas asociadas.'
      : 'Estructura por áreas, responsables y adscripción vigente del equipo.'

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
            {viewDescription}
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
            {accessSubtitle}
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button component={Link} href='/hr/team' variant='tonal' color='secondary' startIcon={<i className='tabler-users-group' />}>
            {GH_HR_NAV.team.label}
          </Button>
          <Button component={Link} href='/hr/hierarchy' variant='tonal' color='secondary' startIcon={<i className='tabler-list-search' />}>
            Abrir jerarquía
          </Button>
          <Button component={Link} href={selectedMember ? `/people/${selectedMember.memberId}` : '/people'} variant='contained' startIcon={<i className='tabler-user-search' />}>
            {canOpenPeople ? 'Ver ficha' : 'Abrir People'}
          </Button>
        </Stack>
      </Stack>

      {error ? <Alert severity='warning' onClose={() => setError(null)}>{error}</Alert> : null}

      <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
        <Chip
          size='small'
          label={
            viewMode === 'leaders'
              ? `${formatCount(leadershipView.nodes.length)} líderes`
              : `${formatCount(payload.summary.totalNodes)} nodos`
          }
          variant='outlined'
        />
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
              title={chartTitle}
              subheader={chartSubtitle}
              action={
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                  <ToggleButtonGroup
                    exclusive
                    size='small'
                    value={viewMode}
                    onChange={handleViewModeChange}
                    aria-label={TASK407_ARIA_CAMBIAR_LECTURA_DEL_ORGANIGRAMA}
                  >
                    <ToggleButton value='structure'>Estructura</ToggleButton>
                    <ToggleButton value='leaders'>Líderes y equipos</ToggleButton>
                  </ToggleButtonGroup>
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
                </Stack>
              }
            />
            <Divider />
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, display: 'grid', gap: 2 }}>
                <Autocomplete
                  options={payload.memberOptions}
                  value={
                    selectedMember?.memberId
                      ? payload.memberOptions.find(option => option.memberId === selectedMember.memberId) ?? null
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
                      helperText={
                        viewMode === 'leaders'
                          ? 'La búsqueda mantiene la persona en foco y ancla el mapa en el líder visible más cercano cuando el equipo se agrupa por liderazgo.'
                          : 'La búsqueda centra el mapa sobre las personas visibles y conserva el contexto estructural del área cuando falta la adscripción directa.'
                      }
                    />
                  )}
                />

                <Box
                  sx={{
                    height: { xs: 620, lg: 760 },
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.customColors.lightAlloy}`,
                    overflow: 'hidden',
                    backgroundColor: alpha(theme.palette.background.paper, 0.7)
                  }}
                >
                  <ReactFlow
                    key={`${viewMode}-${viewMode === 'leaders' ? leadershipView.focusNodeId ?? activeFocusMemberId ?? 'org-chart' : activeFocusNodeId ?? activeFocusMemberId ?? 'org-chart'}`}
                    nodes={chart.layoutedNodes as any}
                    edges={chart.layoutedEdges}
                    nodeTypes={activeNodeTypes}
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
                    <Background gap={22} size={1} color={alpha(theme.palette.customColors.lightAlloy ?? '', 0.7)} />
                    <MiniMap
                      zoomable
                      pannable
                      nodeColor={node =>
                        (() => {
                          const nodeData = node.data as OrgChartNodeCardData | OrgLeadershipNodeCardData | undefined

                          if (nodeData?.isFocused) {
                            return theme.palette.info.main
                          }

                          if (nodeData?.node?.isCurrentMember) {
                            return theme.palette.success.main
                          }

                          return theme.palette.text.secondary
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
                  src={selectedMember?.avatarUrl || undefined}
                  sx={{
                    bgcolor: selectedMember?.isCurrentMember ? theme.palette.success.lighterOpacity : GH_COLORS.role.development.bg,
                    color: selectedMember?.isCurrentMember ? theme.palette.success.main : GH_COLORS.role.development.textDark
                  }}
                >
                  {selectedMember ? getInitials(selectedMember.displayName) : 'GH'}
                </Avatar>
              }
              title={focusNodeName}
              subheader={selectedMember ? selectedMember.roleTitle ?? 'Sin cargo visible' : 'Selecciona una persona para ver el detalle del foco.'}
            />
            <Divider />
            <CardContent>
              {selectedMember ? (
                <Stack spacing={2.25}>
                  {viewMode === 'leaders' ? (
                    selectedLeaderNode && selectedLeaderNode.memberId !== selectedMember.memberId ? (
                      <Alert severity='info'>
                        Esta lectura agrupa por liderazgo. Mantuvimos a {selectedMember.displayName} en foco y anclamos el mapa en {selectedLeaderNode.displayName}, que es la referencia visible más cercana para su equipo.
                      </Alert>
                    ) : selectedLeaderNode?.associatedDepartments.length ? (
                      <Alert severity='info'>
                        Esta vista prioriza personas líderes. Las áreas que coordina {selectedLeaderNode.displayName} quedan resumidas como metadata dentro del nodo y del panel lateral.
                      </Alert>
                    ) : null
                  ) : selectedMember.isDepartmentHead ? (
                    <Alert severity='info'>
                      Esta persona lidera el área enfocada. El organigrama estructural representa esa relación dentro del nodo del departamento para no duplicarla como hija de su propia área.
                    </Alert>
                  ) : selectedMember.placementMode === 'inferred_department' ? (
                    <Alert severity='info'>
                      La adscripción estructural directa de esta persona sigue pendiente. La vista la mantiene dentro del área visible más cercana para no romper el contexto organizacional.
                    </Alert>
                  ) : null}

                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    {selectedMember.isCurrentMember ? <Chip size='small' label='Mi posición' color='primary' variant='outlined' /> : null}
                    {selectedMember.isDirectReportToCurrentMember ? <Chip size='small' label='Reporte directo' color='success' variant='outlined' /> : null}
                    {selectedMember.hasActiveDelegation ? <Chip size='small' label='Delegación activa' color='warning' variant='outlined' /> : null}
                    {selectedMember.isDepartmentHead ? <Chip size='small' label='Responsable de área' color='info' variant='outlined' /> : null}
                    {selectedMember.placementMode === 'inferred_department' ? (
                      <Chip size='small' label='Contexto heredado' color='secondary' variant='outlined' />
                    ) : null}
                    {viewMode === 'leaders' && selectedLeaderNode ? (
                      <Chip size='small' label='Lectura por liderazgo' color='primary' variant='outlined' />
                    ) : null}
                  </Stack>

                  <Box sx={{ display: 'grid', gap: 1.25, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                    <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.customColors.lightAlloy}`, bgcolor: theme.palette.background.default }}>
                      <Typography variant='caption' color='text.secondary'>
                        Adscripción
                      </Typography>
                      <Typography variant='body2' sx={{ mt: 0.25 }} noWrap title={selectedMember.departmentName ?? 'Sin adscripción directa'}>
                        {selectedMember.departmentName ?? 'Sin adscripción directa'}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.customColors.lightAlloy}`, bgcolor: theme.palette.background.default }}>
                      <Typography variant='caption' color='text.secondary'>
                        {viewMode === 'leaders' ? 'Área principal' : 'Contexto estructural'}
                      </Typography>
                      <Typography
                        variant='body2'
                        sx={{ mt: 0.25 }}
                        noWrap
                        title={
                          viewMode === 'leaders'
                            ? selectedLeaderNode?.associatedDepartments.find(department => department.isPrimary)?.name ??
                              selectedLeaderNode?.associatedDepartments[0]?.name ??
                              selectedMember.contextDepartmentName ??
                              'Sin contexto visible'
                            : selectedMember.contextDepartmentName ?? 'Sin contexto visible'
                        }
                      >
                        {viewMode === 'leaders'
                          ? selectedLeaderNode?.associatedDepartments.find(department => department.isPrimary)?.name ??
                            selectedLeaderNode?.associatedDepartments[0]?.name ??
                            selectedMember.contextDepartmentName ??
                            'Sin contexto visible'
                          : selectedMember.contextDepartmentName ?? 'Sin contexto visible'}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.customColors.lightAlloy}`, bgcolor: theme.palette.background.default }}>
                      <Typography variant='caption' color='text.secondary'>
                        Régimen
                      </Typography>
                      <Typography variant='body2' sx={{ mt: 0.25 }}>
                        {formatRegime(selectedMember.payRegime)}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.customColors.lightAlloy}`, bgcolor: theme.palette.background.default }}>
                      <Typography variant='caption' color='text.secondary'>
                        Supervisor formal
                      </Typography>
                      <Typography variant='body2' sx={{ mt: 0.25 }} noWrap title={selectedMember.supervisorName ?? 'Sin dato'}>
                        {selectedMember.supervisorName ?? 'Sin dato'}
                      </Typography>
                    </Box>
                  </Box>

                  {viewMode === 'leaders' && selectedLeaderNode ? (
                    <Box sx={{ p: 1.5, borderRadius: 2, border: `1px solid ${theme.palette.customColors.lightAlloy}`, bgcolor: theme.palette.background.default }}>
                      <Typography variant='caption' color='text.secondary'>
                        Áreas lideradas en esta vista
                      </Typography>
                      <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap sx={{ mt: 1 }}>
                        {selectedLeaderNode.associatedDepartments.length > 0 ? (
                          selectedLeaderNode.associatedDepartments.map(department => (
                            <Chip
                              key={department.departmentId}
                              size='small'
                              label={`${department.name} · ${department.memberCount} miembro${department.memberCount !== 1 ? 's' : ''}`}
                              color={department.isPrimary ? 'primary' : 'default'}
                              variant={department.isPrimary ? 'outlined' : 'filled'}
                            />
                          ))
                        ) : (
                          <Typography variant='body2' color='text.secondary'>
                            Sin áreas lideradas visibles para este scope.
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                  ) : null}

                  <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                    <Chip size='small' label={`Directos ${formatCount(selectedMember.directReportsCount)}`} variant='outlined' />
                    <Chip size='small' label={`Subárbol ${formatCount(selectedMember.subtreeSize)}`} variant='outlined' />
                    <Chip
                      size='small'
                      label={
                        viewMode === 'leaders'
                          ? `Profundidad ${formatCount(selectedLeaderNode?.depth ?? 0)}`
                          : `Profundidad ${formatCount(payload.nodes.find(node => node.nodeId === activeFocusNodeId)?.depth ?? 0)}`
                      }
                      variant='outlined'
                    />
                  </Stack>

                  <Box>
                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mb: 1 }}>
                      {viewMode === 'leaders' ? 'Ruta visible' : 'Ruta estructural'}
                    </Typography>
                    <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                      {payload.breadcrumbs.map(crumb => (
                        <Chip
                          key={crumb.nodeId}
                          label={crumb.label}
                          size='small'
                          variant={crumb.memberId === selectedMember.memberId ? 'filled' : 'outlined'}
                          color={crumb.memberId === selectedMember.memberId ? 'primary' : 'default'}
                          clickable={Boolean(crumb.memberId)}
                          onClick={() => handleFocusMember(crumb.memberId)}
                        />
                      ))}
                    </Stack>
                  </Box>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    <Button
                      component={Link}
                      href={`/people/${selectedMember.memberId}`}
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
