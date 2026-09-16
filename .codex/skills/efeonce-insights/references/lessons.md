# Efeonce Insights — lessons (append; newest first; each with date, symptom, rule)

- **2026-09-16 · Down of a migration must respect governance tables.** Symptom: `migrate:down` failed twice
  (`module_assignments_module_key_fkey`, then `module_assignment_events is append-only`); node-pg-migrate rolled the
  whole transaction back (no damage). Rule: a domain's Down retires its own schema and deprecates capabilities; it
  never deletes catalog rows, assignments or audit. Editing only the Down section of an applied migration is fine.
- **2026-09-16 · Announce destructive shared-instance actions and WAIT.** A peer session (TASK-1846) sent an ALTO that
  arrived after the down had run, because the docs said "real editions in production". Rule: announce, wait for a
  reply, name the owning org, and write "synthetic (sandbox org); production = runtime".
- **2026-09-15 · Vercel freezes env vars at build.** `INSIGHTS_GENERATION_ENABLED` added after the deployment was
  created ⇒ `generation_disabled` until `vercel redeploy`. Same in Production after the release.
- **2026-09-15 · Idempotent replay is HTTP 200, not 202.** `status: result.idempotent ? 200 : 202` in both lanes. A
  lane-level replay (header key) returns the cached 202 with `idempotent:false`: lane behaviour, not the command.
- **2026-09-15 · The served manual must be self-sufficient.** An agent with no context built a valid request from it,
  but lacked title/purpose, window limits, `comparison.custom` shape, pagination, `includeEvidence`, `allowPartial`
  with all modules empty, and the real error codes. All added; keep it that way when contracts change.
- **2026-09-15 · `plan.limits` repeats the same line per rejection** ("ico: sin datos." ×4). Dedupe belongs to TASK-1846.
- **2026-09-15 · Gateway surface baseline trap.** If `surface-baseline.json` already carries the new version with the
  old hash, `pnpm surface:baseline` aborts: `git checkout -- surface-baseline.json`, bump `package.json`, regenerate.
- **2026-09-15 · Parity/authorized-tools tests build their own server.** New provider ⇒ add the stub to
  `test/authorized-tools.test.ts` and the parity test's server build, plus `src/surface.ts`.
- **2026-09-15 · Permission classifier vs. autonomy.** `az rest`, `gh pr`/push to the gateway repo, `pnpm migrate:down`,
  `gh workflow run`, `vercel env add … production` were blocked until the operator added Bash allow rules in
  `~/.claude/settings.json`; chained commands get blocked more often than single ones. Ask for the rules up front.
- **2026-09-15 · `git push` over SSH (ssh.github.com:443) dropped the pack; HTTPS with `gh auth git-credential` worked.**
- **2026-09-15 · Docs-only merge before a release cancels staging (Ignored Build Step)** and `vercel_readiness`
  then fails preflight; touching a deploy-control doc (flag ledger) produces the build honestly.
- **2026-09-15 · Served manual leak test rejects TASK ids, repo paths, UUIDs, org ids, secret names.** Write for an
  external agent; keep those in the local skill, never in `docs/mcp/skills/**`.
- **2026-09-15 · ISSUE-172 pattern applied:** public codes use a plpgsql function with a single `nextval` and
  `lpad(n, GREATEST(6, length(n)), '0')`; never `to_char FM` nor a per-row DEFAULT in `INSERT … SELECT`.
