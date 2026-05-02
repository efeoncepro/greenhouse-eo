/**
 * TASK-265 — Microcopy es-CL: feedback
 *
 * Toasts, snackbars, confirmaciones genéricas. Confirmar acción + resultado
 * + (si aplica) próximo paso, según skill greenhouse-ux-writing §5.2.
 */

import type { FeedbackCopy } from '../../types'

export const feedback: FeedbackCopy = {
  saved: 'Cambios guardados',
  created: 'Creado correctamente',
  updated: 'Actualizado correctamente',
  deleted: 'Eliminado correctamente',
  copied: 'Copiado al portapapeles',
  changesDiscarded: 'Cambios descartados',
  unsavedChanges: 'Tienes cambios sin guardar',
  confirmDelete: '¿Confirmas que quieres eliminar este elemento?',
  confirmDeleteIrreversible: 'Esta acción no se puede deshacer. ¿Continuar?',
  operationSuccess: 'Operación completada',
  operationFailed: 'No pudimos completar la operación'
}
