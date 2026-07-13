# TASK-1404 / `efeoncepro.com/hubspot/hubspot-vs-salesforce/` — **"HubSpot o Salesforce"** *(artículo)*

> **Cluster del hub HubSpot que vive en el blog.** Pillar: **TASK-1352** (`/servicios/hubspot/`).
> Fuente: **[SPEC del hub](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 5** +
> skill `hubspot-solutions-partner` → **`modules/05_DISPLACEMENT.md`** + **`templates/tco-3y.md`** + `SOURCES.md`.
>
> 🔴 **Única pieza del hub que habla de un competidor.** Exposición legal real (publicidad comparativa) →
> pasada obligatoria de **`legal-privacy-ip-operator`** antes del publish.
> 🎯 **Y el cambio a blog NO la exime: el folder no cambia el marco legal.**

## 🔴 Delta 2026-07-13 — de landing a artículo, y la condición de existencia

**Era** una landing en `/servicios/hubspot/hubspot-vs-salesforce/`. **Ahora es un post del blog**
(`post`, categoría **`hubspot`**, permalink **`/hubspot/hubspot-vs-salesforce/`**, **Gutenberg**).

**Lo forzó un dato** (Semrush, 2026-07-13): *"hubspot vs salesforce"* mueve **70/mes en España, 20/mes en México**
— y compite contra **20.800.000 resultados**. 🎯 **Esta pieza nunca va a ser encontrada. Solo va a ser ENVIADA.**
No tiene embudo: **tiene un remitente.** Su lector llega **en un correo nuestro, a un CFO**.

Y entonces la URL pesa: un CFO que recibe un link a `/servicios/...` **lee "material de ventas" en la barra de
direcciones antes de leer una palabra** — **saboteando la tesis del texto**, que es *"créenos porque abrimos con
el dato que nos hace daño"*.

🔴 **La condición de existencia (regla dura 11 de la task):** frente a veinte millones de páginas iguales,
**nuestra única diferencia son dos gestos** — **abrir con el Niche Player de Gartner** y **declarar que nuestro
propio argumento del TCO se cae** si ya tienes un admin de Salesforce.
🎯 **Es exactamente lo que alguien va a querer suavizar en la última revisión.**
**Si se suaviza cualquiera de los dos, esta pieza es la 4.001 del montón — y entonces lo correcto es no publicarla.**

🔴 **`Flow: none` / `Motion: none`** — sus guardrails quedan absorbidos abajo, en *Reglas duras de forma*.

## Meta

- Status: `draft`
- Owner task: `TASK-1404`
- **Product Design asset:** ✅ **no requerido — y prohibido el que sería obvio.** 🔴 **Cero logos, cero identidad
  visual de Salesforce, cero "vs" con dos escudos enfrentados.** Eso es (a) uso de marca ajena más allá de la
  mención nominativa y (b) el registro visual de un folleto de guerra. 🎯 **Esto se lee como un informe, no como
  un combate.** Tipografía del blog y una tabla.
- Intended consumers: **blog de efeoncepro.com** (WordPress, Gutenberg) + **motores de respuesta (LLMs)** +
  🎯 **el AE de Salesforce que compite con nosotros** *(sí: es un lector real, y diseñar para él nos hace
  mejores)* + 🎯 **un abogado de Salesforce**.
- Copy source: contenido del post (**NO** `src/lib/copy`), validado con `copywriting` + `commercial-expert` +
  `greenhouse-ux-writing`. **es-LATAM neutro, tuteo, sin voseo.**
  🔴 **Registro técnico y frío. Cero adjetivos.**
- Primitive decision: `reuse` — 🔴 **bloques Gutenberg nativos** (`core/heading`, `core/paragraph`,
  **`core/table`**, `core/list`). **Cero bloques custom, cero CSS de página, cero librería de charts,
  cero form embebido.**
- Motion: 🔴 **`none`.** *(No es "poco motion": **es de integridad** — ver reglas de forma.)*
- UI ready target: `yes` una vez cerrados **Slice 1 (verificación con screenshots)**, **Slice 2 (pasada legal)**
  y el **byline**.

## Brief

- **Primary user:** 🎯 **el comité que está decidiendo — y son tres cabezas con tres criterios distintos:**
  1. **El CFO.** Le importa **el número a 3 años**. Y **va a auditar los supuestos.**
  2. **RevOps.** Le importa **si se van a quedar cortos**. Ya vio los límites de HubSpot (o los va a ver).
  3. **El CIO.** Le importa **la extensibilidad y el riesgo de migración**. Y probablemente **ya tiene
     Salesforce en la casa.**
- **User moment:** 🎯 *"tengo dos vendedores diciéndome cosas opuestas y los dos tienen un PDF que lo prueba."*
  **Está buscando a alguien sin incentivo — y sabe que no lo va a encontrar.** Y entonces encuentra a un
  **partner de HubSpot** que abre diciendo **que Gartner puso a HubSpot en Niche Players**.
- **Job to be done:** **defender la decisión ante su directorio sin quedar expuesto.**
  🎯 **No está eligiendo un CRM: está protegiendo su carrera.** Todo el copy vive de esa lectura.
- **Primary decision signal:** 🎯 **que traigamos el dato que juega en nuestra contra, primero y sin
  suavizarlo.** Y que **le declaremos el límite de nuestro propio argumento del TCO** (el admin) **antes de que
  él lo descubra**.
- **Fricción que reduce:** el miedo a que **el vendedor le esté ocultando algo** — que es el miedo por defecto
  de un comité, y el correcto.
- **Non-goals:** no compara con Microsoft/Zoho/Pipedrive/Odoo · no denigra a Salesforce · no publica una
  calculadora de TCO · no reconstruye form ni agendador.

## 🔴 Reglas duras del contenido

1. 🔴 **Se abre con el dato que juega en nuestra contra.** **Niche Player** en el MQ de *SFA* 2025 ✅ (Leaders:
   Salesforce, Microsoft, Oracle) — **y el contexto: Leader en el MQ de B2B Marketing Automation, 5.º año** ✅.
   **Son dos reportes distintos, y se dice.** 🔴 **NUNCA *"Líder en CRM según Gartner"*.**
2. 🔴 **NUNCA el Forrester Wave 2026** — **no es verificable** (la landing de HubSpot que lo promociona cita, al
   abrirla, el Wave de **Q3 2024**).
3. 🔴 **El TCO lleva todos sus supuestos declarados, arriba.** **Un TCO sin supuestos es propaganda con decimales.**
4. 🎯 **El límite del TCO va en la misma región, sin suavizar:** *"el delta no lo hace la licencia (162k vs 189k =
   17%). **Lo hace el admin.** Si ya tienes un admin de Salesforce en planilla, **la mitad de este argumento se
   te cae.**"* 🔴 **No se mueve al final. No se pone en una nota al pie.**
5. 🔴 **NUNCA *"Pardot está muerto"*** ni ninguna afirmación falsa sobre Salesforce. **Falso, verificable en
   nuestra contra, y nos borra la credibilidad de la página entera** — que es lo único que la página tiene.
6. 🔴 **Ningún dato de Salesforce sin verificar en navegador real** (su sitio bloquea el fetch) **+ screenshot
   fechado y archivado.**
7. 🔴 **Se dice dónde gana Salesforce, sin adornos y sin ironía.** 🎯 **Una comparación que gana 6-0 no es una
   comparación: es un folleto — y el comité lo huele en diez segundos.**
8. 🔴 **Registro técnico. Cero adjetivos.** *"USD 189k a 3 años"* es un hecho. *"Carísimo"* es una opinión —
   **y una opinión acá nos cuesta la credibilidad y, potencialmente, una carta de sus abogados.**
9. 🔴 **Cero logos, cero identidad visual de Salesforce.** Mención nominativa ✅ · marca ajena ❌.
10. 🔴 **`as-of` visible** para el TCO, el MQ y cada dato de Salesforce. 🔴 **Toda cifra en el HTML servido.**

### 🔴 Reglas duras de forma *(absorbidas del flow y el motion, que ya no existen como docs)*

11. 🔴 **La condición de existencia:** los **dos gestos** — abrir con el **Niche Player** y declarar que **el
    propio TCO se cae** con un admin de Salesforce — **son la pieza**. 🎯 **Si se ablandan, esto es la 4.001 de
    veinte millones, y lo correcto es no publicarlo.**
12. 🔴 **El TCO es una tabla, no un gráfico. Cero barras que crecen, cero charts, cero contadores.**
    🎯 **Y la razón no es estética, es de integridad: una animación que hace aparecer el "611k" ANTES que sus
    supuestos es, literalmente, la manipulación que el texto denuncia.** *(Y le regalaría al AE de Salesforce la
    línea: **"mira el show que te montaron"**.)*
13. 🔴 **Las dos secciones "dónde gana X" son simétricas** — mismo peso tipográfico, misma extensión, mismo
    tratamiento. **Y hay assertion GVC que lo verifica**, porque *"confiamos en que quedó parejo"* **no es un
    contrato**. 🎯 **Si la de Salesforce se ve más chica, la honestidad era decorativa** — y un comité entrenado
    lo detecta antes que cualquier argumento.
14. 🔴 **Sin form embebido, sin pop-up, sin exit-intent, sin sticky bar** *(verificar el chrome del **tema**)*.
    El CTA es **un enlace a Meetings**. 🎯 *Un artículo que termina en un form se lee como lead-gen; un enlace
    para agendar se lee como una oferta.*
15. 🎯 **Enlazar a la fuente de Salesforce fortalece la pieza** (demuestra que el dato es **suyo**, no nuestro).
    🔴 **Reproducir su logo o su identidad visual, no.** **Enlazar ≠ usar la marca.**

---

## Layout Skeleton

| R | Slot | Propósito | Componente | Fuente |
|---|---|---|---|---|
| **0** | **Cabecera del post** | Título · 🔴 **byline con credencial** · **fecha de publicación + de revisión** · categoría `hubspot` | Tema del blog | 🎯 **El byline es parte del argumento** |
| **1** | **Hero — la promesa** | 🎯 H1 = *"HubSpot o Salesforce: la comparación que ninguno de los dos te va a dar."* Sub: *"Somos partner de HubSpot. **Y vamos a empezar por lo que juega en nuestra contra.**"* + **`as-of`** | `modern-ui` editorial header. **Sin logos** | SPEC § 5 |
| **2** | 🎯 **LA VERDAD INCÓMODA, PRIMERO** *(SIGNATURE)* | **La región que compra toda la credibilidad de la página.** *"**Gartner puso a HubSpot en Niche Players** del Magic Quadrant de Sales Force Automation 2025. Los Leaders son **Salesforce, Microsoft y Oracle**. Si tu comité compra por Magic Quadrant, **empieza por saber esto**."* Y el contexto: *"HubSpot **sí es Leader** del Magic Quadrant de **B2B Marketing Automation**, quinto año consecutivo. **Son dos reportes distintos — y la mitad de los partners los mezcla a propósito.**"* | Truth band, texto servido | ✅ verificado |
| **3** | 🎯 **EL TCO A 3 AÑOS — con sus supuestos Y su límite** | `<table>`: HubSpot ≈ **USD 295k** · Salesforce ≈ **USD 611k**. **Supuestos declarados arriba** (30 usuarios · lista sin descuento · 3 años · qué incluye). 🔴 **Y en la misma región, sin suavizar:** *"el delta **no lo hace la licencia** — USD 162k vs 189k es **solo 17%**. **Lo hace el admin.** Si ya tienes un admin de Salesforce en planilla, **la mitad de este argumento se te cae.**"* | 🎯 **Tabla + la frase del admin, DENTRO de la región** | `templates/tco-3y.md` |
| **4** | 🔴 **Dónde gana Salesforce** *(obligatoria)* | **Sin adornos, sin ironía, sin "pero".** CPQ complejo · territorios · forecasting multinivel · extensibilidad (Apex, AppExchange) · modelos de datos B2B muy complejos. 🎯 *"Si tu caso está acá, Salesforce es la respuesta correcta. Te lo decimos aunque vendamos lo otro."* | Balance band | Regla dura 7 |
| **5** | **Dónde gana HubSpot** | Costo de administración · **adopción** (⚠️ *el 38% de los fracasos de CRM son de adopción, no de tecnología*) · time-to-value · **marketing como ciudadano de primera** (y acá **sí** es Leader) | Balance band | `modules/05` |
| **6** | **Agentforce vs Breeze** | *"Salesforce cobra **USD 0,10 por acción**. HubSpot cobra **USD 0,50 por conversación resuelta** — y *resuelta* significa **sin escalamiento humano en 72 horas**. 🎯 **Pagas cuando funciona, no cuando lo intenta.**"* → `/agentes/` | Comparación de dos cifras, texto | ✅ verificar ambas |
| **7** | 🔴 **Qué se rompe al migrar** | **Apex · managed packages · CPQ · los reportes históricos: no migran.** 🎯 *"Nadie te va a decir esto antes de firmar. Nosotros sí, porque el que se come el problema después somos nosotros."* | Risk band | `modules/05` |
| **8** | **Cómo decidimos nosotros** | 🎯 **Las 4 preguntas que hacemos** para saber cuál de los dos corresponde. *"Son las mismas que te haríamos en una reunión — y a veces la respuesta es Salesforce."* | Checklist | Discovery |
| **9** | FAQ | *"¿Se puede migrar de Salesforce a HubSpot?"* · *"¿Cuánto tarda?"* · *"¿Puedo tener los dos?"* · *"¿Qué pasa con mis integraciones?"* · 🎯 *"¿Ustedes venden HubSpot, por qué les creería?"* **(la pregunta que hay que hacerse a uno mismo)** | `<details>/<summary>` | Objeciones reales |
| **10** | Puente al hub | **Pillar** *(obligatorio)* · `/cuando-no-usar-hubspot/` · `/precios/` · `/agentes/`. 🔴 **El que no existe, no se pinta** | Card-on-section links | PDR-013 |
| **11** | CTA | **"Te armamos el TCO con tus números."** Sub: *"Con tus usuarios, tus Hubs y tu realidad. **Y si el número te conviene con Salesforce, te lo decimos.**"* | CTA band + `<greenhouse-form>` | Reuso |

> 🎯 **El arco de la página:** *"los dos me mienten"* → **empezamos por lo que nos juega en contra** (R2) →
> **acá está el número, con sus supuestos** (R3) → **y acá está por qué el número puede no aplicarte** (R3, misma
> región) → **y acá gana el otro** (R4) → **y acá ganamos nosotros** (R5) → **y esto se rompe si migras** (R7) →
> **hablemos.**
>
> 🔴 **Esta página se escribe asumiendo dos lectores hostiles: un abogado de Salesforce y el AE de Salesforce que
> compite por el deal.** 🎯 **Si ninguno de los dos puede señalar un solo error, ganamos** — porque entonces el
> comité tampoco puede. **Diseñar para el lector hostil es lo que hace creíble la página para el amistoso.**

---

## Copy Ledger

> Dirección, no copy final — lo pulen `copywriting` + `commercial-expert` + `greenhouse-ux-writing`.
> 🔴 **Registro técnico y frío. CERO adjetivos.** *"USD 189k"* es un hecho; *"carísimo"* es una opinión.
> 🔴 **Todo dato de Salesforce sujeto al Slice 1 (navegador real + screenshot fechado).**

| Copy id | R | Texto | Notas |
|---|---|---|---|
| `hs.vs.h1` | 1 | **"HubSpot o Salesforce: la comparación que ninguno de los dos te va a dar."** | 🎯 La promesa es **la fuente**, no el veredicto |
| `hs.vs.sub` | 1 | "Somos **HubSpot Solutions Partner**. **Y vamos a empezar por lo que juega en nuestra contra.**" | 🎯 **La frase que compra la página entera** |
| `hs.vs.asof` | 1 | "Datos verificados el **{FECHA}** en las páginas oficiales de HubSpot y Salesforce, y en el Magic Quadrant 2025. Los precios de lista cambian: **confírmalos antes de decidir.**" | 🔴 Visible. **Es la defensa legal y la credibilidad, a la vez** |
| 🎯 `hs.vs.gartner.title` | **2** | **"Empecemos por lo que nos juega en contra."** | 🎯 **El título más valioso del hub** |
| 🎯 `hs.vs.gartner.body` | **2** | "**Gartner puso a HubSpot en el cuadrante de *Niche Players*** del Magic Quadrant de **Sales Force Automation 2025**. Los *Leaders* son **Salesforce, Microsoft y Oracle**. Si tu comité decide por Magic Quadrant, **empieza por saber esto — porque el vendedor de Salesforce va a llegar con ese gráfico impreso, y va a tener razón.**" | ✅ verificado. 🔴 **Sin peros. Sin suavizar. Sin "pero en realidad…"** |
| 🎯 `hs.vs.gartner.contexto` | **2** | "**Y ahora el contexto, que también es cierto:** HubSpot **sí es Leader** del Magic Quadrant de **B2B Marketing Automation**, por **quinto año consecutivo**. **Son dos reportes distintos, sobre dos cosas distintas.** La mitad de los partners de HubSpot los mezcla y dice *'líder según Gartner'*. **Eso es falso, y se verifica en dos minutos.**" | ✅ verificado. 🎯 **Denunciar el truco de nuestros propios colegas es lo que nos separa de ellos** |
| 🎯 `hs.vs.tco.title` | **3** | **"El costo real a tres años."** | Sin adjetivos |
| 🔴 `hs.vs.tco.supuestos` | **3** | "**Supuestos, declarados:** 30 usuarios · precio de **lista, sin descuento** · **3 años** · incluye licencias, onboarding y el costo del administrador · **no incluye** integraciones custom ni migración de datos. **Cambia un supuesto y cambia el número. Por eso te lo mostramos completo.**" | 🔴 **Arriba de la tabla, no debajo** |
| 🎯 `hs.vs.tco.limite` | **3** | "**Y ahora la parte que ningún partner te va a decir:** el delta **no lo hace la licencia**. HubSpot ≈ **USD 162k**, Salesforce ≈ **USD 189k** — **solo 17% de diferencia**. **Lo que hace la diferencia es el administrador.** Salesforce necesita uno dedicado; HubSpot, en general, no. 🔴 **Si ya tienes un admin de Salesforce en planilla, la mitad de este argumento se te cae.** Y preferimos decírtelo nosotros a que lo descubras tú en la última reunión." | 🎯 **La frase más importante de la página.** 🔴 **En la misma región. Sin suavizar. Sin nota al pie** |
| 🔴 `hs.vs.sf_gana.title` | **4** | **"Dónde gana Salesforce."** | 🔴 **Sin ironía. Sin "pero".** El título es literal |
| `hs.vs.sf_gana.body` | 4 | "**CPQ complejo. Territorios. Forecasting multinivel. Extensibilidad — Apex y AppExchange. Modelos de datos B2B muy complejos.** En todo eso, Salesforce es mejor. **Si tu caso está ahí, la respuesta correcta es Salesforce — y te lo decimos aunque vendamos lo otro.**" | 🔴 **Cero matices defensivos.** 🎯 **Cada palabra defensiva acá nos cuesta credibilidad en las otras 5 secciones** |
| `hs.vs.hs_gana.title` | 5 | "Dónde gana HubSpot." | Simétrico |
| `hs.vs.hs_gana.body` | 5 | "**Costo de administración.** **Adopción** — y no es un detalle: ⚠️ el **38% de los fracasos de CRM son de adopción, no de tecnología**. Un CRM que nadie usa **cuesta el 100% y rinde cero**. **Time-to-value en semanas, no en trimestres.** Y **marketing como ciudadano de primera** — que es, otra vez, **donde HubSpot sí es Leader**." | ⚠️ el 38% **es secundario → se cita como orden de magnitud, con fuente** |
| `hs.vs.agentes.body` | 6 | "**Salesforce cobra ~USD 0,10 por acción del agente. HubSpot cobra ~USD 0,50 por conversación resuelta** — y *resuelta* tiene definición: **sin escalamiento humano en 72 horas**. 🎯 **Uno te cobra por intentarlo. El otro, por lograrlo.**" | ✅ **verificar ambas cifras** (Slice 1) |
| 🔴 `hs.vs.migrar.title` | **7** | **"Qué se rompe si migras."** | El título es la advertencia |
| `hs.vs.migrar.body` | 7 | "**Tu código Apex no migra. Tus managed packages no migran. Tu CPQ no migra. Tus reportes históricos no migran.** Se reconstruyen, se reemplazan o se archivan. **Nadie te dice esto antes de firmar** — y es lo primero que aparece en la semana tres. 🎯 **Nosotros te lo decimos ahora, porque el que se come ese problema después somos nosotros.**" | 🎯 **La honestidad con interés propio explícito es más creíble que la altruista** |
| 🎯 `hs.vs.faq.porque_creerles` | 9 | **"Ustedes venden HubSpot. ¿Por qué les creería?"** — *"No tienes por qué. **Verifica todo:** el Magic Quadrant está publicado, los precios de lista están en las dos páginas oficiales, y los supuestos de nuestro TCO están arriba, completos. **Lo único que te pedimos es que apliques el mismo escrutinio al PDF que te dejó el otro vendedor.**"* | 🎯 **La pregunta que hay que hacerse a uno mismo. Contestarla desarma la objeción central de la página** |
| `hs.vs.cta` | 11 | **"Te armamos el TCO con tus números."** Sub: *"Con tus usuarios, tus Hubs y tu realidad. **Y si el número te conviene con Salesforce, te lo decimos.**"* | 🎯 La postura del hub, hasta el final |

---

## State Copy

| Estado | Superficie | Copy | Nota |
|---|---|---|---|
| **Default** | Toda la página | Todo visible | 🔴 **Sin JS también** |
| **`as-of` fresco** | R1 | *"Datos verificados el {FECHA}"* | 🔴 **Es la defensa legal Y la credibilidad** |
| 🔴 **`as-of` viejo (>90 días)** | R1 | *"Verificado el {FECHA}. **Los precios de lista cambian: confírmalos antes de decidir.**"* | **La página envejece diciéndolo** |
| 🔴 **Un dato resultó incorrecto** | La región afectada | 🎯 **Se corrige Y se anota la corrección en la página.** *"Corregido el {fecha}: antes decíamos X."* | 🔴 **NUNCA una corrección silenciosa.** Una página que existe para ser la fuente creíble **no puede editarse a escondidas** |
| **HubSpot cambia de cuadrante** | R2 | Se actualiza el MQ y **se anota el año** | El MQ es anual |
| **Form no monta** | R11 | 🔴 **Fallback link visible** | **El CTA nunca muere** |
| **Un cluster no existe aún** | R10 | 🔴 **El enlace no se pinta** | Nunca un 404 interno |

---

## Accessibility Contract

- **Un solo `<h1>`.** Jerarquía H2 → H3 estricta.
- 🔴 **La tabla del TCO es `<table>` semántica** con `<caption>` *(y el `<caption>` incluye los supuestos —
  🎯 **para que un lector de pantalla reciba los supuestos ANTES que los números**, igual que un vidente los
  lee arriba)* y `<th scope>`.
- 🔴 **Las cifras no se comunican solo por color** (verde/rojo en un comparativo es tentador y **excluye al
  usuario daltónico del argumento central**). **El ganador de cada fila va escrito.**
- **"Dónde gana Salesforce" (R4) y "dónde gana HubSpot" (R5) tienen el mismo peso tipográfico y el mismo
  tratamiento visual.** 🎯 **Si la de Salesforce se ve más chica o más gris, la honestidad era decorativa** —
  y un comité entrenado lo nota.
- FAQ `<details>/<summary>` nativo.
- Focus ring visible (contraste AA). Touch targets ≥ 44 px.
- Reflow 320/200%: la tabla scrollea **dentro de su contenedor**; en 390 px **colapsa a tarjetas completas**,
  **con los supuestos siempre visibles**.

---

## Implementation Mapping

| Región | Implementación (Gutenberg) | Notas |
|---|---|---|
| R0 cabecera | **Título + byline + fechas** del tema del blog | 🎯 **El byline con credencial es parte del argumento** |
| R1 hero | `core/heading` (H1) + `core/paragraph` | 🔴 **Sin logos. LCP = texto** |
| 🎯 R2 Gartner | `core/paragraph` destacado, texto servido | **Arriba. Sin peros** *(regla 11)* |
| 🎯 R3 TCO | **`core/table` + supuestos en el `<caption>` + la frase del admin en la misma sección** | 🔴 **Texto servido. Cero contadores, cero charts** |
| R4/R5 | **Dos secciones simétricas, mismo peso tipográfico** | 🔴 **La simetría ES el argumento — y hay assertion** |
| R6 agentes | Dos cifras, texto | Enlaza a TASK-1403 |
| R7 migración | `core/paragraph` + `core/list` | — |
| R9 FAQ | `core/heading` + `core/paragraph` + JSON-LD `FAQPage` | — |
| R11 CTA | 🔴 **Un enlace a HubSpot Meetings.** **Sin form embebido** | 🎯 *Un form se lee como lead-gen; un enlace, como una oferta* |
| Motion | 🔴 **`none`** | 🎯 **De integridad, no de estilo** *(regla 12)* |
| **Publicación** | **Content Factory** (`wpcli eval-file`), categoría `hubspot`, slug `hubspot-vs-salesforce` | Content Factory = dueño del mantenimiento |

🔴 **Cero bloques custom. Cero CSS de página. Cero backend. Cero logos de terceros. Cero librería de charts.
Cero form.**

---

## GVC Scenario Plan

- Scenario: `public-servicios-hubspot-vs-salesforce` · Viewports **1440 + 390**
- Pasos: cargar → capturar R2 (Gartner) → 🎯 **capturar el TCO con sus supuestos y la frase del admin** →
  capturar R4 y R5 **juntas** (para verificar la simetría) → abrir 2 FAQs → click CTA
- Capturas: full-page (desktop + mobile) · **R2** · 🎯 **el TCO completo** · 🎯 **R4 y R5 lado a lado** ·
  FAQ abierto · **reduced-motion** · **tarjetas en 390 px**
- **Assertions:**
  - 🔴 **`"Líder en CRM"` NO existe** en el DOM · 🔴 **`Forrester` NO existe** en el DOM
  - 🔴 **`Pardot` no aparece junto a `muerto` / `obsoleto` / `descontinuado`**
  - 🔴 **La frase del admin existe** *(assertion literal: `admin de Salesforce` + `se te cae` o el equivalente aprobado)*
  - 🔴 **La sección "Dónde gana Salesforce" existe** *(assertion literal)*
  - 🔴 **Sin JS:** el TCO, sus supuestos, la frase del admin y R4 **están en el HTML servido**
  - 🔴 **Cero contadores animados** · **`as-of` visible**
  - 🔴 **Ningún `<img>` ni SVG con la marca/logo de Salesforce** *(assertion de assets)*
  - 🎯 **R4 y R5 tienen el mismo tamaño de fuente en su encabezado** *(la simetría, verificada — no asumida)*
  - **Los supuestos están en el `<caption>` de la tabla** (accesibles antes que los números)
  - **Enlace al pillar presente** · breadcrumb · canonical · un solo `<h1>` · sin scroll horizontal

---

## Design Decision Log

- 🎯 **Decisión: se abre con el dato que nos hace daño.** El AE de Salesforce **va a llegar con el Magic Quadrant
  impreso** — es su mejor carta y la va a jugar. **La única forma de sobrevivir a un dato que juega en tu contra
  es traerlo tú, con contexto.** Si lo traemos nosotros, **el contexto es nuestro**. Si lo trae él, el contexto
  es suyo y nosotros quedamos escondiendo información.
  **Alternativa descartada:** *no mencionar el MQ* — es lo que hace todo el mercado, **y es exactamente por lo
  que ningún comité les cree.**
- 🎯 **Decisión: el límite del TCO se declara en la misma región del TCO, sin suavizar.** *"Si ya tienes un admin
  de Salesforce, la mitad de este argumento se te cae."* **Un argumento que se derrumba solo en la reunión es
  peor que uno que se declara frágil desde el principio** — y este se derrumba en el 100% de los casos donde el
  cliente ya tiene Salesforce, que son **justamente los deals que esta página busca**.
  **Alternativa descartada:** *ponerlo en una nota al pie* — es la versión cobarde, y el CFO lee las notas al pie.
- 🔴 **Decisión: R4 ("dónde gana Salesforce") y R5 ("dónde gana HubSpot") son visualmente simétricas, y hay una
  assertion que lo verifica.** 🎯 **Si la de Salesforce se ve más chica, más gris o más corta, la honestidad era
  decorativa** — y un comité entrenado lo detecta antes que cualquier argumento.
  **La simetría no es estética: es el argumento hecho layout.**
- 🎯 **Decisión: la página se escribe para dos lectores hostiles** — el abogado de Salesforce y el AE que compite
  por el deal. **Si ninguno de los dos puede señalar un error, el comité tampoco puede.**
  **Diseñar para el lector hostil es lo que la hace creíble para el amistoso.**
- **Decisión: registro técnico, cero adjetivos.** *"USD 189k a 3 años"* es un hecho. *"Carísimo"* es una opinión —
  y una opinión acá **es publicidad comparativa denigrante**, que en Chile y LATAM **tiene reglas**.
  **La frialdad no es un tono: es una defensa.**
- **Decisión: cero logos, cero "versus" con escudos enfrentados.** Es uso de marca ajena **y** el registro visual
  de un folleto de guerra. 🎯 **Esta página se ve como un informe. Porque lo es.**
- **Decisión: denunciamos el truco de nuestros propios colegas** (*"la mitad de los partners dice 'líder según
  Gartner'; eso es falso"*). Es incómodo. **Y es lo que nos separa de ellos en la cabeza del lector.**
- **Command of the Message:** la página no compara features. Compara **capacidades requeridas y outcomes**
  (adopción, time-to-value, costo de admin, riesgo de migración) — que es donde vive la decisión real del comité.
- **JOLT:** la indecisión de un comité es **miedo a que le estén ocultando algo**. No se combate con más
  argumentos: **se desarma mostrando lo que uno mismo preferiría ocultar.**

## Acceptance Checklist

- [ ] 🎯 **Abre con la verdad incómoda** (Niche Player en SFA) **y su contexto** (Leader en B2B MA, 5.º año),
      dicho que **son reportes distintos**.
- [ ] 🔴 **`"Líder en CRM"` y `Forrester` no existen en el DOM.** **`Pardot` no aparece con "muerto/obsoleto".**
- [ ] 🎯 **El TCO tiene sus supuestos declarados arriba** (y en el `<caption>` de la tabla).
- [ ] 🔴 **La frase del admin está en la misma región del TCO, sin suavizar.**
- [ ] 🔴 **"Dónde gana Salesforce" existe, sin adornos**, y es **visualmente simétrica** a "dónde gana HubSpot"
      *(assertion verificada, no asumida)*.
- [ ] 🔴 **Todo dato de Salesforce verificado en navegador real, con screenshot fechado y archivado.**
- [ ] 🔴 **Cero adjetivos denigrantes. Cero logos ni identidad visual de terceros.**
- [ ] 🔴 **Pasada de `legal-privacy-ip-operator` hecha antes del publish.**
- [ ] **Agentforce vs Breeze** con las dos cifras verificadas. **"Qué se rompe al migrar"** presente.
- [ ] 🔴 **Sin JS la página se lee entera.** **Cero contadores.** `as-of` visible.
- [ ] Enlace al pillar presente. Ningún `href` a página inexistente.
- [ ] Copy es-LATAM neutro, **registro técnico y frío**, validado con `greenhouse-ux-writing`.
- [ ] GVC 1440 + 390 + reduced-motion capturado **y mirado**.
