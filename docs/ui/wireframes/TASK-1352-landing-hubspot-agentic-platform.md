# TASK-1352 / `efeoncepro.com/servicios/hubspot/` — **Pillar del hub HubSpot**: evidencia antes que promesa

> **Reescrito desde cero el 2026-07-13.** No es un delta: la tesis cambió de eje.
> Fuente: **[PDR-006](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)
> reescrito** + skill `hubspot-solutions-partner` + auditoría de la página viva (REST + Playwright).
>
> 🔴 **URL: `/servicios/hubspot/`** — **301 desde `/servicios-contratar-hubspot/`**
> ([PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md)). La URL vieja tiene
> **0 rankings y 0 backlinks** (medido): la migración **no cuesta nada**.
> Es el **pillar** de un hub de 5 páginas; los 4 clusters son **TASK-1401** (`/precios/`), **TASK-1402**
> (`/cuando-no-usar-hubspot/`), **TASK-1403** (`/agentes/`), **TASK-1404** (`/hubspot-vs-salesforce/`).
> **SSOT de contenido:** [`HUBSPOT_HUB_LANDINGS_SPEC.md`](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md).

## Meta

- Status: `draft`
- Owner task: `TASK-1352`
- **Product Design asset:** ✅ **desbloqueado.** La sección firma **ya no es el "stack agéntico" abstracto**
  (cuya dirección de arte bloqueaba `UI ready`), sino **el mapa dolor → Hub** (R3): un artefacto **funcional**,
  no ilustrativo. Se art-dirige con el sistema de marca, sin generación de assets abstractos.
- Intended consumers: sitio público (WordPress/Ohio, marketing lane `modern-ui`). **NO** el portal Greenhouse.
- Copy source: contenido de página pública (**NO** `src/lib/copy`), validado con `greenhouse-ux-writing` +
  `docs/context/05_voz-tono-estilo.md`. **es-LATAM neutro, tuteo, sin voseo ni chilenismos** (pan-hispano).
- Primitive decision: `reuse` — patrones marketing `modern-ui` + `<greenhouse-form>` embebido.
- UI ready target: `yes` una vez cerrado el copy final (ya no hay bloqueo de art direction).

## Brief

- **Primary user:** quien decide o influye la compra de HubSpot en una empresa mid-market/enterprise hispana.
  🔴 **NO es solo el CMO** — son **siete perfiles con siete dolores distintos** (R3).
- **User moment:** *"todos los partners suenan igual"* + *"cambiar de CRM da miedo, y si sale mal me hacen
  responsable a mí"*. Llega por co-sell del PDM, Solutions Directory, directo/marca, outbound o cross-sell.
- **Job to be done:** **decidir sin miedo.** Entender si HubSpot le sirve — *y si no le sirve, saberlo antes de gastar*.
- **Primary decision signal:** 🎯 **que le regalen la evidencia antes de cobrarle.** El diagnóstico gratis (R4),
  la lista de cuándo HubSpot **NO** le sirve (R5) y el número del waiver (R6). **Esos tres — no el software.**
- **Fricción que reduce:** el **miedo a elegir mal** (JOLT) y el *"todos prometen lo mismo"*.
- **Non-goals:** no es pricing; no es self-serve; no reconstruye el form ni el agendador; no expone el portal.

## 🔴 Reglas duras del contenido (de PDR-006)

1. **Vende la plataforma completa** — Smart CRM + los 6 Hubs + Breeze. **NUNCA se estrecha a un Hub.**
   Una página que orbita AEO **es una landing de AEO con logo de HubSpot**.
2. **Ningún claim que HubSpot no haga:** ❌ *"Líder en CRM según Gartner"* (es **Niche Player** en el MQ de
   *Sales Force Automation*) · ❌ Forrester Wave · ❌ **ISO 27001** (HubSpot no la reclama; solo su infra AWS) ·
   ❌ residencia de datos en LATAM · ❌ *"flota de agentes de IA"* (**solo 3 Breeze Agents en GA**).
   ✅ Sí: **"Leader en B2B Marketing Automation (Gartner, 5.º año)"** · **SOC 2 Type II + SOC 3**.
3. **"HubSpot Solutions Partner Gold"** ✅ es cierto — 🔴 **revisar el 2027-01-15** (si baja de tier, sale).
4. **Kortex: describir el mecanismo, NUNCA implicar escala** (n=1).
5. **Nomenclatura 2026:** **Revenue Hub** (ex-Commerce) · **Data Hub** (ex-Operations) · **UNBOUND** (ex-INBOUND).
6. **Casos:** métrica verificable + relación en buenos términos + autorización. **SSilva solo anonimizado**
   ("una inmobiliaria del Cono Sur"); **nunca con nombre ni testimonio firmado**. Berel **no** como co-sell.
7. 🔴 **Todo número citable va en el HTML servido** — los contadores JS renderizan `00 %` y **los crawlers de
   IA no ejecutan JavaScript**.
8. **Auditar todos los `href` antes de mutar** — la página viva tiene *"Más testimonios"* → `themeforest.net`.

---

## Layout Skeleton

| R | Slot | Propósito | Componente | Fuente |
|---|---|---|---|---|
| **0** | Header | Nav Ohio nativo (claro, sin override, sin sticky custom) | Ohio native header | Tema |
| **1** | **Hero — la postura** | 🎯 *"Antes de venderte HubSpot, te mostramos si te sirve."* El reencuadre Challenger + CTA dual + proof row (Solutions Partner **Gold** · Kortex en el Marketplace) | `modern-ui` hero | Estático |
| **2** | Stakes | **Por qué decidir mal ahora cuesta más caro.** HubSpot dejó de ser un CRM: incorpora agentes que ejecutan trabajo. Y ⚠️ **el 38% de los fracasos de CRM son por adopción**, no por tecnología | Two-card contrast band | Estático |
| **3** | 🎯 **EL MAPA: dolor → Hub** *(SIGNATURE)* | **La región que hace que esto sea una landing de HubSpot y no de AEO.** Siete dolores **en el lenguaje del comprador** → el Hub que lo resuelve. **Interactivo:** eliges tu dolor, se revela la respuesta. Es un **mini-diagnóstico**, no una lista de features | Sección firma page-scoped (CSS/JS ligero, **progressive enhancement**) | PDR-006 §2 |
| **4** | **La prueba gratis** | Las **dos puertas**: *¿ya tienes HubSpot?* → **Portal Grader** · *¿no te encuentran?* → **AI Visibility Grader**. Gratis, sin reunión. Y para los otros dolores: **la reunión — donde lo primero es decirte si NO te sirve** | Two-door band + `<greenhouse-form>` | PDR-006 §3 |
| **5** | 🎯 **Cuándo HubSpot NO es para ti** | **El movimiento que nadie hace.** RevOps decide por **miedo a migrar dos veces**: el que dice el límite **antes** se gana el deal. Límites documentados: **10 custom objects · 1 sandbox (200K registros; sync inicial de 5.000 contactos) · sin residencia de datos en LATAM · sin jerarquía de roles ni territory management** | Honest-limits band (texto, sin adorno) | `hubspot-solutions-partner/modules/10` |
| **6** | 🎯 **El waiver del onboarding** | **El número.** HubSpot cobra un onboarding **obligatorio**; un partner **certificado** lo entrega en su lugar y **el cargo desaparece del contrato**. En Marketing Hub Pro: **USD 3.000 de USD 9.600 = 31% del año 1**. Y el suyo es *coaching*; el nuestro es *implementación*. **El HubSpot directo no puede igualarlo** | Offer band — cifra en **texto servido**, no contador JS | PDR-006 §1 |
| **7** | Las 4 capas | Qué hacemos, como recorrido: **Licencia → Implementación → Operación continua → Inteligencia**. Flywheel, no menú | Feature grid / stepper | `02_gtm.md:45-54` |
| **8** | Cómo lo hacemos **sin romperte nada** | 🔵 **Aquí entra Kortex — antídoto del miedo, no héroe.** *"No configuramos a mano: desplegamos con configuración versionada, trazable y reversible. Si mañana nos cambias, te llevas la configuración documentada — no un misterio."* 🔴 **Mecanismo, nunca escala** | Mechanism band | PDR-006 §6 |
| **9** | Prueba | **Solutions Partner Gold** + **Kortex publicado en el HubSpot Marketplace** (link) + casos citables **de CRM** (regla 6) | Proof shell + ledger | Casos reales + listing |
| **10** | Puente / cross-sell | Servicios hermanos (**AEO ↔ bidireccional**, SEO, Agencia Creativa, desarrollo) + pillar CRM en Think | Card-on-section links | Estático |
| **11** | FAQ | Objeciones reales: migración · gobierno de agentes · **"¿qué tier son?" → Gold** · **"¿tengo que pagar el onboarding?" → no, si trabajas con nosotros** · tiempos y costo · integraciones · **"¿y si me quiero ir?"** | `<details>/<summary>` | Objeciones de venta |
| **12** | CTA final + diagnóstico | **"Agenda una reunión"** (HubSpot Meetings + UTM) + la puerta de diagnóstico que corresponda | CTA band + `<greenhouse-form>` | Growth Forms (reuso) |

> 🎯 **El arco emocional de la página:** te digo **qué te duele** (R3) → te lo **pruebo gratis** (R4) → te digo
> **cuándo NO comprarme** (R5) → te **quito USD 3.000** del costo (R6) → te digo **qué hago** (R7) → y **cómo,
> sin encerrarte** (R8).
> **Cada región le quita un poco de riesgo al comprador. Esa es la página.**

---

## Copy Ledger

> Dirección, no copy final — lo pule `greenhouse-ux-writing` sobre `docs/context/05_voz-tono-estilo.md`.
> Ids de documentación (sitio público, **no** `src/lib/copy`). es-LATAM neutro, tuteo, sin voseo.
> **Sujeto a las 8 reglas duras de arriba.**

| Copy id | R | Texto | Notas |
|---|---|---|---|
| `hubspot.hero.h1` | 1 | **"Antes de venderte HubSpot, te mostramos si te sirve."** | La postura. **No** lidera con "somos partner" ni con features |
| `hubspot.hero.sub` | 1 | "Todos los partners te van a prometer que HubSpot va a funcionar. Nosotros te vamos a mostrar, con evidencia y sin cobrarte, si te sirve o no. **Y si no te sirve, también te lo decimos.**" | Reencuadre Challenger, registro sobrio |
| `hubspot.hero.cta_1` | 1 | "Agenda una reunión" | → HubSpot Meetings + UTM |
| `hubspot.hero.cta_2` | 1 | "Ver mi diagnóstico gratis" | → ancla `#diagnostico` |
| `hubspot.hero.proof` | 1 | "HubSpot Solutions Partner **Gold** · Kortex, nuestra app en el HubSpot Marketplace" | ✅ El tier es afirmable. 🔴 Revisar 2027-01-15 |
| `hubspot.stakes.title` | 2 | "HubSpot dejó de ser un CRM. Y decidir mal ahora cuesta más caro." | Stakes, **no** propuesta de valor |
| 🎯 `hubspot.mapa.title` | **3** | **"¿Qué te duele?"** | **La región que sostiene la plataforma completa.** El título es el **dolor**, nunca el nombre del Hub |
| `hubspot.mapa.items` | 3 | Los **siete dolores** de PDR-006 §2, en el lenguaje del comprador → el Hub como **respuesta**: Sales · Marketing+Sales · Marketing+Content · Service · Data · Revenue · Breeze | 🔴 Los 7, completos, **en el HTML servido** |
| 🎯 `hubspot.prueba.title` | 4 | **"Te lo probamos gratis."** | Las dos puertas |
| 🎯 `hubspot.limites.title` | **5** | **"Cuándo HubSpot *no* es para ti."** | **El movimiento que nadie hace** |
| `hubspot.limites.body` | 5 | "Si modelas más de diez entidades propias, si necesitas un sandbox espejo de producción para tu gobierno de cambios, o si tu marco regulatorio exige que los datos vivan en tu país: **HubSpot no te da el ancho** — y preferimos decírtelo ahora, no en el mes ocho." | Límites **documentados**, no opinión |
| 🎯 `hubspot.waiver.title` | **6** | **"El onboarding obligatorio de HubSpot, te lo ahorras."** | **El número** |
| `hubspot.waiver.body` | 6 | "HubSpot cobra un onboarding obligatorio —**USD 3.000** en Marketing Hub Professional— y es **coaching**: te enseñan a configurarlo y lo configuras tú. Como Solutions Partner **certificado**, ese cargo **desaparece de tu contrato**: la implementación la hacemos nosotros. Y no te enseñamos a armarlo — **te lo construimos**." | 🔴 Cifra en **HTML servido**. **Reverificar el fee el día de publicación** |
| `hubspot.kortex.title` | 8 | "Lo desplegamos como software. Y es reversible." | 🔴 **Mecanismo, NUNCA escala** |
| `hubspot.kortex.body` | 8 | "No configuramos a mano: definimos tu operación como configuración versionada y la desplegamos con trazabilidad. Cada cambio queda registrado y se puede deshacer. **Si mañana nos cambias, te llevas la configuración documentada — no un misterio.**" | El antídoto del miedo |
| `hubspot.faq.tier` | 11 | "¿Qué tier de partner son?" → **"Gold."** | ✅ Ya se responde |
| `hubspot.faq.onboarding` | 11 | "¿Tengo que pagar el onboarding de HubSpot?" → "No, si trabajas con nosotros." | Refuerza R6 |
| `hubspot.faq.salida` | 11 | "¿Y si un día quiero irme?" → "Te llevas tu configuración documentada y versionada." | JOLT: mata el miedo al lock-in |
| `hubspot.cta_final.title` | 12 | "Empieza por saber si te sirve." | Cierre coherente con la postura |

## State Copy

| Estado | Comportamiento |
|---|---|
| ready | Página renderizada; el **mapa (R3)** interactivo; CTAs activos |
| loading | Sin loading de página (estático). El form tiene el suyo (renderer) |
| 🔴 **sin JS** | **El mapa (R3) funciona sin JavaScript** — progressive enhancement: se ve como **lista completa** de los 7 dolores + su Hub. **Los crawlers de IA deben poder leerlo entero** |
| partial (form) | El embed no carga (CORS) → **fallback link** a agendamiento/mailto con UTM. **El CTA nunca muere** |
| error | Error del form → Success/Error Card del renderer (TASK-1320) |
| reduced-motion | El mapa se muestra **expandido y estático**; sin reveals |

## Accessibility Contract

- Un solo `<h1>` (R1). `<h2>` por región. `<h3>` para los 7 dolores y los ítems de FAQ.
- 🔴 **El mapa (R3) es semántico**: lista de pares dolor→Hub navegable por teclado, **no un widget opaco**.
  Sin JS, **todo el contenido visible**. Con JS, se puede colapsar/revelar.
- Los límites (R5) son **texto semántico**, no imagen.
- Focus ring AA en CTAs, `<summary>` y campos del form. Contraste AA en hero y bandas oscuras.
- Estados del form con **texto + ícono**, no solo color.

## Implementation Mapping

- Route: `efeoncepro.com/servicios-contratar-hubspot/` — **reposición in-place** de la id `244079`
  (`template default`, header nativo, **sin** `elementor_canvas`, misma URL/canonical).
- Primitives: patrones marketing `modern-ui` (**no** el Design System del portal) + `<greenhouse-form>`.
- Componentes: secciones Elementor/Ohio (evolucionar el Partner Proof Module) + CSS page-scoped +
  **el mapa (R3)** page-scoped + el form embebido.
- Data/command: **ninguno nuevo.** Reusa el submit gobernado de Growth Forms + HubSpot Meetings.
  **Full API Parity por reuso** — la landing es cliente. `efeonce-hubspot-portal-audit` = config de form
  instance del contrato existente; HubSpot delivery `disabled` hasta cutover.
- GVC markers: `hero`, `stakes`, **`mapa`**, `prueba`, **`limites`**, **`waiver`**, `capas`, `kortex`,
  `proof`, `puente`, `faq`, `cta-final`, `diagnostico`.

## GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/public-servicios-contratar-hubspot.capture.txt` `[crear]`
- Viewports: **1440 + 390**. Route: preview de WordPress.
- Pasos: **before-capture** (versión previa) → cargar → scroll por regiones → **interactuar con el mapa (R3)**
  → abrir 1 FAQ → click "Ver mi diagnóstico" → scroll + focus al form.
- Capturas: full-page desktop+mobile · frame por región · **el mapa en 2+ estados** · FAQ abierto ·
  form montado · **reduced-motion** · **before/after**.
- **Assertions:**
  - Sin scroll horizontal (1440 y 390). Un solo `<h1>`. Canonical preservado.
  - 🔴 **Citabilidad sin JS:** `fetch` **sin ejecutar JavaScript** → **los 7 dolores del mapa (R3), la cifra
    del waiver (R6) y los límites (R5) aparecen en el HTML servido.** *(Los contadores Ohio renderizan `00 %`
    sin JS; los crawlers de IA no lo ejecutan.)*
  - 🔴 **Sin leftovers del template:** ningún `href` sale del dominio salvo los intencionales (HubSpot
    Meetings, listing de Kortex). *(La página viva tiene "Más testimonios" → `themeforest.net`.)*
  - 🔴 **Ningún claim prohibido en el DOM:** `grep` de `ISO 27001` · `Forrester` · `Líder en CRM` ·
    `Commerce Hub` · `Operations Hub` · `INBOUND`.
  - El mapa (R3) se despliega en default y queda **expandido/estático** bajo `prefers-reduced-motion`.

## Design Decision Log

- **Decisión:** landing de **la plataforma HubSpot completa**, posicionada en **"evidencia antes que promesa"**
  (PDR-006 reescrito). Arco: dolor → prueba gratis → descalificación honesta → waiver → qué hacemos → cómo, sin
  encerrarte. Sección firma = **el mapa dolor→Hub**.
- **Alternativas descartadas:**
  - *Liderar con Kortex / "RevOps programático"* (tesis v1) — **n=1**; afirma una escala inexistente y **pelea
    contra JOLT** (software propietario = miedo al lock-in).
  - *Sección firma = "stack agéntico" abstracto* — ilustrativa, no funcional; su art direction **bloqueaba
    `UI ready`**; y no vendía la plataforma. **El mapa hace el mismo show-don't-tell y además sirve.**
  - *Orbitar AEO* — estrecha la página a Marketing y **pierde seis de los siete compradores**.
  - *Liderar con "Somos Solutions Partner"* — commodity, y **Gold no gana contra los Elite** de la región.
  - *Catálogo de agentes Breeze* — es la historia de HubSpot; **solo 3 en GA**; pricing volátil.
- **Por qué este patrón:** `modern-ui` marketing lane + **Challenger** (reencuadre) + **Command of the Message**
  (dolor → capacidad → outcome, nunca features) + **JOLT** (el miedo a elegir mal se combate **quitando
  riesgo**, no prometiendo más).
- **Reuse / new:** reuse (marketing + Growth Forms + HubSpot Meetings). Única pieza nueva: **el mapa (R3)**,
  page-scoped, progressive-enhancement.
- **Open risks:** CORS del form para `/servicios-contratar-hubspot/*` (probable gap vs `/servicios/*`) ·
  URL del listing de Kortex en el Marketplace · **casos de CRM citables (hoy cero)** · reverificar el
  onboarding fee y el estado de Breeze el día de publicación.

## Acceptance Checklist

- [ ] Todo string visible está en el copy ledger y validado con `greenhouse-ux-writing`.
- [ ] 🔴 **La página vende la plataforma completa** — el mapa (R3) cubre los **7 dolores**. **No orbita AEO.**
- [ ] 🔴 **Ningún claim prohibido** (ISO 27001 · "Líder en CRM según Gartner" · Forrester · residencia LATAM ·
      flota de agentes). ✅ Sí *"Leader en B2B Marketing Automation (Gartner, 5.º año)"*.
- [ ] 🔴 **Nomenclatura 2026** (Revenue Hub · Data Hub · UNBOUND).
- [ ] **Las regiones 5 (límites) y 6 (waiver) existen** y están arriba del pliegue de decisión.
- [ ] 🔴 **Kortex describe el mecanismo y NO implica escala.**
- [ ] 🔴 **Citabilidad sin JS** verificada (mapa + waiver + límites en el HTML servido).
- [ ] Casos: métrica verificable + relación en buenos términos + autorización. **SSilva solo anonimizado.**
- [ ] Sin leftovers del template (`themeforest.net` u otros `href` foráneos).
- [ ] GVC 1440 + 390 + reduced-motion + before/after capturado **y mirado**. Sin scroll horizontal.
- [ ] URL/canonical preservados (reposición in-place, sin 301). Snapshot antes de mutar.
