'use client'

import { useEffect, useRef } from 'react'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'

import { useDragAndDrop } from '@formkit/drag-and-drop/react'

type Props<T extends { id: string }> = {
  items: T[]
  onChange?: (items: T[]) => void
  renderItem: (item: T, index: number) => ReactNode
  /** Group compartido para transferir items entre listas hermanas (kanban). */
  group?: string
  ariaLabel?: string
  emptyState?: ReactNode
  sx?: SxProps<Theme>
}

const GreenhouseDragList = <T extends { id: string }>({
  items,
  onChange,
  renderItem,
  group,
  ariaLabel,
  emptyState,
  sx
}: Props<T>) => {
  const [parentRef, values, setValues] = useDragAndDrop<HTMLDivElement, T>(items, {
    ...(group ? { group } : {}),
    dropZone: true
  })

  const isInitialSync = useRef(true)

  useEffect(() => {
    setValues(items)
  }, [items, setValues])

  useEffect(() => {
    if (isInitialSync.current) {
      isInitialSync.current = false

      return
    }

    onChange?.(values)
  }, [values, onChange])

  return (
    <Box
      sx={{ position: 'relative', minWidth: 0 }}
    >
      <Box
        ref={parentRef}
        aria-label={ariaLabel}
        role={ariaLabel ? (values.length > 0 ? 'grid' : 'region') : undefined}
        aria-multiselectable={ariaLabel && values.length > 0 ? false : undefined}
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' },
          minBlockSize: group ? 96 : undefined,
          ...sx
        }}
      >
        {values.map((item, index) => (
          <Box key={item.id} role={ariaLabel ? 'row' : undefined}>
            <Box role={ariaLabel ? 'gridcell' : undefined}>{renderItem(item, index)}</Box>
          </Box>
        ))}
      </Box>
      {values.length === 0 ? <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{emptyState}</Box> : null}
    </Box>
  )
}

export default GreenhouseDragList
