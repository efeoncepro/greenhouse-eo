# TASK-1653 — MCP Gateway: federar `get_seo_rank_evolution` + guard de paridad de tools SEO

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `complete (2026-08-06): 4 tools federadas + guard CI fail-closed; revisión gateway 00014-fcg Ready`
- Rank: `TBD`
- Domain: `growth|integrations|mcp`
- Blocked by: `none (blocker cumplido: release fcee5ab9f7ce en prod 2026-08-06)`
- Branch: `main` (repo `efeonce-mcp`; los docs de esta task viven en greenhouse-eo)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Dos entregas en el gateway `mcp.efeonce.org` (repo hermano `efeonce-mcp`): (1) **federar la 4.ª tool SEO** `get_seo_rank_evolution` (creada por TASK-1303, patrón exacto de las 3 de TASK-1645/1647: método en `providers/greenhouse-seo.ts` + registro en `mcp.ts` + canary); (2) **guard de paridad** que compara el inventario de tools SEO del MCP interno de Greenhouse contra el allowlist del gateway y **falla loud cuando divergen**, con excepciones declaradas para lo deliberadamente no-federado. El allowlist explícito se CONSERVA (revisión humana por tool, decisión de diseño de TASK-1647) — el guard convierte el olvido silencioso en divergencia visible.

## Why This Task Exists

El mandato parity+MCP (2026-08-05) hace que cada reader SEO nuevo nazca con su MCP tool en el mismo PR — y vienen varios (TASK-1304 ×2-3, 1311, 1313 ×2, 1314, 1317). El gateway federa por allowlist hardcodeado (correcto para una frontera pública), así que cada tool nueva paga un peaje de ~30 líneas en otro repo. El modo de falla real no es el peaje: es el **drift silencioso** — una tool viva adentro que nadie federó y nada grita (le habría pasado a `get_seo_rank_evolution` el 2026-08-06 de no revisarse a mano). Caso fuente: cierre de TASK-1303.

## Goal

- `get_seo_rank_evolution` operable por `mcp.efeonce.org` con canary verde (mismo binding/consumer que las 3 existentes).
- Guard de paridad corriendo en el canary del gateway o CI de `efeonce-mcp`: lista esperada de tools SEO (fuente: contrato TASK-1645/1303 documentado) vs tools registradas en `mcp.ts`; divergencia = fallo con mensaje accionable; excepciones en un allowlist de exclusiones con razón.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7 (exposición MCP; mandato tool-en-el-mismo-PR).
- Contrato del gateway: adapter delgado, cero lógica de dominio, allowlist explícito (TASK-1647; specs en `docs/tasks/complete/TASK-1647-*.md` [verificar nombre exacto]).
- Cross-repo action safety (CLAUDE.md): `efeonce-mcp` tiene deploy productivo por workflow — PR/commit dispara pipeline; verificar último deploy antes de commitear.

## Normative Docs

- `~/Documents/efeonce-mcp/src/providers/greenhouse-seo.ts` — provider con los 3 métodos actuales (el 4.º se agrega acá).
- `~/Documents/efeonce-mcp/src/mcp.ts:182,209,242` — registro de las 3 tools SEO (patrón a replicar).
- `scripts/greenhouse-seo-canary.mjs` (repo `efeonce-mcp`) — canary del provider [verificar path].
- `src/mcp/greenhouse/server.ts` (greenhouse-eo) — inventario interno de tools SEO (la fuente de la lista esperada).

## Dependencies & Impact

### Depends on

- **Release develop→main de greenhouse-eo con TASK-1303** (blocker duro: el lane `rank-evolution` debe responder en `greenhouse.efeoncepro.com` antes de federar).

### Blocks / Impacts

- Cada task futura del mandato (1304/1311/1313/1314/1317) hereda el guard: federar deja de depender de memoria.

### Files owned

- `efeonce-mcp`: `src/providers/greenhouse-seo.ts`, `src/mcp.ts`, canary/CI del guard [paths exactos en Discovery].
- greenhouse-eo: solo docs (esta task + cierre).

## Current Repo State

### Already exists

- 3 tools SEO federadas y verificadas en producción (TASK-1645/1647).
- `get_seo_rank_evolution` en el MCP interno + lane ecosystem (TASK-1303; staging live, prod espera release).
- Canary del provider en `efeonce-mcp` (verificó las 3 tools el 2026-08-06).

### Gap

- La 4.ª tool no está en el gateway; no existe ningún check que detecte esa clase de drift.

## Backend/Data Contract

- Backend rigor: `backend-lite` (adapter passthrough + check de listas; cero schema/DB; el entitlement/anti-oracle viven en Greenhouse).
- Source of truth: allowlist del gateway (`mcp.ts`) vs inventario interno (`src/mcp/greenhouse/server.ts`); el guard compara, no muta.
- Contract surface: método `getRankEvolution` del provider (passthrough del lane `/api/platform/ecosystem/growth/seo/rank-evolution`) + tool `get_seo_rank_evolution` con el mismo inputSchema del MCP interno.
- Invariantes: el gateway NUNCA re-expone automáticamente (allowlist se conserva); errores del lane se propagan como `greenhouse_seo_lane_<status>`, jamás el body crudo; el guard falla loud, nunca auto-federa.
- Tenant/access: sin cambios — binding `internal` del gateway con `externalScopeType/Id` actuales.
- Idempotency/rollback: revert del commit en `efeonce-mcp` + redeploy (<10 min).
- Runtime evidence: canary contra producción con las 4 tools + un run del guard en verde y uno forzado en rojo (divergencia sintética).

## Modular Placement Contract

- Topology impact: none
- Nota: extensión in-place de un servicio ya extraído en repo hermano (`efeonce-mcp`).
- Current home: `efeonce-mcp` (gateway Cloud Run) — ya extraído.
- Future candidate home: remain-shared
- Nota placement: el gateway ES el home final (servicio ya extraído); sin extracción pendiente.
- Boundary: el gateway consume SOLO el lane ecosystem (contrato sister-platform); cero import de dominio Greenhouse.
- Server/browser split: n/a (servicio server-only).
- Build impact: ninguno en greenhouse-eo.
- Extraction blocker: none.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Federar `get_seo_rank_evolution`

- `providers/greenhouse-seo.ts`: método `getRankEvolution({ correlationId, organizationId, rangeDays?, engine?, device?, keywords? })` → GET al lane con `keywords` como CSV (mismo mapping que el http-client interno).
- `mcp.ts`: registro de la tool con el inputSchema espejo del MCP interno (incl. la guía de honestidad `no_data`/`disabled` en la description).
- Canary extendido a la 4.ª tool; verificación contra producción.

### Slice 2 — Guard de paridad

- Lista esperada versionada en `efeonce-mcp` (constante con razón por entrada) + exclusiones declaradas (`{ tool, reason }`).
- Check en el canary/CI: `esperadas − registradas = ∅` y `registradas − esperadas = ∅`; divergencia → exit 1 con mensaje que nombra la tool y el paso a seguir (federar o declarar exclusión).
- Nota en el contrato del gateway (README/AGENTS de `efeonce-mcp`) sobre cómo agregar una tool nueva.

## Out of Scope

- Auto-federación dinámica (anti-goal explícito: la revisión humana por tool se conserva).
- Tools no-SEO del gateway; cambios al MCP interno de Greenhouse; UI.

## Detailed Spec

Ver patrón exacto de las 3 tools existentes en `providers/greenhouse-seo.ts` + `mcp.ts` (TASK-1647) y el shape del reader en `docs/tasks/complete/TASK-1303-growth-seo-rank-capture-evolution-reader.md`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 SOLO después del release prod de greenhouse-eo con TASK-1303 (el lane debe responder 200 en prod; antes daría 404 y el canary rojo bloquearía el deploy del gateway).

### Risk matrix

| Riesgo | Sistema | Prob | Mitigation | Signal |
|---|---|---|---|---|
| Federar antes del release prod → 404 del lane | mcp | media | blocker duro declarado + canary pre-deploy | canary rojo |
| Guard con lista esperada desactualizada al revés (grita de más) | mcp | baja | exclusiones declaradas con razón; mensaje accionable | CI rojo con instrucción |
| Deploy del gateway rompe las 3 tools existentes | mcp | baja | canary cubre las 4; revert <10 min | canary |

### Feature flags / cutover

- N/A — additive; el gateway ya está enabled; sin flags nuevos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert commit + redeploy gateway | <10 min | sí |
| 2 | revert del check (no toca runtime) | <5 min | sí |

### Production verification sequence

1. Release prod de greenhouse-eo con TASK-1303 confirmado (lane `rank-evolution` responde en `greenhouse.efeoncepro.com`).
2. Deploy `efeonce-mcp` → canary 4/4 tools verde (Berel con serie real).
3. Guard: run verde + run rojo forzado (quitar una tool de la lista esperada) documentado.

### Out-of-band coordination required

- Ninguna nueva: reusa binding/token/secret del gateway existentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Cierre 2026-08-06

Ejecutada el mismo día de su creación (blocker cumplido por el release `fcee5ab9f7ce`). En `efeonce-mcp` (commits `ff68078` + `2365ef9`, CI verde, deploy run `31112222516`, revisión `efeonce-mcp-gateway-00014-fcg` Ready): (1) provider `getRankEvolution` (keywords CSV) + interface + `registerTool` con schema espejo del MCP interno; (2) guard de paridad: lista esperada versionada (`greenhouse-seo-tool-parity.ts`) + exclusiones con razón + test CI fail-closed sobre `src/mcp.ts` — **rojo forzado verificado** con mensaje accionable y verde restaurado; (3) canary extendido y corrido contra producción **4/4**: entitlement Berel contracted (budget 49.86 refleja el gasto real del día), visibility-360 `riesgo`, **rank-evolution `source=postgres series=31`** (la serie real capturada hoy), deny anti-oracle 404; (4) contrato "cómo agregar una tool" en `AGENTS.md` del gateway. Front door verificado: metadata 200, `POST /mcp` anónimo 401. **Paso asistido pendiente (no bloqueante)**: smoke autenticado por `mcp.efeonce.org` exige login Entra humano (limitación conocida del OAuth interactivo); la evidencia automatizable quedó completa.

## Acceptance Criteria

- [x] `get_seo_rank_evolution` invocable vía `mcp.efeonce.org` con payload passthrough idéntico al lane (canary verde contra producción).
- [x] Las 3 tools preexistentes siguen verdes en el mismo canary.
- [x] El guard falla (exit 1, mensaje accionable) ante una divergencia sintética y pasa en verde con el estado real.
- [x] Las exclusiones del guard llevan razón declarada; cero auto-federación.
- [x] Contrato de "cómo agregar una tool" documentado en `efeonce-mcp`.

## Verification

- Canary del gateway contra producción (4 tools) + run del guard verde y rojo forzado.
- `docs/tasks/README.md` + registry sincronizados al cierre.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` actualizado
- [ ] Delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7 (4 tools federadas + guard)
- [ ] Skill `dataforseo-operator` §Estado del runtime sincronizada si cambia el inventario

## Follow-ups

- Cada task del mandato (1304/1311/1313/1314/1317) agrega su tool a la lista esperada del guard en el MISMO PR que la crea.

## Open Questions

1. ¿El guard vive en el canary (runtime, pre-deploy) o en CI de `efeonce-mcp` (estático)? Propuesta: canary — compara contra las tools REALMENTE registradas en el server vivo.
