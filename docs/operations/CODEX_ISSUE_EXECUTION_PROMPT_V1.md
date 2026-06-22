# Codex Issue Execution Prompt V1

## Objetivo

Definir el harness operativo canonico para que Codex diagnostique y resuelva
`ISSUE-###` en `greenhouse-eo` sin convertir bugs localizados en tasks pesadas ni
cerrar incidentes sin evidencia.

Este documento no reemplaza las fuentes vivas del repo. Las apunta y comprime.
Si hay conflicto, prevalecen en este orden:

1. `AGENTS.md`
2. issue activo
3. arquitectura vigente + runtime/schema/codigo verificados
4. `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
5. `project_context.md` + `Handoff.md`
6. este harness

## Cuándo usarlo

- El operador pide resolver, revisar o continuar un issue formal `ISSUE-###`.
- El pedido contiene `ISSUE-###`, `[ISSUE-###]` o una ruta
  `docs/issues/**/ISSUE-###-*.md`.
- El operador usa alias slash-style de Codex:
  - `/fix-issue ISSUE-###`
  - `/fix-issue ###`
  - `/issue ISSUE-###`
  - `/issue ###`

No se usa para tasks, mini-tasks, auditorias generales, brainstorming o fixes sin
issue formal, salvo pedido explicito del operador.

## Hook operativo ISSUE-*

Antes de escribir codigo para un issue formal, Codex debe ejecutar:

```bash
pnpm codex:issue-hook ISSUE-###
```

El hook tambien acepta ids numericos:

```bash
pnpm codex:issue-hook 045
```

Si el operador dice `mantente en develop`, `stay on develop` o equivalente:

```bash
pnpm codex:issue-hook ISSUE-### --develop
```

Para leer un issue resuelto sin reabrirlo:

```bash
pnpm codex:issue-hook ISSUE-### --review-resolved
```

## Prompt canonico

```md
Vas a resolver el issue **[ISSUE-###]** ubicado en `docs/issues/open/ISSUE-###-*.md` dentro del repo `greenhouse-eo`.

Objetivo: cerrar la causa raiz con evidencia proporcional. Un issue no es una task pequena: primero valida si sigue siendo un bug localizado o si debe escalar a `TASK-###`.

FUENTES VIVAS

Lee primero, con proporcionalidad:
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- issue completo
- arquitectura/docs del dominio afectado
- codigo, tests, rutas, scripts, migrations, signals y runtime que el issue menciona

Si el issue toca arquitectura compartida, schema, access/auth, finance/payroll/accounting, events/outbox, APIs externas, cloud/deploy/secrets, UI platform o runtime projections compartidas, identifica la ADR/doc canonica antes de implementar.

SOURCE OF TRUTH

Si issue, docs y runtime discrepan, prevalece arquitectura vigente + codigo/schema/runtime verificados. Actualiza el issue con la realidad antes de cerrar si la hipotesis original estaba incompleta o stale.

MODO DE RAMA / WORKTREE

- No cambies de rama por iniciativa propia.
- No crees `git worktree` ni carpetas clon por iniciativa propia.
- Si el operador pide `mantente en develop`, no cambies de rama y documenta la excepcion si implementas cambios.
- No hagas push a `develop` ni a ramas remotas como cierre automatico sin instruccion explicita.
- No reviertas cambios ajenos; si hay worktree dirty, separa tu scope y reporta si bloquea.

TRIAGE OBLIGATORIO

Antes de implementar, decide y documenta:

1. `issue-only fix`: bug localizado, baja ambiguedad, cambios acotados y verificacion clara.
2. `issue + TASK`: remediation requiere migracion/schema riesgoso, refactor amplio, capability/access program, UI significativa, sync/cron/worker rollout, integracion externa, arquitectura nueva o coordinacion multi-slice.
3. `blocked`: no hay evidencia suficiente o falta acceso/runtime para validar causa raiz.

Si cae en `issue + TASK`, no mezcles el programa grande dentro del issue. Crea o propone `TASK-###`, enlazala y aplica solo mitigacion temporal si es segura, reversible y documentada.

AUDIT

Antes de implementar, presenta un bloque breve:

=== ISSUE AUDIT: [ISSUE-###] ===
SINTOMA VIGENTE:
- reproducido / verificado / stale, con evidencia
CAUSA RAIZ:
- confirmada o hipotesis actual
MODO DE CIERRE:
- issue-only / issue + TASK / blocked, con rationale
DOCS / ARQUITECTURA APLICABLE:
- doc -> por que aplica
CODIGO EXISTENTE PARA REUTILIZAR:
- path/helper/reader/command -> uso
RUNTIME / DATA / ACCESS:
- ruta/schema/signal/log/CLI -> evidencia si aplica
RIESGOS / BLAST RADIUS:
- ...
VERIFICACION PLANEADA:
- ...
NO-REGRESSION TARGETS:
- consumidores/contratos vecinos que deben seguir sanos
===

IMPLEMENTACION

- Corrige causa raiz; no solo el sintoma.
- Mantén el cambio tan pequeno como permita una solucion robusta.
- Reutiliza helpers/readers/commands/primitives existentes.
- No introduzcas abstracciones nuevas si el issue es un bug localizado.
- No cambies contratos de negocio, schema o access model sin escalar a task si el scope crece.
- Si toca UI visible, aplica las reglas UI/GVC del repo y trata el issue como UI visible aunque no exista task.
- Si toca secrets/env/cloud/Sentry/GCP/Vercel/Azure/HubSpot/Teams, usa CLIs autenticados con guardrails y verifica recuperacion real.

REGRESSION / BLAST RADIUS GUARD

Antes de editar:
- identifica consumidores directos e indirectos del modulo/ruta/helper tocado;
- identifica contratos vecinos sensibles: shape de respuesta, auth/access, tenant scope, side effects, events/outbox, schema/query semantics, flags, workers/crons, copy/UI states;
- revisa tests existentes relacionados, no solo el test que reproduce el issue;
- si el fix cambia un contrato o afecta un consumidor vecino, amplia la validacion o escala a `issue + TASK`;
- si no puedes probar un consumidor relevante, declaralo como riesgo residual antes de cerrar;
- no cierres el issue si resuelve el sintoma pero degrada otro flujo conocido.

VALIDACION

Ejecuta lo proporcional:
- reproduccion antes/despues cuando sea posible
- tests focales del modulo/ruta
- no-regression test/smoke de al menos un flujo vecino sensible cuando el cambio toca un helper/reader/route compartido
- lint/typecheck focal o `pnpm local:check` si el blast radius lo justifica
- runtime/staging smoke si el issue era runtime
- `pnpm docs:closure-check` al mover issue o tocar docs
- `git diff --check`

Si no puedes ejecutar una validacion razonable, dilo con causa concreta y riesgo residual. No marques `resolved` sin evidencia.

NO-REGRESSION EVIDENCE

Para marcar `resolved`, documenta en el issue o cierre:
- prueba que reproduce/cubre el issue;
- prueba o smoke de al menos un flujo vecino sensible, o explicacion de por que no aplica;
- contrato que no cambio, o doc/task si si cambio;
- riesgos residuales y follow-up si existe.

CIERRE DE ISSUE

Para cerrar:
- actualiza el issue de proposal a resolucion aplicada
- mueve el archivo de `docs/issues/open/` a `docs/issues/resolved/`
- actualiza `docs/issues/README.md`
- agrega verificacion real ejecutada
- enlaza commit/task/follow-up si aplica
- actualiza `Handoff.md`, `changelog.md`, `project_context.md` o arquitectura solo si el fix cambia contrato, runtime operativo o deja riesgo residual relevante

Un issue puede cerrarse aunque quede una task de hardening relacionada, si el incidente original ya esta resuelto y verificado.
```

## Protocolo de actualizacion continua

Actualizar este documento cuando cambie cualquiera de:

- `AGENTS.md` o reglas de issues/hook.
- `.codex/skills/greenhouse-issue-execution-hook/SKILL.md`.
- `scripts/codex-issue-hook.mjs`.
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`.
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`.
- comandos/gates usados para cierre de issues.

Despues de cambiar este harness, correr:

```bash
pnpm codex:issue-hook:check
pnpm codex:issue-hook 045 --develop --prompt-only
pnpm docs:closure-check
pnpm docs:context-check
git diff --check
```

Mantener V1 para cambios compatibles. Crear `CODEX_ISSUE_EXECUTION_PROMPT_V2.md`
si cambia estructuralmente el trigger, orden de fases, politica de rama/worktree,
source-of-truth o formato obligatorio de audit/cierre.
