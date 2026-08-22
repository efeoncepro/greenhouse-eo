# TASK-1754 — Las etapas del dominio son las que el operador puede elegir

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `copy`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1754-hiring-stage-vocabulary.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Slice 0 en develop y NO en produccion; el colapso de fondo NO empezado; vocabulario cerrado`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Colapsar el enum de etapas de postulación a las seis que la interfaz ofrece, para que la automatización
de assessment pueda dispararse en una etapa alcanzable y el operador pueda trazar dónde está cada
candidata.

## Why This Task Exists

El dominio tiene doce etapas y la interfaz ofrece seis. Tres de las internas —`qualified`,
`shortlisted` y `client_review`— se muestran todas como **"Evaluación"**.

La política de assessment sólo acepta `shortlisted` o `interview` como disparador
(`src/types/hiring-assessment-policy.ts:42`). **`shortlisted` no es alcanzable desde el menú**: al
elegir "Evaluación", la postulación cae en `qualified`. La automatización no está mal configurada —
apunta a un estado que ningún operador puede seleccionar.

No es teórico: dos candidatas reales pasaron por ahí el 2026-08-19 y ninguna recibió su test.
`happ-c4440fa8` (Roxana Lezama, EO-OPN-0009) y `happ-ab57d06e` (Elizabeth Valkiria, EO-OPN-0061),
ambas en `qualified`, ambas asignadas a mano.

Lo que lo vuelve caro es que **no deja rastro**: una postulación que no disparó y una vacante sin
política se ven idénticas en pantalla. Diagnosticarlo exigió leer la base de datos. Es el patrón 9 del
catálogo (`GREENHOUSE_CANONICAL_PATTERNS_V1.md` §9), canonizado el mismo día a partir de este caso.

Y hay una contradicción adicional en la otra dirección: los correos de progreso llaman `shortlisted`
**"Preselección"** mientras el desk la llama "Evaluación". Un mismo estado con dos nombres según quién
mira.

## Goal

- Que la automatización de assessment pueda dispararse desde una etapa que el operador elige.
- Que dos postulaciones en la misma columna estén en el mismo estado y se comporten igual.
- Que la persona candidata y el operador nombren la misma etapa de la misma forma.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->


## Traspaso 2026-08-20 — estado para tomar en frío

### Lo primero que hay que entender

**El Slice 0 que está commiteado es una MITIGACIÓN, no la solución.** Frena el daño en un camino de
dos. La causa de fondo sigue viva y es lo que queda por hacer.

### Commits

| Commit | Qué |
|---|---|
| `4e1566d9a` | Slice 0 — mitigación: `PipelineDeskView` escribía una etapa distinta de la que muestra |

### Qué se arregló, y por qué no alcanza

El carril "Evaluación" declaraba `titleStage: 'shortlisted'` con `destination: 'qualified'`: tomaba
su nombre de la etapa que la automatización vigila y guardaba la postulación en otra. Como el
diccionario de copy traduce AMBAS a "Evaluación", en pantalla no se veía nada raro.

Se cambió el literal a `destination: 'shortlisted'`. Los tests vuelven a salir por el tablero.

**Por qué es mitigación y no solución:** el error no fue escribir mal un literal, fue que ese
literal se pudiera escribir mal. El carril necesita TRES campos de etapa —de cuál toma el nombre,
cuáles agrupa, en cuál guarda— **sólo porque el dominio tiene 13 etapas y el tablero 6**. Cada
columna hace de traductora, y una traductora puede traducir mal.

Y deja intacto el camino del agente: `PATCH /api/hiring/applications/[id]` valida contra las 13 del
dominio, así que ante "muévela a Evaluación" un agente tiene TRES etapas donde elegir
(`qualified`, `shortlisted`, `client_review`) y sólo una dispara. Peor: ahora el arrastre escribe
`shortlisted` y un agente puede escribir `qualified`, así que dos tarjetas en la misma columna
divergen en comportamiento — una divergencia que antes no existía porque todo caía en `qualified`.

**Condición de retiro de la mitigación:** cuando el colapso deje UNA sola etapa detrás de cada
columna, `LaneDefinition` debe perder los tres campos y quedarse con uno. Ahí
`pipeline-lane-contract.test.ts` se vuelve innecesario y **se borra** — que es la señal de que el
arreglo fue estructural y no un guardián sobre un parche.

### Datos verificados contra PG (2026-08-20) — la spec los tiene viejos

| Dato | Spec | Realidad |
|---|---|---|
| Filas por etapa | `sourced` 36 · `shortlisted` 5 · `qualified` 2 | `closed` 32 · `sourced` 30 · **`qualified` 7** · `screening` 5 · **`shortlisted` 4** · `interview` 3 · `rejected` 1 |
| `client_review` | — | **0 filas** |
| Valores del enum | 12 | **13** |
| CHECK constraints | 1 (implícita) | **3** |

Las **3 CHECK** que nombran `shortlisted`: `hiring_application_stage_check` (13 valores),
`hiring_opening_assessment_policy_trigger_stage_check` (`shortlisted|interview`),
`hiring_assessment_assignment_trigger_stage_check` (`shortlisted|interview|manual`).

**14 políticas, las 14 en `shortlisted`** (12 `enabled`, 2 `disabled`, todas `on_stage_entry`). No
faltaba configuración: toda la que había apuntaba a una etapa inalcanzable.

**20 filas históricas** en el ledger con `trigger_stage='shortlisted'` (6 `assigned`, 10
`cancelled`, 4 `blocked`).

**Las 32 filas `closed` con `decision = NULL` son `data_origin='smoke_test'`** — las archivó
`archiveSyntheticRecords` (`purge.ts:173`), que hace `UPDATE ... SET stage='closed'` sin tocar
`decision`. **No son candidatos ignorados.** El proceso real ha cerrado UNA postulación y sí tiene
su decisión. La premisa "Cerrado colapsa sin pérdida" no está desmentida: está **sin estrenar**.

### Arqueología 2026-08-22 — cuándo se desvió, y por qué la verificación no lo atrapó

Reconstruido del log append-only `hiring.application.stage_changed` en `outbox_events` (222.801
eventos; sin índice por `event_type`, seq scan de ~140 MB, aceptable para un diagnóstico puntual).
El payload sólo lleva `stage`, `actorUserId` y `applicationId` — **no lleva etapa previa**, que es
justamente por qué la reconciliación no puede recuperar un trigger perdido.

**El dato que cierra el caso — autoría histórica de cada escritura de etapa:**

| Etapa escrita | Humano | Agente E2E | Script (actor null) |
|---|---|---|---|
| `qualified` | **10** | 0 | 0 |
| `shortlisted` | **0** | 5 | 1 |
| `screening` | 6 | 6 | 0 |
| `interview` | 3 | 0 | 0 |
| `sourced` | 5 | 0 | 0 |

**Ningún operador movió jamás una tarjeta a `shortlisted`.** Las 6 escrituras que existen salieron
de `scripts/hiring/_sanity-task1689-lifecycle-emails-e2e.ts` (1, con actor `null`) y de
`user-agent-e2e-001` (5). Los 10 movimientos humanos a la columna "Evaluación" cayeron **todos** en
`qualified`.

**Consecuencia para el método, no sólo para el bug:** el commit de doctrina `cff96f16b`
(2026-08-17) sí verificó contra la base antes de fijar el disparador — su mensaje cita "9
shortlisted" y concluye que la etapa se usa. La verificación fue real y la conclusión falsa, porque
la pregunta era **"¿hay filas acá?"** en vez de **"¿puede un operador escribir acá?"**. Las 9 filas
las habían puesto robots. **NUNCA** tomar presencia de filas como prueba de alcanzabilidad de una
etapa: filtrar por autoría humana, o derivar la alcanzabilidad del contrato de la superficie.

**Cronología de la deriva (fechas verificadas contra git + PG):**

| Fecha | Qué pasó |
|---|---|
| 2026-07-07 | `TASK-353` crea el CHECK de 13 etapas. |
| 2026-07-09 | `559f5654b` (`TASK-355`) crea el tablero de 6 columnas. **El carril "Evaluación" nace con `titleStage: 'shortlisted'` y `destination: 'qualified'`** — el defecto está en la PRIMERA versión del archivo, no se introdujo después. El wireframe `TASK-355-hiring-desk.md:71` afirma literalmente `columnas = etapas canónicas`, y además nombra la tercera columna **"Assessment"** (un tercer nombre para lo mismo). |
| 2026-07-10 | Primer movimiento humano a "Evaluación" → `qualified`. Sin consecuencia: nada automático miraba la etapa. |
| 2026-08-12 | `TASK-1689` ata el correo de avance a `shortlisted`. Primera dependencia automática. Mismo día, el script de sanity escribe la primera fila de la historia en esa etapa. |
| 2026-08-16 | El agente E2E escribe 5 filas más en `shortlisted`. La etapa ya "parece" viva desde afuera. |
| 2026-08-17 | `cff96f16b` fija `shortlisted` como etapa canónica del disparador. **La doctrina es correcta; movió el trigger desde `interview` —la única de las dos alcanzable— hacia la que nunca lo fue.** |
| 2026-08-19 | 10 políticas configuradas ese día, todas en `shortlisted`. Dos postulaciones reales cruzan "Evaluación" sin recibir prueba. |
| 2026-08-20 | Slice 0 (`4e1566d9a`). Ese mismo día, 5 movimientos humanos más caen en `qualified`. |

**⚠️ La mitigación NO está en producción (verificado 2026-08-22):** `4e1566d9a` no es ancestro de
`origin/main`. En producción, mover una tarjeta a "Evaluación" **sigue escribiendo `qualified` y
sigue sin disparar**. Primera decisión operativa, anterior a cualquier slice: si esa corrección de
una línea sube sola o espera al resto.

**Conteos frescos 2026-08-22** (el bloque de 2026-08-20 quedó viejo): `sourced` 31 · `closed` 32
(todas `smoke_test`) · **`qualified` 7** · `screening` 5 · `shortlisted` 4 · `interview` 3 ·
`rejected` 1 · `client_review` **0**. **15 políticas** (12 `on_stage_entry`/`enabled`, 2
`on_stage_entry`/`disabled`, 1 `manual`/`enabled`), **las 15 en `shortlisted`**. Ledger: 20 filas
`shortlisted` + 3 `manual`.

**Auditoría completa del radio de impacto (2026-08-22, 6 barridos exhaustivos):**
[`docs/audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md`](../../audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md)
— 30 hallazgos verificados adversarialmente, las 17 particiones del enum, el grafo de dependencias entre tasks vivas y las
5 preguntas que exigen decisión humana. **Leerla antes de ejecutar cualquier slice**: contiene
precondiciones duras que esta spec no tenía (dos relojes de retención, la escalera histórica de
fairness como tabla de traducción permanente, `assertEnum` en el camino de lectura).

Documento de diagnóstico para el operador (línea de tiempo + orden de desarme):
<https://claude.ai/code/artifact/5b23dc9b-c027-40aa-bc68-84f965344fbb>

### Decisiones tomadas (arquitectura + talento, 2026-08-20)

1. **El identificador se queda en `shortlisted`; NO se introduce `evaluation`.** El operador nunca
   lo ve, y reusar evita migrar 14 políticas, 20 filas de ledger y 2 de las 3 CHECK. El colapso
   ocurre igual: `qualified` y `client_review` desaparecen absorbidas. Sólo migran **7 filas**.
2. **Pero el comentario de doctrina de `hiring-assessment-policy.ts:19-42` hay que reescribirlo.**
   Justifica `shortlisted` porque "la población ya está acotada" y "el pedido tiene contrapartida".
   Al absorber `qualified`, la población se ensancha y ese argumento deja de ser cierto. Dejarlo
   como está es exactamente la deriva silenciosa que produjo este incidente.
3. **La protección se muda de la etapa a la compuerta:** `mode: 'manual'` por defecto deja de ser un
   follow-up opcional. Con el disparador en una etapa ancha, `on_stage_entry` por defecto significa
   mandar trabajo no pagado a todo el que pase screening.
4. **El ledger NUNCA se reescribe.** Es append-only, `trigger_stage` participa de su clave de
   idempotencia, y es el rastro de auditoría de un dominio de alto riesgo bajo el AI Act.
5. **El colapso de las 5 etapas TERMINALES no va en esta task.** Ver "defectos vivos" abajo.
6. **Copy del candidato:** el correo de avance sólo sale cuando la automatización NO disparó (es el
   camino de fallback, no el feliz). Talento recomienda **"En evaluación" / "Under evaluation"**, no
   "Preselección" —que afirmaría un estatus que el sistema dejó de saber— ni "Evaluación" a secas
   —que en español choca con el nombre del artefacto, porque el correo del test ya dice "tienes una
   evaluación pendiente"—. En inglés esa colisión no existe (`assessment` ≠ `evaluation`).

### Defectos VIVOS encontrados de paso — NO son de esta task

- **`store.ts:1311` deja `closed` fuera del guard** que protege las etapas terminales (bloquea
  `selected|backup|rejected|withdrawn` y omite la quinta), y el carril `outcome` tiene
  `destination: 'closed'`. Arrastrar a "Cerrada" cierra a alguien **sin emitir
  `hiring.application.decided`**, sin correo de decisión y con el reloj de retención congelado
  (`documents/retention.ts:69` filtra `decision IS NOT NULL`, así que el CV nunca se vuelve elegible
  para borrado).
- **Las tres copias de `TERMINAL_APPLICATION_STAGES` omiten `backup`**
  (`assessment/instances.ts:190`, `assessment/public-session/store.ts:11`,
  `assessment/access-recovery/vocabulary.ts:93`), mientras `decide.ts:29` mapea
  `backup_selected → 'backup'`. **Una persona marcada como respaldo puede seguir abriendo y
  recuperando su prueba.** Tres literales duplicados que ya divergieron una vez.
- **El lane programático acepta `stage` como string libre** (`app-hiring-candidate-review.ts:206`).
  Un agente que filtre por una etapa retirada no recibe error: recibe **cero resultados**.

### Plan restante

| # | Qué | Nota |
|---|---|---|
| 1 | **Paridad estructural, antes de mover un literal.** `satisfies readonly HiringApplicationStage[]` en `OPENING_ASSESSMENT_TRIGGER_STAGES` y `ASSESSMENT_ASSIGNMENT_TRIGGERS`; `Record<HiringApplicationStage, string>` en `copy/types.ts:544` (hoy es `Record<string,string>`, así que una clave faltante no rompe nada); tipar el cast de `stage-comms/decide.ts:160`. Dos de tres son compile-time, sin archivo nuevo. |
| 2 | **Test derivado enum ↔ CHECK.** Ambos lados se DERIVAN, ninguno se escribe a mano: `expect(literalesDelCheck.sort()).toEqual([...HIRING_APPLICATION_STAGES].sort())`. Si enumera las etapas esperadas es el test de regresión del snapshot con que se escribió. |
| 3 | **Copy:** `qualified`/`client_review` → "Evaluación" ya está; retirar sus claves al final. Cerrar de paso que `en-US` nunca redefine `stages` y hoy muestra los nombres en castellano. |
| 4 | **Expand/contract de `qualified` + `client_review` → `shortlisted`.** 7 filas y 0 filas, 0 políticas, 0 ledger. Readback por etapa antes y después. |
| 5 | **Estructural:** `LaneDefinition` pasa a UNA etapa por carril; se borra `pipeline-lane-contract.test.ts`. |
| 6 | **Deduplicar la escalera de rangos de `assessment_fairness`** (`migrations/20260713173500000_…:71-119`): tres listas de literales, dos con `ELSE 0`, así que una etapa desconocida cae a rango 0 en silencio. Derivar los dos `CASE` del CTE por join. |

**Nudge operativo:** migrar las 7 filas por SQL **no dispara la automatización** — `stage_changed` lo
emite el comando, no la base. Esas 7 quedan igual de mudas después de migrar. O las mueve un
operador por el tablero ya corregido, o se les asigna por el camino manual. Decidirlo explícito.

### Lo que NUNCA se debe hacer

- **NUNCA** introducir `evaluation` como valor de dominio.
- **NUNCA** reescribir `trigger_stage` en el ledger de asignaciones.
- **NUNCA** backfillear `decision` en las 32 filas sintéticas: sería fabricar un acto humano.
- **NUNCA** colapsar las etapas terminales antes de cerrar la puerta de `closed` en `store.ts:1311`:
  en ese orden se pierde el último discriminante que queda.
- **NUNCA** retirar un literal del enum mientras una política, una CHECK o la escalera de la VIEW lo
  nombren.
- **NUNCA** buscar y reemplazar `qualified` fuera de `src/lib/hiring/**` + `src/types/hiring*.ts` +
  `src/lib/copy/**`: colisiona con `commercial` e ICO, donde `qualified` es otra cosa.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` §9
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `.claude/skills/greenhouse-talent-people-operator/SKILL.md` §Hiring lifecycle emails

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

- **Depende de:** nada técnico. Sí de una decisión de producto (ver Open Questions).
- **Impacta a:** el disparador de assessment, la allowlist de correos de progreso, el pipeline del
  desk, cualquier reader que agrupe por etapa.
- **Colisión activa:** otra sesión trabaja `TASK-1747` sobre `Application360View.tsx`,
  `src/lib/copy/dictionaries/*/hiringDesk.ts` y `src/lib/copy/types.ts`. **Coordinar antes de tocar
  esos archivos.**

### Files owned

- `src/types/hiring.ts` — `HIRING_APPLICATION_STAGES`.
- `src/types/hiring-assessment-policy.ts` — `OPENING_ASSESSMENT_TRIGGER_STAGES`.
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` — nombres visibles.
- `src/lib/hiring/notifications/**` — allowlist de etapas que comunican al candidato.
- Migración nueva en `migrations/`.

## Current Repo State

**Ya existe:**

- El enum de 12 etapas en `src/types/hiring.ts:109`.
- El mapa de nombres visibles en `hiringDesk.ts:97`, con las tres colapsadas.
- `hiring_application.decision` como campo independiente de la etapa.
- El ledger `hiring_assessment_assignment`, que registra cada intento de asignación.

**Gap:**

- No hay forma de disparar la automatización desde la interfaz.
- No hay señal ni aviso cuando una vacante no tiene política: se comporta igual que una que falló.
- La allowlist de correos y el mapa del desk nombran distinto la misma etapa.

**Distribución real de filas (verificada 2026-08-19):**

`sourced` 36 · `closed` 32 · `shortlisted` **5** · `screening` 5 · `qualified` 2 · `rejected` 1.
Las 5 de `shortlisted` son **migración de datos**, no un cambio de enum.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION PLAN (la llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — SCOPE
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Decidir el vocabulario.** Confirmar las seis etapas y sus nombres, y resolver si el
  correo al candidato dice "Evaluación" o conserva "Preselección" a propósito. Entregable: el mapa
  cerrado en el wireframe. Sin esto los demás slices no tienen destino.
- **Slice 2 — Expand.** Agregar la etapa destino al enum y migrar las filas de `qualified`,
  `shortlisted` y `client_review`, dejando las viejas todavía válidas. Readback obligatorio del
  conteo por etapa antes y después.
- **Slice 3 — Redirigir el disparador.** `OPENING_ASSESSMENT_TRIGGER_STAGES` apunta a la etapa nueva,
  y las políticas existentes que apuntan a `shortlisted` se migran en la misma transacción. **Si la
  etapa desaparece antes que la política, la política queda apuntando al vacío.**
- **Slice 4 — Correo y superficies.** La allowlist de progreso y los nombres visibles quedan
  coherentes en ambos diccionarios.
- **Slice 5 — Contract.** Retirar las etapas muertas del enum, con readback de que ninguna fila las usa.

## Out of Scope

- Cambiar el modelo de `decision` (sobrevive tal cual y es lo que hace limpio el colapso de "Cerrado").
- Invertir el default de la política de assessment — es real y necesario, pero va en una task aparte.
- Revisar qué plantilla corresponde a cada vacante — task aparte.
- Rediseñar el pipeline o el desk más allá de los nombres.

## Detailed Spec

El mapa completo, las dos naturalezas del colapso y la decisión pendiente del correo están en
`docs/ui/wireframes/TASK-1754-hiring-stage-vocabulary.md`.

**La decisión de diseño central**, que debe tomarse a propósito y no descubrirse después:

- **"Cerrado" colapsa SIN pérdida** — absorbe cinco etapas terminales, pero `decision` sobrevive como
  campo aparte. La etapa dice *terminó*, la decisión dice *cómo*.
- **"Evaluación" colapsa CON pérdida** — absorbe tres etapas y **ningún campo recupera cuál era**. Se
  acepta porque esas tres nunca fueron elegibles desde la interfaz: no hay intención humana que
  preservar. Pero es pérdida real y se declara.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Expand antes que contract, y la política antes que la etapa. Si `shortlisted` desaparece del enum
mientras una política todavía la nombra, esa política queda inerte sin avisar — exactamente el fallo
silencioso que la task viene a cerrar. El mismo orden que ya mordió una vez con la migración de
TASK-1746 el 2026-08-19.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Una postulación queda en una etapa que ya no existe | Desk / pipeline | Media | Migración con readback por etapa antes y después | Conteo por etapa |
| La política queda apuntando a una etapa muerta | Automatización | **Alta si se invierte el orden** | Migrar políticas en la misma transacción que las filas | `hiring_assessment_assignment` sin filas nuevas |
| El candidato lee un nombre y el operador otro | Comunicación | Media | Slice 4 cierra ambos diccionarios y la allowlist | Revisión del correo real |
| Colisión con TASK-1747 | Desk | **Alta** | Coordinar con la sesión que la trabaja antes de tocar copy | — |

### Feature flags / cutover

Sin flag: es una corrección de vocabulario del dominio. Un flag mantendría vivas las dos formas a la
vez, que es precisamente el problema.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | N/A — sólo decisión documentada | — | Sí |
| 2 | Down de la migración; las etapas viejas siguen válidas durante el expand | < 15 min | Sí |
| 3–4 | Revert del PR | < 15 min | Sí |
| 5 | **Irreversible sin migración nueva** — no ejecutar hasta que 2–4 estén verificados en producción | — | No |

### Production verification sequence

Readback del conteo por etapa antes y después. Una postulación real movida a "Evaluación" que recibe
su test. Y el correo de progreso recibido, para confirmar que nombra la etapa igual que el desk.

### Out-of-band coordination required

La decisión del Slice 1 es del operador. Y la coordinación con la sesión que trabaja TASK-1747.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/types/hiring.ts` + `src/lib/hiring/**` + `src/lib/copy/**`
- Future candidate home: `remain-shared`
- Boundary: el vocabulario de etapas es del dominio Hiring; la copy es su proyección visible
- Server/browser split: el enum es compartido; la copy se consume en cliente
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

- **Source of truth:** `hiring_application.stage`, con el enum en `src/types/hiring.ts`.
- **Contract surface:** `HIRING_APPLICATION_STAGES` y `OPENING_ASSESSMENT_TRIGGER_STAGES`.
- **Data invariants:** toda etapa del enum es seleccionable desde la interfaz; todo disparador de
  política es una etapa alcanzable.
- **Tenant/access boundary:** sin cambios.
- **Idempotency/concurrency:** la migración es idempotente por etapa origen.
- **Migration/backfill/rollback:** expand/contract en dos migraciones separadas; el contract no se
  ejecuta hasta verificar el expand en producción.
- **Sensitive data/error posture:** sin PII involucrada.
- **Audit/signal posture:** evaluar una señal para "vacante activa sin política de assessment" — hoy
  ese estado es indistinguible de una política que falló. Puede ir en esa task aparte.
- **Runtime evidence:** conteo por etapa antes/después y una asignación automática real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Hybrid Execution Justification

- **Why not split:** el cambio es UNO — el vocabulario de etapas. El enum y su nombre visible son la
  misma decisión mirada desde dos lados; separarlos dejaría una de las dos mitades describiendo un
  estado que la otra ya no tiene, que es exactamente el defecto que la task viene a cerrar.
- **Primary execution profile:** `backend-data`. El trabajo pesado es el enum, la migración de filas y
  el disparador; la copy es su proyección.
- **Contract boundary:** el dominio define qué etapas existen (`src/types/hiring.ts`); la copy sólo las
  nombra (`src/lib/copy/dictionaries/**`). La copy nunca introduce ni oculta un estado.
- **Risk controls:** expand/contract con readback por etapa; el contract no se ejecuta hasta verificar
  el expand en producción; coordinación explícita con la sesión que trabaja TASK-1747 sobre los mismos
  diccionarios.

## UI/UX Contract

- **Experience brief:** el operador elige entre seis etapas con seis nombres distintos, y puede
  anticipar qué pasa al mover una tarjeta.
- **Surface/system decision:** no cambia el pipeline ni su layout — cambia qué columnas existen y cómo
  se llaman. Sin primitive nueva.
- **State inventory:** las seis etapas del wireframe. "Cerrado" muestra además el desenlace derivado de
  `decision`.
- **Interaction contract:** mover una tarjeta a una etapa que dispara automatización lo declara en el
  punto de decisión, antes de soltar.
- **Motion:** ninguno nuevo; el pipeline conserva su drag actual.
- **Copy source:** `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`, validado con
  `greenhouse-ux-writing`. Ningún literal en JSX.
- **A11y:** cada columna anuncia nombre y conteo; el aviso de automatización se asocia al control con
  `aria-describedby`.
- **Visual verification:** GVC del pipeline en desktop y 390 px, antes y después, con las seis columnas
  nombradas distinto.

## Acceptance Criteria

- [ ] El enum de etapas contiene exactamente las que la interfaz ofrece.
- [ ] Ninguna fila de `hiring_application` queda en una etapa retirada (readback).
- [ ] `OPENING_ASSESSMENT_TRIGGER_STAGES` sólo nombra etapas alcanzables desde la interfaz.
- [ ] Ninguna política queda apuntando a una etapa inexistente (readback).
- [ ] Una postulación real movida a "Evaluación" recibe su assessment, con fila en el ledger.
- [ ] El nombre de la etapa en el correo al candidato coincide con el del desk, o la divergencia está
      documentada con su razón.
- [ ] Los dos diccionarios de copy (es-CL, en-US) están alineados.
- [ ] GVC del pipeline en desktop y 390 px con las seis columnas.
- [ ] `UI ready` pasa a `yes` sólo con mapping, plan GVC y decision log completos.

## Verification

`pnpm local:check` · tests de `src/lib/hiring` · readback de conteos por etapa · GVC del pipeline.

## Closing Protocol

- [ ] Handoff y changelog actualizados.
- [ ] Lifecycle a `complete` y `docs/tasks/README.md` + registry sincronizados.
- [ ] Si el Slice 1 cambia la dirección, la task se replantea antes de migrar.

## Follow-ups

- **Task nueva (ID por reservar)** — invertir el default de la política de assessment y revisar la plantilla por vacante.

## Open Questions

**Las dos quedaron CERRADAS. No reabrir sin decisión explícita del operador.**

- ~~¿El correo al candidato dice "Evaluación" o conserva "Preselección"?~~ **RESUELTA 2026-08-22
  por el operador: conserva "Preselección".** Es una divergencia **deliberada** con el "Evaluación"
  del desk, no un defecto: hacia afuera el registro es más suave, y evita chocar con el correo del
  test que ya dice "tienes una evaluación pendiente". El Slice 4 **no toca** la allowlist
  (`notifications/stage-policy.ts`); sí debe **documentar la divergencia con su razón** en la doc
  funcional, para que un agente futuro no la lea como drift y la "arregle". La recomendación de
  Talento del 2026-08-20 ("En evaluación") queda **descartada**.
- ~~¿La etapa nueva se llama `evaluation` o se reusa un nombre existente?~~ **RESUELTA 2026-08-20:
  se reusa `shortlisted`**; ver "Lo que NUNCA se debe hacer" (introducir `evaluation` está
  prohibido).
