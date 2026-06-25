# Greenhouse — Feature Flag State Ledger (env-var flags)

> **Tipo de documento:** Ledger operativo vivo (SSOT del ESTADO de los env-var flags)
> **Creado:** 2026-06-18 por Claude (TASK-1079 follow-up)
> **Última actualización:** 2026-06-24 (TASK-1226 — GRADER + OPENAI + ANTHROPIC prendidos en **staging**; prod = follow-up pesado vía release control plane)
>
> **Delta 2026-06-22 (TASK-1210, release develop→main `3a39c68ba`, sign-off CEO):** los 8 flags MXN+CLF — `FINANCE_CORE_MXN_ENABLED`, `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED`, `FINANCE_MXN_PAYMENT_ORDERS_ENABLED`, `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED`, `FINANCE_CORE_CLF_INDEXED_ENABLED`, `FINANCE_CLF_INCOME_PROJECTION_ENABLED`, `FINANCE_CLF_OBLIGATIONS_ENABLED`, `FINANCE_CLF_REPORTING_ENABLED` — pasaron a **ON en producción**: Vercel prod (agregados + redeploy `greenhouse-midjr78bo`) + ops-worker Cloud Run (persistente via `services/ops-worker/deploy.sh`, `:-true`). Los `*_BACKFILL_APPLY_ENABLED` (gates de script) siguen OFF. Verdad live: `vercel env ls` + `gcloud run services describe ops-worker`.
> **Doc relacionado:** [GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md](../architecture/GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md) (los flags PG declarativos — mecanismo distinto, ver abajo)

## Por qué existe este doc

El desarrollo agéntico deja **deuda cognitiva**: una feature se implementa detrás de un flag `*_ENABLED` default-OFF, pasa todos los gates, se mergea… y **el flag nunca se prende** en staging/prod porque nadie lo registró en un lugar encontrable. Este ledger es ese lugar: un vistazo único de **qué flags están prendidos dónde** y **qué queda pendiente de prender**.

Es **encontrable** desde: `CLAUDE.md` (Runtime Rollout Completion Gate), `AGENTS.md`, y el índice de `docs/operations/`.

## Dos mecanismos de flags (no confundir)

| Mecanismo | Dónde vive el estado | Cómo se prende | Gobierna |
|---|---|---|---|
| **Env-var flags** (`*_ENABLED`) — **este doc** | Vercel env vars (por environment) + `.env.local` | `vercel env add` + **redeploy** | Casi todo: features de runtime, integraciones, rollouts graduales sin tabla |
| **PG rollout flags** (`home_rollout_flags`) | PostgreSQL `greenhouse_serving.home_rollout_flags` | Admin endpoint, **sin redeploy** (resolver con cache 30s) | Variantes de shell/home + kill-switches per-block con scope `user>role>tenant>global` |

> Este ledger cubre **los env-var flags**. Para los PG flags, ver el platform doc. Un mismo dominio puede usar ambos.

## ⚠️ Reglas duras

- **NUNCA** declarar un env-var flag nuevo (`*_ENABLED`) sin agregar una fila a **§ Inventario** y, si queda code-complete pero sin prender, a **§ Pendientes de acción** — en el mismo PR. **Enforcement mecánico:** `pnpm docs:closure-check` corre `feature-flags-audit --strict` y **falla (exit 1) si hay un flag en código sin registrar acá** → ningún cierre/closure pasa con un flag sin documentar.
- **NUNCA** considerar un flag "rolled out" hasta verlo en el environment correcto (`vercel env ls`) **+ redeploy aplicado**. `code complete` ≠ `operationally complete` (ver Runtime Rollout Completion Gate en `CLAUDE.md`).
- **SIEMPRE** que prendas/apagues un flag en un environment, actualizá la **§ Snapshot** (con fecha) y, si cerró un pendiente, sacá la fila de **§ Pendientes de acción**.
- **NUNCA** confíes en este doc como verdad live para una decisión crítica — la **verdad live es `vercel env ls`**. Este doc es el ledger humano (intención + pendientes + último snapshot conocido).
- Para flags `NEXT_PUBLIC_*`: se hornean en el bundle **en build time** → prenderlos requiere un **build fresco** (push o redeploy con build cache desmarcado), no un redeploy que reusa build.

---

## § Pendientes de acción (la parte que se olvida)

> Flags **code-complete** esperando un flip. Esta es la cola anti-deuda-cognitiva. Sacá la fila cuando el flip esté aplicado + verificado.

| Flag | Owner | Estado actual | Acción pendiente | Nota |
|---|---|---|---|---|
| `PPM_POSITION_ENABLED` | TASK-1189 | OFF/default en todos los environments (verdad live: `vercel env ls`) · **code-complete + shadow** | (1) **captura de la tasa PPM real** del contribuyente con el contador (hoy seed placeholder 0.25% en `ppm_rate_config`) + **validación contable** de la cifra shadow (19 períodos, ej. 2026-06 = 14.500 CLP); (2) flip del flag; (3) redeploy ops-worker si se agrega materialización reactiva. | Línea PPM del F29 (child A de TASK-1186). Default OFF → el endpoint `GET /api/finance/ppm/monthly-position` marca `enabled:false` (shadow). La tasa vive en la SSOT `ppm_rate_config` (actualizable sin deploy); el flag gatea la exposición "oficial". |
| `RETENTION_POSITION_ENABLED` | TASK-1188 | **staging: ON** (2026-06-20, toma efecto en el redeploy del push) · prod: OFF | (1) **prod queda gated en validación contable** de la cifra de retenciones (2026-05 = 242.623 CLP, 2026-06 = 138.646 CLP) vs el F29 real; (2) tras sign-off, `vercel env add RETENTION_POSITION_ENABLED Production` + redeploy; (3) redeploy del ops-worker si se agrega materialización reactiva. | Línea de retenciones del F29 (child B de TASK-1186). Default OFF → el endpoint `GET /api/finance/retention/monthly-position` marca `enabled:false` (shadow), nadie trata la cifra como oficial. La data shadow existe en `retention_monthly_positions` (materializada manualmente). |
| `NEXA_INTERACTION_LANE_ENABLED` + `NEXT_PUBLIC_NEXA_INTERACTION_LANE_ENABLED` | TASK-1079 | **staging:** env vars SET (2026-06-18), **redeploy pendiente** · prod: OFF | (1) redeploy de staging con **build fresco** (NEXT_PUBLIC se hornea en build) → habilita "Lateral" en el menú de modo de Nexa. (2) prod = decisión del operador tras sign-off | Lane sidecar de Nexa (concepto C). Default-safe: solo habilita la opción, el default sigue siendo el flotante. |
| `NOTION_DUE_DATE_CAPTURE_ENABLED` (M0) + `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (M2) | TASK-921/922 (consumido por TASK-1169 → TASK-1170) | OFF/default por environment (verdad live: `vercel env ls`) | **NO bloquea TASK-1169** (su materializador/reconciliación/signal corren sin flag, shadow). Pero el OTD-imputable member×month tiene cobertura de freeze casi nula sobre la cohorte productiva hasta que estos flags estén ON + se backfillee el M2 shadow sobre la cohorte. Prender + backfill es prerequisito del reloj ≥30d y del cutover **TASK-1170**, no de esta task. | Dependencia de rollout documentada en ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16.11 + Handoff. El flip productivo del bono es TASK-1170 (gateado, ≥30d shadow + sign-off). |

| `NOTION_OTD_WRITEBACK_ENABLED` + per-cliente `_EFEONCE` / `_SKY` | TASK-927 | OFF/default en todos los environments (verdad live: `vercel env ls`) · **code complete, rollout pendiente** | Writeback `[GH] OTD` a Notion (display-only, client-facing). Activación gateada al operador: (1) crear la propiedad `[GH] OTD` (select, read-only) en Notion Efeonce + Sky; (2) redeploy del ops-worker (registra el Cloud Scheduler `ops-otd-writeback` + endpoint `/otd/writeback`); (3) flip del flag per-cliente con el gate `delivery.attributable_lateness.shadow_terminal_open` en steady=0. | Display-only, NUNCA toca el bono. Default OFF → cero writes hasta activar. El batch es no-op con flag OFF aunque el job exista. Spec: TASK-927 + OTD_V1 §Delta 2026-06-20. |

| `FINANCE_CORE_CLF_INDEXED_ENABLED` + `FINANCE_CLF_INCOME_PROJECTION_ENABLED` + `FINANCE_CLF_OBLIGATIONS_ENABLED` + `FINANCE_CLF_REPORTING_ENABLED` + `FINANCE_CLF_BACKFILL_APPLY_ENABLED` | TASK-995 | OFF/default en todos los environments (verdad live: `vercel env ls`) · **code-complete + gated** | (1) `FINANCE_CORE_CLF_INDEXED_ENABLED=true` (master) + `FINANCE_CLF_INCOME_PROJECTION_ENABLED=true` en staging → habilita la rama CLF de los materializers (cotización/HES/**OC de cliente en UF** → income CLP + plano native UF + snapshot CLF→CLP); (2) validar con una OC de cliente en UF real → income materializado + los 4 signals `finance.uf.rate_freshness`/`finance.indexed_unit.*` en steady; (3) prod tras sign-off Finance. `FINANCE_CLF_OBLIGATIONS_ENABLED`/`FINANCE_CLF_REPORTING_ENABLED`/`FINANCE_CLF_BACKFILL_APPLY_ENABLED` se prenden cuando se cableen sus consumers (obligations CLF / readers / backfill — diferidos por anti-drift). | CLF/UF como unidad indexada nativa (ADR `GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1`). Default OFF → CLF sigue pricing/quote-only; el camino CLP/USD/MXN es bit-for-bit. Las OC son las **recibidas de clientes** (lado income/AR), no compras a proveedores. |

| `NEXA_QUOTE_AUTHOR_ACTION_ENABLED` | TASK-1212 | OFF/default en todos los environments (verdad live: `vercel env ls`) · **code-complete + gated** | (1) además del master `NEXA_ACTION_RUNTIME_ENABLED` (ya ON en staging/prod), prender `NEXA_QUOTE_AUTHOR_ACTION_ENABLED=true` en staging → habilita la governed action `author_quote` (Nexa puede crear/emitir una cotización con confirmación humana); (2) ejercer el loop `propose → confirm → execute` con una cotización real en staging + verificar quotation/líneas/outbox; (3) prod tras sign-off del operador. | Governed action de autoría/emisión de cotización (write gobernado interno). Default OFF → el resolver devuelve gap honesto `runtime_disabled` y el confirm rechaza; la mutación SIEMPRE ocurre en el confirm humano y el command `submitQuoteFromBuilder` re-enforza capability `commercial.quotation` + precio del engine. |

| `COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED` + `COMMERCIAL_Q2C_CONTRACT_ONLY_ENABLED` | TASK-1206 | **`COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED` staging: ON (2026-06-22, smoke HTTP PASS)** · prod: OFF · `COMMERCIAL_Q2C_CONTRACT_ONLY_ENABLED`: OFF en todos | (1) ~~staging flip + smoke~~ **HECHO 2026-06-22**: flag ON en staging + redeploy `greenhouse-jfz70d2gr`; smoke HTTP sobre fixture → `convert-to-invoice` delegó en `closeQuoteToCash` (201 con operationId/finalState canónicos), income + contrato + audit Q2C + outbox completo; 2.º POST → MISMO incomeId (anti doble-AR confirmado, 1 income en PG). (2) **prod pendiente**: tras sign-off Commercial/Finance, aplicar la migración `20260621222152560` en la base de prod (vía release control plane develop→main) + `vercel env add ... Production` + redeploy + smoke prod. `COMMERCIAL_Q2C_CONTRACT_ONLY_ENABLED` solo si el operador habilita `contract_only` (deal suspendido sin AR + SLA) — política aparte con sign-off. | Cierre canónico Quote-to-Cash (TASK-1206). En staging el path visible ya usa el comando canónico (añade audit Q2C + idempotencia; las conversiones que antes hacía el legacy ahora pasan por `closeQuoteToCash`). `contract_only` NUNCA es cierre terminal: audit `status='suspended'` + signal `contract_only_sla_breach`. |

| `GROWTH_AI_VISIBILITY_GRADER_ENABLED` (master) + `GROWTH_AI_VISIBILITY_OPENAI_ENABLED` / `_ANTHROPIC_ENABLED` / `_PERPLEXITY_ENABLED` / `_GEMINI_ENABLED` | TASK-1226 | **staging: GRADER + OPENAI + ANTHROPIC ON (2026-06-24)** · prod: OFF · PERPLEXITY/GEMINI: OFF en todos (sin creds) | ~~(1) secrets OpenAI/Anthropic~~ HECHO (ya existían del spike 1228, grant secretAccessor a greenhouse-portal@ verificado) · ~~(2) flags staging + smoke real~~ HECHO (smoke real local OpenAI 6/6 + Anthropic verificados; flags `staging` ON). **(3) prod pendiente (FOLLOW-UP pesado):** tras sign-off, migración `greenhouse_growth` + capabilities seed a prod vía release control plane develop→main + `vercel env add GROWTH_AI_VISIBILITY_* Production` + redeploy + smoke prod. (4) Perplexity/Gemini: cuando se provisionen `greenhouse-perplexity-api-key`/`greenhouse-gemini-api-key`. | AI Visibility Grader (dominio growth.ai_visibility). Default OFF → cada adapter resuelve skip controlado (`grader_disabled`/`provider_disabled`/`missing_secret`), cero llamadas, cero costo. `light` excluye Anthropic+web_search por costo (§5 calibración). Runs manuales (sin cron); cost ceiling por modo. |

| `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` (Vercel) | TASK-1240 | **staging: ON (2026-06-25, redeploy `greenhouse-h26jgk4dc` + smoke real verde)** · prod: OFF | (1) **sign-off legal del consent / aviso de privacidad** (Ley 21.719/GDPR) antes de prender EN PROD — texto del aviso de consentimiento + URL de política de privacidad (ya existe en el sitio). (2) secret captcha `TURNSTILE_SECRET`: en **staging** = test secret Cloudflare always-pass (`1x0000…AA`); en **prod** = secret real (Secret Manager). (3) `vercel env add ... staging` HECHO + redeploy. (4) smoke real staging HECHO: POST con captcha → 202 + submission + run encolado (`EO-GRUN-00012`). (5) prod = release control plane (junto a EPIC-020 + sign-off). | Intake público del lead magnet (EPIC-020 B). Gateado por el kill switch `isGraderEnabled`. Default OFF → el POST público responde `disabled` (404). ON → captcha (Turnstile) + rate-limit (per-IP 10/email 3 por día) + presupuesto global diario (circuit breaker → 503) + modo `light` forzado; encola `public_diagnostic`. El email (PII) vive sólo en `grader_leads` con consent, NUNCA a providers. Revert (<5 min): flag a false → 404. |
| `GROWTH_GRADER_INTAKE_ON_FORMS_ENGINE_ENABLED` (Vercel) | TASK-1251 | **staging: ON (2026-06-25, redeploy `greenhouse-h26jgk4dc` + smoke E2E verde)** · prod: OFF | (1) Migración `task-1251-grader-forms-engine-convergence` + UNIQUE parcial aplicadas (seed grader-form gobernado `fdef-ai-visibility-grader` + binding `grader_leads.submission_id`). (2) `vercel env add ... staging` HECHO + redeploy. (3) cron `ops-reactive-growth` creado (deploy ops-worker on push develop). (4) **smoke E2E staging HECHO:** POST → `submissionId` (no inline) → outbox `published` → reactive consumer materializó lead `glead-2d1e97f9` + run `EO-GRUN-00012` linkeados; email en PG con consent, nunca al provider. (5) prod = release control plane junto a EPIC-020 + sign-off legal. Revert (<5 min): flag a false → vuelve al intake a-medida (TASK-1240). | Convergencia del intake del AI Visibility Grader sobre el motor Growth Forms (TASK-1251). Default OFF → `POST /run` usa el path a-medida actual (`createPublicGraderRun` inline). ON → fachada que persiste `form_submission` + consent_snapshot + outbox `growth.forms.submission_accepted`; un reactive consumer (`growth_grader_run_from_submission`, domain `growth`, lane `ops-reactive-growth`) encola el run + materializa el lead (no inline). Un solo stack de public-submission. |
| `GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED` (Vercel) | TASK-1242 | OFF/default en todos los environments (verdad live: `vercel env ls`) · **code-complete, rollout pendiente** | (1) **out-of-band: crear las HubSpot custom properties `ai_visibility_*` + grupo "AEO"** (portal 48713323) — Company (`ai_visibility_score`/`_score_version`/`_primary_gap`/`_recommended_motion`/`_competitors_detected`/`_report_url`/`_last_run_at`) + Contact (`ai_visibility_last_submit_at`); email/firstname/lastname = nativas. (2) `vercel env add GROWTH_AI_VISIBILITY_LEAD_HANDOFF_ENABLED true staging` + redeploy. (3) smoke staging: publicar snapshot de un run real con lead → outbox `lead_handoff_requested` → reactive consumer upsert contact/company en HubSpot sandbox + `hubspot_synced_at` + signal `lead_handoff_uncovered` steady=0. (4) prod = release control plane junto a EPIC-020 + sign-off. | HubSpot lead handoff (EPIC-020 D). Default OFF → el reactive consumer resuelve `disabled` (NUNCA escribe a HubSpot, NUNCA crash); el enqueue del evento igual ocurre (gate vive en el write para no perder eventos al prender). ON → upsert contact/company vía cliente HubSpot **in-app directo** (NO Cloud Run bridge). Consent-gate + score `completed` gate (sin score falso). Dedup company por dominio corporativo. Revert (<5 min): flag a false → cero writes. |
| `TURNSTILE_SECRET` (Vercel) | TASK-1240/1251 | **staging: SET (test secret Cloudflare always-pass `1x0000…AA`, 2026-06-25)** · prod: NO SET | Staging usa el test secret oficial de Cloudflare (cualquier token pasa) para no bloquear testers/smoke; prod requiere el secret real del widget Turnstile + sign-off. Sin secret en prod con el intake ON, el verifier hace **fail-closed** (rechaza) — comportamiento correcto. | Secret de verificación captcha (Turnstile siteverify). Lo consume el port compartido `turnstileCaptchaVerifier` del motor + grader. `NODE_ENV=production` en todo deploy Vercel (staging incluido) → el bypass dev NO aplica en staging; por eso staging necesita el test secret. |
| `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED` (Vercel) + flags del worker `GROWTH_AI_VISIBILITY_*` (deploy.sh ENV-branch) | TASK-1234 | **Vercel: OFF en todos (verdad live `vercel env ls`)** · **Worker ops-worker (Cloud Run, deploy.sh): staging ON / prod OFF** (ENV-branch) · _en rollout 2026-06-24_ | ~~(1) worker deploy~~ vía CI `ops-worker-deploy.yml` on push develop (ENV=staging) → crea Cloud Scheduler `ops-growth-grader-drain` (*/5) + monta flags **staging ON** (GRADER+OpenAI+Anthropic+Gemini) / **prod OFF** + `OPENAI/ANTHROPIC_API_KEY_SECRET_REF` + TIMEOUT 3600s; el handler hace **no-op prod-safe** con `isGraderEnabled()` OFF (cero queries — el schema `greenhouse_growth` no está migrado en prod). (2) `vercel env add GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED=true` (staging/develop) + redeploy → endpoint admin pasa a enqueue+poll (202+runId). (3) smoke real `full` multi-provider (Gemini 3) sin timeout + observations incrementales + signals `run_execution_lag`/`run_stuck_running` en steady. (4) **prod fuera de scope** (migración `greenhouse_growth` + capabilities + env vía release control plane). | Cutover inline → async del AI Visibility Grader (TASK-1234). Vercel flag OFF → endpoint ejecuta inline (sólo `light`/OpenAI cabe en el timeout Vercel); ON → encola y el worker Cloud Run drena sin límite de duración (única vía para `full` multi-provider). Worker compartido staging+prod: flags ramificados por ENV + gate `isGraderEnabled()` en el drain → prod no-op seguro. Revert (<5 min): Vercel flag a false → endpoint vuelve a inline. |

_(Agregá acá cualquier flag que dejes code-complete sin prender. Si está vacío, ¡no hay deuda pendiente!)_

---

| `PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED` | TASK-1225 | **staging: ON (2026-06-23)** — write path activado y probado end-to-end (WordPress `writes_enabled=true` + secreto canónico + bridge v0.5.0 desplegado + grant `secretAccessor` a greenhouse-portal@ + smoke `execute`→draft real) · prod: OFF ~~(1) secret + writes-enabled WordPress~~ HECHO · ~~(2) flag staging + smoke execute~~ HECHO (draft real verificado). **(3) prod pendiente:** `vercel env add PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED + los 2 refs Production` + redeploy, tras sign-off del operador (la escritura es draft-only; publish siempre humano). | Write gobernado del widget `greenhouse_comparison_table` (TASK-1225). Default OFF → el command corre solo `dry_run` (propose, sin red); `execute` lanza `comparison_table_writes_disabled` (409). El LLM nunca muta directo. |
| `GROWTH_FORMS_PUBLIC_API_ENABLED` (Vercel) | TASK-1229 | **staging: ON (2026-06-25, redeploy d6szlyp11 + GET público verificado live → render contract)** · prod: OFF | (1) la fundación (schema/contracts/commands/compiler/fake adapter/APIs) está code-complete + smoke e2e verde en dev; el público nace **disabled by design** (sin forms `published`). (2) Prender requiere: un form real publicado (TASK-1232 first migration) + el adapter HubSpot real (TASK-1230) + el dispatcher productivo (ops-worker drain `POST /growth/forms/dispatch` + Cloud Scheduler — **ROLLOUT pendiente**, hoy el dispatch se ejercita por el endpoint admin `POST /api/admin/growth/forms/dispatch`). (3) `vercel env add GROWTH_FORMS_PUBLIC_API_ENABLED=true` por environment + redeploy → render/submit público abiertos (igual gated por ausencia de forms publicados). | Motor Growth Forms (TASK-1229). Default OFF → `GET/POST /api/public/growth/forms/*` responden 404 `disabled`. Transversal (no grader-céntrico): 11 `form_kind`, destinos genéricos, port compartido abuse-guard/captcha. Revert (<5 min): flag a false → 404. |
| `GROWTH_FORMS_DISPATCH_ENABLED` (Cloud Run ops-worker, deploy.sh ENV-branch) | TASK-1229 | **staging: ON (2026-06-25, deploy.sh ENV-branch)** · prod: OFF | (1) el dispatcher productivo (ops-worker drain `POST /growth/forms/dispatch` + Cloud Scheduler `ops-growth-forms-dispatch` */2) está **code-complete**: el handler + el job se crean en el próximo deploy del ops-worker (CI `ops-worker-deploy.yml` on push develop). Con el flag OFF el handler hace **no-op prod-safe** (cero queries — el schema `greenhouse_growth` puede no existir en prod). (2) Prender (`gcloud run services update ops-worker --update-env-vars GROWTH_FORMS_DISPATCH_ENABLED=true` o ENV-branch en deploy.sh) cuando haya submissions reales que entregar (junto al adapter HubSpot real TASK-1230 + primer form TASK-1232). | Dispatcher async del motor Growth Forms (TASK-1229). Entrega submissions aceptadas (fake/echo en 1229; HubSpot real TASK-1230) fuera del request Vercel, vía Cloud Scheduler (mismo motivo que el outbox publisher TASK-773: staging no corre crons Vercel). Default OFF → el job dispara pero el handler no-opea. Hoy el dispatch también es operable manual por el endpoint admin `POST /api/admin/growth/forms/dispatch`. |
| `GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED` (Cloud Run ops-worker, deploy.sh ENV-branch) | TASK-1230 | **staging: ON (2026-06-25, deploy.sh ENV-branch + live smoke verde)** · prod: OFF | (1) el adapter HubSpot Forms secure-submit está **code-complete + unit-tested** (9 tests fetch-mockeado) + state-machine de retry/dead-letter verificada (smoke e2e). (2) **Rollout pendiente del LIVE smoke** (out-of-band): un **HubSpot test form GUID** + verificar que el private app token (`hubspot-access-token`) tiene scope `forms` (secure-submit lo exige). (3) Prender (`gcloud run services update ops-worker --update-env-vars GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED=true`) tras el live smoke + junto al primer form real (TASK-1232). | Adapter HubSpot Forms secure-submit del motor (TASK-1230). Default OFF → el adapter resuelve `skipped` (cero writes a HubSpot, la submission queda `accepted` esperando). ON → POST a `api.hsforms.com/.../secure/submit/{portalId}/{formGuid}` desde el dispatcher async (NUNCA inline). At-most-once vía state machine de attempts (solo reintenta fallas retryables; nunca re-entrega `delivered`). Revert (<5 min): flag a false → skipped. |
| `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` (Vercel) | TASK-1253 | **staging: OFF (code-complete 2026-06-25)** · prod: OFF | (1) la autoridad de validación server-side está **code-complete** (validator registry canónico compartido renderer+`submitForm`, `national_id` multi-país, normalización, test de paridad). Nace **OFF by design** (patrón flag default-OFF + shadow + flip): una re-validación que RECHAZA podría bloquear submissions legítimas si un validador queda muy estricto. (2) Prender requiere shadow en staging (observar tasa de rechazo con un form real publicado) + sign-off. (3) `vercel env add GROWTH_FORMS_SERVER_VALIDATION_ENABLED=true` por environment + redeploy → `submitForm` re-valida por tipo + normaliza + rechaza basura; sin el flag, comportamiento legacy (cliente valida por UX, server no re-valida). | Autoridad de validación del motor (TASK-1253). Default OFF → `submitForm` persiste `{...input.fields}` sin re-validar por tipo (legacy). ON → re-valida cada campo presente con el registry canónico (mismo core que el renderer → paridad), normaliza (email lowercased / E.164 / RUT / número), hashea el email YA normalizado para dedupe, y rechaza con `invalid` el primer campo con formato inválido. Degradación honesta: `field_schema_json` no parseable → señal Sentry + sigue con raw (no rompe el form). Revert (<5 min): flag a false → legacy. Follow-up: reliability signals `server_validation_rejected` / `validation_fallback_used` + flip post-shadow. |

## § Snapshot de estado por environment

> Snapshot **2026-06-18** vía `vercel env ls`. Un flag **ausente** de una columna = NO seteado = OFF/default en ese environment. **Verdad live: `vercel env ls`.**

| Flag | Production | staging | Preview/dev | Owner |
|---|---|---|---|---|
| `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` (+`NEXT_PUBLIC`) | ✅ | ✅ | — | TASK-1085 |
| `NEXA_SYSTEM_PROMPT_V2_ENABLED` | ✅ | ✅ | — | TASK-1124 |
| `NEXA_ACTION_RUNTIME_ENABLED` | ✅ | ✅ | — | TASK-1137 |
| `NEXA_AUTO_ROUTER_ENABLED` | ✅ | ✅ | — | TASK-1091 |
| `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` (`NEXT_PUBLIC`) | ✅ | ✅ | — | TASK-1087 |
| `NEXA_FORCE_KNOWLEDGE_RETRIEVAL_ENABLED` | — | ✅ | — | TASK-1156 |
| `NEXA_KNOWLEDGE_SYNTHESIS_BRIEF_ENABLED` | — | ✅ | — | TASK-1124 |
| `NEXA_ANSWERS_CANVAS_LENS_ENABLED` | — | ✅ | — | TASK-1101 |
| `NEXA_INTERACTION_LANE_ENABLED` (+`NEXT_PUBLIC`) | — | ✅ (redeploy pend.) | — | TASK-1079 |
| `NEXA_QUOTE_AUTHOR_ACTION_ENABLED` | — | — | — | TASK-1212 |
| `COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED` | — | ✅ (2026-06-22, smoke HTTP PASS) | — | TASK-1206 |
| `COMMERCIAL_Q2C_CONTRACT_ONLY_ENABLED` | — | — | — | TASK-1206 |
| `PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED` | — | ✅ (2026-06-23, write path live + proven) | — | TASK-1225 |
| `NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED` | ✅ | ✅ | ✅ | TASK-1078 |
| `KNOWLEDGE_SEARCH_HYBRID_ENABLED` | — | ✅ | — | TASK-1151 |
| `KNOWLEDGE_SEARCH_RERANK_ENABLED` | — | ✅ | — | TASK-1140 |
| `NOTION_KNOWLEDGE_WEBHOOK_ENABLED` | ✅ | — | — | TASK-1094 |
| `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED` | ✅ | — | — | TASK-913 |
| `HOME_V2_ENABLED` | — | ✅ | — | TASK-696/780 |
| `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` (+`NEXT_PUBLIC`) | ✅ | ✅ | Preview | TASK-1001/1009 |
| `CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED` | ✅ | — | — | TASK-1001 |
| `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED` | ✅ | ✅ | Preview | TASK-1017 |
| `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` | ✅ | ✅ | Preview | TASK-872 |
| `PAYROLL_PARTICIPATION_WINDOW_ENABLED` | ✅ | ✅ | — | TASK-890 |
| `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` | ✅ | ✅ | — | TASK-891 |
| `LEAVE_PARTICIPATION_AWARE_ENABLED` | ✅ | ✅ | — | TASK-892 |
| `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` | ✅ | ✅ | Preview | TASK-872 |
| `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` | ✅ | ✅ | — | EPIC-013 |
| `RETENTION_POSITION_ENABLED` | — | ✅ (2026-06-20, redeploy via push) | — | TASK-1188 |
| `PPM_POSITION_ENABLED` | — | — | — | TASK-1189 |
| `FINANCE_BIGQUERY_WRITE_ENABLED` | ✅ | — | — | Finance |
| `FINANCE_RECONCILIATION_AI_ENABLED` | ✅ | — | — | TASK-934 |
| `FINANCE_DISTRIBUTION_AI_ENABLED` | ✅ | — | — | Finance |
| `FINANCE_CORE_MXN_ENABLED` | — | ✅ | Preview | Finance MXN |
| `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED` | — | ✅ | Preview | Finance MXN |
| `FINANCE_MXN_PAYMENT_ORDERS_ENABLED` | — | ✅ | Preview | Finance MXN |
| `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED` | — | ✅ | Preview | Finance/Nubox |
| `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED` | — | ✅ | — | Kortex bridge |
| `KORTEX_COMMAND_*` / `KORTEX_GITHUB_*` (varios) | — | ✅ | — | Kortex bridge |
| `WORKFORCE_CONTRACTING_AI_ENABLED` | — | — | Dev/Preview | TASK-1019 |
| `GROWTH_AI_VISIBILITY_GRADER_ENABLED` | — | ✅ (2026-06-24) | — | TASK-1226 |
| `GROWTH_AI_VISIBILITY_OPENAI_ENABLED` | — | ✅ (2026-06-24, smoke real local OK) | — | TASK-1226 |
| `GROWTH_AI_VISIBILITY_ANTHROPIC_ENABLED` | — | ✅ (2026-06-24, smoke real local OK) | — | TASK-1226 |
| `GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED` | — | — | — | TASK-1226 |
| `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` | — | ✅ (2026-06-24, TASK-1233, smoke real local OK) | — | TASK-1226/1233 |
| `GROWTH_AI_VISIBILITY_PUBLIC_INTAKE_ENABLED` | — | — | — | TASK-1240 (default OFF; rollout pendiente sign-off legal + captcha secret) |
| `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` | — | — | — | TASK-1227 |
| `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED` | — | ✅ (2026-06-24, smoke real `full` EO-GRUN-00011 OK) | — | TASK-1234 |

---

## § Cómo prender un env-var flag

```bash
# 1) Agregar la var al environment correcto (scalar crudo, sin comillas/newline)
printf %s "true" | vercel env add <FLAG_NAME> <environment> --scope efeonce-7670142f
#    environments: Production | staging | preview | development  (staging = custom env)
#    Si el flag tiene mirror NEXT_PUBLIC_*, agregar AMBAS.

# 2) Redeploy (las env vars NO se toman en caliente):
#    - server var (*_ENABLED): aplica en el próximo deploy.
#    - NEXT_PUBLIC_* : se hornea en build → requiere BUILD FRESCO
#      (push a la rama del env, o Redeploy con "Use existing Build Cache" DESMARCADO).

# 3) Verificar el consumer real (no solo que la var exista):
vercel env ls | grep <FLAG_NAME>
#    + abrir la surface en el environment y confirmar el comportamiento.
```

Para **apagar** (rollback): `vercel env rm <FLAG_NAME> <environment> --scope efeonce-7670142f` + redeploy. (Quitar la var = OFF/default.)

Para los **PG rollout flags** (`home_rollout_flags`): se prenden vía admin endpoint sin redeploy — ver el platform doc.

---

## § Inventario completo (referencia por dominio)

> Todos los `*_ENABLED` referenciados en código. **Default = OFF** salvo nota. Owner = task ancla. El estado live por env está arriba (§ Snapshot) o en `vercel env ls`.

**Nexa / Knowledge** (`src/lib/nexa/flags.ts`, `src/lib/knowledge/search/flags.ts`):
`NEXA_FLOATING_EXPANDABLE_ENABLED` (panel B, TASK-1078) · `NEXA_INTERACTION_LANE_ENABLED` (lane C, TASK-1079) · `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` (TASK-1085) · `NEXA_FORCE_KNOWLEDGE_RETRIEVAL_ENABLED` (TASK-1156) · `NEXA_AUTO_ROUTER_ENABLED` (TASK-1091) · `NEXA_SYSTEM_PROMPT_V2_ENABLED` (TASK-1124) · `NEXA_KNOWLEDGE_SYNTHESIS_BRIEF_ENABLED` (TASK-1124) · `NEXA_ACTION_RUNTIME_ENABLED` (TASK-1137) · `NEXA_QUOTE_AUTHOR_ACTION_ENABLED` (TASK-1212) · `NEXA_ANSWERS_CANVAS_LENS_ENABLED` (TASK-1101) · `NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` (TASK-1087) · `KNOWLEDGE_SEARCH_HYBRID_ENABLED` (TASK-1151) · `KNOWLEDGE_SEARCH_RERANK_ENABLED` (TASK-1140) · `KNOWLEDGE_REACTIVE_EMBEDDING_ENABLED` (TASK-1155) · `NOTION_KNOWLEDGE_WEBHOOK_ENABLED` (TASK-1094). Provider pin (no `*_ENABLED`): `NEXA_PROVIDER`.

**Payroll / Workforce:** `PAYROLL_PARTICIPATION_WINDOW_ENABLED` (TASK-890) · `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` (TASK-891) · `LEAVE_PARTICIPATION_AWARE_ENABLED` (TASK-892) · `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` · `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED` (TASK-872) · `WORKFORCE_ACTIVATION_READINESS_GUARD_ENABLED` · `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` (TASK-872) · `WORKFORCE_CONTRACTING_AI_ENABLED` (TASK-1019).

**Finance:** `FINANCE_BIGQUERY_WRITE_ENABLED` · `FINANCE_RECONCILIATION_AI_ENABLED` (TASK-934) · `FINANCE_DISTRIBUTION_AI_ENABLED` · `FINANCE_CORE_MXN_ENABLED` · `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED` · `FINANCE_MXN_PAYMENT_ORDERS_ENABLED` · `FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED` · `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED` · `RETENTION_POSITION_ENABLED` (TASK-1188, línea retenciones del F29 — code-complete + shadow, ver § Pendientes; `src/lib/finance/retention/flags.ts`) · `PPM_POSITION_ENABLED` (TASK-1189, línea PPM del F29 — code-complete + shadow; `src/lib/finance/ppm/flags.ts`). **Contractor:** `CONTRACTOR_PAYABLE_SETTLEMENT_ENABLED` · `CONTRACTOR_AGREED_AMOUNT_GUARDRAIL_ENABLED` (EPIC-013).

**ICO / Delivery metrics:** `ICO_MATERIALIZER_FRESHNESS_GATE_ENABLED` · `ICO_MATERIALIZER_INCREMENTAL_DELTA_ENABLED` · `ICO_MATERIALIZER_MERGE_PATTERN_ENABLED` · `ATTRIBUTABLE_LATENESS_OTD_ENABLED` · `OTD_CLASSIFIER_GH_SHADOW_ENABLED` · `CT_DAYS_CANONICAL_FORMULA_ENABLED` · `CT_SLO_PCT_METRIC_ENABLED` · `NOTION_RPA_WRITEBACK_ENABLED` · `NOTION_FTR_WRITEBACK_ENABLED` · `NOTION_OTD_WRITEBACK_ENABLED` (+ `_EFEONCE`/`_SKY`, TASK-927) · `NOTION_DUE_DATE_CAPTURE_ENABLED` · `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED` (TASK-900…943).

**Client lifecycle / Onboarding:** `CLIENT_LIFECYCLE_ONBOARDING_ENABLED` (+`NEXT_PUBLIC`) · `CLIENT_LIFECYCLE_HUBSPOT_DEAL_TRIGGER_ENABLED` · `CLIENT_BIRTH_CANONICAL_WRITE_ENABLED` · `ONBOARDING_ITEM_EVIDENCE_AUTOCOMPLETE_ENABLED` · `GREENHOUSE_NOTION_PG_PROJECTION_ENABLED` (TASK-991…1017).

**UI / Design tokens:** `HOME_V2_ENABLED` (TASK-696/780) · `NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED` · `NEXT_PUBLIC_AXIS_SECONDARY_LIME_ENABLED` (TASK-1034/1053).

**Kortex bridge / sister platform:** `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED` · `KORTEX_COMMAND_ADAPTER_ENABLED` · `KORTEX_COMMAND_ADMIN_ENABLED` · `KORTEX_COMMAND_LIVE_EXECUTE_ENABLED` · `KORTEX_GITHUB_COMMANDS_ENABLED` · `KORTEX_GITHUB_WORKFLOW_DISPATCH_ENABLED`.

**Growth / AI Visibility Grader** (`src/lib/growth/ai-visibility/flags.ts`): `GROWTH_AI_VISIBILITY_GRADER_ENABLED` (kill switch global) · `GROWTH_AI_VISIBILITY_OPENAI_ENABLED` · `GROWTH_AI_VISIBILITY_ANTHROPIC_ENABLED` · `GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED` · `GROWTH_AI_VISIBILITY_GEMINI_ENABLED` (TASK-1226 — todos default OFF; sin flag/secret el adapter resuelve skip limpio) · `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` (TASK-1227 — fallback LLM de extracción de prosa para el normalizer; default OFF → determinista-first preserva `unknown`) · `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED` (TASK-1234 — cutover inline→async; default OFF → endpoint ejecuta inline; con ON encola y el worker Cloud Run `ops-growth-grader-drain` ejecuta sin límite de duración). Pin de modelo (no `*_ENABLED`): `GREENHOUSE_GEMINI_GROUNDED_MODEL` (TASK-1233 — override del modelo Gemini de grounding; default `gemini-3-flash-preview`, la última generación disponible en Vertex; bumpear a 3.1/3-pro apenas lleguen, sin deploy).

**Mirrors `NEXT_PUBLIC_*` (client-readable)** — pares de un flag server que la UI necesita leer client-side: `NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED` · `NEXT_PUBLIC_NEXA_INTERACTION_LANE_ENABLED` · `NEXT_PUBLIC_NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` · `NEXT_PUBLIC_NEXA_SUGGESTED_PROMPTS_DATA_AWARE_ENABLED` · `NEXT_PUBLIC_CLIENT_LIFECYCLE_ONBOARDING_ENABLED` · `NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED` · `NEXT_PUBLIC_AXIS_SECONDARY_LIME_ENABLED`. Recordá: se hornean en build → prenderlos requiere build fresco.

> Para regenerar/auditar el inventario desde código + cruzarlo contra Vercel y este ledger:
> **`pnpm flags:audit`** (resalta: en código sin registrar · ON en staging pero no prod · OFF everywhere · en Vercel sin código). `--strict` falla si hay flags en código sin registrar acá. Script: `scripts/ci/feature-flags-audit.mjs`.

---

## § Mantenimiento

Este ledger es **doc viva**. Al cerrar una task con flag:

1. Agregá el flag al **§ Inventario** (dominio correcto) en el PR de la feature.
2. Si queda code-complete sin prender → fila en **§ Pendientes de acción**.
3. Al prender/apagar en cualquier env → actualizá **§ Snapshot** con fecha y, si cerraste un pendiente, remové su fila.
4. Refrescá el snapshot completo periódicamente con `vercel env ls` (la verdad live).

**Idea de follow-up (no implementada):** un `pnpm flags:audit` que cruce los flags de código vs `vercel env ls` y resalte "en staging pero no en prod" / "en código pero sin registrar acá" — automatizaría la detección de deuda. Si se materializa, este doc se vuelve el output humano de ese script.
