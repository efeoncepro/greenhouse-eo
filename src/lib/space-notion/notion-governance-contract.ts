import type {
  CoreKpiContractField,
  NotionCoreFieldSuggestion,
  NotionDatabaseKind,
  NotionGovernanceMatchConfidence,
  NotionPropertyDefinition
} from '@/types/notion-governance'

interface MatchResult {
  confidence: NotionGovernanceMatchConfidence
  reason: string
}

export const REQUIRED_NOTION_DATABASE_KINDS: NotionDatabaseKind[] = ['proyectos', 'tareas']

export const OPTIONAL_NOTION_DATABASE_KINDS: NotionDatabaseKind[] = ['sprints', 'revisiones']

export const CORE_KPI_CONTRACT: CoreKpiContractField[] = [
  {
    conformedField: 'task_status',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Estado actual de la tarea',
    required: true
  },
  {
    conformedField: 'due_date',
    databaseKind: 'tareas',
    targetType: 'DATE',
    description: 'Fecha límite canónica para ICO y Performance Report',
    required: true
  },
  {
    conformedField: 'client_change_round_final',
    databaseKind: 'tareas',
    targetType: 'INTEGER',
    description: 'Rondas de revisión del cliente',
    required: true
  },
  {
    conformedField: 'client_change_round_label',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Etiqueta original de rondas de revisión del cliente',
    required: false
  },
  {
    conformedField: 'workflow_change_round',
    databaseKind: 'tareas',
    targetType: 'INTEGER',
    description: 'Rondas internas de workflow',
    required: false
  },
  {
    conformedField: 'rpa_value',
    databaseKind: 'tareas',
    targetType: 'FLOAT',
    description: 'Rounds per asset',
    required: false
  },
  {
    conformedField: 'rpa_semaphore_source',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Semáforo RpA',
    required: false
  },
  {
    conformedField: 'frame_versions',
    databaseKind: 'tareas',
    targetType: 'INTEGER',
    description: 'Total de versiones en Frame.io',
    required: false
  },
  {
    conformedField: 'frame_comments',
    databaseKind: 'tareas',
    targetType: 'INTEGER',
    description: 'Total de comentarios en Frame.io',
    required: false
  },
  {
    conformedField: 'open_frame_comments',
    databaseKind: 'tareas',
    targetType: 'INTEGER',
    description: 'Comentarios abiertos en Frame.io',
    required: false
  },
  {
    conformedField: 'client_review_open',
    databaseKind: 'tareas',
    targetType: 'BOOLEAN',
    description: 'Revisión de cliente abierta',
    required: false
  },
  {
    conformedField: 'workflow_review_open',
    databaseKind: 'tareas',
    targetType: 'BOOLEAN',
    description: 'Revisión interna abierta',
    required: false
  },
  {
    conformedField: 'review_source',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Origen de la última revisión',
    required: false
  },
  {
    conformedField: 'last_reviewed_version',
    databaseKind: 'tareas',
    targetType: 'INTEGER',
    description: 'Última versión revisada',
    required: false
  },
  {
    conformedField: 'notion_project_id',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Relación con proyecto padre',
    required: true
  },
  {
    conformedField: 'notion_sprint_id',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Relación con sprint/ciclo',
    required: false
  },
  {
    conformedField: 'url_frame_io',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'URL del asset en Frame.io',
    required: false
  },
  {
    conformedField: 'task_name',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Nombre de la tarea',
    required: true
  },
  {
    conformedField: 'task_phase',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Fase o priorización',
    required: false
  },
  {
    conformedField: 'task_priority',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Prioridad de la tarea',
    required: false
  },
  {
    conformedField: 'completion_label',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Etiqueta de completitud',
    required: false
  },
  {
    conformedField: 'delivery_compliance',
    databaseKind: 'tareas',
    targetType: 'STRING',
    description: 'Cumplimiento de entrega',
    required: false
  },
  {
    conformedField: 'completed_at',
    databaseKind: 'tareas',
    targetType: 'TIMESTAMP',
    description: 'Fecha de completación',
    required: false
  }
]

const NAME_PATTERNS: Record<string, string[]> = {
  task_status: ['estado', 'status', 'state', 'estatus', 'estado_tarea', 'task_status'],
  task_name: ['nombre_de_tarea', 'nombre', 'name', 'titulo', 'task_name', 'tarea'],
  task_phase: ['priorizacion', 'fase', 'phase'],
  task_priority: ['prioridad', 'priority', 'urgencia'],
  client_change_round_final: ['client_change_round_final', 'client_change_round', 'rondas_cliente', 'rounds_client', 'rondas_de_revision', 'cambios_cliente'],
  client_change_round_label: ['client_change_round_label'],
  workflow_change_round: ['workflow_change_round', 'rondas_workflow', 'rondas_internas', 'internal_rounds'],
  rpa_value: ['rpa', 'rounds_per_asset', 'rondas_por_asset', 'rpa_value'],
  rpa_semaphore_source: ['semaforo_rpa', 'semaforo', 'traffic_light', 'rpa_semaforo', 'rpa_semaphore_source'],
  frame_versions: ['frame_versions', 'frame_version', 'versiones', 'versions'],
  frame_comments: ['frame_comments', 'comentarios', 'comments'],
  open_frame_comments: ['open_frame_comments', 'comentarios_abiertos', 'open_comments'],
  client_review_open: ['client_review_open', 'revision_cliente', 'client_review', 'en_revision_cliente'],
  workflow_review_open: ['workflow_review_open', 'revision_interna', 'workflow_review'],
  review_source: ['review_source', 'fuente_revision', 'source'],
  last_reviewed_version: ['last_reviewed_version', 'ultima_version', 'version_revisada'],
  notion_project_id: ['proyecto', 'project', 'proyectos', 'proyecto_ids'],
  due_date: ['fecha_limite', 'fecha_límite', 'due_date', 'deadline', 'fecha_de_entrega'],
  notion_sprint_id: ['sprint', 'sprints', 'ciclo', 'ciclos', 'cycle'],
  url_frame_io: ['url_frame_io', 'url_frame', 'frame_io_url', 'frame_url', 'frameio'],
  completion_label: ['completitud', 'completion', 'finalizacion'],
  delivery_compliance: ['cumplimiento', 'compliance', 'delivery_compliance'],
  completed_at: ['fecha_de_completado', 'completed_at', 'completed_date', 'fecha_completado']
}

export const normalizeNotionPropertyKey = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s.\-]+/g, '_')

export const typesCompatible = (notionType: string, targetType: string): boolean => {
  const compatiblePairs = new Set([
    'number:INTEGER',
    'number:FLOAT',
    'select:STRING',
    'status:STRING',
    'multi_select:STRING',
    'rich_text:STRING',
    'title:STRING',
    'url:STRING',
    'checkbox:BOOLEAN',
    'date:TIMESTAMP',
    'date:DATE',
    'relation:STRING',
    'people:STRING',
    'created_time:TIMESTAMP',
    'last_edited_time:TIMESTAMP'
  ])

  return compatiblePairs.has(`${notionType}:${targetType}`)
}

export const suggestCoercionRule = (notionType: string, targetType: string): string => {
  if (typesCompatible(notionType, targetType)) return 'direct'

  if (notionType === 'formula') {
    if (targetType === 'INTEGER') return 'formula_to_int'
    if (targetType === 'FLOAT') return 'formula_to_float'
    if (targetType === 'STRING') return 'formula_to_string'
    if (targetType === 'BOOLEAN') return 'formula_to_bool'
  }

  if (notionType === 'rollup') {
    if (targetType === 'INTEGER') return 'rollup_to_int'
    if (targetType === 'FLOAT') return 'rollup_to_float'
    if (targetType === 'STRING') return 'rollup_to_string'
  }

  if (['rich_text', 'title'].includes(notionType) && ['INTEGER', 'FLOAT'].includes(targetType)) {
    return 'extract_number_from_text'
  }

  if (notionType === 'number' && targetType === 'STRING') return 'number_to_string'

  return `custom_${notionType}_to_${targetType.toLowerCase()}`
}

export const getCoreContractForDatabaseKind = (databaseKind: NotionDatabaseKind): CoreKpiContractField[] =>
  CORE_KPI_CONTRACT.filter(field => field.databaseKind === databaseKind)

export const findLikelyMatches = (propertyName: string, conformedField: string): MatchResult[] => {
  const normalized = normalizeNotionPropertyKey(propertyName)
  const patterns = NAME_PATTERNS[conformedField] ?? []
  const matches: MatchResult[] = []

  for (const pattern of patterns) {
    if (pattern === normalized) {
      matches.push({ confidence: 'HIGH', reason: `Exact match: '${normalized}'` })
      break
    }

    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      matches.push({ confidence: 'MEDIUM', reason: `Partial match: '${normalized}' ~ '${pattern}'` })
      break
    }
  }

  return matches
}

export const buildCoreFieldSuggestions = (
  databaseKind: NotionDatabaseKind,
  properties: Record<string, NotionPropertyDefinition>
): NotionCoreFieldSuggestion[] => {
  const suggestions: NotionCoreFieldSuggestion[] = []

  for (const field of getCoreContractForDatabaseKind(databaseKind)) {
    let bestSuggestion: NotionCoreFieldSuggestion | null = null

    for (const [propertyName, propertyInfo] of Object.entries(properties)) {
      const matches = findLikelyMatches(propertyName, field.conformedField)

      if (matches.length === 0) continue

      const match = matches[0]

      const candidate: NotionCoreFieldSuggestion = {
        conformedField: field.conformedField,
        databaseKind: field.databaseKind,
        targetType: field.targetType,
        required: field.required,
        notionPropertyName: propertyName,
        notionType: propertyInfo.type,
        coercionRule: suggestCoercionRule(propertyInfo.type, field.targetType),
        confidence: match.confidence,
        reason: match.reason
      }

      if (!bestSuggestion || (candidate.confidence === 'HIGH' && bestSuggestion.confidence === 'MEDIUM')) {
        bestSuggestion = candidate
      }
    }

    if (bestSuggestion) {
      suggestions.push(bestSuggestion)
    }
  }

  return suggestions
}
