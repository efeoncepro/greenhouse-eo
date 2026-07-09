# TASK-1370 — Nexa Voice V1 Runtime Alignment

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|ai|content`
- Blocked by: `none`
- Branch: `task/TASK-1370-nexa-voice-v1-runtime-alignment`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Implementar **Nexa Voice System V1** en el prompt runtime versionado de Nexa, sin romper las politicas actuales de Knowledge, datos vivos, citas, temas sensibles ni formato de respuesta.

La task debe llevar el canon verbal documentado a `src/lib/nexa/nexa-system-prompt.ts`, bumpear la version del prompt, actualizar snapshot/gobernanza/docs y agregar cobertura de QA para que Nexa hable consistentemente como "criterio tranquilo en movimiento".

## Why This Task Exists

Nexa ya tiene identidad, rostro, branding y sistema verbal canonico en `docs/architecture/nexa-intelligence/voice/`. Sin embargo, el prompt runtime actual solo esta **parcialmente alineado** con Nexa Voice V1. Esto deja un gap operativo: agentes y docs saben como debe sonar Nexa, pero el chat productivo todavia no fuerza literalmente las 4 A, los modos conversacionales, la fraseologia propia ni los limites de humanidad.

El cambio debe hacerse como evolucion versionada del prompt, no como parche editorial suelto.

## Goal

- Incorporar Nexa Voice V1 al `voiceContract`/estructura runtime del prompt V2.
- Bumpear `NEXA_SYSTEM_PROMPT_V2_VERSION` como cambio clase `voice`, con changelog de governance append-only.
- Actualizar golden snapshot y tests de anclaje del prompt.
- Agregar/verificar QA de voz para las reglas principales: 4 A, no bot/asistente, limite de humanidad, evidencia/limite, tuteo es-CL y no manzanitas.
- Mantener intactas las politicas vigentes de Knowledge, datos operativos, temas sensibles, routing y formato.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/nexa-intelligence/README.md`
- `docs/architecture/nexa-intelligence/system-prompt/versioning.md`
- `docs/architecture/nexa-intelligence/system-prompt/current.md`
- `docs/architecture/nexa-intelligence/voice/nexa-identity-canon.md`
- `docs/architecture/nexa-intelligence/voice/nexa-voice-system-v1.md`
- `docs/architecture/nexa-intelligence/voice/voice-tone-style-personality.md`
- `docs/architecture/nexa-intelligence/governance/dos-and-donts.md`
- `docs/architecture/GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`
- `.codex/skills/greenhouse-nexa-conversational/SKILL.md`

Reglas obligatorias:

- No editar prompt inline en services; el prompt vive en `src/lib/nexa/nexa-system-prompt.ts`.
- Todo cambio de voz es clase `voice`: bump MINOR del prompt, entrada en `NEXA_PROMPT_GOVERNANCE`, snapshot y QA.
- No cambiar V1 rollback.
- No debilitar reglas de Knowledge: citas `[n]`, sin lista "Fuentes:", no Markdown estructural crudo, gap honesto.
- No debilitar reglas de datos vivos: Knowledge explica mecanismos; tools vivos confirman estado.
- No debilitar temas sensibles: validacion humana final obligatoria cuando aplique.
- No introducir "asistente virtual", "bot", "IA generica", voseo, emocion falsa ni motivo `🍏`.

## Normative Docs

- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `docs/context/10_experiencia-cliente.md`
- `docs/tasks/TASK_PROCESS.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/nexa-intelligence/voice/nexa-voice-system-v1.md`
- `src/lib/nexa/nexa-system-prompt.ts`
- `src/lib/nexa/__snapshots__/nexa-system-prompt.test.ts.snap`
- `scripts/nexa-knowledge-qa-matrix.mjs`

### Blocks / Impacts

- Afecta el comportamiento verbal del chat Nexa (`/api/home/nexa`) en surfaces que consumen `buildNexaSystemPrompt`.
- Impacta `NexaThread`, chat flotante y cualquier consumer futuro que dependa del prompt V2.
- No bloquea la documentacion de Nexa Voice; ya existe canon documental.

### Files owned

- `src/lib/nexa/nexa-system-prompt.ts`
- `src/lib/nexa/nexa-system-prompt.test.ts`
- `src/lib/nexa/__snapshots__/nexa-system-prompt.test.ts.snap`
- `scripts/nexa-knowledge-qa-matrix.mjs`
- `docs/architecture/nexa-intelligence/system-prompt/current.md`
- `docs/architecture/nexa-intelligence/system-prompt/versioning.md`
- `docs/architecture/nexa-intelligence/voice/nexa-voice-system-v1.md`
- `docs/architecture/nexa-intelligence/voice/voice-tone-style-personality.md`
- `.codex/skills/greenhouse-nexa-conversational/SKILL.md`
- `.claude/skills/greenhouse-nexa-conversational/SKILL.md`
- `changelog.md`
- `Handoff.md`
- `project_context.md`

## Current Repo State

### Already exists

- `docs/architecture/nexa-intelligence/voice/nexa-voice-system-v1.md` define Nexa Voice V1.
- `docs/architecture/nexa-intelligence/voice/nexa-identity-canon.md` define identidad, rostro y branding.
- `src/lib/nexa/nexa-system-prompt.ts` contiene V2 modular y `NEXA_PROMPT_GOVERNANCE`.
- `docs/architecture/nexa-intelligence/system-prompt/current.md` ya refleja `nexa-system-prompt.v2.4.0`.
- `pnpm nexa:doc-gate --audit` cubre capas Nexa Intelligence.

### Gap

- El runtime prompt todavia no fuerza literalmente las 4 A, modos conversacionales, fraseologia propia, limite de humanidad y QA de voz definidos en Nexa Voice V1.
- La QA matrix actual verifica conocimiento/voz general, pero no necesariamente todos los invariantes nuevos de Nexa Voice V1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Prompt voice contract update

- Reestructurar o expandir el bloque `voiceContract` del prompt V2 para incorporar Nexa Voice V1.
- Incluir las 4 A como modelo verbal operativo: Aclara, Acompaña, Advierte, Activa.
- Incluir limite de humanidad: presencia sin emocion falsa, intimidad artificial ni promesas humanas.
- Incluir fraseologia calibradora sin convertirla en muletillas obligatorias.
- Mantener separadas las politicas de routing, Knowledge, datos vivos y temas sensibles.

### Slice 2 — Prompt governance + snapshots

- Bumpear `NEXA_SYSTEM_PROMPT_V2_VERSION` con clase `voice` segun `system-prompt/versioning.md`.
- Agregar entrada nueva en `NEXA_PROMPT_GOVERNANCE.changelog` y congelar la entrada anterior literal.
- Actualizar `src/lib/nexa/nexa-system-prompt.test.ts` si faltan anchors de voz.
- Regenerar golden snapshot con `pnpm vitest run src/lib/nexa/nexa-system-prompt.test.ts -u`.

### Slice 3 — QA matrix / voice assertions

- Revisar `scripts/nexa-knowledge-qa-matrix.mjs` y agregar o ajustar asserts para:
  - no "bot" / "asistente virtual" / "modelo de lenguaje";
  - tuteo es-CL, sin voseo;
  - no `🍏`;
  - no entusiasmo generico tipo "excelente pregunta" por default;
  - respuesta con evidencia/limite/siguiente paso cuando aplica;
  - temas sensibles con validacion humana final.
- Mantener la suite determinista y sin dependencia de datos no controlados.

### Slice 4 — Documentation + rollout evidence

- Actualizar `docs/architecture/nexa-intelligence/system-prompt/current.md` con la version nueva y el delta de voz.
- Ajustar `voice-tone-style-personality.md` / `nexa-voice-system-v1.md` solo si el runtime obliga una precision adicional.
- Actualizar skills Codex/Claude si cambia el contrato de ejecucion.
- Registrar delta en `changelog.md`, `project_context.md` y `Handoff.md`.
- Correr gates y dejar evidencia.

## Out of Scope

- No cambiar V1 rollback.
- No rediseñar UI de chat, NexaFace, Nexa Mark, Sender Mark, Presence Mark, composer, floating chat ni Answers Canvas.
- No crear nuevos tools, providers, routes, schemas, flags ni migrations.
- No cambiar politica de Knowledge, citations, evidence packet, retrieval, model routing ni governed actions.
- No generar audio/video de Nexa.
- No reescribir la personalidad de marca Efeonce.

## Detailed Spec

La implementacion debe traducir `docs/architecture/nexa-intelligence/voice/nexa-voice-system-v1.md` a instrucciones runtime compactas y no redundantes.

Puntos que deben entrar al prompt o QA:

- Tesis: "criterio tranquilo en movimiento".
- 4 efectos: claridad, confianza, capacidad, movimiento.
- 4 A: Aclara, Acompaña, Advierte, Activa.
- Modos: respuesta directa, lectura de señal, diagnostico, decision support, educacion, policy/compliance, gap honesto, recuperacion de error.
- Prohibidos: "soy tu asistente virtual", "como modelo de lenguaje", "estoy encantada", "excelente pregunta" por default, "IA mas avanzada", "dejame sorprenderte".
- Limite de humanidad: usar "yo miraria/separaria" solo como criterio operativo; no simular emociones, amistad o memoria personal sin fuente.
- Frontera de datos: no convertir guia en dato actual.

El prompt debe permanecer legible y modular. Si el bloque `voiceContract` queda demasiado largo, evaluar helper interno con arrays separados (`nexaVoiceModel`, `nexaVoiceBoundaries`) dentro del mismo archivo, sin crear un segundo source of truth.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (prompt voice contract) -> Slice 2 (version/governance/snapshot) -> Slice 3 (QA assertions) -> Slice 4 (docs/closure).
- No cerrar Slice 1 sin Slice 2: un prompt cambiado sin bump/snapshot viola governance.
- No cerrar la task sin `pnpm qa:nexa-knowledge` o justificacion explicita si el entorno lo bloquea.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El prompt se vuelve demasiado largo o diluye reglas criticas | Nexa runtime | medium | Mantener instrucciones compactas, no duplicar politicas existentes; revisar snapshot completo | Snapshot diff excesivo / QA regressions |
| Se rompe la politica de Knowledge/citas por mezcla con voz | Knowledge/Nexa | low | No tocar `knowledgePolicy`; QA matrix debe seguir verde | `pnpm qa:nexa-knowledge` falla |
| Nexa suena demasiado humana o demasiado bot | Nexa voice | medium | Añadir anchors y prohibidos especificos; QA de voz | Respuestas con emocion falsa, "asistente", "modelo de lenguaje" |
| Falta bump de version/gobernanza | Prompt governance | medium | `pnpm nexa:doc-gate --changed` y snapshot test | doc-gate falla |

### Feature flags / cutover

Sin flag nuevo. El prompt V2 ya esta gateado por `NEXA_SYSTEM_PROMPT_V2_ENABLED`; el cambio evoluciona la version activa de V2. Revert operativo: volver commit o apagar `NEXA_SYSTEM_PROMPT_V2_ENABLED` para rollback a V1 si se detecta regresion severa.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir cambio de `voiceContract` o volver commit completo | <30 min | si |
| Slice 2 | Revertir bump/snapshot junto con Slice 1 | <30 min | si |
| Slice 3 | Revertir asserts si son falsos positivos, conservando prompt si QA humana aprueba | <30 min | si |
| Slice 4 | Revertir docs si la implementacion se revierte | <30 min | si |

### Production verification sequence

1. Ejecutar tests focales y snapshot local.
2. Ejecutar `pnpm qa:nexa-knowledge`.
3. Ejecutar `pnpm nexa:doc-gate --changed` y `pnpm docs:closure-check`.
4. Si se promueve a staging, smoke manual de 3 prompts:
   - pregunta simple de definicion;
   - pregunta con gap de evidencia;
   - pregunta sensible que exige validacion humana.
5. Produccion solo por release normal del repo; no requiere provisioning externo.

### Out-of-band coordination required

N/A — repo-only change. No requiere secretos, migraciones, provisioning externo ni comunicacion a clientes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/lib/nexa/nexa-system-prompt.ts` incorpora Nexa Voice V1 sin tocar V1 rollback ni debilitar politicas de Knowledge/datos vivos/temas sensibles.
- [ ] `NEXA_SYSTEM_PROMPT_V2_VERSION` queda bumpeado como clase `voice` y `NEXA_PROMPT_GOVERNANCE.changelog` queda append-only, con entrada anterior congelada literal.
- [ ] Golden snapshot del prompt actualizado y revisable.
- [ ] Tests focales del prompt cubren anchors nuevos de voz o validan que el snapshot los captura de forma suficiente.
- [ ] QA matrix cubre o mantiene cobertura para prohibidos de voz, tuteo es-CL, no `🍏`, gap honesto y validacion humana sensible.
- [ ] `system-prompt/current.md` refleja la nueva version y describe el delta de Nexa Voice V1.
- [ ] `pnpm nexa:doc-gate --changed` pasa.
- [ ] `pnpm docs:closure-check` pasa.
- [ ] No se crean UI contracts, migrations, flags nuevos ni endpoints.

## Verification

- `pnpm vitest run src/lib/nexa/nexa-system-prompt.test.ts -u`
- `pnpm vitest run src/lib/nexa/nexa-system-prompt.test.ts`
- `pnpm qa:nexa-knowledge`
- `pnpm nexa:doc-gate --changed`
- `pnpm docs:closure-check`
- `pnpm typecheck`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre si cambia lifecycle/path
- [ ] `Handoff.md` quedo actualizado con version de prompt, evidencia y caveats
- [ ] `changelog.md` quedo actualizado
- [ ] `project_context.md` quedo actualizado si el runtime prompt cambia de version
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- Evaluar una task separada de audio/video voice casting si Nexa pasa a hablar literalmente.
- Evaluar una suite de golden conversations de Nexa Voice si la QA matrix de Knowledge no alcanza para medir tono conversacional general.

## Open Questions

- Si el prompt crece demasiado, decidir si conviene compactar el sistema verbal a un bloque runtime mas corto y dejar ejemplos extensos solo en docs/QA.
