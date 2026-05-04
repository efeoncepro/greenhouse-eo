# TASK-762 — Finiquito Document Generation + Approval Flow

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-010`
- Status real: `Completada`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-760`, `TASK-761`
- Branch: `develop` (instruccion explicita del usuario; no cambiar branch)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Genera el documento formal del finiquito y su workflow de revisión, aprobación y emisión a partir del settlement final calculado. Esta task convierte el cálculo en un artefacto/documento operable y trazable dentro de Greenhouse, con capacidad de revisión humana antes de su emisión final.

## Why This Task Exists

Aunque Greenhouse pueda calcular un settlement final, el valor real para HR/operación está incompleto si no existe:

- documento formal
- historial de revisiones
- aprobación interna
- emisión controlada
- storage y audit trail

Sin eso, el cálculo sigue siendo una simulación interna y no una capacidad real de cierre laboral.

## Goal

- Generar documento de finiquito desde settlement aprobado.
- Integrarlo a workflow de aprobación/revisión.
- Persistir artefacto en storage/document layer canónica.
- Exponer surface de emisión y seguimiento del documento.

## Delta 2026-05-04 — Document contract hardening

Auditoría con `greenhouse-payroll-auditor` detectó que la task estaba bien posicionada, pero demasiado abierta para implementar documento formal sin riesgo. Esta spec queda endurecida para que el documento sea un artefacto legal/operativo versionado, no un PDF generado desde inputs libres.

Decisiones:

- El documento nace solo desde un `final_settlement` aprobado de `TASK-761`.
- El documento debe persistir snapshot inmutable de caso, settlement, colaborador, entidad legal y breakdown; no debe recalcular montos al renderizar.
- La aprobación de documento es distinta de la aprobación del cálculo: cálculo aprobado habilita borrador documental; documento aprobado habilita emisión.
- Firma electrónica completa queda fuera si requiere foundation de `EPIC-001`, pero el contrato debe dejar hooks claros para firma/ratificación.
- El documento debe poder registrar reserva de derechos, rechazo, anulación y reemisión sin destruir versiones anteriores.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`
- Dirección del Trabajo — plazo para otorgar finiquito: `https://dt.gob.cl/portal/1628/w3-article-60613.html`
- Dirección del Trabajo — ratificación de finiquito: `https://dt.gob.cl/portal/1626/w3-article-117245.html`
- Dirección del Trabajo — cotizaciones previsionales al término: `https://www.dt.gob.cl/portal/1628/w3-article-60573.html`

## Child Dependencies

- `TASK-760`
- `TASK-761`

## Scope

### Slice 1 — Document model

- Template/document aggregate del finiquito
- Versioning + storage
- Metadata mínima del caso y settlement
- Crear aggregate `final_settlement_documents` o equivalente bajo `greenhouse_hr`/dominio documental canónico decidido en discovery.
- Link obligatorio a `offboarding_case_id`, `final_settlement_id`, `settlement_version`, `member_id`, `profile_id`, `person_legal_entity_relationship_id`, `legal_entity_organization_id`.
- Persistir `document_version`, `template_version`, `render_status`, `document_status`, `issued_at`, `issued_by_user_id`, `voided_at`, `voided_by_user_id`, `void_reason`.
- Persistir `snapshot_json` inmutable con identidad, relación, causal, fechas, breakdown aprobado, neto pagable, readiness final y referencias de cotizaciones/documentos.
- Persistir `asset_id` / `pdf_asset_id` usando la capa canónica de assets privados; no guardar solo URL suelta ni regenerar desde estado mutable.
- Persistir `content_hash` o `snapshot_hash` para detectar drift entre cálculo aprobado y documento emitido.
- Declarar `document_template_code = 'cl_final_settlement_resignation_v1'` para evitar templates implícitos.

### Slice 2 — Approval flow

- Review / approve / issue
- Audit trail
- Hooks para firma/document orchestration futura si aplica
- Estados mínimos: `draft`, `rendered`, `in_review`, `approved`, `issued`, `signed_or_ratified`, `rejected`, `voided`, `superseded`, `cancelled`.
- Transiciones fallan cerrado:
  - no `rendered` si settlement no está `approved`.
  - no `approved` si `content_hash` no calza con snapshot aprobado.
  - no `issued` si faltan aprobador, asset, template version o readiness documental.
  - no `signed_or_ratified` sin evidencia de firma/ratificación o placeholder explícito de proceso externo.
- Revisión debe usar `workflow_approval_snapshots` o primitive canónica existente; no inventar approvals ad hoc.
- Registrar audit trail por transición con actor, timestamp, reason y evidence refs.
- Soportar `worker_reservation_of_rights` como campo explícito/estado de firma; no esconderlo en notas libres.
- Soportar `rejected_by_worker` y `voided/superseded` para reemisión; nunca sobrescribir PDF histórico emitido.

### Slice 3 — Surface

- Vista de documento dentro del offboarding case
- Historial y estado de emisión
- Mostrar línea de tiempo: cálculo aprobado → borrador renderizado → revisión → aprobación → emisión → firma/ratificación.
- Mostrar diff/resumen de componentes del settlement aprobado sin recalcular.
- Mostrar warnings de readiness documental: cotizaciones no evidenciadas, firma pendiente, reserva de derechos, documento superseded.
- Permitir descarga solo desde asset privado autorizado.
- Copy debe dejar claro si el documento es `borrador interno`, `emitido`, `pendiente de firma/ratificación` o `cerrado`.

### Slice 4 — Integration boundaries

- No crear pago ni marcar finiquito como pagado; eso pertenece a Finance/Treasury/Payment Orders.
- No cerrar acceso ni ejecutar offboarding; eso pertenece al caso `TASK-760`.
- No recalcular settlement al abrir/descargar documento; usar snapshot aprobado.
- Preparar hook para `EPIC-001` document vault/signature, pero no bloquear V1 si la firma final ocurre fuera del portal y se adjunta evidencia.
- Emitir eventos versionados `hr.final_settlement_document.rendered|approved|issued|voided|signed_or_ratified` con payload mínimo y sin datos sensibles crudos.

## Non-goals

- No implementar firma electrónica full en esta misma task si requiere foundation mayor.
- No cubrir todos los tipos de documentos laborales.

## Acceptance Criteria

- [x] Existe documento de finiquito versionado y trazable.
- [x] El documento nace desde un settlement aprobado, no desde inputs libres.
- [x] Existe workflow mínimo de revisión/aprobación/emisión.
- [x] El PDF/asset emitido queda asociado a snapshot/hash inmutable y no se recalcula desde datos vivos.
- [x] La aprobación documental es independiente de la aprobación del cálculo.
- [x] Existe estado explícito para pendiente de firma/ratificación, firmado/ratificado, rechazado, anulado y superseded.
- [x] El documento soporta reserva de derechos como dato estructurado.
- [x] La task no crea payment orders, no marca pago como realizado y no ejecuta offboarding/acceso.

## Verification

- `pnpm pg:connect:migrate` — OK, migracion aplicada y `src/types/db.d.ts` regenerado.
- `pnpm pg:doctor` — OK; drift conocido `can_create=true` en `greenhouse_payroll`/`greenhouse_serving`.
- `pnpm tsc --noEmit --pretty false` — OK.
- `pnpm lint` — exit 0; 316 warnings legacy `greenhouse/no-untokenized-copy` fuera del scope.
- `pnpm test` — 559 files / 3211 passed / 5 skipped.
- `pnpm build` — OK.
- Test enfocado: `src/lib/payroll/final-settlement/document-hash.test.ts` cubre hash canonico de snapshot y hash separado del PDF.
- Validacion funcional por typecheck/build: rutas documentales render/review/approve/issue/void/reject/sign-or-ratify registradas en build Next.
