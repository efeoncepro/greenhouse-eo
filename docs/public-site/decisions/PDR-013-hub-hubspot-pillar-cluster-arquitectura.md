# PDR-013 — El Hub de HubSpot en el sitio público: arquitectura pillar + cluster

> **Tipo:** Product Decision Record (arquitectura de información + GTM de una familia de superficies).
> **Estado:** Accepted — 2026-07-13 (operador).
> **Skills:** `hubspot-solutions-partner` (dominio), `commercial-expert` (wedge, land-and-expand, enablement),
> `seo-aeo` (topical authority, citabilidad), `info-architecture` (URLs, jerarquía),
> `growth-marketing-cro`, `efeonce-public-site-wordpress`.
> **Deriva de:** [PDR-006](PDR-006-landing-hubspot-agentic-platform-posicionamiento.md) (el posicionamiento del
> pillar) · [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md) (layering) ·
> [PDR-007](PDR-007-hubspot-portal-grader-lead-magnet.md) (Portal Grader).
> **Evidencia:** Semrush (as-of 2026-07-13) + skill `hubspot-solutions-partner` → `SOURCES.md`.

---

## 0. La decisión, en una línea

**Un pillar + clusters bajo `/servicios/hubspot/*`, migrado con 301 desde la URL actual — que tiene CERO
equity — y medido por citación en LLM y uso en el canal, NO por tráfico orgánico.**

---

## 1. 🔴 La URL actual no tiene nada que preservar (medido, no supuesto)

**PDR-006 decidió "reposicionar in-place, sin gastar un 301" para preservar equity. Ese equity no existe.**

| Métrica de `efeoncepro.com/servicios-contratar-hubspot/` | Resultado (Semrush, 2026-07-13) |
|---|---|
| **Rankings orgánicos** (todas las bases regionales) | 🔴 **NOTHING FOUND** — no rankea para ninguna keyword, en ningún país |
| **Backlinks** | 🔴 **NOTHING FOUND** — cero |

**Un 301 no cuesta nada.** Y el slug actual **optimiza para un fantasma**: `contratar hubspot` tiene ~0 búsquedas.

> ⚠️ **Este PDR deroga la decisión de "reposición in-place, sin 301" de PDR-006 §Consecuencias.**
> Todo lo demás de PDR-006 (la tesis "evidencia antes que promesa", las 13 regiones, las reglas de claims)
> sigue vigente **y se aplica al pillar en su URL nueva**.

---

## 2. La estructura

```
🏛️  /servicios/hubspot/                    PILLAR — la que decide
     La postura + EL MAPA DE LOS 7 DOLORES  ← los Hubs viven ACÁ
     │
     ├── 💰 /precios/                       "Cuánto cuesta HubSpot de verdad"
     ├── 🚫 /cuando-no-usar-hubspot/        ← la que HubSpot NUNCA va a escribir
     ├── 🤖 /agentes/                       "Cuáles funcionan de verdad"
     └── ⚔️ /hubspot-vs-salesforce/         donde ellos no pueden ser creíbles
```

## 🔴 La regla que decide qué páginas existen (Delta 2026-07-13)

> ## Efeonce solo se cita donde HubSpot **no puede o no quiere hablar**.

**NO hay una página por Hub.** Una página que explica *"qué hace Service Hub"* **compite con hubspot.com en su
propia cancha y pierde** — ningún LLM la va a citar teniendo la oficial. Los **7 Hubs viven en el mapa del
pillar**. Si el canal necesita un asset de Service Hub para un deal, **es un deck, no una landing.**

| La pregunta | ¿La responde hubspot.com? | ¿Vale una página? |
|---|---|---|
| *"¿Qué hace Service Hub?"* | ✅ **Mejor que tú** | ❌ **NO** |
| *"¿Cuánto cuesta HubSpot **de verdad**?"* | 🔴 No — no publican sus trampas | ✅ **SÍ** |
| *"¿Qué agentes **funcionan de verdad**?"* | 🔴 Jamás — no dirán que solo 3 están en GA | ✅ **SÍ** |
| *"¿**Cuándo NO** usar HubSpot?"* | 🔴 **Nunca.** Es imposible que lo escriban | ✅ **SÍ — la más citable** |
| *"¿HubSpot **o** Salesforce?"* | 🔴 Son parte interesada | ✅ **SÍ** |

🎯 **`/cuando-no-usar-hubspot/` puede ser la página más valiosa del hub.** Cuando alguien le pregunta a un LLM
*"¿me conviene HubSpot?"*, el modelo **necesita un contrapunto — y no existe**: todo el internet sobre HubSpot
lo escribió HubSpot o un partner que quiere venderlo. **El primero que escriba la página honesta se lleva la
citación entera.** Y es gratis: los límites ya están documentados.

**301:** `/servicios-contratar-hubspot/` → `/servicios/hubspot/`.

**Por qué esta forma de URL** *(3 razones, no 1)*: se alinea con el patrón hermano
(`/servicios/posicionamiento-seo`, TASK-1343) · **la jerarquía pillar↔cluster queda explícita en la URL**,
que importa para Google **y** para que un LLM entienda la relación · y el slug pasa a llevar el término que
**sí** se busca (`hubspot`: 14.800/mes CL, **40.500/mes MX**) en vez de uno que nadie escribe.

---

## 3. La demanda — y por qué los clusters NO son una jugada de SEO

**Semrush, base `mx` (as-of 2026-07-13):**

| Keyword | Vol/mes |
|---|---|
| **`precio hubspot`** | **720** |
| **`hubspot pricing`** | **590** |
| `hubspot precio` | 170 |
| `hubspot planes` | 30 |
| **≈ TOTAL "precio"** | **≈ 1.500** |
| | |
| `hubspot marketing hub` | 20 |
| `hubspot service hub` | 20 |
| `hubspot sales hub` | **10** |
| **TOTAL los tres Hubs** | **50** |

> 🔴 **La página de precio tiene TREINTA VECES la demanda de todos los Hubs juntos.**

**Y `hubspot partner` sigue sin existir** (20/mes CL · 30 MX · 110 CO · 170 ES ≈ 600-700 en todo el bloque
hispano) — la conclusión de PDR-006 se sostiene.

### 🔴 Regla dura de medición

> **NO midas los clusters por tráfico orgánico. Míde­los por citación en LLM y por uso en el canal.**
> Si los evalúas por sesiones de Google, los vas a matar injustamente en tres meses. **`hubspot sales hub`
> tiene diez búsquedas al mes: como jugada de SEO es plata quemada. Su valor está en otra parte.**

### Las tres razones reales de los clusters

1. **AEO — la fuerte.** Los LLMs citan **contenido profundo y específico**. Una página que cubre siete Hubs
   superficialmente **no se cita para nada**. Siete páginas que responden bien **una** pregunta cada una, sí.
   **En 2026 el cluster no es una jugada de ranking: es una jugada de recuperación.**
2. **Assets de co-sell.** Simón (PDM) tiene un deal de Service Hub → le mandas **la página de Service Hub**.
3. **Assets de cross-sell.** QBR con ANAM → le mandas **la página de Marketing**.

---

## 4. Las páginas

### 🏛️ PILLAR — `/servicios/hubspot/`
La de PDR-006, íntegra. Tesis: **"evidencia antes que promesa"**. Y sus *stakes* ahora son **literales y
citables**: ✅ **HubSpot soltó la etiqueta "CRM"** y se autodenomina **"Agentic Customer Platform"**
(objetivo declarado a inversionistas: *"la #1 agentic customer platform para empresas en crecimiento"*), con
**tres capas**: Smart CRM (contexto) · Breeze Agents · **Agent Coordination**.
🎯 **Y la tercera capa —"decidir qué tareas manejan los agentes solos y cuáles quedan con humanos"— HubSpot
la NOMBRA y NO la llena. Ahí entra Efeonce.**

### 💰 `/servicios/hubspot/precios/` — **la que más tráfico trae, y no existe**
**~1.500 búsquedas/mes.** Y es donde vive **todo lo comercial** que hoy no está en ninguna parte:
- **Seats** (core / sales / service / revenue / **view-only gratis**)
- **Contactos de marketing** y sus **saltos escalonados** (2.000 → 2.001 = **+USD 250/mo**)
- 🔴 **HubSpot Credits** y sus **dos trampas**: **no se suman entre Hubs** (4 Hubs Enterprise = **5.000
  créditos, no 20.000**) y **no hay rollover**
- **Los onboarding fees obligatorios** (USD 3.000 / 7.000)
- 🎯 **El waiver** — que se los borras del contrato

> 🎯 **Es la página más citable que Efeonce puede tener** (*"¿cuánto cuesta HubSpot?"* es una de las preguntas
> más frecuentes que se le hacen a un LLM). Y es **honesta donde nadie lo es**: publicar las trampas de los
> créditos y los fees ocultos **es "evidencia antes que promesa" hecho página**.

### 🤖 `/servicios/hubspot/agentes/` — **la que más diferencia**
Tres capas, las tres verdaderas (→ `hubspot-solutions-partner/modules/13_AGENTES.md`):
1. **Implementamos los agentes de HubSpot.** ✅ **Solo TRES en GA** (Customer, Prospecting, Data) — y decir
   cuáles **no** lo están es el contenido más citable del mercado. 🎯 **Con caso: ANAM — el equipo de atención
   redujo su carga un 56% en promedio** *(76% el mejor mes; **liderar con el 56%**)*.
2. **Operamos HubSpot *con* agentes.** La ✅ **HubSpot Agent CLI** (public beta, 2026-06-23) — Claude Code /
   Codex operan el CRM. **Efeonce ya trabaja así; el resto de los partners clickea en la UI.**
3. **Construimos agentes propios.** ⚠️ **Agent Tools** (beta) — *"te construimos tu agente"*: servicio, no licencia.
🔴 **El gobierno es el producto:** *"el agente propone, un humano confirma, y recién ahí se ejecuta."*

### Los seis Hubs
El **título es el dolor**, no el nombre del Hub (Command of the Message). Cada uno: el dolor → qué resuelve →
qué implementamos → **cuándo NO te sirve** → el caso → CTA.

---

## 5. El faseo (y por qué no se construyen once páginas hoy)

| Fase | Qué | Por qué |
|---|---|---|
| **F0 — esta semana** | 🎯 **QBR con ANAM** | Verifica el 56%, consigue la **autorización**, reinicia los **puntos managed**, abre el **cross-sell**. 🔴 **Sin él, ninguna página tiene prueba** |
| **F1** | **Pillar (con 301) + `/precios/`** | Dos páginas. La segunda **trae tráfico real y no existe** |
| **F2** | **`/agentes/`** | La que más diferencia. **Depende del caso de F0** |
| **F2b** | 🚫 **`/cuando-no-usar-hubspot/`** | Cuesta poco y **es la más citable** |
| **F4** | ⚔️ **`/hubspot-vs-salesforce/`** | — |

> 🔴 **Once páginas mientras la práctica está detenida es optimizar la vitrina con la tienda cerrada.**
> Estado real: **cero deals de licencia creados en 7 meses · cero puntos managed · 3 clientes gestionados**
> (→ `hubspot-solutions-partner/efeonce/ESTADO_ACTUAL.md`). **Primero se enciende el motor.**

---

## 6. Lo que NO va en este hub

- **La demanda de categoría** (`crm` = **40.500/mes** en México) **va a Think**, como pillar de autoridad.
  Estos clusters son **bottom-funnel de decisión**, no captura top-of-funnel. *(Ya decidido en PDR-006.)*
- **El listing del Solutions Directory** (0 reviews, solo español, "Any Budget") — es canal, no sitio.
  Va al plan de rescate de la práctica.

---

## 7. Alternativas descartadas

- **Reposición in-place sin 301** *(era la decisión de PDR-006)* — 🔴 **se tomó para preservar un equity que
  NO existe** (0 rankings, 0 backlinks, medido). El 301 no cuesta nada y el slug actual optimiza para un
  keyword fantasma (`contratar hubspot` ≈ 0).
- **Clusters como jugada de SEO por Hub** — `hubspot sales hub` = **10 búsquedas/mes**. Plata quemada.
  Existen por **AEO + enablement de canal**, no por ranking.
- **Una sola landing que cubra los 7 Hubs a fondo** — se vuelve inmanejable y **no se cita para nada**
  (los LLMs recuperan contenido específico, no páginas enciclopédicas).
- **Vender HubSpot AEO como producto** — USD 50/mo: la venta más pequeña posible. Es el **wedge de HubSpot**,
  no el negocio de Efeonce.
- **Construir las 11 páginas ahora** — la práctica está detenida. Sin caso citable y sin motor de venta, es
  vitrina sin tienda.

---

## 8. No-goals

- No es pricing self-serve (el `/precios/` **explica**, no cotiza).
- No afirma claims que HubSpot no hace (ISO 27001 · "Líder en CRM según Gartner" · Forrester Wave · residencia
  de datos LATAM · "flota de agentes"). → `hubspot-solutions-partner/SOURCES.md` § *Datos que NO se citan*.
- **No implica escala de Kortex** (n=1) ni firma SLA sobre features en beta (Agent CLI y Agent Tools **son beta**;
  los Custom Assistants murieron el 2026-07-13 — no es hipotético).
- No hardcodea pricing ni roster de Breeze sin reverificar el día de publicación.
