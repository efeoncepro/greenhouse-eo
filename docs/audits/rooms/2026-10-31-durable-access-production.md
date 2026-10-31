# Rooms — acceso interno durable y página de error en producción

- Fecha: 2026-10-31, 17:09–17:14 UTC.
- Autorización del operador: «Avanza todo end-to-end» y después «Despliega».
- Alcance: TASK-2082 (acceso interno durable, [ADR Accepted](../../architecture/rooms/EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md))
  y TASK-2083 (página `/auth/error`, aprobada por el operador). Sin cambios de flags ni en Efeonce ID.
- Resultado: **aplicado, desplegado y verificado sin sesión**. Falta el primer login humano del dueño con la versión nueva.

## Antes de aplicar

- `LC_ALL=en_US.UTF-8 pnpm verify` sobre `b3a100d` con PG local y `ROOMS_RUNTIME_PROFILE=local`: 386/386, 0 omitidas, build OK.
- `pnpm db:rehearse-production` (clon PostgreSQL 16 de `rooms_production`, sólo lectura en producción): PASS.
  Migración 19 aplicada con hashes de ediciones y conteos intactos; rollback en el clon con ledger igual a
  producción (esquema distinto sólo en formato); reaplicación OK; suite 386/386 contra el clon.
- Dos arreglos del ensayo en el camino (`c3d4b24`): el clon ahora corre en UTC (el ledger `run_on` es
  `timestamp without time zone` y la zona del Mac reordenaba la migración nueva) y `db-migrate` informa el SQLSTATE.
- Primer intento del ensayo falló al conectar: el rol `rooms_migrator` tiene tope de conexiones y una consulta de
  lectura propia lo ocupaba. Sin efecto en producción.

## Aplicado

| Paso | Comando / evidencia | Resultado |
|---|---|---|
| Migración | `ROOMS_EXPECT_PENDING=1 pnpm db:migrate-production --apply` (`b3a100d`… `c3d4b24`) | 18 → 19 migraciones, 47 → 49 tablas; hashes de ediciones y conteos sin cambios; runtime lee las tablas nuevas |
| Respaldo lógico | `.local/production-backups/rooms-production-20261031T170953Z.dump` | Tomado antes de aplicar; **borrado** tras verificar el deploy (contenía datos de producción) |
| Dueño (seco) | `pnpm access:production bootstrap-owner --organization org-2df565fb-98aa-42f7-b324-ea9a2209017f --principal rooms-pilot-julio-20261025 --issuer https://auth.efeonce.org --adopt --authorization "…"` | `would_adopt`, sufijo de identidad `lCikKK` |
| Dueño (aplicado) | Mismo comando con `--apply` | `adopted`: `members.manage` hasta 2027-11-01T17:10Z; evento `bootstrap.adopted` en `rooms.access_events` |
| Salud | `pnpm access:production health --organization org-2df565fb-…` | 1 titular, cobertura hasta 2027-11-01, sin señales |
| Merge | [PR #5](https://github.com/efeoncepro/efeonce-rooms/pull/5), checks verdes (imagen Linux, Vercel) | `main@a2d72c0` |
| Deploy | `dpl_5FNV9MSLdqWxuBGyim5Yoiz2UkPG`, READY, `githubCommitSha=a2d72c0`, target production | `vercel alias set … efeonce-rooms.vercel.app` (alias manual) |

## Verificación en producción (sin sesión)

- `GET /auth/error?reason=identity_unbound&ref=…&code=K7M29QXA` → 200 con «Código de solicitud», `K7M2-9QXA` y el
  titular nuevo.
- `GET /auth/callback?error=access_denied` con `Accept: text/html` → 303 a `/auth/error?reason=invalid_transaction&ref=…`.
- El mismo callback con `Accept: application/json` → JSON `invalid_transaction` (contrato de API intacto).
- `GET /login?returnTo=/rooms` → 302 a `https://auth.efeonce.org/oauth/authorize…`.
- `GET /api/v1/members?organizationId=…` sin sesión → `unauthenticated`.

## Pendiente

- Primer login humano del dueño (Microsoft + MFA) con la versión nueva y `pnpm rooms members` con sesión real.
- Dar acceso a una segunda persona interna, para que la organización no dependa de un solo administrador.

## Rollback

- Código: revertir el merge y redeploy (`vercel alias set` al deploy anterior `dpl_GiGEoYaPSsUf8V7uZZyTbxtfZM8A`).
- Base: la migración es aditiva; el código anterior funciona con ella. Si hiciera falta volver atrás de verdad, se
  restaura desde respaldo de la instancia (el lógico de esta corrida ya se borró); nunca `down` en producción.
