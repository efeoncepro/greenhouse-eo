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

## Patrón medido: proyecto creativo de una vez con desglose exigido

Medido el 2026-10-12 en una licitación privada (Sika Mexicana, Wherex N.º 1164: un «lanzamiento tipo» de campaña con
canasta definida por el comprador y «propuesta económica desglosada»). Estado del caso: paquete terminado, no
presentado, resultado desconocido. Las cifras son ejemplo interno: no son tarifa, mínimo ni referencia para otro
cliente.

**Forma.** En el Cotizador V3 va como `creative-managed-service`, `managed_service`, `on_demand`, `periods: 1`
([tabla por tipo de negocio](cotizador-v3-agent-workflow.md#21-tabla-por-tipo-de-negocio); ejemplo
`fixed-scope-project`). No existe una oferta de proyectos.

**Tres escenarios y el piso, juntos.** Al operador se le lleva el rango, no un número:

| Escenario | Caso (neto) |
| --- | --- |
| A · en la moneda del comprador | MXN 63.700 (costo 32.191,88; margen sobre trabajo propio 50,26 %) |
| B · en USD | USD 3.320 |
| C · con 25 % más de horas (sensibilidad de la estimación) | MXN 76.700 |
| Piso de la oferta (45 %) | ≈ MXN 57.650 |

Cada moneda es su propia cotización; no se convierte a mano.

**Los supuestos del agente se marcan como supuestos.** En el caso: 134 h (Lead 28, diseño 44 + 36, contenido 14,
cuenta 12), USD 60 de producción con IA, talento en Chile, FX de política USD→MXN 19,25 (política, no mercado) y
tratamiento «exportación sin IVA». Operations y Finance no los validaron. Las horas son estimadas y así se informan.

**El resultado es una simulación** (`requires_review`, `binding: false`), no una Quote. **El precio final lo decide
el operador**: fijó MXN 64.000 por lanzamiento tipo; el agente había recomendado 70.000. Entre 64.000 y el piso hay
≈ MXN 6.350, que un desvío cercano al 10 % de las horas consume. El margen a 64.000 (≈ 49,7 %) lo calculó el agente a
mano: el camino correcto es declarar el precio como `agreed_total` y volver a cotizar
([3.9](cotizador-v3-agent-workflow.md#39-el-precio-acordado)); mientras no se haga, esa cifra se cita como cálculo
del agente, no del cotizador.

**El desglose no sale del cotizador.** El motor costea por rol y su documento imprime un fee o «1 proyecto». Un
desglose por componente o por entregable es un **reparto manual** del total aprobado:

- se declara como reparto manual en el expediente y lo confirma el operador;
- va en un documento de la plantilla A4 versión 2 con las líneas digitadas (precio aprobado fuera de V3), no en
  `compose document`; el generador sólo comprueba que sumen;
- no es rate card: de una línea no se deriva un precio por pieza, y si cambia la canasta se vuelve a costear.

En el caso, mismo total: evolución gráfica 16.000 · conceptualización y Master Graphic 14.000 · redes 11.000 · reel
14.000 · punto de venta e impresos 9.000. Cómo se diseña ese desglose en la práctica creativa (por componente de
valor, no por pieza) lo manda `creative-practice`, `modules/04_PRICING.md` §7 (b.1).

**Riesgo a avisar: un componente como pago único.** Si una línea (aquí, la evolución gráfica) se presenta como pago
único, los encargos siguientes quedan en el total menos esa línea (48.000), bajo el piso calculado para un
lanzamiento. Ningún escenario costeó un lanzamiento sin ese componente. La decisión es del operador.

## Patrón medido: descuento de entrada en lugar de bajar la base (operación CRM gestionada)

Medido el 2026-10-20 con Assetplan (Chile, inmobiliaria): operación gestionada de HubSpot, propuesta enviada ese día;
reajustada y reenviada el 2026-10-28 tras la reunión de discovery; resultado desconocido. Las cifras son ejemplo interno: no son tarifa, mínimo ni referencia para otro cliente.
[Caso y readback](../../../../docs/commercial/prospecting-agent/runs/2026-10-20-1221-assetplan-deal.md#propuesta-enviada--20102026).

**El pedido.** Unas 25 h/mes ajustables para mantener al día un canal de dudas y solicitudes comerciales y apoyar
proyectos; 90 usuarios de HubSpot; atención en horario de Chile (lunes a jueves 09:30–18:30, viernes hasta las 16:00);
acceso Partner. La responsable de CRM del cliente conserva estrategia y lineamientos.

**Forma.** Managed service mensual con bolsa de capacidad (fee, no tarifa por hora pública). El catálogo V3 no tiene
una oferta de operación CRM: el precio salió del carril de escenario del workbook (`pricing:workbook`), sin
reclasificarlo como creatividad o SEO. Cotización base: 40 UF + IVA/mes por 25 h.

**La pregunta del operador.** Julio pidió un 25 % de descuento los primeros cuatro meses y preguntó si el precio era
caro y convenía bajarlo. La recomendación fue **no bajar la base**:

| Palanca | Qué se ofreció |
|---|---|
| Precio de lista | 40 UF + IVA/mes, explícito en la propuesta como ancla |
| Descuento de entrada | −10 UF/mes los meses 1–4 → 30 UF + IVA (35,70 UF con IVA); 40 UF + IVA (47,60) desde el mes 5 |
| Riesgo del comprador | Primer mes sin permanencia |
| Flexibilidad | Bolsa ajustable desde el mes 2, con 15 días de aviso |
| Plazo | Inicial de 4 meses (el del descuento); después, mes a mes |
| Vigencia | 15 días (hasta el 04/11/2026) |

Por qué: un descuento temporal y nombrado se retira solo al mes 5; una base rebajada queda como el precio de
referencia del cliente y de la renovación. El riesgo de entrada se reduce con permanencia y flexibilidad, no con precio.
El operador aprobó («Si hazlo»).

**Economics estimados.** Costo ≈ USD 822/mes (≈ 18–19 UF); margen ≈ 52–55 % a 40 UF y ≈ 37–40 % a 30 UF. La
recomendación los ubicó sobre el piso de margen de la práctica. Son estimaciones del escenario (costos
históricos/objetivo y horas compartidas), no margen comprobado: verificar el piso vigente con Finance antes de usarlo
en otro caso. Revisar la dedicación real al cierre del mes 4, cuando termina el descuento.

**Cómo se presentó.** En la propuesta, la receta de cotización en vivo (`content-pricing` live) con líneas:
Operación HubSpot 25 h, 40 UF/mes; Descuento inicial, −10 UF/mes; Primer mes sin permanencia, incluido; Bolsa
ajustable, incluida; total meses 1–4, 30 UF neto + IVA. La cotización de 4 páginas va como PDF aparte.

**CRM.** Monto del Deal = proyección de 12 meses (4 × 30 + 8 × 40 = 440 UF, cargado como CLF); fecha de cierre =
vigencia de la cotización, no cierre pactado. Ambos los aprobó el operador; no escribir un fee mensual como monto
total ni una fecha inventada.

**Cuando el cliente sube la bolsa: escalar en proporción (28/10).** En la reunión de discovery la clienta pidió
30 h/mes. Se escaló la cotización completa en proporción, sin reabrir el descuento: 25 → 30 h, lista 40 → 48 UF,
entrada 30 → 36 UF + IVA los meses 1–4 (25 %). Así se conservan el precio por hora (1,2 UF/h neto de entrada) y el
descuento de entrada que la clienta ya había visto; renegociar el porcentaje habría abierto una segunda negociación
sobre algo que no pidió. El monto del Deal se recalculó con la misma regla de proyección de 12 meses: 4 × 36 + 8 × 48
= 528 UF. La fecha de cierre siguió a la nueva vigencia (30/11/2026). Ambos cambios los aprobó el operador.

**Reemisión con el renderer local** (`scripts/documents/render-cotizacion-a4.mjs`). El campo `version` del JSON es
la versión del **esquema** (1 o 2), no la de la cotización: la versión del documento va en `reference` (por ejemplo,
`…-v3`). La carpeta de salida debe estar vacía porque el renderer no sobrescribe: renderizar en una carpeta nueva y
reemplazar el PDF después. La versión anterior se conserva como respaldo.

## Patrón medido: fase 0 bonificada y medios del cliente fuera del fee (piloto de performance)

Medido el 2026-10-28 con ARMOR EPPS / Indecaucho: piloto de 90 días de LinkedIn Ads + Google Ads en Ecuador, Colombia y
Perú, cotización emitida ese día, resultado desconocido. Las cifras son ejemplo interno: no son tarifa, mínimo ni
referencia para otro cliente. Expedientes:
[fase 0](../../../../docs/commercial/accounts/indecaucho-armor/pricing-v3-2026-10-28-fase0/README.md) y
[cotización](../../../../docs/commercial/accounts/indecaucho-armor/cotizacion-2026-10-28/README.md).

**Fase 0 valorizada y bonificada.** El operador pidió: «La fase 0 valorizala pero a la vez bonificala».
`managed-service-core` no tiene fila `setup` y no imprime una cortesía con valor de referencia, así que la fase 0 se
costeó como **cotización V3 propia**: demanda de un período con las líneas de preparación de la medición del escenario
base (ECG-031 32 h, ECG-012 24 h, ECG-021 16 h, ECG-016 8 h, todo CL). Resultado: neto US$3.090, margen 59,4 %, igual a
la diferencia entre el escenario base y el A. En el deck se muestra «valorizada en US$3.090, bonificada». En la
cotización del piloto va como fila de texto en `conditions`, porque su brief no tiene una clave para eso; se declara
que la cifra sale del artefacto aparte, no de la cotización del piloto.

**Medios detallados sin tocar el fee.** La inversión en medios del cliente se declaró en `brief.thirdPartyCosts[]`:
`settlement: "client_direct"`, `category: "media"`, `periodIds [1,2,3]`, `evidence.status: estimated`, seis filas (USD
por mes, LinkedIn / Google): EC 2.050 / 200, CO 2.100 / 450, PE 1.050 / 150. El documento las imprime en el bloque
«Pagado directamente por el cliente», fuera de todo total. El fee quedó en US$9.260 (3.280 + 2 × 2.990), escenario D:
Trafficker Digital Semi-senior CO + Data Analyst CL al 20 %, margen 59,1 %.

**Precio a un champion: por partes, sin el gran total.** El operador: «En la inversión si le dices el monto total la
asustas y si no desglosas la inversión también». En el correo de envío la inversión va por partes (fase 0 valorizada y
bonificada; fee por mes; medios como techo mensual por país, pagados directo por el cliente), sin sumar. El deck
conserva el total en su propia lámina «Inversión total y condiciones».

**`buyer.taxId` sin dato.** El brief lo exige y el operador no quiso «RUC por confirmar» en la cotización («mejor no
poner eso»): se usó el país («Ecuador»). No inventar un número ni dejar una nota de pendiente en el documento.

**Condiciones.** Fee mensual anticipado por bloque de 30 días; vigencia 30 días; impuestos «Por confirmar» hasta saber
qué entidad factura. Son las condiciones sugeridas del costeo de la cuenta, usadas en la versión enviada.

## Fuentes consultadas (2026-07-26)

[FAR fixed-price](https://www.acquisition.gov/far/subpart-16.2), [FAR T&M](https://www.acquisition.gov/far/subpart-16.6),
[Google Cloud professional services](https://cloud.google.com/blog/topics/partners/purchase-professional-services-on-google-cloud-marketplace/),
[Bain B2B Elements of Value](https://media.bain.com/b2b-eov/),
[Stripe credits](https://stripe.com/blog/introducing-credits-for-usage-based-billing),
[IFRS 15](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2024/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf?bypass=on),
[FinOps FOCUS](https://focus.finops.org/focus-specification/v1-3/) y [NIST AI RMF](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/).
