import type { Page } from 'playwright'

import { FINDING_CODES } from './failure-taxonomy'
import type { CaptureFinding } from './manifest'
import type { CaptureAssetQualityOptions } from './scenario'

export type AssetResourceType = 'stylesheet' | 'image' | 'font'

export interface AssetMimeMismatch {
  url: string
  status: number
  resourceType: AssetResourceType
  contentType: string
  expected: string
}

export interface AssetResponseLike {
  status(): number
  url(): string
  headers(): Record<string, string>
  request(): { resourceType(): string }
}

interface BrokenImageProbe {
  url: string
  alt: string
  complete: boolean
  naturalWidth: number
  naturalHeight: number
  decodeError?: string
}

const ASSET_RESOURCE_TYPES = new Set<AssetResourceType>(['stylesheet', 'image', 'font'])

const FONT_MIME_TYPES = new Set([
  'application/font-woff',
  'application/font-woff2',
  'application/octet-stream',
  'application/vnd.ms-fontobject',
  'application/x-font-opentype',
  'application/x-font-ttf',
  'application/x-font-woff',
  'application/x-font-woff2'
])

const normalizeContentType = (raw: string | undefined): string =>
  (raw ?? '').split(';', 1)[0]?.trim().toLowerCase() ?? ''

const isHttpUrl = (raw: string): boolean => {
  try {
    const protocol = new URL(raw).protocol

    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const sanitizeAssetUrl = (raw: string): string => {
  try {
    const url = new URL(raw)

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      url.search = ''
      url.hash = ''
    }

    return url.toString()
  } catch {
    return raw
  }
}

const expectedMime = (resourceType: AssetResourceType): string => {
  if (resourceType === 'stylesheet') return 'text/css'
  if (resourceType === 'image') return 'image/*'

  return 'font/* (o MIME font legacy compatible)'
}

const mimeMatches = (resourceType: AssetResourceType, contentType: string): boolean => {
  if (resourceType === 'stylesheet') return contentType === 'text/css'
  if (resourceType === 'image') return contentType.startsWith('image/')

  return contentType.startsWith('font/') || FONT_MIME_TYPES.has(contentType)
}

/**
 * Clasifica responses de assets 2xx cuyo MIME no corresponde al tipo de
 * recurso que el navegador pidió. El caso crítico es un fallback HTML 200
 * para una ruta inexistente de CSS/SVG/font.
 */
export const inspectAssetResponse = (response: AssetResponseLike): AssetMimeMismatch | undefined => {
  const status = response.status()
  const url = response.url()
  const resourceType = response.request().resourceType() as AssetResourceType

  if (status < 200 || status >= 300 || !ASSET_RESOURCE_TYPES.has(resourceType) || !isHttpUrl(url)) {
    return undefined
  }

  const headers = response.headers()
  const contentType = normalizeContentType(headers['content-type'] ?? headers['Content-Type'])

  if (mimeMatches(resourceType, contentType)) return undefined

  return {
    url: sanitizeAssetUrl(url),
    status,
    resourceType,
    contentType: contentType || '(ausente)',
    expected: expectedMime(resourceType)
  }
}

const matchesAny = (value: string, patterns: string[]): boolean =>
  patterns.some(pattern => {
    try {
      return new RegExp(pattern).test(value)
    } catch {
      return value.includes(pattern)
    }
  })

export const deriveAssetResponseFindings = (
  mismatches: AssetMimeMismatch[],
  options: CaptureAssetQualityOptions | undefined
): CaptureFinding[] => {
  if (!options?.enabled) return []

  const ignored = options.ignoreUrlPatterns ?? []

  return mismatches
    .filter(issue => !matchesAny(issue.url, ignored))
    .map(issue => ({
      severity: options.failOnViolations === false ? 'warning' : 'error',
      category: 'asset_integrity',
      code: FINDING_CODES.asset_mime_mismatch,
      message: `${issue.resourceType} devolvió ${issue.status} ${issue.contentType}; se esperaba ${issue.expected}: ${issue.url}`
    }))
}

/**
 * Valida todos los <img> presentes en el frame. `decode()` distingue una
 * descarga decodificable de un fallback/archivo corrupto; naturalWidth/Height
 * impide que un decode sin superficie visual pase el gate. Data URLs se
 * excluyen: no cruzan el boundary HTTP auditado y son comunes en placeholders
 * internos de librerías.
 */
export const analyzeImageIntegrity = async (
  page: Page,
  frameLabel: string,
  options: CaptureAssetQualityOptions
): Promise<CaptureFinding[]> => {
  if (!options.enabled) return []

  const decodeTimeoutMs = Math.max(100, options.decodeTimeoutMs ?? 1500)

  let probes: BrokenImageProbe[]

  try {
    probes = await page.evaluate(async ({ timeoutMs }) => {
      const candidates = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
      const broken: BrokenImageProbe[] = []

      for (const image of candidates) {
        const url = image.currentSrc || image.src || image.getAttribute('src') || ''

        if (!url || url.startsWith('data:')) continue
        if (image.naturalWidth > 0 && image.naturalHeight > 0) continue

        let decodeError: string | undefined

        if (typeof image.decode === 'function') {
          try {
            await Promise.race([
              image.decode(),
              new Promise<never>((_, reject) => {
                window.setTimeout(() => reject(new Error('__gvc_decode_timeout__')), timeoutMs)
              })
            ])
          } catch (error) {
            decodeError = error instanceof Error ? error.message : String(error)
          }
        }

        if (image.naturalWidth > 0 && image.naturalHeight > 0) continue

        // Una imagen lazy todavía pendiente no es evidencia suficiente de
        // rotura. Un decode rechazado (no timeout) o complete+0 sí lo es.
        if (decodeError === '__gvc_decode_timeout__') continue
        if (!image.complete && !decodeError) continue

        broken.push({
          url,
          alt: image.alt,
          complete: image.complete,
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          decodeError
        })
      }

      return broken
    }, { timeoutMs: decodeTimeoutMs })
  } catch (error) {
    return [{
      severity: options.failOnViolations === false ? 'warning' : 'error',
      category: 'asset_integrity',
      code: FINDING_CODES.asset_image_probe_failed,
      message: `No se pudo ejecutar el probe de imágenes en "${frameLabel}": ${error instanceof Error ? error.message : String(error)}`,
      frameLabel
    }]
  }

  const ignored = options.ignoreUrlPatterns ?? []
  const sanitizedProbes = probes.map(probe => ({ ...probe, url: sanitizeAssetUrl(probe.url) }))
  const unique = new Map(sanitizedProbes.map(probe => [probe.url, probe]))

  return [...unique.values()]
    .filter(probe => !probe.url.startsWith('data:'))
    .filter(probe => !matchesAny(probe.url, ignored))
    .map(probe => ({
      severity: options.failOnViolations === false ? 'warning' : 'error',
      category: 'asset_integrity',
      code: FINDING_CODES.asset_image_broken,
      message: `Imagen no decodificable o sin dimensiones naturales en "${frameLabel}" (${probe.naturalWidth}×${probe.naturalHeight}, complete=${probe.complete})${probe.alt ? ` alt="${probe.alt}"` : ''}: ${probe.url}`,
      frameLabel,
      selector: `img[src]`
    }))
}
