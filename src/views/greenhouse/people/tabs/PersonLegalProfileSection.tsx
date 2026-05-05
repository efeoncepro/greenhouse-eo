'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

import { toast } from 'sonner'

import CustomChip from '@core/components/mui/Chip'
import type { ThemeColor } from '@core/types'

import HrAddressEditForm from './legal-profile-hr/HrAddressEditForm'
import HrAuditLog from './legal-profile-hr/HrAuditLog'
import HrDocumentEditForm from './legal-profile-hr/HrDocumentEditForm'
import HrItemRow from './legal-profile-hr/HrItemRow'
import HrReadinessBoard from './legal-profile-hr/HrReadinessBoard'
import HrRejectDialog from './legal-profile-hr/HrRejectDialog'
import HrRevealDialog from './legal-profile-hr/HrRevealDialog'
import { HR_LEGAL_COPY, daysSince } from './legal-profile-hr/copy'
import {
  accentForStatus,
  type ActiveEdit,
  type AddressDto,
  type DocumentDto,
  type HrLegalProfileResponseDto,
  type LegalDocumentStatus
} from './legal-profile-hr/types'

interface PersonLegalProfileSectionProps {
  memberId: string
  /** Nombre del colaborador para microcopy contextual ("Pedir a Valentina") */
  collaboratorName?: string
}

type AddressKind = 'legal' | 'residence' | 'mailing' | 'emergency'

const ADDRESS_ICONS: Record<AddressKind, string> = {
  legal: 'tabler-home',
  residence: 'tabler-bed',
  mailing: 'tabler-mail',
  emergency: 'tabler-heart-handshake'
}

const STATUS_TO_CHIP_ICON: Record<LegalDocumentStatus | 'missing', string> = {
  pending_review: 'tabler-clock',
  verified: 'tabler-check',
  rejected: 'tabler-x',
  archived: 'tabler-archive',
  expired: 'tabler-calendar-off',
  missing: 'tabler-circle'
}

const STATUS_TO_CHIP_COLOR: Record<LegalDocumentStatus | 'missing', ThemeColor> = {
  pending_review: 'warning',
  verified: 'success',
  rejected: 'error',
  archived: 'secondary',
  expired: 'secondary',
  missing: 'error'
}

const PersonLegalProfileSection = ({ memberId, collaboratorName }: PersonLegalProfileSectionProps) => {
  const theme = useTheme()
  const displayName = collaboratorName?.split(' ')[0] ?? 'el colaborador'

  const [data, setData] = useState<HrLegalProfileResponseDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [activeEdit, setActiveEdit] = useState<ActiveEdit>(null)
  const [serverErrorById, setServerErrorById] = useState<Record<string, string | null>>({})

  // reveal & reject dialogs
  const [revealState, setRevealState] = useState<{
    open: boolean
    targetKind: 'document' | 'address'
    targetId: string
    revealedValue: string | null
  }>({ open: false, targetKind: 'document', targetId: '', revealedValue: null })

  const [rejectState, setRejectState] = useState<{
    open: boolean
    targetKind: 'document' | 'address'
    targetId: string
  }>({ open: false, targetKind: 'document', targetId: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)

    try {
      const r = await fetch(`/api/hr/people/${encodeURIComponent(memberId)}/legal-profile`, {
        cache: 'no-store'
      })

      if (!r.ok) {
        const body = await r.json().catch(() => ({}))

        throw new Error(body?.error ?? HR_LEGAL_COPY.fetchError)
      }

      setData((await r.json()) as HrLegalProfileResponseDto)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : HR_LEGAL_COPY.fetchError)
    } finally {
      setLoading(false)
    }
  }, [memberId])

  useEffect(() => {
    load()
  }, [load])

  const documents = useMemo(() => data?.documents ?? [], [data])
  const addresses = useMemo(() => data?.addresses ?? [], [data])

  const capabilities = data?.capabilities ?? {
    canVerify: false,
    canHrUpdate: false,
    canRevealSensitive: false
  }

  const addressByKind = useMemo(() => {
    const map = new Map<AddressKind, AddressDto>()

    for (const a of addresses) {
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

  // Header chip global
  const headerChip = useMemo(() => {
    const totalActive =
      documents.filter(d => d.verificationStatus !== 'archived').length +
      addresses.filter(a => a.verificationStatus !== 'archived').length

    if (totalActive === 0) {
      return {
        label: HR_LEGAL_COPY.card.chipEmpty,
        color: 'error' as ThemeColor,
        icon: 'tabler-alert-circle'
      }
    }

    const pending = [...documents, ...addresses].filter(
      i => i.verificationStatus === 'pending_review'
    ).length

    const rejected = [...documents, ...addresses].filter(
      i => i.verificationStatus === 'rejected'
    ).length

    const requiresLegalAddress = !addressByKind.get('legal')

    const requiresVerifiedDoc = documents.every(
      d => d.verificationStatus !== 'verified'
    )

    const missingCount = (requiresLegalAddress ? 1 : 0) + (requiresVerifiedDoc ? 1 : 0)

    if (rejected > 0) {
      return {
        label: HR_LEGAL_COPY.card.chipRejected(rejected),
        color: 'error' as ThemeColor,
        icon: 'tabler-x'
      }
    }

    if (pending > 0 || missingCount > 0) {
      const label =
        pending > 0 && missingCount > 0
          ? HR_LEGAL_COPY.card.chipMixed(pending, missingCount)
          : pending > 0
            ? HR_LEGAL_COPY.card.chipPending(pending)
            : HR_LEGAL_COPY.card.chipMissing(missingCount)

      return { label, color: 'warning' as ThemeColor, icon: 'tabler-clock' }
    }

    return {
      label: HR_LEGAL_COPY.card.chipLista,
      color: 'success' as ThemeColor,
      icon: 'tabler-check'
    }
  }, [documents, addresses, addressByKind])

  const isEditingThis = (
    kind: 'document' | 'address',
    id?: string,
    addressType?: AddressKind
  ): boolean => {
    if (!activeEdit) return false
    if (activeEdit.kind !== kind) return false

    if (activeEdit.kind === 'document') {
      const existing = activeEdit.target.existingDocumentId

      return existing === id || (id === undefined && !existing)
    }

    const existing = activeEdit.target.existingAddressId

    return (
      activeEdit.target.addressType === addressType &&
      (existing === id || (id === undefined && !existing))
    )
  }

  const cancelEdit = () => setActiveEdit(null)

  // ── Mutations ────────────────────────────────────────────────────

  const submitVerifyDocument = async (documentId: string) => {
    setSubmitting(true)

    try {
      const r = await fetch(
        `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/document/${encodeURIComponent(documentId)}/verify`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({})
        }
      )

      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? HR_LEGAL_COPY.toasts.error)
      toast.success(`${HR_LEGAL_COPY.toasts.verified} · ${HR_LEGAL_COPY.toasts.verifiedBody}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : HR_LEGAL_COPY.toasts.error)
    } finally {
      setSubmitting(false)
    }
  }

  const submitVerifyAddress = async (addressId: string) => {
    setSubmitting(true)

    try {
      const r = await fetch(
        `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/address/${encodeURIComponent(addressId)}/verify`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({})
        }
      )

      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? HR_LEGAL_COPY.toasts.error)
      toast.success(`${HR_LEGAL_COPY.toasts.verified} · ${HR_LEGAL_COPY.toasts.verifiedBody}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : HR_LEGAL_COPY.toasts.error)
    } finally {
      setSubmitting(false)
    }
  }

  const submitReject = async (reason: string) => {
    if (!rejectState.open) return
    setSubmitting(true)

    try {
      const path =
        rejectState.targetKind === 'document'
          ? `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/document/${encodeURIComponent(rejectState.targetId)}/reject`
          : `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/address/${encodeURIComponent(rejectState.targetId)}/reject`

      const r = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rejectedReason: reason })
      })

      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? HR_LEGAL_COPY.toasts.error)
      toast.success(`${HR_LEGAL_COPY.toasts.rejected} · ${HR_LEGAL_COPY.toasts.rejectedBody}`)
      setRejectState({ open: false, targetKind: 'document', targetId: '' })
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : HR_LEGAL_COPY.toasts.error)
    } finally {
      setSubmitting(false)
    }
  }

  const submitReveal = async (reason: string) => {
    if (!revealState.open) return
    setSubmitting(true)

    try {
      const path =
        revealState.targetKind === 'document'
          ? `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/document/${encodeURIComponent(revealState.targetId)}/reveal`
          : `/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/address/${encodeURIComponent(revealState.targetId)}/reveal`

      const r = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? HR_LEGAL_COPY.toasts.error)
      const result = await r.json()

      const value =
        revealState.targetKind === 'document'
          ? result?.document?.valueFull ?? null
          : result?.address?.presentationText ?? null

      setRevealState(prev => ({ ...prev, revealedValue: value }))
      toast.success(HR_LEGAL_COPY.toasts.revealLogged)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : HR_LEGAL_COPY.toasts.error)
    } finally {
      setSubmitting(false)
    }
  }

  const submitHrDocument = async (input: {
    countryCode: string
    documentType: string
    rawValue: string
    reason: string
  }) => {
    const slotId = activeEdit?.kind === 'document' ? activeEdit.target.existingDocumentId ?? 'doc-new' : 'doc-new'

    setSubmitting(true)
    setServerErrorById(prev => ({ ...prev, [slotId]: null }))

    try {
      const r = await fetch(`/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/document`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? HR_LEGAL_COPY.toasts.error)
      toast.success(`${HR_LEGAL_COPY.toasts.hrCreated} · ${HR_LEGAL_COPY.toasts.hrCreatedBody}`)
      setActiveEdit(null)
      await load()
    } catch (err) {
      setServerErrorById(prev => ({
        ...prev,
        [slotId]: err instanceof Error ? err.message : HR_LEGAL_COPY.toasts.error
      }))
    } finally {
      setSubmitting(false)
    }
  }

  const submitHrAddress = async (input: {
    addressType: AddressKind
    countryCode: string
    streetLine1: string
    city: string
    region: string | null
    postalCode: string | null
    reason: string
  }) => {
    const slotId =
      activeEdit?.kind === 'address'
        ? activeEdit.target.existingAddressId ?? `addr-new-${input.addressType}`
        : `addr-new-${input.addressType}`

    setSubmitting(true)
    setServerErrorById(prev => ({ ...prev, [slotId]: null }))

    try {
      const r = await fetch(`/api/hr/people/${encodeURIComponent(memberId)}/legal-profile/address`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input)
      })

      if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.error ?? HR_LEGAL_COPY.toasts.error)
      toast.success(`${HR_LEGAL_COPY.toasts.hrCreated} · ${HR_LEGAL_COPY.toasts.hrCreatedBody}`)
      setActiveEdit(null)
      await load()
    } catch (err) {
      setServerErrorById(prev => ({
        ...prev,
        [slotId]: err instanceof Error ? err.message : HR_LEGAL_COPY.toasts.error
      }))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render helpers ───────────────────────────────────────────────

  const renderDocumentItem = (doc: DocumentDto) => {
    const accent = accentForStatus(doc.verificationStatus)
    const docTypeName = HR_LEGAL_COPY.documentTypeLabels[doc.documentType] ?? doc.documentType
    const editing = isEditingThis('document', doc.documentId)
    const slotKey = `doc-${doc.documentId}`

    const subtitle =
      doc.verificationStatus === 'pending_review' ? (
        HR_LEGAL_COPY.itemSubs.pendingDays(displayName, daysSince(doc.declaredAt))
      ) : doc.verificationStatus === 'verified' ? (
        HR_LEGAL_COPY.itemSubs.verifiedDays(daysSince(doc.verifiedAt))
      ) : doc.verificationStatus === 'rejected' ? (
        HR_LEGAL_COPY.itemSubs.rejectedWaiting(displayName)
      ) : null

    const actions =
      doc.verificationStatus === 'pending_review' ? (
        <>
          {capabilities.canVerify ? (
            <Button
              size='small'
              variant='tonal'
              color='success'
              disabled={submitting}
              onClick={() => submitVerifyDocument(doc.documentId)}
              startIcon={<i className='tabler-check' style={{ fontSize: 14 }} aria-hidden='true' />}
            >
              {HR_LEGAL_COPY.actions.verify}
            </Button>
          ) : null}
          {capabilities.canVerify ? (
            <Button
              size='small'
              variant='tonal'
              color='error'
              disabled={submitting}
              onClick={() =>
                setRejectState({ open: true, targetKind: 'document', targetId: doc.documentId })
              }
              startIcon={<i className='tabler-x' style={{ fontSize: 14 }} aria-hidden='true' />}
            >
              {HR_LEGAL_COPY.actions.reject}
            </Button>
          ) : null}
          {capabilities.canRevealSensitive ? (
            <Button
              size='small'
              variant='outlined'
              color='secondary'
              disabled={submitting}
              onClick={() =>
                setRevealState({
                  open: true,
                  targetKind: 'document',
                  targetId: doc.documentId,
                  revealedValue: null
                })
              }
              startIcon={<i className='tabler-eye' style={{ fontSize: 14 }} aria-hidden='true' />}
            >
              {HR_LEGAL_COPY.actions.revealDocument}
            </Button>
          ) : null}
          {capabilities.canHrUpdate ? (
            <Button
              size='small'
              variant='text'
              color='secondary'
              disabled={submitting}
              onClick={() =>
                setActiveEdit({
                  kind: 'document',
                  target: {
                    initialCountry: doc.countryCode,
                    initialType: doc.documentType,
                    existingDocumentId: doc.documentId
                  }
                })
              }
              startIcon={<i className='tabler-edit' style={{ fontSize: 14 }} aria-hidden='true' />}
            >
              {HR_LEGAL_COPY.actions.edit}
            </Button>
          ) : null}
        </>
      ) : doc.verificationStatus === 'verified' ? (
        <>
          {capabilities.canRevealSensitive ? (
            <Button
              size='small'
              variant='outlined'
              color='secondary'
              disabled={submitting}
              onClick={() =>
                setRevealState({
                  open: true,
                  targetKind: 'document',
                  targetId: doc.documentId,
                  revealedValue: null
                })
              }
              startIcon={<i className='tabler-eye' style={{ fontSize: 14 }} aria-hidden='true' />}
            >
              {HR_LEGAL_COPY.actions.revealDocument}
            </Button>
          ) : null}
          {capabilities.canHrUpdate ? (
            <Button
              size='small'
              variant='text'
              color='secondary'
              disabled={submitting}
              onClick={() =>
                setActiveEdit({
                  kind: 'document',
                  target: {
                    initialCountry: doc.countryCode,
                    initialType: doc.documentType,
                    existingDocumentId: doc.documentId
                  }
                })
              }
              startIcon={<i className='tabler-edit' style={{ fontSize: 14 }} aria-hidden='true' />}
            >
              {HR_LEGAL_COPY.actions.editReReview}
            </Button>
          ) : null}
        </>
      ) : doc.verificationStatus === 'rejected' ? (
        capabilities.canHrUpdate ? (
          <Button
            size='small'
            variant='outlined'
            color='secondary'
            disabled={submitting}
            onClick={() =>
              setActiveEdit({
                kind: 'document',
                target: {
                  initialCountry: doc.countryCode,
                  initialType: doc.documentType,
                  existingDocumentId: doc.documentId
                }
              })
            }
            startIcon={<i className='tabler-pencil-plus' style={{ fontSize: 14 }} aria-hidden='true' />}
          >
            {HR_LEGAL_COPY.actions.edit}
          </Button>
        ) : null
      ) : null

    const preBanner =
      doc.verificationStatus === 'rejected' && doc.rejectedReason ? (
        <Alert severity='error' role='status' icon={<i className='tabler-message-2-exclamation' style={{ fontSize: 18 }} />}>
          <strong>{HR_LEGAL_COPY.rejectedBanner}</strong> {doc.rejectedReason}
        </Alert>
      ) : null

    return (
      <HrItemRow
        key={slotKey}
        iconClassName={doc.documentType === 'CL_RUT' ? 'tabler-id' : 'tabler-id-badge-2'}
        title={docTypeName}
        mask={doc.displayMask}
        chipLabel={
          doc.verificationStatus === 'pending_review' && daysSince(doc.declaredAt) > 0
            ? `${HR_LEGAL_COPY.states.pending_review} · ${daysSince(doc.declaredAt)} ${daysSince(doc.declaredAt) === 1 ? 'día' : 'días'}`
            : HR_LEGAL_COPY.states[doc.verificationStatus] ?? null
        }
        chipColor={STATUS_TO_CHIP_COLOR[doc.verificationStatus]}
        chipIcon={STATUS_TO_CHIP_ICON[doc.verificationStatus]}
        subtitle={subtitle}
        accent={accent}
        actions={actions}
        preActionsBanner={preBanner}
        expandedForm={
          editing ? (
            <HrDocumentEditForm
              initialCountry={doc.countryCode}
              initialType={doc.documentType}
              submitting={submitting}
              serverError={serverErrorById[slotKey] ?? null}
              onSubmit={submitHrDocument}
              onCancel={cancelEdit}
            />
          ) : undefined
        }
      />
    )
  }

  const renderEmptyDocumentRow = () => {
    const slotKey = 'doc-required-missing'
    const editing = isEditingThis('document', undefined)
    const expectedCountry = data?.expectedCountry ?? null
    const expectedType = data?.expectedDocumentType ?? null

    // Country-aware title + subtitle:
    //   - Si conocemos el pais y tipo canonico → "DNI (Argentina)" / "documento DNI"
    //   - Si no conocemos pais → "Documento de identidad" generico
    const docTitle = expectedType
      ? HR_LEGAL_COPY.documentTypeLabels[expectedType] ?? HR_LEGAL_COPY.genericDocumentTitle
      : HR_LEGAL_COPY.genericDocumentTitle

    const docName = expectedType
      ? `su ${(HR_LEGAL_COPY.documentTypeLabels[expectedType] ?? 'documento de identidad').replace(/\s*\(.+\)$/, '')}`
      : 'su documento de identidad'

    return (
      <HrItemRow
        key={slotKey}
        iconClassName='tabler-id'
        title={docTitle}
        chipLabel={HR_LEGAL_COPY.states.missing}
        chipColor='error'
        chipIcon='tabler-circle'
        subtitle={HR_LEGAL_COPY.itemSubs.notDeclaredByCollaborator(displayName, docName)}
        accent='error'
        actions={
          <>
            <Button
              size='small'
              variant='contained'
              color='primary'
              startIcon={<i className='tabler-mail-forward' style={{ fontSize: 14 }} aria-hidden='true' />}
              disabled
            >
              {HR_LEGAL_COPY.actions.askCollaborator(displayName)}
            </Button>
            {capabilities.canHrUpdate ? (
              <Button
                size='small'
                variant='outlined'
                color='secondary'
                disabled={submitting || editing}
                onClick={() =>
                  setActiveEdit({
                    kind: 'document',
                    target: {
                      initialCountry: expectedCountry ?? undefined,
                      initialType: expectedType ?? undefined
                    }
                  })
                }
                startIcon={<i className='tabler-pencil-plus' style={{ fontSize: 14 }} aria-hidden='true' />}
              >
                {HR_LEGAL_COPY.actions.editLoad}
              </Button>
            ) : null}
          </>
        }
        expandedForm={
          editing ? (
            <HrDocumentEditForm
              initialCountry={expectedCountry ?? undefined}
              initialType={expectedType ?? undefined}
              submitting={submitting}
              serverError={serverErrorById[slotKey] ?? null}
              onSubmit={submitHrDocument}
              onCancel={cancelEdit}
            />
          ) : undefined
        }
      />
    )
  }

  const renderAddressItem = (addr: AddressDto) => {
    const accent = accentForStatus(addr.verificationStatus)
    const slotKey = `addr-${addr.addressId}`
    const editing = isEditingThis('address', addr.addressId, addr.addressType)

    const subtitle =
      addr.verificationStatus === 'pending_review' ? (
        HR_LEGAL_COPY.itemSubs.pendingDays(displayName, daysSince(addr.declaredAt))
      ) : addr.verificationStatus === 'verified' ? (
        `${addr.presentationMask} — ${HR_LEGAL_COPY.itemSubs.verifiedAddressDays(daysSince(addr.verifiedAt))}`
      ) : addr.verificationStatus === 'rejected' ? (
        HR_LEGAL_COPY.itemSubs.rejectedWaiting(displayName)
      ) : (
        addr.presentationMask
      )

    const actions = (
      <>
        {addr.verificationStatus === 'pending_review' && capabilities.canVerify ? (
          <>
            <Button
              size='small'
              variant='tonal'
              color='success'
              disabled={submitting}
              onClick={() => submitVerifyAddress(addr.addressId)}
              startIcon={<i className='tabler-check' style={{ fontSize: 14 }} aria-hidden='true' />}
            >
              {HR_LEGAL_COPY.actions.verify}
            </Button>
            <Button
              size='small'
              variant='tonal'
              color='error'
              disabled={submitting}
              onClick={() =>
                setRejectState({ open: true, targetKind: 'address', targetId: addr.addressId })
              }
              startIcon={<i className='tabler-x' style={{ fontSize: 14 }} aria-hidden='true' />}
            >
              {HR_LEGAL_COPY.actions.reject}
            </Button>
          </>
        ) : null}
        {capabilities.canRevealSensitive && addr.verificationStatus !== 'archived' ? (
          <Button
            size='small'
            variant='outlined'
            color='secondary'
            disabled={submitting}
            onClick={() =>
              setRevealState({
                open: true,
                targetKind: 'address',
                targetId: addr.addressId,
                revealedValue: null
              })
            }
            startIcon={<i className='tabler-eye' style={{ fontSize: 14 }} aria-hidden='true' />}
          >
            {HR_LEGAL_COPY.actions.revealAddress}
          </Button>
        ) : null}
        {capabilities.canHrUpdate ? (
          <Button
            size='small'
            variant='text'
            color='secondary'
            disabled={submitting}
            onClick={() =>
              setActiveEdit({
                kind: 'address',
                target: {
                  addressType: addr.addressType,
                  initialCountry: addr.countryCode,
                  existingAddressId: addr.addressId
                }
              })
            }
            startIcon={<i className='tabler-edit' style={{ fontSize: 14 }} aria-hidden='true' />}
          >
            {HR_LEGAL_COPY.actions.edit}
          </Button>
        ) : null}
      </>
    )

    const preBanner =
      addr.verificationStatus === 'rejected' && addr.rejectedReason ? (
        <Alert severity='error' role='status' icon={<i className='tabler-message-2-exclamation' style={{ fontSize: 18 }} />}>
          <strong>{HR_LEGAL_COPY.rejectedBanner}</strong> {addr.rejectedReason}
        </Alert>
      ) : null

    return (
      <HrItemRow
        key={slotKey}
        iconClassName={ADDRESS_ICONS[addr.addressType]}
        title={HR_LEGAL_COPY.addressTypeLabels[addr.addressType]}
        chipLabel={
          addr.verificationStatus === 'verified'
            ? HR_LEGAL_COPY.states.verified_address
            : HR_LEGAL_COPY.states[addr.verificationStatus] ?? null
        }
        chipColor={STATUS_TO_CHIP_COLOR[addr.verificationStatus]}
        chipIcon={STATUS_TO_CHIP_ICON[addr.verificationStatus]}
        subtitle={subtitle}
        accent={accent}
        actions={actions}
        preActionsBanner={preBanner}
        expandedForm={
          editing ? (
            <HrAddressEditForm
              fixedAddressType={addr.addressType}
              initialCountry={addr.countryCode}
              submitting={submitting}
              serverError={serverErrorById[slotKey] ?? null}
              onSubmit={submitHrAddress}
              onCancel={cancelEdit}
            />
          ) : undefined
        }
      />
    )
  }

  const renderEmptyAddressRow = (kind: AddressKind, isRequired: boolean) => {
    const slotKey = `addr-empty-${kind}`
    const editing = isEditingThis('address', undefined, kind)
    const isOptional = !isRequired
    const expectedCountry = data?.expectedCountry ?? undefined

    return (
      <HrItemRow
        key={slotKey}
        iconClassName={ADDRESS_ICONS[kind]}
        title={`${HR_LEGAL_COPY.addressTypeLabels[kind]}${isOptional ? ' (opcional)' : ''}`}
        chipLabel={isRequired ? HR_LEGAL_COPY.states.missing : null}
        chipColor={isRequired ? 'error' : 'secondary'}
        chipIcon={isRequired ? 'tabler-circle' : null}
        subtitle={
          isRequired
            ? HR_LEGAL_COPY.itemSubs.addressNotDeclaredYet(displayName)
            : 'No declarada. No es obligatoria para finiquito.'
        }
        accent={isRequired ? 'error' : 'neutral'}
        actions={
          isRequired ? (
            <>
              <Button
                size='small'
                variant='contained'
                color='primary'
                disabled
                startIcon={<i className='tabler-mail-forward' style={{ fontSize: 14 }} aria-hidden='true' />}
              >
                {HR_LEGAL_COPY.actions.askCollaborator(displayName)}
              </Button>
              {capabilities.canHrUpdate ? (
                <Button
                  size='small'
                  variant='outlined'
                  color='secondary'
                  disabled={submitting || editing}
                  onClick={() =>
                    setActiveEdit({ kind: 'address', target: { addressType: kind, initialCountry: expectedCountry } })
                  }
                  startIcon={<i className='tabler-pencil-plus' style={{ fontSize: 14 }} aria-hidden='true' />}
                >
                  {HR_LEGAL_COPY.actions.editLoad}
                </Button>
              ) : null}
            </>
          ) : capabilities.canHrUpdate ? (
            <Button
              size='small'
              variant='text'
              color='secondary'
              disabled={submitting || editing}
              onClick={() =>
                setActiveEdit({ kind: 'address', target: { addressType: kind, initialCountry: expectedCountry } })
              }
              startIcon={<i className='tabler-pencil-plus' style={{ fontSize: 14 }} aria-hidden='true' />}
            >
              {HR_LEGAL_COPY.actions.editLoad}
            </Button>
          ) : null
        }
        expandedForm={
          editing ? (
            <HrAddressEditForm
              fixedAddressType={kind}
              submitting={submitting}
              serverError={serverErrorById[slotKey] ?? null}
              onSubmit={submitHrAddress}
              onCancel={cancelEdit}
            />
          ) : undefined
        }
      />
    )
  }

  // ── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <Card elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
        <Box sx={{ p: 5 }}>
          <Stack spacing={3}>
            <Skeleton variant='rounded' height={56} />
            <Skeleton variant='rounded' height={88} />
            <Skeleton variant='rounded' height={88} />
            <Skeleton variant='rounded' height={88} />
          </Stack>
        </Box>
      </Card>
    )
  }

  if (fetchError) {
    return (
      <Alert severity='error' role='alert'>
        {fetchError}
      </Alert>
    )
  }

  const requiresLegalAddress = !addressByKind.get('legal')
  const hasAnyVerifiedDoc = documents.some(d => d.verificationStatus === 'verified')

  return (
    <Card
      elevation={0}
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.shape.customBorderRadius.lg,
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          px: 6,
          py: 5,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <Box
          aria-hidden='true'
          sx={{
            width: 44,
            height: 44,
            borderRadius: theme.shape.customBorderRadius.md,
            backgroundColor:
              headerChip.color === 'success'
                ? alpha(theme.palette.success.main, 0.12)
                : alpha(theme.palette.primary.main, 0.16),
            color:
              headerChip.color === 'success'
                ? theme.palette.success.main
                : theme.palette.primary.main,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0
          }}
        >
          <i
            className={headerChip.color === 'success' ? 'tabler-shield-check' : 'tabler-id'}
            style={{ fontSize: 22 }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant='h6' sx={{ fontWeight: 600 }}>
            {HR_LEGAL_COPY.card.title}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {HR_LEGAL_COPY.card.subtitle}
          </Typography>
        </Box>
        <CustomChip
          round='true'
          variant='tonal'
          color={headerChip.color}
          label={headerChip.label}
          icon={
            <i
              className={headerChip.icon}
              style={{ fontSize: 16, marginLeft: 4 }}
              aria-hidden='true'
            />
          }
        />
      </Box>

      <Box sx={{ p: 6 }}>
        {/* Readiness board */}
        {data ? (
          <HrReadinessBoard
            finalSettlement={data.readiness.finalSettlementChile}
            payroll={data.readiness.payrollChileDependent}
          />
        ) : null}

        {/* Documentos */}
        <Box component='section' sx={{ mb: 6 }}>
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            sx={{ mb: 3, px: 1 }}
          >
            <Typography
              variant='overline'
              color='text.secondary'
              sx={{ fontWeight: 600, letterSpacing: '0.1em' }}
            >
              {HR_LEGAL_COPY.sections.documents}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {documents.length === 0
                ? HR_LEGAL_COPY.counts.documentsZero
                : HR_LEGAL_COPY.counts.documents(
                    documents.length,
                    documents.filter(d => d.verificationStatus === 'verified').length,
                    documents.filter(d => d.verificationStatus === 'pending_review').length
                  )}
            </Typography>
          </Stack>
          <Stack spacing={3}>
            {documents.length === 0 || !hasAnyVerifiedDoc
              ? [...documents.map(renderDocumentItem), !hasAnyVerifiedDoc && documents.length === 0
                  ? renderEmptyDocumentRow()
                  : null].filter(Boolean)
              : documents.map(renderDocumentItem)}
          </Stack>
        </Box>

        {/* Direcciones */}
        <Box component='section' sx={{ mb: 6 }}>
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            sx={{ mb: 3, px: 1 }}
          >
            <Typography
              variant='overline'
              color='text.secondary'
              sx={{ fontWeight: 600, letterSpacing: '0.1em' }}
            >
              {HR_LEGAL_COPY.sections.addresses}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {addresses.length === 0
                ? HR_LEGAL_COPY.counts.addressesZero
                : HR_LEGAL_COPY.counts.addresses(
                    addresses.length,
                    addresses.filter(a => a.verificationStatus === 'verified').length
                  )}
            </Typography>
          </Stack>
          <Stack spacing={3}>
            {addressByKind.get('legal')
              ? renderAddressItem(addressByKind.get('legal')!)
              : renderEmptyAddressRow('legal', requiresLegalAddress)}
            {addressByKind.get('residence')
              ? renderAddressItem(addressByKind.get('residence')!)
              : renderEmptyAddressRow('residence', false)}
            {addressByKind.get('emergency')
              ? renderAddressItem(addressByKind.get('emergency')!)
              : renderEmptyAddressRow('emergency', false)}
          </Stack>
        </Box>

        <HrAuditLog memberId={memberId} />
      </Box>

      {/* Reject dialog */}
      <HrRejectDialog
        open={rejectState.open}
        collaboratorName={collaboratorName ?? displayName}
        kind={rejectState.targetKind}
        submitting={submitting}
        onSubmit={submitReject}
        onClose={() => setRejectState({ open: false, targetKind: 'document', targetId: '' })}
      />

      {/* Reveal dialog */}
      <HrRevealDialog
        open={revealState.open}
        collaboratorName={collaboratorName ?? displayName}
        kind={revealState.targetKind}
        submitting={submitting}
        revealedValue={revealState.revealedValue}
        onSubmitReveal={submitReveal}
        onClose={() =>
          setRevealState({
            open: false,
            targetKind: 'document',
            targetId: '',
            revealedValue: null
          })
        }
      />
    </Card>
  )
}

export default PersonLegalProfileSection
