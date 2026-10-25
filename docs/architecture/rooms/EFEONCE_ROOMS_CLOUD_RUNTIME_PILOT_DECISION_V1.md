# Efeonce Rooms — cloud runtime y piloto controlado

- Status: `Accepted`
- Date: `2026-10-25`
- Owner: `Rooms / Platform; coordinación de RP y OTP con Efeonce Auth`
- Scope: `TASK-2069; PostgreSQL Rooms, Vercel, WIF, secretos y activación controlada`
- Reversibility: `two-way-but-slow`
- Confidence: `medium`
- Validated as of: `2026-10-25; adapter7276df9, QA171PASS y WIF/SA/secretos preparados OFF; DB y canary pendientes`

## Context

Rooms tiene persistencia, OIDC e invitaciones verificadas localmente, pero su configuración PostgreSQL
sólo acepta `127.0.0.1:55432/rooms_local`. Una variable de conexión remota no habilita producción.
La demo pública tampoco acredita DB cloud, registro RP, entrega de correo ni acceso real.

La arquitectura Rooms permite compartir infraestructura gestionada con credenciales y dominio propios.
El precedente Greenhouse usa Vercel OIDC → WIF → Cloud SQL Connector, sin claves estáticas de servicio.
Compartir la instancia preserva un riesgo común de conexiones, capacidad, mantenimiento y recuperación.
El inventario histórico se complementa con el readback de raíz del 25-10-2026: instancia RUNNABLE,
POSTGRES_16, us-east4, db-custom-1-3840, ZONAL; backup/PITR habilitados, authorizedNetworks vacía,
sslMode ENCRYPTED_ONLY, connectorEnforcement NOT_REQUIRED. Monitoring num_backends de24h produjo288
puntos sin paginación: suma conservadora de máximos por serie en ventanas de5min, pico42 y último36
a `2026-10-25T22:05:04.256081Z`. No equivale a conteo SQL instantáneo ni prueba de capacidad bajo carga.
Readback SQL posterior mediante wrapper canónico y transacción READ ONLY: PostgreSQL16.14,
max_connections100, superuser_reserved_connections3, reserved_connections0 y10 conexiones instantáneas.
Confirma97 utilizables; no sustituye la serie histórica ni garantiza capacidad de CPU/IO.

## Decision

Topología aceptada para implementación bajo el goal y la autorización humana de infraestructura/piloto
verificados en peer Auth; provisioning y activación conservan los gates de TASK-2069:

| Recurso | Configuración propuesta |
| --- | --- |
| Proyecto GCP | `efeonce-group` |
| Instancia candidata | `efeonce-group:us-east4:greenhouse-pg-dev`; reutilización condicionada a capacidad y postura verificadas |
| Base / schema | `rooms_production` / `rooms` |
| Rol runtime | `rooms_runtime`; DML exacto de las migraciones Rooms, sin ownership |
| Rol migrador | `rooms_migrator`; owner de base/schema Rooms, fuera del runtime Vercel |
| SA runtime candidata | `rooms-runtime-production@efeonce-group.iam.gserviceaccount.com` |
| WIF | Principal del proyecto Vercel Rooms, ambiente Production exclusivamente; no wildcard de previews |
| Conexión | Cloud SQL Connector con WIF y credencial PostgreSQL propia; sin abrir authorizedNetworks |
| Pool | Máximo dos conexiones por isolate; CONNECTION LIMIT8 runtime y1 migrator propuestos para canary |
| Región Functions | Candidata `iad1` próxima a SQL/Auth en `us-east4`; medir antes de sustituir `gru1` actual |
| Origin inicial | `https://efeonce-rooms.vercel.app` |
| RP coordinado | `efeonce-rp-rooms-production` |

WIF aislado en pool `rooms-vercel`, provider `production`, proyecto numérico `183008134038`.
Issuer `https://oidc.vercel.com/efeonce-7670142f`, audience `https://vercel.com/efeonce-7670142f`,
subject `owner:efeonce-7670142f:project:efeonce-rooms:environment:production`. Condition exige también
project_id `prj_9iaZv8FXdhvtC68r30OS3H4o3iJo`, owner_id `team_gmNiF4YCHmc1wqsHUTCvqjmN` y production.
Readback Vercel confirma OIDC enabled/issuerMode team. No reutilizar provider Greenhouse ni ampliarlo.

### Identidades y privilegios

Ambos logins PostgreSQL quedan `NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`,
sin herencia ni membresías `greenhouse_*` o `cloudsqlsuperuser`. La creación inicial de DB/roles pertenece
al control administrativo; no se concede esa potestad al migrador diario. Se propone `CONNECTION LIMIT 8`
para runtime y `1` para migrator a partir del readback anterior. Antes de aplicar, comprobar límites SQL
actuales y reserva operativa; validar el presupuesto en canary y revisarlo ante cambios de carga.
No cambiar max_connections global ni límites de otros roles. El límite de rol acota conexiones, no
garantiza throughput ni evita saturación de CPU/IO de la instancia compartida.

Revocar privilegios PUBLIC en la nueva base/schema y conceder CONNECT sólo a sus carriles autorizados.
Auditar además acceso efectivo a otras bases: una base separada no elimina los grants PUBLIC vecinos.
No alterar grants globales de Greenhouse incidentalmente. Las 19 tablas Rooms conservan grants mínimos,
triggers de inmutabilidad y separación entre lectura runtime de identidad y bootstrap administrativo.
No añadir grants generales sobre futuras tablas para facilitar migraciones.

La SA runtime sólo obtiene Cloud SQL Client y lectura de sus secretos individuales. WIF autentica GCP;
el login/password y ACL PostgreSQL gobiernan datos. No Cloud SQL Admin, SA keys, credenciales Resend ni
acceso de Rooms a tablas Auth. El issuer consulta autoridad Rooms por HTTP, nunca por conexión SQL cruzada.

### Secretos y configuración

Los siguientes seis secretos están creados en versión1; cinco de consumo runtime y uno exclusivo de
tooling migrador. Client-secret fue registrado por el peer Auth; raíz creó los otros cinco. Readback
verificó valores sin imprimirlos y acceso IAM por recurso. No equivale a consumo exitoso desde Vercel:

| Secret Manager ID propuesto | Consumer |
| --- | --- |
| `rooms-production-postgres-runtime-password` | Connector/pool Rooms runtime |
| `rooms-production-postgres-migrator-password` | Tooling de migraciones exclusivamente |
| `rooms-production-auth-client-secret` | `ROOMS_AUTH_CLIENT_SECRET` |
| `rooms-production-auth-encryption-key` | `ROOMS_AUTH_ENCRYPTION_KEY` |
| `rooms-production-invitation-encryption-key` | `ROOMS_INVITATION_ENCRYPTION_KEY` |
| `rooms-production-invitation-authority-token` | `ROOMS_INVITATION_AUTHORITY_TOKEN` y consumer S2S del issuer |

Usar referencias a versiones explícitas y resolverlas efectivamente en servidor. El contrato nuevo del
adapter puede exponer `ROOMS_POSTGRES_PASSWORD_SECRET_REF` para runtime y
`ROOMS_POSTGRES_MIGRATOR_PASSWORD_SECRET_REF` sólo en tooling; los cuatro nombres existentes reciben
su correspondiente sufijo `_SECRET_REF`. El adapter7276df9 implementa resolución efectiva de refs; declarar una referencia o conceder IAM
por sí solo no monta su valor. Construir servicios sólo tras resolver la
configuración, con errores sanitizados y cache acotada. Nunca usar `NEXT_PUBLIC_*` para estos valores.

El perfil cloud usa nombre de instancia, DB, usuario y WIF explícitos; no admite fallback a `.local`,
ADC del desarrollador ni SA JSON en Production. Preview genérico no recibe acceso a DB o secretos de
producción. Las claves AES-GCM de auth e invitaciones son independientes; una rotación requiere preservar
descifrado de registros vigentes o invalidarlos mediante procedimiento gobernado. No rotar destruyendo
la única clave recuperable. Ningún valor aparece en logs, artefactos, URLs de comandos o documentación.

### RP y autoridad S2S

- Issuer: `https://auth.efeonce.org`; redirect exacto `https://efeonce-rooms.vercel.app/auth/callback`.
- `ROOMS_AUTH_ORIGIN=https://efeonce-rooms.vercel.app`; `ROOMS_AUTH_ALLOW_LOCAL_DEVELOPMENT=false`.
- RP confidencial `efeonce-rp-rooms-production`, registrado y habilitado para OTP explícitamente.
- Resolver fijo: `https://efeonce-rooms.vercel.app/api/internal/auth/invitation-authority/resolve`.
- `X-Efeonce-Audience` exacta `https://efeonce-rooms.vercel.app`; Bearer dedicado distinto del secreto RP.
- Preservar validación de issuer/origin/client, ausencia de cookies/Origin en S2S, no redirects y no-store.

El cambio posterior a `rooms.efeonce.org` es una migración coordinada de RP, realm persistido y cookies
host-only; no es un alias transparente. El dominio definitivo de producto no se modifica con este piloto.

## Alternatives Considered

| Alternativa | Evaluación |
| --- | --- |
| Base propia en Cloud SQL existente | Preferida para piloto, sólo si headroom, aislamiento y recuperación pasan |
| Instancia dedicada | Reabrir si capacidad, aislamiento operativo o recuperación compartida impiden el gate; requiere coste y aprobación propios |
| Reutilizar `greenhouse_app` o sus schemas | Rechazada: autoridad amplia, ownership ajeno y riesgo de writes cruzados |
| PostgreSQL por IP abierta o SA JSON en Vercel | Rechazada: hay precedente Connector/WIF que evita esa ampliación |
| Continuar únicamente local/demo | Estado seguro actual, pero no prueba piloto auténtico ni entrega |

## Consequences

Se preserva independencia de dominio sin crear una instancia por inferencia. A cambio, el despliegue
necesita un adapter cloud nuevo, presupuesto de conexiones, coordinación Auth/Rooms y recuperación
comprobada. SQL local PostgreSQL18 no certifica compatibilidad con el PostgreSQL16 documentado del
candidato. Backups de una instancia compartida no son rollback selectivo automático de Rooms.

## Runtime Contract

Owners en `../efeonce-rooms`: `src/server/persistence/config.ts`, `pool.ts`, configuración auth/invitations,
`scripts/db-migrate.ts`, migraciones y tests. DB/provider/secrets permanecen server-only. Commands/readers,
can, tenancy, idempotencia y proyecciones existentes conservan semántica; no se crea una API de negocio
alternativa ni se activa bearer CLI usando handles OIDC. El catálogo MCP no se amplía.

Flags `ROOMS_FIRST_PARTY_AUTH_ENABLED=false` y `ROOMS_INVITATIONS_ENABLED=false` durante preparación.
El canary requiere habilitación temporal explícita y acotada para ejercer el flujo; hasta aprobarlo no
se declara activación estable. Si falla, volver a OFF y revocar exclusivamente recursos run-owned.

## Gates y evidencia requerida

1. Readback actual de engine, conexiones/picos, tier, backups/PITR y costes; región y presupuesto aprobados.
2. Migraciones y pruebas de transacciones/concurrencia en la versión SQL objetivo; rollback en clon,
   restore de 19 tablas, ACL/constraints/triggers y hashes verificados. Nunca down en la base viva.
3. Prueba negativa de roles, cross-DB y WIF desde Preview/proyecto ajeno; ausencia de SA key y credencial migrator en Vercel.
4. Smoke real Vercel → WIF → Connector → DB; ausencia de secretos en errores/bundle/logs; presión acotada,
   renovación de conexiones y recuperación tras fallo. No reintentar comandos después de COMMIT incierto.
5. RP/redirect/audience/S2S coherentes; bootstrap explícito de bindings internos, nunca email-match automático.
6. Perímetro WAF aplicado y verificado según documento dueño; sin challenge en S2S, rate limit no eludible
   mediante headers de cliente. El limitador SQL no sustituye protección previa a la conexión.
7. Canary coordinado OIDC/OTP/revocación/tenancy/flagsOFF y recuperación. Correo real sólo al destinatario
   y alcance autorizados; separar aceptación de proveedor, recepción, lectura y acceso efectivo.
8. Documentar deployment exacto, configuración redactada, coste observado, límites y rollback ensayado.

## Revisit When

No hay capacidad reservable; pool/rol rechazan tráfico legítimo; aumenta latencia o coste; recuperación
compartida incumple el objetivo acordado; cambia región/engine/origin; WIF deja de restringir el entorno;
o el piloto solicita una cohorte nueva. Cada caso exige revisión, no ampliación silenciosa.

## Sources

- [Arquitectura Rooms](EFEONCE_ROOMS_ARCHITECTURE_V1.md).
- [Cloud SQL](../cloud-infrastructure/CLOUD_SQL.md), [topología](../cloud-infrastructure/TOPOLOGY.md), [secretos](../cloud-infrastructure/SECRETS.md).
- [Postura de seguridad](../GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md), [acceso PostgreSQL](../GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md), [pooling](../GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md).
- [Auth Rooms-first](../EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md), [OTP](../EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md).
- [Perímetro Rooms](../../operations/ROOMS_VERCEL_INVITATION_PERIMETER_V1.md), [TASK-2069](../../tasks/to-do/TASK-2069-rooms-cloud-runtime-controlled-pilot.md).

Autorización: operador indicó usar jreyes@efeoncepro.com y continuar coordinado con peer Auth después
del goal de producción controlada. No amplía clientes ni migración Greenhouse. El peer Auth crea
rooms-production-auth-client-secret y HMACOTP propio; Rooms posee las otras cinco refs para evitar duplicación.
