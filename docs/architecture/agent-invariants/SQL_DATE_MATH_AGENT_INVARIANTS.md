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

---

### `NOW()` vs `clock_timestamp()` al cerrar una ventana append-only (TASK-1308, medido 2026-08-07)

Caso hermano del anterior: **mismo patrón** (SQL que los mocks de TS no ejercitan, descubierto sólo
al correrlo contra PG real), **distinta primitiva temporal**. Allá el error era de *tipo* (`date -
date` no da interval); acá es de *momento*, y por eso no lo atrapa ningún lint de tipos.

`NOW()`, `CURRENT_TIMESTAMP` y `transaction_timestamp()` son **el mismo valor**: el timestamp de
**inicio de la transacción**, constante durante toda su vida por más statements que corran. Sólo
`clock_timestamp()` avanza dentro de la transacción, incluso dentro de un mismo comando
(`statement_timestamp()` avanza entre statements, pero no dentro de uno).

Eso importa cada vez que se **cierra una ventana de vigencia** (`effective_from`/`effective_to`,
membership append-only) protegida por un CHECK con `>` estricto:

```sql
-- ✗ PROHIBIDO — cerrar una ventana con el reloj de la transacción
UPDATE greenhouse_growth.seo_keyword_set_members
   SET effective_to = NOW()          -- = transaction_timestamp()
 WHERE keyword_set_id = $1 AND effective_to IS NULL;
-- Si la membresía se ABRIÓ en esta misma transacción, effective_from == effective_to
-- → 23514 check_violation contra CHECK (effective_to > effective_from). El `>` es estricto.

-- ✓ CANÓNICO — reloj que avanza dentro de la transacción
UPDATE greenhouse_growth.seo_keyword_set_members
   SET effective_to = clock_timestamp()
 WHERE keyword_set_id = $1 AND effective_to IS NULL;
```

🔴 **Por qué es una trampa silenciosa y no un bug obvio.** Sólo revienta cuando la apertura y el
cierre caen en la **misma transacción**. El camino de usuario real —seguir una keyword hoy, dejar de
seguirla mañana— nunca lo dispara, así que el defecto queda **latente en producción** y sólo aparece
donde abrir y cerrar se hacen juntos: el sanity live, un test de integración, un backfill, un
command que compone alta y baja, o cualquier recovery. Es decir: aparece justo cuando alguien intenta
**verificar** el comportamiento, o cuando hay que reparar datos — los dos peores momentos.

**Reglas duras**:

- **NUNCA** cerrar una ventana de vigencia con `NOW()` / `CURRENT_TIMESTAMP` /
  `transaction_timestamp()`. Para `effective_to`, `superseded_at`, `closed_at` y cualquier marca que
  deba quedar **estrictamente después** de una fila escrita en la misma transacción, es
  `clock_timestamp()`.
- **NUNCA** "arreglar" un `23514` de este tipo relajando el CHECK a `>=`. El CHECK está diciendo la
  verdad: una ventana de duración cero no es un término válido, y admitirla rompe todo reader que
  determine vigencia por solapamiento (`effective_from <= t AND (effective_to IS NULL OR effective_to
  > t)`), que dejaría de ver **y** de excluir esa fila.
- **NUNCA** confiar en que los tests con mocks cubren esto: un mock del cliente `pg` acepta cualquier
  string SQL y devuelve las filas que le pidan. Este defecto se descubrió con el gate de arriba —
  ejercitar el SQL contra PostgreSQL real antes de mergear — y no con los unit tests, que estaban
  verdes.
- **SIEMPRE** que un command abra y cierre ventanas del mismo aggregate, escribir el sanity que hace
  **las dos cosas seguidas**. Un sanity que sólo prueba el alta deja el reverso sin ejercitar, y el
  reverso es exactamente donde vive esta clase de bug.

**Caso fuente**: `untrackKeywords` en `src/lib/growth/seo/track-keywords.ts` (cierra la membresía de
una keyword seguida; el comentario del `UPDATE` conserva el porqué in situ).

---

### Aislamiento de los sanity scripts (TASK-1300, medido 2026-08-05)

El gate de arriba exige ejercitar el SQL contra PG real. Eso implica **escribir datos de prueba en la base real**, así que cada `scripts/**/_sanity-*.ts` necesita una estrategia de limpieza — y elegir la equivocada deja residuo o produce falsos negativos.

**🔴 `BEGIN`/`ROLLBACK` a través de `runGreenhousePostgresQuery` NO es transaccionalmente seguro.** Ese helper llama `pool.query()`, que toma una conexión del pool **por llamada** y la devuelve enseguida: no hay afinidad. El `BEGIN` abre la transacción en una conexión que vuelve al pool, y las llamadas siguientes pueden salir por otra — donde **se confirman al instante** y el `ROLLBACK` posterior no las alcanza. Se descubrió porque un `SAVEPOINT` reventó con `25P01 CheckTransactionBlock`. Funciona casi siempre porque el pool devuelve la conexión usada más recientemente; funciona **por coincidencia, no por diseño**.

Cuál usar se decide por una sola pregunta — *¿la tabla se puede limpiar con `DELETE`?*:

| Situación | Estrategia | Ejemplos en el repo |
|---|---|---|
| La tabla admite `DELETE` (config, assignments, targets) | **Limpieza explícita**: insertar con marcador (`created_by = 'sanity-task-NNNN'`), verificar llamando a las **funciones del producto**, y borrar en un `finally`. | `_sanity-seo-aeo-gap.ts`, `_sanity-seo-entitlement.ts`, `_sanity-hiring-activation.ts` |
| La tabla es **append-only** (trigger no-delete) y sus filas no se pueden borrar | **Transacción sobre conexión fijada** (`withGreenhousePostgresTransaction`) que **aborta siempre** con un sentinel. | `_sanity-seo-keyword-opportunities.ts`, `_sanity-seo-provider-spend.ts` |

**⚠️ El costo de la segunda opción**: las funciones del producto usan el pool por dentro, así que **no pueden ver la transacción de prueba**. Por eso esos scripts ejercitan el **SQL exportado por el módulo** (`SEO_KEYWORD_OPPORTUNITIES_SQL`, `SEO_PROVIDER_SPEND_UPSERT_SQL`) en vez de llamar a la función. Debe ser **exportado, nunca copiado**: una copia deja al script verde probando una versión vieja del SQL.

**Reglas duras**:

- **NUNCA** usar `runGreenhousePostgresQuery('BEGIN')` / `('ROLLBACK')` para aislar un sanity. Si necesitas transacción, es `withGreenhousePostgresTransaction`.
- **NUNCA** duplicar el SQL productivo dentro de un sanity. Expórtalo como constante desde el módulo y consúmelo.
- **NUNCA** llamar a una función del producto esperando que vea datos escritos dentro de `withGreenhousePostgresTransaction`: usa el `client` fijado, o cambia a limpieza por `DELETE`.
- **SIEMPRE** cerrar el sanity con una verificación de residuo **por conteo antes/después**, no sólo con el conteo final — un conteo final de `0` puede venir de una conexión que no ve lo que quedó escrito en otra.
- **SIEMPRE** evaluar el veredicto **después** del bloque de limpieza: un `process.exit()` dentro del `try` se salta el `finally` y deja residuo justo cuando algo salió mal.

**Mitigación de plataforma (medida, no asumida)**: `idle_in_transaction_session_timeout = 5min` está seteado **por rol** vía `ALTER ROLE` en `greenhouse_app` y `greenhouse_ops` — no como database flag de la instancia, así que no aparece en `gcloud sql instances describe`. Acota el lock leak de una transacción huérfana, pero **no protege del riesgo real**: los datos que se confirmaron en otra conexión ya están escritos y ningún timeout los revierte. `greenhouse_migrator_user` **no tiene ese override**.
