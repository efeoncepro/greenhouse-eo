---
name: efeonce-agency
description: Contexto de negocio, marca, GTM y modelo ASaaS de Efeonce Group (la agencia) para que toda feature/decisión de Greenhouse apunte en la dirección del negocio. Invocar ANTES de proponer, priorizar o construir cualquier cosa que toque producto, UX/copy visible, naming, métricas, ICO, HubSpot/Account 360, onboarding/experiencia de cliente, GTM, marca, switching cost, tiers/ASaaS o estrategia comercial. Triggers léxicos — Efeonce, agencia, North Star, switching cost, Revenue Enabled, ASaaS, ICO, Loop Marketing, GTM, ICP, buyer persona, JTBD, Kortex, Verk, Creative Studio, Nexa, Pulse, Bow-tie, NRR, cross-sell, "vale la pena esta feature", "a qué tier pertenece", voz/tono, glosario de métricas, RpA/OTD/FTR naming, casos (Sky/Bresler/Berel/SSilva), Globe/Reach/Wave, marca/branding del portal.
---

# Efeonce Agency — Contexto de negocio para construir Greenhouse

> **Ecosistema digital Efeonce — layering canónico** (SSOT: `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`; índice `docs/public-site/`). Dos ejes ortogonales: **superficies** front-of-house (por audiencia/etapa de funnel — **adquisición** como continuo bow-tie: `Think` = demand-gen + nurturing top-of-funnel [blog *Marketing con Manzanitas* → *Glitch* newsletter semanal IA/Marketing/Negocios + tools *AI Visibility Grader*/ebooks/webinars/podcast + YouTube/social] · sitio `efeoncepro.com` = demand-capture + conversión; **experiencia** con dos caras: cliente [sky → `experiencia.efeoncepro.com` + Experiencia Efeonce: aprendizaje, networking, contenido, tools, comunidad y memoria] y operador [cockpit Greenhouse]) que consumen **plataformas/backbones** (runtime Greenhouse PG+BQ/360, **Kortex** = CRM peer system + producto, Verk, **Efeonce Creative Studio** = producción creativa agentic peer con UI + MCP). El grader es la costura top→bottom. Cargar PDR-003 al razonar sobre superficies, capas, hosts o dónde nace una capacidad del ecosistema.

Esta skill es el **router + doctrina destilada** del context pack de negocio de Efeonce Group. Su trabajo: que cualquier agente (Claude o Codex) entienda *para qué existe Greenhouse en el negocio* antes de tocar producto, copy, métricas o estrategia, y sepa **qué archivo canónico leer** según la tarea.

**Fuente de verdad = `docs/context/` (archivos `00`–`14`).** Esta skill NO los reemplaza: los resume y enruta. Ante cualquier conflicto, mandan los docs `docs/context/*` y, sobre arquitectura/runtime/contratos, manda el contrato técnico verificado (regla del `CLAUDE.md`). Empezar siempre por `docs/context/00_INDEX.md`.

---

## Cuándo invocar (y cuándo no)

**Invocar antes de:** proponer o priorizar una feature; decidir si algo "vale la pena"; escribir copy visible al cliente; nombrar una métrica/propiedad/KPI/columna; tocar ICO/dashboards/bonos; tocar HubSpot/Account 360/lifecycle/Pulse; diseñar onboarding o experiencia de cliente; razonar tiers/ASaaS/switching cost; argumentar prioridad comercial; cuidar marca/branding del portal.

**NO invocar para:** plumbing puramente técnico sin razonamiento de negocio (qué endpoint usa una vista → `greenhouse-backend`; ajustar un chart Apex → `greenhouse-ux`; cálculo de nómina → `greenhouse-payroll-auditor`). Si la tarea mezcla negocio + técnico, invocar esta **y** la técnica.

**Sinergia:** para venta/pricing/pipeline profundo → `commercial-expert` (esta da el frame; esa da el playbook). Para copy es-CL → `greenhouse-ux-writing`. Para HubSpot bridge → `hubspot-greenhouse-bridge`. Para bonos/ICO runtime → `greenhouse-ico` / `greenhouse-payroll-auditor`.

---

## El North Star (lo único que no se negocia al priorizar)

Greenhouse existe para **tres ejes**. Si una feature no mueve al menos uno, no es prioridad —por buena que se vea la demo. Es la pieza del modelo ASaaS que genera *switching cost*: **construimos memoria, no pantallas.**

1. **Switching cost sistémico** — cada mes de operación registrada debe subir el costo real de irse (historial ICO, inteligencia financiera, Account/Person 360, métricas acumuladas). Una feature sin rastro acumulable es débil.
2. **Transparencia operativa radical** — el cliente ve su operación en vivo (qué pasa, cuándo, dónde está el cuello de botella). Sin cajas negras, sin "te mando el reporte el viernes". Si una feature esconde la operación, va contra la marca.
3. **Revenue Enabled** — todo dato debe poder conectarse con impacto de negocio (pipeline, revenue, NRR), no con vanity metrics. Medimos lo que defiende presupuesto, no lo que decora un slide.

> Detalle: `docs/context/00_INDEX.md` (North Star) + `14_modelo-negocio-asaas.md` (por qué económico).

---

## El Why de Efeonce (Golden Circle)

Antes del North Star de producto está el **Why de marca** — la creencia de la que cuelga todo (Home, About Us, cómo opera Greenhouse). Comunicación inside-out (Sinek): **Why → How → What**, nunca al revés.

**No te entregamos crecimiento. Lo construimos contigo —y te dejamos más capaz de sostenerlo.**

El crecimiento no se entrega: se **co-construye**. Tres pilares (una creencia):
- **Co-creación** — el cliente opera con nosotros en vivo, no recibe entregables.
- **Educación** — lo hacemos más capaz, no dependiente; y un cliente más capaz da mejores briefs → BCS↑→FTR↑→RpA↓, así **educar mejora el trabajo** (no es caridad).
- **Integralidad** — el crecimiento nace de la relación que compone ciclo a ciclo, no del número aislado (los números son resultado, no origen).

- **How (lo que lo prueba):** un solo cerebro (capabilities integradas) · transparencia como piso (login, no PDF) · método (Loop + ICO) · medición honesta (Revenue Enabled) · software propio (Greenhouse/Kortex/Verk/Creative Studio) · educación como sistema (Think) · **Experiencia Efeonce** como entrada del cliente a un ecosistema de crecimiento, aprendizaje, networking y memoria.
- **Regla dura anti-humo:** "co-creación/integralidad/partner" son palabras de agencia commodity si van solas. **Nunca el Why sin su mecanismo** (el login, el grader, el número, el ciclo).
- **Reconciliación ASaaS:** el switching cost se gana haciendo al cliente **más capaz + guardándole su historial** (capacidad + memoria), NO por dependencia/opacidad.

> **SSOT:** `docs/context/09_marca-agencia.md` → §El Golden Circle de Efeonce. Este es el destilado; ahí el detalle completo.

**El Why como VISIÓN DE PRODUCTO (la frontera a alcanzar).** El Why no es solo copy de marca: es el **norte del producto Greenhouse**. Hoy el producto cumple bien la cara de *ver* (transparencia ~90%), pero las caras de **co-crear** (el cliente *actúa*: aprueba/pide/brifea — hoy el portal cliente es casi todo `.read`, gap #1 self-service ~55%; la aprobación de entregables aún vive fuera, en Frame.io/Notion/email) y **educar** (hacer al cliente *más capaz*: Nexa Insights cerrado al tenant externo, Nexa como Q&A con flags coach default-OFF, cero señal de capacidad longitudinal del cliente) están **sin construir para el cliente**. Cerrarlas = que el Why se **viva**, no solo se declare. **Al priorizar features, esta es la dirección de producto:** acercar al cliente a *actuar* y *volverse más capaz* dentro del portal, no solo a mirar. Programa: **[EPIC-025](./././docs/epics/to-do/EPIC-025-vivir-el-why-cocreacion-educacion-cliente.md)** — epic de *extensión* (reusa la plantilla del AEO run gobernado TASK-1277 + Nexa Insights; Full API Parity), no de invención.

**El Why como DIFERENCIADOR DE MERCADO GLOBAL.** La ambición es **LATAM-first, no LATAM-limited**: construir una agencia grande y reconocida en toda Latinoamérica desde el inicio, preparada para servir EEUU hispano, mercados en inglés y otros mercados internacionales. El diferencial defendible no es "co-creación" como claim ni "AI agency" como moda; es **co-creación convertida en software, método, datos y memoria acumulada**. Categoría: **Growth Operating System / ASaaS**. Frase interna: *Efeonce es un sistema operativo de crecimiento: estrategia, creatividad, medios, datos y software propio trabajando como una sola operación.* En inglés: *Efeonce is a Growth Operating System for ambitious brands: strategy, creative, media, data and proprietary software working as one system.* Decisión pública: `docs/public-site/decisions/PDR-012-growth-operating-system-global-positioning.md`.

**El Why como CULTURA OPERATIVA.** El contrato interno vive en `docs/operations/EFEONCE_OPERATING_CODE_V1.md`: en Efeonce se valora a quien deja al cliente más capaz, deja el sistema con más memoria y conecta su trabajo con crecimiento real. Usarlo para hiring, onboarding, performance reviews, rituales de proyecto y coaching de equipo. People/Talent aplica el detalle con `greenhouse-talent-people-operator`.

**El Why como EXPERIENCIA EFECTIVA DEL CLIENTE.** La **Experiencia Efeonce** significa que el cliente no contrató solo una agencia: contrató su entrada a un ecosistema de crecimiento. Capas: operación, software, aprendizaje, red y memoria. Canales: Greenhouse/Kortex/Verk/Creative Studio, Think, blog `efeoncepro.com/blog`, tools, YouTube, sociales, ebooks, webinars y futuro podcast. Greenhouse no reemplaza todos esos canales: los conecta, los hace visibles y convierte interacciones útiles en memoria de Account 360 / madurez / expansión. SSOT: `docs/context/10_experiencia-cliente.md`.

**Primer wrapper vivo de la Experiencia Efeonce (SKY, 2026-07-13).** `https://experiencia.efeoncepro.com` es el primer **Efeonce Wrapper** cliente-facing: una experiencia anual creada para SKY por su primer año con Efeonce, operada desde el repo satélite `efeoncepro/sky-efeonce` y documentada en `sky-efeonce/docs/experiencia/`. Tratarlo como prueba de dirección para `"Tu año con Efeonce"`, no como automatización ya existente en Greenhouse ni como caso público autorizado sin permiso escrito.

---

## Filtro de decisión para una feature nueva

Antes de construir, poder responder **sí a ≥1 verde** y **no a todas las rojas**:

**Verdes (suma):** ¿sube switching cost (deja historial acumulable)? · ¿hace más visible la operación (self-service, estado en vivo, menos email)? · ¿acerca un dato a la cadena Revenue Enabled? · ¿reduce fricción en un cuello de botella ya medido (RpA alto, OTD% bajo, stuck assets)? · ¿es coherente con el gap declarado del roadmap?

**Rojas (replantea):** ¿es actividad disfrazada de impacto (impresiones, "engagement") sin línea a negocio? · ¿agrega una pantalla que se mira una vez y nunca más? · ¿rompe el aislamiento multi-tenant o asume un solo cliente? · ¿introduce un nombre/sigla que contradice el glosario (`06`)? · ¿esconde algo que la marca promete mostrar?

**Gap declarado = dirección de producto** (donde más aporta hoy, por orden): 1) **Self-service del cliente** (aprobar/solicitar/briefs desde el portal — gap #1) · 2) reactividad cross-module (outbox) · 3) ICO Engine ↔ Person 360 · 4) test coverage en `finance`/`payroll`/`identity` (bloquea exponer a clientes) · 5) exponer inteligencia (financiera + AI Tools/Nexa) al cliente. El hallazgo recalibrado: **el gap grande es exposición + self-service, no tecnología nueva.**

---

## Modelo de Efeonce en una pantalla

- **Efeonce Group** = Growth Operating System: 4 unidades especialistas bajo un estándar común + 4 plataformas de software propietario. Un solo interlocutor (Director de Cuenta), sin pérdida de contexto. Opera en Chile, Colombia, México, Perú (+10 años LATAM), pero la ambición es global-ready: LATAM es prueba de ejecución multi-país, no límite de categoría. En producto se traduce a **multi-tenant + multi-unidad + multi-país + multi-moneda**.
- **Loop Marketing** (sucesor del funnel): ciclo continuo **Express → Tailor → Amplify → Evolve** (+ transversal). Cada ciclo construye sobre el anterior; ningún trimestre empieza de cero.
- **Las 4 unidades = organización interna de operaciones, NO marcas hacia afuera** (al cliente/mercado se lidera con "Efeonce", una sola marca; las unidades se presentan como **capabilities** descritas por su función, nunca como sub-marcas ni proveedores separados): **Efeonce Digital** (núcleo estratégico/digital, orquesta) · **Globe** (creatividad/contenido, Globe Studio) · **Reach** (medios/PR) · **Wave** (infraestructura digital/IDD). 5ª línea transversal: **CRM Solutions** (vive en Kortex). Hoy las capabilities **exceden estas unidades** (software propio Greenhouse/Kortex/Verk/Creative Studio, AEO, data/medición…) y siguen creciendo — el relato externo NO se reduce a "cuatro unidades".
- **ICO — Intelligent Creative Operations**: capa de inteligencia operativa **transversal a las 4 unidades** (no solo Globe; el origen Globe es histórico). Gobernanza por IA + métricas en vivo por pieza + visibilidad total al cliente. 4 dimensiones: **Production · Concept · Outcome · Anticipation**. No se vende suelto: *es la forma en que Efeonce opera.*
- **Ecosistema de producto (4 plataformas independientes; integración por BigQuery autorizado + REST/eventos versionados, no runtimes compartidos):**
 - **Greenhouse** = el hub (lo nuestro): experiencia del cliente + operaciones internas. Genera el switching cost. ~77% madurez ASaaS.
 - **Kortex** = CRM Intelligence sobre HubSpot (manifests YAML, agente Claude). `portal_id → space_id`. Alimenta Account 360.
 - **Verk** = Content + Distribution OS (Surround Map™). `brand_id → greenhouse_space_id`. Embed card en el dashboard.
 - **Efeonce Creative Studio** *(nombre de trabajo)* = producción creativa agentic de imagen/video/audio: la persona trabaja con brief/referencias/candidatos/review y el sistema compila workflows; UI y MCP consumen el mismo contrato. Un solo runtime soporta `efeonce-managed`, `co-operated` y `client-operated` con responsabilidades por run y autonomía según riesgo. Primero interno, luego cliente gobernado; no es una quinta modalidad comercial ni “Managed Squad más barato”. EPIC-028; runtime separado de Greenhouse.
 - Regla: cada plataforma opera sola; **cuando el cliente está en el ecosistema completo, Greenhouse es donde todo converge.** No acoplar Greenhouse al runtime de Kortex/Verk/Creative Studio; consumir sólo contratos/proyecciones autorizadas.
- **ASaaS (Agency Service as a Software)**: el servicio de agencia empaquetado como producto de software. 6 directrices: acceso permanente · datos en vivo · experiencia estandarizada · **valor acumulativo (el historial es feature)** · **switching cost creciente (North Star)** · monetización recurrente (tier pricing Basic/Pro/Enterprise = capability flags por tenant).

> Detalle: `01_quienes-somos` · `03_ecosistema-producto` · `04_greenhouse-producto` · `07_ico` · `14_modelo-negocio-asaas`.

---

## Las dos cadenas causales de ICO (memorizar la dirección)

```
Producción (eficiencia): BCS ↑ → FTR ↑ → RpA ↓ → Cycle Time ↓ → TTM ↓ → Revenue Enabled ↑
Outcome (efectividad): Insight → Concepto → Ejecución → Distribución → Engagement → Outcome cliente → Revenue Enabled ↑
```

Brief más claro → más piezas bien a la primera → menos rondas → ciclo más corto → menor time-to-market → más revenue habilitado. Cada rol recibe un **perfil de pesos sobre las 4 dimensiones** que define su bono variable mensual (alimenta payroll). **Greenhouse materializa hoy:** RpA, OTD%, FTR, Cycle Time, Stuck Assets. El resto (scoring por rol, Outcome/Anticipation, ~16+ siglas) es la dirección de expansión.

> Detalle de siglas, umbrales, pesos por rol y cláusulas de excepción: `06_glosario-metricas.md` §B–§E + `07_ico.md`.

---

## No-negociables de naming y constantes (manda el glosario)

Si un string del producto contradice esto, **el string está mal** (fuente: `06_glosario-metricas.md`).

- **El producto se llama `Greenhouse`. Nunca "Greenhouse EO".** "EO" es solo la abreviatura del repo; no va en UI, docs de cliente ni copy.
- **Marca hacia afuera = Efeonce (masterbrand), una sola marca.** Las unidades **Globe · Efeonce Digital · Reach · Wave** son **solo organización interna de operaciones**: NUNCA se nombran al cliente/mercado como sub-marcas ni proveedores separados. Todo se presenta como **capabilities** de la marca, descritas por su función (beneficio antes que nombre). El set de capabilities hoy es **mayor que las 4 unidades** (Greenhouse + plataformas propias + AEO + data/medición…) y sigue creciendo — el relato externo NO se reduce a "cuatro unidades". Los claims **"Empower your…"** NO son taglines de sub-marca: son la **voz/modo que Efeonce adopta al operar cada capability** — la misma marca se cambia el sombrero. Mapeo sombrero→claim: **diseño/creatividad → "Empower your Brand"** · **estrategia/crecimiento → "Empower your Growth"** · **medios/amplificación → "Empower your Voice"** · **infraestructura/ingeniería → "Empower your Engine"**. A nivel masterbrand, el paraguas es **Empower your Growth**. Aplica a Home, `/agencia`, About Us y todo copy público. (Hereda regla dura de PDR-008 + [PDR-010](./././docs/public-site/decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md).)
- **RpA = Rounds per Asset** (rondas de revisión por entregable; menos es mejor). El dashboard que rotule "Reviews per Asset" está **mal** → alinear a "Rounds per Asset".
- **Nexa** = capa AI de Greenhouse (Nexa Insights + Nexa Chat). **Nunca "Nexus"** (sub-marca deprecada).
- **"Head of Creative"**, nunca "ICO Lead" (aunque los addenda viejos lo rotulen así).
- **AEO = AI Engine Optimization** (no "Answer Engine"). Medición: Otterly.ai.
- **BCS ≠ BQS** (Clarity Score automático vs Quality Score humano): no usarlas como sinónimos en código.
- **Tratamiento "tú"** en todo copy de cliente (el "usted" solo en legales/contratos).
- **Dominios:** Greenhouse → `greenhouse.efeoncepro.com`; agencia → `efeoncepro.com` (`efeonce.com` obsoleto). Leer de env var (`NEXT_PUBLIC_APP_URL`), no hardcodear.
- **Constantes:** Portal HubSpot Efeonce `48713323` · owner Julio `75788512`, Luis (BDR) `86856220` · GCP data lake BigQuery `efeonce-group` · tenant key `space_id` → `company_id` (HubSpot) / `portal_id` (Kortex) / `brand_id` (Verk).

---

## Voz y tono para copy visible (resumen operativo)

El copy es producto: un microcopy genérico rompe la marca tanto como un bug rompe la función. **Antes de escribir cualquier string visible**, pasar por `greenhouse-ux-writing` y por `05_voz-tono-estilo.md`.

- **Suena como:** un director de estrategia que construyó el sistema que opera. Directo, técnico cuando aporta, sin relleno. **No decora. Cada oración tiene un trabajo.**
- **Creencia narrativa nueva:** el cliente no contrata entregables; entra a un ecosistema que lo vuelve más capaz. Esto sostiene Experiencia Efeonce sin volverla claim vacío.
- **Personalidad ampliada:** arquitecto con manos sucias + educador exigente/anfitrión de crecimiento. Enseña sin infantilizar, abre puertas sin sonar aspiracional vacío.
- **No suena como:** consultora Big 4, startup bro ("hacks", "growth"), agencia genérica ("soluciones integrales", "impulsamos tu marca"), gurú de contenido/comunidad, manual corporativo.
- **Patrón mental:** ¿estoy *instruyendo* (UI interna), *demostrando con datos* (UI cliente), *condensando con filo* (marketing), o *enseñando para volver al cliente más capaz* (contenido/comunidad)? Eso define el tono. La voz no cambia; el tono sí.
- **Reglas duras:** toda afirmación de impacto se rastrea a un dato/caso real · datos concretos ("+127% tráfico orgánico", no "mejora significativa") · contraste "no es X, es Y" · nunca superlativos vacíos ("el mejor", "líder", "de clase mundial") · nunca decir "experiencia 360", "ecosistema integral", "comunidad exclusiva", "aprendizaje transformador" o "partner estratégico" sin mecanismo concreto · nunca el motif 🍏🍏🍏 en voz institucional (es marca personal de Julio, no Greenhouse).
- **Calibración:** vacío de proyectos → *"Aún no hay proyectos en este espacio. Cuando se cree el primero, verás aquí su RpA y OTD% en vivo."* · error de sync → *"No pudimos sincronizar con HubSpot. Reintentamos en 10 min; tus datos no se perdieron."*

---

## GTM, comercial y experiencia (lo que el producto habilita o bloquea)

- **Dos motores (70/30):** Expansión de cuentas (70%, win rate ~50%, **Greenhouse genera el switching cost y el Pulse detecta cross-sell**) vs New business filtrado (30%, scorecard 4+/6). *Efeonce no necesita más deals; necesita deals con derecho estructural a ganar.* Flywheel: licitación privada ganada → cuenta ancla → expansión por trato directo (modelo Sky).
- **El KPI de producto más concreto del 2026:** "% clientes con login Greenhouse activo: **0% → 100%**". Toda fricción de onboarding/login que reduzcas mueve esta aguja. Lo bloquean: test coverage (finance/payroll/identity), tenant demo con datos simulados realistas, dominio+SSL.
- **Demo por buyer persona:** CEO/CFO (BP3) → **Greenhouse** (sistema completo); CMO/Head Contenido → Verk; Head CRM → Kortex. **El CEO decide por Greenhouse**, así que el portal debe verse como un sistema serio y vivo, **no como un MVP** (sube la vara de pulido).
- **Usuarios primarios del portal:** BP1 (CMO/revenue), BP2 (Dir. Digital/Growth), BP5 (Data Lead), BP6 (Brand Manager/Dir. Arte). El dashboard debe responder *su* pregunta en 10 segundos.
- **Pulse Dashboard** = motor de detección de cross-sell (Motor 1). Construirlo/mejorarlo es de las features de mayor leverage comercial.
- **Bow-tie / HubSpot:** sync a nivel **empresa** (`company_id ↔ space_id`). El motion (`is_in_expansion`, `is_in_renewal`, `is_at_risk`, `is_advocate`) se modela como **booleanos sobre el lifecycle stage**, NUNCA como stage que reemplace `active_account`. NRR >110% es la métrica reina. **No inventar stages ni properties** — usar los internal names exactos de `11`.
- **Experiencia = sistema, no portal de métricas.** Artefactos de producto con peso de marca directo: **Ecosystem Tour** (primer login guiado, el "wow" = ver sus métricas ICO) · **Feedback Review en vivo** (dentro del portal, no PPT) · **Ecosystem Learning Layer** (contenido/tools/webinars/podcast/social conectados al journey) · **"Tu año con Efeonce"** (reporte de renovación autogenerado = máximo switching cost) · **Protocolo de transparencia con datos** (en tensión, mostrar Stuck Assets/Cycle Time/OTD% caído).
- **Posicionamiento público de la capability creativa (Globe):** partner de **producción que escala** el output de equipos de marketing/creativos in-house mid-market/enterprise (no reemplazo, sin perder control) + **Time-to-Market medible** como ventaja competitiva (output de la cadena de eficiencia ICO: FTR guardrail → RpA↓ → ciclo↓ → TTM↓ → Revenue Enabled; "producir más rápido sin perder calidad, probado con el número") + ejecución **Design Engineer** (arte+color+ingeniería, assets con el stack IA propio). Lidera Efeonce; CTA "Agenda una reunión". Decisión canónica: **[PDR-004](./././docs/public-site/decisions/PDR-004-landing-agencia-creativa-posicionamiento.md)** (ejecución `TASK-1350`). Sustrato en `07_ico` (TTM) · `13` (Globe ICP1/ICP3) · `09_marca-agencia`.

> Detalle: `02_gtm` · `08_estrategia-comercial` · `09_marca-agencia` · `10_experiencia-cliente` · `11_hubspot-bowtie` · `13_icp-buyer-personas-jtbd`.

---

## Router de carga selectiva (qué `docs/context/*` leer)

| Si vas a.. | Lee |
|---|---|
| Decidir si una feature vale la pena / priorizar | `00_INDEX` + `02_gtm` + `08_estrategia-comercial` + `13_icp-buyer-personas-jtbd` + `14_modelo-negocio-asaas` |
| Tocar UX copy, microcopy, vacíos, errores, emails | `05_voz-tono-estilo` + `09_marca-agencia` (y la skill `greenhouse-ux-writing`) |
| Nombrar una métrica, propiedad, columna o KPI | `06_glosario-metricas` |
| Entender el sistema de medición (ICO Engine, bonos, dashboards) | `07_ico` + `06_glosario-metricas` |
| Trabajar un módulo de Greenhouse | `04_greenhouse-producto` |
| Entender cómo Greenhouse conversa con Kortex/Verk/Creative Studio/HubSpot | `03_ecosistema-producto` |
| Priorizar features con justificación comercial (cuentas, cross-sell, Pulse) | `08_estrategia-comercial` |
| Cuidar marca/branding en el portal (Ecosystem Tour, onboarding, naming) | `09_marca-agencia` |
| Diseñar la experiencia/onboarding del cliente | `10_experiencia-cliente` |
| Tocar sync HubSpot, Account 360, lifecycle stages o properties | `11_hubspot-bowtie` |
| Definir ICP, buyer persona, JTBD o prioridad por job del cliente | `13_icp-buyer-personas-jtbd` |
| Evaluar ASaaS, tiers, switching cost, self-service o monetización | `14_modelo-negocio-asaas` |
| Entender competencia, benchmark de industria (Barómetro La Vulca), quiénes son los competidores en Chile y el baseline para mejorar la agencia | `15_panorama-competitivo-benchmark-industria` |

---

## Cómo usar esta skill en una respuesta

1. **Enmarca antes de actuar.** Si la tarea toca producto/copy/métricas/estrategia, declara brevemente a qué eje del North Star sirve y a qué buyer persona/tier apunta. Si no sirve a ninguno, dilo (puede no ser prioridad).
2. **Carga selectiva.** Lee solo el/los `docs/context/*` que el router indica; no recites el pack entero.
3. **Verifica naming contra `06`** cuando introduzcas cualquier string/sigla/nombre.
4. **Respeta el contrato técnico.** Esta skill alinea el negocio; no reemplaza arquitectura vigente, `DESIGN.md`, runtime real ni contratos de datos. Si hay drift entre el pack y el runtime verificado, **prevalece el contrato técnico** y se documenta.
5. **Multi-tenant siempre.** Nunca asumas un solo cliente; los tiers son capability flags; exponer datos de un tenant a otro rompe la promesa central del modelo.

---

*Fuente: `docs/context/` (00–14), context pack de Efeonce Group v5.3 / GTM 2026 / Product Ecosystem v1.0. Propiedad intelectual de Efeonce Group SpA — uso interno. Esta skill es un índice destilado; ante conflicto manda el doc canónico y, sobre runtime, el contrato técnico verificado.*
