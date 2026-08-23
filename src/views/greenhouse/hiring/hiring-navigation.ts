export const hiringApplicationViewTransitionName = (applicationId: string) =>
  `hiring-application-${applicationId.replace(/[^a-zA-Z0-9_-]/g, '-')}`

export const hiringApplicationViewTransitionStyle = (applicationId: string) => ({
  viewTransitionName: hiringApplicationViewTransitionName(applicationId),
  viewTransitionClass: 'hiring-application'
})

export const buildHiringPipelineHref = (openingId?: string, focusApplicationId?: string) => {
  const params = new URLSearchParams()

  if (openingId) params.set('openingId', openingId)
  if (focusApplicationId) params.set('focusApplication', focusApplicationId)

  const query = params.toString()

  return query ? `/agency/hiring/pipeline?${query}` : '/agency/hiring/pipeline'
}
