# TASK-1754 — Las etapas del dominio son las que el operador puede elegir

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
- UI impact: `copy`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1754-hiring-stage-vocabulary.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Diagnóstico verificado contra runtime; decisión de dirección aprobada por el operador`
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

- ¿El correo al candidato dice "Evaluación" o conserva "Preselección" a propósito? **Lo decide el
  Slice 1 y afecta al Slice 4.**
- ¿La etapa nueva se llama `evaluation` o se reusa uno de los tres nombres existentes? Reusar
  `shortlisted` ahorra migrar 5 filas pero conserva un nombre que no coincide con lo que se ve.
