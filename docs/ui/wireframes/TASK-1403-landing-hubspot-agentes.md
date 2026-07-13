# TASK-1403 / `efeoncepro.com/servicios/hubspot/agentes/` — **"Los agentes de IA de HubSpot: cuáles funcionan de verdad"**

> **Cluster 3 de 4** del hub HubSpot. Pillar: **TASK-1352** (`/servicios/hubspot/`).
> Fuente: **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 3** +
> skill `hubspot-solutions-partner` → **`modules/13_AGENTES.md`** *(cargarlo entero)*.
>
> 🔴 **Bloqueada por F0:** el caso ANAM verificado + autorizado. **Sin caso, es capability sin prueba.**

## Meta

- Status: `draft`
- Owner task: `TASK-1403`
- **Product Design asset:** ⚠️ **opcional, y con una regla dura.** La tentación de ilustrar *"agentes de IA"*
  con **robots, cerebros, redes neuronales y partículas** es enorme — y **sería exactamente el "AI slop" que la
  página denuncia en su propio contenido.** 🎯 **Si se ilustra, se ilustra el gobierno** (el loop
  propone→confirma→ejecuta), **no el agente.** Si no hay dirección de arte para eso, **la página va sin
  ilustración y no pierde nada.**
- Intended consumers: sitio público (WordPress/Ohio, **marketing lane** `modern-ui`) + **motores de respuesta
  (LLMs)**. **NO** el portal Greenhouse.
- Copy source: contenido de página pública (**NO** `src/lib/copy`), validado con `copywriting` +
  `greenhouse-ux-writing` + `docs/context/05_voz-tono-estilo.md`. **es-LATAM neutro, tuteo, sin voseo.**
- Primitive decision: `reuse` — section header + `<table>` + stepper (el loop de gobierno) + `<greenhouse-form>`.
  **Cero primitives nuevas.**
- Motion: **hereda el contract del pillar**. Tier **restraint**. 🔴 **Prohibido todo motion que "sienta a IA"**
  (glows, partículas, typing effect, pulse) — ver el motion contract.
- UI ready target: `yes` una vez cerrado **F0 (el caso)** + la reverificación del roster + el copy.

## Brief

- **Primary user:** 🎯 **dos, y son muy distintos:**
  1. **El CEO / director al que el directorio le pidió "IA".** No sabe qué pedir. **Tiene miedo de quedar mal
     en las dos direcciones**: quedarse atrás, o comprar humo y que se note. **Necesita saber qué es real.**
  2. **El COO / jefe de servicio con el equipo desbordado.** Él sí tiene un dolor concreto: **su gente no da
     abasto**. No le interesa la IA: le interesa que bajen los tickets.
- **User moment:** *"todo el mundo dice que tiene agentes de IA y ninguno me explica qué hacen realmente,
  cuánto cuestan, ni qué pasa si se equivocan."*
  🎯 **Y el miedo que nadie nombra: "¿y si el agente le dice una barbaridad a un cliente?"**
- **Job to be done:** **saber qué es real, qué cuesta y quién responde si falla.**
- **Primary decision signal:** 🎯 **que le digamos cuáles NO funcionan.** *"Solo tres de doce están en GA"* es
  la frase que le hace pensar *"esta gente sabe de lo que habla y no me está vendiendo humo"*.
  **Después de eso, el caso (56%) lo cierra.**
- **Fricción que reduce:** el miedo a **comprar humo** (y que el directorio se dé cuenta) y el miedo a **soltar
  el CRM a una IA sin supervisión**.
- **Non-goals:** no es el folleto de Breeze · no vende la Agent CLI al cliente · no promete agentes en beta ·
  no reconstruye form ni agendador.

## 🔴 Reglas duras del contenido

1. 🔴 **El caso ANAM requiere las tres condiciones:** métrica verificada · relación en buenos términos ·
   **autorización explícita**. **Falta una → anonimizado o no se usa.** 🔴 **Sin autorización, la palabra
   `ANAM` no puede existir en el DOM.**
2. 🔴 **Se lidera con el 56% (promedio), no con el 76% (mejor mes).** *"Hasta 76%"* **suena a cherry-picking y
   le quita credibilidad a toda la página.** El 76% va después, **declarado como el mejor mes**.
   🎯 **En una página cuyo argumento es la honestidad, liderar con el pico sería contradecirse en la única
   cifra que importa.**
3. 🔴 **Nunca extrapolar de n=1.** *"En ANAM redujimos 56%"* ✅ · *"Reducimos la carga de soporte un 56%"* ❌.
4. 🔴 **NUNCA "flota de agentes".** **Tres en GA:** Customer · Prospecting · Data. **Y se dice cuántos hay en beta.**
5. 🔴 **Ningún SLA sobre un agente en beta.** **Los Custom Assistants murieron el 2026-07-13** — se cita **como
   el ejemplo vivo**. *(No es hipotético: pasó esta semana.)*
6. 🔴 **La definición de "conversación resuelta" se cita literal** *(HubSpot: resuelta **sin escalamiento humano
   en 72 horas**)*. 🎯 **Publicarla es honestidad — y de paso es el argumento:** *pagas cuando funciona, no
   cuando lo intenta.*
7. 🔴 **El gobierno se enuncia literal:** *el agente propone · un humano confirma · recién ahí se ejecuta · y
   todo pasa por `--dry-run`*. **Nadie le da la llave del CRM a una IA sin supervisión.**
8. 🔴 **Precios y roster de Breeze: reverificar el día de publicación.** `as-of` visible. **Cambió 3 veces en 2026.**
9. 🔴 **Claims prohibidos** del hub + **nomenclatura 2026**.
10. 🔴 **Toda cifra citable en el HTML servido. Cero contadores.**

---

## Layout Skeleton

| R | Slot | Propósito | Componente | Fuente |
|---|---|---|---|---|
| **0** | Header + **breadcrumb** | `Servicios › HubSpot › Agentes` | Ohio native + breadcrumb | Tema |
| **1** | **Hero — la pregunta** | 🎯 H1 = *"Los agentes de IA de HubSpot: cuáles funcionan de verdad."* Sub: *"HubSpot anuncia doce. **Tres funcionan hoy.** Te decimos cuáles, cuánto cuestan y qué pasa cuando se equivocan."* + **`as-of`** | `modern-ui` editorial header | SPEC § 3 |
| **2** | 🎯 **LA VERDAD PRIMERO** *(SIGNATURE)* | **La región por la que existe la página, y va ARRIBA — no al final.** `<table>`: **agente · estado (GA / beta) · qué hace de verdad**. **Tres en GA. Los otros, en beta.** 🎯 **Nadie más publica esto** | 🎯 **`<table>` semántica, texto servido** | `modules/13` |
| **3** | **Cuánto cuestan de verdad** | **Outcome-based: pagas cuando funciona.** USD 0,50 por conversación **resuelta** · USD 1 por lead. 🔴 **Y la definición literal de HubSpot:** *resuelta = sin escalamiento humano en 72 horas*. → enlaza a `/precios/` | Pricing band + cita textual | ✅ verificado |
| **4** | 🎯 **EL CASO** *(región aislada, a propósito)* | **Customer Agent en producción.** El equipo de atención **redujo su carga un 56% en promedio** *(76% en el mejor mes)*. **El denominador declarado.** 🔴 **Región autocontenida: se anonimiza en 15 min sin tocar el resto** | Case band — **cifra en texto servido** | F0 |
| **5** | **Lo que implementamos de verdad** | 🎯 **Lo que separa un agente que funciona de uno que da vergüenza:** la **base de conocimiento** *(sin datos limpios no hay outcome — el agente amplifica la basura)* · el **gobierno** *(qué decide solo, qué escala)* · **el tono y la marca** · **el modelado de costo** | Feature grid | `modules/13` |
| **6** | 🎯 **EL GOBIERNO ES EL PRODUCTO** | **La posición que nos define.** *"El agente propone. Un humano confirma. Recién ahí se ejecuta. Y todo pasa por `--dry-run` antes."* 🔴 **"Nadie le da la llave del CRM a una IA sin supervisión — y quien te diga que sí, sal corriendo."** | **Stepper de 3 pasos** *(propone → confirma → ejecuta)* | Regla dura 7 |
| **7** | **Y operamos tu HubSpot *con* agentes** | HubSpot publicó la **Agent CLI** *(beta pública, junio 2026)* para que agentes de IA operen el CRM. **Nosotros ya trabajamos así.** 🔴 **No es roadmap: es cómo operamos. Y no te la vendemos: la usamos.** | Mechanism band | `modules/13` |
| **8** | 🔴 **Cuándo un agente NO te sirve** | **Datos sucios** *(el agente amplifica lo que hay)* · **volumen bajo** *(no paga la implementación)* · **procesos sin definir** *(no se gobierna lo que no existe)*. Y: **si esperas hoy una flota autónoma, no la hay** → `/cuando-no-usar-hubspot/` | Honest-limits band | Regla del hub |
| **9** | FAQ | *"¿Y si el agente le dice una barbaridad a un cliente?"* 🎯 **(la pregunta que todos tienen y nadie hace)** · *"¿Cuánto tarda?"* · *"¿Sirve con mi CRM sucio?"* · *"¿Qué pasa si HubSpot mata el agente?"* **(los Custom Assistants murieron el 13-07-2026)** · *"¿Puedo apagarlo?"* | `<details>/<summary>` | Objeciones reales |
| **10** | Puente al hub | **Pillar** *(obligatorio)* · `/precios/` (créditos) · `/cuando-no-usar-hubspot/`. 🔴 **El que no existe, no se pinta** | Card-on-section links | PDR-013 |
| **11** | CTA | **"Te decimos si un agente te sirve"** → reunión + form. 🎯 **Y el fallback honesto del hub: "y si no te sirve, te lo decimos ahí mismo"** | CTA band + `<greenhouse-form>` | Reuso |

> 🎯 **El arco de la página:** *"quiero IA pero no quiero comprar humo"* → **te digo cuáles son humo** (R2) →
> **y cómo se cobra lo que no lo es** (R3) → **y acá hay uno funcionando** (R4) → **y esto es lo que de verdad
> hay que hacer** (R5) → **y así lo controlas** (R6) → **y así lo operamos** (R7) → **y acá no te sirve** (R8).
>
> 🔴 **El orden importa más acá que en ninguna otra página del hub.** Si el caso (R4) fuera primero, sería
> **una landing de agencia presumiendo**. Poniendo **la verdad incómoda primero** (R2), cuando llega el caso
> **ya nos ganamos el derecho a que nos crean.** *(Es la misma mecánica del waiver en `/precios/`: la prueba
> llega después de la honestidad, no antes.)*

---

## Copy Ledger

> Dirección, no copy final — lo pulen `copywriting` + `greenhouse-ux-writing`.
> 🔴 **Registro sobrio.** El contenido ya es fuerte. **Cero hype de IA.** Prohibido *"revolucionario"*,
> *"el futuro es ahora"*, *"potencia tu equipo con IA"* y toda esa familia.
> 🔴 **Toda cifra sujeta a la reverificación del Slice 1.**

| Copy id | R | Texto | Notas |
|---|---|---|---|
| `hs.agentes.h1` | 1 | **"Los agentes de IA de HubSpot: cuáles funcionan de verdad."** | 🎯 *"De verdad"* es la promesa entera |
| `hs.agentes.sub` | 1 | "HubSpot anuncia una plataforma agéntica. **Tres agentes funcionan hoy.** Te decimos cuáles, cuánto cuestan, y qué pasa cuando se equivocan." | 🔴 **El número en la segunda línea.** No lo escondas |
| `hs.agentes.asof` | 1 | "Estado verificado el **{FECHA}**. HubSpot mueve esto rápido: **si ves algo desactualizado, escríbenos.**" | 🔴 Visible. **El roster cambió 3 veces en 2026** |
| 🎯 `hs.agentes.verdad.title` | **2** | **"Cuáles están listos y cuáles no."** | **La región firma.** Sin adjetivos |
| 🎯 `hs.agentes.verdad.body` | **2** | "HubSpot anuncia **doce agentes**. **Tres están en disponibilidad general** — o sea, con soporte, SLA y compromiso: **Customer Agent**, **Prospecting Agent** y **Data Agent**. **Los otros nueve están en beta.** Beta significa que **HubSpot puede cambiarlos o retirarlos sin previo aviso** — y lo hace: **los Custom Assistants se retiraron el 13 de julio de 2026.** **Nosotros no te firmamos un SLA sobre una beta.**" | 🎯 **El párrafo más citable del hub, junto con los límites.** ✅ verificado |
| `hs.agentes.costo.title` | 3 | "Pagas cuando funciona, no cuando lo intenta." | 🎯 El beneficio en el título |
| 🔴 `hs.agentes.costo.definicion` | 3 | "El Customer Agent cuesta ~**USD 0,50 por conversación resuelta**. Y *resuelta* tiene una definición precisa, **de HubSpot, no nuestra**: el agente la resolvió **y no hubo escalamiento humano en 72 horas**. Si el cliente vuelve enojado al día siguiente, **no cuenta — y no se cobra.**" | 🎯 **Citar su definición literal es honestidad Y argumento a la vez.** Es el mejor párrafo de la sección |
| 🎯 `hs.agentes.caso.title` | **4** | **"Un Customer Agent en producción."** | Sin superlativos. **El dato habla** |
| 🎯 `hs.agentes.caso.body` | **4** | "**{ANAM \| un cliente del sector servicios}** tiene el Customer Agent de HubSpot en producción. **Su equipo de atención redujo la carga un 56% en promedio** — {denominador: *"medido sobre X, entre {mes} y {mes}"*}. **En el mejor mes llegó al 76%.**" | 🔴 **56% PRIMERO. Siempre.** 🔴 **El nombre solo con autorización.** 🔴 **El denominador se declara** |
| 🔴 `hs.agentes.caso.honestidad` | **4** | "Es **un cliente**. No te vamos a decir que reducimos la carga de soporte de todo el mundo un 56%: **te decimos qué pasó en un caso real, con el número real.**" | 🎯 **Adelantarse al escepticismo lo desarma.** n=1 dicho en voz alta **suma** credibilidad; escondido, la resta |
| `hs.agentes.implementamos.title` | 5 | "Lo que separa un agente que funciona de uno que da vergüenza" | Show-don't-tell |
| `hs.agentes.implementamos.datos` | 5 | "**Sin datos limpios no hay resultado.** Un agente sobre un CRM sucio **no falla: amplifica la basura, más rápido y a más gente.** Por eso lo primero no es encender el agente: **es limpiar la base de conocimiento.**" | 🎯 El argumento que justifica el proyecto entero |
| 🎯 `hs.agentes.gobierno.title` | **6** | **"El gobierno es el producto."** | **La posición.** El título es la tesis |
| 🎯 `hs.agentes.gobierno.body` | **6** | "**El agente propone. Un humano confirma. Recién ahí se ejecuta.** Y todo pasa por un ensayo en seco (`--dry-run`) antes de tocar tu CRM. **Nadie le da la llave del CRM a una IA sin supervisión — y quien te diga que sí, sal corriendo.**" | 🔴 **Literal.** Es la frase que más nos separa del mercado |
| `hs.agentes.cli.title` | 7 | "Y operamos tu HubSpot **con** agentes." | 🎯 *"con"*, no *"para"* |
| `hs.agentes.cli.body` | 7 | "En junio de 2026 HubSpot publicó la **Agent CLI** (beta pública): una forma de que agentes de IA operen el CRM directamente. **Nosotros ya trabajamos así** — con la misma regla de arriba: **propone, confirmamos, ejecuta.** **No es roadmap. Y no te la vendemos: la usamos para operar más rápido y más barato.**" | 🔴 **Beta pública, dicho.** 🔴 **No es un producto que vendemos** |
| `hs.agentes.limites.title` | 8 | "Cuándo un agente no te sirve" | La regla del hub |
| `hs.agentes.limites.body` | 8 | "**Si tu data está sucia**, el agente amplifica el problema. **Si tu volumen es bajo**, no paga la implementación — te sale más barato el humano. **Y si tus procesos no están definidos**, no hay nada que gobernar: **no se automatiza un caos, se ordena primero.**" | 🎯 **Descalificación honesta = credibilidad** |
| 🎯 `hs.agentes.faq.barbaridad` | 9 | **"¿Y si el agente le dice una barbaridad a un cliente?"** — *"Por eso existe el gobierno. El agente **solo responde dentro de la base de conocimiento que aprobaste**, y todo lo que no está ahí **escala a un humano**. La pregunta correcta no es *"¿puede equivocarse?"* — es *"¿qué pasa cuando se equivoca?"*. **Y la respuesta tiene que estar escrita antes de encenderlo.**"* | 🎯 **La pregunta que todos tienen y nadie hace.** Contestarla explícitamente es medio deal |
| `hs.agentes.cta` | 11 | **"Te decimos si un agente te sirve."** Sub: *"Miramos tu volumen, tu data y tus procesos. **Y si no te sirve, te lo decimos ahí mismo.**"* | 🎯 La postura del hub, otra vez |

---

## State Copy

| Estado | Superficie | Copy | Nota |
|---|---|---|---|
| **Default** | Toda la página | Todo visible | 🔴 **Sin JS también** |
| 🔴 **Caso SIN autorización** | R4 | *"Un cliente del sector servicios tiene el Customer Agent en producción…"* | 🔴 **La cadena `ANAM` NO existe en el DOM.** Assertion GVC literal |
| **Caso CON autorización** | R4 | Con nombre + *(idealmente)* una frase del cliente | 🎯 Un testimonio de una línea vale más que el párrafo entero |
| **`as-of` fresco** | R1 | *"Estado verificado el {FECHA}"* | Revisión trimestral |
| 🔴 **`as-of` viejo (>90 días)** | R1 | *"Verificado el {FECHA}. **HubSpot mueve esto rápido: confírmalo con nosotros.**"* | **La página envejece diciéndolo** |
| 🎯 **HubSpot sube otro agente a GA** | R2 | La tabla se actualiza **y se anota**: *"{Agente} pasó a GA en {fecha}"* | 🎯 **Mantenerla al día, sostenido, ES la autoridad.** Es la única página del hub que se beneficia de que el mundo cambie |
| 🎯 **HubSpot mata otro agente en beta** | R2 / R9 | Se suma al ejemplo *(los Custom Assistants ya no están solos)* | 🎯 **Cada muerte nos da la razón.** Y la página lo registra |
| **Form no monta** (CORS / JS off) | R11 | 🔴 **Fallback link visible** | **El CTA nunca muere** |
| **Un cluster no existe aún** | R10 | 🔴 **El enlace no se pinta** | **Nunca un 404 interno** |

---

## Accessibility Contract

- **Un solo `<h1>`.** Jerarquía H2 → H3 estricta.
- 🔴 **La tabla GA/beta (R2) es `<table>` semántica** con `<caption>` y `<th scope>`. **NUNCA** un grid de
  `<div>`, **nunca un acordeón**. Es el dato más citable de la página: **legible por lector de pantalla, por
  teclado y por crawler.**
- 🔴 **El estado (GA / beta) NO se comunica solo por color.** Va **la palabra escrita** en la celda
  (WCAG 1.4.1). *(Un badge verde/amarillo sin texto deja al usuario daltónico sin el dato central de la página.)*
- **El stepper del gobierno (R6)** es una **lista ordenada `<ol>`** — el orden **es** el contenido
  (propone → confirma → ejecuta). 🔴 **Si el orden solo existe visualmente, se perdió el argumento.**
- FAQ con `<details>/<summary>` nativo. *(Acá sí: son preguntas, no límites. El disclosure es cortesía, no
  ocultamiento — y el contenido igual vive en el DOM.)*
- Focus ring visible (contraste AA). Touch targets ≥ 44 px.
- Reflow 320 px / 200%: la tabla scrollea **dentro de su contenedor**; en 390 px **colapsa a tarjetas completas**
  (agente + estado + qué hace) — **nunca se pierde la columna de estado.**

---

## Implementation Mapping

| Región | Implementación | Notas |
|---|---|---|
| R0 breadcrumb | Yoast + `BreadcrumbList` | Señal de hub |
| R1 hero | Ohio section + editorial header | **LCP = texto** |
| 🎯 R2 tabla GA/beta | **`<table>` semántica** + colapso a tarjetas en 390 px | 🔴 **Texto servido. Estado escrito, no solo color** |
| R3 costo | Banda + **cita textual** de la definición de HubSpot | `<blockquote>` con atribución |
| 🎯 R4 caso | **Sección aislada y autocontenida** | 🔴 **Diseñada para poder anonimizarse en 15 min sin tocar el resto** |
| R5 | Feature grid | — |
| 🎯 R6 gobierno | **`<ol>` de 3 pasos** (stepper visual sobre lista semántica) | 🔴 **El orden es el contenido** |
| R7 Agent CLI | Mechanism band | 🔴 **Beta pública, dicho. No es producto que vendemos** |
| R9 FAQ | `<details>` + JSON-LD `FAQPage` | El contenido vive en el DOM aunque esté cerrado |
| R11 form | `<greenhouse-form>` (reuso) + fallback | **NO** se reconstruye |
| Motion | **Hereda el contract del pillar** | 🔴 **Cero motion "de IA"** — ver motion contract |

🔴 **Cero primitives nuevas. Cero backend. Cero JS de librería.**

---

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-agentes` · Viewports **1440 + 390**
- Pasos: cargar → 🎯 **capturar la tabla GA/beta (R2)** → scroll al caso (R4) → capturar el stepper de gobierno
  (R6) → abrir 2 FAQs → click CTA → verificar form / fallback
- Capturas: full-page (desktop + mobile) · 🎯 **la tabla GA/beta** · **el caso (R4)** · **el stepper (R6)** ·
  FAQ abierto · **reduced-motion** · **tarjetas en 390 px**
- **Assertions:**
  - 🔴 **Sin JS:** la **tabla GA/beta**, el **56%** y el **loop de gobierno** están en el HTML servido
  - 🔴 **La cadena "flota de agentes" NO existe** en el DOM *(ni ninguna variante: "ejército", "equipo de agentes IA")*
  - 🔴 **Assertion de orden:** en el DOM, **`56` aparece antes que `76`**
  - 🔴 **Si no hay autorización: la cadena `ANAM` NO existe** en el DOM *(assertion literal, bloqueante)*
  - 🔴 **El estado GA/beta está escrito en texto**, no solo codificado por color
  - 🔴 **El gobierno es un `<ol>`** (el orden existe semánticamente, no solo visual)
  - 🔴 **Cero contadores animados** · **`as-of` visible**
  - 🔴 **Sin claims prohibidos** en el DOM
  - En 390 px: tarjetas completas con la columna de estado · sin scroll horizontal de página
  - Un solo `<h1>` · breadcrumb · canonical · **enlace al pillar presente**

---

## Design Decision Log

- 🎯 **Decisión: la verdad incómoda va PRIMERO (R2), el caso va DESPUÉS (R4).** Es la decisión estructural de la
  página. Si el caso fuera primero, esto sería **una agencia presumiendo**. Poniendo *"solo tres de doce
  funcionan"* arriba, **cuando llega el 56% ya nos ganamos el derecho a que nos crean.**
  **Es la misma mecánica del waiver en `/precios/`: la prueba llega después de la honestidad, no antes.**
  **Alternativa descartada:** *hero con el 56%* — es el patrón por defecto de toda landing de agencia,
  **y activa exactamente el escepticismo que la página necesita desarmar.**
- 🔴 **Decisión: se lidera con el 56%, no con el 76%.** *"Hasta 76%"* es literalmente cierto **y suena a
  cherry-picking** — y una página cuyo único activo es la honestidad **no puede permitirse sonar así en su
  cifra principal**. **El 76% se menciona, declarado como el mejor mes.** *(Costo: el número grande es más
  atractivo. Beneficio: la página completa sigue siendo creíble. **Vale la pena.**)*
- 🎯 **Decisión: el caso vive en una región aislada y autocontenida (R4).** No es un capricho de layout:
  **es un requisito de rollback.** Si ANAM retira la autorización, hay que poder anonimizarlo **en 15 minutos,
  editando una sola sección**. **El diseño anticipa el rollback — por eso el rollback es posible.**
- 🔴 **Decisión: cero ilustración de "IA".** Robots, cerebros, redes neuronales, partículas: **es el "AI slop"
  que la propia página denuncia en su contenido.** 🎯 **Si se ilustra algo, es el gobierno** (el loop), que es
  el argumento — no el agente, que es el producto de otro.
- **Decisión: citamos la definición de "conversación resuelta" de HubSpot, literal.** Podríamos parafrasearla y
  sonar mejor. **Citarla es más honesto — y resulta ser mejor argumento** (*"si el cliente vuelve enojado al día
  siguiente, no se cobra"*). **Cuando la honestidad y la persuasión coinciden, es que el producto es bueno.**
- **Decisión: el n=1 se dice en voz alta (R4).** *"Es un cliente."* Adelantarse al escepticismo **lo desarma**;
  esconderlo lo deja trabajando en contra en la cabeza del lector.
- **Decisión: el FAQ incluye "¿y si el agente le dice una barbaridad a un cliente?"** Es **la pregunta que todos
  tienen y nadie hace en voz alta.** Contestarla explícitamente **es medio deal.**
- **JOLT:** la indecisión de este comprador es **miedo a comprar humo y quedar mal**. La página no la combate
  con entusiasmo: **la desarma diciéndole exactamente qué es humo.**

## Acceptance Checklist

- [ ] 🎯 **La tabla GA/beta (R2) va arriba**, es `<table>` semántica, está en el HTML servido, y **el estado
      está escrito, no solo en color**.
- [ ] 🔴 **NUNCA "flota de agentes"** (assertion de DOM).
- [ ] 🔴 **El 56% aparece antes que el 76%** en el DOM (assertion de orden). El 76% **declarado como el mejor mes**.
- [ ] 🔴 **Sin autorización: la cadena `ANAM` no existe en el DOM.** El caso va anonimizado.
- [ ] 🔴 **El denominador de la métrica está enunciado** en una frase.
- [ ] **La definición de "conversación resuelta" está citada literal**, con atribución a HubSpot.
- [ ] 🎯 **El gobierno (R6) es un `<ol>`** — propone → confirma → ejecuta — con el `--dry-run` y la frase de cierre.
- [ ] **La Agent CLI** aparece como **beta pública** y **como forma de operar nuestra**, no como producto vendido.
- [ ] 🔴 **Ningún SLA sobre beta.** La muerte de los **Custom Assistants (2026-07-13)** citada.
- [ ] **Existe "cuándo un agente NO te sirve" (R8).**
- [ ] 🔴 **Sin JS la página se lee entera.** **Cero contadores.** `as-of` visible.
- [ ] 🔴 **Cero ilustración de robots/cerebros/partículas.**
- [ ] Ningún claim prohibido. Enlace al pillar presente. Ningún `href` a página inexistente.
- [ ] En 390 px las tarjetas conservan la columna de estado.
- [ ] Copy es-LATAM neutro, **sin hype de IA**, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 + reduced-motion capturado **y mirado**.
