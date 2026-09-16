> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.5
> **Creado:** 2026-04-07 por Claude (TASK-278)
> **Ultima actualizacion:** 2026-09-16 por Claude — Minimax H3 sumado a `pnpm ai:fal` (video rápido y barato, control de cámara, LoRAs y entrenamiento); antes, nuevo comando `pnpm ai:fal` (Seedream 5, separación por capas y video Seedance); antes, cambio de motor por defecto tras TASK-1851
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

También sigue disponible la versión anterior, **GPT Image 2**.

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

## Cuánto cuesta generar una imagen

Cifras **medidas el 2026-09-16**, en dólares y por imagen:

- Calidad baja: aproximadamente **USD 0,006**
- Calidad alta: aproximadamente **USD 0,05**
- Calidad máxima: aproximadamente **USD 0,21**

Un dato que suele sorprender: **elegir Flare o Sunburst cuesta lo mismo**. El precio lo determinan la
calidad y el tamaño de la imagen, no cuál de las dos variantes se use. Lo que sí cambia entre ellas es
la velocidad: en calidad máxima, Flare tardó 46 segundos y Sunburst 81 segundos en la misma prueba.

Los precios de los proveedores cambian. Antes de comprometer un costo con un cliente hay que volver a
medirlo, no citar estas cifras como si fueran permanentes.

## Ahora avisa en vez de sustituir en silencio

Antes, si alguien pedía un modelo o una calidad que no existía, el sistema usaba otro por su cuenta y
entregaba una imagen que parecía correcta pero no era la que se había pedido. Eso hacía muy difícil
darse cuenta del error.

Ahora no sustituye nada por su cuenta: si el modelo o la calidad no existen, **avisa con un error
claro** y no genera. Es preferible una falla visible a una imagen silenciosamente distinta.

> Detalle tecnico: ver [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) para la tabla de motores, el contrato de la familia GPT Image 2.5 y las opciones del comando `pnpm ai:image`.

## Acceso a Fal.ai (imagen, video y audio por IA) — desde 2026-07-06

Ademas de los motores de imagen (GPT Image y Gemini Image) y de Higgsfield/Recraft (vectores), Greenhouse tiene acceso a **Fal.ai**, un agregador que permite generar **imagen, video y audio** con muchos modelos a traves de una sola API (por ejemplo Seedance y Kling para video; Seedream y flux para imagen). Los modelos de Google (Gemini, Veo, Omni) no se usan a través de Fal: se conectan directo con Google.

- **Para que sirve:** producir contenido media de mayor variedad (sobre todo **video**) que los motores de imagen actuales no cubren, para piezas de marketing, campanas y exploracion visual.
- **Como se usa:** con el comando de terminal `pnpm ai:fal` (ver la sección siguiente) o de forma programatica, con un cliente interno unico. El contenido se genera fuera del portal y se **sube** por el flujo normal de assets — no se genera en tiempo real para los usuarios del producto.
- **Estado actual (2026-07-06):** **operativo.** La llave quedo guardada de forma segura (en el gestor de secretos) y se **verifico una generacion real de punta a punta** (se genero una imagen de prueba correctamente). La llave es temporal (se rotara mas adelante). Todavia no esta conectada a ninguna pantalla del producto — es acceso para generacion operada por el equipo/agente.
- **Costo:** se paga por segundo de video segun el modelo (ejemplo: un clip corto economico ronda los US$0.36; uno de mayor calidad, varios dolares). Siempre revisar el precio del modelo en `fal.ai/models` antes de generar.

> Detalle tecnico: ver [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) para la API del generador, system prompts, contrato SVG, endpoints internos y la seccion "Fal.ai — agregador de generacion media".

## El comando `pnpm ai:fal`: imágenes, capas y video (desde 2026-09-16)

Es un comando de terminal que el equipo o el agente usa para trabajar con tres familias de modelos a través de
Fal: Seedream, Seedance y Minimax H3. Convive con `pnpm ai:image`: no lo reemplaza. `ai:image` sigue siendo el camino para GPT Image; `ai:fal`
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

### La separación por capas, en simple

Es la novedad más útil. Se entrega **una sola imagen plana** (por ejemplo, un key visual ya aprobado) y el
sistema la devuelve **desarmada**: la imagen completa primero y después hasta 16 piezas sueltas (el logo, el
sujeto, un elemento decorativo…). Cada pieza viene recortada, con **fondo transparente de verdad** (también en
los huecos internos, como el centro de una letra) y con su posición y orden guardados en un archivo aparte.

No hace falta escribir instrucciones: basta con la imagen. En una prueba real sobre un key visual devolvió 8
capas.

Sirve para reaprovechar una pieza plana que no tiene archivo de diseño editable: mover un elemento, reutilizar
el logo o el sujeto en otro formato, o armar variantes sin volver a generar todo.

### Qué diferencia a Seedance 2.5 y 2.0

| Versión | Duración máxima | Calidad máxima |
|---|---|---|
| Seedance 2.5 | 30 segundos | 1080p (no hace 4K) |
| Seedance 2.0 | 15 segundos | 4K (es la única que llega a 4K) |
| Seedance 2.0 fast, mini y us | 15 segundos | 720p |

Si se pide algo que el modelo elegido no hace (por ejemplo 4K a la 2.5, o 30 segundos a la 2.0), el comando
**avisa y se detiene antes de cobrar**, indicando qué valores sí acepta.

### Qué agrega Minimax H3 (desde 2026-09-16)

- **Video rápido y barato.** En las pruebas reales cada video tardó entre 3 y 8 segundos en generarse. **H3 Max
  Turbo** es la opción más barata de todo el comando (del orden de un centavo de dólar por segundo de video);
  H3 Max cuesta el doble y H3 base, el cuádruple.
- **Calidad según versión.** H3 base llega a **4K**; Max y Max Turbo llegan a 1080p.
- **Duración** de 5 a 15 segundos (5 por defecto).
- **Con sonido.** Aunque no se pida, H3 entrega el video con ambiente o música.
- **Control de cámara.** Con una imagen de partida se puede describir el recorrido de la cámara (acercarse,
  girar, subir) y la escena queda quieta mientras la cámara se mueve.
- **Desde imagen**, con opción de indicar también el **último cuadro**, y **desde referencias** (imágenes, videos
  o audios).
- **LoRAs y entrenamiento.** Se puede aplicar hasta 3 LoRAs (estilos o personajes entrenados) a un video, y
  entrenar una LoRA propia a partir de un paquete de material. El entrenamiento se cobra por paso: uno típico
  ronda los USD 10 a 30 según el tipo.
- **Un video que tarda demasiado no se pierde.** Si el comando deja de esperar, el trabajo sigue corriendo (y
  cobrando) en Fal. El comando muestra cómo **retomarlo** para descargar el resultado sin volver a pagar. Esto
  vale para todos los modelos del comando, no sólo H3.
- **Lo que no se puede usar:** el modo **Director** de H3 Max (video en vivo guiado en tiempo real) no funciona
  con este comando; el comando lo explica y se detiene.

### Qué está probado y qué no

- Las cinco opciones de **Seedream 5** están probadas con generaciones reales (2026-09-16).
- En video están probadas **Seedance 2.5** desde texto y desde imagen, y **Seedance 2.0** desde texto (entregó 4K
  real). Las otras doce variantes de video están conectadas pero **sin probar**; el comando lo advierte antes de
  gastar.
- De **Minimax H3** están probadas 9 opciones: desde texto, desde imagen y desde referencias en H3 base y Max,
  control de cámara, y Max Turbo desde texto y desde imagen. En referencias sólo se probó con imágenes (no con
  videos ni audios). **Sin probar:** las tres variantes con LoRA y los cuatro entrenadores.
- Flux 3 **no** está conectado todavía.
- `pnpm ai:fal --list` muestra este estado en cualquier momento, y no cuesta nada.

### Lo que conviene saber

- **Cada uso cuesta dinero**, salvo `--list`. A diferencia de `ai:image`, este comando **no informa cuánto costó**
  cada corrida, porque Fal no entrega ese dato. Antes de un lote o de un video largo hay que revisar el precio
  vigente en la página del modelo.
- Es producción **fuera del portal**: nada de esto se genera en tiempo real para los usuarios.
- Gemini Omni (video de Google) **no** se usa por aquí; se conectará directo con Google.

> Detalle tecnico: [GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md](../../architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md) §Carril operativo (registro de capacidades, contratos de video, subida de archivos) y el manual [Operar el CLI de fal (Seedream, Seedance y Minimax H3)](../../manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md). Código: `scripts/ai/fal-image.ts`, `src/lib/ai/fal-capabilities.ts`, `src/lib/ai/fal.ts`.

## Produccion de campañas con varias manos de IA

Para una campaña grande no se elige necesariamente un solo modelo. El equipo puede iniciar una dirección en **Seedream 5**, pasar un anchor aprobado a **GPT Image 2** para organizarlo o adaptarlo, y volver a Seedream si hace falta enriquecer materialidad o atmósfera. También funciona en sentido inverso.

La regla es asignar cada operación a la mano más fuerte:

- Seedream Lite explora familias visuales rápidamente.
- Seedream Pro desarrolla color, material, luz y energía.
- GPT Image 2 organiza composición, corrige regiones y crea derivados con restricciones precisas.
- Un compositor determinista agrega copy, logo, legal y exports finales.

Antes de multiplicar formatos se aprueba un **anchor** y un contrato de relevo que declara qué puede cambiar y qué debe permanecer intacto. Así una campaña puede crecer a 9:16, 4:5, 3:1 y otros formatos sin convertir cada nueva pieza en una reinterpretación de la anterior. Sigue siendo producción operada fuera del portal: no habilita generación en tiempo real para usuarios.
