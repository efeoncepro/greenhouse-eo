# Greenhouse Operating Loop V1

## Objetivo

Nombrar y gobernar el ciclo operativo completo con el que Greenhouse convierte intencion en cambio verificable:

```text
intake -> taxonomy -> plan -> execution -> verification -> closure -> handoff
```

Este loop aplica a humanos y agentes. No reemplaza las reglas especificas de tasks, epics, mini-tasks, issues, releases o documentacion; las coordina bajo un mismo lenguaje.

## Nombre canonico

El nombre canonico es **Greenhouse Operating Loop**.

Usarlo para referirse al sistema operativo de desarrollo del repo:

- taxonomia documental (`TASK-###`, `EPIC-###`, `MINI-###`, `ISSUE-###`);
- plan y checkpoint;
- local-first verification;
- GVC cuando hay UI;
- cierre documental;
- handoff para continuidad multi-agente.

## Fases

### 1. Intake

Identificar el tipo de trabajo:

- incidente/falla real -> `ISSUE-###`;
- mejora chica y local -> `MINI-###`;
- trabajo implementable -> `TASK-###`;
- programa cross-domain o multi-task -> `EPIC-###`;
- decision estructural -> ADR en `docs/architecture/` + `DECISIONS_INDEX.md`.

### 2. Taxonomy

Crear o actualizar el artefacto correcto y sincronizar:

- carpeta de lifecycle;
- campo `Lifecycle`;
- registry de IDs;
- indice README correspondiente;
- cross-link entre epic y tasks cuando aplique.

### 3. Plan

Para `TASK-###`, seguir `docs/tasks/TASK_PROCESS.md`:

- Discovery;
- Access model;
- ADR check;
- skills;
- subagent decision;
- execution plan;
- checkpoint segun priority/effort.

Para epics y mini-tasks, seguir sus modelos operativos dedicados.

### 4. Execution

Ejecutar local-first por defecto:

- mantener scope acotado;
- reutilizar primitives canonicas;
- respetar source of truth vigente;
- no mezclar refactors no relacionados;
- no crear worktrees/clones salvo aprobacion explicita del operador.

### 5. Verification

Validar proporcionalmente:

- `pnpm local:check`, `local:check:ui` o `local:check:full`;
- tests focales;
- `pnpm design:lint` si toca UI/design;
- GVC para UI visible;
- smokes/runtime checks cuando el cambio depende de integraciones, flags, env vars, DB, workers o deploy.

### 6. Closure

No declarar completo un cambio si falta runtime, rollout, docs o verificacion.

El cierre debe sincronizar:

- lifecycle del artefacto;
- indices y registries;
- `Handoff.md`;
- `changelog.md` cuando cambia comportamiento/protocolo;
- arquitectura/docs/manuales cuando aplique;
- `pnpm docs:closure-check`.

### 7. Handoff

Dejar continuidad suficiente para el siguiente agente:

- que se hizo;
- que se valido;
- que queda pendiente;
- riesgos;
- decisiones del operador;
- comandos utiles.

## Enforcement mecanico V1

El Greenhouse Operating Loop tiene una primera capa mecanica:

- `pnpm task:lint` — contrato estructural de `TASK-###`;
- `pnpm epic:lint` — contrato estructural de `EPIC-###`;
- `pnpm mini:lint` — contrato estructural de `MINI-###`;
- `pnpm ops:lint` — agregador de tasks, epics y mini-tasks;
- `pnpm docs:closure-check` — chequeo mecanico advisory de cierre documental.

Uso recomendado:

```bash
pnpm ops:lint -- --changed
pnpm docs:closure-check
```

## Limites de V1

Estos linters no prueban por si solos que el cambio esta operativo.

No reemplazan:

- tests de codigo;
- build/typecheck;
- GVC;
- smoke runtime;
- verificacion de flags/env vars/redeploy;
- migraciones/backfills;
- validacion de integraciones externas;
- juicio humano en checkpoint.

## Deuda historica

El rollout sigue el patron de Spec-Driven Development:

- deuda historica queda exenta en barridos globales cuando corresponde;
- `--changed` y revisiones focales exigen normalizar lo que se toca;
- gates nuevos empiezan por estructura barata y se endurecen cuando el backlog esta saneado.

## Referencias

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/EPIC_OPERATING_MODEL_V1.md`
- `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
