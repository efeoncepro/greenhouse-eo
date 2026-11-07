# TASK-2096 — Cuentas operativas: autoridad y contexto por Space

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api|migration`
- Epic: `EPIC-057`
- Status real: `Code complete local 2026-11-06, rollout pendiente: 4 slices + señal en develop; laboratorio 243/243 en PG16, pnpm test y pnpm build verdes; migraciones sin aplicar a la base compartida`
- Rank: `2096`
- Domain: `identity|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees`

## Summary

Integrar contexto Organization/Space/Service por request con autoridad vigente en una ruta real y su reader. Una persona puede acceder a Diseño, SEO o ambos; selección y preferencia no conceden acceso.

## Why This Task Exists

La vista vigente `session_360` (migración TASK-987) produce una fila por Space activo del client y `identity-store.ts` toma `LIMIT 1` sin `ORDER BY`: con dos Spaces el Space de sesión es arbitrario. El laboratorio probó otra definición, la del script de setup, que ordena por `updated_at`. El listado de Insights conserva scope organizacional. Las memberships descriptivas no bastan como grants. En cookie, un usuario inactivo conserva sus claims anteriores sin límite; la sesión App sí lo rechaza.

## Goal

- Entregar U01 de EPIC-057 con un dueño: Identity / Spaces.
- Verificar frontera y fallos reales localmente antes de proponer apertura.
- Conservar cliente comercial, contratos e historia de Diseño.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- [ADR cuentas operativas](../../architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md): Accepted 2026-11-06, modelo B.
- [Modelo 360](../../architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md).
- [EPIC-057](../../epics/in-progress/EPIC-057-operational-accounts-under-organization.md): secuencia y gates.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- Baseline local de TASK-2094 ya ejecutado; no depende de su cierre integral posterior.
- [Evidencia local](../../audits/client-portal/2026-11-01-sky-finance-routing-validation/README.md); 204 pruebas, no certificación productiva.

### Blocks / Impacts

- Certificación integral local de TASK-2094 y gate de apertura SKY de TASK-1852.
- Dependencias por hito, consumidores y exclusiones en EPIC-057; no se exige cerrar todos sus EPICs.

### Files owned

- `src/lib/tenant/identity-store.ts`
- `src/lib/tenant/access.ts` (`getTenantAccessRecordByUserId`, `TenantAccessRecord.spaceId` y fallback BigQuery)
- `src/lib/auth.ts`
- `src/lib/entitlements/effective-reader.ts`
- `src/lib/api-platform/core/app-sessions.ts`
- Nueva migración de `greenhouse_serving.session_360` (por `pnpm migrate:create`); la vista vigente vive en `migrations/20260601194051024_task-987-session-route-groups-lifecycle-fix.sql`
- Esta spec; cambios futuros sólo dentro de la responsabilidad descrita, coordinados con dueños existentes.

## Current Repo State

### Already exists

- `src/lib/tenant/identity-store.ts`: `LIMIT 1` sin orden en las resoluciones por usuario, oid, Google y email.
- `src/lib/tenant/access.ts`
- `src/lib/auth.ts`: el refresh reaplica claims; con usuario inactivo sólo renueva la marca de tiempo.
- `src/lib/entitlements/effective-reader.ts`: hoy sólo lo consume autoridad interna.
- `src/lib/api-platform/core/app-sessions.ts`: rechaza usuario inactivo; no relee `space_id` en refresh.
- `src/lib/tenant/current-internal-subject.ts`: precedente de reader estricto independiente de la primera fila de `session_360`, a reutilizar.

### Consumidores que heredan el Space único (inventariar, no owned)

- `src/lib/api-platform/core/app-auth.ts`, `src/lib/sister-platforms/oauth-broker.ts`, `src/lib/sister-platforms/mcp-token-exchange.ts`, `src/lib/auth/magic-link.ts`.
- `src/lib/efeonce-insights/schedules/tick.ts` y `src/lib/efeonce-insights/delivery/store.ts`: revalidación de autoridad para recurrencia y entrega (TASK-1848 consume el contrato).

### Gap

La vista vigente `session_360` (migración TASK-987) produce una fila por Space activo del client y `identity-store.ts` toma `LIMIT 1` sin `ORDER BY`: con dos Spaces el Space de sesión es arbitrario. El laboratorio probó otra definición, la del script de setup, que ordena por `updated_at`. El listado de Insights conserva scope organizacional. Las memberships descriptivas no bastan como grants. En cookie, un usuario inactivo conserva sus claims anteriores sin límite; la sesión App sí lo rechaza.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/tenant/identity-store.ts` y consumers actuales nombrados arriba.
- Future candidate home: `remain-shared`
- Boundary: Resolver canónico de contexto autorizado, enumeración de Spaces permitidos y revalidación; schema/grants persistidos deben conciliarse con capabilities_registry y entitlements existentes, nunca copiar sky_experiment a runtime.
- Server/browser split: primitive server-only; contratos serializables sin DB/secretos en browser.
- Build impact: sin paquetes nuevos ni entrypoints globales previstos; medir cualquier import añadido al implementar.
- Extraction blocker: autoridad, transacción y contratos compartidos; no crear repos/apps/packages por anticipado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api|migration`
- Source of truth afectado: primitives actuales en Files owned; schema exacto se concilia antes de DDL.
- Consumidores afectados: rutas, API/MCP, workers y portal autorizados según matriz del EPIC.
- Runtime target: `local`; preparación para rollout posterior gobernado por TASK-1852.

### Contract surface

- Contrato existente a respetar: ADR y primitives en Files owned.
- Contrato nuevo o modificado: Resolver canónico de contexto autorizado, enumeración de Spaces permitidos y revalidación; schema/grants persistidos deben conciliarse con capabilities_registry y entitlements existentes, nunca copiar sky_experiment a runtime.
- Backward compatibility: gated; preservar recorridos de un Space y denegar ambigüedad.
- Full API parity: reader/command canónico compartido por adapters; capability, grant y coverage en el mismo PR si cambia autoridad.

### Data model and invariants

- Entidades/tablas/views afectadas: Organization/Space/Service y datos del dominio en los stores actuales; no se aprueba schema por este plan.
- Invariantes: un owner comercial; ningún dato histórico movido, duplicado o reinterpretado silenciosamente.
- Write-target allowlist: comprobar boundary test del dominio; declarar cada tabla nueva con justificación en el mismo PR, si se requiere DDL.
- Tenant/space boundary: principal vigente + capacidad + vínculo recurso/Space/Service; contexto enviado sólo restringe.
- Idempotency/concurrency: versiones esperadas, transacción/locks proporcionales; retry y carrera adversarial antes de declarar completo.
- Audit/outbox/history: eventos existentes con actor, motivo, contexto, correlación y resultado; preservar snapshots sellados.

### Migration, backfill and rollout

- Migration posture: preferir aditivo si se requiere schema; plan SQL y reversa revisados antes de ejecución aislada.
- Default state: sin activar capacidad nueva ni escribir cuentas compartidas durante el laboratorio.
- Backfill plan: ninguno sobre datos reales; cualquier reclasificación futura requiere plan separado con evidencia/versiones.
- Rollback path: revertir código local y retirar sólo fixtures propias; compensaciones verificadas antes de abrir.
- External coordination: aprobación ADR y release/habilitación posteriores; credenciales/providers no necesarios para registrar.

### Security and access

- Auth/access gate: sesión/principal fresco, capability/entitlement fino y grant/vínculo operativo vigente.
- Sensitive data posture: datos sintéticos, sin secretos ni payloads de clientes en evidencia versionada.
- Error contract: errores canónicos sanitizados; conflicto/denegación/unresolved no equivalen a cero ni fallback global.
- Abuse/rate-limit posture: límites de batch, replay y cuotas existentes; negativas y agotamiento ensayados según superficie.

### Runtime evidence

- Local checks: tests de comportamiento/imports reales y lint/types focales de los cambios que se implementen.
- DB/runtime checks: PostgreSQL efímero, schema relevante real, rollback/fallos y control de otra organización.
- Integration checks: contratos de puertos explícitos; simulación no certifica provider ni motor externo.
- Reliability signals/logs: extender registro/señales del dueño con contexto, sin inventar nombres productivos en el plan.
- Production verification sequence: sólo en gate TASK-1852 con aprobación concreta; este registro no ejecuta producción.

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

### Slice 1 — Contrato y primitive

- Definir principal, grant por Space/verbo, Service binding y errores canónicos; conservar login/emisor existentes y caso de un Space.

### Slice 2 — Integración y evidencia

- Integrar ruta/reader reales locales y renovar/revocar sesiones con invalidación de caché y autoridad fresca por request.
- Transferir evidencia y pendientes al EPIC y TASK-2094 sin afirmar apertura real.

## Out of Scope

- No crea emisor, login, UI de selector ni authority MCP paralelos; TASK-1631 conserva binding externo y TASK-1854 consume la enumeración.
- Producción, backfills reales, envíos, compras, push/deploy y cambios en la historia de Diseño bajo la autorización actual.

## Detailed Spec

Implementar el contrato de esta task en su dueño existente. El ADR aceptó el modelo B el 2026-11-06; esa
aceptación no autoriza migrations, filas reales ni apertura. Los casos negativos de TASK-2094 son regresiones a resolver,
no comportamiento válido que deba conservarse. Consumidores externos conservan sus tasks y sus criterios.

## Rollout Plan & Risk Matrix

Registro repo-only; no production runtime impact en esta sesión. La implementación futura exige gates proporcionales.

### Slice ordering hard rule

Contratos upstream → Slice 1 → Slice 2 → certificación TASK-2094 → apertura explícita por TASK-1852.
La preparación de operaciones precede al canary; su observación real es posterior, sin esperar cierre total circular.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Mezcla o ampliación de acceso | Identity/datos | high | contexto explícito y pruebas negativas | denegación/conflicto correlacionado |
| Reasignación de historia | Sync/Finance/ICO | high | versiones, control histórico y rollback probado | diferencia de IDs/hash o residual |

### Feature flags / cutover

No se inventa un nombre de flag ni se activa ninguno. Seleccionar el gate en el plan de implementación;
capacidad multi-Space permanece cerrada hasta demostrar compatibilidad de consumers y writers.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | Retirar cambio local y fixtures propias | Medir al implementar | sí, local |
| 2 | Pausar carril nuevo, preservar writers compatibles y audit | Medir y ensayar antes de habilitar | depende del efecto; nunca borrar historia |

### Production verification sequence

Piso de código compatible → plan de alta revisable → aprobación específica → canary por capacidad/persona →
readback de Diseño/SEO/control → observación/reconciliación. Sólo TASK-1852 coordina esa habilitación.

### Out-of-band coordination required

Ninguna para documentación o fixtures. Integraciones/providers/operadores requieren coordinación en su gate posterior.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Diseño/SEO/dual/sin relación y otra organización pasan una matriz HTTP real local de listas y detalle, sin unión implícita de módulos. Evidencia: `space-authority.local-spec.ts` (rutas App reales `/spaces`, `/spaces/{id}/services`, `/services/{id}`); recurso = Services, no Insights (el vínculo informe→Space es TASK-1960).
- [ ] Revocación de SEO conserva Diseño del dual; usuario inactivo, sesión renovada, refresh concurrente y revocación durante write tienen resultado explícito sin claims antiguos autorizantes. Verificado todo salvo «revocación durante write»: el contrato todavía no tiene un write por Space; su primer consumidor llega con TASK-2097/2099.
- [x] Dos pestañas con contextos distintos no se redirigen por una preferencia global; cambiar updated_at de Space no cambia el contexto efectivo. Evidencia: casos «two tabs» y «updated_at» del spec nuevo; `bridge-postgres` y `permissions-context` reescritos.
- [ ] Source of truth, API/command y consumidores conciliados con código/schema real; capability + grant + prueba de paridad cuando corresponda. Pendiente: el command HTTP de grants (TASK-2099) y la migración de los ~50 consumidores de `spaceId` de sesión (TASK-2100). La autoridad por Space no es capability, así que no hay grant en `runtime.ts`.
- [x] Invariantes, frontera tenant/Space, concurrencia e idempotencia verificadas con negativos y control externo. Evidencia: grant concurrente deja una fila activa, versión vieja rechazada, revocación idempotente, CHECKs de tabla, org de control.
- [x] DDL/destinos permitidos, backfill y rollback explícitos; errores sanitizados, audit y señales del dueño comprobados. Evidencia: DDL con CHECKs, sin backfill, rollback, errores App sanitizados, evento de auditoría en la misma transacción y señal `identity.operational_space.ungranted_user` probada contra PG16 (cuenta 1 → ok tras otorgar).
- [x] Evidencia runtime local separa componentes reales de mocks; no acredita producción ni historia real por inferencia. Evidencia: cabecera de mocks del spec nuevo (sólo transporte outbox, audit de login y metadata UI); historia de Diseño sin cambios por digest.
- [x] Con dos Spaces activos del mismo client, la resolución de sesión es determinista y no elige por orden de filas: login, refresh y App devuelven el contexto autorizado o un estado explícito de selección pendiente. Evidencia: migración `20261106230331669` + `spaceSelectionRequired` en token/sesión/App; salida idéntica a la vista viva para 116 usuarios (READ ONLY).
- [x] La matriz local carga `session_360` desde la migración vigente, no desde `scripts/setup-postgres-identity-v2.sql`. Evidencia: `run-local.mjs` aplica la sección Up de las migraciones TASK-2096.
- [x] Un usuario desactivado pierde sus claims autorizantes en el siguiente refresh de cookie; el caso queda probado junto al de sesión App. Evidencia: `session-access-revocation.test.ts` y casos del laboratorio (incluido refresh concurrente); magic link y firmador interno también revisan (H2b).

## Verification

- `pnpm task:lint --task TASK-2096`
- Lint/types/tests focales y DB/integración de Slice 2 durante implementación; no se ejecutan por registrar el plan.
- Comparar antes/después de fixtures Diseño, SEO y control y documentar cualquier limitación pendiente.

## Closing Protocol

- [ ] Lifecycle/carpeta/registry/README y Status real reflejan evidencia.
- [ ] Acceptance criteria tildados sólo con prueba vinculada; dependencias downstream y EPIC al día.
- [ ] Handoff, manual/arquitectura del dueño y gates documentales actualizados.
- [ ] Ningún rollout o modificación histórica se infiere del cierre local.

## Follow-ups

No crea emisor, login, UI de selector ni authority MCP paralelos; TASK-1631 conserva binding externo y TASK-1854 consume la enumeración.

## Implementación 2026-11-06 — code complete local, rollout pendiente

Plan y auditoría: [TASK-2096-plan.md](../plans/TASK-2096-plan.md). Cuatro slices en `develop`, sin push:

- **Slice 1 (H2, H2b):** `SessionAccessRevokedError` en el refresh; magic link y firmador interno revisan
  `active`/`status`. Una falla de lectura conserva el comportamiento previo: el callback lanza (fail-closed).
- **Slice 2 (H1):** migración `20261106230331669` (una fila por usuario, `space_selection_required`);
  `identity-store.ts` pide dos filas y lanza `IdentitySessionAmbiguousError`. Medido en READ ONLY: 0 emails/OID/sub
  ambiguos y salida idéntica a la vista viva.
- **Slice 3:** tabla `greenhouse_core.space_access_grants` (migración `20261106230745107`), resolver, enumeración,
  revalidación y store versionado con evento `identity.space_access.*`.
- **Slice 4:** rutas App `/spaces`, `/spaces/{spaceId}/services`, `/spaces/{spaceId}/services/{serviceId}`.
  Desvío del plan: el consumidor es Services, que tiene `space_id` propio; Insights espera TASK-1960.

Señal `identity.operational_space.ungranted_user` agregada. `pnpm build` verde (125 s, pico ~5,2 GB) tras corregir dos errores
de tipos ajenos que rompían el build de `develop` (`scripts/ga4/query.ts`, `gemini-omni-cli.test.ts`).
Pendiente para cerrar: aplicar las dos migraciones a la base compartida, release del código a producción y revocación
durante un write (primer write por Space, TASK-2097/2099). Intento de aplicación 2026-11-06 autorizado por el operador:
bloqueado porque la migración previa de TASK-1833 falla con `ops` (`permission denied to create role`); se revirtió sin
cambios (`session_360` con la misma huella, 116 filas). Detalle y desbloqueo en TASK-1833.
`pnpm test` completo en `ae0881e4be`: 2150 archivos, 21 842 tests, 0 fallas.
Manual de uso: no aplica todavía; nadie puede otorgar Spaces sin el command de TASK-2099 (dueño: EPIC-057).

## Delta 2026-11-06 — Revisión contra código

[Revisión del programa](../../audits/client-portal/2026-11-06-operational-accounts-code-review/README.md), hallazgos
H1 y H2: Gap, archivos y criterios corregidos. El contrato no cambia; el defecto vigente es más grave que el descrito.
