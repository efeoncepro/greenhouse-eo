# Cotizador V3: componer un pedido con herramientas

Estado: local ejecutable,2026-10-09; siempre simulación con revisión. No registra quote comercial ni inventario.
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
3. Leer policy versionada. Notion/Microsoft365 son obligatorios; tareas de redacción SEO exigen SEMrush;
   diseño visual exige Adobe; generación/upscale selecciona Higgsfield/Magnific. IA textual se elige
   explícitamente, sin cargar todos los proveedores ni elegir la variante barata por defecto.
4. Para cada herramienta monetaria y mes activo, declarar `toolId`, `priceId`, cantidad de unidades del
   precio, `serviceShare`, driver (`unit`, `totalUnits`, `allocatedUnits`) y razón. La cuota debe equivaler
   al driver, truncada a18decimales; el motor valida esa igualdad. Referencias históricas son opción de
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
   conserva EUR; baseline carece de EUR/FXEUR→USD y por eso bloquea su suma hasta actualizar catálogo.
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
interno0600, sólo en ruta nueva. Código3=calculado/revisión;2=pendiente;1=schema/argumentos/adapter/conflicto.
No usar el JSON de declaraciones del operador como policy: el formato ejecutable es `resources.review-v1.json`.
Los comandos quote/prepare legacy siguen usando sus propios formatos; no reciben demanda de composición.

## Leer el desglose

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
de ensayo conservan markup histórico, no objetivo40% aprobado. En el caso de servicio, el neto es simulación
de ese modelo de capacidad, no precio comercial validado del programa ni certificación de delivery.

## Mantenimiento y pendientes

Valores en catálogo monetario usan preview/apply y versión nueva. Policy nueva cambia reglas/variantes en
un archivo sucesor con versión/fuente nuevas; se valida ejecutando prepare y los casos afectados antes de
elegirla explícitamente. Artefactos anteriores mantienen su policy. No promover valores o capacidades por
cambiar etiquetas; no pasar `commercial_draft`: composición sigue review_only y export comercial bloqueado.

Adobe actual conserva cobertura/base/fecha pendientes y bloquea si se elige `current`; el ejemplo de diseño
elige `historical` expresamente. Precios públicos Claude no son factura real. Notion/M365/SEMrush/ChatGPT
actuales y reparto de plataforma aún requieren datos de Finance/Operations. Ejemplos tienen fracciones,
usuarios, seats y saldos hipotéticos. No son defaults del agente ni autorización de compartir licencias.
