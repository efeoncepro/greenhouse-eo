# Dos RP locales — adapters Rooms y emisor Auth real

**PASS: 35 comprobaciones**, 28 de octubre de 2026. Rooms
`codex/rooms-design-integration@8750750`, Auth `codex/auth-focused-main-candidate@e7b127647`.
[Recibo saneado](2026-10-28-two-rp-auth-adapters.json). ESLint focal y TypeScript PASS.

## Implementación y ejecución

Nuevo arnés `scripts/auth-two-rp-integration.ts`, sin cambiar módulos productivos, callbacks o DTOs.
Instancia `createAuthHttp(config, createAuthService(config))` dos veces con configuraciones explícitas,
clientId/secret/callback distintos y PostgreSQL de Rooms compartido pero efímero. No alterna env global
ni usa root-runtime para configurar los RP.

- RP1: `http://127.0.0.1:19335`; cliente `efeonce-rp-rooms-local`.
- RP2 fixture: `http://localhost:19337`; cliente `efeonce-rp-second-local`.
- Issuer: `http://127.0.0.1:19334`, implementación Auth real y sesión PostgreSQL.

El host distinto separa cookies: puertos distintos por sí solos no ofrecen esa separación. RP2 escucha
sólo en127.0.0.1 y::1, nunca en wildcard. El navegador permite únicamente esos tres origins.
La clave de cifrado se comparte deliberadamente **sólo en QA**: el rechazo no depende únicamente
de claves distintas, también se ejercitan el binding client/redirect y AAD del consumer.

Con cluster Rooms PG18 desechable/puerto dinámico, roles runtime/migrator sin privilegios altos y ocho
migraciones aplicadas, ejecutar en entorno con allowlist de tooling, sin secretos cloud/proveedor:

```sh
# Auth: registra realmente ambos clientes y escribe credenciales sólo en fixture0600.
python3 scripts/qa/verify-auth-first-party-local-pg.py --serve --second-rp-redirect-uri http://localhost:19337/auth/callback --port 19334 --redirect-uri http://127.0.0.1:19335/auth/callback
# Rooms: ROOMS_RUNTIME_PROFILE=local y URLs de su PG temporal sólo en entorno privado.
node --conditions=react-server --import tsx scripts/auth-two-rp-integration.ts --issuer-fixture <ruta-absoluta-privada>
```

## Qué pasó

Un solo BrowserContext recibe una única sesión del issuer mediante control de fixture y conserva su
cookie sin renovarla. Ambos RP aceptan su login legítimo por redirects reales, validan el JWT/handle
mediante los servicios Rooms y resuelven su autoridad sintética en PostgreSQL.

En ambos sentidos RP1→RP2 y RP2→RP1:

1. La cookie de sesión se copia explícitamente al host ajeno; `/api/auth/session` devuelve401.
2. Logout desde el RP ajeno con esa cookie no revoca la sesión del propietario.
3. Se inicia una transacción nueva por HTTP y se recibe del issuer el callback/code para el RP dueño.
4. Se copian callback y cookie de transacción al otro host: respuesta400 invalid_transaction.
5. SQL de Rooms comprueba que esa transacción original sigue sin consumirse; completar el callback
   en su RP dueño aún funciona. El control positivo evita confundir una transacción inválida con aislamiento.

Los dos logins legítimos coexisten al final. También se verificó que la cookie RP1 no se comparte
automáticamente con el host RP2. Cookies/códigos/secretos y URLs de callback permanecen sólo en RAM;
sin storageState en disco, trace, video ni capturas con secretos. El reporte contiene nombres de checks.

## Alcance y límites

Cierra la brecha **local de dos adapters consumer reales con navegador y issuer Auth real**, ampliando
los [tres casos de persistencia previos](2026-10-28-cross-rp-persistence-focal.md). RP2 es un arnés del
mismo código consumer Rooms, no otro producto independiente o aplicación Next completa. No acredita
HTTPS/Secure/__Host- en producción, MFA humana/Microsoft, entitlements entre productos, gateway/MCP,
la nueva UI Claude Design ni un rollout. La autoridad/datos son sintéticos y la sesión issuer se prepara
por un endpoint privado de QA. El SSO legítimo común sí está permitido; las sesiones propias del producto
no son intercambiables. No se declara aislamiento productivo integral por este ensayo local.

Los dos PG fueron efímeros y eliminados. Puertos19334/19335/19337 (IPv4+IPv6 de localhost) y PG temporal
libres; bindings/sesiones propios revocados antes de retirar Rooms. Checkout limpio tras el commit.
Sin correo, push, merge, deploy, flags productivos ni nuevo canary. No se repitió full suite por este
arnés de QA; lint/types y la ejecución directa son los gates proporcionales.
Contrato dueño: [entrada RP, sesiones y consentimiento](../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md).
