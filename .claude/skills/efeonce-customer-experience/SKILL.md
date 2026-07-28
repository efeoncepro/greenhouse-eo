---
name: efeonce-customer-experience
description: Diseña, audita y gobierna Customer Experience B2B, journeys end-to-end, service blueprints, moments of truth, onboarding, activation, adoption, Voice of Customer, service recovery, health, renewal, expansion, offboarding y experiencias con agentes. Usar para trabajar la Experiencia Efeonce, Greenhouse, portales cliente, journeys de servicios productizados, customer success operativo o Customer Experience as a Service. No es una skill de UI, soporte reactivo ni encuestas aisladas.
---

# Efeonce Customer Experience

Opera Customer Experience como un sistema socio-técnico: contexto del cliente, journey real, touchpoints, operaciones backstage, evidencia, decisiones, recuperación, aprendizaje y resultados.

## Alcance y fronteras

Esta skill es dueña de:

- diagnóstico de experiencia y madurez;
- lifecycle journeys end-to-end;
- moments of truth y failure moments;
- service blueprints, ecosystem maps y handoff maps;
- onboarding, activation, adoption y time-to-value;
- Voice of Customer y feedback intelligence;
- customer health y next-best-action con evidencia;
- service recovery y closed-loop feedback;
- renewal, expansion, advocacy y offboarding;
- experiencia omnicanal y continuidad de contexto;
- governance, journey ownership y métricas;
- productización de Customer Experience as a Service.

No produce UI visual, copy de interfaz, campañas, soporte diario, CRM implementation ni arquitectura runtime. Derivar a `greenhouse-ai-design-studio`, `greenhouse-ux-content-accessibility`, `efeonce-customer-model-operator`, `hubspot-greenhouse-bridge`, `software-architect-2026`, `legal-privacy-ip-operator` o la práctica dueña según corresponda.

Para Efeonce, cargar `docs/context/10_experiencia-cliente.md`, `docs/context/13_icp-buyer-personas-jtbd.md`, `docs/documentation/client-portal/portal-cliente-customer-experience-end-to-end.md`, `docs/architecture/GREENHOUSE_JOURNEY_INTELLIGENCE_LAYER_V1.md`, `docs/architecture/GREENHOUSE_CLIENT_ONBOARDING_PROVISIONING_V1.md`, `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` y `efeonce-customer-model-operator`.

## Doctrina de Experiencia Efeonce

El cliente entra a un ecosistema de:

```text
operación + software + aprendizaje + red + memoria
```

Greenhouse no reemplaza todas las superficies de la Experiencia Efeonce: las conecta, las hace visibles, medibles y acumulativas. La experiencia debe hacer al cliente más capaz y conservar memoria útil, no generar dependencia opaca.

Esta doctrina es la expresión del Why en el journey: cada fase debe reducir un dolor de agencia y aumentar la
capacidad del operador para entender, decidir, ejecutar o defender el trabajo. Una experiencia que solo mejora la
satisfacción, agrega reporting o crea dependencia sin memoria contradice el Why. Usar `docs/strategy/EFEONCE_OPERATOR_PAIN_AND_JOURNEY_FAILURE_MAP_V1.md`
para conectar dolor, failure moment, recovery, métrica y evidencia.

El canon actual contiene ocho fases:

```text
onboarding → primera entrega → ritmo operativo → tensión → expansión
→ renovación → referral → offboarding
```

Y dos dimensiones transversales:

```text
stakeholder invisible + comunidad/aprendizaje
```

Los momentos de marca clave son Ecosystem Tour, Feedback Review en vivo, actualizaciones y retrospectivas, protocolo de transparencia con datos, expansión basada en evidencia, “Tu año con Efeonce”, referral human-driven y cierre profesional.

El addendum de OneDrive `Greenhouse_Sistema_Experiencia_Addendum.docx` confirma este modelo y sus métricas de adopción. Se trata como insumo histórico validado parcialmente; las fuentes canónicas del repositorio y el runtime prevalecen.

## Modos de operación

### Efeonce Customer Experience

Aplicar a la relación completa de Efeonce: oferta, delivery, portal, aprendizaje, comunidad, memoria, renovación y salida.

### Client Portal Experience

Aplicar al portal cliente y sus módulos. Respetar los estados `normal`, `zero-state`, `not assigned`, `degraded` y `error completo`. No confundir acceso, asignación de módulo, disponibilidad de datos y error técnico.

### Customer Experience as a Service

Aplicar para clientes externos mediante diagnóstico, rediseño de journeys, service operating system, governance y revisiones recurrentes. Leer `references/customer-experience-as-a-service.md`.

## Flujo obligatorio

1. **Contexto:** declarar ICP, buyer group, usuario, sponsor, decisor, JTBD, oferta, delivery model, lifecycle stage, trigger, resultado y restricciones. Leer `efeonce-customer-model-operator`.
2. **Evidence:** separar observación, hipótesis, opinión, dato, feedback, inferencia y decisión aprobada. Registrar fuente, fecha, sensibilidad y confianza.
3. **Current state:** observar el journey real con eventos, entrevistas, tickets, reuniones, analytics, comportamiento, handoffs, tiempos y estados; no dibujar el proceso ideal.
4. **Journey architecture:** definir fases, entradas, loops, pausas, touchpoints, canales, actores, milestones, SLAs, blockers, owners y next expected event.
5. **Moments of truth:** priorizar momentos por impacto comercial, carga emocional, severidad, frecuencia, control percibido, reversibilidad y riesgo de relación.
6. **Blueprint:** conectar acción del cliente, experiencia visible, frontstage, backstage, sistemas, datos, políticas, partners, dependencias, métricas y riesgos.
7. **Continuity:** auditar identidad, contexto, historial, ownership y pérdida de información entre canales, agentes, ventas, delivery, soporte y producto.
8. **Activation:** definir time-to-first-value, activation event, activation depth, second value event, adopción por cuenta y cobertura de roles.
9. **VoC:** mezclar feedback solicitado, no solicitado, inferido, operacional y financiero. Convertir cada señal en necesidad, causa, decisión, owner y SLA.
10. **Recovery:** cerrar inner loop con el cliente y outer loop con la causa sistémica. No usar una disculpa, descuento o bot como receta universal.
11. **Lifecycle:** diseñar health, renewal readiness, expansión, advocacy, churn taxonomy, portabilidad y offboarding.
12. **Agentic CX:** definir automatización, disclosure, consentimiento, autoridad, límites, handoff humano, contexto transferido, auditoría y reversibilidad.
13. **Measurement:** establecer baseline, target, cohorte, denominador, fuente, frecuencia, owner, evidencia y clasificación `controla | influye | monitorea`.
14. **Governance:** asignar journey owner, decision rights, council, exception log, revisión y backlog de mejora.
15. **Cierre:** entregar artefactos, decisiones, descartes, métricas, recovery playbook, roadmap, formación y handoff operativo.

## Artefacto correcto para cada pregunta

- **Journey map:** cómo se mueve y qué experimenta el cliente.
- **Service blueprint:** qué operación sostiene esa experiencia.
- **Ecosystem map:** qué partners, plataformas y terceros participan.
- **Touchpoint ledger:** qué ocurrió, cuándo, por qué, con qué evidencia.
- **Moments-of-truth map:** dónde se gana o pierde confianza, valor o continuidad.
- **Process map:** cómo se ejecuta internamente una actividad.
- **Health scorecard:** qué cambió, por qué importa y quién debe actuar.
- **VoC insight:** qué señal se convirtió en una decisión trazable.

Un artefacto sin owner, métrica, evidencia o siguiente decisión es documentación, no gestión de CX.

## Métricas mínimas

Generar un scorecard por capas; no usar NPS como métrica reina:

- **Customer outcome:** time-to-value, éxito del JTBD, primer valor, repetición de valor, adopción crítica y revenue enabled.
- **Experience quality:** esfuerzo, claridad, continuidad, confianza, promesa cumplida, resolución y recomendación.
- **Adoption:** activación, profundidad, recurrencia, cobertura de roles, workflows críticos y uso de módulos.
- **Relationship health:** sponsor engagement, relación multihilo, silencio, escalaciones, health drivers y riesgo.
- **Service operations:** SLA, tiempo de respuesta, resolución, handoff failure rate, recontacto, defectos y scope variance.
- **VoC:** cobertura de señales, tiempo a insight, decisiones con evidencia, loops cerrados, reincidencia y impacto de acciones.
- **Commercial:** GRR, NRR, logo retention, renewal rate, forecast accuracy, expansion, downgrade, referral y churn taxonomy.
- **AI/CX:** precisión, containment, handoff quality, contexto preservado, escalamiento, reversibilidad, explicabilidad, falsos positivos y falsos negativos.
- **Equity/accessibility:** exclusión, esfuerzo diferencial, idioma, accesibilidad, autonomía y carga impuesta al cliente.

Definir siempre fórmula, cohorte, período, denominador, fuente, owner, baseline, target y `controla | influye | monitorea`. Ver `references/cx-metrics-and-scorecards.md`.

## Voice of Customer y feedback intelligence

No hacer más encuestas por defecto. Usar la unidad:

```text
señal → contexto → necesidad → causa probable → severidad/impacto/confianza
→ decisión → owner/SLA → acción → resultado → aprendizaje
```

Combinar:

- feedback solicitado;
- feedback no solicitado;
- evidencia conductual;
- evidencia operacional;
- señales de silencio, abandono y churn.

Separar cuatro decisiones:

1. recuperación individual;
2. corrección de proceso;
3. mejora de producto/servicio;
4. decisión de cartera o experimento.

La IA puede transcribir, agrupar, clasificar y sugerir routing; debe conservar evidencia original, confianza, reglas y revisión humana cuando la acción sea sensible.

## Agentic CX

No automatizar por novedad. Clasificar cada interacción por complejidad, riesgo, emoción, reversibilidad, autoridad y necesidad de juicio. Definir:

- qué puede hacer el agente;
- qué debe revelar;
- qué datos puede usar;
- qué requiere consentimiento;
- cuándo debe escalar;
- cómo entrega contexto al humano;
- cómo se audita y revierte;
- cómo se mide el resultado posterior al handoff.

Los momentos de alto riesgo, pérdida de confianza, negociación, incidentes, decisiones financieras/legalmente sensibles y excepciones deben tener ruta humana explícita.

## Privacidad y seguridad

Feedback, transcripciones, voz, comportamiento, salud, finanzas e inferencias pueden ser datos personales o sensibles. Aplicar minimización, finalidad, acceso restringido, retención diferenciada, pseudonimización, evaluación de reidentificación, proveedores aprobados, auditoría y derechos del titular. Para Chile, cargar `legal-privacy-ip-operator` y validar la Ley 21.719 con asesoría legal; no convertir esta skill en consejo jurídico.

## Gates de calidad

Replantear el trabajo si:

- confunde CX con UI, soporte o NPS;
- dibuja un journey ideal sin evidencia del journey real;
- mapea canales sin continuidad de contexto;
- crea un blueprint sin backstage, owner, dependencia o métrica;
- prioriza solo por frecuencia de comentarios;
- convierte cada feedback en feature request;
- cierra el caso individual y deja intacta la causa sistémica;
- usa health score sin drivers ni validación histórica;
- mide logins sin profundidad, outcome o repetición de valor;
- hace cross-sell sin trigger verificable;
- trata silencio como satisfacción;
- automatiza momentos sensibles sin handoff ni reversibilidad;
- captura feedback sin finalidad, sensibilidad, retención o fuente;
- confunde `zero-state`, `not assigned`, `degraded` y error;
- cierra sin capacidad interna del cliente y handoff.

## Recursos

Leer solo lo necesario:

- `references/efeonce-experience-system.md` para el canon Efeonce, el addendum de OneDrive y los momentos.
- `references/customer-context-and-jtbd.md` para contexto, buying group y jobs.
- `references/journey-architecture.md` para lifecycle, milestones, loops y touchpoints.
- `references/moments-of-truth-and-blueprints.md` para momentos, mapas y blueprints.
- `references/onboarding-activation-adoption.md` para TTV, activación, adopción y health.
- `references/voc-feedback-and-recovery.md` para VoC, closed loops y recovery.
- `references/agentic-cx-governance.md` para agentes, confianza, disclosure y handoff.
- `references/cx-metrics-and-scorecards.md` para métricas, cohortes y fórmulas.
- `references/cx-governance.md` para owners, councils, decisions y backlog.
- `references/customer-experience-as-a-service.md` para productización y delivery.
- `references/privacy-and-research-sources-2026.md` para privacidad, Chile y tendencias fechadas.

Usar las plantillas de `templates/` para artefactos formales. Ejecutar `scripts/validate-cx-artifact.py` antes de cerrar entregables estructurados.
