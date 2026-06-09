'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'
import { toast } from 'sonner'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomChip from '@core/components/mui/Chip'

import { motion, AnimatePresence } from '@/libs/FramerMotion'
import useReducedMotion from '@/hooks/useReducedMotion'
import EmptyState from '@/components/greenhouse/EmptyState'
import { OperationalStatusBadge } from '@/components/greenhouse/primitives'
import {
  GH_WORKFORCE_CONTRACTING as C,
  contractingSectionLabel,
  contractingSourceLabel
} from '@/lib/copy/workforce-contracting'
import type { ContractingDraftContent } from '@/lib/workforce/contracting/readers'

interface Props {
  caseId: string | null
  canApprove: boolean
  canManage: boolean
  canSendSignature: boolean
  onChanged: () => void
}

type SectionRow = {
  code: string
  esHeading: string | null
  esBody: string | null
  enHeading: string | null
  enBody: string | null
  parity: 'ok' | 'missing'
}

// Marca cualquier placeholder pendiente: [POR DEFINIR …] / [TO BE DEFINED …] (con o sin detalle).
const PLACEHOLDER_RE = /\[(?:POR DEFINIR|TO BE DEFINED)[^\]]*\]/g

const countPlaceholders = (text: string | null): number =>
  text ? text.match(PLACEHOLDER_RE)?.length ?? 0 : 0

// Resalta los placeholders dentro de un fragmento (señal visual "falta completar este campo").
const highlightPlaceholders = (text: string, theme: Theme): ReactNode[] => {
  const out: ReactNode[] = []
  const re = new RegExp(PLACEHOLDER_RE)
  let last = 0
  let key = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index))
    out.push(
      <Box
        component='span'
        key={`ph-${key++}`}
        sx={{
          mx: 0.25,
          px: 0.75,
          py: 0.1,
          borderRadius: 0.75,
          bgcolor: alpha(theme.palette.warning.main, 0.16),
          color: 'warning.dark',
          fontWeight: 600,
          fontSize: '0.78rem',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {match[0]}
      </Box>
    )
    last = match.index + match[0].length
  }

  if (last < text.length) out.push(text.slice(last))

  return out
}

// Renderiza el cuerpo de una cláusula con jerarquía: separa sub-cláusulas "N.N" con número colgante
// y resalta los placeholders por definir. Sin esto, el texto legal se ve como un bloque plano.
const ClauseBody = ({ text, theme }: { text: string | null; theme: Theme }) => {
  if (!text || !text.trim()) {
    return (
      <Typography variant='body2' color='text.disabled'>
        {C.detail.notAvailable}
      </Typography>
    )
  }

  const chunks = text
    .split(/(?=\b\d+\.\d+\s)/)
    .map(s => s.trim())
    .filter(Boolean)

  const blocks = chunks.length > 1 ? chunks : [text.trim()]

  return (
    <Stack spacing={1.25}>
      {blocks.map((block, bi) => {
        const marked = block.match(/^(\d+\.\d+)\s+([\s\S]*)$/)

        if (marked) {
          return (
            <Box key={bi} sx={{ display: 'flex', gap: 1.25 }}>
              <Typography variant='caption'
                component='span'
                sx={{
                  flexShrink: 0,
                  minWidth: 30,
                  fontWeight: 700,
                  lineHeight: 1.7,
                  color: 'text.primary',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                {marked[1]}
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
                {highlightPlaceholders(marked[2], theme)}
              </Typography>
            </Box>
          )
        }

        return (
          <Typography key={bi} variant='body2' color='text.secondary' sx={{ lineHeight: 1.7 }}>
            {highlightPlaceholders(block, theme)}
          </Typography>
        )
      })}
    </Stack>
  )
}

const BilingualReviewDesk = ({ caseId, canApprove, canManage, canSendSignature, onChanged }: Props) => {
  const theme = useTheme()
  const [content, setContent] = useState<ContractingDraftContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const reducedMotion = useReducedMotion()
  const [thinkingStep, setThinkingStep] = useState(0)

  // Cicla los pasos de "la IA está pensando" mientras Claude redacta (~1-2 min).
  useEffect(() => {
    if (!busy) {
      setThinkingStep(0)

      return
    }

    const id = setInterval(() => {
      setThinkingStep(s => (s + 1) % C.review.aiThinkingSteps.length)
    }, 2200)

    return () => clearInterval(id)
  }, [busy])

  const load = useCallback(async (id: string) => {
    setLoading(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(id)}/draft-content`)
      const data = (await res.json()) as { content: ContractingDraftContent | null }

      setContent(data.content ?? null)
    } catch {
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (caseId) {
      void load(caseId)
    } else {
      setContent(null)
    }
  }, [caseId, load])

  const rows = useMemo<SectionRow[]>(() => {
    const sc = content?.structuredContent

    if (!sc) return []

    const es = sc.localizedDrafts['es-CL']?.sections ?? []
    const en = sc.localizedDrafts['en-US']?.sections ?? []
    const codes = Array.from(new Set([...es.map(s => s.sectionCode), ...en.map(s => s.sectionCode)]))

    return codes.map(code => {
      const esS = es.find(s => s.sectionCode === code) ?? null
      const enS = en.find(s => s.sectionCode === code) ?? null

      return {
        code,
        esHeading: esS?.heading ?? null,
        esBody: esS?.body ?? null,
        enHeading: enS?.heading ?? null,
        enBody: enS?.body ?? null,
        parity: esS && enS ? 'ok' : 'missing'
      }
    })
  }, [content])

  const blockers = content?.validation?.blockers ?? []
  const parityStatus = content?.validation?.languageParity?.status ?? 'unknown'

  // TASK-1024 — signature state derived from the case status.
  const caseStatus = content?.caseStatus ?? null
  const signedPdfAssetId = content?.signedPdfAssetId ?? null
  const canSend = canSendSignature && caseStatus === 'ready_for_signature' && Boolean(content?.pdfAssetId)

  const signatureStatus = useMemo<{ label: string; status: 'pending' | 'success' | 'error' } | null>(() => {
    if (caseStatus === 'sent_for_signature' || caseStatus === 'partially_signed') {
      return { label: C.review.signatureStatusSent, status: 'pending' }
    }

    if (caseStatus === 'fully_signed' || caseStatus === 'registered_external' || caseStatus === 'active') {
      return { label: C.review.signatureStatusSigned, status: 'success' }
    }

    if (caseStatus === 'signature_failed' || caseStatus === 'expired') {
      return { label: C.review.signatureStatusFailed, status: 'error' }
    }

    return null
  }, [caseStatus])

  const handleApprove = useCallback(async () => {
    if (!content) return
    setBusy(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/drafts/${encodeURIComponent(content.draftId)}/approve`, { method: 'POST' })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.review.approveError)
      }

      toast.success(C.review.approved)
      onChanged()
      if (caseId) void load(caseId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.review.approveError)
    } finally {
      setBusy(false)
    }
  }, [content, onChanged, caseId, load])

  const handleGeneratePdf = useCallback(async () => {
    if (!caseId) return
    setBusy(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(caseId)}/generate-document`, { method: 'POST' })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.review.generatePdfError)
      }

      const data = (await res.json()) as { pdfAssetId?: string }

      toast.success(C.review.generatePdfDone)
      onChanged()
      void load(caseId)

      if (data.pdfAssetId) {
        window.open(`/api/assets/private/${encodeURIComponent(data.pdfAssetId)}`, '_blank', 'noopener')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.review.generatePdfError)
    } finally {
      setBusy(false)
    }
  }, [caseId, onChanged, load])

  const handleSendToSignature = useCallback(async () => {
    if (!caseId) return
    setBusy(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(caseId)}/send-to-signature`, {
        method: 'POST'
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.review.sendToSignatureError)
      }

      toast.success(C.review.sentToSignature)
      onChanged()
      void load(caseId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.review.sendToSignatureError)
    } finally {
      setBusy(false)
    }
  }, [caseId, onChanged, load])

  const handleVoid = useCallback(async () => {
    if (!caseId) return
    const reason = window.prompt(C.actions.void + ' — motivo (mín. 5 caracteres):')?.trim()

    if (!reason || reason.length < 5) return

    setBusy(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(caseId)}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.review.voidError)
      }

      toast.success(C.review.voided)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.review.voidError)
    } finally {
      setBusy(false)
    }
  }, [caseId, onChanged])

  const handleGenerate = useCallback(async () => {
    if (!caseId) return
    setBusy(true)

    try {
      const res = await fetch(`/api/hr/workforce/contracting/${encodeURIComponent(caseId)}/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (res.status === 409) {
        toast.message(C.review.aiDisabled)

        return
      }

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string }

        throw new Error(payload.error || C.create.error)
      }

      toast.success(C.create.success)
      onChanged()
      void load(caseId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : C.create.error)
    } finally {
      setBusy(false)
    }
  }, [caseId, onChanged, load])

  if (!caseId) {
    return (
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent>
          <EmptyState icon='tabler-columns-3' title={C.bilingualReview} description={C.review.selectFromQueue} />
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent>
          <Stack spacing={2} aria-busy='true' aria-label={C.states.loadingDetail}>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={22} />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (!content) {
    // "La IA está pensando": Claude tarda ~1-2 min redactando ES+EN. Sin esta señal,
    // el botón quedaba muerto y el usuario creía que no pasaba nada (caso Luis).
    if (busy) {
      return (
        <Card
          data-capture='workforce-contracting-ai-thinking'
          sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}
        >
          <CardContent sx={{ py: { xs: 5, md: 7 } }}>
            <Stack spacing={3} alignItems='center' role='status' aria-live='polite' sx={{ maxWidth: 460, mx: 'auto', textAlign: 'center' }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                {!reducedMotion && (
                  <motion.span
                    aria-hidden='true'
                    initial={{ scale: 0.85, opacity: 0.5 }}
                    animate={{ scale: [0.85, 1.25, 0.85], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      background: alpha(theme.palette.primary.main, 0.25)
                    }}
                  />
                )}
                <CustomAvatar skin='light' color='primary' size={56} sx={{ position: 'relative' }}>
                  <motion.i
                    className='tabler-sparkles'
                    aria-hidden='true'
                    style={{ fontSize: 26, display: 'inline-flex' }}
                    animate={reducedMotion ? undefined : { rotate: [0, 8, -8, 0] }}
                    transition={reducedMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </CustomAvatar>
              </Box>

              <Stack spacing={1} alignItems='center'>
                <Typography variant='h6'>{C.review.aiThinkingTitle}</Typography>
                <Box sx={{ minHeight: 24 }}>
                  {reducedMotion ? (
                    <Typography variant='body2' color='text.secondary'>
                      {C.review.aiThinkingSteps[thinkingStep]}
                    </Typography>
                  ) : (
                    <AnimatePresence mode='wait'>
                      <motion.div
                        key={thinkingStep}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.35 }}
                      >
                        <Typography variant='body2' color='text.secondary'>
                          {C.review.aiThinkingSteps[thinkingStep]}
                        </Typography>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </Box>
              </Stack>

              <LinearProgress sx={{ width: '100%', borderRadius: 1, height: 6 }} />

              <Typography variant='caption' color='text.secondary'>
                {C.review.aiThinkingHint}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent>
          <EmptyState
            icon='tabler-file-off'
            title={C.review.noDraftTitle}
            description={C.review.noDraftBody}
            action={
              canManage ? (
                <Button
                  variant='contained'
                  onClick={handleGenerate}
                  disabled={busy}
                  startIcon={
                    busy ? (
                      <CircularProgress size={16} color='inherit' />
                    ) : (
                      <i className='tabler-sparkles' aria-hidden='true' />
                    )
                  }
                >
                  {busy ? C.review.generatingDraft : C.review.generateDraft}
                </Button>
              ) : undefined
            }
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Stack spacing={3} data-capture='workforce-contracting-bilingual-review'>
      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent='space-between' spacing={2} alignItems={{ md: 'center' }}>
            <Stack spacing={0.5}>
              <Typography variant='h5'>{C.bilingualReview}</Typography>
              <Typography variant='body2' color='text.secondary'>
                Versión {content.draftVersion} · {contractingSourceLabel(content.source)}
              </Typography>
            </Stack>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center'>
              <OperationalStatusBadge
                tone={parityStatus === 'pass' ? 'success' : parityStatus === 'fail' ? 'error' : 'secondary'}
                label={`${C.review.structuralParity}: ${(C.parityLabels as Record<string, string>)[parityStatus] ?? parityStatus}`}
                icon='tabler-language'
              />
              {blockers.length > 0 ? (
                <OperationalStatusBadge tone='error' label={`${C.detail.blockers}: ${blockers.length}`} icon='tabler-alert-triangle' />
              ) : (
                <OperationalStatusBadge tone='success' label={C.detail.noBlockers} icon='tabler-circle-check' />
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ boxShadow: 'none', border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ overflowX: 'auto' }} tabIndex={0} aria-label={C.aria.bilingualReviewTable}>
            <Table sx={{ minWidth: 900 }}>
              <caption className='sr-only'>{C.aria.bilingualReviewTable}</caption>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.text.primary, 0.02) }}>
                  <TableCell scope='col' sx={{ width: 220 }}>
                    <Typography
                      variant='caption'
                      sx={{ textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 700, color: 'text.secondary' }}
                    >
                      {C.review.sectionsHeader}
                    </Typography>
                  </TableCell>
                  <TableCell scope='col' sx={{ width: '40%' }}>
                    <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                      <Typography variant='subtitle2'>{C.review.langEs}</Typography>
                      <CustomChip round='true' size='small' variant='tonal' color='primary' label={C.review.langEsTag} />
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>
                      {C.review.langEsHint}
                    </Typography>
                  </TableCell>
                  <TableCell scope='col' sx={{ width: '40%' }}>
                    <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap' useFlexGap>
                      <Typography variant='subtitle2'>{C.review.langEn}</Typography>
                      <CustomChip round='true' size='small' variant='tonal' color='secondary' label={C.review.langEnTag} />
                    </Stack>
                    <Typography variant='caption' color='text.secondary'>
                      {C.review.langEnHint}
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => {
                  const pendingFields = countPlaceholders(row.esBody) || countPlaceholders(row.enBody)

                  return (
                    <TableRow
                      key={row.code}
                      sx={{
                        bgcolor:
                          row.parity === 'missing'
                            ? alpha(theme.palette.error.main, 0.055)
                            : idx % 2 === 1
                              ? alpha(theme.palette.text.primary, 0.015)
                              : undefined,
                        boxShadow: row.parity === 'missing' ? `inset 3px 0 0 ${theme.palette.error.main}` : undefined
                      }}
                    >
                      <TableCell sx={{ verticalAlign: 'top', py: 2.5 }}>
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                            <CustomAvatar
                              skin='light'
                              color={row.parity === 'missing' ? 'error' : 'primary'}
                              size={26}
                              sx={{ fontSize: '0.74rem', fontWeight: 700, mt: '1px', flexShrink: 0 }}
                            >
                              {idx + 1}
                            </CustomAvatar>
                            <Typography
                              variant='subtitle2'
                              color={row.parity === 'missing' ? 'error.main' : 'text.primary'}
                              sx={{ lineHeight: 1.4 }}
                            >
                              {contractingSectionLabel(row.code)}
                            </Typography>
                          </Box>
                          {pendingFields > 0 && (
                            <CustomChip
                              round='true'
                              size='small'
                              variant='tonal'
                              color='warning'
                              label={`${pendingFields} ${C.review.pendingFieldsChip}`}
                              sx={{ alignSelf: 'flex-start' }}
                            />
                          )}
                          {row.parity === 'missing' && (
                            <CustomChip
                              round='true'
                              size='small'
                              variant='tonal'
                              color='error'
                              label={C.review.missingLanguageChip}
                              sx={{ alignSelf: 'flex-start' }}
                            />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top', py: 2.5 }}>
                        <Typography
                          variant='caption'
                          sx={{
                            display: 'block',
                            mb: 1.25,
                            textTransform: 'uppercase',
                            letterSpacing: '.4px',
                            fontWeight: 700,
                            color: row.esHeading ? 'text.primary' : 'text.disabled'
                          }}
                        >
                          {row.esHeading ?? C.detail.notAvailable}
                        </Typography>
                        <ClauseBody text={row.esBody} theme={theme} />
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'top', py: 2.5 }}>
                        <Typography
                          variant='caption'
                          sx={{
                            display: 'block',
                            mb: 1.25,
                            textTransform: 'uppercase',
                            letterSpacing: '.4px',
                            fontWeight: 700,
                            color: row.enHeading ? 'text.primary' : 'text.disabled'
                          }}
                        >
                          {row.enHeading ?? C.detail.notAvailable}
                        </Typography>
                        <ClauseBody text={row.enBody} theme={theme} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Box>
        </CardContent>
      </Card>

      {blockers.length > 0 ? (
        <Card sx={{ boxShadow: 'none', border: theme => `1px solid ${alpha(theme.palette.error.main, 0.24)}`, bgcolor: alpha(theme.palette.error.main, 0.05) }}>
          <CardContent>
            <Stack direction='row' spacing={1.5} alignItems='flex-start'>
              <CustomAvatar skin='light' color='error' variant='rounded'>
                <i className='tabler-alert-triangle' aria-hidden='true' />
              </CustomAvatar>
              <Box>
                <Typography variant='subtitle2' color='error.main' sx={{ mb: 0.5 }}>
                  {C.detail.blockers} ({blockers.length})
                </Typography>
                <Stack spacing={0.5}>
                  {blockers.map((b, idx) => (
                    <Typography key={`${b.code ?? idx}`} variant='body2' color='text.secondary'>
                      • {b.message ?? b.code}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      <Card sx={{ position: 'sticky', bottom: 16, zIndex: 2, boxShadow: theme.shadows[8], border: `1px solid ${theme.palette.divider}` }}>
        {/* Reserva la safe-area del dock global de acciones flotantes. */}
        <CardContent sx={{ py: 2, pr: { sm: 'var(--gh-floating-actions-safe-inline-size)' } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent={signatureStatus ? 'space-between' : 'flex-end'}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            spacing={1.5}
          >
            {signatureStatus ? (
              <OperationalStatusBadge
                label={signatureStatus.label}
                tone={signatureStatus.status === 'success' ? 'success' : signatureStatus.status === 'error' ? 'error' : 'info'}
                icon={
                  signatureStatus.status === 'success'
                    ? 'tabler-circle-check'
                    : signatureStatus.status === 'error'
                      ? 'tabler-alert-triangle'
                      : 'tabler-clock'
                }
              />
            ) : null}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {canManage ? (
                <Button variant='outlined' color='error' disabled={busy} onClick={handleVoid} startIcon={<i className='tabler-ban' aria-hidden='true' />}>
                  {C.actions.void}
                </Button>
              ) : null}
              {signedPdfAssetId ? (
                <Button
                  variant='outlined'
                  onClick={() => window.open(`/api/assets/private/${encodeURIComponent(signedPdfAssetId)}`, '_blank', 'noopener')}
                  startIcon={<i className='tabler-download' aria-hidden='true' />}
                >
                  {C.review.downloadSigned}
                </Button>
              ) : null}
              {canManage ? (
                <Button
                  variant='outlined'
                  disabled={busy || content?.status !== 'approved_for_pdf'}
                  onClick={handleGeneratePdf}
                  startIcon={busy ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-file-type-pdf' aria-hidden='true' />}
                >
                  {busy ? C.review.generating : C.generatePdf}
                </Button>
              ) : null}
              {canApprove ? (
                <Button
                  variant='contained'
                  disabled={busy || blockers.length > 0}
                  onClick={handleApprove}
                  startIcon={busy ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-circle-check' aria-hidden='true' />}
                >
                  {busy ? C.review.approving : C.review.approve}
                </Button>
              ) : null}
              {canSend ? (
                <Button
                  variant='contained'
                  disabled={busy}
                  onClick={handleSendToSignature}
                  title={C.review.sendToSignatureHint}
                  startIcon={busy ? <CircularProgress size={16} color='inherit' /> : <i className='tabler-signature' aria-hidden='true' />}
                >
                  {busy ? C.review.sending : C.review.sendToSignature}
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default BilingualReviewDesk
