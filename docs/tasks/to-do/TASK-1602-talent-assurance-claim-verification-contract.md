# TASK-1602 — Talent Assurance Claim and Verification Contract

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-038`
- Status real: `2026-10-09: decisión y arquitectura objetivo aceptadas por el operador; catálogo de claims, policy detallada y revisión de owners pendientes. Sin nuevo runtime activado.`
- Rank: `EPIC-038-phase-0`
- Domain: `agency|hr|workforce|delivery`
- Blocked by: `none`
- Branch: `task/TASK-1602-talent-assurance-claim-verification-contract`
- GitHub Issue: `none`

## Summary

Formaliza qué significa `Verificado por Efeonce`, qué evidencia lo sostiene, quién verifica, cuánto dura y cómo se corrige, suspende o revoca. No crea un badge ni una fuente de verdad nueva.

## Why This Task Exists

El sello actualmente puede interpretarse como una afirmación amplia sobre una persona. Sin límites de capability, nivel, contexto, evidencia y vigencia, la promesa no es contestable frente al cliente ni útil para desarrollo del colaborador.

## Goal

- Aprobar la taxonomía V1 de claims, evidencia, estados, vigencia, límites y apelación.
- Asignar ownership a Talent, Workforce, Delivery, Client Experience, Finance/Commercial y Legal/Privacy según boundary.
- Dejar criterios que las tasks runtime puedan implementar sin inventar semántica.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md`

Reglas: el claim es acotado; la evidencia se distingue de inferencias; una inferencia no es verdad verificada; ningún agente contrata, rechaza, verifica o revoca sin gate humano.

## Dependencies & Impact

### Depends on

- `EPIC-038` y su decisión/arquitectura objetivo aceptadas; completar policy y revisión de dominios.

### Blocks / Impacts

- Bloquea `TASK-1603` a `TASK-1611`.

### Files owned

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/documentation/hr/efeonce-talent-assurance.md`

## Current Repo State

### Already exists

- Decision y arquitectura objetivo V1 en estado `Accepted` desde 2026-10-09 por aprobación explícita del operador.
- `Verificado por Efeonce` definido como claim acotado conceptualmente.

### Gap

- Falta catálogo V1 de claims y policy versionada para vigencia, apelación, revocación y ownership operativo.

### Avance documental 2026-10-09

- Aceptación registrada en el ADR con fuente y rationale: evidencia contextual, formación, desempeño,
  continuidad y economía sostenible. No equivale a revisión firmada de cada dominio ni a claim emitido.
- [Servicio regional CRM/RevOps](../../services/revenue-operations-crm/CRM_SPECIALIST_CAPACITY_SERVICE_V1.md)
  consume Talent Assurance y separa responsabilidades de Staff Augmentation y operación gestionada.
- Se retira el bloqueo de aceptación conceptual; catálogo/policy y revisión cross-domain siguen pendientes.
  Esta actualización de progreso no cierra la task ni autoriza schema o rollout.

### Baseline verified 2026-08-15 (histórico; aceptación resuelta el 2026-10-09)

- `HiringHandoff`/activación, validity, capacity y pricing son evidencia o inputs de dominios dueños; ninguno
  constituye hoy un claim `Verificado por Efeonce` ni autoriza emitirlo, suspenderlo o revocarlo.
- La policy opening→assessment pertenece a `TASK-1719` (EPIC-011). No resuelve por sí misma taxonomía de claim,
  verificador, vigencia, apelación, retención o comunicación client/collaborator.
- Bloqueo real para las tasks runtime: falta aceptación explícita y ownership firmado por Talent, Workforce,
  Delivery, Client Experience, Finance/Commercial y Legal/Privacy. Discovery read-only sí puede continuar.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `docs/architecture` y documentación HR
- Future candidate home: `remain-shared`
- Boundary: contrato de assurance consumido por Hiring, Workforce, Delivery, Client Experience, Finance y agentes
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `ownership cross-domain y aprobación policy`

## Scope

### Slice 1 — Claim taxonomy

- Definir claim por capability, nivel, contexto, evidencia, verificador, fecha, vigencia y límites.
- Definir estados `proposed`, `verified`, `expiring`, `suspended`, `revoked` y sus transiciones humanas.

### Slice 2 — Evidence and appeal policy

- Clasificar evidencia observada, declarada, evaluada e inferida.
- Definir corrección, apelación, privacy, retención y comunicación al colaborador/cliente.

## Out of Scope

- Schema, badge público, capability runtime o automatización agentic.

## Acceptance Criteria

- [x] Decision V1 aceptada explícitamente con rationale — aprobación del operador 2026-10-09 registrada en [ADR, aceptación y alcance](../../architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md#aceptación-2026-10-09--estándar-transversal-y-alcance).
- [ ] Claim taxonomy y evidence policy versionadas.
- [ ] Owners, gates humanos, privacy y límites comerciales documentados.
- [ ] Tasks downstream referencian la policy sin reinterpretarla.

## Rollout Plan & Risk Matrix

Impact-only: decisión aceptada; policy y revisión cross-domain antes de activar claims/runtime. La aceptación no completa esta task. Cambiar la decisión requiere delta trazable; mantener el sello fuera de superficies públicas hasta completar sus gates.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Claim demasiado amplio | agency/client | medium | aprobación cross-domain y ejemplos negativos | `assurance.claim_policy_review` |
| Evidencia interpretada como verdad | agents/hiring | medium | provenance y human gate | `assurance.evidence_provenance_gap` |

## Verification & Definition of Done

- [ ] Revisión Talent + Workforce + Delivery + Client Experience + Finance/Commercial + Privacy.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` verdes.
- [ ] Epic y handoff sincronizados.
