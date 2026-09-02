# Efeonce Sales Goals Operating Model V1

> **Estado:** `Proposed`
> **Owner:** Leadership + Commercial
> **Moneda principal:** USD
> **Fuente CRM:** HubSpot portal `48713323`
> **Última revisión del método:** 2026-08-29

## 1. Propósito

Definir metas de ventas alcanzables y auditables sin confundir aspiración, forecast, capacidad de entrega ni
contabilidad. Este contrato gobierna cómo Efeonce fija, mide, revisa y cambia sus metas comerciales; las cifras del
periodo viven en [`SALES_GOALS_2026_Q4_2027.md`](SALES_GOALS_2026_Q4_2027.md).
El presupuesto que traduce esas metas a pacing, bridge, pipeline, revenue, caja y control vive en
[`COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md`](COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md). El funnel, los
canales y la actividad necesaria para construir esa cobertura viven en
[`PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md`](PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md).
La mezcla de servicios y su papel económico viven en
[`SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md`](SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md).

## 2. Principios

1. **Meta y forecast son distintos.** La meta declara el resultado buscado; el forecast declara lo que la evidencia
   permite esperar hoy.
2. **Recurrente y On-Demand se miden por separado.** MRR no se suma a bookings de proyecto para producir una cifra
   sin semántica.
3. **Closed-won no es revenue reconocido ni caja.** HubSpot prueba el resultado comercial; Finance conserva factura,
   devengo, cobro y margen.
4. **Relación y control pesan más que modalidad.** Expansión con cliente existente puede ser recurrente u On-Demand;
   una licitación grande no entra al forecast base por su valor nominal.
5. **La capacidad limita la meta vendible.** No se aprueba una cuota cuya entrega dependa estructuralmente de fines de
   semana, horas del fundador no disponibles o contratación todavía no autorizada.
6. **Una cifra perecedera lleva fecha.** FX, pipeline, etapa, actividad, monto y probabilidad deben declarar corte y
   fuente.
7. **La cuota recurrente es bruta y se asigna por motion.** El Exit MRR es el resultado neto; la venta debe cubrir
   además el downside aprobado de churn y contracción.
8. **Cuota y forecast no comparten categorías.** `commit` describe evidencia de Deals, no un nivel aspiracional de la
   meta.
9. **Segmento y servicio son ejes distintos.** Enterprise, mid-market o PYME describen la cuenta; Search, Social,
   Creative, RevOps u otra familia describen lo vendido. Ningún servicio pertenece automáticamente a un segmento.
10. **El portafolio tiene tres papeles económicos.** Recurrencia, caja y validación estratégica se gobiernan con
    métricas distintas; una hipótesis de validación no financia el caso base.
11. **MRR y Spot son bandas independientes.** El sobrecumplimiento de una no compensa automáticamente el
    incumplimiento de la otra; el resultado corporativo se evalúa además por revenue reconocido, gross profit y caja.

## 3. Fuentes de verdad

| Hecho                                                           | Fuente autoritativa                          | Uso de Markdown                          |
| --------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| Deal, owner, stage, amount, currency, close date y asociaciones | HubSpot live                                 | Índice y snapshot fechado                |
| Meta comercial aprobada                                         | Plan de metas vigente                        | Fuente durable de la decisión            |
| Forecast                                                        | HubSpot + evidencia bilateral + plan vigente | Interpretación fechada, revisable        |
| Propuesta, versión, alcance y comité                            | Workspace/propuesta, SharePoint y Teams      | Evidencia enlazada                       |
| Factura, cobro, revenue, costo y margen                         | Finance                                      | No se derivan de `Deal.amount`           |
| Capacidad de delivery                                           | Operations + disponibilidad real             | Constraint del plan, no probabilidad CRM |

## 4. Métricas canónicas

### 4.1 Recurrente

- **Baseline MRR:** MRR contratado activo al inicio del periodo.
- **Exit contracted MRR:** MRR contratado activo al cierre del periodo.
- **Nuevo MRR:** MRR nuevo ganado durante el periodo.
- **Expansión MRR:** aumento del MRR de una cuenta existente.
- **Contracción MRR:** reducción de MRR sin pérdida completa de la cuenta.
- **Churn MRR:** MRR perdido por terminación/no renovación.
- **MRR bridge:**

```text
Exit MRR = Baseline MRR + Nuevo MRR + Expansión MRR - Contracción MRR - Churn MRR
```

No llamar ARR SaaS a la anualización de servicios recurrentes. Cuando sea útil, usar `valor recurrente anualizado`
y conservar la duración contractual real.

### 4.2 On-Demand

- **On-Demand bookings:** valor neto firmado de proyectos acotados durante el periodo.
- **Proyecto ganado:** Deal `closedwon` con quote/SOW/contrato/OC suficiente según el mecanismo de compra.
- **Ticket de referencia:** benchmark de planificación; nunca sustituye el monto real del Deal.

Bookings no prueban delivery iniciado, factura emitida, revenue devengado ni cobro.

### 4.3 Retención

```text
GRR = (Baseline MRR - Contracción MRR - Churn MRR) / Baseline MRR
NRR = (Baseline MRR - Contracción MRR - Churn MRR + Expansión MRR) / Baseline MRR
```

Cada cálculo declara periodo, población, moneda, fuente y fecha de corte.

### 4.4 Partnership y comisión

- El MRR de licencia del cliente y la comisión recurrente de Efeonce son métricas distintas.
- La comisión se registra como `partner commission MRR` sólo mientras exista derecho contractual vigente y evidencia
  del Deal sourced/assisted.
- Implementación, Managed Ops, licencia, pass-through y comisión se reportan por separado para evitar doble conteo.
- Una oportunidad partner exige deal registration y Proof of Involvement cuando el programa aplicable lo requiera.

### 4.5 Campos económicos del Deal

- `Deal.amount` conserva el monto comercial informado en el registro; no demuestra por sí solo MRR, TCV, revenue ni
  caja.
- `contracted_mrr` exige fee recurrente neto, term y versión contractual/propuesta reconciliada.
- `tcv` exige término y componentes incluidos; no se deriva automáticamente de `amount` cuando la semántica es
  desconocida.
- fee de servicio, inversión de medios, provider/pass-through, comisión partner e impuestos se registran por separado.
- Deals de servicios diferentes no se agregan bajo una sola familia sólo porque pertenezcan a la misma cuenta.

## 5. Moneda y FX

- La moneda principal de metas es USD, consistente con la moneda de compañía de HubSpot.
- El Deal conserva siempre su moneda contractual original.
- Para cumplimiento comercial se usa `amount in company currency`/conversión de HubSpot cuando esté disponible y
  verificada.
- UF, CLP y MXN conservan valor original; toda conversión auxiliar registra fuente y fecha.
- No se reescribe una meta histórica por una variación posterior de FX.
- IVA e impuestos trasladables no forman parte de bookings netos ni MRR neto de gestión.

## 6. Categorías de forecast

| Categoría interna | Mapeo HubSpot    | Significado                                                            | Condición mínima                                                  |
| ----------------- | ---------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `commit`          | `Commit`         | Existe evidencia suficiente para esperar el cierre en el periodo       | Todos los gates de §7 pasan                                       |
| `best_case`       | `Best case`      | Puede cerrar en el periodo, pero conserva uno o más riesgos materiales | Próximo paso bilateral y proceso activos; gate faltante explícito |
| `upside`          | `Pipeline`       | Oportunidad real, todavía temprana o con bajo control                  | No financia la meta base                                          |
| `excluded`        | `Not forecasted` | Stale, administrativa, no-fit o sin evidencia suficiente               | No entra al forecast                                              |

La probabilidad de etapa de HubSpot es una señal mecánica; nunca sustituye esta clasificación.

## 7. Gate de oportunidad comercialmente calificada

Una oportunidad puede entrar a `commit` sólo si existe evidencia de:

1. problema/resultado que el cliente reconoce;
2. buyer o buying group identificable;
3. monto y moneda;
4. alcance/oferta y modalidad `recurrente | on_demand | mixta`;
5. criterio y proceso de decisión;
6. paper/procurement process cuando aplique;
7. próximo paso bilateral con owner y fecha;
8. `closedate` vigente y realista;
9. capacidad de entrega y economics no bloqueados;
10. admisibilidad verificada para licitaciones/RFP.

Además, el gate se especializa por motion:

| Motion                       | Evidencia adicional obligatoria                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| Expansión                    | Adopción/valor observado, sponsor, scope incremental, term y trigger de expansión                   |
| Nuevo recurrente             | ICP de oportunidad y delivery, champion, economic buyer, camino al primer valor y capacidad mensual |
| Implementación → Managed Ops | Implementación aceptada, backlog recurrente, cadencia/SOW mensual y owner de adopción               |
| HubSpot partner              | Provider-fit, deal registration, POI, producto/term y clasificación sourced/assisted                |
| On-Demand directo            | Brief, presupuesto, aceptación, slot de delivery y ruta contractual                                 |
| Licitación/RFP               | Admisibilidad, economics, propuesta enviada, decisión fechada y capacidad reservable                |

Un campo desconocido es `unknown`, no `true`. Una propuesta preparada pero no enviada no prueba intención de compra.

## 8. Core, Strategic Bets y cobertura

- **Core:** renovación, expansión o negocio con relación/control comercial demostrable. Puede alimentar forecast.
- **Strategic Bet:** cuenta nueva, licitación o proceso con menor control. Es upside hasta pasar el gate completo.
- **Opportunistic/Administrative:** no financia cuota.
- La cobertura se calcula por motion y modalidad; no se mezclan grandes licitaciones tempranas con expansión directa.

La cobertura se calcula contra el **gap restante del periodo**, nunca contra la cuota original completa después de un
cierre:

```text
pipeline coverage = pipeline calificado abierto / gap restante de cuota
```

Bandas iniciales mientras se construye una muestra más robusta:

| Motion                      |                     Cobertura mínima | Tratamiento                                 |
| --------------------------- | -----------------------------------: | ------------------------------------------- |
| Expansión/Core con relación |                                 `3×` | Puede alimentar base si pasa §7             |
| Trato directo warm/new logo |                                 `4×` | Base sólo con buying group y siguiente paso |
| On-Demand directo           |                                 `4×` | Bookings y capacidad, no MRR                |
| Licitación/RFP              |                                `10×` | Upside hasta pasar el gate completo         |
| Partner/licencia            | `3×` o 2–3 oportunidades comparables | Separado de service MRR                     |

La banda oficial general de HubSpot es una referencia de `3×–6×`; Efeonce usa ratios por motion porque sus cohortes
tienen control y win rates distintos. Strategic Bets no compensan una brecha de Core por su valor nominal.

## 9. Arquitectura de cuota

La cuota recurrente se construye desde el bridge y no desde un Exit MRR aislado:

```text
gross quota = Exit MRR objetivo - Opening MRR + downside de churn/contracción
```

Debe asignarse, como mínimo, entre:

1. expansión recurrente de cuentas existentes;
2. nuevo recurrente o conversión de implementación a operación gestionada;
3. new logo recurrente cuando aplique;
4. partnership/licencia como línea separada;
5. On-Demand bookings como segunda cuota independiente.

La asignación también declara `service_family`, `account_segment` y papel `recurrence | cash | validation`. La cuota
puede combinar varias familias, pero no puede duplicar un mismo Deal entre ellas ni convertir el valor nominal de una
Strategic Bet en cobertura Core.

Una cuota no se considera aprobable sin ICP/anti-ICP, buying group, oferta de entrada, ticket o value metric,
coverage por motion, capacidad y gate de margen. On-Demand no rescata incumplimiento de MRR y MRR no rescata
incumplimiento de bookings.

### 9.1 Presupuesto de ventas

El presupuesto anual es el instrumento de planificación y control que traduce la meta aprobada sin reemplazarla.
Debe contener, como mínimo:

1. `commit | target | stretch` para Exit MRR y Spot bookings;
2. bridge de MRR por retención, expansión, new logo, contracción y churn;
3. composición Spot por cuenta/familia sin doble conteo;
4. pacing trimestral acumulado;
5. coverage y volumen de oportunidades por motion;
6. revenue reconocido, gross profit y cash como capas reconciliadas por Finance;
7. founder hours, capacidad delegable, backlog y triggers de contratación;
8. `budget | actual | forecast | variance` con explicación y acción mensual.

La métrica `Exit MRR × 12 + Spot anual repetible` puede usarse como **potencia comercial de salida** para comparar
escenarios. Nunca se presenta como ARR ni como revenue reconocido del periodo.

## 10. Capacidad y sostenibilidad

La meta final es:

```text
Meta vendible = min(demanda probable, capacidad entregable, límite de margen/cash)
```

Para trabajo técnico dependiente del fundador se usa el consumo medido, incluyendo dirección, QA y excepciones,
aunque Codex, Claude o Playwright reduzcan horas mecánicas. Una contratación no aprobada no puede sostener el caso
base; se modela sólo en un escenario condicionado.

Cada recurrente nuevo declara `founder_hours_per_month`, horas delegables, ramp-up y accountable owner. La capacidad
se valida sobre 46 semanas operativas y no cuenta fines de semana como suministro estructural.

## 11. Indicadores

### Adelantados

- coverage y gap restante por motion;
- buying-group coverage: operador, champion, sponsor/economic buyer, líder técnico y procurement;
- siguiente paso bilateral con owner y fecha;
- cero Deals `commit` con `closedate` vencido;
- renovación cubierta a 120/90/60 días;
- conversión diagnóstico → implementación → operación recurrente a 90/180 días;
- horas de delivery vendidas, comprometidas y disponibles;
- cost-to-serve y margen aprobados antes de propuesta;
- horas comerciales protegidas y realmente ejecutadas.

Llamadas, reuniones y propuestas son diagnósticos de actividad, no cuotas primarias.

### De resultado

- gross new MRR y expansion MRR;
- churn, contracción, Exit MRR, GRR y NRR;
- On-Demand bookings netos y proyectos ganados;
- partner commission MRR, separado de license MRR y service MRR;
- win rate y ciclo por motion;
- margen bruto/contribución y desviación de horas;
- facturación, cobro y DSO, reconciliados por Finance.

## 12. Cadencia

### Semanal

1. Releer HubSpot live y paginación completa.
2. Revisar Deals `commit`, `best_case` y cambios materiales.
3. Confirmar próximo paso, fecha, monto, buyer y bloqueo.
4. Reconciliar capacidad antes de promover una oportunidad.
5. Actualizar el snapshot de forecast del plan vigente.

### Mensual

- cerrar MRR bridge y bookings comerciales;
- revisar forecast contra actual;
- medir cobertura, aging, stale close dates y calidad de datos;
- revisar margen/capacidad con Finance y Operations;
- registrar reforecast sin alterar silenciosamente la meta original.

### Trimestral/anual

- aprobar baseline y metas `base | stretch | conditioned`;
- recalibrar win rates por relación, motion, modalidad y oferta;
- documentar cambios de capacidad;
- versionar cualquier cambio material de meta.

## 13. Protocolo de cambio

1. Actualiza primero los hechos en HubSpot y verifica el readback.
2. Actualiza [`CRM_DEAL_REGISTER.md`](CRM_DEAL_REGISTER.md) cuando cambie el estado operativo.
3. Actualiza el forecast en el plan vigente con fecha y evidencia.
4. No cambies una meta aprobada para hacer coincidir el actual. Registra `reforecast` o crea una nueva versión.
5. Toda modificación de meta conserva: valor anterior, valor nuevo, motivo, aprobador y fecha efectiva.

## 14. Límites

- HubSpot Professional permite operar revenue goals nativos según la
  [documentación oficial de Goals](https://knowledge.hubspot.com/reports/create-sales-goals) verificada el
  2026-08-29, pero el Exit MRR se mantiene como métrica gobernada y dashboard separado mientras la plantilla nativa
  no represente exactamente su contrato.
- Las categorías de forecast se alinean con la
  [documentación oficial de Forecast](https://knowledge.hubspot.com/forecast/set-up-the-forecast-tool), y las bandas
  iniciales consideran la referencia oficial de
  [pipeline coverage](https://www.hubspot.com/glossary/sales-pipeline-coverage), ambas verificadas el 2026-08-29.
- No desarrollar una superficie de metas en Greenhouse durante esta fase.
- Codex y Claude preparan análisis y detectan drift; no reemplazan HubSpot, Finance ni la aprobación de Leadership.
