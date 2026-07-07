# Google Analytics Admin API (GA4) — Operator Reference

> Programmatic GA4 configuration via the **Admin API v1** (`analyticsadmin.googleapis.com`): data streams + Measurement ID resolution, custom dimensions/metrics, key events, Measurement Protocol secrets, discovery, access bindings, and a lead-gen setup blueprint. Consumed by the skill `greenhouse-gtm-ga4-operator`.
> **Host:** `https://analyticsadmin.googleapis.com` · **Versions:** `v1beta` (stable — everything below) / `v1alpha` (SGTM containers, data retention, audiences). Use `v1beta` unless you need an alpha-only resource.
> **Greenhouse:** property `486264460` (efeoncepro.com), GA4 account `252968286`. Client: `src/lib/growth/ga4/api-client.ts` (extend with the write calls below).

---

## 0. Mental model

| Concept | GA4 term | Resource | Notes |
|---|---|---|---|
| Container of properties | **Account** | `accounts/{account}` | Billing/org boundary |
| Measurement unit | **Property** | `properties/{property}` | `{property}` = numeric ID (`486264460`) |
| Web/app tag target | **Data stream** | `properties/{p}/dataStreams/{s}` | Holds the **Measurement ID (`G-XXXXXXX`)** |
| Registered param | **Custom dimension/metric** | `properties/{p}/customDimensions`, `customMetrics` | Makes a param reportable |
| Conversion | **Key event** (renamed 2024) | `properties/{p}/keyEvents/{k}` | |
| Server-side event key | **MP API secret** | `.../dataStreams/{s}/measurementProtocolSecrets/{mps}` | Belongs to a stream |
| Permissions | **Access binding** | `.../accessBindings/{b}` | Granted **in GA4**, not GCP IAM |

**The property ID is NOT the Measurement ID.** `properties/486264460` is the property; the `G-XXXXXXX` lives inside a web data stream (§1).

---

## 1. Data streams → resolving the Measurement ID (`G-XXXXXXX`)

**The critical operation** (Efeonce pending item): confirm which `G-XXXXXXX` belongs to property `486264460`.

**Path:** `properties/{property}/dataStreams/{dataStream}` · key field `webStreamData.measurementId` (**output-only**).

```http
GET https://analyticsadmin.googleapis.com/v1beta/properties/486264460/dataStreams
Authorization: Bearer <token>
```

Response (trimmed):
```json
{
  "dataStreams": [{
    "name": "properties/486264460/dataStreams/987654321",
    "type": "WEB_DATA_STREAM",
    "displayName": "efeoncepro.com",
    "webStreamData": { "measurementId": "G-XXXXXXXXXX", "defaultUri": "https://efeoncepro.com" }
  }]
}
```

**Recipe:** `accountSummaries.list` → for each property `dataStreams.list` → filter `type == WEB_DATA_STREAM` → read `webStreamData.measurementId`. A property can have **multiple** web streams — disambiguate on `defaultUri`. `measurementId` is output-only (GA4 assigns it on stream creation).

> **Efeonce action:** run this against `486264460` to confirm whether the live container's `G-KYPPY57M14` is this property's stream, or whether the site's `GT-KV5CNNKQ` (Site Kit) points elsewhere. Only then wire GA4 Event tags.

---

## 2. Custom dimensions & metrics

Registering a parameter is what makes it **queryable** in reports/Data API. Collecting ≠ reporting: an unregistered param is stored (25/event) but invisible beyond the 30-min realtime/DebugView window. **No backfill** — reporting starts from registration forward.

**Paths:** `properties/{p}/customDimensions`, `properties/{p}/customMetrics`

### 2.1 CustomDimension fields
`parameterName` (immutable, required; ≤40 event / ≤24 user chars) · `displayName` (required, ≤82) · `description` (≤150) · `scope` (`EVENT`|`USER`|`ITEM`, required, immutable) · `disallowAdsPersonalization` (user-scoped only).

**Create (register `form_slug` event-scoped):**
```http
POST /v1beta/properties/486264460/customDimensions
{ "parameterName": "form_slug", "displayName": "Form Slug",
  "description": "Stable identifier of the form/CTA submitted", "scope": "EVENT" }
```

**List:** `GET .../customDimensions` · **Archive (frees slot, no hard delete):** `POST .../customDimensions/{id}:archive` `{}` · **Patch:** `PATCH .../customDimensions/{id}?updateMask=displayName,description`.

### 2.2 CustomMetric
`parameterName` (immutable, ≤40) · `displayName` (≤82) · `measurementUnit` (`STANDARD`|`CURRENCY`|`MILLISECONDS`|`SECONDS`|…) · `scope` (`EVENT` only) · `restrictedMetricType` (`COST_DATA`|`REVENUE_DATA`).

```http
POST /v1beta/properties/486264460/customMetrics
{ "parameterName": "lead_score", "displayName": "Lead Score", "measurementUnit": "STANDARD", "scope": "EVENT" }
```

### 2.3 Quotas (per property)

| Slot | Standard | 360 |
|---|---|---|
| Event-scoped custom dimensions | **50** | 125 |
| User-scoped custom dimensions | **25** | 100 |
| Item-scoped custom dimensions | **10** | 25 |
| Custom metrics (event-scoped) | **50** | 125 |

Archiving frees the slot immediately, but **wait ~48h after archiving before adding a new one if at cap**; historical values are not restored on re-add. Register sparingly.

---

## 3. Key events (conversions — renamed 2024)

Resource `keyEvents` (old `conversionEvents` deprecated). **Path:** `properties/{p}/keyEvents/{k}`.
Fields: `eventName` (immutable, required) · `countingMethod` (`ONCE_PER_EVENT`|`ONCE_PER_SESSION`, required) · `defaultValue` `{numericValue, currencyCode}` · `custom`/`deletable` (output-only).

```http
POST /v1beta/properties/486264460/keyEvents
{ "eventName": "generate_lead", "countingMethod": "ONCE_PER_EVENT",
  "defaultValue": { "numericValue": 50, "currencyCode": "CLP" } }
```

`GET/DELETE/PATCH .../keyEvents/{k}`. Limit: **30 key events / property**. For lead-gen, `ONCE_PER_EVENT` on form submits (multi-form sessions count each).

---

## 4. Measurement Protocol API secrets (server-side)

To send events server-side via the MP you need an `api_secret` bound to a **data stream**.
**Path:** `properties/{p}/dataStreams/{s}/measurementProtocolSecrets/{mps}` · fields `displayName` (required), `secretValue` (output-only).

```http
POST /v1beta/properties/486264460/dataStreams/987654321/measurementProtocolSecrets
{ "displayName": "server-side-crm-bridge" }
```
Response includes `secretValue` — treat as a secret (store via Secret Manager; see skill `greenhouse-secret-hygiene`). Then POST to `https://www.google-analytics.com/mp/collect?measurement_id=G-…&api_secret=<secretValue>`. **`measurement_id` (from §1) + `api_secret` belong to the same stream.**

---

## 5. Discovery + access bindings

- **`accountSummaries.list`** (`GET /v1beta/accountSummaries`) → every account + property you can see; best first call.
- List properties under an account: `GET /v1beta/properties?filter=parent:accounts/{a}` (the `filter` is required).
- **Access bindings** (permissions live in GA4, not GCP IAM): `properties/{p}/accessBindings`, fields `user` (email or SA), `roles` (`predefinedRoles/viewer|analyst|editor|admin` + `no-cost-data`/`no-revenue-data`).

```http
POST /v1beta/properties/486264460/accessBindings
{ "user": "greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com",
  "roles": ["predefinedRoles/editor"] }
```
> Efeonce's SA is currently **Viewer**. To register custom dimensions / key events via the Admin API it needs **`predefinedRoles/editor`** on the property — upgrade in GA4 (Property Access Management) or via `accessBindings.patch` from an admin identity. Batch variants: `batchCreate/batchGet/batchUpdate/batchDelete`.

---

## 6. Best-practice GA4 setup for a B2B lead-gen site (Efeonce blueprint)

### 6.1 Key events
| eventName | Why | countingMethod |
|---|---|---|
| `generate_lead` | GA4 **recommended** lead event — primary conversion | `ONCE_PER_EVENT` |
| `sign_up` | Account/trial/newsletter signups | `ONCE_PER_EVENT` |
| `contact` (custom) | "contact us" distinct from gated leads (optional) | `ONCE_PER_EVENT` |

Prefer recommended names over invented ones. Attach `value`+`currency` so lead value flows to Ads.

### 6.2 Custom dimensions to register (the forms/CTA program)
| parameterName | scope | Purpose |
|---|---|---|
| `form_slug` | EVENT | Stable form/CTA id — the join key to the forms registry/CRM |
| `form_kind` | EVENT | Taxonomy (`diagnostic_intake`, `quote_request`, `lead_magnet`) |
| `surface_id` | EVENT | Where it rendered (landing route/component) |
| `cta_location` | EVENT | Which CTA drove it (`hero`, `sticky_footer`…) |

Fire as event params on `generate_lead`. Register only what you'll report on (budget 50). `parameterName` ≤40 chars, `snake_case`, identical to what the tag emits.

### 6.3 Property config checklist
| Setting | Recommendation |
|---|---|
| **Consent Mode** | Deploy v2 (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization`); advanced mode + modeling for EU. |
| **Data retention** | Set event retention to **14 months** (default 2 is too short). Admin API `v1alpha` `dataRetentionSettings`. |
| **BigQuery export** | **Enable** (daily + streaming) — raw event-level analysis, CRM joins, unlimited retention. `properties.bigQueryLinks`. |
| **Enhanced Measurement** | Keep on; useful toggles: page views, scrolls, outbound clicks, site search, form interactions, file downloads, video. Disable noise that duplicates explicit events. |
| **Google Ads link** | Link + import `generate_lead`/`sign_up` for bidding. |
| **Internal traffic / referral exclusions** | Filter internal IPs; add self-referral/payment domains. |

### 6.4 End-to-end wiring for the forms program
1. Resolve the property's **Measurement ID** (§1) → configure the GA4 Event tag.
2. Register `form_slug`, `form_kind`, `surface_id`, `cta_location` as event-scoped custom dimensions (§2).
3. On submit, fire `generate_lead` with those params + `value`/`currency`.
4. Mark `generate_lead` (+`sign_up`) as **key events** (§3).
5. For CRM-side qualification (SQL/won), send server-side events via **Measurement Protocol** (§4), joined on `client_id` + `form_slug`.
6. Enable **BigQuery export** to reconcile GA4 leads against HubSpot truth.

---

## 7. Auth — scopes & the IAM-vs-GA4 distinction

| Scope | Grants |
|---|---|
| `.../auth/analytics.edit` | read + **write** config (dimensions, key events, streams, secrets, bindings) |
| `.../auth/analytics.readonly` | read-only config (discovery/audit) |
| `.../auth/analytics.manage.users` | manage access bindings |

**Access is granted IN GA4, not GCP IAM.** A SA with `roles/editor` on the GCP project still gets **403** until its email is a GA4 user (Property Access Management / `accessBindings.create`). The OAuth scope authorizes the *API surface*; the access binding authorizes *this identity on this property*. You need both.

---

## Quick endpoint cheat sheet

```
GET  /v1beta/accountSummaries
GET  /v1beta/properties/486264460/dataStreams                       # → measurementId
POST /v1beta/properties/486264460/customDimensions                  # register param
POST /v1beta/properties/486264460/customDimensions/{id}:archive
POST /v1beta/properties/486264460/keyEvents                         # conversions
POST /v1beta/properties/486264460/dataStreams/{s}/measurementProtocolSecrets
POST /v1beta/properties/486264460/accessBindings                    # grant SA (in-GA4)
```

---

## Sources

- GA4 Admin API v1 — overview: https://developers.google.com/analytics/devguides/config/admin/v1
- properties.dataStreams: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams
- properties.customDimensions: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.customDimensions
- properties.keyEvents: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.keyEvents
- properties.dataStreams.measurementProtocolSecrets: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.dataStreams.measurementProtocolSecrets
- accountSummaries.list: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/accountSummaries/list
- properties.accessBindings: https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties.accessBindings
- Admin API access & OAuth scopes: https://developers.google.com/analytics/devguides/config/admin/v1/access-management
- [GA4] Custom dimensions and metrics: https://support.google.com/analytics/answer/14240153

> **Notes:** resource paths/fields/enums/methods verified against `developers.google.com/.../v1beta/...`. Custom-dimension/metric quotas (50/25/10/50 standard) and 30 key-events cap pulled from authoritative secondary sources — confirm 360 numbers on the live limits help page. v1beta covers 100% of these operations (data retention is v1alpha).
