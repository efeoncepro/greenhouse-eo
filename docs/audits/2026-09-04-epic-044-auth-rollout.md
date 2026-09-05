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

## Resultado live 2026-09-05T01:01Z

- Auth Server Deploy `33934410457` attempt 2: success. Build `1cead947-fceb-4e8e-a9f3-f6a245a22428`, digest `sha256:5368cc5e254aaafcc0f4aba1fe72445ea8bb324f0cff1b4e1923775c5d62c216`.
- Revisión `auth-server-00007-cxb`, 100% tráfico, GIT_SHA `3f68e887546227c88dea031697dfc2a83bce4ad4`; OAuth true y personas true. Ready 200 con PG/KMS/llave OK.
- 9/9 canaries públicos: RFC8414, OIDC discovery, login, sesión anónima 401, registro passkey sin sesión 401, DCR público 201, code inválido invalid_grant, enlace inválido rechazado, DCR confidencial rechazado. Cliente público de canary persistido sin grants; referencia local ignorada `.auth/epic44-client.json` 0600 para continuar el flujo.
- IAM Resend releído: auth-server@ posee secretAccessor únicamente sobre el secreto staging; mail type enabled. Environment active. Cero links de personas en external_idp:efeonce-auth.
- No se enviaron correos, crearon bindings de clientes ni emitieron tokens de persona. Pendiente respuesta del operador sobre correo/organización para el canary real; faltan CIMD positivo, sesión, tokens, refresh/revocación y passkeys en dos navegadores.
- Deploy por push develop / workflow staging sobre el servicio público compartido. NO hubo promoción a main ni nuevo manifest de producción. El árbol main anterior aún contiene flags OFF y puede revertirlos en su próximo deploy; promover sólo por el control plane con los canaries cumplidos.
- QA: runtime público activado y negativos verificados; cierre autenticado pendiente. No marcar tasks ni epic complete.

## Estado del epic anterior al rollout (historia)

- Status real: `ADR nativo aceptado 2026-09-03; TASK-1626 en curso (gateway vivo); U01 TASK-1828 EN PRODUCCIÓN 2026-09-04 por el release 9100bbd2765d (orquestador run 33893120972, job deploy-auth-server; Cloud Run auth-server rev 00005-pk8 GIT_SHA f6db4255a, https://auth.efeonce.org/readyz 200, JWKS con 2 kid, front door compartido; AUTH_SERVER_JWKS_URL declarada en Vercel Production+staging; retiro de la llave v1 pendiente); U04 TASK-1631 Slice 1 code complete + staging verificado 2026-09-04 (4 señales, rutas admin, lane ecosystem), producción con el mismo release; U02 TASK-1829 code complete, rollout pendiente (metadata RFC 8414/OIDC, CIMD primario, DCR compat, clientes confidenciales por command, PKCE S256, JWT ES256 15 min con gv, refresh rotativo con detección de reuso, revoke/introspect, consentimiento persistido, 7 tablas greenhouse_auth aplicadas, 3 señales; el código viaja en la revisión de producción con AUTH_SERVER_OAUTH_ENABLED=false — metadata 404 verificada en vivo; environment efeonce-auth registrado en draft el 2026-09-04 por pnpm auth-server:register-issuer-environment, a active junto con el flip del flag en staging); U03 TASK-1830 code complete, rollout pendiente 2026-09-04 (sesión greenhouse-eo-18; commits 7459d96d4/937087404/db2622ba9/5b57b73f9): el SubjectSessionPort real ya está cableado —hasta hoy authorize respondía siempre login_required—, con sesión propia __Host-efeonce_auth, magic link, passkeys, TOTP de step-up con llave KMS simétrica auth-server-totp-envelope creada el mismo día, recuperación por re-invitación, 8 tablas greenhouse_auth aplicadas, capability identity.auth_person.revoke y 3 señales auth.person.*; flag AUTH_SERVER_PERSON_AUTH_ENABLED=false, falta prender en staging junto con OAUTH y el environment en active; U05 TASK-1831 ya tiene el token con sub/azp/scope/gv en código y espera el flag ON en staging; TASK-659 superseded en diseño por U02 (decisión de lifecycle al cerrar 1829); task ui-ux de login = TASK-1835 (creada 2026-09-04, UI ready: no hasta dirección visual aprobada)`
