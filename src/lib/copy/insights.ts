/**
 * Copy canónico de Efeonce Insights (TASK-1847).
 *
 * Nace para cerrar un drift medido: `MODULE_TITLES` estaba duplicado con valores DISTINTOS entre el
 * planner —que sella el plan de la edición— y el mapper de render —que produce el documento—. No
 * diferían en forma sino en contenido: el plan decía «Visibilidad en motores de respuesta» y el
 * documento renderizado decía «Respuesta de IA». Un plan sellado y su render contradiciéndose es
 * justo lo que una edición inmutable existe para impedir.
 *
 * El diagnóstico importa: NO eran dos copias del mismo dato. Eran dos necesidades distintas que
 * nadie modeló —el título de un capítulo en un documento largo y la etiqueta corta de una lámina—
 * y cada consumer resolvió la suya por su cuenta. Por eso el SSOT declara los dos campos en vez de
 * elegir un texto ganador.
 *
 * Sin jerga interna en material que lee un cliente: las siglas SEO/AEO/ICO se omiten del texto
 * visible. «Motores de respuesta» se explica solo; «(ICO)» no le dice nada a quien recibe el
 * informe.
 */

import type { InsightModule } from '@/lib/efeonce-insights/contracts/request'

export interface InsightModuleCopy {
  /** Título de capítulo, para documento largo donde hay aire. */
  readonly title: string
  /** Etiqueta corta, para lámina y marginalia. */
  readonly label: string
}

export const GH_INSIGHTS = {
  modules: {
    seo: { title: 'Visibilidad orgánica', label: 'Visibilidad orgánica' },
    aeo: { title: 'Visibilidad en motores de respuesta', label: 'Motores de respuesta' },
    ico: { title: 'Entrega y cumplimiento', label: 'Entrega' }
  } satisfies Record<InsightModule, InsightModuleCopy>,

  /**
   * Por qué una métrica no entró. Se muestran como límites de la edición.
   *
   * Se redactan como hecho, nunca como disculpa ni como error del lector: el límite es información
   * del informe, no una falla que reportar.
   */
  rejections: {
    unsupported_window: 'la fuente no sirve esta ventana con exactitud',
    method_mismatch: 'la metodología disponible no es comparable',
    insufficient_data: 'no hay datos suficientes',
    suppressed: 'la métrica está suprimida por su política de evidencia',
    review_required: 'el análisis requiere revisión humana',
    module_disabled: 'el módulo está apagado',
    not_connected: 'la fuente no está conectada',
    target_ambiguous: 'hay más de un mercado activo',
    no_data: 'sin datos'
  },

  /** Piezas fijas del documento. */
  document: {
    limitsTitle: 'Lo que esta edición no puede afirmar',
    limitsAndMethod: 'Límites y metodología',
    evidenceAbsent: 'Ausente',
    unitLabel: 'Unidad',
    sourceLabel: 'Fuente',
    coverageLabel: 'Cobertura'
  }
} as const
