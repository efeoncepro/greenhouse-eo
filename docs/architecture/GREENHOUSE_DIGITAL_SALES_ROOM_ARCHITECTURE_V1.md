# Greenhouse Digital Sales Room (Sala de Ventas) — Architecture V1

> **Tipo:** Spec de arquitectura (Proposed — no runtime yet). Consume la decisión
> [GREENHOUSE_DIGITAL_SALES_ROOM_DECISION_V1.md](GREENHOUSE_DIGITAL_SALES_ROOM_DECISION_V1.md).
> **Estado:** `Proposed (deferred)` — fija la forma; **no** autoriza schema, endpoints ni tasks.
> **Fecha:** 2026-07-15 · **Skill:** `arch-architect` (overlay Greenhouse) con el operador.

Este documento es el plano técnico. Para el *porqué*, las alternativas rechazadas y el 4-pilar,
leer la decisión. Aquí va el *cómo*: el split, el schema propuesto, el carril de acceso por token,
el tracking primitive, las capabilities y el roadmap por fases.

---

## 0. La tesis en una pantalla

Una Sala de Ventas es **`quote-share` generalizado de un PDF de cotización a una sala completa de
`Proposal`.** El repo ya tiene las tres piezas por separado; la sala las combina:

```
        ┌──────────────────────── GREENHOUSE (control plane + modelo headless) ────────────────────────┐
        │                                                                                                │
        │   Proposal (SSOT del deal)          Sales Room (proyección)         Tracking (append-only)     │
        │   greenhouse_commercial.proposals   greenhouse_commercial.          greenhouse_commercial.     │
        │   + proposal_assets (audience)      sales_rooms / _sections /        sales_room_events          │
        │   + proposal_render_jobs            _viewers / _short_links          (best-effort, forjable)    │
        │        │                                   │                               ▲                    │
        │        │  buildProposalRenderProjection     │  token HMAC (fail-closed)     │  ingest público    │
        │        │  (solo client_facing, fail-closed) │  + revoke/expiry              │  (rate-limited)    │
        │        ▼                                   ▼                               │                    │
        │   ┌─────────────────────── modelo headless de la sala (no-leak) ──────────┼──────────────┐     │
        │   │  GET /api/public/commercial/salesroom/[token]  →  RoomModel           │              │     │
        │   │  POST /api/public/commercial/salesroom/[token]/event  ────────────────┘              │     │
        │   └───────────────────────────────────────────────────────────────────────────────────┘     │
        └──────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                    │  fetch server-side (no CORS)
                                                    ▼
        ┌──────────────────── efeonce-think (Astro — render TONTO, público) ─────────────────────┐
        │  think.efeoncepro.com/sala/<slug>-<token>                                               │
        │  pinta el RoomModel nativo · embebe la Radiografía viva · postea eventos de engagement  │
        │  NUNCA MUI/AXIS · NUNCA iframe (GTM) · NUNCA reconstruye lógica/scoring                  │
        └─────────────────────────────────────────────────────────────────────────────────────────┘
                                                    ▲
                                                    │  URL (no PDF adjunto)
                                              El comprador (comité SKY) — NO es usuario de Greenhouse
```

Regla de oro del split (heredada del informe del Grader y de la Radiografía): **Greenhouse computa,
Think pinta.** Nunca al revés.

---

## 1. Dominio y ownership

- **Dueño:** Commercial (sub-dominio del Proposal Studio). La sala es una **proyección** del aggregate
  `Proposal`; **no** una identidad 360 nueva.
- **Schema:** `greenhouse_commercial.sales_room*` (mismo schema que `proposal*`).
- **TS root:** `src/lib/commercial/tenders/proposals/sales-room/**` (server-only).
- **Render público:** repo `efeonce-think` (Astro), ruta `/sala/<slug>-<token>`. Ya desacoplado.
- **Frontera:** Commercial (proyección + commands + tracking) · Growth/Think (render) · Platform
  (Full API Parity). **No** cruza a Finance ni HR. El deal sigue siendo `Proposal` (SSOT).

---

## 2. Modelo de datos (propuesto — NO crear todavía)

Cuatro tablas. Todas siguen los patrones canónicos: state machine + CHECK + audit, append-only con
anti-UPDATE/DELETE, FK al aggregate.

### 2.1 `sales_rooms` — la sala (1:1 con un momento de un `Proposal`)

| Campo | Tipo | Nota |
|---|---|---|
| `sales_room_id` | text PK | `salesroom-<uuid>` |
| `owner_org_id` | text NOT NULL | multi-tenant (ASaaS-ready), espeja `proposals.owner_org_id` |
| `proposal_id` | text NOT NULL FK | el deal que proyecta |
| `state` | text NOT NULL CHECK | `draft → published → expired \| archived` (máquina append-only) |
| `title` / `subtitle` | text | copy de la sala (bilingüe por copy layer) |
| `expires_at` | timestamptz | expiración del acceso |
| `locale_default` | text | `es-CL` \| `en-US` |
| `created_by_member_id` | text | quién la publicó |
| `created_at` / `updated_at` | timestamptz | |

CHECK: `state` en el enum. Anti-DELETE trigger. Índice: `(owner_org_id, proposal_id)`.

### 2.2 `sales_room_sections` — las secciones ordenadas de la sala

Cada sección referencia **un artefacto del `Proposal` por kind** (deck, económica…) o **una pieza
viva** (la Radiografía por URL). **NUNCA** una sección `internal`.

| Campo | Nota |
|---|---|
| `section_id` PK · `sales_room_id` FK · `position` int | orden |
| `kind` CHECK | `artifact` \| `live_sample` \| `action_plan` \| `richtext` |
| `proposal_asset_kind` | cuando `kind='artifact'`: qué kind del Proposal sirve (resuelve a la versión **vigente**, no una copia) |
| `live_sample_url` | cuando `kind='live_sample'`: la URL de la Radiografía |

CHECK: una sección de tipo `artifact` **solo** puede apuntar a un `proposal_asset_kind` cuya audiencia
resuelva a `client_facing` — la constraint es defensa; el build del modelo (§4) es la puerta real.

### 2.3 `sales_room_viewers` — quién mira (sin login)

| Campo | Nota |
|---|---|
| `viewer_id` PK · `sales_room_id` FK | |
| `viewer_token` | cookie de viewer anónima (identifica un navegador sin login) |
| `email` | opcional (soft email-gate; PII minimizada + consentimiento) |
| `first_seen_at` / `last_seen_at` | |

### 2.4 `sales_room_events` — el event log de engagement (append-only, best-effort)

Espejo directo de `quote_share_views` (`view-tracker.ts`), extendido a eventos por-sección/artefacto.

| Campo | Nota |
|---|---|
| `event_id` PK · `sales_room_id` FK · `viewer_id` FK | |
| `event_type` CHECK | `room_opened` \| `section_viewed` \| `artifact_downloaded` \| `cta_clicked` |
| `section_id` / `proposal_asset_kind` | contexto del evento |
| `dwell_ms` | tiempo en la sección |
| `occurred_at` · `ip_address` · `user_agent` · `referer` | como `quote_share_views` |

**Append-only** (anti-UPDATE/DELETE trigger). Índice `(sales_room_id, occurred_at DESC)`. Es el
**tier analítico**: best-effort, forjable, **nunca decide estado/dinero** (§5).

### 2.5 Short-link con revoke/expiry

Reusar el patrón de `quote_short_links` (`short-link.ts`): base62, retry en colisión, estados
active/revoked/expired, soft-revoke con razón. Tabla `sales_room_short_links` o extender la existente
si se generaliza el primitive de short-links.

---

## 3. Acceso: el carril por token (el delta real)

**El problema exacto** (auditoría 2026-07-15): `canAccessProposalDocument`
(`src/lib/commercial/tenders/proposals/access.ts:16`) **niega a los tenants `client`**. Correcto para
el portal interno — pero **el comprador no es un tenant**. Su acceso **no puede** pasar por ese
predicado de sesión.

**La solución** (patrón `/accept` público de quote): un **carril de autorización por token**,
separado del de sesión.

- **Token HMAC firmado**, no oscuridad. Reusar `computeVerificationToken`-style
  (`src/lib/finance/pdf/qr-verification.ts`) con un secret propio
  (`GREENHOUSE_SALES_ROOM_TOKEN_SECRET`, **fail-closed** si falta). La verificación **recomputa y
  compara** server-side (como `load-quote-for-public-view.ts:196-212`). Mejor que la oscuridad de la
  Radiografía (`radiografia-aeo-architecture.md:152`) porque un comprador es un actor externo real.
- **URL:** `think.efeoncepro.com/sala/<slug>-<token>` (espeja `/muestras/`). Short-link opcional
  `/s/<code>` con revoke/expiry.
- **El token autoriza SOLO lectura de esa sala**, y solo de sus secciones `client_facing`. Nunca da
  acceso a otra propuesta, ni al portal, ni a artefactos `internal`.
- **`noindex` + fuera del sitemap** (como la Radiografía).

---

## 4. El modelo headless (no-leak) — reusa lo que ya existe

El "modelo en Greenhouse" **ya está construido**: `buildProposalRenderProjection`
(`src/lib/commercial/tenders/proposals/render-projection.ts:90`) + el allowlist fail-closed
`assertEvidenceAllowedForAudience` (`:223`) — un artefacto `client_facing` con **una sola** evidencia
`internal` rechaza el artefacto entero (`:245-249`), y el filtro SQL ya excluye lo interno (`:129,
:149`).

El `RoomModel` es una **envoltura** de esa proyección + las secciones + los artefactos vigentes:

```
GET /api/public/commercial/salesroom/[token]  (público, token-gated, force-dynamic)
  → verifica token HMAC (fail-closed)
  → resuelve sala + estado (published/no-expired)
  → por cada sección artifact: resuelve el proposal_asset VIGENTE (MAX version) client_facing
  → arma RoomModel { title, sections[], artifacts[{kind, version, downloadHref-tokenizado}], liveSampleUrls[] }
  → NUNCA: gs://, RFP crudo, costos, internal, otra propuesta
```

La **descarga** desde la sala **no** usa el endpoint interno autenticado de TASK-1412 (ese exige
sesión). Usa un **endpoint público token-gated** paralelo:
`GET /api/public/commercial/salesroom/[token]/download/[assetKind]` — re-valida el token, re-valida
que el asset sea `client_facing` de esa sala (audience gate de nuevo, defense-in-depth), y streamea
vía el mismo helper `downloadPrivateAsset`. **Nunca** expone la ubicación física.

**Think** hace `fetch` server-side del `RoomModel` (sin CORS), lo pinta nativo (Astro + islands),
embebe la Radiografía como composición nativa (no iframe), y postea eventos.

---

## 5. Tracking: forjable por diseño → analítico

El ingest viene del navegador del comprador = **write público forjable**. Regla dura (heredada del
CTA/Popup engine y de `view-tracker.ts`):

```
POST /api/public/commercial/salesroom/[token]/event   (público, rate-limited, best-effort)
  → verifica token
  → resuelve/crea viewer (cookie anónima; email solo si soft-gate)
  → INSERT append-only en sales_room_events  (.catch nunca bloquea; como recordShareView)
  → NUNCA decide estado del deal, dinero ni acceso
```

- **Tier analítico** (esta tabla): opens, dwell, downloads, cta_clicks. Best-effort, sampleable.
- **Tier audit-grade** (NO acá): una conversión real ("el comprador aceptó") es un **command
  gobernado** con su propio outbox + audit, **no** un evento posteado por el browser. Si alguna vez
  la sala tuviera un botón "Aceptar", va por el carril del `/accept` de quote (idempotente,
  server-confirmed), nunca por el ingest de tracking.
- **Intent score** = derivado (opens × recencia × dwell × downloads × nº de stakeholders). Se
  **materializa** (no se recomputa por view) — es el path caliente. Reader interno gobernado
  `readSalesRoomEngagement(salesRoomId)`.
- **Signals reactivas** (outbox → reactive consumer, ya cableado en `store.ts`/`assets.ts`):
  `salesroom.opened`, `salesroom.asset_downloaded` → proyecciones (ej. notificar al owner en Teams
  cuando el comité abre la sala). El bus es el canónico (`publish-event.ts` + `reactive-consumer.ts`),
  **nunca** side-effects dentro del route handler público.

---

## 6. Full API Parity — capabilities y consumers

Capabilities granulares (grant en `runtime.ts` mismo PR, rol real de `role-codes.ts`):

| Capability | Acción | Consumers |
|---|---|---|
| `commercial.sales_room.create` | crear sala desde un `Proposal` | UI, Nexa (propose→confirm→execute) |
| `commercial.sales_room.publish` | publicar / generar token | UI, Nexa |
| `commercial.sales_room.share` | short-link / enviar | UI, Nexa |
| `commercial.sales_room.expire` | expirar / revocar token | UI, Nexa |
| `commercial.sales_room.read` | ver la sala + su config | UI, Nexa, MCP |
| `commercial.sales_room.read_analytics` | engagement + intent score | UI, Nexa, MCP |

**Nexa por construcción** (no se construye nada Nexa-específico): *"crea una sala de ventas para la
propuesta de SKY"* → propose (preview de qué secciones, qué artefactos client_facing) → confirm humano
→ execute (el mismo command). *"¿quién abrió la sala de SKY y qué miró?"* → `read_analytics`.
*"avísame cuando el comité la abra"* → signal reactiva.

El **acceso del comprador NO es una capability** (no es un usuario del sistema) — es el carril por
token (§3), fuera del modelo de entitlements.

---

## 7. Roadmap por fases (indicativo — cada fase nace vía `greenhouse-task-planner`)

| Fase | Alcance | Depende de |
|---|---|---|
| **F0** | Sala interna sobre un deal real: proyección + token HMAC + render en Think + audience gate. **Sin tracking.** Vertical delgado (SKY o el siguiente deal). | Proposal Studio (aggregate), rail Think |
| **F1** | Tracking analítico: `sales_room_events` + ingest forjable-por-diseño + intent score + `read_analytics`. | F0 |
| **F2** | Full API Parity + Nexa: las 6 capabilities + acciones gobernadas + signal "el comité abrió". | F1 |
| **F3** | Bow-tie: reutilizar la sala en onboarding/renovación/expansión (no solo cierre). | F2 |
| **F4** | ASaaS: salas de marca del cliente (brand-pack multi-tenant del Composer). | Creative Studio (EPIC-028) |

Cada task lleva `## Modular Placement Contract`: control plane en
`src/lib/commercial/tenders/proposals/sales-room/**` (server-only); render en efeonce-think (ya
desacoplado); **sin** `apps/*`/`packages/*` nuevos en greenhouse-eo.

---

## 8. Invariantes operativos (para cuando se construya)

- **NUNCA** la sala es fuente de verdad del deal — es proyección de `Proposal` (reconstruible).
- **NUNCA** un artefacto/sección `internal` cruza a la sala: el build del `RoomModel` reusa
  `assertEvidenceAllowedForAudience` (fail-closed) **y** el download público re-valida audiencia.
- **NUNCA** el acceso del comprador pasa por `canAccessProposalDocument` (niega `client`); usa el
  carril por token HMAC fail-closed.
- **NUNCA** un evento del ingest público decide estado/dinero/acceso (forjable → analítico); las
  conversiones van por command gobernado idempotente.
- **NUNCA** `gs://`/URLs de storage, RFP crudo, costos, margen ni otra propuesta en el `RoomModel`.
- **NUNCA** MUI/AXIS ni iframe en el render de Think (bundle + GTM).
- **SIEMPRE** token HMAC firmado con secret propio fail-closed (no oscuridad); `noindex` + no-sitemap.
- **SIEMPRE** capability granular por acción + grant mismo PR; el acceso del comprador NO es capability.
- **SIEMPRE** bilingüe por construcción (el comprador puede ser Globe); copy en `src/lib/copy/**`.
- **SIEMPRE** eventos append-only, best-effort, por el bus reactivo canónico (no side-effects en el
  route handler público).

---

## 9. Open questions (heredadas de la decisión)

Build-vs-buy Trumpet · naming (Sala/Deal Room/Pod) · soft email-gate vs viewer anónimo · granularidad
del tier analítico · cuándo/qué EPIC · salas de marca del cliente (ASaaS). Detalle y trade-offs en la
decisión, §"Open Questions".

## 10. Documentación diferida (Platform Documentation Protocol)

Las capas **funcional** (`docs/documentation/comercial/`) y **manual de uso**
(`docs/manual-de-uso/comercial/`) se difieren hasta que exista runtime (F0): documentar cómo se opera
una capacidad no construida sería ficción. Owner: Commercial. Condición de retiro del diferimiento:
apertura de la task de F0. Esta spec + la decisión son la capa **técnica**, completa a nivel de forma.
