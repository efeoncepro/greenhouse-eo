# SQL embebido en TS — invariantes operativos para agentes

> **Companion de `CLAUDE.md` (router de dominios, TASK-1160).**
> Extraído inline → load-on-demand el 2026-07-10 durante el release de TASK-1362:
> `CLAUDE.md` estaba **exactamente** en el tope de su presupuesto (34.999/35.000 tokens en `main`),
> así que cualquier línea nueva rompía el gate estricto. Este bloque era el más pesado del archivo
> (1.648 tokens, 125 líneas de runbook inline) y es justo la clase de contenido que el router manda
> a su spec. Contenido **verbatim**, sin pérdida (validado por `claude-md audit --strict`).
>
> **Cargar este doc al escribir CUALQUIER query SQL embebida en TS** (readers, commands,
> materializers, signal/reliability queries, audit scripts, paginación), en **cualquier dominio**.
>
> ⚠️ **El nombre del archivo dice `SQL_DATE_MATH`, pero el alcance es TODO el SQL embebido.**
> Nació con la date-math de `TASK-893` y fue creciendo con cada familia que comparte la misma raíz —
> `NOW()` vs `clock_timestamp()` (`TASK-1308`), aislamiento de sanity scripts (`TASK-1300`), orden y
> paginación (`TASK-1700`). El archivo **conserva su nombre a propósito**: lo citan una docena de
> tasks, el `agent-context-router.json`, skills y el changelog, y renombrarlo rompería esos punteros
> sin agregar una sola regla. Lo que se corrige es el encabezado, para que el nombre no siga
> mintiendo sobre lo que contiene.
>
> **La raíz común de todo lo que vive acá:** son defectos del **SQL**, y los tests con mocks
> ejercitan el **TypeScript**. Un mock del cliente `pg` acepta cualquier string SQL y devuelve las
> filas que le pidan, así que da todos estos bugs por buenos, en verde. La única detección es
> ejercitar la query contra PostgreSQL real antes de mergear.

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

> **Movido verbatim desde `CLAUDE.md` el 2026-08-28 (TASK-1700 follow-up).** Es la MISMA familia que
> el gate de arriba —SQL que revienta contra PG real y que los mocks dan por bueno—, y vivía inline en
> el router mientras sus hermanas ya estaban acá. Su traslado liberó el presupuesto que hacía falta
> para que el pointer de `CLAUDE.md` nombrara las bug classes nuevas.

### SQL embebido — type alignment + live testing (ISSUE-071, 2026-05-08)

Cualquier query SQL embebido en TS que use **uniones de tipos** (COALESCE de subqueries, CASE WHEN, NULL coalescing entre tipos heterogéneos) debe **ejercitarse contra PG real ANTES de mergear**, no solo via mocks Vitest.

**Bug class** (ISSUE-071): el CTE `subject_admin` del relationship resolver de TASK-611 hacía `SELECT 1 AS is_admin` (integer) pero el `COALESCE((SELECT is_admin FROM subject_admin), FALSE)` combinaba con boolean. PG rechaza con `COALESCE types integer and boolean cannot be matched`. El catch silencioso convertía el throw a `degradedMode=true` y el banner "Workspace en modo degradado" se mostraba al usuario. Bug latente desde el merge de TASK-611, descubierto solo cuando un usuario real ejerció el path post TASK-613 V1.1.

**⚠️ Reglas duras**:

- **NUNCA** mergear queries con CTEs + COALESCE/CASE/NULL handling sin un live test contra PG (vía `pg:connect` proxy + `pnpm tsx`, o `*.live.test.ts`).
- **NUNCA** confiar SOLO en unit tests con mocks para validar type alignment SQL. Los mocks ejercitan la lógica TS, NO el SQL crudo.
- **SIEMPRE** que `COALESCE((SELECT ... FROM cte), default)`, verificar que el tipo del SELECT del CTE matchee el tipo del `default`. PG hace casting implícito entre tipos numéricos (INT → NUMERIC) pero NO entre INT y BOOL ni entre TEXT y NUMERIC.
- **SIEMPRE** que un read path tenga catch + degraded mode honesto (correcto desde safety perspective), confirmar que `captureWithDomain` está emitiendo a Sentry — sino el bug class queda completamente oculto al equipo y aparece solo cuando un usuario real reporta el síntoma.

**Defense-in-depth recomendado**: cuando una query nueva emerja, agregar un script temporal `scripts/<dominio>/_sanity-<query-name>.ts` (gitignored o committed según necesidad) que la ejecute contra el proxy local con datos reales. Después del primer ejercicio exitoso el script es opcional pero útil como debugging aid futuro.

**Spec canónica**: `docs/issues/resolved/ISSUE-071-workspace-relationship-resolver-coalesce-type-mismatch.md`.

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

### Orden y paginación: tres bug classes que ningún mock ve (TASK-1700, medido 2026-08-28/29)

Tercera familia del mismo gate. Allá el error era de **tipo** (`date - date` no da interval), después
de **momento** (`NOW()` no avanza dentro de la transacción); acá es de **orden**: el SQL corre sin
lanzar nada y devuelve las filas equivocadas, o menos filas de las que hay. **No las mira ningún lint
de tipos, ningún `typecheck` y ningún test con mocks** — un mock del cliente `pg` acepta cualquier
string SQL y devuelve las filas que le pidan, así que ejercita el TypeScript y jamás el SQL. Sólo
aparecen paginando datos reales de punta a punta.

Las dos se pagaron en `src/lib/growth/seo/work-queue/**`, pero **no son de ese dominio**: muerden a
cualquiera que ordene o pagine, en finanzas, payroll, delivery o donde sea.

#### 1. Un alias con el nombre de su propia columna rompe el `ORDER BY`

```sql
-- ✗ PROHIBIDO — el alias se llama igual que la columna que ordena
SELECT priority_score::text AS priority_score, …
  FROM greenhouse_growth.seo_work_queue_items
 ORDER BY priority_score DESC;   -- ordena el TEXTO, no el número

-- ✓ CANÓNICO — el alias no colisiona con el nombre de la columna
SELECT priority_score::text AS priority_score_text, …
 ORDER BY priority_score DESC;   -- ordena la columna NUMERIC de la tabla
```

**Mecanismo (esto es lo que hay que entender, no la regla).** PostgreSQL resuelve una expresión de
`ORDER BY` que sea un **nombre suelto** contra los nombres de **SALIDA** del `SELECT` *antes* que
contra las columnas de la tabla — es el comportamiento del estándar SQL para `ORDER BY`, y es lo
contrario de `WHERE`/`GROUP BY`, que resuelven contra la tabla. Así que `AS priority_score` **secuestra**
el nombre: el `ORDER BY priority_score` deja de ver la columna `numeric` y pasa a ordenar el `text`
aliaseado. Y el orden de texto no es el orden numérico: `'8.8612'` va **antes** que `'72.1405'` porque
compara carácter a carácter y `'8' > '7'`.

🔴 **Por qué se cuela.** No hay error, no hay warning, el `EXPLAIN` se ve sano y el reader responde
`200`. Síntoma **medido**: la cola servía su primera página empezando en el **rank 17**, con un orden
que no era el persistido en `rank_in_snapshot`, desde el índice 0. Y es **invisible** con datos de
juguete: con scores de un solo dígito el orden textual coincide con el numérico, y con la columna
toda en `NULL` no hay nada que desordenar. Sólo aparece con rango amplio, que es justo lo que hay en
producción.

- **NUNCA** aliasear una expresión con el nombre de la columna por la que ordenas. Si necesitas
  castear/derivar para el DTO, el alias lleva sufijo (`…_text`, `…_display`) y el `ORDER BY` se queda
  con el nombre crudo de la tabla.
- **NUNCA** "arreglarlo" poniendo `ORDER BY 3` (ordinal) o repitiendo la expresión casteada: lo
  primero se rompe solo al insertar una columna, lo segundo ordena texto igual.
- **SIEMPRE** dejar el porqué junto al alias en el SQL. La línea `priority_score::text AS
  priority_score_text` se lee como una manía si no dice qué pasó la vez que se llamó igual.

#### 2. Ordenar en JS y paginar en SQL exige la MISMA collation

**Mecanismo.** La base corre con collation `en_US.UTF8`, que al comparar **ignora el espacio**: para
PostgreSQL `berelex` < `berel green`, porque compara `berelgreen` y `e` < `g`. `String.prototype.localeCompare`
los ordena **al revés**. Cuando el **rank lo asigna JS** (el materializador) y la **paginación por
keyset la resuelve SQL** (el reader), los dos lados tienen que producir el mismo orden total o el
cursor apunta a un lugar del universo que el otro lado no reconoce: la paginación **saltea filas en
silencio**. Medido contra PG real: recorría **631 de 635**. No falla nada — simplemente faltan cuatro.

🔴 **La solución NO es "arreglar el lado JS".** `en_US.UTF8` sale de **glibc** y `localeCompare` de
**ICU**: son dos tablas distintas, mantenidas por gente distinta, y su coincidencia no se puede
demostrar — a lo sumo se puede no encontrar el contraejemplo hoy. Se fuerzan **ambos** lados a orden
de **BYTES**, que sí es reproducible:

```sql
-- SQL: orden de bytes explícito, en el ORDER BY y en la comparación del cursor
 ORDER BY score_band ASC, priority_score DESC NULLS LAST, normalized_keyword COLLATE "C" ASC
```

```ts
// JS: code points, jamás localeCompare
if (a.normalizedKeyword === b.normalizedKeyword) return 0
return a.normalizedKeyword < b.normalizedKeyword ? -1 : 1
```

**Corolario 1 — el índice también lleva la collation.** Un `ORDER BY … COLLATE "C"` **no puede usar**
un índice construido con la collation por defecto: son órdenes distintos. El índice de keyset se
declara con la misma collation que la query, o el plan se cae a un sort completo del snapshot:

```sql
CREATE INDEX … ON … (snapshot_id, score_band, priority_score DESC NULLS LAST,
                     (normalized_keyword COLLATE "C"));
```

**Corolario 2 — con `NULL` en la clave, el cursor NO se escribe como tupla.** La forma compacta
`(a,b,c) > (x,y,z)` es tentadora y **no ordena** en cuanto uno de los términos puede ser `NULL`: la
comparación devuelve `NULL`, la fila no pasa el `WHERE`, y el borde de página entrega filas al azar.
Se escribe **expandida**, banda por banda, declarando explícitamente dónde caen los `NULL` (el
`ORDER BY` usa `NULLS LAST`, así que el cursor tiene que decir que un `NULL` va *después* de
cualquier score):

```sql
   score_band > $band
OR (score_band = $band
    AND ( ($score IS NOT NULL AND priority_score IS NOT NULL AND priority_score < $score)
       OR ($score IS NOT NULL AND priority_score IS NULL)
       OR ( (($score IS NULL AND priority_score IS NULL) OR priority_score = $score)
            AND normalized_keyword COLLATE "C" > ($kw::text COLLATE "C") ) ))
```

- **NUNCA** repartir el orden entre dos runtimes con collations distintas. Si JS asigna el rank y SQL
  pagina, los dos van a orden de bytes (`COLLATE "C"` + comparación de code points).
- **NUNCA** usar `localeCompare` para un orden que después se pagina en SQL. Tampoco `.sort()` pelado:
  su orden es de unidades UTF-16, que **no** coincide con code points fuera del BMP.
- **NUNCA** declarar un índice de keyset sin la collation que usa la query. Un `COLLATE "C"` en el
  `ORDER BY` con índice por defecto compila, corre y ordena bien — pero ordena la tabla entera.
- **NUNCA** escribir la comparación del cursor como tupla cuando alguna clave admite `NULL`.
- **SIEMPRE** que el desempate sea una `text`, asumir que carga todo el peso del orden: en la corrida
  fuente había **75 items empatados** en `priority_score = 0.0000`, así que la discrepancia de
  collation no era un caso de borde, era el orden de media cola.

#### 3. La llave invisible: si el rank vive en JS y usa un valor que NO es columna, el SQL no puede reproducirlo NI EN PRINCIPIO

**Mecanismo (medido en producción, 2026-08-29).** El comparador JS del caso fuente desempataba una
banda por `tieBreakImpressions` DESC — un valor de trabajo del materializador que **no se persiste
como columna**. El `ORDER BY` reconstruido tenía "las tres llaves" correctas… y le faltaba la
cuarta, que no podía tener: en esa banda el score era `NULL` para todos, el orden colapsaba al
desempate alfabético, y el reader sirvió **54 de 55** items fuera de su rank persistido. El test de
paridad comparaba el **STRING** del SQL contra las tres llaves: consagraba un modelo que el
comparador no seguía y pasaba verde con el defecto puesto — una guarda que afirma, no que verifica.

🔴 **La resolución canónica NO es agregar la columna que falta: es dejar de reconstruir.** Cuando el
orden lo asigna JS y se persiste como rank (`rank_in_snapshot`), **el reader sirve y pagina ESE
rank** (`ORDER BY rank ASC`, keyset `rank > $cursor`): entero único (con UNIQUE index que lo hace
estructural), sin `NULL`, sin collation que sincronizar — y el orden servido coincide con el
persistido **por construcción**, para cualquier llave futura del comparador. Las disciplinas #1 y
#2 siguen vigentes **para los casos donde no hay rank persistido y reconstruir es inevitable**; si
lo hay, reconstruir es elegir mantener una paridad que puede romperse en silencio.

- **NUNCA** reconstruir en SQL un orden que JS ya asignó y persistió como rank. Se sirve el rank.
- **NUNCA** aceptar como paridad un assert que compara el STRING del SQL contra una constante: eso
  congela la forma, no la semántica. La paridad se prueba ejecutando (protocolo de abajo).

#### Cómo se detectan (la parte que no se puede saltar)

Ninguna de las tres la ve un test con mocks, y la #1 tampoco la ve un test con datos sintéticos de
rango corto. **La única detección es paginar una corrida REAL de punta a punta y comparar el orden
servido contra el orden persistido**:

1. Materializar (o tomar) un snapshot real, con rango amplio de valores y empates de verdad.
2. Recorrer **todas** las páginas siguiendo el cursor hasta agotarlo, acumulando las filas servidas.
3. Afirmar **dos** cosas, no una: (a) la cuenta acumulada == la cuenta persistida —lo que atrapa el
   salteo silencioso—, y (b) la secuencia servida == la secuencia persistida por rank —lo que atrapa
   el alias homónimo y la llave invisible—. Una sola de las dos deja pasar la otra.
4. 🔴 **Correrlo sobre el dataset que EXHIBE cada estado, no sobre el más grande.** La #3 era
   invisible en el snapshot de 501 filas (todo banda 1, donde el score sí ordena) y total en el de
   105 (todo banda 2/3). Un verde sobre el dataset equivocado no prueba nada: elegir el dataset es
   parte del protocolo.

Un `LIMIT 10` de la primera página se ve perfecto en los tres bugs. Es el recorrido completo el que
habla.

**Caso fuente**: `TASK-1700` (2026-08-28, #3 encontrada y cerrada 2026-08-29) —
`src/lib/growth/seo/work-queue/reader.ts` (docstring + keyset por rank),
`src/lib/growth/seo/work-queue/materialize.ts` (el comparador, única autoridad de orden),
`migrations/20260829213303021_task-1700-work-queue-rank-unique.sql` (unicidad estructural del rank)
y `migrations/20260829000423538_task-1700-work-queue-keyset-collation.sql` (el índice del keyset
reconstruido, huérfano tras el fix; retiro post-release). El detalle del dominio vive en
`.claude/rules/growth-seo.md`.

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
