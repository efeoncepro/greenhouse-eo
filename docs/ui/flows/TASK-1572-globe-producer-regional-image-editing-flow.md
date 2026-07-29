# TASK-1572 — Globe Producer Regional Image Editing flow

## Primary flow

1. El productor abre una imagen elegible en el Focus Canvas existente.
2. Elige “Editar imagen” y luego “Editar zona”. Si la capability no está disponible, la acción muestra la razón.
3. El viewer entra en modo selección sin abrir un segundo dialog.
4. Pinta, borra, deshace, rehace, hace zoom o usa la selección rectangular accesible.
5. Elige Reemplazar, Eliminar o Agregar y ve cobertura y aviso de preservación.
6. Escribe la instrucción. La UI solicita el estimate gobernado; nunca calcula el costo localmente.
7. Elige Preciso o Natural. Cambiar máscara, intención, fuente o modo invalida el estimate visible.
8. Confirma “Editar zona”. El cliente envía sólo la referencia gobernada de la máscara y el payload neutral.
9. Globe crea un experimento hijo; el original permanece inmutable y aparece “Retoque en curso…”.
10. El resultado aparece con compare Original/Retoque. Puede aceptarlo, reintentar con la misma máscara o continuar.

## Alternate and recovery flows

- Máscara vacía: bloquear ejecución y anunciar “Selecciona una zona antes de continuar.”
- Ruta no soportada: conservar imagen y prompt; explicar que el modelo no admite edición regional.
- Estimate stale/expired: conservarlo visible, pero exigir nuevo estimate antes del gasto.
- Provider failure: conservar padre, máscara y prompt; no crear un hijo fantasma.
- Unknown outcome: reconciliar mediante el reader existente; nunca reintentar a ciegas.
- Preservación estricta degradada: marcar resultado degraded; no afirmar preservación exacta sin evidencia.
- Mobile: rail apilado/bottom sheet sin overflow horizontal.

## Keyboard and accessibility contract

- Tab llega a close, modo, intención, selección, prompt, estimate y execute.
- Canvas ofrece selección rectangular accesible y anuncia cobertura/estado de máscara.
- Escape sale primero del modo selección; segundo Escape cierra y restaura foco.
- Undo/redo tiene controles etiquetados; ningún gesto es el único camino.
- Reduced motion mantiene los mismos estados y acciones con transiciones instantáneas.
