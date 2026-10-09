# Catálogo piloto V3 para revisión

Preparado el 2026-10-09. Datos de revisión; motor local V3 implementado y probado aparte, sin tarifas comerciales aprobadas.

- [Parámetros y catálogo limitado](parameters.json): seis perfiles, cuatro kits propuestos, doce referencias de herramientas y decisiones pendientes.
- [Cálculos independientes de referencia](reference-calculations.json): tres casos numéricos históricos y un caso Salesforce sin costo.
- [Tabla para revisar](../../../docs/documentation/finance/cotizador-v3-parametros-piloto.md): valores, escalas, alcance y decisiones necesarias.
- [Contrato y validación](../../../docs/documentation/finance/cotizador-v3-contrato-y-validacion.md).

Los JSON normalizan solo los datos pertinentes; no son una proyección de celdas ni requieren leer el Excel para revisarlos. La procedencia conserva referencias al antecedente histórico. `runtimeUse=review_only` y `operationalEnabledProfiles=[]` impiden interpretar esta preparación como catálogo vigente.

`historical` identifica un dato del libro, `proposed` una decisión a revisar, `pending` un dato ausente y `confirmed_meaning` una interpretación confirmada por el operador. La confirmación del significado no sustituye vigencia, país, cargas o aprobación de la tarifa.

Los perfiles HubSpot conservan identidades distintas. Un pedido ambiguo de consultor devuelve opciones estándar/premium; nunca elegir la variante más barata automáticamente. Implementador/desarrollador son funciones distintas, no escalones de seniority del consultor. El tier comercial tampoco determina por sí solo esa variante.

Los casos históricos reproducen aritmética del antecedente. Sus importes no se usan como totales V3: todos conservan `v3Expected.calculationStatus=needs_input` y `finalPrice=null` hasta cerrar sus datos. Salesforce conserva costos/precios ausentes; no hereda la referencia de HubSpot.

Los controles históricos están comprobados con aritmética decimal independiente y valores cacheados del libro; no acreditan recálculo nativo de Excel. Las pruebas del motor V3 usan snapshots separados, sin activar estos históricos como tarifas.

## Motor local y escenarios

- [Manual V3](../../../docs/manual-de-uso/finance/cotizar-v3-por-cli.md): cálculo, validación, explicación, replay, comparación y exportación de borrador.
- [Demostración completa sintética](scenarios/synthetic-co-cl.json): prueba de reglas; ningún costo/factor/hora/tasa habilita precios comerciales.
- [Piloto real pendiente Colombia→Chile](scenarios/colombia-chile-design-needs-input.json): combinación elegida por el operador, sin costo localizado ni políticas/FX inventados. Diseñador senior al 50% confirmado; headcount, plazo, modalidad y moneda siguen como supuestos.

`parameters.json` y `reference-calculations.json` siguen siendo revisión/controles; no se pasan directamente al motor como snapshots completos.

- [Ficha económica Colombia→Chile](../../../docs/documentation/finance/cotizador-v3-piloto-colombia-chile.md) y [ledger para agentes](economics/colombia-chile-review.json): confirmaciones, bindings y sensibilidad preparada; costos vigentes pendientes. [Readiness](economics/colombia-chile-readiness.json): sin precio exportable.

- [Simulación histórica ejecutable](scenarios/colombia-chile-design-historical-hypothesis.json): diseñador senior 50% con costo colombiano supuesto, kit histórico y placeholders de prueba; [supuestos](economics/historical-simulation/assumptions.json) y [cinco resultados](economics/historical-simulation/results.json). `calculated/requires_review`, sin habilitación comercial.

- [Prueba de equipo Pibank Perú/Chile](../../../docs/documentation/finance/cotizador-v3-prueba-pibank.md): ruta gradual, diez funciones con capacidad media, costo reconciliado y ensayo de margen 40%; [input](scenarios/pibank-gradual-peru-chile.json), [supuestos](economics/pibank/assumptions.json) y [resultados](economics/pibank/results.json). Sin cambiar la oferta documental.

[Selección desde catálogo y mantenimiento](../v3-catalog/README.md): recorrido implementado después de los ensayos con snapshots. Pibank pasa a demanda; catálogo aporta costos.
