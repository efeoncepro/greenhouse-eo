'use client'

export interface FinanceContactOption {
  name: string
  email: string
  phone: string
  role: string
}

export interface FinanceClientOptionLike {
  organizationId: string | null
}

interface OrganizationMembershipOption {
  fullName: string | null
  canonicalEmail: string | null
  membershipType: string
  roleLabel: string | null
  isPrimary: boolean
}

type FinanceContactCandidate = {
  name: string
  email: string
  phone?: unknown
  role?: unknown
}

const FINANCE_CONTACT_MEMBERSHIP_TYPES = new Set(['billing', 'contact', 'client_contact'])

export const getContactOptionLabel = (contact: FinanceContactOption) =>
  contact.name && contact.email ? `${contact.name} (${contact.email})` : contact.name || contact.email

const isFinanceContactCandidate = (contact: unknown): contact is FinanceContactCandidate => {
  if (!contact || typeof contact !== 'object') {
    return false
  }

  const candidate = contact as Record<string, unknown>

  return (
    typeof candidate.name === 'string'
    && candidate.name.trim().length > 0
    && typeof candidate.email === 'string'
    && candidate.email.trim().length > 0
  )
}

const toOrganizationContactOptions = (memberships: OrganizationMembershipOption[]) => {
  const membershipsWithEmail = memberships.filter(
    membership => typeof membership.canonicalEmail === 'string' && membership.canonicalEmail.trim().length > 0
  )

  const financeMemberships = membershipsWithEmail.filter(membership =>
    FINANCE_CONTACT_MEMBERSHIP_TYPES.has(membership.membershipType)
  )

  const sourceMemberships = financeMemberships.length > 0 ? financeMemberships : membershipsWithEmail

  return sourceMemberships
    .slice()
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return a.isPrimary ? -1 : 1
      }

      return (a.fullName || a.canonicalEmail || '').localeCompare(b.fullName || b.canonicalEmail || '', 'es')
    })
    .map(membership => ({
      name: membership.fullName?.trim() || membership.canonicalEmail?.trim() || 'Sin nombre',
      email: membership.canonicalEmail?.trim() || '',
      phone: '',
      role: membership.roleLabel?.trim() || membership.membershipType
    }))
}

export const loadFinanceClientContactOptions = async ({
  selectedClientKey,
  selectedClient
}: {
  selectedClientKey: string
  selectedClient: FinanceClientOptionLike | null
}): Promise<FinanceContactOption[]> => {
  let nextContacts: FinanceContactOption[] = []

  if (selectedClient?.organizationId) {
    const membershipsRes = await fetch(`/api/organizations/${encodeURIComponent(selectedClient.organizationId)}/memberships`, {
      cache: 'no-store'
    })

    if (membershipsRes.ok) {
      const membershipsData = await membershipsRes.json()

      const organizationMemberships = Array.isArray(membershipsData?.items)
        ? membershipsData.items as OrganizationMembershipOption[]
        : []

      nextContacts = toOrganizationContactOptions(organizationMemberships)
    }
  }

  if (nextContacts.length > 0) {
    return nextContacts
  }

  const clientRes = await fetch(`/api/finance/clients/${encodeURIComponent(selectedClientKey)}`, { cache: 'no-store' })

  if (!clientRes.ok) {
    throw new Error('client-contact-fetch-failed')
  }

  const clientData = await clientRes.json()

  const financeContacts: unknown[] = Array.isArray(clientData?.financialProfile?.financeContacts)
    ? clientData.financialProfile.financeContacts
    : []

  return financeContacts
    .filter(isFinanceContactCandidate)
    .map(contact => ({
      name: contact.name.trim(),
      email: contact.email.trim(),
      phone: typeof contact.phone === 'string' ? contact.phone.trim() : '',
      role: typeof contact.role === 'string' ? contact.role.trim() : ''
    }))
}
