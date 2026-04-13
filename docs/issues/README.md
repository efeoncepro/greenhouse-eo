# Issue Tracker

Pipeline de incidentes operativos del portal.

## Convención

- Los issues usan `ISSUE-###` como ID estable.
- Los archivos viven en `docs/issues/{open,resolved}/`.
- Un issue se mueve a `resolved/` cuando se confirma la solución en el ambiente afectado.
- A diferencia de las tasks (`TASK-###`), los issues son reactivos: documentan un problema encontrado en runtime, no trabajo planificado.

## Estados

- `open`: incidente detectado, en diagnóstico o pendiente de solución.
- `resolved`: solución aplicada y verificada en el ambiente afectado.

## Protocolo operativo

- El modelo operativo canónico de issues vive en `docs/operations/ISSUE_OPERATING_MODEL_V1.md`.
- Un issue puede resolverse directamente sin task si el fix es localizado y verificable.
- Al resolverse, el archivo debe moverse de `docs/issues/open/` a `docs/issues/resolved/` y el tracker debe actualizarse en el mismo lote.

## Plantilla

```markdown
# ISSUE-### — Título breve

## Ambiente

production | staging | preview

## Detectado

Fecha, canal de detección (Slack alert, Sentry, Admin Center, usuario)

## Síntoma

Qué se observa desde fuera.

## Causa raíz

Qué lo provoca a nivel técnico.

## Impacto

Qué funcionalidad está afectada y para quién.

## Solución

Qué se hizo o hay que hacer para resolverlo.

## Verificación

Cómo confirmar que se resolvió.

## Estado

open | resolved

## Relacionado

Tasks, docs de arquitectura, o commits relacionados.
```

## Siguiente ID disponible

`ISSUE-047`

## Open

| ID          | Título                                                                                                                       | Ambiente             | Detectado  | Estado |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------- | ------ |
| `ISSUE-002` | [Nubox sync conformed: data integrity (period mixing, identity loss)](open/ISSUE-002-nubox-sync-conformed-data-integrity.md) | staging + production | 2026-03-30 | open   |
| `ISSUE-020` | [3 endpoints duplicados de retry batch sin error handling](open/ISSUE-020-duplicate-email-retry-endpoints.md)                | staging + production | 2026-04-06 | open   |
| `ISSUE-023` | [Tablas de email sin migracion formal](open/ISSUE-023-email-tables-no-formal-migration.md)                                   | production + staging | 2026-04-06 | open   |
| `ISSUE-044` | [Dashboard pages 500 via agent headless](open/ISSUE-044-dashboard-ssr-500-agent-headless.md)                                  | staging              | 2026-04-11 | open   |
| `ISSUE-045` | [Registrar OC falla por referencia ambigua a `client_id` en el resolver canónico de Finance](open/ISSUE-045-purchase-order-create-ambiguous-client-id.md) | staging | 2026-04-13 | open |

## Resolved

| ID          | Título                                                                                                                                                            | Ambiente                       | Detectado  | Resuelto   | Causa                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ISSUE-046` | [Reactive pipeline silent-skip backlog (~11k eventos sin procesar)](resolved/ISSUE-046-reactive-pipeline-silent-skip-backlog.md) | staging + production (single-instance) | 2026-04-13 | 2026-04-13 | Consumer V1 silent-skip path + fan-out explosion. Resuelto por TASK-379 (PR #53) + audit-only sweep follow-up (PR #54). Backlog drenado de 11,495 → 0. |
| `ISSUE-031` | [Vercel Preview falla en build por drift de `NEXTAUTH_SECRET`](resolved/ISSUE-031-vercel-preview-build-fails-missing-nextauth-secret.md)                        | preview                        | 2026-04-08 | 2026-04-08 | `authOptions` se resolvía en import-time y Preview no tenía `NEXTAUTH_SECRET`, por lo que el build caía en page-data collection |
| `ISSUE-032` | [Secret Manager payload contamination breaks runtime secrets](resolved/ISSUE-032-secret-manager-payload-contamination-breaks-runtime-secrets.md)                 | staging + production           | 2026-04-08 | 2026-04-09 | Payloads de Secret Manager publicados con comillas/`\\n` literal llegaban sucios al runtime y rompían auth/integraciones |
| `ISSUE-027` | [My Profile vacío tras migración a Person 360: resolución "me" retorna 404](resolved/ISSUE-027-my-profile-360-me-resolution-404.md)                               | staging                        | 2026-04-07 | 2026-04-07 | `resolvePersonIdentifier` no buscaba por `identity_profile_id` — WHERE clause solo tenía `member_id OR user_id`          |
| `ISSUE-025` | [sendEmail() reporta 'sent' cuando todos los recipients fueron skipped](resolved/ISSUE-025-sendmail-status-aggregation-skipped-as-sent.md)                        | production + staging + preview | 2026-04-06 | 2026-04-07 | `sendEmail()` no trackeaba `sawSkipped`; 18 registros históricos corregidos via backfill                                 |
| `ISSUE-024` | [Admin Notifications: errores silenciosos ocultan estado real](resolved/ISSUE-024-admin-notifications-silent-failures-zero-kpis.md)                               | staging + preview              | 2026-04-06 | 2026-04-07 | Catch blocks silenciosos + logDispatch vacío + schema validation faltante + diagnostics UI ausente                       |
| `ISSUE-022` | [Adjuntos de email base64 pueden corromper PDFs](resolved/ISSUE-022-email-attachments-base64-corruption.md)                                                       | production + staging           | 2026-04-06 | 2026-04-07 | Attachments re-encoded a base64 string; corregido a `Buffer` directo                                                     |
| `ISSUE-021` | [Ventana de retry de emails limitada a 1 hora](resolved/ISSUE-021-email-retry-window-too-narrow.md)                                                               | production + staging           | 2026-04-06 | 2026-04-07 | Retry window expandida de 1h a 24h                                                                                       |
| `ISSUE-019` | [ensureEmailSchema() ejecuta DDL en cada envio de email](resolved/ISSUE-019-email-schema-runtime-ddl-on-every-send.md)                                            | production + staging           | 2026-04-06 | 2026-04-07 | `ensureEmailSchema()` eliminada; DDL runtime removido                                                                    |
| `ISSUE-018` | [Usuario invitado se crea con status 'pending' en vez de 'invited'](resolved/ISSUE-018-invite-user-status-pending-not-invited.md)                                 | production + staging           | 2026-04-06 | 2026-04-07 | INSERT usaba `'pending'`; corregido a `'invited'`                                                                        |
| `ISSUE-017` | [invite/route.ts consulta columna inexistente `display_name`](resolved/ISSUE-017-invite-route-display-name-column-missing.md)                                     | production + staging           | 2026-04-06 | 2026-04-07 | Query referenciaba `display_name` inexistente; corregida a `client_name`                                                 |
| `ISSUE-005` | [Payroll close route drains global notification backlog](resolved/ISSUE-005-payroll-close-route-drains-global-notification-backlog.md)                            | preview + production           | 2026-04-05 | 2026-04-05 | Payroll close drenaba backlog de notificaciones globales                                                                 |
| `ISSUE-004` | [column "organization_id" does not exist en finance route](resolved/ISSUE-004-finance-organization-id-column-missing.md)                                          | preview                        | 2026-04-02 | 2026-04-02 | Columna inexistente referenciada en query de finance                                                                     |
| `ISSUE-003` | [Permission denied for schema greenhouse_notifications](resolved/ISSUE-003-notification-schema-permission-denied.md)                                              | preview                        | 2026-04-01 | 2026-04-01 | Runtime user sin permisos DDL para crear schema notifications                                                            |
| `ISSUE-016` | [Microsoft SSO roto en produccion (secret rotado + member_id faltante en BQ)](resolved/ISSUE-016-microsoft-sso-broken-production-secret-rotation.md)              | production                     | 2026-04-05 | 2026-04-05 | Azure AD client secret rotado sin sincronizar produccion + `cu.member_id` inexistente en BQ query                        |
| `ISSUE-006` | [Payroll leave fallback silently zeroes unpaid leave](resolved/ISSUE-006-payroll-leave-fallback-silently-zeroes-unpaid-leave.md)                                  | preview + production           | 2026-04-05 | 2026-04-05 | Fallback silencioso de `leave_requests` colapsaba `dato no disponible` a `0` y permitía cálculo oficial incorrecto       |
| `ISSUE-015` | [Scroll horizontal en AgencyWorkspace (CustomTabList sin wrapper overflow)](resolved/ISSUE-015-agency-workspace-horizontal-scroll-overflow.md)                    | staging                        | 2026-04-05 | 2026-04-05 | `CustomTabList variant='scrollable'` en flex container sin `minWidth: 0` + `overflow: hidden`                            |
| `ISSUE-014` | [person_360 VIEW faltaba columnas enriched (avatar, job_title, phone)](resolved/ISSUE-014-person-360-view-missing-enriched-columns.md)                            | staging                        | 2026-04-05 | 2026-04-05 | VIEW era version antigua sin `resolved_avatar_url`, `resolved_job_title`, etc. — datos existian pero no se exponian      |
| `ISSUE-013` | [Staging deploy failures: proyecto duplicado, variables faltantes y bypass secret](resolved/ISSUE-013-staging-deploy-failures-duplicate-project-bypass-secret.md) | staging + preview              | 2026-04-05 | 2026-04-05 | Proyecto Vercel duplicado + `AGENT_AUTH_SECRET` faltante + `VERCEL_AUTOMATION_BYPASS_SECRET` manual con valor incorrecto |
| `ISSUE-012` | [Reactive cron routes fail closed without CRON_SECRET](resolved/ISSUE-012-reactive-cron-routes-fail-closed-without-cron-secret.md)                                | develop runtime                | 2026-04-05 | 2026-04-05 | `requireCronAuth()` validaba `CRON_SECRET` antes de reconocer requests legítimas de Vercel Cron                          |
| `ISSUE-011` | [Pre-merge conflict check false positives from SQL](resolved/ISSUE-011-merge-tree-conflict-check-false-positives.md)                                              | develop (tooling)              | 2026-04-05 | 2026-04-05 | `git merge-tree \| grep CONFLICT` matchea SQL `ON CONFLICT`; documentado comando correcto en AGENTS.md                   |
| `ISSUE-009` | [Reactive event backlog can accumulate without Ops visibility](resolved/ISSUE-009-reactive-event-backlog-can-accumulate-without-ops-visibility.md)                | develop runtime                | 2026-04-05 | 2026-04-05 | Admin Ops no contaba backlog reactivo oculto entre `published` y `outbox_reactive_log`                                   |
| `ISSUE-010` | [Finance schema drift logger type mismatch](resolved/ISSUE-010-finance-schema-drift-logger-type-mismatch.md)                                                      | staging + production           | 2026-04-05 | 2026-04-05 | `logFinanceSchemaDrift` tipaba `Error` pero catch da `unknown`                                                           |
| `ISSUE-007` | [Finance fallback writes can duplicate income and expenses](resolved/ISSUE-007-finance-fallback-writes-can-duplicate-income-and-expenses.md)                      | preview + production           | 2026-04-05 | 2026-04-05 | Fallback recalculaba un segundo ID en `income` y `expenses`                                                              |
| `ISSUE-008` | [Finance routes mask schema drift as empty success](resolved/ISSUE-008-finance-routes-mask-schema-drift-as-empty-success.md)                                      | preview + production           | 2026-04-05 | 2026-04-05 | Routes devolvían vacío ambiguo ante drift de schema                                                                      |
| `ISSUE-026` | [Mi Perfil crash: leave.requests nested object + auth redirect](resolved/ISSUE-026-my-profile-crash-leave-requests-nested-object.md)                              | production + staging           | 2026-04-07 | 2026-04-07 | `leave?.requests` es objeto anidado no array; fallback auth a `/dashboard` en vez de `/home`                             |
| `ISSUE-029` | [HubSpot sync falla por columnas incorrectas en identity_profiles](resolved/ISSUE-029-hubspot-sync-identity-profiles-column-mismatch.md)                          | staging + production           | 2026-04-07 | 2026-04-07 | `source_system` → `primary_source_system` + `profile_type` NOT NULL faltante en INSERT                                   |
| `ISSUE-028` | [HubSpot Cloud Run service 401: Private App Token expirado](resolved/ISSUE-028-hubspot-cloud-run-token-expired.md)                                                | staging + production           | 2026-04-07 | 2026-04-07 | Private App Token en Secret Manager revocado; rotado a version 2 + Cloud Run service update                              |
| `ISSUE-001` | [SSL bad certificate en webhook-dispatch](resolved/ISSUE-001-ssl-bad-certificate-production.md)                                                                   | production                     | 2026-03-30 | 2026-03-30 | `GREENHOUSE_POSTGRES_IP_TYPE` faltante en production                                                                     |
| `ISSUE-030` | [CI: test stale de OrganizationPeopleTab bloquea PRs no relacionados](resolved/ISSUE-030-ci-stale-organization-people-tab-test-blocks-unrelated-prs.md)           | preview + GitHub Actions CI    | 2026-04-08 | 2026-04-08 | El test asumía 1 `fetch()` y un solo `1.0`, pero el componente ya cargaba memberships + faceta `team` y renderizaba KPI  |
| `ISSUE-033` | [Emails duplicados a HR cuando permiso salta supervisor](resolved/ISSUE-033-leave-email-duplicate-hr-when-no-supervisor.md)                                       | production + staging           | 2026-04-09 | 2026-04-09 | `leave_request.created` sin supervisor duplicaba notificacion de `escalated_to_hr` a HR                                  |
| `ISSUE-034` | [Email decision permiso guarda userId en actor_email](resolved/ISSUE-034-leave-decision-email-actor-email-stores-userid.md)                                       | production + staging           | 2026-04-09 | 2026-04-09 | `actorUserId` se pasaba como `actorEmail` en `leave_request_decision` — datos de audit incorrectos                       |
| `ISSUE-035` | [Emails de permisos sin dedup por source_event_id](resolved/ISSUE-035-leave-emails-no-source-event-dedup.md)                                                      | production + staging           | 2026-04-09 | 2026-04-09 | Emails de leave no verificaban `email_deliveries` antes de enviar — sin segunda capa de dedup                            |
| `ISSUE-036` | [HR member profile queda stale tras cambio de supervisor en Jerarquía](resolved/ISSUE-036-hr-hierarchy-profile-reader-stale-reports-to.md) | staging | 2026-04-10 | 2026-04-10 | La ficha HR seguía leyendo `reports_to` desde BigQuery; ahora resuelve la línea vigente desde la jerarquía canónica en Postgres |
| `ISSUE-037` | [Historial de jerarquía pierde `effectiveTo` en líneas cerradas](resolved/ISSUE-037-hr-hierarchy-history-drops-effective-to.md) | staging | 2026-04-10 | 2026-04-10 | El mapper colapsaba timestamps `Date` a `null`; ahora normaliza `effective_from` y `effective_to` antes de serializar |
| `ISSUE-038` | [Organigrama y Jerarquía no reflejan departamento cuando solo se asigna responsable del área](resolved/ISSUE-038-org-chart-departments-head-vs-member-assignment-drift.md) | staging | 2026-04-10 | 2026-04-10 | `head_member_id` y `members.department_id` se habían desacoplado; el write lane ahora sincroniza ambos y el organigrama tiene fallback estructural |
| `ISSUE-039` | [Modal de “Cambiar supervisor” bloquea guardar sin validación visible](resolved/ISSUE-039-hr-hierarchy-change-supervisor-modal-silent-disabled-save.md) | staging | 2026-04-10 | 2026-04-10 | La UI bloqueaba el submit sin feedback; ahora muestra validación visible, estado `error` y alerta contextual |
| `ISSUE-040` | [Crear nueva delegación puede dejar al supervisor sin delegación activa](resolved/ISSUE-040-hierarchy-delegation-revoke-before-create.md) | staging + runtime general | 2026-04-10 | 2026-04-10 | El reemplazo revocaba antes de crear; ahora corre en una única transacción con rollback completo |
| `ISSUE-041` | [Reasignación masiva ignora la fecha efectiva al resolver reportes directos](resolved/ISSUE-041-hierarchy-bulk-reassign-ignores-effective-date-for-scope.md) | staging + runtime general | 2026-04-10 | 2026-04-10 | El bulk usaba el estado actual del request; ahora resuelve los direct reports con la fecha efectiva seleccionada |
| `ISSUE-042` | [Organigrama visual no representa la jerarquía estructural de departamentos](resolved/ISSUE-042-org-chart-uses-reporting-lines-instead-of-structural-hierarchy.md) | staging | 2026-04-10 | 2026-04-10 | El grafo usaba reporting lines como edges; ahora materializa `departments.parent_department_id` + adscripción de miembros |
| `ISSUE-043` | [Organigrama puede estar permitido por permisos pero oculto en el menú](resolved/ISSUE-043-org-chart-menu-hidden-for-supervisor-limited-access.md) | runtime general | 2026-04-10 | 2026-04-10 | La navegación lateral no seguía el mismo contrato que page/API; ahora comparte criterio supervisor-aware |
