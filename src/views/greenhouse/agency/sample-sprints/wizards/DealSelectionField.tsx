'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import { GH_AGENCY } from '@/lib/copy/agency'
import { formatCurrency } from '@/lib/format'

const COMPACT_AVATAR_LIMIT = 4
const COLLAPSE_THRESHOLD = 4
const EXPANDED_LIST_MAX_HEIGHT = 320

/**
 * TASK-837 Slice 2 — Wizard Deal Selection field for Sample Sprints declare.
 *
 * Wraps the Eligible Deals reader endpoint (Slice 1) and renders:
 * - Searchable select with eligibility chips
 * - Read-only inheritance panel (company + contacts) when a deal is selected
 *
 * Server revalidates at submit time via getEligibleDealForRevalidation
 * (Slice 3) — this field is best-effort UX.
 */

const COPY = GH_AGENCY.sampleSprints.dealSelection

export interface DealSelectionFieldValue {
  hubspotDealId: string | null
  // Snapshot data exposed to the parent for read-only display + audit metadata.
  // Server revalidates anyway; this is only inheritance hint at UI level.
  companyHubspotId: string | null
  contactHubspotIds: string[]
}

interface EligibleDealCompany {
  companyRecordId: string
  hubspotCompanyId: string
  name: string
  legalName: string | null
}

interface EligibleDealContact {
  contactRecordId: string
  hubspotContactId: string
  displayName: string
  email: string | null
  jobTitle: string | null
}

interface EligibleDealApiItem {
  hubspotDealId: string
  dealName: string
  dealstage: string
  dealstageLabel: string | null
  pipelineName: string | null
  amount: number | null
  amountClp: number | null
  currency: string
  organizationId: string | null
  spaceId: string | null
  closeDate: string | null
  isClosed: boolean
  isDeleted: boolean
  company: EligibleDealCompany | null
  contacts: EligibleDealContact[]
  isEligible: boolean
  ineligibilityReasons: Array<'closed' | 'deleted' | 'missing_company' | 'missing_contacts'>
}

interface DealsApiResponse {
  items: EligibleDealApiItem[]
  count: number
  eligibleCount: number
}

interface Props {
  value: DealSelectionFieldValue
  onChange: (value: DealSelectionFieldValue) => void
  spaceId?: string | null
  organizationId?: string | null
  /**
   * Canonical anchor para resolver company del deal vía crm.companies.client_id.
   * Pasado desde el space seleccionado (siempre populated). Sin esto, el
   * reader cae al deal.client_id que está NULL en 73% de deals (live audit
   * 2026-05-09 — bug que dejaba "No hay deals abiertos disponibles" para
   * Aguas Andinas y otros tenants).
   */
  clientId?: string | null
  required?: boolean
}

const eligibilityCopy = (reason: 'closed' | 'deleted' | 'missing_company' | 'missing_contacts') => {
  switch (reason) {
    case 'closed':
      return COPY.eligibility.closed
    case 'deleted':
      return COPY.eligibility.deleted
    case 'missing_company':
      return COPY.eligibility.missing_company
    case 'missing_contacts':
      return COPY.eligibility.missing_contacts
  }
}

const formatAmount = (amount: number | null, currency: string): string => {
  if (amount === null) return '—'

  return formatCurrency(amount, currency as 'CLP', { locale: 'es-CL' })
}

/**
 * Compact + progressive disclosure render of the inherited Deal context.
 *
 * Patrón canónico (greenhouse-microinteractions-auditor + greenhouse-ux):
 * - Company stays visible siempre (1 línea + legalName opcional)
 * - Summary chip con count + role='status' (anuncia al SR cuando cambia el deal)
 * - AvatarGroup max=4 + tooltip por avatar para visualizar contactos sin sabana
 * - Collapse expandable con scroll cap 320px cuando N > umbral
 * - Toggle button con aria-expanded/aria-controls
 * - Heights bounded para preservar el balance 7/5 del wizard split
 */
const SelectedDealContext = ({ deal }: { deal: EligibleDealApiItem }) => {
  const [expanded, setExpanded] = useState(false)
  const contacts = deal.contacts
  const totalContacts = contacts.length
  const visiblePreview = contacts.slice(0, COMPACT_AVATAR_LIMIT)
  const hiddenCount = Math.max(totalContacts - COMPACT_AVATAR_LIMIT, 0)
  const shouldOfferCollapse = totalContacts > COLLAPSE_THRESHOLD
  const expandedListId = `selected-deal-contacts-${deal.hubspotDealId}`

  return (
    <Box
      role='region'
      aria-label={COPY.selected.heading}
      sx={{
        border: theme => `1px solid ${theme.palette.divider}`,
        borderRadius: theme => `${theme.shape.customBorderRadius?.md ?? 6}px`,
        p: 4,
        // Cap visual height para preservar balance con la columna form (7/5).
        // Cuando expanded crezca, el inner scroll absorbe el overflow.
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }}
    >
      <Typography variant='subtitle2' color='text.secondary'>
        {COPY.selected.heading}
      </Typography>

      {deal.company ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CustomAvatar skin='light' color='primary' size={32}>
            <i className='tabler-building' aria-hidden='true' />
          </CustomAvatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant='body2' noWrap>
              {deal.company.name}
            </Typography>
            {deal.company.legalName ? (
              <Typography variant='caption' color='text.secondary' noWrap>
                {deal.company.legalName}
              </Typography>
            ) : null}
          </Box>
        </Box>
      ) : null}

      {totalContacts > 0 ? (
        <>
          <Divider />
          <Box>
            {/* role='status' anuncia al SR cuando cambia la selección de deal. */}
            <Box
              role='status'
              aria-live='polite'
              sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}
            >
              <i
                className='tabler-users'
                aria-hidden='true'
                style={{ color: 'var(--mui-palette-text-secondary)', fontSize: 18 }}
              />
              <Typography variant='body2' color='text.secondary'>
                {COPY.selected.contactsSummary(totalContacts)}
              </Typography>
            </Box>

            <AvatarGroup
              max={COMPACT_AVATAR_LIMIT + 1}
              spacing='small'
              sx={{
                justifyContent: 'flex-start',
                '& .MuiAvatar-root': { width: 32, height: 32, fontSize: '0.8rem' }
              }}
            >
              {visiblePreview.map(contact => (
                <Tooltip
                  key={contact.contactRecordId}
                  title={
                    <Box>
                      <Typography variant='caption' sx={{ display: 'block', fontWeight: 600 }}>
                        {contact.displayName}
                      </Typography>
                      {contact.jobTitle ? (
                        <Typography variant='caption' sx={{ display: 'block' }}>
                          {contact.jobTitle}
                        </Typography>
                      ) : null}
                      {contact.email ? (
                        <Typography variant='caption' sx={{ display: 'block', opacity: 0.8 }}>
                          {contact.email}
                        </Typography>
                      ) : null}
                    </Box>
                  }
                  arrow
                >
                  <Avatar>{contact.displayName.charAt(0).toUpperCase()}</Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>

            {shouldOfferCollapse ? (
              <>
                <Box sx={{ mt: 2 }}>
                  <Button
                    size='small'
                    variant='text'
                    onClick={() => setExpanded(prev => !prev)}
                    aria-expanded={expanded}
                    aria-controls={expandedListId}
                    startIcon={
                      <i
                        className={expanded ? 'tabler-chevron-up' : 'tabler-chevron-down'}
                        aria-hidden='true'
                      />
                    }
                  >
                    {expanded ? COPY.selected.contactsCollapse : COPY.selected.contactsExpand(hiddenCount)}
                  </Button>
                </Box>
                <Collapse in={expanded} unmountOnExit>
                  <Box
                    id={expandedListId}
                    aria-label={COPY.selected.contactsAriaList(totalContacts)}
                    sx={{
                      mt: 2,
                      maxHeight: EXPANDED_LIST_MAX_HEIGHT,
                      overflowY: 'auto',
                      border: theme => `1px solid ${theme.palette.divider}`,
                      borderRadius: theme => `${theme.shape.customBorderRadius?.sm ?? 4}px`
                    }}
                  >
                    <List dense disablePadding role='list'>
                      {contacts.map(contact => (
                        <ListItem
                          key={contact.contactRecordId}
                          disableGutters
                          role='listitem'
                          sx={{ px: 2 }}
                        >
                          <ListItemAvatar sx={{ minWidth: 36 }}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                              {contact.displayName.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={contact.displayName}
                            secondary={contact.jobTitle ?? contact.email ?? null}
                            primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                            secondaryTypographyProps={{ variant: 'caption', noWrap: true }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                </Collapse>
              </>
            ) : null}
          </Box>
        </>
      ) : null}
    </Box>
  )
}

const DealSelectionField = ({ value, onChange, spaceId, organizationId, clientId, required }: Props) => {
  const [items, setItems] = useState<EligibleDealApiItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch eligible deals on mount + when filters change.
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const url = new URL('/api/agency/sample-sprints/eligible-deals', window.location.origin)

        if (spaceId) url.searchParams.set('spaceId', spaceId)
        if (organizationId) url.searchParams.set('organizationId', organizationId)
        if (clientId) url.searchParams.set('clientId', clientId)

        const response = await fetch(url.toString(), {
          credentials: 'same-origin',
          cache: 'no-store'
        })

        if (!response.ok) {
          if (!cancelled) {
            setError(COPY.empty.noEligible)
            setItems([])
          }

          return
        }

        const payload = (await response.json()) as DealsApiResponse

        if (!cancelled) setItems(payload.items)
      } catch {
        if (!cancelled) {
          setError(COPY.empty.noEligible)
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [spaceId, organizationId, clientId])

  const eligibleCount = useMemo(() => items.filter(d => d.isEligible).length, [items])

  const selectedDeal = useMemo(
    () => items.find(d => d.hubspotDealId === value.hubspotDealId) ?? null,
    [items, value.hubspotDealId]
  )

  const handleChange = (hubspotDealId: string) => {
    const deal = items.find(d => d.hubspotDealId === hubspotDealId) ?? null

    if (!deal) return

    onChange({
      hubspotDealId: deal.hubspotDealId,
      companyHubspotId: deal.company?.hubspotCompanyId ?? null,
      contactHubspotIds: deal.contacts.map(c => c.hubspotContactId)
    })
  }

  return (
    <Card elevation={0} sx={{ border: theme => `1px solid ${theme.palette.divider}` }}>
      <CardHeader
        title={COPY.sectionTitle}
        subheader={COPY.sectionSubtitle}
        avatar={
          <CustomAvatar skin='light' color='info' variant='rounded'>
            <i className='tabler-link' />
          </CustomAvatar>
        }
      />
      <CardContent>
        <Grid container spacing={5}>
          <Grid size={{ xs: 12, md: 7 }}>
            {loading ? (
              <Skeleton variant='rounded' height={56} />
            ) : items.length === 0 ? (
              <Alert
                severity='info'
                role='status'
                sx={{ alignItems: 'center' }}
              >
                {error ?? COPY.empty.noEligible}
              </Alert>
            ) : (
              <CustomTextField
                select
                fullWidth
                required={required}
                label={COPY.searchLabel}
                value={value.hubspotDealId ?? ''}
                onChange={event => handleChange(event.target.value)}
                helperText={COPY.eligibleSummary(eligibleCount)}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    MenuProps: { PaperProps: { sx: { maxHeight: 360 } } }
                  }
                }}
              >
                <MenuItem value='' disabled>
                  {COPY.searchPlaceholder}
                </MenuItem>
                {items.map(deal => (
                  <MenuItem
                    key={deal.hubspotDealId}
                    value={deal.hubspotDealId}
                    disabled={!deal.isEligible}
                    aria-label={`${deal.dealName}, ${deal.dealstageLabel ?? deal.dealstage}, ${formatAmount(deal.amountClp ?? deal.amount, 'CLP')}${deal.isEligible ? '' : `. ${deal.ineligibilityReasons.map(eligibilityCopy).join(', ')}`}`}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        width: '100%',
                        opacity: deal.isEligible ? 1 : 0.55
                      }}
                    >
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant='body2' noWrap>
                          {deal.dealName}
                        </Typography>
                        <Typography variant='caption' color='text.secondary' noWrap>
                          {deal.dealstageLabel ?? deal.dealstage} · {formatAmount(deal.amountClp ?? deal.amount, 'CLP')}
                        </Typography>
                      </Box>
                      <Chip
                        size='small'
                        label={
                          deal.isEligible
                            ? COPY.eligibility.eligible
                            : eligibilityCopy(deal.ineligibilityReasons[0])
                        }
                        color={deal.isEligible ? 'success' : 'error'}
                        variant='tonal'
                        icon={
                          <i
                            className={
                              deal.isEligible ? 'tabler-circle-check' : 'tabler-alert-triangle'
                            }
                            aria-hidden='true'
                          />
                        }
                      />
                    </Box>
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            {selectedDeal ? (
              <SelectedDealContext deal={selectedDeal} />
            ) : null}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default DealSelectionField
