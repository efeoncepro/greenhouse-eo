# TASK-1403 — Cluster `/servicios/hubspot/agentes/`: **"Los agentes de IA de HubSpot: cuáles funcionan de verdad"**

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
- Wireframe: `docs/ui/wireframes/TASK-1403-landing-hubspot-agentes.md`
- Flow: `docs/ui/flows/TASK-1403-landing-hubspot-agentes-flow.md`
- Motion: `docs/ui/motion/TASK-1403-landing-hubspot-agentes-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: 🔴 **F0 — el caso ANAM verificado + autorizado** *(sin él, esta página es capability sin prueba)*
- Branch: `task/TASK-1403-landing-hubspot-agentes`

> **Cluster 3 de 4** del hub HubSpot. Pillar: **TASK-1352** (`/servicios/hubspot/`).
> **Arquitectura:** [PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) ·
> **SSOT de contenido:** [`HUBSPOT_HUB_LANDINGS_SPEC.md`](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 3 ·
> **Dominio:** skill `hubspot-solutions-partner` (`SOURCES.md` + `modules/13_AGENTES.md`).

## Summary

Construye **`/servicios/hubspot/agentes/`**: la única página honesta del mercado hispano sobre los agentes de IA
de HubSpot. **Lidera con la verdad incómoda** — **solo tres de los doce están en GA** (Customer, Prospecting,
Data); **los otros nueve están en beta** — explica que el cobro es **por resultado** (USD 0,50 por conversación
**resuelta**), muestra **el caso ANAM en producción** (**56% de reducción promedio** de carga del equipo de
atención) y termina con la posición que nos define: **el gobierno es el producto** — *el agente propone, un
humano confirma, recién ahí se ejecuta.*

Y cierra con lo que ningún competidor puede decir todavía: **operamos HubSpot *con* agentes.** HubSpot publicó
la **Agent CLI** (beta pública, junio 2026) para que agentes de IA operen el CRM sin humano en el loop.
**Nosotros ya trabajamos así.** No es roadmap: es cómo operamos.

## Why This Task Exists

**1. El CEO al que el directorio le pidió "IA" no tiene dónde leer la verdad.** Todo el contenido disponible
sobre Breeze es **marketing de HubSpot** (que habla de una plataforma agéntica completa) o **ruido de
LinkedIn**. Nadie publica que **solo tres agentes están en GA** — porque a nadie le conviene. **Es el dato más
citable del hub después de los límites.**

**2. Tenemos el único caso real, y no lo estamos usando.** ANAM tiene el **Customer Agent en producción** con
**56% de reducción promedio** de carga del equipo de atención (**76% en el mejor mes**). Eso es
*implementación de agentes en producción con métrica verificable*. Hoy no aparece en ninguna parte.
🔴 **Y sin ese caso, esta página es capability sin prueba — que es exactamente lo que denuncia.**

**3. La diferencia real no es implementar el agente: es gobernarlo.** Cualquiera enciende un Customer Agent en
una tarde. **Lo que nadie hace es decidir qué resuelve solo y qué escala a un humano, medir el costo por
resultado, y limpiar los datos primero** (un agente sobre datos sucios **amplifica la basura**). **Ese trabajo
es el producto** — y esta página es donde se explica.

**4. La beta mata, y ya lo vimos.** Los **Custom Assistants murieron el 2026-07-13**. No es un riesgo teórico:
**es de esta semana.** Un partner que firmó un SLA sobre esa beta hoy tiene un problema. **Nosotros lo decimos
antes.**

## Goal

- Publicar **la verdad sobre el estado real de los agentes** (3 en GA / 9 en beta) — el contenido que nadie más
  publica.
- **Mostrar el caso ANAM** con la métrica verificada y **liderando con el 56%**, no con el 76%.
- Explicar **el gobierno como producto** (propone → confirma → ejecuta) y **la Agent CLI** como forma de operar.
- **Descalificar honestamente:** cuándo un agente **no** te sirve (datos sucios · volumen bajo · procesos sin definir).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

**Normativos:**

- 🔴 **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 3** — las 7 secciones y qué **no** dice.
- 🔴 **Skill `hubspot-solutions-partner` → `modules/13_AGENTES.md`** — los 3 agentes GA, la **Agent CLI**, los
  **Agent Tools**, la doctrina de gobierno y **el caso ANAM**. **Cargarlo entero antes de escribir una línea.**
- **`SOURCES.md`** — § *Datos que NO se citan* + el estado y precio de cada agente con su `as-of`.
  🔴 **Todo lo de Breeze es volátil: pay-per-result desde abril 2026, roster cambiante.**
- **[PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md)** ·
  **[PDR-006](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)**.

## Normative Docs

- 🔴 `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md` § 3 — **las 7 secciones y qué NO dice.**
- 🔴 `.claude/skills/hubspot-solutions-partner/modules/13_AGENTES.md` — **el dominio entero**: los 3 agentes GA,
  la Agent CLI, los Agent Tools, la doctrina de gobierno y **el caso ANAM**. **Cargarlo completo.**
- 🔴 `.claude/skills/hubspot-solutions-partner/SOURCES.md` — el estado y el precio de cada agente con su `as-of`.
  **Todo lo de Breeze es volátil.**
- `.claude/skills/hubspot-solutions-partner/efeonce/PLAN_RESCATE_6M.md` — **el QBR con ANAM desbloquea F0.**
- `docs/context/05_voz-tono-estilo.md` — voz y registro.

## 🔴 Reglas duras

**El caso (lo más peligroso de esta página)**

1. 🔴 **El caso ANAM requiere las tres condiciones, sin excepción:** **(a)** métrica **verificada** *(no de
   memoria: reproducida contra el portal)* · **(b)** relación en buenos términos ✅ · **(c)** **autorización
   explícita de ANAM para usar su nombre.** **Si falta una → anonimizado** (*"un cliente del sector servicios"*)
   **o no se usa.** **NUNCA con nombre sin autorización escrita.**
2. 🔴 **Se lidera con el 56% (el promedio), NO con el 76% (el mejor mes).**
   🎯 *"Hasta 76%"* **suena a cherry-picking y le descuenta credibilidad a todo lo demás de la página.**
   El 76% se menciona **después**, como rango, y **declarado como el mejor mes**. **El promedio es el dato
   honesto — y en una página cuyo argumento es la honestidad, liderar con el pico sería contradecirse en la
   única cifra que importa.**
3. 🔴 **Nunca extrapolar de n=1.** *"Redujimos 56% en ANAM"* ✅ · *"Reducimos la carga de soporte un 56%"* ❌
   (implica una flota que no existe).

**El producto**

4. 🔴 **NUNCA *"flota de agentes de IA"*.** **Solo tres en GA:** Customer · Prospecting · Data.
   **Y se nombra cuántos están en beta.**
5. 🔴 **NINGÚN SLA sobre un agente en beta.** **Los Custom Assistants murieron el 2026-07-13** — se cita como
   **el ejemplo vivo** de por qué. *(No es hipotético: pasó esta semana.)*
6. 🔴 **La definición de "conversación resuelta" es de HubSpot y se cita literal:** el agente resolvió y
   **no hubo escalamiento humano en 72 horas**. 🎯 **Publicarla es un acto de honestidad — y de paso es el
   argumento**: *pagas cuando funciona, no cuando lo intenta.*
7. 🔴 **Precios de agentes: reverificar el día de publicación.** Todo lo de Breeze cambia rápido.
8. 🔴 **Claims prohibidos** (los del hub) + **nomenclatura 2026**.

**El gobierno**

9. 🔴 **El loop es el producto y se enuncia literal:** *el agente propone · un humano confirma · recién ahí se
   ejecuta · y todo pasa por `--dry-run` antes.* **Nadie le da la llave del CRM a una IA sin supervisión — y
   quien te diga que sí, sal corriendo.**
10. 🔴 **La Agent CLI se describe como lo que es: beta pública** (junio 2026), **y como forma de operar
    nuestra**, no como producto que le vendemos al cliente.

**Build**

- Ohio nativo bajo el pillar. CSS page-scoped. `Document::save()`. Snapshot + purge + rollback.
- **Full API Parity por reuso.** **es-LATAM neutro.** **Hereda el motion contract del pillar.**

## Dependencies & Impact

### Depends on

- 🔴 **F0 — el caso ANAM** *(bloqueante duro)*: **verificar la métrica contra el portal** + **conseguir la
  autorización**. **Ambas cosas salen del QBR con ANAM** (`hubspot-solutions-partner/efeonce/PLAN_RESCATE_6M.md`).
  🎯 **Ese QBR también reinicia los puntos managed (hoy en CERO) y abre el cross-sell de Marketing Hub. Es la
  reunión de mayor ROI del semestre — y esta página es una de sus tres razones.**
- 🔴 **Reverificación del roster y el pricing de Breeze** el día de publicación *(cambió 3 veces en 2026)*.
- `<greenhouse-form>` + HubSpot Meetings (reuso) · CORS `/servicios/*` `[verificar — probablemente OK]`.

### Blocks / Impacts

- 🎯 **Es el diferenciador más fuerte del hub.** Nadie más publica el estado real del GA.
- Le da a `/precios/` el detalle del consumo de créditos y a `/cuando-no-usar-hubspot/` el límite #8.
- **Convierte el caso ANAM en activo comercial** y **sostiene la posición de gobierno** que nos separa del resto.

### Files owned

- Esta task · `docs/ui/wireframes/TASK-1403-*` · `docs/ui/flows/TASK-1403-*` · `docs/ui/motion/TASK-1403-*`.
- La página WordPress nueva · su scenario GVC · su fila en el landing registry.

## Current Repo State

### Already exists

- `modules/13_AGENTES.md` con **todo el dominio verificado**: los 3 agentes GA, la **Agent CLI**, los
  **Agent Tools**, la doctrina de gobierno y **el caso ANAM**.
- El patrón de build bajo `/servicios/` (TASK-1343) · Growth Forms renderer + patrón de embed.

### Gap

- 🔴 **La autorización de ANAM (bloqueante).** La métrica **sin reverificar contra el portal** — y **sin
  denominador declarado** *(¿56% de qué? tickets, conversaciones u horas: **hay que poder decirlo en una frase**)*.
- La página no existe · el copy sin draftear · el roster de Breeze sin reverificar · JSON-LD sin definir.

## Modular Placement Contract

- Topology impact: `public`
- Current home: sitio público WordPress/Ohio en Kinsta; página nueva bajo el pillar `/servicios/hubspot/`.
- Future candidate home: `public`
- Boundary: la landing es consumer del renderer público de Growth Forms y del agendador HubSpot Meetings; no define primitives ni contratos propios.
- Server/browser split: `n/a` — sitio público sin Client Components de portal; cero secretos, cero SDK, cero DB. El JS es enhancement y no es requisito para leer la página.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: 🎯 **dos, y son muy distintos** — **(1) el CEO/director al que el directorio le pidió "IA"**,
  que **tiene miedo de quedar mal en las dos direcciones** (quedarse atrás, o comprar humo y que se note); y
  **(2) el COO/jefe de servicio con el equipo desbordado**, al que **no le interesa la IA: le interesa que bajen
  los tickets**.
- Momento del flujo: *"todo el mundo dice que tiene agentes de IA y ninguno me explica qué hacen realmente,
  cuánto cuestan, ni qué pasa si se equivocan."*
- Resultado perceptible esperado: **saber qué es real, qué cuesta y quién responde si falla.**
- Fricción que debe reducir: el miedo a **comprar humo** (y que el directorio se dé cuenta) y el miedo a
  **soltarle el CRM a una IA sin supervisión**.
- No-goals UX: no es el folleto de Breeze · **no vende la Agent CLI al cliente** · **no promete agentes en beta**.

### Surface & system decision

- Surface: `efeoncepro.com/servicios/hubspot/agentes/`.
- Composition Shell: `no aplica` (sitio público).
- Primitive decision: `reuse` — section header + `<table>` + **stepper** (el loop de gobierno, sobre un `<ol>`) +
  `<greenhouse-form>`. **Cero primitives nuevas.**
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: **ninguno.**
- Copy source: contenido de página pública. 🔴 **Cero hype de IA.**
- Access impact: `none` (pública).

### State inventory

- Default: todo visible. 🔴 **Sin JS también** (la tabla GA/beta, el 56% y el loop de gobierno).
- Loading / Empty / Permission denied: `n/a`.
- Error: el form falla → Error Card del renderer.
- Degraded / partial: el form no monta → 🔴 **fallback link visible**.
- Long content: la tabla de agentes scrollea dentro de su contenedor.
- Mobile / compact (390 px): la tabla colapsa a tarjetas — **nunca se pierde la columna de estado**.
- Keyboard / focus: tabla alcanzable por teclado; el stepper es un `<ol>` navegable.
- Reduced motion: **los 3 pasos del gobierno visibles y estáticos**, en orden.
- 🔴 **Estado de contenido (F0):** **caso CON autorización** → R4 con nombre · **caso SIN autorización** → R4
  anonimizado, y 🔴 **la cadena `ANAM` no existe en el DOM**.
- 🎯 **HubSpot sube otro agente a GA** → la tabla se actualiza **y se anota la fecha**.
  **Mantenerla al día, sostenido, ES la autoridad.**

### Interaction contract

- Primary interaction: **leer.** Ninguna interacción revela contenido.
- Hover / focus / active: hover de fila · CTA con micro-lift + focus ring.
- Pending / disabled: solo en el form.
- Escape / click-away: `n/a`.
- Focus restore: al volver de Meetings, el navegador restaura solo.
- Latency feedback / Toast: `n/a` — lo maneja el renderer.

### Motion & microinteracciones

- Motion primitive: `CSS` + IntersectionObserver. **Cero librerías, cero Lottie, cero canvas.**
- Enter / exit: fade + rise sobrio (hero 400 ms · regiones 300 ms).
- Layout morph: **ninguno.**
- Stagger: hero (60 ms) · 🎯 **el stepper del gobierno (80 ms)** — **el único stagger con significado del hub**:
  *propone → confirma → ejecuta* es una **secuencia causal**, y el stagger **la enseña**.
- Timing / easing token: `--gh-hs-dur-fast: 150ms` · `--gh-hs-dur-base: 300ms` ·
  `--gh-hs-ease: cubic-bezier(0.2,0,0,1)`.
- Reduced-motion fallback: **los 3 pasos visibles y estáticos, en orden** *(el `<ol>` ya dice el orden — **el
  argumento sobrevive sin el motion**)*.
- 🔴 Non-goal motion (**lista literal**): **glows · auroras · partículas · redes neuronales · typing effect ·
  pulse/heartbeat · gradientes animados · contadores · robots.** 🎯 **Es el "AI slop" que la propia página
  denuncia en su contenido.** Detalle: `docs/ui/motion/TASK-1403-landing-hubspot-agentes-motion.md`.

### Implementation mapping

- Route / surface: página WordPress nueva bajo el pillar, Ohio nativo, CSS page-scoped.
- Primitive / variant / kind: `reuse`.
- Component candidates: **`<table>` GA/beta** (colapsa a tarjetas) + **`<ol>` del gobierno** + `<blockquote>`
  (la definición de HubSpot, citada literal) + `<details>` (FAQ) + `<greenhouse-form>`.
- Copy source: contenido de página pública.
- Data reader / command: 🔴 **NINGUNO.** El roster y la métrica son **contenido editorial verificado con su
  `as-of`**. *(Tentador conectarlo a algo "vivo": **no hay fuente confiable que consultar** — HubSpot no publica
  un endpoint del estado GA de sus agentes. **Una fecha honesta > un feed inventado.**)*
- API parity: **por reuso** (form + Meetings).
- Access / capability: `none`.
- States to implement: default · sin-JS · reduced-motion · form-no-monta · 390 px · **caso con/sin autorización**.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-hubspot-agentes.*`
- Route: `/servicios/hubspot/agentes/` · Viewports: **1440 + 390**
- Required steps: cargar → click *"Ver cuáles funcionan"* (**verificar scroll + focus a R2**) → capturar la
  tabla → scroll al caso → capturar el stepper → abrir 2 FAQs → click CTA → verificar form / fallback.
- Required captures: full-page (desktop + mobile) · 🎯 **la tabla GA/beta** · **el caso (R4)** ·
  🎯 **el stepper en 2 estados** · FAQ abierto · **reduced-motion** · **tarjetas en 390 px**.
- Required `data-capture` markers: `hero` · **`estado`** · `costo` · **`caso`** · `implementamos` ·
  **`gobierno`** · `cli` · `limites` · `cta`.
- Assertions:
  - 🔴 **Sin JS:** la tabla GA/beta, el **56%** y el loop de gobierno **en el HTML servido**.
  - 🔴 **La cadena "flota de agentes" NO existe** en el DOM *(ni variantes: "ejército", "equipo de agentes IA")*.
  - 🔴 **Assertion de orden:** **`56` aparece antes que `76`** en el DOM.
  - 🔴 **Sin autorización: la cadena `ANAM` NO existe** en el DOM *(assertion literal, bloqueante)*.
  - 🔴 **El estado GA/beta está escrito en texto**, no solo codificado por color *(WCAG 1.4.1)*.
  - 🔴 **El gobierno es un `<ol>`** — el orden existe semánticamente, no solo por el stagger.
  - 🔴 **Cero contadores animados** · `as-of` visible · sin claims prohibidos.
  - 🔴 **No existe `filter: blur`, `<canvas>`, Lottie ni animación infinita.**
- Scroll-width checks: sin scroll horizontal de página (1440 y 390).
- Reduced-motion / focus evidence: captura `prefers-reduced-motion` (los 3 pasos visibles y estáticos) +
  tabulación con ring visible.

### Design decision log

- Decision: 🎯 **la verdad incómoda va PRIMERO (R2), el caso va DESPUÉS (R4).**
- Alternatives considered: *(a)* **hero con el 56%** — es el patrón por defecto de toda landing de agencia y
  **activa exactamente el escepticismo que la página necesita desarmar**. Si el caso va primero, esto es
  **una agencia presumiendo**. *(b)* **Liderar con el 76%** — literalmente cierto **y suena a cherry-picking**;
  una página cuyo único activo es la honestidad **no puede permitirse sonar así en su cifra principal**.
  *(c)* **Ilustrar "IA" con robots/cerebros/partículas** — **es el AI slop que la propia página denuncia.**
- Why this pattern: **poniendo *"solo tres de doce funcionan"* arriba, cuando llega el 56% ya nos ganamos el
  derecho a que nos crean.** Es **la misma mecánica del waiver en `/precios/`: la prueba llega después de la
  honestidad, no antes.** Y **el caso vive en una región aislada** — no es capricho de layout: **es un requisito
  de rollback** (anonimizable en 15 min sin tocar el resto).
- Reuse / extend / new primitive: `reuse`.
- Open risks: 🔴 **publicar el nombre de ANAM sin autorización** *(daño de relación irreversible)* ·
  **la métrica no resiste el escrutinio** *(el denominador tiene que poder enunciarse)* · **el roster de Breeze
  cambia y la página miente** *(cambió 3 veces en 2026)* · **un agente en beta muere y lo teníamos prometido**.

### Visual verification

- GVC scenario: `public-servicios-hubspot-agentes` · Viewports 1440 + 390.
- Required captures / markers: ver *GVC scenario plan*.
- Scroll-width check: sin scroll horizontal de página.
- Accessibility/focus checks: tabla semántica; **el estado GA/beta escrito, no solo por color**; el gobierno como
  `<ol>`; focus ring AA.
- Before/after evidence: `n/a` (página nueva).
- Known visual debt: 🎯 **test del revisor** — al abrir la página, la reacción debe ser **"qué claro está"**,
  no *"qué futurista"*. **La página sobre agentes de IA tiene que ser la menos "de IA" del sitio.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — 🔴 F0: el caso ANAM (BLOQUEA TODO)

- **Verificar la métrica** contra el portal de ANAM: **56% promedio** · **76% mejor mes** · ventana temporal ·
  denominador (**¿carga de qué, exactamente?** — tickets, conversaciones, horas: **hay que poder decirlo**).
- 🎯 **Conseguir la autorización escrita** de ANAM para usar su nombre y la cifra.
- **Si no hay autorización:** el caso va **anonimizado** (*"un cliente del sector servicios, Customer Agent en
  producción"*) — **y la página igual se publica**, porque el resto (la verdad sobre el GA, el gobierno, la
  Agent CLI) **sigue siendo el mejor contenido del mercado**. 🔴 **Lo que NUNCA se hace es publicar el nombre
  sin permiso.**

### Slice 1 — Reverificación del dominio

- Roster de Breeze (**cuáles en GA, cuáles en beta, cuántos**) · pricing por outcome · la definición literal
  de *"conversación resuelta"* · el estado de la **Agent CLI** y los **Agent Tools** · **la muerte de los
  Custom Assistants (2026-07-13)** como ejemplo citable.
- Confirmar Meetings + UTM · CORS del form.

### Slice 2 — Copy final (`copywriting` + `greenhouse-ux-writing`)

- Copy ledger completo. 🔴 **Sujeto a las 10 reglas duras.** Registro sobrio: **el contenido ya es fuerte.**
- Answer capsule por H2 (40-60 palabras).

### Slice 3 — Build

- Página nueva bajo el pillar, Ohio nativo, `Document::save()`.
- 🎯 **La región firma: "Cuáles funcionan de verdad"** — tabla **GA vs beta**, texto servido.
  **El dato que nadie publica.**
- La región del **caso** (56% liderando) · la del **gobierno** (el loop) · la de **la Agent CLI** ·
  la de **cuándo un agente NO te sirve**.

### Slice 4 — AEO + form + schema

- JSON-LD `FAQPage` + `Service` + `BreadcrumbList` *(+ `Article` si el ángulo editorial pesa)*.
- Internal links: **pillar (obligatorio)** · `/precios/` (consumo de créditos) · `/cuando-no-usar-hubspot/`
  (el límite de los 3 GA es uno de los ocho). 🔴 **El que no exista, no se pinta.**
- Form de diagnóstico (*"te decimos si un agente te sirve"*) + fallback link.

### Slice 5 — Verificación visual + registro

- Scenario GVC + capturas 1440/390/reduced-motion.
- 🔴 **Assertions:** sin-JS (la tabla GA/beta y el 56% en el HTML) · **sin *"flota de agentes"*** ·
  **sin claims prohibidos** · **el 56% aparece antes que el 76%** *(assertion de orden en el DOM)* ·
  `as-of` visible · **si no hay autorización, el nombre "ANAM" NO aparece** *(assertion literal)*.
- Landing registry + landing file + matrix. Purge Kinsta.

## Out of Scope

- Vender la Agent CLI como producto al cliente (es **cómo operamos**, no lo que vendemos).
- El catálogo completo de los 12 agentes con su detalle *(es marketing de HubSpot; **nosotros publicamos el
  estado, no el folleto**)*.
- Precios detallados (**`/precios/`**) · comparación con Agentforce (**`/hubspot-vs-salesforce/`**) ·
  variante `en-US`.

## Detailed Spec

### Las 11 regiones

Detalle completo en **`docs/ui/wireframes/TASK-1403-landing-hubspot-agentes.md`**. El arco:

`hero (la pregunta)` → 🎯 **LA VERDAD PRIMERO: la tabla GA/beta (firma)** → cuánto cuestan de verdad *(y la
definición literal de HubSpot)* → 🎯 **EL CASO** *(región aislada)* → lo que implementamos de verdad →
🎯 **EL GOBIERNO ES EL PRODUCTO** → y operamos tu HubSpot **con** agentes *(Agent CLI)* →
**cuándo un agente NO te sirve** → FAQ → puente → CTA.

🔴 **El orden importa más acá que en ninguna otra página del hub.** Si el caso fuera primero, sería una landing
de agencia presumiendo. **La verdad incómoda primero es lo que hace que el caso se crea.**

### La tabla GA/beta (R2) — el dato que nadie publica

**Tres en GA:** `Customer Agent` · `Prospecting Agent` · `Data Agent` — con soporte, SLA y compromiso.
**Los otros, en beta:** HubSpot **puede cambiarlos o retirarlos sin previo aviso** — y lo hace:
🔴 **los Custom Assistants se retiraron el 2026-07-13.** *(No es hipotético: pasó esta semana.)*
🔴 **Nunca firmamos un SLA sobre una beta.**

**Columnas:** `agente · estado (GA/beta) · qué hace de verdad`.
🔴 **El estado va escrito en texto, no solo en color** — un badge verde/amarillo sin palabra **deja al usuario
daltónico sin el dato central de la página**.

### El cobro por resultado (R3) — y por qué citamos su definición

Customer Agent ≈ **USD 0,50 / conversación resuelta** · Prospecting ≈ **USD 1 / lead**.
🔴 **Y *resuelta* es definición de HubSpot, citada literal:** el agente resolvió **y no hubo escalamiento humano
en 72 horas**. 🎯 *"Si el cliente vuelve enojado al día siguiente, no cuenta — y no se cobra."*
**Citarla es honestidad y, a la vez, el mejor argumento de la sección.**

### El caso (R4) — región autocontenida por diseño

**Customer Agent en producción. Reducción de carga del equipo de atención: 56% promedio** *(76% el mejor mes)*.

🔴 **Se lidera con el 56%.** El 76% se menciona después, **declarado como el mejor mes**.
🔴 **El denominador se declara** en una frase (*"medido sobre X, entre {mes} y {mes}"*), o **la cifra no resiste
la primera pregunta de un prospecto**.
🔴 **Sin autorización → anonimizado** (*"un cliente del sector servicios"*), y **la cadena `ANAM` no existe en el
DOM**. 🎯 **La región es autocontenida para que ese cambio sea una edición de 15 min, no un rediseño.**

### El gobierno (R6) — la posición que nos define

> **El agente propone. Un humano confirma. Recién ahí se ejecuta.** Y todo pasa por `--dry-run` antes.
> **Nadie le da la llave del CRM a una IA sin supervisión — y quien te diga que sí, sal corriendo.**

🔴 **Es un `<ol>`.** El orden **es** el contenido: si solo existe visualmente, **el lector de pantalla y el
crawler pierden el argumento central de la página**.

### Contrato de datos (el que NO existe)

🔴 **Cero reader, cero command, cero endpoint.** Roster y métrica son **contenido editorial verificado**.

### Structured data

`FAQPage` + `Service` + `BreadcrumbList` *(+ `Article` si el ángulo editorial pesa)*.

## Rollout Plan & Risk Matrix

Página nueva. **Riesgo técnico bajo. Riesgo de contenido: el más alto del hub** — porque es la única que
**nombra a un cliente** y la única cuyo dominio **cambia todos los meses**.

### Slice ordering hard rule

🔴 **Slice 0 (el caso ANAM) bloquea todo.** Sin métrica verificada **y** decisión de autorización,
**no se escribe copy.** Luego 1 (reverificación) → 2 (copy) → 3 (build) → 4 (AEO/form) → 5 (GVC).

### Risk matrix

| Riesgo | Prob. | Mitigación | Señal |
|---|---|---|---|
| 🔴 **Publicar el nombre de ANAM sin autorización** | **media** | Regla dura 1 + **assertion GVC literal**: sin autorización, la cadena `ANAM` **no puede aparecer en el DOM** | Reclamo del cliente. **Daño de relación irreversible** |
| 🔴 **Liderar con el 76% y sonar a cherry-picking** | **media** | Regla dura 2 + **assertion de orden en el DOM** (el 56% aparece antes) | Review humano / GVC |
| 🔴 **La métrica no resiste el escrutinio** *(¿56% de qué, medido cómo?)* | **media** | Slice 0: **el denominador tiene que poder enunciarse en una frase** | Un prospecto pregunta y no sabemos responder |
| 🔴 **El roster de Breeze cambia y la página miente** | **alta** *(cambió 3 veces en 2026)* | `as-of` visible + reverificación el día de publicación + **revisión trimestral** | HubSpot anuncia GA de otro agente |
| **Un agente en beta muere y lo teníamos prometido** | media | Regla dura 5: **ningún SLA sobre beta** + citamos la muerte de los Custom Assistants **como advertencia** | Anuncio de HubSpot |
| Se lee como *"tenemos una flota de agentes"* | media | Regla dura 4 + assertion de DOM | Review humano |
| 🎯 **Sin el caso, la página es capability sin prueba** | **alta** *(hoy es el estado)* | **F0 bloqueante.** Si no hay autorización → anonimizado, **pero la página se publica igual**: la verdad sobre el GA y el gobierno **ya son el mejor contenido del mercado** | Bloquea Slice 2 |

### Rollback

| Slice | Rollback | Tiempo |
|---|---|---|
| 0-2 | N/A (verificación / copy) | — |
| 3-4 | Despublicar (`draft`) + purge Kinsta | <5 min |
| 5 | Revertir registry / landing file / matrix | <5 min |
| 🔴 **El caso** | **Anonimizar la sección del caso** (dejar la métrica, quitar el nombre) + purge | **<15 min** |

> 🔴 **Rollback del caso:** tiene que ser **una edición quirúrgica de una sola sección**, no un rediseño.
> Por eso el caso vive en **su propia región aislada** — para poder anonimizarlo en minutos si ANAM cambia de
> opinión, **sin tocar el resto de la página.** *(El diseño anticipa el rollback: eso es lo que lo hace posible.)*

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/servicios/hubspot/agentes/` responde **200**, cuelga del pillar, con breadcrumb.
- [ ] El `<h1>` es **la pregunta** (*"cuáles funcionan de verdad"*), no el nombre del producto ni *"Breeze"*.
- [ ] 🎯 **La verdad va primero:** la tabla **GA (3) vs beta (los demás)** está **arriba**, en el HTML servido.
- [ ] 🔴 **NUNCA aparece "flota de agentes"** ni ninguna formulación que implique una flota (assertion GVC).
- [ ] 🔴 **El caso:** métrica **verificada** + **56% liderando** *(assertion de orden: el 56% aparece antes que
      el 76%)* + **el 76% declarado como el mejor mes**.
- [ ] 🔴 **Sin autorización de ANAM, la cadena `ANAM` NO existe en el DOM** (assertion literal). El caso va
      **anonimizado**.
- [ ] 🔴 **El denominador de la métrica está enunciado** (*"carga de X, medida así, en tal ventana"*).
- [ ] **La definición de "conversación resuelta" está citada literal** (sin escalamiento humano en 72 horas).
- [ ] 🎯 **El gobierno está enunciado como producto:** *propone → confirma → ejecuta · `--dry-run` antes* —
      con la frase *"quien te diga que sí, sal corriendo"* o su equivalente aprobado.
- [ ] **La Agent CLI** aparece **como beta pública y como forma de operar nuestra** — **nunca** como producto
      que le vendemos al cliente.
- [ ] 🔴 **Ningún SLA sobre un agente en beta.** La muerte de los **Custom Assistants (2026-07-13)** se cita
      como advertencia.
- [ ] **Existe "cuándo un agente NO te sirve"** (datos sucios · volumen bajo · procesos sin definir).
- [ ] 🔴 **Precios y roster reverificados** el día de publicación, con **`as-of` visible**.
- [ ] 🔴 **Citabilidad sin JS:** la tabla GA/beta, el 56% y el loop de gobierno **están en el HTML servido**.
      **Cero contadores animados.**
- [ ] Ningún claim prohibido. Enlace al pillar presente. Ningún `href` a página inexistente.
- [ ] Cada H2 con answer capsule. JSON-LD válido (Rich Results Test).
- [ ] CTA dual con **fallback honesto**. **NO** se reconstruyó form ni agendador.
- [ ] Copy es-LATAM neutro, sin voseo, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 + reduced-motion capturado **y mirado**. Sin scroll horizontal.
- [ ] `UI ready: yes` solo si `pnpm task:lint --task TASK-1403` queda sin findings.
- [ ] Landing registry + landing file + matrix actualizados, **con el recordatorio de revisión trimestral del
      roster de Breeze**.

## Verification

`pnpm task:lint --task TASK-1403` · `pnpm ops:lint --changed` ·
`pnpm ui:wireframe-check|flow-check|motion-check --task TASK-1403` ·
Playwright/GVC live (1440 + 390; **assertion sin-JS**; **assertion "flota de agentes" ausente**;
**assertion de orden 56% antes que 76%**; **assertion `ANAM` ausente si no hay autorización**) ·
Rich Results Test · HTTP 200 + breadcrumb + canonical.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con la carpeta · `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-1352 pillar · TASK-1401/1402/1404 · PLAN_RESCATE_6M)
- [ ] Página registrada en route-ownership matrix + landing registry + landing file
- [ ] 🔴 **La autorización de ANAM archivada** (dónde vive, quién la dio, cuándo)
- [ ] 🔴 **Recordatorio de revisión trimestral del roster de Breeze** en el landing file

## Follow-ups

- 🎯 **El QBR con ANAM desbloquea esto, y tres cosas más:** verifica la métrica, consigue la autorización,
  **reinicia los puntos managed** (hoy en **cero**) y **abre el cross-sell de Marketing Hub**.
  → `hubspot-solutions-partner/efeonce/PLAN_RESCATE_6M.md`. **Es la reunión de mayor ROI del semestre.**
- **Un segundo caso.** Con n=1 el argumento es frágil. Ecoriles es el candidato natural (ya es cliente, ya tiene
  el CRM, **no tiene Marketing Hub** → cross-sell).
- Versión **en-US** — el vacío de contenido sobre agentes es global.
- Cuando HubSpot suba otro agente a GA, **la página lo dice antes que nadie**. 🎯 **Eso, sostenido, es autoridad.**

## Open Questions

- 🔴 **¿ANAM autoriza el uso de su nombre?** *(Si no: anonimizado. La página se publica igual.)*
- **¿56% de qué exactamente?** Tickets, conversaciones o horas del equipo. **Hay que poder decirlo en una frase**
  o la cifra no resiste la primera pregunta de un prospecto.
- ¿La página menciona a **Kortex** (nuestra app en el Marketplace) como parte del gobierno, o eso se queda en el
  pillar? *(Recomendado: **una mención de mecanismo, sin protagonismo** — Kortex es n=1 y no puede implicar escala.)*
