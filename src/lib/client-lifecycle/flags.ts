// TASK-992 — Client Lifecycle Orchestrator feature flag. Gates the aggregate
// surfaces (wizard front door) at the runtime boundary. Default OFF: the code is
// live but the wizard route is hidden until the operator flips the env var across
// the relevant targets (Production + staging + Preview develop).
export const isClientLifecycleOnboardingEnabled = (): boolean =>
  process.env.CLIENT_LIFECYCLE_ONBOARDING_ENABLED === 'true'
