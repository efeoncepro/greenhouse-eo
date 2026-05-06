# TASK-408 — Copy Migration: Notification Categories + Institutional Emails

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `En implementacion`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `TASK-265` — requiere contrato canónico y capa dictionary-ready. Closing Protocol (promote rule a `error`) requiere además **TASK-407 Slice 0 mergeado** — la rule debe estar extendida a month arrays + JSX text CTAs antes de promover, para que el `error` mode cubra los 6 patterns que el sweep ataca, no solo los 4 originales.
- Branch: `task/TASK-408-copy-migration-notifications-emails`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-265` (split-off de Slice 3)

## Summary

Derivada de `TASK-265`. Ejecuta la migración de copy shared en dos superficies externas críticas: `src/config/notification-categories.ts` (100% español-only hoy) y los templates de email institucionales en `src/emails/*.tsx`. Separada de `TASK-407` porque tocar emails y notifications tiene blast radius distinto (afecta delivery real a usuarios y tenants) y requiere verificación independiente.

## Why This Task Exists

Las notificaciones y emails son superficies externas de alto impacto:

- `src/config/notification-categories.ts` define 13 categorías con labels + descriptions inline en español. Cualquier cambio de copy aquí se propaga a UI de preferencias, correos de digest y notificaciones in-app.
- Los emails son la superficie externa más visible: llegan a personas fuera del portal (clientes, stakeholders, colaboradores). Un error de migración aquí es más caro que en el shell.
- **13 de 17 templates** implementan patrones bilingües ad-hoc (verificado 2026-05-06: cascade `locale === 'en' ? '...' : '...'` inline). El componente compartido `EmailLayout.tsx` también tiene strings institucionales bilingües inline (footer, unsubscribe link). Ningún template consume `getMicrocopy` o `@/lib/copy` hoy — los emails son una isla desconectada del contrato canónico.
- Mezclar esto con `TASK-407` habría generado un PR gigante mezclando refactor puro UI con delivery externo.

## Pre-execution baseline (2026-05-06)

Inventario auditado con `rg`/`grep` sobre `src/emails/` y `src/config/notification-categories.ts`:

| Bucket | Cantidad | Ubicación |
| --- | --- | --- |
| Templates totales (sin tests) | 17 | `src/emails/*.tsx` |
| Templates con snapshot test (Vitest) | 2 | `PayrollExportReadyEmail.test.tsx`, `PayrollReceiptEmail.test.tsx` |
| Templates **sin** snapshot test (debt) | 15 | El resto |
| Templates con bilingual ad-hoc (`locale === 'en' ? ... : ...`) | 13 | LeaveRequestDecision, Invitation, MagicLink, LeaveRequestSubmitted, LeaveRequestPendingReview, PasswordReset, Notification, PayrollPaymentCancelled, PayrollLiquidacionV2, LeaveReviewConfirmation, PayrollReceipt, Verify, PayrollPaymentCommitted |
| CTAs/Buttons institucionales | ~17 (1 por template) | `<EmailButton>...</EmailButton>` o `<Button>...</Button>` |
| Subjects/preview text hardcoded | 8 declarados como string literal en render config | `*.tsx` (subject) y `<Preview>` |
| Categorías de notificación | 12 | `notification-categories.ts` |
| Imports de `greenhouse-nomenclature.ts` desde `src/emails/` | **0** ✓ | TASK-811 (trim) NO romperá emails — confirmar como invariante |
| Consumers de `getMicrocopy` o `@/lib/copy` desde `src/emails/` | **0** | gap actual a cerrar |

Estos números reemplazan los criterios cualitativos viejos. Los acceptance criteria se anclan a **estos baselines exactos**.

## Goal

- Migrar el 100% de `notification-categories.ts` a la capa canónica sin cambios visibles al usuario.
- Migrar strings institucionales shared en emails (subjects estándar, footers, CTAs genéricos) a la capa dictionary-ready.
- Dejar los emails listos para que `TASK-266` pueda conectar locales reales sin un refactor adicional.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` — emails se entregan via outbox + reactive consumer; el sweep no toca delivery pipeline pero sí declara reliability signal de render failure.

Reglas obligatorias:

- Cero regresiones en delivery de emails: los subjects, preview text y cuerpos deben renderizar **byte-idéntico** después del refactor (verificado por Vitest snapshot tests).
- Mantener la estructura actual de `notification-categories.ts` (code, audience, channels, priority) — solo migrar labels, descriptions y subjects (subjects nuevos como propiedad canónica del evento).
- No reescribir copy: la migración es mover strings de sitio, no editarlas.
- Copy de dominio específica por email (datos del request, montos, fechas dinámicas) queda local con interpolación; copy institucional shared (subjects, footers, disclaimers, CTAs reusados, headers) migra.
- **Invariante**: `src/emails/` consume **solo** `src/lib/copy/` + `src/emails/constants.ts` (tokens visuales) + `src/config/notification-categories.ts`. **NUNCA** importa de `src/config/greenhouse-nomenclature.ts`. Verificado pre-execution (0 imports hoy); preservar como hard rule durante y después del sweep para que TASK-811 (trim) no introduzca acoplamiento downstream.

## Normative Docs

- `docs/tasks/complete/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- `src/config/notification-categories.ts`
- `src/emails/*.tsx`

## Dependencies & Impact

### Depends on

- `TASK-265` en estado `complete`.
- Namespaces de la capa dictionary-ready definidos (emails + notifications).

### Blocks / Impacts

- `TASK-266` Slice 4 child de emails — consume directamente el trabajo de esta task para localizar templates.
- Cualquier flujo de notificaciones in-app y digest que consume labels de `notification-categories`.

### Files owned

- `src/config/notification-categories.ts`
- `src/emails/*.tsx`
- `src/emails/components/EmailLayout.tsx` + `EmailButton.tsx` (shell institucional — Slice 0).
- `src/lib/copy/dictionaries/es-CL/emails.ts` (namespace nuevo — Slice 0).
- `src/lib/copy/types.ts` (extender union de namespaces).
- `src/lib/email/locale-resolver.ts` (helper canónico nuevo — Slice 0).
- `src/lib/reliability/queries/email-render-failure.ts` (signal nuevo — Slice 5).
- `src/lib/reliability/get-reliability-overview.ts` (wire del signal).
- Tests Vitest snapshot por template migrado: `src/emails/*.test.tsx` (15 nuevos, 2 existentes).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 (BLOQUEANTE) — Foundation: namespace `emails` + locale resolver + snapshot baseline

**Razón**: el sweep no puede iniciar sin (a) un namespace canónico donde aterrice el copy institucional de emails, (b) un helper para resolver `locale` al render time que TASK-266 pueda consumir sin refactor adicional, y (c) snapshot tests baseline para los 17 templates reales — sin éstos, "diff cero" es manualmente inverificable y la regresión silenciosa es inevitable.

- **0.a** — Crear namespace `emails` en [src/lib/copy/dictionaries/es-CL/emails.ts](../../src/lib/copy/dictionaries/es-CL/emails.ts) con sub-claves: `subjects`, `previewTexts`, `footer` (institucional + disclaimer + unsubscribe label), `ctas` (genéricos como "Ver en Greenhouse", "Abrir Greenhouse", "Ver propuesta"), `greetings` ("Hola %{name}"), `signoff`. Extender [src/lib/copy/types.ts](../../src/lib/copy/types.ts) con la union nueva. Stub `en-US` mirror de `es-CL` (TASK-266 lo traduce sin tocar consumers).
- **0.b** — Helper canónico `resolveEmailLocale({ recipientUserId?, tenantId?, override? })` en [src/lib/email/locale-resolver.ts](../../src/lib/email/locale-resolver.ts). Resolución cascada: `override` → `users.locale` (PG, lookup por `recipientUserId`) → `tenants.default_locale` (PG) → `'es-CL'` fallback. Server-only, idempotente, con TTL cache 60s in-process. **La implementación queda con stub `'es-CL'` siempre** hasta que TASK-266 active el lookup PG-backed — el contrato queda declarado para que consumers no se reescriban.
- **0.c** — Vitest snapshot tests baseline para los **17 templates reales** (`InvitationEmail`, `LeaveRequestDecisionEmail`, `LeaveRequestPendingReviewEmail`, `LeaveRequestSubmittedEmail`, `LeaveReviewConfirmationEmail`, `MagicLinkEmail`, `NotificationEmail`, `PasswordResetEmail`, `PayrollExportReadyEmail`, `PayrollReceiptEmail`, `PayrollLiquidacionV2Email`, `PayrollPaymentCancelledEmail`, `PayrollPaymentCommittedEmail`, `QuoteSharePromptEmail`, `VerifyEmail`, `WeeklyExecutiveDigestEmail`, `BeneficiaryPaymentProfileChangedEmail`). Cada test: render con fixture de props canónica + `expect(html).toMatchSnapshot()` + assertions de tokens de personalizacion. Patrón heredado de [PayrollExportReadyEmail.test.tsx](../../src/emails/PayrollExportReadyEmail.test.tsx) y [PayrollReceiptEmail.test.tsx](../../src/emails/PayrollReceiptEmail.test.tsx).

**Verificación Slice 0**: `pnpm test src/emails` pasa con 17 snapshots verdes ANTES de que cualquier slice de migración mergee. Cualquier slice posterior que cambie un byte de output rompe el snapshot — el operador re-aprueba con `pnpm test -u` solo si el cambio es intencional (debe documentarse en PR description).

**Estado 2026-05-06**: Slice 0 entregado en `develop` como foundation aditiva. Se declaro `emails` en `src/lib/copy`, se agrego `src/lib/email/locale-resolver.ts` con stub seguro a `es-CL`, y se cubrieron los 17 templates reales con snapshot baseline + assertions de tokens de personalizacion (nombres, cliente, montos, periodos, links y unsubscribe). No se tocaron `sendEmail`, Resend, outbox/webhooks, `NOTIFICATION_CATEGORIES`, `EmailLayout` ni `EmailButton`.

### Slice 1 — Notification categories

- Migrar las categorías de `notification-categories.ts` a `getMicrocopy().emails.notificationCategories.<code>.{label,description}` o equivalente.
- **Subjects canónicos por categoría**: extender el shape de `NotificationCategoryConfig` con `subjectKey: string` opcional que apunta a `getMicrocopy().emails.subjects.<key>`. **Decisión declarada (resuelve open question 1)**: los subjects de emails transactionales viven junto al `code` de la categoría/evento porque atan subject al evento canónico — i18n future-proof, single source of truth, alineado con `GREENHOUSE_EVENT_CATALOG_V1.md` donde cada evento outbox tiene metadata canónica.
- Labels/descriptions consumen dictionary-ready; el resto del shape (code, channels, audience, priority) queda en TS.
- Validar que admin-notifications UI, preferencias y digest usan los labels migrados sin cambios visuales (snapshot test del componente Vitest cubre).

**Estado 2026-05-06**: Slice 1 entregado como mejora incremental segura. Runtime real tenia 13 categorias, no 12; se migraron las 13. `label` y `description` salen de `getMicrocopy().emails.notificationCategories`, pero `code`, `defaultChannels`, `audience`, `priority`, `icon`, eventos, projections, webhooks, outbox, retry/idempotency y delivery siguen intactos. Se agrego `isNotificationCategoryCode()` para validar accesos dinamicos desde API/preferences. `subjectKey` queda diferido hasta un slice que conecte subjects con un consumer activo; agregar metadata muerta ahora aumentaria drift sin proteger delivery.

### Slice 2 — Email shell institucional (`EmailLayout` + `EmailButton`)

**Por qué primero el shell**: [EmailLayout.tsx](../../src/emails/components/EmailLayout.tsx) tiene su propia lógica bilingüe ad-hoc inline (footer disclaimer, unsubscribe link). Es la mayor concentración de copy institucional shared y es consumido por los 17 templates. Migrarlo primero baja el blast radius del Slice 3 (templates individuales heredan el shell ya migrado).

- `EmailLayout.tsx` consume `getMicrocopy().emails.layout.{logoAlt,tagline,automatedDisclaimer,unsubscribe}` para el shell institucional `es`. Mientras `en-US` siga como mirror de `es-CL`, el footer `en` conserva fallback legacy para no degradar correos internacionales.
- `EmailButton.tsx` conserva `children` y no agrega `actionKey` hasta que exista un consumer activo. El componente no contiene copy propio; forzar una API nueva ahora seria metadata muerta y aumentaria drift.
- Snapshot tests del shell con fixtures de los 4 locales esperados (es-CL hoy + 3 stubs idénticos para validar que la API no rompe).

**Estado 2026-05-06**: Slice 2A entregado solo para `EmailLayout`. El HTML de los 17 templates se mantiene estable por snapshot baseline. `EmailButton` queda diferido porque hoy no tiene copy interno; los CTAs viven en cada template y se migran en Slice 3 por grupo cohesivo. No se tocaron delivery, Resend, outbox/webhooks, event types, retries ni tokens de personalizacion.

### Slice 3 — Templates individuales (17 templates)

- Migrar los 17 templates al patrón canónico: subject + previewText + body institucional consumen `getMicrocopy`; copy de dominio (`{recipientName}`, `{periodLabel}`, montos formateados) queda local con interpolación.
- **Decisión declarada (resuelve open question 2)**: los **13 templates con bilingual ad-hoc** se migran AHORA, no se difieren. Cada `locale === 'en' ? '...' : '...'` se reemplaza por `getMicrocopy(locale).emails.<key>` donde `locale` viene de `resolveEmailLocale`. Durante TASK-408, el stub `en-US` es mirror del `es-CL` (zero behavior change verificado por snapshots). TASK-266 swap-ea el dictionary `en-US` real sin tocar templates.
- **Razón de migrar ahora vs diferir**: diferir significa que TASK-266 hereda 13 templates con patrones inconsistentes y debe reescribirlos para usar `getMicrocopy` antes de poder activar locales reales — duplicación de trabajo. Migrar ahora con stub identidad cierra el ciclo: TASK-266 solo necesita poblar el dictionary `en-US`. Y el snapshot test de Slice 0 garantiza output byte-idéntico antes/después del swap del dictionary stub.
- Cada template migrado refresca su snapshot test en el mismo PR (esperado: byte-idéntico al baseline; cualquier delta es bug).
- **Particionamiento por grupo cohesivo** (ver Rollout Policy): payroll-related (5 templates) → un PR; leave-related (4) → otro PR; auth/identity (Verify, MagicLink, PasswordReset, Invitation) → otro PR; finance/quote (Beneficiary, QuoteShare) → otro PR; weekly digest + notification genérico → otro PR. Total: 5 PRs para Slice 3.

**Estado 2026-05-06**: Slice 3A cierra el grupo auth con templates de bajo blast radius: `VerifyEmail`, `MagicLinkEmail`, `PasswordResetEmail` e `InvitationEmail`. Se agrego `selectEmailTemplateCopy()` para que los templates consuman dictionary `es` sin convertir `en` a espanol mientras `en-US` siga como mirror. Estos templates consumen `getMicrocopy().emails.auth.*` para `es` y conservan fallback legacy para `en`. Snapshot baseline sigue estable; no se tocaron subject registry, delivery auth, URLs ni handlers.

**Estado 2026-05-06**: Slice 3B migra `NotificationEmail` a `getMicrocopy().emails.genericNotification` con fallback legacy `en`. Snapshot baseline sigue estable; no se tocaron `NotificationService`, payloads, preferencias, unsubscribe, outbox, webhooks ni eventos reactivos.

**Estado 2026-05-06**: Slice 3C migra la cohorte leave (`LeaveRequestDecisionEmail`, `LeaveRequestSubmittedEmail`, `LeaveRequestPendingReviewEmail`, `LeaveReviewConfirmationEmail`) a `getMicrocopy().emails.leave.*` con fallback legacy `en`. Snapshot baseline sigue estable; no se tocaron handlers HR, approval authority, calendario operativo, balances, rutas, subjects, delivery, outbox, webhooks ni eventos reactivos.

**Estado 2026-05-06**: Slice 3D agrega `selectEmailIntlDateLocale()` para centralizar la proyeccion `es`/`en` -> `es-CL`/`en-US` usada por fechas en emails. `rg "locale === 'en'|const isEn = locale ===|const t = locale ===" src/emails` queda en 0 resultados; snapshots siguen estables.

**Estado 2026-05-06**: Slice 3E migra la cohorte payroll employee-facing (`PayrollReceiptEmail`, `PayrollPaymentCommittedEmail`, `PayrollPaymentCancelledEmail`, `PayrollLiquidacionV2Email`) a `getMicrocopy().emails.payroll.*`. La migracion separa copy estatico de tokens runtime para conservar la serializacion HTML de React Email: nombres, periodos, montos, fechas, procesador, motivo de cancelacion, links y adjuntos PDF siguen viniendo de props/callers. Snapshot baseline sigue byte-estable; no se tocaron `sendEmail`, subjects, payment lifecycle, attachment delivery, outbox, webhooks, projections ni eventos reactivos.

**Estado 2026-05-06**: Slice 3F migra `WeeklyExecutiveDigestEmail` (Nexa Insights) de forma deliberadamente limitada: solo copy estructural reusable (`subject`, labels, headings, severity labels, empty states, CTA, plain text) vive en `getMicrocopy().emails.weeklyExecutiveDigest`. El contenido propio de Nexa (`headline`, `narrative`, `rootCauseNarrative`, `space.name`, `href`, `actionLabel`, `closingNote` caller-provided) sigue siendo runtime/materializado y no se dictionary-fica. Snapshot baseline sigue byte-estable; no se tocaron `src/lib/nexa/digest`, ops-worker, delivery, outbox, webhooks, projections ni eventos reactivos.

**Estado 2026-05-06**: Slice 3G migra `PayrollExportReadyEmail` y `BeneficiaryPaymentProfileChangedEmail` a `getMicrocopy().emails.payroll.exportReady` y `getMicrocopy().emails.beneficiaryPaymentProfileChanged`. La migracion mantiene byte-estable el snapshot HTML y preserva tokens de negocio: periodo, montos, breakdowns, adjuntos, exportedBy/exportedAt, proveedor/banco, cuenta enmascarada, moneda, fecha efectiva/cancelacion y motivo siguen viniendo de props/callers. No se tocaron Resend, delivery, masking, finance beneficiary profile lifecycle, payroll export package, subjects contractuales, outbox, webhooks, projections ni eventos reactivos.

**Estado 2026-05-06**: Slice 3H migra `QuoteSharePromptEmail` y el registry `quote_share` a `getMicrocopy().emails.quoteShare`. La migracion conserva como runtime `customMessage`, `shareUrl`, quotation number/version, client, recipient, total, valid-until, sender fields, PDF flag y filename. Snapshot baseline sigue byte-estable; no se tocaron quote lifecycle, public share route, PDF attachment generation, Resend, delivery, outbox, webhooks, projections ni eventos reactivos.

### Slice 4 — Reliability signal `notifications.email.render_failure_rate`

- Reader: [src/lib/reliability/queries/email-render-failure.ts](../../src/lib/reliability/queries/email-render-failure.ts). Cuenta failures de render del outbox consumer en últimas 24h sobre `greenhouse_sync.outbox_events WHERE event_type LIKE 'notification.email.%' AND status='failed' AND last_error LIKE '%render%'`.
- Wire en `get-reliability-overview.ts` bajo subsystem `Event Bus & Sync Infrastructure` (mismo subsystem que `sync.outbox.unpublished_lag`). Severity: `error` si count > 0 (steady-state esperado = 0 — el render es determinístico salvo bugs nuevos). Window: 24h rolling. Domain tag: `integrations.notifications`.
- Captura de errores en el outbox consumer ya existe (`captureWithDomain(err, 'integrations.notifications', { extra })`). Slice solo declara el reader + wiring.
- Provee la red de seguridad post-sweep: si un template migrado regresiona en producción, el dashboard lo pinta en < 5 min (cron reliability) en lugar de esperar reporte de usuario.

### Slice 5 — Verificación de delivery + promoción de la rule a `error`

- Snapshot tests `pnpm test src/emails` verdes para los 17 templates en cada PR (mecánico, no manual).
- **Smoke staging** (delegado, no exhaustivo): enviar **un email de cada grupo cohesivo** (5 emails total: 1 payroll, 1 leave, 1 auth, 1 finance, 1 digest) a inbox de prueba — confirma que el render real (no solo snapshot) coincide con baseline. Inbox: `agent-qa@efeoncepro.com` o equivalente.
- Verificar `notifications.email.render_failure_rate` en `/admin/operations` durante 24h post-deploy = 0.
- Promote `greenhouse/no-untokenized-copy` a `error` mode (ver Closing Protocol).

## Out of Scope

- Traducción real de emails a otros locales (eso es `TASK-266`; este sweep deja stub mirror es-CL→en-US).
- Rediseño visual de templates o del shell `EmailLayout`.
- Cambios en el delivery pipeline, webhooks o notification outbox (consumer queda intacto).
- Shell, nav, CTAs en componentes UI (eso es `TASK-407`).
- Migrar templates de emails que vivan fuera de `src/emails/` (no existen hoy — verificado).
- Activar lookup PG-backed en `resolveEmailLocale` — el stub queda durante TASK-408; TASK-266 lo activa.

## Acceptance Criteria

Anclados al baseline 2026-05-06:

- [x] **Slice 0 mergeado** antes de cualquier sweep: namespace `emails` declarado, helper `resolveEmailLocale` con stub, 15 snapshot tests baseline verdes. Nota: runtime real tiene 17 templates cubiertos en una suite baseline compartida.
- [x] **17 templates** tienen snapshot test (`pnpm test src/emails` corre 17 con 0 fallos).
- [x] **13 categorías** de `notification-categories.ts` consumen `getMicrocopy` para `label` + `description`; `subjectKey` diferido hasta conectar un consumer activo seguro.
- [ ] **0 strings bilingües ad-hoc** (`locale === 'en' ? ... : ...`) restantes en `src/emails/` — verificación: `rg "locale\s*===\s*['\"]en['\"]" src/emails/ | wc -l` retorna 0.
- [ ] **0 imports de `greenhouse-nomenclature.ts`** desde `src/emails/` — verificación: `rg "from\s+['\"]@/config/greenhouse-nomenclature" src/emails/ | wc -l` retorna 0 (invariante preservada).
- [ ] **Diff de snapshot bytes pre/post migración** = 0 para cada template (cada PR documenta esto en description).
- [ ] **Reliability signal `notifications.email.render_failure_rate`** declarado, wired al overview, visible en `/admin/operations`. 24h post-deploy: count = 0.
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test` pasan en cada PR de slice.
- [ ] **Smoke staging** ejecutado: 5 emails de grupos cohesivos enviados a inbox de prueba, comparados visualmente con baseline.

## Verification

- `pnpm lint && npx tsc --noEmit && pnpm build && pnpm test src/emails` por cada PR.
- `rg "locale\s*===\s*['\"]en['\"]" src/emails/` retorna 0.
- `rg "from\s+['\"]@/config/greenhouse-nomenclature" src/emails/` retorna 0 (invariante).
- `rg "from\s+['\"]@/lib/copy" src/emails/` retorna ≥17 (todos los templates conectados).
- Snapshot tests cubren 17 templates × {html, subject, previewText} = 51 assertions.
- Reliability dashboard muestra `notifications.email.render_failure_rate` con steady=0 durante 24h post-deploy.
- Smoke staging: 5 emails enviados, recibidos, comparados pixel-by-pixel con captura baseline pre-migración.

## Rollout Policy

- **PR-by-slice + PR-by-grupo cohesivo**, no mega-PR.
- **Slice 0**: 1 PR (foundation, sin riesgo runtime — solo agrega tipos, helper stub, y snapshot baseline).
- **Slice 1**: 1 PR (notification-categories — 13 categorías, scope acotado).
- **Slice 2**: 1 PR (EmailLayout + EmailButton — alto blast radius porque afecta los 17 templates a la vez; snapshot tests existentes son la red).
- **Slice 3**: 5 PRs particionados por grupo cohesivo (payroll, leave, auth, finance, digest). Permite revert granular si un grupo regresiona.
- **Slice 4**: 1 PR (reliability signal — reader + wire).
- **Slice 5**: 1 PR (promoción rule a `error` + cleanup final).
- **Total estimado**: ~10 PRs.
- **Kill-switch operativo**: si un template post-deploy genera render failures > 0 en el signal, revert del PR de su grupo cohesivo restaura el estado anterior. Snapshot tests previenen que el revert mismo introduzca regresión.

## Hard rules & invariants (anti-regression)

- **NUNCA** migrar el subject o preview text de un email sin que su snapshot test cubra `email.subject` y `email.previewText` además del HTML body. Sin esto, regresiones en metadata pasan inadvertidas (caen al inbox del usuario sin renderizar nada en el HTML).
- **NUNCA** introducir un `getMicrocopy('en-US')` real en un template mientras TASK-266 no haya cerrado y poblado el dictionary `en-US`. Durante TASK-408, el stub `en-US` es mirror byte-idéntico de `es-CL` — el snapshot test es la evidencia mecánica.
- **NUNCA** importar de `@/config/greenhouse-nomenclature` desde `src/emails/`. Solo `@/lib/copy`, `src/emails/constants.ts` (tokens visuales) y `src/config/notification-categories.ts`. Verificado pre-execution; preservar como invariante.
- **NUNCA** mergear un slice sin pasar `pnpm test src/emails` con todos los snapshots verdes.
- **NUNCA** mergear un PR de Slice 3 sin `pnpm test -u` documentado en description si hubo cambio de snapshot — el cambio debe ser intencional + revisado.
- **NUNCA** computar `locale` ad-hoc en un template (`props.locale === 'en' ? ... : ...`). Toda resolución pasa por `resolveEmailLocale({...})`. La línea 94-96 de `EmailLayout.tsx` actual (`{locale === 'en' ? 'This is...' : 'Este es...'}`) es exactamente el patrón prohibido.
- **SIEMPRE** declarar en cada PR description: lista de templates tocados + delta de snapshot bytes esperado (debe ser 0) + verificación de la invariante de imports.
- **SIEMPRE** verificar el reliability signal post-deploy. Sin esto, una regresión en producción solo se detecta por reporte de usuario.

## 4-Pillar Score (post-ajustes)

| Pillar | Score | Justificación |
| --- | --- | --- |
| **Safety** | ✅ | Particionamiento PR-by-grupo cohesivo + snapshot tests + kill-switch via revert. Una regresión en `MagicLinkEmail` (auth crítico) se aísla a su grupo y se revierte sin impactar payroll. Stub `en-US` = mirror `es-CL` evita enviar copy roto a usuarios que esperan español. |
| **Robustness** | ✅ | 17 snapshot tests + 51 assertions (html + subject + previewText) ofrecen baseline mecánico. CHECK constraints aplican vía invariantes verificables con `rg`. PR description documenta diff esperado. |
| **Resilience** | ✅ | Reliability signal `notifications.email.render_failure_rate` declarado y wired. 24h post-deploy con count=0 = success. count>0 = pager sintético + revert. Cierra el gap "regresión silenciosa hasta reporte de usuario". |
| **Scalability** | ✅ | Helper `resolveEmailLocale` declara contrato que TASK-266 consume sin refactor. Namespace `emails` extensible (subjects, footer, ctas, greetings, signoff) absorbe N templates sin fragmentación. Patrón replica VIEW canónica + helper + reliability signal del repo. |

## Closing Protocol

- [ ] Actualizar `Handoff.md` con resumen de migración (incluyendo el delta de snapshot tests: 2 → 17).
- [ ] Registrar en `TASK-266` que (a) namespace `emails` está listo para poblarse en `en-US` real, (b) `resolveEmailLocale` espera lookup PG-backed, (c) los 17 templates ya consumen `getMicrocopy` — solo se necesita activar el dictionary.
- [ ] **Confirmar que TASK-407 Slice 0 mergeó** la extensión de la rule a month arrays + JSX text CTAs. Sin Slice 0, el `error` mode dejaría dos patterns expuestos a drift silencioso.
- [ ] **Promote `greenhouse/no-untokenized-copy` a error mode** (heredado de TASK-265 Slice 5). Editar `eslint.config.mjs`: cambiar `'warn'` → `'error'` en la rule, verificar `pnpm lint` clean (0 errors), commit con la promoción. Al cerrar, el gate definitivo bloquea regresiones desde CI sobre los **6 patterns** que el programa cubre: aria-labels + status maps + empty states + secondary props + month arrays + JSX text CTAs.
- [ ] **Auditar disables**: `rg "eslint-disable.*no-untokenized-copy" src/ | wc -l` ≤ 20 con razones documentadas (escape hatch policy de TASK-407). Si excede, consolidar antes de promover.
- [ ] **Verificar reliability signal** durante 24h post-deploy de cada slice: `notifications.email.render_failure_rate` steady=0. Captura del dashboard adjunta al Handoff.
- [ ] **Verificar invariantes** una última vez: `rg "from\s+['\"]@/config/greenhouse-nomenclature" src/emails/ | wc -l` = 0; `rg "locale\s*===\s*['\"]en['\"]" src/emails/ | wc -l` = 0.

## Open Questions

Las dos open questions originales **se resuelven dentro de esta spec** (no se difieren):

- ~~¿Los subjects de emails deben vivir en la capa canónica o son suficientemente específicos por template para quedar locales?~~ — **Resuelto en Slice 1**: viven junto al `code` del evento canónico en `notification-categories.ts` via `subjectKey: string` que apunta a `getMicrocopy().emails.subjects.<key>`. **Razón** (más robusto/seguro/resiliente/escalable): atan subject al evento outbox canónico → consistencia entre delivery channels (email + in-app + push) → SSOT alineado con `GREENHOUSE_EVENT_CATALOG_V1.md` → i18n future-proof sin refactor cuando TASK-266 active locales reales.
- ~~¿Deprecar el patrón bilingüe manual de `LeaveRequestPendingReviewEmail` o mantenerlo hasta que TASK-266 entregue alternativa?~~ — **Resuelto en Slice 3**: migrar AHORA los 13 templates con ad-hoc bilingüe a `getMicrocopy(locale)` con stub `en-US` mirror de `es-CL`. **Razón** (más robusto/seguro/resiliente/escalable): (a) elimina duplicación de trabajo en TASK-266; (b) snapshot tests garantizan output byte-idéntico durante el sweep (zero behavior change); (c) cuando TASK-266 active el dict `en-US` real, los consumers no se reescriben — solo el dictionary cambia; (d) el signal de reliability cubre la transición.
