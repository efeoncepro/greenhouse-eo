# Experience LaunchOps — Business Model V1

> **Status:** `Draft`
> **Owner:** Strategy + Wave + Product/Architecture + Finance + Legal/IP
> **Version:** V1
> **Date:** 2026-07-26
> **Validated as of:** Problem hypothesis validated qualitatively; commercial and delivery validation pending.
> **Related:** [`WAVE_BUSINESS_MODEL_V1.md`](../wave/WAVE_BUSINESS_MODEL_V1.md), [`EXPERIENCE_LAUNCHOPS_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md`](EXPERIENCE_LAUNCHOPS_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md), [`EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md`](../../architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md), [`Governance & Compliance Operating Model`](../../architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GOVERNANCE_COMPLIANCE_OPERATING_MODEL_V1.md), [`EPIC-036`](../../epics/to-do/EPIC-036-efeonce-experience-launchops.md)

## 1. Decisión ejecutiva

**Experience LaunchOps** es un product service de Wave, marca de producto de Efeonce, para que organizaciones
mid-market y enterprise pasen de una oportunidad comercial a una experiencia digital publicada, medible,
search-native y gobernada, reduciendo handoffs, esperas y retrabajo sin eliminar las aprobaciones humanas.

No es un CMS, un page builder, una migración de plataforma ni una promesa de publicación autónoma. Es una capa de
orquestación e interoperabilidad que se enchufa sobre el ecosistema existente del cliente: observa, conecta,
asiste, valida y coordina sin sustituir CMS, DXP, DAM, PIM, analytics, CRM, IAM, ITSM o CI/CD. Es una combinación
de método, personas, control plane, agents, adapters y operación gestionada. El cliente contrata a Efeonce; Wave
nombra la capability/product service.

La hipótesis inicial nace de organizaciones reguladas con muchos equipos, CMS existente y alto costo de demora.
El wedge inicial puede ser banca/seguros/fintech, pero el producto es CMS-agnóstico y debe poder expandirse a
telco, retail, utilities, salud, educación y marketplaces.

## 2. Problema, ICP, buyer y JTBD

El problema no es sólo producir una landing. Es coordinar estrategia, contenido, diseño, desarrollo, CMS,
legal/compliance, SEO/AEO, analytics, QA y release en una ventana de oportunidad.

El ICP, JTBD, buying group, triggers, exclusiones y qualification gates viven en el [Customer Model Integrity
Pack](EXPERIENCE_LAUNCHOPS_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md).

## 3. Propuesta de valor y mecanismo

### Resultado comprado

- Menor tiempo desde brief aprobado hasta experiencia publicada.
- Menos handoffs, ciclos de aprobación y retrabajo.
- Calidad y evidencia consistente antes y después de publicar.
- SEO/AEO y medición incorporados desde la especificación, no como revisión tardía.
- Reutilización de templates, decisiones, componentes y adapters sin convertir el delivery en freeform.

### Mecanismo

`Opportunity → Brief → Experience Spec → Dependency Graph → Build → SEO/AEO + Measurement Preflight → Human Approval → Release → Verification → Learning`

Cada Experience Spec incluye un **Search Contract**: intención, URL, metadata, headings, canonical, schema,
entidades, enlaces internos, indexability, citation readiness, answer capsules, fuentes, eventos y criterios de
conversión.

La oferta contempla dos dimensiones distintas:

- **Agentic delivery:** agents ayudan a analizar, diseñar, construir, validar y liberar bajo permisos y gates.
- **Agentic web:** la experiencia publicada es semántica, interpretable y accionable para buscadores y agentes.

### Adoption without replacement

La ruta de adopción es progresiva: `observe → connect → assist → governed write → co-operate → optional managed
operation`. El cliente conserva los sistemas de record, su IAM, sus aprobaciones y sus equipos. LaunchOps sólo
asume autoridad explícita sobre coordinación, controles, evidencia y acciones autorizadas por adapter.

El Launch Operator es el héroe operativo: recibe una armadura de contexto, dependencias, patrones aprobados,
preflight, diffs, evidencia, simulación y recuperación. UI designers, UX Content, developers y especialistas no son
un costo a eliminar; son autoridades de craft que reciben copilotos y mejores instrumentos. El modelo comercial no
debe basar su caso de valor en headcount reduction.

## 4. Taxonomía de la relación

| Capa | Opciones válidas |
| --- | --- |
| Product service | Experience LaunchOps |
| Delivery model | Productized Service, Platform-enabled Service, Managed Squad, Staff Augmentation, Implementation, Advisory |
| Engagement | Diagnostic, Sprint, On-Going, On-Demand, Pilot |
| Operating mode | `efeonce-managed`, `co-operated`, `client-operated` |
| Ecosystem composition | Wave sola; Wave + Globe; Wave + Search Visibility 360; Wave + Measurement; Wave + Agent Systems; Wave + Efeonce Digital/Kortex cuando hay CRM/RevOps |

Un Managed Squad o Staff Augmentation no es un producto distinto: es la forma de aportar capacidad y
accountability. Globe conserva contenido/producción creativa; Efeonce Digital/Kortex conserva CRM/RevOps.

## 5. Packaging inicial — hipótesis

1. **Launch Bottleneck Diagnostic:** mapa de flujo actual, baseline de lead time, handoffs, approvals,
   dependencias, stack y oportunidad piloto.
2. **Experience Launch Sprint:** una experiencia acotada desde brief hasta publicación verificable, con Search
   Contract, medición y aprendizaje.
3. **Managed Experience LaunchOps:** lane recurrente para priorización, producción, approvals, release,
   verificación y reporting.
4. **Launch Platform Enablement:** diseño del operating model, adapters, governance y capacitación para que el
   cliente opere parte de la capacidad.

El packaging no autoriza aún precios, SLA ni claims comerciales; deben pasar por el Pricing Integrity Pack y
validación de delivery.

## 6. Arquitectura de ingresos y economía

Líneas posibles, sujetas a validación:

- fee fijo por diagnostic o sprint;
- fee de implementación por adapter/integración/capability;
- retainer recurrente por lane gestionado o capacidad gobernada;
- Managed Squad por capacidad comprometida;
- Staff Augmentation por capacidad/persona con accountability contractual explícita;
- pass-through de proveedores y consumo tecnológico sólo cuando corresponda;
- expansión por nuevos equipos, sitios, mercados, templates, CMS adapters o canales.

La unidad económica debe separar trabajo humano, consumo de providers, operación, soporte, riesgo de release,
retrabajo y propiedad intelectual. El precio debe basarse en valor/capacidad y complejidad gobernada, no en el
número bruto de páginas.

## 7. Governance, compliance y assurance

Governance y compliance son parte explícita del valor y del scope, no una revisión final invisible. El servicio
usa un `Launch Policy Pack`, clasificación de riesgo, control library, segregación de funciones, exception path y
evidence pack por lanzamiento. El operating model canónico está en [`Governance & Compliance Operating Model`](../../architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GOVERNANCE_COMPLIANCE_OPERATING_MODEL_V1.md).

La complejidad regulatoria debe afectar qualification, lead time, staffing, delivery model y precio. Nunca se
promete “compliance” como claim genérico ni se confunde un preflight técnico con una aprobación legal/regulatoria.

## 8. Scope, responsabilidad y exclusiones

Efeonce es la cara y contraparte. Wave opera el product service. El SOW debe declarar:

- quién es Launch Owner y quién aprueba;
- qué CMS, sitios, mercados y componentes están dentro;
- qué produce Globe y qué produce el cliente;
- quién mantiene CRM, analytics, consentimiento y taxonomía de datos;
- límites de agentes, revisión humana, seguridad, compliance, rollback y soporte;
- definición de “publicado”, “medido”, “indexable” y “listo para agentes”.

Quedan fuera por defecto: migración completa de CMS, reemplazo de plataformas, shadow copies completas de sistemas
del cliente, garantía de rankings o respuestas
de modelos, publicación sin aprobación, CRM ownership, media/PR y producción editorial masiva de Globe.

## 9. Métricas de valor

| Métrica | Definición inicial |
| --- | --- |
| Brief-to-live lead time | Tiempo entre brief aprobado y publicación verificable |
| Approval latency | Tiempo esperando aprobación por etapa |
| Handoffs | Transferencias entre equipos/personas por lanzamiento |
| First-pass yield | Lanzamientos que pasan preflight sin retrabajo material |
| Rework rate | Trabajo repetido después de revisión |
| Post-publish defects | Defectos detectados tras publicar |
| Time to first measurement | Tiempo hasta evento/medición verificable |
| Indexation/citation readiness | Cumplimiento de Search Contract; no es garantía de indexación/citación |
| Throughput | Experiencias publicadas por periodo y lane |
| Cost per launch | Costo fully-loaded por lanzamiento comparable |

## 10. Validación y gates

La oferta está en `Draft`. Antes de `Commercially approved` debe existir:

- discovery con al menos un cliente mid-market/enterprise real;
- baseline del proceso actual y definición de costo de demora;
- un piloto con un CMS real y una experiencia de riesgo controlado;
- evidencia de reducción de lead time/rework sin deteriorar governance;
- cost-to-serve p50/p95, capacidad, margen y stop-loss;
- contrato, privacidad, IP, seguridad, subprocesadores y límites de liability;
- evidencia de repetibilidad y una señal de renovación/expansión.
- aceptación del equipo: menor coordinación repetitiva sin pérdida de autoría, criterio o calidad.

## 11. Riesgos y autocrítica

- La plataforma puede convertirse en consultoría custom si no existe un core reusable y adapters acotados.
- El problema puede ser político/regulatorio y no resolverse sólo con software.
- La automatización puede acelerar errores si el approval model es débil.
- “Agentic” puede ser un claim vacío si no se mide trabajo automatizado y evidencia.
- Wave puede canibalizar Web Experience 360, Measurement o Agent Systems si no se mantiene la arquitectura de
  composición.
- La dependencia de CMS/providers puede erosionar margen; los adapters deben ser reemplazables.

## 12. Decisiones abiertas

- Nombre público definitivo y descriptor comercial.
- Primer CMS adapter fuera de los patrones internos WordPress/Astro; Modyo, Drupal/Acquia y headless son
  candidatos de discovery, no compromisos.
- Qué capabilities se productizan en el core versus delivery especializado.
- Qué componentes serán IP reutilizable de Efeonce y cuáles quedan específicos del cliente.
- Nivel de self-service permitido al cliente.

## 13. Trazabilidad

- [Wave Business Model](../wave/WAVE_BUSINESS_MODEL_V1.md)
- [Wave Portfolio Boundaries ADR](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md)
- [Experience LaunchOps Architecture Decision](../../architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md)
- [EPIC-036](../../epics/to-do/EPIC-036-efeonce-experience-launchops.md)
- [EPIC-019 Public Website Landing Control Plane](../../epics/to-do/EPIC-019-public-website-landing-control-plane.md)
