# TASK-1812 / Public Site — Salesforce Services Landing

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1812`
- Product Design asset: `docs/ui/visual-directions/TASK-1812-salesforce-services-landing.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: compradores enterprise con Salesforce instalado y equipos que evalúan Salesforce.
- Copy source: oferta canónica Salesforce + ledger local de copy/claims aprobado.
- Primitive decision: `extend` módulos públicos adaptables; `one-off` sólo para `Cloud Navigator`.
- UI ready target: `yes`

## Brief

- Primary user: sponsor ejecutivo, líder comercial/servicio/marketing, RevOps/CRM owner y operador Salesforce.
- User moment: la plataforma ya existe pero está fragmentada, o la organización necesita decidir cómo adoptarla.
- Job to be done: identificar el problema operativo, comprender el enfoque de Efeonce y avanzar a un diagnóstico trazable.
- Primary decision signal: `Ya usamos Salesforce` frente a `Estamos evaluando Salesforce`; ambos convergen en un diagnóstico.
- Non-goals: catálogo exhaustivo de SKUs, pricing/licenciamiento, demo de software, marketplace, promesas de partnership o ROI garantizado.

## Desktop Target — 1440×1000

```text
┌─ Ohio header nativo ─────────────────────────────────────────────────────┐
│ Efeonce · Salesforce Services                                            │
│ TODO EL UNIVERSO SALESFORCE.        ┌─ CLOUD NAVIGATOR ────────────────┐ │
│ Una operación que trabaja          │ Sales ─ Service ─ Marketing      │ │
│ como una sola.                     │    Data ─ Automation ─ Agents    │ │
│ [Descubrir oportunidades]          │ señal → ruta Efeonce → outcome   │ │
│ [Estoy evaluando Salesforce]       └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

El primer fold deja una promesa, dos contextos de entrada y una visualización causal. El mapa continúa hacia la
sección siguiente, pero el CTA nunca depende de la animación.

## Mobile Target — 390×844

```text
┌─ header ───────────────┐
│ Efeonce · Salesforce   │
│ TODO EL UNIVERSO...     │
│ explicación breve      │
│ [Descubrir...]         │
│ [Estoy evaluando...]   │
│ señal                  │
│   ↓ Sales/Service      │
│   ↓ Data/Agents        │
│   ↓ outcome            │
└────────────────────────┘
```

La narrativa es vertical, con touch targets completos, texto sin truncar y cero overflow horizontal.

## Action Hierarchy

- Primary: `Descubrir oportunidades en mi Salesforce` → ruta installed-base → intake gobernado.
- Secondary: `Estoy evaluando Salesforce` → ruta evaluator → mismo intake con contexto distinto.
- Destructive: ninguna.
- Selection vs action: elegir ruta sólo cambia contexto; enviar formulario o agendar es la acción de conversión.
- Pending / disabled: sólo el host canónico declara validación, pending y receipt; evita doble submit.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Ecosistema Salesforce | azul de acento + clouds originales | reconocimiento de plataforma | copia de assets/mascotas |
| Dirección Efeonce | navy, tipografía y CTA institucional | ownership de la relación | co-branding no probado |
| Operación conectada | ruta SVG + lista semántica | causalidad entre clouds | canvas-only |
| Agentes | personajes originales y misiones etiquetadas | hacer tangible Agentforce | robot genérico decorativo |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | navegación y marca Efeonce | Ohio native header | WordPress |
| 1 | Hero + Cloud Navigator | promesa, contexto y CTA | hero adaptable + SVG/DOM | copy ledger |
| 2 | Route selector | separar base instalada/evaluación | segmented links/cards | hash/query allowlisted |
| 3 | Friction field | reconocer fragmentación real | editorial problem chapters | service canon + VoC |
| 4 | Customer signal journey | mostrar señal→decisión→acción | localized story map | offer architecture |
| 5 | Solution lanes | mapear outcomes, no SKUs | rich adaptive modules | six solution lanes |
| 6 | Marketing Cloud choice | explicar Engagement/Next/coexistencia | decision table | product map |
| 7 | Agent missions | explicar Agentforce sobre datos/proceso | mission vignettes | CRM canon |
| 8 | Delivery lifecycle | Diagnose→Implement→Activate→Operate | lifecycle rail | offer architecture |
| 9 | Method & governance | ownership, calidad, adopción y medición | evidence ledger | offer architecture |
| 10 | Proof | casos/artefactos autorizados o método | case narrative | rights ledger |
| 11 | Fit / no-fit | calificar con honestidad | paired editorial lists | ICP/anti-ICP |
| 12 | FAQ / answer capsules | resolver objeciones verificables | native disclosures | approved copy |
| 13 | Conversion | intake contextual + meeting option | Growth Forms/Meetings host | governed runtime |
| 14 | Footer | cierre institucional | Ohio native footer | WordPress |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `salesforce.hero.eyebrow` | Hero | Efeonce · Salesforce Services | none | Efeonce primero |
| `salesforce.hero.title` | Hero | Todo el universo Salesforce. Una operación que trabaja como una sola. | none | big idea |
| `salesforce.hero.body` | Hero | Conectamos CRM, servicio, marketing, datos, automatización y agentes para convertir Salesforce en una operación medible. | none | no garantía |
| `salesforce.hero.ctaInstalled` | Hero | Descubrir oportunidades en mi Salesforce | none | primary |
| `salesforce.hero.ctaEvaluate` | Hero | Estoy evaluando Salesforce | none | secondary |
| `salesforce.routes.installed.title` | Routes | Ya usamos Salesforce | none | contexto, no submit |
| `salesforce.routes.evaluate.title` | Routes | Estamos evaluando Salesforce | none | contexto, no submit |
| `salesforce.lifecycle.title` | Lifecycle | De la arquitectura a una operación que evoluciona | none | four phases |
| `salesforce.fit.title` | Fit | Cuándo Efeonce puede aportar más valor | none | anti-hype |
| `salesforce.conversion.title` | Conversion | Conversemos sobre la siguiente decisión de tu operación | route | contextual |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Cuéntanos dónde estás | Comparte el contexto mínimo para preparar una conversación útil. | Continuar | host real |
| loading | Preparando el siguiente paso | Conservamos tu contexto mientras cargamos el formulario. | none | no skeleton falso |
| empty | Aún no hay casos publicables para esta capacidad | Te mostramos el método y los artefactos que sí podemos sostener. | Ver cómo trabajamos | no placeholder |
| partial | Parte de la experiencia está limitada | El contenido principal sigue disponible. | Reintentar | media/enhancement |
| error | No pudimos completar el envío | Tus datos siguen en pantalla. Revisa la conexión o usa el contacto directo. | Intentar nuevamente | no raw error |
| denied | Necesitamos verificar este envío | Completa la verificación para continuar. | Volver al formulario | Turnstile/abuse |

## Accessibility Contract

- Heading order: un H1; H2 por región; H3 únicamente dentro de lanes/misiones.
- Chart/table alternatives: Cloud Navigator y journey siempre tienen lista/tabla DOM equivalente.
- Aria labels: rutas, disclosures y host nombran acción y destino; decoración queda `aria-hidden`.
- Focus notes: orden visual=DOM; selector conserva foco; apertura del host y retorno lo restauran.
- Color-independent state labels: `Seleccionado`, `Actual`, `Pendiente`, `Enviado` visibles o disponibles a AT.

## Implementation Mapping

- Route / surface: work page WordPress `noindex`; slug/canonical/postId se congelan tras discovery SEO/runtime.
- Primitives: Ohio header/footer; módulos Elementor públicos; Growth Forms/Meetings existentes.
- Variants / kinds: hero editorial, route selector, story map, lane chapters, lifecycle rail, native FAQ.
- Component candidates: reusar módulos del plugin público; extender sólo si el lookup demuestra un gap.
- Copy source: ledger local versionado; controles Elementor; microcopy funcional del host en su SSOT.
- Data reader / command: ninguno nuevo; host de conversión existente.
- API parity: browser no escribe CRM ni declara éxito; consume receipt server-side.
- Access / capability: pública; sin datos internos ni permisos de partner inferidos.
- Runtime consumers: WordPress/Kinsta vigente y futuro rail público sólo mediante migración separada.
- Print/email/PDF considerations: estructura semántica legible sin animación; no es deck source automático.
- GVC markers: `hero|routes|frictions|journey|lanes|marketing-cloud|agents|lifecycle|method|proof|fit|faq|conversion`.

## GVC Scenario Plan

- Scenario file: nuevo `TASK-1812-public-salesforce-services` durante implementación.
- Route: work page `noindex`, luego canonical aprobada.
- Viewports: 1440×1000, 1280×900, 390×844, spot 2048.
- Quality profile: `premium`
- Required steps: first paint, ambas rutas, full scroll, lane/marketing/agent interactions, FAQ, host default/invalid/pending/error/success, Back, resize, JS-off y reduced motion.
- Required captures: hero natural/settled, journey states, lane selector, lifecycle, proof, fit, conversion, mobile full-page, reduced-static.
- Required `data-capture` markers: los definidos en Implementation Mapping.
- Assertions: H1/CTA/HTML visibles, route context estable, no claim/badge indebido, schema-copy parity, receipt real, links/canonical/robots correctos.
- Scroll-width checks: `scrollWidth === clientWidth` en todo viewport/estado.
- Accessibility/focus checks: keyboard completo, heading order, aria states, contrast y focus restore.
- Reduced-motion evidence: mapa final estático, capítulos verticales, cero pinning/travel/autoplay.
- Review dossier: `required`
- Baseline: `required after direction approval`

## Design Decision Log

- Decision: `Universo conectado`, con dos entradas y un único diagnóstico como conversión.
- Alternatives considered: Cloud Atlas, Agent Mission Control y catálogo de clouds.
- Why this pattern: aprovecha el equity de Salesforce, mantiene a Efeonce como guía y convierte complejidad de producto en outcomes/lifecycle.
- Reuse / extend / new primitive: reusar chrome/hosts, extender módulos adaptables, one-off Cloud Navigator; no primitive global preventivo.
- Open risks: estado de partnership y derechos, VoC/casos, slug/canibalización, inventario runtime y binding del CTA.
- Follow-up: aprobar el first fold antes de construir R2–R14.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger or explicitly assigned to final copy production.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives.
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [x] Design decision log explains reuse/extend/new before implementation starts.
