# ISSUE-185 — El deploy gobernado de Auth creaba una revisión sin tráfico porque el tráfico estaba fijado

## Ambiente

production — Cloud Run `auth-server` (`auth.efeonce.org`, `us-east4`, proyecto `efeonce-group`).

## Detectado

2026-11-01, segundo intento del release `develop`→`main`: el orquestador run `41282851247`
(manifest `935583f88db0-3f177dd4…`) terminó `aborted` tras el deploy de Auth.

## Síntoma

El deploy gobernado terminó y creó la revisión `auth-server-00170`, pero con **0 %** del tráfico. La verificación
posterior encontró que el servicio seguía sirviendo la revisión anterior y el orquestador abortó el release.

## Causa raíz

El 2026-10-31, la activación de first-party/OTP para Rooms creó `auth-server-00169-4pq` con `gcloud run services
update` y movió el tráfico con `update-traffic --to-revisions=auth-server-00169-4pq=100`. Ese comando **fija** el tráfico
a una revisión con nombre, en lugar de enrutarlo a la última revisión lista. Con el tráfico fijado, Cloud Run no da
tráfico a las revisiones nuevas. El guard previo del workflow comprueba que haya una sola revisión al 100 %, condición
que la 00169 fijada cumplía, pero no distingue tráfico fijado de tráfico a la última revisión.

## Impacto

- Segundo intento del release abortado; la 00170 quedó creada pero sin servir.
- Auth siguió sirviendo la 00169 sin cambios: sin caída ni pérdida de login para MCP ni Rooms.
- Costo: otro intento del orquestador.

## Solución

- `gcloud run services update-traffic auth-server --region us-east4 --project efeonce-group --to-latest`, con readback
  completo. La 00170 pasó al 100 %: `GIT_SHA` `935583f88`, mismos 6 secretos, flags first-party/OTP ON y `/healthz`,
  `/readyz`, discovery, JWKS y `/login` en 200.
- Desde entonces el tráfico de Auth enruta a la última revisión, y el tercer intento (run `41284120477`) cerró
  `released`.
- Se documentó la comprobación previa al dispatch en el manual del autorizador, el runbook de release (§2.3 gotcha 11),
  el playbook (anti-pattern 23) y la skill `efeonce-auth`.

## Verificación

- `gcloud run services describe auth-server --region us-east4 --project efeonce-group --format='value(status.traffic)'`
  muestra una sola entrada al 100 % con `latestRevision: true` (`auth-server-00170-qlx`).
- Release `935583f88db0-544b3943-a041-4fe6-9e62-03aca45c6c8f` `released`; watchdog 6/6 synced.

## Estado

resolved (2026-11-01).

Riesgo residual: **si alguien vuelve a fijar el tráfico** (cualquier rollback con `--to-revisions`, como el documentado
a `auth-server-00169-4pq`, o una activación manual), el próximo deploy gobernado repetirá el problema. Hoy la defensa es
una comprobación manual antes del dispatch. Mejora recomendada, sin task creada: que el workflow verifique el tráfico
después del deploy (la revisión nueva al 100 %) y falle con un mensaje explícito, o que compruebe `latestRevision`
antes de desplegar.

## Relacionado

- Runs `41282851247` (abortado), `41284120477` (`released`); release anterior [ISSUE-184](ISSUE-184-auth-deploy-guard-rejected-squash-releases.md).
- [Activación Rooms + Efeonce ID del 31-10](../../audits/rooms/2026-10-31-production-activation.md) (origen del tráfico fijado).
- [Manual del autorizador §Tráfico y rollback](../../manual-de-uso/identity/operar-autorizador-efeonce.md);
  [runbook de release §2.3 gotcha 11](../../operations/runbooks/production-release.md);
  `.github/workflows/auth-server-deploy.yml`, `services/auth-server/deploy.sh`.
