# Pricing V3 — motor local reutilizable y primer consumidor CLI

- Status: `Accepted` para prototipo local autorizado por el operador; integración/promoción canónica pendiente.
- Date: 2026-10-09.
- Owner: Commercial/Finance + Platform/Architecture.
- Scope: núcleo determinista y contrato local, snapshots y CLI interna. No altera las capabilities de cotización, DB, permisos o motor vigente.
- Reversibility: two-way; consumidores locales nuevos, sin estado remoto.
- Confidence: medium hasta verificar implementación y casos; costos/precios operativos no aprobados.
- Work unit: TASK-2016.

## Context

El operador aprobó el modelo funcional, pidió definir contrato/pruebas y confirmó que este trabajo prototipa el motor V3 para su futura integración al cotizador canónico. Tras preparar el catálogo piloto pidió avanzar. La CLI histórica TASK-2015 depende de una proyección del Excel y no implementa esa arquitectura.

## Decision

Construir un núcleo de cálculo independiente en `src/lib/finance/pricing-v3/`, contrato validado con Zod, precisión decimal con dependencia directa `decimal.js` 10.6.0 ya presente en el lockfile, y CLI en `scripts/commercial/pricing-v3.ts`. La CLI es adaptador: carga solicitud/snapshot, invoca el servicio y serializa. Las reglas, resolución desde snapshots y proyección viven en el dominio; el núcleo no usa Excel, FS, DB, Next.js, identidad remota o SDK de proveedor.

El primer alcance es Staffing/Staff Augmentation mensual, con perfiles/variantes explícitos, costo humano localizado o referencia con factor, herramientas/fee/operación/Talent Assurance/setup mediante coberturas y unidades declaradas, markup o margen objetivo, ajuste comercial del componente humano por mercado, descuentos identificados, margen final y FX declarado. Servicios compuestos o capacidades no implementadas se rechazan expresamente.

La ejecución usa snapshots completos proporcionados explícitamente. Fixtures sintéticos o históricos permiten probar el cálculo; no habilitan tarifas vigentes. El catálogo piloto sigue `review_only`. El primer escenario comercial prioritario es talento Colombia → mercado Chile, confirmado por el operador, sin reinterpretar el país de los costos históricos.

Hash/serialización y persistencia de archivos son adaptadores del servicio, fuera de aritmética. Un artefacto guarda versión, solicitud/snapshot y resultado; replay verifica contenido y versión, sin consultar catálogo actual. La proyección comercial aplica allowlist, mantiene estimación no vinculante y nunca incluye costo/margen/factores internos.

## Alternatives

- Ampliar el lector del Excel: rechazado como implementación de V3, porque convierte el antecedente en dependencia permanente.
- Reglas en CLI o fórmulas replicadas por consumidor: rechazado.
- Reemplazo inmediato de V2, nuevo repositorio o servicio: diferido; no requerido para validar núcleo/contrato.

## Consequences / límites

El módulo separado puede integrarse por adaptadores posteriormente. Hay una dependencia decimal directa y contratos nuevos locales que deben probarse. La autoridad comercial sigue fuera del cálculo: `binding=false`, faltantes sin ceros y revisión sin autoaprobación.

Antes de integración completar contraste V2/V3, compatibilidad de snapshots/lifecycle, permisos por audiencia y cutover/rollback. [Quote API Parity](GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md) conserva su autoridad y MCP externo simulate-only. Esta decisión no certifica Full API Parity live ni amplía permisos.

## Runtime / verification contract

- [Modelo funcional](../documentation/finance/cotizador-cli-modelo-propuesto.md), [contrato y validación](../documentation/finance/cotizador-v3-contrato-y-validacion.md).
- Núcleo directo y CLI producen resultado equivalente sobre el mismo snapshot.
- Pruebas cubren ambas dimensiones de país, costo específico sin doble factor, dedicación, fees/licencias no lineales, anualidades, coberturas, setup, descuentos/margen, FX, faltantes, precisión, redacción y replay.
- Sin entradas de producción, seed runtime, migración o escritura remota. Retirar alias/módulo/fixtures nuevos revierte el prototipo; V2 intacto.

## Revisit

Cuando el prototipo necesite otra modalidad, se validen parámetros comerciales o se decida integrarlo al canon. La promoción requiere una decisión y unidad de trabajo propias, con evidencia por capability/consumer.

## Alcance vigente tras TASK-2019–TASK-2022

El primer alcance anterior describe TASK-2016, no una limitación del flujo actual. El mismo kernel recibe
snapshots resueltos por catálogo y por compositor; los incrementos siguientes añaden selección de perfiles,
calendarios, recursos/IA, reparto declarado, mantenimiento y proyección `role_capacity | managed_service`.
La segunda unidad agrupa el fee por período y setup en un preview local; no implementa SOW, receta comercial
validada, facturación por entregable ni gobierno de delivery. La aritmética de roles sigue como costeo interno.

Desde el 2026-10-10 «el motor» es un registro cerrado de contratos de entrada, no una versión única: `1.0.0`
(el de esta decisión, intacto) y `1.1.0` (precio acordado, ajustes disjuntos y redondeo comercial), cada uno con su
motor. Donde este documento dice que el replay «verifica contenido y versión», la versión es la del motor registrado
que firmó el artefacto, y la verificación sigue siendo por recálculo y digest. Contratos, reglas y guarda:
[ADR del motor 1.1](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md). Desde el 2026-10-11
el registro tiene un tercer contrato, `1.2.0` (el piso de margen acompaña al factor de mercado que lo declara),
agregado con el mismo patrón. Ese mismo día, más tarde, se agregó el cuarto, `1.3.0`: la forma del engagement
(On-Going, On-Demand) como dato propio del brief, con una razón de precio que vive en el catálogo. Por la noche se
agregó el quinto, `1.4.0`: los costos de terceros de un encargo, cada uno como fila propia con la regla de precio de
su categoría, y una reserva de contingencia que entra como costo. Son cinco contratos que conviven. La fuente del
registro es `PRICING_V3_ENGINES` en `schemas.ts`.

Tres precisiones del 2026-10-11 sobre lo que este documento dice arriba:

- «La ejecución usa snapshots completos proporcionados explícitamente» sigue valiendo para el kernel. En los
  carriles de catálogo y composición, las versiones vigentes del catálogo, la policy y los créditos las nombra un
  puntero verificado (`data/pricing/v3-operating/current.json`) que se usa con `--current`; sin ese interruptor el
  comportamiento es el de siempre.
  [Decisión](GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md#delta-2026-10-11--puntero-a-las-versiones-vigentes).
- «Costo humano localizado o referencia con factor»: los costos por persona del catálogo son el costo objetivo que
  el operador (CEO) quiere alcanzar para el equipo, no la nómina actual, y decidió que el cotizador no use la
  nómina. El margen real de hoy sobre las personas es mayor que el que muestra el cotizador.
- El operador declaró el 2026-10-11 que este cotizador está pensado para reemplazar con el tiempo al cotizador de
  Greenhouse. Es una dirección, no una migración hecha: el prototipo sigue sin DB, API ni escritura en el CRM, y la
  frontera de promoción de abajo sigue vigente.

Tres precisiones más, de la tarde del 2026-10-11:

- «El primer alcance es Staffing/Staff Augmentation mensual» describe TASK-2016. Un encargo acotado ya se puede
  cotizar: la forma del compromiso se declara en `engagementForm` (contrato `1.3.0`) y tres lecturas de un artefacto
  congelado dan el calendario de pagos, la caja y los compromisos con proveedores que sobreviven a los períodos
  cotizados (`compose schedule|cash|commitments`). Son lecturas: ninguna forma un precio.
  [Motor](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-130-la-forma-del-engagement-como-dato-propio)
  y [lecturas](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--tres-lecturas-de-una-cotización-congelada-calendario-caja-y-compromisos).
- «Talent Assurance/setup mediante coberturas y unidades declaradas»: la puesta en marcha dejó de ser un placeholder.
  Desde el catálogo v9 son dos provisiones costeadas por persona, y la regla del workbook de cobrar un mes del
  recurso no entra al cotizador.
  [Decisión](GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md#delta-2026-10-11--provisiones-de-puesta-en-marcha-costeadas-catálogo-v9).
- Todavía no se modelan los costos de terceros de un encargo ni una reserva de contingencia para trabajo de alcance
  fijo.
  *Nota 2026-10-11 (noche):* dejó de ser cierto ese mismo día. Los dos se modelan desde el contrato `1.4.0` y el
  catálogo v10.
  [Motor](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-140-costos-de-terceros-y-reserva-de-contingencia)
  y [lectura](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--contrato-140-y-catálogo-v10-cómo-se-lee-una-cotización-con-terceros-y-reserva).
  Lo que sigue sin modelarse (cuándo se le paga a un proveedor, si una compra ata más allá del trabajo, una
  cotización con terceros y sin línea de equipo, la liberación de la reserva) está al final de esos dos deltas.

El [ADR operativo vigente](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) identifica módulos,
fuentes y límites. [TASK-2022](../tasks/complete/TASK-2022-pricing-v3-operational-agent-workflow.md) está completa
localmente; [TASK-2017](../tasks/in-progress/TASK-2017-pricing-v3-colombia-chile-economics.md) permanece parcial
por evidencia económica. [Mapa de promoción](../documentation/finance/cotizador-v3-promocion-canonica.md):
reusar capabilities, redacción por audiencia, commands/readers, autoridad y lifecycle canónicos; no replicar
fórmulas en CLI/UI/API/MCP ni confundir el prototipo extraíble con un nuevo servicio productivo.
