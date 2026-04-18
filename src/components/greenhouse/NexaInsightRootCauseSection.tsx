'use client'

import { useEffect, useState } from 'react'

import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import Typography from '@mui/material/Typography'

import NexaMentionText from '@/components/greenhouse/NexaMentionText'
import { GH_NEXA } from '@/config/greenhouse-nomenclature'

const STORAGE_KEY = 'nexa.insights.rootCause.expanded'

export interface NexaInsightRootCauseSectionProps {
  narrative: string
  insightId: string
}

const readInitial = (): boolean => {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const NexaInsightRootCauseSection = ({ narrative, insightId }: NexaInsightRootCauseSectionProps) => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(readInitial())
  }, [])

  const toggleId = `root-cause-toggle-${insightId}`
  const contentId = `root-cause-${insightId}`

  const handleToggle = () => {
    setOpen(prev => {
      const next = !prev

      try {
        window.localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        /* ignore storage errors (private mode, quota, etc.) */
      }

      return next
    })
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }

  const toggleLabel = open ? GH_NEXA.insights_root_cause_collapse : GH_NEXA.insights_root_cause_expand
  const chevronIcon = open ? 'tabler-chevron-down' : 'tabler-chevron-right'

  return (
    <Box sx={{ mt: 0.5 }}>
      <Box
        component='button'
        type='button'
        id={toggleId}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          px: 0.75,
          py: 0.5,
          minHeight: 24,
          border: 'none',
          background: 'transparent',
          color: 'text.secondary',
          cursor: 'pointer',
          borderRadius: 1,
          font: 'inherit',
          textAlign: 'left',
          transition: 'background-color 0.15s ease, color 0.15s ease',
          '&:hover': {
            bgcolor: 'action.hover',
            color: theme => theme.palette.customColors.midnight
          },
          '&:focus-visible': {
            outline: theme => `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2
          }
        }}
      >
        <i className='tabler-route' style={{ fontSize: 14 }} aria-hidden='true' />
        <Typography component='span' variant='caption' sx={{ fontWeight: 600, lineHeight: 1 }}>
          {toggleLabel}
        </Typography>
        <i className={chevronIcon} style={{ fontSize: 14 }} aria-hidden='true' />
      </Box>

      <Collapse in={open} timeout='auto' unmountOnExit>
        <Box
          id={contentId}
          role='region'
          aria-labelledby={toggleId}
          sx={{
            mt: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: 1,
            borderLeft: theme => `3px solid ${theme.palette.primary.main}`,
            bgcolor: 'action.hover'
          }}
        >
          <Typography
            variant='caption'
            sx={{
              fontWeight: 600,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'block',
              mb: 0.5
            }}
          >
            {GH_NEXA.insights_root_cause_label}
          </Typography>
          <NexaMentionText
            text={narrative}
            variant='body2'
            sx={{ color: theme => theme.palette.customColors.midnight }}
          />
        </Box>
      </Collapse>
    </Box>
  )
}

export default NexaInsightRootCauseSection
