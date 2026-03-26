import 'server-only'

import { NotificationService } from '@/lib/notifications/notification-service'
import { resolveCapabilityModules } from '@/lib/capabilities/resolve-capabilities'
import { HOME_GREETINGS } from '@/config/home-greetings'
import type { HomeSnapshot, ModuleCard, PendingTask } from '@/types/home'

interface HomeSnapshotInput {
  userId: string
  firstName: string
  lastName: string | null
  roleName: string
  businessLines: string[]
  serviceModules: string[]
  organizationId?: string | null
}

/**
 * Orchestrates the gathering of all data needed for the Home view.
 * This is a server-side helper to be used by the /api/home/snapshot route.
 */
export async function getHomeSnapshot(input: HomeSnapshotInput): Promise<HomeSnapshot> {
  const now = new Date()
  const hour = now.getHours()

  // 1. Resolve Greeting
  let greetingPool = HOME_GREETINGS.default

  if (hour >= 5 && hour < 12) greetingPool = HOME_GREETINGS.morning
  else if (hour >= 12 && hour < 19) greetingPool = HOME_GREETINGS.afternoon
  else if (hour >= 19 || hour < 5) greetingPool = HOME_GREETINGS.evening

  const randomGreeting = greetingPool[Math.floor(Math.random() * greetingPool.length)]
  const resolvedGreeting = randomGreeting.replace('{name}', input.firstName)

  // 2. Resolve Modules (Capabilities)
  const resolvedCapabilities = resolveCapabilityModules({
    businessLines: input.businessLines,
    serviceModules: input.serviceModules
  })

  const modules: ModuleCard[] = resolvedCapabilities.map(cap => ({
    id: cap.id,
    title: cap.label,
    subtitle: cap.description || '',
    icon: cap.icon,
    route: cap.route,
    color: 'primary' // Default color for now
  }))

  // 3. Resolve Tasks (Unread Notifications)
  const { items: notifications } = await NotificationService.getNotifications(input.userId, {
    unreadOnly: true,
    pageSize: 5
  })

  const tasks: PendingTask[] = notifications.map(n => ({
    id: n.notification_id,
    title: n.title,
    description: n.body || '',
    type: (n.category as any) || 'other',
    priority: n.metadata?.priority === 'high' ? 'high' : 'medium',
    dueDate: n.metadata?.dueDate as string | undefined,
    ctaLabel: 'Ver',
    ctaRoute: n.action_url || undefined
  }))

  // 4. Nexa Intro (Simple logic for now)
  const nexaIntro = `Hola ${input.firstName}, soy Nexa. Tengo acceso al catálogo reactivo de Greenhouse y puedo ayudarte a navegar tu operación. Veo que tienes ${tasks.length} pendientes hoy. ¿Por dónde quieres empezar?`

  return {
    user: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.roleName
    },
    greeting: {
      title: resolvedGreeting,
      subtitle: 'Bienvenido a tu centro de mando.'
    },
    modules,
    tasks,
    nexaIntro,
    computedAt: now.toISOString()
  }
}
