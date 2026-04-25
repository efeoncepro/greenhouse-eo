# TASK-609 — AI Quote Draft Assistant (intent -> canonical draft + QA guardrails)

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
- Epic: `—`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-609-ai-quote-draft-assistant`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Agregar una capa de IA asistiva al Quote Builder para traducir un brief comercial libre a un borrador estructurado, resolverlo contra el catalogo y el contrato canonico del cotizador, y devolver sugerencias, preguntas abiertas y blockers antes de guardar o emitir. La IA no calcula ni persiste precios finales por si sola: propone y explica; el pricing engine y los write paths actuales siguen siendo la fuente de verdad.

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

- Permitir que el usuario describa una cotizacion en lenguaje natural y obtenga un borrador estructurado reusable por el Quote Builder.
- Resolver ese borrador contra catalogo, enums, contratos de billing y restricciones canonicas del cotizador sin dar a la IA ownership del calculo.
- Exponer preguntas abiertas, ambiguedades, blockers y sugerencias de mejora antes de guardar o emitir.
- Mantener separacion estricta entre capa advisory IA y capa transaccional canonica.

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
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- La IA no puede reemplazar `pricing-engine-v2`, `persistQuotationPricing()` ni los write paths de quotations.
- La salida del LLM debe ser estructurada y validable; nunca texto libre ejecutado como truth layer.
- Toda resolucion critica debe pasar por mapeo canonico server-side hacia catalogo, pricing semantics, tax semantics y restricciones de acceso.
- Ningun save, issue, approve o sync HubSpot puede depender solo de inferencia IA no validada.
- La feature debe tratar la quote como objeto canonico con identidad Greenhouse; no crear una "quote IA" paralela.
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

### Slice 2 — Canonical resolver over quote intent

- Resolver `quote_intent` contra catalogo, pricing enums, billing frequency, country factors y restricciones del Quote Builder.
- Diferenciar explicitamente entre `resolved`, `ambiguous`, `unresolved` y `blocked`.
- Emitir un `resolution_report` con blockers como `catalog_match_ambiguous`, `missing_cost_basis`, `billing_semantics_missing`, `organization_unresolved` o equivalentes.

### Slice 3 — Quote Builder integration as reviewable draft

- Integrar una surface en el Quote Builder para "describir la cotizacion" y generar un borrador revisable.
- Permitir aceptar/rechazar sugerencias por linea y aplicar solo las confirmadas al draft actual.
- Presentar supuestos, preguntas abiertas y warnings antes de disparar save/issue.

### Slice 4 — AI QA before save / issue

- Agregar un pass advisory de QA que use el estado actual de la quote mas el `resolution_report` para detectar riesgos comerciales, gaps canonicos y readiness incompleta.
- Reutilizar blockers existentes del engine y del quote sync cuando aplique; no duplicar reglas en texto libre.
- Exponer checks como "quote lista para pricing", "quote lista para emitir", "quote lista para publish/sync" sin autoejecutar nada.

### Slice 5 — Auditability, tests and docs

- Registrar prompts relevantes, confidence, assumptions y decisiones de resolucion de forma trazable y segura para debugging.
- Cubrir con tests el contrato del `quote_intent`, el resolver canonico y la integracion minima de UI.
- Actualizar `cotizador.md` para explicar la diferencia entre draft IA, validacion canonica y persistencia real.

## Out of Scope

- Reemplazar el pricing engine o permitir que la IA calcule el precio final.
- Permitir writes directos a quotations o line items sin validacion canonica.
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

3. `Advisory UI layer`
   - muestra draft, preguntas, riesgos y sugerencias
   - solo aplica cambios confirmados por el usuario

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

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un contrato estructurado para `quote_intent` generado desde lenguaje natural y validado server-side.
- [ ] El sistema resuelve ese intent contra contratos canonicos del cotizador y devuelve `resolution_report` con resolved/ambiguous/unresolved/blocking.
- [ ] El Quote Builder permite revisar y aplicar sugerencias IA sin persistir automaticamente la quote.
- [ ] La capa advisory detecta blockers y readiness gaps antes de save/issue sin reemplazar validaciones deterministicas existentes.
- [ ] El pricing engine y los write paths actuales siguen siendo la unica fuente de verdad del calculo y la persistencia.
- [ ] La documentacion funcional del cotizador explica claramente la diferencia entre draft IA, validacion canonica y quote persistida.

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
