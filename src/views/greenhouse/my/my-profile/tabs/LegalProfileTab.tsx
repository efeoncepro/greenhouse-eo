'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { toast } from 'sonner'

import EmptyState from '@/components/greenhouse/EmptyState'

import LegalProfileAddressForm from './legal-profile/LegalProfileAddressForm'
import LegalProfileDocumentForm from './legal-profile/LegalProfileDocumentForm'
import LegalProfileHero from './legal-profile/LegalProfileHero'
import LegalProfileItem from './legal-profile/LegalProfileItem'
import LegalProfileSection from './legal-profile/LegalProfileSection'
import {
  LEGAL_PROFILE_COPY,
  formatRelativeDeclared,
  formatVerifiedDate
} from './legal-profile/copy'
import { accentForStatus, type AddressDto, type DocumentDto, type LegalProfileResponseDto } from './legal-profile/types'

type AddressKind = 'legal' | 'residence' | 'mailing' | 'emergency'

const ADDRESS_KIND_ICONS: Record<AddressKind, string> = {
  legal: 'tabler-home',
  residence: 'tabler-bed',
  mailing: 'tabler-mail',
  emergency: 'tabler-heart-handshake'
}

const REQUIRED_ADDRESS_KINDS: AddressKind[] = ['legal']

const LegalProfileTab = () => {
  const theme = useTheme()
  const [data, setData] = useState<LegalProfileResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // expansion state per item id (or pseudo-id for empty add slots)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [serverErrorById, setServerErrorById] = useState<Record<string, string | null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)

    try {
      const r = await fetch('/api/my/legal-profile', { cache: 'no-store' })

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? LEGAL_PROFILE_COPY.fetchError)
      }

      setData((await r.json()) as LegalProfileResponseDto)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : LEGAL_PROFILE_COPY.fetchError)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const documents = useMemo(() => data?.documents ?? [], [data])
  const addresses = useMemo(() => data?.addresses ?? [], [data])

  const addressByKind = useMemo(() => {
    const map = new Map<AddressKind, AddressDto>()

    for (const a of addresses) {
      // Prefer verified over pending if multiple
      const existing = map.get(a.addressType)

      if (
        !existing ||
        (existing.verificationStatus !== 'verified' && a.verificationStatus === 'verified')
      ) {
        map.set(a.addressType, a)
      }
    }

    return map
  }, [addresses])

  // Progress: 4 items canónicos
  //   1. Documento principal (CL_RUT u otro primario)
  //   2. Direccion legal
  //   3. Direccion de residencia
  //   4. Contacto de emergencia
  const primaryDoc = documents[0]
  const legalAddr = addressByKind.get('legal') ?? null
  const residenceAddr = addressByKind.get('residence') ?? null
  const emergencyAddr = addressByKind.get('emergency') ?? null

  const slotStates: Array<'complete' | 'pending' | 'empty'> = [
    primaryDoc?.verificationStatus === 'verified'
      ? 'complete'
      : primaryDoc?.verificationStatus === 'pending_review'
        ? 'pending'
        : 'empty',
    legalAddr?.verificationStatus === 'verified'
      ? 'complete'
      : legalAddr?.verificationStatus === 'pending_review'
        ? 'pending'
        : 'empty',
    residenceAddr?.verificationStatus === 'verified'
      ? 'complete'
      : residenceAddr?.verificationStatus === 'pending_review'
        ? 'pending'
        : 'empty',
    emergencyAddr?.verificationStatus === 'verified'
      ? 'complete'
      : emergencyAddr?.verificationStatus === 'pending_review'
        ? 'pending'
        : 'empty'
  ]

  const completedCount = slotStates.filter(s => s === 'complete').length
  const totalSlots = 4

  const isEmptyFirstUse = documents.length === 0 && addresses.length === 0

  const isAllVerified =
    completedCount === totalSlots && slotStates.every(s => s === 'complete')

  const heroVariant: 'default' | 'empty' | 'complete' = isAllVerified
    ? 'complete'
    : isEmptyFirstUse
      ? 'empty'
      : 'default'

  const toggleExpanded = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const closeExpanded = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: false }))

  // ── Submit handlers ──────────────────────────────────────────────

  const submitDocument = useCallback(
    async (
      slotId: string,
      input: { countryCode: string; documentType: string; rawValue: string }
    ) => {
      setSubmitting(true)
      setServerErrorById(prev => ({ ...prev, [slotId]: null }))

      try {
        const r = await fetch('/api/my/legal-profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: 'document', ...input })
        })

        if (!r.ok) {
          const body = await r.json().catch(() => ({}))

          throw new Error(body?.error ?? LEGAL_PROFILE_COPY.toasts.saveError)
        }

        toast.success(`${LEGAL_PROFILE_COPY.toasts.documentSaved} · ${LEGAL_PROFILE_COPY.toasts.documentSavedBody}`)
        closeExpanded(slotId)
        await load()
      } catch (err) {
        setServerErrorById(prev => ({
          ...prev,
          [slotId]: err instanceof Error ? err.message : LEGAL_PROFILE_COPY.toasts.saveError
        }))
      } finally {
        setSubmitting(false)
      }
    },
    [load]
  )

  const submitAddress = useCallback(
    async (
      slotId: string,
      input: {
        addressType: AddressKind
        countryCode: string
        streetLine1: string
        city: string
        region: string | null
        postalCode: string | null
      }
    ) => {
      setSubmitting(true)
      setServerErrorById(prev => ({ ...prev, [slotId]: null }))

      try {
        const r = await fetch('/api/my/legal-profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ kind: 'address', ...input })
        })

        if (!r.ok) {
          const body = await r.json().catch(() => ({}))

          throw new Error(body?.error ?? LEGAL_PROFILE_COPY.toasts.saveError)
        }

        toast.success(`${LEGAL_PROFILE_COPY.toasts.addressSaved} · ${LEGAL_PROFILE_COPY.toasts.addressSavedBody}`)
        closeExpanded(slotId)
        await load()
      } catch (err) {
        setServerErrorById(prev => ({
          ...prev,
          [slotId]: err instanceof Error ? err.message : LEGAL_PROFILE_COPY.toasts.saveError
        }))
      } finally {
        setSubmitting(false)
      }
    },
    [load]
  )

  // ── Render helpers ───────────────────────────────────────────────

  const renderDocumentItem = (doc: DocumentDto) => {
    const accent = accentForStatus(doc.verificationStatus)
    const slotId = `doc-${doc.documentId}`
    const isExpanded = Boolean(expanded[slotId])
    const isRejected = doc.verificationStatus === 'rejected'

    // Auto-expand rejected by default first time
    const effectiveExpanded = isExpanded || (isRejected && expanded[slotId] !== false)

    const subtitleNode = (
      <span>
        <Box
          component='span'
          sx={{
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
            fontWeight: 500,
            color: 'text.primary'
          }}
        >
          {doc.displayMask}
        </Box>
        <Box component='span' sx={{ color: 'text.secondary' }}>
          {' · '}
          {formatRelativeDeclared(doc.declaredAt)}
        </Box>
      </span>
    )

    const statusBlock =
      doc.verificationStatus === 'pending_review' ? (
        <>
          <i className='tabler-eye-search' aria-hidden='true' style={{ fontSize: 18, color: 'inherit' }} />
          <Box sx={{ flex: 1 }}>{LEGAL_PROFILE_COPY.statusBlock.pending_review}</Box>
        </>
      ) : doc.verificationStatus === 'verified' ? (
        <>
          <i className='tabler-shield-check' aria-hidden='true' style={{ fontSize: 18, color: 'inherit' }} />
          <Box sx={{ flex: 1 }}>
            {LEGAL_PROFILE_COPY.statusBlock.verified}
            {doc.verifiedAt ? ` · ${formatVerifiedDate(doc.verifiedAt)}` : ''}
          </Box>
        </>
      ) : isRejected && doc.rejectedReason ? (
        <Alert severity='error' role='status' sx={{ flex: 1 }}>
          <strong>{LEGAL_PROFILE_COPY.statusBlock.rejected_prefix}</strong> {doc.rejectedReason}
        </Alert>
      ) : null

    const docTypeKey = doc.documentType
    const docTitle = `${LEGAL_PROFILE_COPY.documentTypeLabels[docTypeKey] ?? docTypeKey} (${doc.countryCode})`

    return (
      <LegalProfileItem
        key={doc.documentId}
        iconClassName={doc.documentType === 'CL_RUT' ? 'tabler-id' : 'tabler-id-badge-2'}
        title={docTitle}
        subtitle={subtitleNode}
        accent={accent}
        status={doc.verificationStatus}
        expanded={effectiveExpanded}
        onToggle={() => toggleExpanded(slotId)}
        statusBlock={statusBlock}
        form={
          <LegalProfileDocumentForm
            initialCountry={doc.countryCode}
            initialType={doc.documentType}
            submitting={submitting}
            serverError={serverErrorById[slotId] ?? null}
            onSubmit={input => submitDocument(slotId, input)}
            onCancel={() => closeExpanded(slotId)}
          />
        }
      />
    )
  }

  const renderAddressItem = (addr: AddressDto) => {
    const accent = accentForStatus(addr.verificationStatus)
    const slotId = `addr-${addr.addressId}`
    const isExpanded = Boolean(expanded[slotId])
    const isRejected = addr.verificationStatus === 'rejected'

    const subtitleNode = (
      <Box component='span' sx={{ color: 'text.secondary' }}>
        {addr.presentationMask}
      </Box>
    )

    const statusBlock =
      addr.verificationStatus === 'pending_review' ? (
        <>
          <i className='tabler-eye-search' aria-hidden='true' style={{ fontSize: 18, color: 'inherit' }} />
          <Box sx={{ flex: 1 }}>{LEGAL_PROFILE_COPY.statusBlock.pending_review_address}</Box>
        </>
      ) : addr.verificationStatus === 'verified' ? (
        <>
          <i className='tabler-shield-check' aria-hidden='true' style={{ fontSize: 18, color: 'inherit' }} />
          <Box sx={{ flex: 1 }}>
            {LEGAL_PROFILE_COPY.statusBlock.verified_address}
            {addr.verifiedAt ? ` · ${formatVerifiedDate(addr.verifiedAt)}` : ''}
          </Box>
        </>
      ) : isRejected && addr.rejectedReason ? (
        <Alert severity='error' role='status' sx={{ flex: 1 }}>
          <strong>{LEGAL_PROFILE_COPY.statusBlock.rejected_prefix}</strong> {addr.rejectedReason}
        </Alert>
      ) : null

    return (
      <LegalProfileItem
        key={addr.addressId}
        iconClassName={ADDRESS_KIND_ICONS[addr.addressType]}
        title={LEGAL_PROFILE_COPY.addressTypeLabels[addr.addressType]}
        subtitle={subtitleNode}
        accent={accent}
        status={addr.verificationStatus}
        expanded={isExpanded || isRejected}
        onToggle={() => toggleExpanded(slotId)}
        statusBlock={statusBlock}
        form={
          <LegalProfileAddressForm
            fixedAddressType={addr.addressType}
            initialCountry={addr.countryCode}
            submitting={submitting}
            serverError={serverErrorById[slotId] ?? null}
            onSubmit={input => submitAddress(slotId, input)}
            onCancel={() => closeExpanded(slotId)}
          />
        }
      />
    )
  }

  const renderEmptyAddressSlot = (kind: AddressKind) => {
    const slotId = `addr-empty-${kind}`
    const isExpanded = Boolean(expanded[slotId])
    const isRequired = REQUIRED_ADDRESS_KINDS.includes(kind)
    const title = LEGAL_PROFILE_COPY.addressTypeLabels[kind]

    return (
      <LegalProfileItem
        key={slotId}
        iconClassName={isRequired ? ADDRESS_KIND_ICONS[kind] : ADDRESS_KIND_ICONS[kind]}
        title={title}
        subtitle={
          isRequired
            ? LEGAL_PROFILE_COPY.statusBlock.missing_required
            : LEGAL_PROFILE_COPY.addressTypeHints[kind]
        }
        accent={isRequired ? 'error' : 'neutral'}
        status={isRequired ? 'missing' : undefined}
        expanded={isExpanded || isRequired}
        onToggle={() => toggleExpanded(slotId)}
        variant={isRequired ? 'item' : 'add'}
        form={
          <LegalProfileAddressForm
            fixedAddressType={kind}
            submitting={submitting}
            serverError={serverErrorById[slotId] ?? null}
            onSubmit={input => submitAddress(slotId, input)}
            onCancel={() => closeExpanded(slotId)}
          />
        }
      />
    )
  }

  const renderEmptyDocumentSlot = () => {
    const slotId = 'doc-empty-add'
    const isExpanded = Boolean(expanded[slotId])

    return (
      <LegalProfileItem
        key={slotId}
        iconClassName='tabler-plus'
        title={LEGAL_PROFILE_COPY.empty.addDocumentTitle}
        subtitle={LEGAL_PROFILE_COPY.empty.addDocumentHint}
        accent='neutral'
        expanded={isExpanded}
        onToggle={() => toggleExpanded(slotId)}
        variant='add'
        form={
          <LegalProfileDocumentForm
            submitting={submitting}
            serverError={serverErrorById[slotId] ?? null}
            onSubmit={input => submitDocument(slotId, input)}
            onCancel={() => closeExpanded(slotId)}
          />
        }
      />
    )
  }

  const renderRequiredDocumentMissing = () => {
    const slotId = 'doc-required-missing'
    const isExpanded = Boolean(expanded[slotId])
    const expectedCountry = data?.expectedCountry ?? null
    const expectedType = data?.expectedDocumentType ?? null

    // Country-aware title:
    //   - Si conocemos el pais y tipo canonico → "DNI (Argentina)"
    //   - Si no conocemos pais → "Documento de identidad" (generico)
    const title = expectedType
      ? LEGAL_PROFILE_COPY.documentTypeLabels[expectedType] ?? LEGAL_PROFILE_COPY.genericDocumentTitle
      : LEGAL_PROFILE_COPY.genericDocumentTitle

    return (
      <LegalProfileItem
        key={slotId}
        iconClassName='tabler-id'
        title={title}
        subtitle={LEGAL_PROFILE_COPY.statusBlock.missing_required}
        accent='error'
        status='missing'
        expanded={isExpanded || true}
        onToggle={() => toggleExpanded(slotId)}
        form={
          <LegalProfileDocumentForm
            initialCountry={expectedCountry ?? undefined}
            initialType={expectedType ?? undefined}
            submitting={submitting}
            serverError={serverErrorById[slotId] ?? null}
            onSubmit={input => submitDocument(slotId, input)}
            onCancel={() => closeExpanded(slotId)}
          />
        }
      />
    )
  }

  // ── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <Stack spacing={6}>
        <Skeleton variant='rounded' height={140} />
        <Skeleton variant='rounded' height={88} />
        <Skeleton variant='rounded' height={88} />
        <Skeleton variant='rounded' height={88} />
      </Stack>
    )
  }

  if (fetchError) {
    return (
      <Alert severity='error' role='alert' sx={{ mb: 4 }}>
        {fetchError}
      </Alert>
    )
  }

  // First-use state — empty state grande
  if (isEmptyFirstUse) {
    const expectedType = data?.expectedDocumentType ?? null

    const docName = expectedType === 'CL_RUT'
      ? 'RUT'
      : expectedType
        ? (LEGAL_PROFILE_COPY.documentTypeLabels[expectedType] ?? 'documento de identidad').replace(/\s*\(.+\)$/, '')
        : 'documento de identidad'

    return (
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.customBorderRadius.lg,
          overflow: 'hidden',
          boxShadow: `0 1px 2px ${alpha(theme.palette.text.primary, 0.04)}`
        }}
      >
        <LegalProfileHero completed={0} total={totalSlots} variant='empty' />
        <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
          <EmptyState
            icon='tabler-id-badge-2'
            title={LEGAL_PROFILE_COPY.firstUse.title}
            description={LEGAL_PROFILE_COPY.firstUse.description(docName)}
            action={
              <Button
                variant='contained'
                color='primary'
                onClick={() => toggleExpanded('doc-required-missing')}
                startIcon={<i className='tabler-arrow-right' style={{ fontSize: 16 }} aria-hidden='true' />}
              >
                {LEGAL_PROFILE_COPY.firstUse.cta(docName)}
              </Button>
            }
          />
        </Box>
        {expanded['doc-required-missing'] ? (
          <Box sx={{ borderTop: `1px solid ${theme.palette.divider}` }}>
            {renderRequiredDocumentMissing()}
          </Box>
        ) : null}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
            px: 6,
            py: 3,
            borderTop: `1px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.text.primary, 0.025),
            fontSize: 12,
            color: 'text.secondary'
          }}
        >
          <Stack direction='row' spacing={1} alignItems='center'>
            <i className='tabler-shield-lock' style={{ fontSize: 14 }} aria-hidden='true' />
            <Typography variant='caption' color='text.secondary'>
              Tus datos estan protegidos
            </Typography>
          </Stack>
          <Link
            href='#'
            underline='none'
            color='text.secondary'
            sx={{
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover': { color: 'text.primary' }
            }}
          >
            <i className='tabler-info-circle' style={{ fontSize: 14 }} aria-hidden='true' />
            {LEGAL_PROFILE_COPY.hero.privacyToggle}
          </Link>
        </Box>
      </Card>
    )
  }

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.customBorderRadius.lg,
        overflow: 'hidden',
        boxShadow: `0 1px 2px ${alpha(theme.palette.text.primary, 0.04)}`,
        ...(heroVariant === 'complete' && {
          borderColor: theme.palette.success.main
        })
      }}
    >
      <LegalProfileHero
        completed={completedCount}
        total={totalSlots}
        variant={heroVariant}
      />

      <LegalProfileSection
        title={LEGAL_PROFILE_COPY.sections.identification.title}
        hint={LEGAL_PROFILE_COPY.sections.identification.hint}
      >
        {documents.length > 0 ? (
          documents.map((doc, i) => (
            <Box key={doc.documentId}>
              {i > 0 ? <Divider sx={{ mx: 6 }} /> : null}
              {renderDocumentItem(doc)}
            </Box>
          ))
        ) : (
          renderRequiredDocumentMissing()
        )}
        {documents.length > 0 ? (
          <Box>
            <Divider sx={{ mx: 6 }} />
            {renderEmptyDocumentSlot()}
          </Box>
        ) : null}
      </LegalProfileSection>

      <LegalProfileSection
        title={LEGAL_PROFILE_COPY.sections.addresses.title}
        hint={LEGAL_PROFILE_COPY.sections.addresses.hint}
      >
        {legalAddr ? renderAddressItem(legalAddr) : renderEmptyAddressSlot('legal')}
        <Divider sx={{ mx: 6 }} />
        {residenceAddr ? renderAddressItem(residenceAddr) : renderEmptyAddressSlot('residence')}
        <Divider sx={{ mx: 6 }} />
        {emergencyAddr ? renderAddressItem(emergencyAddr) : renderEmptyAddressSlot('emergency')}
      </LegalProfileSection>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          px: 6,
          py: 3,
          borderTop: `1px solid ${theme.palette.divider}`,
          backgroundColor: alpha(theme.palette.text.primary, 0.025)
        }}
      >
        <Stack direction='row' spacing={1} alignItems='center'>
          <i
            className={heroVariant === 'complete' ? 'tabler-shield-check' : 'tabler-shield-lock'}
            style={{
              fontSize: 14,
              color:
                heroVariant === 'complete'
                  ? theme.palette.success.main
                  : theme.palette.text.secondary
            }}
            aria-hidden='true'
          />
          <Typography variant='caption' color='text.secondary'>
            Tus datos estan protegidos
          </Typography>
        </Stack>
        <Link
          href='#'
          underline='none'
          color='text.secondary'
          sx={{
            fontSize: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            '&:hover': { color: 'text.primary' }
          }}
        >
          <i className='tabler-info-circle' style={{ fontSize: 14 }} aria-hidden='true' />
          {LEGAL_PROFILE_COPY.hero.privacyToggle}
        </Link>
      </Box>
    </Card>
  )
}

export default LegalProfileTab
