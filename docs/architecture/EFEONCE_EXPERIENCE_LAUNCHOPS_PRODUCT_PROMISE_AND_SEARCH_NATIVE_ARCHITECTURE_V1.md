# Efeonce Experience LaunchOps — Product Promise & Search-Native Architecture V1

## Status

- Status: Proposed
- Date: 2026-07-26
- Product: Experience LaunchOps, product service de Wave
- Contractual face: Efeonce
- Primary owner: Wave Product / LaunchOps

## Product promise

Experience LaunchOps debe permitir que una organización publique experiencias digitales de calidad,
con trazabilidad y control, en menos tiempo y con menos espera entre equipos, sin sustituir su stack
existente ni quitar autoría a sus especialistas.

La plataforma no promete rankings, indexación, tráfico ni citaciones. Promete que cada lanzamiento
que atraviesa sus gates nace con los artefactos, controles y evidencia necesarios para ser técnicamente
descubrible, semánticamente interpretable, medible y elegible para búsqueda y sistemas agentic.

La promesa se entrega como una capacidad socio-técnica: método, Launch Operator, especialistas, Workers,
adapters, sistemas del cliente, gates y evidencia. La plataforma no sustituye al equipo del cliente ni
convierte la producción en una caja negra; le entrega al operador contexto, secuencia y herramientas para
dirigir el lanzamiento.

## Cómo se produce la aceleración

La velocidad no proviene de generar más rápido una página aislada. Proviene de convertir el lanzamiento
en una unidad operable, paralelizar trabajo compatible y reducir espera, handoffs, retrabajo y fallas tardías.

```text
Intent → Launch Request → Experience Spec → contratos y dependencias
      → trabajo paralelo con Workers → preflight determinístico
      → revisión y aprobación humana → publicación controlada
      → verificación post-launch → evidencia y aprendizaje reutilizable
```

El Launch Control Plane debe:

1. convertir un brief en un `Launch Request` estructurado;
2. descubrir dependencias, owners, sistemas, ventanas y restricciones;
3. reutilizar recetas, patrones, componentes, copy blocks, schemas y adapters aprobados;
4. separar trabajo paralelizable de decisiones que requieren autoridad humana;
5. mantener un tablero de blockers, SLA de aprobación y estado de cada handoff;
6. ejecutar preflight repetible antes de pedir aprobación;
7. publicar mediante el sistema de registro del cliente, con rollback y evidencia;
8. medir el ciclo completo, no solamente el tiempo de ejecución del agente.

### Qué cambia para cada participante

| Participante | Antes | Con LaunchOps |
| --- | --- | --- |
| Launch Operator | persigue estados, personas y aprobaciones | dirige con contexto, blockers, SLA y evidencia |
| UI/UX | recibe solicitudes incompletas y corrige tarde | trabaja sobre BrandContract, ExperienceSpec y patrones aprobados |
| UX Content/Brand | revisa inconsistencias después de producir | define reglas, claims, tono y criterios reutilizables |
| Developers | descubren tarde límites del CMS, datos o release | reciben dependencias, capabilities y DeliveryContract explícitos |
| Search/Measurement | entra como revisión final | participa desde SearchContract y MeasurementContract |
| Governance/Compliance | revisa un paquete incompleto | recibe riesgo, controles, cambios y evidencia trazable |

El objetivo no es quitar trabajo especializado, sino trasladar el esfuerzo desde coordinación repetitiva y
corrección tardía hacia decisiones de mayor valor.

## La unidad de producto: Launch Contract

Cada lanzamiento debe tener un paquete versionado y auditable:

| Artefacto | Propósito | Gate owner |
| --- | --- | --- |
| `LaunchRequest` | objetivo, audiencia, ventana, owner, riesgo y alcance | Launch Operator |
| `ExperienceSpec` | estructura, UX, contenido, estados, responsive y dependencias | Product/UX |
| `BrandContract` | tokens, componentes, tono, accesibilidad y reglas de marca | Brand/UI/UX |
| `SearchContract` | crawlability, indexabilidad, entidades, schema, canonical, enlaces y AEO | Search Visibility 360 |
| `MeasurementContract` | eventos, data layer, tagging, consentimiento, destinos y QA | Measurement & Analytics |
| `DeliveryContract` | CMS/DXP, adapters, environments, release, rollback y ownership | Technical |
| `GovernancePack` | riesgo, compliance, aprobaciones, excepciones y evidencia requerida | Client governance |
| `LaunchEvidence` | diffs, checks, aprobaciones, release, smoke tests y observación | LaunchOps |

Ningún Worker puede producir directamente “una página final” sin cumplir el contrato correspondiente.
Produce artefactos tipados, diffs y propuestas; la autoridad de dominio revisa y aprueba donde corresponda.

## Search-native y agent-readable by design

Search y AEO no son una revisión posterior. Son restricciones de diseño expresadas desde `ExperienceSpec`
y `SearchContract`.

### Capas obligatorias

| Capa | Resultado requerido |
| --- | --- |
| Identidad | propósito, audiencia, entidad principal, organización, producto/servicio y relaciones claras |
| Información | jerarquía de headings, answer blocks, definiciones, comparaciones, FAQs y fuentes cuando aplique |
| Semántica | HTML semántico, labels, relaciones, schema estructurado y consistencia entre visible y machine-readable |
| Descubribilidad | URLs, canonical, enlaces internos, sitemap/indexing policy y ausencia de bloqueos no intencionales |
| Citable readiness | claims verificables, contexto suficiente, autoría/provenance y contenido estable que pueda ser referido |
| Agent readiness | acciones, estados, requisitos, límites, datos estructurados y handoffs legibles por herramientas/agentes |
| Medición | eventos de negocio, conversiones, consent, attribution y observabilidad post-launch |

“Citable” significa preparado para ser comprendido y evaluado por sistemas de búsqueda o agentes; no significa
que Wave pueda garantizar que un tercero lo cite.

### Preflight Search/Agent

Antes de aprobación, el sistema debe verificar como mínimo:

- intención, entidad principal y audiencia consistentes;
- contenido visible, metadata, schema y claims sin contradicciones;
- headings, links, canonical, robots y sitemap coherentes con la política;
- renderizado accesible y contenido disponible sin depender indebidamente de JavaScript;
- answer blocks y datos estructurados con contexto suficiente;
- fuentes, fechas, autoría y provenance cuando el claim lo requiera;
- acciones y estados explícitos para consumidores humanos y agentic;
- eventos de medición y consentimiento validados;
- evidencia de preview, release y smoke test.

## Gates de la promesa

Los gates son acumulativos y bloquean sólo lo que tiene riesgo material:

- **G0 Intent:** problema, audiencia, outcome, owner y denominador de éxito.
- **G1 Feasibility:** CMS/DXP, datos, permisos, dependencias, riesgo y ventana.
- **G2 Experience:** BrandContract, UX, responsive, accessibility y content structure.
- **G3 Search/Agent:** SearchContract, semantic model, indexability, citation readiness y agent actions.
- **G4 Measurement:** MeasurementContract, consent, events, QA y destination ownership.
- **G5 Governance:** risk class, approvals, legal/compliance, exceptions y evidence requirements.
- **G6 Delivery:** adapter/transport, preview, diff, release plan, rollback y ownership.
- **G7 Launch:** aprobación humana válida, despliegue, smoke checks y auditoría.
- **G8 Learn:** post-launch monitoring, baseline/after, incidents, learnings y recipe update.

Los checks determinísticos y Workers detectan, explican y proponen. Las personas conservan la autoridad sobre
marca, contenido sensible, riesgo, legal, compliance, publicación y excepciones.

## Métricas que prueban velocidad sin degradar calidad

El piloto debe establecer baseline y after con el mismo denominador:

- lead time total: request aceptado → publicado;
- touch time vs. wait time;
- tiempo por handoff y tiempo de aprobación;
- porcentaje de trabajo paralelizado;
- first-pass approval rate;
- retrabajo y defectos encontrados después de publicación;
- rollback/change-failure rate;
- cobertura de SearchContract, MeasurementContract y evidence pack;
- adopción y satisfacción del Launch Operator y especialistas;
- costo por lanzamiento y margen p50/p95.

La métrica primaria es reducción de lead time manteniendo gates, calidad, compliance, accesibilidad,
medición y autoría humana. Si la velocidad sube y aumentan defectos o excepciones no auditadas, la promesa
no se considera cumplida.

## Arquitectura de garantía

```text
Reusable knowledge + approved recipes
        ↓
Launch Contract + dependency graph
        ↓
Workers + adapters + client systems of record
        ↓
Deterministic preflight + human gates
        ↓
Controlled release + evidence + post-launch learning
```

La reutilización debe ser versionada y gobernada: cada patrón, Worker, adapter y regla declara owner,
compatibilidad, permisos, fecha de revisión, evidencia y condición de salida. El sistema aprende de los
lanzamientos aprobados; no convierte automáticamente un resultado en estándar.

## Acceptance criteria del producto

- [ ] Un operador puede llevar un lanzamiento desde brief hasta evidencia sin perseguir manualmente el estado
      de cada equipo.
- [ ] El sistema identifica dependencias y permite trabajo paralelo sin ocultar blockers.
- [ ] Un lanzamiento reutiliza artefactos aprobados y muestra diffs antes de publicar.
- [ ] SearchContract y MeasurementContract existen antes de la aprobación técnica.
- [ ] Un preflight reproducible detecta fallas de marca, UX, accesibilidad, search, medición, governance y delivery.
- [ ] La publicación ocurre en el sistema del cliente con permisos mínimos, aprobación y rollback.
- [ ] El evidence pack permite reconstruir quién propuso, revisó, aprobó, publicó y verificó cada cambio.
- [ ] El piloto demuestra mejora de lead time sin deterioro material en calidad, compliance o satisfacción.
- [ ] El sistema distingue preparación para ser encontrado/citado de resultados que dependen de terceros.

## Related architecture

- [`Agentic Platform Decision`](EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md)
- [`Agent Fabric`](EFEONCE_EXPERIENCE_LAUNCHOPS_AGENT_FABRIC_ARCHITECTURE_V1.md)
- [`Brand/UI/UX Quality Model`](EFEONCE_EXPERIENCE_LAUNCHOPS_BRAND_UI_UX_CONSISTENCY_QUALITY_MODEL_V1.md)
- [`Governance & Compliance Operating Model`](EFEONCE_EXPERIENCE_LAUNCHOPS_GOVERNANCE_COMPLIANCE_OPERATING_MODEL_V1.md)
- [`EPIC-036`](../epics/to-do/EPIC-036-efeonce-experience-launchops.md)

## Revisit when

- el producto prometa resultados de ranking, tráfico o citación en lugar de readiness;
- un cliente exija publicación autónoma o eliminación de aprobación humana;
- SearchContract y MeasurementContract se separen del Launch Contract;
- la evidencia del piloto no permita distinguir aceleración real de simple reducción de trabajo visible.
