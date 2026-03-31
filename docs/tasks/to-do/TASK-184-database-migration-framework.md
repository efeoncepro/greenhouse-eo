# TASK-184 — Database Migration Framework (node-pg-migrate)

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Diseno` |
| Domain | Platform / Database |
| Sequence | Independiente — no bloquea ni es bloqueada por otras tasks |

## Summary

Greenhouse opera 9+ schemas PostgreSQL (`greenhouse_core`, `greenhouse_serving`, `greenhouse_sync`, `greenhouse_payroll`, `greenhouse_finance`, `greenhouse_hr`, `greenhouse_crm`, `greenhouse_delivery`, `greenhouse_ai`) sin un framework de migraciones versionadas. Los cambios de schema se aplican manualmente, sin trazabilidad, sin rollback, y sin garantia de paridad entre ambientes (dev/staging/prod). Esta task instala `node-pg-migrate` como herramienta de migraciones SQL-first, integra los scripts en `pnpm`, y establece el flujo operativo para que todo cambio de schema futuro sea versionado en git.

## Why This Task Exists

### Problemas actuales

1. **Sin trazabilidad** — no hay forma auditable de saber que cambios de schema se aplicaron en cada ambiente ni cuando
2. **Sin rollback** — un ALTER destructivo en produccion no tiene vuelta atras sistematizada
3. **Drift entre ambientes** — dev puede tener columnas o indices que staging/prod no tienen, sin forma de detectarlo
4. **Sin coordinacion** — dos tasks que tocan el mismo schema no generan conflicto detectable en git (el conflicto aparece en runtime)
5. **Onboarding de agentes** — agentes AI (Codex, Claude) no pueden derivar el estado del schema sin conectarse a la base; con migraciones, leen la carpeta y tienen la historia completa

### Escala del problema

- **9 schemas activos** con ~40+ tablas
- **3 perfiles de acceso** (runtime, migrator, admin) — solo migrator/admin pueden hacer DDL
- **Crecimiento constante** — cada task de Finance, HR, o Agency agrega columnas, tablas, o indices

### Contexto: Prisma existia en el starter kit

El shell Vuexy (`full-version/`) incluye Prisma 6.19 + `@auth/prisma-adapter` para auth sessions. Cuando se construyo Greenhouse, se opto por SQL directo (`pg`) contra Cloud SQL + BigQuery, decision correcta para multi-schema. Pero se salto el componente de migraciones que Prisma habria dado gratis. `node-pg-migrate` llena ese gap sin forzar la adopcion del ORM.

### Por que node-pg-migrate

| Criterio | node-pg-migrate | Prisma / Drizzle | Flyway |
|----------|----------------|-------------------|--------|
| SQL-first | Si — SQL puro | No — DSL propio | Si |
| Multi-schema | Nativo | Prisma no soporta bien | Si |
| Peso | ~50KB, sin deps pesadas | ORM completo | Java runtime |
| Rollback | Up/down explicitos | Prisma no tiene down real | Si |
| Ecosistema Node.js | Nativo pnpm | Si | No (Java) |
| Complejidad | Minima | Overkill (no usamos ORM) | Overkill (enterprise) |

## Consideraciones Tecnicas Criticas

### 1. Conexion: TCP directo, no Cloud SQL Connector

El runtime (`src/lib/postgres/client.ts`) conecta via `@google-cloud/cloud-sql-connector` con IAM auth de GCP. El CLI de `node-pg-migrate` no puede usar ese connector — necesita conexion TCP directa.

Las migraciones deben usar el path de fallback (host + port + user + password):

```bash
# Env vars para el CLI de migraciones (no usa Cloud SQL Connector)
PGHOST=<ip-o-host-directo-cloud-sql>
PGPORT=5432
PGDATABASE=greenhouse
PGUSER=greenhouse_ops
PGPASSWORD=<password>
```

**Decision:** crear un archivo `.env.migrations` (gitignored) con estas variables, y un wrapper script que las cargue antes de invocar `node-pg-migrate`.

### 2. Usuario: `greenhouse_ops` (no `migrator`)

La ownership de tablas esta repartida entre multiples usuarios (`migrator`, `migrator_user`, `app`, `postgres`). Solo `greenhouse_ops` hereda todos los roles via grants y puede hacer DDL en cualquier schema sin errores de ownership.

| Usuario | Rol | Usar para migraciones |
|---------|-----|----------------------|
| `greenhouse_app` | Runtime DML (SELECT, INSERT, UPDATE) | No — sin permisos DDL |
| `greenhouse_migrator` | DDL parcial | No — ownership fragmentada |
| **`greenhouse_ops`** | **DDL completo, hereda todos los roles** | **Si — usar este** |

### 3. No hay PostgreSQL local

Todo el desarrollo apunta a Cloud SQL remoto. Esto implica:

- No se pueden testear migraciones en un sandbox local
- Los `down` migrations son mas riesgosos — no hay donde validar rollback previamente
- CI no puede ejecutar migraciones sin acceso a Cloud SQL

**Decision:** evaluar en Phase 1 si agregar un `docker-compose.yml` con PostgreSQL local para test de migraciones. No es bloqueante pero reduce riesgo. Como minimo, el CI debe validar sintaxis SQL sin ejecutar contra la base.

### 4. Resolucion de secrets

El runtime resuelve passwords desde GCP Secret Manager (`src/lib/secrets/secret-manager.ts`). El CLI de migraciones no pasa por ese flujo.

**Decision:** el wrapper script de migraciones debe resolver el secret antes de invocar el CLI:

```bash
# scripts/migrate.sh (ejemplo conceptual)
export PGPASSWORD=$(gcloud secrets versions access latest --secret=greenhouse-ops-password)
npx node-pg-migrate "$@"
```

### 5. Orden de ejecucion: migracion ANTES del deploy

En Vercel serverless no se pueden correr migraciones en deploy time. El flujo operativo obligatorio es:

```
1. Merge PR con migracion + codigo
2. Correr `pnpm migrate:up` contra el ambiente target
3. Vercel deploya el codigo que consume el nuevo schema
```

Si se invierte el orden (deploy primero, migracion despues), el codigo falla porque la columna/tabla no existe aun.

**Regla:** migraciones deben ser backward-compatible cuando sea posible (agregar columna nullable primero, deploy codigo, backfill, luego agregar constraint).

### 6. Schema snapshot como punto cero

Antes de iniciar, capturar `pg_dump --schema-only` de cada ambiente como artefacto de referencia en `docs/architecture/`. No es una migracion — es evidencia del estado inicial para auditar drift futuro.

## Scope

### In Scope

1. **Instalar `node-pg-migrate`** como devDependency
2. **Configurar conexion** via TCP directo con usuario `greenhouse_ops` y wrapper de secrets
3. **Crear carpeta `migrations/`** en la raiz del proyecto
4. **Tabla de tracking** — `pgmigrations` en schema `public` (neutral, accesible por todos los roles)
5. **Scripts pnpm:**
   - `pnpm migrate:up` — aplica migraciones pendientes
   - `pnpm migrate:down` — revierte la ultima migracion
   - `pnpm migrate:create <nombre>` — crea archivo de migracion con timestamp
   - `pnpm migrate:status` — muestra migraciones pendientes vs aplicadas
6. **Wrapper script** (`scripts/migrate.sh`) que resuelve secrets y configura conexion TCP
7. **Archivo `.env.migrations`** (gitignored) para credenciales locales del CLI
8. **Schema snapshot** — `pg_dump --schema-only` de dev como baseline de referencia
9. **Migracion baseline** — no-op que marca el estado actual como punto de partida
10. **Documentacion operativa** — flujo de migraciones para agentes y operadores, referenciado desde `AGENTS.md`
11. **Integracion CI** — verificar migraciones pendientes (warning, no blocker inicialmente)

### Out of Scope

- Migrar schema existente retroactivamente (baseline marca el punto de partida, no reconstruye historia)
- Data migrations complejas (DML masivo) — se manejan aparte
- Cambiar el patron de queries existente (sigue siendo SQL directo via `pg`)
- PostgreSQL local via Docker (evaluable como mejora posterior)
- Atlas u otra herramienta declarativa (evaluable si la complejidad crece)

## Implementation Plan

### Phase 1: Setup (core)

1. `pnpm add -D node-pg-migrate`
2. Crear wrapper script `scripts/migrate.sh` que:
   - Carga `.env.migrations` si existe (desarrollo local)
   - O resuelve password via `gcloud secrets` (CI/operaciones)
   - Invoca `node-pg-migrate` con las env vars correctas
3. Crear `.env.migrations.example` con las variables requeridas (sin valores reales)
4. Agregar `.env.migrations` a `.gitignore`
5. Crear carpeta `migrations/` con `.gitkeep`
6. Agregar scripts a `package.json`
7. Tabla de tracking `pgmigrations` en schema `public`

### Phase 2: Baseline

1. Capturar `pg_dump --schema-only` de dev como referencia en `docs/architecture/schema-snapshot-baseline.sql`
2. Crear migracion baseline `{timestamp}_baseline.sql` (no-op, solo marca punto de partida)
3. Ejecutar en dev para validar que el tracking funciona
4. Ejecutar en staging y prod

### Phase 3: Operaciones

1. Documentar flujo en `docs/operations/database-migrations.md`:
   - Como crear una migracion nueva
   - Como aplicar en cada ambiente (dev → staging → prod)
   - Como hacer rollback
   - Convencion de nombres: `{timestamp}_{schema}_{descripcion}.sql`
   - Regla de orden: **migracion ANTES del deploy, siempre**
   - Regla de backward-compatibility: columnas nullable primero, constraints despues
2. Actualizar `AGENTS.md` con:
   - Regla: todo DDL debe ir como migracion, nunca manual
   - Referencia al doc de operaciones
3. Agregar step en CI (GitHub Actions) que ejecute `pnpm migrate:status` y reporte migraciones pendientes

### Phase 4: Adopcion

1. Proxima task que requiera DDL debe crear su migracion via este framework
2. Validar que agentes (Codex, Claude) usan `pnpm migrate:create` correctamente

## Validation Criteria

- [ ] `pnpm migrate:up` aplica migraciones pendientes exitosamente en dev
- [ ] `pnpm migrate:down` revierte la ultima migracion aplicada
- [ ] `pnpm migrate:create test-migration` genera archivo con timestamp correcto en `migrations/`
- [ ] `pnpm migrate:status` reporta estado correcto (aplicadas vs pendientes)
- [ ] Tabla `pgmigrations` existe en schema `public` y registra migraciones aplicadas
- [ ] Wrapper script resuelve credenciales correctamente (local y CI)
- [ ] Migracion baseline aplicada en dev sin errores
- [ ] Schema snapshot capturado y guardado en `docs/architecture/`
- [ ] CI reporta estado de migraciones (no bloquea, solo informa)
- [ ] Documentacion operativa escrita y referenciada desde `AGENTS.md`
- [ ] `pnpm build` y `pnpm lint` siguen pasando sin errores

## Dependencies & Impact

- **Depende de:**
  - Usuario `greenhouse_ops` con DDL privileges en todos los schemas
  - Acceso TCP directo a Cloud SQL `greenhouse-pg-dev` (dev), equivalente en staging/prod
  - `gcloud` CLI para resolucion de secrets en CI/operaciones
  - `pnpm` como package manager
- **Impacta a:**
  - **Toda task futura que haga DDL** — debe crear migracion en lugar de ALTER manual
  - TASK-174 (Finance data integrity) — puede versionar sus cambios de schema
  - TASK-180 (HR departments cutover) — puede versionar schema changes
  - TASK-172 (Platform hardening) — complementa CI pipeline
  - `AGENTS.md` — requiere actualizacion de instrucciones operativas
- **Archivos owned:**
  - `migrations/` (carpeta completa)
  - `scripts/migrate.sh` (wrapper de conexion)
  - `.env.migrations.example` (template de configuracion)
  - Scripts `migrate:*` en `package.json`

## Risks

| Riesgo | Mitigacion |
|--------|-----------|
| `greenhouse_ops` pierde permisos o roles heredados | Verificar con `pg:doctor` antes de ejecutar; documentar grants requeridos |
| Conexion TCP directa no accesible desde CI (firewall Cloud SQL) | Configurar authorized networks o usar Cloud SQL Auth Proxy en CI |
| Migraciones ejecutadas fuera de orden entre ambientes | Convencion estricta: merge a `develop` → apply en staging → merge a `main` → apply en prod |
| Alguien aplica DDL manual sin migracion | Documentar en `AGENTS.md` como regla operativa; CI warning como guardrail |
| Baseline migration falla si schema actual difiere entre ambientes | Baseline es no-op (solo marca timestamp); schema snapshot detecta drift previo |
| Deploy ocurre antes que la migracion | Documentar regla de orden; CI warning si hay migraciones pendientes en branch |
| Password expira o rota sin actualizar `.env.migrations` | Wrapper script con fallback a `gcloud secrets`; no depender solo del archivo local |

## References

- [node-pg-migrate docs](https://salsita.github.io/node-pg-migrate/)
- `src/lib/postgres/client.ts` — patron de conexion actual (Cloud SQL Connector + TCP fallback)
- `GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — perfiles de acceso runtime/migrator/admin
- `GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — estrategia PostgreSQL + BigQuery
