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
- Status real: `Baseline documental verificado; decisión y policy siguen Proposed, sin runtime autorizado`
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

- `EPIC-038` y sus decisiones propuestas.

### Blocks / Impacts

- Bloquea `TASK-1603` a `TASK-1611`.

### Files owned

- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md`
- `docs/documentation/hr/efeonce-talent-assurance.md`

## Current Repo State

### Already exists

- Decision y arquitectura V1 en estado `Proposed`.
- `Verificado por Efeonce` definido como claim acotado conceptualmente.

### Gap

- Falta aceptación formal, catálogo V1 de claims y policy versionada para vigencia, apelación y revocación.

### Baseline verified 2026-08-15

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

- [ ] Decision V1 aceptada o rechazada explícitamente con rationale.
- [ ] Claim taxonomy y evidence policy versionadas.
- [ ] Owners, gates humanos, privacy y límites comerciales documentados.
- [ ] Tasks downstream referencian la policy sin reinterpretarla.

## Rollout Plan & Risk Matrix

Impact-only: policy first; ningún cambio runtime hasta aceptación. Rollback = revert documental y mantener el sello fuera de superficies públicas.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Claim demasiado amplio | agency/client | medium | aprobación cross-domain y ejemplos negativos | `assurance.claim_policy_review` |
| Evidencia interpretada como verdad | agents/hiring | medium | provenance y human gate | `assurance.evidence_provenance_gap` |

## Verification & Definition of Done

- [ ] Revisión Talent + Workforce + Delivery + Client Experience + Finance/Commercial + Privacy.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` verdes.
- [ ] Epic y handoff sincronizados.
