# Hub de HubSpot — definición de las landings

> **SSOT de contenido** del hub `/servicios/hubspot/*`. Define **qué es cada página**: para quién, qué dice,
> con qué prueba y qué **NO** dice. De acá salen las tasks.
>
> **Arquitectura:** [PDR-013](decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) ·
> **Posicionamiento:** [PDR-006](decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md) ·
> **Dominio:** skill `hubspot-solutions-partner` (`SOURCES.md` = qué se puede afirmar).
> **As-of:** 2026-07-13.

---

## Reglas que aplican a TODAS las páginas

1. **La postura, siempre:** *"Antes de venderte HubSpot, te mostramos si te sirve."* **Evidencia antes que promesa.**
2. **Cada página dice cuándo HubSpot NO sirve para ese caso.** No es un gesto: es lo que gana a RevOps.
3. 🔴 **Claims prohibidos:** *"Líder en CRM según Gartner"* (es **Niche Player** en el MQ de SFA) · Forrester
   Wave · **ISO 27001** de HubSpot · residencia de datos en LATAM · *"flota de agentes"* (**solo 3 en GA**).
   ✅ Sí: *"Leader en B2B Marketing Automation (Gartner, 5.º año)"* · **SOC 2 Type II + SOC 3**.
4. 🔴 **Nomenclatura 2026:** **Revenue Hub** (ex-Commerce) · **Data Hub** (ex-Operations) · **UNBOUND** (ex-INBOUND).
   Y **HubSpot ya no se llama CRM**: se autodenomina **Agentic Customer Platform**.
5. 🔴 **Toda cifra citable va en el HTML servido** — los crawlers de IA no ejecutan JavaScript.
6. **El título es el dolor, no el nombre del Hub.**
7. **Casos:** métrica verificable + relación en buenos términos + autorización. **SSilva solo anonimizado.**
8. **CTA dual en todas:** *"Agenda una reunión"* + el diagnóstico que aplique. **Fallback honesto siempre.**

---

## 🏛️ PILLAR — `/servicios/hubspot/`

> **301 desde `/servicios-contratar-hubspot/`** (la URL vieja tiene **0 rankings y 0 backlinks**, medido).

| | |
|---|---|
| **H1** | **"Antes de venderte HubSpot, te mostramos si te sirve."** |
| **Para quién** | Cualquiera de los 7 perfiles. **Es la página que decide.** |
| **Su trabajo** | Reencuadrar la categoría, mostrar el mapa de dolores, y **repartir a los clusters** |
| **CTA** | Reunión · diagnóstico |

**Las 13 regiones** (detalle en `docs/ui/wireframes/TASK-1352-*`):
hero · stakes · 🎯 **el mapa dolor→Hub** · la prueba gratis · **cuándo NO es para ti** · **el waiver** ·
las 4 capas · cómo sin romperte nada (Kortex) · prueba · puente · FAQ · CTA.

**Los stakes, ahora literales:** HubSpot **soltó la etiqueta "CRM"**. Se autodenomina **Agentic Customer
Platform**, con tres capas: **Smart CRM** (contexto) · **Breeze Agents** · **Agent Coordination**.
🎯 **Y la tercera —"decidir qué hacen los agentes solos y qué queda con humanos"— HubSpot la nombra y NO la
llena. Ahí entra Efeonce.**

**No dice:** precios detallados *(eso es `/precios/`)* · el catálogo de agentes *(eso es `/agentes/`)*.

---

## 💰 `/servicios/hubspot/precios/` — **la que más tráfico trae, y no existe**

**~1.500 búsquedas/mes** (`precio hubspot` 720 · `hubspot pricing` 590 · `hubspot precio` 170 · MX).
**30× la demanda de todas las páginas de Hub juntas.**

| | |
|---|---|
| **H1** | **"Cuánto cuesta HubSpot de verdad."** |
| **Para quién** | El que está evaluando y quiere el número **antes** de hablar con un vendedor |
| **Su trabajo** | Ser **la respuesta honesta** que nadie da. Y de paso, presentar el waiver |
| **CTA** | *"Te lo cotizamos sin costo"* → reunión |

**Secciones:**

1. **Cómo se cobra HubSpot** — por Hub, por tier, por seat. Y la trampa: **el precio menor es anual**.
2. **Los seats** — core (USD 45-75) · sales · service · **revenue** (necesario para quotes) ·
   🎯 **view-only: GRATIS** *(nadie lo dice, y cambia el número)*.
3. **Los contactos de marketing** — 🔴 **los saltos son escalonados, no lineales**: un Pro que pasa de 2.000 a
   **2.001** contactos salta **+USD 250/mes**. *"Modela el crecimiento de tu base, no el número de hoy."*
4. 🔴 **Los HubSpot Credits — y sus dos trampas**
   - **No se suman entre Hubs.** Cuatro Hubs Enterprise = **5.000 créditos, no 20.000**. Manda el tier más alto.
   - **No hay rollover.** Lo que no usas, se pierde.
   - El consumo real: Customer Agent **USD 0,50 por conversación resuelta** · Prospecting **USD 1 por lead**.
5. 🔴 **El onboarding obligatorio** — Marketing Pro **USD 3.000** · Enterprise **USD 7.000** ·
   Sales/Service **USD 1.500 / 3.500**. *"Casi nadie lo cotiza, y aparece en la primera factura."*
6. 🎯 **Y el waiver** — *"Ese cargo desaparece de tu contrato si trabajas con nosotros. En Marketing Hub Pro
   son **USD 3.000 sobre USD 9.600: un 31% del año uno**. Y el de HubSpot es coaching — te enseñan y lo haces
   tú. El nuestro es implementación: te lo construimos."*
7. **Cuándo el modelo de precio NO te sirve** — base B2C de millones de contactos *(Ent a 500K+ = USD 60 por
   cada 10.000; envío capado a 20×)*; ahí **Adobe o Salesforce salen más baratos a escala. Te lo decimos.**

**No dice:** un cotizador self-serve. **Explica, no cotiza.**
🔴 **Reverificar todos los precios el día de publicación.**

---

## 🤖 `/servicios/hubspot/agentes/` — **la que más te diferencia**

| | |
|---|---|
| **H1** | **"Los agentes de IA de HubSpot: cuáles funcionan de verdad."** |
| **Para quién** | El CEO al que el directorio le pidió "IA" · el COO con el servicio desbordado |
| **Su trabajo** | Ser **el único contenido honesto del mercado** sobre agentes. Y mostrar el caso |
| **CTA** | *"Te decimos si un agente te sirve"* → reunión |

**Secciones:**

1. 🎯 **La verdad primero** — *"HubSpot tiene tres agentes en producción. El resto está en beta. Te decimos
   cuáles y por qué importa."* **Customer · Prospecting · Data** en GA. Los otros nueve, beta.
   **Nadie más publica esto. Es el contenido más citable del hub.**
2. **Cuánto cuestan de verdad** — outcome-based: pagas **cuando funciona**. USD 0,50 por conversación
   **resuelta** *(y la definición: el agente resolvió y **no hubo escalamiento humano en 72 horas**)*.
3. 🎯 **El caso** — **ANAM · Customer Agent en producción.** El equipo de atención redujo su carga
   **un 56% en promedio** *(76% en el mejor mes)*.
   🔴 **Lidera con el 56%.** *"Hasta 76%"* suena a cherry-picking y descuenta todo lo demás.
   ⚠️ **Requiere autorización de ANAM.** Sin ella → anonimizado.
4. **Lo que implementamos de verdad** — la base de conocimiento (sin datos limpios no hay outcome) · el
   **gobierno** (qué decide solo y qué escala a un humano) · el tono y la marca · **el modelado de costo**.
5. 🎯 **Y operamos tu HubSpot *con* agentes** — HubSpot publicó la **Agent CLI** (junio 2026) para que agentes
   de IA operen el CRM sin humano en el loop. **Nosotros ya trabajamos así.** No es roadmap: es cómo operamos.
6. 🔴 **El gobierno es el producto** — *"El agente propone. Un humano confirma. Recién ahí se ejecuta.
   Y todo pasa por `--dry-run` antes. **Nadie le da la llave del CRM a una IA sin supervisión — y quien te
   diga que sí, sal corriendo.**"*
7. **Cuándo un agente NO te sirve** — datos sucios *(el agente amplifica lo que hay)* · volumen bajo *(no paga
   la implementación)* · procesos sin definir *(no se puede gobernar lo que no existe)*.

**No dice:** *"flota de agentes de IA"* · **ningún SLA sobre un agente en beta** *(los Custom Assistants
murieron el 2026-07-13 — no es hipotético)*.

---

## Los seis Hubs

**Sin demanda SEO** (10-20 búsquedas/mes). **Existen por AEO + co-sell + cross-sell.**
🔴 **No se miden por tráfico orgánico.**

**Estructura común de las seis** *(el título es el dolor, no el Hub)*:

```
1. EL DOLOR          en su lenguaje, no en el nuestro
2. QUÉ LO RESUELVE   el Hub, como respuesta — no como encabezado
3. QUÉ HACEMOS       implementación · operación · qué le entregamos
4. CUÁNDO NO SIRVE   los límites reales de ese Hub
5. EL CASO           si lo hay. Si no: cifras del modelo, DECLARADAS
6. CTA               reunión · diagnóstico
```

| URL | H1 (el dolor) | Hub | Quién |
|---|---|---|---|
| **`/ventas/`** | *"No sabes cuánto pipeline tienes."* | **Sales Hub + Smart CRM** | CRO / VP Ventas |
| **`/marketing/`** | *"Marketing y ventas miran números distintos."* | **Marketing Hub** *(y no te encuentran: HubSpot AEO viene adentro)* | CMO |
| **`/servicio/`** | *"Tu postventa es invisible y se te van clientes."* | **Service Hub** *(+ Customer Agent)* | COO / CS |
| **`/datos/`** | *"Tus datos están sucios y en cinco sistemas."* | **Data Hub** *(ex-Operations)* | RevOps / IT |
| **`/cotizacion/`** | *"Cotizas en Word y pierdes margen en descuentos."* | **Revenue Hub** *(ex-Commerce — CPQ)* | CFO / CRO |
| **`/contenido/`** | *"Publicas y no te lee ni Google ni ChatGPT."* | **Content Hub** *(+ AEO)* | CMO |

---

## Faseo

| | Qué | Bloqueado por |
|---|---|---|
| **F0** | 🎯 **El caso de ANAM verificado + autorizado** | El operador |
| **F1** | **Pillar (con 301) + `/precios/`** | — |
| **F2** | **`/agentes/`** | **F0** *(sin el caso, es capability sin prueba)* |
| **F3** | `/ventas/` · `/marketing/` · `/servicio/` | — |
| **F4** | `/datos/` · `/cotizacion/` · `/contenido/` | **Solo si el canal las pide** |

---

## Lo que este hub NO cubre

- **La demanda de categoría** (`crm` = 40.500/mes en México) → **va a Think** como pillar de autoridad.
- **El listing del Solutions Directory** → es canal, no sitio.
