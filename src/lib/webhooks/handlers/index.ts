let registered = false

export async function ensureHandlersRegistered() {
  if (registered) return

  await import('./teams-attendance')
  await import('./hubspot-companies')
  await import('./hubspot-services')

  // Future handlers imported here
  registered = true
}
