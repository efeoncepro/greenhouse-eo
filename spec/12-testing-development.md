# Flujo de Testing & Desarrollo — Greenhouse Portal

**Versión:** 2.1
**Fecha:** 2026-04-02
**Clasificación:** Especificación de Arquitectura

---

## Resumen Ejecutivo

Este documento detalla el marco de pruebas, ciclo de desarrollo, migraciones de base de datos, y despliegue para el portal operativo Greenhouse EO. El flujo está optimizado para **type safety**, **reproducibilidad** y **rapidez iterativa** usando Vitest, Testing Library, node-pg-migrate y GitHub Actions.

---

## 1. Marco de Testing

### 1.1 Stack Tecnológico

| Componente | Versión | Propósito |
|-----------|---------|----------|
| **Vitest** | 4.1.0 | Test runner canónico, API compatible con Jest |
| **@testing-library/react** | 16.3.2 | Testing con comportamiento de usuario, no implementación |
| **@testing-library/dom** | 10.4.1 | Queries y matchers de DOM |
| **@testing-library/user-event** | 14.6.1 | Simulación realista de eventos de usuario |
| **@testing-library/jest-dom** | 6.9.1 | Matchers semánticos (toBeVisible, toBeInTheDocument, etc.) |
| **jsdom** | 29.0.0 | Entorno DOM simulado (Node.js) |

### 1.2 Comandos de Testing

```bash
# Ejecutar suite completa
pnpm test

# Modo watch (re-ejecuta al cambiar archivos)
pnpm test:watch

# Coverage (si está configurado)
pnpm test --coverage
```

### 1.3 Patrones de Archivo

Los tests se descubren automáticamente según estos patrones:
```
src/**/*.test.ts(x)
src/**/*.spec.ts(x)
scripts/**/*.test.ts(x)
scripts/**/*.spec.ts(x)
```

**Convención de nombrado:**
- Test unitario: `src/lib/payroll/calculate-net.test.ts` (junto al módulo)
- Test de componente: `src/components/greenhouse/Button.test.tsx`
- Test de integración: `src/lib/finance/period-closure.test.ts`

---

## 2. Configuración de Vitest

### 2.1 Archivo vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Entorno: jsdom para DOM, node para lógica pura
    environment: 'jsdom',

    // Globales de Jest disponibles sin import
    globals: true,

    // Archivo setup: inyecta matchers y mocks globales
    setupFiles: ['src/test/setup.ts'],

    // Alias de path (coinciden con tsconfig.json)
    alias: {
      '@': 'src/',
      '@core': 'src/@core',
      '@layouts': 'src/@layouts',
      '@menu': 'src/@menu',
      '@assets': 'src/assets',
      '@components': 'src/components',
      '@configs': 'src/configs',
      '@views': 'src/views'
    }
  }
})
```

### 2.2 Patrones de Alias

Usar siempre alias en imports de test:
```typescript
// ✓ Correcto
import { calculatePayroll } from '@/lib/payroll/calculate'
import { Button } from '@/components/greenhouse/Button'

// ✗ Evitar
import { calculatePayroll } from '../../../lib/payroll/calculate'
```

---

## 3. Utilidades de Testing (src/test/)

### 3.1 setup.ts — Configuración Global

```typescript
// src/test/setup.ts

import '@testing-library/jest-dom'

// Mock para 'server-only' (usado en server actions)
vi.mock('server-only', () => ({
  default: {}
}))

// Otros mocks globales según necesidad
```

**Qué va aquí:**
- Jest-dom matchers (toBeVisible, toBeInTheDocument, etc.)
- Mocks de módulos globales (server-only, next/router, etc.)
- Setup de librerías externas (msw, vitest-canvas-mock, etc.)
- Configuración de timezones si aplica

### 3.2 render.tsx — Helper de Render con Tema

```typescript
// src/test/render.tsx

import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from '@/config/theme' // Theme de MUI

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

**Uso en tests:**
```typescript
import { render, screen } from '@/test/render'

test('Button renders with theme', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByRole('button')).toBeInTheDocument()
})
```

---

## 4. Cobertura de Tests en el Codebase

### 4.1 Módulos Core (lib/)

| Módulo | Ejemplos de Tests |
|--------|-------------------|
| **admin** | admin-preview-persons.test.ts |
| **agency** | agency-finance-metrics.test.ts, agency-queries.test.ts |
| **alerts** | slack-notify.test.ts |
| **calendar** | get-admin-operational-calendar-overview.test.ts, nager-date-holidays.test.ts |
| **campaigns** | campaign-extended.test.ts, campaign-metrics.test.ts, backfill-heuristics.test.ts |
| **cloud** | bigquery.test.ts, cron.test.ts |
| **commercial-cost-attribution** | member-period-attribution.test.ts, assignment-classification.test.ts, insights.test.ts |
| **cost-intelligence** | compute-operational-pl.test.ts, check-period-readiness.test.ts |
| **cron** | require-cron-auth.test.ts |
| **email** | delivery.test.ts, templates.test.ts |
| **finance** | auto-allocation-rules.test.ts, canonical.test.ts (y otros) |
| **forms** | greenhouse-form-patterns.test.ts |
| **identity** | canonical-person.test.ts, matching-engine.test.ts, normalize.test.ts |
| **nexa** | nexa-service.test.ts |
| **notifications** | notification-service.test.ts, person-recipient-resolver.test.ts |
| **nubox** | client.test.ts, sync-nubox-conformed.test.ts, mappers.test.ts, dte-matching.test.ts |
| **payroll** | auto-calculate-payroll.test.ts |
| **people** | get-people-list.test.ts, get-person-detail.test.ts |
| **person-360** | get-person-finance.test.ts, get-person-delivery.test.ts |
| **person-intelligence** | compute.test.ts |
| **providers** | provider-tooling-snapshots.test.ts |
| **secrets** | secret-manager.test.ts |
| **services** | service-sync.test.ts |
| **space-notion** | notion-performance-report-publication.test.ts |
| **storage** | greenhouse-assets-shared.test.ts |
| **sync** | projection-registry.test.ts |
| **team-capacity** | economics.test.ts, internal-assignments.test.ts, overhead.test.ts |
| **tenant** | authorization.test.ts |
| **webhooks** | signing.test.ts |

### 4.2 Componentes UI (components/)

```
src/components/greenhouse/
├── accessibility.test.ts
├── EmptyState.test.tsx
├── LeaveRequestDialog.test.tsx
└── ... (otros componentes con tests)
```

### 4.3 Configuración (config/)

```
src/config/
├── nexa-models.test.ts
└── ...
```

### 4.4 Emails (emails/)

```
src/emails/
├── PayrollExportReadyEmail.test.tsx
├── PayrollReceiptEmail.test.tsx
└── ...
```

### 4.5 Módulos HR (lib/hr-core/)

```
src/lib/hr-core/
├── leave-domain.test.ts
├── postgres-departments-store.test.ts
└── ...
```

---

## 5. Scripts de Smoke & Auditoría

Para validación rápida sin suite completa de tests:

### 5.1 Smoke Tests (Validación Operacional)

```bash
# Cierre de período — validación de integridad
pnpm exec ts-node scripts/smoke-cost-intelligence-period-closure.ts

# Cálculo de P&L operativo
pnpm exec ts-node scripts/smoke-cost-intelligence-operational-pl.ts

# Runtime de equipo admin
pnpm exec ts-node scripts/admin-team-runtime-smoke.ts
```

### 5.2 Auditoría (Cobertura & Diagnóstico)

```bash
# Auditar cobertura Person 360 (identidad, datos, permisos)
pnpm exec ts-node scripts/audit-person-360-coverage.ts
```

**Ubicación:** `scripts/smoke-*.ts`, `scripts/audit-*.ts`

---

## 6. Flujo de Desarrollo Diario

### 6.1 Ambiente de Desarrollo Local

**Prerrequisitos:**
- Node.js 20+ (recomendado)
- pnpm 9+
- Cloud SQL Auth Proxy (para acceso a PostgreSQL)

**Instalación inicial:**
```bash
# Clonar repositorio
git clone <repo-url>
cd greenhouse-eo

# Instalar dependencias
pnpm install

# Generar tipos de DB
pnpm db:generate-types

# Crear .env.local con credenciales
cp .env.example .env.local
# Configurar: GREENHOUSE_POSTGRES_HOST, PORT, SSL, etc.
```

### 6.2 Servidor de Desarrollo

```bash
# Iniciar Next.js con Turbopack (hot reload)
pnpm dev

# Servidor corriendo en http://localhost:3000
```

### 6.3 Comandos Clave

```bash
# Build de producción
pnpm build

# Validación de tipos TypeScript
npx tsc --noEmit

# Linting (ESLint)
pnpm lint
pnpm lint:fix  # auto-fix issues

# Formateo (Prettier)
pnpm format

# Tests (Vitest)
pnpm test
pnpm test:watch  # modo watch

# Salud de BD (conexión + perfiles)
pnpm pg:doctor
```

### 6.4 Ciclo de Trabajo Típico

1. **Crear rama de feature:**
   ```bash
   git checkout -b feature/mi-caracteristica
   ```

2. **Desarrollo incremental:**
   ```bash
   pnpm dev        # servidor corriendo
   pnpm test:watch # tests en watch
   ```

3. **Escribir tests primero:**
   ```bash
   # nuevo test: src/lib/payroll/new-feature.test.ts
   # luego implementación: src/lib/payroll/new-feature.ts
   ```

4. **Validar antes de commit:**
   ```bash
   pnpm lint:fix
   pnpm format
   npx tsc --noEmit
   pnpm test
   pnpm build
   ```

5. **Commit con formato canónico:**
   ```bash
   git commit -m "feat: nueva funcionalidad de payroll"
   # prefijos: feat:, fix:, refactor:, docs:, chore:
   ```

6. **Push y PR:**
   ```bash
   git push origin feature/mi-caracteristica
   # GitHub Actions valida lint + build automáticamente
   ```

---

## 7. Flujo de Migraciones de Base de Datos

### 7.1 Framework: node-pg-migrate

**Características:**
- SQL-first (no ORMs para DDL)
- Versionado automático por timestamp
- Reversible (up/down)
- Integración con Kysely para type safety post-migración

### 7.2 Crear Nueva Migración

```bash
# Crear archivo timestamped (YYYY-MM-DDTHH-MM-SS)
pnpm migrate:create crear_tabla_miembro_permisos

# Resultado:
# migrations/1704067200000_crear_tabla_miembro_permisos.sql

# Archivo generado (vacío, listo para editar)
```

**Editar migración:**
```sql
-- migrations/1704067200000_crear_miembro_permisos.sql

-- UP (aplicar)
CREATE TABLE IF NOT EXISTS greenhouse_core.member_permissions (
  member_permission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES greenhouse.team_members(member_id) ON DELETE CASCADE,
  permission_key VARCHAR(128) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(member_id, permission_key)
);

CREATE INDEX idx_member_permissions_member_id
  ON greenhouse_core.member_permissions(member_id);

-- DOWN (revertir)
DROP TABLE IF EXISTS greenhouse_core.member_permissions CASCADE;
```

### 7.3 Aplicar Migraciones

```bash
# Aplicar todas las migraciones pendientes
pnpm migrate:up

# Automáticamente regenera tipos:
# src/types/db.d.ts (140+ tablas tipadas)

# Ver estado
pnpm migrate:status
```

### 7.4 Revertir Migraciones

```bash
# Revertir última migración
pnpm migrate:down

# Verifica transaccionalidad
pnpm migrate:status
```

### 7.5 Reglas Obligatorias

1. **Migración ANTES del deploy:**
   - Nunca mergear código sin migración aplicada
   - Migración + código van en el mismo commit/PR

2. **Columnas nullable primero:**
   ```sql
   -- ✓ Correcto (orden de cambios)
   ALTER TABLE table_a ADD COLUMN new_col VARCHAR NULL;
   ALTER TABLE table_a ALTER COLUMN new_col SET NOT NULL;
   ```

3. **Nunca renombrar timestamps ni crear a mano:**
   ```bash
   # ✓ Correcto
   pnpm migrate:create

   # ✗ Incorrecto
   mv migrations/1704000000000_old.sql migrations/1704000001000_new.sql
   # ^ node-pg-migrate rechaza timestamps menores que la última migración
   ```

4. **Transaccionalidad:**
   - node-pg-migrate envuelve cada migración en transacción
   - Si migración falla, se revierte automáticamente

5. **Post-migración:**
   ```bash
   # Regenerar tipos TypeScript
   pnpm db:generate-types

   # Resultado: src/types/db.d.ts
   ```

---

## 8. Acceso a Base de Datos en Desarrollo

### 8.1 Métodos de Conexión

| Escenario | Método | Detalles |
|-----------|--------|---------|
| **Runtime (app Next.js)** | Cloud SQL Connector | GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME |
| **Desarrollo local (CLI)** | Cloud SQL Auth Proxy | Túnel local en puerto 15432 |
| **Migraciones locales** | Auth Proxy | Requerido para node-pg-migrate |
| **TCP directo a 34.86.135.144** | NO disponible | Sin authorized networks configuradas |

### 8.2 Cloud SQL Auth Proxy (Local)

```bash
# Iniciar proxy (en otra terminal)
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432

# .env.local
GREENHOUSE_POSTGRES_HOST="127.0.0.1"
GREENHOUSE_POSTGRES_PORT="15432"
GREENHOUSE_POSTGRES_SSL="false"

# Verificar conexión
pnpm pg:doctor
```

### 8.3 Cloud SQL Connector (Runtime)

**En Vercel/production:**
```bash
# .env.production (Vercel)
GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME="efeonce-group:us-east4:greenhouse-pg-dev"

# Connector usa:
# - OIDC (OIDC identity) desde Vercel WIF
# - Cloud SQL Admin API para túnel seguro
# - SIN TCP directo
```

**Prioridad en src/lib/postgres/client.ts:133:**
```typescript
if (process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) {
  // Cloud SQL Connector (Vercel/WIF)
} else {
  // Host/Port (local + Auth Proxy)
}
```

### 8.4 Perfiles de Acceso

| Perfil | Permisos | Uso |
|--------|----------|-----|
| **runtime** | SELECT, INSERT, UPDATE, DELETE | DML en app |
| **migrator** | CREATE, ALTER, DROP (DDL) | node-pg-migrate |
| **admin** | SUPERUSER | Bootstrap inicial |
| **ops** | OWNER (todos objetos) | Dueño canónico (greenhouse_ops) |

### 8.5 Validación de Conexión

```bash
# Health check completo
pnpm pg:doctor

# Verifica:
# - Conectividad
# - Perfiles disponibles
# - Migraciones aplicadas
# - Esquemas canónicos
```

---

## 9. Branching & Despliegue

### 9.1 Estrategia de Branching

```
main (production)
 ├── develop (staging)
 ├── feature/nueva-caracteristica
 ├── fix/bug-critico
 └── hotfix/parche-urgente
```

| Rama | Entorno | URL |
|------|---------|-----|
| **main** | Production | greenhouse.efeoncepro.com |
| **develop** | Staging (Custom) | dev-greenhouse.efeoncepro.com |
| **feature/\*, fix/\*, hotfix/\*** | Preview | {rama}.vercel.app |

### 9.2 Ciclo de Despliegue

1. **Feature branch → PR contra develop**
   - GitHub Actions: lint + build validation
   - Vercel: preview deployment automático

2. **Merge a develop**
   - Deploy a staging
   - QA en dev-greenhouse.efeoncepro.com

3. **PR develop → main**
   - Code review obligatorio
   - Verificación de migraciones

4. **Merge a main**
   - Deploy a production
   - greenhouse.efeoncepro.com en vivo

### 9.3 GitHub Actions (CI/CD)

**Validación automática en push/PR:**
```yaml
# .github/workflows/ci.yml (conceptual)
- ESLint: pnpm lint
- Build: pnpm build
- Types: npx tsc --noEmit
- Tests: pnpm test
- Deploy: Vercel (si main/develop)
```

---

## 10. Generación de Código

### 10.1 kysely-codegen (DB → TypeScript)

```bash
# Generar tipos desde PostgreSQL
pnpm db:generate-types

# Crea/actualiza: src/types/db.d.ts
# Contiene: 140+ tablas tipadas, relaciones, columnas
```

**Uso en código:**
```typescript
import { getDb } from '@/lib/db'

// Type-safe queries
const result = await getDb()
  .selectFrom('greenhouse.team_members')
  .select(['member_id', 'email', 'name'])
  .where('member_id', '=', memberId)
  .executeTakeFirst()

// TypeScript infiere tipos automáticamente
```

**Obligatorio después de cada migración:**
```bash
pnpm migrate:up   # aplica cambios
# ↓ auto-ejecuta
pnpm db:generate-types  # actualiza tipos
```

### 10.2 build:icons (Iconify)

```bash
# Generar bundle de Iconify
pnpm build:icons

# Resultado: bundle de iconos utilizados en la app
```

---

## 11. Validación Previa a Despliegue

### 11.1 Checklist Obligatorio

Antes de mergear a main o develop:

```bash
# 1. Formateo
pnpm format

# 2. Linting
pnpm lint:fix

# 3. Type checking
npx tsc --noEmit

# 4. Tests (locales)
pnpm test

# 5. Build
pnpm build

# 6. DB health (si hay cambios en DB)
pnpm pg:doctor

# 7. Migrations status
pnpm migrate:status
```

### 11.2 Commit Format

```bash
# Prefijos canónicos
git commit -m "feat: nueva funcionalidad de payroll"
git commit -m "fix: corrección de cálculo de impuestos"
git commit -m "refactor: restructuración de queries de finance"
git commit -m "docs: actualizar README de migraciones"
git commit -m "chore: actualizar dependencias"
```

---

## 12. Troubleshooting Común

| Problema | Solución |
|----------|----------|
| **Tests fallan con error de tema MUI** | Usar `render` desde `@/test/render.tsx` (envuelve con ThemeProvider) |
| **Migración rechazada (timestamp anterior)** | Nunca renombrar timestamps. Usar `pnpm migrate:create` siempre. |
| **Error ETIMEDOUT en conexión PostgreSQL** | Verificar que Auth Proxy esté corriendo (`cloud-sql-proxy`) en puerto 15432. |
| **Tipos desactualizados en src/types/db.d.ts** | Ejecutar `pnpm db:generate-types` después de migración. |
| **ESLint error en imports** | Usar alias (@/lib/...). Verificar rutas relativas si error persiste. |
| **Build fallando con "server-only"** | Mock en src/test/setup.ts está configurado. Si falla, revisar import del mock. |
| **Prettier + ESLint en conflicto** | Ejecutar `pnpm lint:fix` luego `pnpm format` (este orden). |

---

## 13. Recursos Clave

### Documentación Relacionada
- `CLAUDE.md` — instrucciones de proyecto (branching, deploy, DB access)
- `AGENTS.md` — reglas operativas completas
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — especificación completa de node-pg-migrate y Kysely
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, librerías, patrones de componentes

### Archivos Clave en Codebase
- `vitest.config.ts` — configuración de tests
- `src/test/setup.ts` — setup global (jest-dom, mocks)
- `src/test/render.tsx` — helper de render con tema
- `src/lib/db.ts` — conexión centralizada (query, getDb, withTransaction)
- `src/lib/postgres/client.ts` — cliente Pool, prioridad Connector vs Host
- `migrations/` — SQL-first migrations versionadas

---

## 14. Control de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 2025-11-15 | Documento inicial |
| 2.0 | 2026-02-01 | Adición de cobertura detallada de tests, restructuración de secciones DB |
| 2.1 | 2026-04-02 | Ampliación de ejemplos, clarificación de Cloud SQL Connector vs Auth Proxy, reglas obligatorias de migraciones |

---

**Propietario:** Equipo de Plataforma Greenhouse
**Última revisión:** 2026-04-02
**Próxima revisión:** 2026-07-02
