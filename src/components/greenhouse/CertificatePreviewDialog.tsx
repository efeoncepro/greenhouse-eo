'use client'

import { useCallback, useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

type CertificatePreviewDialogProps = {
  open: boolean
  onClose: () => void
  assetDownloadUrl: string | null
  assetMimeType: string | null
  certificationName: string
}

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
    if (!assetDownloadUrl || !open) return

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
  }, [assetDownloadUrl, open])

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
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              color: 'text.secondary'
            }}
          >
            <i className='tabler-file-off text-[28px]' />
          </Box>
          <Typography variant='body1' color='text.secondary'>
            Sin evidencia adjunta
          </Typography>
        </Stack>
      )
    }

    if (loading) {
      return (
        <Stack alignItems='center' justifyContent='center' sx={{ py: 8 }}>
          <CircularProgress />
          <Typography variant='body2' color='text.secondary' sx={{ mt: 2 }}>
            Cargando vista previa...
          </Typography>
        </Stack>
      )
    }

    if (error || !blobUrl) {
      return (
        <Stack alignItems='center' justifyContent='center' spacing={2} sx={{ py: 8 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              color: 'text.secondary'
            }}
          >
            <i className='tabler-file-description text-[28px]' />
          </Box>
          <Typography variant='body1' color='text.secondary'>
            No se pudo cargar la vista previa.
          </Typography>
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

    if (assetMimeType.startsWith('image/')) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <Box
            component='img'
            src={blobUrl}
            alt={`Certificado: ${certificationName}`}
            sx={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              borderRadius: 1
            }}
          />
        </Box>
      )
    }

    if (assetMimeType === 'application/pdf') {
      return (
        <Box
          component='iframe'
          src={blobUrl}
          title={`Certificado: ${certificationName}`}
          sx={{
            width: '100%',
            height: '70vh',
            border: 'none',
            borderRadius: 1
          }}
        />
      )
    }

    return (
      <Stack alignItems='center' justifyContent='center' spacing={2} sx={{ py: 8 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'text.secondary'
          }}
        >
          <i className='tabler-file-description text-[28px]' />
        </Box>
        <Typography variant='body1' color='text.secondary'>
          No es posible previsualizar este archivo.
        </Typography>
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
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth='md'
      aria-labelledby='certificate-preview-title'
    >
      <DialogTitle
        id='certificate-preview-title'
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
      >
        <Typography variant='h6' component='span' noWrap sx={{ flex: 1 }}>
          {certificationName}
        </Typography>
        <IconButton onClick={handleClose} aria-label='Cerrar vista previa' size='small'>
          <i className='tabler-x' />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{renderContent()}</DialogContent>
    </Dialog>
  )
}

export default CertificatePreviewDialog
