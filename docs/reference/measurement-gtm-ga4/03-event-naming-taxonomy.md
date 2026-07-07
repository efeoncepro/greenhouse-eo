# Analytics Event Naming Taxonomy & Tracking-Plan Governance — Engineering Reference

> **Type:** Durable engineering reference (2024–2026 best practice)
> **Scope:** How to name analytics events and parameters, and how to govern the tracking plan so it doesn't rot.
> **Grounding sources:** Segment/Twilio, Google (GA4), Amplitude, Mixpanel, Avo, plus CXL-aligned taxonomy guidance. Full URLs in **Sources**.

---

## 0. TL;DR house rules (read this first)

| Rule | Ruling | Why |
|---|---|---|
| **Structure** | `object` + `action`, past tense | Industry-standard, self-describing, sorts/groups by object |
| **Casing** | `snake_case` for events **and** parameters | Warehouse-safe, GA4-required, case-collision-proof |
| **Prefix** | product namespace prefix (e.g. `gh_`) | Avoids collision with vendor auto-events + other data sources |
| **Explosion control** | few generic events, many parameters | One `cta_clicked` + `cta_location`, not 50 event names |
| **Payload** | strict parameter allowlist, **no PII, no raw values** | Privacy-by-design, schema stability |
| **Governance** | tracking plan = source of truth, reviewed before ship, versioned | Prevents drift, one canonical name per behavior |

The Greenhouse `gh_form_*` convention already satisfies all six. Section 7 evaluates it and extends it to CTAs and other surfaces.

---

## 1. The Object–Action framework & casing

### 1.1 What it is

The dominant convention, developed by Segment's success team across thousands of implementations and independently adopted by Amplitude and Mixpanel: name an event as **the object being acted on + the action performed on it, in the past tense.**

```
Object          Action (past tense)      Event
──────          ───────────────────      ─────
Product         Viewed                   Product Viewed  /  product_viewed
Signup          Completed                Signup Completed / signup_completed
Order           Completed                Order Completed  / order_completed
Cart            Viewed                   Cart Viewed      / cart_viewed
```

- **Object first, action second, action in past tense.** Segment: actions must be past tense ("added" not "add"). Amplitude: past tense signals *the action already successfully occurred*.
- **Events are generic and high-level; properties are specific and detailed.** This is the load-bearing distinction that prevents explosion (§2.4).
- **One behavior → exactly one canonical name.** Amplitude/Mixpanel are case-sensitive: `Song Played` ≠ `song played` ≠ `Played Song` are three different events.

### 1.2 The four casing conventions

| Casing | Example | Used/required by | Verdict |
|---|---|---|---|
| **snake_case** | `product_viewed` | **GA4/GTM (required)**, Mixpanel (recommended), warehouse/dbt/BigQuery-friendly | ✅ **Recommended default** |
| **Title Case + spaces** | `Product Viewed` | Segment (classic docs), Amplitude (recommended in-tool) | ✅ Valid in those tools; ❌ breaks in GA4 & SQL |
| **camelCase** | `productViewed` | (rare) | ❌ Avoid |
| **PascalCase / Screaming** | `ProductViewed`, `PRODUCT_VIEWED` | (idiosyncratic) | ❌ Avoid |

### 1.3 How Object–Action maps to snake_case (the key mechanical rule)

`"Object Action"` (Title Case) → lowercase, join with `_`, keep object-then-action order:

```
Product Viewed        → product_viewed
Signup Completed      → signup_completed
Checkout Step Viewed  → checkout_step_viewed
```

**Do not invert to `action_object`** (`viewed_product`). Object-first keeps every event for a given object adjacent when sorted alphabetically (`product_added`, `product_removed`, `product_viewed`).

### 1.4 Tool casing requirements — hard facts

| Tool | Event-name rule |
|---|---|
| **GA4 / GTM** | **snake_case mandatory.** Letters, numbers, underscores only. **Case-sensitive.** **Max 40 chars.** Reserved prefixes `ga_`, `firebase_`, `google_` forbidden; many names (`page_view`, `purchase`, `login`, `sign_up`) reserved/recommended. |
| **Segment** | Free-form; classic spec uses `Title Case` event names with `snake_case` **property** names. |
| **Amplitude** | Free-form; docs recommend `Title Case` "Object Action". Case-sensitive. |
| **Mixpanel** | Free-form; docs recommend `snake_case` "(Object) (Verb)" because it's warehouse-export-robust. Case-sensitive. |

**Cross-tool reconciliation:** if you send the *same* stream to Segment/Amplitude **and** GA4, standardize on `snake_case` at the source — the only casing legal everywhere and robust in a warehouse round-trip.

---

## 2. Core principles of good event naming

### 2.1 Consistency over cleverness
Pick a convention and enforce it mechanically. Segment: "don't create event names dynamically." Inconsistent casing/tense silently forks one metric into several time series.

### 2.2 Human-readability
A name should be legible to a PM in a dashboard dropdown. `signup_completed` passes; `evt_sc_v2` fails.

### 2.3 A controlled vocabulary (dictionary)
Maintain a fixed, curated set of **objects** and **actions**. Reuse existing vocabulary terms instead of minting synonyms (`clicked` vs `pressed` vs `tapped` vs `selected` → pick **one**). Avo enforces a **global namespace**; Mixpanel calls the glossary the **Lexicon**.

**Recommended controlled action verbs (past tense):**
`viewed, started, submitted, completed, clicked, opened, closed, selected, changed, added, removed, updated, deleted, searched, filtered, sorted, downloaded, uploaded, shared, invited, accepted, rejected, failed, succeeded, played, paused, scrolled`

### 2.4 Prefer PARAMETERS over proliferating event names (anti-explosion — the single most important rule)

Events are generic; details go in properties. Echoed identically by Segment, GA4, Amplitude, and Mixpanel.

| ❌ Explosion (anti-pattern) | ✅ Parameterized (canonical) |
|---|---|
| `hero_cta_clicked`, `nav_cta_clicked`, `footer_cta_clicked`, … (×50) | `cta_clicked` + `cta_location` = `hero \| nav \| footer \| pricing` |
| `purchase_2026_01_11` | `purchase` + `order_date="2026-01-11"` |
| `video_played_intro`, `video_played_demo` | `video_played` + `video_id`, `video_title` |
| `signup_google`, `signup_email`, `signup_sso` | `signup_completed` + `auth_method` |

**Rule of thumb:** if two candidate event names differ only by a *value*, that value is a parameter, not a new event.

### 2.5 Past tense vs imperative
**Past tense.** It denotes a completed, recorded fact. GA4's *recommended* names are a documented exception (e.g. `add_to_cart`, `view_item`, `sign_up`) — when you send GA4 recommended/ecommerce events you **must** use Google's exact spellings verbatim to unlock built-in reports; for your **custom** events, standardize on past tense.

### 2.6 Singular vs plural
**Singular objects by default:** `product_viewed`, not `products_viewed`. Reserve plural only when inherently collective (`search_results_viewed`).

### 2.7 Additional rules
- **No PII in names or payloads** (§4.4, §6).
- **No free-text / user-generated values** in names (explode cardinality, can leak PII).
- **Stable IDs over slugs** in parameters where possible.
- **Reserve namespaces**: don't shadow vendor prefixes (`ga_`, `firebase_`, `google_`, `mp_`).

---

## 3. Concrete naming recommendations by surface

Canonical `snake_case`, object–action, past tense. (Prefix with your product namespace in production — see §6/§7; shown here unprefixed for the generic pattern, with the GA4 recommended-name equivalent where one exists.)

| Surface | Canonical event(s) | Key parameters | GA4 recommended-name note |
|---|---|---|---|
| **Page / screen view** | `page_viewed` (web) / `screen_viewed` (app) | `page_uri`, `page_title`, `page_type`, `referrer` | GA4 auto: `page_view` / `screen_view` — don't re-mint |
| **CTA / button click** | `cta_clicked` (marketing CTA), `button_clicked` (in-app control) | `cta_id`, `cta_text`, `cta_location`, `cta_variant`, `destination_url` | maps to GA4 `select_content` if desired |
| **CTA impression** | `cta_viewed` | same as above + `is_visible`, `viewport_position` | for CTA CTR + A/B exposure |
| **Form — lifecycle** | `form_viewed` → `form_started` → `form_submitted` → `form_submission_accepted` / `form_submission_rejected` | `form_id`, `form_kind`, `surface_id` | `generate_lead` on accept |
| **Form — field error** | `form_field_errored` | `form_id`, `field_id`, `error_code` (never the raw value) | — |
| **Scroll depth** | `scroll_depth_reached` | `percent` = `25\|50\|75\|90\|100`, `page_uri` | GA4 auto `scroll` fires at 90% |
| **Video** | `video_started`, `video_progressed`, `video_completed` | `video_id`, `video_title`, `percent`, `provider` | GA4 enhanced-measurement `video_*` |
| **File download** | `file_downloaded` | `file_name`, `file_extension`, `link_url` | GA4 auto `file_download` |
| **Outbound link** | `outbound_link_clicked` | `link_url`, `link_domain`, `link_text` | GA4 auto `click` (outbound) |
| **Search** | `search_submitted`, `search_results_viewed` | `search_term`, `results_count`, `filters_applied` | GA4 `view_search_results` |
| **Filter / sort** | `filter_applied`, `sort_changed` | `filter_name`, `filter_value`, `sort_key` | — |
| **Lead / conversion** | `lead_captured`, `signup_completed`, `demo_requested`, `trial_started`, `purchase_completed` | `lead_source`, `plan`, `value`, `currency`, `correlation_id` | GA4 `generate_lead`, `sign_up`, `purchase` |
| **Auth** | `login_succeeded`, `login_failed`, `logout_completed` | `auth_method`, `failure_reason` | GA4 `login` |
| **Share / invite** | `content_shared`, `invite_sent` | `channel`, `content_id` | GA4 `share` |

**Design tips baked in above:**
- One event per **verb per surface class**, disambiguated by `*_location` / `*_id` parameters — never one event per placement.
- The **form lifecycle** deliberately distinguishes client `form_submitted` (user hit submit) from server truth `..._accepted` / `..._rejected`. This separates funnel *intent* from *outcome* — exactly the Greenhouse pattern.
- **Percent-bucketed** progress events use a discrete `percent` enum, never a continuous value, to keep cardinality bounded.

---

## 4. Parameter / property & UTM conventions

### 4.1 Property naming
- **`snake_case` always** (GA4 requires it; warehouse-robust). Same rule regardless of event casing.
- **Reuse one canonical key across events.** GA4: use `link_url` for *every* link-click event. Don't invent `cta_url` / `button_link` / `href` for the same concept.
- **Value stability & typing:** enumerate allowed values (a *value allowlist*) for categorical params; keep types consistent (a param is always string, or always number).
- **Boolean naming:** prefix with `is_` / `has_` (`is_authenticated`, `has_subscription`).
- **Units in the name** when ambiguous: `duration_ms`, `value_usd`, `file_size_bytes`.

### 4.2 Event-scoped vs user-scoped

| Scope | What it is | Examples |
|---|---|---|
| **Event property** | detail about *this* occurrence | `order_value`, `cta_location`, `results_count` |
| **User property / super property** | slowly-changing attribute of the actor, attached to all events | `plan`, `account_type`, `signup_cohort`, `traffic_source` |

Don't duplicate user-scoped attributes into every event payload; set them once.

### 4.3 UTM / attribution standard

The five canonical UTM parameters — **always lowercase**, lowercase values, hyphens not spaces:

| Parameter | Purpose | Required? | Example value |
|---|---|---|---|
| `utm_source` | where traffic originates | ✅ | `newsletter`, `linkedin`, `google` |
| `utm_medium` | marketing channel/type | ✅ | `email`, `cpc`, `social`, `referral` |
| `utm_campaign` | specific campaign | ✅ | `spring-launch-2026` |
| `utm_term` | paid keyword | optional | `event-tracking` |
| `utm_content` | creative/variant differentiator | optional | `hero-cta-a` |

**Flow into analytics:** UTMs land in the landing URL → GA4 auto-maps them to `session_source`/`session_medium`/`campaign` dimensions. **Governance:** enforce a lowercase, hyphenated, controlled vocabulary of `utm_source`/`utm_medium` values (a UTM registry) — inconsistent casing (`LinkedIn` vs `linkedin`) forks channel reporting exactly like event drift.

### 4.4 No PII, ever, in the payload
Email, name, phone, RUT/national ID, raw form field values, full IP, precise geo → **never** in event names or parameters. Use surrogate keys (`user_id`, `lead_id`, `correlation_id`). GA4 will **reject** hits it detects as PII.

---

## 5. Governance: the tracking plan & preventing drift

### 5.1 What a tracking plan is
A **single source of truth** listing every event, its trigger, its parameters (with types + allowed values), its owner, and *why* it exists. Start **small** (events tied to a business objective), then expand.

### 5.2 The maturity ladder of enforcement

| Tier | Mechanism | Enforcement strength | Best for |
|---|---|---|---|
| 0 | **Spreadsheet / Notion dictionary** | Manual, honor-system | Early stage, <20 events |
| 1 | **Schema in code** (JSON Schema / TS types / enum of allowed events + params) | Compile-time / lint-time | Eng-owned instrumentation |
| 2 | **Segment Protocols** | Runtime validation at ingestion | Segment shops |
| 2 | **Mixpanel Data Standards + Lexicon** | Evaluates every event vs rules | Mixpanel shops |
| 3 | **Avo** | Upstream codegen + global namespace + branch review | Cross-tool, highest rigor |
| 3 | **dbt tests / warehouse contracts** | Post-hoc CI assertions on landed data | Analytics-engineering backstop |

Aim for **at least Tier 1** (schema-in-code) plus a **warehouse/CI backstop**.

### 5.3 Ownership (RACI)

| Role | Owns |
|---|---|
| **Taxonomy owner** (Analytics Product Lead) | The convention, controlled vocabulary, approvals |
| **Event owner** (PM) | Why an event exists, its business definition |
| **Instrumentation owner** (Engineer) | Correct firing, payload, allowlist adherence |
| **Data steward / analytics engineer** | Schema, CI validation, warehouse contracts |

### 5.4 Review-before-ship process
1. Proposer drafts the event in the plan (name, trigger, params, owner, metric served).
2. **Taxonomy owner reviews** against the controlled vocabulary — reuse before mint; reject synonyms and explosion.
3. Schema updated (Tier 1+); PR references the plan entry.
4. CI/lint blocks any event not in the registry.
5. QA the payload in a debug/staging stream before production.

### 5.5 Versioning & migration (anti-drift)
- **Never silently rename a live event** — ship the new name **alongside** the old, run both until dashboards migrate, then deprecate.
- **Version the plan** (semver on the schema; changelog).
- **Deprecation, not deletion:** mark events `deprecated` with a removal date.
- **Drift detection:** periodically diff observed events vs the registry; anything unregistered is drift → alert + backfill or kill at source.

---

## 6. Recommended house style (opinionated, portable)

1. **Prefix (namespace) every custom event with a product code:** `<prod>_<object>_<action>` → e.g. `gh_form_submitted`. Cleanly separates *your* events from vendor auto-events and other warehouse sources; makes `event_name LIKE 'gh_%'` trivial.
2. **`snake_case` for events and parameters.**
3. **Object–action order, past tense** (except when emitting GA4 recommended/ecommerce names verbatim).
4. **Controlled vocabulary** for objects and action verbs; reuse before minting.
5. **Parameters over event proliferation** — if candidate names differ only by a value, that value is a parameter.
6. **Strict parameter allowlist** — a fixed, documented set of browser-safe keys; anything outside is dropped at the boundary.
7. **No PII, no raw user values** — surrogate IDs only.
8. **Registry-gated:** every event exists in the tracking plan before it ships; CI/lint blocks the rest; deprecate-don't-rename; version the schema.

---

## 7. Fit assessment & extension of the Greenhouse `gh_` convention

### 7.1 Scorecard — how `gh_form_*` measures against best practice

| Best-practice criterion | Greenhouse convention | Verdict |
|---|---|---|
| Product prefix / namespace | `gh_` on every event | ✅ Exemplary — most teams skip this |
| snake_case (events + params) | `gh_form_submitted`, `form_id` | ✅ GA4- & warehouse-safe |
| Object–action, past tense | `form` + `viewed/started/submitted` | ✅ Canonical |
| Client-intent vs server-outcome split | `submitted` vs `submission_accepted` / `submission_rejected` | ✅ Advanced |
| Anti-explosion (params over names) | one `form_*` family disambiguated by `form_id`/`form_kind`/`surface_id` | ✅ Correct |
| Strict parameter allowlist | `form_id, form_kind, surface_id, page_uri, utm_*, correlation_id`… | ✅ Best-in-class discipline |
| No PII / no raw values | hard rule enforced | ✅ Privacy-by-design |
| Governance registry | (extend — see §7.3) | ⚠️ Formalize the allowlist + event list as a versioned registry |

**Overall: this convention already exceeds typical industry practice.** The intent/outcome split and the enforced allowlist are things most mature analytics orgs only reach after a painful cleanup. The only gap is formal *governance tooling*.

### 7.2 Extension pattern (apply the same grammar to every surface)

Grammar: **`gh_<object>_<action>`**, snake_case, past tense; shared parameter allowlist; add object-specific keys sparingly.

| Surface | Events | Object-specific allowlisted params (added to base set) |
|---|---|---|
| **CTA / button** | `gh_cta_viewed`, `gh_cta_clicked` | `cta_id`, `cta_kind`, `cta_location`, `cta_variant`, `destination_id` |
| **Page** | `gh_page_viewed` | `page_uri`, `page_type` |
| **Scroll** | `gh_scroll_depth_reached` | `percent` (enum 25/50/75/90/100) |
| **Video** | `gh_video_started`, `gh_video_completed` | `video_id`, `percent` |
| **Download** | `gh_file_downloaded` | `file_id`, `file_kind` |
| **Outbound** | `gh_outbound_link_clicked` | `link_id`, `link_domain` |
| **Search** | `gh_search_submitted`, `gh_search_results_viewed` | `results_count`, `filters_applied` |
| **Lead/conversion** | `gh_lead_captured`, `gh_demo_requested` | `lead_source`, `plan`, `correlation_id` |

**Design notes for the extension:**
- **Mirror the form family's dual-event richness only where a server outcome exists.** Don't add outcome events for pure navigation clicks.
- **Reuse identifier keys across families:** `surface_id`, `page_uri`, `correlation_id`, `utm_*` stay in the **shared base allowlist**; only genuinely object-specific keys (`cta_id`, `video_id`) are added per family.
- **`*_kind` mirrors `form_kind`:** introduce `cta_kind`, `file_kind`, etc. as low-cardinality enums so you never need a new event to distinguish variants.
- **`*_location`** is the anti-explosion pressure valve for placement (`hero`, `nav`, `footer`, `pricing`) — one `gh_cta_clicked`, never `gh_hero_cta_clicked`.

### 7.3 The one thing to add: formalize governance
Elevate the allowlist + event list from a code rule to a **versioned tracking-plan registry** (even a typed schema in the repo is Tier 1): each event with owner, trigger, allowlisted params (typed + enumerated), and metric served; a review gate for new names; deprecate-don't-rename; and a periodic drift diff of observed `gh_*` events vs the registry.

---

## Sources

**Segment / Twilio**
- Naming conventions for clean data — https://www.twilio.com/en-us/resource-center/naming-conventions-for-clean-data
- Tracking Plan best practices (Protocols) — https://segment.com/docs/protocols/tracking-plan/best-practices/
- Track spec / semantic events — https://segment.com/docs/connections/spec/track/

**Google (GA4 / GTM)**
- GA4 event naming rules (dev reference) — https://developers.google.com/analytics/devguides/collection/ga4/reference/events
- GA4 recommended events — https://support.google.com/analytics/answer/9267735
- GA4 events overview — https://support.google.com/analytics/answer/9322688
- Analytics Mania — GA4 & GTM naming conventions — https://www.analyticsmania.com/post/google-analytics-and-google-tag-manager-naming-conventions/

**Amplitude**
- Plan your taxonomy — https://amplitude.com/docs/data/data-planning-playbook
- The foundation for great analytics is a great taxonomy — https://amplitude.com/blog/event-taxonomy

**Mixpanel**
- Events & properties — https://docs.mixpanel.com/docs/data-structure/events-and-properties
- Build your tracking strategy — https://docs.mixpanel.com/guides/plan/tracking-strategy
- Establish data governance — https://docs.mixpanel.com/guides/strategic-playbooks/onboarding-playbook/implement/establish-governance

**Avo**
- Naming conventions — https://www.avo.app/docs/data-design/best-practices/naming-conventions
- Organizing your tracking plan — https://www.avo.app/docs/data-design/guides/organizing-metrics-and-events

**CXL-aligned taxonomy & governance**
- CXL GA4 analytics framework — https://cxl.com/institute/online-course/analytics-framework-ga4/
- Growth Method — Object–Action framework — https://growthmethod.com/object-action-framework/

---

*Canonical house style = `<prod>_<object>_<action>`, snake_case, past tense, parameters-over-events, strict typed allowlist, no PII, registry-gated. The Greenhouse `gh_form_*` convention is a correct, above-industry-standard instance; extend it verbatim to `gh_cta_*` and every other surface per §7.2, and formalize the allowlist into a versioned registry (§7.3).*
