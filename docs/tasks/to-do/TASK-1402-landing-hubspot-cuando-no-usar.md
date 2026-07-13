# TASK-1402 — Artículo `/hubspot/cuando-no-usar-hubspot/`: **"Cuándo NO usar HubSpot"**

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
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `task/TASK-1402-articulo-cuando-no-usar-hubspot`

> **Cluster 1 de 2 del hub HubSpot que vive en el blog.** Pillar: **TASK-1352** (`/servicios/hubspot/`).
> **Arquitectura:** [PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) ·
> **SSOT de contenido:** [`HUBSPOT_HUB_LANDINGS_SPEC.md`](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 4.

## Delta 2026-07-13 — **de landing a artículo**

**Era** `/servicios/hubspot/cuando-no-usar-hubspot/` (landing). **Ahora es un post del blog:**
**`efeoncepro.com/hubspot/cuando-no-usar-hubspot/`** *(categoría `hubspot`, permalink `/%category%/%postname%/`)*.

**Tres razones, y las tres son de fondo, no de conveniencia:**

1. 🎯 **Una página dentro de `/servicios/` que dice *"no nos contrates para esto"* es estructuralmente rara.**
   Está en el directorio de lo que vendemos, pidiendo que no lo compres. **Como artículo es natural: es un
   experto publicando un análisis.** *(Y el lector — un escéptico profesional — lee la URL antes que el H1.)*
2. 🎯 **E-E-A-T: el artículo es MÁS citable que la página.** Autor + fecha + las ocho fuentes enlazadas.
   **La citación en LLMs es su única métrica** — nadie busca *"cuándo no usar HubSpot"* en volumen —
   y un análisis firmado y fechado pesa más que una página de servicio anónima.
3. 🎯 **Tiene dueño de mantenimiento.** Los 8 límites necesitan revisión trimestral. **El blog tiene Content
   Factory con write path gobernado. Una landing de servicio no tiene quién la mantenga.**

🔴 **Lo que NO cambia:** el contenido, las 8 reglas duras, la ausencia total de formulario, el contrapeso
obligatorio y el aviso a Simón antes de publicar. **Cambia la casa, no la tesis.**

## Summary

Publica el artículo que **ningún vendedor de HubSpot va a escribir jamás**: los **ocho límites documentados** de
HubSpot, en español, **con la fuente al lado de cada uno**, y el cierre honesto —
*"si estás en alguno de estos casos, no te vendemos HubSpot"*.

Es **la tesis del hub llevada a su extremo lógico**: un texto entero dedicado a decirte **cuándo no comprarnos**.
Y es, con diferencia, **lo más citable que vamos a publicar**: cuando alguien le pregunta a un LLM *"¿me conviene
HubSpot?"*, el modelo **necesita un contrapunto — y hoy no existe ninguno.** Todo el internet sobre HubSpot está
escrito **por HubSpot o por partners que quieren vendértelo.**

> **El primero que escriba la pieza honesta se lleva esa citación entera. Y el contenido ya está hecho.**

## Why This Task Exists

**1. Existe un vacío de contenido y es enorme.** Busca *"cuándo no usar HubSpot"* y encontrarás: (a) páginas de
HubSpot, (b) competidores diciendo que HubSpot es malo **porque quieren venderte lo suyo**, y (c) partners
diciendo que es perfecto. **Falta la única voz creíble: un partner de HubSpot diciendo dónde HubSpot no llega.**
Esa voz vale porque **va contra su propio interés**.

**2. RevOps no decide por features. Decide por miedo a migrar dos veces.** El escéptico del comité mata el deal
con *"¿y si nos quedamos cortos?"*. **El que dice el límite antes se gana el deal.** Es **un argumento de venta
disfrazado de renuncia** — y funciona porque **la renuncia es real**.

**3. Cuesta muy poco.** Los ocho límites **ya están verificados** en la skill (`SOURCES.md` +
`modules/10_DISCOVERY_SCOPING.md`). Sin research nuevo, sin art direction, sin backend, sin interacción.
**La mejor relación valor/esfuerzo del hub.**

## Goal

- Publicar **los ocho límites**, cada uno con **su fuente enlazada** y **su "no lo uses si…"**.
- Ser **el contrapunto que los LLMs necesitan** — y que hoy no encuentran en español.
- 🔴 **Ganarse credibilidad, no simular honestidad.** La honestidad es **exacta, no dramática**.
- Convertir al escéptico con un CTA **suave** — y devolverlo al pillar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- 🔴 **[PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md)** — la regla
  *"Efeonce solo se cita donde HubSpot no puede o no quiere hablar"*. **Este artículo es esa regla en estado puro.**
- **[PDR-003](../../public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md)** — el blog es la
  superficie de **demand-gen / autoridad**. 🎯 **Este texto no captura demanda: la crea.** Encaja por diseño.
- **[PDR-006](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)** —
  *evidencia antes que promesa*.
- **Skill `efeonce-public-site-wordpress`** → `references/content-factory-gutenberg.md` (**el write path del blog**).

## Normative Docs

- 🔴 `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md` § 4 — **la tabla de los 8 límites, verbatim.**
- 🔴 `.claude/skills/hubspot-solutions-partner/SOURCES.md` — **la fuente y la marca de evidencia de cada límite.
  Sin esto, el artículo no se escribe.**
- `.claude/skills/hubspot-solutions-partner/modules/10_DISCOVERY_SCOPING.md` — los 5 descalificadores.
- `.claude/skills/commercial-expert/frameworks/jolt-effect-indecision.md` — **el 40-60% de las pérdidas son
  indecisión, no competencia.**
- `docs/documentation/public-site/wordpress-blog-content-hub-search.md` — **taxonomía y permalinks del blog.**
- `docs/context/05_voz-tono-estilo.md` — voz y registro.

## 🔴 Reglas duras

**Contenido**

1. 🔴 **La honestidad es exacta, no dramática.** **NUNCA** exagerar un límite ni inventar uno para parecer más
   honestos. **Un límite exagerado es una mentira — y hunde el artículo entero**, que existe precisamente para
   ser la fuente confiable. *(La tentación es real: dramatizar hace mejor copy. **Acá mata el producto.**)*
2. 🔴 **Cada límite lleva su fuente enlazada.** La página oficial, la doc de developers, el knowledge base.
   🎯 **El enlace es lo único que separa esto de un post de opinión. No es cortesía académica: es la prueba.**
3. 🔴 **NO es un texto anti-HubSpot: es una pieza de calificación.** *"HubSpot no sirve para esto — y estas son
   las cosas para las que sí es el mejor del mercado"*. **El contrapeso es obligatorio.**
   🎯 **Un texto que solo ataca se lee como el competidor de siempre — y pierde justo lo que vino a ganar.**
4. 🔴 **ISO 27001, con precisión quirúrgica.** ✅ **HubSpot NO reclama ISO 27001 para sí mismo** (su página dice
   que la tiene su infra cloud — AWS). ✅ **Sí tiene SOC 2 Type II + SOC 3.**
   **Exagerarlo = mentimos. Omitirlo = le fallamos justo al lector que vino por esto.**
5. 🔴 **Claims prohibidos:** *"Líder en CRM según Gartner"* · Forrester Wave · ISO 27001 de HubSpot ·
   residencia LATAM · *"flota de agentes"*.
6. 🔴 **Nomenclatura 2026:** **Revenue Hub** · **Data Hub** · **UNBOUND**. HubSpot = **Agentic Customer Platform**.
7. 🔴 **Los límites tienen fecha.** HubSpot los sube. **`dateModified` + `as-of` visible + revisión trimestral.**
   🎯 **Un artículo que se actualiza y lo dice gana autoridad. Uno que envejece en silencio la pierde.**
8. 🔴 **Todo el contenido en el HTML servido. Ningún límite detrás de un acordeón.**
   *(Un límite plegado es un límite que el LLM no ve — y la citación es el activo.)*

**Formato (nuevo, del cambio a blog)**

9. 🔴 **Es un `post`, no una `page`.** Categoría **`hubspot`**. Permalink **`/hubspot/cuando-no-usar-hubspot/`**.
   **Gutenberg, no Elementor.**
10. 🔴 **Byline de una persona real, no "Equipo Efeonce".** 🎯 **El E-E-A-T es la mitad del argumento:**
    un análisis firmado por **alguien con la certificación de HubSpot Solutions Partner** pesa; uno anónimo, no.
    *(Ver Open Questions.)*
11. 🔴 **Schema `Article` con `author`, `datePublished` y `dateModified`** + `FAQPage`.
12. 🔴 **CERO captura.** Sin formulario, sin lead magnet, **sin pop-up, sin exit-intent, sin sticky bar**.
    🎯 **Cualquier patrón de retención acá es un dark pattern, porque contradice literalmente lo que el texto
    dice.** *(El blog puede tener un CTA global del tema: **verificar que no aparezca en este post.**)*

**Relación con HubSpot (riesgo de canal)**

13. 🎯 **Avisarle a Simón (PDM) antes de publicar.** No es opcional. **Y se defiende sola:** todos los límites son
    **públicos y de fuente HubSpot**; el marco es **calificación**, que es lo que HubSpot le pide a sus partners
    (**vender a quien le sirve baja el churn** — el problema #1 del programa).

## Dependencies & Impact

### Depends on

- 🔴 **Reverificación de los 8 límites + recopilación de sus fuentes** (Slice 1, bloqueante).
- 🔴 **La decisión del byline** (Open Questions) — **es parte del argumento, no un detalle**.
- 🎯 **El aviso a Simón (PDM)** — *no bloquea el build; **bloquea el publish***.
- El write path de Content Factory (`wpcli eval-file`) — **ya existe y está documentado**.

🎯 **No depende de ningún backend, form, agendador ni asset de diseño. Es la pieza más independiente del hub.**

### Blocks / Impacts

- 🎯 **Es el activo AEO #1 del hub** — el contrapunto que los LLMs necesitan y hoy no existe.
- Alimenta a TASK-1404 (**los límites son la mitad de ese argumento**) y a TASK-1401 (el límite B2C).
- **Sube el win rate** al descalificar temprano (JOLT) y **baja el churn** — el dolor del programa de partners.
- 🎯 **Le da el argumento de credibilidad a todo el resto del hub.**
- **Alimenta la categoría `hubspot` del blog**, que se vuelve un mini-hub editorial.

### Files owned

- Esta task · `docs/ui/wireframes/TASK-1402-landing-hubspot-cuando-no-usar.md`.
- El post de WordPress (`post`, categoría `hubspot`) · su fila en el registry de contenido.

## Current Repo State

### Already exists

- 🎯 **Los 8 límites, ya verificados**, en `hubspot-solutions-partner/SOURCES.md` +
  `modules/10_DISCOVERY_SCOPING.md`. **El contenido ya está hecho.**
- **La categoría `hubspot` ya existe** en el blog (junto a `hubspot/crm`).
- **El write path de Content Factory** (`references/content-factory-gutenberg.md`) — publica posts Gutenberg.
- El pillar en diseño (TASK-1352).

### Gap

- El artículo no existe · el copy sin draftear.
- 🔴 **Los enlaces a la fuente de cada límite sin recopilar** *(sin fuente, no hay límite)*.
- 🔴 **El byline sin decidir.** El aviso a Simón sin hacer · JSON-LD sin definir.

## Modular Placement Contract

- Topology impact: `public`
- Current home: WordPress en Kinsta; `post` en Gutenberg, categoría `hubspot`, permalink `/hubspot/cuando-no-usar-hubspot/`.
- Future candidate home: `public`
- Boundary: el artículo no consume ningún contrato del repo; es contenido editorial puro con enlaces externos a la documentación de HubSpot y un enlace de vuelta al pillar.
- Server/browser split: `n/a` — contenido estático servido por WordPress; cero secretos, cero DB, cero form, cero JavaScript propio.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite` 🎯 **(bajó de `ui-standard` al pasar a blog: el tema del blog ya resuelve tipografía,
  jerarquía, ancho de lectura y responsive. Lo único con requisito propio es la tabla de los 8 límites.)**
- Usuario / rol: **(1) RevOps/IT**, el escéptico del comité · **(2) el equipo de seguridad**, que llegó buscando
  *"HubSpot ISO 27001"* · **(3) el LLM**, que necesita un contrapunto que hoy no existe.
- Momento del flujo: *"todo lo que leo sobre HubSpot lo escribió alguien que quiere vendérmelo — incluido el que
  dice que es malo."*
- Resultado perceptible esperado: **no equivocarse.** Saber si va a chocar contra un techo **antes de firmar**.
- Fricción que debe reducir: el **miedo a migrar dos veces**.
- No-goals UX: 🔴 **no captura** · no compara con competidores (**→ TASK-1404**) · **no ataca a HubSpot**.

### Surface & system decision

- Surface: **post de WordPress**, categoría `hubspot`, `/hubspot/cuando-no-usar-hubspot/`. **Gutenberg.**
- Composition Shell: `no aplica`.
- Primitive decision: `reuse` — **bloques Gutenberg nativos** (heading, párrafo, tabla, lista, cita).
  🎯 **Cero bloques custom, cero CSS de página, cero Elementor.** *(El artículo hereda el tema del blog, y eso
  es exactamente lo que lo hace verse como un análisis y no como una landing.)*
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: 🔴 **ninguno. Y se verifica** — el tema del blog **no puede inyectar un
  pop-up ni un sticky CTA en este post**.
- Copy source: contenido del post. 🔴 **Registro sobrio, cero clickbait.**
- Access impact: `none`.

### State inventory

- Default: todo visible. 🔴 **Sin JS es idéntico** — no hay nada de qué degradar.
- Loading / Empty / Error / Permission denied: `n/a` — **no hay form ni estado async.**
- Degraded / partial: **una fuente muere (404)** → se cita **el documento con su fecha**.
  🔴 **Ningún límite se queda sin respaldo.**
- Long content: la tabla de 8 límites scrollea **dentro de su contenedor**.
- Mobile / compact (390 px): la tabla **colapsa a tarjetas** — 🔴 **cada tarjeta conserva las 3 columnas**
  (límite + fuente + *"no lo uses si…"*). **Perder la fuente en móvil sería perder el argumento en móvil.**
- Keyboard / focus: los 8 enlaces de fuente tabulables, con **texto descriptivo** (nunca *"aquí"*).
- Reduced motion: **idéntico** *(no hay motion propio; el tema no anima contenido)*.
- 🎯 **`dateModified` actualizado:** el artículo **dice cuándo se revisó**. Un texto que se mantiene **gana**
  autoridad; uno que envejece en silencio la pierde.
- 🎯 **Un límite fue superado por HubSpot:** *"HubSpot subió este límite en {fecha}. Lo dejamos acá porque muchos
  comparadores siguen citando el viejo."* **Que HubSpot mejore no rompe el artículo: demuestra que lo mantenemos.**

### Interaction contract

- Primary interaction: **leer.** 🔴 **Cero interacciones. Ningún trigger revela contenido.**
- Hover / focus / active: el del tema (enlaces subrayados, focus ring).
  🎯 **El `visited` de los enlaces de fuente se mantiene visible** — quien audita 8 fuentes **necesita saber
  cuáles ya comprobó**.
- Pending / disabled / Escape / click-away / Focus restore / Toast: `n/a`.
- 🔴 **Prohibido:** exit-intent, sticky bar, pop-up, scroll gate, banner de suscripción **dentro de este post**.

### Motion & microinteracciones

- Motion primitive: 🔴 **`none`.** El tema del blog resuelve hover y focus. **No se agrega ni una animación.**
- Enter / exit / Layout morph / Stagger: **ninguno.**
- Timing / easing token: los del tema.
- Reduced-motion fallback: **idéntico** (no hay motion que reducir).
- 🔴 **Non-goal motion (guardrail heredado, y es una regla, no una preferencia):** **cero reveals por scroll**
  *(dosificar el contenido es lo contrario de lo que el texto promete — **y borra los límites para el crawler**)*
  · **cero contadores** · **cero acordeones sobre los límites** *(en un FAQ el disclosure es cortesía; **en una
  lista de límites es ocultamiento**, y es la acusación que el propio texto le hace al mercado)*.
  🎯 **Por eso esta task declara `Motion: none`: no es que el motion sea "poco", es que su ausencia es el diseño.**

### Implementation mapping

- Route / surface: `post` WordPress, categoría `hubspot`, Gutenberg. **Vía Content Factory (`wpcli eval-file`).**
- Primitive / variant / kind: `reuse` — **bloques Gutenberg nativos**.
- Component candidates: `core/heading` · `core/paragraph` · **`core/table`** (los 8 límites) · `core/list` ·
  `core/quote`. 🔴 **Sin bloques custom. Sin CSS de página.**
- Copy source: contenido del post.
- Data reader / command: 🔴 **NINGUNO.** Los 8 límites son **contenido editorial verificado**.
- API parity: `n/a` — **el artículo no toca el backend en absoluto.**
- Access / capability: `none`.
- States to implement: default · 390 px (tarjetas completas) · fuente muerta · límite superado · `dateModified`.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-blog-cuando-no-usar-hubspot.*`
- Route: `/hubspot/cuando-no-usar-hubspot/` · Viewports: **1440 + 390**
- Required steps: cargar → scroll → 🎯 **capturar la tabla de los 8 límites completa** → tabular por los 8
  enlaces de fuente → verificar el colapso a tarjetas en 390 px → click al pillar.
- Required captures: full-page (desktop + mobile) · 🎯 **la tabla** · **la sección de seguridad** ·
  **la sección de contrapeso** · **tarjetas en 390 px** · **el byline + la fecha**.
- Required `data-capture` markers: `n/a` *(post Gutenberg — se captura por selector de bloque)*.
- Assertions:
  - 🔴 **Sin JS:** los **8 límites completos** (sus 3 columnas) + el TL;DR **en el HTML servido**.
  - 🔴 **Ningún límite oculto** (acordeón / `hidden` / `opacity:0`).
  - 🔴 **Los 8 enlaces de fuente responden** (link check) y tienen **texto descriptivo**.
  - 🔴 **La sección de contrapeso existe** *(assertion literal)*.
  - 🔴 **Sin claims prohibidos**; 🎯 **y `SOC 2` SÍ aparece**.
  - 🔴 **No existe ningún `<form>`, pop-up, exit-intent ni sticky bar** en la página *(incluido el chrome del tema)*.
  - 🔴 **`author`, `datePublished` y `dateModified` presentes** en el JSON-LD **y visibles en el post**.
  - **Enlace al pillar presente** · canonical `/hubspot/cuando-no-usar-hubspot/`.
- Scroll-width checks: sin scroll horizontal de página; la tabla scrollea dentro de su contenedor.
- Reduced-motion / focus evidence: tabulación de los 8 enlaces con ring visible y `visited` distinguible.

### Design decision log

- 🎯 **Decisión: es un artículo, no una landing.** Una página en `/servicios/` que dice *"no nos contrates"* está
  en el directorio de lo que vendemos pidiendo que no lo compres — **el lector lee la URL antes que el H1**.
  Como artículo firmado y fechado, **es un experto publicando un análisis** — y eso **es más citable**, que es su
  única métrica. **Alternativa descartada:** *landing bajo el pillar* — estructuralmente rara, **sin dueño de
  mantenimiento**, y con menos E-E-A-T.
- 🎯 **Decisión: el artículo no captura. Sin form. Ninguno.** El lector es un **escéptico profesional** que llegó
  buscando a alguien sin incentivo. Un formulario **revela que la honestidad era el anzuelo**.
  **Alternativa descartada:** *lead magnet "descarga el checklist de descalificación"* — convierte más y
  **destruye el único activo del texto, que es no querer nada**.
- 🎯 **Decisión: la sección de contrapeso es obligatoria.** Sin ella se lee como **el competidor de siempre** y
  **deja de servir como contrapunto** — que es su función.
- 🎯 **Decisión: byline de persona real, con la credencial.** El E-E-A-T **es la mitad del argumento**: un análisis
  firmado por alguien **certificado por HubSpot** que dice dónde HubSpot no llega **no se puede fingir**.
- **Decisión: bloques Gutenberg nativos, cero CSS de página.** 🎯 **Que se vea como el resto del blog es parte
  del argumento:** un "artículo" con dirección de arte de landing **delata que es una landing disfrazada**.
- **Decisión: `Motion: none` y `Flow: none`, declarados.** No hay flujo que coordinar (sin form, sin overlay, sin
  navegación cruzada) y **la ausencia de motion es el diseño** (un reveal por scroll dosifica el contenido y
  borra los límites para el crawler). **No son stubs: son decisiones con razón escrita.**
- **JOLT:** la indecisión de RevOps es **miedo a migrar dos veces**. **Se desarma dándole exactamente lo que
  buscaba y no encontraba en ninguna parte.**

### Visual verification

- GVC scenario: `public-blog-cuando-no-usar-hubspot` · Viewports 1440 + 390.
- Required captures / markers: ver *GVC scenario plan*.
- Scroll-width check: sin scroll horizontal de página.
- Accessibility/focus checks: tabla semántica alcanzable por teclado; los 8 enlaces con texto descriptivo y
  anuncio de externo **no solo por color**; contraste AA.
- Before/after evidence: `n/a` (post nuevo).
- Known visual debt: 🔴 **verificar que el chrome del tema no inyecte un CTA/pop-up global en este post.**

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

**Sin fuente, no hay límite. Sin límite verificado, no hay artículo.**

Para cada uno: **reverificar** en fuente primaria, **anotar la URL** y **marcar la evidencia**:

1. **10 custom objects** máximo ✅
2. **1 sandbox** — 200.000 registros; **el sync inicial trae solo 5.000 contactos** ✅
3. 🔴 **HubSpot no reclama ISO 27001 para sí mismo** (solo su infra AWS) · ✅ **SOC 2 Type II + SOC 3**
4. **Sin data residency en LATAM** ✅
5. **Sin jerarquía de roles ni territory management** ✅
6. **API:** apps públicas OAuth topan en **110 req/10s**; **el add-on no lo levanta** ✅
7. **B2C masivo:** Ent a 500K+ = **USD 60 por cada 10.000**; envío capado a **20×** ✅
8. **Solo 3 Breeze Agents en GA** ✅

🎯 **Si alguno cambió, el artículo lo dice — y eso también es contenido.**

### Slice 2 — Copy final (`copywriting` + `greenhouse-ux-writing`)

- Copy ledger completo (ver wireframe). 🔴 **Registro sobrio.** **Cero clickbait.**
- **Answer capsule por sección** (40-60 palabras) — **es lo que el LLM extrae y cita**.
- 🔴 **Decidir el byline** y escribir la bio de autor (con la credencial).

### Slice 3 — Publicación (Content Factory / Gutenberg)

- Post en Gutenberg vía `wpcli eval-file`. Categoría **`hubspot`**. Slug `cuando-no-usar-hubspot`.
- 🎯 **La tabla de los 8 límites** como `core/table`: **límite · fuente (enlace) · "no lo uses si…"**.
  🔴 **Sin acordeón.**
- El contrapeso · el cierre honesto · **el enlace al pillar**.
- 🔴 **Verificar que el tema no inyecte pop-up/sticky CTA en este post.**

### Slice 4 — AEO + schema

- JSON-LD **`Article`** (`author`, `datePublished`, `dateModified`) + **`FAQPage`** *(cada límite **es** una
  pregunta)* + `BreadcrumbList`.
- Yoast: title, meta, canonical. Enlaces internos: **pillar (obligatorio)** · TASK-1404 · TASK-1401.

### Slice 5 — 🎯 Aviso a Simón (PDM) + publish + verificación

- 🔴 **El aviso al PDM va ANTES del publish.**
- GVC + assertions (sin-JS · sin claims prohibidos · enlaces de fuente vivos · **sin form/pop-up** · byline y
  fechas presentes). Purge Kinsta.
- 🔴 **Registrar el recordatorio de revisión trimestral** y **declarar a Content Factory como dueño**.

## Out of Scope

- **Cualquier form de captura.**
- Comparativas con competidores (**→ TASK-1404**) · agentes (**→ TASK-1403**) · precios (**→ TASK-1401**).
- Variante `en-US` — 🎯 **pero ver Follow-ups: el vacío en inglés es global, y puede ser el mayor upside del sitio.**

## Detailed Spec

### Estructura del artículo

Detalle completo en `docs/ui/wireframes/TASK-1402-landing-hubspot-cuando-no-usar.md`. El arco:

`H1: Cuándo NO usar HubSpot` → 🎯 **por qué este artículo existe** *(nombramos nuestro propio conflicto de
interés en voz alta — es lo que lo desactiva)* → TL;DR (los 8 en una frase) → 🎯 **LOS OCHO LÍMITES (la tabla)** →
**ISO 27001, en detalle** → 🎯 **el contrapeso** *(y para esto sí es el mejor)* → cómo saber en cuál estás →
**el cierre honesto** → **enlace al pillar** *(la única puerta de vuelta)*.

### La tabla de los 8 límites

Cada fila: **el límite · la fuente (enlace) · "no lo uses si…"**.
🎯 **Cada fila es autosuficiente y citable de forma aislada** — es lo que un LLM extrae.
🔴 **`core/table`, texto servido, sin acordeón.** En 390 px colapsa a **tarjetas completas** — **nunca se pierde
la columna de la fuente**.

### Structured data

`Article` (**con `author` + `datePublished` + `dateModified`** — 🎯 **el `dateModified` es la prueba de que se
mantiene**) + `FAQPage` + `BreadcrumbList`.

### El enlace al pillar

🔴 **Obligatorio, y ahora más que antes:** como el artículo vive fuera de `/servicios/hubspot/`, **es la única
puerta de vuelta al hub.** Un texto que te dice *"no compres"* y te deja en el vacío **es una puerta cerrada**;
el que te devuelve al pillar dice *"entonces veamos si tu caso sí calza"*.

### La conversación con Simón (Slice 5, bloquea el publish)

El marco: **esto es una herramienta de calificación, no un ataque.** Todos los límites son **públicos y de fuente
HubSpot**. Y el argumento que le importa: **vender a quien le sirve baja el churn** — el problema #1 del programa.

## Rollout Plan & Risk Matrix

Post nuevo, sin backend, sin form, sin assets. **Riesgo técnico: mínimo.**
🎯 **El riesgo real es reputacional y de canal.**

### Slice ordering hard rule

**Slice 1 (verificación + fuentes) bloquea a Slice 2.** 🔴 **Ningún límite se publica sin su fuente.**
🔴 **Slice 5 (aviso a Simón) bloquea el `publish`**, no el build.

### Risk matrix

| Riesgo | Prob. | Mitigación | Señal |
|---|---|---|---|
| 🔴 **Un límite exagerado o mal enunciado** *(sobre todo ISO 27001)* | **media** | Reglas duras 1 y 4 · fuente al lado · redacción revisada contra `SOURCES.md` | **Se cae el artículo entero** |
| 🔴 **Un límite envejece** | **alta** | `dateModified` + revisión trimestral + **Content Factory como dueño** | Drift vs la doc |
| 🎯 **HubSpot / el PDM lo lee como ataque** | **media** | **Aviso previo** · marco de **calificación** · límites **públicos y de fuente HubSpot** · **descalificar baja el churn** | Reacción del PDM |
| **Se lee como truco de psicología inversa** | media | Contrapeso obligatorio · registro sobrio · **CTA suave al final** | Feedback |
| 🔴 **El tema del blog inyecta un pop-up/sticky CTA** | **media** | **Assertion GVC explícita.** 🎯 **Un pop-up acá destruye el artículo** — dice *"no te vendemos"* mientras te persigue con un banner | GVC |
| Un enlace de fuente muere | media | Assertion GVC + revisión trimestral | Link check |

### Rollback plan per slice

| Slice | Rollback | Tiempo |
|---|---|---|
| 1-2 | N/A | — |
| 3-4 | Despublicar el post (`draft`) + purge Kinsta | <5 min |
| 5 | Revertir registry | <5 min |

> 🎯 **Rollback reputacional:** si un límite resulta mal enunciado, **se corrige y se anota la corrección en el
> artículo** (`dateModified` + nota). 🔴 **NUNCA en silencio.** Un texto que existe para ser confiable **no puede
> corregirse a escondidas** — eso es justo lo que hacen los que no lo son.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El post responde **200** en `/hubspot/cuando-no-usar-hubspot/` (categoría `hubspot`, Gutenberg).
- [ ] El `<h1>` es **"Cuándo NO usar HubSpot"** — la pregunta literal, **sin suavizar**.
- [ ] 🎯 **Los 8 límites publicados**, cada uno con **límite · fuente enlazada · "no lo uses si…"**.
- [ ] 🔴 **Cada límite verificado en fuente primaria**, con `as-of`. **Ninguno exagerado. Ninguno inventado.**
- [ ] 🔴 **ISO 27001 enunciado con precisión** (no lo reclama para sí · su infra sí · **SOC 2 Type II + SOC 3 sí**).
- [ ] 🔴 **La sección de contrapeso existe.** **El artículo califica, no ataca.**
- [ ] 🔴 **No existe ningún `<form>`, pop-up, exit-intent ni sticky bar** *(incluido el chrome del tema)*.
- [ ] 🔴 **Sin JS el artículo se lee entero**, con los 8 límites y sus 3 columnas. **Ningún acordeón.**
- [ ] 🔴 **Byline de persona real con su credencial** + **`author`/`datePublished`/`dateModified` en el JSON-LD**
      y visibles en el post.
- [ ] **Todos los enlaces de fuente vivos**, con texto descriptivo. 🔴 **Enlace al pillar presente** *(única
      puerta de vuelta)*.
- [ ] En 390 px la tabla colapsa a **tarjetas completas** (nunca se pierde la columna de la fuente).
- [ ] JSON-LD `Article` + `FAQPage` + `BreadcrumbList` válido (Rich Results Test).
- [ ] Ningún claim prohibido. **Y `SOC 2` sí aparece.**
- [ ] 🎯 **Simón (PDM) avisado antes del publish**, con el marco de calificación. Registrado.
- [ ] Copy es-LATAM neutro, **registro sobrio, cero clickbait**, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 capturado **y mirado**. Sin scroll horizontal.
- [ ] `UI ready: yes` solo si `pnpm task:lint --task TASK-1402` queda sin findings.
- [ ] 🔴 **Content Factory declarado como dueño del mantenimiento** + **recordatorio trimestral registrado**.

## Verification

`pnpm task:lint --task TASK-1402` · `pnpm ops:lint --changed` ·
`pnpm ui:wireframe-check --task TASK-1402` ·
Playwright/GVC live (1440 + 390; **assertion sin-JS con los 8 límites**; **assertion de claims prohibidos**;
**assertion sin form/pop-up**; **link check de las fuentes**) · Rich Results Test · HTTP 200 + canonical.

## Closing Protocol

- [ ] `Lifecycle` sincronizado · `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-1352 pillar · TASK-1401/1403/1404 · **PDR-013 y el SPEC**)
- [ ] 🔴 **Recordatorio de revisión trimestral de los 8 límites** + **Content Factory como dueño**
- [ ] 🎯 **La conversación con Simón registrada** (qué se le dijo, qué respondió)

## Follow-ups

- 🎯 **Medir la citación, no el tráfico.** Este artículo **no va a traer tráfico orgánico** (nadie busca *"cuándo
  no usar HubSpot"* en volumen) **y eso no es un fracaso: es el diseño.** Su métrica es **aparecer citado cuando
  alguien le pregunta a un LLM si le conviene HubSpot** → medir con el **AI Visibility Grader**. **Dogfooding.**
- 🎯 **Versión `en-US` — puede ser el mayor upside internacional del sitio.** El vacío de contenido es **global**,
  y **la citación en LLM no depende de autoridad de dominio** (el SERP sí, y ahí no competimos).
- Usarlo como **asset de outbound**: mandarle esta pieza a un prospecto es el movimiento más desarmante posible.

## Open Questions

- 🔴 **¿Quién firma?** 🎯 **Tiene que ser una persona con la certificación de HubSpot Solutions Partner** — el
  E-E-A-T es la mitad del argumento, y *"Equipo Efeonce"* no tiene credencial. *(Recomendado: quien tenga la
  certificación, con bio corta que la nombre.)*
- ¿Fecha de revisión **visible por límite** o **una sola arriba**? *(Recomendado: **una arriba + `dateModified`**;
  ocho fechas sueltas se ven paranoicas.)*
- ¿Se publica **en-US** desde el día uno? *(Recomendado: **es-LATAM primero, en-US después del feedback del PDM** —
  publicar en inglés primero lo pone frente a HubSpot corporate antes que frente a Simón.)*
