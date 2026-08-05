# Greenhouse — AI Creative Data & Rights Governance Decision V1

## Architecture Decision 2026-07-30 — Protección de datos de cliente en producción creativa generativa

- **Status:** Proposed — Legal/IP, Security, Operations, Finance y Commercial validation pending
- **Date:** 2026-07-30
- **Owner:** Creative Practice + Operations
- **Required partners:** Legal/IP + Security/Privacy + Product/Globe + Finance + Commercial + Creative Services
- **Scope:** Creative Services, AI Creative Operations, Creative Studio/Globe, image, video, audio, music, voice, likeness, copy y medios híbridos
- **Reversibility:** two-way-but-slow; provider contracts and customer commitments can create non-trivial migration cost
- **Validated as of:** 2026-07-30
- **Related skills:** `greenhouse-ai-creative-rights-governance`, `legal-privacy-ip-operator`, `greenhouse-secret-hygiene`, `greenhouse-globe`, `greenhouse-documentation-governor`
- **Related offer:** `docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md`

## Context

Enterprise clients will ask whether their prompts, briefs, unpublished campaigns, images, videos, recordings, faces,
voices, outputs and metadata are used to train models. A statement such as “the provider does not train on your data”
does not by itself answer retention, abuse logging, human access, subprocessor, region, deletion, reuse, fine-tuning,
voice-model or cross-client isolation questions.

Public provider positions show the distinction:

- OpenAI states that business/API inputs and outputs are not used to train models by default, while API abuse-monitoring
  logs may retain content for up to 30 days unless specific controls apply. See [Business Data](https://openai.com/business-data/)
  and [API data controls](https://platform.openai.com/docs/models/default-usage-policies-by-endpoint).
- Azure OpenAI states that customer data is not used to retrain models and that prompts/completions are not used to
  train foundation models without permission or instruction. See [Azure data privacy](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy).
- Google Cloud contractually restricts use of Customer Data for AI/ML training or fine-tuning without prior permission
  or instruction, but documents retention conditions for abuse monitoring, caching, grounding and session features.
  See [Service Terms](https://cloud.google.com/terms/service-terms/index-20240606) and [Vertex zero data retention](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/vertex-ai-zero-data-retention).
- ElevenLabs states that Enterprise data is not used for training by default and offers Zero Retention Mode for eligible
  products, while noting that debugging/moderation logs may still exist. See [data use](https://help.elevenlabs.io/hc/en-us/articles/29952728805393-Is-my-data-used-to-improve-ElevenLabs-AI-models)
  and [Zero Retention Mode](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode).
- Adobe states that foundational Firefly models are not trained on enterprise content under its relevant terms. See
  [Adobe enterprise GenAI terms](https://www.adobe.com/cc-shared/assets/pdf/legal/terms/enterprise/pdfs/specific-licensing-terms-for-adobe-genai-features-2025v1.pdf).

These are provider-specific commitments, not a universal property of AI generation. The current provider terms,
product, model, endpoint, plan, region and features used by a run are the evidence source.

## Decision

Efeonce adopts **Enterprise AI Data & Rights Governance** as a required control layer for client-facing generative
creative work. Efeonce will not promise that data is never technically processed by a provider; it will promise that
client data is processed only through approved provider paths, under a documented data-use posture and a contractually
scoped service.

The minimum client-facing commitment is:

> Efeonce procesa material empresarial únicamente mediante proveedores y planes aprobados. Para los proyectos que lo
> requieran, el proveedor y el contrato deben prohibir el uso de inputs, outputs, prompts, archivos, voces, imágenes,
> metadata y datos derivados del cliente para entrenar o mejorar modelos generales, con controles documentados de
> retención, acceso, subprocesadores, región y eliminación.

This commitment is valid only for the provider/model/endpoint/plan and configuration recorded in the project evidence.
It does not automatically include zero retention, zero human access, local residency, or provider indemnity.

## Non-equivalent guarantees

Never use these as synonyms:

| Claim | What it means | Evidence required |
|---|---|---|
| **No training** | Provider does not use Customer Data to train or improve general models, unless authorized | current terms/enterprise addendum + account setting |
| **No fine-tuning** | Customer material is not used to tune a model, except an explicitly scoped customer model | terms + project/model configuration |
| **Limited retention** | Inputs/outputs/logs are stored for a specified period or purpose | retention policy + endpoint settings |
| **Zero retention** | Eligible content is not retained after processing, subject to documented exceptions | provider approval/configuration + test/evidence |
| **No human review** | Provider personnel do not access content except defined legal/security exceptions | contract, abuse-monitoring posture, access policy |
| **No reuse** | Data is not used for another customer, advertising, benchmarking, or public gallery | contract + product settings |
| **Data residency** | Processing/storage is limited to a declared geography | service configuration + provider terms |
| **Customer isolation** | Tenant/project/workspace access is separated | IAM, tenancy, provider architecture, audit logs |

## Data scope

“Customer Data” must include, where applicable:

- prompts and briefs;
- reference images, video, audio, music, documents and brand materials;
- voice recordings, face/likeness inputs and synthetic voice/face models;
- generated outputs, rejected outputs, previews and derivatives;
- metadata, hashes, embeddings, captions, moderation results and audit records;
- fine-tuning files, adapters, LoRAs, custom models and evaluation datasets;
- filenames, project identifiers and contextual information that can reveal confidential work.

If a provider's terms define the scope more narrowly, Efeonce must not expand the promise silently; Legal must decide
whether the gap is acceptable, mitigated or blocking.

## Provider approval tiers

### Tier 1 — Standard Creative AI

For public, low-sensitivity or exploratory material.

- commercial plan required;
- no client confidential, unreleased, personal, biometric or regulated data;
- human review and rights review;
- provenance sufficient to identify provider and output;
- no consumer/free account for client work.

### Tier 2 — Enterprise Protected Creative AI

For confidential client work.

- enterprise/API agreement or equivalent contractual protection;
- no-training/no-improvement commitment covering the data scope;
- DPA and subprocessor review;
- workspace/project isolation;
- retention and region documented;
- provider/model/endpoint allowlist;
- access logs and deletion/offboarding evidence;
- rights pack plus AI Data Protection Pack.

### Tier 3 — Restricted / Zero Retention

For voice, likeness, trade secrets, M&A, regulated sectors, unreleased launches, biometric data or client-mandated
restricted processing.

- Tier 2 controls plus provider-approved zero or minimized retention;
- no unnecessary memory, grounding, session resumption, public gallery or history features;
- region/data-residency decision;
- customer-managed keys, private networking or client environment where available and proportionate;
- Legal/Privacy and Security approval;
- explicit deletion and incident plan;
- no use until the exact route is verified.

## Mandatory Efeonce controls

### Commercial and contract controls

- AI use is authorized in the SOW/MSA or written client approval.
- Provider, plan, model/endpoint and material restrictions are disclosed or available to the client.
- The contract separates no-training, retention, confidentiality, IP ownership, output exclusivity and indemnity.
- Client warrants rights to supplied inputs and authorizes processing for the scoped service.
- Efeonce does not guarantee “never processed”, “copyright-free”, “100% original”, “exclusive”, “no third-party claim”
  or zero retention unless the exact claim is approved and evidenced.
- Training, portfolio, public case study, provider feedback and model-improvement permissions are separate opt-ins.
- Takedown, replacement, regeneration, incident notification, evidence preservation and deletion are defined.

### Technical and operational controls

- agency-managed accounts, SSO/MFA and least-privilege access;
- approved-provider allowlist enforced by routing/configuration;
- personal accounts and free consumer endpoints prohibited for client-confidential data;
- classification before upload: public, internal, confidential, restricted/biometric;
- client/project isolation;
- secrets stored through the canonical secret path and never logged or copied into prompts;
- prompt/input/output logging minimized to the evidence needed for reproducibility and audit;
- retention timers, deletion jobs or provider deletion requests tracked;
- provider, model, endpoint, region, plan, terms version and feature flags recorded per run;
- C2PA/provenance and asset hashes preserved where available;
- provider change reopens the rights/data gate;
- security incident and provider outage fallback documented.

## Release gate

A client-facing asset cannot be `approved-commercial` unless all applicable controls have evidence. Use:

- `approved-commercial` — provider posture, contract, inputs, rights, human review and delivery evidence complete;
- `approved-with-restrictions` — permitted only under recorded provider, geography, media, term, retention or disclosure limits;
- `proof-only` — exploration, pitch or previsualization; not publishable or commercially cleared;
- `blocked` — missing consent, no-training gap, prohibited plan, unapproved region, unclear retention, failed deletion,
  missing DPA, unsupported voice/likeness, or unresolved Legal/Security issue;
- `incident-replacement` — delivered asset withdrawn or replaced after a data, rights or provider issue.

## Client evidence pack

For Tier 2/3 projects, Efeonce maintains an **AI Data Protection Pack** containing:

- provider/model/endpoint/plan and terms access date;
- no-training and no-improvement position;
- retention/logging/zero-retention configuration;
- processing and storage region;
- subprocessor and DPA status;
- customer data classification and input register;
- access and workspace isolation controls;
- deletion/return/offboarding evidence;
- synthetic voice/likeness consent where applicable;
- exceptions, incidents and owner;
- release state and client-approved scope.

Do not expose secrets, raw credentials, privileged endpoints or unnecessary prompts in this pack.

## Boundaries

- This decision does not authorize a new runtime, provider, schema, secret, cloud project, customer-facing access or
  Globe rollout.
- It does not approve any specific provider globally; approval is route/model/plan/region specific.
- It does not replace a DPA, MSA, SOW, voice release, rights clearance or legal opinion.
- It does not turn Studio Credits into a rights, privacy or data-protection commitment.
- It does not permit client-operated or self-serve generation until the corresponding runtime and commercial gates are accepted.

## Open decisions before `Accepted`

1. Legal/IP approves the client AI Data Protection Addendum and warranty/indemnity positions.
2. Security/Privacy defines Efeonce data classification, retention defaults, incident SLA and evidence retention.
3. Product/Globe maps provider route policy, C2PA/rights state and deletion evidence into the governed runtime.
4. Finance prices Tier 2/3 governance, provider pass-through, review and rights costs separately from Credits.
5. Commercial validates buyer demand, procurement language and willingness to pay without making unsupported claims.
6. Operations names owners for provider revalidation, exceptions, incidents and offboarding.

## Source pointers

- [AI Creative Rights Governance skill](../../.codex/skills/greenhouse-ai-creative-rights-governance/SKILL.md)
- [Provider vetting baseline](../../.codex/skills/greenhouse-ai-creative-rights-governance/references/provider-vetting-baseline.md)
- [Contract and consent checklist](../../.codex/skills/greenhouse-ai-creative-rights-governance/references/contract-consent-checklist.md)
- [Creative Services Offer Architecture V2](../services/creative-services/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md)
- [Creative Services Operating Model V1](../services/creative-services/EFEONCE_CREATIVE_SERVICES_OPERATING_MODEL_V1.md)
- [Creative Studio Credit Model V1](../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md)
