---
name: efeonce-customer-model-operator
description: >-
  Diseña, audita y valida el modelo de cliente de cualquier oferta Efeonce: ICP, segmentación, beachhead, JTBD, buyer personas, buying group, stakeholder map, triggers, problem-solution fit, value proposition, decision process, procurement readiness, qualification, evidence, retention, expansion y customer success. Usar junto a business model, GTM, commercial, pricing o research cuando haya que decidir para quién existe una oferta, quién compra, por qué compra, cómo decide y qué evidencia habilita vender, renovar o escalar.
---

# Efeonce Customer Model Operator

Companion transversal de `efeonce-business-model-operator`. Convierte “nuestro cliente es X” en un modelo
auditable de cuenta, problema, valor, JTBD, grupo de compra, decisión, contrato, adopción y evidencia. Sirve para
servicios, Productized Services, Managed Squads, Staff Augmentation, plataformas, software, agentes, créditos,
licencias y ofertas híbridas. En ofertas compuestas, calificar por separado diagnóstico, implementación, operación
recurrente y ecosistema de proveedores.

No es una buyer-persona decorativa, un lead score ni un método de ventas único. `MEDDPICC`, `Challenger`, `JTBD`,
`BANT` u otros métodos son lentes que se seleccionan por complejidad; ninguno sustituye el modelo de cliente.

## Fuentes y ownership

Leer primero el modelo concreto en `docs/business-models/`, después cargar sólo lo necesario:

- `docs/context/13_icp-buyer-personas-jtbd.md` para contexto corporativo Efeonce;
- `gtm-architect` para mercado, segmentación, beachhead, positioning y motion;
- `commercial-expert` para discovery, negociación, qualification y ejecución de la oportunidad;
- `research-benchmark-operator` para VoC, JTBD, fuentes, triangulación y confidence;
- `efeonce-pricing-operator` para value metric, willingness-to-pay y packaging;
- `greenhouse-finance-accounting-operator` para economics, capacidad, cash y margen;
- `legal-privacy-ip-operator` para procurement, privacidad, contratos, datos, IP y terceros.

| Decisión | Owner |
|---|---|
| Segmento, ICP, beachhead y category | Strategy + GTM |
| Problema, JTBD, value proposition y outcomes | Strategy + práctica + Commercial |
| Buying group, discovery, qualification y next step | Commercial |
| Evidence, VoC, benchmark y confidence | Research |
| Pricing/WTP y economics | Pricing + Finance |
| Contrato, procurement, data/IP y liability | Legal/IP + Commercial |
| Adopción, delivery, retention y expansion | Practice + Operations + Customer Success |

## Invariantes

1. Un ICP no es “quién puede comprar”: es quién obtiene y entrega suficiente valor con economía, fit, acceso,
   repetibilidad, expansión y referencias.
2. Cuenta, oportunidad y stakeholder son objetos distintos. Una cuenta puede tener varias oportunidades y varios
   grupos de compra.
3. Buyer, user, owner del problema, champion, economic buyer, influencer, ratifier, blocker y procurement son roles,
   no cargos fijos; una persona puede tener varios.
4. JTBD describe progreso que el cliente intenta lograr en una situación; no es una feature ni un slogan.
5. Output, outcome, impact y claim se separan. No llamar outcome a una actividad ni atribuir impacto sin baseline,
   método y control causal suficiente.
6. Un stakeholder map es una hipótesis sobre poder, interés, actitud, legitimidad, urgencia y relaciones; no una lista
   de contactos.
7. Interest no es buying intent. La evidencia fuerte es progreso observable: datos compartidos, criterios, acceso,
   calendario, recursos, business case, procurement o siguiente compromiso bilateral.
8. Decision process y paper/procurement process son carriles distintos y ambos deben tener owner, fecha y gate.
9. `Approved for validation` no equivale a product-market fit, venta general, renovación ni escala.
10. Cada claim load-bearing tiene fuente, fecha, confidence, owner y condición de falsación. Research sintético no
    reemplaza señal humana real.
11. No se inventan casos, métricas, economic buyers, champions, presupuesto, urgencia ni autoridad.
12. Un buying committee no necesita unanimidad; necesita alineación suficiente sobre problema, resultado, criterios,
    riesgo, responsabilidad y proceso de aprobación.

## Workflow obligatorio

### 1. Enmarcar la decisión

Registrar oferta, mercado, geografía, moneda, tipo de cliente, decisión que el modelo habilita, horizonte, nivel de
riesgo, estado y evidencia ya disponible. Separar hechos, decisiones, hipótesis, preferencias y unknowns.

### 2. Segmentar y elegir beachhead

Definir segmentos homogéneos por dentro y distintos por fuera usando vertical, tamaño, geografía, madurez, job,
comportamiento, trigger, operating model y economía. Puntuar candidatos por dolor/urgencia, fit, alcanzabilidad,
referenciabilidad, expansión y economía. Elegir un beachhead; no validar “todo el mercado”.

### 3. Construir ICP

Registrar perfil firmográfico/operativo, contexto, madurez, stack, capacidad interna, trigger, constraints, anti-ICP,
alternativas, valor mutuo, ciclo esperado, economics, expansión y evidencia. No confundir ICP con persona ni con
segmento de anuncios. Separar `ICP estratégico`, `ICP de oportunidad` e `ICP de delivery`; una cuenta puede tener
fit comercial y ser inoperable por acceso, esfuerzo del cliente, governance, proveedores, aprobación o margen. En
ofertas faseadas, emitir ICP y anti-ICP por fase.

### 4. Formular JTBD y teoría de valor

Usar:

```text
Cuando [situación/trigger], quiero [progreso], para [resultado esperado]
```

Completar cadena:

```text
contexto → problema → job → cambio de comportamiento/adopción → output → outcome → impacto económico
```

Registrar supuestos, dependencias, control de Efeonce, baseline, target, horizonte, efectos adversos y método de
atribución. Mantener jobs funcionales, emocionales y sociales cuando cambien la compra o la adopción.

### 5. Mapear buying group y stakeholders

Mapear roles reales: user/operator, problem owner, champion, economic buyer, decision-maker, influencer/technical
expert, procurement/ratifier, legal/security/IT/finance, blocker y external influencer. Para cada uno registrar
interés, resultado personal, criterio, poder formal/informal, actitud, relación, evidencia y acción. En ofertas con
diagnóstico, implementación, Managed Squad o terceros, mapear por fase sponsor/mobilizer, acceptance owner, vendor
owner, escalation owner, renewal owner y quién puede cambiar o detener alcance.

### 6. Modelar el proceso de decisión

Separar y fechar trigger, reconocimiento, framing, opciones, criterios, validación, consenso, aprobación,
procurement/legal, movilización, primer valor, renovación y expansión. Registrar qué puede cambiar el proceso y cuál
es el next step bilateral verificable.

### 7. Calificar con evidencia

Usar MEDDPICC/MEDDPICC light sólo cuando la complejidad lo justifique. Evaluar problema, métrica, economic buyer,
decision criteria/process, paper process, champion, competition/statu quo, riesgo, capacidad de actuar y camino al
primer valor. Un campo sin evidencia es `unknown`, no `true`.

### 8. Validar problem-solution fit y willingness-to-pay

Diseñar entrevistas, observation, win/loss, smoke test, paid diagnostic, pilot o propuesta comparativa según la
decisión. Definir hipótesis falsable, muestra, métrica primaria, threshold, stop condition, owner, fecha y qué
evidencia cambia la decisión. No usar entusiasmo verbal como prueba de compra.

### 9. Validar procurement, riesgo y contrato

Registrar vendor onboarding, requisitos de seguridad, DPA, subprocesadores, certificaciones/seguros, procurement
thresholds, legal redlines, PO, MSA/SOW, payment terms, aceptación, penalidades, renewals y salida/portabilidad.
Incluir estos requisitos antes de presentar una oportunidad como calificable.
Clasificar cada tercero como prime contractor, ecosystem orchestrator, pass-through, subcontractor, plataforma,
proveedor de datos o ecosistema del cliente. Registrar sustitución, continuidad, incidentes, portabilidad, liability y
responsabilidad de costo, no sólo onboarding.

### 10. Conectar adopción, economics y expansión

Definir time-to-value, activation, adoption, health, sponsor ejecutivo, success cadence, renewal trigger, churn
reasons, downgrade, upsell, cross-sell, costo de servicing, capacity y margen. Separar GRR, NRR, logo retention,
renewal y expansion; no usar expansión para ocultar churn. En ofertas híbridas, exigir gates `diagnostic →
implementation → managed operation → renewal/expansion`, evidencia independiente por fase y economics por fase:
preventa, ramp-up, bench, coordinación, terceros, scope creep, capacidad reservada, cash y margen.

### 11. Emitir el Customer Model Integrity Pack

Usar `references/customer-model-integrity-pack-template.md`. El pack debe incluir verdict, confidence, evidence
ledger, gaps, next experiment, owners, review date y handoffs a business model, GTM, commercial, pricing, finance,
legal y operations.

## Verdicts

- `customer_model_incomplete`: faltan decisiones load-bearing o evidencia mínima.
- `hypothesis_only`: existe una hipótesis explícita; no hay prueba de compra.
- `validated_for_discovery`: problema/ICP suficientemente definido para discovery controlada.
- `approved_for_validation`: existe experiment design y entry criteria; sólo permite piloto/validación gobernada.
- `diagnostic_qualified`, `implementation_qualified`, `managed_operation_qualified`, `ecosystem_qualified`: verdicts
  independientes por fase; no se heredan automáticamente.
- `commercially_qualified`: cuenta/oportunidad con buying group, proceso, riesgo y next step evidenciados.
- `retention_ready`: existe primer valor, adoption y mecanismo de renovación medible.
- `expansion_ready`: existe trigger, capacidad, economics y boundary para crecer.
- `scale_constrained`: la demanda existe, pero delivery/capacidad/economics limita escala.
- `blocked_by_evidence`, `blocked_by_legal`, `blocked_by_finance`, `superseded`.

## Handoffs

- ¿A quién/con qué positioning/motion? → `gtm-architect`.
- ¿Cómo se vende/califica/negocia la oportunidad? → `commercial-expert`.
- ¿Cómo investigar y triangular evidencia? → `research-benchmark-operator`.
- ¿Cómo se empaqueta y cobra? → `efeonce-pricing-operator`.
- ¿Cómo se modelan costos, margen, cash y reconocimiento? → Finance.
- ¿Cómo se contrata, protege y opera con datos/terceros? → Legal/IP + Operations.

## Referencias load-on-demand

- [Customer model method](references/customer-model-method.md) — marco detallado, roles, JTBD, buying group,
  decision process, qualification, evidence, procurement, retention y fuentes externas.
- [Customer Model Integrity Pack template](references/customer-model-integrity-pack-template.md) — artefacto reusable.
- `docs/context/13_icp-buyer-personas-jtbd.md` — contexto existente de Efeonce; no sustituye evidencia de una oferta.
- `.codex/skills/gtm-architect/modules/01_MARKET_SEGMENT_SELECTION.md` — segmentación y beachhead.
- `.codex/skills/commercial-expert/` — ejecución comercial y qualification.
- `.codex/skills/research-benchmark-operator/` — rigor de research y confidence.
