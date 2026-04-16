'use client'

import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import type { HomeAccessContext, HomeRecommendedShortcut } from '@/types/home'

type Props = {
  shortcuts: HomeRecommendedShortcut[]
  accessContext?: HomeAccessContext | null
}

const AUDIENCE_LABELS: Record<HomeAccessContext['audienceKey'], string> = {
  admin: 'Administracion',
  internal: 'Operacion interna',
  hr: 'Workspace HR',
  finance: 'Workspace Finance',
  collaborator: 'Mi espacio',
  client: 'Vista cliente'
}

const STARTUP_POLICY_LABELS: Record<HomeAccessContext['startupPolicyKey'], string> = {
  client_default: 'Pulse',
  internal_default: 'Pulse',
  hr_workspace: 'Nomina',
  finance_workspace: 'Finanzas',
  my_workspace: 'Mi espacio'
}

const RecommendedShortcuts = ({ shortcuts, accessContext }: Props) => {
  const router = useRouter()

  if (shortcuts.length === 0 && !accessContext) {
    return null
  }

  return (
    <Card
      elevation={0}
      sx={{
        p: 3,
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: 2
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant='subtitle2' sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', color: 'text.secondary', mb: 0.75 }}>
            Continua desde aqui
          </Typography>
          <Typography variant='h6' sx={{ mb: 0.75 }}>
            Tu espacio cambia segun el rol y el tenant activos.
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Abre primero lo que hoy esta habilitado para ti.
          </Typography>
        </Box>

        {accessContext ? (
          <Stack direction='row' spacing={1} useFlexGap flexWrap='wrap'>
            <Chip size='small' variant='outlined' label={`Audiencia: ${AUDIENCE_LABELS[accessContext.audienceKey]}`} />
            <Chip size='small' variant='outlined' label={`Inicio sugerido: ${STARTUP_POLICY_LABELS[accessContext.startupPolicyKey]}`} />
            <Chip size='small' variant='outlined' label={`Modulos activos: ${accessContext.moduleKeys.length}`} />
          </Stack>
        ) : null}

        {shortcuts.length > 0 ? (
          <Stack direction='row' spacing={1.5} useFlexGap flexWrap='wrap'>
            {shortcuts.map(shortcut => (
              <Button
                key={shortcut.id}
                variant='outlined'
                color='inherit'
                onClick={() => router.push(shortcut.route)}
                startIcon={<i className={shortcut.icon} style={{ fontSize: '1rem' }} />}
                sx={{
                  minHeight: 40,
                  borderRadius: 2,
                  justifyContent: 'flex-start'
                }}
              >
                {shortcut.label}
              </Button>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  )
}

export default RecommendedShortcuts
