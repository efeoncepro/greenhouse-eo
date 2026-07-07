# Google Tag Manager (GTM) — Engineering Reference (2026)

> Durable reference covering GTM core concepts, web vs server-side GTM, the dataLayer in depth, tags/triggers/variables, Consent Mode v2, and naming conventions (Google + community/Simo Ahava). Verified against current official docs and community sources (2026). See **Sources** at the end.

---

## 1. Core Concepts

GTM is a **tag management system (TMS)**: a hosted layer that lets you deploy and update measurement/marketing snippets ("tags") through a web UI without editing site source code on every change. You install **one** container snippet once; everything else is configured in the GTM UI and pushed live by publishing a version.

### 1.1 Object hierarchy

| Level | What it is | Notes |
|---|---|---|
| **Account** | Top organizational unit, usually one per company | Holds users + containers. |
| **Container** | A single deployment target (one website, one app, one server) | Identified by a public ID: `GTM-XXXXXXX` (web) or a server URL (server container). All tags/triggers/variables live inside a container. |
| **Workspace** | An isolated draft copy of the container config | Lets multiple people work on changes in parallel without stepping on each other. Free tier: up to 3 concurrent workspaces; 360: effectively unlimited. Changes are merged into the base on publish. |
| **Version** | An immutable snapshot of the whole container config | Created when you publish (or "Create Version"). Publishing = making a version live. You can preview, name, describe, and **roll back** to any prior version. |
| **Environment** | A named target (e.g. `Live`, `Latest`, `Staging`) that maps a version to a distinct snippet | Lets you point staging/QA infra at an unpublished version. Each environment has its own snippet variant (adds `gtm_auth` + `gtm_preview` params). |
| **Tags / Triggers / Variables** | The working units (see §4) | Tags fire on triggers; triggers evaluate variables. |
| **Folders** | Organizational grouping inside a container | Purely for housekeeping; no runtime effect. |

### 1.2 Container types

| Container type | Runs where | Purpose |
|---|---|---|
| **Web** | Browser (JS) | Standard website tagging. Snippet `GTM-XXXXXXX`. |
| **Server** (sGTM) | A tagging server you host (Cloud Run / App Engine / self-hosted Docker) | Receives HTTP requests, processes with server-side clients/tags. No JS snippet on the page; endpoint is a URL. See §2. |
| **AMP** | AMP runtime | Legacy; AMP-specific tag support. Rarely used now. |
| **iOS** | Native iOS app (via Firebase) | Firebase-linked; tags configured server-side/in Firebase. |
| **Android** | Native Android app (via Firebase) | Same model as iOS. |

### 1.3 The GTM snippet (web container)

A web container fires **only on pages where its specific `GTM-XXXXXXX` snippet is installed.** There is no crawling or auto-injection — the container is inert on any page that doesn't load its snippet. Install both parts:

**Part A — `<head>` script** (place as high in `<head>` as possible, but after the `dataLayer` init — see §3):

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->
```

**Part B — `<noscript>` iframe** (place immediately after the opening `<body>` tag; provides a no-JS fallback so some tags can still fire):

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

Key facts:
- The head script pushes `{'gtm.start': …, event: 'gtm.js'}` onto the dataLayer and async-loads `gtm.js` (the container's compiled config).
- On load, GTM fires the **All Pages / Page View** built-in trigger and then evaluates subsequent triggers.
- `id=` in the snippet is what binds the page to a container. Multiple containers can coexist on one page (each with its own snippet).
- Environments append `&gtm_auth=…&gtm_preview=env-…` to target a non-live version.

### 1.4 Publishing lifecycle

`Edit in Workspace → Preview (Tag Assistant) → Submit → Create Version (name + notes) → Publish`. Publishing pushes the version to the `Live` environment; the CDN-served `gtm.js` updates within minutes. Roll back = re-publish an older version.

---

## 2. Web GTM vs Server-Side GTM (sGTM)

**Web GTM** runs entirely in the user's browser: the `gtm.js` container executes client-side, reads the dataLayer/DOM/cookies, and sends requests directly to vendor endpoints (GA4, Meta, etc.).

**Server-side GTM (sGTM)** moves tag processing to **a server you control**. Official definition: it lets you "process data on a server you control, rather than in the user's browser," and "only you have access to the data in the server until you choose to send it elsewhere."

### 2.1 How sGTM works

1. The browser (or app, or any source) sends measurement data to **your server container URL** (ideally on a first-party subdomain, e.g. `https://sgtm.example.com`).
2. A **Client** receives the request and transforms it into a standardized **event** object. (Server containers ship with **GA4** and **Measurement Protocol** clients pre-installed.)
3. **Server-side tags** fire on triggers (same tag/trigger/variable model as web) and forward the event to downstream vendors.
4. The client packages a response back to the requester.

**Client** = "an adapter between the software running on a user's device and your server container." It handles **reception**, **transformation** (request → event), and **response packaging**.

### 2.2 When to use sGTM

- **Data control / ownership** — data lands on your infra first; you decide what leaves.
- **First-party context** — served from your own domain → more durable cookies, better resilience to browser ITP/ad-blocking, stronger privacy posture.
- **Performance** — fewer third-party scripts in the browser; heavy lifting moves server-side.
- **Cross-platform unification** — one server container can ingest from a website, a mobile app, and other sources via multiple clients instead of many browser containers.

### 2.3 Tagging server basics

- Provisioned via Google Cloud (automatic setup on Cloud Run / App Engine) or self-hosted via the official **Docker image** (versioned; v2.2.0 added HTTP proxy support).
- Runs the same sandboxed-JS security model as web GTM.
- Deploy behind a first-party domain before production.
- Common hosting in 2026: Google Cloud Run, or managed providers (Stape, Taggrs) vs self-hosted.

### 2.4 sGTM parameter convention

Non-standard parameters (not in the standard event schema) are prefixed with **`x-vendor-`**. Example: Facebook's Subscription ID → `x-fb-subscription_id`. Server-side work strongly favors **snake_case**.

---

## 3. The dataLayer (in depth)

> Official: "The data layer is an object used by Google Tag Manager and gtag.js to pass information to tags." It's the canonical, structured channel between your site/app and GTM.

### 3.1 What it is

A global JavaScript **array** (`window.dataLayer`) of objects. Your site pushes structured data and events onto it; GTM listens, exposes the values as **Data Layer Variables**, and fires **Custom Event triggers** when it sees an `event` key.

### 3.2 Initialization

Declare it **before** the GTM snippet, using the safe idempotent pattern (never clobbers an existing array):

```javascript
window.dataLayer = window.dataLayer || [];
```

Any values you want available on the **first Page View** must be pushed **above the container snippet** so they exist when `gtm.js` initializes:

```html
<script>
  window.dataLayer = window.dataLayer || [];
  dataLayer.push({
    'event': 'Pageview',
    'pagePath': 'https://example.com/page',
    'visitorType': 'customer'
  });
</script>
<!-- Google Tag Manager snippet follows -->
```

### 3.3 `dataLayer.push()` syntax

```javascript
// Single key/value
dataLayer.push({'variable_name': 'variable_value'});

// Multiple keys + an event in one push
dataLayer.push({
  'color': 'red',
  'conversionValue': 50,
  'event': 'customize'
});
```

Inline example (fires a custom event on click):

```html
<button onclick="dataLayer.push({'event': 'login'});">Log in</button>
```

### 3.4 The reserved `event` key → Custom Event triggers

The **`event`** key is special. When a push contains `event`, GTM registers a **Custom Event** in the model and any **Custom Event trigger** whose event name matches will evaluate (and fire matching tags). This is how you fire tags on arbitrary interactions.

- The **value** of `event` is the string matched in a Custom Event trigger's "Event name" field (supports exact match or regex).
- GTM's own lifecycle uses reserved event names: `gtm.js` (container init / Page View), `gtm.dom` (DOM Ready), `gtm.load` (Window Loaded), plus `gtm.click`, `gtm.linkClick`, `gtm.formSubmit`, `gtm.scrollDepth`, `gtm.timer`, `gtm.elementVisibility`, `gtm.historyChange` (these back the built-in auto-event triggers).

### 3.5 Recommended data structures

- Push **structured objects**, ideally nested for rich context (e.g. GA4 ecommerce uses an `ecommerce` object with an `items` array).
- Keep key names **consistent across every page** — mismatches silently break tag firing.
- For GA4 ecommerce, **clear** the previous ecommerce object before a new push: `dataLayer.push({ ecommerce: null });` then push the new one, to avoid data bleeding between events.

### 3.6 Push timing & order

- **Declare `dataLayer` before the GTM snippet.** Values needed at page load must be pushed above the snippet.
- **Persistence:** values pushed into the dataLayer persist for the **current page only** (SPA route changes count as the same page until a full reload). To carry state across page loads, re-push it on each page.
- Late pushes (after load) are fine for interactions — they just fire their own Custom Event.

### 3.7 Best practices (hard rules)

| Rule | Why |
|---|---|
| **Never overwrite `dataLayer`** (`dataLayer = [...]`) after init | Destroys GTM's listener + accumulated model. Only ever use `.push()`. |
| **Case-sensitive:** it is `dataLayer`, not `datalayer` | Wrong casing = GTM never sees it. |
| **Quote key names** | `{'new-variable': 'value'}` ✓ vs `{new-variable: 'value'}` ✗ (the latter is a syntax error). |
| **One `dataLayer` per page** | Multiple instances cause tags to fail / data inconsistency. |
| **Consistent key naming across pages** | `visitorType` on one page + `visitor_type` on another prevents reliable firing. |
| Push before you need the value | Data Layer Variables only read what already exists in the model at evaluation time. |

### 3.8 `gtag()` vs `dataLayer.push()`

- Both write to the **same** `window.dataLayer` array. `gtag()` is sugar: `function gtag(){dataLayer.push(arguments)}` — it pushes an **arguments list**, not a plain object.
- Use `gtag()` for Google's config/consent/measurement commands (`gtag('config', …)`, `gtag('consent', …)`, `gtag('set', …)`).
- Use `dataLayer.push({...})` for your **own** structured events consumed by GTM Custom Event triggers + Data Layer Variables.
- The abstract data-model methods **`set` / `get` / `reset`** must be invoked via `dataLayer.push(function(){ this.set(...) })` — calling them through `gtag` is treated as an invalid command and ignored:

```javascript
window.dataLayer.push(function() {
  this.set('time', new Date());
});
```

### 3.9 How Data Layer Variables read values

A **Data Layer Variable (DLV)** in GTM reads a key from the current data model by name. For nested keys use **dot notation**: `ecommerce.items.0.item_id`. Two versions:
- **Version 2** (default/recommended) — reads the merged/accumulated data model (values persist from earlier pushes on the same page).
- **Version 1** (legacy) — reads only the most recent push's shallow object.

DLVs also support a **default value** when the key is absent.

---

## 4. Tags, Triggers, Variables (detail)

### 4.1 Tags

A **tag** is a snippet of vendor code + config that fires when its trigger conditions are met.

**Key GA4 tag types (post-2023 "Google tag" migration):**

| Tag type | Role | ID field | Notes |
|---|---|---|---|
| **Google tag** (`gtag`) — formerly *GA4 Configuration* | Loads the base Google tag / initializes measurement, sets config-level params, enables enhanced measurement | **Tag ID** (`G-XXXXXXXXXX` for a GA4 stream, or `GT-`/`AW-`) | Replaced the **GA4 Configuration tag**. Existing GA4 Config tags were **auto-upgraded**; measurement is unchanged. One Google tag can serve multiple Google products. |
| **GA4 Event tag** | Sends a specific event (with parameters) to GA4 | **Measurement ID** (`G-XXXXXXXXXX`) set **directly on the tag** | There is **no direct link** between a GA4 Event tag and the Google tag — each event tag needs its own Measurement ID. Fires on whatever trigger you attach. |
| **Google Tag: Configuration settings variable** | Reusable bundle of config params loaded when the Google tag loads | — | Replaces the "fields to set" workflow; share params across tags. |
| **Google Tag: Event settings variable** | Reusable bundle of event params reused across event tags | — | e.g. `GA4 event settings – container version`. |

**How GTM sends events to GA4:** the Google tag boots measurement (Tag ID); each **GA4 Event tag** attaches to a trigger, includes event name + parameters + Measurement ID, and on fire sends a `/collect` request to GA4. Enhanced measurement events (page_view, scroll, outbound click, etc.) can be auto-collected by the Google tag without separate event tags.

**Other common tag types:** Custom HTML, Custom Image, Google Ads Conversion Tracking, Google Ads Remarketing, Floodlight, Conversion Linker, plus 100s of vendor **templates** from the Community Template Gallery. Tag options include **firing/blocking triggers**, **tag sequencing** (setup/cleanup tags), **consent settings**, and **tag firing priority**.

### 4.2 Triggers

A **trigger** listens for an event and evaluates conditions; when true, it fires (or blocks) its tags.

| Trigger type | Backing event | Fires when |
|---|---|---|
| **Page View** | `gtm.js` | GTM initializes (earliest). |
| **DOM Ready** | `gtm.dom` | DOM parsed. |
| **Window Loaded** | `gtm.load` | All page resources loaded. |
| **Custom Event** | your `event` value | A `dataLayer.push({event:'…'})` matches the event name (exact/regex). **The primary mechanism for dataLayer-driven tags.** |
| **Click – All Elements** | `gtm.click` | Any element click. |
| **Click – Just Links** | `gtm.linkClick` | Anchor/link click (with "wait for tags" / validation options). |
| **Form Submission** | `gtm.formSubmit` | Native form submit. |
| **Scroll Depth** | `gtm.scrollDepth` | Vertical/horizontal % or px thresholds. |
| **Element Visibility** | `gtm.elementVisibility` | A selected element enters the viewport (once / every time, % visible, min duration). |
| **Timer** | `gtm.timer` | Every N ms, up to a limit, while conditions hold. |
| **History Change** | `gtm.historyChange` | SPA route/hash change (`pushState`, `popstate`). |
| **JavaScript Error** | `gtm.pageError` | Uncaught JS error. |
| **YouTube Video** | `gtm.video` | YT iframe play/pause/progress/complete. |
| **Trigger Group** | — | Fires only after all member triggers have fired. |

Each trigger can be scoped with **conditions** ("fire on Some…" filtering on any variable, e.g. `Page Path` contains `/checkout`) and used as a **blocking (exception)** trigger on a tag.

### 4.3 Variables

Variables return values used in tag config and trigger conditions. Two families:

**Built-in variables** (toggle on/off): `Page URL`, `Page Hostname`, `Page Path`, `Referrer`, `Event` (`{{Event}}` = current dataLayer event name), `Click Element/Classes/ID/Text/URL/Target`, `Form Element/Classes/ID/Text/URL`, `Scroll Depth Threshold/Units/Direction`, `Container ID`, `Container Version`, `Random Number`, `HTML ID`, `Error Message/URL/Line`, `New History Fragment`, etc.

**User-defined variables (key types):**

| Variable type | Returns |
|---|---|
| **Data Layer Variable (DLV)** | A key from the dataLayer (dot notation for nested), with optional default. |
| **Constant** | A fixed string (e.g. a Measurement ID reused everywhere). |
| **Custom JavaScript** | Result of an anonymous `function(){ … return … }`. |
| **Lookup Table** | Maps an input variable's value → an output (else default). |
| **RegEx Table** | Like Lookup Table but pattern-matched inputs; supports capture groups. |
| **1st-Party Cookie** | Reads a browser cookie value by name. |
| **URL** | Component of the current URL (host, path, query key, fragment, protocol). |
| **DOM Element** | Value/text of a DOM node by ID or CSS selector. |
| **JavaScript Variable** | A global `window.*` value by dotted path. |
| **Auto-Event Variable (AEV)** | Attribute of the element that triggered an auto-event (e.g. `data-*`, element text). |
| **Google Tag: Config/Event Settings** | Reusable GA4 parameter bundles. |
| **Custom Template Variable** | From an installed/community template. |
| **Environment Name**, **Random Number**, **Container Version** | Utility. |

---

## 5. Consent Mode v2 (basics)

**Consent Mode** is Google's API for adapting tag behavior to a user's consent choices. **v2** is required (since March 2024) for advertisers serving ads in the **EEA** using Google services, and must be wired through a **Google-certified CMP**.

### 5.1 The four consent signals

| Signal | Controls | Type |
|---|---|---|
| `ad_storage` | Storage (cookies) for advertising | **Upstream** — gates which identifiers are sent. |
| `analytics_storage` | Storage (cookies) for analytics | **Upstream**. |
| `ad_user_data` | Whether user data may be **sent** to Google for ads | **Downstream** — processing instruction. |
| `ad_personalization` | Whether data may be used for **personalized ads / remarketing** | **Downstream**. |

`ad_storage` + `analytics_storage` qualify **which identifiers** ride along with a ping; `ad_user_data` + `ad_personalization` tell Google **how to process** the data.

### 5.2 How it interacts with tags

Set a **default** state before any tags fire (usually all `denied`), then **update** on the user's choice:

```javascript
gtag('consent', 'default', {
  ad_storage: 'denied', analytics_storage: 'denied',
  ad_user_data: 'denied', ad_personalization: 'denied',
  wait_for_update: 500
});
// after CMP interaction:
gtag('consent', 'update', { ad_storage: 'granted', analytics_storage: 'granted',
  ad_user_data: 'granted', ad_personalization: 'granted' });
```

- Google tags respect these states natively. In GTM, each tag has **Consent Settings** ("Additional consent checks") — a tag can require certain consent types before firing.
- With consent **denied**, Google tags send **cookieless pings** (consent-aware, no identifiers) enabling **behavioral/conversion modeling** rather than dropping data entirely.
- **2026 change (effective June 15, 2026):** `ad_storage` becomes the **sole** control for advertising data flowing from **GA4 → linked Google Ads** accounts. Previously data passed through **two** gates (Google Signals **and** Consent Mode); after this date Google Signals no longer provides a middle layer. Audit that `ad_storage` is set correctly to avoid breaking Ads data sharing.

---

## 6. Naming Conventions (priority section)

**Why:** consistent names make a container searchable, auditable, and safe to hand off. The dominant community pattern (Simo Ahava, Analytics Mania, MeasureSchool, Optimize Smart) is **type/vendor prefix → purpose/name → optional context**, with a leading lowercase abbreviation or hyphen so items **group and sort** in the UI.

### 6.1 Tags

**Format:** `<Vendor/Platform> <TagKind> – <event/action> – <optional context>`

| Example | Reading |
|---|---|
| `GA4 Event – generate_lead – contact form` | GA4 event tag for a lead on the contact form. |
| `GA4 Event – button_click – Sitewide` | GA4 event, sitewide. |
| `GA4 Config` / `GA4 config – G-XXXXXXXXXX` | The Google tag (base config). |
| `Google Ads – Conversion – Purchase` (`GAds – Conversion – Purchase`) | Google Ads conversion. |
| `Google Ads Remarketing – Thank You page` | Remarketing on thank-you page. |
| `Meta – Pixel – 859508457409711` | Meta pixel by ID. |
| `cHTML – Hubspot – Form Listener` | A Custom HTML tag. |

Guidance: include **track type** (`Event` / `Config`) for Google tags and **tag type** (`Conversion` / `Remarketing`) for Ads; add page/context when a tag is page-specific. A leading platform token (and hyphen) keeps like tags adjacent when sorted.

### 6.2 Triggers

**Format:** `<Trigger type> – <name/condition> – <optional context>`

| Example | Reading |
|---|---|
| `Page View – Homepage` | Page view scoped to homepage. |
| `Link Click – Navigation Menu` | Link-click trigger on nav. |
| `Custom Event – form_submitted – Contact Form` (or `CE – form_submitted – Demo page`) | Custom Event trigger on a dataLayer `event`. |
| `click – blog – register button` | Element click on the blog register button. |
| `All link clicks`, `History change`, `Scrolling` | Simple/global triggers = type only. |
| `Blocking – All link clicks`, `Exception – Custom – hubspot-form-success` | Blocking/exception triggers prefixed `Blocking –` / `Exception –`. |

**`CE –`** is the widely-used shorthand for **Custom Event** triggers.

### 6.3 Variables — prefix scheme

Format: **`<prefix> – <what it returns/accesses>`**. The lowercase prefix is the convention that sorts and identifies variables at a glance.

| Prefix | Variable type | Example |
|---|---|---|
| `dlv` / `DLV` | **Data Layer Variable** | `dlv – member_level` |
| `cjs` / `CJS` | **Custom JavaScript** | `cjs – modified ecommerce object` |
| `js` | **JavaScript Variable** (global) | `js – document.title` |
| `chtml` / `cHTML` | **Custom HTML** (tag context) | `cHTML – Hubspot – Form Listener` |
| `lt` / `lookup` | **Lookup Table** | `lookup – Hostname to GA4 IDs` |
| `regex` / `rt` | **RegEx Table** | `regex – [Input] to [Output]` |
| `const` / `CONST` | **Constant** | `const – GA4 Measurement ID` |
| `cookie` / `1pc` | **1st-Party Cookie** | `cookie – isEmailSubscriber` / `1pc – isPaidCustomer` |
| `url` | **URL Variable** | `url – click hostname` / `url – Query – step` |
| `aev` | **Auto-Event Variable** | `aev – Element Text` / `aev – data-brand` |
| `dom` | **DOM Element** | `dom – price node` |
| `user-provided` | **User-Provided Data** (enhanced conversions) | `user-provided – name and email` |
| `GA4 event settings` | **Google Tag: Event Settings** variable | `GA4 event settings – container version` |
| `GA4 config settings` | **Google Tag: Config Settings** variable | `GA4 config settings – global params` |

> **Simo Ahava's stance:** a consistent, information-dense scheme throughout. His most explicit prefix guidance is for **server-side** (`x-vendor-` for non-standard params, e.g. `x-fb-subscription_id`) and a strong **snake_case** preference server-side. For **Workspaces** he encodes `<base version number> – <feature> – <team/person>` (e.g. `12 – GA4 Ecommerce – John`). The `<prefix> – <purpose>` scheme above is the community consensus taught by Analytics Mania, MeasureSchool, and Optimize Smart.

### 6.4 Folders, Workspaces, Versions

- **Folders:** by vendor purpose (`Analytics`, `Marketing`, `Utilities`), by vendor (`Google Analytics`, `Meta Pixel`), or by feature (`GA4 Ecommerce`, `GDPR Consent`).
- **Workspaces:** name for the feature being built — `GA4 Ecommerce`, or `<version> – GA4 Ecommerce – <person>` on larger teams.
- **Versions:** always **name + describe** every version (bulleted change list) — the version notes are your audit trail and rollback map.

### 6.5 dataLayer **event** naming conventions

The convention aligns with **GA4 event naming**, so the same names flow end-to-end:

- **`snake_case`** — all lowercase, words joined by underscores. `object_action` pattern is idiomatic (noun_verb): `product_viewed`, `form_submitted`, `button_click`, `generate_lead`, `view_search_results`, `scroll_25`.
- **Start with a letter**; only letters, numbers, underscores; **no spaces, hyphens, or special characters**.
- **Case-sensitive** (`event_name` ≠ `Event_Name`).
- **Max 40 characters** for GA4 event names.
- **Reserve GTM's `gtm.*` namespace** — don't push your own `gtm.` events; those are GTM-internal.
- **Prefixing** for clarity/segmentation is common (e.g. a product/team prefix) — but keep it consistent, since GA4 forbids the `ga_`, `google_`, `firebase_` reserved prefixes.
- **Parameters:** same `snake_case` rule (`page_location`, `page_title`, `member_level`). Match parameter names to your GA4 custom-dimension registrations.
- **UTM values:** always **lowercase** to avoid report duplication.

### 6.6 Quick reference — canonical prefix cheat sheet

```
TAGS       <Platform> <Kind> – <action> – <context>   e.g. GA4 Event – generate_lead – contact form
TRIGGERS   <Type> – <name/condition> – <context>       e.g. CE – form_submitted – Contact Form
                                                        Blocking – … / Exception – … for exceptions
VARIABLES  <prefix> – <purpose>
           dlv | cjs | js | chtml | lt/lookup | regex | const | cookie/1pc | url | aev | dom
EVENTS     snake_case, object_action, ≤40 chars, letter-first, no gtm./ga_/google_/firebase_ prefixes
```

---

## Sources

- **Official — Tag Manager / Tag Platform (Google for Developers):**
  - dataLayer reference: `https://developers.google.com/tag-platform/tag-manager/datalayer`
  - Server-side intro: `https://developers.google.com/tag-platform/tag-manager/server-side/intro`
  - Server-side overview: `https://developers.google.com/tag-platform/tag-manager/server-side/overview`
  - Server-side release notes: `https://developers.google.com/tag-platform/tag-manager/server-side/release-notes`
  - Consent mode setup: `https://developers.google.com/tag-platform/security/guides/consent`
- **Official — Tag Manager Help (support.google.com):**
  - Set up GA in Tag Manager: `https://support.google.com/tagmanager/answer/9442095`
  - Google tag and Tag Manager (GA4 Config → Google tag): `https://support.google.com/tagmanager/answer/13543899`
  - Install / create container: `https://support.google.com/tagmanager/answer/6103696`
  - Consent mode reference (Google Ads): `https://support.google.com/google-ads/answer/13802165`
- **Simo Ahava (simoahava.com):**
  - Server-side tagging in GTM: `https://www.simoahava.com/analytics/server-side-tagging-google-tag-manager/`
  - Variable guide for GTM: `https://www.simoahava.com/analytics/variable-guide-google-tag-manager/`
  - GTM Workspaces: `https://www.simoahava.com/analytics/google-tag-manager-workspaces/`
  - The Google Tag template in GTM: `https://www.simoahava.com/analytics/google-tag-template-in-google-tag-manager/`
  - Consent Mode v2 for Google tags: `https://www.simoahava.com/analytics/consent-mode-v2-google-tags/`
- **Community naming conventions:**
  - Analytics Mania — GTM & GA4 naming conventions: `https://www.analyticsmania.com/post/google-analytics-and-google-tag-manager-naming-conventions/`
  - MeasureSchool — GTM & GA4 naming conventions: `https://measureschool.com/gtm-and-ga4-naming-conventions/`
  - Optimize Smart — GA4/GTM/sGTM naming checklist: `https://www.optimizesmart.com/ga4-gtm-and-sgtm-naming-conventions-checklist/`

> **Caveat:** the GTM `<head>` + `<noscript>` snippet is the long-standard, stable form; for a byte-exact copy, pull it from a live container's Admin → Install Google Tag Manager screen.
