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
    requiredServiceModules: ['agencia_creativa'],
    cards: [
      {
        id: 'creative-metrics',
        title: 'Creative delivery',
        type: 'metric',
        size: 'full',
        description: 'Cadencia, revision abierta y calidad visible del flujo creativo.'
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
