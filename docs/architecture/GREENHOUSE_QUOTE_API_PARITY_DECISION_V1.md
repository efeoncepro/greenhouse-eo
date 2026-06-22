# GREENHOUSE_QUOTE_API_PARITY_DECISION_V1

> ADR dedicado (decisión cross-domain: commercial · finance · nexa/AI · MCP · API Platform). Append-only por `ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1`.

- **Status:** `Accepted`
- **Date:** 2026-06-21 (aceptada por el operador — MCP consultar-first)
- **Owner:** Commercial + Finance (cotizador) con AI/Nexa + API Platform como consumers
- **Scope:** cotizador / quote-to-cash front-end; `src/lib/finance/pricing/**`, `src/lib/commercial/service-catalog-*`, `src/lib/nexa/**`, `src/mcp/greenhouse/server.ts`, `src/app/api/platform/**`, capabilities de quote, perfiles de output de pricing
- **Reversibility:** `two-way-but-slow` (los contratos de tool/lane y los perfiles de output, una vez consumidos por agentes externos, tienden a `one-way`)
- **Confidence:** `high` (MCP-write resuelto 2026-06-21: consultar-first — Nexa opera vía governed action; externos/MCP solo simulan)
- **Validated as of:** 2026-06-21 (auditoría de código arch-architect: engine V2, `from-service`/recipe, Nexa/MCP registries, ausencia de resolver nombre→SKU)
- **Spec canónica (detalle):** `GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1.md`

## Context

El cotizador está construido de cara a un único consumer (member interno cotizando a un cliente), pero el norte tiene tres focos (member interno, cliente self-service, simulador público) y el mandato transversal de Full API Parity exige que sea operable por Nexa y MCP por construcción.

La auditoría 2026-06-21 encontró: read/compute path bien gobernado (engine server-authoritative, command de persistencia, reader canónico) y — clave — el **cálculo desde un servicio nombrado ya existe** (`service_role_recipe` + `from-service` priceable end-to-end). Pero el write path se coreografía client-side en `QuoteBuilderShell.handleSubmit` (no atómico, no reusable), no hay contrato introspectable, la capability `commercial.quote_to_cash.execute` está huérfana, no hay registro en ninguno de los 4 puntos de consumer programático, falta el resolver nombre→SKU, y el cost stack/role rates/margin (joyas de la corona) solo tienen un recorte binario insuficiente para consumers anónimos/cliente.

Fuerzas en tensión: exponer la capability a más consumers (incluido público anónimo) **vs** no filtrar el modelo de margen; un único primitive por capability (Full API Parity) **vs** la tentación de integraciones per-consumer; permitir que agentes operen cotizaciones **vs** que el LLM nunca mute estado directo.

## Decision

El cotizador se expone a **todos** los consumers a través de **dos capabilities gobernadas, no una**:

1. **A — Simular precio** (read/compute, stateless): primitive `simulateQuotePricing(input, outputProfile)`, parametrizado por `outputProfile ∈ {internal, client, public}` con **redacción server-side** (cost stack / role rates / margin NUNCA cruzan a `client`/`public`; el perfil se deriva del auth context, nunca default a `internal`).
2. **B — Autorar + emitir** (write/lifecycle): primitive `submitQuoteFromBuilder(...)` atómico + idempotente, que reemplaza la coreografía de `handleSubmit`.

Reglas estructurales:

- **Un primitive por capability, muchos consumers** (SSOT-reader): UI, Nexa, MCP, cliente, público y API Platform son clientes del MISMO command/reader. Prohibida toda integración "Nexa-específica".
- **Discovery por nombre** vía un reader compartido `searchServiceCatalog(query)` (nombre/alias → `serviceSku`); habilita pricing en frío para Nexa/MCP y la elicitación ante ambigüedad.
- **Writes gobernados (wave 1 aceptada = consultar-first):** Nexa **interno** muta solo vía `propose → confirm → execute`. **Externos / MCP = simulate-only**: el MCP downstream surface permanece read-only y el write lane externo (operar cotizaciones desde un agente externo) se **difiere** hasta que emerja un caso real (auth de agente + idempotencia + rate-limit + aprobación).
- **El simulador público** computa sobre una **proyección de catálogo publicado curado**, no el catálogo interno; su endpoint anónimo es una task aparte (STOP quadrant, ADR propio).
- **Ownership de capabilities:** TASK-1202 es steward del catálogo de quote capabilities; A y B consumen su convención, no re-acuñan.

## Alternatives Considered

- **Una sola capability "quote" (read+write juntos).** Rechazada: conflaciona compute con mutación, impide sandboxear el público y arriesga filtrar el cost stack a un consumer anónimo.
- **Integración Nexa-específica del cotizador.** Rechazada: viola Full API Parity #16 (un primitive, muchos consumers); produciría N implementaciones divergentes.
- **Exponer el catálogo interno directo a cliente/público.** Rechazada: fuga de cost stack + datos competitivos; one-way door de gran blast radius.
- **Permitir que MCP escriba directo.** Rechazada: el MCP server es read-only por diseño; los writes externos requieren el write lane gobernado (auth de agente, idempotencia, aprobación), no un tool downstream.
- **Omitir el resolver y exigir `serviceSku` al caller.** Rechazada: deja el simulate tool a medias para agentes (no se puede simular lo que no se puede encontrar); las preguntas de precio en frío quedan sin respuesta.
- **Recorte binario `stripCostStack` como única defensa.** Rechazada: no contempla consumer anónimo ni el recorte del catálogo; insuficiente para `public`.

## Consequences

**Beneficios:** una capability operable por todos los consumers desde un primitive; el público se desacopla del write path (compute sandboxeado, no el motor expuesto); el cost stack protegido por construcción; Nexa total operability como consecuencia, no integración aparte; el cálculo desde servicio nombrado ya existe → el costo marginal de "cotizar por nombre" es solo el resolver.

**Costos / riesgos:** los contratos de tool/lane y los perfiles de output, una vez consumidos por agentes externos, se vuelven costosos de cambiar (`two-way-but-slow → one-way`); el perfil `public` depende de la curaduría del catálogo publicado (entrada mal curada = fuga); MCP-write queda como decisión de producto abierta.

**Trade-off nombrado (Safety vs Scalability):** el perfil `public` recorta utilidad percibida del simulador a cambio de no filtrar margen — no negociable; se resuelve con catálogo publicado curado, no recortando el real.

## Runtime Contract

Fuente de verdad que queda vigente:

- **Capability A:** `simulateQuotePricing` + `outputProfile` (perfil derivado de auth context). Capability `commercial.quote.simulate` (convención fijada por TASK-1202).
- **Capability B:** `submitQuoteFromBuilder` (atómico + idempotente); la UI y toda ruta delegan en él. Capability de write de la familia que acuña TASK-1202.
- **Discovery:** `searchServiceCatalog(query)` como reader compartido.
- **Write gobernado:** `NEXA_ACTION_REGISTRY` (autoría/emisión) + endpoint de confirmación; API Platform `quote_to_cash.v1` lane para externos; `src/mcp/greenhouse/server.ts` read-only.
- **Implementación:** TASK-1211 (frente + exposición), TASK-1202 (capability catalog/enforcement), TASK-1206 (close command). Spec de detalle: `GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1.md`.

## Revisit When

- **MCP-write resuelto 2026-06-21: consultar-first** (Nexa opera; externos/MCP simulan). Reabrir SOLO si emerge un caso real de operar cotizaciones desde un agente externo → entonces abrir task del write lane externo (auth de agente + idempotencia + rate-limit + aprobación).
- Se diseña el **simulador público** (su propio ADR de endpoint anónimo + rate-limit + catálogo publicado).
- El pricing engine adquiere un "starting price" escalar por servicio (cambiaría el resolver/simulate).
- Cliente self-service pasa de "solo simular" a "pedir cotización real" (activa B con aprobación).
- Esta decisión se acepta tras checkpoint humano; hasta entonces no materializar contratos irreversibles de tool/lane externos.
