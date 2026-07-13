# TASK-1405 — HubSpot pricebook primitive: **el precio de lista del vendor, gobernado**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1405-hubspot-pricebook-primitive`

> **Foundation del simulador de precios HubSpot.** La cara pública es **TASK-1406**.
> Deriva de la pregunta del operador (2026-07-13): *"¿y si la de precios la convertimos en un cotizador?"*

## Summary

Construye el **pricebook de HubSpot**: un catálogo **declarativo, versionado y con `as-of`** del **precio de
lista publicado** (Hubs × tiers × seats × bandas de contactos × créditos × onboarding fees), más un **estimador
puro** que lo recorre — y su **contrato programático gobernado** (reader + endpoint público + tool de Nexa + MCP).

🔴 **Esto NO es el cotizador de Greenhouse, y la distinción es la task entera.**

El cotizador existe, es maduro y tiene Full API Parity completa (`src/lib/finance/pricing/pricing-engine-v2.ts`,
TASK-1211/1212). Pero es un motor **cost-plus** sobre el **loaded cost de Efeonce**: `precio = costo / (1 − margen)`.
Responde *"¿cuánto le cobro al cliente por mi trabajo?"*.

**Una licencia de HubSpot no tiene costo Efeonce ni margen Efeonce** — tiene un **precio de lista del vendor** y,
para nosotros, un **referral fee**. Son objetos económicos distintos. Meter la licencia dentro del engine
cost-plus **contamina el modelo de margen** y además **no soporta el escalonamiento** (las bandas de contactos de
marketing son *graduated pricing*, y eso es **TASK-623 — todavía `to-do`**).

> 🎯 **El número que ve el visitante tiene dos mitades, y cada mitad tiene su motor:**
>
> | Mitad | Motor | Por qué |
> |---|---|---|
> | **Licencia HubSpot + onboarding** | 🆕 **Este pricebook** | Precio de lista de un vendor. Sin costo ni margen Efeonce |
> | **Nuestra implementación** | ✅ **El cotizador** (`expandServiceIntoQuoteLines` + engine V2, audiencia `public`) | Es exactamente para lo que fue construido |
>
> **Esta task entrega la primera mitad. La segunda llega en TASK-1407** *(la puerta anónima del cotizador — el
> "STOP quadrant" que el ADR de quote parity difirió a propósito)*.

## Why This Task Exists

**1. El waiver es el activo comercial #1 de la práctica, y hoy es un párrafo.** *"El onboarding obligatorio de
HubSpot desaparece de tu contrato si trabajas con un partner certificado"* — **USD 3.000 sobre USD 9.600 en
Marketing Hub Pro, un 31% del año 1**. En prosa, eso se argumenta. En un estimador, **es una línea que se pone
en cero delante de tus ojos.** No se argumenta: **se ve.**

**2. La landing `/precios/` (TASK-1401) declaró *"explica, no cotiza"* — y ese juicio era correcto a medias.**
El argumento era *"una calculadora miente con precisión"*. **Y es cierto para nuestro honorario** (depende del
scope) **y falso para el precio de lista** (es **aritmética sobre números que HubSpot ya publica**). La diferencia
es exactamente esta task. Ver `## Detailed Spec § La corrección del juicio`.

**3. La aritmética honesta es, por sí sola, el argumento.** Nuestro estimador suma lo que la grilla de HubSpot
**no suma**: los **seats view-only que son gratis**, los **saltos escalonados** de contactos, que **los créditos
no se acumulan entre Hubs** y **el onboarding obligatorio**. 🎯 **No es que calculemos mejor: es que calculamos
completo.** El resultado es un número **más alto y más honesto** que el de la página oficial — y **esa es la
prueba de que no estamos vendiendo.**

**4. Un primitive, muchos consumers (Full API Parity).** El mismo pricebook lo consume la landing pública, el
portal (un member cotizando un deal de HubSpot), **Nexa** (*"¿cuánto le sale a este cliente Marketing Pro con
8.000 contactos?"*) y MCP. **Construirlo como un widget JS sobre WordPress sería fabricar a mano una capacidad
que el repo ya decidió que nace gobernada.**

## Goal

- **El pricebook como SoT único** del precio de lista de HubSpot, **versionado, con `as-of` y con marca de
  evidencia por dato** (✅ primaria / ⚠️ secundaria / ❌ no publicada).
- **Un estimador puro** que lo recorra — **la misma función server-side y client-side** *(eso es lo que hace que
  la citabilidad sobreviva: el número se puede renderizar en el HTML servido **y** recalcularse al mover un
  slider)*.
- 🔴 **Un gate que rompe el build cuando los precios envejecen.** *(Una página de precios stale es peor que no
  tener la página. **Que el CI lo cace antes que un cliente.**)*
- **Contrato gobernado:** reader + endpoint público cacheable + tool de Nexa + MCP. **Cero lógica duplicada.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- 🔴 **`docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`** — un primitive, muchos consumers.
- 🔴 **`docs/architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md`** — 🎯 **el ADR ya declaró que el endpoint
  anónimo del cotizador es una task aparte ("STOP quadrant")**. Esta task **NO lo abre** (eso es TASK-1407):
  construye un dominio nuevo que **no toca** el motor cost-plus.
- **`src/lib/finance/pricing/pricing-output-redaction.ts`** — 🎯 **la audiencia `public` y su redactor ya existen,
  testeados, con CERO callers.** TASK-1407 será su primer consumer. **Esta task reusa el *patrón*, no el motor.**
- **Skill `hubspot-solutions-partner`** — `SOURCES.md` (**la evidencia de cada precio**) + `modules/01_PRODUCTO_2026.md`
  (seats, créditos, las dos trampas) + `modules/11_PROPUESTA_PRICING.md` § 2 (el waiver).

## Normative Docs

- 🔴 `.claude/skills/hubspot-solutions-partner/SOURCES.md` — **la fuente y la marca de cada precio.
  Sin esto, el pricebook no se puede sembrar.**
- `.claude/skills/hubspot-solutions-partner/modules/01_PRODUCTO_2026.md` — el modelo de cobro completo.
- `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md` § 2 — qué muestra la landing (el consumer #1).
- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1.md` — el patrón de consumers a replicar.

## 🔴 Reglas duras

1. 🔴 **El pricebook NO entra al engine cost-plus.** Es un dominio propio (`src/lib/growth/hubspot-pricing/`).
   **NUNCA** modelar una licencia de HubSpot como `tool` del `tool_catalog` para cotizarla al cliente:
   ahí HubSpot vive como **costo de Efeonce**, que es otra cosa. **Mezclarlos rompe el modelo de margen.**
2. 🔴 **El SoT es código, no una tabla.** El catálogo es un módulo TS versionado.
   🎯 **Es una decisión de integridad, no de comodidad: así cada cambio de precio pasa por PR con su fuente.**
   Una tabla editable permitiría cambiar un precio **sin evidencia** — que es exactamente lo que la landing denuncia.
3. 🔴 **Cada dato lleva su marca y su `as-of`.** ✅ primaria · ⚠️ secundaria (**se expone como rango/orden de
   magnitud, JAMÁS como precio exacto**) · ❌ no publicada (**el estimador devuelve `notPublished`, y el consumer
   dice *"HubSpot no lo publica"*. NUNCA un número inventado para tapar el hueco.**).
4. 🔴 **Los dos ❌ conocidos se modelan explícitamente:** el fee de onboarding del **bundle Customer Platform**
   (no publicado) y **el monto del tramo de contactos adicionales** (las fuentes públicas **discrepan 10×** → se
   modela el **mecanismo** de bandas, y el monto va como ⚠️ o ❌ según lo que devuelva la reverificación).
5. 🔴 **Los créditos NO se suman entre Hubs.** El estimador debe devolver `max(tier)`, **no la suma**.
   *(4 Hubs Enterprise = **5.000 créditos, no 20.000**. Si el estimador suma, reproduce la trampa que la landing
   denuncia — **y sería el bug más vergonzoso posible en este repo**.)*
6. 🔴 **Los seats `view-only` son gratis** y el estimador **lo aplica solo**, sin que el usuario tenga que saberlo.
7. 🔴 **El estimador es una función PURA** (sin I/O, sin DB, sin fetch). **Server-side y client-side corren el
   mismo código.** Es lo que permite servir el número en el HTML **y** recalcularlo al mover un control.
8. 🔴 **Gate de frescura que rompe el build.** Un test falla si `asOf` del pricebook tiene **> 90 días**.
   *(No es paranoia: HubSpot cambió precios y roster **3 veces en 2026**.)*
9. 🔴 **El estimador NUNCA cotiza el honorario de Efeonce.** Eso es del cotizador (TASK-1407). Acá,
   la implementación sale como **`"te la cotizamos con tus números"`**, no como número.
10. 🔴 **Cero PII, cero auth, cero write.** Es un **read público de un catálogo público**. No hay estado que mutar.

## Dependencies & Impact

### Depends on

- 🔴 **La reverificación de precios en fuente primaria** — **es la misma que bloquea a TASK-1401 (su Slice 1).**
  🎯 **Se hace UNA vez y siembra el pricebook.** *(Y desde entonces, el pricebook es el SoT: la landing deja de
  tener precios hardcodeados en su copy.)*
- Nada más. **Sin migración, sin secretos, sin integración externa.**

### Blocks / Impacts

- 🔴 **Bloquea a TASK-1406** (el simulador público).
- 🎯 **Convierte a `/precios/` (TASK-1401) de página con cifras hardcodeadas en consumer de un SoT.**
  Cuando el pricebook se actualiza, **la landing se actualiza sola**.
- Habilita a **Nexa** a responder *"¿cuánto le sale a este cliente?"* y al **portal** a estimar un deal de HubSpot.
- **No toca** el cotizador ni el engine cost-plus. **Blast radius: cero sobre finance.**

### Files owned

- `src/lib/growth/hubspot-pricing/**` (catálogo + estimador + tipos + tests).
- `src/app/api/public/growth/hubspot-pricing/**` (el endpoint público).
- El tool de Nexa + la entrada de MCP.
- Esta task.

## Current Repo State

### Already exists

- 🎯 **El cotizador, maduro y con Full API Parity completa** — `src/lib/finance/pricing/pricing-engine-v2.ts`
  (`buildPricingEngineOutputV2`), `simulate-quote-pricing.ts`, y **el redactor por audiencia
  `pricing-output-redaction.ts` con `PricingAudience = 'internal' | 'client' | 'public'`**.
  🔴 **`public` tiene CERO callers hoy** — el ADR difirió su puerta anónima a propósito.
- El envelope de estimado no vinculante (`estimate { binding: false, disclaimer, calculatedAt }`).
- El patrón de endpoint público (`src/app/api/public/growth/**`: rate-limit, cache, sin PII).
- La skill `hubspot-solutions-partner` con **todos los precios y sus marcas de evidencia**.

### Gap

- **El pricebook no existe.** Los precios viven hoy **solo en la skill** (markdown) y, si se publica TASK-1401
  tal cual, **quedarían hardcodeados en el copy de una landing** — sin SoT y sin gate de frescura.
- El estimador no existe · el endpoint público no existe · el tool de Nexa no existe.
- ⚠️ **Gap ajeno detectado (no lo arregla esta task):** `commercial.quote.simulate` **no tiene seed en
  `capabilities_registry`** (solo TS catalog + grants). Funciona para `can()` pero **rompe la regla de gobernanza
  "toda capability existe en el registry"**. → Follow-up.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/hubspot-pricing/` — dominio nuevo, hermano de `src/lib/growth/ai-visibility/`.
- Future candidate home: `domain-package`
- Boundary: el catálogo y el estimador son el primitive; los consumers autorizados son la landing pública, el portal, Nexa y MCP, todos vía el reader y el endpoint. Nadie importa el catálogo crudo desde una vista.
- Server/browser split: el catálogo y el estimador son puros y sin I/O, así que corren en los dos lados; el endpoint público sirve el catálogo para que el cliente recalcule sin round-trip. Cero secretos, cero DB, cero server-only.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: **nuevo** — `src/lib/growth/hubspot-pricing/catalog.ts` (módulo TS versionado).
  🔴 **No hay tabla. El código ES el SoT** (regla dura 2).
- Consumidores afectados: **UI pública** (TASK-1406) · **UI portal** (futuro) · **Nexa** (tool read) · **MCP**.
- Runtime target: `local` → `staging` → `production` (Vercel). **No toca el `ops-worker`.**

### Contract surface

- Contrato existente a respetar: el patrón de `src/app/api/public/growth/**` (rate-limit, cache, sin PII) y el
  envelope de estimado no vinculante de `simulate-quote-pricing.ts:56`.
- Contrato nuevo: **reader** `getHubSpotPricebook()` · **estimador puro** `estimateHubSpotCost(input)` ·
  **endpoint** `GET /api/public/growth/hubspot-pricing/catalog` (**cacheable, sin auth, sin PII**) ·
  **tool de Nexa** `hubspot_price_estimate` (read) · **MCP** equivalente.
- Backward compatibility: `not applicable` (todo nuevo).
- Full API parity: 🎯 **el estimador vive en `src/lib/**`, no en el componente.** La landing, el portal, Nexa y
  MCP **llaman al mismo primitive**. **Cero lógica duplicada por consumer.**

### Data model and invariants

- Entidades: **ninguna tabla.** Tipos: `HubSpotPricebook` (versión + `asOf` + `hubs[]` + `seats[]` +
  `contactBands[]` + `credits[]` + `onboardingFees[]`), `PriceFact<T> = { value, evidence: '✅'|'⚠️'|'❌', sourceUrl, asOf }`.
- Invariantes que no se pueden romper:
  - 🔴 **Los créditos se resuelven con `max(tier)`, NUNCA con `sum()`.** *(Es la trampa que la landing denuncia.
    Un test la fija: 4 Hubs Enterprise → **5.000**, no 20.000.)*
  - 🔴 **Un dato ❌ nunca se sustituye por un número.** El estimador devuelve `{ notPublished: true }` y el
    consumer lo dice.
  - 🔴 **Un dato ⚠️ nunca se expone como precio exacto** — sale como rango u orden de magnitud.
  - 🔴 **Los seats `view-only` no se cobran.**
  - 🔴 **El estimador es puro.** *(Un test lo verifica: misma entrada → misma salida, sin I/O.)*
  - 🔴 **El pricebook nunca contiene un honorario de Efeonce.** *(Otro test: el output no tiene campo de margen,
    costo ni bill rate. **La frontera es mecánica, no una promesa.**)*
- Tenant/space boundary: **ninguno.** Es un catálogo público, idéntico para todos.
- Idempotency/concurrency: `n/a` — **read puro, sin estado.**
- Audit/outbox/history: `none` — **no hay write.** El historial de precios **es el git log del catálogo**, que es
  precisamente el punto de la regla dura 2.

### Migration, backfill and rollout

- Migration posture: `none` 🎯 **(y es una decisión, no una omisión: el SoT es código para que cada precio pase
  por PR con su fuente).**
- Default state: **el endpoint público nace detrás de `HUBSPOT_PRICEBOOK_ENABLED` (default OFF)**.
  *(El reader y el estimador se pueden usar server-side sin flag — el flag gatea la **superficie anónima**.)*
  🔴 **Registrar el flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR** (el gate de cierre
  lo exige) **y declarar su runtime: Vercel** *(no hay lectura en el `ops-worker`)*.
- Backfill plan: `n/a`.
- Rollback path: flag OFF → el endpoint desaparece; la landing cae a su contenido estático.
- External coordination: **ninguna.** Sin secretos, sin providers, sin redeploy de workers.

### Security and access

- Auth/access gate: **ninguno — es público por diseño.** 🎯 **No hay nada que proteger:** el catálogo son
  **precios que HubSpot ya publica**, y **el estimador no toca datos de Efeonce ni de ningún cliente.**
  *(Contrastar con TASK-1407, donde sí hay que proteger la estructura de costos: ahí la audiencia `public` y el
  redactor son obligatorios.)*
- Sensitive data posture: `no sensitive data`. **Cero PII, cero finance, cero secretos.**
- Error contract: `canonicalErrorResponse` + `captureWithDomain(err, 'growth', ...)`.
- Abuse/rate-limit posture: **rate-limit por IP** en el endpoint público (patrón de `api/public/growth/**`) +
  **respuesta cacheable** (el catálogo cambia trimestralmente: `s-maxage` largo).
  🎯 **En la práctica el catálogo se sirve una vez y el cliente recalcula solo — el abuso es casi imposible
  porque no hay cómputo caro detrás.**

### Runtime evidence

- Local checks: `pnpm test src/lib/growth/hubspot-pricing` (**los tests de invariantes son el corazón**:
  créditos `max` no `sum` · ❌ no se rellena · pureza · sin campos de margen) + `pnpm local:check`.
- DB/runtime checks: `n/a` — **no hay DB.**
- Integration checks: 🔴 **el gate de frescura** (`asOf` > 90 días → **el build falla**).
- Reliability signals/logs: `none con rationale` — no hay estado ni async. *(Si el endpoint falla, la landing
  cae a su HTML estático: **degradación honesta por construcción**.)*
- Production verification sequence: prender el flag en staging → `GET` del catálogo → verificar `asOf` y marcas →
  ejercitar el estimador con **el caso canónico del waiver** (Marketing Pro: 9.600 + 3.000 → 0) → prod.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes explícitos **y fijados por test** (créditos `max`, ❌ sin relleno, pureza, sin margen).
- [ ] Migration posture explícita (`none`, con la razón).
- [ ] Evidencia de runtime listada.
- [ ] Sin PII, sin datos sensibles, errores canónicos.

## Capability Definition of Done — Full API Parity gate

- [x] **Lógica en el primitive, no en la UI.** El estimador vive en `src/lib/growth/hubspot-pricing/`.
- [x] **Modelado como recurso, no como click-handler.** El pricebook es un recurso; el estimador, una función pura.
- [x] **Read expuesto como reader/recurso canónico.** `getHubSpotPricebook()` + `GET /api/public/growth/...`.
- [ ] **Write:** 🔴 **N/A — no hay write.** Es un catálogo de solo lectura. **No hay estado que mutar, no hay
      aprobación que dar, no hay capability que gatear.**
- [ ] **Capability + grant:** 🔴 **N/A — no capability.** El read es **público y sin gate**: son precios que el
      propio vendor publica. *(Añadir una capability acá sería teatro de gobernanza: no protege nada.)*
- [x] **Camino programático declarado:** endpoint público + tool de Nexa + MCP, **en esta misma task**.
- [ ] **Write apto para `propose → confirm → execute`:** N/A (no hay write).
- [x] **Un primitive, muchos consumers.** Landing pública, portal, Nexa y MCP llaman al mismo estimador.
- [x] **Parity check = SÍ.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — 🔴 Reverificación + siembra del pricebook (bloquea todo)

- **Reverificar en fuente primaria** (la misma pasada que bloquea a TASK-1401 — **se hace una vez**):
  Hubs × tiers · seats (core/sales/service/revenue/**view-only gratis**) · el **mecanismo** de bandas de contactos ·
  créditos por tier (**y la regla `max`**) · consumo por agente · **onboarding fees** · el tramo B2C.
- **Marcar cada dato** ✅/⚠️/❌ **con su `sourceUrl` y su `asOf`.**
- Sembrar `catalog.ts` con la versión `1.0.0`.

### Slice 2 — El estimador puro + sus invariantes

- `estimateHubSpotCost(input) → HubSpotCostEstimate` — **función pura**, sin I/O.
- **Tests de invariante primero** (son el producto, no el accesorio):
  - 🔴 4 Hubs Enterprise → **5.000 créditos**, no 20.000.
  - 🔴 Un ❌ → `{ notPublished: true }`, **nunca un número**.
  - 🔴 Un ⚠️ → rango, **nunca precio exacto**.
  - 🔴 `view-only` → **no se cobra**.
  - 🔴 El output **no contiene** margen, costo ni bill rate *(la frontera con el cotizador, mecanizada)*.
  - 🔴 **Pureza**: misma entrada → misma salida.
- 🎯 **El caso canónico del waiver, como test:** Marketing Hub Pro → `licencia 9.600 + onboarding 3.000 = 12.600`
  → **con partner: `onboarding 0` → 9.600.** **Ese test es el activo comercial, escrito en código.**

### Slice 3 — El gate de frescura

- Test que **falla el build** si `asOf` del pricebook tiene **> 90 días**.
- Mensaje accionable: *"El pricebook de HubSpot tiene {N} días. Reverifica en hubspot.com/pricing y bumpea
  `asOf`. Ver `hubspot-solutions-partner/SOURCES.md`."*
- 🎯 **Ese test es la traducción a CI de la regla que la landing predica.** Si nuestros precios envejecen en
  silencio, somos lo que denunciamos.

### Slice 4 — El contrato programático (Full API Parity)

- Reader `getHubSpotPricebook()`.
- `GET /api/public/growth/hubspot-pricing/catalog` — **cacheable, sin auth, rate-limited**, detrás de
  `HUBSPOT_PRICEBOOK_ENABLED` (default OFF). **Devuelve el catálogo completo** para que el cliente recalcule sin
  round-trip.
- **Tool de Nexa** `hubspot_price_estimate` (read directo — el contrato de Nexa permite reads sin el loop de
  confirmación) + **MCP** equivalente.
- Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md` (**runtime: Vercel**).

### Slice 5 — Cierre

- `pnpm local:check` + `pnpm test` (full) + `pnpm build`.
- Prender el flag en staging + smoke del endpoint + **ejercitar el caso del waiver**.
- Docs: técnica (ADR corto o delta) + funcional + manual (los tres, proporcionales).

## Out of Scope

- 🔴 **La puerta anónima del cotizador** (el estimado de **nuestra implementación**) → **TASK-1407**.
  *(Es el "STOP quadrant" que el ADR de quote parity difirió a propósito, y tiene su propio riesgo: exponer el
  engine cost-plus a tráfico anónimo permite **inferir la estructura de costos por análisis diferencial**. Por eso
  el ADR exige computar sobre un **catálogo publicado curado**, no el interno.)*
- **La UI del simulador** → **TASK-1406**.
- **El pricebook de Salesforce** *(para el TCO de TASK-1404)* — mismo patrón, otra task, si se decide.
- **Graduated pricing en el engine cost-plus** (TASK-623) — **no hace falta**: las bandas viven en el pricebook.

## Detailed Spec

### 🎯 La corrección del juicio (por qué TASK-1401 decía "no cotiza" y ahora sí)

TASK-1401 declaró la regla dura *"explica, no cotiza"*, con el argumento: **una calculadora miente con precisión.**
**Ese argumento sigue en pie — pero solo para una de las dos mitades:**

| | ¿Miente si la calculo? | Por qué |
|---|---|---|
| **Licencia HubSpot** | **No** | Es **aritmética sobre precios publicados**. Y **nuestra suma es más completa que la de HubSpot** (seats gratis, bandas, créditos que no se acumulan, onboarding) |
| **Onboarding** | **No** | Fee **fijo y publicado** |
| **Para quién sirve ese tier** | **No** | Es **calificación** — la tesis del hub, hecha interactiva |
| 🔴 **Nuestra implementación** | **Sí, si doy un número** | Depende del scope. **Un número exacto acá es exactamente lo que la página denuncia** → lo calcula el cotizador (TASK-1407) o se dice *"te lo cotizamos"* |

🎯 **La regla vieja no era falsa: era imprecisa.** Se corrige, no se deroga.

### Shape del catálogo

```ts
type PriceFact<T> = {
  value: T | null
  evidence: 'primary' | 'secondary' | 'not_published'   // ✅ / ⚠️ / ❌
  sourceUrl: string | null
  asOf: string                                          // ISO date
}

type HubSpotPricebook = {
  version: string          // '1.0.0'
  asOf: string             // 🔴 el gate de frescura mira ESTO
  hubs: HubEntry[]         // marketing | sales | service | content | data | revenue
  seats: SeatEntry[]       // core | sales | service | revenue | view_only (free: true)
  contactBands: BandEntry[]// 🔴 escalonadas, NO lineales
  credits: CreditEntry[]   // 🔴 por tier — y NO se suman entre hubs
  onboardingFees: FeeEntry[]  // 🔴 obligatorios · el del bundle Customer Platform = not_published
}
```

### Shape del estimado

```ts
type HubSpotCostEstimate = {
  lineItems: {
    label: string
    amountUsd: number | null
    evidence: PriceFact<number>['evidence']
    note?: string                    // "HubSpot no publica este monto"
  }[]
  totals: { yearOneUsd: number | null; recurringAnnualUsd: number | null }
  credits: { includedPerMonth: number; note: string }   // 🔴 resuelto con max(), no sum()
  waiver: {                                            // 🎯 EL ACTIVO
    onboardingFeeUsd: number
    withPartnerUsd: 0
    pctOfYearOne: number             // ej. 31
  }
  disclaimer: string                 // "Estimado no vinculante. Precios de lista, verificados el {asOf}."
  implementation: 'quote_required'   // 🔴 NUNCA un número acá (TASK-1407 lo llena)
}
```

### El endpoint

`GET /api/public/growth/hubspot-pricing/catalog` → el **catálogo completo**, cacheable.
🎯 **Servir el catálogo entero (no un endpoint de cálculo) es lo que hace barato el progressive enhancement:**
el servidor renderiza el número en el HTML **y** el cliente recalcula al mover un control — **corriendo la misma
función pura**. **Un endpoint de cálculo por request obligaría a un round-trip por interacción y no aportaría nada.**

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

🔴 **Slice 1 (reverificación) bloquea todo.** Sin precios verificados con su fuente, **no hay pricebook**.
Luego 2 (estimador + invariantes) → 3 (gate de frescura) → 4 (contrato) → 5 (cierre).
🔴 **Los tests de invariante se escriben ANTES del estimador.** Son el producto.

### Risk matrix

| Riesgo | Prob. | Mitigación | Señal |
|---|---|---|---|
| 🔴 **El estimador SUMA los créditos entre Hubs** | **media** | Test de invariante (4 Hubs Ent → 5.000) | 🎯 **Sería reproducir la trampa que la landing denuncia — el bug más vergonzoso posible acá** |
| 🔴 **Un precio stale** | **alta** *(cambió 3× en 2026)* | **Gate de frescura que rompe el build a los 90 días** | CI rojo |
| 🔴 **Un ❌ se rellena con un número inventado** | media | Test de invariante + tipo `PriceFact` que **obliga** a declarar la evidencia | Review |
| **El pricebook contamina el engine cost-plus** | baja | Dominio separado + test que verifica que el output **no tiene** margen/costo/bill rate | Import cruzado |
| **Alguien mete el catálogo en una tabla editable** | media | Regla dura 2 + esta task lo declara: **el git log ES el historial de precios** | Review |
| El endpoint público se abusa | baja | Rate-limit + cache. **No hay cómputo caro detrás** | Logs |

### Rollback plan per slice

| Slice | Rollback | Tiempo |
|---|---|---|
| 1-3 | N/A (código nuevo, sin superficie) | — |
| 4 | `HUBSPOT_PRICEBOOK_ENABLED=false` → el endpoint desaparece | <5 min |
| 5 | Revert del PR | <10 min |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `src/lib/growth/hubspot-pricing/` con **catálogo versionado + `asOf` + marca de evidencia por dato**.
- [ ] 🔴 **Cada precio tiene `sourceUrl` y evidencia** (`primary`/`secondary`/`not_published`). **Ninguno inventado.**
- [ ] 🔴 **Los créditos se resuelven con `max(tier)`** — test: **4 Hubs Enterprise → 5.000, no 20.000**.
- [ ] 🔴 **Un dato `not_published` devuelve `{ notPublished: true }`**, nunca un número.
- [ ] 🔴 **Un dato `secondary` sale como rango**, nunca como precio exacto.
- [ ] 🔴 **Los seats `view_only` no se cobran** (el estimador lo aplica solo).
- [ ] 🔴 **El estimador es puro** (test: misma entrada → misma salida, sin I/O) **y corre igual en server y client**.
- [ ] 🔴 **El output NO contiene margen, costo ni bill rate** (test — **la frontera con el cotizador es mecánica**).
- [ ] 🎯 **El caso del waiver está fijado por test:** Marketing Pro → 12.600 sin partner → **9.600 con partner**
      (onboarding = 0 = **31% del año 1**).
- [ ] 🔴 **El gate de frescura rompe el build** si `asOf` > 90 días, con mensaje accionable.
- [ ] `GET /api/public/growth/hubspot-pricing/catalog` responde, **cacheable, sin auth, rate-limited**, detrás de
      `HUBSPOT_PRICEBOOK_ENABLED` (default OFF).
- [ ] **Tool de Nexa + MCP** consumen **el mismo estimador**. **Cero lógica duplicada.**
- [ ] 🔴 **El flag está en `FEATURE_FLAG_STATE_LEDGER.md`** con su runtime (**Vercel**).
- [ ] 🔴 **Cero import del engine cost-plus.** El pricebook **no toca** `src/lib/finance/pricing/**`.
- [ ] `pnpm test` (full) + `pnpm build` verdes en el último commit.
- [ ] Docs: técnica + funcional + manual, proporcionales.

## Verification

`pnpm task:lint --task TASK-1405` · `pnpm ops:lint --changed` ·
`pnpm test src/lib/growth/hubspot-pricing` (**invariantes**) · `pnpm test` (full) · `pnpm build` ·
`pnpm flags:audit --strict` · smoke del endpoint en staging + **el caso del waiver ejercitado**.

## Closing Protocol

- [ ] `Lifecycle` sincronizado · `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (**TASK-1401**: sus precios pasan a salir del pricebook · **TASK-1406** · TASK-1404)
- [ ] Flag registrado en el ledger con su runtime
- [ ] 🔴 **Recordatorio trimestral de reverificación** *(aunque el gate de 90 días ya lo fuerza — el gate es el
      recordatorio, y por eso es mejor que un recordatorio)*

## Follow-ups

- 🔴 **TASK-1407 — la puerta anónima del cotizador**: expone `audience: 'public'` (que **existe y no tiene
  callers**) sobre un **catálogo publicado curado**, con rate-limit, para estimar **nuestra implementación**.
  Es el "STOP quadrant" del ADR de quote parity. **Riesgo real:** tráfico anónimo contra el engine cost-plus
  permite **inferir la estructura de costos por análisis diferencial** — por eso el ADR exige el catálogo curado.
- ⚠️ **Gap ajeno:** `commercial.quote.simulate` **sin seed en `capabilities_registry`** (solo TS catalog + grants).
  Rompe la regla *"toda capability existe en el registry"*. **No es de esta task, pero alguien tiene que cerrarlo.**
- **Pricebook de Salesforce** para el TCO de TASK-1404 — mismo patrón.

## Open Questions

- ¿El catálogo modela **descuentos por término** (anual vs mensual) como dato, o solo se declara la trampa
  (*"el precio que ves es el anual"*)? *(Recomendado: **dato**, porque el estimador puede mostrar los dos y **la
  diferencia es un argumento**.)*
- ¿El estimador soporta **bundles** (Customer Platform) sabiendo que **su onboarding fee es ❌ no publicado**?
  *(Recomendado: **sí, y que lo diga**: *"HubSpot no publica el fee de onboarding de este bundle — pídelo por
  escrito"*. **El hueco declarado es contenido.**)*
