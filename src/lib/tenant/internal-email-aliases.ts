const INTERNAL_EFEONCE_DOMAINS = ['efeonce.org', 'efeoncepro.com'] as const

const normalizeAscii = (value: string | null | undefined) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const normalizeEmail = (value: string | null | undefined) => normalizeAscii(value)

const tokenizeIdentity = (value: string | null | undefined) =>
  normalizeAscii(value)
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map(token => token.trim())
    .filter(Boolean)

const addEmailCandidate = (candidates: Set<string>, localPart: string, domain: (typeof INTERNAL_EFEONCE_DOMAINS)[number]) => {
  const normalizedLocalPart = normalizeAscii(localPart).replace(/[^a-z0-9.]+/g, '')

  if (!normalizedLocalPart) {
    return
  }

  candidates.add(`${normalizedLocalPart}@${domain}`)
}

const addNameDerivedCandidates = (candidates: Set<string>, firstName: string, surnameTokens: string[]) => {
  if (!firstName || surnameTokens.length === 0) {
    return
  }

  const normalizedFirstName = normalizeAscii(firstName).replace(/[^a-z0-9]+/g, '')

  const normalizedSurnames = surnameTokens
    .map(token => normalizeAscii(token).replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean)

  if (!normalizedFirstName || normalizedSurnames.length === 0) {
    return
  }

  const primarySurname = normalizedSurnames[0]
  const combinedSurnames = normalizedSurnames.join('')
  const firstInitial = normalizedFirstName.slice(0, 1)

  addEmailCandidate(candidates, `${normalizedFirstName}.${primarySurname}`, 'efeonce.org')
  addEmailCandidate(candidates, `${firstInitial}${primarySurname}`, 'efeoncepro.com')

  if (combinedSurnames !== primarySurname) {
    addEmailCandidate(candidates, `${normalizedFirstName}.${combinedSurnames}`, 'efeonce.org')
    addEmailCandidate(candidates, `${firstInitial}${combinedSurnames}`, 'efeoncepro.com')
  }
}

const getEmailParts = (email: string | null | undefined) => {
  const normalizedEmail = normalizeEmail(email)
  const [localPart = '', domain = ''] = normalizedEmail.split('@')

  return {
    normalizedEmail,
    localPart,
    domain
  }
}

export const isInternalEfeonceEmail = (email: string | null | undefined) => {
  const { domain } = getEmailParts(email)

  return INTERNAL_EFEONCE_DOMAINS.includes(domain as (typeof INTERNAL_EFEONCE_DOMAINS)[number])
}

export const buildEfeonceEmailAliasCandidates = ({
  email,
  fullName,
  microsoftEmail
}: {
  email?: string | null
  fullName?: string | null
  microsoftEmail?: string | null
}) => {
  const candidates = new Set<string>()

  const addExistingEmail = (value: string | null | undefined) => {
    const { normalizedEmail } = getEmailParts(value)

    if (normalizedEmail && isInternalEfeonceEmail(normalizedEmail)) {
      candidates.add(normalizedEmail)
    }
  }

  addExistingEmail(email)
  addExistingEmail(microsoftEmail)

  const { localPart, domain } = getEmailParts(email)

  if (domain === 'efeonce.org') {
    const localTokens = localPart.split('.').filter(Boolean)

    if (localTokens.length >= 2) {
      addNameDerivedCandidates(candidates, localTokens[0], localTokens.slice(1))
    }
  }

  const nameTokens = tokenizeIdentity(fullName)

  if (nameTokens.length >= 2) {
    addNameDerivedCandidates(candidates, nameTokens[0], nameTokens.slice(1))
  }

  return Array.from(candidates)
}

export const isLikelyEfeonceProfileMatch = ({
  candidateFullName,
  displayName,
  givenName,
  familyName
}: {
  candidateFullName?: string | null
  displayName?: string | null
  givenName?: string | null
  familyName?: string | null
}) => {
  const candidateTokens = tokenizeIdentity(candidateFullName)

  if (candidateTokens.length === 0) {
    return true
  }

  const profileTokens = new Set([
    ...tokenizeIdentity(displayName),
    ...tokenizeIdentity(givenName),
    ...tokenizeIdentity(familyName)
  ])

  if (profileTokens.size === 0) {
    return true
  }

  const firstCandidateToken = candidateTokens[0]
  const lastCandidateToken = candidateTokens[candidateTokens.length - 1]

  return profileTokens.has(firstCandidateToken) && profileTokens.has(lastCandidateToken)
}

export const getPreferredEfeonceMicrosoftEmail = ({
  email,
  fullName,
  microsoftEmail
}: {
  email?: string | null
  fullName?: string | null
  microsoftEmail?: string | null
}) => {
  const candidates = buildEfeonceEmailAliasCandidates({ email, fullName, microsoftEmail })

  return (
    candidates.find(candidate => candidate.endsWith('@efeoncepro.com')) ||
    candidates.find(candidate => candidate.endsWith('@efeonce.org')) ||
    null
  )
}
