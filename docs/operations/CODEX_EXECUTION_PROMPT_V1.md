# Codex Execution Prompt V1

## Objetivo

Definir el harness operativo canonico para que Codex ejecute `TASK-###` en
`greenhouse-eo` sin depender de prompts largos pegados a mano.

Este documento no reemplaza las fuentes vivas del repo. Las apunta y comprime.
Si hay conflicto, prevalecen en este orden:

1. `AGENTS.md`
2. task/spec activa
3. arquitectura vigente + runtime/schema/codigo verificados
4. `project_context.md` + `Handoff.md`
5. este harness

## Cuándo usarlo

- El operador pide implementar o continuar una task formal `TASK-###`.
- El pedido contiene `TASK-###`, `[TASK-###]` o una ruta
  `docs/tasks/**/TASK-###-*.md`.
- El operador usa alias slash-style de Codex:
  - `/implement-task TASK-###`
  - `/implement-task ###`
  - `/task TASK-###`
  - `/task ###`

No se usa para brainstorming, reviews, mini-tasks, issues o cambios locales sin
task formal, salvo pedido explicito del operador.

## Hook operativo TASK-\*

Antes de escribir codigo, Codex debe ejecutar:

```bash
pnpm codex:task-hook TASK-###
```

El hook tambien acepta ids numericos:

```bash
pnpm codex:task-hook 1109
```

Si el operador dice `mantente en develop`, `stay on develop` o equivalente:

```bash
pnpm codex:task-hook TASK-### --develop
```

El CLI resuelve el ID exacto a partir del nombre del archivo. Acepta IDs numéricos,
decimales y sufijos alfabéticos históricos. Tanto por ID como por ruta, exige una
task única en `docs/tasks/{to-do,in-progress}`, rechaza un lifecycle declarado que
contradiga su carpeta y aplica la regla de `Blocked by` de `task:lint`, incluido
`none` con explicación. Los documentos históricos sin lifecycle usan su carpeta.

La salida sustituye el bloque `## Prompt canónico` con la ruta real y las
autorizaciones explícitas de rama y delegación. Sigue el [router de contexto](../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md)
y la política de autorización de `AGENTS.md`.

## Alias recomendado

El operador puede escribir:

```text
/implement-task 1109 mantente en develop
```

Codex debe interpretarlo como:

```bash
pnpm codex:task-hook 1109 --develop
```

## Prompt canónico

```md
Vas a implementar la task **[TASK-###]** ubicada en `docs/tasks/{to-do,in-progress}/TASK-###-*.md` dentro del repo `greenhouse-eo`.

Objetivo: ejecutar la task de forma canónica, local-first, reusable, segura, resiliente y alineada con el estado real del repo. No basta con que "funcione"; debes respetar arquitectura, runtime, documentación viva, contratos existentes, blast radius y cierre operacional.

FUENTES VIVAS

Lee primero, con proporcionalidad:

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- la spec completa de la task
- arquitectura del dominio afectado
- `DESIGN.md` si toca UI visible
- `docs/context/00_INDEX.md` y docs aplicables si toca producto, copy, naming, métricas, onboarding, cliente, GTM, HubSpot/Account 360 o marca

Si la task toca arquitectura compartida, schema, access, auth, finance/payroll/accounting, events/outbox, APIs externas, cloud/deploy/secrets, UI platform o runtime projections compartidas, identifica la ADR/doc canónica antes de implementar.

SOURCE OF TRUTH

Si hay conflicto entre task/spec, documentación y runtime real, prevalece arquitectura vigente + código/schema/runtime verificados. Corrige o anota el drift antes de implementar si cambia contrato o bloquea.

MODULAR PLACEMENT CONTRACT

Antes de Plan/Implementación, lee `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` y valida el `## Modular Placement Contract` de la task contra el repo real:

- `Current home` es el path/runtime donde se construye ahora.
- `Future candidate home` es metadata, no permiso para crear `apps/*`, `packages/*`, servicios o repositorios.
- `Boundary` nombra el primitive/contract y sus consumers autorizados.
- `Server/browser split` mantiene DB, stores, secrets y provider SDKs fuera del browser.
- `Build impact` declara dependencias pesadas, filesystem inputs o global entrypoints.
- `Extraction blocker` nombra transacción/auth/routing/data/provider o `none`.

Si el bloque falta, tiene placeholders o contradice el código, corrige la task antes de implementar. Un fix local puede usar `Topology impact: none`, pero no omitir el contrato.

GOAL PREFLIGHT

Antes de ejecutar el hook para una `TASK-###`, verifica el objetivo confirmado
en la conversación. Al retomar, consulta el Goal activo si Codex permite leerlo.
Reutilízalo cuando corresponda a la misma task y al alcance que aprobó el operador.

- Si falta un objetivo explícito y confirmado y el operador pide ejecutar/implementar/continuar
  una task, no empieces implementación todavía: propone un `/goal` recomendado
  para esa task y espera confirmación del operador.
- El `/goal` recomendado debe incluir objetivo de cierre, evidencia obligatoria,
  límites de alcance, estado correcto si falta rollout (`code complete, rollout
pendiente` u `operativamente bloqueado`) y si conviene `mantente en develop` o
  `con subagentes`. Incluye el criterio de UI/UX cuando aplique.
- Si el operador acepta el goal o entrega uno propio, continúa con el hook
  (`pnpm codex:task-hook ...`) usando `--develop` y/o `--subagents` cuando
  corresponda.
- Si el operador ordena explícitamente ejecutar sin goal, documenta la excepción
  en Audit/Plan/Handoff y sigue el hook.

MODO DE RAMA / WORKTREE

- No cambies de rama por iniciativa propia.
- Resuelve la rama desde el contrato del repositorio: Greenhouse trabaja en `develop`; Globe trabaja directamente
  en `main`. Una task no puede crear ni sobreescribir esa política con una rama `task/*`.
- Trabaja sólo en el checkout compartido actual. Nunca crees, uses ni muevas trabajo a `git worktree`,
  checkouts aislados o carpetas clonadas; ante WIP, conflicto o divergencia, detente y pide decisión al operador.
- No toques ni limpies worktrees preexistentes salvo autorización explícita que indique ruta y acción exactas.
- Si el operador pide `mantente en develop`, no cambies de rama y documenta la excepción en Audit/Plan/Handoff.
- Si el operador pide subagentes, delegación o trabajo paralelo, pasa `--subagents` al hook para que la autorización quede impresa en el prompt.
- Si la task declara una branch distinta del contrato del repositorio, trátala como drift documental: permanece en
  la rama canónica, preserva el WIP y corrige/escala el contrato antes de implementar.
- No hagas push ni deploy como cierre automático sin instrucción explícita.

INTAKE DE TASK

Si la task está en `in-progress/`:

- Lee la task y `Handoff.md`.
- Busca contexto previo en commits, PRs, branches y notas recientes.
- No repitas Discovery/Audit/Plan si ya existen y siguen vigentes.
- Continúa desde el primer slice incompleto.
- Rehaz fases solo si detectas drift real: commits relevantes nuevos, schema/runtime cambiado, docs actualizadas o task redefinida.

Si la task está en `to-do/`:

- Verifica ownership activo antes de implementar.
- Si está libre, mueve a `in-progress/`, ajusta `Lifecycle`, sincroniza `docs/tasks/README.md` y deja nota breve en `Handoff.md`.
- Mantén la rama actual salvo instrucción explícita distinta.

OPEN QUESTIONS

Si la spec tiene `## Open Questions`, resuélvelas antes de implementar con la opción más robusta, segura, resiliente y escalable. Documenta resolución y rationale. Si una pregunta es bloqueante, detente y repórtalo.

DISCOVERY READ-ONLY

Antes de escribir código:

- Explora `src/`, `migrations/`, `scripts/`, `services/`, `docs/`, tests, lint rules, signals, capabilities, workers y components/views existentes.
- Reutiliza primitives/helpers/readers/commands existentes antes de crear nuevos.
- Si toca Postgres, revisa schema real y usa `pnpm pg:doctor` / `pnpm pg:connect` / `pnpm pg:connect:migrate` según aplique.
- Si la causa raíz vive en Vercel, GCP, Azure, GitHub, Postgres operativo, HubSpot, Teams, Sentry u otra plataforma con CLI autenticada, usa el CLI con guardrails y verifica.

AUDIT

Antes de implementar, presenta un bloque breve:

=== AUDIT: [TASK ID] ===
SUPUESTOS CORRECTOS:

- ...
  SUPUESTOS DESACTUALIZADOS:
- spec dice X, realidad Y (verificado en path/runtime) → acción
  ARQUITECTURA / DOCS OBLIGATORIOS:
- doc → por qué aplica
  CÓDIGO EXISTENTE PARA REUTILIZAR:
- path/helper/primitive → uso
  SCHEMA / RUNTIME REAL:
- tabla/view/route/worker/signal → evidencia
  ACCESS MODEL:
- solo si aplica: routeGroups, views/view_code, entitlements/capabilities, startup policy
  SKILLS A USAR:
- skill → para qué
  SUBAGENTES:
- `sequential` | `fork` | `fork recomendado, no autorizado/no disponible` + por qué
  RIESGOS / BLAST RADIUS:
- ...
  OPEN QUESTIONS RESUELTAS:
- # Q → resolución → rationale

SUBAGENT TOOLING

Durante Discovery decide explícitamente `sequential` vs `fork` usando
`docs/tasks/TASK_PROCESS.md`:

- Usa `fork` cuando los slices son independientes, no comparten archivos de
  edición, requieren skills distintas, el volumen justifica coordinación, o la
  task tiene `Effort = Alto` con slices separables.
- Usa `sequential` cuando hay dependencia causal, archivos owned solapados,
  effort bajo/medio con flujo lineal, o la coordinación cuesta más que ejecutar.
- No delegues el bloqueo inmediato del que depende la siguiente acción local.

Si el operador pidió explícitamente subagentes, delegación, trabajo paralelo o
el hook imprimió `subagentes autorizados`:

- Antes de cerrar el plan, usa primero las herramientas de colaboración que la
  sesión ya expone. Descubre herramientas adicionales si el cliente ofrece esa vía.
- Si el plan decide `fork`, asigna exploración de solo lectura para preguntas
  independientes o implementación con archivos exclusivos. Declara el rol en el
  brief y usa un perfil de agente cuando el cliente lo permita.
- Hereda modelo y esfuerzo por defecto. Usa un override si la autorización, el
  riesgo de la tarea y las opciones disponibles en la sesión lo justifican.
- Cada subagente debe recibir contexto autocontenido: task, slice, archivos que
  puede tocar, archivos que no puede tocar, interfaces a respetar, skills que
  debe leer y acceptance criteria propios.
- Mientras corren, el agente principal trabaja en piezas no solapadas. No
  repitas el trabajo delegado. Al volver, revisa cambios/resultados, integra y
  corre verificación sobre el resultado combinado.
- Cierra subagentes que ya no sean necesarios.

Si la task cumple criterios de `fork` pero no hay autorización explícita vigente
o el tooling no está disponible, registra `fork recomendado, no autorizado/no
disponible` en Audit/Plan y sigue secuencialmente solo si el riesgo sigue siendo
aceptable; para P0/P1, Effort Alto o blast radius alto, pide checkpoint humano.

MAPA DE CONEXIONES

Si la task no es puramente local, documenta lo aplicable:

- eventos salientes/entrantes
- FKs, joins, views, projections, materializaciones
- readers/helpers/services compartidos
- rutas, guards, capabilities, view codes
- jobs, cron, workers, webhooks, Cloud Run
- reliability signals y observabilidad
- surfaces UI consumidoras
- tests transversales que deben extenderse o no romperse

PLAN

Antes de implementar, presenta un plan slice-by-slice proporcional. Orden sugerido:

1. Migraciones / schema
2. Tipos / contratos
3. Readers / helpers / commands
4. API routes / handlers / workers
5. Events / publishers / consumers
6. Reliability / observabilidad / lint rules
7. UI / views / pages
8. Docs / handoff / changelog / arquitectura
9. Verificación

Para cada slice nuevo, explica qué reutilizas, qué archivos toca, skills aplicables, dependencias y si requiere subagente. Si `fork` está autorizado, define subagentes concretos con ownership exclusivo, orden de consolidación y verificación combinada. Para P0/P1 o blast radius alto, detente al final del plan para checkpoint humano si corresponde.

SKILLS

Usa el conjunto mínimo de skills reales disponibles. Cárgalas antes de tomar decisiones de implementación del dominio, no como checklist decorativo.

Guía Codex vigente:

- Backend / TS / rutas / dominio Greenhouse: `greenhouse-agent`
- Task/spec/planning: `greenhouse-task-planner`
- UI visible o platform UI: `greenhouse-ui-orchestrator` +, según dominio, `greenhouse-product-ui-architect`, `greenhouse-portal-ui-implementer`, `greenhouse-vuexy-ui-expert`
- Copy visible / aria / labels / empty states: `greenhouse-ux-content-accessibility`
- Browser/runtime diagnostics de rutas: `greenhouse-browser-diagnostics`
- QA final no trivial: `greenhouse-qa-release-auditor`
- Cierre documental: `greenhouse-documentation-governor`
- Finance/accounting: `greenhouse-finance-accounting-operator`
- Payroll: `greenhouse-payroll-auditor`
- Secrets: `greenhouse-secret-hygiene`
- Release/production: `greenhouse-production-release`
- Arquitectura estructural: `software-architect-2026`
- Seguridad: skills `codex-security:*` solo si el trabajo realmente es security/hardening

UI/UX GOAL GUARD

Si la task tiene `Execution profile: ui-ux`, `UI impact != none`, toca UI visible,
copy visible, layout, interacción, motion, primitive, flow o requiere GVC,
incorpora estos criterios al objetivo aprobado antes de escribir JSX o copy visible.
Inclúyelos al proponer el Goal. Si el objetivo ya está confirmado, regístralos en
Audit/Plan como condiciones de cierre de ese mismo objetivo.

- Carga las skills de product design aplicables antes de JSX. Mantén `UI ready: no`
  hasta que el contrato de UI tenga mapping de implementación, escenarios GVC y
  registro de decisiones. Para `UI ready: yes`, `pnpm task:lint --task TASK-###` debe pasar sin hallazgos.
- Declara el wireframe en la task bajo `docs/ui/wireframes` y valida con `pnpm ui:wireframe-check --task TASK-###`.
  Para flows y motion aplicables, declara sus contratos bajo `docs/ui/flows` y
  `docs/ui/motion` y corre `pnpm ui:flow-check --task TASK-###` y `pnpm ui:motion-check --task TASK-###` según corresponda.
- Documenta la decisión de reutilizar, extender o crear la primitive. Usa los tokens
  y la capa canónica de copy visible.
- Ejecuta GVC en desktop y mobile, revisa los PNG y verifica `scrollWidth == clientWidth`
  en desktop y a 390 px. Resuelve overlaps, clipping y errores de consola o página,
  o registra el bloqueo exacto con evidencia. Sincroniza docs, handoff y gates aplicables.

No declares UI lista si esa condición no está demostrada en la conversación con comandos, rutas de captura y hallazgos resueltos o bloqueadores exactos.

IMPLEMENTACIÓN

- Reutiliza antes de crear.
- Corrige causa raíz; workarounds solo temporales, reversibles, documentados y con condición de retiro.
- No reviertas cambios ajenos.
- No mezcles refactor grande con fix funcional chico sin necesidad real.
- No inventes helpers/readers/components/routes paralelos si existe primitive canónica.
- Mantén aislamiento tenant/scope según el dominio real.
- No calcules métricas inline si existe materialización/reader canónico.
- No crees `new Pool()`.
- No leas secretos DB directo desde código nuevo.
- Migraciones: crea con `pnpm migrate:create <slug>`; no fabriques nombres a mano.
- Copy reusable vive en `src/lib/copy/*` o nomenclatura canónica; no hardcodees copy reutilizable en JSX.
- UI visible: aplica `DESIGN.md`, `pnpm ui:wireframe-check --task TASK-###`, `pnpm ui:flow-check --task TASK-###` cuando aplique, `pnpm ui:motion-check --task TASK-###` cuando aplique, primitive lookup, token mapping y GVC (`pnpm fe:capture`) con revisión visual real.
- Acciones destructivas o blast radius alto: confirma antes.

VALIDACIÓN

Ejecuta lo proporcional al cambio:

- Focal tests/lint del slice
- `pnpm local:check`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- `pnpm build`
- `pnpm pg:doctor`
- Workers/build inputs: `pnpm worker:build-contract-gate` + `pnpm worker:runtime-deps-gate`
- `pnpm ops:lint --changed` si tocaste tasks/epics/mini-tasks
- `pnpm qa:gates --changed` + skill `greenhouse-qa-release-auditor` antes de cerrar implementaciones no triviales
- UI: `pnpm fe:capture ...` y revisar frames PNG
- Docs/operating contracts: `pnpm docs:closure-check` y, si cambió contexto/handoff/changelog governance,
  `pnpm docs:context-check:strict`

Si no puedes ejecutar una validación razonable, dilo con causa concreta y riesgo residual.

CIERRE

No declares la task completa si falta rollout real: flags/env vars, redeploy, migración aplicada, backfill, provisioning externo, cron/webhook/worker, secret, recuperación de datos o verificación runtime. Usa `code complete, rollout pendiente` u `operativamente bloqueado` cuando corresponda.

Antes de cerrar:

- Resume qué cambió y qué reutilizaste.
- Lista validaciones ejecutadas y no ejecutadas.
- Lista migrations/capabilities/events/signals nuevos si existen.
- Lista docs actualizadas.
- Documenta drift detectado, riesgos y follow-ups.
- Actualiza `Status real` y marca en `Acceptance Criteria` los criterios respaldados
  por evidencia. Deja los pendientes sin marcar y registra el motivo.
- Corre `pnpm task:lint --task TASK-###` antes de mover la task. Sincroniza lifecycle,
  carpeta, registry y README cuando el estado real justifique el cambio.
  Para sufijos alfabéticos históricos, usa `pnpm task:lint --changed` sobre la
  edición de la task y registra la cobertura, ya que el filtro focal acepta IDs numéricos y decimales.
- Actualiza `Handoff.md` con continuidad útil.
- Completa el Goal nativo cuando la evidencia satisface todo el alcance que aprobó
  el operador. Si ese alcance era código local, el Goal puede cerrar mientras la
  task conserva rollout pendiente. Si el Goal exige rollout, verifica el runtime antes de cerrarlo.
```

## Protocolo de actualización continua

Este harness debe actualizarse como parte del mismo cambio cuando se modifique
cualquier contrato que él menciona o comprime.

### Triggers de actualización

Revisar y, si aplica, actualizar este documento cuando cambie cualquiera de:

- `AGENTS.md` o la sección TASK/hook de `CLAUDE.md`.
- `.codex/skills/greenhouse-task-execution-hook/SKILL.md`.
- `scripts/codex-task-hook.mjs`.
- `.claude/commands/implement-task.md` cuando el cambio sea de convivencia
  cross-agent.
- `docs/tasks/TASK_PROCESS.md`.
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`.
- package scripts usados como gates (`docs:closure-check`, `docs:context-check:strict`,
  `ops:lint`, `qa:gates`, `fe:capture`, `local:check`, `pg:doctor`, etc.).
- Inventario o nombre de skills Greenhouse que este harness referencia.

### Drift control mecánico

Después de cambiar este harness, el hook, skills de task o entrypoints de agentes,
correr:

```bash
pnpm codex:task-hook:check
pnpm codex:task-hook 1109 --develop --prompt-only
pnpm codex:task-hook 1109 --develop --subagents --prompt-only
pnpm docs:closure-check
pnpm docs:context-check:strict
git diff --check
```

El `TASK-1109` es solo un smoke estable mientras siga activo. Si se completa,
usar cualquier task activa no bloqueada.

### Versionamiento

Mantener V1 cuando el cambio sea compatible:

- alias nuevos que sigan resolviendo al mismo hook `TASK-*`
- ajustes de redacción
- matriz de skills
- flags aditivos del hook que sólo imprimen autorización o contexto operativo
- checks aditivos
- protocolo de mantenimiento
- mejoras del script de smoke

Crear `CODEX_EXECUTION_PROMPT_V2.md` si cambia algo estructural:

- orden u obligatoriedad de fases
- source-of-truth precedence
- política de branch/worktree/push
- formato obligatorio de Audit/Plan/Cierre
- trigger deja de ser `TASK-*`
- modelo de ejecución deja de ser Codex-only

### Regla de cierre documental

Todo cambio a este harness debe sincronizar, con deltas breves:

- `.codex/skills/greenhouse-task-execution-hook/SKILL.md` si cambia trigger,
  comando o comportamiento pre-ejecución.
- `AGENTS.md` si cambia el router/preflight de Codex y `project_context.md` solo
  si cambia un contrato durable o su ruta canónica.
- `CLAUDE.md` solo como awareness de convivencia cuando corresponda.
- `Handoff.md` solo para continuidad activa; `changelog.md` si cambia realmente
  el contrato operativo, producto, runtime o workflow. La cronología histórica
  pertenece a `docs/changelog/internal/` y a los shards/snapshots, no a deltas acumulativos en documentos
  vivos. Mantener la ventana activa con `pnpm docs:context-rotate --apply`.

No duplicar el prompt completo en otros archivos. Este documento es la fuente
canónica del harness Codex; los demás entrypoints deben enlazar o resumir.

## Notas

- Este prompt es intencionalmente más corto que las reglas completas del repo.
- La seguridad viene de leer las fuentes vivas, no de congelar todo en este
  archivo.
- En tasks pequeñas, aplica el flujo de forma breve; no omitas Discovery, Audit,
  Plan, verificación ni cierre.
