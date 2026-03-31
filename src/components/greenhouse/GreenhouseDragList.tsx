'use client'

import { useEffect, useRef } from 'react'

import type { ReactNode } from 'react'

import Box from '@mui/material/Box'

import { useDragAndDrop } from '@formkit/drag-and-drop/react'

type Props<T extends { id: string }> = {
  items: T[]
  onChange?: (items: T[]) => void
  renderItem: (item: T, index: number) => ReactNode
}

const GreenhouseDragList = <T extends { id: string }>({
  items,
  onChange,
  renderItem
}: Props<T>) => {
  const [parentRef, values, setValues] = useDragAndDrop<HTMLDivElement, T>(items)
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
      ref={parentRef}
      sx={{
        display: 'grid',
        gap: 3,
        gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' }
      }}
    >
      {values.map((item, index) => (
        <Box key={item.id}>{renderItem(item, index)}</Box>
      ))}
    </Box>
  )
}

export default GreenhouseDragList
