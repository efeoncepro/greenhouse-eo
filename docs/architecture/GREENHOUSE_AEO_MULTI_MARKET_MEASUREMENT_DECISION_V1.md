# AEO Grader: identidad de mercado y metodología multidioma

> **Nomenclatura:** [Efeonce AEO](EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md) es el nombre comercial de la capacidad desde 2026-09-29. `AEO Grader` sigue siendo el alias técnico/histórico de este motor y el contrato de medición multimer­cado de este ADR no cambia.

- Estado: **Accepted for implementation**, 2026-09-28, por instrucción del operador en TASK-1863.
- Owner: Growth / EPIC-020. Estado de runtime: [evidencia de rollout](../audits/platform/2026-09-28-task-1863-verification.md); main en espera, sin habilitación externa nueva.
- Canon anterior: [arquitectura del Grader](GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md).

## Contexto

`EO-GRUN-00056` transmitió `location_name="Perú"` y obtuvo siete errores `40501`. El país numérico
`2604` resolvió la solicitud. Cambiar sólo el idioma ocultaría la causa y dejaría sin resolver la
medición de clientes de EE. UU., Latinoamérica y España. Cuatro mapas divergentes y un fallback a
EE. UU. impedían declarar qué se midió.

## Decisión

1. `src/lib/growth/markets` es el catálogo puro compartido. País ISO y locale son ejes independientes.
   Familias implementadas: español, inglés, portugués de Brasil y francés. Se validan antes del gasto.
   23 entradas: los 20 países independientes de Latinoamérica, Puerto Rico, España y EE. UU.
   Cuba existe como mercado del producto; Google AI Mode vía DataForSEO no tiene ubicación para
   Cuba en el catálogo leído el 28-09: `skipped:market_unsupported`, sin compra ni fallback.
2. Un perfil de marca posee N configuraciones inmutables de país+locale; se conservan los perfiles
   legacy activos según la compatibilidad descrita abajo. Cambiar país o
   idioma crea otra configuración. Pausa, reanudación, archivo y cambio de principal son commands.
   El perfil legacy conserva un espejo del mercado principal, competidores nominales y cadencia.
3. Un run mide un mercado. Un lote reserva el costo total y encola todos sus runs en una misma
   transacción con outbox. Lock global de reservas antes del lock de perfil evita sobreconsumo
   concurrente del tope diario; orden de locks único. No se mantiene el lock durante llamadas AI.
4. Rights: `growth.ai_visibility.market.manage`, sólo interno con roles admin/account/operations.
   `run.operator` conserva puerta interna. Portal deriva organización de sesión; extra mercados
   requieren tier contracted y `metadata_json.aeo_markets_included` como array de países ISO.
   Una cuota cuenta runs, no lotes; un mercado adicional en otro idioma también consume un run.
   No se amplían assignments ni se presume que Sky tenga seis mercados contratados.
5. Snapshot inmutable por run: marca/aliases, competidores y versión, país/locale, policy y origen.
   Enqueue y cambios de configuración comparten lock de perfil. Normalización/re-score usan la foto.
   Los históricos sin snapshot mantienen su contrato legacy, sin backfill de geografía inferida.
6. Packs deterministas localizados con IDs/tags conservados y versión nueva; sin traducción LLM en
   cada medición. Los prompts autorados se enlazan al mercado y se aprueban como antes; el backfill
   enlaza su configuración legacy al principal original, sin reescribir prompts ni runs.
7. Google usa siempre location_code y el idioma del catálogo AI Mode. OpenAI, Anthropic y Sonar
   reciben país nativo; Gemini declara `prompt_only`. País nativo orienta la búsqueda, no garantiza
   una réplica de la experiencia de cada usuario final. Hash request v2 incluye país y locale.
8. Reports distinguen solicitados, intentados y respondidos; éxito sin citas no significa cero
   visibilidad de marca ni citas inventadas. Matriz sin promedio (`blendedOverall: null`). Tendencias
   sólo dentro del mismo mercado, identidad de marca (nombre, aliases, dominio y categoría) y policy;
   pack distinto se declara incomparable. Cambio de set
   elimina delta competitivo y overall, preservando dimensiones independientes.
9. Regrade por mercado con weekly/monthly/quarterly; compatibilidad del principal sincronizada con
   los campos legacy. SEO cruza por país+idioma del target; no toma el último run de otro país.

## Alternativas descartadas

- Forzar inglés: no corrige location_name ni satisface el idioma del cliente.
- Un perfil por país: duplica identidad de marca y vuelve ambiguo el reader de organización.
- Medición global en un run o promedio simple: pierde geografía y fabrica comparabilidad.
- Mutar históricos para completar nuevas columnas: atribuiría una ubicación que no fue medida.
- SDK/transporte paralelo: omite ledger, breaker y guardas existentes.

## Rollout y reversión

Migraciones, reconciliación y backfill antes del código que consume tablas; drenar runs pendientes
legacy antes de cambiar policy. Vercel y el **único ops-worker compartido** deben consumir la misma
versión. Flag multimer­cado default OFF: en el writer habilita la selección de mercados secundarios;
en el scheduler del worker decide entre recurrencia por mercados y recurrencia legacy de perfiles.
Staging puede autorizar lotes explícitos mientras el worker conserva OFF hasta promover el writer de
`main`; el drain ejecuta los runs ya encolados. Catálogo, snapshots
y request correctness aplican a runs nuevos aun con OFF. No tratar staging como base o worker aislado.

El tope conservador `GROWTH_AI_VISIBILITY_BATCH_DAILY_BUDGET_USD` (25 por defecto) reserva techos por
lote UTC, independientemente de cuotas de cliente; no sustituye el presupuesto público/trial existente.
Los pendientes/running reservan su saldo antes del presupuesto mensual de cliente. El shadow conserva
observabilidad; enforce es independiente. El canal operador consume el tope diario de lotes y no la
cuota ni el presupuesto mensual del servicio del cliente.

Reversión operativa: desactivar multimer­cado y pausar recurrencia adicional; conservar datos.
Down destructivo sólo antes de datos productivos o con respaldo/reconciliación explícita de prompts
activos y cadencias trimestrales. La ronda local Up→Down→Up es parte de la evidencia, no autorización
para ejecutar Down en producción.

## Verificación y límites

[Plan](../tasks/plans/TASK-1863-plan.md), [evidencia](../audits/platform/2026-09-28-task-1863-verification.md),
[manual](../manual-de-uso/growth/configurar-mercados-aeo.md). Reabrir ante ubicación por ciudad,
idiomas adicionales, pesos comerciales entre mercados o contención medida del lock de reservas.

## Compatibilidad legacy (2026-09-28)

Múltiples perfiles activos por organización se conservan: no prueban duplicidad ni autorizan archivar.
La unicidad del nuevo modelo es por perfil/país/locale; el reader organizacional mantiene su selección
legacy y sus mercados nuevos. La transición de perfiles entre países requiere correspondencia confirmada,
sin reasignar runs ni competidores por inferencia. DDL de compatibilidad `20260928095058691`.

## Entradas y marcas (2026-09-28)

La resolución de categoría, arquetipo, país e idioma es común en `buildExecuteInput`, tanto para
inline como para enqueue. Un modelo de negocio explícito prevalece; si la entrada legacy no lo
trae, el clasificador canónico deriva el prior de la categoría resuelta. Una clasificación ambigua
no se convierte en agencia. Se conserva el gate de categoría y los flags de transición existentes.
La corrección de datos de Efeonce no es un default ni una excepción en código para esa marca.
Operador/portal/recurrencia usan batches; formularios y API directa usan el mismo command. La futura
exposición MCP de TASK-1861 debe consumir ese contrato, sin duplicar generación ni ejecución.
