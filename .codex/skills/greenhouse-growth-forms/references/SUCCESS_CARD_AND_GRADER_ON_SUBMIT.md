# Growth Forms — Success Card (thank-you card) + AEO grader-on-submit

> Companion de `greenhouse-growth-forms/SKILL.md`. Dos capacidades nuevas del motor
> (2026-07, TASK-1319/1320/1321) que la skill enruta acá para no saturarse. Si tocás el
> estado success de un form, el `success_behavior_json`, el renderer del success card, o el
> auto-run del grader desde `/aeo-2/` — **leé esto primero**.

---

## Parte A — Success Card (thank-you card): el estado success estructurado

### A.0 Qué es y por qué existe

Todo Growth Form tiene un **estado success** (lo que ve el visitante después de enviar).
Históricamente era sólo un mensaje inline (`kind='inline_message'` + `message`). **TASK-1319/1320
generalizaron el estado success a una _Success Card_ estructurada** (título, cuerpo, pasos, reward
y acciones) que **cualquier** form puede declarar por contrato — no es AEO-específica.

**Regla mental:** la Success Card es **data del contrato del form** (`success_behavior_json` en la
versión publicada), no código por form. Se renderiza sola. Para cambiar el copy/CTA de la card se
publica una **versión nueva** del form (clone → publish → deprecate), NUNCA se edita en vivo ni se
toca el host (WordPress).

### A.1 Contrato — `successBehaviorSchema` (`src/lib/growth/forms/contracts.ts`)

Dos ejes **ortogonales**:

- **`kind`** = QUÉ outcome se promete: `inline_message` · `redirect` · `asset_access` ·
  `review_pending` · `tokenized_report`.
- **`presentation`** = CÓMO se muestra: `inline_message` (mensaje simple) · **`success_card`**
  (card in-card estructurada). Opcional; sin `presentation`, es mensaje simple.

Campos de la card (todos opcionales, todos **acotados en largo** — el schema ES el leak boundary,
ver A.4):

| Campo | Límite | Rol |
|---|---|---|
| `message` / `messageCopyRef` | 2000 | mensaje simple (presentation=inline_message) |
| `title` / `titleCopyRef` | 160 / 120 | título de la card |
| `body` / `bodyCopyRef` | 1000 / 120 | cuerpo de la card |
| `steps[]` | max **4** (`SUCCESS_STEPS_MAX`) | pasos "qué sigue" (`label`/`copyRef`) |
| `reward` | 1 | sub-bloque lead-magnet (ver A.2) |
| `actions[]` | max **2** (`SUCCESS_ACTIONS_MAX`) | CTAs (ver A.2) |
| `supportingNote` / `supportingNoteCopyRef` | 400 / 120 | nota fina (ej. "revisa tu spam") |
| `redirectUrl` | URL | sólo para `kind='redirect'` |

Los `*CopyRef` resuelven contra `copy_refs_json` (locale-aware); el literal directo (`title`,
`body`, etc.) también cruza — ambos pasan por el mismo gate de largo.

### A.2 Actions y Reward (browser-safe)

**`successCardActionSchema`** (CTA de la card):

- `kind`: `external_link` · `download` · `asset_access` · `schedule` (`SUCCESS_ACTION_KINDS`).
- `label` (≤80) o `labelCopyRef` (≤120).
- `href`: **`successCardHrefSchema`** — allowlist browser-safe (ver A.4).
- `target`: `_self` | `_blank`.
- `telemetryKey` (≤80): clave allowlisted para telemetría del click (NO valores de campo).

**`successCardRewardSchema`** (lead magnet / gated resource): `kind` (`none`/`ebook`/`guide`/
`template`/`report_preview`/`surprise`) + `title`/`body` (o copyRefs) + un `action` opcional. El
reward es un **sub-bloque de la card**, NO un repurpose de `kind='asset_access'`.

### A.3 Render — `presentation='success_card'` en el renderer portable

El renderer (`src/growth-forms-renderer/`) pinta la card cuando
`behavior.presentation === 'success_card'`:

- Núcleo: `renderer.ts` → `buildSuccessCard`.
- Estilos: `styles.ts` → clase `ghf-success-card` (+ tokens `--ghf-*`, ver SKILL.md §Theming).
- Copy fallback: `copy.ts` → `successCardTitle` (defaults locale-aware si el contrato no trae título).
- Sin `presentation='success_card'` (o presentation=inline_message) → mensaje simple histórico.

**Runtime guard (load-bearing).** Publicar `presentation='success_card'` en una versión **exige que
el runtime productivo ya tenga el renderer**. El activation script
(`scripts/growth/activate-aeo-success-card-contract.ts`) corre
`assertProductionRuntimeSupportsSuccessCard()`: lee `origin/main` (o
`GREENHOUSE_AEO_SUCCESS_CARD_RUNTIME_REF`) y confirma que `renderer.ts` tenga
`behavior.presentation === 'success_card'` + `buildSuccessCard`, `styles.ts` tenga `ghf-success-card`
y `copy.ts` tenga `successCardTitle`. Si el runtime NO lo tiene → **falla** (salvo
`--allow-runtime-pending` con rollback plan explícito). Esto evita publicar una card que el bundle
prod no sabe renderizar → el visitante vería el fallback simple sin la card.

**Secuencia canónica de rollout de una card nueva:** (1) mergear el renderer a `main` (release), (2)
recién ahí correr el activation script `--apply` (el guard ya pasa).

### A.4 Seguridad — la card cruza al browser tal cual (leak boundary)

A diferencia de los `field_schema`/mapping (que el `policy-compiler` filtra), los campos de la
Success Card **cruzan al browser en passthrough** (el compiler serializa, el GET los expone). Por eso
**el schema mismo es el leak boundary**:

- Strings **acotados** en largo (tabla A.1) — no hay campo libre sin límite.
- **`successCardHrefSchema` = `isBrowserSafeSuccessHref` + `.trim()`** (TASK-1319; `.trim()` agregado
  como hardening 2026-07-03 por review Copilot para no persistir whitespace). Allowlist:
  - ✅ https absoluta.
  - ✅ http **sólo** en `localhost`/`127.0.0.1` (dev/test).
  - ✅ path root-relative same-origin (`/algo`) — **NUNCA** protocol-relative (`//host`).
  - ❌ `javascript:` · `data:` · `vbscript:` · cualquier externa no-https · signed/private URL.
  - Largo ≤ `SUCCESS_HREF_MAX` (2000).

**NUNCA** metas HTML, un href no-allowlisted, un signed URL de asset, ni PII en el
`success_behavior_json`. Si un reward necesita un asset gated con URL firmada, el patrón correcto es
un `kind='tokenized_report'` / endpoint tokenizado server-side, NO un href crudo en la card.

### A.5 Cómo cambiar la Success Card de un form (patrón canónico)

Igual que toda mutación de versión: **clone → publish → deprecate**, resolviendo por `form_key`,
preservando TODO lo demás. El script de referencia (`activate-aeo-success-card-contract.ts`):

1. `getPublishedVersionBySlug` (versión vigente) + `assertProductionRuntimeSupportsSuccessCard()`.
2. `authorDraftForm({ ...preserveFormVersionFields(current), fieldSchema: current.field_schema_json,
   successBehavior: NUEVO_SUCCESS })` — **`preserveFormVersionFields` copia las 12 columnas
   gobernadas** (style_variant, ui_policy, validation, consent, policies…) para **no dropear** el
   estilo premium ni el `brandName`. Sólo `successBehavior` cambia.
3. Copia los destinos de la versión vigente (`addDestination`).
4. `publishForm` (nueva) + `deprecateForm` (vieja).
5. Idempotente: si la card vigente ya == la objetivo (`stableJson`), no-op.

> **Bug class que esto evita (2026-07-02/03):** un activation script previo (brandName) NO preservó
> el `success_behavior_json` bien y dejó la card con copy viejo ("En 24–48h"). El fix es
> `preserveFormVersionFields` + cambiar sólo el campo objetivo. Si publicás una versión y "se pierde"
> un campo (estilo, card, destino), es que NO preservaste ese campo — nunca edites en vivo, siempre
> preservá explícito.

---

## Parte B — AEO grader-on-submit: le dimos al form de la landing la capacidad del grader

### B.0 La aclaración crítica (no confundir los dos forms)

Hay **dos** forms distintos en el dominio AEO. **NO son el mismo:**

| | **Form de la landing AEO** (el de `/aeo-2/`) | **Form self-serve del grader** |
|---|---|---|
| `form_id` | `fdef-efeonce-aeo-diagnostic` | `fdef-ai-visibility-grader` |
| `form_key` | `b120566a-dd1a-43c8-956a-4e0121e805b8` | (otro) |
| slug | `efeonce-aeo-diagnostic` | `ai-visibility-grader` |
| Qué es | El **formulario comercial** del **servicio AEO** en la landing pública `/aeo-2/` → lead a HubSpot. Estilo `diagnostic_premium`. | El formulario **propio del AEO Grader** (lead magnet self-serve del producto grader). |
| Projection que lo sirve | **`growth-aeo-diagnostic-grader-run-from-submission`** (TASK-1321, sibling) | `growth_grader_run_from_submission` (el original) |

**Lo excepcional (TASK-1321):** el form de la landing `/aeo-2/` **NO era** el form del grader —
era captura de lead comercial. Le **dimos la capacidad** de disparar el AEO Grader al enviarse
(grader-on-submit): ahora un submit de `/aeo-2/` corre el grader automáticamente + manda el informe
por correo, **además** de crear el lead. Si alguien dice "el form del grader de /aeo-2/", corregir:
`/aeo-2/` es el form **comercial** al que se le **sumó** la capacidad grader; el grader-form propio
es otro.

### B.1 Por qué una projection SIBLING (no ramificar la del grader-form)

`growth-aeo-diagnostic-grader-run-from-submission` es **hermana** de la del grader-form, no una rama,
porque el path de `/aeo-2/` **diverge** en tres cosas:

1. **Namespace de campos distinto** → necesita un **remap** (`/aeo-2/` fields → intake del grader).
2. **Categoría no capturada** por el form → se resuelve con **brand-intelligence grounded** (fetch
   del sitio + LLM), no viene del submit.
3. **Cost-cap propio** → `/aeo-2/` entra por `submitForm` genérico, **sin** pasar por el abuse guard
   del intake del grader; necesita su propio cap.

Aislar en una projection propia = **cero regresión** sobre el grader-form. **El run engine
(`executeClaimedGraderRun`) sigue siendo el SSOT** — esto es sólo un **segundo cliente** del motor.

### B.2 Trigger + scope + kill-switch

- **Evento:** `growth.forms.submission_accepted` (outbox del submit, path async en ops-worker,
  lane `ops-reactive-growth`).
- **Scope:** matchea sólo `formId === 'fdef-efeonce-aeo-diagnostic'` (el **formId** del evento, NO el
  `form_key` público `b120566a-…`; ver identidad en SKILL.md §Identity model).
- **Kill-switch:** `GROWTH_AEO_FORM_GRADER_INTAKE_ENABLED` — **default ON** (desvía del patrón
  default-OFF por directiva del operador 2026-07-02: la capacidad nace activa; `=false` la APAGA).
  Corre en el **ops-worker** (donde se drena la projection). Revert <5 min: `=false` → `/aeo-2/`
  vuelve a ser sólo captura de lead comercial.

### B.3 Flujo (idempotente por `submissionId`, PII-safe)

`src/lib/sync/projections/growth-aeo-diagnostic-grader-run-from-submission.ts`:

1. **Lead ya materializado** para ese `submissionId` → **no-op** (no doble run/lead/costo).
2. **Remap** determinista `/aeo-2/`→intake vía el adapter
   (`src/lib/growth/ai-visibility/public-intake/aeo-form-grader-adapter.ts`). Falta un campo
   estructural (`brandName`/`website`/`email`) → **skip** con reason (degrada al **lead comercial**
   que el destino HubSpot Forms ya creó; sin run). El **único campo no derivable** que el form debía
   capturar es `brandName` (por eso se agregó al form).
3. **Cost-cap** (`checkIntakeAbuse`: budget global 24h + per-email/IP) **antes** del LLM caro →
   **skip** si excede. `recordIntakeEvent` unifica el cost accounting con el grader.
4. **Categoría** vía `resolvePublicBrandCategory` (brand-intelligence grounded: fetch sitio +
   `runBrandIntelligence`). `unknown`/baja confianza → **skip** (**NUNCA informe basura** — raíz de
   ISSUE-110/EPIC-021: el grader daba falso-0 a marcas no-agencia).
5. **Encola el run** (`enqueueGraderDiagnostic`) — **el EMAIL NUNCA se dispara acá** (lo hace el
   run engine al finalizar delivery, event-driven) — + registra el intake event.
6. **Materializa el lead** linkeado al submission (email + consent viven en PG, `grader_leads`).

**PII dura:** el **email** viaja al **lead** (con consent), **NUNCA** a `enqueueGraderDiagnostic` ni
al run engine. `hashIdentifier` para los caps.

### B.4 Cómo se ve el resultado (encadena con Parte A)

- El **submit** muestra la **Success Card** (Parte A) event-driven: "Tu informe … va en camino …
  te llegará por correo apenas esté listo" — NO promete tiempo fijo, porque el informe llega en
  minutos por el path async. Consent `efeonce-aeo-diagnostic-consent-v1` (el operador aceptó correr
  el grader + enviar informe bajo ese consent).
- El **run** corre en el ops-worker → **auto-score** en `executeClaimedGraderRun` (fix raíz TASK-1321:
  el path público NO scoreaba → `readGraderReport` tiraba `score_not_found` → delivery `unavailable`
  → sin informe/correo; ahora scorea determinístico + idempotente antes de finalizar) → informe →
  **correo** (Resend, from `no-reply@efeoncepro.com`) + **lead HubSpot** dedup.
- Detalle del motor grader (run engine, providers, scoring, delivery): dominio ai-visibility,
  `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` + ISSUE-113
  (providers/router fallthrough, Gemini billing).

### B.5 Flags aguas abajo (además del kill-switch)

El grader-on-submit sólo funciona de punta a punta si además están ON (ops-worker, ver deploy.sh):
`GROWTH_AI_VISIBILITY_GRADER_ENABLED`, `_BRAND_INTELLIGENCE_ENABLED` (categoría),
`_OPENAI/_ANTHROPIC/_PERPLEXITY_ENABLED` (providers del score), `_REPORT_EMAIL_ENABLED` (correo),
`_LEAD_HANDOFF_ENABLED` (HubSpot). Registrados en `FEATURE_FLAG_STATE_LEDGER.md`.

---

## Hard rules (esta área)

- **NUNCA** confundir el form comercial de la landing (`fdef-efeonce-aeo-diagnostic`, `/aeo-2/`) con
  el form self-serve del grader (`fdef-ai-visibility-grader`). Son forms distintos; el grader-on-submit
  es una **capacidad sumada** al primero vía una projection **sibling**.
- **NUNCA** ramificar `growth_grader_run_from_submission` para servir `/aeo-2/` — es una projection
  propia (remap + categoría grounded + cost-cap propio). El run engine es el SSOT; la projection es
  un segundo cliente.
- **NUNCA** disparar el email del informe desde la projection — el run engine lo hace event-driven al
  finalizar delivery.
- **NUNCA** pasar el email (PII) a `enqueueGraderDiagnostic`/run engine — sólo al lead con consent.
- **NUNCA** dejar que un submit sin categoría resuelta genere run/informe (skip → lead comercial).
- **NUNCA** editar el `success_behavior_json` de una versión publicada in-place — clone → publish →
  deprecate, **preservando** las 12 columnas con `preserveFormVersionFields` (o perdés estilo/card/
  destinos).
- **NUNCA** publicar `presentation='success_card'` sin que el renderer esté en el runtime prod (el
  guard del script lo bloquea; respetá "renderer a main primero, activation script después").
- **NUNCA** meter href no-allowlisted, HTML o PII en la Success Card — cruza al browser tal cual; el
  schema (largos + `successCardHrefSchema`) es el leak boundary.

## Archivos clave

- Contrato success: `src/lib/growth/forms/contracts.ts` (`successBehaviorSchema`,
  `successCardActionSchema`, `successCardRewardSchema`, `isBrowserSafeSuccessHref`).
- Render success card: `src/growth-forms-renderer/{renderer,styles,copy}.ts` (`buildSuccessCard`,
  `ghf-success-card`, `successCardTitle`).
- Activation card: `scripts/growth/activate-aeo-success-card-contract.ts` (+ `scripts/lib/preserve-form-version-fields.ts`).
- Grader-on-submit: `src/lib/sync/projections/growth-aeo-diagnostic-grader-run-from-submission.ts`
  + `src/lib/growth/ai-visibility/public-intake/aeo-form-grader-adapter.ts`
  + `src/lib/growth/ai-visibility/brand-intelligence/resolve-public-brand-category.ts`.
- Flag: `src/lib/growth/ai-visibility/flags.ts` (`isAeoFormGraderIntakeEnabled`,
  `GROWTH_AEO_FORM_GRADER_INTAKE_FLAG`).
- GVC scenario success card: `scripts/frontend/scenarios/growth-forms-success-card.scenario.ts`.
