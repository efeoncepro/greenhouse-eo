# QA — TASK-2019: selección y mantenimiento Pricing V3

## Veredicto

PASS para el prototipo local. No certifica costos vigentes, contratación, tarifas aprobadas o integración API/UI/MCP. TASK-2017 conserva la validación comercial.

## Alcance verificado

Catálogo JSON separado de V2, resolvedor puro, cálculo con el kernel existente, artefactos congelados, explicación, proyección cliente y CLI. Mantenimiento add/replace/retire con fuentes, vigencias, nuevas dimensiones, preview de impacto y confirmación por digest. No hay DB, red, despliegue, CRM ni cambios al expediente Pibank.

El catálogo contiene 32 perfiles históricos y 26 referencias de proveedores. La procedencia salarial por país es desconocida; el brief de simulación debe aceptarlo explícitamente. Kits y políticas nuevas son hipótesis; los valores de Assurance, operación y setup son placeholders de prueba.

## Evidencia

| Verificación | Resultado |
| --- | --- |
| Vitest Pricing V3 | PASS: 74/74, 49 kernel + 25 catálogo/resolución/mantenimiento |
| TypeScript focal | PASS: módulo V3 y CLI, sin emitir archivos |
| ESLint focal | PASS: módulo V3 y CLI |
| CLI real | Catálogo válido; diseñador/Pibank calculados en requires_review; dos explain y replay; dos exports históricos bloqueados sin archivo |
| Actualización | Preview/apply, rechazo de confirmación stale; catálogo original y cotización previa intactos; nuevo precio desde fecha efectiva |
| Invariantes | Alternativas ambiguas y costos faltantes no se seleccionan automáticamente; seats completos, reparto compartido, unidad anual, recurrencia y cargos únicos explícitos |
| Fuentes | Cuatro hashes del catálogo y once del ensayo previo Pibank intactos |
| Skills focales | Bloque nuevo pricing idéntico en Codex/Claude; diferencias de namespace anteriores preservadas |
| Skill mirrors global | Ocho divergencias de efeonce-graphic-line ajenas a esta unidad; no se declara gate global verde |
| Task/ops | Task focal sin errores ni warnings; ops changed sin errores, con 19 warnings ajenos de registry/epic parity |
| Documentación/contexto | PASS: cierre documental estricto sin faltantes; context-check estricto 0 errores/0 warnings tras sincronizar task, índices y handoff |

La [evidencia CLI](../../../data/pricing/v3-catalog/examples/verification.json) conserva totales, estados, versiones/digests y comparación antes/después. La [quote congelada](../../../data/pricing/v3-catalog/examples/designer.quote.artifact.json) permite replay independiente del catálogo activo.

## Controles financieros

Diseñador senior 50% CO→CL: costo recurrente USD 1.078,00, venta recurrente USD 1.401,40; setup de prueba USD 130,00 de venta. Tres meses: USD 4.334,20 netos, revisión requerida. No equivale a una tarifa comercial vigente.

El incremento ilustrativo de salario base 950→1.045 y Adobe 80→88 cambia el neto a USD 4.550,65 desde 2026-10-10. La quote del 2026-10-09 sigue en USD 4.334,20 y su replay es correcto. No representa aumento real aprobado ni activación automática de la nueva versión.

Pibank aporta demanda y calendario, no valores económicos: selección desde catálogo produce USD 87.102,66 netos anuales en simulación. El ensayo anterior de reconciliación TASK-2018 y la oferta del expediente se conservan separados. El factor de mercado neutral y el markup histórico no son la aspiración de margen 40% del expediente.

## Límites y mantenimiento

Costos/localización, capacidad real, impuestos, FX y políticas comerciales siguen sujetos a validación. La caja es un compromiso modelado, no factura o pago. Cambios de asignación anual durante un ciclo se rechazan hasta definir su política. La actualización genera una versión sucesora explícita; no activa el catálogo por defecto ni modifica contratos o cotizaciones anteriores.

El [manual](../../manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md) y el [contrato de mantenimiento](../../documentation/finance/cotizador-v3-mantenimiento-catalogo.md) establecen responsables, eventos, revisión trimestral, procedencia y trazabilidad. No se creó una automatización recurrente.
