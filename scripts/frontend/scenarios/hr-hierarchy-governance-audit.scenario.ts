/**
 * Captura visual de /hr/hierarchy — vista de gobernanza de jerarquía HR.
 *
 * Cubre las regiones operativas principales:
 *  - Header + CTA "Cambiar supervisor"
 *  - Card "Gobernanza de jerarquía" (Política vigente + Último análisis)
 *  - Status chips counters (Pendientes/Aprobadas/Rechazadas/Descartadas/Autoaplicadas)
 *  - Tabla "Propuestas de gobernanza" con acciones Aprobar/Rechazar/Descartar
 *  - 4 stat cards bottom (Miembros / Raíces / Subárbol / Delegaciones)
 */

import type { CaptureScenario } from '../lib/scenario'

export const scenario: CaptureScenario = {
  name: 'hr-hierarchy-governance-audit',
  route: '/hr/hierarchy',
  viewport: { width: 1440, height: 900 },
  initialHoldMs: 2500,
  finalHoldMs: 600,
  steps: [
    { kind: 'wait', selector: 'h4', timeout: 8000 },
    { kind: 'mark', label: 'initial-loaded', note: 'Estado inicial de la vista de gobernanza HR' },

    { kind: 'hover', selector: 'button:has-text("Cambiar supervisor")' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'cta-primary-hover', note: 'Hover sobre CTA primary "Cambiar supervisor"' },

    { kind: 'hover', selector: 'button:has-text("Ejecutar revisión")' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'cta-secondary-hover', note: 'Hover sobre CTA secundario "Ejecutar revisión"' },

    { kind: 'scroll', scrollY: 400 },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'scrolled-to-proposals', note: 'Scrolled para ver tabla de propuestas de gobernanza' },

    { kind: 'hover', selector: 'button:has-text("Aprobar")' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'approve-button-hover', note: 'Hover sobre botón Aprobar (acción positiva)' },

    { kind: 'hover', selector: 'button:has-text("Rechazar")' },
    { kind: 'sleep', ms: 250 },
    { kind: 'mark', label: 'reject-button-hover', note: 'Hover sobre botón Rechazar (acción negativa)' },

    { kind: 'scroll', scrollY: 600 },
    { kind: 'sleep', ms: 500 },
    { kind: 'mark', label: 'scrolled-to-stat-cards', note: '4 stat cards bottom: Miembros / Raíces / Subárbol / Delegaciones' }
  ]
}
