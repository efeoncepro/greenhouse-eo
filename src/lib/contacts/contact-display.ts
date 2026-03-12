type ContactIdentityInput = {
  hubspotContactId?: string | null
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
}

const SHARED_MAILBOX_LABELS = new Map<string, string>([
  ['admin', 'Admin'],
  ['billing', 'Billing'],
  ['compras', 'Compras'],
  ['contact', 'Contact'],
  ['finance', 'Finance'],
  ['facturacion', 'Facturacion'],
  ['hr', 'HR'],
  ['info', 'Info'],
  ['legal', 'Legal'],
  ['marketing', 'Marketing'],
  ['operations', 'Operations'],
  ['ops', 'Ops'],
  ['payments', 'Payments'],
  ['people', 'People'],
  ['procurement', 'Procurement'],
  ['rrhh', 'RRHH'],
  ['sales', 'Sales'],
  ['soporte', 'Soporte'],
  ['support', 'Support']
])

const normalizeWhitespace = (value: string | null | undefined) => value?.trim().replace(/\s+/g, ' ') || ''

const toTitleToken = (value: string) => {
  if (!value) {
    return ''
  }

  if (/^[A-Z0-9]{2,}$/.test(value)) {
    return value
  }

  const lowerValue = value.toLowerCase()

  return `${lowerValue.charAt(0).toUpperCase()}${lowerValue.slice(1)}`
}

const buildNameFromEmail = (email: string | null | undefined) => {
  const normalizedEmail = normalizeWhitespace(email).toLowerCase()

  if (!normalizedEmail.includes('@')) {
    return ''
  }

  const [localPart] = normalizedEmail.split('@')
  const cleanedLocalPart = localPart.replace(/\+.*/, '')
  const mailboxLabel = SHARED_MAILBOX_LABELS.get(cleanedLocalPart)

  if (mailboxLabel) {
    return mailboxLabel
  }

  const tokens = cleanedLocalPart
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean)

  if (tokens.length === 1 && SHARED_MAILBOX_LABELS.has(tokens[0])) {
    return SHARED_MAILBOX_LABELS.get(tokens[0]) || ''
  }

  return tokens.map(toTitleToken).join(' ')
}

export const resolveContactDisplayName = ({
  hubspotContactId,
  email,
  firstName,
  lastName,
  displayName
}: ContactIdentityInput) => {
  const normalizedDisplayName = normalizeWhitespace(displayName)
  const normalizedEmail = normalizeWhitespace(email)

  if (normalizedDisplayName && normalizedDisplayName.toLowerCase() !== normalizedEmail.toLowerCase()) {
    return normalizedDisplayName
  }

  const normalizedFirstName = normalizeWhitespace(firstName)
  const normalizedLastName = normalizeWhitespace(lastName)
  const composedName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ')

  if (composedName) {
    return composedName
  }

  const emailDerivedName = buildNameFromEmail(normalizedEmail)

  if (emailDerivedName) {
    return emailDerivedName
  }

  return hubspotContactId ? `HubSpot Contact ${hubspotContactId}` : 'HubSpot Contact'
}
