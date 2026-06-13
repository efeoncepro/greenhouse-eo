# Evidence Format

Every QA verdict must answer these six questions:

1. What changed really?
2. What can break even if tests pass?
3. What evidence exists?
4. What was not validated?
5. What is still required for runtime real?
6. Is the closure state `complete`, `code complete, rollout pendiente`, or
   `operativamente bloqueado`?

Use concrete evidence:

- command + result
- capture directory or screenshot path
- runtime URL/service checked
- migration/backfill/env/deploy identifier
- Sentry issue/event/time window
- doc/task/handoff file updated

Avoid vague evidence:

- "tests pass" without naming which tests
- "looks good" without capture/frame reference
- "should work in staging" without deployed smoke
- "flag exists" without target env check
- "Sentry quiet" without timeframe
