# Mini Task Index

Panel operativo para cambios chicos que no son incidentes (`ISSUE-###`) ni ameritan una task grande (`TASK-###`), pero sí merecen quedar trazados antes de ejecutarse.

## Convención

- Las mini-tasks usan `MINI-###` como ID estable.
- Los archivos viven en `docs/mini-tasks/{to-do,in-progress,complete}/`.
- El modelo operativo canónico vive en `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`.
- La plantilla copiable vive en `docs/mini-tasks/MINI_TASK_TEMPLATE.md`.
- Si una mini-task crece de alcance, toca arquitectura shared o deja de ser claramente acotada, debe promoverse a `TASK-###`.
- Si el hallazgo es una falla real de runtime, debe abrirse como `ISSUE-###`, no como mini-task.

## Cuándo usar esta lane

Usar `MINI-###` para cambios como:

- mejoras de UX/copy muy acotadas
- pequeños ajustes de data quality
- defaults de formularios
- validaciones o dropdowns locales
- follow-ups de observación rápida que no conviene dejar solo en chat

## Siguiente ID disponible

`MINI-004`

## To Do

Sin mini-tasks pendientes.

## In Progress

Sin mini-tasks en curso.

## Complete

| ID         | Título | Dominio | Impacto | Estado |
| ---------- | ------ | ------- | ------- | ------ |
| `MINI-001` | [OC debe seleccionar contacto desde lista asociada al cliente](complete/MINI-001-po-client-contact-selector.md) | finance | Medio | complete |
| `MINI-002` | [HES debe usar contacto vinculado al cliente y heredar respaldo desde la OC](complete/MINI-002-hes-client-contact-and-po-document-inheritance.md) | finance | Medio | complete |
| `MINI-003` | [OC debe permitir cargar respaldo después del registro para que HES lo herede](complete/MINI-003-po-post-create-document-upload-for-hes-inheritance.md) | finance | Medio | complete |
