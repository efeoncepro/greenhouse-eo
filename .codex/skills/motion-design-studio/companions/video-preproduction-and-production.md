# Companion · Preproducción y producción de video dirigido

**Versión:** 2026-09-24. **Origen:** producción SKY CMP-003 hasta V17, incluido el trabajo previo del operador con Claude: pieza por pieza, selección de vistas, diseño de cámaras y primeras pruebas. **Alcance:** del brief al metraje seleccionado y al contrato de postproducción. Usa [el paquete de producción](../templates/video-production-packet.md) para ejecutar el método.

Esta guía convierte la experiencia en decisiones comprobables. Los comportamientos observados de un modelo pertenecen a aquellas solicitudes; no certifican su catálogo actual. Precio, parámetros, límites, resolución y disponibilidad se consultan en la ruta concreta antes de operar. La [retrospectiva SKY](../../../../docs/operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md) conserva historia y evidencia; este companion conserva el método reutilizable.

## 1. Empezar antes del prompt

La preparación de SKY no empezó cuando se envió el video. El operador y Claude descompusieron la película en activos: shell de búsqueda, texto de consulta, resultados individuales, turno de usuario, respuesta, estados de citación, cartelas, símbolos, logos, firma URL, vistas del avión y entorno. Luego eligieron encuadres y funciones de cámara y produjeron referencias específicas.

Ese trabajo permitió separar tres preguntas que deben resolverse antes de gastar:

1. **Qué debe suceder:** relato, orden causal y momento principal de marca.
2. **Qué debe permanecer idéntico:** identidad, geometría, copy, tipografía, formato y elementos ya aprobados.
3. **Qué puede interpretar el modelo:** mundo, materiales, luz, acción y cámara, dentro de las libertades autorizadas.

No atribuyas cada archivo histórico a un autor si no hay registro. En SKY, la participación previa con Claude está declarada por el operador; la existencia de piezas, manifiestos y planes se verifica en repo/OneDrive. Una reconstrucción posterior de la intención no prueba que un parámetro se haya enviado.

### Entregables del arranque

| Entregable | Decisión que debe cerrar | Evidencia mínima |
| --- | --- | --- |
| Brief | Qué entiende/siente el espectador y cuál es el evento de marca | Secuencia redactada, formato y restricciones explícitas |
| Inventario heredado | Qué se conserva y qué necesita corrección | Ruta, hash, versión y feedback del operador |
| Contrato de fidelidad | Qué se genera, qué se usa sólo como referencia y qué se compone | Matriz por elemento, con alcance aprobado |
| Storyboard | Qué encuadre prueba cada paso | Entrada, estado legible, acción, salida |
| Mapa de cámaras | Cómo se recorre todo el relato | Cobertura por beat; trayectoria de objeto separada de cámara |
| Animatic de revisión | Si la secuencia se entiende y tiene ritmo | Archivo reproducible con tiempos y sonido temporal identificado |
| Paquete para el modelo | Qué puede heredar de cada referencia | Índice exacto, roles, exclusiones y payload |
| Prueba/plan de gasto | Qué incertidumbre se compra resolver | Una hipótesis, criterio de aceptación, tope y parada |

Un permiso para preparar, revisar o componer localmente no implica otro intento pagado. Respeta la autorización existente y su alcance sin solicitarla de nuevo por rutina.

## 2. Del relato a una máquina de estados visual

Redacta cada beat como **estado de entrada → acción visible → estado de salida**. Distingue transiciones narrativas de transiciones gráficas: una disolvencia bonita no sustituye un turno de usuario ausente.

**Ejemplo histórico SKY, no plantilla universal:** búsqueda → Enter → resultados → pregunta del usuario → respuesta progresiva → cita SKY → activación luminosa → avión en vuelo → cartelas → gracias → cierre azul → cierre morado.

Para cada beat registra:

- **Función:** orientar, leer, anticipar, transformar, demostrar, agradecer o cerrar.
- **Información nueva:** una idea que no dependa de leer de nuevo la anterior.
- **Causa y consecuencia:** qué acción provoca el siguiente beat. En SKY, el chip es el origen de la transformación.
- **Evento visible:** primera letra, envío, tarjeta asentada, respuesta completa, inicio del brillo, máxima proximidad del avión, entrada del logo.
- **Presupuesto temporal:** entrada, despliegue, lectura y salida separados. El tiempo de aparición no cuenta íntegramente como tiempo legible.
- **Punto de vista:** qué debe mirar el espectador y cómo se le conduce allí.
- **Reserva siguiente:** qué zona debe quedar libre y desde qué cuadro.

La cantidad de planos y la ubicación del clímax salen de la historia. No imponer ocho, treinta o tres planos, ni un porcentaje fijo para el momento principal. Una película puede sostener una transformación continua o necesitar cortes; ambas opciones se justifican en el animatic.

### Lectura sin pausa muerta

1. Marca el primer cuadro en que el mensaje está completo, enfocado y suficientemente estable.
2. Marca el comienzo de la siguiente acción, no sólo el corte.
3. Reproduce a tamaño de entrega: verifica comprensión antes de acelerar por intuición.
4. Si sobra tiempo, reduce el intervalo de lectura sobrante. Conserva el impulso de la activación y la trayectoria siguiente.
5. Registra el nuevo mapa de tiempos: una reducción anterior a un evento mueve también sus efectos y puede cambiar duración de entrega.

En SKY V17 se autorizó reducir 12 cuadros a 24 fps, antes de activar la cita, y entregar 29,5 s. Esa magnitud fue una decisión del caso; no es una receta automática para respuestas de chat.

## 3. Contrato de pieza y activo

Cada activo debe tener un identificador estable. Una captura bonita sin función declarada suele transmitir más cosas de las que se pretendía.

| Campo | Qué registrar |
| --- | --- |
| `asset_id` / versión | Identidad persistente y variante exacta |
| Fuente / autoría | Oficial, producción interna, generado, stock; atribución sólo con evidencia |
| Archivo / hash | Ruta recuperable y SHA-256 del archivo enviado |
| Función | Identidad, geometría, material, iluminación, encuadre, movimiento, estado UI, texto exacto, alpha de post |
| Beat / plano | Dónde se utiliza y dónde no |
| Estado | Vacío, escribiendo, completo, activo, salida, reserva limpia |
| Invariantes | Qué no puede cambiar; rasgos contrastables en cuadros |
| Libertades | Qué puede reinterpretarse sin incumplir el brief |
| Exclusiones | Fondo, texto, audio, cámara o ritmo de la referencia que no se debe transferir |
| Propiedades | Dimensiones, ratio, perfil/color, alpha, fuente tipográfica y vista efectiva |
| Estado de revisión | Propuesto, inspeccionado, aprobado, rechazado o sustituido; fecha y evidencia |
| Derechos / destino | Permiso y restricciones de uso; separado de aprobación creativa |
| Consumidores | Solicitudes y composiciones que dependen de esa versión |

### Piezas aisladas y contexto completo cumplen funciones distintas

- **Aislado:** permite revisar forma, proporciones, símbolo, texto y material sin distracciones.
- **Contextual:** permite entender escala, luz, interacción, perspectiva y lugar dentro del relato.
- **Secuencia:** permite comprobar trayectoria, velocidad, causalidad y lectura temporal.

Construye las tres sólo donde aporten información. Un avión recortado no explica por sí mismo cómo sale de cuadro; una respuesta completa no explica si debe aparecer antes o después de la pregunta. Un SVG correcto puede seguir teniendo un detalle demasiado pequeño para sobrevivir al rasterizado de entrega.

**Paquete UI:** shell y contenido separados para construir, más estados completos para dirigir. Revisa fuentes cargadas y render real; no basta que el CSS nombre Poppins o Bricolage. El kit SKY registró fallback a Times por carga fallida en `file://`: se corrigió embebiendo fuentes/activos.

**Paquete de marca:** conserva vector fuente, versión positiva/negativa, color y pequeño detalle geométrico. En SKY, pintar en blanco una flecha cuyo vértice tocaba el trazo vecino eliminaba su separación visual; se necesitó otro vector con el hueco correcto. La aprobación de la marca se hace también al tamaño final.

**Paquete de producto:** una sola identidad con vistas complementarias. Deduplica por hash y por información geométrica: dos nombres de archivo no implican dos ángulos. El índice histórico de SKY lista V10 y V10-Miyi con el mismo hash. Las fotos de A321neo del banco sirven como contexto material cuando se autoriza; no deben sustituir inadvertidamente la geometría A320neo seleccionada.

### Frontera generación/post por elemento

| Decisión | Uso válido | Riesgo que controlar |
| --- | --- | --- |
| Generado en la película | Cámara, mundo, objeto y acciones que el operador quiere generativas | Deriva, timing, identidad, elementos añadidos |
| Referencia para generación | Orientar identidad/estado/movimiento | No implica reproducción exacta ni autoriza convertirlo en overlay |
| Composición exacta | Copy/logo/elementos cuya geometría debe ser controlada | Integración, perspectiva, luminosidad, jerarquía |
| Reparación localizada | Defecto acotado con entrada y salida comprobables | Herencia del error y discontinuidad en ambos extremos |

En SKY el límite autorizado fue específico: interfaz, avión y cielo generativos; cartelas posteriores al avión y cierre compuestos. El kit inicial contemplaba más composición, pero ese plan quedó superado. Un companion no revive un alcance rechazado.

## 4. Diseñar cobertura: rigs, planos, ángulos y motores

Son cantidades diferentes:

- **Rig o comportamiento de cámara:** familia de posiciones/movimientos; por ejemplo, lectura amplia, macro lateral o seguimiento aéreo.
- **Plano:** unidad continua del montaje entre cortes; un plano puede contener varias fases de cámara.
- **Ángulo:** relación visual cámara/objeto en un instante; una órbita recorre varios ángulos sin crear varios planos.
- **Toma o intento:** ejecución candidata de un plano o secuencia.
- **Modelo/proveedor:** herramienta y ruta de producción; su cantidad no es la cantidad de cámaras.

En SKY se planificaron tres funciones A/B/C para toda la película. Los rótulos y asignaciones cambiaron entre V6 y V8: no son metadatos físicos del resultado. Que un prompt diga «tres cámaras» no prueba que el render las ejecute ni que hagan falta tres en la siguiente campaña.

### Matriz de cobertura obligatoria

Una fila por beat/plano, y cobertura explícita de interfaz, transformación, objeto, cartelas y cierre cuando existan:

| Campo | Pregunta comprobable |
| --- | --- |
| Función narrativa / foco | ¿Por qué este punto de vista ayuda a entender este paso? |
| Rig / plano / toma | ¿Es un cambio de cámara, un movimiento continuo o una nueva generación? |
| Cámara inicial/final | ¿Dónde está respecto al objeto y al mundo? |
| Encuadre / escala | ¿Qué entra completo, qué queda fuera y cuánto ocupa el sujeto? |
| Lente / distancia / foco | ¿Qué perspectiva y profundidad se buscan; qué texto debe permanecer legible? |
| Movimiento dominante | ¿Dolly, truck, órbita, tilt, seguimiento o cámara fija? |
| Trayectoria del sujeto | ¿De dónde viene, por dónde cruza y hacia dónde sale? |
| Velocidad relativa | ¿Crece, atraviesa o se aleja en pantalla; qué continuidad tiene con el plano contiguo? |
| Eje / lateralidad | ¿Se mantiene dirección de viaje, lado visible y relación horizonte/objeto? |
| Luz / entorno | ¿Qué dirección, material y clima deben coincidir? |
| Entrada / salida | ¿Qué cuadro sirve para entrar y cuál para empalmar? |
| Reserva / lectura | ¿Cuándo y dónde queda espacio utilizable? |
| Prueba | ¿Qué defecto visible obligaría a rechazar la toma? |

### Lentes como intención óptica, no como contraseña

Una focal escrita en el prompt no constituye calibración. Si se usa un número, declara el referente de sensor/equivalencia cuando sea relevante y acompáñalo de una consecuencia visible: compresión de profundidad, perspectiva lateral, tamaño relativo, distorsión tolerada y profundidad de campo. En una escena generada, verifica el efecto; no afirmes captura física a 35 mm porque el prompt lo incluya.

Para UI: mantener el plano completo en cámara o diseñar conscientemente un recorte. Si se busca oblicuidad, comprobar bordes convergentes y parallax entre texto, panel y fondo. Inclinar el horizonte o desplazar una tarjeta plana no acredita travelling lateral. Evita que el foco borre justo el texto durante su ventana de lectura.

Para producto/avión: especifica morro/cola visibles, posición relativa de motores/alas, superficie superior o inferior expuesta y lado del fuselaje. «La cola queda hacia cámara y el morro se aleja» transmite el destino del movimiento mejor que «tercera cámara épica». Los grados sirven como apoyo, no reemplazan estos marcadores.

### Separar cámara y objeto evita el falso frenado

Escribe dos líneas independientes:

> **Objeto:** atraviesa el espacio siguiendo una trayectoria continua; después del paso, aumenta su distancia y disminuye su tamaño aparente.
>
> **Cámara:** conserva el eje, cambia a vista posterior sobre el movimiento y sigue a menor velocidad que el objeto; no vuelve a encontrarlo de frente.

No son suficientes «rápido», «drone» o «cinemático». Compara escala, dirección y desplazamiento por cuadro a ambos lados del corte. No hay que imponer una velocidad física exacta cuando el mundo no está calibrado: se evalúa continuidad aparente y plausibilidad. Un corte con diferente escala puede funcionar si está motivado y conserva progresión; una nueva aproximación frontal después de la pasada reinicia la acción.

## 5. Storyboard, animatic y referencia de movimiento

### Tres artefactos con permisos distintos

1. **Storyboard:** decide composición, estados y sucesión; puede ser esquemático.
2. **Animatic interno:** prueba tiempos, comprensión y energía; puede usar placeholders etiquetados.
3. **Referencia enviada al modelo:** todo lo visible/audible puede contaminar la salida. Debe pasar revisión propia antes del envío.

No conviertas automáticamente el animatic interno en referencia de producción. En SKY una guía frontalizaba temprano la búsqueda, frenaba hacia el chip y aproximaba mal la URL; usarla como autoridad de movimiento transmitía errores. Recorta sólo la acción útil y declara su función, o reconstruye la guía antes de transferirla.

### Qué debe mostrar el storyboard

- Primer cuadro del beat y su conexión con el anterior.
- Cuadro de máxima lectura/identidad; el espectador no debe adivinar qué ocurrió.
- Acción transformadora y dirección de energía.
- Último cuadro utilizable y reserva para el siguiente elemento.
- Tratamiento de audio temporal, marcado como intención, no como mezcla final.

La música definitiva y los SFX se conforman después de revisar el montaje real. En preproducción sí se define su función: silencio musical inicial, momento de entrada, ascenso, transformación, paso y resolución, sin comprometer síncronos inexistentes todavía.

### Prueba de energía del evento principal

Diseña antes/durante/después, con una sola causalidad perceptible:

- **Antes:** mirada dirigida al elemento de marca y anticipación breve.
- **Durante:** escala/luz/perspectiva cambian con un impulso que se transmite a la siguiente acción.
- **Después:** consecuencia visible con energía coherente, sin reset lejano o pausa accidental.

En SKY el brillo del chip debía conducir al avión. No bastaban tres planos buenos revisados aislados ni un clic colocado en el momento correcto. Revisa un intervalo que incluya preparación, transformación y vuelo; incluye también sus bordes sonoros cuando haya mezcla.

## 6. Empaquetar referencias sin contradicciones

1. Inventaría todas las fuentes; selecciona el conjunto mínimo que cubre incertidumbres reales.
2. Clasifica cada una por autoridad: identidad oficial, forma/estado, material/luz, movimiento o timing. El orden de prioridad se documenta; no presupongas que el modelo resuelve un conflicto igual.
3. Asigna un índice estable y un rol explícito. Verifica que el prompt cita el índice que recibe el proveedor después de subir archivos.
4. Define dónde deja de aplicar cada referencia. Ejemplo histórico: movimiento H3 sólo para perspectiva de UI; no heredar texto, avión ni audio.
5. Si una imagen contiene instrucciones, rótulos o márgenes de tablero, confirma que no se interpretarán como contenido de escena; elimina contaminantes del insumo cuando sea posible.
6. Conserva archivo/hash/payload/orden exactos. No basta un listado de URLs temporales.
7. Revisa contradicciones: avión entrando vs saliendo, fondos incompatibles, diferentes versiones de logo, texto que se compondrá después pero aparece en referencias enviadas.

Treinta referencias no son automáticamente mejores que diez. La cantidad máxima del endpoint es capacidad de transporte, no recomendación creativa. Una nueva referencia debe resolver una pregunta: identidad faltante, vista no cubierta, estado narrativo ambiguo o salida sin dirección. Si duplica o contradice otra, retirarla puede mejorar el paquete.

### Reservas de post como parte del plano

Una reserva no es sólo un rectángulo vacío en un still. Declara intervalo, zona, movimiento permitido del fondo, contraste esperado y objetos que deben haber salido. Si las cartelas van sobre cielo, pide cielo animado continuo y salida del avión antes de esa ventana; no pidas un fondo plano ni textos provisionales.

Para reparar posteriormente una ventana, guarda entrada/salida y contexto temporal suficiente. La duración del margen depende del movimiento y del efecto; no hay un número universal de cuadros. Antes de aprobar una reparación, verifica dirección, posición, escala, luz, exposición, fase de movimiento, oclusión y trayectoria del fondo en **ambos** empalmes.

## 7. Elegir motor y alcance sin heredar decisiones erróneas

Usa [el contrato de fidelidad](../workflows/engine-selection-by-fidelity-contract.md) y el [módulo de créditos](../modules/13_STUDIO_CREDITS_AND_ACCOUNTABILITY.md). La unidad de producción sigue la continuidad requerida y la autorización del operador:

| Necesidad | Decisión que evaluar | Condición antes de ejecutar |
| --- | --- | --- |
| Descubrir lenguaje visual | Prueba corta del movimiento o material incierto | No confundir la prueba con el master final |
| Continuidad larga ya dirigida | Una generación completa si la ruta lo permite | Storyboard y referencias coherentes; costo explícito; QA posterior |
| Reparar un defecto acotado | Edición de una ventana existente | Elementos que deben conservarse, empalmes y salida verificables |
| Corregir texto/logo/timing exacto | Post sobre fuentes originales, dentro del alcance autorizado | No regenerar la película para una corrección local |
| Mejorar detalle/resolución | Piloto de restauración sobre zona de riesgo | Comparación de geometría, texto y movimiento antes del completo |

No imponer fragmentos de 5–8 s sólo porque una regla histórica diga que las tomas largas derivan. Tampoco prometer consistencia perfecta de 30 s por capacidad nominal. Un endpoint `edit` puede reconstruir partes o conservar un error; su nombre no garantiza preservación.

### Prueba barata con una hipótesis

Registra **riesgo → variación única → resultado esperado → criterio de rechazo → gasto máximo → siguiente paso si pasa/falla**. Usa una sonda que incluya el defecto y la continuidad que pretende demostrar. Una imagen aislada no prueba empalme; 480p no prueba legibilidad fina a 1080p; un piloto de un plano no certifica toda la película.

Un modo Draft convertible debe verificarse en ese conector junto con su mecanismo de promoción. Una generación normal a baja resolución no se convierte en Draft por llamarla prueba. Que una plataforma muestre una opción en web no acredita el mismo parámetro en su API.

**Detener antes de otra llamada pagada si:**

- La solicitud anterior sigue en estado incierto o no se conoce su ID final.
- El presupuesto aprobado no cubre dimensiones, entradas, duración, variantes y posible facturación real de la operación.
- El intento anterior falló y sólo se propone «más épico» sin una hipótesis nueva ni referencia reparada.
- La referencia contradice el guion o introduce el defecto que intentamos eliminar.
- La continuidad pedida requiere un empalme que no tiene entrada/salida utilizable.
- Se intenta ampliar el alcance aprobado para corregir una regresión local.

Ante timeout, consultar el mismo ID antes de reenviar. Una estimación local no es un límite duro del proveedor. Conservar costo estimado y cargo reportado como hechos distintos; no presentar créditos de una plataforma como dólares sin conversión documentada.

## 8. Aprendizajes positivos: cómo amplificarlos

| Acierto observado en SKY | Por qué ayudó | Mejora del método | Prueba/gate |
| --- | --- | --- | --- |
| Construcción pieza por pieza con el operador y Claude | Hizo visibles las decisiones de texto, símbolo y estado | Añadir rol, consumidores y alcance de composición a cada pieza | Abrir piezas y escenas completas; verificar fuente/hash y estado narrativo |
| Avión oficial en varios ángulos | Permitió comparar la identidad de una vista a otra | Mapear vistas efectivas a aproximación, panza y salida; eliminar duplicados | Comparación lado a lado de rasgos y continuidad en el video |
| Cámaras pensadas también para la UI | Dio profundidad a búsqueda/resultados/chat | Dar a cada cambio de perspectiva una función de atención/lectura | Parallax visible y texto legible durante su ventana |
| H3 como exploración de lenguaje | Encontró desplazamiento macro/lateral útil | Transferir sólo el tramo/movimiento aceptado con exclusiones explícitas | El siguiente render conserva función sin heredar defectos de texto/avión/audio |
| Selección de partes logradas en vez de regeneración acumulativa | Preservó soluciones obtenidas con gasto previo | Biblioteca de tomas con handles, rasgos, tiempos y motivo de selección | Montaje con origen rastreable; revisión de ambos lados de cada corte |
| Cartelas y cierre exactos sobre metraje | Permitió afinar jerarquía y corregir marca | Diseñar reserva animada y composiciones por formato desde el brief | Preview sobre la placa real y en tamaño de entrega |
| Congelar lo aprobado | Evitó perder avances mientras se exploraban reparaciones | Versionar baseline, variante y diferencia esperada, no sobrescribir | Comparar hashes y review del delta solicitado |

## 9. Aprendizajes negativos: causa, prohibición útil y alternativa

**Etiquetas:** `C` = causa documentada en archivos/proceso; `O` = observación del operador o revisión, sin causalidad interna demostrada; `H` = hipótesis que requiere prueba. Una explicación plausible sobre cómo «piensa» el modelo sigue siendo H.

| Fallo | Evidencia/causa | Qué evitar | Alternativa | Criterio de aceptación |
| --- | --- | --- | --- | --- |
| Frankenstein de avión/ángulos | O: cambios de dirección/escala y reinicio de aproximación; C en V4: empalme de fuentes con ritmos distintos | Elegir cada toma por belleza aislada | Una trayectoria y cobertura; entrada/salida y velocidad relativa registradas | Aproximación → pasada → salida sin reinicio ni cambio de identidad |
| Cámara de búsqueda perdida | O en varias iteraciones; C: guía usada frontalizaba temprano | Confiar en «tres cámaras» global sin asignarlas a la UI | Estado lateral completo y recorrido validado antes de enviarlo | Texto dentro del encuadre y perspectiva lateral perceptible |
| Estela no deseada | C: un prompt exploratorio pedía estela | Solicitar un efecto de energía incompatible con realismo esperado | Separar movimiento realista del avión de la energía de transición | Alas y motores sin humo o geometría imposible añadidos |
| Prompt correcto, secuencia incorrecta | O: resultados repetidos, turno ausente o estados confundidos | Aprobar payload como si fuera aprobación de metraje | Estados completos, orden explícito y QA del archivo | Cada beat existe, se entiende y conserva su relación causal |
| Tablero/fondo filtrado a escena | O en H3; H: transferencia del contexto de la referencia | Enviar placas con elementos que no deben aparecer | Limpiar referencia o delimitar función; revisar contaminación | Entorno y chip integrados sin fondo plano heredado |
| Avión invade las cartelas | O en V11 | Pedir sólo «sale el avión» sin destino y reserva temporal | Vista posterior, disminución de escala, salida y cuadro de cielo limpio | Reserva utilizable durante toda la lectura, no sólo al inicio |
| Activación sin impacto | O del operador; C: un clic fue insuficiente como diseño de evento | Resolver transformación con volumen de clic o pausa oscura | Carga → cambio luminoso/escala → consecuencia continua, con sonido posterior conformado | Evento completo comprendido y sentido al reproducir preparación y consecuencia |
| Referencia excesiva/conflictiva | H como causa interna del modelo; C: paquetes contenían funciones distintas | Atribuir fallo automáticamente a falta de referencias y añadir más | Un rol por insumo, autoridad, exclusiones, selección mínima | No hay contradicción detectable antes de enviar; probar hipótesis específica |
| Nombres técnicos sin verificación | C: los planes son instrucciones, no telemetría | Afirmar tres cámaras/lente exacta sólo por prompt | Registrar intención y resultado observado por separado | Marcadores visuales de encuadre, profundidad y movimiento |
| Generar otra película para corregir una pieza | C: varias revisiones mejoraron partes y regresaron otras | Cambiar todo sin preservar baseline | Reparar el defecto acotado o componer elemento permitido | Delta esperado sin regresión en zonas aprobadas |

## 10. Gates de producción y entrega a post

### Antes de enviar

- [ ] Relato y alcance aprobados; no se confunden instrucciones vigentes con historial.
- [ ] Contrato por pieza y formato; identidad, copy y logos contrastados con fuente.
- [ ] Matriz de cobertura completa, sin números de cámara/plano impuestos por plantilla.
- [ ] Movimiento de objeto y cámara distintos; entrada, salida y reserva definidas.
- [ ] Referencias vistas en su resolución real; fuentes cargadas; índices/hash verificados.
- [ ] Animatic entendido en tiempo real; referencia que se enviará revisada por separado.
- [ ] Una hipótesis por piloto; precio/alcance/variantes y autorización vinculados al payload.
- [ ] Plan de seguimiento por ID único y condiciones de parada.

### Antes de declarar metraje utilizable

- [ ] Archivo local íntegro y metadata observada, no sólo estado `completed`.
- [ ] Secuencia completa reproducida; muestras densas en lectura, activación y movimiento crítico.
- [ ] Identidad y materiales comparados entre planos; ningún ángulo reinicia la acción.
- [ ] Entrada/salida/handles utilizables y reservas temporales comprobadas.
- [ ] Defectos restantes clasificados como aceptables, reparables o rechazo con evidencia.
- [ ] Toma seleccionada vinculada a fuente, solicitud, parámetros y gasto reportado.

### Paquete para postproducción

Entregar los originales, manifiestos, storyboard/animatic, corte seleccionado, EDL con tiempos por cuadro, matriz de piezas generadas/compuestas, cartelas/cierre aprobados, vector/fuentes, reservas, eventos reales para sonido y restricciones de cambio. Cada reparación conserva el baseline y declara qué región/tiempo puede modificar.

La versión final todavía necesita conform, sonido, acabado, exportación y QA perceptual/técnica. La selección de una toma no acredita una entrega. Continúa con [el workflow de película generativa y cartelas aprobadas](../workflows/generative-film-with-approved-title-overlays.md), [edición localizada y acabado](../workflows/omni-in-place-edit-and-deterministic-finish.md) y los módulos [06](../modules/06_EDITING_MONTAGE_PACING.md), [07](../modules/07_SOUND_MUSIC_DESIGN.md) y [08](../modules/08_COLOR_GRADE_FINISH.md).

## 11. Fuentes del caso y límites

- [Producción con piezas aisladas, historial inicial](</Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/2. Campañas/CMP-003_sky-nos-eligio-seo-aeo/PRODUCCION.md>) y [índice de recursos oficiales/vistas](</Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/2. Campañas/CMP-003_sky-nos-eligio-seo-aeo/ASSETS.md>). Son fuentes históricas locales; sus estados pendientes no sustituyen la revisión V17.
- [Manifiesto actual del kit](../../../../ai-generations/2026-09-23_cmp003-sky-video/kit/MANIFIESTO.json): verificar su contenido y archivos actuales; el historial describe 26 piezas v1, pero este snapshot del manifiesto contiene 24 entradas. No inventar una conciliación del conteo.
- [Dirección y cámaras V6](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v6/DIRECCION-Y-CONTROL.md) y [referencias V6](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v6/references.json).
- [Plan y estado V8](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v8/PLAN-Y-ESTADO.md): paquete, cámaras, resolución y diferencia Draft/conector observada entonces.
- [Plan/resultado V11](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v11-full/README.md) y [revisión V11](../../../../ai-generations/2026-09-23_cmp003-sky-video/seedance/v11-full/REVIEW.md): las instrucciones de reserva no garantizan ejecución; estimación no fue cap de factura.
- [Retrospectiva hasta V17](../../../../docs/operations/social/2026-09-24-sky-retrospectiva-produccion-v17.md): cronología, recursos efectivamente usados, límites de audio, evidencia final y costos sin total inventado.

No se ejecutaron generaciones, restauraciones ni cambios audiovisuales para escribir este companion. Los gates propuestos son mejoras del método; no deben presentarse como controles que necesariamente existieron desde el primer intento de SKY.
