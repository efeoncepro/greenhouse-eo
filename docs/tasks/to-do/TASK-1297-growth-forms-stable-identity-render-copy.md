# TASK-1297 — Growth Forms stable identity + render copy contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site`
- Blocked by: `none`
- Branch: `task/TASK-1297-growth-forms-stable-identity-render-copy`

## Summary

Dar a Growth Forms una identidad estable tipo HubSpot `formGuid`: un UUID opaco, unico e inmutable en `form_definition`, separado de `slug`, `form_version_id` y `surface_id`. En la misma base, cerrar el hueco de copy renderizable (`copyRefs`) para que el swap de AEO a `<greenhouse-form>` no dependa de HTML custom ni de nombres ambiguos.

## Why This Task Exists

Hoy un agente puede confundir `efeonce-aeo-diagnostic` (lead comercial de la landing de servicio AEO) con `ai-visibility-grader` (intake del AI Visibility Grader), porque ambos usan lenguaje AEO/diagnostico y los IDs visibles dependen de slug/surface/version. Ese modelo no es tan robusto como HubSpot, donde `formGuid` identifica el formulario de forma estable y la pagina/embed es otra cosa.

AEO v3 ya serializa `security.captcha`, pero el contrato publico devuelve `copy:{}`. Si se reemplaza el bridge HTML por `<greenhouse-form>` ahora, el CTA visible puede caer al default del renderer (`Enviar solicitud`). Resolverlo solo en WordPress seria otro parche por landing; el fix correcto es identidad estable + copy visible como contrato publicado reusable.

## Goal

- Agregar `form_guid` estable, opaco y unico a `greenhouse_growth.form_definition`.
- Exponer `formGuid` en readers, render contract, catalogo y telemetry browser-safe.
- Permitir resolver/embeber forms por GUID, dejando `slug` como alias humano/backward-compatible.
- Exponer/preservar `copyRefs` en `authorDraftForm` para publicar copy renderizable.
- Aplicar AEO con copy aprobado y documentar el GUID real antes de ejecutar la migracion WordPress (`TASK-1298`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`

Reglas obligatorias:

- `form_guid` identifica el formulario; `slug` es alias/API legacy; `form_version_id` identifica una version; `surface_id` identifica donde se muestra.
- No volver a identificar un form solo por "AEO", "grader", pagina, screenshot o slug si existe `form_guid`.
- Nunca modificar una version `published` in-place; clonar, publicar y deprecar.
- No mover copy visible reusable al HTML de WordPress cuando el renderer puede consumirlo desde `render_contract.copy`.
- No exponer HubSpot mapping, portal, GUIDs de destino, secretos ni PII en `copyRefs`.
- Mantener AEO `/aeo-2/` en bridge HTML hasta `TASK-1298`.

## Normative Docs

- `docs/tasks/complete/TASK-1294-growth-forms-renderer-turnstile-captcha-token.md`
- `docs/tasks/complete/TASK-1296-aeo-growth-form-turnstile-security-contract.md`
- `docs/documentation/public-site/aeo-landing-elementor.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`

## Dependencies & Impact

### Depends on

- `TASK-1294` complete: renderer consume `contract.copy['submit']`.
- `TASK-1296` complete: AEO v3 serializa `security.captcha`.
- `migrations/20260625081014196_task-1229-growth-forms-engine-schema.sql`: `form_definition` actual.
- `src/lib/growth/forms/store.ts`, `readers.ts`, `policy-compiler.ts`, `contracts.ts`.
- `src/growth-forms-renderer/element.ts` y `api-client.ts`.

### Blocks / Impacts

- Bloquea `TASK-1298`, la migracion WordPress/AEO del bridge HTML a `<greenhouse-form>`.
- Impacta cualquier form futuro: agentes/scripts deben preferir `form_guid` para mutaciones y `slug` solo como alias humano/backward-compatible.
- Impacta catalogo/editor externo, renderer portable y telemetry allowlist.

### Files owned

- `migrations/*_task-1297-growth-forms-stable-form-guid.sql`
- `src/lib/growth/forms/store.ts`
- `src/lib/growth/forms/readers.ts`
- `src/lib/growth/forms/commands.ts`
- `src/lib/growth/forms/contracts.ts`
- `src/lib/growth/forms/policy-compiler.ts`
- `src/growth-forms-renderer/contract.ts`
- `src/growth-forms-renderer/api-client.ts`
- `src/growth-forms-renderer/element.ts`
- `src/app/api/public/growth/forms/**`
- `scripts/growth/activate-aeo-render-copy-contract.ts`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `form_definition.form_id` es un ID tecnico textual (`fdef-*`), pero puede ser semanticamente nombrado y no esta modelado como GUID opaco tipo HubSpot.
- `form_version_id` cambia en cada publish y no sirve como identidad estable del form.
- `surface_id` identifica host/pagina, no el form.
- `<greenhouse-form>` acepta `form="slug"` y `surface="surfaceId"`.
- `insertFormVersion` acepta `copyRefs`; `policy-compiler` expone `copy_refs_json.copy`; renderer consume `contract.copy['submit']`.
- `authorDraftForm` no acepta/preserva `copyRefs`.
- AEO v3 vigente: `fver-9507f6a7-431d-4215-a699-9c713328b69b`, con Turnstile y destination HubSpot preservados.

### Gap

- Falta `form_guid` estable/opaco para distinguir forms con nombres parecidos.
- Falta exponer `formGuid` en contratos/catálogo/telemetry y permitir resolucion por GUID para embeds/scripts.
- Falta `copy.submit` en el contrato AEO.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.form_definition.form_guid` + `greenhouse_growth.form_version.copy_refs_json`
- Consumidores afectados: public render API, `<greenhouse-form>`, WordPress/Astro hosts, catalogo externo, admin/API authoring scripts, telemetry/dataLayer
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: public Growth Forms API por `slug`, `RenderContract.form`, `RendererApiConfig`, `authorDraftForm`, `copy_refs_json`.
- Contrato nuevo o modificado:
  - `form_definition.form_guid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()`;
  - `RenderContract.form.formGuid`;
  - catalogo/editor-safe incluye `formGuid`;
  - renderer acepta `form-guid="<uuid>"` como identidad fuerte, manteniendo `form="<slug>"` backward-compatible;
  - commands/readers/scripts pueden resolver por `formGuid`;
  - `authorDraftForm(input.copyRefs)` preserva/escribe `copy_refs_json`.
- Backward compatibility: compatible; slugs y rutas existentes siguen funcionando.
- Full API parity: UI/WordPress/Astro/Nexa/scripts identifican el form por contrato gobernado, no por pagina o nombre visible.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_definition`, `greenhouse_growth.form_version`.
- Invariantes que no se pueden romper:
  - `form_guid` no cambia por version nueva, rename de slug o nuevo surface;
  - `form_guid` nunca es HubSpot form GUID ni destination ID;
  - `form_version_id` sigue identificando version inmutable;
  - `surface_id` sigue identificando host/pagina;
  - versiones publicadas son inmutables;
  - fields, validation, `ui_policy_json.security`, destinations y consent se preservan al clonar;
  - `copy_refs_json` solo contiene strings browser-safe.
- Tenant/space boundary: public surfaces/origins vigentes; no cambia modelo de auth/admin.
- Idempotency/concurrency: migration additive con default unico; scripts no-op si GUID/copy ya estan correctos.
- Audit/outbox/history: lifecycle de version existente; no outbox nuevo.

### Migration, backfill and rollout

- Migration posture: additive migration + data rollout.
- Default state: backward-compatible; slug sigue operativo.
- Backfill plan: `form_guid` se llena con `gen_random_uuid()` para forms existentes; registrar los GUIDs resultantes de AEO y grader en docs runtime.
- Rollback path: revert PR antes de depender de `form-guid`; una vez usado en WordPress, rollback de embed a slug o bridge + revert version.
- External coordination: ninguna; no tocar WordPress en esta task.

### Security and access

- Auth/access gate: mismos gates public/admin existentes.
- Sensitive data posture: `form_guid` es publico/opaco, no secreto; no PII.
- Error contract: canonical unavailable/not-found; no raw DB errors.
- Abuse/rate-limit posture: no cambia submit/rate-limit.

### Runtime evidence

- Local checks: tests focales de store/readers/contracts/renderer api-client cuando aplique.
- DB/runtime checks: migration apply/verify contra Cloud SQL; query de `form_guid` para AEO y grader.
- Integration checks: public GET por slug y por GUID; catalogo muestra `formGuid`; AEO GET muestra `copy.submit` y `security.captcha`.
- Reliability signals/logs: N/A, cambio de identidad/contract.
- Production verification sequence:
  1. Migration apply + verify `form_guid` unique/not null.
  2. Confirmar GUIDs de `efeonce-aeo-diagnostic` y `ai-visibility-grader`.
  3. Dry-run script AEO por `formGuid`.
  4. Apply script AEO por `formGuid`.
  5. Public GET por slug y por GUID confirma misma version, `formGuid`, `copy.submit`, `security.captcha` y ACAO.
  6. POST sin token sigue `403 captcha_failed/missing_token`.
  7. No WordPress mutation.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Stable form GUID foundation

- Agregar migration additive `form_guid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid()` en `greenhouse_growth.form_definition`.
- Actualizar row types/store/readers para leer `form_guid`.
- Agregar reader `getFormDefinitionByGuid` y published-version resolver por GUID.
- Actualizar types/tests relevantes.

### Slice 2 — Public/API/renderer contract

- Exponer `formGuid` en `RenderContract.form` y catalogo editor-safe.
- Agregar `form_guid` a telemetry allowlist si el renderer/dataLayer lo emite.
- Mantener rutas por slug backward-compatible.
- Agregar resolucion publica por GUID para GET/verify-email/submit, o un mecanismo equivalente documentado que permita que `<greenhouse-form form-guid="...">` no dependa del slug.
- Actualizar `<greenhouse-form>` para aceptar `form-guid` ademas de `form`.

### Slice 3 — Render copy command support

- Agregar `copyRefs?: unknown` a `AuthorDraftFormInput`.
- Pasar `copyRefs` a `insertFormVersion`.
- Agregar test focal o verificacion equivalente que demuestre que un draft versionado puede preservar copy refs.

### Slice 4 — AEO apply by GUID

- Crear script dry-run/apply que resuelva el target por `formGuid` (no por etiqueta "AEO").
- Clonar la version publicada AEO, preservar policies/destinations/captcha y setear `copy_refs_json.copy.submit`.
- El script debe ser idempotente y no escribir si el copy vigente ya matchea.
- Copiar destinations y deprecar la version anterior solo despues de publish exitoso.

### Slice 5 — Production apply and docs

- Ejecutar migration/dry-run/apply.
- Verificar GET/POST por slug y por GUID.
- Actualizar docs/manuales/ledger/task lifecycle con el GUID real de AEO, el GUID real del grader y la nueva version publicada AEO.

## Out of Scope

- Reemplazar el bridge HTML de AEO.
- Mutar WordPress/Elementor/Kinsta.
- Cambiar estilos del renderer o copy de otros forms.
- Cambiar el HubSpot mapping o destination.
- Usar el HubSpot form GUID como identidad de Growth Forms; son IDs distintos.

## Detailed Spec

Modelo de identidad objetivo:

```txt
form_guid        = identidad estable del form, opaca, tipo HubSpot formGuid
slug             = alias humano/API legacy
form_version_id  = version publicada/inmutable
surface_id       = host/pagina/canal donde se muestra
destination      = HubSpot/email/webhook/etc.; no define identidad del form
```

Copy esperado para AEO:

```json
{
  "copy": {
    "submit": "Solicitar diagnóstico gratis →"
  }
}
```

Embed objetivo posterior para `TASK-1298`:

```html
<greenhouse-form form-guid="<AEO_FORM_GUID>" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL"></greenhouse-form>
```

`<AEO_FORM_GUID>` debe salir del runtime verificado de esta task, no inventarse en docs.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (migration/store) -> Slice 2 (public/renderer contract) -> Slice 3 (copy command) -> Slice 4 (AEO dry-run/apply) -> Slice 5 (docs).
- No ejecutar `--apply` de AEO si no hay GUID verificado para `efeonce-aeo-diagnostic`.
- No ejecutar `TASK-1298` hasta que el GET por GUID y slug devuelvan el mismo AEO form/version.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Public API por slug regresa | growth/public-site | low | mantener backward compatibility + tests | GET slug falla |
| GUID equivocado muta otro form | growth/public-site | medium | script resuelve y muestra slug/form_id/surface antes de apply | version nueva en slug incorrecto |
| Se pierde `security.captcha` al clonar version | growth/public-site | medium | preservar `ui_policy_json` completo y verificar GET | GET sin `security.captcha` |
| Se pierde destination HubSpot | HubSpot delivery | low | copiar destinations y verificar count | submissions accepted sin delivery |
| Copy equivocado sale a futuro renderer | public-site | low | dry-run + GET contract antes de migracion | CTA default o no aprobado |

### Feature flags / cutover

Sin flag nuevo. La identidad por GUID es additive/backward-compatible; el cutover de AEO WordPress ocurre en `TASK-1298`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert migration before consumers depend on GUID | <15 min | parcial si ya hay consumers |
| Slice 2 | keep slug path; revert renderer/API GUID support | <10 min | si |
| Slice 3 | revert command/script | <10 min | si |
| Slice 4 | publicar version nueva basada en previa o deprecar nueva version | <15 min | si |
| Slice 5 | revert docs | <10 min | si |

### Production verification sequence

1. Migration apply + query `form_guid` not null/unique.
2. Query AEO and AI Visibility Grader GUIDs.
3. Dry-run AEO script by GUID.
4. Apply AEO script by GUID.
5. Public GET by slug and by GUID return same `formGuid`, form/version, `copy.submit`, `security.captcha` and ACAO.
6. Confirm `POST /submit` without token remains `captcha_failed/missing_token`.

### Out-of-band coordination required

N/A — repo + DB/version rollout; WordPress queda para `TASK-1298`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `greenhouse_growth.form_definition` tiene `form_guid` UUID not-null unique para todos los forms existentes.
- [ ] AEO service diagnostic y AI Visibility Grader intake tienen GUIDs distintos, verificados y documentados.
- [ ] Public/render contracts exponen `formGuid` sin exponer destination IDs/secrets.
- [ ] `<greenhouse-form>` puede cargar por `form-guid` y el path por `form`/slug sigue funcionando.
- [ ] `authorDraftForm` acepta `copyRefs` y los pasa a `insertFormVersion`.
- [ ] Existe script idempotente dry-run/apply por GUID para publicar copy renderizable AEO sin editar version publicada in-place.
- [ ] La version publicada AEO posterior al apply preserva fields, validation, `security.captcha`, success behavior, consent y destinations.
- [ ] Public GET expone `copy.submit = "Solicitar diagnóstico gratis →"` y `security.captcha`.
- [ ] Public POST sin token sigue fallando cerrado.
- [ ] No hay mutacion WordPress/Elementor/Kinsta.
- [ ] Docs/manuales/ledger/task lifecycle quedan sincronizados.

## Verification

- `pnpm task:lint --task TASK-1297`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Migration apply/verify query.
- Tests focales de store/readers/API/renderer.
- Dry-run/apply script by GUID.
- Public GET/POST smoke by slug and by GUID.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado
- [ ] `Handoff.md` quedo actualizado
- [ ] `changelog.md` quedo actualizado
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-1298`

## Follow-ups

- `TASK-1298` — migrar AEO `/aeo-2/` del bridge HTML a `<greenhouse-form form-guid="...">`.

## Open Questions

- Ninguna. El GUID real de AEO y del grader se obtiene al ejecutar/verificar la migration; no se inventa en la task.
