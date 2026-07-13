# 01 · El producto que vendes hoy — as-of 2026-07-13

> Todo con marca ✅/⚠️/❌ en `SOURCES.md`. **Refresh obligatorio antes de UNBOUND (16-18 sep 2026).**

---

## 0. Los renombres — si usas el nombre viejo, te delatas

| Antes | Hoy | Nota |
|---|---|---|
| Operations Hub | **Data Hub** ✅ | No coexisten. Migración automática al tier equivalente |
| Commerce Hub | **Revenue Hub** ✅ | No es cosmético: ahora es **quote-to-cash completo con CPQ** |
| INBOUND | **UNBOUND** ✅ | *"After fifteen years as HubSpot's flagship event, INBOUND is now UNBOUND."* 16-18 sep 2026, Boston |
| Breeze Copilot | **Breeze Assistant** ⚠️ | El KB solo nombra "Breeze Assistant" |

---

## 1. El portafolio ✅

| Producto | Qué hace | Por qué te importa comercialmente |
|---|---|---|
| **Smart CRM** | Sistema de registro base | Se vende standalone (USD 20/USD 50/USD 75 por seat) |
| **Marketing Hub** | Demand gen, automation, campañas, email, **AEO** | 🎯 **Tu punta de lanza.** Es donde HubSpot es Leader de Gartner hace 5 años |
| **Sales Hub** | Pipeline, secuencias, forecasting, **Smart Deal Progression (GA)** | Aterriza después del marketing, no antes |
| **Service Hub** | Help desk, SLAs, KB, **Customer Agent** | Expansión natural post-implementación |
| **Content Hub** | CMS, blog, landings, memberships, multisite | |
| **Data Hub** | Data sync, calidad, dedup, **Data Studio**, warehouse connectors (**Enterprise only**) | El argumento para IT/arquitectura |
| **Revenue Hub** | **CPQ**, quotes, contratos, subscription billing, invoicing, pagos | 🆕 HubSpot se metió de frente en el terreno de CPQ de Salesforce |
| **HubSpot AEO** | 🆕 Visibilidad de marca en ChatGPT/Gemini/Perplexity | 🎯 **La cuña** → `modules/07_CUNA_AEO.md` |
| **Breeze** | Capa de IA transversal | Ver § 3 — y el cuidado con los betas |

**Bundle: Customer Platform** ✅ — Marketing + Sales + Service + Content + Data.
Pro **USD 1.300/mo** (6 seats) · Enterprise **desde USD 4.700/mo** (8 seats).

**Ningún Hub se agregó ni se retiró en 2026.** Hubo renames, expansión (Commerce→Revenue con CPQ) y el
nacimiento de **HubSpot AEO** como producto vendible aparte.

### Fees de pagos ✅ (si vendes Revenue Hub, esto sale en la mesa)
HubSpot payments: **2,9% processing + 0,5% platform fee** (tarjeta). Stripe vía HubSpot: **0,75% platform fee**
*encima* del processing de Stripe. **El platform fee es adicional.** Un cobro de USD 9.000 por tarjeta = **USD 306**.

---

## 2. Pricing ✅ — y las dos trampas

| Hub | Starter | Professional | Enterprise | 🔴 Onboarding **obligatorio** |
|---|---|---|---|---|
| **Marketing** | USD 20/seat (promo USD 7) · 1.000 contactos | **USD 800/mo** · 3 core seats · 2.000 contactos | **desde USD 3.600/mo** · 5 seats · 10.000 contactos | **USD 3.000 / USD 7.000** |
| **Sales** | USD 20/seat | **USD 90/seat** | **desde USD 150/seat** | **USD 1.500 / USD 3.500** |
| **Service** | USD 20/seat | **USD 90/seat** | **desde USD 150/seat** | **USD 1.500 / USD 3.500** |
| **Content** | USD 20/seat | **USD 450/mo** | desde USD 1.500/mo | ❌ no declarado |
| **Data** | USD 20/seat | **USD 720/mo** | desde USD 2.000/mo | ❌ no declarado |
| **Revenue** | Free tier | desde USD 95/mo | desde USD 140/mo | ❌ no declarado |
| **Customer Platform** | USD 20/seat | **USD 1.300/mo** | **desde USD 4.700/mo** | ❌ **NO PUBLICADO — PÍDELO** |
| **HubSpot AEO** | — | **USD 50/mo standalone** — **incluido en Marketing Pro/Ent** ✅ | — | — |

⚠️ El precio menor es **anual**; el mayor es **mes a mes**. Confírmalo en la cotización.
❌ **La unidad de cobro de Revenue Hub** (USD 95/USD 140: ¿seat o cuenta?) no está clara. Existe un **Revenue Seat**
formal ✅ — lo que sugiere que escala por seat. **Pregúntalo antes de cotizar.**

### 🔴 Trampa 1 — los créditos NO se suman entre hubs
*"Credits do not combine across multiple subscriptions. The system uses your highest subscription tier."* ✅
**Cuatro hubs Enterprise = 5.000 créditos, no 20.000.** Y **no hay rollover.**
Incluidos: Starter 500 · Pro 3.000 · Enterprise 5.000 (Data Hub y Customer Platform: Pro 5.000 / Ent 10.000).

### 🔴 Trampa 2 — los contactos de marketing saltan escalonado
✅ Pro: incluye 2.000; el bloque adicional es de **5.000 por USD 250**.
**Un Pro que pasa de 2.000 a 2.001 contactos salta +USD 250/mo.** Modela el **crecimiento** de la base, no el número de hoy.
Enterprise: incluye 10.000; bloques de 10.000 desde USD 100 (bajando a USD 60 sobre 500K).
✅ **Límite de envío:** Starter 5× · Pro 10× · **Enterprise 20×** el tier de contactos, por mes.
Si el cliente envía más, **el modelo de precio no le sirve** — descalifícalo o rediseña.

### Seats ✅
Core (pagado, USD 45-USD 75) · Sales · Service · **Revenue** (requerido para crear/editar quotes) ·
**View-Only (USD 0)** · **Partner Seat (USD 0)**.
⚠️ El accounting de core seats cross-hub es **ambiguo en la web pública**. Multi-hub → **cotización oficial**.

---

## 3. Breeze — y por qué NO vendes "agentes de IA"

### 🔴 Solo TRES agentes están en GA ✅
**GA con pricing público:** Customer Agent · Prospecting Agent · Data Agent.
**El KB clasifica el resto como "Mostly Beta"**: ABM Landing Page, Blog Research, Closing, Company Research,
Cross-sell/Upsell, Customer Health, Deal Loss, RFP, Sales-to-Marketing Feedback.

> **No firmes SLA sobre una cola de betas.** Si un cliente firma seis cifras esperando una flota de agentes
> autónomos, tienes un problema de expectativas **contractual**, no comercial.

### Lo que sí puedes vender con confianza — el outcome-based pricing ✅
Anunciado 2026-04-02, efectivo **2026-04-14**:
- **Customer Agent: USD 0,50 por conversación RESUELTA** (bajó de USD 1,00 por conversación). **Las que no
  resuelven no cuestan nada.** Datos de HubSpot: 50% más tickets resueltos, 29% más rápido, **resuelve el
  70% de las conversaciones** (los mejores equipos llegan a 90%).
- **Prospecting Agent: USD 1,00 por lead recomendado** (antes: cargo mensual recurrente por contacto enrolado).
  Early users con **response rate 2× el benchmark**.
- Cita para el pitch (Jon Dick, Chief Customer Officer): *"Outcome-based pricing removes that risk.
  **You pay when it works, full stop.**"*

✅ **Definición de "resuelta"** (necesaria para modelar el costo): el agente respondió compartiendo una fuente
o ejecutó una acción **y no hubo handoff a humano dentro de 72 horas** del último mensaje.

> 🎯 **Este es tu mejor golpe contra Agentforce.** Salesforce cobra **USD 0,10 por acción** (Flex Credits) o
> **USD 125/usuario/mes**. Es un contador corriendo. *"Pregúntale a tu AE de Salesforce cuánto va a ser tu
> factura de Flex Credits el mes 14. No lo sabe."*

### 🔴 Custom Assistants: sunset ✅ — y es un gancho de discovery
- **2026-06-19**: las cuentas nuevas ya no pueden crear custom assistants.
- **2026-07-13**: los existentes pasan a **read-only** y migran a "Breeze projects". Los welcome messages
  y conversation starters hay que **migrarlos a mano**.

> **Si el prospecto ya usa HubSpot y construyó sobre custom assistants, hoy se le rompió algo.**
> Es una puerta de entrada. Y también es munición que un competidor va a usar contra ti como *riesgo de
> plataforma* — anticípalo tú.

⚠️ **"Breeze Intelligence" está muriendo como nombre**: ya no figura en el KB canónico (may-2026), y terceros
dicen que el enrichment estándar pasó a ser gratis con Core Seats. **No lo afirmes sin confirmar con el rep.**

---

## 4. Loop Marketing ✅ — el idioma que tienes que hablar

La metodología con que HubSpot **enterró el funnel lineal** (INBOUND 2025). Un funnel termina en la compra;
un loop **compone** — cada vuelta hace la siguiente más fuerte.

| Etapa | Qué es | Cómo lo dices frente al cliente |
|---|---|---|
| **Express** | Definir tu historia: taste, tono, punto de vista de marca. **Antes de meter IA** | *"Primero expresas quién eres — porque si no lo defines tú, la IA lo va a definir por ti."* |
| **Tailor** | IA + datos unificados (CRM, transcripts, comportamiento) para personalizar **a escala** | *"Personalizas con contexto, no con merge tags."* |
| **Amplify** | Distribuir donde buscan **humanos Y bots** | 🎯 *"Diversificas para personas y para máquinas. Ese es el cambio."* |
| **Evolve** | Analizar rápido, aprender, **realimentar Express** | *"Iteras en días, no en trimestres."* |

🔗 **Amplify + HubSpot AEO es donde el marco deja de ser conceptual y se vuelve producto vendible.**
"Distribuir donde buscan los bots" **es** AEO. Y el dato de HubSpot lo justifica: **orgánico −27% YoY,
referidos desde IA ×3.** Ese es el pitch de una línea. → `modules/07_CUNA_AEO.md`.

⚠️ **Matiz para un cliente que ya invirtió en inbound** (posición de partners, ❌ no oficial): varias agencias
sostienen que el Loop *no reemplaza* inbound sino que es "un playbook AI-driven para ejecutarlo en un mundo
omnicanal". Úsalo si necesitas que el cliente no sienta que tiró la plata. **Pero HubSpot oficialmente lo
presenta como reemplazo del funnel.** Si el cliente es HubSpot-native, usa el marco oficial.

**Tesis del Spring 2026 Spotlight: "Growth Context"** ✅. Cita para deck (Duncan Lennox, CPTO):
*"Context is much more complex. If data is what happened, context is why."* Es el posicionamiento
anti-commodity frente a Salesforce/Adobe: *"cualquiera tiene tus datos; nosotros tenemos el porqué."*

---

## 5. La postura enterprise ✅ — lo que SÍ tiene

| Capacidad | Estado |
|---|---|
| **SSO / SAML** | Sí — **requiere Professional o Enterprise**. Okta, Entra, OneLogin, AD FS |
| **SCIM** | Sí (Okta, Google) |
| **Audit logs** | Enterprise: los Super Admins ven acciones de empleados de HubSpot dentro de la cuenta |
| **Permisos** | Usuarios, teams, objetos CRM, propiedades |
| **Sandbox** | 1 standard con ≥1 hub Enterprise (ver los límites en § 6) |
| **Data residency** | US (East/West), **Canadá, Australia, EU (Frankfurt)** — AWS |
| **Encriptación** | TLS 1.2/1.3 en tránsito · **AES-256** en reposo · application-layer para *Sensitive Data* |
| **SOC 2 Type II** | Sí (bajo NDA) · **SOC 3** público |
| **HIPAA** | Sí, con BAA. Requiere activar *Sensitive Data* |
| **GDPR** | DPA con SCCs + Data Privacy Framework |
| **Trust Center** | [trust.hubspot.com](https://trust.hubspot.com/) |

### Developer platform ✅ — la conversación con IT
Cadencia fija: **2 releases mayores/año** (marzo y septiembre). APIs con formato `/YYYY-MM/`.
Ciclo: 6 meses *current* → 12 meses *supported* → **a los 18 meses los builds fallan**.
🔴 **2026-08-01**: fin de soporte de Projects 2025.1. 🔴 **2026-10-31**: sunset de Classic CRM cards.

> Un CIO conservador va a leer ese ciclo (y el sunset de Custom Assistants) como **riesgo de mantenimiento
> recurrente**. Anticípalo: *"HubSpot publica su calendario de deprecación. Salesforce te lo comunica cuando
> ya rompió algo."* Es cierto, y es la única forma honesta de manejarlo.

---

## 6. 🔴 Dónde HubSpot NO llega — los descalificadores

**Un vendedor experto descalifica temprano.** Cada uno de estos es una razón legítima para no vender.
Detalle y uso en `modules/10_DISCOVERY_SCOPING.md`.

| Límite ✅ | Descalifica si… |
|---|---|
| **10 custom objects** máx. (aumentos se compran aparte) | El cliente modela >10 entidades propias: seguros, manufactura, healthcare, logística, banca |
| **1 sandbox**, 200.000 registros/objeto, **sync inicial de solo 5.000 contactos** | Gobernanza formal de cambios (dev→QA→staging→prod) o auditoría regulatoria. **No puedes hacer UAT representativo.** Salesforce da Full Copy |
| **HubSpot NO reclama ISO 27001 para sí mismo** — su página dice que la *infraestructura cloud* (AWS) lo tiene | El pliego exige ISO 27001 **del proveedor de software**. Procurement europeo, banca, gobierno. **Verifica bajo NDA. No lo afirmes** |
| **Sin data residency en LATAM** (ni UK ni India). Migración de una vía. 🔴 **Con HIPAA activo, nunca puedes migrar** | Requisito de localización (Brasil/LGPD, etc.) |
| **API**: Ent 190 req/10s · 1M/día (add-on hasta 3M). 🔴 **Las apps públicas OAuth topan en 110 req/10s y el add-on NO levanta ese límite** | Sync bidireccional en tiempo real con ERP o core bancario |
| **Sin role hierarchy ni territory management** ⚠️ | Organización matricial global, ventas por territorio con visibilidad compleja |
| **100 deal pipelines · 1.000 custom properties/objeto · 300 teams · 200 calculated properties** | Enterprise global con muchas BUs come 100 pipelines más rápido de lo que crees |
| **B2C masivo**: Ent a 500K+ contactos = USD 60 por cada 10.000; envío capado a 20× | Base de millones. **Adobe/Salesforce salen más baratos a escala.** Ese es el terreno donde HubSpot pierde |
| **Sin capa de código server-side tipo Apex** ⚠️ | Motores de reglas, pricing regulado, lógica de negocio compleja |
| ❌ **BYOK / claves gestionadas por el cliente: no encontrado** | Si el pliego lo exige, **asume que no y verifica** |

⚠️ **Verifícalo con el SE antes de comprometerte:** ~20 definiciones de custom object y ~1,5M registros
totales en Enterprise; throttling de workflows con enrolamientos masivos.

---

## 7. El dato que enmarca todo ✅

**ARPU de HubSpot: USD 11.722/año** (Q1 2026, 299.458 clientes, revenue USD 881,0M +23%).

> Un deal de seis cifras es **~10× su cliente promedio**. Dos cosas ciertas al mismo tiempo:
> **(a)** tienes **palanca real** negociando con el rep de HubSpot — le estás trayendo un outlier;
> **(b)** **el producto no fue diseñado para tu cliente** — por eso la sección 6 no es opcional.

Y en su propio filing público, el management dice que la tesis de crecimiento es **upmarket + reducción de
TCO**. Eso es material, auditado, y **puedes citarlo**.
