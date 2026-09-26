# SKY — auditoría, cambio de método y prueba sin gasto

> Actualización 2026-09-24: punch-v3 aprobado por el operador; ver `approval-punch-v3.json`. Este documento conserva el proceso de diseño/auditoría. El plan futuro vigente vive en `PLAN-VIDEO-AUDIO-V10.md` de CMP-003 en OneDrive (CDR-008). Película completa y audio aún pendientes.


## Estado / mandato

Feedback del operador después de v9 invalida la aprobación perceptual: voz amortiguada en títulos, SFX fuera de acción, pausas/delay, pérdida del impulso cita→avión, cámara de búsqueda plana y URL Bubble incorrecto. No gastar más antes de probar. Esta carpeta no invoca proveedores ni genera material de pago. No modifica v6/v7/v8/v9 ni publica.

## 1. Responsabilidades y evidencia

| Decisión / resultado | Evaluación | Causa / evidencia | Corrección |
|---|---|---|---|
| Gasto US$40,99 | Error de criterio | 30s1080p + guía de30s; estimación anunciada pero sin aprobación expresa del importe | Bloqueo de gasto en esta prueba. Futuro: importe total, referencias incluidas, alternativa y aprobación explícita |
| Voz velada en títulos | Fallo real reportado por operador | v9 usa `v7/audio-clean.wav`, derivado por separación de mezcla que contiene narración; ASR vacío no prueba ausencia perceptual | Retirar esa pista del rol de master. Preservar como referencia musical. No seguir aplicando filtros de voz encima |
| Sensación de música interrumpida/delay | Error de conform | `v9/mix-audio.py` divide la fuente en9 intervalos y aplica atempo distinto a cada uno; conserva SFX previos incluidos en la mezcla | Un único reloj musical a velocidad1. Mantener música continua; animación y SFX se colocan sobre ese reloj |
| SFX no coinciden | Fallo de método | Eventos estimados a12fps, sonidos nuevos encima de mezcla vieja con efectos ya impresos; duplicación y transitorios arrastrados por retiming | Cue sheet generada por la misma timeline de imagen, a24fps; pistas separadas; cada cue tiene evento visible y frame |
| Cita sin épica | Fallo de dirección y referencia | Empuje de guía v9 termina en `smoothstep` que frena, flare y corte a avión lejano; fuente sonora también se segmenta ahí | Impulso acelerado que atraviesa cita, expansión de luz y entrada del avión ya en movimiento con solape; continuidad sonora atravesando el corte |
| Búsqueda plana | Error propio de referencia | Guía baja rotateY de−12° a0 demasiado pronto, luego cámara casi frontal; salida la conserva | Travelling B oblicuo visible durante escritura, volver a lectura A antes del Enter; límites de encuadre medidos |
| Plus separado y orden agencia | Acierto | V9 cumple plus→número→piezas e intro→agencia→SEO/AEO | Retener semántica, mejorar trayectoria, peso y transición entre cartelas |
| Respuesta LLM / cita | Acierto | V9 por fin muestra pregunta→respuesta desplegada→cita adjunta, sin volver a resultados | Mantener dentro del video generativo, incluido todo el microtexto; revisar su exactitud visual antes de aceptar el render |
| Trayectoria avión | Acierto parcial | Se conserva aproximación→pasada→salida; transición de entrada y fade de salida fallan | Reusar núcleo del vuelo a velocidad1; entrada/salida con composición sobre movimiento, sin congelarlo |
| URL bubble incorrecto | Error mío anterior al modelo | `v9/render-guide.mjs` crea `#url` con border/radius y texto. Asset oficial ya existe en kit | Insertar SVG íntegro, aislado del CSS de otros logos; prueba visual de cierre azul y morado |
| QA centrado en muestras / ASR | Insuficiente | 361muestras sirven para orden, no demuestran ritmo ni audición humana. Se reconoció limitación pero se rotuló `sin-voz` como si estuviese resuelta | Video a velocidad real + feedback auditivo como gate; muestras aux; sin aprobación sonora automática |
| Guía completa dominante | Límite del enfoque | Captura secuencia pero Seedance conserva una previs austera; no se obtiene una dirección cinematográfica nueva por pedirla verbalmente | La película completa y su UI siguen siendo generativas; solo cartelas posteriores al avión y cierre se componen después. Referencias de cámara específicas, sin una previs plana dominante |

## 2. Alcance corregido por el operador

**No reconstruir el video determinísticamente.** Seedance conserva la película, interfaces, cámaras, cielo y avión. La posproducción crea y anima únicamente texto y firma gráfica exacta, y los coloca sobre espacios limpios del video. Se detuvo el borrador de escena completa antes de renderizarlo; script inactivo preservado en `discarded-full-scene/` como evidencia, no usado por el exportador.

El operador confirmó: **solo cartelas posteriores al avión y cierre**. Búsqueda, resultados, chat, cita y todo su microtexto permanecen generativos. Las interfaces fluidas logradas se conservan en el planteamiento. No volver a convertir una guía HTML austera en autoridad de la cámara generativa.

El motor local exporta **alpha transparente**, sin producir cielo, avión, interfaces o cámara de fondo. Permite un preview sobre la fotografía de referencia existente para juzgar SOLO tipografía; ese preview no es el video nuevo ni pretende demostrar integración final con una cámara generada.

### Qué controla y qué no

- Controla glifos, orden, trayectoria de cada texto, masking, easing, duración y cues de acento.
- El fondo debe proporcionar un espacio limpio, duración y contraste suficientes; texto quemado no se tapa con otro texto.
- Si se quiere texto integrado en profundidad, se requiere track de cámara o puntos de referencia del plate. El overlay puede aceptar keyframes de anclaje/perspectiva; aún no existe un plate limpio con track verificado. No simular que tenemos un solve3D.
- La cámara del video sigue siendo generativa. No prometer que texto determinístico garantiza tres cámaras mejores ni arregla geometría del avión.
- El audio será una pista independiente. Sacar texto del prompt visual NO garantiza por sí solo ausencia de voz: mantener generación de audio desactivada cuando corresponda y usar instrumental limpio + SFX separados.

## 3. Plan de película generativa y reservas

Tres rigs recurrentes en todo el video: A frontal/hero/lectura; B travelling lateral para búsqueda y pasada; C elevada oblicua para resultados, descenso de chat y salida del avión. Son instrucciones para el futuro render, no cámaras que se reconstruyen con CSS. Bloquear planos y continuidad mediante referencias de movimiento ya exitosas, sin reintroducir la previs plana completa.

| Tiempo objetivo | Plate generativo / movimiento | Posproducción |
|---|---|---|
|0–1,8s|Buscador con travelling B visible, llega a lectura A; escritura y Enter generativos|SFX de tecla/Enter sincronizados al render real|
|1,8–3,8s|Resultados una sola vez, C elevada y profundidad, sin rotación que impida lectura|Ticks por llegada real|
|3,8–6s|Turno usuario→respuesta desplegada→cita adjunta; conservar fluidez v9|Revisión de exactitud del microtexto generado|
|6–8,4s|Lectura de respuesta; cámara se prepara hacia cita sin reiniciar escena|Música continua|
|8,4–10s|Cita púrpura toma energía; push ACELERA hasta atravesarla. Luz y nubes continúan el flujo. Avión ya en movimiento emerge sin freeze ni pausa|Riser/motor empiezan antes del reveal y atraviesan la transición; cero cortes de banda musical|
|10–15,75s|A aproximación→Bpasada→C salida, mismo rumbo y velocidad. Preservar core logrado. Nada de frenada o reposicionamiento|Jet continuo con Doppler en máximo acercamiento|
|15,75–18,25s|Cielo limpio, reserva de texto amplia x72–1008/y500–1050; deriva de cámara B controlada que se asienta|Un año creando→con SKY; entrada por máscara y profundidad de objeto|
|18,25–20,75s|Misma reserva limpia, A/deriva muy pequeña; continuidad de luz|Plus independiente→2.000→piezas|
|20,75–24,25s|Reserva limpia algo más alta y larga x72–1008/y470–1200; C se asienta para lectura|Intro→agencia→SEO/AEO. Texto conserva exactitud|
|24,25–26s|Cielo limpio para agradecimiento, retirada leve que no reduce legibilidad|¡Gracias, SKY!|
|26–27,5s|Fondo azul, cámara bloqueada, libre de logos/texto|SVG Efeonce / SKY y URL Bubble canónico|
|27,5–28,5s|Solo fondo a morado SKY|Firma permanece fija|
|28,5–30s|Fondo morado fijo|Hold y cadencia musical|

**Reserva no es un hueco pintado:** son cielo/fondo naturales despejados, sin placeholders, letras, paneles fantasma ni símbolos. El prompt especifica dónde NO pasa el avión y qué región debe quedar legible. La luz no cruza la reserva con variaciones extremas durante el hold. La máscara de reserva es guía de composición, no arte visible del render.

## 4. Animador de texto reutilizable y prueba0USD

- Entrada: timeline JSON con copy/asset, entrada, hold, salida, trayectoria, jerarquía y anclaje.
- Salida: ProRes4444 de texto con alpha real + URL Bubble separado para fusión Luminosidad y preview de14,25s sobre imagen de referencia. Offset de inserción15,75s en película30s.
- Primitivas: mask-reveal por línea, stagger, arco de plus separado, profundidad moderada del objeto, easing con settle y lectura estable.
- No dibuja paneles, avión ni fondos del master. La firma usa imágenes SVG aisladas, no CSS que redibuja el URL Bubble.
- Un reloj24fps produce frames y cues; cues sirven como EDL de SFX, no añaden sonidos a ciegas encima de una mezcla con efectos quemados.
- La preview muda valida animación; no se rotula como video final aprobado.

## 5. Audio: prueba y límite honesto

La pista musical que gusta está impresa con voz y efectos. Separarla no produce un stem instrumental garantizado: el operador ya detectó el residuo. Se conserva intacta como referencia; no se declara limpia ni se reutiliza el montaje retimado v9.

Esta prueba debe distinguir claramente:
1. **Overlay de texto mudo**, para validar trayectoria de letras, jerarquía, transición, URL Bubble y exactitud sin ocultar defectos con música.
2. **SFX aislados desde eventos de la timeline**, auditable por frame; puede reproducirse con la prueba visual. No usar ASR remoto ni cobrar otra validación.
3. **Música aprobada**: continuidad a1x como contrato, sin montaje en9atempo. Para master hace falta un instrumental realmente limpio o producirlo posteriormente con presupuesto aprobado. Si se ensaya material instrumental existente o una reconstrucción local, es alternativa de prueba, no sustitución aprobada de la música que gusta.

No prometer audio definitivo mientras esa fuente limpia no exista. La aprobación perceptual requiere escucha del operador; métricas y waveform no la reemplazan.

## 6. Gates de esta prueba

- Overlay1080×1920,24fps,14,25s con offset15,75s; fuentes existentes y gasto externo0.
- SVG URL Bubble igual en hash al canónico, gris original con fusión Luminosidad al 72% contra el fondo azul y morado; geometría intacta, sin un rectángulo inventado.
- Un solo reloj para imagen/SFX; cue sheet en segundos y fotogramas.
- Scrub determinista: un frame debe ser idéntico al llegar desde delante o atrás.
- Cita→avión: gate pendiente de un plate corregido; no se recrea en esta prueba de texto.
- Texto exacto y holds; las3cámaras son gate del futuro video generativo, no mérito del overlay.
- Prueba mostrada con estado y límites. Ninguna generación adicional hasta validarla y acordar presupuesto.

## Corrección de la prueba: URL Bubble

El operador corrigió el tratamiento: no basta usar el SVG correcto. Debe conservar gris original y fusión **Luminosidad, opacidad 0,72**, conforme al canon. Se retira la propuesta de blanquearlo. En la preview se aplica contra el fondo real del cierre; el export lo conserva en una capa separada porque un MOV con alpha no almacena modos de fusión. No aplicar una segunda opacidad 0,72 al MOV: ya está incorporada en su alpha.

## Confirmación de fondo y dirección de las tres cámaras

El operador confirmó que **las cartelas van sobre el cielo animado del video generado**. La imagen estática es exclusivamente un soporte temporal del preview. El master alpha no contiene esa foto ni genera la cámara del fondo.

Tres familias de cámara gobiernan toda la película, no tres cortes reservados al avión:

- **A — lectura / hero.** Frontal con profundidad y leve contrapicado cuando recibe al avión; referencia focal aproximada 40–50 mm. Recupera lectura antes del Enter, mantiene legible respuesta/cita y recibe las cartelas. No equivale a inmovilizar el cielo.
- **B — desplazamiento lateral.** Ángulo oblicuo de búsqueda visible mientras se escribe; recorrido lateral moderado que conserva toda la caja en cuadro. En el vuelo, seguimiento lateral tipo dron con el avión avanzando de manera inequívoca respecto a nubes y horizonte. Referencia focal aproximada 35 mm; sin angular extremo en el morro.
- **C — elevada oblicua.** Presenta profundidad de resultados y acompaña descenso de la respuesta; después acompaña salida del avión desde arriba y atrás sin invertir su rumbo ni hacer que retroceda. Referencia focal aproximada 45–60 mm.

Las focales describen intención, no calibración recuperada del video. El recorrido final se evalúa en píxeles y tiempo real. Los cambios A/B/C conservan sentido de desplazamiento, posición del horizonte, luz, tamaño plausible del avión y continuidad de velocidad. No saltar del pase cercano a una segunda aproximación lenta.

### Referencias de la siguiente generación — preparar antes de gastar

- Mantener vistas originales aisladas del mismo avión: geometría, librea, motores y alas. No agregar diseños alternativos.
- Referencia temporal del tramo exitoso para dirección de movimiento, dejando explícito que no debe reproducir su fade ni frenada de entrada.
- Referencia de buscador oblicuo y referencia de respuesta/cita de mejor fluidez: cada una con función declarada. No usar una guía completa austera que aplaste las cámaras.
- La cita morada conserva su texto SKY y es parte generativa de la interfaz. El portal de luz nace de ella y mantiene impulso hasta el avión; no introducir pausa sonora o visual entre ambos.
- Cielo de referencia existente para continuidad de atmósfera; versión de composición con reservas descritas, sin imprimir cartelas para que el modelo las copie.
- Las cartelas y la firma se entregan como overlays; no suministrarlas como letras que el modelo deba dibujar. Mantener presupuesto exacto y número/duración de referencias antes de autorizar la llamada.

### Sonido por acción — sin cobrar una prueba nueva

| Acción | Intención | Sincronización |
|---|---|---|
| Escritura | Teclas ligeras agrupadas, inicio sin música | Detectar apariciones reales de glifos; no una ráfaga que exceda escritura |
| Enter | Click breve y comienzo de crecimiento musical épico | Fotograma visible de activación; el sonido no dispara antes |
| Resultados | Ticks suaves según llegada/selección | Un cue por cambio significativo, sin metrónomo arbitrario |
| Respuesta LLM | Barrido fino de aire/datos, lectura moderna | Acompañar despliegue; evitar tono hablado o fonemas |
| Cita SKY | Click firme, energía creciente y entrada de motor | Riser atraviesa la transición sin silencio ni corte musical |
| Avión | Motor continuo y Doppler de la pasada | Máxima presencia cuando se acerca; salida gradual al alejarse |
| Cartelas | Whoosh corto de objeto; acentos principales en + y SEO/AEO | Cues del JSON ajustables a una pista musical continua; no golpear cada letra |
| Gracias y cierre | Resolución musical, firma discreta | Sin voz, sin lectura del dominio, cola que no se corte abruptamente |

La estructura visual actual es una propuesta temporal; el futuro montaje deberá alinear esos acentos a compases del instrumental limpio elegido. No se promete conservar exactamente una música cuyo único archivo disponible contiene voz: se preserva su identidad como referencia y se informa esa limitación antes de generar o reemplazar nada.

## Iteración de punch en la prueba

Tras el feedback de falta de impacto se sustituyeron los reveals suaves por barridos laterales, entradas desde profundidad con aceleración, asentamientos breves, trayectoria y giro propios del «+», y acento principal en «SEO/AEO». Se conserva un hold legible tras cada entrada. El relieve, barrido de luz y ecos transitorios pertenecen a las letras; el fondo final conserva la animación generativa.

Verificado localmente: exportación 1080×1920/24fps, transparencia real, URL excluida de la capa normal y exportada aparte, ausencia de pista de audio en la prueba, scrub reproducible y fusión Luminosidad contra los dos colores. Las pruebas técnicas no equivalen a aprobación de impacto, ritmo del montaje completo ni sonido. Costo adicional externo: 0 USD.

## V3 — ajustes ejecutados después de la revisión conjunta

El operador autorizó concretar cinco mejoras: diversificar entradas, dar causalidad al «+», conectar cartelas, afinar acabado y resolver el agradecimiento con más calma. Implementadas en el JSON y motor de texto. Se mantiene la duración de 14,25 s y el cierre a los 26 s del video completo; la composición final seguirá sobre el cielo animado generado.

Se conserva el MP4 v2 para comparación. El nuevo entregable de revisión es `prueba-cartelas-punch-v3.mp4`. El cambio modifica únicamente foreground de títulos: ningún proveedor, ninguna generación de cielo/avión, ninguna sustitución de música ni nueva llamada pagada. El ritmo con la música y la integración sobre cámara generativa siguen pendientes del material final.
