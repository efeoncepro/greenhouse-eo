# TASK-1406 — Simulador de precios HubSpot en `/servicios/hubspot/precios/`: **ver el waiver ponerse en cero**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1406-hubspot-price-simulator.md`
- Flow: `docs/ui/flows/TASK-1406-hubspot-price-simulator-flow.md`
- Motion: `docs/ui/motion/TASK-1406-hubspot-price-simulator-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: 🔴 **TASK-1405** (el pricebook) · **TASK-1401** (la página que lo hospeda)
- Branch: `task/TASK-1406-hubspot-price-simulator-ui`

> **La cara pública del pricebook.** Motor: **TASK-1405**. Página anfitriona: **TASK-1401**.
> Deriva de la pregunta del operador (2026-07-13): *"¿y si la de precios la convertimos en un cotizador?"*

## Summary

Monta un **simulador de precios** sobre `/servicios/hubspot/precios/` (TASK-1401), como **capa de enhancement
sobre la página estática**, no en su lugar. Consume el estimador puro de **TASK-1405**.

El visitante elige **Hubs · tier · seats · contactos**, y ve el desglose que HubSpot no le arma: la licencia, los
**seats view-only que no paga**, el **salto escalonado** de contactos, los **créditos que no se suman entre Hubs**,
y **el onboarding obligatorio**. Y entonces pasa **lo único que esta task existe para provocar**:

```
Licencia Marketing Hub Pro (anual)        USD  9.600
Onboarding obligatorio de HubSpot         USD  3.000
                                          ─────────
Año 1 comprando directo                   USD 12.600

Con Efeonce (partner certificado):
Onboarding                                USD      0     ← 31% del año 1
                                          ─────────
Año 1                                     USD  9.600
```

🎯 **El waiver deja de argumentarse y pasa a verse.** Es el activo comercial #1 de la práctica, y hoy es un párrafo.

🔴 **La implementación NO se cotiza acá.** Sale como *"te la cotizamos con tus números, sin costo"* → reunión.
*(El número real de la implementación lo calcula el cotizador, y eso es **TASK-1407**.)*

## Why This Task Exists

**1. El waiver en prosa no compite con el waiver en pantalla.** Un párrafo que dice *"te ahorras un 31% del año
1"* es un claim más. **Una línea que se pone en cero mientras el usuario mira es una demostración.**

**2. La honestidad se vuelve verificable.** Nuestro estimador **suma más caro que la grilla de HubSpot** — porque
incluye lo que ellos no muestran. 🎯 **Un vendedor que te da un número más alto que el del vendor no te está
vendiendo: te está avisando.** Eso, en un comité, vale más que cualquier copy.

**3. No rompe la citabilidad — la refuerza.** El simulador es **enhancement**: sin JS, la página es exactamente
TASK-1401 (todas las tablas, todas las trampas, el waiver en texto servido). **Con JS, además, se puede jugar
con ella.** *(Y el estimador de TASK-1405 es una **función pura**, así que el mismo código produce el número del
HTML servido y el que se recalcula al mover un control. **El progressive enhancement sale gratis por diseño.**)*

## Goal

- Montar el simulador **sobre** la página, sin quitarle una sola cifra al HTML servido.
- 🎯 **Hacer visible el waiver** como línea que se pone en cero.
- Mostrar las tres trampas **en acción**, no solo explicadas: seats gratis · salto de banda · créditos que no suman.
- Entregar a la conversación: **"te cotizamos la implementación con tus números"** → reunión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- 🔴 **TASK-1405** — el pricebook + el estimador puro. **Esta task NO calcula nada: consume.**
- 🔴 **TASK-1401** — la página anfitriona y sus 8 reglas duras, **que siguen vigentes**.
- **PDR-013** + `HUBSPOT_HUB_LANDINGS_SPEC.md` § 2 (con el delta de esta task).
- Skill `efeonce-public-site-wordpress` — build Ohio + snapshot + rollback.

## Normative Docs

- 🔴 `docs/tasks/to-do/TASK-1405-hubspot-pricebook-primitive.md` — **el contrato del estimador.**
- 🔴 `docs/tasks/to-do/TASK-1401-landing-hubspot-precios.md` — **la página que hospeda, y sus reglas.**
- `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md` § 2 — el contenido estático que **no se toca**.
- `docs/context/05_voz-tono-estilo.md` — voz y registro.

## 🔴 Reglas duras

1. 🔴 **El simulador es enhancement, no reemplazo.** **Sin JS, la página es TASK-1401 completa** — todas las
   tablas, todas las trampas, el waiver en texto servido. 🎯 **La citabilidad es el activo del hub: si el
   simulador la rompe, el simulador está mal construido.**
2. 🔴 **El número por defecto se renderiza server-side.** El estado inicial del simulador **está en el HTML**.
   **NUNCA arranca en `0` esperando que el JS lo llene** — eso es el contador que el hub entero prohíbe.
3. 🔴 **Cero cálculo propio.** El componente **llama a `estimateHubSpotCost()` de TASK-1405**. Si aparece una
   fórmula en el JSX/JS de la página, **la task está mal hecha** (y viola Full API Parity).
4. 🔴 **La implementación NO tiene número.** Sale como *"te la cotizamos con tus números"*.
   *(Un rango inventado sería exactamente el "miente con precisión" que la página denuncia.)*
5. 🔴 **Los ❌ se dicen.** Si el pricebook devuelve `notPublished`, la línea aparece como
   *"HubSpot no publica este monto — pídelo por escrito"*. **Nunca un `0` ni un guion mudo.**
6. 🔴 **Los ⚠️ salen como rango**, nunca como cifra exacta.
7. 🔴 **`as-of` visible** junto al resultado, siempre.
8. 🔴 **Sin gate.** El simulador **no pide email para mostrar el número**. 🎯 **Pedirlo sería reproducir
   exactamente el gate que la página existe para denunciar** (*"agenda una demo para saber el precio"*).

## Dependencies & Impact

### Depends on

- 🔴 **TASK-1405** — el pricebook, el estimador y el endpoint público (+ el flag `HUBSPOT_PRICEBOOK_ENABLED`).
- 🔴 **TASK-1401** — la página tiene que existir (el simulador se monta encima).
- `<greenhouse-form>` + HubSpot Meetings (reuso) — el CTA no cambia.

### Blocks / Impacts

- 🎯 **Convierte `/precios/` de "la respuesta honesta" en "la respuesta honesta + la demostración del waiver".**
- Alimenta el pipeline: el que simula y ve el 31% **tiene una razón concreta para agendar**.
- **Prepara TASK-1407**: cuando el cotizador abra su puerta anónima, **la línea "implementación" deja de decir
  *"te la cotizamos"* y muestra el número real** — sin rediseñar nada.

### Files owned

- Esta task · `docs/ui/wireframes/TASK-1406-*` · `docs/ui/flows/TASK-1406-*` · `docs/ui/motion/TASK-1406-*`.
- El bloque del simulador dentro de la página `/servicios/hubspot/precios/` · su scenario GVC.

## Current Repo State

### Already exists

- **TASK-1401** con las 13 regiones **y la tabla de créditos como región firma** — el simulador **la hace
  jugable**, no la reemplaza.
- El patrón de widget custom de Elementor (`greenhouse_creative_landing_module`, TASK-1350) como precedente de
  **componente propio en una landing Ohio**.
- El patrón de embed de `<greenhouse-form>`.

### Gap

- 🔴 **El pricebook no existe** (TASK-1405 — **bloqueante**).
- El simulador no existe · el copy de sus estados sin draftear.

## Modular Placement Contract

- Topology impact: `public`
- Current home: bloque page-scoped dentro de la página WordPress `/servicios/hubspot/precios/` (Ohio, CSS y JS de la página).
- Future candidate home: `public`
- Boundary: el simulador es consumer del estimador puro de TASK-1405 y del endpoint público del catálogo; no calcula nada por su cuenta ni define contratos propios.
- Server/browser split: el estado inicial se renderiza server-side y queda en el HTML; el recálculo corre en el browser con la misma función pura. Cero secretos, cero DB, cero PII.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: **el mismo de TASK-1401** — CFO / RevOps / CMO evaluando HubSpot, tráfico frío, **que vino por
  el número y no quiere hablar con un vendedor**.
- Momento del flujo: **ya leyó las trampas.** Ahora quiere **su** número.
- Resultado perceptible esperado: 🎯 **ve el onboarding ponerse en cero.** Y entiende, sin que se lo digan, que
  el número que le dimos **es más alto que el de la grilla oficial** — *porque está completo*.
- Fricción que debe reducir: la última que quedaba — *"ya entendí el modelo, pero **¿cuánto me sale a mí?**"*.
- No-goals UX: 🔴 **no cotiza la implementación** · **no pide email** · no promete un precio final vinculante ·
  no reemplaza el contenido estático.

### Surface & system decision

- Surface: bloque dentro de `/servicios/hubspot/precios/` (ancla `#simulador`).
- Composition Shell: `no aplica` (sitio público).
- Primitive decision: `one-off` — un bloque page-scoped de la landing. 🎯 **No nace un primitive del Design
  System**: es una superficie de marketing, no de producto. *(Si mañana el portal necesita el mismo simulador,
  **el primitive reusable ya existe y es el estimador de TASK-1405** — la UI se reimplementa con el layout del
  portal, que es lo correcto.)*
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: **ninguno.** El simulador es inline. 🔴 **Nada de modal** — un modal
  esconde el resultado detrás de una interacción, y **el resultado es el argumento**.
- Copy source: contenido de página pública, validado con `greenhouse-ux-writing`.
- Access impact: `none`.

### State inventory

- **Default (server-rendered):** un caso realista **ya calculado y en el HTML** — *Marketing Hub Pro, 5 seats,
  2.000 contactos*. 🔴 **Nunca vacío. Nunca en `0`.**
- Loading: 🎯 **ninguno.** El estimador es una función pura y el catálogo ya está en la página: **el recálculo es
  síncrono e instantáneo.** *(Si aparece un spinner, alguien metió un round-trip que no hacía falta.)*
- Empty: `n/a` (siempre hay un default).
- Error: **el catálogo no cargó** → 🔴 **el simulador no se monta y la página queda como TASK-1401.**
  **Degradación honesta: no se muestra un simulador roto.**
- Degraded / partial: **un dato es `notPublished`** → su línea dice *"HubSpot no publica este monto"*.
  **Un dato es `secondary`** → sale como rango, con nota.
- Permission denied: `n/a`.
- Long content: el desglose crece con los Hubs elegidos → la tabla scrollea **dentro de su contenedor**.
- Mobile / compact (390 px): controles apilados; **el desglose y el waiver siguen visibles sin scroll horizontal**.
- Keyboard / focus: **todos los controles son nativos** (`<select>`, `<input type=number>`, `<fieldset>`).
  🔴 **Nada de sliders custom con `div`.**
- Reduced motion: **el número cambia sin transición.** Sin pérdida de información.
- 🔴 **Sin JS:** el bloque del simulador **muestra su estado por defecto como una tabla estática**
  (server-rendered) — y el resto de la página está intacto. 🎯 **El crawler lee un ejemplo completo, con el
  waiver incluido. Gana citabilidad, no la pierde.**

### Interaction contract

- Primary interaction: **cambiar Hubs / tier / seats / contactos** → **el desglose se recalcula al instante**.
- Hover / focus / active: focus ring AA en todos los controles; hover de fila en el desglose.
- Pending / disabled: `n/a` — no hay async.
- Escape / click-away: `n/a` — no hay overlay.
- Focus restore: `n/a`.
- Latency feedback: 🎯 **ninguna, porque no hay latencia.** Cálculo local, síncrono.
- Toast / alert behavior: `n/a`.
- 🎯 **El momento clave:** al cruzar **2.000 → 2.001 contactos**, la línea de contactos **salta un escalón** y
  el total sube de golpe. **Ese salto es la trampa, demostrada.** *(Y es exactamente lo que la grilla de HubSpot
  no te deja ver.)*

### Motion & microinteracciones

- Motion primitive: `CSS`. **Cero librerías.**
- Enter / exit: el bloque entra con el reveal sobrio del hub (300 ms). **Nada más.**
- Layout morph: **ninguno.** 🔴 **El desglose reserva su altura**: cambiar de Hub **no debe empujar la página**.
- Stagger: **ninguno.**
- Timing / easing token: `--gh-hs-dur-fast: 150ms` · `--gh-hs-ease: cubic-bezier(0.2,0,0,1)` *(los del hub)*.
- Reduced-motion fallback: **los números cambian sin transición.**
- 🔴 **Non-goal motion (y acá hay una distinción fina que hay que entender bien):** el hub prohíbe **contadores**.
  Un número que **cambia porque el usuario movió un control** **NO es un contador**: es *state transition*, uno
  de los 7 jobs. **La diferencia es de dónde arranca:** un contador arranca en `0` al cargar *(y renderiza `00`
  sin JS)*; este número **arranca en su valor real, servido en el HTML**, y **transiciona** cuando el usuario
  actúa. 🔴 **Si alguien lo implementa como count-up desde 0 al entrar en viewport, rompió el contrato del hub.**
  Detalle: `docs/ui/motion/TASK-1406-hubspot-price-simulator-motion.md`.

### Implementation mapping

- Route / surface: bloque `#simulador` dentro de `/servicios/hubspot/precios/`, Ohio + CSS/JS page-scoped.
- Primitive / variant / kind: `one-off` (bloque de landing).
- Component candidates: `<fieldset>` con controles nativos + **`<table>` del desglose** + la banda del waiver.
- Copy source: contenido de página pública.
- Data reader / command: 🔴 **`estimateHubSpotCost()` de TASK-1405.** **CERO cálculo propio.**
- API parity: 🎯 **por reuso del primitive.** El mismo estimador lo consumen el portal, Nexa y MCP.
- Access / capability: `none`.
- States to implement: default server-rendered · recálculo · `notPublished` · `secondary` (rango) ·
  catálogo-no-carga (**no montar**) · sin-JS · reduced-motion · 390 px.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-hubspot-precios.*` *(se **extiende** el de TASK-1401)*
- Route: `/servicios/hubspot/precios/` · Viewports: **1440 + 390**
- Required steps: cargar → **capturar el estado por defecto** → cambiar a Marketing Pro + 5 seats →
  🎯 **cruzar 2.000 → 2.001 contactos y capturar el salto** → agregar un 2.º Hub Enterprise y
  🎯 **verificar que los créditos NO se suman** → capturar **la banda del waiver** → click CTA.
- Required captures: estado por defecto · **el salto de banda** · **los créditos con 2 Hubs** ·
  🎯 **el waiver (la línea en cero)** · **reduced-motion** · **390 px** · **sin-JS**.
- Required `data-capture` markers: `simulador` · `desglose` · **`waiver`** · `cta`.
- Assertions:
  - 🔴 **Sin JS:** el bloque muestra **su estado por defecto completo, con el waiver**, en el HTML servido.
  - 🔴 **Ningún número arranca en `0`** al cargar *(no hay count-up)*.
  - 🔴 **Los créditos con 2 Hubs Enterprise NO son la suma** *(assertion sobre el DOM: el valor es el `max`)*.
  - 🔴 **La línea de implementación NO tiene número** — dice *"te la cotizamos"*.
  - 🔴 **No existe ningún campo de email** en el bloque del simulador.
  - 🔴 **Un dato `notPublished` se muestra como texto**, nunca como `0` ni guion mudo.
  - `as-of` visible junto al resultado · CLS < 0,05 al recalcular *(el desglose reserva su altura)*.
- Scroll-width checks: sin scroll horizontal de página (1440 y 390).
- Reduced-motion / focus evidence: captura `prefers-reduced-motion` (números sin transición) + tabulación
  completa de los controles con ring visible.

### Design decision log

- Decision: 🎯 **el simulador es enhancement sobre la página estática, no la página.**
- Alternatives considered: *(a)* **reemplazar el contenido estático por el simulador** — es lo natural y
  **destruye el activo del hub** (los crawlers de IA no ejecutan JS: perderíamos la citación de *"cuánto cuesta
  HubSpot"*, que es la razón por la que la página existe). *(b)* **Gate de email para ver el resultado** —
  convertiría más y **reproduce exactamente el gate que la página denuncia** (*"agenda una demo para saber el
  precio"*). Descartado sin discusión. *(c)* **Endpoint de cálculo por request** — obliga a un round-trip por
  interacción, mete latencia y spinner, **y no aporta nada**: el estimador es puro y el catálogo es público.
  *(d)* **Cotizar la implementación con un rango** — un rango inventado es *"mentir con precisión"*, que es lo
  que la página denuncia. **Va sin número hasta que el cotizador real lo calcule (TASK-1407).**
- Why this pattern: **el waiver es el activo comercial #1 y en prosa no compite consigo mismo en pantalla.**
  Y el efecto secundario es el mejor argumento de la página: **nuestro número sale más alto que el de la grilla
  oficial, porque está completo.** 🎯 **Un vendedor que te da un número más alto que el del vendor no te está
  vendiendo: te está avisando.**
- Reuse / extend / new primitive: `one-off` en la UI, **`reuse` en la lógica** (el estimador de TASK-1405).
- Open risks: **alguien implementa un count-up** *(rompe el contrato del hub — assertion GVC lo caza)* ·
  **alguien mete la fórmula en el JS de la página** *(viola Full API Parity — review + el hecho de que el
  estimador ya existe)* · **el simulador canibaliza la lectura del contenido estático** *(mitigado: va DESPUÉS
  de las trampas, no antes — primero entiendes, después juegas)*.

### Visual verification

- GVC scenario: `public-servicios-hubspot-precios` (extendido) · Viewports 1440 + 390.
- Required captures / markers: ver *GVC scenario plan*.
- Scroll-width check: sin scroll horizontal.
- Accessibility/focus checks: **controles nativos** (`<select>`, `<input>`, `<fieldset>` con `<legend>`);
  el resultado se anuncia con `aria-live="polite"` *(para que un lector de pantalla sepa que el número cambió)*;
  focus ring AA.
- Before/after evidence: 🎯 **sí** — la página existe (TASK-1401) y el simulador la modifica.
- Known visual debt: ninguna declarada al crear la task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El bloque, server-rendered

- Render del **estado por defecto** (Marketing Pro · 5 seats · 2.000 contactos) **como tabla estática en el HTML**,
  llamando a `estimateHubSpotCost()` **en el server**.
- 🎯 **Al terminar este slice, la página ya es mejor — aunque el JS nunca cargue.**

### Slice 2 — La interactividad (enhancement)

- Controles nativos + recálculo local con **la misma función pura**.
- `aria-live="polite"` en el resultado.
- 🔴 **El desglose reserva su altura** (CLS 0).

### Slice 3 — Los tres momentos

- 🎯 **El waiver:** la línea del onboarding **se pone en cero** al activar *"con Efeonce"*.
- 🎯 **El salto de banda:** cruzar 2.000 → 2.001 contactos **sube el total de golpe**, con su nota.
- 🎯 **Los créditos:** agregar un 2.º Hub Enterprise **no duplica los créditos** — y **el simulador lo dice**.

### Slice 4 — Estados honestos + CTA

- `notPublished` → *"HubSpot no publica este monto — pídelo por escrito"*.
- `secondary` → rango + nota.
- Catálogo no carga → **no montar** (la página queda como TASK-1401).
- **La línea de implementación:** *"Te la cotizamos con tus números, sin costo"* → CTA a reunión.

### Slice 5 — GVC + cierre

- Extender el scenario de TASK-1401 con los 3 momentos + **assertion sin-JS** + **assertion anti-count-up** +
  **assertion de créditos `max`**.
- Before/after. Purge Kinsta. Landing registry.

## Out of Scope

- 🔴 **El número de nuestra implementación** → **TASK-1407** (la puerta anónima del cotizador).
- El pricebook (**TASK-1405**) · el contenido estático de la página (**TASK-1401**) · un simulador en el portal ·
  variante `en-US` · **PDF / envío por email del estimado** *(sería un lead magnet, y esta página no captura con
  gate — si se quiere, es otra decisión)*.

## Detailed Spec

### El layout del bloque

```
┌────────────────────────────────────────────────────────────────┐
│  ¿Cuánto te saldría a ti?                    verificado {asOf} │
│                                                                 │
│  Hubs   [✓ Marketing] [ Sales] [ Service] [ Content] …          │
│  Tier   ( ) Starter  (•) Pro  ( ) Enterprise                    │
│  Seats  [ 5 ] de pago   ·   [ 12 ] view-only  → "no se cobran"  │
│  Contactos de marketing  [ 2.000 ]                              │
│                                                                 │
│  ────────────────────────────────────────────────────────────   │
│  Licencia Marketing Hub Pro (anual)              USD  9.600     │
│  Seats de pago (5)                               incluidos      │
│  Seats view-only (12)                            USD      0  ✓  │
│  Contactos (banda 2.000)                         incluidos      │
│  Créditos incluidos                              {max}/mes  ⓘ   │
│  Onboarding obligatorio de HubSpot               USD  3.000     │
│  ────────────────────────────────────────────────────────────   │
│  Año 1 comprando directo                         USD 12.600     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Con Efeonce (partner certificado)                        │  │
│  │  Onboarding                          USD 0   ← 31% menos  │  │
│  │  Año 1                               USD 9.600            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Implementación:  te la cotizamos con tus números, sin costo.   │
│                   [ Agenda una reunión ]                        │
└────────────────────────────────────────────────────────────────┘
```

### Dónde va en la página

🔴 **Después de las trampas (R6 créditos + R7 onboarding), antes del waiver en prosa (R8) — o fusionado con él.**
🎯 **El orden importa: primero entiendes por qué el número es así, después juegas con él.**
Un simulador arriba del fold sería un juguete; **abajo de las trampas, es una demostración.**

### Contrato con TASK-1405

```ts
import { estimateHubSpotCost, getHubSpotPricebook } from '@/lib/growth/hubspot-pricing'
// server: render del default   ·   client: recálculo con el mismo estimador
```

🔴 **Si en el JS de la página aparece una multiplicación de precios, la task está mal hecha.**

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

🔴 **TASK-1405 bloquea todo.** Sin pricebook no hay simulador.
Slice 1 (server-rendered) → 2 (interactividad) → 3 (los 3 momentos) → 4 (estados honestos) → 5 (GVC).
🎯 **Slice 1 es entregable por sí solo:** la página mejora aunque el JS nunca cargue.

### Risk matrix

| Riesgo | Prob. | Mitigación | Señal |
|---|---|---|---|
| 🔴 **Se implementa como count-up desde 0** | **media** | Regla dura 2 + **assertion GVC anti-count-up** | Sin JS el número es `0` → **se pierde la citación** |
| 🔴 **El simulador reemplaza el contenido estático** | **media** | Regla dura 1 + assertion sin-JS | El `fetch` sin JS no ve las trampas |
| 🔴 **La fórmula se escribe en el JS de la página** | media | Regla dura 3 + el estimador ya existe | Review / duplicación |
| 🔴 **Los créditos se suman** | media | **Lo previene TASK-1405** (invariante `max`) + assertion GVC | Reproduciríamos la trampa que denunciamos |
| **Alguien agrega un gate de email** | baja | Regla dura 8 + assertion (**no existe `<input type=email>` en el bloque**) | Review |
| El simulador canibaliza la lectura | baja | Va **después** de las trampas | GA4 scroll depth |

### Rollback plan per slice

| Slice | Rollback | Tiempo |
|---|---|---|
| 1-4 | `HUBSPOT_PRICEBOOK_ENABLED=false` → el catálogo no carga → **el simulador no monta** y la página queda como TASK-1401 | **<5 min** |
| 5 | Restaurar la WP revision previa + purge Kinsta | <10 min |

🎯 **El rollback es de una línea, y la página sigue siendo buena sin el simulador. Eso es lo que significa que el
simulador sea enhancement.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] 🔴 **Sin JS, la página es TASK-1401 completa** + **el estado por defecto del simulador como tabla estática
      con el waiver incluido** *(el crawler lee un ejemplo entero)*.
- [ ] 🔴 **Ningún número arranca en `0`.** No hay count-up. *(Assertion GVC.)*
- [ ] 🔴 **Cero cálculo propio:** el bloque llama a `estimateHubSpotCost()` de TASK-1405.
- [ ] 🎯 **El waiver se ve:** activar *"con Efeonce"* pone la línea del onboarding **en cero**, con su porcentaje.
- [ ] 🎯 **El salto de banda se ve:** cruzar 2.000 → 2.001 contactos **sube el total de golpe**, con nota.
- [ ] 🎯 **Los créditos NO se suman** con 2 Hubs Enterprise — **y el simulador lo dice**.
- [ ] 🔴 **La línea de implementación no tiene número** (*"te la cotizamos con tus números"*).
- [ ] 🔴 **No existe ningún campo de email** en el bloque.
- [ ] 🔴 **`notPublished` se muestra como texto**, nunca como `0`. **`secondary` sale como rango.**
- [ ] **`as-of` visible** junto al resultado.
- [ ] **CLS < 0,05** al recalcular (el desglose **reserva su altura**).
- [ ] **Controles nativos**, `aria-live="polite"` en el resultado, focus ring AA, sin scroll horizontal.
- [ ] Si el catálogo no carga → **el simulador no monta** y la página sigue perfecta.
- [ ] GVC 1440 + 390 + reduced-motion + **before/after**, capturado **y mirado**.
- [ ] `UI ready: yes` solo si `pnpm task:lint --task TASK-1406` queda sin findings.

## Verification

`pnpm task:lint --task TASK-1406` · `pnpm ops:lint --changed` ·
`pnpm ui:wireframe-check|flow-check|motion-check --task TASK-1406` ·
Playwright/GVC live (1440 + 390; **assertion sin-JS**; **assertion anti-count-up**; **assertion créditos `max`**;
**assertion sin campo de email**) · CWV.

## Closing Protocol

- [ ] `Lifecycle` sincronizado · `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-1401 · TASK-1405 · TASK-1407)
- [ ] Landing registry + landing file actualizados

## Follow-ups

- 🔴 **TASK-1407** — la puerta anónima del cotizador: **la línea "implementación" pasa de *"te la cotizamos"* a
  un número real**, calculado por el engine cost-plus con audiencia `public`. **Sin rediseñar nada.**
- **Compartir el estimado** (short link / PDF) — 🎯 **ojo:** eso lo convierte en lead magnet y abre la puerta al
  gate de email. **Si se hace, el estimado se comparte SIN pedir nada** — o no se hace.
- Simulador equivalente en el portal (para un member cotizando un deal de HubSpot) — **reusa el estimador, no la UI**.

## Open Questions

- ¿El default server-rendered es **Marketing Pro / 5 seats / 2.000 contactos**? *(Recomendado: sí — es el caso
  más común del ICP **y es exactamente el que hace visible el waiver de USD 3.000 = 31%**.)*
- ¿El simulador **fusiona** las regiones R6-R8 de TASK-1401 (créditos + onboarding + waiver) o va **debajo** de
  ellas? *(Recomendado: **debajo**, y que las tres regiones estáticas queden intactas. **La citabilidad no se
  negocia por elegancia de layout.**)*
