# Media & Distribution — Business Model V1

> **Status:** `Approved for validation`
> **Owner:** Efeonce Strategy + Commercial + Media & Distribution
> **Version:** V1
> **Date:** 2026-07-26
> **Validated as of:** 2026-07-26
> **Review cadence:** después de cada piloto pagado y, como mínimo, trimestral
> **Related service:** [`Media & Distribution — catálogo de servicios`](../../services/media-distribution/README.md)
> **Related architecture:** [`Efeonce Portfolio, Brand and Business Line Architecture V1`](../../architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md)

## 1. Decisión ejecutiva

Efeonce operará Media & Distribution como una línea de negocio que ayuda a clientes con inversión o necesidad real
de distribución multicanal a conectar audiencias, canales, inversión, creadores, partners y medición con decisiones
de negocio.

La línea se venderá mediante tres soluciones:

1. **Distribution Strategy & Media Architecture** — diagnóstico y diseño de la arquitectura de distribución;
2. **Performance & Commerce Distribution** — operación de medios pagados y commerce orientada a adquisición y conversión;
3. **Influence, Earned & Partnership Distribution** — distribución mediante creadores, PR, comunidades y alianzas.

**Managed Media Operations** es una capa de delivery recurrente que puede gobernar una o varias soluciones; no es una
cuarta oferta. Paid media, retail media, ATL/OOH, creators/UGC, PR, sponsorships y dark channels son capacidades que
se activan dentro de las soluciones.

Reach puede habilitar método, datos, tooling y operación, pero es una product brand, no la agencia, la línea de negocio
ni el contratista principal. Efeonce mantiene la relación comercial, la accountability y el contrato.

El modelo no está aprobado para venta general. `Approved for validation` permite pilotos y SOW gobernados mientras se
validan demanda, cost-to-serve, rights management, proveedores, pricing, evidencia y repetibilidad.

## 2. Problema, ICP, buyer y JTBD

### Beachhead

Hipótesis inicial: empresas B2C o B2B2C mid-market y enterprise en LATAM que ya invierten en dos o más canales,
coordinan varios proveedores y tienen presión por demostrar eficiencia, cobertura, demanda o contribución a revenue.
El alcance inicial debe priorizar cuentas donde Efeonce pueda acceder a datos, aprobaciones, proveedores y un owner
interno con capacidad de decisión.

Triggers prioritarios:

- cambio o fragmentación de agencias/proveedores;
- lanzamiento, expansión de mercado o cambio de mix;
- caída de eficiencia o aumento de inversión sin claridad de retorno;
- necesidad de retail media, creators o partnerships;
- crisis reputacional o necesidad de autoridad/earned media;
- falta de conexión entre campañas, conversión, pipeline y negocio.

Anti-ICP de validación: cliente que sólo busca el ejecutor más barato de una plataforma, no comparte datos, no tiene
owner, requiere proveedores desconectados o pretende garantías sobre resultados que Efeonce no controla.

### Grupo comprador

| Rol | Interés principal |
|---|---|
| CMO / Marketing Director / Head of Growth | decisión de mix, crecimiento, cobertura y accountability |
| Head of Media / E-commerce | ejecución, eficiencia, operación y conversión |
| Finance | inversión, control, atribución y riesgo económico |
| Sales / RevOps | conexión con pipeline, calidad de demanda y revenue |
| Procurement / Legal | proveedores, derechos, liability, contratos y pagos |
| Brand / Communications | reputación, coherencia, disclosure y aprobación de contenidos |

### JTBD principal

> Cuando mi distribución está fragmentada entre canales, proveedores y audiencias, quiero saber qué activar, cuánto
> invertir y cómo aprender de ello, para crecer con mayor confianza y menos desperdicio operativo.

La teoría de valor es: mejor diagnóstico y arquitectura → mejor asignación y gobernanza → mejores aprendizajes y
decisiones → posible mejora de eficiencia, cobertura relevante o contribución a demanda. La relación causal debe
validarse por cuenta; no se presume atribución de revenue.

## 3. Taxonomía de la relación

| Capa | Decisión V1 |
|---|---|
| Masterbrand | Efeonce |
| Business line | Media & Distribution |
| Product brand | Reach, opcional y habilitadora |
| Offers | Tres soluciones comerciales |
| Delivery models | Productized Service, Managed Squad, Staff Augmentation o Platform-enabled Service según scope |
| Engagements | On-Demand, On-Going o Sample Sprint/diagnóstico gobernado |
| Operating modes | efeonce-managed, co-operated o client-operated sólo si el RACI lo permite |

Combinaciones válidas: diagnóstico → operación; operación de performance + commerce; influencia + creators + PR;
solución de distribución + Creative Services, Wave, Kortex o Growth Strategy & Measurement con RACI explícito.

Combinaciones inválidas por defecto: presentar Reach como agencia; vender IMO como servicio separado; incluir media
spend, creator fees, rights o producción sin declararlos; prometer revenue o atribución causal sin baseline y método;
usar las siete capacidades como siete productos con siete owners distintos sin una solución comprable.

## 4. Propuesta de valor y arquitectura de ofertas

### Distribution Strategy & Media Architecture

**Compra:** diagnóstico y arquitectura de distribución con decisión priorizada.

**Incluye:** auditoría de inversión, canales, audiencias, tracking y proveedores; escenarios de mix y presupuesto;
measurement plan; riesgos; gobernanza; roadmap y recomendación de siguiente fase.

**Excluye:** ejecución continua, inversión en medios, production, implementación técnica total, fees de terceros y
garantías de impacto.

**Wedge:** paid diagnostic de scope cerrado, con complejidad según mercados, marcas, canales, proveedores y calidad
de datos.

### Performance & Commerce Distribution

**Compra:** una operación integrada para planificar, activar, optimizar y aprender de medios pagados y commerce.

**Incluye, según madurez:** Measurement & Signal Foundation; Performance Media Operations; Commerce Media Operations;
Creative Performance System; Algorithmic Media Governance; y, cuando el caso lo permite, Incrementality & Marketing
Effectiveness.

Esto puede cubrir planning, setup o takeover, señales first-party, conversiones CRM/offline, gobierno de campañas,
audiencias, pacing, pujas, experimentos, retail media, feeds/catálogos, testing creativo, reporting ejecutivo y
recomendaciones de inversión.

**Excluye:** creative production, web, CRM, inventario, promociones, fees de marketplaces, media spend y garantías de
CAC, ROAS, revenue o pipeline.

**Core:** fee mensual u on-demand por complejidad y capacidad gobernada, separado de pass-through e inversión. La
operación debe optimizar señales de negocio, no únicamente métricas de plataforma.

**Wedge recomendado:** Performance & Commerce Diagnostic. La expansión natural es Growth Activation Sprint → Managed
Performance & Commerce → Incrementality & Media Investment Architecture cuando la cuenta demuestra madurez.

#### Escalera de medición

El engagement debe declarar si está en instrumentación, atribución, optimización, incrementalidad, efectividad o
gobierno. No se debe presentar server-side measurement como tracking perfecto, platform ROAS como causalidad, ni MMM
como verdad única. Incrementality y MMM requieren datos, volumen, historial, variación y un diseño de validación.

### Influence, Earned & Partnership Distribution

**Compra:** acceso relevante a audiencias, confianza, contextos y alianzas con derechos y medición gobernados.

**Incluye:** estrategia, sourcing/vetting, negociación, briefs, activación, producción de terceros, derechos,
disclosure, amplification, partnerships, PR y lectura de resultados.

**Excluye:** número universal de creadores, publicaciones, menciones, backlinks, leads, alcance o resultados. Cada
activación separa gestión, terceros, producción, derechos, paid usage, exclusividad, viajes y contingencias.

**Core:** proyecto por activación o programa recurrente por ciclo, con fee base y variables de terceros/derechos.

## 5. Revenue architecture

| Revenue stream | Value trigger | Billing unit V1 | Qué queda fuera |
|---|---|---|---|
| Strategy diagnostic | entrega y aceptación del diagnóstico | proyecto/scope y complejidad | ejecución posterior y pass-through |
| Strategy/management fee | disponibilidad y trabajo gobernado | fee por solución, mercado/canal y complejidad | media spend, terceros, derechos y producción |
| Signal/measurement implementation | señal de negocio implementada y aceptada | proyecto/scope o fase de implementación | licencias, infraestructura, datos no accesibles y asesoría legal |
| Managed Media Operations | operación y governance del ciclo | fee recurrente por capacidad/lane gobernado | inversión y costos variables no explícitos |
| Creator/partner activation | estrategia, negociación y activación | fee de gestión + pass-through por tercero/derechos | cualquier uso no contratado |
| Staff Augmentation | perfil integrado y período de servicio | capacidad/perfil/engagement aprobado | media spend, software y responsabilidades del cliente |

La unidad pública principal no debe ser horas, piezas, prompts, tokens ni porcentaje de inversión sin una justificación
de valor. El porcentaje de inversión puede ser un input interno o una alternativa contractual aprobada, nunca ocultar
el fee ni sustituir el modelo de valor.

## 6. Unidad económica y guardrails

La validación debe medir por solución, cuenta, mercado, canal, provider y delivery model:

- fully loaded cost y cost-to-serve;
- utilization, realization, coordinación y bench;
- fees de plataformas, creadores, publishers, marketplaces, viajes, derechos y FX;
- gross margin, contribution margin y working capital/DSO;
- costo de reporting, incidentes, re-trabajo, refunds y scope creep;
- capacidad máxima por media planner, strategist, producer, PR lead y account owner.

No hay precio público ni piso de margen aprobado en V1. Finance debe aprobar cualquier banda, descuento, mínimo,
pass-through, comisión, revenue share, refund o compromiso de capacidad antes de venta general.

Derechos de imagen, voz, likeness, exclusividad, territorio, duración, disclosure, whitelisting/paid usage y uso de
assets son líneas contractuales independientes. Legal/IP debe revisar cada activación de terceros.

## 7. Journey, adopción y expansión

```text
Paid Strategy Diagnostic
        ↓ decisión y roadmap aceptados
Performance & Commerce  ─┐
Influence/Earned/Partner  ├─→ Managed Media Operations
        ↓                 │
 expansión por mercado,  │
 canal, audiencia,       │
 partner o medición ─────┘
```

Gates de expansión:

1. problema y owner confirmados;
2. datos, accesos, derechos y procurement viables;
3. diagnóstico aceptado;
4. primer ciclo ejecutado con baseline y aprendizaje;
5. economics y calidad dentro de guardrails;
6. renovación o expansión aprobada por el buyer correspondiente.

## 8. Métricas y evidencia

Delivery: pacing, calidad de tracking, cobertura auditada, activaciones, derechos vigentes, experimentos, reporting y
aprendizajes.

Valor: redistribución adoptada, eficiencia frente a baseline, cobertura relevante, conversión, branded search,
tráfico asistido, menciones, autoridad o contribución a demanda según diseño.

Economics: win rate, conversion diagnostic→core, time-to-value, realization, gross margin, renewal, expansion,
provider concentration y cost-to-serve.

No llamar outcome a un output ni claim a una correlación. Revenue, pipeline, CAC, ROAS, reach incremental y
atribución causal requieren baseline, fuente, período, denominador, owner y confianza documentada.

## 9. Validación y gates

| Hipótesis | Experimento | Threshold inicial |
|---|---|---|
| El diagnóstico abre conversaciones calificadas | entrevistas + propuestas pagadas | tres oportunidades con problema, owner y next step verificables |
| El diagnóstico convierte a una solución core | seguimiento de cohortes | al menos una conversión con SOW y economics positivos por cohorte |
| El cliente paga por governance, no sólo ejecución | comparar propuestas fee fijo/híbrido | decisión explícita del buyer y margen dentro de guardrail Finance |
| Creators/PR/partnerships pueden operarse con calidad | piloto con derechos y checklist Legal | cero incidentes críticos y evidencia aceptada por cliente |
| La operación puede repetirse | segundo ciclo o segunda cuenta | menor re-trabajo, RACI estable y cost-to-serve conocido |

Los thresholds son hipótesis de validación, no evidencia existente. El resultado de cada experimento debe entrar en un
evidence ledger con fuente, fecha, owner, confianza, decisión y condición de abandono.

## 10. Riesgos y decisiones abiertas

- amplitud excesiva que devuelva una percepción de agencia generalista;
- dependencia de plataformas, publishers, marketplaces y creators;
- liability por derechos, disclosure, reputación y claims;
- opacidad de atribución y confusión entre correlación e impacto;
- concentración en pocos clientes o proveedores;
- operación manual que destruya margen;
- canibalización u overlap con Creative Services, Wave, Kortex o Growth Strategy & Measurement.

Decisiones abiertas: beachhead vertical prioritario; mínimo de inversión o complejidad; modelo de fee por solución;
capacidad y provider panel; stack real de Reach/Verk/Greenhouse; casos citables; rights playbook; y criterio para
declarar una solución `Commercially approved`.

## 11. Fuentes y trazabilidad

- [Media & Distribution — catálogo de servicios](../../services/media-distribution/README.md)
- [Performance & Commerce Distribution — market research 2025–2026](../../audits/commercial/PERFORMANCE_COMMERCE_DISTRIBUTION_MARKET_RESEARCH_2026-07-26.md)
- Reach brochure 2026 — `Alineación/4. Comercial/Brochures/2026/EO_Brochure_Reach-2026.pdf`, referencia comercial local revisada 2026-07-26; no es source of truth
- [Portfolio, Brand and Business Line Architecture V1](../../architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md)
- [Efeonce Product Service Operating Model V1](../EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md)
