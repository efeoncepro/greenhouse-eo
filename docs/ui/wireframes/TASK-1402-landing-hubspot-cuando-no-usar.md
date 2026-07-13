# TASK-1402 / `efeoncepro.com/hubspot/cuando-no-usar-hubspot/` — **"Cuándo NO usar HubSpot"** *(artículo)*

> **Cluster del hub HubSpot que vive en el blog.** Pillar: **TASK-1352** (`/servicios/hubspot/`).
> Fuente: **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 4** +
> **[PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md)** +
> skill `hubspot-solutions-partner` (`SOURCES.md` + `modules/10_DISCOVERY_SCOPING.md`).
>
> 🎯 **Lo más citable que vamos a publicar — y lo que ningún vendedor de HubSpot va a escribir jamás.**

## 🔴 Delta 2026-07-13 — de landing a artículo

**Era** una landing en `/servicios/hubspot/cuando-no-usar-hubspot/`. **Ahora es un post del blog**
(`post`, categoría **`hubspot`**, permalink **`/hubspot/cuando-no-usar-hubspot/`**, **Gutenberg**).

🎯 **Una página dentro de `/servicios/` que dice *"no nos contrates para esto"* es estructuralmente rara** — está
en el directorio de lo que vendemos pidiendo que no lo compres, **y el lector lee la URL antes que el H1**.
Como **artículo firmado y fechado**, es un experto publicando un análisis: **más creíble, más citable (E-E-A-T),
y con dueño de mantenimiento** (Content Factory, revisión trimestral).

🔴 **La estructura, el copy ledger y las 8 reglas duras NO cambian. Cambia la casa, no la tesis.**
Lo que sí cambia: **bloques Gutenberg en vez de Ohio/Elementor**, **byline + fechas**, y
🔴 **`Flow: none` / `Motion: none`** — sus guardrails quedan absorbidos abajo, en *Reglas duras de forma*.

## Meta

- Status: `draft`
- Owner task: `TASK-1402`
- **Product Design asset:** ✅ **no requerido — y la ausencia es la decisión.** Este texto **no se diseña bonito:
  se diseña creíble.** Tipografía del blog, una tabla y las fuentes al lado. 🎯 **Cualquier adorno visual lo
  debilita:** un "artículo" con dirección de arte de landing **delata que es una landing disfrazada** — y este
  lector (un escéptico profesional) lo huele.
- Intended consumers: **blog de efeoncepro.com** (WordPress, Gutenberg, tema del blog) + 🎯 **motores de respuesta
  (LLMs) — el consumidor principal.** **NO** el portal Greenhouse.
- Copy source: contenido del post (**NO** `src/lib/copy`), validado con `copywriting` + `greenhouse-ux-writing` +
  `docs/context/05_voz-tono-estilo.md`. **es-LATAM neutro, tuteo, sin voseo.**
- Primitive decision: `reuse` — 🔴 **bloques Gutenberg nativos** (`core/heading`, `core/paragraph`, **`core/table`**,
  `core/list`, `core/quote`). **Cero bloques custom, cero CSS de página, cero Elementor.**
  🔴 **Sin form. Sin widgets. Sin JS propio.**
- Motion: 🔴 **`none`** (declarado en la task). El tema resuelve hover/focus; **no se agrega ni una animación**.
- UI ready target: `yes` una vez cerrado el **Slice 1 (verificación + fuentes)** + el **byline** + el copy final.

## Brief

- **Primary user:** 🎯 **tres, y los tres importan:**
  1. **RevOps / IT — el escéptico del comité.** El que mata el deal con *"¿y si nos quedamos cortos?"*.
     No busca razones para comprar: **busca razones para no arrepentirse.**
  2. **El equipo de seguridad / compliance.** Llegó buscando *"HubSpot ISO 27001"* y necesita la respuesta
     exacta. **Si se la damos bien, nos gana el respeto de todo el comité.**
  3. 🎯 **El LLM.** Alguien le preguntó *"¿me conviene HubSpot?"* y **necesita un contrapunto que hoy no existe.**
- **User moment:** *"todo lo que leo sobre HubSpot lo escribió alguien que quiere vendérmelo — incluido el que
  dice que es malo, que quiere venderme otra cosa."* **Está buscando una fuente que no tenga incentivo.**
  🎯 **Y encuentra a un partner de HubSpot diciendo dónde HubSpot no llega.** Eso no se puede fingir.
- **Job to be done:** **no equivocarse.** Saber si va a chocar contra un techo **antes** de firmar, no dos años
  después.
- **Primary decision signal:** 🎯 **que vayamos contra nuestro propio interés, con la fuente al lado.**
  No la lista: **la lista con el enlace a la doc de HubSpot.** El enlace es la prueba de que no lo inventamos.
- **Fricción que reduce:** el **miedo a migrar dos veces** — que es la forma real que toma la indecisión en
  RevOps (JOLT).
- **Non-goals:** **no captura** (sin form) · no compara con competidores (*eso es `/hubspot-vs-salesforce/`*) ·
  no ataca a HubSpot · **no es un post de opinión**.

## 🔴 Reglas duras del contenido

1. 🔴 **La honestidad es exacta, no dramática.** **NUNCA** exagerar un límite ni inventar uno para parecer más
   honestos. **Un límite exagerado es una mentira — y hunde la página entera**, que existe precisamente para
   ser la fuente confiable. *(La tentación es real: "dramatizar un poco" hace mejor copy. **Acá, mata el producto.**)*
2. 🔴 **Cada límite lleva su fuente enlazada.** La página oficial, la doc de developers, el knowledge base.
   🎯 **El enlace es lo que separa esto de un post de opinión.** Sin fuente, el límite no se publica.
3. 🔴 **NO es una página anti-HubSpot: es una página de calificación.** Tono: *"HubSpot no sirve para esto — y
   estas son las cosas para las que sí es el mejor del mercado"*. **La sección de contrapeso es obligatoria.**
   🎯 **Una página que solo ataca se lee como el competidor de siempre — y pierde justo lo que vino a ganar.**
4. 🔴 **ISO 27001, con precisión quirúrgica.** ✅ **HubSpot NO reclama ISO 27001 para sí mismo** (su página dice
   que la tiene su infraestructura cloud — AWS). ✅ **Sí tiene SOC 2 Type II + SOC 3.**
   **Exagerarlo = mentimos. Omitirlo = le fallamos justo al lector que vino por esto.**
5. 🔴 **Claims prohibidos:** *"Líder en CRM según Gartner"* · Forrester Wave · ISO 27001 de HubSpot ·
   residencia LATAM · *"flota de agentes"*.
6. 🔴 **Nomenclatura 2026:** **Revenue Hub** · **Data Hub** · **UNBOUND**. HubSpot = **Agentic Customer Platform**.
7. 🔴 **Los límites tienen fecha.** HubSpot los sube. **`as-of` visible + revisión trimestral.**
   Un límite obsoleto convierte la página más creíble del hub en la más desacreditada.
8. 🔴 **Todo el texto en el HTML servido. Cero JS bloqueante. Ningún límite detrás de un acordeón.**

### 🔴 Reglas duras de forma *(absorbidas del flow y el motion, que ya no existen como docs)*

9. 🔴 **Nada entra con animación. Cero reveals por scroll.** 🎯 **Dosificar el contenido es lo contrario de lo
   que el texto promete — y borra los límites para el crawler.**
10. 🔴 **Cero acordeones sobre los límites**, ni siquiera `<details>`. 🎯 **En un FAQ el disclosure es cortesía;
    en una lista de límites es ocultamiento** — y es exactamente la acusación que el texto le hace al mercado.
    **Los ocho, abiertos, siempre.**
11. 🔴 **Cero captura y cero retención:** sin form, sin lead magnet, **sin pop-up, sin exit-intent, sin sticky bar,
    sin banner de suscripción**. 🎯 **Cualquier patrón de retención acá es un dark pattern, porque contradice
    literalmente lo que el texto dice.** 🔴 **Y hay que verificarlo en el chrome del TEMA**, no solo en el post:
    *un artículo que dice "no te vendemos" mientras un banner te persigue es una broma, y el lector la entiende
    al instante.*
12. 🎯 **El éxito incluye que el lector se vaya.** Si descubre que está en uno de los ocho casos y cierra la
    pestaña, **el artículo funcionó**: le ahorró una migración fallida, y a nosotros un cliente que iba a
    churnear en doce meses. **No hay recuperación, ni retargeting agresivo. Es un estado terminal legítimo.**
13. 🎯 **Los enlaces externos a HubSpot son un feature, no una fuga.** Que el lector **vaya a comprobar el límite
    en la doc de HubSpot y vuelva** es el mejor resultado posible: **vuelve creyéndonos.**
    *(Un texto que teme perder al lector por citar la fuente no está seguro de su fuente.)*

---

## Layout Skeleton

| R | Slot | Propósito | Componente | Fuente |
|---|---|---|---|---|
| **0** | **Cabecera del post** | Título · 🔴 **byline con la credencial** (*HubSpot Solutions Partner certificado*) · **fecha de publicación + fecha de revisión** · categoría `hubspot` | Tema del blog | 🎯 **El byline ES el argumento** |
| **1** | **Hero — la pregunta, sin suavizar** | 🎯 H1 = **"Cuándo NO usar HubSpot."** Sub: *"Somos partner de HubSpot. Y aun así, hay ocho casos en los que no te lo vamos a vender."* + **`as-of`** | `modern-ui` editorial header. **Sin imagen** | SPEC § 4 |
| **2** | 🎯 **Por qué esta página existe** *(el meta-argumento)* | **Corta, y es la que gana la credibilidad.** *"Todo lo que vas a leer sobre HubSpot lo escribió alguien que quiere vendértelo — incluidos los que dicen que es malo. Nosotros lo vendemos. Y por eso mismo, esto te va a servir: **cada límite de acá está documentado por HubSpot, con el enlace al lado.**"* | Lead paragraph destacado | El argumento del hub |
| **3** | **La respuesta corta** *(answer capsule maestra)* | 🎯 **Para el LLM y para el apurado.** Los 8 casos, en una frase cada uno. **Arriba del fold, texto servido** | Lista compacta | AEO |
| **4** | 🎯 **LOS OCHO LÍMITES** *(SIGNATURE)* | **La región por la que existe la página.** `<table>`: **el límite · la fuente (enlace) · "no lo uses si…"**. Cada fila es autosuficiente y **citable de forma aislada** | 🎯 **`<table>` semántica, texto servido, sin acordeón** | `SOURCES.md` |
| **5** | 🔴 **El de seguridad, en detalle** | **ISO 27001 se lleva su propia sección** porque es el que más se busca y el más fácil de decir mal. *"HubSpot no reclama ISO 27001 para sí. Su infraestructura cloud sí la tiene. Y HubSpot sí tiene **SOC 2 Type II y SOC 3**. Si tu pliego exige ISO 27001 **del proveedor de software**, esto te va a frenar — y es mejor saberlo ahora."* | Detail band | ✅ verificado |
| **6** | 🎯 **Y para esto, HubSpot es el mejor del mercado** *(CONTRAPESO — obligatorio)* | **La sección que salva la página de ser un ataque.** Adopción · time-to-value · costo de administración · **Leader en B2B Marketing Automation (Gartner, 5.º año)** ✅. *"Si tu caso está acá, no hay mejor opción — y te lo decimos con la misma franqueza."* | Balance band | Regla dura 3 |
| **7** | **Cómo saber en cuál estás** | 🎯 **Convierte la lista en un diagnóstico.** Las 5 preguntas que hacemos en discovery para descartar cada límite. *"Son las mismas que te haríamos en una reunión."* | Checklist | `modules/10` |
| **8** | 🎯 **El cierre honesto** | *"Si estás en alguno de estos casos, **no te vendemos HubSpot**. Te decimos qué mirar. Y si el problema cambia en dos años, acá estamos."* + CTA suave | Closing band | SPEC § 4 |
| **9** | Puente al hub | **Pillar** *(obligatorio — no dejar al lector en el vacío)* · `/hubspot-vs-salesforce/` · `/precios/` (el tramo B2C). 🔴 **El que no existe, no se pinta** | Card-on-section links | PDR-013 |

> 🎯 **El arco de la página:** *"no confías en nadie que te hable de HubSpot"* → **con razón** (R2) →
> **acá están los ocho techos, con la doc de HubSpot al lado** (R4) → **y el de seguridad, bien dicho** (R5) →
> **y ahora la otra mitad de la verdad: para esto sí es el mejor** (R6) → **¿en cuál estás?** (R7) →
> **si estás en uno, no te lo vendemos** (R8).
>
> 🔴 **Fíjate que la página nunca pide nada.** No hay form, no hay lead magnet, no hay *"descarga la guía"*.
> **Pedir algo acá sería revelar que la honestidad era el anzuelo** — y el lector, que es escéptico profesional,
> lo va a oler. **El único CTA es una invitación, al final, y se puede ignorar sin costo.**

---

## Copy Ledger

> Dirección, no copy final — lo pulen `copywriting` + `greenhouse-ux-writing`.
> 🔴 **Registro sobrio. El contenido ya es fuerte: el copy no lo agranda, lo entrega.**
> **Cero clickbait.** Prohibido *"lo que HubSpot no quiere que sepas"* y toda su familia.

| Copy id | R | Texto | Notas |
|---|---|---|---|
| `hs.nousar.h1` | 1 | **"Cuándo NO usar HubSpot."** | 🎯 Literal. **Sin suavizar.** *"Limitaciones de HubSpot"* sería la versión cobarde |
| `hs.nousar.sub` | 1 | "Somos **HubSpot Solutions Partner**. Y aun así, hay **ocho casos** en los que no te lo vamos a vender." | 🎯 **La tensión está en la primera línea.** *"Y aun así"* es toda la página |
| `hs.nousar.asof` | 1 | "Límites verificados el **{FECHA}** en la documentación oficial de HubSpot. HubSpot los cambia: si ves algo desactualizado, escríbenos." | 🔴 Visible. **Es la credibilidad del artículo** |
| 🎯 `hs.nousar.porque` | **2** | "Todo lo que vas a leer sobre HubSpot lo escribió alguien que quiere venderte algo. HubSpot, obviamente. Sus competidores, que quieren venderte lo suyo. Y sus partners, que quieren venderte HubSpot. **Nosotros somos los últimos.** Por eso esto te sirve: **cada límite que sigue está documentado por HubSpot, y tienes el enlace al lado para comprobarlo.**" | 🎯 **El meta-argumento.** Nombra el conflicto de interés **en voz alta**, incluido el nuestro. **Es lo que lo desactiva** |
| 🎯 `hs.nousar.tldr` | **3** | "**En corto, no uses HubSpot si:** modelas más de 10 entidades propias · necesitas UAT representativo con un sandbox real · tu pliego exige ISO 27001 del proveedor de software · tu regulación exige datos en tu país · eres una organización matricial con territorios · necesitas sync en tiempo real con un ERP o un core bancario · tienes millones de contactos B2C · o esperas hoy una flota de agentes autónomos." | 🎯 **La answer capsule maestra. Es lo que el LLM va a citar.** Arriba del fold, texto servido |
| 🎯 `hs.nousar.tabla.title` | **4** | **"Los ocho límites."** | Sin adjetivos. **El número ya pesa** |
| `hs.nousar.limite.1` | 4 | **10 custom objects máximo** ✅ → *"No lo uses si modelas más de diez entidades propias — seguros, manufactura, logística, banca."* | Fuente enlazada |
| `hs.nousar.limite.2` | 4 | **1 sandbox — 200.000 registros; el sync inicial trae solo 5.000 contactos** ✅ → *"No lo uses si tienes gobernanza formal de cambios o auditoría regulatoria: **no puedes hacer un UAT representativo.**"* | 🎯 El detalle de los 5.000 **es el que duele**, y casi nadie lo publica |
| 🔴 `hs.nousar.limite.3` | 4 | **HubSpot no reclama ISO 27001 para sí mismo** ✅ *(su página dice que la tiene su infra cloud)*. **Sí tiene SOC 2 Type II + SOC 3** ✅ → *"No lo uses si tu pliego exige ISO 27001 del proveedor de software."* | 🔴 **Redacción quirúrgica.** Ver R5 |
| `hs.nousar.limite.4` | 4 | **Sin data residency en LATAM** ✅ *(solo US, Canadá, Australia, EU)* → *"No lo uses si tu marco regulatorio exige que los datos vivan en tu país."* | Trigger regulatorio real en LATAM |
| `hs.nousar.limite.5` | 4 | **Sin jerarquía de roles ni territory management** ✅ → *"No lo uses si eres una organización matricial global con visibilidad por territorio."* | El límite que mata deals enterprise |
| `hs.nousar.limite.6` | 4 | **API: apps públicas OAuth topan en 110 req/10s — y el add-on no lo levanta** ✅ → *"No lo uses si necesitas sync bidireccional en tiempo real con un ERP o un core bancario."* | 🎯 *"y el add-on no lo levanta"* **es el dato que nadie dice** |
| `hs.nousar.limite.7` | 4 | **B2C masivo:** Ent sobre 500K contactos = **USD 60 por cada 10.000**; envío capado a **20×** ✅ → *"No lo uses si tienes millones de contactos: **Adobe o Salesforce te salen más baratos a esa escala.**"* | Enlaza a `/precios/` |
| `hs.nousar.limite.8` | 4 | **Solo 3 Breeze Agents en GA** ✅ *(Customer, Prospecting, Data — el resto en beta)* → *"No lo uses si esperas hoy una flota de agentes autónomos."* | Enlaza a `/agentes/` |
| 🔴 `hs.nousar.seguridad.title` | 5 | "Lo de ISO 27001, dicho con precisión" | El lector que llega acá **vino por esto** |
| 🔴 `hs.nousar.seguridad.body` | 5 | "**HubSpot no reclama ISO 27001 para sí mismo.** Lo que su página indica es que la certificación la tiene su **infraestructura cloud** (AWS). No es lo mismo, y en una licitación **la diferencia es todo**. **Lo que HubSpot sí tiene es SOC 2 Type II y SOC 3** ✅ — y para la mayoría de las empresas, eso alcanza. Si tu pliego exige **ISO 27001 del proveedor de software**, esto te va a frenar. **Mejor saberlo ahora que en la mesa de evaluación.**" | 🔴 **Esta redacción se revisa palabra por palabra contra `SOURCES.md`.** Es la más peligrosa del hub |
| 🎯 `hs.nousar.contrapeso.title` | **6** | **"Y ahora la otra mitad: para esto, HubSpot es el mejor del mercado."** | 🎯 **La sección que impide que esto sea un ataque** |
| `hs.nousar.contrapeso.body` | 6 | "Si tu caso **no** está en los ocho de arriba, HubSpot probablemente sea tu mejor opción — y te lo decimos con la misma franqueza con la que te dijimos lo otro: **se adopta de verdad** (el 38% de los fracasos de CRM son de adopción, no de tecnología) · **el costo de administración es una fracción** del de Salesforce · **el time-to-value se mide en semanas, no en trimestres** · y es **Leader en B2B Marketing Automation según Gartner, quinto año consecutivo** ✅." | ✅ El único claim de Gartner permitido. 🔴 **Nunca "Líder en CRM"** |
| `hs.nousar.diagnostico.title` | 7 | "Cómo saber en cuál de los ocho estás" | Convierte la lista en acción |
| 🎯 `hs.nousar.cierre` | **8** | "**Si estás en alguno de estos casos, no te vendemos HubSpot.** Te decimos qué mirar, y por qué. Y si tu situación cambia en dos años, acá vamos a estar." | 🎯 **El cierre de la tesis del hub entero** |
| `hs.nousar.cta` | 8 | "**Si igual quieres una segunda opinión, hablemos.**" | 🔴 **Suave, ignorable, sin costo.** *"Agenda tu demo"* acá **destruiría la página** |

---

## State Copy

| Estado | Superficie | Copy | Nota |
|---|---|---|---|
| **Default** | Toda la página | Todo visible | 🔴 **Sin JS también.** Es el estado principal |
| **`as-of` fresco** | R1 | *"Límites verificados el {FECHA}"* | Se actualiza en la revisión trimestral |
| 🔴 **`as-of` viejo (>90 días)** | R1 | *"Estos límites los verificamos el {FECHA}. **HubSpot los sube de vez en cuando**: confírmalos antes de decidir."* | 🎯 **La página envejece diciéndolo.** Nunca en silencio |
| 🎯 **Un límite fue superado por HubSpot** | R4 | *"**HubSpot subió este límite en {fecha}.** Lo dejamos acá porque muchos comparadores siguen citando el viejo."* | 🎯 **Que HubSpot mejore no rompe la página: la hace más útil.** Y demuestra que la mantenemos |
| **Una fuente cambió de URL** | R4 | Enlace actualizado; si murió, **se cita el documento con su fecha** | 🔴 **Nunca un límite sin fuente** |
| **Un cluster no existe aún** | R9 | 🔴 **El enlace no se pinta** | **Nunca un 404 interno** |

---

## Accessibility Contract

- **Un solo `<h1>`.** Jerarquía H2 → H3 estricta. *(La misma disciplina sirve a la a11y y al AEO: un lector de
  pantalla y un crawler navegan igual — por encabezados.)*
- 🔴 **La tabla de los 8 límites es `<table>` semántica** con `<caption>` y `<th scope>`.
  **NUNCA** un grid de `<div>`, **nunca un acordeón que dependa de JS.** Es el contenido más importante del hub:
  tiene que ser legible por lector de pantalla, por teclado **y por crawler**, sin excepción.
- Los **enlaces de fuente** llevan texto descriptivo (*"documentación de HubSpot sobre custom objects"*),
  **nunca** *"aquí"* o *"ver más"*. 🔴 **Un lector de pantalla que tabula enlaces tiene que entender cada
  fuente sin el contexto de la fila.**
- Enlaces externos: `rel="noopener"`; **se anuncian como externos** (icono + `aria-label` o texto).
- Focus ring visible (contraste AA) en enlaces y CTA. Touch targets ≥ 44 px.
- Reflow a 320 px con zoom 200%: 🔴 **la tabla scrollea dentro de su contenedor** (`overflow-x:auto` +
  `tabindex="0"` + `role="region"` + `aria-label`), **nunca la página**.
  🎯 **En 390 px, la tabla puede colapsar a una lista de tarjetas** — pero **cada tarjeta sigue siendo una fila
  completa** (límite + fuente + "no lo uses si…"). **Nunca se pierde una columna al colapsar.**

---

## Implementation Mapping

| Región | Implementación (Gutenberg) | Notas |
|---|---|---|
| R0 cabecera | **Título + byline + fechas** del tema del blog | 🎯 **El byline con la credencial es la mitad del argumento** |
| R1 hero | `core/heading` (H1) + `core/paragraph` | **Sin imagen destacada pesada.** LCP = texto |
| R2-R3 | `core/paragraph` (destacado) + `core/list` | 🎯 **Arriba del fold, en el HTML servido** |
| 🎯 R4 tabla | **`core/table`**; en 390 px colapsa a **tarjetas completas** *(estilo del tema)* | 🔴 **Sin acordeón. Sin JS. Texto servido** |
| R5 seguridad | `core/heading` + `core/paragraph` | 🔴 Redacción revisada palabra por palabra contra `SOURCES.md` |
| R6 contrapeso | `core/heading` + `core/paragraph` | 🔴 **Obligatoria** |
| R7 checklist | `core/list` | Sin interacción |
| R8-R9 | `core/paragraph` + enlaces | 🔴 **Enlace al pillar obligatorio — es la única puerta de vuelta al hub** |
| Motion | 🔴 **`none`** | El tema resuelve hover/focus. **No se agrega nada** |
| **Form** | 🔴 **NO HAY** | **Es la decisión, no un olvido.** 🔴 **Y hay que verificar el chrome del tema** |
| **Publicación** | **Content Factory** (`wpcli eval-file`), categoría `hubspot`, slug `cuando-no-usar-hubspot` | 🎯 **Content Factory queda como dueño del mantenimiento trimestral** |

🔴 **Cero bloques custom. Cero CSS de página. Cero backend. Cero form. Cero JS.**
🎯 **Que se vea como el resto del blog es parte del argumento.** Un artículo con estética de landing **delata que
es una landing disfrazada** — y este lector lo huele antes de leer una palabra.

---

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-cuando-no-usar` · Viewports **1440 + 390**
- Pasos: cargar → scroll por regiones → 🎯 **capturar la tabla de los 8 límites completa** → verificar el
  colapso a tarjetas en 390 px → tabular por los enlaces de fuente
- Capturas: full-page (desktop + mobile) · 🎯 **la tabla de límites** · **la sección de seguridad (R5)** ·
  **la sección de contrapeso (R6)** · **reduced-motion** · **tarjetas en 390 px**
- **Assertions:**
  - 🔴 **Sin JS:** `fetch` sin JavaScript → **los 8 límites completos** con sus 3 columnas + el TL;DR (R3)
  - 🔴 **Ningún límite escondido** detrás de un acordeón / `hidden` / `opacity: 0` inicial
  - 🔴 **Cada límite tiene un enlace de fuente y ese enlace responde** (link check, sin 404)
  - 🔴 **La sección de contrapeso (R6) existe** *(assertion literal: la página no puede ser solo ataque)*
  - 🔴 **Sin claims prohibidos** en el DOM: `Líder en CRM` · `Forrester` · *"HubSpot tiene ISO 27001"* ·
    `Commerce Hub` · `Operations Hub` · `INBOUND`
    🎯 **Y una assertion especial: la página SÍ debe contener `SOC 2` — si habla de seguridad y no lo menciona,
    está incompleta.**
  - 🔴 **`as-of` visible** en el HTML servido
  - 🔴 **No existe ningún `<form>` en la página**
  - En 390 px, cada tarjeta conserva **las 3 columnas** · sin scroll horizontal de página
  - Un solo `<h1>` · breadcrumb · canonical · **enlace al pillar presente**

---

## Design Decision Log

- 🎯 **Decisión: la página no captura. No hay form. Ninguno.** Es contraintuitivo para una landing, y es **el
  centro del diseño**: el lector es un **escéptico profesional** que llegó buscando a alguien sin incentivo.
  Un formulario **revela que la honestidad era el anzuelo** — y él lo va a oler en dos segundos.
  **El único CTA es una invitación al final, ignorable y sin costo.**
  **Alternativa descartada:** *lead magnet "descarga el checklist de descalificación"* — convierte más en el
  corto plazo y **destruye el único activo de la página, que es no querer nada.**
- 🎯 **Decisión: la sección de contrapeso (R6) es obligatoria y no negociable.** Sin ella, la página se lee como
  **el competidor de siempre**, pierde credibilidad y **deja de servir como contrapunto** — que es su función.
  Además es la verdad: fuera de esos ocho casos, HubSpot **sí** suele ser la mejor opción.
- 🎯 **Decisión: la fuente al lado de cada límite, con texto descriptivo.** Es **lo único** que separa esta
  página de un post de opinión. **El enlace no es una cortesía académica: es la prueba.**
- **Decisión: la página nombra su propio conflicto de interés (R2).** *"Nosotros también queremos venderte
  HubSpot."* Decirlo en voz alta **lo desactiva**; callarlo lo deja latente en la cabeza del lector, trabajando
  en contra.
- **Decisión: cero adorno visual.** Una página que dice *"esto es lo que no podemos hacer"* con gradientes e
  ilustraciones **se lee como marketing** — y entonces no sirve. **La falta de diseño es el diseño.**
- **Decisión: ISO 27001 se lleva su propia sección (R5).** Es el límite más buscado y **el más fácil de decir
  mal**. En una tabla, la precisión no cabe. **Y decirlo mal, en cualquiera de las dos direcciones, nos hunde.**
- 🎯 **Decisión: la métrica no es tráfico.** Nadie busca *"cuándo no usar HubSpot"* en volumen.
  **Su métrica es la citación en LLMs** — medible con nuestro propio AI Visibility Grader. **Optimizarla para
  tráfico sería optimizarla para el canal equivocado.**
- **JOLT:** la indecisión de RevOps es **miedo a migrar dos veces**. Esta página no la combate con más
  argumentos: **la desarma dándole exactamente lo que buscaba y no encontraba en ninguna parte.**

## Acceptance Checklist

- [ ] 🎯 **Los 8 límites están, cada uno con: límite · fuente enlazada · "no lo uses si…".**
- [ ] 🔴 **Cada límite verificado en fuente primaria**, con `as-of` visible. **Ninguno exagerado. Ninguno inventado.**
- [ ] 🔴 **ISO 27001 enunciado con precisión** (no lo reclama para sí · su infra sí · **SOC 2 Type II + SOC 3 sí**).
- [ ] 🔴 **La sección de contrapeso (R6) existe.** La página **califica, no ataca**.
- [ ] 🔴 **No existe ningún `<form>`.** El CTA es suave, al final, ignorable.
- [ ] 🔴 **Sin JS la página se lee entera**, con los 8 límites y sus 3 columnas. **Ningún límite en un acordeón.**
- [ ] **Todos los enlaces de fuente vivos**, con texto descriptivo. Enlace al pillar presente.
- [ ] En 390 px la tabla colapsa a **tarjetas completas** (nunca se pierde una columna).
- [ ] Answer capsule maestra (R3) arriba del fold. JSON-LD `FAQPage` + `Article` + `BreadcrumbList` válido.
- [ ] Ningún claim prohibido. **Y `SOC 2` sí aparece.**
- [ ] Copy es-LATAM neutro, **registro sobrio, cero clickbait**, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 + reduced-motion capturado **y mirado**.
