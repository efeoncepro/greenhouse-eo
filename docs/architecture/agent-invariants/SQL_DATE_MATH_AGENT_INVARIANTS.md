# SQL / Date-math — invariantes operativos para agentes

> **Companion de `CLAUDE.md` (router de dominios, TASK-1160).**
> Extraído inline → load-on-demand el 2026-07-10 durante el release de TASK-1362:
> `CLAUDE.md` estaba **exactamente** en el tope de su presupuesto (34.999/35.000 tokens en `main`),
> así que cualquier línea nueva rompía el gate estricto. Este bloque era el más pesado del archivo
> (1.648 tokens, 125 líneas de runbook inline) y es justo la clase de contenido que el router manda
> a su spec. Contenido **verbatim**, sin pérdida (validado por `claude-md audit --strict`).
>
> **Cargar este doc al escribir CUALQUIER query SQL embebida en TS** (signal readers, reliability
> queries, materializers, audit scripts), o al tocar date-math en SQL.

### SQL Signal Reader Schema Validation Gate (TASK-893 hotfix #3, desde 2026-05-16)

Toda query SQL embebida en TS que aparezca en code paths productivos — especialmente signal readers, reliability queries, materializers, audit scripts — **debe validar sus assumptions de schema contra PG real antes de mergear**. `db.d.ts` (Kysely codegen) NO es source of truth — infiere DATE columns como `Timestamp` TS, lo cual lleva al bug class `EXTRACT(EPOCH FROM (date - date))` que produce `function pg_catalog.extract(unknown, integer) does not exist` en runtime.

**Bug class historico** (3 incidentes Sentry 2026-05-16 antes de las 12:00 UTC-4):

1. `column pe.superseded_by_entry_id does not exist` en GET /admin (commit 468505e5 hotfix).
2. `function pg_catalog.extract(unknown, integer) does not exist` en GET /admin (mismo commit).
3. `function pg_catalog.extract(unknown, integer) does not exist` en POST /reliability-ai-watch (commit bec374c8 hotfix).

Causa raíz comun: developers asumen tipos basados en `db.d.ts` (TS shapes inferred). En PG real:

- `date - date = integer` (días). `EXTRACT(EPOCH FROM integer)` NO existe.
- `timestamp - timestamp = interval`. `EXTRACT(EPOCH FROM interval)` OK.
- `date - integer = date`. `date + integer = date`.

**4 capas defense-in-depth canonical**:

#### 1. Lint rule `greenhouse/no-extract-epoch-from-date-subtraction` (mode error)

Detecta patterns SQL inseguros via 7 regex AST:

- `EXTRACT(EPOCH FROM (CURRENT_DATE - X))` — CURRENT_DATE es DATE.
- `EXTRACT(EPOCH FROM (X - CURRENT_DATE))` — mirror.
- `EXTRACT(EPOCH FROM (X::date - Y))` — cast explícito a DATE dispara bug.
- `EXTRACT(EPOCH FROM (X - Y::date))` — mirror.
- `EXTRACT(EPOCH FROM (MAX(*_date) - X))` — heurística: columnas con sufijo `_date` son típicamente DATE.
- `EXTRACT(EPOCH FROM (X.*_date - Y))` — column reference.
- `EXTRACT(EPOCH FROM (effective_from - start_date))` — caso TASK-890/TASK-872 canonical.

Modo `error` desde commit-1 (tolerancia cero — el bug class ya generó 2 Sentry alerts en producción).

#### 2. Smoke test pre-merge (canonical workflow)

Cuando un signal reader nuevo emerja o se modifique una query SQL existente, el dev DEBE ejecutar la query contra PG real via proxy ANTES de mergear:

```bash
# Levantar proxy
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432 &

# Smoke script canonical (one-shot, tira la query + valida no error)
cat > /tmp/_smoke-reader.ts <<'EOF'
import 'server-only'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const main = async () => {
  const r = await runGreenhousePostgresQuery(`<the new SQL query here>`)
  console.log('OK', r.length, 'rows')
}
main().catch(err => { console.error('FAIL:', err.message); process.exit(1) })
EOF

# Run con env
set -a && source .env.local && set +a
cp /tmp/_smoke-reader.ts scripts/_smoke-reader.ts
pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/_smoke-reader.ts
rm -f scripts/_smoke-reader.ts
```

Si la query falla → fix antes de mergear. NO mergear assumiendo que `db.d.ts` es source of truth.

#### 3. Schema verification protocol canonical

Cuando se necesite saber el tipo real de una columna en PG:

```bash
pnpm pg:connect:shell
greenhouse_app=> SELECT data_type FROM information_schema.columns
                 WHERE table_schema='greenhouse_finance'
                   AND table_name='account_balances'
                   AND column_name='balance_date';
```

O via TS:

```ts
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
const r = await runGreenhousePostgresQuery(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema=$1 AND table_name=$2
`, ['greenhouse_finance', 'account_balances'])
```

**Reglas para columnas DATE vs TIMESTAMP**:

- Sufijo `_date` (`balance_date`, `effective_from`, `start_date`, `hire_date`) → **típicamente DATE** en PG real.
- Sufijo `_at` (`created_at`, `updated_at`, `attached_at`, `lifecycle_stage_since`) → **típicamente TIMESTAMPTZ**.
- `CURRENT_DATE` → DATE. `NOW()` / `CURRENT_TIMESTAMP` → TIMESTAMPTZ.
- En duda → verificar con `information_schema.columns`.

#### 4. Canonical fix patterns

Cuando emerja la necesidad de "días entre dos fechas":

```sql
-- ✓ Pattern canonical #1: días directos (date - date = integer)
SELECT (CURRENT_DATE - MAX(balance_date))::int AS days_stale
FROM greenhouse_finance.account_balances;

-- ✓ Pattern canonical #2: cast explícito a timestamptz si necesitas epoch
SELECT EXTRACT(EPOCH FROM ((finished_at)::timestamptz - (started_at)::timestamptz)) AS seconds
FROM greenhouse_sync.source_sync_runs;

-- ✓ Pattern canonical #3: días con decimales
SELECT EXTRACT(DAY FROM ((x)::timestamptz - (y)::timestamptz)) AS days
FROM some_table;

-- ✗ Pattern PROHIBIDO (bug class TASK-893 hotfix)
SELECT EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(balance_date)))::int / 86400 AS days
FROM greenhouse_finance.account_balances;
-- Runtime: ERROR — function pg_catalog.extract(unknown, integer) does not exist
```

**⚠️ Reglas duras**:

- **NUNCA** confiar en `db.d.ts` (Kysely codegen) como source of truth de tipos PG. Es estimate inferred — DATE columns aparecen como `Timestamp` TS sin distinción.
- **NUNCA** usar `EXTRACT(EPOCH FROM (X - Y))` cuando X o Y es DATE. Use `(X - Y)::int` para días directos o cast a `::timestamptz` ambos lados.
- **NUNCA** mergear un signal reader nuevo o reliability query sin haber ejecutado la query al menos una vez contra PG real via proxy. Lint rule mecánica catch los patterns conocidos; smoke test catch el rest.
- **NUNCA** fixear el bug class en un solo callsite cuando emerja por Sentry alert. Hacer audit global (`grep -rn 'EXTRACT(EPOCH FROM' src/ services/`) + fixear TODOS los broken callsites en un solo commit + agregar lint rule + smoke test pre-merge.
- **NUNCA** desactivar la lint rule `greenhouse/no-extract-epoch-from-date-subtraction` para callsites legítimos sin agregar override block explícito en `eslint.config.mjs`. Override block requiere razón documentada en comentario.
- **SIEMPRE** que un nuevo reader/query emerja, validar contra PG real via proxy ANTES de mergear. Schema verification protocol canonical es 1-line query a `information_schema.columns`.
- **SIEMPRE** que el bug class se manifieste vía Sentry alert, escalation es: (1) audit global, (2) fix sistemático, (3) lint rule update (si falta cobertura), (4) CLAUDE.md update. NO fixear un callsite y shippear.

**Spec canónica**: lint rule en `eslint-plugins/greenhouse/rules/no-extract-epoch-from-date-subtraction.mjs` + tests en `__tests__/`. Override block en `eslint.config.mjs`.
