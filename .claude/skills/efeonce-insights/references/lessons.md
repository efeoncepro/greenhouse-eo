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
- **2026-09-16 · `proposal_render_jobs` has NO lease, fencing token or heartbeat.** The claim
  (`claimNextRenderJobForExecution`) is atomic via `FOR UPDATE SKIP LOCKED`, and `markRenderJobCompleted` only
  checks `expectFromStates:['running']` — it never verifies the finisher still owns the claim. Consequence today:
  no double execution (nothing re-claims), but a worker that dies leaves the job in `running` forever;
  `listExpiredQueuedRenderJobs` only covers `queued` past its deadline. TASK-1846's acceptance about "a stale lease
  must not produce two final outputs" describes a hazard **that task itself introduces** by adding reclaim — so
  lease and fencing must ship in the SAME slice. Never split them.
- **2026-09-16 · In the shared checkout, another session's `git push` carries YOUR local commits.** Three
  documentation commits of TASK-1846 reached `origin/develop` inside greenhouse-eo-96's push of TASK-1845, with no
  action from the 1846 session. Local-first is not protection: if a commit must not leave the machine yet, it must
  not be committed to `develop` yet. Verify after any peer push with `git merge-base --is-ancestor <sha> origin/develop`.
- **2026-09-16 · `Handoff.md` budget: the gate counts TOKENS, the rotator works on SESSIONS.** `docs:context-rotate`
  reported "2/20 sessions, 439/600 lines, nothing to rotate" while `docs:context-check:strict` failed at ~12411
  tokens over a 12000 ceiling. Baseline was 11994 with a single session — six tokens of headroom, so ANY new entry
  overflows it. Fixes, in order: `--max-sessions=N` to force rotation, and then trim your own entry to a pointer
  (most of the file's bulk is not in dated sections, so rotation alone does not get you under).
- **2026-09-16 · How to verify the synthetic-edition claim AFTER the fact.** The vocabulary trap is in SKILL.md; the
  operational check is: `module_assignments WHERE module_key='insights_v1'` must return exactly the sandbox org, and
  `organizations.organization_name` confirms it is "Greenhouse Demo". That check survives a `down`/`up`; the rows
  themselves do not. Post-rollback you can prove "no real org had the module", never "what the deleted rows were".
- **2026-09-16 · Un parámetro `$N` sin referenciar revienta en PostgreSQL, no se ignora.** Al agregar la
  cuota por organización quedó `$2` sin usar en el SELECT del claim (usaba `$1` y `$3`): PG responde
  `could not determine data type of parameter $2`. Numerar los `$N` consecutivos POR QUERY, no por la lista de
  variables del TS. Lo destapó el live test; el typecheck no ve dentro del SQL.
- **2026-09-16 · `zsh` NO hace word-splitting de `$VAR` sin comillas.** `P="a b c"; git add $P` pasa la cadena
  entera como UN path y falla con `did not match any files`. En bash funcionaría. Usar rutas literales o `${=P}`.
  Falló ruidoso, que es lo bueno; la variante silenciosa de esta clase es la que muerde.
- **2026-09-16 · Un live test que falla con `invalid_rapt` NO es un bug de tu SQL: es la ADC de gcloud vencida.**
  El stack apunta a `cloud-sql-connector`/`google-auth-library`, no a tu query. Se arregla con
  `pnpm gcloud:auth:playwright -- --force` y se re-corre; perseguir el SQL es perder el rato.
- **2026-09-16 · `pnpm build` de producción MODIFICA `tsconfig.json`** (le agrega includes con timestamp
  `.next-local/build-<ts>/types/**`). Es un archivo versionado: commitear después de un build sin mirar
  `git status` se lleva esa basura, distinta en cada corrida. Revertir con `git checkout -- tsconfig.json`.
- **2026-09-16 · El guard de write-target del dominio atrapa tus tablas nuevas, y está bien.**
  `boundary-domain.test.ts` falla con la lista de writes no registrados; la task lo exige en el mismo PR.
  Registrarlas en `ALLOWED_WRITE_TARGETS` es la acción correcta — el boundary no se ensancha hacia módulos
  productores, sólo reconoce tablas propias.

