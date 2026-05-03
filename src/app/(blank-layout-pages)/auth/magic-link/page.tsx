'use client'

import { useState } from 'react'

import Link from 'next/link'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useForm } from 'react-hook-form'

import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

import { email as emailRule, required } from '@/lib/forms/greenhouse-form-patterns'

type MagicLinkFormValues = {
  email: string
}

export default function MagicLinkRequestPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<MagicLinkFormValues>({
    defaultValues: { email: '' }
  })

  const onSubmit = handleSubmit(async values => {
    setError(null)

    try {
      const res = await fetch('/api/auth/magic-link/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email })
      })

      // The endpoint always returns 200 (anti-enumeration); we always show
      // the same confirmation regardless of whether the email is registered.
      if (res.ok) {
        setSubmitted(true)
      } else {
        setError('Error de conexión. Intenta de nuevo en unos minutos.')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    }
  })

  return (
    <div className='flex min-bs-[100dvh] items-center justify-center bg-[var(--mui-palette-background-default)] p-6'>
      <Card sx={{ width: '100%', maxWidth: 520, borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 5, md: 8 } }}>
          <Stack spacing={4} alignItems='flex-start'>
            <Logo />

            {submitted ? (
              <Stack spacing={2}>
                <Typography variant='h5'>Revisa tu correo</Typography>
                <Typography color='text.secondary'>
                  Si tu email está registrado, recibirás un enlace de acceso por correo en los próximos
                  minutos. El enlace funciona una sola vez y vence en 15 minutos.
                </Typography>
                <Typography color='text.secondary' variant='body2'>
                  Revisa también tu carpeta de Spam.
                </Typography>
                <Link href='/login' style={{ textDecoration: 'none' }}>
                  <Button variant='contained'>Volver al login</Button>
                </Link>
              </Stack>
            ) : (
              <>
                <Stack spacing={1.5}>
                  <Typography variant='h4'>Acceso por link mágico</Typography>
                  <Typography color='text.secondary'>
                    Si no puedes entrar con Microsoft, Google ni con email y contraseña, te enviamos
                    un enlace de acceso por correo. El enlace funciona una sola vez y vence en 15 minutos.
                  </Typography>
                </Stack>

                {error && <Alert severity='error' sx={{ width: '100%' }}>{error}</Alert>}

                <Box component='form' onSubmit={onSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={3}>
                    <CustomTextField
                      fullWidth
                      label='Email corporativo'
                      type='email'
                      error={Boolean(errors.email)}
                      helperText={errors.email?.message}
                      autoFocus
                      {...register('email', {
                        validate: {
                          required: required('Email'),
                          email: emailRule
                        }
                      })}
                    />
                    <Button fullWidth variant='contained' type='submit' disabled={isSubmitting}>
                      {isSubmitting ? <CircularProgress size={24} color='inherit' /> : 'Enviarme el link'}
                    </Button>
                  </Stack>
                </Box>

                <Link href='/login' style={{ textDecoration: 'none' }}>
                  <Typography color='primary' variant='body2'>← Volver al login</Typography>
                </Link>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </div>
  )
}
