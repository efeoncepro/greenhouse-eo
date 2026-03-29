'use client'

import { useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { ConfirmDialog } from '@/components/dialogs'

type ActionDefinition = {
  id: string
  label: string
  description: string
  endpoint: string
  confirmTitle: string
  confirmDescription: string
  confirmColor?: 'primary' | 'error' | 'warning' | 'success' | 'info' | 'secondary'
}

type Props = {
  title: string
  subtitle: string
  actions: ActionDefinition[]
}

type ActionResult = {
  status: 'idle' | 'success' | 'error'
  summary?: string
}

const AdminOperationalActionsPanel = ({ title, subtitle, actions }: Props) => {
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, ActionResult>>({})

  const activeAction = useMemo(
    () => actions.find(action => action.id === openActionId) ?? null,
    [actions, openActionId]
  )

  const handleRun = async (action: ActionDefinition) => {
    setLoadingActionId(action.id)

    try {
      const response = await fetch(action.endpoint, { method: 'POST' })
      const json = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage = typeof json.error === 'string' ? json.error : 'La acción no pudo completarse.'

        setResults(current => ({
          ...current,
          [action.id]: { status: 'error', summary: errorMessage }
        }))

        return
      }

      setResults(current => ({
        ...current,
        [action.id]: {
          status: 'success',
          summary: Object.entries(json as Record<string, unknown>)
            .slice(0, 4)
            .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value)}`)
            .join(' · ') || 'Operación completada.'
        }
      }))
    } catch {
      setResults(current => ({
        ...current,
        [action.id]: { status: 'error', summary: 'La acción no pudo completarse por un fallo de red.' }
      }))
    } finally {
      setLoadingActionId(null)
    }
  }

  return (
    <>
      <Stack spacing={1}>
        <Typography variant='h5'>{title}</Typography>
        <Typography variant='body2' color='text.secondary'>
          {subtitle}
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' } }}>
        {actions.map(action => {
          const result = results[action.id] ?? { status: 'idle' as const }
          const isLoading = loadingActionId === action.id

          return (
            <Card key={action.id} variant='outlined'>
              <CardContent>
                <Stack spacing={2.5}>
                  <Stack direction='row' justifyContent='space-between' alignItems='flex-start' gap={2}>
                    <Stack spacing={0.75}>
                      <Typography variant='h6'>{action.label}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {action.description}
                      </Typography>
                    </Stack>
                    <Chip size='small' variant='outlined' label='Manual' />
                  </Stack>

                  {result.status !== 'idle' ? (
                    <Alert severity={result.status === 'success' ? 'success' : 'error'}>
                      {result.summary}
                    </Alert>
                  ) : null}

                  <Button
                    variant='contained'
                    color={action.confirmColor ?? 'primary'}
                    onClick={() => setOpenActionId(action.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Procesando...' : action.label}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {activeAction ? (
        <ConfirmDialog
          open={Boolean(activeAction)}
          setOpen={() => setOpenActionId(null)}
          title={activeAction.confirmTitle}
          description={activeAction.confirmDescription}
          confirmLabel={activeAction.label}
          confirmColor={activeAction.confirmColor ?? 'primary'}
          loading={loadingActionId === activeAction.id}
          onConfirm={async () => {
            await handleRun(activeAction)
          }}
        />
      ) : null}
    </>
  )
}

export default AdminOperationalActionsPanel
