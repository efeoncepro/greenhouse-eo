'use client'

/**
 * TASK-1153 — Inspector aside: detalle del work item seleccionado. Read-only;
 * solo acciones seguras (copiar ID, copiar comando para tasks, copiar path).
 */
import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { GH_ROADMAP } from '@/lib/copy/roadmap'
import type { RoadmapWorkItemVM } from '@/lib/roadmap/cockpit/types'

import { HEALTH_VISUAL, KIND_VISUAL, PRIORITY_TONE, toneSx } from '../cockpit-tokens'
import InlineMarkdown from './InlineMarkdown'
import { ToneTag } from './RoadmapTags'

const Overline = ({ children }: { children: ReactNode }) => (
  <Box
    component='span'
    sx={{
      fontSize: '0.6875rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'text.disabled'
    }}
  >
    {children}
  </Box>
)

const Prose = ({ children, muted }: { children: ReactNode; muted?: boolean }) => (
  <Typography variant='body2' sx={{ lineHeight: 1.55, color: muted ? 'text.secondary' : 'text.primary' }}>
    {children}
  </Typography>
)

const RelatedChip = ({ id, icon, onClick }: { id: string; icon: string; onClick?: () => void }) => (
  <Box
    component='button'
    type='button'
    onClick={onClick}
    disabled={!onClick}
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 0.625,
      ...toneSx('neutral'),
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
      px: 1.125,
      py: 0.5,
      fontSize: '0.75rem',
      fontWeight: 600,
      fontFeatureSettings: "'tnum' 1",
      cursor: onClick ? 'pointer' : 'default',
      opacity: onClick ? 1 : 0.55,
      '&:hover': onClick ? { borderColor: 'primary.main', color: 'primary.main' } : {},
      '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
    }}
  >
    <i className={icon} aria-hidden='true' style={{ fontSize: 12, lineHeight: 0 }} />
    {id}
  </Box>
)

export interface RoadmapInspectorProps {
  item: RoadmapWorkItemVM | null
  presentIds: Set<string>
  onClose: () => void
  onSelectRelated: (id: string) => void
  onCopy: (text: string) => void
  onOpenTask: (id: string) => void
}

const RoadmapInspector = ({ item, presentIds, onClose, onSelectRelated, onCopy, onOpenTask }: RoadmapInspectorProps) => {
  if (!item) {
    return (
      <Box
        data-capture='roadmap-inspector'
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.25,
          p: theme => `${theme.spacing(16)} ${theme.spacing(6)}`,
          textAlign: 'center',
          minHeight: 320,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: theme => `${theme.shape.customBorderRadius.md}px`
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            backgroundColor: 'action.hover',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.disabled'
          }}
        >
          <i className='tabler-click' aria-hidden='true' style={{ fontSize: 22 }} />
        </Box>
        <Typography variant='body2' sx={{ fontWeight: 600, color: 'text.primary' }}>
          {GH_ROADMAP.inspectorEmptyTitle}
        </Typography>
        <Typography variant='body2' sx={{ color: 'text.secondary', maxWidth: 240, lineHeight: 1.5 }}>
          {GH_ROADMAP.inspectorEmptyBody}
        </Typography>
      </Box>
    )
  }

  const kindVisual = KIND_VISUAL[item.kind]
  const healthVisual = HEALTH_VISUAL[item.healthLevel]
  const isIssue = item.kind === 'issue'
  const hasFindings = item.findings.length > 0
  const blockedBy = item.blockedBy[0]

  return (
    <Box
      data-capture='roadmap-inspector'
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
        boxShadow: theme => theme.greenhouseElevation.raised.boxShadow,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 4.5, borderBottom: '1px solid', borderColor: 'action.hover' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ToneTag tone={kindVisual.tone} icon={kindVisual.icon} label={kindVisual.label} />
          <Box component='span' sx={{ fontWeight: 600, fontSize: '0.875rem', fontFeatureSettings: "'tnum' 1", color: 'text.secondary' }}>
            {item.id}
          </Box>
          <Box sx={{ ml: 'auto' }} />
          <IconButton size='small' onClick={onClose} aria-label={GH_ROADMAP.closeInspectorAria}>
            <i className='tabler-x' style={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Box
          component='h2'
          sx={{ m: 0, fontFamily: theme => theme.typography.h4.fontFamily, fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3, color: 'text.primary' }}
        >
          {item.title}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {item.priority ? <ToneTag tone={PRIORITY_TONE[item.priority]} label={item.priority} radius='full' /> : null}
          <ToneTag tone={healthVisual.tone} icon={healthVisual.icon} label={healthVisual.label} radius='full' />
          {item.domains.length > 0 ? (
            <ToneTag tone='neutral' icon='tabler-topology-star-3' label={item.domains.join(' · ')} radius='full' />
          ) : null}
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4.5, p: 4.5 }}>
        {item.summary ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Overline>{isIssue ? GH_ROADMAP.inspector.symptom : GH_ROADMAP.inspector.summary}</Overline>
            <Prose><InlineMarkdown text={item.summary} /></Prose>
          </Box>
        ) : null}

        {hasFindings ? (
          <Box
            sx={{
              ...toneSx('warning'),
              borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
              p: theme => `${theme.spacing(3)} ${theme.spacing(3.5)}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.75, fontSize: '0.8125rem', fontWeight: 600 }}>
              <i className='tabler-alert-triangle' aria-hidden='true' style={{ fontSize: 15, lineHeight: 0 }} />
              {GH_ROADMAP.inspector.groomingTitle}
            </Box>
            {item.findings.map((finding, idx) => (
              <Box key={idx} component='span' sx={{ display: 'flex', gap: 1.75, fontSize: '0.8125rem', lineHeight: 1.45 }}>
                <span aria-hidden='true'>•</span>
                {finding}
              </Box>
            ))}
          </Box>
        ) : null}

        {item.why && !isIssue ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Overline>{GH_ROADMAP.inspector.why}</Overline>
            <Prose muted><InlineMarkdown text={item.why} /></Prose>
          </Box>
        ) : null}

        {isIssue ? (
          <>
            {item.rootCause ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Overline>{GH_ROADMAP.inspector.rootCause}</Overline>
                <Prose muted><InlineMarkdown text={item.rootCause} /></Prose>
              </Box>
            ) : null}
            {item.environment ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Overline>{GH_ROADMAP.inspector.environment}</Overline>
                <ToneTag tone='error' icon='tabler-server-bolt' label={item.environment} radius='full' />
              </Box>
            ) : null}
          </>
        ) : null}

        {item.blockedBy.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <Overline>{GH_ROADMAP.inspector.blockedBy}</Overline>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {item.blockedBy.map(id => (
                <Box
                  key={id}
                  component='button'
                  type='button'
                  onClick={presentIds.has(id) ? () => onSelectRelated(id) : undefined}
                  disabled={!presentIds.has(id)}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.625,
                    ...toneSx('error'),
                    border: '1px solid transparent',
                    borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                    px: 1.125,
                    py: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    fontFeatureSettings: "'tnum' 1",
                    cursor: presentIds.has(id) ? 'pointer' : 'default',
                    '&:focus-visible': { outline: theme => `2px solid ${theme.palette.error.main}`, outlineOffset: 2 }
                  }}
                >
                  <i className='tabler-lock' aria-hidden='true' style={{ fontSize: 12, lineHeight: 0 }} />
                  {id}
                </Box>
              ))}
            </Box>
          </Box>
        ) : null}

        {item.dependsOn.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <Overline>{GH_ROADMAP.inspector.dependsOn}</Overline>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {item.dependsOn.map(id => (
                <RelatedChip key={id} id={id} icon='tabler-arrow-right' onClick={presentIds.has(id) ? () => onSelectRelated(id) : undefined} />
              ))}
            </Box>
          </Box>
        ) : null}

        {item.filesOwned.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <Overline>{GH_ROADMAP.inspector.files}</Overline>
            {item.filesOwned.map(file => (
              <Box
                key={file}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.8125rem',
                  color: 'text.secondary',
                  fontFeatureSettings: "'tnum' 1",
                  p: theme => `${theme.spacing(1.75)} ${theme.spacing(2.25)}`,
                  backgroundColor: 'action.hover',
                  borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                  minWidth: 0
                }}
              >
                <i className='tabler-file-code' aria-hidden='true' style={{ fontSize: 14, lineHeight: 0, flex: '0 0 auto' }} />
                <Box component='span' sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }}>
                  {file}
                </Box>
              </Box>
            ))}
          </Box>
        ) : null}

        {item.related.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <Overline>{GH_ROADMAP.inspector.related}</Overline>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {item.related.map(id => (
                <RelatedChip key={id} id={id} icon='tabler-link' onClick={presentIds.has(id) ? () => onSelectRelated(id) : undefined} />
              ))}
            </Box>
          </Box>
        ) : null}

        {/* Actions */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1, borderTop: '1px solid', borderColor: 'action.hover' }}>
          {item.isExecutableTask ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 3.5 }}>
              <Overline>{GH_ROADMAP.inspector.command}</Overline>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  backgroundColor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                  p: theme => `${theme.spacing(2)} ${theme.spacing(2.5)}`,
                  minWidth: 0
                }}
              >
                <i className='tabler-terminal-2' aria-hidden='true' style={{ fontSize: 15, lineHeight: 0 }} />
                <Box component='span' sx={{ fontSize: '0.8125rem', fontFeatureSettings: "'tnum' 1", color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {GH_ROADMAP.implementTaskCommand(item.id)}
                </Box>
              </Box>
              {blockedBy ? (
                <Box component='span' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontSize: '0.8125rem', color: 'warning.main' }}>
                  <i className='tabler-info-circle' aria-hidden='true' style={{ fontSize: 14, lineHeight: 0 }} />
                  {GH_ROADMAP.inspector.blockedNote(blockedBy)}
                </Box>
              ) : null}
              <Button
                variant='contained'
                fullWidth
                startIcon={<i className='tabler-clipboard' />}
                onClick={() => onCopy(GH_ROADMAP.implementTaskCommand(item.id))}
              >
                {GH_ROADMAP.inspector.copyCommand}
              </Button>
            </Box>
          ) : null}
          <Box sx={{ display: 'flex', gap: 1, pt: 3.5 }}>
            <Button
              variant='outlined'
              size='small'
              data-capture='roadmap-open-task'
              startIcon={<i className='tabler-file-text' />}
              onClick={() => onOpenTask(item.id)}
            >
              {GH_ROADMAP.inspector.openTask}
            </Button>
            <Button variant='text' size='small' color='secondary' startIcon={<i className='tabler-copy' />} onClick={() => onCopy(item.id)}>
              {GH_ROADMAP.inspector.copyId}
            </Button>
          </Box>
          <Box
            component='span'
            sx={{ fontSize: '0.75rem', color: 'text.disabled', fontFeatureSettings: "'tnum' 1", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }}
          >
            {item.path}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default RoadmapInspector
