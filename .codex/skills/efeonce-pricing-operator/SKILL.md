---
name: efeonce-pricing-operator
description: >-
  Diseña, audita y valida packaging, pricing, revenue architecture y unit economics para cualquier oferta de Efeonce: servicios, productos, plataformas, software, créditos, managed services, Productized Services, Managed Squads, Staff Augmentation, implementation, advisory, usage, licensing o modelos híbridos. Usar ante decisiones sobre precio, tiers, rate cards, mínimos, descuentos, retainers, pass-through, proveedores, márgenes, cotizaciones, approval gates o monetización de nuevas capabilities.
---

# Efeonce Pricing Operator

Companion general de `efeonce-business-model-operator`. Convierte una oferta en una arquitectura comercial
defendible: packaging, métrica de valor, unidad de cobro, revenue streams, economics, guardrails y validación.

Es agnóstica a la línea de negocio: sirve para Efeonce Digital, Wave, Globe, Reach, Greenhouse, Kortex, Verk,
Creative Studio y futuras capabilities. No reemplaza Strategy/Commercial, Finance, Legal/IP, Operations, Product
ni Architecture; coordina sus decisiones y deja explícito qué está aprobado, qué es hipótesis y qué requiere gate.

## Compra Ágil: presupuesto y precio del programa

El presupuesto máximo del comprador no demuestra costo ni precio competitivo. Cuando el operador prioriza calidad al menor costo sostenible, separar costos fijos ya existentes, dedicación incremental, capacidad comprometida, costos externos y caja; no tratar el trabajo humano como gratuito por tener el equipo contratado. La ausencia de un costeo medido se registra, no se rellena con cero ni con un margen inventado.

El precio aprobado y presentado gobierna la cotización; las recomendaciones anteriores quedan históricas. Mostrar neto, IVA y total del plazo completo. Una división por meses es referencia aritmética mientras las bases no confirmen cobro mensual. Para CRM, conciliar la unidad comercial con el importe total neto del programa; mantener presupuesto comprador e impuestos separados.

Caso fechado: [UTEM, 08/10/2026](../../../docs/commercial/tenders/utem-seo-aeo-2026/PRESENTACION-2026-10-08.md). El importe acordado no se convierte en rate card, mínimo sostenible comprobado ni margen validado.

## Elegir el carril: documento de licitación o sistema Greenhouse

- **Oferta económica documental rápida:** ante licitación/Compra Ágil urgente, HTML para PDF y alcance/precio/condiciones ya aprobados, usar la [plantilla A4 y su manual](../../../docs/commercial/templates/cotizacion-a4/README.md). Puede emitir una oferta formal para presentar. El ejemplo no autoriza copiar sus precios, alcance ni supuestos; `net` representa el programa completo y la división mensual sólo es referencial.
- **Sistema Greenhouse:** si se pide operar catálogo, pricing engine, Quote Builder, snapshots, maker-checker o quote-to-cash, seguir [Cotizador](../../../docs/documentation/finance/cotizador.md) y [Pricing Comercial](../../../docs/documentation/finance/pricing-comercial.md) y sus contratos, verificando la superficie disponible. No responder a ese encargo generando el HTML local.

El JSON/data slots de la plantilla son datos documentales y el generador sólo deriva neto/IVA/total: no crea `quoteId`, costea, verifica margen, aprueba precio, ejecuta maker-checker ni registra CRM/facturación/envío. Conservar fuente y autoridad del precio aprobado en el expediente; costos o margen sin comprobar siguen sin validar. La aprobación comercial existente no se reabre por cambiar de formato ni obliga a recrear la oferta UTEM presentada. La revisión del PDF y la presentación son pasos separados. El documento no satisface un `quotation_id` persistido ni el GO de Proposal Studio; nunca inventar un ID o un margen para vincularlo.

La plantilla documental tiene [soporte multimoneda](../../../docs/commercial/templates/cotizacion-a4/MULTIMONEDA.md): conservar moneda/precio base, usar snapshot FX explícito con par, fecha y fuente, y revisar el PDF convertido completo. Moneda de presentación e impuestos son independientes; no inferir tasas, exenciones ni soporte runtime de Finance/pricing desde el renderer.

Para entregar varias monedas, identificar cada HTML/PDF con su código ISO en el nombre y guardar ambas versiones en la carpeta del cliente autorizada, según el manual anterior. Conservar fuente, versionado y snapshot FX en el expediente; verificar las copias por hash. Una copia local no acredita sincronización remota, envío, cambio CRM ni aprobación.

## Fuentes y ownership

Leer primero el modelo concreto en `docs/business-models/`, después `docs/documentation/finance/pricing-comercial.md`,
`.codex/skills/gtm-architect/modules/03_OFFER_PACKAGING_PRICING.md`, `.codex/skills/commercial-expert/`,
`.codex/skills/greenhouse-finance-accounting-operator/` y `.codex/skills/legal-privacy-ip-operator/`.

No mezclar product service, delivery model, engagement, operating mode, value metric, billing unit, revenue
stream, economics y contract. Ejemplos de delivery: Productized Service, Managed Squad, Staff Augmentation,
Studio Access, Implementation, Advisory y Platform-enabled Service. Ejemplos de engagement: On-Going, On-Demand
y Sample Sprint.

Antes de fijar packaging o pricing, usar `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` para
separar Product Service, nivel de productización, delivery model, operating mode y engagement. Pricing no debe
convertir un delivery model —por ejemplo Managed Squad o Staff Augmentation— en una oferta distinta sin decisión
de negocio explícita.
Tampoco debe convertir toda venta en Product Service: cargar
`docs/business-models/EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md`, clasificar primero oferta/servicio,
capability, engagement, project/campaign, deliverable/asset y nivel de productización, y pricear la categoría real.
Una campaña audiovisual, un plan de medios o un brandbook pueden ser servicio, project o deliverable sin ser Product
Service.

Para Creator Influence & Content, cargar además `docs/business-models/media-distribution/CREATOR_INFLUENCE_CONTENT_PRICING_INTEGRITY_PACK_V1.md` y el benchmark fechado `docs/audits/commercial/CREATOR_INFLUENCE_CONTENT_MARKET_RESEARCH_2026-07-29.md`. Sus bandas y porcentajes son hipótesis de validación: no sustituyen Finance, Legal ni el cost-to-serve real.
Para Performance & Commerce Distribution (paid media), cargar además `docs/business-models/media-distribution/PERFORMANCE_COMMERCE_PRICING_INTEGRITY_PACK_V1.md` y el benchmark fechado `docs/audits/commercial/PERFORMANCE_MEDIA_CHANNELS_PARTNERS_PRICING_RESEARCH_2026-09-10.md`: fee por nivel de complejidad con piso, nunca porcentaje de inversión como única métrica ni markup sobre medios o partners; el SKU legacy `EFG-003` está en conflicto con ese pack.
El pricing de servicios 2028 debe poder operar sobre Product Services AI-native: separar people capacity, platform,
agent/provider usage, governance, implementation, risk, rights y recurring economics; no asumir que AI-native implica
self-service o eliminar personas.

## Workflow

1. Enmarcar oferta, ICP, buyer, JTBD, trigger, resultado controlable, exclusiones, owner, geografía, moneda,
   capacidad y estado.
   Si ICP, JTBD, buying group o decision process no están modelados, cargar `efeonce-customer-model-operator`.
2. Elegir la métrica de valor: capacidad/lane, implementation, retainer, usage, workspace/tenant, outcome,
   licencia/IP, mínimo comprometido o híbrido.
3. Diseñar `wedge → core → expansion`; usar hasta tres tiers sólo con evidencia y fences por valor/capacidad/
   riesgo/governance.
4. Separar revenue de diagnóstico, implementación, recurrente, squad/capacity, staff augmentation, platform,
   usage, pass-through, IP/licensing, rights, comisión y revenue share.
5. Calcular fully loaded cost, cost-to-serve, margen, utilization, realization, provider cost, support, reserve,
   DSO, FX, GRR, NRR y expansión por oferta/cuenta/delivery/operating mode/provider/cohorte.
6. Aplicar mínimo, piso de margen, descuentos, maker-checker, effective dates, snapshots, audit trail y blast
   radius de cotizaciones.
7. Validar con experimento, muestra, threshold, stop condition, owner, plazo y evidence ledger.

## Valoración de casos SEO/AEO para captación bancaria

Cargar `docs/commercial/SEO_AEO_BUSINESS_CASE_METHOD_V1.md` y
`docs/manual-de-uso/comercial/construir-caso-negocio-seo-aeo.md` cuando la decisión sea invertir en captación.
Separar apertura, cuenta fondeada y saldo retenido por cohorte: depósitos captados no son ingresos ni margen del
banco. Finanzas del cliente valida un método de valoración, horizonte y costos; no sumar beneficios económicos
superpuestos. Costear el programa completo y su capacidad real, y calcular sensibilidad, costo por cuenta
incremental fondeada y punto de equilibrio con supuestos visibles. Una meta o moneda inferida autorizada para el
borrador no aprueba presupuesto ni pricing; sin valoración bancaria, presentar captación y contribución mínima
requerida para recuperar la inversión como escenarios, sin declarar ROI confirmado. La propuesta conserva los
gates de Finance, Commercial y Operations para precio, capacidad y compromisos.

## Compromiso inicial en programas por resultado (delta 2026-10-09)

Cuando el comprador pide «empezar mensual» o «por tres meses» un programa cuyo valor aparece con el tiempo (SEO/AEO,
contenido, autoridad), mostrar el valor mensual abierto, pero fijar el **compromiso inicial en el plazo en que la
propuesta promete las primeras señales**; después, renovación por periodos más cortos. No ofrecer una salida antes de
que haya algo que medir: un compromiso más corto que ese plazo deja al cliente evaluando un programa que no alcanzó a
ejecutarse. Caso Pibank (propuesta v13 enviada): base US$4.500/mes, compromiso inicial de seis meses con revisión en
M3 y decisión en M6, renovación trimestral con aviso de 30 días, base sin recargo por la renovación corta; tres meses
se descartó. La regla de forma (lámina «Cómo empezar») vive en `deck-studio`,
`references/propuesta-tecnica-seo-sin-presentador.md`.

## Guardrails

- ASaaS no equivale a SaaS, ARR ni producto software.
- No hay pricing defendible sin cost-to-serve, margen objetivo y sensibilidad.
- Revenue recurrente necesita trigger contractual y evidencia de renovación.
- Project, recurring, platform, usage, IP, pass-through y credits se separan.
- Product Service no es sinónimo de oferta, proyecto ni entregable; pricing no puede otorgar esa madurez por etiqueta.
- Credits no son dinero, horas, tokens, piezas ni derechos.
- Ningún precio queda aprobado por aparecer en un documento, CSV, deck o seed.
- La cara contractual puede ser Efeonce aunque una marca de producto nombre la solución.

## Output

Emitir un `Pricing Integrity Pack`: offer/packaging matrix, delivery matrix, value metric/billing unit,
revenue architecture, cost-to-serve y margin scenarios, discount/approval guardrails, quote/version policy,
validation plan, evidence ledger, owners, review date y verdict (`hypothesis_only`, `approved_for_validation`,
`commercially_approved`, `blocked_by_finance`, `blocked_by_legal`, `scale_constrained` o `superseded`).

Referencia canónica load-on-demand: `.codex/skills/efeonce-pricing-operator/references/general-pricing-patterns.md`.

## Capacidad, horizonte y reputación en casos SEO/AEO

Para valorar o dimensionar una propuesta SEO/AEO, cargar
[caso de negocio y propuesta](../seo-aeo/references/caso-negocio-y-propuesta.md). Costear todos los roles,
meses, revisiones, PR, herramientas y reserva; comparar valor neto por cohorte con costos del mismo
horizonte. Capacidad estimada, roster, costo y fee son estados separados bajo la autoridad vigente.

## Costeo local sin UI (Excel de pricing)

Cuando el operador quiera revisar el Excel o costear sin la UI del cotizador, usar
`pnpm --silent pricing:workbook`: `search`, `role`, `audit`, `scenario`, `estimate` y `compare`.
[Manual](../../../docs/manual-de-uso/finance/consultar-excel-pricing-por-cli.md) y
[contrato](../../../docs/architecture/GREENHOUSE_PRICING_WORKBOOK_AGENT_CLI_DECISION_V1.md).
La extracción JSON conserva celdas/fórmulas y verifica SHA256; los planes JSON permiten costos
reemplazados con fuente/fecha. Declarar capacidad vendible, dedicación, gastos y margen sobre venta.
Dedicado absorbe costo completo; compartido exige hipótesis explícita de venta restante.
Es una alternativa local usable sin UI/DB; no remitir al operador a una UI que no le funciona.
Sus resultados son hipótesis sobre costos históricos/declarados, no precios aprobados ni cotizaciones
emitidas. No importar al catálogo, tocar payroll ni publicar costos internos por inferencia.

## Cotizador V3: flujo completo local para agentes

Ante pedidos de cotizar roles o servicios sin UI, cargar
[contrato operativo V3](references/cotizador-v3-agent-workflow.md) y
[manual](../../../docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md).
Cubre selección de variantes/países/tareas, catálogo monetario, licencias, cartera/capacidad declarada,
créditos por proveedor/mes, provisiones, fuente/FX/vigencia, snapshots, explain/replay, readiness,
preview redactado y mantenimiento con preview/apply/digests/impacto. La referencia enlaza fuentes
canónicas y comandos exactos; leerla antes de completar demanda o actualizar precios.

El agente interpreta; el dominio calcula. `resources inspect` → `compose scaffold|plan` →
`compose prepare|quote` → `explain|replay` → `compose assess|preview`. El sucesor operativo es opt-in;
no cambiar defaults ni sobrescribir artifacts. Para cotizaciones nuevas el catálogo vigente es
`data/pricing/v3-operating/catalog.review-v5.json`, con `resources.review-v5.json` y
`data/pricing/v3-resources/ai-credits.review-v1.json`; se puede cotizar en CLP, USD, COP, MXN y PEN
(`brief.outputCurrency`), cada moneda con su FX de cotización y su redondeo.
El país entra por dos campos distintos de la demanda y rige con `quoteDate` 2026-10-11 o posterior:
`brief.offerMarketCountry` (país del cliente) ajusta el precio de la parte humana y `brief.lines[].talentCountry`
(país de cada persona) ajusta el costo; país no es moneda y varios factores son estimados. Con cliente en Colombia o
Perú el piso acompaña al factor de mercado: una cotización al precio de política no sale marcada aunque su margen
real quede bajo 45 %, así que el margen que se informa es siempre `marginRateRoundedDown`.
Exit0=técnico,2=faltante,3=revisión,1=rechazo.
`compose prepare|quote` imprimen un resumen derivado (bloqueos, señales de revisión, líneas bajo el piso);
el resultado completo existe sólo en el artefacto de `--out`, así que quote siempre lleva `--out`. Un rechazo
deja stdout vacío y trae en stderr `error.code` de un registro cerrado, con `option`/`issues` para ubicar el
arreglo; `ADAPTER_FAILURE` es una falla sin clasificar de la herramienta, no del pedido.
Notion/M365 son base; tools e IA según necesidad y evidencia. Una simulación calculada no es costo
validado, asignación live, aprobación de precio ni quote emitida. Los40/35 propuestos por readiness
no sustituyen pisos de práctica aprobados. El precio que se acuerda se declara directo en la demanda como
neto acordado (`agreed_net` en `brief.adjustments`, por periodo, con motivo), sin calcular tasas a mano, y se
vuelve a correr: el margen real y el veredicto del piso salen del motor. El catálogo vigente redondea cada
precio hacia arriba al múltiplo de su moneda, así que una línea al piso ya no sale marcada: una línea bajo el
piso de su mercado es un incumplimiento real y la excepción la decide el operador (CEO), nunca el agente. Mantener la frontera de
[promoción canónica](../../../docs/documentation/finance/cotizador-v3-promocion-canonica.md).
