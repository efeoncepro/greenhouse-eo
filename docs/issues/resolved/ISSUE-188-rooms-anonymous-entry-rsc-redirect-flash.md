# ISSUE-188 — `/rooms` sin sesión mostraba la pantalla de carga y redirigía por RSC en vez de responder 307

## Ambiente

production (`efeonce-rooms.vercel.app`, `efeoncepro/efeonce-rooms`). La documentación de Rooms vive en este repo.

## Detectado

2026-10-31, por el agente durante el readback del deploy de TASK-2085 (PR #8): `/rooms` sin sesión llegaba a
Efeonce ID, pero «por streaming RSC, no 307 de servidor» (Status real de la task).

## Síntoma

- Al abrir `/rooms` o `/rooms/:id/actividad` sin sesión, el servidor respondía **HTTP 200**, el navegador pintaba
  «Cargando la sala…» un instante y después saltaba a `/login` y a Efeonce ID.
- Una herramienta o un `curl` veía un 200, no una redirección: no se podía distinguir «sin sesión» de «página
  cargada».

## Causa raíz

- El segmento `src/app/rooms/` tiene `loading.tsx`. Next lo envía como primer fragmento del streaming, antes de que la
  página decida.
- La página usaba `redirect()` (desde `homeGate`) cuando no había sesión. Como la respuesta ya había empezado con
  estado 200, la redirección viajaba dentro del payload RSC y la ejecutaba el cliente, con el parpadeo de la pantalla
  de carga.

## Impacto

- Visual y de diagnóstico: cada persona sin sesión veía una pantalla de carga falsa antes del login.
- Los monitoreos y verificaciones de deploy leían 200 donde correspondía una redirección.
- Sin riesgo de exposición de datos: la autoridad seguía en la página y no se pintaba contenido protegido.

## Solución

- [PR #9](https://github.com/efeoncepro/efeonce-rooms/pull/9) (`1021e75`, mergeado en `main@97588d3`): el proxy
  (`src/proxy.ts`) responde **307** a `/login?returnTo=<ruta>` en `/rooms` y `/rooms/:id/actividad` cuando la petición
  no trae ninguna cookie de sesión de Rooms (`__Host-rooms_session`, `rooms_session_local`, `__Host-rooms_guest`,
  `rooms_guest_local`). Conserva sólo `?accion=` si es un id válido. Cabeceras `Cache-Control: private, no-store`,
  `Referrer-Policy: no-referrer` y `Vary: Cookie`.
- La lógica es pura (`src/server/agents/anonymous-entry.ts`) y tiene prueba (`tests/auth-anonymous-entry.test.ts`).
- El proxy mira sólo la presencia de la cookie: la autoridad sigue en `homeGate`, así que una cookie vencida llega a
  la página y ésta decide.
- Regla registrada en la skill `efeonce-rooms`: una redirección que debe ser 307 en un segmento con `loading.tsx` va
  en el proxy.

## Verificación

- Producción, deploy `efeonce-rooms-nveyuogvr` con alias reasignado (2026-11-01): `/rooms` sin cookie → 307 a
  `/login?returnTo=%2Frooms` → 302 a `auth.efeonce.org/oauth/authorize`.
- Sigue vigente en el deploy actual `efeonce-rooms-12zux9578` (PR #11).
- Desde el release de Greenhouse `935583f88db0` la pantalla de destino es el login V4 de Efeonce ID con «Entra a
  Rooms» y carrusel de novedades (documentado por Efeonce ID).

## Estado

resolved — 2026-11-01 (detectado 2026-10-31).

## Riesgo residual

- No se ha verificado un login humano de punta a punta (entrar, volver a la ruta de `returnTo` y ver el encabezado con
  el nombre del espacio). Queda pendiente en TASK-2085.
- Una cookie vencida todavía pasa por la página, que decide; eso es intencional y puede mostrar la pantalla de carga
  antes del login en ese caso.

## Relacionado

- `efeoncepro/efeonce-rooms`: PR #9 (`1021e75`, `main@97588d3`), `src/proxy.ts`, `src/server/agents/anonymous-entry.ts`,
  `tests/auth-anonymous-entry.test.ts`, `src/app/rooms/loading.tsx`.
- [TASK-2085](../../tasks/in-progress/TASK-2085-rooms-agent-activity-surface.md).
- [Contrato de API y acceso: entrada sin sesión](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md#acceso-interno-y-espacio-de-trabajo--vigente-al-2026-11-01)
  y [acceso interno (funcional)](../../documentation/rooms/acceso-interno-rooms.md).
