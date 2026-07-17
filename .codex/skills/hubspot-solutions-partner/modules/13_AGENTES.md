# 13 · Agentes — implementarlos, operar con ellos, construirlos

> **Este módulo nació el 2026-07-13** porque los agentes dejaron de ser una nota al pie del producto y pasaron
> a ser **una capa de servicio con caso propio**. Es la oferta más diferenciada que Efeonce tiene hoy en LATAM.

---

## 0. 🎯 HubSpot soltó la etiqueta "CRM" — y en su arquitectura dejó **tu** hueco

✅ HubSpot se autodenomina **"Agentic Customer Platform"**. Objetivo declarado a inversionistas: ser
**"la #1 agentic customer platform para empresas en crecimiento"**. **No es marketing: cambiaron de categoría.**

**Su arquitectura oficial, en tres capas:**

| Capa | Qué dice HubSpot | Qué significa para ti |
|---|---|---|
| **1 · Smart CRM** *(contexto)* | Fuente única de verdad: datos estructurados **y no estructurados** | **Sin datos limpios no hay outcome de IA.** Eso es **implementación** |
| **2 · Breeze Agents** | *"AI teammates que hacen trabajo real"* | **Tú los implementas.** Solo 3 en GA → § 2 |
| **3 · Agent Coordination** | 🎯 *"**Decidir qué tareas manejan los agentes solos y cuáles quedan con humanos**"* | 🔴 **ESTA CAPA ES TU SERVICIO. HubSpot la nombra y NO la llena.** |

> 🎯 **Tu doctrina de gobierno (`propose → confirmación humana → execute`) no es un invento tuyo:
> es la capa que la arquitectura oficial de HubSpot dice que necesitas — y que la plataforma no trae.**
>
> Y su propio diferenciador declarado lo remata: *"lo que la IA no puede replicar es la combinación de tus
> datos de cliente, tu conocimiento del negocio y las prácticas probadas"*.
> **Traducción: la plataforma necesita contexto. Y armar el contexto es trabajo de implementación.**
>
> **HubSpot está escribiendo tu propuesta de valor en su propio material corporativo. Úsala.**

**El pitch de una línea:**
> *"HubSpot dejó de ser un CRM: hoy es una plataforma agéntica de tres capas. La tercera —decidir qué hace un
> agente solo y qué no— **no viene incluida**. Ahí entramos nosotros."*

---

## 1. Las tres capas del SERVICIO (y las tres son reales)

| Capa | Qué es | Estado en Efeonce |
|---|---|---|
| **1 · Implementamos los agentes de HubSpot** | Los **3 en GA**: Customer, Prospecting, Data. Configuración, gobierno y modelado de costo | ✅ **CASO REAL** — Customer Agent en ANAM |
| **2 · Operamos HubSpot *con* agentes** | La **HubSpot Agent CLI** — Claude Code / Codex operan el CRM directamente | ✅ **Ya se trabaja así** |
| **3 · Construimos agentes propios** | **Agent Tools** — empaquetas lógica de negocio + IA como herramienta que un agente de HubSpot puede llamar | ⚠️ Capability. **Confirmar si ya se hizo uno** |

**Casi ningún partner de LATAM está en la capa 2. Prácticamente ninguno en la 3.**

---

## 2. Capa 1 — Implementar los agentes de HubSpot

### 🔴 Solo TRES están en GA ✅
**Customer Agent · Prospecting Agent · Data Agent.** El KB clasifica el resto como **"Mostly Beta"**
(ABM Landing Page, Blog Research, Closing, Company Research, Cross-sell/Upsell, Customer Health, Deal Loss,
RFP, Sales-to-Marketing Feedback).

> 🎯 **Decir en público cuáles NO están listos es el contenido más citable del mercado**, porque nadie más lo
> hace. Todo el mundo está prometiendo "flota de agentes de IA". **Tú serías el único diciendo que hay tres.**

🔴 **NUNCA firmes un SLA sobre un agente en beta.**

### Prospecting Agent — contrato reusable

Para discovery, entrenamiento/grounding, disponibilidad, selling profiles/plays, señales de compra, sourcing
de contactos, modos de outreach, créditos, guardrails, piloto y medición del Prospecting Agent, cargar
`../references/prospecting-agent.md` junto con `../SOURCES.md`. Esa referencia es deliberadamente agnóstica
al cliente; no derivar un rollout productivo desde un caso particular ni confundir la superficie general con
la beta de buying signals.

### El costo real — outcome-based ✅ (desde 2026-04-14)
| Agente | Cobro | En USD |
|---|---|---|
| **Customer Agent** | 50 créditos **por conversación RESUELTA** | **USD 0,50** |
| **Prospecting Agent** | 100 créditos **por lead recomendado** | **USD 1,00** |
| **Data Agent** | 10 créditos por respuesta a prompt | USD 0,10 |

✅ **Definición de "resuelta"** (necesaria para modelar el costo **y** para medir el caso): el agente respondió
compartiendo una fuente o ejecutó una acción **y no hubo handoff a humano dentro de 72 horas**.

🔴 **Los HubSpot Credits NO se suman entre Hubs** (manda el tier más alto) y **no hay rollover**.
Enterprise incluye 5.000/mes. Overage: **USD 10 / 1.000 créditos**.

### 🎯 El caso: ANAM · Customer Agent
> **El equipo de atención redujo su carga un 56% en promedio** (76% en el mejor mes).
> Implementación, gobierno del agente y modelado de costo: Efeonce.

🔴 **Reglas al citarlo:**
- **Lidera con el 56% (el promedio), no con el 76% (el pico).** *"Hasta 76%"* le dice a un comprador
  sofisticado *"eso es cherry-picking"* y descuenta todo lo demás. **El conservador vende más.**
- **Declara el período** (sobre cuántos meses) y **la línea base**.
- **Declara la definición de resolución** (la de HubSpot — ver arriba).
- ⚠️ **Requiere autorización de ANAM** para nombrarlos. Sin ella → anonimizado.
- **Contraste útil:** HubSpot solo se atreve a decir *"50% más tickets resueltos"*. Efeonce mide
  **reducción de carga humana**, que es una **métrica de negocio**, no de herramienta.

### Lo que se implementa de verdad (esto es el servicio)
1. **Base de conocimiento** que el agente consume (sin datos limpios no hay outcome).
2. **Gobierno**: qué decisiones **NO** requieren juicio humano, y cuáles sí. **Dónde escala.**
3. **Tono, marca y multi-brand.**
4. **Modelado de costo** — el outcome-based es predecible **si modelas el volumen**. Si no, es una sorpresa.
5. **Medición del outcome de negocio**, no de la herramienta. *(Esa es la diferencia entre un caso y un dato.)*

---

## 3. Capa 2 — Operar HubSpot **con** agentes: la Agent CLI

✅ **HubSpot Agent CLI — public beta, anunciada el 2026-06-23.**

> *"Una CLI construida **para que agentes de IA** interactúen con tus datos de HubSpot"* — diseñada para
> **Claude Code, Claude Cowork y OpenAI Codex**, y para *"automatizaciones agendadas, operaciones masivas y
> tareas de fondo que corren **sin un humano en el loop**"*.

**Superficie de comandos** ✅: CRUD completo sobre cualquier objeto (incl. custom) · **pipelines y stages** ·
**properties** · **associations** (+ labels y límites).
**Auth:** OAuth (scoped a los permisos del usuario) **o `admin mode` via service key** (requerido para schema
y la mayoría de los deletes).
**Salida:** JSONL. **Todos los writes soportan `--dry-run`.**
⚠️ **No reemplaza al MCP de HubSpot** (el MCP es conversacional; la CLI es para agentes).

```bash
# POSIX
curl -fsSL https://api.hubapi.com/hub/cli/backend/hub-cli/latest/install.sh | sh
hubspot auth login
npx skills add hubspot/agent-cli-skills
```

### 🎯 Por qué esto es el diferenciador real (y no Kortex)

**HubSpot acaba de declarar oficialmente que la forma de operar su CRM es con agentes de IA, sin humano en el
loop. Y Efeonce ya trabaja así** — mientras el resto de los partners de la región **clickea en la UI**.

| | *"Tenemos software propietario"* (Kortex) | *"Operamos con agentes"* (Agent CLI) |
|---|---|---|
| Validado por | Nadie | 🎯 **HubSpot mismo** |
| ¿Pide fe? | Sí | **No — la CLI es pública y verificable** |
| Escala | ⚠️ **n=1** | **Es una forma de trabajar, no un producto** |
| Miedo que genera | *"¿quedo atrapado en su software?"* | Ninguno |

> *"HubSpot acaba de publicar una CLI para que agentes de IA operen tu CRM sin humano en el loop.
> Nosotros ya trabajamos así — no es una promesa de roadmap, es como operamos. Por eso desplegamos tu
> operación como configuración versionada y reversible, no clickeando en doscientas pantallas."*

### 🔴 Y la doctrina de gobierno — que es lo que se vende

**El `admin mode` via service key da acceso elevado a schema y borrados.** Un agente de IA con esa llave sobre
el CRM productivo de un cliente **le puede destruir la operación.**

**El gobierno es el producto:**

> *"Operamos tu CRM con agentes. Pero con gobierno: el agente **propone**, un humano **confirma**, y recién
> ahí se **ejecuta**. Y todo write pasa por `--dry-run` antes. **Nadie le da la llave del CRM a una IA sin
> supervisión — y quien te diga que sí, sal corriendo.**"*

🔴 **Reglas duras de operación:**
- **`--dry-run` obligatorio** antes de cualquier write sobre un portal productivo.
- **`admin mode` solo con autorización explícita y acotada** en el tiempo. Nunca por defecto.
- **Loop `propose → confirmación humana → execute`** — es la misma doctrina que rige a Nexa en Greenhouse.
- **Todo lo que el agente toque queda auditado.**

---

## 4. Capa 3 — Construir agentes: los Agent Tools

⚠️ **BETA.** *"Una custom workflow action hecha para agentes de IA"* — empaquetas **API calls + pasos de LLM +
contexto** en una herramienta que un agente de HubSpot puede llamar (como un tool de MCP).

Se construye con el **developer project framework**:
```bash
npm install -g @hubspot/cli@latest
hs account auth
hs project create      # project version 2025.2 o 2026.03
hs project upload
```
Config en `src/app/workflow-actions/*-hsmeta.json`. Requiere **developer account con opt-in a la beta**.

🎯 **Esto es "te construimos tu propio agente" — y es un SERVICIO, no una licencia.**
Prácticamente ningún partner de LATAM lo ofrece.

---

## 5. 🔴 El patrón que hay que ver: HubSpot está absorbiendo las capas de sus partners

**Tres veces, en un solo trimestre:**

| HubSpot lanza | Comoditiza |
|---|---|
| **HubSpot AEO** *(abr-2026)* | La **medición** que Efeonce vende en su retainer de AEO |
| **Agent CLI** *(jun-2026)* | El **deployment programático** que era el mecanismo de Kortex |
| *(y si lanzan un portal audit propio)* | La **auditoría** |

**No es mala fe: es lo que hace toda plataforma que madura.** Pero la lección es dura:

> 🔴 **Deja de construir el negocio sobre capas que el vendor puede absorber en un release.**
> **Constrúyelo sobre lo que la plataforma NUNCA va a hacer: el juicio, el gobierno, la ejecución y la
> responsabilidad.** HubSpot te da la CLI. **No te dice qué desplegar, ni asume el riesgo si sale mal.**

**Y la contrapartida es la oportunidad:** cuando el vendor abre un frente, **móntate mientras todavía es una
ola.** Con AEO llegaste antes que su motion. Con la Agent CLI **llegaste antes que el mercado.**

### 🎯 La palanca de canal que nadie está usando
La Agent CLI está en **beta pública** → **casi ningún partner la está usando**, y HubSpot **necesita** partners
que sí (necesita pruebas de que funciona). El mail a Simón:

> *"Somos el partner de LATAM que **ya** tiene un Customer Agent en producción con outcome medido, y que **ya**
> opera con la Agent CLI que ustedes lanzaron en beta. **Úsennos como su caso.**"*

**Eso no es pedir leads: es ofrecerle un caso a tu vendor.** Es lo que compra atención de canal, MDF y deals.

---

## 6. ⚠️ La disciplina de contrato — beta ≠ SLA

**Todo esto es beta** (Agent CLI: public beta · Agent Tools: beta). Y el **13 de julio de 2026** HubSpot pasó
los **Custom Assistants a read-only** y forzó su migración: gente que había construido encima se quedó sin nada.
**Las betas cambian, y esta plataforma lo demostró esta semana.**

| | ¿Se puede? |
|---|---|
| ✅ **"Así trabajamos"** — operamos con agentes, con la CLI que HubSpot publicó | **Véndelo hoy.** Es presente y verdadero |
| 🔴 **"Tu CRM va a correr solo"** — outcome autónomo garantizado | **No lo firmes.** Depende de una beta |

**Construye sobre la beta. Vende la capability. Pero estructura el contrato para que un cambio de HubSpot no te
rompa un compromiso.** Eso no te frena — te protege mientras corres.

---

## 7. Anti-patrones

| Anti-patrón | Por qué |
|---|---|
| 🔴 **Prometer "flota de agentes de IA"** | **Solo 3 en GA.** El resto es beta. Si el cliente firma seis cifras esperando una flota, tienes un problema contractual |
| 🔴 **Firmar SLA sobre un agente beta** | Los Custom Assistants murieron el 2026-07-13. No es hipotético |
| 🔴 **Liderar el caso con el 76%** | *"Hasta X"* = cherry-picking. **Lidera con el 56%.** El conservador vende más |
| 🔴 **Dar `admin mode` a un agente por defecto** | Service key = schema + deletes. **Es la llave del CRM.** Solo con autorización explícita y acotada |
| 🔴 **Saltarse el `--dry-run`** | Todos los writes lo soportan. **No hay excusa** |
| **Vender el agente sin la base de conocimiento** | Sin datos limpios no hay outcome. **El agente amplifica lo que hay** |
| **Cotizar créditos sumando Hubs** | **No se acumulan.** Cuatro Hubs Enterprise = 5.000, no 20.000 |
| **Medir el agente por métrica de herramienta** | *"Resolvió el 70% de las conversaciones"* no es un outcome. **"El equipo bajó su carga 56%"** sí |
| **Construir el negocio sobre una capa que el vendor puede absorber** | Ya pasó tres veces en un trimestre (§ 5) |
