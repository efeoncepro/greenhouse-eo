# Wave Pricing Integrity Pack V1

> **Estado:** `hypothesis_only`
> **Fecha:** 2026-07-26
> **Owner:** Strategy + Wave + Commercial + Finance
> **Modelo de referencia:** [`WAVE_BUSINESS_MODEL_V1.md`](WAVE_BUSINESS_MODEL_V1.md)
> **Método:** `efeonce-pricing-operator`

Este documento es exclusivamente la aplicación de pricing a las ofertas de Wave. No redefine sus familias,
boundaries, ownership ni delivery models; esas decisiones viven en el modelo de Wave y su ADR. Tampoco aprueba
precios, márgenes, claims, checkout ni venta general.

## 1. Alcance de pricing

El pricing debe decidir, por oferta concreta:

1. métrica de valor;
2. unidad de cobro;
3. packaging e inclusiones;
4. revenue streams;
5. cost drivers y margen;
6. mínimos, overage y descuentos;
7. versionado y approval gates;
8. experimento de willingness-to-pay.

Los delivery models de Wave sólo se consideran como variables de costo, capacidad y riesgo comercial. No se vuelven a
definir aquí.

## 2. Matriz de pricing por familia

| Familia | Métrica de valor candidata | Unidad de cobro candidata | Arquitectura de revenue a validar |
|---|---|---|---|
| **Search Visibility 360** | property/mercado, lane de operación, baseline de visibilidad o resultado verificable | diagnostic/activation + fee recurrente por lane/capacity + add-ons | discovery → foundation → operating retainer → expansión |
| **Web Experience 360** | property, scope aceptable, milestone o lane de operación | discovery + implementation/milestone + operations retainer + change order | assessment → build/rebuild → operations → expansión |
| **Measurement & Analytics** | property, data surface, event system o governance lane | audit/implementation fee + governance retainer + integrations/change orders | audit → implementation → measurement operations → expansión |
| **Agent Systems & Platforms** | capability desplegada, governed deployment, workspace/use envelope o SLA | strategy/architecture + implementation + governance base + usage/pass-through controlado | discovery → build/deploy → managed operations → provider/usage guardrail |
| **Digital Automation & Integrations** | workflow, integration lane, system boundary o transaction envelope | sprint/milestone + operations retainer + usage cuando sea medible | assessment → build → operations/support → change/expansión |

Estas son hipótesis de pricing, no decisiones aprobadas. La métrica final debe ser explicable, medible y crecer con el
valor del cliente. Horas, piezas, artículos, prompts y tokens pueden ser inputs internos de costing, pero no deben ser
la unidad pública principal si commoditizan el resultado.

## 3. Packaging a validar

La hipótesis común de packaging es:

```text
wedge de diagnóstico pagado
→ core de implementación o servicio productizado
→ operación recurrente
→ expansión por alcance, capacidad, mercado, workflow, provider o SLA
```

| Paquete | Qué debe cobrar | Límite comercial |
|---|---|---|
| **Wedge / Diagnostic** | reducción de incertidumbre, baseline y decisión | no promete resultados fuera del control de Wave |
| **Core / Foundation** | capability instalada con scope y aceptación | no incluye excepciones ni alcance ilimitado |
| **Operating / Managed** | operación, governance, telemetría, soporte o capacidad reservada | no equivale a output ilimitado |
| **Expansion / Add-on** | nueva capability, property, mercado, workflow, integración o SLA | debe conservar boundaries y change control |

Los tiers sólo se crean cuando exista evidencia de segmentos o willingness-to-pay distintos. Las fences permitidas
son valor, capacidad, riesgo, SLA, governance, rights o compromiso; no features artificiales.

## 4. Revenue architecture

Para cada oferta y cotización, separar:

```text
discovery / activation
+ implementation / migration
+ recurring operation / governance / support / reserved capacity
+ usage / overage / credits
+ provider pass-through
+ IP / licensing / rights
+ change orders
+ optional performance component
```

Cada stream debe registrar `value_trigger`, `billing_unit`, `frequency`, `minimum_commitment`, `included`, `excluded`,
`cost_driver`, `renewal_trigger`, `expansion_trigger`, `recognition_boundary` y `evidence`.

El pass-through debe declarar costo, markup, FX, impuestos, mínimos y cambios de provider. Para Agent Systems &
Platforms, el costo debe incluir observabilidad, evaluación, revisión humana, seguridad, soporte de incidentes,
compliance, retries, fallback y rebenchmark; no sólo tokens o consumo de modelo.

## 5. Economics y guardrails

Finance debe modelar cada oferta por `family × offer × account × delivery_model × provider × cohort`:

- fully loaded cost y cost-to-serve;
- gross margin y contribution margin;
- utilization, realization, bench y delivery variance;
- software, providers, compute, storage, support, QA, retries y reserve;
- subcontractors, FX, DSO, working capital, refunds y bad debt;
- sensibilidad base/downside/upside y piso de margen;
- CAC/payback, GRR/NRR y expansión cuando exista muestra.

No hay pricing defendible hasta que Finance reconcilie la aritmética y el tratamiento de proyecto, recurrente, usage,
pass-through, IP y créditos.

Toda oferta debe versionar:

```yaml
offer_id: TBD
family: TBD
value_metric: TBD
billing_unit: TBD
minimum_commitment: TBD
included: []
excluded: []
overage_policy: TBD
provider_pass_through: []
margin_floor: TBD
discount_band: TBD
effective_from: TBD
quote_snapshot: required
status: hypothesis_only
```

Toda excepción necesita motivo, owner, impacto en margen, aprobación, compensación y expiración. El catálogo no
reescribe cotizaciones históricas. La propuesta debe mostrar precio total, mínimos, overage, dependencias, impuestos,
renovación, cancelación y reembolso cuando corresponda.

## 6. Validación de pricing

| Hipótesis | Experimento | Métrica primaria | Stop condition |
|---|---|---|---|
| El wedge reduce fricción | 3–5 discovery pagados por familia prioritaria | conversión discovery → core | no hay decisión/next step repetible |
| La métrica refleja valor | entrevistas + cotizaciones comparables | comprensión y willingness-to-pay | el comprador sólo compara horas/piezas |
| El core es repetible | 3 entregas con scope equivalente | variance de esfuerzo, tiempo y margen | las excepciones dominan el delivery |
| El recurring tiene obligación real | piloto con cadence, SLA y QBR | renewal/expansion signal y realization | sólo se compra disponibilidad informal |
| La arquitectura protege margen | escenarios por oferta y delivery | contribution margin y delivery variance | bench o provider cost no financiado |
| Usage de agentes es controlable | sandbox con meter, cap, alert y fallback | costo por caso y bill shock | no existe stop-loss o dispute path |

## 7. Gates de aprobación

- [ ] Métrica de valor y unidad de cobro elegida por oferta.
- [ ] Packaging con inclusiones, exclusiones, mínimo, overage, pause, refund y change rule.
- [ ] Cost-to-serve, margen y sensibilidad cerrados por oferta y delivery model.
- [ ] Rate card, discount band, effective date, FX y quote snapshot definidos.
- [ ] Provider pass-through, credits, usage y stop-loss gobernados cuando apliquen.
- [ ] Evidencia de repetibilidad, willingness-to-pay y renovación.
- [ ] Aprobación Strategy/Commercial/Finance/Legal/Operations según riesgo.

## Verdict

`hypothesis_only` — la arquitectura de pricing está definida para validación, pero todavía no habilita tarifas
publicadas, claims comerciales ni venta general.
