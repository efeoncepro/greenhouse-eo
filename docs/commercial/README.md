# Commercial

Nombres de Deal/Lead: [convención vigente Efeonce](../operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md),
aceptada el 15/10/2026. Marca/cuenta primero y separador ` | `; nuevas altas autorizadas la adoptan.
El histórico se normaliza sólo por lote autorizado con identidad/dedupe, antes/después y readback;
no reescribir snapshots fechados ni alterar asociaciones para acomodar el nombre.

- [Correos desde Outlook de Julio: firma oficial y BCC HubSpot](../operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md). Requisito previo a enviar; registro CRM verificado por separado.

- [Outreach personalizado del 13/10/2026](follow-up-agent/runs/2026-10-13-outreach-personalizado.md): seis correos enviados por Outlook web con firma gráfica, brochure contextual y actividades HubSpot `SENT`; Rafael excluido. Referencia para próximos primeros contactos y su verificación.

> **Naming AEO vigente:** **Efeonce AEO** es la capacidad comercial; **Efeonce AEO Assessment** es el diagnóstico público y **Efeonce AI Visibility Report** su entregable. Casos y propuestas fechados conservan sus nombres de época (`AI Visibility Grader`, `Brand Visibility Grader`, `AEO Grader`). [ADR](../architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md).

Índice operativo de ventas de Efeonce. Esta carpeta conecta las metas aprobadas, el forecast y los negocios
verificados sin convertir Markdown en una segunda base de datos comercial.

## Fuentes y autoridad

- [Prospección B2B compartida](../documentation/comercial/prospeccion-b2b.md): [skill](../../.codex/skills/efeonce-b2b-prospecting/SKILL.md), [manual](../manual-de-uso/comercial/operar-prospeccion-b2b.md) y [decisión](../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md); coordina Commercial, Customer Model, prácticas, Copy, HubSpot y Sales opcional. Radar/historial conservados.

- [Bancos de Chile — segmento activo 188](prospects/bancos-chile-2026-10/README.md): 28 personas con email de 14 bancos, definición por empresa principal, propiedades y brechas de canal verificadas el 11/10. Incluye 20 de la ronda adicional y ocho contactos conocidos; sin outreach.

- [Contactos conocidos — BCI, BICE, Cencosud e Itaú](prospects/contactos-conocidos-banca-retail-2026-10/README.md): 12 contactos incorporados el 11/10 (10 nuevos, 2 reutilizados), focos comerciales y segmentos verificados. Sin outreach; pendientes de canal y vigencia documentados.

- [QuePlan — Jorge Godoy: prospección fría](prospects/queplan-jorge-godoy-2026/README.md) y [WIN Fitness Wear — Fiorella: búsqueda activa de agencia](prospects/win-fitness-wear-social-2026/README.md): investigación, Leads y notas verificados el 08/10; correo corporativo de Jorge obtenido con Apollo. [Auditoría](../audits/commercial/2026-10-08-jorge-fiorella-intake.md).

- [SKY Staff Augmentation 2026](prospects/sky-staff-augmentation-2026/README.md): cotizaciones enviadas, nota compartida en contacto/deal y siguiente paso.

- [SKY Social Care 2027](prospects/sky-social-care-2027/README.md): solicitud de Jaime del 09/10 por 1.300 respuestas/mes en 13 cuentas; contexto del piloto, nota CRM y cuatro tareas en HubSpot/Notion. Revisión final interna 16/10; propuesta pendiente.

- [Datos confirmados para licitaciones](EFEONCE_DATOS_PARA_LICITACIONES.md): accionista, contacto, datos bancarios y alcance de las declaraciones confirmadas por Julio el 08/10/2026.

- [Agente de seguimiento comercial](follow-up-agent/README.md): revisiones L–V 09:00/16:00 Chile, [registro vivo](follow-up-agent/REGISTRO.md), tareas y borradores en Notion.

- [Segmentos activos de prospección](../documentation/hubspot-as-a-service/prospeccion-segmentos-activos.md): propiedades, catálogo y cierre del alta automática; [manual CLI/MCP](../manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md).

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
| [`EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md`](../strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md) | Narrativa go-to-market Q4 2026 – Q3 2027 «Tu IA no conoce tu negocio»: capítulos, mapa a servicios, arco y reglas de uso |
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

## Workspaces comerciales

- [Socopur — Agencia Digital 2027](tenders/socopur-agencia-marketing-digital-2027/README.md): seguimiento autorizado del 15/10 07:13 Chile enviado sólo a Katherine, con firma gráfica y PDF creativo; EMAIL `118603198768` SENT y asociaciones Contact/Company verificados. Historial 10–13/10 contrastado. Esperar respuesta sobre ingreso tardío y bases; Q&A transcurrido no reabre inscripción. Deal `65871170058` sin cambio de etapa/cierre; sin GO ni próximo envío programado.

- [Oferta económica rápida para licitación / Compra Ágil](templates/cotizacion-a4/README.md): plantilla A4 derivada de UTEM, con slots, JSON y [presentación multimoneda/FX explícito](templates/cotizacion-a4/MULTIMONEDA.md); prepara HTML/PDF desde precio y alcance aprobados. Su guía distingue la emisión documental de una cotización persistida: no crea `quoteId`, no ejecuta pricing/costing ni actualiza CRM o Finance. Para operar el sistema de cotizaciones Greenhouse, seguir [pricing comercial](../documentation/finance/pricing-comercial.md) y el [canon de Finance](../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), verificando runtime vigente.
- [Costeo V3 para roles y servicios con agentes](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md): selección por demanda, recursos base/por tarea, presupuesto IA, capacidad declarada y desglose congelado. La [superficie local](../documentation/finance/cotizador-v3-superficie-implementada.md) y el [handoff canónico](../documentation/finance/cotizador-v3-promocion-canonica.md) separan simulación, revisión comercial y emisión/aprobación en Greenhouse.

- [Revisión amplia LicitaLAB](tenders/licitalab-deep-review-2026-10-07/README.md): todas las categorías solicitadas, vista Todos y búsquedas libres; cobertura y 13 altas verificadas. Nueva señal se califica desde lead; los Deals creados se conservan por instrucción del operador.
- [UTEM — Agencia SEO/AEO](tenders/licitalab-deep-review-2026-10-07/UTEM-5251-1060-COT26-REVISION-2026-10-08.md): originales y anexos firmados en OneDrive; técnica v1.1 y [deck v2 con PDF](../audits/commercial/2026-10-08-utem-deck-propuesta-tecnica.md) hechos; **oferta presentada**, CLP4,8M netos /5,712M con IVA y HubSpot Presentación de soluciones. [Evidencia](tenders/utem-seo-aeo-2026/PRESENTACION-2026-10-08.md); seguimiento de evaluación/resultado.
- [Yanbal](prospects/yanbal-ai-creative-2026/README.md) y [Olivos del Sur](prospects/olivos-del-sur-peru-2026/README.md): investigación y registros asociados, segmentos activos verificados al corte; siguen por calificar, sin outreach.

- [Casos de negocio SEO/AEO](SEO_AEO_BUSINESS_CASE_METHOD_V1.md): método propuesto para evaluar requisitos desde la meta, demanda competitiva por intención, ejecución conjunta SEO/AEO+PR y costo/valor por horizonte; [manual](../manual-de-uso/comercial/construir-caso-negocio-seo-aeo.md) y [lectura funcional](../documentation/comercial/caso-negocio-seo-aeo.md).

- [Venta con demostración contextual](EFEONCE_VENTA_CON_DEMOSTRACION_CONTEXTUAL_V1.md): metodología observada en Berel y SKY y aplicada a Banco Pichincha; diagnóstico, muestra de ejecución, operación y propuesta. Sistematización propuesta, sin atribuir causalidad exclusiva ni cambiar el pipeline.

- [Banco Pichincha / Pibank Perú — propuesta 2027](prospects/banco-pichincha-peru-seo-2026/README.md): reunión del 06/10, caso de negocio y próximos hitos; conserva la preparación histórica de Banco Pichincha y distingue el nuevo mandato Pibank. Moneda y definición de las metas pendientes de confirmación del banco. [Cotización detallada USD/PEN](prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/cotizacion-detallada-2026-10-08/README.md): ambos PDF/HTML en raíz comercial, 19 páginas por moneda; fuente USD y conversión referencial documentada, sin impuestos asumidos ni envío.

- [Berel — App móvil](tenders/berel-app-movil/README.md): expansión de cliente SEO; brief de venta y análisis del lanzamiento de nueva Color Berel, con ASO, creatividad, adquisición, activación y medición. Propuesta interna pendiente de build, alcance y aprobación.

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


## Casos documentales del radar — corte 10-10-2026

- [18 casos investigados en cinco países](tenders/RADAR_CASES_2026-10-10.md): convocatorias, búsquedas privadas, RFI, planes y referencia excluida; métodos de postulación, documentos, próximos pasos y bloqueos. Estudios sin GO ni nuevas mutaciones CRM; Pierre Fabre reutilizado, cierre Aysén actualizado en fuente y GORE preservado.
