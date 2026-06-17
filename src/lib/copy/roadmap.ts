/**
 * TASK-1153 — Copy canónico del cockpit de Roadmap (es-CL, tuteo, sentence case).
 *
 * Destino canónico de copy reusable de la superficie `/roadmap`. Mirror del
 * shape de `GH_RELEASE_ADMIN` / `GH_AGENCY` (regla "Copy reutilizable por dominio").
 * NO hardcodear strings visibles en el JSX del cockpit — extender acá.
 *
 * El cockpit es READ-ONLY (lee el índice de TASK-1152; no edita Markdown). El
 * tono es operativo: claro, directo, profesional. Sin emoji en UI.
 */

import type { WorkItemKind, WorkItemHealthLevel } from '@/lib/roadmap/work-item-index/types'

/** Las 7 lanes canónicas del board (orden de lectura operativa). */
export type RoadmapLaneId =
  | 'programs'
  | 'ready'
  | 'blocked'
  | 'issues'
  | 'grooming'
  | 'progress'
  | 'done'

export const GH_ROADMAP = {
  // ── Página ──
  pageTitle: 'Roadmap',
  pageSubtitle:
    'Prioriza epics, tasks, mini-tasks e incidentes desde el índice vivo del repo. Solo lectura: el Markdown sigue siendo la fuente de verdad.',
  breadcrumbRoot: 'Greenhouse',
  breadcrumbCurrent: 'Roadmap',

  // ── Header de sincronización ──
  syncedLabel: (ageLabel: string) => `Sincronizado ${ageLabel}`,
  syncedNow: 'recién',
  refreshCta: 'Actualizar índice',
  refreshAria: 'Actualizar el índice del backlog',

  // ── Banner degradado ──
  degradedTitle: (count: number) =>
    count === 1 ? '1 archivo con metadata pendiente' : `${count} archivos con metadata pendiente`,
  degradedBody:
    'Falta «## Status» o el template canónico. Los agrupamos en «Necesitan grooming»; el resto del backlog está disponible.',

  // ── KPI tiles (summary band) ──
  tiles: {
    total: { label: 'Items del backlog', context: 'índice completo' },
    programs: { label: 'Programas activos', context: 'epics abiertos' },
    ready: { label: 'Listas para ejecutar', context: 'sin bloqueos' },
    blocked: { label: 'Bloqueadas', context: 'esperan dependencia' },
    issues: { label: 'Incidentes abiertos', context: 'deuda runtime' },
    grooming: { label: 'Necesitan grooming', context: 'metadata pendiente' },
    progress: { label: 'En progreso', context: 'activas ahora' }
  },

  // ── Filtros ──
  filtersAria: 'Filtros del backlog',
  searchPlaceholder: 'Buscar por ID o título…',
  searchAria: 'Buscar items por ID o título',
  clearFilters: 'Limpiar',
  clearFiltersAria: 'Limpiar todos los filtros',
  kindTabs: {
    all: 'Todos',
    epic: 'Epics',
    task: 'Tasks',
    mini_task: 'Mini-tasks',
    issue: 'Issues'
  } satisfies Record<'all' | WorkItemKind, string>,
  priorityFilterAll: 'Prioridad',
  priorityOptions: [
    { value: 'P0', label: 'P0 · crítica' },
    { value: 'P1', label: 'P1 · alta' },
    { value: 'P2', label: 'P2 · media' },
    { value: 'P3', label: 'P3 · baja' }
  ] as const,
  domainFilterAll: 'Dominio',
  healthFilterAll: 'Salud',
  healthOptions: [
    { value: 'ok', label: 'Saludable' },
    { value: 'needs_grooming', label: 'Necesita atención' },
    { value: 'legacy', label: 'Legacy' }
  ] satisfies { value: WorkItemHealthLevel; label: string }[],

  // ── Board / lanes ──
  boardAria: 'Tablero del backlog por estado',
  card: {
    open: 'Abrir',
    openAria: (id: string) => `Abrir detalle de ${id}`,
    domainFallback: 'Sin dominio',
    extraDomains: (count: number) => `+${count}`
  },
  lanes: {
    programs: { title: 'Programas' },
    ready: { title: 'Listas para ejecutar' },
    blocked: { title: 'Bloqueadas' },
    issues: { title: 'Incidentes abiertos' },
    grooming: { title: 'Necesitan grooming' },
    progress: { title: 'En progreso' },
    done: { title: 'Resueltas hace poco' }
  } satisfies Record<RoadmapLaneId, { title: string }>,
  laneEmpty: 'Sin items por ahora',
  laneMore: (count: number) => (count === 1 ? '+1 más — filtra para acotar' : `+${count} más — filtra para acotar`),

  // ── Estados del board ──
  noResultsTitle: 'No hay items con estos filtros',
  noResultsBody: 'Ajusta los filtros o limpia la búsqueda para volver a ver el backlog completo.',
  noResultsCta: 'Limpiar filtros',
  loadingLabel: 'Cargando el backlog…',

  // ── Kinds (chips) ──
  kindLabels: {
    epic: 'Epic',
    task: 'Task',
    mini_task: 'Mini-task',
    issue: 'Issue'
  } satisfies Record<WorkItemKind, string>,

  // ── Salud ──
  healthLabels: {
    ok: 'Saludable',
    needs_grooming: 'Necesita atención',
    legacy: 'Legacy'
  } satisfies Record<WorkItemHealthLevel, string>,

  // ── Inspector ──
  inspectorAria: 'Detalle del work item',
  closeInspectorAria: 'Cerrar inspector',
  inspector: {
    summary: 'Resumen',
    why: 'Por qué existe',
    symptom: 'Síntoma',
    rootCause: 'Causa raíz',
    environment: 'Entorno',
    groomingTitle: 'Necesita grooming',
    blockedBy: 'Bloqueada por',
    files: 'Archivos',
    related: 'Relacionadas',
    dependsOn: 'Depende de',
    command: 'Comando',
    copyCommand: 'Copiar comando',
    copyId: 'Copiar ID',
    openTask: 'Abrir task',
    showMore: (count: number) => `Ver ${count} más`,
    showLess: 'Mostrar menos',
    blockedNote: (blockerId: string) => `Disponible cuando se desbloquee ${blockerId}`
  },

  // ── Drawer "Abrir task" (contenido Markdown renderizado, read-only) ──
  taskDrawer: {
    aria: 'Contenido del item',
    closeAria: 'Cerrar el detalle del item',
    eyebrow: 'Contenido del Markdown',
    loadingLabel: 'Cargando el contenido…',
    errorTitle: 'No pudimos cargar el contenido',
    errorBody: 'El item puede haberse movido o renombrado. Intenta de nuevo en unos segundos.',
    retry: 'Reintentar',
    back: 'Volver',
    copyPath: 'Copiar ruta',
    copyPathAria: 'Copiar la ruta del archivo en el repo',
    copyCodeAria: 'Copiar el bloque de código',
    readOnlyNote: 'Solo lectura — el Markdown del repo es la fuente de verdad.'
  },
  inspectorEmptyTitle: 'Selecciona un item',
  inspectorEmptyBody: 'Abre cualquier tarjeta del tablero para ver detalle, dependencias y acciones seguras.',

  // ── Comando ──
  implementTaskCommand: (taskId: string) => `/implement-task ${taskId}`,

  // ── Toast ──
  copiedToast: 'Copiado al portapapeles',

  // ── Acceso denegado / error ──
  errorTitle: 'No pudimos cargar el backlog',
  errorBody: 'Verifica tu conexión e intenta de nuevo en unos minutos.'
} as const
