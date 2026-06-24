# TASK-1178 — Triage de routes session-coarse + backfill de capability fina

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `api`
- Epic: `optional`
- Status real: `Diseño — derivada de TASK-1172 (gap ledger). Rank #2 del backlog de parity. Triage + backfill, NO big-bang.`
- Rank: `TBD`
- Domain: `platform|api|agent-governance|quality`
- Blocked by: `none`
- Branch: `task/TASK-1178-session-coarse-capability-backfill`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Verificar las **343 routes de mutación `session-coarse`** que midió TASK-1172 (sin `can()` en el boundary del route) y **backfillar la capability fina** en el subconjunto donde el command tampoco la chequea (deuda admin-coarse real). Sin este backfill, esas acciones no son cleanly Nexa-operables (el action runtime gatea por capability).

## Why This Task Exists

El reader de TASK-1172 clasificó 71% de las routes de mutación como `session-coarse`: gobernadas por sesión/tenant/route-group pero sin `can()` en el archivo del route. **Eso NO es veredicto de deuda** — el patrón canónico empuja el `can()` al command en `src/lib` (ej. `enable-sync`). Pero un subconjunto no tiene capability en ninguna capa = deuda admin-coarse real, que bloquea la operabilidad fina (Nexa/MCP gatean por capability). Esta task separa el grano de la paja y remedia el subconjunto real.

## Goal

- Triage per-route de las 343 `session-coarse`: ¿el command tiene `can()`? (OK) ¿ninguna capa? (deuda).
- Backfillar `can()` + capability del catálogo en el subconjunto de deuda, priorizando alta frecuencia + escritura sensible.
- Cada capability nueva nace con grant en `runtime.ts` (guard `capability-grant-coverage.test`).
- Re-correr el reader y mostrar `session-coarse` bajando.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capabilities + grants.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md` — backlog (rank #2) + la cola session-coarse.
- `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md` — alimenta.
- Skills: `greenhouse-backend`, `arch-architect`.

Reglas obligatorias:

- **NUNCA** clasificar una route como "deuda" sin verificar el command (el `can()` puede vivir ahí — mejor patrón).
- **SIEMPRE** capability nueva ⇒ grant en `src/lib/entitlements/runtime.ts` en el mismo PR (rol real de `role-codes.ts`).
- **NUNCA** branchear `roleCodes.includes(...)` inline (usar `can()`).
- **NUNCA** big-bang: backfill por dominio, en waves, con tests focales.

## Normative Docs

- Reader `scripts/audit/full-api-parity-coverage.ts` (lista las routes session-coarse vía `--json`).

## Dependencies & Impact

### Depends on

- `capabilities_registry` + `entitlements-catalog` + `runtime.ts` — existen.
- Reader TASK-1172 — existe (provee la cola).

### Blocks / Impacts

- Alimenta TASK-658 (resource authorization bridge) y TASK-1177 (write operability necesita capability).

### Files owned

- `src/app/api/**/route.ts` (subconjunto session-coarse de deuda) — agregar `can()`
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` — capabilities/grants nuevos
- migration seed de `capabilities_registry` por capability nueva

## Current Repo State

### Already exists

- 93 routes capability-governed (19%), patrón `can()` canónico.
- Reader que enumera las 343 session-coarse.

### Gap

- Subconjunto de session-coarse sin capability en ninguna capa = admin-coarse.
- No hay triage que separe "capability en el command" de "sin capability".

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `capabilities_registry` (additive seeds)
- Consumidores afectados: routes + Nexa/MCP operability
- Runtime target: `staging` → `Production`

### Contract surface

- Contrato existente a respetar: `can()` + grant coverage guard
- Contrato nuevo: capabilities finas en el subconjunto de deuda
- Backward compatibility: `compatible` (la capability se grantea a los roles que hoy ya pasan el tenant-gate → sin pérdida de acceso)
- Full API parity: cierra el gap de gobernanza a nivel capability

### Data model and invariants

- Entidades: `capabilities_registry` rows + grants
- Invariantes: capability ⇒ grant ≥1 rol real; sin over/under-exposure
- Tenant/space boundary: preservado (el `can()` no relaja el tenant-gate existente)
- Idempotency/concurrency: N/A (auth check)
- Audit/outbox/history: sin cambio (audit del command preexistente)

### Migration, backfill and rollout

- Migration posture: `additive` (seeds de capabilities_registry)
- Default state: capability granteada a los roles que ya tenían acceso por route-group (no-regression)
- Backfill plan: por dominio, en waves; verificar que ningún rol pierde acceso
- Rollback path: revert PR (migration down de seeds + quitar `can()`)
- External coordination: ninguna

### Security and access

- Auth/access gate: `can(tenant, '<cap>', action, scope)` nuevo
- Sensitive data posture: sin cambio
- Error contract: `canonicalErrorResponse('unauthorized')` es-CL
- Abuse/rate-limit posture: N/A

### Runtime evidence

- Local checks: `capability-grant-coverage.test` verde + tests de route
- DB/runtime checks: seed aplicado en `capabilities_registry`
- Integration checks: rol con acceso previo sigue pasando; rol sin acceso es 403
- Reliability signals/logs: N/A
- Production verification sequence: staging por dominio → verificar no-regression → prod

### Acceptance criteria additions

- [ ] Triage completo de las 343 session-coarse (con-command-can vs deuda).
- [ ] Subconjunto de deuda backfilleado con `can()` + capability + grant.
- [ ] Ningún rol pierde acceso (no-regression verificada).

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Triage de las routes session-coarse

Correr el reader (`--json`), y por cada route verificar si el command que invoca tiene `can()`. Producir la lista de deuda real (sin capability en ninguna capa), priorizada por dominio + frecuencia + sensibilidad de escritura.

### Slice 2 — Backfill por dominio (wave 1: alto valor)

Para el subconjunto de deuda de mayor valor: agregar `can()` en el route (o el command), seedear la capability en `capabilities_registry` + catalog + grant en `runtime.ts`, granteándola a los roles que hoy ya pasan el tenant-gate (no-regression). Tests focales.

### Slice 3 — Re-medición + waves siguientes

Re-correr el reader, registrar el delta, y dejar enrutadas las waves siguientes en el ledger.

## Out of Scope

- Construir tools de Nexa (TASK-1177).
- Exponer reads lib-only como API (TASK-1179).
- Reescribir la lógica de negocio de las routes (solo gobernanza fina).

## Detailed Spec

El criterio para "deuda real": la route muta estado de negocio y ni el route ni su command chequean una capability del catálogo (solo route-group/tenant). El backfill grantea la capability a los roles que ya tenían el acceso coarse → cero pérdida de acceso, solo gobernanza fina + Nexa-operabilidad.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (triage) → Slice 2 (backfill wave 1) → Slice 3 (re-medición). NUNCA backfillar sin verificar primero que el command no tenga ya el `can()`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Backfill quita acceso a un rol que hoy lo tiene | identity | medium | granteár a los roles del tenant-gate actual + test no-regression | `role_view_fallback_used` / 403 inesperado |
| Falso "deuda" (el command ya tiene can) | quality | medium | verificar el command per-route antes de tocar | review |
| capability sin grant rompe build | identity | low | guard `capability-grant-coverage.test` | CI |

### Feature flags / cutover

- Sin flag — el `can()` se grantea a los roles con acceso actual (additive, sin pérdida). Cutover inmediato por dominio.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert doc | <5 min | sí |
| 2 | migration down de seeds + revert `can()` | <15 min | sí |
| 3 | revert doc | <5 min | sí |

### Production verification sequence

1. Seed capabilities en staging + grant.
2. Verificar rol con acceso previo pasa; rol sin acceso → 403.
3. Aplicar prod por dominio, cooldown entre waves.
4. Re-correr reader post-wave.

### Out-of-band coordination required

- N/A — repo-only change (sin sistemas externos).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Triage de las 343 session-coarse con la lista de deuda real.
- [ ] Wave 1 de deuda backfilleada: `can()` + capability + grant + migration seed.
- [ ] `capability-grant-coverage.test` verde (sin capability huérfana).
- [ ] No-regression de acceso verificada por rol.
- [ ] `pnpm lint` + `pnpm tsc --noEmit` + tests verdes; reader re-corrido con delta.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/entitlements`
- `pnpm pg:connect:status` (seeds aplicados)
- Reader TASK-1172 re-corrido.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md`
- [ ] chequeo de impacto cruzado (TASK-1172, TASK-658, TASK-1177)
- [ ] reader TASK-1172 re-corrido con delta registrado

## Follow-ups

- Waves siguientes de backfill por dominio.
- Lint/signal de cobertura de parity (anti-regresión de nuevas routes session-coarse).

## Open Questions

- ¿Umbral de "alta frecuencia / alto valor" para la wave 1? (definir con owners de dominio).
