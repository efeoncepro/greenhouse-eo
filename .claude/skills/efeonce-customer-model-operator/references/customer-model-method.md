# Customer Model Method

Referencia detallada para construir un modelo de cliente auditable. Cargar cuando la decisión toque ICP, JTBD,
buying group, qualification, problem-solution fit, procurement, retention o expansión.

## Índice

1. Modelo de objetos
2. Segmentación e ICP
3. JTBD y causalidad
4. Buying group
5. Decision y procurement
6. Qualification y evidence
7. Validation y WTP
8. Adoption, retention y expansión
9. Artefactos y governance
10. Fuentes externas

## 1. Modelo de objetos

| Objeto | Definición | Error frecuente |
|---|---|---|
| Market | espacio amplio por categoría, geografía, necesidad o tecnología | confundir TAM con clientes alcanzables |
| Segment | grupo homogéneo por rasgos, problema, job, trigger o comportamiento | segmentar sólo por industria |
| ICP | perfil de organización con máximo fit, valor mutuo, economía, acceso, expansión y referencias | describir a cualquiera que podría comprar |
| Account | organización concreta con contexto, estructura, iniciativas y restricciones | tratarla como un lead |
| Opportunity | problema/iniciativa específica de una cuenta | asumir una oportunidad por cuenta |
| User | persona que adopta o usa la solución | asumir que usa = compra |
| Problem owner | responde por el costo o resultado del problema | confundirlo con el contacto inicial |
| Buying group | conjunto dinámico que participa, influye, aprueba, bloquea o ratifica | modelarlo como una persona |
| Stakeholder | actor con interés, poder, legitimidad, urgencia o dependencia | hacer sólo una lista de cargos |
| Job | progreso que un actor intenta lograr en una situación | convertirlo en feature o slogan |
| Outcome | cambio/beneficio experimentado por el cliente | llamar outcome a un entregable |
| Impact | consecuencia económica, operativa, estratégica o de riesgo | atribuirlo sin baseline/counterfactual |
| Claim | afirmación de Efeonce sobre valor, desempeño o evidencia | presentarlo sin fuente/fecha/owner |
| Evidence | observación que aumenta o reduce confianza en una decisión | usar opiniones como prueba |

Cuenta, oportunidad y buying group pueden cambiar de forma independiente. Una misma cuenta puede tener una oportunidad
de implementation y otra de recurring, con distintos sponsors, criterios y procesos.

## 2. Segmentación e ICP

Usar sólo variables que cambien decisión, fit o economics:

- firmográficas: industria, tamaño, revenue, geografía y estructura;
- operativas: equipo, procesos, stack, proveedores, capacidad y madurez;
- situacionales: trigger, cambio de líder, migración, incidente, regulación y presupuesto;
- job-based: progreso buscado y consecuencia de no resolverlo;
- comportamentales: uso, compra previa, señales de investigación y adoption;
- económicas: ACV potencial, margen, servicing cost, payment terms y expansión;
- de riesgo: compliance, security, data sensitivity y provider dependency;
- de acceso: canal, partner, relación, referencias y procurement readiness.

Un segmento es útil si es homogéneo internamente, distinto de otros, alcanzable, medible y accionable. Si dos grupos
requieren diferente oferta, buyer, motion, delivery o economics, no deben ocultarse en un solo segmento.

### ICP scorecard

Evaluar de 0 a 3, con evidencia y no intuición:

| Criterio | Pregunta |
|---|---|
| Pain/urgency | ¿Existe un problema costoso, visible y activo? |
| Value fit | ¿La oferta puede cambiarlo de forma controlable? |
| Capability fit | ¿El cliente tiene inputs, acceso y capacidad para adoptar? |
| Economic fit | ¿Hay presupuesto, ACV y margen compatibles? |
| Reachability | ¿Podemos entrar por un canal viable? |
| Decision fit | ¿Podemos navegar su buying/procurement process? |
| Repeatability | ¿El caso se parece a otros clientes? |
| Referenceability | ¿Puede generar prueba o referral? |
| Expansion | ¿Existe ruta de renovación o crecimiento? |
| Risk | ¿Data, legal, provider y servicing risk son aceptables? |

Un cero en problem fit, decision fit, economics o risk puede ser blocker aunque el total sea alto. Definir anti-ICP y
exit conditions.

### Beachhead

Elegir el primer subsegmento por dolor agudo, fit fuerte, accesibilidad, referencia, expansión y economía. El beachhead
no es el mercado total ni el segmento más grande; es donde la oferta puede aprender y ganar una referencia repetible.

## 3. JTBD y causalidad

### Job statement

```text
Cuando [situación/trigger], quiero [progreso que intento lograr],
para [resultado funcional/emocional/social].
```

Validar situación, actor, tensión, alternativa, progreso, resultado observable, restricciones, lenguaje del cliente,
frecuencia y urgencia. “Necesito un dashboard” es una feature; “cuando el comité pregunta por qué la marca no aparece,
quiero saber qué falla y qué priorizar para defender la decisión con evidencia” es un job.

### Theory of Change

```text
inputs → activities → outputs → adoption/behavior change → outcomes → impact
```

Para cada transición registrar supuesto, actor, control, dependencia, métrica, baseline, atribución y efecto adverso.
Nunca prometer un outcome que dependa de variables fuera del control del proveedor sin declarar la dependencia.

## 4. Buying group

### Roles funcionales

- **User/operator:** vive el cambio diario.
- **Problem owner:** responde por el problema.
- **Influencer/expert:** define requisitos o evaluación.
- **Champion:** moviliza la decisión con capacidad, credibilidad, motivación, acción y acceso.
- **Economic buyer:** puede liberar, autorizar o vetar presupuesto.
- **Decision-maker:** decide dentro del proceso; puede ser persona o comité.
- **Procurement/ratifier:** valida proveedor, precio, competencia y reglas.
- **Legal/security/IT/finance/compliance:** pueden bloquear o condicionar.
- **Blocker:** puede retrasar o detener por riesgo, política o statu quo.
- **External influencer:** consultor, partner, agencia previa, auditor o referente.

Una persona puede desempeñar varios roles; un rol puede ser un comité. Registrar rol real y evidencia observada, no
inferirlo por seniority.

### Stakeholder map

Registrar por stakeholder:

```yaml
stakeholder_id: TBD
account_id: TBD
opportunity_id: TBD
role_hypotheses: []
power_formal: unknown
power_informal: unknown
interest: unknown
attitude: unknown
legitimacy: unknown
urgency: unknown
personal_win: unknown
decision_criteria: []
relationship_to_others: []
evidence_refs: []
next_action: TBD
absence_risk: TBD
confidence: low
```

La matriz poder/interés es una vista, no el modelo completo. Actualizarla cuando cambie contexto, presupuesto,
sponsor, proceso o actitud.

### Champion test

Un champion real muestra acción interna: introduce stakeholders ausentes, comparte criterios y riesgos, construye
business case, consigue datos o presupuesto, prepara la objeción del comité y organiza el siguiente paso.
Interés, simpatía, cargo senior o muchas reuniones no son evidencia suficiente.

## 5. Decision y procurement

### Decision process

Modelar las fases que existan, no asumir linealidad:

1. trigger;
2. recognition;
3. framing del problema;
4. alternativas: build, buy, partner, in-house, defer, do nothing;
5. criterios técnicos, económicos, operativos y políticos;
6. discovery, validation, pilot o business case;
7. consenso y riesgo aceptado;
8. aprobación;
9. movilización;
10. primer valor;
11. renovación/expansión.

### Paper/procurement process

Modelar aparte vendor onboarding, sourcing/RFI/RFP/RFQ, security questionnaire, certificaciones, DPA, privacidad,
subprocesadores, insurance, compliance, legal redlines, PO, MSA, SOW, aceptación, payment terms, impuestos, moneda,
penalidades, SLA, liability, exportación, terminación, transición y borrado.

Una oportunidad no está calificada sólo porque haya problema y presupuesto. Debe existir camino de decisión y
contratación con owners, fechas y bloqueadores.

## 6. Qualification y evidence

| Nivel | Evidencia | Uso |
|---|---|---|
| E0 | opinión, intuición o claim interno | sólo hipótesis |
| E1 | entrevista o comentario aislado | señal exploratoria |
| E2 | patrón en varias entrevistas/cuentas | hipótesis fuerte |
| E3 | comportamiento: datos, acceso, cambio, piloto o pago | validación de comportamiento |
| E4 | repetición: cohortes, renewal, expansion, margen y delivery comparable | decisión de escala |

Triangular fuentes primarias, first-party, documentación contractual y fuentes secundarias. Cada claim tiene as-of,
source, confidence, owner y limitación. La señal primaria de oportunidad es progreso verificable, no entusiasmo.

Preguntas mínimas: ¿qué cambió y por qué ahora?, ¿qué cuesta el estado actual?, ¿qué resultado justificaría el cambio?,
¿cómo se medirá y quién lo acepta?, ¿qué alternativas existen?, ¿quién usa/influye/decide/veta/paga/ratifica?, ¿qué
pasos ocurren antes de firmar?, ¿qué requisitos pueden bloquear?, ¿qué recursos debe poner el cliente?, ¿cuál es el
primer valor? y ¿cuál es el próximo compromiso bilateral?

## 7. Validation y WTP

| Decisión | Método preferido |
|---|---|
| entender problema | entrevistas JTBD, observation, complaint/win-loss |
| comparar segmentos | research secundario + first-party + scoring |
| probar mensaje | smoke test, landing y outreach controlado |
| probar willingness-to-pay | paid diagnostic, proposal choice, deposit o pilot con conversión |
| probar delivery | sample sprint o implementación acotada con acceptance |
| probar recurring | cadence/QBR, adoption, renewal condition y expansion signal |
| probar escala | cohortes comparables, variance, margin y capacity |

Cada experimento define hipótesis, muestra, entrada, intervención, métrica primaria, threshold, stop condition, owner,
fecha y decisión posterior. Un piloto gratuito sin criterio de conversión no valida demanda.

Separar: WTP declarado ≠ pago observado; interés ≠ prioridad; prioridad ≠ presupuesto liberable; presupuesto ≠
procurement ready; champion ≠ economic buyer; output ≠ outcome; correlation ≠ attribution; renewal por inercia ≠
value realization; NRR ≠ GRR.

## 8. Adoption, retention y expansión

Registrar time-to-value, activation/first value, adoption/usage, health/risk, sponsor ejecutivo, success cadence,
renewal notice, churn, contraction, downgrade, reason codes, upsell/cross-sell triggers, servicing cost y capacity.

GRR muestra retención sin expansión; NRR incluye expansión, contracción y churn. Reportarlos separados con fórmula,
período, denominador, moneda, fuente y owner.

## 9. Artefactos y governance

El pack mínimo contiene decision brief; segment/ICP scorecard y anti-ICP; JTBD cards y theory of change;
account/opportunity brief; buying-group/stakeholder map; decision/paper process; alternatives/competition/do-nothing;
evidence ledger; validation plan; adoption/retention/expansion; risk/data/IP/procurement/third-party register;
economics/capacity handoff; RACI/gates, review date y verdict.

| Gate | Habilita | No habilita |
|---|---|---|
| `customer_model_incomplete` | investigación | claim comercial |
| `hypothesis_only` | discovery exploratoria | venta general |
| `validated_for_discovery` | discovery estructurada | pricing aprobado |
| `approved_for_validation` | pilot/SOW gobernado | PMF/scale claim |
| `commercially_qualified` | oportunidad en pipeline | renovación automática |
| `retention_ready` | diseño de renewal | margen garantizado |
| `expansion_ready` | cross-sell/upsell acotado | cambio de ownership |
| `scale_constrained` | inversión en constraint | crecimiento indiscriminado |

## 10. Fuentes externas

Investigación consultada en 2026-07; revalidar cifras y páginas antes de decisiones load-bearing:

- [Christensen Institute — Jobs to Be Done](https://www.christenseninstitute.org/theory/jobs-to-be-done/)
- [Harvard Business Review — Know Your Customers' Jobs to Be Done](https://hbr.org/2016/09/know-your-customers-jobs-to-be-done)
- [Forrester — buying group success](https://www.forrester.com/b2b-marketing/six-steps-to-buying-group-success/)
- [Forrester — buyer roles](https://www.forrester.com/b2b-marketing/buying-group-roles/)
- [Gartner — buying group conflict and consensus](https://www.gartner.com/en/newsroom/press-releases/2025-05-07-gartner-sales-survey-finds-74-percent-of-b2b-buyer-teams-demonstrate-unhealthy-conflict)
- [Government Analysis Function — stakeholder mapping](https://analysisfunction.civilservice.gov.uk/policy-store/stakeholder-mapping/)
- [PMI — stakeholder analysis](https://www.pmi.org/learning/library/stakeholder-management-plan-6090)
- [CIPS — procurement process](https://2tst-dxp.cips.org/intelligence-hub/procurement/procurement-process)
- [MEDDICC — MEDDPICC methodology](https://meddicc.com/meddpicc-sales-methodology-and-process)
- [GDS — outcomes](https://apply-the-service-standard.education.gov.uk/guides/product-management-principles/principle-3-be-accountable-for-your-outcomes)
- [HM Treasury — Green Book](https://www.gov.uk/government/publications/the-green-book-appraisal-and-evaluation-in-central-government/the-green-book-2026)
- [HM Treasury — Magenta Book](https://www.gov.uk/government/publications/the-magenta-book/magenta-book-central-government-guidance-on-evaluation-html)
- [IFRS 15](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2022/issued/part-a/ifrs-15-revenue-from-contracts-with-customers.pdf?bypass=on)
- [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [WIPO IP due diligence](https://www.wipo.int/en/web/ip-business-moments/accelerate)
- [Stripe — NRR/GRR](https://stripe.com/resources/more/net-revenue-retention)
