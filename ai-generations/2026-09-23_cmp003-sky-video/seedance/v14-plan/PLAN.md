# V14 · plan de acabado y continuidad

2026-09-24. Plan autorizado posteriormente por «Vamos con todo» y ejecutado en V14. Preparación local USD0. Resultado, cambios sonoros pedidos y costos en ../v14-finish/README.md; no confundir las condiciones iniciales de esta propuesta con el estado posterior.

## Diagnóstico verificado en V13

1. `mix-audio.py`: repite fuente V7 10,6–15,1 s durante15,1–24,4 s. Esa fuente contiene el vuelo; separación de voz no separa música de motor. El reporte auditivo del operador coincide con las repeticiones del código. Retirar el bus musical derivado; no seguir filtrando o atenuando esos motores.
2. `render-picture.py`: velocidad fuente pasa de1,5× a0,6458× en segundo14, sin rampa de velocidad. Además muestrea por redondeo de frame y reencuadra hasta1,95× para liberar nubes. Son causas técnicas de movimiento mecánico; no atribuirlas todas al modelo.
3. Los SFX sintéticos locales no fueron aceptados. La coincidencia de timestamps, un pico de amplitud o ASR no acreditan timbre, emoción ni correspondencia perceptual.

## Prioridad visual y ventana única propuesta

Conservar búsqueda lateral, orden de UI y portal V11. Cartelas mantienen coreografía; URL320 px y morado profundo permanecen como base de revisión.

**Ventana A, prioridad:** entrada MP4 mudo sin cartelas, master11,5–18 s,156 cuadros a24 fps. Fuente: V13 picture-conformed. Objetivo único: sustituir el frenado/reencuadre mecánico posterior al paso cercano por una trayectoria de cámara fluida hacia las mismas nubes. Preservar pasada, identidad y dirección del avión; despejar zona central antes15,75 s. No crear otra aeronave ni disolver entre aviones.

- Inicio11,5–13 s y final16,5–18 s proporcionan contexto de movimiento. Se pide preservarlos, sin confundir la instrucción con bloqueo de píxeles.
- Parte a intervenir13–16,5 s. Revisar especialmente salida del avión y desaceleración de cámara; mantener nube viva bajo cartelas.
- El video es única autoridad espacial. Imágenes externas sólo si un defecto concreto de identidad las exige; no añadir cielos que compitan.
- Omni `edit`,1080p; cualquier audio generado se descarta. No enviar cartelas ni cierre al modelo.
- Elegir empalmes dentro de los márgenes sólo tras comparar resultado. Revisar posición, escala, velocidad, dirección, horizonte, exposición, desenfoque y continuidad del volumen de nubes durante varios cuadros, no sólo el primero/último.
- Si no empalma sin doble avión, congelados, deformación o disolvencias visibles, no integrar ni encadenar otra llamada.

**Ventana B, sólo si queda un defecto perceptible:** unión UI V9→portal V11 alrededor9 s. Contexto7,5–10,5 s; preservar texto y portal. Riesgo alto de alterar letras. Intentar primero ajuste editorial de encuadre/color con fuentes existentes. No encargar esta segunda ventana de entrada.

**Cielo→cierre:** revisar25,5–26 s y resolver localmente el lavado a azul/cambio a morado. No hace falta volver a generar logos/URL/cartelas.

## Sonido, después de cerrar imagen

Una única pista musical instrumental de30 s con desarrollo y resolución propios. V7 es referencia de carácter/energía; el bus separado contaminado no es una fuente instrumental limpia. Buscar primero original musical independiente; si no existe, proponer una sola generación nueva para30 s con presupuesto específico. Sin loops del vuelo, sin voces, coros, vocalizaciones ni guion visual como letra; sin retimar tramos musicales para seguir la imagen.

Arco tentativo (se ajusta al picture final):

| Tiempo | Intención musical | Efectos |
| --- | --- | --- |
| 0–1 s | Inicio contenido, continuidad del arco | Escritura seca y orgánica |
| 1–8,8 s | Crecer desde Enter, pulso moderno y afirmativo | Submit, tres resultados, apertura de respuesta; volumen proporcional |
| 9–10 s | Apertura/crescendo, acento del portal | Energía breve ligada al chip |
| 10–15 s | Máximo de escala y movimiento | UN acercamiento/paso/alejamiento de motor, sólo con avión visible |
| 15,75–23,8 s | Mantener impulso y espacio de lectura | + y SEO/AEO: acentos distintos, ningún motor |
| 24–26 s | Resolver Gracias hacia firma | Transición suave, sin clic artificial de URL |
| 26–30 s | Acorde/resolución de marca con cola hasta final | Sin reiniciar música al cambiar a morado |

Separar stems música, UI, energía, avión y tipografía. SFX orgánicos de biblioteca/proveedor o fuente aprobada; reemplazar los osciladores/ruido genéricos rechazados. Diseñar cada sonido por causa, distancia, dirección y tamaño. No golpe por cada renglón. Asignar una sola trayectoria sonora al avión.

## Ejecución y límites

1. Preparar A y prompt; estimar costo real incluyendo entrada/salida. `--max-usd` del CLI limita sólo output nominal, no factura: no presentarlo como tope contractual.
2. Presentar importe y número de intentos antes de gastar. Esta carpeta no contiene POST ni solicitud enviada.
3. Un piloto A; comparar entrada/centro/salida antes de insertar. El piloto Omni anterior falló por cielo distinto, doble avión y escala de salida: no repetir ese alcance amplio ni la referencia múltiple conflictiva.
4. Fijar imagen y cues; obtener música instrumental independiente y SFX sólo entonces.
5. Mezclar y revisar reproducción completa. El agente no recibe audio en esta sesión: una revisión auditiva humana es un gate real para aprobar timbre/continuidad, no sustituible por waveforms/ASR. Presentar una sola mezcla candidata y stems si hay corrección localizada.
6. Exportar1080×1920,30 s/24 fps y conservar versión anterior. Sin publicación.

## Evidencia técnica de Omni

CLI revisada: `src/lib/ai/gemini-omni-cli.ts` y manual local. `edit` recibe MP4; `frames` es otro modo. No hay máscara ni bloqueo exacto de extremos implementado en esta ruta. Google publica entrada de video hasta10 s y edición1080p; no es garantía de empalme.

- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/omni-1-1-flash
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/edit-videos
