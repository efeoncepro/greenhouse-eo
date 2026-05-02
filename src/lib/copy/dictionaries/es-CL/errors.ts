/**
 * TASK-265 — Microcopy es-CL: errors
 *
 * Mensajes de error genéricos shared. Estructura de 3 partes (skill
 * greenhouse-ux-writing §6): qué pasó + por qué + cómo arreglarlo.
 *
 * Errores de dominio NO van acá — viven en helpers del dominio o
 * en greenhouse-nomenclature.ts si tienen vocación nomenclatural.
 */

import type { ErrorsCopy } from '../../types'

export const errors: ErrorsCopy = {
  generic: 'Algo no salió como esperábamos. Reintenta en unos segundos.',
  networkOffline: 'Sin conexión. Verifica tu red e intenta nuevamente.',
  networkTimeout: 'La operación tardó más de lo esperado. Reintenta.',
  unauthorized: 'No tienes acceso a esta sección. Contacta a tu administrador.',
  forbidden: 'No tienes permisos para esta acción.',
  notFound: 'No encontramos lo que buscabas.',
  serverError: 'Error en el servidor. Reintenta o contacta a soporte.',
  validationFailed: 'Hay datos que necesitan corrección antes de continuar.',
  requiredField: 'Este campo es obligatorio',
  invalidFormat: 'El formato no es válido',
  tryAgain: 'Reintentar',
  contactSupport: 'Contactar a soporte'
}
