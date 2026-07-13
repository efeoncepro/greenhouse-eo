# TASK-1404 — Cluster `/servicios/hubspot/hubspot-vs-salesforce/`: **la comparación que ninguno de los dos te va a dar**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1404-landing-hubspot-vs-salesforce.md`
- Flow: `docs/ui/flows/TASK-1404-landing-hubspot-vs-salesforce-flow.md`
- Motion: `docs/ui/motion/TASK-1404-landing-hubspot-vs-salesforce-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `task/TASK-1404-landing-hubspot-vs-salesforce`

> **Cluster 4 de 4** del hub HubSpot. Pillar: **TASK-1352** (`/servicios/hubspot/`).
> **Arquitectura:** [PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) ·
> **SSOT de contenido:** [`HUBSPOT_HUB_LANDINGS_SPEC.md`](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 5 ·
> **Dominio:** skill `hubspot-solutions-partner` → `modules/05_DISPLACEMENT.md` + `templates/tco-3y.md`.
>
> 🔴 **Es la única página del hub que habla de un competidor. Eso trae obligaciones legales concretas** —
> ver reglas duras 9-10 y la dependencia con `legal-privacy-ip-operator`.

## Summary

Construye **`/servicios/hubspot/hubspot-vs-salesforce/`**: la comparación **creíble** donde los dos vendors son
parte interesada. Para el comité que está decidiendo — **CFO, RevOps y CIO**.

**Abre con la verdad incómoda para nuestro propio lado:** **Gartner puso a HubSpot en Niche Players** del MQ de
*Sales Force Automation* 2025; los Leaders son **Salesforce, Microsoft y Oracle**. *(Y HubSpot **es** Leader del
MQ de **B2B Marketing Automation**, 5.º año consecutivo. **Son dos reportes distintos** — y la mitad de los
partners los mezcla, a propósito.)*

Después, **el TCO a 3 años con supuestos declarados** (HubSpot ≈ USD 295k · Salesforce ≈ USD 611k, 30 usuarios,
lista sin descuento) — **y la honestidad que nadie pone: el delta no lo hace la licencia** (USD 162k vs 189k =
**solo 17%**). **Lo hace el admin.** 🎯 ***"Si ya tienes un admin de Salesforce en planilla, la mitad de este
argumento se te cae."***

Y cierra con **dónde gana Salesforce, sin adornos** · **dónde gana HubSpot** · **Agentforce vs Breeze** ·
**qué se rompe al migrar**.

## Why This Task Exists

**1. El comité ya vio el Magic Quadrant, y nosotros salimos mal.** El AE de Salesforce **va a llegar con el MQ
de SFA impreso** — y tiene razón. **Si no lo decimos nosotros primero, nos lo dicen a nosotros.**
🎯 **La única forma de sobrevivir a un dato que juega en tu contra es traerlo tú, con contexto.** Y el contexto
existe y es real: **son dos reportes distintos, y HubSpot lidera el otro.**

**2. El argumento del TCO, como lo usa el mercado, es deshonesto — y frágil.** Todos los partners muestran
*"HubSpot cuesta la mitad"*. **Lo que casi nadie dice es que la diferencia no está en la licencia** (17%),
**sino en el costo del administrador**. Y ese argumento **se cae entero si el cliente ya tiene un admin de
Salesforce en planilla**. 🎯 **Decirlo antes de que el CFO lo descubra solo nos hace la única fuente creíble
de la mesa** — y nos ahorra perder el deal en la última reunión.

**3. Es la página que un LLM necesita para responder "¿HubSpot o Salesforce?".** Hoy solo encuentra a los dos
vendors y a partners de cada lado. **Falta la comparación con supuestos declarados.**

## Goal

- Ser **creíble donde los dos vendors son parte interesada** — abriendo con lo que juega en nuestra contra.
- Publicar **un TCO con supuestos declarados** y **su límite honesto** (el admin).
- **Decir dónde gana Salesforce, sin adornos.** *(Una comparación que gana en las 6 dimensiones no es una
  comparación: es un folleto — y el comité lo sabe.)*
- Convertir: **"te armamos el TCO con tus números"** → reunión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

**Normativos:**

- 🔴 **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 5** — las 6 secciones y qué **no** dice.
- 🔴 **Skill `hubspot-solutions-partner` → `modules/05_DISPLACEMENT.md`** (battlecards + TCO 3 años + **los mitos
  que te hacen perder**) + **`templates/tco-3y.md`** + **`SOURCES.md` § *Datos que NO se citan***.
- **Skill `commercial-expert`** — `frameworks/command-of-the-message.md` (anclar a capacidades requeridas y
  outcomes, **no a listas de features**) + `negotiation/objection-handling.md`.
- 🔴 **Skill `legal-privacy-ip-operator`** — **publicidad comparativa**. Es la única página del hub con
  exposición legal real (regla dura 9).
- **[PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md)** ·
  **[PDR-006](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)**.

## Normative Docs

- 🔴 `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md` § 5 — **las 6 secciones y qué NO dice.**
- 🔴 `.claude/skills/hubspot-solutions-partner/modules/05_DISPLACEMENT.md` — battlecards + el TCO a 3 años +
  **los mitos que te hacen perder**.
- 🔴 `.claude/skills/hubspot-solutions-partner/templates/tco-3y.md` — la plantilla del TCO con sus supuestos.
- 🔴 `.claude/skills/hubspot-solutions-partner/SOURCES.md` § *Datos que NO se citan* — **el MQ verificado.**
- `.claude/skills/commercial-expert/frameworks/command-of-the-message.md` — anclar a **capacidades requeridas y
  outcomes**, no a listas de features.
- 🔴 **Skill `legal-privacy-ip-operator`** — **publicidad comparativa.** Pasada obligatoria antes del publish.

## 🔴 Reglas duras

**El dato**

1. 🔴 **Se abre con el dato que juega en nuestra contra.** **Gartner: HubSpot = Niche Player** en el MQ de
   *Sales Force Automation* 2025 (Leaders: Salesforce, Microsoft, Oracle) ✅.
   **Y el contexto, que es cierto:** HubSpot **es Leader** en el MQ de **B2B Marketing Automation**, 5.º año ✅.
   🎯 **Son dos reportes distintos. Decirlo así es lo que nos hace creíbles.**
   🔴 **NUNCA** *"Líder en CRM según Gartner"* — es falso y **verificable en dos minutos**.
2. 🔴 **NUNCA citar el Forrester Wave 2026.** **No es verificable** — la propia landing de HubSpot que lo
   promociona cita, al abrirla, el Wave de **Q3 2024**.
3. 🔴 **El TCO lleva TODOS sus supuestos declarados, arriba y visibles:** 30 usuarios · **lista sin descuento** ·
   3 años · qué incluye y qué no. **Un TCO sin supuestos es propaganda con decimales.**
4. 🎯 **El límite del TCO se declara en la misma región, no en una nota al pie:** *"el delta no lo hace la
   licencia (USD 162k vs 189k = 17%). **Lo hace el admin.** Si ya tienes un admin de Salesforce en planilla,
   **la mitad de este argumento se te cae.**"* 🔴 **Esta frase no se suaviza ni se mueve al final.**
5. 🔴 **NUNCA *"Pardot está muerto"*** ni ninguna afirmación falsa sobre Salesforce. **Es falso, es verificable
   en nuestra contra, y nos borra la credibilidad de la página entera** *(que es lo único que la página tiene)*.
6. 🔴 **Ningún dato de Salesforce sin verificar.** ⚠️ **Su sitio bloquea el fetch programático** → **abrir la
   página en un navegador real y guardar screenshot con fecha.** Los datos sin verificar **no se publican**.
7. 🔴 **Se dice dónde gana Salesforce, sin adornos:** CPQ complejo · territorios · forecasting multinivel ·
   extensibilidad (Apex, AppExchange) · modelos de datos B2B muy complejos.
   🎯 **Una comparación que gana en las 6 dimensiones no es una comparación: es un folleto. Y el comité lo sabe.**
8. 🔴 **Claims prohibidos** del hub + **nomenclatura 2026**.

**Legal (la única página del hub con esta exposición)**

9. 🔴 **Publicidad comparativa: se rige por reglas, no por ganas.** En Chile y en la mayoría de LATAM, la
   comparación con un competidor **debe ser objetiva, verificable y no engañosa**, y **no puede denigrar** al
   competidor. Traducción operativa:
   - **Todo claim comparativo cita su fuente y su fecha.**
   - **Cero adjetivos denigrantes** sobre Salesforce (*"caro"*, *"pesado"*, *"obsoleto"*, *"un dinosaurio"*).
     🎯 **Los hechos, sin editorializar: "USD 189k a 3 años" no es un insulto. "Carísimo" sí.**
   - **Cero uso de marcas ajenas más allá de la mención nominativa** (nombrar para comparar es legítimo;
     **usar su logo, su tipografía o su identidad, no**).
   - 🔴 **Antes de publicar, pasada de `legal-privacy-ip-operator`.** *(Es orientación, no asesoría legal — pero
     la revisión no es opcional.)*
10. 🎯 **La página se escribe asumiendo que un abogado de Salesforce la va a leer.** Y **también asumiendo que
    la va a leer el AE de Salesforce que compite con nosotros por el deal.** 🎯 **Si al leerla él no puede
    señalar ni un solo error, ganamos** — porque entonces el comité tampoco puede.

**Build**

- Ohio nativo bajo el pillar. CSS page-scoped. `Document::save()`. Snapshot + purge + rollback.
- **Sin logos de Salesforce.** Texto. **Full API Parity por reuso.** **es-LATAM neutro.**
- **Hereda el motion contract del pillar.** Tier **restraint**.

## Dependencies & Impact

### Depends on

- 🔴 **Verificación manual de los datos de Salesforce** — ⚠️ **su sitio bloquea el fetch programático** →
  **navegador real + screenshot fechado + archivado** (Slice 1, bloqueante).
- 🔴 **Pasada de `legal-privacy-ip-operator`** (Slice 2) — **bloquea el publish**, no el build.
- Reverificación de precios de HubSpot + del MQ · `<greenhouse-form>` + Meetings (reuso) · CORS `/servicios/*`.

### Blocks / Impacts

- **Arma al equipo comercial para el comité.** 🎯 **Es el asset que se le manda a un CFO antes de la reunión
  decisiva** — llega diciendo lo que juega en nuestra contra.
- Alimenta a `/precios/` (el TCO) y a `/cuando-no-usar-hubspot/` (**"dónde gana Salesforce" es la mitad de esos
  límites**).

### Files owned

- Esta task · `docs/ui/wireframes/TASK-1404-*` · `docs/ui/flows/TASK-1404-*` · `docs/ui/motion/TASK-1404-*`.
- La página WordPress nueva · su scenario GVC · su fila en el landing registry · **los screenshots fechados de
  Salesforce** (evidencia interna, archivada, **no publicada**).

## Current Repo State

### Already exists

- `modules/05_DISPLACEMENT.md` (battlecards + el TCO a 3 años + **los mitos que te hacen perder**) ·
  `templates/tco-3y.md` · `SOURCES.md` con **el MQ verificado** (SFA = Niche · B2B MA = Leader).
- El patrón de build bajo `/servicios/` (TASK-1343) · Growth Forms.

### Gap

- La página no existe · el copy sin draftear · JSON-LD sin definir.
- 🔴 **Los datos de Salesforce sin verificar en navegador real** (sin screenshots fechados).
- 🔴 **La pasada legal sin hacer.**

## Modular Placement Contract

- Topology impact: `public`
- Current home: sitio público WordPress/Ohio en Kinsta; página nueva bajo el pillar `/servicios/hubspot/`.
- Future candidate home: `public`
- Boundary: la landing es consumer del renderer público de Growth Forms y del agendador HubSpot Meetings; el TCO es contenido editorial verificado, no un cálculo en vivo.
- Server/browser split: `n/a` — sitio público sin Client Components de portal; cero secretos, cero SDK, cero DB, cero librería de charts.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: 🎯 **el comité que decide — tres cabezas con tres criterios:** **el CFO** (le importa el número
  a 3 años, **y va a auditar los supuestos**) · **RevOps** (le importa si se van a quedar cortos) · **el CIO**
  (extensibilidad y riesgo de migración; **probablemente ya tiene Salesforce en la casa**).
- Momento del flujo: *"tengo dos vendedores diciéndome cosas opuestas y los dos tienen un PDF que lo prueba."*
- Resultado perceptible esperado: 🎯 **poder defender la decisión ante su directorio sin quedar expuesto.**
  **No está eligiendo un CRM: está protegiendo su carrera.**
- Fricción que debe reducir: el miedo a que **el vendedor le esté ocultando algo** — que es el miedo por defecto
  de un comité, **y el correcto**.
- No-goals UX: no compara con Microsoft/Zoho/Pipedrive/Odoo · **no denigra a Salesforce** · no publica una
  calculadora de TCO.

### Surface & system decision

- Surface: `efeoncepro.com/servicios/hubspot/hubspot-vs-salesforce/`.
- Composition Shell: `no aplica` (sitio público).
- Primitive decision: `reuse` — section header + `<table>` + `<greenhouse-form>`. **Cero primitives nuevas.**
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: **ninguno.**
- Copy source: contenido de página pública. 🔴 **Registro técnico y frío. CERO adjetivos.**
- Access impact: `none` (pública).

### State inventory

- Default: todo visible. 🔴 **Sin JS también** (TCO + supuestos + la frase del admin + R4).
- Loading / Empty / Permission denied: `n/a`.
- Error: el form falla → Error Card del renderer.
- Degraded / partial: el form no monta → 🔴 **fallback link visible**.
- Long content: la tabla del TCO scrollea dentro de su contenedor.
- Mobile / compact (390 px): la tabla colapsa a tarjetas, **con los supuestos siempre visibles**.
- Keyboard / focus: tabla alcanzable por teclado; **el ganador de cada fila va escrito**, no solo por color.
- Reduced motion: **todo visible y estático**, sin pérdida.
- 🔴 **Un claim resulta incorrecto:** **se corrige Y se anota la corrección en la página.**
  🎯 **NUNCA una corrección silenciosa** — con archivo web de por medio, callarla **es peor que el error**.
- **Salesforce cambia sus precios:** el `as-of` + los screenshots fechados **nos protegen**: dijimos la verdad
  el día que la dijimos.

### Interaction contract

- Primary interaction: **leer y auditar.** Ninguna interacción revela contenido.
- Hover / focus / active: hover de fila (ayuda a leer una tabla comparativa) · CTA con micro-lift + focus ring.
- Pending / disabled: solo en el form.
- Escape / click-away: `n/a`.
- Focus restore: al volver de Meetings, el navegador restaura solo.
- Toast / alert behavior: `n/a`.

### Motion & microinteracciones

- Motion primitive: `CSS` + IntersectionObserver. **Cero librerías de animación y cero librerías de charts.**
- Enter / exit: fade + rise sobrio (hero 400 ms · regiones 300 ms).
- Layout morph: **ninguno.**
- Stagger: hero (60 ms). 🔴 **Entre R4 y R5: CERO. Entran juntas, sin orden.**
  🎯 **Si "dónde gana Salesforce" entra después o con menos gracia, la honestidad era decorativa** — y el lector
  lo percibe aunque no sepa nombrarlo. **La simetría del motion es la prueba de que la del contenido era en serio.**
- Timing / easing token: `--gh-hs-dur-fast: 150ms` · `--gh-hs-dur-base: 300ms` ·
  `--gh-hs-ease: cubic-bezier(0.2,0,0,1)`.
- Reduced-motion fallback: todo visible y estático.
- 🔴 Non-goal motion: **barras que crecen · charts animados · contadores · columnas entrando desde los lados ·
  transiciones "versus" · flip cards.** 🔴 **Prohibido animar `width`** — *es literalmente cómo se construye la
  barra comparativa que esta página no puede tener*. 🔴 **Y ninguna cifra puede aparecer antes que sus
  supuestos**: eso sería, literalmente, **la manipulación que la página denuncia**. Detalle:
  `docs/ui/motion/TASK-1404-landing-hubspot-vs-salesforce-motion.md`.

### Implementation mapping

- Route / surface: página WordPress nueva bajo el pillar, Ohio nativo, CSS page-scoped.
- Primitive / variant / kind: `reuse`.
- Component candidates: **`<table>` del TCO con los supuestos en el `<caption>`** + dos bandas simétricas
  (R4/R5) + `<details>` (FAQ) + `<greenhouse-form>`. 🔴 **Cero logos de terceros. Cero `<canvas>`.**
- Copy source: contenido de página pública.
- Data reader / command: 🔴 **NINGUNO.** El TCO es **contenido editorial verificado con evidencia archivada**,
  **no un cálculo en vivo**. *(Una calculadora **miente con precisión** — y en una página comparativa, **un
  número mal calculado no es un bug de UX: es publicidad engañosa**.)*
- API parity: **por reuso** (form + Meetings).
- Access / capability: `none`.
- States to implement: default · sin-JS · reduced-motion · form-no-monta · 390 px · claim corregido ·
  `as-of` viejo.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-hubspot-vs-salesforce.*`
- Route: `/servicios/hubspot/hubspot-vs-salesforce/` · Viewports: **1440 + 390**
- Required steps: cargar → capturar R2 (Gartner) → click *"Ver el TCO"* (**verificar scroll + focus a R3**) →
  🎯 **capturar el TCO con sus supuestos y la frase del admin** → 🎯 **capturar R4 y R5 juntas (simetría)** →
  abrir 2 FAQs → click CTA.
- Required captures: full-page (desktop + mobile) · **R2** · 🎯 **el TCO completo** · 🎯 **R4 + R5 lado a lado** ·
  FAQ abierto · **reduced-motion** · **tarjetas en 390 px**.
- Required `data-capture` markers: `hero` · **`gartner`** · **`tco`** · **`sf-gana`** · **`hs-gana`** ·
  `agentes` · `migrar` · `cta`.
- Assertions:
  - 🔴 **`"Líder en CRM"` NO existe** en el DOM · 🔴 **`Forrester` NO existe** en el DOM.
  - 🔴 **`Pardot` no aparece junto a `muerto`/`obsoleto`/`descontinuado`.**
  - 🔴 **La frase del admin existe** *(assertion literal)*.
  - 🔴 **La sección "Dónde gana Salesforce" existe** *(assertion literal)*.
  - 🎯 **R4 y R5 tienen el mismo `font-size` de encabezado y el mismo `transition-delay`** *(la simetría,
    verificada — no asumida)*.
  - 🔴 **Sin JS:** el TCO, sus supuestos, la frase del admin y R4 **en el HTML servido**.
  - 🔴 **Ningún `<img>` ni SVG con la marca o el logo de Salesforce** · **ningún `<canvas>`** · **ningún elemento
    anima `width`**.
  - **Los supuestos están en el `<caption>`** de la tabla · **cero contadores** · `as-of` visible.
- Scroll-width checks: sin scroll horizontal de página (1440 y 390).
- Reduced-motion / focus evidence: captura `prefers-reduced-motion` + tabulación con ring visible.

### Design decision log

- Decision: 🎯 **se abre con el dato que nos hace daño** (Niche Player en el MQ de SFA), **y el límite de nuestro
  propio TCO se declara en la misma región del TCO**.
- Alternatives considered: *(a)* **no mencionar el MQ** — es lo que hace todo el mercado, **y es exactamente por
  lo que ningún comité les cree**. El AE de Salesforce **va a llegar con ese gráfico impreso**: si lo trae él, el
  contexto es suyo. *(b)* **Poner el límite del admin en una nota al pie** — la versión cobarde, **y el CFO lee
  las notas al pie**. *(c)* **Barras comparativas animadas** — se ven espectaculares y (i) dramatizan en vez de
  informar, (ii) animan `width`, (iii) **borran el número para el crawler**, (iv) **le regalan al AE de
  Salesforce la línea *"mira el show que te montaron"***.
- Why this pattern: 🎯 **la página se escribe para tres lectores hostiles** — el comité escéptico, **el AE de
  Salesforce** y **un abogado de Salesforce**. **Si ninguno puede señalar un solo error, el comité tampoco
  puede.** Y **R4/R5 son simétricas con assertion que lo verifica**: *"confiamos en que quedó parejo"* **no es un
  contrato**.
- Reuse / extend / new primitive: `reuse`.
- Open risks: 🔴 **un dato falso sobre Salesforce** *(se cae la página entera)* · 🔴 **denigración / publicidad
  comparativa ilícita** *(riesgo real, no teórico)* · 🎯 **que la comparación gane 6-0 y se lea como folleto**
  *(la tentación por defecto)* · **el argumento del TCO se cae en la reunión** *(mitigado: lo decimos primero)*.

### Visual verification

- GVC scenario: `public-servicios-hubspot-vs-salesforce` · Viewports 1440 + 390.
- Required captures / markers: ver *GVC scenario plan*.
- Scroll-width check: sin scroll horizontal de página.
- Accessibility/focus checks: supuestos en el `<caption>` *(el lector de pantalla los recibe **antes** que los
  números)*; **el ganador de cada fila escrito, no solo por color**; focus ring AA.
- Before/after evidence: `n/a` (página nueva).
- Known visual debt: 🎯 **test del revisor** — ¿puede el AE de Salesforce decir *"mira el show que te montaron"*?
  **Si sí, sobra motion.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — 🔴 Verificación (los dos lados) + evidencia archivada

- **Salesforce:** ⚠️ **su sitio bloquea el fetch programático.** → **Abrir en navegador real, guardar screenshot
  con fecha** de: precio por edición · costo típico de admin · Agentforce (**USD 0,10 por acción**) · lo que no
  migra (Apex, managed packages, CPQ, reportes históricos).
  🔴 **Archivar los screenshots.** Son **la evidencia** de que el claim comparativo era exacto **en su fecha**.
  *(Y si Salesforce cambia sus precios mañana, la fecha nos protege: dijimos la verdad el día que la dijimos.)*
- **HubSpot:** reverificar precios + el MQ (SFA = Niche · B2B MA = Leader).
- **Rehacer el TCO** con `templates/tco-3y.md` y **declarar cada supuesto**.

### Slice 2 — 🔴 Pasada legal (`legal-privacy-ip-operator`)

- Revisar **cada claim comparativo**: ¿objetivo? ¿verificable? ¿fechado? ¿no denigrante?
- Revisar el **uso de la marca Salesforce** (mención nominativa ✅ · logo/identidad ❌).
- 🔴 **Bloquea el publish**, no el build.

### Slice 3 — Copy final (`copywriting` + `commercial-expert` + `greenhouse-ux-writing`)

- Copy ledger completo. 🔴 **Registro técnico y frío.** 🎯 **Cero adjetivos.** *"USD 189k a 3 años"* es un hecho;
  *"carísimo"* es una opinión — **y una opinión en esta página nos cuesta la credibilidad y, potencialmente,
  una carta.**
- Answer capsule por H2.

### Slice 4 — Build

- Página nueva bajo el pillar, Ohio nativo, `Document::save()`.
- 🎯 **La región firma: el TCO con sus supuestos Y su límite** — tabla, **texto servido**, con la frase del admin
  **dentro de la misma región**.
- Las regiones: **Gartner (la verdad incómoda)** · **dónde gana Salesforce** · **dónde gana HubSpot** ·
  **Agentforce vs Breeze** · **qué se rompe al migrar**.

### Slice 5 — AEO + form + schema + verificación

- JSON-LD `FAQPage` + `Article` + `BreadcrumbList`. Internal links (pillar obligatorio · `/precios/` ·
  `/cuando-no-usar-hubspot/` · `/agentes/`). 🔴 **El que no exista, no se pinta.**
- Form (*"te armamos el TCO con tus números"*) + fallback.
- Scenario GVC. 🔴 **Assertions:** sin-JS · **`"Líder en CRM"` ausente** · **`Forrester` ausente** ·
  **`Pardot` + "muerto/obsoleto" ausente** · **la frase del admin presente** *(assertion literal)* ·
  **la sección "dónde gana Salesforce" presente** *(assertion literal)* · **sin logos de terceros** ·
  `as-of` visible.
- Landing registry + landing file + matrix. Purge Kinsta.

## Out of Scope

- Comparaciones con **Microsoft, Zoho, Pipedrive u Odoo** *(**no se pelea por precio contra ellos: se pierde.**
  Si emerge demanda, es **otra** task)*.
- El detalle de los agentes (**`/agentes/`**) · los precios completos (**`/precios/`**) · variante `en-US` ·
  **la calculadora de TCO pública** *(el TCO 1:1 es artefacto de venta, no feature web)*.

## Detailed Spec

### Las 11 regiones

Detalle completo en **`docs/ui/wireframes/TASK-1404-landing-hubspot-vs-salesforce.md`**. El arco:

`hero (la promesa)` → 🎯 **LA VERDAD INCÓMODA, PRIMERO (firma)** → 🎯 **el TCO con sus supuestos Y su límite** →
🔴 **dónde gana Salesforce** *(obligatoria, simétrica)* → dónde gana HubSpot → Agentforce vs Breeze →
**qué se rompe al migrar** → cómo decidimos nosotros → FAQ → puente → CTA.

### R2 — el dato que compra toda la credibilidad de la página

> **Gartner puso a HubSpot en *Niche Players*** del Magic Quadrant de **Sales Force Automation 2025**.
> Los *Leaders* son **Salesforce, Microsoft y Oracle**. ✅
>
> **Y el contexto, que también es cierto:** HubSpot **es Leader** del Magic Quadrant de **B2B Marketing
> Automation**, **5.º año consecutivo**. ✅ **Son dos reportes distintos.**
> 🎯 **La mitad de los partners de HubSpot los mezcla y dice "líder según Gartner". Eso es falso, y se verifica
> en dos minutos.**

🔴 **Sin peros. Sin suavizar. Sin "pero en realidad…".**

### R3 — el TCO, con sus supuestos y su límite

**Supuestos, declarados arriba (y en el `<caption>` de la tabla):** 30 usuarios · **lista sin descuento** ·
3 años · incluye licencias, onboarding y **el costo del administrador** · **no incluye** integraciones custom ni
migración de datos. 🔴 **Un TCO sin supuestos es propaganda con decimales.**

| | HubSpot | Salesforce |
|---|---|---|
| **TCO 3 años** | ≈ **USD 295k** | ≈ **USD 611k** |
| **Solo licencias** | ≈ USD 162k | ≈ USD 189k → **solo 17% de diferencia** |

🎯 **Y la frase que ningún partner pone, en la misma región y sin suavizar:**

> **El delta no lo hace la licencia. Lo hace el admin.**
> **Si ya tienes un admin de Salesforce en planilla, la mitad de este argumento se te cae.**
> Y preferimos decírtelo nosotros a que lo descubras tú en la última reunión.

🔴 **No se mueve al final. No va en una nota al pie.** *(Ese argumento se derrumba en el **100%** de los deals
donde el cliente ya tiene Salesforce — que son **justo los que esta página persigue**.)*

### R4/R5 — la simetría es el argumento

**Dónde gana Salesforce:** CPQ complejo · territorios · forecasting multinivel · extensibilidad (Apex,
AppExchange) · modelos de datos B2B muy complejos. 🔴 **Sin ironía, sin "pero".**
**Dónde gana HubSpot:** costo de administración · adopción *(⚠️ el 38% de los fracasos de CRM son de adopción)* ·
time-to-value · marketing como ciudadano de primera *(y ahí **sí** es Leader)*.

🎯 **Mismo peso tipográfico, mismo tratamiento, mismo instante de entrada — con assertion GVC que lo verifica.**
**Una comparación que gana 6-0 no es una comparación: es un folleto, y el comité lo huele en diez segundos.**

### Contrato de datos (el que NO existe)

🔴 **Cero reader, cero command, cero endpoint, cero calculadora.** El TCO es **contenido editorial verificado**
con `as-of` y **evidencia archivada** (los screenshots fechados de Salesforce).

### Evidencia legal (Slice 1 + 2)

⚠️ **El sitio de Salesforce bloquea el fetch programático** → **navegador real + screenshot con fecha + archivo.**
🎯 **La fecha es la defensa:** si Salesforce cambia sus precios mañana, **dijimos la verdad el día que la dijimos.**
🔴 **Enlazar a su fuente ✅ · reproducir su logo/identidad ❌.** Son cosas distintas y la página las distingue.

### Structured data

`FAQPage` + `Article` + `BreadcrumbList`.

## Rollout Plan & Risk Matrix

Página nueva. Riesgo técnico bajo. 🔴 **Riesgo legal y reputacional: el más alto del hub.**

### Slice ordering hard rule

🔴 **Slice 1 (verificación, con screenshots archivados) bloquea el copy.**
🔴 **Slice 2 (pasada legal) bloquea el publish.**
Luego 3 (copy) → 4 (build) → 5 (AEO + GVC).

### Risk matrix

| Riesgo | Prob. | Mitigación | Señal |
|---|---|---|---|
| 🔴 **Un dato falso o desactualizado sobre Salesforce** | **media** | Slice 1: **navegador real + screenshot fechado + archivado**. Sin evidencia, **no se publica** | Salesforce o un cliente nos corrige → **se cae la página entera** |
| 🔴 **Denigración / publicidad comparativa ilícita** | **media** | Regla dura 9 + **Slice 2 (pasada legal) bloqueante** + registro frío, cero adjetivos | Carta de Salesforce. **Riesgo real, no teórico** |
| 🔴 **Repetir el mito "Pardot está muerto"** | media | Regla dura 5 + **assertion de DOM** | Verificable en nuestra contra en 30 segundos |
| 🎯 **Que la comparación gane 6-0 y se lea como folleto** | **alta** *(es la tentación por defecto)* | Regla dura 7 + **assertion literal: la sección "dónde gana Salesforce" debe existir** | El comité deja de creernos en la primera lectura |
| **El argumento del TCO se cae en la reunión** *(el cliente ya tiene admin de SF)* | **alta** | 🎯 **Lo decimos nosotros primero, en la misma región** (regla dura 4). **Un argumento que se cae solo es peor que uno que se declara frágil** | El CFO lo descubre y perdemos el deal |
| **Salesforce cambia precios y el TCO envejece** | alta | `as-of` visible + screenshots fechados + revisión trimestral | Drift |
| **HubSpot cambia de cuadrante en el MQ** | media | `as-of` + revisión anual *(el MQ es anual)* | Nuevo MQ |

### Rollback

| Slice | Rollback | Tiempo |
|---|---|---|
| 1-3 | N/A (verificación / legal / copy) | — |
| 4-5 | Despublicar (`draft`) + purge Kinsta | <5 min |
| 🔴 **Un claim resulta incorrecto** | **Corregir + anotar la corrección en la página.** **NUNCA editar en silencio** | <30 min |

> 🔴 **Rollback reputacional:** si un claim comparativo resulta incorrecto, se corrige **y se dice**.
> 🎯 **Una página que existe para ser la fuente creíble no puede corregirse a escondidas** — hacerlo la
> convierte en lo que denuncia. **Y si alguien archivó la versión anterior, la corrección silenciosa es peor
> que el error.**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/servicios/hubspot/hubspot-vs-salesforce/` responde **200**, cuelga del pillar, con breadcrumb.
- [ ] 🎯 **Abre con la verdad incómoda:** **Niche Player en el MQ de SFA** ✅ + el contexto (**Leader en B2B
      Marketing Automation, 5.º año**) ✅. **Los dos, y dicho que son reportes distintos.**
- [ ] 🔴 **`"Líder en CRM"` NO existe en el DOM.** 🔴 **`Forrester` NO existe en el DOM** (assertions).
- [ ] 🔴 **`"Pardot"` no aparece junto a "muerto" / "obsoleto" / "descontinuado"** (assertion).
- [ ] 🎯 **El TCO tiene TODOS sus supuestos declarados y visibles** (30 usuarios · lista sin descuento · 3 años ·
      qué incluye).
- [ ] 🔴 **La frase del admin está, en la misma región del TCO, sin suavizar** *(assertion literal:
      *"si ya tienes un admin de Salesforce en planilla, la mitad de este argumento se te cae"* o su equivalente
      aprobado)*.
- [ ] 🔴 **Existe la sección "dónde gana Salesforce"** *(assertion literal)*, sin adornos y sin ironía.
- [ ] 🔴 **Todo dato de Salesforce verificado en navegador real, con screenshot fechado y archivado.**
- [ ] 🔴 **Cero adjetivos denigrantes** sobre Salesforce. **Cero logos ni identidad visual de terceros.**
- [ ] 🔴 **Pasada de `legal-privacy-ip-operator` hecha y registrada** antes del publish.
- [ ] **Agentforce vs Breeze** presente con las dos cifras verificadas (**USD 0,10 por acción** vs
      **USD 0,50 por conversación resuelta**) y el argumento (*pagas cuando funciona, no cuando lo intenta*).
- [ ] **Qué se rompe al migrar** presente (Apex · managed packages · CPQ · reportes históricos).
- [ ] 🔴 **`as-of` visible** para el TCO, el MQ y los datos de Salesforce.
- [ ] 🔴 **Citabilidad sin JS:** el TCO, la frase del admin y "dónde gana Salesforce" **están en el HTML servido**.
      **Cero contadores.**
- [ ] Enlace al pillar presente. Ningún `href` a página inexistente. Ningún claim prohibido.
- [ ] Cada H2 con answer capsule. JSON-LD válido (Rich Results Test).
- [ ] CTA dual con **fallback honesto**. **NO** se reconstruyó form ni agendador.
- [ ] Copy es-LATAM neutro, **registro técnico y frío**, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 + reduced-motion capturado **y mirado**. Sin scroll horizontal.
- [ ] `UI ready: yes` solo si `pnpm task:lint --task TASK-1404` queda sin findings.
- [ ] Landing registry + landing file + matrix actualizados, **con recordatorio de revisión trimestral (precios)
      y anual (MQ)**.

## Verification

`pnpm task:lint --task TASK-1404` · `pnpm ops:lint --changed` ·
`pnpm ui:wireframe-check|flow-check|motion-check --task TASK-1404` ·
Playwright/GVC live (1440 + 390; **assertion sin-JS**; **assertions de claims prohibidos**;
**assertion de la frase del admin**; **assertion de la sección "dónde gana Salesforce"**) ·
Rich Results Test · HTTP 200 + breadcrumb + canonical.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con la carpeta · `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-1352 pillar · TASK-1401/1402/1403)
- [ ] Página registrada en route-ownership matrix + landing registry + landing file
- [ ] 🔴 **Los screenshots fechados de Salesforce archivados** (dónde viven, de qué fecha)
- [ ] 🔴 **La pasada legal registrada** (quién, cuándo, qué se cambió)
- [ ] 🔴 **Recordatorios de revisión** (trimestral: precios · anual: el MQ)

## Follow-ups

- 🎯 **Convertir esta página en el asset de outbound del comité.** Mandársela a un CFO **antes** de la reunión
  decisiva es el movimiento más fuerte del arsenal: **llega diciendo lo que juega en nuestra contra.**
- **La calculadora de TCO 1:1** (`templates/tco-3y.md`) — artefacto de venta, no feature pública.
- **Otras comparaciones** solo si emerge demanda medible. 🔴 **Nunca por precio contra Microsoft, Zoho,
  Pipedrive u Odoo: esa pelea se pierde.**
- Versión **en-US**.

## Open Questions

- ¿La página muestra el TCO **en USD** o localizado? *(Recomendado: **USD**, que es como facturan ambos, y
  decirlo.)*
- ¿Se publica el **TCO de 30 usuarios** como caso único, o **dos escenarios** (10 y 30)?
  *(Recomendado: **uno solo, bien declarado.** Dos escenarios duplican la superficie de error y **el CFO igual
  va a querer el suyo** — que es exactamente el CTA.)*
- 🔴 **¿Alguien de Salesforce compite hoy en un deal nuestro?** *(Si sí, esta página sube de prioridad — y su
  pasada legal también.)*
