# TASK-1659 — Growth SEO: modelo de keyword OBJETIVO (intención declarada vs oportunidad detectada)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El set monitoreado no sabe **por qué** una keyword está ahí. Para el sistema, "estoy en la 12 y
quiero la 5" y "el cliente quiere rankear acá y estoy en la 60" son la misma fila. Sin esa
distinción no existe avance contra objetivo, y una keyword aspiracional se ve como un fracaso
permanente en cualquier dashboard que asuma que todo lo medido debería estar mejorando.

## Why This Task Exists

`trackKeywords` (TASK-1308) acepta **strings arbitrarios**: no valida contra la lista de
oportunidades, así que ya hoy se puede seguir una keyword donde el cliente no aparece, y el rank
capture diario la mide igual. La capacidad técnica existe. Lo que no existe es el **modelo**.

`seo_keyword_set_members` tiene `keyword`, la ventana `effective_from`/`effective_to` y —desde
TASK-1308— `created_by` y `source`. Pero `source` es **procedencia** (quién la metió: `operator_ui`,
`nexa`, `mcp`, `seed`, `backfill`), no **intención**. Nada en la fila dice si esa keyword es una
oportunidad a un paso que estamos empujando o un compromiso a seis meses con el cliente.

Las consecuencias son de negocio, no de modelado:

- **No hay narrativa de avance.** No se puede decir *"de tus 12 keywords objetivo, 4 entraron a
  primera plana este trimestre"*, porque el sistema no sabe cuáles son las 12.
- **El reporte miente por omisión.** Un objetivo en posición 60 conviviendo con oportunidades en
  posición 12 se promedia con ellas y ensucia cualquier KPI agregado.
- **El techo de gasto no se puede priorizar.** Cuando el set llega a 200, hoy no hay forma de
  decidir qué sacar: no se distingue un compromiso con el cliente de una prueba exploratoria.

## Goal

- Una keyword del set declara su **intención**: objetivo declarado vs oportunidad detectada.
- Queda registrado **quién** declaró el objetivo y **cuándo** — un objetivo es un compromiso, y un
  compromiso tiene autor.
- Los readers pueden segmentar por intención sin heurísticas ni adivinanza.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§4.1 schema, §7 commands)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`

Reglas obligatorias:

- `seo_keyword_set_members` es **append-only**: hay trigger anti-DELETE y el cierre de ventana es
  `effective_to`, nunca borrado. Un cambio de intención NO muta la fila.
- 🔴 Al cerrar/abrir ventanas en la misma transacción usar **`clock_timestamp()`**, nunca `NOW()`:
  `NOW()` devuelve el timestamp de INICIO de transacción y produce `effective_to = effective_from`,
  que revienta el CHECK (23514). Hallazgo de TASK-1308, ver
  `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`.
- El índice único parcial `WHERE effective_to IS NULL` garantiza una sola membresía vigente por
  keyword; cualquier columna nueva debe respetarlo.
- **No mezclar dimensiones ortogonales en un enum.** `source` (procedencia) e `intent` (por qué
  está en el set) son ejes distintos y van en columnas distintas.

## Normative Docs

- `docs/tasks/complete/TASK-1308-growth-seo-keyword-opportunities-ui.md` — el command vigente
- `.claude/rules/growth-seo.md` — mandato de MCP tool en el mismo PR

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_keyword_set_members` (TASK-1299) + migración de procedencia de TASK-1308
- `src/lib/growth/seo/track-keywords.ts` — `trackKeywords` / `untrackKeywords`

### Blocks / Impacts

- `TASK-1660` — superficie para declarar objetivos y ver avance (bloqueada por esta)
- `TASK-1661` — datos de mercado; los objetivos son su primer alcance acotado
- `TASK-1310` — dashboard cliente + reporte: el avance contra objetivo es material de reporte

### Files owned

- `migrations/[nueva]-task-1659-keyword-target-intent.sql`
- `src/lib/growth/seo/track-keywords.ts`
- `src/lib/growth/seo/contracts.ts`
- `src/lib/growth/seo/__tests__/track-keywords.test.ts`
- `scripts/growth/_sanity-task-1659-keyword-intent.ts`

## Current Repo State

### Already exists

- `trackKeywords(seoTargetId, keywords[], actor, options)` acepta strings arbitrarios — **verificado
  2026-08-07**: no valida contra oportunidades, así que seguir una keyword no rankeada YA funciona
- `untrackKeywords` cierra ventana con `clock_timestamp()`
- Columnas `created_by` + `source` (vocabulario cerrado por CHECK)
- `scripts/growth/_sanity-task-1308-track-keywords.ts` — 16 checks contra PG real, patrón a extender

### Gap

- Ninguna columna expresa la **intención** de la membresía
- Ningún reader puede segmentar objetivo vs oportunidad
- No hay registro de quién declaró un objetivo como compromiso (distinto de quién ejecutó el INSERT)

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/seo/` (Vercel + `ops-worker` para el rank capture)
- Future candidate home: `domain-package`
- Boundary: el command `trackKeywords` es la única escritura del set; readers consumen la columna
  nueva, nunca la infieren
- Server/browser split: `n/a` — command server-only
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.seo_keyword_set_members`
- Consumidores afectados: `UI`, `MCP`, `cron` (rank capture), readers de reporte
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `trackKeywords` / `untrackKeywords` y sus 3 lanes (app, ecosystem, MCP)
- Contrato nuevo o modificado: parámetro de intención en `trackKeywords` + campo en los outcomes
- Backward compatibility: `compatible` — la columna nace nullable con default de oportunidad; las
  llamadas existentes no cambian de forma
- Full API parity: la intención se declara por el **mismo command** en los 3 lanes; ni la UI ni
  Nexa escriben la columna directo

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_keyword_set_members`
- Invariantes que no se pueden romper:
  - **Append-only**: cambiar la intención de una keyword cierra la membresía vigente y abre otra;
    nunca un `UPDATE` de la columna. El historial de "cuándo pasó de oportunidad a objetivo" es
    justamente el dato que hace posible el reporte de avance
  - Una sola membresía vigente por keyword (índice único parcial intacto)
  - Vocabulario **cerrado** por CHECK, como `source`
  - `clock_timestamp()` en todo cierre intra-transacción
- Tenant/space boundary: heredado — `seo_target_id` → `organization_id`
- Idempotency/concurrency: `FOR UPDATE OF` ya presente; declarar la misma intención dos veces es
  no-op idempotente, no error
- Audit/outbox/history: evento `growth.seo.keyword_set.updated` ya existe; extender payload

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: columna nullable; filas existentes quedan **NULL = intención desconocida**, no
  "oportunidad". 🔴 Backfillear todo a `opportunity` sería inventar un hecho: nadie declaró eso
- Backfill plan: ninguno. La intención se declara hacia adelante
- Rollback path: revert PR + `ALTER TABLE ... DROP COLUMN` (la columna es aditiva y nadie la exige)
- External coordination: `N/A — repo-only change`

### Security and access

- Auth/access gate: `growth.seo.target.configure` (la misma del command). **[verificar]** en
  Discovery si declarar un objetivo merece capability propia — es un compromiso con el cliente, no
  un ajuste operativo, y podría querer autoridad distinta
- Sensitive data posture: sin PII
- Error contract: `canonicalErrorResponse` con los códigos ya existentes del dominio
- Abuse/rate-limit posture: heredada del techo del set

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`
- DB/runtime checks: sanity contra PG real extendiendo el patrón de TASK-1308 — 🔴 **obligatorio**:
  los mocks no ejercitan el SQL, y así apareció el bug de `NOW()`
- Integration checks: `n/a`
- Reliability signals/logs: sin señal nueva
- Production verification sequence: ver Zone 3


## Delta 2026-08-07 — el supuesto "V1 interno" queda superado por el operating mode

El operador señaló que este módulo tiene los **mismos tres modelos de servicio que Globe**:
`efeonce-managed`, `co-operated` y `client-operated` (más "el cliente contrata la herramienta", que
NO es un cuarto modo sino `client-operated` cruzado con un delivery model de plataforma).

Verificado: el vocabulario **ya es canónico** en `EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` y
Globe ya lo materializó (`OperatingResponsibilityAssignmentV1`, SPEC-008, desplegado). Greenhouse
tenía el vocabulario pero **no el primitive**. Se creó como `TASK-1663` + su ADR
`GREENHOUSE_OPERATING_RESPONSIBILITY_DECISION_V1.md`.

**Qué cambia para esta task:**

- Donde decía *"V1 interno; el carril cliente es follow-up"*, ahora dice: **el modo decide qué
  superficie DEBE existir**. En `client-operated` la superficie del portal del cliente es requisito
  del producto, no un extra; en `efeonce-managed` puede legítimamente no existir.
- 🔴 **Lo que NO cambia, y es lo importante:** el modo **nunca** decide quién puede declarar. Eso
  sigue siendo `can(subject, capability, action, scope)`. Si el modo otorgara acceso, cambiar una
  etiqueta comercial cambiaría en silencio quién puede comprometer gasto — el peor acoplamiento
  posible. Regla copiada verbatim del contrato de Globe.
- **Sin default por modo.** Decidido con el operador: cada engagement declara sus responsabilidades
  explícitamente, y la ausencia **falla cerrada**. Así que mientras no haya asignación declarada,
  esta task se comporta exactamente como estaba especificada — el fail-closed es lo que la
  desbloquea sin esperar a `TASK-1663`.
- **Tres ejes ortogonales que no se mezclan:** quién puede actuar (capability) · quién responde
  (operating mode) · quién paga (comercial). El tercero importa acá porque seguir keywords
  compromete gasto recurrente del proveedor, y en `client-operated` quién lo asume es una pregunta
  contractual, no de producto.

**No bloquea.** `TASK-1663` es dependencia **blanda**: sin asignaciones declaradas el reader es
fail-closed y esta task opera igual. Cuando el primitive exista, consumirlo en vez de asumir.

**Nota específica de 1659:** la **intención** de una keyword (objetivo vs oportunidad) y el
**operating mode** son dimensiones distintas y no se colapsan. La intención dice *por qué está en el
set*; el modo dice *quién responde por esa decisión*. Un objetivo declarado por el cliente y uno
declarado por Efeonce son ambos objetivos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migración

- Columna de intención en `seo_keyword_set_members`, nullable, CHECK de vocabulario cerrado
- Columnas de autoría del objetivo: quién lo declaró y cuándo (distinto de `created_by`, que es
  quién ejecutó el INSERT — pueden diferir cuando lo mete un agente por encargo)
- Bloque `DO` anti pre-up-marker que aborta si la columna no quedó creada
- GRANTs y regeneración de tipos (`pnpm db:generate-types`)

### Slice 2 — Command

- Parámetro de intención en `trackKeywords`, default retrocompatible
- **Cambio de intención = cerrar + abrir**, nunca `UPDATE`; con `clock_timestamp()`
- Outcome por keyword refleja el cambio de intención como su propio estado, no como
  `already_tracked` (que sería mentira: sí pasó algo)
- Payload del evento extendido

### Slice 3 — Lanes, MCP y verificación

- Los 3 lanes aceptan el parámetro: app-lane, ecosystem y las 2 tools MCP
- ⚠️ El scope MCP **no cambia**: `efeonce.mcp.seo.write` ya cubre la clase de escritura SEO. **No
  se toca Entra** — es el corolario de la regla de un scope por clase de blast-radius
- Sanity contra PG real: cambio de intención, historial preservado, índice único respetado
- Suite del módulo verde

## Out of Scope

- Cualquier superficie visible — es `TASK-1660`
- Traer volumen/dificultad — es `TASK-1661`
- Que el **cliente** declare objetivos desde su portal. Esta task asume declaración **interna**
  (equipo Efeonce). El carril cliente es aditivo y necesita su propio modelo de permisos; queda
  como follow-up explícito, no como supuesto silencioso
- Metas de posición o fecha por objetivo (*"queremos top 3 en Q4"*). Es tentador y es otra
  dimensión: primero que exista el objetivo, después su meta

## Detailed Spec

**Por qué el cambio de intención NO es un `UPDATE`.** El valor de reporte no es *"esta keyword es
un objetivo"* sino *"esta keyword es objetivo desde marzo, y en marzo estaba en la 45"*. Un
`UPDATE` destruye exactamente ese dato. La tabla ya es append-only con ventanas: el cambio de
intención usa el mismo mecanismo que ya existe.

**Por qué las filas viejas quedan NULL.** Backfillear a "oportunidad" parece inocuo y no lo es:
afirma que alguien las clasificó cuando nadie lo hizo. NULL dice la verdad —"no sabemos"— y obliga
a los readers a tratarlo explícito en vez de contarlo como oportunidad. Mismo criterio que la
migración de procedencia de TASK-1308.

**Nomenclatura:** el valor se decide en Discovery con `greenhouse-ux-writing` si va a ser visible.
Lo que la task fija es la **distinción**, no la etiqueta.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (migración) → Slice 2 (command) → Slice 3 (lanes). Estricto: el command no compila
  contra una columna que no existe, y los lanes exponen lo que el command acepta.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Alguien implementa el cambio de intención como `UPDATE` y destruye el historial | migration | medium | trigger anti-DELETE ya existe; agregar test que verifica que cambiar intención deja 2 filas | el sanity ve 1 fila donde esperaba 2 |
| Cierre con `NOW()` revienta el CHECK (23514) | migration | medium | regla en Architecture Alignment + sanity contra PG real | `23514` en logs; los mocks NO lo atrapan |
| Un reader cuenta los NULL como oportunidad y sesga el reporte | data quality | medium | contrato obliga a tratar NULL explícito; test de reader | KPIs de oportunidad inflados sin causa |

### Feature flags / cutover

Sin flag: la columna es aditiva y nullable, y el parámetro del command tiene default
retrocompatible. Quien no lo use no nota el cambio.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `DROP COLUMN` — aditiva, nadie la exige | < 10 min | sí |
| Slice 2 | revert PR; el command vuelve a su firma anterior | < 10 min | sí |
| Slice 3 | revert PR; los lanes ignoran el parámetro | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` en local vía proxy + verificar la columna con `information_schema`.
2. Sanity contra PG real: declarar objetivo, cambiar intención, comprobar **dos** filas y que el
   índice único parcial sigue aceptando una sola vigente.
3. `pnpm vitest run src/lib/growth/seo` + `pnpm build`.
4. Aplicar en producción y verificar con una keyword real de una org de prueba.

### Out-of-band coordination required

**N/A — repo-only change.** No toca Entra: la clase de escritura SEO ya tiene su scope.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La columna de intención existe con CHECK de vocabulario cerrado y las filas previas quedaron
      `NULL`, no backfilleadas
- [ ] Cambiar la intención de una keyword produce **dos** filas (la anterior cerrada, la nueva
      vigente), verificado contra PG real
- [ ] Ningún cierre usa `NOW()`
- [ ] El índice único parcial sigue garantizando una sola membresía vigente por keyword
- [ ] El outcome por keyword distingue el cambio de intención de `already_tracked`
- [ ] Los 3 lanes aceptan el parámetro y ninguno escribe la columna fuera del command
- [ ] Ningún scope nuevo en Entra
- [ ] Sanity contra PG real verde, con los casos de cambio de intención e historial

## Verification

- `pnpm vitest run src/lib/growth/seo`
- `pnpm tsx scripts/growth/_sanity-task-1659-keyword-intent.ts` contra PG real vía proxy
- `pnpm lint` · `pnpm typecheck` · `pnpm build`
- `pnpm migrate:status`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado

## Follow-ups

- Metas por objetivo (posición y fecha), que habilitan *"vamos atrasados en 3 de 12"*.
- Carril cliente: que el cliente declare objetivos desde su portal, con su modelo de permisos.
