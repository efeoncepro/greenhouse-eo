'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'

import { useListAnimation } from '@/hooks/useListAnimation'

export interface ContextChipStripProps {
  children: ReactNode
  ariaLabel: string

  /** Cuando se activa, el strip intercepta scroll horizontal con gradient edges.
   * En desktop la fila siempre wrap'ea a nuevas lineas; en mobile hace scroll-x. */
  scrollMobile?: boolean
}

/**
 * Horizontal toolbar de ContextChips. En desktop hace wrap a multiples lineas
 * manteniendo spacing consistente. En mobile (< 700px) colapsa a scroll-x
 * horizontal nativo con shadow edges para indicar overflow.
 */
const ContextChipStrip = ({ children, ariaLabel, scrollMobile = true }: ContextChipStripProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [chipsRef] = useListAnimation()
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)

  useEffect(() => {
    const el = scrollRef.current

    if (!el) return

    const updateShadows = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el

      setShowLeftShadow(scrollLeft > 4)
      setShowRightShadow(scrollLeft + clientWidth < scrollWidth - 4)
    }

    updateShadows()
    el.addEventListener('scroll', updateShadows, { passive: true })

    const resizeObserver = new ResizeObserver(updateShadows)

    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', updateShadows)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <Box
      role='toolbar'
      aria-label={ariaLabel}
      sx={theme => ({
        position: 'relative',
        width: '100%',

        // Shadow edges solo cuando hay overflow en mobile
        '&::before, &::after': scrollMobile
          ? {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              width: 32,
              pointerEvents: 'none',
              zIndex: 1,
              transition: 'opacity 150ms ease-out',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              [theme.breakpoints.up('md')]: { display: 'none' }
            }
          : undefined,
        '&::before': scrollMobile
          ? {
              left: 0,
              background: `linear-gradient(to right, ${alpha(theme.palette.background.paper, 0.96)}, transparent)`,
              opacity: showLeftShadow ? 1 : 0
            }
          : undefined,
        '&::after': scrollMobile
          ? {
              right: 0,
              background: `linear-gradient(to left, ${alpha(theme.palette.background.paper, 0.96)}, transparent)`,
              opacity: showRightShadow ? 1 : 0
            }
          : undefined
      })}
    >
      <Box
        ref={scrollRef}
        sx={theme => ({
          [theme.breakpoints.down('md')]: scrollMobile
            ? {
                overflowX: 'auto',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' }
              }
            : {}
        })}
      >
        <Stack
          ref={chipsRef}
          direction='row'
          spacing={1.5}
          sx={theme => ({
            flexWrap: 'wrap',
            rowGap: 1.5,
            alignItems: 'stretch',
            [theme.breakpoints.down('md')]: scrollMobile
              ? {
                  flexWrap: 'nowrap',
                  width: 'max-content',
                  minWidth: '100%'
                }
              : {}
          })}
          useFlexGap
        >
          {children}
        </Stack>
      </Box>
    </Box>
  )
}

export default ContextChipStrip
