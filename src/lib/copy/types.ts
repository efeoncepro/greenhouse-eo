/**
 * TASK-265 — Greenhouse Microcopy Foundation: types
 *
 * Capa dictionary-ready para microcopy funcional shared. Convive con
 * `src/config/greenhouse-nomenclature.ts` (product nomenclature + nav)
 * sin duplicarla.
 *
 * Locale-aware desde día uno (TASK-265 open question resuelta SÍ) para que
 * TASK-266 + TASK-428/429/430/431 puedan conectar locales reales sin
 * reescribir la API pública.
 *
 * Importable desde server y client (NO `import 'server-only'`). Los
 * dictionaries son data estática y se serializan correctamente al cliente.
 *
 * Spec canónica: docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md (sección Copy System)
 * Skill governance: ~/.claude/skills/greenhouse-ux-writing/skill.md
 */

/**
 * Locales soportados por la plataforma. `es-CL` es el default canónico
 * mientras Greenhouse opera como portal `es-only`. `en-US` queda como stub
 * para que TASK-266 lo active sin tocar la API pública.
 *
 * Cuando se agreguen más locales (TASK-266 / TASK-431), agregar al array y
 * crear `dictionaries/<locale>/index.ts` con paridad de namespaces.
 */
export const SUPPORTED_LOCALES = ['es-CL', 'en-US'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'es-CL'

/**
 * Namespaces canónicos del dictionary. Cada namespace agrupa microcopy
 * funcional shared que NO es nomenclatura de producto.
 *
 * Cuando agregues un namespace nuevo:
 *  1. Agregalo a este type
 *  2. Crea el archivo `dictionaries/<locale>/<namespace>.ts`
 *  3. Re-exporta en `dictionaries/<locale>/index.ts`
 *  4. Confirma paridad de claves entre todos los locales
 */
export type MicrocopyNamespace =
  | 'actions' // CTAs base: Guardar, Cancelar, Editar, Eliminar, Continuar, Volver, etc.
  | 'states' // Estados operativos: Activo, Pendiente, Aprobado, Rechazado, etc.
  | 'loading' // Loading/processing: Cargando..., Guardando..., Procesando..., etc.
  | 'empty' // Empty states: Sin datos, Sin resultados, No hay nada por aquí, etc.
  | 'months' // Meses abreviados (Ene/Feb/.../Dic) y completos (Enero/.../Diciembre)
  | 'aria' // aria-labels comunes para a11y
  | 'errors' // Mensajes de error genéricos shared
  | 'feedback' // Toasts, snackbars, confirmaciones genéricas
  | 'time' // Formatos de tiempo relativo: hace X minutos, ayer, etc.

/**
 * Estructura raíz de un dictionary completo por locale.
 * Cada namespace es type-safe y debe matchear paridad entre locales.
 */
export interface MicrocopyDictionary {
  actions: ActionsCopy
  states: StatesCopy
  loading: LoadingCopy
  empty: EmptyCopy
  months: MonthsCopy
  aria: AriaCopy
  errors: ErrorsCopy
  feedback: FeedbackCopy
  time: TimeCopy
}

/**
 * CTAs base reutilizables. Verbos en infinitivo (es-CL) o gerundio para
 * progresivos. Son los CTAs que aparecen en >3 surfaces — los específicos
 * de dominio viven inline o en helpers de dominio.
 */
export interface ActionsCopy {
  save: string
  saveAndClose: string
  cancel: string
  close: string
  edit: string
  delete: string
  remove: string
  add: string
  create: string
  confirm: string
  apply: string
  reset: string
  back: string
  next: string
  continue: string
  finish: string
  send: string
  upload: string
  download: string
  export: string
  import: string
  search: string
  filter: string
  clear: string
  select: string
  selectAll: string
  deselectAll: string
  copy: string
  paste: string
  share: string
  more: string
  less: string
  expand: string
  collapse: string
  retry: string
  refresh: string
  approve: string
  reject: string
  archive: string
  unarchive: string
  duplicate: string
  view: string
  viewMore: string
  viewLess: string
  viewAll: string
  hide: string
  show: string
}

/**
 * Estados operativos canónicos. Reemplazan el patrón de status maps
 * inline (`{ pending: { label: 'Pendiente' } }`) detectado en 100
 * instancias durante el audit 2026-05-02.
 */
export interface StatesCopy {
  active: string
  inactive: string
  pending: string
  approved: string
  rejected: string
  draft: string
  inReview: string
  completed: string
  cancelled: string
  archived: string
  scheduled: string
  paused: string
  expired: string
  blocked: string
  enabled: string
  disabled: string
  online: string
  offline: string
  available: string
  unavailable: string
  paid: string
  unpaid: string
  partial: string
  overdue: string
  failed: string
  succeeded: string
  inProgress: string
  notStarted: string
}

/**
 * Loading / processing labels. Audit reveló 94 instancias inline.
 * Convención: gerundio + tres puntos suspensivos.
 */
export interface LoadingCopy {
  loading: string
  saving: string
  processing: string
  sending: string
  uploading: string
  downloading: string
  syncing: string
  fetching: string
  generating: string
  validating: string
  authenticating: string
  redirecting: string
}

/**
 * Empty states. Audit reveló 31 instancias inline. Tres tipos canónicos
 * (firstUse, noResults, error) según skill greenhouse-ux-writing §7.
 */
export interface EmptyCopy {
  noData: string
  noResults: string
  noItems: string
  emptyList: string
  searchEmpty: string
  filterEmpty: string
  firstUseTitle: string
  firstUseHint: string
  errorLoadingTitle: string
  errorLoadingHint: string
}

/**
 * Meses. Audit reveló 26 archivos duplicando arrays de meses inline.
 * Provee abreviaciones (3 letras) y nombres completos como tuples-tipados
 * (12 entries cada uno).
 */
export interface MonthsCopy {
  short: readonly [string, string, string, string, string, string, string, string, string, string, string, string]
  long: readonly [string, string, string, string, string, string, string, string, string, string, string, string]
}

/**
 * aria-labels comunes para a11y. Audit reveló 405 instancias hardcoded —
 * el caso dominante. Cubrir los más frecuentes acá; los específicos de
 * dominio quedan inline pero pasan por skill greenhouse-ux-writing.
 */
export interface AriaCopy {
  closeDialog: string
  closeDrawer: string
  closeMenu: string
  openMenu: string
  openSettings: string
  toggleSidebar: string
  navigateBack: string
  navigateForward: string
  selectRow: string
  expandRow: string
  collapseRow: string
  sortAscending: string
  sortDescending: string
  searchInput: string
  filterInput: string
  paginationPrev: string
  paginationNext: string
  paginationFirst: string
  paginationLast: string
  previousMonth: string
  nextMonth: string
  rowActions: string
  moreActions: string
  notifications: string
  userMenu: string
  language: string
  theme: string
  paymentOrderTabs: string
  paymentObligationFilters: string
}

/**
 * Mensajes de error genéricos shared. Específicos de dominio NO van acá.
 */
export interface ErrorsCopy {
  generic: string
  networkOffline: string
  networkTimeout: string
  unauthorized: string
  forbidden: string
  notFound: string
  serverError: string
  validationFailed: string
  requiredField: string
  invalidFormat: string
  tryAgain: string
  contactSupport: string
}

/**
 * Toasts / snackbars / confirmaciones genéricas.
 */
export interface FeedbackCopy {
  saved: string
  created: string
  updated: string
  deleted: string
  copied: string
  changesDiscarded: string
  unsavedChanges: string
  confirmDelete: string
  confirmDeleteIrreversible: string
  operationSuccess: string
  operationFailed: string
}

/**
 * Formatos de tiempo relativo. Para fechas absolutas usar
 * `Intl.DateTimeFormat` con `Locale` (TASK-429 cubrirá utilities completas).
 */
export interface TimeCopy {
  justNow: string
  minutesAgo: (n: number) => string
  hoursAgo: (n: number) => string
  daysAgo: (n: number) => string
  yesterday: string
  today: string
  tomorrow: string
}

/**
 * API pública del módulo. Una función `getMicrocopy(locale)` que devuelve
 * el dictionary completo del locale (con fallback a DEFAULT_LOCALE si el
 * locale solicitado no existe).
 *
 * En esta primera fase TASK-265, solo hay implementado `es-CL` con paridad
 * type-safe con `en-US` semilla (puede traducirse en TASK-266 sin tocar
 * consumers).
 */
export type GetMicrocopy = (locale?: Locale) => MicrocopyDictionary
