# Greenhouse Public AI Visibility Grader Decision V1

## Status

Accepted direction — no runtime changes yet.

This ADR authorizes architecture and planning for a public AI visibility grader governed from Greenhouse. It does not authorize implementation tasks, provider credential creation, production deployment, public launch or automated writes to HubSpot. Those require explicit follow-up tasks and operator approval.

## Date

2026-06-24

## Owner

Product / Platform Architecture / Marketing Operations / GTM

## Scope

- Public acquisition surface for Efeonce AI visibility / AEO / Surround Discovery diagnosis.
- New Greenhouse `growth` domain boundary for acquisition intelligence and pre-pipeline diagnostic motions.
- Greenhouse internal control plane for grader configuration, prompt packs, report review, lead routing, evidence and reliability.
- HubSpot handoff for contacts, companies, deals, scorecard enrichment and attribution.
- Provider integrations with answer engines / search-grounded LLM APIs.
- Future integration path with Verk for content execution and Kortex / HubSpot for CRM motion.

Out of scope for this ADR:

- Building the public UI.
- Creating formal `TASK-###` docs.
- Rotating or provisioning provider secrets.
- Enabling external writes or autonomous agent actions.
- Replacing HubSpot AEO, Verk SEO/AEO infrastructure or future Greenhouse client intelligence modules.

## Reversibility

Two-way but slow.

The decision is reversible before implementation by archiving this ADR/spec and not creating tasks. After implementation, reversing would require disabling the public surface, revoking provider credentials, preserving/deleting collected lead and report data according to retention policy, removing HubSpot properties/workflows, and migrating or archiving historical grader evidence. The public brand/SEO surface and any generated reports would create reputational inertia, so reversal is operationally slower than a normal internal feature.

## Confidence

Medium-high.

The architecture relies on existing Greenhouse patterns: API parity, server-side commands/readers, HubSpot bridge discipline, public-site control-plane posture, audit/outbox, feature flags and capability gates. Confidence is not high until provider pricing/rate limits, API terms, HubSpot property design, public legal copy and first prompt-pack evals are validated in implementation.

## Validated as of

2026-06-24.

External sources validated:

- HubSpot AEO Grader product page: `https://www.hubspot.com/aeo-grader`
- HubSpot AEO product page: `https://www.hubspot.com/products/aeo`
- HubSpot knowledge base for AEO content optimization: `https://knowledge.hubspot.com/ai/optimize-content-and-improve-brand-visibility-for-ai`
- HubSpot AEO Sensor methodology: `https://www.hubspot.com/aeo-sensor`
- OpenAI Responses API web search guide: `https://developers.openai.com/api/docs/guides/tools-web-search`
- Perplexity Sonar API quickstart: `https://docs.perplexity.ai/docs/sonar/quickstart`
- Google Gemini API grounding with Google Search: `https://ai.google.dev/gemini-api/docs/google-search`

Repo context validated:

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/context/02_gtm.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/context/14_modelo-negocio-asaas.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `.codex/skills/hubspot-greenhouse-bridge/SKILL.md`

## Context

AI answer engines are becoming a buyer discovery surface. HubSpot's public AEO Grader positions the category as a quick brand-perception diagnostic across ChatGPT, Perplexity and Gemini, with a paid ongoing monitoring product behind it. Efeonce's GTM already identifies AEO / AI visibility as a low-ticket urgent entry point and a path into SEO/content, CRM, Verk, Kortex and Greenhouse.

The product opportunity is not to clone HubSpot's grader. Greenhouse can govern a public diagnostic that connects public acquisition, HubSpot qualification, Greenhouse evidence, Verk content execution and Kortex/CRM expansion. That makes the grader a commercial intake primitive in the ASaaS flywheel, not a standalone marketing widget.

The operator decision is that the experience will be public while being administered from Greenhouse. That creates a public/private split: the public visitor submits and receives a bounded report, while Greenhouse owns prompt packs, scoring versions, provider configuration, evidence, HubSpot routing, report review, reliability and eventual client monitoring.

Because the capability uses LLM/search providers, stores public lead submissions, may analyze competitors and feeds the CRM, the architecture must decide source of truth, data retention, provider abstraction, scoring governance, security boundary, observability and rollout before implementation tasks are created.

## Decision

Greenhouse will become the control plane for a public **AI Visibility Grader** capability: a public diagnostic surface administered from Greenhouse, backed by server-side prompt execution, deterministic scoring, evidence retention, HubSpot attribution and future handoff to Verk/Kortex/Greenhouse client intelligence.

The public-facing product may use a market-legible label such as **AI Visibility Grader**. The internal/governed capability should use the broader product concept **Surround Discovery Audit**, because the durable Efeonce value is not only AEO scoring but buyer-discovery intelligence across answer engines, citations, competitors and commercial intent.

This capability establishes a new Greenhouse domain: **Growth** (`growth`, future schema `greenhouse_growth`). Growth owns acquisition intelligence and pre-pipeline diagnostic motions. `commercial` consumes qualified handoffs after Growth creates evidence, intent and CRM enrichment; it does not own the grader run, prompt packs, scoring or public report lifecycle.

The capability must be built as a governed Greenhouse domain, not as a static landing form:

- Greenhouse is source of truth for grader configuration, prompt packs, scoring versions, run lifecycle, evidence, report artifacts, internal review state and HubSpot handoff state.
- The public website is only the visitor acquisition and report delivery surface.
- HubSpot remains CRM source of truth for contacts, companies, deals, commercial owner and pipeline motion.
- Provider responses are evidence inputs, not source of truth by themselves.
- Writes to HubSpot are command-backed, idempotent, flag-gated and observable.
- Any future Nexa/agent use consumes the same readers/commands through API parity; no Nexa-specific implementation.

## Alternatives considered

### Alternative A: Use HubSpot AEO Grader directly as the lead magnet

Rejected as the primary strategy. It is fast and credible, but it sends the diagnostic experience, data capture, scoring narrative and upsell path to HubSpot instead of Efeonce. It does not create Greenhouse memory, proprietary prompt packs, evidence history or a direct bridge into Verk/Kortex/Greenhouse.

### Alternative B: Build a public standalone grader outside Greenhouse

Rejected. A standalone app would be faster initially, but it would duplicate auth, provider secrets, HubSpot integration, report storage, audit, reliability and operations. It would become another surface to reconcile instead of strengthening Greenhouse as the operating hub.

### Alternative C: Build only an internal audit tool

Rejected for V1 product direction. Internal audits are valuable, but the GTM opportunity is a public acquisition motion. The internal control plane is required, but the public diagnostic is what turns AEO into an entry product.

### Alternative D: Make Verk own the entire grader

Rejected for the public/GTM control plane. Verk is the natural execution engine for content/distribution recommendations, but Greenhouse owns cross-product client/account memory and HubSpot operational convergence. The grader should hand off execution opportunities to Verk later, not disappear inside Verk.

### Alternative E: Model this as generic SEO tooling

Rejected. Traditional SEO metrics are adjacent but not sufficient. The grader must measure answer-engine representation, competitive visibility, citation quality, entity clarity and commercial prompt coverage. SEO signals can enrich recommendations, but the category is AI visibility / Surround Discovery.

## Consequences

### Positive

- Creates a clear acquisition product aligned to the GTM entry point "AEO / Visibilidad en IA".
- Strengthens Greenhouse as control plane, not only internal portal.
- Converts public anonymous interest into governed HubSpot/Greenhouse evidence.
- Gives sales a concrete pre-pitch artifact: score, gaps, competitors, citations and next step.
- Establishes a reusable substrate for future client monitoring and Verk content recommendations.
- Produces durable historical runs that can become switching-cost data once a prospect becomes a client.

### Negative

- Adds provider cost and rate-limit management.
- Introduces AI nondeterminism into a public brand experience.
- Requires legal/privacy/disclaimer work before launch.
- Requires careful HubSpot property and lifecycle design to avoid CRM clutter.
- Creates reputational risk if a report is low-quality, wrong, offensive or overconfident.
- Requires ongoing prompt/scoring governance; stale prompt packs will rot.

### Neutral / contextual

- The grader does not guarantee AI rankings or recommendations; it samples answer-engine behavior under controlled prompts.
- Provider results will vary by model, region, freshness and prompt phrasing.
- "AEO" is useful for market comprehension, but Efeonce should preserve the wider "Surround Discovery" frame.
- The public V1 should be snapshot-first; ongoing tracking is a future paid/client capability.

## Runtime contract

Future implementation must follow these rules:

- Public submit/read endpoints are thin clients of Greenhouse server-side primitives.
- Business logic lives in the new Growth domain, under future `src/lib/growth/**` and `greenhouse_growth` storage.
- Capability keys, reliability signals and events use the `growth.*` namespace unless a future ADR supersedes this boundary.
- Provider adapters are server-only and never called from the browser.
- Every run stores prompt version, provider, model, timestamp, raw evidence pointer, normalized extraction, score version, report version and reliability outcome.
- Scoring is deterministic after normalization. LLMs may generate/extract evidence, but the score itself must be versioned and reproducible.
- HubSpot writes happen through a governed command with idempotency key and flag gates.
- Free public reports are bounded and safe to send automatically only after a quality threshold. Deep reports and sensitive recommendations can be internal-review-gated.
- Public copy must avoid guarantees and state that results are an AI-assisted sampled diagnostic.
- Competitor analysis is allowed, but output must avoid defamatory language and preserve evidence citations.
- Provider failures degrade honestly: partial reports, retry windows or "analysis unavailable", never fabricated scores.
- Future client monitoring reads the same run/evidence model; it must not fork into a second grader.

## Data posture

Data collected by the public grader is classified at least as `confidential` because it includes contact identity, company, website, self-described product/service and commercial intent.

Provider responses and citations are evidence artifacts. They may include third-party text snippets and competitor names, so retention and display must be bounded.

The V1 must define:

- retention for raw provider responses;
- retention for normalized report data;
- delete/export posture for contacts that request removal;
- whether public reports are accessible by token, authenticated link or email delivery;
- which fields are safe to sync to HubSpot;
- which fields stay Greenhouse-only.

## AI autonomy posture

V1 autonomy tier: **observe-only + recommend-with-approval**.

- Public diagnostic runs may automatically observe, classify, score and recommend.
- The system may automatically write bounded lead metadata to HubSpot only through a deterministic command and with explicit consent/notice.
- The system must not automatically publish content, change websites, send sales emails, update competitor claims or trigger paid campaigns.
- Future "generate content plan" or "create Verk brief" workflows require `propose -> confirm -> execute`.

## Revisit when

Reopen this ADR if:

- Provider APIs materially change availability, pricing, citation behavior or terms.
- HubSpot launches a partner-facing AEO API that makes direct integration preferable.
- Verk becomes the primary runtime for public acquisition surfaces and Greenhouse only needs to observe.
- Legal/privacy review determines public competitor scoring cannot be shown safely.
- The first 50 real runs show the score is not predictive of sales conversations or buyer intent.
- AI Search / AEO market terminology shifts enough that public naming should change.

## Related documents

- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/context/02_gtm.md`
- `docs/context/03_ecosistema-producto.md`
- `docs/context/11_hubspot-bowtie.md`
- `docs/context/14_modelo-negocio-asaas.md`
