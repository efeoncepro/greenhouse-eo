import type { CapabilityModuleDefinition } from '@/types/capabilities'

export const CAPABILITY_REGISTRY: CapabilityModuleDefinition[] = [
  {
    id: 'creative-hub',
    label: 'Creative Hub',
    description: 'Lectura ejecutiva para cuentas creativas con foco en revision, salida y friccion del portfolio.',
    icon: 'tabler-palette',
    route: '/capabilities/creative-hub',
    priority: 10,
    theme: 'creative',
    requiredBusinessLines: ['globe'],
    requiredServiceModules: ['agencia_creativa', 'produccion_audiovisual', 'social_media_content'],
    dataSources: [
      {
        dataset: 'notion_ops',
        table: 'tareas',
        requiredColumns: [
          'notion_page_id',
          'proyecto_ids',
          'estado',
          'cumplimiento',
          'completitud',
          'client_change_round_final',
          'frame_versions',
          'rpa',
          'client_review_open',
          'workflow_review_open',
          'open_frame_comments',
          'fase_csc',
          'bloqueado_por_ids',
          'created_time',
          'last_edited_time',
          'fecha_de_completado',
          'fecha_entrega',
          'fecha_limite',
          '_synced_at'
        ]
      },
      {
        dataset: 'notion_ops',
        table: 'proyectos',
        requiredColumns: ['notion_page_id', 'nombre_del_proyecto', 'estado', 'pct_on_time', 'page_url']
      }
    ],
    cards: [
      {
        id: 'creative-metrics',
        title: 'Creative delivery',
        type: 'metric',
        size: 'full',
        description: 'Cadencia, revision abierta y calidad visible del flujo creativo.'
      },
      {
        id: 'creative-review-pipeline',
        title: 'Review pipeline',
        type: 'metric-list',
        size: 'md',
        description: 'Donde se concentra hoy la presion de revision dentro del flujo creativo.'
      },
      {
        id: 'creative-review-hotspots',
        title: 'Review hotspots',
        type: 'chart-bar',
        size: 'lg',
        description: 'Proyectos con mayor presion combinada de revision y comentarios abiertos.'
      },
      {
        id: 'creative-projects',
        title: 'Projects in focus',
        type: 'project-list',
        size: 'lg',
        description: 'Ranking de proyectos con mas friccion o riesgo visible.'
      },
      {
        id: 'creative-quality',
        title: 'Quality signal',
        type: 'quality-list',
        size: 'md',
        description: 'Senales recientes de RpA y First-Time Right.'
      },

      // ── Revenue Enabled ───────────────────────────────────────────
      {
        id: 'revenue-header',
        title: 'Revenue Enabled',
        type: 'section-header',
        size: 'full',
        description: 'El impacto de tu produccion creativa en el negocio'
      },
      {
        id: 'creative-revenue-kpis',
        title: 'Revenue metrics',
        type: 'metrics-row',
        size: 'full',
        description: 'Early Launch, Iteration, Throughput y policy de atribucion con evidencia explicita.'
      },

      // ── Brand Intelligence ─────────────────────────────────────────
      {
        id: 'brand-header',
        title: 'Brand Intelligence',
        type: 'section-header',
        size: 'full',
        description: 'Gobernanza y proteccion de marca sobre el flujo creativo.'
      },
      {
        id: 'creative-brand-kpis',
        title: 'Brand metrics',
        type: 'metrics-row',
        size: 'full',
        description: 'First Time Right, consistencia de marca, salud de revision y base de conocimiento.'
      },
      {
        id: 'creative-rpa-trend',
        title: 'RpA trend',
        type: 'chart-bar',
        size: 'full',
        description: 'Evolucion mensual de rondas por asset visibles en la cuenta.'
      },

      // ── CSC Pipeline Tracker ──────────────────────────────────────
      {
        id: 'pipeline-header',
        title: 'Creative Supply Chain',
        type: 'section-header',
        size: 'full',
        description: 'El pipeline completo de tu produccion creativa'
      },
      {
        id: 'csc-pipeline',
        title: 'Pipeline CSC',
        type: 'pipeline',
        size: 'full',
        description: 'Assets activos por fase de la Creative Supply Chain.'
      },
      {
        id: 'csc-metrics',
        title: 'Pipeline metrics',
        type: 'metrics-row',
        size: 'full',
        description: 'Cycle time promedio, bottleneck, pipeline velocity y stuck assets.'
      },
      {
        id: 'stuck-assets',
        title: 'Stuck steps',
        type: 'alert-list',
        size: 'full',
        description: 'Proyectos con assets detenidos mas de 48h sin movimiento.'
      }
    ]
  },
  {
    id: 'crm-command-center',
    label: 'CRM Command',
    description: 'Modulo ejecutivo para cuentas CRM con foco en backlog, estabilidad y cambios del cliente.',
    icon: 'tabler-brand-hubspot',
    route: '/capabilities/crm-command-center',
    priority: 20,
    theme: 'crm',
    requiredBusinessLines: ['crm_solutions'],
    requiredServiceModules: ['licenciamiento_hubspot', 'consultoria_crm'],
    dataSources: [
      {
        dataset: 'notion_ops',
        table: 'tareas',
        requiredColumns: [
          'notion_page_id',
          'proyecto_ids',
          'estado',
          'cumplimiento',
          'completitud',
          'client_change_round_final',
          'rpa',
          'client_review_open',
          'workflow_review_open',
          'open_frame_comments',
          'bloqueado_por_ids',
          'created_time',
          'fecha_de_completado',
          '_synced_at'
        ]
      },
      {
        dataset: 'notion_ops',
        table: 'proyectos',
        requiredColumns: ['notion_page_id', 'nombre_del_proyecto', 'estado', 'pct_on_time', 'page_url']
      }
    ],
    cards: [
      {
        id: 'crm-metrics',
        title: 'CRM operations',
        type: 'metric',
        size: 'full',
        description: 'Estado del portfolio, presion operativa y salud de entrega.'
      },
      {
        id: 'crm-projects',
        title: 'Implementaciones bajo observacion',
        type: 'project-list',
        size: 'lg',
        description: 'Frentes activos con mas backlog, riesgo o friccion.'
      },
      {
        id: 'crm-tooling',
        title: 'Ecosistema visible',
        type: 'tooling-list',
        size: 'md',
        description: 'Herramientas tecnicas y AI tools actualmente visibles en la cuenta.'
      }
    ]
  },
  {
    id: 'onboarding-center',
    label: 'Onboarding Center',
    description: 'Seguimiento ejecutivo para onboarding e implementacion CRM sin abrir la cocina operativa completa.',
    icon: 'tabler-rocket',
    route: '/capabilities/onboarding-center',
    priority: 30,
    theme: 'onboarding',
    requiredServiceModules: ['implementacion_onboarding'],
    dataSources: [
      {
        dataset: 'notion_ops',
        table: 'tareas',
        requiredColumns: [
          'notion_page_id',
          'proyecto_ids',
          'estado',
          'cumplimiento',
          'completitud',
          'client_change_round_final',
          'rpa',
          'client_review_open',
          'workflow_review_open',
          'open_frame_comments',
          'bloqueado_por_ids',
          'created_time',
          'fecha_de_completado',
          '_synced_at'
        ]
      },
      {
        dataset: 'notion_ops',
        table: 'proyectos',
        requiredColumns: ['notion_page_id', 'nombre_del_proyecto', 'estado', 'pct_on_time', 'page_url']
      }
    ],
    cards: [
      {
        id: 'onboarding-metrics',
        title: 'Onboarding progress',
        type: 'metric',
        size: 'full',
        description: 'Avance, cola visible, riesgo y volumen del onboarding.'
      },
      {
        id: 'onboarding-projects',
        title: 'Cuenta y proyectos',
        type: 'project-list',
        size: 'lg',
        description: 'Proyectos visibles que explican el estado del onboarding.'
      },
      {
        id: 'onboarding-quality',
        title: 'Quality trend',
        type: 'quality-list',
        size: 'md',
        description: 'RpA y senales de ajuste de calidad por mes.'
      }
    ]
  },
  {
    id: 'web-delivery-lab',
    label: 'Web Delivery',
    description: 'Lectura operativa para delivery web con foco en bloqueos, carga activa y ritmo de salida.',
    icon: 'tabler-code',
    route: '/capabilities/web-delivery-lab',
    priority: 40,
    theme: 'web',
    requiredBusinessLines: ['wave'],
    requiredServiceModules: ['desarrollo_web'],
    dataSources: [
      {
        dataset: 'notion_ops',
        table: 'tareas',
        requiredColumns: [
          'notion_page_id',
          'proyecto_ids',
          'estado',
          'cumplimiento',
          'completitud',
          'client_change_round_final',
          'rpa',
          'client_review_open',
          'workflow_review_open',
          'open_frame_comments',
          'bloqueado_por_ids',
          'created_time',
          'fecha_de_completado',
          '_synced_at'
        ]
      },
      {
        dataset: 'notion_ops',
        table: 'proyectos',
        requiredColumns: ['notion_page_id', 'nombre_del_proyecto', 'estado', 'pct_on_time', 'page_url']
      }
    ],
    cards: [
      {
        id: 'web-metrics',
        title: 'Web execution',
        type: 'metric',
        size: 'full',
        description: 'Bloqueos, backlog activo y salud general del delivery.'
      },
      {
        id: 'web-projects',
        title: 'Builds under attention',
        type: 'project-list',
        size: 'lg',
        description: 'Proyectos web con mas riesgo, bloqueos o presion de revision.'
      },
      {
        id: 'web-tooling',
        title: 'Tooling visible',
        type: 'tooling-list',
        size: 'md',
        description: 'Stack tecnico visible para este space en Greenhouse.'
      }
    ]
  }
]
