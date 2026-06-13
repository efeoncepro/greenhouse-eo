# Observability QA

Use when the work closes an incident, touches Sentry/logging/health/signals, or
depends on production/staging reliability.

Questions:

- Which issue, signal, log, or health check proves the behavior?
- Is the issue active, recent, stale, or resolved?
- What time window was inspected?
- Was the same runtime target checked as the claimed closure?
- Are errors sanitized and tagged with the right domain/source?
- Does the fix add or preserve a way to detect recurrence?
- If an issue/task is closed, was the Sentry/repo issue state updated too?

Evidence candidates:

- Sentry issue/events with freshness window and event count.
- `captureWithDomain` usage and tags for new error paths.
- `/api/health` or domain health endpoint.
- reliability signal steady-state query.
- worker/dead-letter/outbox health.
- post-deploy smoke or watchdog.

Blockers:

- Incident declared resolved without checking live events/health.
- Sentry issue remains open when task acceptance says it must close.
- Error handling logs raw sensitive data.
- No recurrence detector exists for a high-risk runtime drift.
