# Manual — Operar la persistencia durable de Efeonce Globe

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.0
> **Creado:** 2026-07-21 por Claude (TASK-1465)
> **Ultima actualizacion:** 2026-07-21 por Claude

## Para qué sirve

La persistencia durable de Globe (`TASK-1465`) le da a Efeonce Globe su **primera base de datos real** (PostgreSQL en Cloud SQL, instancia `globe-pg`). Antes todo el estado vivía en memoria y se borraba en cada reinicio; ahora sobrevive reinicios y varias réplicas pueden compartirlo. Este manual te dice, paso a paso, cómo **correr migraciones**, cómo **hacer durable un servicio**, qué **señales** mirar y qué **no hacer**. Como Globe es una **plataforma hermana** (repo `efeonce-globe`), los comandos corren dentro de ese repo; Greenhouse gobierna la task, el cierre documental y el handoff.

## Antes de empezar

- **Dónde vive el código:** repo hermano `efeonce-globe` (por convención local `../efeonce-globe`). La persistencia vive en `packages/database` (el cliente + el runner de migraciones). NO es parte del build de `greenhouse-eo`; tiene su propio toolchain (Node 24 nativo, `pnpm check` / `pnpm build`).
- **Quién gobierna:** Greenhouse. El trabajo se registra bajo la `TASK-1465` de Greenhouse (control plane), gobernada por `EPIC-028`. No se crea un registry de tareas paralelo en Globe.
- **Skill obligatoria:** invoca **`greenhouse-globe`** antes de tocar el repo de Globe. Encapsula el boundary Globe↔Greenhouse y las reglas duras.
- **Modelo keyless:** la app se conecta como un **usuario IAM** de base de datos por el conector de Cloud SQL. No hay contraseñas en la app corriendo. El único acceso con contraseña real es el **bootstrap de una sola vez** (usuario `postgres` de Cloud SQL), y esa contraseña se **revuelve (scramble)** apenas termina el bootstrap.
- **Instancia canónica:** `efeonce-globe:southamerica-west1:globe-pg` (Postgres 16, tamaño chico). Es **de Globe**, nunca se comparte con Greenhouse.

## Paso a paso

### 1. Correr las migraciones

Las migraciones son archivos `*.sql` numerados, **idempotentes**, registradas en la tabla `globe._migrations`, y se aplican como el rol dueño `globe_owner`. Desde `efeonce-globe`, con el connection name de la instancia y un usuario IAM migrador (que sea miembro de `globe_owner`) en el entorno:

```bash
# dentro de ../efeonce-globe
GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-globe:southamerica-west1:globe-pg \
GLOBE_MIGRATOR_USER=<tu usuario IAM, miembro de globe_owner> \
node packages/database/scripts/migrate.mjs
```

El runner aplica sólo lo pendiente y deja constancia en `globe._migrations`. Correrlo dos veces no rompe ni duplica nada (idempotente).

### 2. Bootstrap de roles (una sola vez, aparte)

El **bootstrap de superusuario** (`bootstrap.sql`) es un paso **separado y de una sola vez**: crea el rol `globe_owner`, que **posee todo**; los service accounts de runtime de la app sólo leen/escriben. Se corre una vez como el usuario `postgres` de Cloud SQL; después, la contraseña de `postgres` se revuelve y **no queda ninguna contraseña de admin viva**. No lo corras en cada despliegue: es setup inicial.

### 3. Hacer durable un servicio

Un servicio de Cloud Run corre durable **sólo si** tiene declaradas estas tres variables de entorno (apuntando a su propio usuario IAM de runtime):

| Variable | Qué declara |
| --- | --- |
| `GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME` | `efeonce-globe:southamerica-west1:globe-pg` |
| `GLOBE_POSTGRES_DATABASE` | la base de datos de Globe |
| `GLOBE_POSTGRES_USER` | el **usuario IAM de runtime del servicio** (uno por servicio) |

Si **falta** cualquiera, el servicio **arranca en memoria** (comportamiento previo). Correr en memoria sólo está permitido en el environment `internal_smoke`; cualquier otro environment debe declarar las tres.

## Qué significan los estados / señales

- **Servicio durable:** tiene las tres `GLOBE_POSTGRES_*` declaradas y se conecta a `globe-pg` por el conector con su usuario IAM. Hoy corren durables `globe-studio-internal` (cáscara web/login) y `globe-api-internal` (API del Model Lab), ambos con `maxScale=3` (hasta 3 réplicas; bajan a cero cuando no hay uso).
- **Servicio en memoria:** falta alguna `GLOBE_POSTGRES_*`. El estado se pierde en cada reinicio y no se comparte entre réplicas. Correcto sólo en `internal_smoke`.
- **Evidencia de que persiste:** una acción real deja una fila en Postgres. Prueba en vivo del 2026-07-21: golpear `/auth/start` persistió una fila de transacción de OAuth (`oauth_transactions`) en la base.
- **Spend fence atómico entre réplicas:** el freno de gasto ahora vive en la base (no en memoria por proceso), así que varias réplicas comparten el mismo tope. Es la pieza que **recién habilita** correr multi-réplica sin descoordinar el freno de seguridad.
- **Tablas del esquema `globe`:** `experiments`, `evaluation_reports`, `human_sessions`, `oauth_transactions`, `spend_fence_runs`, `spend_fence_days`, `audit_log` (esta última append-only, nunca borra).

## Qué no hacer

- **NUNCA** pongas una **contraseña en el runtime**. La app se conecta por identidad IAM + conector de Cloud SQL. Si te ves agregando una contraseña de base en un env var de un servicio, algo está mal.
- **NUNCA** compartas la base de datos (ni sesión, bucket, secreto o rol admin) **entre Globe y Greenhouse**. `globe-pg` es de Globe. Greenhouse la gobierna, no la conecta.
- **NUNCA** dejes viva la contraseña del usuario `postgres` después del bootstrap: se revuelve al terminar. El modelo es sin contraseña de admin en pie.
- **NUNCA** hagas `git commit --no-verify` / `git push --no-verify` sin autorización explícita del operador. Los hooks son el gate; bypassearlos deja errores para el próximo agente.
- **NUNCA** trates el **spend fence** durable como el **ledger de créditos comerciales**: es un freno de seguridad, no el registro contable. El ledger comercial es capacidad aparte, pendiente.
- **NUNCA** corras el `bootstrap.sql` en cada deploy: es setup de una sola vez.

## Problemas comunes

- **El servicio arrancó en memoria (perdí estado tras un reinicio):** le falta alguna de las tres `GLOBE_POSTGRES_*` (`INSTANCE_CONNECTION_NAME`, `DATABASE`, `USER`). Declaralas en el servicio de Cloud Run (con su usuario IAM de runtime) y redesplegá. Recordá: correr en memoria sólo está permitido en `internal_smoke`.
- **El techo de réplicas volvió a 1 tras un deploy por workflow:** esperado y conocido. `deploy-internal.yml` hoy **fija `--max-instances=1`** por hardcode, así que un redespliegue por ese workflow **baja el `maxScale` a 1** aunque lo hayas subido a 3 a mano. Workaround inmediato: volver a subir el `maxScale` con `gcloud run services update <servicio> --max-instances=3` después del deploy. El saneamiento de raíz —que Terraform gobierne ese valor y el workflow deje de pisarlo— es la **`TASK-1508`** (drift-trap).
- **La migración no aplica / no ve la instancia:** confirmá `GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-globe:southamerica-west1:globe-pg` y que `GLOBE_MIGRATOR_USER` sea un usuario IAM miembro de `globe_owner`. El runner aplica como `globe_owner`; un usuario sin ese rol no tiene los privilegios de DDL.
- **No valida Globe con `pnpm local:check` de Greenhouse:** correcto, son toolchains distintos. Validá Globe con `pnpm check` / `pnpm build` dentro de `efeonce-globe`.

## Referencias técnicas

- Spec técnica canónica: [`docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md).
- Documentación funcional (lenguaje simple): [`docs/documentation/creative-studio/persistencia-durable-globe.md`](../../documentation/creative-studio/persistencia-durable-globe.md).
- Continuidad de runtime en vivo: [`docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
- Infraestructura keyless que la sostiene: [`docs/documentation/creative-studio/efeonce-globe-infra-keyless.md`](../../documentation/creative-studio/efeonce-globe-infra-keyless.md).
- Correr un experimento en el Model Lab (consumidor de esta persistencia): [`efeonce-globe-model-lab.md`](./efeonce-globe-model-lab.md).
- Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md). Skill: `greenhouse-globe`.
