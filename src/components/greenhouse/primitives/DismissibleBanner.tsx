'use client'

import { useEffect, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'

/**
 * DismissibleBanner — banner informativo persistible por usuario.
 *
 * Patrón canónico para ayuda contextual recurrente que no debería
 * ser intrusiva tras la primera lectura. Una vez cerrado, queda
 * oculto por usuario (localStorage).
 *
 * Motion canónica (motion-design-greenhouse-overlay §7):
 * - Collapse `unmountOnExit` con timeout 200ms (slide-up suave)
 * - IconButton dismiss con hover bg transition 150ms cubic-bezier emphasized
 * - SSR-safe (typeof window check)
 *
 * A11y:
 * - role='status' (anuncio polite)
 * - dismiss button con aria-label canónico (getMicrocopy().aria.dismissHelper)
 *
 * Severity tones:
 * - 'info' (default): bg-tint azul 0.06, border 0.18
 * - 'warning': amarillo
 * - 'success': verde lime
 *
 * Composición:
 * ```
 * <DismissibleBanner storageKey='gh.foo.helper.v1' icon='tabler-info-circle'>
 *   Tu mensaje de ayuda aquí.
 * </DismissibleBanner>
 * ```
 */
export interface DismissibleBannerProps {
  /** localStorage key — debe ser único + versionado (v1, v2 si el copy cambia) */
  storageKey: string

  /** Tabler icon class (aria-hidden) */
  icon?: string

  /** Tone semantic — drives bg + border tint */
  severity?: 'info' | 'warning' | 'success'

  /** Banner body content */
  children: ReactNode

  /** Optional aria-label override for the dismiss button */
  dismissAriaLabel?: string
}

const DismissibleBanner = ({
  storageKey,
  icon = 'tabler-info-circle',
  severity = 'info',
  children,
  dismissAriaLabel
}: DismissibleBannerProps) => {
  const theme = useTheme()
  const t = getMicrocopy()
  const [dismissed, setDismissed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    setDismissed(window.localStorage.getItem(storageKey) === '1')
    setHydrated(true)
  }, [storageKey])

  const dismiss = () => {
    setDismissed(true)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, '1')
    }
  }

  // Avoid SSR flash before hydration — render hidden until we know dismiss state
  if (!hydrated) return null

  return (
    <Collapse in={!dismissed} unmountOnExit timeout={{ enter: 200, exit: 200 }}>
      <Box
        role='status'
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 3,
          py: 2,
          borderRadius: `${theme.shape.customBorderRadius.md}px`,
          color: 'text.secondary',
          backgroundColor: alpha(theme.palette[severity].main, 0.06),
          border: `1px solid ${alpha(theme.palette[severity].main, 0.18)}`
        }}
      >
        {icon ? <i className={icon} aria-hidden='true' /> : null}
        <Typography variant='body2' sx={{ flex: 1 }}>
          {children}
        </Typography>
        <IconButton
          size='small'
          aria-label={dismissAriaLabel ?? t.aria.dismissHelper}
          onClick={dismiss}
          sx={{
            transition: 'background-color 150ms cubic-bezier(0.2, 0, 0, 1), color 150ms cubic-bezier(0.2, 0, 0, 1)',
            '&:hover': { backgroundColor: alpha('#000', 0.06), color: 'text.primary' }
          }}
        >
          <i className='tabler-x' aria-hidden='true' style={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Collapse>
  )
}

export default DismissibleBanner
