# TASK-1288 — AEO: Brand Intelligence (lectura grounded compartida) + resolución de categoría canónica

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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

Foundation transversal de EPIC-021: introduce **`brand_intelligence`** — una **lectura grounded compartida** de la marca (LLM lee el **site probe** de TASK-1266 + el eje **entity** de TASK-1267 (KG/Wikidata) y produce un snapshot estructurado) que **TASK-1288/1289/1290 consumen** (categoría, modelo de negocio, prompts) — se lee UNA vez, se derivan tres cosas. Sobre esa base, esta task **resuelve la categoría canónica**: el perfil deja de guardar el enum crudo de HubSpot (`organizations.industry = 'AIRLINES_AVIATION'`) y persiste `category_node_id` (nodo de `taxonomy/catalog.ts`, ej. `industry:transportation_airlines`) + `category_label` localizada. Resolución por **cascada con confianza**: el enum de HubSpot es un **prior barato** (mapeo determinista = baseline), el **brand_intelligence grounded** es la señal **autoritativa** (lee qué hace la marca + cómo la clasifica el mercado), cruzada con entity; **confianza baja/ambigua → `unknown` → confirmación humana** (el review unificado de TASK-1291). Guard: `unknown` bloquea el run/envío en vez de generar un prompt roto. Primer paso del cierre de **ISSUE-110**.

## Why This Task Exists

`provisionGraderProfileForOrganization` escribe `org.industry` crudo en `grader_profiles.category`, y `prompt-pack.ts` lo interpola literal → "¿qué agencias de **AIRLINES_AVIATION** ayudan a empresas?". Pero el enum de HubSpot es **poco confiable** (lo llena un vendedor a mano: genérico, equivocado o vacío) → mapearlo 1:1 hereda sus errores. La señal **autoritativa de qué es una marca es su sitio + su entidad** (cómo la clasifica el mercado/los motores), no el enum. Y como la categoría, el modelo de negocio (TASK-1289) y los prompts (TASK-1290) necesitan **la misma lectura de la marca**, conviene leerla una vez (snapshot compartido) y derivar — no tres lecturas inconsistentes ni un artefacto monolítico que acople lo estable (categoría) a lo volátil (prompts). Sin categoría canónica + label correctas, ningún prompt (de ningún arquetipo) se redacta bien.

## Goal

- **`brand_intelligence` snapshot compartido:** lectura grounded → estructura `{ what_the_brand_does, candidate_category_node, candidate_business_model, signals_used, confidence }`, cacheada/versionada por marca, **consumida por TASK-1288/1289/1290**. Output estructurado vía el cliente LLM canónico (`src/lib/ai/*`); degradación honesta sin señales.
- **Modelo de input (autónomo, sin formulario):** la **semilla** es lo que ya existe — `grader_profiles.website_url` (TASK-1285, derivado de la org; para prospecto viene del sync HubSpot company TASK-706) + el nombre de la marca. NO se le pide al operador llenar datos para arrancar. La lectura **trae el contenido legible** del sitio (home/about), no solo el probe técnico de TASK-1266 (robots/JSON-LD/sitemap) — el LLM necesita el texto para entender la marca — más el eje **entity** (KG/Wikidata, TASK-1267). Leer un sitio público es read-only y NO requiere consentimiento del sujeto (el consent es para *enviar*, no para analizar). El operador entra solo a **confirmar/corregir** el resultado (TASK-1291); el único input que podría faltar es la URL (borde: ausente/incorrecta).
- **Categoría canónica derivada:** persistir `category_node_id` (nodo de la taxonomía) + `category_label` localizada, resueltos por cascada — HubSpot enum (prior/baseline determinista) → brand_intelligence grounded (autoritativo) → cruce entity → `unknown` si baja confianza. Reemplaza el enum crudo. El LLM/clasificador elige un nodo REAL de la taxonomía (usando `aliases`/`examples`) o `unknown`, NUNCA inventa.
- **Guard + confirmación:** `category_node_id = unknown` (o confianza baja) ⇒ el run de portal/operador y el envío se bloquean con razón canónica; el operador confirma/corrige en el review unificado (TASK-1291).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (invariantes providers LLM — cliente canónico `src/lib/ai/*`, secret server-side)
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (HubSpot = fuente, no SoT; el enum se mapea, no se usa crudo)
- Taxonomía existente: `src/lib/growth/ai-visibility/taxonomy/{catalog,contracts,mapper}.ts`; site probe (TASK-1266) + entity probes (TASK-1267) como señales de grounding

Reglas obligatorias:

- **Patrón transversal (SSOT + derivaciones):** la lectura grounded (`brand_intelligence`) se hace UNA vez por marca (input compartido, cacheado/versionado); **categoría (acá), modelo de negocio (TASK-1289) y prompts (TASK-1290) son DERIVACIONES separadas** con su propio almacenamiento + fallback. NO mezclar lo estable (categoría/modelo, SoT del perfil) con lo volátil (prompt set) en un mismo artefacto; NO leer el sitio 3 veces.
- **NUNCA** persistir ni interpolar el enum crudo de HubSpot en un prompt. El SoT es el `category_node_id` canónico + su label localizada.
- **Cascada con confianza, no fuente única:** HubSpot enum = prior/baseline determinista; brand_intelligence grounded (site + entity) = autoritativo; salida acotada a un nodo REAL de la taxonomía (`aliases`/`examples`) o `unknown`. NUNCA inventar un nodo. Confianza baja/ambigua → `unknown` → confirmación humana (TASK-1291), nunca adivinar en silencio.
- **LLM vía cliente canónico** `src/lib/ai/*` (helper structured, secret server-side); degradación honesta: sin LLM / sin señales → cae al mapeo determinista del enum o `unknown`, NUNCA prompts rotos. Provenance del snapshot (señales usadas + confianza + versión) persistida.
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

- `migrations/<ts>_task-1288-brand-intelligence-canonical-category.sql` (snapshot `grader_brand_intelligence` + columnas `category_node_id`/`category_label`/`category_confidence` en `grader_profiles`; backfill)
- `src/lib/growth/ai-visibility/brand-intelligence/read-brand-intelligence.ts` (lectura grounded compartida: LLM sobre contenido del sitio + entity → snapshot estructurado) `[verificar]`
- `src/lib/growth/ai-visibility/brand-intelligence/fetch-site-content.ts` (traída read-only del contenido legible home/about; reusa/extiende el probe de TASK-1266) `[verificar]`
- `src/lib/growth/ai-visibility/taxonomy/hubspot-industry-map.ts` (diccionario HubSpot enum → nodo, prior/baseline) `[verificar naming]`
- `src/lib/growth/ai-visibility/taxonomy/resolve-category.ts` (resolver por cascada con confianza) `[verificar]`
- `src/lib/growth/ai-visibility/provision-profile.ts` (usar el resolver, no `org.industry` crudo)
- `src/lib/growth/ai-visibility/prompt-pack.ts` (interpolar la label canónica, no el enum)
- `src/lib/growth/ai-visibility/request-run.ts` (guard `unknown`/baja confianza) `[verificar]`
- `src/lib/ai/*` (reuse del cliente LLM canónico — NO SDK nuevo)

## Current Repo State

### Already exists

- Taxonomía canónica con nodos `industry:*` + labels `{es,en}` + aliases (`taxonomy/catalog.ts` + `mapper.ts`).
- **La semilla ya existe:** `grader_profiles.website_url` (TASK-1285) + nombre de marca; site probe técnico (TASK-1266) + entity probes KG/Wikidata (TASK-1267) que ya van al sitio/entidad read-only.
- `provision-profile.ts` que setea `category = org.industry` (el bug).
- `prompt-pack.ts` que interpola `{{category}}` = `vars.category`.

### Gap

- No hay `brand_intelligence` (lectura grounded compartida), ni la traída del **contenido legible** del sitio (el probe de TASK-1266 es técnico, no trae el texto home/about que el LLM necesita para entender la marca), ni resolver por cascada con confianza, ni persistencia de `category_node_id`/`category_label`/confianza, ni guard de `unknown`; el enum crudo se inyecta directo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (toca el perfil del grader live + guard que bloquea runs + lead magnet + introduce lectura LLM)
- Impacto principal: `migration` (snapshot + columnas) + `integration` (cliente LLM canónico) + `command`/`reader`
- Source of truth afectado: `grader_profiles.category_node_id`/`category_label` (SoT canónico) + `grader_brand_intelligence` (snapshot compartido); `organizations.industry` es fuente, no SoT
- Consumidores afectados: prompt-pack / run-engine / **TASK-1289 (modelo) + TASK-1290 (prompts) consumen el snapshot** / TASK-1291 (review) · lead magnet · cross-sell operador
- Runtime target: `local|staging|production`

### Contract surface

- Contratos nuevos: `readBrandIntelligence({ profileId, brandName, websiteUrl, hubspotIndustry?, siteProbe?, entitySignals? }) → snapshot` (grounded, LLM structured) · `resolveCanonicalCategory(snapshot, { hubspotIndustry? }) → { nodeId, label, source: 'hubspot_map'|'brand_intelligence'|'entity'|'unknown', confidence }`; columnas en `grader_profiles` + tabla `grader_brand_intelligence`.
- Backward compatibility: `additive` (`category` legacy se conserva durante migración + backfill).
- Full API parity: el snapshot + resolver son helpers canónicos reusados por provisión + TASK-1289/1290; el review/confirm es command gobernado (TASK-1291).

### Data model and invariants

- Entidades: `grader_brand_intelligence` (`profile_id`, `version`, `summary_json` {what_the_brand_does, candidate_category_node, candidate_business_model}, `signals_used_json`, `confidence`, `model`, `created_at`) — snapshot cacheado/versionado por marca. `grader_profiles` (+`category_node_id`, +`category_label`, +`category_confidence`, +`category_source`).
- Invariantes:
  - `category_node_id` ∈ nodos de `CATEGORY_TAXONOMY` ∪ `'unknown'`; NUNCA un enum HubSpot crudo ni un nodo inventado.
  - El snapshot se lee UNA vez por marca (cacheado); TASK-1289/1290 lo CONSUMEN (no re-leen el sitio). Categoría/modelo (estables, en `grader_profiles`) y prompt set (volátil, su propio artefacto) viven separados.
  - Resolución por cascada: HubSpot map (prior) + brand_intelligence (autoritativo) + entity (cruce) → confianza; baja → `unknown`. La parte determinista (HubSpot map) es pura/testeable; la parte LLM se congela en el snapshot (reproducible) y se confirma humano si baja confianza.
  - `category_label` = label localizada del nodo; si `unknown` → null.
- Tenant/space boundary: el perfil/snapshot ya es per-org.
- Idempotency/concurrency: backfill idempotente; el snapshot se regenera con versión nueva (no edit-in-place).
- Audit/outbox/history: snapshot versionado + provenance (señales + confianza + modelo); reliability signal de cobertura (perfiles `unknown`/baja confianza).

### Migration, backfill and rollout

- Migration posture: `additive` (snapshot + columnas nullable + backfill).
- Default state: el resolver determinista (HubSpot map) se usa de inmediato; la lectura LLM grounded + el guard `unknown` detrás de flag hasta backfill + verificación.
- Backfill plan: generar `brand_intelligence` + resolver categoría de los perfiles existentes (dry-run; report de cobertura + confianza; SKY/Berel verificados).
- Rollback path: revert PR (consumers caen al `category` legacy) + reverse migration; la lectura LLM se apaga por flag.
- External coordination: revisar el catálogo de HubSpot industry enums vigente (mapeo) + sign-off de costo de la lectura LLM (1×/marca/versión).

### Security and access

- Auth/access gate: helper interno; el confirm/override = capability operador (TASK-1291).
- Sensitive data posture: sin PII (categoría/industria/sitio son públicos); secret LLM server-side (`*_SECRET_REF`).
- Error contract: guard `unknown` → `canonicalErrorResponse('aeo_category_unresolved', …)` (nuevo code) en el chokepoint; degradación honesta sin LLM → mapeo determinista; `captureWithDomain(err,'growth',…)`.
- Abuse/rate-limit posture: la lectura LLM es 1×/marca/versión (cacheada) + cost ceiling; el run no agrega costo LLM.

### Runtime evidence

- Local checks: tests del mapeo determinista (enum conocido → nodo; desconocido → unknown) + del resolver por cascada (prior + snapshot + entity → confianza) + del guard + degradación sin LLM.
- DB/runtime checks: migrate verify; backfill dry-run + report de cobertura/confianza sobre perfiles reales (Berel, SKY).
- Integration checks: SKY (`industry='AIRLINES_AVIATION'` + sitio skyairline.com) → brand_intelligence lee "aerolínea" → `industry:transportation_airlines` (o el nodo correcto) label "Aerolíneas", confianza alta; cliente LLM canónico responde structured + acotado.
- Reliability signals/logs: `growth.ai_visibility.profile_category_unresolved` (count `unknown`/baja confianza, steady bajo).
- Production verification sequence: migrate staging → backfill dry-run → backfill apply → verify SKY/Berel resuelven correcto → flip guard.

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

### Slice 1 — Mapeo determinista (baseline) + resolver por cascada

- `hubspot-industry-map.ts` (diccionario HubSpot enum → nodo, prior/baseline) + `resolveCanonicalCategory` que combina prior + snapshot + entity con confianza → nodo o `unknown`. Tests.

### Slice 2 — Brand Intelligence (lectura grounded compartida)

- Migration `grader_brand_intelligence` (snapshot versionado) + `read-brand-intelligence.ts`: LLM (cliente canónico `src/lib/ai/*`, structured) sobre el site probe (TASK-1266) + entity (TASK-1267) → `{ what_the_brand_does, candidate_category_node, candidate_business_model, signals_used, confidence }`. Degradación honesta sin señales. **Lo consumen TASK-1289/1290.**

### Slice 3 — Persistencia + provisión + backfill

- Migration: `category_node_id`/`category_label`/`category_confidence`/`category_source` en `grader_profiles`. `provision-profile.ts` usa el resolver (no `org.industry` crudo). Backfill idempotente (genera snapshot + resuelve) + report de cobertura/confianza.

### Slice 4 — Render + guard + signal

- `prompt-pack.ts` interpola la label canónica. Guard `unknown`/baja confianza en el chokepoint (`request-run.ts`) detrás de flag + error canónico `aeo_category_unresolved`. Reliability signal `profile_category_unresolved`.

## Out of Scope

- El framing por arquetipo / packs de prompts (TASK-1290) — consume el snapshot.
- La DERIVACIÓN del `business_model` y su override (TASK-1289) — consume el snapshot; acá solo se persiste el `candidate_business_model` dentro del snapshot.
- El **review/confirm unificado** del operador (TASK-1291).

## Detailed Spec

`brand_intelligence` es el input compartido: se lee la marca UNA vez (grounded: sitio + entity) y se congela un snapshot; **categoría (acá), modelo (TASK-1289) y prompts (TASK-1290) son derivaciones separadas** de ese snapshot, cada una con su almacenamiento + fallback (no se lee el sitio 3 veces, no se acopla lo estable a lo volátil). La categoría se resuelve por **cascada con confianza**: HubSpot enum (prior barato) + brand_intelligence (autoritativo: qué hace la marca) + entity (cómo la clasifica el mercado) → un nodo REAL de la taxonomía o `unknown`. Baja confianza → `unknown` → el operador confirma (TASK-1291). El guard `unknown` evita correr el motor con una categoría que produciría prompts basura. HubSpot industry enum es **fuente** (mapeada/cruzada), nunca el dato.

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

- [ ] `brand_intelligence` snapshot compartido (grounded: site probe + entity, LLM structured vía cliente canónico, versionado + provenance) existe y **es consumido por TASK-1289/1290** (no se re-lee el sitio); degradación honesta sin señales.
- [ ] `grader_profiles` persiste `category_node_id` (nodo canónico) + `category_label` + `category_confidence` + `category_source`; el enum crudo de HubSpot ya no se interpola en ningún prompt.
- [ ] `resolveCanonicalCategory` resuelve por cascada con confianza (HubSpot prior + brand_intelligence + entity → nodo real o `unknown`); NUNCA inventa un nodo; el mapeo determinista es testeado/extensible.
- [ ] Backfill idempotente aplicado + report de cobertura/confianza; **SKY resuelve `industry:transportation_airlines` (o el correcto), NO un enum crudo**.
- [ ] Guard `unknown`/baja confianza (flag) bloquea run/envío con `aeo_category_unresolved` → confirmación humana (TASK-1291); signal `profile_category_unresolved` en steady esperado.

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

- Re-lectura del `brand_intelligence` cuando cambie el sitio/entidad de la marca (cadencia, opt-in) — alimenta el re-grade recurrente (TASK-1270) + la re-autoría de prompts (TASK-1290).
- Mapear también `sub_category` (nodos hijos de la taxonomía) si el buyer-intent lo requiere.

## Open Questions

- ¿La taxonomía actual (`catalog.ts`) tiene un nodo apropiado para aerolíneas/transporte de consumo + las categorías de marcas de consumo (banca, retail), o hay que extenderla? (definir en Discovery; probable agregar nodos `industry:*`).
- ¿El `brand_intelligence` snapshot vive en una tabla propia (`grader_brand_intelligence`) o como columnas JSON en `grader_profiles`? (recomendación: tabla versionada por la cadencia de re-lectura; definir en Discovery).
- ¿Qué modelo LLM para la lectura + su cost ceiling (1×/marca)? (alinear con TASK-1290, mismo cliente canónico).
