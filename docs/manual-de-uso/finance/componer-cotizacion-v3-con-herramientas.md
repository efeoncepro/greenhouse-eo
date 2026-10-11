# Cotizador V3: componer un pedido con herramientas

Estado: local ejecutable,2026-10-09; siempre simulación con revisión. No registra quote comercial ni inventario.
[Flujo operativo ampliado TASK-2022](operar-cotizador-v3-con-agentes.md) usa la policy sucesora para 32 perfiles y reparto/mantenimiento; este manual conserva los tres casos de baseline.
Un pedido nuevo se cotiza con las versiones vigentes (`--current`, [cómo](operar-cotizador-v3-con-agentes.md#versiones-vigentes)); los comandos de este manual nombran a propósito los archivos `review-v1`, para repetir esos tres casos tal como se calcularon.
[Contrato técnico](../../architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md),
[reglas funcionales](../../documentation/finance/cotizador-v3-seleccion-herramientas.md),
[policy y casos](../../../data/pricing/v3-composition/README.md).

## Del pedido al cálculo

1. Interpretar rol, tareas y alcance. Buscar perfil en el catálogo; conservar variante/seniority/ambos países.
   «Redactor SEO» puede ser Copywriter con tarea `seo-writing`; no sustituir su salario por SEO Specialist.
   La policy inicial cubre Copywriter, diseñador senior y SEO Specialist; otros perfiles requieren registrar
   sus reglas en una versión nueva y devuelven `PROFILE_RESOURCE_RULES_REQUIRED` hasta entonces.
2. Crear demanda `pricing-v3-composition-demand/1`: brief humano, trabajo por línea, slots de personas,
   tareas, IA seleccionada con motivo y herramientas del servicio. `commercialUnit` conserva rol/capacidad
   o servicio gestionado; un servicio usa esfuerzo interno sin imponer venta de horas.
3. Leer policy versionada. Notion/Microsoft 365 son obligatorios; tareas de redacción SEO exigen SEMrush;
   diseño visual exige Adobe; generación/upscale selecciona Higgsfield/Magnific. IA textual se elige
   explícitamente, sin cargar todos los proveedores ni elegir la variante barata por defecto.
4. Para cada herramienta monetaria y mes activo, declarar `toolId`, `priceId`, cantidad de unidades del
   precio, `serviceShare`, driver (`unit`, `totalUnits`, `allocatedUnits`) y razón. La cuota debe equivaler
   al driver, truncada a 18 decimales; el motor valida esa igualdad. Referencias históricas son opción de
   simulación explícita. No copiar precios/salarios ni porcentajes inventados al brief.
5. Declarar usuarios con IDs de slots, no nombres personales. Seat individual: cantidad = usuarios únicos
   que lo usan; paquete nominativo: `seatCapacity` suficiente. Claude requiere `contractSeatCount` que
   cumpla el mínimo observado en la referencia seleccionada. Estos datos son hipótesis/declaraciones,
   no prueba de acceso ni compra. La misma persona en dos funciones usa un seat repartido; dos personas
   distintas necesitan seats distintos. No reducir software por FTE.
6. Para créditos: cada línea declara demanda por proveedor/mes; un solo `creditBudget` declara saldo
   disponible/asignado, suscripción activa, fecha de compra/uso y permiso de repetir packs en simulación.
   El motor agrega demanda antes del planner. Cada mes necesita sus propios datos; no reserva saldo live
   ni supone carryover a otro cliente. Fechas pertenecen al mes presupuestado y no anteceden la cotización.
7. Moneda adicional exige configuración de moneda y `fxRecordIds` con par/fuente en catálogo. Magnific
   conserva EUR; baseline carece de EUR/FX EUR→USD y por eso bloquea su suma hasta actualizar catálogo.
   El catálogo operativo vigente sí lo tiene: `fx:EUR:USD`, un FX de cotización estimado que rige desde el
   2026-10-11 ([detalle](operar-cotizador-v3-con-agentes.md#cotizar-en-otra-moneda)). Es sólo para el costo de la
   herramienta: una cotización no se emite en EUR.
   Usar [mantenimiento](catalogo-v3-seleccion-y-actualizacion.md), nunca una tasa inventada inline.
8. Preparar, corregir diagnósticos, cotizar y guardar artefacto nuevo. Explain/replay leen sólo el artefacto,
   sin consultar una licencia o precio nuevo. La policy, catálogos, demanda y resultados quedan congelados.

```bash
pnpm --silent pricing:v3 compose prepare --catalog data/pricing/v3-catalog/catalog.review-v1.json --policy data/pricing/v3-composition/resources.review-v1.json --credits data/pricing/v3-resources/ai-credits.review-v1.json --input data/pricing/v3-composition/seo-writer.demand.json
pnpm --silent pricing:v3 compose quote --catalog data/pricing/v3-catalog/catalog.review-v1.json --policy data/pricing/v3-composition/resources.review-v1.json --credits data/pricing/v3-resources/ai-credits.review-v1.json --input data/pricing/v3-composition/seo-writer.demand.json --out /tmp/redactor-seo-composed.json
pnpm --silent pricing:v3 explain --input /tmp/redactor-seo-composed.json
pnpm --silent pricing:v3 replay --input /tmp/redactor-seo-composed.json
```

`compose prepare` evalúa selección/asignación y cálculo local, sin compra/reserva. `--out` guarda artefacto
interno 0600, sólo en ruta nueva. Código 3=calculado/revisión;2=pendiente;1=schema/argumentos/adapter/conflicto.
No usar el JSON de declaraciones del operador como policy: el formato ejecutable es `resources.review-v1.json`.
Los comandos quote/prepare legacy siguen usando sus propios formatos; no reciben demanda de composición.

## Leer el desglose

Desde el 2026-10-10 `compose prepare` y `compose quote` imprimen un resumen agrupado
([Leer el resumen](operar-cotizador-v3-con-agentes.md#leer-el-resumen)). Las filas completas que describe esta
sección están en el artefacto que escribe `--out` y en `explain`; un rechazo (exit 1) llega con `error.code`
([qué hacer con cada error](operar-cotizador-v3-con-agentes.md#qué-hacer-con-cada-error)). El resumen trae además
`estimateExposure` (cuánto del costo depende de cada dato estimado) y, cuando corresponde, `runNotices` (avisos de la
corrida, que no bloquean y se informan al operador junto al resultado).

`selections`: incluido/omitido, línea, mes y razón. `attributions`: plan/precio elegido, fuente, unidad,
usuarios, cantidad, driver, costo mensual total de las unidades seleccionadas, cuota del trabajo y parte no
asignada; cada función conserva share/costo. La suma de funciones reconcilia con la cuota, no por nombre de
proveedor. No representa el costo completo de una cartera de clientes ni dinero disponible.

`creditBudgets`: cuota atribuida, packs enteros, crédito extra restante, vencimiento y fuentes. La caja
incremental corresponde a compra de packs; `resourceIncrementalCash` la mantiene separada del compromiso
de caja atribuido del kernel. La caja de compra de nuevos seats no se infiere sin inventario/procurement.
Suscripción ya contratada mantiene costo; un cálculo no acredita cobro, pago o factura.

`quote`: costo humano, fees/Assurance/operación/setup del catálogo, herramientas inyectadas, factores/FX,
políticas de precio, periodos y totales. `explain.costBreakdown` permite reconciliar cada componente. Tarifas
de ensayo conservan markup histórico, no objetivo 40% aprobado. En el caso de servicio, el neto es simulación
de ese modelo de capacidad, no precio comercial validado del programa ni certificación de delivery.

## Mantenimiento y pendientes

Valores en catálogo monetario usan `catalog preview|apply` y versión nueva. Reglas/planes o packsIA usan `resources preview|apply`: replacement completo, base/contexto, evidencia y digest del impacto confirmados antes de escribir sucesor. [Contrato de mantenimiento](../../documentation/finance/cotizador-v3-mantenimiento-catalogo.md). Se valida con los casos afectados antes de dejarla vigente, lo que en el catálogo y la policy operativos se hace moviendo el [puntero](catalogo-v3-seleccion-y-actualizacion.md#versiones-vigentes-el-puntero-currentjson). Artefactos anteriores mantienen su policy. No promover valores o capacidades por
cambiar etiquetas; no pasar `commercial_draft`: composición sigue review_only y export comercial bloqueado.

En la **baseline review-v1 de este manual**, Adobe conserva cobertura/base/fecha pendientes y bloquea si se elige `current`; el ejemplo de diseño elige `historical` expresamente. La [policy sucesora review-v2](../../../data/pricing/v3-operating/README.md) tiene 180 USD combinado confirmado y 306 condicional, Notion facturado y referencias públicas explícitas, sin modificar esta baseline ni sus resultados. Precios públicos Claude no son factura real. Notion/M365/SEMrush/ChatGPT
actuales y reparto de plataforma aún requieren datos de Finance/Operations. Ejemplos tienen fracciones,
usuarios, seats y saldos hipotéticos. No son defaults del agente ni autorización de compartir licencias.
