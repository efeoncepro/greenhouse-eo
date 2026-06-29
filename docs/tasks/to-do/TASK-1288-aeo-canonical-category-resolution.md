# TASK-1288 — AEO: resolución de categoría canónica (taxonomía + mapeo HubSpot enum + label)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1288-aeo-canonical-category-resolution`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Deja de inyectar el enum crudo de HubSpot (`organizations.industry = 'AIRLINES_AVIATION'`) en los prompts del grader. El perfil pasa a guardar una **categoría canónica** resuelta contra la taxonomía (`taxonomy/catalog.ts`): `category_node_id` (ej. `industry:transportation_airlines`) + `category_label` localizada. Resolver canónico con cascada de fuentes (HubSpot industry enum → website intelligence → fallback), tabla de mapeo HubSpot→taxonomía, y un **guard**: categoría no resuelta (`unknown`) bloquea el run/envío en vez de generar un prompt roto. Foundation de EPIC-021; primer paso del cierre de **ISSUE-110**.

## Why This Task Exists

`provisionGraderProfileForOrganization` escribe `org.industry` crudo en `grader_profiles.category`, y `prompt-pack.ts` lo interpola literal en `{{category}}` → "¿qué agencias de **AIRLINES_AVIATION** ayudan a empresas?". Aun arreglando el framing (TASK-1290), un enum en mayúsculas-guión en el texto del prompt es basura. La taxonomía canónica (`catalog.ts`, nodos `industry:*` con label `{es,en}`) ya existe pero se está **bypasseando**. Sin una categoría canónica + label, ningún prompt (de ningún arquetipo) puede redactarse bien.

## Goal

- Resolver y persistir en `grader_profiles`: `category_node_id` (nodo de la taxonomía) + `category_label` (label localizada del nodo), reemplazando el uso del enum crudo.
- Tabla/diccionario de mapeo **HubSpot industry enum → nodo de taxonomía** (extensible), con cascada: HubSpot enum → website intelligence (señal secundaria) → `unknown`.
- Guard: `category_node_id = unknown` ⇒ el run de portal/operador y el envío se bloquean con razón canónica (no se corre con categoría sin resolver).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (HubSpot = fuente, no SoT; el enum se mapea, no se usa crudo)
- Taxonomía existente: `src/lib/growth/ai-visibility/taxonomy/{catalog,contracts,mapper}.ts`

Reglas obligatorias:

- **NUNCA** persistir ni interpolar el enum crudo de HubSpot en un prompt. El SoT es el `category_node_id` canónico + su label localizada.
- El mapeo HubSpot→taxonomía es un diccionario versionado/extensible; un enum no mapeado degrada a `unknown` (honesto), nunca inventa un nodo.
- El guard de `unknown` aplica en el chokepoint de run (no parchear por-callsite); errores canónicos es-CL.

## Normative Docs

- `docs/issues/open/ISSUE-110-aeo-grader-false-zero-non-agency-brands-taxonomy-bypass.md`
- `docs/epics/to-do/EPIC-021-aeo-brand-aware-prompt-generation-engine.md`
- `docs/tasks/complete/TASK-1286-aeo-assign-tier-governed-command.md` (provisión del profile — origen del bug)

## Dependencies & Impact

### Depende de

- Taxonomía canónica `taxonomy/catalog.ts` (existe).
- `grader_profiles` (existe) + `provision-profile.ts` (existe).
- `organizations.industry` (raw HubSpot) como fuente del mapeo.

### Impacta a

- **TASK-1289/1290** consumen `category_node_id` + `business_model` para generar prompts.
- **TASK-1291** usa el guard `unknown` para el gate del cross-sell.
- `prompt-pack.ts` (deja de recibir el enum; recibe la label canónica).

### Files owned

- `migrations/<ts>_task-1288-grader-profile-canonical-category.sql` (columnas `category_node_id`, `category_label`; backfill)
- `src/lib/growth/ai-visibility/taxonomy/hubspot-industry-map.ts` (diccionario HubSpot enum → nodo) `[verificar naming]`
- `src/lib/growth/ai-visibility/taxonomy/resolve-category.ts` (resolver canónico con cascada) `[verificar]`
- `src/lib/growth/ai-visibility/provision-profile.ts` (usar el resolver, no `org.industry` crudo)
- `src/lib/growth/ai-visibility/prompt-pack.ts` (interpolar la label canónica, no el enum)
- `src/lib/growth/ai-visibility/request-run.ts` (guard `unknown`) `[verificar]`

## Current Repo State

### Already exists

- Taxonomía canónica con nodos `industry:*` + labels `{es,en}` + aliases (`taxonomy/catalog.ts` + `mapper.ts`).
- `provision-profile.ts` que setea `category = org.industry` (el bug).
- `prompt-pack.ts` que interpola `{{category}}` = `vars.category`.

### Gap

- No hay mapeo HubSpot industry enum → nodo de taxonomía, ni resolver canónico, ni persistencia de `category_node_id`/`category_label`, ni guard de `unknown`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (toca el perfil del grader live + un guard que bloquea runs + el lead magnet)
- Impacto principal: `migration` (+ `command`/`reader`)
- Source of truth afectado: `grader_profiles.category_node_id` + `category_label` (nuevo SoT canónico); `organizations.industry` es fuente, no SoT
- Consumidores afectados: prompt-pack / run-engine / TASK-1289/1290/1291 · lead magnet · cross-sell operador
- Runtime target: `local|staging|production`

### Contract surface

- Contrato nuevo: `resolveCanonicalCategory({ hubspotIndustry?, websiteUrl?, brandName? }) → { nodeId, label, source: 'hubspot_map'|'website'|'unknown' }`; columnas `category_node_id`/`category_label` en `grader_profiles`.
- Backward compatibility: `additive` (columnas nuevas; `category` legacy se conserva durante la migración + backfill).
- Full API parity: el resolver es un helper canónico reusado por provisión + cualquier consumer; no UI nueva.

### Data model and invariants

- Entidades: `grader_profiles` (+`category_node_id` TEXT, +`category_label` TEXT). Diccionario de mapeo en código (versionado).
- Invariantes:
  - `category_node_id` ∈ nodos de `CATEGORY_TAXONOMY` ∪ `'unknown'`; nunca un enum HubSpot crudo.
  - `category_label` = label localizada del nodo (es-CL por defecto); si `unknown` → null.
  - El resolver es puro/determinista para una entrada dada (testeable); el LLM-assist (si se agrega) queda fuera de scope.
- Tenant/space boundary: el perfil ya es per-org.
- Idempotency/concurrency: backfill idempotente (solo filas sin `category_node_id`).
- Audit/outbox/history: ninguno nuevo (resolución determinista); reliability signal de cobertura (perfiles `unknown`).

### Migration, backfill and rollout

- Migration posture: `additive` (columnas nullable + backfill).
- Default state: el resolver se usa en provisión nueva de inmediato; el guard `unknown` detrás de flag hasta backfill + verificación.
- Backfill plan: re-resolver `category_node_id`/`category_label` de los perfiles existentes desde `organizations.industry` + website (dry-run primero; reporta % `unknown`).
- Rollback path: revert PR (los consumers caen al `category` legacy) + reverse migration.
- External coordination: revisar el catálogo de HubSpot industry enums vigente para completar el mapeo.

### Security and access

- Auth/access gate: helper interno; sin nueva capability (consumido por la provisión ya gobernada).
- Sensitive data posture: sin PII (categoría/industria es pública).
- Error contract: guard `unknown` → `canonicalErrorResponse('aeo_category_unresolved', …)` (nuevo code) en el chokepoint; `captureWithDomain(err,'growth',…)`.
- Abuse/rate-limit posture: n/a (resolución local).

### Runtime evidence

- Local checks: tests del resolver (HubSpot enum conocido → nodo; desconocido → unknown; website fallback) + del guard.
- DB/runtime checks: migrate verify de columnas; backfill dry-run + report de cobertura sobre perfiles reales (Berel, SKY, etc.).
- Integration checks: un perfil con `industry='AIRLINES_AVIATION'` resuelve a `industry:transportation_airlines` (o el nodo correcto) con label "Aerolíneas".
- Reliability signals/logs: `growth.ai_visibility.profile_category_unresolved` (count perfiles `unknown`, steady objetivo bajo).
- Production verification sequence: migrate staging → backfill dry-run → backfill apply → verify SKY/Berel resuelven → flip guard.

### Acceptance criteria additions

- [ ] SoT (`category_node_id`/`category_label`), resolver y mapeo nombrados; enum crudo eliminado del path de prompts.
- [ ] Guard `unknown` explícito en el chokepoint (no por-callsite).
- [ ] Backfill idempotente + report de cobertura; signal de `unresolved`.
- [ ] Mapeo HubSpot→taxonomía extensible + testeado; resolver determinista.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Mapeo + resolver canónico

- `hubspot-industry-map.ts` (diccionario HubSpot enum → nodo de taxonomía) + `resolveCanonicalCategory` (cascada HubSpot → website → unknown). Tests.

### Slice 2 — Persistencia + provisión

- Migration: `category_node_id` + `category_label` en `grader_profiles`. `provision-profile.ts` usa el resolver (no `org.industry` crudo). Backfill idempotente + report.

### Slice 3 — Render + guard

- `prompt-pack.ts` interpola la label canónica. Guard `unknown` en el chokepoint (`request-run.ts`) detrás de flag + error canónico `aeo_category_unresolved`.

### Slice 4 — Signal

- Reliability signal `profile_category_unresolved`.

## Out of Scope

- El framing por arquetipo / packs de prompts (TASK-1290).
- El eje `business_model` (TASK-1289).
- LLM-assist para resolver categorías long-tail (follow-up).

## Detailed Spec

El resolver es la única vía para poblar la categoría del perfil. HubSpot industry enum es una **fuente** (mapeada), nunca el dato. El nodo canónico + su label localizada alimentan a los prompts (TASK-1290) y al clasificador de modelo de negocio (TASK-1289). El guard `unknown` evita correr el motor con una categoría que produciría prompts basura.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- S1 (mapeo+resolver) → S2 (persistencia+backfill) → S3 (render+guard) → S4 (signal). El guard (S3) no se prende hasta backfill (S2) verificado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mapeo incompleto → muchos `unknown` | growth | medium | diccionario extensible + report de cobertura pre-flip + website fallback | `profile_category_unresolved` alto |
| Guard bloquea el lead magnet | growth | medium | flag + backfill verificado antes de prender; default conservador | runs bloqueados inesperados |
| Backfill mal mapea un perfil | growth | low | dry-run + report + reversible (additive) | revisión manual del report |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_CATEGORY_GUARD_ENABLED` (default OFF) para el guard `unknown`. El resolver+persistencia se prenden sin flag (additive).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | reverse migration + revert | <10 min | sí |
| Slice 3 | flag OFF | <5 min | sí |
| Slice 4 | revert PR | <5 min | sí |

### Production verification sequence

1. migrate staging + verify columnas.
2. backfill dry-run → report de cobertura (% resueltos vs `unknown`).
3. backfill apply → verify SKY/Berel resuelven a nodo+label correctos.
4. flip guard staging → run con categoría `unknown` bloqueado; run resuelto pasa.
5. prod tras sign-off.

### Out-of-band coordination required

- Confirmar el catálogo de HubSpot industry enums vigente (para completar el mapeo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `grader_profiles` persiste `category_node_id` (nodo canónico) + `category_label`; el enum crudo de HubSpot ya no se interpola en ningún prompt.
- [ ] `resolveCanonicalCategory` mapea HubSpot enum → nodo (con website fallback) o `unknown`; determinista + testeado; mapeo extensible.
- [ ] Backfill idempotente aplicado + report de cobertura; SKY/Berel resuelven a nodo+label correctos.
- [ ] Guard `unknown` (flag) bloquea run/envío con `aeo_category_unresolved`; signal `profile_category_unresolved` en steady esperado.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate:up` + backfill dry-run/apply + smoke del resolver contra perfiles reales (SKY/Berel)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (EPIC-021, TASK-1289/1290/1291, ISSUE-110)
- [ ] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (category resolution canónica)

## Follow-ups

- LLM-assist para resolver categorías long-tail / sub-categorías finas (cuando el diccionario quede corto).
- Mapear también `sub_category` (nodos hijos de la taxonomía) si el buyer-intent lo requiere.

## Open Questions

- ¿La taxonomía actual (`catalog.ts`) tiene un nodo apropiado para aerolíneas/transporte de consumo, o hay que extenderla? (definir en Discovery; puede requerir agregar nodos `industry:*`).
