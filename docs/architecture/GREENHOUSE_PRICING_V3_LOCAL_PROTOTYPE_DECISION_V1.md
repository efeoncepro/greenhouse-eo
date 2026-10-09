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
