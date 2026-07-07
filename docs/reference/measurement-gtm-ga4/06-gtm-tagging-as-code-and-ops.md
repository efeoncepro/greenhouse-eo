# Managing GTM as Code + Operations — Operator Reference

> Versioning, reviewing, and safely deploying GTM containers like software — not click-ops. Deployment workflow, verification tiers, governance, server-side GTM, and the diagnostic ladder for "event not showing in GA4". Current as of 2026. Consumed by the skill `greenhouse-gtm-ga4-operator`.

## 0. Mental model: what GTM actually is under the hood

| GTM concept | Software analogy | Notes |
|---|---|---|
| **Container** | The repo / app | One JSON document of tags, triggers, variables, folders, templates. |
| **Workspace** | A feature branch / working copy | Up to **3 concurrent** on free GTM; unlimited on 360. Edits invisible to live traffic. |
| **Version** | An immutable git tag / release | Permanent snapshot on publish. Never mutates. **Rollback = re-publish an older version.** |
| **Publish** | Deploy to prod | Makes a version live for the default environment. |
| **Environment** | A deploy target (staging/prod) | Own snippet + `gtm_auth` token; point a version at an environment without publishing to prod. |
| **Version notes** | Commit message / changelog | The **only native audit trail** — discipline here is load-bearing. |
| **Export (JSON)** | `git export` of the tree | The container/workspace/version as text — the substrate for "GTM as code." |

**The single most important fact:** GTM keeps its own linear version history, but it is **not git** — no branches-of-branches, no true merge, no PR review, no per-line blame. "GTM as code" means bolting a git/CI layer on top of the API v2 + JSON export.

---

## 1. Container-as-code approaches

### 1.1 The native substrate: API v2 + JSON export/import
- Containers export as **JSON text** (`Admin → Export Container`) from a workspace or a version — Google's sanctioned path for "diff and Git".
- **Partial export** supported (individual tags/triggers/variables, retain folders).
- **The catch:** exported JSON contains **volatile fields** — numeric `tagId`/`triggerId`/`variableId`, `fingerprint` timestamps, `containerVersionId`. A naive `git diff` is noisy. Practical git-of-GTM requires **normalization** (strip fingerprints/IDs, sort by name) before committing.

### 1.2 The `sync` / diff model
The real-world pattern is **account-to-account or workspace-to-live sync**, not literal git merge: diff two states → copy only the delta via API. Git holds normalized JSON snapshots as the *record*; the *apply* happens via API sync.

### 1.3 Community tooling

| Tool | What | Auth | Fit | Maturity (2026) |
|---|---|---|---|---|
| **gtm-cli (owntag)** `@owntag/gtm-cli` | Full-surface CLI over API v2 (accounts…versions, permissions, **server-side** resources). | OAuth / **Service Account** / `GOOGLE_APPLICATION_CREDENTIALS`. | **Best CI/CD fit** — documented GitHub Actions flow (SA auth → `gtm versions live` → commit JSON → cleanup). | **Active**, v1.5.8 (Apr 2026), TypeScript. |
| **gtm-tools (vaidik)** | CLI to keep two accounts in sync (prod ↔ dev). | Service Account. | `list`/`diff`/`copy`/`reset` (guarded). | Stable, less active. Strong for prod↔dev promotion. |
| **gtm-cl (sahava)** | Simo Ahava's original CLI experiments. | OAuth/SA. | Educational. | Legacy. |
| **GTM Tools (Stape, gtmtools.com)** | Web utility (bulk ops, find/replace, container compare) — **not** git. | OAuth. | Interactive power-tool. | Actively maintained. |

### 1.4 Terraform for GTM tags — NOT mature
There is **no official Google GTM provider** (`google_tag_manager_*` requested but unshipped — issue #12439). Community providers (`mirefly/google-tag-manager` v0.0.8, `carwow`, `deliveroo`) are pre-1.0 / low activity. **Do not build your GTM tag lifecycle on Terraform.** (Terraform *is* right for the sGTM **hosting** — Cloud Run/domain/IAM — see §5.)

### 1.5 Recommended architecture (2026)
Git holds **normalized JSON snapshots** as the reviewable record (auto-committed each publish via owntag CLI in CI). Authoring happens in the GTM UI workspace (safest editor) or via the API. PRs review the *diff of the snapshot*; GTM's native version history + version notes remain the source of truth for **rollback**. Treat git as **audit + review + diff**, GTM as **runtime + apply + rollback**.

---

## 2. Safe deployment workflow

```
Workspace (feature branch)
  → Preview / Tag Assistant (local verify)
    → push version to STAGING Environment (QA on staging site)
      → verify (GA4 DebugView / dataLayer / network)
        → create Version + version notes (the audit trail)
          → Publish to Production
            ↺ Rollback = re-publish the previous Version
```

- **Workspaces as feature branches:** one workspace = one change. **Name** them like branches (`TASK-XXXX-ga4-generate-lead`). Free tier max 3 concurrent forces discipline. Sync to latest before publishing if the base moved (conflict warning).
- **Preview / Tag Assistant:** connects the browser to the workspace draft; shows per dataLayer event which tags fired/not/failed + variable values + matched trigger. Never publish something you haven't seen fire in Preview.
- **Staging Environment:** generates a separate snippet (own `gtm_auth`/`gtm_preview`). Push a version to the staging environment (not prod) → exercise real flows against real markup → then publish to prod. Catches bugs Preview can't (real dataLayer timing).
- **Version notes = audit trail:** fill name + notes every publish (what/why/ticket/who approved). Empty notes = `git commit -m "fix"`.
- **Rollback:** Versions → select last-known-good → Publish. Instant + total (versions are immutable). Keep the "known good" version ID in the runbook.

**Controls to avoid publishing untested changes:** split authoring from publishing via **permissions** (team on Edit/Approve, only 1–2 operators hold **Publish**); require staging pass; require version notes; snapshot to git per publish for after-the-fact diff + drift detection.

---

## 3. Testing / verification

### 3.1 Verification tiers (what proves an event "fired + landed")

| Tier | Tool | Proves | Automatable |
|---|---|---|---|
| **0** | Playwright/Cypress asserting `window.dataLayer` | The **dataLayer push** happens (correct event + params) | ✅ |
| **0b** | Playwright intercepting the network **`/g/collect`** | The tag actually **sent the hit** (right `en=` + params + `tid`) | ✅ |
| **1** | Console `dataLayer.filter(e => e.event === 'x')` | dataLayer sanity | ⚠️ manual |
| **2** | **GTM Preview / Tag Assistant** | Trigger matched + tag fired inside GTM | ⚠️ manual |
| **3** | **GA4 DebugView** + Realtime | Hit **landed** in GA4, clean params, no "missing" flags | ⚠️ manual |

**The gap only Tier 0b closes:** dataLayer push and GTM firing can both be green while GA4 records **nothing** (ad-blocker, consent, wrong Measurement ID). Asserting the outbound `/g/collect` request is the only automated proof the hit left the browser; DebugView proves it arrived.

### 3.2 Automated pattern (Playwright) — pairs with `greenhouse-gvc-playwright`

```js
// Tier 0: dataLayer assertion
await page.click('#submit')
const events = await page.evaluate(() =>
  window.dataLayer.filter(e => e.event === 'gh_form_submission_accepted'))
expect(events.length).toBe(1)
expect(events[0].form_slug).toBe('efeonce-aeo-diagnostic')

// Tier 0b: prove the GA4 hit left the browser
const hit = page.waitForRequest(r =>
  r.url().includes('/g/collect') && r.url().includes('en=generate_lead'))
await page.click('#submit')
await hit  // throws if the tag never sent
```

### 3.3 The GA4 realtime / DebugView loop
Enter GTM Preview (enables `debug_mode`) → do the action → watch **DebugView** (event name, all `ep.*` params, no red flags) → cross-check **Realtime** (5–10 min lag; DebugView is the fast loop) → only then version + publish. Greenhouse fast loop: `scripts/ga4/realtime-events.ts 486264460`.

### 3.4 Trigger-match gotcha (#1 "why didn't it fire")
Event in dataLayer but tag didn't fire → almost always the **trigger's event name not matching** the dataLayer `event` value — **case-sensitive, exact string.**

---

## 4. Governance at scale

- **Naming** (recap): Tag `<platform> - <event> [- detail]`; Trigger `CE - <event>` / `Click - <cond>`; Variable `DLV - <what>` / `CONST - <what>`; Workspace `<ticket>-<slug>`; Version = human summary + ticket. (Full scheme: `02-gtm-and-datalayer.md §6`.)
- **Folders** by owner/purpose (`GA4`, `Google Ads`, `Consent`, `Utilities`). One change per workspace; delete stale workspaces (they hold a base version and cause conflicts).
- **Permissions (the core lever):** container roles = No access / Read / **Edit** (create workspaces, edit — cannot publish) / **Approve** (+create versions — cannot publish) / **Publish** (full). Rule: team on Edit/Approve; **only 1–2 release operators hold Publish** — the human gate against untested prod pushes (GTM's closest thing to branch protection). Keep ≥2 account **Admins** (bus-factor).
- **Consent Mode as a gate:** tags keyed to `analytics_storage`/`ad_storage` won't fire (or fire cookieless) without consent. Declare each tag's required consent + behavior on denial. "Works in Preview, dead in prod" = your Preview session granted consent; EU visitors often don't.
- **Tracking plan discipline:** maintain the plan (`docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`) as source of intent; CI can diff normalized container JSON vs the plan to detect drift.

---

## 5. Server-side GTM (sGTM) operations

- **When to adopt:** material stakes in **ad-platform signal recovery** (Meta CAPI, Google Ads Conversion API) — practical threshold ~>$5k/mo paid media with heavy Safari traffic. Below that, Google Tag Gateway or Cloudflare Zaraz suffice.
- **Hosting:** Cloud Run (~$120/mo at 3-instance guidance; **trap:** Cloud Logging can add ~$100/mo — disable it) / Stape (~$20–200/mo, low-ops) / self-host. Efeonce already has an **`Efeonce Server` sGTM container** (`GTM-K2X4ZTTK`) in the GTM account.
- **Setup skeleton:** provision the tagging-server image → preview + prod services on Cloud Run → **first-party custom domain** + managed cert → configure server **Clients** (GA4/MP) → point the web GA4 tag's `server_container_url` at the domain → wire Consent Mode through. **Terraform is appropriate for the sGTM infra** (Cloud Run/domain/IAM), unlike the tag config.
- **Honest tradeoffs:** sGTM buys **signal recovery + PII redaction**, NOT ad-blocker evasion (~80% still detect custom-domain sGTM) and NOT free Safari cookie extension (needs IP alignment). Real infra + real cost + real ops.

---

## 6. Diagnostic ladder — "event not showing in GA4"

Walk the chain; the step where it first breaks names the fault class:

1. **dataLayer** — is the push there, correct name + params? (`dataLayer.filter(...)`)
2. **GTM Preview** — did the trigger match and the tag fire? (name-match, consent state)
3. **Network** — did `/g/collect` leave the browser with the right `en=` + `tid`? (Tier 0b — proves consent/ad-blocker didn't kill it)
4. **GA4 DebugView** — did it arrive with clean params, no "missing/invalid"? (proves ID/property correct)
5. **Realtime / reports** — allow lag; check filters/quotas.

**If the request leaves the browser but GA4 has nothing → it's the ID/property or a filter.** **If the request never leaves → it's consent / ad-blocker / dataLayer timing.**

### Common failure modes

| Failure | Symptom | Fix |
|---|---|---|
| **Changes not published** | Prod behaves like the old container; works in Preview. | Publish; confirm the correct version is live. **#1 cause.** |
| **Container not installed on page** | No GTM/Preview connection. | Ensure the snippet (head script + body noscript) is on **every** template. |
| **Wrong Measurement ID** | Tag fires but data lands in the wrong/no property. | Fix the ID; prefer a Constant/Lookup so there's one source of truth. (Efeonce: verify `G-KYPPY57M14` ↔ property `486264460`.) |
| **Duplicate containers / double tags** | 2× pageviews, bounce ~0%. | Remove the duplicate install/tag. (Efeonce site loads GTM `GTM-NGHPGRLZ` **and** Site Kit `GT-KV5CNNKQ` — watch for double-counting.) |
| **Consent blocking** | Fires in Preview, dead in prod EU. | Model consent per tag; Consent Mode v2 default `denied` + update. |
| **dataLayer timing / race** | Params `undefined`; nothing anywhere — the most invisible failure. | Push the event **after** data is ready; fire on the data-complete event, not the click. |
| **Tag firing order** | Events without session/consent context. | Tag sequencing so config/consent fires first. |
| **Trigger name mismatch** | Event in dataLayer, tag never fires. | Match exactly (case-sensitive). |
| **Ad-blockers** | Random signal loss. | sGTM + CAPI for paid-media-critical events. |

---

## Sources

- GTM Help — Export/Import Containers: https://support.google.com/tagmanager/answer/6106997
- Simo Ahava — GTM Environments (QA): https://www.simoahava.com/analytics/better-qa-with-google-tag-manager-environments/
- Simo Ahava — Automated Tests For GTM's dataLayer: https://www.simoahava.com/analytics/automated-tests-for-google-tag-managers-datalayer/
- Simo Ahava — User Permissions: https://www.simoahava.com/gtm-tips/user-permissions/
- owntag — gtm-cli: https://github.com/owntag/gtm-cli · https://www.owntag.eu/resources/gtm-cli/
- vaidik — gtm-tools: https://github.com/vaidik/gtm-tools
- Stape — GTM Tools: https://stape.io/blog/how-to-effectively-use-gtm-tools-by-stape · https://gtmtools.com/
- terraform-provider-google issue #12439: https://github.com/hashicorp/terraform-provider-google/issues/12439
- GTM Help — Environments: https://support.google.com/tagmanager/answer/6311518 · Permissions: https://support.google.com/tagmanager/answer/6107011
- MeasureSchool — Naming Conventions: https://measureschool.com/gtm-and-ga4-naming-conventions/
- Analytics Mania — GTM Best Practices: https://www.analyticsmania.com/post/google-tag-manager-best-practices/
- ceaksan — sGTM 2026 (Cloud Run vs Stape vs Self-Hosted): https://ceaksan.com/en/gtm-server-side-tagging
- Kissmetrics — Tags fire in Preview but GA4 doesn't record: https://kissmetrics.io/blog/gtm-preview-ga4-mismatch
- Bounteous — Consent Mode mistakes (2025): https://www.bounteous.com/insights/2025/07/30/top-7-google-consent-mode-mistakes-and-how-fix-them-2025/

> **Key findings:** (1) Terraform for GTM *tags* is not production-mature — use normalized JSON in git + owntag `gtm-cli` for snapshots. (2) "As code" = git for audit/review/diff, GTM native versions for rollback. (3) The load-bearing automated verification is asserting the outbound `/g/collect` request (Tier 0b). (4) sGTM's real value is ad-platform signal recovery (CAPI), not ad-blocker evasion or Safari cookies.
