# Greenhouse — Desacople por dominios de producto (Decision V1)

## Status

- Status: `Accepted` — dirección y orden aprobados por el operador el 2026-10-12 (sesión «Arquitectura Greenhouse:
  desacoplamiento por dominios»). **Ninguna pieza está ejecutada ni tiene task.**
- Date: `2026-10-12`
- Owner: `Platform / Architecture`
- Scope: `topología de productos y repositorios, ownership de dominios, grafo de build del portal, tren de release`
- Reversibility: `two-way-but-slow` por corte; el traspaso de ownership de un schema es lo más lento de revertir
- Confidence: `high` en la dirección; `medium` en el beneficio medible de build (no se corrió ningún build para esta
  decisión)
- Validated as of: `2026-10-12`
- Epic: `EPIC-027`
- Enmienda a: [`GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`](GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md)
  (cláusula «retaining one repository»)

Qué autoriza y qué no: fija **a dónde va cada dominio y en qué orden**. No crea repositorios, deployables, paquetes
ni tasks, y no mueve código. Cada corte se ejecuta por su propia task y trae la evidencia que EPIC-027 ya exige
(costo, routing/auth, rollback, ownership del runtime).

## Context

### Por qué se decide (razón del operador, confirmada el 2026-10-12)

Son dos razones y la primera manda:

1. **Cada dominio vive en el producto al que pertenece.** Greenhouse nació como la plataforma operativa de la agencia
   y terminó hospedando todo lo que se construyó después. Hoy existen productos con identidad propia, y cada dominio
   encaja mejor donde están su usuario y su razón de ser: el design system con AXIS, que ya lo gobierna más y mejor;
   Growth y Search Visibility 360 con Marketing Studio; lo comercial con la experiencia de venta. Greenhouse vuelve
   a ser portal cliente y backoffice de la agencia.
2. **El build y el paso a producción de Greenhouse son un dolor real**: todo dominio viaja en un solo tren.

El criterio de destino es la pertenencia, no la métrica. Por eso Hiring se queda aunque es de lo que más cambia (es
Talent de la agencia) y Commercial se irá aunque casi no cambia (su lugar es la experiencia de venta). Las
mediciones de abajo **no justifican** la decisión: sirven para ordenar los cortes y saber qué esperar de cada uno.

El ADR de build units (2026-07-10) respondió sólo a la segunda razón, con unidades de build dentro de un
repositorio, y su piloto (`TASK-1382`, Design System Labs) quedó sin sujeto cuando el Lab se fue al repositorio de
AXIS.

### Medición

Del 2026-10-12 sobre el checkout de `develop` (método al final, en «Evidence»):

| Dominio | Páginas | Rutas API | LOC en `src/lib` | Commits de código en 60 días |
| --- | --- | --- | --- | --- |
| Design System (Lab) | 43 | 15 | — | — |
| Knowledge | 2 | 6 | 5,8k | fuera del top 30 |
| Growth + SEO/AEO | ~18 | 121 | 74k | 117 |
| Efeonce Insights | 0 | 47 | 17k | 121 |
| Compositor + catálogos + `brand-surfaces` + Glitch + Manzanitas | 0 | 0 | ~34k | 148 |
| Hiring | 6 | 64 | 35k | 126 |
| Commercial | ~23 | ~51 | 47k | bajo (70 archivos tocados) |
| Finance | 36 | 160 | 91k | 41 |
| **Total Greenhouse** | **303** | **1.199** | | **849** |

Tres lecturas que ordenan los cortes:

1. **El 80 % de los entrypoints son rutas API.** Sacar sólo interfaces alivia poco el grafo; un corte vale cuando el
   dominio se va con su API.
2. **El tren de release lo empujan cuatro bloques**, cada uno presente en 14–17 % de los commits de código recientes:
   composición de marca, Hiring, Insights y Growth. Finance, el dominio más grande, aparece en 5 %.
3. **El bloque del compositor es contenido de marca, no lógica.** El motor son ~5k LOC sin imports de dominio; lo que
   se mueve a diario son 922 archivos de catálogo (JSON, HTML, SVG, fuentes, CSS).

Los conteos por dominio se solapan (un commit puede tocar dos) y no se deduplicaron.

## Decision

Greenhouse deja de ser el hogar de todo. Cada dominio vive en el producto que posee su ciclo de vida, se va **entero**
y consume lo ajeno por contrato. Greenhouse conserva el portal cliente y el backoffice de la agencia.

| # | Dominio | Destino | Qué se va | Qué queda en Greenhouse |
| --- | --- | --- | --- | --- |
| 1 | **Knowledge** | **Se queda en Greenhouse** (operador, 2026-10-12). Se planteó retirarlo, se midió su uso y la decisión final fue conservarlo | Nada | Todo, como está |
| 2a | **Design System Lab** | AXIS (`axis.efeonce.org`, destino declarado por el operador) | Las 43 páginas y 15 rutas de `/design-system` | Nada; Greenhouse deja de hospedar el design system |
| 2b | **Composición de marca**: catálogos `graphic-line-*`, `deck-axis`, `brand-packs/axis`, `brand-surfaces`, Glitch, Manzanitas | AXIS, junto a `axis-graphic-line` | Catálogos, recetas y sus baselines visuales | Nada |
| 2c | **Motor del Artifact Composer** | Paquete versionado en el workspace de AXIS | `src/lib/artifact-composer/*.ts` (motor) | `services/artifact-worker` sigue aquí como Cloud Run Job y consume el paquete por versión |
| 3 | **Growth + Search Visibility 360** | Marketing Studio | Vertical completo: interfaz, API, `src/lib/growth`, crons y los consumers reactivos que hoy corren en `ops-worker` | Lo que el portal cliente muestre de Growth, consumido por API |
| 4 | **Efeonce Insights** | Dominio propio, servicio sin interfaz | `src/lib/efeonce-insights`, sus lanes, sus catálogos `insights-*`, entrega y recurrencia | Nada |
| 5 | **Commercial** | **Diferido.** La API permanece en Greenhouse; la interfaz se decide después, con Rooms como candidato | Nada por ahora | Todo |

Permanecen en Greenhouse: portal cliente, Knowledge, Finanzas, RRHH y Payroll, Talent (Hiring incluido, por decisión expresa del
operador pese a su frecuencia de cambio), Agencia, Personas, Organizaciones.

### Orden

`2a → 2b → 2c → 3 → 4`; el 5 no tiene fecha y el 1 no es un corte. El orden es de dependencia, no de preferencia:

- **El cierre del Lab se mide**: build del portal antes y después de retirar las 43 páginas. Es el primer número real
  de cuánto compra sacar páginas y reemplaza al piloto que `TASK-1382` ya no puede correr.
- **Insights sale último** porque consume Growth, ICO y el compositor. Antes de los cortes 2c y 3 tendría que cruzar
  hacia Greenhouse para todo.

### Knowledge: lo que Nexa consume de verdad (medido 2026-10-12)

En código, sí: Nexa expone la tool `search_knowledge` (`src/lib/nexa/nexa-tools.ts`), con sus flags presentes en
Vercel Production. En uso, casi nada es de personas. De 1.196 turnos que llamaron la tool desde el 2026-06-15,
1.192 son del usuario `user-agent-e2e-001`, que repite nueve preguntas fijas unas diez veces al día desde el
workflow `nexa-knowledge-qa-nightly.yml`. Las personas la usaron **cuatro veces en cuatro meses** (tres usuarios).
El corpus tiene 113 documentos y 1.546 chunks, y no recibe una publicación desde el 2026-08-24.

Dónde vive y de dónde sale el contenido:

- **Almacén**: schema `greenhouse_knowledge` en la instancia PostgreSQL compartida, 17 MB en total (16 MB son
  `knowledge_chunks`, con texto, índice de búsqueda y embeddings de Vertex). Código: 5,8k LOC en
  `src/lib/knowledge` y 3,3k en sus vistas.
- **Fuente 1, documentos de este repositorio** (79 de 113): una lista fija en
  `src/lib/knowledge/ingestion/pilot-corpus.ts` que apunta a archivos de `docs/context`, `docs/documentation` y
  `docs/manual-de-uso`. Se cargan a mano con `scripts/knowledge/ingest.ts`; no se actualizan solos cuando el
  documento cambia.
- **Fuente 2, Notion** (22): el árbol de páginas «Greenhouse Knowledge — Notion», con su propia integración. Un
  webhook de Notion dispara un consumer en `ops-worker` que vuelve a leer la página cambiada.
- **Residuo** (12): doce fuentes «Live test source» con un documento cada una, restos de pruebas en la base
  compartida.

Con esta medición a la vista el operador decidió que Knowledge se queda. Dos hechos quedan anotados sin acción: el
workflow nocturno es quien produce casi todo el uso que muestra la telemetría, y el contenido tomado del
repositorio no se refresca solo.

### Prerrequisitos que ya se conocen

- **2b/2c**: el compositor y `brand-surfaces` se importan mutuamente (3 y 42 imports) y un test del motor importa de
  Insights. Se corta antes de mover. El motor resuelve catálogos por ruta de archivo en cinco módulos; el paquete
  necesita recibir el catálogo como entrada.
- **3**: Growth sólo se mueve con su API y sus procesos asíncronos. Los nombres y scopes de las tools MCP ya
  federadas (`growth.seo.*`) se conservan; cambia el provider detrás del gateway.
- **4**: Insights tiene 32 referencias SQL directas a `greenhouse_growth` y 13 imports de `src/lib/growth`. Pasan por
  readers del dueño antes del corte, como ya exige su propio invariante.

## Lo que enmienda

- **Build units**: la cláusula «retaining one repository» deja de ser la regla. La unidad de corte pasa a ser el
  producto con su repositorio. Sigue vigente todo lo demás: sin big-bang, datos y transacciones sin dividir por
  anticipado, evidencia por frontera, y la regla de trabajo nuevo extraction-ready.
- **Knowledge Platform** (`GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1.md`): sin cambio. Se queda en Greenhouse; el
  ADR sigue `Accepted` y el runtime y sus invariantes en pie.
- **Efeonce Insights** (`EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`): deja de ser «dominio Greenhouse» como destino
  final. Su contrato (ventanas, idempotencia, snapshots inmutables, gate humano) no cambia.
- **Rooms**: sin cambio hoy. Si la interfaz de Commercial o del cotizador nace allí, su ADR debe enmendarse primero:
  hoy difiere CPQ y dice que Rooms no genera precios.

## Runtime Contract

- Un dominio se mueve como **vertical completo** o no se mueve. Interfaz en un producto y API en otro para el mismo
  dominio obliga a dos releases por cambio.
- Entre productos sólo hay contratos versionados (HTTP o MCP) con autorización, correlación y errores saneados.
  Ningún producto lee tablas, sesiones ni secretos de otro.
- Hay una sola instancia de PostgreSQL para desarrollo, staging y producción. Traspasar un dominio es traspasar el
  **ownership de su schema en esa misma instancia**, sin mover datos.
- Las piezas compartidas son paquetes con dueño y versión exacta. No se crea una capa `shared` genérica.
- Cada corte declara flag o ruta de retorno, y el dominio sigue operando en Greenhouse hasta que el destino pase su
  verificación con tráfico real.
- Nada de esto pausa producto: el trabajo nuevo sigue naciendo donde vive hoy su dominio, extraction-ready.

## Alternatives Considered

| Alternativa | Decisión |
| --- | --- |
| Mantener un solo repositorio con build units (ADR del 2026-07-10 tal cual) | Reemplazada como regla: su piloto perdió el sujeto y no ataca el tren de release único. |
| Mover sólo interfaces y dejar toda la API en Greenhouse | Rechazada: las rutas API son el 80 % de los entrypoints y cada cambio pediría dos releases. |
| Interfaz de Commercial a Rooms ahora | Diferida: Rooms no tiene runtime, Commercial casi no cambia y el cotizador se está rehaciendo con la interfaz como última fase. |
| Compositor dentro de Rooms, Studio o Insights | Rechazada: tiene cinco consumidores; los demás quedarían dependiendo de un producto ajeno. |
| Repositorio propio para el compositor | Rechazada: un repositorio y un release más para ~5k LOC; AXIS ya publica paquetes privados y gobierna los catálogos. |
| Insights dentro de Marketing Studio | Rechazada: también consume ICO, que se queda en Greenhouse; es un producto de reporte entre fuentes. |
| Sacar Hiring | Rechazada por el operador: sigue en Greenhouse como parte de Talent. Costo aceptado: 15 % de los commits de código. |

## Consequences

### Positivas

- Los cortes 2 a 4 sacan del tren de Greenhouse los bloques que aparecen en cerca del 45 % de los commits de código
  recientes (sin deduplicar).
- El contenido de marca deja de exigir un build y un release del portal.
- Cada producto queda con costo, duración de build y release atribuibles.

### Negativas

- Más productos que operar: manifiestos de entorno, releases, observabilidad y relying parties por cada uno.
- Desfase de versiones entre paquetes y consumidores. Ya ocurre: el 2026-10-12 un bump de `axis-brand-assets` dejó
  tres tests rojos en Greenhouse. El motor del compositor todavía cambia casi cada semana, así que el corte 2c lo
  hará más frecuente.
- Greenhouse sigue siendo grande: tras el plan conserva cerca del 85 % de sus entrypoints. El dolor de build baja,
  no desaparece.

## Los cuatro pilares

| Pilar | Lectura |
| --- | --- |
| **Safety** | El riesgo mayor es el aislamiento entre productos sobre una instancia compartida: un rol por producto con privilegio sólo sobre su schema, y verificación del privilegio efectivo, no del declarado. Los scopes y el consentimiento de las tools MCP no cambian de nombre. Sin datos borrados en ningún corte. |
| **Robustness** | Corte vertical con el dominio operando en origen hasta verificar el destino. Contratos versionados; el consumidor fija versión exacta. Las referencias SQL cruzadas se eliminan antes del corte, no después. |
| **Resilience** | Ruta de retorno por corte (flag o reversión de routing). Las señales de reliability de cada dominio se mudan con él: un dominio que sale sin sus señales queda ciego. El outbox y los consumers reactivos de Growth necesitan dueño en el destino antes de apagarse en `ops-worker`. |
| **Scalability** | Baja el grafo y, sobre todo, la frecuencia de release del portal. No mejora el techo de la instancia de base, que sigue compartida. El costo operativo crece con el número de productos y lo absorbe una operación pequeña. |

## Reglas duras

- **NUNCA** mover la interfaz de un dominio sin su API y sus procesos asíncronos.
- **NUNCA** leer el schema de otro producto por SQL; se consume su reader o su API.
- **NUNCA** borrar datos o tablas al retirar o traspasar un dominio.
- **NUNCA** crear un repositorio, deployable o paquete por anticipado: lo crea la task del corte, con su evidencia.
- **NUNCA** renombrar una tool, un scope o una ruta pública ya consumida al cambiar su dueño.
- **SIEMPRE** medir el build del portal antes y después de cada corte, y registrar el número.
- **SIEMPRE** mudar las señales de reliability y el runbook junto con el dominio.

## Lo que no se decidió

- Destino final de la interfaz de Commercial y del cotizador V3 (portal o Rooms).
- Dónde viven las migraciones de un schema cuyo dueño ya no es Greenhouse, y con qué ledger. Hoy todas salen de este
  repositorio contra una sola tabla de control.
- Si Insights nace en repositorio propio o dentro de uno existente; se decidió el dominio, no su hospedaje.
- Destino de Nexa, de Admin (328 rutas), de los lanes de API Platform y de las superficies públicas de AEO. No se
  discutieron.
- Si Manzanitas es marca propia: se asignó a AXIS por analogía con Glitch, sin verificar.
- El nuevo sujeto formal de `TASK-1382`; aquí sólo se propone la medición del cierre del Lab.

## Revisit When

- El cierre del Lab no reduce el build del portal de forma medible.
- Un corte obliga a coordinar dos releases para cambios corrientes del mismo dominio.
- El desfase de versiones del motor del compositor cuesta más que lo que ahorra sacarlo.
- La instancia compartida se vuelve el límite de aislamiento o de carga.

## Evidence

Medido el 2026-10-12 en el checkout compartido, rama `develop`:

- Páginas y rutas: `find src/app -name 'page.tsx'` y `find src/app/api -name 'route.ts'`, agrupados por segmento y
  por nombre de dominio en la ruta.
- LOC: archivos `.ts`/`.tsx` sin tests por directorio de `src/lib`.
- Frecuencia: `git log --since="60 days ago"` filtrado por rutas, contando commits distintos; 849 tocan `src/` o
  `services/` de 3.200 totales.
- Acoplamiento: imports `@/lib/<dominio>` y referencias `greenhouse_<schema>.` dentro de cada dominio.

- Uso de Knowledge: `greenhouse_ai.nexa_turn_telemetry` (`tools_used`) cruzado con `nexa_messages` y
  `greenhouse_knowledge.*`, leído con el perfil `runtime` sobre la instancia compartida. Esa instancia sirve a
  desarrollo, staging y producción, y la telemetría no distingue el ambiente.

No se midió: tiempo ni memoria de build por ruta, y si pesan más las páginas o las rutas API.

Relacionados: [EPIC-027](../epics/in-progress/EPIC-027-greenhouse-build-cost-recovery-decomposition.md) ·
[AXIS Shared Product UI Platform](EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md) ·
[Marketing Studio](marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md) ·
[Rooms](rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md) ·
[Cotizador V3](GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md) ·
[modelo de trabajo nuevo](../operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md).
