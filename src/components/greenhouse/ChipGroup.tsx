'use client'

import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import type { ChipProps } from '@mui/material/Chip'

export type ChipGroupItem = {
  key: string
  label: string
  color?: ChipProps['color']
  variant?: 'filled' | 'outlined' | 'tonal'
  size?: 'small' | 'medium'
}

type ChipGroupProps = {
  items: ChipGroupItem[]
  emptyLabel?: string
}

const ChipGroup = ({ items, emptyLabel }: ChipGroupProps) => {
  return (
    <Stack direction='row' flexWrap='wrap' gap={1.25}>
      {items.map(item => (
        <Chip
          key={item.key}
          label={item.label}
          color={item.color || 'default'}
          variant={item.variant || 'outlined'}
          size={item.size || 'small'}
        />
      ))}
      {!items.length && emptyLabel ? <Chip label={emptyLabel} color='default' variant='outlined' size='small' /> : null}
    </Stack>
  )
}

export default ChipGroup
