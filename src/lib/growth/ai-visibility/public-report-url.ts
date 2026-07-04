const PUBLIC_GRADER_HUB_URL_DEFAULT = 'https://think.efeoncepro.com'
const PUBLIC_REPORT_PATH_PREFIX = '/brand-visibility/r'
const PUBLIC_REPORT_SHORT_PATH_PREFIX = '/s'

/** Host del hub headless (`efeonce-think`), sin trailing slash. Fuente única para ambos builders. */
const resolveHubBase = (): string =>
  (process.env.PUBLIC_GRADER_HUB_URL?.trim() || PUBLIC_GRADER_HUB_URL_DEFAULT).replace(/\/+$/, '')

/** URL pública LARGA del reporte a partir del token (hub headless `efeonce-think`). */
export const buildPublicReportUrl = (reportToken: string): string =>
  `${resolveHubBase()}${PUBLIC_REPORT_PATH_PREFIX}/${reportToken}`

/**
 * URL pública CORTA del reporte a partir del short code (TASK-1330). Mismo host que el largo; el hub
 * resuelve `/s/<code>` server-side y renderiza in-place (la URL corta se conserva en el address bar).
 */
export const buildPublicReportShortUrl = (shortCode: string): string =>
  `${resolveHubBase()}${PUBLIC_REPORT_SHORT_PATH_PREFIX}/${shortCode}`
