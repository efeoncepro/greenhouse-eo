# TASK-1761 — Hiring-to-Entra Workforce Account Provisioning and Lifecycle Bridge

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Muy alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration|command|sync|migration`
- Epic: `EPIC-011`
- Status real: `Diseño profundo; ADR Proposed; implementación y rollout inexistentes`
- Rank: `TBD`
- Domain: `identity|hr|platform|ops`
- Blocked by: `TASK-1727 + TASK-1731 + aceptación del ADR + capacidad/licenciamiento Microsoft verificables`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte los checkpoints longitudinales de Hiring en una identidad laboral Microsoft Entra sin crear otra
persona ni conceder acceso antes de readiness. Provisiona primero una cuenta cloud-only deshabilitada, reconcilia
el resultado asíncrono, liga su OID al principal existente y separa habilitación, grupos y licencia. Incluye el
ciclo Joiner-Mover-Leaver y corrige el bug que hoy confunde `accountEnabled=false` con desactivar `/my`.

## Why This Task Exists

TASK-770 materializa/reusa el `member`; TASK-1727 crea el principal candidato longitudinal; TASK-1731 separa
`principal_bound` de `workforce_enabled`. Ninguna de ellas escribe Microsoft Entra, y ese out-of-scope es correcto.
La integración productiva actual va en sentido Entra → Greenhouse. Añadir el sentido inverso sin un boundary
dedicado produce cuatro fallos sistémicos: duplicación por correo/UPN, acceso temprano, outcome falso por `202`, y
loop con el SCIM saliente.

Además, `src/lib/entra/profile-sync.ts` hoy desactiva `client_users.active` cuando Entra reporta
`accountEnabled=false`; una cuenta preboarding correctamente deshabilitada podría apagar la cuenta candidata y su
sesión `/my`. El canary queda prohibido hasta separar ambos ciclos de vida y probar la regresión.

## Goal

- Provisionar en Entra sobre el mismo `user_id`/`identity_profile_id`/`member_id`, con ancla inmutable y OID leído.
- Separar reserva disabled, binding, habilitación laboral y readiness M365 con gates humanos y técnicos.
- Hacer idempotentes y reconciliables submit, retry, enable, mover, cancelación pre-start, offboarding y rehire.
- Preservar el principal longitudinal Greenhouse aunque la cuenta Microsoft esté deshabilitada o revocada.
- Entregar least privilege, observabilidad, rollback compensatorio, documentación y canary controlado.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ENTRA_WORKFORCE_ACCOUNT_PROVISIONING_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`
- `docs/architecture/GREENHOUSE_CANDIDATE_ACCOUNT_LONGITUDINAL_MY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Greenhouse entrega hechos laborales autorizados; Entra conserva autoridad del objeto Microsoft, OID y estado.
- Selección, handoff aprobado o `member.created` nunca provisionan por sí solos.
- `principal_bound` permite reservar disabled; sólo `workforce_enabled` más licencia/grupo/approval permite habilitar.
- `accountEnabled=false` nunca desactiva automáticamente el principal longitudinal ni sus audiences candidatas.
- Email personal/UPN/display name nunca prueban ownership ni autorizan auto-merge.
- `/bulkUpload` `202` significa aceptado para procesamiento, no provisionado.
- OID/UPN se ligan al principal existente antes de preparar grupos/licencia, habilitar o incluir la cuenta en el
  scope SCIM saliente; enablement es el último side effect de acceso.
- No password/TAP/secreto aparece en DB, outbox, logs, errores, telemetry ni handoff.
- No alta sin compensación de salida; nunca hard-delete automático.

## Normative Docs

- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/tasks/to-do/TASK-1727-candidate-portal-principal-session-foundation.md`
- `docs/tasks/to-do/TASK-1731-selection-workforce-account-continuity-bridge.md`
- `docs/tasks/to-do/TASK-1721-governed-hiring-selection-journey-orchestrator.md`
- `docs/tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md`
- `docs/tasks/in-progress/TASK-872-scim-internal-collaborator-provisioning.md`
- `docs/tasks/to-do/TASK-1349-offboarding-member-lifecycle-writeback.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

Microsoft oficial:

- `https://learn.microsoft.com/en-ie/entra/identity/app-provisioning/inbound-provisioning-api-concepts`
- `https://learn.microsoft.com/en-us/graph/api/synchronization-synchronizationjob-post-bulkupload`
- `https://learn.microsoft.com/en-us/entra/identity/app-provisioning/inbound-provisioning-api-grant-access`
- `https://learn.microsoft.com/en-us/entra/identity/app-provisioning/customize-application-attributes`

## Dependencies & Impact

### Depends on

- TASK-1727 para un principal longitudinal, audiences y session lifecycle source-neutral.
- TASK-1731 para `principal_bound`, `workforce_enabled` y su readback idempotente.
- TASK-770 para activation request y el mismo `member`/`identity_profile_id`.
- Microsoft Enterprise App API-driven inbound, admin consent, certificado/workload identity y job configurado.
- Capacidad de licencias verificada y security group dedicado antes de habilitar M365.

### Blocks / Impacts

- TASK-1721 observa checkpoints Entra y devuelve `nextRequiredAction`, pero no ejecuta writes externos.
- TASK-1349 conserva ownership de cierre laboral; esta task posee disable/revoke/remove license-group en Microsoft.
- TASK-872/SCIM debe reconciliar el retorno sobre el principal ya ligado, nunca crear otro.
- `src/lib/entra/profile-sync.ts`, SCIM Users, auth/session, Platform Health y Identity Admin.

### Files owned

- `src/lib/entra/workforce-provisioning/**` *(nuevo; orchestration durable ejecutada por ops-worker, no por request Vercel)*
- `src/lib/entra/profile-sync.ts`
- `src/lib/scim/**` sólo en seams de matching/reconciliación y status split
- `src/lib/reliability/queries/identity-entra-*.ts` *(nuevos)*
- `src/app/api/admin/identity/entra-workforce-provisioning/**` *(nuevo, si Plan Mode conserva route)*
- `migrations/*task-1761*entra*provisioning*.sql` *(nuevo; timestamp en ejecución)*
- arquitectura, docs funcionales, manual/runbook, catálogos de capabilities/eventos/flags afectados

## Current Repo State

### Already exists

- Principal/persona longitudinal diseñados en TASK-1727/1731.
- Activation request source-neutral y member anti-duplicación de TASK-770.
- SCIM Entra → Greenhouse, Graph profile sync, OID fields y provisioning logs internos.
- Unique parcial en `client_users.microsoft_oid` y unique de `members.identity_profile_id`.
- Azure CLI autenticado para inspección read-only del tenant.

### Gap

- No existe app/job inbound, command, ledger, reconciler ni estado Greenhouse → Entra.
- `accountEnabled` sigue acoplado a `client_users.active` y amenaza el portal longitudinal.
- El source link externo no tiene unicidad inversa suficiente por objeto Entra.
- No existe security group de licenciamiento ni capacidad libre verificable.
- No existe compensación Microsoft conectada al offboarding.
- El tenant productivo es el único entorno observado; no hay staging tenant aislado.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/entra`, `src/lib/scim`, Vercel API/cron y ops-worker compartido
- Future candidate home: `domain-package`
- Boundary: `propose/confirmProvisionEntraWorkforceAccount`, `reconcileEntraWorkforceProvisioning`,
  `enableEntraWorkforceAccount`, `deprovisionEntraWorkforceAccount` y reader de estado; consumers llaman primitives
- Server/browser split: stores, DB, Graph tokens/certificados, provisioning logs y PII son server-only; UI/MCP sólo
  recibe DTO allowlisted y commands gobernados
- Build impact: `Microsoft Graph HTTP/client mínimo; ningún SDK pesado sin benchmark`
- Extraction blocker: transacciones PG, auth/capabilities compartidas, outbox, SCIM de retorno y provider externo

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration|command|sync|migration`
- Source of truth afectado: `greenhouse_core client principal + new provisioning ledger + Microsoft Entra object`
- Consumidores afectados: `Hiring/Workforce, Identity Admin, TASK-1721, SCIM, ops-worker, Platform Health, external`
- Runtime target: `staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: TASK-770 activation service; TASK-1731 checkpoints; SCIM Users/filter; Graph profile
  sync; identity source links; capability/outbox/reliability registries
- Contrato nuevo o modificado: aggregate `entra_workforce_account_provisioning`; commands submit/enable/disable;
  status reader; async reconciler; OID-binding primitive; JML compensations
- Backward compatibility: `gated`; SCIM y auth existentes conservan comportamiento con flags OFF
- Full API parity: UI, MCP, CLI, orchestrator y jobs consumen los mismos commands/readers; ninguna ruta escribe Graph
  o tablas directamente

### Data model and invariants

- Entidades/tablas/views afectadas: nueva `greenhouse_sync.entra_workforce_account_provisioning` *(nombre final en
  Plan Mode)*, `greenhouse_core.client_users`, `greenhouse_core.identity_profile_source_links`, `members` sólo para
  OID binding/readback, integration registry/source sync runs y outbox
- Invariantes que no se pueden romper:
  - Un anchor Greenhouse identifica como máximo un objeto Entra y un objeto Entra como máximo un perfil.
  - `portal_principal_active`, `workforce_account_enabled`, `m365_service_ready` y member lifecycle son ejes distintos.
  - Ningún estado terminal se infiere desde HTTP `202`; se confirma por provisioning logs/readback.
  - Group/license/TAP sólo después de OID binding y `workforce_enabled`.
  - Replays no repiten side effects ya confirmados; outcome incierto obliga readback.
- Write-target allowlist: declarar la tabla nueva y los writes legítimos en cada boundary test Hiring/Identity existente
  en el mismo PR; SCIM/profile sync no ganan destinos implícitos
- Tenant/space boundary: target tenant viene de configuración server-side única y el subject de
  `identity_profile_id`/activation request; nunca del request del browser
- Idempotency/concurrency: key `targetTenant + immutableWorkforceAnchor + version`; unique index; row lock/CAS para
  binding; batch máximo 50; retry sólo de failed con `Retry-After` y rate conservador
- Audit/outbox/history: ledger append-only de attempts/transitions y outbox minimizado con correlation/IDs; sin
  password, TAP, token, raw payload ni PII redundante

### Migration, backfill and rollout

- Migration posture: `additive|backfill`
- Default state: `flags OFF`; shadow/read-only antes de cualquier external write
- Backfill plan: no alta masiva; auditoría dry-run de OID/source-link/UPN y un canary sintético allowlisted disabled
- Rollback path: flags OFF detienen submit/enable; compensación durable disable + remove access/license groups +
  revoke bootstrap, preservando principal y audit; no delete automático
- External coordination: aceptación ADR, app + admin consent, certificado/workload identity, permisos readback,
  security group, licencia, People/Security/Ops approval y ventana de canary

### Security and access

- Auth/access gate: federación workload GCP service account → Entra preferida; certificado dedicado como fallback;
  service principal least-privilege; capability granular para propose/confirm/enable/disable;
  SoD entre People approval, identity execution y admin consent
- Sensitive data posture: PII de identidad y credenciales externas; minimización, redacción y Secret Manager/Key Vault
- Error contract: `entra_provisioning_not_eligible`, `entra_upn_conflict`, `entra_provisioning_uncertain`,
  `entra_oid_binding_conflict`, `entra_license_unavailable`, `entra_activation_not_ready`,
  `entra_scim_roundtrip_mismatch`; sin raw provider errors
- Abuse/rate-limit posture: batch <=50, conservative throttle, `429`/`Retry-After`, circuit breaker, retry budget,
  poison quarantine y kill switch

### Runtime evidence

- Local checks: unit/property tests de state machine, idempotencia, mapping, status split, error redaction y JML
- DB/runtime checks: migration constraints, carreras concurrentes, uniqueness inversa, dry-run y readback PG
- Integration checks: synthetic disabled account → terminal log → OID bind → SCIM roundtrip update; enable/disable sólo
  tras gates; license-unavailable bloquea sin false success
- Reliability signals/logs: `identity.entra.workforce_provisioning_stuck`,
  `identity.entra.principal_oid_binding_drift`, `identity.entra.scim_roundtrip_duplicate_risk`,
  `identity.entra.license_activation_blocked`, `identity.entra.leaver_access_residual`,
  `identity.entra.portal_principal_status_coupling`
- Production verification sequence: auditoría read-only → app/job disabled → local/contract tests → synthetic disabled
  submit → terminal readback → OID bind → SCIM roundtrip → approval/license gate → enable → disable/revoke drill →
  7 días de observación antes de ampliar

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] La lógica vive en primitives server-side, no en route/UI/job adapters.
- [ ] Provision/enable/disable/reconcile son commands/readers gobernados, idempotentes, auditables y sanitizados.
- [ ] Capabilities y grants reales se registran en el mismo PR con coverage test.
- [ ] El camino programático Product API/MCP/CLI consume el mismo contrato; no existe adapter Nexa-específico.
- [ ] Confirmación humana y SoD preceden todo write que habilite acceso o consuma licencia.
- [ ] La parity check demuestra un primitive único para UI, MCP, CLI, async y recovery.

<!-- ZONE 2 — PLAN MODE: no completar al registrar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — Preflight, status split y gates P0

- Revalidar tenant, permisos, SKUs, grupos, app/job, mapping SCIM y configuración TAP sin mutaciones.
- Aceptar o ajustar el ADR; completar threat model STRIDE y data/privacy assessment.
- Separar `accountEnabled` de `client_users.active`/portal audiences en profile sync + SCIM y agregar negative tests.
- Auditar duplicados OID/source-link/UPN; agregar uniqueness/resolver transaccional antes del primer submit.

### Slice 1 — Aggregate, policy y commands OFF

- Crear ledger/state machine `proposed → approved → submitted → accepted → processing → provisioned_disabled →
  oid_bound → access_prepared → enabled → scim_reconciled → ready`, más `blocked|failed|disabled|cancelled` con
  attempts append-only.
- Implementar ancla inmutable, UPN reservation/collision queue, capabilities, audit/outbox y status reader.
- Registrar flags default OFF y signals sin declarar runtime activo antes del deploy.

### Slice 2 — Adapter inbound least-privilege y reconciler

- Crear app/principal dedicado y adapter `/bulkUpload`; spikear WIF GCP→Entra y usar certificado dedicado sólo si
  WIF no es viable. Nunca reutilizar `AZURE_AD_CLIENT_SECRET`.
- Persistir submission/correlation; reconciliar provisioning logs hasta terminal y reintentar sólo failures.
- Crear disabled, sin licencia, grupo o TAP; respetar 50 ops, rate conservador y `Retry-After`.

### Slice 3 — OID binding y SCIM roundtrip seguro

- Bind OID/UPN al principal/member existentes bajo lock/CAS y constraints.
- Probar que el SCIM saliente encuentra/actualiza el mismo principal y no ejecuta POST duplicado.
- Bloquear group assignment hasta cerrar binding y signal steady=0.

### Slice 4 — Habilitación y service readiness

- Preparar group/license posterior a `workforce_enabled`, con approval, `usageLocation`, capacidad y security group;
  verificar `licenseAssignmentStates`, no sólo membership.
- Mantener la cuenta disabled hasta completar readback de preparación; ejecutar enable como último side effect y
  separar cuenta habilitada de `m365_service_ready`/SCIM reconciled.
- Mantener TAP/Lifecycle Workflows fuera salvo decisión/licencia/policy explícita.

### Slice 5 — JML, recovery y operación

- Integrar cancellation pre-start, mover/rename, offboarding de TASK-1349 y rehire.
- Entregar compensaciones disable/revoke/remove group-license, reconciler residual, drills y recovery allowlisted.
- Completar docs técnica/funcional/manual, Platform Health, runbook, canary y cooldown.

## Out of Scope

- Reemplazar el login Greenhouse por SSO Microsoft para candidatos.
- Hacer de email/UPN la identidad primaria o auto-mergear colisiones.
- Hard-delete automático de usuarios Entra/Greenhouse.
- Licenciamiento dinámico sin security group, capacidad y aprobación verificables.
- Password delivery, TAP o Lifecycle Workflows en el primer rollout.
- Crear cuentas para `staff_augmentation`, clientes, guests o destinos distintos de `internal_hire`.
- Revertir selección, member o workforce facts porque falle Microsoft.

## Detailed Spec

El plan debe congelar antes de código: schema del ledger/attempts, ancla inmutable, UPN policy, mapping inbound,
terminal statuses, capabilities/SoD, provider permission split, error taxonomy, event names, signal queries,
retención de audit, config del security group/licencia, y contrato exacto entre TASK-1721/1731/1349. El target tenant
y job IDs son configuración server-side; no se hardcodean ni se aceptan desde consumidores.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 → Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- La separación de status y uniqueness inversa de Slice 0 MUST ship antes de cualquier canary.
- OID binding de Slice 3 MUST cerrar antes de group/license/enable de Slice 4.
- Offboarding/recovery de Slice 5 MUST estar probado antes de ampliar más allá del canary.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Cuenta Entra disabled apaga `/my` | identity/auth/cron | high | status split + negative test pre-canary | `identity.entra.portal_principal_status_coupling` |
| SCIM crea segundo principal/member | SCIM/identity | high | bind OID antes de scope + CAS/unique + roundtrip test | `identity.entra.scim_roundtrip_duplicate_risk` |
| `202` se toma como éxito | Entra/sync | high | durable state + terminal log readback | `identity.entra.workforce_provisioning_stuck` |
| Colisión UPN enlaza persona incorrecta | identity | medium | immutable anchor + human queue; no email merge | `identity.entra.principal_oid_binding_drift` |
| Habilitación sin licencia | M365/access | high en snapshot actual | fail-closed capacity/readback | `identity.entra.license_activation_blocked` |
| Alta sin baja deja acceso residual | Entra/offboarding | medium | TASK-1349 integration + compensation drill | `identity.entra.leaver_access_residual` |
| Permisos Graph excesivos | security | medium | separate writer/observer + readback + periodic review | `identity.entra.permission_scope_drift` |
| Canary toca tenant productivo | external/release | high | synthetic allowlist, disabled/no-license, approval, kill switch | `identity.entra.unapproved_external_write` |

### Feature flags / cutover

- `WORKFORCE_ENTRA_INBOUND_PROVISIONING_ENABLED=false`: bloquea submit externo.
- `WORKFORCE_ENTRA_ACCOUNT_ENABLEMENT_ENABLED=false`: bloquea `active=true`.
- `WORKFORCE_ENTRA_M365_ACTIVATION_ENABLED=false`: bloquea group/license/TAP.
- Flags separadas y default OFF en todos los environments; cada flip exige readback y cooldown.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 0 | revert policy code manteniendo constraint protectora; flags siguen OFF | <15 min | sí |
| 1 | flags OFF + revert adapters; preservar ledger/audit | <15 min | sí |
| 2 | submit flag OFF; reconciliar submissions aceptadas, no abandonarlas | <15 min + provider | parcial |
| 3 | scope SCIM OFF; resolver binding por recovery allowlisted, no borrar | <30 min | parcial |
| 4 | enable/M365 flags OFF + disable/remove group/license compensatorio | <30 min | parcial |
| 5 | automatización OFF; ejecutar recovery por command y conservar evidencia | <30 min | parcial |

### Production verification sequence

1. Revalidar tenant/app/job/permisos/SKUs/grupos y guardar evidencia redactada.
2. Deploy con tres flags OFF; confirmar cero cambio SCIM/auth/profile sync.
3. Ejecutar auditoría dry-run de anchors/OIDs/source links/UPNs y corregir todo conflicto.
4. Autorizar una identidad sintética; submit disabled/no-license y confirmar terminal log + OID.
5. Bind OID; ejecutar SCIM roundtrip y confirmar mismo user/profile/member.
6. Probar cancelación/disable/revoke antes de cualquier enable.
7. Con licencia y approval verificadas, habilitar el mismo canary y leer account/group/license.
8. Probar offboarding y rehire controlados; observar signals 7 días.
9. Ampliar sólo con sign-off People + Security + Ops y steady state verde.

### Out-of-band coordination required

- Aceptación humana del ADR.
- Admin consent y configuración de Enterprise App/job en Entra.
- Certificado/workload identity y secret refs sin exposición.
- Compra/liberación de licencia y creación de security group dedicado.
- Política UPN, owner de colisiones, TAP y comunicación de onboarding.
- Canary real en tenant productivo y ventana de rollback.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Cuenta disabled se crea sólo desde `principal_bound` elegible y queda ligada al mismo principal por anchor/OID.
- [ ] `accountEnabled=false` no desactiva `/my`, candidate audience ni el principal longitudinal.
- [ ] HTTP `202`, timeout y `429` nunca producen false success ni retry duplicado.
- [ ] SCIM roundtrip actualiza el mismo `client_user`/profile/member; cero duplicate principals.
- [ ] Enable/group/license sólo ocurren tras `workforce_enabled`, approval y capacidad readback.
- [ ] Cancelación, offboarding y rehire preservan identidad y revocan acceso externo de forma verificable.
- [ ] Ningún password, TAP, token, certificado, raw payload o PII innecesaria aparece en stores/logs/events.
- [ ] Flags OFF restauran estado seguro y compensations externas quedan ejecutables/auditadas.
- [ ] Documentación técnica, funcional y manual/runbook están completas y enlazadas.

## Verification

- `pnpm task:lint --task TASK-1761`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Tests focales Identity/SCIM/Hiring/Workforce/reliability y negative auth tests.
- Migration verify + duplicate/concurrency fixtures contra PostgreSQL real de staging.
- Azure/Graph readback de app permissions, job, logs, OID, accountEnabled, group y license.
- Synthetic Joiner → enable → Mover → disable/offboard → rehire drill.
- `pnpm qa:gates --changed`, `pnpm docs:closure-check` y `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] Lifecycle/carpeta y `docs/tasks/README.md` sincronizados con runtime real.
- [ ] ADR pasa a `Accepted` sólo con aprobación y refleja el contrato implementado.
- [ ] `GREENHOUSE_SCIM_ENTRA_INTEGRATION_V1.md`, candidate continuity e invariantes quedan actualizados.
- [ ] Event catalog, feature flag ledger, capability registry y signals registran sólo runtime materializado.
- [ ] Docs funcionales `docs/documentation/identity|hr` y manual/runbook explican operación y recovery.
- [ ] Handoff/changelog distinguen code complete, rollout y licencia/approval pendientes.
- [ ] Se ejecutó chequeo de impacto cruzado sobre TASK-1721/1727/1731/770/872/1349 y EPIC-011.

## Follow-ups

- Lifecycle Workflows/TAP sólo después de licencia Governance, policy y security review.
- Tenant de prueba Entra separado si el volumen/riesgo justifica aislar canaries.
- Automatización de compra/capacity planning de licencias fuera de este command de identidad.

## Delta 2026-08-21

Task registrada desde investigación oficial Microsoft, Azure CLI read-only, runtime/código Greenhouse y revisión
adversarial paralela. Ninguna App Registration, cuenta, licencia, grupo, secreto, flag ni dato Azure fue mutado.

## Open Questions

- ¿Qué ID laboral inmutable exacto será el matching attribute del job inbound?
- ¿Qué policy final reserva UPN y quién resuelve colisiones?
- ¿El observer con `ProvisioningLog.Read.All` queda en principal separado desde V1?
- ¿Qué SKU/security group financiará `m365_service_ready` y quién aprueba cada assignment?
- ¿TASK-1721 exige `m365_service_ready` para marcar el journey completo o lo reporta como post-condición separada?
