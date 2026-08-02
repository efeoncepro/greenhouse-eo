# TASK-609 — Agentic Quotation Orchestrator (read-only recommendation)

## Delta 2026-08-02 — Reencuadre sobre Finance Core y Cost Subledger

Esta task sigue siendo el owner del problema agentic; no se crea otro asistente. Su primer release deja de ser
UI-first y write-oriented: implementa `QuoteIntent → ProfileResolution → ServicePlan → CostCard` como capacidad
headless read-only/recommendation, usando el Cost Subledger y el kernel determinista. La UI del Quote Builder, la
creación de drafts y cualquier adapter de write externo quedan fuera de esta build unit.

Dependencias nuevas: ADR-021 durable, Finance Core reference foundation, Economic Event/journal-ready shadow,
Live Cost Subledger, Universal Profile Resolution, CostCard/quotation baseline y golden set. Los IDs de esas build
units se registran después del checkpoint del task planner.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-012`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `Finance Core + Cost Subledger build units pending task registration`
- Branch: `task/TASK-609-ai-quote-draft-assistant`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Traducir un brief comercial libre a `QuoteIntent`, resolver perfiles y servicios, consultar una base de costos viva
y devolver un `CostCard` determinista con escenarios, supuestos, confidence, warnings y blockers. La IA interpreta
y explica; Finance Core, Cost Subledger y pricing kernel conservan cálculo, vigencias, FX, margins y snapshots.

## Why This Task Exists

El cotizador ya tiene foundation fuerte: pricing engine canonico, tax snapshots, quote persistence, line-item orchestration y outbound HubSpot publish-ready. El cuello de botella actual no es "sumar precios", sino transformar intencion comercial ambigua en lineas bien formadas, elegir rapido entre catalogo/servicio/template/manual, detectar gaps antes de que el engine o HubSpot fallen y explicar el resultado a un AE sin obligarlo a pensar como Finance.

Hoy el usuario todavia debe hacer varias traducciones manuales:

- brief libre -> lineas estructuradas
- lenguaje humano -> SKU / producto / servicio / billing semantics validos
- estado de la quote -> readiness comercial / publish / sync
- warnings tecnicos -> explicacion accionable

Si la IA se mete dentro del calculo o de la persistencia, el riesgo de opacidad, drift y errores auditables es demasiado alto. La solucion correcta es una capa hibrida:

1. la IA interpreta intencion y propone un draft
2. el core deterministico resuelve, valida y simula
3. la IA explica gaps, riesgos y alternativas
4. el usuario confirma
5. el sistema persiste con los write paths actuales

## Goal

- Permitir que cualquier consumer autorizado describa una necesidad en lenguaje natural y obtenga una recomendación estructurada.
- Resolver cualquier perfil —observado o nunca contratado— sin inventar costos ni crear SKUs automáticamente.
- Descomponer servicios en work packages, entregables, roles, tools, providers, direct costs, rights y pass-through.
- Producir un `CostCard` mediante el reader canónico y el pricing kernel, sin persistir ni emitir cotizaciones.
- Validar replay y paridad entre Portal, Nexa, API/MCP y agentes mediante el golden set gobernado.

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
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_CORE_ACCOUNTING_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_AGENTIC_QUOTATION_ORCHESTRATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- La IA no puede reemplazar `pricing-engine-v2`, `persistQuotationPricing()` ni los write paths de quotations.
- La salida del LLM debe ser estructurada y validable; nunca texto libre ejecutado como truth layer.
- Toda resolucion critica debe pasar por mapeo canonico server-side hacia catalogo, pricing semantics, tax semantics y restricciones de acceso.
- Ningun save, issue, approve o sync HubSpot puede depender solo de inferencia IA no validada.
- La recomendación no crea una quote paralela ni escribe una quotation; `TASK-1212` conserva el command de autoría.
- La UX debe presentar supuestos, ambiguedades y `openQuestions` de forma explicita; no esconder inferencias como hechos.

## Normative Docs

- `docs/documentation/finance/cotizador.md`
- `docs/tasks/to-do/TASK-576-hubspot-quote-publish-contract-completion.md`
- `docs/tasks/to-do/TASK-252-admin-center-ops-copilot.md`
- `docs/issues/open/ISSUE-055-quote-builder-role-sku-missing-cost-basis.md`

## Dependencies & Impact

### Depends on

- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx`
- `src/views/greenhouse/finance/workspace/quote-builder-pricing.ts`
- `src/hooks/usePricingSimulation.ts`
- `src/app/api/finance/quotes/pricing/simulate/route.ts`
- `src/app/api/finance/quotes/route.ts`
- `src/app/api/finance/quotes/[id]/route.ts`
- `src/lib/finance/pricing/pricing-engine-v2.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/lib/finance/pricing/contracts.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/hubspot/hubspot-quote-sync.ts`

### Blocks / Impacts

- Quote Builder create/edit en `/finance/quotes/new` y `/finance/quotes/[id]/edit`
- futuros copilots por superficie (`TASK-252`, `TASK-438`) al establecer un patron institucional de IA grounded
- readiness comercial, tax y publish antes de emitir una quote
- follow-ups futuros de narrativa comercial, alternative quoting y template recommendation

### Files owned

- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`
- `src/views/greenhouse/finance/workspace/QuoteBuilderActions.tsx`
- `src/views/greenhouse/finance/workspace/quote-builder-pricing.ts`
- `src/hooks/usePricingSimulation.ts`
- `src/app/api/finance/quotes/pricing/simulate/route.ts`
- `src/lib/finance/pricing/pricing-engine-v2.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/lib/finance/pricing/contracts.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- `src/lib/ai/greenhouse-agent.ts`
- `src/app/api/internal/greenhouse-agent/route.ts`
- `docs/documentation/finance/cotizador.md`

## Current Repo State

### Already exists

- El Quote Builder ya expone create/edit full-page y corre simulacion contra `/api/finance/quotes/pricing/simulate`.
- `pricing-engine-v2` y `persistQuotationPricing()` ya son la capa canonica de calculo y persistencia.
- La quote ya tiene contrato tributario explicito y carril de sync/outbound HubSpot endurecido.
- El repo ya tiene patrones de IA advisory y enrichments (`greenhouse-agent`, Nexa, `ico_llm_enrichments`) que interpretan datos deterministicos sin reemplazarlos.
- La superficie ya muestra warnings y blockers del engine, pero no ayuda a construir el draft desde intencion libre.

### Gap

- no existe una capa `brief -> structured draft` para quotes
- no existe un resolver hibrido `candidate suggestion -> canonical match -> open questions`
- no existe QA inteligente pre-save/pre-issue grounded en el contrato real del cotizador
- el usuario todavia debe convertir manualmente intencion comercial a lineas canonicas
- la superficie no explica en lenguaje comercial varios fallos canonicos del engine o del publish path

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/commercial` + `src/lib/finance/pricing` + agent runtime compartido
- Future candidate home: `domain-package`
- Boundary: `QuoteIntent/ProfileResolution/ServicePlan → canonical cost reader/pricing kernel → CostCard`
- Server/browser split: contracts redacted pueden viajar; costs, margins, retrieval y model/provider quedan server-only
- Build impact: reusa runtime IA y pricing existentes; no introduce deployable nuevo
- Extraction blocker: transacción/authorization del pricing kernel y snapshots de Finance Core/Cost Subledger

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader`
- Source of truth afectado: ninguno nuevo; consume Finance Core, Cost Subledger, catálogos y pricing kernel
- Consumidores afectados: Portal, Nexa, API Platform, MCP y agentes autorizados
- Runtime target: Vercel/API Platform; recommendation read-only

### Contract surface

- Contrato existente a respetar: `simulateQuotePricing`, `pricing-engine-v2`, quote output redaction y capabilities
- Contrato nuevo o modificado: `QuoteIntent`, `ProfileResolution`, `ServicePlan`, `CostCard` y run receipt
- Backward compatibility: aditivo; no modifica quotes persistidas
- Full API parity: un reader/primitive server-side y adapters delgados; cero lógica distinta por consumer

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna migration propia; snapshots se leen por sus owners
- Invariantes: LLM no calcula dinero; no SKU automático; native money/FX preservados; internal cost no se filtra;
  missing/stale/partial/low-confidence falla cerrado según policy
- Tenant/space boundary: actor, workload, organization y output profile derivados de auth context
- Idempotency/concurrency: recommendation key por intent hash + source snapshot versions + policy/model/tool versions
- Audit/outbox/history: run receipt append-only con inputs estructurados, evidence refs, policy, model/tools y output;
  nunca chain-of-thought

### Migration, backfill and rollout

- Migration posture: `none` en esta task; consume migrations fundacionales previas
- Default state: read-only, allowlisted, feature flag OFF
- Backfill plan: no aplica
- Rollback path: flag OFF; snapshots y pricing runtime permanecen intactos
- External coordination: grants/API-MCP adapters solo si ya existen; writes externos fuera de scope

### Security and access

- Auth/access gate: `commercial.quote.simulate` + perfil de output resuelto server-side
- Sensitive data posture: loaded cost, salary, margin y supplier rates son internos
- Error contract: códigos canónicos sanitizados; sin raw provider/DB errors
- Abuse/rate-limit posture: budgets por run, timeout, tool allowlist, rate limits y kill switch

### Runtime evidence

- Local checks: schemas, resolver, deterministic replay y adversarial tests
- DB/runtime checks: readers contra snapshots reales allowlisted; cero writes
- Integration checks: mismo fixture por Portal/Nexa/API/MCP con output material equivalente
- Reliability signals/logs: stale/missing cost, low confidence, abstention, parity drift y cost per accepted result
- Production verification sequence: local golden → staging allowlist → recommendation real → readback/audit → ampliar allowlist

### Acceptance criteria additions

- [ ] Source versions, assumptions, confidence, blockers y output profile quedan en cada resultado.
- [ ] No existe mutation path en esta task.
- [ ] Paridad y redaction se prueban por consumer.

## Capability Definition of Done — Full API Parity gate

- [ ] La lógica vive en primitives server-side y no en UI/Nexa/MCP.
- [ ] El reader usa capability fina y output profile derivado del actor.
- [ ] Todos los consumers usan el mismo contract y kernel.
- [ ] Cualquier write se mantiene detrás de `TASK-1212` y fuera de esta task.

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

### Slice 1 — Intent contract + server-side draft generation

- Definir un contrato estructurado `quote_intent` para representar brief libre, candidate lines, assumptions, organization hints y open questions.
- Implementar un carril server-side que use el runtime IA existente para transformar lenguaje natural en ese shape estructurado.
- Validar el shape con schema fuerte y rechazar outputs incompletos o fuera de contrato.

### Slice 2 — Profile resolution + service plan

- Consumir Universal Profile Resolution para `member_actual`, `role_blended`, `role_modeled`, `role_proxy` y
  `manual_pending`, con geografía, seniority, modalidad, evidencia, rango y confidence.
- Resolver `quote_intent` contra catálogo, recipes, work packages, deliverables, tools, providers, direct costs,
  rights, pass-through, billing frequency y restricciones canónicas.
- Diferenciar explicitamente entre `resolved`, `ambiguous`, `unresolved` y `blocked`.
- Emitir `ProfileResolution` + `ServicePlan` con assumptions, evidence refs y open questions.

### Slice 3 — Deterministic CostCard recommendation

- Consultar Live Cost Subledger y CostCard/quotation baseline contracts; el LLM no calcula montos.
- Llamar al kernel determinista para units, FX, contribution/fully-loaded cost, floor/target margin y scenarios.
- Devolver blockers por costo faltante/stale/partial, FX no listo, margen bajo floor o profile confidence insuficiente.
- Aplicar redaction por perfil; costo y margen interno nunca cruzan al cliente.

### Slice 4 — Golden set, replay and consumer parity

- Ejecutar casos conocidos/desconocidos, servicios compuestos, tools, Globe, USD/CLP/UF, FX manual-only, stale data
  y margin floor.
- Probar que el mismo intent/snapshot produce el mismo resultado material en Portal, Nexa, API y MCP.
- Gatear promoción por exactitud matemática 100%, provenance completa, abstention y cero emission/write.

### Slice 5 — Auditability, tests and docs

- Registrar prompts relevantes, confidence, assumptions y decisiones de resolucion de forma trazable y segura para debugging.
- Cubrir con tests el contrato del `quote_intent`, el resolver canonico y la integracion minima de UI.
- Actualizar `cotizador.md` para explicar la diferencia entre draft IA, validacion canonica y persistencia real.

## Out of Scope

- Reemplazar el pricing engine o permitir que la IA calcule el precio final.
- Permitir writes directos a quotations o line items sin validacion canonica.
- Crear drafts, integrar UI del Quote Builder o exponer writes externos en este primer release.
- Autoemitir, autoaprobar o autosincronizar quotes hacia HubSpot.
- Disenar un chat generalista full-screen para Finance.
- Entrenar modelos propios o abrir infraestructura autonoma separada del runtime IA existente.
- Resolver en esta misma task la convergencia final de publish HubSpot de `TASK-576`.

## Detailed Spec

La feature debe operar sobre tres capas explicitas:

1. `Intent layer`
   - input humano libre
   - output estructurado `quote_intent`

2. `Canonical resolution layer`
   - mapea intencion a objetos y enums reales del repo
   - produce `resolution_report`
   - nunca persiste por si sola

3. `Recommendation layer`
   - devuelve `ProfileResolution`, `ServicePlan`, `CostCard`, preguntas, riesgos y sugerencias
   - no persiste ni ejecuta efectos

Contratos minimos esperados:

- `quote_intent`
  - `intentType`
  - `organizationHints`
  - `countryHint`
  - `commercialModelHint`
  - `durationHint`
  - `candidateLines[]`
  - `assumptions[]`
  - `openQuestions[]`
  - `confidence`

- `resolution_report`
  - `resolvedDraft`
  - `unresolvedItems[]`
  - `blockingIssues[]`
  - `warnings[]`
  - `qaChecks[]`
  - `readyForPricing`
  - `readyForIssue`
  - `readyForHubSpotSync`

El patron institucional debe quedar explicito:

- la IA propone
- el resolver canonico decide que es valido
- el usuario confirma
- el write path actual persiste

La task debe evaluar en Discovery si conviene reutilizar:

- `greenhouse-agent` como runtime principal, o
- un carril IA mas acotado sobre la misma infraestructura

Regla: no abrir un segundo runtime de copiloto si el existente puede aislar bien este dominio con tools y contrato estructurado.

## Rollout Plan & Risk Matrix

### Ordering hard rule

Finance Core reference → Economic Event/journal-ready shadow → Live Cost Subledger → Profile Resolution/CostCard
→ golden set → `TASK-609`. La task no se activa contra mocks o seeds como si fueran una base viva.

### Rollout

1. contracts + unit/adversarial tests locales;
2. golden set determinista y replay;
3. staging/internal allowlist, solo read/recommend;
4. paridad Portal/Nexa/API/MCP y redaction;
5. ampliar allowlist si exactitud, abstention, provenance y costo cumplen thresholds;
6. writes permanecen fuera de esta task y detrás de `TASK-1212`.

| Riesgo | Sistema | Probabilidad | Mitigación | Signal |
| --- | --- | ---: | --- | --- |
| Recomendación con costo stale/partial | Finance/Cost Subledger | medium | freshness/coverage gate + abstention | `commercial.agentic_quote.cost_not_ready` |
| Perfil desconocido mapeado en silencio | Profile Resolution | medium | estados explícitos + confidence + manual_pending | `commercial.agentic_quote.profile_low_confidence` |
| Número calculado por el LLM | Pricing | low | money solo desde CostCard/kernel + adversarial tests | `commercial.agentic_quote.kernel_parity_failed` |
| Fuga de costo/margen al cliente | Access/redaction | low | output profile server-side + negative tests | `commercial.agentic_quote.redaction_violation` |
| Resultado diferente por consumer | API/MCP/Nexa/Portal | medium | fixture/replay compartido + parity gate | `commercial.agentic_quote.consumer_drift` |
| Costo/latencia excesivos | Agent runtime | medium | budgets, timeout, caching por snapshot y kill switch | `commercial.agentic_quote.budget_exceeded` |

### Rollback

Flag OFF y retiro del adapter agentic. Finance Core, Cost Subledger, pricing engine, simulation y quotations
persistidas permanecen intactos porque esta task no escribe efectos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un contrato estructurado para `quote_intent` generado desde lenguaje natural y validado server-side.
- [ ] El sistema produce `ProfileResolution` y `ServicePlan` con evidencia, assumptions, confidence y estados resolved/ambiguous/unresolved/blocking.
- [ ] El `CostCard` sale del Cost Subledger y kernel determinista, con units, FX, margins, provenance, freshness y blockers.
- [ ] El golden set prueba replay y paridad entre consumers sin writes ni emisión.
- [ ] El pricing engine y los write paths actuales siguen siendo la unica fuente de verdad del calculo y la persistencia.
- [ ] La documentacion explica recomendación agentic, validación canónica, draft persistido y quote emitida como estados distintos.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validacion manual en `/finance/quotes/new` con al menos:
  - brief claro que resuelva bien
  - brief ambiguo que obligue preguntas abiertas
  - caso con blocker canonico real (`missing_cost_basis` o equivalente)
  - caso que llegue listo para simulate pero no listo para publish/sync

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo hallazgos o deuda relevante
- [ ] `changelog.md` quedo actualizado si cambio comportamiento visible
- [ ] se ejecuto chequeo de impacto cruzado sobre tasks relacionadas (`TASK-576`, `TASK-252`)

- [ ] `docs/documentation/finance/cotizador.md` quedo actualizada con el nuevo flujo hibrido

## Follow-ups

- Narrative layer cliente-facing para explicar la cotizacion en lenguaje comercial
- Recommendation engine de templates / paquetes similares
- Alternative quoting assistant ("mas barato", "mas margen", "mas corto plazo")
- readiness score especifico para publish HubSpot si `TASK-576` endurece mas el contrato

## Open Questions

- La primera version debe vivir solo en create, o tambien en edit?
- El primer release debe aceptar solo brief manual, o tambien pegar email / note / transcript?
- El runtime base sera `greenhouse-agent` o una especializacion mas acotada encima del mismo?
