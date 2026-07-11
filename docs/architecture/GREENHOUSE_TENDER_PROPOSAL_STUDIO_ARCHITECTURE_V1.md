# GREENHOUSE — Tender Proposal Studio (arquitectura V1)

> **Tipo:** Architecture spec / ADR (diseño, NO implementación)
> **Versión:** 0.1 · **Status:** Proposed
> **Creado:** 2026-07-11 por Claude (skill `arch-architect`) con Julio Reyes
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
- **Enlace comercial:** FK opcional a `deal`/`opportunity` (el Tender adjudicado alimenta el deal → quote → contract → delivery, cerrando el bow-tie).

```
greenhouse_crm.tenders
  tender_id          text PK        -- ej. TND-000123 (allocator, como release/ICO)
  client_id          text FK  → greenhouse.clients        -- comprador (360)
  deal_id            text FK  → commercial deal (nullable) -- enlace bow-tie
  public_opportunity_id text (nullable)  -- si origin=public_discovery (RESEARCH-007)
  origin             text CHECK (manual | public_discovery)
  title              text
  platform           text     -- Wherex, Mercado Público, privada directa…
  state              text CHECK (ver §2)
  submit_deadline    timestamptz
  currency           text     -- CLP proveedor chileno / USD extranjero
  created_by, created_at, updated_at
```

**Workspace anclado (assets gobernados, no carpeta suelta):** cada Tender ancla un espacio de assets vía el store canónico (`src/lib/storage/greenhouse-assets.ts`) con dos zonas y estado por deliverable:

```
tender/<tender_id>/
  input/    RFP recibido: bases.docx, planilla.xlsx, anexos, docs-para-llenar
  output/   diagnóstico, técnica, económica, matriz-admisibilidad, decks, otros-docs
```

`tender_assets` (kind ∈ {rfp_source, fillable_template, diagnostic, technical_offer, economic_offer, admissibility_matrix, deck, other_doc}, status ∈ {draft, in_review, final}, version). Los "docs para llenar" del RFP son `fillable_template` → sub-tarea de agente + gate humano.

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

- **Gates humanos (dobles bordes):** `fit_review → producing|declined`, `ready_to_submit → submitted`. Además gates *intra-fase* en `producing` (precio final) y `packaging` (declaraciones sensibles, p. ej. "sin demandas contra el comprador").
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
| Producción | `commercial.tender.produce.{diagnostic,squad,pricing,copy}` | write (async) | UI · Nexa (propose) |
| Económica (quote) | `commercial.tender.attach_quote` | write | UI · MCP (cotizador) |
| Packaging / decks | `commercial.tender.package` | write (async) | UI · Nexa (propose) |
| Submit | `commercial.tender.mark_submitted` | write **gated** | **humano** |

**Lectura vs escritura (CQRS-lite):** readers (`tender-readers.ts`) proyectan shape para UI/Nexa; los writes pasan por commands con audit+outbox. No se mezclan.

---

## 4. Los tres planos de orquestación

**Plano 1 — Pipeline determinista (columna vertebral).** La state machine en código decide qué transición es legal. No hay LLM "decidiendo el siguiente paso". Reanudable, auditable, testeable.

**Plano 2 — Fan-out de agentes (dentro de fases pesadas).** El trabajo de IA corre como **job async en worker** (patrón ops-worker; el harness de agentes se invoca ahí, no en el request de Vercel):
- **`analyze`** → *multi-modal sweep*: 1 agente lector por doc del RFP (docx/xlsx/anexo) en paralelo → merge → **requisito-set canónico** (excluyentes vs. puntúa, criterios+pesos, plazos, formato, SLA, penalidades) + matriz de admisibilidad.
- **QA multi-lente (Fase 9.5)** → 5 lentes en paralelo (commercial·talent·finance·copywriting·licitaciones) → síntesis.
- **`package` decks** → fan-out creativo (design-studio dirige · ai-image · motion · typography/AXIS) → ensamblado con branding Efeonce.

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

## 6. Económica: un adapter, no tres flujos

`packaging` requiere un `quote`; **le da igual de dónde salga**. Contrato común `TenderQuote` (line items + total + currency + terms), con `source`:

| `source` | Implementación | Reusa |
|---|---|---|
| `greenhouse_q2c` | Llama al cotizador canónico (`quote-to-cash`) — activa la capability `commercial.quote_to_cash.execute` (hoy huérfana → este dominio le da un consumer real) | ✅ cotizador |
| `excel_upload` | Parsea/adjunta la planilla exigida por el RFP → normaliza al shape `TenderQuote` | asset store |
| `manual` | Captura a mano (line items + total) cuando no hay cotizador ni Excel | — |

Las tres producen el **mismo shape** → `packaging` no ramifica. Si el RFP exige planilla Excel propia (caso SKY §B5), la vía `excel_upload` la cubre.

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

## 10. Open Questions (deliberadamente no decididas)

1. **Schema de aterrizaje:** ¿`greenhouse_crm` o un schema `greenhouse_commercial` nuevo? (Alinear con dónde viven hoy deals/quotes/contracts.)
2. **Convergencia con RESEARCH-007:** ¿el Tender Studio absorbe el discovery público como `origin=public_discovery`, o quedan como dos módulos con un punto de "promoción"? Recomendación: dos módulos, un handoff.
3. **Runtime del orquestador de producción:** ¿ops-worker existente, un worker nuevo `tender-worker`, o el harness de Workflow? (Depende de latencia/aislamiento.)
4. **Naming de producto:** "Tender Proposal Studio" / "Bid Studio" / "Estudio de Licitaciones" — decisión de marca (context pack + product-design).
5. **Deck = entregable formal o complemento?** ¿El deck branded se sube a la plataforma, o el RFP exige solo PDF técnico/económico y el deck es para la presentación ejecutiva (Fase 2.6.2 del caso SKY)?
6. **Alcance público vs privado en V1:** ¿arrancamos solo privadas (Wherex, intake manual — caso probado SKY) y sumamos públicas (RESEARCH-007) después?
7. **Nivel de autonomía del análisis:** ¿el fan-out de lectura arranca automático al subir el RFP (reactivo hasta el gate de fit), o on-demand?

---

## Dependencias & Impacto

- **Depende de:** Cliente-360, `commercial/quote-to-cash`, asset store, AI Visibility Grader + worker, entitlements/capabilities, patrón state machine (release), outbox/reactive.
- **Impacta a:** RESEARCH-007 (punto de convergencia), el cotizador (le da un consumer real a `commercial.quote_to_cash.execute`), Nexa (nuevas capabilities operables), el método `bid-construction-playbook` (su forma runtime).
- **Requiere ADR formal** antes de implementar (source-of-truth del Tender, schema, boundary con RESEARCH-007). Este doc es el punto de partida.
