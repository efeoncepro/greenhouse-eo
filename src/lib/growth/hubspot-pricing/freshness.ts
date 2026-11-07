// HubSpot pricebook (TASK-1405) — freshness. A stale price page is worse than no page: the freshness test fails the
// build when `asOf` is older than this many days.
export const HUBSPOT_PRICEBOOK_MAX_AGE_DAYS = 90

/** Whole days between `asOf` and `today` (both ISO dates). Pure: the caller hands in today. */
export const pricebookAgeDays = (asOf: string, today: string): number =>
  Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${asOf}T00:00:00Z`)) / 86_400_000)
