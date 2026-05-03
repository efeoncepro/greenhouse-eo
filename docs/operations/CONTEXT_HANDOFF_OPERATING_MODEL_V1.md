# Context And Handoff Operating Model V1

## Objetivo

Separar continuidad activa, memoria historica y auditoria de resoluciones para que multiples agentes puedan trabajar sin perder contexto ni obedecer historia vieja como si fuera contrato vigente.

## Principio central

`Handoff.md` es cabina de mando. `Handoff.archive.md` es caja negra historica. `project_context.md` es estado vigente del repo. Las tasks, issues y docs de arquitectura son la evidencia canonica de implementacion y decisiones.

No se borra historia para ordenar. Se mueve al archivo correcto, se indexa y se deja trazable.

## Source Of Truth Por Pregunta

| Pregunta | Fuente primaria | Fuente secundaria |
|---|---|---|
| Que debo saber antes de tocar el repo ahora | `Handoff.md` + `AGENTS.md`/`CLAUDE.md` | `project_context.md` |
| Que existe y que restricciones gobiernan el repo | `project_context.md` | arquitectura y docs de operations |
| Que paso historicamente en una sesion | `Handoff.archive.md` | commit, PR, task, issue |
| Como se resolvio un incidente | `docs/issues/resolved/ISSUE-###*.md` + task complete | `Handoff.archive.md` |
| Como se implemento una capability | `docs/tasks/complete/TASK-###*.md` | docs de arquitectura/documentation/manual |
| Que criterio de calidad evita parches fragiles | `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` | `AGENTS.md` / `CLAUDE.md` regla corta |
| Cual es el contrato tecnico estable | `docs/architecture/*` | `project_context.md` delta corto |

## Contrato De `Handoff.md`

`Handoff.md` debe mantenerse pequeno, accionable y orientado a continuidad.

Debe contener:

- `Estado activo ahora`: branch/worktree, objetivo activo, owner implicito, ultimo commit relevante.
- `Tasks activas`: solo tasks vivas o recientemente tocadas que cambian decisiones del turno.
- `Riesgos abiertos`: riesgos aun accionables, no hallazgos ya cerrados.
- `Pendientes inmediatos`: pasos concretos que el siguiente agente puede ejecutar.
- `Referencias de auditoria`: links a archive/task/issue cuando una resolucion historica sea importante.
- `Ultimas sesiones relevantes`: ventana corta de continuidad, no diario completo.

No debe contener:

- historial completo de todas las sesiones del repo;
- runbooks largos;
- arquitectura duplicada;
- pendientes ya cerrados;
- "proximo step" historico para tasks que ya estan `complete`;
- listas gigantes de archivos si ya viven en task, PR o arquitectura.

## Contrato De `Handoff.archive.md`

`Handoff.archive.md` conserva historia completa y auditable.

Debe contener:

- sesiones antiguas movidas desde `Handoff.md` sin reescribir su contenido semantico;
- secciones por fecha descendente;
- entradas de resolucion importantes preservadas textualmente;
- indice o anchors cuando el archivo crezca lo suficiente para dificultar busqueda.

Regla: archivar no significa ocultar. Si una entrada historica sigue siendo importante para operacion activa, `Handoff.md` debe dejar un puntero corto a esa entrada, task o issue.

## Contrato De `project_context.md`

`project_context.md` debe explicar el estado vigente del repo.

Debe iniciar con una seccion `Estado vigente para agentes` que resuma:

- ramas y ambientes canonicos;
- docs operativos primarios;
- reglas de source of truth;
- restricciones runtime no negociables;
- decisiones vigentes que contradicen historia antigua;
- links a docs canonicos.

Los deltas historicos pueden permanecer, pero deben leerse como memoria, no como instruccion primaria si contradicen el estado vigente.

## Reglas De Archivo Y Ventana Activa

- Mantener en `Handoff.md` solo la ventana operativa reciente.
- Sugerencia base: ultimos 7 a 14 dias o ultimas 20 sesiones, lo que sea menor y siga siendo legible.
- Excepcion: mantener mas contexto activo si hay incidente abierto, release en curso o task P0/P1 aun viva.
- Todo lo archivado debe quedar en `Handoff.archive.md`, no eliminado.
- Si un incidente se resolvio, debe existir `ISSUE-###` resuelto o task complete cuando el impacto fue material.

## Protocolo De Auditoria

Cuando un agente audite "que paso para resolver X":

1. Buscar primero `ISSUE-###`, `TASK-###` o modulo afectado en `docs/issues/`, `docs/tasks/complete/` y `docs/architecture/`.
2. Revisar `Handoff.md` solo para ver si el tema sigue activo.
3. Revisar `Handoff.archive.md` para la narrativa cronologica de sesion.
4. Contrastar contra commits/PRs y runtime si la decision se va a reutilizar.

Nunca usar una entrada antigua de handoff como contrato vigente sin revalidar contra arquitectura, codigo y runtime.

## Chequeo Mecanico

El comando canonico es:

```bash
pnpm docs:context-check
```

El check debe ser no destructivo por defecto: reporta warnings y recomendaciones. Puede tener modo estricto en CI futuro si el equipo decide convertirlo en gate.

Debe revisar como minimo:

- tamano de `Handoff.md`;
- cantidad de sesiones activas;
- senales stale como `Próximo step: merge` en entradas marcadas complete;
- existencia de referencias a este modelo desde `AGENTS.md`, `CLAUDE.md`, `project_context.md` y prompt operativo de Codex;
- presencia de `Estado vigente para agentes` en `project_context.md`.

## Integracion Con Agentes

- `AGENTS.md` debe declarar la regla corta para Codex y agentes genericos.
- `CLAUDE.md` debe declarar la misma regla para Claude Code.
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md` debe incluir este modelo en lectura obligatoria.
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` debe enlazar este modelo como especializacion de continuidad.
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` debe quedar enlazado desde los puntos de entrada cuando cambie el criterio transversal de no-parches.

Si un agente no conoce este modelo, el repo debe volver a ensenarselo desde esos puntos de entrada.

## Criterio De Cierre

Un cambio que toca continuidad/documentacion operativa queda cerrado solo si:

- la fuente canonica fue actualizada;
- los puntos de entrada de agentes fueron sincronizados;
- `Handoff.md` no quedo mas confuso que antes;
- `pnpm docs:context-check` fue ejecutado o se documenta por que no;
- no se perdio historia auditable.
