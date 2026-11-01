# Auth + Rooms: candidato estrecho desde main (2026-10-28)

**Estado: local, retenido, no listo para desplegar.** Este dossier registra la partición del batch y
sus verificaciones. No autoriza push, merge, dispatch, cambio de flags ni repetición del canary.

## Alcance y procedencia

El candidato `codex/auth-focused-main-candidate` parte de `origin/main` `e593e3993` y conserva
commits separados para inspección:

| Commit | Contenido |
| --- | --- |
| `e63890528` | Dos migraciones de TASK-1834 y TASK-2067. Ya se habían aplicado en cloud según el readback del programa; incluirlas en Git sigue sujeto al gate de release. |
| `b455c1389` | Guard del único deploy productivo Auth, workflow, script y pruebas; pathset de build completo. |
| `1f80d6ef6` | Runtime Auth first-party/OTP y Login V4, con copias/correo/señales y pruebas. |
| `61ee310ac` | ADR, contratos, tasks y evidencia visual de V4 aceptada por Julio en preview local. |

El corte verificado `61ee310ac` contenía **126 archivos** contra `origin/main`, frente a los 7.172
del candidato basado en `develop`. Después se añadieron esta nota y el ajuste de EPIC-044; ese corte
tenía 128 archivos. Los 7.161 archivos ya presentes en `origin/develop` fuera de esta unidad no se
incorporan. Este branch tampoco incorpora la UI nueva de Rooms: Julio confirmó el 28-10 que Claude
Design aún no la entrega. El consumer Rooms permanece bajo ownership de su sesión peer.

## Verificación local

- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc --noEmit --pretty false`: PASS.
- `pnpm exec vitest run src/lib/auth-server --reporter=dot`: **708 PASS, 18 skip**.
- `python3 scripts/auth-server/test_deploy_contract.py`: **11 PASS**.
- `python3 scripts/auth-server/test_rooms_config_drift.py`: **13 PASS**.
- `pnpm worker:deploy-path-gate`, `pnpm worker:build-contract-gate` y
  `pnpm worker:runtime-deps-gate`: PASS. El path gate cubrió cinco build units, incluido Auth.
- [Rooms B18](2026-10-28-b18-guest-without-internal-sso.md): 51 comprobaciones locales PASS en
  `codex/rooms-design-integration@3b1b7b2`; la sesión guest con OTP conserva cookie HttpOnly de
  invitado, `/api/auth/session` responde 401 y `prompt=none` retorna `login_required` sin code.
  ESLint y TypeScript Rooms PASS. No se requirió cambio de contrato Auth, correo real ni producción.
- `pnpm task:lint --task TASK-1834`, `TASK-2064`, `TASK-2067` y `pnpm ops:lint --changed`:
  sin errores. Hay warnings documentales por la división de ramas: el viejo archivo TASK-1834
  todavía existe en `main` y el marcador del siguiente ID en README es anterior. EPIC-044 ya lista
  TASK-2064/2067 en este candidato. Resolver paridad de índice antes de cierre; no arrastrar el registro entero de
  `develop` sólo para silenciar warnings.

La suite y los gates validan este árbol local; **no hay CI remoto para este HEAD**, y la aceptación
visual de Julio cubre las capturas locales de Login V4, no el servicio productivo.

## Preflight y secuencia de release

`pnpm release:preflight --target-sha=61ee310ac0d530bb0d68727f44b2ccddc669404e
--target-branch=main`, ejecutado en el checkout primario el 28-10 a las 23:30 UTC, devolvió
`readyToDeploy=false`, `overallStatus=blocked`, confianza baja. `release_batch_policy` clasificó
126 archivos y exigió `requires_break_glass` por dos migraciones y dos paths cloud/release. La
política considera irreversible cada uno de esos dominios aun en un batch aislado; separarlos ayuda
a revisar y controlar el orden, pero **no convierte el preflight en PASS**. No se usó override.

GitHub, Sentry y Azure WIF aparecieron no configurados para esa corrida local; GCP WIF y migraciones
de PostgreSQL quedaron unknown/error de fuente. Vercel readiness y salud PostgreSQL sí respondieron
OK. Esos resultados no acreditan aprobaciones, checks remotos ni capacidad de promoción.

**Guard de revisión viva:** en el último readback productivo, Auth servía `GIT_SHA=754a2a28045ebfc9353c86a2d6236ecf59dd805e`.
`git merge-base --is-ancestor 754a2a280... HEAD` devolvió 1 para este candidato estrecho, y
`git diff 754a2a280..HEAD` contiene cambios en las rutas que el workflow trata como runtime Auth
(15 archivos en la selección comprobada). El guard de `.github/workflows/auth-server-deploy.yml`
exige que el SHA servido sea ancestro del target **o** que esas rutas sean idénticas. Ninguna condición
se cumple aquí: un dispatch de este candidato fallaría con
`target would replace unpromoted or newer Auth runtime`. La partición del batch reduce alcance para
revisión, pero no resuelve por sí sola la procedencia del deploy. Antes de promover se necesita
reconciliar el código servido y el target con una decisión de release explícita, verificable y sin
simular ancestry mediante un merge vacío.

Secuencia para revisar cuando se levante expresamente la retención:

1. Revisar las migraciones ya aplicadas frente al schema vivo; reconciliar la revisión Auth servida
   con el candidato bajo el guard de procedencia. Verificar que el commit de guard cubra tanto el
   workflow que recibe pushes a `develop` como el de `main` antes de publicar runtime.
2. Reconciliar las PR abiertas #263/#264 y la draft #262 con este candidato estrecho; obtener CI y
   preflight para el SHA remoto exacto, con autorización de la política de batch si corresponde.
3. Promover sólo mediante el control plane de release y verificar revisión activa, SHA, flags OFF,
   health/ready/OIDC/JWKS, visual V4 y consumer Rooms. La UI nueva de Rooms requiere su entrega y QA.

El canary único del 26-10 ya cerró con first-party/OTP OFF y correo sólo a
`jreyes@efeoncepro.com`. B18 amplía la evidencia local de aislamiento guest/SSO; TASK-1833
conserva rotación/recuperación, señales steady, privacidad V2 y demás assurance abiertos. El
escaneo offline de diff sin hallazgos confirmados tampoco cierra esos gates.

## Readback de preparación de PR — 2026-10-28 23:51 UTC

El corte ejecutable `81e3d971c9a3d9fc4b837d4ffe9bc0c8202e2795` estaba limpio: **13 commits y
176 archivos** frente a `origin/main` `e593e3993`. Esta actualización documental no altera ese
runtime. `git ls-remote` confirmó que `main` y `develop`
seguían en `e593e3993` y `f93583bb0` respectivamente. Los cambios posteriores a la aceptación
visual `61ee310ac` no tocan los archivos del Login V4 ni `services/auth-server`; conservan esa
composición local, sin readback productivo nuevo.

| PR | Readback remoto | Diferencia local por preparar |
| --- | --- | --- |
| [#262](https://github.com/efeoncepro/greenhouse-eo/pull/262) | `draft`, `develop` → `main`, HEAD `f93583bb0` | Batch amplio; no contiene el candidato estrecho ni sus pruebas nuevas. |
| [#263](https://github.com/efeoncepro/greenhouse-eo/pull/263) | abierta, `codex/auth-production-deploy-guard` → `main`, HEAD `5e1fc2554` | Rama local del guard coincide con ese HEAD; el candidato Auth añade producto, V4 y assurance por otra unidad. |
| [#264](https://github.com/efeoncepro/greenhouse-eo/pull/264) | abierta, `codex/auth-production-deploy-guard-develop` → `develop`, HEAD `aabd6d78d` | La rama local tiene dos commits no publicados: `e72b78de4` saca el fixture de `src/lib/**`; `4bf4c6f3c` completa los inputs del guard. |

En el HEAD local actual, `test_deploy_contract.py` **11 PASS**, drift Rooms **13 PASS** y
`worker:deploy-path-gate` PASS. La [prueba de revocación](../auth-server/2026-10-28-recovery-atomicity-local.md)
sumó 2 PASS en PostgreSQL desechable y un diff scan final de seis archivos sin hallazgos reportables
(`0bfb2ab0-46fe-49b3-9a63-7ab64da81a9f`). Esa revisión fue del mismo agente y no equivale a
revisión independiente, CI remoto, staging ni producción. El SHA productivo conocido `754a2a280` no
es ancestro de este HEAD (`git merge-base --is-ancestor` exit 1); el guard de procedencia sigue
bloqueando un reemplazo directo. Ninguna PR se actualizó, fusionó o ejecutó.

### Comparación de procedencia con la revisión Auth servida

Se compararon los blobs de `origin/main` `e593e3993`, revisión servida `754a2a280` y corte ejecutable
`81e3d971c`, usando exactamente los prefijos de `WORKER_RUNTIME_PATHS` del workflow Auth. La unión
contiene 96 archivos: **63 iguales** entre servido y candidato, **17 presentes/cambiados sólo en el
servido que el candidato revertiría**, **7 cambiados de modo distinto en ambos** y **9 cambios propios
del candidato**. El diff directo servido→candidato comprende 33 archivos. No se deduce equivalencia
de runtime de que los 63 coincidan: el guard exige la totalidad de los inputs.
Es una comparación del pathset conservador del workflow y del árbol fuente de la revisión, no
una prueba de que cada módulo de `src/lib/public-site` se ejecute en el bundle Auth.

Los 17 que el candidato revertiría son `services/_shared/gcloud-secret-iam.sh`, tres archivos de
`src/lib/growth/forms/` (incluido el control de correos de eventos), doce archivos de
`src/lib/public-site/content-factory/` y `src/lib/reliability/queries/release-worker-revision-drift.ts`.
Los siete con cambios en ambos lados son el workflow Auth, `package.json`,
`scripts/auth-server/rooms-config-drift.py`, `services/auth-server/{deploy.sh,server.ts}`,
`src/lib/auth-server/first-party/protocol.test.ts` y `persons/routes.ts`. Los nueve propios del
candidato incluyen el feed V4, el fix de revocación y la retirada
del test de drift de `src/lib/**`.

`git merge-tree --write-tree 754a2a280 HEAD` devolvió conflicto, incluidos workflow, deploy, server,
drift, protocolo first-party y rutas de persona. No es una fusión documental automática. Copiar
los 17 archivos sin sus dependencias podría romper otros dominios; fabricar ancestry mediante un
merge vacío ocultaría las diferencias del árbol servido. La ruta de integración debe conservar el
guard, resolver esos conflictos con sus owners, ejecutar la batería del árbol combinado y obtener
un preflight/CI del SHA exacto. La retención
actual deja esa decisión y cualquier publicación pendientes.

El metafile de esbuild del **candidato local** (misma receta estática del gate de rutas de workers)
contiene 247 inputs. De los 33 blobs distintos, sólo seis están en ese grafo:
`services/auth-server/server.ts`, `persons/{login-announcements,recovery,routes}.ts` y
`persons/store/{memory-store,postgres-store}.ts`. Ninguno de los 17 archivos sólo-served aparece en
ese grafo candidato. Los otros 27 incluyen configuración/build/deploy, tests y módulos ajenos;
su exclusión del bundle no los vuelve irrelevantes para el proceso de release. El diff de las dos
fuentes ejecutables editadas en ambos lados (`server.ts` y `routes.ts`) mostró las adiciones del feed
V4, sin líneas funcionales antiguas eliminadas; esto es revisión de código, no equivalencia de imagen
ni autorización para relajar el guard. La comparación de ese corte todavía no contrastaba el grafo de
la **revisión servida** ni resolvía workflow/deploy/config.

**Contraste local posterior del grafo servido (28-10):** se extrajeron de `754a2a280` los árboles
`src/`, `services/auth-server/`, `services/_shared/` y `tsconfig.json` en un directorio temporal y se
ejecutó esbuild con los aliases, target Node 22, `--packages=external` y entrypoint del Dockerfile.
Se ejecutó la misma receta sobre este candidato. Excluyendo los tres shims de build, el grafo servido
tiene **246 inputs fuente** y el candidato **247**; la única alta es
`src/lib/auth-server/persons/login-announcements.ts`. Los 246 inputs servidos siguen presentes en el
candidato. Entre ellos cambian cinco blobs: `services/auth-server/server.ts`,
`persons/{recovery,routes}.ts` y `persons/store/{memory-store,postgres-store}.ts`; el sexto blob
distinto es el módulo nuevo del feed. Los 17 archivos sólo-served del pathset conservador no entran
en ninguno de esos dos grafos. La comparación usa el esbuild instalado localmente y fuente Git del
SHA servido; no reconstruye la imagen Cloud Run ni inspecciona su digest. `deploy.sh`, `package.json`
y el workflow siguen siendo inputs de release aunque no sean módulos del bundle. El guard continúa
bloqueando el candidato por la diferencia de pathset y falta de ancestry.

`origin/main` `e593e3993` es ancestro de `754a2a280`, mientras el candidato local todavía no contiene
ese commit. La PR #262 (`develop` → `main`) contiene la línea de historia del SHA servido. Si se
promueve bajo los gates y la retención humana, el candidato estrecho deberá integrarse sobre el
`main` resultante y revalidarse contra el SHA remoto exacto; este contraste de grafos no autoriza
un merge vacío para fabricar ancestry ni un dispatch directo.

Readback Cloud Run de sólo lectura a las **23:54 UTC**: `auth-server-00168-vzb` conserva 100% del
tráfico, `GIT_SHA=754a2a28045ebfc9353c86a2d6236ecf59dd805e`,
`AUTH_SERVER_FIRST_PARTY_ENABLED=false` y `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED=false`.
Confirma que la comparación usa todavía la revisión activa; no acredita despliegue del candidato.
