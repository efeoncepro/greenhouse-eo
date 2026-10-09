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

## Cotizador V3: selección y mantenimiento del catálogo

Para cotizar desde un pedido con perfiles, países, dedicación y recursos, preferir `pnpm --silent pricing:v3`
con catálogo local explícito: `catalog search/show/validate` → `prepare --input brief.json` →
`quote --input brief.json [--catalog version.json] [--out artifact.json]` → `explain/replay`.
[Manual de agentes](../../../docs/manual-de-uso/finance/catalogo-v3-seleccion-y-actualizacion.md) y
[contrato de mantenimiento](../../../docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md).
No construir precios en el agente ni tomar costos/provisiones del expediente: éste aporta demanda.
Mantener variante/seniority/tier, ambos países, headcount y duración; kits especifican recursos completos,
asignación y alternativas. Faltantes/ambiguos se resuelven explícitamente, sin elegir el más barato ni cero.
Baseline histórica/simulación; no afirmar salario vigente o licencia compartible. `trial-*` son placeholders.
Códigos 2=pendiente, 3=calculado con revisión, 1=adapter/conflicto/export bloqueado. Explain toma el artefacto
congelado e incluye componentes humanos, recursos, cantidades, factores y fuentes utilizados.

Actualizaciones autorizadas usan change-set `add/replace/retire` con fuente nueva, vigencia, actor/motivo,
`baseDigest` y `nextVersion`; `catalog preview --input change.json [--impact briefs.json]` y
`catalog apply ... --confirm previewDigest --out new-version.json`. No editar baseline in-place ni
reutilizar confirmación de otra propuesta/base/impacto. Apply local no es aprobación comercial ni promoción
runtime; cotizar con el sucesor requiere `--catalog new-version.json`. Nunca reprecificar artefactos existentes.
Snapshot `calculate` permanece como operación de bajo nivel. Excel/workbook CLI es investigación histórica,
no dependencia del flujo V3. API/UI/MCP canónicos quedan fuera de la implementación local.

## Cotizador V3: composición de herramientas por demanda

Para pedidos con personas/servicio más licencias, plataforma o créditos, usar `pricing:v3 compose prepare|quote`
con catálogo monetario, policy y catálogo de créditos explícitos. [Manual](../../../docs/manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md).
Interpretar perfil/tareas sin cambiar salario por especialidad inferida; base Notion/M365 obligatoria, SEO→SEMrush,
Adobe/IA según trabajo. IA se elige con motivo; planes múltiples requieren priceId, no el más barato por defecto.
Declarar slots/seatCapacity/contrato, cantidad, driver/parte atribuida y presupuesto por proveedor/mes. No inventar
precios, denominadores ni permisos de compartir seats; dedicación parcial no reduce licencia automáticamente.
Quote nuevo congela todos los inputs; explain/replay usan ese artefacto. Tres fixtures son hipótesis, no defaults
operativos; Adobe current/EURsinFX/faltantes bloquean. Composición es simulation/requires_review y export bloqueado;
servicios conservan unidad comercial, pricing de capacidad interno no valida fee/contrato del programa.
