# Cotizador V3: selección y actualización para agentes

Estado: prototipo local ejecutable, 2026-10-09; catálogo histórico de simulación, no tarifas comerciales vigentes.
Owner: Finance/Commercial para costos/precio; Operations para kits/asignación; Platform para contrato.
[Decisión](../../architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md),
[contrato de mantenimiento](../../documentation/finance/cotizador-v3-mantenimiento-catalogo.md).

## Qué hace el agente

1. Consultar catálogo/perfiles/variantes y kits. Elegir versión explícita con `--catalog`; sin esa opción usa la baseline `catalog.review-v1.json`, NO descubre automáticamente una versión más reciente.
2. Traducir el pedido a brief: país del talento y mercado cliente, perfil, dedicación/horas, headcount, modalidad, duración, kit y alternativas. No introducir precios ni porcentajes inline.
3. Preparar selección y resolver diagnósticos. No elegir el más barato si hay variantes; no usar cero por dato ausente.
4. Cotizar con el mismo catálogo. Guardar el artefacto: contiene catálogo, brief, bindings, snapshots, calendario y resultados.
5. Explicar desde ese artefacto, sin consultar precios nuevos. Exportar borrador sólo si completo y dentro de policy; historical/estimated no pasa ese gate.

```bash
pnpm --silent pricing:v3 catalog validate
pnpm --silent pricing:v3 catalog search --query diseñador --kind profile --date 2026-10-09
pnpm --silent pricing:v3 catalog show --query visual-core --kind kit --date 2026-10-09
pnpm --silent pricing:v3 catalog show --query ETG-001 --kind resource --date 2026-10-09
pnpm --silent pricing:v3 prepare --input data/pricing/v3-catalog/examples/designer-co-cl.json
pnpm --silent pricing:v3 quote --input data/pricing/v3-catalog/examples/designer-co-cl.json --out /tmp/disenador-v3.artifact.json
pnpm --silent pricing:v3 explain --input /tmp/disenador-v3.artifact.json
pnpm --silent pricing:v3 replay --input /tmp/disenador-v3.artifact.json
```

Las salidas son JSON. Código 0: operación correcta/selección resuelta; 2: faltante/entrada inválida;
3: calculado con revisión; 1: error adapter/conflicto/export bloqueado. `prepare` inspecciona selección,
no aprueba precios. Un error del kernel puede aparecer al cotizar una selección estructuralmente resuelta.
Archivos nuevos usan `wx` y `0600`; nunca sobrescriben. Repetir comandos con `--out` exige una ruta nueva.

## Catálogo y reglas

La baseline incluye 32 perfiles con nombre (omite filas vacías), 26 referencias de proveedores,
fees separados por perfil, kits propuestos, políticas, FX históricos y recursos de prueba. No lee Excel/CSV
al ejecutar. Fuente/hashes quedan en `evidence`; cada registro conserva procedencia, note, revisión y vigencia.
Las fechas de los registros históricos delimitan el uso de la simulación, no acreditan vigencia salarial/proveedor real.
Los componentes humanos mantienen salario, bonos y previsionales separados en bindings; el kernel recibe su suma.
Previsionales históricos cero no acreditan ausencia de cargas. Premium conserva fee ausente, sin heredar USD49.

Se recuperan **montos completos históricos de paquetes**, sin tomar divisor «proyectos» como derecho de compartir seats.
Ejemplo Adobe USD80, Notion USD144, Microsoft365 USD80, ChatGPT USD20: planes/unidades actuales pendientes.
Las reglas de kits son hipótesis: scope cuenta/equipo se reparte por consumidores cuando `equal_consumers` lo declara;
scope persona conserva cantidad por headcount. `fte` sólo existe si una regla lo declara explícitamente.
Ninguna regla certifica permiso contractual para compartir una licencia. Recursos del cliente requieren motivo y
kit con `allowClientProvided`; no se puede eliminar gestión/Assurance diciendo que la cubre el cliente.

País de costo y mercado son dimensiones independientes. Costos específicos no reciben factor salarial adicional.
Costo sin país sólo puede usarse con `mode=simulation` y `allowUnlocalizedCost=true`; queda como supuesto y revisión.
Factores de mercado 1 son neutrales de prueba; no WTP aprobado. Las políticas por tier usan markup histórico, no
margen objetivo 40%. El catálogo no hereda la aspiración de margen del expediente Pibank.

Talent Assurance USD25/mes, operación USD25 y setup USD100 son **placeholders de la prueba anterior**,
identificados `trial-*`; no costos medidos ni promesas de formación/reemplazo. Se actualizan como recursos explícitos.
No hay bolsas del expediente, cargos laborales 20% ni reserva 15% implícitos en este catálogo.

## Calendario y pagos de licencias

El brief soporta `activePeriods` y `dedicationByPeriod`. Resolver genera un snapshot por mes y el orquestador
invoca el kernel; no hay fórmulas de precio duplicadas en CLI. Meses sin actividad no generan venta.
Setup de cuenta se carga una vez, incluso si se incorporan consumidores después.
Anualidades estables devengan 1/12 del precio/costo por mes y comprometen pago anual al inicio y cada doce meses.
Cambiar unidades anuales o reactivar tras una pausa devuelve `ANNUAL_ASSIGNMENT_CHANGE_REQUIRES_POLICY`, no inventa
cancelación/reembolso. `cashLedger` consolida esos compromisos; no es emisión de factura ni caja real.
Las fechas de catálogo se evalúan en `quoteDate` y se congelan para la cotización; no reprecian contratos por mes.

## Ejemplos verificados

- [Diseñador CO→CL](../../../data/pricing/v3-catalog/examples/designer-co-cl.json): tres meses, 50%, paquetes históricos completos.
  Costo USD3334, neto de simulación USD4334,20; mensual recurrente USD1401,40 y setup USD130.
  Distinto del ensayo USD1064,70: éste atribuía paquetes mediante divisores históricos.
- [Demanda Pibank PE/CL](../../../data/pricing/v3-catalog/examples/pibank-demand-pe-cl.json): doce meses, diez funciones,
  SEO/redactor costo completo reservado; otros según horas de módulos distribuidas por activaciones.
  Selección explícita SEMrush histórica. Costo USD61082,82 y neto USD87102,66, promedio USD7258,56.
  No es precio nuevo de la propuesta: país/seniority/capacidad/planes pendientes; no se garantiza cobertura técnica AEO
  sólo por usar SEMrush. Si no se elige suite, devuelve alternativas; el recurso `pending-seo-suite` bloquea el cálculo.
- [Evidencia CLI](../../../data/pricing/v3-catalog/examples/verification.json) y
  [quote congelada del diseñador](../../../data/pricing/v3-catalog/examples/designer.quote.artifact.json).

Pibank aporta **demanda**, no salarios ni provisiones. El mapa mensual es un supuesto de planificación:
horas de cada módulo ponderadas por activaciones; mapa PR inicial completo en la primera campaña. No acredita
agenda real, dedicación exclusiva o suficiencia de dirección/AM. Los términos comerciales de un programa gestionado,
proyectos/hitos y facturación no se vuelven Staffing por esta prueba de capacidad.

## Actualizar una versión

```bash
pnpm --silent pricing:v3 catalog preview --input data/pricing/v3-catalog/examples/illustrative-increase.json --impact data/pricing/v3-catalog/examples/update-impact-briefs.json
pnpm --silent pricing:v3 catalog apply --input data/pricing/v3-catalog/examples/illustrative-increase.json --impact data/pricing/v3-catalog/examples/update-impact-briefs.json --confirm DIGEST_DEL_PREVIEW --out /tmp/catalogo-v3-ejemplo-v2.json
pnpm --silent pricing:v3 quote --catalog /tmp/catalogo-v3-ejemplo-v2.json --input BRIEF_CON_FECHA_2026_10_10 --out /tmp/nueva-cotizacion.artifact.json
```

`DIGEST_DEL_PREVIEW` y `BRIEF_CON_FECHA_2026_10_10` son placeholders que el agente sustituye; no copiar literalmente.
El fixture sólo ilustra alza de Adobe80→88 y salario base950→1045 desde 10-10. No afirma incremento real.
Con los mismos supuestos cambia el neto de tres meses4334,20→4550,65; una quote del09-10 conserva el importe anterior.
La versión nueva sólo se usa cuando se selecciona con `--catalog`; aplicar no publica, factura ni activa catálogo canónico.

## Límites y futuros consumers

Núcleo/reader/resolvedor/update/proyección viven en `src/lib/finance/pricing-v3/catalog`; hash/replay en adapter;
filesystem/argumentos en CLI. API/UI/MCP pueden consumir los mismos primitives; integración live pendiente.
Actualización local no modifica payroll, licencias reales, contratos ni quote Greenhouse. No hacer outreach/envíos.
