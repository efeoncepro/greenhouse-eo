# EPIC-044 — rollout OAuth y personas

## Alcance y autorización

Operador confirmó desplegar y activar TASK-1829/1830 por workflow canónico, verificar autenticación, tokens y revocación, y conservar rollback. Checkout compartido develop; ejecución secuencial. No incluye implementar gateway TASK-1831 ni pantallas TASK-1835.

## Preflight verificado

- Runtime inicial: auth-server-00006-znf, 100% tráfico, GIT_SHA 1403d5a32bb90cd58d32be23edf80fcb3ac0d121; OAuth false, módulo personas ausente.
- Host público readyz 200; metadata OAuth 404; JWKS con dos llaves.
- PG: efeonce-auth draft, 17 tablas greenhouse_auth presentes. pg:doctor y conexión ops verificados.
- 161 tests / 10 archivos de auth-server: passed. Smokes personas PG/KMS real y OAuth store: passed. TypeScript y gates build/runtime deps: passed.
- Detectado permiso faltante de auth-server@ sobre secreto Resend staging. Corrección reutiliza helper declarativo de IAM en deploy.sh. KMS TOTP ya tiene cryptoKeyEncrypterDecrypter para runtime.
- Arquitectura: EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1 y EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1; sin cambio de boundaries ni nuevas tablas.

## Plan y estado

Environment efeonce-auth activado por command auditado a 2026-09-05T00:50:17Z. Activación declarativa preparada, aún no desplegada. Verificar CI y runtime, metadata, DCR/CIMD, correo real, sesión, tokens, refresh/revocación y passkeys. Identidad de canary solicitada al operador; no crear acceso a clientes por inferencia.

Rollback: revisión inicial auth-server-00006-znf; restituir flags false por workflow y environment draft por command si falla la activación. Tokens/cookies/codes/enlaces de acceso nunca se registran en evidencia.

## Despliegue en curso

Commit 3f68e8875 publicado en develop. Pre-push local:check pasó con cero errores (26 warnings existentes). Auth Server Deploy run 33934410457, primer intento detenido antes de build: deployer sin permiso para describir la llave TOTP. Se concedió roles/cloudkms.viewer únicamente sobre auth-server-totp-envelope a github-actions-deployer@, preservando el permiso de cifrado exclusivo del runtime; política releída. Reintento del job fallido solicitado. CLAUDE.md governance reportó 35.007/35.000 tokens; abreviación equivalente de una frase del router, sin retirar reglas.

## Continuidad del contrato histórico de release

El barrido previo de EPIC-044 actualizó cuatro workers a cinco servicios (incluido auth-server) y el clasificador de change-gate. Estas seis líneas del baseline 27ce06a11 quedaron sin copia histórica. Se preservan abajo como **historia supersedida, no instrucciones vigentes**; el contrato operativo actual está en el runbook de producción, RELEASE_DEPLOY_WORKFLOWS y el clasificador de drift. No se modifica el gate ni su allowlist.

- `src/lib/release/workflow-allowlist.ts` — `RELEASE_DEPLOY_WORKFLOWS` canonical array (6 workflows + Cloud Run service mapping para drift detection). `RELEASE_DEPLOY_WORKFLOW_NAMES` set O(1) lookup. `WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION` filtered subset (4 workflows). `findWorkflow()` lookup.
- `platform.release.worker_revision_drift` (TASK-849 V1.0) — Cloud Run latest revision SHA != ultimo workflow run success SHA. error si drift confirmado, warning si data_missing (NO falso positivo).
1. **First gate** (post Vercel ready): aprueba los **4 Cloud Run workers** (ops-worker + commercial-cost-worker + ico-batch-worker + hubspot-greenhouse-integration).
[ ] 13. Verify all 4 Cloud Run GIT_SHAs match target_sha
4. `deploy-{ops-worker, commercial-cost-worker, ico-batch, hubspot-integration}` — parallel matrix `uses: ./.github/workflows/<worker>-deploy.yml@<sha>` con `expected_sha` + `environment` inputs.
**Critical path en orchestrator**: los 2 jobs Azure corren en paralelo con los 4 workers Cloud Run para acortar duración total del release. `post-release-health.needs` espera por ambos antes de pingear `/api/auth/health`.
