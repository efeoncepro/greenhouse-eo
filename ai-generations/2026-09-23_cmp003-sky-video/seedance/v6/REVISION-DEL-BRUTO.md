# Revisión visual del bruto v6

**Resultado: rechazado para entrega final.** Inspección de 120 fotogramas a 4 fps, más metadata ffprobe. 30,0417 s, 720×1280, 24 fps, solo un stream de vídeo: audio realmente desactivado.

## Avances verificables

- Macro lateral pronunciado de la búsqueda en el primer bloque.
- Avión con materiales y luz fotográficos y sin humo visible.
- Tercera vista trasera: el avión se aleja y reduce su escala. Ya no reinicia una aproximación frontal.
- Cierre azul y posterior cambio a morado presentes.

## Fallos que impiden aprobar

- Primeros ~5,8 segundos reproducen el contenido narrativo del vídeo de referencia Minimax, incluyendo su macro con tipografía demasiado condensada.
- A ~5,8 s vuelve a comenzar la búsqueda y luego los resultados. Repetición no solicitada.
- La cita del segundo bloque aparece sobre resultados, en vez de sobre una respuesta LLM.
- Falta el beat del turno del usuario solo.
- Vuelo demasiado largo: aproximación y underside entre ~10 y15 s, alejamiento hasta ~18 s.
- A ~18 s vuelve otra caja de búsqueda antes del primer anuncio.
- Textos finales aparecen pequeños y casi estáticos; la agencia se escribe palabra a palabra.
- Los logos finales generados presentan deformaciones. URL de contraste insuficiente.

## Corrección en ejecución

Una edición Seedance de TODO el vídeo de 30 s, `task=editing`, con el bruto como único vídeo fuente y las 30 imágenes de referencia. Se elimina Minimax como referencia de vídeo en esta etapa: la edición reemplaza el timeline completo, corrige repeticiones, acelera el paso de avión y restablece los cuatro mensajes. Audio continúa desactivado. Prompt completo: `correct-full-film.prompt.txt`.

No se ensamblan generaciones por tramos. Una corrección del cierre con activos oficiales, si hace falta, es acabado gráfico y no una sustitución del vuelo generado.
