# TASK-1225 — Comparison Table manifest governance (agent-operable public-site widget)

## Delta 2026-06-23b (WRITE PATH ACTIVADO + PROBADO end-to-end)

El operador pidió activar el write. **Hecho y verificado en vivo:**

- **WordPress:** bridge `greenhouse-wp-bridge` v0.5.0 desplegado en Kinsta (scp) + `eo-vibe` activo; `wp greenhouse-bridge` → `writes_enabled=true` + secreto canónico `public-website-wordpress-bridge-shared-secret-production` configurado.
- **Secret Manager:** grant `roles/secretmanager.secretAccessor` a `greenhouse-portal@` sobre el bridge shared secret + el app-password (Vercel runtime puede resolverlos por ref).
- **Greenhouse (Vercel staging):** `PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED=true` + los 2 `*_SECRET_REF` + username + base URL agregados a env `staging`; push a `develop` → deploy.
- **Bugs reales encontrados en el smoke (fixed, commit `be4fa293c`):** (1) el bridge exige **app-password Basic auth ADEMÁS del HMAC** → el command ahora manda ambos (resolución dual plano||ref); (2) la **ruta firmada no debe llevar `/wp-json`** (PHP firma sobre `$request->get_route()`) → se agrega `/wp-json` solo al fetch. Resolvió `ghwpb_signature_mismatch`.
- **Smoke `execute` PROBADO:** dos corridas → `200 OK` → borrador real con el widget `greenhouse_comparison_table` + contenido del manifest (verificado por wp-cli, drafts de prueba borrados). La 2da corrida resolvió los secretos vía **Secret Manager refs (estilo-Vercel)**.
- **Prod pendiente:** Vercel Production env (flag + refs) + sign-off (la escritura es draft-only; publish siempre humano).

## Pendientes para cierre (post-activación) — qué falta

El write gobernado está **activado y probado en staging** (Greenhouse desplegado → borrador real en WordPress). Para mover la task a `complete` falta:

1. **Producción Greenhouse (Vercel Production) — rollout.**
   - `vercel env add` en target **Production**: `PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED=true`, `PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF=public-website-wordpress-bridge-shared-secret-production:latest`, `PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF`, `PUBLIC_WEBSITE_WORDPRESS_USERNAME`, `PUBLIC_WEBSITE_WORDPRESS_BASE_URL`.
   - Promover `develop→main` por el release control plane (el código del command/endpoint ya está en `develop`).
   - Smoke `execute` contra prod runtime → borrador real → borrar. Bajo riesgo (draft-only; publish siempre humano).
   - WordPress NO requiere cambios (es sitio único; `writes_enabled=true` + secreto ya viven en producción).

2. **Runtime repo — push para preservar.**
   - El bridge v0.5.0 (`POST /drafts/comparison-table` + `GHWPB_Comparison_Table_Manifest`) está **vivo en Kinsta vía scp** pero el commit `f5ce614` está **local sin push** en `efeoncepro/efeonce-public-site-runtime` (`main`). Pushear para canonizar (como TASK-1224).

3. **Slice 4 (diferido) — follow-up.**
   - Persistencia de versiones del manifest (tabla PG append-only) + diff + rollback (hoy el audit es vía `api_platform_command_executions`; no hay historial de manifests autorados).
   - Exposición formal a **Nexa/MCP** (governed action propose→confirm con la capa de Nexa).
   - **UI/botón** en el portal para editar/preview/disparar el manifest = task `ui-ux` separada (hoy se opera por API/command).

4. **Verificación documental de cierre** una vez hecho (1): mover lifecycle a `complete`, sync README/registry, marcar acceptance criteria de versionado (Slice 4) como follow-up explícito.

> Riesgo de seguridad residual: la escritura es **draft-only** y el `publish` es siempre humano; el flag prod sigue OFF hasta el paso (1) con sign-off.

## Delta 2026-06-23 (Slices 1-3 CODE-COMPLETE · base previa)

Estado base: code complete (Slices 1-3).

- **Slice 1 ✅** `comparisonTable.v1` (Zod) + validador puro + 9 tests. `src/lib/public-site/comparison-table/manifest-schema.ts` + `validate-manifest.ts`. Espeja `theme_schema()` del widget (drift anchor `data-gh-schema`). Nota: se usó Zod (no el default "sin Zod" de la skill) por la spec + precedente vigente de contratos programáticos (`finance/pricing/simulate-input-schema.ts`, `commercial/submit-quote-from-builder-schema.ts`).
- **Slice 2 ✅** command `authorComparisonTable` (`author-comparison-table.ts`): validate-before-write → request firmado al bridge; **dry_run default** (sin red, secret sintético), **execute gated** por `PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED` (default OFF) + secret. Capability `platform.public_site.comparison_table.author` + grant a `efeonce_admin` (coverage test verde). Endpoint `POST /api/admin/public-site/comparison-table` (requireAdminTenantContext + `can()` + formatter de error es-CL + `captureWithDomain('platform')`). 5 tests.
- **Slice 3 ✅ (runtime repo, write-gate OFF)** handler `POST /drafts/comparison-table` en `greenhouse-wp-bridge` v0.5.0 + clase `GHWPB_Comparison_Table_Manifest` (validador defense-in-depth + node builder semántico→`c_*`); autora un draft Greenhouse-owned vía `EOV_Elementor_Document_Service::save_elements` (Document::save canónico). NO publica, NO toca página live. `php -l` verde. Commit runtime repo `f5ce614` (local, sin push).
- **Rollout pendiente (NO hecho — requiere out-of-band + sign-off):** provisionar shared secret + `GREENHOUSE_WP_BRIDGE_WRITES_ENABLED=1` en Kinsta + `PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED=true` + smoke firmado `execute` contra draft + GVC. Flag registrado en `FEATURE_FLAG_STATE_LEDGER.md` (§ Pendientes).
- **Slice 4 DIFERIDO (follow-up):** persistencia/versión/diff/rollback (tabla PG) + exposición Nexa/MCP. Con write OFF aún no hay manifests autorados que versionar; audit interino vía `api_platform_command_executions`. Open Q1 (persistencia) resuelta: SoT de schema = Zod en greenhouse-eo; SoT de data = tabla diferida. Open Q2 (Nexa): diferida.
- Gates greenhouse-eo: `pnpm test` full 7730/0 · `pnpm build` OK (endpoint compila) · lint + tsc verdes · coverage test verde.

## Delta 2026-06-23

- **Desbloqueada:** TASK-1224 cerrada (widget `greenhouse_comparison_table` canónico y LIVE). Ya no está bloqueada.
- **Contrato a espejar (SSOT existente):** el widget ya expone el método PÚBLICO `theme_schema()` en `class-eo-comparison-table-widget.php` (runtime repo) = mapa estable `setting key → CSS var`. El manifest `comparisonTable.v1` de esta task debe **espejar 1:1** ese contrato (no inventar claves nuevas). El widget ya emite los markers `data-gh-schema="comparisonTable.v1"` + `data-gh-plugin-version` en `.gh-ct-wrap` para detección/drift.
- **Claves vigentes a cubrir:** contenido (cabeceras, repeater `rows`, logo, `col_b_is_best`/`col_b_best_label`) + theming (`c_crimson`, `c_amber`, `c_amber_top`, `c_aub_top/mid/bot`, `c_globe_top/mid/bot`, `c_ribbon`, `c_ribbon_dark`, `c_ribbon_fold`, `c_radius`, `preset`).
- Recordatorio: el loop gobernado es `propose → confirm → execute` (el LLM nunca escribe directo; muta sólo en el endpoint de confirmación humana vía `Document::save()` en draft).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `TASK-1224`
- Branch: `task/TASK-1225-comparison-table-manifest-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Dar gobernanza por manifest al widget `greenhouse_comparison_table` de TASK-1224: definir un contrato `comparisonTable.v1` (columnas + filas + preset) que greenhouse-eo declara/valida y que el bridge (`greenhouse-wp-bridge` / `eo-vibe-coding-api`) usa para crear/actualizar el widget en un draft Elementor vía `Document::save()`, con versión/diff/preview/rollback. Es la Stage 3 del strategy doc del sitio público: que Greenhouse (y por construcción un agente/Nexa) pueda autorar/actualizar la tabla comparativa sin hardcodear ni tocar el builder a mano.

## Why This Task Exists

TASK-1224 entrega el widget como primitiva presentacional editable en el builder. Pero para operabilidad por agente (el norte Full API Parity aplicado al sitio público), el contenido de la tabla debe tener un **contrato programático gobernado**: un manifest validado server-side que un command escribe en WordPress vía el bridge, no un click manual en Elementor. Sin esto, el widget es editable solo por humanos en el builder; con esto, es operable por Greenhouse/Nexa/MCP por construcción.

## Goal

- Contrato `comparisonTable.v1` (schema + validador) en greenhouse-eo como source of truth de la data del widget.
- Command gobernado que, dado un manifest válido, crea/actualiza el widget en un draft/private de una página vía el bridge + `Document::save()` (propose → confirm → execute; el LLM nunca escribe directo).
- Versionado/diff/preview/rollback del manifest; capability + grant en el mismo PR.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md` — Stage 3 (manifest → Elementor widget): manifest declara widget type/props/tracking/tokens; bridge valida props contra schema; bridge crea/actualiza draft con `Document::save()`; Greenhouse guarda versión/diff/preview/publish/rollback.
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md` — Greenhouse control plane, WordPress runtime.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — capability con contrato gobernado; un primitive, muchos consumers; write vía propose→confirm→execute.
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — runtime de acción gobernada (si se expone a Nexa).

Reglas obligatorias:

- El LLM NUNCA escribe directo: write solo en el endpoint de confirmación humana (propose → confirm → execute).
- Validar props contra schema ANTES de escribir; draft/private first, nunca publish directo.
- Backport del código WordPress al runtime repo; Greenhouse guarda manifests/validadores/readers/preview/drift (no en el theme).

## Normative Docs

- `.claude/skills/efeonce-public-site-wordpress/SKILL.md` — bridge endpoints, HMAC, draft-only contract, `Document::save()`.
- Spec del widget de TASK-1224 (shape de controles → mapeo a manifest).

## Dependencies & Impact

### Depends on

- `TASK-1224` — el widget `greenhouse_comparison_table` debe existir y estar activo (el manifest gobierna un widget real).
- `greenhouse-wp-bridge` con rutas draft/private firmadas habilitadas (hoy default-disabled: requiere shared secret + flag de writes + least-privilege) `[verificar estado de habilitación]`.
- `eo-vibe-coding-api` servicios Elementor (`class-eov-elementor-mutation-service.php`, `-document-service.php`) como rail de escritura.

### Blocks / Impacts

- Habilita autoría/actualización de comparativas por Greenhouse/Nexa/MCP.
- No bloquea otras tasks.

### Files owned

greenhouse-eo (paths `[verificar]` durante Discovery):

- `src/lib/public-site/comparison-table/manifest-schema.ts` (Zod `comparisonTable.v1`)
- `src/lib/public-site/comparison-table/validate-manifest.ts`
- `src/lib/public-site/comparison-table/author-comparison-table.ts` (command propose/execute)
- `src/app/api/admin/public-site/comparison-table/route.ts` (endpoint gobernado)
- entitlements: registry seed + grant (capability `platform.public_site.comparison_table.author`)

Runtime repo `efeoncepro/efeonce-public-site-runtime`:

- endpoint/handler del bridge que recibe el manifest validado y aplica `Document::save()` `[verificar plugin destino]`

## Current Repo State

### Already exists

- `eo-vibe-coding-api` con servicios de mutación/documento Elementor (rail de escritura).
- `greenhouse-wp-bridge` foundation con HMAC + rutas draft/private (default-disabled).
- Patrón de capability + grant coverage (TASK-873/935) y runtime de acción gobernada de Nexa.

### Gap

- No existe contrato `comparisonTable.v1` ni command de autoría.
- Las rutas write del bridge están default-disabled (falta secret/flag/least-privilege).
- No hay capability `platform.public_site.comparison_table.author`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: manifest `comparisonTable.v1` (greenhouse-eo) → widget Elementor (WordPress runtime)
- Consumidores afectados: UI admin (Greenhouse), Nexa/MCP (write gobernado), bridge WordPress
- Runtime target: `staging` → `production` (WordPress/Kinsta vía bridge)

### Contract surface

- Contrato existente a respetar: bridge HMAC draft-only (`greenhouse-wp-bridge`), `eo-vibe-coding-api` Elementor mutation, shape de controles del widget (TASK-1224).
- Contrato nuevo o modificado: schema `comparisonTable.v1` + command `authorComparisonTable` + endpoint gobernado.
- Backward compatibility: `not applicable` (capability nueva, additive).
- Full API parity: la UI admin, Nexa y MCP consumen el MISMO command/validador server-side; cero lógica duplicada por consumer; write vía propose→confirm→execute.

### Data model and invariants

- Entidades afectadas: manifest (greenhouse-eo, persistencia `[verificar: tabla o doc-store]`) + `_elementor_data` de la página target (WordPress).
- Invariantes:
  - El LLM nunca escribe directo: mutación solo en el endpoint de confirmación humana.
  - Validar props contra schema ANTES de `Document::save()`; props inválidas → reject, no escribir.
  - Draft/private first; publish requiere paso humano explícito.
- Tenant/space boundary: capability internal-only (NUNCA `client_*`); page target explícita.
- Idempotency/concurrency: command idempotente por (page_id + widget_id + manifest_version); re-aplicar mismo manifest = mismo resultado.
- Audit/outbox/history: versión de manifest append-only + diff; audit del write gobernado.

### Migration, backfill and rollout

- Migration posture: `additive` (capability seed + grant; persistencia de manifest `[verificar]`).
- Default state: `flag OFF` — el write path del bridge queda disabled hasta provisionar shared secret + least-privilege.
- Backfill plan: N/A (no hay data histórica que migrar).
- Rollback path: flag off + revert PR; en WordPress, restaurar `_elementor_data` backup de la página.
- External coordination: habilitar shared secret + flag de writes del bridge en Kinsta; sign-off del operador antes de exponer write a Nexa.

### Security and access

- Auth/access gate: capability `platform.public_site.comparison_table.author` (internal) + HMAC del bridge + service account del rail.
- Sensitive data posture: sin PII (contenido de marketing público).
- Error contract: `canonicalErrorResponse` en greenhouse-eo; `captureWithDomain`; sin errores crudos al cliente.
- Abuse/rate-limit posture: replay guard del bridge (HMAC + timestamp window) + draft-only.

### Runtime evidence

- Local checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` (schema/validator/command), capability coverage test.
- DB/runtime checks: validar manifest contra schema; smoke del command contra draft de prueba.
- Integration checks: bridge dry-run firmado → `Document::save()` en draft/private → GVC del widget renderizado.
- Reliability signals/logs: `[definir signal de drift/coverage]`.
- Production verification sequence: staging draft → verify render → flag flip → prod draft → verify → publish humano.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes (LLM no escribe directo, validate-before-write, draft-first), boundary internal-only e idempotencia explícitos.
- [ ] Posture de migración/rollback explícito y proporcional.
- [ ] Evidencia runtime listada (bridge dry-run + render + GVC).
- [ ] Errores canónicos + audit + sin leaks.

## Hybrid Execution Justification

(No aplica split adicional: `UI impact: none`. La UI admin que dispara el command es cliente del primitive y, si se construye, va como task `ui-ux` separada. Esta task es el contrato backend-data.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema `comparisonTable.v1` + validador

- Zod schema del manifest (columnas A/B + filas + preset + meta de versión) en greenhouse-eo.
- Validador puro (sin side-effects) + tests.

### Slice 2 — Command de autoría gobernado + capability

- `authorComparisonTable(manifest, pageId)` que valida y, vía bridge, aplica `Document::save()` en draft/private.
- Capability `platform.public_site.comparison_table.author` + registry seed + grant a ≥1 rol interno + coverage test (mismo PR).
- Endpoint gobernado (propose → confirm → execute); el LLM nunca muta directo.

### Slice 3 — Bridge write handler + provisioning

- Handler en el plugin del runtime repo que recibe el manifest validado (HMAC) y aplica la mutación Elementor.
- Provisionar shared secret + flag de writes + least-privilege; smoke firmado dry-run → apply en draft.

### Slice 4 — Versionado/preview/rollback + (opcional) tool Nexa/MCP

- Persistir versión/diff del manifest + preview metadata + rollback.
- (Opcional) registrar la write governed action en Nexa + MCP lane.

## Out of Scope

- El widget en sí (TASK-1224).
- UI admin rica para editar el manifest (task `ui-ux` separada si se decide).
- Publish automático (siempre paso humano).
- Otras landings/widgets.

## Detailed Spec

Mapeo `comparisonTable.v1` ↔ controles del widget (TASK-1224): `{ columnA, columnB, rows[], preset }` → settings Elementor del `greenhouse_comparison_table`. El bridge traduce el manifest a la estructura `_elementor_data` del widget y llama `Document::save()` (corre permisos, hooks, regenera CSS) en un draft/private; nunca escribe `_elementor_data` crudo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema) → Slice 2 (command+capability) → Slice 3 (bridge write handler) → Slice 4 (versionado/Nexa).
- Slice 3 (write real a WordPress) MUST ship con flag OFF + draft-only; no habilitar write productivo sin secret/least-privilege + sign-off.
- Bloqueada por TASK-1224 (el widget debe existir antes de gobernarlo).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Write gobernado escribe en página equivocada | WordPress runtime | low | page_id explícito + draft/private first + backup `_elementor_data` | GVC / verificación draft |
| Props inválidas corrompen el widget | UI pública | medium | validate-before-write (Zod) + reject; nunca `Document::save()` sin validar | validación falla loud |
| Habilitar write del bridge expone superficie | integration/security | medium | flag OFF default + HMAC + replay guard + least-privilege + sign-off | logs del bridge |
| LLM intenta mutar directo | AI/governance | low | runtime de acción gobernada: mutación solo en endpoint de confirmación humana | audit del write |

### Feature flags / cutover

Write path del bridge detrás de flag/secret (default OFF). Cutover: flip tras smoke draft verde + sign-off. Revert: flag off + revert PR; restaurar `_elementor_data` backup.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (schema puro, sin runtime) | <5 min | sí |
| Slice 2 | revert PR + capability/grant fuera | <10 min | sí |
| Slice 3 | flag off + restaurar `_elementor_data` backup de la página draft | <10 min | sí |
| Slice 4 | revert PR + deregistrar tool Nexa/MCP | <10 min | sí |

### Production verification sequence

1. Slice 1-2 en staging: validar manifest + capability coverage test verde.
2. Slice 3 staging draft: bridge dry-run firmado → apply en draft/private → verificar render (GVC).
3. Flip flag staging → smoke write gobernado → verificar.
4. Repetir en prod con cooldown; publish siempre humano.
5. Monitor signals post-prod.

### Out-of-band coordination required

Provisionar shared secret + flag de writes del bridge en Kinsta; sign-off del operador antes de exponer write a Nexa/MCP.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `comparisonTable.v1` (schema + validador) en greenhouse-eo con tests.
- [ ] Existe el command `authorComparisonTable` que valida antes de escribir y aplica vía bridge `Document::save()` en draft/private.
- [ ] Capability `platform.public_site.comparison_table.author` + grant a ≥1 rol interno + coverage test, en el mismo PR.
- [ ] El write es propose → confirm → execute; el LLM nunca muta directo.
- [ ] Props inválidas se rechazan sin escribir; draft-first; backup antes de tocar `_elementor_data`.
- [ ] Versión/diff/preview/rollback del manifest disponibles.
- [ ] Bridge write handler en el runtime repo, detrás de flag/secret (default OFF), con smoke firmado verde.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm test` (schema/validator/command/coverage).
- Bridge dry-run firmado → apply en draft/private → GVC del widget renderizado.
- Verificar reject de manifest inválido.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] archivo en la carpeta correcta.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado.
- [ ] `changelog.md` actualizado si cambió comportamiento.
- [ ] chequeo de impacto cruzado.
- [ ] Bridge handler backporteado al runtime repo + Current Runtime Fact en la skill; flag/secret documentado en `FEATURE_FLAG_STATE_LEDGER.md` si aplica.

## Follow-ups

- UI admin para editar/preview el manifest (task `ui-ux` separada).
- Generalizar el manifest-governance a otros widgets custom (Partner Proof, Hero, etc.).

## Open Questions

1. Persistencia del manifest en greenhouse-eo: ¿tabla dedicada o doc-store/landing manifest existente? `[verificar durante Discovery]`
2. ¿Exponer el write a Nexa/MCP en esta task o diferir a follow-up tras consolidar el rail interno?
