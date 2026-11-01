# ISSUE-190 — Un login lento a Rooms terminaba en `{"error":"invalid_request"}` aunque la persona ya estaba autenticada

## Ambiente

production — Efeonce ID (`auth.efeonce.org`, `auth-server-00170-qlx`) y Rooms (`efeonce-rooms.vercel.app`).

## Detectado

2026-11-01, por el operador. Abrió el login de Rooms a las 14:14 (UTC), entró con Microsoft a las 14:26 y la vuelta
a `/oauth/authorize?client_id=efeonce-rp-rooms-production&first_party_request=efpt_…` respondió 400 con JSON crudo.
Al refrescar, entró.

## Síntoma

Pantalla blanca con `{"error":"invalid_request"}` después de un login exitoso con Microsoft/MFA.

## Causa raíz

- La solicitud first-party de Efeonce ID dura 10 minutos (`expiresAt: now + 600000` en
  `src/lib/auth-server/first-party/protocol.ts`). Entre abrir la pantalla y terminar Microsoft pasaron 12 minutos,
  así que la continuación había vencido y `resolveAuthorization` la rechazó con `first_party_transaction_expired`.
- El handler first-party respondía todos sus errores en JSON, también a un navegador.
- Además, la transacción de Rooms dura 5 minutos (CHECK `≤ 300 seconds` en `rooms.auth_transactions`): un login
  de más de 5 minutos terminaba en la página «Otra vez.» aunque Efeonce ID entregara el código.
- La sesión de Efeonce ID sí quedaba abierta; por eso refrescar funcionaba.

## Impacto

Cualquier persona que tarde más de 5 a 10 minutos en completar el login (MFA, pestaña abierta, leer el carrusel)
quedaba en un error sin salida. Alta visibilidad: es la primera pantalla de un cliente.

## Solución

- **Efeonce ID** (hotfix PR #266, `main@60872da`, **en producción** desde 2026-11-01 en `auth-server-00171-xdd`; release
  `60872da089ed-6925b98e…` `released`; el mismo cambio está en `develop` como `b05403b3d`): una continuación
  vencida redirige al `redirect_uri` registrado con `error=login_required`, su `state` e `iss`, sin código; una
  desconocida o reusada sigue siendo error, pero el navegador recibe la página de error de Efeonce ID y no JSON.
- **Rooms** (PR #16, `main@1989576`, **en producción** desde 2026-11-01, deploy `efeonce-rooms-m6kqevsxq`): el
  callback reinicia el login una vez si vuelve con `login_required` o con su transacción vencida; cookie de 2 minutos
  contra el bucle; `access_denied` y otros errores siguen en la página diseñada.

## Verificación

- Pruebas: 730 de `auth-server` (2 nuevas) y 40 de auth de Rooms (1 nueva), más la suite completa de Rooms.
- Producción Rooms: `/auth/callback?error=login_required` responde 303 a `/login?returnTo=/rooms` con la cookie de
  reintento.
- Producción Efeonce ID: la misma continuación vencida del incidente (`efpt_VdViay…`) ahora responde 302 a
  `efeonce-rooms.vercel.app/auth/callback?error=login_required&error_description=first_party_request_expired`, y Rooms
  responde 303 a `/login?returnTo=/rooms`. Una continuación desconocida devuelve 400 `text/html`.
- Resuelto el 2026-11-01. Sin verificar: un login humano real de más de 10 minutos de punta a punta.

## Relacionado

- [ISSUE-189](ISSUE-189-rooms-login-unavailable-on-cold-start.md) (fallo intermitente al iniciar el login, otra causa).
- TASK-2064 (Login V4) y TASK-2065 (consumidor Efeonce ID de Rooms).
