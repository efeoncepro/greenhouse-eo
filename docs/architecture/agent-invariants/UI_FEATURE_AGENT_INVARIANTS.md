# Invariantes operativos para agentes — UI/feature platforms (TASK-553…1059)

---

## Invariantes operativos para agentes — UI/feature platforms (TASK-553…1059)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim.** UI/feature platforms + metodología de verificación visual. Contrato por sub-área en sus specs/task-specs (citadas en cada bloque). Dedup = Slice 4.

### Home Rollout Flag Platform (TASK-780)

Toda flag que controle variantes de shell o features rollouteables del módulo home debe vivir en `greenhouse_serving.home_rollout_flags` (tabla canónica con scope precedence `user > role > tenant > global`). Reemplaza la env var binaria `HOME_V2_ENABLED` que causó divergencia visible entre dev (`dev-greenhouse.efeoncepro.com`) y prod (`greenhouse.efeoncepro.com`) el 2026-05-04.

**Read API canónico**:

- Resolver: `src/lib/home/rollout-flags.ts` (`resolveHomeRolloutFlag`, `isHomeV2EnabledForSubject`). PG-first → env fallback → conservative default disabled. In-memory cache TTL 30s.
- Mutations: `src/lib/home/rollout-flags-store.ts` (`upsertHomeRolloutFlag`, `deleteHomeRolloutFlag`, `listHomeRolloutFlags`). Validation: scope_id constraints, reason ≥ 5 chars, idempotent UPSERT.
- Admin endpoint: `GET/POST/DELETE /api/admin/home/rollout-flags` (gated by `requireAdminTenantContext`).
- Reliability signal: `home.rollout.drift` (kind=`drift`, severity=`error` si count>0). Detecta missing global row, PG↔env divergence, opt-out rate > 5%.

**Defensa-en-profundidad**:

- CHECK constraint `home_rollout_flags_key_check` whitelist de `flag_key` (extender CHECK al agregar flag nueva).
- CHECK constraint `home_rollout_flags_scope_id_required` (scope_id NULL solo cuando scope_type='global').
- Audit trigger `set_updated_at` BEFORE UPDATE.
- Sentry tag `home_version: 'v2' | 'legacy'` en `captureHomeError` y `captureHomeShellError`.
- Defensive try/catch en `src/app/(dashboard)/home/page.tsx`: V2 throw → degrade graceful a legacy + Sentry tagged.

**⚠️ Reglas duras**:

- **NUNCA** crear env vars binarias para feature flags nuevas de UI/shell. Toda flag debe nacer como fila en `home_rollout_flags` (variantes de shell) o `home_block_flags` (kill-switches per-block dentro de V2).
- **NUNCA** leer `process.env.HOME_V2_ENABLED` directo en código nuevo. Solo el resolver canónico lo hace, y solo como fallback graceful cuando PG falla.
- **NUNCA** componer la decisión de variant en cliente. Server-only por construcción (`import 'server-only'`).
- **NUNCA** reportar 5xx desde el endpoint admin con stack traces. Errores sanitizados (sin env leakage).
- **NUNCA** hardcodear `homeVersion='v2'` cuando el flag resolution dice `legacy`. El tag tiene que reflejar la variante real renderizada para que el dashboard distinga correctamente.
- **NUNCA** invalidar el cache del resolver desde mutations sin invocar `__clearHomeRolloutFlagCache`. La store helpers ya lo hacen — los consumers nunca tocan el cache directo.
- Cuando emerja una flag nueva (e.g. `home_v3_shell`, `home_layout_experimental`), extender CHECK constraint `home_rollout_flags_key_check` + agregar al type union `HomeRolloutFlagKey` + agregar admin UI eventualmente.

**Spec canónica**: `docs/tasks/in-progress/TASK-780-home-rollout-flag-platform.md`.

### Nexa Insights detail page canonical invariants (TASK-947, desde 2026-05-28)

Toda surface que necesite "navegar al detail de un Nexa Insight" (Home bento, Agency ICO, Person 360 narrative, Space 360 overview, Finance dashboard, Weekly Digest email, Teams notifications, futuras superficies) **debe** apuntar al routing canonical `/nexa/insights/[id]` y consumir el helper `readNexaInsightDrill(id, subject)` para resolver el detail. Cierra el bug class 404 sistemático del CTA "Ver causa raíz" (drift TASK-696).

**Read API canónico**:

- Routing: `/nexa/insights/[id]` (top-level cross-domain, NO `/agency/insights/*` legacy). Mirror del precedente `/admin/...` (lane cross-domain, no dominio).
- Dispatch prefix canonical:
  - `EO-AIS-*` (12 hex) — signal-anchored (default cards "Ver causa raíz" del current). Estable cross-period TASK-943 append-only. Generado por `stableAiId('AIS', ...)` (ico-engine/ai/types.ts:80).
  - `EO-AIE-*` (8 hex) — enrichment-anchored (share permalinks TASK-449). Snapshot específico. Generado por `stableEnrichmentId(signalId, promptHash)` (llm-types.ts:343).
  - `EO-AIH-*` (8 hex) — enrichment-history forensic. Generado por `stableEnrichmentHistoryId(runId, enrichmentId)` (llm-types.ts:346).
- Helper canonical único: `readNexaInsightDrill(id, subject) → NexaInsightDrillResult` server-only en `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts`. Detecta prefix → dispatchea lookup → aplica subject-aware filter → retorna discriminated union.
- 5 states canonical: `current` | `superseded` (con `currentSignalDrillId` link al vigente) | `expired` (con `resolvedAt`) | `not_found` | `degraded` (con `reason: 'pg_read_failed' | 'history_unavailable' | 'pg_stale'`).
- Capability: `nexa.insights.read` (module `delivery`, action `read`, scope `tenant/all`). Seedeada en `greenhouse_core.capabilities_registry` (migration `20260529004012583`). Grant matriz canonical V1: `EFEONCE_ADMIN ∪ FINANCE_ADMIN ∪ HR_MANAGER` (role) + route_groups `internal/finance/hr` (broad operational).
- Helper URL: `buildNexaInsightDrillHref(id)` → `/nexa/insights/<id>`. Centraliza la shape para evitar drift cross-surface.

**3-tier lookup canonical** (enrichment-anchored `EO-AIE-*`):

1. PG serving `greenhouse_serving.ico_ai_signal_enrichments` (current `status='succeeded'`).
2. Fallback `greenhouse_serving.ico_ai_signal_enrichment_history` (TASK-914 history). Si hit → `superseded` state con link al `signalId` vigente.
3. Miss → `not_found`.

**Subject-aware filter canonical** (sin 403, anti-oracle TASK-872):

- `tenantType='client'` → SIEMPRE `not_found` (V1 internal-only).
- `EFEONCE_ADMIN` → SIEMPRE permitido.
- `route_groups` broad `internal/finance/hr` → permitido (acceso operacional).
- Collaborator sin route_group broad → solo si `subject.memberId === insight.memberId` (self-access).
- Cualquier fallback → `not_found`.

**⚠️ Reglas duras**:

- **NUNCA** crear detail page de Nexa Insights bajo route_group de dominio (`/agency/...`, `/finance/...`, `/people/...`). Canonical es `/nexa/insights/[id]` top-level. Mismo principio que `/admin/...` lane.
- **NUNCA** consumer downstream compone su propio drawer/modal/detail para Nexa Insights. Toda navegación pasa por `/nexa/insights/[id]` (deep-linkable, share-friendly, estable cross-time/tenant/domain).
- **NUNCA** crear URLs canonical ancladas al `enrichmentId` para cards "Ver causa raíz" del current. Cards usan `signalId` (estable cross-period). `enrichmentId` reservado para share/forensic explícito (TASK-449 V1.3).
- **NUNCA** retornar `403` desde el detail page cuando subject sin acceso. `notFound()` siempre (anti-oracle TASK-872). 403 leakea info de existencia al atacante; legítimos bloqueados se detectan via reliability signals upstream.
- **NUNCA** read directo de `ico_engine.ai_signals` raw BQ ni de `ico_ai_signal_enrichments`/`ico_ai_signal_enrichment_history` PG en consumers. Pasa por `readNexaInsightDrill`. VIEW canonical `ai_signals_current` TASK-943.
- **NUNCA** colapsar UI states `not_found` + `expired` + `superseded` + `degraded` en un único "Sin datos" ambiguo. Mapping explícito TASK-946 framework (`current → default` / `superseded → partial banner amber` / `expired → empty-positive` / `not_found → notFound()` / `degraded → error banner`).
- **NUNCA** mostrar narrativa superseded sin banner explícito "versión histórica" + link al `currentSignalDrillId` cuando exista.
- **NUNCA** invocar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'nexa_insight_detail', stage: 'pg_read' | 'page_loader' } })`.
- **NUNCA** seed `nexa.insights.read` en TS catalog sin grant en `runtime.ts` mismo PR (invariant TASK-873 + TASK-935). Guard mecánico `capability-grant-coverage.test.ts` rompe build si emerge drift.
- **NUNCA** emit URL `/agency/insights/*` desde loader/componente nuevo. Canonical `/nexa/insights/[id]`. Grep `rg "/agency/insights/" src --include='*.ts' --include='*.tsx'` debe estar vacío (excepto comentarios y tests).
- **NUNCA** romper el dispatch prefix `EO-AIS-*` / `EO-AIE-*` / `EO-AIH-*` en el resolver. Semántica anchor estable vs snapshot share-friendly vs forensic — los 3 tienen propósitos distintos.
- **NUNCA** modificar la `severity_color` / `severity_label` map en `GH_NEXA` para un caso específico del detail. Reusa los tokens canonical existentes (TASK-696 / TASK-945) — single source of truth.
- **SIEMPRE** que email/Teams notification incluya link a insight, usar `/nexa/insights/<signalId>` (estable cross-time + cross-tenant + cross-domain). Cards default = `signalId`; share buttons = `enrichmentId` explícito.
- **SIEMPRE** que emerja consumer cross-surface nuevo que necesite "detail de un Nexa Insight", navegar al canonical — cero composición ad-hoc.
- **SIEMPRE** que el LLM-enrichment-worker regenere un enrichment, el URL `/nexa/insights/EO-AIS-*` sigue válido apuntando al current (signal-anchored = estable cross-regeneration por design).
- **SIEMPRE** que se introduzca una nueva surface emisora de drillHref a Nexa Insights, agregar test focal anti-regresión que assert (a) la URL es `/nexa/insights/*` (NO `/agency/insights/*`) y (b) usa `signalId` (NO `enrichmentId`) para cards default.

**Spec canónica**: `docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md`. Patrones fuente: TASK-611 (organization workspace projection — detail page server-side con projection + degraded honest), TASK-872 (anti-oracle `notFound()` pattern), TASK-873 (capability runtime grant invariant + guard mecánico), TASK-935 (capability grants reconciliation + DEVOPS_OPERATOR no-existe enforcement), TASK-946 (12 canonical UI states framework). Helpers canónicos: `readNexaInsightDrill`, `buildNexaInsightDrillHref`, `detectNexaIdKind`, `NEXA_ID_PREFIXES` (todos en `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts`).

### Quick Access Shortcuts Platform (TASK-553)

Toda surface que renderice atajos top-level de navegación (header `<ShortcutsDropdown />`, Home `recommendedShortcuts`, futuras command palettes, Mi Greenhouse, settings personales) **debe** consumir el resolver canónico desde `src/lib/shortcuts/resolver.ts`. Reemplaza los arrays hardcodeados de shortcuts que vivían en `NavbarContent.tsx` (vertical + horizontal) y los desacopla del catálogo Home.

**Read API canónico**:

- Catálogo: `src/lib/shortcuts/catalog.ts` (`SHORTCUT_CATALOG`, `AUDIENCE_SHORTCUT_ORDER`, `getShortcutByKey`, `isKnownShortcutKey`). Single source of truth de IDs, labels, subtitles, routes, iconos, módulo y dual-plane gates opcionales (`viewCode` + `requiredCapability`).
- Resolver: `resolveAvailableShortcuts(subject)`, `resolveRecommendedShortcuts(subject, limit?)`, `validateShortcutAccess(subject, key)` (write-path boolean), `projectShortcutForHome(shortcut)` (legacy projection bridge).
- Store: `src/lib/shortcuts/pins-store.ts` (`listUserShortcutPins`, `pinShortcut` idempotente, `unpinShortcut` idempotente, `reorderUserShortcutPins` atómica, `listDistinctPinnedShortcutKeys` para reliability).

**Persistencia**: `greenhouse_core.user_shortcut_pins` con FK CASCADE on user delete, audit trigger `updated_at`, ownership `greenhouse_ops` + grants `greenhouse_runtime`. Scope per-usuario (no por tenant): los pins son navegación personal, la revalidación de acceso ocurre en READ time contra session vigente.

**API canónica** (`/api/me/shortcuts`):

- `GET /api/me/shortcuts` → `{ recommended, available, pinned }` para usuario actual.
- `POST /api/me/shortcuts` → pin idempotente. Body: `{ shortcutKey }`.
- `DELETE /api/me/shortcuts/[shortcutKey]` → unpin idempotente.
- `PUT /api/me/shortcuts/order` → reorder atómico. Body: `{ orderedKeys: string[] }`.

Auth: `getServerAuthSession` + `can(subject, 'home.shortcuts', 'read')` + `validateShortcutAccess` server-side antes de cualquier write. Errores sanitizados con `redactErrorForResponse` + `captureWithDomain('home', ...)`.

**Reliability signal canónico**: `home.shortcuts.invalid_pins` (kind=`drift`, severity=`warning` si count>0, steady=0). Detecta llaves pineadas sin entry en el catálogo TS. UI no rompe (reader filtra), pero ops detecta drift.

**⚠️ Reglas duras**:

- **NUNCA** hardcodear arrays de shortcuts en un layout o `NavbarContent`. La fuente única es `src/lib/shortcuts/catalog.ts`. Drift detectado por code review.
- **NUNCA** decidir visibilidad de un shortcut desde el cliente. El cliente lee `/api/me/shortcuts` que devuelve solo lo autorizado.
- **NUNCA** persistir un pin sin pasar por `validateShortcutAccess` server-side. El POST handler lo enforce — no replicar la lógica del cliente.
- **NUNCA** mostrar un shortcut pineado sin re-validar acceso al render. El reader del API ya lo filtra; cualquier consumer alternativo debe pasar por el resolver.
- **NUNCA** mezclar el shape de header (`{key, label, subtitle, route, icon, module}`) con el legacy de Home (`{id, label, route, icon, module}`). Use `projectShortcutForHome` cuando se necesite el shape legacy.
- **NUNCA** introducir un nuevo gate (e.g. `requiredFeatureFlag`) sin extender `CanonicalShortcut` + `isShortcutAccessible` en el resolver. Cero branching inline en consumers.
- Cuando emerja una surface adaptativa nueva (Mi Greenhouse, command palette, settings personales con atajos), debe consumir el resolver — no copiar el catálogo ni reimplementar el gate.

**Spec canónica**: `docs/tasks/complete/TASK-553-quick-access-shortcuts-platform.md`. Doc funcional: `docs/documentation/plataforma/accesos-rapidos.md`. Manual: `docs/manual-de-uso/plataforma/accesos-rapidos.md`. Delta UI Platform: `docs/architecture/ui-platform/HISTORIAL.md` (2026-05-04).

### Operational Data Table Density Contract (TASK-743)

Toda tabla operativa con celdas editables inline o > 8 columnas debe vivir bajo el contrato de densidad. Resuelve el overflow horizontal contra `compactContentWidth: 1440` de manera robusta y escalable, sin parchear caso-por-caso.

- **3 densidades canonicas** (`compact` / `comfortable` / `expanded`) con tokens fijos: row height, padding, editor min-width, slider visibility, font size.
- **Resolucion**: prop > cookie `gh-table-density` > container query auto-degrade (< 1280px baja un nivel) > default `comfortable`.
- **Wrapper canonico**: `<DataTableShell>` con `container-type: inline-size`, `ResizeObserver`, sticky-first column, scroll fade en borde derecho cuando hay overflow.
- **Primitive editable canonica**: `<InlineNumericEditor>` (reemplaza `BonusInput`). En `compact` solo input, en `comfortable` input + slider en popover-on-focus, en `expanded` input + slider inline + min/max captions.
- **Ubicacion**: `src/components/greenhouse/data-table/{density,useTableDensity,DataTableShell}.tsx` y `src/components/greenhouse/primitives/InlineNumericEditor.tsx`.
- **Spec canonica**: `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md`.
- **Doc funcional**: `docs/documentation/plataforma/tablas-operativas.md`.

**⚠️ Reglas duras**:

- **NUNCA** crear una `Table` MUI con > 8 columnas o con `<input>`/`<TextField>`/`<Slider>` dentro de `<TableBody>` sin envolverla en `<DataTableShell>`. Lint rule `greenhouse/no-raw-table-without-shell` bloquea el commit.
- **NUNCA** hardcodear `minWidth` en una primitiva editable inline. Debe leer la densidad via `useTableDensity()`.
- **NUNCA** mover `compactContentWidth: 1440` a `'wide'` global para "resolver" un overflow. Es cortoplacista y rompe consistencia con dashboards diseñados a 1440. La solucion canonica es el contrato.
- **NUNCA** duplicar `BonusInput`. Esta marcado como deprecated re-export que delega en `<InlineNumericEditor>`. Cualquier consumer nuevo debe usar la primitiva canonica directamente.
- **NUNCA** desactivar el visual regression test `payroll-table-density.spec.ts` para forzar un merge. Si falla por overflow, respetar el contrato; no bypass.
- Cuando emerja una tabla operativa nueva (ProjectedPayrollView, ReconciliationWorkbench, IcoScorecard, FinanceMovementFeed), migrarla al contrato de manera oportunista. La lint rule la fuerza al primer toque significativo.

### Final Settlement Document Lifecycle invariants (TASK-863 V1.5.2)

Toda transición del state machine de `greenhouse_payroll.final_settlement_documents` (renuncia voluntaria; extensible a futuras causales) **debe** regenerar el PDF persistido para mantener el invariante "`pdf_asset_id` apunta a un PDF rendereado con el `documentStatus` actual de DB". El bug class detectado live 2026-05-11 con el finiquito de Valentina Hoyos: el doc se aprobó en DB pero el operador descargaba el asset persistido con el render original del estado `rendered` (badge "Borrador HR" + watermark "PROYECTO"), porque solo `issued` y `signed_or_ratified` regeneraban — las 5 transitions restantes (`in_review`, `approved`, `voided`, `rejected`, `superseded`) dejaban el PDF stale.

**Read API canónico**:

- Helper canónico atómico: `regenerateDocumentPdfForStatus(client, document, newStatus, actorUserId, ratification?)` en [src/lib/payroll/final-settlement/document-store.ts](src/lib/payroll/final-settlement/document-store.ts). Acepta el set canónico cerrado `'in_review' | 'approved' | 'issued' | 'signed_or_ratified' | 'voided' | 'rejected' | 'superseded'`. Falla soft (transition de DB ya commiteó; estado legal es source of truth) con `captureWithDomain('payroll', err, ...)` para Sentry rollup.
- Asset metadata canónica: cada regen persiste `metadata_json.documentStatusAtRender = newStatus` en `greenhouse_core.assets`. NUNCA cambiar el nombre de esta key sin actualizar el reader del signal.
- Reliability signal: `payroll.final_settlement_document.pdf_status_drift` ([src/lib/reliability/queries/final-settlement-pdf-status-drift.ts](src/lib/reliability/queries/final-settlement-pdf-status-drift.ts)). Detecta `document_status` actual != `asset.metadata_json->>'documentStatusAtRender'`. Steady=0. Severity warning si count>0, error si drift > 24h.
- Test anti-regresión: `document-status-regen-invariant.test.ts` parsea el source y verifica que TODA `SET document_status = 'X'` (excepto `rendered`) tiene un call matchedo a `regenerateDocumentPdfForStatus(client, ..., 'X', ...)`. Rompe build si emerge un transition nueva sin regen.

**Matriz canónica de watermark + badge per status** (idempotente con la matriz V1.1 en spec finiquito):

| documentStatus | Watermark | Badge label |
| --- | --- | --- |
| `rendered` | PROYECTO (warning) | Borrador HR |
| `in_review` | PROYECTO (warning) | En revisión interna |
| `approved` | PROYECTO (warning) | Aprobado · pendiente de emisión |
| `issued` | CLEAN | Listo para firma |
| `signed_or_ratified` | CLEAN | Firmado / ratificado |
| `voided` | ANULADO (error) | Anulado |
| `rejected` | RECHAZADO (error) | Rechazado por trabajador |
| `superseded` | REEMPLAZADO (neutral) | Reemplazado |

**⚠️ Reglas duras**:

- **NUNCA** hacer `UPDATE greenhouse_payroll.final_settlement_documents SET document_status = 'X' ...` sin llamar a `regenerateDocumentPdfForStatus(client, document, 'X', actorUserId, ...)` dentro de la misma transacción inmediatamente después. El test anti-regresión rompe build si emerge un callsite que viole esto.
- **NUNCA** invocar `Sentry.captureException()` directo en el regen failure path. Usar `captureWithDomain(err, 'payroll', { tags: { source: 'final_settlement_pdf_regen', stage: newStatus }, extra: { ... } })`.
- **NUNCA** persistir un PDF de finiquito sin `metadata_json.documentStatusAtRender`. El reliability signal lo detecta como drift y operador puede ver el problema antes de que un cliente lo reporte.
- **NUNCA** asumir que el snapshot en memoria refleja el documentStatus actual post-update sin re-leer la fila o sin pasar por el helper. El helper hace el regen+UPDATE pdf_asset_id en una sola tx atomic.
- **NUNCA** bloquear la transition de estado si el render falla. La DB es source of truth del estado legal; el PDF es un artefacto derivado. Reportar via Sentry y dejar que el reliability signal alerte hasta que el operador haga reissue.
- **NUNCA** agregar una transition nueva al state machine (e.g. `archived`, `notified_to_dt`) sin: (a) extender el type union `DocumentStatusForRegen` en el helper, (b) llamar al helper en el código de la transition, (c) extender la matriz canónica de watermark/badge, (d) extender el test anti-regresión + el array `REGEN_REQUIRED_STATUSES`.
- **NUNCA** modificar la key `documentStatusAtRender` en el asset metadata sin actualizar paralelamente: (a) el reader del reliability signal, (b) el test anti-regresión que la valida.
- **SIEMPRE** que un caller del helper retorne `null` (regen failure), preservar el `pdf_asset_id` previo del documento + spread del row de DB original (ver pattern `regenerated ? { ...document, pdfAssetId, contentHash } : document`).

**Spec canónica**: `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Delta V1.5.2). Task evidence: `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md` Delta V1.5.2.

### Real-Artifact Iterative Verification Loop — metodología canónica para features visuales (TASK-863 V1.1→V1.5.1)

Para cualquier feature que **emita o renderice un artefacto consumido por humanos fuera del agente** — PDFs operativos, documentos legales, emails transaccionales, layouts de detalle complejos, dashboards ejecutivos, exports Excel, recibos, certificados, contratos, addenda — el contrato técnico (`tsc --noEmit` + `pnpm lint` + tests unitarios + fixtures sintéticos) **NO es suficiente** para garantizar production-readiness. El bug class detectado live 2026-05-11 en el finiquito de Valentina Hoyos (5 rondas iterativas V1.1→V1.5 + hotfix V1.5.1) lo demostró: 12 hallazgos visuales + 5 bloqueantes legales **invisibles** al audit pre-emisión emergieron solo al **emitir un caso real**, capturarlo, y re-auditarlo con skills sobre el artefacto real.

**Metodología canónica de 7 pasos** (reusable cross-feature):

1. **Implementar V1** con audit pre-emisión normal (skills de dominio consultadas pre-implementation, `tsc --noEmit`, `pnpm lint`, tests unitarios, fixtures sintéticos, lint rules, type checks).
2. **Acuerdo explícito con el usuario** para entrar al loop de verificación visual con caso real. El usuario aporta datos productivos (cliente/colaborador/proveedor real con datos reales — nombre, RUT, dirección, cargo, monto). El agente NO inventa datos; opera sobre el caso que el usuario aprueba.
3. **Sesión Playwright + Chromium con agent auth** (NO mocks):
   - Setup: `AGENT_AUTH_SECRET=<secret> node scripts/playwright-auth-setup.mjs` genera `.auth/storageState.json` con sesión NextAuth válida del usuario `agent@greenhouse.efeonce.org`.
   - Navegar al portal real (dev local `http://localhost:3000`, staging `dev-greenhouse.efeoncepro.com` via bypass, o producción cuando aplica — coordinar con el usuario).
   - Trigger la acción que emite el artefacto (click "Emitir", "Calcular", "Enviar", "Generar PDF", etc.) usando la UI exacta del operador.
4. **Capturar el artefacto real**:
   - **PDFs**: descargar el asset emitido (`/api/assets/private/[id]` con sesión válida), abrir con macOS Preview / pdf viewer y screenshot de cada página.
   - **Emails**: invocar el preview endpoint canónico (`/api/emails/preview/[template]`), screenshot del render Chromium o exportar HTML.
   - **UI**: screenshot del browser Chromium con la página completa rendereada (Playwright `page.screenshot({ fullPage: true })` o equivalente manual).
   - **Excel**: descargar el archivo y abrirlo con Numbers/Excel para inspección visual + verificar agregaciones.
   - **Compartir captura con el agente** en el chat (drag & drop / paste image / file path) para que el agente la consuma visualmente.
5. **Re-audit comprehensive con 3 skills sobre el artefacto real** (no fixture sintético):
   - **Skill de dominio** del feature (e.g. `greenhouse-payroll-auditor` para nómina/finiquitos, `greenhouse-finance-accounting-operator` para finance, `greenhouse-hr` para HR, `commercial-expert` para GTM/sales, etc.).
   - **Skill UX writing del registro** correspondiente (`greenhouse-ux-writing` en modo `es-CL formal-legal` para textos jurídicos, `es-CL operativo` para docs operacionales, `es-CL técnico` para integraciones, `en-US` para audiencias internacionales).
   - **Skill visual** apropiada (`modern-ui` para jerarquía/tipografía/spacing/balance, `greenhouse-ux` para layout/component selection, `greenhouse-microinteractions-auditor` cuando hay motion/feedback).
   - Las 3 skills miran la **misma evidencia visual** (el screenshot/PDF/email real) y reportan independientemente; sus hallazgos se consolidan.
6. **Iterar fixes hasta limpieza total**:
   - Aplicar fixes al código.
   - Re-emitir el artefacto (paso 3 + 4 nuevamente).
   - Re-auditar (paso 5 nuevamente).
   - Cerrar bloqueantes uno a uno; cada round produce un commit V1.x.
   - El loop termina cuando las 3 skills reportan zero blockers Y el usuario aprueba visualmente el resultado.
7. **Canonizar el resultado** en:
   - Spec arquitectónica (`docs/architecture/<DOMAIN>_V1_SPEC.md` con Delta del round).
   - Doc funcional (`docs/documentation/<domain>/<feature>.md` con bump de versión).
   - Manual de uso (`docs/manual-de-uso/<domain>/<feature>.md`) si aplica al operador.
   - ADR en `DECISIONS_INDEX.md` si la decisión es contractual cross-domain.
   - CLAUDE.md + AGENTS.md con invariantes duros si emergen reglas reusables (caso real: Semantic Column Invariants).
   - Task delta con resumen de los rounds + aprendizaje canonizado.

**Aprendizaje meta canonizado** (TASK-863 evidencia):

Sin paso 3-5 (loop real con artefacto + 3-skill audit), bugs como:

- B-1 cláusula PRIMERO mezclando hitos legales distintos (vicio defendible en demanda)
- B-2 cláusula SEGUNDO con verbo performativo incorrecto (vicio de consentimiento)
- B-3 cláusula CUARTO citando solo modificatoria (jurídicamente débil)
- V1.5.1 cargo del trabajador en col empleador (mezcla semántica de partes)
- Ligature "fi" rota produciendo "frma" / "defnitivo" / "ratifcada" (typography drift)
- Footer overlap visual / page break partiendo cláusulas (layout drift)

**quedan latentes** hasta que un cliente, abogado, contralor o auditor externo los detecte — momento en que el costo de remediación (relación con cliente, retraso operativo, riesgo legal/financiero) es **órdenes de magnitud mayor** al costo del loop.

**Cuándo aplicar el loop (decision tree)**:

- ¿El feature emite un artefacto que un humano externo al equipo va a leer/firmar/auditar? → SÍ, aplicar loop completo (pasos 1-7).
- ¿El feature es solo backend (endpoint, sync, cron) sin render visual? → NO, audit técnico es suficiente.
- ¿El feature es UI interna del agente (admin tools, debug surfaces)? → Loop simplificado (pasos 1-3 + visual review, sin 3-skill audit).
- ¿El feature es UI de operador interno (HR, Finance, Agency)? → Loop completo si el resultado de la UI afecta decisiones operativas con blast radius (e.g. cálculo de finiquito, conciliación bancaria, cierre mensual). Audit simplificado si es read-only.

**Herramientas canónicas del loop**:

| Capa | Herramienta canónica | Comando / archivo |
| --- | --- | --- |
| Agent auth | NextAuth headless | `POST /api/auth/agent-session` con `AGENT_AUTH_SECRET` |
| Playwright setup | Storage state generation | `node scripts/playwright-auth-setup.mjs` |
| Staging request bypass SSO | `staging-request.mjs` | `pnpm staging:request <path>` |
| PDF capture | Asset download + macOS Preview screenshot | `/api/assets/private/[id]` + `cmd+shift+5` |
| Email preview | Template render endpoint | `/api/emails/preview/[template]` |
| UI screenshot | Playwright full-page | `await page.screenshot({ fullPage: true })` |
| Excel inspection | Numbers / Excel macOS | descarga + apertura manual |
| Skill re-audit | Agent invocation con artefacto | drag-drop screenshot al chat + invocar skills |

**Pattern fuente** (canonizado live 2026-05-11): TASK-863 V1.1→V1.5.1 cerró 5 rondas iterativas en `docs/tasks/complete/TASK-863-finiquito-prerequisites-ui.md` (sección Delta V1.1-V1.5.1). Es el caso reusable: cuando alguien implemente el próximo doc legal (contrato de trabajo, addenda, certificado de servicio, finiquito de otras causales), seguir esta receta verbatim.

### Semantic Column Invariants — frontend / PDFs / emails / documentos legales (TASK-863 V1.5.1)

Cuando una surface renderiza datos en N columnas donde cada columna **representa una entidad distinta** (empleador vs trabajador, deudor vs acreedor, sender vs receiver, parte A vs parte B), la asignación de cada dato a su columna **NO es detalle visual — es invariante semántico de integridad de datos**. Romperlo en un documento legal produce vicio defendible (caso real: PDF de finiquito con "Cargo" del trabajador en col empleador detectado primer emisión real Valentina Hoyos, hotfix V1.5.1 2026-05-11).

**Bug class**: grid 2-cols con `flexWrap` (`@react-pdf/renderer`, CSS flexbox/grid, MUI `Grid container`, HTML email tables) deja el flujo de wrap decidir dónde aterriza cada cell. Cuando una dimensión existe solo para una parte (e.g. `jobTitle` solo para personas naturales; `taxId` solo para entidades; `birthDate` solo para naturales), el cell aterriza en la columna equivocada y mezcla semánticamente datos de las dos partes.

**⚠️ Reglas duras**:

- **NUNCA** dejar que `flexWrap`, `grid-auto-flow` o `column-wrap` decida la columna semántica de un dato. Si una columna representa una entidad, TODOS los datos de esa entidad aterrizan explícitamente en su columna — NUNCA por accidente del wrap.
- **NUNCA** intercalar campos de entidades distintas en grid 2-cols cuando una tenga más dimensiones que la otra. Inserta **spacer canónico** (`<View style={styles.field} />` en react-pdf; `<td>&nbsp;</td>` en email; `<Grid item />` empty en MUI) en la columna que no aplica para preservar la invariante.
- **NUNCA** "rellenar" la columna vacía con contenido falso/derivado (`N/A`, `—`, `No aplica`, repetir un dato del otro lado) para "balancear" visualmente. Mezcla semántica y confunde al lector.
- **NUNCA** asumir que el audit pre-emisión cubrió este bug class. El layout-by-wrap se ve correcto cuando todas las dimensiones son simétricas; el bug emerge cuando aparece un campo asimétrico. **Validar con caso real** del dominio, NO con fixture sintético.
- **NUNCA** acoplar el `label` del campo a la entidad mediante posicionamiento (e.g. "Cargo" sin prefix asumiendo la posición lo deja claro). El label debe ser auto-explicativo (`Cargo del trabajador`, `Domicilio empleador`, `RUT empleador`) por si la columna se rompe.
- **SIEMPRE** que emerja un campo asimétrico en layout 2-cols, insertar spacer en la otra columna en el MISMO commit. Tests visuales/snapshot capturan la asimetría.
- **SIEMPRE** que un documento legal/regulatorio (finiquito, contrato, addenda, certificado, factura, boleta, recibo, carta formal) tenga partes comparecientes, las columnas DEBEN preservar la invariante: parte A en col 1, parte B en col 2, parte C (ministro de fe, testigo, garante) en col 3. Sin excepción.
- **SIEMPRE** que un email transaccional tenga sender + receiver visibles, preservar el contrato visual de columnas en `src/views/emails/`.

**Pattern fuente** (canonizado live 2026-05-11 vía TASK-863 V1.5.1):

```tsx
// src/lib/payroll/final-settlement/document-pdf.tsx — fix canónico V1.5.1
<View style={styles.partyGrid}>
  <Field label='Empleador' value={employer.legalName} />
  <Field label='Trabajador/a' value={collaborator.legalName} />
  <Field label='RUT empleador' value={employer.taxId} />
  <Field label='RUT trabajador/a' value={collaborator.taxId} />
  <Field label='Domicilio empleador' value={employer.address} />
  <Field label='Domicilio trabajador/a' value={worker.address} />
  <View style={styles.field} />                                {/* col 1 — spacer canónico: empleador no tiene cargo */}
  <Field label='Cargo' value={collaborator.jobTitle} />        {/* col 2 — trabajador */}
</View>
```

**Aplicabilidad cross-surface**:

| Surface | Stack | Ejemplos |
| --- | --- | --- |
| PDFs operativos | `@react-pdf/renderer` | Finiquitos, contratos, addenda, certificados, boletas, recibos, cartas formales |
| Emails transaccionales | React Email + HTML tables | Confirmación pago, notificaciones cambio contrato, recordatorios firma |
| Tablas operativas MUI | DataTableShell (TASK-743) | Conciliación bancaria (movimiento vs match), payment orders (origen vs destino), payroll (haberes vs descuentos) |
| Layouts de detalle | MUI Grid container | Drawers cliente vs proveedor, perfiles persona vs organización |
| Comparativos visuales | CSS Grid / Flexbox | Before/after, plan A vs plan B, propuesta vs contrato firmado |

**Pattern canónico post-emisión real** (aprendizaje del loop V1.1→V1.5):

Para cualquier documento legal/regulatorio nuevo o cambio mayor que vaya a ser firmado/notarizado/auditado externamente, el pre-emisión audit técnico (`tsc --noEmit` + `pnpm lint` + visual review) NO es suficiente:

1. Implementar V1 con fixtures + audit técnico.
2. **Emitir 1 caso real** del dominio (datos reales del cliente/colaborador/proveedor).
3. Invocar **comprehensive audit 3-skills** sobre el documento real emitido:
   - Skill de dominio (e.g. `greenhouse-payroll-auditor`, `greenhouse-finance-accounting-operator`).
   - Skill UX writing del registro (`greenhouse-ux-writing` con foco es-CL formal-legal para textos jurídicos; operativo para docs operacionales; técnico para integraciones).
   - Skill visual (`modern-ui` o `greenhouse-ux`) para jerarquía/tipografía/spacing/balance.
4. Iterar fixes hasta cerrar bloqueantes.
5. **Canonizar** aprendizajes: AGENTS.md + CLAUDE.md + spec arquitectónica + doc funcional + manual de uso + ADR si toca contratos compartidos.

Sin paso 3 (audit comprehensive post-real-emit), bugs como B-1/B-2/B-3 (cláusulas legales con vicio defendible) o V1.5.1 (cargo del trabajador en col empleador) quedan latentes y se manifiestan recién cuando un cliente, abogado, contralor o auditor externo lo detecta — costo mucho mayor.

**Spec asociada**: `docs/architecture/GREENHOUSE_LEGAL_SIGNATURES_PLATFORM_V1.md` (Legal Signatures helper canónico V1.4); `docs/architecture/GREENHOUSE_FINAL_SETTLEMENT_V1_SPEC.md` (Finiquito Delta V1.5 + V1.5.1).

### Sample Sprints Runtime Projection invariants (TASK-835)

Toda surface que renderice `/agency/sample-sprints` (command center, wizards, futuras superficies organization-first) **debe** consumir el `runtime` field del payload del API. La projection vive en `src/lib/commercial/sample-sprints/runtime-projection.ts` y es la única capa que traduce datos de dominio (services + engagement_* + cost attribution + Commercial Health) al view model que la UI runtime consume.

**Read API canónico**:

- Resolver: `resolveSampleSprintRuntimeProjection({tenant, selectedServiceId?, prefetchedItems?, prefetchedDetail?}) → SampleSprintRuntimeProjection`. Server-only enforce, cache TTL 30s in-memory keyed por `(subjectId, tenantId)`.
- Helpers asociados (todos extendidos en TASK-835):
  - `readCommercialCostAttributionByServiceForPeriodV2({serviceIds, fromPeriod, toPeriod, attributionIntents?})` — sibling del reader byClient TASK-708, comparte VIEW canónica
  - `enrichProposedTeam(proposedTeam[]) → {team, hasUnresolvedMembers}` — LEFT JOIN `greenhouse_core.members WHERE active=TRUE`
  - `resolveCapacityRiskForSprint({team, startDate, targetEndDate}) → {capacityRisk, allLookupsFailed}` — usa `getMemberCapacityForPeriod` existente
  - 6 health helpers (`countCommercialEngagement{OverdueDecision,BudgetOverrun,Zombie,UnapprovedActive,StaleProgress}` + `getCommercialEngagementConversionRateSnapshot`) ahora aceptan `options?: {tenantContext?}` opcional. Backward compat 100%.
- API endpoints: `GET /api/agency/sample-sprints` y `GET /api/agency/sample-sprints/[serviceId]` adjuntan `runtime` field al payload existente (Checkpoint C). Backward compat 100%.

**Reactive cache invalidation**: el consumer `sampleSprintRuntimeCacheInvalidationProjection` (`src/lib/sync/projections/sample-sprint-runtime-cache-invalidation.ts`) escucha 6 outbox events `service.engagement.{declared, approved, rejected, capacity_overridden, progress_snapshot_recorded, outcome_recorded}` y dropea el cache scoped al `service_id`. Idempotente.

**Reliability signal**: `commercial.sample_sprint.projection_degraded` (kind=`drift`, severity=`warning` si count>0, steady=0). Reader: `getSampleSprintProjectionDegradedSignal`. Subsystem rollup: `commercial`. Cuenta degradaciones `severity=error` observadas en los últimos 5 minutos (counter in-memory).

**Convención canónica de progress**: el `%` de avance vive en `engagement_progress_snapshots.metrics_json.deliveryProgressPct` como número ∈ [0,100]. El runtime acepta `metrics.progressPct` como fallback compat. Future tasks que persistan progreso DEBEN respetar la key — el wizard `RuntimeProgressWizard` ya escribe `metricsJson.deliveryProgressPct`.

**⚠️ Reglas duras**:

- **NUNCA** derivar `progressPct`, `actualClp`, `team`, `capacityRisk` ni signals en componentes React. Toda derivación pasa por `runtime-projection.ts` server-side.
- **NUNCA** importar la projection desde código cliente. Enforce con `import 'server-only'` al inicio del módulo.
- **NUNCA** consumir `commercial_cost_attribution_v2` directo en componentes. Siempre via `readCommercialCostAttributionByServiceForPeriodV2` o sibling reader del mismo módulo. NUNCA SQL inline en projection.
- **NUNCA** mostrar `0` literal cuando un valor no se pudo computar. Usar `null` + degraded honest. UI distingue `loading | ready | empty | degraded` (cuatro estados, no tres).
- **NUNCA** derivar severity de signals client-side por status enum. Severity viene del helper canónico server-side.
- **NUNCA** mostrar equipo desde `client.organizationName` o `space.spaceName`. El team es `proposedTeam` enriquecido con `members.display_name + role_title`.
- **NUNCA** invocar los 6 health helpers de `health.ts` con scope global desde la surface comercial. Usar siempre `tenantContext` resuelto del subject. Solo `/admin/ops-health` (path admin) consume global.
- **NUNCA** inventar `kind` de signal nuevos en la projection. Mapear 1:1 a los 6 kinds canónicos de Commercial Health: `overdue-decision | budget-overrun | zombie | unapproved-active | stale-progress | conversion-rate-drop`.
- **NUNCA** escribir literals de copy en JSX para degraded states. Extender `GH_AGENCY.sampleSprints.degraded.<code>` en `src/lib/copy/agency.ts` (TASK-265).
- **NUNCA** crear endpoint nuevo `/api/agency/sample-sprints/runtime` preventivo sin segundo consumer demostrado. La projection vive embebida en el payload existente (Checkpoint C).
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de la projection. Usar `captureWithDomain(err, 'commercial', { tags: { source: 'sample_sprints_runtime_projection', stage: '<stage>' } })`.
- **SIEMPRE** que un outbox event afecte un sprint (declared / approved / rejected / capacity_overridden / progress_snapshot_recorded / outcome_recorded), invalidar cache scoped al `service_id` via consumer reactivo registrado.
- **SIEMPRE** que emerja un nuevo `degraded.code`, agregarlo al enum cerrado `SampleSprintProjectionDegradedCode` en `runtime-projection-types.ts` antes de mergear; NUNCA string libre.
- **SIEMPRE** persistir `metricsJson.deliveryProgressPct: number ∈ [0,100]` en `engagement_progress_snapshots` cuando emerja UI nuevo de registro de progreso.
- **SIEMPRE** revisar la microcopy con `greenhouse-ux-writing` antes de mergear (TASK-265).

**Patrones fuente reusados**: TASK-611 (organization-workspace projection + cache + reactive consumer), TASK-742 (degraded enum cerrado), TASK-265/407/408 (microcopy hygiene), TASK-708 (commercial_cost_attribution_v2 sibling reader pattern).

**Spec canónica**: `docs/tasks/complete/TASK-835-sample-sprints-runtime-projection-hardening.md`.

### Account 360 facet readers — anti silent-catch contract (TASK-1059, desde 2026-06-09)

Los readers canónicos de facets del 360 (`src/lib/account-360/facets/*` consumidos por `getAccountComplete360` → org-detail runtime + compact-signals + person/space 360 + finance clients) **NUNCA** envuelven una sub-query de **dato primario** en `.catch(() => [])`. Ese patrón convierte un error real (columna/join renombrado, schema/scope drift) en un resultado **indistinguible de "no hay datos"** — la causa raíz de los tabs vacíos (Equipo=0, Delivery tasks=0, Economía null) que el legacy sí mostraba. Es el bug class del "SQL Signal Reader Schema Validation Gate".

**Helper canónico** `src/lib/account-360/facet-observability.ts`:
- `observeAndRethrow(domain, source)` — para **dato primario** que el facet no puede falsear: captura a Sentry (`captureWithDomain`) y **re-lanza** → el resolver lo registra en `_meta.errors` y **omite el facet** (un facet roto debe ser VISIBLE, ausente + error, nunca medio-renderizado con ceros silenciosos).
- `observeAndDegrade(domain, source, fallback)` — para **enriquecimiento opcional** con estado "sin valor" legítimo o fallback downstream (ej. ICO null es honesto + hay fuente BQ canónica siguiente): captura y devuelve el fallback.

**⚠️ Reglas duras**:
- **NUNCA** `.catch(() => [])` (silent empty) en un reader canónico del 360. Usar `observeAndRethrow` (primario) u `observeAndDegrade` (enriquecimiento). Un error de schema debe llegar a `_meta.errors` + Sentry, no esconderse.
- **NUNCA** contar tareas por `status='completed'`/`active` ni literales — `greenhouse_delivery.tasks.task_status` es el **vocabulario canónico V1 en español**; usar `task-status-canonical` (`taskStatusGroupSql` + `TASK_STATUS_GROUPS`).
- **NUNCA** filtrar membresías "as-of" con `start_date <= asOf` sin NULL-safe — `start_date IS NULL` = inicio no acotado = activo (los contactos HubSpot lo traen NULL; el predicado los borraba).
- **ICO org-level**: la fuente de verdad es **BigQuery `ico_engine.metrics_by_organization`** (materializer TASK-900), **keyed por `spaces.client_id`** (NO org_id). Las tablas serving PG (`organization_operational_metrics`/`ico_organization_metrics`) son un mirror frecuentemente vacío → el delivery facet hace PG-first → fallback BQ vía `readOrganizationIcoMetricsFromBigQuery`. El resolver de aliases (`organization-ico-metrics-source.ts`) usa SOLO columnas existentes (`organization_360.{organization_id,public_id,hubspot_company_id}` + `spaces.client_id`).
- **SIEMPRE** validar SQL nuevo de reader contra PG real (CLAUDE.md SQL gate) — `db.d.ts` no es source of truth de columnas. Guard de regresión: `account-complete-360.live.test.ts` (asserta 0 `_meta.errors` para el org más rico + team>0; skip sin PG).

Verificado live (Sky Airline): 9 facets, 0 errores, team=21, delivery tasks=4208 + ICO rpa/otd/ftr, economics presente; org sin data degrada honesto. Relacionado: TASK-1059 (org workspace enterprise detail runtime) + [Organization Workspace projection invariants (TASK-611)](#organization-workspace-projection-invariants-task-611).
