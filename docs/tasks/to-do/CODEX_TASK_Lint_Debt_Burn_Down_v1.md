# CODEX_TASK_Lint_Debt_Burn_Down_v1

## Resumen

Cerrar la deuda actual de `eslint` del repo para recuperar un camino confiable de verificación con `pnpm lint` y evitar que cambios pequeños sigan chocando contra una base ruidosa de errores mecánicos.

Esta task no es un refactor funcional.
Su objetivo es dejar el repo en estado `lint-clean` sin cambiar comportamiento de producto.

## Contexto

Estado observado en `eslint` al 2026-03-22:
- `399` errores
- `11` warnings
- `108` archivos afectados
- `365` errores y `4` warnings potencialmente autofixables

Reglas dominantes:
- `padding-line-between-statements`
- `newline-before-return`
- `lines-around-comment`
- `@typescript-eslint/no-unused-vars`
- `import/order`

Distribución principal:
- `scripts/*`
- `src/lib/*`
- `src/app/api/*`
- `src/views/*`

## Objetivo

Recuperar un baseline donde:
- `pnpm lint` pase en cero errores
- los warnings restantes se eliminen o se reduzcan a un set explícitamente aceptado
- la deuda mecánica no siga mezclada con cambios funcionales normales

## Dependencias & Impacto

### Depende de
- configuración ESLint actual del repo
- convenciones activas de imports, comments y spacing
- árbol actual sin asumir refactors funcionales paralelos

### Impacta a
- cualquier lane que hoy quiera validar con `pnpm lint`
- PRs y ramas de integración que dependen de GitHub Actions
- follow-ups de `Notification System`, `Webhook Infrastructure`, `Payroll`, `Finance`, `People` y módulos transversales porque todos comparten el mismo baseline de lint

### Archivos owned
- `docs/tasks/to-do/CODEX_TASK_Lint_Debt_Burn_Down_v1.md`
- `docs/tasks/README.md`
- opcionalmente `Handoff.md` al iniciar/cerrar ejecución
- durante implementación: solo los archivos corregidos por la lane, idealmente en slices acotados por carpeta

## Alcance

### Slice 1 — Autofix masivo controlado

Ejecutar primero:

```bash
pnpm exec eslint . --ext .js,.jsx,.ts,.tsx --fix
```

Objetivo:
- absorber la deuda mecánica repetitiva
- separar lo fixable de lo realmente manual

Guardrail:
- revisar el diff antes de commit
- no mezclar este autofix con cambios de producto

### Slice 2 — Remanente manual no-fixable

Limpiar los errores que normalmente requieren criterio:
- `@typescript-eslint/no-unused-vars`
- `@typescript-eslint/no-require-imports`
- `import/no-duplicates`
- `import/no-named-as-default-member`
- `@typescript-eslint/consistent-type-imports`

### Slice 3 — Burn-down por carpetas

Orden recomendado:
1. `scripts/*`
2. `src/app/api/*`
3. `src/lib/*`
4. `src/views/*`
5. `src/components/*`, `src/types/*`, `src/test/*`

### Slice 4 — Verificación final

Objetivo de cierre:

```bash
pnpm lint
```

Opcional recomendado:

```bash
npx tsc --noEmit
pnpm test
```

## Reglas de implementación

- No cambiar comportamiento de negocio solo para “hacer pasar lint”.
- Si un error revela código muerto o ambiguo, preferir eliminarlo antes que silenciarlo.
- No desactivar reglas globales para cerrar esta lane rápido.
- Si un archivo tiene cambios funcionales abiertos de otra lane, coordinar antes de editarlo masivamente.
- Si aparece un conflicto entre lint y una convención viva del repo, documentar la decisión en `Handoff.md`.

## Riesgos

- Un autofix global puede cruzarse con archivos que otros agentes estén tocando en paralelo.
- Algunos `unused vars` o `require()` pueden esconder trabajo incompleto y no solo ruido.
- Si se hace en un solo lote gigante, el review se vuelve difícil y el riesgo de conflictos sube.

## Estrategia recomendada

No ejecutar esta task como un único mega-commit.

Mejor dividirla en 2 o 3 PRs/commits:
1. `scripts/*`
2. `src/app/api/*` + `src/lib/*`
3. `src/views/*` + remanente final

## Criterio de cierre

- `pnpm lint` pasa
- no se introdujeron desactivaciones masivas de reglas
- el diff fue mayoritariamente mecánico y sin regresiones funcionales detectadas
- `Handoff.md` deja claro qué carpetas se tocaron y cómo se validó

## Notas

- Esta task existe para desacoplar higiene de código de cambios funcionales.
- Mientras siga abierta, conviene evitar mezclar “autofix incidental” dentro de otras lanes grandes.
