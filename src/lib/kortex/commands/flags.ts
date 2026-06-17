import 'server-only'

const truthy = (value: string | undefined) => value?.trim().toLowerCase() === 'true'

export const isKortexCommandAdapterEnabled = () => truthy(process.env.KORTEX_COMMAND_ADAPTER_ENABLED)

export const isKortexCommandLiveExecuteEnabled = () => truthy(process.env.KORTEX_COMMAND_LIVE_EXECUTE_ENABLED)

export const isKortexCommandAdminEnabled = () => truthy(process.env.KORTEX_COMMAND_ADMIN_ENABLED)

export const resolveKortexCommandAllowedPortals = () =>
  (process.env.KORTEX_COMMAND_ALLOWED_PORTALS ?? '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)

export const isKortexCommandPortalAllowed = ({
  portalId,
  hubspotPortalId
}: {
  portalId: string | null
  hubspotPortalId: string | null
}) => {
  const allowed = resolveKortexCommandAllowedPortals()

  if (allowed.length === 0) return true

  return allowed.some(value => value === portalId || value === hubspotPortalId)
}
