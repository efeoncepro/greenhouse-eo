const enabled = (value: string | undefined) => value?.trim().toLowerCase() === 'true'

export const talentPoolFlags = () => ({
  projection: enabled(process.env.HIRING_TALENT_POOL_PROJECTION_ENABLED),
  search: enabled(process.env.HIRING_TALENT_POOL_SEARCH_ENABLED),
  invite: enabled(process.env.HIRING_TALENT_POOL_INVITE_ENABLED),
  selfService: enabled(process.env.HIRING_TALENT_POOL_SELF_SERVICE_ENABLED),
  mcp: enabled(process.env.HIRING_TALENT_POOL_MCP_ENABLED)
})
