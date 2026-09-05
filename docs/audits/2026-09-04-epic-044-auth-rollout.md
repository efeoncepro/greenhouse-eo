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
