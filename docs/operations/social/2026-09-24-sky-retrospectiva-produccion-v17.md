# SKY × Efeonce — retrospectiva completa de producción hasta V17

**Aplicación reusable:** [método de producción y posproducción](../creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md), con companions de cámaras/piezas, acabado/sonido y lecciones. Esta retrospectiva conserva la evidencia histórica.


**Fecha:** 2026-09-24. **Campaña:** CMP-003. **Alcance:** reconstrucción del método, recursos, decisiones, errores, aciertos y resultado audiovisual. Solicitada por Julio Reyes después de la entrega V17.

**Estado real:** V17 exportado y revisado visual/técnicamente. La aprobación de las cartelas punch-v3 está registrada; la aprobación final de V17 no se infiere del pedido de documentar. Sin publicación. Este informe no genera material nuevo ni consume créditos.

## 1. Qué queríamos conseguir

Una película vertical con impacto cinematográfico que conecta el trabajo SEO/AEO con SKY. La secuencia deseada, corregida y reiterada por el operador, era:

1. Caja de búsqueda con escritura y recorrido de cámara perceptible.
2. Envío y aparición de tres resultados.
3. Conversión de la consulta en un turno de usuario de un chat.
4. Respuesta de un LLM que se despliega y contiene una citación SKY.
5. La citación morada cobra luz y provoca la transformación principal de la película.
6. Aparición imponente de un avión SKY realista, aproximación, pasada cercana y salida coherentes.
7. Cartelas que guían la mirada: «Un año creando con SKY.», «+2.000 piezas.», «Y ahora nos eligió como su agencia SEO/AEO.».
8. «¡Gracias, SKY!».
9. Cierre Efeonce | SKY, URL Bubble subordinada y fondo primero azul, después morado SKY.

La marca debía ser el origen de la transformación. Por eso un clic aislado sobre el chip no resolvía la intención, aunque estuviera sincronizado. Avión, cielo, luz y movimiento debían verse fotográficos. Los textos necesitaban actuación y jerarquía, no únicamente aparecer completos.

Audio: música y SFX, sin narración. La ambigüedad inicial quedó resuelta expresamente por el operador. Se pidió silencio musical al comienzo y entrada después de Enter; ello permite foley de escritura antes de la música.

La duración evolucionó de las exploraciones de 15 s y una prueba de 19 s a 30 s. V17 quedó en **29,5 s** tras aprobar quitar medio segundo de lectura anterior a la activación.

## 2. Qué significa «tres cámaras» en esta producción

Se planificaron tres formas de cubrir la acción a lo largo de toda la película, no únicamente tres vistas del avión:

| Función de cámara | Trabajo visual | Restricción |
| --- | --- | --- |
| A — vista amplia / lectura | Establecer cielo, orientar al espectador, estabilizar mensajes y mostrar aproximación | No volver toda la interfaz frontal y estática prematuramente |
| B — macro / desplazamiento lateral | Recorrer la caja, dar profundidad a resultados y entrar en el chip | Mantener la pregunta dentro del campo y avanzar sin frenar antes de la transformación |
| C — oblicua / baja / aérea | Cambiar perspectiva, mostrar volumen, paso inferior y seguimiento posterior | Conservar eje, escala, dirección y velocidad aparente del mismo avión |

Los rótulos A/B/C y su asignación concreta cambiaron entre planes. Se trata de funciones de cámara virtual, no de una captura física con tres cámaras ni de una garantía de que cada generación ejecutara exactamente tres planos.

En vuelo, cambiar de ángulo debía continuar una misma trayectoria: aproximación → cruce cercano → alejamiento. Volver a enseñar un morro lejano después de un paso hacía sentir que el avión retrocedía o empezaba otra vez.

El resultado final conserva los recorridos generativos que funcionaron; las cartelas se animan en profundidad por separado. No se obtuvo una reconstrucción tridimensional verificable de todo el espacio ni un control exacto de cámara mediante el prompt.

## 3. Recursos que permitieron sostener la identidad

### 3.1 Avión y marca

- Renders oficiales del mismo Airbus A320neo SKY: V02, V07, V10, V14, V16 y VR, según la toma. Frente tres cuartos, perfil, panza, ala/cola y vista posterior permitían contrastar geometría y pintura.
- Rasgos a conservar: fuselaje blanco, SKY morado/lima, cola morada con chevrón, extremos de ala verdes, dos motores y tren retraído en vuelo.
- Vistas aisladas y referencias integradas en el cielo cumplían funciones distintas: las primeras fijaban identidad; las segundas aportaban luz, material y composición.
- Logos vectoriales de Efeonce y SKY; SVG canónico de URL Bubble. No había que pedirle a un modelo que inventara esas letras.

El trabajo previo de hangar desarrolló un kit del avión y un método de corrección de marca: borrar pintura generada, aplicar logo oficial con homografía/sombreado y pedir sólo integración localizada. Allí quedó registrada una falla repetida de la K. Es antecedente útil de marca, pero las escenas de hangar no aparecen en el montaje final del cielo.

### 3.2 Interfaz, tipografía y entorno

- Kit AXIS de caja, consulta, tres resultados, turno de usuario, respuesta, chip en reposo/encendido/destellos, cartelas y firmas.
- Poppins en las referencias de interfaz; Bricolage Grotesque en las cartelas finales.
- Fuentes embebidas: en la preparación inicial, cargar fuentes por `file://` fallaba silenciosamente y producía fallback a Times. Embebido de fuentes e imágenes eliminó esa dependencia del entorno.
- Cielo de amanecer `cielo/C1-b.png`, referencias fotográficas y placas R1–R9 para orientar cada estado.
- Manifiestos con rutas y SHA-256. Las distintas revisiones manejaron paquetes de 14, 30 o 10 imágenes: no hubo un único paquete constante para todas las corridas.

La fotografía de cielo usada en la prueba de cartelas fue una preview de diseño. En la entrega, el cielo bajo los textos es metraje generativo animado.

### 3.3 Recursos sonoros

- Música y efectos nativos de Seedance en iteraciones iniciales.
- Música instrumental generada con Eleven Music v2 y posteriormente Music v2.5.
- Efectos separados con Eleven Sound Effects v2.
- Rock aportado por el operador en `rock-2026-08-08-12-13-23-utc.zip`; fuente final seleccionada: `331music_rock_short-02.wav`, 32 s.
- Stems separados: música, interfaz, transformación de marca, avión y cierre. Se conservaron las fuentes y mezclas descartadas.

La aportación del archivo demuestra procedencia del insumo; no constituye por sí sola auditoría de licencia Envato para publicación. Este trabajo fue de producción interna.

## 4. Modelos, herramientas y función real

Los nombres y capacidades de esta tabla corresponden a los registros de la producción, no a una comprobación actual de catálogo o tarifas.

| Recurso | Uso registrado | Qué llegó a V17 |
| --- | --- | --- |
| Claude Code | Desarrollo inicial de referencias, kit y primeras iteraciones, conservados en repo/OneDrive | Activos y dirección heredados; no se atribuye cada archivo a un autor sin registro |
| Codex | Auditoría, planificación, operaciones, composición, mezcla, revisión y documentación | Pipeline local y ensamblaje final |
| MiniMax H3 Max | Exploración rápida de 15 s, referencias de cámara macro/lateral y cobertura aérea | Lenguaje de cámara como antecedente; no su metraje directo en V17 |
| Seedance 2.5 | Pruebas, generación completa y edición; fal, Higgsfield y ruta ElevenLabs | Metraje seleccionado de V7, V9 y V11 |
| Higgsfield | Proveedor/superficie de Seedance, importación de referencias, edición y generación completa | V7 y otras pruebas; no es un modelo distinto de Seedance |
| fal / CLI local | Envío, controles, consulta de estados y generación Seedance | V9/V11; sus costos fueron relevantes |
| Gemini Omni 1.1 Flash | Edición localizada de MP4 por CLI `pnpm ai:omni` en Vertex | Una ventana V14; primer piloto rechazado |
| GPT Image 2.5 Sunburst xhigh | Según registro del hangar: edición con referencias e integración de marca | Antecedentes y recursos de identidad; no video final |
| `image_gen` | Edición de un keyframe V10 de avión/cielo para una prueba | Referencia experimental; no sustituyó la autoridad de los renders oficiales |
| Eleven Music v2 | Música inicial; el registro V6 devuelve cuatro variantes | Descartada en el master final |
| Eleven Music v2.5 | Heroic Ascent, edición de intro, Ascent of the Brave y Heroic Ascent Finale con referencia nativa | Descartadas finalmente en favor del rock del operador |
| Eleven Sound Effects v2 | Foley/UI, portal, avión y nueva transformación de 3 s | Efectos seleccionados, especialmente transformación V16 |
| Topaz mediante ElevenLabs Flows | Restauración 2×, piloto de 4 s y trabajo completo de 26 s | Placa restaurada 2160×3840 |
| Demucs `htdemucs_ft` | Separación de voz de una mezcla Seedance | Ensayo descartado como master por residuos percibidos |
| Eleven Scribe / comprobaciones VAD | Detección auxiliar de palabras/actividad vocal | Evidencia auxiliar; nunca sustituto de escucha |
| Envato Elements | Rock aportado por el operador | Música final V15–V17 |
| HTML/CSS/JavaScript, Playwright/Chromium | Render determinista de tipografía, SVG y transparencia | Cartelas punch-v3 y cierre |
| Node.js / Sharp / compositor Luminosity | Composición de imagen y firma URL con el modo correcto | Cierre final y composición RGBA |
| FFmpeg / FFprobe | Montaje, tiempo, alpha, audio, codificación, tags de color, metadata y decode | Entregas y verificación |
| Python, NumPy, SciPy, soundfile, Pillow | Mezcla por muestras, análisis, cuadros, contactos y comparación | Reproducibilidad y QA |
| Computer Use | Revisión de interfaces, selección de modelos disponibles y operaciones no expuestas por conectores | Acceso a Music2.5 y verificación de superficies |
| Automatización de seguimiento | Reconsultar trabajos existentes hasta recuperar/revisar salida | Seguimiento de Topaz; pausado al concluir |

Music v3 fue solicitado, pero no se verificó disponible en el selector/documentación consultados durante la operación. No se usó. Tampoco se usó un flujo Seedance Draft→1080p en esta producción. La web de Higgsfield mostró Draft, pero el conector usado no lo exponía; el catálogo fal consultado tampoco. Magnific quedó excluido por falta de créditos indicada por el operador. No atribuirle la restauración final.

## 5. Historia de las iteraciones

| Etapa | Qué hicimos y qué funcionó | Tropiezo / decisión |
| --- | --- | --- |
| Kit + H3 v1 | Piezas aisladas y primer video de 15 s. Buena transmisión inicial de texto | Fondo plano del tablero se filtraba al chip; avión entraba por corte; texto sobre fuselaje; sin firma web |
| H3 v2 | Cielo fotográfico, mejor orden búsqueda/Enter/resultados y chip frente al sol | Cámara casi fija, UI parecía colocada sobre una placa, avión pequeño |
| H3 v3 | Macro de caja, resultados inclinados, aproximación/panza/seguimiento | Cambió tipografía; avión genérico en algunas vistas; estela pedida en el propio prompt |
| Pruebas Seedance + V4 | Ensayos de chip→cielo, multivista y continuación | Montaje local H3/Seedance mezcló ritmos: 0–7,90 s H3, 0,70–2,50 s de prueba Seedance, regreso a H3. El salto fue nuestro ensamblaje, no una trayectoria única fallida de Seedance |
| Seedance completo 19 s/480p | Una toma completa mejoró secuencia, escala del avión y continuidad | Poca lectura; detalles de motores y cierre no bastaban para entrega |
| V5, completo 30 s/720p | Tres vistas diferenciadas y más tiempo de lectura | Faltaba el turno de usuario claro; reaparecía el chip en textos; cámara UI/títulos débil; voz no certificada |
| V6 | Generación completa silenciosa con 30 referencias y movimiento MiniMax; luego un edit completo | Edit tardó más de 30 min y retuvo errores. Se terminó mediante montaje/UI/texto local y audio separado. Usuario valoró el avance, pero ese alcance determinista fue posteriormente restringido |
| V7 | Edición completa por Higgsfield; mejor vuelo, música y SFX apreciados | Dos intentos previos en ElevenLabs fallaron por validaciones de prompt/ratio. Salida Higgsfield volvió a resultados y narró cartelas. Separación Demucs no garantizó limpiar la voz |
| V8 | Nueva generación completa con 30 referencias y audio de referencia | Omitió chat/respuesta y leyó textos otra vez. Se hizo a 720p, contrariando la preferencia final 1080p. El operador avisó del fin antes de recibir revisión: seguimiento insuficiente |
| V9 | fal 1080p, sin audio nativo, guía completa. Resolvió pregunta→respuesta→cita y orden del plus | Guía transfirió puesta austera, frenada del chip y URL errónea. Mezcla heredó residuos y nueve cambios de tempo. Gasto ≈USD 40,99 mal gobernado |
| V10 local | Auditoría y motor de títulos sobre alpha; iteraciones punch-v2→punch-v3 | Se corrigió el alcance: únicamente cartelas/cierre deterministas. Se detuvo borrador de escena completa. Punch-v3 fue aprobado |
| Piloto Omni V10 | Edición acotada de9,5 s para continuidad | Cambio de cielo, doble avión, salto final. Rechazado tras revisar228 cuadros; no integrado |
| V11 completo | Un intento silencioso 1080p con10 imágenes y5 s de vuelo de referencia | No respetó ritmo, turno ni reserva limpia;713 cuadros en lugar de720. Superó presupuesto USD 25 y costó USD 34,162558. Rechazado como película completa; conservado como fuente |
| V12 | Por mandato de resolver con lo existente: búsqueda V7, chat V9, vuelo/cielo V11 y cartelas aprobadas | Recuperó estructura sin nueva generación; SFX, música, rigidez y jerarquía del cierre seguían cuestionados |
| V13 | Portal V11 continuo, URL620→320 px, morado más profundo y nueva mezcla local | Recuperar música desde una mezcla anterior y repararla localmente no resolvió toda la experiencia sonora |
| V14 | Una ventana Omni útil para salida del avión/nubes; Music2.5 y cinco SFX | Heroic tuvo silencios; edición no los resolvió; alternativa rechazada; puente local audible rechazado. Nueva Heroic completa con referencia resolvió continuidad técnica, pero luego se cambió de carácter musical |
| V15 | Rock Envato del operador; arreglo completo con tempo uniforme; reconstrucción desde fuentes sin JPEG | Mejor dirección musical. Marca aún percibida como clic y suavidad de imagen seguía visible |
| V16 | Un nuevo SFX de transformación de3 s, rango completo. Piloto Topaz y restauración26 s; recomposición posterior | Restauración tardó≈60 min. Controlada dentro de USD 5,60. Persisten blur y limitaciones generativas originales; no es 4K nativo |
| V17 | Medio segundo menos de lectura antes del chip, flecha blanca separada, audio desplazado sin cortes internos | Entrega29,5 s/708 cuadros, 4K restaurado y 1080p. Revisión visual/técnica registrada; escucha final del operador pendiente |

La numeración de versiones incluye pruebas, montajes y acabados. **V17 no significa diecisiete generaciones completas equivalentes**, ni cada solicitud terminó en un video.

## 6. Errores que fueron de método y responsabilidad propia

### A. Confundir referencias de identidad con dirección de movimiento

Tener varios ángulos del avión evitaba improvisar su forma, pero no describía por sí solo una trayectoria continua. Alternar vistas sin controlar distancia, escala y velocidad produjo el efecto «avión retrasado» o híbrido. En el primer montaje se mezclaron fuentes con dinámicas distintas.

La estela no apareció de la nada: H3 v3 incluía `a contrail forming`. Correspondía corregir la instrucción y las fuentes, no atribuir el resultado sólo al modelo.

### B. Pedir impacto con una referencia que lo debilitaba

La guía V9 devolvía la caja demasiado pronto a frontal y desaceleraba el avance al chip mediante una curva de suavizado. También dibujaba la URL como rectángulo CSS aunque ya existía el SVG. Seedance heredó parte de esa puesta. Una referencia completa puede transmitir errores con más fuerza que un párrafo de intención los corrige.

### C. Insistir en «sin voz» como si fuera un control técnico

V7 y V8 narraron cartelas pese a prohibiciones explícitas y referencia sonora. Había un control general `generate_audio`, no una separación verificable de voz/música/SFX en esa ruta. La solución sólida fue recibir video sin pista de audio y hacer una banda sonora propia.

### D. Tratar la separación de voz y el ASR como aprobación

Demucs recuperó material musical, pero el operador percibió voz amortiguada. Un reconocimiento vacío no equivale a ausencia perceptual de voz. Reutilizar ese stem como base trasladó el defecto a otra versión. Nombres como «sin-voz» sobre candidatos insuficientemente revisados daban una certeza que no existía.

### E. Corregir sincronía fragmentando música

V9 dividía la mezcla en nueve intervalos con distintos `atempo`. Sus SFX ya impresos también cambiaban de posición. El resultado podía coincidir con algunos hitos y aun así sentirse interrumpido. El puente posterior de Heroic eliminaba el vacío en métricas, pero el operador oyó el empalme y lo rechazó.

### F. Confundir un evento puntual con su importancia dramática

Un clic, un subgrave o un pico numérico alineado no daban por sí solos la transformación que se buscaba. En V15 se filtró el portal por debajo de160 Hz; aportaba peso, pero eliminaba presencia en medios/agudos y podía casi desaparecer en parlantes pequeños. V16 reemplazó el bus por una acción sonora continua de carga→impacto→liberación.

También se repitieron efectos de avión en momentos que ya eran cartelas, según feedback del operador. La corrección fue un único paso ligado al avión y ningún motor bajo los mensajes.

### G. Dejar que una reparación parcial arrastrara todo el video

Un render completo nuevo corregía algunas cosas y rompía otras: lectura, cámaras, respuesta, tiempo de vuelo o cierre. Los pilotos demostraron que editar un MP4 tampoco garantiza conservación. El primer Omni se descartó por duplicación y discontinuidad; el segundo se integró sólo donde el empalme podía sostenerse.

### H. Insuficiente control económico

V9 costó≈USD 40,99 y la auditoría registra que no hubo confirmación expresa de ese importe total. V11 tuvo autorización USD 25, pero la estimación no era un límite aplicado por el proveedor y se facturaron USD 34,162558. Son errores distintos, ambos de nuestra responsabilidad operativa.

La causa precisa de la discrepancia de factura V11 no quedó demostrada. No se debe atribuir a un descuento, bitrate o campo particular sin prueba. Evitar solicitudes duplicadas fue correcto, pero no bastó para proteger el tope.

### I. Seguimiento y comunicación insuficientes

En V8 el operador tuvo que avisar que el video estaba listo. En restauración posterior se registraron identificadores únicos y consultas de la misma sesión, sin reenviar. «Procesando» no ofrecía porcentaje fiable; la duración del piloto no permitía prometer una hora exacta de salida del completo.

### J. Calidad no resuelta por el tamaño del archivo

Hubo fuentes 720p, recortes, reencuadres hasta1,95× y suavidad generativa. Exportar 1080p no recuperaba esos detalles. Se reconstruyó desde las fuentes en FFV1/RGB sin JPEG y después se probó Topaz. El 4K final es restaurado; ni el bitrate ni la resolución prueban detalle nativo 4K.

## 7. Aciertos que sí conviene repetir

1. **Las correcciones del operador hicieron explícita la narrativa.** El turno de usuario, la citación y el momento de marca dejaron de tratarse como decoración.
2. **Conservar las vistas oficiales del mismo avión.** Permitió distinguir geometría útil de deformación y evitó inventar otra aeronave al cambiar la cámara.
3. **Separar funciones de referencia.** Identidad, material/luz, composición, movimiento y estado narrativo no son intercambiables.
4. **Rescatar por componente.** V7 tenía mejor búsqueda; V9 mejor chat; V11 mejor material de portal/vuelo. Rechazar un master no obligaba a desechar todas sus tomas.
5. **Limitar el código a lo acordado.** Cartelas/cierre exactos sobre una película generativa, sin sustituir la cámara del cielo por una animación de fondo.
6. **Aprobar y congelar punch-v3.** Nueve hashes protegieron la versión; se preservaron variantes rechazadas y una copia de fuentes aprobadas.
7. **Animar lectura y causalidad.** El plus llega, provoca la cifra y ésta conduce a «piezas»; SEO/AEO concentra el golpe mayor; Gracias resuelve con menos agitación.
8. **Usar el SVG y su modo de fusión real.** La URL dejó de competir al reducirse a320 px y usar Luminosity con su alpha, sin duplicar opacidad.
9. **Aceptar una referencia musical concreta del operador.** El rock eliminó la ambigüedad de «épico/fresco» y dio un ritmo real con el que trabajar.
10. **Mezclar por stems y eventos medidos.** Permitió mover V17 sin cortar la canción ni alterar el foley inicial.
11. **Restaurar mediante piloto condicionado.** Comparación antes/después de4 s, luego26 s una vez y recomposición de títulos posteriormente.
12. **Revisar el archivo exportado.** Duración, fotogramas, geometría, color, audio y versiones quedan ligados a archivos/hashes concretos.

## 8. De qué está hecho realmente V17

La película final es una composición de material generado, edición localizada y capas gráficas. No es una salida intacta de un único modelo.

| Tiempo V17 aproximado | Procedencia principal de imagen | Tratamiento |
| --- | --- | --- |
| 0–2,167 s | Seedance V7 | Búsqueda/movimiento lateral recuperado |
| 2,167–8,5 s | Seedance V9 | Resultados, turno, respuesta y cita; el hold fuente6–9 s se comprime a6–8,5 s |
| 8,5–12,042 s | Seedance V11 | Portal y vuelo, con conformado editorial heredado de V15 |
| 12,042–17 s | Ventana Omni V14 | Paso a seguimiento/salida, integrada bajo oclusión |
| 17–17,5 s | Omni + cielo V11 | Mezcla sólo sobre nubes; no disolvencia de dos aviones |
| 17,5–25,5 s | Cielo V11 | Reencuadre/montaje existente, cartelas exactas por encima |
| 25,5–29,5 s | Cierre local | Vectores Efeonce/SKY, URL Luminosity, azul→morado |

Los tiempos se derivan del script `v15-review/rebuild-picture.py` y del mapa de cuadros V17. Las cartelas comienzan en15,25 s y se superponen a las fuentes de cielo correspondientes. Toda la placa de los primeros26 s de V16 pasó por Topaz antes de recortar medio segundo en V17.

El montaje heredado ya contenía retiming y un reencuadre progresivo del vuelo/cielo. Cuando se dice que V17 conserva la velocidad del avión, significa **respecto a V16**, no respecto al bruto original V11.

## 9. Cómo construimos las cartelas con impacto

El animador local usa un planJSON y un reloj de24 fps. La función de render recibe el instante; no depende de la velocidad del navegador ni de animaciones aleatorias. Playwright captura cada estado sobre transparencia.

- Títulos: Bricolage real; texto y glifos exactos.
- Entradas con profundidad, desplazamiento lateral, escala y asentamiento corto.
- Máscaras/revelado, ecos y blur únicamente durante desplazamientos.
- Lectura estable después de la entrada; relieve/sombra finos para contrastar sobre nubes.
- Barrido de luz breve dentro de letras; se retiró el aspecto metálico permanente de una prueba.
- Continuidad de dirección entre salidas y entradas, evitando vacíos que parecieran pausas.
- Un golpe mayor para SEO/AEO; Gracias menos agresivo.

Se exportó ProRes4444 con alpha. La URL quedó separada porque el archivo MOV no almacena la operación Luminosity. Se aplicó el compositor canónico al fondo real: ancho equivalente320 px, alpha con0,72 incorporado, opacidad de composición1. No aplicar0,72 dos veces.

Para V17 el cierre se volvió a renderizar con vectores a2160×3840. El SVG anterior tocaba flecha y trazo deK. El asset `sky-on-dark.svg` conserva una separación de0,4797 unidades dentro de un viewBox de68:≈1,76 px al ancho final250 px en 1080p. Recolorar todo a blanco manteniendo esa geometría resolvió la observación de la diseñadora. Se inspeccionó el hueco en ambas exportaciones.

## 10. Cómo resolvimos el audio final

### Orden de trabajo

La regla corregida por el operador fue cerrar imagen, leer sus cuadros y después diseñar el sonido. Los tiempos del prompt eran metas; los del archivo eran la referencia de montaje.

### Música

Se tomó el arreglo corto de32 s de Envato. En V15 se aplicó un único factor de tempo1,14×, con afinación conservada, para que el arreglo completo y su resolución cupieran en la película. No se dividió en escenas ni se insertaron loops. Esto es distinto de afirmar que se mantuvo el tempo original.

Se localizaron ataques musicales mediante análisis de transitorios y se alinearon marca/cierre. La música entraba a1,61 s en V16. En V17 el stem completo se desplazó−0,5 s: comienza a1,11 s, después de Enter≈0,996 s. El primer medio segundo eliminado era silencio digital verificado.

### Efectos

- Teclas alineadas a la escritura, Enter y tres resultados.
- Movimientos discretos de interfaz ligados al turno y al despliegue de respuesta.
- Un único paso de avión, con máximo en la pasada y cola antes de cartelas.
- Transformación de marca V16: un SFX continuo de3 s, rango completo. Pico de energía a9,583 s en V16 y9,083 s en V17.
- La música recibe hasta−2,5dB de espacio gradual bajo la transformación; no se apaga.
- Cierre con anticipación derivada de la textura de guitarra del propio rock.

V17 mueve música/marca/avión/cierre−0,5 s y conserva UI inicial. Se recompone desdeWAV y se normaliza, en vez de cortar elAAC final. Las muestras de los stems se conservaron antes del mastering.

### Límites de evidencia sonora

Se midieron niveles, picos, duraciones, silencios y coincidencia de archivos; se usóASR/VAD como apoyo. El agente no tenía percepción auditiva en la sesión. Las observaciones de naturalidad, residuo vocal, carácter musical y empalmes audibles provinieron del operador. No confundir esas dos fuentes de juicio.

## 11. Restauración y conservación de calidad

1. Reconstrucción del montaje a partir de V7/V9/V11/Omni; intermedioFFV1RGB sin JPEG.
2. PilotoTopaz de4 s,26 s de metraje como alcance futuro,2× y24 fps. Comparación de16 pares a0,25 s más detalle nativo deUI/avión.
3. Piloto aceptado con límites: más definición observada, geometría conservada en muestras, blur aún presente.
4. Un trabajo completo de26 s, mismo identificador hasta completar. Topaz se operó desdeElevenLabs Flows. No se volvió a generar el avión.
5. Revisión de624 cuadros por correspondencia numérica,52 muestras generales y48 cuadros densos de marca/paso, más detalles.
6. Títulos y cierre compuestos después de restaurar, para evitar que el restaurador reinterpretara sus letras.
7. V17 retoma esa placa restaurada; exporta 4K y 1080p desde una misma composiciónRGBA, sin usar elMP4comprimido 4K como fuente del 1080p.
8. Una codificación final por resolución, H.264CRF15/14, Rec.709. Se detectaron tags incompletos del contenedor y se corrigieron con remux: hashes de video/audio comprimidos idénticos, sin otra compresión.

Topaz no convierte una fuente suave en una captura4K nativa. Mantiene limitaciones de recorte, desenfoque y síntesis original. La mejora observada se documenta sobre cuadros comparados, no como recuperación garantizada de información inexistente.

## 12. Costos: lo comprobado y lo que falta conciliar

El operador reportó un gasto acumulado superior a USD 150. Los registros revisados no constituyen un ledger único conciliado de todas las cuentas, intentos y plataformas; **no se presenta un total inventado** ni se rebaja ese reporte sumando sólo lo que resulta fácil encontrar.

| Operación | Importe registrado | Tipo de evidencia |
| --- | ---: | --- |
| H3v1/v2/v3 | USD 0,60 cada una | Registro de producción, histórico |
| V7 ElevenLabs edit | USD 22,18338144 | Estimación; validaciones fallaron, no acredita cargo efectivo |
| V7 Higgsfield edit | 225 créditos | Estimación; no sumar como dólares |
| V8 Higgsfield generación | 210 créditos | Preflight; no es recibo conciliado |
| V9 fal | USD 40,989380454 | Diferencia de saldo observada antes/después; importe sin aprobación específica según auditoría |
| Piloto Omni V10 | ≈USD 1,54 | Estimación desde uso, no factura |
| V11 fal | USD 34,162558 | Fila individual de Billing events;USD 9,162558 por encima del máximo25 |
| Omni V14 | USD 1,046619 | Estimación desde tokens de uso, no factura |
| Music2.5 V14 | 3 tomas completas a795 créditos cotizados +1 edición | Facturación final no conciliada; cotización de edición 1591 créditos/min |
| SFXV14 | 97 créditos /USD 0,02134 | Precio reportado por conector |
| SFXV16 | 30 créditos /USD 0,0066 | Precio reportado por conector |
| Topaz piloto +completo | USD 5,59944 | Precio reportado por estado del proveedor; dentro del tope5,60, no factura contable |
| V10 local, rescates V12/V13, acabado V15 y V17 | USD 0 de nuevas llamadas | Operaciones locales; no significa ausencia de trabajo/tiempo |

V6 registra cuatro variantes deMusicv2 y varias variantesSFX. Ese registro debe formar parte de una conciliación completa; el informe no presupone que «una operación de flujo» equivale a una única variante facturada. Los≈USD 4del hangar pertenecen al antecedente de activos, no a un total auditado del video.

Mejora de método: estimación debe incluir entradas y salidas de video, resolución, variantes y reintentos; autorización debe ligar importe/alcance a una solicitud concreta. Una estimación no es un límite duro del proveedor. Después: verificar cargo por solicitud y detener intentos si difiere. No reutilizar la fórmula que falló como si ya estuviera validada.

## 13. QA real y estado de entrega

V17:

- 2160×3840 y1080×1920;29,5 s;24 fps;708 cuadros;Rec.709.
- Video≈30,19 Mbps y10,15 Mbps; AAC≈311,5 kbps/48kHz, idéntico entre ambas entregas.
- Audio final medido−16,03 LUFS-I y−1,50 dBTP. En elJSON de `loudnorm`, los valores `input_*` son la medición del archivo; `output_*` describen la simulación de normalización del análisis.
- Decodificación completa sin errores.
- 59 muestras generales,96 cuadros consecutivos de lectura/activación y18 muestras de entrada al cierre inspeccionados; recortes nativos del logo en ambas resoluciones.
- 612 cuadros anteriores al cierre comparados contra sus correspondientes V16: errorRGBmedio0,119/255 en escala reducida108×192. Es evidencia de correspondencia/color, no una métrica de nitidez nativa.
- Fuentes aprobadas verificadas por hash. V16 y variantes anteriores conservados.
- Revisión auditiva perceptual final: no realizada por el agente. Publicación: no autorizada por esta retrospectiva.

## 14. Método reutilizable que deja esta producción

1. **Definir relato y momento principal de marca.** Qué sucede, qué cambia y por qué importa, con orden irreversible de estados.
2. **Inventariar lo aprobado y lo reutilizable.** Guardar fuente/versión/hash y feedback. No empezar desde cero por inercia.
3. **Preparar referencias con función explícita.** Identidad, material, movimiento, estadoUI, salida del avión y placa limpia posterior. Más referencias no equivale automáticamente a mejor dirección.
4. **Separar trayectoria del objeto y cámara.** Punto de entrada/salida, eje, escala, velocidad relativa, transición y pausa legible.
5. **Hacer una prueba barata de riesgo concreto.** Identidad, transición, conservación o restauración. UsarDraft sólo si el carril realmente lo expone; baja resolución normal no equivale aDraft.
6. **Cerrar alcance económico por solicitud.** No repetir a ciegas, no confundir cotización con cap, no generar variantes inadvertidas.
7. **Generar sin audio cuando no se admite voz.** Verificar streams; no depender de una prohibición verbal.
8. **Inspeccionar el resultado antes de producir sobre él.** Un prompt correcto y un jobcompleted no son aceptación creativa.
9. **Elegir entre rescatar, editar localmente o regenerar.** Una reparación acotada requiere empalmes comprobados. No prometer conservación porque el endpoint digaedit.
10. **Congelar imagen y componer sólo los elementos autorizados.** Cartelas exactas sobre alpha; cielo animado original; marcas y URL desde SVG.
11. **Diseñar audio desde los eventos del montaje.** Canción íntegra, stems separados, SFX con causa visible y jerarquía de energía. Escucha humana como gate perceptual.
12. **Restaurar antes de sobreimprimir gráficos.** Piloto condicional, comparación y un solo trabajo completo si pasa.
13. **Exportar desde fuentes, una vez por resolución.** Intermedios sin pérdida; controlar color también en el contenedor; revisar archivos finales.
14. **Entregar con límites honestos y cerrar seguimiento.** Identificar4K restaurado, versiones, costos, aprobación pendiente y ausencia de publicación.

## 15. Fuentes y reproducción

Los siguientes enlaces apuntan a evidencia local. Los registros históricos pueden contener planes ya superados; este documento describe sus resultados y no convierte esos planes en instrucciones vigentes.

- [Producción inicial, H3 y recursos](</Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/2. Campañas/CMP-003_sky-nos-eligio-seo-aeo/PRODUCCION.md>).
- [Plan V10 y decisiones del operador](</Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/2. Campañas/CMP-003_sky-nos-eligio-seo-aeo/PLAN-VIDEO-AUDIO-V10.md>).
- [Antecedente hangar/identidad](../../../ai-generations/2026-09-23_cmp003-sky-hangar/LEEME.md).
- [Kit y hashes](../../../ai-generations/2026-09-23_cmp003-sky-video/kit/MANIFIESTO.json).
- [Auditoría del empalmeV4 y primer completo](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/AUDITORIA-Y-CORRIDA-COMPLETA.md).
- [V6: dirección/cámaras](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v6/DIRECCION-Y-CONTROL.md) y [método de entrega](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v6/ENTREGA-Y-REVISION.md).
- [V7](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v7/REVISION.md), [V8](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v8/REVISION.md), [V9](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v9/REVISION.md).
- [Auditoría de erroresV10](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/AUDITORIA-Y-PLAN.md), [diseño punch-v3](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/DESIGN.md) y [fuentes congeladas](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/approval-punch-v3.json).
- [Piloto Omni rechazado](../../../ai-generations/2026-09-23_cmp003-sky-video/omni/v10-pilot-01/REVIEW.md), [resultado/gastoV11](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v11-full/REVIEW.md).
- [V14: Omni y decisiones musicales](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v14-finish/README.md), [costosV14](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v14-finish/cost-ledger.json).
- [V15: montaje desde fuentes](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v15-review/rebuild-picture.py) y [mezcla rock](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v15-review/mix-rock.py).
- [V16: restauración y transformación](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v16-brand-repair/README.md), [costosV16](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v16-brand-repair/cost-ledger.json).
- [V17: entrega y scripts](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/README.md), [metadata/hashes](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/qa/delivery-technical.json), [revisión](../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/qa/review.json).
- [CDR-008: decisiones de campaña](../../campaigns/decisions/CDR-008-cmp003-cartelas-postproduccion-y-audio-separado.md) y [método técnico original](2026-09-24-sky-generative-film-title-overlay-method.md).

No se usaron After Effects, DaVinci o Blender para ejecutar este acabado. Pueden ser alternativas profesionales, pero no deben aparecer como herramientas utilizadas en el caso. El animador implementado fue local HTML/JS con render por Playwright, composición Sharp/FFmpeg y mezcla Python/FFmpeg.
