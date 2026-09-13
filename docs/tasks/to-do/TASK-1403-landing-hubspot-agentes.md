# TASK-1403 — Landing del servicio de agentes de IA en HubSpot: diseño, construcción, despliegue y operación

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-13 — reenfoque a landing de servicio y ANAM activo

- **Reenfoque (operador):** la página ya no es sólo «cuáles agentes funcionan de verdad». Es la **landing del
  servicio de agentes** de Efeonce sobre HubSpot: evaluación, diseño, construcción, despliegue y operación
  gestionada, alineada con la familia *Agent Hub & Agentic Operations* de la
  [oferta V2](../../services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md). La honestidad sobre estado,
  costo y límites se conserva como prueba del servicio. Spec del hub §3 y PDR-013 quedaron actualizados.
- **ANAM:** el operador confirmó que el Customer Agent está **activo y en producción**. El registro de aprobación
  del 2026-07-17 describía el corte anterior (vista previa, sin conversaciones nuevas) y quedó corregido. El
  **artículo publicado** del caso todavía dice «no operativo»; actualizarlo requiere autorización del operador.
- **Cifra fija retirada:** «tres agentes en GA de doce» ya no se publica. El inventario va fechado por caso de uso
  (módulo 13 §2 de la skill, corte 2026-08-30).
- **Contratos UI superados:** wireframe, flow y motion describen la página anterior y llevan un Delta de «no
  implementar». Se rehacen en el Slice 1.

## Delta 2026-09-11 — el Pillar ya está publicado, pero no en `/servicios/hubspot/`

TASK-1352 se cerró: el Pillar vive en `/servicios-contratar-hubspot/` (WordPress `244079`, `200`, `index, follow`).
La migración a `/servicios/hubspot/` no se hizo y esa ruta hoy responde `301` hacia `/hubspot/hubspot-marketing-ventas/`,
un post antiguo. Esta página se diseñó bajo `/servicios/hubspot/`: antes de construir, el operador decide la URL
padre del hub (decisión registrada en EPIC-047).

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1403-landing-hubspot-agentes.md`
- Flow: `docs/ui/flows/TASK-1403-landing-hubspot-agentes-flow.md`
- Motion: `docs/ui/motion/TASK-1403-landing-hubspot-agentes-motion.md`
- Backend impact: `none`
- Epic: `EPIC-047`
- Status real: `Diseno; reenfocada 2026-09-13 a landing del servicio de agentes; contratos UI superados y por rehacer`
- Rank: `EPIC-047-04`
- Domain: `public-site`
- Blocked by: `URL padre del hub HubSpot (decisión del operador); la región del caso además espera verificar la métrica ANAM y el alcance de su autorización`
- Branch: `develop (Greenhouse, checkout compartido, sin worktrees)`

> **Cluster del hub HubSpot.** Pillar: **TASK-1352** (`/servicios-contratar-hubspot/`, publicado).
> **Arquitectura:** [PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) ·
> **SSOT de contenido:** [`HUBSPOT_HUB_LANDINGS_SPEC.md`](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) § 3 ·
> **Oferta:** [`HUBSPOT_OFFER_ARCHITECTURE_V2.md`](../../services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md) ·
> **Dominio:** skill `hubspot-solutions-partner` (`modules/13_AGENTES.md` + `SOURCES.md`).

## Summary

Construye la landing pública del **servicio de agentes de IA sobre HubSpot**: Efeonce evalúa si un agente sirve,
lo diseña, lo construye (preconstruido o custom), lo evalúa, lo despliega en el canal y lo **opera** después, con
gobierno humano y modelado de costo. La página vende ese ciclo completo con evidencia: el **Customer Agent de ANAM
activo y en producción**, una matriz honesta de **qué se promete y qué va a piloto** mientras Agent Hub y los
agentes custom sigan en beta, y la doctrina que nos separa del mercado: **el agente propone, un humano confirma,
recién ahí se ejecuta**.

## Why This Task Exists

**1. La oferta existe y no tiene superficie pública.** La oferta V2 formaliza la familia *Agent Hub & Agentic
Operations* («diseñar, desplegar y gobernar agentes y workflows agentic con resultados, costo y escalamiento
observables») y el modo *Managed Agentic Operations*. El servicio `hubspot.customer-agent-managed` está activo con
ANAM como implementación de referencia. Hoy nada en el sitio lo vende.

**2. El mercado vende el agente, no el servicio.** HubSpot trae agentes, pero no el contexto, el handoff, la
evaluación, el costo ni la operación. Esa capa —la que decide qué hace un agente solo y qué no— **no viene
incluida**, y es exactamente lo que Efeonce hace (módulo 13 §0).

**3. Tenemos el caso, y está en producción.** El Customer Agent de ANAM opera conversaciones reales. Es la
diferencia entre prometer una capability y mostrar un servicio funcionando.

**4. La versión anterior de esta task se quedaba corta.** Era una pieza de honestidad sobre qué agentes
funcionan. El operador la reenfocó el 2026-09-13: la honestidad es la prueba, el servicio es el producto.

## Goal

- Vender el **ciclo completo** del servicio: evaluación, diseño, construcción, QA, despliegue y operación gestionada.
- Decir **qué se promete y qué va a piloto**, coherente con la readiness vigente de la oferta V2 §6.
- Mostrar el **caso ANAM** con métrica verificada, período, línea base y denominador, liderando con el promedio.
- Explicar el **gobierno** y el **modelado de costo** como parte del servicio, no como advertencias.
- Convertir a una **evaluación inicial sin costo**, con la reunión como segundo escalón.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- 🔴 [`HUBSPOT_OFFER_ARCHITECTURE_V2.md`](../../services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md) —
  §2 familia *Agent Hub & Agentic Operations*, §3 modos de entrega (incluido *Managed Agentic Operations*), §5
  arquitectura de landing, **§6 readiness comercial** (qué puede afirmarse). Es la fuente de lo que la página promete.
- 🔴 [`hubspot-customer-agent-managed-service.md`](../../services/hubspot-as-a-service/hubspot-customer-agent-managed-service.md) —
  alcance, entregables, responsabilidades, fuera de alcance y métricas del servicio probado.
- 🔴 [Spec del hub § 3](../../public-site/HUBSPOT_HUB_LANDINGS_SPEC.md) · [PDR-013](../../public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) (Delta 2026-09-13) ·
  [PDR-006](../../public-site/decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md).
- [`HUBSPOT_ELEMENTOR_MODULES_V1.md`](../../architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md) — patrón de
  construcción del Pillar publicado (widgets Elementor). La landing se construye con el mismo patrón salvo decisión
  distinta registrada en el Slice 1.
- [`PDR-009`](../../public-site/decisions/PDR-009-hubspot-scheduler-native-booking.md) — agenda nativa: cada
  superficie exige su propio gate antes de adoptarla.

## Normative Docs

- 🔴 `.claude/skills/hubspot-solutions-partner/modules/13_AGENTES.md` — las cuatro capas del servicio, la ficha de
  inventario por caso de uso, el costo por resultado, la Agent CLI, los Agent Tools, beta ≠ SLA y anti-patrones.
- 🔴 `.claude/skills/hubspot-solutions-partner/SOURCES.md` — release, precio y fecha de cada dato de agentes.
- `docs/public-site/HUBSPOT_CUSTOMER_AGENT_ANAM_APPROVAL_RECORD_V1.md` — alcance autorizado del caso (Delta 2026-09-13).
- `docs/context/05_voz-tono-estilo.md` — voz y registro. `docs/context/09_marca-agencia.md` — marca Efeonce.

## 🔴 Reglas duras

**Lo que se promete**

1. 🔴 **La matriz de promesa sale de la oferta V2 §6, no de la memoria.** Hoy: readiness y contexto, y Customer
   Agent gestionado delimitado al caso probado → **se venden con evidencia**; otros agentes preconstruidos → **se
   califican por portal**; Agent Hub y agentes custom mientras sean beta → **piloto primero**; Managed Agentic
   Operations → **cuando hay backlog, owner y economics**. Si la oferta cambia, la página cambia.
2. 🔴 **Ningún SLA ni resultado garantizado sobre una capacidad beta.** Los Custom Assistants pasaron a solo lectura
   el 2026-07-13: las betas cambian.
3. 🔴 **Nunca «flota de agentes de IA» ni «tu CRM va a correr solo».**
4. 🔴 **Sin número fijo de agentes.** Release y elegibilidad se verifican el día de publicar y van con `as-of` visible.

**El caso**

5. 🔴 **ANAM con nombre sólo dentro del alcance autorizado.** La aprobación del 2026-07-17 cubre los hechos del
   artículo v4; «activo y en producción» y cualquier métrica de operación son hechos nuevos que requieren confirmar
   el alcance. Sin eso, el caso va anonimizado y la cadena `ANAM` no existe en el DOM.
6. 🔴 **Métrica verificada contra el portal `19893546`**, con período, línea base y denominador en una frase.
7. 🔴 **Se lidera con el promedio (56%), no con el mejor mes (76%).** Nunca extrapolar de un caso.
8. 🔴 **La landing no contradice contenido público.** Mientras el artículo del caso diga «no operativo», la landing
   no lo enlaza como prueba de producción.

**El gobierno y el costo**

9. 🔴 **El gobierno se enuncia literal:** el agente propone · un humano confirma · recién ahí se ejecuta · todo
   write pasa por `--dry-run` · `admin mode` sólo con autorización explícita y acotada.
10. 🔴 **La definición de «conversación resuelta» es de HubSpot y se cita con atribución**; los precios se
    reverifican el día de publicar.
11. 🔴 **La Agent CLI es nuestra forma de trabajar (beta pública), no un producto que se vende.**

## Dependencies & Impact

### Depends on

- 🔴 **Decisión del operador sobre la URL padre del hub** (EPIC-047): mantener el Pillar en
  `/servicios-contratar-hubspot/` o migrarlo a `/servicios/hubspot/`.
- 🔴 **Verificación de la métrica ANAM** y del alcance de su autorización (sólo la región del caso).
- Oferta V2 §6 vigente el día de publicar; release y precio de agentes reverificados (`SOURCES.md`).
- Growth Forms (renderer + formulario de evaluación) y HubSpot Meetings o agenda nativa — reuso `[verificar]`.

### Blocks / Impacts

- TASK-1401 (Precios): recibe el enlace de consumo de créditos y modelado de costo de agentes.
- TASK-1402 y TASK-1404 (artículos del hub): enlazan a esta landing como servicio.
- Artículo publicado del caso ANAM (post `251432`): hoy contradice el estado vigente; su actualización es follow-up.
- EPIC-024 (HubSpot Portal Grader): posible puerta de evaluación futura; no bloquea.

### Files owned

- Esta task · `docs/ui/wireframes/TASK-1403-*` · `docs/ui/flows/TASK-1403-*` · `docs/ui/motion/TASK-1403-*` ·
  `docs/ui/visual-directions/TASK-1403-*` (a crear en Slice 1).
- La página WordPress nueva · su escenario de captura · su fila en el landing registry y en la route matrix.

## Current Repo State

### Already exists

- Oferta V2 con la familia *Agent Hub & Agentic Operations*, los modos de entrega y la readiness comercial.
- Servicio `hubspot.customer-agent-managed` documentado (alcance, entregables, métricas) con ANAM como referencia.
- Módulo 13 de la skill con las cuatro capas del servicio, la ficha por caso de uso y la doctrina de gobierno.
- Pillar HubSpot publicado con patrón Elementor documentado en `HUBSPOT_ELEMENTOR_MODULES_V1.md`.
- Spec del hub §3 y PDR-013 reenfocados al servicio (2026-09-13).
- Contratos UI de la versión anterior (superados; útiles como insumo de reglas de honestidad, accesibilidad y motion).

### Gap

- URL padre sin decidir.
- Métrica ANAM sin período, línea base ni denominador verificados; alcance de autorización para la landing sin confirmar.
- Dirección visual inexistente; wireframe, flow y motion por rehacer para el servicio.
- Copy, JSON-LD, formulario de evaluación de agentes y escenario de captura sin definir.
- Economics de *Managed Agentic Operations* sin validar para publicarlo como oferta.

## Modular Placement Contract

- Topology impact: `public`
- Current home: sitio público WordPress/Ohio en Kinsta; página nueva bajo la URL padre que decida el operador.
- Future candidate home: `public`
- Boundary: la landing es consumer del renderer público de Growth Forms y del agendador; no define primitives ni contratos propios.
- Server/browser split: sitio público sin Client Components de portal; cero secretos, cero SDK, cero DB. El JS es enhancement y no es requisito para leer la página.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: **(1)** el CEO o director al que el directorio le pidió «IA» y teme comprar humo; **(2)** el COO o
  jefe de servicio con el equipo desbordado, al que le importa que baje la carga; **(3)** el líder de RevOps o
  servicio que ya opera HubSpot y necesita a alguien que construya y opere agentes con gobierno.
- Momento del flujo: *«quiero agentes de IA en HubSpot, pero no sé qué sirve, quién los construye, qué cuestan ni
  quién responde cuando fallan».*
- Resultado perceptible esperado: entender qué hace Efeonce en cada etapa, qué se promete hoy y cómo empezar.
- Fricción que debe reducir: miedo a comprar humo, miedo a soltarle el CRM a una IA sin supervisión e
  incertidumbre sobre el costo.
- No-goals UX: no es el folleto de Breeze · no es un catálogo de agentes · no vende la Agent CLI · no promete
  resultados sobre betas.

### Surface & system decision

- Surface: landing pública bajo la URL padre del hub HubSpot (por decidir; working route `/servicios/hubspot/agentes/`).
- Composition Shell: no aplica (sitio público WordPress).
- Nav placement: `none` — no agrega destinos al portal; en el sitio cuelga del hub HubSpot.
- Primitive decision: `reuse` — widgets del Pillar HubSpot y del renderer de Growth Forms; `<table>` semántica para
  la matriz de promesa; `<ol>` para el gobierno. Confirmar contra `HUBSPOT_ELEMENTOR_MODULES_V1.md` en Slice 1.
- Adaptive density / The Seam: no aplica.
- Floating/Sidecar/Dialog decision: ninguno.
- Copy source: contenido de página pública validado con `copywriting` y `greenhouse-ux-writing`; cero hype de IA.
- Access impact: `none` (pública).

### State inventory

- Default: página completa legible sin JS (etapas, matriz de promesa, caso y gobierno en el HTML servido).
- Loading / Empty / Permission denied: no aplican a una landing estática.
- Error: el formulario falla → tarjeta de error del renderer.
- Degraded / partial: el formulario no monta → enlace alternativo visible.
- Long content: la matriz de promesa scrollea dentro de su contenedor; nunca la página.
- Mobile / compact (390 px): la matriz colapsa a tarjetas completas sin perder la columna de estado.
- Keyboard / focus: matriz alcanzable por teclado; gobierno como `<ol>`; foco visible AA.
- Reduced motion: todas las regiones visibles y estáticas; el orden del gobierno se conserva.
- Estado de contenido del caso: **con alcance autorizado** → ANAM nombrado · **sin alcance** → anonimizado y la
  cadena `ANAM` ausente del DOM.
- Estado de contenido de la oferta: cuando cambia la readiness de V2 §6 o el release de un agente, la matriz se
  actualiza con fecha.

### Interaction contract

- Primary interaction: leer y pedir la evaluación inicial sin costo.
- Hover / focus / active: CTA con micro-lift y foco visible; hover de fila en la matriz.
- Pending / disabled: sólo en el formulario, gestionado por su renderer.
- Escape / click-away: no hay superficies flotantes.
- Focus restore: al volver de la agenda externa, el navegador restaura.
- Latency feedback / Toast: gestionado por el renderer del formulario.

### Motion & microinteracciones

- Motion primitive: CSS + IntersectionObserver, alineado al contrato real del Pillar implementado (verificar en Slice 1).
- Enter / exit: fade + rise sobrio por región.
- Layout morph: ninguno.
- Stagger: sólo en el ciclo de servicio y en el gobierno, donde el orden es el contenido.
- Timing / easing token: los del Pillar implementado; no inventar tokens nuevos.
- Reduced-motion fallback: todo visible y estático, sin perder el orden.
- Non-goal motion: glows, auroras, partículas, redes neuronales, typing effect, pulsos, gradientes animados,
  contadores y robots.

### Implementation mapping

- Route / surface: página WordPress nueva bajo la URL padre decidida.
- Primitive / variant / kind: `reuse` de widgets del Pillar; los que falten se registran en el contrato Elementor antes de construirlos.
- Component candidates: hero de servicio · ciclo de servicio (6 etapas) · matriz de promesa (`<table>`) · región
  autocontenida del caso · gobierno (`<ol>`) · costo con cita atribuida · modos de entrega · Agent CLI · límites ·
  FAQ (`<details>`) · CTA con formulario de evaluación.
- Copy source: contenido de página pública.
- Data reader / command: ninguno; release, precios y métrica son contenido editorial verificado con `as-of`.
- API parity: por reuso (Growth Forms + agenda).
- Access / capability: ninguna.
- States to implement: default · sin JS · reduced motion · formulario no monta · 390 px · caso con/sin alcance autorizado.

### GVC scenario plan

- Scenario file: verificación con Playwright sobre la URL pública o preview (el GVC del portal no aplica a WordPress
  público; patrón TASK-1343/1358).
- Route: la URL decidida · Viewports: 1440 + 390.
- Required steps: cargar → capturar hero y ciclo de servicio → capturar la matriz de promesa → scroll al caso →
  capturar el gobierno → abrir 2 FAQ → click CTA → verificar formulario o enlace alternativo.
- Required captures: full page desktop y mobile · ciclo · matriz · caso · gobierno · reduced motion · tarjetas en 390 px.
- Required `data-capture` markers: `hero` · `ciclo` · `promesa` · `caso` · `gobierno` · `costo` · `modos` · `limites` · `cta`.
- Assertions:
  - sin JS: etapas, matriz, caso y gobierno en el HTML servido;
  - no existen «flota de agentes» ni «tu CRM va a correr solo»;
  - en el DOM `56` aparece antes que `76`;
  - sin alcance autorizado, la cadena `ANAM` no existe;
  - el estado de cada capa en la matriz está escrito, no sólo en color;
  - el gobierno es un `<ol>`; cero contadores animados; `as-of` visible;
  - un solo `<h1>`, breadcrumb, canonical y enlace al Pillar.
- Scroll-width checks: sin scroll horizontal de página en 1440 y 390.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion` y tabulación con foco visible.

### Design decision log

- Decision: la página vende el **servicio** (ciclo completo con operación) y usa la honestidad como prueba.
- Alternatives considered: *(a)* página informativa «cuáles funcionan de verdad» — la versión anterior; educa pero
  no vende el servicio que la oferta V2 formaliza. *(b)* catálogo de agentes con precios — es el folleto de HubSpot y
  envejece cada mes. *(c)* hero con el 56% — activa el escepticismo del comprador antes de mostrar método.
- Why this pattern: el comprador no compra un agente, compra que alguien lo haga funcionar y responda; el ciclo de
  servicio más la matriz de promesa le dicen qué recibe y qué no, y el caso llega cuando ya hay método a la vista.
- Reuse / extend / new primitive: `reuse`.
- Open risks: prometer betas como servicio cerrado; publicar ANAM fuera del alcance autorizado; contradicción con el
  artículo publicado; release y precios desactualizados; URL padre sin decidir.

### Visual verification

- GVC scenario: Playwright live sobre la URL decidida · 1440 + 390.
- Required captures / markers: ver *GVC scenario plan*.
- Scroll-width check: sin scroll horizontal de página.
- Accessibility/focus checks: matriz semántica con estado escrito, gobierno como `<ol>`, foco AA.
- Before/after evidence: página nueva, sin estado previo.
- Known visual debt: la reacción esperada del revisor es «qué claro está», no «qué futurista».

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Decisiones y verificación de contenido

- Registrar la URL padre decidida por el operador.
- Verificar la métrica ANAM contra el portal `19893546`: fecha de activación, período, línea base y denominador.
- Confirmar el alcance de la autorización de ANAM para la landing (nombre, «en producción», métrica).
- Reverificar release y elegibilidad de agentes, precios por resultado y la readiness de la oferta V2 §6.

### Slice 1 — Contratos UI del servicio

- Dirección visual con 2–3 alternativas comparadas, alineada al Pillar implementado, en
  `docs/ui/visual-directions/TASK-1403-*`.
- Reescribir wireframe, flow y motion para las regiones del servicio; retirar el Delta de «superado».
- `UI ready: yes` sólo con `pnpm task:lint --task TASK-1403` y los checks de UI sin hallazgos.

### Slice 2 — Copy

- Copy ledger completo con `copywriting` + `greenhouse-ux-writing`, answer capsule por H2 y reglas duras aplicadas.

### Slice 3 — Construcción

- Página WordPress nueva con el patrón del Pillar, en estado borrador o privado.

### Slice 4 — AEO, formulario y enlaces

- JSON-LD `Service` + `FAQPage` + `BreadcrumbList`.
- Formulario de evaluación inicial sin costo (reuso de Growth Forms) + agenda + enlace alternativo.
- Enlaces internos: Pillar obligatorio; Precios y artículos del hub sólo si existen.

### Slice 5 — Verificación, publicación y registro

- Readback del preview, autorización explícita del operador, publicación, purge y readback live con capturas.
- Landing registry, route matrix y landing file con recordatorio trimestral de release y precios.

## Out of Scope

- Agentes fuera de HubSpot (Salesforce Agentforce u otras plataformas): otra landing, si se decide.
- Catálogo completo de agentes con detalle de producto.
- Precios detallados de licencias y créditos (TASK-1401) y comparación con Salesforce (TASK-1404).
- Actualizar el artículo publicado del caso ANAM (follow-up con autorización propia).
- Variante `en-US`.

## Detailed Spec

### El ciclo de servicio (región firma)

Seis etapas, derivadas del servicio `hubspot.customer-agent-managed` y del módulo 13 §1, generalizadas a cualquier
agente del hub:

| Etapa | Qué hace Efeonce | Salida |
|---|---|---|
| **1 · Evaluación y readiness** | Jobs, datos y knowledge, procesos, permisos, licencias y créditos, baseline de carga y volumen | Fit / no-fit y siguiente alcance |
| **2 · Diseño** | Ficha por caso de uso: job, release y elegibilidad, contexto, herramientas y permisos, autonomía y handoff, consumo, evaluación y operación; identidad y límites | Arquitectura del agente y matriz de handoff |
| **3 · Construcción** | Agentes preconstruidos (Customer, Prospecting, Data) sobre knowledge versionado; agentes custom con Agent Builder, Agent Tools, APIs, MCP y workflow actions | Agente configurado y conocimiento versionado |
| **4 · Evaluación y QA** | Escenarios, umbrales, regresiones y riesgo residual | QA report |
| **5 · Despliegue** | Canal y entry point, créditos, readback y manual de operación | Agente en producción verificado |
| **6 · Operación gestionada** | Consumo, observabilidad, intenciones sin resolver, incidentes, cambios con regresión, optimización y retiro | Reporte periódico y backlog de mejora |

Transversal a las seis: **gobierno** (regla dura 9) y **modelado de costo**.

### Matriz de promesa (qué se promete y qué va a piloto)

| Capa | Qué afirma la página hoy |
|---|---|
| Readiness y contexto | Se vende: método reusable probado en ANAM |
| Customer Agent gestionado | Se vende con evidencia, delimitado al caso probado |
| Otros agentes preconstruidos | Se califican por portal; release y elegibilidad se verifican al cotizar |
| Agent Hub y agentes custom | Piloto primero mientras sean beta; sin SLA |
| Managed Agentic Operations | Se ofrece cuando hay backlog, owner y economics |

Fuente: oferta V2 §6 y módulo 13 §1. La tabla se reverifica el día de publicar.

### Regiones (dirección para el Slice 1)

hero de servicio con CTA y `as-of` → el problema (HubSpot trae agentes, no el servicio) → **ciclo de servicio** →
matriz de promesa → **caso ANAM** (región autocontenida) → **gobierno** → costo y modelado → cómo trabajamos
(evaluación sin costo, blueprint pagado, implementación, sprint, operación gestionada) → operamos HubSpot con
agentes → cuándo un agente no te sirve → FAQ → CTA.

### Caso ANAM (región autocontenida)

Customer Agent **activo y en producción**. Reducción de carga del equipo de atención: **56% en promedio** (76% en el
mejor mes), sujeto al Slice 0. La región se puede anonimizar editando sólo esa sección.

### Contrato de datos

Ningún reader, command ni endpoint. Release, precios, readiness y métrica son contenido editorial verificado con fecha.

## Rollout Plan & Risk Matrix

Página nueva sin impacto en runtime del portal. El riesgo es de **contenido y promesa comercial**: la página nombra a
un cliente, promete un servicio con partes en beta y su dominio cambia seguido.

### Slice ordering hard rule

Slice 0 → 1 → 2 → 3 → 4 → 5. Sin URL padre decidida no empieza el Slice 1. La región del caso puede avanzar
anonimizada si la verificación o el alcance de ANAM siguen pendientes. Ninguna publicación sin autorización explícita.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Prometer resultado o SLA sobre Agent Hub o agentes custom en beta | Comercial / contrato | media | Matriz de promesa atada a oferta V2 §6 + assertion de frases prohibidas | Cambio de HubSpot o reclamo contractual |
| Publicar ANAM o una métrica fuera del alcance autorizado | Relación con cliente | media | Slice 0 + assertion `ANAM` ausente sin alcance | Reclamo de ANAM |
| La landing dice «en producción» y el artículo publicado dice «no operativo» | Sitio público / credibilidad | alta hoy | No enlazar el artículo hasta que el operador decida su actualización (regla dura 8) | Un lector o un LLM cita la contradicción |
| Release o precios de agentes cambian | Contenido | alta | `as-of` visible + reverificación al publicar + revisión trimestral | Anuncio de HubSpot |
| URL padre sin decidir | Arquitectura del sitio | alta hoy | Bloqueo explícito del Slice 1 | Breadcrumb o enlace al post antiguo |
| Managed Agentic Operations ofrecida sin economics | Margen | media | Condición escrita en la matriz + validación de pricing | Cotización bajo el piso |
| Construir desde los contratos UI superados | Implementación | media | Delta «no implementar» + Slice 1 obligatorio | Review |
| Estética «de IA» que contradice el mensaje | Marca | media | Prohibiciones de motion del contrato | Revisor humano |

### Feature flags / cutover

Sin flags. El cutover es la publicación en WordPress: borrador o privado → readback → autorización del operador →
público → purge de Kinsta.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 0–2 | Revertir el commit documental; sin impacto en runtime público | minutos | sí |
| 3–4 | Pasar la página a borrador + purge de Kinsta | < 5 min | sí |
| Región del caso | Anonimizar sólo esa sección + purge | < 15 min | sí |
| 5 | Revertir registry, route matrix y landing file | < 5 min | sí |

### Production verification sequence

Preview privado → readback de HTML (H1, ciclo, matriz, caso, gobierno, JSON-LD, robots, canonical) → autorización
explícita → publicar → purge → readback live + capturas 1440 y 390 + reduced motion.

### Out-of-band coordination required

- Operador: URL padre, publicación, alcance de ANAM y decisión sobre el artículo publicado.
- ANAM: métrica y autorización.
- Pricing: economics de Managed Agentic Operations antes de ofrecerla en la página.
- Dueño del Pillar: enlace bidireccional desde el hub.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La URL padre está decidida por el operador y registrada en EPIC-047 antes del Slice 1.
- [ ] Existe `docs/ui/visual-directions/TASK-1403-*` con 2–3 alternativas comparadas y la elegida alineada al Pillar implementado.
- [ ] Wireframe, flow y motion están reescritos para el servicio y ya no llevan el Delta de «superado».
- [ ] `UI ready: yes` sólo con `pnpm task:lint --task TASK-1403` y los checks de UI sin hallazgos.
- [ ] La página publicada responde `200` bajo la URL decidida, con breadcrumb y enlace al Pillar.
- [ ] El H1 y el hero comunican el servicio (evaluar, diseñar, construir, desplegar y operar agentes), no un producto de HubSpot.
- [ ] Las seis etapas del ciclo de servicio están en el HTML servido.
- [ ] La matriz de promesa coincide con la oferta V2 §6 vigente el día de publicar y cada estado está escrito en texto.
- [ ] No aparece un número fijo de agentes; release y elegibilidad llevan `as-of` visible.
- [ ] No existen «flota de agentes», «tu CRM va a correr solo» ni SLA o resultado garantizado sobre capacidades beta.
- [ ] La métrica ANAM declara período, línea base y denominador verificados contra el portal `19893546`.
- [ ] En el DOM `56` aparece antes que `76`, y el 76% se declara como el mejor mes.
- [ ] Si el alcance autorizado no cubre la landing, la cadena `ANAM` no existe en el DOM.
- [ ] La landing no enlaza el artículo del caso mientras ese artículo diga que el agente no está operativo.
- [ ] El gobierno es un `<ol>` propone → confirma → ejecuta, con `--dry-run` y `admin mode` acotado.
- [ ] La definición de «conversación resuelta» se cita con atribución a HubSpot.
- [ ] Los modos de entrega coinciden con la oferta V2 §3.
- [ ] La Agent CLI aparece como forma de trabajar (beta pública), nunca como producto vendido.
- [ ] Existe la región «cuándo un agente no te sirve».
- [ ] El CTA primario es la evaluación inicial sin costo, con enlace alternativo visible; formulario y agenda reutilizan contratos gobernados.
- [ ] Sin JS se leen etapas, matriz, caso y gobierno; no hay contadores animados.
- [ ] JSON-LD `Service` + `FAQPage` + `BreadcrumbList` válido y cada H2 tiene answer capsule.
- [ ] El copy es español neutro sin voseo y está validado con `greenhouse-ux-writing`.
- [ ] Capturas live 1440 + 390 + reduced motion revisadas, sin scroll horizontal de página.
- [ ] Landing registry, route matrix y landing file actualizados con recordatorio trimestral de release y precios.

## Verification

`pnpm task:lint --task TASK-1403` · `pnpm ops:lint --changed` ·
`pnpm ui:wireframe-check --task TASK-1403` · `pnpm ui:flow-check --task TASK-1403` · `pnpm ui:motion-check --task TASK-1403` ·
Playwright live 1440 + 390 con las assertions del plan · Rich Results Test · HTTP `200` + breadcrumb + canonical.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con la carpeta · `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Chequeo de impacto cruzado (TASK-1352 Pillar · TASK-1401/1402/1404 · artículo ANAM · spec del hub · PDR-013)
- [ ] Página registrada en route matrix, landing registry y landing file
- [ ] Autorización de ANAM archivada (qué cubre, quién la dio, cuándo)
- [ ] Recordatorio trimestral de release, precios y readiness en el landing file

## Follow-ups

- Actualizar el artículo publicado del caso ANAM (`/hubspot/ia-atencion-cliente-caso-anam/`) con el estado vigente, con autorización del operador y, si cambian hechos, de ANAM.
- Segundo caso de agente para salir de n=1.
- Validar economics de Managed Agentic Operations con pricing.
- Variante `en-US`.

## Open Questions

- ¿Cuál es la URL padre del hub? (bloquea el Slice 1)
- ¿El alcance es sólo agentes sobre HubSpot o también agentes en otras plataformas? Inferencia actual: sólo
  HubSpot, por la ubicación en el hub y la oferta V2; ajustar si el operador quiere una landing multiplataforma.
- ¿Desde cuándo está en producción el Customer Agent de ANAM y sobre qué ventana se mide la reducción de carga?
- ¿ANAM autoriza nombrarlo con el estado «en producción» y la métrica en esta landing?
- ¿Se publica Managed Agentic Operations con precio de referencia o sólo como modo de entrega bajo evaluación?
