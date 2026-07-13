# TASK-1408 — GCP local credential env hygiene for pg:doctor

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|ops|data`
- Blocked by: `none`
- Branch: `task/TASK-1408-gcp-local-credential-env-hygiene`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Endurecer el diagnostico local de credenciales GCP para que `pnpm pg:doctor` no quede ambiguamente roto cuando
`.env.local` contiene un `GOOGLE_APPLICATION_CREDENTIALS_JSON` legacy malformado. El objetivo es clasificar el
fallo como contaminacion de entorno local, permitir un camino ADC explicito para tooling local y mantener
fail-closed los usos reales de service account key.

## Why This Task Exists

Durante el preflight de `TASK-1365`, `scripts/gcloud-auth-preflight.sh` confirmo que `gcloud` CLI y ADC estaban
vigentes para `efeonce-group`, pero `pnpm pg:doctor` fallo antes de conectar a Cloud SQL:

- `.env.local` define `GOOGLE_APPLICATION_CREDENTIALS_JSON`, pero el valor no es JSON parseable.
- `scripts/lib/load-greenhouse-tool-env.ts` carga `.env.local` antes de `.env.production.local` y no pisa keys ya
  presentes.
- `src/lib/google-credentials.ts` trata cualquier service account key presente como configuracion explicita y
  lanza `Invalid Google Cloud credentials environment variable` si no la puede parsear.
- Forzar solo el proceso con `GOOGLE_APPLICATION_CREDENTIALS_JSON=` y `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64=`
  hizo que `pnpm pg:doctor` pasara, confirmando que GCP/ADC/Postgres estaban sanos y que el bloqueo era env local.

Este fallo es operativo: puede bloquear tareas DB no relacionadas, hacer que agentes documenten falso drift de
Postgres y empujar a tocar credenciales sin necesidad. La remediacion debe ser segura: diagnosticar sin exponer
secretos y no debilitar la postura WIF/service account de runtime.

## Goal

- Clasificar de forma redacted la contaminacion local de `GOOGLE_APPLICATION_CREDENTIALS_JSON` y
  `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64`.
- Hacer que el modo local ADC explicito sea realmente usable por tooling (`pg:doctor`/diagnosticos) cuando
  `GCP_PROJECT` existe, sin intentar parsear una key legacy malformada.
- Mantener fail-closed el modo `service_account_key` y cualquier runtime que dependa explicitamente de una key.
- Documentar el runbook local canonico: detectar, no imprimir, remover/corregir la variable local o ejecutar el
  smoke con env vacio/ADC cuando el objetivo es probar DB, no auditar la key.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- No imprimir, commitear ni hashear valores secretos o service account payloads.
- Local/CLI puede usar ADC; runtime Vercel debe seguir prefiriendo WIF cuando este configurado y ejecuta en
  runtime real.
- Una key legacy malformada debe seguir fallando cuando el modo requerido es `service_account_key`; no se puede
  ignorar silenciosamente una credencial explicita en ese carril.
- `pg:doctor` debe verificar el perfil Postgres pretendido y no inventar bypasses de Cloud SQL Connector.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/google-credentials.ts`
- `src/lib/google-credentials.test.ts`
- `scripts/gcp-auth-doctor.ts`
- `scripts/gcloud-auth-preflight.sh`
- `scripts/pg-doctor.ts`
- `scripts/lib/load-greenhouse-tool-env.ts`
- `scripts/lib/load-greenhouse-tool-env.test.ts`
- `package.json` script `pg:doctor`

### Blocks / Impacts

- Reduce falsos bloqueos en cualquier task que requiera `pnpm pg:doctor`.
- Impacta solo tooling/local diagnostics y el resolver GCP canonico; no debe mutar Vercel env, GCP Secret Manager,
  Cloud SQL, roles IAM ni passwords Postgres.

### Files owned

- `src/lib/google-credentials.ts`
- `src/lib/google-credentials.test.ts`
- `scripts/gcp-auth-doctor.ts`
- `scripts/gcloud-auth-preflight.sh`
- `scripts/pg-doctor.ts`
- `scripts/lib/load-greenhouse-tool-env.ts`
- `scripts/lib/load-greenhouse-tool-env.test.ts`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `scripts/gcloud-auth-preflight.sh` valida los dos planos locales: `gcloud auth print-access-token` y
  `gcloud auth application-default print-access-token`.
- `scripts/pg-doctor.ts` usa `createGoogleAuth()` para Cloud SQL Connector cuando
  `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` existe.
- `scripts/gcp-auth-doctor.ts` ya emite diagnosticos redacted sobre Vercel OIDC persistido y fuente de auth.
- `src/lib/google-credentials.test.ts` ya cubre WIF, service account key, `ambient_adc`, preferencia explicita y
  legacy env malformado en runtime Vercel.

### Gap

- `getGoogleAuthOptions({ env, scopes })` vuelve a llamar `getServiceAccountKeyCredentials(env)` despues de
  calcular la fuente; por eso una preferencia local `ambient_adc` no evita necesariamente el parse de una key
  legacy malformada.
- `scripts/gcp-auth-doctor.ts` reporta el error generico de diagnostics, pero no identifica de forma accionable
  que el bloqueo viene de `GOOGLE_APPLICATION_CREDENTIALS_JSON` malformado en un env file local.
- `pg:doctor` mezcla dos verdades en su salida: GCP CLI/ADC sano y Node credential resolver roto por env legacy.
  El operador necesita un veredicto claro para no tocar credenciales ni Secret Manager innecesariamente.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/google-credentials.ts` y `scripts/**` dentro del runtime actual del repo
- Future candidate home: `remain-shared`
- Boundary: resolver canonico GCP (`createGoogleAuth`/diagnostics) y scripts locales que lo consumen
- Server/browser split: server/tooling only; nada de estas credenciales o diagnosticos se importa desde browser
- Build impact: `none`
- Extraction blocker: `none`; el cambio es local/tooling y sigue valido si EPIC-026 rechaza extraction

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `src/lib/google-credentials.ts`
- Consumidores afectados: `pg:doctor`, `gcp:doctor`, Cloud SQL Connector local, scripts con Google SDK
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `src/lib/google-credentials.ts`, `scripts/gcp-auth-doctor.ts`,
  `scripts/pg-doctor.ts`
- Contrato nuevo o modificado: diagnostico redacted de credencial legacy malformada y modo local ADC explicito
- Backward compatibility: `compatible`
- Full API parity: `N/A - no product capability; tooling local y resolver GCP compartido`

### Data model and invariants

- Entidades/tablas/views afectadas: `none`
- Invariantes que no se pueden romper:
  - WIF sigue ganando en runtime Vercel real cuando esta configurado.
  - `service_account_key` explicito sigue fallando si la key no es parseable.
  - `ambient_adc` local con `GCP_PROJECT` no requiere parsear una key legacy presente por accidente.
  - Ningun diagnostico expone payload, email de service account, private key, token, hash reversible ni longitud
    innecesaria del secreto.
- Tenant/space boundary: `N/A - tooling local sin acceso tenant-specific`
- Idempotency/concurrency: `N/A - diagnosticos read-only`
- Audit/outbox/history: `none - no runtime business event`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale - mejora diagnostico local sin flags`
- Backfill plan: `N/A`
- Rollback path: `revert PR; no data state touched`
- External coordination: `no rotation por defecto; si se decide corregir una service account key real, abrir paso
  separado con greenhouse-secret-hygiene y aprobacion explicita`

### Security and access

- Auth/access gate: `gcloud CLI + ADC local o service account key explicita; Cloud SQL Connector mantiene permisos GCP`
- Sensitive data posture: `secrets present in env; never print values`
- Error contract: `errores redacted con causa y remediation canonica; no raw JSON parse context con payload`
- Abuse/rate-limit posture: `N/A - local diagnostics`

### Runtime evidence

- Local checks: `pnpm test src/lib/google-credentials.test.ts scripts/lib/load-greenhouse-tool-env.test.ts`,
  `pnpm gcp:doctor`, `pnpm pg:doctor`
- DB/runtime checks: `pnpm pg:doctor` con credencial legacy ausente/vacia y ADC vigente
- Integration checks: `bash scripts/gcloud-auth-preflight.sh`, Cloud SQL Connector path de `pg:doctor`
- Reliability signals/logs: `N/A - local tooling; documentar salida redacted en Handoff`
- Production verification sequence: `N/A - no production runtime change expected; if resolver behavior changes shared runtime, verify staging health before prod`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Hybrid Execution Justification

Omitido: `UI impact: none` y no hay superficie visible.

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

### Slice 1 — Repro harness and tests

- Agregar tests focales que reproduzcan el caso:
  - `GCP_PROJECT` presente.
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON` presente pero malformado.
  - preferencia local `ambient_adc`.
  - expectativa: el carril ADC no intenta parsear la key legacy.
- Agregar test negativo para `GCP_AUTH_PREFERENCE=service_account_key`: la misma key malformada debe seguir
  fallando fail-closed.
- Agregar test para diagnostics redacted que confirme que el error no contiene payload ni fragmentos del secreto.

### Slice 2 — Tooling diagnostic and resolver behavior

- Ajustar `src/lib/google-credentials.ts` para que la preferencia `ambient_adc` realmente evite el parse de
  service account key legacy cuando `GCP_PROJECT`/`GOOGLE_CLOUD_PROJECT` esta disponible.
- Mantener el comportamiento actual de WIF en runtime Vercel y de `service_account_key` explicito.
- Extender `scripts/gcp-auth-doctor.ts` o el preflight de `pg:doctor` para reportar:
  - env file local que contiene la key contaminada, sin valor;
  - si CLI/ADC estan sanos;
  - remediation canonica: quitar/corregir la variable local o ejecutar smoke DB con las vars vacias si el objetivo
    es validar ADC/Postgres.

### Slice 3 — Docs and closure

- Actualizar el runbook local-first y la postura Cloud/Postgres con el aprendizaje:
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON` es fallback legacy/transicional;
  - en local, ADC puede ser el camino correcto;
  - una key legacy malformada en `.env.local` no implica fallo de Cloud SQL ni de ADC.
- Documentar evidencia final en `Handoff.md` sin secretos.
- Actualizar `changelog.md` solo si cambia comportamiento de tooling visible para agentes.

## Out of Scope

- Rotar service account keys o passwords Postgres.
- Editar, commitear o imprimir `.env.local`.
- Cambiar env vars de Vercel, Secret Manager, IAM, Cloud SQL o WIF.
- Cambiar contratos de runtime de produccion salvo que los tests demuestren que el fix compartido lo requiere.
- Introducir un nuevo cliente GCP paralelo al resolver canonico.

## Detailed Spec

### Root-cause record

La evidencia que origina esta task:

1. `bash scripts/gcloud-auth-preflight.sh` reporto CLI y ADC vigentes.
2. `pnpm pg:doctor` fallo con `Unable to parse GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable`.
3. Inspeccion redacted de env local confirmo:
   - `.env.local` tiene `GOOGLE_APPLICATION_CREDENTIALS_JSON` presente y no parseable.
   - `.env.production.local` tiene una version parseable, pero no se usa porque `.env.local` gana por orden.
   - el shell no tenia esa variable exportada.
4. `GOOGLE_APPLICATION_CREDENTIALS_JSON= GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64= pnpm pg:doctor` paso.

### Expected policy after fix

- Auto mode:
  - WIF real en Vercel sigue tomando prioridad.
  - Una service account key presente y malformada en un runtime que la necesita sigue fallando.
  - El diagnostico debe decir que la key legacy esta malformada y que ADC no fue el problema si ADC paso.
- Explicit `ambient_adc` mode:
  - Con project id explicito, no parsea service account key legacy.
  - Sin project id explicito, falla con remediation segura: definir `GCP_PROJECT`/`GOOGLE_CLOUD_PROJECT` o limpiar la key.
- Explicit `service_account_key` mode:
  - Falla si la key esta malformada.
  - No cae a ADC silenciosamente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tests/repro) -> Slice 2 (resolver/tooling) -> Slice 3 (docs/closure).
- No tocar docs de cierre como evidencia final hasta que el repro y `pg:doctor` hayan sido verificados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ignorar una key malformada donde era requerida | GCP auth | medium | Solo saltar parse en preferencia `ambient_adc`; test fail-closed para `service_account_key` | tests focales fallan |
| Romper WIF de Vercel por cambio compartido | Vercel/GCP | low | Mantener tests actuales de WIF y, si el diff toca seleccion de fuente, smoke staging health | `/api/internal/health` staging |
| Exponer secretos en diagnostics | Security | low | Reportar presencia/campo/source file, nunca valor ni payload | grep/log review manual |
| Confundir fallo DB con fallo env | Postgres tooling | medium | Mensaje `pg:doctor` separa preflight GCP, resolver Node y conexion DB | salida redacted del comando |

### Feature flags / cutover

Sin flag: cambio de tooling local y resolver canonico con compatibilidad preservada por tests. Si durante
ejecucion se identifica impacto runtime no trivial, convertir el cambio a gated o separar task.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir tests/repro si el scope se redefine antes de tocar runtime | <5 min | si |
| Slice 2 | Revertir PR; comportamiento previo vuelve intacto | <10 min | si |
| Slice 3 | Revertir docs o corregir nota de runbook | <5 min | si |

### Production verification sequence

Secuencia repo-only/local. Esta task no aplica migraciones, no cambia env vars remotas y no requiere cutover
productivo mientras el diff se mantenga limitado a tooling local y tests. Si `src/lib/google-credentials.ts`
cambia de forma que pueda afectar runtime, el cierre debe agregar smoke de staging antes de cualquier production
release:

1. `pnpm test src/lib/google-credentials.test.ts scripts/lib/load-greenhouse-tool-env.test.ts`.
2. `pnpm gcp:doctor` en local.
3. `pnpm pg:doctor` en local con ADC vigente.
4. Staging `/api/internal/health` solo si el diff afecta seleccion WIF/service account en runtime.

### Out-of-band coordination required

No requiere coordinacion externa para implementar. La limpieza de `.env.local` es accion local no versionada y
no forma parte del PR. Cualquier rotacion/correccion de key real debe tratarse como trabajo separado con
`greenhouse-secret-hygiene`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `getGoogleAuthOptions`/`getGoogleCredentialSource` tienen cobertura que demuestra que `ambient_adc` local no
      intenta parsear una key legacy malformada cuando hay project id explicito.
- [ ] `service_account_key` explicito sigue fallando con key malformada y no cae a ADC silenciosamente.
- [ ] `gcp:doctor` o `pg:doctor` reporta la contaminacion de env local con mensaje redacted y remediation
      accionable.
- [ ] `pnpm pg:doctor` pasa con ADC vigente cuando las vars legacy se limpian/vacian para el proceso.
- [ ] Ningun log, test snapshot, doc o mensaje de error contiene payloads de service account key, private key,
      tokens o secretos.
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Verification

- `pnpm test src/lib/google-credentials.test.ts scripts/lib/load-greenhouse-tool-env.test.ts`
- `pnpm gcp:doctor`
- `pnpm pg:doctor`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm task:lint --task TASK-1408`
- `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` y
      `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` quedaron consistentes con el comportamiento final

## Follow-ups

- Crear ISSUE separado solo si se confirma que el source de la key legacy malformada viene de una credencial
  compartida o de un secreto publicado, no de un archivo local aislado.
- Si varios scripts repiten diagnosticos GCP divergentes, considerar una task posterior para unificar
  `gcp:doctor`, `pg:doctor` y preflights de Secret Manager.

## Delta 2026-07-13

Task creada desde investigacion local del fallo de `pg:doctor` reportado durante preflight de `TASK-1365`.

## Open Questions

- Debe `pg:doctor` setear `GCP_AUTH_PREFERENCE=ambient_adc` automaticamente cuando el contexto es local y
  `gcloud-auth-preflight` paso, o basta con mejorar el diagnostico y documentar el override seguro?
