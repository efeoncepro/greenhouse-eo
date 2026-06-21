# GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1

> **Tipo:** Spec de arquitectura (contrato agent-facing)
> **Versión:** 1.0
> **Creado:** 2026-06-21 por Claude (arch-architect)
> **Estado:** `Accepted` (ADR) — **read vertical (TASK-1211) implementado 2026-06-21**: redactor `redactPricingOutputForProfile` (3 audiencias) + resolver `searchServiceCatalog` + capability `commercial.quote.simulate` + contrato Zod + envelope `simulateQuotePricing` + consumers Nexa (`quote_price`) / MCP (`search_services`,`quote_price`) / API Platform lanes `quotation` (app+ecosystem). Cierra el leak de `from-service`. Write vertical = TASK-1212. Converge TASK-1202/1206.
> **Decisión canónica:** `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md`
> **Subordinada a:** `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (base + North Star) · `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` · `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` · `GREENHOUSE_NEXA_ARCHITECTURE_V1.md` · `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

## 1. Propósito

Definir el contrato de arquitectura que hace del **cotizador** una capability gobernada operable por **todos** los consumers canónicos — UI interna, cliente self-service, simulador público, Nexa Agent y MCP/agentes downstream — desde un único primitive por capability, sin construir nada Nexa-específico (Full API Parity es la base; Nexa total operability es su consecuencia).

El cotizador hoy está de cara solo a un member de Efeonce cotizando a un cliente. El norte tiene tres focos: (1) member interno, (2) cliente self-service simulando, (3) simulador público en el sitio. Esta spec es la fundación que los habilita a los tres + Nexa/MCP por construcción.

## 2. Estado actual (auditoría arch-architect 2026-06-21)

- **Read/compute path bien gobernado:** pricing server-authoritative (`buildPricingEngineOutputV2`), command de persistencia (`persistQuotationPricing`/`recalculateQuotationPricing`), reader canónico (`quotation-canonical-store`), funciones puras testeadas. La parte difícil ya existe.
- **El cálculo desde un servicio nombrado YA existe:** `service_modules` + `service_pricing` + `service_role_recipe` + `service_tool_recipe` cargan una receta priceable por defecto; `/api/finance/quotes/from-service` (`expandServiceIntoQuoteLines`) la corre por el engine V2 end-to-end con cero input humano. El mínimo para pricear es el `serviceSku`.
- **Write path = gap (anti-patrón remote-click-handler):** la autoría/emisión se coreografía client-side en `QuoteBuilderShell.handleSubmit` (no atómica, no idempotente, no reusable).
- **Sin contrato introspectable:** cero Zod; `as` + type-guards.
- **Capability huérfana:** `commercial.quote_to_cash.execute` existe pero no la enforza ninguna ruta ni la consume ningún registry; el gate real es `hasRouteGroup` coarse.
- **Cero discovery programático:** ni Nexa tool, ni Nexa action registry (solo `mark_notifications_read`), ni MCP tool (read-only sin quotes), ni API Platform lane.
- **Falta el resolver nombre→SKU:** no hay forma de mapear *"servicio de diseño digital"* (texto libre) a un `serviceSku`. Sin esto, ni Nexa ni MCP pricean en frío.
- **Riesgo de primer orden:** cost stack / role rate cards / margin son las joyas de la corona; `stripCostStack` es un recorte binario insuficiente para consumers anónimos/cliente.

## 3. El modelo de dos capabilities

El cotizador NO es una capability — son **dos**, hoy conflacionadas. Separarlas es la decisión estructural que ordena todo:

| | **A. Simular precio** | **B. Autorar + emitir** |
|---|---|---|
| Naturaleza | read / compute, stateless | write / lifecycle, stateful |
| Qué hace | corre el engine sin persistir | persiste cotización + líneas + versión, emite |
| Quién la necesita | member, **cliente self-service, simulador público**, Nexa, MCP | member, eventualmente cliente ("pedir cotización real"), Nexa |
| Primitive canónico | `simulateQuotePricing(input, outputProfile)` | `submitQuoteFromBuilder({ mode, header, lines, issueAfterSave, idempotencyKey, ... })` |
| Capability | `commercial.quote.simulate` (read/compute) | familia de write que acuña TASK-1202 (steward del catálogo) |
| Exposición a agentes | tool directo (read) | governed action `propose → confirm → execute` (Nexa) / API Platform write lane (externo) |

**Por qué importa:** el cliente self-service y el simulador público **solo necesitan A**. Separarlas desacopla el consumer más riesgoso (público anónimo) del write path: no se expone el motor de cotizaciones al internet, se expone un compute sandboxeado con output recortado.

## 4. Perfiles de output de simulación

La capability A se parametriza por `outputProfile`. La redacción se computa **server-side**; un consumer de perfil `client`/`public` no puede pedir `internal`.

| Campo del output | `internal` | `client` | `public` |
|---|---|---|---|
| Bill rate / total / subtotal | ✅ | ✅ | ✅ |
| IVA / neto | ✅ | ✅ | ✅ |
| Cost stack (costo por rol/tool) | ✅ | ❌ | ❌ |
| Role rate cards internos | ✅ | ❌ | ❌ |
| `marginPct` / `classification` | ✅ | ❌ | ❌ |
| Catálogo fuente | interno completo | interno (autenticado) | **catálogo publicado curado** |
| Identidad del caller | tenant interno + `canViewCostStack` | tenant cliente | anónimo |

**Regla dura:** el perfil lo elige el primitive por el **auth context del caller**, NUNCA por default. Un default a `internal` en un tool de agente filtra el margen. El perfil `public` computa sobre una proyección de catálogo publicado (no `pricing/lookup` interno) y no filtra IDs internos.

## 5. Primitives canónicos y matriz de consumers

Un primitive por capability; todos los consumers son **clientes del mismo primitive** (SSOT-reader pattern), nunca implementaciones paralelas.

| Consumer | Simular (A) — read | Autorar/emitir (B) — write | Mecanismo | Estado |
|---|---|---|---|---|
| UI interna (cotizador) | `simulateQuotePricing` perfil `internal` | `submitQuoteFromBuilder` | delegación thin desde el shell | TASK-1211 |
| Nexa Agent | Nexa read tool → `simulateQuotePricing` | Nexa governed action → `submitQuoteFromBuilder` vía `propose→confirm→execute` | `NEXA_TOOLS` + `NEXA_ACTION_REGISTRY` | TASK-1211 Slice 4 |
| MCP / agente downstream | MCP read tool → `simulateQuotePricing` (perfil por auth) | **NO** (MCP es read-only por diseño) | `src/mcp/greenhouse/server.ts` | TASK-1211 (read) / **gap** (write) |
| Cliente self-service | `simulateQuotePricing` perfil `client` | (decisión de producto: solo simular vs pedir cotización real) | API Platform `app` + UI | **follow-up** |
| Simulador público | `simulateQuotePricing` perfil `public` sobre catálogo publicado | — | endpoint anónimo + rate-limit + circuit breaker | **follow-up (STOP quadrant, ADR propio)** |
| API Platform `app`/`ecosystem` | lane `quotation.v1` | write lane `quote_to_cash.v1` (externo, auth + idempotencia) | versionado | TASK-1211 Slice 4 (absorbe follow-up de TASK-1206) |

## 6. Discovery: el resolver nombre → serviceSku

El cálculo desde un `serviceSku` ya existe; lo que falta es mapear lenguaje natural a ese SKU. Es el eslabón que hace utilizable el simulate tool para Nexa/MCP.

- **Primitive canónico:** `searchServiceCatalog(query)` — reader único sobre `service_modules` (+ aliases/nombres), consumido por Nexa tool, MCP tool y la búsqueda de la UI. Un primitive, muchos consumers.
- **Resolución:** match determinista/fuzzy sobre nombre + sinónimos; ante ambigüedad o múltiples candidatos, retorna la lista y el agente **elicita** ("¿te refieres a Diseño Digital Básico o Campaña Full?").
- **Sin esto, la capability A está a medias:** no se puede simular lo que no se puede encontrar.

## 7. Loop de escritura gobernada

Para B (autorar/emitir), el LLM **nunca** muta directo:

```
Nexa: propose_action(author_quote, {serviceSku, dims})
  → resolveNexaActionProposal → preview read-only (precio + qué se creará) + confirmEndpoint
Humano confirma → POST /api/nexa/actions/author_quote/confirm
  → submitQuoteFromBuilder(...)  ← única mutación, behind capability + audit + outbox
```

Para agentes externos vía API Platform write lane: mismo command server-side, con auth de agente + idempotencyKey + rate-limit + (si aplica) gate de aprobación. **El MCP downstream surface permanece read-only**; "operar" una cotización desde un agente externo va por el write lane, no por los MCP tools.

## 8. Escenario norte (worked example)

> *"¿Cuánto me costaría un servicio de diseño digital?"* — preguntado por Claude vía MCP, o a Nexa.

Traza end-to-end y qué pieza la sirve:

1. **NL → SKU:** `searchServiceCatalog("diseño digital")` → `serviceSku` (o lista para elicitar). → **§6, falta hoy.**
2. **Simular:** `simulateQuotePricing({ fromService: serviceSku }, outputProfile)` → corre la receta por el engine. → **engine existe; tool lo expone (§5, TASK-1211).**
3. **Perfil:** interno ve cost stack + margen; cliente/MCP-cara-a-cliente ve solo bill rate + total + IVA. → **§4.**
4. **Respuesta honesta:** estimado de paquete estándar ("un diseño digital estándar parte en ~$X con N horas de diseñador tier Y") + invitación a refinar alcance. → **behavior de Nexa, §6 elicitación.**
5. **(Opcional) operar:** "creámela/emitímela" → governed action B (Nexa) o write lane (externo). → **§7.**

**Veredicto del escenario:** con TASK-1211 tal cual, **falta el resolver (#1)** para responder en frío. Con el resolver agregado, Nexa **y** MCP pueden *responder el precio*. Para que un agente externo *cree/emita* la cotización vía MCP, falta además el **write lane externo** (decisión de producto).

## 9. Mapa de tasks

| Pieza del embudo Q2C | Owner | Estado |
|---|---|---|
| Frente: simular + autorar + emitir + exponer a consumers | **TASK-1211** | to-do |
| Discovery resolver `searchServiceCatalog` (nombre→SKU) + AC perfil-por-caller | **TASK-1211** (slice a plegar) o sibling | propuesto en esta spec |
| Enforcement de capabilities en write routes quote/reconciliation (SSOT catálogo) | **TASK-1202** | to-do |
| Cierre Q2C (convert-to-cash/invoice) | **TASK-1206** | to-do |
| Simulador público (endpoint anónimo) | follow-up | STOP quadrant, ADR propio |
| Cliente self-service (UI) | follow-up | depende de decisión de producto |
| MCP write lane externo (operar, no solo consultar) | open | decisión de producto (§11) |

## 10. 4-Pillar Score

### Safety
- **Qué puede salir mal:** fuga de cost stack / role rates / margin a cliente o público.
- **Gates:** perfiles de output server-side por auth context; capabilities finas A/B; governed write loop (LLM nunca muta); MCP read-only.
- **Blast radius:** GRANDE si se filtra el modelo de margen (competitivo). Acotado por perfil + redacción server-side + defense-in-depth.
- **Verificado por:** tests de redacción por perfil (ningún campo sensible cruza en client/public), review del action registry.
- **Riesgo residual:** el perfil `public` depende de la curaduría del catálogo publicado; una entrada mal curada filtra. Mitigación en el follow-up del simulador público.

### Robustness
- **Idempotencia:** `idempotencyKey` en B; replay devuelve el resultado previo.
- **Atomicidad:** `submitQuoteFromBuilder` en una transacción (header+líneas+versión+emisión) o rollback completo — elimina el zombie del flujo client-side.
- **Constraint coverage:** el precio siempre del engine (no honra override de catálogo); el command re-simula antes de persistir.
- **Verificado por:** tests de atomicidad, replay y no-override.

### Resilience
- **Signal:** `commercial.quote.authored_without_command` (steady=0) detecta autoría fuera del command; health del governed action.
- **Degradación honesta:** ante catálogo/engine parcial, el simulate degrada con razón, no devuelve $0 silencioso.
- **Recovery:** el command es idempotente y re-ejecutable.

### Scalability
- **Compute stateless** escala bien. El punto de presión es el simulador **público** (scraping/abuso anónimo) → rate-limit + circuit breaker + cache, resuelto en su follow-up antes de exponer el endpoint.

## 11. Hard rules (NUNCA / SIEMPRE)

- **NUNCA** exponer cost stack / role rate cards / `marginPct`/`classification` a un perfil `client` o `public`. La redacción es server-side; el perfil se deriva del auth context, NUNCA default a `internal`.
- **NUNCA** dejar lógica de autoría/emisión en un componente UI. La UI delega en `submitQuoteFromBuilder`.
- **NUNCA** implementar una integración "Nexa-específica" del cotizador. Un primitive, muchos consumers.
- **NUNCA** mutar una cotización desde el LLM directo. Writes vía `propose → confirm → execute` (Nexa) o write lane gobernado (externo). El MCP downstream surface es read-only.
- **NUNCA** re-acuñar capabilities de quote fuera del catálogo de TASK-1202 (SSOT). El perfil de simulate sigue su convención de nombres.
- **NUNCA** el perfil `public` computa sobre el catálogo interno o `pricing/lookup` interno; usa la proyección publicada curada.
- **SIEMPRE** que un consumer nuevo necesite cotizar, conectarlo al primitive existente (simulate/author), no crear lógica paralela.
- **SIEMPRE** que un servicio sea priceable, exponerlo vía `searchServiceCatalog` para que sea descubrible por nombre.

## 12. Open Questions

- **MCP-write — RESUELTO 2026-06-21 (consultar-first):** externos/MCP solo **consultan** (simulate); Nexa opera internamente vía governed action; el write lane externo se difiere hasta un caso real. El MCP read tool basta para la wave 1.
- **Cliente self-service:** ¿solo simula (A) o pide cotización real (A + B con aprobación interna)? Cambia el alcance del follow-up de UI.
- **Ubicación del command B:** `src/lib/commercial/**` (owner del aggregate) vs `src/lib/finance/pricing/**` (donde vive el pricing). Resolver con `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`.
- **Resolver:** ¿determinista (alias/fuzzy) suficiente, o requiere grounding semántico (índice Knowledge) para nombres muy libres?

## Delta 2026-06-21 — write vertical aterrizado (TASK-1212, capability B)

El **write vertical** (capability B. autorar/emitir) se implementó end-to-end:

- **Command canónico `submitQuoteFromBuilder`** (`src/lib/commercial/submit-quote-from-builder.ts`): SSOT del write path. Atomicidad **por etapa + idempotencia + rollback honesto** (decisión arch-architect + commercial-expert): `persistQuotationPricing` ya es atómico internamente (header+líneas+versión en una tx → zombie "líneas viejas" imposible); create borra el header huérfano si el persist falla; **issue es etapa separada post-commit** (no se puede meter approval/FX/outbox en la misma tx; si falla, queda draft recuperable — modelo CPQ correcto). Idempotencia opt-in vía el ledger canónico `api_platform_command_executions` (sin migración nueva).
- **Capability:** se **consume `commercial.quotation`** (`create`/`approve`, ya existente y granteada) — NO se acuñó nada nuevo (esquiva la coordinación con TASK-1202; la huérfana `commercial.quote_to_cash.execute` queda para el cierre TASK-1206).
- **Contrato Zod** (`submit-quote-from-builder-schema.ts`) + endpoint `POST /api/finance/quotes/author`. El **shell delega** (`QuoteBuilderShell.handleSubmit` → una sola llamada, drafts crudos; el server re-simula y construye — la UI ya no es source of truth del pricing; diff 100% lógica, estética del rediseño TASK-1213 intacta). El **Slice 2 NO quedó diferido**: Codex cerró TASK-1213, así que la delegación del shell se hizo en esta task.
- **Nexa governed action `author_quote`** (`src/lib/nexa/actions/author-quote.ts`): primera acción **parametrizada** del runtime (`NexaActionDefinition<TInput>` + `inputSchema`); loop `propose → confirm → execute`; el confirm re-valida el input y ejecuta el MISMO command. Gateada por `NEXA_QUOTE_AUTHOR_ACTION_ENABLED` (default OFF). El LLM nunca muta directo.
- **Reliability:** `commercial.quote.authored_without_command` (steady=0; detecta cotizaciones `manual` en estado terminal con cero líneas — la zombie que el command previene).
- **Verificación live:** create + idempotencia (mismo key → mismo `quotationId`/`operationId`, `replayed=true`, sin duplicar) ejercidos contra la DB dev vía el endpoint.

El **write lane externo de MCP/agentes** sigue diferido (consultar-first). Spec: `docs/tasks/complete/TASK-1212-*.md`.

## Detalle técnico

- Engine + commands + readers: `src/lib/finance/pricing/`, `src/lib/finance/quotation-canonical-store.ts`, `src/lib/commercial/service-catalog-*.ts`.
- Consumers programáticos: `src/lib/nexa/nexa-tools.ts`, `src/lib/nexa/actions/registry.ts`, `src/mcp/greenhouse/server.ts`, `src/app/api/platform/**`.
- Tasks: `docs/tasks/to-do/TASK-1211-*.md`, `TASK-1202-*.md`, `TASK-1206-*.md`.
