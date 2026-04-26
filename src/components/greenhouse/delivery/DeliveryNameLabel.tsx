'use client'

import Link from 'next/link'

import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import type { TypographyProps } from '@mui/material/Typography'

import {
  displayProjectName,
  displaySprintName,
  displayTaskName,
  type DisplayNameResult,
  type ProjectDisplayInput,
  type SprintDisplayInput,
  type TaskDisplayInput
} from '@/lib/delivery/task-display'

/**
 * Shared visual treatment for delivery entity titles (tasks, projects, sprints)
 * that may have a null `*_name` per the TASK-588 NULLABLE contract.
 *
 * Renders the canonical name when present. Otherwise renders the data-derived
 * fallback from `displayTaskName` / `displayProjectName` / `displaySprintName`
 * with a subtle italic + warning icon + tooltip + click-through to Notion so
 * the user can fix the title at source. The visual treatment is intentionally
 * gentle — a missing title is *not* a critical incident, just a hygiene
 * pending.
 *
 * Use this everywhere that previously rendered `task.task_name` directly.
 * Skipping it leaves untitled rows looking like "" or "null" in the UI which
 * hurts UX and contradicts TASK-588 (which deliberately allows nulls).
 */

interface BaseProps {
  typographyProps?: Omit<TypographyProps, 'children'>

  /**
   * When `false`, the click-through to Notion is hidden even if `pageUrl`
   * was provided. Use this in contexts where the row is already a link
   * (e.g. it links to the Greenhouse task detail) to avoid nested anchors.
   */
  enableNotionLink?: boolean
}

const renderResult = (
  result: DisplayNameResult,
  { typographyProps, enableNotionLink = true }: BaseProps
) => {
  if (!result.isFallback) {
    return (
      <Typography component='span' {...typographyProps}>
        {result.text}
      </Typography>
    )
  }

  const tooltipText = result.notionUrl
    ? 'Esta página no tiene título en Notion · Hacer clic para editarlo'
    : 'Esta página no tiene título en Notion'

  const labelNode = (
    <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <Box
        component='i'
        className='tabler-alert-triangle'
        sx={{ fontSize: 'inherit', color: 'warning.main', display: 'inline-block', lineHeight: 1 }}
        aria-hidden
      />
      <Typography
        component='span'
        {...typographyProps}
        sx={{
          fontStyle: 'italic',
          color: 'text.disabled',
          ...(typographyProps?.sx as object | undefined)
        }}
      >
        {result.text}
      </Typography>
    </Box>
  )

  if (enableNotionLink && result.notionUrl) {
    return (
      <Tooltip title={tooltipText} arrow>
        <Link
          href={result.notionUrl}
          target='_blank'
          rel='noopener noreferrer'
          style={{ textDecoration: 'none' }}
          onClick={event => event.stopPropagation()}
        >
          {labelNode}
        </Link>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={tooltipText} arrow>
      {labelNode}
    </Tooltip>
  )
}

export interface TaskNameLabelProps extends BaseProps {
  task: TaskDisplayInput
}

export const TaskNameLabel = ({ task, ...rest }: TaskNameLabelProps) =>
  renderResult(displayTaskName(task), rest)

export interface ProjectNameLabelProps extends BaseProps {
  project: ProjectDisplayInput
}

export const ProjectNameLabel = ({ project, ...rest }: ProjectNameLabelProps) =>
  renderResult(displayProjectName(project), rest)

export interface SprintNameLabelProps extends BaseProps {
  sprint: SprintDisplayInput
}

export const SprintNameLabel = ({ sprint, ...rest }: SprintNameLabelProps) =>
  renderResult(displaySprintName(sprint), rest)
