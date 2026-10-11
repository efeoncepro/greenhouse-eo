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
| Aritmética comercial: costo, markup/margen, descuento, neto pactado, FX, redondeo contable y redondeo comercial, por contrato de entrada (`1.0.0`, `1.1.0` y `1.2.0`); registro cerrado de motores `PRICING_V3_ENGINES` | `src/lib/finance/pricing-v3/calculate.ts` y `schemas.ts` |
| Catálogo monetario (incluida la regla de redondeo por moneda), resolución de perfiles/variantes y calendario, y elección del contrato de entrada que se emite al kernel | `src/lib/finance/pricing-v3/catalog/` |
| Selección de recursos por trabajo y atribución a snapshots | `resources/composition.ts` y `composition-contracts.ts` |
| Presupuesto discreto de créditos y caducidad | `resources/credit-budget.ts` |
| Discovery, scaffold, portfolio y plan | `resources/operating.ts` |
| Preparación comercial y preview allowlisted | `resources/readiness.ts` |
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
  `catalog.review-v8.json` con la oferta SEO/AEO (último delta).
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
nunca un piso. Una cotización con fecha anterior al 2026-10-11, las versiones anteriores del catálogo y los artefactos
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

## Delta 2026-10-11 — presentar persona y kit de herramientas (`compose split`)

**Contexto.** En la venta de una persona por dedicación, las herramientas y provisiones son cerca de un quinto del
costo de un perfil creativo. Con todo dentro de un solo fee, el precio se compara mal con una contratación directa.
El operador pidió una recomendación y aceptó mostrar las herramientas especializadas como un ítem propio.

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

**Abierto.** Si el kit de un servicio gestionado de varias líneas debe redondearse una vez por periodo y no por
fila; si el redondeo del kit debe ser hacia arriba cuando objetivo y piso coinciden; una vista del reparto apta
para el cliente.

## Evidencia y rutas de operación

- [Manual para agentes](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).
- [Datos, casos y fuentes](../../data/pricing/v3-operating/README.md).
- [Promoción al canon](../documentation/finance/cotizador-v3-promocion-canonica.md).
- [QA TASK-2022](../audits/commercial/2026-10-09-pricing-v3-operating-workflow.md): 213 pruebas V2/V3, 26 operaciones
  CLI y replay de artifacts anteriores, más tipos/lint y guardas de mantenimiento/redacción. Esta evidencia es local.
