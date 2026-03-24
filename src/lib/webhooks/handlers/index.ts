let registered = false

export async function ensureHandlersRegistered() {
  if (registered) return

  await import('./teams-attendance')

  // Future handlers imported here
  registered = true
}
