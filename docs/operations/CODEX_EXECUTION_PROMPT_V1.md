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

## Hook operativo TASK-*

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

La salida del hook sustituye el bloque `## Prompt canónico` de este documento
con la ruta real de la task y, si aplica, la excepcion de rama.

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

MODO DE RAMA / WORKTREE

- No cambies de rama por iniciativa propia.
- No crees `git worktree` ni carpetas clon por iniciativa propia.
- Si el operador pide `mantente en develop`, no cambies de rama y documenta la excepción en Audit/Plan/Handoff.
- Si la task declara otra branch o parece haber ownership activo, verifica `git status --short`, PRs/branches/handoff y decide con cuidado. Pide confirmación solo si el estado bloquea avanzar sin pisar trabajo ajeno.
- No hagas push a `develop` ni a ramas remotas como cierre automático sin instrucción explícita.

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
- sí/no + por qué
RIESGOS / BLAST RADIUS:
- ...
OPEN QUESTIONS RESUELTAS:
- Q → resolución → rationale
===

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

Para cada slice nuevo, explica qué reutilizas, qué archivos toca, skills aplicables, dependencias y si requiere subagente. Para P0/P1 o blast radius alto, detente al final del plan para checkpoint humano si corresponde.

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
- UI visible: aplica `DESIGN.md`, primitive lookup, token mapping y GVC (`pnpm fe:capture`) con revisión visual real.
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
- `pnpm ops:lint --changed` si tocaste tasks/epics/mini-tasks
- `pnpm qa:gates --changed` + skill `greenhouse-qa-release-auditor` antes de cerrar implementaciones no triviales
- UI: `pnpm fe:capture ...` y revisar frames PNG
- Docs/operating contracts: `pnpm docs:closure-check` y, si cambió contexto/handoff, `pnpm docs:context-check`

Si no puedes ejecutar una validación razonable, dilo con causa concreta y riesgo residual.

CIERRE

No declares la task completa si falta rollout real: flags/env vars, redeploy, migración aplicada, backfill, provisioning externo, cron/webhook/worker, secret, recuperación de datos o verificación runtime. Usa `code complete, rollout pendiente` u `operativamente bloqueado` cuando corresponda.

Antes de cerrar:
- Resume qué cambió y qué reutilizaste.
- Lista validaciones ejecutadas y no ejecutadas.
- Lista migrations/capabilities/events/signals nuevos si existen.
- Lista docs actualizadas.
- Documenta drift detectado, riesgos y follow-ups.
- Sincroniza lifecycle/carpeta/README de la task solo si el estado real lo justifica.
- Actualiza `Handoff.md` con continuidad útil.
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
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`.
- package scripts usados como gates (`docs:closure-check`, `docs:context-check`,
  `ops:lint`, `qa:gates`, `fe:capture`, `local:check`, `pg:doctor`, etc.).
- Inventario o nombre de skills Greenhouse que este harness referencia.

### Drift control mecánico

Después de cambiar este harness, el hook, skills de task o entrypoints de agentes,
correr:

```bash
pnpm codex:task-hook:check
pnpm codex:task-hook 1109 --develop --prompt-only
pnpm docs:closure-check
pnpm docs:context-check
git diff --check
```

El `TASK-1109` es solo un smoke estable mientras siga activo. Si se completa,
usar cualquier task activa no bloqueada.

### Versionamiento

Mantener V1 cuando el cambio sea compatible:

- alias nuevos que sigan resolviendo al mismo hook `TASK-*`
- ajustes de redacción
- matriz de skills
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
- `AGENTS.md` y `project_context.md` si cambia una regla vigente para Codex.
- `CLAUDE.md` solo como awareness de convivencia cuando corresponda.
- `Handoff.md` y `changelog.md` si cambia el contrato operativo.

No duplicar el prompt completo en otros archivos. Este documento es la fuente
canónica del harness Codex; los demás entrypoints deben enlazar o resumir.

## Notas

- Este prompt es intencionalmente más corto que las reglas completas del repo.
- La seguridad viene de leer las fuentes vivas, no de congelar todo en este
  archivo.
- En tasks pequeñas, aplica el flujo de forma breve; no omitas Discovery, Audit,
  Plan, verificación ni cierre.
