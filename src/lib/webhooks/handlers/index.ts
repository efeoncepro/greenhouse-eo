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
  // TASK-912 — Notion status-transitions webhook handler PRODUCTIVO (Efeonce + Sky,
  // endpoint /api/webhooks/notion-status-transitions, secret separado, gated por
  // kill-switch flag NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED default OFF).
  await import('./notion-status-transitions')
  // TASK-1010 Slice 3 — HubSpot deals webhook (semi-automatic onboarding trigger,
  // endpoint /api/webhooks/hubspot-deals, gated por flag
  // CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED default OFF).
  await import('./hubspot-deals')
  // TASK-491 — ZapSign signature webhook (endpoint /api/webhooks/zapsign, auth_mode='bearer').
  // Dispatch cascade: signature_requests aggregate (TASK-490) priority, MSA legacy fallback.
  // Replaces the removed one-off route src/app/api/webhooks/zapsign/route.ts.
  await import('./zapsign')

  // Future handlers imported here
  registered = true
}
