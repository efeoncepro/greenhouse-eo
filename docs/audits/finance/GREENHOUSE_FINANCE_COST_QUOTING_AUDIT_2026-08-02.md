# Auditoría de costos, cotización y contabilidad de Greenhouse

**Fecha de corte:** 2026-08-02  
**Alcance:** Greenhouse, incluyendo la economía operativa de Efeonce Globe  
**Tipo:** auditoría documental, de código, schema y runtime; sin cambios de datos  
**Estado:** auditado; implementación pendiente

## 1. Conclusión ejecutiva

La necesidad real no es agregar otra pantalla de cotizaciones. Es cerrar esta cadena:

```text
hechos financieros y operativos
  → base canónica de costo interno
  → cotización explicable
  → costo y margen esperados
  → costo y margen reales
  → cierre y contabilidad de gestión
```

Hoy existen piezas en casi todos los puntos, pero la cadena no es confiable ni completa. Por eso una cotización puede terminar calculándose con costos modelados, costos blended, costos por persona, datos de herramientas, líneas manuales o fallbacks; y por eso Greenhouse puede registrar movimientos financieros sin entregar una visión consolidada y auditable de costo, COGS, margen y resultado por cliente, servicio o unidad de negocio.

La respuesta honesta es:

- **No hay hoy una base única, obligatoria y visible de costos que gobierne toda cotización.**
- **No hay hoy una contabilidad de gestión completa y reconciliada que permita saber cuánto costó realmente entregar cada trabajo y qué margen dejó.**
- **Globe está operativo como producto y tiene un puente de fondeo/control en Greenhouse, pero no tiene un puente económico completo de consumo de créditos, costo de proveedores y margen hacia la base de costos.**
- **Sí existen registros financieros, pipelines de costos y motores de pricing.** Decir que no existe absolutamente ningún registro sería incorrecto; decir que ya estamos contabilizando de forma integral y confiable también sería incorrecto.

## 2. Necesidad de negocio que esta auditoría fija

### Cotizar sin adivinar

Cuando el operador pide una cotización, el sistema debe responder usando el costo interno de Efeonce, no una intuición de mercado ni un precio de catálogo sin trazabilidad. La cotización debe mostrar internamente:

1. qué recursos consume;
2. cuánto cuesta cada recurso;
3. de qué fuente, periodo y snapshot proviene cada costo;
4. qué parte está completa, parcial, estimada o ausente;
5. qué margen mínimo, objetivo y máximo se está aplicando;
6. qué supuestos quedarán como baseline para comparar contra el costo real.

El mercado puede servir como comparación o sanity check posterior. No puede sustituir el costo interno.

### Contabilizar lo que realmente ocurre

Greenhouse debe poder conectar ingresos, gastos, nómina/provisiones, herramientas, overhead, costos de Globe, asignaciones a clientes y costos financieros. El resultado requerido es costo de servir, COGS, margen y P&L de gestión por periodo, cliente, servicio y unidad de negocio, con cierre, reconciliación, cobertura y explicación.

La contabilidad legal de doble partida sigue siendo un boundary separado: la arquitectura vigente la deja fuera del alcance actual de Cost Intelligence y Management Accounting. Esta auditoría no la declara implementada ni propone sustituirla silenciosamente.

## 3. Método y evidencia

Se revisaron:

- `project_context.md`, `Handoff.md`, AGENTS y el router de dominios;
- las skills de finanzas/contabilidad, documentación, pricing y business model;
- arquitectura, invariantes, documentación funcional, schema, readers, servicios y rutas API;
- cuatro revisiones paralelas de subagentes, con conclusiones convergentes;
- autenticación canónica local (`scripts/gcloud-auth-preflight.sh`), conexión canónica a Cloud SQL (`pnpm pg:connect:status`) y consultas PostgreSQL de solo lectura;
- runtime de Globe mediante Cloud Run, sin acceder directamente a su base de datos privada.

La autenticación GCP CLI + ADC quedó verificada y alineada con `efeonce-group`. No se modificaron datos, migraciones, credenciales, runtime ni configuración como parte de la auditoría.

## 4. Qué existe hoy

| Capa | Evidencia verificada | Veredicto |
|---|---|---|
| Finanzas transaccionales | Ingresos, gastos, pagos, caja, bancos, FX, conciliación, órdenes de pago, categorías económicas y readers/APIs/UI | Existe como capa operativa |
| Cost Intelligence | `member_capacity_economics`, `commercial_cost_attribution`, `provider_tooling_snapshots`, overhead y snapshots P&L | Existe, pero con cobertura parcial y degradaciones |
| Pricing V2 | `src/lib/finance/pricing/pricing-engine-v2.ts` está conectado al flujo de simulación y submit de cotizaciones | Existe, pero consume varias bases y permite fallback |
| Cotizaciones | 108 cotizaciones, 98 versiones, 135 líneas comerciales y 72 snapshots del pipeline en live | Existe como producto de cotización |
| Profitability | 6 `quotation_profitability_snapshots` en live | Existe como capacidad, no como loop operacional completo |
| Ledger legal | La arquitectura de Cost Intelligence declara fuera de alcance la contabilidad legal de doble partida | No está implementado como ledger fiscal |
| Globe runtime | `globe-api-internal` y `globe-studio-internal` están Ready en Cloud Run | Producto operativo, con boundary separado |
| Globe en Greenhouse | 26 `globe_credit_funding_intents`, más policies, authorities, executions y attestations | Existe puente de fondeo/control, no puente económico completo |

## 5. Hallazgos sobre la base de costos del cotizador

### H1 — No existe una base canónica única de costo para cotizar

El pricing engine V2 intenta resolver:

- costo real de miembro;
- costo blended por rol;
- costo modelado por rol;
- costo de proveedor por herramienta;
- FX, overhead, tiers y modelo comercial.

Eso es una buena superficie de cálculo, pero no equivale a una base consolidada. La ruta actual mezcla fuentes y, según la línea, puede caer en paths distintos:

- el rol prefiere `role_blended` y luego `role_modeled`;
- la persona usa costo actual por miembro y puede usar un snapshot de periodo;
- la herramienta busca `tool_provider_cost_basis_snapshots` y, si no existe, puede usar datos del catálogo o aplicar un margen default del 15%;
- la ruta legacy puede leer `role_rate_cards`;
- una línea sin tipo V2 puede persistirse como `direct_cost` usando el precio ingresado;
- deliverables y líneas manuales no constituyen por sí solos una base de costo interno.

Esta mezcla explica técnicamente por qué una cotización puede salir demasiado alta, demasiado baja o no ser defendible: el resultado no siempre parte del mismo nivel de costo, periodo, cobertura o confianza.

### H2 — Las tablas de base están incompletas o no alimentadas

Conteos verificados en live:

| Fuente | Filas | Lectura |
|---|---:|---|
| `member_capacity_economics` | 136 | 32 `complete`, 104 `partial` |
| `member_role_cost_basis_snapshots` | 49 | Existe base por miembro, no cobertura universal |
| `role_blended_cost_basis_snapshots` | 12 | Existe base blended parcial |
| `role_modeled_cost_basis_snapshots` | 0 | No hay fallback modelado persistido en live |
| `role_rate_cards` | 0 | La ruta legacy no tiene tarjetas vigentes en live |
| `tool_provider_cost_basis_snapshots` | 0 | El costo de herramientas no está materializado en la tabla canónica |
| `sellable_roles` | 38 | El catálogo comercial existe |
| `sellable_role_cost_components` | 31 | Hay componentes de costo, pero no cubren el ciclo completo |
| `overhead_addons` | 9 | Existen adicionales de overhead |
| `margin_targets` | 6 | Existen objetivos de margen |

En `operational_pl_snapshots` hay 11 filas de alcance cliente con ingreso mayor que cero y `total_cost = 0`. La arquitectura exige degradación honesta con coverage flags; una fila de ingresos con costo cero no debe interpretarse como margen real.

### H3 — La evidencia persistida de las cotizaciones no demuestra uso consistente de la base

En las 135 líneas comerciales live:

- 126 son `deliverable`;
- 8 son `role`;
- 1 es `direct_cost`;
- 134 no tienen `pricing_input` persistido;
- 132 no tienen `unit_cost` persistido;
- 0 tienen override manual registrado en `cost_override_at`;
- solo 3 tienen `pricingV2CostBasisKind` explícito en `cost_breakdown`;
- 9 tienen campos de costo loaded legacy en `cost_breakdown`.

Esto no prueba que cada cotización histórica haya sido calculada incorrectamente. Sí prueba que la trazabilidad persistida no permite certificar, línea por línea, qué costo interno gobernó el precio.

### H4 — El motor puede degradar sin bloquear una cotización económicamente incompleta

La implementación tiene warnings y fallbacks para mantener el flujo. Eso ayuda a no romper la operación, pero no es suficiente para una cotización que debe ser rentable. El comportamiento requerido para la nueva capa es:

- **bloquear** si falta un costo crítico para afirmar margen;
- **advertir y etiquetar** si se permite una estimación;
- registrar fuente, fecha, periodo, cobertura, confianza y razón del fallback;
- nunca transformar un costo faltante en cero silenciosamente;
- nunca usar una heurística de mercado como costo interno.

## 6. Hallazgos sobre contabilidad y costo real

### H5 — Hay movimientos financieros, pero no contabilidad de gestión completa

Greenhouse registra operaciones financieras y tiene piezas de asignación y snapshots. El problema es que no se obtiene de forma confiable y completa el resultado de gestión: ingresos, costo fully loaded, costo de herramientas, overhead, provisiones laborales, Globe, COGS y margen reconciliados por dimensión.

La arquitectura de Management Accounting define como requisitos un actual reconciliado, fully loaded, period-aware, trazable y probado. El estado live no alcanza ese estándar:

- `member_capacity_economics` es mayoritariamente `partial`;
- el snapshot de tooling de proveedores tiene 301 filas completas y CLP 5.345.251 de costo agregado, pero reporta cero miembros de nómina y cero costo de nómina;
- el snapshot canónico `tool_provider_cost_basis_snapshots` está vacío;
- faltan los hechos canónicos del Member Loaded Cost Model para consumo de herramientas, costo loaded por miembro, costo por cliente y costo full por cliente;
- el cierre existente no equivale todavía a un cierre contable con snapshots inmutables, restatement controlado y reconciliación de MLCM.

### H6 — No existe todavía el loop cotizado versus real

Hay snapshots de profitability, pero solo 6 filas live no representan un mecanismo operativo completo de comparación. Falta que cada cotización aprobada deje un baseline versionado y que, al ejecutar y cerrar el periodo, Greenhouse calcule:

```text
costo cotizado vs. costo real
ingreso cotizado vs. ingreso realizado
margen cotizado vs. margen realizado
drift y sus drivers
```

Sin este loop no se puede aprender qué tan buenos son los supuestos ni corregir la base de costos.

### H7 — Globe no está incorporado al costo de servir

Globe está Ready en runtime y Greenhouse tiene 26 intents de fondeo de créditos, incluyendo estados propuestos, confirmados y completados. Esos datos prueban control de fondeo, no costo económico de consumo.

Falta un reader/bridge gobernado que lleve desde Globe hacia Greenhouse, sin romper el boundary de producto:

- consumo de créditos por trabajo/cliente/periodo;
- costo real o tarifario del proveedor/modelo usado;
- asignación de ese costo al output o servicio vendido;
- snapshot y provenance;
- impacto en costo, margen y P&L.

Greenhouse no debe leer directamente la base privada de Globe; el puente debe ser una API/reader gobernado por el contrato de Globe.

## 7. Requerimiento funcional resultante

La capacidad que falta debe tratarse como **Cost & Pricing Foundation**, no como un ajuste aislado del cotizador.

### A. Base canónica de costos

Debe consolidar por periodo y moneda:

- capacidad y costo loaded de personas;
- remuneración, cargas y provisiones laborales;
- tools y consumo real por miembro/cliente;
- proveedores y costos de Globe;
- overhead asignable;
- costos financieros y pass-through cuando corresponda;
- cobertura, confianza, vigencia, fuente y snapshot.

### B. Cotizador gobernado

Debe consumir un único reader de costo y devolver una ficha interna de costo por línea. El usuario debe poder distinguir:

- costo confirmado;
- costo estimado;
- costo parcial;
- costo faltante.

El precio debe derivarse de costo + política de margen + modelo comercial, con override explícito, razón, usuario y efecto. La vista cliente debe seguir redaccionando la estructura interna según el contrato de API vigente.

### C. Contabilidad de gestión

Debe producir P&L de gestión por periodo, cliente, servicio y unidad de negocio, con:

- ingresos y gastos reconciliados;
- COGS/costo de servir;
- margen bruto y margen de contribución;
- cierre y reapertura controlados;
- snapshots inmutables o versionados;
- cobertura y excepciones visibles;
- presupuesto, forecast y variance después de estabilizar actuals.

### D. Aprendizaje de cotización

Cada cotización debe conservar el baseline usado. La ejecución debe alimentar el resultado real. El sistema debe explicar el drift y actualizar la base aprobada, nunca reescribir silenciosamente la historia.

## 8. Prioridad de implementación

1. **Bloqueador inmediato:** declarar y materializar el reader canónico de costo; eliminar ambigüedad entre V2, legacy, catálogo y manual.
2. **Bloqueador de precisión:** completar MLCM, costo loaded laboral, consumo de herramientas y snapshots de proveedores.
3. **Bloqueador de rentabilidad:** conectar el cotizador con cobertura/flags y fail-closed para margen no verificable.
4. **Bloqueador contable:** completar actuals, asignación, COGS, cierre, reconciliación y P&L de gestión.
5. **Bloqueador Globe:** incorporar consumo y costos de Globe a través de su API/reader gobernado.
6. **Control de aprendizaje:** cotizado versus real, drift, drivers, presupuesto y forecast.

Las tareas existentes sobre el puente de consumo de herramientas, provisiones laborales y el Member Loaded Cost Model deben tratarse como dependencias de esta capacidad, no como mejoras desconectadas.

## 9. Decisión de auditoría

Hasta completar los puntos anteriores:

- no se debe presentar el cotizador como basado en una única base de costos;
- no se debe certificar margen de una cotización como defendible solo porque el motor devuelve un número;
- no se debe llamar “contabilidad lista” a la capa actual;
- no se debe cerrar el gap usando precios de mercado como sustituto del costo interno;
- no se debe declarar Globe incorporado al P&L por el solo hecho de existir el puente de fondeo.

La siguiente unidad de trabajo debe ser una decisión de arquitectura sobre el reader/fact model canónico y su integración con Pricing, Management Accounting y Globe. Esta auditoría no acepta todavía ese nuevo source of truth ni modifica el runtime.

## 10. Fuentes canónicas revisadas

- [Member Loaded Cost Model V1](../../architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md)
- [Cost Intelligence Architecture V1](../../architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md)
- [Management Accounting Architecture V1](../../architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md)
- [Pricing/comercial — estado documentado](../../documentation/finance/pricing-comercial.md)
- [Quote API Parity Multi-Consumer](../../architecture/GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1.md)
- [Commercial Tenders Agent Invariants](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md)
- [Pricing Engine V2](../../../src/lib/finance/pricing/pricing-engine-v2.ts)
- [Quote builder line items](../../../src/lib/finance/pricing/quote-builder-line-items.ts)
- [Quote submission](../../../src/lib/commercial/submit-quote-from-builder.ts)
- [Pricing simulation API](../../../src/app/api/finance/quotes/pricing/simulate/route.ts)
- [Globe runtime handoff](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md)

**Commit boundary:** este artefacto documenta la auditoría y sus hallazgos. No incluye migraciones, cambios de pricing, cambios de contabilidad, cambios en Globe ni cambios de datos.
