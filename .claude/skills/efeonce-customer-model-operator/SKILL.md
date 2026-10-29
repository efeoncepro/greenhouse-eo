---
name: efeonce-customer-model-operator
description: Diseña y audita el modelo de cliente de cualquier oferta Efeonce: ICP, segmentación, beachhead, JTBD, buyer personas, buying group, triggers, decisión, procurement, qualification, evidencia, adopción, retención y expansión.
argument-hint: "[oferta, segmento o decisión comercial]"
---

# Efeonce Customer Model Operator

Companion transversal para Claude. Su fuente canónica de método es
`.codex/skills/efeonce-customer-model-operator/`; cargar primero su `SKILL.md` y, cuando corresponda,
`references/customer-model-method.md` y `references/customer-model-integrity-pack-template.md`.

Para investigar cuentas/personas y preparar rutas de acceso, usar
[efeonce-b2b-prospecting](../efeonce-b2b-prospecting/SKILL.md); este owner conserva ICP/JTBD y buying group.

## Contrato

No producir buyer personas decorativas ni declarar ICP, urgencia, champion, economic buyer, presupuesto o WTP sin
evidencia. Separar mercado, segmento, ICP, cuenta, oportunidad, stakeholder, job, outcome, impact y claim. En ofertas
compuestas, calificar por separado diagnóstico, implementación, operación recurrente y proveedores; `ICP estratégico`,
`ICP de oportunidad` e `ICP de delivery` no son equivalentes.
Modelar tanto el decision process como el paper/procurement process. Seleccionar MEDDPICC, Challenger, JTBD u otro
lente por complejidad; ninguno sustituye el modelo de cliente.
Para ofertas con horizonte 2028, validar también el nivel de human-in-the-loop, el operating mode esperado y la
evidencia de que el comprador adopta una capability Product Service AI-native, no sólo una entrega puntual.

Separar siempre `operator`, `operator-champion`, `problem owner`, `sponsor/director`, `economic buyer` y
`governance owner`; no tratarlos como cargos fijos. El primer valor debe sentirse en el workflow operatorio y la
adopción debe producir evidencia para assurance y expansión. Canon: `docs/strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md`.

Every Customer Model Integrity Pack must instantiate the `Operator & Buying Group Contract`: function-based operator,
workflow/JTBD, first value, path to operator-champion, sponsor, economic buyer, governance owner, procurement,
blockers, decision process, paper process, adoption evidence and expansion triggers. `Buying group` is the required
analytical contract even when the customer has no formal committee.

The customer model must preserve the agency-pain map even when the role architecture changes. Identifying the
operator does not itself resolve lost context, rework, approvals, weak reporting, diffuse ownership, governance,
key-person dependency or multi-provider coordination. Record how each pain affects the operator, which capability
reduces it, what evidence reaches the sponsor and what risk appears when the operator can adopt but cannot buy.

The model must also test the Why: the offer increases client capability and leaves useful memory for the next cycle.
Do not call opaque dependency that the client cannot explain, transfer or port “retention.”

## Sales Navigator y perfiles de cliente

Para traducir ICP/JTBD a búsqueda y listas nativas, cargar
[operación de Sales Navigator](../efeonce-b2b-prospecting/references/sales-navigator-operations.md).
Las Personas son filtros de roles; el ICP conserva cuenta, problema, iniciativa y grupo comprador.
Descubrir por encaje antes de filtrar por relación; conexión, seniority y lista guardada no acreditan
presupuesto, autoridad ni demanda. Servicios/landings, cobertura de roles y membresía se verifican por separado.

## Discovery y caso de negocio por iniciativa

Para preparar reuniones o incorporar su transcripción, cargar el
[método compartido](../efeonce-b2b-prospecting/references/discovery-to-business-case.md). Mantener
cuenta legal/marca/iniciativa, rol operador/comprador y prioridad real; la voz de quien responde se
distingue de propuestas nuestras y acuerdos. Evidencia parcial no completa autoridad, presupuesto o
ROI. Fuente declarada y localización sustentan el caso; Commercial y Pricing conservan sus decisiones.

## Continuidad de discovery en propuestas SEO/AEO

Cuando la reunión cambia el objetivo de una propuesta, separar entidad legal, marca comercial, producto,
dominio y oportunidad antes de reutilizar investigación o demos. Registrar la decisión que debe poder defender el
interlocutor y los roles de evaluación/compra como conocidos o pendientes; interés y recepción positiva no prueban
champion, presupuesto ni adjudicación. Con autorización del operador, avanzar el borrador con evidencia pública
y supuestos explícitos aunque falten datos privados, dejando owner y siguiente validación; una moneda inferida por
aritmética sigue sin confirmar. Datos de cuenta en su expediente, método reusable en
`docs/commercial/SEO_AEO_BUSINESS_CASE_METHOD_V1.md` y operación en
`docs/manual-de-uso/comercial/construir-caso-negocio-seo-aeo.md`.

## Resultado obligatorio

Entregar un Customer Model Integrity Pack con: decisión y alcance, segmentos/beachhead, ICP/anti-ICP, JTBD y teoría
de valor, buying group y stakeholder map, triggers, decision/paper process, qualification, validación/WTP, adopción,
retención/expansión, ecosistema y riesgo de proveedores, evidence ledger, gaps, owners, gates, verdict y handoffs a business model, GTM, commercial,
research, pricing, finance, legal y operations.

## Handoffs

- GTM decide category, positioning, segmentación y motion.
- Commercial ejecuta discovery, qualification, negociación y next steps.
- Research diseña evidencia, VoC, entrevistas, triangulación y confidence.
- Pricing/Finance calculan y recomiendan WTP, packaging, margen, capacidad y economics; la cifra comercial y sus
  excepciones las decide el CEO.
- Legal/Operations decide procurement, datos, IP, riesgo, contrato y delivery.

La especialización de línea de negocio siempre conserva sus invariantes; esta skill aporta el modelo transversal.

Cuando una oferta depende de un partner/provider, cargar también la sección canónica `Calificación de partners y
providers en la oferta`. El estado del programa del tercero no prueba demanda del cliente, readiness de delivery ni
calificación comercial: exigir evidencia de JTBD, procurement/seguridad, ownership, economics, continuidad y
sustitución.

## Continuidad de campañas CMP

Canon: [registro y contrato de brief](../../../docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md#8-contrato-del-brief-ampliado-y-templates).
El pensamiento vive en `Alineación/2. Campañas/CMP-###_…`; los assets, en la carpeta del canal.

El brief CMP registra JTBD situado y roles operador/sponsor/validadores; mid-market/enterprise son contextos,
no equivalencias rígidas entre cargo, autoridad o conversión. Etiquetar inferencias y validar con compradores;
una skill o una recepción positiva del concepto no certifica demanda. Conservar alternativas y frenos de compra.

## Contrato de éxito y dependencias en SEO/AEO

Al convertir discovery SEO/AEO en propuesta, cargar
[caso de negocio y propuesta](../seo-aeo/references/caso-negocio-y-propuesta.md). Reconciliar producto,
uso, etapa del outcome y periodo de la meta; registrar buying group, owners y alternativas de acceso,
revisión e instrumentación. Una aspiración de contribución no es forecast ni presupuesto confirmado.

## Demanda del comprador y Cotizador V3

Al convertir necesidades de una cuenta en una simulación de precio, cargar
[contrato operativo V3](../efeonce-pricing-operator/references/cotizador-v3-agent-workflow.md).
Declarar mercado de oferta separadamente del país del talento; willingness-to-pay e ICP no se prueban con un
factor histórico. Una búsqueda de persona/freelancer CRM es un trigger de problema, no intención de comprar
Staff Augmentation o servicio gestionado. Confirmar dirección del trabajo, buying group, alcance y objeciones.
Las tareas permiten seleccionar recursos (SEO→SEMrush, diseño→Adobe, IA por motivo) sin cambiar variante salarial.
El agente interpreta demanda; pricing calcula. Tools del cliente exigen evidencia de acceso y vigencia; no
asumirlas por nombre/partner. Base Notion/M365 sigue del equipo. Simulación, capacity declared y preview redactado
no prueban roster real, presupuesto, aprobación comercial o contrato; conservar gaps/owner y validación del caso.

## Cuenta integral de medios

Cargar el [método compartido](../digital-marketing/references/programmatic-media-operations.md) y el
[modelo de línea §1.1](../../../docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md#11-oferta-integral-como-agencia-de-medios).
Calificar objetivo, mix, inversión, acceso a señal, alcance ya contratado, operador del cliente y buying group.
Separar adopción del cliente de formación del equipo Efeonce que opera el DSP. Una reunión de proveedor y pedidos
regionales declarados no prueban compra, presupuesto ni demanda pagada. Integrar expansión con capacidad incremental
costeada; conservar decisión de mix, aceptación, renovación y aprendizaje como evidencia del cliente.
