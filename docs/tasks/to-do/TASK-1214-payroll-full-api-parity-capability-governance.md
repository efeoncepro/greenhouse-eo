# TASK-1214 — Payroll Full API Parity: capability governance del core de nómina

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `api`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-1214-payroll-full-api-parity-capability-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El core de nómina (`src/app/api/hr/payroll/**`) respeta el espíritu de Full API Parity (UI delgada sobre comandos canónicos de `src/lib/payroll/**`), pero NO está parity-complete: ~24 rutas — incluyendo mutaciones (`approve`, `calculate`, `close`, `reopen`, `entries PATCH`, `adjustments POST`, `compensation POST/PATCH`, `projected/promote`) — sólo validan `routeGroup 'hr'`/`efeonce_admin` coarse, sin `can()` a nivel capability; tres usan `roleCodes.includes(EFEONCE_ADMIN)` inline (anti-patrón prohibido); cuatro handlers tienen SQL/lógica inline; y todo el árbol usa `toPayrollErrorResponse` legacy en vez de `canonicalErrorResponse`. Esta task lleva el core de nómina al mismo estándar que ya tiene el sub-dominio de finiquito (referencia interna).

## Why This Task Exists

El ADR `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` evalúa parity a nivel **capability con contrato gobernado**, no a nivel routeGroup. Hoy:

1. **Autorización gruesa**: el catálogo de entitlements sólo tiene 2 capabilities de payroll (`payroll.period.force_recompute`, `payroll.contract.use_international_internal`). Las mutaciones de nómina del día a día no tienen capability fina; cualquiera con routeGroup `hr` o `efeonce_admin` las ejecuta. Esto es over-exposure y bloquea grant governance per-rol.
2. **Anti-patrón inline**: `periods/[id]/reopen`, `reopen-preview` y `adjustments/[id]/approve` resuelven autorización con `hasRoleCode`/`roleCodes.includes(EFEONCE_ADMIN)` inline — exactamente lo que CLAUDE.md prohíbe (la dirección canónica es `can(subject, cap, action, scope)`).
3. **Lógica en el handler, no en el primitive**: `my/payroll`, `admin/payroll/reopen-audit`, `finance/expenses/payroll-candidates` y `periods/[id]/approve` tienen SQL crudo / orquestación inline en vez de delegar a un reader/command de `src/lib`.
4. **Error contract legacy**: `toPayrollErrorResponse` retorna `{ error, code }` sin `actionable` ni es-CL garantizado, fuera del contrato canónico vigente desde 2026-05-14 (riesgo de prosa cruda en UI es-CL).

El gold standard ya existe en el mismo repo: las 11 rutas de `final-settlement/**` usan `assertHrEntitlement` + delegación total + error sanitizado. Esta task replica ese patrón al resto de nómina.

## Goal

- Modelar el set canónico de capabilities de payroll en el catálogo + registry (mismo PR) con grant coverage a roles reales.
- Reemplazar la autorización coarse y los `roleCodes.includes` inline por `can()`/`assertHrEntitlement` en las rutas mutantes y de lectura sensible del core de nómina.
- Extraer los 4 SQL/orquestaciones inline a readers/comandos canónicos en `src/lib/payroll/**`.
- Migrar el árbol `hr/payroll/**` (y `my/payroll/**`) a `canonicalErrorResponse` con códigos de payroll en el enum.
- Dejar el core de nómina parity-complete (autorización fina + lógica en primitive + error canónico), habilitando TASK-1215 (operabilidad de escritura por Nexa).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — §North Star + §Canonical consumers
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md` — actualizar fila de payroll tras cerrar
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — §Invariantes entitlements governance
- `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md` — §Capability grant coverage + ROLE_CODES (14 roles reales)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato de Payroll
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Capability nueva en `capabilities_registry` (DB) + `entitlements-catalog.ts` (TS) + grant a ≥1 rol real en `src/lib/entitlements/runtime.ts`, todo en el MISMO PR (guard `capability-grant-coverage.test.ts` rompe el build si falta — TASK-873/935).
- Migración seed acompañante en el mismo PR para cada capability sembrada (gobernanza TASK-827); markers `-- Up Migration` correctos + bloque DO de verificación post-DDL.
- NUNCA branchear `roleCodes.includes(...)`/`hasRoleCode(...)` inline para autorización: usar `can(subject, cap, action, scope)`.
- Citar SOLO roles del set de 14 reales (`role-codes.ts`); roles HR canónicos esperados: `hr_payroll`, `hr_manager`, `efeonce_admin` (finance donde aplique: `finance_admin`).
- Error de API que cruza al cliente: `canonicalErrorResponse(code, …)`, prose es-CL, sin PII/stack; extender `CanonicalErrorCode` + `CANONICAL_ERRORS` para códigos nuevos.
- Boundary contractor/payroll intacto: esta task NO toca el dominio contractor; gate de cierre `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde.

## Normative Docs

- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` — §Session access lifecycle (predicado de derivación de acceso)
- Skill obligatoria: `greenhouse-payroll-auditor` (cargar antes de tocar `src/lib/payroll/**`)
- Skill: `greenhouse-backend` (rutas, stores, auth helpers)

## Dependencies & Impact

### Depends on

- `src/lib/entitlements/runtime.ts` — grant coverage (existente)
- `src/config/entitlements-catalog.ts` — catálogo de capabilities (existente)
- `src/config/role-codes.ts` — 14 ROLE_CODES reales (existente)
- `src/lib/hr-core/shared.ts` → `assertHrEntitlement` (patrón de referencia)
- `src/lib/api/canonical-error-response.ts` — `CanonicalErrorCode` + `CANONICAL_ERRORS`
- Patrón de referencia: `src/app/api/hr/offboarding/cases/[caseId]/final-settlement/**` (gold standard)

### Blocks / Impacts

- **Blocks** TASK-1215 (Nexa write actionability de payroll) — necesita las capabilities definidas aquí.
- Impacta a consumers UI de payroll: cambian de routeGroup coarse a capability — verificar que los roles operativos (`hr_payroll`, `hr_manager`) reciban grants o se rompe el acceso actual.
- Impacta el gap ledger de parity (fila payroll).

### Files owned

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `migrations/<timestamp>_task-1214-payroll-capabilities-seed.sql`
- `src/app/api/hr/payroll/**/route.ts` (autorización + error contract)
- `src/app/api/my/payroll/route.ts` (extraer SQL inline + error contract)
- `src/app/api/admin/payroll/reopen-audit/route.ts` (extraer SQL inline)
- `src/app/api/finance/expenses/payroll-candidates/route.ts` (extraer SQL inline)
- `src/lib/payroll/api-response.ts` (migrar a canonical o deprecar)
- `src/lib/payroll/*` — readers/comandos nuevos para SQL extraído (`get-my-payroll-snapshot.ts`, `list-reopen-audit.ts`, `get-payroll-expense-candidates.ts`, `approve-payroll-period.ts`)
- `src/lib/api/canonical-error-response.ts` (códigos de payroll)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md`

## Current Repo State

### Already exists

- `src/lib/payroll/**` — capa de dominio canónica completa (calculators, readers, stores, comandos). Las mutaciones ya delegan a comandos; no hay lógica de negocio inline en componentes UI.
- `assertHrEntitlement` (`src/lib/hr-core/shared.ts:222`) — wrapper de `can()`, ya usado por exports LRE/Previred y finiquito.
- 2 capabilities de payroll en catálogo: `payroll.period.force_recompute`, `payroll.contract.use_international_internal`.
- Final-settlement (11 rutas) = implementación de referencia con capability gating completo.
- `canonicalErrorResponse` + `CanonicalErrorCode` enum + `CANONICAL_ERRORS` map.

### Gap

- ~24 rutas core `hr/payroll/**` con sólo `requireHrTenantContext` coarse (sin `can()`).
- `reopen`, `reopen-preview`, `adjustments/[id]/approve` con `roleCodes.includes`/`hasRoleCode` inline.
- SQL/orquestación inline en: `my/payroll/route.ts` (2 SELECT), `admin/payroll/reopen-audit/route.ts` (SELECT), `finance/expenses/payroll-candidates/route.ts` (SELECT), `periods/[id]/approve/route.ts` (readiness + `runPayrollQuery` inline).
- Todo `hr/payroll/**` usa `toPayrollErrorResponse` legacy (sin `actionable`, sin es-CL garantizado).
- Catálogo carece de capabilities para: manage/approve/reopen de período, edit/recalculate de entry, create/approve/revert de ajuste, manage de compensación, promote de proyección, read de export.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: `capabilities_registry` (DB) + `entitlements-catalog.ts` (TS) + rutas `hr/payroll/**`
- Consumidores afectados: `UI (portal HR), my/payroll (self-service), Nexa (futuro via TASK-1215), E2E`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `assertHrEntitlement`, patrón final-settlement, `canonicalErrorResponse`, predicado de session access lifecycle.
- Contrato nuevo o modificado: set de capabilities `payroll.*`, autorización fina en rutas, readers/comandos nuevos para SQL extraído, códigos canónicos de error de payroll.
- Backward compatibility: `gated` — los grants deben cubrir los roles que hoy acceden por coarse, o se rompe el acceso. Verificar paridad de acceso antes de mergear.
- Full API parity: la UI y (futuro) Nexa consumen el mismo command/reader canónico gobernado por capability; cero lógica nueva por consumer.

### Data model and invariants

- Entidades/tablas afectadas: `greenhouse_core.capabilities_registry` (seed), role grants (config TS). NO se altera ninguna tabla de `greenhouse_payroll`.
- Invariantes que no se pueden romper:
  - Capability `can()`-checked SIEMPRE tiene grant a ≥1 rol real (coverage test).
  - Acceso operativo actual de `hr_payroll`/`hr_manager` se preserva (no regresión de acceso).
  - Derivación de acceso respeta el predicado de lifecycle de `user_role_assignments`.
- Tenant/space boundary: `requireHrTenantContext` sigue derivando tenant; `can()` se evalúa sobre el subject de la sesión.
- Idempotency/concurrency: sin cambios — los comandos subyacentes ya manejan su semántica.
- Audit/outbox/history: sin cambios — esta task no altera los eventos existentes.

### Migration, backfill and rollout

- Migration posture: `seed` (capabilities en registry) — additive, idempotente (`IF NOT EXISTS` + bloque DO de verificación).
- Default state: `enabled with rationale` — las capabilities se siembran y se grantean en el mismo PR; el cutover de autorización (coarse → fina) es inmediato al mergear, por eso el grant coverage debe ser exhaustivo ANTES del merge.
- Backfill plan: no aplica (additive seed; no muta datos de nómina).
- Rollback path: `revert PR + reverse migration` (la migración seed tiene Down que borra las capabilities sembradas).
- External coordination: ninguna externa; sign-off operativo HR recomendado por ser cambio de superficie de acceso.

### Security and access

- Auth/access gate: `capability` (`can()`/`assertHrEntitlement`) reemplazando coarse routeGroup.
- Sensitive data posture: `payroll` (PII + montos) — error contract sin PII; readers nuevos no exponen `value_full` ni datos crudos.
- Error contract: `canonicalErrorResponse` con códigos es-CL; `captureWithDomain('payroll'/'hr', …)` para errores internos.
- Abuse/rate-limit posture: sin cambio (las superficies sensibles ya tienen sus límites; `resend-receipt` ya tiene rate-limit).

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding`, `capability-grant-coverage.test.ts`, `pnpm lint`, `pnpm typecheck`.
- DB/runtime checks: `pnpm migrate:up` en staging + verificar capabilities en `capabilities_registry` vía `pg:connect:shell`; smoke de los readers extraídos contra PG real (proxy).
- Integration checks: E2E con agent auth (`hr_payroll` y `hr_manager`) confirmando que las rutas mutantes siguen operables con grant correcto y que un rol sin grant recibe 403 canónico.
- Reliability signals/logs: monitorear `role_view_fallback_used` y errores 403 nuevos post-deploy.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes de acceso, boundary tenant y no-regresión de acceso explícitos.
- [ ] Migración seed idempotente con Down reversible.
- [ ] Evidencia runtime/DB listada (migración + smoke readers + E2E por rol).
- [ ] Error canónico + sin leaks de PII verificados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capabilities + grant coverage (fundación)

- Definir el set canónico de capabilities de payroll en `entitlements-catalog.ts`:
  `payroll.period.manage`, `payroll.period.approve`, `payroll.period.reopen`, `payroll.entry.edit`, `payroll.entry.recalculate`, `payroll.adjustment.create`, `payroll.adjustment.approve`, `payroll.adjustment.revert`, `payroll.compensation.manage`, `payroll.projection.promote`, `payroll.export.read` (ajustar nombres finales en Discovery).
- Migración seed idempotente a `capabilities_registry` (markers correctos + bloque DO de verificación).
- Grants a roles reales en `src/lib/entitlements/runtime.ts` (`hr_payroll`, `hr_manager`, `efeonce_admin`; `finance_admin` donde aplique).
- `capability-grant-coverage.test.ts` verde.

### Slice 2 — Autorización fina en rutas + matar inline roleCodes

- Reemplazar coarse por `assertHrEntitlement(...)`/`can(...)` en las ~24 rutas core (mutantes primero).
- Eliminar `hasRoleCode`/`roleCodes.includes(EFEONCE_ADMIN)` inline en `reopen`, `reopen-preview`, `adjustments/[id]/approve`.
- Verificar paridad de acceso por rol (E2E `hr_payroll`/`hr_manager` operan; rol sin grant → 403 canónico).

### Slice 3 — Extraer SQL/lógica inline a primitives

- `my/payroll/route.ts` → reader `getMyPayrollFinanceSnapshot` en `src/lib/payroll/`.
- `admin/payroll/reopen-audit/route.ts` → reader `listPayrollReopenAudit`.
- `finance/expenses/payroll-candidates/route.ts` → reader `getPayrollExpenseCandidates`.
- `periods/[id]/approve/route.ts` → consolidar en comando `approvePayrollPeriod` (readiness + transición en un primitive).

### Slice 4 — Error contract canónico

- Extender `CanonicalErrorCode` + `CANONICAL_ERRORS` con códigos de payroll (`payroll_period_locked`, `payroll_already_approved`, `payroll_period_not_calculable`, etc.).
- Migrar `hr/payroll/**` y `my/payroll/**` de `toPayrollErrorResponse` a `canonicalErrorResponse`; deprecar o reescribir `src/lib/payroll/api-response.ts` como wrapper canónico.

## Out of Scope

- Operabilidad de escritura por Nexa (`propose → confirm → execute`) → TASK-1215.
- Lane `api/platform/ecosystem`/`app` o MCP para payroll → deuda diferida (documentar en gap ledger).
- Cualquier cambio en cálculo de nómina, deducciones, FX, o lógica de los comandos subyacentes.
- El dominio contractor / finiquito (ya es el gold standard; no se toca salvo lectura de patrón).
- Cambios de UI visible (esta task es backend-data puro; los consumers UI sólo se verifican, no se rediseñan).

## Detailed Spec

El detalle de nombres finales de capabilities, mapping ruta→capability→action→scope, y la lista exacta de códigos de error se resuelve en Discovery (Zone 2) con la skill `greenhouse-payroll-auditor`. Patrón de referencia 1:1: `src/app/api/hr/offboarding/cases/[caseId]/final-settlement/**` (cómo aplica `assertHrEntitlement` + delega + `canonicalErrorResponse`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (capabilities + grants) **MUST** shippear antes que Slice 2 (autorización en rutas). Sin grants, cablear `can()` en las rutas rompe el acceso operativo de HR en producción.
- Slice 2 y Slice 3 pueden solaparse por ruta, pero cada ruta migra autorización y extrae SQL en el mismo commit para no dejar estados intermedios inconsistentes.
- Slice 4 (error contract) puede correr en paralelo con Slice 3 una vez Slice 1 cerró.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Grant incompleto deja a `hr_payroll`/`hr_manager` sin acceso a nómina | payroll / identity | high | Mapear acceso actual ANTES; grants exhaustivos en Slice 1; E2E por rol antes de merge | 403 spike en `hr/payroll/**`; reportes de HR sin acceso |
| Capability `can()`-checked sin grant rompe build | identity | medium | `capability-grant-coverage.test.ts` en CI | build rojo en CI |
| Reader extraído cambia shape de respuesta y rompe UI consumer | payroll / UI | medium | Mantener shape idéntico; smoke contra PG real; E2E de la vista | error de render en `/my/payroll`, `/hr/payroll` |
| Migración seed con markers invertidos → capabilities no creadas | migration | low | Bloque DO de verificación post-DDL (RAISE EXCEPTION) | migración "complete" pero capability ausente en `capabilities_registry` |
| Código de error nuevo no mapeado → prosa cruda | UI / payroll | low | Extender enum + map en Slice 4; revisar consumers | banner con string técnico en UI es-CL |

### Feature flags / cutover

- Sin flag de runtime: el cutover de autorización (coarse → fina) es inmediato al mergear porque depende de grants estáticos en config TS + seed DB. Por eso el grant coverage debe ser exhaustivo y verificado por E2E ANTES del merge. Revert = `revert PR + reverse migration` (<10 min via redeploy).
- Alternativa considerada y descartada: flag por env var para alternar coarse/fina — agrega un branch de autorización dual y deuda; el riesgo se mitiga mejor con grant coverage exhaustivo + E2E.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (borra capabilities sembradas) + revert PR | <10 min | sí |
| Slice 2 | revert PR (vuelve a coarse) + redeploy | <10 min | sí |
| Slice 3 | revert PR (vuelve a SQL inline) + redeploy | <10 min | sí |
| Slice 4 | revert PR (vuelve a `toPayrollErrorResponse`) + redeploy | <10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` en staging + verificar capabilities en `capabilities_registry` (`pg:connect:shell`).
2. Deploy code a staging + E2E con agent auth `hr_payroll`: ejecutar approve/calculate/close/adjustment → 2xx.
3. E2E con `hr_manager` y con un rol sin grant (e.g. `people_viewer`) → el segundo recibe 403 canónico.
4. Smoke de los readers extraídos contra PG real (proxy) → shape idéntico al anterior.
5. Verificar `/my/payroll` y `/hr/payroll` renderizan sin error en staging.
6. Repetir 1-5 en producción con cooldown; monitor de 403 + `role_view_fallback_used` durante 48h.

### Out-of-band coordination required

- Sign-off operativo de HR antes del cutover en prod (cambio de superficie de acceso, aunque el acceso efectivo debe quedar igual). N/A externo (repo + DB only).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cada mutación del core de nómina está gateada por una capability `payroll.*` vía `can()`/`assertHrEntitlement` (cero coarse-only en rutas mutantes).
- [ ] Cero `roleCodes.includes`/`hasRoleCode` inline para autorización en `hr/payroll/**`.
- [ ] Cada capability nueva tiene grant a ≥1 rol real y `capability-grant-coverage.test.ts` pasa.
- [ ] Los 4 handlers con SQL/orquestación inline delegan a un reader/comando de `src/lib/payroll/**`.
- [ ] `hr/payroll/**` y `my/payroll/**` retornan `canonicalErrorResponse` con códigos es-CL (sin `toPayrollErrorResponse` crudo).
- [ ] Migración seed idempotente con bloque DO de verificación y Down reversible.
- [ ] E2E por rol confirma paridad de acceso (HR opera, rol sin grant → 403 canónico) sin regresión.
- [ ] `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde (no regresión finiquito/offboarding).
- [ ] Fila de payroll del gap ledger actualizada.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (full suite al cierre)
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding`
- `pnpm build`
- E2E con agent auth por rol (`hr_payroll`, `hr_manager`, rol sin grant)
- Smoke de readers extraídos contra PG real (proxy)

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con lo aplicado, verificado y pendientes
- [ ] `changelog.md` actualizado (cambio de superficie de autorización)
- [ ] chequeo de impacto cruzado (TASK-1215 desbloqueada; otras tasks que tocan `hr/payroll/**`)
- [ ] gap ledger de Full API Parity actualizado (fila payroll)
- [ ] `greenhouse-documentation-governor` + `pnpm docs:closure-check` ejecutados
- [ ] `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed` ejecutados

## Follow-ups

- TASK-1215 — Payroll Nexa write actionability (`propose → confirm → execute`).
- Deuda diferida: lane `api/platform/ecosystem`/`app` + MCP para payroll (documentar en gap ledger con owner + condición de retiro).

## Open Questions

- Nombres finales de capabilities y granularidad (¿`payroll.period.manage` agrupa calculate+close o se separan?). Resolver en Discovery con `greenhouse-payroll-auditor`.
- ¿`payroll.export.read` ya está cubierto por las capabilities de LRE/Previred o necesita una nueva? Verificar en Discovery.
