# TASK-1277 — AEO Entitlement & Metering Platform (per-org tiers + run chokepoint)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1277-aeo-entitlement-metering-platform`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte AEO de "un viewCode prendido a todos los roles cliente" (error de plano de TASK-1248) a un **servicio con entitlement por organización + run gobernado y metered**: un solo motor, **cuatro puertas** — público (lead magnet, ya existe), **contratado** (Grupo Berel, parte del servicio), **trial PLG** (clientes existentes sin AEO reciben 1–3 revisiones/mes self-serve, con cap mensual + tope global de costo) y **operador** (Growth/AM corre el motor sobre cualquier cliente o **prospecto HubSpot** como jugada de venta — capability-gated, **sin tope** (ilimitado), costo atribuido a "sales"). El corazón es un **chokepoint gobernado de run** que chequea entitlement + ventana + allowance ANTES de incurrir costo: `requestGraderRunForOrganization` (puertas cliente) y `requestGraderRunAsOperator` (puerta operador).

## Why This Task Exists

El motor del grader cuesta dinero real por run (~$0.10–0.15 light, ceiling $0.50). Hoy: (1) el run admin NO tiene guard de costo y el run de portal cliente NO existe; (2) TASK-1248 sembró `cliente.ai_visibility_report` a los 3 roles `client_*` vía `role_view_assignments` → visible a TODO cliente, sin relación con contratación. AEO es un **servicio contratado por organización**, y el cross-sell a clientes existentes (Motor 1 de expansión, ~50% win) debe ser **PLG con trial acotado** — "si lo dejo freepass van a gastar más de lo que retorna". Falta el plano de entitlement por-org + el gobierno de costo del run.

## Goal

- AEO modelado como **módulo del portal** (`ai_visibility_v1`) gateado por `module_assignments` per-org, no por rol. Revertir el grant por-rol de TASK-1248.
- **Chokepoint gobernado de run** que aplica, en todas las puertas de portal: entitlement → ventana (`expires_at`) → allowance (cupo) → costo. Self-serve nunca saltea el cupo.
- Tiers provisionables: **contratado** (Berel, cadencia/contrato), **trial PLG** (1–3 runs/mes, reset mensual, tope global), **pilot** (AM, acotado). Grupo Berel = `active`; clientes existentes = trial default.
- **Puerta operador (4.ª)**: `requestGraderRunAsOperator` permite a Growth/AM correr el motor sobre cualquier cliente **o prospecto (org tipo prospect sincronizada de HubSpot company, TASK-706)** — capability `growth.ai_visibility.run.operator`, **ilimitado** (sin tope), costo atribuido a "sales", NO al allowance del cliente. Habilita el cross-sell de TASK-1276/1279.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (motor, run lifecycle, cost ceiling, abuse guard)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` + `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` (módulos cliente + assignments)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (un motor, muchos consumers — el run es UN command gobernado)
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` (provisión: lifecycle_case / commercial_terms_cascade)
- `docs/context/08_estrategia-comercial.md` + `docs/context/11_hubspot-bowtie.md` (cross-sell = Motor 1; pipeline Expansion; deal property `aeo_check_result`)

Reglas obligatorias:

- TODO run de portal pasa por el chokepoint gobernado; NUNCA llamar `enqueueGraderDiagnostic`/`runGraderDiagnostic` directo desde una ruta de portal sin pasar por el gate.
- El gate del costo es per-org **y** global (tope mensual de trials, espeja el budget diario público de `abuse-guard.ts`).
- Reuse del vocabulario existente: `module_assignments.status` (`active`/`pilot`/`pending`), `pricing_kind` (`pilot_no_cost`/`addon_fixed`/`addon_usage`), `source` (`commercial_terms_cascade`/`manual_admin`/`default_business_line`), `expires_at` (CHECK ya obliga expiry en pilots).
- El viewCode `cliente.ai_visibility_report` se gatea por **módulo asignado**, NO por `role_view_assignments` (revertir el grant de TASK-1248).
- Capability + grant en el mismo PR; errores canónicos; sin leaks; runs append-only.

## Normative Docs

- `docs/tasks/complete/TASK-1248-growth-ai-visibility-client-report-ui.md` (viewCode + grant a revertir)
- `docs/tasks/to-do/TASK-1270-growth-ai-visibility-recurring-sov-regrade.md` (cadencia del tier contratado)
- `migrations/20260512184739712_task-824-client-portal-ddl.sql` (modules + module_assignments)
- `src/lib/growth/ai-visibility/public-intake/abuse-guard.ts` (patrón de rate-limit + budget a espejar)

## Dependencies & Impact

### Depends on

- `greenhouse_client_portal.modules` + `module_assignments` (existe, TASK-824).
- Motor del grader: `enqueueGraderDiagnostic` / `runGraderDiagnostic` / `createPublicGraderRun` + `policy.ts` (cost ceiling) + `cost.ts`.
- `grader_profiles.organization_id` (binding org↔profile, TASK-1243) — un trial run necesita un profile de la org.
- `resolveClientPortalModulesForOrganization` + `menu-builder` + `requireViewCodeAccess` (gate per-org ya funcional).

### Blocks / Impacts

- **TASK-1278** (UX tiering + PLG trial) — consume el chokepoint + el allowance reader.
- TASK-1248 (vista cliente `/aeo`) — pasa a gatearse por módulo (revertir grant por-rol + ajustar parity test).
- TASK-1276 (vista operador) — el cockpit lista orgs con AEO (contratado/trial); cross-impact.
- TASK-1270 (recurring re-grade) — el tier contratado usa su cadencia; el allowance del chokepoint la respeta.

### Files owned

- `migrations/<ts>_task-1277-aeo-module-seed-and-allowance.sql` (módulo + allowance + revert grant + assignments)
- `src/lib/growth/ai-visibility/entitlement.ts` (resolver de tier/allowance per-org) `[verificar naming]`
- `src/lib/growth/ai-visibility/request-run.ts` (`requestGraderRunForOrganization` chokepoint) `[verificar]`
- `src/app/api/client-portal/growth/ai-visibility/run/route.ts` (run gobernado de portal) `[verificar]`
- `src/lib/entitlements/*` (capability + grant del run de portal)
- `src/lib/admin/client-role-visibility.test.ts` (ajustar: AEO ya no es client view role-wide)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (Delta: entitlement & metering)

## Current Repo State

### Already exists

- Motor del grader (chokepoints `enqueue`/`run`, cost ceiling por modo, public abuse-guard con per-email/IP + budget diario global).
- `module_assignments` con `pilot`/`expires_at`/`pricing_kind`/`source` — vocabulario completo de tiers.
- Gate per-org del portal (`resolveClientPortalModulesForOrganization` → menu + page guard).
- `grader_profiles.organization_id` binding (TASK-1243).

### Gap

- No hay módulo AEO seedeado; no hay run de portal cliente; no hay allowance per-org ni reset mensual; el grant de AEO está por-rol (mal); no hay tope global de trials; el run admin no tiene guard de costo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (acceso + costo + dinero-adyacente + cutover de un grant ya live)
- Impacto principal: `migration` (+ `command` + `reader` + `api`)
- Source of truth afectado: `module_assignments` (entitlement) + nueva allowance per-org + `grader_runs` (atribución)
- Consumidores afectados: UI cliente (TASK-1278) · UI operador (TASK-1276) · Nexa/MCP · cron recurring (TASK-1270)
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `enqueueGraderDiagnostic` (idempotente) + `resolveClientPortalModulesForOrganization` + cost ceiling de `policy.ts`.
- Contrato nuevo: `requestGraderRunForOrganization({ organizationId, requestedBy })` (chokepoint) + `resolveAeoEntitlement(organizationId)` (tier + allowance restante) + run route de portal + evento outbox de run consumido.
- Backward compatibility: `gated` (el grant por-rol se revierte; el viewCode pasa a módulo).
- Full API parity: el run es UN command gobernado; UI/Nexa/MCP/cron son clientes del mismo chokepoint.

### Data model and invariants

- Entidades: `greenhouse_client_portal.modules` (+1 fila `ai_visibility_v1`), `module_assignments` (Berel `active` + trial default), allowance per-org-per-period (columna/tabla `[verificar shape]`), `grader_runs` (atribución `organization_id`/`assignment_id`).
- Invariantes:
  - Ningún run de portal sin entitlement `active`/`pilot` vigente + allowance > 0.
  - Trial: allowance N/mes (config, default 3) con **reset mensual**; tope global mensual de trials (cost backstop).
  - Contratado: allowance por cadencia/contrato (no ilimitado self-serve).
  - `status='pilot'` ⇒ `expires_at` NOT NULL (CHECK existente).
  - Un trial run requiere `grader_profiles.organization_id` enlazado (auto-provisión desde dominio de la org o intake liviano — ver Open Questions).
- Tenant/space boundary: el run se ancla a la org de sesión (`requireClientTenantContext`); jamás corre para una org sin entitlement.
- Idempotency/concurrency: el chokepoint reusa la idempotencia de `enqueueGraderDiagnostic` + claim atómico del contador de allowance (sin doble-consumo bajo carrera).
- Audit/outbox/history: consumo de allowance auditado; runs append-only; atribución de costo per-org.

### Migration, backfill and rollout

- Migration posture: `additive` (módulo + allowance + assignments) + `data cutover` (revert del grant por-rol de TASK-1248).
- Default state: trial `default_business_line` para client orgs detrás de flag (default OFF en prod hasta staging shadow); Berel `active`.
- Backfill plan: asignar trial a las client orgs existentes (allowlist → batch); Berel `active` explícito; (dry-run primero).
- Rollback path: re-aplicar el grant por-rol (revert de la migration) + flag OFF del chokepoint de portal.
- External coordination: definir con comercial qué orgs son "contratado" vs "trial"; sign-off de costo del tope global.

### Security and access

- Auth/access gate: run de portal gateado por capability + módulo asignado; viewCode por módulo (no rol).
- Sensitive data posture: sin PII nueva (org_id + counts + cost); el email del lead magnet NO entra por esta puerta (puerta pública aparte).
- Error contract: `canonicalErrorResponse` (`forbidden` sin entitlement, `rate_limited`/`quota_exhausted` sin allowance, `cost_blocked` por tope global) + `captureWithDomain(err,'growth',…)`.
- Abuse/rate-limit posture: allowance per-org + tope global mensual de trials + reuse del cost ceiling por run (defense in depth).

### Runtime evidence

- Local checks: focal tests del entitlement resolver (3 tiers) + chokepoint (allow/deny/exhausted/expired) + reset mensual + capability coverage.
- DB/runtime checks: `pnpm migrate:up` + verify módulo/assignments/allowance + smoke del chokepoint contra PG real (run permitido para Berel, bloqueado/trial para otra org).
- Integration checks: run enqueued vía chokepoint → worker ejecuta → report rendable; atribución de costo registrada.
- Reliability signals/logs: signal de allowance exhausted / tope global tripped / runs sin entitlement (debería ser 0).
- Production verification sequence: migrate staging → shadow (flag OFF, medir) → flip trial low-volume → smoke → prod.

### Acceptance criteria additions

- [ ] Source of truth (módulo + assignments + allowance), contract surface (chokepoint + resolver + run route) y consumers nombrados.
- [ ] Invariantes (no run sin entitlement+allowance, reset mensual, tope global, pilot expiry, profile binding) explícitos.
- [ ] Migration additive + cutover del grant por-rol con rollback explícito + bloque DO de verificación.
- [ ] DB/runtime evidence (smoke chokepoint Berel-allow vs other-deny/trial) listada.
- [ ] Capability + grant del run de portal en el mismo PR + coverage; errores canónicos; sin leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Módulo AEO + revert del grant por-rol

- Seed `ai_visibility_v1` en `greenhouse_client_portal.modules` (tier `addon`, `applicability_scope` `cross`, `view_codes=['cliente.ai_visibility_report']`, capabilities + data_sources).
- Revertir el grant de `cliente.ai_visibility_report` en `role_view_assignments` (los 3 client roles) → gateado por módulo.
- Ajustar `client-role-visibility.test.ts` (AEO deja de ser client view role-wide; queda module-gated).

### Slice 2 — Allowance model + tiers

- Allowance per-org-per-period: tier `contracted` (cadencia/contrato), `trial` (N/mes, default 3, reset mensual), `pilot` (acotado + expiry).
- Tope global mensual de trials (cost backstop, espeja `abuse-guard`); config por env.
- Reader `resolveAeoEntitlement(organizationId)` → `{ tier, allowanceRemaining, periodResetAt, blockedReason? }`.

### Slice 3 — Run chokepoint gobernado + run route de portal

- `requestGraderRunForOrganization({ organizationId, requestedBy })`: gate entitlement → expiry → allowance → costo; consume allowance atómico; enqueue vía `enqueueGraderDiagnostic`; atribución `organization_id` en `grader_runs`.
- Route `POST /api/client-portal/growth/ai-visibility/run` (capability + módulo) → chokepoint.
- **Puerta operador**: `requestGraderRunAsOperator({ subjectOrganizationId, requestedBy })` (sujeto = cliente o prospecto org-sincronizada de HubSpot) — capability `growth.ai_visibility.run.operator`, **sin allowance/tope** (ilimitado), costo atribuido a "sales"; reusa el mismo enqueue + cost ceiling por-run. Route operador interna `[verificar lane]`.
- Capability + grant del run de portal **y** del run operador (mismo PR) + coverage.

### Slice 4 — Provisión: Berel + trial default + commercial hook

- Asignar `active` a Grupo Berel (`manual_admin`/`commercial_terms_cascade`).
- Trial default a client orgs existentes (`source='default_business_line'`, backfill allowlist behind flag).
- Hook `commercial_terms_cascade`: al vender AEO, auto-provisiona `active` (o documentar follow-up si se difiere).

### Slice 5 — Observabilidad + signals

- Signals: allowance exhausted, tope global tripped, runs sin entitlement (=0 esperado), atribución de costo per-org.

## Out of Scope

- UX del tiering / PLG trial / upsell (TASK-1278).
- Vista operador (TASK-1276).
- Corporate-email gate del lead magnet público (TASK-1254/1263) y recurring re-grade (TASK-1270) — ya tienen task.
- Billing real / facturación del costo atribuido (solo atribución, no invoice).

## Detailed Spec

Tres puertas, un motor:

```text
Público (prospecto)      → createPublicGraderRun (captcha + per-email/IP + budget diario global)  [existe]
Portal contratado (Berel)→ requestGraderRunForOrganization → tier=contracted (cadencia/contrato)
Portal trial PLG         → requestGraderRunForOrganization → tier=trial (N/mes, reset, tope global)
Portal pilot (AM)        → requestGraderRunForOrganization → tier=pilot (acotado + expires_at)
```

El chokepoint es el único punto de entrada de runs de portal; reusa el cost ceiling por-run de `policy.ts` y la idempotencia de `enqueueGraderDiagnostic`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (módulo + revert grant) → Slice 2 (allowance) → Slice 3 (chokepoint + route) → Slice 4 (provisión Berel + trial) → Slice 5 (signals). El run de portal (S3) no se prende en prod hasta S2 (allowance) y el revert del grant (S1) en el mismo release para no dejar AEO ni doble-expuesto ni inaccesible.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Trial freepass quema costo | growth/finance | high | allowance per-org + reset + tope global + flag default OFF + shadow | `aeo trial budget tripped` |
| AEO inaccesible para Berel tras revert del grant | access | medium | módulo+assignment Berel en el MISMO release que el revert | page guard 403 inesperado |
| Run de portal sin gate (bypass) | growth/cost | medium | un único chokepoint + lint/review de que ninguna route de portal llame enqueue directo | runs sin entitlement > 0 |
| Doble-consumo de allowance bajo carrera | growth | low | claim atómico del contador en tx | allowance negativo |
| Trial sin profile de la org | growth | medium | auto-provisión de profile desde dominio org o intake liviano (Open Q) | run trial falla por falta de profile |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_PORTAL_RUN_ENABLED` (default OFF): habilita el run de portal (chokepoint). Flip post-staging shadow.
- `GROWTH_AI_VISIBILITY_TRIAL_ENABLED` (default OFF): habilita el tier trial PLG. Flip low-volume tras medir costo en shadow.
- Config: `..._TRIAL_RUNS_PER_MONTH` (default 3), `..._TRIAL_GLOBAL_MONTHLY_BUDGET_USD`.
- Revert: flags OFF + reverse migration (re-aplica grant por-rol).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (re-aplica grant por-rol + drop módulo) | <10 min | sí |
| Slice 2 | revert PR (allowance reader) | <10 min | sí |
| Slice 3 | flag `PORTAL_RUN_ENABLED` OFF | <5 min | sí |
| Slice 4 | revert assignments (effective_to) | <10 min | sí (append-only) |
| Slice 5 | revert PR (signals) | <5 min | sí |

### Production verification sequence

1. `pnpm migrate:up` staging + verify módulo + assignments (Berel active) + allowance + grant revertido.
2. Deploy staging flags OFF → verify Berel ve `/aeo` por módulo (no por rol) + otra org NO lo ve.
3. Flip `PORTAL_RUN_ENABLED` staging → smoke run Berel (allow) + smoke run otra org sin trial (deny).
4. Flip `TRIAL_ENABLED` staging low-volume → smoke trial (N/mes, exhausted, reset) + medir costo.
5. Repetir en prod con cooldown + monitor signals 7d.

### Out-of-band coordination required

- Comercial: definir orgs `contracted` vs `trial`, y el número trial (1–3/mes) + tope global. Sign-off de costo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] AEO se gatea por módulo `ai_visibility_v1` asignado per-org; el grant por-rol de TASK-1248 quedó revertido (3 `client_*`) y `client-role-visibility.test.ts` ajustado.
- [x] `requestGraderRunForOrganization` es el único entrypoint de runs de portal: gate entitlement → expiry → allowance → costo, consumo atómico (lock `FOR UPDATE`), atribución `organization_id`.
- [x] Trial PLG: N/mes (default **1**, config) con reset mensual + tope global; `aeo_quota_exhausted`/`aeo_cost_blocked` honestos. _(número trial = decisión comercial: 1/mes; flip gateado por flag + sign-off — rollout pendiente)._
- [x] Grupo Berel = `active` (tier contratado); una org sin entitlement NO ve el módulo ni puede correr (smoke real: Aguas Andinas → `not_entitled`). _(Berel "ve `/aeo`" depende del profile binding org — TASK-1278; hoy el render con datos reales espera ese binding.)_
- [x] Capability del run de portal (`run.portal`) + del operador (`run.operator`) + grants en el mismo PR + coverage; errores canónicos; runs append-only; sin leaks.
- [x] Flags default OFF; staging shadow + sign-off de costo = **rollout pendiente** (code complete).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` + verify `information_schema` + smoke del chokepoint (Berel allow / other deny / trial exhausted+reset) contra PG real

## Closing Protocol

- [x] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [x] archivo en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] chequeo de impacto cruzado (TASK-1248, TASK-1276, TASK-1278, TASK-1270) — ver Delta abajo
- [x] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (entitlement & metering)

## Follow-ups

- HubSpot expansion signal: cuando una org agota el trial o engancha → señal de cross-sell al pipeline Expansion + `aeo_check_result` (Motor 1). Posible task comercial.
- Billing/atribución real del costo AEO per-org (hoy solo atribución).

## Open Questions — resueltas

- **Profile del trial run:** RESUELTA (opción robusta) — el chokepoint **exige** un `grader_profile` enlazado a la org (`getGraderProfileForOrganization`); si falta → `aeo_profile_required` (sin adivinar). La auto-provisión desde el dominio / intake liviano es **UX de TASK-1278/1276** (binding `grader_profiles.organization_id`). Por eso Berel hoy resuelve `profile_required`.
- **Número trial + tope global:** RESUELTA (decisión del operador) — trial **1/mes**, contratado **20/mes** (fair-use), pilot **3/mes**, tope global de trials **$25/mes**. Todos env-override (`GROWTH_AI_VISIBILITY_*`), defaults conservadores. Flip de costo gateado por flag + sign-off.
- **Allowance del contratado:** RESUELTA — fair-use cap configurable (`_CONTRACTED_RUNS_PER_MONTH=20`), no ilimitado self-serve; la cadencia de TASK-1270 consume el mismo allowance del mes.

## Cross-impact 2026-06-28 (cierre TASK-1277)

- **TASK-1248** (vista cliente `/aeo`): el grant role-wide quedó revertido; el acceso ahora es por módulo `ai_visibility_v1`. Su page guard se reforzó (capability + `hasModuleAccess`). El `client-role-visibility.test` quedó recalibrado (AEO module-gated).
- **TASK-1278** (UX tiering + PLG trial): consume el chokepoint + `resolveAeoEntitlement` (tier/allowance/periodResetAt/blockedReason) — ya disponibles. Dueña del profile binding (intake/auto-provisión) que hoy bloquea el run real (`aeo_profile_required`).
- **TASK-1276** (vista operador): consume `requestGraderRunAsOperator` + capability `growth.ai_visibility.run.operator` + route `/api/admin/growth/ai-visibility/operator-run` — ya disponibles.
- **TASK-1270** (recurring re-grade): el tier contratado usa su cadencia y consume el mismo allowance mensual del chokepoint.

## Delta 2026-06-29 — rollout staging aplicado (code complete → staging operativo)

- **Flags staging ON:** `GROWTH_AI_VISIBILITY_PORTAL_RUN_ENABLED=true` + `GROWTH_AI_VISIBILITY_TRIAL_ENABLED=true` en el environment `staging` de Vercel (el kill switch `GRADER_ENABLED` ya estaba ON). Revert: `vercel env rm` de los 2 en staging.
- **Binding del contratado resuelto:** se creó el `grader_profile` de Grupo Berel enlazado a su org (`EO-GAVP-0014`), con la web `https://berel.com` **derivada de la organización canónica** (la persistencia de `organizations.website_url` la cerró **TASK-1285**, hermana de este rollout — antes Berel no tenía web en la org). Script idempotente `scripts/growth/provision-grader-profile-for-org.ts --apply`. Esto desbloquea el `aeo_profile_required` que la spec dejaba abierto para el contratado.
- **Smoke real del chokepoint (PG dev/staging):** Berel (tier `contracted`, allowance 20, no bloqueado) → `requestGraderRunForOrganization` **accepted**, run `portal_contracted`/`light` encolado con atribución per-org y **drenado por el worker de staging** (status `running`→genera el informe real). Org sin entitlement (`org-nonexistent-smoke-1277`) → `resolveAeoEntitlement.hasModule=false` / `no_entitlement` (denied). Las 3 puertas del chokepoint (allow contratado / deny no-entitled / profile binding) verificadas en runtime real.
- **Provisión trial NO ejecutada (decisión comercial pendiente):** **hoy solo Grupo Berel está contratado.** Exponer el tier trial PLG a otras client orgs (`scripts/growth/provision-aeo-trials.ts --apply`) es una acción outward-facing (les pinta el banner AEO en su portal) que queda al sign-off comercial del operador — el flag `TRIAL` está ON pero inerte sin assignments trial.
- **Prod:** sigue OFF — gated por el launch de EPIC-020 vía release control plane (NO se toca en este rollout). Verificación en vivo del portal de Berel (`/aeo` → "Generar revisión") disponible tras el redeploy de staging que toma los flags nuevos.

## Delta 2026-06-28 — conectada al Master UI Flow del programa AEO

- Esta task es el nodo **gate de resolución de superficie por entitlement/tier** (decide qué muestra cada superficie cliente) del flujo cross-surface del programa AEO. Su UI/flujo se conecta con todas las demás superficies (público → email/PDF → portal cliente tiers/PLG → operador cross-sell → Account 360) en el doc maestro **`docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md`** (info-architecture + state-design + ux-writing + modern-ui). Toda UI del programa renderiza el `ReportArtifactModel` compartido (TASK-1252) y deriva su visibilidad del **entitlement** (TASK-1277), nunca del rol; cada acción mapea a un command gobernado (Full API Parity → Nexa por construcción).
