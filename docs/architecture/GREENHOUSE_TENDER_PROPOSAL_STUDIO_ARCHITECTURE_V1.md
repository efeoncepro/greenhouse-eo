# GREENHOUSE — Tender Proposal Studio (arquitectura V1)

> **Tipo:** Architecture spec / ADR — **diseño del aggregate; parcialmente implementado** (ver §0)
> **Versión:** 0.4 · **Status:** **Partially implemented** — el spec del aggregate sigue `Proposed` (no hay DB, ni API, ni UI), pero **F4 (deck composer) y la state machine YA son código shipped**. **§5-ter: Accepted** (topología del runtime del composer).
> **Creado:** 2026-07-11 por Claude (skill `arch-architect`) con Julio Reyes
> **v0.4 (2026-07-12):** corrige la mentira de estado (el doc decía "diseño, NO implementación" y "cada iteración es doc-only" con ~2.000 LOC en `src/lib/commercial/tenders/**`). Agrega §0 (estado real), declara que la state machine es **TS puro sin DB**, registra que **el roadmap se ejecutó invertido** (F4 antes que F0-F2) y **retira el Apéndice B** en la parte que contradecía al composer (raster de Figma como fondo).
> **v0.3 (2026-07-11):** la topología del runtime del composer se promueve a **ADR (§5-ter, Accepted)**: orquestador + fan-out por capítulo + resto determinista, con 4-pilar y hard rules. **Corrección de dependencia:** el composer **NO** depende del `agent-runtime` (Q8 v0.2 era falsa en ambas mitades — hay prior art en Nexa, y los 3 nodos de juicio son *structured output*, no tool-chains).
> **v0.2 (2026-07-11):** los 6 refinamientos validados contra SKY (§9-ter) quedan **incorporados al cuerpo** (schema §1, gates §2, capabilities §3, deck §4, quote §6); Open Questions aterrizadas contra runtime real (Q1 schema, Q3 worker, Q8 agent-runtime).
> **Método funcional (SSOT):** skill `greenhouse-public-private-tenders` → `bid-construction-playbook.md` (10 fases + Fase 4-bis)
> **Prior art:** `docs/research/RESEARCH-007-commercial-public-tenders-module.md` (discovery público), `src/lib/commercial/quote-to-cash/**` (cotizador), `src/lib/release/state-machine.ts` (patrón state machine)

---

## §0 — Estado real (qué existe HOY vs qué es diseño) — 2026-07-12

**Leer esto antes que nada.** Este doc nació como diseño puro y durante dos días se construyó código
contra él **sin actualizarlo**. Lo que sigue es la foto verificada contra el repo.

| Pieza | Estado | Dónde |
|---|---|---|
| **Deck composer (F4)** — selector · validación · slot-fill · resolvers · geometría · render | ✅ **Shipped** (~1.800 LOC, 4 suites) | `src/lib/commercial/tenders/deck/**` |
| **Entregable PDF** — N páginas mergeadas (`pdf-lib`) + gate de peso | ✅ **Shipped** | `deck/render.ts` · `deck/compose.ts` |
| **Catálogo de 25 plantillas** con `data-slot` + `*.slots.json` + `registry.json` | ✅ **25/25 built** | `docs/architecture/tender-deck-composer-prototypes/` |
| **State machine** (12 estados, 3 gates humanos, 16 tests) | ⚠️ **TS puro, SIN DB** | `src/lib/commercial/tenders/tender-state-machine.ts` |
| **CLI** `pnpm deck:compose <plan.json> [--out dir]` | ✅ **Shipped** (único consumer hoy) | `scripts/commercial/compose-tender-deck.ts` |
| Tabla `greenhouse_commercial.tenders` + CHECK + trigger append-only + `tender_state_transitions` | ❌ **No existe** (no hay migración) | — |
| API routes · UI · capabilities/entitlements · outbox events | ❌ **No existe** | — |
| Los 3 nodos de juicio (orquestador · chapter-authors · verifier) | ❌ **No existe** | — |
| Renderer productivo (Cloud Run Job + cola + artifact store + señales) | 📋 **Diseñado, bloqueado** | **TASK-1391** (`to-do`, P1, EPIC-027) |

**Tres consecuencias que hay que tener presentes:**

1. **El roadmap se ejecutó INVERTIDO.** §10 planificaba F0 (esqueleto+DB) → F1 (análisis) → F2 (producción)
   → F4 (decks). Se construyó **F4 primero**, porque el deck era lo que desbloqueaba una licitación real
   (SKY). No es un error — es la secuencia que el negocio pidió — pero significa que **el motor de
   composición existe sin el aggregate que debería contenerlo**.
2. **La state machine es lógica pura sin persistencia.** El §2 de este doc describe `CHECK` constraint +
   trigger append-only + outbox; **nada de eso existe todavía**. Hoy son 174 líneas de TS que validan
   transiciones en memoria. **NUNCA** asumas que hay una tabla `tenders` porque este doc la dibuja.
3. **Full API Parity aún NO aplica** — no hay UI ni contrato programático, así que no hay parity que
   romper. **Pero en el momento en que se construya la primera ruta o capability, aplica completa**: el
   composer ya es el primitive canónico en `src/lib/**`, y la UI/Nexa/MCP deben consumirlo, no
   reimplementarlo.

**Deuda de gobernanza declarada:** el **deck composer F1 se construyó sin TASK-###** (fuera del lifecycle,
sin Task Closing Quality Gate), mientras este doc decía que la implementación la autorizaba "la task de
F1". Se registra para que no se repita: **todo hito siguiente nace con TASK + lifecycle + gates.**

**El siguiente hito YA tiene task y está bloqueado a propósito — `TASK-1391`** (Tender Deck Renderer:
worker, cola y artifact pipeline). Lleva el composer de **CLI local** a **capability gobernada**: Cloud Run
Job dedicado con Chromium, outbox/cola con backpressure, artefactos versionados (PDF + PNGs + provenance)
en el asset store, command/reader idempotentes y señales operativas. **Blocked by:** autorización de la
próxima frontera de deployable de **EPIC-027** + la foundation mínima del aggregate `Tender`.

⚠️ Regla dura que TASK-1391 protege: **el render pesado NUNCA corre en Vercel ni en el `ops-worker`**
(bloquearía el publisher del outbox). Va en un `tender-worker` dedicado — y un deployable nuevo requiere
la decisión de frontera de EPIC-027, no se crea por conveniencia.

---

## Decisión

Construir un **Tender Proposal Studio**: un dominio nuevo **dentro de Greenhouse** (`src/lib/commercial/tenders/**`) que modela una licitación como un **aggregate `Tender`** con una **máquina de estados append-only** y produce sus deliverables (técnica, económica, decks) a través de **capabilities gobernadas** (Full API Parity). La orquestación combina **tres planos** — pipeline determinista (state machine) + fan-out de agentes (producción) + gates humanos (`propose → confirm → execute`) — y el LLM **nunca** cruza un gate solo.

**No es un producto separado ni un agente monolítico.** Es un dominio comercial que **reusa** Cliente-360, el cotizador `quote-to-cash`, el asset store, el AI Visibility Grader y el patrón de state machine del release control plane. El método manual ya documentado (`bid-construction-playbook`) **es la especificación funcional**; este doc es su forma técnica.

### Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Agente monolítico "que hace la licitación" | Sin state machine no hay reanudación, auditoría ni gates humanos; el LLM decidiría el flujo (indefendible para un doc contractual). |
| Producto/repo separado | Rompería reuso de identidad, cotizador, assets y Nexa; duplicaría el 360. Viola "extiende, no paralelice". |
| Extender `deal`/`opportunity` con columnas de bid | Mezcla dimensiones ortogonales (relación comercial vs. proceso de licitación). El Tender **referencia** al deal, no lo sobrecarga. |
| Meter la lógica en la UI (los layouts Figma) | Viola Full API Parity: la UI es un consumer, no el dueño de la capability. |
| LLM orquesta el pipeline global ("¿qué hago ahora?") | El flujo es determinista y hard-to-reverse en los gates; lo maneja código. El LLM produce *dentro* de una fase, no decide la fase. |

---

## 1. Objeto canónico — `Tender`

`Tender` es un **aggregate de proceso comercial** (como `deal`, `quote`, `contract` ya lo son), **no** una identidad 360 nueva. Vive en el dominio commercial.

- **No paraleliza el 360:** el comprador es el `Cliente` canónico (`client_id`); el oferente es Efeonce. El Tender referencia, no recrea.
- **Fuente dual:** nace por **intake manual** (privada — SKY/Wherex) o promovido desde **discovery público** (RESEARCH-007 / Mercado Público). Un campo `origin ∈ {manual, public_discovery}` + FK opcional a la opportunity pública.
- **Enlace comercial (bow-tie real):** el CRM canónico de Efeonce es **HubSpot** (portal `48713323`). En el gate **GO** (`fit_review → producing`) el Tender crea/vincula un **Deal HubSpot** asociado a la **Company** del cliente (el `client_id`-360 mapea a la Company); si se adjudica, el Deal avanza a Quote/Contract → delivery, cerrando el bow-tie. Write path = **cliente HubSpot directo** (in-app), NO el bridge Cloud Run legacy. (Refinamiento §9-ter #5.)

```
greenhouse_commercial.tenders          -- aterriza donde ya viven deals/quotes/contracts (Q1)
  tender_id            text PK        -- ej. TND-000123 (allocator, como release/ICO)
  client_id            text FK  → greenhouse.clients        -- comprador (360)
  hubspot_deal_id      text (nullable)  -- Deal HubSpot creado en el gate GO (bow-tie)
  hubspot_company_id   text (nullable)  -- Company HubSpot del comprador (mapea a client_id)
  public_opportunity_id text (nullable) -- si origin=public_discovery (RESEARCH-007)
  origin               text CHECK (manual | public_discovery)
  title                text
  platform             text     -- Wherex, Mercado Público, privada directa…
  state                text CHECK (ver §2)
  submit_deadline      timestamptz
  deadline_confidence  text CHECK (confirmed | ambiguous)  -- refinamiento §9-ter #3
  deadline_assumption  text (nullable)  -- supuesto tomado si las fechas del RFP chocan
  currency             text     -- CLP proveedor chileno / USD extranjero
  created_by, created_at, updated_at
```

**`deadline_confidence` (refinamiento §9-ter #3):** el RFP de SKY tenía fechas que chocaban (apertura 10/07 vs. entrega 15/07). El análisis **captura la ambigüedad y el supuesto**, no un timestamp ciego. `ambiguous` + `deadline_assumption` obligan a que el gate de fit muestre el supuesto al humano.

**Workspace anclado (assets gobernados, no carpeta suelta):** cada Tender ancla un espacio de assets vía el store canónico (`src/lib/storage/greenhouse-assets.ts`) con dos zonas y estado por deliverable:

```
tender/<tender_id>/
  input/    RFP recibido: bases.docx, planilla.xlsx, anexos, docs-para-llenar
  output/   diagnóstico, técnica, económica, matriz-admisibilidad, decks, otros-docs
```

`tender_assets` (kind ∈ {rfp_source, fillable_template, diagnostic, technical_offer, economic_offer, admissibility_matrix, deck, other_doc}, status ∈ {draft, in_review, final}, **`audience ∈ {internal, client_facing}`**, version). Los "docs para llenar" del RFP son `fillable_template` → sub-tarea de agente + gate humano.

**`audience` (refinamiento §9-ter #1, seguridad):** SKY dejó explícito que diagnóstico · squad · matriz de admisibilidad · benchmark son **munición interna** (NO van al comprador) y técnica · económica · deck son **client-facing**. Sin este flag, un agente podría filtrar interno al comité. **Gate de packaging: sólo `client_facing` sale** (§2). El default por `kind` es seguro (interno salvo los 3 kinds client-facing), pero el flag es explícito y auditable por asset.

### Requisito-set — el RFP como objeto estructurado

El análisis (§4) no produce prosa: produce un **requisito-set canónico** (una fila por requisito del RFP) que las fases posteriores consumen. Es lo que hace que admisibilidad, económica y submit se **deriven del RFP**, no de la memoria del agente.

```
greenhouse_commercial.tender_requirements
  requirement_id     text PK
  tender_id          text FK → tenders
  requirement_type   text CHECK (excluyente | puntua | economic_minimum | format | deadline | penalty | sla)
  label              text        -- literal del RFP (evidencia, no paráfrasis)
  weight             numeric (nullable)   -- si requirement_type=puntua
  requires_human_attestation boolean DEFAULT false  -- refinamiento §9-ter #4
  attested_by        text (nullable)      -- quién juró el excluyente
  attested_at        timestamptz (nullable)
  source_asset_id    text FK → tender_assets   -- de qué doc del RFP salió (trazabilidad)
```

- **`requires_human_attestation` (refinamiento §9-ter #4):** los excluyentes tipo "sin demandas contra el comprador" NO se hardcodean por licitación — son **ítems del requisito-set que un humano jura** (`attest_requirement`, §3). El gate de `ready_to_submit` exige que **todo** `requires_human_attestation=true` esté atestado. El gate se deriva del RFP, no se recuerda a mano.
- **`economic_minimum` (refinamiento §9-ter #2):** los mínimos económicos que el RFP exige (precio · forma de pago · reajuste · término · **desembolsos**) se capturan como filas `economic_minimum`. El `TenderQuote` (§6) **cross-checkea** que los cumple antes de `ready_to_submit` — no "adjunta un número".

---

## 2. State machine (patrón `state-machine + CHECK + audit` — copia del release control plane)

Append-only, transiciones validadas en DB (`CHECK` + trigger), cada transición → fila en `tender_state_transitions` + evento outbox. **NUNCA** `UPDATE`/`DELETE` de transiciones.

```
        intake ──▶ analyzing ──▶ analyzed ──▶ fit_review ──┬──▶ declined            (no-bid, terminal)
        (folder    (fan-out      (requisito-  (GATE          │
         + RFP)     lectores)     set +        HUMANO)        └──▶ producing ──▶ base_ready ──▶ packaging ──▶ ready_to_submit
                                  admisib.)                        (grader·       (técnica+      (decks+        (GATE HUMANO:
                                                                    squad·         económica      económica-     admisib. ✅
                                                                    pricing·       base)          adapter+       + PDFs)
                                                                    redacción)                    otros docs)         │
                                                                                                                      ▼
                                                                              submitted ──┬──▶ awarded       (terminal)
                                                                              (humano sube) └──▶ not_awarded  (terminal)
```

- **Gates humanos (dobles bordes):** `fit_review → producing|declined`, `ready_to_submit → submitted`. Además gates *intra-fase* en `producing` (precio final) y `packaging` (declaraciones sensibles).
- **Gate GO (`fit_review → producing`) — efecto de negocio:** al decidir participar, nace la **oportunidad comercial en HubSpot** (Deal ↔ Company, refinamiento §9-ter #5) con el pricing, close date, pipeline/stage, plataforma y enlace al Tender. Es el momento canónico de creación del deal (no antes: si es no-bid, no se crea ruido en el CRM).
- **Gate `packaging` — filtro de audience:** sólo salen assets `audience=client_facing` (refinamiento §9-ter #1). El interno (diagnóstico/squad/matriz/benchmark) nunca cruza a los deliverables que se suben.
- **Gate `ready_to_submit` — 3 condiciones duras:** (a) admisibilidad ✅ (excluyentes cumplidos); (b) **todo** `tender_requirements.requires_human_attestation=true` está atestado (refinamiento §9-ter #4); (c) el `TenderQuote` **pasa los mínimos económicos** del requisito-set (refinamiento §9-ter #2). Si falta cualquiera, el estado no avanza.
- **Reanudable:** matar/reanudar en cualquier estado (el pipeline de producción es idempotente por deliverable).
- **Reliability signals:** `commercial.tender.stuck_in_state` (edad > umbral por estado), `commercial.tender.deadline_at_risk` (submit_deadline − now < buffer y state ≠ ready/submitted).

---

## 3. Capabilities por fase (Full API Parity)

Un motor, muchos consumers (UI-Figma · Nexa · MCP/API). Cada capability = primitive canónico en `src/lib/commercial/tenders/**`; grant en `runtime.ts` mismo PR (regla capability⇒grant).

| Fase | Capability | Tipo | Consumers |
|---|---|---|---|
| Crear + anclar folder | `commercial.tender.create` | write (command) | UI · Nexa · MCP |
| Ingesta RFP | `commercial.tender.ingest_rfp` | write | UI (upload) · MCP |
| Análisis multi-doc | `commercial.tender.analyze` | write (async job) | UI · Nexa (propose) |
| Matriz admisibilidad | `commercial.tender.admissibility.read` | read | UI · Nexa |
| Fit score | `commercial.tender.assess_fit` | write (async) → gate | UI · Nexa (propose) |
| Decisión fit | `commercial.tender.decide_fit` | write **gated** | **humano** (UI/Nexa confirm) |
| Enlace CRM (Deal↔Company) | `commercial.tender.link_crm_deal` | write | UI · MCP (efecto del gate GO) |
| Producción | `commercial.tender.produce.{diagnostic,squad,pricing,copy}` | write (async) | UI · Nexa (propose) |
| Económica (quote) | `commercial.tender.attach_quote` | write | UI · MCP (cotizador) |
| Atestación de excluyente | `commercial.tender.attest_requirement` | write **gated** | **humano** (jura el excluyente) |
| Packaging / decks | `commercial.tender.package` | write (async) | UI · Nexa (propose) |
| Submit | `commercial.tender.mark_submitted` | write **gated** | **humano** |

Boundary de `link_crm_deal`: el contrato de escritura HubSpot lo gobierna la skill `hubspot-greenhouse-bridge` (cliente directo in-app, portal `48713323`). `attest_requirement` es un gate humano (Plano 3): el LLM propone qué excluyentes requieren atestación; el humano jura.

**Lectura vs escritura (CQRS-lite):** readers (`tender-readers.ts`) proyectan shape para UI/Nexa; los writes pasan por commands con audit+outbox. No se mezclan.

---

## 4. Los tres planos de orquestación

**Plano 1 — Pipeline determinista (columna vertebral).** La state machine en código decide qué transición es legal. No hay LLM "decidiendo el siguiente paso". Reanudable, auditable, testeable.

**Plano 2 — Fan-out de agentes (dentro de fases pesadas).** El trabajo de IA corre como **job async en worker** (patrón ops-worker; el harness de agentes se invoca ahí, no en el request de Vercel):
- **`analyze`** → *multi-modal sweep*: 1 agente lector por doc del RFP (docx/xlsx/anexo) en paralelo → merge → **requisito-set canónico** (excluyentes vs. puntúa, criterios+pesos, plazos, formato, SLA, penalidades) + matriz de admisibilidad.
- **QA multi-lente (Fase 9.5)** → 5 lentes en paralelo (commercial·talent·finance·copywriting·licitaciones) → síntesis.
- **`package` decks** → **composición de módulos AXIS pre-brandeados, NO generación freehand** (refinamiento §9-ter #6). El agente NO diseña el look: mapea cada pieza de contenido → el módulo AXIS adecuado (portada · sección · KPI · comparativa · cierre) y **distribuye la info encima**. Branding garantizado **por construcción** (sale de las plantillas). Dos primitives (F4): (a) **catálogo/registry** `módulo → node-id → tipo de contenido + slots` (Apéndice A); (b) **composer** plantilla HTML fiel → llenar slots → Chromium `print-to-pdf` (Apéndice B). El fan-out creativo (ai-image · motion) sólo alimenta los **slots** (fotos, mockups), nunca el chrome de marca.

**Plano 3 — Gates humanos (`propose → confirm → execute`).** El LLM produce un *proposal*; el humano confirma en el endpoint de confirmación; recién ahí muta. Aplica a: **fit**, **precio final**, **declaraciones sensibles**, **submit**. Es la doctrina Nexa (el LLM nunca escribe directo) + Fase 10 del método (human-in-control).

---

## 5. Boundaries — qué REUSA vs qué CREA

**Reusa (no reinventa):**
- **Cliente-360** (`greenhouse.clients`) como comprador.
- **Cotizador `quote-to-cash`** (`src/lib/commercial/quote-to-cash/**`, `convert-quote-to-cash.ts`) — la económica engancha aquí (ver §6).
- **Asset store** (`greenhouse-assets.ts`) — el workspace input/output.
- **AI Visibility Grader + worker** (`src/lib/growth/ai-visibility/**`) — el diagnóstico (vía el camino del worker, auto-publish; nunca score/publish manual).
- **State machine + audit + outbox** — patrón del release control plane (`src/lib/release/state-machine.ts`).
- **Entitlements/capabilities**, **reliability signals**, **reactive projections** — patrones canónicos.
- **RESEARCH-007** (discovery público) — **convergen**: una licitación descubierta ahí se **promueve** a `Tender` (origin=public_discovery). RESEARCH-007 descubre/clasifica; el Studio construye.
- **Skills de dominio** como los "trabajadores" del Plano 2 (public-private-tenders, commercial-expert, talent, finance, copywriting, design-studio…).

**Crea (genuinamente nuevo):**
- El aggregate `Tender` + state machine + `tender_assets`.
- El **requisito-set canónico** (extracción estructurada del RFP) + **matriz de admisibilidad** como objeto.
- El **orquestador de producción** (job async que corre el fan-out del Plano 2).
- El **deck generation pipeline** branded.
- El **quote adapter** de 3 vías (§6).

---

## 5-bis. Stack de agentes (modelo + orquestación)

Decisión: **Claude (Anthropic) como modelo primario, vía el cliente canónico `src/lib/ai/`; orquestación propia, NO un framework de agentes de vendor.**

- **Modelo/provider.** `@anthropic-ai/sdk` (ya instalado) es el default para razonamiento + tool-use; la **abstracción multi-provider canónica** (`src/lib/ai/` — `generateStructured{Anthropic,OpenAI,Gemini}`) permite rutear a Gemini/OpenAI por tarea (como el AI Visibility Grader). **NUNCA** un SDK LLM paralelo en el dominio (regla dura Greenhouse) — se extiende el canónico.
- **Orquestación determinista (Plano 1).** State machine de Greenhouse + outbox (código propio). No hay framework decidiendo el flujo.
- **Agentic loop (Plano 2).** Un **tool-runner delgado sobre `@anthropic-ai/sdk`** (Claude tool-use nativo). Las **tools del agente SON las capabilities de Greenhouse** (Full API Parity: un agente usa las mismas capabilities gobernadas que UI/Nexa/MCP; no herramientas especiales). Eval baseline obligatorio por agente (regla arch-architect: no prompt/agente sin eval).
- **Rechazados:** OpenAI Agents SDK / Swarm (acopla a vendor, viola la abstracción de provider), LangGraph/LangChain (exotic + estado/memoria propios que competirían con la state machine canónica = dos fuentes de verdad del flujo).
- **Claude Agent SDK:** candidato para el *harness de fan-out headless en el worker de producción*, no para el core (el core es tool-runner propio).

**Gap detectado (v0.2) — CORREGIDO en v0.3 (2026-07-11).** La v0.2 declaró "no existe tool-runner en `src/lib/**`, hay que crearlo, precondición dura de F1/F2". **Ambas mitades eran falsas.** Ver §5-ter: existe prior art funcional en Nexa, y el composer no lo necesita para F1/F2.

## 5-ter. ADR — Topología de runtime del composer (Accepted, 2026-07-11)

> **Status:** `Accepted` (topología). El spec padre sigue `Proposed`: esta decisión fija **la forma**, no autoriza implementación — eso lo hace la task de F1.
> **Contexto:** promoción a ADR de la dirección v0.1 documentada en `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` → §"Arquitectura del runtime del composer".
> **Blast radius:** decisión de topología de agentes + frontera determinista/agéntico. Difícil de revertir una vez que hay decks emitidos (la reproducibilidad es una promesa de auditoría). Se decide ahora, se implementa en F1.

### Decisión (topología)

**Pipeline determinista con exactamente dos nodos de juicio, fan-out acotado por CAPÍTULO, y cero LLM en el camino de render.**

```text
intake (requisitos del bid + método 10-fases)
  │
  ├─ (agente) ORQUESTADOR ──► outline = [{ capítulo, content-types, brief, targetSlideIds }]
  │
  ├─ fan-out DETERMINISTA sobre capítulos (Promise.all, N≈6-8):
  │     (agente) chapter-author ──► slots JSON por slide
  │     [el SELECTOR elige la plantilla: lookup en registry.json — SIN LLM]
  │
  ├─ (agente) VERIFIER ──► integridad de datos · registro institucional · coherencia
  │
  ├─ DETERMINISTA: slots + plantilla → HTML → Chromium → PDF · ensamblado · paginación
  │
  └─ [HUMANO confirma / exporta]   ← acción gobernada; nada sale sin firma
```

| Determinista — **sin LLM** | Agéntico — **juicio** |
|---|---|
| Selector (content-type → plantilla) · slot-fill · render HTML→PDF · ensamblado · orden de páginas · deep-links de agenda | Outline del deck (capítulos, orden, arco) · autoría por capítulo (copy institucional, qué métrica destacar) · verificación |

**Por qué por capítulo y no por slide:** las slides de un capítulo comparten datos y argumento. Un agente por slide (15-25) cuesta más, pierde el hilo narrativo y multiplica la superficie de alucinación. Por capítulo son ~6-8 agentes que se coordinan mejor y cada uno ve su bloque completo.

**Por qué el selector NO es agéntico:** el `registry.json` ya define un match declarativo 1:1 (25 content-types → 25 plantillas) + reglas de desambiguación. Meter un LLM ahí sólo agrega no-determinismo a un lookup que ya es una función pura. Si ningún content-type calza, **es señal de que falta una plantilla en el catálogo** (abrir gap), no de improvisar el layout.

### Alternativas rechazadas (topología)

| Alternativa | Por qué no |
|---|---|
| Un agente monolítico que "arma el deck" | Sin frontera determinista no hay reproducibilidad ni auditoría; el mismo contenido daría PDFs distintos. Indefendible para un documento contractual. |
| Fan-out por slide | 15-25 agentes: más caro, pierde el arco del capítulo, más superficie de alucinación. Sin beneficio de calidad. |
| Selector agéntico (LLM elige la plantilla) | Convierte un lookup determinista en una fuente de no-determinismo. El registry ya resuelve el match 1:1. |
| LLM en el render / ensamblado | Rompe "mismos slots → mismo PDF", que es la promesa de auditoría del artefacto. |
| Subagentes recursivos (profundidad > 1) | Costo y latencia no acotados, sin ganancia demostrable en un pipeline de forma conocida. Profundidad = 1, dura. |
| Framework de agentes (LangGraph, OpenAI Agents SDK) | Estado/memoria propios que competirían con la state machine canónica = dos fuentes de verdad del flujo. Rechazado ya en §5-bis. |

### Corrección de dependencia — el composer NO depende del `agent-runtime`

La v0.2 declaraba el `src/lib/ai/agent-runtime` como **"precondición dura de F1/F2"**. La investigación de prior art (2026-07-11) lo desmiente en dos frentes:

1. **Existe prior art funcional.** Nexa ya corre un tool loop en producción: `src/lib/nexa/providers/{anthropic,gemini}.ts` (abstracción de provider + failover), `nexa-tools.ts` (`getNexaToolDeclarations` + `executeNexaTool`), `nexa-turn-telemetry.ts`. Es **single-hop** (llamada → `tool_use` → `tool_result` → respuesta final), no un loop multi-turn — pero la afirmación "no existe tool-runner en el repo" era falsa. (`src/lib/ai/greenhouse-agent.ts` **no** es prior art pese al nombre: es un single-shot de Gemini sin tools.)

2. **El composer no necesita un tool-runner.** Sus tres nodos de juicio producen **structured output**, no tool-chains:
   - el ORQUESTADOR devuelve un outline JSON;
   - el chapter-author devuelve slots JSON desde su brief + **contexto read-only** (el propio diseño ya prohíbe scratchpad mutable y fija el contexto del molde/registry/caso como read-only, así que **no hay nada que ir a buscar dinámicamente**);
   - el VERIFIER devuelve un veredicto estructurado sobre material que ya recibió.

   Eso lo cubre `generateStructured{Anthropic,Gemini,OpenAI}` — **que ya existe** en `src/lib/ai/`. El fan-out es `Promise.all` en TS.

**Consecuencia:** el `agent-runtime` baja de **precondición bloqueante** a **evolución de plataforma**. El composer F1 se construye sobre los helpers de structured output existentes. El día que un subagente necesite **pedir datos que no se le pueden inyectar** (p. ej. un verifier que consulte la fuente de una cifra contra el ledger), ahí entra el runtime — y entonces la forma correcta **no es escribirlo de cero, sino extraer y generalizar el loop de Nexa** (strangler: Nexa pasa a consumirlo con `maxTurns=1`), nunca abrir un segundo loop paralelo. Eso es un refactor con blast radius sobre Nexa productivo → **merece su propia task**, no un side-quest del composer.

### 4-Pilar

#### Safety

- **Qué puede salir mal:** que salga una oferta con una cifra inventada, en registro no-institucional, o que el sistema "envíe" algo sin firma humana.
- **Gates:** `propose → confirm → execute` — los agentes **proponen** un borrador; el LLM nunca escribe estado ni envía. El humano confirma/exporta (capability gobernada). Mapea 1:1 a la regla del método (jamás se envía una oferta sin sign-off).
- **Blast radius si falla:** un deck de un tender (un cliente). No cruza tenants. Pero el daño reputacional/legal de una cifra fabricada en una oferta contractual es **desproporcionado al blast radius técnico** — por eso el VERIFIER es un nodo obligatorio, no opcional.
- **Verificado por:** VERIFIER (integridad de datos + registro + fuentes) + gate humano + regla "datos reales o **ilustrativos marcados**, nunca fabricados".
- **Riesgo residual:** el VERIFIER es un LLM; puede dejar pasar una fabricación sutil. **Mitigación consciente:** el humano firma (es la última defensa, y es la que el método ya exige). No lo mitigamos con un segundo verifier — sería teatro de defensa-en-profundidad sobre el mismo modo de falla.

#### Robustness

- **Idempotencia:** el artefacto auditable son los **slots JSON**. Re-render de los mismos slots es una función pura → mismo PDF. Clave de idempotencia = hash(slots + versión de plantilla).
- **Atomicidad:** el deck se materializa como artefacto sólo al final; un capítulo que falla **no deja un deck a medias publicado** (el borrador queda en estado, no en el asset store).
- **Fallo parcial:** si un chapter-author falla, se reintenta **ese capítulo** (los demás ya están); el deck no se regenera entero.
- **Determinismo:** garantizado por construcción — el único no-determinismo vive en 3 nodos, aguas arriba de los slots. Aguas abajo de los slots, todo es puro.

#### Resilience

- **Retry:** bounded por capítulo (N=2, backoff). Un capítulo que agota retries degrada a **slot vacío marcado**, no a deck silenciosamente incompleto.
- **Observabilidad:** trace-id por subagente, costo por agente, latencia por nodo (el patrón de `nexa-turn-telemetry` es el precedente a copiar).
- **Recovery:** replay desde slots (no desde el prompt) — barato, determinista y auditable.
- **Degradación honesta:** un capítulo que falló se ve como **falta** en el borrador, nunca como una slide plausible autogenerada.

#### Scalability

- **Costo en tokens:** outline (1) + capítulos (~6-8) + verifier (1) ≈ **~10 llamadas por deck**, acotado y predecible. El render — que es lo voluminoso — cuesta **cero tokens**.
- **Latencia:** el fan-out por capítulo es paralelo → wall-clock ≈ el capítulo más lento, no la suma.
- **Contención:** el render Chromium es pesado (minutos) → vive en el **`tender-worker` dedicado como Cloud Run Job**, NUNCA en el `ops-worker` (un render de 5 min bloquearía el publisher del outbox, que corre cada 2 min). Una ejecución = un `DeckPlan` fijado; `tasks=1` y `parallelism=1` por deck. El renderer puede conservar concurrencia interna de láminas sólo dentro del envelope benchmarkeado de CPU/RAM.
- **A 10x:** escala horizontalmente por ejecuciones de deck; el cuello es Chromium (CPU/RAM), no el LLM. El job record/outbox regula admisión y dedupe; un límite de ejecuciones concurrentes se calibra por benchmark/costo, no por el default de Cloud Run.

### Hard rules (NUNCA / SIEMPRE)

- **NUNCA** un LLM en el selector, el slot-fill, el render o el ensamblado. Rompe la reproducibilidad, que es la promesa de auditoría del artefacto.
- **NUNCA** fan-out por slide (por defecto). La unidad de autoría es el **capítulo**.
- **NUNCA** subagentes recursivos: **profundidad = 1**, dura.
- **NUNCA** scratchpad mutable compartido entre subagentes. Contexto read-only (molde + registry + caso); los agentes devuelven **resultado**, no mutan estado común.
- **NUNCA** auto-submit. El LLM no cruza el gate: `propose → confirm → execute`.
- **NUNCA** fabricar datos de cliente: valores reales del bid o **ilustrativos marcados**.
- **NUNCA** abrir un segundo tool loop paralelo al de Nexa. Si hace falta un runtime, se **extrae y generaliza el existente** (ver arriba).
- **NUNCA** correr el render del deck en el `ops-worker`, una route Vercel ni un Cloud Run Service HTTP. `ops-worker` puede despachar/reconciliar el job liviano, pero Chromium corre exclusivamente dentro del Cloud Run Job `tender-worker`.
- **SIEMPRE** el artefacto auditable son los **slots JSON**, no el PDF. El PDF es una derivación.
- **SIEMPRE** eval baseline antes de tocar el prompt de cualquiera de los 3 agentes (regla `arch-architect`: no hay cambio de prompt sin eval).

### Open questions (deliberadamente no decididas)

- **Modelo por nodo:** ¿el chapter-author corre en el mismo modelo que el orquestador? (El orquestador razona sobre estructura; el author escribe copy institucional. Podrían querer modelos distintos.) Se decide con el eval baseline de F1, no antes.
- **Eval baseline:** qué golden set usa (¿decks SKY ya producidos a mano como referencia?). Pendiente de F1.
- **Imágenes:** el modo "runtime gen" (vs. assets pre-producidos por `assetId`) queda diseñado pero no autorizado; preferir siempre pre-producido. El `ContextualVisualSlot` ya define cómo una imagen se deriva semánticamente de una lámina, se aprueba y termina fijada como `assetId`, pero no habilita el command/runtime todavía (ver `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` → §capa de assets y `tender-deck-composer-prototypes/CONTEXTUAL_VISUAL_SLOT_CONTRACT_V1.md`).

## 6. Económica: fuente única (Greenhouse), múltiples formatos de salida

**Corrección de diseño (co-creación 2026-07-11): la fuente de los números es SIEMPRE Greenhouse.** El cotizador (`quote-to-cash`) es la **única fuente de verdad** del cálculo (loaded cost → pricing → line items → total → moneda). NO hay fuentes alternativas — esto le da al cotizador (`commercial.quote_to_cash.execute`, hoy huérfana) su consumer canónico.

Lo que varía es el **formato del artefacto de salida**, porque cada comprador lo pide distinto (unas empresas exigen Excel, otras un PDF aparte, otras la cotización formal). Por eso la económica **no puede estar cerrada a un solo artefacto**. Un `TenderQuote` canónico (SSOT) → **N renderers de salida**:

| Formato de salida | Cuándo | Reusa |
|---|---|---|
| **PDF maquetado** | el RFP pide la económica en PDF | patrón Report Artifact (modelo → print/PDF renderer) |
| **Excel brandeado** | el RFP exige planilla Excel (caso SKY §B5) | export + brand layer |
| **Cotización (PDF)** | se entrega la cotización formal de Greenhouse | cotizador + PDF renderer |
| **Embebida en el deck** | la económica va dentro del deck técnico | deck pipeline |

Es el patrón canónico **un modelo → N renderers** (espejo del **Report Artifact** del grader: web/print/PDF desde un solo model — ver `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`). El `brandeado` es una **capa de identidad compartida** (AXIS/Efeonce) que aplican deck, Excel y cotización — **una sola fuente de branding**, no reinventada por artefacto.

**Validación contra el requisito-set (refinamiento §9-ter #2):** `attach_quote` no "adjunta un número" — **cross-checkea que el `TenderQuote` cumple los mínimos económicos** capturados como filas `economic_minimum` en `tender_requirements` (precio · forma de pago · reajuste · término · desembolsos — el que faltó en SKY). Si un mínimo no se cubre, el quote queda `incomplete` y **bloquea `ready_to_submit`** (§2). El formato de salida se resuelve por lo que exige el RFP (`format` en el requisito-set), no se hardcodea.

**Hard rules:** NUNCA una fuente de números paralela a Greenhouse (SSOT único). NUNCA ramificar el *cálculo* por formato — el cálculo es uno, el *render* es N. NUNCA marcar `ready_to_submit` con un quote que no pasó los mínimos económicos del requisito-set.

---

## 7. Los 4 pilares

**Safety.** Gates humanos en fit/precio/declaraciones/submit (el LLM nunca cruza solo, propose→confirm→execute). Capabilities scoped por rol (least-privilege). Declaraciones sensibles (ej. "sin demandas contra el comprador") = gate explícito, no auto-marcable. Blast radius de un error de producción = un Tender aislado (workspace propio), nunca cross-tender. Submit lo hace un humano (regla dura).

**Robustness.** Requisito-set + admisibilidad validados contra el RFP real (no memoria); si un doc del RFP no se pudo parsear, el estado degrada con evidencia (nunca "analizado" con 0 requisitos — mismo principio que el grader). Idempotencia por deliverable (re-producir no duplica). State machine con CHECK en DB rechaza transiciones ilegales. El quote adapter normaliza las 3 vías a un shape validado.

**Resilience.** Job de producción async con retry/backoff (patrón worker); reanudable desde cualquier estado. Reliability signals `stuck_in_state` + `deadline_at_risk`. Transiciones append-only → auditoría y replay. Los snapshots (informe grader, deliverables `final`) son inmutables.

**Scalability.** El fan-out de lectura/QA/decks escala con el harness de agentes (paralelo, cap de concurrencia). Multi-tender concurrente sin contención (aggregates aislados). Reads por VIEW/reader cacheable. El worker absorbe la carga pesada fuera del request path de Vercel. Crece a N licitaciones simultáneas sin rediseño.

---

## 8. Hard rules (NUNCA / SIEMPRE)

- **NUNCA** el LLM cruza un gate (fit/precio/declaración/submit) sin confirmación humana (`propose → confirm → execute`).
- **NUNCA** crear identidad paralela: el comprador es el `Cliente` 360; el Tender referencia deal/quote/contract, no los recrea.
- **NUNCA** `UPDATE`/`DELETE` de `tender_state_transitions` ni de deliverables `final` (append-only + supersede).
- **NUNCA** marcar `analyzed`/`admissible` sin evidencia real del RFP parseado (degradar con evidencia si un doc falló).
- **NUNCA** puntuar/publicar el informe del grader "a mano" (camino del worker + auto-publish — invariante del dominio grader).
- **NUNCA** ramificar `packaging` por `source` del quote: las 3 vías normalizan al mismo `TenderQuote`.
- **NUNCA** entregar una oferta client-facing en tuteo (registro formal — regla de la Fase 7 del método).
- **SIEMPRE** capability nueva ⇒ grant a ≥1 rol real en el mismo PR (guard de coverage).
- **SIEMPRE** admisibilidad (excluyentes) se valida ANTES de producir (puerta #1 del método).
- **SIEMPRE** el humano sube y firma; el Studio prepara.

---

## 9. Plan por fases (esqueleto + vertical delgado primero)

> Regla arch-architect: no construir los 8 estados de golpe. **Esqueleto + un vertical delgado end-to-end** (una licitación real cruzando todos los estados con lo mínimo) antes de engordar cada fase.

| Fase | Entrega | Depende de |
|---|---|---|
| **F0 — Esqueleto** | Aggregate `Tender` + state machine + `tender_assets` + intake (crear + subir RFP + ver estado). **Sin IA.** | — |
| **F1 — Análisis + admisibilidad** | Fan-out de lectura → requisito-set + matriz de admisibilidad automática + fit score → gate humano. | F0 |
| **F2 — Producción** | Enganchar lo que YA funciona como capabilities: grader/worker, squad, pricing, redacción (registro formal) → técnica + económica base. | F1 |
| **F3 — Económica adapter** | Contrato `TenderQuote` de 3 vías + enganche del cotizador `quote-to-cash`. | F2 |
| **F4 — Packaging / decks** | Deck pipeline branded (design-studio + ai-image + motion + AXIS) + otros docs + `ready_to_submit`. | F2 |
| **F5 — Consumers** | UI (layouts Figma) + Nexa (opera por parity) + MCP. La operabilidad de Nexa se sigue por construcción. | F0-F4 |

**Vertical delgado sugerido:** reproducir el caso SKY end-to-end por la plataforma (crear Tender → subir bases → análisis → fit → producir → económica → deck → ready) con lo mínimo de cada fase, antes de profundizar.

---

## 9-bis. Modo de construcción — co-creación dirigida por casos, con canonización

Este dominio **no se diseña de escritorio**: se co-construye. Modo canónico acordado con el operador (2026-07-11):

1. **El operador dirige** — marca el siguiente movimiento (un caso real, una decisión, un "y si…").
2. **Se ejecuta sobre realidad** — el vehículo es una licitación de verdad (SKY primero, la próxima después), nunca un ejemplo inventado. La realidad expone lo que el diseño de escritorio no ve.
3. **Se extrae el aprendizaje** — qué funcionó, qué falló, qué patrón emergió.
4. **Se canoniza en el plano correcto** — método (`bid-construction-playbook`), este spec, docs (funcional/manual), memoria; con las skills que apliquen (arch, commercial, talent, finance, copywriting, licitaciones…).
5. **Cada aprendizaje canonizado = un requisito del producto** — engorda este spec; cuando haya masa crítica, se construye por fases (§9). **Documentar hoy = escribir la spec ejecutable del runtime.**

**Gates que no se degradan** (si se rompen, el modo deja de *construir* y se evapora): realidad sobre memoria · human-in-control en lo sensible · canonizar en las 3 capas + memoria al cerrar cada bloque (no dejar el aprendizaje sólo en el chat). Es primo del *Real-Artifact Iterative Verification Loop* (features visuales validadas con artefacto real, no mocks) y del *Solution Quality Operating Model* (causa raíz, no parches) — no es un método nuevo, es el estilo de la casa.

> ⚠️ **Esta línea decía** *"mientras el status sea `Proposed`, cada iteración es doc-only (reversible, sin deuda) hasta que un ADR autorice construir"*. **Quedó obsoleta el 2026-07-11/12**: el deck composer y la state machine se construyeron sin ese ADR. Ver **§0** para el estado real y la deuda de gobernanza. Lo que sigue vigente es la *intención*: el aggregate `Tender` (DB, API, UI, capabilities) **sí** sigue `Proposed` y **no** se construye sin task.

## 9-ter. Refinamientos validados contra SKY (primer caso del loop)

El esqueleto de 8 estados capturó el caso SKY entero sin forzar nada. La ejecución reveló **5 refinamientos** (paso 3 del loop §9-bis) que pasan a ser requisitos del diseño:

1. **`tender_assets.audience ∈ {internal, client_facing}` (seguridad).** SKY dejó explícito que diagnóstico/squad/matriz/benchmark son **munición interna** (NO van al comprador) y técnica/económica/deck son **client-facing**. Sin este flag, un agente podría filtrar interno al comité. Gate de packaging: sólo `client_facing` sale.
2. **`TenderQuote` valida contra el requisito-set.** La económica de SKY exigía mínimos (precio·pago·reajuste·término·**desembolsos** — que faltaba). El quote adapter no "adjunta un número": cross-checkea que cumple los mínimos económicos del RFP antes de `ready_to_submit`.
3. **`deadline_confidence` + nota de supuesto.** El RFP de SKY tenía fechas que chocaban (apertura 10/07 vs entrega 15/07). El análisis captura la ambigüedad y el supuesto, no un timestamp ciego.
4. **Excluyentes con `requires_human_attestation`.** El "sin demandas contra el comprador" no se hardcodea por licitación: es un **ítem del requisito-set** que un humano jura. El gate se **deriva del RFP**, no se recuerda a mano.
5. **Enlace CRM = HubSpot Deal ↔ HubSpot Company (bow-tie real).** El Tender crea/vincula un **Deal en HubSpot** (el CRM canónico de Efeonce) asociado a la **Company** del cliente, con la info de la licitación (monto del pricing, close date, pipeline/stage, plataforma Wherex, enlace al Tender). El campo pasa a `hubspot_deal_id` (+ `hubspot_company_id`); el `client_id`-360 mapea a la Company. **Momento de creación:** el gate **GO (`fit_review → producing`)** — cuando decidimos participar, nace la oportunidad comercial en el CRM; si se adjudica, el Deal avanza a Quote/Contract (cierra el bow-tie). **Write path = cliente HubSpot directo** (in-app), NO el bridge Cloud Run legacy. Capability nueva `commercial.tender.link_crm_deal`. Boundary/skill: `hubspot-greenhouse-bridge` para el contrato de escritura; portal `48713323`.

6. **El deck brandeado = composición de módulos AXIS, NO generación freehand.** Los outputs visuales (deck técnico + Excel brandeado) se arman **componiendo módulos pre-brandeados** del sistema AXIS PPT (Figma `Sistema Axis - PPT`, fileKey `GXYeJaRjotmFuczfnd8hLi`) — plantillas 16:9 con la marca ya resuelta (ej. `Modulo_MediaPagina_Right`: zona de contenido a la izquierda + firma visual AXIS —gradiente— a la derecha). El agente **NO diseña el look**: mapea cada pieza de contenido de la propuesta → el módulo adecuado (portada · sección · tabla · cierre…) y **distribuye la info encima**. Branding garantizado **por construcción** (sale de las plantillas, no de la imaginación del agente) — esto mata el mayor riesgo de un deck automático. Implica dos primitives: (a) un **catálogo de módulos** (`módulo → node-id → tipo de contenido que acepta`), (b) un **composer** módulo + contenido → slide (patrón `un modelo → N renderers` aplicado a slides). Es la **capa de branding compartida** del §6 (deck y Excel beben de la misma identidad AXIS).

**✅ Incorporados al cuerpo (v0.2, 2026-07-11):** #1 audience → §1 `tender_assets` + gate §2; #2 mínimos económicos → §1 `tender_requirements.economic_minimum` + validación §6 + gate §2; #3 `deadline_confidence` → §1 schema; #4 attestation → §1 `tender_requirements.requires_human_attestation` + capability §3 + gate §2; #5 CRM Deal↔Company → §1 schema + gate GO §2 + capability §3; #6 deck módulos AXIS → §4 + Apéndices A/B. Esta sección queda como **registro del aprendizaje** (§9-bis paso 3); la fuente vigente de cada refinamiento es su sección de cuerpo.

## 10. Open Questions

### ✅ Resueltas (v0.2, aterrizadas contra runtime real)

- **Q1 · Schema de aterrizaje → `greenhouse_commercial`.** Verificado: `deals`, `contract_quotes`, `contracts`, `engagement_*`, `pricing_*` ya viven en `greenhouse_commercial` (no `greenhouse_crm`). El Tender aterriza junto a ellos (§1). No se crea schema nuevo.
- **Q2 · Convergencia con RESEARCH-007 → dos módulos, un handoff.** RESEARCH-007 descubre/clasifica el discovery público; el Studio construye. Punto de promoción: opportunity pública → `Tender(origin=public_discovery)` con FK. No se fusionan (dimensiones ortogonales: descubrir vs. construir).
- **Q3 · Runtime del orquestador → `tender-worker` dedicado como Cloud Run Job (diferido a F1).** El fan-out de lectura + agentic loops + render Chromium es pesado y largo (minutos); NO debe compartir el `ops-worker` (cron de outbox cada 2 min — un render de deck de 5 min bloquearía el publisher). El recurso es un **Cloud Run Job**, no un service HTTP: recibe un `jobId` que apunta al snapshot inmutable del `DeckPlan`, corre una tarea/una ejecución por deck y termina. El job record + outbox son el source of truth y el mecanismo de recovery; un dispatcher liviano puede invocar `jobs.run`, pero no renderiza. Cloud Tasks es opt-in posterior para backpressure del dispatcher, no transport directo del PDF. F0 no tiene IA → sin worker; el job nace en F1.
- **Q8 · Agent-runtime canónico → NO es precondición del composer (corregido v0.3, 2026-07-11).** La respuesta v0.2 ("no existe tool-runner; es precondición dura de F1/F2") era **incorrecta en ambas mitades**. (a) **Existe prior art:** Nexa corre un tool loop en producción (`src/lib/nexa/providers/*`, `nexa-tools.ts`, `nexa-turn-telemetry.ts`), single-hop. (b) **El composer no lo necesita:** sus 3 nodos de juicio producen *structured output* (no tool-chains) sobre contexto read-only, y eso ya lo cubre `generateStructured{Anthropic,Gemini,OpenAI}`. El `agent-runtime` baja a **evolución de plataforma**; cuando se haga, es **extracción/generalización del loop de Nexa** (strangler, Nexa consume con `maxTurns=1`), **NUNCA** un segundo loop paralelo, y merece **task propia** (blast radius sobre Nexa productivo). Detalle: **§5-ter**.

### Abiertas (decisión del operador — marca / alcance)

- **Q4 · Naming de producto:** "Tender Proposal Studio" / "Bid Studio" / "Estudio de Licitaciones" — decisión de marca (context pack + product-design).
- **Q5 · Deck = entregable formal o complemento?** ¿El deck branded se sube a la plataforma, o el RFP exige solo PDF técnico/económico y el deck es para la presentación ejecutiva (Fase 2.6.2 del caso SKY)? Impacta si `deck` es `client_facing` con gate de submit o sólo material de presentación.
- **Q6 · Alcance público vs privado en V1:** ¿arrancamos solo privadas (Wherex, intake manual — caso probado SKY) y sumamos públicas (RESEARCH-007) después? Recomendación arch: **privado primero** (caso probado, menos superficie), público en V2.
- **Q7 · Nivel de autonomía del análisis:** ¿el fan-out de lectura arranca automático al subir el RFP (reactivo hasta el gate de fit), o on-demand? Recomendación arch: **reactivo al upload hasta el gate de fit** (el fit es humano de todos modos), con kill-switch.

---

## Dependencias & Impacto

- **Depende de:** Cliente-360, `commercial/quote-to-cash`, asset store, AI Visibility Grader + worker, entitlements/capabilities, patrón state machine (release), outbox/reactive.
- **Impacta a:** RESEARCH-007 (punto de convergencia), el cotizador (le da un consumer real a `commercial.quote_to_cash.execute`), Nexa (nuevas capabilities operables), el método `bid-construction-playbook` (su forma runtime).
- **Requiere ADR formal** antes de implementar (source-of-truth del Tender, schema, boundary con RESEARCH-007). Este doc es el punto de partida.

---

## Apéndice A — Catálogo de módulos del deck AXIS (co-creación 2026-07-11)

Fuente: Figma `Sistema Axis - PPT` (fileKey `GXYeJaRjotmFuczfnd8hLi`, 1 página, 58 frames). Todos los módulos son slides 16:9 (1920×1080) **bipartitas**: una mitad = firma de marca AXIS (gradiente + opcional foto/persona/mockup), la otra = contenido estructurado. El agente **elige el módulo por tipo de contenido y distribuye la info**; NO diseña (refinamiento #6). Los frames `EO_Wave_Fondo*` son fondos; los `Mesa de trabajo*` son decks de ejemplo ya armados (referencia, no plantillas).

| Módulo (`Modulo_MediaPagina_*`) | node-id ej. | Composición | Tipo de contenido de propuesta que cubre |
|---|---|---|---|
| `Right` / `Left` | 6:12498 | contenido + gráfica AXIS (der/izq) | portada · divisor de sección · cierre |
| `Texto+Persona` | 5:7869 | texto narrativo + persona + mockups | resumen ejecutivo · enfoque · metodología |
| `Texto+Texto` | 8:14102 | dos bloques de texto | dos ideas · antes/después · contexto+solución |
| `PersonaTitulo+Tips` | 8:14178 | persona + título + bullets con ícono | **diferenciadores · por qué Efeonce · ventajas** |
| `Texto+DatoDuro` | 7:13485 | texto + número grande (KPI) | destacar UNA métrica del diagnóstico |
| `DatosDuros+Persona` | 7:13598 | panel de varias métricas + persona | diagnóstico / resultados (varios KPIs) |
| `Texto+Grafico` | 5:10852 | texto + gráfico/chart | un dato con visualización |
| `Comparativa` | 8:13782 | tabla comparativa | competencia · planes · opciones |
| `Quote+Persona` | 8:14071 | cita + persona | testimonial · cita de cliente/caso |
| `DobleTips` | 8:14347 | dos listas de tips | dos grupos de recomendaciones |

**Mapeo validado contra la propuesta técnica de SKY** (cada sección cae en un módulo): portada→`Right/Left` · resumen→`Texto+Persona` · diagnóstico Be X/grader→`DatosDuros+Persona`+`Texto+DatoDuro` · terreno competitivo→`Comparativa` · enfoque/metodología→`Texto+Persona` · diferenciadores/por qué Efeonce→`PersonaTitulo+Tips` · cierre→`Right/Left`. Gap del catálogo: no hay módulo dedicado de **equipo/squad** (usar `Texto+Persona` o `DatosDuros+Persona`).

**Implica dos primitives (F4):** (a) **catálogo/registry** `módulo → node-id → tipo de contenido + slots de texto/imagen que acepta`; (b) **composer** (ver Apéndice B). El branding no se toca: vive en el módulo.

> **Delta 2026-07-11 — el composer evolucionó (ver doc dedicado):** el detalle vivo del composer (las 5 reglas del molde: degradado hero-Think tokenizado + luz teal, tipografía Poppins 600 / Geist 600·400, safe-area 72px, assets canónicos, layout-del-Figma; el catálogo con **nombres en inglés** y contratos de slots) vive en **`GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`**. **Corrección clave:** se **abandonó** la táctica de renderizar el panel de Figma como imagen (Apéndice B abajo, punto 3) — no escala y "no se renderiza igual". La ruta canónica pasa a ser **layout extraído del Figma + degradado generado estilo hero de Think**. Lo de abajo queda como registro histórico del loop.

## Apéndice B — El composer del deck (decisión F4, co-creación 2026-07-11)

**Decisión: plantillas HTML (que reproducen los módulos AXIS con CSS + tokens `theme.axis.*`) → el agente llena los slots → Chromium headless `print-to-pdf`.** El mismo HTML alimenta N salidas (patrón §6). NO se reconstruye el diseño en un motor que lo degrade: se rellena sobre la plantilla fiel.

Principio: **fidelidad manda** (es una propuesta a un comité; se ve premium o no se ve). Los módulos AXIS son visualmente ricos (gradientes con grano, fotos recortadas, mockups). Reconstruirlos en un motor de baja fidelidad pierde la marca → regla: **no reconstruir, rellenar la plantilla real**. Chromium es un navegador real: reproduce gradientes/tipografía/composición con fidelidad perfecta (ya probado — los PDFs de la oferta SKY se generaron así, 2026-07-11).

| Camino | Veredicto |
|---|---|
| **HTML + Chromium print-to-pdf** | ✅ **motor primario.** Stack que Greenhouse ya domina; fidelidad de navegador real; mismo HTML → N salidas. |
| **react-pdf** | ❌ motor de deck (no reproduce gradientes/composición AXIS — gotchas TASK-1273). ✅ resérvalo para docs estructurados (económica PDF, Report Artifact). |
| **Motor PPT (PptxGenJS)** | ❌ primario (reconstruir AXIS a mano, fidelidad pobre). ✅ **renderer secundario** SOLO si el RFP exige `.pptx` editable. |
| **Adobe Express** | ❌ motor (saltos Figma→?→Express). ✅ **una salida más** desde el HTML canónico (MCP `html→Express`) cuando pidan editable. |
| **Figma como runtime** | ❌ acopla producción a un externo frágil. Figma es el **diseño-fuente** de los módulos, no el runtime de generación. |

> ⚠️ **APÉNDICE B — SUPERSEDED (2026-07-12).** Este apéndice quedó **obsoleto y en parte contradicho**
> por el runtime real. El contrato vigente del deck es **`GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`**; si
> algo de acá choca con ese doc, **manda el composer**. Dos correcciones duras:
>
> 1. **No son 10 módulos, son 25 plantillas** — todas construidas, con slots y registry.
> 2. **La táctica de "renderizar el panel desde Figma vía `get_screenshot` y usarlo como capa de
>    fondo" fue RECHAZADA** (punto 3 más abajo). El composer decidió lo contrario: el fondo es un
>    **degradado tokenizado en CSS**, porque el raster no escala (no responde a tokens, no se adapta
>    al contenido, pesa, y ata cada lámina a un PNG). Ver `GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`
>    → *"NUNCA volver al mesh gradient recreado"*. **Se conserva el texto original abajo sólo como
>    registro histórico de cómo se llegó a la decisión — NO como instrucción.**

**Trabajo F4 (histórico):** reconstruir los 10 módulos como **plantillas HTML fieles UNA VEZ** (verificadas con GVC contra el Figma), + el registry de slots + el motor de llenado. Es acotado (10 plantillas), reutilizable para siempre, en el stack de la casa.

**Vertical delgado — PROBADO (2026-07-11):** módulo `PersonaTitulo+Tips` → plantilla HTML (gradiente AXIS + `Poppins` título / `Geist` bullets navy `#020061` + ícono estrella + separador punteado) → llenada con los 7 diferenciadores reales de SKY → render Chromium 1920×1080 → **resultado premium, fidelidad alta vs el Figma**. Aprendizajes canonizados:
1. **HTML + Chromium reproduce el módulo AXIS a nivel premium** (gradiente con grano vía CSS `radial/linear` + SVG noise; tipografía real vía Google Fonts). Confirma la decisión.
2. **El agente sólo cambia los slots** (título + N bullets `[bold, desc]`); el branding queda intacto → un módulo = plantilla + un array de contenido.
3. **Fidelidad — táctica canónica PROBADA a ~100% (2026-07-11):** el gradiente CSS aproxima ~90% (le falta el grano exacto y la composición). La solución que clava el 100% es **renderizar el módulo (o su panel de marca) desde Figma vía `get_screenshot` en alta res y usarlo como capa de fondo** (`background: url(panel.png) 0 0 / 1920px 1080px`), mostrando sólo la región de marca con CSS; los **slots de texto/imagen van en HTML encima**. Un módulo = **`[imagen del panel AXIS renderizado de Figma = fijo] + [slots HTML = variable]`**. Validado: el degradado con grano, el logo `efeonce` (con isotipo) y la foto quedaron **idénticos al Figma**, y los 7 bullets de SKY son HTML editable. Regla: lo **fijo del módulo** (gradiente, logo, decoración) → imagen de Figma; lo **variable** (texto, foto del cliente) → HTML/slot. NO reproducir a mano lo que Figma ya renderiza perfecto. Nota: los assets *sueltos* (rectangles individuales) son capas enmascaradas y NO dan el gradiente final; hay que renderizar el nodo compuesto.
4. **Slots de imagen** (foto de persona/equipo, mockups) son parte del módulo — el agente los llena con imagen del cliente o genérica; en el vertical se omitieron sin perder legibilidad.
5. Fuentes `Poppins` + `Geist` cargan vía Google Fonts en Chromium; para runtime, embeberlas (self-contained) o servirlas local (evitar dependencia de red en producción).
