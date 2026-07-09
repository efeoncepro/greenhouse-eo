# TASK-1375 — Foundation del ebook /web-agentica: Growth Form + entrega + surface

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|data`
- Blocked by: `none` (bloqueada solo por el activo de contenido: el ebook PDF)
- Branch: `task/TASK-1375-web-agentica-ebook-growth-form-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Fundación gobernada del lead magnet del ebook "El fin de la web": autorar y **publicar** el Growth Form del ebook (`fdef-efeonce-web-agentica-ebook`) por el lifecycle gobernado, con su success card, su surface/origin para `think.efeoncepro.com`, su destination HubSpot (entrega del lead) y el mecanismo de **entrega del ebook** (descarga en el success card y/o email). Desbloquea el slice 3 (form embed) de **TASK-1374** (la landing `/web-agentica`).

## Why This Task Exists

TASK-1374 re-autora la landing del ebook como página Astro nativa, pero el form del PR original **no capta nada** (`setState` local) y **el ebook no existe como Growth Form publicado**. Igual que el careers form (TASK-1373) era un helper de código y no un form en DB, aquí no hay nada publicado: sin este form gobernado + su entrega, la landing embebe un formulario que no capta el lead ni entrega el ebook. Esta task crea la fundación server-side (SSOT en `greenhouse_growth.*`) para que la landing sea solo un consumer del contrato.

## Goal

- Growth Form del ebook publicado con `form_key` estable, campos (nombre, email, rol opcional), consent y success card ("Te enviamos el ebook a tu email" / descarga).
- Surface `fhsf-web-agentica-ebook` con `think.efeoncepro.com` en `origin_allowlist_json` (CORS gobernado, TASK-1335) + Turnstile hostname verificado.
- Destination HubSpot para entregar el lead (nombre/email/rol) a CRM, con property mapping.
- **Entrega gated post-submit:** descarga tokenizada del PDF (bucket privado + token del handoff + ruta gobernada con signed URL) que solo funciona tras completar el form, + email de respaldo con el mismo link.
- Fila registrada en el TRACKING-PLAN de medición; smoke `GET` por `formKey` + `/submit` fail-closed verdes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/manual-de-uso/growth/alta-surface-growth-form-checklist.md` (runbook alta de surface)
- `.claude/skills/greenhouse-growth-forms/SKILL.md` + `references/SUCCESS_CARD_AND_GRADER_ON_SUBMIT.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **NUNCA** autorar el form como helper de código; **publicar** por el lifecycle gobernado (`authorDraftForm → reviewForm → publishForm`) con `form_key` estable (lección careers TASK-1373).
- **NUNCA** editar una versión publicada in-place; cambios = clone → publish nueva → deprecate vieja.
- **NUNCA** exponer al browser el `formGuid` de HubSpot / portal / mapping; `form_key` ≠ `formGuid`.
- **NUNCA** entregar el lead a HubSpot inline desde `/submit`; la entrega es el dispatcher async del ops-worker.
- **NUNCA** hardcodear el origin en `cors.ts`; autorizar `think.efeoncepro.com` = agregar su origin a la surface (DATA).
- **NUNCA** agregar un `form_destination` falso para la entrega del ebook (destinations = leads externos); la entrega del ebook es success card y/o consumer reactivo de dominio.
- **NUNCA** un `*_ENABLED` nuevo sin fila en `FEATURE_FLAG_STATE_LEDGER.md`; **NUNCA** capability nueva sin grant a rol real en el mismo PR.

## Normative Docs

- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` (registrar la fila del form ANTES de declarar live).
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`.
- Precedentes: `fdef-ai-visibility-grader` (form self-serve del grader en think), `fdef-efeonce-aeo-diagnostic` (AEO), `fdef-efeonce-seo-diagnostic` (SEO v3).

## Dependencies & Impact

### Depends on

- **Ebook PDF** — **UBICADO** (2026-07-09): `~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/07. Ebook/01. Entregables Ebook/Ebook_DesarrolloTradicional.pdf` (real, 9.0 MB, PDF 1.7). Esa carpeta es el **drop folder del equipo para todos los ebooks** (source of truth). Se sube al bucket privado (NO al repo). Por el peso (~9 MB), el email lleva el **link** (signed URL), no el archivo adjunto. Convención reusable: `docs/reference/ebook-lead-magnet-playbook.md`.
- Motor Growth Forms vigente (`src/lib/growth/forms/**`, engine flags ON en Vercel + ops-worker).
- CORS gobernado por surface (TASK-1335) + Turnstile widget con hostname `think.efeoncepro.com` (verificar; el grader ya opera en think).

### Blocks / Impacts

- Desbloquea el **slice 3** de `TASK-1374` (embed del form en `/web-agentica`).

### Files owned

- `migrations/*` (seed del form/surface/destination si se hace por migración) o script gobernado de autoría.
- `src/lib/growth/forms/**` (solo si emerge un consumer reactivo de email — nuevo `growth_ebook_delivery_from_submission`).
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` (fila del form).
- `FEATURE_FLAG_STATE_LEDGER.md` (si nace flag).

## Current Repo State

### Already exists

- Motor Growth Forms completo (author/publish/surface/destination/dispatch/success-card), renderer `<greenhouse-form>`, CORS gobernado por surface, Turnstile en think (grader).
- Precedente de success card (`success_behavior_json`, TASK-1319/1320) y de consumer reactivo por submission (`growth_grader_run_from_submission`).

### Gap

- No existe el form del ebook publicado, ni su surface/destination, ni el mecanismo de entrega del ebook, ni el PDF.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration` (+ `command` para autoría/publicación, posible `sync` si consumer reactivo de email)
- Source of truth afectado: `greenhouse_growth.*` (form_definition/version/surface/destination) + HubSpot (destination)
- Consumidores afectados: la landing `/web-agentica` (TASK-1374), Nexa/MCP (por Full API Parity), HubSpot (lead)
- Runtime target: `production` (Vercel público + ops-worker dispatcher)

### Contract surface

- Contrato existente a respetar: `GET/POST /api/public/growth/forms/[formSlug]` + render contract (`policy-compiler.ts`) + `submitForm` (`commands.ts`) + dispatcher (`dispatch.ts`).
- Contrato nuevo o modificado: nuevo `form_definition` (`fdef-efeonce-web-agentica-ebook`) + `form_version` publicada + `form_host_surface` (`fhsf-web-agentica-ebook`) + `form_destination` (HubSpot) + `success_behavior_json` (success card) + (opcional) consumer reactivo `growth_ebook_delivery_from_submission`.
- Backward compatibility: `compatible` (aditivo; ningún form existente cambia).
- Full API parity: la landing, Nexa y cualquier host consumen el MISMO contrato (`form_key`); cero lógica de form en la landing.

### Data model and invariants

- Entidades/tablas afectadas: `greenhouse_growth.form_definition`, `form_version`, `form_host_surface`, `form_destination`, `form_submission` (runtime).
- Invariantes:
  - `form_key` estable y opaco = identidad pública; slug alias.
  - El render contract nunca lleva mapping/`formGuid`/portal/secrets (leak boundary `policy-compiler` + `sanitizeRenderCopy`; no-leak test verde).
  - La entrega del ebook NO se modela como destination; success card (browser-safe href allowlist) y/o consumer reactivo.
  - Entrega de lead a HubSpot = async at-most-once (nunca inline en `/submit`; nunca re-deliver un `delivered`).
- Tenant/space boundary: superficie pública sin auth; autorización fina = origin + slug + surface server-side en `submitForm`; CORS = unión de surfaces activas.
- Idempotency/concurrency: `submitForm` persiste `accepted`; el dispatcher entrega at-most-once con retry/dead-letter.
- Audit/outbox/history: `form_submission` + `submission_accepted` outbox + `form_destination_attempt` ledger.

### Migration, backfill and rollout

- Migration posture: `seed` (autoría/publicación del form + surface + destination; preferir el patrón de script gobernado/activación por `form_key`, o seed migración additive con marker `-- Up Migration` + DO-block).
- Default state: la entrega HubSpot depende de `GROWTH_FORMS_DISPATCH_ENABLED` + `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED` (ya usados por el grader); el form nace `published` solo cuando el PDF y la entrega están listos.
- Backfill plan: N/A (aditivo; sin datos previos).
- Rollback path: deprecate la versión publicada + quitar el origin de la surface (revierte el embed) + flag off del dispatcher si aplica.
- External coordination: producir + hostear el ebook PDF; crear la HubSpot form + properties (`pnpm hubspot:forms:upsert-fields`); verificar Turnstile hostname `think.efeoncepro.com`.

### Security and access

- Auth/access gate: público; capabilities de autoría (`growth.forms.author/.review/.publish/.destinations.manage/.surfaces.manage`) para el operador; grant a rol real ya existente.
- Sensitive data posture: PII (nombre/email) — encriptado at rest (`GROWTH_FORMS_PII_ENCRYPTION_ENABLED`), reveal capability+reason+audit; NUNCA loggear/telemeter PII.
- Error contract: errores sanitizados del renderer (nunca `reason` crudo); `captureWithDomain`.
- Abuse/rate-limit posture: Turnstile fail-closed + `GROWTH_FORMS_PER_EMAIL_PER_DAY`/`PER_IP_PER_DAY`. **Política de email: solo correo corporativo (operador)** — `emailPolicy={mode:'block_field',field:'email'}` con gate `corporate_email` (bloquea free/disposable) vía `/verify-email` debounced, igual que el grader. El ebook es para equipos/marcas reales.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/forms src/growth-forms-renderer` (no-leak + parity verdes).
- DB/runtime checks: `GET /api/public/growth/forms/<formKey>` (render contract sin leak) + `/submit` fail-closed sin captcha.
- Integration checks: secure-submit smoke a HubSpot (lead entregado) + entrega del ebook probada (descarga y/o email real).
- Reliability signals: `growth.forms.dead_letter_count`, `destination_failure_rate`, `submission_rejection_rate` en steady=0.
- Production verification sequence: publish form → surface+origin → HubSpot destination+mapping → smoke GET/submit → smoke real browser desde `think.efeoncepro.com` (Turnstile + CORS cross-origin) → verificar entrega del ebook.

### Acceptance criteria additions

- [ ] Source of truth (`greenhouse_growth.*` + HubSpot), contract surface (`form_key`/render contract/submit/dispatch) y consumers (landing/Nexa/HubSpot) nombrados con paths reales.
- [ ] Invariantes (leak boundary, no destination para el ebook, at-most-once HubSpot) y boundary de acceso (CORS por surface) explícitos.
- [ ] Posture de migración/rollback explícito (seed additive; deprecate + quitar origin).
- [ ] Evidencia runtime: render contract sin leak, submit fail-closed, entrega HubSpot + entrega del ebook probadas en vivo.
- [ ] Sin leaks de PII/secrets; errores canónicos; fila en TRACKING-PLAN.

### Capability Definition of Done — Full API Parity gate

- [ ] La lógica del form vive en el contrato gobernado (`greenhouse_growth.*` + `src/lib/growth/forms/**`), no en la landing.
- [ ] Read = render contract canónico; write = `submitForm` gobernado (consent, captcha, rate-limit, PII, outbox).
- [ ] Capabilities de autoría existentes; si nace un consumer reactivo o capability, grant a rol real en el mismo PR.
- [ ] Camino programático: la landing, Nexa y cualquier host operan el form por el `form_key` (un primitive, muchos consumers).
- [ ] Parity check = SÍ: el ebook lead magnet es una capability con contrato gobernado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Autoría + publicación del form del ebook

- Autorar draft (`authorDraftForm`) del form `fdef-efeonce-web-agentica-ebook`: campos nombre (req), email (req, **gate corporate_email** — bloquea free/disposable, como el grader), rol (opcional, select con las 4 opciones del PR), consent; copy es-CL.
- `success_behavior_json` = **success card baseline** (thank-you inline, NO overlay): título "Tu ebook va en camino", cuerpo con confirmación honesta de descarga + email + puente `Medir mi visibilidad` → `/brand-visibility`. El botón "Descargar de nuevo" (gated) NO va en el success card estático — lo pinta la landing con el token del handoff (TASK-1374 slice 3).
- `reviewForm` → `publishForm` con `form_key` estable.
- Smoke `GET` por `formKey` (render contract sin leak) + `/submit` fail-closed.

### Slice 2 — Surface + origin + Turnstile

- Crear surface `fhsf-web-agentica-ebook` con `origin_allowlist_json` incluyendo `https://think.efeoncepro.com` (CORS union, TASK-1335).
- Verificar/añadir el hostname `think.efeoncepro.com` en el widget Turnstile.
- Mint embed key si aplica.

### Slice 3 — Entrega del ebook (descarga GATED post-submit + email de respaldo)

- Subir el PDF a `GREENHOUSE_PRIVATE_ASSETS_BUCKET` vía el helper canónico (`greenhouse-assets.ts`); NUNCA público, NUNCA commiteado al repo.
- Emitir un **token de descarga** ligado a la submission en el handoff post-submit (patrón tokenized del grader; el success card NO puede llevar el link porque viaja en el contrato antes del submit).
- Ruta pública gobernada `/api/public/growth/forms/.../asset/[token]` que valida el token (submission aceptada, no expirado, uso acotado) y devuelve un signed URL de corta expiración o stremea el PDF desde el bucket privado.
- Consumer reactivo de email de respaldo sobre `submission_accepted` que envía el mismo link (patrón `growth_grader_run_from_submission`, sin destination falso).
- Probar la entrega real: descarga en pantalla post-submit + email; verificar que sin submit no hay token ni descarga.

### Slice 4 — Destination HubSpot (lead)

- Crear/verificar la HubSpot form + properties (`pnpm hubspot:forms:upsert-fields`), mapear nombre/email/rol.
- `addDestination` HubSpot; secure-submit smoke (lead entregado, at-most-once).

### Slice 5 — Medición + cierre

- Registrar la fila del form en `TRACKING-PLAN.md` (page/surface, dataLayer, GA4 event, estado).
- Smoke real browser desde `think.efeoncepro.com` (Turnstile + CORS) — coordinar con el embed de TASK-1374.
- Docs + cierre.

## Out of Scope

- La landing `/web-agentica` (es TASK-1374; esta task solo entrega el contrato del form).
- Producción del ebook PDF (contenido — dependencia, no código).
- Cambios al motor Growth Forms, al renderer o al contrato CORS (se reusan).
- Cualquier "reporte"/grader (esto es entrega de contenido, no diagnóstico).

## Delta 2026-07-09 — arquitectura verificada (Discovery) + decisión operador

Operador eligió **primitive de plataforma + ebook** (reusable para todos los ebooks). Diseño verificado contra el código real:

- **Handle de descarga = `submissionId`** (UUID v4 que el submit ya devuelve y el handoff `gh_form_submission_accepted` puede emitir), con TTL por `form_submission.created_at`. NO se crea tabla de tokens (proporcional; `submissionId` es no-enumerable). La ruta valida: submission existe + `status='accepted'` + form correcto + dentro de TTL.
- **Entrega = proxy-stream** desde el bucket privado (NO signed-URL — no hay infra de signing; patrón `api/public/growth/ai-visibility/report/[token]/pdf/route.ts`).
- **Asset server-only en tabla nueva `greenhouse_growth.form_asset`** (form_id → bucket_name, object_name, file_name, content_type, ttl_hours). NUNCA en el render contract (leak boundary). Es el SSOT "qué asset entrega este form" → un ebook = una fila.
- **Handoff renderer generalizado**: key `download_url` (o `asset_url`) construida de un `downloadPathTemplate` con `{handle}` — aditivo, mirror de `tokenized_report`. Agregar la key a AMBOS allowlists (`src/growth-forms-renderer/telemetry.ts` + espejo `src/lib/growth/forms/contracts.ts`) + mantener el parity test verde. Ship de `renderer-latest.js` (compartido por todas las forms → blast cross-form, aditivo/opt-in).
- **Publicación por script gobernado** (`scripts/growth/publish-web-agentica-ebook-form.ts`: `authorDraftForm` corporate gate + success_card `reward.kind:'ebook'` + `createHostSurface` think + `addDestination` HubSpot + fila `form_asset`), dry-run/apply. NO seed SQL crudo del form.
- **Email de respaldo**: consumer reactivo sobre `submission_accepted` con el link a la ruta gated (mismo `submissionId`), NO adjunto (9 MB).

Slices refinados: A1 migración `form_asset` → A2 ruta gated stream → A3 handoff renderer + allowlist + parity → B1 upload PDF → B2 script publish form → B3 surface+origin+HubSpot → B4 consumer email → B5 tracking+smoke.

## Delta 2026-07-09 — implementación (code-complete local, rollout + follow-ups pendientes)

**Primitive de plataforma (reusable para todos los ebooks) — code-complete + testeado:**

- **A1** migración `greenhouse_growth.form_asset` (aplicada en staging; DO-block verde; `db.d.ts` regen).
- **A2** ruta gated `GET /api/public/growth/forms/[formSlug]/asset/[handle]` (handle=`submission_id`, valida accepted+TTL, proxy-stream desde bucket privado) + helper `resolveFormAssetDelivery` + reader `getActiveFormAsset` + 7 tests.
- **A3** handoff renderer: `successBehavior.kind='asset_access'` + `assetDownload.downloadPathTemplate` → el renderer emite `download_url` en `gh_form_submission_accepted`; key en ambos allowlists + mirror + parity/no-leak verdes (228 tests).

**Ebook web-agentica (primer consumer) — publicado (staging):**

- **B1** PDF (9 MB) subido a `gs://efeonce-group-greenhouse-private-assets-staging/ebooks/web-agentica/el-fin-de-la-web.pdf` (script reusable `growth:forms:upload-asset`).
- **B2** form publicado config-driven + idempotente (`ebook-forms.registry.ts` + `growth:forms:publish-ebook`): campos Nombre/Apellido/correo-corporativo/rol-opcional/consent, gate `corporate_email`, `destination_policy=greenhouse_only`, success_card thank-you + puente `/brand-visibility`, handoff `assetDownload`, surface `fhsf-web-agentica-ebook` (origin think), fila `form_asset`.
- **Datos para el embed en la landing (TASK-1374):** `form_key = db1e254c-e762-41ae-a85f-50b29dc33ba5`, `surface = fhsf-web-agentica-ebook`.

**Email de respaldo — DONE (B4, code-complete + verificado visualmente):**

- Email agency-branded (Efeonce) `growth_ebook_delivery` (`src/emails/EbookDeliveryEmail.tsx`) + dispatch `sendEbookDeliveryEmail` (`src/lib/growth/forms/ebook-delivery.ts`) + consumer reactivo `growth_ebook_delivery_from_submission` sobre `submission_accepted` (drenado por `ops-reactive-growth`). **GENÉRICO por ebook**: el contenido (título/bajada/puente) sale del `success_behavior` del propio form; el link es la ruta gated (`/api/public/growth/forms/{slug}/asset/{submissionId}`), NUNCA adjunta el PDF. Flag `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` default OFF (ledger). Render verificado + 4 tests de gates.

**Follow-up restante (NO bloquea la descarga on-screen):**

- **HubSpot destination** (entrega del lead) + **property mapping del rol** (el operador aún no tiene la property mapeada) — B3.

**Rollout pendiente (Runtime Rollout Completion Gate — NO operativamente completo):** subir el PDF al bucket privado de **prod**; publicar el form en prod; verificar flags (`GROWTH_FORMS_PUBLIC_API_ENABLED`, `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` para el gate corporativo); **deploy del bundle `renderer-latest.js`** (handoff `download_url`); Turnstile hostname think; smoke real browser (Turnstile + CORS) — coordinar con el embed de TASK-1374. Estado: **code complete, rollout pendiente.**

## Detailed Spec

Seguir el runbook `docs/manual-de-uso/growth/alta-surface-growth-form-checklist.md` (Tier 1 config-only si la entrega es success-card; Tier 2 si se agrega el consumer reactivo de email). Precedente de autoría/activación por `form_key`: los scripts `growth:forms:activate-*`. La entrega del ebook NO es destination: es success card (browser-safe href) y/o consumer reactivo de dominio sobre `growth.forms.submission_accepted` (patrón grader). El lead a HubSpot sí es destination (async, at-most-once).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (publicar form) → Slice 2 (surface/origin) son prerequisito de cualquier embed. Slice 3 (entrega) requiere el PDF listo. Slice 4 (HubSpot) puede ir en paralelo a 3 una vez publicado el form. Slice 5 (smoke real) cierra, coordinado con el embed de TASK-1374.
- No publicar el form como `published` con entrega rota: si el PDF/entrega no está, mantener el form en draft o el embed oculto.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Form publicado sin entrega del ebook | Growth Forms | medium | No publicar/embed hasta que la entrega funcione | Submits sin ebook entregado |
| Origin no autorizado → denied en think | CORS / surface | medium | Slice 2 agrega origin + smoke cross-origin real | Estado `denied` en el form |
| Turnstile hostname faltante | Turnstile | low | Verificar widget (grader ya en think) | captcha_failed en think |
| Lead duplicado a HubSpot | HubSpot dispatch | low | at-most-once; nunca re-deliver `delivered` | dead_letter / duplicados CRM |
| Leak de mapping/formGuid al browser | Growth Forms | low | no-leak test + policy-compiler | test no-leak rojo |

### Feature flags / cutover

- Reusa los flags del motor (`GROWTH_FORMS_PUBLIC_API_ENABLED` Vercel, `GROWTH_FORMS_DISPATCH_ENABLED` + `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED` ops-worker) — ya ON para el grader. Si nace un consumer reactivo de email con kill-switch, registrarlo en el ledger. Cutover = publicar el form + agregar el origin.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Slice 1 | deprecate la versión publicada | <10 min | sí |
| Slice 2 | quitar el origin de la surface | <10 min | sí |
| Slice 3 | quitar el link de descarga / kill-switch del consumer | <10 min | sí |
| Slice 4 | disable el destination HubSpot | <10 min | sí |

### Production verification sequence

1. Publicar form → `GET` por `formKey` sin leak.
2. Surface + origin → smoke `OPTIONS`/`GET` cross-origin desde think.
3. Entrega (success card/email) probada con un submit real.
4. HubSpot destination → secure-submit smoke (lead en CRM, sin duplicado).
5. Smoke real browser desde `think.efeoncepro.com` (con el embed de TASK-1374).
6. Signals en steady=0.

### Out-of-band coordination required

- Producir + hostear el **ebook PDF**.
- Crear la HubSpot form + properties.
- Verificar Turnstile hostname think.
- Coordinar el smoke final con el embed de TASK-1374 (slice 3 de esa task).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El form del ebook está **publicado** por el lifecycle gobernado con `form_key` estable (no helper de código).
- [ ] Surface `fhsf-web-agentica-ebook` con `think.efeoncepro.com` en el allowlist; Turnstile hostname verificado.
- [ ] Success card "Te enviamos el ebook a tu email" y/o link de descarga; entrega del ebook probada en vivo.
- [ ] Destination HubSpot entrega el lead (nombre/email/rol) at-most-once; secure-submit smoke verde.
- [ ] Render contract sin leak (no-leak test) + submit fail-closed sin captcha.
- [ ] Fila del form registrada en `TRACKING-PLAN.md`.
- [ ] Desbloquea el slice 3 de TASK-1374 (form embed operativo).

## Verification

- `pnpm vitest run src/lib/growth/forms src/growth-forms-renderer`
- `pnpm staging:request /api/public/growth/forms/<formKey>`
- Smoke real browser desde `think.efeoncepro.com`
- `pnpm pg:doctor`

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/` (carpeta ≡ Lifecycle).
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados.
- [ ] `Handoff.md` + `changelog.md` actualizados.
- [ ] Arch/doc funcional/manual del motor con `## Delta` si cambia comportamiento.
- [ ] Impacto cruzado: marcar el slice 3 de TASK-1374 como desbloqueado.
- [ ] Fila en TRACKING-PLAN + ledger si nace flag.

## Follow-ups

- Producción del ebook PDF (contenido).
- Si emerge un segundo lead magnet de contenido, generalizar el patrón "success-card + entrega de asset".

- **Mecanismo de entrega del ebook — RESUELTO (operador): descarga GATED post-submit + email de respaldo.** El ebook se baja SOLO después de completar el form. PDF en `GREENHOUSE_PRIVATE_ASSETS_BUCKET` (nunca público). El submit gobernado emite un **token de descarga** ligado a la submission (patrón tokenized handoff del grader, `gh_form_submission_accepted` lleva el handle escalar). La landing dispara la descarga inmediata en pantalla con ese token → ruta gobernada `/api/public/growth/forms/.../asset/[token]` valida y devuelve un signed URL de corta expiración (o stremea) desde el bucket privado. El success card **NO** puede llevar el link (viaja en el contrato antes del submit = visible sin llenar) → la entrega va por el handoff post-submit. Además, email de respaldo con el mismo link. NUNCA bucket público ni URL estática compartible.

## Open Questions

- **Success contract:** confirmar en Discovery si el `tokenized_report` handoff (TASK-1336) se generaliza a un `tokenized_asset` (descarga) o si se agrega un success behavior nuevo para asset download.
- **Epic:** `EPIC-019` por defecto (público); confirmar si va al epic del hub Think.
