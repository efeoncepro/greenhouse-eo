# TASK-784 — Person Legal Profile + Identity Documents Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-010`
- Status real: `Discovery + Plan`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `develop` (instrucción usuario "mantente en develop")
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la fundacion canonica de datos legales de persona para Greenhouse: documentos de identidad por pais, direcciones, self-service del colaborador, verificacion HR, masking/reveal auditado y readiness para payroll/finiquito/honorarios. Esta task no reemplaza `organizations.tax_id`; separa identidad tributaria de organizaciones de identidad legal de personas.

## Why This Task Exists

El programa de finiquito y offboarding ya necesita emitir documentos formales con identidad del trabajador, entidad legal, direccion y evidencia. Hoy el runtime no tiene una fuente canonica Postgres para RUT/documento de identidad ni direccion de personas: BigQuery `member_profiles` conserva campos legacy, People/HR puede mostrar datos enmascarados parciales y `final_settlement_documents` termina con `taxId: null`.

Resolverlo dentro de TASK-783 o dentro del PDF seria un parche fragil. La solucion robusta es una capa reusable de `Person Legal Profile` que pueda ser mantenida por self-service del colaborador y por HR, con controles de privacidad, pais/regimen y auditoria.

## Goal

- Modelar documentos de identidad de personas naturales por pais y tipo, incluyendo RUT Chile sin mezclarlo con `organizations.tax_id`.
- Modelar direcciones legales/contacto versionables para personas.
- Crear self-service para que el colaborador complete y mantenga sus datos legales.
- Crear surface HR para revisar, corregir, verificar o rechazar datos declarados por colaboradores.
- Exponer readers y readiness gates para finiquitos, nomina, honorarios, recibos/documentos y People 360.
- Implementar masking por defecto, reveal con capability + motivo + audit trail y sanitizacion de logs/events.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `organizations.tax_id` permanece canonico para organizaciones, entidades legales empleadoras, clientes, proveedores empresa y facturacion. Esta task no lo elimina ni lo depreca.
- La identidad legal de personas naturales vive separada de organizaciones: no guardar RUT/documento personal dentro de `organizations.tax_id` salvo que el objeto sea realmente una organizacion/persona juridica facturable.
- La raiz debe anclarse a `greenhouse_core.identity_profiles` / Person 360; `members` puede consumir/proyectar, pero no debe convertirse en el source of truth de documentos legales.
- Datos personales se leen enmascarados por defecto. Ver valor completo requiere capability fina, motivo explicito y audit log.
- No loggear documento, direccion, fecha de nacimiento ni valores sensibles en errores, events, reliability signals, Sentry, outbox payloads publicos o AI context.
- El valor normalizado/hash puede usarse para deduplicacion y validacion; el valor completo debe quedar protegido y solo salir en snapshots/documentos autorizados.
- Self-service no implica verificacion automatica: los datos declarados por colaborador entran como `pending_review` o estado equivalente hasta que HR/politica los acepte.
- Cada documento/direccion debe conservar `country_code`, `source`, `verification_status`, timestamps y actor/audit.
- Chile dependiente interno requiere `CL_RUT` para emision formal de finiquito/contrato/recibo cuando el documento legal lo exige.
- Honorarios persona natural Chile requiere documento/RUT para cierre contractual, boleta/retencion SII o pago si Greenhouse gestiona ese flujo.
- Deel/EOR/provider internacional no debe forzar RUT chileno; debe resolver requisitos por pais/regimen/proveedor.
- La UI debe usar copy pais-aware: "documento de identidad" por defecto, "RUT" solo cuando el pais/regimen sea Chile.
- Las evidencias de documentos escaneados o comprobantes deben usar shared private assets/document vault, no blobs ni JSON inline.
- Access model debe distinguir `views` visibles de `entitlements` de lectura/reveal/verificacion/export.

## Normative Docs

- `.codex/skills/greenhouse-payroll-auditor/SKILL.md`
- `docs/tasks/to-do/TASK-783-payroll-final-settlement-component-policy-overlap-hardening.md`
- `docs/tasks/complete/TASK-761-payroll-final-settlement-finiquito-engine-chile.md`
- `docs/tasks/complete/TASK-762-finiquito-document-generation-approval-flow.md`
- `docs/tasks/complete/TASK-763-lifecycle-onboarding-offboarding-ui-mockup-adoption.md`
- `docs/tasks/complete/TASK-749-beneficiary-payment-profiles-routing.md`
- `docs/tasks/to-do/TASK-753-payment-profiles-self-service.md`
- `docs/documentation/hr/finiquitos.md`
- `docs/manual-de-uso/hr/finiquitos.md`
- Ley Chile / BCN — Ley 21.719, proteccion y tratamiento de datos personales: `https://bcn.cl/gJo3hf`
- Gobierno Digital — Ley 19.628, proteccion de la vida privada: `https://digital.gob.cl/biblioteca/regulacion/ley-n-19628-sobre-proteccion-de-la-vida-privada/`

## Dependencies & Impact

### Depends on

- `docs/architecture/schema-snapshot-baseline.sql`
- `src/types/db.d.ts`
- `src/lib/hr-core/schema.ts`
- `src/lib/hr-core/service.ts`
- `src/app/api/hr/core/members/[memberId]/profile/route.ts`
- `src/app/api/my/profile/route.ts`
- `src/views/greenhouse/my/MyProfileView.tsx`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx`
- `src/views/greenhouse/people/tabs/person-hr-profile-view-model.ts`
- `src/lib/person-360/**`
- `src/lib/assets/**`
- `src/lib/finance/economic-category/identity-lookup.ts` (no se modifica; resuelve persona via `organizations → person_legal_entity_relationships → members`. TASK-784 introduce un módulo independiente `src/lib/person-legal-profile/` y NO mezcla dominios.)
- `src/lib/payroll/final-settlement/document-store.ts`
- `src/lib/finance/beneficiary-payment-profiles/{reveal-sensitive,audit,mask,row-mapper}.ts` (TASK-697 reveal pattern — clonado verbatim)
- `src/lib/storage/greenhouse-assets.ts` (`createPrivatePendingAsset`, `storeSystemGeneratedPrivateAsset`, `attachAssetToAggregate`)
- `src/lib/observability/{redact,capture}.ts` (sanitizers + `captureWithDomain('identity', ...)`)
- `src/lib/reliability/registry.ts` (agregar `moduleKey: 'identity'`)
- `src/lib/secrets/secret-manager.ts` (resolver pepper)

### Blocks / Impacts

- Bloquea emision formal robusta de finiquitos en `TASK-783`.
- Impacta Payroll Chile dependiente, honorarios, recibos/documentos payroll, Offboarding readiness, People 360 y Mi perfil.
- Impacta futuras capacidades de contrato, document vault, payment profile onboarding y comprobantes legales.
- Reduce dependencia de campos legacy BigQuery `member_profiles.identity_document_*`.
- Permite retirar gradualmente el workaround que interpreta RUT personal via `organizations.tax_id` cuando no corresponde a una organizacion facturable.

### Files owned

- `migrations/`
- `src/types/db.d.ts`
- `src/lib/person-360/**`
- `src/lib/hr-core/**`
- `src/lib/payroll/final-settlement/**`
- `src/lib/assets/**`
- `src/app/api/my/profile/route.ts`
- `src/app/api/hr/core/members/[memberId]/profile/route.ts`
- `src/views/greenhouse/my/MyProfileView.tsx`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/documentation/hr/`
- `docs/manual-de-uso/hr/`
- `changelog.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `greenhouse_core.identity_profiles` y `greenhouse_core.members` existen en el snapshot, pero no tienen modelo canonico de documento legal ni direccion estructurada.
- BigQuery `greenhouse.member_profiles` mantiene `identity_document_type` e `identity_document_number` como campos legacy.
- `src/lib/hr-core/service.ts` ya lee y enmascara documento de identidad cuando `includeSensitive` aplica.
- `src/app/api/hr/core/members/[memberId]/profile/route.ts` permite PATCH HR de perfil.
- `src/app/api/my/profile/route.ts` existe como GET de perfil propio, pero no cubre self-service legal editable.
- `PersonHrProfileTab` muestra datos personales/HR, incluyendo documento enmascarado desde view model.
- `TASK-697` dejo un patron reusable de reveal sensible con audit para instrumentos de pago.
- `src/lib/reliability/ai/sanitize.ts` y otros sanitizers ya tienen patrones de redaccion de RUT/datos sensibles.
- `greenhouse_core.assets` y private assets ya se usan para documentos payroll/finiquito.
- `src/lib/payroll/final-settlement/document-store.ts` hoy genera snapshot de trabajador con `taxId: null`.

### Gap

- No existe tabla Postgres canonica para documentos de identidad de personas.
- No existe tabla Postgres canonica para direcciones legales/contacto de personas.
- No existe self-service de colaborador para completar datos legales/documento/direccion.
- No existe workflow HR de verificacion/rechazo de datos declarados por colaborador.
- No existe capability fina para reveal/export de identidad legal de persona.
- No existe readiness reusable que diga "esta persona puede emitir finiquito/recibo/boleta/documento formal".
- No existe catalogo pais-aware de documentos requeridos por regimen (`internal_payroll`, `honorarios`, `deel`, `eor`, `contractor`).
- `organizations.tax_id` cumple un rol correcto para facturacion, pero algunos consumers lo usan como workaround para RUT personal.
- El PDF/snapshot de finiquito no tiene fuente canonica para RUT/documento del trabajador ni direccion.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema and contracts

- Crear migraciones con `pnpm migrate:create` para `greenhouse_core.person_identity_documents` y `greenhouse_core.person_addresses` o nombres equivalentes alineados al discovery real.
- Anclar los registros a `identity_profile_id` / `profile_id` y, cuando aplique, resolver `member_id` solo como consumer/projection.
- Incluir country-aware fields: `country_code`, `document_type`, `issuing_country`, `normalized_hash`, `display_mask`, `verification_status`, `source`, `valid_from`, `valid_until`, `created_by`, `verified_by`, `verified_at`, `rejected_reason`, audit timestamps.
- Para direcciones, modelar `address_type`, `country_code`, componentes estructurados, texto de presentacion, `verification_status`, vigencia y source/audit.
- Definir constraints para evitar duplicidad de documento activo por persona/tipo/pais sin bloquear historico versionado.
- Definir estrategia de proteccion del valor completo: cifrado/secret helper/vault existente si aplica en discovery; si no existe primitive canonica, crear una abstraction minima auditable antes de persistir raw.

### Slice 2 — Readers, masking and access policy

- Crear readers canonicos para obtener perfil legal de persona en modos `masked`, `self`, `hr_review`, `document_snapshot` y `reveal`.
- Implementar normalizacion/validacion pais-aware para `CL_RUT` y estructura extensible para documentos internacionales.
- Implementar reveal con capability, motivo obligatorio, audit trail y redaccion de errores.
- Integrar sanitizers para que documento/direccion no salgan en logs, Sentry, reliability signals ni AI context.
- Crear helper reusable de readiness por caso de uso: `payroll_period`, `final_settlement`, `honorarios_closure`, `document_render`.

### Slice 3 — Self-service collaborator UI

- Extender `/my/profile` con una seccion `Datos legales y contacto` o tab equivalente.
- Permitir al colaborador cargar/editar documento de identidad y direccion segun pais/regimen.
- Mostrar estados claros: faltante, pendiente de revision, verificado, rechazado, vencido.
- No mostrar el documento completo salvo cuando el usuario acaba de ingresarlo y bajo UX segura; persistido debe verse enmascarado.
- Permitir subir evidencia opcional cuando la politica lo requiera, usando private assets/document vault.
- Usar copy pais-aware y accesible: "RUT" para Chile, "documento de identidad" como fallback.

### Slice 4 — HR review and People 360 integration

- Extender People/HR profile para que HR pueda revisar, corregir, verificar o rechazar datos legales.
- Exponer historial/audit de cambios y fuentes sin mostrar valores completos por defecto.
- Integrar la faceta legal en Person 360 como consumer autorizado, sin duplicar queries directas en cada surface.
- Mantener compatibilidad con campos legacy BigQuery mientras se backfillea.

### Slice 5 — Payroll, finiquito and honorarios readiness integration

- Conectar `final_settlement_documents` para que el snapshot de trabajador consuma el reader canonico y deje de usar `taxId: null` cuando el dato existe.
- Bloquear emision formal de finiquito laboral Chile si falta `CL_RUT` requerido o entidad legal empleadora incompleta.
- Para honorarios Chile persona natural, exponer readiness de RUT/documento para cierre contractual, boleta/retencion SII y pago si el flujo lo gestiona Greenhouse.
- Para Deel/EOR/contractor internacional, no forzar RUT; usar requisitos por pais/proveedor.
- TASK-783 debe consumir estos readiness gates en vez de inventar validaciones locales.

### Slice 6 — Backfill, migration and deprecation of workarounds

- Backfillear desde BigQuery `member_profiles.identity_document_*` como `source='legacy_bigquery_member_profile'` y `verification_status='pending_review'` o estado equivalente.
- Detectar usos de `organizations.tax_id` como RUT personal mediante `person_legal_entity_relationships` / consumers actuales y documentar plan de migracion sin romper facturacion.
- Mantener `organizations.tax_id` como source of truth para facturacion y entidades legales.
- Agregar report de cobertura: personas sin documento requerido por regimen, direcciones faltantes y datos pendientes de revision.

### Slice 7 — Observability, docs and manuales

- Agregar reliability/data-quality signals sin payload sensible:
  - personas payroll Chile sin documento requerido
  - datos legales pendientes de revision mas de N dias
  - attempts de reveal anómalos
  - bloqueos de documento/finiquito por identidad faltante
- Actualizar arquitectura, documentacion funcional y manual de uso.
- Actualizar TASK-783 si cambia el contrato de readiness o snapshot.

## Out of Scope

- No eliminar `organizations.tax_id`.
- No migrar facturacion, clientes, proveedores empresa ni entidades legales empleadoras fuera de `organizations`.
- No implementar firma electronica ni validacion externa con Registro Civil/SII salvo que ya exista primitive canonica descubierta.
- No redisenar todo People 360 ni Payment Profiles fuera del consumo necesario.
- No guardar copias completas de documentos de identidad en logs, outbox publicos, notas libres o JSON sin proteccion.
- No resolver clasificacion legal de honorarios vs dependencia; si hay riesgo de subordinacion, el sistema debe marcar `legal_review_required`.

## Detailed Spec

### Canonical boundary

- `Organization.tax_id` = identidad tributaria de organizaciones/personas juridicas, clientes, proveedores empresa, legal entities y facturacion.
- `PersonIdentityDocument` = identidad legal/documental de personas naturales.
- `PersonAddress` = direccion legal/contacto de personas naturales.
- `PersonLegalProfileReadiness` = resultado derivado por caso de uso, no tabla manual editable.

### Access model decision

- `routeGroups`: reutilizar `my`, `hr` y `people`/surface existente. No crear route group nuevo salvo drift real en Discovery.
- `views`: extender surface visible de `/my/profile` y People/HR profile. Si el catalogo de views requiere codigos nuevos, declarar `mi_ficha.legal_profile` y `equipo.person_legal_profile` o equivalentes alineados al runtime.
- `entitlements`: agregar capabilities finas o reutilizar naming canonico existente:
  - `person.legal_profile.read_masked`
  - `person.legal_profile.self_update`
  - `person.legal_profile.hr_update`
  - `person.legal_profile.verify`
  - `person.legal_profile.reveal_sensitive`
  - `person.legal_profile.export_snapshot`
- `startup policy`: sin cambios esperados.

### Country/regime readiness examples

- Chile dependent internal payroll:
  - required: `CL_RUT`, legal name, country, address when document template requires it.
  - finiquito formal blocks if missing.
- Chile honorarios person natural:
  - required: `CL_RUT` for boleta/retention/payment flows managed by Greenhouse.
  - no labor finiquito; consumer is contractual closure.
- International/Deel/EOR:
  - required fields are provider/country-specific.
  - no forced Chile RUT unless the person is legally required to provide it.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe modelo Postgres canonico para documentos de identidad de personas con pais/tipo/source/estado/verificacion/audit.
- [ ] Existe modelo Postgres canonico para direcciones de personas con vigencia/source/estado/verificacion/audit.
- [ ] `/my/profile` permite self-service de datos legales sin exponer valores completos persistidos innecesariamente.
- [ ] HR puede revisar, verificar, rechazar o corregir datos legales con audit.
- [ ] Readers canonicos entregan vista enmascarada, snapshot documental y reveal auditado.
- [ ] `organizations.tax_id` sigue intacto y documentado como identidad tributaria de organizaciones/facturacion.
- [ ] Finiquito/documento formal consume el reader canonico y bloquea emision formal Chile si falta RUT/documento requerido.
- [ ] Honorarios persona natural tiene readiness contractual/pago separado, sin mostrar `Calcular finiquito`.
- [ ] No hay raw document/address leaks en logs, Sentry, reliability signals, outbox publicos ni AI context.
- [ ] Backfill legacy queda trazado como pendiente de revision, no verificado automaticamente.
- [ ] Docs y manuales explican self-service, revision HR, permisos, estados y troubleshooting.

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:create <slug>` para migraciones nuevas
- `pnpm pg:connect:migrate` o flujo de migracion canonico segun discovery
- `pnpm tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- Tests focales de readers/masking/reveal/readiness
- Tests de API self-service y HR review
- Validacion manual o preview de `/my/profile`, People/HR profile y `/hr/offboarding`
- Verificacion de redaction/sanitizers sobre logs/events/reliability

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-783` quedo actualizado con el contrato final de readiness/person legal profile si este cambio lo ajusta
- [ ] documentacion funcional y manual de uso de HR/People/My Profile quedaron sincronizados

## Follow-ups

- Integracion futura con validacion externa de RUT/identidad si se define proveedor o API oficial.
- Politica de retencion/anonymization por pais para ex colaboradores.
- Extender API Platform People read surface con datos legales enmascarados solo cuando `TASK-658` resource authorization este listo.

## Open Questions

- Ninguna bloqueante al crear la task. Discovery debe decidir la primitive exacta de proteccion del valor completo: cifrado aplicacion, vault externo, campo protegido existente o asset privado segun runtime real.

## Plan Mode — Decisiones resueltas (2026-05-04)

1. **Encryption strategy**: replicar TASK-697 pattern (plaintext at rest + grants estrictos `greenhouse_runtime` + reveal capability + audit + outbox + sanitizers extendidos). NO introducir KMS envelope encryption en V1. Justificación: (a) pattern probado en repo (`beneficiary_payment_profiles`); (b) consistente con cómo Greenhouse trata otros datos sensibles como instrumentos de pago; (c) Cloud SQL ya cifra at-rest a nivel disco; (d) introducir KMS envelope requiere infra nueva + key rotation policy + DR procedure que no es scope foundation. Mitigaciones adicionales: hash con pepper para dedup (no exponer hash plain), `display_mask` precomputado, sanitizers extendidos para RUT en logs/Sentry/AI/HTTP responses, signals de reveal anómalo. Si compliance Ley 21.719 art 17 escala el riesgo, follow-up TASK con KMS envelope.

2. **Module location**: `src/lib/person-legal-profile/` (módulo nuevo, dominio HR/identity). NO extender `src/lib/finance/economic-category/identity-lookup.ts` (vive en finance/, resuelve persona vía cadena org→relationship→member para clasificar gastos). Mezclar dominios incrementa coupling.

3. **Anchor**: `identity_profile_id` (raíz canónica Person 360), no `member_id`. Members puede tener ≥1 profile en futuro multi-tenant; profile es identidad, member es proyección/staffing.

4. **Pepper**: nuevo secret `greenhouse-pii-normalization-pepper` en GCP Secret Manager (proyecto `efeonce-group`). Generado via `openssl rand -hex 32` y registrado en `src/lib/cloud/secrets.ts`. NUNCA commiteado al repo.

5. **Backfill**: dry-run por default; `--commit` flag explícito. Idempotente vía UNIQUE partial constraint + `(profile_id, document_type, country_code, value_hash)` lookup. Ejecución en staging dentro de TASK-784 cierre; ejecución producción se decide post-merge con dry-run review humano.

6. **Branch**: `develop` directo (instrucción usuario "mantente en develop", consistente con TASK-030, TASK-553, TASK-763). 9 commits secuenciales (1 baseline + 7 slices + 1 close).

7. **Capabilities granulares (6)**:
   - `person.legal_profile.read_masked` — todos autenticados (su propio perfil por default)
   - `person.legal_profile.self_update` — `route_group: my` (owner_self)
   - `person.legal_profile.hr_update` — `route_group: hr` + EFEONCE_ADMIN
   - `person.legal_profile.verify` — `route_group: hr` + EFEONCE_ADMIN
   - `person.legal_profile.reveal_sensitive` — EFEONCE_ADMIN + payroll_admin (least privilege)
   - `person.legal_profile.export_snapshot` — server-only (document generators), no UI surface

8. **Outbox events nuevos (5, v1)**: `person_identity_document.{declared,verified,rejected,revealed_sensitive}` + `person_address.declared`. Documentados en `EVENT_CATALOG_V1.md` Delta.

9. **Reliability signals nuevos (4)**: `identity.legal_profile.{pending_review_overdue, payroll_chile_blocking_finiquito, reveal_anomaly_rate, evidence_orphan}`. Modulo `'identity'` agregado al `STATIC_RELIABILITY_REGISTRY`.

10. **Routes/Views**: extender `mi_ficha.legal_profile` (`/my/profile`) y `equipo.person_legal_profile` (People HR profile tab). NO route group nuevo.
