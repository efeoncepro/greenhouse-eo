'use client'

import { type ReactNode } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CustomChip from '@core/components/mui/Chip'

export interface FormSectionAccordionProps {
  /** Título visible de la sección. */
  title: string

  /** Tabler icon className opcional, mostrado a la izquierda del título. */
  iconClassName?: string

  /**
   * Contador de items asociados a la sección — se renderiza como CustomChip
   * tonal a la derecha del título cuando se pasa.
   */
  summaryCount?: number | string | null

  /** Color del chip summaryCount. Default 'secondary'. */
  summaryCountColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'

  /** Si la sección comienza expandida. */
  defaultExpanded?: boolean

  /** Estado controlado (alternativo a defaultExpanded). */
  expanded?: boolean
  onChange?: (event: React.SyntheticEvent, expanded: boolean) => void

  /** Disabled state — el accordion deja de ser togglable. */
  disabled?: boolean

  /**
   * Identificador estable usado para el binding aria-controls/aria-labelledby
   * entre AccordionSummary y AccordionDetails. Default 'form-section'.
   */
  id?: string

  /** Children renderizados dentro de AccordionDetails. */
  children: ReactNode
}

/**
 * Accordion canónico para secciones de formulario colapsables. Aplica el
 * pattern Greenhouse: border 1px divider + customBorderRadius.lg, supresión
 * del divider clásico de MUI (`:before`) y márgenes consistentes en estado
 * expanded.
 *
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  [icon]  Título de la sección       [12]    [⌄]         │
 *   ├─────────────────────────────────────────────────────────┤
 *   │  children…                                              │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Reusable platform-wide. Sin domain logic. Tokens canónicos
 * (customBorderRadius.lg, theme.palette.divider). Apto para forms de Quote /
 * Invoice / Contract / Reconciliation Workbench / HR Profile / Settings.
 */
const FormSectionAccordion = ({
  title,
  iconClassName,
  summaryCount = null,
  summaryCountColor = 'secondary',
  defaultExpanded,
  expanded,
  onChange,
  disabled,
  id = 'form-section',
  children
}: FormSectionAccordionProps) => {
  const headerId = `${id}-header`
  const contentId = `${id}-content`
  const showCount = summaryCount !== null && summaryCount !== undefined && summaryCount !== ''

  return (
    <Accordion
      elevation={0}
      defaultExpanded={defaultExpanded}
      expanded={expanded}
      onChange={onChange}
      disabled={disabled}
      sx={theme => ({
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        '&:before': { display: 'none' },
        '&.Mui-expanded': { margin: 0 },
        '&:first-of-type': { borderRadius: `${theme.shape.customBorderRadius.lg}px` },
        '&:last-of-type': { borderRadius: `${theme.shape.customBorderRadius.lg}px` }
      })}
    >
      <AccordionSummary
        expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}
        aria-controls={contentId}
        id={headerId}
      >
        <Stack direction='row' spacing={1.5} alignItems='center' sx={{ width: '100%' }}>
          {iconClassName ? (
            <i className={iconClassName} aria-hidden='true' style={{ fontSize: 20 }} />
          ) : null}
          <Typography variant='subtitle1' sx={{ fontWeight: 600, flex: 1 }}>
            {title}
          </Typography>
          {showCount ? (
            <CustomChip
              round='true'
              size='small'
              variant='tonal'
              color={summaryCountColor}
              label={String(summaryCount)}
              sx={{ mr: 1 }}
            />
          ) : null}
        </Stack>
      </AccordionSummary>
      <AccordionDetails id={contentId}>{children}</AccordionDetails>
    </Accordion>
  )
}

export default FormSectionAccordion
