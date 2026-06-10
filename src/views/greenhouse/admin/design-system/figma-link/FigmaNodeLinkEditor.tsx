'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

import CustomTextField from '@core/components/mui/TextField'
import CustomChip from '@core/components/mui/Chip'
import GreenhouseButton from '@/components/greenhouse/primitives/GreenhouseButton'
import AxisWordmark from '@/components/greenhouse/brand/AxisWordmark'

import type { ParsedFigmaUrl } from '@/lib/design-system/figma-nodes/parse-figma-url'

export type FigmaNodeLinkStatus = 'idle' | 'valid' | 'invalid' | 'wrong-file' | 'validating' | 'error'

export interface FigmaNodeLinkEditorProps {
  /** 'link' = no node yet · 'change' = replacing an existing node. */
  mode: 'link' | 'change'
  value: string
  onChange: (value: string) => void
  /** Live-parsed identity of `value` (null when empty/unparseable). */
  parsed: ParsedFigmaUrl | null
  status: FigmaNodeLinkStatus
  errorMessage?: string | null
  /** Current linked node id (change mode), shown as the standing preview. */
  currentNodeId?: string | null
  /** Real node render (Figma REST `/v1/images`). Enrichment — degrades to identity. */
  nodeThumbnailUrl?: string | null
  /** Thumbnail fetch lifecycle. `unavailable` → honest identity-only fallback. */
  thumbnailStatus?: 'idle' | 'loading' | 'ready' | 'unavailable'
  onSubmit: () => void
  onClose: () => void
}

const LABEL = { link: 'Vincular nodo Figma', change: 'Cambiar nodo Figma' } as const
const HELP = 'Pega el link del nodo en AXIS (Figma → Copiar enlace de la selección).'

/**
 * FigmaNodeLinkEditor — presentational content of the inline editor (TASK-1072).
 * Pure: all state is controlled by the parent affordance. Lives inside a
 * `GreenhouseFloatingSurface variant='inlineEditor'`. Honest states — never a
 * fake node thumbnail (enrichment is deferred); the preview is the parsed identity.
 */
const FigmaNodeLinkEditor = ({
  mode,
  value,
  onChange,
  parsed,
  status,
  errorMessage,
  currentNodeId,
  nodeThumbnailUrl,
  thumbnailStatus = 'idle',
  onSubmit,
  onClose
}: FigmaNodeLinkEditorProps) => {
  const submitting = status === 'validating'
  const canSubmit = status === 'valid' && !submitting
  const showInvalid = status === 'invalid' || status === 'wrong-file'
  const previewNodeId = parsed?.nodeId ?? (value.trim() === '' ? currentNodeId ?? null : null)
  const showThumbnail = Boolean(nodeThumbnailUrl) && thumbnailStatus === 'ready'
  const showThumbnailLoading = thumbnailStatus === 'loading'

  return (
    <Stack spacing={3} sx={{ p: 4 }} role='group' aria-label={LABEL[mode]}>
      <Stack direction='row' alignItems='center' justifyContent='space-between' spacing={2}>
        <Typography
          variant='overline'
          sx={{ color: 'text.secondary', letterSpacing: '0.06em', lineHeight: 1.2 }}
        >
          {LABEL[mode]}
        </Typography>
        <Box
          component='button'
          type='button'
          onClick={onClose}
          aria-label='Cerrar'
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            inlineSize: 24,
            blockSize: 24,
            border: 'none',
            background: 'transparent',
            color: 'text.disabled',
            cursor: 'pointer',
            borderRadius: '6px',
            transition: theme => theme.transitions.create('color'),
            '&:hover': { color: 'text.primary' }
          }}
        >
          <i className='tabler-x' style={{ fontSize: 16 }} />
        </Box>
      </Stack>

      <CustomTextField
        autoFocus
        fullWidth
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder='Pega la URL de Figma…'
        error={showInvalid}
        helperText={showInvalid ? errorMessage ?? 'Revisa el enlace' : HELP}
        onKeyDown={e => {
          if (e.key === 'Enter' && canSubmit) onSubmit()
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <i className='tabler-brand-figma' style={{ fontSize: 18 }} />
              </InputAdornment>
            )
          }
        }}
      />

      {previewNodeId ? (
        <Box
          sx={{
            border: theme => `1px solid ${theme.palette.divider}`,
            borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
            p: 3,
            bgcolor: 'action.hover'
          }}
        >
          {showThumbnail ? (
            <Box
              component='img'
              src={nodeThumbnailUrl ?? undefined}
              alt={`Vista previa del nodo ${previewNodeId ?? ''}`.trim()}
              sx={{
                display: 'block',
                inlineSize: '100%',
                blockSize: 'auto',
                mb: 2.5,
                borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                border: theme => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper'
              }}
            />
          ) : showThumbnailLoading ? (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                inlineSize: '100%',
                aspectRatio: '16 / 10',
                mb: 2.5,
                borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                border: theme => `1px solid ${theme.palette.divider}`,
                bgcolor: 'background.paper',
                color: 'text.disabled'
              }}
            >
              <CircularProgress size={20} color='inherit' />
            </Box>
          ) : null}
          <Stack direction='row' alignItems='center' spacing={2.5}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                inlineSize: 40,
                blockSize: 40,
                borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                bgcolor: 'background.paper',
                border: theme => `1px solid ${theme.palette.divider}`
              }}
            >
              <AxisWordmark variant='isotype' height={20} alt='AXIS' />
            </Box>
            <Stack spacing={1.5} sx={{ minInlineSize: 0 }}>
              <Stack direction='row' spacing={1.5} flexWrap='wrap' useFlexGap>
                <CustomChip label={`node ${previewNodeId}`} size='small' variant='tonal' round='true' />
              </Stack>
              <Typography variant='caption' sx={{ color: 'text.disabled' }}>
                {parsed ? 'Nodo detectado en el archivo AXIS' : 'Nodo vinculado actualmente'}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      ) : null}

      {status === 'error' ? (
        <Alert severity='error' sx={{ py: 1.5 }}>
          {errorMessage ?? 'No se pudo vincular el nodo. Reintenta.'}
        </Alert>
      ) : null}

      <GreenhouseButton
        fullWidth
        onClick={onSubmit}
        disabled={!canSubmit}
        leadingIcon={
          submitting ? (
            <CircularProgress size={16} color='inherit' />
          ) : (
            <i className='tabler-link' style={{ fontSize: 18 }} />
          )
        }
      >
        {submitting ? 'Vinculando…' : mode === 'change' ? 'Actualizar nodo' : 'Vincular'}
      </GreenhouseButton>
    </Stack>
  )
}

export default FigmaNodeLinkEditor
