'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { toast } from 'sonner'
import { useTheme } from '@mui/material/styles'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'

import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CatalogEntry {
  emailType: string
  label: string
  description: string
  domain: string
  supportsLocale: boolean
  defaultProps: Record<string, string>
  propsSchema: Record<string, { type: string; label: string }>
}

interface PreviewResponse {
  html: string
  subject: string
  text: string
  meta: Record<string, unknown>
}

type Locale = 'es' | 'en'
type Viewport = 'desktop' | 'mobile'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_WIDTH = 240
const PROPS_PANEL_WIDTH = 320
const DESKTOP_WIDTH = 600
const MOBILE_WIDTH = 375
const DEBOUNCE_MS = 500
const IFRAME_BG = '#F2F4F7'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EmailTemplatePreviewView = () => {
  const theme = useTheme()

  // --- Catalog state --------------------------------------------------------
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)

  // --- Selection state ------------------------------------------------------
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [locale, setLocale] = useState<Locale>('es')
  const [viewport, setViewport] = useState<Viewport>('desktop')

  // --- Props editor state ---------------------------------------------------
  const [editableProps, setEditableProps] = useState<Record<string, string>>({})
  const [propsOpen, setPropsOpen] = useState(true)

  // --- Preview state --------------------------------------------------------
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // --- Send test state ------------------------------------------------------
  const [sending, setSending] = useState(false)

  // --- Refs for debounce ----------------------------------------------------
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Derived data ---------------------------------------------------------
  const selectedEntry = useMemo(
    () => catalog.find(c => c.emailType === selectedTemplate) ?? null,
    [catalog, selectedTemplate]
  )

  // ---------------------------------------------------------------------------
  // Fetch catalog on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false

    const fetchCatalog = async () => {
      try {
        const res = await fetch('/api/admin/emails/preview')

        if (!res.ok) throw new Error('catalog')

        const data = await res.json()

        if (!cancelled && Array.isArray(data.catalog) && data.catalog.length > 0) {
          setCatalog(data.catalog)
          setSelectedTemplate(data.catalog[0].emailType)
          setEditableProps(data.catalog[0].defaultProps ?? {})
        }
      } catch {
        if (!cancelled) toast.error('No se pudo cargar el catalogo de templates')
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }

    fetchCatalog()

    return () => {
      cancelled = true
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch preview when template / locale / props change
  // ---------------------------------------------------------------------------
  const fetchPreview = useCallback(
    async (template: string, loc: Locale, props: Record<string, string>) => {
      setPreviewLoading(true)

      try {
        const qs = new URLSearchParams({
          template,
          locale: loc,
          props: JSON.stringify(props)
        })

        const res = await fetch(`/api/admin/emails/preview?${qs.toString()}`)

        if (!res.ok) throw new Error('preview')

        const data: PreviewResponse = await res.json()

        setPreview(data)
      } catch {
        toast.error('No se pudo cargar la vista previa')
      } finally {
        setPreviewLoading(false)
      }
    },
    []
  )

  // Trigger preview fetch (debounced for prop changes, immediate for template/locale)
  useEffect(() => {
    if (!selectedTemplate) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      fetchPreview(selectedTemplate, locale, editableProps)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [selectedTemplate, locale, editableProps, fetchPreview])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSelectTemplate = (entry: CatalogEntry) => {
    setSelectedTemplate(entry.emailType)
    setEditableProps(entry.defaultProps ?? {})
    setPreview(null)
  }

  const handleLocaleChange = (_: React.MouseEvent<HTMLElement>, value: Locale | null) => {
    if (value) setLocale(value)
  }

  const handleViewportChange = (_: React.MouseEvent<HTMLElement>, value: Viewport | null) => {
    if (value) setViewport(value)
  }

  const handlePropChange = (key: string, value: string) => {
    setEditableProps(prev => ({ ...prev, [key]: value }))
  }

  const handleSendTest = async () => {
    if (!selectedTemplate) return

    setSending(true)

    try {
      const res = await fetch('/api/admin/emails/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selectedTemplate, locale, props: editableProps })
      })

      if (!res.ok) throw new Error('send')

      const data = await res.json()

      toast.success(`Correo de prueba enviado a ${data.recipientEmail ?? 'tu email'}`)
    } catch {
      toast.error('No se pudo enviar el correo de prueba')
    } finally {
      setSending(false)
    }
  }

  const togglePropsPanel = () => setPropsOpen(prev => !prev)

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const iframeWidth = viewport === 'desktop' ? DESKTOP_WIDTH : MOBILE_WIDTH

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Page header */}
      <Typography variant='h5'>Preview de correos</Typography>

      {/* Main layout */}
      <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 220px)' }}>
        {/* ---- Left sidebar: template list ---- */}
        <Card
          elevation={0}
          sx={{
            width: SIDEBAR_WIDTH,
            minWidth: SIDEBAR_WIDTH,
            border: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <CardHeader
            title='Templates'
            titleTypographyProps={{ variant: 'subtitle1' }}
            sx={{ pb: 0 }}
          />
          <Divider sx={{ mt: 2 }} />

          {catalogLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <List dense disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
              {catalog.map(entry => (
                <ListItemButton
                  key={entry.emailType}
                  selected={selectedTemplate === entry.emailType}
                  onClick={() => handleSelectTemplate(entry)}
                  sx={{ px: 3, py: 1.5 }}
                >
                  <ListItemText
                    primary={entry.label}
                    secondary={
                      <CustomChip
                        round='true'
                        label={entry.domain}
                        size='small'
                        variant='tonal'
                        color='secondary'
                        sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
                      />
                    }
                    primaryTypographyProps={{ variant: 'body2', fontWeight: 500, noWrap: true }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Card>

        {/* ---- Center area: toolbar + preview ---- */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          {/* Toolbar */}
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              px: 3,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap'
            }}
          >
            {/* Locale toggle */}
            <ToggleButtonGroup
              value={locale}
              exclusive
              onChange={handleLocaleChange}
              size='small'
              aria-label='Idioma del template'
            >
              <ToggleButton value='es' sx={{ textTransform: 'none', px: 2 }}>
                ES
              </ToggleButton>
              <ToggleButton value='en' sx={{ textTransform: 'none', px: 2 }}>
                EN
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Viewport toggle */}
            <ToggleButtonGroup
              value={viewport}
              exclusive
              onChange={handleViewportChange}
              size='small'
              aria-label='Viewport de preview'
            >
              <ToggleButton value='desktop' aria-label='Desktop'>
                <i className='tabler-device-desktop' style={{ fontSize: 18 }} />
              </ToggleButton>
              <ToggleButton value='mobile' aria-label='Mobile'>
                <i className='tabler-device-mobile' style={{ fontSize: 18 }} />
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Subject display */}
            {preview?.subject && (
              <Box sx={{ flex: 1, minWidth: 0, mx: 1 }}>
                <Typography variant='caption' color='text.secondary'>
                  Asunto:
                </Typography>
                <Typography variant='body2' noWrap sx={{ fontWeight: 500 }}>
                  {preview.subject}
                </Typography>
              </Box>
            )}

            {/* Spacer */}
            {!preview?.subject && <Box sx={{ flex: 1 }} />}

            {/* Props panel toggle */}
            <Tooltip title={propsOpen ? 'Ocultar datos de ejemplo' : 'Mostrar datos de ejemplo'}>
              <IconButton size='small' onClick={togglePropsPanel} aria-label='Alternar panel de datos de ejemplo'>
                <i className='tabler-adjustments-horizontal' style={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            {/* Send test button */}
            <Button
              variant='contained'
              size='small'
              startIcon={sending ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-send' />}
              onClick={handleSendTest}
              disabled={!selectedTemplate || sending}
            >
              Enviar prueba
            </Button>
          </Card>

          {/* Preview iframe */}
          <Card
            elevation={0}
            sx={{
              border: `1px solid ${theme.palette.divider}`,
              flex: 1,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              overflow: 'auto',
              backgroundColor: IFRAME_BG,
              p: 4
            }}
          >
            {!selectedTemplate ? (
              <Box sx={{ textAlign: 'center', py: 12 }} role='status'>
                <i
                  className='tabler-mail-search'
                  style={{ fontSize: 48, color: theme.palette.text.disabled }}
                  aria-hidden='true'
                />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  Selecciona un template para previsualizarlo
                </Typography>
              </Box>
            ) : previewLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 12 }}>
                <CircularProgress size={32} />
                <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
                  Cargando vista previa...
                </Typography>
              </Box>
            ) : preview?.html ? (
              <iframe
                title='Vista previa de email'
                srcDoc={preview.html}
                style={{
                  width: iframeWidth,
                  height: '100%',
                  minHeight: 600,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 8,
                  backgroundColor: '#ffffff'
                }}
                sandbox='allow-same-origin'
              />
            ) : (
              <Box sx={{ textAlign: 'center', py: 12 }} role='status'>
                <Typography variant='body2' color='text.secondary'>
                  Sin vista previa disponible
                </Typography>
              </Box>
            )}
          </Card>
        </Box>

        {/* ---- Right panel: props editor ---- */}
        {propsOpen && selectedEntry && (
          <Card
            elevation={0}
            sx={{
              width: PROPS_PANEL_WIDTH,
              minWidth: PROPS_PANEL_WIDTH,
              border: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <CardHeader
              title='Datos de ejemplo'
              titleTypographyProps={{ variant: 'subtitle1' }}
              action={
                <IconButton size='small' onClick={togglePropsPanel} aria-label='Cerrar panel de datos'>
                  <i className='tabler-x' style={{ fontSize: 16 }} />
                </IconButton>
              }
              sx={{ pb: 0 }}
            />
            <Divider sx={{ mt: 2 }} />

            <CardContent sx={{ overflowY: 'auto', flex: 1 }}>
              <Stack spacing={3}>
                {selectedEntry.propsSchema &&
                  Object.entries(selectedEntry.propsSchema).map(([key, schema]) => (
                    <TextField
                      key={key}
                      label={schema.label || key}
                      value={editableProps[key] ?? ''}
                      onChange={e => handlePropChange(key, e.target.value)}
                      size='small'
                      fullWidth
                      slotProps={{
                        inputLabel: { shrink: true }
                      }}
                    />
                  ))}

                {/* Fallback: render raw defaultProps keys if no propsSchema */}
                {(!selectedEntry.propsSchema || Object.keys(selectedEntry.propsSchema).length === 0) &&
                  Object.entries(editableProps).map(([key]) => (
                    <TextField
                      key={key}
                      label={key}
                      value={editableProps[key] ?? ''}
                      onChange={e => handlePropChange(key, e.target.value)}
                      size='small'
                      fullWidth
                      slotProps={{
                        inputLabel: { shrink: true }
                      }}
                    />
                  ))}

                {Object.keys(editableProps).length === 0 && (
                  <Typography variant='body2' color='text.secondary'>
                    Este template no requiere datos de ejemplo.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  )
}

export default EmailTemplatePreviewView
