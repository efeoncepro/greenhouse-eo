# Auth + Rooms — preparación de integración, 2026-10-28

Estado: **preparación local; release retenido**. Esta nota registra hechos leídos el 28-10 y el orden de
verificación. No autoriza push, merge, dispatch, flags ni un segundo canary.

## Estado comprobado

| Superficie | Evidencia | Límite |
| --- | --- | --- |
| Auth productivo | Cloud Run `auth-server-00168-vzb`, 100% tráfico, `GIT_SHA=754a2a28045ebfc9353c86a2d6236ecf59dd805e`; first-party/OTP `false`. Health, ready, discovery OIDC y JWKS 200; dos `kid` (readback 22:58 UTC). Revisión/flags/Sentry production releídos 23:15 UTC | El código local no está servido |
| Login V4 | Rama local `codex/auth-login-v4-fidelity`; preview desktop/móvil aceptado por Julio. Feed de Greenhouse validado y acotado; suite Auth 406 PASS/1 omitido, TypeScript/ESLint y bundle del emisor PASS | Sin push, CI del nuevo HEAD ni readback visual productivo |
| Rooms | Peer confirma conectores locales preparados. Julio confirmó el 28-10 que Claude Design aún no entregó la UI nueva | Integración y aceptación visual pendientes de esa entrega; ningún cambio de contrato Auth requerido en este corte |
| Canary | Único canary Auth+Rooms del 26-10 completado y cerrado, con un correo al destinatario autorizado | No repetir correo ni ampliar cohorte |

## PR y ruta de release

- Candidato combinado **sólo local** `codex/auth-rooms-release-candidate-local`:
  Login V4/assurance + #264 corregida + #263 reconciliada. El único conflicto fue el ADR nativo, que ahora
  conserva tanto la secuencia first-party como el contrato de despliegue productivo; los archivos ejecutables
  de #263 y #264 coinciden byte a byte salvo el traslado del test fuera de `src/lib/**`. En el árbol ejecutable
  previo al merge documental de #263: 515 tests Auth PASS y 11 omitidos
  (28 archivos PASS/2 omitidos), 9 contratos de deploy PASS, 13 pruebas de drift Rooms PASS, ESLint focal,
  TypeScript y `pnpm worker:deploy-path-gate` PASS. `pnpm qa:gates --changed` devolvió 0 archivos porque
  el árbol estaba commiteado: no se usa como veredicto del diff. Sin push ni CI remoto de este HEAD.
  Después, el guard incorporó `vendor`, `.dockerignore` y `.gcloudignore` al diff de runtime; sus
  contratos offline pasaron 11/11. El escaneo de seguridad sobre el HEAD previo a ese ajuste
  (`76569f427`) cubrió los 16 archivos ejecutables/configurados del diff, sin hallazgos confirmados.
  El candidato sobre la lista de build se descartó como vulnerabilidad actual por falta de un impacto
  material demostrado; se corrigió igualmente para mantener completo el guard.
  El SHA servido `754a2a280` es ancestro del candidato; `origin/main` sigue en `e593e3993` y
  `origin/develop` en `f93583bb0` (readback remoto 23:15 UTC). La comprobación de ancestro es sólo
  preflight de procedencia: no demuestra que el candidato se haya publicado o que el deploy vaya a pasar.
- [PR #262](https://github.com/efeoncepro/greenhouse-eo/pull/262) sigue `draft`, `develop → main`,
  HEAD remoto `f93583bb079e329ab937b1aa50d400ffde468cf3`, checks publicados verdes. No incluye los
  commits locales del feed/fidelidad V4; esos commits aún no tienen CI remoto.
- [PR #264](https://github.com/efeoncepro/greenhouse-eo/pull/264) sigue abierta y verde contra `develop`.
  Cambia el workflow Auth para dejar de desplegar el único emisor productivo desde `develop`.
  Su HEAD remoto todavía toca `src/lib/auth-server/internal/deploy-config.test.ts`; los workflows
  `ops-worker`, `commercial-cost-worker`, `ico-batch` y `artifact-worker` vigilan `src/lib/**` por
  cobertura intencional. La rama local `codex/auth-production-deploy-guard-develop` añadió `e72b78de4`:
  mueve sólo ese test a `scripts/auth-server/deploy-config.test.ts`, ruta incluida por Vitest y fuera de
  esos cuatro filtros. Test focal 1 PASS, contratos de deploy 9 PASS, drift Rooms 13 PASS, ESLint,
  TypeScript y `pnpm worker:deploy-path-gate` PASS; el diff local con
  `origin/develop` ya no contiene `src/lib/**`. El commit local `4bf4c6f3c` completó la comparación
  de inputs de build y elevó los contratos offline a 11/11. Ninguno de esos commits está en la PR remota
  ni tiene CI remoto.
- [PR #263](https://github.com/efeoncepro/greenhouse-eo/pull/263) sigue abierta y verde contra `main`.
  Su delta adicional de reliability/docs ya está reconciliado **en el candidato local**, sin push ni CI
  remoto del merge. Publicar después una PR separada con `src/lib/**` puede activar otros deploys por los
  filtros amplios; revisar el batch exacto antes de cualquier promoción.

**Delta local posterior (28-10):** las ramas de guard prepararon la eliminación completa de `on.push`
del workflow Auth, tanto para `develop` (`e139363d5`) como para `main` (`47817496b`). La vía normal
queda en `production-release.yml` → `workflow_call` después de `approval-gate`; dispatch es sólo
break-glass auditado. Contratos Python, test de allowlist, gates worker, skills espejo y runbooks
pasaron localmente; el ADR Auth documenta la propuesta. PR #263/#264 remotas continúan en sus HEAD
anteriores y los checks verdes publicados corresponden a esos HEAD, no a los commits locales.
El candidato integrado `0baccbc73` contiene la misma corrección; sigue sin CI remoto ni release.
Validación adicional de la rama local #263: `pnpm exec tsc --noEmit` PASS con heap Node de 8 GiB.
Se usó temporalmente `node_modules` del candidato integrado porque el lockfile y las dependencias
declaradas son iguales; la instalación independiente falló por acceso 401 al paquete privado AXIS.
El enlace temporal se retiró. El resultado cubre TypeScript local, no un build limpio de CI.
El escaneo diferencial de seguridad del guard local #263 (`5e1fc2554..47817496b`,
scan `26821ce6-f6be-4cc0-ac44-2e30910573af`) cerró con 15 archivos revisados y cero
hallazgos reportables. El inventario compacto omitió tres `.mjs`, revisados manualmente en el diff;
el resultado no verifica GitHub Environment, WIF ni Cloud Run en runtime.

Secuencia propuesta: cuando se levante la retención, publicar y validar la corrección local de #264,
integrar primero la protección de `develop` y publicar #263 para revisión. No fusionar #263 sola
a `main` mientras el SHA servido de Auth no sea ancestro del candidato: el guard bloquearía el
release del emisor y dejaría `main` sin cierre canónico. Reconciliar la procedencia del runtime
servido y el Login V4 aceptado en un HEAD exacto, repetir tests/CI/preflight con
`target-branch=main`, y sólo entonces decidir y promover el batch por el control plane canónico. Verificar
SHA activo, flags OFF, health/ready/discovery/JWKS, Login V4 y consumer Rooms. Un merge o workflow verde no
sustituye el readback. La ruta directa break-glass no hereda el guard de revisión viva del workflow;
requiere comprobación manual previa de la revisión que sirve tráfico y readback posterior. La retención
vigente exige una decisión explícita antes de cualquier mutación externa.

**Preflight local del 28-10, candidato `14dfec983` contra `main`:**
`pnpm release:preflight --target-sha=<candidato> --target-branch=main` devolvió
`readyToDeploy=false`, `overallStatus=blocked`. El clasificador vio **7.172 archivos** desde
`origin/main` (de ellos, 7.161 ya pertenecen a `origin/develop`): dos migraciones
`TASK-1834`/`TASK-2067` y tres paths de cloud/release (`auth-server-deploy.yml`, deploy de Auth y
deploy de ops-worker), con `decision=requires_break_glass`. La mayoría del batch no es propiedad de
Auth. Los checks de GitHub/Sentry/WIF quedaron sin configurar o desconocidos en la sesión local; PostgreSQL
y Vercel respondieron verdes, pero eso no cambia el veredicto. No se aplicó override ni se despachó release.
Antes de considerar una promoción, el batch requiere partición o una decisión de release explícita con
alcance, rollback y autoridad; las PR remotas verdes pertenecen a otros HEAD y no validan este candidato.

## Assurance que sigue abierto

TASK-1833 no se cierra con el canary: la refutación local posterior documenta 18 PASS y B15/B20
parciales; faltan
cobertura E2E y la prueba CIMD detenida, decisión e implementación de rotación aislada, ensayo de
recuperación/revocación, señales productivas en
steady durante siete días y aprobación de privacidad V2. La ampliación ofensiva CIMD que detuvo el control
automático no se reintenta por otro canal; sus correcciones defensivas y pruebas locales están documentadas
en el [dossier de seguridad](../auth-server/AUTH_SERVER_RED_TEAM_2026-10-25.md).

El readback posterior del candidato estrecho y las PR está en el
[dossier desde main](2026-10-28-auth-focused-main-candidate.md).
Sus 176 archivos y bloqueo de procedencia reemplazan los conteos y relaciones de ancestro que esta
nota registró para el candidato amplio basado en `develop`.
