# TASK-1384 — Assessment Question Bank V1 (contenido SME, work-sample-first)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency|hr`
- Blocked by: `none`
- Branch: `task/TASK-1384-assessment-question-bank-sme-v1`
- Legacy ID: `follow-up declarado de TASK-1360 (sin dueño hasta hoy)`
- GitHub Issue: `none`

## Summary

Poblar el banco de preguntas del Assessment Engine con **contenido real, work-sample-first, validado por SMEs** (expertos por skill), para las competencias y roles prioritarios de Efeonce — usando el pipeline gobernado que ya existe (autoría → `sme_review` → `active`, con drafting asistido por IA opcional vía propose→confirm). Un motor íntegro con banco vacío no mide nada: esta task es la que convierte la maquinaria (1360/1361/1383) en un instrumento de selección real.

## Why This Task Exists

La auditoría 2026-07-10 identificó el banco de preguntas como **la brecha más grande del programa sin dueño**: existen 16 competencias sembradas y UNA plantilla (Account Manager L2) con banco casi vacío. TASK-1360 lo dejó como follow-up genérico ("requiere SME por skill"). La evidencia de selección (Sackett 2022, skill `greenhouse-talent-people-operator`) es inequívoca: work samples + entrevista estructurada son los predictores más fuertes — la calidad del contenido ES la validez del instrumento. Además, 1364 (validity loop) va a correlacionar contra este contenido: mientras antes exista contenido estable y versionado (garantizado por la inmutabilidad de TASK-1383), antes empieza a acumular evidencia útil.

## Goal

- Matriz de cobertura V1: qué competencias × niveles necesitan preguntas, priorizadas por los roles reales de Efeonce que se contratan primero.
- Guía de autoría work-sample-first para SMEs (es-CL): qué es una buena pregunta, tipos, rúbricas, sesgos a evitar.
- Banco poblado y ACTIVO (pasó `sme_review`) para las competencias del primer lote de roles.
- Plantillas de assessment por rol prioritario (además de Account Manager L2).
- Reporte de cobertura verificable (`pnpm hiring:question-bank-coverage`) para que "banco listo" sea binario, no opinión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Invariantes Assessment: answer_key nunca candidate-facing; score advisory; IA propone/humano confirma; **templates inmutables una vez usados — TASK-1383**: el banco nace versionable)
- `.claude/skills/greenhouse-talent-people-operator/references/assessment-interviewing.md` (doctrina work-sample-first, validez, adverse impact)
- `docs/operations/EFEONCE_OPERATING_CODE_V1.md` (competencias actitudinales = comportamiento observable, no "culture fit" difuso)

Reglas obligatorias:

- **NUNCA** activar una pregunta sin pasar por `sme_review` (gate existente `transitionQuestionStatus`, ahora con actor auditable).
- **NUNCA** contenido que sea proxy de clase protegida (edad, género, origen) ni "fit" difuso — todo job-related y anclado a comportamiento/artefacto.
- Preguntas IA-drafted son BORRADOR: el SME confirma vía el propose→confirm de 1361 (o autoría manual); el LLM nunca activa contenido.
- Bilingüe es-CL primero; en-US solo si el rol lo exige (candidatos internacionales).

## Normative Docs

- `docs/tasks/complete/TASK-1360-assessment-engine-foundation.md` (writers canónicos + seed de 16 competencias)
- `docs/tasks/complete/TASK-1361-assessment-ai-assist.md` (drafting asistido propose→confirm)
- `docs/tasks/complete/TASK-1383-assessment-engine-hardening-pre-1363.md` (inmutabilidad/versionado de templates)
- `docs/context/09_marca-agencia.md` + skill `efeonce-agency` (roles reales: Account, Design, Media, Strategy, Dev)

## Dependencies & Impact

### Depends on

- Motor + gates: TASK-1360/1361/1383 (complete). Ninguna dependencia de código pendiente.
- **Out-of-band crítico: disponibilidad de SMEs por skill** (People Ops coordina; el agente prepara borradores/tooling, el humano valida).

### Blocks / Impacts

- **TASK-1363**: la superficie de rendición sin banco real solo puede demo-ear.
- **TASK-1364**: el validity loop correlaciona contra este contenido — mientras más tarde, más tarde empieza la evidencia.
- Contrataciones reales del programa Hiring (calidad de la señal del assessment).

### Files owned

- `docs/documentation/hr/assessment-question-authoring-guide.md` (guía SME, nueva)
- `scripts/hiring/question-bank-coverage.ts` (reporte de cobertura, nuevo) + entrada `package.json`
- Contenido en DB vía writers canónicos (`createQuestion`/`transitionQuestionStatus`/`createTemplate`) — NUNCA SQL directo ni migraciones de contenido
- `docs/tasks/to-do/TASK-1363-assessment-taking-review-surface.md` (delta al cerrar)

## Current Repo State

### Already exists (verificado por la auditoría 2026-07-10)

- 16 competencias sembradas (attitudinal|aptitude|skill × nociones|intermedio|avanzado) + template `atpl-account-manager-l2`.
- Pipeline de autoría completo: `createQuestion` (nace `draft`), `transitionQuestionStatus` (SME gate `draft→sme_review→active→retired`, actor auditable), tipos `single_choice|multi_choice|likert|situational|open_text` con answer_key/rubric separados.
- Drafting IA: `proposeQuestionsForCompetency` (flag `HIRING_ASSESSMENT_AI_ENABLED`, hoy OFF) + confirm que reusa el author canónico.
- API interna `/api/hiring/assessments/questions|templates` con capabilities `hiring.assessment.author/read`.

### Gap

- Banco de preguntas ~vacío (solo lo mínimo de seeds/tests); ninguna pregunta `active` de contenido real.
- Sin matriz de cobertura ni criterio binario de "banco listo".
- Sin guía de autoría para SMEs (calidad dispareja garantizada sin ella).
- Una sola plantilla de rol; faltan las de los roles que Efeonce contrata (Design, Media, Strategy, Dev, según prioridad comercial).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `contenido en DB vía writers de src/lib/hiring/assessment/** + docs/ + scripts/hiring/`
- Future candidate home: `remain-shared`
- Boundary: `dominio hiring/assessment existente; esta task NO agrega schema ni API — solo contenido gobernado + tooling de lectura`
- Server/browser split: `server-only (script CLI + docs)`
- Build impact: `nulo`
- Extraction blocker: `ninguno`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION LOG (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Matriz de cobertura + priorización por rol

- Con `greenhouse-talent-people-operator` + `efeonce-agency`: mapear los roles que Efeonce contrata primero (señal real: demanda del pipeline + prioridad comercial) → qué competencias × niveles necesita cada uno → target de preguntas por celda (mínimo defendible: 3-5 activas por competencia×nivel usado, mezclando tipos, work-sample/situational primero).
- La matriz vive en la guía (doc), versionada; el reporte del Slice 2 la lee como criterio.

### Slice 2 — Guía de autoría SME + reporte de cobertura

- `docs/documentation/hr/assessment-question-authoring-guide.md`: qué es work-sample-first, anatomía de una buena pregunta por tipo, cómo escribir answer_key/rubric contestables, sesgos prohibidos (proxies de clase protegida, culture-fit difuso), ejemplos buenos/malos por categoría (attitudinal vía Operating Code = comportamiento observable).
- `scripts/hiring/question-bank-coverage.ts` (+ `pnpm hiring:question-bank-coverage`): lee el banco real y reporta cobertura vs matriz — celdas verdes/rojas, preguntas en `draft`/`sme_review` estancadas. Es el criterio binario de cierre.

### Slice 3 — Drafting del primer lote (agente + IA asistida u autoría manual)

- Para las competencias del lote 1: generar borradores work-sample-first (vía propose IA con flag en staging SI el eval baseline corrió verde; si no, autoría directa del agente con la skill de talento como SME-proxy de BORRADOR) → todas quedan en `draft`/`sme_review`, NUNCA activas sin humano.
- Cada borrador declara: competencia, nivel, tipo, rúbrica contestable, y por qué es job-related.

### Slice 4 — SME review + activación + plantillas por rol (out-of-band humano)

- People Ops coordina la revisión por SME de skill; activación vía `transitionQuestionStatus` (actor queda auditado).
- Crear las plantillas de los roles del lote 1 (`createTemplate` — nacen versionadas e inmutables al primer uso).
- Cierre del slice = reporte de cobertura verde para el lote 1.

## Out of Scope

- UI de autoría/review (la API + desk existentes bastan; UI dedicada si el volumen lo pide → follow-up).
- La superficie de rendición (1363), validity (1364), fairness (1365).
- Flip del flag IA (gate del operador: eval baseline + sign-off — puede ocurrir en paralelo y acelera el Slice 3, pero no bloquea: hay autoría manual).
- Traducción en-US completa del banco (solo roles que lo exijan).

## Detailed Spec

El pipeline técnico ya existe entero — esta task es **contenido gobernado + criterio de cobertura**. Doctrina de calidad (skill de talento): work samples > situational > knowledge checks; cada pregunta anclada a comportamiento o artefacto del rol real; rúbricas que un segundo corrector aplicaría igual (inter-rater); attitudinal SIEMPRE vía comportamientos del Operating Code (transparencia/educación/memoria/impacto/sistema), nunca afinidad. La inmutabilidad de TASK-1383 garantiza que el contenido activado queda congelado para el validity loop: retirar y versionar, nunca editar.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Matriz (S1) → guía + reporte (S2) → drafting (S3) → review humano + activación (S4). NUNCA activar contenido sin SME (el gate lo fuerza; la regla es no puentearlo con seeds/SQL).

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Contenido activado sin revisión experta real (rubber-stamp) | calidad | Media | guía con ejemplos + actor auditado + spot-check de People Ops | audit del SME gate |
| Preguntas proxy de clase protegida | legal/fairness | Baja | checklist de sesgos en la guía + review 1365-aware | revisión legal 1365 |
| Drafting IA con flag OFF bloquea el lote | operación | Media | autoría manual del agente como camino primario; IA es acelerador | — |
| SMEs sin disponibilidad → task estancada | operación | Alta | lote 1 acotado a 1-2 roles; People Ops agenda antes del S3 | coverage report estancado en sme_review |

### Feature flags / cutover

N/A — contenido vía writers gobernados; sin flag propio. (El propose IA usa el flag de 1361 si está disponible.)

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-2 docs/script | revert PR | ~min | Sí |
| 3-4 contenido | `retired` vía el gate (nunca DELETE) | ~min | Sí (append-only) |

### Production verification sequence

`pnpm hiring:question-bank-coverage` verde para el lote 1 → plantillas de rol creadas → smoke de asignación con una plantilla nueva (assign → resolve → buildPublicQuestion sin leak).

### Out-of-band coordination required

- **People Ops**: agendar SMEs por skill del lote 1 ANTES del Slice 3 (riesgo #4).
- Opcional acelerador: correr eval baseline IA + flip staging del flag de 1361.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Matriz de cobertura V1 documentada (roles lote 1 × competencias × niveles × target).
- [ ] Guía de autoría SME publicada en `docs/documentation/hr/` (work-sample-first + sesgos + ejemplos).
- [ ] `pnpm hiring:question-bank-coverage` existe y reporta contra la matriz.
- [ ] Lote 1: cobertura verde — preguntas `active` (pasaron `sme_review` con actor humano real) para todas las celdas target.
- [ ] ≥1 plantilla nueva de rol creada y asignable (smoke: assign → resolve → payload candidato sin answer_key).
- [ ] Cero preguntas activadas por seed/SQL directo (todo vía writers gobernados).

## Verification

- `pnpm hiring:question-bank-coverage` (criterio binario) · `pnpm lint` · `pnpm test` (focal dominio)
- Audit del SME gate: cada activación con `status_changed_by` humano real
- `pnpm qa:gates --changed` + `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle/carpeta sync; README + TASK_ID_REGISTRY; Handoff + changelog.
- [ ] `## Delta` a TASK-1363 (banco real disponible para la superficie) y a TASK-1364 (contenido estable acumulando datos).
- [ ] Guía enlazada desde el manual de uso HR correspondiente.

## Follow-ups

- Lotes 2+ de roles según demanda del pipeline.
- UI de autoría/review dedicada si el volumen lo justifica.
- Versión en-US para roles con candidatos internacionales.
