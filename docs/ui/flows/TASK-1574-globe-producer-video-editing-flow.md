# TASK-1574 — Globe Producer Video Editing flow

## Primary flow

1. El productor abre un video gobernado en el Cinematic Canvas.
2. Elige “Editar video” y selecciona “Editar toma” o “Continuar edición” cuando existe un parent chainable.
3. Selecciona un plano o un intervalo dentro de la timeline real; el reproductor mantiene el frame actual.
4. Elige la intención: Agregar, Eliminar, Reemplazar o Cambiar acción.
5. Añade referencias opcionales y asigna roles explícitos: objeto, personaje, estilo, movimiento o escena.
6. Escribe una instrucción temporalmente clara y revisa qué se preservará.
7. Globe muestra ruta compatible, audio policy, limitaciones, duración y estimate server-side.
8. Cambios en rango, prompt, referencias, modelo o preservación invalidan el estimate visible.
9. Confirma “Editar toma”; el cliente envía sólo assetRefs, roles, scope neutral y prompt.
10. Globe crea un video hijo y muestra original/resultado con reproducción sincronizada y loop del intervalo.

## Alternate and recovery flows

- Video externo no gobernado: dirigir a ingest autorizado; no enviar directo al provider.
- Parent no chainable: ofrecer edición reference-based sólo si el catálogo la soporta y explicar que es una nueva
  interpretación, no una continuación estricta.
- Ruta gated/unsupported: conservar la configuración y mostrar la razón sin ejecutar.
- Intervalo inválido o cruzando planos: sugerir seleccionar una toma; no construir una máscara implícita.
- Estimate stale: mantener el valor atenuado y exigir revalidación antes de gastar.
- Provider failure/unknown outcome: reconciliar por reader; conservar prompt, referencias y selección.
- Resultado degradado: marcar drift/flicker/audio no preservado; no presentarlo como aprobado automáticamente.
- Mobile: el rail se apila bajo el stage sin overflow; el intervalo se ajusta con handles grandes y accesibles.

## Keyboard and accessibility contract

- Tab alcanza close, play, timeline, scene selector, intent, reference roles, prompt, estimate y execute.
- Arrow keys seekan sólo cuando la timeline tiene focus; no secuestran el scroll global.
- Escape sale del rail antes de cerrar el dialog; el focus vuelve a la card que abrió el video.
- Cada estado async se anuncia; no depender sólo de color o movimiento.
- Reduced motion elimina transiciones sin perder progreso, comparación ni focus.
