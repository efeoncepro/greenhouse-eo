# TASK-2065 — consumidor Efeonce ID, evidencia local

25-10-2026. Runtime commit `37c799c`. Consumer Rooms sobre foundation issuer TASK-1834. Activación OFF; no DB cloud, registros RP
productivos ni usuarios reales. El deployment público sigue bd4b802. Este expediente acredita backend y
protocolo local; no UI de contexto/recovery ni adopción de Greenhouse.

## Implementación verificada

- OIDC code/PKCE S256/state/nonce; callback exige iss exacto (RFC9207).
- IDtoken ES256 mediante jose6.2.13, JWKS fijo, issuer/audience/tiempos/nonce; sin tokens MCP como login.
- Sesión opaca en cookie host-only HttpOnly/SameSiteLax/Secure; excepción HTTP loopback explícita.
- Estado, binding y sesiones durables propios; verifier/handle AES256GCM con AAD; digests de cookies.
- Binding issuer/sub explícito hacia principal interno existente. Callback no crea personas ni memberships.
- Contextos0/1/N y selección explícita, sin unir roles/grants. Introspection en cada solicitud y autoridad PG fresca.
- Logout local durable incluso con issuer caído; sin declarar logout global. OFF no toca DB ni red.

## Checks

`pnpm test`:95/95 PASS,0 skips (66 previas y29 nuevas). Las nuevas incluyen5 config/crypto,6 protocoloHTTP
con ES256,12 PostgreSQL,1 OFF sinDB y5 transporte/cookies/origin/issuerrespuesta. `pnpm lint`,
`pnpm typecheck`, `pnpm build`:PASS. El build contiene login/callback/context/logout/api-auth-session.

Negative gates: firma/issuer/audience/nonce/state/browser/PKCE, callback concurrente/replay, tokenMCP,
expiry/revocation, introspectionfallida, binding/role/tenant, AAD/ciphertext trasplantado, origin/CSRF,
headers/code maliciosos, scopes exactos, exceso de requests y principal ausente del DTO público.

## E2E real entre runtimes

Comando: `pnpm auth:integration --issuer-fixture <PRIVATE_FIXTURE_JSON>`.
Fixture0600 creada por `scripts/auth-server/first-party-local-server.ts` de Greenhouse; no se copia al repo.
Chrome headless navegó Rooms19335/login → issuer19334/authorize → Rooms/auth/callback → contexto.
Issuer real de TASK-1834 con PostgreSQL propio aislado, firmaES256/JWKS reales. Consumer usa createAuthHttp,
roomsApi y resolvePrincipal reales y PostgreSQL Rooms. Sólo seed inicial de autoridad/bindings es fixture;
no hay auth bypass en composición productiva.

PASS:0context403;1context automático;2contextos requieren selección; organizaciónA administrador y B operador
sin mezcla; lectura propia200 y cruzada404; publish operador404; logout401; revocación de sesiónissuer →
negocio401 y reader sesión401. Browser y servidor cerrados; bindings y sesiones run-owned revocados.
Navegación restringida a dos orígenes loopback. No se guardan códigos, tokens, cookies, secretos ni URLs authorize.

La integración encontró un rechazo del parámetro `iss` retornado por issuer. Se corrigió para exigirlo y
compararlo con el issuer configurado antes del canje; regresión HTTP prueba ausencia/issuerajeno sin llamar token.

Límite: este harness tiene un RP. Aislamiento de dos RPs está acreditado por el owner issuer en
`src/lib/auth-server/first-party/protocol.test.ts` de Greenhouse (`pnpm exec vitest run
src/lib/auth-server/first-party/protocol.test.ts --reporter=dot`): segundoRP synthetic-rp con code/IDtokenES256,
audiencia exacta e introspection propia activa/ajena inactiva, más códigoA rechazado por B sin consumirlo.
No se presenta como segundo producto desplegado.

## PostgreSQL y rollback

Migración CLI `1792964148932_rooms-oidc-consumer.sql` aplicada local. Clone completo con ACL y14 hashes iguales;
se vaciaron las4 tablas auth sólo EN EL CLON antes de down, y node-pg-migrate retiró/recreó exactamente esa
migración. Constraints y privilegios idénticos; runtime no escribe bindings/principals/memberships. Las10 tablas
previas de negocio/autoridad y el source permanecieron intactos. Auth snapshot durante prueba:198 eventos,
116 transacciones,73 bindings,58 sesiones (fixtures acumuladas; no valores esperados permanentes).
Clone/dump/script temporal eliminados. Ningún down sobre rooms_local.

## Límites y continuidad

Bindings productivos requieren control plane/bootstrap autorizado; no están creados por callback. API/CLI
no acepta handle OIDC como bearer comercial. Sesión por correo de invitación2066 es guest limitada y distinta:
proofOTP2067 no crea SSO global. Falta UI de selección/recovery, DB cloud, RP/secret/redirect productivos y
canary antes de activar humanos. Se conservan OFF y demo sintética. EPIC-052 sigue abierto.

Smoke build optimizado OFF: /demo200, /login503disabled, /api/auth/session503disabled, API de negocio401. Ninguna activación global ni movimiento del aliasVercel.
