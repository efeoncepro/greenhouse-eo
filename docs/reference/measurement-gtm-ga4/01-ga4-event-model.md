# Google Analytics 4 (GA4) — Event Data Model & Naming Conventions

> **Durable engineering reference.** Current as of 2026, based on official Google Analytics Help (`support.google.com/analytics`) and Google for Developers (`developers.google.com/analytics`, `developers.google.com/tag-platform`) documentation. Every non-obvious claim is cited in the **Sources** section.

---

## 0. The GA4 data model in one paragraph

GA4 is an **event-based** model (there are no "pageview hits" vs "event hits" like Universal Analytics — *everything* is an event). Every interaction is an **event** with a `name` and an optional set of **parameters** (key/value pairs). Events belong to a **session** and are attributed to a **user** (who can carry **user properties**). Some parameters describe **items** (the ecommerce products array). To *report* on a custom parameter or user property in the GA4 UI you must **register it as a custom dimension/metric**. Events you care about commercially are flagged as **key events** (the 2024 rename of "conversions").

```
User (user_id / client_id, user_properties)
 └─ Session (session_start … derived by GA4)
     └─ Event (name + params)
         ├─ default/auto params (page_location, ga_session_id, …)
         ├─ custom params (event-scoped → custom dimension/metric)
         └─ items[] (ecommerce) → item-scoped params
```

---

## 1. Event categories

GA4 defines **four** kinds of events. Only **recommended** and **custom** events require you to write code; the first two are collected for you.

| Category | Who names it | Code required | Counts toward the 500-event app cap? |
|---|---|---|---|
| **Automatically collected** | Google | No | No |
| **Enhanced measurement** | Google | No (toggle in UI) | No |
| **Recommended** | Google (predefined names, you implement) | Yes | Yes |
| **Custom** | You | Yes | Yes |

> Automatically collected + enhanced measurement events **do not count** toward event/parameter limits. ([Event collection limits](https://support.google.com/analytics/answer/9267744))

### 1.1 Automatically collected events (full list)

Collected as long as the Google tag (web) or the Firebase SDK (app) is present. Platform column: **Web** = gtag/GTM, **App** = Firebase SDK (Android/iOS).

| Event name | Platform | Trigger |
|---|---|---|
| `ad_click` | App | User clicks an ad (AdMob / Ad Manager) |
| `ad_exposure` | App | ≥1 ad from the Mobile Ads SDK is on screen |
| `ad_impression` | App | User sees an ad impression |
| `ad_query` | App | Ad request made by the Mobile Ads SDK |
| `ad_reward` | App | A rewarded ad grants a reward |
| `adunit_exposure` | App | An ad unit is displayed on screen |
| `app_clear_data` | App (Android) | User resets / clears app data & settings |
| `app_exception` | App | App crashes or throws an exception |
| `app_remove` | App (Android) | App package uninstalled |
| `app_store_refund` | App (Android) | In-app purchase refunded via Google Play |
| `app_store_subscription_cancel` | App (Android) | Paid subscription cancelled in Google Play |
| `app_store_subscription_convert` | App | Free-trial subscription converts to paid |
| `app_store_subscription_renew` | App | Paid subscription renews |
| `app_update` | App | App updated to a new version and relaunched |
| `click` | Web | User clicks a link leaving the current domain (outbound) |
| `dynamic_link_app_open` | App | App re-opened via a dynamic link |
| `dynamic_link_app_update` | App (Android) | App updated and opened via a dynamic link |
| `dynamic_link_first_open` | App | App opened for the first time via a dynamic link |
| `error` | App | Event failed to log due to invalid format |
| `file_download` | Web | User clicks a link to a common file type |
| `firebase_campaign` | App | App launches with campaign parameters |
| `firebase_in_app_message_action` / `fiam_action` | App | User acts on a Firebase In-App Message |
| `firebase_in_app_message_dismiss` / `fiam_dismiss` | App | User dismisses a Firebase In-App Message |
| `firebase_in_app_message_impression` / `fiam_impression` | App | User views a Firebase In-App Message |
| `first_open` | App | First launch after install/reinstall |
| `first_visit` | Web / App | First website visit (or Android instant-app first launch) |
| `form_start` | Web | First interaction with a form in a session |
| `form_submit` | Web | User submits a form |
| `in_app_purchase` | App | User completes an in-app purchase |
| `notification_dismiss` | App (Android) | User dismisses an FCM notification |
| `notification_foreground` | App | FCM notification received while app in foreground |
| `notification_open` | App | User opens an FCM notification |
| `notification_receive` | App (Android) | FCM notification received while app in background |
| `os_update` | App | Device OS updated |
| `page_view` | Web | Page loads or the browser history state changes |
| `screen_view` | App | Screen transition occurs |
| `scroll` | Web | User reaches 90% vertical depth |
| `session_start` | Web / App | User engages with the site/app |
| `user_engagement` | Web / App | App in foreground / page in focus ≥1 second |
| `video_start` / `video_progress` / `video_complete` | Web | Embedded YouTube (JS API) start / 10-25-50-75% / end |
| `view_search_results` | Web | Site search performed (URL query parameter) |

> `page_view`, `scroll`, `click`, `file_download`, `form_start`, `form_submit`, `video_*`, `view_search_results` are technically **enhanced-measurement** events on web (see §1.2). Google lists them on both pages. Source: [Automatically collected events](https://support.google.com/analytics/answer/9234069).

### 1.2 Enhanced measurement events (web) — full list + defaults

Enhanced measurement is a **web-stream toggle** (Admin → Data streams → Web stream → Enhanced measurement). When enabled, GA4 collects the following **without extra code**. Each row is **on by default** when enhanced measurement is on; every option **except `page_view`** can be individually toggled off.

| Event(s) | On by default | Trigger | Key parameters collected |
|---|---|---|---|
| `page_view` | ✅ (cannot be disabled) | Page load or History API state change (advanced setting toggles pushState/popState/replaceState) | `page_location`, `page_referrer` |
| `scroll` | ✅ (toggleable) | First time the user reaches **90%** vertical depth | `engagement_time_msec` (populates *Percent scrolled*) |
| `click` (outbound) | ✅ (toggleable) | Click on a link leaving the current domain | `link_classes`, `link_domain`, `link_id`, `link_url`, `outbound` (bool) |
| `view_search_results` | ✅ (toggleable) | Site-search results page reached via query param | `search_term`, optional `q_<key>`. Default query keys: `q`, `s`, `search`, `query`, `keyword` |
| `video_start`, `video_progress`, `video_complete` | ✅ (toggleable) | Embedded YouTube video (JS API on): start / 10-25-50-75% / end | `video_current_time`, `video_duration`, `video_percent`, `video_provider`, `video_title`, `video_url`, `visible` (bool) |
| `file_download` | ✅ (toggleable) | Click on a link to a document/exe/presentation/archive/media | `file_extension`, `file_name`, `link_classes`, `link_id`, `link_text`, `link_url` |
| `form_start`, `form_submit` | ✅ (toggleable) | First form interaction / form submission | `form_id`, `form_name`, `form_destination` (+ `form_submit_text` on submit) |

**`file_download` matched extensions:** `pdf, xlsx, xls, docx, doc, txt, rtf, csv, exe, key, pps, ppt, pptx, 7z, pkg, rar, gz, zip, avi, mov, mp4, mpeg, mpe, wmv, midi, mid, mp3, wav, wma`.

> To use enhanced-measurement parameters (e.g. `form_id`, `video_title`, `link_url`) as report dimensions you must **register them as custom dimensions** (§6). Source: [Enhanced measurement events](https://support.google.com/analytics/answer/9216061).

### 1.3 Recommended events (full catalog by vertical)

Recommended events have **predefined names + parameters** but you must implement them. Using the canonical names unlocks current and future reporting features; **inventing your own name for the same concept blocks those features**. ([Recommended events](https://support.google.com/analytics/answer/9267735))

**A. All properties (general)**

| Event | When to use |
|---|---|
| `ad_impression` | User sees an ad (apps only) |
| `earn_virtual_currency` | Earns coins/gems/tokens |
| `generate_lead` | Submits a form / request for info |
| `join_group` | Joins a group |
| `login` | Logs in |
| `purchase` | Completes a purchase |
| `refund` | Receives a refund |
| `search` | Searches your site/app |
| `select_content` | Selects content |
| `share` | Shares content |
| `sign_up` | Signs up for an account |
| `spend_virtual_currency` | Spends virtual currency |
| `tutorial_begin` | Begins onboarding tutorial |
| `tutorial_complete` | Completes onboarding tutorial |

**B. Retail / Ecommerce** (these also cover travel, jobs, real estate, education — those verticals reuse the ecommerce events; there is **no** separate event set per vertical)

| Event | When to use |
|---|---|
| `add_payment_info` | Submits payment info during checkout |
| `add_shipping_info` | Submits shipping info during checkout |
| `add_to_cart` | Adds items to cart |
| `add_to_wishlist` | Adds items to wishlist |
| `begin_checkout` | Begins checkout |
| `purchase` | Completes a purchase |
| `refund` | Receives a refund |
| `remove_from_cart` | Removes items from cart |
| `select_item` | Selects an item from a list |
| `select_promotion` | Selects a promotion |
| `view_cart` | Views the cart |
| `view_item` | Views an item |
| `view_item_list` | Views a list of items |
| `view_promotion` | Views a promotion |

> All ecommerce events carry the **`items[]`** array (item-scoped params — §2.3).

**C. Online sales / Lead generation** (the "leads" lifecycle)

| Event | When to use |
|---|---|
| `generate_lead` | Submits a form (online) or info (offline) |
| `qualify_lead` | Marked as fitting qualified-lead criteria |
| `working_lead` | Contacts or is contacted by a rep |
| `disqualify_lead` | Marked as disqualified |
| `close_convert_lead` | Became a converted lead (customer) |
| `close_unconvert_lead` | Marked as not converting |

**D. Games**

| Event | When to use |
|---|---|
| `earn_virtual_currency` | Earns virtual currency |
| `join_group` | Joins a group |
| `level_start` | Starts a level |
| `level_end` | Completes a level |
| `level_up` | Levels up |
| `post_score` | Posts a score |
| `select_content` | Selects content |
| `spend_virtual_currency` | Spends virtual currency |
| `tutorial_begin` | Begins a tutorial |
| `tutorial_complete` | Completes a tutorial |
| `unlock_achievement` | Unlocks an achievement |

### 1.4 Custom events

Events you define with your own name + parameters when no automatic/enhanced/recommended event fits. **Only create a custom event when no recommended event covers the interaction** — custom events don't get out-of-the-box reporting and count toward the app 500-event cap. Custom event parameters must be **registered as custom dimensions/metrics** to appear in reports (§6).

---

## 2. Event parameters

Parameters are the key/value pairs attached to an event's `params` object. They give events their descriptive detail (which page, which product, how long, etc.).

### 2.1 Default / automatically-collected parameters

GA4 attaches a set of parameters to **every** event with no code. Notable ones (non-exhaustive): `language`, `page_location`, `page_referrer`, `page_title`, `screen_resolution`, `ga_session_id`, `ga_session_number`, `engagement_time_msec`, plus device/geo/traffic-source fields resolved server-side. These occupy their own budget and **do not** count against your 25 custom-parameter limit.

### 2.2 Custom parameters

Any extra key you add to `params`. Event-scoped custom parameters cost against the **25-parameters-per-event** limit. **Collecting a parameter is not the same as reporting on it** — an unregistered custom parameter is stored but invisible in standard reports/Explorations until you register it as a custom dimension (text) or custom metric (number). See §6.

```js
// gtag.js — event with default + custom params
gtag('event', 'purchase', {
  transaction_id: 'T_12345',   // recommended param
  value: 59900,                // recommended param (number)
  currency: 'CLP',             // recommended param
  coupon: 'WELCOME10',         // custom param → register as custom dimension
  items: [ /* item-scoped, see 2.3 */ ]
});
```

### 2.3 Item-scoped parameters (the ecommerce `items` array)

Ecommerce events carry an **`items`** array; each element describes one product and holds **item-scoped** parameters. Prefixed item fields (`item_id`, `item_name`, `item_brand`, `item_category` … `item_category5`, `item_variant`, `price`, `quantity`, `index`, `affiliation`, `coupon`, `discount`, `location_id`, `item_list_id`, `item_list_name`) are standard. You may add **up to 27 item-level custom parameters** per ecommerce event. Item-scoped custom dimensions (max 10 standard) are how you report on custom item fields like `item_color` or `item_size`.

```js
items: [{
  item_id: 'SKU_9876',
  item_name: 'Camiseta Efeonce',
  item_brand: 'Efeonce',
  item_category: 'Apparel',
  price: 19990,
  quantity: 2,
  item_color: 'olive'   // item-scoped custom → register as item-scoped custom dimension
}]
```

---

## 3. ⚠️ Naming rules & hard limits (priority section)

### 3.1 Event & parameter name format rules

Applies to **event names, parameter names, and item-parameter names**:

- **Must start with a letter** (alphabetic character). ✗ `2fa_start` ✗ `_promo`
- **Only letters, numbers, and underscores.** No spaces, no hyphens, no dots, no accents/emoji. ✗ `add to cart` ✗ `add-to-cart` ✗ `añadir`
- **Case sensitive.** `my_event` and `My_Event` are **distinct** events. Convention: **`snake_case`, all lowercase** (Google's own events use this; not strictly required but strongly advised to avoid accidental duplicates like `timePlayed` vs `timeplayed`).

### 3.2 Hard length limits

| Item | Limit (standard property) | 360 |
|---|---|---|
| **Event name** | **40 characters** | 40 |
| **Parameter name** (incl. item params) | **40 characters** | 40 |
| **Parameter value** | **100 characters** | **500 characters** |
| — `page_title` value | 300 characters | 300 |
| — `page_referrer` value | 420 characters | 420 |
| — `page_location` value | 1,000 characters | 1,000 |
| **User property name** | **24 characters** | 24 |
| **User property value** | **36 characters** | 36 |
| **User-ID value** | 256 characters | 256 |

> Values exceeding the limit are **truncated** (not rejected). Names exceeding the limit / breaking format rules cause the event or parameter to be **dropped**.

### 3.3 Per-scope count limits

| Item | Limit |
|---|---|
| Event parameters per event | **25** |
| Item-level (item-scoped) custom parameters per ecommerce event | **up to 27** |
| Distinctly named events — **web** stream | **No limit** |
| Distinctly named events — **app** stream | **500 per app** (per app user) |
| User properties per property | **25** |
| Distinct sessions per user per day | 2,000 |
| Events per user per day | 100,000 |
| Conversions (key events) per user per day | 10,000 |

> Automatically collected & enhanced-measurement events/params **don't count** toward these limits.

### 3.4 Reserved event names (cannot be used for custom events — web)

```
ad_impression, app_remove, app_store_refund,
app_store_subscription_cancel, app_store_subscription_renew,
click, error, file_download, first_open, first_visit,
form_start, form_submit, in_app_purchase, page_view, scroll,
session_start, user_engagement, video_complete, video_progress,
video_start, view_search_results
```

App streams additionally reserve the Firebase auto-event names (`ad_click`, `ad_exposure`, `ad_query`, `adunit_exposure`, `app_clear_data`, `app_update`, `notification_*`, `os_update`, `screen_view`, `dynamic_link_*`, etc. — see §1.1). You **may** reuse an automatically-collected name only in the context of GA4's "create/modify event" tooling, but never as a fresh custom event name.

### 3.5 Reserved prefixes (names may NOT begin with)

```
_          (leading underscore)
ga_
google_
firebase_
gtag.
query_id   (reserved for web)
```

### 3.6 Reserved parameter names (cannot be used for custom params / custom dimensions)

```
cid, currency*, customer_id, customerid, dclid, gclid,
session_id, sessionid, sfmc_id, sid, srsltid, uid,
user_id, userid
```
*(`currency` is reserved as a standard ecommerce parameter — use it with its intended meaning; don't repurpose it.)*
Also avoid redefining GA4's own auto params (`page_location`, `page_referrer`, `page_title`, `engagement_time_msec`) — your values get mixed with GA4's, corrupting reports.

### 3.7 Reserved user property names

```
cid, customer_id, customerid, first_open_after_install,
first_open_time, first_visit_time,
google_allow_ad_personalization_signals,
last_advertising_id_reset, last_deep_link_referrer, last_gclid,
lifetime_user_engagement, non_personalized_ads,
session_id, session_number, sessionid, sfmc_id, sid, uid,
user_id, userid
```

Source for §3.4–3.7: [Event naming rules](https://support.google.com/analytics/answer/13316687).

---

## 4. User properties

**User properties** describe segments of your user base (e.g. `membership_tier`, `preferred_language`) and are attached to the **user**, not the event.

| Rule | Value |
|---|---|
| Max user properties per property | **25** |
| Name length | **≤ 24 characters** |
| Value length | **≤ 36 characters** |
| Name format | Same as events: start with a letter, letters/numbers/underscores, case-sensitive |
| Reserved names | See §3.7 |
| Reserved prefixes | `_`, `ga_`, `google_`, `firebase_` (§3.5) |
| Reporting | Must be **registered as a user-scoped custom dimension** to appear in reports (§6) |

> Do **not** collect PII (names, emails, precise addresses) in user properties or any parameter — it violates the GA4 Terms of Service. Use hashed/pseudonymous identifiers.

```js
gtag('set', 'user_properties', {
  membership_tier: 'gold'   // → register as user-scoped custom dimension
});
```

---

## 5. Key events (formerly "conversions")

### 5.1 The 2024 rename

On **March 27, 2024** Google renamed GA4 **"conversions" → "key events."** Since then:

- **Key event** = an event you've marked as important in **GA4** (the analytics-side signal).
- **Conversion** = a key event you've **imported into Google Ads** to optimize/measure campaigns. The word "conversion" now belongs to the **Google Ads** side; the two systems can count differently (GA4 key events are session/attribution-modeled; Ads conversions follow Ads attribution).

### 5.2 How an event becomes a key event

Admin → **Data display → Events** (or **Key events**) → toggle **"Mark as key event"** on the event row. Any event — automatic, enhanced, recommended, or custom — can be marked. Certain recommended events (e.g. `purchase`) may be pre-marked.

- Limit: **30 key events per property** (standard; §7).
- The mark takes effect going forward (not retroactive to historical data).

### 5.3 Counting methods

Set per key event (three-dot menu on the key-event row):

| Method | Behavior | Default |
|---|---|---|
| **Once per event** | Counts **every** occurrence. Form submitted twice in a session → count = 2. | ✅ Google-recommended default for new key events |
| **Once per session** | Counts **at most once** per session even if it fires multiple times → count = 1. | — |

---

## 6. Custom dimensions & metrics

Registering is what makes a collected custom parameter / user property **queryable in reports and Explorations**. Collecting ≠ reporting: an unregistered custom parameter is stored but shows up only in BigQuery export or as "(not set)" in the UI.

### 6.1 Scopes

| Scope | Backed by | Use for |
|---|---|---|
| **Event-scoped** | a custom **event parameter** | Details of a single action (e.g. `form_id`, `button_label`) |
| **User-scoped** | a custom **user property** | Persistent user attribute (e.g. `membership_tier`) |
| **Item-scoped** | an **item-array** parameter | Ecommerce product attribute (e.g. `item_color`, `item_size`) |

- **Custom dimension** = a **text/categorical** parameter.
- **Custom metric** = a **numeric** parameter (with a unit: standard, currency, distance, time).

### 6.2 Why registration is mandatory

You must "create a custom dimension or metric so you can analyze the data from the event parameter or user property." Until you register it, the parameter is collected on the event but **cannot be selected as a dimension/metric** in standard reports or Explorations. Registration is **not retroactive** — data appears only from the registration date forward (though the raw parameter exists in the BigQuery export from day one).

### 6.3 Quotas

| Type | Standard property | 360 property |
|---|---|---|
| Event-scoped custom dimensions | **50** | 125 |
| User-scoped custom dimensions | **25** | 100 |
| Item-scoped custom dimensions | **10** | 25 |
| Custom metrics (event-scoped) | **50** | 125 |
| Calculated metrics | 5 | 50 |

> You can **archive** unused custom dimensions/metrics to free quota; archiving preserves historical data but stops it appearing in reports. Sources: [Custom dimensions & metrics](https://support.google.com/analytics/answer/14240153), [Configuration limits](https://support.google.com/analytics/answer/12229528).

---

## 7. Property configuration limits (reporting/config side)

| Configuration item | Standard | Archivable |
|---|---|---|
| Key events | **30** | Yes |
| Audiences | 100 | Yes |
| Event-scoped custom dimensions | 50 | Yes |
| User-scoped custom dimensions | 25 | Yes |
| Item-scoped custom dimensions | 10 | Yes |
| Custom metrics | 50 | Yes |
| Calculated metrics | 5 | — |
| Custom Insights | 50 | Yes |
| Explorations per user | 200 | Yes |
| Explorations shared | 500 | — |
| Google Ads links | 400 | Yes |
| Data retention (event-level) | up to 14 months | — |

> "If you need higher limits, upgrade the property to Google Analytics 360." Source: [Configuration limits](https://support.google.com/analytics/answer/12229528).

---

## 8. Measurement Protocol (server-side event sending) — basics

The **Measurement Protocol (MP) for GA4** lets a server (or any HTTP client) send events directly to GA4 without gtag.js/the SDK. Used for server-side events, offline conversions, backend purchase confirmations, and CRM/lead-lifecycle events.

### 8.1 Endpoint & auth

```
POST https://www.google-analytics.com/mp/collect
     ?api_secret=<API_SECRET>
     &measurement_id=<G-XXXXXXX>       # web streams
     # (or) &firebase_app_id=<APP_ID>  # app streams
```

- **EU data collection:** `https://region1.google-analytics.com/mp/collect`.
- `api_secret` is generated in **Admin → Data streams → Measurement Protocol API secrets**. **Server-side only** — never expose it in client code.

### 8.2 Request body shape

```json
{
  "client_id": "1234567.7654321",
  "user_id": "member_9f2c",
  "timestamp_micros": 1751846400000000,
  "user_properties": {
    "membership_tier": { "value": "gold" }
  },
  "events": [
    {
      "name": "generate_lead",
      "params": {
        "value": 250000,
        "currency": "CLP",
        "lead_source": "landing_agencia"
      }
    }
  ]
}
```

### 8.3 MP limits

| Constraint | Limit |
|---|---|
| Events per request (`events[]`) | **25** |
| Event name length | 40 chars |
| Parameters per event | 25 |
| Parameter name / value length | 40 / 100 (500 for 360) chars |
| User property name / value length | 24 / 36 chars |
| POST body size | **< 130 KB** |
| Backdate window (`timestamp_micros`) | up to **72 hours** |
| Non-key-event requests | 100M / hour / property |

### 8.4 Validation / debug

Use the debug endpoint to validate payloads **before** production (it returns a `validationMessages` array; it does **not** ingest data):

```
POST https://www.google-analytics.com/debug/mp/collect  (same query params + body)
```

### 8.5 MP vs gtag.js

- **gtag.js / GTM** = client-side; browser resolves device/geo/session automatically; no `api_secret`.
- **MP** = server-side; you must supply `client_id`/`app_instance_id` yourself and authenticate with `api_secret`; GA4 still stitches sessions if the `client_id` matches a web session. MP is **not** a full mirror of gtag — some auto params (screen resolution, referrer) won't exist unless you pass them.

---

## Sources

**Google Analytics Help (`support.google.com/analytics`)**
- [About events (event model + 4 categories)](https://support.google.com/analytics/answer/9322688)
- [Automatically collected events](https://support.google.com/analytics/answer/9234069)
- [Enhanced measurement events](https://support.google.com/analytics/answer/9216061)
- [Recommended events (catalog by vertical)](https://support.google.com/analytics/answer/9267735)
- [Event naming rules (reserved names, prefixes, format, case sensitivity)](https://support.google.com/analytics/answer/13316687)
- [Event collection limits (character + count limits)](https://support.google.com/analytics/answer/9267744)
- [Configuration limits (key events, custom dims/metrics, audiences)](https://support.google.com/analytics/answer/12229528)
- [About custom dimensions and metrics (scopes + quotas)](https://support.google.com/analytics/answer/14240153)
- [Analytics event parameters (parameter reference table)](https://support.google.com/analytics/table/13594742)

**Google for Developers (`developers.google.com/analytics`)**
- [Set up events (gtag)](https://developers.google.com/analytics/devguides/collection/ga4/events)
- [Set up event parameters](https://developers.google.com/analytics/devguides/collection/ga4/event-parameters)
- [Recommended events reference (names + params)](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
- [Measurement Protocol overview](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
- [Send Measurement Protocol events](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events)
- [Measurement Protocol — Events reference](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events)
- [Measurement Protocol — reference (limits)](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference)
- [Send user properties (Measurement Protocol)](https://developers.google.com/analytics/devguides/collection/protocol/ga4/user-properties)
- [Validate events (debug endpoint)](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)

**Google Tag Platform (`developers.google.com/tag-platform`)**
- [Google tag (gtag.js) API reference — `event` command](https://developers.google.com/tag-platform/gtagjs/reference)
- [Data Manager API — recommended events](https://developers.google.com/data-manager/api/reference/analytics/recommended-events)

> **Maintainer verification notes:** (1) The "2024 rename" (conversions → key events, 2024-03-27) — confirm current wording on the live [Key events help page](https://support.google.com/analytics/answer/9267568). (2) Item-scoped custom-parameter cap "up to 27" is on the [Event collection limits](https://support.google.com/analytics/answer/9267744) page; item-scoped **custom dimension** quota is separately 10 (standard). (3) Canonical event name is **`video_complete`** (not `view_complete`).
