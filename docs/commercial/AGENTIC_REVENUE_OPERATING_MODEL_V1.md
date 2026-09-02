# Efeonce Agentic Revenue Operating Model V1

> **Estado:** `Proposed for validation · no runtime rollout`
> **Owner:** Leadership + Commercial + RevOps
> **Fecha:** 2026-08-29
> **Plan GTM:** [`EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md`](../strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md)
> **Funnel 2027:** [`PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md`](PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md)
> **Fuente comercial de verdad:** HubSpot

## 1. Decisión

Efeonce operará la generación y conversión de pipeline como un **Agentic Revenue Pod**: el fundador conserva
discovery, relación, diagnóstico, propuesta, negociación y cierre; HubSpot, Apollo, Greenhouse, Codex, Claude y los
agentes absorben investigación, priorización, personalización, coordinación, QA y control de datos.

La tecnología permite postergar una contratación comercial completa, pero no elimina la necesidad de una función
humana accountable. La decisión de staffing es:

1. no contratar ahora un AE;
2. no contratar todavía un SDR full-time;
3. cubrir durante el piloto una función `Commercial Systems Operator` de 4–6 horas semanales;
4. permitir que Julio cubra esa función temporalmente si además protege 10–12 horas de venta humana;
5. contratar apoyo fractional de 6–10 horas semanales si la función no se sostiene o los triggers de §10 se activan;
6. considerar como primera contratación full-time un `SEO/RevOps Delivery Lead` si ventas crea un cuello de botella
   de delivery antes que uno de adquisición.

La distinción gobernante es **función antes que headcount**: cada responsabilidad necesita owner, SLA y capacidad,
pero no toda responsabilidad requiere una persona nueva.

## 2. Frontera con Go-to-Market

Este modelo forma parte de la operación del GTM, no sustituye la estrategia:

| Capa               | Decisión                                                            | Owner                                         |
| ------------------ | ------------------------------------------------------------------- | --------------------------------------------- |
| GTM                | ICP, beachhead, posicionamiento, oferta, motion y canales           | Strategy + GTM                                |
| Commercial         | Discovery, calificación, propuesta, negociación, cierre y expansión | Julio / Commercial Lead                       |
| RevOps             | Datos, routing, lifecycle, source, pipeline, SLA y medición         | Commercial Systems Operator                   |
| Channel operations | Sourcing, cadencias, contenido, Search, partners y touchpoints      | Skill/rol dueño del canal                     |
| Agentic operations | Priorización, research, drafts, QA, alertas y propuestas de acción  | Revenue Orchestrator + agentes especializados |
| Finance            | CAC, horas, margen, revenue, cash y capacidad económica             | Finance + Treasury                            |

GTM decide que Efeonce usa una motion híbrida `expansion-led + partner/ecosystem-led + content/Search-led +
signal-based outbound`. Este documento define cómo se opera esa motion sin convertir cada herramienta en un motor
comercial independiente.

## 3. Stack y función asignada

| Componente                            | Función primaria                                                                             | Lo que no decide                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| HubSpot Smart CRM                     | Company, Contact, Deal, owner, source, stage, actividad y forecast                           | Estrategia, oferta, margen o autoridad de envío                        |
| HubSpot Prospecting Agent             | Research y outreach sobre cuentas/contactos conocidos; señales cuando el portal sea elegible | Fit final, promesa comercial, negociación o excepciones                |
| HubSpot Customer Agent                | Inbound, respuestas acotadas, calificación, meeting routing y handoff                        | Outbound, decisión de compra o compromiso contractual                  |
| HubSpot Data Agent / smart properties | Research, resumen y clasificación asistida                                                   | Identidad, monto, lifecycle, compliance o dato financiero autoritativo |
| HubSpot Sales Workspace / Sequences   | Cola de trabajo, tareas y cadencias one-to-one                                               | Selección de ICP o sustitución del vendedor                            |
| Apollo                                | Sourcing net-new, enrichment, intent, sequences y tareas multicanal                          | Source of truth, forecast o ejecución automática de llamadas/LinkedIn  |
| Greenhouse                            | Gobierno, memoria operativa, Proposal Studio y futura orquestación agentic                   | Reemplazar el CRM comercial                                            |
| Codex / Claude                        | Investigación, briefs, QA, follow-up, propuestas, reporting y desarrollo de agentes          | Envío autónomo, negociación o accountability                           |
| Equipo humano                         | Criterio, relación, respuesta, aprobación, delivery y responsabilidad                        | Trabajo mecánico que un rail aprobado puede ejecutar mejor             |

### Estado conocido al corte

- HubSpot portal `48713323` usa USD como moneda de compañía; el readback del conector no pudo devolver seats por
  permisos, por lo que la elegibilidad exacta de agentes, créditos y betas requiere verificación en UI.
- El operador declaró Sales Hub Professional, Service Hub Professional y Marketing, Content y Data Hub Starter.
- Apollo está conectado y tiene créditos, pero no presentaba sequences ni conversión outbound histórica utilizable al
  corte; ver el baseline fechado del plan de pipeline.
- Ninguna de estas capabilities se considera configurada, publicada o runtime-verified sólo por estar documentada por
  el vendor o incluida en una suscripción.

## 4. Arquitectura de dos carriles

### Carril A — HubSpot: expansión, warm e inbound

Usar HubSpot para:

- SKY, Berel, Motogas, ANAM, Aguas Andinas y otras relaciones conocidas;
- cuentas provenientes de referrals, partners, co-selling, formularios, contenido o Customer Agent;
- buying signals de empresas ya gobernadas en CRM;
- reactivación y multithreading de cuentas conocidas;
- Meetings, Sales Workspace, tareas, pipeline y forecast;
- calificación inbound y routing humano mediante Customer Agent.

### Carril B — Apollo: cold net-new

Usar Apollo para:

- construcción y enriquecimiento de listas nuevas;
- intent y señales externas;
- selección de 2–3 integrantes del buying group;
- cadencias cold multicanal;
- tareas manuales de llamadas y LinkedIn;
- experimentos por micro-ICP y oferta de entrada.

### Reglas anti-colisión

1. una persona no puede estar simultáneamente activa en Apollo y Prospecting Agent;
2. una cuenta tiene un solo owner comercial y un solo `active_outreach_rail`;
3. Company entra a HubSpot cuando la cuenta objetivo es aprobada;
4. Contact entra cuando su enrollment es aprobado;
5. Deal se crea sólo al existir una oportunidad calificada, no por enviar un email;
6. actividades relevantes se sincronizan con identidad y asociaciones verificadas;
7. Apollo nunca altera marketing-contact status ni datos determinísticos sin una regla aprobada;
8. HubSpot conserva `original_source` y `assisted_source` por separado;
9. toda respuesta, opt-out o suppression detiene los rails aplicables a la cuenta;
10. no se habilita `push all`, bidirectional sync o borrado/merge automático sin mapping, dedupe, rollback y readback.

## 5. Contrato humano–agente

| Trabajo               | Agente puede preparar                              | Humano debe decidir o ejecutar                        |
| --------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| ICP y cuenta objetivo | Score, señales, research y anti-ICP                | Aprobar tesis, cuenta y prioridad                     |
| Buying group          | Encontrar roles y proponer contactos               | Validar pertinencia y exclusiones                     |
| Mensaje               | Draft personalizado y QA de evidencia              | Aprobar claim, CTA y enrollment                       |
| Envío                 | Ejecutar rail previamente aprobado                 | Autorizar campaña, mailbox, cohorte y autonomía       |
| Reply                 | Clasificar, detener secuencia y preparar respuesta | Responder conversaciones con intención o riesgo       |
| Discovery             | Preparar briefing, agenda y preguntas              | Conducir reunión y diagnóstico                        |
| Proposal/SOW          | Componer desde evidencia y scope aprobado          | Aprobar oferta, precio, margen, términos y compromiso |
| CRM                   | Detectar gaps, stale deals y proponer cambios      | Confirmar writes gobernados y excepciones             |
| Forecast              | Calcular coverage, velocity y riesgos              | Elegir forecast category y comprometer resultado      |

Ningún agente obtiene autoridad por tener acceso técnico. Para writes, activaciones, publicaciones o mensajes externos
se aplica `propose → confirmación humana → execute → readback` hasta que una capability específica gane autonomía por
cohortes, evals, reversibilidad y decisión aprobada.

## 6. Agentes a operar o construir

### Prioridad 0 — consumir capabilities nativas

Antes de desarrollo propio:

- configurar y probar Sales Workspace, tareas y lifecycle;
- probar Prospecting Agent en una cohorte warm/CRM;
- probar Apollo en una cohorte cold separada;
- evaluar Customer Agent para inbound y meeting routing;
- usar Data Agent sólo para evidencia y enriquecimiento no autoritativo;
- usar Codex/Claude para briefs, follow-up, propuestas y QA.

### Prioridad 1 — Revenue Orchestrator

Produce una cola diaria gobernada:

1. lee HubSpot, Apollo y señales aprobadas;
2. detecta cuentas nuevas, respuestas, Deal drift y capacidad;
3. prioriza 10–15 acciones con evidencia;
4. asigna cada cuenta al carril correcto;
5. prepara brief, borrador y consecuencia;
6. espera aprobación para enrollment, write o envío;
7. verifica el resultado y actualiza la cola.

### Prioridad 2 — agentes especializados

| Agente                          | Output                                                           | Stop condition                                        |
| ------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------- |
| Account Research & Buying Group | Fit, trigger, personas, proof y verdict `pursue/nurture/discard` | Evidencia insuficiente o identidad ambigua            |
| Outreach QA                     | Claims, señal, CTA, tono, exclusiones y riesgo                   | Claim no respaldado o mensaje genérico                |
| Reply Triage                    | Categoría, suppression, siguiente acción y draft                 | Intención positiva, queja, legal, precio o ambigüedad |
| Pipeline Hygiene                | Deals stale, campos ausentes, associations y next step           | Write no reversible o ownership dudoso                |
| Proposal & Follow-up            | Recap, propuesta, SOW y matriz de objeciones                     | Scope, economics o aprobación faltante                |
| Forecast & Capacity             | Coverage, velocity, founder hours, backlog y alertas             | Datos financieros o comerciales no reconciliados      |

### Qué no construir

- otro buscador genérico de leads;
- otro motor de sequences o transporte de email;
- un CRM paralelo;
- scraping sin fuente, términos y compliance claros;
- un agente que negocie o envíe sin boundaries;
- integración bidireccional general antes de probar el mapping mínimo;
- compromisos productivos basados en Agent Tools, Agent CLI o betas sin fallback contractual.

## 7. Capacidad del Agentic Revenue Pod

### Target state semanal

| Función                                                               |                       Capacidad | Owner inicial                    |
| --------------------------------------------------------------------- | ------------------------------: | -------------------------------- |
| Venta humana: reuniones, discovery, propuesta, negociación, expansión |                         10–12 h | Julio                            |
| Commercial Systems Operations                                         | 4–6 h piloto; 8–12 h al escalar | Julio temporalmente o fractional |
| Proof, nurture y contenido                                            |                           4–6 h | Content / Community              |
| Scope y factibilidad creativa                                         |                           2–4 h | Creative Operations Lead         |
| Cash, DSO y economics                                                 |          1–2 h + cierre mensual | Treasury + Finance               |
| Research, drafts, QA y reporting mecánico                             | Según cola y presupuesto de uso | Agentes                          |

Si Julio cubre ambos primeros roles, necesita 14–16 horas protegidas. El objetivo del modelo agentic no es reducir la
venta humana por debajo de 10–12 horas: es evitar que research, CRM, scheduling y QA la eleven a 20–22 horas.

## 8. Commercial Systems Operator

La función es accountable de:

- revisar y aprobar cuentas/contactos propuestos;
- vigilar deliverability, credits y suppression;
- resolver excepciones de drafts, sync y asociaciones;
- ejecutar o asignar tareas manuales de llamada/LinkedIn;
- mantener HubSpot y la cadencia de next steps;
- preparar pipeline council, cohorts y experiment log;
- medir costo humano y tecnológico por reunión, oportunidad y pipeline;
- detectar drift del ICP, mensaje, agente o fuente de datos.

No es un AE junior ni un operador de volumen. Puede ser cubierta por el fundador durante la validación, una reasignación
interna explícita con capacidad liberada o un perfil fractional. No se asigna por defecto a Treasury o Content sólo
porque tengan horas disponibles.

## 9. Piloto conjunto de 90 días

El piloto outbound conserva los volúmenes y gates del plan de pipeline, pero separa cohorts:

| Cohorte      | Rail                                  | Propósito                                      |
| ------------ | ------------------------------------- | ---------------------------------------------- |
| Warm / CRM   | HubSpot Prospecting Agent o Sequences | Reactivación, expansión o multithreading       |
| Cold net-new | Apollo                                | Validar micro-ICP, señales y oferta de entrada |
| Inbound      | Customer Agent + Meetings             | Medir calificación, handoff y show rate        |

Cada cohorte registra personas aprobadas, edición humana, delivered, positive reply, primeras reuniones realizadas,
oportunidades, pipeline, credits/costo, minutos humanos y false positives. No se compara una reunión agendada con
una primera reunión realizada ni una
respuesta con una oportunidad.

### Gates del sistema agentic

- 100% de cuentas con owner y rail único;
- 100% de claims de Tier 1 con evidence reference;
- cero envíos posteriores a opt-out/suppression conocido;
- reply triage en un día hábil;
- CRM write/error queue resuelta en 48 horas;
- menos de 10% de contactos aprobados con corrección material de identidad/fit;
- minutos humanos por cuenta y por oportunidad descendentes sin pérdida de quality;
- economics medidos antes de escalar credits, mailboxes o headcount.

## 10. Triggers de staffing

### Contratar Commercial Systems Operator fractional

Activar si se cumple cualquiera de estas condiciones de forma sostenida, o dos durante una misma cohorte:

- Julio protege menos de 10 horas de venta en tres de cuatro semanas;
- reply/exception SLA supera un día hábil;
- más de 15 tareas manuales vencidas por semana;
- más de 10% de Deals activos carece de next step verificable;
- la operación supera 50 contactos aprobados por semana o 125–140 cuentas trabajadas por mes;
- research, CRM y coordinación vuelven a consumir 6–8 horas adicionales del fundador;
- una respuesta positiva o reunión se pierde por falta de seguimiento.

### Contratar SDR full-time

Sólo después de dos cohortes consecutivas con entregabilidad sana, motion repetible, al menos 3 oportunidades
calificadas mensuales atribuibles al canal y economics que soporten el loaded cost. Volumen sin pipeline no activa el
trigger.

### Contratar AE

Sólo cuando ofertas, win rates y economics sean repetibles y Julio sea el cuello de botella específico de discovery,
negociación y cierre, no de delivery o administración.

### Prioridad de delivery

Un `SEO/RevOps Delivery Lead` conserva prioridad si se firman USD 8.000–12.000 de MRR nuevo o existen 8–12 semanas de
backlog pagado. Un `Account/Delivery Manager` se evalúa con dos contratos recurrentes nuevos o más de seis engagements
simultáneos.

## 11. Métricas de control

| Capa       | Métricas                                                                          |
| ---------- | --------------------------------------------------------------------------------- |
| Demanda    | Cuentas señaladas, aprobadas, contactadas y positive replies                      |
| Funnel     | Primeras reuniones realizadas, show rate, oportunidades, propuestas, wins y pipeline contribution |
| Calidad    | False positives, edición material, duplicados, opt-outs y errores de routing      |
| Eficiencia | Minutos humanos por cuenta/reunión/oportunidad; credits y costo por resultado     |
| Comercial  | Win rate, sales cycle, pipeline velocity, MRR y Spot bookings                     |
| Operación  | Reply SLA, task aging, Deals sin next step y sync error queue                     |
| Economics  | CAC por motion, payback, founder shadow cost, margen y contribution margin        |

Open rate y número de mensajes son diagnósticos; no constituyen outcome.

## 12. Gobierno y gates técnicos

Este documento no autoriza configuración ni implementación. Antes de construir Revenue Orchestrator, Agent Tools o
una integración productiva se requiere:

1. identificar o proponer ADR para source of truth, writers, eventos, auth, permissions y audit;
2. mapping y deduplicación Apollo–HubSpot;
3. suppression, consentimiento y reglas por jurisdicción;
4. inventario de seats, credits, betas, inboxes y permisos con readback;
5. dry-run/draft y aprobación humana para writes y mensajes;
6. idempotencia, rate limits, retry, dead-letter/error queue y rollback;
7. evals de herramienta, agente, cohort y contenido;
8. runtime verification; código o configuración guardada no prueba operación efectiva.

HubSpot Agent Tools y Agent CLI se tratan como capabilities en beta con fallback. El negocio se apoya en juicio,
gobierno y responsabilidad de Efeonce, no en una superficie que el vendor puede cambiar.

## 13. Fuentes oficiales y evidencia

- [HubSpot Prospecting Agent](https://knowledge.hubspot.com/prospecting/use-the-prospecting-agent)
- [Buying signals del Prospecting Agent](https://knowledge.hubspot.com/prospecting/prospect-companies-with-buying-signals)
- [Customer Agent actions](https://knowledge.hubspot.com/customer-agent/set-up-actions-for-the-customer-agent)
- [Customer Agent lead qualification](https://knowledge.hubspot.com/customer-agent/set-up-customer-agent-actions-to-qualify-leads)
- [HubSpot Data Agent](https://knowledge.hubspot.com/data-management/use-data-agent)
- [HubSpot Agent Tools](https://developers.hubspot.com/docs/apps/developer-platform/add-features/agent-tools/overview)
- [HubSpot Agent CLI public beta](https://developers.hubspot.com/changelog/hubspot-agent-cli-available-in-public-beta)
- [Apollo–HubSpot integration](https://knowledge.apollo.io/hc/en-us/articles/4416619021837-Integrate-HubSpot-with-Apollo)
- [Apollo Tasks](https://knowledge.apollo.io/hc/en-us/articles/28705458602125-Tasks-Overview)
- [Apollo Sequences](https://knowledge.apollo.io/hc/en-us/articles/4409237165837-Sequences-Overview)

## 14. Decisiones abiertas

| Decisión                                       | Owner                             | Gate                                                        |
| ---------------------------------------------- | --------------------------------- | ----------------------------------------------------------- |
| Owner del piloto `Commercial Systems Operator` | Leadership                        | Nombre, capacidad liberada y SLA                            |
| Cohortes y rails iniciales                     | Commercial + RevOps               | Cuentas excluyentes y enrollment aprobado                   |
| Eligibility HubSpot                            | HubSpot admin                     | Seats, credits, betas, inboxes y permisos verificados en UI |
| Apollo–HubSpot mapping                         | RevOps                            | Dedupe, writers, source, suppression, rollback y readback   |
| Revenue Orchestrator                           | Product/Architecture + Commercial | ADR, scope, tools, evals, human gates y costo               |
| Contratación fractional                        | Leadership + Finance              | Trigger observado, loaded cost y periodo de prueba          |

## 15. Change log

| Fecha      | Cambio                                                                                      | Estado                                         |
| ---------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 2026-08-29 | Se normaliza la métrica a `primeras reuniones realizadas` para cohorts y control            | `Proposed for validation · no runtime rollout` |
| 2026-08-29 | Primera versión: stack, dos carriles, humano/agente, roadmap, capacidad y staffing triggers | `Proposed for validation · no runtime rollout` |
