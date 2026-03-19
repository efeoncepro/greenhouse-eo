'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import Logo from '@components/layout/shared/Logo'

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [validating, setValidating] = useState(true)
  const [valid, setValid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setValidating(false)

      return
    }

    fetch('/api/account/validate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then(res => res.json())
      .then(data => setValid(data.valid && data.tokenType === 'invite'))
      .catch(() => setValid(false))
      .finally(() => setValidating(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')

      return
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')

      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/account/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 2000)
      } else {
        setError(data.message || 'Error al crear la cuenta.')
      }
    } catch {
      setError('Error de conexión.')
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

            {validating ? (
              <Stack spacing={2} alignItems='center' sx={{ width: '100%' }}>
                <CircularProgress />
                <Typography color='text.secondary'>Verificando invitación...</Typography>
              </Stack>
            ) : success ? (
              <Stack spacing={2}>
                <Alert severity='success'>Cuenta creada exitosamente. Redirigiendo al login...</Alert>
              </Stack>
            ) : !token || !valid ? (
              <Stack spacing={2}>
                <Typography variant='h5'>Invitación inválida o expirada</Typography>
                <Typography color='text.secondary'>
                  Este enlace de invitación ya fue usado o ha expirado. Contacta a tu administrador para solicitar
                  una nueva invitación.
                </Typography>
                <Link href='/login' style={{ textDecoration: 'none' }}>
                  <Button variant='contained'>Ir al login</Button>
                </Link>
              </Stack>
            ) : (
              <>
                <Stack spacing={1.5}>
                  <Typography variant='h4'>Bienvenido a Greenhouse</Typography>
                  <Typography color='text.secondary'>
                    Crea tu contraseña para activar tu cuenta. Debe tener al menos 8 caracteres.
                  </Typography>
                </Stack>

                {error && <Alert severity='error' sx={{ width: '100%' }}>{error}</Alert>}

                <Box component='form' onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label='Contraseña'
                      type='password'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <TextField
                      fullWidth
                      label='Confirmar contraseña'
                      type='password'
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                    <Button
                      fullWidth
                      variant='contained'
                      type='submit'
                      disabled={loading || !password || !confirm}
                    >
                      {loading ? <CircularProgress size={24} color='inherit' /> : 'Crear mi cuenta'}
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </div>
  )
}
