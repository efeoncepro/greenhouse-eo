# TASK-1401 / `efeoncepro.com/servicios/hubspot/precios/` — **"Cuánto cuesta HubSpot de verdad"**

> **Cluster 1 de 4** del hub HubSpot. Pillar: **TASK-1352** (`/servicios/hubspot/`).
> Fuente: **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 2** +
> **[PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md)** +
> skill `hubspot-solutions-partner` (`SOURCES.md` + `modules/01` + `modules/11 § 2`).
>
> 🎯 **La única página del hub con demanda de búsqueda real** (~1.500/mes). Carga el peso SEO/AEO del hub.

## Meta

- Status: `draft`
- Owner task: `TASK-1401`
- **Product Design asset:** ✅ **no requerido.** No hay art direction bloqueante: la página es **tipografía,
  tablas y números**. Su fuerza es la exactitud, no la ilustración. *(Una página de precios que necesita
  ilustración es una página de precios que no confía en sus números.)*
- Intended consumers: sitio público (WordPress/Ohio, **marketing lane** `modern-ui`) + 🎯 **motores de respuesta
  (LLMs)**, que son un consumidor de primera clase acá. **NO** el portal Greenhouse.
- Copy source: contenido de página pública (**NO** `src/lib/copy`), validado con `greenhouse-ux-writing` +
  `copywriting` + `docs/context/05_voz-tono-estilo.md`. **es-LATAM neutro, tuteo, sin voseo.**
- Primitive decision: `reuse` — patrones marketing `modern-ui` (tabla comparativa, section header, card-on-section)
  + `<greenhouse-form>` embebido. **Cero primitives nuevas.**
- Motion: **hereda el contract del pillar** (TASK-1352). Tier **restraint**.
- UI ready target: `yes` una vez cerrado el **Slice 1 (reverificación de precios)** + el copy final.

## Brief

- **Primary user:** quien **evalúa HubSpot y quiere el número antes de hablar con un vendedor**. Típicamente
  **CFO, RevOps o el CMO que tiene que defender el presupuesto** — no el usuario final.
  🎯 **Su estado emocional:** *"me van a hacer agendar una demo para decirme el precio, y no quiero"*.
  **Esta página es el anti-gate.**
- **User moment:** googleó *"cuánto cuesta HubSpot"*, cayó en hubspot.com/pricing, vio una grilla, **y salió con
  más dudas que respuestas** — porque la grilla no le dice qué seats necesita, cómo saltan los contactos, que los
  créditos no se suman, ni que hay un onboarding obligatorio que no aparece en ningún lado.
- **Job to be done:** **poder armar el número él mismo** — o al menos entender de qué depende — **sin pedirle
  permiso a nadie.**
- **Primary decision signal:** 🎯 **que le contemos lo que HubSpot no le cuenta.** Las dos trampas de los
  créditos y el onboarding obligatorio. **Ese es el momento en que decide que somos confiables.**
  El waiver viene después, y por eso funciona: **no es una oferta, es una consecuencia.**
- **Fricción que reduce:** el *"tengo que agendar una demo para saber el precio"* + el miedo a **la factura
  sorpresa** (que es exactamente lo que el onboarding obligatorio produce).
- **Non-goals:** **no cotiza** (regla dura 1); no es un configurador; no vende un Hub específico; no reconstruye
  el form ni el agendador.

## 🔴 Reglas duras del contenido

1. 🔴 **Explica, no cotiza.** **NO** hay cotizador self-serve ni calculadora pública. Una calculadora
   **miente con precisión** — el precio real depende de descuentos, term y bundle — y quema justo la
   credibilidad que la página existe para construir.
2. 🔴 **Todo precio: reverificado en fuente primaria + marcado + con `as-of` visible.**
   ✅ verificado · ⚠️ secundario → **orden de magnitud, jamás precio exacto** · ❌ no publicado → **se dice
   *"HubSpot no lo publica"*** *(y eso **es** el argumento: Adobe no publica el precio de Marketo; nosotros sí
   publicamos el nuestro)*. **NUNCA se inventa un número.**
3. 🔴 **Los dos ❌ conocidos, explícitos:** el fee de onboarding del **bundle Customer Platform** (**no publicado**)
   y los **contactos de marketing adicionales** (las fuentes públicas **discrepan 10×** → se explica el
   **mecanismo**, no el monto).
4. 🔴 **Claims prohibidos:** *"Líder en CRM según Gartner"* · Forrester Wave · **ISO 27001** de HubSpot ·
   residencia de datos en LATAM · *"flota de agentes"*.
5. 🔴 **Nomenclatura 2026:** **Revenue Hub** · **Data Hub** · **UNBOUND**. HubSpot = **Agentic Customer Platform**.
6. 🔴 **La página dice cuándo el modelo NO te sirve** (B2C masivo → **Adobe o Salesforce salen más baratos a
   escala**). Es la regla del hub y **no se negocia**.
7. 🔴 **El waiver es un número, no un adjetivo.** *"USD 3.000 sobre USD 9.600 = 31% del año 1"*. Y la distinción:
   **el de HubSpot es coaching; el nuestro es implementación.**
8. 🔴 **Toda cifra citable en el HTML servido. Cero contadores JS.** Los crawlers de IA no ejecutan JavaScript —
   y esta es *la* página que queremos que citen.

---

## Layout Skeleton

| R | Slot | Propósito | Componente | Fuente |
|---|---|---|---|---|
| **0** | Header + **breadcrumb** | Nav Ohio nativo + `Servicios › HubSpot › Precios` **(el breadcrumb es la señal de hub, no adorno)** | Ohio native + breadcrumb | Tema |
| **1** | **Hero — la pregunta** | 🎯 H1 = *"Cuánto cuesta HubSpot de verdad."* Sub: *"El precio de lista está publicado. Lo que te va a costar, no."* + **`as-of` visible** + CTA dual | `modern-ui` editorial header | SPEC § 2 |
| **2** | **La respuesta corta** *(answer capsule maestra)* | 🎯 **Para el LLM y para el apurado.** 3-4 líneas: rango realista + los tres costos que nadie menciona (seats · saltos de contactos · onboarding). **Texto servido, arriba del fold** | Lead paragraph destacado | AEO |
| **3** | **Cómo se cobra** | Por Hub · por tier · por seat. Y la trampa base: **el precio menor que ves es anual** | Tabla + nota | `modules/01` |
| **4** | **Los seats** | core · sales · service · **revenue** *(necesario para quotes)* · 🎯 **view-only: GRATIS** — *"nadie lo dice, y cambia el número"* | Tabla | `modules/01` |
| **5** | **Los contactos de marketing** | 🔴 **Los saltos son escalonados, no lineales.** De 2.000 a **2.001** contactos = **+USD 250/mes**. *"Modela el crecimiento de tu base, no el número de hoy."* ⚠️ **el mecanismo, sin inventar el monto del tramo** | Diagrama de escalón (**CSS/SVG estático, sin JS**) | `modules/01` |
| **6** | 🎯 **LOS CRÉDITOS — y sus dos trampas** *(SIGNATURE)* | **La región por la que existe esta página.** Tabla **"lo que crees que compras" vs "lo que compras"**: 4 Hubs Enterprise = **20.000 créditos ❌ → 5.000 ✅**. **No hay rollover.** Consumo real: Customer Agent **USD 0,50 / conversación resuelta** · Prospecting **USD 1 / lead** | 🎯 **Tabla comparativa a dos columnas, texto servido** | `modules/01` § trampas |
| **7** | 🔴 **El onboarding obligatorio** | Marketing Pro **USD 3.000** · Ent **USD 7.000** · Sales/Service **1.500 / 3.500**. ❌ **El del bundle Customer Platform no está publicado — pídelo por escrito.** *"Casi nadie lo cotiza. Aparece en la primera factura."* | Alert band (sobrio, **no alarmista**) | `modules/11 § 2` |
| **8** | 🎯 **El waiver** | **El número.** *"Ese cargo desaparece de tu contrato si trabajas con nosotros."* En Marketing Hub Pro: **USD 3.000 sobre USD 9.600 = 31% del año 1.** Y: **el de HubSpot es coaching — te enseñan y lo haces tú. El nuestro es implementación: te lo construimos.** 🔴 **El HubSpot directo no puede igualarlo** | Offer band — **cifra en texto servido** | `modules/11 § 2` |
| **9** | 🔴 **Cuándo el modelo de precio NO te sirve** | Base B2C de millones de contactos *(Ent a 500K+ = USD 60 por cada 10.000; envío capado a 20×)*: **ahí Adobe o Salesforce salen más baratos a escala. Te lo decimos.** → enlaza a `/cuando-no-usar-hubspot/` | Honest-limits band | Regla del hub |
| **10** | **Qué te vamos a preguntar para cotizarte** | 🎯 **Transparencia del proceso, no un form largo.** Las 5 variables que mueven el número (Hubs · tier · contactos · seats · migración). *"Con eso te damos un número real en 48 horas. Sin costo."* | Checklist | Discovery |
| **11** | FAQ | 🎯 **Las preguntas que la gente realmente busca** — y por eso van en `FAQPage`: *"¿HubSpot tiene plan gratis?"* · *"¿Puedo pagar mensual?"* · *"¿Qué pasa si me paso de contactos?"* · *"¿El onboarding es obligatorio?"* · *"¿Se pueden negociar los precios?"* · *"¿Cuánto sube al renovar?"* | `<details>/<summary>` | Búsquedas reales |
| **12** | Puente al hub | Pillar *(obligatorio)* · `/agentes/` *(el costo por outcome)* · `/hubspot-vs-salesforce/` *(el TCO)* · `/cuando-no-usar-hubspot/`. 🔴 **El que no existe, no se pinta** | Card-on-section links | PDR-013 |
| **13** | CTA final | **"Te lo cotizamos sin costo"** → reunión (Meetings + UTM) + form como segundo escalón | CTA band + `<greenhouse-form>` | Reuso |

> 🎯 **El arco de la página:** *"¿cuánto cuesta?"* → **te doy el número que sí está publicado** → **y ahora los
> tres que no** (seats, saltos, créditos) → **y el que aparece en la primera factura** (onboarding) → **y ese te
> lo borro** (waiver) → **y si tu caso no da, te lo digo** (B2C) → **hablemos.**
>
> **Fíjate en el orden: la oferta (R8) llega DESPUÉS de haber regalado toda la información.** Si el waiver
> apareciera antes, sería un descuento. Después, **es una consecuencia de haber sido honestos**. Es la tesis del
> hub aplicada a la estructura, no solo al copy.

---

## Copy Ledger

> Dirección, no copy final — lo pule `greenhouse-ux-writing` sobre `docs/context/05_voz-tono-estilo.md`.
> Ids de documentación (sitio público, **no** `src/lib/copy`). es-LATAM neutro, tuteo, sin voseo.
> 🔴 **Toda cifra sujeta a la reverificación del Slice 1.** Las de acá son **placeholders con su marca de evidencia**.

| Copy id | R | Texto | Notas |
|---|---|---|---|
| `hs.precios.h1` | 1 | **"Cuánto cuesta HubSpot de verdad."** | 🎯 La query, literal. **No** *"Precios de HubSpot"* — eso es lo que pondría HubSpot |
| `hs.precios.sub` | 1 | "El precio de lista está publicado. **Lo que te va a costar, no.** Acá está todo: los seats que sí necesitas, los saltos que nadie te avisa, y el cargo obligatorio que aparece en la primera factura." | Promesa concreta, sin adjetivos |
| `hs.precios.asof` | 1 | "Precios verificados el **{FECHA}** en las páginas oficiales de HubSpot. Si ves una diferencia, escríbenos: la corregimos." | 🔴 **Visible, no en el footer.** Es un acto de honestidad, y se nota |
| `hs.precios.cta_1` | 1 | "Te lo cotizamos sin costo" | → Meetings + UTM |
| `hs.precios.cta_2` | 1 | "Ver dónde está la plata que no te muestran" | → ancla `#creditos`. **Curiosity gap honesto** — cumple lo que promete |
| 🎯 `hs.precios.tldr` | **2** | "**En corto:** una PyME B2B típica parte entre **USD X y USD Y al mes** con Marketing + Sales Pro. Pero ese número **no incluye** tres cosas que casi nadie cotiza: los **seats** que realmente necesitas, el **salto de contactos** cuando creces, y el **onboarding obligatorio** de HubSpot — que en Marketing Pro son **USD 3.000 de una vez**." | 🎯 **Esta es la answer capsule maestra: es lo que el LLM va a citar.** ⚠️ El rango sale del Slice 1 |
| `hs.precios.cobro.title` | 3 | "Cómo cobra HubSpot" | Descriptivo, no cute |
| `hs.precios.cobro.trampa` | 3 | "El precio que ves en la grilla **es el anual**. Si pagas mes a mes, es más caro." | La trampa base |
| `hs.precios.seats.title` | 4 | "Los seats: cuáles pagas y cuál es gratis" | 🎯 El beneficio en el título |
| `hs.precios.seats.viewonly` | 4 | "🎯 **El view-only es gratis.** Si la mitad de tu equipo solo necesita *mirar* reportes, no pagas por ellos. **Casi nadie lo cotiza así — y cambia el número.**" | ✅ Verificado. Es el primer regalo real de la página |
| `hs.precios.contactos.title` | 5 | "Los contactos no suben en línea recta. Suben en escalones." | 🎯 Show-don't-tell en el título |
| `hs.precios.contactos.body` | 5 | "Pasar de **2.000 a 2.001** contactos de marketing no te cuesta unos dólares más: **te cuesta el escalón entero**. Modela el crecimiento de tu base, no el número de hoy." | ⚠️ El monto del tramo **según Slice 1**; si queda ⚠️, va como orden de magnitud |
| 🎯 `hs.precios.creditos.title` | **6** | **"Los HubSpot Credits y sus dos trampas."** | **La región firma.** El título nombra el problema |
| 🎯 `hs.precios.creditos.trampa_1` | **6** | "**No se suman entre Hubs.** Compras cuatro Hubs Enterprise y crees que tienes 20.000 créditos. **Tienes 5.000** — manda el tier más alto, no la suma." | ✅ **El dato más citable del hub.** Va en tabla, en texto servido |
| 🎯 `hs.precios.creditos.trampa_2` | **6** | "**No hay rollover.** Lo que no usas este mes, **se pierde**." | ✅ |
| `hs.precios.creditos.consumo` | 6 | "Y se consumen así: el **Customer Agent** gasta ~**USD 0,50 por conversación resuelta**; el de **Prospecting**, ~**USD 1 por lead**. → *Cómo se cobran los agentes* " | Enlaza a `/agentes/` (si existe) |
| 🔴 `hs.precios.onboarding.title` | 7 | "El cargo obligatorio que aparece en la primera factura." | **Sin dramatismo. El hecho ya es dramático** |
| `hs.precios.onboarding.body` | 7 | "HubSpot cobra un **onboarding obligatorio**: Marketing Pro **USD 3.000**, Enterprise **USD 7.000**, Sales y Service **USD 1.500 / 3.500**. **No es opcional.** Y para el bundle *Customer Platform*, **HubSpot no publica el monto — pídelo por escrito antes de firmar.**" | ✅ los cuatro · ❌ el bundle. 🔴 **Declarar el ❌ es parte del valor** |
| 🎯 `hs.precios.waiver.title` | **8** | **"Ese cargo puede desaparecer de tu contrato."** | El beneficio, no la mecánica |
| 🎯 `hs.precios.waiver.body` | **8** | "Un partner **certificado** puede entregar el onboarding **en lugar de HubSpot** — y entonces **el cargo sale de tu contrato**. En Marketing Hub Pro son **USD 3.000 sobre USD 9.600: un 31% del año uno.** Y hay una diferencia que importa: **el onboarding de HubSpot es coaching** — te enseñan y lo haces tú. **El nuestro es implementación: te lo construimos.**" | 🔴 **La cifra en texto servido, jamás en contador.** Efeonce **está certificada** |
| `hs.precios.limite.title` | 9 | "Cuándo este modelo de precio no te conviene" | La regla del hub |
| `hs.precios.limite.body` | 9 | "Si tienes **millones de contactos B2C**, HubSpot se pone caro rápido: en Enterprise sobre 500.000 contactos son **USD 60 por cada 10.000**, y el envío está capado. **A esa escala, Adobe o Salesforce te salen más baratos. Te lo decimos, aunque no nos convenga.**" | ✅ Enlaza a `/cuando-no-usar-hubspot/` |
| `hs.precios.proceso.title` | 10 | "Qué necesitamos saber para darte un número real" | Transparencia del proceso |
| `hs.precios.cta_final` | 13 | **"Te lo cotizamos sin costo."** Sub: *"En 48 horas, con tus números. Y si vemos que HubSpot no es lo tuyo, te lo decimos ahí mismo."* | 🎯 **El CTA repite la postura del hub.** El compromiso es barato |

---

## State Copy

| Estado | Superficie | Copy | Nota |
|---|---|---|---|
| **Default** | Toda la página | Todo el contenido visible | 🔴 **Sin JS también** |
| **`as-of` fresco** | R1 | *"Precios verificados el {FECHA}"* | Se actualiza al reverificar |
| 🔴 **`as-of` viejo (>90 días)** | R1 | 🎯 *"Estos precios los verificamos el {FECHA}. HubSpot los cambia: **confírmalos con nosotros antes de decidir.**"* | **La página envejece con honestidad, no en silencio.** Editorial, no automático |
| **Dato ❌ (no publicado)** | R7 | *"HubSpot no publica este monto. **Pídelo por escrito antes de firmar.**"* | 🔴 **Nunca un número inventado en su lugar** |
| **Dato ⚠️ (secundario)** | R5 | *"Orden de magnitud: las fuentes públicas no coinciden. El monto exacto depende de tu contrato."* | 🔴 **Nunca presentado como precio exacto** |
| **Form no monta** (CORS / JS off) | R13 | 🔴 **Fallback link visible:** *"Escríbenos y te cotizamos"* (mailto/Meetings con UTM) | **El CTA nunca muere** |
| **Submit OK / error** | R13 | Success / Error Card del renderer | Owned por TASK-1320 |
| **Un cluster no existe aún** | R12 | 🔴 **El enlace no se pinta.** Nada de "próximamente" | **Nunca un link a 404** |

---

## Accessibility Contract

- **Un solo `<h1>`.** Jerarquía H2 → H3 estricta (los LLMs la usan para extraer; **la a11y y el AEO piden lo
  mismo acá — no es coincidencia, es la misma disciplina**).
- 🔴 **Las tablas son `<table>` semánticas** con `<caption>` y `<th scope>`. **NUNCA** un grid de `<div>`.
  La tabla de créditos (R6) **es el dato más importante de la página**: tiene que ser legible por lector de
  pantalla **y** por crawler.
- El diagrama de escalón (R5) es **decorativo** → `aria-hidden="true"`, y **su contenido está en el texto**.
  🔴 **Ninguna información vive solo en el gráfico.**
- FAQ con `<details>/<summary>` nativo (teclado + SR gratis, y **el contenido está en el DOM aunque esté
  cerrado** → citable).
- Focus ring visible (contraste AA) en CTAs, `<summary>`, enlaces y campos. Touch targets ≥ 44 px.
- Contraste AA en **light y dark** (el tema Ohio sirve claro; verificar igual).
- Reflow a 320 px con zoom 200%: 🔴 **las tablas scrollean dentro de su contenedor** (`overflow-x: auto` +
  `tabindex="0"` + `role="region"` + `aria-label`), **nunca la página**.

---

## Implementation Mapping

| Región | Implementación | Notas |
|---|---|---|
| R0 breadcrumb | Yoast breadcrumb + JSON-LD `BreadcrumbList` | Señal de hub para Google y para el usuario |
| R1 hero | Ohio section + `modern-ui` editorial header | Sin imagen pesada. **LCP = texto** |
| R2 TL;DR | Párrafo destacado, page-scoped CSS | 🎯 **Arriba del fold, en el HTML servido** |
| R3-R5 tablas | `<table>` semántica + `overflow-x:auto` wrapper | Contenedor scrollea, no la página |
| R5 escalón | **SVG inline estático** o CSS puro | `aria-hidden`. **Cero JS** |
| 🎯 R6 créditos | **`<table>` a dos columnas** ("lo que crees" / "lo que compras") | **La firma.** Texto servido. Sin animación |
| R7-R8 | Bandas page-scoped, cifra como texto | 🔴 **Cero contadores** |
| R11 FAQ | `<details>/<summary>` nativo + JSON-LD `FAQPage` | El contenido vive en el DOM aunque esté cerrado |
| R13 form | `<greenhouse-form>` (reuso) + fallback link | **NO** se reconstruye |
| Motion | **Hereda el contract del pillar** | CSS + IntersectionObserver. Cero librerías |

🔴 **Cero primitives nuevas. Cero backend. Cero JS de librería.**

---

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-precios` · Viewports **1440 + 390**
- Pasos: cargar → scroll por regiones → **capturar la tabla de créditos (R6) completa** → abrir 2 FAQs →
  click "Te lo cotizamos" → verificar scroll + focus al form
- Capturas: full-page (desktop + mobile) · frame por región · 🎯 **la tabla de créditos** · FAQ abierto ·
  form montado · **reduced-motion** · **tabla en 390 px (scroll interno, no de página)**
- **Assertions:**
  - 🔴 **Sin JS:** `fetch` sin JavaScript → **todas las cifras**, la tabla de créditos y el waiver **están en el HTML**
  - 🔴 **Cero contadores animados** (ningún elemento arranca en `0` y sube)
  - 🔴 **`as-of` visible** en el HTML servido
  - 🔴 **Sin claims prohibidos** en el DOM: `ISO 27001` · `Forrester` · `Líder en CRM` · `Commerce Hub` ·
    `Operations Hub` · `INBOUND`
  - 🔴 **Ningún `href` a un cluster inexistente** (sin 404 internos)
  - Las tablas son `<table>` con `<th scope>` · **sin scroll horizontal de página** (1440 y 390)
  - Un solo `<h1>` · breadcrumb presente · canonical correcto

---

## Design Decision Log

- **Decisión: la página explica, no cotiza.** Una calculadora pública **miente con precisión** (el precio real
  depende de descuentos, term y bundle) y quema la credibilidad que la página existe para construir.
  **Alternativa descartada:** *cotizador self-serve* — convierte más en el corto plazo y nos deja vendiendo un
  número que después no se sostiene en la propuesta. **Es exactamente el problema que la página denuncia.**
- **Decisión: la región firma es la tabla de créditos (R6), no el hero.** Es **el único dato del hub que
  probablemente ningún competidor hispano tiene publicado**, y es un hecho verificable — no una opinión.
  **Un dato verificable y exclusivo vale más que cualquier hero.**
- **Decisión: el waiver va en R8, después de haber regalado todo.** Si apareciera arriba, sería **un descuento**.
  Después de siete regiones de información gratis, **es una consecuencia**. La estructura *es* el argumento.
- **Decisión: `as-of` visible y arriba, no en el footer.** Una página de precios sin fecha es una página de
  precios sin credibilidad. **Y cuando envejece, lo dice ella misma** (State Copy) en vez de mentir en silencio.
- **Decisión: los ❌ se declaran.** *"HubSpot no publica este monto"* **es contenido**, no un hueco.
  Es la diferencia entre una página que investigó y una que copió la grilla.
- **Alternativa descartada:** *una página por Hub con su precio* — compite con hubspot.com en su cancha
  ([SPEC § 0](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md)) y **pierde**.
- **JOLT:** la página ataca la indecisión por su raíz real — **el miedo a la factura sorpresa**. No empuja: informa.

## Acceptance Checklist

- [ ] 🔴 **Cada precio verificado en fuente primaria, marcado (✅/⚠️/❌) y con `as-of` visible.** Cero inventados.
- [ ] 🎯 **La tabla de créditos (R6) existe**, es `<table>` semántica, está en el HTML servido y muestra
      **20.000 ❌ → 5.000 ✅**.
- [ ] **Onboarding obligatorio (R7)** + **waiver con su cifra (R8)** presentes, con la distinción
      **coaching vs implementación**.
- [ ] **"Cuándo el modelo NO te sirve" (R9)** presente y enlaza a `/cuando-no-usar-hubspot/` *(si existe)*.
- [ ] 🔴 **No hay cotizador ni calculadora pública.**
- [ ] 🔴 **Sin JS la página se lee entera**, con todas las cifras. **Cero contadores animados.**
- [ ] Answer capsule maestra (R2) **arriba del fold, en texto servido**. Cada H2 con su capsule.
- [ ] JSON-LD `FAQPage` + `Service` + `BreadcrumbList` válido (Rich Results Test).
- [ ] Tablas semánticas, con scroll interno en 390 px. Reflow 320/200% OK.
- [ ] Ningún claim prohibido. Ningún `href` a página inexistente.
- [ ] Copy es-LATAM neutro, sin voseo, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 + reduced-motion capturado **y mirado**.
