> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.13
> **Creado:** 2026-04-07 por Claude (TASK-278)
> **Ultima actualizacion:** 2026-09-17 por Claude — (1.13) opcion `--key-background` para vaciar los agujeros que el recorte deja tapados con el fondo. Antes (1.12) el recorte de fondo repara huecos internos del personaje. Antes (1.11) `pnpm ai:fal` también trabaja con **Higgsfield**: 44 modelos más (SOUL, Marketing Studio, Ideogram, Kling, PixVerse y otros), con precio exacto antes de gastar; todavía sin créditos para generar. Antes (1.10) los comandos avisan cuánto costará antes de gastar; el de Fal pide confirmación si es caro y, en video, usa por defecto la resolución más barata; el formato del archivo sale del nombre que se le da. Antes: nueva sección «Qué modelo usar para cada cosa» con enlace a la guía técnica de selección; correcciones de costos: en video el precio sube con la resolución (Wan 3.0 y H3 usan por defecto la más cara), Wan 3.0 Prime cuesta más que Wan 3.0, Flux 3 publica precios del doble de lo registrado, el costo de Seedance y de GPT Image 2.5 sí se puede calcular antes; H3 2K/4K son reescalados; entrenar una LoRA cobra mínimo 100 pasos. Antes: `pnpm ai:fal` trabaja con dos cuentas de Fal y cambia sola si una se queda sin saldo, muestra el saldo con `--balance` y puede encolar sin esperar (`--detach` / `--status`); prueba completa: 47 de 55 opciones probadas, costo real medido y filtro de contenido de Seedance 2.5 (rechaza marcas y personas reales y cobra el intento); antes, Wan 3.0 sumado a `pnpm ai:fal` (video desde texto, imagen o referencias, que también puede basarse en una web o un documento; una opción probada y el resto a la espera de recargar saldo en Fal) y estado real de Nano Banana Pro; antes, Flux 3 sumado a `pnpm ai:fal` (borrador barato y mejora, primer/último cuadro, keyframes, editar y extender video) y cómo se hace video a video con Seedance; antes, Minimax H3 sumado a `pnpm ai:fal` (video rápido y barato, control de cámara, LoRAs y entrenamiento); antes, nuevo comando `pnpm ai:fal` (Seedream 5, separación por capas y video Seedance); antes, cambio de motor por defecto tras TASK-1851
> **Documentacion tecnica:** [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)

# Generador Visual de Assets con IA

## Que es

Un modulo interno que permite al agente AI (Claude) generar imagenes y animaciones para las interfaces del portal durante el desarrollo. No es una funcionalidad para usuarios — es una herramienta de productividad del equipo de desarrollo.

## Que puede generar

### Imagenes (via GPT Image de OpenAI)

Imagenes rasterizadas de alta calidad:
- **Banners** para headers de seccion (perfil, detalle de persona, organizacion)
- **Ilustraciones** para empty states (sin datos, sin asignaciones)
- **Fondos decorativos** para cards, dashboards, onboarding
- **Thumbnails** para proyectos, espacios o servicios sin imagen

Las imagenes se guardan en `public/images/generated/` como PNG o WebP.

### Animaciones SVG (via Gemini)

Graficos vectoriales animados con CSS:
- **Loading spinners** personalizados con colores de marca
- **Iconos animados** (check, error, warning, info)
- **Ilustraciones animadas** para empty states
- **Micro-interacciones** (pulse, bounce, fade, draw)

Las animaciones se guardan en `public/animations/generated/` como SVG. Incluyen automaticamente soporte para `prefers-reduced-motion` (accesibilidad).

## Banners de perfil por categoria

Cada colaborador ve un banner personalizado en su perfil segun su rol o departamento:

| Categoria | Quien lo ve | Estetica |
|-----------|------------|----------|
| Leadership | Directores, Admin | Constelacion navy-purple con nodos dorados |
| Operations | Operaciones, Cuentas, PM | Pipeline blue-teal con formas geometricas |
| Creative | Diseno, UX, Contenido | Formas organicas magenta-coral fluidas |
| Technology | Desarrollo, Engineering | Circuit board midnight-cyan |
| Strategy | Estrategia, Media, Analytics | Ondas indigo-purple de datos |
| Support | HR, Finance, Legal | Cristales geometricos teal-green |
| Default | Todos los demas | Mesh network navy-purple universal |

El sistema selecciona automaticamente el banner correcto basandose en los roles y departamento del colaborador. No requiere configuracion manual.

## Como funciona la asignacion de banners

1. El sistema lee los roles activos del colaborador (del endpoint Person 360)
2. Si el rol principal coincide con una categoria → usa ese banner
3. Si no, revisa el nombre del departamento → busca match por categoria
4. Si nada coincide → usa el banner default (que es igualmente atractivo)

## Aspectos tecnicos

- Motor de imagenes por defecto: **GPT Image** de OpenAI (ver la seccion siguiente)
- Motor de imagenes alternativo: **Gemini Image** de Google, cuando se pide explicitamente
- Motor de animaciones: **Gemini** de Google (ultimo modelo disponible) — sin cambios
- El comando para generar sigue siendo el mismo: `pnpm ai:image`
- Los assets son archivos estaticos — no se generan en tiempo real para usuarios
- Se generan durante el desarrollo y se guardan en el repositorio
- Servidos por la CDN de Vercel — latencia minima
- Las rutas internas de generacion siguen protegidas: en produccion responden 403 salvo que se active
  el flag `ENABLE_ASSET_GENERATOR`, que hoy esta apagado

## Qué modelo usar para cada cosa (resumen, 2026-09-16)

Hay muchos modelos disponibles y ninguno gana en todo. Esta tabla es un **punto de partida** en lenguaje simple.
La decisión completa, con evidencia, costos y comandos, está en la guía técnica:
[Guía de selección de modelos de IA para medios](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md).

**Imágenes**

| Necesito… | Primera opción | Por qué |
|---|---|---|
| Una imagen de calidad para uso diario | **GPT Image 2.5 Flare** (`pnpm ai:image`) | Rápida y buena; OpenAI la recomienda para trabajos nuevos |
| Corregir una zona exacta de una imagen, o la pieza final más cuidada | **GPT Image 2.5 Sunburst** con máscara | Es la más precisa editando; cuesta igual que Flare, pero tarda más |
| Íconos o recortes con fondo transparente | **GPT Image 2.5** | Soporta transparencia de forma completa |
| Explorar muchas ideas distintas por poco dinero | **Seedream 5 Lite** (`pnpm ai:fal`) | Unos USD 0,035 por imagen y puede sacar series relacionadas |
| Textura, material, atmósfera y "look" de una campaña | **Seedream 5 Pro** | Su fuerte medido es la riqueza de material y luz |
| Desarmar una pieza terminada en capas editables | **Seedream 5 Pro layerize** | Es el único que separa capas con fondo transparente |
| Formatos muy alargados (más de 3 a 1) | **Seedream 5 Pro** | GPT Image llega hasta 3 a 1 |
| Vectores reales (SVG) | **Recraft** vía Higgsfield | GPT Image y Seedream sólo entregan imágenes de píxeles (hoy la cuenta de Higgsfield necesita volver a iniciar sesión) |

**Video** (todo por `pnpm ai:fal`)

| Necesito… | Primera opción | Por qué |
|---|---|---|
| Probar ideas de movimiento rápido y barato | **Minimax H3 Max Turbo** a baja resolución, o **Flux 3 borrador** | Son las opciones más baratas; se genera la versión final sólo de lo aprobado |
| La toma principal con la mejor calidad | **Seedance 2.5** | Primera en el ranking de OpenArt; hasta 30 segundos |
| Una toma en 4K | **Seedance 2.0 base** | Es la única que entregó 4K real en las pruebas |
| Controlar exactamente cómo se mueve la cámara sobre una imagen | **H3 Max control de cámara** | Se describe el recorrido y la escena queda quieta |
| Fijar cómo empieza y cómo termina el video | **Flux 3** primer y último cuadro, o **Wan 3.0** / **Seedance** desde imagen con último cuadro | |
| Editar o alargar un video **sin** personas ni marcas | **Seedance 2.5** en modo edición o extensión | |
| Editar o alargar un video **con** personas o marcas | **Flux 3** edit o extend | El filtro de Seedance rechaza personas reales y logos, y cobra el intento |
| Un video basado en una página web o un documento | **Wan 3.0** desde referencias, con razonamiento activado | Conviene darle un guion en la instrucción |

Tres advertencias que aplican a todo:

- **Los rankings externos no coinciden.** OpenArt pone a Seedream 5 Pro primero en imagen, pero Arena y
  Artificial Analysis (septiembre de 2026) ponen primero a GPT Image 2.5 y a Seedream 5 Pro entre el puesto 8 y
  el 15. En video pasa algo parecido. Ningún ranking reemplaza probar con el brief real.
- **La resolución cambia mucho el precio.** Varios modelos de video cobran distinto según la calidad pedida. El
  comando usa por defecto la más barata y avisa el costo estimado antes de gastar (ver "Cuánto va a costar, antes
  de gastar" más abajo).
- **El texto, el logo y lo legal** se componen fuera del modelo, en diseño, nunca se confían a la generación.

## Los dos motores de imagen (estado al 2026-09-16)

Hasta hace poco el motor por defecto era **Imagen 4** de Google. Google retiró ese modelo: dejó de
ofrecerse en Vertex el 2026-06-30 y el servicio se apagó el 2026-08-17. Una prueba hecha el
2026-09-16 contra nuestro proyecto confirmó que ya no responde. Como era el motor por defecto,
cualquier generación que no pidiera otro motor a mano quedaba fallando.

Hoy hay dos motores disponibles:

| Motor | Cuándo se usa | Para qué es bueno |
|---|---|---|
| **GPT Image de OpenAI** | Es el **nuevo motor por defecto** | Uso cotidiano de imágenes del portal y piezas internas |
| **Gemini Image de Google** | Solo si se pide explícitamente | Alternativa cuando se quiere el carril Google |

Dentro de GPT Image hay una familia nueva, **GPT Image 2.5**, con dos variantes:

- **Flare** — la rápida, pensada para el uso de todos los días.
- **Sunburst** — pensada para edición de precisión, cuando hay que corregir o ajustar con detalle.

También sigue disponible la versión anterior, **GPT Image 2**, que todavía es la que usa el comando si no se
elige otra. OpenAI recomienda la 2.5 para trabajos nuevos; la 2 sigue vigente y es la única que permite pedidos en
lote a mitad de precio.

Dos novedades de la familia 2.5 que se notan en el resultado:

- **Dos niveles de calidad nuevos** por encima de "alta": se llaman `xhigh` y `max`. Sirven cuando la
  pieza es grande o va a verse muy de cerca.
- **Fondo transparente con soporte pleno**, útil para íconos y assets recortados que se apoyan sobre
  cualquier color de fondo.

## Editar solo una parte de una imagen (desde 2026-09-16)

Se puede pedir que el sistema cambie **solo una zona** de una imagen que ya existe y deje el resto igual.
Para eso se entrega la imagen original y una segunda imagen llamada **mascara**, que marca en transparente
la zona que se quiere reemplazar. El resto queda protegido.

Sirve, por ejemplo, para poner un objeto sobre una mesa vacia, cambiar un color puntual o corregir un
detalle sin volver a generar la pieza completa.

**Cuidado con una suposicion muy comun: editar no sale mas barato que generar de nuevo.** Aunque el cambio
sea chico, el sistema devuelve la imagen completa, asi que se cobra lo mismo que una imagen nueva, y ademas
se suma el costo de leer la imagen original. En calidad baja, editar costo **2,3 veces** lo que costo generar.
La mascara en si no tiene costo.

Por eso, para **quitar el fondo** de una imagen que ya existe conviene usar la herramienta local
(`pnpm ai:image:rmbg`), que no le cobra nada al proveedor. Pedirle el recorte al modelo costaria como una
imagen nueva.

Desde el 2026-09-17 esa herramienta tambien **repara huecos internos**: si el recorte dejo transparente por error
una parte del personaje (unos ojos, un visor, un simbolo en el pecho), la vuelve a rellenar con la imagen original,
pero respeta los huecos que de verdad son fondo.

Y tiene una opcion para el caso contrario, `--key-background`: cuando el objeto es claro y el fondo oscuro (una
nave blanca sobre azul marino), el recorte puede dejar **tapados** los agujeros por los que se ve el fondo, como las
ventanas o los cortes de una orbita. Con esa opcion la herramienta los vacia. No viene activada, porque si el
personaje tiene partes del mismo color que el fondo tambien las borraria.

## Cuánto cuesta generar una imagen

Cifras **medidas el 2026-09-16**, en dólares y por imagen:

- Calidad baja: aproximadamente **USD 0,006**
- Calidad alta: aproximadamente **USD 0,05**
- Calidad máxima: aproximadamente **USD 0,21**

Un dato que suele sorprender: **elegir Flare o Sunburst cuesta lo mismo**. El precio lo determinan la
calidad y el tamaño de la imagen, no cuál de las dos variantes se use. Lo que sí cambia entre ellas es
la velocidad: en calidad máxima, Flare tardó 46 segundos y Sunburst 81 segundos en la misma prueba.

**El costo se puede calcular antes de generar** (corrección 2026-09-16): OpenAI publica una fórmula que coincide
exactamente con lo medido, así que ya no hace falta gastar para saber cuánto costará una pieza. Desde el mismo día
**el comando hace ese cálculo solo** y muestra el costo estimado antes de pedir la imagen (sólo informa; no pide
confirmación). También revisa antes de gastar que el tamaño y el fondo pedidos sean válidos, y permite elegir el
formato del archivo (PNG, JPEG o WebP); si no se indica, lo toma de la extensión del nombre del archivo. Otra equivalencia
útil: la calidad **alta de GPT Image 2** cuesta lo mismo que la **máxima de GPT Image 2.5**, y la **media de la 2**
lo mismo que la **alta de la 2.5**.

Los precios de los proveedores cambian. Antes de comprometer un costo con un cliente hay que volver a
calcularlo o medirlo, no citar estas cifras como si fueran permanentes.

## Ahora avisa en vez de sustituir en silencio

Antes, si alguien pedía un modelo o una calidad que no existía, el sistema usaba otro por su cuenta y
entregaba una imagen que parecía correcta pero no era la que se había pedido. Eso hacía muy difícil
darse cuenta del error.

Ahora no sustituye nada por su cuenta: si el modelo o la calidad no existen, **avisa con un error
claro** y no genera. Es preferible una falla visible a una imagen silenciosamente distinta.

> Detalle tecnico: ver [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) para la tabla de motores, el contrato de la familia GPT Image 2.5 y las opciones del comando `pnpm ai:image`.

## Acceso a Fal.ai (imagen, video y audio por IA) — desde 2026-07-06

Ademas de los motores de imagen (GPT Image y Gemini Image) y de Higgsfield/Recraft (vectores), Greenhouse tiene acceso a **Fal.ai**, un agregador que permite generar **imagen, video y audio** con muchos modelos a traves de una sola API (por ejemplo Seedance, Minimax H3, Flux 3 y Wan 3.0 para video; Seedream y los Flux anteriores para imagen). Los modelos de Google (Gemini, Veo, Omni y Nano Banana, incluido Nano Banana Pro) no se usan a través de Fal: se conectan directo con Google, aunque Fal los ofrezca, porque así sale más barato con la misma calidad.

- **Para que sirve:** producir contenido media de mayor variedad (sobre todo **video**) que los motores de imagen actuales no cubren, para piezas de marketing, campanas y exploracion visual.
- **Como se usa:** con el comando de terminal `pnpm ai:fal` (ver la sección siguiente) o de forma programatica, con un cliente interno unico. El contenido se genera fuera del portal y se **sube** por el flujo normal de assets — no se genera en tiempo real para los usuarios del producto.
- **Estado actual (2026-07-06):** **operativo.** La llave quedo guardada de forma segura (en el gestor de secretos) y se **verifico una generacion real de punta a punta** (se genero una imagen de prueba correctamente). La llave es temporal (se rotara mas adelante). Desde el 2026-09-16 hay **dos cuentas de Fal** configuradas (ver "Dos cuentas y saldo" más abajo). Todavia no esta conectada a ninguna pantalla del producto — es acceso para generacion operada por el equipo/agente.
- **Costo:** se paga por segundo de video segun el modelo (ejemplo: un clip corto economico ronda los US$0.36; uno de mayor calidad, varios dolares). Siempre revisar el precio del modelo en `fal.ai/models` antes de generar.

> Detalle tecnico: ver [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) para la API del generador, system prompts, contrato SVG, endpoints internos y la seccion "Fal.ai — agregador de generacion media".

## Higgsfield dentro de `pnpm ai:fal` (desde 2026-09-16)

Higgsfield es otro agregador de modelos, parecido a Fal, con modelos propios (SOUL para retratos realistas, Marketing
Studio para piezas de campaña) y otros que Fal no ofrece (Ideogram 4.0, Qwen Image 3, Z-Image Turbo, PixVerse 6,
LTX 2.5, Happy Horse, Kling Omni y O3). En vez de crear otro comando, se sumó al mismo `pnpm ai:fal`: las opciones de
Higgsfield empiezan con `hf-`.

| Qué cambia | Cómo funciona |
|---|---|
| Precio | Higgsfield dice el precio exacto antes de generar. El comando lo muestra y pide confirmar si pasa el tope. En Seedance y Wan 3.0 calcula un techo con la fórmula del proveedor. |
| Revisión previa | El pedido se compara con las reglas reales de cada modelo antes de gastar, y el comando lista todo lo que falta o sobra. |
| Solo cotizar | `--estimate` muestra el precio sin generar nada. |
| Archivos | Higgsfield los guarda unos 7 días; el comando los descarga siempre. |
| Vectores | Pedir formato SVG no funciona. La app de Higgsfield tiene un modo vector para Recraft; si la API lo respeta y entrega SVG está sin probar hasta la primera generación real. |

**Estado:** los 44 modelos respondieron con precio con la cuenta de Efeonce. **Todavía no se generó nada real**,
porque la cuenta de la API de Higgsfield no tiene créditos (son aparte de la suscripción de la app). Veo 3.1, Sora 2 y
Nano Banana Pro no están disponibles por esta vía.

> Detalle técnico: [Guía de selección de modelos §5.8](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) ·
> [Manual del comando](../../manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md) · código en
> `src/lib/ai/higgsfield.ts` y `scripts/ai/higgsfield-lane.ts`.

## El comando `pnpm ai:fal`: imágenes, capas y video (desde 2026-09-16)

Es un comando de terminal que el equipo o el agente usa para trabajar con tres familias de modelos a través de
Fal: Seedream, Seedance, Minimax H3, Flux 3 y Wan 3.0. Convive con `pnpm ai:image`: no lo reemplaza. `ai:image` sigue siendo el camino para GPT Image; `ai:fal`
es el camino para los modelos que viven en Fal.

### Qué permite hacer

| Necesidad | Modelo | Qué entrega |
|---|---|---|
| Crear una imagen desde un texto | **Seedream 5** (Pro para mejor acabado, Lite para explorar rápido y barato) | Una o varias imágenes |
| Cambiar algo de una imagen usando referencias | **Seedream 5 edit** (Pro acepta hasta 10 referencias) | La imagen ajustada, conservando el resto |
| **Separar una pieza terminada en capas** | **Seedream 5 Pro layerize** | Una capa por elemento, con fondo transparente, más un archivo que dice dónde va cada una |
| Crear un video desde un texto, una imagen o referencias | **Seedance 2.5** o **Seedance 2.0** | Un video corto |
| Crear un video rápido y barato, o mover la cámara sobre una escena | **Minimax H3** (base, Max y Max Turbo) | Un video corto, con sonido |
| Entrenar un estilo o personaje propio para video | **Minimax H3 trainer** | Un archivo LoRA reutilizable |
| Probar una idea de video barato y después pasarla a versión final | **Flux 3** (borrador + mejora) | Un borrador y, si gusta, su versión final |
| Video entre un primer y un último cuadro, o pasando por varios cuadros clave | **Flux 3** | Un video corto |
| Cambiar el aspecto de un video que ya existe, o alargarlo | **Flux 3 edit / extend** (o Seedance 2.5, sin personas ni marcas) | El video editado, o sólo el tramo nuevo |
| Un video de hasta 30 segundos donde el modelo decide el largo, o que se base en una página web o un documento | **Wan 3.0** (y Wan 3.0 Prime) | Un video corto, con sonido |

### La separación por capas, en simple

Es la novedad más útil. Se entrega **una sola imagen plana** (por ejemplo, un key visual ya aprobado) y el
sistema la devuelve **desarmada**: la imagen completa primero y después hasta 16 piezas sueltas (el logo, el
sujeto, un elemento decorativo…). Cada pieza viene recortada, con **fondo transparente de verdad** (también en
los huecos internos, como el centro de una letra) y con su posición y orden guardados en un archivo aparte.

No hace falta escribir instrucciones: basta con la imagen. En una prueba real sobre un key visual devolvió 8
capas.

Sirve para reaprovechar una pieza plana que no tiene archivo de diseño editable: mover un elemento, reutilizar
el logo o el sujeto en otro formato, o armar variantes sin volver a generar todo.

**Se cobra por capa:** unos USD 0,034 por capa en piezas de hasta 1536×1536 y el doble en piezas más grandes. Una
pieza de 8 capas a 2K rondaría medio dólar.

### Seedream 5 Pro y Lite no son iguales

- **Pro llega a 2048×2048**, no a 4K. Lite puede sacar imágenes más grandes.
- **Pro puede entregar JPEG o PNG**: el comando lo decide por la extensión del nombre del archivo (`.png` o `.jpg`) y,
  si lo que llega no coincide, guarda el archivo con la extensión correcta y lo avisa. Lite siempre entrega PNG.
- **Lite puede sacar series** de imágenes relacionadas en un solo pedido; Pro no.
- Ninguno permite fijar una semilla para repetir exactamente un resultado (el comando lo rechaza si se intenta).
- Al editar con imágenes de referencia, el máximo es **10**; con más, el comando se detiene antes de cobrar.

### Qué diferencia a Seedance 2.5 y 2.0

| Versión | Duración máxima | Calidad máxima |
|---|---|---|
| Seedance 2.5 | 30 segundos | 1080p (no hace 4K; el 1080p todavía no se ha probado) |
| Seedance 2.0 | 15 segundos | 4K (es la única que llega a 4K) |
| Seedance 2.0 fast, mini y us | 15 segundos | 720p |

Si se pide algo que el modelo elegido no hace (por ejemplo 4K a la 2.5, o 30 segundos a la 2.0), el comando
**avisa y se detiene antes de cobrar**, indicando qué valores sí acepta.

La versión **us** es la misma Seedance 2.0 **alojada en Estados Unidos**: cuesta 20 % más y no mejora la calidad.
Sólo conviene si un cliente exige que el procesamiento ocurra en Estados Unidos.

### Qué agrega Minimax H3 (desde 2026-09-16)

- **Video rápido y barato.** En las pruebas reales cada video tardó entre 3 y 8 segundos en generarse. **H3 Max
  Turbo** es la opción más barata de todo el comando (del orden de uno a dos centavos de dólar por segundo de video
  a baja resolución). Ojo: el precio sube con la resolución. **H3 base a 2K** cuesta unos 13 centavos por segundo (casi
  tres veces lo que cuesta a 480P); si no se indica la calidad, el comando usa la más barata y lo avisa.
- **Calidad según versión.** H3 base ofrece hasta **4K**, pero su 2K y su 4K son una **ampliación** de un video
  generado a 768P, no una generación nativa en esa resolución; Max y Max Turbo llegan a 1080p (también refinado
  desde 768P). H3 Max no es de MiniMax: es una versión entrenada por Fal sobre H3.
- **Duración** de 5 a 15 segundos (5 por defecto).
- **Con sonido.** Aunque no se pida, H3 entrega el video con ambiente o música.
- **Control de cámara.** Con una imagen de partida se puede describir el recorrido de la cámara (acercarse,
  girar, subir) y la escena queda quieta mientras la cámara se mueve.
- **Desde imagen**, con opción de indicar también el **último cuadro**, y **desde referencias** (imágenes, videos
  o audios).
- **LoRAs y entrenamiento.** Se puede aplicar hasta 3 LoRAs (estilos o personajes entrenados) a un video, y
  entrenar una LoRA propia a partir de un paquete de material. El entrenamiento se cobra por paso, con un **mínimo de 100 pasos** (desde USD 0,50
  aunque se pidan menos); uno típico ronda los USD 10 a 30 según el tipo. Cada clip del material necesita su
  descripción escrita, y los clips de menos de 3 segundos se descartan sin aviso.
- **Un video que tarda demasiado no se pierde.** Si el comando deja de esperar, el trabajo sigue corriendo (y
  cobrando) en Fal. El comando muestra cómo **retomarlo** para descargar el resultado sin volver a pagar. Esto
  vale para todos los modelos del comando, no sólo H3.
- **Lo que no se puede usar:** el modo **Director** de H3 Max (video en vivo guiado en tiempo real) no funciona
  con este comando; el comando lo explica y se detiene.

### Qué agrega Flux 3 (desde 2026-09-16)

Aunque el nombre recuerde a los Flux de imagen, **Flux 3 en Fal es un modelo de video**.

- **Borrador barato y mejora.** Cada modo tiene una versión **borrador** que cuesta cerca de un tercio de la final
  (Fal y Black Forest Labs publican USD 0,06 por segundo contra 0,17 a 720p, el doble de lo que devolvió la API de
  precios de Fal; conviene confirmarlo mirando el saldo antes y después). Si el borrador gusta, se **mejora** a versión final sin volver a describir la escena:
  el comando muestra el paso siguiente listo para copiar. En la prueba, la mejora entregó el mismo plano en 1080p.
- **Desde texto o desde una imagen**, de 5 a 20 segundos, en 720p o 1080p.
- **Primer y último cuadro.** Se entregan la imagen de inicio y la de término, y el video resuelve el paso entre
  ambas.
- **Cuadros clave (keyframes).** Se entregan de 1 a 10 imágenes y se indica en qué cuadro del video debe aparecer
  cada una.
- **Editar un video existente.** Vuelve a dibujar un clip según una instrucción (otro estilo, otra luz, otro
  material) conservando el movimiento, el ritmo y el encuadre originales. Es la opción más barata de Flux 3.
- **Extender un video.** Continúa un clip desde su último cuadro. Dos cosas importantes:
  - el video de origen **tiene que traer sonido**; sin pista de audio Fal lo rechaza (el comando lo revisa antes
    de subir cuando el archivo es local);
  - entrega **sólo el tramo nuevo**, no el clip completo: hay que unir original y continuación en edición.
- **Con sonido** por defecto (se puede apagar).
- **Más lento que H3:** en las pruebas tardó entre 40 segundos y 4 minutos por video.

### Qué agrega Wan 3.0 (desde 2026-09-16)

Wan 3.0 es el modelo de video de Alibaba. Al 2026-09-16 aparece **segundo** en el ranking público de video de
OpenArt Arena (un ranking externo de preferencia de personas, que cambia seguido). Hay dos líneas, **Wan 3.0** y
**Wan 3.0 Prime**, con las mismas opciones. **No cuestan lo mismo** (corrección 2026-09-16): Wan 3.0 cuesta USD 0,05
por segundo a 480p, 0,10 a 720p y **0,20 a 1080p**; Prime cuesta 0,068, 0,14 y **0,28**. Alibaba describe a Prime
como la versión **acelerada**; que tenga mejor calidad no está medido.

- **Desde texto, desde una imagen o desde referencias.** Desde imagen se entrega el primer cuadro y, si se quiere,
  también el último.
- **De 2 a 30 segundos**, o dejar que **el modelo elija el largo** según lo que se pide.
- **Hasta 1080p**, que es la más cara (cuatro veces el precio de 480p) y la más lenta. Si no se indica la calidad,
  el comando usa **480p**, la más barata, y lo avisa: sirve para explorar, pero para la pieza final hay que pedir
  720p o 1080p.
- **Con sonido** por defecto (se puede apagar).
- **Referencias variadas:** hasta 10 imágenes, 5 videos y 5 audios, que se nombran en la instrucción por su orden
  («la persona de la imagen 1…»).
- **Puede basarse en una página web o en un documento.** En el modo desde referencias se le puede dar la dirección
  de una web pública o un archivo, y el modelo lo lee antes de generar. Para eso hay que activar su modo de
  **razonamiento previo**; el comando lo exige para que quede claro que se está usando.
- **Repetible:** se puede fijar una **semilla** para obtener resultados parecidos al repetir.
- **Instrucción tal cual:** por defecto Wan reescribe y amplía la instrucción; se puede apagar para que use el texto
  exacto (es más rápido, pero puede bajar la calidad).

**Qué está probado:** las **seis opciones** de Wan 3.0 y Wan 3.0 Prime, con generaciones reales el 2026-09-16. La
primera fue desde texto (el modelo eligió un largo de 5 segundos, respetó la semilla y entregó video con sonido); las
otras cinco se probaron más tarde ese mismo día. El modo que se basa en una **página web** también se probó en real:
Wan 3.0 Prime armó un teaser a partir de efeoncepro.com. El modo que parte de un **documento** todavía no se ha probado.

### Otros modelos revisados y no conectados

El 2026-09-16 también se revisaron **Kling 3** (video con varios planos en una sola pieza, personajes consistentes
con voz, 4K y copiar el movimiento de un video a una imagen; más caro por segundo) y **Grok Imagine** (video muy
barato para explorar en cantidad, con calidad menor según el ranking, e imágenes). Quedaron **documentados pero sin
conectar** al comando.

### Video a video: editar o alargar un clip que ya existe

Hay dos caminos, y los dos están probados (2026-09-16):

| Quiero | Flux 3 | Seedance 2.5 |
|---|---|---|
| Cambiar el aspecto de un clip | **Flux 3 edit**: conserva movimiento y encuadre | Seedance 2.5 desde referencias, en modo **edición** |
| Alargar un clip | **Flux 3 extend**: exige sonido en el original y entrega sólo lo nuevo | Seedance 2.5 desde referencias, en modo **extensión** (hasta 30 segundos) |

Sobre Seedance, lo que conviene saber:

- Fal **no tiene** un "video a video" de Seedance aparte: se hace desde la opción **desde referencias**.
- Sólo **Seedance 2.5** puede editar o extender. En **Seedance 2.0** el video de referencia sólo **inspira** el
  resultado; no lo edita ni lo alarga.
- Siempre hace falta al menos **una imagen o un video** de referencia; un audio solo no alcanza.
- Los videos de Seedance duran **como mínimo 4 segundos**.
- Se probó en real el 2026-09-16: la **edición** convirtió un viñedo en paisaje nevado conservando el encuadre, y la
  **extensión** siguió el movimiento de cámara y reveló la cordillera.
- **Filtro de contenido del proveedor (ByteDance):** Seedance rechaza referencias con **marcas o logotipos** (pasó con
  el isotipo de Efeonce) y con **personas reales** (pasó con un video de un barista). El rechazo llega **después** de
  encolar, así que **el intento se cobra**. Para editar o alargar con Seedance 2.5, usar material sin personas
  identificables ni marcas; si hay personas, usar Flux 3 o Wan 3.0.

### Qué está probado y qué no

- Las cinco opciones de **Seedream 5** están probadas con generaciones reales (2026-09-16).
- De **Seedance** están probadas **las 15 opciones** (2026-09-16): Seedance 2.5 desde texto, desde imagen y desde
  referencias (incluidas edición y extensión), y Seedance 2.0 en sus versiones base (texto con 4K real, imagen y
  referencias), fast, mini y us.
- De **Minimax H3** están probadas 9 opciones: desde texto, desde imagen y desde referencias en H3 base y Max,
  control de cámara, y Max Turbo desde texto y desde imagen. En referencias sólo se probó con imágenes (no con
  videos ni audios). **Sin probar:** las tres variantes con LoRA y los cuatro entrenadores.
- De **Flux 3** están probadas **las 12 opciones** (2026-09-16): desde texto, desde imagen, primer y último cuadro,
  keyframes, sus borradores, la mejora de borradores, editar y extender.
- De **Wan 3.0** están probadas **las 6 opciones** (base y Prime).
- En total: 55 opciones conectadas y **47 probadas** con generaciones reales. Faltan sólo las tres variantes con LoRA
  y los cuatro entrenadores de H3 (postergados por decisión del equipo); el modo Director de H3 no se puede usar.
- `pnpm ai:fal --list` muestra este estado en cualquier momento, y no cuesta nada.

### Lo que conviene saber

- **Cada uso cuesta dinero**, salvo `--list` y `--balance`. A diferencia de `ai:image`, este comando **no informa
  cuánto costó** cada corrida ni lo calcula antes, porque Fal no entrega ese dato. Antes de un lote o de un video
  largo hay que revisar el precio vigente **para la resolución que se va a pedir**: el precio que figura en nuestros
  registros es el de la resolución más baja. Cuando haya duda, mirar el saldo con `--balance` antes y después de una
  prueba corta.
- **Costo real medido (2026-09-16):** la prueba completa de 17 videos cortos (de 2 a 4 segundos) costó **USD 7,71**,
  incluidos 3 intentos que Seedance rechazó por su filtro y que igual se cobraron. Seedance salió cerca del **doble**
  de lo estimado con la equivalencia de tokens de OpenArt, así que esa equivalencia no sirve para presupuestar. **La
  fórmula que publica Fal sí sirve** (alto × ancho × segundos × 24 / 1024 tokens): coincidió con lo medido. Como
  referencia: 3 videos de Seedance 2.0 fast de 4 segundos a 480p costaron cerca de USD 1,37, y 3 de mini, USD 0,85.
- Es producción **fuera del portal**: nada de esto se genera en tiempo real para los usuarios.
- Gemini Omni (video de Google) y Nano Banana Pro (imagen de Google) **no** se usan por aquí: van directo con Google.

### Cuánto va a costar, antes de gastar (desde 2026-09-16)

- **El comando de Fal avisa cuánto costará** cada pedido antes de mandarlo a la fila. Es una estimación: usa los
  precios publicados a esa fecha, que pueden cambiar.
- **Si es caro, pide confirmación.** Cuando la estimación pasa de USD 1, el comando se detiene sin cobrar nada y pide
  repetir con `--yes`. Ese límite se puede cambiar para un pedido (`--max-usd`) o de forma general
  (`FAL_COST_CONFIRM_USD`).
- **En video usa por defecto la calidad más barata.** Antes, algunos modelos usaban la más cara si no se indicaba
  nada; ahora hay que pedir la calidad final a propósito.
- **Si no puede estimar** (por ejemplo, un modelo que no está en la lista del comando), lo dice y deja seguir.
- La medida real sigue siendo mirar el saldo antes y después (`pnpm ai:fal --balance`).

### Dos cuentas y saldo (desde 2026-09-16)

- El comando tiene configuradas **dos cuentas de Fal**. En cada uso elige la que tiene **más saldo** y, si Fal bloquea
  una por falta de saldo, **pasa sola a la otra**. Ese bloqueo ocurre antes de empezar, así que no se cobra. Cada uso
  muestra qué cuenta trabajó; nunca muestra las llaves.
- **Ver el saldo:** `pnpm ai:fal --balance` muestra el saldo en dólares de cada cuenta, sin costo. Si todas se quedan
  sin saldo, el comando lo dice; recargar es tarea de una persona con acceso a la facturación de Fal.
- **Encolar sin esperar:** con `--detach` el comando deja el trabajo en la fila de Fal, muestra su identificador y los
  comandos para consultarlo, y termina. Con `--status` se consulta cómo va (en fila, en proceso o listo), sin costo.
  Sirve para dejar varios videos andando o para trabajos largos. La espera normal, sin `--detach`, es de hasta 30
  minutos por video.
- **Pendiente de seguridad:** la llave de la segunda cuenta se compartió en una conversación y conviene cambiarla
  (rotarla). Lo hace una persona con acceso a Fal y al gestor de secretos.

## Nano Banana Pro: dónde está hoy (revisión 2026-09-16)

- El generador del producto ya usa un motor de imagen de Google: **Nano Banana 2**. No es el motor por defecto (el
  por defecto es GPT Image); se usa cuando se elige el carril de Google.
- **Nano Banana Pro** está disponible en la cuenta de Google del equipo (se comprobó ese día), pero **ninguna
  herramienta lo usa todavía**.
- No hay un comando de terminal para las imágenes de Google: `pnpm ai:image` sólo trabaja con GPT Image.
- Pasar todo el carril de Google a Nano Banana Pro cambiaría el motor para todos los que lo usan. Si se decide
  usarlo, lo correcto es poder elegirlo en cada pedido. Esa decisión está pendiente.

> Detalle tecnico: [GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md](../../architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md) §Carril operativo (registro de capacidades, contratos de video, subida de archivos) y el manual [Operar el CLI de fal (Seedream, Seedance, Minimax H3, Flux 3 y Wan 3.0)](../../manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md). Código: `scripts/ai/fal-image.ts`, `src/lib/ai/fal-capabilities.ts`, `src/lib/ai/fal.ts`.

## Produccion de campañas con varias manos de IA

Para una campaña grande no se elige necesariamente un solo modelo. El equipo puede iniciar una dirección en **Seedream 5**, pasar un anchor aprobado a **GPT Image 2** para organizarlo o adaptarlo, y volver a Seedream si hace falta enriquecer materialidad o atmósfera. También funciona en sentido inverso.

La regla es asignar cada operación a la mano más fuerte:

- Seedream Lite explora familias visuales rápidamente.
- Seedream Pro desarrolla color, material, luz y energía.
- GPT Image 2 organiza composición, corrige regiones y crea derivados con restricciones precisas.
- Un compositor determinista agrega copy, logo, legal y exports finales.

Antes de multiplicar formatos se aprueba un **anchor** y un contrato de relevo que declara qué puede cambiar y qué debe permanecer intacto. Así una campaña puede crecer a 9:16, 4:5, 3:1 y otros formatos sin convertir cada nueva pieza en una reinterpretación de la anterior. Sigue siendo producción operada fuera del portal: no habilita generación en tiempo real para usuarios.
