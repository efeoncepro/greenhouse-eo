# EPIC-021 — AEO Brand-Aware Prompt Generation Engine

> **COMPLETE 2026-06-30.** Las 5 child tasks (TASK-1288…1292) están complete; motor + guard + eval deployados a `main` con flags ON en Production (release `056c2dde8`) y staging (parity flip + redeploy `greenhouse-bt9fvga8d`). **Cerró ISSUE-110** (→ `resolved/`). Smoke staging verde (`operator_gate_blocking=ok`, 0 prospectos no graduables). Follow-up vigente: UI de review operador (`ui-ux`).

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `growth`
- Owner: `unassigned`
- Branch: `epic/EPIC-021-aeo-brand-aware-prompt-generation-engine`
- GitHub Issue: `none`

## Summary

Convierte el AI Visibility / AEO Grader de un motor **calibrado solo para el ICP de Efeonce** (¿aparece una *agencia/proveedor* B2B cuando una empresa busca proveedores?) a un motor **brand-aware** que genera el fan-out de prompts según la **categoría canónica** y el **modelo de negocio real** de la marca. Hoy el grader produce un diagnóstico **falso** (score 0) para cualquier marca que no sea una agencia/proveedor B2B — caso fuente: **Sky Airlines** (aerolínea grande de Sudamérica) salió "0 apariciones en IA", un falso negativo evidente, porque el prompt pack le preguntó a los motores por "¿qué agencias de AIRLINES_AVIATION ayudan a empresas?" en vez de la intención de compra real del consumidor. Cierra **ISSUE-110**.

## Why This Epic Exists

El problema es un **programa multi-capa**, no una sola task: hay que (1) dejar de inyectar el enum crudo de HubSpot en el prompt y resolver una categoría canónica con label, (2) introducir un eje nuevo de **modelo de negocio** (consumo vs B2B vs retail vs marketplace) que decide el framing del buyer-intent, (3) reemplazar el pack único de agencia por **packs por arquetipo × etapa de buyer-intent** sin romper el scoring determinista ni el golden-set, (4) gatear el cross-sell operador detrás de una **validación** (categoría + arquetipo) para que nadie envíe un diagnóstico falso a un prospecto, y (5) extender la **eval** a múltiples arquetipos. Cada pieza es una task con su propio contrato de datos/runtime; coordinarlas bajo un epic evita ejecutarlas fuera de orden (romper el grader live o el lead magnet).

## Outcome

- El grader mide **realista** cualquier marca (consumo, B2B, retail, banca, marketplace), no solo agencias — SKY aparece con score realista, no 0.
- El perfil del grader guarda una **categoría canónica** (`category_node_id` + label localizada) y un **modelo de negocio**, NUNCA el enum crudo de HubSpot.
- El cross-sell operador (TASK-1279) se **reabilita con seguridad**: rechaza correr/enviar si la categoría no se resolvió o el arquetipo no fue confirmado.
- El scoring (presencia / SoV / citación) sigue **determinista e idéntico**; solo cambian las preguntas. La eval cubre ≥3 arquetipos.

## Patrón transversal — Brand Intelligence (lectura grounded compartida)

Decisión de arquitectura (arch + seo + product, 2026-06-29): NO un artefacto monolítico que mezcle lo estable con lo volátil, NI tres lecturas del sitio. **Una sola lectura grounded de la marca (`brand_intelligence` snapshot, owned by TASK-1288) → tres DERIVACIONES separadas:** categoría (1288) y modelo de negocio (1289) son hechos estables (SoT del perfil); el prompt set (1290) es un artefacto volátil aparte. Se leen del MISMO snapshot (coherencia + costo: una lectura por marca), cada uno con su fallback (categoría → diccionario HubSpot; modelo → unknown; prompts → baseline), y se **confirman JUNTOS** en un solo review humano (TASK-1291, Adaptive Sidecar `reconciler`). El grounding de la MEDICIÓN sigue siendo el run contra los motores reales — el snapshot solo alimenta la autoría.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (motor, prompt packs, scoring, evals)
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (HubSpot como fuente, no SoT)
- Taxonomía: `src/lib/growth/ai-visibility/taxonomy/{catalog,contracts,mapper}.ts`

## Child Tasks

- `TASK-1288` — **Brand Intelligence (lectura grounded compartida) + resolución de categoría canónica.** Lee la marca UNA vez (LLM sobre site probe TASK-1266 + entity TASK-1267 → snapshot estructurado) y resuelve la categoría canónica por cascada con confianza (HubSpot enum = prior, snapshot = autoritativo, entity = cruce; `unknown` → confirma humano). **El snapshot es el input compartido que 1289/1290 consumen.** Foundation; desbloquea al resto.
- `TASK-1289` — **Clasificación de modelo de negocio** (`business_model` en el perfil: consumer_b2c / b2b_service_provider / b2b_product_saas / retail_ecommerce / marketplace / public_institution; clasificador determinista + override operador).
- `TASK-1290` — **Prompt set generado por marca (LLM-autora-luego-congela)** + baseline determinista por arquetipo. El LLM autora el fan-out de buyer-intent por marca UNA vez → se persiste versionado/inmutable (`grader_prompt_sets`) → review → congela; los runs usan el set `active` (deterministas, sin costo LLM por run). Reemplaza el pack único de agencia; scoring INTACTO.
- `TASK-1291` — **Gate de validación pre-run del operador + reabilitación del cross-sell** (chokepoint: bloquea run/envío si categoría `unknown` o arquetipo no confirmado; review/approval del operador para prospectos). Reabre TASK-1279 con seguridad.
- `TASK-1292` — **Eval golden-set por arquetipo + drift signals** (regresión multi-arquetipo: aerolínea consumo, SaaS B2B, retail).

## Existing Related Work

- **ISSUE-110** — el falso-0 (causa raíz documentada): bypass de taxonomía + prompt pack ICP-Efeonce.
- **TASK-1279** — cross-sell operador (el smoke con SKY lo destapó); **gateado OFF** hasta que este epic valide categorías.
- **TASK-1286** — auto-provisión del `grader_profile` (origen de `category = org.industry`).
- **EPIC-020** — programa del lead magnet AEO (este epic endurece su motor para que generalice).
- `src/lib/growth/ai-visibility/{provision-profile.ts, prompt-pack.ts, prompt-packs/*, taxonomy/*, scoring/*, evals/*}`.

## Exit Criteria

- [ ] El perfil del grader persiste `category_node_id` (taxonomía canónica) + label localizada + `business_model`; ningún run inyecta el enum crudo de HubSpot en un prompt.
- [ ] Un run sobre SKY (u otra marca de consumo) genera prompts de intención de consumo y devuelve un score realista (≠ 0 falso); verificado contra los motores reales.
- [ ] El cross-sell operador (TASK-1279) reabilitado: rechaza correr/enviar con categoría `unknown` o arquetipo no confirmado; el operador valida antes de un prospecto.
- [ ] El scoring es bit-for-bit el mismo para el caso agencia (no regresión del lead magnet); golden-set extendido a ≥3 arquetipos verde.
- [ ] ISSUE-110 movido a `resolved`.

## Non-goals

- Reescribir el motor de scoring (presencia/SoV/citación se quedan; solo cambian los prompts).
- **Generar prompts con LLM en vivo por cada run** (no reproducible, hostil a eval, costo por run, sesgo). El patrón canónico es **LLM-autora-luego-congela**: el LLM autora el set por marca UNA vez (con review + eval), se congela como artefacto versionado, y los runs usan ese set fijo (deterministas). Ver TASK-1290.
- Resolver la entidad/Knowledge Graph de cada marca (eje aparte; ver TASK-1267).
- Cambiar el contrato del cross-sell (TASK-1279) más allá del gate de validación.
