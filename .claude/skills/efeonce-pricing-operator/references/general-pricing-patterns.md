# General Pricing Patterns

Mapa agnóstico a la línea de negocio. No es tarifario: precios, pisos, monedas, impuestos y reconocimiento viven
en Finance, catálogo y contrato aprobado.

## Capas que no se deben mezclar

Oferta/product service, delivery model, engagement, operating mode, métrica de valor, unidad de cobro, revenue stream,
economics y contrato son decisiones distintas. Staff augmentation significa que el cliente dirige el trabajo; managed
squad/service significa que el proveedor opera más del sistema de entrega.

## Delivery y mecanismo

| Delivery | Compra | Mecanismos frecuentes |
|---|---|---|
| Advisory / discovery | criterio, análisis, roadmap | fixed fee, day rate, T&M gobernado |
| Implementation | capacidad configurada/desplegada | fixed fee, milestone, change order |
| Productized service | paquete repetible | fixed price, tiers, add-ons |
| Staff augmentation | especialistas/roles | rate, seat, capacity + term |
| Managed squad | equipo/capacidad/cadencia | fee mensual de capacidad |
| Managed service | función continua/SLA | recurrente, unidad, híbrido |
| Platform-enabled service | servicio amplificado por software/IP | base + servicio + usage/credits |

Mecanismos: T&M, rate card, fixed fee, milestone, productized package, retainer de acceso/capacidad/servicio,
capacity, subscription, unit/usage, outcome, credits y hybrid. Regla: T&M para incertidumbre real; fixed fee para
scope definible; capacity para capacidad reservada; managed service para operación; outcome sólo con medición,
causalidad e influencia suficientes.

## Packaging y revenue

Usar `segmento → valor → métrica → packaging → economics → validación` y `wedge → core → expansion`.

- Métrica explicable, medible y creciente con el valor.
- Cost-to-serve es piso; valor percibido y willingness-to-pay son hipótesis de techo.
- Hasta tres tiers salvo evidencia; fences sólo por valor, capacidad, riesgo, SLA, governance, rights o compromiso.
- Separar activation/discovery, implementation, recurring governance/operation/support/capacity, usage/overage,
  provider pass-through, IP/licensing, rights, change orders y performance.
- No usar horas, piezas, prompts o tokens como unidad pública principal cuando sólo son inputs internos.

Default robusto para servicios complejos:

```text
discovery pagado → implementación fija → capacidad/managed recurrente → guardrail de uso → performance selectivo
```

## Capacity, usage y economics

Una oferta de capacity declara roles, seniority, mínimo, término, asignación, intake, governance, output sin scope
ilimitado, rollover/expiry/overage, continuidad, ramp notice, dependencias y SLA. El retainer debe decir si compra
acceso, capacidad o servicio, y qué ocurre con unused capacity.

```text
utilization = billable hours / available working hours
realization = service revenue / standard-rate value delivered
contribution margin = net revenue - loaded labor - providers - infra - support - rework - reserves
```

Usage requiere meter, estimate, preview, cap, alert, overage/stop-loss y dispute path. Credits requieren grants,
ledger append-only, expiración, refund/rollover, orden de consumo y policy no-negative. En IA incluir observabilidad,
evaluación, revisión humana, seguridad, soporte de incidentes, compliance, retries, fallback y provider volatility.

## Governance

```text
list price → discount aprobado → credits/promos → refunds/concessions = net revenue
net revenue − loaded cost − pass-through − infra − support/QA/retries/reserves/FX = contribution margin
```

Registrar descuento, motivo, aprobador, vigencia, margen y renovación. Definir pisos base/downside/p95. Versionar
rate cards, tiers, credits, limits, provider/model, FX, effective date y contrato; usar quote snapshots y grandfathering
aprobado. Mostrar precio total, mínimos, overage, impuestos, renovación, cancelación y reembolso.

## Fuentes consultadas (2026-07-26)

[FAR fixed-price](https://www.acquisition.gov/far/subpart-16.2), [FAR T&M](https://www.acquisition.gov/far/subpart-16.6),
[Google Cloud professional services](https://cloud.google.com/blog/topics/partners/purchase-professional-services-on-google-cloud-marketplace/),
[Bain B2B Elements of Value](https://media.bain.com/b2b-eov/),
[Stripe credits](https://stripe.com/blog/introducing-credits-for-usage-based-billing),
[IFRS 15](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2024/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf?bypass=on),
[FinOps FOCUS](https://focus.finops.org/focus-specification/v1-3/) y [NIST AI RMF](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/).
