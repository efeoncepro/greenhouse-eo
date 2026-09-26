/**
 * Clasificación de un fallo de render → código canónico (compartido por todos los consumers).
 *
 * La distinción que importa es si REINTENTAR puede cambiar el resultado. Un rechazo del CONTRATO del
 * catálogo —slots que la plantilla no declara, un contentType que el catálogo ya no tiene, una
 * plantilla distinta de la que el selector elige, un validador semántico— se repite idéntico en cada
 * reintento del mismo manifest: es `semantic_rejected` (no reintentable). Caso que lo destapó
 * (TASK-1889): una salida sellada con el input de las plantillas v1, reintentada después de que el
 * catálogo las reemplazó. Caía en `render_error` y se reencolaba para volver a fallar igual. Lo que
 * corresponde es pedir un render NUEVO de la edición, que vuelve a mapear el plan congelado.
 */

import {
  CatalogSemanticError,
  DeckValidationError,
  TemplateAuthorityError,
  UnknownContentTypeError
} from '@/lib/artifact-composer'
import { SlideQualityError } from '@/lib/artifact-composer/quality-gates'
import { SlideGeometryError, SlotFillError } from '@/lib/artifact-composer/render'

export const classifyFailure = (error: unknown): { code: string; detail: string } => {
  if (error instanceof SlideQualityError) {
    return { code: error.code, detail: error.message }
  }

  if (error instanceof SlideGeometryError) {
    return { code: 'geometry_rejected', detail: error.message }
  }

  if (error instanceof SlotFillError) {
    // 1ª bug class (copy del prototipo): el filler aborta — no es reintentable con el mismo plan.
    return { code: 'semantic_rejected', detail: error.message }
  }

  if (
    error instanceof DeckValidationError ||
    error instanceof UnknownContentTypeError ||
    error instanceof TemplateAuthorityError ||
    error instanceof CatalogSemanticError
  ) {
    return { code: 'semantic_rejected', detail: error.message }
  }

  // Un logo que no pertenece a la organización (o no es una imagen incrustable) no cambia al reintentar.
  if (error instanceof Error && error.message === 'organization_logo_not_renderable') {
    return { code: 'semantic_rejected', detail: 'El logo sellado en la portada no es un logo incrustable de la organización.' }
  }

  return { code: 'render_error', detail: error instanceof Error ? error.message : String(error) }
}
