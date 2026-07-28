# Efeonce Operator Pain & Journey Failure Map V1

> **Estado:** Proposed operating artifact — validación primaria pendiente
> **Owner:** Efeonce Customer Experience + Product + Client Experience
> **Fecha:** 2026-07-28
> **Canon relacionado:** [Operator-First Product & Growth Contract](EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md) · [RESEARCH-010](../research/RESEARCH-010-client-operating-system-primary-validation.md)

## 1. Propósito

Este documento convierte el mapa de dolores de agencia en un artefacto de Customer Experience operativo. No
describe únicamente lo que el operador siente: conecta cada dolor con la fase del journey, el failure mode visible,
la causa backstage, la capacidad que debe resolverlo, la evidencia que necesita el sponsor y la recuperación cuando
la promesa falla.

El mapa es una hipótesis estructurada. No declara prevalencia regional, product-market fit ni estado de runtime.
Cada dolor debe validarse con episodios recientes, evidencia operacional y comportamiento longitudinal.

## 2. Modelo de lectura

```text
dolor del operador
  → failure moment del journey
  → causa backstage / handoff / governance
  → capacidad operatoria
  → evidencia visible para operador y sponsor
  → recovery o aprendizaje sistémico
  → adopción, renovación o expansión
```

El operator-champion no es la solución del dolor. Es una señal de que la capacidad redujo fricción, aumentó
autonomía o fortaleció la influencia interna lo suficiente como para movilizar adopción.

## 3. Mapa por fase del lifecycle

| Fase | Dolor principal | Failure moment visible | Causa backstage probable | Capacidad Efeonce a validar | Evidencia / métrica | Owner inicial |
|---|---|---|---|---|---|---|
| **Antes de comprar** | La agencia promete valor sin demostrar comprensión del negocio | El operador debe explicar contexto varias veces y la propuesta sigue siendo genérica | Discovery superficial, handoff comercial-delivery incompleto, ausencia de memoria | Business/context intake reutilizable y problem framing por workflow | Tiempo hasta brief aceptado; repeticiones de contexto; claridad del JTBD | Commercial + CX |
| **Onboarding** | El operador no sabe qué ocurrirá, quién decide ni dónde vive la información | Primeras semanas con canales dispersos, dudas y solicitudes repetidas | Falta de owner, decision rights, baseline, canal y next expected event | Ecosystem Tour, onboarding contract, role map, baseline y operating cadence | Time-to-first-value; onboarding effort; completion; cobertura de roles | CX + Account |
| **Primer valor** | La primera entrega no demuestra utilidad ni conexión con el negocio | Output entregado, pero el operador debe interpretarlo, corregirlo o defenderlo solo | Brief incompleto, criterio de aceptación ambiguo, ausencia de evidencia | Primer wedge con criterio de aceptación, review y evidence packet | First value; aceptación; rondas; tiempo de interpretación; segundo uso | Practice/Product |
| **Ritmo operativo** | Retrabajo, entregas inconsistentes y aprobaciones lentas | El operador persigue versiones, feedback y fechas; el trabajo se estanca | Ownership difuso, feedback en canales paralelos, falta de estado y dependencias | Approval/accountability flow, memoria de decisiones, estados honestos y handoffs | RpA; cycle time; OTD; stuck assets; handoff failure rate; esfuerzo | Delivery + Product |
| **Medición y reporting** | Los reportes no sirven para decidir ni defender presupuesto | El operador recibe métricas, pero no puede responder “qué significa” o “qué hacemos ahora” | Vanity metrics, atribución débil, falta de baseline, lenguaje no ejecutivo | Evidence-to-growth layer, narrativa de decisión y artefactos compartibles | Decisiones con evidencia; confidence; time-to-insight; Revenue Enabled | Product + Account |
| **Coordinación multi-provider** | El operador integra agencias, freelancers, plataformas y equipos internos | Nadie sabe quién es responsable; el operador actúa como project manager de todos | Interfaces sin owner, objetivos incompatibles, procurement separado | Multi-provider orchestration, ownership map y dependency ledger | Número de handoffs; recontactos; escalaciones; horas de coordinación | Account + CX |
| **Marca, legal e IA** | Riesgo de inconsistencia, derechos, provenance o uso de IA | La revisión se detiene tarde o el operador no puede explicar origen y control | Governance implícita, controles tardíos, contratos ambiguos, ausencia de disclosure | Brand governance, provenance, human review, rights checklist y recovery path | Incidentes; excepciones; tiempo de aprobación; % con provenance; reversibilidad | Governance + Practice |
| **Momento de tensión** | El operador queda expuesto cuando algo falla | Debe comunicar atraso, error o resultado débil sin datos confiables | Transparencia reactiva, falta de recovery owner y señales tempranas | Protocol of transparency, health drivers, incident log y service recovery | Tiempo a detección; tiempo a recovery; reincidencia; confianza post-recovery | Account + CX |
| **Renovación** | El valor acumulado no está visible | La renovación comienza reconstruyendo meses de trabajo y defendiendo una lista de actividades | Memoria fragmentada, ausencia de outcome narrative y sponsor silence | Account 360, “Tu año con Efeonce”, renewal evidence y sponsor briefing | Renewal readiness; adoption depth; outcome; sponsor engagement; GRR | Account + Greenhouse |
| **Expansión** | El operador ve nuevas necesidades, pero no puede movilizar presupuesto | El cross-sell aparece como propuesta aislada o presión comercial | No existe trigger basado en evidencia ni traducción ejecutiva | Pulse por evidence, expansion trigger y business case del champion | Introducciones; expansión por capability; time-to-next-value; NRR | Commercial + Account |
| **Evangelización** | El operador valora la relación, pero no tiene una historia compartible | La recomendación depende de memoria personal y no de evidencia autorizada | Falta de caso, permisos, narrativa y momento de petición | Referral human-driven, proof packet y consentimiento de claims | Referral cualificado; advocacy; caso autorizado; conversión | CX + Commercial |
| **Offboarding** | La salida implica pérdida de memoria o dependencia opaca | El cliente no puede exportar contexto, decisiones y resultados | Datos no portables, cierre sin retrospectiva, ausencia de handoff | Offboarding profesional, export, portability y learning review | Portabilidad; tiempo de cierre; datos exportados; relación post-salida | CX + Product |

## 4. Taxonomía transversal de dolores

| Familia | Qué vive el operador | Qué debe aumentar Efeonce | Señal de que no está resuelto |
|---|---|---|---|
| **Contexto y memoria** | Repite negocio, brief, decisiones y racionales | Continuidad y memoria reutilizable | El siguiente ciclo empieza de cero |
| **Entrega y consistencia** | Corrige, persigue y controla calidad | Capacidad de ejecución confiable | Suben rondas, defectos y scope variance |
| **Aprobación y feedback** | Coordina personas y versiones | Velocidad con criterio y decision rights claros | El canal informal sigue siendo la fuente real |
| **Medición y evidencia** | Recibe actividad sin decisión | Capacidad de explicar, priorizar y defender | Hay métricas, pero no next action ni confidence |
| **Ownership y coordinación** | Absorbe handoffs entre providers | Accountability visible | Recontactos, silencios y escalaciones |
| **Marca y governance** | Asume riesgo reputacional y legal | Control, provenance y revisión humana | El control ocurre al final o depende de una persona |
| **Influencia interna** | Debe convencer a dirección sin suficiente evidencia | Credibilidad y autonomía | El operador usa el servicio, pero no lo puede defender |
| **Continuidad comercial** | Pierde contexto entre venta, delivery y renovación | Memoria acumulada y relación multihilo | Sponsor silence, renewal surprise o churn reactivo |

## 5. Momentos de verdad prioritarios

La prioridad inicial se calcula como heurística, no como verdad matemática:

```text
priority = impact × emotional_load × severity × relationship_risk × (1 + frequency)
           × (1 - reversibility)
```

Priorizar para la primera investigación:

1. **Brief aceptado:** ¿el operador siente que la agencia entendió el problema o debe traducirlo otra vez?
2. **Primera revisión:** ¿el primer valor reduce trabajo o crea otra ronda de interpretación?
3. **Aprobación bloqueada:** ¿existe un owner claro y un siguiente evento esperado?
4. **Resultado difícil de explicar:** ¿el operador puede defender la decisión con evidencia?
5. **Incidente o atraso:** ¿la agencia muestra datos, asume ownership y recupera confianza?
6. **Renovación:** ¿el valor acumulado está disponible antes de que aparezca la conversación de presupuesto?
7. **Expansión:** ¿la nueva necesidad emerge de evidencia o de una venta desconectada del workflow?

## 6. Service blueprint mínimo por dolor

Cada dolor validado debe completar estas lanes:

| Lane | Pregunta obligatoria |
|---|---|
| Acción del operador | ¿Qué intenta hacer y qué workaround ejecuta? |
| Experiencia visible | ¿Qué ve, siente, espera y comunica? |
| Frontstage Efeonce | ¿Qué persona, agente, producto o ritual interactúa? |
| Backstage | ¿Qué proceso, handoff, dependencia o decisión causa el fallo? |
| Sistemas y datos | ¿Qué fuente contiene contexto, estado, evidencia o riesgo? |
| Governance y partners | ¿Qué límite, contrato, proveedor o aprobador habilita o bloquea? |
| Owner | ¿Quién puede resolver, recuperar y prevenir la reincidencia? |
| Métrica | ¿Qué baseline, cohorte, denominador y target prueban mejora? |
| Recovery | ¿Cómo se informa, repara, aprende y cierra el loop? |
| Greenhouse signal | ¿Qué evidencia ejecutiva queda disponible para sponsor y renewal? |

## 7. Métricas mínimas

No medir únicamente satisfacción o logins. Cada capability debe declarar:

- **Outcome:** éxito del JTBD, time-to-first-value, repetición de valor y capacidad desbloqueada;
- **Esfuerzo:** horas de coordinación, rondas, recontactos, esperas y esfuerzo percibido;
- **Continuidad:** contexto preservado, handoff failure rate, cobertura de roles y pérdida de ownership;
- **Confianza:** clarity, promise fulfilled, confidence de la evidencia y confianza post-recovery;
- **Adopción:** activación, profundidad, recurrencia, segundo valor, invitación de usuarios y uso de workflow crítico;
- **Comercial:** sponsor engagement, renewal readiness, GRR, expansión, referral y churn reason;
- **Governance/IA:** incidentes, provenance, human review, escalamiento, reversibilidad y tiempo de resolución.

Toda métrica debe declarar fórmula, cohorte, período, denominador, fuente, owner, baseline, target y `controla | influye | monitorea`.

## 8. Contrato de recovery

Cuando un dolor se convierte en incidente:

1. Detectar y preservar la evidencia original.
2. Nombrar owner y comunicar el siguiente evento esperado.
3. Explicar impacto, límites y decisión, sin ocultar incertidumbre.
4. Resolver el caso visible para el operador.
5. Corregir la causa backstage y registrar la reincidencia.
6. Confirmar con el operador que la recuperación fue suficiente.
7. Llevar el aprendizaje a Greenhouse, al modelo de servicio y al siguiente ciclo.

Una disculpa, descuento o automatización no sustituyen la recuperación sistémica.

## 9. Investigación y evidencia externa

La evidencia secundaria apoya la vigencia del mapa, pero no sustituye la validación primaria en Chile y LatAm:

- ANA/4As reportan en 2025 relaciones de agencia más largas, junto con la importancia de confianza, transparencia y
  evitar revisiones costosas; [AOR Relationship Tenure study](https://www.ana.net/content/show/id/pr-2025-04-tenure).
- WFA plantea que procurement debe ayudar a construir decisiones más transparentes, defendibles y alineadas con
  valor; [Advancing Marketing Procurement](https://www.wfanet.org/knowledge/item/2025/11/26/cmos-your-marketing-procurement-team-might-be-more-useful-than-you-think).
- Gartner identifica governance de marca como condición para controlar riesgos de IA en creación de contenido,
  compliance y experiencias conversacionales; [Turn AI Brand Governance Perils Into Positive Outcomes](https://www.gartner.com/en/documents/6906066).
- IAB reporta incidentes de IA en publicidad y una brecha entre adopción y governance/brand integrity;
  [AI Adoption Is Surging in Advertising](https://www.iab.com/insights/ai-adoption-is-surging-in-advertising-but-is-the-industry-prepared-for-responsible-ai/).

Estos hallazgos refuerzan cuatro dolores sistémicos: **confianza**, **transparencia**, **coordinación/procurement** y
**governance de IA**. RESEARCH-010 debe validar frecuencia, severidad, costo político y disposición a cambiar.

## 10. Siguiente uso por Product Service

Antes de abrir una tarea de producto para Wave, Reach, Globe o Greenhouse, completar para el dolor elegido:

- operator funcional y workflow;
- episodio reciente y workaround;
- fase del lifecycle y moment of truth;
- failure mode y causa backstage;
- capacidad propuesta y primer valor;
- métricas baseline y outcome;
- operator-champion path y buying group;
- recovery y owner;
- señal que llega a Greenhouse;
- condición de falsación y próximo experimento.

El documento debe enlazarse desde el Business Model o Customer Model Integrity Pack de la oferta. No convertir este
mapa transversal en un backlog de features sin evidencia.
