# Recetas por lámina del deck Efeonce «La órbita»

> **Tipo de documento:** Catálogo operativo (índice humano de un catálogo en JSON)
> **Versión:** 1.11
> **Creado:** 2026-09-27 por Claude
> **Última actualización:** 2026-09-30 por Claude (1.11: el deck SEO/AEO (Search Visibility 360) aprobado por el
> operador — seis recetas nuevas sin plantilla todavía (`content-brand-family`, `content-service-mockups`,
> `content-report-formats`, `content-committee-deck`, `content-industries`, `content-markets`; 100 en el catálogo, 94 con
> plantilla), `productMark` opcional, `requiredUnless` en el eyebrow de `proposal-cinematic-seo`/`-aeo`,
> `section-cine-team.body` opcional, 27 usos aprobados y los tres planes validados; sección «El deck SEO/AEO» y
> decisiones del 2026-09-30 (TASK-1949).
> Antes, 1.10: decisiones del operador al canonizar el deck Salesforce — cuatro
> recetas nuevas más (`decision-diagnosis-verdict`, `method-waves`, `content-day-live-console`,
> `content-day-live-approval`) para las láminas que no cabían (94 en el catálogo, 16 sin plantilla), los dos planes del
> deck (brochure y propuesta) como fixtures validados, el logo de 700 px sólo en la contraportada Salesforce y el
> servicio de la lámina 10 como «Enablement conversacional».
> Antes, 1.9: el deck de práctica Salesforce — 12 recetas nuevas sin
> plantilla todavía (90 en el catálogo), 8 láminas registradas en el campo nuevo `approvedUses` de recetas existentes,
> `partnerMark` opcional y eslogan en bloque en `close-proposal-horizon`, deck HubSpot pendiente (TASK-1942, TASK-1943).
> Antes, 1.8: sección «Datos reales por slot» — qué slot sale de qué fuente
> con `bindDeckSlots` y `pnpm brand:deck-plan -- --bind`, motivos de «sin ligar» y reglas de audiencia y autorización
> (TASK-1930).
> Antes, 1.7: `cover-brochure-line-brand` usa su plate propio `CR4` y deja
> de repetir `CR2b` con `proposal-cinematic-creative`; pendientes «Abiertos».
> Antes, 1.6: TASK-1934 — las nueve láminas SEO/AEO aprobadas el 2026-09-28 entran al catálogo (69 → 78 recetas,
> todas con plantilla), cómo elegirlas y sus reglas (cifras con fuente,
> datos de muestra marcados, interfaz de IA genérica); los códigos `variant-both-in-deck` (reemplaza a
> `variant-adjacent`) y `figure-source-missing`, y `next-steps-after-diagnosis` por familia; sus pendientes de QA.
> Antes, 1.5: sección «Validar el plan: códigos y cómo leerlos» —
> `pnpm brand:deck-plan`, códigos del catálogo y de AXIS, avisos, propuesta del agente y catálogo de runtime generado
> (TASK-1929). Antes, 1.4: revisión de consistencia — todo empujado a `develop`,
> cuándo va el `layout` explícito, qué campo lleva la selección, `photo.focus` sólo en el reloj del día a día, TASK-1921
> en curso, enlace a la documentación funcional. Antes, 1.3: la portada con selección compone — layout `document-selection`,
> AXIS 0.3.21; **69 de 69** recetas con plantilla. Antes, 1.2: TASK-1928 — 68 de 69 recetas con plantilla, las familias
> nuevas y sus intents de ejemplo, paridad de slots receta ↔ plantilla y los pendientes de QA que resolvió. Antes, 1.1:
> estado tras el cierre de TASK-1927 — qué recetas tienen plantilla, equivalencia de nombres con el contrato de AXIS,
> pendientes de QA resueltos y abiertos, cómo cambiar la foto, el copy o la sección)
> **Fuente de verdad:** [`EFEONCE_DECK_SLIDE_RECIPES_V1.json`](./EFEONCE_DECK_SLIDE_RECIPES_V1.json) (esquema
> `efeonce.deck-slide-recipes.v1`, 100 recetas). Este README explica cómo usarlo; el índice del final se **genera**
> desde el JSON con `pnpm brand:deck-recipes` y no se edita a mano.
> **Canon que manda:** [composición por superficie §4.6](../EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) (reglas del
> deck, portadas y contraportadas, decisiones del 2026-09-27) · [manual de la línea gráfica](../EFEONCE_GRAPHIC_LINE_V1.md)
> (voz, órbita, firma, eslogan) · [registro cine](../../brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) (fotos de cine).
> **Relacionados:** [manual de uso · componer un deck con las recetas](../../../manual-de-uso/creative/componer-deck-con-recetas.md) ·
> [documentación funcional · composición de decks y brochures](../../../documentation/creative/composicion-de-decks-y-brochures.md) ·
> [documentación funcional de la línea](../../../documentation/creative/linea-grafica-efeonce.md) · skill
> [`deck-studio`](../../../../.claude/skills/deck-studio/SKILL.md) · [TASK-1926](../../../tasks/to-do/TASK-1926-cine-register-idempotent-photo-pipeline.md)
> (fotos) · [TASK-1927](../../../tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) (plantillas
> de 31 recetas, `complete`) · [TASK-1928](../../../tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md)
> (plantillas de las 38 recetas restantes y la portada con selección, `complete`) ·
> [TASK-1934](../../../tasks/in-progress/TASK-1934-seo-aeo-deck-slides-recipe-catalog-templates.md) (las nueve
> láminas SEO/AEO, en curso).

## Qué es

El operador aprobó el **2026-09-27** las **69 láminas** del canvas «La órbita», página «Deck»: portadas y
contraportadas, secciones, contenido, método, prueba, propuestas por línea de servicio, cotización, próximos pasos y
respiro. Este catálogo convierte cada lámina aprobada en una **receta**: qué comunica, cuándo se usa, cuándo no y qué
conviene en su lugar, con qué otras láminas va, qué partes son **data slots** del Artifact Composer, qué queda fijo, qué
selección lleva, de qué foto sale (ficha, prompt y post-proceso), con qué prompt se compone y qué reglas hace cumplir.

El **2026-09-28** el operador aprobó **nueve láminas más, sobre SEO y AEO** (tabla en «Las láminas SEO/AEO»), y el
catálogo quedó en **78 recetas**. El **2026-09-29** aprobó las 19 láminas del **deck de práctica Salesforce**: doce son
recetas nuevas (sin plantilla todavía) y ocho eran datos de recetas existentes; al canonizar, el operador decidió que las
cuatro que no cabían en sus slots nacen como recetas propias (sección «El deck de práctica Salesforce»). El
**2026-09-30** aprobó el **deck SEO/AEO** (Search Visibility 360) en sus tres documentos: seis láminas nativas son
recetas nuevas (sin plantilla todavía) y el resto usa recetas existentes (sección «El deck SEO/AEO»). El catálogo
tiene **100 recetas**.

Sirve para que una persona o un agente arme un deck de **marca propia de Efeonce** (brochure, propuesta comercial,
pitch o QBR) eligiendo láminas aprobadas en vez de inventarlas. No aplica a decks con la marca de un cliente, al
catálogo `deck-axis` de las ofertas a comité ni a la interfaz de Greenhouse.

## Cómo se usa

1. **Decide el documento:** propuesta, brochure, pitch o QBR (tabla de abajo). El documento fija la portada, la
   contraportada y qué familias entran.
2. **Arma la secuencia por familias** (portada → secciones → contenido → método → prueba → cotización → próximos pasos
   → cierre) y, en cada familia, **elige la receta** con su «cuándo sí» y su «cuándo no». Si una receta dice «cuándo
   no», su `preferInstead` dice cuál usar.
3. **Respeta los pares:** `cover↔close` (portada y contraportada del mismo documento, alternando foto y sin foto),
   `variant` (son alternativas: se elige una y la otra no entra al deck, ni seguida ni separada) y `sequence` (van una
   después de la otra).
4. **Llena los slots** con datos reales: textos dentro de su `maxChars` medido, montos siempre `[MONTO]`, cifras con
   fuente (cada cifra con su `source`), logos sólo de clientes que autorizan su uso, fotos de ejemplo reemplazadas y
   datos de muestra marcados como tales («Ejemplo ilustrativo», «Datos de muestra»).
5. **Compón con la plantilla.** **94 de las 100** recetas tienen plantilla (las seis del deck SEO/AEO todavía no: el
   plan avisa `recipe-without-template`) (columna «Plantilla» del índice y tabla de «Qué
   sale hoy con un comando»). **Escribe el intent** en un archivo propio, partiendo del intent de ejemplo de la receta
   (`src/lib/brand-surfaces/examples/deck-<receta>-intent.json`), con la receta y el `layout` de AXIS que le
   corresponden, y compón la lámina o el documento completo con `pnpm brand:compose`. La portada con selección
   (`cover-brochure-cine-lines-selection`) usa el layout `document-selection` de `cover-brochure` (AXIS 0.3.21).
6. **Revisa a ojo** el píxel final contra la referencia aprobada, con la lista de la norma y los pendientes de QA de
   abajo. Componer no aprueba ni publica.

El paso a paso para el equipo está en el
[manual de uso](../../../manual-de-uso/creative/componer-deck-con-recetas.md).

## Cómo elegir por documento

Las láminas del catálogo no traen portada ni cierre propios para **pitch** y **QBR**. El JSON y el índice generado todavía citan
las clásicas de AXIS (`cover-classic`, `close-classic`) como alternativa, pero **no se usan**: el operador no las
aprobó, en AXIS quedan `supersededBy` y Greenhouse no tiene plantilla para ellas. Para un pitch o un QBR, el marco se
le pregunta al operador.

| Documento | Portada | Contraportada | Secuencia típica | No va |
|---|---|---|---|---|
| **Propuesta comercial** (se envía después de conversar) | **sin foto**, con el logo del cliente: `cover-proposal-orbit` o `cover-proposal-dawn` (los `-sky` son el ejemplo) | **con foto** y «Empower your Growth»: `close-proposal-horizon` o `close-proposal-dawn` | agenda (`decision-agenda`) → sección → contexto o texto → página de servicio (`proposal-cinematic-*` o `proposal-service-*`) → método (`triptych`, `method-staircase`, `decision-plan`) → prueba (`content-clients`, `decision-case`, `decision-chart`, `decision-testimonial`) → equipo (`content-team`) → riesgo (`decision-risk`) → cotización (`content-pricing*`) → cierre | «¿Conversamos?»; `decision-next-steps` si el diagnóstico ya ocurrió (el gesto es aprobar: `content-pricing-live`) |
| **Brochure** (PDF horizontal que se lee sin presentador) | **con foto**: una de las tres generales (`cover-brochure-cine-orbit`, `-lines`, `-team`) o la de cinco líneas con selección, o la de una línea (`cover-brochure-line-*`) | **sin foto**: `close-brochure-orbit` con «¿Conversamos? Cuando quieras.» | quiénes somos (`section-cine-about` → `section-cine-purpose`) → servicios (`section-cine-services` → `proposal-cinematic-*`, `proposal-cinematic-nexa-lines`) → cómo trabajamos (`triptych`, `content-day*`) → equipo (`section-cine-team` → `content-team`) → prueba (`content-clients`, `content-partners`, `decision-case`) → `decision-next-steps` → cierre | cotización (los montos se definen en cada propuesta); eslogan en portada |
| **Pitch** (se presenta en sala) | sin portada aprobada: se pregunta al operador | sin cierre aprobado: se pregunta al operador | agenda → sección → texto o viñetas → método → prueba → `decision-next-steps` | cotización (no hay alcance acordado) |
| **QBR** (revisión con un cliente activo) | sin portada aprobada: se pregunta al operador | sin cierre aprobado: se pregunta al operador | agenda → sección → resultados (`content-measure`, `content-focus`, `decision-chart`, `content-day-live-results`) → método → respiro | páginas de venta de servicio y cotización |

Las dos contraportadas de brochure **con foto** (`close-brochure-horizon`, `close-brochure-dawn`) están aprobadas, pero
por la regla «foto ↔ sin foto» sólo emparejan con una portada de brochure sin foto, que hoy no existe (norma §6,
fila 15).

## Cómo elegir dentro de una familia

- **Sala o lectura.** Para una sala que necesita impacto: la versión en escena o en vivo (`content-pricing-stage`,
  `content-day-live-*`, `method-staircase`, `proposal-cinematic-*`). Para lectura atenta (finanzas, compras, un PDF
  que se estudia): la versión sobria (`content-pricing`, `content-day`, `method-staircase-flat`, `proposal-service-*`).
- **Ritmo.** Alterna papel y oscuro; no pongas dos secciones partidas con la misma esquina seguidas (`section-split`,
  `section-split-corner-bottom`, `section-split-panel-end` existen para alternar); no repitas un plate en el mismo
  deck.
- **Variantes.** Dentro de un par `variant` se elige una y la otra no entra al deck, aunque vaya separada (decisión
  del operador del 2026-09-28, código `variant-both-in-deck`): la tabla de cotización o la escena o la cotización en
  vivo; la escalera BeX (`method-staircase`, la principal) o la plana (`method-staircase-flat`); la propuesta SEO sobria
  (`proposal-service-seo`) o la de cine (`proposal-cinematic-seo`).
- **La promesa se prueba.** Una sección que promete («En días») va seguida de la lámina que lo prueba con fuente.

## Las láminas SEO/AEO (aprobadas el 2026-09-28)

Nueve láminas del canvas «La órbita», página «Deck», para propuestas, brochures y pitches de visibilidad en buscadores
y en motores de IA ([TASK-1934](../../../tasks/in-progress/TASK-1934-seo-aeo-deck-slides-recipe-catalog-templates.md)).
No crean una familia nueva: entran en `proof`, `method`, `proposal-service` y `next-steps`.

| Lámina (board) | id | Familia | Cuándo usarla | Qué no se negocia |
|---|---|---|---|---|
| DeckMercadoIA | `decision-ai-market` | `proof` | abrir SEO/AEO con el porqué ahora; también en QBR para justificar mover presupuesto | tres cifras como máximo, cada una con fuente y año visibles (hoy HubSpot 2026, McKinsey 2025 y SparkToro 2026); con una sola cifra, `content-measure` |
| DeckIARespuesta | `decision-ai-answer` | `proof` | hacer visible el problema antes de la oferta AEO: el mismo prompt, «Hoy» sin tu marca y «Con AEO» con tu marca primera | interfaz de IA **genérica**; «Ejemplo ilustrativo» siempre visible; con el diagnóstico real del cliente, `decision-diagnosis-map` |
| DeckCicloSurround | `method-surround-cycle` | `method` | explicar cómo trabajamos AEO/SEO en un servicio continuo | cuatro estaciones en ese orden (Medir, Crear, Distribuir, Optimizar); la órbita tendida es la única órbita |
| DeckEEAT | `method-eeat` | `method` | explicar por qué el contenido y la autoridad importan para la IA | las cuatro letras siempre en orden E-E-A-T |
| DeckPropuestaSEO | `proposal-service-seo` | `proposal-service` | la propuesta SEO que se lee sin presentador y explica cada forma de empezar | variante de la de cine: nunca las dos en el mismo deck; nunca una promesa de ranking (la nota lo aclara) |
| DeckPropuestaSEOCine | `proposal-cinematic-seo` | `proposal-service` | la propuesta SEO que tiene que golpear (apertura de la sección) | variante de la sobria; registro cine sólo aquí; nota del pie obligatoria |
| DeckDiferencia | `decision-difference` | `proof` | el cliente compara con otras agencias o con hacerlo en casa | la alternativa siempre genérica: nunca un competidor real |
| DeckTraficoNegocio | `decision-traffic-to-revenue` | `proof` | subir la conversación de tráfico a negocio; QBR que conecta SEO con pipeline | sin cifras en los escalones salvo datos reales con fuente; sin CRM ni medición de leads, no se promete el escalón |
| DeckDiagnosticoMapa | `decision-diagnosis-map` | `next-steps` | cerrar una propuesta o brochure AEO con lo que el cliente recibe primero | «Datos de muestra» siempre visible; el share of voice suma 100; no va en una propuesta con el diagnóstico ya hecho |

SEO y AEO son **servicios distintos**: `proposal-service-seo` y `proposal-service-aeo` pueden ir en la misma propuesta
(no son variantes). Una sección AEO que respeta sus pares `sequence` (el catálogo dice qué va junto, no el orden):
`decision-ai-market` → `decision-ai-answer` → `method-surround-cycle` → `proposal-service-aeo` →
`decision-diagnosis-map`. Los pares exactos de cada lámina están en su `pairsWith`.

## El deck de práctica Salesforce (aprobado el 2026-09-29)

Diecinueve láminas de la práctica Salesforce (línea `revenue-salesforce`), aprobadas por el operador el 2026-09-29.
Orden en cinco actos, reglas y los dos planes (brochure y propuesta): [norma §4.6, «Deck de práctica
Salesforce»](../EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck). Task:
[TASK-1942](../../../tasks/complete/TASK-1942-salesforce-deck-recipes-canonization.md).

| Lámina | id | Familia | Cuándo usarla | Qué no se negocia |
|---|---|---|---|---|
| 03 · Uno | `content-one-platform` | `content` | el problema es tener varias herramientas que no se hablan | cinco áreas con su producto oficial; íconos de producto con autorización |
| 04 · El que encaje | `decision-provider-fit` | `proof` | el cliente compara Salesforce y HubSpot o viene a pedir una licencia | íconos Trazo, nunca logos de proveedor; nota de ejemplo sin diagnóstico real |
| 05 · No por defecto | `decision-platform-coexistence` | `method` | migrar entre generaciones de una plataforma (Engagement y Next) | cinco veredictos fijos; nunca reemplazo por defecto |
| 06 · Todo el ciclo | `content-service-lanes` | `content` | la lámina que lista qué hace la práctica | seis carriles del catálogo `docs/services/`; Agent Astro sólo con autorización |
| 07 · Agentes | `content-season-launches` | `content` | semanas después del evento, con el ledger vigente | fecha de corte obligatoria; nunca en un brochure evergreen |
| 08 · Una persona | `method-agent-supervisor` | `method` | la objeción es el control del agente | toda ficha dice quién aprueba o qué nunca hace |
| 09 · Donde trabajas | `content-day-live-approval` | `content` | vivir la supervisión del agente en el canal del equipo | el agente propone con evidencia y una persona aprueba; botones a 26 px; `[MONTO]`; Slack o Teams según la cuenta |
| 10 · Te responde | `content-live-chat` | `content` | el servicio de Enablement conversacional | ventana genérica; marcas de Claude y Claudeforce opcionales con autorización; `[MONTO]` |
| 11 · Con permiso | `method-identity-consent` | `method` | activar audiencias con datos personales | toda activación por un canal con permiso |
| 12 · Porque cuadra | `method-migration-reconcile` | `method` | migrar con datos existentes | los números cuadran; datos de muestra marcados |
| 13 · Una decisión | `decision-diagnosis-verdict` | `next-steps` | lo que entrega primero el diagnóstico de una práctica de plataforma | veredicto de tres (fit, condicionado con su condición, no fit); «Datos de muestra» |
| 14 · Por olas | `method-waves` | `method` | cómo se suma un agente u otro cambio de operación | cuatro olas que se prueban; la trayectoria de luz es la órbita; ícono de producto opcional con autorización |
| 15 · Sin sorpresas | `content-day-release-cycle` | `content` | el cliente aprueba releases de una plataforma | ciclo fijo sandbox → pruebas → tu aprobación → producción |
| 16 · A su ritmo | `content-day-live-library` | `content` | activación y adopción | Loom sólo porque está en el stack real; «Datos de muestra» |
| 17 · Lo operamos | `content-day-live-console` | `content` | la operación gestionada después del go-live (también QBR) | cada cifra con su detalle; un control en curso; «Datos de muestra» |
| 18 · Lo medimos | `content-measure-formulas` | `content` | cómo se sabrá si funciona | sin cifras; fórmula, fuente y dueño (un rol) |

**Datos de recetas existentes** (campo `approvedUses`, con su `fit`): 01 → `cover-brochure-line-revenue` · 02 →
`proposal-cinematic-revops` · 19 → `close-proposal-horizon` · alternativa de la 02 → `proposal-service-revops`. Dos
pasan un largo (la pregunta de la 02 y dos pasos de la sobria): el `fit` de cada una lo detalla y la decisión es del
composer con el operador. **Las cuatro que no cabían en los slots de su receta** (13, 14, 17 y 09) son recetas propias
desde el 2026-09-29, por decisión del operador; las recetas de las que se registraban como datos
(`decision-diagnosis-map`, `method-staircase`, `content-day-live-results`, `content-day-live-progress`) no cambian y
apuntan a la nueva en su `preferInstead`. Condiciones de terceros: la autorización escrita de Salesforce (y de
Anthropic en la 10) está pendiente de archivar; el badge de partner es un claim bloqueante hasta su readback.

**Dos documentos, dos cierres (decisión del operador, 2026-09-29).** El mismo recorrido se entrega como brochure o
como propuesta, y los dos planes validan con `pnpm brand:deck-plan -- --plan` (4 avisos `recipe-without-template`, sin
errores); están como fixtures en `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/`:

| Documento | Portada | Cierre | Plan |
|---|---|---|---|
| Brochure | `cover-brochure-line-revenue` (SF0, plate NXSF2) | `close-brochure-orbit` en la línea `revenue-salesforce`: «¿Conversamos? Cuando quieras.» + «Empower your Revenue» como firma, logo a 500 px. **La lámina todavía no existe:** la compone el composer desde la receta y necesita el visto bueno del operador | `golden-brochure-salesforce.json` |
| Propuesta | `cover-proposal-orbit` (sin foto, con el logo del cliente) | `close-proposal-horizon` (SF19, composición `sloganBlock`: logo a 700 px en top 220 y el eslogan en bloque al 64 %) | `golden-proposal-salesforce.json` |

Las láminas 02 a 18 son las mismas en los dos; en un brochure evergreen se quita la 07 (temporada). Los plates van por
`plateRef` (NXSF2 en la portada, NXSF1 en la 02, NXSF3 en la contraportada de propuesta) porque las recetas de línea
comparten su plate de catálogo (`plate-repeated`). **El logo de 700 px es sólo de la contraportada Salesforce**; las
contraportadas del 2026-09-27 siguen con el logo a 500 px.

**Deck HubSpot pendiente:** [TASK-1943](../../../tasks/to-do/TASK-1943-hubspot-deck-content-series.md).

## El deck SEO/AEO (aprobado el 2026-09-30)

El deck de la práctica SEO/AEO, sobre **Search Visibility 360 (SV360)** y sus piezas (AEO Assessment, AI Visibility
Report y Efeonce Insights), en línea Engine y en tres documentos: **completo** (33 láminas, brochure extendido),
**brochure** (24) y **propuesta** (29), con cinco capítulos (el problema · SV360 y SEO · AEO · cómo trabajamos · por qué
nosotros). Recorrido completo, reglas y pendientes: [norma §4.6, «Deck SEO/AEO»](../EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck).
Task: [TASK-1949](../../../tasks/in-progress/TASK-1949-seo-aeo-deck-recipes-canonization.md). Fuente de hechos:
`ai-generations/2026-09-29_deck-seo-aeo-documentos/CANON-INVENTARIO.md` y `DECISIONES.md`.

| Lámina (C · B · P) | id | Familia | Cuándo usarla | Qué no se negocia |
|---|---|---|---|---|
| 07 · 06 · 06 · Cuatro piezas | `content-brand-family` | `content` | abrir la parte de producto: qué hay dentro de SV360 antes de explicar cada pieza | lockups oficiales, nunca dibujados; `productMark` obligatorio; una fila por pieza que el cliente de verdad recibe |
| 10 · 08 · 09 · Todo esto | `content-service-mockups` | `content` | justo después de presentar al equipo: qué hace, en concreto | maquetas nativas grandes, nunca capturas chicas; cifras de la maqueta ilustrativas; autoridad con tipos de medio reales, sin granjas de enlaces |
| 22 · 16 · 17 · Como la necesites | `content-report-formats` | `content` | después de `content-day-live-results`: cómo llega la edición mensual | informe vivo en interfaz blanca; rivales genéricos; en este deck, los formatos tal cual (decisión 15) |
| 23 · 17 · 18 · Ya está | `content-committee-deck` | `content` | cuando el comité o el directorio decide la inversión | el titular lo escribe la IA y lo revisa el equipo; en este deck, tal cual (decisión 15) |
| 27 · 20 · 21 · Por dentro | `content-industries` | `content` | mostrar que el equipo entiende el negocio del cliente; su industria destacada | preguntas de ejemplo; nunca afirma casos por industria ni nombra a un competidor real |
| 28 · 21 · 22 · Cinco países | `content-markets` | `content` | cliente regional o multinacional; cerrar el «por qué nosotros» con la escala | países de `EFEONCE_OPERATING_MARKETS`; mercados, nunca oficinas; un nodo por país en el plate MK2 |

Las seis **no tienen plantilla todavía**: el plan avisa `recipe-without-template` y el PDF aprobado las hornea fuera
del compositor (`render-src/bake.cjs`) hasta el Slice 2 de TASK-1949.

**Datos de recetas existentes** (campo `approvedUses`, con su `fit`): 27 usos en 25 recetas, entre ellos la portada de
línea y la de propuesta con el logo SV360, `section-split` con el plate SX4, `section-cine-team` con la bajada del
equipo, las propuestas SEO y AEO (de cine y sobrias) con su lockup, `proposal-cinematic-web` con el plate DV1, los
«vívelo», los tres `decision-case` (BICECORP, Banco BICE y Berel) y `content-clients` con la selección «SEO». Cuatro
pasan un largo de su receta y el `fit` lo dice (portada de línea, portada de propuesta, `content-day-tools` y la AEO de
cine); subir el máximo o acortar se decide en el Slice 2 con el operador.

**Slots opcionales nuevos** (ninguna receta cambia `contentType` ni slots previos):

- `productMark`: el lockup de submarca de `@efeoncepro/axis-brand-assets` (lista cerrada: `sv360-lockup-negative`,
  `sv360-logo-negative`, `aeo-lockup-negative`, `aeo-assessment-lockup-negative`,
  `ai-visibility-report-lockup-negative`, `insights-lockup-negative`), sólo donde la lámina habla de esa pieza.
- El eyebrow de `proposal-cinematic-seo` y `-aeo` declara `requiredUnless: "productMark"`: con el lockup, el eyebrow
  sale y el lockup ocupa su lugar.
- `section-cine-team.body`: la bajada con los roles del equipo en personas.

Hasta que la plantilla los tenga, `recipe-slot-parity.test.ts` los lista en `PENDING_TEMPLATE_SLOTS` (temporal; la
prueba falla si una entrada ya está mapeada).

**Tres planes validados** en `src/lib/brand-surfaces/deck-recipes/__tests__/fixtures/`: `golden-completo-seo.json`,
`golden-brochure-seo.json` y `golden-proposal-seo.json` (0 errores; sólo los seis avisos de las láminas nativas). Los
intents de documento aprobados están como ejemplos en `src/lib/brand-surfaces/examples/deck-seo-{completo,brochure,propuesta}-document.json`
(sin las seis nativas todavía).

**Los datos quedan tal cual (decisión del operador, 2026-09-30):** «Deja esos datos... No marques nada en el deck como
provisional, asumo la responsabilidad.» Las cifras de los tres casos, su fuente, los formatos de Insights, las
industrias y la cifra de Bresler se usan como están, sin marca de «provisional» ni «próximamente»; un agente no los
rotula ni los quita. En este deck, esa decisión manda sobre las reglas de receta «sólo formatos vivos» y «cifras
ilustrativas». Contexto (sólo registro, en `DECISIONES.md`): las cifras reales de los casos no se han cargado; al
2026-09-30 el correo de Insights que llega solo no está vivo y el modo presentación no se ha probado con una edición
real. Los logos de BICECORP, Banco BICE y Berel siguen condicionados a su autorización (TASK-1937).

## Anatomía de una receta (campos del JSON)

| Campo | Para qué |
|---|---|
| `id`, `board`, `name`, `family`, `documents`, `surface`, `status` | identidad; `id` reutiliza el de AXIS cuando la lámina ya existe allí; `board` es el nombre de la lámina en el canvas |
| `communicates` | la idea que deja en quien la ve, en una frase |
| `useWhen` · `avoidWhen` · `preferInstead` | cuándo sí, cuándo no y qué receta conviene en su lugar (con su «cuándo») |
| `pairsWith` | pares `cover↔close`, `variant` y `sequence` |
| `slots` | data slots del Artifact Composer: `name`, `type` (`text`, `richText`, `number`, `metric`, `list`, `image`, `logo`, `person`, `money`, `date`, `enum`, `section`), `required`, `requiredUnless` (desde 2026-09-30: obligatorio salvo que otro slot venga; hoy sólo el eyebrow de `proposal-cinematic-seo`/`-aeo` con `productMark`), `maxChars` medido, `example`, `notes` |
| `fixed` | lo que no se edita: órbita, firma, burbuja, grilla, estilo de fichas |
| `selection` | `none`, `collaborator`, `local-cta` o `multi`, con su etiqueta y su objetivo (contrato AXIS `efeonce.collaboration-selection`) |
| `photo` | registro, plate, ficha, prompt compilado, post-proceso (`foto:isotipo`, `foto:emblema`) y qué se reemplaza por cliente |
| `prompts.composition` | el prompt para componer la lámina desde datos, con tokens AXIS y medidas del canon, sin HEX ni px crudos |
| `renderSource` · `reference` · `referenceSource` | el prototipo de dirección que la compuso y la referencia aprobada (en AXIS: `references/surfaces/deck/<id>.jpg`) |
| `rules` · `notes` | reglas que la lámina hace cumplir y matices del operador |
| `approvedUses` (opcional, desde 2026-09-29) | láminas aprobadas que son datos de la receta (decks Salesforce y SEO/AEO): contenido por slot, foto con ficha y prompt, selección, respaldo sin badge, condiciones y `fit` (qué cabe en los slots y qué no). No lo lee el runtime |

## Reglas transversales

- **Una sola órbita por lámina**; la esfera cierra la respuesta y nunca va como viñeta. La luz de una foto de cine
  cuenta como la órbita de la lámina.
- **Ningún texto cruza la órbita ni al sujeto.** Si no cabe, se acorta la frase; no se mueve la órbita ni la foto.
- **Voz de la línea:** eyebrow · pregunta (con anillo) · respuesta de una a tres palabras con **una** esfera, al menos
  **3×** la pregunta · evidencia con **una** palabra en negrita. En el tríptico la respuesta se reparte en tres
  palabras, una por toma, cada una con su esfera (decisión 2 de abajo).
- **Fondo Efeonce siempre**; la línea de servicio sólo aporta su acento. El acento nunca en texto de menos de 24 px.
- **Portada con foto ⇄ contraportada sin foto** (y al revés). Propuesta: portada sin foto con el logo del cliente dentro
  de la órbita y contraportada con foto y «Empower your Growth». Brochure: portada con foto y contraportada con
  «¿Conversamos? Cuando quieras.». El eslogan nunca va en la portada. Logo de Efeonce a 500 px en portadas.
- **Lámina con foto a sangre sin logo**; el pie de las láminas lleva sólo la burbuja URL.
- **Registro cine** sólo con Nexa protagonista, en `proposal-cinematic` y, desde el 2026-09-27, en las **secciones y
  láminas «about»** aprobadas (decisión 4).
- **Isotipo del uniforme siempre compuesto** (`pnpm foto:isotipo`, revisado con `pnpm foto:emblema`), nunca el del
  modelo.
- **Montos como `[MONTO]`** hasta la propuesta; cifras sólo con fuente; fotos de ejemplo marcadas para reemplazo
  (caso Sky); selección y cursores sólo con el contrato AXIS, una sola selección por lámina.
- **Datos de muestra siempre marcados.** «Ejemplo ilustrativo» (`decision-ai-answer`) y «Datos de muestra»
  (`decision-diagnosis-map`) no se quitan mientras los datos no sean del cliente; cuando lo sean, el cambio exige un
  hecho con `evidenceRef` (TASK-1930).
- **Interfaz de IA genérica.** Ninguna lámina imita el cromo de ChatGPT, Gemini u otro motor (logo, color, burbuja,
  composer). Los nombres de los motores pueden ir como texto en `decision-diagnosis-map`. La interfaz real son los
  recursos AEO candidatos de AXIS, no estas recetas.
- **Logos de terceros en un tono y con el mismo peso**; en `content-clients`, navy con la excepción tonal de Aguas
  Andinas y UC Temuco.

## Decisiones del operador (2026-09-27)

Registradas en la [norma §4.6](../EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) y en
`ai-generations/2026-09-27_deck-recetas/DECISIONES.md`. Si una nota del JSON contradice una decisión, **manda la
decisión** (ver «Notas del JSON que quedaron atrás»).

1. **Las 69 láminas están aprobadas.** Lo que el canon o AXIS marcaban como opción, prueba u «opción sin elegir» pasa a
   aprobado: lente, sangre, partida, foco, respiro, hoja de contactos, secciones cine (servicios y equipo), las tres
   portadas generales del brochure y la de cinco líneas con selección y cursor de Nexa
   (`cover-brochure-cine-lines-selection`). Esta última compone desde el 2026-09-28 con el layout
   `document-selection` (el operador relajó la regla «sin selección en cover-brochure»; AXIS 0.3.21).
2. **Tríptico:** una palabra por toma, cada una con su esfera: «Escucha.» «Crea.» «Mide.». Reemplaza la frase única con
   la esfera al final.
3. **Sección partida, las tres variantes:** el indicador sube por la **izquierda** y la esfera queda **arriba a la
   izquierda**. Variantes aprobadas: esquina arriba (`section-split`), esquina abajo (`section-split-corner-bottom`) y
   panel a la derecha (`section-split-panel-end`). La variante con la órbita a la derecha quedó descartada. El
   indicador barre las secciones ya recorridas, (n−1) de N; queda abierta para el operador la pregunta de unificarlo
   a n de N.
4. **Fotos de las secciones partidas y de «Quiénes somos» / «Por qué lo hacemos»:** aprobadas con personas en luz
   dramática. Son una **excepción aprobada del registro cine para secciones y láminas «about»**; no amplían el cine a
   otras superficies.
5. **Cotización:** tres variantes aprobadas (tabla, en escena 3D, en vivo). Montos siempre `[MONTO]`.
6. **Día a día:** cuatro momentos (`content-day`) + la alternativa con herramientas (`content-day-tools`) + dos «vívelo»
   (`content-day-live-progress`, avanza a la vista; `content-day-live-results`, resultados en vivo).
7. **Próximos pasos:** la versión con impacto (la agenda del diagnóstico abierta y el cursor en «Agenda un
   diagnóstico») reemplaza la de tres columnas.
8. **Clientes:** un solo tono navy; Aguas Andinas y UC Temuco en tonos de navy para conservar sus formas.
9. **Caso Sky:** la foto es de **ejemplo** y se reemplaza por una real del caso.
10. **BeX:** la escalera (`method-staircase`) es la principal; la plana (`method-staircase-flat`) es la variante.

### Decisiones del operador (2026-09-28, TASK-1934)

1. **Las nueve láminas SEO/AEO están aprobadas** con los ids y familias de la tabla «Las láminas SEO/AEO». No nace la
   familia `decision`: `decision-difference` va en `proof`.
2. **Alternativas nunca juntas:** la regla vale para **todos** los pares `variant` del catálogo, seguidos o no (portada
   y cierre siguen en `frame-count`). Por eso el golden de pitch cambió `content-text` por `content-measure`.
3. **`next-steps-after-diagnosis` rige por familia `next-steps`:** incluye el mapa del diagnóstico.
4. **SEO y AEO son servicios distintos**, no variantes.
5. **La propuesta SEO de cine es fiel a la referencia:** la nota del pie y la bajada bajo la selección.
6. **3× en las respuestas:** las de DeckIARespuesta, DeckDiferencia y DeckEEAT suben a 120 px; en DeckIARespuesta la
   ventana trasera se corre a 860 y se angosta a 450 para que la respuesta no la toque.

### Decisiones del operador (2026-09-29, deck Salesforce, TASK-1942)

1. **Las 19 láminas del deck Salesforce están aprobadas**: dieciséis recetas nuevas (doce en la primera ronda y las
   cuatro que no cabían en recetas existentes: `decision-diagnosis-verdict`, `method-waves`, `content-day-live-console`
   y `content-day-live-approval`) y cuatro datos de recetas existentes (01, 02, 19 y la alternativa de la 02).
2. **La línea `revenue-salesforce` pasa a aprobada** en la portada de línea (`cover-brochure-line-revenue`).
3. **Eslogan en bloque** bajo el logo al 64 % de su ancho en `close-proposal-horizon` (regla dura 8 de la línea);
   cierra el delta de TASK-1933 para esa receta.
4. **Badge, Agent Astro, Claude y Claudeforce** son slots opcionales condicionados, nunca fijos.
5. **Dos cierres:** como brochure, `close-brochure-orbit` en la línea `revenue-salesforce`; como propuesta, SF19
   (`close-proposal-horizon`, composición `sloganBlock`).
6. **Logo de 700 px sólo en la contraportada Salesforce**; las del 2026-09-27 siguen a 500 px.
7. **Servicio de la lámina 10: «Enablement conversacional»** (eyebrow «Claudeforce · Enablement conversacional»).
8. **Columna de la portada en 190**, como se aprobó: AXIS `v0.3.32` le da a la línea `revenue-salesforce` su propia
   reserva del logo (190–300) sin tocar la de las demás portadas.

### Decisiones del operador (2026-09-30, deck SEO/AEO, TASK-1949)

Registradas en `ai-generations/2026-09-29_deck-seo-aeo-documentos/DECISIONES.md` («esto está aprobado todo»).

1. **SEO al mismo nivel que AEO:** SV360 es la marca paraguas; sus piezas son AEO Assessment, AI Visibility Report y
   Efeonce Insights, con su lockup en las láminas que corresponden (`productMark`).
2. **La AEO de cine va sin eyebrow** y el lockup Efeonce | AEO en su lugar (`requiredUnless`).
3. **Estilo «vive»** en las láminas nativas: plataforma de luz, fichas de vidrio en perspectiva, una sola sombra profunda
   en la protagonista y haces de luz.
4. **Nada de capturas chicas de la web:** los servicios se muestran con maquetas nativas grandes y legibles.
5. **Insights cuenta el valor** (sin armar el PPT, en vivo, con lectura escrita por la IA) y el informe vivo va en
   interfaz blanca.
6. **Día a día:** herramientas + «vívelo» 1 (Notion y Frame.io con una landing en revisión) + «vívelo» 2 (resultados).
7. **Secciones de cine:** «Quiénes somos», «Nuestro equipo» (con la bajada de roles en personas) y la sección partida
   con la imagen de búsqueda y composer (SX4). Rechazada la sección del dolor: ataca al cliente.
8. **Una sola sección partida por deck.**
9. **Navegación por cinco capítulos**, el mismo `progress.sections` en todas las páginas.
10. **Desarrollo end to end** con una persona de Efeonce (`proposal-cinematic-web`, plate DV1).
11. **Casos:** BICECORP, Banco BICE y Berel.
12. **Industrias** (seis, con la pregunta que ese comprador le hace a la IA) y **mercados** (cinco) de forma épica.
13. **Anotaciones fuera del deck;** se quedan las marcas que exige el contrato (`mark`, `sampleMark`, `report.sample`).
14. **Imágenes de ambiente para casos de cliente** en puesta en escena; el logo del cliente se compone desde el archivo
    oficial, nunca lo genera el modelo.
15. **Los datos quedan tal cual:** «Deja esos datos... No marques nada en el deck como provisional, asumo la
    responsabilidad.» Cifras de los casos, su fuente, formatos de Insights, industrias y la cifra de Bresler, sin marca
    de «provisional» ni «próximamente».

### Notas del JSON que quedaron atrás

El JSON se escribió antes de que el operador cerrara estas decisiones. Estas notas se leen a la luz de la lista de
arriba (el JSON no se corrigió en este cambio):

- `triptych.notes` todavía dice «contradicción a resolver»: quedó resuelta por la decisión 2.
- `section-split-corner-bottom.notes` y `section-split-panel-end.notes` dicen que la excepción cine «no está escrita»:
  quedó escrita (decisión 4, registro cine y norma §4.6).
- Varias `notes` citan que §4.6 o el token AXIS tratan una lámina como «opción» o «prueba»: la norma ya dice
  aprobado (decisión 1). TASK-1927 integró en Greenhouse el contrato 0.1.2 con 31 recetas y TASK-1928 sumó las 38
  restantes (AXIS `axis-tokens` 0.3.20, `axis-ui-contracts` 0.3.18). La portada con selección llegó con AXIS
  `v0.3.21` (`axis-tokens` 0.3.21, `axis-ui-contracts` 0.3.19). Las nueve láminas SEO/AEO llegaron con `v0.3.22` y
  las medidas de sus plantillas con `v0.3.23` (`axis-tokens` 0.3.23, `axis-ui-contracts` 0.3.21), que es lo que fija
  hoy Greenhouse.
- Varias recetas citan `cover-classic` o `close-classic` como alternativa (`preferInstead`): el marco clásico no fue
  aprobado y no se usa.
- `content-report-formats.avoidWhen` y `.notes` dicen que el correo, el PDF A4 y el deck 16:9 están «por verificar»:
  la sesión de Insights los verificó el 2026-09-30 (web y celular, PDF A4 y deck 16:9 vivos; modo presentación
  desplegado sin probar; correo que llega solo no vivo). En el deck SEO/AEO la lámina va tal cual por decisión del
  operador (decisión 15); el estado queda como registro (norma §4.6, «Deck SEO/AEO»).

## Pendientes de QA

No bloquean la aprobación de las láminas. Se corrigieron al llevar cada receta a plantilla: TASK-1927 con las suyas y
TASK-1928 con las 38 restantes. Lo que sigue abierto está al final.

### Resueltos por TASK-1927

| Pendiente | Dónde | Cómo quedó |
|---|---|---|
| Respuesta bajo 3× la pregunta | contraportadas de brochure («Cuando quieras.») | la plantilla usa el valor del token y la respuesta queda sobre 3× la pregunta (3,1×) |
| Dirección de contacto | contraportadas de brochure y de propuesta | el contacto sale de `EFEONCE_CONTACT` (`src/config/efeonce-brand.ts`); AXIS sólo define el estilo |
| Plantillas en la versión anterior | `proposal-cinematic`, `section-split`, `triptych` | `pnpm brand:compose` compone sobre el contrato 0.1.2: prueba opcional en la página de servicio, layouts `hero` y `lines`, sección partida por la izquierda en sus tres composiciones y tríptico de una palabra por toma |

### Resueltos por TASK-1928

La plantilla aplica la norma sobre la referencia aprobada. Donde la referencia y la norma chocaban, manda la norma.

| Pendiente | Dónde | Cómo quedó (decisión) |
|---|---|---|
| Acento en texto de menos de 24 px | kickers «Recomendado» y cabecera de la cotización en vivo (`content-pricing*`), «01 · Diagnóstico · Sin costo» (`decision-next-steps`), kicker de las propuestas sobrias (`proposal-service-*`), rol del interlocutor (`content-team`), rótulos de los pilares de «por qué lo hacemos» (`section-cine-purpose`), rótulo «Revisamos contigo» del reloj (`content-day`), etiqueta de la tarjeta en revisión (`content-day-live-progress`) | **D1:** ese texto va en navy sobre papel o en el texto claro sobre oscuro, nunca en el acento de la línea. La auditoría renderizada del gate lo mide en todos los frames |
| Respuesta bajo 3× la pregunta | cotización (`content-pricing`, `-stage`, `-live`), clientes (`content-clients`), plan (`decision-plan`), partners (`content-partners`) y testimonio (`decision-testimonial`) | **3×:** la respuesta sube a 120 px (antes 118 en las cotizaciones, 116 en clientes, 112 en el plan, 110 en partners y 104 en el testimonio). La auditoría renderizada del gate mide la proporción en las cotizaciones, clientes, plan y partners |
| Cifras sin fuente visible | clientes (+127 %, +180 %), por qué elegirnos, «quiénes somos», prueba de Sky (`content-focus`) | **fuentes visibles:** toda cifra llega por `figures` del contrato, con valor, rótulo y fuente obligatoria, y la lámina imprime «Fuente: …». Una cifra sin fuente la rechaza AXIS. El foco, que imprimía «Datos de muestra», ahora cita el caso publicado de Sky |
| Logo chico en secciones de cine | `section-cine-services`, `section-cine-team` | **sin logo en láminas interiores con foto:** la plantilla retira el logo que venía de cuando eran portadas y el eyebrow vuelve al margen |
| Degradado sobre el plate (velo) | `section-cine-about`, `section-cine-purpose` | **sin velo:** la plantilla no pinta capa de degradado sobre la foto (regla `no-scrim` en AXIS) |
| Montos | cotización (`content-pricing*`) | **montos como marcador:** la plantilla imprime siempre `[MONTO]`; el intent no trae montos |
| Dirección de contacto | próximos pasos (`decision-next-steps`) | **contacto desde `EFEONCE_CONTACT`**, nunca desde el intent |
| Sin burbuja URL en el pie | partners (`content-partners`) | **burbuja URL** en el pie |

### Resuelto el 2026-09-28

| Pendiente | Dónde | Cómo quedó |
|---|---|---|
| Selección en la portada de cinco líneas | `cover-brochure-cine-lines-selection` | el operador relajó la regla «sin selección en cover-brochure». AXIS `v0.3.21` sumó a `cover-brochure` el layout `document-selection`: la misma columna y foto que `document`, selección de ocho tiradores sobre la respuesta («Crecer.»), nunca sobre la persona, y un solo cursor «Nexa» abajo al final. La respuesta baja 28 px y la evidencia queda 130 px debajo; logo arriba en 200. `document` y `line` siguen rechazando la selección (`selection-not-in-recipe`). Como la portada de cinco líneas de TASK-1927, firma con el logo y no lleva burbuja URL |

Otras decisiones que la plantilla aplica: las **barras** de `decision-chart` salen de su número (índice, antes = 100);
los **logos de terceros** se normalizan al componer (un tono y el mismo peso óptico), con la excepción tonal de Aguas
Andinas y la UC de Temuco; el **stack** (`content-stack`) no pinta los «pilares de luz» del guion, porque en la
referencia aprobada nunca se vieron.

### Abiertos

La aprobación visual de las seis familias de TASK-1928 y de la portada con selección la dio el operador el 2026-09-28.

| Pendiente | Dónde | Estado |
|---|---|---|
| Logo dentro de la órbita en el cierre | contraportadas | **sin resolver**: ninguna contraportada aprobada lo lleva así; las aprobadas ponen el logo arriba de la columna (norma §6, fila 17) |
| Isotipo sin registro de procedencia | plates `b` (NX6b, CR2b, WB1b, RV1b, BR2b…); HW1, T2, T3, H2, LN4 y CR4 sin isotipo compuesto (en `CR4` el bordado ya era el oficial y la `b` de `foto:isotipo` traía un parche: registro cine §16.7) | pasar por `pnpm foto:emblema` (y `foto:isotipo` si difiere) antes de publicar |
| Plate repetido | P1 en lente, sangre, contenido con foto y hoja de contactos | regla de uso: no repetirlo en un mismo deck. **Resuelto el 2026-09-28** el caso de `cover-brochure-line-brand`, que repetía `CR2b` con `proposal-cinematic-creative`: la portada tiene su plate propio, `CR4` ([registro cine §16.7](../../brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#167-cr4-el-squad-te-la-entrega-cambiar-el-plate-de-una-pieza-aprobada-sin-perder-su-concepto)) |

Diferencias conocidas de las plantillas del marco contra los prototipos aprobados (el operador aprobó a ojo las
láminas compuestas el 2026-09-27): «Cuando quieras.» sale algo más grande que en el prototipo porque usa el valor del
token; la burbuja URL sale horneada en vez de la de luminosidad; la caja de selección sale del pintor canónico y queda
unos píxeles más ajustada.

#### Abiertos de las nueve SEO/AEO (TASK-1934)

| Pendiente | Dónde | Estado y dueña |
|---|---|---|
| Frames del gate a 0 px | las siete plantillas nuevas y el re-congelado de `ProposalCinematic` (la nota del pie mueve su probe) | **Resuelto el 2026-09-28** en `c652f4f83`: el operador aprobó a ojo las nueve láminas y la nota del pie de la plantilla cine; los ocho frames se congelaron con `--freeze` single-owner, declarados en `BASELINE_DELTAS.md` (o). El gate queda en 73 frames a 0 px. Dueña: TASK-1934 |
| Cifra escrita como texto plano | un slot `metric` que trae «68 %» como texto | `figure-source-missing` sólo detecta una cifra escrita como objeto con `value`; una cifra en texto plano pasa sin fuente. Escríbela como objeto con `source` para que el validador la vea. Abierto, sin task dueña |
| Camino «ausente» de un slot opcional nuevo | toda plantilla compartida que suma un slot opcional (caso: la nota del pie de `proposal-cinematic`) | el probe del gate siempre rellena los slots opcionales, así que el gate **nunca ejercita** una receta existente sin el slot, y los snapshots de planes no renderizan. La nota emitía sus medidas sólo con nota y rompía la propuesta creativa sin nota (gl-css «undefined»); lo encontró el operador, no el gate. **Corregido** en `af32d9353` con `src/lib/brand-surfaces/__tests__/proposal-cinematic-note.test.ts`. Regla vigente: todo slot opcional nuevo lleva un test que compone una receta existente sin él (misma clase de hueco que `CoverBrochure` con selección, TASK-1928) |
| Las cinco `proposal-cinematic` sin mapa de slots | `proposal-cinematic-{creative,web,aeo,revops,seo}` (`slots: null` en `recipe-map.json`) | mapearlas juntas en `recipe-map.json`. Mientras tanto, la plantilla cine admite textos más largos que los de cada receta y el freno es `validateDeckPlan` (`slot-over-max-chars`), probado con un fixture adversarial. Dueña: TASK-1933 |
| Plate SE1 fuera del banco | `proposal-service-seo`, `proposal-cinematic-seo` | declarado por ruta local (`ai-generations/2026-09-28_deck-seo-aeo/plates/SE1-te-encuentran-isotipo.png`), como los plates de las 69 recetas anteriores; se siembra en el banco de TASK-1931 |

## Qué sale hoy con un comando

**94 de las 100 recetas caen en una plantilla** del catálogo `graphic-line-deck` del Artifact Composer (73 plantillas
en `registry.json`) y salen con `pnpm brand:compose`. La columna «Plantilla» del índice lo dice por receta y se lee de
`registry.json`; `recipe-map.json` no tiene recetas `blocked`. Las últimas con plantilla fueron las dieciséis del deck
Salesforce (TASK-1942); las seis del deck SEO/AEO la esperan (TASK-1949 Slice 2). Las nueve SEO/AEO del 2026-09-28,
en la tabla de abajo.
Antes, `cover-brochure-cine-lines-selection` (2026-09-28): contentType `deck.cover-brochure.document-selection`, sobre la misma plantilla `CoverBrochure`, que marca
la respuesta como objetivo de la selección y tiene un slot `selection` opcional.

- [TASK-1927](../../../tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) (`complete`) cubrió
  31 recetas: el marco (portadas y contraportadas), las secciones clásica y partida, la medida, el tríptico, la
  escalera y las propuestas de cine. Treinta tuvieron plantilla ahí; la trigésimo primera, la portada con selección,
  compone desde el 2026-09-28 con el layout `document-selection` (AXIS `v0.3.21`).
- [TASK-1928](../../../tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md) sumó las otras 38
  en seis familias, sobre 34 plantillas nuevas: las cuatro `proposal-service-*` comparten
  `ProposalService`, y `section-cine-team` y `section-cine-services` comparten `SectionCine`.
- [TASK-1934](../../../tasks/in-progress/TASK-1934-seo-aeo-deck-slides-recipe-catalog-templates.md) (en curso) sumó
  las nueve láminas SEO/AEO: siete plantillas nuevas y dos recetas que reutilizan plantillas existentes
  (`proposal-service-seo` → `ProposalService`; `proposal-cinematic-seo` → `ProposalCinematic`, layout `service`).

TASK-1927 y TASK-1928 están `complete` y empujadas a `develop`. La ruta productiva gobernada (API, `artifact-worker`,
MCP) es [TASK-1921](../../../tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md), en curso:
todavía no está disponible.

### Dos nombres para la misma lámina

El **id del catálogo** nombra la lámina aprobada (`section-split-corner-bottom`, `cover-brochure-line-voice`). El
**intent** que se compone usa la **receta del contrato de AXIS** (`efeonce.surface-composition`) y su `layout`
(`section-split` + `corner-bottom`, `cover-brochure` + `line`). Varias láminas del catálogo comparten una receta de
AXIS y se distinguen por el `layout`, la línea, la foto y el copy del intent. El `layout` se copia tal como viene en
el ejemplo: va explícito cuando la receta tiene varias composiciones; cuando el ejemplo no lo trae, la receta tiene una
sola o resuelve la de por defecto (`section-split` → `corner-top`, `section-cine` → `team`).

Los ejemplos viven en `src/lib/brand-surfaces/examples/`. Las recetas de TASK-1927:

| id del catálogo | Receta AXIS | `layout` | `use` | Intent de ejemplo |
|---|---|---|---|---|
| `cover-brochure-cine-orbit` | `cover-brochure` | `document` | brochure | `deck-cover-brochure-cine-orbit-intent.json` |
| `cover-brochure-cine-lines` | `cover-brochure` | `document` | brochure | `deck-cover-brochure-cine-lines-intent.json` |
| `cover-brochure-cine-team` | `cover-brochure` | `document` | brochure | `deck-cover-brochure-cine-team-intent.json` |
| `cover-brochure-cine-lines-selection` | `cover-brochure` | `document-selection` | brochure | `deck-cover-brochure-cine-lines-selection-intent.json` (contentType `deck.cover-brochure.document-selection`, plantilla `CoverBrochure`) |
| `cover-brochure-line-growth` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-growth-intent.json` |
| `cover-brochure-line-brand` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-brand-intent.json` |
| `cover-brochure-line-engine` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-engine-intent.json` |
| `cover-brochure-line-voice` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-voice-intent.json` |
| `cover-brochure-line-revenue` | `cover-brochure` | `line` | brochure | `deck-cover-brochure-line-revenue-intent.json` |
| `cover-proposal-orbit` | `cover-proposal` | `orbit` | proposal | `deck-cover-proposal-orbit-intent.json` (sin `clientLogo`: sale el marcador) |
| `cover-proposal-orbit-sky` | `cover-proposal` | `orbit` | proposal | `deck-cover-proposal-orbit-sky-intent.json` (con `clientLogo`) |
| `cover-proposal-dawn` | `cover-proposal` | `dawn` | proposal | `deck-cover-proposal-dawn-intent.json` (sin `clientLogo`: sale el marcador) |
| `cover-proposal-dawn-sky` | `cover-proposal` | `dawn` | proposal | `deck-cover-proposal-dawn-sky-intent.json` (con `clientLogo`) |
| `close-brochure-orbit` | `close-brochure` | `orbit` | brochure | `deck-close-brochure-orbit-intent.json` |
| `close-brochure-horizon` | `close-brochure` | `photo` | brochure | `deck-close-brochure-horizon-intent.json` |
| `close-brochure-dawn` | `close-brochure` | `photo` | brochure | `deck-close-brochure-dawn-intent.json` |
| `close-proposal-horizon` | `close-proposal` | — | proposal | `deck-close-proposal-horizon-intent.json` |
| `close-proposal-dawn` | `close-proposal` | — | proposal | `deck-close-proposal-dawn-intent.json` |
| `section-classic` | `section-classic` | — | — | `deck-section-classic-intent.json` |
| `section-split` | `section-split` | `corner-top` (o sin layout) | — | `deck-section-split-intent.json` |
| `section-split-corner-bottom` | `section-split` | `corner-bottom` | — | `deck-section-split-corner-bottom-intent.json` |
| `section-split-panel-end` | `section-split` | `panel-end` | — | `deck-section-split-panel-end-intent.json` |
| `content-measure` | `content-measure` | — | — | `deck-content-measure-intent.json` |
| `triptych` | `triptych` | — | — | `deck-triptych-intent.json` |
| `method-staircase` | `method-staircase` | — | — | `deck-method-staircase-intent.json` |
| `proposal-cinematic-creative` | `proposal-cinematic` | `service` | proposal o brochure | página de servicio en `deck-brochure-document.json` y `deck-proposal-document.json` |
| `proposal-cinematic-web` | `proposal-cinematic` | `service` | proposal o brochure | ídem |
| `proposal-cinematic-aeo` | `proposal-cinematic` | `service` | proposal o brochure | ídem |
| `proposal-cinematic-revops` | `proposal-cinematic` | `service` | proposal o brochure | ídem |
| `proposal-cinematic-nexa` | `proposal-cinematic` | `hero` | proposal o brochure | `deck-proposal-cinematic-hero-intent.json` |
| `proposal-cinematic-nexa-lines` | `proposal-cinematic` | `lines` | proposal o brochure | `deck-proposal-cinematic-lines-intent.json` |

«—» en `use` significa que el ejemplo no lo declara y AXIS resuelve el de la receta.

### Las recetas de TASK-1928

Cada una tiene su intent de ejemplo en `src/lib/brand-surfaces/examples/deck-<id del catálogo>-intent.json` (por
ejemplo, `deck-content-pricing-live-intent.json`). Los 38 ejemplos declaran `use: proposal`. Como en la tabla de
arriba, el intent pide la receta de AXIS y su `layout`; el `contentType` lo deriva `src/lib/brand-surfaces` del
manifest y el autor no lo escribe. Las cuatro propuestas sobrias usan la misma receta y se distinguen por `line` y
por el copy.

| Familia | id del catálogo | Receta AXIS | `layout` | Plantilla |
|---|---|---|---|---|
| Propuestas sobrias | `proposal-service-aeo` | `proposal-service` | — | `ProposalService` |
|  | `proposal-service-creative` | `proposal-service` | — | `ProposalService` |
|  | `proposal-service-web` | `proposal-service` | — | `ProposalService` |
|  | `proposal-service-revops` | `proposal-service` | — | `ProposalService` |
| Método | `method-staircase-flat` | `method-staircase` | `flat` | `MethodStaircaseFlat` |
|  | `decision-plan` | `decision-plan` | — | `DecisionPlan` |
|  | `method-score-ring` | `method-score-ring` | — | `MethodScoreRing` |
|  | `method-hybrid-workforce` | `method-hybrid-workforce` | — | `MethodHybridWorkforce` |
|  | `method-hybrid-workforce-scene` | `method-hybrid-workforce` | `scene` | `MethodHybridWorkforceScene` |
| Cotización, próximos pasos y respiro | `content-pricing` | `content-pricing` | — | `ContentPricing` |
|  | `content-pricing-stage` | `content-pricing` | `stage` | `ContentPricingStage` |
|  | `content-pricing-live` | `content-pricing` | `live` | `ContentPricingLive` |
|  | `decision-next-steps` | `decision-next-steps` | — | `DecisionNextSteps` |
|  | `breather` | `breather` | — | `Breather` |
| Prueba | `content-focus` | `content-focus` | — | `ContentFocus` |
|  | `content-clients` | `content-clients` | — | `ContentClients` |
|  | `content-partners` | `content-partners` | — | `ContentPartners` |
|  | `decision-risk` | `decision-risk` | — | `DecisionRisk` |
|  | `decision-case` | `decision-case` | — | `DecisionCase` |
|  | `decision-chart` | `decision-chart` | — | `DecisionChart` |
|  | `decision-testimonial` | `decision-testimonial` | — | `DecisionTestimonial` |
|  | `decision-why-us` | `decision-why-us` | — | `DecisionWhyUs` |
| Secciones y quiénes somos | `section-lens` | `section-lens` | — | `SectionLens` |
|  | `section-bleed` | `section-bleed` | — | `SectionBleed` |
|  | `section-cine-team` | `section-cine` | `team` | `SectionCine` |
|  | `section-cine-services` | `section-cine` | `services` | `SectionCine` |
|  | `section-cine-about` | `section-cine` | `about` | `SectionCineAbout` |
|  | `section-cine-purpose` | `section-cine` | `purpose` | `SectionCinePurpose` |
|  | `content-team` | `content-team` | — | `ContentTeam` |
|  | `content-stack` | `content-stack` | — | `ContentStack` |
| Contenido y día a día | `contact-sheet` | `contact-sheet` | — | `ContactSheet` |
|  | `content-text` | `content-text` | — | `ContentText` |
|  | `content-bullets` | `content-bullets` | — | `ContentBullets` |
|  | `content-day` | `content-day` | `clock` | `ContentDay` |
|  | `content-day-tools` | `content-day` | `tools` | `ContentDayTools` |
|  | `content-day-live-progress` | `content-day` | `live-progress` | `ContentDayProgress` |
|  | `content-day-live-results` | `content-day` | `live-results` | `ContentDayResults` |
|  | `decision-agenda` | `decision-agenda` | — | `DecisionAgenda` |

«—» en `layout`: la receta no lleva composición. `section-cine` sin `layout` resuelve como `team`.

Composiciones nuevas del contrato: `section-cine` ganó `about` y `purpose`; `content-day` ganó `tools`, `live-progress` y
`live-results`.

### Las recetas de TASK-1934 (SEO/AEO)

Cada una tiene su intent de ejemplo en `src/lib/brand-surfaces/examples/deck-<id del catálogo>-intent.json`, con
`use: proposal`. Las siete nuevas usan la receta de AXIS con el mismo id y estilo «vivo» (voz grande, escenario,
plataforma y vidrio de AXIS); las dos propuestas reutilizan recetas que ya existían.

| id del catálogo | Receta AXIS | `layout` | Plantilla | Builder |
|---|---|---|---|---|
| `decision-ai-answer` | `decision-ai-answer` | — | `DecisionAiAnswer` | `recipes/seo-aeo/decision-ai-answer.ts` |
| `decision-ai-market` | `decision-ai-market` | — | `DecisionAiMarket` | `recipes/seo-aeo/decision-ai-market.ts` |
| `method-surround-cycle` | `method-surround-cycle` | — | `MethodSurroundCycle` | `recipes/seo-aeo/method-surround-cycle.ts` |
| `decision-difference` | `decision-difference` | — | `DecisionDifference` | `recipes/seo-aeo/decision-difference.ts` |
| `method-eeat` | `method-eeat` | — | `MethodEeat` | `recipes/seo-aeo/method-eeat.ts` |
| `decision-traffic-to-revenue` | `decision-traffic-to-revenue` | — | `DecisionTrafficToRevenue` | `recipes/seo-aeo/decision-traffic-to-revenue.ts` |
| `decision-diagnosis-map` | `decision-diagnosis-map` | — | `DecisionDiagnosisMap` | `recipes/seo-aeo/decision-diagnosis-map.ts` |
| `proposal-service-seo` | `proposal-service` (línea `engine`) | — | `ProposalService` | `recipes/proposal-service.ts` (la lente admite el plate de cine SE1 y lee `photo.focus`) |
| `proposal-cinematic-seo` | `proposal-cinematic` (línea `engine`) | `service` | `ProposalCinematic` | `recipes/deck.ts` (nota del pie y bajada bajo la selección) |

Las reglas del brief se sostienen en código: las **cifras** llegan por `figures` con fuente obligatoria (AXIS
`figure-source-required` al componer); los **datos de muestra** los exige el builder («Ejemplo ilustrativo» en
`decision-ai-answer`, «Datos de muestra» en `decision-diagnosis-map`) mientras el intent diga que son ilustrativos, y
con datos del cliente exige `evidenceRef` (TASK-1930); la **interfaz de IA** se prueba genérica (sólo SVG, sin nombres
ni colores de productos); y la **respuesta a 3×** y el **acento ≥ 24 px** los mide la auditoría renderizada del gate,
con las siete en `ANSWER_RATIO_CONTENT_TYPES`.

**Paridad de slots receta ↔ plantilla.** `recipe-map.json` (en el catálogo `graphic-line-deck`) declara, para cada
receta de TASK-1928 y de TASK-1934, en qué campo del `slots.json` vive cada slot de la receta. El test
`src/lib/brand-surfaces/__tests__/recipe-slot-parity.test.ts` exige que cada slot tenga su campo, con tipo compatible,
que lo obligatorio siga obligatorio y el mismo largo máximo (en una plantilla compartida manda el mayor). Por eso el
`maxChars` del JSON es el largo que el compositor hace cumplir: un texto más largo **hace fallar la composición** con el
slot que lo recibe. Las recetas anteriores declaran `slots: null`, y también `proposal-cinematic-seo`, como sus cuatro
hermanas de cine: su plantilla compartida no admite los largos menores de una sola receta.

### Componer una lámina o un documento

```bash
pnpm brand:compose -- --intent <intent.json>
pnpm brand:compose -- --intent <documento.json> --artifact-id <id> --out <dir>
```

Un intent con `pages` es un documento y produce un solo PDF multipágina 16:9 con su manifest y su procedencia. Un solo
issue de AXIS deja el documento sin componer. Portada con foto ↔ contraportada sin foto, y al revés: por eso
`close-brochure-horizon` y `close-brochure-dawn` tienen plantilla pero no emparejan con las portadas de brochure de
hoy. Ejemplos de documento: `deck-brochure-document.json` (nueve páginas) y `deck-proposal-document.json` (siete
páginas interiores). Paso a paso: [manual de uso](../../../manual-de-uso/creative/componer-deck-con-recetas.md).

Gate visual del catálogo: `pnpm composer:visual-gate --catalog=graphic-line` (73 frames a 0 px; altas declaradas en
`scripts/frontend/baselines/artifact-composer/BASELINE_DELTAS.md`). Los frames de las siete plantillas SEO/AEO y el
re-congelado de `ProposalCinematic` se congelaron el 2026-09-28 tras la aprobación visual del operador (`c652f4f83`,
entrada (o) del ledger).

### El contenido es dato del intent

La foto, el copy y la sección de una lámina se cambian **en el intent**, no en la plantilla; la plantilla nunca se
edita para una pieza. Para una pieza nueva se crea un intent propio **fuera de** `src/lib/brand-surfaces/examples/`:
esa carpeta está vigilada por un snapshot (`src/lib/brand-surfaces/__tests__/example-plans.test.ts`).

| Qué cambias | Campo del intent | Qué cuidar |
|---|---|---|
| La foto | `photo.plateRef`, `photo.alt` | `alt` obligatorio (describe la escena; sin él, `missing-photo`); el plate debe existir en disco (`ai-generations/**`, fuera de git) |
| El copy | `voice`, `body` | el `maxChars` medido de la receta; la respuesta sin punto |
| Las cifras | `figures` (valor, rótulo y fuente) | la fuente es obligatoria: sin ella AXIS rechaza la pieza |
| El ítem seleccionado | `selected` (número de ítem, desde 1); en la cotización, `recommended` (la selección sigue al plan recomendado); en la escalera, `selection.level` | fuera del rango de ítems, la composición falla con `invalid-intent`. `selection.item` es el campo interno de la plantilla: lo llena el sistema, no el intent. La portada `document-selection` no lleva `selection` en el intent |
| La sección | `progress` | sección n de N del deck real |
| El alto de la columna (portadas) | `column.topPx` | se elige según dónde queda el sujeto; fuera de la reserva del logo falla con `invalid-intent` |

El recorte de la foto es centrado y cubre el área que pide la receta: en la sección partida, una franja de
1.260 × 1.080 px sobre el lienzo de 1.920 × 1.080; en las láminas a sangre, el lienzo completo. La sección partida
**no tiene control de foco**: si el sujeto queda cortado, se usa una foto con otro encuadre. En el deck, hoy leen
`photo.focus` para dirigir el recorte hacia un punto del archivo la lente del día a día (`content-day` con `clock`) y,
desde TASK-1934, la lente de la propuesta sobria (`proposal-service`; la SEO recorta el plate SE1 hacia el estratega). En
`section-split-panel-end` la foto va **espejada**: una foto con texto legible o con un logo saldría al revés. Al cambiar
la foto no cambian el panel, la esquina curva, el indicador ni la columna de voz: eso lo fija el `layout`.

Los montos no son dato del intent: la cotización imprime siempre `[MONTO]`. El contacto tampoco: sale de
`EFEONCE_CONTACT`.

Las fotos se piden por ficha (`pnpm foto:prompt`, `foto:generar`, `foto:validar`, `foto:emblema`, `foto:isotipo`); su
producción idempotente es TASK-1926 y el banco de plates gobernado, TASK-1931. La ruta productiva gobernada (fuera
del taller local) es TASK-1921, en curso; el plan de deck ya se valida (sección de abajo, TASK-1929); los datos reales en los slots
son TASK-1930 y el deck desde Proposal Studio, con la confirmación del plan, TASK-1932.

## Validar el plan: códigos y cómo leerlos

Desde el 2026-09-28 (TASK-1929) el **plan** de un deck —la lista de láminas, cada una por su `id` de este catálogo—
se valida antes de componer:

```bash
pnpm brand:deck-plan -- --plan <plan.json>
pnpm brand:deck-plan -- --propose --context <context.json> [--out <plan.json>]   # el agente propone; cuesta tokens
```

El plan (`document`, `line?`, `diagnosisDone?`, `slides[{ recipeId, slots?, plateRef? }]`) nombra **recetas por id**,
nunca plantillas ni `contentType`; los `slots` usan los nombres de slot de este catálogo. Validar no escribe ni compone
nada. Paso a paso, formato de `context.json` y problemas comunes:
[manual de uso, paso 4b](../../../manual-de-uso/creative/componer-deck-con-recetas.md#paso-4b--valida-el-plan-antes-de-componer).

Cada problema sale con su **fuente**: `[axis]` para las reglas de documento que AXIS ya valida (sólo brochure y
propuesta, y sólo cuando todas las láminas existen) y `[catalog]` para las de este catálogo. Una regla vive en una sola
de las dos: si AXIS ya la marcó en una lámina, el catálogo no la repite.

| Código | Fuente | Tipo | Qué campo del catálogo lo decide |
|---|---|---|---|
| `plan-invalid` | catalog | error | forma del plan |
| `template-named-instead-of-recipe` | catalog | error | el plan nombra una plantilla, un `contentType`, un id que empieza con `deck.` o con mayúscula |
| `recipe-unknown` | catalog | error | `id` (acepta `cover-classic` y `close-classic` sólo en pitch y QBR; una familia de AXIS como `proposal-cinematic` no es receta) |
| `recipe-not-for-document` | catalog | error | `documents` |
| `frame-count` | catalog | error | más de una portada o de un cierre (cubre también el eslogan dos veces) |
| `frame-order` | catalog | error | portada primera y cierre último |
| `pair-cover-close-mismatch` | catalog | error | `pairsWith` con `cover↔close` |
| `next-steps-after-diagnosis` | catalog | error | una receta de la familia `next-steps` (`decision-next-steps` o `decision-diagnosis-map`) en una propuesta con `diagnosisDone: true` |
| `variant-both-in-deck` | catalog | error | `pairsWith` con `variant`: dos alternativas en el mismo deck, seguidas o no (reemplaza a `variant-adjacent`, que sólo miraba las seguidas); dos portadas o dos cierres siguen en `frame-count` |
| `plate-repeated` | catalog | error | el plate de la receta (o `plateRef`) repetido en el plan; cierra el pendiente «plate repetido» dentro de un plan |
| `slot-unknown` | catalog | error | `slots[].name` (el eslogan en una portada cae aquí: ninguna portada lo tiene) |
| `slot-type-invalid` | catalog | error | `slots[].type` |
| `slot-required-missing` | catalog | error | `slots[].required`, sólo si la lámina ya trae `slots` |
| `slot-over-max-chars` | catalog | error | `slots[].maxChars` (texto: largo total; `richText`: por línea, sin `**`; lista: por ítem) |
| `figure-source-missing` | catalog | error | una cifra (objeto con `value`) en los `slots` del plan sin `source`; en una lista, cada ítem. Una cifra escrita como texto plano («68 %») no se detecta |
| `recipe-without-template` | catalog | aviso | lámina sin plantilla en el composer (hoy sólo `cover-classic`/`close-classic` en pitch y QBR) |
| `section-split-corner-adjacent` | catalog | aviso | dos secciones partidas seguidas con la misma esquina |
| `rhythm-paper-run` | catalog | aviso | tres láminas de papel seguidas (una vez por tramo) |
| `brochure-cover-first`, `brochure-close-last`, `brochure-needs-service-page`, `frame-photo-must-alternate`, `document-line-mismatch`, `use-not-for-recipe`, `progress-required` | axis | error | el contrato de documento de AXIS; los de página (`page[i]:x`) salen como `x` en la lámina i |
| `proposal-unavailable` | agent | error | sólo al proponer: el proveedor del modelo no respondió |

Reglas del catálogo **sin código propio**, porque otra ya las cubre: la alternancia foto ↔ sin foto
(`frame-photo-must-alternate` de AXIS), el eslogan en la portada (`slot-unknown`), el eslogan dos veces
(`frame-count`) y el mensaje de cierre o las familias que un documento excluye (`recipe-not-for-document`). **No hay
regla de orden de secuencia:** `pairsWith` con `sequence` dice qué láminas van juntas, no en qué orden
(`proposal-cinematic-nexa-lines` lista una portada como secuencia), así que una regla de orden daría avisos falsos. El
ritmo se vigila sólo en papel: las láminas oscuras son el fondo base del deck.

El validador no lee este JSON en runtime: lee `src/lib/brand-surfaces/deck-recipes/catalog.generated.json`, que escribe
`pnpm brand:deck-recipes` junto con el índice de abajo. Por eso, **después de editar el JSON, corre
`pnpm brand:deck-recipes`**: `--check` falla si el índice **o** el catálogo de runtime quedaron atrás.

## Datos reales por slot (TASK-1930)

Desde el 2026-09-28 los slots de **datos** de un plan —logo del cliente, cifras, casos, testimonios, logos de
terceros, montos, equipo y datos de muestra— se llenan desde la verdad de Greenhouse con `bindDeckSlots(plan, context)`
(`src/lib/brand-surfaces/deck-recipes/bindings/`). Los slots de voz no se ligan: los escribe quien propone y los
confirma una persona.

```bash
pnpm brand:deck-plan -- --bind --plan <plan.json> --context <context.json> [--out <ligado.json>]
pnpm brand:deck-plan -- --bind --plan <plan.json> --proposal <proposalId> --org <ownerOrgId> [--facts <hechos.json>]
pnpm brand:deck-plan -- --bind --plan <plan.json> --sources <fuentes.json>   # sin base, sobre un fixture
```

**El valor nunca sale del texto del plan.** Sale de un **hecho** (el contrato `EvidencedFact` de los chapter-authors:
`value`, `label`, `evidenceRef`) que se verifica contra la evidencia de la `Proposal`. `proposal_evidence` no guarda el
valor de una cifra: guarda de dónde sale (`locator`), cuándo (`as_of`), su clasificación y su audiencia. Lo que el plan
traiga en un slot de datos se reemplaza por el hecho o se quita, y el validador falla cerrado si el slot era
obligatorio.

| Slot (receta) | Binder | Fuente | Sin dato |
|---|---|---|---|
| `clientLogo` de las portadas de propuesta | `client-logo` | Account 360 (`readOrganizationLogoVariants`), variante para fondo oscuro | `no-on-dark-logo`, `no-logo`; sin propuesta, `no-proposal` |
| `measure`, `figures`, `proof`, `bars`, `kpis`, `facts`, `metrics` (`content-measure`, `content-focus`, `decision-chart`, `decision-why-us`, `content-day-live-results`, `section-cine-about`, pruebas de servicio) | `metric` | hecho con evidencia `measured`; la fuente visible es el `locator` | `no-evidence` |
| `source` y `annotation` de esas láminas | `metric-source`, `metric-delta` | las cifras ya ligadas (la diferencia se calcula de las barras) | el motivo de su slot hermano |
| `clientLogo` del caso y del testimonio, muro `logos` y `partners` | `proof-logo` | hecho con evidencia `attested` **con documento de respaldo** | `no-authorization`; el muro omite el logo sin autorización y, con menos de 9, `below-minimum` |
| `stats` del caso, `proof` del testimonio, `proofs` del muro | `proof-figures` | como `metric`, pero `attested` con documento | `no-authorization` |
| `fullQuote`, `author`, `keyPhrase` del testimonio | `proof-quote` | cita textual, nombre y cargo del hecho; la frase destacada sólo si es un fragmento literal de la cita | `no-authorization`, `not-in-quote` |
| `photo` del caso | `proof-photo` | la foto real que trae la evidencia; la de ejemplo nunca | `no-real-photo` |
| `amounts`, `total`, `lineItems` de la cotización | `money` | hechos económicos de TASK-1417 (**pendiente**) | siempre `[MONTO]` (`no-frozen-quote`); una línea con un monto escrito se quita |
| `lead`, `team` de `content-team` | `team` | roster real de TASK-1418 (**pendiente**) | `no-roster-facts`: sin roster no hay lámina de equipo, nunca una cara generada |
| datos de `decision-ai-answer` y `decision-diagnosis-map` | `sample-data` | por defecto, muestra con su marca; con un hecho `sample-data` y evidencia `measured`, datos del cliente y la marca se retira | la marca se queda: nunca se quita sin evidencia |

Sin binder, con su razón escrita en el mapa: las cifras de `decision-ai-market` (dato de mercado citado con fuente
pública), el puntaje de `method-score-ring` (se calcula del scoring de Efeonce), el horizonte de `decision-plan` y los
slots que eligen qué destaca la selección. Un test exige que todo slot `logo`, `money`, `metric`, `person` o de prueba
de las 100 recetas tenga binder o exclusión (las del deck SEO/AEO excluyen `productMark` y las cifras de maqueta).

Reglas que no se negocian:

- **Audiencia:** ningún deck usa evidencia `internal`, ni siquiera uno interno: con una sola, no compone
  (`binding-internal-evidence`). El binder no sabe qué significa un número y la evidencia interna es donde vive el costo
  cargado y el margen (decisión del operador 2026-09-28). Además, toda evidencia ligada pasa por el gate canónico
  `assertEvidenceAllowedForAudience` como artefacto `client_facing`.
- **Evidencia inventada:** un `evidenceRef` que no es de la propuesta (o, fuera de una, un asset que no existe) es
  `binding-evidence-unknown` y el deck no compone.
- **Fuera de una `Proposal`** (brochure, pitch o QBR de marca propia) sólo liga una cifra con un asset de respaldo vivo
  y su `sourceLabel`; la autorización de un tercero no existe fuera de una propuesta (`no-authorization`).
- **Nada extra viaja:** de cada hecho se copian sólo sus campos permitidos; ni costos, ni margen, ni datos personales
  fuera de nombre y cargo llegan a la lámina ni al rastro.

El rastro de cada slot (`status`, `source`, `evidenceRef`/`evidenceRefs`, `asOf`, `reason`, `dataOrigin`) viaja al
manifest resuelto y a la procedencia del asset (TASK-1932, TASK-1921). La autorización de uso de un logo o testimonio
se registra antes como evidencia `attested` de la propuesta (acción `record_proposal_evidence`), con su documento.
Paso a paso: [manual de uso, paso 5b](../../../manual-de-uso/creative/componer-deck-con-recetas.md#paso-5b--liga-los-datos-reales).

## Cómo regenerar el índice

```bash
pnpm brand:deck-recipes            # valida el JSON y reescribe el índice de abajo y el catálogo de runtime
pnpm brand:deck-recipes -- --check # valida y falla si el índice o el catálogo de runtime no están al día (no escribe)
```

El script (`scripts/creative/deck-recipes/render-index.mjs`, Node sin dependencias) falla si el JSON no parsea, si
falta un campo del esquema, si hay ids repetidos o si un `preferInstead` o `pairsWith` apunta a un id que no existe
(las familias de AXIS declaradas en `axisRecipeFamilies` son la única excepción).

## Índice

<!-- deck-recipes-index:start -->

<!-- Generado por scripts/creative/deck-recipes/render-index.mjs desde EFEONCE_DECK_SLIDE_RECIPES_V1.json. No editar a mano: corre «pnpm brand:deck-recipes». -->

Catálogo `efeonce.deck-slide-recipes.v1` versión 1.0.0 · 100 recetas · aprobado el 2026-09-27 por operador (canvas «La órbita», página Deck).
**94 de 100** recetas tienen plantilla en el Artifact Composer y se componen con `pnpm brand:compose` (columna «Plantilla», leída de `graphic-line-deck/registry.json`). Las demás todavía no.

### Recetas por familia y documento

| Familia | Propuesta | Brochure | Pitch | QBR | Total |
|---|---:|---:|---:|---:|---:|
| Portadas (`cover`) | 4 | 9 | — | — | 13 |
| Contraportadas (`close`) | 2 | 3 | — | — | 5 |
| Secciones (`section`) | 8 | 6 | 6 | 6 | 8 |
| Quiénes somos, equipo y stack (`about`) | 5 | 5 | 4 | 1 | 5 |
| Contenido (`content`) | 24 | 22 | 24 | 5 | 24 |
| Método (`method`) | 15 | 14 | 13 | 3 | 15 |
| Prueba (`proof`) | 13 | 11 | 13 | 4 | 13 |
| Propuesta por línea de servicio (`proposal-service`) | 10 | 10 | — | — | 10 |
| Cotización (`pricing`) | 3 | — | — | — | 3 |
| Próximos pasos (`next-steps`) | 3 | 3 | 3 | — | 3 |
| Respiro (`breather`) | 1 | — | 1 | 1 | 1 |

«Cuándo sí» y «cuándo no» muestran el primer criterio de la receta; los demás, el «cuándo» de cada alternativa, los pares, los elementos fijos, la foto y el prompt de composición están en el JSON. «Slots clave» lista los obligatorios con su largo máximo medido (`≤N` caracteres).

### Portadas · `cover` (13)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `cover-brochure-cine-orbit` | Portada de brochure · Nexa frente a la órbita · «¿Qué hace Efeonce? Crecer.» | `deck.cover-brochure` | brochure | Portada del brochure GENERAL de servicios (las cinco líneas), en PDF que se lee sin presentador. | En una propuesta comercial: la portada de propuesta va SIN foto y con el logo del cliente. | `cover-proposal-orbit`, `cover-brochure-line-growth`, `section-cine-services`, `cover-classic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `photo` |
| `cover-brochure-cine-lines` | Portada de brochure · Nexa y las cinco líneas · «¿Qué hace Efeonce? Crecer.» | `deck.cover-brochure` | brochure | Portada del brochure general cuando el documento recorre las cinco líneas y conviene mostrarlas desde la tapa. | En una propuesta comercial (portada sin foto con el logo del cliente). | `cover-brochure-cine-orbit`, `cover-brochure-line-brand`, `cover-proposal-orbit`, `cover-brochure-cine-lines-selection` | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `photo` |
| `cover-brochure-cine-lines-selection` | Portada de brochure · Nexa y las cinco líneas, con selección y cursor de Nexa sobre «Crecer.» | `deck.cover-brochure.document-selection` | brochure | Portada del brochure general cuando se quiere contar que Efeonce trabaja con personas y agentes sobre el mismo documento. | Si otra lámina del documento ya repite el mismo gesto de selección sobre «Crecer.» (la sección de servicios lo lleva con cursor propio): no dos veces seguidas. | `cover-brochure-cine-lines`, `section-cine-services` | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `selectionLabel` ≤8, `photo` |
| `cover-brochure-cine-team` | Portada de brochure · Nexa y el equipo con agentes · «¿Qué hace Efeonce? Crecer.» | `deck.cover-brochure` | brochure | Portada del brochure general cuando el argumento principal es el equipo (personas + agentes), por ejemplo para compradores que temen perder control o conocer a quién les atiende. | Si la sección del equipo del mismo documento abre con esta misma foto («¿Quién hace crecer tu marca? Este equipo.»): no repetirla. | `section-cine-team`, `cover-brochure-cine-orbit`, `content-team` | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `photo` |
| `cover-brochure-line-growth` | Portada de brochure por línea · Growth Strategy & Measurement · «¿Lo medimos? Siempre.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea Growth Strategy & Measurement (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `line`, `photo` |
| `cover-brochure-line-brand` | Portada de brochure por línea · Creative Services · «¿Quién crea mi contenido? Tu squad.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea Creative Services (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `line`, `photo` |
| `cover-brochure-line-engine` | Portada de brochure por línea · Digital Services & Engineering · «¿Te encuentra la IA? Visible.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea Digital Services & Engineering (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤33, `question` ≤30, `answer` ≤12, `evidence` ≤48, `line`, `photo`, (+1 opcional) |
| `cover-brochure-line-voice` | Portada de brochure por línea · Media & Distribution · «¿Dónde invierto? Donde rinde.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea Media & Distribution (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `line`, `photo` |
| `cover-brochure-line-revenue` | Portada de brochure por línea · RevOps & CRM · «¿Y el reporte del viernes? Ya lo viste.» | `deck.cover-brochure` | brochure | Portada del brochure de la línea RevOps & CRM (documento de una sola línea de servicio). | En el brochure general de las cinco líneas: allí va una de las portadas generales («¿Qué hace Efeonce? Crecer.»). | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `proposal-cinematic` (AXIS) | `eyebrow` ≤32, `question` ≤26, `answer` ≤12, `evidence` ≤42, `line`, `photo`, (+1 opcional) |
| `cover-proposal-orbit` | Portada de propuesta sin foto · la órbita gigante sostiene el logo del cliente (plantilla) | `deck.cover-proposal` | proposal | Portada de una propuesta comercial enviada a un cliente con nombre (después de conversar). | En un brochure: la portada de brochure lleva foto y no lleva cliente. | `cover-brochure-cine-orbit`, `cover-proposal-dawn` | `eyebrow` ≤34, `question` ≤24, `answer` ≤14, `clientName` ≤18, `evidence` ≤44, `clientLogo`, `selectionLabel` ≤12, (+1 opcional) |
| `cover-proposal-orbit-sky` | Portada de propuesta sin foto · la órbita gigante con el logo de SKY (ejemplo) | `deck.cover-proposal` | proposal | Portada de una propuesta comercial enviada a un cliente con nombre (después de conversar). | En un brochure: la portada de brochure lleva foto y no lleva cliente. | `cover-brochure-cine-orbit`, `cover-proposal-dawn`, `cover-proposal-orbit` | `eyebrow` ≤34, `question` ≤24, `answer` ≤10, `clientName` ≤18, `evidence` ≤44, `clientLogo`, `selectionLabel` ≤12 |
| `cover-proposal-dawn-sky` | Portada de propuesta sin foto · la órbita sale como el sol con SKY dentro (ejemplo) | `deck.cover-proposal.dawn` | proposal | Portada de una propuesta comercial enviada a un cliente con nombre (después de conversar). | En un brochure: la portada de brochure lleva foto y no lleva cliente. | `cover-brochure-cine-orbit`, `cover-proposal-orbit`, `cover-proposal-dawn` | `eyebrow` ≤34, `question` ≤24, `answer` ≤10, `clientName` ≤18, `evidence` ≤44, `clientLogo`, `selectionLabel` ≤12 |
| `cover-proposal-dawn` | Portada de propuesta sin foto · la órbita sale como el sol con el logo del cliente (plantilla) | `deck.cover-proposal.dawn` | proposal | Portada de una propuesta comercial enviada a un cliente con nombre (después de conversar). | En un brochure: la portada de brochure lleva foto y no lleva cliente. | `cover-brochure-cine-orbit`, `cover-proposal-orbit` | `eyebrow` ≤34, `question` ≤24, `answer` ≤10, `clientName` ≤18, `evidence` ≤44, `clientLogo`, `selectionLabel` ≤12 |

### Contraportadas · `close` (5)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `close-brochure-horizon` | Contraportada de brochure · Nexa camina hacia la órbita · «¿Conversamos? Cuando quieras.» | `deck.close-brochure.photo` | brochure | Contraportada de un brochure cuya portada va SIN foto (regla de alternancia). | Con cualquiera de las portadas de brochure aprobadas hoy: todas llevan foto, así que esta contraportada no tiene pareja válida. | `close-brochure-orbit`, `close-proposal-horizon` | `sloganLineWord`, `photo` |
| `close-brochure-dawn` | Contraportada de brochure · Nexa y un agente hacia la órbita al amanecer · «¿Conversamos? Cuando quieras.» | `deck.close-brochure.photo` | brochure | Contraportada de un brochure con portada SIN foto, cuando se quiere subrayar que personas y agentes trabajan juntos. | Con cualquiera de las portadas de brochure aprobadas hoy (todas con foto): no tiene pareja válida. | `close-brochure-orbit`, `close-proposal-dawn` | `sloganLineWord`, `photo` |
| `close-brochure-orbit` | Contraportada de brochure sin foto · la órbita gigante · «¿Conversamos? Cuando quieras.» | `deck.close-brochure` | brochure | Contraportada por defecto de TODO brochure: es la pareja sin foto de las portadas con foto (las tres generales y las cinco por línea). | En una propuesta comercial: la propuesta cierra con foto y con «Empower your Growth». | `close-proposal-horizon`, `close-brochure-horizon`, `close-classic` (AXIS) | `sloganLineWord` |
| `close-proposal-horizon` | Contraportada de propuesta · «Empower your Growth» hacia la órbita | `deck.close-proposal` | proposal | Contraportada de toda propuesta comercial: es la pareja CON foto de las portadas de propuesta sin foto. | En un brochure: su contraportada abre la conversación con «¿Conversamos? Cuando quieras.». | `close-brochure-orbit`, `decision-next-steps`, `close-proposal-dawn` | `sloganLineWord`, `photo`, (+1 opcional) |
| `close-proposal-dawn` | Contraportada de propuesta · «Empower your Growth» al amanecer | `deck.close-proposal` | proposal | Contraportada de toda propuesta comercial: es la pareja CON foto de las portadas de propuesta sin foto. | En un brochure: su contraportada abre la conversación con «¿Conversamos? Cuando quieras.». | `close-brochure-orbit`, `decision-next-steps`, `close-proposal-horizon` | `sloganLineWord`, `photo` |

### Secciones · `section` (8)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `section-lens` | Sección con lente · el arco mide en qué sección vamos | `deck.section-lens` | proposal, pitch, qbr | Abrir una sección de un deck que alguien presenta, cuando existe una foto documental del oficio de esa sección. | Cuando la foto no aguanta el recorte circular (sujeto pegado al borde o escena que necesita todo el ancho). | `section-classic`, `section-bleed`, `section-split` | `section`, `question` ≤34, `answer` ≤14, `photo`, (+1 opcional) |
| `section-classic` | Sección clásica AXIS · el número dentro del anillo | `deck.section-classic` | proposal, brochure, pitch, qbr | Abrir una sección cuando no hay foto propia del tema o el deck ya tiene suficiente fotografía. | Cuando la sección necesita emoción o mostrar al equipo trabajando: una sección sin foto no lo hace. | `section-split`, `section-lens`, `section-cine-services` | `section`, `question` ≤36, `answer` ≤14 |
| `section-bleed` | Sección con foto a sangre · el indicador chico arriba a la izquierda | `deck.section-bleed` | proposal, pitch, qbr | Abrir una sección con una escena ancha del oficio que pierde fuerza recortada en un círculo. | Cuando la foto no trae una zona calma y oscura a la izquierda para la voz (reservar después de generar no existe). | `section-lens`, `section-classic`, `breather` | `section`, `question` ≤24, `answer` ≤10, `photo` |
| `section-split` | Sección partida · la órbita sube por la izquierda | `deck.section-split` | proposal, brochure, pitch, qbr | Abrir una sección de brochure o propuesta cuando hay un retrato fuerte relacionado con el tema. | Si la persona del retrato mira fuera de la lámina, hacia el borde opuesto al panel: la mirada saca al lector. | `section-split-corner-bottom`, `section-split-panel-end`, `section-classic` | `section`, `question` ≤32, `answer` ≤12, `photo` |
| `section-split-corner-bottom` | Sección partida · esquina abajo («¿Cuánto tarda tu campaña? En días.») | `deck.section-split.corner-bottom` | proposal, brochure, pitch, qbr | Abrir una sección sobre velocidad, producción o campaña, con una persona del equipo en acción. | Si la promesa de la respuesta («en días») no se prueba en la lámina siguiente con una cifra con fuente. | `section-split`, `section-split-panel-end`, `content-measure` | `section`, `question` ≤30, `answer` ≤12, `photo` |
| `section-split-panel-end` | Sección partida · panel a la derecha («¿Qué responde la IA? Tu marca.») | `deck.section-split.panel-end` | proposal, brochure, pitch, qbr | Abrir una sección sobre el resultado del cliente (AEO, visibilidad, respuesta), cuando la protagonista es la persona del cliente. | Si la persona mira hacia el borde izquierdo: el panel a la derecha la dejaría mirando fuera. | `section-split`, `section-split-corner-bottom` | `section`, `question` ≤30, `answer` ≤12, `photo` |
| `section-cine-services` | Sección de cine · abre los servicios («¿Qué hace Efeonce? Crecer.») | `deck.section-cine.services` | brochure, proposal | Abrir la sección de servicios de un brochure o de una propuesta. | Como portada: el operador la reubicó como lámina interior (la portada de brochure es otra receta). | `section-cine-team`, `section-classic` | `eyebrow` ≤24, `question` ≤20, `answer` ≤8, `photo` |
| `section-cine-team` | Sección de cine · abre el equipo («¿Quién hace crecer tu marca? Este equipo.») | `deck.section-cine` | brochure, proposal | Abrir la sección del equipo en un brochure o una propuesta, antes de la lámina con las personas asignadas. | Como portada: se reubicó como interior. | `content-team`, `section-cine-about` | `eyebrow` ≤24, `question` ≤40, `answer` ≤16, `photo`, (+1 opcional) |

### Quiénes somos, equipo y stack · `about` (5)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `section-cine-about` | Sección de cine · quiénes somos («¿Quiénes somos? Un solo equipo.») | `deck.section-cine.about` | brochure, proposal, pitch | Presentar a Efeonce en un brochure, una propuesta o un pitch, antes de los servicios. | Si las cifras no están verificadas y vigentes: cada cifra necesita respaldo. | `decision-why-us`, `section-cine-team` | `eyebrow` ≤24, `question` ≤24, `answer` ≤16, `body` ≤100, `figures` ≤4, `photo` |
| `section-cine-purpose` | Sección de cine · por qué lo hacemos («¿Por qué lo hacemos así? Contigo.») | `deck.section-cine.purpose` | brochure, proposal, pitch | Explicar el propósito y la forma de trabajo de Efeonce, después de «quiénes somos». | Si la lámina anterior ya dijo el propósito con otra receta. | `decision-why-us`, `section-cine-about` | `eyebrow` ≤24, `question` ≤26, `answer` ≤9, `evidence` ≤110, `pillars` ≤70, `photo` |
| `content-team` | El equipo · el squad real en fichas de vidrio sobre la órbita | `deck.content-team` | proposal, pitch, qbr, brochure | En una propuesta o pitch con el squad ya asignado a la cuenta. | El squad no está asignado: nunca fotos genéricas, de stock ni generadas. | `section-cine` (AXIS), `content-text` | `eyebrow` ≤20, `question` ≤40, `answer` ≤18, `body` ≤85, `lead` ≤26, `team` ≤26 |
| `content-stack` | Nuestro stack · tres capas de herramientas sobre Efeonce | `deck.content-stack` | proposal, brochure, pitch | Para justificar un delivery premium por el stack que lo sostiene. | La conversación es de programas de partner. | `content-partners`, `content-day-tools` | `eyebrow` ≤20, `question` ≤26, `answer` ≤12, `body` ≤100, `layers` ≤22, `highlightedLayer` |
| `proposal-cinematic-nexa-lines` | Líneas de servicio con Nexa · cinco esferas de luz, una por línea, orbitan a su alrededor | `deck.proposal-cinematic.lines` | proposal, brochure | Presentar el portafolio completo de líneas de servicio | La propuesta es de una sola línea: se pasa directo a su lámina de servicio | `proposal-cinematic-creative`, `cover-brochure` (AXIS) | `eyebrow` ≤34, `body` ≤36, `photo`, (+1 opcional) |

### Contenido · `content` (24)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `content-measure` | Contenido · la órbita mide la cifra | `deck.content-measure` | proposal, brochure, pitch, qbr | Cuando el hallazgo o el resultado principal es UN porcentaje real con fuente. | Si la cifra no es un porcentaje entre 0 y 100: el arco no puede medir días, montos ni multiplicadores. | `content-focus`, `decision-chart`, `decision-why-us` | `eyebrow` ≤28, `question` ≤38, `measure` ≤5, `body` ≤90, `source` ≤60, `photo`, (+1 opcional) |
| `contact-sheet` | Varias fotos · hoja de contactos con profundidad | `deck.contact-sheet` | proposal, pitch, qbr | Mostrar un proceso creativo con varias tomas reales y la decisión sobre ellas. | Con fotos de formatos distintos que habría que recortar: todas nativas 16:9. | `triptych`, `breather` | `question` ≤32, `answer` ≤6, `chosen`, `alternatives` ≤30, `collaborator` ≤20 |
| `content-text` | Texto · el porqué, dicho en una palabra gigante | `deck.content-text` | proposal, brochure, pitch | Para fijar el porqué o la promesa de marca antes de entrar al detalle de la oferta. | La respuesta necesita más de una palabra: la escala que la justifica se pierde. | `content-bullets`, `decision-why-us`, `content-measure` | `eyebrow` ≤28, `question` ≤32, `answer` ≤8, `body` ≤95, `pillars` ≤46, `nav` |
| `content-bullets` | Texto con viñetas · cuatro puntos numerados | `deck.content-bullets` | proposal, brochure, pitch | Para explicar qué recibe el cliente en cuatro ideas del mismo peso. | Son más o menos de cuatro puntos: la grilla es de 2 × 2. | `content-text`, `decision-plan`, `decision-why-us` | `eyebrow` ≤28, `question` ≤40, `answer` ≤14, `items` ≤95, `selectedItem`, `selectionLabel`, `nav` |
| `content-day` | El día a día · cuatro momentos con horario en la órbita-reloj | `deck.content-day` | proposal, brochure, pitch | Para mostrar cómo se trabaja con fotos reales de oficio (terreno, taller, revisión, medición). | No hay fotos aprobadas de los momentos. | `content-day-tools`, `content-day-live-progress`, `content-day-live-results` | `eyebrow` ≤24, `question` ≤34, `answer` ≤5, `body` ≤120, `keyMoment`, `moments` ≤24 |
| `content-day-tools` | El día a día con las herramientas · el panel de Greenhouse al centro | `deck.content-day.tools` | proposal, brochure, pitch | Cuando el cliente pregunta cómo se coordina el trabajo y dónde ve lo que pasa. | La cuenta no usa esas herramientas o no tiene panel de Greenhouse. | `content-day`, `content-stack` | `eyebrow` ≤26, `question` ≤30, `answer` ≤10, `body` ≤100, `panel`, `tools` ≤22 |
| `content-day-live-progress` | Vívelo 1 · el plan en Notion y la aprobación en Frame.io | `deck.content-day.live-progress` | proposal, brochure, pitch | Después del día a día con herramientas, para que quien lo ve viva la aprobación. | La cuenta no aprueba piezas visuales (servicios sin producción creativa). | `content-day-live-results`, `content-day-tools`, `content-day-live-approval` | `eyebrow` ≤26, `question` ≤28, `answer` ≤12, `body` ≤100, `boardTitle` ≤24, `boardCards` ≤24, `reviewTitle` ≤20, `reviewImage`, `clientComment` ≤32, `teamReply` ≤32, (+1 opcional) |
| `content-day-live-results` | Vívelo 2 · los resultados en vivo en Insights, Greenhouse y Teams | `deck.content-day.live-results` | proposal, brochure, pitch, qbr | Después de «Vívelo 1», o sola cuando la objeción es la reportería. | La cuenta no tiene Efeonce Insights ni panel de Greenhouse. | `decision-chart`, `content-day-tools`, `content-day-live-console` | `eyebrow` ≤26, `question` ≤16, `answer` ≤10, `body` ≤100, `panel`, `meeting` ≤40, `reportTitle` ≤36, `metrics` ≤18, (+1 opcional) |
| `decision-agenda` | Agenda · cinco temas y el que importa marcado | `deck.decision-agenda` | proposal, pitch, qbr | Después de la portada de una presentación en sala (propuesta, pitch, QBR). | En un brochure que se lee solo: no hay «hoy». | `section-classic` | `eyebrow` ≤16, `question` ≤24, `answer` ≤14, `items` ≤26, `highlightedItem`, `nav` |
| `content-one-platform` | Una sola operación · la cuenta del cliente al centro y cinco áreas de trabajo conectadas | `deck.content-one-platform` | proposal, brochure, pitch | Abrir la conversación de plataforma después de la propuesta: el problema del cliente es tener varias herramientas que no se hablan. | El cliente usa un solo producto y no hay integración que mostrar. | `content-service-lanes`, `proposal-cinematic-revops` | `eyebrow` ≤51, `question` ≤44, `answer` ≤7, `evidence` ≤179, `workAreas` ≤20, `accountName` ≤22, `accountInitials` ≤2, `accountSubtitle` ≤37, `accountFacts` ≤22 |
| `content-service-lanes` | Servicios de la práctica · seis carriles con sus productos y las cuatro fases del ciclo | `deck.content-service-lanes` | proposal, brochure, pitch | Brochure de una práctica: la lámina que lista qué hacemos. | Se propone un solo servicio: usar la propuesta de la línea (proposal-cinematic-revops o proposal-service-revops). | `proposal-cinematic-revops`, `content-bullets` | `eyebrow` ≤51, `question` ≤57, `answer` ≤21, `lanes` ≤108, `phases` ≤28, (+1 opcional) |
| `content-season-launches` | Lo nuevo de la temporada · los lanzamientos del evento con su estado anunciado y la fecha de corte | `deck.content-season-launches` | proposal, brochure, pitch | En las semanas que siguen a un evento de la plataforma (en la aprobada, Dreamforce 2026), mientras el ledger de lanzamientos esté vigente. | En un brochure evergreen: es una lámina de temporada y envejece con la fecha de corte. | `content-service-lanes` | `eyebrow` ≤51, `question` ≤44, `answer` ≤8, `evidence` ≤179, `asOf`, `note` ≤115, `launches` ≤69, (+1 opcional) |
| `content-day-release-cycle` | El ciclo del release · sandbox, pruebas, tu aprobación y producción, con el video que lo explica | `deck.content-day-release-cycle` | proposal, brochure, pitch | Día a día de una práctica de plataforma (implementación y operación) donde el cliente aprueba releases. | La cuenta no tiene un ciclo de releases (servicios sin plataforma): usar content-day-tools. | `content-day-tools`, `content-day-live-progress` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `releaseKicker` ≤53, `releaseTitle` ≤39, `releaseIcon`, `currentStep`, `videoDuration` ≤5, `presenterInitials` ≤2, `videoCaption` ≤40, `approveCta` ≤22, `tools` ≤36 |
| `content-day-live-library` | Adopción a su ritmo · la biblioteca de tutoriales en video por rol, grabados sobre la org del cliente | `deck.content-day-live-library` | proposal, brochure, pitch | Fase de activación y adopción de una implementación. | La cuenta no graba tutoriales ni usa Loom: sin la herramienta, los tutoriales van sin marca. | `content-day-live-console` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `libraryKicker` ≤58, `libraryTitle` ≤43, `videos` ≤55, `stats` ≤66, (+1 opcional) |
| `content-live-chat` | El CRM en una conversación · la consulta con datos vivos y la acción que el ejecutivo confirma | `deck.content-live-chat` | proposal, brochure, pitch | Propuesta del servicio de Enablement conversacional (en la aprobada, Salesforce en Claude, «Claudeforce»). | Sin la autorización de uso de marca de Anthropic archivada (la de Salesforce está declarada por el operador desde el 2026-09-29): el logotipo del asistente y el wordmark Claudeforce se omiten, y la composición sin esas marcas no tiene lámina aprobada. | `method-agent-supervisor` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `note` ≤115, `connectionLabel` ≤30, `userPrompt` ≤127, `answerIntro` ≤177, `records` ≤25, `proposedAction` ≤139, `guarantees` ≤57, (+2 opcionales) |
| `content-measure-formulas` | Qué medimos · cinco métricas con su fórmula, su fuente y su dueño, sin cifras de promesa | `deck.content-measure-formulas` | proposal, brochure, pitch | Propuesta o brochure donde el cliente pregunta cómo se sabrá si funciona. | Ya hay resultados medidos con fuente: usar content-measure o decision-chart. | `content-measure`, `decision-chart` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `note` ≤115, `metrics` ≤58 |
| `content-day-live-console` | Lo operamos · la consola de operación gestionada abierta: tres cifras del mes, cuatro controles y la revisión trimestral | `deck.content-day-live-console` | proposal, brochure, pitch, qbr | Propuesta o brochure que vende la operación gestionada de una plataforma (el on-going después del proyecto). | La cuenta se opera con el panel de Greenhouse y la reunión de Teams: usar content-day-live-results. | `content-day-live-results`, `content-measure-formulas` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `panelTitle` ≤48, `panelSubtitle` ≤77, `metrics` ≤30, `checks` ≤77, `reviewKicker` ≤71, `reviewTitle` ≤69, `reviewCta` ≤14, (+2 opcionales) |
| `content-day-live-approval` | Donde trabajas · el agente propone en el canal del equipo, la supervisora aprueba y el cambio queda ejecutado y registrado | `deck.content-day-live-approval` | proposal, brochure, pitch | Vivir la supervisión de un agente (el «vívelo» de method-agent-supervisor). | La aprobación es de piezas visuales en Notion y Frame.io: usar content-day-live-progress. | `content-day-live-progress`, `method-agent-supervisor` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `note` ≤115, `channelIcon`, `channel` ≤69, `agentName` ≤56, `agentBadge` ≤16, `agentMessage` ≤146, `evidenceChips` ≤41, `actions` ≤14, `executedTitle` ≤39, `executedText` ≤123, `loop` ≤30, `currentLoopStep`, (+2 opcionales) |
| `content-brand-family` | Familia de marcas · el producto y sus piezas con sus lockups oficiales, cada una con su papel | — | proposal, brochure, pitch | Abrir la parte de producto de un deck SEO/AEO: qué hay dentro de SV360 antes de explicar cada pieza. | La oferta no tiene submarcas oficiales en @efeoncepro/axis-brand-assets: no se dibujan lockups; usar content-bullets. | `content-bullets`, `method-score-ring` | `productMark`, `question` ≤28, `answer` ≤20, `body` ≤169, `eyebrow` ≤71, `familyMark`, `pieces` ≤74 |
| `content-service-mockups` | Qué hace el equipo · tres fichas con maquetas nativas del servicio (técnica, contenido, autoridad) y tres entregables | — | proposal, brochure, pitch | Justo después de presentar al equipo (section-cine-team): qué hace ese equipo, en concreto. | Capturas chicas de la web o del CMS: la regla es maqueta nativa grande y legible (decisión 4). | `content-service-lanes`, `content-bullets` | `eyebrow` ≤45, `question` ≤24, `answer` ≤9, `body` ≤131, `technicalTitle` ≤25, `technicalScore`, `technicalScoreLabel` ≤47, `technicalChecks` ≤9, `technicalCaption` ≤62, `contentTitle` ≤31, `contentPillar` ≤8, `contentNodes` ≤11, `contentCaption` ≤109, `authorityTitle` ≤24, `authorityMetric` ≤4, `authorityOutlets` ≤24, `authorityCaption` ≤59, `chips` ≤73, (+1 opcional) |
| `content-report-formats` | Cómo te llega el informe · el informe vivo en interfaz blanca y los cinco formatos en que se entrega | — | proposal, brochure, pitch | Después de content-day-live-results: cómo llega la edición mensual y en qué formatos. | Se promete a un cliente real un formato que el servicio no habilita al abrirse: estado verificado 2026-09-30 → web y celular, PDF A4 y deck 16:9 vivos; modo presentación desplegado sin prueba con edición real; correo automático no vivo (TASK-1944). Mostrarlos es decisión del operador (asumida el 2026-09-30); si no la tomas tú, quita o rotula el formato. | `content-day-live-results`, `content-committee-deck` | `eyebrow` ≤53, `question` ≤28, `answer` ≤20, `body` ≤171, `reportLabel` ≤58, `kpis` ≤28, `trendTitle` ≤54, `rankingTitle` ≤38, `ranking` ≤11, `reading` ≤155, `formats` ≤37, `highlightedFormat`, (+1 opcional) |
| `content-committee-deck` | El PPT del comité · la lámina de comité ya armada por la IA, en modo presentación, con tres formas de llevarla | — | proposal, brochure, pitch | Justo después de content-report-formats, cuando el comité o el directorio es quien decide la inversión. | El modo presentación, el deck 16:9 o el PDF A4 no están vivos para el cliente: se quitan de las fichas o se rotulan «próximamente» (por verificar con la sesión de Insights). | `content-report-formats`, `content-day-live-results` | `eyebrow` ≤46, `question` ≤37, `answer` ≤12, `body` ≤159, `slideKicker` ≤62, `slideHeadline` ≤48, `slideFigure` ≤27, `annotation` ≤17, `features` ≤62, (+1 opcional) |
| `content-industries` | Industrias · seis fichas de vidrio con la pregunta que ese comprador le hace a la IA | — | proposal, brochure, pitch | Brochure o propuesta que tiene que mostrar que el equipo entiende el negocio del cliente, no sólo la técnica. | Se usa para afirmar experiencia probada por industria: la lámina muestra preguntas de ejemplo, no casos, y hoy no hay prueba por industria en la lámina de clientes (banca, seguros, SaaS). | `decision-case`, `content-clients` | `eyebrow` ≤50, `question` ≤26, `answer` ≤20, `body` ≤154, `industries` ≤62, `highlightedIndustry`, (+1 opcional) |
| `content-markets` | Mercados · las Américas de noche desde la órbita con los cinco países donde opera Efeonce | — | proposal, brochure, pitch | Brochure o propuesta a un cliente regional o multinacional: dónde operamos, de forma épica. | Los mercados de la lámina no coinciden con EFEONCE_OPERATING_MARKETS (src/config/efeonce-brand.ts): se corrige la fuente, no la lámina. | `section-cine-about`, `content-clients` | `eyebrow` ≤50, `question` ≤26, `answer` ≤20, `body` ≤148, `markets` ≤16, `photo`, (+1 opcional) |

### Método · `method` (15)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `triptych` | Tríptico · Escucha. Crea. Mide. | `deck.triptych` | proposal, brochure, pitch, qbr | Explicar el método o la forma de trabajo en tres pasos con fotos reales del equipo. | Con fotos horizontales recortadas a vertical: las tomas nacen 9:16. | `method-staircase`, `contact-sheet` | `question` ≤22, `words` ≤9, `panels` |
| `decision-plan` | Plan de 90 días · la trayectoria que sube en tres tramos | `deck.decision-plan` | proposal, pitch | Para responder «¿qué pasa al empezar?» con tramos y plazos concretos. | El plan tiene más de tres tramos o plazos no comprometidos. | `decision-next-steps`, `content-bullets` | `eyebrow` ≤20, `question` ≤26, `answer` ≤11, `body` ≤120, `horizon`, `stops` ≤84, `currentStop` |
| `method-hybrid-workforce` | Fuerza de trabajo híbrida · personas y agentes, la autoridad del agente por tramos | `deck.method-hybrid-workforce` | proposal, brochure, pitch | Explicar el modelo de fuerza de trabajo híbrida con su gobierno: qué puede hacer un agente en cada tramo | La lámina anterior o siguiente ya es otra versión de fuerza híbrida (escena o cine): se usa una sola de las tres por deck | `method-hybrid-workforce-scene`, `proposal-cinematic-nexa`, `method-staircase` | `eyebrow` ≤32, `question` ≤30, `answer` ≤20, `body` ≤150, `ladderTitle` ≤45, `ladder` ≤22, (+2 opcionales) |
| `method-staircase-flat` | Metodología BeX · la escalera tipográfica (variante plana) | `deck.method-staircase.flat` | proposal, brochure, pitch, qbr | Explicar un método por niveles cuando la lámina tiene que verse liviana o va impresa | El método es la imagen principal de la sección y se busca impacto: esa es la escalera de vidrio | `method-staircase`, `method-score-ring` | `eyebrow` ≤32, `question` ≤28, `answer` ≤18, `body` ≤110, `levels` ≤14, `note` ≤60, `selectedLevel`, `selectionLabel` ≤12 |
| `method-score-ring` | Brand Visibility Grader · el anillo del puntaje en siete dimensiones | `deck.method-score-ring` | proposal, brochure, pitch, qbr | Presentar el Brand Visibility Grader como puerta de entrada (diagnóstico sin costo) | Se quiere mostrar el puntaje REAL de un cliente: esta lámina muestra la composición del puntaje, no un resultado | `content-measure`, `method-staircase` | `eyebrow` ≤32, `question` ≤28, `answer` ≤8, `body` ≤135, `dimensions` ≤28, `total`, `cta` ≤22, `ctaUrl` ≤45, (+1 opcional) |
| `method-hybrid-workforce-scene` | Fuerza de trabajo híbrida · la escena: persona y agente sobre la misma pieza | `deck.method-hybrid-workforce.scene` | proposal, brochure, pitch | Mostrar la fuerza híbrida en una escena creíble de trabajo, con una persona real del oficio | El comité necesita ver los tramos de autoridad del agente: la versión gráfica | `method-hybrid-workforce`, `proposal-cinematic-nexa` | `eyebrow` ≤32, `question` ≤30, `answer` ≤20, `body` ≤120, `photo`, `selectionTargets` |
| `method-staircase` | Metodología BeX · la escalera de cinco peldaños de vidrio que se iluminan al subir | `deck.method-staircase` | proposal, brochure | Mostrar un método por niveles cuando la imagen es el propio método (BeX es el caso aprobado) | Los niveles no son una progresión real | `method-staircase-flat`, `method-score-ring`, `method-waves` | `eyebrow` ≤32, `question` ≤28, `answer` ≤18, `body` ≤110, `levels` ≤14, `note` ≤60, `selectedLevel`, `selectionLabel` ≤12, (+1 opcional) |
| `proposal-cinematic-nexa` | Fuerza híbrida en cine · Nexa biónica con lentes en la partida, con sus agentes | `deck.proposal-cinematic.hero` | proposal, brochure | Abrir o cerrar el bloque de fuerza híbrida con impacto | Hay que explicar el gobierno del agente o vender pasos: esta composición no lleva prueba ni pasos | `method-hybrid-workforce`, `method-hybrid-workforce-scene` | `eyebrow` ≤32, `question` ≤26, `answer` ≤8, `body` ≤110, `photo` |
| `method-surround-cycle` | El método en ciclo · Surround Discovery: Medir, Crear, Distribuir, Optimizar | `deck.method-surround-cycle` | proposal, brochure, pitch | Explicar cómo trabajamos AEO/SEO después de mostrar el problema | El servicio es un proyecto de una vez | `method-staircase`, `decision-plan` | `eyebrow` ≤51, `question` ≤21, `answer` ≤8, `evidence` ≤161, `stations` ≤155, `coreLabel` ≤15, (+1 opcional) |
| `method-eeat` | E-E-A-T · cuatro letras de vidrio y lo que construimos en cada una | `deck.method-eeat` | proposal, brochure, pitch | Explicar por qué el contenido y la autoridad importan para la IA | La audiencia ya domina E-E-A-T: pasar a la oferta | `method-surround-cycle` | `eyebrow` ≤51, `question` ≤43, `answer` ≤21, `evidence` ≤161, `meter` ≤24, `letters` ≤85 |
| `method-agent-supervisor` | Agentes con supervisora · cada agente con su ficha de autonomía y una persona que responde | `deck.method-agent-supervisor` | proposal, brochure, pitch | Propuesta o brochure con agentes (Agentforce) cuando la objeción es el control o el riesgo. | El deck no ofrece agentes. | `method-hybrid-workforce`, `content-day-live-approval` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `note` ≤115, `supervisorKicker` ≤33, `supervisorRole` ≤41, `supervisorInitials` ≤2, `supervisorDuty` ≤37, `agents` ≤72, `pendingApproval` ≤47 |
| `decision-platform-coexistence` | Dos plataformas que conviven · la decisión se toma capacidad por capacidad, no por reemplazo | `deck.decision-platform-coexistence` | proposal, brochure, pitch | El cliente pregunta si debe migrar de una generación de producto a otra (en la aprobada, Marketing Cloud Engagement a Next). | La migración ya se decidió y lo que falta es mostrar que se hará bien: usar method-migration-reconcile. | `method-migration-reconcile`, `decision-diagnosis-verdict` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `note` ≤115, `platforms` ≤33, `tableTitle` ≤39, `capabilities` ≤42, `selectedCapability` |
| `method-identity-consent` | Identidad y consentimiento · cinco fuentes, un perfil con preferencias y activación sólo donde hay permiso | `deck.method-identity-consent` | proposal, brochure, pitch | Propuesta de datos (Data 360 en la aprobada) o de marketing con datos personales. | El deck no toca datos personales. | `method-migration-reconcile` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `note` ≤115, `sources` ≤12, `profileTitle` ≤22, `channels` ≤18, `activations` ≤31 |
| `method-migration-reconcile` | Migración con reconciliación · cuatro etapas con sus contadores y el cuadre final con vuelta atrás | `deck.method-migration-reconcile` | proposal, brochure, pitch | Propuesta de implementación o cambio de plataforma con datos existentes. | No hay datos que migrar. | `decision-platform-coexistence` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `note` ≤115, `stages` ≤47, `reconciliation` ≤30, `rollbackBadge` ≤18 |
| `method-waves` | Por olas · cuatro escalones de vidrio que suben del blueprint a la operación híbrida, unidos por la trayectoria de luz | `deck.method-waves` | proposal, brochure, pitch | Explicar cómo se incorpora un agente (o cualquier cambio de operación) en olas probadas, de un primer equipo a toda la operación. | Los pasos no son una progresión que se prueba: usar decision-plan o triptych. | `method-staircase`, `method-hybrid-workforce` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `steps` ≤97, `selectedStep`, (+1 opcional) |

### Prueba · `proof` (13)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `content-focus` | Contenido · el foco sobre la prueba | `deck.content-focus` | proposal, pitch, qbr | Cuando el resultado se dice mejor como frase («A la primera.») y la cifra la respalda. | Sin una cifra con fuente que respalde la frase. | `content-measure`, `decision-testimonial` | `eyebrow` ≤28, `question` ≤44, `answer` ≤16, `proof` ≤6, `proofText` ≤70, `source` ≤60, `photo` |
| `content-clients` | Nuestros clientes · logos reales en un tono y dos pruebas gigantes | `deck.content-clients` | proposal, brochure, pitch | Como credencial en propuestas, pitches y brochures. | No hay autorización para mostrar un logo. | `decision-case`, `content-partners` | `eyebrow` ≤20, `question` ≤30, `answer` ≤16, `proofs` ≤50, `logos`, `markets` ≤45, `selectedProof`, `nav` |
| `content-partners` | Nuestros partners · los nueve programas que se pueden declarar | `deck.content-partners` | proposal, brochure, pitch | Como credencial técnica en propuestas y pitches. | Hay que mostrar las herramientas que se usan, no los programas de partner. | `content-stack`, `content-clients` | `eyebrow` ≤20, `question` ≤30, `answer` ≤18, `body` ≤80, `partners`, `selectedPartner`, `selectionLabel`, `nav` |
| `decision-risk` | Por qué es seguro · cada riesgo con su cobertura | `deck.decision-risk` | proposal, pitch | Para responder la objeción «¿y si no funciona?» antes de la cotización o justo después. | Una cobertura no se ofrece de verdad en este servicio (por ejemplo, no hay Sample Sprint disponible). | `decision-plan`, `decision-case` | `eyebrow` ≤24, `question` ≤22, `answer` ≤18, `body` ≤100, `rows` ≤100, `selectedRow`, `nav` |
| `decision-case` | Caso de éxito · Sky en 12 meses, con foto de ejemplo | `deck.decision-case` | proposal, brochure, pitch | Para demostrar con un caso publicado lo que se promete en la propuesta. | No hay foto real del caso: la de la referencia es sólo de ejemplo y no sale a una pieza final. | `decision-chart`, `decision-testimonial` | `clientLogo`, `eyebrow` ≤20, `question` ≤26, `answer` ≤11, `stats` ≤24, `source` ≤120, `photo`, `selectedStat` |
| `decision-chart` | Gráfico · el dato con su anotación | `deck.decision-chart` | proposal, brochure, pitch, qbr | Para mostrar un antes y después medido de un caso. | No hay línea base comparable. | `content-measure`, `decision-case` | `eyebrow` ≤30, `question` ≤24, `answer` ≤10, `body` ≤100, `bars` ≤14, `annotation` ≤7, `chartNote` ≤70, `kpis` ≤22, `source` ≤90, `nav` |
| `decision-testimonial` | Testimonio · la frase del cliente a escala de titular | `deck.decision-testimonial` | proposal, brochure, pitch | Hay una cita real, textual y publicada, con autorización del cliente. | La cita no es textual o no está autorizada. | `decision-case`, `content-clients` | `eyebrow` ≤28, `question` ≤34, `keyPhrase` ≤36, `fullQuote` ≤170, `clientLogo`, `author` ≤24, `proof` ≤24, `source` ≤90, `nav` |
| `decision-why-us` | Por qué elegirnos · un muro de seis cifras | `deck.decision-why-us` | proposal, brochure, pitch | Para responder «¿por qué ustedes?» con hechos citables. | Las cifras no tienen fuente. | `content-text`, `content-clients` | `eyebrow` ≤22, `question` ≤22, `answer` ≤9, `body` ≤100, `facts` ≤54, `source` ≤100, `selectedFact`, `nav` |
| `decision-ai-answer` | La respuesta de la IA · hoy tu marca no aparece, con AEO aparece primera | `deck.decision-ai-answer` | proposal, brochure, pitch | Abrir la sección AEO haciendo visible el problema antes de la oferta | Ya se mostró el informe real del diagnóstico del cliente: usar sus datos, no la muestra | `decision-diagnosis-map`, `decision-ai-market` | `eyebrow` ≤51, `question` ≤43, `answer` ≤24, `evidence` ≤161, `prompt` ≤86, `answerIntroToday` ≤57, `competitorsToday` ≤46, `answerIntroWithAeo` ≤66, `clientName` ≤40, `clientDescription` ≤114, `competitorsWithAeo` ≤46, (+2 opcionales) |
| `decision-ai-market` | Contexto de mercado · tres cifras con su fuente sobre la órbita de luz | `deck.decision-ai-market` | proposal, brochure, pitch, qbr | Abrir la conversación de SEO/AEO con el porqué ahora | No hay fuente verificable para alguna cifra: no se muestra sin fuente | `content-measure`, `decision-ai-answer` | `eyebrow` ≤51, `question` ≤43, `answer` ≤9, `evidence` ≤161, `figures` ≤124 |
| `decision-difference` | La diferencia · agencia commodity vs. método medible, y la objeción del equipo propio | `deck.decision-difference` | proposal, brochure, pitch | El cliente compara con otras agencias o con hacerlo en casa | No hay comparación en juego: la lámina se lee defensiva | `decision-why-us`, `decision-risk` | `eyebrow` ≤51, `question` ≤43, `answer` ≤21, `evidence` ≤161, `alternativeTitle` ≤25, `rows` ≤88, `efeonceTitle` ≤23, `ownTeamTitle` ≤25, `ownTeamPillars` ≤49 |
| `decision-traffic-to-revenue` | Del tráfico al negocio · cuatro escalones hasta los ingresos | `deck.decision-traffic-to-revenue` | proposal, brochure, pitch, qbr | El cliente mide al proveedor por tráfico y hay que subir la conversación a negocio | No hay CRM ni medición de leads: no prometer el escalón que no se puede medir | `decision-chart` | `eyebrow` ≤51, `question` ≤43, `answer` ≤18, `evidence` ≤161, `steps` ≤102, `cutLabel` ≤68 |
| `decision-provider-fit` | El que encaje · cuatro veredictos posibles y el del cliente encendido | `deck.decision-provider-fit` | proposal, brochure, pitch | El cliente compara plataformas CRM (Salesforce, HubSpot) o viene a pedir una licencia. | La plataforma ya está decidida y en operación. | `decision-diagnosis-verdict`, `decision-difference` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `note` ≤115, `verdicts` ≤94, `selectedVerdict` |

### Propuesta por línea de servicio · `proposal-service` (10)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `proposal-service-aeo` | Propuesta AEO · sobria, con lente y cuatro formas de empezar (acento Engine) | `deck.proposal-service` | proposal, brochure | La propuesta AEO necesita que cada forma de empezar se explique con una frase (más datos que impacto) | La lámina tiene que golpear y recordarse: la versión cine hace ese trabajo | `proposal-cinematic-aeo`, `method-score-ring` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90, (+2 opcionales) |
| `proposal-service-creative` | Propuesta de servicios creativos · sobria, con lente y tres formas de comprar (acento Brand) | `deck.proposal-service` | proposal, brochure | La propuesta creativa necesita explicar cada modalidad (Sprint, Capacity, Studio) con su frase | La propuesta pide impacto visual: la versión cine de servicios creativos digitales | `proposal-cinematic-creative`, `content-pricing` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90, (+1 opcional) |
| `proposal-service-web` | Propuesta web · sobria, con lente y cuatro formas de empezar (acento Engine) | `deck.proposal-service` | proposal, brochure | La propuesta web necesita explicar cada modalidad (Foundation, Conversion, Agent-Ready, Performance Ops) | La propuesta pide impacto: la versión cine con la web holográfica | `proposal-cinematic-web`, `content-pricing` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90 |
| `proposal-service-revops` | Propuesta RevOps · sobria, con lente y cuatro formas de empezar (acento Revenue HubSpot) | `deck.proposal-service` | proposal, brochure | Propuesta de RevOps sobre HubSpot que necesita explicar cada etapa (evaluación, Blueprint, implementación, operación) | La propuesta pide impacto: la versión cine con el moño de luz | `proposal-cinematic-revops`, `method-hybrid-workforce` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90, (+1 opcional) |
| `proposal-cinematic-creative` | Propuesta · servicios creativos digitales en cine: la directora dirige una órbita de pantallas | `deck.proposal-cinematic` | proposal, brochure | La propuesta creativa pide impacto (apertura de la sección de servicios creativos) | Hay que detallar cada modalidad con una frase: la versión sobria | `proposal-service-creative`, `content-pricing` | `eyebrow` ≤40, `question` ≤28, `answer` ≤10, `body` ≤140, `steps` ≤22, `photo`, (+1 opcional) |
| `proposal-cinematic-web` | Propuesta web en cine · una web holográfica que usan personas, buscadores y agentes | `deck.proposal-cinematic` | proposal, brochure | La propuesta web pide impacto | Hay que describir cada modalidad: la versión sobria | `proposal-service-web`, `proposal-cinematic-aeo` | `eyebrow` ≤40, `question` ≤28, `answer` ≤12, `body` ≤120, `steps` ≤20, `photo`, (+1 opcional) |
| `proposal-cinematic-aeo` | Propuesta AEO en cine · entre miles de marcas, la IA ilumina una | `deck.proposal-cinematic` | proposal, brochure | La propuesta AEO pide impacto | Hay que detallar cada forma de empezar: la versión sobria | `proposal-service-aeo`, `method-staircase` | `eyebrow` ≤40, `question` ≤26, `answer` ≤11, `body` ≤130, `steps` ≤20, `note` ≤70, `photo`, (+1 opcional) |
| `proposal-cinematic-revops` | Propuesta RevOps en cine · un moño de luz (captar, cerrar, crecer) con agentes en el flujo | `deck.proposal-cinematic` | proposal, brochure | La propuesta de RevOps sobre HubSpot pide impacto | Hay que detallar cada etapa: la versión sobria | `proposal-service-revops`, `method-hybrid-workforce` | `eyebrow` ≤40, `question` ≤30, `answer` ≤11, `body` ≤125, `steps` ≤20, `photo` |
| `proposal-service-seo` | Propuesta SEO · sobria, con lente y cuatro formas de empezar (acento Engine) | `deck.proposal-service` | proposal, brochure | La propuesta AEO necesita que cada forma de empezar se explique con una frase (más datos que impacto) | La lámina tiene que golpear y recordarse: la versión cine hace ese trabajo | `proposal-cinematic-seo`, `proposal-service-aeo` | `eyebrow` ≤40, `question` ≤32, `answer` ≤14, `body` ≤140, `lensPhoto`, `steps` ≤90, (+2 opcionales) |
| `proposal-cinematic-seo` | Propuesta SEO con punch · el mapa de luz del oficio y su núcleo | `deck.proposal-cinematic` | proposal, brochure | La propuesta AEO pide impacto | Hay que detallar cada forma de empezar: la versión sobria | `proposal-service-seo`, `proposal-cinematic-aeo` | `eyebrow` ≤40, `question` ≤26, `answer` ≤10, `body` ≤130, `steps` ≤20, `note` ≤70, `photo`, (+1 opcional) |

### Cotización · `pricing` (3)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `content-pricing` | Cotización · tabla de tres planes con Pro recomendado | `deck.content-pricing` | proposal | En una propuesta, para presentar los planes de Greenhouse junto al fee del equipo. | En un brochure: los montos se definen en cada propuesta. | `content-pricing-live`, `content-pricing-stage` | `eyebrow` ≤16, `question` ≤24, `answer` ≤14, `body` ≤120, `plans` ≤40, `amounts`, `recommendedPlan` |
| `content-pricing-stage` | Cotización en escena · los tres planes en 3D con Pro al frente | `deck.content-pricing.stage` | proposal | En una propuesta presentada en sala, cuando la cotización necesita el mismo impacto que el resto del deck. | En un brochure. | `content-pricing`, `content-pricing-live` | `eyebrow` ≤16, `question` ≤24, `answer` ≤14, `body` ≤90, `plans` ≤32, `amounts`, `recommendedPlan` |
| `content-pricing-live` | Cotización en vivo · cada línea a la vista y el cursor en «Aprobar propuesta» | `deck.content-pricing.live` | proposal | En una propuesta con alcance acordado y una cotización única. | El alcance no está acordado o hay que comparar planes. | `content-pricing`, `content-pricing-stage` | `eyebrow` ≤16, `question` ≤22, `answer` ≤16, `body` ≤110, `quoteTitle` ≤20, `lineItems` ≤48, `total` |

### Próximos pasos · `next-steps` (3)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `decision-next-steps` | Próximos pasos · la agenda del diagnóstico abierta y el cursor en «Agenda un diagnóstico» | `deck.decision-next-steps` | pitch, brochure, proposal | Al final de un pitch o de un brochure, para convertir el interés en una reunión. | En una propuesta enviada después del diagnóstico: ese paso ya ocurrió y el gesto es aprobar. | `content-pricing-live` | `eyebrow` ≤20, `question` ≤22, `answer` ≤10, `body` ≤60, `cardDescriptor` ≤100, `days`, `times`, `chosenSlot`, `nextSteps` ≤70 |
| `decision-diagnosis-map` | Qué entrega el diagnóstico · el informe abierto con sus cuatro entregables | `deck.decision-diagnosis-map` | proposal, brochure, pitch | Cerrar una propuesta o brochure AEO con el primer paso tangible | Ya se hizo el diagnóstico: mostrar el real del cliente | `decision-next-steps`, `decision-diagnosis-verdict` | `eyebrow` ≤51, `question` ≤43, `answer` ≤8, `evidence` ≤161, `reportTitle` ≤38, `engineScores` ≤13, `shareOfVoice` ≤25, `lostPrompts` ≤50, `plan` ≤45, `expertNote` ≤92, (+2 opcionales) |
| `decision-diagnosis-verdict` | Lo que recibes primero · el diagnóstico abierto: estado actual, veredicto de encaje, riesgos, evidencia y roadmap por olas | `deck.decision-diagnosis-verdict` | proposal, brochure, pitch | Propuesta o brochure de una práctica de plataforma (CRM, datos, agentes) que empieza por un diagnóstico de valor y arquitectura. | El diagnóstico es de visibilidad en buscadores y motores de IA: usar decision-diagnosis-map. | `decision-diagnosis-map`, `decision-next-steps` | `eyebrow` ≤51, `question` ≤44, `answer` ≤16, `evidence` ≤179, `reportTitle` ≤52, `reportSubtitle` ≤83, `modules` ≤43, `operationNodes` ≤11, `operationFootnote` ≤56, `verdictOptions` ≤20, `selectedVerdict`, `verdictCondition` ≤113, `risks` ≤49, `recordText` ≤157, `waves` ≤65, (+1 opcional) |

### Respiro · `breather` (1)

| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |
|---|---|---|---|---|---|---|---|
| `breather` | Respiro · foto a sangre y sólo la voz | `deck.breather` | proposal, pitch, qbr | Después de dos o tres láminas densas, para bajar el ritmo sin perder el hilo. | Si la lámina tiene que probar algo: un respiro no lleva cifra ni fuente. | `content-focus`, `section-bleed` | `section`, `question` ≤24, `answer` ≤12, `photo` |

### Familias de AXIS citadas como alternativa (fuera del catálogo)

| id | Qué es |
|---|---|
| `cover-classic` | portada clásica AXIS (deckSlideHtml cover) |
| `close-classic` | cierre clásico AXIS (deckSlideHtml close) |
| `proposal-cinematic` | familia de recetas de propuesta cine en AXIS (layouts service/hero/lines) |
| `section-cine` | familia de secciones con foto cine en AXIS (layouts services/team) |
| `cover-brochure` | familia de portadas de brochure en AXIS |

<!-- deck-recipes-index:end -->
