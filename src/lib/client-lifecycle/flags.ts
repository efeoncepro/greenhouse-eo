// TASK-992 — Client Lifecycle Orchestrator feature flag. Gates the aggregate
// surfaces (wizard front door + lifecycle timeline) at the runtime boundary.
// Default OFF: the code is live but the routes are hidden until the operator flips
// the env var across the relevant targets (Production + staging + Preview develop).
//
// Accepts either the server var (`CLIENT_LIFECYCLE_ONBOARDING_ENABLED`) OR the
// client-readable mirror (`NEXT_PUBLIC_CLIENT_LIFECYCLE_ONBOARDING_ENABLED`). The
// nav item (client component) can only read the NEXT_PUBLIC one — so setting JUST
// `NEXT_PUBLIC_CLIENT_LIFECYCLE_ONBOARDING_ENABLED=true` enables BOTH the nav entry
// and the page gate consistently (no broken nav, single source of truth).
export const isClientLifecycleOnboardingEnabled = (): boolean =>
  process.env.CLIENT_LIFECYCLE_ONBOARDING_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_CLIENT_LIFECYCLE_ONBOARDING_ENABLED === 'true'

// TASK-1010 Slice 3 — Semi-automatic HubSpot deal trigger (spec §11.1). Default
// OFF: the `hubspot-deals` webhook handler ACKs but does NOT open onboarding
// cases until the operator flips this flag AND configures the deal subscription
// in the HubSpot Developer Portal. Staged-rollout control per spec Slice 6.
// Server-only path (the handler runs server-side); no NEXT_PUBLIC mirror needed.
export const isClientLifecycleHubspotDealTriggerEnabled = (): boolean =>
  process.env.CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED === 'true'
