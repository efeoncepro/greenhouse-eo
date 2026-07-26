---
name: efeonce-customer-model-operator
description: Diseña y audita el modelo de cliente de cualquier oferta Efeonce: ICP, segmentación, beachhead, JTBD, buyer personas, buying group, triggers, decisión, procurement, qualification, evidencia, adopción, retención y expansión.
argument-hint: "[oferta, segmento o decisión comercial]"
---

# Efeonce Customer Model Operator

Companion transversal para Claude. Su fuente canónica de método es
`.codex/skills/efeonce-customer-model-operator/`; cargar primero su `SKILL.md` y, cuando corresponda,
`references/customer-model-method.md` y `references/customer-model-integrity-pack-template.md`.

## Contrato

No producir buyer personas decorativas ni declarar ICP, urgencia, champion, economic buyer, presupuesto o WTP sin
evidencia. Separar mercado, segmento, ICP, cuenta, oportunidad, stakeholder, job, outcome, impact y claim. En ofertas
compuestas, calificar por separado diagnóstico, implementación, operación recurrente y proveedores; `ICP estratégico`,
`ICP de oportunidad` e `ICP de delivery` no son equivalentes.
Modelar tanto el decision process como el paper/procurement process. Seleccionar MEDDPICC, Challenger, JTBD u otro
lente por complejidad; ninguno sustituye el modelo de cliente.
Para ofertas con horizonte 2028, validar también el nivel de human-in-the-loop, el operating mode esperado y la
evidencia de que el comprador adopta una capability Product Service AI-native, no sólo una entrega puntual.

## Resultado obligatorio

Entregar un Customer Model Integrity Pack con: decisión y alcance, segmentos/beachhead, ICP/anti-ICP, JTBD y teoría
de valor, buying group y stakeholder map, triggers, decision/paper process, qualification, validación/WTP, adopción,
retención/expansión, ecosistema y riesgo de proveedores, evidence ledger, gaps, owners, gates, verdict y handoffs a business model, GTM, commercial,
research, pricing, finance, legal y operations.

## Handoffs

- GTM decide category, positioning, segmentación y motion.
- Commercial ejecuta discovery, qualification, negociación y next steps.
- Research diseña evidencia, VoC, entrevistas, triangulación y confidence.
- Pricing/Finance decide WTP, packaging, margen, capacidad y economics.
- Legal/Operations decide procurement, datos, IP, riesgo, contrato y delivery.

La especialización de línea de negocio siempre conserva sus invariantes; esta skill aporta el modelo transversal.
