'use client'

import { useEffect, useMemo, useState } from 'react'

import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'
import CustomTextField from '@core/components/mui/TextField'

import { GH_AGENCY } from '@/lib/copy/agency'

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

  const fmt = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })

  return fmt.format(amount)
}

const DealSelectionField = ({ value, onChange, spaceId, organizationId, required }: Props) => {
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
  }, [spaceId, organizationId])

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
              <Box
                role='region'
                aria-label={COPY.selected.heading}
                sx={{
                  border: theme => `1px solid ${theme.palette.divider}`,
                  borderRadius: theme => `${theme.shape.customBorderRadius?.md ?? 6}px`,
                  p: 4
                }}
              >
                <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
                  {COPY.selected.heading}
                </Typography>
                {selectedDeal.company ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <CustomAvatar skin='light' color='primary' size={32}>
                      <i className='tabler-building' aria-hidden='true' />
                    </CustomAvatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant='body2' noWrap>
                        {selectedDeal.company.name}
                      </Typography>
                      {selectedDeal.company.legalName ? (
                        <Typography variant='caption' color='text.secondary' noWrap>
                          {selectedDeal.company.legalName}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                ) : null}
                <Typography variant='caption' color='text.secondary'>
                  {COPY.selected.contactsLabel}
                </Typography>
                <List dense disablePadding role='list'>
                  {selectedDeal.contacts.map(contact => (
                    <ListItem key={contact.contactRecordId} disableGutters role='listitem'>
                      <ListItemAvatar sx={{ minWidth: 36 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                          {contact.displayName.charAt(0).toUpperCase()}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={contact.displayName}
                        secondary={contact.jobTitle ?? contact.email ?? null}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ) : null}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default DealSelectionField
