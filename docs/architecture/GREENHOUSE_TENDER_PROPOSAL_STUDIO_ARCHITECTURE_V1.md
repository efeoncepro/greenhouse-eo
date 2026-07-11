# GREENHOUSE — Tender Proposal Studio (arquitectura V1)

> **Tipo:** Architecture spec / ADR (diseño, NO implementación)
> **Versión:** 0.2 · **Status:** Proposed
> **Creado:** 2026-07-11 por Claude (skill `arch-architect`) con Julio Reyes
> **v0.2 (2026-07-11):** los 6 refinamientos validados contra SKY (§9-ter) quedan **incorporados al cuerpo** (schema §1, gates §2, capabilities §3, deck §4, quote §6); Open Questions aterrizadas contra runtime real (Q1 schema, Q3 worker, Q8 agent-runtime).
> **Método funcional (SSOT):** skill `greenhouse-public-private-tenders` → `bid-construction-playbook.md` (10 fases + Fase 4-bis)
> **Prior art:** `docs/research/RESEARCH-007-commercial-public-tenders-module.md` (discovery público), `src/lib/commercial/quote-to-cash/**` (cotizador), `src/lib/release/state-machine.ts` (patrón state machine)

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

**Gap detectado (aprendizaje del loop, 2026-07-11):** NO existe hoy un tool-runner / agent-loop canónico en `src/lib/**` (grep sin resultados). Es un **primitive nuevo a crear** — `src/lib/ai/agent-runtime` (tool-use loop sobre el cliente canónico, tools = capabilities, con eval + observabilidad). Precondición de F1/F2. Va a Open Questions.

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

**Gates que no se degradan** (si se rompen, el modo deja de *construir* y se evapora): realidad sobre memoria · human-in-control en lo sensible · canonizar en las 3 capas + memoria al cerrar cada bloque (no dejar el aprendizaje sólo en el chat). Es primo del *Real-Artifact Iterative Verification Loop* (features visuales validadas con artefacto real, no mocks) y del *Solution Quality Operating Model* (causa raíz, no parches) — no es un método nuevo, es el estilo de la casa. Mientras el status sea `Proposed`, cada iteración es **doc-only** (reversible, sin deuda) hasta que un ADR autorice construir.

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
- **Q3 · Runtime del orquestador → `tender-worker` dedicado (diferido a F1).** El fan-out de lectura + agentic loops + render Chromium es pesado y largo (minutos); NO debe compartir el `ops-worker` (cron de outbox cada 2 min — un render de deck de 5 min bloquearía el publisher). Worker propio = aislamiento. F0 no tiene IA → sin worker; el worker nace en F1.
- **Q8 · Agent-runtime canónico → `src/lib/ai/agent-runtime` compartido.** Confirmado: sólo existe `src/lib/ai/anthropic.ts`, no hay tool-runner loop. Es **infraestructura, no de dominio** → primitive compartido (reusable por Nexa y otros), tool-use loop sobre el cliente canónico, tools = capabilities, con eval + observabilidad. **Precondición dura de F1/F2.**

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

**Trabajo F4:** reconstruir los 10 módulos como **plantillas HTML fieles UNA VEZ** (verificadas con GVC contra el Figma), + el registry de slots + el motor de llenado. Es acotado (10 plantillas), reutilizable para siempre, en el stack de la casa.

**Vertical delgado — PROBADO (2026-07-11):** módulo `PersonaTitulo+Tips` → plantilla HTML (gradiente AXIS + `Poppins` título / `Geist` bullets navy `#020061` + ícono estrella + separador punteado) → llenada con los 7 diferenciadores reales de SKY → render Chromium 1920×1080 → **resultado premium, fidelidad alta vs el Figma**. Aprendizajes canonizados:
1. **HTML + Chromium reproduce el módulo AXIS a nivel premium** (gradiente con grano vía CSS `radial/linear` + SVG noise; tipografía real vía Google Fonts). Confirma la decisión.
2. **El agente sólo cambia los slots** (título + N bullets `[bold, desc]`); el branding queda intacto → un módulo = plantilla + un array de contenido.
3. **Fidelidad — táctica canónica PROBADA a ~100% (2026-07-11):** el gradiente CSS aproxima ~90% (le falta el grano exacto y la composición). La solución que clava el 100% es **renderizar el módulo (o su panel de marca) desde Figma vía `get_screenshot` en alta res y usarlo como capa de fondo** (`background: url(panel.png) 0 0 / 1920px 1080px`), mostrando sólo la región de marca con CSS; los **slots de texto/imagen van en HTML encima**. Un módulo = **`[imagen del panel AXIS renderizado de Figma = fijo] + [slots HTML = variable]`**. Validado: el degradado con grano, el logo `efeonce` (con isotipo) y la foto quedaron **idénticos al Figma**, y los 7 bullets de SKY son HTML editable. Regla: lo **fijo del módulo** (gradiente, logo, decoración) → imagen de Figma; lo **variable** (texto, foto del cliente) → HTML/slot. NO reproducir a mano lo que Figma ya renderiza perfecto. Nota: los assets *sueltos* (rectangles individuales) son capas enmascaradas y NO dan el gradiente final; hay que renderizar el nodo compuesto.
4. **Slots de imagen** (foto de persona/equipo, mockups) son parte del módulo — el agente los llena con imagen del cliente o genérica; en el vertical se omitieron sin perder legibilidad.
5. Fuentes `Poppins` + `Geist` cargan vía Google Fonts en Chromium; para runtime, embeberlas (self-contained) o servirlas local (evitar dependencia de red en producción).
