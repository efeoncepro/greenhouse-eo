---
name: greenhouse-ai-creative-rights-governance
description: Govern rights, consent, provenance, tool eligibility, contracts, indemnity, disclosure, and enterprise delivery for AI-assisted or AI-generated creative work across image, video, audio, music, voice, likeness, copy, and mixed media. Use when an agency, Creative Services team, Creative Studio/Globe workflow, proposal, SOW, client delivery, vendor review, or internal policy touches generative AI or synthetic media.
---

# AI Creative Rights & Enterprise Governance

This skill is the rights-and-governance gate for Efeonce creative production with generative AI. It makes a client deliverable defensible and traceable; it does not replace Legal, Finance, Creative direction, provider terms, or the canonical Creative Studio runtime contracts.

## Operating principle

Treat every deliverable as five linked layers:

1. **Inputs** — client materials, references, prompts, datasets, voices, faces, music, logos, personal data.
2. **Tool permissions** — plan, model, endpoint, beta status, commercial use, retention, training, export, indemnity.
3. **Human contribution** — brief, art direction, selection, arrangement, editing, compositing, performance, finishing.
4. **Rights and restrictions** — copyright, related rights, trademark, privacy, publicity/likeness, music, consent, territory, term, channels, exclusivity.
5. **Delivery and evidence** — provenance, approvals, disclosure, licence schedule, incident fallback, offboarding.

Never collapse “commercially usable”, “owned by the customer”, “copyrightable”, “exclusive”, and “indemnified”. They are different assertions and each needs evidence.

This skill does not give a definitive legal opinion. For a disputed claim, high-value campaign, synthetic identity, regulated sector, or unfamiliar jurisdiction, escalate to `legal-privacy-ip-operator` and qualified counsel.

## Mandatory first reads and routing

Read `AGENTS.md`, `project_context.md`, `Handoff.md`, and the applicable task/spec. Then route only the domains involved:

- **Creative production:** `creative-practice`, `design-studio`, `motion-design-studio`, `audio-studio`, `greenhouse-ai-image-generator`.
- **Creative Studio / Globe:** `greenhouse-globe`; read the live fleet/runtime handoff and Creative Studio business/credit model. Globe is a commercial Efeonce product; rollout stage must not be confused with product nature.
- **Contracts, privacy, IP, likeness, consent:** `legal-privacy-ip-operator`.
- **Commercial offer, pricing, customer model, procurement:** `efeonce-business-model-operator`, `efeonce-customer-model-operator`, `efeonce-pricing-operator`, `efeonce-agency`.
- **Tenders and proposals:** `greenhouse-public-private-tenders`, `deck-studio`.
- **Copy, disclosure, claims, accessibility:** `greenhouse-ux-content-accessibility`, `copywriting`, `seo-aeo` when search/public-information claims are involved.
- **Secrets and client-confidential inputs:** `greenhouse-secret-hygiene`.
- **QA and closure:** `greenhouse-qa-release-auditor`, then `greenhouse-documentation-governor`.

Use canonical docs already owning the surrounding contracts; do not create a second rights ledger, credit model, or Globe governance model. Relevant anchors include:

- `docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md`
- `docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OPERATING_MODEL_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`
- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`

## Workflow: intake → classify → clear → produce → verify → deliver → close

### 1. Intake and scope

Capture client, campaign, markets, audience, sector, intended channels, paid media, duration, territory, exclusivity; modality; whether the client permits AI; provider restrictions; enterprise-tenancy requirements; disclosure; and whether the work is production, internal exploration, previsualization, pitch-only, or proof-only.

If the client has not authorized generative AI for a production deliverable, stop at concept/previsualization or obtain written approval. Do not infer consent from a general creative-services agreement.

### 2. Classify the asset and risk

Assign one or more lanes:

- **A — AI-assisted:** ideation, cleanup, transcription, variation, editing, or finishing; human-authored expression remains dominant.
- **B — AI-produced / human-directed:** AI creates substantial material; Efeonce provides direction, selection, composition, editing and QA.
- **C — synthetic identity:** voice clone, face/likeness, avatar, impersonation, digital replica, named-person simulation, or realistic human performance.
- **D — rights-sensitive source:** confidential data, licensed music, stock, recognizable character, trademark, living artist/style imitation, third-party model, or unclear chain of title.

C or D requires a rights review before generation. A and B still require tool, input, output, and delivery checks.

### 3. Clear inputs before generation

For every input, identify rights owner, permission, purpose, scope, and expiry. Confirm:

- the client permits upload, transformation, and publication through the selected provider;
- a human voice or face has a specific release for synthetic generation;
- music has composition, master, performer, and synchronization permissions where applicable;
- stock, fonts, footage, logos, locations, products, trademarks, and characters permit intended commercial use;
- personal or confidential information has an approved processing path and is not uploaded to a consumer/free endpoint;
- no prompt asks a model to reproduce a specific protected work, campaign, person, or living artist without legal basis.

If provenance is missing, mark the input `rights_unverified`; do not silently upgrade it to approved.

### 4. Vet the tool and plan

Create or update a dated provider record before production. Check current official terms, not a remembered summary:

- commercial use, plan eligibility, and beta restrictions;
- ownership or assignment language and its “to the extent permitted by law” qualifier;
- output similarity/non-exclusivity;
- input/output retention and training/improvement rights;
- public-sharing defaults;
- voice/likeness/model-library rules;
- enterprise data controls, DPA, sub-processors, region, deletion, and offboarding;
- indemnity scope and exclusions, especially modifications, client inputs, trademark, publicity, music, third-party models, and known infringement;
- export, metadata, C2PA/content credentials, and reproducibility.

Free, beta, public-gallery, research-only, or unclear-license tooling is not approved for final enterprise delivery unless Legal explicitly accepts the exception. Keep provider facts in the provider matrix, not in a sales promise.

### Data protection posture

Treat these as separate controls and record each one independently:

- **No training/no improvement:** provider terms prohibit use of Customer Data for general model training or improvement unless explicitly authorized.
- **No fine-tuning:** client data is not used to tune a provider or shared model, except an explicitly scoped customer model.
- **Retention:** prompts, files, outputs, metadata, abuse logs, caches, histories and session state have a documented TTL or deletion path.
- **Zero retention:** only claim this when the exact provider/model/endpoint/configuration is eligible and evidence exists; abuse, moderation, legal and security exceptions must be recorded.
- **No human access:** only claim this when the contract and provider posture cover operational, moderation and abuse-review paths.
- **Isolation:** workspace/project/tenant and access controls prevent cross-client exposure.
- **Residency:** processing and storage geography are recorded; “cloud region” does not automatically mean all subprocessors stay there.

The client-facing promise is bounded by the exact provider route and plan. “No training” does not mean “never processed”, “never logged”, “never accessed”, “zero retention” or “no third-party subprocessors”. Read [the canonical data governance decision](../../../docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md) for tiers, evidence and open gates.

### 5. Contract and consent gate

Before production, ensure the SOW/MSA or written approval addresses:

- permission to use generative AI and named or category-level tools;
- ownership/assignment of rights that Efeonce actually holds;
- licence to non-exclusive or non-copyrightable AI material;
- client warranties for supplied inputs;
- Efeonce standard of care for tool selection, human review, and rights evidence;
- provider restrictions and pass-through protections;
- territory, term, media, paid usage, derivative works, adaptation, localization, exclusivity, and archive rights;
- voice, face, likeness, avatar and performer terms;
- disclosure and labeling;
- takedown, replacement, re-generation, and incident handling;
- indemnity allocation and liability caps approved by Legal;
- portfolio, case-study, training, and model-improvement permissions;
- retention, deletion, return, and offboarding of client material and provenance records.

Do not promise “100% original”, “exclusive copyright”, “no third-party claim”, or “copyright-free” unless Legal has approved the exact claim and its evidence.

### 6. Production controls

Use agency-managed accounts, approved plans, least-privilege access, and client-safe workspaces. Do not use personal accounts for client material. Preserve the minimum evidence needed to reproduce or explain the work:

- provider, plan, model/endpoint, version/date;
- input asset IDs and permission references;
- prompt or direction record when material to the result;
- generation/revision IDs where available;
- human contributors and meaningful creative interventions;
- edits, compositing, sound design, color, typography, and finishing;
- rejected outputs when relevant to an incident or dispute;
- reviewers, approvals, and final hash/export.

For Globe, follow the runtime’s durable governance, C2PA, rights state, retrieval, and asset identity contracts. Do not infer rights from appearance, filename, or UI badge.

### 7. Modality-specific review

**Image:** faces, trademarks, characters, product appearance, stock/reference rights, style imitation, text/logo accuracy, commercial-safe model status.

**Video:** every image/audio layer, actor/likeness, location, music/sync, editorial manipulation, deepfake disclosure, broadcast/platform specs.

**Audio/music:** lyrics, composition, master, performance, producer, samples, sound effects, voice model, sync, neighboring rights, collecting-society implications.

**Voice/likeness/avatar:** identity, informed consent, permitted script/use, markets, duration, synthetic model retention, reuse/training, withdrawal, compensation, and disclosure. Treat voice and facial features as sensitive/biometric data where applicable.

**Copy:** factual substantiation, claims, regulated advertising, human editorial responsibility, third-party text, and public-interest disclosure.

### 8. Verify and assign a release state

Every final asset receives exactly one state:

- `approved-commercial` — rights, provider, input, human review, contract, and delivery evidence complete;
- `approved-with-restrictions` — usable only under recorded territory, term, channel, provider, or disclosure limits;
- `proof-only` — concept, pitch, previsualization, or unresolved rights; never publish or sell as cleared;
- `blocked` — missing consent, prohibited plan, unclear input, high-risk identity, unresolved claim, or failed QA;
- `incident-replacement` — previously delivered asset withdrawn or replaced after a rights concern.

The release state is not a copyright opinion. It is an operational permission state backed by evidence.

### 9. Deliver an enterprise rights pack

For each campaign or asset family, deliver or archive:

- rights/provenance summary;
- provider and plan record;
- input permission register;
- voice/likeness releases, if applicable;
- human contribution and finishing note;
- permitted-use matrix: territory × term × channel × paid/organic × exclusivity;
- restrictions, attribution, disclosure, and provider limitations;
- approval record and final asset identifiers;
- replacement/takedown contact and retention period.

Separate third-party pass-throughs from Creative Studio Credits. Rights, talent, music, stock, media, and licences are not credit units.

## Enterprise decision rules

- **No rights evidence, no final delivery.** Escalate or mark `proof-only`.
- **No client consent, no production use of GenAI.** Exploration is not publication.
- **No commercial plan, no commercial use.** Paid does not automatically mean enterprise-safe.
- **No human review, no client-facing release.** Human review must be substantive.
- **No blanket exclusivity.** State what is exclusive, what is licensed, and what may be similar for others.
- **No voice/face clone without a dedicated release.** A generic talent release is insufficient.
- **No unbounded indemnity.** Match the agency promise to provider protection and contract exclusions.
- **No silent provider substitution.** A model or endpoint change can change rights, retention, output behavior, or indemnity.
- **No hidden training permission.** Client confidentiality and provider improvement rights must be explicit.
- **No credit laundering.** Provider spend and rights costs remain distinct from Studio Credits and human capacity.

## Synergy contracts with other skills

This skill is the router and gate, not the executor of every domain:

| Need | Delegate to | Return evidence |
|---|---|---|
| Legal interpretation, contract clause, privacy, consent, jurisdiction | `legal-privacy-ip-operator` | approved position, clause, escalation or block |
| Creative concept, craft, image/video/audio production | `creative-practice`, `design-studio`, `motion-design-studio`, `audio-studio` | creative brief, asset family, human contribution |
| Globe/Creative Studio governed run | `greenhouse-globe` | run/revision IDs, asset governance state, C2PA/rights evidence |
| Provider/model selection and image execution | `greenhouse-ai-image-generator`, `design-studio` | provider record, operation evidence, output IDs |
| Offer, SOW, packaging, customer buying group | `efeonce-agency`, `efeonce-business-model-operator`, `efeonce-customer-model-operator`, `efeonce-pricing-operator` | commercial scope, price separation, buyer approvals |
| Tender/proposal/deck | `greenhouse-public-private-tenders`, `deck-studio` | compliant claims, rights assumptions, evidence pack |
| Copy, claims, disclosure, accessibility | `copywriting`, `greenhouse-ux-content-accessibility`, `seo-aeo` | approved copy and disclosure language |
| Secrets/confidential inputs | `greenhouse-secret-hygiene` | safe account/data path; never secret values |
| QA, closure, documentation, handoff | `greenhouse-qa-release-auditor`, `greenhouse-documentation-governor` | gates, canonical docs, honest status |

When another skill returns a conflicting claim, prefer the current contract, provider terms, runtime evidence, and Legal decision over a generic skill heuristic.

## Output formats

For a diagnostic, return: scope/jurisdiction; asset/modality/risk; input gaps; provider/plan gaps; consent/privacy gaps; contract/indemnity position; required evidence; release state and blocker owner; next executable step.

For a proposal or enterprise offer, return: client-facing promise; assumptions/exclusions; rights/provenance model; tool/plan assumptions; disclosure; deliverables and rights pack; fallback/replacement; and commercial lines separating human capacity, platform/governance, generative consumption, implementation/IP, and rights/licences.

For a final delivery, never report only “ready”. Report release state, evidence location, restrictions, unresolved risks, and handoff owner.

## Reference material

Read only what the request needs:

- [Enterprise rights framework](references/enterprise-rights-framework.md) for matrices, gates, and evidence fields.
- [Provider vetting baseline](references/provider-vetting-baseline.md) for dated examples and revalidation rules.
- [Contract and consent checklist](references/contract-consent-checklist.md) for SOW, MSA, talent, voice, likeness, and incident clauses.
