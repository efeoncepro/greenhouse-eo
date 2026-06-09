/**
 * Performance + resource budgets (TASK-1018 Slice 6).
 *
 * Snapshot liviano via browser APIs (Resource Timing + Paint Timing + DOM count)
 * — sin instalar Lighthouse/LHCI. Budgets por scenario, warning-first.
 */

import type { Page } from 'playwright'

import { FINDING_CODES } from './failure-taxonomy'
import type { CaptureFinding, PerformanceSummary } from './manifest'
import type { CapturePerformanceQualityOptions } from './scenario'

/** Toma un snapshot de performance al cierre de la captura. Siempre barato. */
export const collectPerformanceSnapshot = async (page: Page): Promise<PerformanceSummary | undefined> => {
  try {
    return await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      const paints = performance.getEntriesByType('paint')
      const fcp = paints.find(p => p.name === 'first-contentful-paint')?.startTime
      const transfer = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0)
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory

      return {
        domNodes: document.querySelectorAll('*').length,
        requestCount: resources.length,
        transferBytes: Math.round(transfer),
        fcpMs: fcp ? Math.round(fcp) : undefined,
        domContentLoadedMs: nav ? Math.round(nav.domContentLoadedEventEnd) : undefined,
        jsHeapBytes: mem ? Math.round(mem.usedJSHeapSize) : undefined
      }
    })
  } catch {
    return undefined
  }
}

const formatBytes = (bytes: number): string => `${(bytes / 1024).toFixed(0)} KB`

/** Deriva findings de budget. Sólo cuando el scenario declara quality.performance.enabled. */
export const derivePerformanceFindings = (
  summary: PerformanceSummary | undefined,
  options: CapturePerformanceQualityOptions | undefined
): CaptureFinding[] => {
  if (!options?.enabled) return []

  if (!summary) {
    return [
      {
        severity: 'warning',
        category: 'performance',
        code: FINDING_CODES.perf_probe_failed,
        message: 'No se pudo tomar el snapshot de performance.'
      }
    ]
  }

  const severity: CaptureFinding['severity'] = options.severity === 'error' ? 'error' : 'warning'
  const findings: CaptureFinding[] = []

  if (options.maxDomNodes !== undefined && summary.domNodes > options.maxDomNodes) {
    findings.push({
      severity,
      category: 'performance',
      code: FINDING_CODES.perf_dom_nodes_exceeded,
      message: `DOM nodes ${summary.domNodes} > budget ${options.maxDomNodes}.`
    })
  }

  if (options.maxRequests !== undefined && summary.requestCount > options.maxRequests) {
    findings.push({
      severity,
      category: 'performance',
      code: FINDING_CODES.perf_requests_exceeded,
      message: `Requests ${summary.requestCount} > budget ${options.maxRequests}.`
    })
  }

  if (options.maxTransferBytes !== undefined && summary.transferBytes > options.maxTransferBytes) {
    findings.push({
      severity,
      category: 'performance',
      code: FINDING_CODES.perf_transfer_exceeded,
      message: `Transferencia ${formatBytes(summary.transferBytes)} > budget ${formatBytes(options.maxTransferBytes)}.`
    })
  }

  if (options.maxFcpMs !== undefined && summary.fcpMs !== undefined && summary.fcpMs > options.maxFcpMs) {
    findings.push({
      severity,
      category: 'performance',
      code: FINDING_CODES.perf_fcp_exceeded,
      message: `FCP ${summary.fcpMs}ms > budget ${options.maxFcpMs}ms.`
    })
  }

  return findings
}
