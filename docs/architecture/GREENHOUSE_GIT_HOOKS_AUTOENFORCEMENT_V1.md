# Greenhouse EO — Git Hooks Autoenforcement V1

> **Version:** 1.0
> **Created:** 2026-05-05 (Husky + lint-staged install)
> **Last updated:** 2026-05-05
> **Domain:** platform / dev tooling / multi-agent operations

## Why this exists

Greenhouse opera con multiples agentes concurrentes (Claude Code, Codex, Cursor, futuros agentes). Cada agente escribe codigo siguiendo convenciones generales aprendidas de su training data, pero el repo tiene reglas de estilo + import-order + padding-line strictness que NO siempre coinciden con esas convenciones por defecto.

Resultado pre-2026-05-05: ciclo recurrente de `agente pushea -> CI lint falla -> revert+repush -> agente siguiente sesion limpia -> CI pasa`. Cada ciclo cuesta minutos de CI cycles + ruido en `git log` + frustration humano.

Causa raiz no era "los agentes no saben programar". Era que los agentes NO corrian `pnpm lint` local antes de pushear porque no estaba en su flujo natural. La solucion canonica es **automatizar la enforcement local** para que el agente fisicamente NO pueda commitear / pushear codigo con errores de style.

## Architecture

3 capas de defensa, ordenadas de menor a mayor blast radius:

```text
┌────────────────────────────────────────────────────────────┐
│  Layer 1 — pre-commit hook (.husky/pre-commit)             │
│  Trigger: git commit                                        │
│  Runs:    pnpm exec lint-staged                            │
│           → eslint --fix --cache sobre archivos staged     │
│  Blocks:  errores NO auto-fixable                          │
│  Latency: < 5s (cache en node_modules/.cache)              │
│  Scope:   solo archivos staged                             │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 2 — pre-push hook (.husky/pre-push)                 │
│  Trigger: git push                                          │
│  Runs:    pnpm lint (full repo) + pnpm exec tsc --noEmit  │
│  Blocks:  cualquier 1+ error de lint o tsc                 │
│  Latency: < 90s (tsc --incremental cache)                  │
│  Scope:   repo COMPLETO (no solo staged)                   │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│  Layer 3 — CI gate (.github/workflows/ci.yml)              │
│  Trigger: push a remote / PR                                │
│  Runs:    pnpm lint + pnpm tsc + pnpm build + tests        │
│  Blocks:  merge a develop / main                           │
│  Latency: ~5 min (full pipeline)                           │
└────────────────────────────────────────────────────────────┘
```

**Defense in depth:** si Layer 1 se bypassea (`--no-verify` autorizado), Layer 2 sigue activo. Si Layer 2 se bypassea, Layer 3 (CI) sigue activo. Si los 3 fallan, hay regla en CLAUDE.md / AGENTS.md que prohibe bypass sin autorizacion explicita.

## Implementation

### Files

| File | Purpose |
| --- | --- |
| `.husky/pre-commit` | Shell script que invoca `pnpm exec lint-staged` |
| `.husky/pre-push` | Shell script que corre `pnpm lint` + `pnpm tsc --noEmit` |
| `package.json` → `"prepare": "husky"` | Script lifecycle de npm/pnpm que activa los hooks al `pnpm install` |
| `package.json` → `"lint-staged"` block | Config glob → comandos por extension |
| `node_modules/.cache/eslint-staged/` | Cache local de eslint para latencia minima (gitignored) |

### lint-staged config

```json
"lint-staged": {
  "*.{ts,tsx,mjs,mts,js,jsx}": [
    "eslint --fix --cache --cache-location node_modules/.cache/eslint-staged"
  ]
}
```

Glob cubre TODOS los archivos JS/TS del repo. Cuando emerjan nuevas extensiones (e.g. Rust scripts, Python utils), se agregan al config sin tocar los hooks shell.

### pre-commit hook (shell)

```sh
#!/usr/bin/env sh
pnpm exec lint-staged
```

Idempotent. Si lint-staged sale con exit 0, commit procede. Si exit ≠ 0, commit aborta. Stdout muestra qué archivos se modificaron por auto-fix.

### pre-push hook (shell)

```sh
#!/usr/bin/env sh
set -e

echo "[pre-push] Running pnpm lint (full repo)…"
pnpm lint

echo "[pre-push] Running pnpm tsc --noEmit…"
pnpm exec tsc --noEmit

echo "[pre-push] OK — pushing."
```

`set -e` aborta el hook al primer comando que falle. Sin `set -e`, un lint error con tsc clean dejaria pasar el push (incorrecto).

### Activation lifecycle

```text
git clone repo                       (agente o humano)
    │
    ▼
pnpm install                         (corre "prepare": "husky")
    │
    ▼
husky activa .git/hooks/pre-commit   (proxy a .husky/pre-commit)
husky activa .git/hooks/pre-push     (proxy a .husky/pre-push)
    │
    ▼
git commit / git push                (hooks se ejecutan automaticamente)
```

**Critical**: `"prepare"` script es estandar npm/pnpm. Cualquier agente que clone + instale dependencias activa los hooks SIN configuracion adicional. Esto es lo que hace el sistema escalable a N agentes.

## Hard rules (multi-agent)

1. **NUNCA** ejecutar `git commit --no-verify` o `git push --no-verify` sin autorizacion explicita del usuario.
2. **NUNCA** desinstalar / deshabilitar / mover los hooks sin discutir antes.
3. **NUNCA** ignorar errores no-fixable haciendo `eslint-disable` masivo. Si una regla genera demasiados errores legitimos, abre task para discutir downgrade a warning o cleanup.
4. **NUNCA** introducir un hook nuevo sin documentarlo aqui (esta spec) + en CLAUDE.md / AGENTS.md.
5. **SIEMPRE** preserve `set -e` en pre-push. Removerlo silencia errores parciales.
6. **SIEMPRE** mantener latencia objetivo: pre-commit < 5s, pre-push < 90s. Si emerge degradacion, optimizar con cache antes de relajar reglas.

## Failure modes (resilience)

| Failure | Comportamiento | Recuperacion |
| --- | --- | --- |
| ESLint cache corrupto | pre-commit lento o falsos positivos | `rm -rf node_modules/.cache/eslint-staged` |
| Husky no instala hooks (raro) | `pnpm install` falla en `prepare` | `npx husky init` manual; revisa permisos `.git/hooks/` |
| Pre-push timeout | > 90s | Cache TS `--incremental` activo? Lint cache activo? Si si, abrir issue |
| Bypass autorizado | `--no-verify` con justification | Documentar en commit message + abrir cleanup task |
| Hook bloquea pero CI pasa | Falsa positiva del hook | Verificar versiones eslint/typescript locales matching CI |

**Honest degradation**: si los hooks fallan por bug en su propio shell script, NO bloquean al agente para siempre. El agente puede ejecutar `git commit --no-verify` con autorizacion del usuario, abrir issue, y el cleanup task arregla el bug del hook. Pero el path "auto-bypass" requiere acto consciente.

## Observability

Hoy:

- stdout del hook visible en cada commit/push.
- Si el hook bloquea, exit code != 0 propaga.
- Si pasa, latencia visible en stdout.

Pendiente (futuro V2 — deuda tecnica documentada):

- Reliability signal `dev_tooling.git_hooks.bypass_rate` (cuenta `--no-verify` en commits del repo).
- Telemetry opcional: tiempo de ejecucion por hook, % de commits bloqueados, tipos de errores mas comunes.

## Frontera con CI

Los hooks NO reemplazan CI. CI sigue corriendo:

- `pnpm lint` (mismo que pre-push)
- `pnpm tsc --noEmit` (mismo que pre-push)
- `pnpm test` (vitest — NO esta en hooks por latencia ~30s + flakiness en tests E2E)
- `pnpm build` (Next.js build — NO esta en hooks por latencia ~3-5min)

CI cubre el caso "el hook se bypaseo" + tests + build. Por eso la regla "NUNCA bypassear sin autorizacion" es load-bearing — si todos los agentes respetan la regla, CI casi nunca falla.

## Frontera con CLAUDE.md / AGENTS.md

CLAUDE.md y AGENTS.md tienen una seccion "Git hooks canonicos" en `## Conventions` / `## Convenciones de Trabajo`. Esa seccion documenta las reglas duras. Esta spec arquitectura documenta el por que + como.

Cuando se modifique el comportamiento de los hooks, actualizar EN ESTE ORDEN:

1. Esta spec (architecture authority)
2. CLAUDE.md / AGENTS.md (rules summary)
3. Doc funcional `docs/documentation/plataforma/git-hooks-pre-commit-pre-push.md`

## Files owned

- `.husky/pre-commit`
- `.husky/pre-push`
- `package.json` (lint-staged block, prepare script, husky/lint-staged deps)
- `CLAUDE.md` (seccion "Git hooks canonicos" en `## Conventions`)
- `AGENTS.md` (seccion "Git hooks canonicos" en `## Convenciones de Trabajo`)
- `docs/architecture/GREENHOUSE_GIT_HOOKS_AUTOENFORCEMENT_V1.md` (esta spec)
- `docs/documentation/plataforma/git-hooks-pre-commit-pre-push.md` (doc funcional)

## Delta YYYY-MM-DD

(reservado para cambios futuros)
