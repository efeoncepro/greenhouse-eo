'use client'

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import CustomChip from '@core/components/mui/Chip'

import { GH_CONTRACTOR_COMPENSATION as C } from '@/lib/copy/contractor-compensation'
import { formatDateTime } from '@/lib/format'
import type {
  ContractorSupportDocument,
  ContractorSupportDocumentsBundle,
  ContractorSupportDocumentScope,
  ContractorSupportDocumentWarningCode
} from '@/lib/contractor-engagements/support-documents/types'

const copy = C.supportDocuments

type ReactPdfDocumentProps = {
  file: string
  onLoadSuccess: (args: { numPages: number }) => void
  loading: ReactNode
  error: ReactNode
  children: ReactNode
}

type ReactPdfPageProps = {
  pageNumber: number
  width: number
  loading: ReactNode
}

type PdfComponents = {
  Document: ComponentType<ReactPdfDocumentProps>
  Page: ComponentType<ReactPdfPageProps>
}

let pdfComponentsPromise: Promise<PdfComponents> | null = null

const loadPdfComponents = (): Promise<PdfComponents> => {
  if (!pdfComponentsPromise) {
    pdfComponentsPromise = import('react-pdf').then(module => {
      module.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString()

      return {
        Document: module.Document as ComponentType<ReactPdfDocumentProps>,
        Page: module.Page as ComponentType<ReactPdfPageProps>
      }
    })
  }

  return pdfComponentsPromise
}

const scopeCopy: Record<ContractorSupportDocumentScope, string> = {
  current_work_submission: copy.currentSubmissionScope,
  other_work_submission: copy.otherSubmissionScope,
  engagement: copy.engagementScope
}

const warningCopy: Record<ContractorSupportDocumentWarningCode, string> = {
  invoice_attached_to_engagement: copy.invoiceAttachedToEngagement,
  required_invoice_missing: copy.requiredInvoiceMissing
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`

  return `${Math.round(bytes / 1024 / 102.4) / 10} MB`
}

const isPreviewable = (document: ContractorSupportDocument): boolean =>
  document.mimeType === 'application/pdf' || document.mimeType.startsWith('image/')

const PdfPreview = ({ blobUrl }: { blobUrl: string }) => {
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfComponents, setPdfComponents] = useState<PdfComponents | null>(null)
  const [pdfLoadError, setPdfLoadError] = useState(false)

  useEffect(() => {
    let active = true

    setPdfLoadError(false)

    void loadPdfComponents()
      .then(components => {
        if (active) setPdfComponents(components)
      })
      .catch(() => {
        if (active) setPdfLoadError(true)
      })

    return () => {
      active = false
    }
  }, [])

  if (pdfLoadError) {
    return (
      <Stack spacing={3} alignItems='center' justifyContent='center' sx={{ flex: 1, p: 6 }}>
        <Alert severity='error' icon={<i className='tabler-alert-triangle' />}>
          {copy.viewerLoadError}
        </Alert>
      </Stack>
    )
  }

  if (!pdfComponents) {
    return (
      <Stack spacing={2} alignItems='center' justifyContent='center' sx={{ flex: 1 }}>
        <CircularProgress />
        <Typography variant='body2' color='text.secondary'>
          {copy.viewerLoading}
        </Typography>
      </Stack>
    )
  }

  const PdfDocument = pdfComponents.Document
  const PdfPage = pdfComponents.Page

  return (
    <Stack spacing={2} sx={{ width: '100%', height: '100%' }}>
      <Stack direction='row' spacing={1} justifyContent='center' alignItems='center' sx={{ flex: '0 0 auto' }}>
        <IconButton
          size='small'
          onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
          disabled={currentPage <= 1}
          aria-label={copy.previousPageAria}
        >
          <i className='tabler-chevron-left' />
        </IconButton>
        <Typography variant='caption' sx={{ minWidth: 72, textAlign: 'center' }}>
          {currentPage} / {numPages || '…'}
        </Typography>
        <IconButton
          size='small'
          onClick={() => setCurrentPage(page => Math.min(numPages, page + 1))}
          disabled={numPages <= 1 || currentPage >= numPages}
          aria-label={copy.nextPageAria}
        >
          <i className='tabler-chevron-right' />
        </IconButton>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          p: 3
        }}
      >
        <PdfDocument
          file={blobUrl}
          onLoadSuccess={({ numPages: total }: { numPages: number }) => {
            setNumPages(total)
            setCurrentPage(1)
          }}
          loading={<CircularProgress size={24} />}
          error={<Typography color='error'>{copy.viewerLoadError}</Typography>}
        >
          <PdfPage pageNumber={currentPage} width={760} loading={<CircularProgress size={20} />} />
        </PdfDocument>
      </Box>
    </Stack>
  )
}

const SupportDocumentPreview = ({ document }: { document: ContractorSupportDocument }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    let nextBlobUrl: string | null = null

    setLoading(true)
    setError(false)
    setBlobUrl(null)

    void fetch(document.previewUrl, { credentials: 'include' })
      .then(response => {
        if (!response.ok) throw new Error('preview_load_failed')

        return response.blob()
      })
      .then(blob => {
        nextBlobUrl = URL.createObjectURL(blob)

        if (active) {
          setBlobUrl(nextBlobUrl)
        } else {
          URL.revokeObjectURL(nextBlobUrl)
        }
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false

      if (nextBlobUrl) URL.revokeObjectURL(nextBlobUrl)
    }
  }, [document.previewUrl])

  if (loading) {
    return (
      <Stack spacing={2} alignItems='center' justifyContent='center' sx={{ flex: 1 }}>
        <CircularProgress />
        <Typography variant='body2' color='text.secondary'>
          {copy.viewerLoading}
        </Typography>
      </Stack>
    )
  }

  if (error || !blobUrl) {
    return (
      <Stack spacing={3} alignItems='center' justifyContent='center' sx={{ flex: 1, p: 6 }}>
        <Alert severity='error' icon={<i className='tabler-alert-triangle' />}>
          {copy.viewerLoadError}
        </Alert>
        <Button component='a' href={document.previewUrl} target='_blank' rel='noopener noreferrer' variant='contained'>
          {copy.openFileCta}
        </Button>
      </Stack>
    )
  }

  if (document.mimeType === 'application/pdf') {
    return <PdfPreview blobUrl={blobUrl} />
  }

  if (document.mimeType.startsWith('image/')) {
    return (
      <Box
        component='img'
        src={blobUrl}
        alt={document.filename}
        sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', m: 'auto' }}
      />
    )
  }

  return (
    <Stack spacing={3} alignItems='center' justifyContent='center' sx={{ flex: 1, p: 6 }}>
      <Alert severity='info' icon={<i className='tabler-file-download' />}>
        {copy.nonPreviewableDescription}
      </Alert>
      <Button component='a' href={document.previewUrl} target='_blank' rel='noopener noreferrer' variant='contained'>
        {copy.openFileCta}
      </Button>
    </Stack>
  )
}

interface ContractorSupportDocumentsPanelProps {
  bundle: ContractorSupportDocumentsBundle | null
  loading: boolean
  error: string | null
  onRetry: () => void
}

const DocumentRow = ({
  document,
  onPreview
}: {
  document: ContractorSupportDocument
  onPreview: (document: ContractorSupportDocument) => void
}) => (
  <Box
    data-capture='contractor-support-document-row'
    sx={theme => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.customBorderRadius.md}px`,
      p: 3
    })}
  >
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent='space-between' alignItems='flex-start'>
      <Stack direction='row' spacing={2.5} alignItems='flex-start' sx={{ minWidth: 0 }}>
        <Box
          sx={theme => ({
            width: 38,
            height: 38,
            borderRadius: `${theme.shape.customBorderRadius.md}px`,
            display: 'grid',
            placeItems: 'center',
            flex: '0 0 auto',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main'
          })}
        >
          <i className={document.mimeType === 'application/pdf' ? 'tabler-file-type-pdf' : 'tabler-file'} />
        </Box>
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Typography variant='subtitle2' sx={{ wordBreak: 'break-word' }}>
            {document.filename}
          </Typography>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            <CustomChip round='true' size='small' variant='tonal' color='primary' label={copy.role[document.assetRole]} />
            <CustomChip round='true' size='small' variant='tonal' color='secondary' label={scopeCopy[document.scope]} />
          </Stack>
          <Typography variant='caption' color='text.secondary'>
            {copy.source[document.source]} · {formatBytes(document.sizeBytes)} ·{' '}
            {formatDateTime(document.attachedAt ?? document.createdAt, { fallback: '—' }, 'es-CL')}
          </Typography>
        </Stack>
      </Stack>
      <Button
        size='small'
        variant='tonal'
        startIcon={<i className='tabler-eye' />}
        onClick={() => onPreview(document)}
        sx={{ flex: '0 0 auto' }}
      >
        {copy.openViewerCta}
      </Button>
    </Stack>
  </Box>
)

const ContractorSupportDocumentsPanel = ({
  bundle,
  loading,
  error,
  onRetry
}: ContractorSupportDocumentsPanelProps) => {
  const [selectedDocument, setSelectedDocument] = useState<ContractorSupportDocument | null>(null)
  const documents = bundle?.documents ?? []
  const warnings = bundle?.summary.warnings ?? []
  const previewable = selectedDocument ? isPreviewable(selectedDocument) : false

  const summaryChips = useMemo(() => {
    if (!bundle) return []

    return [
      { label: `${copy.invoiceCountLabel}: ${bundle.summary.invoiceCount}`, color: 'primary' as const },
      { label: `${copy.evidenceCountLabel}: ${bundle.summary.evidenceCount}`, color: 'secondary' as const }
    ]
  }, [bundle])

  return (
    <>
      <Stack spacing={3} data-capture='contractor-support-documents-admin'>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent='space-between'>
          <Box>
            <Typography variant='subtitle1'>{copy.title}</Typography>
            <Typography variant='body2' color='text.secondary'>
              {copy.subtitle}
            </Typography>
          </Box>
          {summaryChips.length ? (
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              {summaryChips.map(chip => (
                <CustomChip key={chip.label} round='true' size='small' variant='tonal' color={chip.color} label={chip.label} />
              ))}
            </Stack>
          ) : null}
        </Stack>

        {loading ? (
          <Stack direction='row' spacing={2} alignItems='center' sx={{ py: 2 }} role='status'>
            <CircularProgress size={18} />
            <Typography variant='body2' color='text.secondary'>
              {copy.loading}
            </Typography>
          </Stack>
        ) : error ? (
          <Alert
            severity='error'
            icon={<i className='tabler-alert-triangle' />}
            action={
              <Button color='inherit' size='small' onClick={onRetry}>
                {copy.retryCta}
              </Button>
            }
          >
            {error}
          </Alert>
        ) : documents.length === 0 ? (
          <Alert severity='info' icon={<i className='tabler-file-search' />} role='status'>
            <Typography variant='subtitle2'>{copy.emptyTitle}</Typography>
            <Typography variant='body2'>{copy.emptyDescription}</Typography>
          </Alert>
        ) : (
          <>
            {warnings.map(warning => (
              <Alert key={warning} severity={warning === 'required_invoice_missing' ? 'warning' : 'info'} icon={<i className='tabler-info-circle' />}>
                {warningCopy[warning]}
              </Alert>
            ))}
            <Stack spacing={2}>
              {documents.map(document => (
                <DocumentRow key={document.invoiceAssetId} document={document} onPreview={setSelectedDocument} />
              ))}
            </Stack>
          </>
        )}
      </Stack>

      <Dialog
        fullWidth
        maxWidth='lg'
        open={Boolean(selectedDocument)}
        onClose={() => setSelectedDocument(null)}
        PaperProps={{ sx: { minHeight: { xs: '80vh', md: '86vh' } } }}
      >
        <DialogTitle>
          <Stack direction='row' spacing={2} justifyContent='space-between' alignItems='center'>
            <Typography variant='h6' sx={{ wordBreak: 'break-word' }}>
              {selectedDocument?.filename}
            </Typography>
            <Stack direction='row' spacing={1} alignItems='center'>
              {selectedDocument ? (
                <Button
                  component='a'
                  href={selectedDocument.previewUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  variant='tonal'
                  size='small'
                  startIcon={<i className='tabler-external-link' />}
                >
                  {copy.openInTabCta}
                </Button>
              ) : null}
              <IconButton onClick={() => setSelectedDocument(null)} aria-label={copy.closeViewerAria}>
                <i className='tabler-x' />
              </IconButton>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent
          data-capture='contractor-support-document-viewer-content'
          sx={{ p: 0, display: 'flex', minHeight: { xs: '70vh', md: '78vh' } }}
        >
          {selectedDocument && previewable ? (
            <SupportDocumentPreview document={selectedDocument} />
          ) : selectedDocument ? (
            <Stack spacing={3} alignItems='center' justifyContent='center' sx={{ flex: 1, p: 6 }}>
              <Alert severity='info' icon={<i className='tabler-file-download' />}>
                {copy.nonPreviewableDescription}
              </Alert>
              <Button component='a' href={selectedDocument.previewUrl} target='_blank' rel='noopener noreferrer' variant='contained'>
                {copy.openFileCta}
              </Button>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ContractorSupportDocumentsPanel
