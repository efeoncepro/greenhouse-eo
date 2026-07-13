# PDR-006 — Posicionamiento de la landing HubSpot: **evidencia antes que promesa**

> **Tipo:** Product Decision Record (posicionamiento/GTM de una superficie del sitio público).
> **Estado:** Accepted — **reescrito desde cero el 2026-07-13** (operador). La v1 (2026-07-07) fijaba la idea
> única en *"RevOps programático (Kortex)"*; **esa tesis no se sostiene** (ver §0) y se sustituye entera.
> No es un delta: es una tesis nueva.
> **Skills:** `hubspot-solutions-partner` (dominio HubSpot: producto, programa, battlecards, waiver),
> `commercial-expert` (motion, wedge, land-and-expand, JOLT/Challenger), `growth-marketing-cro`,
> `seo-aeo`, `efeonce-agency`, `product-design-loop`, `efeonce-public-site-wordpress`.
> **Ejecución:** [`TASK-1352`](../../tasks/to-do/TASK-1352-landing-hubspot-agentic-platform.md) —
> reposición in-place de `/servicios-contratar-hubspot/` (WordPress id `244079`). Epic: `EPIC-019`.
> **No-duplicación:** cita, no copia — `docs/context/02_gtm.md` (CRM Solutions, 4 capas, Solutions Partner,
> co-sell con PDM), `docs/context/08_estrategia-comercial.md`, `docs/context/09_marca-agencia.md`,
> [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md), [PDR-007](PDR-007-hubspot-portal-grader-lead-magnet.md).
> **Evidencia:** skill `hubspot-solutions-partner` → `SOURCES.md` (✅ primaria / ⚠️ secundaria / ❌ no publicada)
> + `efeonce/ESTADO_ACTUAL.md` (portal Partner + CRM 48713323, as-of 2026-07-13).

---

## 0. Por qué se reescribe (y no se parcha)

La v1 apostaba la página entera a **"el diferenciador es Kortex — RevOps programático, lo único que la región
no replica"**. Dos hechos verificados el 2026-07-13 la derrumban:

1. 🔴 **Kortex opera UN cliente en producción (ANAM).** No es un moat: es un piloto. Una landing pública cuya
   tesis central afirma una capacidad que ningún competidor replica **no resiste la primera pregunta de
   RevOps**: *"¿cuántos clientes corren sobre eso?"*. La v1 afirmaba una escala que no existe.
2. 🔴 **Kortex peleaba contra JOLT, que la propia v1 adoptaba.** El objetivo declarado era *reducir el miedo a
   elegir mal*; pero *"te operamos con nuestro software propietario"* **añade** una pregunta que antes no
   existía: *¿y si me quiero ir, quedo atrapado?* **El diferenciador trabajaba contra la estrategia.**

Y la auditoría de la página viva (REST autenticado + Playwright) encontró que además **afirma cosas falsas**
(§7). Parchar sobre eso era construir encima de cimientos malos.

---

## 1. La decisión — idea única

> # Te quitamos el riesgo antes de que compres.

**Reencuadre Challenger** (registro sobrio, sin superlativos):

> **"Todos los partners te van a prometer que HubSpot va a funcionar.
> Nosotros te vamos a mostrar, antes de cobrarte un peso, si te sirve o no."**

Es **JOLT hecho posicionamiento** — el 40-60% de las pérdidas en B2B no son contra un competidor, son contra
la **indecisión** (Dixon & McKenna, *The JOLT Effect*, 2022). La categoría entera compite prometiendo
resultados y presumiendo tier/velocidad. **Nadie compite quitando riesgo.** Y Efeonce puede hacerlo **hoy,
con lo que ya tiene** — no hay que construir nada.

### Los cuatro activos que la sostienen (ordenados por fuerza de evidencia)

| # | Activo | ¿Verificable hoy? | ¿Copiable? | Rol en la página |
|---|---|---|---|---|
| **1** | **Waiver del onboarding** — el cargo **obligatorio** de HubSpot **desaparece del contrato del cliente** (USD 3.000 en Marketing Hub Pro = **31% del año 1**; USD 7.000 en Enterprise) | ✅ Efeonce está **certificada** | 🔒 **El HubSpot directo NO puede igualarlo.** Es estructural del canal partner | **El número** |
| **2** | **Dos graders propios** (AI Visibility + HubSpot Portal Grader) | ✅ Existen y corren | 🔒 Ningún partner de la región tiene uno | **La puerta** |
| **3** | **Descalificación honesta** — los límites de HubSpot por escrito | ✅ Documentados | 🔓 Copiable — **pero nadie lo hace, porque asusta** | **La confianza** |
| **4** | **Kortex** — versionado, trazable, reversible | ⚠️ **n=1** | 🔒 Real, pero hoy es **promesa** | **El antídoto del miedo** |

**Los cuatro comparten una sola cosa: le quitan riesgo al comprador antes de que firme.**
El grader le muestra su problema **gratis**. La descalificación le dice cuándo **NO** comprarnos. El waiver le
saca **USD 3.000** del costo. Kortex garantiza que es **reversible** y que no queda encerrado.

🔴 **Los cuatro aplican a TODA la plataforma, no a un Hub.** El waiver cubre Marketing, Sales y Service; la
descalificación es de HubSpot entera (10 custom objects, 1 sandbox, sin residencia LATAM); Kortex despliega
cualquier Hub. **"Evidencia antes que promesa" es una postura, no un producto** — y por eso funciona para los
siete dolores de §2.

*(El teach-first de la v1 —"HubSpot dejó de ser un CRM"— **sobrevive como stakes**, no como tesis: explica
**por qué decidir mal ahora cuesta más caro**. No es la propuesta de valor.)*

---

## 2. 🔴 Qué se vende: **la plataforma completa**, no un Hub

**Regla dura:** esta página vende **HubSpot** — Smart CRM + los seis Hubs + Breeze — y **su operación** (las 4
capas de CRM Solutions). **NUNCA se estrecha a un Hub.** Una landing que termina hablando solo de visibilidad
en IA **es una landing de AEO con logo de HubSpot**, y deja fuera a la mayoría de los compradores: al CRO que
no sabe cuánto pipeline tiene no le importa ChatGPT; al RevOps con datos sucios, tampoco.

### El mapa de entrada: **dolor → Hub** (es la región que hace que esto sea una landing de HubSpot)

| Lo que le duele *(su lenguaje, no el nuestro)* | Quién lo siente | Qué resuelve | Ticket de referencia ✅ |
|---|---|---|---|
| *"No sé cuánto pipeline tengo. Mi CRM es un Excel y la memoria de tres personas."* | CRO / VP Ventas | **Sales Hub + Smart CRM** | USD 90/asiento (Pro) → 10 asientos = **90 pts sourced** |
| *"Marketing y ventas miran números distintos y nadie sabe cuál es verdad."* | CMO + CRO | **Marketing + Sales** | Marketing Pro USD 800/mo = **80 pts** |
| *"Nadie me encuentra — ni en Google ni cuando le preguntan a ChatGPT."* | CMO | **Marketing + Content** *(HubSpot AEO viene adentro — §4)* | Marketing Pro + Content |
| *"Mi postventa es invisible: se me van clientes y me entero tarde."* | COO / Customer Success | **Service Hub** *(+ Customer Agent, USD 0,50/resolución)* | USD 90/asiento (Pro) |
| *"Mis datos están sucios y repartidos en cinco sistemas."* | RevOps / IT | **Data Hub** *(ex-Operations Hub)* | USD 720/mo (Pro) = **72 pts** |
| *"Cotizo en Word y pierdo margen en descuentos que nadie aprueba."* | CFO / CRO | **Revenue Hub** *(ex-Commerce — CPQ, contratos, e-signature)* | desde USD 95/mo |
| *"El directorio pidió IA y nadie sabe qué significa."* | CEO | **Breeze** — ⚠️ **y la respuesta honesta: solo 3 agentes en GA** | outcome-based |

**Siete dolores, siete puertas, una plataforma.** Cada uno es un deal por sí solo. **No todo pasa por Marketing.**

> **Cómo se escribe esta región:** el título es el **dolor en su lenguaje**, no el nombre del Hub. El Hub
> aparece como respuesta, no como encabezado. *(Command of the Message: se ancla a la capacidad requerida y al
> outcome, nunca a la lista de features.)*

---

## 3. Las dos puertas de diagnóstico — **la prueba gratis**

Son **dos de las entradas**, no el eje. Su rol es materializar *"te muestro antes de cobrarte"*.

| Prospecto | Puerta | Qué le prueba | A dónde lleva |
|---|---|---|---|
| **Ya tiene HubSpot** | **HubSpot Portal Grader** *(EPIC-024 / [PDR-007](PDR-007-hubspot-portal-grader-lead-magnet.md))* — **la más on-thesis: diagnostica HubSpot** | *"Tu portal está sucio: seats muertos, workflows rotos, datos podridos, Hubs que pagas y no usas"* | **Managed CRM Ops** + **cross-sell del Hub que falta** |
| **Su dolor es de demanda** | **AI Visibility Grader** *(propio — `src/lib/growth/ai-visibility/**`, EPIC-021)* | *"No apareces cuando tu comprador le pregunta a ChatGPT"* | **Marketing + Content** |
| **Cualquier otro de los siete dolores** | **La reunión** — y en la reunión, **lo primero es decirle si HubSpot NO le sirve** (§ descalificación) | — | El Hub que corresponda |

**Las dos son gratis, las dos entregan evidencia, y ninguna revende una feature de HubSpot.**
Y para los dolores que ningún grader cubre, **la postura se sostiene igual**: la descalificación honesta ES la
evidencia. *"Te digo en la primera reunión si esto no te sirve"* vale tanto como un diagnóstico.

> ⚠️ **Mientras el Portal Grader (EPIC-024 Fase 1) no esté live**, esa puerta usa el `<greenhouse-form>` interino
> con fallback honesto. **La estructura se construye desde ya** — no se rediseña después.

---

## 4. 🔴 El grader de Efeonce **NO** es HubSpot AEO

Son **productos distintos, de dueños distintos**. Confundirlos rompe tres cosas a la vez.

- **HubSpot AEO** = feature **de HubSpot**. **USD 50/mo standalone; incluida en Marketing Hub Pro/Enterprise** ✅.
  🔴 **Venderla es la venta más pequeña posible: una parte de un módulo.** No paga ni la reunión.
- **AI Visibility Grader** = **de Efeonce**. Su trabajo **no** es vender una feature ajena: es **probar que el
  motor de demanda del cliente está roto**.

**La venta nunca es la feature: es el Hub que resuelve el dolor** (§2). Cuando el dolor es de **demanda**, ese
Hub es **Marketing + Content** (Marketing Pro USD 800/mo → **80 puntos sourced + USD 5.760 de comisión a 3
años**), y **HubSpot AEO viene incluido adentro** → es una **nota al pie** que refuerza que el problema tiene
salida dentro de lo que le estás vendiendo. **Nunca es el argumento.**

🔴 **Y esta puerta es UNA de siete.** Si la página termina orbitando alrededor de AEO, se estrechó a Marketing
y perdió a los otros seis compradores. **La regla de §2 manda sobre esta sección.**

---

## 5. HubSpot usa AEO como **wedge** — y eso es una oportunidad de canal

**El empaque lo delata.** USD 50/mo standalone es un precio que **nadie paga**: no es una línea de producto, es
un **ancla que hace obvio el upgrade a Marketing Hub Pro** (donde AEO viene gratis *más* la maquinaria para
arreglar el problema). Es land-and-expand de manual — el mismo movimiento con que HubSpot construyó la empresa
(CRM gratis → la operación entera corre ahí → suben de tier).

**Y tiene una razón existencial:** HubSpot está construida sobre el inbound (SEO + contenido). Su propio dato
—**orgánico −27% YoY, referidos desde IA ×3** ✅— es una amenaza a su propuesta de valor central. **HubSpot AEO
es su respuesta a su propio problema**, y por eso *Loop Marketing* ("Amplify": *distribuir donde buscan humanos
Y bots*) y *Growth Context* son el aparato narrativo de 2026.

### Las tres consecuencias para Efeonce

**🎯 1. Estás a favor de la corriente del vendor.** Regla del canal: cuando tu vendor empuja un wedge,
**amplifícalo y quédate con la capa de servicio** — nunca compitas con él. HubSpot va a empujar AEO todo 2026
(Growth Specialists, MDF, co-marketing). **Efeonce ya tiene práctica de AEO y grader propio: llegó antes que el
motion de su propio vendor.** Eso es palanca de co-sell que hoy no se está usando.

**⚠️ 2. Define el ICP del grader.** HubSpot AEO **mide lo mismo**. Prospecto **sin** Marketing Hub Pro → el
grader tiene valor de escasez total (**es el wedge**). Cliente **con** Marketing Hub Pro → ya tiene la medición
adentro. 🔴 **No construir el foso del grader sobre la medición: HubSpot la va a comoditizar. Construirlo sobre
el arreglo.**

**🔴 3. Riesgo de canibalización del retainer de AEO.** Trampa clásica del partner: *el vendor se traga la capa
que vendías*. Si el retainer de AEO está construido sobre *"medimos y reportamos"*, **HubSpot acaba de hacerlo
gratis dentro de la plataforma — y se la vas a vender tú.** La defensa se dice **antes**, en el pitch y en el SOW:

> **Medir no es arreglar.** HubSpot AEO **te dice** que estás en cero. **No te saca de cero.** Lo que mueve la
> aguja es entidad de marca consistente, contenido estructurado y citable, y presencia en las fuentes que los
> motores leen. **Eso es servicio, no software.**

*(Es el mismo argumento que sostiene la implementación —"la licencia no es la adopción"— aplicado a AEO:
**"el dashboard no es la visibilidad"**.)*
🔴 **Consecuencia fuera de la landing:** repricear el retainer de AEO **de "medimos" a "movemos"** (task aparte).

---

## 6. El rol de Kortex: **antídoto del miedo, no héroe**

Kortex **no se saca — se mueve**. Deja de ser la espina dorsal y pasa a responder la pregunta que llega
**después** de que el comprador ya quiere avanzar: *"¿y cómo lo hacen sin romperme nada?"*

> *"No configuramos a mano. Desplegamos con configuración versionada, trazable y reversible: cada cambio queda
> registrado y se puede deshacer. Si mañana nos cambias, te llevas la configuración documentada — no un misterio."*

Así hace exactamente lo que JOLT pide (**trazable + reversible + no te encierra**) **sin necesitar ser
impresionante: solo necesita ser cierto.**

🔴 **Regla dura: describir el mecanismo, NUNCA implicar escala.** Prohibido *"lo único que la región no
replica"*, *"operamos con software propio"* en plural, o cualquier formulación que sugiera una flota.
**El claim de Kortex sube de tier cuando suba el n.**
✅ Sí se puede: **"Kortex, nuestra app, está publicada en el HubSpot Marketplace"** (proof verificable de
tercero — pero prueba que **existe**, no que **opere a escala**).

---

## 7. Prueba y claims — qué se puede decir y qué no

| Claim | Estado |
|---|---|
| **"HubSpot Solutions Partner Gold"** | ✅ **Cierto** (portal Partner). 🔴 **Condición: revisar el 2027-01-15** — el Gold está acreditado hasta esa fecha y hoy Efeonce está bajo el umbral de puntos totales. **Si baja de tier, el badge sale de la página ese día** (riesgo de compliance del programa) |
| **"Leader en B2B Marketing Automation (Gartner, 5.º año)"** | ✅ **Cierto y citable** |
| ~~"Líder en CRM según Gartner"~~ | 🔴 **FALSO.** HubSpot es **Niche Player** en el MQ de *Sales Force Automation* 2025 (Leaders: Salesforce, Microsoft, Oracle; **Zoho está por encima**) |
| ~~"Leader en Forrester Wave"~~ | ❌ **No verificable para 2026** (la landing de HubSpot que lo promociona cita el Wave de **2024**) |
| ~~"ISO 27001"~~ | 🔴 **HubSpot NO la reclama para sí** — su página dice que la tienen sus **proveedores cloud (AWS)**. ✅ Correcto: **SOC 2 Type II + SOC 3** |
| ~~"Datacenters regionales"~~ como feature | ⚠️ **NO hay datacenter en LATAM.** Es un **descalificador**, no una ventaja |
| ~~"Flota de agentes de IA"~~ | 🔴 Solo **TRES** Breeze Agents están en **GA** (Customer, Prospecting, Data). El resto es **beta** |
| **Casos** | Regla positiva: **métrica verificable + relación vigente o cerrada en buenos términos + autorización**. Si falta una → **anonimizado o no se usa**. **SSilva: resultado real, SOLO anonimizado** ("una inmobiliaria del Cono Sur"), **nunca con nombre ni testimonio firmado**. **Berel no como prueba de co-selling** (cierre directo, sin PDM) |
| **Nomenclatura 2026** | **Revenue Hub** (ex-Commerce) · **Data Hub** (ex-Operations) · **UNBOUND** (ex-INBOUND). Usar el nombre viejo delata desactualización |

🔴 **Todo número citable debe estar en el HTML servido.** Los contadores animados de Ohio renderizan `00 %` sin
JavaScript, y **los crawlers de IA no lo ejecutan** — un número que solo existe tras ejecutar JS **no es citable**.

---

## 8. Demanda: por qué esta página NO es una spoke SEO *(vigente de la v1)*

**No existe demanda bottom-funnel de "partner HubSpot" en ningún mercado hispano** (Semrush, as-of 2026-07):
`hubspot partner` = **20/mes** en Chile, 30 en México, 110 en Colombia, 170 en España — todo el bloque
≈ 600-700/mes. *(Contraste: EEUU 1.600, Suecia 1.900, Países Bajos 1.300, UK 1.000.)*

**Su embudo es co-sell (PDM) + HubSpot Solutions Directory + directo/marca + outbound + cross-sell.**
Optimizarla por keyword sería resolver el problema equivocado. La demanda de **categoría** (masiva: `crm`
40.500/mes solo en México) se captura en **Think** como pillar (follow-up, EPIC-020).

🔴 **Consecuencia:** en un mercado sin búsqueda de categoría, **el listing del Solutions Directory ES el canal**
— y hoy tiene **0 reviews**, está **solo en español** (declarando servir APAC/EMEA/NA/SA), dice **"Any Budget"**
y lista **28 servicios**. Arreglarlo no cuesta dinero. *(Fuera del alcance de esta task; va al plan de rescate.)*

---

## 9. Marca, oferta y conversión

- **Lidera la masterbrand Efeonce.** Kortex/Greenhouse/Verk se nombran como el **software que sostiene el
  servicio**, no como productos que el cliente compra aparte.
- **Oferta de dos escalones:** CTA primario **"Agenda una reunión"** (HubSpot Meetings + UTM); CTA secundario =
  **la puerta de diagnóstico que corresponda** (§2) — `<greenhouse-form>` gobernado + Turnstile, portal 48713323,
  HubSpot delivery `disabled` hasta cutover. **Fallback honesto** (`/contacto`/mailto) si el embed no carga.
- **Alcance pan-hispano.** Copy **es-LATAM neutro**, tuteo, sin voseo ni chilenismos. `hreflang`-ready para una
  variante `en-US` futura (EEUU es el único mercado con demanda real de partner).

---

## 10. Diferenciación frente a partners de la región

El comprador compara contra **InboundCycle** (Elite), **Cebra** (Elite, 500+ implementaciones), **Revenue Hub
Latam** (Platinum, RevOps con metodología), **Loymark**. El eje dominante de esa categoría es **metodología
RevOps** o **velocidad**. Y **Efeonce es Gold, no Elite** — no puede ganar ahí.

**No compite en el eje de ellos. Compite en uno que ninguno usa: el riesgo.**

| | Los partners de la categoría | **Efeonce** |
|---|---|---|
| Qué prometen | Que HubSpot va a funcionar | **Que te vamos a mostrar si te sirve, gratis, antes de cobrarte** |
| Prueba pre-venta | Casos y logos | **Un diagnóstico de TU marca / TU portal** |
| Honestidad sobre límites | Ninguna | **Te decimos cuándo HubSpot NO es para ti** |
| Costo de entrada | El onboarding obligatorio de HubSpot | **Se lo borramos del contrato** (−USD 3.000) |
| Riesgo de quedar atrapado | Configuración a mano, en la cabeza del consultor | **Versionado, trazable, reversible** |

**No se denigra a nadie.** Cada fila es un mecanismo verificable, no un adjetivo. Y opera **JOLT** debajo:
el miedo a elegir mal se combate **quitando riesgo**, no prometiendo más.

---

## 11. Consecuencias

- La landing es un **nodo de adquisición** (demand-capture + habilitación de venta) del ecosistema
  ([PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md)), **no una spoke SEO**. Instrumentar UTMs por canal.
- 🔴 **Slug — DEROGADO por [PDR-013](PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) (2026-07-13).** Se decía *"reposición in-place, sin 301"* para preservar equity. **Ese equity no existe**: la URL tiene **0 rankings orgánicos y 0 backlinks** (Semrush, medido). **Migra a `/servicios/hubspot/` con 301.** El slug actual además optimiza para un fantasma (`contratar hubspot` ≈ 0 búsquedas). Todo lo demás de este PDR sigue vigente y se aplica al pillar en su URL nueva.
- 🔴 **Riesgo de concentración (nuevo):** **ANAM es a la vez el único cliente Kortex, el único caso de CRM
  citable, la venta más reciente (USD 8.400, mar-2026) y el próximo cross-sell.** Si ANAM se va, se caen las
  cuatro cosas **más el tier**. **Un QBR con ANAM es el movimiento de mayor retorno por hora disponible hoy** —
  reinicia los puntos managed, produce la medición → el caso → la prueba social de CRM que hoy no existe, abre
  el cross-sell, y **convierte a Kortex de promesa en caso demostrable**.
  → `.claude/skills/hubspot-solutions-partner/efeonce/PLAN_RESCATE_6M.md`.
- **Follow-ups:** pillar de categoría CRM en Think (EPIC-020) · repricing del retainer de AEO ("de medimos a
  movemos") · arreglo del listing del Solutions Directory · variante `en-US`.

---

## 12. Alternativas descartadas

- **Liderar con Kortex / "RevOps programático"** *(era la tesis v1)* — **n=1**. Afirma una escala que no existe y
  **pelea contra JOLT** (software propietario = miedo a quedar atrapado).
- **Liderar con "Somos HubSpot Solutions Partner"** — commodity: lo dice todo partner. *(Y el tier Gold no gana
  contra Elite.)*
- **Liderar con el catálogo de agentes Breeze** — es la historia de HubSpot, no de Efeonce; **solo 3 en GA**;
  el pricing cambia cada trimestre.
- **Vender HubSpot AEO como producto** — USD 50/mo: **la venta más pequeña posible**. Es el wedge de HubSpot,
  no el negocio de Efeonce (§3, §4).
- **Spoke nueva `/servicios/hubspot` + 301** — sin upside de demanda; riesgo SEO; fragmenta equity.
- **Ángulo SEO keyword-led** — la data lo mata: no hay búsqueda bottom-funnel en ningún mercado hispano.
- **Posicionar como consultora RevOps pura** — es el eje de la categoría, donde Efeonce (Gold) no gana contra
  los Elite.

---

## 13. No-goals

- No es pricing ni self-serve; no expone el portal Greenhouse ni datos de cliente.
- **No afirma claims que HubSpot no hace** (ISO 27001, "Líder en CRM según Gartner", Forrester Wave, residencia
  de datos en LATAM, flota de agentes).
- **No implica escala de Kortex.** Describe el mecanismo.
- **No hardcodea roster ni pricing de Breeze** (volátiles; reverificar el día de publicación).
- No usa `elementor_canvas` ni overrides de header/wrapper. No migra a Astro ni cambia de host.
- No construye motor de forms nuevo (reusa Growth Forms + portal 48713323).
