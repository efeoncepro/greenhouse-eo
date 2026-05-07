'use client'

import {
  Children,
  type ReactNode,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react'

import Box from '@mui/material/Box'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'
import { useListAnimation } from '@/hooks/useListAnimation'

export interface ContextChipStripProps {
  children: ReactNode
  ariaLabel: string

  /** Cuando se activa, el strip intercepta scroll horizontal con gradient edges.
   * En desktop la fila siempre wrap'ea a nuevas lineas; en mobile hace scroll-x. */
  scrollMobile?: boolean

  /**
   * Si se define, renderiza inline solo los primeros N children y agrupa el
   * resto en un menú "+M más" anchored a un chip overflow trigger. Útil para
   * builders con 15+ context fields donde wrapping a múltiples filas degrada
   * la jerarquía. `null` o `undefined` = comportamiento default (todos inline).
   *
   * El overflow trigger NO aparece cuando children.length <= overflowAfter.
   */
  overflowAfter?: number | null

  /** Label localizado del menu trigger ("+N más"). Default 'más'. */
  overflowMoreLabel?: string

  /** ARIA label del menu (default `${ariaLabel} — opciones adicionales`). */
  overflowMenuAriaLabel?: string
}

/**
 * Horizontal toolbar de ContextChips. En desktop hace wrap a multiples lineas
 * manteniendo spacing consistente. En mobile (< 700px) colapsa a scroll-x
 * horizontal nativo con shadow edges para indicar overflow.
 *
 * Cuando `overflowAfter` está activo, los children que excedan el límite se
 * agrupan en un dropdown menu accionable por chip "+M más" — pattern de
 * tabbar overflow de Linear / GitHub repo header / Stripe Billing filtros.
 */
const ContextChipStrip = ({
  children,
  ariaLabel,
  scrollMobile = true,
  overflowAfter,
  overflowMoreLabel = 'más',
  overflowMenuAriaLabel
}: ContextChipStripProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [chipsRef] = useListAnimation()
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)
  const [overflowAnchor, setOverflowAnchor] = useState<HTMLElement | null>(null)
  const overflowMenuId = useId()

  const allChildren = useMemo(() => Children.toArray(children), [children])

  const hasOverflow =
    typeof overflowAfter === 'number' && overflowAfter >= 0 && allChildren.length > overflowAfter

  const inlineChildren = hasOverflow ? allChildren.slice(0, overflowAfter as number) : allChildren
  const overflowChildren = hasOverflow ? allChildren.slice(overflowAfter as number) : []

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
          {inlineChildren}
          {hasOverflow ? (
            <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
              <CustomChip
                round='true'
                size='small'
                variant='tonal'
                color='secondary'
                label={`+${overflowChildren.length} ${overflowMoreLabel}`}
                clickable
                onClick={event => setOverflowAnchor(event.currentTarget)}
                aria-haspopup='menu'
                aria-expanded={Boolean(overflowAnchor)}
                aria-controls={overflowAnchor ? overflowMenuId : undefined}
              />
            </Box>
          ) : null}
        </Stack>
      </Box>

      {hasOverflow ? (
        <Menu
          id={overflowMenuId}
          anchorEl={overflowAnchor}
          open={Boolean(overflowAnchor)}
          onClose={() => setOverflowAnchor(null)}
          MenuListProps={{
            'aria-label': overflowMenuAriaLabel ?? `${ariaLabel} — opciones adicionales`,
            dense: true
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: theme => ({
                mt: 0.5,
                minWidth: 220,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.md}px`
              })
            }
          }}
        >
          {overflowChildren.map((child, index) => (
            <MenuItem
              key={isValidElement(child) && child.key !== null ? child.key : `overflow-${index}`}
              disableRipple
              sx={{ py: 1, px: 1.5 }}
            >
              {child}
            </MenuItem>
          ))}
        </Menu>
      ) : null}
    </Box>
  )
}

export default ContextChipStrip
