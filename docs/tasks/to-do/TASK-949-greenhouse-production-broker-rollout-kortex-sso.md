# TASK-949 — Greenhouse Production Broker Rollout for Kortex SSO

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity|platform|ops`
- Blocked by: `TASK-948`
- Branch: `task/TASK-949-greenhouse-prod-broker-rollout-kortex-sso`
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Promover de forma controlada el broker Greenhouse -> Kortex SSO de `TASK-948` al entorno productivo correspondiente y encender el botón `Continuar con Greenhouse` en Kortex Production solo después de smoke end-to-end verde. La task existe para separar el rollout/cutover productivo del trabajo de implementación y evitar promover Greenhouse completo a `main` por accidente.

## Why This Task Exists

Kortex ya quedó preparado en `main` con un provider Auth.js `greenhouse` flag-gated, pero el flag productivo quedó apagado porque Greenhouse production todavía no expone el broker OAuth de `TASK-948`. Encender Kortex antes de publicar Greenhouse produciría un CTA roto; publicar Greenhouse sin gate de identidad podría tocar SSO/SCIM/Entra por error. Este paso convierte el rollout en una operación explícita, reversible y verificable.

## Goal

- Publicar el broker Greenhouse de `TASK-948` por el flujo productivo correcto, sin promover cambios no relacionados.
- Configurar secretos/env vars/redirect URIs productivos para Kortex y Greenhouse con allowlist explícita.
- Encender `KORTEX_GREENHOUSE_SSO_ENABLED=true` solo después de validar Greenhouse production + Kortex production.
- Dejar rollback documentado: apagar Kortex primero, luego Greenhouse si hace falta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- No tocar SCIM, Microsoft Entra provisioning, Graph sync, providers/callbacks NextAuth existentes, cookies, sesiones globales ni lifecycle de identidad Greenhouse salvo el broker aditivo ya definido por `TASK-948`.
- `views`, `authorizedViews`, `routeGroups`, `entitlements` y `startup policy` no cambian en esta task. Si el rollout revela que hay que tocarlos, detenerse y abrir ADR/task separada.
- No compartir passwords, password hashes, cookies Greenhouse, Microsoft access tokens, Microsoft refresh tokens ni upstream provider secrets con Kortex.
- No promover todo `develop` a `main` como atajo. El agente debe usar el flujo de release Greenhouse vigente o un cherry-pick/release acotado aprobado, con diff auditado.
- Feature flags deben permitir rollback inmediato: `KORTEX_GREENHOUSE_SSO_ENABLED=false` apaga el CTA en Kortex; `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=false` apaga el broker en Greenhouse.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `Handoff.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- `TASK-948` complete or explicitly approved for release scope.
- Greenhouse broker runtime from `TASK-948`:
  - `src/app/api/auth/sister-platforms/authorize/route.ts`
  - `src/app/api/integrations/v1/sister-platforms/oauth/token/route.ts`
  - `src/app/api/integrations/v1/sister-platforms/oauth/userinfo/route.ts`
  - `src/lib/sister-platforms/oauth-broker.ts`
  - `migrations/20260528163738200_task-948-sister-platform-identity-broker.sql`
- Kortex main commit `caa496a` or successor containing:
  - `apps/web/src/libs/auth.ts`
  - `apps/web/src/app/login/page.tsx`
  - `apps/web/src/views/Login.tsx`

### Blocks / Impacts

- Enables production Kortex login via existing Greenhouse SSO providers.
- Impacts Vercel Production env for Greenhouse and Kortex.
- Impacts Cloud SQL production/staging migration state only through the additive `TASK-948` schema.

### Files owned

- `docs/tasks/to-do/TASK-949-greenhouse-production-broker-rollout-kortex-sso.md`
- `docs/tasks/in-progress/TASK-948-greenhouse-identity-broker-kortex-sso.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/documentation/plataforma/sister-platform-bindings.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Kortex `main` has a flag-gated Greenhouse Auth.js provider and production deploy at `https://kortex-kappa.vercel.app`.
- Kortex Production currently has `KORTEX_GREENHOUSE_SSO_ENABLED=false`, so login remains stable and the Greenhouse CTA is hidden.
- `TASK-948` has the Greenhouse broker implemented in `develop` with additive schema, API routes, seed support and reliability signals.
- The Kortex OAuth client has known callback targets, including `https://kortex-kappa.vercel.app/api/auth/callback/greenhouse`.

### Gap

- Greenhouse production does not yet expose the broker from `TASK-948`.
- Production env/secret alignment for `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED`, `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS`, `GREENHOUSE_OAUTH_CLIENT_ID`, `GREENHOUSE_OAUTH_CLIENT_SECRET` and `GREENHOUSE_BASE_URL` has not been verified end-to-end.
- Full Kortex Production -> Greenhouse Production -> Microsoft/Google/Credentials -> Kortex callback smoke has not been run.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Release Scope Audit

- Confirm `TASK-948` diff is complete, reviewed and isolated from unrelated `develop` changes.
- Decide and document the release vehicle: normal Greenhouse release branch, approved cherry-pick, or wait for `develop -> main` promotion.
- Verify no file in the release scope mutates SCIM, Entra provisioning, Graph sync, SSO providers/callbacks, global session callbacks, cookies or identity lifecycle.

### Slice 2 — Production Migration & Env Preflight

- Verify migration state with the canonical Postgres tooling before touching production.
- Apply the additive `greenhouse_core.sister_platform_oauth_*` migration only through the repo migration flow.
- Configure Greenhouse Production env with `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=false` initially and `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS=kortex`.
- Configure Kortex Production env values needed by the provider while keeping `KORTEX_GREENHOUSE_SSO_ENABLED=false`.

### Slice 3 — Greenhouse Production Broker Deploy

- Deploy Greenhouse broker release to production with the broker flag disabled.
- Verify existing Greenhouse login, Microsoft SSO wall, credentials flow, SCIM endpoints and admin identity surfaces have no regression.
- Flip `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=true` only after disabled-state smoke is green.

### Slice 4 — Kortex Cutover

- Re-seed or verify the Kortex OAuth client allowlist includes `https://kortex-kappa.vercel.app/api/auth/callback/greenhouse`.
- Flip `KORTEX_GREENHOUSE_SSO_ENABLED=true` in Kortex Production and redeploy.
- Smoke `https://kortex-kappa.vercel.app/login` for CTA visibility and callback flow.

### Slice 5 — End-to-End Smoke & Monitoring

- Execute Kortex -> Greenhouse authorize -> existing Greenhouse provider login -> Kortex callback.
- Verify the resulting Kortex session has the expected normalized identity shape and `portalHomePath`.
- Check Greenhouse broker audit/reliability signals and Kortex auth logs after the smoke.
- Leave rollback instructions and post-cutover monitoring window in `Handoff.md`.

## Out of Scope

- Rewriting Greenhouse identity architecture.
- Changing SCIM, Microsoft Entra app registration, Graph sync, provider callbacks, cookies or session lifecycle.
- Deprecating the existing Kortex password bridge. It remains break-glass/transitional until a separate cutover/deprecation task.
- Adding new views, routeGroups, entitlements, startup policy behavior or Kortex authorization semantics.
- Promoting unrelated Greenhouse `develop` work to `main`.

## Detailed Spec

Access model decision:

- `routeGroups`: no change.
- `views` / `authorizedViews` / `view_code`: no change.
- `entitlements`: no change.
- `startup policy`: no change.
- OAuth scopes: use the existing sister-platform OAuth scope allowlist from `TASK-948`, including `openid`, `profile`, `email` and `kortex.operator_console.access`.

Environment contract:

- Greenhouse:
  - `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED`
  - `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS=kortex`
- Kortex:
  - `KORTEX_GREENHOUSE_SSO_ENABLED`
  - `GREENHOUSE_BASE_URL`
  - `GREENHOUSE_OAUTH_CLIENT_ID=kortex`
  - `GREENHOUSE_OAUTH_CLIENT_SECRET`

The secret value must be read from the approved secret source and never printed in logs, docs or chat.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (scope audit) -> Slice 2 (migration/env preflight) -> Slice 3 (Greenhouse broker deploy) -> Slice 4 (Kortex cutover) -> Slice 5 (end-to-end smoke/monitoring).
- Kortex flag `KORTEX_GREENHOUSE_SSO_ENABLED=true` MUST NOT ship before Greenhouse production broker is reachable and its redirect allowlist includes Kortex Production.
- If any smoke fails, rollback by disabling Kortex first.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| CTA productivo apunta a broker inexistente o allowlist incompleta | Kortex auth | medium | Keep `KORTEX_GREENHOUSE_SSO_ENABLED=false` until Greenhouse broker smoke passes | Kortex `/api/auth/callback/greenhouse` errors; browser smoke failure |
| Regresión accidental en SSO/SCIM por release scope amplio | identity | medium | Diff audit + no unrelated Greenhouse promotion + explicit smoke of existing login/SSO/SCIM surfaces | Greenhouse auth logs, SCIM smoke, operator login failures |
| Secret/redirect mismatch entre Vercel env y DB OAuth client | identity|ops | medium | Seed verification + env list without printing secret + callback smoke | Broker `invalid_redirect_uri` / token exchange failure |
| Broker abuse or noisy failures post-cutover | identity|reliability | low | Allowed consumers allowlist + short-lived one-time codes + reliability signals | `identity.sister_platform_oauth.*` |

### Feature flags / cutover

- `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=false` by default. Flip to `true` only after Greenhouse production deploy smoke is green.
- `KORTEX_GREENHOUSE_SSO_ENABLED=false` by default. Flip to `true` only after Greenhouse production broker is healthy and Kortex callback is allowlisted.
- Rollback order: set `KORTEX_GREENHOUSE_SSO_ENABLED=false` and redeploy Kortex; if broker itself causes noise, set `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=false` and redeploy Greenhouse.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | No runtime change | N/A | si |
| Slice 2 | Leave flags disabled; additive migration remains dormant | <5 min | parcial |
| Slice 3 | `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=false` + redeploy/revert release if needed | <10 min | si |
| Slice 4 | `KORTEX_GREENHOUSE_SSO_ENABLED=false` + redeploy Kortex | <10 min | si |
| Slice 5 | Disable Kortex flag first, keep audit evidence for triage | <10 min | si |

### Production verification sequence

1. Verify `TASK-948` is complete or release-approved and not mixed with unrelated Greenhouse changes.
2. Run `pnpm pg:doctor` and migration status checks against the target environment.
3. Deploy Greenhouse production release with broker flag disabled.
4. Smoke existing Greenhouse login and SSO entrypoints before enabling the broker.
5. Enable Greenhouse broker flag and verify authorize route handles invalid/missing params safely.
6. Verify Kortex OAuth client allowlist includes production callback.
7. Deploy Kortex Production with provider env configured and flag still disabled; verify `/login` is 200 and CTA hidden.
8. Enable Kortex flag; verify `/login` shows `Continuar con Greenhouse`.
9. Complete one operator SSO flow through Greenhouse and verify Kortex session.
10. Monitor broker reliability signals and Kortex auth logs for at least one business day.

### Out-of-band coordination required

- Operator access for one real Microsoft/Google/credentials smoke account authorized in Greenhouse.
- Vercel Production env changes for both projects.
- Human approval before promoting any Greenhouse production release that includes identity code.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Greenhouse production exposes the sister-platform OAuth broker behind `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=true`.
- [ ] Existing Greenhouse login, Microsoft SSO, SCIM/provisioning, Graph sync and session behavior are verified unchanged or explicitly out-of-scope with evidence.
- [ ] Kortex Production shows `Continuar con Greenhouse` only after the broker is live and allowlisted.
- [ ] A real end-to-end Kortex -> Greenhouse -> Kortex login succeeds.
- [ ] Rollback is tested or documented with exact env flags and expected time to recovery.
- [ ] `Handoff.md`, `changelog.md`, `docs/tasks/README.md` and the relevant architecture/docs are updated with production outcome.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm build`
- `pnpm pg:doctor`
- `pnpm task:lint --task TASK-949`
- Vercel deploy inspect for Greenhouse Production and Kortex Production
- Browser/Playwright smoke on `https://kortex-kappa.vercel.app/login`
- Manual or agent-assisted Microsoft/Google/credentials SSO smoke through Greenhouse

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Kortex Production flag state and Greenhouse Production flag state are documented at close.

## Follow-ups

- `TASK-413` remains the separate hardening/contract-closure track for the legacy password bridge.
- Open a separate task before deprecating the Kortex password bridge or removing break-glass credentials.

## Open Questions

- Is the Greenhouse production release vehicle a normal `develop -> main` promotion or an approved targeted release of `TASK-948` only? The agent taking this task must decide during Discovery based on the real release state and human approval.
