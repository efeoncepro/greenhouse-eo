# Context And Handoff Operating Model V1

## Objetivo

Separar continuidad activa, memoria historica y auditoria de resoluciones para que multiples agentes puedan trabajar sin perder contexto ni obedecer historia vieja como si fuera contrato vigente.

## Principio central

`Handoff.md` es cabina de mando. `Handoff.archive.md` es el indice de memoria historica. Los snapshots y
archivos incrementales viven bajo `docs/operations/agent-context-history/`. `project_context.md` es estado
vigente del repo y `AGENTS.md` es router transversal. Las tasks, issues y docs de arquitectura son la evidencia
canonica de implementacion y decisiones. `changelog.md` es una ventana cronologica reciente; su historia
interna vive bajo `docs/changelog/internal/` y nunca se auto-carga completa.

No se borra historia para ordenar. Se mueve al archivo correcto, se indexa y se deja trazable.

## Source Of Truth Por Pregunta

| Pregunta                                         | Fuente primaria                                          | Fuente secundaria                         |
| ------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------- |
| Que debo saber antes de tocar el repo ahora      | `Handoff.md` + `AGENTS.md`/`CLAUDE.md`                   | `project_context.md`                      |
| Que existe y que restricciones gobiernan el repo | `project_context.md`                                     | arquitectura y docs de operations         |
| Que paso historicamente en una sesion            | task/issue/commit + indice `Handoff.archive.md`          | `agent-context-history/`                  |
| Que cambios internos ocurrieron en el tiempo     | task/issue/commit + `docs/changelog/internal/README.md`  | `changelog.md` reciente                   |
| Como se resolvio un incidente                    | `docs/issues/resolved/ISSUE-###*.md` + task complete     | `Handoff.archive.md`                      |
| Como se implemento una capability                | `docs/tasks/complete/TASK-###*.md`                       | docs de arquitectura/documentation/manual |
| Que criterio de calidad evita parches fragiles   | `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` | `AGENTS.md` / `CLAUDE.md` regla corta     |
| Cual es el contrato tecnico estable              | `docs/architecture/*`                                    | `project_context.md` pointer vigente      |

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

`Handoff.archive.md` es un indice pequeno hacia historia completa y auditable.

Debe contener:

- links a snapshots legados y archivos mensuales;
- manifest/hash cuando un corte masivo preserve documentos anteriores;
- instrucciones de busqueda y advertencia de vigencia;
- punteros directos a resoluciones importantes cuando sigan operativamente relevantes.

Las sesiones salen de la ventana activa hacia
`docs/operations/agent-context-history/handoff/YYYY-MM.md` sin reescribir su contenido semantico. Regla:
archivar no significa ocultar. Si una entrada historica sigue siendo importante para operacion activa,
`Handoff.md` debe dejar un puntero corto a esa entrada, task o issue.

## Contrato De `project_context.md`

`project_context.md` debe explicar el estado vigente del repo.

Debe iniciar con una seccion `Estado vigente para agentes` que resuma:

- ramas y ambientes canonicos;
- docs operativos primarios;
- reglas de source of truth;
- restricciones runtime no negociables;
- decisiones vigentes que contradicen historia antigua;
- links a docs canonicos.

No debe contener secciones `## Delta YYYY-MM-DD`, narrativas por task ni inventarios exhaustivos de features.
La cronologia vive en changelog, task/issue/ADR o archivo historico; `project_context.md` deja un pointer solo
cuando el contrato durable cambia como el agente debe operar.

## Contrato De `AGENTS.md`

`AGENTS.md` es router, no spec-store. Conserva preflight, reglas transversales, gates y una tabla
`dominio -> skill -> invariantes/canon`. El detalle de un subsistema vive load-on-demand en arquitectura,
`agent-invariants/*`, operations o skills versionadas.

Si el router no resuelve una duda load-bearing, el agente debe buscar la fuente vigente y, como fallback,
buscar por keyword en el snapshot legado. Una regla recuperada se promueve a su dueño canonico y al router;
no se vuelve a pegar como bloque largo en `AGENTS.md`.

## Contrato De `changelog.md`

`changelog.md` registra deltas internos de comportamiento, estructura, workflow, rollout o capacidad operativa.
Cada cambio real usa una entrada completa `## YYYY-MM-DD — titulo` y una o pocas viñetas que enlazan la fuente
canonica; no guarda specs, runbooks, evidencia exhaustiva ni narrativa de turno.

La raiz conserva una ventana de maximo 60 entradas, 2.000 lineas y ~60.000 tokens estimados. El primer corte
queda preservado byte-for-byte bajo `docs/changelog/internal/legacy/` con manifest SHA-256; las entradas que
salgan despues se mueven completas a `docs/changelog/internal/YYYY-MM.md` con hash por entrada e indice
explicito. `docs/changelog/CLIENT_CHANGELOG.md` es otro producto documental y no participa de esta rotacion.

## Reglas De Archivo Y Ventana Activa

- Mantener en `Handoff.md` solo la ventana operativa reciente.
- Techo V1: 20 sesiones, 600 lineas y ~12.000 tokens estimados.
- Mantener en `changelog.md` solo la ventana cronologica reciente.
- Techo V1 de changelog: 60 entradas, 2.000 lineas y ~60.000 tokens estimados.
- Excepcion: mantener mas contexto activo si hay incidente abierto, release en curso o task P0/P1 aun viva.
- Una excepcion debe ser temporal y no puede cerrar con el gate estricto en verde hasta recompactar.
- Todo lo archivado debe quedar enlazado desde `Handoff.archive.md`, no eliminado.
- Si un incidente se resolvio, debe existir `ISSUE-###` resuelto o task complete cuando el impacto fue material.
- Rotacion canonica conjunta: `pnpm docs:context-rotate --apply`; dry-run sin `--apply`. Rota de forma
  independiente Handoff y changelog, por lo que uno puede no requerir cambios mientras el otro si.

## Protocolo De Auditoria

Cuando un agente audite "que paso para resolver X":

1. Buscar primero `ISSUE-###`, `TASK-###` o modulo afectado en `docs/issues/`, `docs/tasks/complete/` y `docs/architecture/`.
2. Revisar `Handoff.md` solo para ver si el tema sigue activo.
3. Revisar `Handoff.archive.md` y buscar por keyword en el snapshot/shard indicado.
4. Para cronologia interna, buscar por keyword en `docs/changelog/internal/README.md` y sus targets.
5. Contrastar contra commits/PRs y runtime si la decision se va a reutilizar.

Nunca usar una entrada antigua de handoff como contrato vigente sin revalidar contra arquitectura, codigo y runtime.

## Chequeo Mecanico

El comando canonico es:

```bash
pnpm docs:context-check
```

El check es no destructivo por defecto: reporta warnings y recomendaciones. El modo
`pnpm docs:context-check:strict` es gate de cierre y CI para estos archivos.

Debe revisar como minimo:

- tamano de `Handoff.md`;
- cantidad de sesiones activas;
- cantidad, orden y formato de entradas activas de `changelog.md`;
- budgets de tokens de `AGENTS.md`, `project_context.md`, `Handoff.md`, `changelog.md` y los indices de archive;
- ausencia de `## Delta` en `project_context.md`;
- existencia de targets minimos del router;
- SHA-256, lineas y caracteres de snapshots inmutables y hashes de shards incrementales;
- senales stale como `Próximo step: merge` en entradas marcadas complete;
- existencia de referencias a este modelo desde `AGENTS.md`, `CLAUDE.md`, `project_context.md` y prompt operativo de Codex;
- presencia de `Estado vigente para agentes` en `project_context.md`.

## Integracion Con Agentes

- `AGENTS.md` debe declarar preflight, router, fallback historico y gates para Codex/agentes genericos.
- `CLAUDE.md` debe declarar la misma regla para Claude Code.
- `docs/operations/CODEX_EXECUTION_PROMPT_V1.md` debe incluir este modelo en lectura obligatoria.
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md` debe enlazar este modelo como especializacion de continuidad.
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` debe quedar enlazado desde los puntos de entrada cuando cambie el criterio transversal de no-parches.

Si un agente no conoce este modelo, el repo debe volver a ensenarselo desde esos puntos de entrada.

`CLAUDE.md` y su CI tienen governance independiente. Este modelo puede exigir que mantenga el pointer
cross-agent existente, pero no duplica ni reemplaza su budget/audit.

## Criterio De Cierre

Un cambio que toca continuidad/documentacion operativa queda cerrado solo si:

- la fuente canonica fue actualizada;
- los puntos de entrada de agentes fueron sincronizados;
- `Handoff.md` no quedo mas confuso que antes;
- `changelog.md` conserva sus entradas recientes y toda salida quedo indexada;
- `pnpm docs:context-check:strict` pasa sin warnings;
- no se perdio historia auditable.

## Decision arquitectonica

La separacion router/estado/historia, sus budgets y el contrato de no perdida viven en
`docs/architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md`.
