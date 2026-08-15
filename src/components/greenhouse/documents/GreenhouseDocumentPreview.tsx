'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export type GreenhouseDocumentPreviewCopy = {
  loading: string
  loadError: string
  /** El TIPO de archivo no se puede previsualizar. Recibe `{fileName}`. */
  unsupported: string
  /** El NAVEGADOR no embebe PDF (típicamente móvil). Distinto de `unsupported`. */
  noEmbed: string
  openInNewTab: string
  /** Nombre accesible del marco del visor. Recibe `{fileName}`. */
  frameTitle: string
}

/**
 * Detección por CAPACIDAD, no por viewport ni user-agent: `navigator.pdfViewerEnabled`
 * es la respuesta del propio navegador a "¿sé pintar un PDF embebido?". Los navegadores
 * móviles responden `false` — no embeben PDF, muestran un marco EN BLANCO.
 *
 * Un marco en blanco es exactamente la degradación silenciosa que este trabajo vino a
 * eliminar del panel: hay que decirlo y ofrecer la salida real.
 *
 * `undefined` (navegadores viejos sin la propiedad) se trata como "sí puede": el
 * intento es barato y el fallo cae en el estado de error, que también tiene salida.
 */
const canBrowserEmbedPdf = () => typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false

export interface GreenhouseDocumentPreviewProps {
  /** Ruta same-origin del asset privado. Se consume con `credentials: 'include'`. */
  url: string
  mimeType: string
  fileName: string
  copy: GreenhouseDocumentPreviewCopy
  /**
   * `false` cuando el contenedor ya ofrece "abrir/descargar" en su barra de acciones.
   * Sin esto el diálogo de Hiring mostraba **dos** "Abrir en pestaña nueva" —lo detectó
   * el árbol de accesibilidad de la captura, no la vista.
   */
  renderEscapeHatch?: boolean
}

export const isPreviewableMimeType = (mimeType: string) =>
  mimeType === 'application/pdf' || mimeType.startsWith('image/')

const interpolate = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template)

/**
 * Visor de documento privado, DENTRO del portal.
 *
 * ¿Por qué el motor del navegador y no `react-pdf`? Se intentó primero —ya estaba
 * en el repo, con dos consumidores— y **no arranca bajo `pnpm dev`**, que corre
 * `next dev --webpack`: `pdfjs-dist` v5 se publica como ESM y el interop de webpack
 * lo rompe al evaluarlo (`TypeError: Object.defineProperty called on non-object` en
 * `pdf.mjs`), con el import dinámico rechazando en silencio. `transpilePackages` no
 * alcanza. **No está verificado bajo Turbopack**, que es lo que usa `pnpm build`, así
 * que el alcance real del fallo (¿sólo dev, o también producción?) es la primera
 * pregunta del follow-up — y de su respuesta depende si los otros dos consumidores
 * están rotos para los usuarios o sólo para quien desarrolla.
 *
 * Pero incluso si funcionara, el motor nativo gana en lo que importa acá: **0 KB de
 * JS** (frente a ~400 KB de pdf.js + worker), render fuera del hilo principal, y el
 * zoom/búsqueda/impresión que el operador ya sabe usar. La regla es tecnología
 * aburrida: pdf.js sólo se justifica cuando necesitemos algo que el navegador no da
 * —anotar el CV dentro del portal, o render inline en móvil.
 *
 * Los bytes se traen con la sesión del usuario y se muestran desde un blob local:
 * la ruta del asset re-autoriza en cada request, así que el visor no es una puerta
 * nueva, es un consumidor más.
 *
 * Degrada honesto en tres escalones: tipo no previsualizable → "abrir en pestaña";
 * fetch fallido → error con la misma salida; nunca un recuadro en blanco.
 * `openInNewTab` además es la salida accesible: un PDF embebido es opaco para
 * varias tecnologías asistivas, y el visor del sistema suele ser más accesible.
 */
const GreenhouseDocumentPreview = ({
  copy,
  fileName,
  mimeType,
  renderEscapeHatch = true,
  url,
}: GreenhouseDocumentPreviewProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  // Se resuelve en efecto, no en render: `navigator` no existe en el servidor y
  // decidirlo durante SSR produciría un mismatch de hidratación.
  const [pdfEmbedBlocked, setPdfEmbedBlocked] = useState(false)

  const previewable = isPreviewableMimeType(mimeType)

  useEffect(() => {
    if (mimeType === 'application/pdf') setPdfEmbedBlocked(!canBrowserEmbedPdf())
  }, [mimeType])

  useEffect(() => {
    // Sin bytes que traer si el navegador no va a poder pintarlos: se evita
    // descargar un PDF completo para mostrarlo en un marco vacío.
    if (!previewable || pdfEmbedBlocked) return undefined

    let active = true
    let objectUrl: string | null = null

    setLoading(true)
    setFailed(false)
    setBlobUrl(null)

    void fetch(url, { credentials: 'include' })
      .then(response => {
        if (!response.ok) throw new Error('preview_load_failed')

        return response.blob()
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)

        if (active) setBlobUrl(objectUrl)
        else URL.revokeObjectURL(objectUrl)
      })
      .catch((error: unknown) => {
        // Se registra sin bytes: un visor que falla en silencio es un callejón sin salida.
        console.error('[GreenhouseDocumentPreview] preview fetch failed:', error)
        if (active) setFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [pdfEmbedBlocked, previewable, url])

  const escapeHatch = useCallback(
    () =>
      renderEscapeHatch ? (
        <Button
          component='a'
          href={url}
          target='_blank'
          rel='noopener noreferrer'
          variant='outlined'
          sx={{ '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)', outlineOffset: '2px' } }}
        >
          {copy.openInNewTab}
        </Button>
      ) : null,
    [copy.openInNewTab, renderEscapeHatch, url],
  )

  if (!previewable || pdfEmbedBlocked) {
    return (
      <Stack spacing={3} alignItems='center' justifyContent='center' sx={{ p: 6, flex: 1 }}>
        <Alert severity='info' icon={<i className='tabler-file-unknown' />}>
          {pdfEmbedBlocked ? copy.noEmbed : interpolate(copy.unsupported, { fileName })}
        </Alert>
        {escapeHatch()}
      </Stack>
    )
  }

  if (loading) {
    return (
      <Stack
        spacing={2}
        alignItems='center'
        justifyContent='center'
        role='status'
        aria-live='polite'
        aria-busy='true'
        sx={{ p: 6, flex: 1 }}
      >
        <CircularProgress />
        <Typography variant='body2' color='text.secondary'>
          {copy.loading}
        </Typography>
      </Stack>
    )
  }

  if (failed || !blobUrl) {
    return (
      <Stack spacing={3} alignItems='center' justifyContent='center' sx={{ p: 6, flex: 1 }}>
        <Alert severity='error' icon={<i className='tabler-alert-triangle' />}>
          {copy.loadError}
        </Alert>
        {escapeHatch()}
      </Stack>
    )
  }

  if (mimeType === 'application/pdf') {
    return (
      <Box
        component='iframe'
        src={blobUrl}
        // `title` es el nombre accesible del marco (regla axe `frame-title`): sin él,
        // un lector de pantalla anuncia "marco" y nada más.
        title={interpolate(copy.frameTitle, { fileName })}
        sx={{ inlineSize: '100%', blockSize: '100%', border: 0, borderRadius: 1, backgroundColor: 'common.white' }}
      />
    )
  }

  return (
    <Box
      component='img'
      src={blobUrl}
      alt={fileName}
      sx={{ maxInlineSize: '100%', blockSize: 'auto', alignSelf: 'center', borderRadius: 1 }}
    />
  )
}

export default GreenhouseDocumentPreview
