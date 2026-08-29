# Efeonce Sales Goals — Q4 2026 y marco 2027

> **Estado:** `Proposed for approval`
> **Owner:** Julio Reyes Rangel / Commercial
> **Corte de evidencia:** 2026-08-29
> **Moneda principal:** USD
> **Método:** [`SALES_GOALS_OPERATING_MODEL_V1.md`](SALES_GOALS_OPERATING_MODEL_V1.md)

## 1. Decisión

La meta combina crecimiento recurrente con On-Demand sin hacer depender el caso base de licitaciones tempranas ni de
capacidad técnica inexistente.

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

| Motion    |  Gap base |                         Cobertura inicial `3×` |
| --------- | --------: | ---------------------------------------------: |
| Nuevo MRR | USD 3.000 |          USD 9.000 de MRR potencial calificado |
| On-Demand | USD 9.600 | USD 28.800 de bookings potenciales calificados |

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

### Conflicto económico a resolver en SKY Blog

- HubSpot registra CLP 124.800.000 de TCV por 24 meses, equivalente a CLP 5.200.000 mensuales.
- Un artefacto interno de evolución registra una alternativa de CLP 3.000.000 netos mensuales.
- Hasta verificar cuál versión recibió/evalúa el comprador, no se atribuye MRR exacto al forecast.

## 6. Contexto de probabilidad

| Modalidad histórica observada en HubSpot | Ganados | Perdidos | Win rate aproximado |
| ---------------------------------------- | ------: | -------: | ------------------: |
| Trato directo                            |      10 |       23 |               30,3% |
| Licitación                               |       3 |       26 |               10,3% |
| Compra ágil                              |       0 |        8 |                  0% |
| Partnership registrado                   |       0 |        2 |                  0% |

Esta tabla no equivale a recurrente vs. On-Demand; respalda que relación y control comercial importan más que el
mecanismo de compra. No usar el win rate agregado para asignar probabilidad automática a un Deal individual.

## 7. Marco de metas 2027

### Sin nueva delegación técnica

| Indicador                |                    Base |             Stretch |
| ------------------------ | ----------------------: | ------------------: |
| Exit MRR                 |          **USD 18.000** |          USD 20.000 |
| GRR                      |                **≥95%** |       100% objetivo |
| Proyectos On-Demand      |                   **6** |                   8 |
| Bookings On-Demand       | **648 UF ≈ USD 28.900** | 864 UF ≈ USD 38.500 |
| Horas técnicas On-Demand |               240 h/año |           320 h/año |

Seis proyectos consumen aproximadamente 5,2 horas semanales en 46 semanas; ocho consumen cerca de 7. Doce proyectos
anuales no son meta base: requerirían alrededor de 10,4 horas técnicas semanales antes de dirección, clientes,
ventas y SEO/desarrollo.

### Escenario condicionado

`Exit MRR USD 25.000` sólo se activa como meta aprobada cuando exista al menos una de estas condiciones verificadas:

- delegación/contratación técnica suficiente;
- reducción medida de cost-to-serve del fundador;
- recurrentes adicionales cuya operación sea mayormente delegable;
- margen y cash aprobados por Finance.

## 8. Capacidad y costos pendientes

- Costos conocidos: USD 3.400 de personal + USD 1.500 de software/licencias mensuales.
- La remuneración del fundador todavía no está definida; para management accounting se mantiene separada como costo
  sombra hasta aprobación.
- Diseño y producción creativa son delegables al equipo/Creative Operations Lead.
- RevOps, HubSpot y Customer Agent siguen dependiendo principalmente del fundador.
- Los escenarios no asumen fines de semana como capacidad permanente.

## 9. Revisión y change log del plan

| Fecha      | Cambio                          | Motivo/evidencia                                                     | Aprobación              |
| ---------- | ------------------------------- | -------------------------------------------------------------------- | ----------------------- |
| 2026-08-29 | Baseline y primera meta Q4/2027 | Discovery HubSpot + Teams + SharePoint + capacidad/costos informados | `Proposed for approval` |

### Próxima revisión

Revisar semanalmente el forecast y rebaselinar formalmente al cierre de septiembre de 2026. No modificar la meta para
absorber un miss; registrar forecast, actual y variación por separado.
