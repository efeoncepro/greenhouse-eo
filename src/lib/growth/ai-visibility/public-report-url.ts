const PUBLIC_GRADER_HUB_URL_DEFAULT = 'https://think.efeoncepro.com'
const PUBLIC_REPORT_PATH_PREFIX = '/brand-visibility/r'

/** URL pública estable del reporte a partir del token (hub headless `efeonce-think`). */
export const buildPublicReportUrl = (reportToken: string): string => {
  const base = (process.env.PUBLIC_GRADER_HUB_URL?.trim() || PUBLIC_GRADER_HUB_URL_DEFAULT).replace(/\/+$/, '')

  return `${base}${PUBLIC_REPORT_PATH_PREFIX}/${reportToken}`
}
