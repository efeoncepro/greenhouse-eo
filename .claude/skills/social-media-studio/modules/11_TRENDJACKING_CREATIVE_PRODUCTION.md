# 11 · Seasonality y trendjacking: idea, dirección y producción social

Usar para producir o mejorar una pieza que responde a una conversación, meme, lanzamiento, comportamiento
cultural o temporada. Social Media conserva el resultado completo: activar `design-studio` y las manos de
producción no significa devolver únicamente un brief ni abandonar el seguimiento del asset.

Este módulo aplica el contrato de manos/capas de
[`GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md`](../../../../docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md).
No crea un runtime, un compositor ni permiso de publicación. Referencias y evidencia fechada:
[`trend-production-sources.md`](../references/trend-production-sources.md). Caso de referencia de trendjacking
en carrusel (GTA VI, 2026-09-19):
[bitácora](../../../../docs/operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md) y
carpeta `ai-generations/2026-09-19_nivel-de-busqueda/` (`LEEME.md`, `COPY.md`, `PROGRAMACION.md`).

## 0. Contrato de decisión obligatorio

Leer [social-opportunity-playbook.md](../references/social-opportunity-playbook.md) para solicitudes de
seasonality/trendjacking: contiene definiciones, defaults ante inputs faltantes, rutas diferenciadas, evidencia,
elegibilidad, papeles de marca, cinco niveles de QA y medición. Este módulo gobierna la ejecución visual.
No clasificar por estética. No confundir firma, producto visible y demostración de oficio. Los estándares
son criterios operativos internos; no garantías de algoritmo, viralidad o reconocimiento de audiencia.
Registrar decisiones en un único [brief](../templates/social-creative-production.md), proporcional al encargo.

## 1. Identificar la oportunidad antes del prompt

| Tipo | Evidencia necesaria | Lo que no demuestra |
|---|---|---|
| Trendjacking reactivo | publicaciones originales, fecha/hora, mercado, formato compartido y evolución observada | una noticia aislada o un volumen acumulado no prueban aceleración |
| Seasonality | ventana cultural/comercial, audiencia, contexto local y calendario | una fecha anual no prueba una tendencia activa |
| Evergreen con lenguaje de meme | tensión persistente de audiencia y código comprensible | usar un meme no vuelve oportuna la pieza |

Para reacción, aplicar `05_SOCIAL_LISTENING_TRENDS.md` §6. Registrar muestra, enlaces, hora de consulta,
fuente primaria del detonante, ejemplos del público, marcas participantes y lo que no se pudo observar.
Las cuotas de investigación son objetivos de cobertura: si hay menos material, documentar la limitación y
ajustar la confianza; nunca fabricar observaciones ni llamar «viral» a lo no medido. Separar hecho, interpretación
y propuesta. Definir `expires_at` por evolución de la conversación, no por una vida universal de 24–72 horas.
Si el trend tiene fecha de cierre conocida (lanzamiento, estreno, final), `expires_at` es esa fecha: el meme
«We got X before GTA 6» deja de funcionar el día que sale el juego.

### Estudiar el código visual vigente antes de dirigir

Cuando el trend es una franquicia, lanzamiento o estética, investigar **con fuentes** su código visual vigente
antes del primer prompt; nunca dirigir de memoria. Caso fuente (2026-09-19, «Nivel de búsqueda»): la v1 se dirigió
como synthwave ochentero de Vice City 2002 y el operador la rechazó («no está mal, pero no está bien»); GTA VI es
Florida hiperreal de 2026 vista por un teléfono, con key art de realismo ilustrado pintado. El estudio posterior
(subagente web) quedó en `ai-generations/2026-09-19_nivel-de-busqueda/brief/gta6-visual-study.md`.

El estudio mínimo registra, cada afirmación con URL y etiqueta `[V]` verificado · `[O]` opinión/fuente secundaria ·
`[NV]` no verificado:

- época, registro y referentes actuales frente a los de entregas o eras anteriores (la confusión más probable);
- técnica del key art (trazo, contornos, luz, paleta, grano) separada del render in-game;
- UI o código del género que la audiencia reconoce (HUD, notificaciones, estrellas, minimapa) y sus estados;
- vocabulario en el idioma del mercado (p. ej. «nivel de búsqueda» es término de la comunidad hispana; el string
  exacto de la UI localizada quedó `[NV]`), memes vigentes con origen y caducidad;
- marcas que ya participan, con fecha y fuente, y lo que no se pudo documentar;
- activos protegidos que no se pueden usar (ver abajo).

Convertir el estudio en un bloque de estilo reutilizable para los prompts que diga también qué **no** es
(`NOT 1980s synthwave, NOT photoreal render, NOT flat vector`); ejemplo en `brief/style.txt` de la corrida.

### IP de terceros en trendjacking

Tomar el **código** (luz, paleta, género de UI, vocabulario de la comunidad, estructura de un meme) y dejar la
**propiedad**. No usar: logos, wordmarks y su tratamiento distintivo (p. ej. un degradado propio dentro de un
numeral), fuentes que se leen como la marca aunque tengan licencia (Pricedown), sellos corporativos, personajes o
parecidos, nombres de lugares ficticios registrados, capturas o fotogramas, recreaciones panel por panel ni frases
literales de la UI del juego. Los nombres de producto sólo como referencia nominativa en el texto. Dibujar la UI
propia (estrellas, tarjetas, íconos genéricos) en vez de imitar la del juego. **Orgánico** con estas reglas: OK.
**Pauta**, boost o uso comercial ampliado: revisión previa con `legal-privacy-ip-operator`; incluye validar con las
guías de marca de partners cualquier mascota de terceros (Clawd, Codex, Gigi) que aparezca.

Escribir una frase por pregunta:

1. ¿Qué reconoce nuestra audiencia y qué tensión vive en ello?
2. ¿Qué añade la marca desde su producto, oficio, personaje o punto de vista?
3. ¿Qué descubre quien mira que no estaba en la referencia original?
4. ¿Por qué enviaría, guardaría o comentaría esta pieza? Es una hipótesis, no una predicción de viralidad.
5. ¿Podemos terminar, revisar y distribuir dentro de la ventana observada?

Si la marca sólo aparece al pegar un logo, falta relación estratégica. Una firma exacta resuelve atribución,
pero no vuelve propia una idea. Registrar `go | revise | no-go`, la razón y el tiempo disponible.
Producción autorizada y publicación autorizada son estados distintos. No añadir nuevos checkpoints humanos
para elecciones reversibles ya delegadas por el operador.

## 2. Divergir en mecanismos, no en adjetivos

Para profundizar en mecanismos, innovación, emoción, memoria y sesgos, aplicar
[módulo 12](12_CREATIVE_REASONING_AND_EMOTIONAL_DESIGN.md). La biblioteca ampliada distingue operadores
creativos de resultados psicológicos medidos; el briefing registra hipótesis y pruebas, no neuroclaims.

Con una idea abierta, desarrollar tres rutas breves **antes de gastar en renders**. Si sólo se piden conceptos,
entregar alternativas y recomendación; no generar por obligación. Con concepto/copy fijados,
conservarlos y comparar tratamientos visuales; no reabrir el encargo. Cada ruta contiene:
`tensión → mecanismo → imagen/acción → copy → conexión de marca → hipótesis social`.

| Mecanismo | Qué cambia | Prueba de calidad |
|---|---|---|
| Reencuadre | muestra la consecuencia que otros no miraron | agrega una lectura verificable, no sólo opinión |
| Sustitución o analogía | producto/objeto ocupa una función reconocible | la relación se entiende sin el caption |
| Literalización | una expresión del oficio se vuelve una escena física | imagen y texto se necesitan, sin repetir lo mismo |
| Ausencia | retirar algo vuelve visible su valor | el vacío tiene forma y función; no es espacio sobrante |
| Contraste | expectativa frente a realidad o dos decisiones | cada mitad aporta; no copia el gag ajeno |
| Demostración | la marca hace algo, en vez de afirmar que sabe | existe una acción/prueba concreta |

No todas las piezas deben ser chistes, cinematográficas o minimalistas. Elegir entre documental, meme,
producto, editorial, ilustración o micro-escena según la conversación y el oficio. Evitar «premium/cinematic/viral»
como instrucciones autosuficientes. Traducirlos a cámara, gesto, material, luz, ritmo y composición.

Seleccionar por **aporte propio, legibilidad cultural, relación de marca y viabilidad**, con razones de descarte.
No sumar notas arbitrarias para presentar gusto personal como evidencia de performance.

### Patrón: carrusel de trendjacking con el código del juego/franquicia

Cuando el trend trae un sistema de reglas reconocible (niveles, misiones, estrellas, logros), usarlo como
**estructura del argumento**, no como decorado. Secuencia verificada en «Nivel de búsqueda» (9 láminas 4:5):

| Lámina | Función | En el caso |
|---|---|---|
| Portada-gancho | el meme vigente aplicado al problema de la audiencia | «GTA VI va a llegar antes que tu marca a ChatGPT» (13 años de espera) |
| Reencuadre | el doble sentido que convierte el código en tesis | estrellas de persecución ↔ búsqueda con IA / AEO |
| N misiones | una por lámina; cada una = una pieza del mecanismo real del servicio | 5 estrellas = entidad, respuesta primero, datos propios, menciones, acceso de rastreadores |
| Cierre | la consecuencia de completar el sistema | nivel completo |
| Contraportada | CTA en el idioma del juego + marca como héroe + refuerzos | logo 3D Efeonce héroe, Clawd y Codex, «Pide refuerzos», firma web |

- El humor sale del código del juego y trabaja **a favor** del argumento; el caption aclara, no traduce el chiste.
- Un elemento de UI propio da continuidad entre láminas (HUD de 5 estrellas con la misión actual resaltada;
  tarjeta de notificación con vidrio esmerilado real extraído del plate). Es interfaz del género, no una caja
  decorativa detrás de palabras.
- Cursores colaborativos AXIS narran al squad trabajando cada misión (la marca demuestra oficio, no sólo firma).
- Una pieza suelta derivada (Threads/feed) vive **fuera** de la secuencia: nombre y carpeta propios, no numerada
  entre las láminas (ver §5).

## 3. Codiseñar imagen, palabras y marca

Cargar `design-studio` módulos 03 y 13. Antes de generar completar
[`social-creative-production.md`](../templates/social-creative-production.md):

- superficie concreta: Story, feed, portada de Reel, documento, etc.; ratio no equivale a superficie;
- recorrido de lectura y único foco dominante; sujeto/acción que entrega la idea;
- regiones normalizadas de sujeto protegido, copy y marca; grilla, recorte y superposiciones;
- copy exacto y libertad de edición/caja; nada de CTA, fecha, descriptor o subtítulo por costumbre;
- reference pack por rol: identidad, composición, material/luz, producto, cultura; no fusionar referencias
  contradictorias ni imitar una campaña entera;
- brand pack: logo fuente, versión positiva/negativa, proporción, protección, paleta, fuentes y licencia;
- condición de aceptación y límite de iteración de cada operación.

Hacer un boceto de layout, incluso con cajas sobre una referencia, **antes** de producir el plate.
Las cajas son planificación, nunca un sustituto del entregable fotográfico solicitado.
Presupuesto de lectura inicial como heurística interna: una idea y una lectura dominante; verificar en miniatura,
sin afirmar que un número de segundos garantiza atención o alcance.

### Tipografía que realmente está en el archivo

Elegir familia, peso, `opsz`, `wdth`, tracking, interlínea, caja y saltos por intención. Una palabra dominante
puede necesitar una apertura pequeña; no aumentar todas las líneas por igual. No partir nombres ni dejar
preposiciones sin función. No deformar horizontalmente el texto para hacerlo caber: usar el eje de ancho real,
recomponer o reducir tamaño. «Más grande» no es una nueva dirección de arte.

No confiar en que `@font-face` dentro de SVG sea interpretado por todos los renderers. Para texto exacto:
usar una fuente cargada y comprobada en el motor, o convertir los glifos de la fuente real a trazados.
Con fontkit, inspeccionar `variationAxes`, aplicar `getVariation` dentro de esos límites y componer el resultado
de `layout`, incluyendo kerning y offsets. Registrar fuente/hash/ejes y bounds de los glifos; revisar el raster.
Un manifiesto que dice «Bricolage» no demuestra que la imagen la tenga.

La foto debe permitir leer el texto. Primero cambiar posición/composición; después un scrim gradual local si
hace falta. Evitar velos rectangulares con cortes visibles, oscurecer toda la escena o tapar el gesto central.
Medir contraste bajo los glifos y revisar a tamaño móvil. Un promedio alto puede ocultar una vela detrás de una letra.

**Declarar el layout en el prompt del plate.** El «espacio para texto» se produce en la generación, no con velos
después. Escribir el layout con porcentajes de alto y qué contiene cada banda: `STRICT LAYOUT: the top edge of the
logo letters is at 55% of the frame height; above it ONLY deep dark indigo-cobalt night sky… no skyline above 55%`;
`upper 45% deep dark twilight sky, darkest at the very top (dark enough for white text), sunset glow only near the
horizon`; `the bottom 12% is dark matte… reserved for small text`. Sin eso, en la corrida del 2026-09-19 salieron un
logo cortado en el borde, un plate sin cielo para el titular y cielos naranjas bajo el titular (1,4:1). Un acento
naranja sólo va sobre cielo oscurecido: sobre horizonte o skyline encendido cae a 1,0–2,0:1 y el énfasis pasa a peso
blanco. El scrim gradual declarado por lámina queda como último recurso tras intentar plate y composición.

Jerarquía: una lámina con texto no se entrega en dos niveles planos (titular + apoyo del mismo peso y color).
La escala de voces, pesos y colores la fija [`efeonce-advertising-creative`](../../efeonce-advertising-creative/SKILL.md);
aquí sólo se exige que cada lámina tenga una voz dominante indiscutible medida en miniatura.

### Branding y product placement: nombrar el modo correctamente

| Modo | Ejecución | Validación |
|---|---|---|
| Firma editorial | logo exacto en el plano gráfico | reconocimiento, jerarquía y aire; no llamarlo objeto físico |
| Integración en escena | arte oficial como referencia/activo sobre soporte plausible: libreta, envase, prenda o cartel autorizado | perspectiva, escala, iluminación, textura y oclusión consistentes |
| Producto protagonista | producto autorizado ejecuta el mecanismo | identidad, proporción, función y etiqueta fieles |
| Dispositivo de marca | activo propio, forma/sonido/personaje | uso autorizado; reconocimiento sólo con evidencia. Aprobación no demuestra asociación ni sustituye nombre |

Para branding físico leer [brand-in-scene.md](../references/brand-in-scene.md). Elegir primero
material y proceso: tinta, foil, bajorrelieve, relieve, bordado o grabado. Una homografía sólo resuelve
parte de la geometría; un cuadrilátero arbitrario puede alargar el logo y no crea profundidad.
Usar arte oficial como activo o referencia y elegir entre material 3D, composición fotográfica completa
o edición generativa guiada por referencias. En esta última, pasar escena + logo oficial al modelo durante
el pase de materialización y revisar identidad, perspectiva, textura, luz y lectura móvil por separado.
El titular y la firma editorial se componen después con activos exactos. No confundir fidelidad visual del
logo generado con identidad vectorial garantizada. Si falla, corregir soporte/escala/ruta, no duplicar marcas.

**Marca en escena desde activos canónicos.** Si la marca aparece dentro del mundo del trend, entrar con los
activos canónicos como referencia de forma (edición con `--image`, intención en el prompt), nunca de memoria:

| Activo | Referencia usada el 2026-09-19 | Lo que se exige |
|---|---|---|
| Nexa | **hoy:** `ai-generations/_identidad-nexa/1-anclas/` vía `foto:prompt` · *(el 2026-09-19 fue `2026-09-17_nexa-logo-estudio/refs/nexa-cuerpo-completo-v2.png`, ruta retirada)* + hoodie de `ai-generations/2026-09-17_hoodie-efeonce/final/` | color nombrado (`deep navy #023c70, not royal blue`); la v1 salió azul rey |
| Logo 3D monumental | kit `ai-generations/2026-09-17_efeonce-logo-3d/kit/monumental-blanco/` (frente o contrapicado) + `ai-generations/2026-09-17_efeonce-logo-3d/ref/logo-silueta.png` | contrato de prompt del kit |
| Nave | OneDrive `13- Branding/Nave Efeonce 3D/Blanco/Angulos 3D/v01/` vistas 01 y 17 | ventanas, esfera, aleta y cortes de la órbita |
| Mascotas de partners | OneDrive `14. Mascotas de partners/<Clawd (Claude)\|Codex (OpenAI)\|Gigi (Google Gemini)>/Poses 3D con accesorios/v01/` — Gigi suma `Poses 3D busqueda y AEO/v01/`, la familia de la máquina que responde | fidelidad de silueta y accesorio |

Hasta cuatro referencias en una sola pasada funcionaron (Clawd + Codex + logo + silueta). QA obligatorio por
activo, recortado al 100 %: **letra por letra** para el logo (letras, órbita con sus cortes), color sin deriva,
perspectiva coherente. Donde el logo 3D ya es héroe, la firma es la URL (`url-lum.svg`), no un segundo logo plano:
centrada, con fusión de luminosidad a opacidad 1 y sobre lecho muy oscuro (≥ 4,5:1). Sin la marca en escena, la
firma es el logo centrado y no se agrega burbuja. En `pnpm foto:componer:cta` se declara con `marcaEnEscena: true`
(sin `logo`) y la juzga la regla `firma-burbuja`.
Dos mascotas de partners juntas sólo con pedido explícito del operador (la regla del KV paraguas dice una).
Con **Gigi** en cuadro, el color de la pieza ya está tomado: es el espectro completo de Google, así que ella es el
único acento de color y Efeonce vive en el navy y la estructura. Si hay ropa Efeonce en la misma pieza, prohibir
explícitamente el degradado arcoíris y la punta enroscada sobre la prenda, **sin describir nuestro emblema**:
describirlo lo tergiversa, manda la referencia del kit.

Una marca no tiene que apropiarse de un objeto ritual para estar presente. En contexto cultural, investigar y
respetar la función de los elementos; no estampar retratos, alimentos u objetos sagrados para resolver branding.
La corrección de una pieza no crea una prohibición universal para otras culturas o encargos.

## 4. Producir por el defecto que queda

Ruta mínima: **brief → boceto → clean plate → crítica → composición exacta → QA → prueba**.
Agregar pasos sólo si resuelven algo visible. Multistep no significa usar todos los proveedores.

| Defecto pendiente | Operación | Input y salida |
|---|---|---|
| Idea todavía intercambiable | volver a rutas creativas | no gastar en upscale ni veinte variantes del mismo prompt |
| Foco, cámara o espacio insuficiente | generar/recomponer plate | referencia por rol → nueva composición sin texto/logo |
| Mano, producto o fondo incorrecto | edición localizada | plate seleccionado + delta único + locks → revisión comparada |
| Marca física deformada o pegada | materialización con referencia oficial | geometría + material + luz; revisión de identidad separada |
| Material/luz inconsistente | finish generativo acotado | sólo raster limpio → aceptar si conserva sujeto/identidad |
| Titular/firma editorial/copy incorrectos | composición determinística | activos reales → SVG/raster exacto |
| Resolución insuficiente | upscale o resize según necesidad | plate sin tipografía → revisión 100% antes de recomponer |
| Formato necesita una acción | micro-escena/video | acción + consecuencia + cámara + continuidad; no pan/zoom automático |

Para conectores leer [`social-production-connectors.md`](../references/social-production-connectors.md).
No suponer que el endpoint de una skill antigua existe ni que un control de la web/API está en el MCP.
Un fallo incierto de job se resuelve leyendo ese job; no duplicar cargos con un submit nuevo.

Cada paso guarda input, output, proveedor/modelo realmente expuesto, parámetros efectivos, delta, locks,
costo cuando esté disponible y decisión `keep | retry | reject`. No inventar el modelo interno de una herramienta.
Comparar siempre contra el último anchor aceptado para esa prueba, no acumular deriva entre derivados.
Dos pases sin mejora observable: volver a composición/idea o entregar el límite; no seguir a ciegas.

## 5. Revisar el arte, no sólo el archivo

Cinco niveles separados, según [playbook §8](../references/social-opportunity-playbook.md): estratégico,
creativo, cultural/contextual, marca y producción. Registrar observación, evidencia, estado y corrección por
nivel; una revisión técnica verde no aprueba los otros cuatro. La aprobación humana y la publicación siguen
siendo estados independientes. No afirmar validación de audiencia desde una checklist interna.

En producción verificar dimensiones/peso/perfil, copy exacto, identidad, fuente realmente renderizada, alpha,
anatomía/producto, bounds, contraste local, recortes/superposiciones, miniatura 320–390 px y archivo final
abierto. La marca física se evalúa en identidad, geometría, material y reconocimiento por separado.
Para video revisar clip completo, frames críticos, audio y continuidad; una portada no verifica el clip.

Las zonas seguras internas son una envolvente prudencial, no una garantía vigente de todas las plataformas.
Si el encargo requiere varios formatos, recomponer cada uno. No reducir un 16:9 a una Story ni certificar el
feed porque pasó la versión 9:16. Validar la superficie real cuando esté disponible.

La hoja de revisión (contact sheet) debe mostrar la secuencia en su orden de publicación. Si se arma por orden
alfabético de archivo, una pieza suelta cae al final y parece la última lámina: el 2026-09-19 el operador creyó que
la contraportada estaba penúltima. Numerar con prefijo de orden (`c01…c09`) y dejar la pieza suelta en una hoja
aparte o rotulada fuera de la secuencia.

Usar [`creative-review-cases.md`](../references/creative-review-cases.md) como conjunto de regresiones del oficio.
Una lista marcada por el mismo agente no prueba desempeño de audiencia. Conservar aprobación humana como
pendiente hasta recibirla; no atribuirla al autor de la prueba ni a un score automático.

## 6. Entrega y aprendizaje

Entregar imagen/video visible, archivo utilizable, fuentes editables cuando corresponda, resumen de decisiones,
lineage/QA y estado. Si sólo se pidió una prueba, `proof-only` es un entregable completo del encargo de exploración.
No presentarlo como campaña aprobada ni como rendimiento validado.

Las campañas compatibles usan el Campaign Layout Compiler (`plan → compile → check`); no falsificar estados de
aprobación para hacerlo compilar. Una prueba local puede usar composición determinística de exploración si se
declaran sus límites. No convertirla en un segundo compositor de producción: variable axes y proyecciones deben
evaluarse contra el contrato vigente antes de prometer soporte del compiler.

Después de publicación autorizada, comparar métricas con baseline de misma cuenta/formato/ventana y separar
orgánico de paid. Registrar denominadores disponibles; missing no es cero. Conservar qué mecanismo cambió y
qué se aprendió; no atribuir causalidad a una sola pieza. Actualizar skills cuando el operador lo solicite;
una corrección específica se guarda como caso antes de generalizarla.
