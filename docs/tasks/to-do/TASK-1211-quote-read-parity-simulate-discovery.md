# TASK-1211 — Quote Read Parity (Simulate + Discovery para Nexa/MCP/cliente/público)

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
- Backend impact: `api`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Commercial P1.2`
- Domain: `commercial|finance|api|ai`
- Blocked by: `none`
- Branch: `task/TASK-1211-quote-read-parity-simulate-discovery`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

**Read vertical** del cotizador para Full API Parity multi-consumer (capability **A. simular**, read/compute, stateless). Expone el pricing como capability gobernada descubrible y operable en lectura por todos los consumers: define perfiles de output (`internal`/`client`/`public`) con redacción server-side (cost stack / role rates / margin NUNCA cruzan a `client`/`public`), crea el resolver compartido `searchServiceCatalog` (nombre→`serviceSku`), da contrato Zod introspectable de simulación, y registra el read tool en Nexa + MCP + API Platform lane. El cálculo desde un servicio nombrado ya existe (`from-service`/recipe); esta task lo hace **descubrible por nombre y consultable por agentes** sin tocar el write path ni el shell de la UI. Es el incremento que habilita el escenario norte ("¿cuánto cuesta un servicio de diseño digital?" respondido por Nexa o Claude vía MCP). El **write vertical** (autoría/emisión) es `TASK-1212`.

## Why This Task Exists

El norte del cotizador tiene tres focos (member interno, cliente self-service, simulador público) + operabilidad Nexa/MCP por construcción. La auditoría arch-architect 2026-06-21 (ADR `GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md`, `Accepted`) decidió partir el cotizador en **dos capabilities**: A. simular (read/compute) y B. autorar/emitir (write). El cliente self-service y el simulador público **solo necesitan A**, lo que desacopla el consumer más riesgoso (público anónimo) del write path.

Estado real del read path: el engine es server-authoritative (`buildPricingEngineOutputV2`) y `/api/finance/quotes/from-service` (`expandServiceIntoQuoteLines`) ya pricea una receta de servicio end-to-end con cero input humano — el mínimo es el `serviceSku`. **Gaps que cierra esta task:** (1) no hay forma de mapear texto libre ("servicio de diseño digital") a un `serviceSku` → ni Nexa ni MCP pricean en frío; (2) el recorte de cost stack es binario (`stripCostStack`) e insuficiente para consumers anónimos/cliente → falta perfil de output por auth context; (3) sin contrato Zod introspectable; (4) cero registro del cotizador en Nexa tools / MCP server / API Platform lanes.

**Decisión de wave (consultar-first, ADR aceptado):** externos/MCP solo **consultan** (simulate); el write lane externo se difiere. Por eso esta task es read-only y de bajo blast radius.

## Goal

- Definir perfiles de output de simulación (`internal`/`client`/`public`) con redacción server-side; el perfil se deriva del auth context, NUNCA default a `internal`.
- Crear el reader compartido `searchServiceCatalog(query)` (nombre/alias → `serviceSku`) consumido por Nexa, MCP y la búsqueda de la UI (un primitive, muchos consumers).
- Dar contrato Zod introspectable del payload de simulación + capability `commercial.quote.simulate`.
- Registrar el cotizador como **read tool** en Nexa (`NEXA_TOOLS`) + MCP (`server.ts`) + API Platform read lane (`quotation.v1`), eligiendo el perfil de output por identidad del caller.
- Dejar el escenario norte funcionando: preguntar el precio de un servicio por nombre a Nexa o a Claude-vía-MCP y obtener una respuesta correcta y sin fuga de margen.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md` (**ADR gobernante** — `Accepted`)
- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1.md` (**spec de detalle**: split A/B, perfiles, matriz de consumers, resolver, worked example §8)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (base + North Star)
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` + `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Un primitive por capability, muchos consumers: UI, Nexa, MCP y API Platform consumen el MISMO `simulateQuotePricing`/`searchServiceCatalog`. NUNCA una integración "Nexa-específica".
- El cost stack / role rate cards / `marginPct`/`classification` NUNCA cruzan a perfil `client`/`public`. Redacción server-side; el perfil se deriva del auth context, NUNCA default a `internal`.
- El perfil `public` computa sobre catálogo publicado curado (no `pricing/lookup` interno). En esta task se define la capa de compute + redacción; el **endpoint anónimo público queda fuera de scope** (follow-up, ADR propio).
- Read-only: esta task NO extrae el command de autoría ni toca `QuoteBuilderShell` (eso es `TASK-1212`).
- Capability catalog: `TASK-1202` es steward; la capability `commercial.quote.simulate` se acuña siguiendo su convención (coordinar).

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`

## Dependencies & Impact

### Depends on

- Pricing/catalog existentes (reusar, no reimplementar):
  - `src/lib/finance/pricing/pricing-engine-v2.ts` (`buildPricingEngineOutputV2`)
  - `src/lib/commercial/service-catalog-expand.ts` (`expandServiceIntoQuoteLines`) + `src/lib/commercial/service-catalog-store.ts` (`getServiceBySku`/`getServiceByModuleId`)
  - `src/lib/finance/quotation-canonical-store.ts` (readers)
  - `src/app/api/finance/quotes/pricing/simulate/route.ts`, `.../pricing/lookup/route.ts`, `.../from-service/route.ts`
- Auth/redacción: `src/lib/tenant/authorization.ts` (`canViewCostStack`, `stripCostStack`, `requireCommercialTenantContext`)
- Consumers a extender: `src/lib/nexa/nexa-tools.ts`, `src/mcp/greenhouse/server.ts`, `src/app/api/platform/{app,ecosystem}/**`
- Capability catalog: `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (coordinar naming con `TASK-1202`)

### Blocks / Impacts

- Es precondición funcional de `TASK-1212` (write vertical reusa el resolver + simulate).
- Habilita el follow-up de cliente self-service (UI de simulación, perfil `client`).
- Habilita el follow-up de simulador público (perfil `public` + endpoint anónimo, ADR propio).
- Entrega el primer punto de operabilidad de lectura de Nexa/MCP sobre Commercial.
- Cumple la parte **read** del follow-up de API Platform parity Q2C diferido por `TASK-1206`.

### Files owned

- `src/lib/finance/pricing/` — `simulateQuotePricing` (wrapper con `outputProfile` + redacción)
- `src/lib/commercial/service-catalog-search.ts` (nuevo) — `searchServiceCatalog`
- `src/lib/finance/pricing/pricing-engine-v2.ts` — solo la redacción por perfil
- `src/app/api/finance/quotes/pricing/simulate/route.ts` — perfil + Zod
- `src/lib/nexa/nexa-tools.ts`
- `src/mcp/greenhouse/server.ts`
- `src/app/api/platform/app/**` y/o `ecosystem/**` (read lane `quotation.v1`)
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capability `commercial.quote.simulate` + grant)
- `src/lib/reliability/queries/` (signal de read-path si aplica)
- schemas Zod de simulate `[verificar convención de ubicación]`

## Current Repo State

### Already exists

- `buildPricingEngineOutputV2` + `expandServiceIntoQuoteLines`: pricean una receta de servicio end-to-end sin input humano.
- `stripCostStack` + `canViewCostStack`: recorte binario de cost stack para no privilegiados.
- Nexa tooling (`NEXA_TOOLS`, `getNexaToolDeclarations`, `executeNexaTool`) y MCP server read-only como patrón.
- Service catalog stores (`service_modules` + `service_pricing` + recipes).

### Gap

- No hay resolver nombre→`serviceSku` (texto libre no mapea a SKU).
- No hay perfiles `internal`/`client`/`public`; el recorte es binario y no contempla consumer anónimo ni recorte de catálogo.
- No hay contrato Zod de simulate.
- Cero registro de quotes/pricing en Nexa tools / MCP server / API Platform lanes.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: read-only sobre `greenhouse_commercial.service_*` + pricing engine; sin mutación de datos
- Consumidores afectados: UI cotizador (search), Nexa Agent, MCP downstream, API Platform read lane, futuros (cliente self-service, simulador público)
- Runtime target: `app`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: `buildPricingEngineOutputV2`, `expandServiceIntoQuoteLines`, las rutas `pricing/simulate`/`from-service`/`lookup` (backward-compatible).
- Contrato nuevo:
  - `simulateQuotePricing({ input | fromServiceSku, overrides? }, outputProfile: 'internal' | 'client' | 'public')` → output del engine redactado por perfil.
  - `searchServiceCatalog(query) → { serviceSku, name, ... }[]` (match nombre/alias, ordenado por relevancia; lista para elicitación ante ambigüedad).
  - Zod schemas introspectables del input de simulate.
- Backward compatibility: callers actuales siguen funcionando; el perfil default para callers internos autenticados preserva el comportamiento (full output si `canViewCostStack`).

### Data model and invariants

- Entidades (read-only): `service_modules`, `service_pricing`, `service_role_recipe`, `service_tool_recipe`; pricing engine.
- Invariantes:
  - **Aislamiento del cost stack:** perfiles `client`/`public` NUNCA incluyen cost stack, role rate cards, tool costs ni `marginPct`/`classification`. Redacción server-side; un caller `client`/`public` no puede pedir `internal`.
  - **Perfil por auth context, NUNCA default a `internal`.**
  - **El perfil `public` computa sobre catálogo publicado curado**, no `pricing/lookup` interno; no filtra IDs internos.
  - El precio siempre del engine (no se inventa ni se acepta override de precio del caller en simulate).
- Tenant/space boundary: contexto tenant/internal existente; el perfil `public` es anónimo y su superficie de datos es solo el catálogo publicado.
- Idempotency/concurrency: N/A (read-only puro).
- Audit/outbox/history: N/A para reads; observabilidad vía logs/Sentry (`captureWithDomain`).

### Migration, backfill and rollout

- Migration posture: preferir sin migración; DDL aditivo solo si el catálogo publicado (perfil `public`) requiere una proyección/vista nueva — decidir en Plan Mode.
- Default state: read tools de Nexa/MCP/API Platform nacen gateados por capability. El perfil `public` se define como compute; su **endpoint anónimo NO se expone** en esta task.
- Backfill plan: ninguno.
- Rollback path: revert PR + redeploy; desregistrar tools (gated). Todo aditivo/reversible.
- External coordination: coordinar naming de capability con `TASK-1202`.

### Security and access

- Auth/access gate: capability `commercial.quote.simulate`; el perfil de output se deriva del auth context (interno con `canViewCostStack` → `internal`; cliente → `client`).
- Sensitive data posture: cost stack / role rates / margin = joyas de la corona; redacción server-side, defense-in-depth. Errores sanitizados (`redactErrorForResponse`).
- Error contract: `canonicalErrorResponse` con codes estables (perfil no autorizado, servicio no encontrado, input inválido).
- Abuse/rate-limit posture: el perfil `public` (cuando se exponga en su follow-up) exige rate-limit + circuit breaker; en esta task solo la capa de compute.

### Runtime evidence

- Local checks: tests de redacción por perfil (ningún campo sensible cruza en `client`/`public`), test del resolver (nombre→SKU + ambigüedad), test del default-no-internal.
- DB/runtime checks: SQL read-only confirmando que `searchServiceCatalog` resuelve servicios reales.
- Integration checks: staging smoke — preguntar el precio de un servicio por nombre vía Nexa tool + MCP tool y verificar output correcto + sin cost stack en perfil cliente.
- Reliability signals/logs: opcional signal de read-path; `captureWithDomain('commercial'|'finance', ...)`.
- Production verification sequence: deploy gated → readiness read-only → query de precio por nombre vía Nexa/MCP → verificar perfil correcto por caller.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes de datos, boundary tenant/access y posture de redacción explícitos.
- [ ] Migración/rollback posture explícita y proporcional al riesgo.
- [ ] Evidencia runtime o DB listada para cada cambio más allá de docs/tooling.
- [ ] Dominios sensibles con errores canónicos y sin fuga de cost stack.

## Capability Definition of Done — Full API Parity gate

- [ ] La simulación de precio se ejecuta programáticamente con `outputProfile`, y `client`/`public` jamás reciben cost stack/role rates/margin.
- [ ] Un servicio es priceable **por nombre** vía `searchServiceCatalog` (no solo por SKU).
- [ ] El cotizador está registrado como Nexa read tool + MCP read tool + API Platform read lane.
- [ ] El perfil de output se deriva del auth context, nunca default a `internal`.
- [ ] El escenario norte ("¿cuánto cuesta un servicio de X?") es respondible por Nexa y por MCP.

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

### Slice 1 — Perfiles de output de simulación

- Definir `simulateQuotePricing({...}, outputProfile)` con redacción server-side (`internal`/`client`/`public`).
- Reemplazar el recorte binario por el perfil derivado del auth context; `client`/`public` sin cost stack / role rates / margin.
- Tests de redacción: ningún campo sensible cruza en `client`/`public`; default nunca `internal`.

### Slice 2 — Resolver `searchServiceCatalog` (nombre→SKU)

- Reader compartido sobre `service_modules` (+ nombre/alias) → `{ serviceSku, name }[]` por relevancia.
- Ante ambigüedad, retorna candidatos para elicitación.
- Tests: match exacto, fuzzy, múltiples candidatos, sin match.

### Slice 3 — Contrato Zod + capability

- Schemas Zod introspectables del input de simulate; la ruta `pricing/simulate` parsea con el schema.
- Acuñar `commercial.quote.simulate` (convención de `TASK-1202`) + grant en `runtime.ts` (mismo slice) + coverage test.

### Slice 4 — Exposición read a consumers

- Nexa read tool (`simulate` + `search`) en `NEXA_TOOLS`, eligiendo perfil por auth.
- MCP read tool en `server.ts`, perfil por auth (NUNCA `internal` para caller cara-a-cliente).
- API Platform read lane `quotation.v1` (simulate/list/get). Cumple la parte read del follow-up de `TASK-1206`.

### Slice 5 — Reliability + smoke + docs

- Signal de read-path (si aplica) + observabilidad.
- Smoke: precio por nombre vía Nexa + MCP, verificando perfil correcto.
- Docs: actualizar `docs/documentation/finance/cotizador.md` + manual con el split A/B y los perfiles.

## Out of Scope

- **El command de autoría/emisión + Nexa governed action + UI shell delegation** → `TASK-1212` (write vertical).
- **El endpoint anónimo público** → follow-up (STOP quadrant, ADR propio). Esta task solo define la capa de compute del perfil `public`.
- **El write lane externo de MCP/agentes** → diferido (consultar-first; ADR aceptado).
- **La UI de cliente self-service** → follow-up.
- **El close command Q2C** → `TASK-1206`.
- Cambios en el pricing engine (fórmulas/FX/margin) — se reusa tal cual.

## Detailed Spec

El worked example canónico (§8 de la spec) es el AC funcional: *"¿cuánto cuesta un servicio de diseño digital?"* → `searchServiceCatalog("diseño digital")` → `simulateQuotePricing({ fromServiceSku }, outputProfile)` → respuesta honesta de paquete estándar + invitación a refinar. El perfil interno ve cost stack + margen; el perfil cliente/MCP-cara-a-cliente ve solo bill rate + total + IVA.

El resolver es el eslabón que hace utilizable el simulate tool para agentes: sin él, no se puede simular lo que no se puede encontrar. La redacción por perfil es la defensa que permite exponer la capability a consumers no internos sin filtrar el modelo de margen.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- Slice 4 (exposición) NO antes de que perfiles (1) + resolver (2) + Zod/capability (3) existan: exponer sin redacción por perfil filtra el cost stack.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga de cost stack / role rates / margin a cliente o público | commercial pricing | high | perfiles server-side + tests de redacción + caller no puede pedir `internal` | test de redacción rojo / review |
| Default a `internal` por error en un tool de agente | safety | medium | perfil derivado del auth context, default explícito a `client`; test | review del tool |
| Resolver matchea el servicio equivocado | UX/commercial | medium | relevancia + elicitación ante ambigüedad; tests | feedback de cotización errónea |
| Re-acuñar capability que `TASK-1202` define | entitlements | medium | coordinar naming antes de Slice 3 | capability-grant-coverage test |

### Feature flags / cutover

- Read tools nacen gateados por capability; aditivo y reversible.
- El perfil `public` no tiene cutover (no se expone endpoint).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert perfiles; volver a `stripCostStack` binario | <15 min | si |
| Slice 2 | Revert resolver | <10 min | si |
| Slice 3 | Revert Zod + reverse grant | <10 min | si |
| Slice 4 | Desregistrar tools/lane (gated) | <10 min | si |
| Slice 5 | Revert signals/docs | <10 min | si |

### Production verification sequence

1. Deploy read tools + capability gated.
2. Readiness read-only: `searchServiceCatalog` resuelve servicios reales.
3. Query de precio por nombre vía Nexa tool + MCP tool.
4. Verificar perfil correcto por caller (interno ve margen; cliente no).
5. Tests de redacción verdes en runtime.

### Out-of-band coordination required

- Owner de `TASK-1202` (capability catalog) para el naming de `commercial.quote.simulate`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `simulateQuotePricing` soporta `outputProfile` `internal`/`client`/`public`; `client`/`public` jamás reciben cost stack / role rates / margin (test de redacción verde).
- [ ] El perfil se deriva del auth context, nunca default a `internal` (test).
- [ ] El perfil `public` computa sobre catálogo publicado curado, no el catálogo interno.
- [ ] `searchServiceCatalog(query)` mapea nombre/alias → `serviceSku` y retorna candidatos para elicitación ante ambigüedad (test).
- [ ] Hay contrato Zod introspectable del input de simulate; la ruta parsea con el schema.
- [ ] `commercial.quote.simulate` acuñada + grant + coverage test, sin duplicar el catálogo de `TASK-1202`.
- [ ] El cotizador está registrado como Nexa read tool + MCP read tool + API Platform read lane.
- [ ] Evidencia runtime: preguntar el precio de un servicio por nombre vía Nexa y vía MCP retorna respuesta correcta y sin fuga de margen.

## Verification

- `pnpm test` (focal de redacción + resolver, luego full suite al cierre)
- `pnpm lint`
- `pnpm typecheck`
- `pnpm task:lint --task TASK-1211`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --runtime --data --docs`
- Staging smoke vía Nexa tool + MCP tool (precio por nombre, perfil por caller)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-1212`, `TASK-1202`, `TASK-1206` y los follow-ups
- [ ] documentacion funcional + manual del cotizador actualizados con el split A/B y perfiles

## Follow-ups

- `TASK-1212` (write vertical): command de autoría/emisión + Nexa governed action.
- Simulador público (endpoint anónimo): ADR + task propia (rate-limit, circuit breaker, catálogo publicado).
- Cliente self-service (UI): consume el perfil `client`; execution profile `ui-ux`.

## Open Questions

- ¿El resolver determinista (alias/fuzzy) basta, o requiere grounding semántico (índice Knowledge) para nombres muy libres? Resolver en Plan Mode con un set de nombres reales.
- ¿La capability `commercial.quote.simulate` se acuña aquí siguiendo la convención de `TASK-1202`, o `TASK-1202` la incluye? Coordinar antes de Slice 3.
