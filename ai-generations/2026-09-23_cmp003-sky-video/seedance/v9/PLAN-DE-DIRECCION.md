# SKY × Efeonce · v9 · dirección y ejecución

Fecha: 2026-09-24. Autorización: analizar con alta profundidad y detalle, después ejecutar. Proveedor indicado posteriormente por el operador: **fal**.

## 1. Objetivo y límites

Una generación Seedance 2.5 completa, 30 s, 9:16, 1080p nativo solicitado, bitrate alto. La generación debe resolver la película entera, no producir planos sueltos para ensamblarlos como si fueran una generación continua. Se prepara un animatic de referencia que comunica el orden, timing y movimientos. Este animatic es un insumo, no se presentará como resultado generativo.

La música y los SFX se conforman después sobre la película completa. Sin narración ni lectura de cartelas. La precisión de cámara/texto del modelo se verifica; no se promete obediencia perfecta por usar fal. Fal aporta un payload explícito y seguimiento de la cola, no una garantía creativa superior al mismo modelo en otro proveedor.

## 2. Auditoría de lo hecho

### Evidencia observada

V8 revisada a 12 fps: 361 muestras, 16 hojas con timestamps (`audit/`). Revisión anterior a 4 fps insuficiente para valorar aceleraciones y orden interno de entradas. Se comparan prompt efectivo, 30 referencias realmente enviadas, piezas fuente y revisiones de v6/v7. No confundir la v6 acabada por composición editorial con un bruto íntegro del modelo.

| Elemento | Lo que funciona | Lo que falla | Decisión |
|---|---|---|---|
| Cielo | Fotográfico, horizonte con profundidad, luz dorada y azul consistentes | Mucho espacio sin uso en cartelas pequeñas | Mantener mundo y luz; aumentar jerarquía del texto |
| Escritura | Seguimiento lateral comunica actividad | 0–2,17 s recorta la pregunta; Enter poco claro | Mantener lateral breve, limitar acercamiento y mostrar campo entero antes de Enter |
| Resultados | Aparición escalonada y vista oblicua, 2,67–4,1 s | Reaparecen 5,58–7,67 s, gastando el tiempo del chat | Una sola aparición; salida visual irreversible en la guía |
| AEO | Referencia fuente contiene respuesta legible | El render no muestra respuesta LLM; el chip tapa la tercera tarjeta | Referencias distintas para usuario, despliegue y respuesta completa; secuencia animada explícita |
| Cita | Morado/lima y avance hacia ella son reconocibles | Chip demasiado grande, no adjunto a una respuesta | Chip dentro del contenedor de respuesta; acercamiento solo al final de su pausa |
| Avión | Aproximación 10,17–12,9, pasada 13–13,17 y alejamiento 13,25–15,5 forman una acción continua; luz/material mucho mejores | Se desvanece 15,67–15,92; la trayectoria no debe convertirse en un avión que frena al cambiar de vista | Conservar esos fotogramas como movimiento en el animatic, sin retimar su núcleo; pedir transición final motivada |
| Año | Texto correcto | Título pequeño que flota y se desplaza sin jerarquía | Dos líneas grandes, entrada corta lateral y reposo |
| +2.000 | Número y palabra reconocibles | Plus no actúa solo; color pasa a todo el número | Plus separado como elemento y como estado de entrada; número blanco constante |
| Agencia | Cartela final legible | «su agencia» aparece antes de completar «Y ahora nos eligió como» | Orden visual introductorio → agencia → SEO/AEO, con pausa posterior |
| Gracias | Mensaje claro | Cierre llega casi 2 s tarde respecto al plan | Reservar 26–30 s al cierre |
| Logos/URL | Azul antes de morado, sin vuelta al cielo | URL diminuta y casi invisible; logos sintetizados | Referencias nuevas desde SVG oficiales y URL con contraste medido, mayor tamaño |
| Audio | Operador aprobó identidad musical y SFX de v7 | v7/v8 narran aunque el prompt lo prohíbe; ASR v8 reconoce SEO-DO | Desactivar generación de audio, reutilizar fuente aprobada limpia y conformar SFX |

### Errores propios de preparación

1. Traté la repetición verbal de «sin voz» como principal control, aun teniendo evidencia de que fallaba. El control efectivo es `generate_audio=false` y excluir audio del bruto al conformar.
2. Envié 30 referencias mezclando estados, piezas aisladas y perspectivas alternativas. Había redundancia en resultados y poca explicación visual del cambio a chat. Es una hipótesis causal, no un diagnóstico del mecanismo interno del modelo.
3. Pedí conservar el avance de cámaras sin aportar en v8 una referencia temporal del movimiento aprobado; los stills fijan apariencia, no velocidad.
4. Pedí plus independiente pero la referencia lo mostraba unido al número. Ahora hay elemento aislado y animación explícita.
5. El guion exigía demasiadas llegadas cerca de final, sin un recurso visual temporal que protegiera pausas. Ahora todos los tiempos están en un animatic de 720 cuadros.
6. Dejé parámetros de entrega en 720p y no cerré el seguimiento hasta QA. Esta iteración declara 1080p, conserva request_id y no se da por terminada al salir de cola.

## 3. Tres cámaras: función, ángulos y continuidad

Son **tres rigs virtuales recurrentes para toda la película**, no tres cortes obligatorios por objeto. Las focales y ángulos son instrucciones artísticas para Seedance, no parámetros físicos garantizados de la API.

- **A / lectura y héroe:** frontal, equivalente 50 mm, horizonte nivelado. En UI y títulos, plano suficientemente abierto para leer. Puede descender para acompañar la respuesta o avanzar al chip. En avión, frontal tres cuartos, retirada más lenta que el avión: crece en cuadro porque se aproxima.
- **B / proximidad y energía:** lateral izquierda, equivalente 35 mm en UI/títulos, perspectiva inicial 12–18° que vuelve a frontal. En vuelo, equivalente 28–35 mm, baja y por fuera del fuselaje, permite pasada cercana; nunca atraviesa el avión. Acciones rápidas cortas seguidas de reposo.
- **C / profundidad y escala:** elevada oblicua, equivalente 45–50 mm, inclinación moderada de 8–15° sobre interfaz. En vuelo, seguimiento trasero lateral tipo dron/cámara aérea, avión alejándose continuamente; cámara más lenta. En cartela SEO/AEO, pequeño descenso y arco hasta frontal antes de leer.

La cámara no está pegada al sujeto. Nubes cercanas se desplazan más que horizonte. Mantener el mismo lado del eje de vuelo y el rumbo; no invertir en pantalla ni desacelerar el avión al cambiar encuadre. La pasada oculta el cambio de punto de vista. No añadir una cuarta vista frontal después del alejamiento.

## 4. Guion técnico y sonoro (30 s)

| Tiempo | Imagen y copy | Cámara / movimiento | Sonido y pausa |
|---|---|---|---|
| 0–0,20 | Campo vacío, cursor | B oblicua leve, campo completo | Silencio digital real |
| 0,20–1,65 | «¿A dónde viajar en Sudamérica?» se escribe | B desliza hacia A sin cortar los extremos | Teclas secas breves, sin música |
| 1,65–2 | Enter, confirmación visible | A se estabiliza; campo sube para resultados | Un clic de Enter; arranque instrumental en 1,80 |
| 2–3,65 | Camboriú, Mendoza, Puerto Fuy entran una vez | C oblicua leve, escalón de profundidad; se acerca a A | Tres ticks en cada llegada, pulso musical ascendente |
| 3,65–4,30 | Resultados se retiran; campo pierde lupa y se convierte en turno de usuario a la derecha | A, descenso corto y continuo; pregunta sola visible | Whoosh corto de transición; respirar después |
| 4,30–6,05 | Respuesta se abre hacia abajo, tres grupos semánticos | A acompaña el borde inferior; perspectiva se estabiliza | Tres acentos suaves, sin lectura hablada |
| 6,05–8,65 | Respuesta completa + chip morado adjunto: «Tres ideas: Camboriú, por sus playas; Mendoza, por sus bodegas; y Puerto Fuy, por sus lagos y volcanes.» | A estable; deriva de fondo mínima, texto inmóvil | Música crece sin tapar microsonidos. La lectura empieza con el primer grupo en 4,45 |
| 8,65–10 | Chip presiona y brilla; avance a su interior; cielo emerge | Push A dirigido al centro real del chip, no al centro arbitrario del lienzo | Clic táctil en 8,65; shimmer y riser; pequeño hueco antes del avión |
| 10–12,95 | Avión real en aproximación y tres cuartos, mismo A320neo | A: conservar evolución de escala/dirección de v8 | Motor crece, música abre registro |
| 12,95–13,25 | Pasada cercana, fuselaje/ala cruzan el encuadre | B baja; transición oculta por paso del avión | Pico Doppler en el instante real de máxima cercanía, duck musical |
| 13,25–15,75 | Salida trasera lateral continua | C aérea, no adelanta ni frena al avión | Motor cae en tono y nivel, cola espacial breve |
| 15,75–18,25 | «Un año creando / con SKY.» | B revela volumen blanco; A estable desde 16,30 | Acento de llegada y pausa de casi 2 s |
| 18,25–20,75 | Plus lima viaja solo y se asienta a izquierda; aparece «2.000», luego «piezas.» | A con paralaje corto; número blanco fijo | Plus golpe suave 18,55; número 18,70; palabra 18,88; hold hasta 20,75 |
| 20,75–24,25 | «Y ahora nos eligió como» → «su agencia» → «SEO/AEO.» | C arco moderado hacia A; frontal desde 21,55 | Acentos ascendentes que siguen el orden visual; >2,5 s de lectura completa |
| 24,25–26 | «¡Gracias, SKY!» | A/B leve retirada, llegada amplia | Resolución cálida, cola breve |
| 26–27,50 | Efeonce | SKY y burbuja efeoncepro.com sobre azul | A bloqueada, sin zoom | Firma instrumental; URL visible desde la entrada |
| 27,50–28,50 | Solo fondo pasa a morado SKY | A bloqueada | Movimiento sonoro sutil |
| 28,50–30 | Cierre morado fijo | Sin movimiento de logos/URL | Final musical limpio, sin corte abrupto |

## 5. Referencias: jerarquía y elementos que faltaban

**Una guía temporal completa** es autoridad de secuencia/pausas. Incluye movimiento logrado del avión, UI y tipografía exactas y cierre oficial. Los fotogramas de avión permanecen derivados de v8, sin regenerarlos para crear la referencia. El resto es previs determinística de intención.

**Estados necesarios y distintos:** campo vacío; resultados; usuario solo; primera frase de respuesta; respuesta completa con chip; chip enfocado conservando contexto; título de año; plus aislado; composición +2.000; intro de agencia; agencia completa; gracias; cierre azul; cierre morado. Las nuevas capturas se generan con fuentes reales y SVG de marca, no con letras sintetizadas.

**Identidad del avión:** conservar cuatro vistas aisladas oficiales existentes. Son vistas del MISMO objeto, no cuatro aviones ni cuatro escenas adicionales. El video guía el movimiento; las vistas aisladas fijan geometría, proporciones y livery. No hacen falta nuevos ángulos generados.

Retirar de esta solicitud las perspectivas duplicadas de resultados y las cartelas pequeñas viejas. El modelo recibe una composición por estado y una función inequívoca por referencia. No enviar v7/v8 completos con sus fallos de chat ni su voz como referencia.

## 6. Audio controlado y verificable

1. `generate_audio=false` en fal. Antes del mux, inspeccionar streams y seleccionar explícitamente solo `0:v:0`; aunque el proveedor devolviera audio, queda excluido.
2. Conservar identidad musical/SFX que el operador aprobó en v7. Fuente derivada `v7/audio-clean.wav`, separación Demucs; Scribe previo sin palabras. La separación puede afectar timbre: no afirmar que equivale bit a bit al original.
3. Pista maestra independiente a 48 kHz estéreo. Inicio 0–0,20 s cero absoluto, teclas después; música únicamente desde Enter. Ajustar entradas sobre los eventos del render real, no solo sobre timestamps del prompt.
4. Microsonidos de teclado/ticks/clic creados con impulsos y osciladores, sin voces ni samples vocales. Conservar efectos cinematográficos de la fuente aprobada donde ya coincidan. Evitar duplicar dos impactos o dos motores sobre el mismo evento.
5. Mezcla: música cede ante clic de cita y pasada, pico real <−1 dBTP, objetivo −16 LUFS-I, fade final. Medir después de AAC, no solo el WAV.
6. Transcribir los 30 s finales con Scribe. Cualquier palabra reconocida o reportada impide marcar audio aprobado; inspeccionar fuente y corregir. ASR vacío es evidencia auxiliar, no prueba absoluta de calidad perceptual. Procedencia sin voz + ausencia de audio nativo + auditoría final reduce la dependencia del modelo.

## 7. Ejecución, presupuesto y gates

- Ruta: `bytedance/seedance-2.5/reference-to-video`, `task=reference`, `duration=30`, `aspect_ratio=9:16`, `resolution=1080p`, `bitrate_mode=high`, `generate_audio=false`.
- Una corrida completa. Estimar con todas las referencias y duración del video de entrada antes de enviar. Cuenta fal B con saldo restaurado, verificar el saldo justo antes. Sin prueba paga de un Draft que el catálogo no ofrece.
- Guardar prompt, orden de referencias, hashes, request_id y URLs de cola devueltas; no reenviar si hay timeout de resultado ambiguo.
- Monitorear en este turno; automatización de respaldo solo para continuidad. Render completado no equivale a aprobado.
- Revisar salida completa a 12 fps y fotogramas nativos alrededor de defectos. Comparar secuencia, orden de lectura, velocidad, geometría y marcas. Conformar audio al timing observado y comprobar master final.
- No sustituir la versión aprobada si v9 introduce regresiones; comunicar límites concretos. No regenerar automáticamente otra corrida de video sin evaluar la causa. No publicar.

## Ejecución enviada

- Fal aceptó una sola solicitud (HTTP 202): `01a0d271-00d5-73a2-ae97-ef2f1582cad2`, cuenta B. Estado inicial `IN_PROGRESS`.
- Payload efectivo: `request.json`; prompt 5.928 caracteres, 18 imágenes, un video completo de 30 s sin audio; 1080p, H.264, bitrate alto, `generate_audio=false`.
- Las cuatro vistas originales del avión requerían margen técnico: originales demasiado panorámicos para el validador upstream ya observado. Se exportaron sobre canvas transparente 908×512, sin escalar ni cambiar los píxeles del avión. Originales y hashes preservados; manifiesto actualizado.
- Saldo anterior: US$46,73737994. Estimación completa US$40,94064: `(1080×1920×(30+30)×24/1024)/1000×0,0234×0,6`. El estimador genérico local no incluye todos los segundos de entrada ni la tarifa específica de 1080p; se usó fórmula oficial completa. Costo real pendiente de liquidación/readback.
- Cola devuelta y guardada antes de esperar: `queue-handle.json`. Guard contra doble envío: `submission-started.json`. No volver a ejecutar `submit`.
- Seguimiento de respaldo activo cada 10 minutos en esta tarea, ID existente `revisar-render-sky-v8`, renombrado «Revisar render SKY v9 en fal» y retargeteado únicamente a este request. Se pausará tras la revisión.
- Animatic comprobado: 720 cuadros, 30 s exactos, 720×1280, ningún stream de audio. Es solo referencia; no es el render final.

## Cierre de esta ejecución

Fal terminó; bruto 1080×1920,30,041667s,24fps,sin audio. Revisión de361muestras completada; mezcla final y Scribe sin palabras. Resultado y limitaciones en `REVISION.md`. Costo observado ≈US$40,99. La mejora cinematográfica de UI/títulos quedó parcial: candidato mostrado para revisión, no aprobación creativa final.
