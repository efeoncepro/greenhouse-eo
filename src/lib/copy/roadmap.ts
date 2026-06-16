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
    'Prioriza el backlog operativo completo —epics, tasks, mini-tasks e incidentes— sin abandonar los Markdown que usan los agentes. Esta superficie lee el índice; no edita tasks.',
  breadcrumbRoot: 'Greenhouse',
  breadcrumbCurrent: 'Roadmap',

  // ── Header de sincronización ──
  syncedLabel: (ageLabel: string) => `Sincronizado ${ageLabel}`,
  syncedNow: 'recién',
  refreshCta: 'Actualizar índice',
  refreshAria: 'Actualizar el índice del backlog',

  // ── Banner degradado ──
  degradedTitle: (count: number) =>
    count === 1 ? '1 work item con metadata incompleta' : `${count} work items con metadata incompleta`,
  degradedBody:
    'Les falta el bloque «## Status» o la forma canónica del template; se muestran en «Necesitan grooming» con sus warnings. El resto del backlog se lee bien — revisa el front-matter para completarlos.',

  // ── KPI tiles (summary band) ──
  tiles: {
    total: { label: 'Work items', context: 'en el backlog' },
    programs: { label: 'Epics activos', context: 'programas' },
    ready: { label: 'Listas para ejecutar', context: 'sin bloqueos' },
    blocked: { label: 'Bloqueadas', context: 'esperan dependencia' },
    issues: { label: 'Incidentes abiertos', context: 'deuda runtime' },
    grooming: { label: 'Necesitan grooming', context: 'warnings de parseo' },
    progress: { label: 'En progreso', context: 'activas ahora' }
  },

  // ── Filtros ──
  filtersAria: 'Filtros del backlog',
  searchPlaceholder: 'Buscar por ID o título…',
  searchAria: 'Buscar work items por ID o título',
  clearFilters: 'Limpiar',
  clearFiltersAria: 'Limpiar todos los filtros',
  kindTabs: {
    all: 'Todos',
    epic: 'Epics',
    task: 'Tasks',
    mini_task: 'Mini-tasks',
    issue: 'Issues'
  } satisfies Record<'all' | WorkItemKind, string>,
  priorityFilterAll: 'Prioridad · todas',
  priorityOptions: [
    { value: 'P0', label: 'P0 · crítica' },
    { value: 'P1', label: 'P1 · alta' },
    { value: 'P2', label: 'P2 · media' },
    { value: 'P3', label: 'P3 · baja' }
  ] as const,
  domainFilterAll: 'Dominio · todos',
  healthFilterAll: 'Salud · toda',
  healthOptions: [
    { value: 'ok', label: 'Saludable' },
    { value: 'needs_grooming', label: 'Necesita atención' },
    { value: 'legacy', label: 'Legacy' }
  ] satisfies { value: WorkItemHealthLevel; label: string }[],

  // ── Board / lanes ──
  boardAria: 'Tablero del backlog por estado',
  lanes: {
    programs: { title: 'Programas' },
    ready: { title: 'Listas para ejecutar' },
    blocked: { title: 'Bloqueadas' },
    issues: { title: 'Incidentes abiertos' },
    grooming: { title: 'Necesitan grooming' },
    progress: { title: 'En progreso' },
    done: { title: 'Resueltas hace poco' }
  } satisfies Record<RoadmapLaneId, { title: string }>,
  laneEmpty: 'Sin items',
  laneMore: (count: number) => (count === 1 ? '+1 más — filtra para acotar' : `+${count} más — filtra para acotar`),

  // ── Estados del board ──
  noResultsTitle: 'No hay work items con estos filtros',
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
    openMarkdown: 'Abrir Markdown',
    blockedNote: (blockerId: string) => `Disponible cuando se desbloquee ${blockerId}`
  },
  inspectorEmptyTitle: 'Selecciona un work item',
  inspectorEmptyBody: 'Abre cualquier card del tablero para ver su detalle, dependencias y acciones seguras.',

  // ── Comando ──
  implementTaskCommand: (taskId: string) => `/implement-task ${taskId}`,

  // ── Toast ──
  copiedToast: 'Copiado al portapapeles',

  // ── Acceso denegado / error ──
  errorTitle: 'No pudimos cargar el backlog',
  errorBody: 'Verifica tu conexión e intenta de nuevo en unos minutos.'
} as const
