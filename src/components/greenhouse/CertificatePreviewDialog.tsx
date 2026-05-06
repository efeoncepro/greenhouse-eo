'use client'

import { useCallback, useEffect, useState } from 'react'

import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

const TASK407_ARIA_CERRAR_VISTA_PREVIA = "Cerrar vista previa"


pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CertificatePreviewDialogProps = {
  open: boolean
  onClose: () => void
  assetDownloadUrl: string | null
  assetMimeType: string | null
  certificationName: string
}

// ---------------------------------------------------------------------------
// PDF Viewer sub-component
// ---------------------------------------------------------------------------

function PdfViewer({ blobUrl }: { blobUrl: string }) {
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale, setScale] = useState(1.0)

  const onDocumentLoadSuccess = ({ numPages: total }: { numPages: number }) => {
    setNumPages(total)
    setCurrentPage(1)
  }

  const goToPrev = () => setCurrentPage(p => Math.max(1, p - 1))
  const goToNext = () => setCurrentPage(p => Math.min(numPages, p + 1))
  const zoomIn = () => setScale(s => Math.min(2.5, +(s + 0.25).toFixed(2)))
  const zoomOut = () => setScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))
  const zoomReset = () => setScale(1.0)

  return (
    <Stack sx={{ height: '75vh', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='center'
        spacing={1}
        sx={{ py: 1, px: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 1, flexShrink: 0 }}
      >
        <Tooltip title='Pagina anterior'>
          <span>
            <IconButton size='small' onClick={goToPrev} disabled={currentPage <= 1}>
              <i className='tabler-chevron-left' />
            </IconButton>
          </span>
        </Tooltip>

        <Typography variant='body2' sx={{ minWidth: 80, textAlign: 'center', userSelect: 'none' }}>
          {currentPage} / {numPages || '...'}
        </Typography>

        <Tooltip title='Pagina siguiente'>
          <span>
            <IconButton size='small' onClick={goToNext} disabled={currentPage >= numPages}>
              <i className='tabler-chevron-right' />
            </IconButton>
          </span>
        </Tooltip>

        <Divider orientation='vertical' flexItem sx={{ mx: 1 }} />

        <Tooltip title='Alejar'>
          <span>
            <IconButton size='small' onClick={zoomOut} disabled={scale <= 0.5}>
              <i className='tabler-zoom-out' />
            </IconButton>
          </span>
        </Tooltip>

        <Typography variant='caption' sx={{ minWidth: 45, textAlign: 'center', userSelect: 'none' }}>
          {Math.round(scale * 100)}%
        </Typography>

        <Tooltip title='Acercar'>
          <span>
            <IconButton size='small' onClick={zoomIn} disabled={scale >= 2.5}>
              <i className='tabler-zoom-in' />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title='Restablecer zoom'>
          <IconButton size='small' onClick={zoomReset}>
            <i className='tabler-zoom-reset' />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Document area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 1
        }}
      >
        <Document
          file={blobUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <Stack alignItems='center' justifyContent='center' sx={{ py: 10 }}>
              <CircularProgress size={32} />
            </Stack>
          }
          error={
            <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }}>
              <Typography color='error'>No se pudo cargar el documento.</Typography>
            </Stack>
          }
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            loading={
              <Stack alignItems='center' justifyContent='center' sx={{ py: 10 }}>
                <CircularProgress size={24} />
              </Stack>
            }
          />
        </Document>
      </Box>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Image Viewer sub-component
// ---------------------------------------------------------------------------

function ImageViewer({ blobUrl, alt }: { blobUrl: string; alt: string }) {
  const [scale, setScale] = useState(1.0)

  const zoomIn = () => setScale(s => Math.min(3, +(s + 0.25).toFixed(2)))
  const zoomOut = () => setScale(s => Math.max(0.25, +(s - 0.25).toFixed(2)))
  const zoomReset = () => setScale(1.0)

  return (
    <Stack sx={{ height: '75vh', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Stack
        direction='row'
        alignItems='center'
        justifyContent='center'
        spacing={1}
        sx={{ py: 1, px: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 1, flexShrink: 0 }}
      >
        <Tooltip title='Alejar'>
          <span>
            <IconButton size='small' onClick={zoomOut} disabled={scale <= 0.25}>
              <i className='tabler-zoom-out' />
            </IconButton>
          </span>
        </Tooltip>

        <Typography variant='caption' sx={{ minWidth: 45, textAlign: 'center', userSelect: 'none' }}>
          {Math.round(scale * 100)}%
        </Typography>

        <Tooltip title='Acercar'>
          <span>
            <IconButton size='small' onClick={zoomIn} disabled={scale >= 3}>
              <i className='tabler-zoom-in' />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title='Restablecer zoom'>
          <IconButton size='small' onClick={zoomReset}>
            <i className='tabler-zoom-reset' />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Image area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: scale <= 1 ? 'center' : 'flex-start',
          bgcolor: 'grey.100',
          borderRadius: 1,
          p: 2
        }}
      >
        <Box
          component='img'
          src={blobUrl}
          alt={alt}
          sx={{
            maxWidth: scale === 1 ? '100%' : 'none',
            width: scale !== 1 ? `${scale * 100}%` : 'auto',
            maxHeight: scale === 1 ? '100%' : 'none',
            objectFit: 'contain',
            transition: 'width 0.15s ease'
          }}
        />
      </Box>
    </Stack>
  )
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

const CertificatePreviewDialog = ({
  open,
  onClose,
  assetDownloadUrl,
  assetMimeType,
  certificationName
}: CertificatePreviewDialogProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const fetchBlob = useCallback(async () => {
    if (!assetDownloadUrl) return

    setLoading(true)
    setError(false)

    try {
      const res = await fetch(assetDownloadUrl, { credentials: 'include' })

      if (!res.ok) throw new Error('fetch failed')

      const blob = await res.blob()

      setBlobUrl(URL.createObjectURL(blob))
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [assetDownloadUrl])

  useEffect(() => {
    if (open && assetDownloadUrl) {
      fetchBlob()
    }

    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
        setBlobUrl(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assetDownloadUrl])

  const handleClose = () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }

    setError(false)
    onClose()
  }

  const renderContent = () => {
    if (!assetDownloadUrl || !assetMimeType) {
      return (
        <Stack alignItems='center' justifyContent='center' spacing={2} sx={{ py: 8 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.secondary' }}>
            <i className='tabler-file-off text-[28px]' />
          </Box>
          <Typography variant='body1' color='text.secondary'>Sin evidencia adjunta</Typography>
        </Stack>
      )
    }

    if (loading) {
      return (
        <Stack alignItems='center' justifyContent='center' sx={{ py: 10 }}>
          <CircularProgress />
          <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>Cargando documento...</Typography>
        </Stack>
      )
    }

    if (error || !blobUrl) {
      return (
        <Stack alignItems='center' justifyContent='center' spacing={2} sx={{ py: 8 }}>
          <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.secondary' }}>
            <i className='tabler-file-alert text-[28px]' />
          </Box>
          <Typography variant='body1' color='text.secondary'>No se pudo cargar el documento.</Typography>
          <Typography
            component='a'
            href={assetDownloadUrl}
            target='_blank'
            rel='noreferrer'
            variant='body2'
            color='primary'
            sx={{ textDecoration: 'underline' }}
          >
            Descargar archivo
          </Typography>
        </Stack>
      )
    }

    if (assetMimeType === 'application/pdf') {
      return <PdfViewer blobUrl={blobUrl} />
    }

    if (assetMimeType.startsWith('image/')) {
      return <ImageViewer blobUrl={blobUrl} alt={`Certificado: ${certificationName}`} />
    }

    return (
      <Stack alignItems='center' justifyContent='center' spacing={2} sx={{ py: 8 }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: 'action.hover', color: 'text.secondary' }}>
          <i className='tabler-file-description text-[28px]' />
        </Box>
        <Typography variant='body1' color='text.secondary'>No es posible previsualizar este tipo de archivo.</Typography>
        <Typography
          component='a'
          href={assetDownloadUrl}
          target='_blank'
          rel='noreferrer'
          variant='body2'
          color='primary'
          sx={{ textDecoration: 'underline' }}
        >
          Descargar archivo
        </Typography>
      </Stack>
    )
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth='md' aria-labelledby='certificate-preview-title'>
      <DialogTitle
        id='certificate-preview-title'
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
      >
        <Typography variant='h6' component='span' noWrap sx={{ flex: 1 }}>
          {certificationName}
        </Typography>
        <Stack direction='row' spacing={0.5} alignItems='center'>
          <Tooltip title='Descargar'>
            <IconButton
              component='a'
              href={assetDownloadUrl ?? '#'}
              target='_blank'
              rel='noreferrer'
              size='small'
              disabled={!assetDownloadUrl}
            >
              <i className='tabler-download' />
            </IconButton>
          </Tooltip>
          <IconButton onClick={handleClose} aria-label={TASK407_ARIA_CERRAR_VISTA_PREVIA} size='small'>
            <i className='tabler-x' />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 2 }}>{renderContent()}</DialogContent>
    </Dialog>
  )
}

export default CertificatePreviewDialog
