> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-08-27 por Claude (TASK-1696)
> **Ultima actualizacion:** 2026-09-03 por Claude (TASK-1805: el evaluador de la fórmula ETV nace apagado, con allowlist, máximo de requests y tope USD; el dry-run no gasta)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) · [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)

# Gasto de Proveedor y Presupuesto — Growth (SEO + AEO)

## Qué es esto

Greenhouse le compra datos a un proveedor externo (DataForSEO) para dos servicios distintos:

- **SEO** — la captura diaria de rankings, la auditoría del sitio, el perfil de enlaces y los datos de mercado de keywords.
- **AEO** — el grader de visibilidad en IA, cuando le consulta a Google AI Mode qué responde sobre una marca.

Cada llamada que se le paga al proveedor queda anotada en **un solo libro de gasto**. Este documento explica qué anota ese libro, cómo se lee cortado por servicio, cuánto puede gastar cada organización y qué avisa la plataforma cuando algo se sale de lo esperado.

## El problema que resolvió TASK-1696

Hasta agosto de 2026 el libro de gasto sólo veía la mitad del gasto. El grader de IA compraba consultas de AI Mode por un camino que nunca declaraba **de qué organización** era esa compra, así que ese gasto no quedaba anotado en ninguna parte.

Dos consecuencias medidas:

- **El 87,5% de los dólares históricos del grader no tenía organización atribuida.** No es que se perdiera plata: es que no se sabía a quién servía cada dólar.
- **Una organización contratada podía gastar hasta USD 40 al mes en el grader sin que nada la mirara.** Su único límite era un conteo de corridas (20 al mes), y un conteo de corridas no acota dólares.

Lo que cambió: el libro ahora distingue **quién consumió** cada dólar y **de qué tipo** es ese dólar, el presupuesto SEO dejó de mezclarse con el del grader, y existe un presupuesto en dólares por organización para el grader — todavía en modo observación, sin bloquear a nadie.

## Un solo libro, dos consumidores

**Nunca se abre un segundo libro de gasto.** Una factura de proveedor es una sola: dos tablas serían dos verdades y una reconciliación manual que nadie va a hacer. Lo que se separa es el **presupuesto**, no el registro.

Cada anotación del libro declara:

| Corte | Valores | Qué responde |
|---|---|---|
| **Consumidor** (`consumer`) | `seo` · `aeo` | ¿Para cuál de los dos servicios se compró este dólar? |
| **Familia** (`family`) | `serp` · `labs` · `backlinks` · `onpage` · `domain` | ¿Qué se compró? (SERP en vivo, datos de mercado de keywords, enlaces, auditoría del sitio, analítica de dominio) |
| **Base de costo** (`cost_basis`) | `invoiced` · `estimated` | ¿Lo cobró el proveedor, o lo calculamos nosotros? |
| **Versión de tabla de precios** | sólo si es `estimated` | ¿Con qué tabla de precios se calculó? |

**Consumidor y familia no son lo mismo.** La familia dice *qué* se compró; el consumidor dice *para qué servicio*. La familia `serp` la compran los dos: la captura diaria de rankings (consumidor `seo`) y el grader preguntándole a AI Mode (consumidor `aeo`). Sin el corte por consumidor, los dos gastos quedaban en la misma línea.

**El consumidor es parte de la identidad de la anotación, no un adorno.** Dos consumidores el mismo día sobre la misma familia son **dos líneas**, jamás un total mezclado.

## Facturado y estimado nunca se suman en una cifra sola

Hoy todas las líneas del libro son dólares **facturados**: los escribe el propio transporte leyendo lo que el proveedor cobró en la respuesta. Pero el día que entre un dólar **estimado** —y va a entrar, porque el gasto de los modelos de lenguaje propios también necesita presupuesto por organización— hay que poder distinguirlos.

Un total que suma dólares facturados y dólares estimados y se presenta como un número solo **no es un dato degradado: es un dato falso**, y es defendible ante un cliente sólo hasta que pregunte de dónde salió.

Por eso la base de costo es obligatoria y va acoplada a su procedencia: una línea `estimated` **no puede existir** sin declarar con qué versión de tabla de precios se calculó, y una línea `invoiced` **no puede inventar** una. La regla la sostiene la base de datos, no la buena voluntad de quien escriba el próximo writer.

## Los dos presupuestos

Son dos preguntas distintas con dos respuestas distintas:

| Pregunta | Respuesta |
|---|---|
| *¿Cuánto le pagamos al proveedor por esta organización?* | **Una sola** — es una sola factura. Un solo libro. |
| *¿Cuánto puede gastar esta organización en SEO / en AEO?* | **Dos** — son dos servicios, con dos contratos, dos cadencias y dos tiers. |

### Presupuesto SEO

Existía desde antes y funciona igual: el chokepoint `enforceSeoRunEntitlement` evalúa el presupuesto del mes antes de dejar gastar y bloquea con `budget_exhausted` cuando se agota.

**Lo que cambió:** ahora suma **sólo el gasto con consumidor `seo`**. Sin ese filtro, el primer dólar del grader se le habría descontado al cliente SEO y el gate habría empezado a bloquear capturas de rankings por un gasto ajeno — sin que nada fallara ni avisara.

### Presupuesto AEO (nuevo, en modo observación)

`resolveAeoBudget` es el espejo del lado SEO: presupuesto en dólares por organización para el grader. Reporta **las dos monedas por separado**, nunca una cifra opaca:

- **Facturado** — lo que el proveedor cobró por las consultas de AI Mode de esa organización (del libro).
- **Estimado** — lo que costaron los modelos de lenguaje propios, ya descontada la porción que el libro contabiliza (para no contar el mismo dólar dos veces).

Topes por tier, deliberadamente holgados:

| Tier | Tope mensual |
|---|---|
| Contratado | USD 60 |
| Piloto | USD 10 |
| Trial | USD 3 |

**Están holgados a propósito.** En modo observación el tope tiene que dejar pasar todo, porque si no la medición sería de la restricción y no de la realidad.

## Por qué el gate nace sin bloquear

El gate del presupuesto AEO tiene **dos interruptores**, ambos apagados hoy:

- `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED` — **medir**. Calcula el presupuesto en cada corrida, registra lo que *habría* pasado (`wouldBlock`) y alimenta la señal de sobregiro. No bloquea nada.
- `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED` — **bloquear**. Subordinado al anterior: prenderlo solo no hace nada. Sólo con los dos encendidos el gate rechaza corridas con `budget_exhausted`.

Dos razones para que sea así:

1. **El camino público del lead magnet comparte el motor del grader.** Un tope mal calibrado no degrada un tablero interno: corta captación real.
2. **Hoy no sabemos cuál es el tope correcto.** La mayoría del gasto histórico no tenía dueño atribuido, así que cualquier número calculado con esos datos sería, en su mayor parte, gasto del que ni siquiera sabemos de quién es.

La secuencia correcta es: hacer visible primero, medir un mes calendario completo con el gate en observación, y recién entonces llevarle al operador el dato con una propuesta de tope. **El flip a bloqueo es una decisión comercial, no un paso técnico.**

## El gasto que no tiene dueño

El grader corre sobre prospectos públicos que todavía no son clientes. Esos perfiles no tienen organización, y el libro de gasto exige una (tiene llave foránea a organizaciones).

La postura es explícita: ese gasto **no entra al libro** y **sí entra a la señal**. Forzar una organización inventada para que "cuadre" sería peor que el hueco — ensuciaría la contabilidad de un cliente real con gasto de captación.

Consecuencia práctica: *"no está en el libro"* nunca significa *"no ocurrió"*. La señal de drift lo reporta como gasto real y visible, sólo que no atribuible.

## Las tres señales

Aparecen en `/admin/operations` bajo el grupo `growth`. No hay pantalla nueva: entran por el registro de señales que ya existía.

### `growth.dataforseo.spend_ledger_drift` — esperado: 0

Compara, mes a mes, las consultas de AI Mode que **sí le pagaron al proveedor** contra las llamadas anotadas en el libro. Distingue dos causas y no las trata igual:

- **Amarillo (advertencia)** — el perfil era un prospecto público sin organización. El libro no puede registrarlo. Es gasto real y visible, no un error.
- **Rojo (error)** — el perfil **sí tenía** organización y aun así no quedó anotado. Eso es un error de atribución: se le está gastando plata a un cliente sin cargarla a su presupuesto.

Compara **conteo de llamadas**, no dólares. El costo que devuelve el proveedor es del lote completo, no de la consulta individual, así que una comparación de montos sería falsa apenas alguien mandara un lote.

### `growth.ai_visibility.observation_yield`

Rendimiento (observaciones exitosas sobre el total) del grader en una ventana móvil de 30 días, **cortado por proveedor**.

El corte por proveedor no es un lujo: **el promedio esconde el problema**. Un 68% agregado se lee como aceptable mientras un proveedor concreto está en 29% — que es justamente el que ahora se instrumentó económicamente. Una señal que sólo publicara el promedio serviría para tranquilizar, no para operar.

Un proveedor **sin observaciones** en la ventana se reporta como "sin datos", nunca como 0%: *"no se intentó"* no es *"salió mal"*, y confundirlos es el tipo de falso positivo que hace que la gente deje de mirar el tablero.

Límite declarado: mide sobre las observaciones que existen, así que no ve los pares (pregunta, proveedor) que **nunca se intentaron**. Un 100% significa "todo lo que se intentó salió bien", nunca "se intentó todo".

### `seo.provider.cost_over_budget` — esperado: 0

Avisa cuando una organización pasa el **80%** de su presupuesto del mes (amarillo) o lo agota (rojo), **antes** de que el gate empiece a rechazar corridas.

El control duro ya existía: `enforceSeoRunEntitlement` bloquea antes de gastar. Lo que faltaba era el aviso previo — hasta ahora el sobregiro sólo se manifestaba como corridas que empezaban a fallar, sin advertencia. Cubre los dos consumidores, cada uno contra el tope de su propio tier.

> Nota de higiene: esta señal aparecía citada como mitigación en la tabla de riesgos de nueve tasks (ocho de ellas ya cerradas) y **no existía**. Cada una la daba por construida por otra. Entró acá porque necesita el corte por consumidor para ser correcta: una alarma que sólo viera el gasto `seo` sub-reportaría exactamente el gasto del grader que se acaba de atribuir.

## El evaluador de la fórmula ETV: gasto que hoy es cero (TASK-1805, 2026-09-03)

Para decidir si el módulo pasa a la fórmula nueva de tráfico estimado del proveedor (Improved ETV, corte
2026-11-01) existe un evaluador que compara las dos fórmulas sobre los mismos sujetos. Nace **apagado** y
con frenos propios, porque comparar cuesta dinero real:

- **Interruptor:** `GROWTH_SEO_ETV_EVALUATOR_ENABLED` (OFF). Sin él, el evaluador sólo planifica.
- **Frenos:** una lista de sujetos permitidos (`GROWTH_SEO_ETV_EVALUATOR_SUBJECT_ALLOWLIST`), un máximo
  de requests (`GROWTH_SEO_ETV_EVALUATOR_MAX_REQUESTS`) y un tope en USD
  (`GROWTH_SEO_ETV_EVALUATOR_BUDGET_USD`). Vacío y cero son los valores por defecto: sin allowlist, sin
  requests y sin dólares, nada corre.
- **El dry-run no gasta.** Reporta qué haría y por qué no lo haría, con `providerCalls: 0`.
- **Un A/B exacto duplica las llamadas.** Comparar de verdad exige comprar el mismo sujeto dos veces, una
  por fórmula. El costo de una evaluación exacta es 2× el de una captura normal por cada celda comparada.
- **La fórmula nueva no tiene recargo.** Pedir Improved ETV cuesta lo mismo que la fórmula anterior. Lo que
  sí es **otro carril, con precio ×2**, es pedir datos de navegación real (`include_clickstream_data`),
  que el módulo mantiene apagado.

Hoy el evaluador no ha comprado nada. La decisión de correr una evaluación pagada —con qué sujetos, cuántos
requests y qué tope— es de `TASK-1806`. Runbook:
[Evaluar la transición a DataForSEO Improved ETV](../../manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md).

## Quién puede ver el gasto

El gasto es **lo que a Efeonce le cuesta servir a un cliente**, no algo que el cliente haya consumido. Por eso:

- **No se expone en ninguna superficie de cliente.** Un cliente leyendo su propia línea estaría leyendo nuestra estructura de costos.
- La lectura programática (`/api/platform/ecosystem/growth/seo/provider-spend` y su herramienta MCP `get_seo_provider_spend`) está reservada a integraciones **internas**. Una integración de cliente recibe un 404, no un 403: no debe aprender siquiera que el recurso existe.

> Detalle técnico: escritura del gasto en el transporte (`src/lib/ai/dataforseo.ts` + `recordSeoProviderSpend`), lectura cortada por consumidor en `readSeoProviderSpendByConsumer` (`src/lib/growth/seo/provider-spend.ts`), presupuesto AEO en `src/lib/growth/ai-visibility/budget.ts`, señales en `src/lib/reliability/queries/`. Spec: [TASK-1696](../../tasks/complete/TASK-1696-growth-provider-spend-consumer-dimension-grader-usd-gate.md). Operación paso a paso: [manual de uso](../../manual-de-uso/growth/operar-gasto-de-proveedor-y-presupuesto.md).
