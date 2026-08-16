# Efeonce Talent Assurance — Decision V1

## Status

- Status: `Proposed`
- Date: 2026-07-30
- Owner: Efeonce Talent + Operations + Delivery, con Finance/Commercial como gate económico
- Scope: Workforce, Hiring/ATS, assessment, talent profiles, onboarding, performance, client experience y capacity pricing
- Reversibility: `two-way-but-slow`
- Confidence: `medium`
- Validated as of: 2026-08-15 (runtime-baseline review; decision remains Proposed)
- Evidence: [Hiring Quality Assurance Audit 2026-07-30](../audits/hiring/GREENHOUSE_HIRING_QUALITY_ASSURANCE_AUDIT_2026-07-30.md)
- Economic companion: [Talent Assurance Economic Guardrails V1](../business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md)
- Architecture companion: [Talent Assurance Architecture V1](GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md)

## Context

Efeonce no vende únicamente horas, piezas o personas. Vende capacidades operadas y gobernadas que el cliente debe poder confiar a sus operadores. Esa confianza incluye selección, desempeño, experiencia, memoria y continuidad.

`Verificado por Efeonce` es una promesa de assurance. No puede sostenerse únicamente con un CV, un portfolio, un assessment o la permanencia de una persona. Necesita evidencia de capability y un sistema que responda cuando la demanda, la persona o la cuenta cambian.

La calidad de selección y la retención no son objetivos opuestos: ambas protegen la promesa. El economics también forma parte del contrato porque un fee que no financia talento, governance, backup y reemplazo vuelve inviable la promesa.

## Decision propuesta

Efeonce debe operar una capa transversal `Talent Assurance` que:

1. define el significado y alcance de `Verificado por Efeonce`;
2. conserva la calidad mínima por rol y nivel;
3. exige evidencia job-related antes de una selección;
4. valida la aplicación en contexto real después del onboarding;
5. mantiene vigencia, revisión, revocación y desarrollo de la verificación;
6. garantiza continuidad de capacidad según el contrato;
7. impide que una oportunidad comercial prometa una capacidad que sus economics no pueden sostener.

`Hiring Quality Assurance` será el subsistema que gobierna la entrada de talento. No reemplaza Hiring, HRIS, Performance, Client Experience ni Finance.

## Delta 2026-08-15 — Revisión de baseline y frontera de ejecución

La revisión confirmó primitives reutilizables de Hiring/Workforce/Finance, pero no aceptó esta decisión ni creó
runtime de Talent Assurance. `HiringHandoff` más `greenhouse_hr.hiring_activation_request` es el lineage durable
application↔member; `TASK-1364` es un reader read-only de validez sobre ese lineage y outcomes tempranos canónicos
de desempeño. No es una taxonomía 30/60/90 ni puede etiquetar una falla de selección.

La policy y asignación opening→assessment-template pertenecen a Hiring/EPIC-011 `TASK-1719`. Talent Assurance
`TASK-1603` puede consumir esa policy sólo para completeness determinística y override humano; no debe crear un
segundo binding. Los readers cost-basis/pricing de Team Capacity y Finance son inputs reutilizables, pero los
contratos propuestos de quotation agentic (`ProfileResolution`, `CostCard`) aún no son un gate Talent Assurance
aceptado.

Por ello, hasta que los owners cross-domain acepten `TASK-1602`, el trabajo puede inventariar y probar fuentes
read-only, pero no emitir un claim, enforcear un bloqueo de factibilidad, exponer continuidad al cliente ni
promover un agente más allá del runtime gobernado existente. Los gates humanos de esta decisión siguen siendo
obligatorios.

## Reuse-first / no parallel system constraint

`Talent Assurance` **no crea una plataforma nueva desde cero**. Es una capa transversal de coordinación, evidencia,
proyección y decisiones gobernadas sobre dominios existentes.

Antes de crear una tabla, reader, command, route, capability, agent tool o UI nueva, la task debe demostrar que no
puede reutilizar o extender:

- `Person` / `identity_profile` para identidad humana;
- `candidate_facet` y `hiring_application` para recruiting;
- `hiring_assessment` / templates / competencies / scorecards para evaluación;
- `HiringHandoff`, HRIS y onboarding para activación;
- talent profiles, skills, tools, certifications y portfolio existentes para evidencia;
- performance/ICO para outcomes;
- `TalentDemand`, Team Capacity e ICO para workforce planning;
- Finance/CPQ para loaded cost, pricing, margin y snapshots;
- Nexa/agent runtime, capabilities, proposal ledger, audit y Full API Parity para agentes.

Queda prohibido crear dentro de este epic:

- un ATS paralelo;
- una identidad `verified_person` o `verified_candidate` paralela;
- un skills registry paralelo;
- un portfolio/document vault paralelo;
- un HRIS, onboarding o performance system paralelo;
- un cost/margin ledger paralelo;
- un agent runtime o permisos especiales fuera del runtime gobernado.

Una nueva proyección solo puede existir si tiene un owner explícito, una fuente canónica declarada, lineage,
freshness, autorización, retención, reconciliación y consumers nombrados. Una nueva fuente de verdad requiere ADR
separado y no queda autorizada por este documento.

## Definición de `Verificado por Efeonce`

El sello solo puede emitirse para un claim acotado:

```text
Persona X
→ capability Y
→ nivel Z
→ contexto/rol C
→ evidencia E
→ verificador V
→ verificado en fecha D
→ vigente hasta R
→ límites L
```

No significa:

- aptitud universal;
- garantía de permanencia de la persona;
- aprobación automática de un cliente;
- ausencia de necesidad de management;
- sustitución del criterio humano;
- certificación legal o académica externa.

## Evidencia mínima

La evidencia se compone, según el rol, de:

1. identidad y trayectoria verificable;
2. skill y portfolio revisados;
3. work sample o ejercicio situacional;
4. entrevista estructurada con rúbrica;
5. referencias o evidencia equivalente cuando el riesgo lo justifique;
6. desempeño observado después de la incorporación;
7. revisión de vigencia y desarrollo.

El score assessment sigue siendo advisory. El sistema puede bloquear una decisión por falta de evidencia operacional configurada, pero nunca auto-contrata ni auto-rechaza.

## Continuidad de capacidad

La agencia no promete que nunca cambiará una persona. Promete continuidad proporcional a la capacidad contratada mediante:

- memoria operativa;
- owner por lane;
- backup o sucesión razonable;
- transición documentada;
- reemplazo con estándar equivalente;
- soporte y governance;
- comunicación temprana al cliente.

## Gate de workforce y economics

Ninguna demanda debería publicarse o comprometerse sin revisar:

- estándar de capability;
- seniority y dedicación;
- disponibilidad/recruitability;
- loaded cost;
- costo de management, QA, backup y reemplazo;
- margen mínimo y sensibilidad;
- alcance y SLA;
- build/buy/borrow;
- viabilidad de retención.

Cuando el presupuesto no alcanza, las alternativas válidas son modificar precio, alcance, composición, modalidad o decisión de no-go. No se puede conservar la misma promesa bajando silenciosamente el estándar.

## Stakeholders protegidos

### Operador del cliente

Debe recibir una persona/capacidad con evidencia comprensible, expectativas claras, canal de feedback y continuidad visible. El feedback del operador es evidencia de delivery, no una calificación subjetiva de simpatía.

### Colaborador

Debe conocer qué se verifica, con qué evidencia, cómo se mantiene el estado, qué necesita desarrollar y cómo puede apelar una evaluación incorrecta. `Verificado` es una ruta de desarrollo, no una etiqueta opaca.

### Efeonce

Debe poder sostener la promesa con staffing, management, economics, memoria, reemplazo y aprendizaje del sistema.

## Alternativas consideradas

### Solo mejorar Careers

Rechazada. Aumenta captación, pero no garantiza calidad, evidencia ni continuidad.

### Mantener el assessment como herramienta opcional

Rechazada para roles críticos. Permite decisiones sin evidencia mínima y deja la calidad en criterio informal.

### Resolver con mayor salario en todos los casos

Insuficiente. El salario es una palanca, pero también importan scope, seniority, liderazgo, aprendizaje, cliente, estabilidad y economía de la oferta.

### Competir bajando la calidad del talento

Rechazada. Destruye el significado del sello y aumenta retrabajo, churn, presión y costo de reemplazo.

### Crear una certificación aislada

Rechazada. La verificación debe estar conectada a Hiring, delivery real, client experience, performance y continuidad.

## Runtime contract propuesto

La implementación futura debe declarar, sin duplicar dominios:

- `TalentDemand` como entrada de workforce;
- `HiringOpening` con perfil interno, estándar y template recomendado/obligatorio;
- `HiringApplication` con evidence completeness y decisión humana;
- `HiringHandoff` como frontera hacia onboarding o placement;
- `member`/onboarding como activación;
- performance/ICO y feedback de cliente como outcomes;
- talent profile/verifications como evidencia vigente;
- Finance/CPQ como dueño de loaded cost, margen y pricing snapshot.

La forma esperada de implementación es:

```text
fuente canónica existente
→ reader/proyección allowlisted
→ propuesta o policy outcome
→ command canónico existente o nuevo con owner explícito
```

No se permite:

```text
nuevo sistema paralelo
→ copia de personas/skills/performance
→ agente con tools y permisos propios
```

## Consequences

### Beneficios

- protege el significado de `Verificado por Efeonce`;
- reduce contrataciones por debajo del estándar;
- hace visibles los errores de selección;
- mejora la experiencia del operador del cliente;
- permite competir por eficiencia y composición, no solo por precio;
- convierte la retención en una capacidad gobernada;
- crea aprendizaje por rol, template y cuenta.

### Costos y riesgos

- mayor tiempo de intake y selección;
- necesidad de mantener templates y rúbricas;
- posible reducción de oportunidades no viables;
- trabajo de integración con onboarding/performance/Finance;
- riesgo de convertir el sello en burocracia o claim excesivo.

## Revisit when

Reabrir esta propuesta cuando:

- se definan los thresholds de evidencia por rol;
- exista un modelo aprobado de verificación y expiración;
- Finance valide la reserva de continuidad y pisos de margen;
- se formalice el ownership entre Talent, Delivery, Client Experience y Performance;
- existan datos suficientes de calidad de contratación para recalibrar templates.

## Handoffs

- Hiring/ATS: Quality Gate, template binding y evidence completeness.
- Talent/People: competencias, entrevistas, desarrollo y revisión.
- Client Experience: feedback del operador y salud de la relación.
- Workforce/ICO: demanda, capacidad, sobreasignación y build/buy/borrow.
- Finance/Pricing: loaded cost, margen, reserva de continuidad y approval gate.
- Legal/Privacy: claims, consentimiento, datos y jurisdicciones.
