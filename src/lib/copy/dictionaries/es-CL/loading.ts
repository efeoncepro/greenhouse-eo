/**
 * TASK-265 — Microcopy es-CL: loading
 *
 * Loading / processing labels. Convención: gerundio + tres puntos
 * suspensivos (siempre, nunca puntos individuales). Audit 2026-05-02
 * reveló 94 instancias inline.
 */

import type { LoadingCopy } from '../../types'

export const loading: LoadingCopy = {
  loading: 'Cargando...',
  saving: 'Guardando...',
  processing: 'Procesando...',
  sending: 'Enviando...',
  uploading: 'Subiendo...',
  downloading: 'Descargando...',
  syncing: 'Sincronizando...',
  fetching: 'Obteniendo datos...',
  generating: 'Generando...',
  validating: 'Validando...',
  authenticating: 'Autenticando...',
  redirecting: 'Redireccionando...'
}
