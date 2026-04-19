# MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md

## Delta 2026-04-17 — patrones aprendidos en sesión paralela Claude + Codex

Sesión simultánea de TASK-446 (Claude, Insights root cause narrative) y TASK-345 (Codex, quotation canonical bridge) materializó patrones operativos que el modelo original no cubría. Se agregan las secciones:

- [Higiene de worktree preexistente](#higiene-de-worktree-preexistente) — cómo validar que un worktree heredado está listo sin hacer `pnpm install` ciego
- [Patrones de integración multi-agente](#patrones-de-integración-multi-agente) — `rebase --onto`, `force-push-with-lease`, hotspots de conflicto
- [CI como gate compartido](#ci-como-gate-compartido) — protocolo cuando `develop` queda en rojo por flake ajeno
- [Merge policy canónica](#merge-policy-canónica) — squash merge + background watcher para auto-merge cuando no hay branch protection

Contexto que originó el delta: ambos agentes abrieron PR contra `develop` simultáneamente, Codex mergeó TASK-345 mientras el CI de Claude corría, y un flake pre-existente en `HrLeaveView.test.tsx` bloqueaba todo el pipeline. Los patrones canónicos quedan para que la próxima sesión no descubra estas lecciones a fuego.

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
- nunca usar el checkout del otro agente para "ponerse al día"

Ejemplo:

```bash
git fetch origin
git rebase origin/develop
```

Si la rama está basada en `main`, usar `origin/main`.

### Layout canónico de worktrees

| Worktree | Propósito | Rama |
|---|---|---|
| `greenhouse-eo/` (primary) | **Home base del operador humano.** Vive en `develop`. Entre tasks queda ahí; cuando arranca una task nueva se checkoutea `task/TASK-xxx-*` desde aquí; al cerrar la task vuelve a `develop` | `develop` (default) o `task/TASK-xxx-*` en curso |
| `greenhouse-eo-codex*/` | Worktrees dedicadas del agente Codex para trabajo paralelo | `task/TASK-xxx-*` |
| `greenhouse-eo-<task>/` | Worktrees temporales para tasks específicas cuando se necesita aislamiento | `task/TASK-xxx-*` |

Regla dura: **`develop` vive en el primary worktree**. No crear una worktree dedicada `-develop/` paralela — eso secuestra la rama del operador y fuerza al primary a detached HEAD.

### Script de sincronización

Para mantener todas las worktrees al día sin ir carpeta por carpeta:

```bash
# Status de todas las worktrees (ahead/behind/dirty, no toca refs)
pnpm worktrees:status

# Sync agresivo — intenta ff-merge en TODAS las worktrees con upstream
pnpm worktrees:sync-all

# Sync de una worktree específica
bash scripts/worktree-sync.sh --path ../greenhouse-eo-codex
```

El script (`scripts/worktree-sync.sh`) es estricto: solo aplica `git merge --ff-only`, nunca fuerza nada, salta worktrees dirty, respeta detached HEADs. Seguro para correr en paralelo con sesiones activas de otros agentes. El modo `default` (`pnpm worktrees:sync`) quedó histórico de cuando existía el mirror `-develop/` — usa `--all` o `--path` según el caso.

### Doc-only commits van directo a develop

Para cambios que no tocan código runtime (specs de task, `Handoff.md`, `docs/**`, `CLAUDE.md`, `AGENTS.md`):

```bash
# Primary está en develop — estás listo para commit directo
git pull origin develop                        # asegura estar al día
git add <file>
git commit -m "docs(...): ..."
git push origin develop
```

Para cambios que tocan código (`src/`, `scripts/`, `migrations/`, `services/`): **siempre** branch + PR + squash merge desde una task branch, nunca direct a develop. La preferencia doc-only-direct no es licencia para saltarse review de código.

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

## Higiene de worktree preexistente

Cuando un agente toma un worktree que otro agente ya usó (ej: sesión anterior cerrada sin remove), **NO hacer `pnpm install` ni `git clean -fdx` a ciegas**. Validar primero:

### Checklist rápido (< 30 segundos)

```bash
# 1. Lockfile consistente con el main repo
md5sum /path/to/main/pnpm-lock.yaml /path/to/worktree/pnpm-lock.yaml
# → mismos hashes = node_modules sirve, no reinstalar

# 2. package.json idéntico
diff /path/to/main/package.json /path/to/worktree/package.json

# 3. node_modules poblado
ls /path/to/worktree/node_modules/.pnpm | head
du -sh /path/to/worktree/node_modules  # debería ser ~2G

# 4. .env.local existe (idealmente symlink al main)
ls -la /path/to/worktree/.env.local

# 5. .vercel/ presente si vas a usar vercel CLI
ls /path/to/worktree/.vercel
```

### Pattern: symlink de config compartida

Para evitar drift entre worktrees y el workspace principal, **symlinkear** los archivos de config estable:

```bash
# .env.local (secretos, idéntico entre worktrees)
ln -s /path/to/main/.env.local /path/to/worktree/.env.local

# .vercel/ (project link + env files descargados)
ln -s /path/to/main/.vercel /path/to/worktree/.vercel
```

Archivos que NO symlinkear (son per-worktree):

- `.next/`, `.next-local/` (build artifacts)
- `.vscode/mcp.json` (config MCP del agente específico)
- cualquier cosa en `artifacts/` o caches locales

### Cleanup de caches stale

Si el worktree tiene builds viejos, limpiar antes de `pnpm dev`/`pnpm build`:

```bash
rm -rf /path/to/worktree/.next /path/to/worktree/.next-local/build-*
```

El directorio `.next-local/` se puede dejar vacío — `scripts/next-dist-dir.mjs` lo repuebla.

## Patrones de integración multi-agente

Cuando dos agentes pushean ramas en paralelo con targets a `develop`, la segunda PR en mergear hereda los commits de la primera. Patrones canónicos:

### 1. `rebase --onto` para separar scope

Si tu rama se basó en un commit de otro agente (ej: `fe3b274c` de Codex) que NO quieres arrastrar en tu PR:

```bash
git fetch origin develop
git rebase --onto origin/develop <other-agent-commit> <your-branch>
# ejemplo concreto: git rebase --onto origin/develop fe3b274c
```

Esto reescribe tu historial para que tus commits queden directamente sobre `origin/develop`, saltándose el del otro agente. Esencial cuando el otro agente hará merge por su propia PR y no querés duplicar su trabajo ni pisarle la atribución.

### 2. `git push --force-with-lease`

Nunca `git push --force` en ramas compartidas (incluso la tuya propia). Usar siempre `--force-with-lease`:

```bash
git push --force-with-lease origin <your-branch>
```

`--force-with-lease` aborta si alguien más pusheó a la rama mientras rebaseabas. Protección contra race conditions silenciosas.

### 3. Conflict hotspots — archivos que cada sesión toca

Estos archivos son zona de conflict casi garantizada entre PRs paralelas:

| Archivo | Por qué |
|---|---|
| `Handoff.md` | Cada sesión agrega entry al top |
| `changelog.md` | Cada PR documenta cambio |
| `docs/tasks/README.md` | Cada task update toca la tabla |
| `docs/tasks/TASK_ID_REGISTRY.md` | Cada task nueva agrega fila |
| `docs/issues/README.md` | Si abres ISSUE, toca la tabla |

Cuando haya conflict en estos archivos durante rebase:

- **No perder contenido ajeno.** Si el HEAD side tiene una entry de otro agente, conservarla.
- **Orden canónico:** tu entry más reciente arriba, la del otro agente debajo (reverse chronological por merge time, no por session time).
- **Duplicados:** si tu branch arrastra una entry que ya está en `develop` via otra PR, dropearla — es redundante y puede re-introducir contenido que el otro agente removió intencionalmente.

### 4. Rebase cascading — un solo rebase puede no ser suficiente

Si mientras tu CI corre otro agente mergea una PR a `develop`, tu rama vuelve a quedar desincronizada. Protocolo:

```bash
# Antes de hacer gh pr merge, verificar
git fetch origin develop
git rev-list --count origin/develop..HEAD  # tus commits ahead
git rev-list --count HEAD..origin/develop  # commits que te faltan

# Si HEAD..origin/develop > 0, rebasear otra vez
git rebase origin/develop
# resolver conflicts
git push --force-with-lease
```

GitHub marca la PR como `DIRTY` / `CONFLICTING` cuando esto pasa. El background watcher debe reintentar rebase, no asumir que la primera verde del CI garantiza merge.

## CI como gate compartido

El workflow `Lint, test and build` en `develop` actúa como rollup gate: **si está rojo, todas las PRs subsecuentes heredan el fail**. Protocolo canónico:

### Triage antes de asumir culpa

Cuando tu PR falla CI:

```bash
# 1. ¿Mi cambio rompió?
pnpm lint && pnpm tsc --noEmit && pnpm test:coverage

# 2. Si local pasa, revisar qué step de CI falla
gh run view <run-id> --log-failed | head -100

# 3. Si el fail es en un archivo que NO tocaste, revisar runs previos en develop
gh run list --branch develop --workflow CI --limit 5 --json conclusion
# → si las últimas 3+ runs en develop también fallan → flake heredado, no tuyo
```

### Si el flake es heredado

NO mergear con admin override — desbloquea tu PR pero perpetúa el problema.

**Protocolo correcto:**

1. Abrir `ISSUE-###` en `docs/issues/resolved/` (o `open/` si no puedes fixear)
2. Crear rama separada `fix/ci-<brief-slug>` desde `origin/develop`
3. Implementar el fix canónico (no solo workaround)
4. PR independiente → review/CI/merge a `develop`
5. **Rebasear tu PR original** sobre el develop ya verde
6. Re-disparar CI de tu PR → pasa limpio
7. Merge normal

Este protocolo cuesta más tiempo pero:

- Desbloquea a todos los agentes subsecuentes
- Crea audit trail del incidente
- Mantiene la señal "CI rojo = problema real" en vez de normalizar ruido

### Ejemplo canónico: ISSUE-052

Sesión 2026-04-17: Claude descubrió que `HrLeaveView.test.tsx:352` timeouteaba en `pnpm test:coverage` (no en `pnpm test`). Últimos 5 commits en develop tenían CI rojo por lo mismo. Fix: bump `testTimeout` de 5s → 15s en `vitest.config.ts` ([PR #65](https://github.com/efeoncepro/greenhouse-eo/pull/65)). Desbloqueó PR #63 y toda la queue futura.

## Merge policy canónica

`develop` **no tiene branch protection rules configuradas**. Consecuencias:

- `gh pr merge --auto` nativo no funciona (`enablePullRequestAutoMerge` rechaza sin branch protection)
- Merge requiere ejecución manual cuando CI está verde

### Pattern canónico: background watcher + auto-merge

```bash
until [ "$(gh run view <RUN_ID> --json status --jq '.status')" = "completed" ]; do
  sleep 30
done
CONCLUSION=$(gh run view <RUN_ID> --json conclusion --jq '.conclusion')
if [ "$CONCLUSION" = "success" ]; then
  gh pr merge <PR> --squash --delete-branch
else
  echo "CI failed, manual intervention required"
fi
```

Correr con `run_in_background: true` para no bloquear el agente. Recibís notificación cuando el merge ocurre.

### Squash merge siempre

Toda PR a `develop` usa **squash merge**. Razones:

- Un commit por feature en `develop` — historial legible
- Rollback trivial (`git revert <squash-commit>`)
- Attribution correcta (el squash commit queda atribuido al PR author)
- WIP commits del feature branch no ensucian develop

### Delete branch al mergear

`gh pr merge --squash --delete-branch` borra la rama remota. La rama local del agente queda huérfana — limpieza opcional:

```bash
git fetch --prune origin
git branch -D <feature-branch>  # si no está en uso por worktree
```

### Caveat: el checkout del lado local

`gh pr merge` intenta hacer checkout de la base branch después del merge. Si `develop` está ocupado en otro worktree, verás:

```
failed to run git: fatal: 'develop' is already used by worktree at '/path/to/other-worktree'
=== MERGED TO DEVELOP ===
```

**El merge en GitHub es exitoso** — solo el checkout local post-merge falla, que no importa. Verificar con:

```bash
gh pr view <PR> --json state,mergedAt,mergeCommit
```

Si `state: MERGED`, el trabajo quedó. El otro worktree se sincroniza con `git pull --ff-only origin develop` desde su propia carpeta.

## Resumen operativo

La regla corta es esta:

- si estás solo, puedes usar el checkout actual
- si ya hay otro agente ahí, no le cambies la rama
- abre un worktree nuevo para ti
- trabaja en tu propia rama
- sincroniza desde tu propia carpeta
- cierra con commit, push y handoff
- si CI falla por flake heredado, abrir ISSUE + PR separada antes de mergear tu feature
- merge a `develop` vía squash + delete branch; nunca --force-push sin --with-lease
