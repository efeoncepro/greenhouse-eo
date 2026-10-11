# Handoff

[V3](data/pricing/README.md): local.
Outlook: [firma + CCO](docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md).
Sesiones anteriores (continuidad del 2026-10-08 incluida): [Handoff.archive.md](Handoff.archive.md).

## 2026-10-10 — Brochure web y Product Design 360

**Cotizador V3, versiones vigentes, precios sin vencimiento y exposición a estimados** (commit `c38e2249b`, docs en el siguiente): las versiones vigentes ya no se nombran a mano; las nombra el puntero [`current.json`](data/pricing/v3-operating/current.json) y los comandos las cargan con `--current` (`current show|set`). Tras emitir una versión hay que mover el puntero o `pnpm pricing:v3:test` queda en rojo. Policy v6: el precio unitario de una herramienta no vence, lleva una fecha de revisión que avisa sin bloquear. El resumen suma `runNotices` (avisos de la corrida, no se congelan) y `estimateExposure` (qué dato estimado pesa más). Decidido por el CEO el 11/10: el costo de personas es el nivel salarial objetivo del Excel, no la nómina; no conectar nómina ni escribir sueldos. Propuestos por el agente, sin decisión expresa: revisión de precios el 2027-04-11 y FX EUR→USD 1,20; no se cotiza en EUR. Catálogo v7 (commit siguiente): la venta de una persona por dedicación (`talent-assurance-staffing`) tiene piso de margen de 25 % y objetivos de 30/35/40 % según el nivel del perfil, decididos por el CEO el 11/10; antes no tenía piso. Guía: [manual para agentes](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md); pendientes en el [ledger](data/pricing/v3-operating/operational-gaps.json).

**Cotizador V3, motor 1.2 y factores por país** (commit `e8117442b`): el precio sigue al país del cliente y el costo al país de la persona; donde el factor de mercado es menor que 1 el piso de margen lo acompaña. [ADR, delta 2026-10-11](docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md). Las versiones vigentes las nombra hoy el puntero (entrada anterior). Decididos por el CEO: mercado CL 1, CO 0,90, US 1,10 y sueldos del Excel como referencia de Chile. Estimados, por validar: talento CO 0,80, PE 0,85, MX 0,90, ES 3, US 5 y mercado PE 0,95, MX 1, ES 1,10 ([ledger](data/pricing/v3-operating/operational-gaps.json), `COUNTRY_FACTORS_UNVALIDATED`).

**Cotizador V3, motor 1.1 y catálogo v4** (commits `9e397278c`, `72fbf10d4`): precio acordado directo (`agreed_net`), redondeo comercial por moneda y dos contratos de entrada que conviven, con una guarda que reproduce todo artefacto congelado. [ADR](docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md). Para cotizaciones nuevas: `catalog.review-v4.json` + `resources.review-v5.json`. Decisiones del CEO del 10/10: piso de 45 % como norma, sueldos del Excel válidos, dólar de cotización 1.000 / 3.650 / 19,25 / 3,70 (CLP, COP, MXN, PEN) y redondeo a 10.000 / 10 / 50 / 50.000 / 100 (CLP, USD, PEN, COP, MXN) en toda oferta. Pendiente del operador: país de cada sueldo del catálogo ([ledger](data/pricing/v3-operating/operational-gaps.json), `LOCALIZED_TALENT_COSTS`).

**Cotizador V3, CLI endurecida** (commits `54bf7e232`, `5bb98cacd`, `8a82acc9e`): errores tipados, resumen derivado en `compose prepare|quote` y veredicto de piso en `assess`; kernel, versión de motor y digests sin tocar. [ADR y delta](docs/architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md), [manual](docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). Decisión del CEO: el piso de 45 % sigue siendo la norma; [SKY social care es excepción](docs/commercial/prospects/sky-social-care-2027/pricing/EXCEPCION-PISO-2026-10-10.md) (40,26 %). Pendiente, en [el ledger](data/pricing/v3-operating/operational-gaps.json): redondeo del precio al piso, precio acordado como ajuste directo y alcance del piso fuera de creativo.

**Brochure «Marketing de Contenidos»** (Brand, 57 láminas): aprobado 2026-10-10; [fuente, PDF y pendientes](ai-generations/2026-10-09_deck-contenidos/deck/LEEME.md), PDF en OneDrive `Brochures/2026/Marketing de Contenidos`. Entró a los modelos de [Social Media](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_BUSINESS_MODEL_V1.md) (decisiones abiertas 8–20) y [Media & Distribution](docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md) (`DA-01`…`DA-15`) sin cambiar estados ni precios. Antes de enviarlo: compromisos de servicio por contrastar, cifra «+85», datos de muestra y logos de terceros.

**Brochure «Servicios web y digitales»** (Engine, 29 láminas): aprobado 2026-10-09; [fuente, PDF y pendientes](ai-generations/2026-10-09_deck-web-nexa-spark/deck/LEEME.md), PDF en OneDrive `Brochures/2026/Web`. Antes de enviarlo: cifras reales de Aguas Andinas/ANAM (las de la lámina 18 son marcadores), plazo de Berel y titular repetido en 26–27. Commits locales `d0ccca3c6` y `eb5cf3795`, sin push.

**Product Design 360:** [aprobada entera por el operador](docs/architecture/EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md) (ADR `Accepted`, modelo `Approved`, Wave con seis familias); commit local `cf6d885ab`. Por confirmar: [TASK-1859](docs/tasks/to-do/TASK-1859-landing-product-design-360.md) quedó sin el freno del modelo; publicar sigue pidiendo autorización. Sin fila de PD360 en la matriz de precios de Wave.

## 2026-10-09 — CRM y Talent Assurance

[Ads✓](docs/README.md)

[CRM](docs/operations/CRM_SPECIALIST_CAPACITY_ACTIVATION_V1.md): aprobado; pendiente.

**Pibank:** [v13 enviada 09-10](docs/commercial/prospects/banco-pichincha-peru-seo-2026/README.md).
