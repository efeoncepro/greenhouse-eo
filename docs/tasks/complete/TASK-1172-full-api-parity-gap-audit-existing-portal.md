# TASK-1172 — Auditoría de parity gap del portal existente (deuda visible + mapeo a tools Nexa)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- Backend impact: `reader`
- Epic: `optional`
- Status real: `Auditoría: inventariar y clasificar las capabilities existentes vs Full API Parity para hacer la deuda VISIBLE y PRIORIZADA, y mapearla a la cobertura de tools de Nexa. Read-only (no cambia runtime). Disparador: directiva CEO 2026-06-19 (Nexa total operability) + brechas reales halladas (rollup ICO hardcoded, enable-sync admin-coarse).`
- Rank: `TBD`
- Domain: `platform|api|agent-governance|quality|nexa`
- Blocked by: `Nada. Lee código + registries + Nexa tools. Consume el contrato canónico de Full API Parity (GREENHOUSE_FULL_API_PARITY_DECISION_V1).`
- Branch: `task/TASK-1172-full-api-parity-gap-audit`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Producir un **inventario + clasificación de las capabilities existentes del portal contra Full API Parity**, para convertir la deuda invisible en un **ledger visible y priorizado**, y mapearlo a la **cobertura de tools de Nexa** (qué puede operar Nexa hoy vs qué no). Cada capability se clasifica en: ✅ contrato gobernado · ⚠️ UI-only (lógica en componente) · ⚠️ admin-coarse (sin capability fina) · ⚠️ hardcoded/no-data-driven · 🟡 parcial. Salida: un artefacto durable (ledger + reader re-ejecutable) que alimenta el programa de estrangulamiento (TASK-1002 + API Platform) y la hoja de ruta de operabilidad de Nexa. **Read-only: no cambia runtime ni remedia — la remediación son tasks derivadas priorizadas.**

## Why This Task Exists

La directiva CEO 2026-06-19 fijó el North Star: **Nexa debe operar TODO el portal**, con Full API Parity como base. Para lo nuevo hay gate (Capability DoD en `TASK_BACKEND_DATA_ADDENDUM.md`). Pero **lo existente tiene cobertura despareja y deuda silenciosa** — comprobado con casos reales en esta misma sesión: el rollup ICO de cliente hardcoded a efeonce/sky (TASK-1171), `enable-sync` solo por endpoint admin-coarse, lógica que creció UI-first. Hoy esa deuda **no es visible ni priorizada**, así que se descubre cuando un cliente, un agente o Nexa se topa con el muro (como pasó con Berel).

Sin un inventario, el programa de parity (TASK-1002 + API Platform) opera a ciegas y la cobertura de Nexa no se puede planificar. Esta auditoría hace la deuda **medible, priorizable y mapeable a Nexa**.

## Goal

- **Inventario** de las capabilities de negocio del portal (por dominio), derivado de: vistas/acciones UI, rutas `src/app/api/**`, `capabilities_registry` + `entitlements-catalog`, commands/readers en `src/lib/**`.
- **Clasificación** de cada una: contrato-gobernado / UI-only / admin-coarse / hardcoded-no-data-driven / parcial.
- **Priorización** por valor-para-Nexa + riesgo + frecuencia operativa; enrutada al programa existente (TASK-1002, TASK-650/655/658/660/661).
- **Mapeo a tools de Nexa:** qué capabilities puede operar Nexa hoy (tienen contrato + tool) vs cuáles no.
- **Artefacto durable:** ledger (markdown) + reader/script re-ejecutable (la auditoría misma cumple parity: es un contrato consultable, no un one-shot).
- **NO remediar:** la auditoría produce el mapa + tasks derivadas priorizadas; no cambia runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — base + §North Star + §Canonical consumers (los 10).
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — lanes + Platform Health.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capabilities registry como base del inventario.
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` + `agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — tool/action runtime de Nexa (la cobertura a mapear).
- `docs/tasks/to-do/TASK-1002-full-api-parity-first-wave-program.md` — programa al que esta auditoría alimenta.
- Skills al tomar: `arch-architect`, `greenhouse-backend`, `greenhouse-nexa-conversational`, `greenhouse-ico` (al clasificar dominios específicos).

Reglas obligatorias:

- **NUNCA** remediar dentro de esta task — es read-only/inventario; cada fix es task derivada priorizada.
- **NUNCA** clasificar "✅ contrato gobernado" sin verificar que la lógica vive en `src/lib/**` y se expone por contrato (no asumir por existencia de una ruta API).
- **SIEMPRE** registrar la deuda como visible (ledger) — el objetivo es lo contrario de la exclusión silenciosa.
- **SIEMPRE** clasificar a nivel **capability de negocio**, no por componente UI ni por endpoint.

## Normative Docs

- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (criterio de clasificación).

## Dependencies & Impact

### Depends on

- `capabilities_registry` + `entitlements-catalog` (base del inventario) — existen.
- Contrato Full API Parity + Capability DoD (criterio) — recién canonizados (2026-06-19).

### Blocks / Impacts

- Alimenta TASK-1002 (first-wave) + API Platform program con backlog priorizado.
- Habilita planificar la cobertura de tools de Nexa contra deuda real.
- No impacta runtime (read-only).

### Files owned

> Estimado — `[verificar]` cada path durante Discovery al tomar la task.

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md` (o `docs/operations/`) — ledger durable — NEW
- `scripts/audit/full-api-parity-coverage.ts` (o `src/lib/api-platform/parity-coverage*`) — reader/script re-ejecutable — NEW
- `docs/tasks/to-do/` — tasks derivadas de remediación priorizadas — NEW (varias)

## Current Repo State

### Already exists

- `capabilities_registry` (DB) + `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` — fuente de capabilities + grants.
- API Platform lanes (`api/platform/{app,ecosystem}`) + Platform Health (cobertura programática parcial).
- Nexa tool/action runtime (cobertura actual de operabilidad).
- Programa parity (TASK-1002 + TASK-650/655/658/660/661).

### Gap

- No existe inventario capability↔contrato↔consumer↔Nexa-tool.
- La deuda UI-only/admin-coarse/hardcoded no está enumerada ni priorizada.
- No hay forma re-ejecutable de medir cobertura de parity / cobertura de Nexa.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite` (read-only/auditoría; produce ledger + reader, sin write productivo)
- Impacto principal: `reader`
- Source of truth afectado: ninguno (lee registries/código; produce inventario derivado)
- Consumidores afectados: programa parity (humanos), planificación Nexa
- Runtime target: `local`/`staging` (script de auditoría)

### Contract surface

- Contrato existente a respetar: criterio de `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- Contrato nuevo: el reader de cobertura de parity (consultable, re-ejecutable)
- Backward compatibility: `compatible` (additive, read-only)
- Full API parity: la auditoría misma se entrega como reader/contrato (dogfooding), no como one-shot manual

### Data model and invariants

- Entidades leídas: `capabilities_registry`, entitlements catalog/runtime, rutas API, `src/lib/**`, Nexa tools
- Invariantes: clasificación a nivel capability; deuda visible (no silenciosa); no remediar
- Tenant/space boundary: N/A (auditoría de código/registry)
- Idempotency/concurrency: reader idempotente (re-ejecutable, mismo input → mismo mapa)
- Audit/outbox/history: el ledger es el registro; versionado en git

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: read-only
- Backfill plan: N/A
- Rollback path: revert PR (doc + script)
- External coordination: ninguna

### Security and access

- Auth/access gate: N/A (auditoría interna; no expone data sensible)
- Sensitive data posture: no sensitive data (metadata de capabilities)
- Error contract: `captureWithDomain` si el reader corre en runtime
- Abuse/rate-limit posture: N/A

### Runtime evidence

- Local checks: el reader corre y produce el inventario clasificado
- DB/runtime checks: lee `capabilities_registry` real
- Integration checks: lista tools de Nexa reales
- Reliability signals/logs: (follow-up) signal de cobertura de parity
- Production verification sequence: N/A (read-only)

### Acceptance criteria additions

- [ ] Inventario nombrado con capabilities reales (no abstracto), por dominio.
- [ ] Clasificación verificada (no asumida) contra el criterio de parity.
- [ ] Reader re-ejecutable + ledger durable.
- [ ] Mapeo a tools de Nexa explícito.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Inventario de capabilities

Enumerar las capabilities de negocio del portal por dominio, cruzando: `capabilities_registry` + `entitlements-catalog`, rutas `src/app/api/**`, commands/readers en `src/lib/**`, y acciones visibles en vistas. Salida: lista canónica de capabilities con su dominio.

### Slice 2 — Clasificación de parity

Para cada capability, clasificar (verificando, no asumiendo): ✅ contrato-gobernado · ⚠️ UI-only · ⚠️ admin-coarse · ⚠️ hardcoded/no-data-driven · 🟡 parcial. Registrar evidencia (paths) por clasificación.

### Slice 3 — Mapeo a consumers + tools de Nexa

Para cada capability: qué consumers la alcanzan hoy (UI/API/MCP/...) y si Nexa tiene tool/contrato para operarla. Marca el gap de cobertura de Nexa.

### Slice 4 — Priorización + ledger durable

Priorizar por valor-para-Nexa + riesgo + frecuencia operativa. Escribir el ledger (`GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md`) + el reader re-ejecutable. Enrutar el top del backlog a tasks derivadas (referenciando TASK-1002 / API Platform).

### Slice 5 — Tasks derivadas + (opcional) gate

Crear las tasks de remediación priorizadas (no remediar acá). Opcional: proponer un lint/signal de cobertura de parity como follow-up.

## Out of Scope

- **Remediar** cualquier capability (eso son las tasks derivadas).
- Construir tools de Nexa (solo mapear cobertura).
- Cambiar runtime / contratos existentes.

## Detailed Spec

La auditoría aplica el criterio de `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`: capability = acción de negocio; parity = contrato gobernado a nivel capability (un primitive, muchos consumers). Casos semilla ya conocidos (sembrar el ledger): rollup ICO cliente hardcoded (TASK-1171), enable-sync admin-coarse, lifecycle/preflight sin ICO. El reader debe ser re-ejecutable para medir avance del programa en el tiempo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1 (inventario) → 2 (clasificación) → 3 (consumers/Nexa) → 4 (ledger+reader) → 5 (tasks derivadas). Read-only en todo el flujo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Clasificar ✅ por existir una ruta API sin verificar la lógica | quality | media | regla: verificar lógica en `src/lib/**`, no asumir | review |
| Inventario incompleto (capabilities ocultas en UI) | quality | media | cruzar 4 fuentes (registry/API/lib/vistas) | revisión por dominio |
| Scope creep a remediación | proceso | media | hard rule: no remediar; solo inventariar + derivar tasks | — |

### Feature flags / cutover

- N/A — read-only/auditoría.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-5 | revert PR (doc + script) | <10 min | sí |

### Production verification sequence

N/A (read-only). Verificación = el reader corre y el ledger refleja el estado real.

### Out-of-band coordination required

- Ninguna. Coordinar con owners de dominio al priorizar las tasks derivadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Inventario de capabilities por dominio, derivado de registry + API + `src/lib/**` + vistas — 217 capabilities del catálogo, clasificadas por módulo (reader + ledger §1).
- [x] Cada capability clasificada con evidencia (paths) verificada — taxonomía governed/api-inline/lib-only/ui-only/declared-unwired por consumer-reach; casos seed verificados en ledger §5 (incl. supuestos desactualizados corregidos: enable-sync ya gobernado).
- [x] Mapeo capability ↔ consumers ↔ tool de Nexa — ledger §2 (mapa de los 8 tools + gap North Star: 51% lectura, 0% accionable).
- [x] Backlog priorizado por valor-Nexa + riesgo + frecuencia, enrutado a TASK-1002 / API Platform — ledger §6.
- [x] Ledger durable `GREENHOUSE_FULL_API_PARITY_GAP_LEDGER_V1.md` + reader/script re-ejecutable (`scripts/audit/full-api-parity-coverage.ts`).
- [x] Tasks derivadas de remediación creadas para el top del backlog — TASK-1177/1178/1179.
- [x] `pnpm lint` + `pnpm tsc --noEmit` verdes (reader).

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` (si hay reader/script).
- Correr el reader → produce el inventario clasificado contra registry real.
- Revisión por owner de dominio de una muestra de la clasificación.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md`
- [ ] chequeo de impacto cruzado (TASK-1002, TASK-650/655/658/660/661, TASK-1171)
- [ ] ledger enlazado desde `DECISIONS_INDEX` / programa parity

## Follow-ups

- Lint/signal de **cobertura de parity** (anti-regresión: detectar lógica de negocio UI-only nueva).
- Programa de remediación por dominio (estrangulamiento, alto-valor-Nexa primero).
- Mapa de cobertura de tools de Nexa como surface viva (no solo ledger).

## Open Questions

- **¿Granularidad del inventario?** ¿capability por entry de `capabilities_registry`, o por acción de negocio (puede ser más fina)? Decidir en Slice 1.
- **¿El reader vive como script de auditoría o como surface en `/admin`?** (empezar script; surface = follow-up).
- **¿Umbral de "alto-valor-Nexa"?** Definir con product/Nexa al priorizar.
