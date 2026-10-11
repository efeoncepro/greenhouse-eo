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

- **Oferta económica documental rápida:** ante licitación/Compra Ágil urgente, HTML para PDF y alcance/precio/condiciones ya aprobados, usar la [plantilla A4 y su manual](../../../docs/commercial/templates/cotizacion-a4/README.md). Puede emitir una oferta formal para presentar. El ejemplo no autoriza copiar sus precios, alcance ni supuestos. La plantilla tiene dos versiones de datos: la **1** cotiza un único precio en cuatro páginas (`net` representa el programa completo y la división mensual sólo es referencial); la **2** cotiza varias líneas con precio y pagina su sección de inversión, sin reducir la tipografía.
- **Cotización de una cotización V3 («la cotización»):** el documento que recibe el cliente de una cotización V3 congelada es esa misma plantilla, versión 2 (decisión del CEO, 2026-10-11). Sus cifras **no se digitan**: las emite `pricing:v3 compose document` desde el artefacto, y el agente sólo escribe los textos. Pasos en [Cotizador V3](#cotizador-v3-flujo-completo-local-para-agentes).
- **Sistema Greenhouse:** si se pide operar catálogo, pricing engine, Quote Builder, snapshots, maker-checker o quote-to-cash, seguir [Cotizador](../../../docs/documentation/finance/cotizador.md) y [Pricing Comercial](../../../docs/documentation/finance/pricing-comercial.md) y sus contratos, verificando la superficie disponible. No responder a ese encargo generando el HTML local. Número de cotización, versiones, verificación por QR, firmas, aprobación, envío y CRM existen sólo ahí; la plantilla no los tiene.

Los datos de la plantilla son datos documentales con dos orígenes: un precio aprobado fuera de V3 se digita en un documento versión 1 (o versión 2, si son varias líneas aprobadas); un precio que viene de V3 lo emite `compose document` y **no se edita a mano**: si una cifra debe cambiar, se cambia la cotización y se vuelve a correr. En ambos casos el generador sólo comprueba sumas y deriva impuestos/total: no crea `quoteId`, costea, verifica margen, aprueba precio, ejecuta maker-checker ni registra CRM/facturación/envío. Un documento salido de V3 es un borrador (`status: draft`) de una cotización en revisión; no es un precio aprobado ni una cotización emitida. Conservar fuente y autoridad del precio aprobado en el expediente; costos o margen sin comprobar siguen sin validar. La aprobación comercial existente no se reabre por cambiar de formato ni obliga a recrear la oferta UTEM presentada. La revisión del PDF y la presentación son pasos separados. El documento no satisface un `quotation_id` persistido ni el GO de Proposal Studio; nunca inventar un ID o un margen para vincularlo.

La plantilla documental tiene [soporte multimoneda](../../../docs/commercial/templates/cotizacion-a4/MULTIMONEDA.md): conservar moneda/precio base, usar snapshot FX explícito con par, fecha y fuente, y revisar el PDF convertido completo. Moneda de presentación e impuestos son independientes; no inferir tasas, exenciones ni soporte runtime de Finance/pricing desde el renderer. La versión 2 se emite en una sola moneda y rechaza la conversión FX: un documento salido de V3 va en la moneda de la cotización, y otra moneda es otra cotización V3, nunca una conversión en el documento.

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
preview redactado, documento A4 de cotización para el cliente y mantenimiento con preview/apply/digests/impacto.
La referencia enlaza fuentes canónicas y comandos exactos; leerla antes de completar demanda o actualizar precios.

El agente interpreta; el dominio calcula. `resources inspect` → `compose scaffold|plan` →
`compose prepare|quote` → `explain|replay` → `compose assess|preview` → lecturas del artefacto
(`compose split|schedule|cash|commitments`) → `compose document` cuando hay que entregar la cotización.
Las versiones vigentes no se nombran a mano: las nombra el puntero `data/pricing/v3-operating/current.json` y los comandos las cargan con `--current`
(`current show` lo muestra). Una versión nueva se emite con `catalog apply`/`resources apply` y después se
mueve el puntero con `current set`; no sobrescribir artifacts. Se puede cotizar en CLP, USD, COP, MXN y PEN
(`brief.outputCurrency`), cada moneda con su FX de cotización y su redondeo; no en EUR (España se cotiza en USD).
El país entra por dos campos distintos de la demanda y rige con `quoteDate` 2026-10-11 o posterior:
`brief.offerMarketCountry` (país del cliente) ajusta el precio de la parte humana y `brief.lines[].talentCountry`
(país de cada persona) ajusta el costo; país no es moneda y los factores están cerrados por el CEO (valores de
política confirmados desde 2026-10-12; no reabrirlos). Con cliente en Colombia o Perú el piso acompaña al factor de
mercado: una cotización al precio de política no sale marcada aunque su margen real quede bajo el piso de su oferta,
así que el margen que se informa es siempre `marginRateRoundedDown`.
La forma del compromiso va en `brief.engagementForm`: `on_going` (razón 1) u `on_demand` (razón 1,10 sobre toda la
fila; no mueve costo ni piso). Es una forma de compromiso, no una oferta ni un modelo de entrega; sin declararla
cotiza como On-Going y no avisa, e Híbrido son dos cotizaciones. Tres lecturas de un artefacto congelado, que no
cambian nada: `compose schedule` (calendario de pagos, no factura), `compose cash` (caja; no es margen ni decide
precio) y `compose commitments` (compromisos con proveedores; informa y decide el operador).
**«La cotización» para el cliente** es una cuarta lectura, `compose document`, que emite los datos (versión 2) de la
[plantilla A4](../../../docs/commercial/templates/cotizacion-a4/README.md): `compose document --input artefacto.json`
imprime el andamio del brief (exit 2) → llenar el brief **sólo con textos** → `compose document --input artefacto.json
--brief brief.json --out data.json` (exit 3) → `node scripts/documents/render-cotizacion-a4.mjs --data data.json --out
<carpeta nueva>` → leer las capturas de `qa/` y el PDF página por página. Monto, moneda, impuesto y fecha salen de la
cotización congelada; el brief no tiene dónde ponerlos y se rechaza si los trae. **Nunca digitar ni editar una cifra
en el brief ni en los datos emitidos: se cambia la cotización y se vuelve a correr.** El PDF se entrega como borrador
mientras el precio no esté aprobado: no es `quotation_id`, precio aprobado ni cotización emitida. Claves de línea,
plegado por meses, impuesto, rechazos y ejemplos:
[referencia](references/cotizador-v3-agent-workflow.md#documento-de-cotización-para-el-cliente-delta-2026-10-11-cierre).
El documento también imprime **servicios opcionales** (cada uno es su propia cotización, pasada con `--option`;
fuera del neto y del total) y una **cortesía** (`courtesy: true` sobre una fila que la demanda bonifica): ni el precio
de una opción ni un valor de referencia se digitan.
Un opcional que amplía a personas que ya están en la cotización base (más dedicación, más consumo) no se lee en una
cotización propia, que vuelve a cobrar lo que se cobra una vez por línea y subestima su margen: se cotiza **la base
con el opcional adentro**, `compose increment --input con-opcional.artifact.json --base base.artifact.json` da su
precio, costo y margen como diferencia (lectura interna) y el documento lo imprime con
`--increment <clave>=<con-opcional.artifact.json>`:
[referencia](references/cotizador-v3-agent-workflow.md#opcional-que-amplía-la-base-incremento-delta-2026-10-11-cierre).
La fecha de inicio del servicio y la duración del contrato no son insumos del cotizador, por decisión del CEO
(2026-10-11: una cotización no es un contrato): no se piden para cotizar, no se listan como pendiente y el documento
no dice lo obvio (por ejemplo, quién define la fecha de inicio).
Puesta en marcha por
persona (onboarding por defecto, reclutamiento sólo por `choices`) y Adobe como se factura (CLP con IVA, una
licencia = 1/3 del paquete, `fx:CLP:USD` en `fxRecordIds`): pasos y límites en la referencia.
Los asientos nominativos se declaran **como se compran** —varios planes en un periodo, `idleSeats` con motivo,
`seatSharing` con motivo; nunca se le quita una tarea a una persona para que la cuenta cuadre— y los meses idénticos
van una vez con `periodIds`:
[referencia](references/cotizador-v3-agent-workflow.md#asientos-como-se-compran-y-periodos-declarados-una-vez-delta-2026-10-11-primer-caso-real).
Contrato 1.4.0: una compra a un tercero para un trabajo va en `brief.thirdPartyCosts[]` (`reinvoiced` = fila propia
con la regla de su categoría; `client_direct` = nota fuera de todo total) con monto, moneda, `periodIds` y
`evidence`: categoría, nunca una tasa. Un servicio gestionado `on_demand` recibe sola la reserva de contingencia
(12 % del costo de persona, como costo); sólo sale con `brief.contingency` `waived` y su motivo, y queda marcada. Con
terceros, contra el piso de la oferta se lee `ownWork.marginRateRoundedDown`, no el margen mezclado. Detalle:
[referencia](references/cotizador-v3-agent-workflow.md#costos-de-terceros-y-reserva-de-contingencia-delta-2026-10-11-noche).
Exit0=técnico,2=faltante,3=revisión,1=rechazo.
`compose prepare|quote` imprimen un resumen derivado (bloqueos, señales de revisión, líneas bajo el piso);
el resultado completo existe sólo en el artefacto de `--out`, así que quote siempre lleva `--out`; una corrida que
no calcula no escribe nada ahí y la corregida usa el mismo `--out`. Un rechazo
deja stdout vacío y trae en stderr `error.code` de un registro cerrado, con `option`/`issues` para ubicar el
arreglo; `ADAPTER_FAILURE` es una falla sin clasificar de la herramienta, no del pedido.
El resumen trae además `runNotices` (avisos de la corrida: nunca bloquean y se informan al operador junto al
resultado) y `estimateExposure` (qué dato estimado confirmar primero; es sensibilidad, no validación).
Los costos de persona son el costo objetivo que fijó el CEO, no la nómina: no proponer conectar la nómina ni
llamarlos «lo que Efeonce paga»; el margen real de hoy sobre personas es mayor que el mostrado.
Notion/M365 son base; tools e IA según necesidad y evidencia. Una simulación calculada no es costo
validado, asignación live, aprobación de precio ni quote emitida. Los40/35 propuestos por readiness
no sustituyen pisos de práctica aprobados. Hay tres ofertas, todas del CEO: servicio gestionado de la práctica
creativa (`creative-managed-service`, objetivo 45 %, piso 45 %), servicio gestionado de la práctica SEO/AEO
(`seo-aeo-managed-service`, objetivo 55 %, piso 45 %, desde 2026-10-11) y una persona vendida por dedicación, staff
augmentation (`talent-assurance-staffing`, objetivo 30/35/40 % por tier, piso 25 %, desde 2026-10-11). Se elige por
práctica y unidad vendida, nunca por el margen que deja pasar; sobre el piso el objetivo sube con una versión nueva
del catálogo, y una excepción bajo un piso es del CEO y nunca referencia para otro cliente.
El precio que se acuerda se declara directo en la demanda como
neto acordado (`agreed_net` en `brief.adjustments`, por periodo, con motivo), sin calcular tasas a mano, y se
vuelve a correr: el margen real y el veredicto del piso salen del motor. El catálogo vigente redondea cada
precio hacia arriba al múltiplo de su moneda, así que una línea al piso ya no sale marcada: una línea bajo el
piso de su mercado es un incumplimiento real y la excepción la decide el operador (CEO), nunca el agente. Mantener la frontera de
[promoción canónica](../../../docs/documentation/finance/cotizador-v3-promocion-canonica.md).
