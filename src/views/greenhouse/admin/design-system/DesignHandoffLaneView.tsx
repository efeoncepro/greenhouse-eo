'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'
import { typographyScale } from '@/components/theme/typography-tokens'
import {
  AdaptiveSidecarLayout,
  CompositionShell,
  ContextualSidecar,
  GreenhouseButton,
  GreenhouseChip
} from '@/components/greenhouse/primitives'
import { parseFigmaUrl } from '@/lib/design-system/figma-nodes/parse-figma-url'
import type {
  DesignHandoffAllowedFile,
  DesignHandoffEntry,
  DesignHandoffKind,
  DesignHandoffStatus
} from '@/lib/design-system/handoff/types'

import { DESIGN_SYSTEM_LAB_TOKENS } from './design-system-lab-tokens'

type ApiState = 'idle' | 'loading' | 'ready' | 'error'
type PreviewState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'blocked'

interface HandoffResponse {
  entries: DesignHandoffEntry[]
  allowedFiles: DesignHandoffAllowedFile[]
}

const STATUS_LABELS: Record<DesignHandoffStatus, string> = {
  proposed: 'Propuesto',
  in_implementation: 'En implementación',
  implemented: 'Implementado',
  archived: 'Archivado'
}

const STATUS_TONES: Record<DesignHandoffStatus, 'default' | 'info' | 'success' | 'warning'> = {
  proposed: 'warning',
  in_implementation: 'info',
  implemented: 'success',
  archived: 'default'
}

const KIND_LABELS: Record<DesignHandoffKind, string> = {
  page: 'Página',
  component: 'Componente'
}

const sortEntries = (entries: DesignHandoffEntry[]) =>
  [...entries].sort((a, b) => {
    const statusOrder: Record<DesignHandoffStatus, number> = {
      in_implementation: 0,
      proposed: 1,
      implemented: 2,
      archived: 3
    }

    return statusOrder[a.status] - statusOrder[b.status] || b.updatedAt.localeCompare(a.updatedAt)
  })

const parseErrorPayload = async (res: Response, fallback: string) => {
  const payload = (await res.json().catch(() => null)) as { error?: string } | null

  return payload?.error ?? fallback
}

const PreviewPane = ({
  imageUrl,
  state,
  nodeId
}: {
  imageUrl: string | null
  state: PreviewState
  nodeId: string | null
}) => (
  <Box
    data-capture='design-system-handoff-preview'
    sx={theme => ({
      display: 'grid',
      minBlockSize: 180,
      placeItems: 'center',
      overflow: 'hidden',
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: alpha(theme.palette.primary.main, 0.035)
    })}
  >
    {state === 'loading' ? (
      <Stack spacing={2} sx={{ inlineSize: '100%', p: 4 }}>
        <LinearProgress />
        <Typography variant='body2' color='text.secondary' align='center'>
          Renderizando preview desde Figma
        </Typography>
      </Stack>
    ) : imageUrl ? (
      <Box
        component='img'
        alt='Preview del nodo Figma seleccionado'
        src={imageUrl}
        sx={{ display: 'block', maxInlineSize: '100%', maxBlockSize: 260, objectFit: 'contain' }}
      />
    ) : (
      <Stack spacing={1.5} alignItems='center' sx={{ p: 4, textAlign: 'center' }}>
        <AxisWordmark variant='isotype' height={44} />
        <Typography variant='subtitle2'>Preview no disponible</Typography>
        <Typography variant='body2' color='text.secondary'>
          {state === 'blocked'
            ? 'El archivo aún no está aprobado para handoff de producto.'
            : nodeId
              ? `Nodo ${nodeId}`
              : 'Pega una URL de Figma para revisar el nodo.'}
        </Typography>
      </Stack>
    )}
  </Box>
)

const EntryCard = ({
  entry,
  active,
  onSelect
}: {
  entry: DesignHandoffEntry
  active: boolean
  onSelect: (entry: DesignHandoffEntry) => void
}) => (
  <Box
    component='button'
    type='button'
    onClick={() => onSelect(entry)}
    data-capture='design-system-handoff-entry'
    sx={theme => ({
      inlineSize: '100%',
      minInlineSize: 0,
      p: DESIGN_SYSTEM_LAB_TOKENS.spacing.compactGroup,
      textAlign: 'start',
      cursor: 'pointer',
      color: 'text.primary',
      bgcolor: active ? alpha(theme.palette.primary.main, 0.08) : 'background.paper',
      border: `1px solid ${active ? theme.palette.primary.main : theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow']),
      '&:hover': {
        borderColor: theme.palette.primary.main,
        boxShadow: theme.shadows[2]
      },
      '&:focus-visible': {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2
      }
    })}
  >
    <Stack spacing={1.5}>
      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
        <GreenhouseChip size='small' label={STATUS_LABELS[entry.status]} tone={STATUS_TONES[entry.status]} />
        <GreenhouseChip size='small' label={KIND_LABELS[entry.kind]} tone='default' />
      </Stack>
      <Typography variant='h6' sx={{ wordBreak: 'break-word' }}>
        {entry.title}
      </Typography>
      <Typography variant='body2' color='text.secondary' sx={{ wordBreak: 'break-word' }}>
        {entry.fileLabel ?? entry.fileKey} · {entry.nodeName ?? entry.nodeId}
      </Typography>
      {entry.implementedSurfaceKey ? (
        <Typography variant='caption' color='text.secondary'>
          Ruta: {entry.implementedSurfaceKey}
        </Typography>
      ) : null}
    </Stack>
  </Box>
)

const DesignHandoffLaneView = () => {
  const [apiState, setApiState] = useState<ApiState>('loading')
  const [entries, setEntries] = useState<DesignHandoffEntry[]>([])
  const [allowedFiles, setAllowedFiles] = useState<DesignHandoffAllowedFile[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<DesignHandoffKind>('page')
  const [implementedSurfaceKey, setImplementedSurfaceKey] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [previewState, setPreviewState] = useState<PreviewState>('idle')
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [previewNodeName, setPreviewNodeName] = useState<string | null>(null)

  const selectedEntry = useMemo(
    () =>
      entries.find(entry => entry.entryId === selectedId) ?? entries.find(entry => entry.status !== 'archived') ?? null,
    [entries, selectedId]
  )

  const sortedEntries = useMemo(() => sortEntries(entries), [entries])
  const parsed = useMemo(() => parseFigmaUrl(url), [url])

  const reload = useCallback(async () => {
    setApiState('loading')
    setMessage(null)

    try {
      const res = await fetch('/api/design-system/handoff', { cache: 'no-store' })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo cargar el registro.'))

      const payload = (await res.json()) as HandoffResponse

      setEntries(payload.entries)
      setAllowedFiles(payload.allowedFiles)
      setApiState('ready')
    } catch (error) {
      setApiState('error')
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar el registro.')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    let cancelled = false

    const loadPreview = async () => {
      setPreviewImageUrl(null)
      setPreviewNodeName(null)

      if (!parsed) {
        setPreviewState(url.trim() ? 'unavailable' : 'idle')
        
return
      }

      if (!allowedFiles.some(file => file.fileKey === parsed.fileKey)) {
        setPreviewState('blocked')
        
return
      }

      setPreviewState('loading')

      try {
        const res = await fetch(
          `/api/design-system/handoff/preview?fileKey=${encodeURIComponent(parsed.fileKey)}&nodeId=${encodeURIComponent(parsed.nodeId)}`
        )

        if (!res.ok) {
          setPreviewState('blocked')
          
return
        }

        const payload = (await res.json()) as {
          imageUrl: string | null
          nodeName: string | null
          status: 'ready' | 'unavailable'
        }

        if (cancelled) return
        setPreviewImageUrl(payload.imageUrl)
        setPreviewNodeName(payload.nodeName)
        setPreviewState(payload.status === 'ready' ? 'ready' : 'unavailable')
      } catch {
        if (!cancelled) setPreviewState('unavailable')
      }
    }

    const timer = window.setTimeout(() => {
      void loadPreview()
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [allowedFiles, parsed, url])

  const handleCreate = async () => {
    setMessage(null)

    try {
      const res = await fetch('/api/design-system/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, kind, url, nodeName: previewNodeName })
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo registrar el handoff.'))

      setUrl('')
      setTitle('')
      setKind('page')
      await reload()
      setMessage('Handoff registrado.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar el handoff.')
    }
  }

  const transition = async (toStatus: DesignHandoffStatus) => {
    if (!selectedEntry) return
    setMessage(null)

    try {
      const res = await fetch(`/api/design-system/handoff/${encodeURIComponent(selectedEntry.entryId)}/transition`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus, implementedSurfaceKey })
      })

      if (!res.ok) throw new Error(await parseErrorPayload(res, 'No se pudo cambiar el estado.'))

      await reload()
      setMessage('Estado actualizado.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo cambiar el estado.')
    }
  }

  const queue = (
    <Stack spacing={3} data-capture='design-system-handoff-queue'>
      <Stack spacing={1}>
        <Typography variant='h4'>Design handoff</Typography>
        <Typography variant='body1' color='text.secondary' sx={{ maxInlineSize: 760 }}>
          Registra nodos Figma de producto aprobados para que DEV implemente desde una intención visible, sin mezclar
          páginas de producto dentro del master AXIS.
        </Typography>
      </Stack>

      {message ? (
        <Alert severity={message.includes('No ') || message.includes('aún') ? 'warning' : 'success'}>{message}</Alert>
      ) : null}

      {allowedFiles.length === 0 ? (
        <Alert severity='warning' data-capture='design-system-handoff-empty-allowlist'>
          El allowlist de archivos de producto está vacío. La UI queda lista, pero registrar un nodo real requiere
          aprobar un `file_key` de producto en la tabla gobernada.
        </Alert>
      ) : null}

      <Box
        data-capture='design-system-handoff-create'
        sx={theme => ({
          p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
          bgcolor: 'background.paper',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: `${theme.shape.customBorderRadius.lg}px`
        })}
      >
        <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label='URL del nodo Figma'
              value={url}
              onChange={event => setUrl(event.target.value)}
              fullWidth
              placeholder='https://www.figma.com/design/...?...node-id=...'
            />
            <FormControl sx={{ minInlineSize: { xs: '100%', md: 180 } }}>
              <InputLabel id='design-handoff-kind-label'>Tipo</InputLabel>
              <Select
                labelId='design-handoff-kind-label'
                label='Tipo'
                value={kind}
                onChange={event => setKind(event.target.value as DesignHandoffKind)}
              >
                <MenuItem value='page'>Página</MenuItem>
                <MenuItem value='component'>Componente</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <TextField
            label='Título interno'
            value={title}
            onChange={event => setTitle(event.target.value)}
            fullWidth
            helperText='Opcional. Si queda vacío, usamos el nombre del nodo o del archivo.'
          />
          <PreviewPane imageUrl={previewImageUrl} state={previewState} nodeId={parsed?.nodeId ?? null} />
          <Stack
            direction='row'
            spacing={2}
            alignItems='center'
            justifyContent='space-between'
            flexWrap='wrap'
            useFlexGap
          >
            <Typography variant='caption' color='text.secondary' sx={typographyScale.labelSm}>
              {parsed
                ? `File ${parsed.fileKey} · Node ${parsed.nodeId}`
                : 'Pega una URL de selección Figma para validar.'}
            </Typography>
            <GreenhouseButton
              kind='primaryAction'
              leadingIconClassName='tabler-plus'
              disabled={!parsed || previewState === 'blocked'}
              onClick={handleCreate}
            >
              Registrar handoff
            </GreenhouseButton>
          </Stack>
        </Stack>
      </Box>

      {apiState === 'loading' ? <LinearProgress /> : null}
      {apiState === 'error' ? <Alert severity='error'>{message ?? 'No se pudo cargar el registro.'}</Alert> : null}

      {apiState === 'ready' && sortedEntries.length === 0 ? (
        <Box
          data-capture='design-system-handoff-empty'
          sx={theme => ({
            p: DESIGN_SYSTEM_LAB_TOKENS.spacing.sectionInset,
            border: `1px dashed ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.lg}px`,
            textAlign: 'center'
          })}
        >
          <Typography variant='h6'>Todavía no hay handoffs registrados</Typography>
          <Typography variant='body2' color='text.secondary'>
            Cuando un archivo de producto esté aprobado, este carril muestra la cola de implementación.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {sortedEntries.map(entry => (
            <EntryCard
              key={entry.entryId}
              entry={entry}
              active={entry.entryId === selectedEntry?.entryId}
              onSelect={entry => setSelectedId(entry.entryId)}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )

  const inspector = (
    <ContextualSidecar
      title={selectedEntry?.title ?? 'Sin handoff seleccionado'}
      subtitle={
        selectedEntry
          ? `${selectedEntry.fileLabel ?? selectedEntry.fileKey} · ${selectedEntry.nodeId}`
          : 'Selecciona una entrada de la cola.'
      }
      eyebrow='Por implementar'
      icon='tabler-layout-kanban'
      kind='inspector'
      variant='inspector'
      onClose={() => setSelectedId(null)}
      dataCapture='design-system-handoff-inspector'
    >
      {selectedEntry ? (
        <Stack spacing={3}>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <GreenhouseChip
              size='small'
              label={STATUS_LABELS[selectedEntry.status]}
              tone={STATUS_TONES[selectedEntry.status]}
            />
            <GreenhouseChip size='small' label={KIND_LABELS[selectedEntry.kind]} tone='default' />
          </Stack>
          <Box>
            <Typography variant='caption' color='text.secondary'>
              Figma
            </Typography>
            <Typography variant='body2' sx={{ wordBreak: 'break-word' }}>
              {selectedEntry.fileKey} · {selectedEntry.nodeId}
            </Typography>
          </Box>
          <TextField
            label='Ruta implementada'
            value={implementedSurfaceKey}
            onChange={event => setImplementedSurfaceKey(event.target.value)}
            placeholder='/agency/example'
            fullWidth
            helperText='Obligatoria para marcar como implementado.'
          />
          <Stack spacing={1.5}>
            <GreenhouseButton
              kind='secondaryAction'
              leadingIconClassName='tabler-player-play'
              disabled={selectedEntry.status !== 'proposed'}
              onClick={() => void transition('in_implementation')}
            >
              Tomar para implementar
            </GreenhouseButton>
            <GreenhouseButton
              kind='primaryAction'
              leadingIconClassName='tabler-check'
              disabled={selectedEntry.status !== 'in_implementation' || !implementedSurfaceKey.trim()}
              onClick={() => void transition('implemented')}
            >
              Marcar implementado
            </GreenhouseButton>
            <GreenhouseButton
              kind='secondaryAction'
              variant='text'
              leadingIconClassName='tabler-archive'
              disabled={selectedEntry.status === 'archived'}
              onClick={() => void transition('archived')}
            >
              Archivar
            </GreenhouseButton>
          </Stack>
        </Stack>
      ) : (
        <Typography variant='body2' color='text.secondary'>
          La selección abre acciones y metadata sin sacar al equipo de la cola.
        </Typography>
      )}
    </ContextualSidecar>
  )

  return (
    <Box
      data-capture='design-system-handoff-page'
      sx={{ inlineSize: '100%', maxInlineSize: 1360, mx: 'auto', minWidth: 0, overflowX: 'clip' }}
    >
      <CompositionShell
        composition='single'
        instanceId='design-handoff'
        regions={{
          primary: (
            <AdaptiveSidecarLayout
              open={Boolean(selectedEntry)}
              onOpenChange={open => {
                if (!open) setSelectedId(null)
              }}
              sidecar={inspector}
              kind='inspector'
              preferredMode='push'
              minHeight={720}
              mainMinWidth={0}
              dataCapture='design-system-handoff-workbench'
            >
              {queue}
            </AdaptiveSidecarLayout>
          )
        }}
      />
    </Box>
  )
}

export default DesignHandoffLaneView
