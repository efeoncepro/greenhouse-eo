# Runtime Rollout Gate

Code complete is not operationally complete. Block closure or downgrade to
`code complete, rollout pendiente` when any required runtime step is missing.

Check:

- flags and env vars in each target environment
- secrets resolved through the canonical secret path
- migrations applied
- backfills/recoveries completed or explicitly pending
- Vercel/Cloud Run/worker redeploy or restart applied when needed
- cron/webhook/scheduler/external app provisioned
- source-of-truth data shape confirmed
- active runtime smoke completed against the correct URL/service
- rollback or disable path exists for risky rollout

Common traps:

- Vercel env changes need redeploy.
- Worker/Cloud Run env changes need service revision/restart.
- Custom staging domains may be SSO-protected; use canonical `.vercel.app` plus bypass.
- A flag default OFF can still be code-complete only, not operationally complete.
- A migration in repo is not applied in Cloud SQL until verified.
