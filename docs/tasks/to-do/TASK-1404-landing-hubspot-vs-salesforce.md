# TASK-1404 — Artículo `/hubspot/hubspot-vs-salesforce/`: **la comparación que ninguno de los dos te va a dar**

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1404-landing-hubspot-vs-salesforce.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `task/TASK-1404-articulo-hubspot-vs-salesforce`

> **Cluster del hub HubSpot que vive en el blog.** Pillar: **TASK-1352** (`/servicios/hubspot/`).
> **SSOT de contenido:** [`HUBSPOT_HUB_LANDINGS_SPEC.md`](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 5.
>
> 🔴 **La pieza más débil del hub — y ahora sabemos exactamente por qué.** Ver el delta.

## 🔴 Delta 2026-07-13 — de landing a artículo, y una advertencia

**Era** una landing en `/servicios/hubspot/hubspot-vs-salesforce/`. **Ahora es un post del blog:**
**`efeoncepro.com/hubspot/hubspot-vs-salesforce/`** *(categoría `hubspot`, Gutenberg)*.

**El cambio lo forzó un dato, no una preferencia** (Semrush, 2026-07-13):

| Mercado | *"hubspot vs salesforce"* | Resultados compitiendo |
|---|---|---|
| **España** | **70/mes** | 🔴 **20.800.000** |
| **México** | **20/mes** | — |
| **EE.UU.** | 2.400/mes · **CPC USD 12,67** | Dominado por G2 + los dos vendors |

🎯 **En todo el bloque hispano esa query mueve menos de 100 búsquedas al mes, y hay veinte millones de páginas
peleando por ellas.** El espacio está **saturado**: es el contenido más comoditizado del B2B SaaS.

**Tres consecuencias, y hay que decirlas sin adornos:**

1. 🔴 **Esta pieza NUNCA va a ser encontrada. Solo va a ser ENVIADA.** No tiene embudo: **tiene un remitente.**
   Su lector llega **en un correo nuestro, a un CFO, antes de la reunión del comité.**
2. 🎯 **Y por eso la URL importa más de lo que parece.** Un CFO que recibe un link a
   `/servicios/hubspot/hubspot-vs-salesforce/` **lee "material de ventas" en la barra de direcciones antes de
   leer una palabra** — **saboteando justo la tesis del texto**, que es *"créenos porque abrimos con el dato que
   nos hace daño"*. Como artículo, es **nuestro análisis**, no nuestro folleto.
3. 🔴 **La regla de PDR-013 tenía un hueco.** *"Efeonce solo se cita donde HubSpot no puede o no quiere hablar"*
   es **necesario pero no suficiente**. Falta: **"…y donde ese vacío no lo haya llenado ya todo el mundo."**
   Aplicada, esta pieza es **la más débil de las cuatro** *(ver `Why This Task Exists`)*.

🔴 **Se mantiene pública, no se convierte en PDF.** 🎯 **Una página que cualquiera puede leer es una posición;
un PDF es un pitch.** Que el CFO pueda verificar que esto lo publicamos **para todo el mundo** — y no que se lo
escribimos a él — **es parte del argumento.**

**Y una regla nueva, que es la condición de existencia de la pieza** → ver regla dura 11.

## Summary

Publica **la comparación creíble donde los dos vendors son parte interesada**. Para el comité que decide —
**CFO, RevOps y CIO**.

**Abre con la verdad incómoda para nuestro propio lado:** **Gartner puso a HubSpot en Niche Players** del MQ de
*Sales Force Automation* 2025; los Leaders son **Salesforce, Microsoft y Oracle**. *(Y HubSpot **es** Leader del
MQ de **B2B Marketing Automation**, 5.º año. **Son dos reportes distintos** — y la mitad de los partners los
mezcla, a propósito.)*

Después, **el TCO a 3 años con supuestos declarados** (HubSpot ≈ USD 295k · Salesforce ≈ USD 611k) — **y la
honestidad que nadie pone: el delta no lo hace la licencia** (USD 162k vs 189k = **solo 17%**). **Lo hace el
admin.** 🎯 ***"Si ya tienes un admin de Salesforce en planilla, la mitad de este argumento se te cae."***

Y cierra con **dónde gana Salesforce, sin adornos** · **dónde gana HubSpot** · **Agentforce vs Breeze** ·
**qué se rompe al migrar**.

## Why This Task Exists

**1. El comité ya vio el Magic Quadrant, y nosotros salimos mal.** El AE de Salesforce **va a llegar con el MQ de
SFA impreso** — y tiene razón. 🎯 **La única forma de sobrevivir a un dato que juega en tu contra es traerlo tú,
con contexto.** Si lo trae él, el contexto es suyo y nosotros quedamos escondiendo información.

**2. El argumento del TCO, como lo usa el mercado, es deshonesto — y frágil.** Todos los partners muestran
*"HubSpot cuesta la mitad"*. **Casi nadie dice que la diferencia no está en la licencia (17%), sino en el costo
del administrador** — y que **ese argumento se cae entero si el cliente ya tiene un admin de Salesforce en
planilla**. 🎯 **Decirlo antes de que el CFO lo descubra solo nos hace la única fuente creíble de la mesa.**

**3. 🔴 Pero seamos exactos sobre lo que NO justifica esta pieza.** La versión anterior decía *"es la página que
un LLM necesita para responder ¿HubSpot o Salesforce?"*. **Eso era una exageración.** El espacio está saturado:
un LLM que responde esa pregunta **tiene cien fuentes y no necesita la nuestra**. *(Contrastar con
**TASK-1402**, donde el modelo **no tiene nada** — ese sí es un vacío real.)*

**Lo que sobrevive como justificación es una sola cosa, y es suficiente:** 🎯 **es el asset que se le manda a un
CFO antes de la reunión decisiva** — y **llega diciendo lo que juega en nuestra contra.** No hay otro documento
en el mercado que haga eso.

## Goal

- Ser **creíble donde los dos vendors son parte interesada** — abriendo con lo que nos hace daño.
- Publicar **un TCO con supuestos declarados** y **su límite honesto** (el admin).
- **Decir dónde gana Salesforce, sin adornos.**
- Convertir: **"te armamos el TCO con tus números"** → reunión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- 🔴 **[PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md)** — la regla del
  hub **y su hueco recién descubierto** (*"…y donde ese vacío no esté ya lleno"*).
- **[PDR-003](../../public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md)** — el blog como
  superficie de autoridad.
- **[PDR-006](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)** —
  *evidencia antes que promesa*.
- 🔴 **Skill `legal-privacy-ip-operator`** — **publicidad comparativa.** 🎯 **Y ojo: el cambio a blog NO cambia el
  marco legal.** Un claim comparativo con un CTA comercial **es publicidad comparativa esté en la carpeta que
  esté** — el regulador mira la sustancia, no el folder. **La pasada legal sigue siendo obligatoria.**

## Normative Docs

- 🔴 `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md` § 5 — las 6 secciones y qué **no** dice.
- 🔴 `.claude/skills/hubspot-solutions-partner/modules/05_DISPLACEMENT.md` — battlecards + el TCO +
  **los mitos que te hacen perder**.
- 🔴 `.claude/skills/hubspot-solutions-partner/templates/tco-3y.md` — la plantilla del TCO con sus supuestos.
- 🔴 `.claude/skills/hubspot-solutions-partner/SOURCES.md` § *Datos que NO se citan* — **el MQ verificado.**
- `.claude/skills/commercial-expert/frameworks/command-of-the-message.md` — anclar a **capacidades y outcomes**.
- `docs/documentation/public-site/wordpress-blog-content-hub-search.md` — taxonomía y permalinks del blog.

## 🔴 Reglas duras

**El dato**

1. 🔴 **Se abre con el dato que juega en nuestra contra.** **Niche Player** en el MQ de *SFA* 2025 ✅ (Leaders:
   Salesforce, Microsoft, Oracle) — **y el contexto: Leader en el MQ de B2B Marketing Automation, 5.º año** ✅.
   **Son dos reportes distintos, y se dice.** 🔴 **NUNCA *"Líder en CRM según Gartner"*.**
2. 🔴 **NUNCA el Forrester Wave 2026** — **no es verificable** (la landing de HubSpot que lo promociona cita, al
   abrirla, el Wave de **Q3 2024**).
3. 🔴 **El TCO lleva TODOS sus supuestos declarados, arriba.** **Un TCO sin supuestos es propaganda con decimales.**
4. 🎯 **El límite del TCO va en la misma sección, sin suavizar:** *"el delta no lo hace la licencia (162k vs 189k
   = 17%). **Lo hace el admin.** Si ya tienes un admin de Salesforce en planilla, **la mitad de este argumento se
   te cae.**"* 🔴 **No se mueve al final. No va en una nota al pie.**
5. 🔴 **NUNCA *"Pardot está muerto"*** ni ninguna afirmación falsa sobre Salesforce. **Falso, verificable en
   nuestra contra, y borra la credibilidad de todo el texto** — que es lo único que tiene.
6. 🔴 **Ningún dato de Salesforce sin verificar en navegador real** (su sitio bloquea el fetch) **+ screenshot
   fechado y archivado.**
7. 🔴 **Se dice dónde gana Salesforce, sin adornos y sin ironía.** 🎯 **Una comparación que gana 6-0 no es una
   comparación: es un folleto — y el comité lo huele en diez segundos.**
8. 🔴 **Registro técnico. Cero adjetivos.** *"USD 189k a 3 años"* es un hecho; *"carísimo"* es una opinión —
   **y una opinión acá es publicidad comparativa denigrante, que en Chile y LATAM tiene reglas.**
   **La frialdad no es un tono: es una defensa.**

**Legal**

9. 🔴 **Publicidad comparativa: objetiva, verificable, no engañosa, no denigrante.**
   **Cero logos, cero identidad visual de Salesforce** (mención nominativa ✅ · marca ajena ❌).
   🔴 **Pasada de `legal-privacy-ip-operator` antes del publish** — 🎯 **y el cambio a blog NO la exime:
   el folder no cambia el marco legal.**
10. 🎯 **Se escribe asumiendo dos lectores hostiles:** un **abogado de Salesforce** y **el AE de Salesforce que
    compite por el deal**. **Si ninguno de los dos puede señalar un solo error, el comité tampoco puede.**

**La condición de existencia (nueva, y es la más importante)**

11. 🔴 **Los dos movimientos son la pieza. Si se ablandan, la pieza no vale nada.**
    Frente a veinte millones de páginas iguales, **nuestra única diferencia real son dos gestos**:
    **(a)** abrir con el **Niche Player** de Gartner, y **(b)** declarar que **nuestro propio argumento del TCO
    se cae** si ya tienes un admin de Salesforce.
    🎯 **Es exactamente lo que se ablanda en la última revisión** — alguien va a decir *"¿no suena muy negativo
    abrir así?"*. **La respuesta es no, y es la única razón por la que el texto existe.**
    🔴 **Si al escribirla cualquiera de los dos se suaviza, la pieza es la 4.001 del montón — y entonces
    lo correcto es NO publicarla.**

**Formato (del cambio a blog)**

12. 🔴 **Es un `post`, no una `page`.** Categoría **`hubspot`**. Permalink **`/hubspot/hubspot-vs-salesforce/`**.
    **Gutenberg.** **Byline de persona real** + `Article` con `author`/`datePublished`/`dateModified`.
13. 🔴 **Sin formulario embebido.** El CTA es **un enlace a HubSpot Meetings**.
    🎯 **Un artículo que termina en un form embebido se lee como un post de lead-gen; un enlace para agendar se
    lee como una oferta.** *(Y el lector que más importa —el CFO— **ya está hablando con nosotros**: el link se
    lo mandamos.)*

## Dependencies & Impact

### Depends on

- 🔴 **Verificación manual de los datos de Salesforce** — ⚠️ **su sitio bloquea el fetch programático** →
  **navegador real + screenshot fechado + archivado** (Slice 1, bloqueante).
- 🔴 **Pasada de `legal-privacy-ip-operator`** (Slice 2) — **bloquea el publish**.
- 🔴 **La decisión del byline.**
- Reverificación de precios de HubSpot + del MQ.

### Blocks / Impacts

- 🎯 **Arma al equipo comercial para el comité.** **Es el asset que se le manda a un CFO antes de la reunión
  decisiva** — y ese es, hoy, **su único uso real**.
- Alimenta a TASK-1401 (el TCO) y **se apoya en TASK-1402** (*"dónde gana Salesforce"* **es la mitad de esos
  límites**).
- **Alimenta la categoría `hubspot` del blog.**

### Files owned

- Esta task · `docs/ui/wireframes/TASK-1404-landing-hubspot-vs-salesforce.md`.
- El post de WordPress (`post`, categoría `hubspot`) · **los screenshots fechados de Salesforce** (evidencia
  interna, archivada, **no publicada**).

## Current Repo State

### Already exists

- `modules/05_DISPLACEMENT.md` (battlecards + el TCO a 3 años + **los mitos que te hacen perder**) ·
  `templates/tco-3y.md` · `SOURCES.md` con **el MQ verificado** (SFA = Niche · B2B MA = Leader).
- **La categoría `hubspot`** del blog · **el write path de Content Factory** (Gutenberg).

### Gap

- El artículo no existe · el copy sin draftear · el **byline** sin decidir.
- 🔴 **Los datos de Salesforce sin verificar en navegador real** (sin screenshots fechados).
- 🔴 **La pasada legal sin hacer.**

## Modular Placement Contract

- Topology impact: `public`
- Current home: WordPress en Kinsta; `post` en Gutenberg, categoría `hubspot`, permalink `/hubspot/hubspot-vs-salesforce/`.
- Future candidate home: `public`
- Boundary: el artículo no consume ningún contrato del repo; es contenido editorial con enlaces externos a fuentes oficiales y un enlace de vuelta al pillar.
- Server/browser split: `n/a` — contenido estático servido por WordPress; cero secretos, cero DB, cero form, cero JavaScript propio, cero librería de charts.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-lite` 🎯 **(bajó al pasar a blog: el tema resuelve tipografía, jerarquía y responsive. Lo único
  con requisito propio es la tabla del TCO y la simetría de las dos secciones "dónde gana X".)**
- Usuario / rol: 🎯 **el comité — CFO** (audita los supuestos), **RevOps** (¿nos quedamos cortos?), **CIO**
  (extensibilidad y migración; **probablemente ya tiene Salesforce en la casa**).
- Momento del flujo: 🔴 **le llegó el link en un correo nuestro.** *"Tengo dos vendedores diciéndome cosas
  opuestas y los dos tienen un PDF que lo prueba."*
- Resultado perceptible esperado: 🎯 **poder defender la decisión ante su directorio sin quedar expuesto.**
  **No está eligiendo un CRM: está protegiendo su carrera.** Que pueda decir: *"sí, sabía lo del Magic Quadrant.
  Y acá está por qué elegí igual."*
- Fricción que debe reducir: el miedo a que **el vendedor le esté ocultando algo**.
- No-goals UX: no compara con Microsoft/Zoho/Pipedrive/Odoo · **no denigra a Salesforce** · **no publica una
  calculadora de TCO** · **no lleva form embebido**.

### Surface & system decision

- Surface: **post de WordPress**, categoría `hubspot`, `/hubspot/hubspot-vs-salesforce/`. **Gutenberg.**
- Composition Shell: `no aplica`.
- Primitive decision: `reuse` — **bloques Gutenberg nativos** (`core/heading`, `core/paragraph`, **`core/table`**,
  `core/list`). 🔴 **Cero bloques custom, cero CSS de página, cero librería de charts.**
- Floating/Sidecar/Dialog decision: 🔴 **ninguno.** Y **verificar que el tema no inyecte pop-up/sticky CTA**.
- Copy source: contenido del post. 🔴 **Registro técnico y frío. CERO adjetivos.**
- Access impact: `none`.

### State inventory

- Default: todo visible. 🔴 **Sin JS es idéntico.**
- Loading / Empty / Error / Permission denied: `n/a` — **no hay form ni estado async.**
- Long content: la tabla del TCO scrollea **dentro de su contenedor**.
- Mobile (390 px): la tabla colapsa a tarjetas, **con los supuestos siempre visibles**.
- Keyboard / focus: tabla alcanzable; **el ganador de cada fila va escrito**, no solo por color.
- Reduced motion: **idéntico** (no hay motion propio).
- 🔴 **Un claim resulta incorrecto:** **se corrige Y se anota la corrección** (`dateModified` + nota).
  🎯 **NUNCA una corrección silenciosa** — con archivo web de por medio, callarla **es peor que el error**.
- **Salesforce cambia sus precios:** el `as-of` + los screenshots fechados **nos protegen**: **dijimos la verdad
  el día que la dijimos.**

### Interaction contract

- Primary interaction: **leer y auditar.** Cero interacciones.
- Hover / focus / active: los del tema.
- 🔴 **Prohibido:** pop-up, exit-intent, sticky bar, form embebido.

### Motion & microinteracciones

- Motion primitive: 🔴 **`none`.** El tema resuelve hover/focus. **No se agrega ni una animación.**
- Enter / exit / Layout morph / Stagger: **ninguno.**
- Reduced-motion fallback: **idéntico.**
- 🔴 **Non-goal motion (guardrail heredado, y no es estético — es de integridad):** **cero barras que crecen,
  cero charts animados, cero contadores.** 🎯 **Y la razón grave: una animación que hace que el número "611k"
  aparezca ANTES que sus supuestos es, literalmente, la manipulación que el texto denuncia.**
  🔴 **El TCO es una tabla. No un gráfico.** *(Y le regalaría al AE de Salesforce la línea: "mira el show que te
  montaron".)* **Por eso esta task declara `Motion: none`.**

### Implementation mapping

- Route / surface: `post` WordPress, categoría `hubspot`, Gutenberg, vía **Content Factory** (`wpcli eval-file`).
- Primitive / variant / kind: `reuse` — bloques nativos.
- Component candidates: `core/heading` · `core/paragraph` · **`core/table`** (el TCO, con los supuestos en el
  `<caption>`) · `core/list`. 🔴 **Cero logos de terceros. Cero `<canvas>`.**
- Copy source: contenido del post.
- Data reader / command: 🔴 **NINGUNO.** El TCO es **contenido editorial verificado con evidencia archivada**,
  **no un cálculo en vivo**. *(Una calculadora **miente con precisión** — y en una pieza comparativa, **un número
  mal calculado no es un bug de UX: es publicidad engañosa**.)*
- API parity: `n/a`.
- Access / capability: `none`.
- States to implement: default · 390 px · claim corregido · `as-of` viejo.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/public-blog-hubspot-vs-salesforce.*`
- Route: `/hubspot/hubspot-vs-salesforce/` · Viewports: **1440 + 390**
- Required steps: cargar → capturar la apertura (Gartner) → 🎯 **capturar el TCO con sus supuestos y la frase del
  admin** → 🎯 **capturar "dónde gana Salesforce" y "dónde gana HubSpot" juntas (simetría)** → click al pillar.
- Required captures: full-page (desktop + mobile) · **la apertura** · 🎯 **el TCO completo** ·
  🎯 **las dos secciones lado a lado** · **tarjetas en 390 px** · **el byline + las fechas**.
- Assertions:
  - 🔴 **`"Líder en CRM"` y `Forrester` NO existen** en el DOM.
  - 🔴 **`Pardot` no aparece junto a `muerto`/`obsoleto`/`descontinuado`.**
  - 🔴 **La frase del admin existe** *(assertion literal)*.
  - 🔴 **La sección "Dónde gana Salesforce" existe** *(assertion literal)*.
  - 🎯 **Las dos secciones tienen el mismo peso tipográfico** *(la simetría, verificada — no asumida)*.
  - 🔴 **Sin JS:** el TCO, sus supuestos y la frase del admin **en el HTML servido**.
  - 🔴 **Ningún `<img>`/SVG con la marca o el logo de Salesforce** · **ningún `<canvas>`** · **cero contadores**.
  - 🔴 **No existe ningún `<form>`, pop-up ni sticky bar** *(incluido el chrome del tema)*.
  - **`author`/`datePublished`/`dateModified`** presentes · **enlace al pillar presente** · `as-of` visible.
- Scroll-width checks: sin scroll horizontal de página.

### Design decision log

- 🎯 **Decisión: es un artículo, no una landing — y lo forzó el dato.** Con **<100 búsquedas/mes en español y
  20,8M de resultados**, **esta pieza nunca va a ser encontrada: solo va a ser enviada.** Y un CFO que recibe un
  link a `/servicios/...` **lee "material de ventas" antes de leer una palabra** — saboteando la tesis del texto.
  **Alternativa descartada:** *landing bajo el pillar* — la URL contradice el contenido.
  **Alternativa descartada:** *PDF adjunto* — 🎯 **una página pública es una posición; un PDF es un pitch.**
  Que el CFO verifique que esto lo publicamos para todos **es parte del argumento**.
- 🎯 **Decisión: se abre con el dato que nos hace daño.** El AE de Salesforce **llega con el MQ impreso**.
  **La única forma de sobrevivir a un dato en contra es traerlo tú, con contexto.**
  **Alternativa descartada:** *no mencionar el MQ* — es lo que hace todo el mercado, **y es exactamente por lo
  que ningún comité les cree.**
- 🎯 **Decisión: el límite de nuestro propio TCO va en la misma sección, sin suavizar.** **Un argumento que se
  derrumba solo en la última reunión es peor que uno declarado frágil desde el principio** — y este se derrumba
  **en el 100% de los deals donde el cliente ya tiene Salesforce**, que son **justo los que esta pieza persigue**.
- 🔴 **Decisión: sin form embebido.** Un artículo que termina en un form se lee como lead-gen; **un enlace para
  agendar se lee como una oferta.** Y el lector que importa **ya está hablando con nosotros**.
- 🔴 **Decisión: las dos secciones "dónde gana X" son simétricas, y hay assertion que lo verifica.**
  🎯 **Si la de Salesforce se ve más chica o más corta, la honestidad era decorativa** — y un comité entrenado lo
  detecta antes que cualquier argumento. **La simetría no es estética: es el argumento hecho layout.**
- 🔴 **Decisión: `Motion: none` y `Flow: none`, declarados.** No hay flujo que coordinar, y **la ausencia de
  motion es de integridad**: una animación que muestre el número **antes** que sus supuestos **es la manipulación
  que el texto denuncia**. **No son stubs: son decisiones con razón escrita.**
- **Command of the Message:** no compara features. Compara **capacidades requeridas y outcomes** (adopción,
  time-to-value, costo de admin, riesgo de migración) — donde vive la decisión real del comité.

### Visual verification

- GVC scenario: `public-blog-hubspot-vs-salesforce` · Viewports 1440 + 390.
- Required captures / markers: ver *GVC scenario plan*.
- Scroll-width check: sin scroll horizontal.
- Accessibility/focus checks: supuestos en el `<caption>` *(el lector de pantalla los recibe **antes** que los
  números)*; **el ganador de cada fila escrito, no solo por color**; focus ring AA.
- Before/after evidence: `n/a` (post nuevo).
- Known visual debt: 🔴 **verificar que el chrome del tema no inyecte CTA/pop-up en este post.**

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

- **Salesforce:** ⚠️ **su sitio bloquea el fetch.** → **Abrir en navegador real, guardar screenshot con fecha**
  de: precio por edición · costo típico de admin · **Agentforce (USD 0,10 por acción)** · lo que no migra (Apex,
  managed packages, CPQ, reportes históricos).
  🔴 **Archivar los screenshots.** 🎯 **La fecha es la defensa: si Salesforce cambia sus precios mañana, dijimos
  la verdad el día que la dijimos.**
- **HubSpot:** reverificar precios + el MQ (SFA = Niche · B2B MA = Leader).
- **Rehacer el TCO** con `templates/tco-3y.md` y **declarar cada supuesto**.

### Slice 2 — 🔴 Pasada legal (`legal-privacy-ip-operator`)

- Cada claim comparativo: ¿objetivo? ¿verificable? ¿fechado? ¿no denigrante?
- Uso de la marca Salesforce (mención nominativa ✅ · logo/identidad ❌).
- 🔴 **Bloquea el publish.** 🎯 **El cambio a blog NO exime: el folder no cambia el marco legal.**

### Slice 3 — Copy final (`copywriting` + `commercial-expert` + `greenhouse-ux-writing`)

- 🔴 **Registro técnico y frío. Cero adjetivos.**
- 🔴 **Guardia de la regla 11:** al revisar, **alguien va a proponer suavizar la apertura de Gartner o la frase
  del admin.** **La respuesta es no** — y si se suavizan, **la pieza no se publica.**
- **Decidir el byline** + bio con la credencial.

### Slice 4 — Publicación (Content Factory / Gutenberg) + schema

- Post en Gutenberg, categoría `hubspot`, slug `hubspot-vs-salesforce`.
- 🎯 **El TCO como `core/table`, con los supuestos en el `<caption>`** y la frase del admin **en la misma sección**.
- Las dos secciones **"dónde gana X"**, **simétricas**.
- JSON-LD `Article` (`author`/`datePublished`/`dateModified`) + `FAQPage` + `BreadcrumbList`.
- 🔴 **Enlace al pillar** (única puerta de vuelta) + a TASK-1402 y TASK-1401.

### Slice 5 — GVC + cierre

- Assertions (ver GVC plan). Purge Kinsta.
- 🔴 **Screenshots archivados** + **pasada legal registrada** + **recordatorios** (trimestral: precios ·
  anual: el MQ).

## Out of Scope

- Comparaciones con **Microsoft, Zoho, Pipedrive u Odoo** *(**no se pelea por precio contra ellos: se pierde**)*.
- El detalle de los agentes (**→ TASK-1403**) · los precios completos (**→ TASK-1401**) ·
  **la calculadora de TCO pública** *(el TCO 1:1 es artefacto de venta, no feature web)*.
- Variante `en-US` — 🎯 **pero ver Follow-ups: 2.400/mes y CPC USD 12,67.**

## Detailed Spec

### Estructura del artículo

Detalle completo en `docs/ui/wireframes/TASK-1404-landing-hubspot-vs-salesforce.md`. El arco:

`H1` → 🎯 **LA VERDAD INCÓMODA, PRIMERO** → 🎯 **el TCO con sus supuestos Y su límite** →
🔴 **dónde gana Salesforce** *(obligatoria, simétrica)* → dónde gana HubSpot → Agentforce vs Breeze →
**qué se rompe al migrar** → cómo decidimos nosotros → FAQ → **enlace al pillar** → CTA.

### La apertura (la mitad de la pieza)

> **Gartner puso a HubSpot en *Niche Players*** del Magic Quadrant de **Sales Force Automation 2025**.
> Los *Leaders* son **Salesforce, Microsoft y Oracle**. ✅
>
> **Y el contexto, que también es cierto:** HubSpot **es Leader** del Magic Quadrant de **B2B Marketing
> Automation**, **5.º año consecutivo**. ✅ **Son dos reportes distintos.**
> 🎯 **La mitad de los partners de HubSpot los mezcla y dice "líder según Gartner". Eso es falso, y se verifica
> en dos minutos.**

🔴 **Sin peros. Sin suavizar.** *(Regla dura 11.)*

### El TCO, con su límite

**Supuestos declarados** (y en el `<caption>`): 30 usuarios · **lista sin descuento** · 3 años · incluye
licencias, onboarding y **el costo del administrador** · **no incluye** integraciones custom ni migración.

| | HubSpot | Salesforce |
|---|---|---|
| **TCO 3 años** | ≈ **USD 295k** | ≈ **USD 611k** |
| **Solo licencias** | ≈ USD 162k | ≈ USD 189k → **solo 17% de diferencia** |

> 🎯 **El delta no lo hace la licencia. Lo hace el admin.**
> **Si ya tienes un admin de Salesforce en planilla, la mitad de este argumento se te cae.**

🔴 **En la misma sección. Sin suavizar.** *(Regla dura 11.)*

### Contrato de datos (el que NO existe)

🔴 **Cero reader, cero command, cero endpoint, cero calculadora, cero form.**

## Rollout Plan & Risk Matrix

Post nuevo. Riesgo técnico bajo. 🔴 **Riesgo legal y reputacional: el más alto del hub.**

### Slice ordering hard rule

🔴 **Slice 1 (verificación con screenshots) bloquea el copy.**
🔴 **Slice 2 (pasada legal) bloquea el publish.**

### Risk matrix

| Riesgo | Prob. | Mitigación | Señal |
|---|---|---|---|
| 🔴 **Alguien suaviza la apertura de Gartner o la frase del admin** | **alta** 🎯 *(es lo que pasa en toda última revisión)* | **Regla dura 11: si se suavizan, NO se publica.** Assertions literales en GVC | **La pieza se vuelve la 4.001 del montón** |
| 🔴 **Un dato falso sobre Salesforce** | media | Navegador real + screenshot fechado + archivado | **Se cae el texto entero** |
| 🔴 **Denigración / publicidad comparativa ilícita** | media | Regla dura 9 + **pasada legal bloqueante** + registro frío | Carta de Salesforce |
| 🎯 **Que gane 6-0 y se lea como folleto** | **alta** | Regla dura 7 + **assertion: la sección "dónde gana Salesforce" debe existir y ser simétrica** | El comité deja de creernos |
| **El argumento del TCO se cae en la reunión** | alta | 🎯 **Lo decimos nosotros primero** (regla dura 4) | El CFO lo descubre solo |
| **Salesforce cambia precios / cambia el MQ** | alta / media | `dateModified` + screenshots fechados + revisión (trimestral / anual) | Drift |
| 🔴 **El tema inyecta un pop-up/sticky CTA** | media | Assertion GVC | Contradice el registro del texto |

### Rollback plan per slice

| Slice | Rollback | Tiempo |
|---|---|---|
| 1-3 | N/A | — |
| 4-5 | Despublicar el post (`draft`) + purge Kinsta | <5 min |
| 🔴 **Un claim resulta incorrecto** | **Corregir + anotar la corrección** (`dateModified` + nota). **NUNCA en silencio** | <30 min |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El post responde **200** en `/hubspot/hubspot-vs-salesforce/` (categoría `hubspot`, Gutenberg).
- [ ] 🎯 **Abre con la verdad incómoda** (Niche Player en SFA) **y su contexto** (Leader en B2B MA, 5.º año),
      **dicho que son reportes distintos**. 🔴 **Sin suavizar** *(regla 11)*.
- [ ] 🔴 **`"Líder en CRM"` y `Forrester` NO existen en el DOM.** **`Pardot` no aparece con "muerto/obsoleto".**
- [ ] 🎯 **El TCO tiene sus supuestos declarados** (y en el `<caption>` de la tabla).
- [ ] 🔴 **La frase del admin está en la misma sección del TCO, sin suavizar** *(assertion literal)*.
- [ ] 🔴 **"Dónde gana Salesforce" existe, sin adornos**, y es **visualmente simétrica** a "dónde gana HubSpot"
      *(assertion verificada, no asumida)*.
- [ ] 🔴 **Todo dato de Salesforce verificado en navegador real, con screenshot fechado y archivado.**
- [ ] 🔴 **Cero adjetivos denigrantes. Cero logos ni identidad visual de terceros. Cero charts, cero contadores.**
- [ ] 🔴 **Pasada de `legal-privacy-ip-operator` hecha y registrada** antes del publish.
- [ ] 🔴 **No existe ningún `<form>`, pop-up ni sticky bar** *(incluido el chrome del tema)*. El CTA es un enlace.
- [ ] 🔴 **Byline de persona real** + **`author`/`datePublished`/`dateModified`** en el JSON-LD y visibles.
- [ ] **Agentforce vs Breeze** con las dos cifras verificadas. **"Qué se rompe al migrar"** presente.
- [ ] 🔴 **Sin JS el artículo se lee entero.** **`as-of` visible.** **Enlace al pillar presente.**
- [ ] JSON-LD `Article` + `FAQPage` + `BreadcrumbList` válido (Rich Results Test).
- [ ] Copy es-LATAM neutro, **registro técnico y frío**, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 capturado **y mirado**. Sin scroll horizontal.
- [ ] `UI ready: yes` solo si `pnpm task:lint --task TASK-1404` queda sin findings.

## Verification

`pnpm task:lint --task TASK-1404` · `pnpm ops:lint --changed` · `pnpm ui:wireframe-check --task TASK-1404` ·
Playwright/GVC live (1440 + 390; **assertion sin-JS**; **assertions de claims prohibidos**; **assertion de la
frase del admin**; **assertion de la sección "dónde gana Salesforce" + su simetría**; **assertion sin
form/pop-up**) · Rich Results Test · HTTP 200 + canonical.

## Closing Protocol

- [ ] `Lifecycle` sincronizado · `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-1352 · TASK-1401/1402/1403 · **PDR-013 y el SPEC**)
- [ ] 🔴 **Screenshots fechados de Salesforce archivados** (dónde viven, de qué fecha)
- [ ] 🔴 **Pasada legal registrada** (quién, cuándo, qué se cambió)
- [ ] 🔴 **Recordatorios:** trimestral (precios) · anual (el MQ). **Content Factory como dueño.**

## Follow-ups

- 🎯 **Convertirlo en el asset de outbound del comité.** **Es su único uso real, y es fuerte:** mandárselo a un
  CFO **antes** de la reunión decisiva. Llega diciendo lo que juega en nuestra contra.
- 🎯 **Versión `en-US`: 2.400 búsquedas/mes con CPC USD 12,67.** 🔴 **No podemos pelear ese SERP** (no tenemos
  autoridad de dominio: G2 + los dos vendors lo dominan) — **pero la citación en LLM no depende de autoridad de
  dominio.** Ese es el ángulo, y **no el tráfico orgánico**. **No prometer rankings.**
- 🔴 **Si hay que cortar algo del hub, es esta pieza.** Es la más débil *(P2, y la última fase)*.
  **Su valor es el asset de venta, no la citabilidad** — el vacío que llenaría **ya está lleno**.

## Open Questions

- 🔴 **¿Quién firma?** Debe ser una persona con credencial *(mismo criterio que TASK-1402)*.
- ¿El TCO va **en USD** o localizado? *(Recomendado: **USD**, que es como facturan ambos, y decirlo.)*
- ¿**Un** escenario de TCO (30 usuarios) o **dos** (10 y 30)? *(Recomendado: **uno solo, bien declarado.** Dos
  duplican la superficie de error, **y el CFO igual va a querer el suyo** — que es exactamente el CTA.)*
- 🔴 **¿Alguien de Salesforce compite hoy en un deal nuestro?** *(Si sí, esta pieza sube de prioridad — y su
  pasada legal también.)*
