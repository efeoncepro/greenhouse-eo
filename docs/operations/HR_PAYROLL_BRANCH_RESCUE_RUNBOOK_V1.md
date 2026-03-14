# HR Payroll Branch Rescue Runbook V1

## Objetivo
Rescatar el trabajo no committeado de `HR Payroll` que hoy vive en un worktree incorrecto y reubicarlo en una rama propia sin perder cambios ni mezclar iniciativas.

## Cuándo usar este runbook
- Cuando `backend`, `frontend` o `infraestructura` de `HR Payroll` existen en el árbol local pero no tienen commit.
- Cuando el worktree activo está en una rama ajena al módulo, por ejemplo `feature/admin-tenant-detail-redesign`.
- Cuando otro agente reportó trabajo hecho en otra rama, pero Git todavía no refleja ese trabajo porque sigue sin commit.

## Regla operativa
Primero rescatar el trabajo. Después limpiar el historial.

No usar como primer movimiento:
- `git checkout` a otra rama con el árbol sucio
- `git stash -> develop -> apply`
- una rama separada de `infra` salvo que después se confirme que esa infraestructura debe salir por sí sola

## Estrategia recomendada
1. Confirmar el estado real del worktree.
2. Crear `feature/hr-payroll` desde el estado actual del árbol, sin perder cambios.
3. Separar el trabajo en 2 commits lógicos.
4. Verificar el módulo en la nueva rama.
5. Solo después decidir si hace falta rebase, cherry-pick o extracción adicional.

## Paso a paso

### 1. Confirmar el estado real
Ejecutar:

```bash
git branch --show-current
git status --short
git log --oneline --decorate -n 8
git branch --list
```

Validar:
- que el worktree activo no sea ya `feature/hr-payroll`
- que los cambios de payroll sigan sin commit
- que no haya duda sobre qué archivos pertenecen a payroll y cuáles al trabajo original de la rama

### 2. Crear la rama correcta sin perder el árbol
Ejecutar:

```bash
git switch -c feature/hr-payroll
```

Resultado esperado:
- la nueva rama nace desde el commit actual
- el árbol sucio permanece intacto
- no se usa `stash`

### 3. Separar en 2 commits lógicos

#### Commit 1: infraestructura reusable
Incluir solo piezas reutilizables, por ejemplo:
- `src/components/card-statistics/*`
- `src/components/dialogs/*`
- `src/hooks/*`
- `src/libs/styles/AppReactDatepicker.tsx`
- `src/libs/styles/AppReactDropzone.ts`
- `src/libs/styles/AppReactToastify.tsx`

Ejemplo:

```bash
git add src/components/card-statistics src/components/dialogs src/hooks src/libs/styles/AppReactDatepicker.tsx src/libs/styles/AppReactDropzone.ts src/libs/styles/AppReactToastify.tsx
git commit -m "feat: add reusable payroll ui infrastructure"
```

#### Commit 2: HR Payroll
Incluir lo específico del módulo:
- `src/app/(dashboard)/hr/**`
- `src/app/api/hr/payroll/**`
- `src/views/greenhouse/payroll/**`
- `src/lib/payroll/**`
- `src/types/payroll.ts`
- `bigquery/greenhouse_hr_payroll_v1.sql`
- `bigquery/greenhouse_identity_access_v1.sql`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/lib/tenant/access.ts`
- `src/lib/tenant/authorization.ts`
- documentación viva del módulo

Ejemplo:

```bash
git add src/app/'(dashboard)'/hr src/app/api/hr/payroll src/views/greenhouse/payroll src/lib/payroll src/types/payroll.ts bigquery/greenhouse_hr_payroll_v1.sql bigquery/greenhouse_identity_access_v1.sql src/components/layout/vertical/VerticalMenu.tsx src/lib/tenant/access.ts src/lib/tenant/authorization.ts Handoff.md project_context.md changelog.md
git commit -m "feat: implement hr payroll module"
```

## Verificación mínima
Ejecutar en `feature/hr-payroll`:

```bash
git diff --check
pnpm exec eslint src/lib/payroll src/app/api/hr/payroll src/views/greenhouse/payroll src/app/'(dashboard)'/hr
pnpm build
```

Si hubo bootstrap real contra BigQuery, registrar también:
- si las tablas `greenhouse.payroll_*` existen
- si el rol `hr_payroll` quedó sembrado
- si la query real de KPIs corre contra `notion_ops.tareas`

## Qué no hacer
- No mezclar este rescate con `team capacity`, `creative hub` u otra iniciativa histórica.
- No resetear ni limpiar el árbol con comandos destructivos.
- No asumir que el trabajo “vive” en una rama solo porque otro agente la mencionó; si no hay commit, vive en el worktree actual.
- No abrir una rama extra de `infra` antes de rescatar el trabajo principal.

## Cuándo abrir una rama extra de infraestructura
Solo si, después de rescatar `feature/hr-payroll`, se confirma que:
- la infraestructura reusable no depende del módulo
- será consumida por otras iniciativas inmediatas
- conviene revisarla y mergearla por separado

Hasta entonces, mantener:
- `Commit 1`: infraestructura reusable
- `Commit 2`: módulo `HR Payroll`

## Señal de cierre
El rescate queda correctamente hecho cuando:
- `feature/hr-payroll` contiene ambos commits
- el worktree ya no depende de memoria conversacional para saber dónde vive payroll
- `Handoff.md` documenta validación, riesgos y próximos pasos
