# TASK-1645 — Growth SEO: Ecosystem Lane + MCP Tools (Full API Parity)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|mcp|platform|api`
- Blocked by: `TASK-1301, TASK-1302, TASK-1303`
- Branch: `task/TASK-1645-growth-seo-ecosystem-lane-mcp-tools`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Expone los readers canónicos del módulo SEO (`src/lib/growth/seo/**`) al **lane ecosystem** (`/api/platform/ecosystem/growth/seo/*`, machine-authed vía `runEcosystemReadRoute`) y como **MCP tools read-only** del server `src/mcp/greenhouse/**`, espejo exacto del patrón Knowledge (`TASK-1086`). Es la task que convierte el mandato Full API Parity del módulo SEO (directiva del operador 2026-08-05: "todo lo del módulo SEO nace parity y usable por MCP") en contrato con dueño: sin ella, el módulo puede terminar UI-first con MCP "posible por construcción" pero nunca expuesto. Cero lógica de dominio nueva: los tools delegan en los mismos readers que consumen UI y Nexa.

## Why This Task Exists

`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7 declara que cada primitive SEO es "reusable por UI + Nexa + MCP", pero ninguna child task de EPIC-022 era dueña de esa exposición: TASK-1301 seedea capabilities, 1302–1305 crean readers/commands, 1306–1310 construyen UI — y el lane ecosystem + los MCP tools quedaban huérfanos. El precedente Knowledge demostró que la exposición MCP necesita task propia (TASK-1086 sobre el SSOT de TASK-1083). Esta task cierra ese hueco y da al epic un exit criterion verificable de parity: un agente MCP puede leer rank evolution, keyword opportunities y el gap SEO↔AEO de una org con entitlement, con el mismo shape `{ ok } | { ok: false, errorCode }` que la UI.

## Goal

- Lane ecosystem read-only `/api/platform/ecosystem/growth/seo/*` sirviendo los readers canónicos SEO con subject machine-authed, default-DENY y entitlement per-org respetado (chokepoint de TASK-1301).
- MCP tools read-only en `src/mcp/greenhouse/**` (`get_seo_rank_evolution`, `get_seo_keyword_opportunities`, `get_seo_visibility_360`) delegando en el lane/readers, sin lógica de dominio propia.
- Writes NO expuestos como tools directos: el camino de escritura queda declarado vía governed action loop (`propose → confirm → execute`) como follow-up explícito.
- Parity verificable: mismo reader, tres consumers (UI, Nexa, MCP), cero forks de shape.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7 (primitives Full API Parity) + §9 (entitlements per-org).
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — lane ecosystem (`runEcosystemReadRoute`, Delta TASK-1086) + command/idempotency foundation (TASK-655).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers.
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` — server MCP greenhouse; gateway `efeonce-mcp-platform` como front door (TASK-1626).
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability + module_assignments per-org.

Reglas obligatorias:

- **Cero lógica de dominio en el lane/tools.** Delegar SIEMPRE en los readers canónicos de `src/lib/growth/seo/**`; nunca query directa a `seo_*` desde el lane o el MCP server.
- **Default-DENY + entitlement per-org.** El subject machine-authed deriva del binding; sin assignment activo del módulo SEO para la org → deny. Mismo chokepoint que UI (TASK-1301), nunca un gate paralelo.
- **Read-only.** Ningún tool MCP ejecuta writes; el LLM nunca muta directo (loop gobernado como camino declarado, fuera de scope acá).
- **Shape estable.** `{ ok: true, ... } | { ok: false, errorCode, status }` idéntico al de los readers; sin re-mapear per-consumer.

## Normative Docs

- `docs/tasks/complete/TASK-1086-greenhouse-mcp-knowledge-resources-v1.md` — patrón canónico completo (lane + tools + anti-oracle 404 + tests + smoke) [referencia primaria].
- `src/app/api/platform/ecosystem/**` — lanes ecosystem existentes [verificar rutas exactas de knowledge como espejo].
- `src/mcp/greenhouse/**` — server MCP + registro de tools existente [verificar].
- `src/lib/growth/seo/**` — readers canónicos (nacen en TASK-1302/1303/1305) [verificar al tomar la task].

## Dependencies & Impact

### Depends on

- `TASK-1301` — capabilities `growth.seo.*` + entitlement per-org + chokepoint (el lane reusa ese gate).
- `TASK-1302` — `readKeywordOpportunities` (primer reader expuesto; quick win GSC).
- `TASK-1303` — `readRankEvolution` / `readRankSnapshotLatest`.
- `TASK-1305` — `readSeoAeoGap` (opcional en V1 del lane; si no está, el tool 360 degrada honesto a solo-SEO).

### Blocks / Impacts

- Exit criterion de parity de `EPIC-022` (delta 2026-08-05): el epic no cierra sin lane ecosystem + MCP tools live.
- Gateway `efeonce-mcp-platform` (TASK-1626): los tools quedan disponibles para federación cuando el provider greenhouse se registre.

### Files owned

- `src/app/api/platform/ecosystem/growth/seo/**` [nuevo]
- `src/mcp/greenhouse/**` [extensión: registro de 3 tools SEO]
- `src/lib/growth/seo/**` [solo wiring de exposición; los readers pertenecen a 1302/1303/1305]

## Current Repo State

### Already exists

- Lane ecosystem operativo con precedente completo: knowledge (`runEcosystemReadRoute`, subject binding default-DENY, TASK-1086).
- Server MCP greenhouse con tools/resources knowledge registrados.
- Schema SEO (TASK-1299, aplicado 2026-08-05).

### Gap

- Cero exposición ecosystem/MCP del dominio SEO; los readers (cuando existan) solo tendrían consumers UI/Nexa. El mandato parity del operador no tiene dueño ejecutable sin esta task.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/app/api/platform/ecosystem/growth/seo/**` (lane) + `src/mcp/greenhouse/**` (tools) + readers en `src/lib/growth/seo/**`.
- Future candidate home: `domain-package`
- Boundary: el lane y los tools son adapters delgados sobre los readers canónicos; la lógica de dominio vive exclusivamente en `src/lib/growth/seo/**`. Nota Wave: el lane ecosystem de esta task es el futuro contrato sister-platform cuando SV360 se habilite en `wave.efeonce.org` (arch doc SEO §17; EPIC-037).
- Server/browser split: 100% server-only (lane machine-authed + MCP server); nada de este trabajo entra al bundle browser.
- Build impact: ninguno nuevo (reusa runtime API existente; sin SDK externo).
- Extraction blocker: ninguno; el trabajo queda dentro del monolito actual. No se autoriza crear `apps/*`, `packages/*` ni deployables nuevos.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: ninguno nuevo — el lane/tools son consumers read-only de los readers SEO.
- Consumidores afectados: agentes MCP (vía server greenhouse y gateway), integraciones machine-authed del ecosystem.
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: `runEcosystemReadRoute` (subject binding, default-DENY, scope), shape de resultado de los readers SEO, chokepoint de entitlement de TASK-1301.
- Contrato nuevo o modificado: rutas `GET /api/platform/ecosystem/growth/seo/{rank-evolution,keyword-opportunities,visibility-360}` + 3 MCP tools registrados.
- Backward compatibility: `full` (aditivo; ningún contrato existente cambia).
- Full API parity: esta task ES la pata ecosystem/MCP de la parity del módulo SEO (tercer consumer del mismo primitive).

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (read-only sobre readers existentes).
- Invariantes que no se pueden romper:
  - Cero SQL directo a `seo_*` desde lane/tools (solo readers canónicos).
  - Default-DENY: binding sin org autorizada o sin entitlement SEO → 403/404 anti-oracle (sin revelar existencia de la org/target).
  - Tools read-only; ningún write path expuesto.
  - Shape `{ ok } | { ok: false, errorCode, status }` sin forks per-consumer.
- Tenant/space boundary: `organization_id` derivado server-side del binding del subject; NUNCA aceptado crudo como filtro autoritativo del caller sin validar contra el binding.
- Idempotency/concurrency: N/A (reads).
- Audit/outbox/history: N/A (reads); telemetría estándar del lane.

### Migration, backfill and rollout

- Migration posture: `none` (cero DDL).
- Default state: lane responde 404/deny hasta que existan entitlements activos; tools MCP registrados pero inertes sin binding.
- Backfill plan: N/A.
- Rollback path: revert PR (aditivo puro).
- External coordination: registro del provider en el gateway MCP (TASK-1626) es follow-up, no bloqueante.

### Security and access

- Auth/access gate: subject machine-authed del lane ecosystem + entitlement per-org SEO (chokepoint TASK-1301). Capability de lectura: `growth.seo.observation.read` [verificar nombre final en TASK-1301].
- Sensitive data posture: métricas SEO no-PII; igual aplicar anti-oracle en org/target no autorizados.
- Error contract: `errorCode` estable del reader; sin prosa en inglés cruda ni detalle interno.
- Abuse/rate-limit posture: límites del lane ecosystem existentes; el costo provider NO se ejercita en reads (los reads sirven snapshots ya materializados — cero llamadas a DataForSEO).

### Runtime evidence

- Local checks: `pnpm local:check` + tests focales del lane/tools.
- DB/runtime checks: N/A (sin DDL).
- Integration checks: smoke live del lane con binding real en staging (mirror del smoke de TASK-1086) + invocación MCP e2e de al menos 1 tool.
- Reliability signals/logs: telemetría estándar del lane; sin signal nuevo.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task no crea capabilities nuevas: **consume** `growth.seo.observation.read` (TASK-1301) desde un tercer consumer. El gate de parity queda satisfecho cuando el MISMO reader sirve UI + Nexa + MCP/ecosystem sin lógica duplicada, verificado con el smoke e2e. El write path (configurar targets/keywords vía agente) queda declarado como follow-up por governed action loop — no es deuda oculta, es secuencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Lane ecosystem SEO

- Rutas `GET /api/platform/ecosystem/growth/seo/{rank-evolution,keyword-opportunities,visibility-360}` vía `runEcosystemReadRoute`, delegando en los readers canónicos con org derivada del binding + entitlement chokepoint.
- Anti-oracle 404 para org/target no autorizados. Tests del lane (authz, deny, shape).

### Slice 2 — MCP tools

- Registrar `get_seo_rank_evolution`, `get_seo_keyword_opportunities`, `get_seo_visibility_360` en `src/mcp/greenhouse/**`, consumiendo el lane/readers (espejo TASK-1086).
- `get_seo_visibility_360` compone SEO + gap AEO si `readSeoAeoGap` existe; si no, degrada honesto a solo-SEO con flag en el payload.
- Tests de tools + smoke live staging (binding real) + 1 invocación MCP e2e documentada.

## Out of Scope

- Writes vía MCP (configure target, track keywords) — follow-up por governed action loop.
- Registro del provider en el gateway federado (`efeonce-mcp-platform` / TASK-1626).
- Los readers mismos (TASK-1302/1303/1305) y las capabilities (TASK-1301).
- Cualquier UI.
- Exposición MCP del módulo AEO/grader (dominio hermano; si se quiere, es task propia).

## Detailed Spec

Espejar TASK-1086 end-to-end: lane con `runEcosystemReadRoute` (subject binding default-DENY, scope `internal` o el que el binding declare), tools MCP que delegan sin lógica propia, anti-oracle, no-invención. La resolución org: el binding declara las orgs autorizadas del subject; el parámetro `organizationId` del tool se valida contra ese set (nunca se confía crudo). Los readers ya retornan `{ ok } | { ok: false, errorCode, status }` (mirror `SearchConsoleAnalyticsResult`) — el lane los pasa through.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (lane) → Slice 2 (tools): los tools consumen el lane/readers, nunca al revés.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Lane acepta `organizationId` crudo sin validar contra binding → cross-tenant read | platform | low | validación binding-first + test de deny + anti-oracle 404 | test authz + review |
| Tool duplica lógica de dominio (query directa a `seo_*`) | growth | low | regla dura + review; delegación exclusiva en readers | code review |
| Gate de entitlement paralelo divergente del de UI | growth | medium | reusar el chokepoint de TASK-1301, cero gates propios | test de paridad de deny |

### Feature flags / cutover

- Sin flag propio: el lane es deny-by-default sin binding/entitlement; los tools son inertes sin binding. El módulo completo sigue gateado por los entitlements per-org de TASK-1301.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | si |
| Slice 2 | revert PR (desregistrar tools) | <5 min | si |

### Production verification sequence

1. Staging: binding machine-authed real → `GET .../keyword-opportunities` con org entitled → 200 shape ok; org no entitled → deny anti-oracle.
2. Invocación MCP e2e de `get_seo_keyword_opportunities` vía server greenhouse (mirror smoke TASK-1086).
3. Prod vía release control plane; re-ejecutar smoke con binding prod.

### Out-of-band coordination required

- Ninguna para V1 (el registro en el gateway federado es follow-up con TASK-1626).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Lane `GET /api/platform/ecosystem/growth/seo/*` live con `runEcosystemReadRoute`, org derivada del binding, entitlement chokepoint de TASK-1301 y anti-oracle 404.
- [ ] 3 MCP tools registrados delegando en readers canónicos; cero SQL directo a `seo_*` fuera de `src/lib/growth/seo/**` (verificable por grep).
- [ ] Shape `{ ok } | { ok: false, errorCode, status }` idéntico al del reader en los 3 consumers (test de paridad).
- [ ] Ningún write path expuesto como tool; follow-up de governed action loop declarado.
- [ ] Smoke staging: org entitled → data; org no entitled → deny; 1 invocación MCP e2e documentada.
- [ ] `pnpm lint` + `pnpm typecheck` + tests focales verdes.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (focal: lane + tools)
- Smoke live staging (binding real) + invocación MCP e2e.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (EPIC-022 exit criteria; TASK-1626 gateway)
- [ ] Delta en `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lane growth/seo) + manual MCP

## Follow-ups

- Writes SEO vía agente (configure target / track keywords) por governed action loop `propose → confirm → execute`.
- Registro del provider greenhouse-SEO en el gateway federado (`efeonce-mcp-platform`, TASK-1626).
- Exposición MCP del módulo AEO/grader (task hermana si se prioriza).

## Open Questions

1. ¿`get_seo_visibility_360` V1 incluye el gap AEO (depende de TASK-1305) o nace solo-SEO con degradación honesta? Propuesta: nace con degradación honesta para no bloquear en 1305.
2. ¿Scope del binding para SEO: `internal` (como knowledge) o scope dedicado? Resolver contra el modelo de scopes del lane al tomar la task.
