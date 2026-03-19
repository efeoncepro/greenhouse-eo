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

import Logo from '@components/layout/shared/Logo'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/account/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (res.status === 429) {
        setError(data.message)
      } else {
        setSubmitted(true)
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

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

                <Box component='form' onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label='Email'
                      type='email'
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                    <Button
                      fullWidth
                      variant='contained'
                      type='submit'
                      disabled={loading || !email}
                    >
                      {loading ? <CircularProgress size={24} color='inherit' /> : 'Enviar enlace de recuperación'}
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
