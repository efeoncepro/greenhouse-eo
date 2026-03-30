'use client'

import { useState } from 'react'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { useForm } from 'react-hook-form'

import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

import { email as emailRule, required } from '@/lib/forms/greenhouse-form-patterns'

type ForgotPasswordFormValues = {
  email: string
}

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ForgotPasswordFormValues>({
    defaultValues: {
      email: ''
    }
  })

  const onSubmit = handleSubmit(async values => {
    setError(null)

    try {
      const res = await fetch('/api/account/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email })
      })

      const data = await res.json()

      if (res.status === 429) {
        setError(data.message)
      } else {
        setSubmitted(true)
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
                  Si tu email está registrado, recibirás un enlace para restablecer tu contraseña.
                  Revisa también tu carpeta de spam.
                </Typography>
                <Link href='/login' style={{ textDecoration: 'none' }}>
                  <Button variant='contained'>Volver al login</Button>
                </Link>
              </Stack>
            ) : (
              <>
                <Stack spacing={1.5}>
                  <Typography variant='h4'>¿Olvidaste tu contraseña?</Typography>
                  <Typography color='text.secondary'>
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </Typography>
                </Stack>

                {error && <Alert severity='error' sx={{ width: '100%' }}>{error}</Alert>}

                <Box component='form' onSubmit={onSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={3}>
                    <CustomTextField
                      fullWidth
                      label='Email'
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
                    <Button
                      fullWidth
                      variant='contained'
                      type='submit'
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <CircularProgress size={24} color='inherit' /> : 'Enviar enlace de recuperación'}
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
