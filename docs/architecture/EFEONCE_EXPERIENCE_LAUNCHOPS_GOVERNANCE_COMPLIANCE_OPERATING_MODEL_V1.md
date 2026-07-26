# Efeonce Experience LaunchOps — Governance & Compliance Operating Model V1

> **Status:** Proposed — operating model for discovery and pilot; not a certification or legal opinion.
> **Date:** 2026-07-26
> **Owner:** Wave + Efeonce Delivery + Architecture + Security/Privacy + Legal/Compliance
> **Parent:** [`EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md`](EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md)

## 1. Executive decision

Enterprise no compra sólo velocidad. Compra velocidad con control demostrable. Experience LaunchOps trata
governance, compliance y assurance como una capacidad operativa transversal:

```text
Policy → Control → Evidence → Decision → Release → Continuous verification
```

El servicio no certifica que un cliente cumple la ley ni sustituye a Legal, Compliance, Security, Privacy o Risk.
Traduce políticas y obligaciones aprobadas en requisitos, gates, responsables y evidencia por lanzamiento. La
obligación final y la aprobación regulatoria permanecen en el cliente y sus asesores.

Governance también define la frontera de autoridad entre LaunchOps y las plataformas del cliente: cada integración
declara system of record, modo de operación, permisos, datos replicados, mutaciones autorizadas y exit path.

## 2. Tres capas distintas

| Capa | Pregunta | Resultado |
| --- | --- | --- |
| Governance | ¿Quién decide y bajo qué autoridad? | Roles, policies, permisos, workflow y audit trail |
| Compliance | ¿Qué debe cumplirse y qué evidencia exige el cliente? | Controles, excepciones, findings y sign-off |
| Assurance | ¿Cómo demostramos que ocurrió? | Evidence pack, provenance, timestamps, approvers, tests y release record |

Un preflight técnico no demuestra por sí solo cumplimiento legal, aprobación regulatoria o ausencia de riesgo.

## 3. Governance by design

### Launch Policy Pack

Cada cliente tiene un pack versionado con tipos de experiencia, mercados, dominios, ambientes, CMS autorizados,
clasificación de riesgo, roles, aprobaciones, componentes/claims/assets permitidos, requisitos SEO/AEO,
analytics/consentimiento, reglas de cambio/release/rollback, retención de evidencia y escalamiento.

Wave aporta método y schema; no inventa la policy del cliente.

### Risk-based launch classes

| Clase | Ejemplo | Controles mínimos |
| --- | --- | --- |
| L0 | Preview o contenido no público | Owner + preflight automatizado |
| L1 | Landing pública estándar | Business + brand + SEO/AEO + measurement + release approval |
| L2 | Producto, claim o captura regulada | Legal/Compliance + Privacy/Security cuando aplique + evidence pack |
| L3 | Cambio material, datos sensibles o integración transaccional | Risk owner, doble aprobación, rollback probado e incident path |

La clase depende del contexto y la policy, no del nombre “landing page”.

### Segregation of duties

Baseline: proposer/builder, reviewer/tester, business/compliance approver, release operator y post-launch verifier.
En equipos pequeños se pueden combinar capacidades, pero no eliminar trazabilidad ni aprobación.

## 4. Compliance control library

La biblioteca debe ser modular y jurisdicción/industria-aware:

1. Privacy y datos: consentimiento, minimización, propósito, retención, derechos, transferencias, PII y providers.
2. Security: identidad, least privilege, secrets, integridad, vulnerabilidades, dependencias e incident response.
3. Legal/contract: ownership/licences, claims, disclaimers, terms, releases, vendor terms y liability.
4. Regulatory/industry: requisitos entregados por el cliente o asesoría competente.
5. Accessibility/UX: keyboard, semantic, contrast, forms y errores según política aplicable.
6. SEO/AEO: canonical, indexability, structured data, provenance, claims traceability y agent-readable semantics.
7. Measurement/consent: events, data layer, tagging, destinations, consent, retention y QA.
8. Brand/content: approved claims, tone, imagery, trademarks, evidence y lenguaje prohibido.

Cada control declara `control_id`, owner, applicability, policy source, test/procedure, evidence, severity,
exception path, expiry y review date.

## 5. Control lifecycle

```text
Identify → Map policy → Classify risk → Design controls → Build → Test
→ Resolve/accept exception → Approve → Release → Verify → Monitor → Review
```

Los findings quedan como `resolved`, `accepted risk`, `deferred`, `not applicable` con justificación o `blocked`.
Las excepciones requieren owner, motivo, alcance, expiry, autoridad y control compensatorio cuando corresponda.

## 6. Control plane objects

- `ClientGovernanceProfile`: policies, jurisdicciones, industria, roles, retención y contactos.
- `LaunchRiskAssessment`: clase, factores, rationale y approver.
- `ControlRequirement` / `ControlExecution`: requisito, test, actor/agent, timestamp, referencia y resultado.
- `Finding` / `Exception`: severidad, owner, remediación, vencimiento, decisión y control compensatorio.
- `ApprovalRecord`: actor, rol, scope, versión, decisión, razón y timestamp.
- `ReleaseRecord`: candidate, target, deployment, rollback y verificación.
- `EvidencePack`: índice inmutable de artefactos, tests, approvals, exceptions y post-launch checks.

## 7. Agent governance

Agents pueden clasificar requisitos, detectar dependencias, proponer cambios, ejecutar checks determinísticos,
preparar evidencia y observar señales. No pueden inferir aprobación legal, aceptar riesgo regulatorio, waivar un
control, aprobar su propio output, publicar producción, acceder a secretos no scoped ni reportar unknown/failed como
passed.

Toda acción registra versión de modelo/skill/tool, contexto de policy, input/output, incertidumbre cuando aplique,
decisión humana y estado resultante. La promoción desde advisory a execution requiere capability definida,
evaluación, rollback y owner.

## 8. Evidence pack y cliente

Cada lanzamiento debe poder entregar brief, Experience/Search/Measurement Specs, risk assessment, RACI, controles,
preflight, findings, approvals, exceptions, versión liberada, smoke checks, analytics verification y observaciones
post-launch. La evidencia debe permitir una revisión sin reconstruir decisiones desde chats.

Wave aporta control plane, facilitación, especialistas y ejecución gestionada. El cliente conserva policy, riesgo,
interpretación legal/regulatoria, producción, datos, claims, disclosures, brand approval y risk acceptance. El SOW
debe nombrar esas autoridades; “cliente aprobado” no es un rol suficiente.

## 9. Impacto comercial

Governance y compliance son capacidades explícitas del scope: onboarding del policy pack, configuración de controles,
workflow, preflight, evidence pack, exception register, release/rollback y reporting. La complejidad regulatoria
afecta qualification, staffing, lead time, delivery model y pricing; no se absorbe como trabajo invisible.

## 10. Pilot acceptance criteria

- Un policy pack real mapeado a una clase de lanzamiento y controles.
- Toda aprobación obligatoria resuelve a un rol accountable.
- No existe release de producción sin approval/evidence requerido.
- Se prueba un preflight fallido y una ruta de excepción.
- Se distingue output del agent de aprobación humana.
- Un stakeholder no autor puede revisar el evidence pack.
- Post-launch cubre runtime, SEO/AEO, measurement y rollback readiness.

## 11. Boundaries and legal note

Este documento es un framework de producto/delivery, no una opinión legal, certificación, auditoría ni sustituto de
asesoría. Jurisdicción, industria, contrato, privacidad y publicidad deben validarse con abogado habilitado y los
owners correspondientes antes de publicar.
