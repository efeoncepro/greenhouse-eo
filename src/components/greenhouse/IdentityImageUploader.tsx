'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import type { ChangeEvent, ReactNode } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import type { ThemeColor } from '@core/types'

type IdentityImageUploaderProps = {
  alt: string
  currentImageSrc?: string | null
  fallback: ReactNode
  uploadUrl: string
  helperText: string
  successText: string
  errorText: string
  invalidTypeText: string
  invalidSizeText: string
  idleCta: string
  replaceCta: string
  uploadingCta: string
  size?: number
  variant?: 'rounded' | 'circular'
  color?: ThemeColor
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])

const IdentityImageUploader = ({
  alt,
  currentImageSrc,
  fallback,
  uploadUrl,
  helperText,
  successText,
  errorText,
  invalidTypeText,
  invalidSizeText,
  idleCta,
  replaceCta,
  uploadingCta,
  size = 120,
  variant = 'rounded',
  color = 'primary'
}: IdentityImageUploaderProps) => {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [isUploading, startUpload] = useTransition()

  const imageSrc = previewUrl || currentImageSrc || undefined

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const openPicker = () => {
    inputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setFeedback({ tone: 'error', text: invalidTypeText })
      input.value = ''

      return
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFeedback({ tone: 'error', text: invalidSizeText })
      input.value = ''

      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)

    setPreviewUrl(nextPreviewUrl)
    setFeedback(null)

    startUpload(async () => {
      try {
        const formData = new FormData()

        formData.set('file', file)

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData
        })

        const payload = (await response.json().catch(() => null)) as { error?: string } | null

        if (!response.ok) {
          setFeedback({ tone: 'error', text: payload?.error || errorText })

          return
        }

        setFeedback({ tone: 'success', text: successText })
        router.refresh()
      } catch {
        setFeedback({ tone: 'error', text: errorText })
      } finally {
        input.value = ''
      }
    })
  }

  return (
    <Stack spacing={2} alignItems='center'>
      <CustomAvatar
        alt={alt}
        src={imageSrc}
        variant={variant}
        size={size}
        skin={imageSrc ? undefined : 'light'}
        color={color}
      >
        {!imageSrc ? fallback : null}
      </CustomAvatar>

      <Stack spacing={1} alignItems='center'>
        <input
          ref={inputRef}
          hidden
          type='file'
          accept='image/png,image/jpeg,image/webp,image/svg+xml'
          onChange={handleFileChange}
        />
        <Button
          variant={currentImageSrc ? 'tonal' : 'contained'}
          color='secondary'
          startIcon={<i className='tabler-photo-up' />}
          onClick={openPicker}
          disabled={isUploading}
        >
          {isUploading ? uploadingCta : currentImageSrc ? replaceCta : idleCta}
        </Button>
        <Typography variant='caption' color='text.secondary' sx={{ textAlign: 'center', maxWidth: 220 }}>
          {helperText}
        </Typography>
        {feedback ? (
          <Box sx={{ width: '100%', maxWidth: 280 }}>
            <Alert severity={feedback.tone}>{feedback.text}</Alert>
          </Box>
        ) : null}
      </Stack>
    </Stack>
  )
}

export default IdentityImageUploader
