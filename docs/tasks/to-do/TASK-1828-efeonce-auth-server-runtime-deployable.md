# TASK-1828 — Efeonce Auth Server Runtime Deployable (`auth.efeonce.org`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Especificación; sin excepción EPIC-027 abierta, sin recursos GCP creados`
- Rank: `TBD`
- Domain: `platform|identity|ops`
- Blocked by: `excepción documentada de EPIC-027 para el deployable services/auth-server (patrón artifact-worker 2026-07-12) y registro DNS auth.efeonce.org por el operador`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el runtime independiente del authorization server de Efeonce: `services/auth-server/` en Greenhouse,
Cloud Run en `us-east4` detrás de un global load balancer con certificado managed y Cloud Armor, llave de
firma ES256 en Cloud KMS HSM con JWKS publicado, schema `greenhouse_auth`, session store y cookie `__Host-`
propios. Entrega un servicio vivo que responde `/.well-known/jwks.json` y `/healthz` firmando un token de
prueba; los flujos OAuth y la autenticación de personas llegan en `TASK-1829` y `TASK-1830`.

## Why This Task Exists

El ADR nativo exige que el emisor viva fuera del deployable del portal y fuera del gateway: cookie, sesión,
secretos, audiencia, escalado y rollback propios. Hoy el broker sister-platform corre dentro de Next.js en
Vercel y depende de la sesión NextAuth. Sin un runtime propio no hay nada sobre lo que extraer el broker ni
sobre lo que probar clientes, y cada deploy del portal sería un deploy del emisor.

## Goal

- Deployable `services/auth-server/` con Dockerfile, `deploy.sh` (`--set-env-vars` declarativo), workflow de
  deploy por el carril de workers Cloud Run y `--no-allow-unauthenticated` sólo alcanzable por el LB.
- Front door: global LB + serverless NEG + certificado managed para `auth.efeonce.org` + Cloud Armor con
  throttle por IP, en Terraform replicando `efeonce-mcp/infra/terraform/front_door.tf`.
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
- `../efeonce-mcp/infra/terraform/README.md` y `front_door.tf` (patrón a replicar)
- `services/ops-worker/deploy.sh` (patrón de env vars y deploy)

## Dependencies & Impact

### Depends on

- Excepción documentada de EPIC-027 registrada en `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` con
  costo, routing/auth, rollback y runtime ownership (mismo formato que `artifact-worker`).
- Registro DNS `auth.efeonce.org` (zona en HostGator) apuntando a la IP global reservada.
- Proyecto `efeonce-group`, service account dedicado con `roles/cloudkms.signerVerifier` sobre la llave y
  `roles/cloudsql.client`; acceso a Secret Manager por `*_SECRET_REF`.

### Blocks / Impacts

- `TASK-1829` (superficie OAuth) y `TASK-1830` (autenticación de personas): no pueden desplegar sin este runtime.
- `TASK-1833`: la rotación de llave y las señales nacen aquí y se auditan allá.
- Presupuesto GCP: un Cloud Run service más (mínimo 1 instancia en producción), un LB global (~USD 18/mes),
  KMS HSM (~USD 5/mes).

### Files owned

- `services/auth-server/**` (nuevo: `server.ts`, `Dockerfile`, `deploy.sh`, `README.md`)
- `infra/auth-server/terraform/**` (nuevo) `[verificar ubicación canónica de Terraform en Greenhouse; si no existe, proponer en el plan]`
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
- No existe schema `greenhouse_auth` ni Terraform de Greenhouse para un LB propio `[verificar]`.

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

- Auth/access gate: Cloud Run privado, sólo el LB lo alcanza; `/healthz` público, `/readyz` interno
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

- Delta en `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` con costo, routing/auth, rollback y ownership.
- Llave KMS `auth-server-es256` (HSM, EC_SIGN_P256_SHA256), SA dedicado, IP global reservada, DNS.

### Slice 1 — Servicio y llaves

- `services/auth-server/server.ts` con `/healthz`, `/readyz`, `/.well-known/jwks.json`.
- `src/lib/auth-server/keys/`: cliente KMS, cache de públicas, `signAccessToken` (ES256, `kid`), `rotateSigningKey`.
- Migración `greenhouse_auth` + `signing_keys` con bloque DO anti pre-up-marker.

### Slice 2 — Front door y deploy

- Terraform LB + NEG + certificado + Cloud Armor; `deploy.sh`; workflow; allowlist de release.
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
- Runtime: Node 24, Fastify o el mismo servidor HTTP mínimo de `ops-worker` `[verificar patrón vigente]`,
  `min-instances=1` en production, `max=5`, concurrency 80, timeout 30 s.
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
| LB apunta al servicio antes de estar listo | front door | low | `enable_front_door=false` hasta el canary negativo, como en `efeonce-mcp` | 5xx en el LB |
| Cloud SQL saturado por pool extra | Postgres | low | max=15 por runtime; `min-instances=1` | `pg:doctor` conexiones |

### Feature flags / cutover

- `AUTH_SERVER_ENABLED` (default `false`) en `deploy.sh` del servicio: con `false`, `/readyz` responde 503 y
  el LB no enruta tráfico útil. Ledger: fila nueva en `FEATURE_FLAG_STATE_LEDGER.md`, runtime `auth-server`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | deshabilitar versión KMS, liberar IP, borrar registro DNS | 10 min | sí |
| Slice 1 | revisión anterior de Cloud Run; el schema vacío se queda | < 5 min | sí |
| Slice 2 | `enable_front_door=false` en Terraform + apply; revert del workflow | < 10 min | sí |

### Production verification sequence

1. Staging: deploy con flag `false`; `/healthz` 200, `/readyz` 503.
2. Staging: flag `true`; `/readyz` 200; JWKS publica `kid`; token de prueba verifica con `jose`.
3. Rotación en staging: dos `kid` en JWKS, token viejo y nuevo verifican; `retired` desaparece.
4. Producción: repetir 1–3 con cooldown de 24 h; `auth.efeonce.org` con certificado managed `ACTIVE`.
5. Señales steady 7 días.

### Out-of-band coordination required

- Operador: registro DNS en HostGator; aprobación de la excepción EPIC-027; presupuesto GCP.
- `gcloud`: key ring, llave HSM, SA, IP global, certificado; Sentry DSN nuevo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe el delta de excepción EPIC-027 para `services/auth-server` con los cuatro campos de evidencia.
- [ ] `https://auth.efeonce.org/.well-known/jwks.json` devuelve una llave EC P-256 con `kid` y `use: sig`.
- [ ] Un token firmado por el servicio verifica con la pública del JWKS y falla con una pública distinta.
- [ ] La rotación produce dos `kid` activos y luego retira el viejo sin invalidar tokens vigentes.
- [ ] La llave está en KMS con protección `HSM` y el SA del servicio no tiene permisos de export/destroy.
- [ ] Schema `greenhouse_auth` existe con owner `greenhouse_ops` y GRANTs runtime; `signing_keys` con CHECK de estado.
- [ ] `deploy.sh` declara todas las env vars; el workflow está en `RELEASE_DEPLOY_WORKFLOWS`.
- [ ] Señales `auth.issuer.jwks_unreachable` y `auth.kms.sign_failures` registradas y en steady 0.
- [ ] Flag `AUTH_SERVER_ENABLED` con fila en el ledger y estado por runtime.

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

- Servidor HTTP: reutilizar el patrón de `ops-worker` o adoptar Fastify; decidir en el plan con el gate de deps.
