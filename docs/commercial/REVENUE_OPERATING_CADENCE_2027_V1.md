# Cadencia Operativa de Revenue 2027 V1

> **Estado:** `Working operating contract · plan blocked by Finance`
> **Owner:** Commercial + Finance + Operations
> **Corte de diseño:** 2026-08-29
> **Autoridad live:** HubSpot para CRM; Finance para revenue, margen y caja

## 1. Propósito

Convertir el presupuesto comercial 2027 en una cadencia ejecutable sin fabricar precisión mensual. El sistema
gobierna dos cuotas independientes:

- **Exit contracted MRR:** USD 30.000–32.000 al cierre de 2027;
- **Spot bookings netos:** USD 90.000 acumulados en 2027.

Una cuota no compensa a la otra. `MRR`, Spot bookings, revenue reconocido y cash se leen por separado. Las
licitaciones/RFP permanecen como `upside` y no cubren la cuota base. Cold outbound permanece como piloto de 90
días hasta pasar sus gates de conversión, deliverability y economics.

## 2. Contrato de lenguaje y medición

La métrica humana es **primeras reuniones realizadas**. Una reunión solamente agendada no cuenta. Cuando una
integración conserve un valor técnico como `held`, éste se presenta al operador como `realizada` y requiere
evidencia de asistencia.

| Capa | Presupuesto | Actual | Forecast | Variance |
| --- | --- | --- | --- | --- |
| Exit MRR | Hito de salida trimestral por escenario | MRR contratado activo verificado en HubSpot + contrato | MRR esperado al cierre con evidencia vigente | `Forecast - Budget` |
| Spot bookings | Hito acumulado trimestral por escenario | Bookings netos firmados con quote/SOW/OC/contrato | Bookings esperados al cierre con evidencia vigente | `Forecast - Budget` |
| Revenue | Modelo mensual de Finance | Revenue reconocido por Finance | Timing contractual vigente | `Forecast - Budget Finance` |
| Margen | 45% mínimo; 50–60% objetivo | Gross profit certificado por engagement | Margen esperado según cost-to-serve | `Forecast - Budget` |
| Cash | DSO objetivo 30–45 días | Caja y DSO de Treasury/Finance | Cobro esperado según términos | `Forecast - Budget` |

`Actual` nunca se completa desde este documento ni desde el cockpit. Se lee de la autoridad live durante el cierre
y conserva fecha de corte. `Unknown`, `provisional`, `blocked` y `upside` no se convierten en cero.

## 3. Scorecard mensual

### Resultados y cobertura

| Métrica | Presupuesto / control | Fuente actual | Owner |
| --- | --- | --- | --- |
| Exit contracted MRR | Hito trimestral del escenario activo | HubSpot + contrato | Commercial |
| Spot bookings netos | Hito trimestral acumulado | HubSpot + quote/SOW/OC/contrato | Commercial |
| Expansion MRR coverage | 3× para USD 6–7k MRR | HubSpot | Commercial |
| New-logo recurring coverage | 4× para USD 12–15k MRR | HubSpot | Commercial |
| Spot directo/warm coverage | 4× para USD 90k bookings | HubSpot | Commercial |
| Licitaciones/RFP | Upside; sin cuota base | HubSpot + registro de licitaciones | Commercial |
| Revenue, margen, cash y DSO | Modelo mensual aprobado | Finance / Treasury | Finance |

### Funnel y capacidad controlables

| Métrica | Control mensual | Regla |
| --- | ---: | --- |
| Primeras reuniones realizadas | 8–10 | Evidencia de asistencia; no sólo agenda |
| Oportunidades calificadas nuevas | 4–5 | Fit, problema, buying group y próximo paso |
| Propuestas / SOW | 2–3 | Scope y economics revisados |
| Negociaciones avanzadas | 1–2 | Decision process y siguiente paso bilateral |
| Oportunidades calificadas activas | 12–18 | Sin stale deals ni duplicados de Company |
| Propuesta o negociación activa | 4–6 | Fecha y owner vigentes |
| Venta humana protegida | 10–12 h/semana | Discovery, propuesta, negociación y expansión |
| Commercial Systems Operations | 4–6 h/semana en piloto | CRM, cohortes, approvals, QA y reporting |

## 4. Calendario operativo 2027

Los meses definen foco y gates de revisión. Los números de resultado siguen siendo hitos trimestrales acumulados;
no son una cuota mensual lineal.

| Mes | Foco operativo | Gate de salida |
| --- | --- | --- |
| Enero | Rebasar Opening MRR; reconciliar contratos, pipeline y owners | Baseline fechado; brechas Finance con owner |
| Febrero | Activar expansión y repetición; mapear buying groups prioritarios | Próximo paso bilateral en cuentas foco |
| Marzo | Cierre Q1 y reforecast | Objetivo: USD 16k Exit MRR; USD 15k Spot acumulado |
| Abril | Reponer coverage recurrente y Spot; revisar capacidad de Q2 | Coverage por motion y owner de delivery |
| Mayo | Convertir diagnósticos y proof en propuestas | Propuestas con scope, margen y decision process |
| Junio | Cierre Q2 y reforecast de semestre | Objetivo: USD 21k Exit MRR; USD 35k Spot acumulado |
| Julio | Recalibrar ICP, ofertas, win rate y concentración | Brechas del segundo semestre con acción fechada |
| Agosto | Acelerar new-logo recurrente y Spot delegable | Capacidad reservada antes de promover a commit |
| Septiembre | Cierre Q3 y plan de contratos Q4 | Objetivo: USD 26k Exit MRR; USD 60k Spot acumulado |
| Octubre | Proteger renovaciones y completar cobertura de salida | Riesgo por cuenta, term y decisión reconciliados |
| Noviembre | Cerrar acuerdos con inicio viable y caja protegida | Contrato/OC, owner, anticipo y capacidad |
| Diciembre | Cierre anual, lecciones y presupuesto 2028 | USD 30–32k Exit MRR; USD 90k Spot; actuals Finance |

## 5. Ritmo semanal

| Momento | Ritual | Resultado obligatorio |
| --- | --- | --- |
| Lunes | Pipeline control · 45 min | Coverage, gap, stale deals, next step, owner y fecha |
| Martes y jueves | Bloques protegidos de venta | Primeras reuniones realizadas, discovery, propuesta y negociación |
| Miércoles | Expansión, partners y proof | Multithreading, referidos, co-selling y activo de prueba |
| Viernes | Forecast hygiene · 30 min | Categoría, `closedate`, capacidad, riesgos y cola de errores |
| Continuo | Reply y exception SLA | Respuesta en un día hábil; errores CRM resueltos en 48 h |

La actividad no fría conserva el baseline mensual del plan de pipeline: 2 reuniones de expansión, 6–8 contactos
con stakeholders, 6–8 solicitudes de referidos, 20–30 mensajes warm personalizados, 2 revisiones con HubSpot, 2
conversaciones con partners, 1 activo de prueba, 2 piezas de punto de vista y 2–3 propuestas/SOW.

## 6. Cierre mensual

| Ventana | Responsable | Readback / decisión |
| --- | --- | --- |
| Último día hábil | Commercial Systems Operator | Corte HubSpot; associations, stages, amount, MRR, dates y next steps |
| Días hábiles 1–2 | Commercial | Reconciliar actuals, forecast, coverage, funnel y horas del fundador |
| Día hábil 3 | Finance + Operations | Revenue, margen, cash, DSO, cost-to-serve, backlog y capacidad |
| Día hábil 4 | Pipeline council | Decidir `advance | hold | repair | exclude | reforecast` por excepción |
| Día hábil 5 | Commercial owner | Publicar scorecard fechado y acciones; no reescribir el Budget |

## 7. Pipeline council

### Contrato

- **Frecuencia:** semanal, 45 minutos; cierre ampliado mensual de 60 minutos.
- **Participantes mínimos:** Julio/Commercial, Commercial Systems Operator y owner de delivery cuando aplique.
- **Participantes mensuales:** Finance/Treasury y Operations.
- **Inputs:** readback HubSpot, scorecard, capacidad, economics, cohortes y excepciones.
- **Unidad de decisión:** Deal u oportunidad de cuenta; nunca una fila sin identidad canónica.

### Agenda semanal

1. Brecha de las dos cuotas y coverage por motion.
2. Excepciones: stale, sin contacto, sin next step, fecha vencida o asociación dudosa.
3. Deals en propuesta/negociación: decision process, capacidad, margen y acción bilateral.
4. Cohortes outbound: deliverability, respuestas positivas, primeras reuniones realizadas y oportunidades.
5. Decisiones, owner y fecha; todo cambio CRM se ejecuta por el writer gobernado y se relee.

### Salida mínima

| Campo | Regla |
| --- | --- |
| `decision` | `advance | hold | repair | exclude | reforecast` |
| `rationale` | Evidencia breve, no intuición no atribuida |
| `owner` | Una persona accountable |
| `next_step` | Acción concreta y bilateral cuando corresponda |
| `next_step_date` | Fecha vigente |
| `authority` | HubSpot, Finance, contrato u otra fuente exacta |
| `readback_at` | Fecha/hora de verificación del estado final |

## 8. Piloto cold outbound de 90 días

El piloto usa meses relativos `M1 | M2 | M3`, no se presume que comience en enero. Cold outbound no carga cuota
base durante la validación.

| Cohorte | Cuentas | Contactos | Emails | Decisión |
| --- | ---: | ---: | ---: | --- |
| M1 | 30 | 90 | 300–350 | `revise | continue` |
| M2 | 50 | 150 | 500–600 | `stop | revise | continue` |
| M3 | 70 | 210 | 700–850 | `stop | revise | certify` |

La certificación exige, al día 90, al menos 4 primeras reuniones realizadas, 2 oportunidades calificadas, 1
propuesta y USD 25k de pipeline calificado, además de deliverability sana y economics medidos. La señal `go` es
7–10 primeras reuniones realizadas, 3–5 oportunidades y USD 40–80k de pipeline. Más volumen no sustituye una
tesis débil.

## 9. Gobierno

- HubSpot conserva Companies, Contacts, Deals, stages, forecast y actividad live.
- Finance conserva revenue, costos, margen, cash y DSO.
- El cockpit `efeonce-revenue` proyecta el contrato; no almacena actuals live ni sustituye las autoridades.
- Cada cambio al plan actualiza primero el documento dueño y después la proyección con versión y corte.
- La publicación mensual conserva `Budget`, `Actual`, `Forecast` y `Variance`; el reforecast no borra la meta.

## 10. Fuentes

- [`COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md`](COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md)
- [`PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md`](PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md)
- [`AGENTIC_REVENUE_OPERATING_MODEL_V1.md`](AGENTIC_REVENUE_OPERATING_MODEL_V1.md)
- [`SALES_GOALS_OPERATING_MODEL_V1.md`](SALES_GOALS_OPERATING_MODEL_V1.md)
- HubSpot live y Finance al momento de cada cierre

## 11. Change log

| Fecha | Cambio | Estado |
| --- | --- | --- |
| 2026-08-29 | Primera versión: calendario, scorecard, cierre mensual, pipeline council y piloto outbound | `Working operating contract · plan blocked by Finance` |
