# TASK-1756 — El expediente de IA recomienda sobre media evidencia sin decirlo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-011`
- Status real: `Diseño — detectado en uso real el 2026-08-19 por el operador`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El expediente de evaluación generado por IA se arma con dos fuentes: el CV y el assessment. Si falta
el CV, falla honesto y no genera nada. Si falta el assessment, **genera igual** con la sección de
evaluación vacía y no lo declara en ninguna parte. El operador recibe una narrativa que parece un
análisis completo de la persona y en realidad es una lectura de currículum.

## Why This Task Exists

Caso real del 2026-08-19: el operador generó el expediente de una candidata mientras su run de
scoring seguía atascado en `awaiting_review` (causa corregida aparte). Leyó la recomendación y notó
por su cuenta que la IA no había contrastado el CV contra las respuestas del test. Nada en la
pantalla ni en el texto se lo advirtió.

La asimetría está escrita en el código:

- CV ausente, pendiente o en cuarentena → `throw cvNotReady(...)`, error `hiring_dossier_cv_not_ready`
  (`packet.ts:77-123`). Bloquea.
- Assessment sin `status = 'scored'` → las dos queries filtran por ese estado
  (`packet.ts:144`, `packet.ts:165`), devuelven cero filas, y el packet se retorna **exitosamente**
  con `assessment.responses = []` y `assessment.competencyResults = []` (`packet.ts:186-190`).

Y el guardia existe, pero sólo en un camino: `autoProposeEvaluationDossier` verifica
`hasScoredAssessment` y devuelve `waiting_for_assessment` (`auto-propose.ts:15-36`). El camino
MANUAL —el que usa el operador desde la ficha— llama `assembleEvaluationDossierPacket` directo, sin
ese chequeo (`propose.ts:42`). O sea: la automatización sabe esperar y la persona no.

Esto no es cosmético. El expediente alimenta una decisión de contratación sobre una persona real, y
un sistema de scoring de candidatos es de alto riesgo bajo el AI Act: emitir una recomendación
construida sobre la mitad de la evidencia, presentada como si fuera completa, es exactamente el modo
de falla que la trazabilidad del dominio existe para impedir.

## Goal

Que el expediente NUNCA presente como completo un análisis que no lo es: o espera a tener las dos
fuentes, o declara en su propia superficie qué le faltó.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`

Reglas obligatorias:

- El expediente es una PROPUESTA: el LLM no decide ni materializa nota por sí solo. Esta task no
  cambia eso.
- La degradación honesta es el patrón del dominio: un vacío real y un dato faltante NUNCA se
  renderizan igual.
- El copy visible sale de `src/lib/copy/*`, nunca literal en JSX.

## Normative Docs

- `docs/tasks/complete/TASK-1737-hiring-application-dossier.md`
- `docs/tasks/to-do/TASK-1752-assessment-ai-run-settled-not-closed-signal.md` — la causa por la que
  el assessment se quedó sin `scored` en el caso fuente

## Dependencies & Impact

### Depends on

- `src/lib/hiring/dossier-ai/packet.ts`
- `src/lib/hiring/dossier-ai/propose.ts`
- `src/types/hiring-dossier-ai.ts`

### Blocks / Impacts

- Ninguna task depende de ésta.
- Toca el mismo módulo que TASK-1737; coordinar si vuelve a estar activa.

### Files owned

- `src/lib/hiring/dossier-ai/packet.ts`
- `src/lib/hiring/dossier-ai/propose.ts`
- El copy del panel del expediente y sus tests

## Current Repo State

### Already exists

- El guardia correcto, ya escrito: `hasScoredAssessment` en `auto-propose.ts:15-27`.
- Falla honesta como precedente: `cvNotReady` con estado explícito (`unavailable`/`pending`/`blocked`)
  en el propio error (`packet.ts:77-84`).
- `computeDossierInputDigest` incluye el packet, así que un expediente regenerado CON assessment
  produce un digest distinto y sí crea propuesta nueva: el arreglo no queda atrapado por la
  idempotencia.

### Gap

- El camino manual no verifica que exista assessment con `scored`.
- El packet no declara qué fuentes traía. Un consumidor no puede distinguir "esta persona no rindió
  test" de "el test existe pero todavía no está corregido".
- Ni la propuesta ni el panel dicen sobre qué evidencia se construyó la recomendación.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring/dossier-ai/`
- Future candidate home: `remain-shared`
- Boundary: generador de propuestas del expediente; consumidores son la ruta del dossier y el panel.
- Server/browser split: el ensamblado es server-only; al cliente sólo baja la propuesta ya resuelta.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

- Backend rigor: `backend-critical`
- Source of truth: `greenhouse_hiring.hiring_assessment` y sus respuestas.
- Contract surface: el packet gana una declaración de cobertura, el schema estructurado de salida la
  refleja, y el error del camino manual gana un código nuevo si se decide bloquear.
- Data invariants: el expediente NUNCA se presenta como completo sin declarar sus fuentes.
- Tenant/access boundary: sin cambios.
- Idempotencia/concurrencia: el digest ya cubre el cambio de packet; verificar que la declaración de
  cobertura entre al digest para que un expediente parcial no se reuse como si fuera completo.
- Migración/backfill/rollback: evaluar si las propuestas parciales ya emitidas necesitan marcarse.
- Datos sensibles: ninguno nuevo. La declaración de cobertura es metadata, no contenido.
- Audit/signal posture: considerar una señal para expedientes emitidos sin assessment.
- Runtime evidence: reproducir con una candidatura cuyo assessment no esté `scored`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Lo completa el agente que TOMA la task, no quien la crea.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Declarar la cobertura.** El packet expone qué fuentes trae y en qué estado, con la
  misma granularidad que ya tiene el CV. Un consumidor debe poder distinguir "no rindió test" de
  "el test está sin corregir".
- **Slice 2 — Decidir la política del camino manual.** Bloquear como el CV, o permitir con
  declaración explícita. Documentar el criterio; hoy la inconsistencia entre camino manual y
  automático no está declarada en ningún lado.
- **Slice 3 — Decirlo donde se lee.** La declaración de cobertura viaja en la SALIDA del expediente
  (schema estructurado + prompt), no en la pantalla: un expediente se copia, se exporta y se pega en
  un correo, y un badge de la interfaz se queda atrás. Sin JSX nuevo — por eso esta task es
  `UI impact: none`. Un indicador adicional en el panel es follow-up, no sustituto.

## Out of Scope

- Cambiar el MODELO del expediente ni el criterio de evaluación del prompt. El prompt sí se toca,
  pero sólo para que la salida declare su cobertura: nada de lo que la IA juzga cambia.
- Agregar un indicador en el panel del expediente. Es follow-up: la declaración que importa viaja en
  el texto porque es la que sobrevive a copiar y pegar.
- Arreglar por qué el assessment se quedó sin `scored` (es TASK-1752 y el fix de `c7474b068`).
- El camino automático, que ya espera correctamente.
- Materializar nota automáticamente: el expediente sigue siendo propuesta.

## Detailed Spec

La decisión real es el Slice 2. Bloquear es lo más seguro y es coherente con el CV, pero hay un caso
legítimo donde el expediente CV-only sirve: descartar temprano a alguien cuyo currículum no cumple
requisitos duros, sin gastarle un test. Si se permite, la declaración tiene que viajar dentro del
propio texto de la recomendación y no sólo como badge de la pantalla — un expediente se copia, se
exporta y se pega en un correo, y la advertencia se queda atrás.

## Rollout Plan & Risk Matrix

Cambio de command sin migración. Rollout ordinario. El blast radius es acotado: el expediente ya es
propuesta y ningún efecto downstream depende de él.

### Slice ordering hard rule

- Slice 1 va antes que Slice 3: la salida no puede declarar una cobertura que el packet no computa.
- Slice 2 puede ir en paralelo al 1, pero se decide ANTES de escribir el copy del 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Bloquear rompe el caso legítimo de descarte temprano por CV | Hiring | Media | El Slice 2 decide con el criterio escrito, no por defecto técnico | Reclamo del operador |
| La advertencia se pierde al copiar el expediente | Hiring | Alta | La declaración viaja en el texto, no sólo en el badge | Revisión del artefacto real |
| Los expedientes parciales ya emitidos quedan sin marcar | Hiring | Media | El Slice 1 decide si se marcan o se dejan expirar | Conteo de propuestas activas |

### Feature flags / cutover

Ninguno propio. El dominio ya tiene su flag de habilitación.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert del commit | minutos | sí |
| 2 | revert del commit | minutos | sí |
| 3 | revert del commit | minutos | sí |

### Production verification sequence

1. Generar el expediente de una candidatura cuyo assessment no esté `scored` y confirmar el
   comportamiento elegido.
2. Corregir el assessment, regenerar y confirmar que el expediente completo sí se produce.
3. Revisar el artefacto real, no el JSON: leerlo como lo lee el operador.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El packet declara qué fuentes trae y en qué estado.
- [ ] "No rindió test" y "el test está sin corregir" son distinguibles.
- [ ] El camino manual y el automático tienen la MISMA política declarada, o su diferencia está
      documentada con criterio.
- [ ] Si se permite el expediente parcial, la advertencia viaja dentro del texto y sobrevive a
      copiar y pegar.
- [ ] El criterio de evaluación del prompt no cambió: sólo se agregó la declaración de cobertura.
- [ ] La declaración de cobertura entra al digest: un expediente parcial no se reusa como completo.
- [ ] Reproducido contra datos reales, leyendo el artefacto como lo lee el operador.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/hiring/dossier-ai`
- Generación real contra una candidatura sin assessment corregido

## Closing Protocol

- [ ] Lifecycle y ubicación del archivo reflejan estado real.
- [ ] README y registry sincronizados.
- [ ] Handoff y changelog registran la evidencia runtime.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` pasan al cierre.

## Follow-ups

- Señal de reliability para expedientes emitidos sin assessment corregido, si el Slice 2 decide
  permitirlos.
- Indicador de cobertura en el panel del expediente, como refuerzo visual de la declaración que ya
  viaja en el texto.

## Open Questions

- ¿El expediente CV-only es un caso de uso legítimo (descarte temprano por requisitos duros) o
  siempre es un error? La respuesta define el Slice 2 y la escribe People Ops, no el implementador.
