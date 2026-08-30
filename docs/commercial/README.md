# Commercial

Índice operativo de ventas de Efeonce. Esta carpeta conecta las metas aprobadas, el forecast y los negocios
verificados sin convertir Markdown en una segunda base de datos comercial.

## Fuentes y autoridad

| Superficie                                                                                     | Autoridad                                                                                        |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| HubSpot                                                                                        | Company, Contact, Deal, asociaciones, owner, pipeline, stage, monto, moneda y fechas comerciales |
| [`CRM_DEAL_REGISTER.md`](CRM_DEAL_REGISTER.md)                                                 | Índice transversal de Deals verificados y su siguiente movimiento operativo                      |
| [`SALES_GOALS_OPERATING_MODEL_V1.md`](SALES_GOALS_OPERATING_MODEL_V1.md)                       | Definiciones, fórmulas, categorías de forecast, gates y cadencia de actualización                |
| [`SALES_GOALS_2026_Q4_2027.md`](SALES_GOALS_2026_Q4_2027.md)                                   | Baseline, metas aprobables, escenarios, forecast vigente y supuestos de capacidad                |
| [`COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md`](COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md)   | Plan comercial y presupuesto MRR + Spot, pacing, bridge, revenue, caja y variaciones              |
| [`PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md`](PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md) | Funnel, canales, actividad, piloto outbound, capacidad, RACI y gates                       |
| [`AGENTIC_REVENUE_OPERATING_MODEL_V1.md`](AGENTIC_REVENUE_OPERATING_MODEL_V1.md)             | Stack HubSpot/Apollo/agentes, dos carriles, human-in-control, capacidad y triggers de staffing    |
| [`REVENUE_OPERATING_CADENCE_2027_V1.md`](REVENUE_OPERATING_CADENCE_2027_V1.md)               | Calendario, scorecard, cierre mensual, pipeline council y gates del piloto outbound               |
| [`SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md`](SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md) | Familias de servicio, motores de ingreso, rol en cuota, capacidad y backlog de construcción      |
| [`tenders/LICITATION_CRM_REGISTER.md`](tenders/LICITATION_CRM_REGISTER.md)                     | Admisibilidad, bid/no-bid, postulación y resultado de licitaciones/RFP                           |
| Finance                                                                                        | Facturación, cobro, revenue reconocido, costos, margen, cash y tratamiento fiscal                |
| SharePoint / Teams / propuesta                                                                 | Evidencia de alcance, comité, interacción bilateral, versiones y proceso de compra               |

## Regla de uso

1. Lee primero el plan de metas vigente.
2. Revisa el forecast contra HubSpot live; un registro o documento nunca prueba por sí solo el estado actual.
3. Usa `CRM_DEAL_REGISTER.md` para resolver el negocio y su evidencia especializada.
4. No sumes MRR, bookings On-Demand, facturación y caja como si fueran la misma métrica.
5. Actualiza el forecast sin reescribir retroactivamente la meta aprobada. Un cambio de meta requiere decisión
   explícita, motivo, fecha y versión.

## Convención documental

- **Contrato durable:** `SALES_GOALS_OPERATING_MODEL_V1.md`; cambia sólo cuando cambia el método.
- **Plan vivo:** `SALES_GOALS_2026_Q4_2027.md`; se relee semanalmente y se actualiza cuando cambia el forecast,
  baseline o una decisión de meta.
- **Plan comercial y presupuesto anual:** `COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md`; traduce la meta a dos bandas independientes, pacing,
  `budget | actual | forecast | variance`, revenue reconocido, margen y caja.
- **Generación de pipeline:** `PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md`; dimensiona reuniones, canales,
  acciones y recursos, y mantiene outbound como piloto hasta validar conversión y economics.
- **Revenue operations agentic:** `AGENTIC_REVENUE_OPERATING_MODEL_V1.md`; asigna funciones al stack y al equipo,
  evita colisiones HubSpot/Apollo y decide cuándo una función requiere headcount.
- **Cadencia operativa:** `REVENUE_OPERATING_CADENCE_2027_V1.md`; convierte el presupuesto en rituales semanales,
  cierre mensual, scorecard y decisiones sin inventar actuals fuera de HubSpot o Finance.
- **Arquitectura de portafolio:** `SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md`; conecta el catálogo completo con
  recurrencia, caja, validación, capacidad y concentración sin duplicar las ofertas dueñas.
- **Registro operativo:** `CRM_DEAL_REGISTER.md`; se actualiza después de readback live de HubSpot.
- **Evidencia fechada:** auditorías, propuestas, Teams y SharePoint; pueden quedar stale y deben conservar fecha.

No almacenes credenciales, tokens, cookies, datos personales innecesarios ni documentos sensibles en esta carpeta.
