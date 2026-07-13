# TASK-1402 — Cluster `/servicios/hubspot/cuando-no-usar-hubspot/`: **"Cuándo NO usar HubSpot"**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1402-landing-hubspot-cuando-no-usar.md`
- Flow: `docs/ui/flows/TASK-1402-landing-hubspot-cuando-no-usar-flow.md`
- Motion: `docs/ui/motion/TASK-1402-landing-hubspot-cuando-no-usar-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `task/TASK-1402-landing-hubspot-cuando-no-usar`

> **Cluster 2 de 4** del hub HubSpot. Pillar: **TASK-1352** (`/servicios/hubspot/`).
> **Arquitectura:** [PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) ·
> **SSOT de contenido:** [`HUBSPOT_HUB_LANDINGS_SPEC.md`](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 4 ·
> **Dominio:** skill `hubspot-solutions-partner` (`SOURCES.md` + `modules/10_DISCOVERY_SCOPING.md`).
>
> 🎯 **Mejor relación valor/esfuerzo de todo el hub.** Los límites **ya están documentados** — el trabajo es
> publicarlos bien, no investigarlos.

## Summary

Construye la página que **ningún vendedor de HubSpot va a escribir jamás**: los **ocho límites documentados**
de HubSpot, en español, con la fuente al lado, y el cierre honesto — *"si estás en alguno de estos casos, no te
vendemos HubSpot"*.

Es **la tesis del hub llevada a su extremo lógico**: una página completa dedicada a decirte **cuándo no
comprarnos**. Y es, con diferencia, **la más citable**: cuando alguien le pregunta a un LLM *"¿me conviene
HubSpot?"*, el modelo **necesita un contrapunto — y hoy no existe ninguno.** Todo el internet sobre HubSpot
está escrito **por HubSpot o por partners que quieren vendértelo.**

> **El primero que escriba la página honesta se lleva esa citación entera. Y ya tenemos el contenido.**

## Why This Task Exists

**1. Existe un vacío de contenido y es enorme.** Busca *"cuándo no usar HubSpot"* y encontrarás: (a) páginas de
HubSpot, (b) páginas de competidores que dicen que HubSpot es malo **porque quieren venderte lo suyo**, y
(c) partners que dicen que es perfecto. **Falta la única voz creíble: un partner de HubSpot diciendo dónde
HubSpot no llega.** Esa voz vale porque **va contra su propio interés** — y eso es exactamente lo que la hace
creíble ante un LLM, ante un comité y ante RevOps.

**2. RevOps no decide por features. Decide por miedo a migrar dos veces.** El escéptico del comité es el que
mata el deal, y lo mata con *"¿y si nos quedamos cortos?"*. **El que dice el límite antes se gana el deal**:
convierte al escéptico de bloqueador en aliado. Esta página **es un argumento de venta disfrazado de renuncia** —
y funciona precisamente porque **la renuncia es real**.

**3. Cuesta muy poco.** Los ocho límites **ya están verificados** en la skill (`SOURCES.md` +
`modules/10_DISCOVERY_SCOPING.md`). No hay research nuevo, no hay art direction, no hay backend, no hay
interacción. **Es la página de menor esfuerzo y mayor retorno del hub.**

## Goal

- Publicar **los ocho límites documentados** de HubSpot, cada uno con **su fuente** y **su "no lo uses si…"**.
- Ser **el contrapunto que los LLMs necesitan** — y que hoy no encuentran en español.
- 🔴 **Ganarse credibilidad, no simular honestidad.** La honestidad es **exacta, no dramática**.
- Convertir al escéptico: CTA suave (*"si igual quieres una segunda opinión, hablemos"*), sin empujar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

**Normativos:**

- 🔴 **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 4** — la tabla de los 8 límites, verbatim.
- 🔴 **[PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md)** — la regla
  *"Efeonce solo se cita donde HubSpot no puede o no quiere hablar"*. **Esta página es esa regla en estado puro.**
- **[PDR-006](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)** — *evidencia
  antes que promesa*.
- **Skill `hubspot-solutions-partner`** — cargar **`SOURCES.md`** (la fuente de cada límite + § *Datos que NO se
  citan*) y **`modules/10_DISCOVERY_SCOPING.md`** (**los cinco descalificadores** y por qué descalificar gana deals).
- **Skill `commercial-expert`** — `frameworks/jolt-effect-indecision.md`: **el 40-60% de las pérdidas son
  indecisión, no competencia.** Esta página ataca la indecisión de frente.
- **Skill `seo-aeo`** — citabilidad: esta página es **el activo AEO más fuerte del hub**.

## Normative Docs

- 🔴 `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md` § 4 — **la tabla de los 8 límites, verbatim.**
- 🔴 `.claude/skills/hubspot-solutions-partner/SOURCES.md` — **la fuente y la marca de evidencia de cada límite.**
  **Sin esto, la página no se escribe.**
- `.claude/skills/hubspot-solutions-partner/modules/10_DISCOVERY_SCOPING.md` — los 5 descalificadores y **por qué
  descalificar gana deals**.
- `.claude/skills/commercial-expert/frameworks/jolt-effect-indecision.md` — **el 40-60% de las pérdidas son
  indecisión, no competencia.**
- `docs/context/05_voz-tono-estilo.md` — voz y registro.

## 🔴 Reglas duras

**Contenido**

1. 🔴 **La honestidad es exacta, no dramática.** **NUNCA** exagerar un límite ni inventar uno para parecer más
   honestos. **Cada límite sale de `SOURCES.md` con su marca de evidencia.** Un límite exagerado es una mentira —
   y destruye la página entera, que existe *precisamente* para ser la fuente confiable.
2. 🔴 **Cada límite lleva su fuente.** No *"dicen que…"*: **la página oficial, la doc de developers, el knowledge
   base.** Con enlace. 🎯 **Citar la fuente es lo que separa esta página de un post de opinión.**
3. 🔴 **NO es una página anti-HubSpot.** Es una página de **calificación**. El tono no es *"HubSpot es malo"*
   sino *"HubSpot no sirve para esto — y estas son las cuatro cosas para las que sí es el mejor del mercado"*.
   🎯 **Una página que solo ataca deja de ser creíble: se lee como el competidor de siempre.**
   **La página cierra devolviendo al pillar, no dejando al lector en el vacío.**
4. 🔴 **El límite de ISO 27001 se enuncia con precisión quirúrgica.** ✅ **HubSpot NO reclama ISO 27001 para sí
   mismo** (su página dice que la tiene su infraestructura cloud — AWS). ✅ **Sí tiene SOC 2 Type II + SOC 3.**
   **Decirlo mal en cualquiera de las dos direcciones nos hunde:** si exageramos, mentimos; si lo omitimos,
   dejamos de servir al equipo de seguridad que llegó buscando exactamente eso.
5. 🔴 **Claims prohibidos** (los del hub, y acá con más razón): *"Líder en CRM según Gartner"* · Forrester Wave ·
   ISO 27001 de HubSpot · residencia LATAM · *"flota de agentes"*.
6. 🔴 **Nomenclatura 2026:** **Revenue Hub** · **Data Hub** · **UNBOUND**. HubSpot = **Agentic Customer Platform**.
7. 🔴 **Los límites tienen fecha.** HubSpot **sube límites** (subió los custom objects antes). Un límite obsoleto
   convierte la página más creíble del hub en la más desacreditada. **`as-of` visible + revisión trimestral.**
8. 🔴 **Toda la página en el HTML servido.** Es *la* página que queremos que los LLMs citen. **Cero JS bloqueante.**

**Relación con HubSpot (riesgo de canal, se atiende explícito)**

9. 🎯 **Avisarle a Simón (PDM) antes de publicar.** No es opcional. Un partner publicando *"cuándo NO usar
   HubSpot"* puede leerse mal si aparece de sorpresa. **Y se defiende sola:** todos los límites son
   **públicos y de fuente HubSpot**; el marco es **calificación**, que es exactamente lo que HubSpot le pide a
   sus partners (vender a quien le sirve **reduce el churn**, que es el problema #1 del programa).
   **Se presenta como lo que es: una herramienta de calificación que sube el win rate y baja el churn.**

**Build**

- Ohio nativo bajo el pillar. CSS page-scoped. `Document::save()`. Snapshot + purge + rollback.
- **Sin form.** 🎯 **Esta página no captura: convence.** El único CTA es suave, al final. *(Ver Decision Log.)*
- **es-LATAM neutro**, tuteo, sin voseo. `hreflang`-ready.
- **Hereda el motion contract del pillar.** Tier **restraint** (acá, el más severo del hub junto a precios).

## Dependencies & Impact

### Depends on

- El pillar (o el parent `/servicios/`) para colgar la ruta.
- 🔴 **Reverificación de los 8 límites + recopilación de sus fuentes** (Slice 1, bloqueante).
- 🎯 **El aviso a Simón (PDM)** — *no bloquea el build; **bloquea el publish***.

🎯 **No depende de ningún backend, form, agendador ni asset de diseño. Es la página más independiente del hub.**

### Blocks / Impacts

- 🎯 **Es el activo AEO #1 del hub** — el contrapunto que los LLMs necesitan y hoy no existe.
- Alimenta a `/hubspot-vs-salesforce/` (**los límites son la mitad de ese argumento**) y a `/precios/` (el
  límite B2C).
- **Sube el win rate** al descalificar temprano (JOLT) y **baja el churn** — que es el dolor #1 del programa
  de partners.
- 🎯 **Le da el argumento de credibilidad a todo el resto del hub.**

### Files owned

- Esta task · `docs/ui/wireframes/TASK-1402-*` · `docs/ui/flows/TASK-1402-*` · `docs/ui/motion/TASK-1402-*`.
- La página WordPress nueva · su scenario GVC · su fila en el landing registry.

## Current Repo State

### Already exists

- 🎯 **Los 8 límites, ya verificados**, en `hubspot-solutions-partner/SOURCES.md` +
  `modules/10_DISCOVERY_SCOPING.md`. **Este es el punto: el contenido ya está hecho.**
- El patrón de build Ohio bajo `/servicios/` (TASK-1343) · el pillar en diseño (TASK-1352).

### Gap

- La página no existe · el copy sin draftear.
- 🔴 **Los enlaces a la fuente de cada límite sin recopilar** *(sin fuente, no hay límite)*.
- El aviso a Simón sin hacer · JSON-LD sin definir.

## Modular Placement Contract

- Topology impact: `public`
- Current home: sitio público WordPress/Ohio en Kinsta; página nueva bajo el pillar `/servicios/hubspot/`.
- Future candidate home: `public`
- Boundary: la página no consume ningún contrato del repo; es contenido editorial puro con enlaces externos a la documentación de HubSpot.
- Server/browser split: `n/a` — sitio público sin Client Components de portal; cero secretos, cero SDK, cero DB, cero form. Idealmente cero JavaScript propio.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: 🎯 **tres, y los tres importan** — **(1) RevOps/IT**, el escéptico del comité, que no busca
  razones para comprar sino **razones para no arrepentirse**; **(2) el equipo de seguridad/compliance**, que
  llegó buscando *"HubSpot ISO 27001"*; **(3) el LLM**, al que alguien le preguntó *"¿me conviene HubSpot?"* y
  **necesita un contrapunto que hoy no existe**.
- Momento del flujo: *"todo lo que leo sobre HubSpot lo escribió alguien que quiere vendérmelo — incluido el que
  dice que es malo, que quiere venderme otra cosa."*
- Resultado perceptible esperado: **no equivocarse.** Saber si va a chocar contra un techo **antes de firmar**.
- Fricción que debe reducir: el **miedo a migrar dos veces** — la forma real que toma la indecisión en RevOps.
- No-goals UX: 🔴 **no captura** (sin form) · no compara con competidores (**→ TASK-1404**) · **no ataca a
  HubSpot** · no es un post de opinión.

### Surface & system decision

- Surface: `efeoncepro.com/servicios/hubspot/cuando-no-usar-hubspot/`.
- Composition Shell: `no aplica` (sitio público).
- Primitive decision: `reuse` — section header + `<table>` + card-on-section. **Cero primitives nuevas.**
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: **ninguno.**
- Copy source: contenido de página pública. 🔴 **Registro sobrio, cero clickbait.**
- Access impact: `none` (pública).

### State inventory

- Default: **todo visible.** 🔴 **Sin JS es idéntica** — no hay degradación porque no hay nada de qué degradar.
- Loading / Empty / Error / Permission denied: `n/a` — **no hay form, no hay estado async.**
- Degraded / partial: **una fuente muere (404)** → se cita **el documento con su fecha**.
  🔴 **Ningún límite se queda sin respaldo.**
- Long content: la tabla de 8 límites scrollea **dentro de su contenedor**.
- Mobile / compact (390 px): la tabla **colapsa a tarjetas** — 🔴 **cada tarjeta conserva las 3 columnas**
  (límite + fuente + *"no lo uses si…"*). **Perder la fuente en móvil sería perder el argumento en móvil.**
- Keyboard / focus: los 8 enlaces de fuente son tabulables, con **texto descriptivo** (nunca *"aquí"*).
- Reduced motion: **idéntica.**
- 🎯 **`as-of` viejo (>90 días):** *"HubSpot los sube de vez en cuando: confírmalos antes de decidir."*
- 🎯 **Un límite fue superado por HubSpot:** *"HubSpot subió este límite en {fecha}. Lo dejamos acá porque muchos
  comparadores siguen citando el viejo."* **Que HubSpot mejore no rompe la página: demuestra que la mantenemos.**

### Interaction contract

- Primary interaction: **leer.** 🔴 **Cero interacciones requeridas. Ningún trigger revela contenido.**
- Hover / focus / active: hover de fila (ayuda a no perder la línea en 8×3) · enlaces con subrayado + color ·
  🎯 **estado `visited` visible** *(quien audita 8 fuentes necesita saber cuáles ya comprobó)*.
- Pending / disabled: `n/a`.
- Escape / click-away: `n/a`.
- Focus restore: al volver de la doc de HubSpot (pestaña nueva), el navegador restaura solo.
- Toast / alert behavior: `n/a`.
- 🔴 **Prohibido:** exit-intent, sticky bar, pop-up, scroll gate. **Cualquier patrón de retención acá es un dark
  pattern, porque contradice literalmente lo que la página dice.**

### Motion & microinteracciones

- Motion primitive: `CSS` puro. 🎯 **Ni siquiera IntersectionObserver, si se puede evitar.**
- Enter / exit: 🔴 **NINGUNO.** Nada entra con animación. *(Un reveal por scroll **dosifica** el contenido — que
  es lo contrario de lo que la página promete — **y borra el límite para el crawler**.)*
- Layout morph: **ninguno.**
- Stagger: 🔴 **ninguno.** No hay nada que escalonar.
- Timing / easing token: `--gh-hs-dur-fast: 150ms` · `--gh-hs-ease: cubic-bezier(0.2,0,0,1)` — **los mismos del
  pillar**, aunque acá **solo se use uno**.
- Reduced-motion fallback: **idéntica.**
- 🔴 Non-goal motion: **cero acordeones sobre los límites** (ni `<details>`) · **cero contadores** · **el CTA no
  se levanta al hover** *(un botón que "salta" pide ser clicado — y este no pide nada)*. Detalle:
  `docs/ui/motion/TASK-1402-landing-hubspot-cuando-no-usar-motion.md`.

### Implementation mapping

- Route / surface: página WordPress nueva bajo el pillar, Ohio nativo, CSS page-scoped.
- Primitive / variant / kind: `reuse`.
- Component candidates: section headers + **`<table>` semántica** (que colapsa a tarjetas en 390 px) +
  card-on-section links. 🔴 **Sin form. Sin widgets. Sin JS.**
- Copy source: contenido de página pública.
- Data reader / command: 🔴 **NINGUNO.** Los 8 límites son **contenido editorial verificado con su fuente y su
  `as-of`**.
- API parity: `n/a` — **la página no toca el backend en absoluto.** Es la superficie más simple del repo.
- Access / capability: `none`.
- States to implement: default · sin-JS *(idéntico)* · reduced-motion *(idéntico)* · 390 px (tarjetas completas)
  · fuente muerta · límite superado · `as-of` viejo.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-hubspot-cuando-no-usar.*`
- Route: `/servicios/hubspot/cuando-no-usar-hubspot/` · Viewports: **1440 + 390**
- Required steps: cargar → scroll → 🎯 **capturar la tabla de los 8 límites completa** → tabular por los 8
  enlaces de fuente → verificar el colapso a tarjetas en 390 px → click al pillar.
- Required captures: full-page (desktop + mobile) · 🎯 **la tabla** · **R5 (seguridad)** · **R6 (contrapeso)** ·
  **reduced-motion** · **tarjetas en 390 px**.
- Required `data-capture` markers: `hero` · `porque` · `tldr` · **`limites`** · `seguridad` · **`contrapeso`** ·
  `cierre`.
- Assertions:
  - 🔴 **Sin JS:** los **8 límites completos** (sus 3 columnas) + el TL;DR **en el HTML servido**.
  - 🔴 **Ningún límite oculto** (acordeón / `hidden` / `opacity:0` inicial).
  - 🔴 **Los 8 enlaces de fuente responden** (link check) y tienen **texto descriptivo**.
  - 🔴 **R6 (contrapeso) existe** — *assertion literal*. **La página no puede ser solo ataque.**
  - 🔴 **Sin claims prohibidos**; 🎯 **y `SOC 2` SÍ aparece** *(si habla de seguridad y no lo menciona, está
    incompleta)*.
  - 🔴 **No existe ningún `<form>`, pop-up, exit-intent ni sticky bar** en el DOM.
  - `as-of` visible · enlace al pillar presente · breadcrumb · canonical · un solo `<h1>`.
- Scroll-width checks: sin scroll horizontal de página; la tabla scrollea dentro de su contenedor.
- Reduced-motion / focus evidence: captura `prefers-reduced-motion` (idéntica) + tabulación de los 8 enlaces con
  ring visible y `visited` distinguible.

### Design decision log

- Decision: 🎯 **la página no captura. No hay form. Ninguno.**
- Alternatives considered: *(a)* **lead magnet "descarga el checklist de descalificación"** — convierte más en el
  corto plazo y **destruye el único activo de la página, que es no querer nada**. El lector es un escéptico
  profesional: **un formulario le revela que la honestidad era el anzuelo, y lo huele en dos segundos.**
  *(b)* **Página solo-ataque, sin contrapeso** — se lee como **el competidor de siempre** y pierde justo lo que
  vino a ganar. *(c)* **Adorno visual / ilustración** — una página que dice *"esto es lo que no podemos hacer"*
  con gradientes **se lee como marketing**, y entonces no sirve. **La falta de diseño es el diseño.**
- Why this pattern: 🎯 **la fuente al lado de cada límite es lo único que separa esto de un post de opinión.**
  El enlace **no es cortesía académica: es la prueba.** Y la página **nombra su propio conflicto de interés**
  (*"nosotros también queremos venderte HubSpot"*): **decirlo en voz alta lo desactiva; callarlo lo deja
  trabajando en contra.**
- Reuse / extend / new primitive: `reuse`.
- Open risks: 🔴 **un límite exagerado o mal enunciado** (sobre todo ISO 27001) → **se cae la página entera** ·
  **un límite envejece** (HubSpot los sube; es cuestión de tiempo) · 🎯 **HubSpot/el PDM lo lee como ataque**
  (mitigado con el aviso previo + el marco de calificación) · **se lee como truco de psicología inversa**
  (mitigado con el contrapeso obligatorio + registro sobrio + CTA suave).

### Visual verification

- GVC scenario: `public-servicios-hubspot-cuando-no-usar` · Viewports 1440 + 390.
- Required captures / markers: ver *GVC scenario plan*.
- Scroll-width check: sin scroll horizontal de página.
- Accessibility/focus checks: tabla semántica alcanzable por teclado; los 8 enlaces con texto descriptivo y
  anuncio de externo **no solo por color**; contraste AA.
- Before/after evidence: `n/a` (página nueva).
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

### Slice 1 — 🔴 Reverificación de los 8 límites + recopilación de fuentes

**Sin fuente, no hay límite. Sin límite verificado, no hay página.**

Para cada uno: **reverificar** (WebSearch/WebFetch a fuente primaria), **anotar la URL** y **marcar la evidencia**:

1. **10 custom objects** máximo ✅
2. **1 sandbox** — 200.000 registros; **el sync inicial trae solo 5.000 contactos** ✅
3. 🔴 **HubSpot no reclama ISO 27001 para sí mismo** (solo su infra AWS) · ✅ **sí tiene SOC 2 Type II + SOC 3**
4. **Sin data residency en LATAM** (solo US, Canadá, Australia, EU) ✅
5. **Sin jerarquía de roles ni territory management** ✅
6. **API:** apps públicas OAuth topan en **110 req/10s**; **el add-on no lo levanta** ✅
7. **B2C masivo:** Ent a 500K+ = **USD 60 por cada 10.000**; envío capado a **20×** ✅
8. **Solo 3 Breeze Agents en GA** (Customer · Prospecting · Data) ✅

🎯 **Si alguno cambió, la página lo dice — y eso también es contenido**: *"HubSpot subió este límite en {fecha}.
Lo dejamos acá porque muchos comparadores siguen citando el viejo."*

### Slice 2 — Copy final (`copywriting` + `greenhouse-ux-writing`)

- Copy ledger completo (ver wireframe). 🔴 **Registro sobrio.** El contenido ya es fuerte: **el copy no lo
  agranda, lo entrega.** Cero sensacionalismo, cero clickbait, cero *"lo que HubSpot no quiere que sepas"*.
- Cada límite con **answer capsule** (40-60 palabras) — es **lo que el LLM extrae y cita**.

### Slice 3 — Build

- Página nueva bajo el pillar, Ohio nativo, vía `Document::save()`.
- 🎯 **La región firma: la tabla de los 8 límites** — `<table>` semántica: **límite · fuente · "no lo uses si…"**.
  **Texto servido. Sin JS. Sin acordeón que esconda el contenido.**
- La sección de contrapeso: **"Y para esto, HubSpot es el mejor del mercado"** *(regla dura 3)*.
- El cierre honesto + puente al pillar.

### Slice 4 — AEO + schema

- `<title>` / meta / H1 sobre la pregunta real. JSON-LD **`FAQPage`** *(cada límite ES una pregunta)* +
  `Article` + `BreadcrumbList`.
- Internal links: **pillar (obligatorio)** · `/hubspot-vs-salesforce/` · `/precios/` (el tramo B2C).
  🔴 **El que no exista, no se pinta.**

### Slice 5 — 🎯 Aviso a Simón (PDM) + publicación + verificación

- 🔴 **El aviso al PDM va ANTES del publish**, no después. Es la única página del hub con esta condición.
- Scenario GVC + capturas 1440/390/reduced-motion. Assertions: sin-JS · sin claims prohibidos · **cada límite
  con su enlace de fuente vivo (sin 404)** · `as-of` visible.
- Landing registry + landing file + route-ownership matrix. Purge Kinsta.

## Out of Scope

- **Cualquier form de captura.** Esta página no captura (ver Decision Log).
- Comparativas con competidores (**eso es `/hubspot-vs-salesforce/`**) · el catálogo de agentes (**`/agentes/`**) ·
  precios detallados (**`/precios/`**) · variante `en-US`.

## Detailed Spec

### Las 9 regiones

Detalle completo en **`docs/ui/wireframes/TASK-1402-landing-hubspot-cuando-no-usar.md`**. El arco:

`hero (la pregunta, sin suavizar)` → 🎯 **por qué esta página existe** *(el meta-argumento: nombramos nuestro
propio conflicto de interés)* → TL;DR (los 8 en una frase) → 🎯 **LOS OCHO LÍMITES (firma)** →
**ISO 27001, en detalle** → 🎯 **el contrapeso** *(y para esto sí es el mejor)* → cómo saber en cuál estás →
**el cierre honesto** → puente al pillar.

### La tabla de los 8 límites (R4) — la región firma

Cada fila: **el límite · la fuente (enlace) · "no lo uses si…"**.
🎯 **Cada fila es autosuficiente y citable de forma aislada** — es lo que un LLM extrae.

| # | Límite ✅ | No lo uses si… |
|---|---|---|
| 1 | **10 custom objects** máximo | Modelas más de diez entidades propias *(seguros, manufactura, logística, banca)* |
| 2 | **1 sandbox** — 200.000 registros; **el sync inicial trae solo 5.000 contactos** | Tienes gobernanza formal de cambios o auditoría regulatoria: **no puedes hacer UAT representativo** |
| 3 | 🔴 **HubSpot NO reclama ISO 27001 para sí** *(su infra cloud sí)*. **Sí tiene SOC 2 Type II + SOC 3** | Tu pliego exige **ISO 27001 del proveedor de software** |
| 4 | **Sin data residency en LATAM** *(solo US, Canadá, Australia, EU)* | Tu regulación exige que los datos vivan en tu país |
| 5 | **Sin jerarquía de roles ni territory management** | Eres una organización matricial global con visibilidad por territorio |
| 6 | **API: apps públicas OAuth topan en 110 req/10s — y el add-on no lo levanta** | Necesitas sync bidireccional en tiempo real con un ERP o un core bancario |
| 7 | **B2C masivo** — Ent a 500K+ = USD 60 por cada 10.000; envío capado a 20× | Tienes millones de contactos: **Adobe o Salesforce salen más baratos a esa escala** |
| 8 | **Solo 3 Breeze Agents en GA** | Esperas hoy una flota de agentes autónomos |

🔴 **`<table>` semántica, texto servido, sin acordeón.** En 390 px colapsa a **tarjetas completas** — **nunca se
pierde la columna de la fuente.**

### Contrato de datos (el que NO existe)

🔴 **Cero reader, cero command, cero endpoint, cero form.** **La página no toca el backend en absoluto.**

### Structured data

`FAQPage` *(cada límite **es** una pregunta)* + `Article` + `BreadcrumbList`.

### La conversación con Simón (Slice 5, bloquea el publish)

El marco: **esto es una herramienta de calificación, no un ataque.** Todos los límites son **públicos y de
fuente HubSpot**. Y el argumento que le importa a él: **vender a quien le sirve baja el churn** — que es el
problema #1 del programa de partners. 🎯 **Descalificar temprano sube el win rate y protege el libro.**

## Rollout Plan & Risk Matrix

Página nueva, sin backend, sin form, sin assets. **Riesgo técnico: mínimo.**
🎯 **El riesgo real es reputacional y de canal — y va en los dos sentidos.**

### Slice ordering hard rule

**Slice 1 (verificación + fuentes) bloquea a Slice 2.** 🔴 **Ningún límite se publica sin su fuente.**
🔴 **Slice 5 (aviso a Simón) bloquea el `publish`**, no el build.

### Risk matrix

| Riesgo | Prob. | Mitigación | Señal |
|---|---|---|---|
| 🔴 **Un límite exagerado o mal enunciado** *(sobre todo el de ISO 27001)* | **media** | Regla dura 1 y 4 · fuente al lado de cada límite · redacción quirúrgica revisada contra `SOURCES.md` | HubSpot o un cliente nos corrige → **se cae la página entera** |
| 🔴 **Un límite envejece** (HubSpot los sube) | **alta** *(es cuestión de tiempo)* | `as-of` visible + **revisión trimestral en el landing file** + el copy de "límite actualizado" ya previsto | Drift vs la doc de HubSpot |
| 🎯 **HubSpot / el PDM lo lee como ataque** | **media** | **Slice 5: avisar a Simón ANTES de publicar** · marco de **calificación**, no de ataque · todos los límites son **públicos y de fuente HubSpot** · argumento: **descalificar baja el churn**, que es el dolor del programa | Reacción del PDM |
| **Se lee como truco de psicología inversa** | media | Regla dura 3: la sección de contrapeso es obligatoria · registro sobrio, cero clickbait · **el CTA es suave y va al final** | Feedback / bounce |
| **Un competidor la usa contra HubSpot** *(y contra nosotros)* | baja | Es contenido **público y verificable**; el marco de calificación lo neutraliza. **Y el riesgo de NO publicarla —seguir vendiendo a quien no le sirve— es peor** | Menciones |
| Un enlace de fuente muere (404) | media | Assertion GVC sobre los enlaces + revisión trimestral | Link check |

### Rollback

| Slice | Rollback | Tiempo |
|---|---|---|
| 1-2 | N/A (verificación / copy) | — |
| 3-4 | Despublicar la página (`draft`) + purge Kinsta | <5 min |
| 5 | Revertir registry / landing file / matrix | <5 min |

> 🎯 **Rollback reputacional:** si un límite resulta mal enunciado, **no se edita en silencio**. Se corrige
> **y se anota la corrección en la página**. Una página que existe para ser confiable **no puede corregirse a
> escondidas** — eso es justo lo que hacen los que no lo son.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/servicios/hubspot/cuando-no-usar-hubspot/` responde **200**, cuelga del pillar, con breadcrumb.
- [ ] El `<h1>` es **"Cuándo NO usar HubSpot"** — la pregunta literal, sin suavizar.
- [ ] 🎯 **Los 8 límites están publicados**, cada uno con: **el límite · su fuente enlazada · "no lo uses si…"**.
- [ ] 🔴 **Cada límite reverificado en fuente primaria**, con marca de evidencia y **`as-of` visible**.
      **Ningún límite exagerado. Ninguno inventado.**
- [ ] 🔴 **El límite de ISO 27001 está enunciado con precisión:** *HubSpot no la reclama para sí mismo (su infra
      cloud sí); **sí tiene SOC 2 Type II + SOC 3**.* **Ni exagerado ni omitido.**
- [ ] 🔴 **Existe la sección de contrapeso** (*"y para esto, HubSpot es el mejor del mercado"*). **La página
      califica, no ataca.**
- [ ] **El cierre honesto está** (*"si estás en alguno de estos casos, no te vendemos HubSpot"*) y **devuelve al
      pillar**.
- [ ] 🔴 **No hay form de captura.** El único CTA es suave y va al final.
- [ ] 🔴 **Citabilidad sin JS:** un `fetch` sin JavaScript devuelve **los 8 límites completos** y sus capsules.
      🔴 **Ningún límite escondido detrás de un acordeón que dependa de JS.**
- [ ] 🔴 **Ningún claim prohibido en el DOM** (assertion GVC).
- [ ] **Todos los enlaces de fuente vivos** (sin 404). Enlace al pillar presente.
- [ ] 🎯 **Simón (PDM) avisado antes del publish**, con el marco de calificación. Registrado en el landing file.
- [ ] JSON-LD `FAQPage` + `Article` + `BreadcrumbList` válido (Rich Results Test).
- [ ] Copy es-LATAM neutro, **registro sobrio, cero clickbait**, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 + reduced-motion capturado **y mirado**. Sin scroll horizontal.
- [ ] `UI ready: yes` solo si `pnpm task:lint --task TASK-1402` queda sin findings.
- [ ] Landing registry + landing file + route-ownership matrix actualizados, **con el recordatorio de revisión
      trimestral de los límites**.

## Verification

`pnpm task:lint --task TASK-1402` · `pnpm ops:lint --changed` ·
`pnpm ui:wireframe-check|flow-check|motion-check --task TASK-1402` ·
Playwright/GVC live (1440 + 390; **assertion sin-JS con los 8 límites**; **assertion de claims prohibidos**;
**link check de las fuentes**) · Rich Results Test · HTTP 200 + breadcrumb + canonical.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con la carpeta · `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-1352 pillar · TASK-1401/1403/1404)
- [ ] Página registrada en route-ownership matrix + landing registry + landing file
- [ ] 🔴 **Recordatorio de revisión trimestral de los 8 límites** anotado en el landing file
- [ ] 🎯 **La conversación con Simón registrada** (qué se le dijo, qué respondió)

## Follow-ups

- 🎯 **Medir la citación, no el tráfico.** Esta página **no va a traer tráfico orgánico** (nadie busca *"cuándo
  no usar HubSpot"* en volumen) **y eso no es un fracaso: es el diseño.** Su métrica es **aparecer citada
  cuando alguien le pregunta a un LLM si le conviene HubSpot** → medir con el **AI Visibility Grader**
  (`src/lib/growth/ai-visibility/**`) usando la propia página como sujeto. **Dogfooding.**
- Versión **en-US** — el vacío de contenido es **global**, no solo hispano. Puede ser la página con más upside
  internacional del sitio.
- Usarla como **asset de outbound**: mandarle esta página a un prospecto es el movimiento más desarmante posible.

## Open Questions

- ¿La página lleva **fecha de última revisión visible por límite**, o **una sola arriba**?
  *(Recomendado: una arriba + la fecha de cada fuente en su enlace. Ocho fechas sueltas se ven paranoicas.)*
- ¿Se publica **en-US** desde el día uno? *(El upside es grande; el esfuerzo, bajo. Pero abre la puerta a que
  HubSpot corporate la vea antes que Simón. **Recomendado: es-LATAM primero, en-US después del feedback del PDM.**)*
