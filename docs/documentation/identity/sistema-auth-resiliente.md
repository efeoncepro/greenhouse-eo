# Sistema de Autenticación Resiliente

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-05-01 por Claude (TASK-742, ISSUE-061)
> **Documentación técnica:** [GREENHOUSE_AUTH_RESILIENCE_V1.md](../../architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md), [GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md)

---

## La idea central

Cuando alguien intenta entrar a Greenhouse con Microsoft o Google y algo falla — un secreto que se rotó mal, una configuración que cambió en Azure, un servicio caído — el portal **no puede quedar mudo**. Antes de mayo 2026, cuando algo así pasaba, el usuario veía un mensaje genérico ("?error=Callback") y el equipo se enteraba sólo cuando alguien lo reportaba. En el incidente del 2026-04-30, eso significó que **17 días pasaron con SSO completamente roto** sin que nadie del lado de Efeonce lo supiera.

Hoy el portal tiene **7 capas defensivas** que detectan, alertan, observan, recuperan y previenen este tipo de incidentes antes de que un humano los reporte.

---

## Las 7 capas, en lenguaje simple

### Capa 1 — Higiene de secretos

Antes de aceptar un secreto crítico (la llave que firma sesiones, el secreto de Azure, el de Google), el sistema verifica que **tenga la forma correcta**: longitud razonable, sólo caracteres válidos, sin espacios accidentales, sin comillas envolventes.

Si alguien rota un secreto con un error de formato (por ejemplo pega comillas sin querer), el sistema **lo rechaza inmediatamente** y avisa por Sentry, en vez de aceptarlo y romper login horas después.

### Capa 2 — Contrato de "estoy listo para autenticar"

El portal expone un endpoint público (`/api/auth/health`) que dice, para cada proveedor (Microsoft, Google, email/password):

- ¿Está **listo** para usarse?
- ¿Está **degradado** (configurado pero falla algo)?
- ¿Está **sin configurar**?

La pantalla de login lee esto cada vez que se abre. Si Microsoft está degradado, en vez de mostrar el botón "Entrar con Microsoft" que va a fallar, **muestra una alerta amarilla**: "Microsoft SSO temporalmente no disponible. Usa email y contraseña, o pide un link mágico". El usuario nunca ve un error opaco — siempre tiene un camino claro.

### Capa 3 — Observabilidad estructurada

Cada intento de entrar al portal — exitoso o fallido — queda registrado en una tabla append-only `auth_attempts`. Para cada intento se guarda:

- **Qué proveedor** (credentials, Microsoft, Google, magic-link)
- **Qué etapa falló** (lookup de usuario, validación de password, exchange de token, callback)
- **Qué razón** (`tenant_not_found`, `invalid_password`, `oid_mismatch`, `callback_exception`, etc.)
- **Cuándo** (timestamp + request_id)

La PII (email, IP, user-agent, OID Microsoft) **se redacta**: del email sólo se guardan los primeros 2 caracteres, del IP/UA un hash sha256, del OID los primeros 4 + últimos 4 caracteres.

Esto permite responder preguntas como "¿qué le pasa a Daniela cuando intenta entrar?" sin revelar PII y sin tener que esperar a que alguien lo reporte por chat.

### Capa 4 — Integridad del modelo de datos

Antes había usuarios con configuraciones imposibles: por ejemplo `auth_mode='both'` (puede usar password y SSO) pero `password_hash=NULL` (no tiene password real). Cuando uno de esos usuarios intentaba password login, el portal decía "Email o contraseña incorrectos" sin pista de que el problema era estructural, no del password.

La base ahora **prohíbe esos estados** con una restricción CHECK (`client_users_auth_mode_invariant`). Estados válidos:

- `credentials` o `both` → debe haber password_hash
- `microsoft_sso` → debe haber microsoft_oid
- `google_sso` → debe haber google_sub
- `sso_pending`, `password_reset_pending`, `invited` → estados transicionales sin credentials

Daniela Ferreira tenía `auth_mode='both'` sin password (su única vía real era SSO). El backfill la corrigió a `microsoft_sso`.

### Capa 5 — Recuperación sin operador (magic-link)

Cuando un usuario está atrapado — SSO roto, sin password, no puede contactar al admin — puede ir a `/auth/magic-link`, ingresar su email, y recibir un correo con un enlace de un solo uso que vale 15 minutos. Hace clic, queda autenticado.

Esto es exactamente lo que **debió haber existido el 2026-04-30** para que Daniela y los demás usuarios internos pudieran entrar sin esperar al operador.

Propiedades de seguridad:
- El token nunca se guarda en plano — sólo `bcrypt(token)`.
- Un solo uso, 15 min de vida.
- Cooldown de 60s por usuario.
- Anti-enumeración: respuesta idéntica para email registrado vs no registrado.

### Capa 6 — Smoke lane sintética (chequeo automático cada 5 min)

Un servicio de Cloud Run (`ops-worker`) corre 4 chequeos cada 5 minutos:

1. ¿`/api/auth/health` del portal responde "listo"?
2. ¿El endpoint de descubrimiento OIDC de Microsoft responde 200?
3. ¿La firma+verificación de un JWT con `NEXTAUTH_SECRET` funciona?
4. **¿El endpoint real de autorización de Microsoft acepta el client_id de Greenhouse?** — Esta es la prueba que detecta exactamente el modo de falla del 2026-04-30 (alguien cambia `signInAudience` y rompe multi-tenant).

Si cualquiera de los 4 falla, queda registrado en `smoke_lane_runs` con `lane_key='identity.auth.providers'` y se emite alerta a Sentry con dominio `identity`.

### Capa 7 — Rotación segura de secretos + auditor de Azure

Dos comandos canónicos:

- **`pnpm secrets:audit`** — escanea los 8 secretos críticos y reporta hygiene, fuente (env vs Secret Manager), expiración. Falla con exit 1 si encuentra algo degradado.
- **`pnpm secrets:rotate <secret-id>`** — rota un secreto con verify-before-cutover:
  1. Valida formato (Capa 1) antes de subir nada
  2. Sube versión nueva con el patrón canónico (sin shell quoting)
  3. Dispara redeploy del consumer (Vercel o Cloud Run)
  4. Espera hasta que `/api/auth/health` reporte "ready" (timeout 5 min)
  5. Si falla → revierte automáticamente; nunca deja prod en estado verificación pendiente
- **`pnpm auth:audit-azure-app`** — verifica con Azure CLI que la configuración de la App Registration sigue intacta:
  - `signInAudience = AzureADMultipleOrgs` (multi-tenant — REGLA DURA)
  - Las dos redirect URIs canónicas registradas
  - Secret cliente con >30 días de TTL
  - Tenant correcto

---

## Qué hacer cuando un usuario reporta "no puedo entrar"

### Paso 1 — Verifica `auth_attempts`

```sql
SELECT attempted_at, provider, stage, outcome, reason_code, reason_redacted
FROM greenhouse_serving.auth_attempts
WHERE user_id_resolved = 'user-...' OR email_redacted LIKE 'da***@%'
ORDER BY attempted_at DESC
LIMIT 10;
```

Esto te dice **exactamente** qué etapa falló y por qué. No más adivinanzas.

### Paso 2 — Si todos los users fallan en la misma etapa

Es un problema sistémico, no individual. Mira:

- `pnpm auth:audit-azure-app` — si reporta `fail`, el problema está en la Azure App
- `pnpm secrets:audit` — si reporta degraded, hay un secreto roto
- Sentry domain=identity — el error real está ahí

### Paso 3 — Si un solo user falla con `tenant_not_found`

El usuario no está provisionado o su `microsoft_oid` no está linkeado. Revisa `client_users` y considera linkearlo manualmente o pedir reaprovisionamiento.

### Paso 4 — Como salida de emergencia

Si SSO está roto y el usuario no puede esperar, dirígelo a `/auth/magic-link`. Funciona aunque Microsoft esté caído.

---

## Reglas duras (no las rompas)

- **Greenhouse es multi-tenant**. La Azure App debe estar en `signInAudience = AzureADMultipleOrgs`. Cambiar a `AzureADMyOrg` rompe el SSO de todos los clientes externos. La autorización fina (qué tenants entran) vive en Greenhouse, no en Azure.
- Las dos redirect URIs canónicas son `https://greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (production) y `https://dev-greenhouse.efeoncepro.com/api/auth/callback/azure-ad` (staging). No las elimines.
- No rotes secretos manualmente. Usa `pnpm secrets:rotate` con `--validate-as` y `--health-url`.
- No expongas `Sentry.captureException` directo en código de auth — usa `captureWithDomain(err, 'identity', { extra: { provider, stage } })` para que el subsistema Identity haga rollup.
- El raw token de un magic-link **nunca** se persiste — sólo `bcrypt(token)`.

---

## Por qué esto importa

Antes del 2026-05-01, el sistema de auth era frágil. Una configuración mal hecha en Azure podía romper login para todos los usuarios y nadie se enteraba hasta que alguien lo reportaba — pasaron 17 días así.

Hoy, el mismo cambio se detectaría:

- En **<5 minutos** por la smoke lane (Capa 6)
- Con la **causa exacta** en `auth_attempts` (Capa 3)
- **Sin que el usuario vea un error opaco** (Capa 2 muestra warning accionable)
- **Sin necesidad de operador** porque cualquier user atrapado puede entrar via magic-link (Capa 5)
- **Imposible de re-introducir por descuido** porque `pnpm auth:audit-azure-app` lo bloquea en CI (Capa 7)

---

## Para profundizar

> **Detalle técnico:** [GREENHOUSE_AUTH_RESILIENCE_V1.md](../../architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md) — spec canónica con todos los detalles de implementación, contratos, tablas, endpoints, comandos.

> **Caso de incidente:** [ISSUE-061](../../issues/resolved/ISSUE-061-microsoft-sso-callback-rejection-multitenant-drift.md) — postmortem completo del incidente del 2026-04-30 que motivó este sistema.

> **Implementación:** [TASK-742](../../tasks/complete/TASK-742-auth-resilience-7-layers.md) — plan ejecutivo y verificación end-to-end.
