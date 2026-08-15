'use client'

import { useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import GreenhouseDocumentPreview from '@/components/greenhouse/documents/GreenhouseDocumentPreview'
import { GreenhouseButton, GreenhouseChip } from '@/components/greenhouse/primitives'
import type { HiringDeskCopy } from '@/lib/copy'
import { formatDate } from '@/lib/format'
import type {
  CandidateDocumentFileRow,
  CandidateDocumentRowStatus,
  CandidateDocumentsViewModel,
} from '@/lib/hiring/documents'
import { getCountryName } from '@/lib/locale/countries'
import { CanonicalApiError, throwIfNotOk } from '@/lib/api/parse-error-response'

interface CandidateDocumentsPanelProps {
  copy: HiringDeskCopy
  candidateName: string
  documents: CandidateDocumentsViewModel | null
  /** El reader falló (≠ candidato sin documentos). Degradación honesta, no vacío. */
  documentsFailed: boolean
  canRevealIdentity: boolean
}

const MINIMUM_REASON_LENGTH = 5

/**
 * `variant='tonal'` rinde 3.69:1 (#0375db sobre #d7e9f9) — bajo el piso AA de 4.5,
 * medido por el gate axe en el loop de captura. `outlined` mantiene el peso de
 * acción primaria de la fila con el mismo azul sobre el papel de la card (~4.9:1).
 *
 * El anillo de foco es explícito porque el botón MUI base no lo dibuja: sin él, un
 * usuario de teclado no sabe dónde está parado (hallazgo `keyboard_focus_ring_missing`
 * del mismo loop). Sale del token de paleta, nunca de un HEX.
 */
const LINK_ACTION_SX = {
  // `outlineColor` NO está en el mapa de estilos de `sx`: MUI lo emite literal, así que
  // `'primary.main'` sale como CSS inválido y el anillo NO se dibuja — el gate de teclado
  // lo detectó. La variable CSS del tema es el mismo token, por el camino que sí funciona
  // (mismo patrón que `GreenhouseChip`).
  '&:focus-visible': {
    outline: '2px solid var(--mui-palette-primary-main)',
    outlineOffset: '2px',
  },
} as const

const interpolate = (template: string, values: Record<string, string>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template)

const formatBytes = (bytes: number | null) => {
  if (!bytes || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Cada estado tiene su propio tono, ícono y (no-)acción. El panel anterior los
 * aplastaba todos en "Enmascarado", así que un archivo bloqueado por el antivirus
 * y un candidato sin CV se veían igual.
 */
const STATUS_PRESENTATION: Record<
  Exclude<CandidateDocumentRowStatus, 'available'>,
  { tone: 'error' | 'info' | 'warning'; icon: string }
> = {
  quarantined: { tone: 'error', icon: 'tabler-shield-x' },
  pending: { tone: 'info', icon: 'tabler-clock' },
  legacy_unscanned: { tone: 'warning', icon: 'tabler-shield-off' },
  missing: { tone: 'info', icon: 'tabler-file-off' },
}

const DocumentRow = ({
  actions,
  ariaDescribedBy,
  detail,
  icon,
  isLast,
  label,
  statusChip,
  tone,
}: {
  actions: React.ReactNode
  ariaDescribedBy?: string
  detail: React.ReactNode
  icon: string
  isLast: boolean
  label: string
  statusChip?: React.ReactNode
  tone: 'primary' | 'warning' | 'error' | 'info'
}) => (
  <Stack
    component='li'
    direction={{ xs: 'column', sm: 'row' }}
    alignItems={{ xs: 'stretch', sm: 'center' }}
    spacing={2}
    sx={{ p: 2.5, borderBlockEnd: isLast ? 0 : 1, borderColor: 'divider', listStyle: 'none' }}
  >
    <Box
      aria-hidden='true'
      sx={{
        display: 'grid',
        placeItems: 'center',
        inlineSize: 44,
        blockSize: 44,
        flexShrink: 0,
        borderRadius: 2,
        color: `${tone}.main`,
        backgroundColor: `${tone}.lightOpacity`,
      }}
    >
      <i className={icon} />
    </Box>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
        <Typography fontWeight={650}>{label}</Typography>
        {statusChip}
      </Stack>
      <Typography
        id={ariaDescribedBy}
        variant='body2'
        color='text.secondary'
        sx={{ overflowWrap: 'anywhere' }}
      >
        {detail}
      </Typography>
    </Box>
    <Stack
      direction='row'
      spacing={1}
      sx={{ flexShrink: 0, '& > *': { flex: { xs: 1, sm: '0 0 auto' } } }}
    >
      {actions}
    </Stack>
  </Stack>
)

/**
 * TASK-1715 — Documentos del candidato.
 *
 * Dos clases de dato, dos velocidades. Un archivo se ABRE: la autorización ya
 * ocurrió al entrar a la ficha (`hiring.application.read`) y la ruta del asset la
 * re-verifica, así que un candado acá no protegería nada — sólo enseñaría a
 * ignorar los candados. La identidad se REVELA: capability propia, motivo humano
 * y entrada de auditoría real (TASK-1714).
 *
 * El componente no decide autorización: recibe `canRevealIdentity` resuelto en
 * servidor y sólo decide si dibuja el affordance. Un botón que siempre falla es
 * peor que ningún botón.
 */
const CandidateDocumentsPanel = ({
  canRevealIdentity,
  candidateName,
  copy,
  documents,
  documentsFailed,
}: CandidateDocumentsPanelProps) => {
  const text = copy.application.documentsPanel

  const [revealDocumentId, setRevealDocumentId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [revealing, setRevealing] = useState(false)
  const [revealError, setRevealError] = useState<{ message: string; actionable: boolean } | null>(null)
  // El valor revelado vive SOLO acá. No hay store global ni persistencia: un
  // remount vuelve a enmascarado y exige otro reveal, que escribe otra entrada de
  // auditoría. Es el comportamiento correcto — el trail refleja accesos reales.
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [viewerRow, setViewerRow] = useState<CandidateDocumentFileRow | null>(null)
  const revealTriggerRef = useRef<HTMLButtonElement | null>(null)
  const viewerTriggerRef = useRef<HTMLButtonElement | null>(null)

  const closeViewer = () => {
    setViewerRow(null)
    viewerTriggerRef.current?.focus()
  }

  const closeRevealDialog = () => {
    if (revealing) return
    setRevealDocumentId(null)
    setReason('')
    setRevealError(null)
    revealTriggerRef.current?.focus()
  }

  const confirmReveal = async () => {
    if (!documents || !revealDocumentId || reason.trim().length < MINIMUM_REASON_LENGTH) return

    setRevealing(true)
    setRevealError(null)

    try {
      const response = await fetch(
        `/api/hiring/candidate-facets/${encodeURIComponent(documents.candidateFacetId)}/identity-documents/${encodeURIComponent(revealDocumentId)}/reveal`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      )

      await throwIfNotOk(response, text.revealError)

      const payload = (await response.json()) as { document?: { valueFull?: string } }
      const valueFull = payload.document?.valueFull

      if (!valueFull) throw new Error(text.revealError)

      setRevealedValues(current => ({ ...current, [revealDocumentId]: valueFull }))
      setRevealDocumentId(null)
      setReason('')
      revealTriggerRef.current?.focus()
    } catch (error) {
      // 403 estructural (capability revocada) NO es reintentable: mostrar
      // "Reintentar" escondería la acción real, que es pedir el permiso.
      const isDenied = error instanceof CanonicalApiError && error.status === 403

      setRevealError({
        message: isDenied ? text.revealDenied : ((error as Error).message ?? text.revealError),
        actionable: error instanceof CanonicalApiError ? error.actionable && !isDenied : true,
      })
    } finally {
      setRevealing(false)
    }
  }

  const copyValue = async (value: string) => {
    await navigator.clipboard.writeText(value)
    setToast(text.copied)
  }

  const header = (
    <Box>
      <Typography variant='h5'>{copy.application.documentsTitle}</Typography>
      <Typography color='text.secondary' variant='body2'>
        {text.subtitle}
      </Typography>
    </Box>
  )

  // `!documents` sin `documentsFailed` es inalcanzable: la page gatea con la MISMA
  // capability que el reader (`hiring.application.read`) y redirige a /401 sin ella,
  // así que la única forma de llegar sin paquete documental es que el reader fallara.
  if (documentsFailed || !documents) {
    return (
      <Stack spacing={3} data-capture='hiring-documents-panel'>
        {header}
        <Alert
          severity='error'
          icon={<i className='tabler-alert-triangle' />}
          action={
            <Button onClick={() => window.location.reload()} size='small'>
              {copy.common.retry}
            </Button>
          }
        >
          {text.loadError}
        </Alert>
      </Stack>
    )
  }

  const fileLabel = (row: CandidateDocumentFileRow) =>
    row.kind === 'cv' ? text.cvLabel : text.portfolioFileLabel

  const fileDetail = (row: CandidateDocumentFileRow) => {
    if (row.status === 'missing') return row.kind === 'cv' ? text.noCv : text.noPortfolio
    if (row.status === 'quarantined') return text.quarantinedBody
    if (row.status === 'pending') return text.pendingBody

    const parts = [row.fileName, formatBytes(row.sizeBytes)].filter(Boolean) as string[]

    if (row.uploadedAt) {
      parts.push(interpolate(text.uploadedOn, { date: formatDate(row.uploadedAt, undefined, 'es-CL') }))
    }

    const meta = parts.join(' · ')

    return row.status === 'legacy_unscanned' ? `${meta} · ${text.legacyBody}` : meta
  }

  const hasPortfolio =
    documents.links.some(link => link.kind === 'portfolio') ||
    documents.files.some(file => file.kind === 'portfolio_file' && file.status !== 'missing')

  const linkRows = [
    ...documents.links.map(link => ({
      key: `link:${link.kind}`,
      label: link.kind === 'portfolio' ? text.portfolioLinkLabel : text.linkedinLabel,
      icon: link.kind === 'portfolio' ? 'tabler-world' : 'tabler-brand-linkedin',
      url: link.url,
    })),
    ...(hasPortfolio ? [] : [{ key: 'link:portfolio-missing', label: text.portfolioLinkLabel, icon: 'tabler-world', url: null }]),
  ]

  const totalFileGroupRows = documents.files.length + linkRows.length

  return (
    <Stack spacing={3} data-capture='hiring-documents-panel'>
      {header}

      {documents.quarantinedCount > 0 ? (
        <Alert severity='warning' icon={<i className='tabler-shield-x' />}>
          {interpolate(text.quarantineBanner, { count: String(documents.quarantinedCount) })}
        </Alert>
      ) : null}

      <Box>
        <Typography variant='overline' color='text.secondary' id='hiring-documents-files-heading'>
          {text.filesGroup}
        </Typography>
        <Paper
          variant='outlined'
          sx={{ borderRadius: 3, overflow: 'hidden', mt: 1 }}
          data-capture='hiring-documents-files'
        >
          <Box component='ul' role='list' aria-labelledby='hiring-documents-files-heading' sx={{ m: 0, p: 0 }}>
            {documents.files.map((row, index) => {
              const presentation = row.status === 'available' ? null : STATUS_PRESENTATION[row.status]
              const label = fileLabel(row)
              const causeId = row.openHref ? undefined : `${row.rowKey}-cause`

              return (
                <DocumentRow
                  key={row.rowKey}
                  isLast={index === totalFileGroupRows - 1}
                  icon={presentation?.icon ?? 'tabler-file-cv'}
                  tone={presentation?.tone ?? 'primary'}
                  label={label}
                  ariaDescribedBy={causeId}
                  statusChip={
                    presentation && row.status !== 'missing' ? (
                      <GreenhouseChip
                        size='small'
                        kind='status'
                        variant='label'
                        tone={presentation.tone}
                        label={
                          row.status === 'quarantined'
                            ? text.statusQuarantined
                            : row.status === 'pending'
                              ? text.statusPending
                              : text.statusLegacy
                        }
                      />
                    ) : undefined
                  }
                  detail={fileDetail(row)}
                  actions={
                    row.openHref && row.downloadHref ? (
                      <>
                        <Button
                          variant='outlined'
                          sx={LINK_ACTION_SX}
                          data-capture='hiring-document-view'
                          startIcon={<i className='tabler-eye' />}
                          aria-label={interpolate(text.viewAriaLabel, { document: label, name: candidateName })}
                          onClick={event => {
                            viewerTriggerRef.current = event.currentTarget
                            setViewerRow(row)
                          }}
                        >
                          {text.view}
                        </Button>
                        <Button
                          component='a'
                          variant='text'
                          sx={LINK_ACTION_SX}
                          href={row.downloadHref}
                          startIcon={<i className='tabler-download' />}
                          aria-label={interpolate(text.downloadAriaLabel, { document: label, name: candidateName })}
                        >
                          {text.download}
                        </Button>
                      </>
                    ) : null
                  }
                />
              )
            })}

            {linkRows.map((row, index) => (
              <DocumentRow
                key={row.key}
                isLast={documents.files.length + index === totalFileGroupRows - 1}
                icon={row.icon}
                tone={row.url ? 'primary' : 'info'}
                label={row.label}
                detail={row.url ?? text.noPortfolio}
                actions={
                  row.url ? (
                    <Button
                      component='a'
                      variant='outlined'
                      sx={LINK_ACTION_SX}
                      href={row.url}
                      target='_blank'
                      rel='noreferrer'
                      startIcon={<i className='tabler-external-link' />}
                      aria-label={interpolate(text.openAriaLabel, { document: row.label, name: candidateName })}
                    >
                      {text.open}
                    </Button>
                  ) : null
                }
              />
            ))}
          </Box>
        </Paper>
      </Box>

      <Box>
        <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
          <Typography variant='overline' color='text.secondary' id='hiring-documents-identity-heading'>
            {text.identityGroup}
          </Typography>
          <GreenhouseChip size='small' kind='status' variant='label' tone='warning' label={text.sensitiveChip} />
        </Stack>
        <Paper
          variant='outlined'
          sx={{ borderRadius: 3, overflow: 'hidden' }}
          data-capture='hiring-documents-identity'
        >
          {documents.identityDocuments.length === 0 ? (
            <Box sx={{ p: 2.5 }}>
              <Typography variant='body2' color='text.secondary'>
                {text.identityEmpty}
              </Typography>
            </Box>
          ) : (
            <Box component='ul' role='list' aria-labelledby='hiring-documents-identity-heading' sx={{ m: 0, p: 0 }}>
              {documents.identityDocuments.map((document, index) => {
                const revealed = revealedValues[document.documentId]
                const country = getCountryName(document.countryCode) ?? document.countryCode

                return (
                  <DocumentRow
                    key={document.documentId}
                    isLast={index === documents.identityDocuments.length - 1}
                    icon='tabler-id'
                    tone='warning'
                    label={`${document.documentType} · ${country}`}
                    statusChip={
                      revealed ? (
                        <GreenhouseChip size='small' kind='status' variant='label' tone='success' label={text.revealed} />
                      ) : undefined
                    }
                    detail={
                      revealed ? (
                        <Box component='span' role='status' aria-live='polite' sx={{ fontWeight: 650 }}>
                          {revealed}
                        </Box>
                      ) : (
                        document.displayMask
                      )
                    }
                    actions={
                      revealed ? (
                        <>
                          <GreenhouseButton
                            kind='secondaryAction'
                            leadingIconClassName='tabler-copy'
                            onClick={() => void copyValue(revealed)}
                          >
                            {text.copyValue}
                          </GreenhouseButton>
                          <GreenhouseButton
                            kind='secondaryAction'
                            leadingIconClassName='tabler-eye-off'
                            onClick={() =>
                              setRevealedValues(current => {
                                const next = { ...current }

                                delete next[document.documentId]

                                return next
                              })
                            }
                          >
                            {text.hideValue}
                          </GreenhouseButton>
                        </>
                      ) : canRevealIdentity ? (
                        <GreenhouseButton
                          kind='secondaryAction'
                          leadingIconClassName='tabler-lock'
                          aria-label={interpolate(text.revealAriaLabel, { name: candidateName })}
                          onClick={event => {
                            revealTriggerRef.current = event.currentTarget
                            setRevealDocumentId(document.documentId)
                          }}
                        >
                          {text.reveal}
                        </GreenhouseButton>
                      ) : null
                    }
                  />
                )
              })}
            </Box>
          )}
        </Paper>
        {documents.identityDocuments.length > 0 && canRevealIdentity ? (
          <Typography variant='caption' color='text.secondary' sx={{ display: 'block', mt: 1 }}>
            {text.identityMaskedHint}
          </Typography>
        ) : null}
      </Box>

      {/*
        El CV se lee DENTRO del portal. Mandarlo a otra pestaña rompía el contexto
        justo cuando el reclutador lo necesita —está evaluando a esta persona— y
        además delegaba los estados (carga, 403, archivo roto) al visor del sistema,
        donde no podemos decir nada honesto. `react-pdf` se carga bajo demanda al
        abrir, nunca en el bundle de la ruta.
      */}
      <Dialog
        open={Boolean(viewerRow)}
        onClose={closeViewer}
        maxWidth='lg'
        fullWidth
        aria-labelledby='hiring-documents-viewer-title'
        PaperProps={{ 'data-capture': 'hiring-documents-viewer', sx: { blockSize: '90vh' } }}
      >
        <DialogTitle
          id='hiring-documents-viewer-title'
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Box component='span' sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            {viewerRow
              ? interpolate(text.viewerTitle, {
                  document: viewerRow.kind === 'cv' ? text.cvLabel : text.portfolioFileLabel,
                  name: candidateName,
                })
              : ''}
          </Box>
          <Button onClick={closeViewer} sx={LINK_ACTION_SX} startIcon={<i className='tabler-x' />}>
            {copy.common.close}
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', justifyContent: 'center', backgroundColor: 'action.hover' }}>
          {viewerRow?.openHref ? (
            <GreenhouseDocumentPreview
              url={viewerRow.openHref}
              mimeType={viewerRow.mimeType ?? 'application/octet-stream'}
              fileName={viewerRow.fileName ?? ''}
              renderEscapeHatch={false}
              copy={{
                loading: text.viewerLoading,
                loadError: text.viewerLoadError,
                unsupported: text.viewerUnsupported,
                noEmbed: text.viewerNoEmbed,
                openInNewTab: text.viewerOpenInNewTab,
                frameTitle: text.viewerFrameTitle,
              }}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          {viewerRow?.openHref ? (
            <Button
              component='a'
              href={viewerRow.openHref}
              target='_blank'
              rel='noopener noreferrer'
              sx={LINK_ACTION_SX}
              startIcon={<i className='tabler-external-link' />}
            >
              {text.viewerOpenInNewTab}
            </Button>
          ) : null}
          {viewerRow?.downloadHref ? (
            <Button
              component='a'
              variant='outlined'
              href={viewerRow.downloadHref}
              sx={LINK_ACTION_SX}
              startIcon={<i className='tabler-download' />}
            >
              {text.download}
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(revealDocumentId)}
        onClose={closeRevealDialog}
        maxWidth='sm'
        fullWidth
        aria-labelledby='hiring-documents-reveal-title'
        PaperProps={{ 'data-capture': 'hiring-documents-reveal-dialog' }}
      >
        <DialogTitle id='hiring-documents-reveal-title'>{text.revealDialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <Typography variant='body2'>
              {interpolate(text.revealDialogBody, { name: candidateName })}
            </Typography>
            <Alert severity='info' icon={<i className='tabler-clipboard-check' />}>
              {text.revealAuditNotice}
            </Alert>
            {revealError ? (
              <Alert severity='error'>
                {revealError.message}
                {revealError.actionable ? (
                  <Box sx={{ mt: 1 }}>
                    <Button size='small' onClick={() => void confirmReveal()}>
                      {copy.common.retry}
                    </Button>
                  </Box>
                ) : null}
              </Alert>
            ) : null}
            <TextField
              autoFocus
              required
              multiline
              minRows={3}
              label={text.revealReasonLabel}
              value={reason}
              onChange={event => setReason(event.target.value)}
              helperText={text.revealReasonHelper}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeRevealDialog} disabled={revealing}>
            {copy.common.cancel}
          </Button>
          <GreenhouseButton
            kind='primaryAction'
            disabled={reason.trim().length < MINIMUM_REASON_LENGTH || revealing}
            aria-busy={revealing}
            leadingIcon={revealing ? <CircularProgress size={16} color='inherit' /> : undefined}
            leadingIconClassName={revealing ? undefined : 'tabler-lock-open'}
            onClick={() => void confirmReveal()}
          >
            {copy.application.revealConfirm}
          </GreenhouseButton>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Stack>
  )
}

export default CandidateDocumentsPanel
