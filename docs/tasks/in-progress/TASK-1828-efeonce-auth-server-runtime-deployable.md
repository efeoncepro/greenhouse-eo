# TASK-1828 — Efeonce Auth Server Runtime Deployable (`auth.efeonce.org`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Tomada 2026-09-03 por /implement-task (instrucción explícita del operador). Excepción EPIC-027 aprobada; DNS verificado; sin recursos GCP creados aún. Slice 0 HECHO 2026-09-03 (KMS API habilitada; key ring us-east4/auth-server; llave auth-server-es256 HSM EC_SIGN_P256_SHA256 versión 1 ENABLED; SA auth-server@ con cloudkms.signerVerifier sólo sobre la llave + cloudsql.client + serviceAccountUser para github-actions-deployer). Slice 1 HECHO 2026-09-04 (schema greenhouse_auth aplicado + db.d.ts; src/lib/auth-server/keys con KMS ES256 + CRC32C + JWKS + store/rotación; services/auth-server server/Dockerfile/deploy.sh; workflow; 3 gates de workers verdes; versión KMS 1 registrada como active kid=VjbDUgwc…nI8; token real firmado por HSM y verificado con el JWKS de PG). Slice 2 HECHO 2026-09-04: https://auth.efeonce.org vivo (cert ACTIVE, rev auth-server-00002-gfh con AUTH_SERVER_ENABLED=true): /readyz 200 {postgres,kms,activeKey:ok}, JWKS publicado; rotación ejercitada (KMS v2 activa kid xjjMaY…ppKc, v1 retiring); tofu apply en efeonce-mcp 6a144a5 (3 add/2 change/0 destroy), mcp.efeonce.org intacto; allowlist + orquestador + señales + runbook. Slice 3 (cierre docs/QA) en curso. Producción: code complete, rollout pendiente (release control plane)`
- Rank: `TBD`
- Domain: `platform|identity|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el runtime independiente del authorization server de Efeonce: `services/auth-server/` en Greenhouse,
Cloud Run en `us-east4` publicado como segundo host del front door existente del gateway MCP (misma IP, mismo
global load balancer, misma policy Cloud Armor; host rule + backend service + NEG + certificado managed
adicionales en `efeonce-mcp/infra/terraform/`), llave de firma ES256 en Cloud KMS HSM con JWKS publicado,
schema `greenhouse_auth`, session store y cookie `__Host-` propios. Decisión del operador 2026-09-03: no se
crea un segundo LB (≈ USD 37/mes) ni una segunda policy; el adicional en GCP queda en ≈ USD 15/mes. Entrega un servicio vivo que responde `/.well-known/jwks.json` y `/healthz` firmando un token de
prueba; los flujos OAuth y la autenticación de personas llegan en `TASK-1829` y `TASK-1830`.

## Why This Task Exists

El ADR nativo exige que el emisor viva fuera del deployable del portal y fuera del gateway: cookie, sesión,
secretos, audiencia, escalado y rollback propios. Hoy el broker sister-platform corre dentro de Next.js en
Vercel y depende de la sesión NextAuth. Sin un runtime propio no hay nada sobre lo que extraer el broker ni
sobre lo que probar clientes, y cada deploy del portal sería un deploy del emisor.

## Goal

- Deployable `services/auth-server/` con Dockerfile, `deploy.sh` (`--set-env-vars` declarativo), workflow de
  deploy por el carril de workers Cloud Run, `--ingress=internal-and-cloud-load-balancing` y
  `--allow-unauthenticated` (el ALB no emite tokens IAM hacia un serverless NEG; la autenticación ocurre en la
  aplicación, igual que en `efeonce-mcp-gateway`). SA dedicado `auth-server@efeonce-group`.
- Front door compartido: en `efeonce-mcp/infra/terraform/front_door.tf` agregar host rule `auth.efeonce.org` en
  el URL map, backend service propio con serverless NEG en `us-east4`, certificado managed adicional en el
  target HTTPS proxy y la policy Cloud Armor existente adjunta al backend nuevo. Sin IP ni LB nuevos.
- Llave ES256 en Cloud KMS con protección HSM; endpoint `/.well-known/jwks.json` con `kid`; firma vía KMS y
  verificación local con la pública; rotación con dos versiones activas probada en staging.
- Schema `greenhouse_auth` (sesiones, refresh tokens, consents, passkeys, TOTP, clientes registrados) creado
  vacío con ownership `greenhouse_ops` y GRANTs runtime; las tablas las llenan `TASK-1829`/`TASK-1830`.
- Sentry por servicio (`initSentryForService('auth-server')`), señal de reliability
  `auth.issuer.jwks_unreachable` y `auth.kms.sign_failures`, runbook de deploy y rollback.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (invariantes y binding)
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` (§Delta 2026-07-12, vía de excepción)
- `docs/architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` (Cloud Run max=15)
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`

Reglas obligatorias:

- NUNCA compartir `NEXTAUTH_SECRET`, cookies ni session store con el portal; cookie `__Host-efeonce_auth`.
- NUNCA importar `@core/theme/*`, `@menu` ni `@layouts` desde código bundleado al worker.
- NUNCA exportar la llave privada: la firma es `kms.asymmetricSign`; la pública se cachea con `kid`.
- NUNCA `Pool` fuera de `src/lib/postgres/client.ts`; el servicio usa el cliente canónico con perfil runtime.
- SIEMPRE declarar cada env var en `deploy.sh`; un `--update-env-vars` a mano desaparece en el próximo deploy.
- SIEMPRE registrar el flag `AUTH_SERVER_ENABLED` en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `../efeonce-mcp/infra/terraform/README.md` y `front_door.tf` — OpenTofu (`tofu`), estado en GCS `efeonce-group-efeonce-mcp-terraform`, **apply manual del operador, sin CI**; nueva variable `enable_auth_host` (default `false`)
- `services/ops-worker/deploy.sh` (patrón de env vars y deploy)

## Dependencies & Impact

### Depends on

- Excepción documentada de EPIC-027 registrada en `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` con
  costo, routing/auth, rollback y runtime ownership (mismo formato que `artifact-worker`).
- Registro DNS `auth.efeonce.org` → `34.111.78.237` — **HECHO 2026-09-03** por el operador en HostGator; verificado en ambos nameservers. HTTPS responde vacío hasta que el Slice 2 agregue el host y el certificado al LB (esperado).
- Proyecto `efeonce-group`, service account dedicado con `roles/cloudkms.signerVerifier` sobre la llave y
  `roles/cloudsql.client`; acceso a Secret Manager por `*_SECRET_REF`.

### Blocks / Impacts

- `TASK-1829` (superficie OAuth) y `TASK-1830` (autenticación de personas): no pueden desplegar sin este runtime.
- `TASK-1833`: la rotación de llave y las señales nacen aquí y se auditan allá.
- Presupuesto GCP: un Cloud Run service más (mínimo 1 instancia sólo en producción, ≈ USD 8/mes), KMS HSM
  (≈ USD 5/mes), Secret Manager/Scheduler/Artifact Registry (≈ USD 1/mes). Sin LB ni Armor nuevos: ≈ USD 15/mes.

### Files owned

- `services/auth-server/**` (nuevo: `server.ts`, `Dockerfile`, `deploy.sh`, `README.md`)
- `../efeonce-mcp/infra/terraform/front_door.tf` + `variables.tf` (host rule, backend service, NEG `us-east4`, certificado; coordinar con la sesión dueña de `TASK-1626`/`TASK-1813` antes de editar)
- `src/lib/auth-server/keys/**` (nuevo: cliente KMS, JWKS, rotación)
- `migrations/<timestamp>_task-1828-greenhouse-auth-schema.sql` (nuevo)
- `.github/workflows/deploy-auth-server.yml` (nuevo, ordering pnpm → node canónico)
- `src/lib/release/workflow-allowlist.ts` (agregar el workflow ANTES del primer deploy productivo)
- `docs/operations/runbooks/auth-server.md` (nuevo)

## Current Repo State

### Already exists

- Cuatro Cloud Run services productivos con `deploy.sh` + workflow (`services/ops-worker/**` y hermanos) y el
  Cloud Run Job `artifact-worker` creado por excepción EPIC-027.
- Front door Terraform con LB, NEG serverless, certificado managed y Cloud Armor en `../efeonce-mcp/infra/terraform/`.
- `jose` en `package.json`; `initSentryForService` y `captureWithDomain`; cliente Postgres canónico con
  pooling por runtime; `RELEASE_DEPLOY_WORKFLOWS` en `src/lib/release/workflow-allowlist.ts`.
- Reliability Control Plane con registry de señales (`src/lib/reliability/**`).

### Gap

- No existe ningún runtime de auth fuera de Vercel; el broker depende de `getOptionalServerSession()`.
- No existe llave asimétrica ni KMS en el proyecto; no hay JWKS publicado por Efeonce.
- No existe schema `greenhouse_auth`; el front door del gateway sólo conoce el host `mcp.efeonce.org`.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `services/auth-server/` (Cloud Run service, Greenhouse repo) + `src/lib/auth-server/keys/**`
- Future candidate home: `worker`
- Boundary: el servicio expone sólo HTTP público vía LB; consume `src/lib/postgres/client.ts`, `src/lib/auth-server/**` y, más adelante, readers/commands de `src/lib/sister-platforms/**` e identidad; ningún consumidor importa el servicio
- Server/browser split: 100% server; nada de este paquete entra al bundle del portal
- Build impact: dependencia nueva `@google-cloud/kms`; Dockerfile propio; `pnpm worker:runtime-deps-gate` y `worker:build-contract-gate` deben pasar
- Extraction blocker: none — nace extraído; la única dependencia compartida es Cloud SQL

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: nuevo schema `greenhouse_auth` (vacío en esta task) y llave KMS `auth-server-es256`
- Consumidores afectados: `TASK-1829`, `TASK-1830`, gateway `efeonce-mcp` (JWKS), reliability dashboard
- Runtime target: `worker` (Cloud Run staging y production)

### Contract surface

- Contrato existente a respetar: patrón `deploy.sh` + workflow de los workers; `GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`
- Contrato nuevo o modificado: `GET /.well-known/jwks.json`, `GET /healthz`, `GET /readyz` (verifica KMS + PG)
- Backward compatibility: `not applicable` (servicio nuevo)
- Full API parity: infraestructura; no introduce capability de negocio

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_auth` (schema), `greenhouse_auth.signing_keys` (registry de `kid` ↔ versión KMS ↔ estado `active|retiring|retired`)
- Invariantes que no se pueden romper:
  - `Existe siempre ≥1 signing key active; durante rotación coexisten active + retiring y ambas se publican en JWKS.`
  - `Ninguna llave privada se persiste en PG, Secret Manager ni logs.`
- Write-target allowlist: `N/A — el schema nace vacío; las tablas de datos se declaran en TASK-1829/1830`
- Tenant/space boundary: n/a en esta task (sin datos de personas)
- Idempotency/concurrency: migración idempotente con bloque DO de verificación; rotación de llave como command idempotente por `kid`
- Audit/outbox/history: `signing_keys` es append-only por estado; eventos de rotación a audit

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `AUTH_SERVER_ENABLED=false` en staging y production hasta el smoke de JWKS
- Backfill plan: none
- Rollback path: apagar tráfico en el LB / revisión anterior de Cloud Run (< 5 min); el schema vacío se conserva
- External coordination: DNS en HostGator; creación de llave KMS y SA por `gcloud`; IP global reservada; secreto de Sentry DSN

### Security and access

- Auth/access gate: ingreso restringido al LB (`internal-and-cloud-load-balancing`) + `allow-unauthenticated` a nivel IAM; validación de `Host: auth.efeonce.org` en la app; `/healthz` público, `/readyz` interno
- Sensitive data posture: sin PII en esta task; secretos por `*_SECRET_REF`
- Error contract: `captureWithDomain(err, 'identity.auth_server', …)`; respuestas JSON sanitizadas
- Abuse/rate-limit posture: Cloud Armor por IP en el LB (mismo umbral que el gateway)

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/auth-server`, `pnpm worker:runtime-deps-gate`, `pnpm worker:build-contract-gate`
- DB/runtime checks: `SELECT schema_name FROM information_schema.schemata WHERE schema_name='greenhouse_auth'`; `SELECT * FROM greenhouse_auth.signing_keys`
- Integration checks: `curl https://auth.efeonce.org/.well-known/jwks.json` devuelve la pública con `kid`; token de prueba firmado por KMS verifica con `jose`
- Reliability signals/logs: `auth.issuer.jwks_unreachable`, `auth.kms.sign_failures` steady = 0
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 — PLAN MODE: lo produce el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Excepción EPIC-027 y recursos base

- Delta en `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` con costo, routing/auth, rollback y ownership — **APROBADO 2026-09-03 por el operador**.
- Llave KMS `auth-server-es256` (HSM, EC_SIGN_P256_SHA256), SA dedicado, DNS a la IP existente.

### Slice 1 — Servicio y llaves

- `services/auth-server/server.ts` con `/healthz`, `/readyz`, `/.well-known/jwks.json`.
- `src/lib/auth-server/keys/`: cliente KMS, cache de públicas, `signAccessToken` (ES256, `kid`), `rotateSigningKey`.
- Migración `greenhouse_auth` + `signing_keys` con bloque DO anti pre-up-marker.

### Slice 2 — Host en el front door del gateway y deploy

- Terraform en `efeonce-mcp`: host rule, backend service, NEG `us-east4`, certificado managed adicional, policy Armor adjunta; `deploy.sh`; workflow; allowlist de release.
- Sentry, señales de reliability, runbook de deploy/rollback/rotación.

## Out of Scope

- Endpoints `authorize`/`token`/`register`/consent (`TASK-1829`).
- Passkeys, magic link, TOTP, pantallas (`TASK-1830`, task ui-ux).
- Verificación multi-issuer en el gateway (`TASK-1831`).
- Cualquier acceso de cliente o token para personas reales.

## Detailed Spec

- Llave: `projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-es256`,
  protección `HSM`, algoritmo `EC_SIGN_P256_SHA256`. `kid` = hash corto de la pública. Rotación: crear versión
  nueva → `active`, la anterior → `retiring` (sigue en JWKS hasta que expire el último token firmado, 15 min +
  margen) → `retired` y deshabilitada en KMS.
- Firma: `asymmetricSign` con digest SHA-256 del signing input; la firma DER se convierte a formato JOSE
  (r||s). Verificación local con la pública para el test de humo; el gateway verifica sólo con JWKS.
- Runtime: `node:http` mínimo como `ops-worker` (Node 22-slim, esbuild bundle `--packages=external`, imagen
  `gcr.io/efeonce-group/auth-server` vía Cloud Build); `min-instances=1` en production, `max=5`, concurrency 80,
  timeout 30 s. Registro en los tres gates de workers (`worker-build-contract-gate.mjs`, `worker-runtime-deps-gate.mjs`,
  `worker-deploy-path-coverage-gate.mjs`) y en la tabla de `GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`.
- Cookie base: `__Host-efeonce_auth`, `Secure; HttpOnly; SameSite=Lax; Path=/`, sin `Domain`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (excepción EPIC-027 + KMS + DNS) → Slice 1 (servicio + llaves + migración) → Slice 2 (front door + deploy).
- Slice 2 no habilita `AUTH_SERVER_ENABLED=true` hasta que el smoke de JWKS pase en staging.
- `RELEASE_DEPLOY_WORKFLOWS` se actualiza ANTES del primer deploy productivo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Deployable creado sin excepción EPIC-027 aprobada | release / arquitectura | medium | Slice 0 bloqueante; el plan no avanza sin el delta registrado | revisión humana del plan |
| Llave privada expuesta por mal uso de KMS (export) | identity / KMS | low | HSM no exportable; SA sólo `signerVerifier`; sin `cryptoKeyVersions.destroy` para runtime | audit log de KMS |
| Env var out-of-band borrada por `--set-env-vars` | Cloud Run | medium | toda var declarada en `deploy.sh`; ledger de flags | `readyz` falla tras deploy |
| Cambio del URL map afecta a `mcp.efeonce.org` | front door compartido | medium | `terraform plan` revisado; host rule aditiva; canary del gateway antes y después del apply | canary interno rojo |
| Backend nuevo recibe tráfico antes de estar listo | front door | low | backend creado con el servicio en `readyz` 503 hasta el smoke | 5xx en el host `auth` |
| Cloud SQL saturado por pool extra | Postgres | low | max=15 por runtime; `min-instances=1` | `pg:doctor` conexiones |

### Feature flags / cutover

- `AUTH_SERVER_ENABLED` (default `false`) en `deploy.sh` del servicio: con `false`, `/readyz` responde 503 y
  el LB no enruta tráfico útil. Ledger: fila nueva en `FEATURE_FLAG_STATE_LEDGER.md`, runtime `auth-server`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | deshabilitar versión KMS, borrar registro DNS | 10 min | sí |
| Slice 1 | revisión anterior de Cloud Run; el schema vacío se queda | < 5 min | sí |
| Slice 2 | revert del Terraform (quitar host rule + backend) y apply; el gateway no cambia | < 10 min | sí |

### Production verification sequence

1. Staging: deploy con flag `false`; `/healthz` 200, `/readyz` 503.
2. Staging: flag `true`; `/readyz` 200; JWKS publica `kid`; token de prueba verifica con `jose`.
3. Rotación en staging: dos `kid` en JWKS, token viejo y nuevo verifican; `retired` desaparece.
4. Producción: repetir 1–3 con cooldown de 24 h; `auth.efeonce.org` con certificado managed `ACTIVE`; canary del gateway `mcp.efeonce.org` verde después del apply.
5. Señales steady 7 días.

### Out-of-band coordination required

- Operador: registro DNS en HostGator; aprobación de la excepción EPIC-027; presupuesto GCP.
- `gcloud`/Terraform en `efeonce-mcp`: key ring, llave HSM, SA, host rule, backend, certificado; Sentry DSN nuevo. Coordinar la edición del front door con la sesión dueña del gateway.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe el delta de excepción EPIC-027 para `services/auth-server` con los cuatro campos de evidencia (aprobado 2026-09-03).
- [x] `https://auth.efeonce.org/.well-known/jwks.json` devuelve una llave EC P-256 con `kid` y `use: sig`. — verificado 2026-09-04 11:49Z por HTTPS real (cert `efeonce-auth-server-cert` ACTIVE): `{kty:EC, crv:P-256, kid:VjbDUgwc…nI8, alg:ES256, use:sig}`, `cache-control: public, max-age=300`; `/readyz` 200 con `postgres/kms/activeKey: ok` (rev `auth-server-00002-gfh`).
- [x] Un token firmado por el servicio verifica con la pública del JWKS y falla con una pública distinta. — evidencia 2026-09-04: smoke real contra KMS HSM (`signWithActiveKey` → `jwtVerify` con el JWK del registry, kid/alg/sub correctos, CRC32C de digest y firma verificados); test `fails loud when the signer returns a signature for a different key` en `kms-signer.test.ts`.
- [ ] La rotación produce dos `kid` activos y luego retira el viejo sin invalidar tokens vigentes. — PARCIAL 2026-09-04: `pnpm auth-server:rotate-key` creó la versión KMS 2 y la activó (kid `xjjMaYxidu3Vk57K5py6w6WGDN41T0WMeOtHMEyppKc`), v1 pasó a `retiring`; ambas publicadas en el JWKS. El retiro (`--retire` tras ≥ 1 h de solapamiento + `gcloud kms keys versions disable 1`) queda pendiente de ejecutar para cerrar el ciclo y volver a una sola versión facturable.
- [x] La llave está en KMS con protección `HSM` y el SA del servicio no tiene permisos de export/destroy — readback 2026-09-03: policy de la llave = sólo `roles/cloudkms.signerVerifier` para `auth-server@efeonce-group`; versión 1 `ENABLED`, `HSM`, `EC_SIGN_P256_SHA256`.
- [x] Schema `greenhouse_auth` existe con owner `greenhouse_ops` y GRANTs runtime; `signing_keys` con CHECK de estado. — verificado 2026-09-04 contra PG real (owner `greenhouse_ops`; grants `greenhouse_app`/`greenhouse_runtime` = SELECT,INSERT,UPDATE; índice parcial único `signing_keys_single_active_idx`; `signing_key_events` append-only por trigger).
- [x] `deploy.sh` declara todas las env vars; el workflow está en `RELEASE_DEPLOY_WORKFLOWS`. — `Auth Server Deploy` registrado con `cloudRunService: auth-server` (allowlist test 10 nombres / 5 con drift) y `deploy-auth-server` cableado en `production-release.yml` (needs, post-release-health, summary) el 2026-09-04, antes de cualquier deploy productivo.
- [x] No existe un segundo forwarding rule ni una segunda policy Cloud Armor; `auth.efeonce.org` resuelve a la IP del gateway y `mcp.efeonce.org` sigue verde tras el apply. — apply 2026-09-04: sólo NEG + backend + cert nuevos y URL map/proxy in-place; forwarding rules siguen siendo 2 (`efeonce-mcp-gateway-http/https`); `mcp.efeonce.org/.well-known/oauth-protected-resource` 200 antes y después.
- [ ] Señales `auth.issuer.jwks_unreachable` y `auth.kms.sign_failures` registradas y en steady 0. — `auth.issuer.jwks_unreachable` (runtime) y `auth.signing_keys.lifecycle` (data_quality) cableadas en el overview 2026-09-04 con 5 tests; `auth.kms.sign_failures` se observa por incidente `identity` con tag `component=auth-server`/`check=kms` (sin contador propio: no hay fuente medible aún). Pendiente: `AUTH_SERVER_JWKS_URL` en Vercel para salir de `not_configured` y verificar steady en `/admin/operations`.
- [x] Flag `AUTH_SERVER_ENABLED` con fila en el ledger y estado por runtime. — filas en `FEATURE_FLAG_STATE_LEDGER.md` (§Pendientes + §Snapshot), runtime `auth-server`, OFF.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/auth-server`
- `pnpm worker:runtime-deps-gate` y `pnpm worker:build-contract-gate`
- `pnpm migration-marker-gate`
- `curl` a JWKS en staging y producción; `gcloud kms keys versions list`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado
- [ ] `changelog.md` quedo actualizado
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-1829`, `TASK-1830`, `TASK-1833`
- [ ] runbook `docs/operations/runbooks/auth-server.md` publicado y ledger de flags al día

## Follow-ups

- Región `southamerica-west1` si la latencia hacia clientes en Chile lo justifica (ADR §Open questions).
- Terraform de Greenhouse: si no existe carpeta canónica, proponer `infra/` y registrarlo en cloud governance.

## Open Questions

- Servidor HTTP — **RESUELTA 2026-09-03 (Discovery):** `node:http` como `ops-worker`. Razón: los tres gates de workers y el Dockerfile canónico ya entienden ese shape; Fastify agregaría una dependencia de runtime sin ganancia para ~6 rutas.
