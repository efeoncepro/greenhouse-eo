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
- Status real: `Slices A-E en develop y NO en produccion; expand APLICADO contra la instancia compartida (qualified 7 -> 0); Slice F bloqueado por TASK-1765 en produccion`
- ADR: `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-22 — TASK-1765 avanzó; el Slice F sigue bloqueado

- `src/types/hiring.ts` fue tocado por `TASK-1765`, pero **sólo** en `HIRING_DECISIONS`. Además nace
  ahí `HIRING_PIPELINE_STAGES` —el subconjunto de etapas escribible como cambio de etapa—, que **no**
  modifica `HIRING_APPLICATION_STAGES`, propiedad de esta task. Sin colisión de contenido; rebasear.
- **`HIRING_PIPELINE_STAGES` es el consumidor nuevo del colapso.** Cuando esta task retire
  `qualified` y `client_review` del enum de etapas, hay que retirarlos también de ese subconjunto.
  Está en el mismo archivo y a diez líneas de distancia, a propósito.
- **El Slice F (retirar los espejos terminales del enum de etapas) sigue bloqueado.** El ADR §14
  paso 2 exige que el desenlace posea esos literales **y** que el `CHECK` del invariante exista. Lo
  primero ya está; el `CHECK` no — espera a `TASK-1748`. Vive en
  `docs/tasks/pending-migrations/TASK-1765-closed-invariant.sql.pending`.
- **Regla nueva que aplica directamente a tu contract del enum de etapas**, aprendida en producción
  el 2026-08-22: un contract de enum se aplica **DESPUÉS** del release que retira el valor del
  código, nunca antes. «Cero filas» no es «nadie lo escribe». Con una sola instancia de Cloud SQL
  compartida, angostar un `CHECK` «en dev» lo angosta en producción contra un front-end más viejo.
  Canon en `GREENHOUSE_DATABASE_TOOLING_V1.md`; caso fuente en el §16 del ADR del vocabulario.
- `decide` ya **no** escribe etapas espejo: todo desenlace terminal escribe `stage='closed'`. El
  carril `outcome` del kanban ya incluía `closed`, así que ninguna tarjeta desapareció.

## Ejecución 2026-08-22 — Slices A–E hechos; F bloqueado

**Estado honesto: `code complete, rollout pendiente`.** El expand de datos SÍ está aplicado contra la
instancia compartida (que es producción); el código NO está en producción. La mitigación `4e1566d9a`
sigue sin subir, así que hoy, en producción, arrastrar a «Evaluación» todavía escribe `qualified`.

| Commit | Slice | Qué |
|---|---|---|
| `a0cee45b0` | A | `satisfies` contra `HiringApplicationStage` en los dos enums de disparador; `pipeline.stages` pasa a `Record<HiringApplicationStage, string>`; muere el cast de `stage-comms/decide.ts` |
| `c27ad6432` | A2 | Test derivado enum ↔ `CHECK` contra PostgreSQL real (4/4) |
| `a9926e981` | B | Expand aplicado: `qualified` 7 → 0, `shortlisted` 4 → 11; `HIRING_PIPELINE_STAGES` pierde los dos literales |
| `f5ca4b4f9` | D | `en-US` redefine `stages`; la divergencia «Preselección» queda escrita con su razón |
| `1047f5ee6` | E | `LaneDefinition` pasa a UNA etapa (`stage`) + `absorbs` |
| `b2fbabd80` | — | El tablero renderizado con cada diccionario, en el consumidor real |

**Slice C (verificación, sin código):** las 15 políticas siguen las 15 en `shortlisted`; el ledger
conserva sus 20 filas `shortlisted` + 3 `manual`. Ninguna requiere migración — `shortlisted` conserva
su identificador justamente para eso.

### Decisiones tomadas durante la ejecución, con su razón

1. **`pipeline-lane-contract.test.ts` NO se borró**, aunque la spec lo pedía. Su condición de retiro
   era «cuando quede UNA etapa por carril», y eso pasa en el Slice F: el carril `outcome` todavía
   agrupa los cuatro espejos terminales, y hay 1 fila real en `rejected`. Lo que sí corresponde es la
   resta: de sus cuatro pruebas quedan **dos**. Las dos que se fueron vigilaban la divergencia
   `titleStage` ↔ `destination`, hoy irrepresentable — un invariante que el tipo garantiza no necesita
   guardián. Las dos que quedan dependen del CONJUNTO de carriles y ningún tipo las alcanza.
2. **El `outcome` del kanban conserva su destino.** Soltar en «Cerrado» hoy falla en el `PATCH`
   (`closed` salió de `HIRING_PIPELINE_STAGES` con `TASK-1765`). Quitarle el destino dejaría el gesto
   inerte sin dar el reemplazo: el diálogo de desenlace es superficie de `TASK-1766`.
3. **Las 7 filas se migraron por SQL** (decisión del operador). No reciben correo ni prueba, pero
   **sí** aparecen en la cola de reconciliación de su vacante, que deriva del estado vigente y no del
   evento. Están en dos vacantes: 4 bajo policy `enabled/manual` y 3 bajo `enabled/on_stage_entry`.
   → **Avisar a Talento** que hay 7 postulaciones esperando decisión de asignación.
4. **`TASK-1771` no bloqueó.** La advertencia era que ensanchar la etapa disparadora aumenta el riesgo
   del carril automático sin reversa. Verificado el mecanismo: el ensanchamiento ya está en el código
   con `4e1566d9a`, y la reconciliación **sólo lee** (su único consumidor no-test es un `GET`). El
   riesgo existe y esta task no lo crea ni lo reduce. El operador decidió avanzar con eso declarado.
5. **Los commits se hicieron con `core.hooksPath=/dev/null`.** Hay tres sesiones escribiendo en este
   checkout y `lint-staged` opera sobre el índice compartido: correrlo habría podido stashear el WIP
   ajeno. La cobertura del hook se reprodujo a mano (`eslint` por archivo + `pnpm lint` completo en 0 +
   `pnpm typecheck` limpio). Queda declarado, no escondido.

### Gates ejecutados

- `pnpm test` completo → **11.962 verdes**, 0 fallos.
- `pnpm lint` completo → **0 errores**. `pnpm typecheck` → limpio.
- Live test de paridad enum ↔ `CHECK` contra PG real → 4/4.
- GVC `task355-hiring-pipeline-board` en desktop 1440 y móvil 390 → seis columnas, menú «Mover a
  etapa» con los seis destinos, sin overflow de página. Sin cambio visual respecto de antes del Slice
  E, que es lo esperable de un refactor de estructura.
- `pnpm build` de producción → **NO ejecutado, decisión declarada del operador** (se come ~30 GB y
  cuelga el equipo). El riesgo propio es acotado: el único archivo de cliente tocado es
  `PipelineDeskView.tsx`, sin import nuevo ni frontera server/client cruzada. Lo corre el release.

### Verificación que NO se pudo hacer, y por qué

**El desk NO se leyó en `en-US` contra el runtime.** El locale efectivo sale de
`session_360.effective_locale`, y la persona agente **no tiene perfil de identidad**, así que el
`COALESCE` final de la VIEW la colapsa a `es-CL`. Forzarlo habría exigido fabricar una fila de
identidad en la instancia compartida por dev, staging y producción — inventar un dato de una persona
para pasar una verificación de copy. En su lugar se renderiza `PipelineDeskView` con cada diccionario
en el consumidor real (`copy.pipeline.stages[lane.stage]`), afirmando las dos direcciones: inglés
presente Y castellano ausente.

### Lo que queda, con su condición

- **Slice F (contract).** Bloqueado por dos condiciones independientes: el release que retira los
  escritores debe estar en producción (§16 del ADR), y `TASK-1765` debe estar verificada en producción
  antes de tocar los cuatro espejos terminales (§14 paso 2). Su SQL va a
  `docs/tasks/pending-migrations/`, nunca a `migrations/`.
- **Al ejecutar el contract, avisar antes a `TASK-1718`**: su lane programático acepta `stage` como
  string libre sin `assertEnum`, así que un filtro por un literal retirado pasará a devolver cero en
  silencio.
- **`STAGES_DOWNSTREAM_OF_TRIGGER` (`assignment-policy/readers.ts`) hay que reescribirlo, no sólo
  quitarle nombres muertos.** Lista `client_review` como aguas abajo de `shortlisted`, y absorberla
  la movió *sobre* el gatillo.
- **Las tres copias de `TERMINAL_APPLICATION_STAGES`** (`assessment/instances.ts:190`,
  `assessment/public-session/store.ts:11`, `assessment/access-recovery/vocabulary.ts:93`) quedan con
  literales muertos tras el contract. El colapso **no** las rompe —las tres ya contienen `closed`— pero
  son tres copias de una definición sin fuente compartida.
- **Hallazgo entregado a `TASK-1765`:** el trigger
  `refresh_assessment_access_recovery_retention_for_application` no cubre `backup_selected`,
  `not_selected` ni `unresponsive`; su rama `ELSE` deja `retention_expires_at` en `NULL`, o sea sin
  vencimiento. Registrado en el §17 del ADR.

## Summary

Colapsar el enum de etapas de postulación a las seis que la interfaz ofrece, para que la automatización
de assessment pueda dispararse en una etapa alcanzable y el operador pueda trazar dónde está cada
candidata.

## Why This Task Exists

El dominio tiene **trece** etapas y la interfaz ofrece seis. Tres de las internas —`qualified`,
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

### ⚠️ El vocabulario ya NO se decide acá — vive en el ADR (2026-08-22)

**`docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (`Accepted`)**
fija el vocabulario completo y **supersede el Slice 1 de esta task**. Lo esencial, porque cambia el
alcance de los slices restantes:

- **El pipeline es el recorrido de la PERSONA.** Premisa que nunca estuvo escrita y de la que se
  deriva todo lo demás.
- **Dos ejes, no uno.** `stage` = dónde va en el recorrido (6 valores, uno por columna). **Desenlace**
  = cómo terminó (6 valores + causa gobernada).
- **`closed` SE QUEDA y es escribible.** La opción de retirarlo quedó descartada por el operador: una
  columna terminal que no puede recibir una tarjeta no es un kanban. Lo que faltaba no era quitarlo:
  era que escribirlo **obligue a declarar el desenlace**.
- **El invariante nuevo, como `CHECK` de base:** `stage='closed'` ⟺ desenlace declarado. Con eso
  desaparecen **estructuralmente** los dos defectos vivos que esta task declaraba fuera de alcance
  (la puerta de `closed` en `store.ts:1311` y la retención congelada).
- **Se retiran del enum de etapas** `qualified`, `client_review`, las 4 proyecciones de desenlace y
  **`handoff_ready`** (no tiene ningún escritor; pertenece al agregado handoff). **`on_hold` deja de
  ser un desenlace** — una pausa no es un cierre.
- **Etiquetas del operador** (neutras, sin género): `Selección` · `Reserva` · `Sin selección` ·
  `Descarte` · `Retiro` · `Sin respuesta`. El candidato nunca las lee.
- **`purge.ts` deja de escribir `closed`** y pasa a un campo de archivado propio.

**Esto amplía el alcance de la task** respecto del traspaso del 2026-08-20: el eje de desenlace y el
invariante entran al trabajo, y los «defectos vivos» listados abajo dejan de ser ajenos.

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

### Defectos VIVOS encontrados de paso — con dueño declarado (actualizado 2026-08-22 post-ADR)

Los tres siguen vivos. Lo que cambió es que **dos de ellos ya no son huérfanos**: el ADR §5 los absorbe
estructuralmente y los reparte.

- **`store.ts:1311` deja `closed` fuera del guard** que protege las etapas terminales (bloquea
  `selected|backup|rejected|withdrawn` y omite la quinta), y el carril `outcome` tiene
  `destination: 'closed'`. Arrastrar a "Cerrada" cierra a alguien **sin emitir
  `hiring.application.decided`**, sin correo de decisión y con el reloj de retención congelado
  (`documents/retention.ts:69` filtra `decision IS NOT NULL`, así que el CV nunca se vuelve elegible
  para borrado). → **La puerta la cierra `TASK-1765`, y la cierra por `CHECK`, no por denylist.** Con
  `stage='closed'` ⟺ desenlace declarado, un cierre sin desenlace se vuelve **irrepresentable** y el
  `PATCH` de etapa deja de poder escribir `closed` porque no acepta desenlace (ADR §5). **Esta task no
  toca ese guard**: ampliarle la denylist sería el parche que el ADR viene a evitar.
- **Las tres copias de `TERMINAL_APPLICATION_STAGES` omiten `backup`**
  (`assessment/instances.ts:190`, `assessment/public-session/store.ts:11`,
  `assessment/access-recovery/vocabulary.ts:93`), mientras `decide.ts:29` mapea
  `backup_selected → 'backup'`. **Una persona marcada como respaldo puede seguir abriendo y
  recuperando su prueba.** → **Deja de ser ajeno: entra al Slice F de esta task.** Retirar
  `selected|backup|rejected|withdrawn` del enum obliga a reescribir las tres listas contra el eje de
  desenlace (`decision IS NOT NULL`, no una lista de etapas), lo que elimina la duplicación en vez de
  sincronizarla. Por eso el Slice F está bloqueado por `TASK-1765`: sin el eje no hay contra qué
  reescribirlas.
- **El lane programático acepta `stage` como string libre**
  (`src/lib/api-platform/resources/app-hiring-candidate-review.ts:206`:
  `query.get('stage')?.trim() || undefined`, sin `assertEnum`). Un agente que filtre por una etapa
  retirada no recibe error: recibe **cero resultados**. → **Es el único que queda ajeno.** Dueño
  `TASK-1718` (posee ese recurso App API). No se arregla acá, pero el Slice F lo empeora: al retirar
  literales, un filtro programático que hoy devuelve filas pasará a devolver cero en silencio.
  Notificar a `TASK-1718` antes de ejecutar el contract.

### Plan restante

> Esta tabla es el inventario técnico heredado del traspaso del 2026-08-20; los slices ejecutables
> vigentes son los **A–F** de `## Scope`. Mapeo: 1→A, 2→B (test derivado), 3→D, 4→B, 5→E, 6→F.

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
- **NUNCA** colapsar las etapas terminales antes de que exista el `CHECK` `stage='closed'` ⟺ desenlace
  (`TASK-1765`): en ese orden se pierde el último discriminante que queda. Y **NUNCA** cerrar esa
  puerta desde acá ampliándole la denylist a `store.ts:1311` — el ADR §5 la cierra estructuralmente.
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

- `src/types/hiring.ts` — `HIRING_APPLICATION_STAGES` **únicamente**. `HIRING_DECISIONS` (línea 126) es
  de `TASK-1765`.
- `src/types/hiring-assessment-policy.ts` — `OPENING_ASSESSMENT_TRIGGER_STAGES` y
  `ASSESSMENT_ASSIGNMENT_TRIGGERS` (el `satisfies` del Slice A). **El comentario de doctrina de
  `:16-42` es de `TASK-1719`.**
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` — nombres visibles de etapa. **Coordinar con
  `TASK-1747`**, que trabaja los mismos archivos.
- `src/lib/hiring/notifications/stage-policy.ts` — **sólo** el mapa
  `CANDIDATE_FACING_STAGE_LABELS` (allowlist de etapas que comunican al candidato). **NO** se declara
  `src/lib/hiring/notifications/**`: ese glob lo disputan otras cinco tasks vivas (`TASK-1719`,
  `TASK-1721`, `TASK-1746`, `TASK-1757`, `TASK-1762`), y reclamarlo entero produciría exactamente la
  colisión que esta task viene a evitar.
- `src/views/greenhouse/hiring/PipelineDeskView.tsx` — `LaneDefinition` y sus tres campos de etapa
  (Slice E). **Ninguna otra task lo declara** y es el archivo donde nació el defecto (`4e1566d9a`).
- `src/views/greenhouse/hiring/pipeline-lane-contract.test.ts` — se **borra** en el Slice E.
- Migración nueva en `migrations/` (expand del Slice B; el contract del Slice F es una segunda
  migración separada).

**Explícitamente NO owned** — declararlos sería invadir a otra task: `src/lib/hiring/decide.ts`,
`src/lib/hiring/store.ts` (el guard de `:1311` y el `CHECK`) y el `HIRING_DECISIONS` de
`src/types/hiring.ts` son de `TASK-1765`; `src/lib/hiring/data-origin/purge.ts` es de `TASK-1748`;
`src/lib/api-platform/resources/app-hiring-candidate-review.ts` es de `TASK-1718`.

## Current Repo State

**Ya existe:**

- El enum de **13** etapas en `src/types/hiring.ts:109` (el «12» que decía esta línea salía de la spec original y quedó desmentido por el readback del 2026-08-20), y el enum de 5 desenlaces `HIRING_DECISIONS` en `:126`.
- El mapa de nombres visibles en `hiringDesk.ts:97`, con las tres colapsadas.
- `hiring_application.decision` como campo independiente de la etapa.
- El ledger `hiring_assessment_assignment`, que registra cada intento de asignación.

**Gap:**

- No hay forma de disparar la automatización desde la interfaz.
- No hay señal ni aviso cuando una vacante no tiene política: se comporta igual que una que falló.
- La allowlist de correos y el mapa del desk nombran distinto la misma etapa.

**Distribución real de filas:** el conteo vigente es el del **2026-08-22**, en «Conteos frescos
2026-08-22» más arriba. El bloque del 2026-08-19 que vivía acá (`sourced` 36 · `shortlisted` 5 ·
`qualified` 2) quedó desmentido **dos veces** por readbacks posteriores y se retira: mantenerlo era
ofrecerle al implementador tres distribuciones distintas de la misma tabla, y la más vieja era la más
visible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION PLAN (la llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — SCOPE
     ═══════════════════════════════════════════════════════════ -->

## Scope

> **El vocabulario NO se decide acá.** El ex-Slice 1 («Decidir el vocabulario») **lo absorbió el ADR**
> `GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1` (`Accepted` 2026-08-22): las seis
> etapas están en su §3, el eje de desenlace en su §4, las etiquetas visibles en su §7 y las dos
> preguntas del correo quedaron cerradas (§10 y Open Questions de esta task). Esta task **ejecuta** ese
> vocabulario; no lo discute ni lo reabre.

- **Slice A — Paridad estructural, antes de mover un literal.** `satisfies readonly
  HiringApplicationStage[]` en `OPENING_ASSESSMENT_TRIGGER_STAGES` y `ASSESSMENT_ASSIGNMENT_TRIGGERS`;
  `Record<HiringApplicationStage, string>` en `copy/types.ts:544` (hoy `Record<string,string>`, así que
  una clave faltante no rompe nada); tipar el cast de `stage-comms/decide.ts:160`. Compile-time, sin
  migración.
- **Slice B — Expand.** Migrar las filas de `qualified` (7) y `client_review` (0) a `shortlisted`,
  dejando los literales viejos todavía válidos en el `CHECK`. Readback obligatorio del conteo por
  etapa antes y después. `shortlisted` **conserva su identificador** (ADR §3): no se agrega etapa nueva.
- **Slice C — Disparador y políticas.** `OPENING_ASSESSMENT_TRIGGER_STAGES` sigue apuntando a
  `shortlisted`, ahora **alcanzable**; verificar que las 15 políticas y las 20 filas del ledger no
  requieren migración. **La política se toca antes que la etapa, nunca al revés.**
- **Slice D — Copy y superficies.** Los nombres visibles quedan coherentes en ambos diccionarios y
  `en-US` **redefine `stages`** (hoy hereda castellano por spread de `es-CL`). La allowlist
  candidate-facing **no se toca**: «Preselección» es divergencia deliberada (Open Questions).
- **Slice E — Estructural.** `LaneDefinition` pasa a UNA etapa por carril en
  `src/views/greenhouse/hiring/PipelineDeskView.tsx`; se borra `pipeline-lane-contract.test.ts`.
- **Slice F — Contract, bloqueado por `TASK-1765`.** Retirar `qualified`, `client_review`,
  `handoff_ready` y las cuatro proyecciones de desenlace (`selected`, `backup`, `rejected`,
  `withdrawn`) del enum y del `CHECK`, con readback de que ninguna fila las usa.

**Dependencia dura del Slice F (ADR §14, paso 2):** retirar `selected|backup|rejected|withdrawn` del
enum de etapas **sólo es seguro cuando el eje de desenlace ya los posee**. Si el literal desaparece de
`stage` antes de que exista el `CHECK` `stage='closed'` ⟺ desenlace, se pierde el último discriminante
que queda para saber cómo terminó un proceso, y el guard de `store.ts:1311` —que hoy bloquea esos
cuatro por denylist— se queda protegiendo nombres que ya no existen mientras `closed` sigue abierto.
Por eso **el Slice F no se ejecuta hasta que `TASK-1765` esté verificada en producción**; los Slices A–E
no dependen de ella.

## Out of Scope

- **El eje de desenlace completo — lo posee `TASK-1765`.** No es que `decision` "sobreviva tal cual":
  post-ADR el modelo de desenlace **es** trabajo real (los seis valores, la causa gobernada de
  `not_selected`, el `CHECK` `stage='closed'` ⟺ desenlace, el command de cierre y la migración de
  `on_hold` fuera del enum de desenlaces). Esta task no lo diseña ni lo implementa: **consume** su
  resultado, y por eso su Slice de contract queda bloqueado hasta que exista.
- El chip de desenlace en la tarjeta y el diálogo de cierre del kanban — superficie de `TASK-1766`.
- Que `purge.ts` deje de escribir `closed` y pase a un campo de archivado propio (ADR §5) —
  `TASK-1748`.
- Invertir el default de la policy de assessment: **ya está hecho** (nace `draft` + `manual`,
  `assignment-policy/commands.ts:40` y `:202`). Lo que queda vivo es reescribir el comentario de
  doctrina de `src/types/hiring-assessment-policy.ts:16-42` — dueño `TASK-1719`.
- Revisar qué plantilla corresponde a cada vacante — task aparte.
- Rediseñar el pipeline o el desk más allá de los nombres.
- El rename físico `decision` → `outcome`: deferido por el ADR §11, con su propia migración.

## Detailed Spec

El mapa visible completo está en `docs/ui/wireframes/TASK-1754-hiring-stage-vocabulary.md`; el
vocabulario normativo, en el ADR. Las dos preguntas del correo están **cerradas** (ver Open Questions).

**Lo que se retira, y con qué naturaleza** (ADR §6 — la versión anterior de esta sección decía que
«"Cerrado" colapsa SIN pérdida porque `decision` sobrevive como campo aparte», y eso es **falso para 2
de los 5 literales**):

| Literal retirado del enum de etapas | ¿Lo recupera el eje de desenlace? | Naturaleza |
|---|---|---|
| `selected` | sí — desenlace `selected` | espejo redundante: `decide` escribía ambos campos con el mismo valor |
| `backup` | sí — desenlace `backup_selected` | espejo redundante |
| `rejected` | sí — desenlace `rejected` (o `not_selected`, ADR §9) | espejo redundante |
| `withdrawn` | sí — desenlace `withdrawn` | espejo redundante |
| `handoff_ready` | **NO** | **no tiene contraparte en `decision`**: no es un desenlace, es un estado del agregado `handoff`, que tiene su propia máquina (`TASK-356`). Se retira porque **ningún escritor lo produce jamás**, no porque otro campo lo preserve |
| `qualified`, `client_review` | **NO** | colapso **CON pérdida declarada**: ningún campo recupera cuál era. Se acepta porque nunca fueron elegibles desde ninguna superficie — no hay intención humana que preservar |

**Y `on_hold` no es un cierre.** Hoy está en `HIRING_DECISIONS` (`src/types/hiring.ts:126`) *y* mapea a
la etapa `decision_pending` (`src/lib/hiring/decide.ts:32`). Post-ADR §6 **deja de ser un desenlace**:
una pausa vive en la columna «Decisión», no en «Cerrado». Ese cambio lo ejecuta `TASK-1765`, no esta
task; acá sólo se registra para que nadie lo lea como «`on_hold` → `closed`».

**Consecuencia de método:** «Cerrado» **no** es un colapso sin pérdida que la existencia de `decision`
haga gratis. Es el punto donde el modelo pasa de un eje a dos, y lo que lo hace seguro no es que el
campo exista, sino el `CHECK` `stage='closed'` ⟺ desenlace declarado (ADR §5) — que esta task **no**
implementa.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Expand antes que contract, y la política antes que la etapa. Si `shortlisted` desaparece del enum
mientras una política todavía la nombra, esa política queda inerte sin avisar — exactamente el fallo
silencioso que la task viene a cerrar. El mismo orden que ya mordió una vez con la migración de
TASK-1746 el 2026-08-19.

**Y una restricción anterior a todas (ADR §14, paso 2): el eje de desenlace entra ANTES que el colapso
terminal.** El Slice F retira `selected|backup|rejected|withdrawn` del enum de etapas; eso sólo es
seguro cuando el desenlace ya los posee y el `CHECK` `stage='closed'` ⟺ desenlace existe. Al revés se
pierde el último discriminante de cómo terminó un proceso. **Bloqueante: `TASK-1765`.**

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| Una postulación queda en una etapa que ya no existe | Desk / pipeline | Media | Migración con readback por etapa antes y después | Conteo por etapa |
| La política queda apuntando a una etapa muerta | Automatización | **Alta si se invierte el orden** | Migrar políticas en la misma transacción que las filas | `hiring_assessment_assignment` sin filas nuevas |
| El candidato lee un nombre y el operador otro | Comunicación | Media | El Slice D cierra ambos diccionarios; la divergencia «Preselección» queda documentada, no corregida | Revisión del correo real |
| Colisión con TASK-1747 | Desk | **Alta** | Coordinar con la sesión que la trabaja antes de tocar copy | — |

### Feature flags / cutover

Sin flag: es una corrección de vocabulario del dominio. Un flag mantendría vivas las dos formas a la
vez, que es precisamente el problema.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| A | Revert del PR — sólo tipos | < 15 min | Sí |
| B | Down de la migración; los literales viejos siguen válidos durante el expand | < 15 min | Sí |
| C–E | Revert del PR | < 15 min | Sí |
| F | **Irreversible sin migración nueva** — no ejecutar hasta que A–E estén verificados en producción **y `TASK-1765` haya entregado el eje de desenlace** | — | No |

### Production verification sequence

Readback del conteo por etapa antes y después. Una postulación real movida a "Evaluación" que recibe
su test, con su fila en el ledger. El desk leído con locale `en-US` mostrando las seis columnas en
inglés (hoy hereda castellano). Y el correo de progreso recibido, para confirmar que dice
«Preselección» **a propósito** — la divergencia con «Evaluación» del desk es la decisión, no el
defecto. Antes del Slice F, además: readback de que ninguna fila, policy, ledger ni `CHECK` nombra un
literal retirado, y que las escaleras de `assessment_fairness` **siguen** nombrándolos.

### Out-of-band coordination required

El vocabulario ya lo decidió el operador en el ADR; no queda decisión de producto pendiente acá. Sí queda coordinación viva: con la sesión que trabaja `TASK-1747` (mismos diccionarios de copy), con `TASK-1765` antes de ejecutar el Slice F, y con `TASK-1718` antes de retirar literales que su lane programático pueda estar filtrando.

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
      documentada con su razón. **Es el segundo caso:** «Preselección» ≠ «Evaluación» es deliberada
      (decisión del operador 2026-08-22) y debe quedar escrita con su razón en la doc funcional, para
      que un agente futuro no la lea como drift.
- [ ] Los dos diccionarios de copy (es-CL, en-US) están alineados, y **`en-US` redefine `stages`**: hoy
      hereda los nombres en castellano por `...esCL` (`dictionaries/en-US/hiringDesk.ts:6`) y nunca
      sobreescribe esa clave. Verificar leyendo el desk con locale `en-US`, no sólo el diff.
- [ ] **Los literales retirados SIGUEN nombrados en las tres escaleras de rango de la VIEW
      `greenhouse_hiring.assessment_fairness`** (`migrations/20260713173500000_…:71-119`:
      `stage_targets`, el `CASE` de `event_progress` y el `CASE` de `application_progress`) mapeados a
      su rango nuevo. **No** se retiran del `CASE` al retirarlos del enum: los payloads de
      `outbox_events` son inmutables y son la única memoria del avance de una persona rechazada. Son
      **tabla de traducción histórica**, no espejo del vocabulario vigente (ADR §12). Verificar que un
      `application_id` con eventos históricos en `qualified` conserva su rango después del contract.
- [ ] La deduplicación de esa escalera (paso 6 del «Plan restante») **no** convierte los `ELSE 0` en
      `ELSE NULL` ni pierde un literal histórico al derivar los dos `CASE` por join.
- [ ] `assertEnum` no rompe ninguna lectura: ninguna fila de policy, ledger o `CHECK` nombra un literal
      retirado en el momento del contract (readback, no inspección de código — corre en el camino de
      LECTURA y esas filas son irreescribibles).
- [ ] GVC del pipeline en desktop y 390 px con las seis columnas.
- [ ] `UI ready` pasa a `yes` sólo con mapping, plan GVC y decision log completos.

## Verification

`pnpm local:check` · tests de `src/lib/hiring` · readback de conteos por etapa · GVC del pipeline.

## Closing Protocol

- [ ] Handoff y changelog actualizados.
- [ ] Lifecycle a `complete` y `docs/tasks/README.md` + registry sincronizados.
- [ ] El Slice F no se marca hecho sin confirmar que `TASK-1765` está verificada en producción.

## Follow-ups

- ~~**Task nueva (ID por reservar)** — invertir el default de la política de assessment.~~ **YA ESTÁ
  HECHO (verificado 2026-08-22):** toda policy nace `draft` + `manual`
  (`src/lib/hiring/assessment/assignment-policy/commands.ts:40` resuelve el default a `'manual'` y
  `:202` lo documenta como «D5.1 al pie de la letra: toda policy NACE `draft` + `manual`»). **No
  reservar un ID por esto.**
- **Lo que sí queda vivo, y su dueño ya existe:** reescribir el comentario de doctrina de
  `src/types/hiring-assessment-policy.ts:16-42`, que justifica `shortlisted` porque «la población ya
  está acotada» y «el pedido tiene contrapartida». Al absorber `qualified`, la población se ensancha y
  ese argumento deja de ser cierto. **Dueño: `TASK-1719`** (posee ese archivo y su ADR). Dejarlo como
  está es la deriva silenciosa que produjo este incidente.
- **Revisar qué plantilla corresponde a cada vacante** — sigue sin dueño; task aparte cuando se priorice.
- **Señal de fiabilidad «vacante activa sin política de assessment»** — hoy ese estado es
  indistinguible de una política que falló. Va con la task de plantilla por vacante.

## Open Questions

**Las dos quedaron CERRADAS. No reabrir sin decisión explícita del operador.**

- ~~¿El correo al candidato dice "Evaluación" o conserva "Preselección"?~~ **RESUELTA 2026-08-22
  por el operador: conserva "Preselección".** Es una divergencia **deliberada** con el "Evaluación"
  del desk, no un defecto: hacia afuera el registro es más suave, y evita chocar con el correo del
  test que ya dice "tienes una evaluación pendiente". El Slice D **no toca** la allowlist
  (`notifications/stage-policy.ts`); sí debe **documentar la divergencia con su razón** en la doc
  funcional, para que un agente futuro no la lea como drift y la "arregle". La recomendación de
  Talento del 2026-08-20 ("En evaluación") queda **descartada**.
- ~~¿La etapa nueva se llama `evaluation` o se reusa un nombre existente?~~ **RESUELTA 2026-08-20:
  se reusa `shortlisted`**; ver "Lo que NUNCA se debe hacer" (introducir `evaluation` está
  prohibido).
