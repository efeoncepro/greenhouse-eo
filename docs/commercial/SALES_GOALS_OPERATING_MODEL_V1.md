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

## 5. Moneda y FX

- La moneda principal de metas es USD, consistente con la moneda de compañía de HubSpot.
- El Deal conserva siempre su moneda contractual original.
- Para cumplimiento comercial se usa `amount in company currency`/conversión de HubSpot cuando esté disponible y
  verificada.
- UF, CLP y MXN conservan valor original; toda conversión auxiliar registra fuente y fecha.
- No se reescribe una meta histórica por una variación posterior de FX.
- IVA e impuestos trasladables no forman parte de bookings netos ni MRR neto de gestión.

## 6. Categorías de forecast

| Categoría   | Significado                                                             | Condición mínima                                                  |
| ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `commit`    | Existe evidencia suficiente para esperar el cierre en el periodo        | Todos los gates de §7 pasan                                       |
| `best_case` | Puede cerrar en el periodo, pero conserva uno o más riesgos materiales  | Próximo paso bilateral y proceso activos; gate faltante explícito |
| `upside`    | Oportunidad real, todavía temprana o con bajo control                   | No financia la meta base                                          |
| `excluded`  | Stale, administrativa, no-fit, sin autoridad o sin evidencia suficiente | No entra al forecast                                              |

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

Un campo desconocido es `unknown`, no `true`. Una propuesta preparada pero no enviada no prueba intención de compra.

## 8. Core, Strategic Bets y cobertura

- **Core:** renovación, expansión o negocio con relación/control comercial demostrable. Puede alimentar forecast.
- **Strategic Bet:** cuenta nueva, licitación o proceso con menor control. Es upside hasta pasar el gate completo.
- **Opportunistic/Administrative:** no financia cuota.
- La cobertura se calcula por motion y modalidad; no se mezclan grandes licitaciones tempranas con expansión directa.

La cobertura mínima inicial de planificación es `3×` el gap, pero debe recalibrarse con win rate real por cohorte.

## 9. Capacidad y sostenibilidad

La meta final es:

```text
Meta vendible = min(demanda probable, capacidad entregable, límite de margen/cash)
```

Para trabajo técnico dependiente del fundador se usa el consumo medido, incluyendo dirección, QA y excepciones,
aunque Codex, Claude o Playwright reduzcan horas mecánicas. Una contratación no aprobada no puede sostener el caso
base; se modela sólo en un escenario condicionado.

## 10. Cadencia

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

## 11. Protocolo de cambio

1. Actualiza primero los hechos en HubSpot y verifica el readback.
2. Actualiza [`CRM_DEAL_REGISTER.md`](CRM_DEAL_REGISTER.md) cuando cambie el estado operativo.
3. Actualiza el forecast en el plan vigente con fecha y evidencia.
4. No cambies una meta aprobada para hacer coincidir el actual. Registra `reforecast` o crea una nueva versión.
5. Toda modificación de meta conserva: valor anterior, valor nuevo, motivo, aprobador y fecha efectiva.

## 12. Límites

- HubSpot Professional permite operar revenue goals nativos según la
  [documentación oficial de Goals](https://knowledge.hubspot.com/reports/create-sales-goals) verificada el
  2026-08-29, pero el Exit MRR se mantiene como métrica gobernada y dashboard separado mientras la plantilla nativa
  no represente exactamente su contrato.
- No desarrollar una superficie de metas en Greenhouse durante esta fase.
- Codex y Claude preparan análisis y detectan drift; no reemplazan HubSpot, Finance ni la aprobación de Leadership.
