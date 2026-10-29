# Auth + Rooms — textos de PR preparados localmente (2026-10-29 UTC)

**Estado: borradores para revisión; no publicados en GitHub.** La retención
vigente impide push, merge y deploy. Los SHA remotos de #262/#263/#264 se
leyeron de nuevo antes de preparar estos textos. Cualquier publicación debe
releer base, head y CI en ese momento; las pruebas locales no son CI remoto.

Readback 2026-10-29 02:38 UTC: `origin/main=e593e3993`,
`origin/develop=f93583bb0`; #262 sigue draft en `f93583bb0`,
#263 abierto en `5e1fc2554`, #264 abierto en `aabd6d78d`. GitHub informa
`MERGEABLE/CLEAN` para #263/#264 y checks verdes de esos SHA remotos viejos;
no acredita CI de los commits locales. `git merge-tree --write-tree` fue
limpio para guard main `c3e89bdb3`, guard develop `6a20397eb` y stack Auth
incluido el fix 413 contra las bases actuales. La comparación
`git diff --name-only` entre el árbol visual aceptado `e790b46a5` y el
stack Auth actual sobre renderer, assets, copy y generadores Login V4 no
produjo rutas cambiadas.

## Actualización propuesta de PR #263 — guard main → main

**Título:** `fix(auth): exigir revisión activa y SHA verificado en despliegue productivo`

**Cuerpo:**

> Auth comparte un único servicio Cloud Run productivo con el login MCP.
> Este guard elimina el disparador de despliegue desde `develop`, exige
> `main` + entorno `production` + SHA completo publicado, y compara la
> revisión activa antes de reemplazarla. Tras deploy o skip, lee la revisión
> con 100% de tráfico y verifica su `GIT_SHA`; la ausencia de decisión o SHA
> falla cerrado. El resumen distingue SHA objetivo de SHA activo.
>
> Cabeza local `codex/auth-production-deploy-guard@c3e89bdb3`; remoto #263
> seguía en `5e1fc2554` al readback. Tests offline del workflow real 11/11
> PASS; YAML y diff sin errores. Esta PR no activa first-party/OTP ni cambia
> secretos/cohortes. CI y readback productivo del SHA publicado pendientes.

## Actualización propuesta de PR #264 — guard develop → develop

**Título:** `fix(auth): impedir deploy productivo desde develop y verificar revisión activa`

**Cuerpo:**

> El YAML en `develop` también debe perder `on.push`: GitHub usa el workflow
> de la rama que recibe el push. Este guard mantiene el único servicio Auth
> bajo `production-release.yml` o dispatch auditado desde `main` y exige
> la revisión activa al 100% con el SHA correcto tras deploy/skip.
>
> Cabeza local `codex/auth-production-deploy-guard-develop@6a20397eb`;
> remoto #264 seguía en `aabd6d78d`. Tests offline 13/13 PASS,
> `worker:deploy-path-gate` PASS (247 inputs Auth), allowlist 16/16 PASS.
> Scan Codex Security `95b60ebb-3592-47d3-b20b-c6752f9a9d65` del delta
> de dos archivos: 0 hallazgos reportables. No prueba CI ni Cloud Run.

## Nueva PR propuesta — Auth first-party/Rooms → develop

**Título:** `feat(auth): integrar Rooms first-party y Login V4 sobre guard de develop`

**Base/head:** `develop` ← `codex/auth-pr-develop-stack` (local sobre guard
`6a20397eb`, incluido el fix de transporte 413; head final se relee antes
de publicar).

**Cuerpo:**

> Integra la foundation OIDC first-party para Rooms, OTP guest separado de
> SSO, Login V4 aceptado y hardening de revocación/autoridad. El renderer,
> copy, assets y generadores V4 son idénticos al árbol visual aceptado
> `codex/auth-login-v4-fidelity@e790b46a5`. El diff contra el guard develop
> actualizado abarca 64 archivos de código, pruebas y evidencia.
>
> Validación local: Auth 717 PASS/23 skip; PostgreSQL real de revocación 3/3;
> dos RPs en HTTP+PG y variante de callback conflictivo PASS; B10 MCP local
> PASS; Rooms repitió dos adapters consumer con 35 checks browser/HTTP/PG
> PASS sobre fuentes Auth `ca97eecd1` (issuer QA, no entrypoint completo);
> B18 Rooms 51 comprobaciones browser PASS; guard 13/13; allowlist
> 16/16; TypeScript, ESLint, deploy-path gate y checks documentales PASS.
> El transporte `services/auth-server/app.ts` agregó cuatro casos focales:
> 9/9 PASS, con dispatch first-party/OTP, switches de servicio/OAuth, Host,
> cuerpo POST y respuesta 413 completa para cuerpos excesivos tanto con
> Content-Length como chunked, con cierre real del socket observado.
> [Hallazgo y retest](../auth-server/2026-10-29-oversized-body-node-transport.md).
> El peer usó el issuer
> QA y PostgreSQL reales, no el entrypoint completo `server.ts` con KMS.
> Un [smoke separado del entrypoint con flags OFF](../auth-server/2026-10-29-entrypoint-off-local-smoke.md)
> pasó 4/4 en Node local; build-contract y runtime-deps gates PASS. No
> ejercita los carriles ON ni KMS/PG ni construye la imagen Docker.
> El scan del delta Auth `d93e47e0-416e-406f-b2b7-7df42ff0b56c` encontró
> un riesgo bajo en el smoke PG local, corregido después con socket privado
> sin TCP. Ese scan precede al fix focal de transporte 413; el retest de ese
> fix está en el recibo enlazado. El scan focal posterior
> `ed8cb4af-bb8f-4fc6-9574-4738d7f4b3a6` revisó los dos archivos
> fuente del 413 sin hallazgos reportables. No se declara certificación externa.
>
> Pendientes antes de release: CI sobre SHA remoto exacto y aprobación del
> control plane. TASK-1833 conserva staging/rotación/recuperación, privacidad,
> B15/B20 parciales y steady productivo como criterios de cierre; el piloto
> controlado exige sus gates propios. La UI nueva de Rooms aún no se entrega.
> Flags first-party/OTP siguen OFF; no repetir canary ni correo.

## Orden tras levantar expresamente la retención

1. Releer las bases remotas y actualizar #263/#264 con las ramas guard;
   obtener CI del SHA publicado y revisar cualquier conflicto nuevo.
2. Integrar el guard de `develop`; publicar la rama Auth apilada como PR nueva
   hacia `develop` y obtener CI sobre su SHA remoto exacto.
3. Revaluar #262 `develop → main`, preflight, migraciones y release gate.
   Desplegar sólo el SHA aprobado; verificar tráfico 100%, GIT_SHA, flags,
   `/readyz`, metadata/JWKS y recorridos Rooms sin segundo canary/correo.
4. Mantener TASK-1833 abierta hasta evidencia de rotación, recuperación,
   privacidad, B15/B20 y siete días steady. La UI nueva de Rooms conserva
   ownership de la sesión Rooms y requiere su entrega/QA propia.
