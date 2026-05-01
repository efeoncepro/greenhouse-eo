'use client'

// TASK-743 — Canonical wrapper for operational data tables.
// Spec: docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md
//
// Responsibilities:
// 1. Establish container-type for container queries.
// 2. Observe real container width via ResizeObserver.
// 3. Resolve effective density via useTableDensityResolution.
// 4. Provide TableDensityProvider so descendants (InlineNumericEditor, etc.)
//    read the resolved tokens.
// 5. Expose horizontal scroll affordances: sticky-first column hooks +
//    gradient fade on the right edge when scroll remains.
// 6. Expose `data-table-shell={identifier}` for visual regression hooks.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'

import { TableDensityProvider, useTableDensityResolution } from './useTableDensity'
import type { TableDensity } from './density'

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export interface DataTableShellProps {
  children: React.ReactNode
  density?: TableDensity
  stickyFirstColumn?: boolean
  identifier: string
  ariaLabel: string
  containerSx?: SxProps<Theme>
  className?: string
}

const DataTableShell = ({
  children,
  density: densityProp,
  stickyFirstColumn = false,
  identifier,
  ariaLabel,
  containerSx,
  className
}: DataTableShellProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState<number | null>(null)

  const [scrollState, setScrollState] = useState<{ overflow: boolean; remainingRight: number }>({
    overflow: false,
    remainingRight: 0
  })

  const resolution = useTableDensityResolution({ prop: densityProp, containerWidth })

  useIsomorphicLayoutEffect(() => {
    const node = containerRef.current

    if (!node || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  useIsomorphicLayoutEffect(() => {
    const scroller = scrollRef.current

    if (!scroller) return

    const updateScrollState = () => {
      const overflow = scroller.scrollWidth - scroller.clientWidth > 1
      const remainingRight = overflow ? scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft : 0

      setScrollState({ overflow, remainingRight })
    }

    updateScrollState()

    scroller.addEventListener('scroll', updateScrollState, { passive: true })

    let resizeObserver: ResizeObserver | undefined

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateScrollState)
      resizeObserver.observe(scroller)
    }

    return () => {
      scroller.removeEventListener('scroll', updateScrollState)
      resizeObserver?.disconnect()
    }
  }, [resolution.density])

  const contextValue = useMemo(
    () => ({
      density: resolution.density,
      tokens: resolution.tokens,
      containerWidth,
      autoDegraded: resolution.autoDegraded,
      userPreferredDensity: resolution.userPreferredDensity,
      setUserPreferredDensity: resolution.setUserPreferredDensity
    }),
    [resolution, containerWidth]
  )

  const stickyEnabled = stickyFirstColumn && scrollState.overflow

  return (
    <TableDensityProvider value={contextValue}>
      <Box
        ref={containerRef}
        className={className}
        data-table-shell={identifier}
        data-density={resolution.density}
        data-auto-degraded={resolution.autoDegraded ? 'true' : 'false'}
        data-overflow={scrollState.overflow ? 'true' : 'false'}
        sx={[
          {
            containerType: 'inline-size',
            containerName: 'data-table-shell',
            position: 'relative',
            width: '100%'
          },
          ...(Array.isArray(containerSx) ? containerSx : containerSx ? [containerSx] : [])
        ]}
      >
        <Box
          ref={scrollRef}
          role='region'
          aria-label={ariaLabel}
          tabIndex={scrollState.overflow ? 0 : -1}
          sx={{
            width: '100%',
            overflowX: 'auto',
            overflowY: 'visible',
            // sticky-first: enabled via CSS only when overflow is real, to avoid
            // visual seam when not needed.
            ...(stickyEnabled
              ? {
                  '& thead tr > th:first-of-type, & tbody tr > td:first-of-type': {
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    backgroundColor: 'var(--mui-palette-background-paper)',
                    boxShadow: '1px 0 0 0 var(--mui-palette-divider)'
                  },
                  '& thead tr > th:first-of-type': {
                    zIndex: 3
                  }
                }
              : {})
          }}
        >
          {children}
        </Box>
        {scrollState.overflow && scrollState.remainingRight > 4 && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 32,
              pointerEvents: 'none',
              background:
                'linear-gradient(to right, transparent, var(--mui-palette-background-paper))'
            }}
          />
        )}
      </Box>
    </TableDensityProvider>
  )
}

export default DataTableShell
