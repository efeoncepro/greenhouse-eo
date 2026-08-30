# Plan Comercial y Presupuesto de Ventas 2027 V1

> **Estado:** `Proposed for approval · blocked_by_finance`
> **Owner:** Leadership + Commercial + Finance
> **Moneda de gestión:** USD
> **Corte de planificación:** 2026-08-29
> **Meta gobernante:** [`SALES_GOALS_2026_Q4_2027.md`](SALES_GOALS_2026_Q4_2027.md)
> **Método:** [`SALES_GOALS_OPERATING_MODEL_V1.md`](SALES_GOALS_OPERATING_MODEL_V1.md)
> **Generación de demanda:** [`PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md`](PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md)
> **Operating model agentic:** [`AGENTIC_REVENUE_OPERATING_MODEL_V1.md`](AGENTIC_REVENUE_OPERATING_MODEL_V1.md)

## 1. Propósito

Traducir la meta comercial 2027 en un presupuesto operable y revisable. Este artefacto separa las dos bandas de
crecimiento de Efeonce:

1. **MRR contratado:** estabilidad, retención, capacidad planificable y expansión durable.
2. **Spot / On-Demand:** caja, proof, entrada a nuevas cuentas y compras repetidas por proyecto.

Las cuotas son independientes. Superar Spot no corrige una brecha de MRR y superar MRR no corrige una brecha de
bookings o caja. El resultado corporativo se reconcilia después mediante revenue de servicio reconocido, gross
profit y cash collected.

## 2. Contrato de medición

| Capa       | Métrica de presupuesto                                       | Fuente de actual                | Regla                                               |
| ---------- | ------------------------------------------------------------ | ------------------------------- | --------------------------------------------------- |
| Recurrente | Exit contracted MRR, gross new MRR, expansion MRR, GRR y NRR | HubSpot + contrato              | No se presenta como ARR SaaS                        |
| Spot       | bookings netos firmados                                      | HubSpot + quote/SOW/OC/contrato | No prueba delivery, revenue ni cobro                |
| Revenue    | revenue de servicio reconocido                               | Finance                         | Se reconoce según obligación y aceptación aplicable |
| Margen     | gross profit y contribution margin                           | Finance + cost-to-serve         | Se mide por engagement y lane                       |
| Caja       | cash collected, DSO y anticipos                              | Finance/Treasury                | Cobro no equivale a revenue reconocido              |

IVA, inversión de medios, derechos, providers y otros pass-through quedan fuera del revenue de servicio y de las
cuotas netas. La comisión HubSpot se conserva separada del MRR de licencias vendido al cliente y del service MRR.

## 3. Inputs de planificación

| Input                                   |                                      Valor | Confianza / tratamiento                                        |
| --------------------------------------- | -----------------------------------------: | -------------------------------------------------------------- |
| Baseline MRR actual                     |                                 USD 11.258 | Provisional; reconciliar con contrato y Finance                |
| Valor recurrente anualizado actual      |                                USD 135.096 | Métrica de gestión; no revenue reconocido futuro garantizado   |
| Spot observado 2026                     |                           USD 9.600 aprox. | Dos proyectos comparables; benchmark, no cuota automática      |
| Potencia observada de referencia        |                                USD 144.696 | `MRR × 12 + Spot observado`; sólo denominador de planificación |
| Downside de churn/contracción           |                         5% del opening MRR | Se reemplaza por riesgo aprobado al inicio del periodo         |
| Reconocimiento Spot usado en escenarios |                       90% de bookings 2027 | Hipótesis de timing; Finance reemplaza por forecast real       |
| Tiempo comercial                        | 12 h/semana base; 20 h/semana aspiracional | Fines de semana no forman capacidad estructural                |

El Opening MRR se rebasa con el valor real del 1 de enero de 2027. El target de Exit MRR no cambia silenciosamente:
si Q4 2026 mejora o deteriora el opening, cambia la cuota bruta y se registra el reforecast.

## 4. Presupuesto anual por bandas

| Banda                       | Compromiso |              Objetivo |     Stretch |
| --------------------------- | ---------: | --------------------: | ----------: |
| Exit contracted MRR         | USD 28.000 | **USD 30.000–32.000** |  USD 34.000 |
| Múltiplo sobre baseline MRR |      2,49× |        **2,66–2,84×** |       3,02× |
| Spot bookings netos         | USD 60.000 |        **USD 90.000** | USD 120.000 |
| GRR                         |        95% |              **≥95%** |        100% |
| Gross margin por engagement | 45% mínimo |            **50–60%** |        ≥55% |
| MRR nuevo no-SKY            |       ≥55% |              **≥65%** |        ≥70% |

La meta operativa central es **USD 30.000–32.000 de Exit MRR y USD 90.000 de Spot bookings**. El compromiso protege
un resultado aceptable si ANAM/Aguas no repiten o si una expansión se desplaza; el stretch no entra al forecast sin
cobertura, capacidad y economics suficientes.

## 5. Bridge del objetivo MRR

Bridge de planificación hacia USD 30.000, usando el baseline actual como opening provisional:

| Componente                    |                MRR |
| ----------------------------- | -----------------: |
| Opening MRR provisional       |         USD 11.258 |
| Downside 5% churn/contracción |           USD -563 |
| Expansión SKY                 |          USD 5.000 |
| Expansión Berel               |          USD 1.500 |
| Incremento comisión HubSpot   |            USD 300 |
| New-logo recurring            |         USD 12.505 |
| Motogas expansion             |              USD 0 |
| ANAM/Aguas Managed Ops        | USD 0 en caso base |
| **Exit MRR objetivo**         |     **USD 30.000** |

Para cerrar en USD 32.000, el new-logo recurring sube aproximadamente a USD 14.505 si los demás componentes se
mantienen. Esto equivale a tres clientes nuevos de USD 4.000–5.000 MRR o cuatro de USD 3.000–4.000 MRR.

### Tratamiento por cuenta

| Cuenta        | Banda 2027                |                             Presupuesto | Regla de control                                                     |
| ------------- | ------------------------- | --------------------------------------: | -------------------------------------------------------------------- |
| SKY           | Retención + expansión MRR |         USD 4.000–5.000 MRR incremental | No contar propuestas abiertas sin term, decisión y MRR reconciliados |
| Berel         | Retención + expansión MRR |         USD 1.000–2.000 MRR incremental | Vender scope adyacente con owner y economics propios                 |
| Motogas       | Retención                 |                      USD 0 de expansión | Proteger relación; reajuste sólo por economics, no para llenar cuota |
| ANAM          | Spot warm/repeat          |              USD 10.000–15.000 bookings | MRR sólo con backlog mensual, owner, cadencia y presupuesto          |
| Aguas Andinas | Spot warm/repeat          |              USD 10.000–15.000 bookings | MRR sólo con backlog mensual, owner, cadencia y presupuesto          |
| HubSpot       | Comisión + canal          | USD 200–500 MRR incremental como upside | No usar comisión para ocultar brecha de service MRR                  |

Una serie de proyectos bajo MSA, SOWs sucesivos o call-off puede ser un buen modelo para ANAM/Aguas. La conversión a
Managed Ops es upside; no es requisito para considerar exitosa la relación.

## 6. Composición del objetivo Spot

| Fuente / familia                               | Bookings objetivo | Dependencia principal                                 |
| ---------------------------------------------- | ----------------: | ----------------------------------------------------- |
| ANAM + Aguas Andinas, compras repetidas        |        USD 25.000 | Presupuesto, timing y siguiente proyecto verificables |
| Creative / Design / Production Sprints         |        USD 35.000 | Creative Operations Lead y capacidad delegada         |
| Search / SEO / AEO / Web / Measurement acotado |        USD 12.500 | Scope cerrado y disponibilidad técnica                |
| RevOps / CRM / Agents fuera de ANAM/Aguas      |        USD 17.500 | Máximo founder-heavy y ticket suficiente              |
| **Spot bookings objetivo**                     |    **USD 90.000** | —                                                     |

Guardrails:

- 7–10 cierres, con ticket medio ganado de aproximadamente USD 9.000–12.000;
- máximo cuatro proyectos técnicos founder-heavy de aproximadamente 40 horas cada uno;
- al menos 50–60% de bookings con delivery delegado o owner distinto del fundador;
- cada proyecto es rentable por sí solo; una posible conversión a MRR no subsidia margen insuficiente;
- anticipo recomendado 50% y cobro por hitos, por ejemplo 50/40/10, sujeto al contrato aprobado.

## 7. Pacing trimestral

Los valores son hitos acumulados. No convierten cierres irregulares en cuotas mensuales artificialmente lineales.

| Quarter | Exit MRR compromiso | Exit MRR objetivo | Exit MRR stretch | Spot acumulado compromiso | Spot acumulado objetivo | Spot acumulado stretch |
| ------- | ------------------: | ----------------: | ---------------: | ------------------------: | ----------------------: | ---------------------: |
| Q1      |          USD 15.000 |        USD 16.000 |       USD 17.000 |                USD 10.000 |              USD 15.000 |             USD 20.000 |
| Q2      |          USD 19.000 |        USD 21.000 |       USD 23.000 |                USD 25.000 |              USD 35.000 |             USD 50.000 |
| Q3      |          USD 24.000 |        USD 26.000 |       USD 29.000 |                USD 42.000 |              USD 60.000 |             USD 85.000 |
| Q4      |          USD 28.000 | USD 30.000–32.000 |       USD 34.000 |                USD 60.000 |              USD 90.000 |            USD 120.000 |

Cada cierre modifica el pacing esperado de revenue según su mes de inicio. La revisión mensual conserva target,
actual y forecast por separado.

## 8. Pipeline requerido

| Motion             | Resultado objetivo | Coverage |      Pipeline calificado requerido |
| ------------------ | -----------------: | -------: | ---------------------------------: |
| Expansión MRR      |    USD 6.000–7.000 |       3× |              USD 18.000–21.000 MRR |
| New-logo recurring |  USD 12.000–15.000 |       4× |              USD 48.000–60.000 MRR |
| Spot directo/warm  |         USD 90.000 |       4× |               USD 360.000 bookings |
| Licitaciones/RFP   |     Sin cuota base |      10× | Upside hasta pasar todos los gates |

Volumen de control anual aproximado:

- 4–6 oportunidades de expansión;
- 12–20 oportunidades recurrentes new-logo;
- 30–40 oportunidades Spot calificadas;
- 35–45 journeys comerciales únicos, porque un diagnóstico o sprint puede abrir después una oportunidad recurrente;
- 3–4 oportunidades calificadas nuevas por mes en promedio.

## 9. Resultado corporativo esperado

El resultado no se obtiene sumando MRR y Spot sin período. Se reportan dos lecturas:

```text
Revenue reconocido 2027
= recurrente reconocido mes a mes
+ Spot reconocido por Finance

Potencia comercial de salida
= Exit MRR × 12
+ Spot anual repetible esperado
```

La potencia comercial de salida es una métrica de planificación y nunca se presenta como ARR.

| Escenario                       | Revenue 2027 estimado | Múltiplo reconocido | Potencia comercial de salida | Múltiplo de salida |
| ------------------------------- | --------------------: | ------------------: | ---------------------------: | -----------------: |
| Compromiso: 28k MRR + 60k Spot  |    USD 290.000 aprox. |               2,00× |                  USD 396.000 |              2,74× |
| Objetivo: 30–32k MRR + 90k Spot |   USD 329.000–341.000 |          2,27–2,35× |          USD 450.000–474.000 |         3,11–3,28× |
| Stretch: 34k MRR + 120k Spot    |    USD 380.000 aprox. |               2,62× |                  USD 528.000 |              3,65× |

Las estimaciones asumen ramp lineal del MRR desde USD 11.258 y reconocimiento del 90% del Spot en 2027. No son un
forecast contable y se reemplazan por el modelo mensual de Finance cuando exista timing contractual.

## 10. Economics, capacidad y caja

El presupuesto permanece `blocked_by_finance` hasta cerrar:

1. remuneración sombra y fully loaded cost del fundador;
2. fully loaded cost del equipo, provisiones, licencias, providers, soporte y coordinación;
3. cost-to-serve y horas por oferta/cuenta;
4. gross margin mínimo 45%, objetivo 50–60%;
5. contribution margin posterior al costo sombra del fundador de al menos 20%;
6. DSO objetivo de 30–45 días y retainers facturados por adelantado cuando el contrato lo permita;
7. capacidad reservada para MRR antes de aceptar picos Spot.

No se modelan fines de semana como capacidad estable. Una contratación fija se activa sólo contra USD 8.000–12.000
de MRR firmado o 8–12 semanas de backlog cobrado, además de aprobación de Leadership y Finance.

La capacidad comercial se cubre primero por función: 10–12 horas de venta humana más 4–6 horas de Commercial Systems
Operations en piloto. El stack agentic puede postergar un SDR/AE, pero no elimina el owner humano de aprobaciones,
excepciones, deliverability y CRM. Los triggers de staffing viven en
[`AGENTIC_REVENUE_OPERATING_MODEL_V1.md`](AGENTIC_REVENUE_OPERATING_MODEL_V1.md).

## 11. Forecast y control presupuestario

### Semanal — Commercial

- actualizar coverage, gap, próximo paso, `closedate` y forecast category;
- revisar por separado `expansion recurring | new-logo recurring | spot | strategic bet`;
- reconciliar capacidad antes de promover un Deal a `commit`.

### Mensual — Commercial + Finance + Operations

| Campo    | Uso                                                                  |
| -------- | -------------------------------------------------------------------- |
| Budget   | Meta original aprobada; no se reescribe para coincidir con actual    |
| Actual   | Closed-won, MRR activo, bookings, revenue, margen y cash verificados |
| Forecast | Resultado esperado al cierre según evidencia vigente                 |
| Variance | `Actual/Forecast - Budget`, con explicación y acción                 |

La revisión mensual incluye MRR bridge, Spot bookings, revenue reconocido, gross profit, cash collected, DSO,
founder hours, backlog en semanas, desviación de horas y concentración por cliente.

El calendario, scorecard, ventanas de cierre y contrato del pipeline council viven en
[`REVENUE_OPERATING_CADENCE_2027_V1.md`](REVENUE_OPERATING_CADENCE_2027_V1.md). Ese contrato añade leading
indicators y rituales; no convierte los hitos trimestrales en cuotas mensuales lineales.

### Trimestral — reforecast

- recalibrar win rate por motion, familia y relación;
- actualizar timing de revenue y cobro sin alterar la cuota histórica;
- mover una hipótesis a caso base sólo con evidencia de compra, capacidad y economics;
- registrar valor anterior, nuevo forecast, motivo, owner y fecha.

## 12. Horizonte 2028

No forma parte del presupuesto aprobado 2027; conserva la dirección de largo plazo.

| Escenario 2028 |   Exit MRR |       Spot bookings | Potencia comercial de salida |
| -------------- | ---------: | ------------------: | ---------------------------: |
| Compromiso 4×  | USD 45.000 |         USD 120.000 |                  USD 660.000 |
| Stretch 5×     | USD 56.000 | USD 150.000–180.000 |          USD 822.000–852.000 |

El compromiso 2028 requiere pods operativos y margen probado. El stretch exige dos pods, delegación real de
SEO/RevOps, cobertura suficiente y fundador fuera del delivery repetitivo.

## 13. Aprobaciones y cierre de unknowns

| Decisión                        | Owner                        | Gate                                           |
| ------------------------------- | ---------------------------- | ---------------------------------------------- |
| Targets commit/objetivo/stretch | Leadership + Commercial      | Aprobación fechada                             |
| Founder shadow compensation     | Leadership + Finance         | Política y costo mensual cargado al modelo     |
| Margen por oferta y cuenta      | Finance + Pricing + práctica | Fully loaded cost y pass-through reconciliados |
| Capacidad/onboarding slots      | Operations + práctica        | Horas, owner, ramp y backlog visibles          |
| Modelo mensual de revenue/cash  | Finance                      | Timing contractual, facturación, DSO y cobro   |
| Rebase de Opening MRR           | Commercial + Finance         | Contratos activos al 2027-01-01                |

## 14. Change log

| Fecha      | Cambio                                                                                                  | Estado                                       |
| ---------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 2026-08-29 | Se añade contrato Budget-to-Cadence con scorecard, cierre mensual y pipeline council                    | `Proposed for approval · blocked_by_finance` |
| 2026-08-29 | Se enlaza capacidad comercial por función y staffing condicionado del Agentic Revenue Pod              | `Proposed for approval · blocked_by_finance` |
| 2026-08-29 | Se adopta el nombre `Plan Comercial y Presupuesto de Ventas`; se enlaza el modelo operativo de pipeline | `Proposed for approval · blocked_by_finance` |
| 2026-08-29 | Primera versión: presupuesto dual MRR + Spot y horizonte 2028                                           | `Proposed for approval · blocked_by_finance` |
