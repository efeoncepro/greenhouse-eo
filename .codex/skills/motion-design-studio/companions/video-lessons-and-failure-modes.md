# Producción y posproducción de video: aprendizajes y modos de falla

**Corte de evidencia: 2026-09-24; delta 2026-10-03 (§11, spot animado 2D «Sparks × Efeonce AEO»); delta 2026-10-09 (§12, reel X-Ray Pibank); delta 2026-10-12 (§13, reel de muestra para Sika Mexicana).** Companion de `motion-design-studio`, derivado de CMP-003 SKY hasta V17. Se carga al auditar una iteración, decidir una reparación o preparar una nueva producción con continuidad, marca, tipografía y sonido exigentes. Complementa los workflows; no sustituye el contrato del encargo, el presupuesto ni la revisión humana.

**Estado del caso:** V17 exportado y revisado visual/técnicamente; aprobación final del operador y escucha perceptual del agente no acreditadas. Punch-v3 sí tiene aprobación registrada. El pedido de documentar el proceso no convierte todo el video en aprobado. No se hicieron nuevas llamadas pagadas para esta sistematización.

## 1. Cómo convertir experiencia en método

Cada aprendizaje debe distinguir cuatro niveles:

1. **Observación:** qué se ve, se mide o reporta el operador, en qué archivo y momento.
2. **Causa confirmada:** mecanismo demostrable en el prompt, código, referencia, metadatos o factura.
3. **Hipótesis:** explicación plausible que todavía no se aisló mediante comparación.
4. **Regla operativa:** cómo prevenir o recuperar el problema, con condición de detenerse.

No convertir la salida de una corrida en una ley del modelo. Una guía defectuosa puede producir un defecto coherente con ella; un fallo al preservar referencias no demuestra que toda edición de esa familia sea incapaz. Una mejora local tampoco acredita todos los demás parámetros de la ruta.

### Unidades que nunca se deben confundir

| Unidad | Qué representa | Confusión que evita |
| --- | --- | --- |
| Modelo y versión | Motor exacto registrado en la solicitud | Higgsfield y fal son superficies/proveedores; no son variantes de Seedance |
| Ruta y operación | Proveedor, endpoint, edición/referencia/generación/restauración, controles efectivos | La web, el MCP y la CLI pueden exponer capacidades diferentes |
| Solicitud/job | Un envío facturable con identidad persistente | Un timeout o un monitor no autoriza un envío nuevo |
| Variante | Cada candidato producido por una solicitud o flujo | Un flujo puede devolver varias variantes con costo propio |
| Toma | Unidad visual con acción y cámara | Un job de 30 segundos puede contener varios planos; no prueba toma continua |
| Versión editorial | Combinación de fuentes, tiempos, audio y gráficos | V17 no significa diecisiete generaciones completas |
| Exportación | Archivo codificado para revisión o destino | Exportar 1080p o 4K no prueba detalle nativo ni aprobación |
| Aprobación | Decisión sobre un objeto/versionado concreto | Una cartela aprobada no aprueba su integración, mezcla o publicación |

Un ledger útil relaciona estas unidades: `solicitud → variantes → archivos fuente → fragmentos usados → versión → exportaciones → revisión`. Registra por separado costo cotizado, reservado/autorizado, reportado por proveedor y facturado; conserva moneda/unidad original.

## 2. El trabajo previo con Claude forma parte de la producción

La producción no empezó al solicitar el video completo. El operador y Claude prepararon pieza por pieza el kit, eligieron cámaras, cantidad de coberturas, ángulos y referencias. `PRODUCCION.md` registra 26 piezas del primer kit, estados de interfaz y la exploración H3; el manifiesto conserva archivos y hashes. La atribución colectiva del operador es evidencia del proceso; no inventar autoría individual de cada archivo si no hay registro.

Las piezas T01–T06 separaban caja, pregunta, resultados, turno de chat, respuesta y chip. T08–T11 separaban cartelas; L01–L04 firmas; P01 avión; S01 cielo. La independencia permitió reutilizar referencias y corregir una pieza sin rehacer todo. Más adelante cambió el alcance: sólo cartelas posteriores al avión y cierre podían componerse localmente; la UI debía permanecer generativa. No recuperar el plan inicial de overlays universales como una autorización vigente.

La planificación de cámaras evolucionó. H3 v3 describía dron amplio, macro y contrapicado/orbita, con 12 planos; planes posteriores A/B/C distribuían lectura, travelling lateral y vista elevada por toda la película. **Tres familias de cámara no equivalen a tres cortes del avión.** Tampoco son tres cámaras físicas ni un solve 3D recuperado.

La mejora del método consiste en guardar dos documentos distintos:

- **Biblioteca de cobertura:** vistas disponibles del sujeto, marca correcta, material, luz y función de cada referencia.
- **Mapa temporal de cámara y acción:** cuándo entra cada cobertura, qué debe verse, desplazamiento del objeto respecto a cámara/nubes/horizonte, escala antes/después del corte, tiempo de lectura y salida.

Una referencia de perfil resuelve identidad lateral; no resuelve por sí sola la trayectoria hacia ese perfil. Una imagen de avión aún en cuadro tampoco demuestra cómo dejará cielo limpio para los textos.

## 3. Aciertos: mecanismo, siguiente mejora y prueba

| Acierto observado | Por qué ayudó | Cómo mejorarlo sin deshacerlo | Prueba que corresponde |
| --- | --- | --- | --- |
| Kit modular previo a las corridas | Aísla decisiones de forma, copy y estado; evita pedir que un modelo invente simultáneamente todo | Añadir rol, prioridad, incompatibilidades, fecha, hash, aprobación y cámara compatible a cada recurso | Abrir el archivo realmente enviado; cotejar orden de slots y rol con payload guardado |
| Mismo avión en varias vistas | Permite comparar motores, ala, cola, librea y proporciones entre encuadres | Cubrir entrada, cruce y salida; separar identidad de look integrado; retirar vistas alternativas incompatibles | Comparación por ángulo y secuencia; no aprobar sólo el frente |
| Exploración H3 de macro/lateral/aérea | Mostró una dirección de cámara que el operador reconoció como útil | Convertir el hallazgo en clip corto de movimiento con función explícita, sin arrastrar tipografía o estelas defectuosas | Rúbrica: lectura, volumen, avance relativo, identidad; revisar qué atributos copió el siguiente motor |
| Narrativa corregida con el operador | Distinguió resultado de búsqueda, turno de usuario, respuesta y citación; dio causalidad a la marca | Convertirla en estados observables con entrada, cambio y evidencia de salida; fijar el momento principal antes de elegir efectos | Lectura completa sin audio: un tercero identifica búsqueda→respuesta→cita→transformación |
| Selección por componente de V7/V9/V11 | Rescató valor de masters rechazados y evitó regenerar cada sección lograda | Catálogo de fragmentos con defectos, frames utilizables y handles de entrada/salida, independiente de la etiqueta de versión | Ensayo de cada empalme, dirección y velocidad aparente; nunca inferir continuidad del parecido de dos stills |
| Punch-v3 congelado | Evitó perder la coreografía aprobada al experimentar con fondos y sonido | Guardar fuentes, fuentes tipográficas, reloj, assets, configuración y preview aprobada; crear deltas explícitos | Hashes + scrub reproducible + lectura sobre el plate real |
| Animación del plus con causa | Orienta la mirada hacia cifra y unidad; la secuencia comunica una idea en lugar de mostrar texto plano | Reservar el gesto mayor para la idea principal; variar entradas sin competir con lectura | Identificación de orden, legibilidad después del settle y ausencia de vacíos entre cartelas |
| URL desde SVG con Luminosidad | Conserva la firma y su relación de luz con azul/morado | Separar alpha de operación de fusión; mantener jerarquía subordinada al lockup; comprobar ambos fondos | Render real: SVG íntegro, opacidad aplicada una vez, sin rectángulo sustituto ni doble firma |
| Referencia musical concreta del operador | Redujo la ambigüedad de «épico» o «fresco» a un arreglo e instrumentación reconocibles | Guardar referencia y razón de selección; diferenciar carácter de canción, duración y derecho de uso | Escucha de la pista y del montaje; procedencia/licencia por separado |
| Música y SFX en stems | Permite corregir sincronía sin cortar música ni arrastrar efectos impresos | Cada stem con fuente, ganancia, pre-roll, crest, cola y evento visual; separar técnico de perceptual | Comparar muestras y timestamps; escuchar mezcla y buses aislados |
| Omni como reparación localizada | Permitió terminar una salida/entorno sin reemplazar la película entera | Elegir ventana por el problema y sus empalmes, no por duración arbitraria; comparar conservación en toda la ventana | Entrada, centro y salida; ningún doble objeto, cielo divergente o salto de trayectoria |
| Topaz con piloto condicionado | Limitó el riesgo de alterar texto/avión antes de procesar todo | Incluir en el piloto UI, movimiento fuerte y sujeto cercano; aplicar sólo si el beneficio sobrevive en resolución destino | Pares nativos y secuencia; contornos, letras, flicker y blur; metadata y revisión del completo |
| Fuentes sin pérdida y composición única | Evita encadenar exports comprimidos y divergencia de dos masters | Servir ambas resoluciones desde la misma composición; recomponer vectores después de restaurar | Decode completo, hashes, color/PTS, correspondencia y detalle a tamaño nativo |

Los aciertos son mecanismos reutilizables, no autorización para convertir todos los proyectos en el mismo montaje. Un encargo de producto exacto, una película generativa y una actuación humana pueden requerir contratos distintos.

## 4. Fallas de dirección, referencias y montaje

### F01 — Identidad correcta, trayectoria imposible

- **Síntoma:** al cambiar de vista el avión parece frenar, retroceder o volver a aproximarse; aparece un híbrido entre vistas.
- **Capa responsable:** dirección de continuidad y selección editorial; sólo atribuir al modelo lo observado dentro de una fuente continua.
- **Evidencia:** el empalme V4 alternó H3, un fragmento Seedance y otra vez H3; la auditoría registra dinámicas incompatibles. Las vistas oficiales no describían solas esa transición.
- **Causa confirmada:** mezcla de fuentes con distinto ritmo aparente. **Hipótesis en otras corridas:** la falta de referencia temporal puede contribuir; no explica automáticamente todos los defectos de vuelo.
- **Prevención:** definir trayectoria del sujeto aparte de cámara; marcar rumbo, escala, horizonte y velocidad relativa a nubes. Conservar el núcleo de vuelo logrado.
- **Recuperación:** seleccionar una secuencia compatible o editar una ventana cuya entrada/salida pueda verificarse. No corregir adelantando y retrasando tramos a ciegas.
- **Detenerse si:** para enlazar hay que ocultar el avión con una disolvencia doble, invertir su movimiento o inventar una nueva geometría.

### F02 — La guía contradice el impacto pedido

- **Síntoma:** búsqueda frontal demasiado pronto, avance que frena al chip, portal que se percibe como pausa, cierre genérico.
- **Evidencia y causa confirmada:** V9 bajaba `rotateY` a cero temprano, terminaba el push con `smoothstep` y dibujaba URL con borde/radio CSS; el SVG real ya existía.
- **Capa responsable:** nuestra guía y dirección. No culpar al modelo por obedecer un error de referencia.
- **Prevención:** revisar la guía como película muda: aceleración, eje, lectura, jerarquía y forma exacta. Declarar qué aporta cada referencia y qué defecto no debe heredar.
- **Recuperación:** conservar la secuencia útil y corregir la fuente de movimiento/asset. No sumar adjetivos cinematográficos a una guía que transmite lo contrario.
- **Detenerse si:** una previs austera completa domina el resultado y elimina el lenguaje de cámara buscado; reducirla a referencias por función antes de gastar otra vez.

### F03 — Una instrucción propia produce el defecto

- **Síntoma:** estela o humo incompatible con el vuelo deseado.
- **Evidencia:** H3 v3 incluía `a contrail forming`; el operador señaló estelas no deseadas.
- **Causa confirmada:** la estela estaba solicitada. Su forma particular sigue siendo interpretación del modelo.
- **Prevención:** revisión adversarial del prompt efectivo, incluidas expansiones del proveedor. Buscar acciones/objetos añadidos por quien redacta.
- **Recuperación:** retirar la instrucción y seleccionar material limpio; conservar el prompt rechazado como evidencia.
- **Detenerse si:** el supuesto arreglo necesita otra solicitud antes de verificar qué se envió realmente.

### F04 — Estados correctos, coreografía ausente

- **Síntoma:** la generación salta de resultados a panel completo; falta el turno de usuario o la respuesta progresiva.
- **Evidencia:** V8 omitió chat/respuesta; V11 tenía copy útil, pero no el turno ni despliegue pedido.
- **Causa confirmada:** la salida incumplió los estados/transiciones. **Hipótesis:** referencias estáticas anclaron apariencia mejor que movimiento.
- **Prevención:** cada transición necesita evidencia visual o temporal propia; exigir el estado anterior y el posterior. Medir tiempo de lectura sobre archivo, no sobre el prompt.
- **Recuperación:** rescatar UI de una versión que sí tenga esa secuencia, dentro del alcance autorizado. Acelerar una búsqueda no crea un turno ausente.
- **Detenerse si:** la reparación exige reconstruir UI local cuando sólo cartelas y cierre fueron autorizados.

### F05 — Reserva de títulos que el plate no libera

- **Síntoma:** el avión sigue presente donde deben entrar las cartelas.
- **Evidencia:** V11 retuvo el sujeto hasta el cierre; el plan suponía offset fijo de 15,75 s. Las referencias mostraban aún el avión y no una salida/cielo limpio inequívoca.
- **Causa confirmada:** placa y plan eran incompatibles. **Hipótesis:** el paquete de referencias contribuyó a prolongar la presencia; no se aisló causalidad.
- **Prevención:** referencia de salida y de composición posterior sin sujeto; reservar cielo natural, sin placeholders o paneles que el modelo copie.
- **Recuperación:** nuevo montaje con fuentes existentes o reparación localizada aceptable; recolocar títulos sólo si conserva el contrato de lectura/cámara y queda revisable.
- **Detenerse si:** hay que congelar fondo, cubrir el avión o quemar texto nuevo encima de letras existentes para aparentar cumplimiento.

### F06 — Editar no significa conservar píxeles

- **Síntoma:** doble avión, nuevo cielo, salto final, cambio de estilo.
- **Evidencia:** piloto Omni V10 de 228 cuadros rechazado. La ventana V14 se aceptó para integración bajo oclusión y mezcla de nubes.
- **Causa confirmada:** la edición reinterpretó contenido y no cumplió el enlace. **Hipótesis:** fondos distintos en referencias de identidad aumentaron el conflicto.
- **Prevención:** fuente, ventanas, referencias compatibles y contrato de conservación; no declarar stateful una CLI que sólo recibe MP4/prompt.
- **Recuperación:** descartar piloto fallido; elegir otro punto de entrada/salida sólo con hipótesis concreta y autorización de gasto si aplica.
- **Detenerse si:** no hay empalmes verificables o la ventana requiere regenerar las partes ya aprobadas.

### F07 — Cantidad de cámaras tratada como un número de cortes

- **Síntoma:** tres vistas del avión pero UI plana, corte de más que reinicia vuelo, cobertura sin función narrativa.
- **Capa responsable:** planificación de tomas. «Tres cámaras» describía una familia de cobertura a lo largo de la película.
- **Prevención:** asignar a cada cámara una función por beat; evaluar qué revela y cuánto tiempo de lectura deja. Registrar cambios entre planes para no mezclar nomenclaturas históricas.
- **Recuperación:** retirar cobertura redundante, sostener dirección y usar la cámara para conectar estados.
- **Detenerse si:** se añade una vista sólo para cumplir la cifra aunque debilite continuidad o lectura.

## 5. Fallas de audio y percepción

### F08 — Prohibición verbal de voz tomada como control técnico

- **Síntoma:** Seedance lee cartelas aunque se pidió música/SFX sin voz.
- **Evidencia:** V7/V8 con voz; V11 con `generate_audio:false` realmente sin stream de audio.
- **Causa confirmada:** la prohibición no bloqueó voces en esos outputs; el control de ruta apagaba todo el audio, no aislaba narración.
- **Prevención:** verificar controles de la superficie elegida; cuando voz es inaceptable, video sin audio y banda sonora independiente.
- **Recuperación:** retirar audio contaminado del master. Separación puede servir como referencia, no garantiza instrumental limpio.
- **Detenerse si:** el único argumento de limpieza es ASR vacío, nombre `no_vocals` o una prohibición en prompt.

### F09 — Residuos vocales y efectos impresos heredados

- **Síntoma:** voz amortiguada, SFX duplicados, timbre opaco.
- **Evidencia:** V9 heredó `v7/audio-clean.wav`, procedente de Demucs; el operador reportó restos. ASR no acreditó su ausencia perceptual.
- **Capa responsable:** selección de fuente y QA. Que guste la música no aprueba la mezcla contaminada.
- **Prevención:** estado por fuente: aprobada, referencia, contaminada o pendiente; conservar stems originales.
- **Recuperación:** reconstruir desde instrumental y efectos limpios; no encadenar filtros para esconder la lectura.
- **Detenerse si:** cada reparación quita más definición pero no resuelve el defecto que escucha el operador.

### F10 — Sincronía por cortes que rompe continuidad musical

- **Síntoma:** sensación de demora, silencio intermedio y nuevo comienzo; SFX a tiempo pero desconectados de la música.
- **Evidencia:** V9 dividió la fuente en nueve intervalos con distinto `atempo`; el puente local Heroic se rechazó aunque eliminaba el vacío medido.
- **Causa confirmada:** cambios locales de reloj/cortes y rechazo perceptual registrado. No afirmar que todo tempo uniforme sea inaudible.
- **Prevención:** arreglo íntegro y reloj musical uniforme; efectos según eventos reales. Imagen se analiza antes de producir la mezcla final.
- **Recuperación:** fuente limpia completa. V15 usó el arreglo Envato de 32 s con un único tempo 1,14× y afinación conservada; V17 desplazó stems −0,5 s, sin otro cambio de tempo ni cortes internos.
- **Detenerse si:** se necesita cortar una mezcla con efectos impresos para ajustar cada escena, o el operador rechaza un enlace que las métricas dan por continuo.

### F11 — Momento de marca reducido a clic o subgrave

- **Síntoma:** la transformación principal no tiene peso; en la práctica suena a pulsación sencilla.
- **Evidencia:** feedback V15; bus limitado a 160 Hz y textura breve de guitarra. V16 sustituyó por una acción continua de 3 s con cuerpo en medios.
- **Capa responsable:** dirección sonora/mezcla. La importancia semántica no se resuelve sólo alineando un pico.
- **Prevención:** definir anticipación, impacto y liberación; relacionarlos con la instrumentación y pulso. Mantener música atravesando el punto de marca.
- **Recuperación:** redistribuir energía con rango suficiente y espacio gradual; V16 aplicó hasta −2,5 dB bajo transformación, sin apagar música.
- **Detenerse si:** sólo se mide subgrave o loudness general. Bandas y mono detectan dependencia espectral, pero no prueban cómo suena en teléfono: hace falta escucha.

### F12 — Efectos repetidos sin causa visual

- **Síntoma:** motores durante cartelas, golpes idénticos para cada texto o teclado que sigue cuando no se escribe.
- **Evidencia:** feedback del operador sobre tres motores sin sentido; mezcla recuperada terminó usando un paso ligado al avión y su cola anterior a títulos.
- **Prevención:** un cue requiere evento visible o anticipación intencional declarada; no convertir el cue sheet en una lista de adornos.
- **Recuperación:** escuchar buses y retirar lo redundante antes de generar más. Acentuar jerarquía de ideas, no cada letra.
- **Detenerse si:** no se puede explicar qué acción provoca cada efecto o qué relación musical lo sostiene.

## 6. Fallas de calidad, marca y exportación

### F13 — Tamaño del raster usado como prueba de nitidez

- **Síntoma:** archivo 1080p/4K que sigue suave o pierde textura.
- **Evidencia:** fuentes 720p, recortes y ampliación hasta 1,95× en el montaje; V16 restauró desde 1080p. V17 admite explícitamente compresión MP4 con pérdida.
- **Prevención:** registrar resolución nativa de cada fuente, crop y escala efectiva. Revisar detalle real a tamaño nativo y en destino; no usar bitrate como sustituto.
- **Recuperación:** volver a fuentes, intermedio sin pérdida, piloto de restauración y gráficos recompuestos después. No encadenar el master final comprimido como fuente de cada versión.
- **Detenerse si:** restauración cambia letras/avión, genera textura temporal inestable o no mejora frente al original. No pagar un completo sólo por haber completado el piloto.

### F14 — Logo parecido pero geometría incorrecta

- **Síntoma:** al pasar SKY a blanco desaparece la separación de flecha/K; URL demasiado grande o inventada.
- **Evidencia:** el SVG anterior tocaba punta y trazo; `sky-on-dark.svg` conserva separación de 0,4797 unidades en viewBox 68. V17 deriva blanco de ese vector y revisa recortes nativos. URL fue sustituida por SVG real/Luminosidad y reducida de 620 a 320 px equivalentes.
- **Prevención:** comparar geometría en el color y tamaño de uso; no basta la etiqueta «oficial». Conservar fuente/procedencia de cada variante y prueba sobre fondos finales.
- **Recuperación:** vector exacto y composición local del cierre autorizado; preservar escala, jerarquía y demás firmas.
- **Detenerse si:** el cambio exige redibujar por intuición, o el detalle sólo se ve ampliado y se pierde en la exportación destino.

### F15 — Metadatos, interpolación y duración asumidos

- **Síntoma:** cuadros perdidos, cambio de color, duración distinta, suavizado que deforma bordes.
- **Evidencia:** V11 entregó 713 cuadros, no 720. En post, cambios de pixfmt/color podían reiniciar filtros. V17 corrigió tags Rec.709 por remux con payloads idénticos.
- **Prevención:** conformar dimensiones, fps, PTS y color antes de componer; comprobar duración real. No asignar fps/tags sin interpretar la fuente.
- **Recuperación:** si son sólo tags, remux sin recodificar tras comprobar interpretación correcta. Para un hold leve, considerar mapa monotónico de frames originales y revisar cadencia, antes de optical flow.
- **Detenerse si:** el tratamiento altera letras, doble contorno o cadencia; una correlación numérica alta no es certificación perceptual.

## 7. Fallas económicas, de seguimiento y de evidencia

### F16 — Importe sin autorización y autorización sin límite efectivo

Son dos incidentes diferentes:

| Caso | Evidencia | Fallo | Regla derivada |
| --- | --- | --- | --- |
| V9 | USD 40,989380454 por diferencia de saldo; auditoría registra ausencia de aprobación expresa del importe | Gobierno de autorización | Ligar importe total, inputs de video, output, resolución y variantes a la solicitud antes de enviarla |
| V11 | Máximo autorizado USD 25; factura individual USD 34,162558; estimación USD 23,88204 | Control de exposición económica | Una estimación no impone un cap al proveedor. No presentar saldo suficiente o descuento publicado como protección |
| Topaz V16 | Tope piloto+completo USD 5,60; precio reportado USD 5,59944 | Ejemplo condicionado dentro de alcance | Un piloto, revisión y un completo; conservar diferencia entre precio reportado y factura contable |

La discrepancia V11 no tiene causa facturadora demostrada: no atribuirla a bitrate, audio o descuento ausente. Una fórmula que falló necesita reconciliación antes de reutilizarse como certeza.

**Prevención mejorada:** cotizar la ruta exacta y todas sus entradas/salidas/variantes; registrar incertidumbre. Si no existe cap del proveedor, tratarlo como exposición y no prometer límite duro. Un requisito de tope estricto exige una ruta con control suficiente o una operación cuyo máximo verificable quepa; pedir resolución del riesgo antes de un gasto dependiente, sin repetir permisos ya otorgados para el mismo alcance.

**Recuperación:** consultar el evento facturado por request, relacionarlo con saldo y cerrar ledger. No reenviar por esperanza de menor precio. **Detenerse:** discrepancia material, presupuesto consumido o variante no contemplada.

El reporte del operador de más de USD 150 no puede reemplazarse por una suma parcial. Créditos, cotizaciones, precios del conector, estimaciones por tokens y facturas no son sumables sin conciliación. V6 devolvió cuatro variantes Music v2; contarlas importa. «USD 0 incremental» para post local significa sin llamadas nuevas, no trabajo sin costo operativo.

### F17 — Draft supuesto o solicitado pero no operado

- **Evidencia:** la web de Higgsfield mostró Draft; el conector usado no lo exponía y el catálogo fal consultado tampoco. No hubo pipeline Seedance Draft→1080p en SKY.
- **Prevención:** comprobar ruta exacta, parámetro, artefacto de continuación y facturación. Una generación normal a baja resolución no equivale a Draft.
- **Recuperación:** si la ruta no expone el modo, decidir una prueba reducida explícita o preparar otra superficie; declarar lo que se operó realmente.
- **Detenerse si:** se afirma que una prueba permite promover la misma toma cuando sólo existe una nueva generación desde referencias.

### F18 — Timeout/espera confundidos con fallo y seguimiento abandonado

- **Evidencia:** V8 terminó y el operador tuvo que avisar; Topaz posterior mantuvo una única sesión hasta recuperar resultado. El completo tardó aproximadamente una hora, sin progreso porcentual fiable.
- **Prevención:** guardar IDs antes de esperar; monitor con consulta del mismo job, continuación local pendiente y condición terminal. Persistir el estado para reanudar sin duplicación.
- **Recuperación:** consultar estado y descargar una vez. Revisión, integración y entrega aún faltan después de `completed`. Pausar automatización al cerrar.
- **Detenerse si:** un estado incierto llevaría a otro POST pagado; consultar primero. Si falla realmente, informar sin retry automático no autorizado.
- **Comunicación:** no extrapolar ETA exacta desde piloto/cuadros; cola, carga y procesamiento varían. Mantener silencio si el monitor no tiene cambios accionables cuando así se pidió.

### F19 — QA técnico presentado como aprobación perceptual

- **Evidencia:** ASR vacío no detectó lo que el operador oyó; contacto de cuadros no equivale a observar todo el movimiento a 1×. V17 registra 59 muestras, 96 cuadros densos y 18 del cierre, además de métricas.
- **Prevención:** declarar capacidad real y quién observó qué. Separar integridad de archivo, contenido visual, continuidad, escucha y decisión creativa.
- **Recuperación:** acotar afirmación: «decode y medición verificados; escucha pendiente». Conservar feedback que contradice una métrica y corregir el método.
- **Detenerse si:** se afirma ausencia de voz, buen ritmo, aprobación final o publicación desde nombres de archivo, estado de API o un informe automático.

### F20 — Historia y herramientas posibles presentadas como ejecución

- **Evidencia:** Music v3 se pidió pero no se verificó disponible ni se usó; Magnific quedó fuera por falta de créditos; AE, Resolve y Blender no ejecutaron este acabado.
- **Prevención:** registrar `usado`, `probado y descartado`, `investigado`, `disponible sin verificar` y `propuesto`. El proveedor elegido no define el motor subyacente.
- **Recuperación:** ligar cada tramo final a archivo y operación concreta. No atribuir a Omni la película entera ni al último modelo todos los materiales heredados.
- **Detenerse si:** no hay artefacto/registro para sostener que una herramienta ejecutó la acción o un modelo generó ese resultado.

## 8. El mapa real importa más que el nombre del último modelo

V17 duró 29,5 s/708 cuadros a 24 fps. Su procedencia aproximada fue:

| Tiempo V17 | Imagen principal | Lo que la afirmación permite concluir |
| --- | --- | --- |
| 0–2,167 s | Seedance V7 | Búsqueda lateral rescatada |
| 2,167–8,5 s | Seedance V9 | Resultados/turno/respuesta/cita; hold fuente 6–9 s reducido a 6–8,5 s |
| 8,5–12,042 s | Seedance V11 | Portal y vuelo del montaje heredado |
| 12,042–17 s | Omni V14 | Reparación localizada, entrada bajo oclusión |
| 17–17,5 s | Omni + cielo V11 | Empalme de nubes, sin fundido de dos aviones |
| 17,5–25,5 s | Cielo V11 | Fondo animado; cartelas sobrepuestas desde 15,25 s |
| 25,5–29,5 s | Composición local | Logos, URL, azul→morado |

Toda la placa de 26 segundos de V16 fue restaurada antes del ajuste V17. «Velocidad conservada en V17» significa respecto a V16; el montaje anterior ya había retiming y crop. El ajuste eliminó 12 cuadros de un hold con selección monotónica, sin alterar secuencia de activación/vuelo. Una composición común alimentó 4K y 1080p; el segundo no se extrajo del MP4 4K ya comprimido.

Música final: arreglo Envato, con tempo uniforme 1,14× aplicado en V15; V17 desplazó música/marca/avión/cierre −0,5 s y mantuvo UI inicial. El silencio digital retirado fue verificado antes de desplazar. Estos datos hacen reproducible el resultado; no son una receta de tempo o duración universal.

## 9. Rúbrica para decidir la próxima acción

Antes de editar, escribir una ficha breve por defecto:

```text
Versión/archivo/hash y rango de cuadros:
Observación y quién la percibió:
Qué ya funciona y no debe cambiar:
Capa responsable: dirección | referencia | generación | montaje | gráfico | audio | export | operación
Causa confirmada / hipótesis / dato faltante:
Acción mínima propuesta:
Alcance permitido por el operador:
Costo incremental / exposición máxima verificable:
Prueba de éxito sobre archivo real:
Regresión a revisar:
Condición de detenerse y fuente de rollback:
```

Orden de decisión:

1. Corregir una afirmación, metadata o referencia equivocada antes de generar.
2. Si el material ya contiene la acción, probar edición reversible dentro del alcance.
3. Si falta contenido, comprobar si una fuente existente lo aporta sin romper continuidad.
4. Sólo entonces considerar reparación generativa localizada o nueva toma; definir empalmes y costo antes del envío.
5. Revisar el resultado completo de la intervención, no sólo el defecto que motivó el cambio.
6. Reabrir audio cuando cambien eventos/duración; no regenerarlo por inercia si los stems existentes se pueden conservar.
7. Entregar versión identificable, con límite de QA y estado de aprobación; cerrar monitor sin eliminar historia.

## 10. Evidencia y límites de reutilización

Rutas relativas a la raíz del repositorio, salvo OneDrive. Son evidencia histórica, no comandos de nueva generación ni permisos para gastar.

- [Retrospectiva completa V17](../../../../docs/operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md): cronología, herramientas utilizadas, costos y mapa de fuentes.
- `OneDrive-EfeonceGroupSpA/Alineación/2. Campañas/CMP-003_sky-nos-eligio-seo-aeo/PRODUCCION.md`: trabajo inicial con Claude, kit, H3 y cobertura de cámaras; leer sus encabezados históricos antes de usar planes antiguos.
- [Kit/manifiesto](../../../../ai-generations/2026-09-23_cmp003-sky-video/kit/MANIFIESTO.json): archivos y hashes de referencias.
- [Auditoría V4](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/AUDITORIA-Y-CORRIDA-COMPLETA.md): responsabilidad del empalme.
- [Auditoría V10](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v10-local/AUDITORIA-Y-PLAN.md): guía, alcance, audio, costos y errores confirmados.
- [Resultado/factura V11](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v11-full/REVIEW.md): 713 cuadros, ausencia de stream audio, incumplimientos y factura individual.
- [V16 piloto](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v16-brand-repair/qa/pilot-review.json) y [ledger](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v16-brand-repair/cost-ledger.json): restauración condicionada y precio reportado, no factura.
- [V17 reproducible](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/README.md) y [revisión](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan/qa/review.json): outputs, conservación, logo, audio y límites de evidencia.
- [Sonido sin voz](../../audio-studio/efeonce/NO_VOICE_MUSIC_SFX.md) y [continuidad musical](../../audio-studio/efeonce/APPROVED_MUSIC_CONTINUITY.md): contratos de fuente limpia, mezcla, aprobación y escucha.

Antes de una producción nueva se deben reverificar capacidades, rutas y tarifas actuales. Este companion conserva el aprendizaje de decisiones y pruebas; no declara inmutables los modelos, precios, controles ni herramientas disponibles.

## 11. Delta 2026-10-03 — spot animado 2D «Sparks × Efeonce AEO»

**Estado del caso:** v2 exportada y **aprobada por el operador** (49,6 s; «Quedó genial… Muy bueno»); su escucha fue
la aprobación sonora. Licencia comercial de la música generada [pendiente]; publicación no realizada. Hechos:
`ai-generations/2026-10-03_sparks-aeo-60s/INVENTARIO-DE-HECHOS.md`; receta en
[el workflow del spot animado 2D](../workflows/animated-2d-spot-composed-brand-assets.md); historia en la
[retrospectiva](../../../../docs/operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md).

### Aciertos

| Acierto observado | Por qué ayudó | Cómo mejorarlo | Prueba |
| --- | --- | --- | --- |
| Preproducción en papel y storyboard en canvas aprobado por escena antes de cualquier toma | El operador corrigió elenco, mirada y copy sobre láminas, no sobre video pagado | Convertirlo en orden transversal ([preproducción §12](video-preproduction-and-production.md#12-preproducción-transversal-orden-y-gates)) | Ninguna toma generada sin su lámina aprobada |
| Mascotas compuestas desde SVG oficial con la mirada del rig emulada | Identidad exacta sin pedírsela al modelo | Variantes de mirada versionadas por personaje y dirección | Comparar contra el SVG; sin espejo ni formas nuevas |
| Acabado de luz mezclado por zonas con salida de error | Lo exacto queda demostrablemente intacto | Usar el mismo gate en cualquier retoque generativo sobre una composición | 0 px cambiados fuera de zonas+margen [medido] |
| Piloto comparativo de dos variantes del mismo motor | Eligió por fidelidad observada, no por nombre comercial | Una hipótesis por piloto, mismos cuadros | Cuadros extraídos lado a lado a tamaño real |
| Corte mudo con placas provisorias | Permitió juzgar ritmo antes de producir audio | Mantenerlo como paso fijo | Corte reproducible antes de la VO |
| Un solo mapa de tiempos para la v2 | Re-timó video, voz, SFX y subtítulos sin deriva | Escribirlo desde el primer corte | Cues y eventos coinciden tras el re-timing |
| Placa de cierre animada al compás y logo final sin voz | El cierre respira y cada logo entra con su palabra | Diseñar la placa previa como portadora del llamado a la acción | Aprobación del operador |
| Cama derivada del kit oficial (audio-to-audio) | Conservó identidad y tempo pedido | Medir bandas antes de mostrar | Tempo conservado (autocorrelación) y balance corregido |
| Declarar lo no verificado | Sin ASR ni escucha propia, la escucha del operador fue el control explícito | Mantener la frase en cada entrega | El reporte separa medición de escucha |

### F21 — Elenco en el papel equivocado

- **Síntoma:** el borrador ponía a una persona del elenco fotográfico (que representa al equipo Efeonce) como cliente.
- **Capa responsable:** preproducción/casting. Detectado antes de generar.
- **Prevención:** regla de quién puede aparecer en el paso 4 del orden transversal; elenco 2D ficticio para clientes.
- **Detenerse si:** la ficción exige que alguien del equipo actúe de cliente: volver al operador.

### F22 — Premisa de la oferta equivocada en la VO

- **Síntoma:** el guion v1 decía que los Sparks «existen para arreglar el AEO»; el operador lo corrigió.
- **Causa confirmada:** la VO se escribió sin cargar la skill dueña de la práctica ni el canon del personaje.
- **Prevención:** cargar `seo-aeo-practice` (o la skill dueña que corresponda) y el canon antes de escribir; nunca
  prometer resultados que la práctica prohíbe.
- **Recuperación:** reescritura completa de la VO y nueva locución (v2).

### F23 — Ritmo estirado para cumplir la duración del brief

- **Síntoma:** «va muy lento… querías cumplir el minuto».
- **Causa confirmada:** las tomas se alargaron para llegar a 60 s.
- **Prevención:** la historia decide la duración; avisar al operador cuando difiere del brief.
- **Recuperación:** re-timing 1,0–1,5× desde un solo mapa; v2 aprobada a 49,6 s.

### F24 — El modelo de video reinterpreta lo que debía quedarse quieto

- **Síntoma:** texto ilegible en pantalla (S1, S8), escena virada al verde (S6), mascotas giradas en 3D (variante Max
  del piloto), salto de trayectoria cuando los cuadros no comparten eje.
- **Causa confirmada:** el prompt no prohibía texto ni fijaba paleta; la variante elegida en piloto era menos fiel.
- **Prevención:** prohibir texto, fijar paleta, mismo eje inicio/fin, variante elegida por piloto.
- **Recuperación:** rehacer sólo la toma afectada; conservar el descarte como evidencia.

### F25 — Movimiento de vectores con saltos

- **Síntoma:** el zoom de las pantallas de chat avanzaba a tirones.
- **Causa confirmada:** `zoompan` redondea el encuadre a píxeles enteros.
- **Prevención y recuperación:** dibujar cada cuadro desde el vector con escala decimal.

### F26 — Sonido absoluto que choca con la voz tras re-timar

- **Síntoma:** el logo sonoro intermedio cayó sobre una línea de VO en la v2.
- **Causa confirmada:** el evento conservó su tiempo absoluto mientras el resto se remapeaba.
- **Prevención:** todo evento de audio pasa por el mismo mapa; revisar choques con la voz tras re-timar.
- **Recuperación:** se retiró (el reveal ya cerraba con el logo sonoro).

### F27 — Placeholders y desbordes que llegan a la entrega

- **Síntoma:** «[Marca ficticia A/B/C]» visibles en la v1 entregada; la pregunta se salía de su burbuja desde la v1.
- **Capa responsable:** QA visual. La revisión no miró esos cuadros al 100 %.
- **Prevención:** cuadros al 100 % en cada pantalla con texto; búsqueda de placeholders antes de exportar.
- **Recuperación:** marcas inventadas verificadas sin homónimo (búsqueda web 2026-10-03) y burbuja ensanchada.

### F28 — Herramientas que alargan o desajustan sin avisar

- **Síntoma:** el ensamble salió de 49,2 s en vez de 46,5 s; la cama regrabada salió cargada de graves (medios 21 %
  contra ~35 %); el master v2 quedó a −16 LUFS cuando la norma para video y redes pide −14 LUFS.
- **Causa confirmada:** `overlay` sin `shortest=1` ni `-t`; el modelo de música no conserva el balance; el nivel se
  fijó sin declarar el destino.
- **Prevención:** `shortest=1` + `-t`; medir bandas de toda música generada; masterizar por destino (redes se
  re-masterizan a −14 LUFS desde el premaster).
- **Detenerse si:** se entregaría un archivo cuya duración o nivel no se midió sobre el export final.

Excepciones del caso (no reglas): registro de energía bajo locución, contra el canon sonoro, por decisión del
operador; licencia de la música generada sin confirmar con legal.

## 12. Delta 2026-10-09 — reel vertical de 12 s para la muestra X-Ray de Pibank

**Estado del caso:** publicado dentro de la muestra AEO X-Ray de Pibank Perú (campo `reel`; commit efeonce-think
`5594128`). Receta en [fotos aprobadas → reel vertical con transición punto → logo](../workflows/approved-photos-to-vertical-reel-with-logo-transition.md);
expediente fuera de git (`09-XRay-Pibank/video/`). Costo aproximado: US$1,9 imagen + Omni y US$0,70 música.

### F29 — Un filtro ffmpeg único que se queda trabado

- **Síntoma:** un montaje en un solo filtro con `zoompan` + `xfade` quedó detenido sin consumir CPU.
- **Prevención y recuperación:** renderizar por segmentos (toma + overlay) a intermedios y concatenar al final.

### F30 — Conector local que falla y se confunde con bloqueo del servicio

- **Síntoma:** los conectores locales `elevenlabs` y «ElevenLabs Player» fallan (clave cargada como ID, no `sk_…`).
- **Prevención:** antes de declarar bloqueo, probar los demás conectores del mismo servicio. El remoto oficial
  (`creative_generate_in_flow`, nodo `music`, `eleven_music_v2_5`) funcionó: ≈ US$0,35 por pista, ≈ 5–7 min.

### F31 — Envío a Omni con ADC vencida

- **Síntoma:** el intento falló antes del envío (sin cobro).
- **Recuperación:** `pnpm gcloud:auth:playwright -- --force` (requirió login del operador) y reintento.

### F32 — Música «instrumental» sin comprobar

- **Prevención:** pasar cada pista por `whisper-cli` (modelos en `~/.cache/hyperframes/whisper/models/`) para detectar
  voz. Un ASR vacío no reemplaza la escucha del operador.
- **Nivel por destino:** el destino entregado es el reproductor de la muestra web; se mezcló a −16 LUFS (medido
  −15,5) con fades. Si luego se publica en redes, re-masterizar según F28.

## 13. Delta 2026-10-12 — reel de muestra de 25 s para una marca que pauta en TV

**Estado del caso:** v2.2 aprobada por el operador el 2026-10-12 («Bien, vamos con ese») como muestra para la propuesta
a Sika Mexicana (Wherex N.º 1164); la v1 fue rechazada. La propuesta se presentó el 2026-10-13, con el reel en su página y no como adjunto (límite de 20 MB del portal). El agente no
oye: voz, golpes y música las juzgó el operador. Receta en
[cuadros fijos → planos → capa de motion de campaña](../workflows/client-sample-reel-stills-to-clips-with-brand-motion-overlay.md);
fuentes en `ai-generations/2026-10-12_sika-propuesta-tecnica/` (`LEEME.md` y `reel/v2/`).

### Aciertos

| Acierto observado | Por qué ayudó | Prueba |
| --- | --- | --- |
| Idea con antagonista y cortes fijados antes de generar | Cada plano nació con función y duración; locución y golpes se amarraron a los cortes | Estructura 4 · 6 · 8 · 10 · 12 · 17 · 21 s en `montaje.sh` |
| Bloque de look compartido en todos los cuadros fijos | Los planos se leen como una sola película | `stills.batch.json` |
| Envase generado con el render oficial del cliente como referencia | La etiqueta salió exacta y se sostuvo en movimiento en este caso | Revisión al 100 % del cuadro y del plano |
| Sello tomado del generador del manual de campaña | Marca exacta sin redibujar | `build-overlay.py` importa `gen.sello_lanz` |
| Montaje por segmentos y mezcla rehacible aparte | Se corrigió música y gota sin rehacer todo | `SOLO_AUDIO=1 bash montaje.sh` |

### F33 — Animatic con fondo plano presentado a una marca de TV

- **Síntoma:** la v1 (animatic con cortina de fondo + audio) fue rechazada: «no se ve cinemático y profesional como
  requiere Sika… es una marca gigante de México que pauta en TV y medios programáticos, debe ser de impacto».
- **Capa responsable:** dirección; se eligió el nivel de producción por lo que el comprador admitía (storyboard o
  animatic), no por la vara de la marca.
- **Prevención:** antes de elegir el nivel, preguntar dónde pauta la marca. Si es TV, la muestra se dirige como
  comercial: idea con antagonista, planos generados, luz y cámara declaradas. Lo admitido por las bases es el piso.
- **Recuperación:** replanteo completo aprobado («El agua siempre busca una entrada»); la firma de la v1 se conservó.
- **Detenerse si:** se va a entregar como «video» un animatic con audio sin haberlo dicho.

### F34 — Capa gráfica que no sigue la línea de la campaña

- **Síntoma:** «¿Sientes que el video sigue la línea gráfica que se armó?» (operador). No la seguía.
- **Causa confirmada:** la capa de motion se diseñó sin abrir el manual de identidad de la campaña; usaba su tipografía
  pero no su sistema.
- **Prevención:** antes de animar, listar del manual los elementos, sus colores y **sus usos reservados** (aquí, el
  triángulo rojo es sólo de la firma y el logo, y no se usó suelto). La capa de motion es una aplicación del manual.
- **Recuperación:** capa rehecha: etiquetas de lugar en caja amarilla con texto negro y corte a 13°, campo amarillo con
  cortes negros, sello aprobado y titulares sobre panel amarillo (v2.2).

### F35 — Elemento de marca inventado en vez del aprobado

- **Síntoma:** el agente dibujó una caja «2 EN 1» propia donde el manual ya tenía un sello de lanzamiento aprobado.
- **Causa confirmada:** se redibujó en lugar de reutilizar. Redibujar o inventar una variante fue rechazado dos veces en
  el mismo encargo.
- **Prevención:** lo aprobado se **importa desde su generador** (aquí `gen.sello_lanz` del manual), no se copia a mano
  ni se aproxima. Si el generador no existe o no alcanza, se pregunta al operador. Mismo principio que F14.
- **Recuperación:** la caja inventada se reemplazó por el sello aprobado.

### F36 — Cámara lenta por estiramiento

- **Síntoma:** la gota «cae muy lento… es extraña la lentitud» (operador).
- **Causa confirmada:** el plano sólo servía hasta el segundo 2,85 (después la junta se deformaba) y se estiró para
  llenar los 4 s del gancho. Estirar un plano para cubrir su tiempo se nota.
- **Prevención:** la cámara lenta se pide en el plano, no se fabrica en el montaje; anotar hasta qué segundo sirve cada
  plano antes de asignarle duración. Si no alcanza, se regenera o se acorta el tramo.
- **Recuperación:** plano regenerado con caída a velocidad real y cámara lenta sólo desde el impacto, y la junta
  declarada rígida en el prompt; entra sin retime.
- **Detenerse si:** un tramo necesita un retime para llegar al corte y nadie miró el resultado a velocidad normal.

### F37 — Música reeditada en trozos

- **Síntoma:** «La música la cortaste súper extraño… se nota muchísimo» (operador).
- **Causa confirmada:** la pista generada salió de 43 s para un video de 25 s y se reeditó en cinco trozos para calzar
  los cortes. Es la misma clase que F10, ahora con una pista más larga que la pieza.
- **Prevención:** elegir **un tramo continuo** del largo del video cuyos acentos caigan cerca de los cortes; reforzar
  los cortes con golpes sintetizados, no con ediciones de la música.
- **Recuperación:** tramo 17,45–42,45 de la pista, sin cortes internos, con golpes graves en 10,0 y 21,0 s. Detalle en
  `audio-studio/efeonce/APPROVED_MUSIC_CONTINUITY.md`.

### F38 — Trampas de herramienta que se repiten

- **ffmpeg detenido:** un solo ffmpeg con ocho entradas y `concat` se quedó detenido dos veces en segundo plano (misma
  clase que F29). Por segmentos y con `-nostdin`.
- **Conectores locales de ElevenLabs:** seguían fallando el 2026-10-12 (`invalid_api_key`; misma causa que F30). Salió
  por el conector de claude.ai.
- **Render de la capa:** `window.seek` no debe devolver la línea de tiempo (Playwright la serializa y cierra la página).
- **Shell y mezcla:** `bc` imprime `.70` y rompe `afade st=`; `amix` deja mono sin `aformat=channel_layouts=stereo`.
- **Entrega:** la carga por lote de activos del lienzo rechaza archivos de más de 20 MB; se sube una copia web.

Comandos exactos y forma correcta de cada uno: workflow, §«Qué NO hacer / gotchas».

## 14. Delta 2026-10-21 — serie de anuncios «Efeonce | Partner» (Microsoft y AWS)

**Estado del caso:** las dos piezas quedaron programadas en Metricool (Microsoft para el 10-12-2026 y AWS para el
03-12-2026); ninguna está publicada todavía. Caso fuente:
[método del anuncio de AWS](../../../../docs/operations/social/2026-10-21-aws-partner-announcement-production-method.md)
(§«Producción» y §«Trampas de esta corrida»); el tirón por tramos se vio en el
[de Microsoft](../../../../docs/operations/social/2026-10-21-microsoft-partner-announcement-production-method.md).
Fuentes fuera de git en `ai-generations/2026-10-21_aws-partner/` (`edit/rampa.py`, `edit/build-feed.sh`,
`edit/build-story.sh`).

### QA de movimiento medido

- **Medición:** diferencia entre cuadros consecutivos y su luminancia media por cuadro, por ejemplo
  `ffmpeg -i pieza.mp4 -vf "tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null -`.
- **Criterio de la serie:** **cero cuadros con YAVG < 0,15**. El final de
  AWS dio 0 en feed y en story; desde el segundo 2, el mínimo fue 0,86 en el feed y 0,63 en la story.
- Acredita la ausencia de cuadros quietos y tirones; no acredita ritmo, lectura ni que el movimiento se sienta bien
  (eso sigue en la reproducción 1×, §12 de posproducción).

### Story 9:16 desde tomas 3:4 (acierto)

- Cada toma se decide por separado. El pasillo va **en relleno** con recorte central; la Tierra va **ajustada al
  ancho** sobre bandas del color medido en el borde de la toma (`0x02070d`), porque recortada perdía los costados.
- El paso de relleno a ajustado se hace en **un zoom continuo**, alineado para que el sujeto caiga donde empieza el
  cierre.
- Defecto aceptado en AWS: un leve doble borde de la Tierra durante 4 cuadros del fundido de la story (0,17 s).

### F39 — Congelados o cámaras lentas por tramos que «cargan»

- **Síntoma:** en Microsoft, el operador vio dos veces un tirón «como si el video cargara».
- **Causa:** la velocidad cambiaba por escalones (congelados o cámaras lentas por tramo).
- **Prevención:** rampa **continua**: interpolar a 96 fps con `minterpolate`, mapear tiempo de salida → tiempo de
  fuente con una curva **PCHIP** (sin sobreoscilación) y aplicar un obturador de 4 muestras con `tmix`. Script de
  referencia: `edit/rampa.py` (AWS: 1,2x→2,9x en el pasillo y 5,2x→1,4x en la salida a la órbita).

### F40 — Empuje lento a 1x que salta de a píxel

- **Síntoma:** el tamaño cambiaba un cuadro sí y otro no (movimiento alternado 0,08 / 2,5).
- **Prevención:** hacer el zoom en un lienzo interno a **4x** (`scale` con `eval=frame` + `crop`) y recién después
  bajar a la resolución de salida.

### F41 — `overlay` con tamaño variable por cuadro que no escala

- **Síntoma:** el zoom por `scale` con `eval=frame` alimentado a un `overlay` quedó congelado en 1,33x y apareció una
  Tierra doble en el cruce.
- **Causa:** `overlay` no sigue un tamaño de cuadro que cambia en cada frame.
- **Prevención:** componer primero a **geometría fija** (`scale` + `pad`) y hacer el zoom con `scale` (`eval=frame`) +
  `crop` de tamaño fijo, como en el feed.

### F42 — Ease-out hasta velocidad cero que deja cuadros quietos

- **Síntoma:** el alejamiento final dejó 9 cuadros bajo 0,15.
- **Prevención:** mantener una componente lineal para que la velocidad nunca llegue a cero, p. ej.
  `0.55·u + 0.45·ease(u)`.

### F43 — Cierre que invierte la dirección del movimiento

- **Síntoma:** si la toma se aleja y el cierre empuja hacia adentro, «rebota» y se siente repentino y estático
  (observación de `pnpm ai:listen`, confirmada midiendo).
- **Prevención:** el cierre **continúa** la dirección de la toma que lo precede (AWS: la Tierra sigue alejándose de
  1,07x a 1,0x bajo el lockup, sin frenar a cero).

### F44 — Tomas generadas con tramos inservibles

- **Síntoma:** en AWS, la toma de salida de Seedance 2.0 traía un tramo blanco (cuadros 16–21) y otro casi quieto
  (cuadros 28–45, movimiento 0,2); la toma de «vida» venía casi inmóvil (0,1).
- **Prevención:** medir cada toma con el QA de movimiento antes de montarla, cortar lo que no sirve y, si la toma
  entera está quieta, sumarle movimiento de cámara en el montaje (F40, F42).

### F45 — Modificadores de zsh dentro de recetas de shell

- **Síntoma:** `r=$R:a=0.5` se expandió a una ruta absoluta (`:a`) y `c=$BG:s=…` aplicó una sustitución (`:s`).
- **Prevención:** en zsh, siempre `${VAR}` cuando lo que sigue es `:` (`${R}:a=0.5`, `${BG}:s=…`).

### 14.x QA con `pnpm ai:listen` v2 (Gemini 3.8, verificado 2026-10-21)

- **Gemini mira el video a 1 fps por defecto:** no ve un silencio de 0,25 s ni un tirón de dos cuadros. Para sincronía
  o tirones, usa `--fps` (hasta 24) sobre un `--clip` del tramo; para toda la pieza, los presets `sync` (12 fps) y
  `tiron` (24 fps).
- **`--verify` mide cada afirmación con ffmpeg:** silencio, golpe, corte, cuadro quieto y desfase quedan confirmados o
  refutados. Con `--cues audio-cues.json`, además mide cada cue de la grilla sin depender del modelo.
- **Caso fuente (AWS):** Gemini afirmó con severidad alta un congelado de 5,33 a 8,00 s; `--verify` lo refutó (cero
  cuadros quietos). Su desfase de íconos también quedó refutado (+8 ms: el ícono aparece un cuadro después de la grilla
  y el clic suena con él). Retocar la mezcla por esa crítica habría sido un error.
- `temperature` no hace nada en Gemini 3.x; la consistencia sale de `--thinking` y de `--findings`, con `preset@versión`
  y hashes en `meta`.
- Manual: `docs/manual-de-uso/ai-tooling/escuchar-y-mirar-media-con-gemini.md`.
