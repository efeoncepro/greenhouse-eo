# TASK-1211 — Quote Builder API Parity & Multi-Consumer Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Commercial P1.2`
- Domain: `commercial|finance|api|ai`
- Blocked by: `none`
- Branch: `task/TASK-1211-quote-builder-api-parity-multi-consumer-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el frente del embudo Quote-to-Cash para Full API Parity multi-consumer. Hoy el cotizador autora y emite cotizaciones mediante una coreografia client-side dentro de `QuoteBuilderShell.handleSubmit` (`POST /quotes` | `PUT /quotes/:id` + `POST /lines` + `POST /issue`), sin un command unico, sin contrato introspectable, y sin estar registrado en ninguno de los 4 puntos de consumer programatico (Nexa tools, Nexa action registry, MCP server, API Platform lanes). Esta task extrae el command canonico de autoria/emision, separa la capability de **simulacion de precio** (read/compute, stateless) de la de **autoria/emision** (write/lifecycle), define perfiles de output de simulacion (`internal`/`client`/`public`), y expone read + acciones gobernadas a Nexa/MCP/API Platform. Es la fundacion que habilita los tres focos eventuales del cotizador (member interno, cliente self-service, simulador publico) sin construir nada Nexa-especifico.

## Why This Task Exists

El cotizador esta de cara hoy solo a un member de Efeonce cotizando a un cliente, pero el norte es que tenga tres consumers: (1) member interno, (2) cliente self-service simulando una cotizacion, (3) simulador de cotizacion en el sitio publico — ademas de ser operable por Nexa y MCP por construccion (Full API Parity es la base; Nexa total operability es su consecuencia, directiva CEO 2026-06-19).

Auditoria 2026-06-21 (arch-architect) sobre el estado real:

- **Read/compute path bien gobernado:** el pricing es server-authoritative (`buildPricingEngineOutputV2`), con command de persistencia (`persistQuotationPricing`/`recalculateQuotationPricing`) y reader canonico (`quotation-canonical-store`). Las funciones de calculo son puras y testeadas. Esta es la mitad dificil y ya esta hecha.
- **Write path es el gap (anti-patron remote-click-handler):** no existe un command unico "guardar/emitir cotizacion". `QuoteBuilderShell.tsx` (`handleSubmit`, ~lineas 1505-1727) coreografia a mano 3-4 fetch secuenciales + el fresh-simulate previo. La logica de orquestacion vive en el cliente, no en `src/lib/**`. Ningun otro consumer puede reproducir "guardar y emitir" sin reimplementar esa coreografia, y el flujo no es atomico (riesgo zombie: header actualizado con lineas viejas si falla el `POST /lines`).
- **Sin contrato introspectable:** cero Zod; el shape se sostiene con `as CreateQuotationPayload` + type-guards ad-hoc. Un consumer programatico no tiene schema que descubrir ni validar.
- **Capability huerfana:** `commercial.quote_to_cash.execute` existe en el catalogo de entitlements pero ninguna ruta la enforza ni ningun registry la consume; el gate real es `hasRouteGroup('commercial'|'finance')` (coarse).
- **Cero discovery programatico:** ni Nexa read tool, ni Nexa governed action (`registry.ts` solo tiene `mark_notifications_read`), ni MCP tool (`src/mcp/greenhouse/server.ts` es read-only sin quotes), ni API Platform lane. Nexa y MCP no pueden ni descubrir el cotizador.
- **Riesgo de seguridad de primer orden:** el cost stack, los role rate cards internos, los tool costs y `marginPct/classification` son las joyas de la corona. `stripCostStack` (`pricing/simulate/route.ts`) es un comienzo pero insuficiente para un consumer anonimo/cliente. Reusar el engine sin perfiles de output explicitos para client/public arriesga filtrar el modelo de margen completo.

## Goal

- Extraer un command canonico de autoria/emision (`submitQuoteFromBuilder` / `issueQuote`) en `src/lib/**`, atomico, idempotente, auditable, que la UI y todo consumer consuman; eliminar la coreografia client-side de `handleSubmit`.
- Separar explicitamente dos capabilities hoy conflacionadas: **A. simular precio** (read/compute stateless) y **B. autorar+emitir** (write/lifecycle).
- Definir perfiles de output de simulacion (`internal` | `client` | `public`) que garanticen que el cost stack / role rates / margin NUNCA cruzan a cliente ni publico.
- Dar un contrato introspectable (Zod) para los payloads de autoria y de simulacion.
- Registrar el cotizador en los consumers programaticos: Nexa read tool + Nexa governed action (`propose -> confirm -> execute`) + MCP tool + API Platform lane (`quotation.v1` / `quote_to_cash.v1`), absorbiendo el follow-up de API Platform parity diferido por TASK-1206.
- Dejar la fundacion lista para los follow-ups de cliente self-service (UI) y simulador publico (endpoint anonimo, STOP quadrant, ADR propio) — sin construirlos en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md` (**ADR gobernante de esta task** — `Proposed`; no materializar contratos externos irreversibles hasta `Accepted`)
- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1.md` (**spec de detalle**: split capability A/B, perfiles de output, matriz de consumers, resolver nombre→SKU, worked example)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (base + North Star + Canonical consumers)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` + `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/documentation/finance/cotizador.md`

Reglas obligatorias:

- La UI no es source of truth: la logica de autoria/emision se extrae a command/reader en `src/lib/**` y la UI pasa a ser un cliente thin del mismo primitive. Prohibido dejar orquestacion de negocio en `QuoteBuilderShell`.
- Un solo primitive, muchos consumers: UI, Nexa, MCP, API Platform y futuros (cliente/public) consumen el MISMO command/reader. NUNCA implementaciones paralelas por consumer.
- Writes via el loop de accion gobernada `propose -> confirm -> execute`: el LLM nunca muta directo; la mutacion ocurre solo en el endpoint de confirmacion humana.
- El cost stack / role rate cards / margin NUNCA cruzan al perfil `client` ni `public`. Defense-in-depth: la redaccion se computa server-side, nunca en cliente.
- Commercial es owner de la cotizacion (`greenhouse_commercial.quotations`) aunque la UI viva en `/finance/quotes`; respetar el boundary Commercial/Finance.
- **No duplicar TASK-1202** (capability enforcement de las 20 rutas quote / 15 reconciliation) ni **TASK-1206** (close command Q2C). Esta task consume las capabilities que TASK-1202 acuña y deja el cierre del embudo a TASK-1206 (ver Dependencies & Impact y Detailed Spec §Convergencia).

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`

## Dependencies & Impact

### Depends on

- Pricing engine y commands existentes (a reusar, no reimplementar):
  - `src/lib/finance/pricing/pricing-engine-v2.ts` (`buildPricingEngineOutputV2`)
  - `src/lib/finance/pricing/quotation-pricing-orchestrator.ts` (`persistQuotationPricing`, `recalculateQuotationPricing`, `buildQuotationPricingSnapshot`)
  - `src/lib/finance/pricing/line-item-totals.ts` (funciones puras)
  - `src/lib/finance/quotation-canonical-store.ts` (readers canonicos)
  - `src/lib/commercial/quotation-issue-command.ts` (`requestQuotationIssue`)
- Auth/capabilities:
  - `src/lib/entitlements/runtime.ts` (grant de `commercial.quote_to_cash.execute`)
  - `src/lib/tenant/authorization.ts` (`requireCommercialTenantContext`, `canViewCostStack`, `stripCostStack`)
- Consumers programaticos a extender:
  - `src/lib/nexa/nexa-tools.ts` (`NEXA_TOOLS`, `getNexaToolDeclarations`, `executeNexaTool`)
  - `src/lib/nexa/actions/registry.ts` (`NEXA_ACTION_REGISTRY`) + `src/lib/nexa/actions/confirm.ts`
  - `src/mcp/greenhouse/server.ts`
  - `src/app/api/platform/{app,ecosystem}/**`
- Tasks vecinas (coordinar, no duplicar):
  - `TASK-1202` — Finance Quotes Reconciliation Capability Extension (capability enforcement de rutas quote/reconciliation). **Owner del catalogo + gates de las write routes de quotes.** `[verificar estado de cierre]`
  - `TASK-1206` — Commercial Q2C Canonical Close Command (cierre del embudo). **Owner del convert-to-cash/invoice.**

### Blocks / Impacts

- Habilita el follow-up de cliente self-service (UI que simula cotizacion) — propuesto, no creado aun.
- Habilita el follow-up de simulador publico (endpoint anonimo + ADR, STOP quadrant) — propuesto, no creado aun.
- Absorbe y cumple el follow-up de API Platform parity Q2C diferido por `TASK-1206` (exposicion versionada `quotation.v1` / `quote_to_cash.v1`).
- Da a Nexa el primer punto de operabilidad real sobre Commercial (read tool + governed action).

### Files owned

- `src/lib/finance/pricing/` o `src/lib/commercial/` (ubicacion exacta del nuevo command — decidir en Plan Mode respetando el boundary Commercial/Finance) — nuevo `submit-quote-from-builder.ts` / `issue-quote.ts` command
- `src/lib/finance/pricing/quote-builder-pricing.ts` `[verificar path]`
- `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (refactor: delegar `handleSubmit` al command)
- `src/lib/finance/pricing/pricing-engine-v2.ts` (perfiles de output — solo lo necesario para la redaccion por perfil)
- `src/app/api/finance/quotes/route.ts`, `src/app/api/finance/quotes/[id]/route.ts`, `src/app/api/finance/quotes/[id]/lines/route.ts`, `src/app/api/finance/quotes/[id]/issue/route.ts`, `src/app/api/finance/quotes/pricing/simulate/route.ts` (delegar al command + contrato Zod + perfil de output)
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/actions/registry.ts` + nuevo `src/lib/nexa/actions/` definition para autoria/emision/simulacion
- `src/mcp/greenhouse/server.ts`
- `src/app/api/platform/app/**` y/o `src/app/api/platform/ecosystem/**` (lane de quotation)
- `src/lib/reliability/queries/` (signal de drift de cotizacion / parity)
- nuevos schemas Zod (ubicacion segun convencion del dominio) `[verificar convencion]`

## Current Repo State

### Already exists

- Pricing server-authoritative completo: engine V2, orchestrator command, reader canonico, funciones puras testeadas (`line-item-totals.test.ts`).
- Endpoints Product-API: ~28 route handlers bajo `src/app/api/finance/quotes/**` (create, `[id]`, lines, issue, approve, convert-to-invoice, recalculate, pricing/{simulate,config,lookup}, share, etc.).
- Capability `commercial.quote_to_cash.execute` ya sembrada en `entitlements/runtime.ts` (grant a `efeonce_account` + `FINANCE_ADMIN`).
- Redaccion parcial de cost stack: `stripCostStack` aplicado a no-privilegiados en `pricing/simulate/route.ts` via `canViewCostStack`.
- Nexa tooling y governed action runtime ya existen como patron (`NEXA_TOOLS`, `NEXA_ACTION_REGISTRY`, `propose_action` + confirm endpoint).

### Gap

- No existe command unico de autoria/emision; la coreografia vive en `QuoteBuilderShell.handleSubmit` (no atomico, no idempotente, no reusable).
- No hay separacion capability A (simular) vs B (autorar); ambas viven implicitas en el route-group coarse.
- No hay perfiles de output `internal`/`client`/`public`; el unico recorte es binario (`stripCostStack`) y no contempla consumer anonimo ni recorte del catalogo via `pricing/lookup`.
- No hay contrato Zod introspectable para los payloads de quote.
- La capability `commercial.quote_to_cash.execute` esta huerfana (no enforced, no consumida por ningun registry).
- Cero registro en Nexa tools, Nexa action registry, MCP server y API Platform lanes para quotes/pricing.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_commercial.quotations`, `greenhouse_commercial.quotation_line_items`, `greenhouse_commercial.quotation_versions`, `greenhouse_sync.outbox_events`
- Consumidores afectados: UI cotizador, Nexa Agent, MCP downstream, API Platform app/ecosystem lanes, y futuros (cliente self-service, simulador publico)
- Runtime target: `local`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: `persistQuotationPricing`, `recalculateQuotationPricing`, `buildPricingEngineOutputV2`, `requestQuotationIssue`, los readers de `quotation-canonical-store`, y las rutas Product-API actuales (backward-compatible).
- Contrato nuevo o modificado:
  - Command de autoria/emision, shape recomendado:
    ```ts
    submitQuoteFromBuilder({
      mode: 'create' | 'edit',
      quotationId,            // requerido en edit
      header,                 // datos de cabecera validados (Zod)
      lines,                  // line inputs (re-priced server-side, no honra price override de catalogo)
      issueAfterSave,         // boolean: emitir en la misma operacion
      idempotencyKey,
      correlationId,
      actor,
      reason
    }) => { operationId, quotationId, finalState, lineCount, issued, events }
    ```
  - Simulacion con perfil de output:
    ```ts
    simulateQuotePricing({ input, outputProfile: 'internal' | 'client' | 'public' })
    // 'internal' -> full output (cost stack, role rates, margin) si canViewCostStack
    // 'client'   -> bill rate + totales + IVA, SIN cost stack / role rates / margin
    // 'public'   -> igual que client + sobre catalogo publicado curado (no el interno completo)
    ```
- Backward compatibility: los HTTP callers actuales siguen funcionando; las rutas pueden agregar campos pero no cambiar semantica de fallo en silencio. La UI pasa a delegar en el command sin cambio visible.
- Full API parity: la accion de negocio vive en `src/lib/**` y toda ruta/UI/agente delega; los reads modelan `resource`/`search`, los writes command semantics + authz tenant-safe + audit/outbox + idempotencia + errores sanitizados.

### Data model and invariants

- Entidades/tablas afectadas: `greenhouse_commercial.quotations`, `quotation_line_items`, `quotation_versions`, `greenhouse_sync.outbox_events`.
- Invariantes que no se pueden romper:
  - **Atomicidad de save+issue:** una operacion de autoria que persiste cabecera + lineas + (opcional) emite, queda en una sola transaccion o hace rollback completo. NUNCA header actualizado con lineas viejas (zombie).
  - **Idempotencia:** un replay con el mismo `idempotencyKey` devuelve el resultado previo (mismo `operationId`/`quotationId`/`finalState`), NO crea una segunda cotizacion ni duplica lineas.
  - **El precio SIEMPRE viene del engine:** el command no honra price overrides de cliente para lineas de catalogo (preservar el guard actual de `quote-builder-pricing`); re-simula fresco antes de persistir.
  - **Aislamiento del cost stack:** los perfiles `client`/`public` NUNCA incluyen cost stack, role rate cards, tool costs ni `marginPct`/`classification`. La redaccion es server-side; un cliente del perfil `client`/`public` no puede pedir el perfil `internal`.
  - **El perfil `public` computa sobre catalogo publicado curado**, no sobre `greenhouse_commercial` ni `pricing/lookup` interno completo; no filtra IDs internos.
  - **Loop gobernado para Nexa:** Nexa nunca persiste/emite directo; propone, y la mutacion ocurre solo en el endpoint de confirmacion humana behind capability.
- Tenant/space boundary: usar el contexto tenant/internal existente + `organization_id` de la quotation; sin lookup cross-tenant por id crudo. El perfil `public` es anonimo y no resuelve tenant — su superficie de datos es solo el catalogo publicado.
- Idempotency/concurrency: `idempotencyKey` persistido + lock de la quotation en edit; replay devuelve el resultado previo.
- Audit/outbox/history: registrar actor, reason, mode, before/after de estado de la quote, correlation id y event ids emitidos.

### Migration, backfill and rollout

- Migration posture: preferir sin migracion; DDL aditivo solo si el command necesita persistir `idempotencyKey`/`correlationId` o si el catalogo publicado (perfil public) requiere una proyeccion/tabla nueva — decidir en Plan Mode.
- Default state: la delegacion de rutas al command es aditiva y behavior-preserving. La exposicion a Nexa/MCP/API Platform nace gateada por capability. El perfil `public` NO se expone como endpoint en esta task (solo se define la capa de compute + redaccion).
- Backfill plan: ninguno (no toca cotizaciones historicas).
- Rollback path: revert PR + redeploy; la UI puede repuntar a la coreografia previa si el command falla en cutover (gated). Signals/queries aditivas pueden quedarse.
- External coordination: ninguna externa; coordinar internamente con owners de TASK-1202 (capabilities) y TASK-1206 (close command) antes de tocar el catalogo de capabilities o el lane de API Platform.

### Security and access

- Auth/access gate: introducir/consumir capabilities finas. **A. simular:** capability de lectura/compute (p.ej. `commercial.quote.simulate`) con el perfil de output como dimension; **B. autorar/emitir:** capability fina de write (coordinar con TASK-1202 para no acuñar duplicado; reusar la familia que TASK-1202 defina o `commercial.quote_to_cash.execute` si aplica). Retirar la dependencia del route-group coarse donde el command ya enforza.
- Sensitive data posture: cost stack / role rates / margin son las joyas de la corona — redaccion por perfil server-side, defense-in-depth. Errores sanitizados (`redactErrorForResponse`).
- Error contract: errores canonicos (`canonicalErrorResponse`) con codes estables para payload invalido, permiso denegado, perfil no autorizado, replay/idempotencia y estado invalido de quote.
- Abuse/rate-limit posture: el perfil `public` (cuando se exponga en su follow-up) exige rate-limit + circuit breaker; en esta task solo se define la capa de compute, sin endpoint anonimo.

### Runtime evidence

- Local checks: tests del command (atomicidad save+issue, idempotent replay, no honra price override), tests de redaccion por perfil (`internal`/`client`/`public` no filtran cost stack), test de la Nexa governed action (propose no muta; confirm muta behind capability).
- DB/runtime checks: SQL read-only antes/despues de una autoria via command (quotation + lines + version + outbox event).
- Integration checks: staging smoke de crear+emitir una quote via el command (no via la coreografia UI), y un read via Nexa tool + MCP tool.
- Reliability signals/logs: signal de parity/drift (p.ej. `commercial.quote.authored_without_command` si alguna ruta persiste fuera del command — steady=0) y health del governed action.
- Production verification sequence: deploy gated -> read-only readiness -> una autoria+emision allowlisted via command -> verificar quotation/lines/version/outbox -> confirmar Nexa/MCP discovery del tool -> signals steady.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes de datos, boundary tenant/access y posture de idempotencia/concurrencia explicitos.
- [ ] Posture de migracion/backfill/rollback explicita y proporcional al riesgo.
- [ ] Evidencia runtime o DB listada para cada cambio mas alla de docs/tooling.
- [ ] Dominios sensibles con errores canonicos, posture de audit/signal y sin fuga de cost stack.

## Capability Definition of Done — Full API Parity gate

- [ ] La autoria + emision de una cotizacion puede ejecutarse programaticamente via el command canonico sin UI.
- [ ] La simulacion de precio puede ejecutarse con perfil `internal`/`client`/`public`, y `client`/`public` jamas reciben cost stack/role rates/margin.
- [ ] Las rutas Product-API y la UI delegan en el mismo command/compute server-side en vez de logica de negocio separada.
- [ ] El command emite audit/outbox con actor, reason, correlation e idempotencia.
- [ ] El cotizador esta registrado en >=1 consumer programatico de lectura (Nexa tool + MCP) y su write esta disponible via governed action `propose -> confirm -> execute` behind capability.
- [ ] El follow-up de API Platform parity Q2C diferido por TASK-1206 queda cumplido (lane versionado) o explicitamente enlazado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extraer el command de autoria/emision

- Crear `submitQuoteFromBuilder` (mode create/edit, issueAfterSave) que componga la secuencia hoy coreografiada en `handleSubmit`: fresh-simulate -> persist via orchestrator -> emit via `requestQuotationIssue`, en una operacion atomica + idempotente.
- Refactorizar `QuoteBuilderShell.handleSubmit` para delegar en el command (un solo call), preservando comportamiento visible.
- Cubrir con tests: atomicidad save+issue, replay idempotente, no honra price override de catalogo.

### Slice 2 — Perfiles de output de simulacion (capability A)

- Definir `outputProfile` (`internal`/`client`/`public`) sobre `buildPricingEngineOutputV2` y la ruta `pricing/simulate`, con redaccion server-side: `client`/`public` sin cost stack / role rates / margin.
- Definir la capability de simulacion y enforcarla en la ruta de simulate (coordinar con TASK-1202 para el catalogo).
- Para `public`: definir la capa de compute sobre catalogo publicado curado (sin exponer endpoint anonimo en esta task).
- Tests de redaccion: ningun campo sensible cruza en `client`/`public`.

### Slice 3 — Contrato Zod introspectable

- Definir schemas Zod para los payloads de autoria (header + lines) y de simulacion; las rutas parsean/coercen con el schema en vez de `as` + type-guards.
- Exportar el contrato de forma introspectable para consumers programaticos.

### Slice 4 — Exposicion a consumers programaticos (Nexa + MCP + API Platform)

- Nexa read tool sobre los readers de quotes (`list`/`get`/`simulate`) en `NEXA_TOOLS`.
- Nexa governed action (autorar/emitir) en `NEXA_ACTION_REGISTRY` con loop `propose -> confirm -> execute` behind capability; el confirm endpoint delega en el command de Slice 1.
- MCP read tool en `src/mcp/greenhouse/server.ts`.
- API Platform lane versionado (`quotation.v1` / `quote_to_cash.v1`) en `api/platform/{app,ecosystem}` — **cumple el follow-up diferido por TASK-1206** (coordinar para hacerlo una vez para todo el embudo, incluyendo el close de 1206).

### Slice 5 — Reliability, parity gate y closure

- Signal de parity/drift (autoria fuera del command, steady=0) + health del governed action.
- Smoke runtime: crear+emitir via command (no UI) + read via Nexa tool + MCP tool.
- Docs: actualizar `docs/documentation/finance/cotizador.md` + manual; documentar el split capability A/B y los perfiles de output.

## Out of Scope

- **El simulador publico (endpoint anonimo)** — STOP quadrant, requiere ADR propio (rate-limit, circuit breaker, catalogo publicado, sin IDs internos). Esta task solo define la capa de compute + redaccion del perfil `public`. -> follow-up.
- **La UI de cliente self-service** (pantalla que el cliente usa para simular) -> follow-up; depende ademas de decision de producto (¿solo simular o "pedir cotizacion real"?).
- **El close command Q2C** (convert-to-cash/invoice) -> owned por `TASK-1206`.
- **El enforcement de capabilities sobre las 20 rutas quote / 15 reconciliation** -> owned por `TASK-1202`; esta task consume las capabilities, no re-acuña el catalogo.
- Cambios en el modelo de pricing/engine (formulas, FX, margin) — se reusa tal cual.
- Migracion masiva o backfill de cotizaciones historicas.

## Detailed Spec

### El split capability A (simular) vs B (autorar)

Son dos capabilities distintas hoy conflacionadas. El cliente self-service y el simulador publico **solo necesitan A** (compute stateless), no B. Separarlas desacopla el consumer mas riesgoso (publico anonimo) del write path: no se expone el motor de cotizaciones al internet, se expone un compute sandboxeado con output recortado. B (autoria/emision) queda como command gobernado, write, behind capability fina + governed action para Nexa.

### Convergencia con TASK-1202 y TASK-1206 (lo que el usuario pidio resolver)

El embudo Quote-to-Cash tiene tres piezas, una por task, sin solape:

| Pieza del embudo | Owner | Que hace |
|---|---|---|
| **Frente** — simular + autorar + emitir + exponer a consumers | **TASK-1211 (esta)** | command de autoria/emision, split capability A/B, perfiles de output, Nexa/MCP/API Platform |
| **Enforcement** — capabilities finas en las write routes quote/reconciliation | **TASK-1202** | mapea rutas a capabilities + gates + tests 403/happy-path |
| **Cierre** — convert-to-cash/invoice (issued -> converted + contract + income + AR) | **TASK-1206** | close command canonico Q2C |

Puntos de convergencia concretos:

1. **Capability catalog:** TASK-1202 es owner del catalogo + gates de las write routes de quotes. TASK-1211 **consume** esas capabilities (no las re-acuña) y enforza el command. La unica capability potencialmente net-new de TASK-1211 es la de **simulacion con perfil** (read/compute), porque TASK-1202 se enfoca en write routes; coordinar para ubicarla en el mismo catalogo. La capability huerfana `commercial.quote_to_cash.execute` se resuelve entre 1202 (enforcement) y 1211/1206 (consumo).
2. **API Platform parity:** TASK-1206 difiere explicitamente "el follow-up de API Platform parity Q2C" (`quotation.v1` / `quote_to_cash.v1`). TASK-1211 Slice 4 **lo absorbe y lo hace una sola vez para todo el embudo**, exponiendo tanto la autoria/emision (1211) como el close (1206) en el mismo lane versionado. Coordinar el orden: si 1206 cierra antes, 1211 incluye su close en el lane; si 1211 cierra antes, deja el slot del close listo para que 1206 lo rellene.
3. **Nexa operability:** la governed action de 1211 (autorar/emitir) y el close de 1206 comparten el mismo runtime `propose -> confirm -> execute`. Registrar ambos como acciones gobernadas del mismo dominio commercial-q2c, no dos integraciones Nexa separadas.
4. **Boundary Commercial/Finance:** las tres tasks respetan que Commercial es owner de la cotizacion y Finance del objeto financiero; el command de autoria de 1211 vive en el lado Commercial del boundary (confirmar ubicacion exacta en Plan Mode).

### Las dos computaciones de dinero client-side a sanear

La auditoria 2026-06-21 encontro dos calculos monetarios en el cliente que conviene revisar al extraer el command:

- **IVA preview** (`quotation-tax-constants.ts`, `previewChileTaxAmounts`) — sancionado como optimistic UI (el server re-resuelve la tasa canonica al emitir). Mantener, pero documentar que es espejo no autoritativo.
- **Descuento por linea** (`QuoteLineItemsEditor.tsx`) — el descuento se aplica client-side; el descuento persistido podria divergir de cualquier politica server-side. Al extraer el command, rutear la aplicacion de descuento por el engine/command para lineas de catalogo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- Slice 4 (exposicion a consumers) NO antes de que el command (Slice 1) + perfiles (Slice 2) + contrato Zod (Slice 3) existan: exponer sobre la coreografia actual filtraria el cost stack y replicaria logica por consumer.
- El perfil `public` se define como compute (Slice 2) pero su endpoint anonimo queda fuera de scope (follow-up con ADR).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga de cost stack / role rates / margin a cliente o publico | commercial pricing | high | perfiles de output server-side + tests de redaccion + defense-in-depth; cliente no puede pedir perfil internal | test de redaccion rojo / review |
| Save+issue no atomico deja quote zombie | commercial quotations | medium | command en una transaccion + rollback completo | quote con lineas viejas / converted_without_lines |
| Doble cotizacion en replay | commercial quotations | medium | `idempotencyKey` persistido + replay devuelve previo | duplicate quotation por idempotencyKey |
| Re-acuñar capability que TASK-1202 ya define (drift de catalogo) | entitlements | medium | coordinar catalogo con TASK-1202 antes de Slice 2/4 | capability-grant-coverage test |
| Exponer write a Nexa sin loop gobernado | nexa/safety | low | governed action `propose -> confirm -> execute`; LLM nunca muta directo | review del action registry |
| Romper comportamiento visible de la UI al refactor del shell | operator workflow | medium | command behavior-preserving + GVC del cotizador antes/despues + cutover gated | smoke UI / GVC diff |

### Feature flags / cutover

- El command + delegacion de rutas es aditivo y behavior-preserving; el refactor del shell se verifica con GVC.
- La exposicion a Nexa/MCP/API Platform nace gateada por capability.
- El perfil `public` no tiene cutover en esta task (no se expone endpoint).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR; UI repunta a la coreografia previa | <15 min | si |
| Slice 2 | Revert perfiles; volver a `stripCostStack` binario | <15 min | si |
| Slice 3 | Revert schemas Zod; rutas vuelven a type-guards | <10 min | si |
| Slice 4 | Desregistrar tools/action/lane (gated) | <10 min | si |
| Slice 5 | Revert signals/docs | <10 min | si |

### Production verification sequence

1. Deploy command + delegacion gated.
2. GVC del cotizador (desktop+mobile) antes/despues — sin cambio visible.
3. Read-only readiness: una autoria+emision allowlisted via command -> verificar quotation/lines/version/outbox.
4. Confirmar Nexa/MCP discovery del read tool + governed action behind capability.
5. Tests de redaccion por perfil verdes en runtime.
6. Signals steady (parity drift = 0).

### Out-of-band coordination required

- Owners de TASK-1202 (capability catalog) y TASK-1206 (close command + API Platform follow-up) deben alinear el catalogo de capabilities y el lane versionado antes de Slice 2/4.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un command canonico `submitQuoteFromBuilder` (create/edit + issueAfterSave) en `src/lib/**`, atomico e idempotente; `QuoteBuilderShell.handleSubmit` delega en el sin cambio visible.
- [ ] La simulacion soporta `outputProfile` `internal`/`client`/`public`, y `client`/`public` jamas reciben cost stack / role rates / margin (test de redaccion verde).
- [ ] El perfil `public` computa sobre catalogo publicado curado, no sobre el catalogo interno completo ni `pricing/lookup` interno.
- [ ] Hay contrato Zod introspectable para payloads de autoria y simulacion; las rutas parsean con el schema (no `as` + type-guards).
- [ ] El command es idempotente (replay devuelve el resultado previo) y atomico (no quote zombie) — cubierto por tests.
- [ ] El cotizador esta registrado como Nexa read tool + MCP read tool; la autoria/emision esta disponible como Nexa governed action `propose -> confirm -> execute` behind capability.
- [ ] Existe lane API Platform versionado para quotation; el follow-up de API Platform parity Q2C de TASK-1206 queda cumplido o enlazado.
- [ ] La capability de autoria/emision consumida NO duplica el catalogo de TASK-1202 (coordinada).
- [ ] Signal de parity/drift (autoria fuera del command, steady=0) wired a `/admin/operations`.
- [ ] Evidencia runtime: una autoria+emision via command produce quotation + lines + version + outbox; un read via Nexa/MCP funciona.

## Verification

- `pnpm test` (focal del command + redaccion + governed action, luego full suite al cierre)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm task:lint --task TASK-1211`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --runtime --data --docs`
- `pnpm finance:e2e-gate --strict` (toca write paths bajo `src/app/api/finance/quotes/**`)
- GVC del cotizador antes/despues (desktop+mobile) para confirmar refactor behavior-preserving
- Read-only DB smoke: quotation + lines + version + outbox de una autoria via command

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-1202`, `TASK-1206` y los follow-ups de cliente self-service y simulador publico
- [ ] documentacion funcional + manual del cotizador actualizados con el split capability A/B y perfiles de output

## Follow-ups

- Simulador publico (endpoint anonimo): ADR + task propia (rate-limit, circuit breaker, catalogo publicado, sin IDs internos). STOP quadrant — no antes de que esta fundacion este solida.
- Cliente self-service (UI): pantalla que el cliente usa para simular; depende de decision de producto (solo simular vs pedir cotizacion real). Execution profile `ui-ux`.
- Sanear el descuento por linea client-side (`QuoteLineItemsEditor.tsx`) ruteandolo por el engine/command si no se cierra en Slice 1.

## Open Questions

- ¿El cliente self-service solo **simula** (capability A) o tambien **pide una cotizacion real** (A + B con aprobacion interna)? Decision de producto que cambia el alcance del follow-up de UI.
- ¿Ubicacion exacta del command de autoria — `src/lib/commercial/**` (owner del aggregate) vs `src/lib/finance/pricing/**` (donde vive el pricing hoy)? Resolver en Plan Mode con `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`.
- ¿La capability de simulacion con perfil es net-new (`commercial.quote.simulate`) o se modela como dimension de una existente? Coordinar con TASK-1202.
- ¿El lane API Platform se hace en esta task para todo el embudo (incl. el close de 1206) o solo el frente, dejando el slot del close para 1206? Depende del orden de cierre relativo de 1211 vs 1206.
