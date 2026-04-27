import 'server-only'

import { HOME_GREETINGS, HOME_SUBTITLE } from '@/config/home-greetings'

import type { HomeHeroAiData } from '../contract'
import type { HomeLoaderContext } from '../registry'

const RESOLVED_MODEL_LABEL = 'Gemini 2.5 Flash'
const RESOLVED_MODEL_KEY = 'gemini-2.5-flash'

const SUGGESTIONS_BY_AUDIENCE: Record<string, HomeHeroAiData['suggestions']> = {
  admin: [
    { prompt: '¿Qué módulos están degradados ahora?', shortLabel: 'Estado de la plataforma', intent: 'reliability.overview' },
    { prompt: 'Resumen de aprobaciones pendientes', shortLabel: 'Aprobaciones pendientes', intent: 'inbox.approvals' },
    { prompt: 'Reliability del último día', shortLabel: 'Reliability 24h', intent: 'reliability.window' },
    { prompt: '¿Hay incidentes activos?', shortLabel: 'Incidentes activos', intent: 'reliability.incidents' }
  ],
  internal: [
    { prompt: 'Estado de mis equipos esta semana', shortLabel: 'Equipo esta semana', intent: 'agency.weekly' },
    { prompt: 'OTD del equipo esta semana', shortLabel: 'OTD del equipo', intent: 'delivery.otd' },
    { prompt: '¿Quién tiene capacidad disponible?', shortLabel: 'Capacidad disponible', intent: 'capacity.available' },
    { prompt: 'Mis tareas pendientes', shortLabel: 'Mis tareas', intent: 'inbox.mine' }
  ],
  hr: [
    { prompt: 'Estado de nómina de este mes', shortLabel: 'Estado de nómina', intent: 'payroll.status' },
    { prompt: 'Permisos por aprobar', shortLabel: 'Permisos pendientes', intent: 'leaves.pending' },
    { prompt: 'Asistencias y atrasos hoy', shortLabel: 'Asistencia hoy', intent: 'attendance.today' },
    { prompt: 'Cumpleaños esta semana', shortLabel: 'Cumpleaños', intent: 'people.birthdays' }
  ],
  finance: [
    { prompt: '¿Hay facturas pendientes de cobro?', shortLabel: 'Facturas por cobrar', intent: 'finance.ar' },
    { prompt: '¿Cuál es el margen de este mes?', shortLabel: 'Margen del mes', intent: 'finance.margin' },
    { prompt: 'Drift de ledger detectado', shortLabel: 'Drift de ledger', intent: 'finance.drift' },
    { prompt: 'Estado del cierre del período', shortLabel: 'Cierre del período', intent: 'finance.closing' }
  ],
  collaborator: [
    { prompt: 'Mis tareas pendientes', shortLabel: 'Mis tareas', intent: 'inbox.mine' },
    { prompt: '¿Cuántas horas tengo esta semana?', shortLabel: 'Mis horas', intent: 'capacity.mine' },
    { prompt: 'Estado de mi nómina', shortLabel: 'Mi nómina', intent: 'payroll.mine' },
    { prompt: 'Mis permisos disponibles', shortLabel: 'Mis permisos', intent: 'leaves.mine' }
  ],
  client: [
    { prompt: 'Estado de mis proyectos', shortLabel: 'Mis proyectos', intent: 'delivery.projects' },
    { prompt: 'Resumen de entregas esta semana', shortLabel: 'Entregas semanales', intent: 'delivery.weekly' },
    { prompt: '¿Qué hay pendiente de mi parte?', shortLabel: 'Pendientes míos', intent: 'inbox.client' },
    { prompt: 'Resumen de correos enviados', shortLabel: 'Correos enviados', intent: 'reports.sent' }
  ]
}

const pickGreetingPool = (now: Date) => {
  const hour = now.getHours()

  if (hour >= 5 && hour < 12) return HOME_GREETINGS.morning
  if (hour >= 12 && hour < 19) return HOME_GREETINGS.afternoon
  if (hour >= 19 || hour < 5) return HOME_GREETINGS.evening

  return HOME_GREETINGS.default
}

const GENERIC_NAME_FALLBACKS = new Set(['Usuario', 'Greenhouse', 'agent', 'Agent', ''])

const ROLE_LABEL_BY_AUDIENCE: Record<string, string> = {
  admin: 'Administración',
  internal: 'Equipo Efeonce',
  hr: 'Personas y HR',
  finance: 'Finanzas',
  collaborator: 'Colaborador',
  client: 'Cliente'
}

export interface LoadHomeHeroAiOptions {
  firstName: string
  fullName?: string | null
  avatarUrl?: string | null
  tenantLabel?: string | null
}

export const loadHomeHeroAi = async (
  ctx: HomeLoaderContext,
  options: LoadHomeHeroAiOptions
): Promise<HomeHeroAiData> => {
  const now = new Date(ctx.now)
  const pool = pickGreetingPool(now)
  const baseGreeting = pool[Math.floor(Math.random() * pool.length)]
  // When the user has no real first name (agent auth, fallback) drop the
  // ", {name}" segment entirely so we don't render "Cerrando el día, Usuario".
  const hasRealName = options.firstName && !GENERIC_NAME_FALLBACKS.has(options.firstName)

  const greeting = hasRealName
    ? baseGreeting.replace('{name}', options.firstName)
    : baseGreeting.replace(/,\s*\{name\}/g, '').replace('{name}', '')

  const suggestions = SUGGESTIONS_BY_AUDIENCE[ctx.audienceKey] ?? SUGGESTIONS_BY_AUDIENCE.internal

  // Render identity strip whenever we have a useful role/tenant context, even
  // for agent / generic users — we just degrade the displayName to the role
  // label instead of showing a meaningless 'Usuario'.
  const identity = {
    displayName: hasRealName ? (options.fullName?.trim() || options.firstName) : (ROLE_LABEL_BY_AUDIENCE[ctx.audienceKey] ?? 'Equipo Efeonce'),
    role: ROLE_LABEL_BY_AUDIENCE[ctx.audienceKey] ?? 'Equipo Efeonce',
    tenantLabel: options.tenantLabel ?? (ctx.tenantType === 'efeonce_internal' ? 'Efeonce Group' : 'Greenhouse'),
    avatarUrl: options.avatarUrl ?? null
  }

  return {
    greeting,
    subtitle: HOME_SUBTITLE,
    modelLabel: RESOLVED_MODEL_LABEL,
    modelKey: RESOLVED_MODEL_KEY,
    suggestions,
    lastQueryAtMs: null,
    disclaimer: 'Nexa usa IA generativa. Verifica la información importante.',
    identity
  }
}
