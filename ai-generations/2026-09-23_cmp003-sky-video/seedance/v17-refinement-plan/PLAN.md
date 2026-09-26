# SKY V17 — propuesta de refinamiento, sin exportación nueva

Estado: plan autorizado por el operador («Vamos, sí»); ejecución y evidencia en README.md. V16 entregado permanece intacto. Costo nuevo: USD 0.

## Evidencia

- V16 revisado en `qa/reading-hold-timing.jpg`: respuesta completa alrededor de 5,5 s; chip visible alrededor de 5,75 s y establecido a 6 s. La espera continúa hasta aproximadamente 9 s. El acercamiento y transformación ocupan el tramo siguiente; avión visible a 9,5833 s.
- Se propone reducir la espera anterior a la activación, conservando la aparición del chip y la transformación a su velocidad actual.
- V16 confirmado: 2160×3840 y 1080×1920, 24 fps, 720 cuadros, 30 s, Rec.709. El 4K es restaurado desde 1080p.

## Montaje propuesto

Comprimir suavemente el tramo fuente 6–9 s de 72 a 60 cuadros: reducción de 12 cuadros / 0,5 s, velocidad media 1,2×. Mantener los extremos continuos y comprobar el cielo en movimiento. No crear cuadros mediante interpolación óptica. Si la selección de cuadros produce saltos perceptibles, ajustar el mapa temporal antes de exportar.

Esta propuesta acorta la duración a **29,5 s / 708 cuadros**. Duración aprobada por el operador al aceptar esta propuesta. Evita desplazar la espera a otro momento del video. Si se requiere conservar exactamente 30 s, debe resolverse la distribución de esos 12 cuadros y la cola musical antes de ejecutar, sin insertar silencio.

| Evento | V16 | Propuesta |
| --- | ---: | ---: |
| Tramo de lectura estable | 6–9 s | 6–8,5 s |
| Pico de transformación | 9,5833 s | 9,0833 s |
| Paso principal del avión | 12,5 s | 12 s |
| Inicio de cartelas | 15,75 s | 15,25 s |
| Inicio del cierre | 26 s | 25,5 s |
| Fin | 30 s | 29,5 s |

## Audio

Usar los stems existentes; no generar nuevos. Desplazar el stem musical completo 0,5 s hacia el inicio: entrada de 1,61 a 1,11 s, todavía después de Enter (~0,996 s). Conservar toda la interpretación y su tempo, sin empalmes internos. Desplazar transformación, avión y cierre 0,5 s, manteniendo sus relaciones musicales. Mantener teclado/Enter/resultados/chat iniciales en sus tiempos actuales. Rehacer la mezcla desde stems, no cortar el master estéreo. Volver a medir LUFS, true peak y continuidad. No hay revisión auditiva perceptual disponible en esta sesión.

## Logo de SKY

El antiguo `kit/refs/sky-white.svg` une la punta de la flecha y el trazo vertical en x=92,7866. En blanco esa unión oculta la separación que muestra la referencia de la diseñadora.

El asset del repositorio `src/lib/artifact-composer/catalogs/deck-axis/assets/clients/sky-on-dark.svg` conserva esa separación: punta x=34,8015 y trazo x=35,2812, dentro de un viewBox de 68 unidades. Su comentario registra procedencia del header oficial; no se verificó nuevamente el sitio en esta revisión.

`sky-white-separated.svg` conserva exactamente su geometría y convierte el verde en blanco. Vista de prueba: `qa/sky-white-proposed.png`. A 250 px de ancho la separación es aproximadamente 1,76 px, por lo que debe revisarse también después de la compresión 1080p.

Sustituir solamente el logo SKY del cierre en una variante del overlay, manteniendo su tamaño, posición y jerarquía. Conservar Efeonce, divisor, URL de 320 px con fusión Luminosity, animaciones y paso azul→morado. No sobrescribir el paquete aprobado V10.

## Calidad y verificación

Recomponer desde `v16-brand-repair/topaz-full-4k.mp4` y las capas originales sin pérdidas. No usar el MP4 1080p entregado como fuente ni volver a restaurar. Conservar resolución, 24 fps y Rec.709. Realizar una única compresión final por resolución desde la composición; no encadenar MP4 sobre MP4. Un MP4 con compresión con pérdida no permite prometer identidad de píxeles, aunque se evite la degradación acumulada.

Antes de entregar: revisar todos los cuadros del tramo retimado y la activación, comparar cuadros equivalentes de avión/títulos/cierre con V16, inspeccionar el hueco de la flecha en ambas resoluciones y verificar duración/cuadros/color/audio. Ninguna nueva llamada pagada es necesaria.
