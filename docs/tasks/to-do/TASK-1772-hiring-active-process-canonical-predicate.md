# TASK-1772 — «Proceso activo» son tres ejes, no uno: el predicado canónico y sus ocho callsites

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Backend impact: `reader`
- Epic: `EPIC-011`
- Status real: `Diseño — los dos conteos medidos contra PostgreSQL real 2026-08-22 (50 por etapa, 82 por desenlace); la deuda se declaró en TASK-1765 con una condición que se verificó incompleta`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Nota de desbloqueo (2026-08-23): las dos dependencias cerraron — las 32 filas ya llevan `archived_at` y el `CHECK` del invariante está aplicado, así que los dos predicados convergen. Convergen al valor equivocado, que es exactamente lo que esta task corrige
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Ocho callsites en cuatro archivos deciden qué es una postulación «en proceso activo», cada uno con su
propia lista literal de etapas y sin fuente compartida. `TASK-1765` declaró la deuda de migrarlos del eje
`stage` al eje `decision` y la dejó condicionada. **Esta task existe porque esa condición es correcta y su
conclusión no.** Después del backfill de `TASK-1748` los dos predicados sí se vuelven equivalentes — pero
equivalentes **al valor equivocado**: los dos contarían como proceso activo 32 postulaciones archivadas.

La respuesta correcta no es ninguno de los dos candidatos: **«proceso activo» son TRES ejes**, y el tercero
—`archived_at`— nació el 2026-08-22 sin que ningún consumidor lo incorporara.

## Why This Task Exists

### El dato que retira la premisa

`TASK-1765` midió los dos candidatos contra PostgreSQL real (2026-08-22):

```
stage NOT IN ('rejected','withdrawn','closed')  →  50 postulaciones activas
decision IS NULL                                 →  82 postulaciones activas
diferencia: 32 = las sintéticas archivadas hoy en stage='closed'
```

Y concluyó, correctamente para ese momento, que migrar hoy sería una regresión: devolvería 32 filas
sintéticas al conteo. Dejó la deuda con la condición *«después del backfill de 1748 y del `CHECK`, cuando
los dos predicados se vuelven equivalentes y el cambio pasa a ser puramente de claridad»*.

**La primera mitad de esa frase es cierta. La segunda no.** El backfill de `TASK-1748`
(`docs/tasks/pending-migrations/TASK-1748-synthetic-archive-axis-backfill.sql.pending`) **no borra ni
neutraliza esas filas: las devuelve a su etapa previa** —o a `sourced` cuando el audit no conserva
`beforeStage`— y les estampa `archived_at`. Después de correr:

| Predicado | Las 32 archivadas |
|---|---|
| `stage NOT IN ('rejected','withdrawn','closed')` | están en `sourced`/etapa previa → **cuentan como activas** |
| `decision IS NULL` | nunca tuvieron desenlace → **cuentan como activas** |

Los dos convergen, y convergen en contar como «en proceso» filas que un humano archivó explícitamente
para sacarlas de la vista. El cambio no sería «puramente de claridad»: sería adoptar el mismo defecto en
los ocho callsites a la vez.

### El error de categoría, que es el mismo del ADR

El ADR del vocabulario
(`docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`) separó dos ejes
que estaban colapsados en uno: **dónde va la persona** (`stage`) y **cómo terminó** (`decision`). Lo que
no hizo —porque `archived_at` nació en su propio Slice 1, el mismo día— fue reconocer que hay un **tercer
eje ortogonal**: **si el registro se muestra**.

Hoy un solo predicado (`stage`) responde a las tres preguntas, y por eso ninguna la responde bien. La
definición canónica es la conjunción:

```sql
decision IS NULL          -- el recorrido no ha terminado
AND archived_at IS NULL   -- y el registro no fue retirado de la vista
```

`archived_at` es ortogonal a `decision` por contrato explícito —archivar no declara desenlace, y el ADR §12
lo prohíbe expresamente— así que la conjunción no es redundante: cubre el cuadrante que hoy nadie cubre.

### El daño concreto, con la superficie que lo materializa

No es aritmética de dashboard. `talent-pool/projection.ts` usa `has_active_application` para decidir
`lifecycle_status='active_process'`, y `active_process` **entra en la proyección buscable** del Banco de
Talento (`projection.ts:131` y `:151`, junto a `pool_eligible` y `paused`).

`TASK-1748` cerró el caso de la persona sintética con su `realOnlyPredicate`. **Queda abierto el cruce que
ese filtro no cubre:** una persona **real** con una postulación **archivada** —a una vacante sintética, o
archivada por cualquier motivo legítimo— pasa el filtro de procedencia y, con el predicado por
`decision IS NULL` solo, quedaría `active_process` y por lo tanto **buscable e invitable** en el Banco de
Talento por un registro que alguien retiró a propósito.

### Y no tiene dueño

Los ocho callsites están repartidos en cuatro archivos de dos dominios (`talent-pool` y el desk), y el
barrido por dominio y superficie confirma que **ninguna task viva declara la definición**: `TASK-1397`
posee la elegibilidad de alertas, `TASK-1748` el filtro de procedencia, `TASK-1766`/`TASK-1768` tocan
`desk.ts` por otras razones, `TASK-1765` declaró la deuda pero su alcance es el eje de desenlace. Es el
patrón canónico §8 (SSOT) sin owner: ocho copias de una regla que nadie posee derivan por separado cada
vez que el vocabulario cambia — y `TASK-1754` Slice F lo va a cambiar otra vez.

## Goal

Que exista **una sola definición ejecutable de «postulación en proceso activo»**, sobre los tres ejes, con
sus ocho callsites consumiéndola y una señal que detecte la divergencia si alguien vuelve a escribir la
lista a mano.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- **Patrón canónico §8 (SSOT)**: la definición tiene exactamente un dueño; todo lo demás es derivación.
- **Patrón canónico §7 (VIEW/helper canónico + señal)**: una agregación con riesgo de drift se expone por
  un helper único y una señal de reliability. Ningún callsite recomputa.
- **ADR del vocabulario §3, §4 y §12**: `stage`, `decision` y `archived_at` son ejes ortogonales; archivar
  no declara desenlace.
- **`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`**: contrato del dominio y de la proyección del Banco de
  Talento.
- **Full API Parity**: la definición se expone como primitive de `src/lib/**`, no dentro de un componente;
  el desk, la projection, Nexa y MCP la consumen igual.

## Normative Docs

- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (§7, §8)
- `docs/tasks/pending-migrations/README.md` (la cadena y el orden)
- `docs/audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md` (H-08, H-24)

## Dependencies & Impact

**Depende de:**

- `TASK-1748` — su backfill mueve las 32 filas de `stage='closed'` a su etapa previa con `archived_at`.
  Antes de eso, migrar el predicado es la regresión que `TASK-1765` midió.
- `TASK-1765` Slice 5 — el `CHECK` `(stage='closed') = (decision IS NOT NULL)`. Sin él, `decision IS NULL`
  no es equivalente a «sin desenlace» para las filas legacy.
- Las dos son POST-RELEASE. **Esta task no arranca antes del release.**

**Impacta a:**

- `TASK-1754` Slice F — retira etapas del enum; después de esta task las listas literales ya no existen y
  su superficie de cambio se reduce.
- `TASK-1397` — su carril de alertas consume la elegibilidad que depende de este predicado.
- `TASK-1766` / `TASK-1768` — tocan `desk.ts`; coordinar el orden si se solapan.

### Files owned

- `src/lib/hiring/active-process.ts` (nuevo — el predicado canónico)
- `src/lib/hiring/desk.ts` (callsite)
- `src/lib/hiring/talent-pool/projection.ts` (5 callsites)
- `src/lib/hiring/talent-pool/commands.ts` (1 callsite)
- `src/views/greenhouse/hiring/DemandDeskView.tsx` (1 callsite)
- `src/lib/reliability/queries/hiring-active-process-drift.ts` (nuevo — la señal)

## Current Repo State

**Ya existe:**

- `archived_at` en `greenhouse_hiring.hiring_application`, con índice
  (`migrations/20260822202243572_task-1765-hiring-outcome-axis-expand.sql:26,52`).
- El eje `decision` con sus seis valores y su causa gobernada.
- `realOnlyPredicate` (`src/lib/hiring/data-origin/contracts.ts`) como precedente de predicado compartido
  inyectado por JOIN.
- `archiveSyntheticRecords` como único escritor de `archived_at` (CLI, sin superficie de portal).

**Gap:**

- No existe una definición compartida de «proceso activo». Hay **ocho** listas literales:
  `desk.ts:104`, `talent-pool/projection.ts` (`:47`, `:52`, `:64`, `:67`, `:106`),
  `talent-pool/commands.ts:272`, `DemandDeskView.tsx:348`.
- Ninguna incorpora `archived_at`.
- No hay señal que detecte divergencia entre callsites.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring/` (portal Next.js, server-only para el predicado SQL)
- Future candidate home: `remain-shared`
- Boundary: un predicado SQL inyectable y un predicado TS equivalente para el consumidor de vista; los
  consumers autorizados son el desk, la projection del Banco de Talento, sus commands y la señal
- Server/browser split: el fragmento SQL es server-only; `DemandDeskView.tsx` consume la variante TS pura,
  sin acceso a base
- Build impact: `none`
- Extraction blocker: el predicado nombra columnas de `greenhouse_hiring.hiring_application`; extraerlo
  exige mover el esquema del dominio con él

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Source of truth: `greenhouse_hiring.hiring_application` — columnas `decision` y `archived_at`
- Contract surface: helper `isActiveProcess` (TS) + `activeProcessPredicate(alias)` (fragmento SQL), ambos
  exportados desde `src/lib/hiring/active-process.ts`
- Data invariants: `decision IS NULL AND archived_at IS NULL`. Los tres ejes son ortogonales: `stage` no
  participa del predicado
- Tenant/access boundary: sin cambio; los callsites conservan su scoping actual
- Idempotency/concurrency: sólo lectura; sin escrituras
- Migration/backfill/rollback: `none` — no crea ni altera columnas. Rollback es revert del código
- Sensitive data/error posture: sin PII; el predicado nombra dos columnas no sensibles
- Audit/signal posture: señal nueva `hiring.data_quality.active_process_predicate_drift`, steady 0
- Runtime evidence: conteos antes/después contra PostgreSQL real, y readback del Banco de Talento

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Lo llena el agente que toma la task, no quien la crea.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — el predicado canónico.** `src/lib/hiring/active-process.ts` con
  `activeProcessPredicate(alias)` (fragmento SQL) y `isActiveProcess(row)` (TS puro para la vista).
  Docstring que declara los tres ejes y por qué `stage` no participa. Tests unitarios sobre los cuatro
  cuadrantes: sin desenlace / sin archivar, sin desenlace / archivada, con desenlace / sin archivar, con
  desenlace / archivada.
- **Slice 2 — migrar los ocho callsites.** Los cinco de `projection.ts`, el de `commands.ts`, el de
  `desk.ts` y el de `DemandDeskView.tsx`. Cero listas literales de etapas remanentes en esos archivos.
- **Slice 3 — la señal de drift.** `hiring.data_quality.active_process_predicate_drift`: compara el conteo
  del predicado canónico contra el conteo por etapa y reporta la diferencia. Steady 0 una vez migrado;
  cualquier valor distinto significa que alguien reintrodujo una lista a mano o que apareció un cuadrante
  nuevo.
- **Slice 4 — gate de código.** Regla de lint o gate de source que rechace listas literales de etapas
  terminales en `src/lib/hiring/**` y `src/views/greenhouse/hiring/**` fuera de `active-process.ts` y del
  enum canónico. Escribir el gate **después** de stagear los archivos que persigue.
- **Slice 5 — documentación.** Delta en el ADR del vocabulario declarando el tercer eje; delta funcional
  en `docs/documentation/hr/` sobre qué cuenta como proceso activo y qué no.

## Out of Scope

- Cambiar el comportamiento de archivado, o darle superficie de portal (es `TASK-1748`).
- Retirar etapas del enum (es `TASK-1754` Slice F).
- La exclusión de colaboradores del Banco de Talento (es el Delta de `TASK-1397`).
- Tocar `has_active_application` como nombre de columna o su semántica en la projection: esta task cambia
  **cómo se calcula**, no qué significa.
- Cualquier decisión sobre la ventana de retención de `backup_selected` (es `TASK-1744`).

## Detailed Spec

El predicado canónico:

```sql
-- activeProcessPredicate('a') →
a.decision IS NULL AND a.archived_at IS NULL
```

**Por qué `stage` desaparece del predicado y no queda como tercera condición redundante:** una vez que el
`CHECK` de `TASK-1765` esté aplicado, `stage='closed'` ⟺ `decision IS NOT NULL`, así que agregar
`stage <> 'closed'` sería literalmente repetir la primera condición. Y mientras el `CHECK` no esté, la
combinación existe pero es exactamente la que esta task no quiere contar. En los dos mundos, `stage` es
ruido.

**Los cuatro cuadrantes y qué debe pasar en cada uno:**

| `decision` | `archived_at` | ¿Proceso activo? | Caso real |
|---|---|---|---|
| `NULL` | `NULL` | **sí** | la persona está en el pipeline |
| `NULL` | fecha | **no** | registro retirado de la vista sin declarar desenlace |
| valor | `NULL` | **no** | el recorrido terminó |
| valor | fecha | **no** | terminó y además se archivó |

El segundo cuadrante es el que hoy nadie cubre y el que motiva la task.

**Orden dentro del Slice 2:** migrar primero `talent-pool/projection.ts`, que es el que tiene consecuencia
sobre datos de personas (`lifecycle_status`, superficie de consentimiento), y verificar su conteo antes de
seguir con los de sólo lectura.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 antes que Slice 2 (no se migra a un helper que no existe). Slice 2 antes que Slice 3 (la señal
mediría drift contra sí misma). Slice 4 **después** de stagear los archivos, porque un gate de source es
ciego a lo untracked y no se ve a sí mismo.

**Y la task entera va después del release**, porque sus dos dependencias son migraciones POST-RELEASE.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Migrar antes del backfill de 1748 | Banco de Talento | Media | `Blocked by` explícito + readback de conteos antes de tocar código | `active_process_predicate_drift` |
| Un callsite se queda sin migrar | desk / projection | Media | Gate de source del Slice 4 + grep de cero literales | mismo |
| El conteo cambia y nadie lo nota | KPI de vacantes | Alta | Readback antes/después declarado en la evidencia | mismo |
| Reintroducción de la lista a mano | cualquiera | Media | Gate de lint + docstring que explica el porqué | mismo |

### Feature flags / cutover

`none`. Es un cambio de lectura sin escritura ni migración; un flag agregaría un estado intermedio en el
que dos definiciones coexisten, que es exactamente lo que la task viene a eliminar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert del archivo nuevo | minutos | sí |
| 2 | revert del commit; los literales vuelven | minutos | sí |
| 3 | retirar la señal del registry | minutos | sí |
| 4 | retirar la regla del gate | minutos | sí |

### Production verification sequence

1. Readback de los tres conteos contra PostgreSQL real **antes** de tocar código: por etapa, por desenlace
   y por el predicado canónico.
2. Migrar; repetir el readback. El conteo canónico debe excluir exactamente las archivadas.
3. Verificar en `/agency/hiring` que el conteo de activas por vacante no incluye archivadas.
4. Verificar en el Banco de Talento que ninguna membresía quedó `active_process` por una postulación
   archivada.
5. Señal en 0 en `/admin/operations`.

### Out-of-band coordination required

`TASK-1748` y `TASK-1765` deben confirmar que sus migraciones POST-RELEASE corrieron y con qué readback.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `src/lib/hiring/active-process.ts` exportando el predicado SQL y el predicado TS.
- [ ] Los cuatro cuadrantes están cubiertos por test unitario, nombrados como tales.
- [ ] Los ocho callsites consumen el helper; `grep` de listas literales de etapas terminales en los cuatro
      archivos devuelve cero.
- [ ] La señal `hiring.data_quality.active_process_predicate_drift` existe, está en el registry y reporta 0.
- [ ] El gate del Slice 4 falla sobre un archivo de prueba que reintroduce la lista, y pasa sobre el árbol
      migrado.
- [ ] Los tres conteos están declarados antes y después contra PostgreSQL real, con la diferencia explicada.
- [ ] El ADR del vocabulario declara el tercer eje.
- [ ] `pnpm task:lint --task TASK-1772` en `errors=0 warnings=0`.

## Verification

- `pnpm local:check`
- `pnpm test src/lib/hiring`
- Readback contra PostgreSQL real de los tres conteos
- `pnpm build` con autorización del operador (gate de costo de máquina, caso a caso)

## Closing Protocol

- [ ] `Lifecycle` a `complete` y archivo movido a `complete/`
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` y `changelog.md` actualizados
- [ ] Delta en el ADR y en la doc funcional
- [ ] Chequeo de impacto cruzado sobre `TASK-1397`, `TASK-1754`, `TASK-1766`, `TASK-1768`
- [ ] `pnpm docs:closure-check` sin errores

## Follow-ups

- Si aparece un cuarto eje (por ejemplo, una postulación «pausada» que no es ni archivada ni decidida), la
  conjunción crece y el helper es el único lugar donde se toca.
- Evaluar si `has_active_application` merece renombrarse en la projection, ahora que su cálculo ya no
  depende de la etapa.
