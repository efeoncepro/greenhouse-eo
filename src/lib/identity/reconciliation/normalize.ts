import 'server-only'

/**
 * Normalize a string for identity matching: lowercase, strip diacritics,
 * collapse whitespace, remove special chars except @._-
 *
 * Same logic as team-queries.ts normalizeMatchValue — extracted here for reuse.
 */
export const normalizeMatchValue = (value: string | null | undefined): string =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\|/g, ' ')
    .replace(/[^a-z0-9@._\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Strip known org suffixes like " | Efeonce" */
export const stripOrgSuffix = (name: string): string =>
  name.replace(/\s*\|\s*(efeonce|efeonce group)\s*$/i, '').trim()

/** True when the "display name" is actually just the UUID echoed back (Notion bots, guests) */
export const isUuidAsName = (name: string | null): boolean =>
  !name || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name.trim())

/** Simple Levenshtein distance for short strings (team member names) */
export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length

  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
    }
  }

  return matrix[b.length][a.length]
}
