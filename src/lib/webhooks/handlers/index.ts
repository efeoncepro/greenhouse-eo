let registered = false

export async function ensureHandlersRegistered() {
  if (registered) return

  await import('./teams-attendance')
  await import('./hubspot-companies')
  await import('./hubspot-services')
  // TASK-910 — Notion demo teamspace webhook handler (dedicated endpoint
  // /api/webhooks/notion-tasks-demo, separate HMAC secret + tabla
  // task_status_transitions_demo separada del productivo).
  await import('./notion-tasks-demo')

  // Future handlers imported here
  registered = true
}
