# Operator & Buying Group Registry V1

> **Estado:** `Proposed` — registro de cobertura; no sustituye los Business Model ni Customer Model Integrity Packs
> **Owner:** Efeonce Strategy + Product + Commercial + Client Experience
> **Fecha:** 2026-07-28
> **Canon transversal:** [`Efeonce Operator-First Product & Growth Contract V1`](../strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md)

## Propósito

Registrar, por capability, quién opera el trabajo, quién puede convertirse en operator-champion y cómo se
estructura el buying group. Este documento funciona como índice de cobertura y gap map; la evidencia y los
detalles de cada oferta viven en su Business Model o Customer Model Integrity Pack.

No inventar un operador por intuición. Un nombre funcional puede empezar como hipótesis, pero debe declarar owner,
fuente, fecha, confidence y condición de validación.

## Estados

| Estado | Significado |
|---|---|
| `defined` | Operator, journey y buying group tienen evidencia suficiente para la fase actual |
| `partial` | Existe parte del modelo, pero faltan operator journey, champion path o decision/paper process |
| `hypothesis_only` | Nombre funcional y roles son hipótesis explícitas sin evidencia primaria suficiente |
| `not_started` | El modelo no ha instanciado todavía el contrato |

## Registro

| Capability / Product Service | Operator funcional | Operator-champion path | Buying group mínimo | Greenhouse evidence | Estado | Owner / next step |
|---|---|---|---|---|---|---|
| **Creative Studio / Globe** | Creative Producer, Brand Content Lead, Designer/Producer o Director de Arte según run | El usuario protege craft y control; Head of Creative/Brand defiende continuidad y expansión | CMO/Marketing Director; Head of Creative/Brand; usuarios; Procurement/Finance; Legal/Brand Safety | runs, review, lineage, créditos, memoria, delivery y health de cuenta cuando esté integrado | `partial` | Creative Practice + Product; completar operator journey y validar por modo operativo |
| **Wave — Agentic Readiness** | Digital Growth Operator o Web/Visibility Lead | Convierte un audit en remediación y solicita expansión hacia web, measurement, agents o automation | CMO/Head of Digital; Web/Growth Lead; IT/Engineering; Analytics; Procurement/Legal | audit, baseline, remediation, adoption, evidence y expansión | `hypothesis_only` | Wave + Commercial; entrevistas con operadores de la primera puerta |
| **Wave — Search Visibility 360** | Search Visibility Operator o SEO/AEO Lead | Usa la medición para priorizar acciones y defender continuidad orgánica | CMO/Head of Digital; SEO/Growth Lead; Content; Web/Engineering; Analytics; Procurement | visibility baseline, action backlog, change log, evidence y renewal trigger | `hypothesis_only` | Wave + SEO/AEO; completar Customer Model Integrity Pack |
| **Wave — Experience LaunchOps** | Launch Operations Lead, Web Experience Lead o Digital Producer | Coordina brief, producción, aprobación, publicación y medición; moviliza nuevas lanes | CMO/Marketing Director; Digital/Web Lead; Brand; Product/Engineering; Analytics; Procurement | launch plan, approvals, release evidence, performance y learning loop | `hypothesis_only` | Wave + Product; validar el operador de la composición |
| **Media & Distribution / Reach** | Media & Distribution Operator, Performance Lead o Creator Partnerships Lead según solución | Convierte datos y operación multicanal en recomendación de mix, expansión y governance | CMO/Head of Growth; Media/E-commerce Lead; Brand/Communications; Finance; Sales/RevOps; Procurement/Legal | investment, pacing, rights, channel performance, incrementality/effectiveness y renewal | `partial` | Media & Distribution + Reach; separar operador por solución |
| **Search Visibility 360 — standalone model view** | Ver fila Wave; es la misma capability, no un operador adicional | Debe defender la transición de diagnóstico a operación recurrente | CMO/Head of Digital; SEO/AEO; Content; Web/Engineering; Procurement/Legal | Customer Model Integrity Pack + Measurement Contract | `hypothesis_only` | Wave + Customer Model; no declarar operator final antes de discovery |
| **Greenhouse / Account & Delivery** | Account Operator, Delivery Lead o Client Success Operator | Usa memoria y evidencia para detectar riesgo, renovar y expandir la cuenta | Director de Cuenta; Practice Lead; sponsor cliente; economic buyer; governance owner | Account 360, adoption, health, delivery, evidence, renewal y expansion | `partial` | Greenhouse + Client Experience; separar usuario interno y superficie ejecutiva cliente |
| **Growth Platform / ASaaS** | Growth Operations Lead o Integrated Growth Operator | Conecta capabilities y moviliza cross-sell con evidencia | CMO/CEO; Growth/Marketing Lead; Finance; Sales/RevOps; Procurement/Leadership | capability adoption, memory, Revenue Enabled, renewal, NRR y expansion | `hypothesis_only` | Strategy + Commercial; no usar como operator de una oferta concreta |

## Buying group contract mínimo por oferta

Cada fila debe enlazar a un modelo concreto que documente:

> Una capability puede aparecer una vez como parte de una familia de producto y otra como modelo comercial
> independiente. Esa vista no duplica operadores ni buying groups: la instancia validada debe tener un único
> contrato de roles, journey y evidencia.

- operador nombrado por función;
- operator JTBD y workflow;
- primer valor y time-to-value;
- operator-champion y evidencia de movilización;
- problem owner;
- sponsor/director;
- economic buyer;
- governance owner;
- procurement/ratifier y blockers;
- decision process;
- paper/procurement process;
- renovación, expansión y evangelización;
- métricas de capacidad desbloqueada, adopción, economics y riesgo.

## Próximas actualizaciones

1. Completar Creative Studio con evidencia por `efeonce-managed`, `co-operated` y `client-operated`.
2. Ejecutar RESEARCH-010 para validar el operator-champion de Wave, Media & Distribution y Greenhouse.
3. Actualizar cada Customer Model Integrity Pack con la sección `Operator & Buying Group Contract`.
4. No promover una fila a `defined` por una entrevista aislada, una demo, un cargo o una opinión de dirección.
