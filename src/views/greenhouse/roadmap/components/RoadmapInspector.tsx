'use client'

/**
 * TASK-1153 — Inspector aside: detalle del work item seleccionado. Read-only;
 * solo acciones seguras (copiar ID, copiar comando para tasks, copiar path).
 */
import { useEffect, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'

import { GH_ROADMAP } from '@/lib/copy/roadmap'
import type { RoadmapWorkItemVM } from '@/lib/roadmap/cockpit/types'

import { HEALTH_VISUAL, KIND_VISUAL, PRIORITY_TONE, toneSx } from '../cockpit-tokens'
import InlineMarkdown from './InlineMarkdown'
import { ToneTag } from './RoadmapTags'

const FILE_PREVIEW_LIMIT = 5
const RELATION_PREVIEW_LIMIT = 8
const DEPENDENCY_PREVIEW_LIMIT = 6

const Overline = ({ children }: { children: ReactNode }) => (
  <Typography
    component='span'
    variant='overline'
    sx={{
      color: 'text.disabled'
    }}
  >
    {children}
  </Typography>
)

const SectionHeading = ({ label, count }: { label: string; count?: number }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, minWidth: 0 }}>
    <Overline>{label}</Overline>
    {typeof count === 'number' ? (
      <Typography component='span' variant='caption' sx={{ color: 'text.disabled', fontFeatureSettings: "'tnum' 1" }}>
        {count}
      </Typography>
    ) : null}
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
    sx={[
      toneSx('neutral'),
      {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.625,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
        px: 1.125,
        py: 0.5,
        typography: 'caption',
        fontWeight: 600,
        fontFeatureSettings: "'tnum' 1",
        cursor: onClick ? 'pointer' : 'default',
        opacity: onClick ? 1 : 0.55,
        '&:hover': onClick ? { borderColor: 'primary.main', color: 'primary.main' } : {},
        '&:focus-visible': { outline: theme => `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
      }
    ]}
  >
    <i className={icon} aria-hidden='true' style={{ fontSize: 12, lineHeight: 0 }} />
    {id}
  </Box>
)

const FileRow = ({ file }: { file: string }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      typography: 'caption',
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
  const [showAllFiles, setShowAllFiles] = useState(false)
  const [showAllRelated, setShowAllRelated] = useState(false)
  const [showAllDependencies, setShowAllDependencies] = useState(false)

  useEffect(() => {
    setShowAllFiles(false)
    setShowAllRelated(false)
    setShowAllDependencies(false)
  }, [item?.id])

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
  const visibleFiles = showAllFiles ? item.filesOwned : item.filesOwned.slice(0, FILE_PREVIEW_LIMIT)
  const visibleRelated = showAllRelated ? item.related : item.related.slice(0, RELATION_PREVIEW_LIMIT)
  const visibleDependsOn = showAllDependencies ? item.dependsOn : item.dependsOn.slice(0, DEPENDENCY_PREVIEW_LIMIT)
  const hiddenFiles = Math.max(0, item.filesOwned.length - visibleFiles.length)
  const hiddenRelated = Math.max(0, item.related.length - visibleRelated.length)
  const hiddenDependsOn = Math.max(0, item.dependsOn.length - visibleDependsOn.length)

  return (
    <Box
      data-capture='roadmap-inspector'
      sx={{
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
        boxShadow: theme => theme.greenhouseElevation.raised.boxShadow,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        maxHeight: { xs: '100dvh', md: 'calc(100vh - 22rem)' },
        minHeight: { md: 360 }
      }}
    >
      {/* Header */}
      <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1.25, p: { xs: 3.25, md: 4 }, borderBottom: '1px solid', borderColor: 'action.hover', minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <ToneTag tone={kindVisual.tone} icon={kindVisual.icon} label={kindVisual.label} />
          <Typography component='span' variant='monoId' sx={{ color: 'text.secondary', minWidth: 0 }}>
            {item.id}
          </Typography>
          <Box sx={{ ml: 'auto' }} />
          <IconButton size='small' onClick={onClose} aria-label={GH_ROADMAP.closeInspectorAria}>
            <i className='tabler-x' style={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Typography component='h2' variant='h4' sx={{ m: 0, overflowWrap: 'anywhere' }}>
          {item.title}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, minWidth: 0 }}>
          {item.priority ? <ToneTag tone={PRIORITY_TONE[item.priority]} label={item.priority} radius='full' /> : null}
          <ToneTag tone={healthVisual.tone} icon={healthVisual.icon} label={healthVisual.label} radius='full' />
          {item.domains.length > 0 ? (
            <ToneTag tone='neutral' icon='tabler-topology-star-3' label={item.domains.join(' · ')} radius='full' />
          ) : null}
        </Box>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: 3.5, p: { xs: 3.25, md: 4 }, scrollbarWidth: 'thin' }}>
        {item.summary ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <SectionHeading label={isIssue ? GH_ROADMAP.inspector.symptom : GH_ROADMAP.inspector.summary} />
            <Prose><InlineMarkdown text={item.summary} /></Prose>
          </Box>
        ) : null}

        {hasFindings ? (
          <Box
            sx={[
              toneSx('warning'),
              {
                borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                p: theme => `${theme.spacing(3)} ${theme.spacing(3.5)}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }
            ]}
          >
            <Typography component='span' variant='body2' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.75, fontWeight: 600 }}>
              <i className='tabler-alert-triangle' aria-hidden='true' style={{ fontSize: 15, lineHeight: 0 }} />
              {GH_ROADMAP.inspector.groomingTitle}
            </Typography>
            {item.findings.map((finding, idx) => (
              <Typography key={idx} component='span' variant='body2' sx={{ display: 'flex', gap: 1.75, lineHeight: 1.45 }}>
                <span aria-hidden='true'>•</span>
                {finding}
              </Typography>
            ))}
          </Box>
        ) : null}

        {item.why && !isIssue ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <SectionHeading label={GH_ROADMAP.inspector.why} />
            <Prose muted><InlineMarkdown text={item.why} /></Prose>
          </Box>
        ) : null}

        {isIssue ? (
          <>
            {item.rootCause ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <SectionHeading label={GH_ROADMAP.inspector.rootCause} />
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
            <SectionHeading label={GH_ROADMAP.inspector.blockedBy} count={item.blockedBy.length} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {item.blockedBy.map(id => (
                <Box
                  key={id}
                  component='button'
                  type='button'
                  onClick={presentIds.has(id) ? () => onSelectRelated(id) : undefined}
                  disabled={!presentIds.has(id)}
                  sx={[
                    toneSx('error'),
                    {
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.625,
                      border: '1px solid transparent',
                      borderRadius: theme => `${theme.shape.customBorderRadius.sm}px`,
                      px: 1.125,
                      py: 0.5,
                      typography: 'caption',
                      fontWeight: 600,
                      fontFeatureSettings: "'tnum' 1",
                      cursor: presentIds.has(id) ? 'pointer' : 'default',
                      '&:focus-visible': { outline: theme => `2px solid ${theme.palette.error.main}`, outlineOffset: 2 }
                    }
                  ]}
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
            <SectionHeading label={GH_ROADMAP.inspector.dependsOn} count={item.dependsOn.length} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {visibleDependsOn.map(id => (
                <RelatedChip key={id} id={id} icon='tabler-arrow-right' onClick={presentIds.has(id) ? () => onSelectRelated(id) : undefined} />
              ))}
              {hiddenDependsOn > 0 || showAllDependencies ? (
                <Button size='small' variant='text' color='secondary' onClick={() => setShowAllDependencies(value => !value)}>
                  {showAllDependencies ? GH_ROADMAP.inspector.showLess : GH_ROADMAP.inspector.showMore(hiddenDependsOn)}
                </Button>
              ) : null}
            </Box>
          </Box>
        ) : null}

        {item.filesOwned.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <SectionHeading label={GH_ROADMAP.inspector.files} count={item.filesOwned.length} />
            {visibleFiles.map(file => <FileRow key={file} file={file} />)}
            {hiddenFiles > 0 || showAllFiles ? (
              <Button size='small' variant='text' color='secondary' onClick={() => setShowAllFiles(value => !value)}>
                {showAllFiles ? GH_ROADMAP.inspector.showLess : GH_ROADMAP.inspector.showMore(hiddenFiles)}
              </Button>
            ) : null}
          </Box>
        ) : null}

        {item.related.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
            <SectionHeading label={GH_ROADMAP.inspector.related} count={item.related.length} />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {visibleRelated.map(id => (
                <RelatedChip key={id} id={id} icon='tabler-link' onClick={presentIds.has(id) ? () => onSelectRelated(id) : undefined} />
              ))}
              {hiddenRelated > 0 || showAllRelated ? (
                <Button size='small' variant='text' color='secondary' onClick={() => setShowAllRelated(value => !value)}>
                  {showAllRelated ? GH_ROADMAP.inspector.showLess : GH_ROADMAP.inspector.showMore(hiddenRelated)}
                </Button>
              ) : null}
            </Box>
          </Box>
        ) : null}
      </Box>

      {/* Action dock */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: { xs: 3.25, md: 4 },
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          boxShadow: theme => `0 -10px 28px ${theme.palette.background.paper}`
        }}
      >
        {item.isExecutableTask ? (
          <>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                backgroundColor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: theme => `${theme.shape.customBorderRadius.md}px`,
                p: theme => `${theme.spacing(1.75)} ${theme.spacing(2.25)}`,
                minWidth: 0
              }}
            >
              <i className='tabler-terminal-2' aria-hidden='true' style={{ fontSize: 15, lineHeight: 0 }} />
              <Typography component='span' variant='monoId' sx={{ color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {GH_ROADMAP.implementTaskCommand(item.id)}
              </Typography>
            </Box>
            {blockedBy ? (
              <Typography component='span' variant='caption' sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
                <i className='tabler-info-circle' aria-hidden='true' style={{ fontSize: 14, lineHeight: 0 }} />
                {GH_ROADMAP.inspector.blockedNote(blockedBy)}
              </Typography>
            ) : null}
          </>
        ) : null}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant='outlined'
            size='small'
            data-capture='roadmap-open-task'
            startIcon={<i className='tabler-file-text' />}
            onClick={() => onOpenTask(item.id)}
          >
            {GH_ROADMAP.inspector.openTask}
          </Button>
          {item.isExecutableTask ? (
            <Button
              variant='contained'
              size='small'
              startIcon={<i className='tabler-clipboard' />}
              onClick={() => onCopy(GH_ROADMAP.implementTaskCommand(item.id))}
            >
              {GH_ROADMAP.inspector.copyCommand}
            </Button>
          ) : null}
          <Button variant='text' size='small' color='secondary' startIcon={<i className='tabler-copy' />} onClick={() => onCopy(item.id)}>
            {GH_ROADMAP.inspector.copyId}
          </Button>
        </Box>
        <Typography
          component='span'
          variant='caption'
          sx={{ color: 'text.disabled', fontFeatureSettings: "'tnum' 1", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: 'rtl', textAlign: 'left' }}
        >
          {item.path}
        </Typography>
      </Box>
    </Box>
  )
}

export default RoadmapInspector
