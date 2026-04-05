'use client'

import { type ReactNode, Fragment, useMemo } from 'react'

import Chip from '@mui/material/Chip'
import Typography, { type TypographyProps } from '@mui/material/Typography'

import Link from '@components/Link'

// ─── Types ──────────────────────────────────────────────────────────────────

type MentionType = 'member' | 'space' | 'project'

interface MentionMatch {
  name: string
  type: MentionType
  id: string
}

export interface NexaMentionTextProps {
  text: string | null
  variant?: TypographyProps['variant']
  sx?: TypographyProps['sx']
}

// ─── Config ─────────────────────────────────────────────────────────────────

const MENTION_REGEX = /@\[([^\]]+)\]\((member|space|project):([^)]+)\)/g

const MENTION_CONFIG: Record<MentionType, { icon: string; href: (id: string) => string | null }> = {
  member: {
    icon: 'tabler-user',
    href: (id: string) => `/people/${id}`
  },
  space: {
    icon: 'tabler-grid-4x4',
    href: (id: string) => `/agency/spaces/${id}`
  },
  project: {
    icon: 'tabler-folder',
    href: () => null
  }
}

// ─── Parser ─────────────────────────────────────────────────────────────────

const parseMentions = (text: string): ReactNode[] => {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const regex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags)

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const mention: MentionMatch = {
      name: match[1],
      type: match[2] as MentionType,
      id: match[3]
    }

    const config = MENTION_CONFIG[mention.type]
    const href = config.href(mention.id)

    parts.push(
      <Chip
        key={`mention-${match.index}`}
        size='small'
        variant='outlined'
        icon={<i className={config.icon} style={{ fontSize: 14 }} aria-hidden='true' />}
        label={mention.name}
        {...(href
          ? { component: Link, href, clickable: true }
          : {}
        )}
        sx={{
          height: 22,
          fontSize: '0.75rem',
          fontWeight: 500,
          mx: 0.25,
          verticalAlign: 'text-bottom',
          '& .MuiChip-label': { px: 0.75 },
          '& .MuiChip-icon': { ml: 0.5, mr: -0.25 },
          ...(href && {
            cursor: 'pointer',
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
              '& .MuiChip-icon': { color: 'primary.main' }
            }
          })
        }}
      />
    )

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

// ─── Component ──────────────────────────────────────────────────────────────

const NexaMentionText = ({ text, variant = 'body2', sx }: NexaMentionTextProps) => {
  const parts = useMemo(() => (text ? parseMentions(text) : []), [text])

  if (!text) return null

  if (parts.length === 1 && typeof parts[0] === 'string') {
    return (
      <Typography variant={variant} sx={sx}>
        {parts[0]}
      </Typography>
    )
  }

  return (
    <Typography variant={variant} component='span' sx={{ display: 'block', ...sx }}>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </Typography>
  )
}

export default NexaMentionText
