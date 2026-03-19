import 'server-only'

import type { DiscoveredIdentity, MemberCandidate, MatchResult, MatchSignal } from './types'
import { normalizeMatchValue, stripOrgSuffix, isUuidAsName, levenshtein } from './normalize'

// ── Confidence calculation ────────────────────────────────────────────

/**
 * Combine multiple match signals into a single confidence score.
 * Max signal + diminishing returns for additional evidence.
 */
const computeConfidence = (signals: MatchSignal[]): number => {
  if (signals.length === 0) return 0

  const sorted = [...signals].sort((a, b) => b.weight - a.weight)
  let confidence = sorted[0].weight

  for (let i = 1; i < sorted.length; i++) {
    confidence += sorted[i].weight * (1 - confidence) * 0.5
  }

  return Math.min(1.0, Math.round(confidence * 100) / 100)
}

// ── Name matching helpers ─────────────────────────────────────────────

const firstToken = (name: string): string => name.split(/\s+/)[0] || ''

const getCandidateNames = (candidate: MemberCandidate): string[] => {
  const names: string[] = [candidate.displayName]

  if (candidate.notionDisplayName) names.push(candidate.notionDisplayName)

  return names.map(n => normalizeMatchValue(stripOrgSuffix(n))).filter(Boolean)
}

// ── Core matcher ──────────────────────────────────────────────────────

/**
 * Source-agnostic matching engine.
 *
 * Receives a discovered identity and all candidate members.
 * Returns the best match (or no match) with confidence scoring.
 */
export function matchIdentity(
  discovered: DiscoveredIdentity,
  candidates: MemberCandidate[]
): MatchResult {
  // UUID-as-name identities (bots, integrations) → no match
  if (isUuidAsName(discovered.sourceDisplayName)) {
    return { candidateMemberId: null, candidateProfileId: null, candidateDisplayName: null, confidence: 0, signals: [] }
  }

  const sourceName = normalizeMatchValue(stripOrgSuffix(discovered.sourceDisplayName || ''))
  const sourceEmail = discovered.sourceEmail ? normalizeMatchValue(discovered.sourceEmail) : null
  const sourceFirstToken = firstToken(sourceName)

  let bestResult: MatchResult = {
    candidateMemberId: null,
    candidateProfileId: null,
    candidateDisplayName: null,
    confidence: 0,
    signals: []
  }

  for (const candidate of candidates) {
    const signals: MatchSignal[] = []
    const candidateNames = getCandidateNames(candidate)

    // Signal: email_exact
    if (sourceEmail) {
      const emails = [candidate.email, ...candidate.emailAliases]
        .filter(Boolean)
        .map(e => normalizeMatchValue(e))

      if (emails.includes(sourceEmail)) {
        signals.push({ signal: 'email_exact', weight: 0.90, value: sourceEmail })
      }
    }

    // Signal: name_exact
    if (sourceName && candidateNames.includes(sourceName)) {
      signals.push({ signal: 'name_exact', weight: 0.70, value: sourceName })
    }

    // Signal: name_fuzzy (Levenshtein ≤ 3, only for non-trivial names)
    if (sourceName.length >= 4) {
      for (const cn of candidateNames) {
        if (cn.length >= 4 && levenshtein(sourceName, cn) <= 3 && !signals.some(s => s.signal === 'name_exact')) {
          signals.push({ signal: 'name_fuzzy', weight: 0.45, value: `${sourceName} ≈ ${cn}` })
          break
        }
      }
    }

    // Signal: name_first_token
    if (sourceFirstToken.length >= 3) {
      for (const cn of candidateNames) {
        if (firstToken(cn) === sourceFirstToken && !signals.some(s => s.signal.startsWith('name_'))) {
          signals.push({ signal: 'name_first_token', weight: 0.30, value: sourceFirstToken })
          break
        }
      }
    }

    // Signal: existing_cross_link (same identity_profile has another source linked)
    if (candidate.identityProfileId && discovered.sourceSystem === 'notion') {
      // If the candidate already has a HubSpot or Azure link, it's a strong signal
      // that this identity_profile is real and this Notion ID belongs to them
      const hasOtherLink = candidate.hubspotOwnerId || candidate.azureOid

      if (hasOtherLink && signals.length > 0) {
        signals.push({ signal: 'existing_cross_link', weight: 0.15, value: candidate.identityProfileId })
      }
    }

    const confidence = computeConfidence(signals)

    if (confidence > bestResult.confidence) {
      bestResult = {
        candidateMemberId: candidate.memberId,
        candidateProfileId: candidate.identityProfileId,
        candidateDisplayName: candidate.displayName,
        confidence,
        signals
      }
    }
  }

  return bestResult
}
