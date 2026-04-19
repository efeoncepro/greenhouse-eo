'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

export interface QuoteShortcutPaletteProps {
  open: boolean
  onClose: () => void
}

interface ShortcutRow {
  keys: string[]
  description: string
  group: 'save' | 'item' | 'nav'
}

const SHORTCUTS: ShortcutRow[] = [
  { keys: ['⌘', 'S'], description: 'Guardar borrador (quedarse en edit)', group: 'save' },
  { keys: ['⌘', '⏎'], description: 'Guardar y cerrar', group: 'save' },
  { keys: ['⌘', '⇧', '⏎'], description: 'Guardar y emitir', group: 'save' },
  { keys: ['⌘', 'N'], description: 'Agregar ítem desde catálogo', group: 'item' },
  { keys: ['Esc'], description: 'Cerrar popover / picker actual', group: 'nav' },
  { keys: ['⌘', '/'], description: 'Mostrar/ocultar esta ayuda', group: 'nav' }
]

const GROUP_LABELS: Record<ShortcutRow['group'], string> = {
  save: 'Guardado',
  item: 'Ítems',
  nav: 'Navegación'
}

/**
 * Shortcut palette modal — abierto vía ⌘/. Lista los atajos disponibles
 * en el quote builder agrupados por categoría.
 */
const QuoteShortcutPalette = ({ open, onClose }: QuoteShortcutPaletteProps) => {
  // Resolver modifier según SO para mostrar el símbolo correcto
  const [modifierSymbol, setModifierSymbol] = useState<'⌘' | 'Ctrl'>('⌘')

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    const isMac = /mac/i.test(navigator.platform) || /mac/i.test(navigator.userAgent)

    setModifierSymbol(isMac ? '⌘' : 'Ctrl')
  }, [])

  const groups = Array.from(new Set(SHORTCUTS.map(s => s.group))) as Array<ShortcutRow['group']>

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='xs'
      fullWidth
      slotProps={{
        paper: {
          sx: theme => ({
            borderRadius: `${theme.shape.customBorderRadius.lg}px`
          })
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction='row' spacing={1} alignItems='center'>
          <i className='tabler-command' aria-hidden='true' style={{ fontSize: 20 }} />
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            Atajos de teclado
          </Typography>
        </Stack>
        <IconButton size='small' onClick={onClose} aria-label='Cerrar'>
          <i className='tabler-x' style={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2.5}>
          {groups.map(group => (
            <Stack key={group} spacing={1}>
              <Typography
                variant='overline'
                color='text.secondary'
                sx={{ letterSpacing: '0.8px', fontWeight: 600 }}
              >
                {GROUP_LABELS[group]}
              </Typography>
              {SHORTCUTS.filter(s => s.group === group).map((s, idx) => (
                <Stack
                  key={idx}
                  direction='row'
                  alignItems='center'
                  justifyContent='space-between'
                  spacing={2}
                >
                  <Typography variant='body2' color='text.primary'>
                    {s.description}
                  </Typography>
                  <Stack direction='row' spacing={0.5}>
                    {s.keys.map((k, kIdx) => (
                      <Box
                        key={kIdx}
                        component='kbd'
                        sx={theme => ({
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 28,
                          height: 24,
                          px: 0.75,
                          fontFamily: theme.typography.fontFamily,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          fontVariantNumeric: 'tabular-nums',
                          color: 'text.primary',
                          backgroundColor: theme.palette.action.hover,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: `${theme.shape.customBorderRadius.sm}px`,
                          boxShadow: `inset 0 -1px 0 ${theme.palette.divider}`
                        })}
                      >
                        {k === '⌘' ? modifierSymbol : k}
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              ))}
            </Stack>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

export default QuoteShortcutPalette
