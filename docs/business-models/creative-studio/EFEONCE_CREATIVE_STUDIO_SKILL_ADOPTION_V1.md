# Efeonce Creative Studio — Skill Adoption Matrix V1

> **Status:** Implemented — validation evidence attached to this change
> **Owner:** Efeonce Strategy + Creative Operations + Skill Governance
> **Version:** 1.0
> **Date:** 2026-07-19
> **Business model:** [Creative Studio Business Model V1](EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
> **Credit model:** [Studio Credit Model V1](EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md)
> **Architecture decision:** [ADR](../../architecture/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_DECISION_V1.md)

## 1. Purpose

This document records how the first formal business model in the repository is adopted by the skills that
sell, scope, produce, price, contract, benchmark, staff and govern Creative Studio work. It is a coverage and
anti-drift artifact; it is not a new source of pricing or credit equivalence.

Precedence is:

```text
Business Model V1
  → Studio Credit Model V1
  → architecture decision and platform contract
  → domain skills and templates
  → client proposal/SOW/quote
```

If a skill conflicts with the business or credit model, the canonical model wins and the skill must be
corrected. No skill may independently make the model `Commercially approved`.

## 2. Shared contract adopted by every affected skill

All affected skills preserve these invariants:

1. Three independent axes: delivery model, engagement form, and operating mode per run.
2. Managed Squad, Staff Augmentation and Studio Access are delivery models; `efeonce-managed`,
   `co-operated` and `client-operated` are not synonyms for them.
3. Hybrid delivery is declared by lanes with an owner and accountability for each lane.
4. Five economic lines remain separate: governance/platform, human capacity, Studio Credits,
   implementation/IP, and rights/licenses/pass-through.
5. A Studio Credit measures a governed generative operation, not a piece, hour, currency, provider token,
   API call, license, FTE or final asset.
6. Deterministic planning, layout, editing, copy, curation, QA, mix/master, export and reuse consume zero
   Studio Credits but still have real cost financed outside the wallet.
7. Spend follows an append-only lifecycle: allocation, estimate, reservation, approval, execution,
   settlement, release or refund adjustment.
8. Provider/platform/Efeonce technical failures do not create a silent second charge. A valid output followed
   by a changed creative direction requires a new estimate, branch or change order.
9. Rights, stock, music, talent, likeness, voice, territory, exclusivity and buyouts remain separate.
10. Public prices, money-to-credit equivalence, top-ups, rollover, expiration, checkout and the public name
    `Globe Credits` remain blocked until the canonical Finance/Legal/Commercial gates are met.

## 3. Skills updated

| Family | Skill | Adoption responsibility | Main artifacts |
| --- | --- | --- | --- |
| Commercial doctrine | `creative-practice` | Owns the operational translation into discovery, offer, pricing, SOW, approvals, examples and anti-patterns | `modules/14_STUDIO_CREDITS.md`, offer/pricing/SOW modules, proposal/rate-card/SOW templates, glossary and overlay |
| Agency doctrine | `efeonce-agency` | Routes Creative Studio questions to the canonical model and prevents parallel business doctrine | `SKILL.md` |
| Visual direction | `design-studio` | Maps visual operations, deterministic finishing, delivery/accountability and piece examples | production modules, key-visual brief and delivery/tooling references |
| Image runtime | `greenhouse-ai-image-generator` | Enforces that generation is ledger-governed while deterministic handling and provider cost remain separate | `SKILL.md` |
| Social production | `social-media-studio` | Separates content unit from generative operations, platform work and UGC/creator rights | AI/production module, client delivery/tooling and social/UGC briefs |
| Editorial production | `content-marketing-studio` | Applies credits only to generative atoms inside a larger editorial pipeline | ops, repurposing and AI modules, content brief and visual-system reference |
| Copy craft | `copywriting` | Prevents copy/revisions from being mislabeled as credit consumption and governs claims about credits | AI-assisted copy module and `SKILL.md` |
| Deck production | `deck-studio` | Keeps deterministic slide composition/export at zero credits and prices generative media separately | `SKILL.md`, `composition.md` |
| Campaign/channel orchestration | `digital-marketing` | Separates media spend/activation from Studio Credits, records it as fifth-line pass-through, routes variant factories to operation maps and keeps creator/whitelisting rights outside the wallet | creative/video module, creative brief and router |
| Motion/video | `motion-design-studio` | Defines motion capability accounting, reel/spot/cutdown examples, modes and failure accountability | `modules/13_STUDIO_CREDITS_AND_ACCOUNTABILITY.md`, Spot Studio, briefs, delivery/tooling and antipatterns |
| Audio | `audio-studio` | Defines VO/music/SFX/lip-sync boundaries, consent/rights and deterministic mix/master | `modules/11_STUDIO_CREDITS_AND_RIGHTS.md`, AI audio modules, briefs, delivery/tooling and antipatterns |
| Deterministic renderer | `hyperframes` | Keeps authoring/render/transcode/captions outside the wallet and routes TTS/generative assets to the ledger owner | `references/studio-credits.md`, TTS reference and `SKILL.md` |
| Renderer CLI | `hyperframes-cli` | Prevents the CLI from inventing rates or settling credits | `SKILL.md` |
| Renderer registry | `hyperframes-registry` | Prevents template metadata from becoming a price table or ledger | `SKILL.md` |
| Finance | `greenhouse-finance-accounting-operator` | Owns cost, margin, recognition, breakage, ledger controls and approval of economic equivalence | `SKILL.md` Creative Studio finance boundary |
| Legal/IP | `legal-privacy-ip-operator` | Owns the Studio schedule, rights separation, provider terms, releases and jurisdictional validation | commercial-contract and AI-content-IP modules plus router |
| Talent/workforce | `greenhouse-talent-people-operator` | Owns Managed Squad and Staff Augmentation human shape without confusing them with operating modes | client squad reference and squad blueprint |
| Tenders | `greenhouse-public-private-tenders` | Converts RFP units into the five-line internal economic model while preserving the buyer-required format | bid playbook, pricing companion and router |
| GTM | `gtm-architect` | Owns segment, positioning, packaging, motion and staged launch without redefining credits | offer/packaging/pricing module and router |
| Research | `research-benchmark-operator` | Normalizes competitor credits through a reproducible basket instead of comparing nominal units | benchmark-design module and router |

The same domain content is maintained under `.codex/skills/` and `.claude/skills/`. Runtime-specific
frontmatter may differ where the loader contracts differ; business rules and domain artifacts must not drift.

## 4. Audited without a model-specific change

| Skill/domain | Decision | Reason |
| --- | --- | --- |
| `growth-marketing-cro` | No change | Owns experimentation and conversion; it may measure creative outcomes but does not define production credits. |
| HubSpot skills | No change | Existing “credits” refer to HubSpot product entitlements. Adding Studio Credits would create an ambiguous second wallet before a CRM schema/ADR exists. |
| `greenhouse-ai-design-studio` | No change | Owns Greenhouse product UI direction, not client-facing creative production or its business model. |
| `efeonce-public-site-wordpress` | No change | Public pricing and checkout are explicitly blocked; no public-site enablement is authorized yet. |
| `greenhouse-task-planner` | No change | Plans implementation work; it does not own commercial doctrine. A runtime implementation will require its own task/ADR. |
| `greenhouse-documentation-governor` | No change | The business-model taxonomy and router were already established by the parent change; this adoption follows that contract. |
| SEO/AEO, Nexa, Notion and analytics operators | No change | They may consume or measure outputs but do not estimate, reserve, settle or contract Studio Credits. Add a bridge only when a governed runtime integration exists. |

## 5. Validation contract

The adoption is complete only when all of the following pass:

- every affected Codex skill passes the repository `skill-creator` validator;
- Markdown patches pass `git diff --check`;
- modified Codex/Claude domain artifacts contain the same business rules;
- canonical links resolve;
- no affected file defines a public currency equivalence or silently includes rights;
- `pnpm ops:lint --changed`, `pnpm docs:closure-check`, and `pnpm docs:context-check:strict` pass or any
  unrelated/pre-existing failure is explicitly identified;
- an adversarial readback finds no contradiction against the Business Model, Credit Model or ADR.

## 6. Evidence from the 2026-07-19 adoption run

| Check | Result |
| --- | --- |
| Codex `quick_validate.py` across the 20 affected skills | PASS |
| `git diff --check` across affected skills/docs | PASS |
| Relative-link verification across modified/new skill Markdown | PASS |
| `pnpm ops:lint --changed` | PASS — 0 errors, 0 warnings |
| `pnpm docs:closure-check` | PASS — 0 warnings |
| Adversarial readback against Business Model, Credit Model and ADR | PASS after correcting Finance cost/margin, rights, governance/capacity, media pass-through and missing Digital Marketing routing |
| `pnpm docs:context-check:strict` | Blocked by the shared checkout having 61 active changelog entries against the pre-existing limit of 60; this adoption extended an existing entry and did not create entry 61. Rotation was not run over concurrent work. |

Claude mirrors retain runtime-specific frontmatter where applicable; their domain rules and new operating
artifacts were reconciled with Codex. The generic Codex validator is asserted only for `.codex/skills/`.

## 7. Explicitly unresolved

This adoption does not decide:

- the public price of a Studio Credit;
- initial pools, top-up packs, rollover, expiration or overage;
- self-service checkout or external wallet enablement;
- tax/revenue-recognition treatment by jurisdiction;
- the public name `Globe Credits`;
- capability rates before shadow calibration;
- the runtime ledger, entitlements, commands, tables, projections or customer UI.

Those decisions require observed shadow-ledger data and the approvals named in the canonical models.
