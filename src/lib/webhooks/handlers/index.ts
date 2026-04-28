let registered = false

export async function ensureHandlersRegistered() {
  if (registered) return

  await import('./teams-attendance')
  await import('./hubspot-companies')

  // Future handlers imported here
  registered = true
}
