# MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md

## Objetivo

Permitir que múltiples agentes trabajen en paralelo sobre el mismo repositorio sin pisarse el checkout, sin cambiarle la rama al otro agente y sin convertir el workspace compartido en una fuente de conflictos operativos.

Este documento define el modelo operativo canónico para:

- workspace principal compartido
- worktrees aislados por agente
- naming de ramas y carpetas
- sincronización con `develop`
- inicio y cierre de sesión
- limpieza y rollback del esquema

## Regla base

Si ya hay un agente trabajando en el workspace actual, **no se cambia la rama de ese checkout**.

La regla canónica pasa a ser:

- el primer agente activo conserva el workspace actual
- todo agente adicional trabaja en un `git worktree` propio, en otra carpeta y otra rama

Esto evita que en VS Code cambie el branch visible del otro agente y reduce el riesgo de contaminar su `git status`.

## Definiciones

### Workspace principal

El checkout original del repo.

Ejemplo:

- `/Users/jreye/Documents/greenhouse-eo`

### Worktree aislado

Otra carpeta del mismo repo, conectada al mismo historial Git, pero con su propio branch activo y sus propios archivos checkout.

Ejemplo:

- `/Users/jreye/Documents/greenhouse-eo-codex-task-380`

### Agente owner del workspace

El agente que ya está trabajando en una carpeta concreta y cuyo branch no debe ser alterado por otro agente.

## Cuándo usar el workspace compartido

Se permite seguir en el workspace actual cuando:

- solo hay un agente activo
- el cambio es muy pequeño y nadie más está editando en paralelo
- el usuario confirma que no hay otra sesión viva en ese checkout

## Cuándo abrir un worktree aislado

Se vuelve obligatorio cuando:

- ya hay otro agente trabajando en el checkout actual
- el cambio requiere otra rama
- el trabajo es largo o de alto impacto
- el agente necesita experimentar sin tocar el estado visible del otro
- el usuario quiere que Claude siga en el workspace actual y Codex trabaje aparte

## Convención recomendada

### Reserva del workspace principal

Por defecto:

- el workspace actual se conserva para el agente que ya está ahí
- si Claude está trabajando en el checkout actual, Claude se queda ahí
- si Codex entra después para trabajo paralelo, Codex abre worktree nuevo

La misma lógica aplica a la inversa si el orden cambia.

### Naming de ramas

Mantener la convención existente del repo:

- `feature/<owner>-<tema>`
- `fix/<owner>-<tema>`
- `hotfix/<owner>-<tema>`
- `docs/<owner>-<tema>`
- `task/TASK-###-short-slug` cuando el trabajo está atado a una task

### Naming de worktrees

Formato recomendado:

- `<repo>-<agent>-<branch-slug>`

Ejemplos:

- `greenhouse-eo-claude-task-379`
- `greenhouse-eo-codex-task-380`
- `greenhouse-eo-codex-fix-issue-046`

## Comandos canónicos

### Ver worktrees activos

```bash
git worktree list
```

### Crear worktree nuevo para un agente

Desde el repo principal:

```bash
git fetch origin
git worktree add ../greenhouse-eo-codex-task-380 -b task/TASK-380-structured-context-layer-foundation origin/develop
```

Si el branch ya existe:

```bash
git fetch origin
git worktree add ../greenhouse-eo-codex-task-380 task/TASK-380-structured-context-layer-foundation
```

### Entrar al worktree

```bash
cd ../greenhouse-eo-codex-task-380
```

### Verificar contexto local

```bash
pwd
git branch --show-current
git status --short
git worktree list
```

### Eliminar un worktree cuando ya no se necesita

```bash
git worktree remove ../greenhouse-eo-codex-task-380
```

### Limpiar referencias huérfanas

```bash
git worktree prune
```

## Branch de base recomendado

### Trabajo normal de feature, docs o task

Base recomendada:

- `origin/develop`

### Hotfix productivo

Base recomendada:

- `origin/main`

### Trabajo sobre una rama ya existente

Si la rama ya existe y el objetivo es continuarla:

- usar esa misma rama dentro del worktree nuevo
- no cambiar el branch del checkout donde otro agente ya está activo

## Inicio de sesión obligatorio

Antes de tocar archivos, cada agente debe confirmar:

1. en qué carpeta está trabajando
2. qué rama tiene activa
3. si el checkout es compartido o worktree aislado
4. que no va a cambiar la rama del workspace ocupado por otro agente
5. que dejó o revisó `Handoff.md`

Checklist corto:

- `pwd`
- `git branch --show-current`
- `git status --short`
- `git worktree list`
- leer `project_context.md`
- leer `Handoff.md`

## Sincronización con `develop`

Cada worktree se sincroniza desde su propia carpeta.

Regla simple:

- fetch siempre antes de iniciar una sesión larga
- rebase o merge desde la rama base correcta dentro del worktree correcto
- nunca usar el checkout del otro agente para “ponerse al día”

Ejemplo:

```bash
git fetch origin
git rebase origin/develop
```

Si la rama está basada en `main`, usar `origin/main`.

## Reglas de convivencia

### 1. No cambiar el branch del checkout de otro agente

Es la regla más importante de todo el modelo.

### 2. No compartir una misma rama entre dos worktrees activos salvo acuerdo explícito

Dos agentes en la misma rama crean confusión operacional aunque estén en carpetas distintas.

### 3. No mezclar commits ajenos

Cada worktree debe commitear solo sus archivos.

### 4. No correr limpieza destructiva mientras otro agente sigue trabajando

Evitar durante sesiones activas de otros agentes:

- `git worktree remove` sobre carpetas ajenas
- `git branch -D` de ramas en uso
- `git worktree prune` sin saber qué worktrees siguen vivos
- `git gc` manual como “mantenimiento”

### 5. Resolver integración después, no durante

Los worktrees aíslan el trabajo, no eliminan conflictos lógicos.

Si dos ramas tocan la misma zona:

- el conflicto aparece al integrar
- no durante el checkout

## Cierre de sesión

Antes de cerrar una sesión en un worktree:

1. commit del trabajo propio
2. push de la rama
3. actualizar `Handoff.md`
4. dejar claro:
   - carpeta/worktree usado
   - rama usada
   - validación ejecutada
   - riesgos abiertos

Si el worktree queda listo para cerrar:

1. verificar que no haya cambios sin commitear
2. remover el worktree
3. borrar la rama local solo si ya no hace falta

## Rollback y reversibilidad

El modelo es reversible.

Se puede volver al esquema simple cuando se quiera:

- terminar el trabajo
- mergear o cerrar la rama
- eliminar el worktree

Nada de esto cambia el repositorio a una tecnología distinta. Solo agrega checkouts activos separados.

## Qué debe registrar cada agente en Handoff

Cuando un agente usa worktree aislado, debe registrar:

- ruta del worktree
- rama
- objetivo
- si el workspace principal quedó reservado para otro agente

Formato sugerido:

- `workspace principal reservado para Claude: /Users/.../greenhouse-eo`
- `worktree Codex: /Users/.../greenhouse-eo-codex-task-380`
- `rama: task/TASK-380-structured-context-layer-foundation`

## Resumen operativo

La regla corta es esta:

- si estás solo, puedes usar el checkout actual
- si ya hay otro agente ahí, no le cambies la rama
- abre un worktree nuevo para ti
- trabaja en tu propia rama
- sincroniza desde tu propia carpeta
- cierra con commit, push y handoff
