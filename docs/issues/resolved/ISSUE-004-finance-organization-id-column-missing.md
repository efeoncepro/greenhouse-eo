# ISSUE-004 — column "organization_id" does not exist en finance route

## Ambiente
preview

## Detectado
2026-04-02, Sentry alert `264968b3015949bcbe03c6e54834e7ae`

## Síntoma
`GET /api/organizations/[id]/finance` falla con error PostgreSQL: `column "organization_id" does not exist`.

## Causa raíz
La migración `20260402085449701_finance-org-first-materialized-serving-keys.sql` carecía del marcador `-- Up Migration` al inicio del archivo. Sin este marcador, `node-pg-migrate` ejecutó todo el contenido (up + down) como una sola operación "up", lo que agregó y luego inmediatamente eliminó las columnas. La migración quedó registrada como aplicada pero las columnas no existían.

Adicionalmente, la tabla `pgmigrations` tenía 3 entradas huérfanas (migraciones aplicadas desde otra rama sin archivos en disco), lo que bloqueaba el `checkOrder` de node-pg-migrate.

**Query fallida** — `src/lib/finance/postgres-store-intelligence.ts:488`:
```sql
SELECT client_id, organization_id, client_name, ...
FROM greenhouse_finance.cost_allocations
WHERE period_year = $1 AND period_month = $2
GROUP BY client_id, organization_id, client_name
```

**Stack trace:**
1. `src/app/api/organizations/[id]/finance/route.ts:20` → `getOrganizationFinanceSummary()`
2. `src/lib/account-360/organization-store.ts:595` → `computeClientEconomicsSnapshots()`
3. `src/lib/finance/postgres-store-intelligence.ts:482` → query con `organization_id`
4. `src/lib/postgres/client.ts:191` → `pool.query()`

## Impacto
La vista de finanzas por organización está rota en preview. Afecta a cualquier usuario que navegue a `/organizations/[id]/finance`.

## Solución
1. Agregado `-- Up Migration` al inicio de `20260402085449701_finance-org-first-materialized-serving-keys.sql`
2. Eliminadas 3 entradas huérfanas de `pgmigrations` (`120737013`, `120848688`, `121005272`)
3. Eliminado el registro aplicado de `085449701`, re-aplicadas las columnas manualmente con SQL directo, y re-insertado el registro con timestamp correcto
4. Ejecutado `pnpm migrate:up` — aplicó `220356569_delivery-source-sync-assignee-project-parity` exitosamente
5. Tipos Kysely regenerados

## Verificación
1. Confirmar que `pnpm migrate:status` muestra la migración `20260402085449701` como aplicada
2. Hacer `GET /api/organizations/[id]/finance` y verificar respuesta 200
3. Confirmar que el error desaparece de Sentry

## Estado
resolved (2026-04-02)

## Relacionado
- TASK-192 (finance org-first materialized serving)
- Migración: `migrations/20260402085449701_finance-org-first-materialized-serving-keys.sql`
- Commit: `45f5d0d8`
