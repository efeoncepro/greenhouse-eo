# Enterprise AI Creative Rights Framework

Use this as the working schema for a campaign, asset family, or governed production run. It is an operational framework, not a legal opinion.

## Asset record

| Field | Required value |
|---|---|
| `asset_id` | Stable asset/revision identifier |
| `client` | Contracting customer |
| `campaign` | SOW/campaign reference |
| `modality` | image, video, audio, music, voice, likeness, copy, hybrid |
| `lane` | A assisted, B AI-produced/human-directed, C synthetic identity, D rights-sensitive |
| `provider_id` | Exact provider identity |
| `plan` | Exact paid/enterprise plan |
| `model_id` | Exact model identity, not display label or family |
| `model_version` | Exact immutable model version |
| `endpoint_route` | Exact endpoint/route used |
| `provider_terms_ref` | Durable reviewed terms evidence without secrets or signed query parameters |
| `provider_terms_digest` | SHA-256 digest of the exact reviewed terms evidence |
| `commercial_rights_attestation` | Human reviewer, signed grant, restrictions, timestamp, and attestation ID |
| `applied_policy_snapshot` | Immutable policy ID/version/digest and route snapshot applied at generation |
| `input_register` | IDs and permission references |
| `human_contribution` | Direction, selection, arrangement, edits, finishing |
| `consent_register` | Talent/voice/face/likeness permissions |
| `use_scope` | Territory, term, media, paid/organic, derivative, exclusivity |
| `disclosure` | Public label or rationale for no label |
| `evidence` | Run IDs, revisions, hashes, approvals, provenance |
| `release_state` | approved-commercial, approved-with-restrictions, proof-only, blocked, incident-replacement |
| `owner` | Person accountable for next action |

## Rights matrix

| Layer | Question | Evidence | Default if missing |
|---|---|---|---|
| Input copyright | Can we upload, transform, and publish it? | licence/release/client warranty | Block final use |
| Output permission | Does the provider allow this use? | current official terms + plan | Proof-only |
| Human authorship | What did people author or materially edit? | creative log, source files, edit record | Do not promise exclusive copyright |
| Voice/likeness | Did the person consent to this synthetic use? | specific release | Block |
| Music | Are composition, master, performance, samples, and sync covered? | music licence/split sheet/release | Block publication |
| Brand/trademark | Could it imply endorsement or reproduce protected identity? | clearance/approval | Legal review |
| Privacy | Is personal/confidential/biometric data handled lawfully? | DPA, consent, provider controls | Block upload |
| Disclosure | Must the audience be told it is synthetic/manipulated? | jurisdiction/channel assessment | Escalate |
| Indemnity | Who responds to a third-party claim? | provider + agency + client contract | Cap promise and escalate |

## State transition

`intake → classified → inputs-cleared → exact-provider-cleared → human-attested → client-authorized → route-available → produced-with-policy-snapshot → human-reviewed → asset-rights-reviewed → approved/restricted/proof-only/blocked → delivered → archived`

`route-available` is promotion, not delivery. It grants no asset-level approval. Every candidate must retain its
generation-time route and policy snapshot and pass human review plus an explicit delivery decision.

An asset can move backward at any point. Provider term changes, a changed terms digest, new territory, new media,
a new voice, a material edit, or a new model version reopens the gate. Preserve prior attestations and applied
asset policies as immutable history; corrections create a new version, evidence record, or asset revision.

## Safe evidence boundary

Rights and delivery evidence may contain allowlisted identifiers, digests, bounded metadata, canonical reason/error
codes, approval identity, and timestamps. It must not contain credentials, bearer material, signed URLs, raw
provider payloads, prompts, client content, stack traces, internal paths, or uncontrolled upstream error prose.

## Risk thresholds

Immediate Legal escalation:

- named person, public figure, employee, customer, child, or deceased person;
- voice clone, face clone, avatar, digital replica, or impersonation;
- political, health, financial, employment, safety, or public-interest content;
- use in the EU or another market with synthetic-content disclosure rules;
- client request for exclusivity, full indemnity, copyright warranty, or model training;
- output resembles a known campaign, character, artist, recording, logo, or product;
- provider terms are silent, contradictory, beta-only, or change after generation.

## Commercial separation

Keep these lines separate in an SOW, estimate, and internal ledger:

- human capacity and creative direction;
- platform/governance/access;
- generative consumption or Studio Credits;
- implementation and reusable IP;
- rights, talent, music, stock, licensing, and pass-through costs.

Studio Credits represent governed generative consumption. They are not pieces, hours, currency, provider tokens, or rights.
