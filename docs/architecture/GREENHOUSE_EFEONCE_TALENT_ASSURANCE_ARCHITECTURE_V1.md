# Greenhouse Efeonce Talent Assurance Architecture V1

## Status

- Lifecycle: `Architecture`
- State: `Proposed`
- Date: 2026-07-30
- Owner: Talent + Workforce + Operations + Delivery; Finance/Commercial and Client Experience are required owners at their boundaries
- Decision: [GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1](GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md)
- Program: [EPIC-038](../epics/to-do/EPIC-038-efeonce-talent-assurance-agentic-quality-system.md)
- Confidence: `medium`
- Runtime state: design only; no schema, capability, agent or autonomous write is authorized by this document

## 1. Purpose

Efeonce vende capacidades operadas y gobernadas que se expresan parcialmente en personas. El cliente confía en Efeonce para contratar, asignar, entregar, desarrollar, retener y reemplazar capacidad calificada.

`Talent Assurance` es la arquitectura que hace verificable esa promesa. Su claim visible es `Verificado por Efeonce`, acotado por capability, nivel, contexto, evidencia, fecha, vigencia y límites.

El sistema protege dos experiencias primarias:

- el operador del cliente, que necesita confiar en la capacidad y en la continuidad;
- el colaborador, que necesita entender qué se verificó, cómo se mantiene y cómo puede desarrollarse o corregirlo.

## 2. Architectural thesis

La agencia no garantiza que una persona nunca cambie. Garantiza una capacidad gobernada, con evidencia y continuidad proporcional al contrato.

```text
TalentDemand
→ capability contract + economic feasibility
→ role scorecard + assessment/work sample
→ human hiring decision
→ handoff + onboarding
→ delivery evidence + client-operator feedback
→ 30/60/90 outcome
→ verification lifecycle + continuity plan
→ template/economics/process learning
```

## 3. Boundaries and ownership

| Concern | Owner | Talent Assurance consumes/produces |
|---|---|---|
| Talent demand and build/buy/borrow | Workforce/ICO | capability gap, role, period, capacity evidence |
| Candidate identity and application | Hiring | evidence links, selection journey, decision history |
| Assessment and interview | Talent/Hiring | competency evidence, work samples, structured ratings |
| Legal relationship and payroll | HRIS/Payroll/Legal | status/readiness; never compensation truth from Hiring |
| Delivery assignment | Operations/Staff Aug/Creative Services | context, lane, dedication, owner, backup |
| Client experience | Client Experience/Account Lead | structured operator feedback and health signals |
| Performance | People/ICO | observed outcomes, autonomy, delivery metrics |
| Cost, margin and pricing | Finance/Commercial | feasibility verdict, cost snapshot, margin guardrails |
| Agent execution | Agent runtime + domain owners | proposals, policy outcomes, bounded effects, audit |

Talent Assurance is a coordination and evidence layer. It must not duplicate Person, Hiring, HRIS, Payroll, Finance, Staff Augmentation or ICO truth.

### Reuse-first constraint

Este diseño extiende y conecta Greenhouse; no introduce una plataforma paralela. La implementación debe reutilizar
los aggregates, readers, commands, capabilities, proposal ledger, audit y agent runtime existentes. Una task que
proponga crear un objeto o módulo paralelo debe detenerse y demostrar primero por qué la fuente existente no puede
extenderse.

Prohibiciones de arquitectura:

- no crear ATS, HRIS, People, performance, skills registry, portfolio vault ni cost ledger paralelo;
- no duplicar `Person`, `candidate_facet`, `member`, skills, assessments, onboarding o performance truth;
- no crear un agent runtime separado ni tool permissions que evadan `can()`, views, entitlements o audit;
- no crear un nuevo deployable, repo, schema cross-domain o cross-runtime solo para Talent Assurance;
- no convertir una proyección de assurance en una nueva source of truth sin ADR independiente.

La unidad nueva debe ser la mínima necesaria: preferir `reader/projection` sobre aggregate nuevo, y preferir un
command/capability existente sobre un endpoint local a una UI.

## 4. Target domain model

The target model is additive and extraction-ready. Names are design candidates until an ADR is accepted. Estos
objetos son proyecciones o registros de assurance sobre fuentes existentes, no reemplazos de esos dominios.

### 4.1 Capability Contract

The internal contract for a client or internal demand:

- capability/skill;
- role and seniority;
- target level;
- context and client/operator needs;
- dedication and period;
- acceptance criteria;
- evidence required;
- continuity/backup requirement;
- economics feasibility state;
- owner and escalation path.

It is derived from `TalentDemand` and must not create a second demand root.

### 4.2 Verified Capability Record

The auditable claim behind `Verificado por Efeonce`:

- `identity_profile_id` / person reference;
- capability and level;
- context/role;
- evidence references;
- verifier and verification method;
- verified-at and valid-until;
- confidence and limitations;
- status: `proposed`, `verified`, `expiring`, `suspended`, `revoked`;
- correction/appeal lineage;
- provenance and policy version.

El record debe referenciar `identity_profile_id`, `candidate_facet_id`, `member_id`, asset, assessment,
performance y feedback existentes según corresponda; no debe materializar una identidad o un repositorio de skills
paralelo.

The record must distinguish observed facts, collaborator assertions, evaluator judgments and agent inferences. An inference never becomes verified truth without human confirmation.

### 4.3 Hiring Quality Case

The selection-side case links:

`TalentDemand → HiringOpening → HiringApplication → assessment/interview/work sample → human decision → HiringHandoff`.

It records evidence completeness, missing evidence, overrides and selection-failure taxonomy without replacing `HiringApplication` or `HiringHandoff`.

### 4.4 Quality-of-Hire Outcome

The post-hire projection links the original application/handoff to:

- onboarding completion;
- first observable value;
- 30/60/90 reviews;
- structured client-operator feedback;
- performance/ICO outcomes where applicable;
- support level and autonomy;
- final outcome: `validated_hire`, `needs_support`, `role_mismatch`, `selection_failure`, `insufficient_evidence`.

The outcome is evidence for learning and assurance. It must not silently rewrite the original assessment or decision.

## 5. Agentic-by-design operating model

Agents are model-directed operators over canonical readers and commands, not a parallel hiring system. Every capability must have API parity and deterministic policy enforcement outside the model.

### 5.1 Agent roles

Logical roles, not necessarily separate models or services:

- **Demand Advisor:** identifies capability gaps, compares build/buy/borrow and requests missing inputs.
- **Role Calibrator:** proposes role scorecards, levels, evidence and template alignment.
- **Candidate Evidence Analyst:** summarizes allowlisted evidence and flags missing or contradictory evidence.
- **Quality Reviewer:** proposes selection risks, onboarding risks and 30/60/90 follow-ups.
- **Continuity Planner:** proposes backup, succession and transition actions.
- **Economics Advisor:** proposes scope/composition/price alternatives from approved cost projections; never invents margin.
- **Talent Assurance Steward:** proposes verification, renewal, suspension or development actions from evidence.

Do not create a multi-agent mesh merely to mirror modules. Each role needs a measurable task, bounded authority, independent failure containment and a single accountable owner.

### 5.2 Autonomy ladder

| Tier | Agent may do | Human requirement | Examples |
|---|---|---|---|
| `observe` | Read governed context, detect gaps, explain evidence | No approval; read scope only | missing assessment, stale verification, concentration risk |
| `recommend` | Rank options and risks | Human reviews recommendation | build vs buy vs borrow, backup candidate |
| `propose` | Create a typed proposal with evidence and diff | Human confirms exact proposal | scorecard draft, development plan, economic scenario |
| `execute_bounded` | Execute reversible, allowlisted commands after approval | Approval bound to resource, payload and expiry | assign assessment, create follow-up, notify owner |
| `decide_policy` | Resolve deterministic policy outcomes | No human needed only for pre-approved low-risk rules | incomplete data, stale state, routing, reminders |
| `human_decision` | Hire/reject, verify/revoke, change price, change assignment or terminate | Human decision is mandatory | employment, client-facing staffing, compensation, claim status |

The word “decide” is reserved for deterministic policy transitions or explicitly delegated low-risk workflow decisions. It does not authorize autonomous employment or client-capacity decisions.

### 5.3 Hard human gates

Human confirmation is mandatory for:

- hire, reject, hold or backup selection;
- overriding assessment or interview evidence;
- issuing, revoking or materially changing `Verificado por Efeonce`;
- client-facing staffing or replacement;
- compensation, pricing, discount or margin exception;
- termination or adverse collaborator outcome;
- release of sensitive candidate/collaborator data;
- any action with irreversible or legally material effect.

## 6. Agent runtime contract

An agent run must be a durable state machine:

`accepted → planning → awaiting_policy/approval → executing → checkpointed → completed | failed | cancelled | quarantined`.

Persist observable evidence, not hidden chain-of-thought:

- run ID and correlation ID;
- initiating actor and delegated workload identity;
- tenant/resource scope;
- prompt/model/tool/policy/eval versions;
- input projection and source IDs;
- proposal and proposed-vs-confirmed diff;
- approval actor, expiry and bound effect;
- tool calls, idempotency keys and outcomes;
- budget, retry and timeout state;
- final policy/outcome reason code.

Every external effect requires a pre/post checkpoint, idempotency and readback/reconciliation. A timeout after an external call is an unknown outcome, not proof of failure.

## 7. Context and memory

Agents receive allowlisted projections, never raw cross-domain tables. Context must include source IDs, timestamps, freshness, confidence and tenant/resource scope.

Separate:

- retrieval: governed current evidence;
- memory: typed, provenance-bearing projection about a person, role, account or decision;
- inference: non-authoritative proposal until confirmed.

Candidate and collaborator PII requires field-level authorization, redaction, purpose, retention and audit. Client operators receive only the client-safe evidence projection.

## 8. Quality and assurance scenarios

### Selection completeness

Given a critical role with an incomplete assessment, the system must block or route the decision as `evidence_incomplete`, explain missing evidence and prevent the agent from presenting the candidate as verified.

### Candidate evidence integrity

Given contradictory CV, portfolio, assessment or interview evidence, the agent must flag the contradiction, cite sources and abstain from a final recommendation until a human resolves it.

### Client continuity

Given a key-person risk or departure, the system must expose affected capacity, memory completeness, backup state and next actions without exposing unrelated personnel data.

### Economic feasibility

Given a fee and required capability, the system must use approved cost projections to produce `go`, `re-scope`, `re-price`, `borrow` or `no-go`; it must never invent salary, margin or availability.

### Human oversight

Given an agent proposal, the confirmation surface must show the exact evidence, policy, diff and downstream effect. Approval must expire and cannot be reused for a different resource or payload.

## 9. Evals and promotion gates

Every agent role requires a versioned eval set with:

- representative role/account scenarios;
- holdout cases and adversarial prompts;
- blinded human labels;
- false-pass and false-fail rates;
- evidence-citation accuracy;
- abstention quality;
- unauthorized-action rate;
- human override rate;
- cost per accepted success;
- slice analysis by role, geography and workflow.

Autonomy promotion follows `observe → recommend → propose → execute_bounded`. Evidence expires when model, prompt, tool, policy, corpus, memory schema, population or risk changes materially.

## 10. Security, privacy and fairness

- No autonomous hire/reject.
- No emotion, face, voice, biometric or social-score inference.
- No raw answer keys/rubrics in candidate-facing payloads.
- No sensitive identity documents at public apply.
- No cross-tenant retrieval or unbounded agent context.
- No client-facing claim from a draft or unconfirmed inference.
- Fairness monitoring remains aggregate, privacy-safe and separate from per-candidate decisions.
- Agent proposals cannot bypass views, entitlements, capabilities, audit or domain boundaries.

## 11. Cost and operational controls

Track cost per successful outcome by workflow, tenant, model route and autonomy tier. Bound tokens, tools, retries, fan-out, wall time and human review minutes.

No agentic runtime is launch-ready without:

- kill switch;
- owner and on-call path;
- degraded/read-only mode;
- policy-service failure behavior;
- replay/idempotency tests;
- evidence retention/deletion policy;
- rollback or compensation strategy.

## 12. Transition roadmap

1. **Decision and baseline:** accept/revise ADR; inventory existing profile, assessment, onboarding, performance, feedback and economics sources.
2. **Read-only assurance projection:** capability claims, evidence completeness, quality cases and feasibility reader.
3. **Agent observe/recommend:** demand calibration, missing evidence, continuity risk and economics scenarios.
4. **Human-confirmed proposals:** scorecards, development plans, follow-ups, verification renewal and continuity actions.
5. **Bounded execution:** reversible commands with exact approval binding and reconciliation.
6. **Quality loop:** 30/60/90, operator feedback, selection-failure learning and template recalibration.
7. **Autonomy review:** promote only bounded policy decisions with sustained evidence; keep employment and client-capacity decisions human-owned.

## 13. Open questions before acceptance

- Which claims qualify for `Verificado por Efeonce` in V1?
- Who is the accountable verifier per capability and role?
- What are the 30/60/90 outcome definitions and evidence sources?
- What client-operator feedback is contractually and privacy-wise shareable?
- What is the minimum evidence per role/seniority?
- What economic reserve funds backup and replacement?
- Which deterministic policy decisions may agents execute without approval?
- What are the initial eval datasets and promotion thresholds?
