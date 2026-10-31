# TASK-2091 — Rooms: skill de oficio para armar salas + eval de referencia

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
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-052`
- Status real: `Diseno. ADR del carril de agentes Accepted (D6); skill operativa efeonce-rooms existe; la skill de oficio y el eval no existen. El texto de la skill puede empezar ya; la corrida viva del eval espera TASK-2084.`
- Rank: `antes del primer cliente real y antes de cualquier cambio de la skill de oficio`
- Domain: `platform|content`
- Blocked by: `TASK-2084 solo para la parte viva (atribución del agente en la corrida del eval); el texto de la skill no está bloqueado`
- Branch: `Greenhouse develop, sin worktrees; efeonce-rooms solo lectura y entorno local para correr el eval`

## Summary

El ADR del carril de agentes deja que los agentes publiquen e inviten sin aprobación previa, así que el control de
calidad principal es el oficio del agente y un eval que lo mida. Esta task crea una skill nueva, separada de la
operativa `efeonce-rooms`, que enseña a convertir un deal o un brief en una sala: capítulos, escenas de «Vive el
servicio», pruebas, cobertura, «Ver como», publicar e invitar, y cómo revertir. Suma un eval de referencia con dos
briefs sintéticos y su sala esperada, que se corre antes del primer cliente real y antes de cada cambio de la skill.

## Why This Task Exists

La skill `efeonce-rooms` es operativa: estado del programa, flags, releases, recibos. No enseña a armar una sala
buena. Sin esa guía, un agente con derecho a publicar puede llevarle al comprador una sala con marcadores
(`[PLAZO]`), afirmaciones sin fuente, cobertura incompleta o una invitación a un correo que no está en el deal. El
ADR (D6) lo dice: «Como el agente publica sin aprobación, el eval es el control de calidad principal». Hoy no existe
ninguno de los dos.

## Goal

- Una skill de oficio, espejada en `.claude/skills/` y `.codex/skills/`, con la que un agente arma una sala completa
  a partir de un deal o un brief, la revisa como cliente, la publica e invita sin intervención.
- Un eval de referencia reproducible, con cinco métricas binarias, que bloquea el uso con clientes reales mientras no pase.
- Un mecanismo que detecta que la skill cambió después de su última corrida verde del eval.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (D4 reversas, D6 oficio y eval, reglas duras)
- `docs/architecture/rooms/EFEONCE_ROOMS_SERVICE_SCENES_DECISION_V1.md` (`showcase`, `cycle`, `answers`, `team`, reglas de cobertura, marcadores)
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_V1.md` y `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md` (procedencia `real | synthetic`)
- `docs/architecture/rooms/EFEONCE_ROOMS_SOURCE_IMPORT_AND_CRM_HANDOFF_DECISION_V1.md` (fuentes)

Reglas obligatorias:

- La skill de oficio no duplica la skill operativa: enlaza a `efeonce-rooms` para estado, flags y releases.
- Ningún marcador entre corchetes en una sala con datos reales; cada afirmación lleva su fuente.
- Invitar solo a correos presentes en el deal o en el brief entregado por una persona.
- Publicar solo con cobertura completa y después de revisar «Ver como» con el rol del comprador.
- Revertir con los comandos de D4; nunca borrar ni editar a mano en la base.
- El manifiesto no lleva color, fuente, tamaño ni duración (vocabularios cerrados del ADR de escenas).
- La skill se espeja byte a byte y entra al manifiesto de `scripts/skills/validate-mirrored-skills.mjs`.
- El eval corre antes del primer cliente real y antes de cada cambio de la skill (regla dura del ADR).

## Normative Docs

- `.claude/skills/efeonce-rooms/SKILL.md` y `.claude/skills/efeonce-rooms/references/program-ledger.md`
- `docs/documentation/rooms/backend-api-for-claude-design.md`
- `.claude/skills/efeonce-graphic-line/SKILL.md` (Bricolage editorial, Poppins funcional)
- `.claude/skills/efeonce-b2b-prospecting/evals/` y `.claude/skills/report-studio/evals/` (forma de evals existentes)
- `docs/context/05_voz-tono-estilo.md` (voz del texto visible)

## Dependencies & Impact

### Depends on

- `TASK-2084` (`docs/tasks/to-do/TASK-2084-rooms-agent-attribution-reversal-quotas.md`): `actor_kind`,
  `agent_client_id` y `channel`, más las reversas de D4; la corrida viva del eval comprueba atribución y reversa.
- Operaciones existentes de `efeonce-rooms`: `rooms.create`, `content.upsertBlock`, `content.arrange`,
  `content.importManifest`, `content.attachAsset`, `rooms.authoring` (devuelve `coverage`), `content.previewAudience`,
  `editions.publish`, `invitations.create`, `invitations.revoke`, `access.grant`, `access.revoke`
  (`src/domain/*-contracts.ts`), CLI `pnpm rooms` y MCP stdio.
- `TASK-2089` y `TASK-2090` son insumos opcionales: la skill los usa cuando existan y trabaja con el brief si no.

### Blocks / Impacts

- Primer cliente real de EPIC-052: no se usa la skill con un cliente mientras el eval no pase.
- `TASK-2088`: el provider `rooms` hace que agentes remotos usen esta skill.
- Skill `efeonce-rooms`: gana un enlace a la skill de oficio.

### Files owned

- `.claude/skills/efeonce-rooms-authoring/SKILL.md` (nuevo) [nombre propuesto]
- `.claude/skills/efeonce-rooms-authoring/references/*.md` (nuevos)
- `.claude/skills/efeonce-rooms-authoring/evals/README.md`, `cases.json`, `briefs/*.md`, `expected/*.json`, `score.mjs` (nuevos)
- `.codex/skills/efeonce-rooms-authoring/**` (espejo byte a byte)
- `scripts/skills/validate-mirrored-skills.mjs` (entrada del espejo)
- `scripts/skills/rooms-authoring-eval-freshness.mjs` (nuevo) [propuesto]

## Current Repo State

### Already exists

- Skill operativa `.claude/skills/efeonce-rooms/` y su espejo `.codex/skills/efeonce-rooms/`, registrada en
  `scripts/skills/validate-mirrored-skills.mjs:357`.
- `pnpm skills:mirrors` (`node scripts/skills/validate-mirrored-skills.mjs`).
- Evals de skills con la forma `rubric.md` + `scenarios.json` y `README.md` + `cases.json`.
- En `efeonce-rooms`: cobertura con códigos `scene_*`, entre ellos `scene_placeholder` (`src/domain/scene-contracts.ts`);
  vista previa por rol `content.previewAudience`; reader `rooms.authoring` con `coverage` y permisos efectivos.
- Regla nueva del operador (2026-10-31): Bricolage en texto de varias líneas alterna pesos; ya aplicada al titular
  de `/auth/error`.

### Gap

- No existe una skill que enseñe a armar una sala; la operativa no cubre oficio.
- No existe un eval de salas ni un umbral que bloquee el primer cliente real.
- Nada detecta que la skill cambió sin volver a correr el eval.
- El manifiesto no tiene campo de énfasis tipográfico (búsqueda en `src/domain` sin resultados), así que la regla de
  Bricolage no se puede expresar en la sala sin una decisión de producto [verificar si el renderer ya alterna pesos].

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `.claude/skills/efeonce-rooms-authoring/` y `.codex/skills/efeonce-rooms-authoring/` en greenhouse-eo
- Future candidate home: `remain-shared`
- Boundary: guía de oficio y eval consumidos por agentes (Claude, Codex, MCP remoto); opera Rooms solo con sus comandos públicos (CLI, MCP, API)
- Server/browser split: n/a
- Build impact: none; el scorer usa solo módulos integrados de Node y no entra al bundle de la app
- Extraction blocker: none

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

### Slice 1 — Texto de la skill (no bloqueado)

- `SKILL.md` con frontera explícita frente a `efeonce-rooms` y el recorrido del deal o brief a la sala:
  1. Leer el insumo: deal (correos de contacto, objetivo, plazos), brief, Radiografía AEO si existe.
  2. Elegir capítulos y orden con `content.arrange`.
  3. Escenas de «Vive el servicio»: `showcase` (pieza en feed, story, vía pública y web, con notas), `cycle` (objetivos,
     ajustes, términos), `answers` (`measured` con `capturedAt` o `illustrative`, cada respuesta con fuente), `team`
     (personas, semana, ritmo).
  4. Pruebas y afirmaciones: toda afirmación con fuente; sin métricas inventadas; `author-declared` cuando corresponde.
  5. Piezas: importar con `media.importFromSource` (TASK-2090) o pedir la subida a una persona; nunca URLs.
  6. Cobertura cero bloqueante y «Ver como» con el rol del comprador antes de publicar.
  7. Publicar e invitar directo, solo a correos del deal; avisar a la persona en cuyo nombre actúa.
- `references/reversal-etiquette.md`: cómo revertir (republicar la edición anterior, `invitations.revoke`,
  `access.revoke`, nueva respuesta), avisar y no borrar.
- `references/text-craft.md`: voz, cero marcadores en salas reales, regla Bricolage de varias líneas (frase clave
  pesada y el resto ligero) aplicada a texto que el agente compone fuera del manifiesto; dentro del manifiesto, sin
  marcado de estilo: frase clave primero y corta.
- Espejo en `.codex/skills/efeonce-rooms-authoring/`, entrada en `validate-mirrored-skills.mjs` y enlace desde
  `efeonce-rooms`.

### Slice 2 — Eval de referencia

- `evals/briefs/`: dos briefs sintéticos (`dataOrigin: synthetic` declarado) de industrias distintas; uno trae deal
  con tres correos de contacto y Radiografía; otro solo brief, sin pieza visual aprobada.
- `evals/expected/`: la sala esperada de cada uno (capítulos, escenas, pruebas, invitaciones) como criterio, no como
  texto literal.
- `evals/cases.json` y `evals/README.md`: cómo correrlo contra Rooms local (`pnpm rooms` con sesión local o MCP stdio).
- `evals/score.mjs`: lee el borrador o la edición publicada (`pnpm rooms draft|edition|authoring|invitations`) y el
  registro de operaciones de la corrida, y calcula las cinco métricas.

### Slice 3 — Frescura del eval

- `score.mjs` escribe un recibo `evals/runs/<fecha>.json` con resultado por métrica y el hash del bundle de la skill.
- `scripts/skills/rooms-authoring-eval-freshness.mjs` falla si el hash actual de la skill no tiene un recibo PASS; se
  cablea donde ya se corre (`pnpm skills:mirrors` o `pnpm local:check`) [verificar dónde].

### Slice 4 — Corrida viva (bloqueada por TASK-2084)

- Corrida de los dos briefs por un agente real en Rooms local con atribución; comprueba `actor_kind=agent`, el aviso
  a la persona y una reversa de publicación y de invitación.
- Recibo en `docs/audits/rooms/` y ledger de `efeonce-rooms`.

## Out of Scope

- Cambios al código de `efeonce-rooms` (campo de énfasis, comandos nuevos).
- La UI «Actividad de agentes» (TASK-2085).
- Fuentes y medios (TASK-2089 y TASK-2090).
- Correr el eval contra producción o contra un cliente real.
- Criterios de calidad subjetivos con puntaje (rúbrica de oficio): follow-up si el operador los pide.

## Detailed Spec

Métricas del eval (todas binarias; la corrida pasa solo si las cinco pasan en los dos briefs):

| Métrica | Cómo se mide |
| --- | --- |
| Cobertura completa | `rooms.authoring` devuelve `coverage` sin códigos bloqueantes al momento de publicar |
| Cero marcadores en salas reales | Si la sala es `real`: ningún texto coincide con `\[[^\]]+\]` y no hay `scene_placeholder`; en salas sintéticas se informa sin fallar |
| Afirmaciones con fuente | Cada afirmación o prueba tiene relación de evidencia o `sources[]`; cada respuesta de `answers` tiene al menos una fuente |
| Invitaciones solo a correos del deal | El conjunto de `recipientEmail` de `invitations.list` es subconjunto de los correos declarados en el brief |
| Publicar solo con cobertura completa | En el registro de la corrida, `editions.publish` ocurre después de una lectura de cobertura sin bloqueantes y sin escrituras de contenido entre ambas |

Los briefs son sintéticos y la sala del eval también, así que la métrica de marcadores se prueba con una variante
del brief que declara `real` en un entorno local aislado, nunca en producción.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. Slice 4 solo con TASK-2084 cerrada.
- Ningún uso con un cliente real hasta que exista un recibo PASS cuyo hash coincide con la skill vigente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente publica una sala con marcadores o sin fuentes a un cliente | content | medium sin skill, low con eval | Reglas de la skill + eval binario + cobertura bloqueante en Rooms | `scene_placeholder` en cobertura |
| Invitación a un correo fuera del deal | identity | low | Métrica del eval; cuotas de TASK-2084; reversa `invitations.revoke` | `rooms.agent.release_actions` |
| Se cambia la skill sin volver a correr el eval | tooling | medium | Check de frescura por hash cableado en un comando que ya se corre | fallo del check |
| Drift entre `.claude` y `.codex` | tooling | low | Entrada byte-identical en `validate-mirrored-skills.mjs` | `pnpm skills:mirrors` rojo |
| La skill duplica estado operativo y envejece | tooling | medium | Frontera: estado y flags solo en `efeonce-rooms` | revisión al cerrar tasks de EPIC-052 |

### Feature flags / cutover

- Sin flag: la skill y el eval son tooling. El cutover a clientes reales lo controla el recibo PASS vigente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir commit (skill y espejo) | minutos | sí |
| Slice 2 | Revertir commit | minutos | sí |
| Slice 3 | Revertir commit; quitar el cableado del check | minutos | sí |
| Slice 4 | Sin estado productivo; la corrida es local | n/a | sí |

### Production verification sequence

1. `pnpm skills:mirrors` verde con la entrada nueva.
2. Corrida local de los dos briefs con `score.mjs`: cinco métricas PASS y recibo escrito.
3. Modificar una línea de la skill y comprobar que el check de frescura falla; revertir.
4. Con TASK-2084 cerrada: corrida viva con atribución y una reversa de cada tipo.

### Out-of-band coordination required

- Operador: aprobar los umbrales y quién firma el recibo antes del primer cliente real (abierto en el ADR).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen `.claude/skills/efeonce-rooms-authoring/` y `.codex/skills/efeonce-rooms-authoring/` byte a byte idénticos y `pnpm skills:mirrors` pasa con la entrada nueva.
- [ ] `SKILL.md` declara su frontera con `efeonce-rooms` y no repite estado, flags ni releases.
- [ ] La skill cubre capítulos, las cuatro escenas, pruebas, cobertura, «Ver como», publicar, invitar y reversa, cada uno con los comandos reales de Rooms.
- [ ] La skill prohíbe marcadores entre corchetes en salas reales y afirmaciones sin fuente, y explica la regla Bricolage de varias líneas.
- [ ] Hay dos briefs sintéticos con su sala esperada y `score.mjs` calcula las cinco métricas.
- [ ] Una corrida local de los dos briefs produce un recibo con las cinco métricas en PASS.
- [ ] Una sala con un correo invitado fuera del brief hace fallar la métrica de invitaciones (caso negativo).
- [ ] Una sala real con un marcador `[PLAZO]` hace fallar la métrica de marcadores (caso negativo).
- [ ] Cambiar la skill sin un recibo PASS para su hash hace fallar el check de frescura.
- [ ] Con TASK-2084 cerrada, la corrida viva registra `actor_kind=agent` y ejecuta una reversa de publicación y otra de invitación.

## Verification

- `pnpm skills:mirrors`
- `node .claude/skills/efeonce-rooms-authoring/evals/score.mjs` sobre las dos corridas locales
- `node scripts/skills/rooms-authoring-eval-freshness.mjs`
- `pnpm task:lint --task TASK-2091`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `references/program-ledger.md` de `efeonce-rooms` enlaza la skill de oficio y el último recibo del eval.
- [ ] CLAUDE.md/AGENTS.md: fila del router de Rooms menciona la skill de oficio si el operador lo aprueba.

## Follow-ups

- Campo de énfasis en el manifiesto para aplicar la regla Bricolage dentro de la sala (decisión de producto).
- Rúbrica de oficio con puntaje, si el operador la quiere además de las métricas binarias.
- Brief de un tercer sector cuando haya un cliente real con forma distinta.

## Open Questions

- Nombre final de la skill (`efeonce-rooms-authoring` es propuesta).
- ¿Quién aprueba los umbrales y firma el recibo antes del primer cliente real?
- ¿Dónde se cablea el check de frescura: `pnpm skills:mirrors` o `pnpm local:check`?
