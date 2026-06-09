import type { CaptureScenario } from '../lib/scenario'

// TASK-1045 — Motion Lab visual reference. Walks the page top→bottom marking each
// section (tokens, variant demos, reduced-motion) so the GVC dossier shows the
// whole museum, not just the above-the-fold header.
export const scenario: CaptureScenario = {
  name: 'design-system-motion',
  route: '/admin/design-system/motion',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 2000,
  finalHoldMs: 400,
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 10000 },
    { kind: 'mark', label: 'header-tokens' },
    { kind: 'scroll', scrollY: 780 },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'variants-entrance-stagger' },
    { kind: 'scroll', scrollY: 820 },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'variants-timeline-scroll' },
    { kind: 'scroll', scrollTo: 'bottom' },
    { kind: 'sleep', ms: 700 },
    { kind: 'mark', label: 'reduced-motion' }
  ]
}
