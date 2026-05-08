# Pre-Design Checklist

> Run before Step 5 (Generate artifacts) of the workflow. The goal: catch missing inputs that would force re-work later. If any item is unanswered, flag it as `[NEEDS CLARIFICATION]` in the output rather than guessing.

## Problem clarity

- [ ] **Can I state the problem in 100-200 words** without referencing solution details?
- [ ] **Do I know who the users are**, not just abstractly but concretely (which roles, which scenarios)?
- [ ] **Do I know what success looks like**? What metric or outcome would tell us this is working?
- [ ] **Do I know what's *not* in scope**? (Non-goals are as important as goals)
- [ ] **Do I know why now**? Is there a deadline, regulatory trigger, customer commitment, or competitive pressure shaping the timeline?

## Constraints

- [ ] **Hard constraints identified**: regulatory (Ley 21.719, GDPR, etc.), contractual (must integrate with X), unmovable deadlines
- [ ] **Soft constraints identified**: team familiarity, existing tooling, hosting standardization, language preferences
- [ ] **Budget constraint known**: if cost matters, the order of magnitude is established
- [ ] **Team capacity constraint known**: who's actually going to build this, and how many of them

## Scale assumptions

- [ ] **Users / tenants in 12 months**: documented (order of magnitude is fine)
- [ ] **Data volume in 12 months**: documented
- [ ] **Request rate at peak**: documented
- [ ] **Geographic distribution**: single region, multi-region, or global?
- [ ] **Growth rate assumed**: what % per quarter is being assumed
- [ ] **Marked clearly as assumptions** so they can be challenged

## Existing systems

- [ ] **Inventory of what already exists**: don't redesign what's there unless asked
- [ ] **Reuse-before-create check**: are there components, services, or skills that already do part of this?
- [ ] **Integration points known**: what existing systems must this talk to, and how?

## Archetype classification

- [ ] **Primary archetype identified** from `references/01-solution-archetypes.md`
- [ ] **Secondary archetypes (if any) identified**
- [ ] **Critical questions for those archetypes considered** before designing

## Research validity

- [ ] **Stack assumptions validated** in the last 90 days (per `references/12-research-protocol.md`)
- [ ] **Vendor pricing validated** if cost is a factor
- [ ] **Framework versions validated** (Next.js 16 vs 16.2 may matter; LLM model strings may have changed)
- [ ] **Validated-as-of dates** ready to put on the artifacts

## Compliance scope

- [ ] **Compliance frameworks identified**: GDPR / LGPD / Ley 21.719 / SOC 2 / HIPAA / PCI / EU AI Act / others
- [ ] **Data classification understood**: what counts as PII, restricted, confidential?
- [ ] **Data residency requirements known**: must EU data stay in EU? Chilean data in Chile?
- [ ] **Audit log requirements understood**: what must be auditable, retained how long?

## AI-specific (if AI features are in scope)

- [ ] **Each AI feature has a clear purpose**: what does it do for the user?
- [ ] **Autonomy tier appropriate** for each: observe / recommend / execute-with-logging / autonomous
- [ ] **Eval strategy will be defined** before going to production
- [ ] **Cost ceiling appetite known**: how much per month is acceptable to spend on LLM calls

## Multi-tenant (if applicable)

- [ ] **Tenant model understood**: B2B agency-of-clients? B2B per-company? Consumer per-user?
- [ ] **Tier graduation path expected**: will some tenants need silo isolation eventually?
- [ ] **Tenant context propagation strategy** has a candidate (JWT, URL, both)

## Stakeholders

- [ ] **Decision-maker known**: who can approve the architecture?
- [ ] **Reviewers known**: who needs to weigh in (security, compliance, ops, finance)?
- [ ] **Affected teams known**: who will operate this, and have they been consulted?

## Risk awareness

- [ ] **Known risks listed**: what could go wrong, what's been raised by others?
- [ ] **Bias awareness**: am I gravitating to a familiar stack instead of evaluating fairly?
- [ ] **Scope creep awareness**: is this design quietly absorbing problems that should be separate?

## Output expectations

- [ ] **Artifact format known**: ADR / architecture spec / component spec / migration plan / cost estimate / mix
- [ ] **Audience known**: implementer (agent or human)? Stakeholder review? Both?
- [ ] **Detail level calibrated** to audience

---

## What to do with unchecked items

- For **gaps in problem clarity**, **constraints**, or **scale**: ask the user before proceeding. Generating against unclear inputs produces unclear outputs.
- For **research validity** gaps: run the research pass per `references/12-research-protocol.md`.
- For **stakeholder gaps**: surface in the output that the design needs review by [name / role] before final approval.
- For **AI-specific** or **compliance** gaps: load the relevant references (`04-ai-native-patterns.md`, `07-security-compliance.md`) and ask targeted questions.

If many items are unchecked: don't just guess. The skill's value is the discipline of asking. Proceeding without inputs produces designs that look good and fail in production.
