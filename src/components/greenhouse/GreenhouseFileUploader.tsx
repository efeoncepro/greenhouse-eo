'use client'

import { useMemo, useState, useTransition } from 'react'
import type { ReactNode } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { styled } from '@mui/material/styles'
import type { BoxProps } from '@mui/material/Box'

import { useDropzone } from 'react-dropzone'

import AppReactDropzone from '@/libs/styles/AppReactDropzone'
import type { GreenhouseAssetRecord, GreenhouseAssetContext, PrivateAssetUploadResponse } from '@/types/assets'

type DraftUploadContext = Extract<GreenhouseAssetContext, 'leave_request_draft' | 'purchase_order_draft' | 'master_agreement_draft' | 'certification_draft' | 'evidence_draft'>

export type UploadedFileValue = {
  assetId: string
  filename: string
  mimeType: string
  sizeBytes: number
  downloadUrl: string
  asset: GreenhouseAssetRecord
}

type GreenhouseFileUploaderProps = {
  contextType: DraftUploadContext
  value: UploadedFileValue | null
  onChange: (value: UploadedFileValue | null) => void
  title: string
  helperText: string
  emptyTitle?: string
  emptyDescription?: string
  browseCta?: string
  replaceCta?: string
  uploadingCta?: string
  removeCta?: string
  disabled?: boolean
  ownerClientId?: string | null
  ownerSpaceId?: string | null
  ownerMemberId?: string | null
  metadataLabel?: string | null
  acceptedMimeTypes?: string[]
  maxSizeBytes?: number
}

const DEFAULT_ACCEPTED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024

const Dropzone = styled(AppReactDropzone)<BoxProps>(({ theme }) => ({
  '& .dropzone': {
    minHeight: 'unset',
    padding: theme.spacing(6),
    [theme.breakpoints.down('sm')]: {
      paddingInline: theme.spacing(4)
    }
  }
}))

const buildAcceptMap = (mimeTypes: string[]) =>
  mimeTypes.reduce<Record<string, string[]>>((accumulator, mimeType) => {
    accumulator[mimeType] = []

    return accumulator
  }, {})

const formatFileSize = (sizeBytes: number) =>
  sizeBytes >= 1024 * 1024
    ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(sizeBytes / 1024))} KB`

const renderFilePreview = (mimeType: string): ReactNode => {
  if (mimeType.startsWith('image/')) {
    return <i className='tabler-photo text-[22px]' />
  }

  if (mimeType === 'application/pdf') {
    return <i className='tabler-file-type-pdf text-[22px]' />
  }

  return <i className='tabler-file-description text-[22px]' />
}

const GreenhouseFileUploader = ({
  contextType,
  value,
  onChange,
  title,
  helperText,
  emptyTitle = 'Arrastra tu archivo aquí',
  emptyDescription = 'También puedes buscarlo manualmente desde tu equipo.',
  browseCta = 'Buscar archivo',
  replaceCta = 'Reemplazar archivo',
  uploadingCta = 'Subiendo...',
  removeCta = 'Quitar',
  disabled = false,
  ownerClientId,
  ownerSpaceId,
  ownerMemberId,
  metadataLabel,
  acceptedMimeTypes = DEFAULT_ACCEPTED_MIME_TYPES,
  maxSizeBytes = DEFAULT_MAX_BYTES
}: GreenhouseFileUploaderProps) => {
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [isUploading, startUpload] = useTransition()
  const accept = useMemo(() => buildAcceptMap(acceptedMimeTypes), [acceptedMimeTypes])

  const uploadFile = (file: File) => {
    setFeedback(null)

    startUpload(async () => {
      try {
        if (value?.assetId) {
          await fetch(`/api/assets/private/${encodeURIComponent(value.assetId)}`, {
            method: 'DELETE'
          }).catch(() => null)
        }

        const formData = new FormData()

        formData.set('file', file)
        formData.set('contextType', contextType)

        if (ownerClientId) formData.set('ownerClientId', ownerClientId)
        if (ownerSpaceId) formData.set('ownerSpaceId', ownerSpaceId)
        if (ownerMemberId) formData.set('ownerMemberId', ownerMemberId)
        if (metadataLabel) formData.set('metadataLabel', metadataLabel)

        const response = await fetch('/api/assets/private', {
          method: 'POST',
          body: formData
        })

        const payload = (await response.json().catch(() => null)) as PrivateAssetUploadResponse | { error?: string } | null

        if (!response.ok || !payload || !('asset' in payload)) {
          throw new Error(payload && 'error' in payload && payload.error ? payload.error : 'No fue posible subir el archivo.')
        }

        onChange({
          assetId: payload.asset.assetId,
          filename: payload.asset.filename,
          mimeType: payload.asset.mimeType,
          sizeBytes: payload.asset.sizeBytes,
          downloadUrl: payload.downloadUrl,
          asset: payload.asset
        })
        setFeedback({ tone: 'success', text: 'Archivo cargado correctamente.' })
      } catch (error) {
        setFeedback({
          tone: 'error',
          text: error instanceof Error ? error.message : 'No fue posible subir el archivo.'
        })
      }
    })
  }

  const { getInputProps, getRootProps, open } = useDropzone({
    multiple: false,
    noClick: true,
    noKeyboard: true,
    disabled: disabled || isUploading,
    maxSize: maxSizeBytes,
    accept,
    onDropAccepted: files => {
      const [file] = files

      if (file) {
        uploadFile(file)
      }
    },
    onDropRejected: rejections => {
      const firstError = rejections[0]?.errors[0]

      if (firstError?.code === 'file-too-large') {
        setFeedback({ tone: 'error', text: `El archivo supera el máximo permitido de ${formatFileSize(maxSizeBytes)}.` })

        return
      }

      setFeedback({ tone: 'error', text: 'El tipo de archivo no es válido para este formulario.' })
    }
  })

  const handleRemove = async () => {
    if (!value) {
      return
    }

    try {
      const response = await fetch(`/api/assets/private/${encodeURIComponent(value.assetId)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null

        throw new Error(payload?.error || 'No fue posible quitar el archivo.')
      }

      onChange(null)
      setFeedback(null)
    } catch (error) {
      setFeedback({
        tone: 'error',
        text: error instanceof Error ? error.message : 'No fue posible quitar el archivo.'
      })
    }
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography variant='subtitle2'>{title}</Typography>
        <Typography variant='caption' color='text.secondary'>
          {helperText}
        </Typography>
      </Stack>

      <Dropzone>
        <div {...getRootProps({ className: 'dropzone' })}>
          <input {...getInputProps()} />
          <Stack spacing={1.5} alignItems='center' sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'primary.50',
                color: 'primary.main'
              }}
            >
              <i className='tabler-upload text-[24px]' />
            </Box>
            <Typography variant='h6'>{emptyTitle}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {emptyDescription}
            </Typography>
            <Button variant='tonal' size='small' onClick={open} disabled={disabled || isUploading}>
              {isUploading ? uploadingCta : value ? replaceCta : browseCta}
            </Button>
          </Stack>
        </div>

        {value ? (
          <List>
            <ListItem className='pis-4 plb-3'>
              <div className='file-details'>
                <div className='file-preview'>{renderFilePreview(value.mimeType)}</div>
                <div>
                  <Typography className='file-name font-medium' color='text.primary'>
                    {value.filename}
                  </Typography>
                  <Typography className='file-size' variant='body2'>
                    {formatFileSize(value.sizeBytes)}
                  </Typography>
                </div>
              </div>
              <Stack direction='row' spacing={1} alignItems='center'>
                <Button
                  component='a'
                  href={value.downloadUrl}
                  target='_blank'
                  rel='noreferrer'
                  variant='text'
                  size='small'
                >
                  Ver
                </Button>
                <IconButton onClick={handleRemove} disabled={disabled || isUploading} aria-label={removeCta}>
                  <i className='tabler-x text-xl' />
                </IconButton>
              </Stack>
            </ListItem>
          </List>
        ) : null}
      </Dropzone>

      {feedback ? <Alert severity={feedback.tone}>{feedback.text}</Alert> : null}
    </Stack>
  )
}

export default GreenhouseFileUploader
