# TASK-1401 — Cluster `/servicios/hubspot/precios/`: **"Cuánto cuesta HubSpot de verdad"**

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
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1401-landing-hubspot-precios.md`
- Flow: `docs/ui/flows/TASK-1401-landing-hubspot-precios-flow.md`
- Motion: `docs/ui/motion/TASK-1401-landing-hubspot-precios-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `task/TASK-1401-landing-hubspot-precios`

> **Cluster 1 de 4** del hub HubSpot. Pillar: **TASK-1352** (`/servicios/hubspot/`).
> **Arquitectura:** [PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) ·
> **SSOT de contenido:** [`HUBSPOT_HUB_LANDINGS_SPEC.md`](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 2 ·
> **Dominio:** skill `hubspot-solutions-partner` (`SOURCES.md` = qué se puede afirmar).

## Summary

Construye la página **`/servicios/hubspot/precios/`**: la respuesta honesta a *"¿cuánto cuesta HubSpot?"*.
Es **la única página del hub con demanda de búsqueda real** (~**1.500 búsquedas/mes** en el bloque hispano:
`precio hubspot` 720 · `hubspot pricing` 590 · `hubspot precio` 170, base MX) — así que **carga el peso SEO/AEO
del hub entero** y es la puerta por la que entra el tráfico frío.

**Explica, no cotiza.** No es un cotizador self-serve: es la página que te dice **dónde está la plata que
nadie te muestra** — los seats que sí y los que no, los saltos escalonados de contactos, **las dos trampas de
los HubSpot Credits** (no se suman entre Hubs; no hay rollover) y **el onboarding obligatorio que aparece en la
primera factura**. Y cierra con el activo comercial más fuerte de Efeonce: **el waiver** — ese cargo
**desaparece del contrato** si el onboarding lo entrega un partner certificado.

## Why This Task Exists

**1. Es la única demanda real, y hoy la estamos regalando.** Todo el resto del hub se justifica por citabilidad
en LLMs y por canal (co-sell, directorio, outbound). **Esta se justifica sola: hay gente buscando el número
ahora mismo** y aterrizando en hubspot.com/pricing — donde HubSpot, obviamente, no les va a contar las trampas.

**2. HubSpot no puede escribir esta página, y ahí está la ventaja.** No van a publicar que **cuatro Hubs
Enterprise dan 5.000 créditos, no 20.000**, ni que un Pro que pasa de 2.000 a **2.001 contactos salta +USD 250
al mes**, ni que el onboarding es **obligatorio y no lo cotiza casi nadie**. Nosotros sí. **La única página
honesta de precios de HubSpot en español se lleva la citación entera.**

**3. Es el vehículo natural del waiver.** El waiver (USD 3.000 sobre USD 9.600 = **31% del año 1** en Marketing
Hub Pro) es una oferta que solo tiene sentido **después** de que el comprador entendió que el cargo existe.
Meterlo en el pillar es explicarlo en el vacío. **Acá aterriza solo.**

## Goal

- Ser **la respuesta** a *"cuánto cuesta HubSpot de verdad"* — completa, honesta y **citable por LLMs**.
- Convertir el entendimiento en conversación: **"te lo cotizamos sin costo"** → reunión.
- 🔴 **Que el número no dependa de JavaScript.** Toda cifra citable, en el HTML servido.
- **Traer a Efeonce el tráfico frío del hub** y repartirlo al pillar y a los otros clusters.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

**Normativos:**

- 🔴 **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 2** — qué dice y qué **no** dice esta página.
- 🔴 **[PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md)** — la arquitectura
  pillar+cluster y **la regla que decide qué páginas existen**.
- **[PDR-006](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)** — la postura
  (*evidencia antes que promesa*) que esta página hereda.
- **Skill `hubspot-solutions-partner`** — el dominio. Cargar: **`SOURCES.md`** (§ *Datos que NO se citan* + todo
  precio con su `as-of`), **`modules/01_PRODUCTO_2026.md`** (Hubs, seats, créditos, **las dos trampas de
  cotización**), **`modules/11_PROPUESTA_PRICING.md` § 2** (**el waiver** y el arbitraje del onboarding fee).
- **Skill `seo-aeo`** — esta es la página SEO del hub: es la dueña del método (answer capsules, schema, citabilidad).

## Normative Docs

- `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md` § 2 — **el contenido de esta página, verbatim.**
- `.claude/skills/hubspot-solutions-partner/SOURCES.md` — **qué se puede afirmar y con qué marca.**
- `.claude/skills/hubspot-solutions-partner/modules/01_PRODUCTO_2026.md` — seats, créditos, **las dos trampas**.
- `.claude/skills/hubspot-solutions-partner/modules/11_PROPUESTA_PRICING.md` § 2 — **el waiver.**
- `docs/context/05_voz-tono-estilo.md` — voz y registro.
- `.claude/skills/efeonce-public-site-wordpress/references/landing-workflow.md` — build Ohio + snapshot + rollback.

## 🔴 Reglas duras

**Contenido**

1. 🔴 **Explica, no cotiza.** **NO** se construye un cotizador self-serve ni una calculadora interactiva que
   escupa un precio final. El precio real depende de descuentos, term y bundle: una calculadora **miente con
   precisión** y quema la credibilidad que la página existe para construir. *(La calculadora de TCO sí existe —
   pero es un artefacto de venta 1:1, no una feature pública. Ver Follow-ups.)*
2. 🔴 **Todo precio se reverifica el día de publicación** (WebSearch a fuente primaria) y **lleva su `as-of`
   visible en la página**. Un precio stale en una página de precios **es peor que no tener la página**.
3. 🔴 **Marcado de evidencia obligatorio** (protocolo de la skill): ✅ verificado en fuente primaria ·
   ⚠️ secundario → se cita **como orden de magnitud, nunca como precio exacto** · ❌ no publicado → **se dice
   "HubSpot no lo publica"**, que *es* el argumento. **NUNCA se inventa un número.**
   🔴 **El fee de onboarding del bundle Customer Platform NO está publicado** → se declara como tal.
   🔴 **Los contactos de marketing adicionales:** las fuentes públicas **discrepan 10×** → **no se cotiza de
   memoria**; se explica el **mecanismo** (saltos escalonados) sin inventar el monto del tramo.
4. 🔴 **Claims prohibidos** (heredados del hub): *"Líder en CRM según Gartner"* · Forrester Wave · **ISO 27001**
   de HubSpot · residencia de datos en LATAM · *"flota de agentes"*.
5. 🔴 **Nomenclatura 2026:** **Revenue Hub** (ex-Commerce) · **Data Hub** (ex-Operations) · **UNBOUND**.
   **HubSpot ya no se llama CRM:** *Agentic Customer Platform*.
6. 🔴 **La página dice cuándo el modelo de precio NO te sirve** (regla del hub): base B2C de millones de
   contactos → **Adobe o Salesforce salen más baratos a escala. Se dice.**
7. 🔴 **El waiver se presenta como número, no como adjetivo.** *"USD 3.000 sobre USD 9.600 = 31% del año 1"*,
   **no** *"ahorros importantes"*. Y con la distinción honesta: **el de HubSpot es coaching; el nuestro es
   implementación.**
8. 🔴 **Toda cifra citable va en el HTML servido.** **Cero contadores JS.** Los crawlers de IA no ejecutan
   JavaScript — y esta es *la* página que queremos que citen.

**Build**

- Ohio nativo bajo el parent `/servicios/` (ID `251077`), CSS page-scoped. Mutación vía `Document::save()`
  (**nunca** `_elementor_data` directo). Snapshot + Kinsta purge + rollback documentado.
- **Full API Parity por reuso:** es **cliente**. **NO** reconstruye form ni agendador.
- **es-LATAM neutro**, tuteo, sin voseo ni chilenismos. `hreflang`-ready.
- **Hereda el motion contract del pillar** (TASK-1352): misma escala, mismo easing, mismo `reduced-motion`.

## Dependencies & Impact

### Depends on

- El parent `/servicios/` (existe, WordPress ID `251077`).
- `<greenhouse-form>` renderer (TASK-1320/1327) + HubSpot Meetings link + UTM `[verificar]`.
- 🔴 **CORS/surface-allowlist del form para `/servicios/*`** — **TASK-1335 ya cubrió `/servicios/*`** →
  probablemente OK; **verificar en Slice 1**.
- 🔴 **Reverificación de TODOS los precios en fuente primaria** (Slice 1, bloqueante).

**NO depende de TASK-1352:** puede construirse **en paralelo**. Si el pillar aún no migró, esta página **vive
igual** y enlaza a `/servicios-contratar-hubspot/` hasta el 301.

### Blocks / Impacts

- **Trae el tráfico frío del hub** (~1.500 búsquedas/mes) y lo reparte al pillar y a los clusters.
- **Aterriza el waiver** — el activo comercial #1 de la práctica.
- Alimenta a `/cuando-no-usar-hubspot/` (el tramo B2C) y a `/agentes/` (consumo de créditos).

### Files owned

- Esta task · `docs/ui/wireframes/TASK-1401-*` · `docs/ui/flows/TASK-1401-*` · `docs/ui/motion/TASK-1401-*`.
- La página WordPress nueva (`/servicios/hubspot/precios/`) · su scenario GVC · su fila en el landing registry
  + `references/landings/` de la skill del sitio público.

## Current Repo State

### Already exists

- El parent `/servicios/` (ID `251077`) con **`/servicios/posicionamiento-seo` como patrón de build probado**
  (TASK-1343: Ohio + Elementor + `<greenhouse-form>` embebido + Yoast/schema live).
- Growth Forms renderer + patrón de embed (`efeonce-seo-diagnostic` como referencia directa).
- La skill `hubspot-solutions-partner` con **todos los precios y sus marcas de evidencia** (✅/⚠️/❌).
- Data Semrush pan-hispana que sostiene el volumen (~1.500/mes).

### Gap

- La página no existe · el copy entero sin draftear.
- 🎯 **La sección de créditos (la región firma) sin construir.**
- JSON-LD sin definir · la **reverificación de precios sin correr** (bloqueante).

## Modular Placement Contract

- Topology impact: `public`
- Current home: sitio público WordPress/Ohio en Kinsta; página nueva bajo el parent `/servicios/` (id 251077).
- Future candidate home: `public`
- Boundary: la landing es consumer del renderer público de Growth Forms y del agendador HubSpot Meetings; no define primitives ni contratos propios.
- Server/browser split: `n/a` — sitio público sin Client Components de portal; cero secretos, cero SDK, cero DB. El único JS es CSS-adyacente y no es requisito para leer la página.
- Build impact: `none`
- Extraction blocker: `none`

*(Si el sitio público migrara a Astro/headless — fuera de alcance hoy — esta página viaja como **contenido**:
**no hay lógica que extraer**.)*

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: **CFO / RevOps / CMO que evalúa HubSpot y quiere el número antes de hablar con un vendedor.**
  Tráfico **frío** desde Google. No nos conoce y no le importamos.
- Momento del flujo: googleó *"cuánto cuesta HubSpot"*, cayó en `hubspot.com/pricing`, vio una grilla y **salió
  con más dudas que respuestas**.
- Resultado perceptible esperado: **puede armar el número él mismo** — o al menos entender de qué depende —
  **sin pedirle permiso a nadie**.
- Fricción que debe reducir: el *"tengo que agendar una demo para saber el precio"* + **el miedo a la factura
  sorpresa** (que es justo lo que produce el onboarding obligatorio).
- No-goals UX: **no cotiza** · no es un configurador · no vende un Hub · **cero gates de email**.

### Surface & system decision

- Surface: `efeoncepro.com/servicios/hubspot/precios/` (WordPress/Ohio, marketing lane).
- Composition Shell: `no aplica` — es sitio público, no portal.
- Primitive decision: `reuse` — patrones marketing `modern-ui` (editorial header · `<table>` semántica ·
  card-on-section) + `<greenhouse-form>` embebido. **Cero primitives nuevas.**
- Adaptive density / The Seam: `no aplica` (sitio público).
- Floating/Sidecar/Dialog decision: **ninguno.** No hay modal, drawer ni popover.
- Copy source: **contenido de página pública** (NO `src/lib/copy`), validado con `greenhouse-ux-writing` +
  `copywriting`.
- Access impact: `none` — página pública, sin auth.

### State inventory

- Default: todo visible. 🔴 **Sin JS también** — es el estado principal (el crawler es un usuario).
- Loading: `n/a` (contenido estático servido).
- Empty: `n/a`.
- Error: el form falla → **Error Card del renderer** (owned por TASK-1320).
- Degraded / partial: 🔴 **el form no monta** (CORS / JS off) → **fallback link visible** (Meetings / mailto con
  UTM). **El CTA nunca muere.**
- Permission denied: `n/a`.
- Long content: tablas largas → **scroll interno del contenedor**, nunca de página.
- Mobile / compact (390 px): tablas con `overflow-x:auto` + `tabindex=0`; **la página no scrollea en horizontal**.
- Keyboard / focus: el wrapper scrolleable de la tabla es alcanzable por teclado (si no, en móvil no se puede
  scrollear la tabla con teclado).
- Reduced motion: **todo visible y estático**, sin pérdida de contenido ni de cifras.
- 🔴 **`as-of` viejo (>90 días):** el copy cambia a *"confírmalos con nosotros antes de decidir"*.
  **La página envejece diciéndolo, no en silencio.**

### Interaction contract

- Primary interaction: **leer.** Cero interacciones requeridas.
- Hover / focus / active: hover de fila (ayuda de lectura en tablas) · CTA con micro-lift + focus ring.
- Pending / disabled: solo en el form (owned por el renderer).
- Escape / click-away: `n/a` (sin overlays).
- Focus restore: al volver de Meetings (pestaña nueva) el navegador restaura solo.
- Latency feedback: `n/a`.
- Toast / alert behavior: `n/a` — el feedback del submit lo maneja el renderer.

### Motion & microinteracciones

- Motion primitive: `CSS` + IntersectionObserver. 🔴 **Cero librerías.** **Hereda el contract del pillar.**
- Enter / exit: fade + rise sobrio por región (300 ms). Hero 400 ms.
- Layout morph: **ninguno.**
- Stagger: hero (60 ms). **Las regiones no staggerean entre sí.**
- Timing / easing token: `--gh-hs-dur-fast: 150ms` · `--gh-hs-dur-base: 300ms` ·
  `--gh-hs-ease: cubic-bezier(0.2,0,0,1)` — **los mismos nombres y valores que el pillar** (coherencia del hub).
- Reduced-motion fallback: **todo visible y estático.**
- 🔴 **Non-goal motion (regla dura):** **ninguna cifra se anima. Cero contadores.** Un contador renderiza `00`
  sin JS **y los crawlers de IA no ejecutan JavaScript** — es el activo de la página. Detalle:
  `docs/ui/motion/TASK-1401-landing-hubspot-precios-motion.md`.

### Implementation mapping

- Route / surface: página WordPress nueva bajo `/servicios/` (`251077`), Ohio nativo (`template default`).
- Primitive / variant / kind: `reuse` — sin primitives nuevas.
- Component candidates: secciones Ohio + CSS page-scoped + `<table>` semántica + `<details>` + `<greenhouse-form>`.
- Copy source: contenido de página (público). **NO** `src/lib/copy`.
- Data reader / command: 🔴 **NINGUNO.** Los precios son **contenido editorial verificado con su `as-of`**,
  **no vienen de una API** *(un endpoint de precios prometería una frescura que no podemos cumplir: la fuente es
  hubspot.com, no un feed)*.
- API parity: **por reuso.** La landing es cliente de `<greenhouse-form>` + Meetings. **No se reconstruye nada.**
- Access / capability: `none` (pública).
- States to implement: default · sin-JS · reduced-motion · form-no-monta (fallback) · `as-of` viejo · 390 px.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-hubspot-precios.*`
- Route: `/servicios/hubspot/precios/`
- Viewports: **1440 + 390**
- Required steps: cargar → scroll por regiones → click *"Ver dónde está la plata"* (**verificar scroll + focus a
  R6**) → capturar la tabla de créditos → abrir 2 FAQs → click CTA → verificar form / fallback.
- Required captures: full-page (desktop + mobile) · 🎯 **la tabla de créditos (R6)** · FAQ abierto · form montado
  · **reduced-motion** · **tabla en 390 px con scroll interno**.
- Required `data-capture` markers: `hero` · `tldr` · **`creditos`** · `onboarding` · `waiver` · `limite` · `cta`.
- Assertions:
  - 🔴 **Sin JS:** `fetch` sin JavaScript → **todas las cifras** + tabla de créditos + waiver + `as-of` en el HTML.
  - 🔴 **Cero contadores animados** (ningún elemento numérico arranca en `0`/`00`).
  - 🔴 **Sin claims prohibidos** en el DOM: `ISO 27001` · `Forrester` · `Líder en CRM` · `Commerce Hub` ·
    `Operations Hub` · `INBOUND`.
  - 🔴 **Ningún `href` interno a una página inexistente.** Enlace al pillar presente.
  - Tablas `<table>` con `<th scope>` · un solo `<h1>` · breadcrumb · canonical.
- Scroll-width checks: **sin scroll horizontal de página** en 1440 ni 390 (las tablas scrollean **dentro** de su
  contenedor).
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion` + tabulación completa con ring visible
  (incluido el **wrapper scrolleable de la tabla**).

### Design decision log

- Decision: **la página explica, no cotiza.**
- Alternatives considered: *(a)* **cotizador self-serve** — convierte más en el corto plazo, **pero miente con
  precisión** (el precio real depende de descuentos, term y bundle) y **quema la credibilidad que la página
  existe para construir**: es exactamente el problema que la página denuncia. *(b)* **Gate de email para "ver
  los precios completos"** — **es el pecado que la página denuncia**, descartado. *(c)* **Tabla de créditos como
  widget interactivo** — se ve mejor y **destruye el activo por el que la página existe** (la citabilidad).
- Why this pattern: la **región firma es la tabla de créditos**, porque es **un dato verificable y
  probablemente exclusivo en el mercado hispano** — y **un dato verificable y exclusivo vale más que cualquier
  hero**. Y **el waiver va después de haber regalado todo**: si apareciera arriba sería *un descuento*; después
  de siete regiones de información gratis, **es una consecuencia**. **La estructura es el argumento.**
- Reuse / extend / new primitive: `reuse`. Cero primitives nuevas, cero backend.
- Open risks: 🔴 **precio stale** (mitigado con `as-of` visible + reverificación el día de publicación +
  recordatorio trimestral) · **HubSpot cambia precios** (es cuestión de tiempo: los ⚠️ salen como orden de
  magnitud) · **el lector espera un número final** (mitigado con copy explícito).

### Visual verification

- GVC scenario: `public-servicios-hubspot-precios`
- Viewports: 1440 + 390
- Required captures: ver *GVC scenario plan*.
- Required `data-capture` markers: ver arriba.
- Scroll-width check: **página sin scroll horizontal**; tablas con scroll interno.
- Accessibility/focus checks: focus ring AA en CTAs, `<summary>`, enlaces, campos y **wrapper de tabla**;
  tablas semánticas; contraste AA.
- Before/after evidence: `n/a` (página nueva — no hay "before").
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

### Slice 1 — 🔴 Reverificación de precios (bloquea todo lo demás)

**Esta página es una página de precios. Si los números están mal, no hay página.**

- Reverificar contra **fuente primaria** (hubspot.com/pricing + legal/knowledge) y anotar `as-of` de cada uno:
  precios de Hub por tier · **seats** (core / sales / service / **revenue** / 🎯 **view-only gratis**) ·
  el mecanismo de **contactos de marketing** · **HubSpot Credits** (asignación por tier · **no se suman entre
  Hubs** · **no hay rollover**) · consumo por agente (Customer ≈ USD 0,50/conversación resuelta ·
  Prospecting ≈ USD 1/lead) · **onboarding fees** (Marketing Pro 3.000 / Ent 7.000 · Sales/Service 1.500 / 3.500) ·
  el tramo B2C (Ent a 500K+ = USD 60 por cada 10.000; envío capado a 20×).
- **Marcar cada uno ✅ / ⚠️ / ❌.** Los ⚠️ salen como **orden de magnitud**; los ❌ salen como *"HubSpot no lo publica"*.
- Confirmar Meetings + UTM · CORS del form para `/servicios/*`.

### Slice 2 — Copy final (`greenhouse-ux-writing` + `copywriting`)

- Copy ledger completo (ver wireframe), es-LATAM neutro, sujeto a las 8 reglas duras.
- 🎯 **Cada H2 lleva su answer capsule (40-60 palabras)** — es lo que el LLM extrae y cita.

### Slice 3 — Build

- Página nueva bajo `/servicios/` en Ohio nativo vía `Document::save()`.
- 🎯 **La sección firma: "Los HubSpot Credits y sus dos trampas"** — tabla comparativa
  **"lo que crees que compras" vs "lo que compras"** (20.000 vs 5.000 créditos), en **texto servido**.
- Sección **onboarding + waiver** con la cifra y el `as-of`.
- Sección **"cuándo el modelo de precio NO te sirve"**.
- **Progressive enhancement:** sin JS, **toda la página se lee completa**.

### Slice 4 — SEO/AEO + form + schema

- `<title>` / meta / H1 sobre la query real (*"cuánto cuesta HubSpot"*), no sobre el producto.
- JSON-LD: **`FAQPage`** (las preguntas de precio son literalmente las que se buscan) + `Service` +
  `BreadcrumbList` (pillar → cluster) + `Organization`.
- Internal links: **al pillar (obligatorio)** · a `/cuando-no-usar-hubspot/` (el tramo B2C) · a `/agentes/`
  (el costo por outcome) · a `/hubspot-vs-salesforce/` (el TCO). 🔴 **Los que no existan aún, no se pintan.**
- Form de diagnóstico/cotización (reuso) + fallback link.

### Slice 5 — Verificación visual + registro

- Scenario GVC + capturas 1440 / 390 / reduced-motion.
- 🔴 **Assertions:** sin-JS (todas las cifras presentes) · **sin contadores animados** · sin claims prohibidos ·
  **`as-of` visible** · sin scroll horizontal.
- Landing registry + landing file + route-ownership matrix. CWV. Purge Kinsta.

## Out of Scope

- **Un cotizador self-serve / calculadora pública de precio** (regla dura 1).
- El cutover de HubSpot delivery del form · la variante `en-US` · el pillar de categoría CRM en Think ·
  **la calculadora de TCO 1:1** (es un artefacto de venta de la skill, `templates/tco-3y.md`, no una feature web).

## Detailed Spec

### Las 13 regiones

Detalle completo en **`docs/ui/wireframes/TASK-1401-landing-hubspot-precios.md`** (layout skeleton + copy ledger
+ state copy + accessibility contract). Resumen del arco:

`hero` → **TL;DR (answer capsule maestra, arriba del fold)** → cómo se cobra → seats (**view-only gratis**) →
saltos de contactos → 🎯 **LOS CRÉDITOS Y SUS DOS TRAMPAS (firma)** → **el onboarding obligatorio** →
🎯 **el waiver** → **cuándo el modelo NO te sirve** → qué preguntamos para cotizar → FAQ → puente al hub → CTA.

### El dato que sostiene la página (la tabla de R6)

| Lo que crees que compras | Lo que compras |
|---|---|
| 4 Hubs Enterprise = **20.000 créditos** ❌ | **5.000 créditos** ✅ — *manda el tier más alto, no la suma* |
| Lo que no uses, se acumula ❌ | **No hay rollover.** Se pierde ✅ |

**Consumo real:** Customer Agent ≈ **USD 0,50 / conversación resuelta** · Prospecting ≈ **USD 1 / lead**.
🔴 **Toda esta tabla va en `<table>` semántica, en el HTML servido.** Es el dato más citable del hub.

### Contrato de datos (el que NO existe)

🔴 **Cero reader, cero command, cero endpoint, cero tabla.** Los precios son **contenido editorial verificado**
con su `as-of` y su marca de evidencia (✅ primaria / ⚠️ secundaria = orden de magnitud / ❌ no publicado = *"HubSpot
no lo publica"*). **Nunca un número inventado para tapar un ❌.**

### Structured data

- `FAQPage` — 🎯 **las preguntas de precio son literalmente las que se buscan**, así que el FAQ **es** el schema.
- `Service` + `BreadcrumbList` (pillar → cluster) + `Organization`.

### Enlaces internos (y su fallback)

Pillar **(obligatorio)** · `/cuando-no-usar-hubspot/` (desde el tramo B2C) · `/agentes/` (desde el consumo de
créditos) · `/hubspot-vs-salesforce/` (desde el TCO).
🔴 **El cluster que todavía no exista, no se pinta.** Nada de *"próximamente"*: **nunca un 404 interno.**

## Rollout Plan & Risk Matrix

Página nueva (no muta una `publish` existente) → **riesgo bajo**. El riesgo real **no es técnico: es de exactitud.**

### Slice ordering hard rule

**Slice 1 (reverificación) bloquea a Slice 2.** 🔴 **NO se escribe una línea de copy con un precio sin verificar.**
Luego 3 (build) → 4 (SEO + form + schema) → 5 (GVC + registro).

### Risk matrix

| Riesgo | Prob. | Mitigación | Señal |
|---|---|---|---|
| 🔴 **Un precio stale o inventado** | **alta** | Slice 1 bloqueante + marcas ✅/⚠️/❌ + `as-of` visible + reverificación el día de publicación | Un cliente nos corrige con la página de HubSpot |
| **HubSpot cambia precios y la página envejece** | **alta** *(es cuestión de tiempo)* | `as-of` visible + **recordatorio trimestral en el landing file** + los ⚠️ salen como orden de magnitud | Drift vs hubspot.com |
| La página **se lee como un cotizador** y el lector espera un número final | media | Regla dura 1 + copy explícito (*"esto explica el modelo; el número exacto sale de tu caso"*) | Confusión en el form |
| **Contador JS** mata la citabilidad | media | Motion contract: **cero contadores** + assertion GVC sin-JS | `fetch` sin JS no ve la cifra |
| Canibaliza al pillar (todo el tráfico se queda acá) | baja | Es **deseable**: el tráfico entra por acá y **reparte**. Enlace al pillar obligatorio | GA4 |

### Rollback

| Slice | Rollback | Tiempo |
|---|---|---|
| 1-2 | N/A (verificación / copy en borrador) | — |
| 3 | Despublicar la página (`draft`) + purge Kinsta | <5 min |
| 4 | Quitar JSON-LD / despublicar form surface | <10 min |
| 5 | Revertir registry / landing file / matrix | <5 min |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/servicios/hubspot/precios/` responde **200**, bajo el parent `/servicios/`, con breadcrumb al pillar.
- [ ] El `<h1>` es **la pregunta del comprador** (*"Cuánto cuesta HubSpot de verdad"*), no el nombre del producto.
- [ ] 🔴 **Cada precio está verificado en fuente primaria**, lleva su marca (✅/⚠️/❌) y la página muestra su
      **`as-of`**. **Ningún número inventado.** Lo no publicado se declara como *"HubSpot no lo publica"*.
- [ ] 🎯 **Existe la sección de los HubSpot Credits con sus dos trampas** (no se suman entre Hubs · no hay
      rollover) y la comparación **20.000 vs 5.000** es explícita.
- [ ] **Existe la sección de onboarding obligatorio** y **el waiver con su cifra** (USD 3.000 ≈ 31% del año 1),
      con la distinción **coaching (HubSpot) vs implementación (nosotros)**.
- [ ] **Existe la sección "cuándo el modelo de precio NO te sirve"** (B2C masivo → Adobe/Salesforce más baratos).
- [ ] 🔴 **NO hay cotizador self-serve ni calculadora de precio pública.**
- [ ] 🔴 **Citabilidad sin JS:** un `fetch` sin JavaScript devuelve **todas las cifras** y **todas las answer
      capsules**. **Cero contadores animados.**
- [ ] 🔴 **Ningún claim prohibido en el DOM** (assertion GVC): `ISO 27001` · `Forrester` · `Líder en CRM` ·
      `Commerce Hub` · `Operations Hub` · `INBOUND`.
- [ ] Cada H2 tiene answer capsule (40-60 palabras). JSON-LD `FAQPage` + `Service` + `BreadcrumbList` válido
      (Rich Results Test).
- [ ] **Enlaza al pillar** y a los clusters que existan. **Ningún link a una página que no existe.**
- [ ] CTA dual con **fallback honesto**. **NO** se reconstruyó form ni agendador.
- [ ] Copy es-LATAM neutro, sin voseo, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 + reduced-motion capturado **y mirado**. Sin scroll horizontal.
- [ ] `UI ready: yes` solo si `pnpm task:lint --task TASK-1401` queda sin findings.
- [ ] Landing registry + landing file + route-ownership matrix actualizados.

## Verification

`pnpm task:lint --task TASK-1401` · `pnpm ops:lint --changed` ·
`pnpm ui:wireframe-check|flow-check|motion-check --task TASK-1401` ·
Playwright/GVC live (1440 + 390; **assertion sin-JS con todas las cifras**; **assertion de claims prohibidos**) ·
Rich Results Test · HTTP 200 + canonical + breadcrumb.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con la carpeta · `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-1352 pillar · TASK-1402/1403/1404 · PDR-007/EPIC-024)
- [ ] Página registrada en route-ownership matrix + landing registry + landing file
- [ ] 🔴 **Recordatorio de reverificación trimestral de precios** anotado en el landing file

## Follow-ups

- **Calculadora de TCO 1:1** (`hubspot-solutions-partner/templates/tco-3y.md`) — artefacto de venta, **no** feature
  pública. Si algún día se publica, es **otra** decisión (PDR).
- Variante `en-US` · cutover de HubSpot delivery del form.
- Medir: si esta página trae el tráfico esperado, **es el argumento para el pillar de categoría CRM en Think**.

## Open Questions

- ¿Se muestra el precio en **USD** o se localiza por país? *(Recomendado: **USD**, que es como HubSpot factura —
  y decirlo explícitamente. Localizar invita a un error de FX que nos hace quedar mal.)*
- ¿El `as-of` va **una vez arriba** o **junto a cada bloque de cifras**? *(Recomendado: arriba, visible, +
  repetido en la tabla de créditos, que es la que más envejece.)*
