# Hub de HubSpot — definición de las landings

> **SSOT de contenido** del hub `/servicios/hubspot/*`. Define **qué es cada página**: para quién, qué dice,
> con qué prueba y qué **NO** dice. De acá salen las tasks.
>
> **Arquitectura:** [PDR-013](decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) ·
> **Posicionamiento:** [PDR-006](decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md) ·
> **Dominio:** skill `hubspot-solutions-partner` (`SOURCES.md` = qué se puede afirmar).
> **As-of:** 2026-07-13.

---

## 0. 🔴 La regla que decide qué páginas existen

> ## Efeonce solo se cita donde HubSpot **no puede o no quiere hablar** — **y donde ese vacío no esté ya lleno.**

Si escribes una página explicando *"qué hace Service Hub"*, **compites con hubspot.com en su propia cancha —
y pierdes.** Ningún LLM te va a citar a ti sobre eso: la página oficial existe y es mejor.

### 🎯 Delta 2026-07-13 — la segunda mitad de la regla

La regla original decía solo *"donde HubSpot no puede o no quiere hablar"*. **Eso es necesario pero no
suficiente**, y el hueco apareció al medir *"hubspot vs salesforce"*: HubSpot y Salesforce **efectivamente** no
pueden hablar ahí (son parte interesada) — **pero el vacío ya lo llenaron veinte millones de páginas.**

| Pieza | ¿HubSpot no puede hablar? | ¿El vacío sigue vacío? | Fuerza |
|---|---|---|---|
| **Cuándo NO usar HubSpot** | ✅ jamás lo escribirán | ✅ **vacío real** | 🎯 **La más fuerte** |
| **Precios de verdad** | ✅ no publican sus trampas | ✅ nadie lo hace en español | Fuerte **+ la única con demanda** |
| **Agentes: cuáles funcionan** | ✅ no dirán que solo 3 en GA | ✅ vacío (es nuevo) | Fuerte |
| **HubSpot vs Salesforce** | ✅ son parte interesada | 🔴 **el vacío está LLENO** *(ES 70/mes · MX 20/mes · **20,8M resultados**)* | **La más débil — sobrevive como asset de venta, no por citabilidad** |

🔴 **Consecuencia:** antes de decidir que una página *"llena un vacío"*, **medirlo**. Si ya hay veinte millones
de resultados, no hay vacío: hay **saturación** — y entonces la pieza necesita **otra** justificación
(en el caso de vs-Salesforce: **se envía, no se encuentra**).

| La pregunta | ¿La responde hubspot.com? | ¿Vale una página? |
|---|---|---|
| *"¿Qué hace Service Hub?"* | ✅ **Mejor que tú** | ❌ **NO** |
| *"¿Cuánto cuesta HubSpot **de verdad**?"* | 🔴 **No** — no van a publicar que los créditos no se suman entre Hubs | ✅ **SÍ** |
| *"¿Qué agentes **funcionan de verdad**?"* | 🔴 **Jamás** — no van a decir que solo 3 están en GA | ✅ **SÍ** |
| *"¿**Cuándo NO** usar HubSpot?"* | 🔴 **Nunca.** Es imposible que lo escriban | ✅ **SÍ — la más citable de todas** |
| *"¿HubSpot **o** Salesforce?"* | 🔴 Son parte interesada | ✅ **SÍ** |

**Los siete Hubs viven en el mapa del pillar. No necesitan página propia.**
*(Si el canal necesita un asset de Service Hub para un deal, es un **deck o un one-pager** — no una landing.)*

---

## Reglas que aplican a TODAS las páginas

1. **La postura, siempre:** *"Antes de venderte HubSpot, te mostramos si te sirve."* **Evidencia antes que promesa.**
2. **Cada página dice cuándo HubSpot NO sirve** para ese caso. No es un gesto: es lo que gana a RevOps.
3. 🔴 **Claims prohibidos:** *"Líder en CRM según Gartner"* (es **Niche Player** en el MQ de SFA) · Forrester
   Wave · **ISO 27001** de HubSpot · residencia de datos en LATAM · *"flota de agentes"* (**solo 3 en GA**).
   ✅ Sí: *"Leader en B2B Marketing Automation (Gartner, 5.º año)"* · **SOC 2 Type II + SOC 3**.
4. 🔴 **Nomenclatura 2026:** **Revenue Hub** (ex-Commerce) · **Data Hub** (ex-Operations) · **UNBOUND**
   (ex-INBOUND). Y **HubSpot ya no se llama CRM**: se autodenomina **Agentic Customer Platform**.
5. 🔴 **Toda cifra citable va en el HTML servido** — los crawlers de IA no ejecutan JavaScript.
6. **El título es el dolor o la pregunta, nunca el nombre del producto.**
7. **Casos:** métrica verificable + relación en buenos términos + autorización. **SSilva solo anonimizado.**
8. **CTA dual en todas:** *"Agenda una reunión"* + el diagnóstico que aplique. **Fallback honesto siempre.**

---

## 🏛️ 1 · PILLAR — `/servicios/hubspot/`

> **301 desde `/servicios-contratar-hubspot/`** (la URL vieja tiene **0 rankings y 0 backlinks**, medido).

| | |
|---|---|
| **H1** | **"Antes de venderte HubSpot, te mostramos si te sirve."** |
| **Para quién** | Los 7 perfiles. **Es la página que decide.** |
| **Su trabajo** | Reencuadrar la categoría · mostrar **el mapa de dolores** (donde viven los 7 Hubs) · repartir a los clusters |
| **CTA** | Reunión · diagnóstico |

**Las 13 regiones** (detalle en `docs/ui/wireframes/TASK-1352-*`):
hero · stakes · 🎯 **el mapa dolor→Hub** · la prueba gratis · **cuándo NO es para ti** · **el waiver** ·
las 4 capas · cómo sin romperte nada (Kortex) · prueba · puente · FAQ · CTA.

**Los stakes, ahora literales:** HubSpot **soltó la etiqueta "CRM"**. Se autodenomina **Agentic Customer
Platform**, con tres capas: **Smart CRM** (contexto) · **Breeze Agents** · **Agent Coordination**.
🎯 **Y la tercera —"decidir qué hacen los agentes solos y qué queda con humanos"— HubSpot la nombra y NO la
llena. Ahí entra Efeonce.**

🎯 **El mapa (región firma)** — los 7 dolores, en el lenguaje del comprador, con **profundidad suficiente**
(el dolor · qué lo resuelve · qué implementamos · cuándo no sirve). **Acá viven los Hubs. No hay página por Hub.**

| El dolor | Hub | Quién |
|---|---|---|
| *"No sé cuánto pipeline tengo."* | **Sales Hub + Smart CRM** | CRO |
| *"Marketing y ventas miran números distintos."* | **Marketing + Sales** | CMO + CRO |
| *"Nadie me encuentra, ni en Google ni en ChatGPT."* | **Marketing + Content** *(AEO viene adentro)* | CMO |
| *"Mi postventa es invisible."* | **Service Hub** *(+ Customer Agent)* | COO / CS |
| *"Mis datos están en cinco sistemas."* | **Data Hub** | RevOps / IT |
| *"Cotizo en Word y pierdo margen."* | **Revenue Hub** *(CPQ)* | CFO |
| *"El directorio pidió IA."* | **Breeze** *(y la verdad: solo 3 en GA)* | CEO |

**No dice:** precios detallados *(→ `/precios/`)* · el catálogo de agentes *(→ `/agentes/`)*.

---

## 💰 2 · `/servicios/hubspot/precios/` — **la que trae el tráfico**

**~1.500 búsquedas/mes** (`precio hubspot` 720 · `hubspot pricing` 590 · `hubspot precio` 170 · base MX).

| | |
|---|---|
| **H1** | **"Cuánto cuesta HubSpot de verdad."** |
| **Para quién** | El que evalúa y quiere el número **antes** de hablar con un vendedor |
| **Su trabajo** | Ser **la respuesta honesta que nadie da** — y de paso, presentar el waiver |
| **Por qué la citan** | 🔴 **HubSpot no va a publicar sus propias trampas** |
| **CTA** | *"Te lo cotizamos sin costo"* → reunión |

**Secciones:**

1. **Cómo se cobra** — por Hub, por tier, por seat. Y la trampa: **el precio menor es anual**.
2. **Los seats** — core (USD 45-75) · sales · service · **revenue** (necesario para quotes) ·
   🎯 **view-only: GRATIS** *(nadie lo dice, y cambia el número)*.
3. **Los contactos de marketing** — 🔴 **los saltos son escalonados, no lineales**: un Pro que pasa de 2.000 a
   **2.001** salta **+USD 250/mes**. *"Modela el crecimiento de tu base, no el número de hoy."*
4. 🔴 **Los HubSpot Credits — y sus dos trampas**
   - **No se suman entre Hubs.** Cuatro Hubs Enterprise = **5.000 créditos, no 20.000**.
   - **No hay rollover.** Lo que no usas, se pierde.
   - Consumo real: Customer Agent **USD 0,50 por conversación resuelta** · Prospecting **USD 1 por lead**.
5. 🔴 **El onboarding obligatorio** — Marketing Pro **USD 3.000** · Enterprise **USD 7.000** ·
   Sales/Service **USD 1.500 / 3.500**. *"Casi nadie lo cotiza. Aparece en la primera factura."*
6. 🎯 **El waiver** — *"Ese cargo desaparece de tu contrato si trabajas con nosotros. En Marketing Hub Pro son
   **USD 3.000 sobre USD 9.600: un 31% del año uno**. Y el de HubSpot es **coaching** — te enseñan y lo haces
   tú. El nuestro es **implementación**: te lo construimos."*
7. **Cuándo el modelo de precio NO te sirve** — base B2C de millones de contactos *(Ent a 500K+ = USD 60 por
   cada 10.000; envío capado a 20×)*: ahí **Adobe o Salesforce salen más baratos a escala. Te lo decimos.**

🔴 **Reverificar todos los precios el día de publicación.**

### 🎯 Delta 2026-07-13 — el simulador (y la corrección de "explica, no cotiza")

La versión original decía: *"**No dice:** un cotizador self-serve. **Explica, no cotiza.**"*
**Ese juicio era correcto a medias**, y la corrección es la mitad interesante:

| | ¿Miente si lo calculamos? | Por qué |
|---|---|---|
| **Licencia HubSpot + onboarding** | **No** | Es **aritmética sobre precios que HubSpot publica** — y **nuestra suma es más completa que la suya** (seats view-only gratis, saltos de banda, créditos que no se acumulan, onboarding obligatorio). **No mentimos: corregimos** |
| 🔴 **Nuestro honorario de implementación** | **Sí** | Depende del scope. **Un número exacto ahí es exactamente lo que la página denuncia** → sale como *"te la cotizamos con tus números"* |

**La página estática sigue siendo la entrega base** (TASK-1401): completa, honesta y **citable sin JavaScript**.
El **simulador** (TASK-1406, sobre el pricebook de TASK-1405) se monta **encima**, como enhancement:
🔴 **sin JS, la página es exactamente la misma — más un ejemplo resuelto en el HTML servido.**

🎯 **Y su razón de ser es un momento:** el waiver deja de argumentarse y **se ve ponerse en cero.**

```
Onboarding obligatorio de HubSpot     USD 3.000
Con Efeonce (partner certificado)     USD     0     ← 31% del año 1
```

**Dos motores, dos mitades** — la licencia sale del **pricebook nuevo**; la implementación, del **cotizador que
Greenhouse ya tiene** (`src/lib/finance/pricing/`, cost-plus, audiencia `public`), cuando TASK-1407 le abra su
puerta anónima. **Meter una licencia de vendor dentro del engine cost-plus contaminaría el modelo de margen.**

---

## 🤖 3 · `/servicios/hubspot/agentes/` — **la que más te diferencia**

| | |
|---|---|
| **H1** | **"Los agentes de IA de HubSpot: cuáles funcionan de verdad."** |
| **Para quién** | El CEO al que el directorio le pidió "IA" · el COO con el servicio desbordado |
| **Su trabajo** | Ser **el único contenido honesto del mercado** sobre agentes. Y mostrar el caso |
| **Por qué la citan** | 🔴 **HubSpot jamás va a decir que solo tres están en GA** |
| **CTA** | *"Te decimos si un agente te sirve"* → reunión |

**Secciones:**

1. 🎯 **La verdad primero** — **Customer · Prospecting · Data** están en GA. **Los otros nueve, en beta.**
   **Nadie más publica esto. Es el contenido más citable del hub.**
2. **Cuánto cuestan de verdad** — outcome-based: **pagas cuando funciona**. USD 0,50 por conversación
   **resuelta** *(definición de HubSpot: el agente resolvió y **no hubo escalamiento humano en 72 horas**)*.
3. 🎯 **El caso** — **ANAM · Customer Agent en producción.** El equipo de atención redujo su carga
   **un 56% en promedio** *(76% en el mejor mes)*.
   🔴 **Lidera con el 56%.** *"Hasta 76%"* suena a cherry-picking y descuenta todo lo demás.
   ⚠️ **Requiere autorización de ANAM.** Sin ella → anonimizado.
4. **Lo que implementamos de verdad** — la base de conocimiento *(sin datos limpios no hay outcome)* · el
   **gobierno** *(qué decide solo y qué escala a un humano)* · el tono y la marca · **el modelado de costo**.
5. 🎯 **Y operamos tu HubSpot *con* agentes** — HubSpot publicó la **Agent CLI** (junio 2026) para que agentes
   de IA operen el CRM **sin humano en el loop**. **Nosotros ya trabajamos así.** No es roadmap: es cómo operamos.
6. 🔴 **El gobierno es el producto** — *"El agente propone. Un humano confirma. Recién ahí se ejecuta. Y todo
   pasa por `--dry-run` antes. **Nadie le da la llave del CRM a una IA sin supervisión — y quien te diga que
   sí, sal corriendo.**"*
7. **Cuándo un agente NO te sirve** — datos sucios *(el agente amplifica lo que hay)* · volumen bajo *(no paga
   la implementación)* · procesos sin definir *(no se gobierna lo que no existe)*.

**No dice:** *"flota de agentes de IA"* · **ningún SLA sobre un agente en beta** *(los Custom Assistants
murieron el 2026-07-13 — no es hipotético)*.

---

## 🚫 4 · **ARTÍCULO** `/hubspot/cuando-no-usar-hubspot/` — **la bomba**

> 🎯 **Delta 2026-07-13 — vive en el BLOG, no en `/servicios/`.** Una página dentro del directorio de lo que
> vendemos, diciendo *"no nos contrates para esto"*, es **estructuralmente rara** — y el lector (un escéptico
> profesional) **lee la URL antes que el H1**. Como **artículo firmado y fechado** es un experto publicando un
> análisis: **más creíble, más citable (E-E-A-T)** y **con dueño de mantenimiento** (Content Factory, revisión
> trimestral). **Categoría `hubspot`, Gutenberg.** Task: **TASK-1402**.

| | |
|---|---|
| **H1** | **"Cuándo NO usar HubSpot."** |
| **Para quién** | RevOps · IT · el escéptico del comité. **Y el LLM que necesita un contrapunto** |
| **Su trabajo** | 🎯 **Ganarse la credibilidad que ninguna página promocional puede comprar** |
| **CTA** | *"Si igual quieres una segunda opinión, hablemos"* → reunión |

### 🎯 Por qué esta página puede ser la más valiosa del hub

Cuando alguien le pregunta a un LLM *"¿me conviene HubSpot?"*, el modelo **necesita un contrapunto — y no
existe ninguno.** Todo el internet sobre HubSpot está escrito **por HubSpot o por partners que quieren
venderlo.**

> **El primero que escriba la página honesta se lleva esa citación entera.**
> Y es **gratis**: los límites ya están documentados.
>
> Además, **es la tesis hecha página.** *"Evidencia antes que promesa"* llevada a su extremo: una página
> completa dedicada a decirte **cuándo no comprarnos.**

**Los límites (documentados, no opinión — `hubspot-solutions-partner/SOURCES.md`):**

| Límite ✅ | No lo uses si… |
|---|---|
| **10 custom objects** máximo | Modelas más de diez entidades propias *(seguros, manufactura, logística, banca)* |
| **1 sandbox** — 200.000 registros; el **sync inicial trae solo 5.000 contactos** | Tienes gobernanza formal de cambios o auditoría regulatoria. **No puedes hacer UAT representativo** |
| 🔴 **HubSpot NO reclama ISO 27001 para sí mismo** *(su página dice que la tiene su infra cloud — AWS)* | Tu pliego exige **ISO 27001 del proveedor de software**. *(Sí tiene **SOC 2 Type II + SOC 3**)* |
| **Sin data residency en LATAM** *(solo US, Canadá, Australia, EU)* | Tu marco regulatorio exige que los datos vivan en tu país |
| **Sin jerarquía de roles ni territory management** | Eres una organización matricial global con visibilidad por territorio |
| **API:** las apps públicas OAuth topan en **110 req/10s** y el add-on **no lo levanta** | Necesitas sync bidireccional en tiempo real con un ERP o un core bancario |
| **B2C masivo** — Ent a 500K+ = USD 60 por cada 10.000; envío capado a 20× | Tienes millones de contactos. **Adobe o Salesforce salen más baratos a escala** |
| **Solo 3 Breeze Agents en GA** | Esperas una flota de agentes autónomos hoy |

**Y el cierre honesto:** *"Si estás en alguno de estos casos, no te vendemos HubSpot. Te decimos qué mirar.
Y si el problema cambia en dos años, acá estamos."*

**No dice:** nada falso sobre HubSpot para parecer más honesto. **La honestidad es exacta, no dramática.**

---

## ⚔️ 5 · **ARTÍCULO** `/hubspot/hubspot-vs-salesforce/` — **la más débil del hub**

> 🎯 **Delta 2026-07-13 — vive en el BLOG, y hay que ser honestos sobre por qué existe.**
> Medido: *"hubspot vs salesforce"* mueve **70/mes en ES + 20/mes en MX**, contra **20,8 millones de resultados**.
> 🔴 **Esta pieza nunca va a ser encontrada. Solo va a ser ENVIADA** — a un CFO, en un correo nuestro, antes de la
> reunión del comité. **No tiene embudo: tiene un remitente.** Y por eso la URL pesa: `/servicios/...` **le grita
> "material de ventas" al CFO antes de que lea una palabra**, saboteando la tesis del texto.
>
> 🔴 **Su condición de existencia:** frente a esas 20,8M de páginas, **la única diferencia son dos gestos** —
> **abrir con el Niche Player de Gartner** y **declarar que nuestro propio TCO se cae** si ya tienes un admin de
> Salesforce. 🎯 **Si se ablandan, esto es la 4.001 del montón, y lo correcto es no publicarlo.**
> **Categoría `hubspot`, Gutenberg. Task: TASK-1404.** *(Y el blog **no** la exime de la pasada legal: el folder
> no cambia el marco de la publicidad comparativa.)*

| | |
|---|---|
| **H1** | **"HubSpot o Salesforce: la comparación que ninguno de los dos te va a dar."** |
| **Para quién** | El comité que está decidiendo. **CFO, RevOps y CIO** |
| **Su trabajo** | Ser **creíble donde los dos vendors son parte interesada** |
| **CTA** | *"Te armamos el TCO con tus números"* → reunión |

**Secciones:**

1. 🔴 **La verdad incómoda primero** — **Gartner puso a HubSpot en Niche Players** del MQ de *Sales Force
   Automation* 2025. Los Leaders son **Salesforce, Microsoft y Oracle**. *"Si tu comité compra por Magic
   Quadrant, empieza por saber esto."* **Y HubSpot es Leader del MQ de B2B Marketing Automation, 5.º año.
   Son dos reportes distintos.**
2. **El TCO a 3 años, con supuestos declarados** — HubSpot ≈ USD 295k · Salesforce ≈ USD 611k *(30 usuarios,
   lista sin descuento)*. 🔴 **Y la honestidad que nadie pone:** *"el delta no lo hace la licencia (USD 162k
   vs 189k = 17%). Lo hace el **admin**. **Si ya tienes un admin de Salesforce en planilla, la mitad de este
   argumento se cae.**"*
3. **Dónde gana Salesforce, sin adornos** — CPQ complejo · territorios · forecasting multinivel ·
   extensibilidad (Apex, AppExchange) · modelos de datos B2B muy complejos.
4. **Dónde gana HubSpot** — costo de admin · adopción · time-to-value · marketing como ciudadano de primera.
5. **Agentforce vs Breeze** — *"Ellos cobran **USD 0,10 por acción**. HubSpot cobra **USD 0,50 por conversación
   resuelta**. **Pagas cuando funciona, no cuando lo intenta.**"*
6. **Qué se rompe al migrar** — Apex, managed packages, CPQ y los reportes históricos **no migran**.

**No dice:** *"Pardot está muerto"* ❌ **(falso y verificable en tu contra)** · ningún dato de Salesforce sin
verificar *(su sitio bloquea el fetch: **abre la página y saca screenshot con fecha antes de una reunión**)*.

---

## La forma final del hub

```
🏛️  efeoncepro.com/servicios/hubspot/          ← PILLAR (landing · 301 desde la URL vieja)
     "Antes de venderte HubSpot, te mostramos si te sirve."
     🎯 EL MAPA de los 7 dolores  ← ACÁ VIVEN LOS 7 HUBS. No hay página por Hub.
     │
     ├── 💰 /servicios/hubspot/precios/        ← LANDING (+ simulador, TASK-1406)
     │        "Cuánto cuesta HubSpot de verdad"   ~1.500/mes · la única con demanda
     │
     ├── 🤖 /servicios/hubspot/agentes/        ← LANDING
     │        "Cuáles funcionan de verdad"       (caso ANAM 56%)
     │
     ├── 🚫 efeoncepro.com/hubspot/cuando-no-usar-hubspot/     ← ARTÍCULO (blog)
     │        Los 8 límites, con la fuente al lado.  La más citable.
     │
     └── ⚔️ efeoncepro.com/hubspot/hubspot-vs-salesforce/      ← ARTÍCULO (blog)
              Se envía, no se encuentra.  La más débil.
```

🎯 **Dos landings (venden) + dos artículos (convencen).** El corte no es de formato: es de **qué queremos que
haga el lector al terminar**. Las landings piden algo; los artículos, no *(el `/cuando-no-usar/` ni siquiera
tiene formulario, y su éxito **incluye que el lector se vaya**)*.

🔴 **Los enlaces de vuelta al pillar son obligatorios en los cuatro** — y en los dos artículos, **más**: como
viven fuera de `/servicios/hubspot/`, **son la única puerta de regreso al hub.**

## Faseo

| | Qué | Bloqueado por |
|---|---|---|
| **F0** | 🎯 **El caso de ANAM verificado + autorizado** | El operador |
| **F1** | **Pillar (con 301) + `/precios/`** | — |
| **F2** | 🚫 **Artículo `cuando-no-usar-hubspot`** | — *(cuesta poco y es lo más citable)* |
| **F3** | 🤖 **`/agentes/`** | **F0** *(sin el caso, es capability sin prueba)* |
| **F4** | ⚔️ **Artículo `hubspot-vs-salesforce`** | — 🔴 **Y si hay que cortar algo, es esta** |
| **F5** | 💰 **El simulador de precios** (TASK-1405 + 1406) | **F1** |

---

## Lo que este hub NO cubre

- **Una página por Hub.** Los 7 viven en el **mapa del pillar**. Competir con hubspot.com explicando qué hace
  Service Hub **es una pelea perdida** (§ 0).
- **Assets de canal** (un deck de Service Hub para un deal de Simón) → **es un deck, no una landing.**
- **La demanda de categoría** (`crm` = 40.500/mes en México) → **va a Think** como pillar de autoridad.
- **El listing del Solutions Directory** → es canal, no sitio.
