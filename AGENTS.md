# AGENTS.md

## Objetivo
Este repositorio es la base operativa de Greenhouse sobre Vuexy + Next.js. Aqui trabajaran multiples agentes y personas. Este documento define reglas obligatorias para evitar conflictos, duplicidad de trabajo y despliegues rotos.

## Alcance
- Este repo corresponde solo a `starter-kit`.
- `full-version` debe usarse como referencia de contexto para entender componentes, patrones, flujos y alcance funcional esperado.
- Aunque `full-version` exista versionado en este workspace como referencia local, no debe tratarse como source of truth del producto ni ampliarse como si fuera parte activa del portal.
- Cualquier copia de componentes desde `full-version` debe ser intencional, revisada y adaptada al contexto Greenhouse antes de integrarse.
- Convencion documental vigente:
  - `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `project_context.md`, `Handoff.md`, `Handoff.archive.md` y `changelog.md` quedan en raiz.
  - specs, tasks, roadmap y guias especializadas viven bajo `docs/`.
  - `docs/tasks/` se ordena operativamente en `in-progress/`, `to-do/` y `complete/`; el indice vigente es `docs/tasks/README.md`.
  - las tasks nuevas deben nacer con ID estable `TASK-###` y usar `docs/tasks/TASK_TEMPLATE.md` como plantilla copiable. El protocolo de ejecucion (Plan Mode, Skill, Subagent, Checkpoint/Mode) vive en `docs/tasks/TASK_PROCESS.md`.
  - los briefs `CODEX_TASK_*` existentes siguen vigentes como legacy hasta su migracion y deben vivir versionados dentro de `docs/tasks/**`; el patron ignorado en raiz queda solo para scratch local fuera de la taxonomia documental.

## Prioridades
1. Mantener el proyecto desplegable en Vercel.
2. Evitar romper la base de Vuexy mientras se adapta a Greenhouse.
3. Dejar handoff claro para el siguiente agente.
4. No mezclar refactors grandes con cambios funcionales pequenos.

## Reglas Operativas

### 1. Antes de cambiar codigo
- Leer `project_context.md`.
- Leer `Handoff.md` para ver trabajo en curso, riesgos y proximos pasos.
- Usar `Handoff.archive.md` solo si hace falta rastrear contexto historico; no como primera lectura operativa.
- Leer la especificacion externa `../Greenhouse_Portal_Spec_v1.md` cuando el cambio afecte producto, autenticacion, data, rutas principales o arquitectura.
- Si el trabajo requiere specs o briefs, buscarlos primero en `docs/README.md` y luego en la categoria correspondiente dentro de `docs/`.
- Si el trabajo nace de una task del sistema (`TASK-###` nueva o `CODEX_TASK_*` legacy), revisar obligatoriamente la arquitectura antes de implementar:
  - minimo: `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` y `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - ademas: toda arquitectura especializada que aplique al task, por ejemplo identidad, finance, service modules o multitenancy
- Si el trabajo toca el calendario operativo de Payroll, revisar `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`, `src/lib/calendar/operational-calendar.ts` y `src/lib/calendar/nager-date-holidays.ts`; la timezone canónica es IANA (`America/Santiago`) y los feriados nacionales se hidratan desde `Nager.Date` con overrides locales persistidos.
- Si el cambio toca modelado de datos, sync, fuentes externas, PostgreSQL o BigQuery:
  - revisar `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - revisar `docs/operations/GREENHOUSE_DATA_MODEL_DOCUMENT_OPERATING_MODEL_V1.md`
- Si el cambio toca pipelines externos, notificaciones, sync con Notion/HubSpot/Frame.io/Teams o dependencias multi-repo:
  - revisar `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- Si el cambio toca lanzamiento de una capacidad visible, promocion `alpha/beta/stable`, disponibilidad por tenant/cohort o comunicacion client-facing:
  - revisar `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`
  - revisar `docs/changelog/CLIENT_CHANGELOG.md`
- Si el cambio toca webhooks, event delivery, callbacks o integraciones near-real-time:
  - revisar `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- Si el cambio toca PostgreSQL, Cloud SQL, backfills, source sync o migraciones runtime:
  - revisar `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
  - revisar `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
  - correr `pnpm pg:doctor` antes de asumir que el acceso esta sano
- Si una task del sistema contradice la arquitectura vigente, no implementarla tal cual; corregir primero la task o documentar la nueva decision arquitectonica.
- Si el cambio es UI, UX o seleccion de componentes, usar como criterio operativo los skills locales vigentes (`greenhouse-agent`, `greenhouse-portal-ui-implementer`, `greenhouse-ui-orchestrator` o `greenhouse-vuexy-ui-expert`) y revisar `full-version` junto con la documentacion oficial de Vuexy antes de inventar componentes nuevos.
- Si el cambio afecta como funciona un modulo desde la perspectiva del usuario, verificar si existe documentacion funcional en `docs/documentation/` para el dominio afectado y actualizarla.
- Aplicar `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` para documentar con una fuente canonica y deltas cortos en los documentos vivos.
- Revisar `git status` y no asumir que el arbol esta limpio.
- Confirmar si el cambio toca layout global, navegacion, autenticacion, tema o deploy. Si toca alguno, documentarlo en `Handoff.md`.

### 2. Limites de trabajo
- Un agente debe trabajar un objetivo claro por vez.
- No mezclar cambios de producto, infraestructura y refactor en un mismo lote sin necesidad real.
- Si el cambio es exploratorio o incompleto, no dejarlo a medias sin actualizar `Handoff.md`.

### 3. Coordinacion entre agentes
- El agente que toma una tarea debe dejar constancia breve en `Handoff.md` antes de cerrar su turno si:
  - modifico archivos de alto impacto
  - dejo deuda tecnica abierta
  - detecto una decision pendiente del usuario
  - cambio supuestos del proyecto
- Si dos agentes pueden tocar la misma zona, prevalece el ultimo handoff documentado, no la memoria conversacional.

### 4. Regla de cambios minimos
- Preferir cambios pequenos, verificables y reversibles.
- Si un archivo base de Vuexy requiere cambios amplios, separar primero la adaptacion funcional y despues el cleanup.
- Evitar renombrar masivamente archivos o mover carpetas sin una razon fuerte.
- Los componentes UI compartidos de Greenhouse deben vivir en `src/components/greenhouse/*`.
- Las rutas y modulos deben reutilizar esa capa y dejar en `src/views/greenhouse/*` solo la composicion o piezas especificas del modulo.

### 5. Regla de verificacion
- Todo cambio debe intentar validar al menos una de estas rutas:
  - `pnpm build`
  - `pnpm lint`
  - `pnpm test`
  - prueba manual local o en preview de Vercel
- Baseline vigente de unit tests:
  - `Vitest` es el framework canonico para tests unitarios del repo.
  - Para tests de componentes React, usar `Vitest + Testing Library + jsdom`, no introducir otro runner sin una razon fuerte.
  - El helper canonico de render para UI es `src/test/render.tsx`.
  - Priorizar tests unitarios en logica de dominio (`src/lib/**`) y componentes UI compartidos antes de sumar suites mas pesadas.
- Si no se pudo validar, registrar exactamente que no se valido y por que en `Handoff.md`.

### 6. Regla de despliegue
- El proyecto debe conservar configuracion compatible con Vercel.
- `Framework Preset` en Vercel debe ser `Next.js`.
- No depender de configuraciones manuales opacas en Vercel si el repo puede expresar el comportamiento.
- Si un cambio altera rutas raiz, redirects, `basePath` o variables de entorno, documentarlo en `project_context.md` y `Handoff.md`.

### 7. Regla de documentacion viva
- Actualizar `changelog.md` cuando haya un cambio real en comportamiento, estructura, flujo de trabajo o despliegue.
- Actualizar `docs/changelog/CLIENT_CHANGELOG.md` cuando cambie una capacidad visible para usuarios/clientes o cuando una feature/modulo cambie de canal o disponibilidad.
- Actualizar `project_context.md` cuando cambie arquitectura, stack, rutas clave, decisiones o restricciones.
- Actualizar `docs/documentation/` cuando cambie comportamiento funcional de un modulo. Cada dominio tiene su subcarpeta (identity, finance, hr, etc.). Si un documento del dominio afectado existe, actualizarlo. Si no existe y el cambio es significativo, crearlo. El indice vive en `docs/documentation/README.md`.
- No usar estos documentos como dumping ground. Deben quedar legibles.
- Usar `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` para evitar duplicacion: una fuente canonica por tema y deltas breves en el resto.
- La politica canonica de release channels y changelog client-facing vive en `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`.
- La convencion canonica de Git tags para releases (`platform/`, `<module>/`, `api/<slug>/`) vive en ese mismo documento; no improvisar tags globales ambiguos como `v1.1.0` para el portal completo.
- Tres capas de documentacion, cada una con su proposito:
  - `docs/architecture/` — contratos tecnicos para agentes y desarrolladores (schemas, APIs, decisiones de diseno)
  - `docs/documentation/` — explicaciones funcionales en lenguaje simple (roles, flujos, reglas de negocio). Cada documento enlaza a su spec tecnica
  - `docs/operations/` — modelos operativos del repo y del equipo (documentacion, GitHub Project, release channels)

### 8. Regla de line endings
- El repositorio debe versionar archivos de texto con finales de linea `LF`.
- Mantener `.gitattributes` como fuente de verdad para la politica de `EOL`.
- No forzar conversiones masivas a `CRLF`.
- Si reaparecen warnings de `LF/CRLF`, revisar primero `.gitattributes` y la configuracion local de `core.autocrlf`.

## Convenciones de Trabajo

### Branching y commits
- `main` es solo para codigo listo para produccion.
- `develop` debe funcionar como rama de integracion y rama asociada a `Staging` en Vercel.
- Todo trabajo de agentes debe salir desde rama propia salvo cambios minimos de emergencia.
- Formato recomendado de ramas:
  - `feature/<owner>-<tema>`
  - `fix/<owner>-<tema>`
  - `hotfix/<owner>-<tema>`
  - `docs/<owner>-<tema>`
- Evitar trabajar directo sobre `main`.
- Evitar trabajar directo sobre `develop` salvo integracion, resolucion de conflictos o consolidacion final.
- No hacer `commit` ni `push` hasta tener evidencia razonable de que el cambio esta sano.
- No ejecutar en paralelo comandos Git que muten estado del repo, por ejemplo `git add`, `git commit`, `git merge` o `git push`.
- Validacion minima esperada antes de `commit` o `push`:
  - `npx pnpm build`, o
  - `npx pnpm lint`, o
  - validacion manual suficiente cuando el cambio no rompa build pero afecte UI o deploy
- Si no se pudo validar, no hacer `push` como si el cambio estuviera cerrado. Dejarlo explicitado en `Handoff.md`.
- Mensajes de commit:
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `docs: ...`
  - `chore: ...`

### Flujo por ramas
- `feature/*` y `fix/*`:
  - sirven para trabajo aislado por agente
  - cada push debe generar Preview Deployment en Vercel
  - no deben considerarse aptas para produccion por defecto
- `develop`:
  - integra trabajo ya validado en preview individual
  - es la rama de prueba compartida del proyecto
  - debe mapear al `Custom Environment` `Staging` en Vercel
  - debe mantenerse funcional y demostrable
- `main`:
  - refleja el estado productivo
  - solo recibe cambios validados previamente en `develop` o hotfixes justificados
- `hotfix/*`:
  - salen desde `main`
  - corrigen produccion
  - deben validarse en preview antes de volver a `main`
  - despues de cerrar el hotfix, sincronizar tambien con `develop`

### Regla de merge
- No mergear una rama si no esta claro:
  - que problema resuelve
  - como se valido
  - que riesgo introduce
- Antes de mergear a `develop`:
  - validar build o lint
  - revisar preview deployment de la rama si el cambio afecta UI o rutas
- Antes de mergear a `main`:
  - el cambio ya debio haber pasado por `develop`, salvo hotfix
  - revisar preview o entorno de prueba compartido
  - confirmar que no hay pendientes abiertos en `Handoff.md` para esa zona
  - verificar conflictos con: `git merge --no-commit --no-ff origin/main` (luego `git merge --abort` si solo es verificacion). **No usar** `git merge-tree | grep CONFLICT` — produce falsos positivos con sentencias SQL `ON CONFLICT` del codebase (ver ISSUE-011)

### Ambientes y Vercel
- `Production` en Vercel debe estar asociado a `main`.
- `Staging` en Vercel debe ser un `Custom Environment` asociado a `develop`.
- `Preview` en Vercel debe usarse para:
  - ramas `feature/*`
  - ramas `fix/*`
  - ramas `hotfix/*` antes de promocion
- Si se define un dominio de staging, debe apuntar al `Custom Environment` de `develop`, no a ramas personales.
- No usar Production como entorno de prueba manual.

### Variables por ambiente
- Separar variables en Vercel por entorno:
  - `Development`: trabajo local
  - `Preview`: feature branches, fix branches y hotfix
  - `Staging`: branch `develop`
  - `Production`: solo main
- No crear una variable solo en Production si el cambio necesita validacion previa en Preview o Staging.
- Toda variable nueva debe indicar:
  - nombre
  - proposito
  - en que entornos debe existir
  - valor esperado o formato

### Regla de promocion
- El camino normal es:
  - rama de trabajo
  - Preview Deployment
  - merge a `develop`
  - validacion compartida en `Staging`
  - merge a `main`
  - deploy a Production
- Si un cambio no paso por ese camino, debe existir razon explicita en `Handoff.md`.
- Regla complementaria:
  - `Preview` suele corresponder a `alpha`
  - `Staging/develop` suele corresponder a `beta`
  - `Production/main` es el unico lugar donde una capacidad puede declararse `stable`
  - Greenhouse comunica releases principalmente por modulo o feature visible, no solo por plataforma completa

### Archivos sensibles
- Tratar con cuidado:
  - `next.config.ts`
  - `package.json`
  - `pnpm-lock.yaml`
  - `src/app/layout.tsx`
  - `src/app/(dashboard)/layout.tsx`
  - `src/components/greenhouse/**`
  - `src/components/layout/**`
  - `src/configs/**`
- Si alguno cambia, dejar nota en `Handoff.md`.

### Variables de entorno
- No introducir variables nuevas sin documentarlas en `project_context.md`.
- Mantener `.env.example` alineado con cualquier variable requerida por el proyecto.
- No asumir que Vercel tiene variables cargadas.

### Conectividad PostgreSQL (leer ANTES de cualquier operación DB)
- **Método preferido (todos los entornos)**: Cloud SQL Connector vía `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`. Conecta sin TCP directo — negocia un túnel seguro por la Cloud SQL Admin API. Funciona en Vercel (WIF + OIDC), local, y agentes AI.
- **La IP pública de Cloud SQL (`34.86.135.144`) NO es accesible por TCP directo** — no hay authorized networks configuradas. Intentar conectar da `ETIMEDOUT`.
- **Prioridad en `src/lib/postgres/client.ts`**: si `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` está definida, el Connector toma prioridad sobre `GREENHOUSE_POSTGRES_HOST`. Ambas pueden coexistir en `.env.local`.
- **Prerequisito**: credenciales GCP válidas — `GOOGLE_APPLICATION_CREDENTIALS_JSON` en env, o ADC local (`gcloud auth application-default login`), o WIF (Vercel). El service account necesita `roles/cloudsql.client`.
- **Scripts Node.js de runtime** (`pnpm pg:doctor`, `pnpm setup:postgres:*`, scripts de backfill) usan el Connector automáticamente cuando `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` está definida.
- **Migraciones y binarios standalone** (`pnpm migrate:up`, `pnpm migrate:down`, `pnpm db:generate-types`, `pg_dump`, `psql`) requieren **Cloud SQL Auth Proxy** corriendo como tunnel local:
  ```bash
  cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432
  ```
  `.env.local` debe tener:
  ```
  GREENHOUSE_POSTGRES_HOST="127.0.0.1"
  GREENHOUSE_POSTGRES_PORT="15432"
  GREENHOUSE_POSTGRES_SSL="false"
  ```
- **Guardia fail-fast**: `scripts/migrate.ts` detecta si `GREENHOUSE_POSTGRES_HOST` apunta a una IP pública (ej. `34.86.135.144`) y aborta inmediatamente con instrucciones claras en vez de esperar timeout. **No intentar conectar a la IP pública de Cloud SQL — no hay authorized networks.**
- **Si no tienes `cloud-sql-proxy`**: `gcloud components install cloud-sql-proxy`.
- **Regla**: si un script Node.js de runtime falla con `ETIMEDOUT`, verificar que `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` esté definida y que las credenciales GCP sean válidas. Si una migración o binario standalone falla, verificar que el Cloud SQL Auth Proxy esté corriendo en `127.0.0.1:15432`.

### Acceso PostgreSQL
- Greenhouse usa cuatro perfiles de acceso para PostgreSQL:
  - `runtime` — portal app (DML, via Cloud SQL Connector en Vercel)
  - `migrator` — migraciones DDL (`pnpm migrate:up`, `pnpm setup:postgres:*`)
  - `admin` — bootstrap y ownership (`postgres` user)
  - `ops` — canonical owner de todos los objetos (`greenhouse_ops`, break-glass)
- Variables por perfil:
  - `runtime`:
    - `GREENHOUSE_POSTGRES_USER`
    - `GREENHOUSE_POSTGRES_PASSWORD`
  - `migrator`:
    - `GREENHOUSE_POSTGRES_MIGRATOR_USER`
    - `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD`
  - `admin`:
    - `GREENHOUSE_POSTGRES_ADMIN_USER`
    - `GREENHOUSE_POSTGRES_ADMIN_PASSWORD`
- Variables compartidas obligatorias:
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` o `GREENHOUSE_POSTGRES_HOST`
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_PORT`
- Ownership:
  - **`greenhouse_ops`** es el canonical owner de todos los objetos (122 tablas, 11 schemas, 17 views)
  - Consolidado en migración `20260402000000000_consolidate-ownership-to-greenhouse-ops.sql`
  - Password en Secret Manager: `greenhouse-pg-dev-ops-password`
  - Default privileges configurados: objetos nuevos de `greenhouse_ops` otorgan grants automáticos a `greenhouse_runtime` y `greenhouse_migrator`
- Regla operativa:
  - runtime del portal usa solo credenciales `runtime`
  - migraciones DDL usan `migrator` (via `pnpm migrate:up`)
  - bootstrap y ownership usan `admin` o `greenhouse_ops`
  - no hacer DDL con el usuario runtime salvo que exista una razon excepcional y quede documentada
  - no crear objetos con users distintos a `greenhouse_ops` — si una migración corre como `migrator`, los DEFAULT PRIVILEGES otorgan acceso automáticamente
- Comandos canonicos:
  - `pnpm pg:doctor`
  - `pnpm migrate:create <nombre>` — crear migración nueva
  - `pnpm migrate:up` — aplicar migraciones pendientes
  - `pnpm migrate:down` — revertir última migración
  - `pnpm migrate:status` — estado de migraciones
  - `pnpm db:generate-types` — regenerar tipos Kysely
  - `pnpm setup:postgres:access` — setup de roles y grants (legacy)
- Antes de cortar cualquier dominio nuevo a PostgreSQL:
  - correr `pnpm pg:doctor --profile=runtime`
  - correr `pnpm pg:doctor --profile=migrator`
  - confirmar en `Handoff.md` si el dominio ya fue tocado por otro agente
- Fuente canonica del modelo:
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

### Database Connection
- **Import `query` from `@/lib/db`** for raw SQL queries (convenience alias for `runGreenhousePostgresQuery`).
- **Import `getDb` from `@/lib/db`** for Kysely typed queries in new modules.
- **Import `withTransaction` from `@/lib/db`** for transactions.
- **NEVER** create new `Pool` instances — the singleton lives in `src/lib/postgres/client.ts`.
- **NEVER** read `GREENHOUSE_POSTGRES_*` directly outside `src/lib/postgres/client.ts`.
- **NEVER** import `Pool` from `pg` directly — always go through `@/lib/db` or `@/lib/postgres/client`.
- Importing `type PoolClient` from `pg` for function signatures is fine.
- Existing modules using `runGreenhousePostgresQuery` from `@/lib/postgres/client` are fine — no need to migrate retroactively.
- New modules SHOULD use Kysely (`getDb()`) for type safety.

### Database Migrations
- Todo cambio de schema PostgreSQL (DDL) debe hacerse via migración versionada, nunca con ALTER/CREATE manual.
- Framework: `node-pg-migrate` — wrapper en `scripts/migrate.ts`, migraciones en `migrations/`.
- Tabla de tracking: `public.pgmigrations`
- Credenciales: usa perfil `migrator` de `.env.local` automáticamente. Override con `MIGRATE_PROFILE=admin`.
- Convención de nombres: `YYYYMMDDHHMMSS_descripcion-kebab-case.sql`
- Cada migración DEBE incluir `SET search_path = <target_schema>, greenhouse_core, public;` al inicio.
- Regla de orden: **migración ANTES del deploy, siempre** (Vercel no ejecuta migraciones en deploy time).
- Regla de backward-compatibility: columnas nullable primero, deploy código, backfill, luego constraint.
- Reglas de timestamps:
  - **SIEMPRE** usar `pnpm migrate:create <nombre>` para generar el archivo — genera el timestamp UTC correcto automáticamente.
  - **NUNCA** renombrar manualmente el timestamp de un archivo de migración. `node-pg-migrate` ordena por timestamp y rechaza ejecutar migraciones cuyo timestamp sea anterior a la última aplicada.
  - **NUNCA** crear archivos de migración a mano con timestamps inventados. Si el timestamp cae antes del baseline (`20260401120000000`), la migración será ignorada silenciosamente o causará error.
  - Si necesitas que una migración corra antes que otra pendiente, la solución es reordenar el contenido dentro de un solo archivo, no manipular timestamps.
- Flujo obligatorio al modificar schema:
  1. `pnpm migrate:create <nombre>` — crea archivo SQL con timestamp UTC correcto
  2. Editar el archivo con el DDL necesario
  3. `pnpm migrate:up` — aplica contra la base de datos (auto-regenera tipos Kysely)
  4. Commit migración + `db.d.ts` actualizado **juntos** en el mismo commit
  5. `pnpm build` para verificar que los tipos son consistentes
- Conexión local: requiere Cloud SQL Auth Proxy corriendo en `127.0.0.1:15432`. El script tiene guardia fail-fast que aborta si detecta IP pública como host — no esperar timeout, leer el mensaje de error.
- Spec completa: `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

## Task Lifecycle Protocol

### Regla general
Todo agente que trabaje sobre una task del sistema debe gestionar su estado en el pipeline de tareas. Las tasks nuevas usan `TASK-###`; las `CODEX_TASK_*` existentes se consideran legacy hasta su migracion. Todas viven en `docs/tasks/{to-do,in-progress,complete}/` y su índice es `docs/tasks/README.md`.

Antes de crear una task nueva:
1. Revisar `docs/tasks/TASK_TEMPLATE.md` (plantilla copiable) y `docs/tasks/TASK_PROCESS.md` (protocolo)
2. Revisar `docs/tasks/TASK_ID_REGISTRY.md`
3. Asignar el siguiente `TASK-###` disponible sin renumerar tasks existentes
4. Registrar el nuevo ID en `docs/tasks/TASK_ID_REGISTRY.md`
5. Crear la task en la carpeta de lifecycle correcta

### Al iniciar trabajo en una task
1. Mover el archivo de la task de `to-do/` a `in-progress/`
2. Actualizar `docs/tasks/README.md` — cambiar estado a `In Progress`
3. Registrar en `Handoff.md` qué task se está trabajando, rama y objetivo

### Al completar una task
1. Mover el archivo de `in-progress/` a `complete/`
2. Actualizar `docs/tasks/README.md` — mover entrada a sección `Complete` con resumen de lo implementado
3. Documentar en `Handoff.md` y `changelog.md`
4. Ejecutar el chequeo de impacto cruzado (ver abajo)

### Chequeo de impacto cruzado (obligatorio al cerrar)
Después de completar implementación, escanear `docs/tasks/to-do/` buscando tasks que:
- **Referencien archivos que se modificaron** → actualizar su sección "Ya existe"
- **Declaren gaps que el trabajo acaba de cerrar** → marcar el gap como resuelto con fecha
- **Tengan supuestos que los cambios invaliden** → agregar nota delta con fecha y nuevo estado
- **Estén ahora completamente implementadas** → marcar para cierre y notificar al usuario

Regla: si una task ajena cambió de estado real (un gap se cerró, un supuesto cambió), agregar al inicio del archivo:
```markdown
## Delta YYYY-MM-DD
- [descripción del cambio] — cerrado por trabajo en [task que lo causó]
```

### Reclasificación de documentos
Si durante una auditoría se determina que un archivo en `docs/tasks/` no es una task sino una spec de arquitectura o referencia:
- Moverlo a `docs/architecture/`
- Actualizar `docs/tasks/README.md` con nota de reclasificación
- Si tiene gaps operativos pendientes, crear una task derivada en `to-do/`

### Dependencias entre tasks
Cada task activa debe tener un bloque `## Dependencies & Impact` que declare:
- **Depende de:** qué tablas, schemas, o tasks deben existir antes
- **Impacta a:** qué otras tasks se verían afectadas si esta se completa
- **Archivos owned:** qué archivos son propiedad de esta task (para detectar impacto cruzado)

Cuando un agente modifica archivos listados como "owned" por otra task, debe revisar esa task y actualizar su estado si corresponde.

### GitHub Project mirror
- El Project de GitHub es la capa operativa de seguimiento; la task markdown sigue siendo la fuente canonica de alcance.
- Toda task activa o priorizada para iteracion debe idealmente tener:
  - issue con titulo `[TASK-###] ...`
  - `Task ID` y `Task Doc` visibles
  - estado alineado con el pipeline del Project
- La referencia canonica para este flujo queda en:
  - `docs/operations/GITHUB_PROJECT_OPERATING_MODEL_V1.md`

## Checklist de Cierre de Turno
- Cambios acotados y entendibles.
- Verificacion ejecutada o limitacion documentada.
- Ningun `commit` o `push` hecho sin revisar que el cambio este estable para su alcance.
- Rama de trabajo y destino de merge claros.
- `Handoff.md` actualizado si hubo impacto real.
- `changelog.md` actualizado si hubo cambio relevante.
- `project_context.md` actualizado si cambio la arquitectura, el deploy o los supuestos.

## Regla Final
Si una decision no esta documentada y puede afectar a otros agentes, aun no esta cerrada.
