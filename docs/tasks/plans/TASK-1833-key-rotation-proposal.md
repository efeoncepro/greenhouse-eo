# TASK-1833 — Propuesta de rotación aislada de llaves

- Status: `Accepted for local implementation` (Julio, 2026-10-29); rollout cloud pendiente
- Date: `2026-10-25`
- Owner: `Platform / Identity`; coordinación de release: agente raíz
- Scope: command de mantenimiento, registry Auth, Cloud Run Job y sus identidades; sin ampliar `ops-worker`
- Reversibility: `two-way-but-slow`; detener el Job es reversible, una activación exige respetar tokens/cachés
- Confidence: `medium`; candidato de código/schema local, sin ensayo cloud
- Validated as of: `2026-10-29` para candidato local; infraestructura no creada
- Task: [TASK-1833](../in-progress/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md)
- Plan general: [TASK-1833-plan](TASK-1833-plan.md)

## Corte de implementación local 2026-10-29

La elección del Job aislado está aceptada **sólo para implementación local**.
`codex/auth-pr-develop-stack` contiene candidato de command durable, migración,
CLI y Job: PostgreSQL desechable 4/4, pruebas focales 44/44 y gates de código
PASS. [Recibo](../../audits/auth-server/2026-10-29-key-rotation-job-local.md).
El Job nace OFF/dry-run ON; Scheduler, IAM, migración y ensayo KMS cloud no
están aplicados. La automatización llega a llave nueva verificada; retiro,
disable y destroy siguen manuales. Los apartados de discovery de abajo
describen el estado anterior al candidato cuando así se indica.

## Decisión adoptada para implementación local

Crear un **Cloud Run Job dedicado `auth-key-maintenance`**, con service account propia, que ejecute el
command de rotación y conciliación de llaves. No añadir permisos KMS, rutas ni dispatch a `ops-worker`,
`greenhouse-portal@` o al issuer público. Conservar `greenhouse_auth.signing_keys` como autoridad de emisión,
`signing_key_events` como historial y Cloud KMS como único dueño de la llave privada.

Un único Scheduler diario despierta el Job; el command sólo inicia rotación cuando la última operación
verificada tiene **90 días**, satisfaciendo el piso vigente de **más de 80 días**. La frecuencia diaria
permite recuperar operaciones y revisar retiros, sin crear una versión cada día. Es una modificación explícita
del wording actual «scheduler trimestral»: la **rotación** es aproximadamente trimestral; la conciliación es
diaria. Esta decisión reemplaza el carril histórico Scheduler trimestral →
`ops-worker`, sin activar Scheduler ni autorizar rotación cloud.

Job con una tarea, paralelismo 1, timeout inicial propuesto de 5 minutos y reintentos automáticos de tarea 0.
La exclusión real reside en PostgreSQL, porque varias ejecuciones del Job aún pueden coincidir. El tick posterior
recupera fases seguras; un resultado incierto de creación exige reconciliación y nunca provoca otra creación.

Nace con `AUTH_KEY_MAINTENANCE_ENABLED=false`, `AUTH_KEY_MAINTENANCE_DRY_RUN=true` y Scheduler PAUSED.
No agrega endpoint HTTP, dominio, load balancer, WAF, cookie ni sesión. Es un deployable batch de administración
con frontera de privilegios propia, no un segundo issuer.

## Evidencia y problema actual

- [CLI actual](../../../scripts/auth-server/rotate-signing-key.ts): carga entorno/perfil PG; `--status` retorna
  antes de crear cliente KMS. Creación KMS precede al registro PG; no hay operación durable de creación.
- [Registry](../../../src/lib/auth-server/keys/signing-keys-store.ts): registro idempotente por versión/kid,
  índice de una sola active, eventos append-only, retiring/retired y solapamiento mínimo de una hora.
  Register usa advisory lock; retire usa lock de fila. Register lee la pública antes de activar, sin probar
  una firma en ese paso. `signCompactJws` sí verifica cada firma que devuelve.
- [Job existente de referencia](../../../src/lib/render-dispatch/job-runner.ts): invoca Jobs API sin overrides;
  el proceso decide su trabajo. Es un patrón reutilizable, no permiso para reutilizar su runtime/SA.
- [Ops worker](../../../services/ops-worker/deploy.sh): usa `greenhouse-portal@`; su auth de aplicación confía
  en Cloud Run IAM. Ampliar esa SA para crear versiones de la llave Auth aumenta el alcance compartido.
- [Readyz](../../../services/auth-server/app.ts): verifica PG, active y lectura de pública KMS. **No prueba
  una firma bajo la identidad del issuer**. Un200 no sustituye el canary real tras la primera activación.
- Readback previo del coordinador25Oct: scheduler de rotación no encontrado; dos kids publicados. No se
  repitió lectura cloud para este documento y no se infiere elegibilidad de retiro sólo desde JWKS.

## ADR y nuevo deployable formal

**Sí exige un nuevo deployable/control plane registrado.** El ADR nativo autorizó `auth-server`;
la decisión de Julio del 29-10 acepta esta frontera Job aislado para implementación local.

La decisión acotada vive en el [ADR nativo](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)
y la excepción de build unit correspondiente en
[decomposición](../../architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md), enlazadas desde el índice.
Aplican el [modelo ADR](../../operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md),
[placement modular](../../operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md) y
[contrato de build workers](../../architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md).

La decisión debe registrar cuatro evidencias: **costo, routing/auth, rollback y runtime ownership**.
Costo aún no medido: contar ejecuciones diarias/cold starts, CPU/memoria, logs, imagen y versiones HSM durante
solapamiento. Sin precio inventado ni gasto cero asumido. No hay instancia permanente ni front door nuevo.
Dueño Platform/Identity para command/IAM y Ops para build, scheduler, señales y recuperación.

Julio aceptó el Job aislado el 29-10 para el candidato local. Esta aprobación
no levanta la retención del release ni acredita permisos efectivos, costo,
migración aplicada o ensayo cloud. Antes de provisionar, conciliar costo,
IAM, recuperación y ownership según el ADR; el Scheduler sigue sin activar.

## Identidades y recursos cerrados

Nombres propuestos, sujetos al inventario del proyecto antes del apply:

| Identidad | Autoridad propuesta | Exclusiones |
|---|---|---|
| `auth-key-maintenance@efeonce-group` | SA runtime del Job; KMS sobre la llave exacta; Cloud SQL y login PG dedicado; acceso sólo a su secreto PG si hace falta | Sin acceso a correo, HubSpot, sesiones/personas, secretos de consumers, IAM admin o deploy |
| `auth-key-scheduler@efeonce-group` | Único invocador automático; `roles/run.invoker` sólo sobre el Job | Sin KMS/SQL, sin `run.jobs.runWithOverrides`, sin modificar imagen/env/SA |
| Deployer gobernado | Build/deploy del Job y `actAs` limitado a su runtime SA; ejecución de pruebas sólo por carril auditado | No uso de SA portal para administrar llaves; no grants de runtime a nivel proyecto |

Llave allowlisted e inmutable por configuración desplegada:
`projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256`.
Validar que toda versión pertenece exactamente a ella; argumentos/env de una ejecución no pueden elegir otra.

Rol KMS custom **binding sólo en esa CryptoKey**: `cloudkms.cryptoKeys.get`,
`cloudkms.cryptoKeyVersions.list`, `cloudkms.cryptoKeyVersions.get`, `cloudkms.cryptoKeyVersions.create`,
`cloudkms.cryptoKeyVersions.viewPublicKey`, `cloudkms.cryptoKeyVersions.useToSign` y
`cloudkms.cryptoKeyVersions.update` si se habilita disable. No conceder `cloudkms.admin`,
destroy, restore, IAM policy ni export. El permiso update es más amplio que «sólo disable»: el adapter sólo
acepta `ENABLED→DISABLED` para una versión retirada por una operación verificada; documentar ese límite IAM.
La lista exacta se valida en el preflight IAM antes de aplicar, sin grants exploratorios amplios.

Principal scheduler separado de runtime. Invoca `POST .../jobs/auth-key-maintenance:run` con cuerpo vacío,
**OAuth para Google APIs**, sin overrides; el Job selecciona el trabajo del ledger. No copiar el helper OIDC
para endpoints de `ops-worker`. Google documenta esta invocación y el rol Invoker no incluye overrides:
[Scheduler→Jobs](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule),
[roles Cloud Run](https://docs.cloud.google.com/run/docs/reference/iam/roles).
Un operador de emergencia puede recibir invocación temporal/auditada; no es un segundo caller permanente.

PG: usar los helpers canónicos, sin un Pool paralelo. Login/rol dedicado sin herencia de `greenhouse_app`:
SELECT del registry y DML mínimo del ledger/eventos necesarios, o funciones narrow ownership si exige el modelo
PG. Sin permisos sobre sesiones/tokens/OTP/personas ni DELETE de audit. Readback efectivo de grants es gate.

## Contrato durable e idempotencia

Nueva tabla propuesta `greenhouse_auth.signing_key_rotation_operations` y eventos de operación append-only.
Hace falta porque `signing_key_events.kid` es FK a un registro que todavía no existe al iniciar creación.
Actualizar TASK-1833: sus actuales «sin tablas»/«migration none» ya no describirían este diseño.

Campos mínimos: operation_id, key_name, predecessor_kid, phase, kms_version nullable, candidate_kid nullable,
created_at, updated_at, lease_owner, lease_until, fencing_version, verified_at, overlap_not_before,
retired_at, disabled_at y código de error saneado. No almacenar JWTs, credenciales, cookies ni material privado.
Unique `(key_name, predecessor_kid)` y como máximo una operación no terminal por llave. El período se deriva
de la operación verificada anterior; no del execution ID del Scheduler ni de entradas del caller.

| Fase | Acción / regla de recuperación |
|---|---|
| `planned` | Confirmar exactamente una active, sin operación abierta, sin divergencia registry/KMS, edad elegible. Persistir intento y snapshot de la active |
| `creating` | Persistir la intención **antes** del RPC; una única llamada create sin retry automático de creación |
| `create_uncertain` | Timeout/desconexión/crash sin versión persistida: bloquear toda creación posterior; inventariar metadata/audit y vincular una versión inequívoca mediante recuperación auditada. Nunca elegir «la última» por heurística |
| `version_created` | Guardar nombre exacto. Si está PENDING, sondear con plazo acotado y continuar esa misma versión en otra ejecución |
| `preverified` | Leer pública, comprobar ES256/P-256 y pertenencia; firmar prueba sintética, verificarla con la pública. Persistir sólo metadata/digest, nunca el JWS |
| `activated` | Bajo lock común, releer predecessor y lease/fence; si cambió abortar. Register/activate y fase del ledger se confirman en la misma transacción PG |
| `verified` | JWKS incluye nuevo y anterior, nueva firma válida con pública publicada, única active, health/config coherentes; persistir evidencia y plazo de solapamiento |
| `retired` | Sólo la anterior ligada a esta operación; verificar otra vez active, evidencia, plazos y ausencia de incidencia; retirar del registry y confirmar fase en la misma transacción |
| `completed` | Tras ausencia del kid en JWKS y drenaje de caché, disable idempotente de esa versión KMS; releer DISABLED y cerrar. Nunca destroy |

La API KMS asigna el ID secuencial de la versión; su contrato publicado no ofrece aquí un identificador
aportado por el caller para recuperar una respuesta perdida. Por eso el ledger **no promete exactly-once
entre PG y KMS**: detiene el resultado incierto y exige reconciliación.
[Referencia create](https://docs.cloud.google.com/kms/docs/reference/rest/v1/projects.locations.keyRings.cryptoKeys.cryptoKeyVersions/create).

Claim/lease y fencing evitan que dos ejecuciones progresen la misma fase. Lease vencida en `creating` no
habilita otro create. Conservar los RPCs fuera de transacciones largas; cada transición valida fence y estado.
Register/retire/CLI deben usar el mismo advisory lock y relectura transaccional; factorizar funciones internas
que acepten el client PG para confirmar ledger+registry+audit en una sola transacción. No invocar wrappers que
abran transacciones independientes y simular atomicidad. Probar caída entre cada frontera.

## Firma, retiro y verificación real

- Prueba previa a activar mediante `KmsSignerPort`/`signCompactJws`, con propósito/audiencia diagnósticos
  que no sirven a consumidores OAuth. El resultado nunca se entrega como token de acceso.
- Fallo de preverify: la active anterior permanece; conservar candidata y operación para diagnóstico.
- Fallo de postverify: no retirar ni deshabilitar anterior; marcar operación bloqueada y alertar. No ejecutar
  una reversión automática de llaves sin contrato de recuperación.
- `overlap_not_before` = retiring_at + max(una hora, TTL máximo de JWT emitido + margen/cachés verificadas).
  Los refresh opacos no justifican retener una pública durante 90 días. Si TTL/consumers son desconocidos,
  detener retiro. Verificar también el drenaje de peticiones de firma iniciadas antes de activar.
- Antes de automatizar retiro, primer ensayo registra una emisión real por el issuer y aceptación de consumers;
  la prueba del Job sólo acredita permisos de **su SA**. `readyz` actual no acredita `asymmetricSign` del issuer.
  El plan de operación debe conservar detección de fallos de emisión y suspender retiro ante degradación.
- Llaves históricas `retiring` sin operación/evidencia no se adoptan ni se retiran automáticamente. Se revisan
  por runbook y recuperación explícita. No tomar JWKS como inventario suficiente.
- Cadencia diaria permite >24 h de solapamiento; la hora es piso, no obligación de retirar al minuto60.

## Dry-run, retención y observabilidad

Flag OFF termina antes de leer/mutar ledger o llamar KMS. Dry-run ON con flag habilitado sólo lee metadata,
calcula elegibilidad y devuelve razones/acciones propuestas; no crea leases, versiones, firmas, eventos de dominio
ni modificaciones PG. Logs de ejecución registran que fue simulación. Modo apply procede sólo desde configuración
versionada del Job, no body/overrides del scheduler.

Eventos append-only: operación/fase/actor/execution/SHA/kids/resultados y duración, sin tokens ni PII. Cada tick
produce un resumen acotado: disabled, dry_run, not_due, busy, resumed, uncertain, blocked, verified, completed.
Scheduler aceptar el lanzamiento no prueba éxito del Job: observar estado de ejecución + resultado durable.

Conservar ledger/eventos de rotación; no meterlos en GC de sesiones ni inventar política de borrado.
GC existente conserva ≥30 días tras expiración y excluye audit: este cambio no altera esa retención.
Reusar `auth.keys.rotation_overdue` y `auth.signing_keys.lifecycle`; agregar estado blocked/uncertain del ledger.
El reader actual mide activación, no verificación: mantener esa distinción o actualizarlo explícitamente tras
introducir verified_at. Una consulta fallida nunca equivale a cero pendientes.

## Slices y archivos concretos propuestos

| Slice | Archivos / salida | Gate |
|---|---|---|
| 0 decisión | Delta ADR nativo + excepción build unit + task/plan/índices por sus dueños | Aceptación de frontera nueva, IAM, costo y cadencia; no crear deployable anticipadamente |
| 1 dominio | `src/lib/auth-server/maintenance/key-rotation.ts`, `key-rotation-store.ts`, `key-rotation-kms.ts` y tests; refactor narrow de `keys/signing-keys-store.ts` | Sin imports Next/UI; puertos KMS mock; ningún RPC cloud en tests |
| 2 schema | Migración nueva con `pnpm migrate:create`; fixture/test PG aislado en maintenance | Up/Down/grants/guards; unicidad, fences y atomicidad con concurrencia real |
| 3 adapters | CLI existente reutiliza command; `services/auth-key-maintenance/{main.ts,Dockerfile,deploy.sh,README.md}` y manifiesto env | Job ejecuta y termina, sin servidor; status/dry-run no mutan; secret refs exactos |
| 4 control plane | Workflow nuevo, `.github/workflows/production-release.yml`, gates worker build/deploy-path, registro runtime y flag ledger | Build SHA/digest verificables; paths de imports reales; deploy no ejecuta Job, scheduler no se reanuda implícitamente |
| 5 ensayo | Runbooks key-rotation/incident, dossier1833 | Simulación PG+KMS local; luego ensayo cloud por coordinador, canary y tiempos reales |

CLI/API parity: command es único, CLI y Job adapters. Jobs API es invocación infra, no capability de producto.
`auth.keys.rotate` y `auth.access.revoke_all` no están implementadas hoy: corregir esas afirmaciones de TASK-1833
al aceptar el delta; una API Admin/Nexa futura requiere capability/plan propio. Este slice no crea revocación global.

## Pruebas y promoción

1. Unitarias: flag OFF sin IO; dry-run sin mutaciones; edad/fecha inválida; create incierto; misma versión al retry;
   PENDING con timeout; firma inválida; cambio de predecessor; JWKS incorrecto; retiro antes de plazo; disable incierto.
2. PG aislado: dos ticks concurrentes, lease vencida, fencing, unique operación, registry+ledger+audit atomicidad,
   rollback de fallo audit, register/retire concurrentes y privilegios efectivos del rol dedicado.
3. Build/IAM/config: sin imports de correo/portal; cuenta runtime distinta de portal/issuer; binding KMS exacto;
   scheduler único sin overrides; flagOFF/jobPAUSED preservados por cada deploy; ejecución local no lee `.env` cloud.
4. Ensayo controlado por coordinador: inventario previo, dry-run, primera operación, firma nueva emitida por issuer,
   JWKS y consumer antes/después, solapamiento real, retiro, caché y disable exacto. No revocar personas ni enviar correo
   como efecto de esta prueba; no tocar llaves ajenas a la allowlist. Guardar metadata, no tokens.
5. Habilitar tick sólo después del ensayo y recuperación probados; observar al menos una ejecución programada y su
   resultado. Escalar blocked/uncertain, no reintentar create a ciegas. Steady7d no se sustituye con pruebas locales.

Rollback: pausar Scheduler y flagOFF, conservar ledger/keys/audit. Antes de activar una candidata, deshabilitarla
sólo tras revisión de su operación; después de activar, mantener públicas necesarias y aplicar runbook. Borrar Job
no restaura automáticamente la llave anterior. Nunca limpiar evidencia para conseguir un estado aparentemente verde.

## Relación con canary Rooms y cierre1833

El canary Rooms verifica login OIDC, audiencia, sesión/identidad, OTP limitado y la revocación del alcance probado.
Puede usar la llave actual saludable: **no necesita un nuevo Job ni iniciar otra rotación como prerrequisito técnico**.
Antes del canary se mantienen health/JWKS/registry y vigencia de la configuración como gates reales; una llave activa
incorrecta sí bloquea, la ausencia de este deployable propuesto no demuestra ese fallo.

No desacoplar por omisión: el coordinador registra el gap de automatización en rollout controlado y conserva1833
in-progress. Cierre completo1833 exige la decisión aceptada, rotación/recuperación ensayadas, scheduler efectivo,
runbooks ejercitados y siete días reales de steady, además de sus otros criterios. El alcance ofensivo bloqueado,
privacidad y simulacro de incidente no se acreditan con este Job. No iniciar ni pagar evaluación externa.

## Alternativas y revisión

- CLI manual actual: útil para status/operación supervisada, insuficiente para retries durables; se conserva adapter.
- Ampliar ops-worker/SA portal: menos archivos, mayor alcance de permisos compartidos; descartado en esta propuesta.
- Job aislado: frontera IAM y despliegue verificables, a cambio de un deployable/ledger adicionales; opción propuesta.
- Rotación KMS nativa: no se asume que coordine registry, JWT/JWKS y solapamiento de este issuer; no sustituye el command.

Reabrir si aparecen nuevos issuers/keys, cambian TTLs/cachés, se amplía autoridad del Job o el costo/operación medidos
no justifican el tick diario. No convertir este Job acotado en un worker genérico de administración.
