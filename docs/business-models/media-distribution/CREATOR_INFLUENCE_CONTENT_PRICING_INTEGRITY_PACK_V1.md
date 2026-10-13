# Creator Influence & Content — Pricing Integrity Pack V1

> **Estado:** `Approved for validation`
> **Owner:** Strategy + Commercial + Finance + Media & Distribution
> **Versión:** V1.1 · 2026-07-29
> **Último delta:** 2026-10-10 — lectura del «Cómo se compra» del deck «Marketing de Contenidos» (§11); sin cambio de bandas, fórmulas ni veredicto
> **Moneda de referencia:** USD; cotizar en moneda del contrato con snapshot FX aprobado
> **Nota:** estas bandas son hipótesis internas de validación, no un tarifario público ni una autorización de venta
> **Benchmark:** contrastado con research comercial fechado en [Creator Influence & Content Market Research 2026-07-29](../../audits/commercial/CREATOR_INFLUENCE_CONTENT_MARKET_RESEARCH_2026-07-29.md)

## 1. Decisión de pricing

La arquitectura recomendada es:

```text
fee Efeonce por estrategia/operación
+ pass-through de creadores, managers, producción, derechos y media
+ comisión explícita sólo por coordinación financiera/procurement o performance verificable
```

El cliente debe poder distinguir cuánto cobra Efeonce, cuánto recibe el tercero y qué derechos está comprando. No se
aceptan comisiones ocultas, doble cobro ni un porcentaje de inversión como única justificación del fee.

## 2. Bandas de validación por oferta

| Oferta | Fee Efeonce de referencia | Terceros y derechos | Engagement recomendado |
|---|---:|---|---|
| Creator Fit Brief | USD 500–1.000 | No incluidos | 3–7 días, pago anticipado |
| Creator Intelligence Sprint | USD 1.500–4.000; multi-mercado USD 4.000–8.000 | No incluidos | 1–3 semanas, pago anticipado |
| Influencer Activation pequeña | USD 3.000–6.000 fijos | Pass-through | 4–8 semanas |
| Influencer Activation media | USD 6.000–12.000 fijos o 15% del creator/production spend, aplicando el mayor | Pass-through | 6–10 semanas |
| Influencer Activation enterprise | USD 10.000–20.000 fijos por ciclo | Pass-through | 8–12 semanas |
| Creator Content & UGC Engine | USD 4.000–8.000 mensuales; enterprise USD 8.000–15.000 | Pass-through por creator, producción adicional y rights | mínimo 3 meses |
| Creator Partnership Program | setup USD 5.000–12.000 + USD 6.000–15.000 mensuales | Pass-through | mínimo 6 meses; 12 meses preferido |
| Amplification & Whitelisting | setup USD 1.500–4.000 + USD 2.000–6.000 mensuales de governance | Derechos y media pass-through | ciclo de 4–8 semanas o mensual |

Las bandas deben ajustarse por mercados, número de plataformas, complejidad de categoría, seniority del equipo,
volumen de creators, nivel de aprobación, riesgo legal, urgencia, idiomas, viajes y cash exposure.

El mercado público muestra tres estructuras recurrentes —proyecto, retainer y porcentaje del creator spend— y modelos
managed donde los creator rewards permanecen separados del service fee. Efeonce adopta una arquitectura híbrida, pero
evita que el porcentaje de spend sea la única métrica o que aumente automáticamente con media que no administra.

### 2.1 Qué es referencia de mercado y qué es decisión Efeonce

| Elemento | Señal de mercado | Decisión Efeonce |
|---|---|---|
| Management fee | referencias públicas ubican 15–30% del creator spend; algunas agencias reportan 15–40% cuando agregan estrategia | usar fee fijo como default; usar 15% sólo para activaciones medias con mínimo |
| Managed campaign fee | plataformas publican servicios de briefing desde cientos de euros y fully managed custom | crear Creator Fit Brief productizado; no competir como marketplace barato |
| Creator rewards | se cotizan aparte del service fee en plataformas managed | siempre separar creator/manager fees del fee Efeonce |
| Paid usage | Aspire reporta 15–35% de la tarifa base por cada 30 días como patrón de algunos creadores | usar 15–35% como rango de negociación por 30 días; cotizar duración y plataformas explícitamente |
| Affiliate | platforms connect links/codes, sales and payouts | creator commission separada; Efeonce cobra operación o success fee sólo con atribución |
| Platform fee | ejemplos públicos de 10–19% sobre payouts en planes de plataforma | no copiar automáticamente; nuestro 10–15% sólo aplica si Efeonce administra pagos/riesgo |

Las señales de porcentajes son referencias direccionales, no un promedio estadístico del mercado LATAM. Las bandas
propias deben ajustarse después de medir horas, complejidad, FX, DSO, derechos y conversiones.

## 3. Comisión de gestión sobre terceros

Hay dos modelos válidos, que no deben mezclarse:

### Modelo A — cliente contrata directamente

- Efeonce cobra un fee fijo de estrategia y operación.
- El cliente firma y paga directamente a creadores/managers cuando sea viable.
- No existe comisión de intermediación para Efeonce.
- Efeonce coordina evidencia, contratos y entregables según alcance.

Es el modelo más transparente para los primeros pilotos.

### Modelo B — Efeonce administra el pass-through

- Efeonce contrata o paga a terceros por cuenta del cliente.
- El fee de coordinación/procurement es **10–15% del pass-through administrado**, con mínimo aprobado.
- Debe aparecer como línea separada: `Third-party coordination & payment administration`.
- El cliente recibe visibilidad del costo del tercero y del fee de Efeonce.
- Finance debe aprobar anticipo, riesgo de DSO, FX, impuestos, devoluciones y responsabilidad por incumplimiento.

La comisión no se justifica por “tener contactos”. Se justifica por sourcing, negociación, contracting, pagos,
reconciliación, reemplazos, risk management y accountability operacional.

### Regla de no doble cobro

Elegir sólo una de estas dos estructuras por SOW:

1. **Fee fijo de management:** Efeonce cobra por estrategia y operación; el cliente paga terceros directamente o como
   pass-through sin comisión adicional.
2. **Fee porcentual de management:** aplicar 15% sobre creator/production spend, con mínimo USD 6.000 para activaciones
   medias, sólo cuando el scope sea comparable y el volumen justifique el porcentaje.

Si Efeonce además adelanta y administra pagos, puede añadirse una línea administrativa de 10–15% únicamente cuando no
se haya usado ya el 15% de management sobre el mismo costo. No se acumulan 15% de management + 15% de procurement sobre
el mismo pass-through sin aprobación excepcional.

## 4. Comisión de performance

No debe ser el fee principal. Sólo se habilita cuando existe tracking y un resultado suficientemente controlable.

Hipótesis para validar:

- **Creator affiliate commission:** 5–15% de revenue neto atribuido, pagado al creador según categoría, margen y
  economía del cliente.
- **Efeonce success fee:** 2–5% de revenue neto cobrado atribuible, después de devoluciones, descuentos, impuestos y
  cancelaciones; o 5–10% de margen incremental validado cuando el cliente entregue margen confiable.

No combinar ambas. La comisión debe tener baseline, ventana, fuente, atribución, exclusiones, cap, auditoría y fecha de
liquidación. Debe existir un fee base que cubra el delivery aunque el performance fee sea cero.

No usar revenue share en awareness, reputación, brand lift sin tracking o campañas donde el cliente controla de forma
determinante inventario, pricing, landing, CRM o media sin compartir datos.

## 5. Compensación del creador

La compensación del creador es un costo de terceros, no revenue de Efeonce:

- fee fijo por producción o publicación;
- gifting/producto cuando no exista obligación de publicación o quede expresamente contratada;
- afiliado o comisión de creator según código/link;
- modelo híbrido fee base + upside para partnerships;
- derechos adicionales, exclusividad y whitelisting como líneas separadas.

Si un manager cobra una comisión, se registra como pass-through. Efeonce no debe recibir simultáneamente comisión del
creador y fee del cliente sin disclosure y aprobación contractual.

### Derechos y premiums de uso

Como hipótesis de negociación, no como tarifa automática:

- paid usage desde la cuenta de la marca: **+15–35% del creator base fee por cada 30 días**;
- whitelisting/Spark/Partnership Ads: cotizar como licencia separada, normalmente por encima del paid usage de la marca
  porque utiliza identidad y acceso del handle;
- exclusividad: **+15–30% del creator base fee por cada período contractual**, sujeto a categoría y territorio;
- territorio multi-mercado, raw files, perpetuidad o uso en televisión/OOH: cotizar individualmente y no incluir por
  defecto.

La referencia de 15–35% para paid usage deriva de investigación de Aspire; whitelisting y exclusividad requieren
negociación específica y revisión Legal.

## 6. Condiciones de pago

| Tipo de trabajo | Condición de validación |
|---|---|
| Intelligence Sprint | 100% antes de comenzar, o 50/50 sólo con aprobación comercial |
| Activation | fee Efeonce 50% al contratar y 50% al entregar; terceros financiados antes de comprometerlos |
| UGC mensual | fee mensual anticipado; terceros y derechos antes de producción |
| Partnership | retainer mensual anticipado; mínimo de 6 meses |
| Whitelisting | derechos y setup antes de activar; media siempre separada |
| Performance fee | liquidación mensual o trimestral contra datos aceptados |

Pausas, cancelaciones, reprogramaciones, kill fee, reemplazos, cambios de brief y rondas adicionales deben figurar en
el SOW. El cliente no puede cancelar un fee de creator ya comprometido sin cubrir las obligaciones contractuales.

## 7. Guardrails comerciales

- Fee mínimo de Efeonce por activación: validar en Finance; hipótesis inicial USD 3.000.
- Fee mínimo de Creator Fit Brief: USD 500; no incluye shortlist extensa, outreach ni negociación.
- Fee mínimo de Creator Intelligence Sprint: USD 1.500.
- Mínimo de programa recurrente: tres meses para Content Engine y seis meses para Partnership.
- Descuento por compromiso anual: sólo contra prepago o compromiso firme y aprobación Finance; sugerencia inicial máxima 5–10%.
- No descontar derechos, exclusividad, whitelisting ni fees de terceros sin evidencia del impacto.
- No usar porcentaje de media spend para pagar strategy/creator management.
- No ofrecer performance-only.
- No cotizar usage rights perpetuos por defecto.
- Toda cotización debe separar fee, pass-through, derechos, media, impuestos y contingencia.

## 8. Fórmula de cotización

```text
Total cliente
= fee Efeonce de strategy/management
+ fee de coordinación de terceros, si aplica
+ creator/manager fees
+ production/editing
+ usage rights / exclusivity / whitelisting
+ media spend y media operations
+ viajes, props y contingencias aprobadas
+ impuestos
```

La rentabilidad se calcula sobre el fee Efeonce y la coordinación administrada. El pass-through no debe inflar el
ingreso reconocido ni ocultar el margen real.

## 9. Validación económica requerida

Para cada piloto registrar: horas por rol, número de candidatos investigados, tasa de respuesta, rondas, tiempo de
negociación, creator spend, derechos, cash adelantado, DSO, re-trabajo, margen bruto, margen de contribución,
conversión Intelligence → Activation y renovación.

El veredicto permanece `approved_for_validation` hasta que Finance confirme cost-to-serve, mínimos, margen, cash y
tratamiento contable; Legal confirme derechos y liability; y Commercial confirme willingness-to-pay.

## 10. Decisión de escalabilidad

La unidad comercial principal será capacidad gobernada por lane y cadencia, no publicaciones. Se reutilizarán intake,
vetting, rights matrix, briefs, reporting y memoria de creators. Scouting bespoke ilimitado, performance-only,
porcentaje de media spend y derechos perpetuos incluidos quedan fuera del modelo estándar.

### 10.1 Fórmulas internas

```text
Management fee = max(fee mínimo, fee fijo por complejidad, 15% creator/production spend cuando aplique)
Coordination fee = 10–15% de pass-through administrado, sólo si no existe el 15% de management
Creator affiliate commission = 5–15% de revenue neto atribuido al creator
Efeonce success fee = 2–5% de revenue neto cobrado atribuible, con fee base obligatorio
Paid usage = 15–35% del creator base fee por cada 30 días, sujeto a negociación
```

Estas fórmulas sirven para construir escenarios y cotizaciones internas. Ninguna cifra está aprobada como precio
público hasta pasar por Finance, Legal, Commercial y cost-to-serve real.

## 11. Delta 2026-10-10 — lectura del «Cómo se compra» del deck «Marketing de Contenidos»

El operador aprobó el deck el 2026-10-10 y pidió incorporar su contenido al modelo (cita y alcance en el
[Business Model, §11](CREATOR_INFLUENCE_CONTENT_BUSINESS_MODEL_V1.md#11-delta-2026-10-10--incorporaciones-del-deck-marketing-de-contenidos)).
Un precio no queda aprobado por aparecer en un deck: este delta **no cambia ninguna banda, fórmula, mínimo ni el
veredicto** `approved_for_validation`. La lámina misma dice «los montos se definen en cada propuesta».

### 11.1 Las cinco líneas del deck sobre este pack

| Línea del deck | Dónde vive en este pack | Coincide | Lo que la lámina no dice y sigue vigente |
|---|---|---|---|
| Fee Efeonce · «fijo, por capacidad» | §1, §2 y §10: fee fijo como default; unidad = capacidad gobernada por lane y cadencia | sí, como default | la activación media admite «15% del creator/production spend, aplicando el mayor» (§2, §3). Ver DA-03 |
| Fees de creadores · «a costo, aparte» | §5: la compensación del creador es costo de terceros, no revenue de Efeonce; §8: pass-through que no infla el ingreso | sí: el fee del creador se traslada sin recargo | el Modelo B de la §3 agrega una línea propia de coordinación (10–15% del pass-through administrado) cuando Efeonce contrata y paga. La lámina no la lista. Ver DA-02 |
| Derechos y uso pagado · «línea propia» | §5 «Derechos y premiums de uso»; §7: no se descuentan sin evidencia | sí | paid usage, exclusividad, multi-mercado, raw files y perpetuidad se cotizan por separado entre sí |
| Whitelisting y medios · «línea propia» | §2 Amplification & Whitelisting; §6: media siempre separada | sí | son dos líneas distintas: la licencia de whitelisting es del creador; la inversión en medios es del cliente y, cuando se puede, la paga directo a la plataforma |
| Comisión por resultado · «sólo si se acuerda» | §4 | parcial | el acuerdo es necesario, no suficiente: tracking, baseline, ventana, fuente, atribución, exclusiones, cap, auditoría y un fee base que cubra el delivery. No se ofrece performance-only ni revenue share en awareness. Ver DA-04 |

### 11.2 «Empiezas chico»: mapeo propuesto, sin banda nueva

| Paso del deck | Oferta de este pack que lo cubre hoy | Condición vigente |
|---|---|---|
| Diagnóstico | Creator Fit Brief o Creator Intelligence Sprint | son pagados y, por defecto, anticipados (§6). Si el «diagnóstico de contenidos» del deck es una conversación comercial sin costo, es una etapa previa y no una de estas ofertas: DA-05 |
| Sprint de prueba «acotado y pagado, con objetivos acordados» | Influencer Activation pequeña, o un primer ciclo de Creator Content & UGC | no existe una banda llamada «sprint de prueba»: se cotiza con la oferta que corresponda y su mínimo (§7) |
| Servicio continuo | Creator Content & UGC Engine o Creator Partnership Program | mínimos de 3 y 6 meses (§7) |

El mapeo es una propuesta de lectura para Commercial y Finance, no una decisión de pricing.

### 11.3 Lo incorporado al modelo que no tiene precio

Entran a la oferta por decisión del operador del 2026-10-10 y quedan **sin banda, sin costo medido y sin fórmula**.
No se cotizan por analogía sin revisión de Finance:

- UGC patrocinado en LinkedIn (Thought Leader Ads): no hay referencia de fee de derechos ni de governance para esa
  plataforma; la referencia de 15–35% de la §5 deriva de la investigación de Aspire y no está contrastada para
  LinkedIn;
- licencia de contenido de clientes reales o de la comunidad;
- live shopping y formatos comprables con creadores, incluida la reutilización de la grabación;
- reserva de creadores antes de un lanzamiento (hold o exclusividad previa);
- convención y soporte de «origen por creador» para el CRM (la integración se cotiza en RevOps & CRM).

### 11.4 Decisiones abiertas que afectan este pack

Numeradas en el [modelo de la línea, §10](MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md#10-riesgos-y-decisiones-abiertas):
DA-02 (coordinación de terceros frente a «a costo»), DA-03 (alternativa porcentual frente a «fijo»), DA-04 (qué
comisión por resultado nombra el deck), DA-05 (diagnóstico y sprint de prueba), DA-06 (governance de Amplification &
Whitelisting y fee de Managed Performance sobre la misma amplificación) y DA-13 (bandas y mínimo de activación
distintos entre este pack y el Operating Control Pack, anterior al deck).

## Documentación relacionada

- [Creator Influence & Content Business Model V1](CREATOR_INFLUENCE_CONTENT_BUSINESS_MODEL_V1.md)
- [Ficha de servicio](../../services/media-distribution/CREATOR_INFLUENCE_CONTENT_SERVICE_V1.md)
- [Manual de operación](../../manual-de-uso/media-distribution/operar-creator-influence-content.md)
- [Market Research 2026-07-29](../../audits/commercial/CREATOR_INFLUENCE_CONTENT_MARKET_RESEARCH_2026-07-29.md)
