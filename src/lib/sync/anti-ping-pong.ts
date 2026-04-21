import 'server-only'

const toTimestampMs = (value: string | Date | null | undefined): number | null => {
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  const parsed = Date.parse(value)

  return Number.isFinite(parsed) ? parsed : null
}

const wasWrittenRecently = (
  value: string | Date | null | undefined,
  windowSeconds: number,
  nowMs = Date.now()
) => {
  const ts = toTimestampMs(value)

  if (ts === null) return false

  return nowMs - ts < windowSeconds * 1000
}

export const wasWrittenByGreenhouseRecently = (
  ghLastWriteAt: string | Date | null | undefined,
  windowSeconds = 60,
  nowMs = Date.now()
) => wasWrittenRecently(ghLastWriteAt, windowSeconds, nowMs)

export const wasWrittenByHubSpotRecently = (
  hubspotWriteAt: string | Date | null | undefined,
  windowSeconds = 60,
  nowMs = Date.now()
) => wasWrittenRecently(hubspotWriteAt, windowSeconds, nowMs)

