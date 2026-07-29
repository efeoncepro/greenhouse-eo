# General Pricing Patterns

Esta referencia es un mapa de decisión agnóstico a la línea de negocio, no un tarifario. Los números, pisos,
monedas, impuestos y precios vigentes viven en Finance, el catálogo comercial y el contrato aprobado.

## 1. Separar la arquitectura antes de elegir precio

No mezclar estas capas:

| Capa | Pregunta | Ejemplos |
|---|---|---|
| Offer / product service | ¿Qué compra el cliente? | diagnóstico, web, agente, contenido, plataforma |
| Delivery model | ¿Quién entrega y responde? | advisory, implementation, productized service, staff augmentation, managed squad, managed service |
| Engagement | ¿Con qué duración y cadencia? | sprint, proyecto, retainer, ongoing, on-demand |
| Operating mode | ¿Quién opera cada lane? | Efeonce, marca de producto, ecosistema, proveedor |
| Value metric | ¿Qué representa el valor? | scope, capacidad, workspace, asset, transacción, outcome |
| Billing unit | ¿Qué se factura? | fee, milestone, mes, seat, unidad, crédito, consumo |
| Revenue stream | ¿Cómo se cobra y renueva? | activation, implementation, recurring, usage, IP, pass-through |
| Economics | ¿Qué consume margen y cash? | labor, bench, providers, compute, support, rework, DSO |
| Contract | ¿Qué se promete y protege? | SLA, acceptance, exclusions, change order, rights, liability |

Un cambio de delivery model no crea automáticamente un producto nuevo. Staff augmentation mantiene la dirección
del trabajo en el cliente; un managed squad o managed service transfiere más responsabilidad operativa al proveedor.

## 2. Seleccionar el modelo de delivery

| Modelo | Compra el cliente | Forma comercial habitual | Usarlo cuando |
|---|---|---|---|
| Advisory | criterio, decisiones y roadmap | fase fija, day rate o retainer | el problema es ambiguo |
| Discovery / assessment | entendimiento estructurado | paquete fijo o T&M gobernado | falta información para estimar |
| Implementation | capacidad configurada/desplegada | fee fijo, milestones + change orders | scope y aceptación son definibles |
| Productized service | paquete repetible y nombrado | precio fijo, tiers y add-ons | el problema se repite |
| Staff augmentation | especialistas o roles | rate/seat/capacity + mínimo | el cliente dirige prioridades |
| Managed squad | equipo, capacidad y cadencia gobernadas | fee mensual de capacidad | el proveedor opera el sistema de entrega |
| Managed service | función continua y SLA | fee mensual, por unidad o híbrido | la operación es estable y medible |
| Platform-enabled service | servicio amplificado por software, datos o IP | base + servicio + uso/créditos | la tecnología mejora repetibilidad o economics |
| Training / support | enablement, acceso o respuesta | workshop, tier, pack o retainer | el valor es transferencia o asistencia |

## 3. Elegir el mecanismo de pricing

| Mecanismo | Fórmula conceptual | Mejor encaje | Riesgo a controlar |
|---|---|---|---|
| T&M | horas × rate + materiales | incertidumbre real de scope/duración | ceiling, presupuesto y eficiencia |
| Rate card | días/horas × rol | advisory o augmentation | commoditización |
| Fixed fee | precio por scope aceptable | entrega definida | scope creep y estimation error |
| Milestone | fee por gate aceptado | implementación | aceptación y cash-flow |
| Productized package | alcance estándar × precio | trabajo repetible | excepciones destruyen margen |
| Retainer | fee por acceso, capacidad o servicio | soporte/advisory/recurring | ambigüedad de unused capacity |
| Capacity | capacidad reservada × periodo | squads y expertos residentes | expectativa de output ilimitado |
| Subscription | fee recurrente por acceso/operación | plataforma o servicio estable | churn y soporte subestimado |
| Unit / usage | unidad gobernada × precio | eventos, assets, seats, transacciones | volatilidad y bill shock |
| Outcome / value | fee vinculado a resultado verificable | resultado medible y controlable | atribución y dependencias |
| Credits / bundle | unidades consumidas desde ledger | mix variable repetible | equivalencia ambigua |
| Hybrid | base + capacidad/uso/overage/outcome | mayoría de servicios complejos | complejidad contractual |

Regla: T&M sirve para incertidumbre que no se puede reducir todavía; fixed fee para scope definible; capacity para
capacidad reservada; managed service para operación; outcome sólo cuando existe medición, causalidad e influencia
suficiente. Para servicios técnicos complejos, el default robusto suele ser:

```text
discovery pagado
→ implementación de precio fijo
→ capacidad o managed service recurrente
→ guardrail de uso/overage
→ componente de performance selectivo
```

## 4. Diseñar valor, packaging y fences

Usar la secuencia `segmento → valor → métrica → packaging → economics → validación`.

- Elegir una métrica que crezca con el valor, sea explicable y pueda medirse.
- Usar costo-to-serve como piso, no como única narrativa de precio.
- Usar valor percibido, alternativas desplazadas, riesgo evitado y willingness-to-pay como techo/hipótesis.
- Diseñar `wedge → core → expansion`; máximo tres tiers salvo evidencia clara.
- Diferenciar tiers sólo por valor, capacidad, riesgo, SLA, governance, rights o compromiso; no por features
  artificiales.
- Una oferta debe registrar: target/trigger, output, incluidos, excluidos, dependencias, workflow, aceptación,
  tiempo, tiers/add-ons, capacidad, change rule, piso de margen y prueba de repetibilidad.
- Los descuentos deben tener fence: term, volumen, segmento, bundle, pago anticipado o compromiso de capacidad.

No usar horas, piezas, artículos, prompts o tokens como unidad pública principal cuando sólo son inputs internos de
capacidad/costo y commoditizan el resultado. Pueden existir como variables internas, límites u overage gobernado.

## 5. Arquitectura de revenue e híbridos

Separar explícitamente:

```text
activation / discovery
+ implementation / migration
+ recurring governance / operation / support / reserved capacity
+ usage / overage / credits
+ provider pass-through
+ IP / licensing / rights
+ change orders
+ optional performance component
```

No esconder labor, provider cost o infraestructura dentro de una unidad de uso. El pass-through debe declarar costo,
markup, FX, impuestos, mínimos, cambios de proveedor y si afecta margen. La base recurrente debe comprar una
obligación real: gobernanza, acceso, operación, soporte, telemetría o capacidad reservada.

## 6. Capacity, retainers y economics de servicios

Una oferta de capacity debe especificar roles/seniority, capacidad comprometida, término mínimo, asignación,
intake/priorización, governance, expectativas de output sin scope ilimitado, rollover/expiry/overage, continuidad,
ramp notice, dependencias del cliente y SLA/cadencia.

Un retainer debe decir si compra:

1. acceso/priority;
2. capacidad reservada; o
3. un servicio recurrente definido.

Definir por adelantado qué ocurre con la capacidad no utilizada: expira, rollover, convierte a créditos o es el
precio de reservarla.

```text
Billable utilization = billable hours / available working hours
Realization = recognized or billed service revenue / standard-rate value delivered
Contribution margin = net revenue - loaded labor - providers - infrastructure - support - rework - reserves
```

No combinar utilization y realization: alta utilización con baja realización puede indicar descuentos, write-offs o
scope leakage; alta realización con baja utilización puede indicar buen precio pero demanda insuficiente.

## 7. Usage, credits y agentes/IA

Toda unidad variable necesita `meter → estimate → preview → limit/cap → alert → overage/stop-loss → dispute path`.
Para créditos definir grants pagados/promocionales, ledger append-only, expiración, refund/rollover, orden de
consumo, no-negative policy, auditoría y contrato. Un crédito no es automáticamente dinero, hora, token, pieza ni
derecho.

En agentes/IA incluir en cost-to-serve observabilidad, evaluación, revisión humana, seguridad, soporte de incidentes,
compliance, retries, fallback y sustitución/rebenchmark de provider/modelo; no costear sólo tokens. Un precio variable
debe proteger contra abuso, fraude, provider volatility y bill shock.

## 8. Waterfall, governance y versionado

```text
list price
→ approved discount
→ credits/promotions
→ refunds/concessions
= net revenue

net revenue
− loaded human cost
− unrecovered pass-through
− infrastructure
− support/QA/retries/reserves/FX
= contribution margin
```

Registrar siempre precio lista, precio propuesto, descuento absoluto/porcentual, motivo, aprobador, vigencia,
impacto en margen y efecto en renovación. Definir pisos base/downside/p95 por oferta, cuenta y provider; una excepción
requiere razón, owner, compensación y fecha de expiración.

Versionar rate cards, tiers, credits, limits, provider/model, FX, effective date y contrato asociado. Una modificación
de catálogo no reescribe cotizaciones históricas: usar snapshots y grandfathering aprobado.

La salida comercial debe hacer transparente precio total, mínimos, overage, credits, impuestos, renovación,
cancelación, reembolso y dependencias. Evitar dark patterns o ambigüedad deliberada.

## 9. Pricing Integrity Pack mínimo

```yaml
offer_id: TBD
delivery_model: TBD
engagement: TBD
value_metric: TBD
billing_unit: TBD
minimum_commitment: TBD
included: []
excluded: []
cost_drivers: []
provider_pass_through: []
margin_floor: TBD
discount_band: TBD
renewal_trigger: TBD
expansion_trigger: TBD
effective_from: TBD
status: hypothesis_only
finance_review: pending
commercial_review: pending
legal_review: pending
operations_review: pending
```

El pack debe incluir matriz de oferta/delivery/engagement, decisión de métrica, revenue architecture, escenarios de
cost-to-serve y margen, reglas de descuento/aprobación, política de quote/version, plan de validación, owners,
confidence y verdict: `hypothesis_only`, `approved_for_validation`, `commercially_approved`, `blocked_by_finance`,
`blocked_by_legal`, `scale_constrained` o `superseded`.

## 10. Fuentes de investigación

Investigación externa consultada el 2026-07-26; los benchmarks y reglas regulatorias deben revalidarse antes de una
decisión. Estas fuentes informan patrones, no sustituyen Finance/Legal ni el contrato:

- [FAR Part 16: fixed-price contracts](https://www.acquisition.gov/far/subpart-16.2) y [T&M contracts](https://www.acquisition.gov/far/subpart-16.6).
- [Google Cloud professional services marketplace](https://cloud.google.com/blog/topics/partners/purchase-professional-services-on-google-cloud-marketplace/).
- [Service products and productization, Journal of Business Research](https://www.sciencedirect.com/science/article/pii/S0148296321005919).
- [Bain B2B Elements of Value](https://media.bain.com/b2b-eov/) y [HBR summary](https://hbr.org/2018/03/the-b2b-elements-of-value).
- [Stripe usage-based billing and credits](https://stripe.com/blog/introducing-credits-for-usage-based-billing).
- [SPI Professional Services Maturity Benchmark](https://spiresearch.com/the-18th-annual-professional-services-maturity-benchmark-report-is-out-now/).
- [IFRS 15 Revenue from Contracts with Customers](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2024/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf?bypass=on).
- [FinOps FOCUS specification](https://focus.finops.org/focus-specification/v1-3/).
- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) para gobernanza, medición y gestión de riesgo en ofertas de IA.
- [FTC Dark Patterns report](https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf?date=2026-06-10).
