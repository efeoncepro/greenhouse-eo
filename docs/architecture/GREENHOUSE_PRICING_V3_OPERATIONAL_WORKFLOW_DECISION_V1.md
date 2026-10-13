# Pricing V3 — flujo operativo local para agentes

- Status: `Accepted` local, por pedido del operador de completar pendientes, 2026-10-09.
- Owner: Commercial/Finance + Platform; Operations posee asignación y evidencia de acceso.
- Work unit: [TASK-2022](../tasks/complete/TASK-2022-pricing-v3-operational-agent-workflow.md).
- Reversibility: two-way; opt-in, sin cambio al canon/API/DB ni catálogos anteriores.
- Estado: completo local; validación económica y promoción canónica conservan fronteras propias.

## Decisión y dominio reusable

El agente interpreta lenguaje, identifica alcance y completa inputs. El dominio descubre y valida candidatos,
compone recursos, reparte costos y calcula con Decimal. CLI carga JSON y serializa; no llama LLM ni contiene
fórmulas comerciales. UI, API y MCP futuros consumirán las mismas primitives mediante adaptadores gobernados.
No hace falta conservar Excel en el flujo de cálculo: éste permanece como antecedente trazable.

| Responsabilidad | Fuente vigente |
| --- | --- |
| Aritmética comercial: costo, markup/margen, descuento, neto pactado, FX, redondeo contable y redondeo comercial, filas de terceros y reserva de contingencia, por contrato de entrada (`1.0.0`, `1.1.0`, `1.2.0`, `1.3.0` y `1.4.0`); registro cerrado de motores `PRICING_V3_ENGINES` | `src/lib/finance/pricing-v3/calculate.ts` y `schemas.ts` |
| Catálogo monetario (incluida la regla de redondeo por moneda), resolución de perfiles/variantes y calendario, y elección del contrato de entrada que se emite al kernel | `src/lib/finance/pricing-v3/catalog/` |
| Selección de recursos por trabajo y atribución a snapshots | `resources/composition.ts` y `composition-contracts.ts` |
| Presupuesto discreto de créditos y caducidad | `resources/credit-budget.ts` |
| Discovery, scaffold, portfolio y plan | `resources/operating.ts` |
| Preparación comercial y preview allowlisted | `resources/readiness.ts` |
| Reparto de un precio congelado en persona y kit de herramientas (`pricing-v3-price-split/1`) | `resources/price-split.ts` |
| Lecturas de un engagement sobre una cotización congelada: calendario de pagos (`pricing-v3-payment-schedule/1`) y lectura de caja (`pricing-v3-engagement-cash/1`) | `resources/engagement-view.ts` |
| Compromisos con proveedores que sobreviven a los períodos cotizados (`pricing-v3-commitment-exposure/1`) | `resources/commitment-exposure.ts` |
| Documento de cotización para el cliente de una cotización congelada: brief de textos (`pricing-v3-quote-document-brief/1`), su andamio y los datos de la plantilla A4 | `resources/quote-document.ts`; lo que un cliente puede ver, `clientSafePeriodItems` en `resources/readiness.ts` |
| Incremento de un adicional que amplía una cotización: la diferencia entre dos cotizaciones congeladas y las reglas que las hacen comparables (`pricing-v3-quote-increment/1`) | `resources/quote-increment.ts` |
| Resumen derivado de una composición: motor que calculó, ajustes y regla de redondeo aplicados, líneas que el kernel marcó bajo su piso y exposición a datos estimados (`estimateExposure`) | `resources/summary.ts` |
| Fechas de los precios: vigencias duras que bloquean y fechas de revisión que sólo avisan (`pricing-v3-price-review/1`) | `resources/price-review.ts` |
| Puntero a las versiones vigentes (`pricing-v3-current/1`): verificación por versión y digest, sin leer ni escribir archivos | `adapters/current-versions.ts` |
| Registro cerrado de rechazos (dominio y adaptador) y el único detalle que pueden llevar | `errors.ts` |
| Digests, artefactos, replay con el motor registrado que firmó cada uno y mantenimiento local | `adapters/`; filesystem y hashing fuera de la aritmética |
| Primer consumer local | `scripts/commercial/pricing-v3.ts` |

Estas rutas son relativas a la raíz del repositorio. No incorporan DB, Next.js, identidad remota, Excel ni SDK
al núcleo; su extracción futura conserva contratos y pruebas. No se crea otro pricing engine por consumer.
La tabla refleja el estado tras el [ADR del motor 1.1](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md)
(2026-10-10) y su delta del 2026-10-11: los tres contratos conviven en el mismo módulo, no hay un segundo kernel. Las
filas de fechas de los precios y del puntero, y la mención de `estimateExposure` en la del resumen, vienen del
[delta del 2026-10-11](#delta-2026-10-11--versiones-vigentes-por-puntero-avisos-de-la-corrida-y-exposición-a-estimaciones).
*Nota 2026-10-11 (tarde):* el registro tiene cuatro contratos: se agregó `1.3.0`, la forma del engagement con su
razón de precio, en el mismo módulo. Las tres filas de lecturas (reparto, calendario y caja, compromisos) vienen de
los deltas de `compose split` y de [las tres lecturas](#delta-2026-10-11--tres-lecturas-de-una-cotización-congelada-calendario-caja-y-compromisos).
*Nota 2026-10-11 (noche):* el registro tiene cinco contratos: se agregó `1.4.0`, los costos de terceros de un
encargo y la reserva de contingencia, en el mismo módulo y sin un segundo kernel. Ningún módulo nuevo: los lectores
de la tabla aprendieron a describir una cotización con filas de terceros y reserva
([delta](#delta-2026-10-11--contrato-140-y-catálogo-v10-cómo-se-lee-una-cotización-con-terceros-y-reserva)).
*Nota 2026-10-11 (noche, posterior):* la fila del documento de cotización viene del
[delta de `compose document`](#delta-2026-10-11--el-documento-de-cotización-de-una-cotización-v3-compose-document).
Es un lector más de una cotización congelada: no agrega un contrato ni toca el kernel.
*Nota 2026-10-11 (cierre):* la fila del incremento viene del
[delta de `compose increment`](#delta-2026-10-11-cierre--un-adicional-que-amplía-la-base-se-lee-como-un-incremento-compose-increment).
Es el único lector que recibe dos cotizaciones congeladas; tampoco agrega un contrato ni toca el kernel.

## Contrato de entradas y selección

El expediente aporta demanda: país del talento, mercado de oferta, perfil exacto, variante/seniority/tier,
headcount, plazo y calendario de dedicación/actividad. Los valores y reglas salen de catálogos versionados.
No usar montos del expediente como tarifa general ni aumentar especialidad salarial porque una tarea requiera
una herramienta. Escalas de consultor permanecen separadas; el costo mensual del Excel no acredita un salario
vigente localizado. Costo del talento y factor del mercado de oferta son ejes independientes; un costo ya
localizado no recibe un segundo factor salarial. Fee genérico, tools y provisiones no se convierten en salario.

El catálogo operativo cubre los 32 perfiles históricos mediante reglas de revisión. Los 26 recursos originales
son 25 herramientas más un fee genérico de plataforma (`ETG-017`), conservado fuera del catálogo de tools para
no duplicarlo. La sucesora añade recursos declarados y variantes públicas explícitas. Las reglas sirven para
preparar, no certifican suficiencia técnica del equipo ni una receta comercial validada.

Notion y Microsoft 365 son base interna para todos. Perfil y tareas seleccionan otras herramientas; por ejemplo,
redacción SEO requiere SEMrush, mientras que la redacción sola no exige Adobe. IA, ChatGPT, Claude, Higgsfield y
Magnific se eligen con motivo según trabajo. Planes múltiples exigen `priceId`; no se toma el más barato por
defecto. Precio/fuente se resuelve en la fecha de quote y congela sus términos para el horizonte; un alza
posterior requiere revisión o nueva quote, no cambio automático del artifact. Cada recurso/asignación/
presupuesto debe cubrir todos los períodos activos. Inputs sobrantes,
ambiguos, faltantes o incompatibles producen `needs_input`, sin total completo ni precios inline del agente.

## Acceso, capacidad y reparto

Seat nominativo conserva usuario, cantidad entera y capacidad contratada. No se reduce por FTE ni se comparte
entre personas por prorratear costo. Cantidad por seat corresponde a usuarios únicos; paquete nominativo exige
capacidad suficiente dentro de sus seats incluidos, y Team exige mínimo de contrato explícito.

*Nota 2026-10-11 (asientos):* «no se comparte entre personas por prorratear costo» sigue valiendo: repartir un costo
no autoriza compartir una cuenta. Lo que cambió es que la demanda puede **declarar** que varias personas usan un
mismo asiento (`seatSharing`, con su motivo), que un asiento pagado está ocioso (`idleSeats`) y que una herramienta
se tiene bajo varios planes en un período; «cantidad por seat corresponde a usuarios únicos» pasa a ser «todo asiento
pagado se usa, se comparte o se declara ocioso». Decisión:
[composición de recursos](GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--asientos-como-se-compran-y-períodos-declarados-una-vez).

Portfolio declara unidades por recurso/período y cuenta, junto con unidades internas y no asignadas. Todas suman
al denominador; la cuota deriva con Decimal. La reconciliación muestra unidades, costo mensual completo,
atribución a cuentas, parte interna, no asignada y residual de precisión. Sin catálogo/fecha o precio vigente
puede verificarse capacidad, pero la reconciliación monetaria permanece `null`. No se fija un porcentaje por
defecto ni se oculta capacidad libre como costo de un cliente. Un seat individual requiere asignación por
usuario; no se admite diluirlo en un pool entre usuarios distintos.

El operador autorizó capacidad declarada porque aún no existe distribución real. Los ejemplos son simulaciones,
no su cartera. El reparto interno del compositor pondera usuarios únicos de las funciones consumidoras; no
infiere horas reales de cada función. Sobreasignación, duplicados y conflicto entre reparto manual y portfolio
bloquean preparación. Planear costo no reserva inventario ni prueba permisos del proveedor.

`clientProvidedTools` cubre una herramienta específica por líneas y período, con motivo y evidencia confirmada
que abarca toda la ventana de actividad. Sólo esa cobertura tiene costo Efeonce cero declarado. No sustituye
Notion/Microsoft 365 internos ni créditos de proveedor. Cobertura parcial preserva costo de los demás usuarios;
entradas no usadas o duplicadas se rechazan. No implica acceso gratuito para toda la cartera.

## Fuentes, bundles y presupuesto IA

Factura, declaración del operador, referencia pública e histórico conservan procedencias distintas. Factura
acredita importe facturado, no pago; referencia pública no prueba contrato Efeonce, país de facturación o acceso.
La policy sucesora y [manifest de evidencia](../../data/pricing/v3-operating/evidence-2026-10-09.json) conservan:

- Adobe: USD 180 mensuales cubre el paquete de 3 CC Teams + 3 Express, confirmado por operador. No añadir Express
  separado. USD 306 es escenario condicional del alza de 70%; fecha de renovación desconocida, sin activación automática.
- Notion: factura del período 21 de septiembre–21 de octubre de 2026, con nueve Business a USD 24 por seat y USD 30
  por créditos. Componentes separados; vigencia efectiva hasta el 20 de octubre inclusive y pago no verificado.
- Vercel/GCP y suscripciones IA: declaraciones del operador, sin inventar asignaciones o contratos actuales.
  Vercel es intervalo declarado, no un punto arbitrario; elegir escenario explícito para calcular.
- Planes públicos: variantes consultadas en fuentes oficiales, separadas de gasto real, contrato y mínimos.
- EUR→USD: FX referencial fechado y elegido explícitamente, sin inventar tasa contractual o futura.

Los importes y ventanas ejecutables viven en los JSON, no en copias de tablas en otros documentos. Cambiar fuente
o fecha requiere sucesor y revisión; la existencia de la variante no prueba disponibilidad después de su ventana.

> Nota 2026-10-11: las ventanas que esta lista nombra (Notion hasta el 20 de octubre, la referencia EUR→USD de un
> solo día) son las de las policies v2 a v5 y del catálogo hasta v5, que se conservan intactos. Desde la policy v6
> ningún precio unitario de herramienta termina por fecha: rige hasta que una versión nueva lo reemplaza y lleva una
> fecha de revisión que avisa sin bloquear. El catálogo v6 agrega además un tipo de cambio de cotización EUR→USD sin
> fecha de término. Decisión y reglas:
> [modelo de revisión de precios](GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--un-precio-unitario-no-vence-vigencia-dura-y-fecha-de-revisión).
>
> Nota 2026-10-11 (tarde): la viñeta de Adobe describe las policies v2 a v6. Desde la policy v7 Adobe se registra
> como lo factura el proveedor: dos productos en CLP con IVA (Creative Cloud Pro, que ya incluye Express, y Adobe
> Express aparte para perfiles de contenido), cada uno con tres licencias y doce meses de compromiso por licencia. «No añadir
> Express separado» vale ahora por persona o línea, no por cotización. Decisión y reglas:
> [Adobe como se factura y plazo de compromiso](GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--plazo-de-compromiso-de-una-licencia-adobe-como-se-factura-y-costos-en-clp).

Demanda de créditos se agrega por proveedor/mes antes de seleccionar packs. Suscripción atribuida deriva de
créditos normales asignados sobre créditos incluidos; disponibilidad se declara, no se infiere del plan. La compra
incremental cubre el déficit con paquetes enteros, remanente y caja visibles. `cashCommitment` del kernel es
compromiso modelado atribuible, no factura ni compra incremental; la caja incremental separada del compositor
cubre sólo recargas de créditos declaradas, sin inferir compra de seats. Caducidad de crédito y vigencia de
promoción/precio son distintas. Magnific requiere suscripción activa; los créditos extra no se equiparan a piezas,
horas ni créditos comerciales. No reutilizar remanente entre cuentas/períodos ni autorizar compras por un cálculo.

## Cálculo, preparación comercial y salida

`compose quote` congela catálogo monetario, policy, créditos, demanda, selección y resultado. Explain y replay
usan ese artifact, sin consultar versiones actuales ni recalcular en el agente. Versiones additive sin nuevos
defaults mantienen los digests previos; no se actualizan artifacts existentes.

`compose assess` devuelve brechas con campo/owner: costo humano localizado, provisiones medidas, acceso/seats,
planes reales, denominadores simulados, impuestos/entidad, alcance y aprobación comercial. Siempre conserva
`binding=false` y `requires_review`; cálculo completo no aprueba tarifa. Objetivo 40% y piso 35% son propuestas
de TASK-2017, no política aprobada ni sustitución de guardrails de otra práctica. Desde el 2026-10-11 agrega
`costEvidencePriority`: el orden en que conviene confirmar los datos de costo estimados
([delta](#delta-2026-10-11--versiones-vigentes-por-puntero-avisos-de-la-corrida-y-exposición-a-estimaciones)).

`compose preview` proyecta sólo moneda, neto por período/unidad comercial, impuestos/totales disponibles y estado
de simulación. En `role_capacity` conserva los conceptos comerciales; en `managed_service` agrega fee del período
más implementación inicial y mantiene roles como costeo interno. Su allowlist excluye costos, rates, país del
talento, margen, slots e identificadores/proveedores internos. No emite oferta, crea quote remota, envía ni valida
SOW, contratación laboral, SLA, suficiencia de delivery o precio competitivo.

*Nota 2026-10-11 (noche):* en una cotización `1.4.0` el fee del período de `preview` es sólo el trabajo propio;
cada costo de terceros refacturado va como un ítem aparte con su concepto y su neto final, y lo que el cliente paga
directo al proveedor va en `clientPaidDirectly[]`, fuera de todo total. `assess` agrega `margin.ownWorkRate` y lee
el piso genérico sobre el trabajo propio.
[Delta](#delta-2026-10-11--contrato-140-y-catálogo-v10-cómo-se-lee-una-cotización-con-terceros-y-reserva).

## Mantenimiento y frontera canónica

El [ADR de mantenimiento](GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md) conserva change-sets monetarios.
Policy/créditos usan replacement íntegro versionado, `baseDigest`, digests del contexto y `previewDigest` con
impactos before/after sobre demandas declaradas. Schema/referencias y evidencia se validan; no heredar confirmación
de factura o captura al modificar precio, moneda, unidad o packs. Apply escribe sucesor en ruta nueva sin activar,
conserva padre/artifacts y no concede aprobación comercial.

[TASK-2017](../tasks/in-progress/TASK-2017-pricing-v3-colombia-chile-economics.md) conserva las brechas económicas;
[operational-gaps.json](../../data/pricing/v3-operating/operational-gaps.json) enumera sus owners. No volver a pedir
al operador salarios que ya indicó no tener. Datos desconocidos siguen pendientes; nunca se completan con cero.
*Nota 2026-10-11:* la base de costo quedó decidida por el operador: el costo objetivo del Excel de pricing, no la
nómina. No hay salarios que pedir ni nómina que conectar
([delta](#delta-2026-10-11--versiones-vigentes-por-puntero-avisos-de-la-corrida-y-exposición-a-estimaciones)).

Quote API Parity y TASK-1211/1212 conservan la autoridad productiva V2. Promoción V3 requiere unidad propia,
contraste V2/V3, auth/tenancy/audiencias, snapshots/lifecycle y cutover/rollback. UI/API/MCP no pueden eludir esos
commands/readers ni ampliar permisos externos por inferencia. La documentación prepara la integración, no la despliega.

## Delta 2026-10-10 — servicio gestionado: volumen a dedicación, exclusión de recetas y piso de margen

**Decisión.** Cotizar un servicio gestionado (primer caso: social care para SKY 2027) se resuelve con dos capacidades
nuevas de código, ambas domain-free, y el resto como datos por el flujo de mantenimiento existente.

1. **Volumen → dedicación** (`resources/workload.ts`, contrato `pricing-v3-workload/1`, comando
   `pricing:v3 compose workload`). Un driver es «N unidades al mes, M minutos cada una»; la unidad es dato y nunca una
   rama del código. La dedicación de una línea es el mayor entre el trabajo declarado sobre horas productivas y la
   presencia exigida sobre horas contratadas, redondeada **hacia arriba** al paso declarado. Cada hora declarada tiene
   exactamente un dueño: las cuotas de un driver o de un bloque fijo suman 1 o el resultado es `needs_input`.
   Con `--brief` escribe un brief nuevo dimensionado; nunca edita el que leyó.
2. **Exclusión explícita de tareas de receta** (`work[].excludedProfileTasks` en `pricing-v3-composition-demand/1`).
   Las reglas de perfil son recetas de revisión, no el alcance de todo engagement. Una exclusión lleva motivo, viaja
   con la demanda congelada, y la selección de la herramienta que deja fuera lo dice
   (`profile-task-excluded:<tarea>:<motivo>`). Sólo se excluye una tarea que la receta del perfil realmente agrega.
3. **Datos** (sucesores `catalog.review-v3.json` y `resources.review-v3.json`, generados con preview/apply; el mismo día `resources.review-v4.json` registró la bandeja como Sprout Social Advanced por asiento):
   política de precio `creative-managed-service` con `target_margin` 0,45 y `minimumMargin` 0,45 para los 32 perfiles;
   kit `managed-service-core` sin herramientas y con provisiones opcionales; dos provisiones declaradas como estimación;
   tarea `social-care` con la herramienta `social-inbox`; y `agent-runtime-usage`, un recurso por uso (paquete por
   cada 1.000 ítems procesados).

**Alternativas descartadas.**

- *Editar la receta del perfil para quitarle la tarea.* Cambia a todos los consumidores para arreglar un caso.
- *Derivar la dedicación dentro del brief con una fórmula por servicio.* Es un `if (servicio === 'x')` escrito en datos.
- *Un valor nuevo `usage` en `basis`.* El paquete con cantidad decimal ya expresa precio por bloque de unidades.
- *Una política de precio por cliente.* El piso es de la práctica; la oferta es el eje correcto.

**Cuatro pilares.**

- *Seguridad:* nada cambia fuera del prototipo local; sin DB, API ni escritura externa. Una exclusión no puede ocultar
  un costo en silencio: exige motivo y queda en la selección. Las cifras nuevas del catálogo se declaran `estimated`
  con referencia `hypothesis-only:`; el estado sigue siendo `requires_review` y `binding=false`.
- *Robustez:* validación con diagnósticos y sin resultado parcial (horas sin dueño, driver desconocido, exclusión que
  no está en la receta o que contradice el trabajo declarado, línea sobre su capacidad). El redondeo nunca deja la
  dedicación por debajo del trabajo. El campo nuevo es opcional: las demandas y artefactos anteriores no cambian.
- *Resiliencia:* los sucesores se escriben en rutas nuevas y los padres se conservan; volver atrás es elegir v2. El
  replay de un artefacto con exclusiones reproduce su digest (probado).
- *Escalabilidad:* un segundo servicio (contenido, soporte, auditorías) reutiliza el driver sin tocar código; la
  política de precio cubre los 32 perfiles, así que un caso nuevo no exige otro change-set.

**Prueba del segundo consumidor.** `pricing-v3-workload.test.ts` corre el mismo cálculo con otra unidad y exige el
mismo resultado. El ejemplo `managed-care.*` valida el flujo completo y **deriva sus expectativas del catálogo que lee
el motor** (el margen mínimo sale de la política; las herramientas excluidas, de la demanda), no de literales.

**Reglas duras.**

- **NUNCA** quitar una tarea de la receta de un perfil para resolver un engagement: se excluye en la demanda, con motivo.
- **NUNCA** escribir la dedicación a mano cuando existe un volumen declarado: se dimensiona con `compose workload` y el
  brief dimensionado se conserva junto al workload que lo produjo.
- **NUNCA** leer el resultado de `compose workload` como dotación comprometida, disponibilidad o productividad medida.
- **NUNCA** tratar `provision-*` ni `agent-runtime-usage` como costos medidos: son estimaciones declaradas.
- **SIEMPRE** cotizar un servicio gestionado de la práctica creativa con la oferta `creative-managed-service`; su
  `minimumMargin` es el piso y un descuento que lo cruce deja la cotización fuera de política.

**No decidido a propósito.** Setup paramétrico (hoy se cotiza fuera del kit); costos salariales localizados (siguen en
`operational-gaps.json`); medición del consumo de agentes; si el piso de 45 % rige igual para toda oferta gestionada
fuera de la práctica creativa; y la promoción de todo esto al canon de cotizaciones.
*Nota 2026-10-11 (tarde):* desde el catálogo v9 los siete kits de staffing llevan la puesta en marcha como provisión
costeada por persona; `managed-service-core` sigue sin requisito de puesta en marcha. Ver el
[delta de provisiones de puesta en marcha](GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md#delta-2026-10-11--provisiones-de-puesta-en-marcha-costeadas-catálogo-v9).

> Nota 2026-10-10 (posterior): el alcance del piso quedó decidido por el operador (CEO). 45 % es el piso de margen de
> los servicios gestionados; un servicio en el que se puede ganar más sube su objetivo, no el piso. Ver el delta del
> motor 1.1 más abajo y `MARGIN_FLOOR_SCOPE` en el ledger.

## Delta 2026-10-10 — endurecimiento de la CLI: errores tipados, resumen derivado y veredicto de piso

> **Leer con el delta del motor 1.1 (mismo día, posterior).** Esta sección se conserva como se escribió. Cuatro de
> sus afirmaciones dejaron de describir el estado vigente y llevan una nota fechada en el lugar: el precio acordado
> por tasa (punto 5 y sus dos reglas duras), el redondeo que deja una línea al piso bajo él, la alternativa
> descartada de cambiar el kernel y el párrafo «No decidido a propósito». Lo que las reemplaza está en el
> [ADR del motor 1.1](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md). Errores tipados,
> resumen derivado, veredicto de piso en `assess` y escala de moneda en `preview` siguen vigentes sin cambios.
> `ENGINE_VERSION`, que este delta nombra, ya no existe: lo reemplaza el registro `PRICING_V3_ENGINES`.

**Decisión.** Tres contratos salen del adaptador CLI y pasan al dominio, para que el próximo consumidor (API, MCP o
UI) los reutilice en vez de redefinirlos. No cambian la aritmética del kernel, `ENGINE_VERSION`, los digests, los
códigos de salida 0/2/3/1, los flags ni el escritor exclusivo `wx`/0600.

1. **Rechazos tipados** ([`errors.ts`](../../src/lib/finance/pricing-v3/errors.ts)). Todo rechazo es un
   `PricingV3Error` con un código de un registro cerrado en dos grupos: dominio (contenido de pricing) y adaptador
   (argumentos, archivos, formatos). La CLI ya no mantiene lista propia: reporta el código de cualquier
   `PricingV3Error`; un `ZodError` sale como `SCHEMA_INVALID` con hasta 20 pares `{ path, rule }`; lo que nadie
   clasificó sale como `ADAPTER_FAILURE`, que deja de significar «fallo técnico» y pasa a significar «caso que el
   adaptador no clasificó». Forma en stderr, con exit 1:
   `{ "error": { "code", "message", "option"?, "issues"? }, "binding": false }`. `message` es estático. El reporte
   nombra la opción o la ruta del campo; nunca un valor, una ruta de archivo ni el mensaje de un parser o validador.
   Los resultados con diagnósticos (`MISSING_COST`, `MARGIN_BELOW_FLOOR`…) no son rechazos y no viven en el registro.
   Motivo: la lista a mano había derivado. Diez códigos que el dominio lanzaba salían como `ADAPTER_FAILURE` (entre
   ellos `RESOURCE_BASE_CONFLICT`, `RESOURCE_PREVIEW_CONFLICT` y `RESOURCE_SOURCE_RECONFIRMATION_REQUIRED`) y dos
   códigos listados no se lanzaban nunca. Una regla ESLint acotada (`no-restricted-syntax` en `eslint.config.mjs`)
   prohíbe lanzar un `Error` suelto en `src/lib/finance/pricing-v3/**` (tests excluidos) y en el script de la CLI.
2. **Resumen derivado** ([`resources/summary.ts`](../../src/lib/finance/pricing-v3/resources/summary.ts), contrato
   `pricing-v3-composition-summary/1`). `compose prepare` y `compose quote` imprimen `summarizeComposition` en stdout
   (`quote` incluye `replayDigest`; `prepare` no, porque no congela nada para replay); `replay` de un artefacto de
   composición imprime `{ verified, calculationId, summary }`. El resultado completo existe sólo en el artefacto que
   escribe `--out`. `explain` no cambia: es la vista de detalle. Tampoco cambian `prepare|quote` del carril de
   catálogo ni `calculate` del kernel. El resumen no decide nada: cuenta, agrupa y formatea el resultado congelado.
   - `diagnostics`: los bloqueos, completos. Lista no vacía implica `totals` nulo y `needs_input`.
   - `reviewSignals`: todo diagnóstico de período agrupado por código y severidad, con conteo, períodos, líneas y
     rutas. Una señal de revisión nunca anula totales.
   - `marginFloor.lines`: las líneas que el kernel marcó `MARGIN_BELOW_FLOOR`, con `marginRateRoundedDown` y
     `marginAmountShortOfFloor`.
   - `toolSelections` (incluidas, aportadas por el cliente, excluidas con motivo, más conteos), `attributions`,
     `creditBudgets`, `resourceIncrementalCash`, `cashLedger` y `cashMeaning`.
3. **Veredicto de piso en `compose assess`.** `assessCompositionReadiness` agrega una brecha
   `MARGIN_BELOW_POLICY_FLOOR` por cada línea que el kernel marcó y el campo `margin.policyFloor.linesBelowFloor`. No
   repite la comparación: el kernel es el único dueño del control de piso. `proposedTarget` 0,40 y `proposedFloor`
   0,35 siguen igual, como propuestas genéricas sin aprobar.
   *Nota 2026-10-11:* esas dos claves ya no existen. La comparación genérica se retiró al final de ese día
   ([delta](#delta-2026-10-11--compose-assess-juzga-contra-el-piso-de-la-propia-oferta)).
4. **Escala de moneda en `compose preview`.** En `managed_service` los importes derivados usaban dos decimales fijos;
   ahora conservan la escala con la que el kernel formateó el período (CLP mostraba `9508946.00` en la línea y
   `9508946` en el total).
5. **Precio acordado por el motor.** Un precio que el operador acuerda de verdad entra como el ajuste de descuento
   del brief (`brief.adjustments[]`: a lo más uno, `kind: "discount"`, `rate`, `lineIds`, `reason`), para que el
   artefacto congelado lleve el neto, el margen y el veredicto de piso reales. Primer caso: social care de SKY 2027,
   CLP 4.990.000 al mes acordados → tasa 0,0793605 sobre el precio al piso de 5.420.145 → neto exacto de 4.990.000,
   margen 40,26 %, tres líneas marcadas y CLP 236.579 al mes de margen faltante para llegar al piso
   ([registro de la excepción](../commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md)).
   *Nota 2026-10-10 (motor 1.1):* el método de la tasa quedó sustituido. Un precio pactado se declara como
   `agreed_net` y el motor deriva el descuento o el recargo; `brief.adjustments[]` admite hasta 10 ajustes sobre filas
   disjuntas. El artefacto `acordado.artifact.json` de este caso se conserva como evidencia del contrato 1.0.0 y el
   mismo acuerdo quedó re-congelado como `acordado-neto.artifact.json` en 1.1.0.

**Comportamiento conocido que no se cambia.** `creative-managed-service` tiene margen objetivo 0,45 y mínimo 0,45.
Costo y precio se redondean a CLP enteros por separado, así que una línea cotizada exactamente al piso puede quedar
bajo él por menos de 1 CLP, y el kernel la marca, como dice su contrato: nunca sube el precio. En el ejemplo
`managed-care.*` las seis líneas quedan cortas por 0,1 a 0,5 CLP. `marginAmountShortOfFloor` es lo que separa esa
brecha de redondeo de un incumplimiento real (en el caso SKY, entre unos 24 mil y 175 mil CLP por línea).
*Nota 2026-10-10 (motor 1.1):* sigue siendo el comportamiento del contrato 1.0.0, que no se tocó. En 1.1.0, con una
regla de redondeo vigente para la moneda, una fila que cumplía su piso antes de redondear lo sigue cumpliendo después
(regla de conservación del piso); con `catalog.review-v4.json` el mismo ejemplo `managed-care.*` no marca ninguna línea.

**Decisión comercial del operador (CEO, 2026-10-10).** El piso de 45 % sigue siendo la norma para servicios
gestionados de la práctica creativa; el social care de SKY es una excepción aprobada por ser cliente vigente; la
política de precio queda 45/45. Las cifras comerciales y las excepciones al piso las decide él.

**Alternativas descartadas.**

- *Cambiar el redondeo del kernel o la comparación de piso.* El kernel cumple su contrato escrito. Replay recalcula
  con el motor actual y sólo acepta la versión actual del motor: tocar el kernel rompería el replay de todo artefacto
  congelado. Requiere versión nueva del motor más replay multi-versión, es decir, un ADR propio.
  *Nota 2026-10-10 (motor 1.1):* ese ADR existe. No cambió el contrato 1.0.0: agregó el contrato 1.1.0 con su propio
  motor y el replay acepta cualquier motor del registro. La alternativa «cambiar el motor actual» sigue descartada.
- *Subir los diagnósticos de período a `quote.diagnostics`.* Esa lista es de carga: cuando no está vacía,
  `catalog/quote.ts` anula los totales y deja `needs_input`. Una señal de revisión bloquearía el cálculo.
- *Cambiar el exit 3 a 0.* El exit distinto de cero es una compuerta fail-closed contra encadenar `quote && enviar`,
  y está fijado en pruebas, manuales y las dos skills.
- *Refactor de la CLI a una tabla de comandos.* Diferido: las allowlists de flags son un control de seguridad y el
  adaptador CLI es desechable cuando existan los adaptadores canónicos.
- *Subir el margen objetivo a 50 %.* Retirada: se apoyaba en una analogía con la propuesta 40/35 sin aprobar y
  contradecía el único caso real.

**Cuatro pilares.**

- *Seguridad:* el reporte de error no puede citar contenido por construcción: el detalle admite sólo `option` e
  `issues`. Una opción desconocida se repite sólo si tiene forma de nombre de flag. El exit 3 sigue impidiendo
  encadenar un envío. Un resumen o un `assess` nunca aprueban: `binding=false` y `requires_review` se conservan.
- *Robustez:* un código que no está en el registro no compila, de modo que registro y sitios de lanzamiento no pueden
  derivar; la regla de lint cubre el `Error` suelto. El veredicto de piso tiene un solo dueño (el kernel) y dos
  lectores (`summary` y `assess`) que comparten `linesBelowPolicyFloor`.
- *Resiliencia:* nada se regeneró. Resumen y `assess` leen el resultado congelado sin alterarlo ni su digest, y los
  artefactos previos siguen reproduciéndose. Volver atrás es revertir el adaptador; no hay dato que migrar.
- *Escalabilidad:* el resumen agrupa por período en vez de repetir. En el ejemplo `managed-care.*` stdout pasó de
  196 KB a unos 15 KB; con 12 períodos el resumen crece cerca de 1,5× y el resultado completo cerca de 8,8×.

**Prueba del segundo consumidor.** `summarizeComposition` ya tiene tres llamadores (`compose prepare`,
`compose quote` y `replay`) y `linesBelowPolicyFloor` dos (`summary` y `assess`). `pricing-v3-cli-summary.test.ts`
exige que el stdout de la CLI sea exactamente el resumen que el dominio produce sobre el artefacto congelado;
`pricing-v3-summary.test.ts` deriva las líneas esperadas de los diagnósticos del kernel, no de literales, y comprueba
que sin el diagnóstico del kernel los mismos importes no reportan nada; `pricing-v3-errors.test.ts` ejercita los
rechazos desde la CLI y verifica que no lleven contenido.

**Reglas duras.**

- **NUNCA** lanzar un `Error` suelto en el dominio V3 ni en su CLI: se lanza `PricingV3Error` con un código del
  registro. Un rechazo nuevo se agrega primero a `errors.ts`.
- **NUNCA** mantener en un consumidor una lista propia de códigos ni copiar el conteo del registro en documentos: la
  fuente es `errors.ts`.
- **NUNCA** poner en un reporte de error un valor, una ruta de archivo o el mensaje de un parser o validador.
- **NUNCA** leer `ADAPTER_FAILURE` como error del usuario: es un caso que falta clasificar en el adaptador.
- **NUNCA** recalcular el piso fuera del kernel ni decidir algo en el resumen: `summary` y `assess` sólo leen
  `MARGIN_BELOW_FLOOR`.
- **NUNCA** tratar el exit 3 como fallo ni encadenar pasos suponiendo exit 0.
- **NUNCA** registrar un precio acordado sólo en prosa o en un documento aparte: sin pasar por el motor, el artefacto
  conserva el precio al piso y un margen que no es el real.
- **SIEMPRE** leer `marginAmountShortOfFloor` antes de calificar una línea marcada: menos de una unidad mínima de la
  moneda es redondeo; más es una decisión de precio que necesita dueño.
- **SIEMPRE** pasar el precio acordado como el descuento del brief, con su motivo, y conservar el artefacto resultante
  junto a la decisión de excepción cuando cruce el piso.
  *Nota 2026-10-10 (motor 1.1):* la forma vigente es `agreed_net`, no el descuento por tasa; la regla del ADR del
  motor 1.1 prohíbe calcular una tasa a mano para llegar a un precio pactado. Motivo y artefacto junto a la excepción
  se mantienen.
- **SIEMPRE** tomar el detalle completo del artefacto escrito con `--out` o de `explain`; el stdout de
  `compose prepare|quote` ya no lo trae.

**No decidido a propósito.** Una regla de redondeo comercial hacia arriba o un ajuste que reciba directamente el neto
acordado (ambos son cambios de motor; hoy la tasa se calcula a mano con decimales suficientes); si el piso de 45 %
rige para servicios gestionados fuera de la práctica creativa; y la evidencia de costo (sueldos históricos,
provisiones estimadas, consumo de agentes sin medir). El ledger
[operational-gaps.json](../../data/pricing/v3-operating/operational-gaps.json) registra los dos primeros como
`FLOOR_PRICE_ROUNDS_UNDER_FLOOR`, `AGREED_PRICE_OUTSIDE_ENGINE` y `MARGIN_FLOOR_SCOPE`; la evidencia de costo conserva
sus entradas anteriores (`LOCALIZED_TALENT_COSTS`, `MANAGED_SERVICE_PROVISIONS_UNMEASURED`,
`AGENT_RUNTIME_USAGE_UNMETERED`). `designer.assessment.json` y `service.assessment.json` son evidencia fechada del
2026-10-09 y no traen el campo aditivo `margin.policyFloor`; no se regeneraron.

> Nota 2026-10-10 (motor 1.1): los dos primeros puntos quedaron decididos e implementados (redondeo comercial hacia
> arriba como dato de catálogo y `agreed_net`), y el tercero quedó decidido por el operador. `FLOOR_PRICE_ROUNDS_UNDER_FLOOR`
> y `AGREED_PRICE_OUTSIDE_ENGINE` se retiraron del ledger como resueltos; `MARGIN_FLOOR_SCOPE` quedó actualizado y se
> agregaron `QUOTE_FX_REVIEW` y `COMMERCIAL_ROUNDING_SCOPE`. La evidencia de costo sigue abierta en lo que el delta
> siguiente detalla.

**Verificación (2026-10-10, local).** `pnpm pricing:v3:test`: 9 archivos y 179 pruebas; ESLint limpio en el módulo,
el script y la configuración; `pnpm typecheck` limpio; `pricing:v3 replay` con `verified: true` sobre cada
`*.artifact.json` presente bajo `data/pricing/` y en la carpeta del caso SKY. Esta evidencia es local.

## Delta 2026-10-10 — motor 1.1 y catálogo v4: qué cambia en el flujo operativo

Decisión, alternativas y reglas duras: [ADR del motor 1.1](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md).
Este delta sólo registra el efecto sobre el flujo descrito arriba. No hay comandos, flags ni códigos de salida nuevos.

- **Precio pactado.** Se declara en `brief.adjustments[]` como `agreed_net` (monto, `billing` `monthly|setup`, líneas
  y motivo), por período. El motor llega al monto exacto y registra la diferencia como `discount` o `uplift`. La tasa
  calculada a mano del delta anterior deja de usarse; un `discount` por tasa sigue disponible cuando lo acordado es de
  verdad un porcentaje.
- **Redondeo comercial.** Es un registro `price_rounding` del catálogo monetario, por moneda de salida y vigente a la
  fecha de cotización; no es un paso del agente ni del consumidor. Se mantiene con el mismo `catalog preview|apply`.
- **Qué contrato calcula.** La resolución emite `1.1.0` sólo si el brief trae algo que `1.0.0` no expresa (un ajuste
  que no sea un único `discount`, o más de uno) o si hay una regla de redondeo vigente para la moneda de salida. Toda
  demanda congelada antes vuelve a resolver a `1.0.0` y a su digest. `engineVersion` del resumen dice cuál firmó.
- **Catálogo vigente para cotizar.** `catalog.review-v4.json` + `resources.review-v5.json` (+ el catálogo de
  créditos). Con v4 una cotización nueva en CLP, USD, COP, MXN o PEN fechada desde el 2026-10-10 sale en `1.1.0` y
  redondeada; v2 y v3 quedan como padres congelados de los artefactos que los usaron.
  *Nota 2026-10-11:* el catálogo vigente para cotizaciones nuevas pasó a ser `catalog.review-v5.json`; v4 queda
  también como padre congelado. Ver el delta del 2026-10-11, más abajo.
  *Nota 2026-10-11 (posterior):* las versiones vigentes ya no se nombran en este documento. Las nombra el puntero
  `data/pricing/v3-operating/current.json`, se usan con `--current` y las imprime `current show` (al 2026-10-11,
  tras la oferta SEO/AEO: catálogo v8 y policy v6).
  *Nota 2026-10-11 (tarde):* ese paréntesis es un hecho fechado de la mañana, no lo vigente. Lo vigente es lo que
  imprime `current show`; la tarde del 2026-10-11, al escribirse esta nota, eran el catálogo v9 y la policy v8, y al
  cierre de ese día el catálogo v9 y la policy v10.
  *Nota 2026-10-11 (noche):* «al cierre de ese día» quedó corto: esa noche el catálogo pasó a v10 (la policy siguió
  en v10). La fuente sigue siendo `current show`.
- **Lectura.** El resumen suma `engineVersion`, `commercialAdjustments` y `priceRounding`; `explain` suma
  `commercialAdjustments` con el recorrido de precio por fila. `compose preview` y la proyección cliente no cambian:
  muestran sólo el neto final.
- **Errores de un ajuste.** `OVERLAPPING_ADJUSTMENTS`, `INVALID_AGREED_AMOUNT`, `AGREED_NET_WITHOUT_BASE`,
  `INVALID_PRICE_ROUNDING` y `DUPLICATE_ID` son diagnósticos del kernel, no rechazos del registro de `errors.ts`: en
  composición bloquean (`diagnostics` del resumen, exit 2). `AMBIGUOUS_PRICE_ROUNDING` es un bloqueo de resolución.
- **Guarda.** Tocar `calculate.ts`, `schemas.ts` o la resolución exige correr
  `pricing-v3-frozen-artifacts.test.ts`, que reproduce cada artefacto congelado.

**Decisiones del operador (CEO, 2026-10-10)** registradas como datos del catálogo v4 y del ledger, no como código:
45 % es el piso de los servicios gestionados y un servicio con más margen posible sube su objetivo, no el piso; los
sueldos del workbook son válidos (es su autor), sin cambio de importes; el tipo de cambio de cotización lleva un margen
prudencial sobre el spot, con USD como moneda de referencia; y el redondeo rige para toda oferta con un múltiplo por
moneda. El social care de SKY sigue siendo una excepción aprobada.

**Sigue abierto.** Un costo cuyo registro no declara país se reporta `ESTIMATED_SOURCE` con el supuesto
`UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` aunque su fuente esté confirmada (`LOCALIZED_TALENT_COSTS`). La referencia
EUR→USD del BCE está fechada sólo el 2026-10-09: una cotización posterior que necesite EUR no tiene tasa vigente.
USD→CLF sigue siendo un valor estimado de 2025 (`QUOTE_FX_REVIEW`). Múltiplos para otras monedas u ofertas que
redondeen distinto: `COMMERCIAL_ROUNDING_SCOPE`.

> Nota 2026-10-11: el primer punto quedó cerrado con el catálogo v5, que declara cada costo del workbook como
> referencia de Chile. Con v5 y fecha de cotización desde el 2026-10-11 ya no aparece el supuesto
> `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` ni `ESTIMATED_SOURCE` sobre el costo de la persona. EUR, CLF y los
> múltiplos de otras monedas siguen abiertos.
>
> Nota 2026-10-11 (posterior): el catálogo v6 agrega un tipo de cambio de cotización EUR→USD de 1,20, sin fecha de
> término y marcado como estimado, así que un costo en EUR vuelve a tener tasa en cualquier fecha desde el
> 2026-10-11. El registro del BCE de un solo día se conserva. Sigue sin existir USD→EUR ni regla de redondeo para
> EUR: no se emite una cotización en EUR.

**Verificación (2026-10-10, local).** `pnpm pricing:v3:test`: 12 archivos y 320 pruebas; ESLint y `pnpm typecheck`
limpios; todos los artefactos congelados en disco responden `verified: true` (la guarda cubre los versionados).
[Readback con cifras](../documentation/finance/cotizador-v3-superficie-implementada.md).

## Delta 2026-10-11 — factores de país con valor y catálogo v5: qué cambia en el flujo operativo

Decisión, regla exacta, alternativas y reglas duras:
[delta 1.2.0 del ADR del motor](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-120-el-piso-acompaña-al-factor-de-mercado).
Este delta sólo registra el efecto sobre el flujo descrito arriba. No hay comandos, flags ni códigos de salida nuevos,
y la demanda no gana campos: los dos países que ya declaraba pasan a tener efecto.

- **Los dos ejes de país ahora llevan valores.** Hasta v4 todos los factores de mercado del catálogo eran hipótesis
  neutrales en 1 y los costos no declaraban país: `offerMarketCountry` y `talentCountry` sólo cambiaban moneda,
  redondeo y un supuesto. Con v5, `talentCountry` (país de la persona) mueve el **costo** por el factor de talento, y
  `offerMarketCountry` (país del cliente) mueve el **precio del componente humano** por el factor de mercado. Son
  hechos distintos y se declaran por separado; herramientas, fees y provisiones no reciben ninguno de los dos.
- **Catálogo vigente para cotizar.** `catalog.review-v5.json` + `resources.review-v5.json` (+ el catálogo de
  créditos). v2, v3 y v4 quedan como padres congelados. Los valores nuevos rigen desde el 2026-10-11: una demanda
  con fecha anterior sobre v5 sigue resolviendo los valores de la época de v4.
  *Nota 2026-10-11 (posterior):* el mismo día se emitieron el catálogo v6 y la policy v6, y las versiones vigentes
  pasaron a nombrarse en el puntero `current.json`. Con la policy v5 una cotización fechada después del
  2026-10-20 se bloquea con `RESOURCE_PRICE_NOT_EFFECTIVE`; con v6 no. Ver el delta siguiente.
- **Qué contrato calcula.** A las reglas del delta anterior se suma una: la resolución emite `1.2.0` si y sólo si el
  factor de mercado elegido declara `floorBasis: "base_market"` (en v5, Colombia y Perú). En ese mercado el piso de
  cada fila acompaña al factor, de modo que una cotización a precio de política no sale marcada aunque su margen
  real quede bajo el mínimo de la política; un descuento adicional sí cruza el piso. Chile, México, Estados Unidos y
  España no lo declaran y siguen con las reglas anteriores (`1.1.0` cuando hay redondeo o ajustes).
- **Lectura.** El resumen nombra el factor de mercado en `marketFactor` cuando cambia algo y, por línea marcada,
  entrega `floorNet` y `netShortOfFloor`. El margen que se informa es siempre el real, sobre el neto final. El agente
  no recalcula el piso de un mercado ni presenta un margen «equivalente al mercado base».
- **Supuestos y señales.** Con v5 desaparecen `UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY` y `ESTIMATED_SOURCE` sobre el
  costo de la persona; `allowUnlocalizedCost` deja de hacer falta para esos costos. Los factores estimados sí se
  reportan como `ESTIMATED_SOURCE`, y una persona de un país sin factor de talento registrado deja la cotización en
  `needs_input`.
- **Costo real por perfil y país.** Cuando exista, se registra como costo `specific` de ese país con el flujo de
  mantenimiento de siempre y reemplaza al factor para ese perfil; el factor de talento es la aproximación para
  cuando ese dato no existe.
  *Nota 2026-10-11 (posterior):* «costo real» aquí es el costo objetivo de ese perfil en ese país, no lo que hoy
  se paga por nómina. Ver «Base de costo» en el delta siguiente.

**Decisiones del operador (CEO, 2026-10-11)**, registradas como datos del catálogo v5 y del ledger: el precio sigue
al país del cliente y el costo al país de la persona, con las dos palancas configuradas; en los mercados con factor
menor que 1 el piso de margen acompaña al factor; el margen real se muestra siempre. 45 % sigue siendo el piso de los
servicios gestionados en el mercado base.

**Sigue abierto.** Validar cada factor con contrataciones reales (talento) y con negocios cerrados o perdidos
(mercado): `COUNTRY_FACTORS_UNVALIDATED`. Factores por tipo de cliente, que hoy se expresan como `agreed_net`, y
factores de talento por perfil o seniority, que hoy se expresan como costo específico (`LOCALIZED_TALENT_COSTS`).
Regla de redondeo y tipo de cambio para EUR: todavía no se puede cotizar en EUR a un cliente de España.

> Nota 2026-10-11 (posterior): sigue igual después del catálogo v6. El tipo de cambio que v6 agrega es EUR→USD,
> para costos en EUR; cotizar en EUR necesita USD→EUR y una regla de redondeo, que no existen. España se cotiza en
> USD.
>
> Nota 2026-10-11 (noche): «validar cada factor» dejó de ser un pendiente. El CEO cerró los factores de país ese
> día («deja eso cerrado ya») y el catálogo v10 los registra como valores de política `confirmed` desde el
> 2026-10-12. `COUNTRY_FACTORS_UNVALIDATED` sigue en el ledger como asunto cerrado: no le debe nada al operador. Un
> factor se revisa sólo cuando una contratación real o un negocio cerrado en ese país lo contradice. Desde esa fecha
> los factores de país ya no salen como `ESTIMATED_SOURCE`; una cotización fechada el 2026-10-11 sí. Ver el
> [delta del catálogo v10](#delta-2026-10-11--contrato-140-y-catálogo-v10-cómo-se-lee-una-cotización-con-terceros-y-reserva).

**Verificación (2026-10-11, local).** `pnpm pricing:v3:test`: 13 archivos y 407 pruebas; ESLint limpio; todos los
artefactos congelados en disco responden `verified: true`.
[Readback con cifras](../documentation/finance/cotizador-v3-superficie-implementada.md).

## Delta 2026-10-11 — versiones vigentes por puntero, avisos de la corrida y exposición a estimaciones

Posterior al delta anterior del mismo día. Son cinco cambios. Dos tienen su decisión en el ADR
dueño del tema y aquí sólo se anota su efecto sobre el flujo; los otros tres se deciden aquí.

| Cambio | Dónde está la decisión |
| --- | --- |
| Puntero a las versiones vigentes y `--current` | [ADR de mantenimiento](GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md#delta-2026-10-11--puntero-a-las-versiones-vigentes) |
| Un precio unitario no vence; `reviewBy` y `priceReview` | [ADR de composición](GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--un-precio-unitario-no-vence-vigencia-dura-y-fecha-de-revisión) |
| `runNotices`: avisos de la corrida, fuera del artefacto | este delta |
| `estimateExposure` y `costEvidencePriority` | este delta |
| Base de costo: costo objetivo, no nómina | este delta |

### Efecto sobre el flujo

- **Los comandos dejan de nombrar versiones.** Una cotización nueva se pide así:

  ```bash
  pnpm --silent pricing:v3 current show
  pnpm --silent pricing:v3 compose quote --input demand.json --current --out artifact.json
  ```

  `--current` es un interruptor sin valor. Completa cada una de `--catalog`, `--policy` y `--credits` que no pasaste,
  después de verificar el puntero contra los archivos; un flag explícito gana. Lo aceptan las operaciones que reciben
  esas fuentes: `prepare`, `quote`, `catalog *`, `resources *` y `compose scaffold|plan|prepare|quote`. Las que leen
  un artefacto congelado (`compose assess|preview`, `explain`, `replay`) no lo aceptan: responden `INVALID_ARGUMENT`.
- **Sin `--current` nada cambió.** Sin `--catalog` la CLI lee la baseline histórica
  `data/pricing/v3-catalog/catalog.review-v1.json`, y `--policy` y `--credits` siguen siendo obligatorios.
- **Qué nombra el puntero.** Lo imprime `current show`; esa es la fuente, no este párrafo. Al emitirse esta ronda
  eran `catalog.review-v6.json`, `resources.review-v6.json` y `../v3-resources/ai-credits.review-v1.json`; al
  2026-10-11 el catálogo pasó a `catalog.review-v7.json` con el piso de staffing (delta siguiente) y a
  `catalog.review-v8.json` con la oferta SEO/AEO (delta de esa oferta). Por la tarde del mismo día pasó a
  `catalog.review-v9.json` (forma del engagement, provisiones de puesta en marcha y CLP→USD) y la policy a
  `resources.review-v7.json` (Adobe como se factura), luego a `resources.review-v8.json` (plazos de compromiso de
  las licencias), a `resources.review-v9.json` (Microsoft 365 y Notion como se facturan, y la fecha en que renueva
  el contrato de Adobe) y por último a `resources.review-v10.json` (Creative Cloud Pro se cotiza sin su descuento).
  Por la noche el catálogo pasó a `catalog.review-v10.json` (reglas de precio de los costos de terceros, reserva de
  contingencia y factores de país cerrados como valores de política); la policy no cambió.
  Todo esto es historia fechada y puede haber seguido cambiando: para saber qué rige, corre `current show`.
- **Una fecha de cotización posterior ya no se bloquea por la vigencia de un precio de herramienta.** Medido con la
  demanda `managed-care-colombia` fechada el 2026-12-15: con la policy v6 calcula; con la v5 queda `needs_input` con
  `RESOURCE_PRICE_NOT_EFFECTIVE` en Notion, Microsoft 365 y la bandeja social.
- **El resumen trae dos lecturas nuevas**, descritas abajo: `runNotices` (sólo cuando hay algo que decir) y
  `estimateExposure`.

### `runNotices`: lo que describe la corrida, no la cotización

**Decisión.** `compose prepare|quote` agregan al resumen que imprimen en stdout una clave `runNotices`, ausente cuando
no hay nada que informar. No entra en el artefacto congelado ni en su digest, y `replay` no la imprime: el resto del
resumen es lo que un replay reproduce; `runNotices` es lo que vale para esta corrida. Tiene hasta dos miembros:

- `laterCatalogValues` (`{ quoteDate, newestEffectiveFrom, records, byKind }`): registros del catálogo que entran en
  vigencia después de la fecha de la cotización. La demanda conservó una fecha anterior a valores más nuevos y se
  calculó, sin error, con los de su fecha. Hasta este cambio la clave iba en la raíz del resumen.
- `priceDates` (`{ withinDays, reviewDue, dueSoon, expired }`): las fechas de los precios que esta cotización usó de
  verdad (precios de herramienta de sus atribuciones, registros de catálogo que enlazó, proveedores de crédito que
  presupuestó y la policy), leídas a la fecha de la cotización. `reviewDue` son fechas de revisión ya pasadas;
  `dueSoon`, vigencias duras o revisiones dentro de `withinDays` (30) días; `expired`, vigencias duras ya pasadas.
  *Nota 2026-10-11 (noche):* desde el contrato `1.4.0` también lista la vigencia de la cotización del proveedor de
  cada costo de terceros refacturado, con `subject: "third_party_quote"`, por `costId` y concepto, nunca por
  proveedor; pasada esa fecha, una cotización posterior queda retenida con `STALE_SOURCE`.

Medido: `managed-care.demand.json` (fecha 2026-10-10) con `--current` calcula y trae `laterCatalogValues` con 45
registros vigentes desde el 2026-10-11; la demanda de Colombia (2026-10-11) no trae `runNotices`.

**Alternativas descartadas.**

- *Guardar los avisos dentro del resultado congelado.* Un aviso no es parte del cálculo: agregarlo cambiaría la forma
  y el digest del resultado por algo que no mueve ninguna cifra.
- *Dejar `laterCatalogValues` en la raíz del resumen.* Mezclaba lo que un replay vuelve a imprimir con lo que sólo
  describe una corrida; un lector no podía distinguirlos.
- *Bloquear cuando hay valores posteriores o una revisión vencida.* Cotizar con una fecha anterior es legítimo y una
  fecha de revisión es un recordatorio. Lo que bloquea sigue siendo sólo una vigencia dura vencida, como diagnóstico.

**Reglas duras.**

- **NUNCA** tratar `runNotices` como bloqueo ni como parte de la cotización: no cambia estado, totales ni código de
  salida.
- **NUNCA** buscar `laterCatalogValues` en la raíz del resumen ni dentro del artefacto: vive en `runNotices`.
- **SIEMPRE** informar `runNotices` al operador junto al resultado cuando la clave existe.

### `estimateExposure`: dónde pesa más un dato estimado

**Decisión.** El resumen lleva la clave `estimateExposure`, derivada del resultado congelado sin recalcular nada, y
`compose assess` expone el mismo orden en `costEvidencePriority`. Sirve para decidir qué dato estimado conviene
confirmar primero. No es un pronóstico ni una validación.

- Claves: `totalCost`, `net`, `estimatedCost`, `confirmedCost`, `estimatedShareOfCost`, `costInputs[]`,
  `priceInputs[]` y `estimatedRules[]`. Sin totales (cotización bloqueada) la clave vale `null`.
- `costInputs[]` lista los datos de costo estimados que la cotización usó, ordenados por `costAtRisk` (el costo que
  descansa sobre ese dato), con `shareOfCost` y `marginRateLostIfTenPctHigher` = 0,10 × `costAtRisk` ÷ `net`,
  redondeado hacia arriba: los puntos de margen que se pierden si el dato resulta 10 % más alto y el neto no cambia.
- Un componente cuenta como estimado si al menos uno de los importes o factores que lo componen lo es, y cuenta una
  sola vez. Por eso `estimatedCost + confirmedCost = totalCost`, y la suma de los `costAtRisk` puede ser mayor.
- `priceInputs[]` son los factores de mercado estimados: mueven precio, nunca costo, y no entran al orden.
  `estimatedRules[]` son políticas estimadas que son reglas y no importes (capacidad facturada, margen objetivo,
  redondeo, impuesto); la lectura «10 % más alto» no les aplica.
- `costEvidencePriority` es `{ currency, estimatedCost, confirmedCost, estimatedShareOfCost, confirmFirst }`, donde
  `confirmFirst` son los cinco primeros `costInputs`.

Medido con la cotización de Colombia (`managed-care-colombia.demand.json` con `--current`: COP 28.100.000 al mes,
margen 41,5 %, ninguna línea marcada): el 98,7 % del costo descansa sobre datos estimados. El factor de talento de
Colombia sobre la referencia de Chile lleva el 64,7 % del costo y costaría 3,8 puntos de margen si fuera 10 % más
alto; la bandeja de Sprout, el 17,7 % y 1,0 punto.
*Nota 2026-10-11 (noche):* esa medición es de una cotización fechada el 2026-10-11. Con el catálogo v10, desde el
2026-10-12 los factores de país son valores de política `confirmed` y dejan de aparecer en `costInputs` y en
`priceInputs`; los factores valen lo mismo, cambia que ya no se leen como estimados. Desde el contrato
`1.4.0` la lectura conoce además una clase de dato de costo, `third_party` (la cotización de un proveedor cuya
evidencia es estimada), y dos reglas en `estimatedRules`: `third_party_policy` y `contingency_reserve`. La reserva no
es un dato de costo: se mueve con los componentes sobre los que descansa.

**Alternativas descartadas.**

- *Recalcular una sensibilidad volviendo a correr el motor con el dato más alto.* Exige un segundo cálculo con una
  entrada que nadie declaró y que no queda congelada; no se reproduce desde el artefacto y se lee como pronóstico.
  El costo es una suma de componentes y cada componente un producto, así que la parte del costo que lleva un dato es
  exactamente lo que se mueve, en proporción, cuando ese dato se mueve: se lee del resultado ya congelado.
- *Dejar en `assess` sólo la lista de brechas de evidencia.* Todas se leen igual y no dicen por cuál empezar.
- *Tratar un dato estimado como bloqueo.* Hoy casi todo el costo descansa sobre estimaciones; bloquearía todo.

**Reglas duras.**

- **NUNCA** presentar `estimateExposure` como pronóstico, como margen esperado ni como validación de un costo.
- **NUNCA** recalcular la exposición en un consumidor ni volver a correr el motor para estimarla: se lee del resumen
  o de `assess`.
- **NUNCA** sumar `priceInputs` ni `estimatedRules` al orden de los datos de costo.
- **SIEMPRE** usar `costInputs` (o `confirmFirst`) para proponer qué dato estimado confirmar primero.

### Base de costo: el costo objetivo, no la nómina

**Decisión del operador (CEO, 2026-10-11).** Los costos por persona del cotizador salen del Excel de pricing y
representan el nivel de remuneración que quiere alcanzar para el equipo. Decidió expresamente que el cotizador no
use el costo real de nómina. La nómina actual está por debajo del costo del catálogo, así que el margen real de
hoy sobre las personas es mayor que el que muestra el cotizador. Un costo `specific` se registra sólo donde el costo
objetivo de un perfil en un país se aparta de la referencia de Chile por el factor de talento.

**Reglas duras.**

- **NUNCA** proponer «conectar la nómina real» como mejora ni reemplazar un costo del catálogo por uno de nómina.
- **NUNCA** describir el costo del catálogo como lo que Efeonce paga hoy.
- **NUNCA** escribir la remuneración de una persona en un documento, una skill o un artefacto.

### Datos de esta ronda

- `catalog.review-v6.json` (versión `operating-review-2026-10-11-v6`; change-set `eur-quote-fx.change.json` sobre
  v5): agrega un registro, el tipo de cambio de cotización EUR→USD de 1,20 (referencia del BCE: 1,1206), vigente desde
  el 2026-10-11, sin fecha de término y marcado como estimado. El valor lo eligió el agente bajo la instrucción del
  operador de usar un margen prudencial sobre el spot; el operador no lo decidió expresamente para EUR.
- `resources.review-v6.json` (versión `operating-review-2026-10-11-v6`; cambio `stable-unit-prices.change.json`
  sobre v5): los 25 precios de herramienta rigen hasta que se los reemplace y cada uno lleva `reviewBy` 2027-04-11.
  Ningún importe, moneda, unidad ni referencia de fuente cambió. La fecha de revisión a seis meses la eligió el
  agente.
- `current.json`: el puntero, que nombra esas dos versiones y el catálogo de créditos v1.
- Ledger: `operational-gaps.json` agregó `UNIT_PRICE_REVIEW` y actualizó `QUOTE_FX_REVIEW` y
  `LOCALIZED_TALENT_COSTS`.

### Cuatro pilares

- *Seguridad:* nada sale del prototipo local. El puntero y `current show` informan versiones y digests, nunca el
  contenido de una fuente. Un puntero que no coincide con sus archivos se rechaza, no se sigue. Avisos y exposición
  no aprueban nada: `binding=false` y `requires_review` se conservan.
- *Robustez:* el puntero se construye desde los tres documentos, así que no puede nombrar una versión o un digest que
  nadie calculó; reemplazarlo exige el digest del que se leyó; y una prueba falla si queda apuntando a una versión
  que ya no es la más alta de su carpeta.
- *Resiliencia:* ninguna versión anterior ni artefacto congelado se tocó. Volver atrás es mover el puntero a las
  versiones previas o pasar los flags explícitos. El puntero se reemplaza con archivo temporal y `rename`.
- *Escalabilidad:* emitir una versión nueva ya no obliga a editar comandos en manuales y skills. La exposición es una
  función del dominio sobre el resultado congelado, con dos lectores (`summary` y `assess`).

### Sigue abierto

- Un registro de factor duplicado pasa `catalog preview` y `apply`, y recién bloquea al cotizar, con
  `AMBIGUOUS_SELECTION` (ruta `lines.<lineId>.talentFactor`).
- `compose assess` no lista los factores de país estimados como brecha de preparación; aparecen sólo en la
  exposición.
  *Nota 2026-10-11 (noche):* dejó de importar para cotizaciones fechadas desde el 2026-10-12: con el catálogo v10
  ningún factor de país es estimado.
- El registro EUR→USD del BCE de un solo día sigue saliendo como `expired` en `resources inspect`.
- CLF no tiene regla de redondeo ni tipo de cambio de cotización revisado. No hay USD→EUR ni redondeo para EUR.
- No se modelan factores por tipo de cliente ni factores de talento por perfil.
- La mayoría de los precios de herramienta siguen siendo precios públicos de lista marcados como estimados
  (`UNIT_PRICE_REVIEW`).

**Verificación (2026-10-11, local).** `pnpm pricing:v3:test`: 16 archivos y 501 pruebas; ESLint limpio en el módulo
y el script; la guarda de artefactos congelados pasa; `current show` responde `consistent: true`. La corrida de
Colombia con `--current` termina con exit 3 (calculada, requiere revisión), motor `pricing-v3-local/1.2.0`.

## Delta 2026-10-11 — piso de margen de staff augmentation (catálogo v7)

**Contexto.** La oferta `talent-assurance-staffing` —una persona vendida por dedicación, `commercialUnit`
`role_capacity`— conservaba en sus 32 políticas de precio el recargo histórico del workbook (`method: markup`) con
`minimumMargin` 0. El motor no tenía contra qué comparar: ningún precio de staff augmentation salía marcado, por bajo
que fuera.

**Decisión del operador (CEO, 2026-10-11).** El piso de margen de una persona vendida por dedicación es 25 %: «25%
está bien como piso y de ahí en adelante subimos dependiendo». Sobre el piso, el objetivo sube según el caso.

**Qué se registró.** `catalog.review-v7.json` (versión `operating-review-2026-10-11-v7`), emitido desde v6 con el
change-set `staffing-margin-floor.change.json`: 32 `replace`, uno por perfil (`pricing:ECG-001`…, revisión 2,
vigentes desde el 2026-10-11). Cada registro pasa a `method: target_margin` sobre todos los costos con
`minimumMargin` 0,25. El objetivo va por tier del workbook: 0,30 en `historical-tier-1` y `historical-tier-2`, 0,35 en
`historical-tier-3` y 0,40 en `historical-tier-4`. **Los objetivos por tier los propuso el agente y los confirmó el CEO
el mismo día** («sí me sirven»): los registros están marcados `confirmed` y su nota dice quién propuso y quién decidió. El puntero
`current.json` pasó a nombrar el catálogo v7; el ledger lo registra en `COMMERCIAL_POLICY`.

**Qué no cambia.** `creative-managed-service` sigue en objetivo 0,45 y mínimo 0,45: el piso de 45 % de los servicios
gestionados de la práctica creativa. El 40/35 de `compose assess` sigue siendo una propuesta genérica sin aprobar,
nunca un piso (nota del final del 2026-10-11: esa propuesta se retiró de `compose assess`; no era un piso y ya no
aparece). Una cotización con fecha anterior al 2026-10-11, las versiones anteriores del catálogo y los artefactos
congelados conservan el recargo histórico. No hay cambio de motor ni de contrato.

**Alternativas que el operador tuvo a la vista y por qué no se tomaron.**

- *45 %, igual que los servicios gestionados.* Deja a un diseñador senior dedicado muy por encima de lo que se le ha
  ofrecido al mercado, y en staff augmentation no hay un riesgo de resultado que ese margen pague.
- *El 40/35 genérico sin aprobar.* El mismo problema, y habría convertido en norma una propuesta que nadie aprobó.
- *Mantener el recargo del workbook.* 21 de los 32 perfiles (tiers 1 y 2) quedan entre 20 % y 23 % de margen, y nada
  frena un precio más bajo.

**Comportamiento verificado.** Un diseñador senior dedicado en Chile, un período, con herramientas: el precio por
defecto es CLP 2.580.000 con 30,5 % de margen (motor 1.1.0) y ninguna línea sale marcada; al declarar un neto
acordado de CLP 1.900.000, el resumen lista la línea en `marginFloor.lines[]` con `MARGIN_BELOW_FLOOR`,
`minimumMargin` 0,25 y margen de línea 10,8 %.
*Nota 2026-10-11 (tarde):* esas cifras son de una corrida con el catálogo v7 y la policy v6; las herramientas y la
puesta en marcha de entonces no son las de hoy (Adobe iba como paquete en USD y la puesta en marcha era el
placeholder de USD 100). Con el catálogo v9 y la policy v10 (Creative Cloud Pro sin descuento), un diseñador senior
dedicado en Chile con una licencia de tres de Creative Cloud Pro y la provisión de incorporación cotiza CLP
2.610.000 con 30,2 % de margen (motor 1.1.0, sin forma declarada), sin líneas marcadas: es
`designer-on-demand.demand.json` sin `engagementForm`, medido fuera de la carpeta de datos. Con la policy v8, que
todavía cotizaba Adobe con descuento, la misma corrida daba CLP 2.540.000 y 30,4 %. La regla del piso no cambió.

**Reglas para agentes.**

- Al emitirse este delta había dos ofertas con piso, ambos del CEO: 45 % para un servicio gestionado de la práctica
  creativa (`creative-managed-service`) y 25 % para una persona vendida por dedicación (`talent-assurance-staffing`).
  Desde el catálogo v8 son tres ofertas: ver el delta siguiente.
- **NUNCA** bajar un piso, ni elegir la oferta de staffing para un servicio gestionado, para que un precio pase.
- El objetivo de un perfil puede subirse en su propio registro, con una versión nueva del catálogo. El piso no.
- Los objetivos 30/35/40 son decisión del CEO sobre una propuesta del agente; cambiarlos exige una decisión suya y una
  versión nueva del catálogo.
- Una línea bajo el piso se informa al operador con su margen real. La excepción es del CEO, caso por caso, y nunca
  es referencia para otro cliente.

## Delta 2026-10-11 — oferta propia de la práctica SEO/AEO (catálogo v8)

**Contexto.** El piso de 45 % de la práctica SEO/AEO está aprobado por el operador (CEO) desde el 2026-07-13, con una
banda objetivo de 55–60 %, pero el catálogo no tenía una oferta para esa práctica. Un programa SEO/AEO gestionado sólo
podía cotizarse con `creative-managed-service`, cuyo objetivo es igual a su piso: salía al 45 %, por debajo de la banda
de su propia política.

**Decisión del operador (CEO, 2026-10-11).** Los servicios gestionados de la práctica SEO/AEO llevan su propia oferta
en el cotizador, `seo-aeo-managed-service`, con objetivo 55 % y piso 45 %. El piso es el aprobado el 2026-07-13; el
objetivo es el extremo bajo de la banda, propuesto por el agente y confirmado por el CEO el mismo día.

**Qué se registró.** `catalog.review-v8.json` (versión `operating-review-2026-10-11-v8`), emitido desde v7 con el
change-set `seo-aeo-managed-service.change.json`: 32 `add`, uno por perfil
(`pricing:<profileId>:seo-aeo-managed-service`, revisión 1, vigentes desde el 2026-10-11), con `method: target_margin`,
`rate` 0,55 sobre todos los costos y `minimumMargin` 0,45, marcados `confirmed`. Ninguna política existente se tocó. El
puntero `current.json` pasó a nombrar el catálogo v8; policy y créditos no cambiaron. El siguiente catálogo sería v9.
No hay cambio de motor, de esquema ni de contrato.
*Nota 2026-10-11 (tarde):* el catálogo v9 se emitió ese mismo día y el puntero dejó de nombrar el v8. Las tres
ofertas y sus políticas no cambiaron en v9.

**Por qué una oferta propia y no la creativa.** En SEO/AEO el objetivo no es el piso. Y el `offerId` es lo que un
agente elige en el brief: una práctica sin oferta propia termina cotizada al objetivo de otra práctica.

**Por qué otros 32 registros y no una dimensión «práctica».** El catálogo ya modela la política por oferta y perfil;
agregar la oferta no pide cambio de esquema ni de motor. El costo es un registro por perfil por oferta: hoy hay 96
políticas de precio vigentes (tres ofertas por 32 perfiles), más las 32 revisiones reemplazadas de staffing. Si las
ofertas siguen multiplicándose, la alternativa es una dimensión de práctica en la política.

**Comportamiento verificado.** El ejemplo de servicio gestionado del repo (`managed-care.demand.json`, cliente y equipo
en Chile, CLP), cotizado con `offerId: "seo-aeo-managed-service"` y fecha 2026-10-11, calcula con 55,07 % de margen,
motor `pricing-v3-local/1.1.0`, sin ninguna línea bajo el piso. Con una fecha anterior al 2026-10-11 esa oferta no
tiene política y la corrida queda `needs_input` con `MISSING_CATALOG_SELECTION` en `lines.<lineId>.pricing`.
*Nota 2026-10-11 (tarde):* desde la policy v7 la receta de Community Manager incluye `express-design`, y esa demanda
tiene dos líneas con ese perfil. Tal como está versionada, con `--current` queda `needs_input` con
`RESOURCE_ALLOCATION_REQUIRED` para `adobe-express`. Excluyendo la tarea en esas dos líneas
(`work[].excludedProfileTasks`, con motivo) vuelve a calcular lo mismo: CLP 11.640.000, 55,07 % de margen, motor
1.1.0, ninguna línea bajo el piso. La alternativa es declarar la asignación de Adobe Express.

**Reglas para agentes.**

- El catálogo lleva tres ofertas y tres políticas, todas decididas por el CEO: `creative-managed-service` (servicio
  gestionado de la práctica creativa; objetivo 45 %, piso 45 %), `seo-aeo-managed-service` (servicio gestionado de la
  práctica SEO/AEO; objetivo 55 %, piso 45 %) y `talent-assurance-staffing` (una persona vendida por dedicación;
  objetivo 30/35/40 % según tier, piso 25 %).
- **SIEMPRE** elegir la oferta por lo que se vende y por la práctica que lo entrega, nunca por el margen que deja pasar.
- Sobre un piso, el objetivo puede subirse por oferta o por perfil, con una versión nueva del catálogo. **NUNCA** se
  baja un piso para que un precio pase.
- La excepción bajo un piso es del CEO, caso por caso, y nunca es referencia para otro cliente.
- El 40/35 de `compose assess` sigue siendo una propuesta genérica sin aprobar, nunca un piso.
  *Nota del final del 2026-10-11:* retirado de `compose assess`
  ([delta](#delta-2026-10-11--compose-assess-juzga-contra-el-piso-de-la-propia-oferta)). La regla queda más simple:
  no se cita.

## Delta 2026-10-11 — presentar persona y kit de herramientas (`compose split`)

**Contexto.** En la venta de una persona por dedicación, las herramientas y provisiones son cerca de un quinto del
costo de un perfil creativo. Con todo dentro de un solo fee, el precio se compara mal con una contratación directa.
El operador pidió una recomendación y aceptó mostrar las herramientas especializadas como un ítem propio.

*Corrección 2026-10-11 (tarde):* «cerca de un quinto» salió de una simulación que atribuía el paquete completo de
Adobe a una sola persona; sobrestima las herramientas. Medido sobre
[`designer-on-demand.artifact.json`](../../data/pricing/v3-operating/designer-on-demand.artifact.json) (diseñador
senior dedicado en Chile, un mes, una licencia de tres de Creative Cloud Pro con el descuento que regía en la policy
v7, la que congeló el artefacto; `compose cash` y `compose split`): la
persona es el 74,1 % del costo; las herramientas, el 9,0 % (el kit que se separa —Adobe, Higgsfield y Magnific— es
el 6,7 %); las provisiones mensuales, el 2,8 %; el fee de plataforma, el 2,8 %; y la provisión de incorporación,
que se cobra una vez, el 11,3 % de ese único mes. El reparto de ese artefacto es kit CLP 190.000 y persona
CLP 2.600.000, que suman el neto de 2.790.000. El motivo de la decisión no cambia: lo que cambia es el tamaño del
kit.

**Decisión.** `compose split` deriva, de un artefacto congelado y de una lista de herramientas que entrega quien
llama, dos cifras por fila y periodo: kit y persona. Vive en `resources/price-split.ts` (función pura) y en el
adaptador CLI. No cambia el kernel, ningún contrato de entrada, la demanda ni lo que congela un artefacto.

**Regla de reparto.** El kit parte del precio que el kernel ya guardó por componente, toma la misma proporción de
descuento o ajuste de su fila y sube al múltiplo de redondeo de la moneda. La persona es el resto del neto de la
fila, por lo que la suma es exacta por construcción. El factor de mercado y el redondeo de la fila quedan en la
persona, porque el kernel los aplica al componente humano y a la fila.

**Alternativas descartadas.**

- *Un campo en la demanda que declare qué herramientas se cobran aparte:* cambia un contrato congelado para algo
  que es presentación, y obliga a decidirlo antes de cotizar.
- *Prorratear el neto de la fila por costo:* le daría al kit un margen que la política no le dio cuando la base es
  sólo humana, y repartiría el factor de mercado sobre herramientas que el motor no ajusta.
- *Incluirlo en el resumen por defecto:* nadie eligió qué herramientas separar; el cotizador no debe adivinarlo.

**Reglas para agentes.**

- **NUNCA** presentar el reparto como otro precio: el total es el del artefacto.
- **NUNCA** elegir por cuenta propia qué herramientas van aparte; es decisión del operador.
- **SIEMPRE** informar si una parte queda bajo el piso mientras la fila lo cumple.
- La salida es interna: trae costos y márgenes.
- Bajo el contrato 1.3.0 el kit toma la razón del engagement como cualquier componente: el kernel guarda cada
  componente al precio al que se vende, así que el reparto no mueve nada entre las partes.

**Abierto.** Si el kit de un servicio gestionado de varias líneas debe redondearse una vez por periodo y no por
fila; si el redondeo del kit debe ser hacia arriba cuando objetivo y piso coinciden; una vista del reparto apta
para el cliente.

## Delta 2026-10-11 — forma del engagement, puesta en marcha y Adobe como se factura: qué cambia en el flujo operativo

Posterior a los deltas anteriores del mismo día. Las decisiones viven en el ADR dueño de cada tema; este delta sólo
registra su efecto sobre el flujo.

| Cambio | Dónde está la decisión |
| --- | --- |
| Forma del engagement con razón de precio; contrato `1.3.0` | [ADR del motor](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-130-la-forma-del-engagement-como-dato-propio) |
| Provisiones de puesta en marcha costeadas | [ADR de mantenimiento](GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md#delta-2026-10-11--provisiones-de-puesta-en-marcha-costeadas-catálogo-v9) |
| Plazo de compromiso de una licencia, Adobe como se factura, costos en CLP y regla de bundle | [ADR de composición](GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--plazo-de-compromiso-de-una-licencia-adobe-como-se-factura-y-costos-en-clp) |
| Tres lecturas de una cotización congelada | [delta siguiente](#delta-2026-10-11--tres-lecturas-de-una-cotización-congelada-calendario-caja-y-compromisos) |

- **El brief gana un campo opcional, `engagementForm`** (hoy `on_going` u `on_demand`; los ids son datos del
  catálogo). Es distinto de `engagementCode`, que sigue siendo `monthly` y sigue eligiendo la política de precio. Un
  encargo acotado se declara `"engagementForm": "on_demand"` y sale con la prima de esa forma sobre toda la fila; sin
  el campo la cotización se calcula como siempre y no dice nada sobre la forma.
- **Qué contrato calcula.** A las reglas anteriores se suma una, que va primero: si el brief declara
  `engagementForm`, la resolución emite `1.3.0`, también con razón 1. `engineVersion` del resumen dice cuál firmó.
- **Lectura.** El resumen nombra la forma en `engagementForm` y lo que movió en `totals.engagementAdjustment`.
  `assess` y `explain` lo repiten; `preview` muestra sólo el neto final.
- **Errores.** Una forma sin registro vigente a la fecha de la cotización: `MISSING_CATALOG_SELECTION` con ruta
  `engagementForm`, exit 2. Dos registros vigentes del nivel que prevalece: `AMBIGUOUS_SELECTION`.
- **Puesta en marcha.** En los siete kits de staffing cada persona que entra a una cuenta lleva por defecto
  `provision-account-onboarding`. El reclutamiento es opcional y se pide por línea:
  `"choices": [{ "requirementId": "recruiting", "resourceId": "provision-recruiting" }]`. Las dos caen en la fila
  `setup` y llevan el margen de la oferta. Una persona que se suma después paga su propia incorporación.
- **Herramienta con precio en CLP.** Adobe está en CLP desde la policy v7. La demanda que la use debe nombrar
  `fx:CLP:USD` en `fxRecordIds`, igual que una herramienta en EUR necesita `fx:EUR:USD`; un id que no se usa se
  rechaza (`UNUSED_FX_SELECTION`).
- **Demandas anteriores con perfiles de contenido.** Social Media Manager, Community Manager, Content Manager y
  Content Creator incluyen `express-design` desde la policy v7. Una demanda escrita antes que tenga uno de esos
  perfiles, cotizada con `--current`, queda `needs_input` con `RESOURCE_ALLOCATION_REQUIRED` para `adobe-express`
  hasta que declare la asignación o excluya la tarea con motivo (`work[].excludedProfileTasks`). Es el caso de
  `managed-care-colombia.demand.json`; su artefacto congelado sigue respondiendo `verified: true`.
- **Un encargo On-Demand o un trabajo acotado ya se puede representar**: la forma en `engagementForm`, el plazo como
  períodos (o, si dura menos de un mes, como horas dentro de un período), los hitos de pago con `compose schedule` y
  lo que queda comprometido con proveedores con `compose commitments`. Lo que sigue sin representarse está en
  «Todavía no se modela», al final del delta siguiente.
  *Nota 2026-10-11 (noche):* los dos puntos de esa lista (costos de terceros y reserva de contingencia) ya se
  representan, con el contrato `1.4.0`. Lo que sigue sin modelarse está al final del
  [delta del contrato 1.4.0 y el catálogo v10](#delta-2026-10-11--contrato-140-y-catálogo-v10-cómo-se-lee-una-cotización-con-terceros-y-reserva).

**Reglas para agentes.**

- **SIEMPRE** preguntar o declarar la forma del compromiso antes de cotizar; un brief sin `engagementForm` se cotiza
  como On-Going.
- **NUNCA** cotizar Hybrid con una razón propia: son dos cotizaciones, una base On-Demand y una operación On-Going.
- **NUNCA** agregar reclutamiento por defecto ni quitar la incorporación para bajar el precio: el primero entra sólo
  cuando hay que contratar a alguien para ese cliente; la segunda es el requisito del kit.
- **NUNCA** resolver un `RESOURCE_ALLOCATION_REQUIRED` de `adobe-express` editando la receta del perfil: se declara la
  asignación o se excluye la tarea en la demanda, con motivo.

## Delta 2026-10-11 — tres lecturas de una cotización congelada: calendario, caja y compromisos

**Contexto.** Un encargo acotado trae tres preguntas que una cotización mensual no respondía: cuándo se cobra, cuánta
caja nueva obliga a pagar a proveedores y qué queda comprometido con ellos después del último período. Las tres se
pueden contestar con lo que el artefacto ya congeló.

**Decisión.** Tres comandos que **leen** un artefacto de composición, como `compose split`. Ninguno forma un precio,
cambia un costo, un estado o un digest, ni recalcula con el kernel. Los tres verifican primero el artefacto por
replay; uno que no reproduce su digest se rechaza. Reciben sólo `--input` (más `--milestones` en el calendario) y
`--out` opcional; no reciben catálogo, policy ni `--current`, porque leen las fuentes que el artefacto lleva dentro.
Salen con exit 3 (una composición siempre está bajo revisión) y `binding: false`.

### `compose schedule` — calendario de pagos

`pnpm --silent pricing:v3 compose schedule --input artifact.json --milestones milestones.json [--out …]`.
Función `presentPaymentSchedule` en `resources/engagement-view.ts`, contrato `pricing-v3-payment-schedule/1`.

- `milestones.json` es un arreglo JSON de `{ id, label, share, periodId? | when? }`, de 1 a 60 hitos. `share` es una
  cadena decimal mayor que 0 y hasta 1. `periodId` es un período de la cotización; `when` es texto libre para una
  condición o fecha que la cotización no modela. Un hito lleva uno de los dos o ninguno, nunca ambos.
- Las participaciones deben sumar **exactamente 1**, sin tolerancia.
- Cada importe es su participación del neto leída al múltiplo de redondeo con que se congeló la cotización (el más
  cercano, mitad hacia arriba), o a la unidad de la moneda si la cotización no tiene regla. El último hito es lo que
  queda del neto: absorbe el redondeo de los anteriores. Los importes suman el neto a la unidad.
- Impuesto sólo si la cotización lo resolvió; entonces se reparte en proporción a los importes y suma `totals.tax`.
  Si no, `tax` y `total` van en `null`: no se asume tasa.
- Rechazos (exit 1): `SCHEDULE_MILESTONES_INVALID`, con `option: "milestones"` e `issues[]` de `{ path, rule }`
  (hasta 20; por ejemplo `shares_must_sum_to_one`, `unknown_period`, `period_and_when`, `amount_not_representable`
  cuando una participación es tan chica que el hito quedaría sin importe), y `SCHEDULE_REQUIRES_CALCULATED_QUOTE`
  cuando la cotización no tiene totales.
- Es un calendario: dice cuándo vence un importe. No es una factura ni un monto cobrado, y no revisa fechas,
  aceptaciones ni pagos.
- *Nota 2026-10-11 (noche):* en una cotización `1.4.0` el neto que se reparte incluye el neto de los costos de
  terceros refacturados. La lectura agrega entonces `thirdParty` (lo que se les paga a los proveedores, en total y
  por período, junto a lo que los hitos colocan en ese período) y `thirdPartyCostInPeriod` en cada hito que declara
  período. Ver el delta del contrato 1.4.0.

### `compose cash` — lectura de caja del engagement

`pnpm --silent pricing:v3 compose cash --input artifact.json [--out …]`. Función `readEngagementCash` en
`resources/engagement-view.ts`, contrato `pricing-v3-engagement-cash/1`.

- **Lee, no recalcula:** neto, costo completo y margen (`totals` y por período), tal como los congeló el kernel.
- **Costo por naturaleza** (`fullCostByNature`): `people`, `provisions`, `platformFee`, `setup`,
  `toolCreditBudgets` y `toolSeatsAndPackages`, que suman el costo congelado. `capacityCostAbsorbed` es personas
  más provisiones: costo real del trabajo, nunca cero ni «capacidad gratis».
- **Caja nueva a proveedores** (`newSupplierCash`): sólo lo que el artefacto declara como compra incremental, que
  son los packs extra de créditos (`resourceIncrementalCash`), convertidos con el tipo de cambio congelado y leídos
  hacia arriba. La parte de suscripción que un presupuesto atribuye ya está financiada y no cuenta.
- **Dos resultados con nombre.** `marginAtFullCost` decide si el trabajo es viable; el veredicto de piso sigue
  siendo el `MARGIN_BELOW_FLOOR` del kernel. `cashAddedOnContractedCapacity` = neto − caja nueva a proveedores: la
  caja que el trabajo agrega **si** las personas son capacidad ya contratada. Lleva `isMargin: false` y
  `decidesPrice: false`.
- **En qué descansa** (`restsOn`): que cada persona del trabajo ya se paga con o sin él; que las provisiones son
  reservas y no compras; y que no se compra ningún asiento, paquete, fee de plataforma ni recurso de puesta en marcha
  para este trabajo.
- **Lo que declara como no derivable** (`notDerivable`): si un asiento o paquete es una compra nueva (el artefacto
  atribuye una parte y no registra si el asiento ya existe; uno comprado para el trabajo se paga entero, no por su
  parte atribuida); si el fee de plataforma o la puesta en marcha son caja pagada a un tercero; y lo cobrado (una
  cotización no tiene facturas ni pagos). También un pack sin tipo de cambio congelado hacia la moneda de la
  cotización, y componentes de una clase que la lectura no conoce.
- `modeledCommitment` repite `totals.cashCommitment` y el `cashLedger`; ninguna otra cifra se deriva de ahí.
- Rechazo (exit 1): `ENGAGEMENT_CASH_REQUIRES_CALCULATED_QUOTE`.
- *Nota 2026-10-11 (noche):* tres de las viñetas de arriba describen una cotización sin terceros. En una
  cotización `1.4.0`, `fullCostByNature` tiene dos naturalezas más (`thirdParty` y `contingencyReserve`);
  `newSupplierCash` ya no son sólo los packs de créditos: suma el costo congelado de cada costo de terceros
  refacturado (`supplierCash.thirdParty`); `restsOn` y `notDerivable` ganan una línea cada uno (el importe que
  cobrará el proveedor y la fecha en que se le paga); y `marginAtFullCost` trae `ownWork`. La reserva no es caja de
  nadie ni capacidad. Ver el delta del contrato 1.4.0.

### `compose commitments` — compromisos que sobreviven a los períodos cotizados

`pnpm --silent pricing:v3 compose commitments --input artifact.json [--out …]`. Función `commitmentExposure` en
`resources/commitment-exposure.ts`, contrato `pricing-v3-commitment-exposure/1`. Exit 3, o 2 si la cotización no
está calculada. Necesita, además del resultado, la policy, la demanda y el catálogo congelados en el artefacto.

Lee tres clases de compromiso:

1. **Precio por año.** El kernel lo cobra entero en el primer período que lo usa y costea un doceavo por período.
2. **Precio por mes bajo un plazo de compromiso** (`commitmentTermMonths` en la entrada de precio de la policy): una
   licencia que, una vez tomada, se sigue cobrando hasta que termina el contrato. Lo declara la policy; el kernel no
   lo registra. Sin fecha de renovación se lee como **un** plazo que abre en el primer período que usa el precio; no
   se asume renovación. Cuando la entrada declara además la fecha en que renueva el contrato (`commitmentRenewsOn`,
   sólo junto con el plazo), el plazo se lee como **ya corriendo**: las renovaciones son esa fecha y cada plazo
   después de ella (una fecha pasada avanza a la siguiente de la serie), y la licencia queda atada hasta la primera
   renovación estrictamente posterior al último día del último mes calendario cotizado que usa el precio
   (`commitment.boundUntil`). Lo que queda son los meses calendario posteriores a ese período que empiezan antes de
   esa fecha; un mes cubierto en parte cuenta entero, así que la lectura puede sobrestimar hasta un mes. Si los
   períodos cotizados cruzan una renovación, la licencia queda atada hasta la **siguiente** y se suma la señal
   `COMMITMENT_RENEWS_WITHIN_ENGAGEMENT`: en la renovación se puede cambiar el número de licencias, pero sólo de las
   que ya no se necesitan. Un plazo de 1 (se paga mes a mes y se suelta) no deja nada después del último período,
   con fecha o sin ella. Hoy es la diferencia entre Adobe, que sigue cobrando una licencia hasta que el contrato
   renueva, y Microsoft 365 y Notion, cuya cuenta baja cuando se quita un asiento.
3. **Packs de créditos de IA más grandes que su uso**: créditos comprados, usados y sobrantes, con su vencimiento
   (si siguen válidos después del engagement o caducan dentro de él).

Por cada compromiso de las dos primeras clases: `committed`, `attributedWithinPeriods` (lo cubierto dentro de la
cotización) y `unrecovered` (la diferencia). Quién carga con lo no recuperado depende de la parte que declaró la
demanda: con la cuota entera la cotización es el único usuario declarado y el importe queda **varado si nada más lo
usa**; con una cuota menor que 1 el asiento es compartido y el importe **se libera a esa capacidad**, nunca se cuenta
como varado. `shorterCommitmentPrices` lista los precios por mes que la misma policy tiene para esa herramienta con
un compromiso más corto; es información, nada se elige. `signals[]` resume con seis códigos:
`COMMITMENT_OUTLIVES_ENGAGEMENT`, `SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT`, `COMMITMENT_RENEWS_WITHIN_ENGAGEMENT`
(acompaña a uno de los dos anteriores con el mismo importe; no es dinero que se sume),
`SHORTER_COMMITMENT_PRICE_IN_POLICY`, `CREDITS_LEFT_OVER_AFTER_ENGAGEMENT` y `CREDITS_LAPSE_WITHIN_ENGAGEMENT`.
Con fecha de renovación, la entrada trae `commitment.termStartKnown`, `renewsOn`, `boundUntil` y
`renewsWithinQuotedPeriods`, y `committed` es lo atribuido dentro de la cotización más los meses que quedan, no un
plazo entero.

**Lo que declara como no derivable** (`notDerivable`, que se lee «no se sabe», nunca «no hay»):

- `CONTRACT_TERM_NOT_FROZEN`: herramientas con precio por mes cuya entrada no declara plazo. Sin el dato no se puede
  leer un contrato anual facturado mes a mes, un asiento que no se suelta a mitad de plazo ni un preaviso.
- `CONTRACT_RENEWAL_NOT_DECLARED`: la cotización usa el precio más allá del plazo declarado y no se sabe si renueva.
  Sólo sale para un plazo mayor que 1 sin fecha de renovación: un plazo de 1 nunca la levanta, y con fecha la
  renovación está declarada.
- `CREDIT_SUBSCRIPTION_TERM_NOT_FROZEN`: por cuánto tiempo está comprometida la suscripción de un proveedor de
  créditos.
- `QUOTE_NOT_CALCULATED`: sin totales no hay nada que leer.
- `THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN` (desde el contrato `1.4.0`): las compras a terceros quedan fuera de esta
  lectura a propósito. La lectura dice cuántas vio (`reviewed.thirdPartyPurchasesOutsideThisReading`, una por costo
  y período) y que sus condiciones no están congeladas: si una compra ata más allá del engagement no se puede leer.
- Por compromiso: si es caja nueva (`incrementalCash` va en `null`: el artefacto no dice si el asiento ya existe),
  cuándo abrió de verdad el plazo (`commitment.termStart`, sin fecha de renovación) o, con fecha, las condiciones de
  salida (`commitment.exitTerms`: salir antes, su cargo o reembolso, lo que se factura por un mes cubierto en parte y
  si el contrato se renueva), y quién tiene el resto de un asiento compartido.

**Por qué es un comando y no un aviso automático.** La lectura conoce los períodos cotizados, no el plazo del
contrato con el cliente. No puede distinguir un trabajo de un mes de un mes representativo de un servicio continuo: en el segundo
caso el «compromiso que sobrevive» no sobrevive a nada: la herramienta se sigue usando el mes siguiente. Como aviso
en cada resumen daría esa señal también en los servicios continuos, donde es falsa. Se corre a pedido, para un
engagement acotado, y su `basis` lo dice.

**Alternativa descartada.**

- *Un aviso de compromisos dentro de `runNotices` en cada `compose prepare|quote`.* Por lo anterior: sin el plazo del
  contrato como dato, sería ruido en los servicios continuos.

**Lo que el código fija a propósito.**

- Las lecturas no viven en la demanda ni en el artefacto: hitos y herramientas a separar los entrega quien llama,
  después de cotizar, igual que en `compose split`.
- Una participación que no llega a un importe se rechaza; no se presenta un pago de cero.
- La suma de participaciones es 1 exacto: con 0,9999 quedaría dinero que nadie cobra.
- La caja nueva se lee hacia arriba: dinero que sale nunca se presenta más chico de lo que es.

**Medido el 2026-10-11** sobre
[`designer-on-demand.artifact.json`](../../data/pricing/v3-operating/designer-on-demand.artifact.json) (un mes, CLP,
neto 2.790.000, costo completo 1.768.438; son las cifras del artefacto congelado, con Adobe con descuento):

- `compose schedule` con 50/30/20: 1.400.000, 840.000 y 550.000; suman el neto. Sin impuesto, porque la cotización
  no lo resolvió.
- `compose cash`: caja nueva a proveedores 43.770 (packs de créditos) y caja sobre capacidad contratada 2.746.230.
- `compose commitments` sobre el artefacto versionado, que congeló la policy v7: un solo compromiso, la licencia de
  Adobe Creative Cloud Pro, leído como liberado al paquete compartido (la demanda declara una licencia de tres);
  Notion y Microsoft 365 en `CONTRACT_TERM_NOT_FROZEN`.
  Ese artefacto no conoce la fecha de renovación: su lectura es la de un plazo sin fecha (un plazo entero desde el
  primer mes cotizado) y sus importes son un techo, no lo que queda del contrato.
- La misma demanda vuelta a cotizar con `--current` (policy v10, fuera de la carpeta de datos): costo 1.822.704 y
  neto 2.870.000, margen 0,3649, porque Creative Cloud Pro entra sin descuento. La demanda elige el precio público
  de Microsoft 365 y no `current`, así que ese costo no se mueve. El único compromiso sigue siendo Adobe, ahora leído
  contra su renovación: queda **un** mes después del cotizado, CLP 108.468 (una licencia de tres del precio sin
  descuento, 325.405,5 / 3), liberado al paquete compartido; la licencia queda atada hasta el 2026-11-16 y la señal
  es `SHARED_COMMITMENT_OUTLIVES_ENGAGEMENT`. Con la policy v9, que aún cotizaba con descuento, ese mes eran CLP
  54.202 (162.605 / 3). Notion y Microsoft 365 declaran un mes: no salen como no declarados y no dejan nada
  comprometido. Sólo quedan las suscripciones de créditos en `CREDIT_SUBSCRIPTION_TERM_NOT_FROZEN`.

**Reglas para agentes.**

- **NUNCA** presentar una lectura como otro precio ni como una condición aprobada: el total es el del artefacto.
- **NUNCA** presentar `cashAddedOnContractedCapacity` como margen ni usarlo para decidir o defender un precio. El
  margen que decide es `marginAtFullCost` y el piso es el del kernel.
- **NUNCA** leer el calendario como factura, cobro o compromiso contractual de fechas.
- **NUNCA** leer un `notDerivable` como cero: es un dato que falta.
- **NUNCA** correr `compose commitments` como paso de rutina sobre un servicio continuo ni reportar sus señales como
  pérdida: en un mes representativo no dicen nada. Es para engagements acotados.
- **NUNCA** elegir por cuenta propia un precio de compromiso más corto porque la lectura lo lista.
- **SIEMPRE** entregar junto a la cifra de caja lo que dicen `restsOn` y `notDerivable`.
- **SIEMPRE** informar al operador lo varado y lo liberado por separado. Si un compromiso es aceptable lo decide él.
- Las tres salidas son internas: traen costos, márgenes y proveedores.

**Sigue abierto.**

- El plazo del contrato con el cliente no es un input: una cotización tiene períodos, no un plazo. Por eso
  `commitments` no es automático.
  *Nota 2026-10-11 (cierre):* esto dejó de estar «abierto». El CEO decidió que el plazo del contrato y la fecha de
  inicio del servicio quedan fuera del cotizador
  ([delta](#delta-2026-10-11-cierre--una-cotización-no-es-un-contrato)). Lo que la lectura supone no cambia:
  `commitments` conoce los períodos cotizados y se sigue pidiendo a propósito.
- **Límite conocido de la lectura de plazos.** La fecha de renovación es opcional (`commitmentRenewsOn`). Un precio
  que declara plazo **sin** fecha se sigue leyendo como un plazo entero contado desde el primer mes cotizado: para un
  contrato que ya está corriendo eso sobrestima lo comprometido, y sus importes se leen como un techo, no como una
  medida. Con fecha se cuenta lo que queda del plazo en curso, con dos límites propios: un mes cubierto en parte
  cuenta entero (hasta un mes de más) y las condiciones de salida no están en el artefacto. Al 2026-10-11 sólo los
  precios de Adobe declaran fecha (2026-11-16). Los precios con `unit: 'year'` ignoran los dos campos.
- No se declara si un asiento se compra para el trabajo, así que la lectura de caja no puede restarlo.
- Sólo Adobe (12), Notion (1) y los precios mensuales de Microsoft 365 (1) declaran plazo. Para el resto la lectura
  responde «no declarado». HubSpot se contrata por año, según el operador, pero su precio vigente está pendiente de
  evidencia y una entrada pendiente no admite plazo.
  *Nota 2026-10-11 (noche):* el CEO dijo ese día que HubSpot no hace falta en las cotizaciones por ahora. Su precio
  queda pendiente a propósito: no es un dato que el operador deba, ni un insumo que falte para cotizar.
- Un engagement de menos de un mes se expresa como horas dentro de un período.
- No hay una vista de ninguna de las tres lecturas apta para el cliente.

**Todavía no se modela.** Los costos de terceros de un encargo y una reserva de contingencia para trabajo de alcance
fijo. No hay contrato de entrada, registros ni comando para eso; hoy no entran a la cotización.

*Nota 2026-10-11 (noche):* ese párrafo dejó de ser cierto ese mismo día. Los dos se modelan desde el contrato
`1.4.0` y el catálogo v10: los costos de terceros se declaran en `brief.thirdPartyCosts[]` y la reserva sale de un
registro `contingency_reserve`. No hizo falta un comando nuevo: entran por `compose quote` y los leen los comandos
que ya existían. Decisión y reglas en el
[ADR del motor](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-140-costos-de-terceros-y-reserva-de-contingencia);
efecto sobre el flujo y lo que sigue sin modelarse, en el delta siguiente.

## Delta 2026-10-11 — contrato 1.4.0 y catálogo v10: cómo se lee una cotización con terceros y reserva

Posterior a los deltas anteriores del mismo día. La decisión de motor (contrato, formación del precio, identidades,
piso, alternativas descartadas) vive en el
[delta 1.4.0 del ADR del motor](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-140-costos-de-terceros-y-reserva-de-contingencia).
Aquí se decide cómo se **lee** una cotización así y se registran los datos del catálogo v10. No hay comandos, flags
ni códigos de salida nuevos.

### Efecto sobre el flujo

- **El brief gana dos campos opcionales.** `thirdPartyCosts[]`, con `settlement` `reinvoiced` (Efeonce compra y
  refactura) o `client_direct` (el cliente le paga al proveedor), y `contingency`, que sólo sirve para renunciar a
  la reserva con un motivo. La cotización declara el importe y su evidencia; nunca una tasa.
- **Qué contrato calcula.** A las reglas anteriores se suma una, que va primero: la resolución emite `1.4.0` si el
  brief refactura al menos un costo o si exactamente un registro de reserva prevalece para la cotización, también
  cuando se renuncia a ella. `engineVersion` del resumen dice cuál firmó. Un brief que sólo trae notas
  `client_direct` se queda en su contrato anterior.
- **La reserva no se pide: se obtiene.** Sale del catálogo según la oferta y la forma del engagement. Para que un
  servicio gestionado On-Demand la lleve, el brief tiene que declarar `engagementForm`. Sin el campo, el resumen
  trae el supuesto `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM` en `assumptions`.
- **Bloqueos nuevos (exit 2, `needs_input`).** Una categoría sin regla vigente (`MISSING_CATALOG_SELECTION` en
  `thirdPartyCosts.<costId>.policy`); dos reservas que no se pueden ordenar (`AMBIGUOUS_CONTINGENCY_RESERVE`); una
  renuncia sin reserva que renunciar (`CONTINGENCY_WAIVER_WITHOUT_RESERVE`); un período mal declarado
  (`INVALID_THIRD_PARTY_SCHEDULE`, `THIRD_PARTY_COST_OUTSIDE_ACTIVE_PERIOD`); una cotización de proveedor vencida
  (`STALE_SOURCE`) o pendiente. Una evidencia estimada no bloquea: deja la cotización bajo revisión.
- **Proveedor y referencia no llegan al resumen ni a las lecturas.** El resumen y `compose assess`, `preview`,
  `split`, `cash`, `schedule` y `commitments` nombran un costo por `costId`, concepto y categoría; el nombre del
  proveedor y la referencia de su cotización quedan en el brief congelado. `explain` es el detalle interno completo
  y sí los trae: repite ese brief y la evidencia de cada fila.

### La regla de lectura: dos márgenes, un veredicto por fila

**Decisión.** Una cotización `1.4.0` tiene dos márgenes y ninguno es un veredicto.

- **El margen mezclado se diluye con lo que se refactura.** `marginRateRoundedDown` (y `totals.marginRate`) sigue
  siendo el margen real de toda la cotización. Baja con cada peso que se refactura al costo o cerca del costo, sin
  que el trabajo sea menos viable. **No es el número que se compara con el piso de una oferta.**
- **El trabajo propio es lo que se compara con el piso de la oferta.** `ownWork.marginRateRoundedDown` (y
  `totals.ownWorkMarginRate`) es el margen de la cotización sin sus filas de terceros.
- **No existe un veredicto a nivel de cotización sobre ninguno de los dos.** El piso se juzga por fila: una fila de
  equipo contra el `minimumMargin` de su política de precio, una fila de terceros contra el de la regla de su
  categoría. `marginFloor` del resumen sigue listando sólo lo que el kernel marcó.

Por qué: con un solo número, un encargo con muchos medios al costo se vería bajo el piso de la oferta sin estarlo, y
un equipo vendido bajo su piso podría esconderse detrás de un recargo sobre producción. Separar las filas deja cada
piso donde se decidió.

### Cómo describe cada lector una cotización 1.4.0

- **Resumen** (stdout de `compose prepare|quote`, y de `replay`). Tres claves nuevas, presentes sólo cuando
  corresponde:
  - `ownWork { cost, net, marginAmount, marginRateRoundedDown }`.
  - `thirdParty { reinvoiced { cost, net, marginAmount, shareOfNet, rows[] }, clientDirect[], fxExposed[] }`. Cada
    fila trae categoría, importe y moneda del proveedor, estado y vigencia de su evidencia, la regla aplicada
    (método, tasa, redondeo, registro) y su recorrido de precio con `floorNet`. `fxExposed` son los costos cuya
    moneda no es la de salida. `clientDirect` existe también en una cotización que no llega a `1.4.0`.
  - `contingencyReserve { rate, base, amount, baseAmount, shareOfNet, waived, waiverReason?, waivedAmount?,
    recordId, revision, scope, sourceStatus }`: es lo que permite decir «reserva: X, que es 12 % de un costo de
    personas de Y».
- **`estimateExposure`.** La cotización de un proveedor es un dato de costo de clase `third_party`, estimado o
  confirmado según su evidencia, y entra al orden como cualquier otro. La reserva **no** es un dato: escala los
  datos de su base por `(1 + tasa)`. Un registro de reserva o una regla de categoría estimados aparecen en
  `estimatedRules`.
- **`explain`.** `commercialAdjustments.thirdPartyPolicies[]` y `.contingencyReserve`; las filas de terceros en el
  desglose de costo; la reserva bajo su propia clave, no como un recurso.
- **`compose assess`.** `margin.ownWorkRate` y `margin.proposedFloorReadOn: "ownWorkRate"`: `belowProposedFloor` se
  lee sobre el trabajo propio. Ese umbral sigue siendo el 40/35 genérico sin aprobar, nunca el piso de una oferta; el
  piso de la oferta lo juzga el kernel por fila (`margin.policyFloor`).
  *Nota del final del 2026-10-11:* `proposedFloorReadOn` y `belowProposedFloor` se retiraron junto con el 40/35.
  `ownWorkRate` se conserva, y `margin` trae `pricingPolicies[]`, `thirdPartyPolicies[]` y `belowPolicyFloor`
  ([delta](#delta-2026-10-11--compose-assess-juzga-contra-el-piso-de-la-propia-oferta)). Brechas nuevas:
  `THIRD_PARTY_COST_EVIDENCE_REQUIRED` (evidencia no confirmada),
  `THIRD_PARTY_FX_EXPOSURE` (el proveedor cobra en otra moneda y se le paga al tipo de cambio del día),
  `THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED`, `THIRD_PARTY_TAX_TREATMENT_REVIEW` (sólo con impuesto `exclusive` y un
  costo refacturado: la tasa se aplicó al neto entero) y `CONTINGENCY_RESERVE_WAIVED`.
- **`compose preview`** (vista cliente). El fee es sólo el trabajo propio. Un ítem por costo de terceros, con su
  concepto y su neto final. `clientPaidDirectly[]` va después de los totales, en su propia moneda y sin convertir.
  Nunca un proveedor, un costo ni una tasa.
- **`compose split`.** Tres partes cuando la cotización tiene filas de terceros: `tools + person + thirdParty =
  net`. La reserva queda dentro de `person`.
- **`compose cash`.** Naturalezas `thirdParty` y `contingencyReserve`. `newSupplierCash` incluye lo que se les paga
  a los proveedores de los costos refacturados. La reserva es una provisión dentro del costo: no es caja de nadie y
  no es capacidad. Los costos que paga el cliente se listan y no se cuentan en ninguna parte. La fecha en que se le
  paga a un proveedor no es derivable.
- **`compose schedule`.** Reparte el neto entero, costos refacturados incluidos. `thirdParty.byPeriod` muestra
  dónde los hitos colocados en un período son menores que el costo de proveedores de ese período
  (`supplierCostAboveMilestones`): es caja que la empresa pone antes de cobrar.
- **`compose commitments`.** Las compras a terceros quedan fuera de la lectura a propósito. Dice cuántas vio y que
  sus condiciones no están congeladas (`THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN`).
- **Fechas de precios** (`runNotices.priceDates`). `subject: "third_party_quote"` para la vigencia de la cotización
  de un proveedor. Un registro de reserva que termina **no** bloquea: la cotización siguiente sale sin reserva y
  ningún diagnóstico lo dice, salvo que el brief renuncie a ella (entonces `CONTINGENCY_WAIVER_WITHOUT_RESERVE`).
  Por eso el aviso de esa fecha lleva `blocksWith: null` y un `consequence` que lo explica.

### Datos del catálogo v10 y quién decidió qué

`catalog.review-v10.json` (versión `operating-review-2026-10-11-v10`), emitido desde v9 con el change-set
`third-party-contingency-factors.change.json`: 15 operaciones. La policy (v10) y los créditos (v1) no cambiaron.
Políticas de precio, pisos y todo otro registro quedaron intactos.

| Registros | Valor | Estado y vigencia |
| --- | --- | --- |
| `third_party_policy` de `production`, `talent` y `printing` | `markup` 10 %, piso 5 %, redondeo comercial | `estimated`, desde el 2026-10-11 |
| `third_party_policy` de `media` y `licences` | `markup` 0, piso 0, sin redondeo: se cobran exactamente al costo | `estimated`, desde el 2026-10-11 |
| `contingency_reserve` de `creative-managed-service` y de `seo-aeo-managed-service`, forma `on_demand` | 12 % del costo de las personas (`base: human`) | `estimated`, desde el 2026-10-11 |
| `talent_factor` de CO 0,80, PE 0,85, MX 0,90, ES 3 y US 5 | Mismos valores | `confirmed`, desde el 2026-10-12 |
| `market_factor` de PE 0,95, MX 1 y ES 1,10 | Mismos valores | `confirmed`, desde el 2026-10-12 |

- **Reglas de terceros y reserva.** Son **estimaciones propuestas por el agente que el CEO aceptó** el 2026-10-11
  («seguiré tu recomendación»), para ajustar con el primer trabajo real. El 10 % es el fee de gestión de proyecto
  del workbook de pricing. «Sin margen sobre la inversión en medios» es la regla del propio operador para medios
  pagados. El 12 % es el colchón que el operador usó en una oferta de licitación.
- **Sin reserva para staff augmentation.** El cliente dirige el trabajo: no hay riesgo de alcance que reservar.
- **Factores de país: cerrados por el CEO** el 2026-10-11 («deja eso cerrado ya»). Son valores de política, no
  observaciones de mercado. Rigen como `confirmed` desde el 2026-10-12; una cotización fechada el 2026-10-11
  todavía lee la estimación y trae el aviso `laterCatalogValues`. Un factor se revisa sólo cuando una contratación
  real o un negocio cerrado en ese país lo contradice, con una versión nueva del catálogo. **Está cerrado: no se
  vuelve a presentar como una decisión que el operador debe.**
- **HubSpot.** El CEO dijo que no hace falta en las cotizaciones por ahora; su precio queda pendiente a propósito.
- **Ledger.** `operational-gaps.json` agregó `THIRD_PARTY_AND_CONTINGENCY` y cerró `COUNTRY_FACTORS_UNVALIDATED`.

### Medido el 2026-10-11

Sobre
[`managed-on-demand-third-party.artifact.json`](../../data/pricing/v3-operating/managed-on-demand-third-party.artifact.json),
el primer artefacto `1.4.0`: un servicio gestionado creativo vendido On-Demand en Chile, un período, en CLP, con un
costo de producción en CLP, talento en USD, medios al costo y una licencia que paga el cliente. Los proveedores del
ejemplo son marcadores; aquí los costos se nombran por su concepto.

- **`replay`**: `verified: true`, motor `pricing-v3-local/1.4.0`, exit 3. Costo 14.750.055, neto 21.033.333, margen
  mezclado 29,87 %. Terceros refacturados: costo 9.083.333 y neto 9.663.333, el 45,9 % del neto. Trabajo propio:
  costo 5.666.722, neto 11.370.000, margen 50,16 %. Reserva 436.800, que es 12 % de 3.640.000 de costo de personas.
  Ninguna fila bajo su piso.
- **Por fila de terceros.** Producción (CLP, redondeo comercial): costo 4.500.000, neto 4.950.000, piso 4.736.843.
  Talento (USD 1.250 al tipo de cambio congelado de 1.000): costo 1.250.000, neto 1.380.000 con 5.000 de redondeo,
  piso 1.315.790. Medios (CLP, al costo): costo y neto 3.333.333, sin redondeo aunque la moneda tiene regla.
- **La reserva es un costo, así que se vende.** Los 436.800 de costo pasan por el margen de la oferta y por la
  razón On-Demand y son 873.600 de precio antes del redondeo. La misma demanda con `brief.contingency` en `waived`
  (fuera de la carpeta de datos, con `--current`): neto 20.163.333, 870.000 menos; costo 14.313.255; trabajo propio
  10.500.000 con 50,19 %; `contingencyReserveWaived` 436.800 y la señal `CONTINGENCY_RESERVE_WAIVED`.
- **`compose assess`**: `modeledRate` 0,2987, `ownWorkRate` 0,5016, `proposedFloorReadOn: "ownWorkRate"`,
  `belowProposedFloor: false` (medido esa noche; desde el final del 2026-10-11 la misma lectura trae
  `belowPolicyFloor: false` y no esas dos claves). Brechas de terceros: `THIRD_PARTY_FX_EXPOSURE` en el talento,
  `THIRD_PARTY_COST_EVIDENCE_REQUIRED` en los medios (evidencia estimada) y
  `THIRD_PARTY_SCOPE_AND_TERMS_REQUIRED`. `costEvidencePriority` pone primero los medios: 22,6 % del costo.
- **`compose preview`**: fee del período 11.370.000 y tres ítems (4.950.000, 1.380.000 y 3.333.333), que suman el
  neto. `clientPaidDirectly`: la licencia, USD 890, sin convertir y fuera del total.
- **`compose split --tools all`**: herramientas 2.020.000, persona 9.350.000 y terceros 9.663.333, que suman el
  neto. La reserva está en el costo de la persona (4.670.800).
- **`compose cash`**: costo por naturaleza: personas 3.640.000, provisiones 300.000, fee de plataforma 294.000,
  asientos y paquetes 995.922, terceros 9.083.333 y reserva 436.800, que suman el costo. Caja nueva a proveedores
  9.083.333; caja sobre capacidad contratada 11.950.000. `capacityCostAbsorbed` 3.940.000: no incluye la reserva.
- **`compose schedule`** con 50/50 y el anticipo en el período 1: 10.520.000 y 10.513.333; el anticipo cubre los
  9.083.333 de proveedores. Con 30/70: 6.310.000 y 14.723.333, y `supplierCostAboveMilestones` 2.773.333.
- **`compose commitments`**: `thirdPartyPurchasesOutsideThisReading` 3 y `THIRD_PARTY_PURCHASE_TERMS_NOT_FROZEN` en
  `notDerivable`. El único compromiso que lee es el de la bandeja social con precio por año.
- **Sin terceros y sin forma** (la misma demanda sólo con la nota `client_direct` y sin `engagementForm`, fuera de
  la carpeta de datos): motor `1.1.0`, neto 9.530.000, y el supuesto
  `CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM`. El resumen conserva `thirdParty.clientDirect`.
- **Factores de país.** El mismo ejemplo con equipo en Colombia y cliente en Perú (PEN), fuera de la carpeta de
  datos. Fechado el 2026-10-11: `ESTIMATED_SOURCE` nombra `snapshot.talentFactors` y `snapshot.marketFactors`, y
  `runNotices.laterCatalogValues` avisa 8 registros vigentes desde el 2026-10-12 (5 `talent_factor` y 3
  `market_factor`). Fechado el 2026-10-12: ninguno de los dos, mismo costo y mismo neto.

Evidencia fechada. El único artefacto que se agregó a la carpeta de datos es el de `managed-on-demand-third-party`.

### Reglas para agentes

- **NUNCA** comparar el margen mezclado de una cotización con terceros contra el piso de una oferta, ni reportarlo
  como «bajo el piso». Se informa el margen mezclado **y** el del trabajo propio, y el veredicto es el de cada fila.
- **NUNCA** presentar el margen del trabajo propio como el margen de la cotización: el margen real es el mezclado.
- **NUNCA** escribir el nombre de un proveedor junto a un importe en un resumen, una vista para el cliente o un
  documento: un costo se nombra por su concepto.
- **NUNCA** sumar un costo `client_direct` a un total, a la caja o a un calendario, ni convertirlo de moneda.
- **NUNCA** renunciar a la reserva por cuenta propia para bajar un precio. La renuncia la decide el operador, lleva
  motivo y se informa con el importe que se dejó de reservar.
- **NUNCA** tratar las tasas de terceros o el 12 % de la reserva como valores medidos: son estimaciones aceptadas
  y se reportan como `ESTIMATED_SOURCE`.
- **NUNCA** volver a presentar los factores de país como un pendiente del operador, ni pedir HubSpot como insumo
  para cotizar.
- **SIEMPRE** declarar `engagementForm` en un servicio gestionado y revisar `assumptions` antes de informar.
- **SIEMPRE** informar al operador las brechas de terceros de `assess` (evidencia, tipo de cambio, alcance y
  condiciones) y, en el calendario, cualquier período donde los proveedores cuestan más que los hitos colocados.
- **SIEMPRE** decir que la reserva es un costo que se vende con el margen de la oferta: renunciar a ella baja el
  precio en más que su importe.

### Todavía no se modela

No describir nada de esta lista como existente.

- Cuándo se le paga a un proveedor, y si una compra ata más allá del trabajo (un plazo mínimo, derechos de uso que
  lo sobreviven).
- Una comisión sobre los costos que el cliente paga directo.
- Una tarifa de proveedores recurrentes.
- Tratamiento de impuesto por fila.
- Una cotización con terceros y sin ninguna línea de equipo.
- La reserva para un servicio On-Going ganado en una licitación con multas.
- La liberación de la reserva después de la entrega.
- De antes: el plazo del contrato con el cliente, un asiento comprado para el trabajo, períodos de menos de un mes,
  la forma Hybrid, cotizar en EUR y una vista apta para el cliente de las lecturas internas.
  *Nota 2026-10-11 (cierre):* el plazo del contrato con el cliente salió de esta lista: no es un pendiente, queda
  fuera del cotizador por decisión ([delta](#delta-2026-10-11-cierre--una-cotización-no-es-un-contrato)).
  *Nota 2026-10-11 (noche, posterior):* el cliente ya tiene un documento propio, con las líneas de la cotización y,
  si se pide, su calendario de pagos (delta siguiente). Sigue sin existir una versión para el cliente del reparto en
  persona y kit, de la lectura de caja y de los compromisos.

## Delta 2026-10-11 — el documento de cotización de una cotización V3 (`compose document`)

**Contexto.** Efeonce tiene dos documentos de cotización. El PDF del cotizador de Greenhouse
(`src/lib/finance/pdf/`, react-pdf) se arma desde las tablas de cotizaciones. La
[plantilla A4](../commercial/templates/cotizacion-a4/README.md) (HTML a PDF, del 2026-10-08) ya se usó en
cotizaciones entregadas. Una cotización V3 no tenía documento: `compose preview` es una proyección para revisar, no
una pieza para entregar. El CEO comparó los dos documentos lado a lado, sobre renders reales, el 2026-10-11.

**Decisión (CEO, 2026-10-11).** El documento para el cliente de una cotización Pricing V3 es la **plantilla A4**.
Orden de trabajo acordado:

1. Conectar V3 con la plantilla. **Hecho:** `compose document`.
2. Extender la plantilla a varias líneas con precio. **Hecho:** versión 2 de sus datos.
3. Más adelante, llevar ese diseño al cotizador de Greenhouse, que aporta lo que la plantilla no tiene: número de
   cotización, versiones, verificación por QR, firmas, aprobación, envío y CRM. **No ha empezado.** Se registra sólo
   como la dirección acordada: este delta no la autoriza ni la planifica.

Por qué la plantilla: presenta un precio por un servicio, no horas y una tarifa por rol; lo hace en pocas páginas
densas; y usa la línea gráfica vigente. Por qué Greenhouse sigue haciendo falta: la plantilla no tiene un registro
detrás.

Nada de esto mueve la [frontera de promoción](../documentation/finance/cotizador-v3-promocion-canonica.md). Un
documento producido localmente es un borrador: no es una `quotation_id`, un precio aprobado ni una cotización
emitida.

**Implementación.** `composeQuoteDocument` y `scaffoldQuoteDocumentBrief`, funciones puras en
`resources/quote-document.ts`, y el adaptador CLI. No cambia el kernel, ningún contrato de entrada, la demanda ni
lo que congela un artefacto. `compose preview` imprime lo mismo que antes.

```bash
pnpm --silent pricing:v3 compose document --input artifact.json                       # andamio del brief, exit 2
pnpm --silent pricing:v3 compose document --input artifact.json --brief brief.json \
  --out data.json                                                                     # datos, exit 3
node scripts/documents/render-cotizacion-a4.mjs --data data.json --out carpeta-nueva  # HTML, PDF y capturas
```

Sin `--brief` imprime el andamio (`pricing-v3-quote-document-scaffold/1`): las cifras de la cotización, cada línea
bajo su clave con el nombre y el grupo que tendría por defecto, y los textos por llenar; `--out` guarda sólo el
brief. Con `--brief` emite la versión 2 de los datos de la plantilla. Contrato del brief, claves de línea, reglas
del impuesto y rechazos:
[contrato](../documentation/finance/cotizador-v3-contrato-y-validacion.md#documento-de-cotización-compose-document-2026-10-11).
El contrato de los datos y las reglas de composición son de la plantilla y viven en
[su README](../commercial/templates/cotizacion-a4/README.md#versión-2-varias-líneas-con-precio).

### Reglas de diseño y por qué

- **Es una lectura, no un cálculo.** Como `split`, `schedule`, `cash` y `commitments`: verifica el artefacto por
  replay, no recalcula con el kernel, no cambia un precio, un costo, un estado ni un digest, y no recibe catálogo,
  policy ni `--current`. *Por qué:* el documento no decide nada que la cotización no haya decidido. Si fuera un
  paso de cálculo, lo que el cliente lee podría apartarse de lo que se revisó y se congeló.
- **El brief no tiene importes.** El brief (`pricing-v3-quote-document-brief/1`, estricto) trae lo que la
  cotización no sabe —referencia, oferente, comprador, portada, nombre del servicio, alcance, calendario del
  trabajo, textos de precio y condiciones— y la presentación de las líneas. No tiene clave para un importe, una
  moneda, una tasa de impuesto ni una fecha: uno que la trae se rechaza. La fecha del documento es la de la
  cotización y la moneda es su moneda de salida, sin conversión. *Por qué:* con una cifra en el brief habría dos
  fuentes para el mismo número, y un documento podría contradecir a su cotización sin que nada lo notara. Así, para
  cambiar una cifra hay un solo camino: cambiar la cotización y volver a emitir.
- **Una sola frontera hacia el cliente.** Las líneas salen de `clientSafePeriodItems`, la misma función de la que
  sale `compose preview`: un concepto y su neto final, y nada más de la fila. Sin costo, margen, tarifa, proveedor,
  política ni identificador interno; un servicio gestionado es una línea de fee, nunca su equipo y sus horas. Las
  claves con que el brief nombra una línea nunca se imprimen. *Por qué:* lo que un cliente puede ver se decide en un
  solo lugar; toda presentación nueva se construye sobre él y no agrega cifras propias.
- **El documento imprime el impuesto de la cotización.** Con una tasa aplicada sobre el neto viajan la tasa y el
  impuesto que la cotización congeló, y la plantilla imprime ese importe en vez de calcular otro. Sin impuesto
  resuelto, impuesto y total salen «Por confirmar»; si no aplica, «No aplica» y el total es el neto. *Por qué:* el
  kernel calcula el impuesto de cada período y suma; calcularlo una vez sobre el total puede diferir en una unidad,
  y el cliente vería una cifra que la cotización no tiene. El impuesto congelado se sigue comprobando contra su
  tasa, con una tolerancia de una unidad menor por cada mes o pago que cuentan las líneas.
- **Cada garantía es un rechazo, no un documento equivocado.** Las líneas suman exactamente el neto
  (`QUOTE_DOCUMENT_LINES_DO_NOT_ADD_UP`); la cotización está calculada
  (`QUOTE_DOCUMENT_REQUIRES_CALCULATED_QUOTE`); cada importe se puede escribir en su moneda y el contenido cabe en
  los límites de la plantilla, hasta 40 líneas y 8 costos pagados por el cliente
  (`QUOTE_DOCUMENT_NOT_REPRESENTABLE`); y el impuesto corresponde a su tasa
  (`QUOTE_DOCUMENT_TAX_NOT_REPRESENTABLE`). Un brief inválido es `QUOTE_DOCUMENT_BRIEF_INVALID`, con la ubicación
  de cada falla y nunca su contenido.
- **Cómo se reúnen los períodos.** Los meses consecutivos en que una clave tiene el mismo neto son una línea
  (cantidad «n meses», valor unitario el neto de un mes, neto su suma exacta). Un cobro único es «1 pago único», sin
  valor unitario. Una clave cuyo neto cambia da una línea por tramo, con sus meses como detalle. Un mes con neto
  cero no imprime nada. Grupos por defecto: «Servicio», «Puesta en marcha» y «Costos de terceros».
- **Dos bloques opcionales, ninguno con cifras del brief.** Los costos que el cliente paga directo a su proveedor se
  imprimen aparte, en su moneda y fuera de todo total. El calendario de pagos sale cuando el brief declara
  `paymentMilestones`, la misma lista de participaciones que recibe `compose schedule --milestones`: los importes
  los calcula esa lectura, sus rechazos llegan tal cual y, en un documento, cada hito dice cuándo se cobra.
  *Nota 2026-10-11 (posterior):* son tres bloques desde el
  [delta de opciones y cortesía](#delta-2026-10-11--opciones-cortesía-y---out-después-del-primer-caso-real), que
  agrega las opciones adicionales; y «un mes con neto cero no imprime nada» tiene desde ahí una excepción, la línea
  bonificada que el brief pide mostrar.
- **Siempre un borrador.** Sale con exit 3 y `status: "draft"`, como toda lectura de una cotización en revisión. Los
  datos llevan `source { system, calculationId, digest, engineVersion }`, que llega al manifiesto de la plantilla
  y nunca se imprime.

### La plantilla A4, versión 2

La autoridad es la plantilla: [README](../commercial/templates/cotizacion-a4/README.md),
[revisión](../commercial/templates/cotizacion-a4/VERIFICACION.md) y
[monedas](../commercial/templates/cotizacion-a4/MULTIMONEDA.md). Lo que este flujo necesita de ella:

- Los datos `version: 2` agregan las líneas con precio, el impuesto declarado, el estado del impuesto, los costos
  pagados por el cliente, el calendario de pagos y el origen de los datos. Las claves desconocidas se rechazan.
- La sección de precio ocupa las páginas que necesita, sin reducir la tipografía; un documento que no se puede
  componer falla con «Contenido fuera del A4».
- La versión 1 (un único precio) no cambió: las cotizaciones ya entregadas siguen validando y sus ejemplos se
  generan idénticos, con una prueba que lo guarda.
- Límites que se declaran: una moneda de presentación distinta de la de la cotización se rechaza en la versión 2;
  la portada sigue siendo una página fija, así que un título largo falla la comprobación y se acorta; y no hay
  número de cotización, versión, QR ni página de firmas, que pertenecen al cotizador de Greenhouse.

### Alternativas descartadas

- *Generar el documento con el PDF de Greenhouse desde ahora:* necesita un registro de cotización detrás, que el
  prototipo local no crea, y presenta horas y tarifas por rol.
- *Una segunda proyección para el cliente, propia del documento:* dos fronteras se apartan con el tiempo y una
  termina mostrando lo que la otra oculta.
- *Dejar que la plantilla recalcule el impuesto:* dos cifras para una misma cotización.

### Medido el 2026-10-11

Tres ejemplos versionados en [`data/pricing/v3-operating/`](../../data/pricing/v3-operating/README.md), cada uno con
su `<nombre>.document-brief.json` (comprador inventado) y su `<nombre>.document.json`. Vueltos a emitir, los tres
son idénticos byte a byte a los versionados; generados con la plantilla, importes en CLP:

| Ejemplo | Líneas | Neto | Impuesto y total | Páginas |
| --- | --- | --- | --- | --- |
| `designer-on-demand` (contrato `1.3.0`, un mes) | «Diseñador visual sénior», 1 mes, 2.470.000; «Puesta en marcha del servicio», 1 pago único, 320.000 | 2.790.000 | Sin resolver: «Por confirmar» | 4 |
| `designer-three-months-iva` (contrato `1.3.0`, tres meses) | 3 meses × 2.550.000 = 7.650.000; puesta en marcha, 320.000 | 7.970.000 | IVA 19 %: 1.514.300; total 9.484.300 | 4 |
| `managed-on-demand-third-party` (contrato `1.4.0`, un mes) | Fee 11.370.000; tres costos de terceros: 4.950.000, 1.380.000 y 3.333.333 | 21.033.333 | Sin resolver: «Por confirmar» | 5 |

- `designer-three-months-iva` es una cotización congelada nueva (demanda y artefacto, catálogo v10 y policy v11):
  la primera versionada con varios períodos y con el impuesto resuelto. `replay`: `verified: true`, costo
  5.068.112, margen 0,3641, ninguna línea marcada. Su IVA de 19 % es la fuente de impuesto de un ejemplo. Su
  mensualidad difiere de la del ejemplo de un mes porque aquél congeló una policy anterior, con Creative Cloud Pro
  todavía con su descuento.
- En el tercer ejemplo el documento imprime aparte un costo que paga el cliente, USD 890 sin convertir, y un
  calendario de pagos de 50 %, 30 % y 20 %: 10.520.000, 6.310.000 y 4.203.333.
- En el manifiesto de la plantilla el impuesto queda como declarado (`stated`) en el ejemplo de tres meses y por
  confirmar (`pending`) en los otros dos.
- `pnpm pricing:v3:test`: 25 archivos y 1.208 pruebas. Pruebas de la plantilla
  (`node --test scripts/documents/render-cotizacion-a4.test.mjs scripts/documents/document-money.test.mjs`): 25.
  `replay` de los 20 artefactos bajo `data/pricing/**`: todos `verified: true`.

Evidencia fechada. El único artefacto que se agregó a la carpeta de datos es el de `designer-three-months-iva`.

### Reglas para agentes

Ante un pedido de «la cotización» de una cotización V3: cotizar (`compose quote`), revisar (`compose assess`, pisos;
las excepciones son del CEO), pedir el andamio con `compose document` sin brief, llenar el brief sólo con textos,
emitir con `--brief`, generar con la plantilla, leer las capturas y entregar el PDF como borrador salvo que el precio
esté aprobado.

- **NUNCA** escribir una cifra a mano en el brief ni en los datos, ni editar los datos emitidos: se cambia la
  cotización y se vuelve a emitir.
- **NUNCA** presentar el documento como una cotización aprobada, emitida o registrada, ni darle un número de
  cotización de Greenhouse.
- **NUNCA** resolver un impuesto «Por confirmar» en un texto del brief: el tratamiento lo decide el operador y se
  declara en la demanda.
- **NUNCA** construir otra vista para el cliente con cifras propias: toda presentación sale de la misma proyección.
- **NUNCA** describir el paso 3 (el cotizador de Greenhouse adoptando este diseño) como empezado.
- **SIEMPRE** leer las capturas y el PDF página por página antes de entregar, y decir de qué artefacto salió el
  documento.

### Todavía no se modela

No describir nada de esta lista como existente.

- Textos del documento traídos de un catálogo o de una biblioteca de condiciones: se escriben por cotización.
- El reparto en persona y kit (`compose split`) como forma del documento: un documento imprime las líneas propias
  de la cotización.
- Número de cotización, historial de versiones, verificación por QR, firmas, aprobación y envío: existen sólo en el
  cotizador de Greenhouse, y esta lectura no escribe en él.
- Una portada, un alcance o unas condiciones de más de una página (hasta 7 filas de alcance, 3 fases de calendario
  y 6 condiciones).
- Un documento en una moneda distinta de la de la cotización.
- Generar sin un Chromium local: como todo documento de `scripts/documents/`, usa Playwright.

## Delta 2026-10-11 — opciones, cortesía y `--out`, después del primer caso real

Posterior al delta del documento, el mismo día. El primer caso real se cotizó de punta a punta —un servicio
gestionado de doce meses, con su documento para el cliente— y dejó tres cosas que el flujo no podía hacer bien. El
operador (CEO) pidió corregirlas de forma robusta. No cambian el kernel, ningún contrato de entrada ni lo que congela
un artefacto. La cuarta corrección de ese día, los asientos y los períodos de la demanda, está en la
[decisión de composición](GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--asientos-como-se-compran-y-períodos-declarados-una-vez).
Contrato: [documento](../documentation/finance/cotizador-v3-contrato-y-validacion.md#documento-de-cotización-compose-document-2026-10-11)
y [`--out`](../documentation/finance/cotizador-v3-contrato-y-validacion.md#--out-una-cotización-calculada-o-nada-2026-10-11).
Los datos y las reglas de composición son de la plantilla:
[su README](../commercial/templates/cotizacion-a4/README.md#versión-2-varias-líneas-con-precio).

- **Una opción adicional sale de su propia cotización congelada.** `compose document --option <clave>=<artefacto>`,
  repetible hasta ocho veces. Cada opción es la cotización de esa opción sola, verificada por replay como la base. Su
  precio es el neto de uno de sus períodos, y por eso se exige que esté calculada, en la moneda de la base, con el
  mismo neto en todos sus períodos y sin costos que el cliente paga directo. El brief nombra exactamente las opciones
  entregadas, con su nombre y su unidad, y no tiene clave para el precio. Nada de una opción entra a las líneas, al
  neto, al impuesto ni al total. Rechazo propio: `QUOTE_DOCUMENT_OPTION_INVALID`. *Por qué:* el documento ya tenía una
  regla, que toda cifra sale de una cotización congelada. Una opción con el precio escrito en un texto era la única
  cifra del documento sin cálculo detrás: nadie le había revisado costo, piso ni margen, y quedaba vieja al volver a
  cotizar. *Descartado:* un importe en el brief (rompe esa regla) y una fila de la cotización base marcada como
  opcional (entraría al neto, al impuesto y al total de algo que el cliente todavía no compra).
- **Una cortesía sale de una fila que la cotización bonifica.** Una línea que la cotización deja en cero con un
  ajuste explícito sigue sin imprimir nada por defecto. Si el brief marca su clave con `courtesy: true`, se imprime
  como «Bonificado» con su valor de referencia: el precio que la fila tenía antes de la rebaja, leído del artefacto
  por una función propia y segura para el cliente (`clientSafeWaivedItems`). No suma a ningún total, y una línea que
  se cobra no se puede marcar. `compose preview` y la frontera de siempre (`clientSafePeriodItems`) no cambiaron.
  *Por qué:* decir cuánto vale lo que se regala es una cifra como cualquier otra, y sólo es cierta si la cotización
  de verdad costeó esa fila y de verdad la bonificó. Marcarla es una decisión de presentación; bonificarla es una
  decisión comercial que queda en la demanda, con su motivo, y que deja la fila marcada bajo su piso. *Descartado:*
  imprimir toda fila bonificada (una cortesía se pide, no se supone) y un valor de referencia escrito en el brief.
- **`--out` es una cotización calculada o nada.** `calculate`, `quote` y `compose prepare|quote` escriben `--out`
  sólo si la cotización calcula. Una corrida bloqueada imprime todo lo que encontró, sale con 2, no escribe nada y lo
  dice en `runNotices.output` (`written: false`, `reason: "QUOTE_NOT_CALCULATED"`); la corrida corregida usa el mismo
  `--out`. `--keep-blocked`, que exige `--out`, guarda el artefacto bloqueado a propósito para `explain`, `replay`,
  `compose assess` y `compose commitments`, y lo rotula (`KEPT_BLOCKED`). Un archivo que existe nunca se sobrescribe.
  *Por qué:* un artefacto bloqueado en la ruta de la cotización tenía el nombre y la forma de una cotización sin
  serlo, y obligaba a elegir entre inventar otro nombre o borrar un archivo, que es justo lo que este flujo prohíbe
  hacer con un artefacto. *Descartado:* sobrescribir la ruta en la corrida siguiente (ningún artefacto se
  sobrescribe) y dejar de escribir del todo el bloqueado (tiene lectores propios).

**Límites que se declaran.**

- Un servicio gestionado no tiene puesta en marcha en el catálogo, así que su cotización no tiene una fila que
  bonificar: su «puesta en marcha bonificada» queda como un texto sin valor de referencia hasta que el catálogo la
  costee (`MANAGED_SERVICE_SETUP_NOT_PARAMETRIC`).
- Una opción que sólo agrega dedicación de personas que ya están en la cotización base es una línea nueva en su
  propia cotización: vuelve a llevar el fee de plataforma por línea y su parte de las herramientas base. Su costo
  está sobrestimado y su margen es una cota inferior; el precio impreso no cambia
  (`OPTION_QUOTES_REPEAT_PER_LINE_FEES`, agregado al ledger).
  *Nota 2026-10-11 (cierre):* este límite se cerró el mismo día: ese adicional se declara como incremento
  ([delta](#delta-2026-10-11-cierre--un-adicional-que-amplía-la-base-se-lee-como-un-incremento-compose-increment)),
  y el ítem del ledger quedó cerrado.
- La duración del contrato y una fecha de inicio que el cliente define después siguen sin ser un dato: una
  cotización tiene meses fechados desde su fecha de cotización.
  *Nota 2026-10-11 (cierre):* no es un límite por cerrar. El CEO decidió que las dos quedan fuera del cotizador
  ([delta](#delta-2026-10-11-cierre--una-cotización-no-es-un-contrato)). La segunda frase sigue siendo cierta: es
  lo que una cotización supone de su calendario.
- El reparto en persona y kit sigue sin ser una forma del documento, y número de cotización, versiones, QR, firmas y
  aprobación siguen perteneciendo al cotizador de Greenhouse. Llevar este diseño allá es el paso acordado y **no ha
  empezado**.

**Reglas para agentes.**

- **NUNCA** escribir el precio de una opción ni un valor de referencia: la opción se cotiza y se pasa con `--option`;
  la cortesía se bonifica en la cotización y se marca en el brief.
- **NUNCA** presentar una opción como parte del total, ni una línea que se cobra como una cortesía.
- **NUNCA** tratar un artefacto guardado con `--keep-blocked` como una cotización.
- **SIEMPRE** corregir la demanda y repetir con el mismo `--out` cuando una corrida queda bloqueada.
- **SIEMPRE** decir, al entregar una opción que sólo suma dedicación, que su margen es una cota inferior.
  *Nota 2026-10-11 (cierre):* reemplazada. Ese adicional ya no se entrega con el margen de su cotización suelta: se
  lee con `compose increment` y se informa el margen del incremento.

**Medido el 2026-10-11.** Ejemplo versionado `designer-startup-courtesy` en
[`data/pricing/v3-operating/`](../../data/pricing/v3-operating/README.md), con sus dos opciones, cada una con su
demanda y su artefacto (motor `1.3.0`, catálogo v10 y policy v11). Importes en CLP:

| Ejemplo | Líneas | Neto | Impuesto y total | Opciones | Páginas |
| --- | --- | --- | --- | --- | --- |
| `designer-startup-courtesy` (tres meses) | 3 meses × 2.550.000 = 7.650.000; puesta en marcha «Bonificado», valor de referencia 320.000 | 7.650.000 | IVA 19 %: 1.453.500; total 9.103.500 | 2.580.000 «al mes» y 3.570.000 «por mes de campaña» | 5 |

- Los datos vueltos a emitir son idénticos al versionado `designer-startup-courtesy.document.json`. Sin brief, el
  andamio lista la clave bonificada (`design:setup`, 320.000) bajo `waived` y las dos opciones bajo `options`.
- En la cotización, la fila bonificada queda marcada bajo su piso; el documento no cambia eso.
- Una corrida bloqueada con `--out` no dejó archivo y trajo `runNotices.output` con `written: false`; con
  `--keep-blocked` y otra ruta, el artefacto bloqueado quedó escrito y `compose cash` y `compose document` lo
  rechazaron.
- `pnpm pricing:v3:test`: 27 archivos y 1.359 pruebas. `replay` de los 24 artefactos versionados bajo
  `data/pricing/**`: todos `verified: true`.

Evidencia fechada. Los artefactos que se agregaron a la carpeta de datos son el de `designer-startup-courtesy` y los
de sus dos opciones.

## Delta 2026-10-11 (cierre) — un adicional que amplía la base se lee como un incremento (`compose increment`)

Posterior al delta de opciones, el mismo día. Cierra el límite que ese delta declaró
(`OPTION_QUOTES_REPEAT_PER_LINE_FEES`). No cambia el kernel, ningún contrato de entrada ni lo que congela un
artefacto; todos los artefactos anteriores se reproducen igual. Contrato:
[incremento](../documentation/finance/cotizador-v3-contrato-y-validacion.md#incremento-de-un-adicional-compose-increment-2026-10-11).
Paso a paso:
[manual](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#un-adicional-que-amplía-la-base-compose-increment).

**La evidencia.** `compose document --option` imprime un adicional desde su propia cotización congelada, que es la
fuente correcta de su precio. En el primer caso real, uno de los adicionales eran unos puntos más de dedicación de
una persona que ya era una línea de la cotización base. Su cotización propia es una línea nueva, y una línea nueva
lleva lo que se cobra una vez por línea, cualquiera sea su dedicación: el fee de plataforma y su parte de las
herramientas base. El costo del adicional quedaba sobrestimado y su margen, subestimado. El precio impreso estaba
bien sólo porque era un precio pactado: a precio de policy, la cotización suelta además pide más de lo que el mismo
adicional le sube al precio del servicio. El ejemplo versionado reproduce la forma del problema con datos inventados
(tabla de abajo).

**La decisión.** Un adicional que amplía una cotización se declara como **la cotización congelada del servicio con
el adicional adentro**, y su precio, su costo y su margen son la diferencia entre esa cotización y la base.

- `compose increment --input <con el adicional> --base <base>` verifica los dos artefactos por replay y emite la
  lectura `pricing-v3-quote-increment/1`: por período comparado y en total, `base`, `withAddOn` e `increment` (neto,
  costo, margen y tasa de margen), `costByComponentKind`, `netIncrementPerPeriod`, `changed` (líneas, herramientas y
  costos de terceros) y `versions`. Sale con 3. Es interna: trae costo y margen.
- `compose document --increment <clave>=<con el adicional>` imprime ese adicional como una opción del documento de
  la base. Comparte con `--option` el límite de ocho y el bloque `options` del brief; una clave no se usa en las
  dos. El precio impreso es lo que el adicional le suma al neto de un período. `source` registra
  `option<N>Basis: "increment"`. El cliente ve un precio, nunca el costo ni el margen del incremento.
- `--option` sigue siendo lo correcto para un adicional que es sólo una persona nueva o un trabajo aparte: ahí lo
  que se cobra por línea sí es suyo. Un adicional mixto, que amplía a personas de la base y además trae una persona
  nueva, va como incremento: la cotización con el adicional puede tener líneas que la base no tiene.

**Por qué una diferencia de dos cotizaciones y no un interruptor que omita los costos por línea.**

- *Un interruptor en la cotización del adicional* («no cobres en esta línea lo que se cobra por línea») habría
  puesto en la demanda una decisión de costo que hoy toma el catálogo. Una cotización así ya no se sostiene sola: su
  costo es correcto sólo si existe otra cotización que ya cobró eso, y nada en ella la nombra ni lo comprueba.
  Exige además decidir, fuera del kernel, qué costos son «por línea»: el fee de plataforma lo es, la parte de las
  herramientas base también, y esa lista tendría que seguir al catálogo a mano.
- *La diferencia* no necesita esa lista. En la cotización con el adicional cada persona es una sola línea con la
  dedicación sumada, así que el kernel cobra una vez lo que se cobra una vez, con las reglas de siempre. La resta es
  de importes ya congelados: no hay aritmética nueva de precios, y cada una de las dos cotizaciones se verifica por
  replay y se explica por su cuenta.
- La diferencia es además comprobable: cuando el adicional no trae líneas nuevas, `costByComponentKind` muestra que
  la clase que se cobra por línea no se movió, y las reglas de comparabilidad rechazan el par cuando la resta no
  significaría el adicional.

**Las reglas de comparabilidad y por qué existe cada una.** Dos cotizaciones se restan sólo cuando la diferencia
puede significar el adicional y nada más. Si no, la lectura se rechaza con el código de la regla; nunca se aproxima,
porque una resta entre cotizaciones que no son comparables da una cifra con forma de margen que no lo es.

| Código | Qué exige | Por qué existe |
| --- | --- | --- |
| `QUOTE_INCREMENT_REQUIRES_CALCULATED_QUOTES` | Las dos calculadas | Una cotización bloqueada no tiene importes que restar |
| `QUOTE_INCREMENT_CONTEXT_DIFFERS` | La misma moneda, oferta, cuenta, tratamiento de impuesto, forma del engagement, unidad comercial, código de engagement, país de mercado, fecha de cotización, modo y declaración de contingencia | Cada uno de esos datos elige un precio o un costo. Si difieren, son dos cotizaciones de cosas distintas. La fecha entra por la misma razón que las versiones: los registros del catálogo rigen por fecha |
| `QUOTE_INCREMENT_VERSIONS_DIFFER` | El mismo catálogo, la misma policy de recursos y el mismo catálogo de créditos, por versión y por contenido | Entre dos versiones, la diferencia traería un cambio de precio dentro del costo del adicional. Se compara también el contenido porque un archivo editado bajo la misma versión es otra fuente |
| `QUOTE_INCREMENT_PERIODS_NOT_COMPARABLE` | Los mismos períodos; o un solo período representativo, sólo si la base es igual en todos los suyos (neto, costo y líneas) y ese período no cobra nada una sola vez. En las dos cotizaciones los períodos suman sus totales | Un período representativo vale por todos los de la base, y no puede hacerlo si la base cambia de un mes a otro. Una puesta en marcha no es un costo de cada período |
| `QUOTE_INCREMENT_BASE_NOT_CONTAINED` | Cada línea de la base sigue en la otra con el mismo perfil, país y modo de asignación, la misma base de precio y de costo (policy de asignación, policy de precio, kit, registro de costo y equipo), sus elecciones de kit, la misma unidad de dedicación y al menos las mismas personas y dedicación; y siguen ahí cada costo de terceros y cada herramienta de la base | Si a la base le falta o le cambia algo dentro de la otra, la diferencia mezcla el adicional con un cambio de la base |
| `QUOTE_INCREMENT_NET_NOT_POSITIVE` | El neto crece en cada período comparado | Un período en que la cotización con el adicional no vale más que la base no tiene adicional que valorar |

Dos cosas no se comparan, a propósito. Lo que el acuerdo dice del precio (descuentos, netos pactados): es donde se
escribe el precio del adicional. Y el costo: un adicional puede no agregar ninguno, y la lectura dice lo que
encontró. En un período representativo el incremento es por período y no se multiplica por ningún número de
períodos: ningún dato de entrada dice en cuántos corre el adicional.

En `compose document --increment`, un par que no es comparable se rechaza con su propio código `QUOTE_INCREMENT_*`,
con `option: "increment"` y cada ruta bajo `options.<n>.`. `QUOTE_DOCUMENT_OPTION_INVALID` cubre sólo las reglas
propias del documento sobre un incremento ya comparable: que el adicional sume lo mismo en cada período comparado,
que no traiga un costo que el cliente paga directo, que el importe se pueda escribir, que no repita otra opción y
que no haya más de ocho. En `compose increment`, `option` es `base` sólo cuando lo único que falla es la base; en
los demás casos es `input`, porque la que se arma para ampliar la base es la cotización con el adicional.

**Reglas para agentes.**

- **NUNCA** informar el margen de un adicional que amplía a personas de la base desde su cotización suelta: se lee
  con `compose increment`.
- **NUNCA** restar a mano dos cotizaciones que la lectura rechazó, ni aproximar una cifra.
- **NUNCA** quitar o cambiar algo de la base en la cotización con el adicional para que la resta pase.
- **NUNCA** mostrarle la lectura al cliente: es interna. Al cliente va el documento, con un precio.
- **SIEMPRE** poner la dedicación que se le suma a una persona de la base en la línea que esa persona ya tiene.
- **SIEMPRE** decir de qué dos artefactos sale la cifra. La lectura informa; el adicional y su precio los decide el
  operador.

**Medido el 2026-10-11 (cierre).** Ejemplo versionado `managed-addon-increment` en
[`data/pricing/v3-operating/`](../../data/pricing/v3-operating/README.md): un servicio gestionado de tres meses con
un fee pactado, y un adicional de ocho puntos más de dedicación de una de sus personas, pactado en 300.000 al mes.
Motor `1.3.0`, catálogo v10, policy v11 y créditos v1. Importes en CLP, por mes; el comprador es inventado.

| | Neto | Costo | Margen |
| --- | --- | --- | --- |
| Base | 5.650.000 | 3.076.309 | 45,55 % |
| Base con el adicional | 5.950.000 | 3.231.405 | 45,69 % |
| El adicional cotizado solo | 300.000 | 204.096 | 31,97 % |
| El adicional como incremento | 300.000 | 155.096 | 48,30 % |

- Los 49.000 de diferencia entre los dos costos del adicional son el fee de plataforma de una línea. En
  `costByComponentKind` el fee de plataforma tiene incremento cero; el incremento está en las personas (456.000 en
  los tres meses) y en las herramientas (9.288).
- La lectura vuelta a emitir es idéntica al versionado `managed-addon-increment.increment.json`, y los datos del
  documento, a `managed-addon-increment.document.json`. El documento imprime 300.000 «al mes» con `--increment` y
  con `--option`.
- Las mismas tres demandas sin su neto pactado, cotizadas con `--current` (no versionadas): la cotización suelta
  pide 380.000 al mes y el incremento es de 280.000 al mes.
- El documento del ejemplo, generado con la plantilla, tiene cuatro páginas.
- `pnpm pricing:v3:test`: 28 archivos y 1.445 pruebas. `replay` de los 26 artefactos versionados bajo
  `data/pricing/**`: todos `verified: true`.

Evidencia fechada. Los artefactos que se agregaron a la carpeta de datos son los tres de `managed-addon-increment`.

## Delta 2026-10-11 (cierre) — una cotización no es un contrato

Decisión del CEO, el mismo cierre. **La fecha de inicio del servicio y la duración del contrato no son datos de
entrada del cotizador, y no lo serán.** Son materia del contrato: no mueven ningún costo, precio ni impuesto.

- **Qué cambia.** Nada en el código ni en un contrato de entrada: ninguno tenía una clave para ellas. Cambia cómo se
  nombran. Este ADR y los documentos del cotizador las listaban entre lo «abierto», lo «no modelado» o lo que
  «todavía no se puede», como si alguien las debiera. Desde este delta se leen como fuera del cotizador por
  decisión, y las listas de pendientes dejaron de traerlas; cada lugar corregido lleva una nota fechada.
- **Qué no cambia.** Lo que cada lectura supone de su calendario se sigue diciendo. Una cotización tiene períodos,
  fechados desde su fecha de cotización, y no un plazo. `compose commitments` conoce los períodos cotizados y no la
  duración del acuerdo, y por eso se pide a propósito para trabajos acotados. El incremento de un período
  representativo no se multiplica por un número de meses.
- **En el documento del cliente.** Un texto del brief se escribe cuando le dice al cliente algo que necesita. El
  documento no declara lo obvio: no se escribe quién define la fecha de inicio.
- **Por qué.** Una cotización responde cuánto cuesta y cuánto vale un servicio por período. Cuándo empieza y cuánto
  dura el acuerdo se pactan después, en otro documento, y ninguna de las dos respuestas cambia un importe de la
  cotización. Modelarlas habría agregado al pedido dos datos que el cálculo no usa.

**Lo que sigue sin modelarse** (lo único que se lista como pendiente de este frente): un costo de puesta en marcha
de un servicio gestionado en el catálogo, por lo que su cotización no tiene una fila de puesta en marcha que
bonificar (`MANAGED_SERVICE_SETUP_NOT_PARAMETRIC`); la validación de las condiciones con que un proveedor permite
compartir un asiento, que queda fuera del cotizador; el reparto en persona y kit como forma del documento; y número
de cotización, versiones, QR, firmas y aprobación, que pertenecen al cotizador de Greenhouse (llevar este diseño
allá es el paso acordado y **no ha empezado**).

**Reglas para agentes.**

- **NUNCA** pedir la fecha de inicio del servicio ni la duración del contrato como datos de una cotización, ni
  presentarlas como un pendiente del cotizador.
- **NUNCA** escribir en el documento del cliente quién define la fecha de inicio.
- **SIEMPRE** decir lo que una lectura supone de su calendario cuando la cifra depende de él.

## Delta 2026-10-11 — un precio por todo el trabajo (`agreed_total`)

Después del cierre de ese día se cotizaron tres negocios reales más, de tipos que no se habían probado: una persona
vendida por dedicación, un proyecto web de alcance cerrado y un programa de tres meses en una licitación. Tres
agentes sin contexto, con sólo la skill y el manual, reprodujeron el precio pactado y produjeron el documento, pero
tuvieron que leer código para lograrlo. Este delta y los tres que siguen registran lo que se decidió a partir de
eso. Ninguno toca un contrato del kernel; todos los artefactos congelados se reproducen byte a byte.

**El problema.** Dos de los tres negocios tenían un precio por todo el trabajo: un monto por el programa completo,
un monto por el proyecto. El único ajuste de precio pactado era `agreed_net`, que es un neto por período y por clase
de cobro. Quien cotizaba tenía que dividir el total a mano entre meses y entre fee y puesta en marcha, y esa
división tenía tres defectos: nadie la registraba, no había una regla para hacerla, y el impuesto de la cotización
—que el kernel redondea período por período— podía quedar a una unidad del impuesto de la tasa sobre el total que el
cliente tiene en la cabeza.

**Decisión.**

1. **Un ajuste del brief, no del kernel.** `brief.adjustments` admite `{ adjustmentId, kind: "agreed_total",
   amount, lineIds, reason }`: el neto de las líneas nombradas en todo el plazo, todos los períodos y todas las
   clases de cobro juntas. `lineIds` puede nombrar además costos de terceros refacturados, que así entran al precio.
2. **Se resuelve a los ajustes que el kernel ya tiene.** La resolución cotiza la demanda una vez sin el acuerdo, lee
   el neto de política de cada grupo (un período y una clase de cobro) y reparte el total en proporción. A cada
   período le llega un `agreed_net` por clase, llamado `<adjustmentId>:<clase>`. El kernel no sabe que existe un
   total.
3. **El reparto se hace en una unidad en la que el impuesto es exacto.** Con un impuesto exclusivo de tasa `p/q` en
   su mínima expresión, cada parte es un múltiplo de `q` unidades mínimas de la moneda (100 pesos a 19 %), se corta
   hacia abajo, y el último grupo con precio toma el resto. El impuesto de cada parte no tiene nada que redondear;
   sólo el último período redondea, una vez, y la suma es el impuesto de la tasa sobre el total.
4. **Corre cuando los inputs son definitivos.** Una composición agrega el costo de sus herramientas después de
   resolver; el reparto se hace después de eso, en la orquestación compartida por los dos carriles.
5. **Queda congelado.** Lo declarado, el neto de política leído, la unidad con su motivo y el reparto viajan con la
   resolución (`agreedTotals`) y el resumen los publica. Un replay hace las mismas dos pasadas.
6. **El piso no se mueve.** Se sigue juzgando por fila, sobre el neto final.

**Por qué un ajuste del brief que se resuelve a los del kernel, y no un cambio del kernel.** El kernel calcula un
período por vez: cada entrada que recibe es un mes. Un total sobre el plazo no es un dato de ningún período, y
dárselo habría exigido un contrato y un motor nuevos para expresar algo que `agreed_net` ya expresa, período por
período, cuando alguien hace la división. La división es una decisión de resolución, igual que elegir el registro
de un factor: se hace antes del kernel, se congela y se reproduce. Así todas las lecturas (resumen, `assess`,
documento, incremento) siguen leyendo netos acordados y ninguna tuvo que aprender una clase nueva de fila.

**Por qué la unidad exacta para el impuesto.** Un precio pactado como total tiene un impuesto que el cliente calcula
de una sola manera: la tasa por el total. Repartido a la unidad mínima de la moneda, el mismo total puede dar otra
cifra, porque cada período redondea el suyo. Serían dos impuestos para una cotización. La unidad `q` evita el
redondeo en vez de corregirlo después. Vale para una cotización cuyas filas están todas dentro de un solo total; con
filas fuera de él, o con varios totales, esos períodos redondean como siempre, y lo dice `distributionUnitBasis`.
Cuando la unidad exacta dejaría sin parte a un grupo que tiene precio, el reparto vuelve a la unidad mínima
(`currency_precision_fallback`): no se regala un mes para que un impuesto cuadre.

**Alternativas descartadas.**

- *Una clase nueva de ajuste en el kernel (contrato 1.5.0).* Un contrato y un motor más para algo que el kernel ya
  sabe aplicar; y el kernel tendría que conocer el plazo, que no conoce.
- *Seguir dividiendo a mano y documentar cómo.* Es lo que había: sin regla, sin registro y con el impuesto a una
  unidad.
- *Repartir en partes iguales entre los períodos.* Ignora que los períodos no valen lo mismo (una puesta en marcha
  en el primero, un costo de terceros en uno solo) y dejaría filas bajo su piso sin motivo.
- *Repartir siempre a la unidad mínima y aceptar la diferencia de impuesto.* Deja dos cifras posibles para el mismo
  precio pactado.
- *Cambiar el redondeo del impuesto del kernel para calcularlo una vez sobre el plazo.* Mueve un contrato ya usado y
  el impuesto de todas las cotizaciones congeladas.
- *Un `agreed_net` con una clase `all`.* Seguiría siendo por período: no resuelve el total.

**Medido el 2026-10-11** (con `--current`, catálogo v11 y policy v11; las demandas con el ajuste están fuera de la
carpeta de datos).

- Un programa SEO/AEO de tres meses, On-Demand, con IVA de 19 % de ejemplo: precio de política 10.110.000; pactado
  9.500.000. Reparto: 3.166.600, 3.166.600 y 3.166.800, unidad 100, `tax_exact`. Impuesto 1.805.000, que es 19 % de
  9.500.000; total 11.305.000; margen 0,5651; ninguna fila marcada.
- `designer-on-demand.demand.json` con un total de 2.800.000 sobre su línea: reparto 2.487.804 (mensual) y 312.196
  (puesta en marcha), en proporción a 2.550.000 y 320.000; sin impuesto resuelto, `currency_precision`.
- `managed-on-demand-third-party.demand.json` con un total de 20.500.000 sobre sus seis líneas y sus tres costos
  refacturados (política 21.033.333): trabajo propio 11.081.695 y terceros 9.418.305. La fila de medios, que se cobra
  al costo y tiene su piso en el costo, queda marcada: le faltan 84.522. Con el total sólo sobre las seis líneas, en
  11.000.000, ninguna fila queda marcada.

**Reglas para agentes.**

- **SIEMPRE** declarar un precio pactado por todo el trabajo como `agreed_total`; **NUNCA** dividirlo a mano entre
  períodos o clases de cobro.
- **NUNCA** usar `agreed_total` sin `per` para un valor mensual: ahí `amount` es todo el plazo. (Corregido al
  cierre del 2026-10-11: la regla decía «ese es `agreed_net`». Desde ese cierre un valor mensual que incluye la
  puesta en marcha es `agreed_total` con `per: "period"`, y `agreed_net` queda para un valor mensual con la puesta
  en marcha aparte: [delta](#delta-2026-10-11-cierre--un-precio-todo-incluido-por-período-per-de-agreed_total).)
- **SIEMPRE** leer `agreedTotals` después de cotizar: el último período puede diferir de los demás, y una rebaja
  alcanza a todo lo nombrado, también a un costo que se cobra al costo.
- Un total bajo el precio de política que deja una fila marcada es una excepción al piso: la decide el CEO.

## Delta 2026-10-11 — `compose assess` juzga contra el piso de la propia oferta

**El problema.** `compose assess` comparaba el margen de la cotización con un 40 % objetivo y un 35 % de piso
genéricos. Este ADR los llamó siempre «propuestas genéricas sin aprobar»; aun así estaban en la salida, junto a un
booleano (`belowProposedFloor`). Una persona por dedicación cotizada al objetivo de su propia oferta, 30 %, salía
«bajo el piso propuesto»; un servicio gestionado bajo su piso de 45 % pero sobre 35 % salía sin esa marca. La lectura
daba dos veredictos, y el que estaba primero era el que nadie había aprobado.

**Decisión.** La comparación genérica se retira: `proposedTarget`, `proposedFloor`, `belowProposedFloor` y
`proposedFloorReadOn` dejan de existir. `margin` informa con qué se puso precio y contra qué se juzga:

- `pricingPolicies[]`: la regla de precio de cada línea, tal como la resolución la enlazó y la cotización la
  congeló. Una entrada por regla distinta, con oferta, método, `rate` (el margen objetivo en `target_margin`), base,
  `minimumMargin`, estado de la fuente y las líneas.
- `thirdPartyPolicies[]`, sólo con costos refacturados: la regla de cada categoría, con su piso.
- `belowPolicyFloor`: `true` sólo si el kernel marcó al menos una fila. Nunca se lee sobre un margen de toda la
  cotización.
- `modeledRate`, `ownWorkRate` y `policyFloor` quedan como estaban.

**Por qué.** Los pisos son de cada oferta y los decide el CEO; el veredicto de piso es del kernel, por fila. Una
referencia genérica en la misma lectura competía con las dos cosas. Donde un pasaje anterior de este ADR describe el
40/35 como vigente, lleva una nota fechada.

**Alternativas descartadas.**

- *Dejar el 40/35 con una advertencia más fuerte.* Ya tenía la advertencia, y se leía igual.
- *Reemplazar las constantes por el piso más alto de las ofertas.* Seguiría siendo un piso que no es el de la
  cotización.
- *Un veredicto de toda la cotización ponderando los pisos de sus filas.* El piso se juzga por fila; un promedio
  esconde la fila que lo incumple.

**Medido.** `designer-on-demand.artifact.json`: `pricingPolicies` trae `talent-assurance-staffing`, `target_margin`
0,30, `minimumMargin` 0,25, y `belowPolicyFloor` es `false`. `managed-on-demand-third-party.artifact.json`:
`creative-managed-service`, 0,45 y 0,45 para sus seis líneas; tres reglas de terceros; `belowPolicyFloor` `false`.

**Regla para agentes.** **NUNCA** citar 40 % o 35 % como objetivo o piso de nada. El piso que se informa es el de la
oferta de la cotización, y la excepción bajo él es del CEO.

## Delta 2026-10-11 — diagnósticos que nombran su causa

**El problema.** Varios bloqueos decían que algo faltaba sin decir qué. Una demanda fechada un día antes del
catálogo devolvía una selección faltante por cada línea, kit, factor y política, y ninguna era la causa. Una
herramienta sin asignación no decía qué precios se podían nombrar. La evidencia de una herramienta del cliente
fallaba con un solo código para cuatro motivos distintos.

**Decisión.** Un diagnóstico dice la regla que falla y, donde hay una lista cerrada, lo que se admite; nunca repite
el dato recibido.

- `QUOTE_DATE_BEFORE_CATALOG` y `QUOTE_DATE_BEFORE_OFFER_POLICY`: la fecha anterior a los datos se dice una vez, con
  la fecha a la que hay que moverse. Una selección cuyo registro empieza después lleva esa fecha en `detail`.
- `detail` en `CLIENT_ACCESS_EVIDENCE_REQUIRED` y en `RESOURCE_POLICY_NOT_EFFECTIVE`; `candidates` en
  `RESOURCE_ALLOCATION_REQUIRED` y `RESOURCE_PRICE_SELECTION_REQUIRED`.
- En un rechazo: `allowed` para una opción de lista cerrada, y `limit`, `allowed` o `expected` en cada ubicación de
  un schema.
- Cuando la resolución no construye ningún período, la composición ya no reporta cada entrada de la demanda como no
  usada.

**Por qué no más.** La frontera de los errores no se mueve: un reporte nunca lleva un valor, una ruta de archivo ni
el mensaje de un validador, porque una demanda trae costos y nombres. Lo que se agrega son constantes del contrato y
fechas de vigencia del catálogo, que no son contenido del llamador.

**Alternativa descartada.** *Devolver el mensaje del validador.* Puede citar el valor recibido.

**Regla que queda.** Una cotización no puede llevar una fecha anterior a los datos que usa: se corrige la fecha, no
la vigencia de un registro.

## Delta 2026-10-11 — el documento imprime un precio de programa o de proyecto

**El problema.** El documento plegaba cada concepto por meses: «3 meses» al valor de uno. Para un programa o un
proyecto con un solo precio eso imprime una cuenta que nadie pactó; y con un `agreed_total`, cuyo último período
toma el resto del reparto, imprimía dos tramos de un precio que el cliente conoce como uno. Además el brief obligaba
a llenar dos textos (`buyer.unit`, `schedule.note`) que muchas veces no tenían nada que decir, y terminaban con
relleno: el nombre del cliente repetido, o «desde el inicio acordado».

**Decisión.**

1. **`combine`.** El brief puede listar claves para imprimirlas como una línea: cantidad 1 de la unidad que escribe
   («programa», «proyecto», «servicio»), sin valor unitario, y por neto la suma exacta que la cotización congeló
   para esas claves en todo el plazo. Una clave va en una sola combinación y entonces no tiene línea propia; una
   clave bonificada por completo no se combina. Las líneas suman el mismo neto con o sin combinaciones.
2. **`cover.netLabel`.** El rótulo del neto de la portada es un texto del brief cuando el de la plantilla no
   corresponde.
3. **`buyer.unit` y `schedule.note` son optativos.** El andamio no les deja hueco.
4. **Cada hito con su impuesto.** Con un impuesto exclusivo, cada hito del calendario de pagos lleva su neto, su
   parte del impuesto congelado y su total; las partes suman el impuesto y el total de la cotización.
5. **La tolerancia del impuesto es por período de la cotización.** Los datos llevan `taxPeriods`, y el impuesto
   congelado se acepta a no más de una unidad mínima por período del impuesto de la tasa sobre el neto.

**Por qué.** `combine` es presentación: nombra claves y textos, y la cifra sigue saliendo de la cotización. La regla
de este ADR —toda cifra del documento sale de la cotización congelada— no se movió. La tolerancia se contaba antes
por las cantidades de las líneas; con `combine`, tres meses pasan a ser una línea de cantidad 1 y la misma
cotización habría dejado de aceptarse. Cuántos períodos redondearon el impuesto es un hecho de la cotización, no de
cómo se imprime.

**Alternativas descartadas.**

- *Permitir cantidad y unidad en `lines.<clave>`.* Una clave sola no junta el fee con la puesta en marcha ni con un
  costo de terceros, que es lo que un precio de proyecto necesita.
- *Volver a dividir el total en meses iguales para imprimirlo.* El documento imprimiría netos que la cotización no
  tiene.
- *Dejar que el brief escriba el precio del programa.* Rompe la regla de la que depende todo el documento.
- *Mantener los dos textos obligatorios.* Produce relleno, y el relleno sobre la fecha de inicio contradice que una
  cotización no es un contrato.

**Medido.** `managed-addon-increment.artifact.json` con el brief `programme-price`: una línea «1 programa» de
16.950.000; `taxAmount` 3.220.500 y `taxPeriods` 3; hitos de 8.480.000 + 1.611.200 = 10.091.200 y 8.470.000 +
1.609.300 = 10.079.300. Generado: cuatro páginas. Los cinco briefs de ejemplo anteriores dejaron de declarar
`schedule.note` y la condición «Plazo e inicio».

**Reglas para agentes.**

- **SIEMPRE** imprimir con `combine` un precio que se pactó por todo el trabajo.
- **NUNCA** llenar un texto optativo con relleno, ni escribir quién define la fecha de inicio.
- Lo que el documento no tiene como dato —vigencia de la oferta, forma y plazo de pago, lo que el cliente debe
  aportar— se escribe en las condiciones.

**Todavía no se modela.** Una oferta propia para proyectos únicos: hoy se cotiza con una oferta de servicio
gestionado vendida On-Demand a un solo precio (`PROJECT_OFFER_NOT_MODELLED`). Un costo de puesta en marcha de un
servicio gestionado (`MANAGED_SERVICE_SETUP_NOT_PARAMETRIC`). El costo medido detrás de las provisiones «TEST ONLY»
(`ASSURANCE_OPERATIONS_ONBOARDING_COSTS`). Las herramientas cuyo precio vigente no tiene importe. El precio techo del
comprador y la lógica de puntaje de una licitación. El costo financiero de un pago tardío. El panel de Greenhouse e
Insights como recursos con costo. Y lo que ya se listaba: número de cotización, versiones, QR, firmas y aprobación son del
cotizador de Greenhouse, y adoptarlos es el paso siguiente acordado, **sin empezar**. **Abierto y del CEO:** si el
fee de plataforma, que hoy se cobra entero por línea, debe prorratearse por dedicación (`PLATFORM_FEE_PER_LINE`).

## Delta 2026-10-11 (cierre) — un precio todo incluido por período (`per` de `agreed_total`)

Tres agentes nuevos repitieron los tres negocios reales con la skill y el manual reescritos, sin abrir el código.
Ninguno lo abrió, y cada uno reprodujo el precio pactado y generó su documento. Lo que todavía encontraron produjo
este delta y el siguiente, y uno en la
[decisión de composición](GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11-cierre--la-evidencia-de-una-asignación-es-un-dato-declarado).
Ninguno toca un contrato del kernel; no hay catálogo ni policy nuevos; los 36 artefactos congelados se reproducen
igual.

**El problema.** Una persona vendida de forma continua se pacta como «tanto al mes, con todo adentro». `agreed_net`
mensual no cubre la puesta en marcha, y `agreed_total` era el precio de todo el plazo. Para que el primer mes
valiera lo mismo que los demás había que declarar la puesta en marcha bonificada, y la cotización afirmaba una
cortesía que nadie dio.

**Decisión.** `agreed_total` admite `per`: `term` (también cuando falta) o `period`. Con `period`, `amount` es el
neto de lo nombrado en cada período en que se cobra, con todas sus clases de cobro juntas. La resolución hace el
mismo reparto de siempre una vez por período; el kernel sigue recibiendo un `agreed_net` por período y clase. El
resumen informa `per` y `agreedNetOverTerm`, y lee la diferencia contra el precio de política sobre el plazo. El
documento lo imprime con `combine` y `per: "period"`: meses al valor de uno.

**Por qué una opción de `agreed_total` y no un tercer ajuste.** Es la misma declaración —un precio por todo lo
nombrado, todas las clases juntas— con otra base. Comparte la regla de no superponerse, el reparto proporcional, la
unidad que cuida el impuesto y los mismos bloqueos. Un ajuste nuevo habría duplicado todo eso para cambiar un
divisor.

**Por qué la puesta en marcha lleva su parte y no se bonifica.** Lo que se vendió es un valor mensual que la
incluye, no un regalo. Bonificarla diría en el artefacto, en el piso y en el documento algo que no pasó: una fila en
cero, marcada bajo su piso por su neto mínimo completo y, si se imprime, una cortesía con un valor de referencia.
Repartido, cada fila conserva un precio y el piso se juzga contra lo que de verdad se cobra.

**Lo que hay que saber.** El mes de la puesta en marcha reparte el mismo importe entre dos filas, así que las dos
reciben menos que su precio de política y cualquiera puede quedar bajo su piso aunque el plazo quede sobre la
política. Es un incumplimiento real por fila, no un defecto del reparto.

**Alternativas descartadas.**

- *Un tercer ajuste propio.* Duplica reglas, bloqueos y lecturas de `agreed_total` para cambiar la base.
- *`agreed_net` con una clase `all`.* Mezcla en un ajuste por clase lo que es un precio de todas las clases.
- *`agreed_net` mensual más la puesta en marcha bonificada.* Es lo que había: declara una cortesía falsa.
- *`agreed_total` por plazo, multiplicando a mano el valor mensual.* Los períodos dejan de ser iguales: el reparto
  es proporcional y el último toma el resto.
- *Repartir la puesta en marcha entre todos los meses.* Mueve un cobro del mes en que ocurre a meses en que no hay
  fila que lo lleve.

**Medido el 2026-10-11** (con `--current`, sobre una copia de `designer-three-months-iva.demand.json` vendida
On-Going; política 7.250.000). Con 2.450.000 por período: tres períodos de 2.450.000, neto 7.350.000, impuesto
1.396.500; primer mes 2.177.700 y 272.300; margen 0,3104; ninguna fila marcada. Con 2.420.000: el plazo queda
10.000 sobre la política y la fila mensual del primer mes sale marcada, 12.506 bajo su neto mínimo.

**Reglas para agentes.**

- **SIEMPRE** elegir entre las tres maneras por cómo se pactó: por todo el trabajo, `agreed_total`; por mes con
  todo incluido, `agreed_total` con `per: "period"`; por mes con la puesta en marcha aparte, `agreed_net`.
- **NUNCA** bonificar la puesta en marcha para que un valor mensual cierre, ni cambiar la manera de declarar un
  precio para que una fila no salga marcada.
- **SIEMPRE** mirar las filas del mes de la puesta en marcha y llevarle al CEO la que quede bajo su piso.

## Delta 2026-10-11 (cierre) — el assessment se pliega y el andamio escribe lo que la composición lee

**El problema.** Dos cosas hacían leer mal una cotización correcta. `compose assess` listaba cada brecha una vez
por mes: doce meses, doce copias, y nadie leía la lista. Y el andamio escribía en `work[].tasks` la receta del
perfil y pedía reemplazar los cupos `planned-*`, mientras la skill y el manual decían cosas distintas entre sí:
tres agentes, tres maneras de llenar los mismos dos campos.

**Decisión.**

1. `compose assess` trae una entrada por brecha. Una brecha de un período se levanta bajo una ruta sin él
   (`tools.<toolId>`, `result.lines.<lineId>`) y las que sólo difieren por período son una, con `periodIds`.
   `gapOccurrences` conserva la cuenta sin plegar. `USER_ASSIGNMENT_REQUIRED` es una sola brecha por cotización.
2. El resumen agrega `marginFloor.netShortOfFloor`, el total que falta sobre todas las filas marcadas: las filas
   plegadas traen la cifra de un mes, y sumarlas a mano daba menos.
3. El andamio deja `work[].tasks` vacío. La composición aplica siempre la receta del perfil y le suma esas tareas:
   son las del trabajo más allá de la receta. La receta va en la pregunta de la línea (`profileTasks`).
4. Un cupo `planned-<lineId>-<n>` se queda mientras nadie esté asignado y se reemplaza por un id anónimo estable
   sólo cuando hay una persona específica asignada. La pregunta del andamio, la skill y el manual lo dicen igual.
5. El andamio lista en `candidates` sólo los precios que la composición aceptaría ese día, y los demás en
   `unavailablePrices` con el diagnóstico que daría nombrarlos. Es una sola lectura, compartida con la composición.

**Por qué las rutas pierden el período.** Plegar exige que dos entradas sean la misma salvo el mes; con el período
dentro de la ruta nunca lo eran. El período pasa a ser un dato de la entrada.

**Por qué el cupo se queda.** Un id inventado calla la brecha sin que nadie haya sido asignado: la cotización
afirmaría una asignación que no existe. El cupo dice la verdad y la brecha la informa una vez.

**Alternativas descartadas.**

- *Plegar sólo en una vista y dejar `gaps` como estaba.* Dos listas para la misma lectura, y la larga seguiría
  siendo la que se cita.
- *Quitar `gapOccurrences`.* Se pierde cuántas veces hay que resolver cada cosa.
- *Seguir escribiendo la receta en `tasks`.* No cambia el cálculo y enseña que borrar una tarea la quita.
- *Exigir un id anónimo en vez del cupo.* Obliga a inventar una asignación.
- *Bloquear una cotización con cupos.* Cotizar antes de asignar es el caso normal.

**Abierto.** Los bloqueos de una cotización que no calculó siguen saliendo una vez por período
(`BLOCKERS_REPEATED_PER_PERIOD`). Los `*.assessment.json` versionados son fotos anteriores a este cambio y no se
regeneran (`ASSESSMENT_SNAPSHOTS_PREDATE_FOLDED_READING`). Un solo documento con dos alternativas de una misma
oferta no existe: son dos cotizaciones y dos documentos (`QUOTE_DOCUMENT_ALTERNATIVES_NOT_MODELLED`).

**Medido el 2026-10-11.** `compose assess` de `managed-addon-increment.artifact.json` (tres meses): 16 entradas y
`gapOccurrences` 36. `pnpm pricing:v3:test`: 33 archivos y 1640 pruebas.

**Reglas para agentes.**

- **SIEMPRE** leer el total bajo el piso en `marginFloor.netShortOfFloor`; **NUNCA** sumar las filas plegadas.
- **NUNCA** copiar la receta del perfil a `work[].tasks` ni reemplazar un cupo por un id inventado.

## Evidencia y rutas de operación

- [Manual para agentes](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).
- [Datos, casos y fuentes](../../data/pricing/v3-operating/README.md).
- [Promoción al canon](../documentation/finance/cotizador-v3-promocion-canonica.md).
- [QA TASK-2022](../audits/commercial/2026-10-09-pricing-v3-operating-workflow.md): 213 pruebas V2/V3, 26 operaciones
  CLI y replay de artifacts anteriores, más tipos/lint y guardas de mantenimiento/redacción. Esta evidencia es local.
