# Rooms — Operar producción

> **Tipo de documento:** Manual de uso
> **Version:** 1.2
> **Creado:** 2026-10-31 por Claude
> **Ultima actualizacion:** 2026-11-02 por Claude (carril CLI de agentes)
> **Documentacion tecnica:** [Dossier de Rooms](../../architecture/rooms/README.md) · [ADR acceso interno durable](../../architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md) · [Recibo de activación](../../audits/rooms/2026-10-31-production-activation.md) · [Recibo de acceso durable](../../audits/rooms/2026-10-31-durable-access-production.md)

## Para qué sirve

Operar Rooms en producción tal como quedó el 2026-11-02: confirmar qué deploy está sirviendo, dejar el dominio
público apuntando al deploy correcto, saber dónde vive cada interruptor, aplicar una migración con su respaldo,
deshacer la activación si hace falta y resolver a una persona que no puede entrar.

Rooms está encendido para el equipo de Efeonce. Todavía no hay clientes reales: el primero necesita una autorización
nueva.

## Antes de empezar

- Un checkout de `efeoncepro/efeonce-rooms` con Vercel CLI autenticado en el equipo `efeonce-7670142f`. El proyecto
  es `prj_9iaZv8FXdhvtC68r30OS3H4o3iJo`. Pasa siempre `--scope efeonce-7670142f`.
- `gcloud` con acceso al proyecto `efeonce-group` (región `us-east4`) para Efeonce ID.
- `gh` autenticado contra `efeoncepro/greenhouse-eo` para las variables del workflow de Efeonce ID.
- `pnpm pg:connect:shell` en este repo para la configuración de correos de Greenhouse.
- Autorización explícita del operador para cualquier cambio en producción: flags, alias, tráfico o datos.

## Paso a paso

### 1. Ver qué deploy sirve el dominio público

```bash
vercel inspect efeonce-rooms.vercel.app --scope efeonce-7670142f
```

Compara el id del deploy y su commit con el último deploy de producción:

```bash
vercel ls efeonce-rooms --prod --scope efeonce-7670142f
```

Al 2026-11-02 el dominio sirve el deploy `dpl_2CTf9RddsGRSkE3y6XxU5hhZcVzt` (PR #23, `3434ea8`), con el carril CLI
de agentes encendido. Antes: `efeonce-rooms-15djjyfz2` (redeploy con el carril encendido sobre PR #22 `main@9a4340a`).

Comprobación sin sesión:

- `/rooms` y `/rooms/:id/actividad` responden **307** a `/login?returnTo=…` (con `Cache-Control: private, no-store`);
  un 200 con «Cargando la sala…» es la regresión de
  [ISSUE-188](../../issues/resolved/ISSUE-188-rooms-anonymous-entry-rsc-redirect-flash.md);
- `/auth/error` responde 200;
- `/api/auth/session` responde 401;
- `/login?returnTo=/rooms` redirige 302 a `auth.efeonce.org/oauth/authorize`.

```bash
curl -sI https://efeonce-rooms.vercel.app/rooms | grep -iE '^(HTTP|location|cache-control)'
```

### 2. Reasignar el alias manual después de cada deploy

`efeonce-rooms.vercel.app` es un **alias manual**: no sigue a producción. Cada vez que se publica un deploy nuevo
(merge a `main`, redeploy por cambio de flags o rollback), el dominio sigue en el anterior hasta que lo muevas:

```bash
vercel alias set <url-o-id-del-deploy> efeonce-rooms.vercel.app --scope efeonce-7670142f
```

Después repite el paso 1 y confirma que el id cambió. Para probar como visitante usa siempre
`efeonce-rooms.vercel.app`. El alias del equipo (`efeonce-rooms-efeonce-7670142f.vercel.app`) tiene SSO de Vercel.

### 3. Dónde viven los interruptores

| Lugar | Qué controla | Estado al 2026-10-31 |
|---|---|---|
| Vercel, proyecto `efeonce-rooms`, entorno Production | `ROOMS_FIRST_PARTY_AUTH_ENABLED`, `ROOMS_INVITATIONS_ENABLED`, `ROOMS_MEDIA_ENABLED`, `ROOMS_LIVE_ENABLED`, `ROOMS_MEDIA_DISPATCH_ENABLED` | `true` |
| Vercel, mismo entorno | `ROOMS_AUTH_ALLOW_LOCAL_DEVELOPMENT` (permiso sólo de desarrollo) | `false`; no se toca |
| Vercel, mismo entorno | `ROOMS_AGENT_LANE_ENABLED` (carril CLI de agentes) y sus cuatro variables `ROOMS_AGENT_*` | `true` desde el 2026-11-02 (paso 3b) |
| Efeonce ID, Cloud Run `auth-server` | `AUTH_SERVER_FIRST_PARTY_ENABLED`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED`, los dos secretos de invitación montados y `AUTH_SERVER_ROOMS_AUDIENCE` | Al 2026-11-02, revisión `auth-server-00172-zcn` (hotfix PR #267) con el 100 % del tráfico |
| Variables de repo de GitHub (`efeoncepro/greenhouse-eo`) | Las mismas variables de Efeonce ID, que lee `auth-server-deploy.yml` | Flags en `true` y la audiencia Rooms; el próximo deploy gobernado conserva el estado |
| Greenhouse PostgreSQL | `greenhouse_notifications.email_type_config`, tipo `auth_server_rooms_invitation_otp` (correo con el código) | `enabled=true` |

Lecturas:

```bash
vercel env ls production --scope efeonce-7670142f
gcloud run services describe auth-server --region us-east4 --project efeonce-group \
  --format='value(status.traffic)'
gh variable list --repo efeoncepro/greenhouse-eo
```

`vercel env ls` muestra nombres, no valores. Si necesitas leer valores, usa `vercel env pull` a un archivo temporal
y bórralo al terminar.

Un flag de Vercel nuevo o cambiado sólo aplica después de un redeploy. Ese redeploy vuelve a exigir el paso 2.

### 3b. Carril CLI de agentes (`ROOMS_AGENT_LANE_ENABLED`)

El carril deja que un agente opere Rooms por CLI con el login de una persona interna
([manual](operar-rooms-con-agentes-por-cli.md)). Necesita los dos lados encendidos:

| Lado | Variable | Valor en producción |
|---|---|---|
| Rooms (Vercel Production) | `ROOMS_AGENT_LANE_ENABLED` | `true` |
| Rooms | `ROOMS_AGENT_AUDIENCE` | `https://efeonce-rooms.vercel.app/api/v1` |
| Rooms | `ROOMS_AGENT_CLI_CLIENT_IDS` | `efeonce-rooms-cli` (los `azp` aceptados) |
| Rooms | `ROOMS_AGENT_INTROSPECTION_CLIENT_ID` | `efeonce-rooms-resource` |
| Rooms | `ROOMS_AGENT_INTROSPECTION_CLIENT_SECRET_SECRET_REF` | Secret Manager `rooms-production-agent-introspection-client-secret:1` (sólo en local va el secreto crudo) |
| Efeonce ID | `AUTH_SERVER_ROOMS_AUDIENCE` | La misma audiencia; vacía = Efeonce ID no emite tokens para Rooms |

**Prender** (con autorización del operador):

1. Confirma que Efeonce ID sirve la audiencia y tiene los dos clientes
   ([manual del autorizador](../identity/operar-autorizador-efeonce.md)).
2. `vercel env add` de las variables de Rooms en Production (`--scope efeonce-7670142f`).
3. Redeploy de producción y **reasigna el alias manual** (paso 2): sin eso el dominio sigue en un deploy con el carril
   apagado.

**Readback** (sin sesión ni tokens reales):

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://efeonce-rooms.vercel.app/.well-known/oauth-protected-resource
# 200 (con audiencia, emisor y cliente) = encendido · 404 = apagado
curl -s -o /dev/null -w '%{http_code}\n' -H 'Authorization: Bearer falso' \
  https://efeonce-rooms.vercel.app/api/v1/rooms
# 401 = el verificador rechaza un bearer falso (falla cerrado)
```

**Apagar**, del corte más acotado al más amplio; cualquiera surte efecto en menos de 30 s:

1. `ROOMS_AGENT_LANE_ENABLED=false` en Vercel, redeploy y alias. La metadata vuelve a 404.
2. Suspender el cliente `efeonce-rooms-cli` en Efeonce ID: corta todas las CLIs de todas las personas.
3. Vaciar `AUTH_SERVER_ROOMS_AUDIENCE` (variable de repo GitHub + deploy gobernado de Efeonce ID).

Ninguno de los tres corta el acceso de las personas por navegador.

### 4. Deshacer la activación (rollback, unos 2 minutos)

Hazlo sólo con autorización del operador y anota cada lectura en un recibo fechado bajo `docs/audits/rooms/`.

**Efeonce ID:**

1. Variables de GitHub en `false`:

   ```bash
   gh variable set AUTH_SERVER_FIRST_PARTY_ENABLED --body false --repo efeoncepro/greenhouse-eo
   gh variable set AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED --body false --repo efeoncepro/greenhouse-eo
   ```

2. Tráfico a la revisión anterior, que tiene los dos flags apagados y no monta los secretos de invitación:

   ```bash
   gcloud run services update-traffic auth-server --region us-east4 --project efeonce-group \
     --to-revisions auth-server-00168-vzb=100
   ```

3. Correo del código apagado, desde `pnpm pg:connect:shell`:

   ```sql
   UPDATE greenhouse_notifications.email_type_config
      SET enabled = false, paused_reason = 'rollback <fecha>'
    WHERE email_type = 'auth_server_rooms_invitation_otp'
   RETURNING email_type, enabled;
   ```

**Rooms:**

1. Los cuatro flags activados el 2026-10-31 en `false`: `ROOMS_FIRST_PARTY_AUTH_ENABLED`,
   `ROOMS_INVITATIONS_ENABLED`, `ROOMS_MEDIA_ENABLED` y `ROOMS_LIVE_ENABLED`.
2. Redeploy de producción.
3. Reasigna el alias al deploy nuevo (paso 2) y confirma con el paso 1.

Para volver atrás el **código** sin tocar flags: revierte el merge y redeploy, o reasigna el alias al deploy
anterior (búscalo con `vercel ls efeonce-rooms --prod --scope efeonce-7670142f`). Antes, confirma que las migraciones
aplicadas después de ese deploy son aditivas (expand); las del 2026-10-31 y la del nombre del espacio
(`1793267`) lo son, así que el código anterior funciona con ellas.

### 5. Aplicar una migración a `rooms_production`

`rooms_production` vive en la instancia compartida `greenhouse-pg-dev`: un PITR de la instancia también
retrocedería Greenhouse. Por eso cada migración se ensaya en un clon y se aplica con un respaldo lógico previo del
esquema `rooms`. Orden, cada paso con autorización explícita del operador:

1. **Gate de migraciones revisadas, en el mismo PR.** La migración nueva entra en `REVIEWED_MIGRATIONS`
   (`scripts/design-integration/config.ts`). `pnpm test` lo exige (`tests/integration-env.test.ts`): sin eso,
   `pnpm integration:up` falla en el preflight con «Review exact migration inventory before integration bootstrap» y
   el deploy queda retenido ([ISSUE-187](../../issues/resolved/ISSUE-187-rooms-reviewed-migrations-inventory-blocked-deploy.md)).
2. **En local**, `pnpm db:migrate up` (sin `up`, `pnpm db:migrate` sólo muestra el estado) y `pnpm verify`.
3. **Ensayo en un clon:** `pnpm db:rehearse-production`. Debe terminar en PASS.
4. **Corrida en seco** contra producción: `pnpm db:migrate-production`. Lista aplicadas, pendientes y tablas.
5. **Aplicar** con el número exacto de pendientes que viste:

   ```bash
   ROOMS_EXPECT_PENDING=1 pnpm db:migrate-production --apply
   ```

   Antes del `up`, el script guarda un `pg_dump` del esquema `rooms` y del registro de migraciones en
   `./.local/production-backups/` (permisos `700`). Después relee: todas las migraciones aplicadas, hashes de las
   ediciones publicadas intactos y conteos de filas existentes sin cambios. Si cualquier lectura falla, se detiene.
6. **Merge, deploy y alias** (paso 2), y lectura del dominio (paso 1).
7. **Borra el respaldo** cuando el deploy quedó verificado: contiene datos de producción.

Nunca corras `down` contra producción. Si hay que volver atrás, se restaura desde ese respaldo.

### 6. Una persona del equipo no puede entrar (`identity_unbound`)

1. La persona entró con Efeonce ID, pero no tiene acceso en Rooms. Rooms le muestra la página «Casi.» con un
   **código de solicitud** de 8 caracteres (`XXXX-XXXX`), válido por 7 días.
2. Pídele ese código.
3. Un administrador le da acceso siguiendo
   [Administrar el acceso interno](administrar-acceso-interno.md). El acceso dura como máximo un año y se renueva.
4. La persona vuelve a entrar.

No des acceso con SQL. El SQL administrativo del 2026-10-31 fue una corrección puntual autorizada, antes de que
existieran los comandos `members.*`.

## Qué significan los estados y señales

| Señal | Qué significa |
|---|---|
| El dominio público sirve un deploy viejo | Falta reasignar el alias (paso 2). |
| `identity_unbound` o la página «Casi.» | La persona existe en Efeonce ID pero no tiene acceso vigente en Rooms. |
| `/api/auth/session` responde 401 sin sesión | Correcto. |
| `/rooms` sin sesión responde 307 a `/login` | Correcto: el proxy envía a Efeonce ID antes de pintar la página. |
| `integration:up` falla con «Review exact migration inventory…» | Una migración no está en `REVIEWED_MIGRATIONS` (paso 5.1). |
| El chequeo de drift de Efeonce ID marca `RESEND_API_KEY_SECRET_REF` | Esperado hasta el primer deploy gobernado: la revisión viva lo declara sin versión y el workflow pide `:1`. |
| `pnpm access:production health` sin señales | La organización tiene al menos un administrador con cobertura vigente. |
| `/.well-known/oauth-protected-resource` responde 404 | El carril CLI de agentes está apagado, o el alias apunta a un deploy anterior al encendido (paso 3b). |

## Qué no hacer

- **Nunca correr una migración `down` contra la base de producción** (`rooms_production`). Si hace falta volver
  atrás de verdad, se restaura desde el respaldo de la instancia.
- No asumir que un deploy READY ya está publicado: el alias manual no se mueve solo.
- No cambiar Efeonce ID con `gcloud run services update`. El 2026-10-31 se hizo una vez, y quedó documentado como
  regla rota. Los cambios van por el workflow gobernado y las variables de GitHub.
- No invitar a un cliente real: falta una autorización nueva, la revisión de seguridad TASK-1833 y medir la sala en
  vivo.
- No dejar en disco archivos de `vercel env pull` ni respaldos lógicos con datos de producción.
- No reabrir ni hacer merge de los PR #263/#264 de Efeonce ID: se cerraron sin merge el 2026-11-01, superados por el release; cualquier cambio de Efeonce ID va por su propio release.

## Problemas comunes

| Problema | Causa probable | Qué hacer |
|---|---|---|
| Cambié un flag y no pasa nada | Falta redeploy o falta mover el alias | Redeploy y paso 2. |
| La persona ve «Casi.» después de que le diste acceso | Su acceso venció o no se aplicó al principal correcto | Revisa con `pnpm rooms members` según el [manual de acceso](administrar-acceso-interno.md). |
| El login redirige pero Efeonce ID no muestra la pantalla propia | La revisión con tráfico no tiene first-party encendido | Paso 3: revisa el tráfico de `auth-server`. |
| El código por correo no llega | Tipo de correo apagado o flag OTP apagado | Revisa `email_type_config` y la revisión de `auth-server`. |
| No puedes probar en el alias del equipo | Tiene SSO de Vercel | Usa `efeonce-rooms.vercel.app`. |
| `pnpm db:migrate up` falla en local por una migración desconocida | Tu PG local corrió una rama sin merge (caso `1793266`, rama `claude/rooms-media-import`) | Trae ese archivo temporalmente o usa una base desechable; no borres filas de `rooms_migrations` a mano. |
| El encabezado dice «Espacio de trabajo» | La organización no tiene nombre o la base no respondió | [Nombrar el espacio de trabajo](nombrar-espacio-de-trabajo.md). |

## Referencias técnicas

- [Dossier de Rooms: estado vigente y próximos pasos](../../architecture/rooms/README.md)
- [Recibo de activación y rollback](../../audits/rooms/2026-10-31-production-activation.md)
- [Recibo de acceso durable](../../audits/rooms/2026-10-31-durable-access-production.md)
- [Migraciones aplicadas](../../audits/rooms/2026-10-31-production-migrations-applied.md) y
  [ensayo](../../audits/rooms/2026-10-31-production-migration-rehearsal.md)
- [Administrar el acceso interno](administrar-acceso-interno.md)
- [Operar Rooms con agentes por CLI](operar-rooms-con-agentes-por-cli.md) · [ADR, enmienda D1-bis](../../architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01)
- [Nombrar el espacio de trabajo](nombrar-espacio-de-trabajo.md)
- [ISSUE-187](../../issues/resolved/ISSUE-187-rooms-reviewed-migrations-inventory-blocked-deploy.md) y
  [ISSUE-188](../../issues/resolved/ISSUE-188-rooms-anonymous-entry-rsc-redirect-flash.md)
- [Invitación por correo y código](../identity/operar-invitacion-rooms-email-otp.md)
- [Quién ve qué en Rooms](../../documentation/rooms/quien-ve-que-en-rooms.md)
