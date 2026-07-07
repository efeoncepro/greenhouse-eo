# Google Tag Manager API v2 — Programmatic Tag / Trigger / Variable Creation

> Operator reference for creating GTM resources **via REST**. All shapes below are the actual JSON the API accepts on `POST`/`PUT`. Verified against the official v2 reference + working community recipes (see **Sources**). Consumed by the skill `greenhouse-gtm-ga4-operator`.

## 0. The one thing that trips everyone up

**Parameter `type` enum values are camelCase-lowercase in the REST JSON**, not the UPPERCASE tokens shown in Google's discovery document / client-library constants. In a raw HTTP body you write `"type": "template"`, **not** `"type": "TEMPLATE"`. Same for tag/trigger/variable `type` (`gaawe`, `googtag`, `customEvent`, `v`, `c`, `smm`, `jsm`).

---

## 1. Base URL, path grammar, verbs

```
https://tagmanager.googleapis.com/tagmanager/v2/{parent}/{tags|triggers|variables}
```

`{parent}` (a "path" string) for workspace-scoped entities:

```
accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}
```

| Action | Verb + path |
|---|---|
| Create tag | `POST .../workspaces/{ws}/tags` |
| Update tag | `PUT .../workspaces/{ws}/tags/{tagId}` |
| Create trigger | `POST .../workspaces/{ws}/triggers` |
| Create variable | `POST .../workspaces/{ws}/variables` |
| Enable built-ins | `POST .../workspaces/{ws}/built_in_variables?type=…` |
| Create version | `POST .../workspaces/{ws}:create_version` |
| Publish | `POST .../versions/{versionId}:publish` |

IDs (`tagId`, `triggerId`, `variableId`) are **server-assigned**; you get them back in the create response and reference them elsewhere (e.g. `firingTriggerId`).

> **Greenhouse coordinates:** `accountId=6291647045` · `containerId=218104216` · workspace **Default (id=2)** · container `GTM-NGHPGRLZ`. The `GtmApiClient` (`src/lib/growth/gtm/api-client.ts`) wraps these calls; extend it with `createTrigger`/`createVariable` when operating.

---

## 2. The Parameter grammar (the core building block)

Every tag/trigger/variable config is a `parameter` array of `Parameter` objects. A `Parameter` has exactly one payload field matching its `type`:

```jsonc
// type: "template" | "integer" | "boolean" | "list" | "map"
//     | "triggerReference" | "tagReference" | "typeUnspecified"
{ "type": "template",         "key": "eventName",   "value": "generate_lead" }   // any text, may contain {{Variable}} refs
{ "type": "integer",          "key": "dataLayerVersion", "value": "2" }          // base-10 string
{ "type": "boolean",          "key": "sendEcommerceData", "value": "false" }     // "true"/"false" as STRINGS
{ "type": "tagReference",     "key": "measurementId", "value": "Google Tag - GA4" } // by tag NAME
{ "type": "triggerReference", "key": "...",          "value": "12" }             // by trigger ID
{ "type": "list",             "key": "eventSettingsTable", "list": [ /* Parameters */ ] }
{ "type": "map",              "key": "",             "map":  [ /* Parameters */ ] }
```

Rules:
- `value` for **boolean** and **integer** is a **string** (`"true"`, `"2"`).
- `list` → array of `Parameter` (each usually a `map`). `map` → array of `Parameter` (the key/value pairs).
- `tagReference` = target **tag name** (string); `triggerReference`/`firingTriggerId` = target **trigger ID**.
- `isWeakReference` (boolean, optional) marks a soft reference that won't block deletion.

---

## 3. GA4 Event tag — `type: "gaawe"`

Canonical parameter keys (**not** `measurementId`/`eventParameters` — those are the wrong names):

| Key | type | Purpose |
|---|---|---|
| `eventName` | `template` | event name; may be `{{Variable}}` |
| `measurementIdOverride` | `template` | **manual** G-ID string (`G-XXXXXXX`) — use when NOT referencing a Google tag |
| `measurementId` | `tagReference` | reference an existing `googtag`/config tag by **name** — use instead of the override |
| `sendEcommerceData` | `boolean` | ecommerce toggle |
| `getEcommerceDataFrom` | `template` | `"dataLayer"` or `"customObject"` (only when `sendEcommerceData=true`) |
| `ecommerceMacroData` | `template` | variable ref, when `getEcommerceDataFrom="customObject"` |
| `eventSettingsTable` | `list` of `map{parameter, parameterValue}` | **inline** event parameters |
| `eventSettingsVariable` | `template`/`tagReference` | reference to a GA4 Event Settings variable (`gtes`) instead of the inline table |
| `userProperties` | `list` of `map{name, value}` | user properties |

### 3a. Full working example — `generate_lead` with params from variables (referencing a Google tag)

```json
{
  "name": "GA4 Event - generate_lead",
  "type": "gaawe",
  "parameter": [
    { "type": "boolean",      "key": "sendEcommerceData", "value": "false" },
    { "type": "template",     "key": "eventName",         "value": "generate_lead" },
    { "type": "tagReference", "key": "measurementId",     "value": "GA4 - Tag" },
    {
      "type": "list",
      "key": "eventSettingsTable",
      "list": [
        { "type": "map", "map": [
          { "type": "template", "key": "parameter",      "value": "form_slug" },
          { "type": "template", "key": "parameterValue", "value": "{{DLV - form_slug}}" }
        ]},
        { "type": "map", "map": [
          { "type": "template", "key": "parameter",      "value": "form_kind" },
          { "type": "template", "key": "parameterValue", "value": "{{DLV - form_kind}}" }
        ]}
      ]
    }
  ],
  "firingTriggerId": ["<customEventTriggerId>"]
}
```

> `"GA4 - Tag"` above is the real name of Efeonce's Google tag in `GTM-NGHPGRLZ` (type `googtag`, `tagId=G-KYPPY57M14`). **Verify that G-ID maps to GA4 property `486264460` first** (see `07-ga4-admin-api-ops.md` §1) before pointing events at it.

### 3b. Same tag, manual G-ID variant (no Google tag reference)

Swap the `measurementId` tagReference line for:

```json
{ "type": "template", "key": "measurementIdOverride", "value": "G-XXXXXXXXXX" }
```

> If `measurementIdOverride` is empty/missing AND no `measurementId` tagReference is present, the API rejects with the cryptic `vendorTemplate.parameter.measurementIdOverride: The value must not be empty.`

---

## 4. Google tag / config — `type: "googtag"`

The modern "Google Tag" (replaces the old GA4 Configuration `gaawc`). Key = `tagId`; optional `configSettingsTable`.

```json
{
  "name": "GA4 - Tag",
  "type": "googtag",
  "parameter": [
    { "type": "template", "key": "tagId", "value": "G-XXXXXXXXXX" },
    {
      "type": "list",
      "key": "configSettingsTable",
      "list": [
        { "type": "map", "map": [
          { "type": "template", "key": "parameter",      "value": "send_page_view" },
          { "type": "template", "key": "parameterValue", "value": "true" }
        ]}
      ]
    }
  ],
  "firingTriggerId": ["2147479553"]
}
```

> `"2147479553"` is the built-in **All Pages** trigger ID. (Efeonce's existing `GA4 - Tag` already fires on All Pages with `tagId=G-KYPPY57M14`.)

---

## 5. Custom Event trigger — `type: "customEvent"`

Matches a `dataLayer.push({event: '…'})`. The event name lives in `customEventFilter` as `arg0={{_event}}` / `arg1=<name>`. Optional extra conditions go in `filter`.

```json
{
  "name": "CE - gh_form_submission_accepted",
  "type": "customEvent",
  "customEventFilter": [
    {
      "type": "equals",
      "parameter": [
        { "type": "template", "key": "arg0", "value": "{{_event}}" },
        { "type": "template", "key": "arg1", "value": "gh_form_submission_accepted" }
      ]
    }
  ]
}
```

Regex variant (match `gh_form_*`), case-insensitive:

```json
{
  "name": "CE - gh_form regex",
  "type": "customEvent",
  "customEventFilter": [
    {
      "type": "matchRegex",
      "parameter": [
        { "type": "template", "key": "arg0", "value": "{{_event}}" },
        { "type": "template", "key": "arg1", "value": "^gh_form_.*$" },
        { "type": "boolean",  "key": "ignore_case", "value": "true" }
      ]
    }
  ]
}
```

Optional additional gating (fire only on some URLs) — add a `filter` array of the same Condition shape:

```json
  "filter": [
    { "type": "contains", "parameter": [
      { "type": "template", "key": "arg0", "value": "{{Page Path}}" },
      { "type": "template", "key": "arg1", "value": "/aeo-2" }
    ]}
  ]
```

**Condition `type` enum:** `equals` · `contains` · `startsWith` · `endsWith` · `matchRegex` · `cssSelector` · `urlMatches` · `greater` · `greaterOrEquals` · `less` · `lessOrEquals`.

**Trigger `type` enum (v2, lowercase camelCase):** `pageview` · `domReady` · `windowLoaded` · `customEvent` · `click` · `linkClick` · `formSubmission` · `historyChange` · `jsError` · `scrollDepth` · `elementVisibility` · `timer` · `triggerGroup` · `init` · `consentInit` · `serverPageview` · `always` · `youTubeVideo`.

---

## 6. Variables

### 6a. Data Layer Variable — `type: "v"`

```json
{
  "name": "DLV - form_slug",
  "type": "v",
  "parameter": [
    { "type": "integer",  "key": "dataLayerVersion", "value": "2" },
    { "type": "boolean",  "key": "setDefaultValue",   "value": "false" },
    { "type": "template", "key": "name",              "value": "form_slug" }
  ]
}
```

With a default value:

```json
    { "type": "boolean",  "key": "setDefaultValue", "value": "true" },
    { "type": "template", "key": "defaultValue",    "value": "(not set)" }
```

`dataLayerVersion` = `"2"` (recommended). Nested keys use dot notation in `name` (e.g. `"ecommerce.value"`).

### 6b. Constant — `type: "c"`

```json
{ "name": "CONST - GA4 Measurement ID", "type": "c",
  "parameter": [ { "type": "template", "key": "value", "value": "G-XXXXXXXXXX" } ] }
```

### 6c. Lookup Table — `type: "smm"` (RegEx table = `type: "remm"`, identical shape)

```json
{
  "name": "LT - form_kind",
  "type": "smm",
  "parameter": [
    { "type": "template", "key": "input", "value": "{{DLV - form_slug}}" },
    {
      "type": "list",
      "key": "map",
      "list": [
        { "type": "map", "map": [
          { "type": "template", "key": "key",   "value": "efeonce-aeo-diagnostic" },
          { "type": "template", "key": "value", "value": "diagnostic_intake" }
        ]}
      ]
    },
    { "type": "boolean",  "key": "setDefaultValue", "value": "true" },
    { "type": "template", "key": "defaultValue",    "value": "other" }
  ]
}
```

### 6d. Custom JavaScript — `type: "jsm"`

`javascript` must be a **single anonymous function** as a string (escape newlines/quotes for JSON).

```json
{
  "name": "CJS - normalized slug",
  "type": "jsm",
  "parameter": [
    { "type": "template", "key": "javascript",
      "value": "function() {\n  var s = {{DLV - form_slug}} || '';\n  return String(s).toLowerCase().trim();\n}" }
  ]
}
```

---

## 7. Built-in variables — `built_in_variables:create`

Not created via `parameter` bodies — **enabled** by name through a dedicated endpoint. The `type` query param is **repeatable**.

```
POST .../workspaces/{ws}/built_in_variables?type=event&type=pageUrl&type=pagePath&type=clickText&type=formId
```

Disable with `DELETE .../built_in_variables?type=…`; undo with `.../built_in_variables:revert?type=…`.

**`BuiltInVariableType` enum (common, camelCase):**
`event` · `pageUrl` · `pageHostname` · `pagePath` · `referrer` ·
`clickElement` · `clickClasses` · `clickId` · `clickTarget` · `clickUrl` · `clickText` ·
`formElement` · `formClasses` · `formId` · `formTarget` · `formUrl` · `formText` ·
`errorMessage` · `errorUrl` · `errorLine` ·
`newHistoryUrl` · `newHistoryFragment` · `historySource` ·
`scrollDepthThreshold` · `scrollDepthUnits` · `scrollDepthDirection` ·
`elementVisibilityRatio` · `elementVisibilityTime` ·
`containerId` · `containerVersion` · `environmentName` · `debugMode` · `randomNumber`.

---

## 8. Workflow: workspace → create → version → publish

### 8a. Workspaces
- A container always has a **base workspace** ("Default Workspace"). All create/edit happens inside a workspace.
- Create: `POST .../containers/{c}/workspaces` body `{ "name": "api-batch-2026-07-07", "description": "…" }`.
- **Sync** (pull latest published container before you version): `POST .../workspaces/{ws}:sync` → `{ syncStatus, mergeConflict[] }`.
- **Status / conflicts:** `POST .../workspaces/{ws}:getStatus`.
- **Quick preview (compile without versioning):** `POST .../workspaces/{ws}:quick_preview` → `{ containerVersion, compilerError, syncStatus }`.

### 8b. Create version (freezes the workspace)
`POST .../workspaces/{ws}:create_version`

```json
{ "name": "Growth forms tracking", "notes": "generate_lead + params via API 2026-07-07" }
```

Response `CreateContainerVersionResponse`:
```jsonc
{
  "containerVersion": { "containerVersionId": "7", "tag": [ … ], "trigger": [ … ], "variable": [ … ] },
  "compilerError": false,          // true = at least one entity failed to compile → do NOT publish
  "syncStatus": { "mergeConflict": false, "syncError": false },
  "newWorkspacePath": "accounts/…/workspaces/12"  // GTM auto-creates a fresh workspace; the old one is consumed
}
```
> **Always check `compilerError` and `syncStatus` before publishing.** `create_version` **deletes** the source workspace and rebases the container onto the new version.

### 8c. Publish
`POST .../containers/{c}/versions/{versionId}:publish` → `{ containerVersion, compilerError }`.

### 8d. Environments
`accounts/{a}/containers/{c}/environments` — create/list; each has an `authorizationCode`. Publishing a version can target an environment (staging vs. live).

---

## 9. OAuth scopes (minimum needed)

| Scope | Grants |
|---|---|
| `.../auth/tagmanager.readonly` | read |
| `.../auth/tagmanager.edit.containers` | create/update tags, triggers, variables, built-ins, workspaces |
| `.../auth/tagmanager.edit.containerversions` | `create_version`, edit versions |
| `.../auth/tagmanager.publish` | publish, manage environments |

A full create→version→publish pipeline needs **`edit.containers` + `edit.containerversions` + `publish`**.

---

## 10. Fingerprint / optimistic concurrency

- Every entity returns a **`fingerprint`** (opaque hash of current state).
- On **update** pass `?fingerprint=<value>`; the write succeeds only if it still matches — otherwise **HTTP 409 CONFLICT**.
- Fingerprints are **not stable across reads** — refetch before each update; never cache across sessions.

---

## 11. Quotas, rate limits, retry

- Limits enforced **per Google Cloud project** (daily) **and per user** (short-window). Exact numbers live in **Cloud Console → APIs & Services → Tag Manager API → Quotas** — treat as source of truth.
- Over-limit: **429 `RESOURCE_EXHAUSTED`** / **403 `rateLimitExceeded`**.
- **Retry:** exponential backoff **with jitter** on 429 / 403-rate / 5xx; do **not** retry 400/401/403-permission/409-fingerprint.
- Batch: create all entities in **one workspace**, throttle to a few req/sec, then a single `create_version` + `publish`.
- Common error: `400 vendorTemplate.parameter.<key>: The value must not be empty` (wrong/omitted param key — see §3); compile failures surface as `compilerError: true`, not an HTTP error.

---

## 12. Minimal end-to-end order of operations

```
1. POST workspaces                        → workspace {ws}   (o reusar Default id=2)
2. POST built_in_variables?type=event&type=formId…   (enable built-ins)
3. POST variables    (DLV form_slug, DLV form_kind, …)
4. (ya existe) googtag "GA4 - Tag"                         → referencia por nombre
5. POST triggers     (customEvent "CE - gh_form_submission_accepted")  → triggerId T
6. POST tags         (gaawe "GA4 Event - generate_lead",
                      measurementId=tagReference→"GA4 - Tag",
                      firingTriggerId=[T])
7. POST workspaces/{ws}:quick_preview   → assert compilerError=false
8. POST workspaces/{ws}:create_version  → assert compilerError=false && syncStatus ok
9. HUMAN CONFIRM  →  POST versions/{v}:publish
10. verify: scripts/ga4/realtime-events.ts 486264460
```

---

## Sources

- GTM API v2 — Overview: https://developers.google.com/tag-platform/tag-manager/api/v2
- Developer's Guide: https://developers.google.com/tag-platform/tag-manager/api/v2/devguide
- `tags.create`: https://developers.google.com/tag-platform/tag-manager/api/v2/reference/accounts/containers/workspaces/tags/create
- `variables.create`: https://developers.google.com/tag-platform/tag-manager/api/v2/reference/accounts/containers/workspaces/variables/create
- `built_in_variables.create`: https://developers.google.com/tag-platform/tag-manager/api/v2/reference/accounts/containers/workspaces/built_in_variables/create
- `workspaces.create_version`: https://developers.google.com/tag-platform/tag-manager/api/v2/reference/accounts/containers/workspaces/create_version
- `Parameter` object + type enum: https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/Parameter
- Discovery JSON (authoritative enums): https://github.com/googleapis/google-api-go-client/blob/main/tagmanager/v2/tagmanager-api.json
- NXFLO — GTM Programmatic Tag Management (`measurementIdOverride` gotcha): https://nxflo.io/blog/gtm-programmatic-tag-management

> **Notes:** confirmed against the official reference that (a) `Parameter.type` serializes lowercase camelCase in REST (`template`, not `TEMPLATE`); (b) the GA4 tag type is `gaawe` and uses `measurementIdOverride` (manual) / `measurementId` tagReference (linked Google tag) + `eventSettingsTable`; (c) `create_version` returns `compilerError`/`syncStatus`/`newWorkspacePath` and consumes the workspace. Exact daily/per-user quota numbers: check Cloud Console (not fabricated here).
