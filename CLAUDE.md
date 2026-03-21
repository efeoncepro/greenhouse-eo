# CLAUDE.md

## Project Overview

Greenhouse EO — portal operativo de Efeonce Group. Next.js App Router + MUI v5 + Vuexy starter-kit. Deploy en Vercel.

## Quick Reference

- **Package manager:** `pnpm` (siempre usar `pnpm`, no `npm` ni `yarn`)
- **Build:** `pnpm build`
- **Lint:** `pnpm lint`
- **Test:** `pnpm test` (Vitest)
- **Type check:** `npx tsc --noEmit`
- **PostgreSQL health:** `pnpm pg:doctor`

## Key Docs

- `AGENTS.md` — reglas operativas completas, branching, deploy, coordinación
- `project_context.md` — arquitectura, stack, decisiones, restricciones
- `Handoff.md` — trabajo en curso, riesgos, próximos pasos
- `docs/tasks/README.md` — pipeline de tareas `CODEX_TASK_*`
- `docs/architecture/` — specs de arquitectura canónicas

## Task Lifecycle Protocol

Todo agente que trabaje sobre una `CODEX_TASK_*` debe gestionar su estado en el pipeline de tareas. Las tareas viven en `docs/tasks/{to-do,in-progress,complete}/` y su índice es `docs/tasks/README.md`.

### Al iniciar trabajo en una task
1. Mover el archivo de la task de `to-do/` a `in-progress/`
2. Actualizar `docs/tasks/README.md` — cambiar estado a `In Progress`
3. Registrar en `Handoff.md` qué task se está trabajando, rama y objetivo

### Al completar una task
1. Mover el archivo de `in-progress/` a `complete/`
2. Actualizar `docs/tasks/README.md` — mover entrada a sección `Complete` con resumen de lo implementado
3. Documentar en `Handoff.md` y `changelog.md`
4. Ejecutar el chequeo de impacto cruzado (ver abajo)

### Chequeo de impacto cruzado (obligatorio al cerrar)
Después de completar implementación, escanear `docs/tasks/to-do/` buscando tasks que:
- **Referencien archivos que se modificaron** → actualizar su sección "Ya existe"
- **Declaren gaps que el trabajo acaba de cerrar** → marcar el gap como resuelto con fecha
- **Tengan supuestos que los cambios invaliden** → agregar nota delta con fecha y nuevo estado
- **Estén ahora completamente implementadas** → marcar para cierre y notificar al usuario

Regla: si una task ajena cambió de estado real (un gap se cerró, un supuesto cambió), agregar al inicio del archivo:
```markdown
## Delta YYYY-MM-DD
- [descripción del cambio] — cerrado por trabajo en [task que lo causó]
```

### Dependencias entre tasks
Cada task activa debe tener un bloque `## Dependencies & Impact` que declare:
- **Depende de:** qué tablas, schemas, o tasks deben existir antes
- **Impacta a:** qué otras tasks se verían afectadas si esta se completa
- **Archivos owned:** qué archivos son propiedad de esta task (para detectar impacto cruzado)

Cuando un agente modifica archivos listados como "owned" por otra task, debe revisar esa task y actualizar su estado si corresponde.

### Reclasificación de documentos
Si un archivo en `docs/tasks/` no es una task sino una spec de arquitectura o referencia:
- Moverlo a `docs/architecture/`
- Actualizar `docs/tasks/README.md` con nota de reclasificación
- Si tiene gaps operativos pendientes, crear una task derivada en `to-do/`

## Conventions

- Componentes UI compartidos: `src/components/greenhouse/*`
- Vistas por módulo: `src/views/greenhouse/*`
- Lógica de dominio: `src/lib/*`
- Tests unitarios: Vitest + Testing Library + jsdom
- Helper de render para tests: `src/test/render.tsx`
- Line endings: LF (ver `.gitattributes`)
- Commit format: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
