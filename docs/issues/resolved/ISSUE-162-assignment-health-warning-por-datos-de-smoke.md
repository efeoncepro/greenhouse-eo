# ISSUE-162 — La señal de salud de la asignación vive en `warning` por datos de smoke

> **Ambiente:** producción (`/admin/operations`, señal `hiring.assessment.assignment_health`)
> **Detectado:** 2026-08-23 por Claude (durante `TASK-1771` Slice 1)
> **Estado:** **resuelto 2026-08-23** por `TASK-1772` Slice 2b (commit `03a33a55a`)
> **Severidad operativa:** baja en daño, alta en erosión — no rompe nada, entrena a ignorar el tablero

## Síntoma

`hiring.assessment.assignment_health` reporta `warning` de forma permanente. El motivo es su
métrica `awaiting_terminal`, que hoy vale **13**. Ninguna de las trece corresponde a un defecto
que alguien pueda ir a arreglar: **diez son postulaciones de humo, archivadas**.

Medido contra la base compartida el 2026-08-23, con el predicado **copiado verbatim** del archivo
de la señal (`src/lib/reliability/queries/hiring-assessment-assignment-signals.ts:78-100`):

| `hiring_application.data_origin` | `archived_at` | filas |
|---|---|---|
| `real` | no archivada | **3** |
| `smoke_test` | archivada | **10** |

## Causa raíz

El predicado de `awaiting_terminal` —y el del reader canónico que espeja,
`resolveApplicationsAwaitingAssignment` (`assignment-policy/readers.ts:147-188`)— **no filtra
procedencia ni archivado**. Deriva todo del estado vigente: etapa igual al trigger, `decision IS
NULL`, sin instancia abierta de esa plantilla y sin fila vigente del ledger. Una postulación de
humo cumple las cuatro condiciones igual de bien que una real.

Hasta el 2026-08-22 el problema estaba tapado por accidente: `archiveSyntheticRecords` archivaba
escribiendo `stage='closed'`, y una postulación en `closed` no cumple `stage = trigger_stage`.
**`TASK-1748` corrigió ese archivado** —archivar no declara desenlace, así que ahora sella
`archived_at` y devuelve la etapa previa— y al hacerlo las postulaciones de humo volvieron a
cumplir el predicado. La corrección es correcta; el efecto colateral sobre esta señal no se vio.

## Impacto

- **Ninguno sobre candidatos.** El carril automático no le manda nada a una postulación de humo:
  la señal sólo cuenta, no dispara. No hay dato dañado ni correo perdido.
- **Sí sobre la confianza en el tablero.** Una señal amarilla permanente cuyo número no baja
  aunque nadie haga nada es la forma más rápida de que el equipo deje de mirarla. Y el día que
  `awaiting_terminal` suba por una razón real —tres postulaciones reales sí están esperando hoy—
  el cambio de 13 a 14 no lo va a notar nadie.

## Solución propuesta

Aplicar al reader canónico y a su espejo el mismo filtro de elegibilidad que ya usa
`resolveAssignmentDeadEndsForPolicy` (`assignment-policy/dead-ends.ts`, `TASK-1771` Slice 1):

```sql
app.data_origin = 'real' AND app.archived_at IS NULL
```

La mitad de procedencia sale de `realOnlyPredicate` (`data-origin/contracts.ts`), que es el
fragmento canónico del dominio. La de archivado se suma porque responde otra pregunta: no «¿es una
persona real?» sino «¿este registro sigue a la vista del operador?».

**Dos condiciones que no son opcionales:**

1. **Los dos predicados se mueven juntos.** El reader y la señal son espejo declarado
   (invariante 19 del ADR de assignment policy). Cambiar uno solo reintroduce exactamente el drift
   que ese invariante existe para evitar — ya pasó una vez, con el bump de versión de policy.
2. **La exclusión se reporta, no se calla.** Igual que `dead_ends_excluded_synthetic`: una métrica
   de evidencia con el conteo excluido. Sin eso, un filtro de procedencia es indistinguible de un
   cap silencioso, y «0 esperando» dejaría de significar lo mismo.

Trabajo estimado: pequeño (dos predicados y una métrica), pero **toca el reader que la
reconciliación ejecuta**, así que exige su suite y verificación contra PostgreSQL real.

## Cómo reproducirlo

```bash
# Con el proxy de Cloud SQL levantado y el predicado de la señal copiado tal cual.
# El total debe dar 13; el desglose por data_origin/archived_at, 3 reales y 10 de humo.
```

El desglose está en la tabla de arriba. **No re-derivar el predicado de memoria**: la primera
medición de esta sesión usó una aproximación (`superseded_at IS NULL AND outcome IN
('blocked','held')`) que da **4** y responde otra pregunta — filas del ledger en callejón, no
postulaciones sin resultado terminal. Los dos números son correctos y describen cosas distintas.

## Dueño

**`TASK-1772`** (`docs/tasks/to-do/TASK-1772-hiring-active-process-canonical-predicate.md`) cierra este issue
dentro de su alcance, y no como trabajo aparte. La razón es que los dos predicados de acá son **la misma
familia** que los ocho callsites que esa task ya venía a unificar: una definición de «postulación vigente»
escrita a mano en cada consumidor. Arreglarlos por separado dejaría al dominio con un helper canónico nuevo y
dos consumidores conservando su copia.

Las dos condiciones de este issue viajan a su Acceptance Criteria: el reader y su espejo se mueven **en el
mismo commit** (invariante 19), y la exclusión **se reporta** en vez de callarse.

## Relacionado

- `TASK-1771` — el callejón del carril automático. Nació con el filtro de procedencia desde el
  Slice 1 justamente para no repetir este defecto; su métrica arranca en 0.
- `TASK-1748` — archivado por `archived_at`. Correcto; este issue es su efecto colateral no visto.
- `TASK-1739` — contrato de procedencia y `realOnlyPredicate`.
- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md` — invariante 19.


---

## Resolución — 2026-08-23 (`TASK-1772` Slice 2b, commit `03a33a55a`)

### Qué se cambió

`resolveApplicationsAwaitingAssignment` y su espejo `awaiting_terminal` consumen el predicado
canónico `activeProcessPredicate` (`src/lib/hiring/active-process.ts`), que exige
`decision IS NULL AND archived_at IS NULL`. Los dos se movieron **en el mismo commit**, que era la
condición 1 de este issue (invariante 19 del ADR).

La exclusión **no se calla**: viaja como métrica de evidencia `awaiting_terminal_excluded_archived`,
condición 2 de este issue. Sin ese conteo, un filtro es indistinguible de un cap silencioso y
«0 esperando» dejaría de significar lo mismo que significaba ayer sin que nadie pudiera notarlo.

### Verificación contra PostgreSQL real

Ejecutando la señal completa (`getHiringAssessmentAssignmentHealthSignal`) contra la base compartida:

```
awaiting_terminal                    = 3     (era 13)
awaiting_terminal_excluded_archived  = 10
```

3 + 10 = 13. Las diez que salen son exactamente las `smoke_test` archivadas del cuadro de arriba, y
las tres que quedan son las reales que sí esperan — las que estaban escondidas detrás del ruido.

**Medición posterior el mismo día: 5.** No es una regresión del fix. Los 2 extra son postulaciones
`smoke_test` **sin archivar**, residuo de corridas de gate vivo que no limpiaron (una por un proxy
Cloud SQL caído a mitad de corrida). El predicado no filtra procedencia —a propósito, ver abajo— así
que una fila de humo no archivada cuenta igual que una real, y eso es correcto: la reconciliación
efectivamente la drenaría. La cifra que verifica este issue es el **3** sobre la base sin residuo.

### Lo que NO se hizo, y por qué

**La procedencia no entra en este predicado.** El issue proponía aplicar también `realOnlyPredicate`.
Se descartó con evidencia: el gate vivo de `TASK-1771` (`dead-end-supersede.live.test.ts`, test «el ciclo completo: la policy en `draft` bloquea, habilitarla permite liberar, y la postulación vuelve a la cola»)
ejercita este reader con `dataOrigin: 'smoke_test'` **no archivado** y asserta que lo devuelve.
Filtrar procedencia acá rompería la única prueba que demuestra que liberar una clave la devuelve de
verdad a la cola. Y como el reader no la filtra, la señal tampoco puede — divergir rompe el
invariante 19, que es lo mismo que este issue vino a proteger.

No hacía falta: las diez filas ruidosas eran archivadas, así que el eje de visibilidad las cubre
entero. Donde la procedencia SÍ importa —la cola de callejones— se compone aparte, y su exclusión ya
se reporta (`dead_ends_excluded_synthetic`).

### La señal sigue en `warning`, y es honesto

Post-fix la severidad no bajó a `ok`, pero por una razón distinta y accionable: `awaiting_terminal`
= 3 (tres postulaciones reales que la reconciliación debe drenar) y `expired_open_proposals` = 6.
Las dos son trabajo real. Lo que este issue reclamaba era una amarilla **por datos que nadie podía
ir a arreglar**, y eso quedó cerrado.
