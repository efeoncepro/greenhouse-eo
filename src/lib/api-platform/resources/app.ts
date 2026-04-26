import 'server-only'

import { getTenantEntitlements } from '@/lib/entitlements/runtime'
import { getHomeSnapshot } from '@/lib/home/get-home-snapshot'
import { NotificationService } from '@/lib/notifications/notification-service'
import type { AppPlatformRequestContext } from '@/lib/api-platform/core/app-auth'

export const buildAppContextPayload = (context: AppPlatformRequestContext) => {
  const { tenant } = context

  const entitlements = getTenantEntitlements({
    userId: tenant.userId,
    tenantType: tenant.tenantType,
    roleCodes: tenant.roleCodes,
    primaryRoleCode: tenant.primaryRoleCode,
    routeGroups: tenant.routeGroups,
    authorizedViews: tenant.authorizedViews,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules,
    portalHomePath: tenant.portalHomePath,
    memberId: tenant.memberId
  })

  return {
    user: {
      userId: tenant.userId,
      displayName: null,
      memberId: tenant.memberId ?? null,
      identityProfileId: tenant.identityProfileId ?? null,
      timezone: tenant.timezone
    },
    tenant: {
      clientId: tenant.clientId,
      clientName: tenant.clientName,
      tenantType: tenant.tenantType,
      spaceId: tenant.spaceId ?? null,
      organizationId: tenant.organizationId ?? null,
      organizationName: tenant.organizationName ?? null
    },
    access: {
      roleCodes: tenant.roleCodes,
      primaryRoleCode: tenant.primaryRoleCode,
      routeGroups: tenant.routeGroups,
      authorizedViews: tenant.authorizedViews,
      portalHomePath: tenant.portalHomePath,
      audienceKey: entitlements.audienceKey,
      startupPolicyKey: entitlements.startupPolicyKey,
      moduleKeys: entitlements.moduleKeys,
      entitlements: entitlements.entries
    }
  }
}

export const getAppHomePayload = async (context: AppPlatformRequestContext) => {
  const { tenant } = context

  return getHomeSnapshot({
    userId: tenant.userId,
    clientId: tenant.clientId,
    firstName: 'Usuario',
    lastName: null,
    roleName: tenant.primaryRoleCode,
    tenantType: tenant.tenantType,
    primaryRoleCode: tenant.primaryRoleCode,
    businessLines: tenant.businessLines,
    serviceModules: tenant.serviceModules,
    roleCodes: tenant.roleCodes,
    routeGroups: tenant.routeGroups,
    authorizedViews: tenant.authorizedViews,
    portalHomePath: tenant.portalHomePath,
    memberId: tenant.memberId,
    organizationId: tenant.organizationId
  })
}

export const listAppNotifications = async ({
  context,
  request
}: {
  context: AppPlatformRequestContext
  request: Request
}) => {
  const url = new URL(request.url)
  const unreadOnly = url.searchParams.get('unreadOnly') !== 'false'
  const category = url.searchParams.get('category')?.trim() || undefined
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get('pageSize') || '20')))

  const result = await NotificationService.getNotifications(context.tenant.userId, {
    unreadOnly,
    category,
    page,
    pageSize
  })

  return {
    page,
    pageSize,
    total: result.total,
    items: result.items.map(item => ({
      notificationId: item.notification_id,
      spaceId: item.space_id,
      category: item.category,
      title: item.title,
      body: item.body,
      actionUrl: item.action_url,
      icon: item.icon,
      metadata: item.metadata,
      readAt: item.read_at,
      archivedAt: item.archived_at,
      createdAt: item.created_at
    }))
  }
}
