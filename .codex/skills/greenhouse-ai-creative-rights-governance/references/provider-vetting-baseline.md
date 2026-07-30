# Provider Vetting Baseline

This baseline records public examples checked on 2026-07-30. Re-check official terms at intake, before production, and when a provider changes model, plan, endpoint, or policy. These examples are not approvals by themselves.

## Observed patterns

| Provider/example | Observed public position | Operational implication |
|---|---|---|
| OpenAI | User retains input rights and owns provider interest in output to the extent permitted; similar outputs may reach other users; user is responsible for inputs. | Do not promise uniqueness; retain input clearance and human-authorship evidence. |
| ElevenLabs | Free use is non-commercial; paid plans permit commercial use subject to terms; voice/content permissions remain the user’s responsibility. | Use paid/approved plan; obtain voice authorization; check beta/model-specific restrictions. |
| Suno | Pro/Premier assigns Suno-owned rights in eligible output generated during paid subscription; free/basic output is personal/non-commercial; no copyright guarantee. | Record subscription timing; do not use free output in client work; separate commercial use from copyright. |
| Runway | Does not claim ownership of inputs/outputs and does not restrict commercial output use subject to terms; may use inputs/outputs to improve services. | Check confidentiality, training, public sharing, and client restrictions before upload. |
| Midjourney | User owns assets to the fullest extent allowed; companies above the stated revenue threshold need Pro or Mega; ownership remains subject to third-party rights. | Confirm company plan and do not treat platform ownership language as clearance or exclusivity. |
| Adobe Firefly/AI Studio | Some Adobe outputs are positioned as commercially safe; partner-model output requires model-specific review; enterprise terms can address data/training and indemnity. | Prefer eligible commercial-safe paths for risk-sensitive enterprise work; record endpoint/model. |
| Magnific Enterprise | Public enterprise material describes output ownership and indemnity under its MSA, with conditions and exclusions. | Enterprise indemnity is a negotiated provider contract, not a default property of generative AI. |

## Required source checks

Read the provider’s current official:

- terms of use/service;
- product-specific and model-specific terms;
- commercial-use/plan page;
- privacy, retention, training, and DPA documentation;
- indemnity/copyright-shield language;
- voice/likeness/library addenda;
- beta and public-sharing rules.

Save the URL, access date, plan, relevant section, and a short interpretation in the provider record. Never paste confidential client content into a research prompt merely to test a tool.

## Data-protection checklist

For every provider/model/endpoint/plan, record these as distinct values:

| Control | Question |
|---|---|
| No training | Are inputs, outputs, files, voices, images, metadata and derived data excluded from general training/improvement? |
| No fine-tuning | Can the provider or a subprocessor tune a shared or provider model with customer data? |
| Retention | What is retained, for what purpose, where, by whom and for how long? |
| Zero retention | Is it available for this exact route, modality and account, and what exceptions remain? |
| Human access | Can abuse, moderation, support or engineering personnel access content? |
| Subprocessors | Which entities receive or process customer data, and under what terms? |
| Region | Where are data at rest and in processing, including global/batch/grounding routes? |
| Isolation | What tenant, project, workspace, IAM and encryption boundaries apply? |
| Deletion | Can Efeonce request and evidence deletion of inputs, outputs, caches and custom models? |
| Change control | How are model, endpoint, terms, region and subprocessor changes notified? |

Do not mark a provider “enterprise-safe” from a single marketing sentence. A provider may prohibit training while
still retaining prompts for abuse monitoring, caching outputs, exposing data to subprocessors or allowing a feature
to persist session state. Those are separate restrictions that belong in the project evidence and client promise.

## Industry pattern sources

- [Dentsu client cross-service terms](https://www.dentsu.com/us/en/our_policies/client_cross_service_line_master_services_terms) — written client authorization, tool terms, client input licence, risk allocation.
- [Ad Legends terms](https://www.adlegends.ai/terms) — tool is not a clearance house; client consent; pass-through provider protection.
- [AAAA agency policy template](https://www.aaaa.org/wp-content/uploads/Agency-Policy-Template-for-Generative-AI.pdf) — internal policy, human review, contracts, and non-automatic copyright assumptions.
- [IPA agency guidance](https://ipa.co.uk/membership/member-services/advice-support/legal/ai) — checklist, client clauses, indemnity, policy, and production training.
- [ANA AI rider announcement](https://www.ana.net/miccontent/show/id/pulse-2025-06-gen-ai-use-in-ad-contracts) — client-side advertising contract rider approach.

## Jurisdiction watch

For Chile, use the current text of Ley 17.336 for copyright, moral rights, authorizations, and transfer; use Ley 21.719’s dated entry into force and biometric provisions for future personal-data compliance. For EU-facing work, check AI Act transparency obligations for synthetic audio, image, video, deepfakes, and public-interest text. These are routing signals, not substitutes for local counsel.
