## Delta 2026-04-01
- **Implementado** — `src/lib/db.ts` (re-exports existing client + Kysely), `src/types/db.d.ts` (placeholder), node-pg-migrate + kysely + kysely-codegen instalados, AGENTS.md actualizado.
- **Desviación Part A**: Prisma solo existe en `full-version/` (Vuexy reference), no en producción. No hay cleanup necesario en `src/` ni `package.json` principal.
- **Desviación Part B**: `db.ts` NO reemplaza `client.ts` — es un wrapper thin que re-exporta el singleton existente y agrega Kysely encima. `getDb()` es async porque el Pool usa Cloud SQL Connector + Secret Manager.
- **Desviación Part C**: No se usa `DATABASE_URL` ni `MIGRATION_DATABASE_URL` como env vars — el wrapper `scripts/migrate.ts` construye la URL internamente desde `GREENHOUSE_POSTGRES_*`.
- **Desviación Part D**: `kysely-codegen` placeholder generado. Codegen real pendiente de ejecución contra DB live.

# TASK-185 — Database Tooling Foundation

> Centralizar conexión PostgreSQL, adoptar migraciones versionadas y query builder tipado.

---

## Resumen

Greenhouse opera sobre PostgreSQL (Cloud SQL) con `pg` (node-postgres) directo, sin ORM ni framework de base de datos. Esto genera tres problemas recurrentes:

1. **No hay singleton de conexión.** Los agentes (Claude Code, Codex) gastan tokens significativos descubriendo cómo conectarse a PostgreSQL en cada tarea — buscan passwords, Secret Manager, `.env`, crean Pool instances ad-hoc.
2. **No hay migraciones versionadas.** Los schemas se crearon con scripts SQL manuales. No hay tracking de qué DDL se aplicó, ni forma reproducible de evolucionar el schema.
3. **No hay type safety en queries.** Los agentes escriben SQL como strings sin validación — typos en nombres de tablas y columnas solo se detectan en runtime.

Este task instala las tres piezas fundacionales:

| Pieza | Herramienta | Propósito |
|-------|-------------|-----------|
| Conexión centralizada | `src/lib/db.ts` | Un archivo, un import, cero ambigüedad |
| Migraciones | `node-pg-migrate` | DDL versionado, ejecutado con `greenhouse_migrator` |
| Query builder tipado | `kysely` + `kysely-codegen` | Type safety para queries, autocompletado para agentes |

---

## Contexto del proyecto

- **Producto:** Greenhouse EO — Portal central de operaciones
- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Stack:** Next.js 16 + React 19 + MUI 7 / Vuexy + TypeScript 5.9 + pnpm
- **Base de datos:** PostgreSQL 16 en Cloud SQL (`greenhouse-pg-dev`, `us-east4`)
- **Database:** `greenhouse_app`
- **Schemas existentes:** `greenhouse_core`, `greenhouse_serving`, `greenhouse_sync`, `greenhouse_hr`, `greenhouse_payroll`, `greenhouse_finance`, `greenhouse_delivery`, `greenhouse_crm`, `greenhouse_ai`
- **Deploy:** Vercel Pro
- **Runtime PG user:** `greenhouse_app` (hereda `greenhouse_runtime` — solo DML)
- **Migration PG user:** `greenhouse_migrator_user` (hereda `greenhouse_migrator` — DDL)

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` | Arquitectura general, reglas de componentes |
| `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` | Roles `greenhouse_runtime` vs `greenhouse_migrator`, schema contracts |
| `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` | Cloud SQL provisioning, schemas, non-negotiable rules |
| `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` | Instance details, connectivity, access model |
| `docs/reference/POSTGRESQL_ADVANCED_PATTERNS.md` | Pool config, transaction helper, UNNEST, error handling patterns |
| `project_context.md` | Contexto general del proyecto |
| `AGENTS.md` | Instrucciones para agentes |

---

## Dependencias

| Dependencia | Tipo | Versión |
|-------------|------|---------|
| `pg` | existente | (ya instalado) |
| `@types/pg` | existente | (ya instalado) |
| `node-pg-migrate` | nueva (devDependency) | latest |
| `kysely` | nueva | latest |
| `kysely-codegen` | nueva (devDependency) | latest |

### Pre-requisitos

- Verificar que no existan restos de Prisma en el repo (ver sección de limpieza abajo).
- `DATABASE_URL` debe estar configurado en `.env` / `.env.local` apuntando al runtime user (`greenhouse_app`).
- `MIGRATION_DATABASE_URL` debe configurarse apuntando al migration user (`greenhouse_migrator_user`).

---

## Parte A: Limpieza de Prisma

El shell de Vuexy incluía Prisma. Antes de instalar el nuevo tooling, limpiar cualquier residuo.

### A.1 Audit

Buscar y reportar:

```
prisma/                          # folder con schema.prisma
@prisma/client                   # en package.json (dependencies o devDependencies)
PrismaClient                     # imports en cualquier .ts/.tsx/.js
prisma generate|migrate|db       # scripts en package.json
schema.prisma                    # archivo suelto en cualquier ubicación
```

### A.2 Limpieza

- Eliminar `prisma/` folder si existe.
- Eliminar `@prisma/client` y `prisma` de `package.json`.
- Eliminar cualquier import de `PrismaClient` — si algún archivo lo usaba activamente, reemplazar con el nuevo `pool` de `src/lib/db.ts` (Parte B).
- Eliminar scripts de Prisma en `package.json`.
- Ejecutar `pnpm install` para limpiar lockfile.
- Verificar que `pnpm build` pase sin errores.

---

## Parte B: Conexión centralizada — `src/lib/db.ts`

### B.1 Archivo

Crear `src/lib/db.ts` como THE single source of truth para toda conexión a PostgreSQL.

```typescript
// src/lib/db.ts
// ============================================================
// Greenhouse PostgreSQL — Centralized Database Connection
// ============================================================
// RULE: Never create Pool instances outside this file.
// RULE: Never read DATABASE_URL directly outside this file.
// RULE: Import { pool } for raw pg queries.
// RULE: Import { db } for Kysely typed queries (new modules).
// ============================================================

import { Pool } from 'pg'
import { Kysely, PostgresDialect } from 'kysely'
import type { DB } from '@/types/db' // generated by kysely-codegen

// ── Raw pg Pool (legacy + advanced queries) ──────────────────
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500,
})

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err)
})

// ── Kysely instance (typed queries for new modules) ──────────
export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
})

// ── Transaction helper (raw pg) ──────────────────────────────
import type { PoolClient } from 'pg'

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

### B.2 Regla para agentes

Agregar al `AGENTS.md` y `project_context.md`:

```markdown
## Database Connection

- **Import `pool` from `@/lib/db`** for raw SQL queries (pg).
- **Import `db` from `@/lib/db`** for typed queries (Kysely) in new modules.
- **Import `withTransaction` from `@/lib/db`** for transactions.
- **NEVER** create new `Pool` instances.
- **NEVER** read `DATABASE_URL` directly outside `src/lib/db.ts`.
- **NEVER** import from `pg` directly in route handlers or lib files — always go through `@/lib/db`.
- Existing modules using raw `pool.query()` are fine — no need to migrate to Kysely retroactively.
- New modules SHOULD use Kysely (`db`) for type safety.
```

### B.3 Migración de imports existentes

Buscar todos los archivos que crean `new Pool()` o importan `Pool` de `pg` directamente, y reemplazar con:

```typescript
import { pool } from '@/lib/db'
// o
import { pool, withTransaction } from '@/lib/db'
```

No cambiar la lógica de los queries — solo centralizar el origen del Pool.

---

## Parte C: Migraciones — `node-pg-migrate`

### C.1 Instalación

```bash
pnpm add -D node-pg-migrate
```

### C.2 Scripts en `package.json`

```json
{
  "scripts": {
    "migrate:up": "node-pg-migrate up --database-url-var MIGRATION_DATABASE_URL --migrations-dir migrations --migration-filename-format utc",
    "migrate:down": "node-pg-migrate down --database-url-var MIGRATION_DATABASE_URL --migrations-dir migrations --migration-filename-format utc",
    "migrate:create": "node-pg-migrate create --migrations-dir migrations --migration-filename-format utc"
  }
}
```

### C.3 Variables de entorno

Agregar a `.env.local` y documentar en `.env.example`:

```env
# Runtime (greenhouse_app user — DML only)
DATABASE_URL=postgresql://greenhouse_app:<password>@34.86.135.144:5432/greenhouse_app

# Migrations (greenhouse_migrator_user — DDL)
MIGRATION_DATABASE_URL=postgresql://greenhouse_migrator_user:<password>@34.86.135.144:5432/greenhouse_app
```

### C.4 Tabla de tracking

`node-pg-migrate` crea automáticamente una tabla `pgmigrations` en el schema `public`. Esto es aceptable — la tabla es pequeña y no interfiere con los domain schemas.

### C.5 Convención de archivos

```
migrations/
├── 20260401120000_initial-baseline.sql
├── 20260402090000_add-hr-performance-tables.sql
└── ...
```

- Formato: `YYYYMMDDHHMMSS_descripcion-kebab-case.sql`
- El flag `--migration-filename-format utc` genera el timestamp automáticamente con `migrate:create`.
- Escribir migraciones en SQL puro (no JavaScript). `node-pg-migrate` soporta archivos `.sql` nativamente.
- Cada migración DEBE incluir `SET search_path = <target_schema>, greenhouse_core, public;` al inicio.

### C.6 Migración baseline

La primera migración es un **no-op baseline** que marca el estado actual del schema como "migración 0". No ejecuta DDL — solo registra que el schema existente ya está aplicado.

```sql
-- migrations/20260401120000_initial-baseline.sql
-- Baseline migration: marks existing schema as migrated.
-- All tables in greenhouse_core, greenhouse_hr, greenhouse_payroll,
-- greenhouse_finance, greenhouse_delivery, greenhouse_crm,
-- greenhouse_serving, greenhouse_sync, greenhouse_ai
-- were created before node-pg-migrate adoption.
-- This migration intentionally does nothing.
SELECT 1;
```

### C.7 Regla para futuros tasks

Todo TASK que modifique schema PostgreSQL DEBE incluir un archivo de migración en `migrations/`. El agente implementador:

1. Crea la migración con `pnpm migrate:create <nombre>`
2. Escribe el DDL en el archivo generado
3. Ejecuta `pnpm migrate:up` para aplicar
4. Verifica que `pnpm migrate:down` revierte correctamente (si aplica)

---

## Parte D: Kysely — Query builder tipado

### D.1 Instalación

```bash
pnpm add kysely
pnpm add -D kysely-codegen
```

### D.2 Generación de tipos

```bash
npx kysely-codegen \
  --url "$DATABASE_URL" \
  --out-file src/types/db.d.ts \
  --schema greenhouse_core \
  --schema greenhouse_hr \
  --schema greenhouse_payroll \
  --schema greenhouse_finance \
  --schema greenhouse_delivery \
  --schema greenhouse_crm \
  --schema greenhouse_serving \
  --schema greenhouse_sync \
  --schema greenhouse_ai
```

Esto genera un archivo `src/types/db.d.ts` con interfaces TypeScript para todas las tablas y columnas de los 9 schemas.

### D.3 Script de regeneración

Agregar a `package.json`:

```json
{
  "scripts": {
    "db:generate-types": "kysely-codegen --url \"$DATABASE_URL\" --out-file src/types/db.d.ts --schema greenhouse_core --schema greenhouse_hr --schema greenhouse_payroll --schema greenhouse_finance --schema greenhouse_delivery --schema greenhouse_crm --schema greenhouse_serving --schema greenhouse_sync --schema greenhouse_ai"
  }
}
```

### D.4 Flujo post-migración

Después de cada `pnpm migrate:up`, ejecutar `pnpm db:generate-types` para que los tipos reflejen el schema actualizado. Esto es manual por ahora — no automatizar en CI hasta que el flujo sea estable.

### D.5 Uso en módulos nuevos

```typescript
import { db } from '@/lib/db'

// Typed query — autocompletado de tablas y columnas
const members = await db
  .selectFrom('greenhouse_hr.members')
  .select(['id', 'full_name', 'email', 'status'])
  .where('space_id', '=', spaceId)
  .where('status', '=', 'active')
  .execute()

// Typed insert
await db
  .insertInto('greenhouse_hr.leave_requests')
  .values({
    member_id: memberId,
    leave_type: 'vacation',
    start_date: startDate,
    end_date: endDate,
    status: 'pending',
  })
  .execute()
```

### D.6 Coexistencia con pg directo

Kysely y `pool.query()` coexisten sin conflicto — ambos usan el mismo Pool subyacente. Regla:

- **Módulos existentes:** siguen usando `pool.query()`. No migrar retroactivamente.
- **Módulos nuevos:** usan `db` (Kysely) por defecto.
- **Queries avanzados** (UNNEST, CTEs complejos, raw SQL necesario): usar `pool.query()` o `sql` tag de Kysely.

---

## Estructura de archivos

```
greenhouse-eo/
├── migrations/                              # NUEVO — migraciones SQL
│   └── 20260401120000_initial-baseline.sql
├── src/
│   ├── lib/
│   │   └── db.ts                            # NUEVO — singleton de conexión
│   └── types/
│       └── db.d.ts                          # NUEVO — tipos generados por kysely-codegen
├── .env.example                             # ACTUALIZAR — agregar MIGRATION_DATABASE_URL
└── package.json                             # ACTUALIZAR — scripts + dependencias
```

---

## Documentos a actualizar

| Documento | Qué actualizar |
|-----------|---------------|
| `AGENTS.md` | Agregar sección "Database Connection" (ver B.2) |
| `project_context.md` | Agregar regla de conexión centralizada y mención de Kysely |
| `Handoff.md` | Agregar nota sobre nuevo tooling de DB |
| `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` | Agregar mención de `node-pg-migrate` y `kysely` en stack |
| `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` | Agregar `MIGRATION_DATABASE_URL` a la sección de variables |

---

## Criterios de aceptación

### P0 — Must have

- [ ] No quedan restos de Prisma en el repo (`@prisma/client`, `prisma/`, imports de `PrismaClient`).
- [ ] `src/lib/db.ts` existe y exporta `pool`, `db`, y `withTransaction`.
- [ ] Ningún otro archivo en el repo crea `new Pool()` — todos importan de `@/lib/db`.
- [ ] `node-pg-migrate` instalado, scripts configurados en `package.json`.
- [ ] Migración baseline aplicada — tabla `pgmigrations` existe con un registro.
- [ ] `MIGRATION_DATABASE_URL` documentada en `.env.example`.
- [ ] `kysely` y `kysely-codegen` instalados.
- [ ] `src/types/db.d.ts` generado con tipos para los 9 schemas.
- [ ] `db` (Kysely instance) funciona — un query de prueba retorna resultados tipados.
- [ ] `pnpm build` pasa sin errores.
- [ ] `AGENTS.md` y `project_context.md` actualizados con regla de conexión.

### P1 — Should have

- [ ] Script `db:generate-types` funciona correctamente.
- [ ] Al menos un módulo existente migrado de `new Pool()` ad-hoc a `import { pool } from '@/lib/db'` como ejemplo.
- [ ] `Handoff.md` actualizado.

### P2 — Nice to have

- [ ] Documentar en README cómo correr migraciones localmente.
- [ ] Agregar un ejemplo de migración real (no baseline) como referencia para futuros tasks.

---

## Notas para el agente

- **Lee `AGENTS.md` y `project_context.md` antes de empezar.**
- **La Parte A (limpieza de Prisma) va primero.** No instales nada nuevo hasta confirmar que Prisma está limpio. Si hay código activo que depende de Prisma, reporta antes de eliminarlo.
- **`db.ts` es el archivo más importante de este task.** Todo lo demás depende de que este archivo exista y sea el único punto de conexión.
- **No migres queries existentes a Kysely.** Solo centraliza el Pool. Kysely es forward-only para módulos nuevos.
- **`kysely-codegen` necesita conectarse a la DB real** para introspeccionar los schemas. Asegúrate de tener `DATABASE_URL` configurado correctamente antes de ejecutarlo.
- **Si `kysely-codegen` no soporta el flag `--schema` múltiple**, usar la alternativa de configurar `search_path` en la connection string o generar por schema y combinar.
- **No automatices regeneración de tipos en CI todavía.** Es un paso manual post-migración hasta que el flujo sea estable.
- **Branch naming:** `feature/database-tooling-foundation`

---

*Greenhouse EO™ • Efeonce Group • Abril 2026*
*Documento técnico interno para agentes de desarrollo.*
