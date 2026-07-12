# GREENHOUSE — Ownership de `tenders` y frontera con el discovery público (ADR)

> **Status:** `Accepted`
> **Date:** 2026-07-12
> **Owner:** Commercial (Tender Proposal Studio) + Commercial (RESEARCH-007 / discovery público)
> **Scope:** `greenhouse_commercial.tenders` · `greenhouse_commercial.public_tender*` · `src/lib/commercial/tenders/**` · RESEARCH-007 (TASK-674/675/682/683/684/686) · TASK-1392 (F0) · TASK-1391 (renderer)
> **Reversibility:** `two-way-but-slow` — hoy **no existe ninguna de las dos tablas**, así que decidir ahora es reversible a costo cero. Después de la primera migración con datos reales, revertir cuesta una migración de datos con estado de licitaciones en vuelo.
> **Confidence:** `high`
> **Validated as of:** 2026-07-12 — verificado contra el repo: `grep` de nombres de tabla en ambos programas, `src/lib/commercial/tenders/**` (13 archivos, sin migración) y `migrations/` (cero tablas `tender*`).

> **Delta 2026-07-12 — vocabulario superseded por el ADR del Artifact Composer (Accepted, posterior) y TASK-1392.**
> El OWNERSHIP de este ADR sigue vigente tal cual (RESEARCH-007 descubre · el Studio construye · la
> promoción es un command human-gated). Lo que queda superseded es el VOCABULARIO:
>
> - el aggregate es **`Proposal`** (`greenhouse_commercial.proposals` + `proposal_*`), no `Tender`/`tenders`;
> - **`origin ∈ {public_tender, private_rfp, direct_sales}`** — los valores `manual`/`public_discovery`
>   de este doc NO existen en el enum canónico. La promoción es
>   `createProposal(origin='public_tender', publicOpportunityId)`; **SKY/Wherex es `private_rfp`**;
> - los estados terminales son **`won`/`lost`** (el copy visible se resuelve por `origin`).
>
> TASK-1392 materializa el schema con este vocabulario; leer sus Deltas como fuente del enum.

---

## Context

Dos programas comerciales convergen sobre el mismo schema `greenhouse_commercial`, y ninguno declaraba
quién es dueño del concepto "licitación":

- **RESEARCH-007 — discovery público** (`Active`, TASK-674…688): ingesta Mercado Público/ChileCompra,
  filtra oportunidades, corre scoring y bid/no-bid. Declara `public_tenders`,
  `public_tender_documents`, `public_tender_decisions`, `public_tender_links`,
  `public_procurement_opportunities`.
- **Tender Proposal Studio** (`Partially implemented`): modela la **oferta que Efeonce construye** como
  aggregate `Tender` con state machine append-only. Declara `tenders` y `tender_requirements`. Su deck
  composer ya está shipped; el aggregate no.

**No hay colisión de nombres** (el prefijo `public_tender*` ya los separa), pero **sí había un vacío de
ownership**: ningún doc decía quién crea, escribe y posee la fila canónica de una licitación, ni cómo una
oportunidad pública se convierte en una oferta. `TASK-1392` quedó **bloqueada** por eso: crear la tabla sin
arbitrar arriesga un source of truth paralelo.

**Las fuerzas en tensión:**

1. **La licitación privada no tiene oportunidad pública.** El caso real que financió todo esto —**SKY
   Airline, vía Wherex**— es privado: **no existe** una fila de Mercado Público detrás. Si el bid colgara
   del discovery, una licitación privada no tendría dónde vivir.
2. **`public_tenders` es un espejo de un sistema externo.** Se re-sincroniza desde Mercado Público, es
   idempotente contra la fuente y lo escribe un cron. **`tenders` es estado de negocio propio**, con
   máquina de estados append-only y gates humanos, y lo escribe un command.
3. **Los ciclos de vida no coinciden.** Una oportunidad pública existe **exista o no** una oferta de
   Efeonce. La relación es **1 : 0..1**, no 1:1.

---

## Decision

**Tres reglas, y de ellas se deriva todo lo demás:**

1. **El Tender Proposal Studio es dueño de `greenhouse_commercial.tenders`** (y de `tender_requirements`,
   `tender_state_transitions`, `tender_assets`). Es el **único** aggregate canónico de "la oferta que
   Efeonce construye", **sea pública o privada**.
2. **RESEARCH-007 es dueño de `greenhouse_commercial.public_tender*`.** Son la **proyección del radar
   público**: un espejo re-sincronizable de una fuente externa. **NUNCA** son el aggregate del bid.
3. **La promoción de una oportunidad pública a un Tender es un COMMAND con confirmación humana, nunca un
   INSERT desde el discovery.** El discovery **jamás escribe `tenders`**.

### El contrato de promoción

```text
public_tenders (radar, cron, re-sincronizable)
        │
        │  el operador decide GO en el bid desk  ← gate HUMANO (TASK-684)
        ▼
  createTender(command)          ← el ÚNICO write path de `tenders` (TASK-1392)
        │  origin = 'public_discovery'
        │  public_opportunity_id = FK → la fila del radar
        ▼
   tenders (aggregate, state machine append-only, gates humanos)
```

- `tenders.origin ∈ {manual, public_discovery}`. Una licitación privada (SKY/Wherex) nace con
  `origin=manual` y **sin** FK — y eso es válido y esperado, no un caso borde.
- `public_opportunity_id` es **nullable** y apunta al radar. La FK va **del Tender hacia el radar**, no al
  revés: el radar no sabe (ni necesita saber) que alguien decidió ofertar.
- **El GO del bid/no-bid ES el momento de la promoción.** No hay un paso extra: el gate humano que
  RESEARCH-007 ya planifica (TASK-684) es exactamente el `propose → confirm → execute` que crea el Tender.

### Reglas duras que salen de esta decisión

- **NUNCA** el discovery escribe, actualiza o borra `tenders`. Su único camino es emitir el handoff que un
  humano confirma.
- **NUNCA** se guarda estado del bid (fase, decisión, entregables, assets) en `public_tender*`. Un re-sync
  desde Mercado Público **pisaría** ese estado — y perder el estado de una oferta en vuelo es
  irrecuperable.
- **NUNCA** se crea una tabla paralela de licitaciones ni se "improvisa sobre `public_tenders`". Si una
  capability necesita el concepto de licitación, consume el aggregate `Tender`.
- **NUNCA** un Tender copia entidades del radar. Referencia por FK y **cita la evidencia**; no duplica.

---

## Alternatives Considered

| Alternativa | Por qué NO |
|---|---|
| **`public_tenders` es el aggregate; el Studio le agrega columnas de bid** | **Lo mata el caso privado**: SKY (Wherex) no tiene fila pública, no tendría dónde vivir. Y mezcla un espejo re-sincronizable con estado de negocio: un re-sync podría **pisar el estado de una oferta en vuelo**. |
| **Dos aggregates independientes, sin FK** (el Tender re-teclea los datos del radar) | Duplica el dato, pierde el lineage y hace imposible auditar de dónde salió la licitación. Rompe evidence-first. |
| **El discovery hace `INSERT` directo en `tenders` al detectar fit alto** | Elimina el gate humano de bid/no-bid — el corazón del método (nunca GO sin margen, admisibilidad primero). Un cron no decide participar en una licitación. |
| **Renombrar todo a un solo `tenders` con `kind ∈ {public_opportunity, bid}`** | Colapsa dos ciclos de vida distintos en una tabla con la mitad de las columnas siempre nulas, y obliga a filtrar por `kind` en cada query. Vuelve el re-sync peligroso otra vez. |
| **Postergar la decisión hasta que exista una de las dos tablas** | Es la opción cuyo costo **crece con el tiempo**: hoy vale cero, después vale una migración de datos con licitaciones activas. |

---

## Consequences

**Beneficios**

- **TASK-1392 Slice 0 se desbloquea** (y con ella TASK-1391, que depende de la foundation).
- El bid privado y el público comparten **un solo motor**: mismo aggregate, misma state machine, mismos
  commands, mismo deck composer. El origen es un campo, no una arquitectura.
- El radar público sigue siendo **libremente re-sincronizable** sin riesgo de pisar nada.
- El lineage queda auditable: de una oferta se puede volver a la oportunidad y a su evidencia.

**Costos y riesgos**

- Un `JOIN` extra cuando una vista necesita datos del radar y del bid a la vez. Aceptable.
- Hay que sostener la disciplina: cualquier task de discovery que sienta la tentación de "guardar acá el
  estado del bid" está violando el ADR. El code review es el enforcement (no hay lint posible para esto).
- `tender_requirements` (el requisito-set) se llena en **F1**; TASK-1391 depende de él para el gate de
  formato/peso. Mientras no exista, el gate de peso opera con un default global (20 MB) — **explícitamente
  un fallback, no el contrato**.

---

## Runtime Contract

**Fuente de verdad tras esta decisión:**

| Concepto | Dueño | Tabla / módulo |
|---|---|---|
| Oportunidad pública (radar) | RESEARCH-007 | `greenhouse_commercial.public_tender*` |
| **La oferta que Efeonce construye** | **Tender Proposal Studio** | `greenhouse_commercial.tenders` (+ `tender_state_transitions`, `tender_assets`, `tender_requirements`) |
| Write path del aggregate | Studio | `createTender` / `ingestTenderRfp` / `transitionTenderState` (TASK-1392) — **único** |
| Promoción público → bid | Handoff human-gated | GO del bid desk (TASK-684) → `createTender(origin='public_discovery', public_opportunity_id)` |
| Motor del deck | Studio | `src/lib/commercial/tenders/deck/**` (shipped) |

**Docs que quedan subordinados a este ADR:** `GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` (§0 y
§1), `docs/research/RESEARCH-007-commercial-public-tenders-module.md`,
`agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`, `TASK-1392` (Slice 0), `TASK-1391`.

---

## Revisit When

- Aparece un **tercer origen** de licitaciones que no sea ni manual ni Mercado Público (p. ej. un portal
  LATAM con su propio radar, o SAP Ariba/Coupa). El campo `origin` debería extenderse, **no** el modelo.
- El radar público necesita conservar estado propio de decisión **que no sea** el bid (p. ej. "descartada
  por el filtro automático antes de llegar a un humano"). Eso vive en `public_tender_decisions`, no en
  `tenders` — si esa frontera se vuelve borrosa, reabrir.
- Una licitación pasa a tener **múltiples ofertas de Efeonce** simultáneas (consorcios, lotes separados).
  Hoy la relación es 1:0..1; si se vuelve 1:N, el modelo aguanta (N Tenders → 1 oportunidad), pero hay que
  revisar unicidad e idempotencia del command de promoción.
