# Wave Pricing Integrity Pack V1

> **Estado:** `hypothesis_only`
> **Fecha:** 2026-07-26
> **Owner:** Strategy + Wave + Commercial + Finance + Legal/IP + Operations
> **Modelo relacionado:** [`WAVE_BUSINESS_MODEL_V1.md`](WAVE_BUSINESS_MODEL_V1.md)
> **Método:** `efeonce-pricing-operator` + `efeonce-business-model-operator`

Este documento prueba la arquitectura transversal de pricing sobre Wave. No aprueba precios, márgenes, claims,
checkout ni venta general. Los importes, monedas, pisos, impuestos y reconocimiento deben vivir en Finance,
catálogo, cotización y contrato aprobado.

## 1. Resultado de la prueba

La arquitectura de Wave pasa el test de separación de capas:

| Capa | Decisión Wave | Estado |
|---|---|---|
| Masterbrand / relación | Efeonce lidera la relación y el contrato | decidido |
| Product service | cinco familias de Wave | decidido |
| Delivery model | Productized Service, Managed Squad, Staff Augmentation, Implementation, Advisory, Platform-enabled Service | decidido como taxonomía |
| Engagement | On-Going, On-Demand, Sample Sprint | decidido como taxonomía |
| Operating mode | `efeonce-managed`, `co-operated`, `client-operated` cuando aplique | decidido como taxonomía |
| Ecosystem composition | Wave sola o con Efeonce Digital/Kortex, Globe, Reach y Greenhouse | decidido por SOW/RACI |
| Precio | métrica y arquitectura por oferta | hipótesis |
| Cost-to-serve y margen | por familia × delivery × provider × cuenta | pendiente Finance |
| Precio publicado / venta general | ninguno aprobado por este pack | bloqueado hasta gates |

## 2. Arquitectura de oferta por familia

| Familia | Qué compra el cliente | Métrica de valor candidata | Unidad de cobro candidata | Revenue architecture inicial |
|---|---|---|---|---|
| Search Visibility 360 | visibilidad orgánica y operación SEO+AEO | scope/lane gobernado, mercado, property o resultado verificable | activation/diagnostic + fee recurrente por lane/capacity + add-ons gobernados | discovery → foundation/implementation → operating retainer → expansion |
| Web Experience 360 | experiencia web para humanos, buscadores y agentes | scope/milestone, property, capability lane o operación continua | discovery + fixed implementation/milestone + operations retainer | assessment → build/rebuild → performance/accessibility operations → change orders |
| Measurement & Analytics | instrumentación, calidad y lectura confiable de datos | property, data surface, event system, governance lane o capacidad | audit/implementation fee + governance/operations retainer + integrations/change orders | audit → implementation → measurement operations → expansion |
| Agent Systems & Platforms | agente o sistema de agentes diseñado, integrado y operado | capability, governed deployment, workspace/use envelope o SLA | strategy/architecture + implementation + governance/base recurring + usage/pass-through controlado | discovery → build/deploy → managed operations + provider/usage guardrail |
| Digital Automation & Integrations | workflows, APIs, pipelines e integraciones operables | workflow/integration lane, system boundary o transaction envelope | sprint/milestone + managed integration retainer + usage cuando sea medible | assessment → build → operations/support → change/expansion |

La métrica final debe demostrar valor y ser medible. Horas, prompts, tokens, piezas o artículos pueden existir como
inputs internos de capacidad/costo, pero no son automáticamente la unidad pública de valor.

## 3. Packaging recomendado para validar

La arquitectura común propuesta es:

```text
wedge de diagnóstico o assessment pagado
→ core de implementación o productized service
→ operación recurrente por lane/capacity/governance
→ expansión por capability, property, mercado, workflow, provider o SLA
```

| Paquete | Propósito | Forma de validación | No promete |
|---|---|---|---|
| **Wedge / Diagnostic** | reducir incertidumbre y producir baseline/decision brief | fixed fee o sprint acotado con aceptación | resultado de negocio fuera del control de Wave |
| **Core / Foundation** | instalar la capability repetible | package fijo, milestone o implementation | alcance ilimitado o excepciones no cotizadas |
| **Operating / Managed** | mantener operación, governance, telemetría y mejora | fee recurrente por servicio/lane/capacity | output ilimitado por fee fijo |
| **Expansion / Add-on** | aumentar alcance, capacidad, mercados, integrations o SLA | add-on, change order, usage o tier | que una integración del ecosistema cambie ownership |

Los tiers sólo deben aparecer cuando exista evidencia de segmentos o willingness-to-pay distintos. Las fences válidas
son valor, capacidad, riesgo, SLA, governance, rights o compromiso; no features artificiales.

## 4. Delivery model × pricing mechanism

| Delivery | Mecanismo inicial | Compromiso que debe quedar explícito | Principal riesgo |
|---|---|---|---|
| Productized Service | fixed package / tier / add-on | scope, acceptance, exclusions, inputs y change rule | excepciones destruyen repetibilidad |
| Managed Squad | monthly capacity fee + minimum term | roles, seniority, capacity, cadence, intake, RACI y rollover | cliente espera output ilimitado |
| Staff Augmentation | rate/seat/capacity + term | calificación, disponibilidad, dirección del cliente y replacement | commoditización y accountability ambiguo |
| Implementation | fixed fee / milestone + change order | scope, dependencies, acceptance y handoff | under-scoping y scope creep |
| Advisory | fixed phase, day rate o retainer de acceso | decisiones, entregables, cadencia y límites | vender outputs como outcomes |
| Platform-enabled Service | base recurring + service + usage/credits/pass-through | qué aporta la plataforma, quién opera, límites y provider fallback | margen opaco y dependencia de proveedor |

Un mismo product service puede usar más de un delivery model, pero debe tener una cotización y SOW que conserven la
separación. El delivery compuesto con Globe, Reach, Efeonce Digital/Kortex o Greenhouse no crea automáticamente una
nueva línea de Wave.

## 5. Revenue architecture mínima

Para cada oferta y cotización se deben separar:

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

El pass-through debe declarar costo, markup, FX, impuestos, mínimos y cambios de provider. En Agent Systems & Platforms
el cost-to-serve debe incluir observabilidad, evaluation, revisión humana, seguridad, incident support, compliance,
retries, fallback y rebenchmark; no sólo tokens o consumo del modelo.

## 6. Economics que Finance debe completar

El modelo debe calcularse por `family × offer × account × delivery_model × operating_mode × provider × cohort`:

- fully loaded labor y capacidad reservada;
- cost-to-serve, gross margin y contribution margin;
- utilization, realization, bench y delivery variance;
- software, providers, compute, storage, support, QA, retries y reserve;
- subcontractors, FX, DSO, working capital, refunds y bad debt;
- sensibilidad base/downside/upside y piso de margen;
- CAC/payback, GRR/NRR y expansión cuando exista muestra.

No hay pricing defendible hasta que Finance reconcilie la aritmética y confirme el tratamiento de proyecto,
recurrente, usage, pass-through, IP y créditos.

## 7. Governance de pricing

Cada oferta debe versionar:

```yaml
offer_id: TBD
family: TBD
delivery_model: TBD
engagement: TBD
operating_mode: TBD
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

Toda excepción necesita motivo, owner, impacto en margen, aprobación, compensación y expiración. Una actualización de
catálogo no reescribe cotizaciones históricas. La propuesta al cliente debe mostrar precio total, mínimos, overage,
dependencias, impuestos, renovación, cancelación y reembolso cuando corresponda.

## 8. Experimentos de validación

| Hipótesis | Experimento | Métrica primaria | Threshold / stop condition | Owner |
|---|---|---|---|---|
| El wedge reduce fricción comercial | 3–5 discovery pagados por familia prioritaria | conversión discovery → core | stop si el discovery no produce decisión/next step repetible | Commercial + práctica |
| La métrica propuesta refleja valor | entrevistas + cotizaciones comparables | comprensión y willingness-to-pay | revisar si el comprador sólo compara horas/piezas | Strategy + Commercial |
| El core es repetible | 3 entregas con scope y aceptación equivalentes | variance de esfuerzo, tiempo y margen | no productizar si la excepción domina el delivery | Operations + Finance |
| El recurring tiene obligación real | piloto con cadence, SLA y QBR | renewal/expansion signal y realization | no llamar recurring si compra sólo disponibilidad informal | Practice + Commercial |
| El delivery model protege margen | comparar productized, squad y augmentation | contribution margin y delivery variance | bloquear si el modelo requiere bench no financiado | Finance + Operations |
| Agent usage es controlable | sandbox con meter, cap, alert y fallback | costo por caso y bill shock | no vender usage sin stop-loss y dispute path | Wave + Finance + Architecture |

Mientras no existan muestras y gates cerrados, el estado correcto de las ofertas es `approved_for_validation` como
máximo; el modelo portfolio completo permanece `hypothesis_only`.

## 9. Gates pendientes para `Commercially approved`

- [ ] ICP, buyer, trigger, alternativa desplazada y claim controlable por familia.
- [ ] Una métrica de valor y unidad de cobro elegida por oferta.
- [ ] Packaging wedge/core/operating/expansion con inclusiones y exclusiones.
- [ ] Cost-to-serve y margen por delivery model, provider y operating mode.
- [ ] Mínimos, capacidad, overage, rollover, pause, refund y stop-loss.
- [ ] Rate card, discount band, effective date, FX y quote snapshot.
- [ ] RACI y SOW para cualquier composición con otras capabilities de Efeonce.
- [ ] IP, rights, privacy, provider terms, liability y fallback.
- [ ] Evidencia de repetibilidad, delivery variance y renovación.
- [ ] Aprobación Strategy/Commercial/Finance/Legal/Operations según el riesgo.

## Verdict

`hypothesis_only` — Wave tiene una arquitectura de pricing coherente y testeable, pero todavía no tiene evidencia,
economics ni aprobaciones suficientes para publicar tarifas o afirmar que una familia está comercialmente aprobada.
