# ISSUE-039 — Modal de “Cambiar supervisor” bloquea guardar sin validación visible

## Ambiente

staging

## Detectado

2026-04-10, auditoría browser sobre `HR > Jerarquía`

## Síntoma

El botón `Guardar cambio` queda deshabilitado cuando la razón está vacía, pero la UI no muestra un error inline ni explica por qué no se puede guardar.

Reproducción observada:

1. Abrir `HR > Jerarquía`
2. Abrir `Cambiar supervisor`
3. Seleccionar miembro, supervisor y fecha
4. Dejar `Razón` vacía
5. El botón queda deshabilitado sin feedback adicional

En browser automation sobre staging:

- `reason = ""`
- `date = "2026-04-10"`
- `saveDisabled = true`

## Causa raíz

La capacidad de envío depende de `changeForm.reason.trim()`, pero el campo solo tiene helper text estático y no entra en estado de error cuando falta el valor.

Referencias:

- [HrHierarchyView.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/hr-core/HrHierarchyView.tsx#L836)
- [HrHierarchyView.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/hr-core/HrHierarchyView.tsx#L2035)
- [HrHierarchyView.tsx](/Users/jreye/Documents/greenhouse-eo/src/views/greenhouse/hr-core/HrHierarchyView.tsx#L2059)

## Impacto

- El usuario interpreta que “no deja guardar” aunque el bloqueo sea solo de validación local.
- Se pierde tiempo diagnosticando backend cuando el problema está en UX.
- La ruta crítica del módulo queda opaca justo en una acción administrativa sensible.

## Solución

Agregar validación visible de campo requerido:

- estado `error`
- mensaje contextual cuando falta la razón
- opcionalmente CTA disabled con explicación explícita o submit permitido con validación al intentar guardar

## Verificación

1. Abrir el modal con la razón vacía.
2. Confirmar que la UI indique claramente que la razón es requerida.
3. Completar la razón y verificar que `Guardar cambio` se habilite de forma predecible.

## Estado

open

## Relacionado

- [TASK-325](../../tasks/complete/TASK-325-hr-hierarchy-admin.md)
