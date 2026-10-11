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
| Aritmética comercial: costo, markup/margen, descuento, neto pactado, FX, redondeo contable y redondeo comercial, por contrato de entrada (`1.0.0` y `1.1.0`); registro cerrado de motores `PRICING_V3_ENGINES` | `src/lib/finance/pricing-v3/calculate.ts` y `schemas.ts` |
| Catálogo monetario (incluida la regla de redondeo por moneda), resolución de perfiles/variantes y calendario, y elección del contrato de entrada que se emite al kernel | `src/lib/finance/pricing-v3/catalog/` |
| Selección de recursos por trabajo y atribución a snapshots | `resources/composition.ts` y `composition-contracts.ts` |
| Presupuesto discreto de créditos y caducidad | `resources/credit-budget.ts` |
| Discovery, scaffold, portfolio y plan | `resources/operating.ts` |
| Preparación comercial y preview allowlisted | `resources/readiness.ts` |
| Resumen derivado de una composición: motor que calculó, ajustes y regla de redondeo aplicados, y líneas que el kernel marcó bajo su piso | `resources/summary.ts` |
| Registro cerrado de rechazos (dominio y adaptador) y el único detalle que pueden llevar | `errors.ts` |
| Digests, artefactos, replay con el motor registrado que firmó cada uno y mantenimiento local | `adapters/`; filesystem y hashing fuera de la aritmética |
| Primer consumer local | `scripts/commercial/pricing-v3.ts` |

Estas rutas son relativas a la raíz del repositorio. No incorporan DB, Next.js, identidad remota, Excel ni SDK
al núcleo; su extracción futura conserva contratos y pruebas. No se crea otro pricing engine por consumer.
La tabla refleja el estado tras el [ADR del motor 1.1](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md)
(2026-10-10): los dos contratos conviven en el mismo módulo, no hay un segundo kernel.

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
de TASK-2017, no política aprobada ni sustitución de guardrails de otra práctica.

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

**Verificación (2026-10-10, local).** `pnpm pricing:v3:test`: 12 archivos y 320 pruebas; ESLint y `pnpm typecheck`
limpios; todos los artefactos congelados en disco responden `verified: true` (la guarda cubre los versionados).
[Readback con cifras](../documentation/finance/cotizador-v3-superficie-implementada.md).

## Evidencia y rutas de operación

- [Manual para agentes](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).
- [Datos, casos y fuentes](../../data/pricing/v3-operating/README.md).
- [Promoción al canon](../documentation/finance/cotizador-v3-promocion-canonica.md).
- [QA TASK-2022](../audits/commercial/2026-10-09-pricing-v3-operating-workflow.md): 213 pruebas V2/V3, 26 operaciones
  CLI y replay de artifacts anteriores, más tipos/lint y guardas de mantenimiento/redacción. Esta evidencia es local.
