// Mockup data — semantic color a11y comparison (current vs proposed contrast-safe tint).
// Purpose of this mockup is to A/B explicit hex values against WCAG 2.2 AA, so hex literals
// are the content here (not theme tokens). Nothing in this file is wired to the live theme.

export type SwatchCell = {
  /** Foreground/tint hex used for status text, icons, soft-alert title. */
  tint: string
  /** WCAG contrast ratio of `tint` against the surface paper of its mode. */
  ratio: number
  /** Passes the relevant AA threshold (≥4.5:1 for text). */
  pass: boolean
  /** When the cell is unchanged vs the actual theme. */
  unchanged?: boolean
}

export type SemanticComparison = {
  key: string
  label: string
  /** Tabler icon class. */
  icon: string
  /** Where this color shows up as tint in the product. */
  usage: string
  light: { actual: SwatchCell; proposed: SwatchCell }
  dark: { actual: SwatchCell; proposed: SwatchCell }
}

/** Surface backgrounds + neutral text per mode, from mergedTheme.ts. */
export const SURFACES = {
  light: { paper: '#FFFFFF', default: '#F8F9FA', body: '#1A1A2E', muted: '#667085', border: '#E4E7EC' },
  dark: { paper: '#162033', default: '#101827', body: '#F5F7FA', muted: '#B0B9C8', border: '#2A3850' }
} as const

export const SEMANTIC_COMPARISONS: SemanticComparison[] = [
  {
    key: 'success',
    label: 'Success',
    icon: 'tabler-circle-check',
    usage: 'Activo · Aprobado · OK · deltas positivos',
    light: {
      actual: { tint: '#6EC207', ratio: 2.24, pass: false },
      proposed: { tint: '#2E7D32', ratio: 5.13, pass: true }
    },
    dark: {
      actual: { tint: '#6EC207', ratio: 7.29, pass: true },
      proposed: { tint: '#6EC207', ratio: 7.29, pass: true, unchanged: true }
    }
  },
  {
    key: 'warning',
    label: 'Warning',
    icon: 'tabler-alert-triangle',
    usage: 'Pendiente · Atención · degradado',
    light: {
      actual: { tint: '#FF6500', ratio: 2.95, pass: false },
      proposed: { tint: '#BF5000', ratio: 4.81, pass: true }
    },
    dark: {
      actual: { tint: '#FF6500', ratio: 5.52, pass: true },
      proposed: { tint: '#FF6500', ratio: 5.52, pass: true, unchanged: true }
    }
  },
  {
    key: 'error',
    label: 'Error',
    icon: 'tabler-alert-octagon',
    usage: 'Bloqueado · Falló · crítico',
    light: {
      actual: { tint: '#BB1954', ratio: 6.21, pass: true },
      proposed: { tint: '#BB1954', ratio: 6.21, pass: true, unchanged: true }
    },
    dark: {
      actual: { tint: '#BB1954', ratio: 2.62, pass: false },
      proposed: { tint: '#F06292', ratio: 5.33, pass: true }
    }
  },
  {
    key: 'info',
    label: 'Info',
    icon: 'tabler-info-circle',
    usage: 'Informativo · neutro (= primary)',
    light: {
      actual: { tint: '#0375DB', ratio: 4.59, pass: true },
      proposed: { tint: '#0375DB', ratio: 4.59, pass: true, unchanged: true }
    },
    dark: {
      actual: { tint: '#3691E3', ratio: 4.91, pass: true },
      proposed: { tint: '#3691E3', ratio: 4.91, pass: true, unchanged: true }
    }
  }
]

/** Translucent fill for soft-alert / chip backgrounds. */
export const hexToRgba = (hex: string, alpha: number): string => {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
