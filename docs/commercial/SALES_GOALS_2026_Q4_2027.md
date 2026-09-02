# Efeonce Sales Goals — Q4 2026 y metas trimestrales 2027

> **Estado:** `Proposed for approval`
> **Owner:** Julio Reyes Rangel / Commercial
> **Corte de evidencia:** 2026-08-29
> **Moneda principal:** USD
> **Método:** [`SALES_GOALS_OPERATING_MODEL_V1.md`](SALES_GOALS_OPERATING_MODEL_V1.md)
> **Arquitectura de portafolio:** [`SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md`](SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md)
> **Plan y presupuesto 2027:** [`COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md`](COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md)
> **Generación de pipeline:** [`PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md`](PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md)

## 1. Decisión

La meta opera con dos bandas independientes: MRR contratado y Spot/On-Demand bookings. La primera construye
estabilidad y capacidad planificable; la segunda construye caja, proof y entrada a cuentas. Ninguna compensa el
incumplimiento de la otra. Los servicios emergentes permanecen en un carril de validación sin cuota base.

```text
proteger MRR actual
+ una expansión recurrente
+ dos proyectos On-Demand trimestrales
= meta Q4 base
```

La relación/control comercial pesa más que la modalidad: expansión recurrente de una cuenta existente es hoy la
oportunidad más probable; un proyecto On-Demand warm es más defendible que un retainer o licitación fría.

## 2. Baseline recurrente

Valores de gestión provisionales; requieren reconciliación periódica con contrato, HubSpot y Finance.

| Fuente           | Contrato/condición                                                     | MRR USD aproximado |
| ---------------- | ---------------------------------------------------------------------- | -----------------: |
| SKY              | CLP 6.902.000 mensuales con IVA; neto CLP 5.800.000                    |              6.078 |
| Berel            | MXN 57.000 mensuales; exportación sin IVA                              |              3.302 |
| Motogas          | CLP 1.417.000 mensuales; tratamiento fiscal pendiente de formalización |              1.584 |
| Comisión HubSpot | USD 882 trimestrales                                                   |                294 |
| **Baseline MRR** |                                                                        |         **11.258** |

El valor recurrente anualizado provisional es USD 135.100. No equivale a ARR SaaS ni a revenue reconocido.

## 3. Evidencia On-Demand

En agosto de 2026 se cobraron dos proyectos comparables de 108 UF netas cada uno, asociados a RevOps y Customer
Agent/Agents Managed.

- Ticket de planificación: `108 UF ≈ USD 4.813` al FX de referencia usado el 2026-08-29.
- Consumo medido: aproximadamente 40 horas del fundador por proyecto, aun con Codex y Playwright.
- Dos proyectos por trimestre: 80 horas, aproximadamente 6,2 horas semanales.
- Tres proyectos por trimestre: 120 horas, aproximadamente 9,2 horas semanales.

El ticket y la conversión USD son benchmarks, no sustituyen el monto/FX real de cada Deal.

## 4. Metas Q4 2026

| Indicador                  |                   Base |             Stretch | Regla                                             |
| -------------------------- | ---------------------: | ------------------: | ------------------------------------------------- |
| Retención del baseline MRR |               **100%** |                100% | Churn objetivo `0`                                |
| Exit MRR                   |         **USD 14.258** |          USD 17.258 | Baseline + nuevo MRR, antes de churn/contracción  |
| Nuevo MRR                  |          **USD 3.000** |           USD 6.000 | Uno o dos cierres recurrentes                     |
| Cierres recurrentes        |                  **1** |                   2 | Deben pasar el gate comercial                     |
| Proyectos On-Demand        |                  **2** |                   3 | 40 horas aproximadas por proyecto                 |
| Bookings On-Demand         | **216 UF ≈ USD 9.600** | 324 UF ≈ USD 14.400 | Neto, separado del MRR                            |
| Tiempo comercial protegido |        **12 h/semana** |         20 h/semana | No se modelan fines de semana como capacidad base |

### Cobertura mínima a construir

| Motion                   |                Gap base |                                       Cobertura inicial |
| ------------------------ | ----------------------: | ------------------------------------------------------: |
| Expansión/nuevo MRR Core |               USD 3.000 |                      USD 9.000 de MRR calificado (`3×`) |
| On-Demand directo/warm   |                  216 UF |                   864 UF de bookings calificados (`4×`) |
| Licitación/RFP           | No financia el gap base | `10×` y permanece `upside` hasta pasar el gate completo |

La cobertura no cuenta un Deal sin buyer, monto, próximo paso bilateral, fecha realista y capacidad. Strategic Bets
se reportan aparte.

## 5. Forecast al corte 2026-08-29

| Oportunidad                                                                                            | Modalidad                        | Evidencia                                                               | Probabilidad ajustada | Forecast    | Bloqueo principal                                                         |
| ------------------------------------------------------------------------------------------------------ | -------------------------------- | ----------------------------------------------------------------------- | --------------------: | ----------- | ------------------------------------------------------------------------- |
| [SKY Blog SEO/AEO · `62535094842`](https://app.hubspot.com/contacts/48713323/record/0-3/62535094842)   | Recurrente                       | Preselección, ronda 2, propuesta técnica/económica y relación existente |                50–60% | `best_case` | Sin adjudicación/OC; `closedate` stale; versión económica por reconciliar |
| [SKY Content Lead · `56545045884`](https://app.hubspot.com/contacts/48713323/record/0-3/56545045884)   | Recurrente potencial             | Piloto y caso de negocio                                                |                30–45% | `upside`    | Perfil ejecutor falló; sin decisión, MRR, term ni próximo paso            |
| [SKY Social Care · `56549453888`](https://app.hubspot.com/contacts/48713323/record/0-3/56549453888)    | Recurrente potencial             | Piloto y caso de negocio                                                |                20–35% | `upside`    | Timing incierto y capacidad adicional dedicada                            |
| [Brightcell Landing · `63308560391`](https://app.hubspot.com/contacts/48713323/record/0-3/63308560391) | On-Demand                        | Artefacto interno, sin prueba de envío                                  |                  <10% | `excluded`  | Sin monto, contacto, actividad y fecha vigente                            |
| Licitaciones/RFP abiertos                                                                              | Principalmente On-Demand o mixto | Procesos en evaluación                                                  |         No comparable | `upside`    | Bajo control, admisibilidad/capacidad/economics y contacto incompletos    |

### Lectura del forecast

- El único negocio cercano a cierre es SKY Blog; no pasa todavía a `commit`.
- HubSpot contiene 33 Deals abiertos, pero el volumen On-Demand nominal está dominado por licitaciones tempranas.
- Ningún Deal abierto tenía `hs_mrr`, `hs_arr` o `hs_next_step` poblado al corte.
- Había `closedate` vencidos, oportunidades sin monto, 26 Deals sin contactos y ninguna próxima actividad futura
  confiable.
- `Weighted amount` no es forecast defendible mientras persistan estas brechas.

### Conflicto económico a resolver en SKY

- El readback live del Deal SKY Blog `62535094842` registra `amount = CLP 72.000.000`; `hs_mrr`, `hs_arr` y `hs_tcv`
  están vacíos.
- El Deal separado SKY Content Lead `56545045884` registra `amount = CLP 18.000.000` y tampoco contiene MRR/ARR/TCV.
- La suma nominal aproximada de USD 97.110 corresponde a esos dos Deals. No es SEO MRR, TCV verificado, revenue
  reconocido ni caja.
- Artefactos internos conservan versiones de CLP 124.800.000 por 24 meses, CLP 5.200.000 mensuales y una alternativa
  de CLP 3.000.000 netos mensuales.
- Hasta verificar cuál versión recibió/evalúa el comprador y poblar term/MRR de forma consistente, no se atribuye MRR
  exacto al forecast.

## 6. Contexto de probabilidad

| Modalidad histórica observada en HubSpot | Ganados | Perdidos | Win rate aproximado |
| ---------------------------------------- | ------: | -------: | ------------------: |
| Trato directo                            |      10 |       23 |               30,3% |
| Licitación                               |       3 |       26 |               10,3% |
| Compra ágil                              |       0 |        8 |                  0% |
| Partnership registrado                   |       0 |        2 |                  0% |

Esta tabla no equivale a recurrente vs. On-Demand; respalda que relación y control comercial importan más que el
mecanismo de compra. No usar el win rate agregado para asignar probabilidad automática a un Deal individual.

## 7. Metas trimestrales 2027 — revisión dual MRR + Spot

La revisión vigente propuesta supersede los escenarios preliminares de USD 18.000–25.000 Exit MRR, cuya evolución
queda registrada en el change log del plan. Las cuotas actuales y su presupuesto detallado viven en
[`COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md`](COMMERCIAL_PLAN_AND_SALES_BUDGET_2027_V1.md).

| Banda | Compromiso | Objetivo | Stretch |
| --- | ---: | ---: | ---: |
| Exit contracted MRR | USD 28.000 | **USD 30.000–32.000** | USD 34.000 |
| Spot bookings netos | USD 60.000 | **USD 90.000** | USD 120.000 |
| GRR | 95% | **≥95%** | 100% |
| Gross margin por engagement | 45% mínimo | **50–60%** | ≥55% |

El bridge central presupone USD 4.000–5.000 de expansión SKY, USD 1.000–2.000 de expansión Berel, un incremento
pequeño de comisión HubSpot y USD 12.000–15.000 de new-logo recurring. Motogas tiene crecimiento cero
presupuestado. ANAM y Aguas Andinas permanecen en Spot; Managed Ops es upside hasta que exista backlog mensual,
owner, cadencia y presupuesto recurrente.

| Quarter | Exit MRR objetivo | Spot bookings objetivo acumulado |
| --- | ---: | ---: |
| Q1 2027 | USD 16.000 | USD 15.000 |
| Q2 2027 | USD 21.000 | USD 35.000 |
| Q3 2027 | USD 26.000 | USD 60.000 |
| Q4 2027 | USD 30.000–32.000 | USD 90.000 |

Cobertura requerida: USD 18.000–21.000 de expansión MRR calificado (`3×`), USD 48.000–60.000 de new-logo MRR
calificado (`4×`) y USD 360.000 de Spot bookings calificados (`4×`). Las licitaciones/RFP permanecen a `10×` y sin
cuota base hasta pasar todos los gates.

El 1 de enero se rebasa el Opening MRR y se recalcula la cuota bruta, conservando el Exit MRR objetivo y registrando
cualquier reforecast. El target no se reescribe para hacerlo coincidir con actual.

## 8. Capacidad y costos pendientes

- Costos conocidos: USD 3.400 de personal + USD 1.500 de software/licencias mensuales.
- La remuneración del fundador todavía no está definida; para management accounting se mantiene separada como costo
  sombra hasta aprobación.
- Diseño y producción creativa son delegables al equipo/Creative Operations Lead.
- RevOps, HubSpot y Customer Agent siguen dependiendo principalmente del fundador.
- Los escenarios no asumen fines de semana como capacidad permanente.
- Cada recurrente nuevo debe declarar horas mensuales del fundador, ramp-up, owner y porción delegable antes de entrar
  al caso base.

### Gate Finance/Pricing

`Verdict: blocked_by_finance` para aprobación económica; no bloquea usar estas cifras como cuota comercial propuesta.

Antes de declarar la cuota `commercially approved`, Finance debe reconciliar por oferta y cuenta:

1. remuneración/costo sombra del fundador;
2. fully loaded cost de personas y provisiones;
3. licencias, providers, coordinación y soporte;
4. cost-to-serve y horas de servicing del nuevo MRR;
5. margen bruto, margen de contribución, DSO, FX e impuestos;
6. piso de margen y bandas de descuento.

Los USD 4.900 mensuales conocidos no constituyen todavía el costo total de la empresa ni permiten certificar margen.

## 9. Revisión y change log del plan

| Fecha      | Cambio                             | Motivo/evidencia                                                                  | Aprobación                |
| ---------- | ---------------------------------- | --------------------------------------------------------------------------------- | ------------------------- |
| 2026-08-29 | Baseline y primera meta Q4/2027    | Discovery HubSpot + Teams + SharePoint + capacidad/costos informados              | `Proposed for approval`   |
| 2026-08-29 | Metas 2027 por quarter             | Separar la progresión trimestral de la agregación anual                           | `Proposed for approval`   |
| 2026-08-29 | Revisión dual MRR + Spot            | Separar estabilidad recurrente de caja/proyectos y elevar 2027 a 2,5–3× Exit MRR | `Proposed · blocked_by_finance` |
| 2026-08-29 | Arquitectura de cuota por motion   | Aplicación de business model, customer model, pricing, GTM y HubSpot              | `Proposed for approval`   |
| 2026-08-29 | Arquitectura de portafolio híbrido | Separar segmento, familia de servicio y motor de ingreso; corregir lectura de SKY | `Proposed for validation` |

### Próxima revisión

Revisar semanalmente el forecast y rebaselinar formalmente al cierre de septiembre de 2026. No modificar la meta para
absorber un miss; registrar forecast, actual y variación por separado.
