'use client'

/**
 * TASK-1153 (follow-up) — Drawer ancho "Abrir task": renderiza el Markdown crudo
 * de un work item (fetch a `/api/roadmap/work-items/[id]`) como documento
 * estilizado, in-context, sin abandonar el cockpit. Read-only: el Markdown del
 * repo sigue siendo la fuente de verdad.
 *
 * Render: `react-markdown` + `remark-gfm` (tablas/strikethrough/checkboxes). El
 * HTML crudo NO se interpreta (sin `rehype-raw`) → un `<script>` embebido se
 * escapa. Estilos prose tokenizados (theme.palette / customBorderRadius), sin HEX.
 *
 * Enriquecimientos de lectura:
 * - **IDs clicables** (`TASK-027`, `ISSUE-042`, …) → navegan a ese work item
 *   dentro del mismo drawer (stack interno con "volver").
 * - **Callouts**: blockquotes y los ítems de "reglas duras" (NUNCA/SIEMPRE) se
 *   pintan tonales en vez de texto plano.
 * - **Checkboxes** de tarea (`- [ ]`) como casillas reales (solo lectura).
 * - **Copiar** por bloque de código.
 * - **Secciones**: chips de los `## headings` para saltar dentro del documento.
 * - **Status** del front-matter como tarjeta de chips arriba del contenido.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

import Markdown, { type Components } from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'

import { GH_ROADMAP } from '@/lib/copy/roadmap'
import type { RoadmapWorkItemVM } from '@/lib/roadmap/cockpit/types'
import type { WorkItemKind } from '@/lib/roadmap/work-item-index/types'

import { KIND_VISUAL, toneSx } from '../cockpit-tokens'
import { ToneTag } from './RoadmapTags'

interface TaskMarkdownPayload {
  id: string
  kind: WorkItemKind
  title: string
  path: string
  content: string
}

type FetchState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; content: string }

interface HeaderMeta {
  id: string
  kind: WorkItemKind
  title: string
  path: string
}

/** Patrón canónico de IDs del backlog (para hacerlos clicables). */
const WORK_ITEM_ID_RE = /^(TASK|ISSUE|EPIC|MINI)-\d+$/

/** Prefijos que marcan un ítem de "regla dura" (callout tonal). */
const RULE_NEGATIVE_RE = /^(nunca|never|prohibido|no\b)/i
const RULE_POSITIVE_RE = /^(siempre|always)/i

const slugify = (text: string): string =>
  text
    .normalize('NFD') // descompone tildes (á → a + diacrítico)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // quita diacríticos + puntuación sin dejar guion
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)

/** Extrae texto plano de un árbol de children React (para detectar reglas / copiar). */
const extractText = (node: ReactNode): string => {
  if (node == null || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')

  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as { props?: { children?: ReactNode } }).props?.children)
  }

  return ''
}

interface SectionLink {
  title: string
  slug: string
}

/** Secciones (`## headings`) del documento, para la barra de saltos. */
const extractSections = (content: string): SectionLink[] => {
  const out: SectionLink[] = []
  const seen = new Set<string>()

  for (const line of content.split('\n')) {
    const match = line.match(/^##\s+(.+?)\s*$/)

    if (!match) continue

    const title = match[1].replace(/[`*_]/g, '').trim()
    let slug = slugify(title)

    if (!slug) continue
    while (seen.has(slug)) slug = `${slug}-x`
    seen.add(slug)
    out.push({ title, slug })
  }

  return out
}

interface StatusField {
  key: string
  value: string
}

/** Campos del bloque `## Status` (front-matter) como pares key/value. */
const extractStatusFields = (content: string): StatusField[] => {
  const lines = content.split('\n')
  const start = lines.findIndex(line => /^##\s+Status\s*$/i.test(line))

  if (start === -1) return []

  const out: StatusField[] = []

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]

    if (/^##\s+/.test(line)) break

    const match = line.match(/^[-*]\s+([A-Za-z][\w /]*?):\s*`?([^`\n]+?)`?\s*$/)

    if (match) out.push({ key: match[1].trim(), value: match[2].trim() })
  }

  return out
}

/** Quita el bloque `## Status` del cuerpo (ya se muestra como tarjeta de chips). */
const stripStatusBlock = (content: string): string => {
  const lines = content.split('\n')
  const start = lines.findIndex(line => /^##\s+Status\s*$/i.test(line))

  if (start === -1) return content

  let end = start + 1

  while (end < lines.length && !/^##\s+/.test(lines[end])) end++

  return [...lines.slice(0, start), ...lines.slice(end)].join('\n').replace(/\n{3,}/g, '\n\n')
}

/** Chip clicable de un ID del backlog (navega dentro del drawer). */
const IdLink = ({ id, onNavigate }: { id: string; onNavigate: (id: string) => void }) => (
  <Box
    component='button'
    type='button'
    onClick={() => onNavigate(id)}
    sx={[
      toneSx('info'),
      {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.375,
        border: '1px solid transparent',
        borderRadius: theme => `${theme.shape.customBorderRadius.xs}px`,
        px: 0.625,
        py: 0.125,
        typography: 'monoId',
        fontFeatureSettings: "'tnum' 1",
        cursor: 'pointer',
        verticalAlign: 'baseline',
        '&:hover': { borderColor: 'info.main' },
        '&:focus-visible': { outline: theme => `2px solid ${theme.palette.info.main}`, outlineOffset: 1 }
      }
    ]}
  >
    <i className='tabler-arrow-up-right' aria-hidden='true' style={{ fontSize: 11, lineHeight: 0 }} />
    {id}
  </Box>
)

/** Bloque de código con botón de copiar. */
const PreBlock = ({ children }: { children?: ReactNode }) => {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    const text = ref.current?.textContent ?? ''

    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }, [])

  return (
    <Box sx={{ position: 'relative', my: 2, '&:hover .gh-code-copy': { opacity: 1 } }}>
      <IconButton
        size='small'
        className='gh-code-copy'
        onClick={handleCopy}
        aria-label={GH_ROADMAP.taskDrawer.copyCodeAria}
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          opacity: { xs: 1, md: 0 },
          transition: 'opacity 0.15s ease',
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          color: copied ? 'success.main' : 'text.secondary',
          '&:hover': { backgroundColor: 'background.paper', color: 'text.primary' }
        }}
      >
        <i className={copied ? 'tabler-check' : 'tabler-copy'} style={{ fontSize: 14 }} />
      </IconButton>
      <Box component='pre' ref={ref}>
        {children}
      </Box>
    </Box>
  )
}

/** Prose tokenizado para documento técnico denso. */
const proseSx: SxProps<Theme> = theme => ({
  ...theme.typography.body2,
  color: 'text.primary',
  lineHeight: 1.7,
  wordBreak: 'break-word',
  minWidth: 0,
  '& > *:first-of-type': { mt: 0 },
  '& > *:last-child': { mb: 0 },
  '& h1': {
    ...theme.typography.h4,
    mt: 0,
    mb: 2,
    scrollMarginTop: theme.spacing(3)
  },
  '& h2': {
    ...theme.typography.h5,
    mt: 5,
    mb: 1.75,
    pb: 1,
    borderBottom: '1px solid',
    borderColor: 'divider',
    scrollMarginTop: theme.spacing(3)
  },
  '& h3': { ...theme.typography.body2, fontWeight: 600, mt: 3.5, mb: 1, scrollMarginTop: theme.spacing(3) },
  '& h4, & h5, & h6': { ...theme.typography.caption, fontWeight: 600, mt: 3, mb: 0.75, color: 'text.secondary' },
  '& p': { my: 1.5 },
  '& strong': { fontWeight: 700, color: 'text.primary' },
  '& em': { fontStyle: 'italic' },
  '& a': { color: 'primary.main', textDecoration: 'none', fontWeight: 500, '&:hover': { textDecoration: 'underline' } },
  '& ul, & ol': { my: 1.5, pl: 3, display: 'flex', flexDirection: 'column', gap: 0.625 },
  '& li': { lineHeight: 1.6, '& > ul, & > ol': { mt: 0.625, mb: 0 } },
  '& li::marker': { color: 'text.disabled' },
  // Checkboxes de tarea (remark-gfm): sin bullet, casilla real read-only.
  '& ul.contains-task-list': { pl: 1.5, listStyle: 'none' },
  '& li.task-list-item': { display: 'flex', alignItems: 'flex-start', gap: 1 },
  '& li.task-list-item::marker': { content: '""' },
  '& input[type="checkbox"]': { mt: 0.375, accentColor: theme.palette.primary.main, flex: '0 0 auto' },
  '& code': {
    // Excepción justificada (mirror NexaThread): <code> muestra código/paths
    // literales del repo, no IDs ni montos. Es el caso documentado de la regla.
    // eslint-disable-next-line greenhouse/no-hardcoded-fontfamily
    fontFamily: 'monospace',
    fontSize: theme.typography.caption.fontSize,
    bgcolor: 'action.selected',
    px: 0.75,
    py: 0.25,
    borderRadius: `${theme.shape.customBorderRadius.xs}px`,
    border: '1px solid',
    borderColor: 'divider'
  },
  '& pre': {
    m: 0,
    p: 2.5,
    bgcolor: 'action.hover',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: `${theme.shape.customBorderRadius.md}px`,
    overflowX: 'auto',
    '& code': { bgcolor: 'transparent', border: 'none', p: 0, lineHeight: 1.6 },
    // Syntax highlighting (rehype-highlight → clases hljs-*) tokenizado + dark-aware.
    '& .hljs-comment, & .hljs-quote': { color: 'text.disabled', fontStyle: 'italic' },
    '& .hljs-keyword, & .hljs-selector-tag, & .hljs-literal, & .hljs-built_in': { color: 'info.main' },
    '& .hljs-string, & .hljs-regexp, & .hljs-meta-string': { color: 'success.main' },
    '& .hljs-number, & .hljs-type, & .hljs-class .hljs-title': { color: 'warning.main' },
    '& .hljs-title, & .hljs-section, & .hljs-name, & .hljs-selector-id, & .hljs-selector-class': { color: 'primary.main' },
    '& .hljs-attr, & .hljs-attribute, & .hljs-property, & .hljs-variable, & .hljs-template-variable': { color: 'info.main' },
    '& .hljs-meta, & .hljs-symbol, & .hljs-bullet, & .hljs-link': { color: 'text.secondary' },
    '& .hljs-deletion': { color: 'error.main' },
    '& .hljs-addition': { color: 'success.main' },
    '& .hljs-emphasis': { fontStyle: 'italic' },
    '& .hljs-strong': { fontWeight: 700 }
  },
  '& blockquote': {
    my: 2,
    pl: 2.5,
    pr: 2,
    py: 1.25,
    borderLeft: '3px solid',
    borderColor: 'primary.main',
    bgcolor: 'primary.lightOpacity',
    borderRadius: theme => `0 ${theme.shape.customBorderRadius.sm}px ${theme.shape.customBorderRadius.sm}px 0`,
    color: 'text.secondary',
    '& p': { my: 0.5 }
  },
  '& hr': { my: 4, border: 'none', borderTop: '1px solid', borderColor: 'divider' },
  '& table': { borderCollapse: 'collapse', width: '100%', typography: 'caption' },
  '& thead': { bgcolor: 'action.hover' },
  '& th, & td': { border: '1px solid', borderColor: 'divider', px: 1.5, py: 1, textAlign: 'left', verticalAlign: 'top' },
  '& th': { fontWeight: 600 },
  '& img': { maxWidth: '100%' }
})

/** Factory de los component overrides (depende de `onNavigate` para los IDs). */
const buildMarkdownComponents = (onNavigate: (id: string) => void): Components => ({
  // Headings con id (anclas para la barra de secciones).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  h2: ({ node, children, ...props }) => (
    <Box component='h2' id={slugify(extractText(children))} {...props}>
      {children}
    </Box>
  ),
  // Bloque de código con copy.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pre: ({ node, children }) => <PreBlock>{children}</PreBlock>,
  // Code inline: si es un ID del backlog → chip clicable; si no, code normal.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  code: ({ node, className, children, ...props }) => {
    const text = extractText(children).trim()
    const isBlock = Boolean(className) || text.includes('\n')

    if (!isBlock && WORK_ITEM_ID_RE.test(text)) {
      return <IdLink id={text} onNavigate={onNavigate} />
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  // Ítems de "reglas duras" (NUNCA/SIEMPRE) → tinte tonal honesto.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  li: ({ node, className, children, ...props }) => {
    const head = extractText(children).replace(/^[\s•*-]+/, '').trim()
    const isRule = !(className ?? '').includes('task-list-item')
    const tone = isRule && RULE_NEGATIVE_RE.test(head) ? 'error' : isRule && RULE_POSITIVE_RE.test(head) ? 'success' : null

    if (!tone) {
      return (
        <li className={className} {...props}>
          {children}
        </li>
      )
    }

    return (
      <Box
        component='li'
        className={className}
        sx={{
          listStyle: 'none',
          ml: -1.5,
          pl: 1.5,
          borderLeft: '2px solid',
          borderColor: `${tone}.main`,
          '&::marker': { content: '""' }
        }}
        {...props}
      >
        {children}
      </Box>
    )
  },
  // Las tablas anchas scrollean en su propio contenedor; nunca empujan el drawer.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  table: ({ node, ...props }) => (
    <Box sx={{ overflowX: 'auto', my: 2, minWidth: 0 }}>
      <table {...props} />
    </Box>
  )
})

export interface RoadmapTaskDrawerProps {
  /** Item seleccionado para abrir (su id dispara el fetch). `null` = cerrado. */
  item: RoadmapWorkItemVM | null
  onClose: () => void
  onCopy: (text: string) => void
}

const RoadmapTaskDrawer = ({ item, onClose, onCopy }: RoadmapTaskDrawerProps) => {
  // Stack de navegación interno (IDs visitados) + metadata del header actual.
  const [stack, setStack] = useState<string[]>(item ? [item.id] : [])

  const [meta, setMeta] = useState<HeaderMeta | null>(
    item ? { id: item.id, kind: item.kind, title: item.title, path: item.path } : null
  )

  const [state, setState] = useState<FetchState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  const bodyRef = useRef<HTMLDivElement>(null)

  // Item nuevo (o reabierto) desde el inspector → reset del stack + header.
  useEffect(() => {
    if (item) {
      setStack([item.id])
      setMeta({ id: item.id, kind: item.kind, title: item.title, path: item.path })
    }
    // item → null (cierre): no reseteamos para retener el contenido durante la animación.
  }, [item?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentId = stack.length > 0 ? stack[stack.length - 1] : null

  useEffect(() => {
    if (!currentId) return

    const controller = new AbortController()

    setState({ status: 'loading' })

    fetch(`/api/roadmap/work-items/${encodeURIComponent(currentId)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('fetch_failed')

        const payload = (await response.json()) as TaskMarkdownPayload

        setMeta({ id: payload.id, kind: payload.kind, title: payload.title, path: payload.path })
        setState({ status: 'ready', content: payload.content })
        bodyRef.current?.scrollTo({ top: 0 })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({ status: 'error' })
      })

    return () => controller.abort()
  }, [currentId, reloadKey])

  const handleNavigate = useCallback(
    (id: string) => {
      setStack(prev => (prev[prev.length - 1] === id ? prev : [...prev, id]))
    },
    []
  )

  const handleBack = useCallback(() => setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev)), [])

  const handleScrollToSection = useCallback((slug: string) => {
    const target = bodyRef.current?.querySelector(`#${CSS.escape(slug)}`)

    if (target instanceof HTMLElement) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const markdownComponents = useMemo(() => buildMarkdownComponents(handleNavigate), [handleNavigate])

  const sections = useMemo(
    () => (state.status === 'ready' ? extractSections(state.content) : []),
    [state]
  )

  const statusFields = useMemo(
    () => (state.status === 'ready' ? extractStatusFields(state.content) : []),
    [state]
  )

  const body = useMemo(
    () => (state.status === 'ready' ? stripStatusBlock(state.content) : ''),
    [state]
  )

  const kindVisual = meta ? KIND_VISUAL[meta.kind] : null
  const canGoBack = stack.length > 1

  return (
    <Drawer
      anchor='right'
      open={Boolean(item)}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: '100%', maxWidth: { xs: '100%', md: 'min(820px, 92vw)' } }, 'aria-label': GH_ROADMAP.taskDrawer.aria } }}
    >
      {meta ? (
        <Box data-capture='roadmap-task-drawer' sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
          {/* Header */}
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
              {canGoBack ? (
                <Button variant='text' size='small' color='secondary' startIcon={<i className='tabler-arrow-left' />} onClick={handleBack}>
                  {GH_ROADMAP.taskDrawer.back}
                </Button>
              ) : (
                <Typography component='span' variant='overline' sx={{ color: 'text.disabled' }}>
                  {GH_ROADMAP.taskDrawer.eyebrow}
                </Typography>
              )}
              <Box sx={{ ml: 'auto', display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant='text'
                  size='small'
                  color='secondary'
                  startIcon={<i className='tabler-copy' />}
                  onClick={() => onCopy(meta.path)}
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
              <Typography component='span' variant='monoId' sx={{ color: 'text.secondary' }}>
                {meta.id}
              </Typography>
            </Box>
            <Typography
              component='h2'
              variant='h4'
              sx={{ m: 0 }}
            >
              {meta.title}
            </Typography>
            <Typography
              component='span'
              variant='caption'
              sx={{ color: 'text.disabled', fontFeatureSettings: "'tnum' 1", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }}
            >
              {meta.path}
            </Typography>
          </Box>

          {/* Body */}
          <Box ref={bodyRef} sx={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto', p: 4.5, scrollbarWidth: 'thin' }}>
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
                sx={[
                  toneSx('error'),
                  {
                    borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 2
                  }
                ]}
              >
                <Typography component='span' variant='body2' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
                  <i className='tabler-alert-circle' aria-hidden='true' style={{ fontSize: 18, lineHeight: 0 }} />
                  {GH_ROADMAP.taskDrawer.errorTitle}
                </Typography>
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
                {/* Status — front-matter como tarjeta de chips */}
                {statusFields.length > 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1,
                      mb: 4,
                      p: 2.5,
                      backgroundColor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: theme => `${theme.shape.customBorderRadius.md}px`
                    }}
                  >
                    {statusFields.map(field => (
                      <Box
                        key={field.key}
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'baseline',
                          gap: 0.75,
                          backgroundColor: 'background.paper',
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                          px: 1.25,
                          py: 0.625
                        }}
                      >
                        <Typography component='span' variant='overline' sx={{ color: 'text.disabled' }}>
                          {field.key}
                        </Typography>
                        <Typography component='span' variant='monoId' sx={{ color: 'text.primary' }}>
                          {field.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : null}

                {/* Secciones — barra de saltos */}
                {sections.length > 1 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 4, pb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                    {sections.map(section => (
                      <Box
                        key={section.slug}
                        component='button'
                        type='button'
                        onClick={() => handleScrollToSection(section.slug)}
                        sx={[
                          toneSx('neutral'),
                          {
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                            px: 1.125,
                            py: 0.5,
                            typography: 'caption',
                            fontWeight: 600,
                            cursor: 'pointer',
                            '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                            '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
                          }
                        ]}
                      >
                        {section.title}
                      </Box>
                    ))}
                  </Box>
                ) : null}

                <Box data-capture='roadmap-task-markdown' sx={proseSx}>
                  <Markdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
                    components={markdownComponents}
                  >
                    {body}
                  </Markdown>
                </Box>
                <Typography
                  component='p'
                  variant='caption'
                  sx={{ mt: 5, pt: 3, borderTop: '1px solid', borderColor: 'divider', color: 'text.disabled', display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <i className='tabler-lock' aria-hidden='true' style={{ fontSize: 13, lineHeight: 0 }} />
                  {GH_ROADMAP.taskDrawer.readOnlyNote}
                </Typography>
              </>
            ) : null}
          </Box>
        </Box>
      ) : null}
    </Drawer>
  )
}

export default RoadmapTaskDrawer
