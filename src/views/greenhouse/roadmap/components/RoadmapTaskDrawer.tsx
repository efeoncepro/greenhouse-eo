'use client'

/**
 * TASK-1153 (follow-up) — Drawer ancho "Abrir task": renderiza el Markdown crudo
 * de un work item (fetch a `/api/roadmap/work-items/[id]`) como documento
 * estilizado, in-context, sin abandonar el cockpit. Read-only: el Markdown del
 * repo sigue siendo la fuente de verdad.
 *
 * Render: `react-markdown` + `remark-gfm` (tablas/strikethrough). El HTML crudo
 * NO se interpreta (sin `rehype-raw`) → un `<script>` embebido se escapa. Los
 * estilos son prose tokenizado (theme.palette / customBorderRadius), nunca HEX.
 */
import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { GH_ROADMAP } from '@/lib/copy/roadmap'
import type { RoadmapWorkItemVM } from '@/lib/roadmap/cockpit/types'

import { KIND_VISUAL, toneSx } from '../cockpit-tokens'
import { ToneTag } from './RoadmapTags'

interface TaskMarkdownPayload {
  id: string
  kind: string
  title: string
  path: string
  content: string
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; content: string }

/** Prose tokenizado para documento técnico denso (headings, listas, code, tablas GFM). */
const proseSx: SxProps<Theme> = theme => ({
  color: 'text.primary',
  fontSize: '0.875rem',
  lineHeight: 1.7,
  wordBreak: 'break-word',
  minWidth: 0,
  '& > *:first-of-type': { mt: 0 },
  '& > *:last-child': { mb: 0 },
  '& h1': {
    fontFamily: theme.typography.h4.fontFamily,
    fontSize: '1.375rem',
    fontWeight: 600,
    lineHeight: 1.25,
    mt: 0,
    mb: 2
  },
  '& h2': {
    fontFamily: theme.typography.h5.fontFamily,
    fontSize: '1.0625rem',
    fontWeight: 600,
    lineHeight: 1.3,
    mt: 5,
    mb: 1.75,
    pb: 1,
    borderBottom: '1px solid',
    borderColor: 'divider'
  },
  '& h3': { fontSize: '0.9375rem', fontWeight: 600, mt: 3.5, mb: 1 },
  '& h4, & h5, & h6': { fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.01em', mt: 3, mb: 0.75, color: 'text.secondary' },
  '& p': { my: 1.5 },
  '& strong': { fontWeight: 700, color: 'text.primary' },
  '& em': { fontStyle: 'italic' },
  '& a': { color: 'primary.main', textDecoration: 'none', fontWeight: 500, '&:hover': { textDecoration: 'underline' } },
  '& ul, & ol': { my: 1.5, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.625 },
  '& li': { lineHeight: 1.6, '& > ul, & > ol': { mt: 0.625, mb: 0 } },
  '& li::marker': { color: 'text.disabled' },
  '& code': {
    // Excepción justificada (mirror NexaThread): <code> muestra código/paths
    // literales del repo, no IDs ni montos. Es el caso documentado de la regla.
    // eslint-disable-next-line greenhouse/no-hardcoded-fontfamily
    fontFamily: 'monospace',
    fontSize: '0.8125rem',
    bgcolor: 'action.selected',
    px: 0.75,
    py: 0.25,
    borderRadius: `${theme.shape.customBorderRadius.xs}px`,
    border: '1px solid',
    borderColor: 'divider'
  },
  '& pre': {
    my: 2,
    p: 2.5,
    bgcolor: 'action.hover',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: `${theme.shape.customBorderRadius.md}px`,
    overflowX: 'auto',
    '& code': { bgcolor: 'transparent', border: 'none', p: 0, lineHeight: 1.6 }
  },
  '& blockquote': {
    my: 2,
    pl: 2.5,
    py: 0.5,
    borderLeft: '3px solid',
    borderColor: 'primary.main',
    color: 'text.secondary',
    '& p': { my: 0.5 }
  },
  '& hr': { my: 4, border: 'none', borderTop: '1px solid', borderColor: 'divider' },
  '& table': { borderCollapse: 'collapse', width: '100%', fontSize: '0.8125rem' },
  '& thead': { bgcolor: 'action.hover' },
  '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1.5, py: 1, textAlign: 'left', verticalAlign: 'top' },
  '& th': { fontWeight: 600 },
  '& img': { maxWidth: '100%' }
})

/** Las tablas anchas scrollean en su propio contenedor; nunca empujan el drawer. */
const MARKDOWN_COMPONENTS: Components = {
  // `node` (AST hast) no se pasa al <table> del DOM; se descarta.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  table: ({ node, ...props }) => (
    <Box sx={{ overflowX: 'auto', my: 2, minWidth: 0 }}>
      <table {...props} />
    </Box>
  )
}

export interface RoadmapTaskDrawerProps {
  /** Item seleccionado para abrir (su id dispara el fetch). `null` = cerrado. */
  item: RoadmapWorkItemVM | null
  onClose: () => void
  onCopy: (text: string) => void
}

const RoadmapTaskDrawer = ({ item, onClose, onCopy }: RoadmapTaskDrawerProps) => {
  // Retiene el último item mientras el drawer anima su cierre (evita flash vacío).
  const [shown, setShown] = useState<RoadmapWorkItemVM | null>(item)
  const [state, setState] = useState<FetchState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (item) setShown(item)
  }, [item])

  const openId = item?.id ?? null

  useEffect(() => {
    if (!openId) return

    const controller = new AbortController()

    setState({ status: 'loading' })

    fetch(`/api/roadmap/work-items/${encodeURIComponent(openId)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('fetch_failed')

        const payload = (await response.json()) as TaskMarkdownPayload

        setState({ status: 'ready', content: payload.content })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({ status: 'error' })
      })

    return () => controller.abort()
  }, [openId, reloadKey])

  const kindVisual = shown ? KIND_VISUAL[shown.kind] : null

  return (
    <Drawer
      anchor='right'
      open={Boolean(item)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: '100%', maxWidth: { xs: '100%', md: 'min(820px, 92vw)' } }, 'aria-label': GH_ROADMAP.taskDrawer.aria } }}
    >
      {shown ? (
        <Box data-capture='roadmap-task-drawer' sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
          {/* Header — instantáneo desde el VM, no espera al fetch */}
          <Box
            sx={{
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              p: 4.5,
              borderBottom: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box component='span' sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.disabled' }}>
                {GH_ROADMAP.taskDrawer.eyebrow}
              </Box>
              <Box sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant='text'
                  size='small'
                  color='secondary'
                  startIcon={<i className='tabler-copy' />}
                  onClick={() => onCopy(shown.path)}
                  aria-label={GH_ROADMAP.taskDrawer.copyPathAria}
                >
                  {GH_ROADMAP.taskDrawer.copyPath}
                </Button>
                <IconButton size='small' onClick={onClose} aria-label={GH_ROADMAP.taskDrawer.closeAria}>
                  <i className='tabler-x' style={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {kindVisual ? <ToneTag tone={kindVisual.tone} icon={kindVisual.icon} label={kindVisual.label} /> : null}
              <Box component='span' sx={{ fontWeight: 600, fontSize: '0.875rem', fontFeatureSettings: "'tnum' 1", color: 'text.secondary' }}>
                {shown.id}
              </Box>
            </Box>
            <Box
              component='h2'
              sx={{ m: 0, fontFamily: theme => theme.typography.h4.fontFamily, fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, color: 'text.primary' }}
            >
              {shown.title}
            </Box>
            <Box
              component='span'
              sx={{ fontSize: '0.75rem', color: 'text.disabled', fontFeatureSettings: "'tnum' 1", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }}
            >
              {shown.path}
            </Box>
          </Box>

          {/* Body — loading / error / content */}
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', p: 4.5, scrollbarWidth: 'thin' }}>
            {state.status === 'loading' ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 240, color: 'text.secondary' }}>
                <CircularProgress size={26} />
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {GH_ROADMAP.taskDrawer.loadingLabel}
                </Typography>
              </Box>
            ) : null}

            {state.status === 'error' ? (
              <Box
                sx={{
                  ...toneSx('error'),
                  borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                  p: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 2
                }}
              >
                <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
                  <i className='tabler-alert-circle' aria-hidden='true' style={{ fontSize: 18, lineHeight: 0 }} />
                  {GH_ROADMAP.taskDrawer.errorTitle}
                </Box>
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {GH_ROADMAP.taskDrawer.errorBody}
                </Typography>
                <Button variant='outlined' size='small' color='error' startIcon={<i className='tabler-refresh' />} onClick={() => setReloadKey(key => key + 1)}>
                  {GH_ROADMAP.taskDrawer.retry}
                </Button>
              </Box>
            ) : null}

            {state.status === 'ready' ? (
              <>
                <Box data-capture='roadmap-task-markdown' sx={proseSx}>
                  <Markdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                    {state.content}
                  </Markdown>
                </Box>
                <Box
                  component='p'
                  sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider', fontSize: '0.75rem', color: 'text.disabled', display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <i className='tabler-lock' aria-hidden='true' style={{ fontSize: 13, lineHeight: 0 }} />
                  {GH_ROADMAP.taskDrawer.readOnlyNote}
                </Box>
              </>
            ) : null}
          </Box>
        </Box>
      ) : null}
    </Drawer>
  )
}

export default RoadmapTaskDrawer
