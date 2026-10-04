# Elenco y referencias de fotografía — Quién sale en las fotos de Efeonce y cómo se ve igual cada vez

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-10-03 por Claude
> **Ultima actualizacion:** 2026-10-03 por Claude
> **Estado:** en uso desde el 2026-10-03. Las 25 expresiones de Nexa están aprobadas por el operador; las piezas
> publicadas con personas generadas siguen pasando por la revisión de derechos y divulgación de IA, pieza por pieza
> **Documentacion tecnica:** [Elenco de marca](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md) · [Selección de referencias de marca](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) · [Almacenamiento de `ai-generations/`](../../operations/AI_GENERATIONS_STORAGE_V1.md) · [Ficha del Character Bible de Nexa](../../operations/brand-photography/NEXA_CHARACTER_BIBLE_FICHA_V1.md)
> **Manual de uso:** [Producir una foto de marca Efeonce](../../manual-de-uso/marketing/fotografia-de-marca-efeonce.md) · [Producir una foto en registro cine](../../manual-de-uso/creative/producir-foto-cine-de-marca.md)

## Qué es

Cuando Efeonce produce fotos de su propia marca con IA, necesita que las personas **sean las mismas** de una foto a
otra: la misma cara, la misma edad, la misma ropa con el logo bien puesto. Para eso cada persona tiene un juego de
**imágenes de referencia** aprobadas (de frente, de lado, de cuerpo entero, las manos) que el sistema le entrega al
modelo cada vez que esa persona aparece.

Este documento explica quiénes pueden salir en las fotos, qué puede y qué no puede representar cada uno, cómo el
sistema elige la ropa correcta, dónde viven las imágenes y qué se hace al sumar algo nuevo.

> Detalle técnico: [elenco, para qué sirve](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md#para-qué-sirve) · catálogo `ELENCO` y `PERSONAS` en `scripts/foto/build-prompt.mjs`

## El elenco de marca

El elenco son **cinco personajes ficticios** que reaparecen entre campañas. Cada uno está ligado a una línea de
servicio de Efeonce y la representa cuando hace falta mostrar a alguien trabajando en ella.

| Personaje | Quién es | Línea | Rol que interpreta | Cómo es |
|---|---|---|---|---|
| **Hum** | 33 años, venezolana | Growth (crecimiento y medición) | Estratega de crecimiento y medición | Bob liso casi negro a los hombros, con raya al centro, y un piercing plateado en la nariz. Serena y analítica, escucha antes de proponer (las dos cosas aprobadas el 2026-10-04) |
| **Karolyne «Karo»** | 28 años, venezolana | Brand (servicios creativos) | Directora de arte y creadora de contenido | Rizos cobrizos largos, aros dorados y labial rosado. Coqueta en el gesto (sonrisa ladeada, mirada pícara), social; presenta y convence |
| **Sophia** | 31 años, venezolana, hermana mayor de Karo | Engine (web, SEO/AEO y analítica) | Estratega SEO/AEO y analítica web | Bob rizado castaño oscuro y lentes de montura dorada fina. Seria, analítica, sonrisa contenida |
| **Isabella** | 27 años, colombiana (Barranquilla) | Voice (medios y distribución) | Especialista de medios pagados y distribución | Rizos apretados y pecas suaves. Energía alta, gesticula al explicar, ríe fácil |
| **Antonio** | 35 años, mexicano (Ciudad de México) | Revenue (RevOps y CRM, HubSpot o Salesforce) | Líder de RevOps y CRM | Pelo negro liso peinado hacia atrás y barba corta. Calma segura, sonrisa de boca cerrada |

Las dos hermanas cubren a propósito el par creativo y analítico, una tensión que se puede contar en una pieza.

**Qué pueden hacer:**

- interpretar el rol de su línea en campañas, redes, decks y propuestas;
- vestir la prenda de su línea;
- salir solos, con otros del elenco, con Nexa y con Julio.

**Qué no pueden hacer:**

- aparecer como si fueran el equipo real (página de equipo, firmas de correo, LinkedIn o cualquier «quiénes somos»);
- presentarse como cliente o firmar un testimonio;
- llevar su nombre en pantalla, salvo en una narrativa que diga abiertamente que es ficción;
- cambiar de rol o de línea de una pieza a otra.

Sus nombres son claves internas, no nombres públicos.

**El elenco se usa cuando hace falta, no por regla.** Existe para poder variar las personas en fotos de equipo o de
varias personas. No hay ninguna obligación de que salga alguien del elenco en cada foto. En palabras del operador:
«debe usarse el elenco si es necesaria su inclusión».

**Cómo se construyó cada personaje.** Se partió de candidatos con piel real (con poros y vello fino, tono parejo,
nunca castigada), el operador eligió uno, y las demás vistas se hicieron **editando** esa foto elegida, no generando
caras nuevas. El cuerpo entero se extendió desde la elegida respetando proporciones medidas. Nunca se pega una cara
sobre otro cuerpo.

> Detalle técnico: [§1 el elenco](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md#1-el-elenco) · [§2 qué puede y qué no](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md#2-qué-puede-y-qué-no-puede-representar-un-personaje-ficticio) · [§3 fichas](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md#3-fichas) · referencias en `ai-generations/_identidad-elenco/<clave>/`

## Quién más sale en las fotos

| Quién | Qué es | Detalle |
|---|---|---|
| **Julio Reyes** | Persona real del equipo | Sale en su rol real. Tiene 37 años con canas prematuras: el sistema le pide al modelo conservar su edad tal como se ve en las referencias, sin rejuvenecerlo ni envejecerlo |
| **Nexa** | El personaje de marca de Efeonce, con su propio Character Bible | Tiene sus referencias de cara, ángulos, poses, vestuario y 25 expresiones (ver más abajo) |
| **Otras personas del equipo real** | El roster | Cada una con sus propias referencias, siempre en su rol real |

**¿Cuántas personas caben en una foto?**

- **Una o dos:** cualquier combinación.
- **De tres a cinco:** cualquier mezcla de personajes del elenco, Nexa y Julio. Se probó con los cinco del elenco
  juntos y con Julio, Nexa y Karo. En un grupo, cada persona aporta una sola referencia de frente y la luz de esas
  referencias no se traslada a la foto: la luz la pone la escena, igual para todos.
- **Tres o más con otra persona del equipo real:** todavía no está probado, así que el sistema no lo permite.
- **La misma persona dos veces:** el sistema lo rechaza.

> Detalle técnico: [elenco §2 y §7b](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md) · [Personas, identidad y vestuario](../../operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) · `EN_GRUPO` en `scripts/foto/build-prompt.mjs`

## Cómo el sistema elige la ropa correcta

La ropa corporativa (bomber, softshell, polo, hoodie y gorra) tiene el logo bordado. Un modelo de IA no sabe dibujar
ese logo: si se le pide, lo inventa. Por eso no se le pide dibujarlo: se le muestra **una foto de la prenda ya puesta**,
con el logo correcto, en la misma posición en que está la persona.

El kit tiene **126 vistas puestas**: cada prenda de frente, girada a 45° y a 70° hacia cada lado, vista desde abajo,
de espaldas, y con el logo parcialmente tapado, para hombre y para mujer. El sistema elige solo la que corresponde
mirando tres cosas:

1. **Quién la viste:** si es hombre o mujer, porque la prenda cae distinto.
2. **Cómo está parada:** de frente, girada o de espaldas, y si la cámara está abajo.
3. **Si algo tapa el logo:** una mano, una taza que cruza, una tablet o los brazos cruzados.

Cuando no existe la vista exacta, elige la más parecida y avisa. El ángulo pesa más que el tipo de cuerpo: un logo
bien girado importa más que un calce perfecto. Quien arma la foto puede forzar otra vista si la elegida no le sirve.

> Detalle técnico: [Selección de referencias de marca](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) · kit en `ai-generations/2026-10-03_uniforme-vistas/LEEME.md` · función `elegirPuesta` en `scripts/foto/build-prompt.mjs`

## Qué pasa cuando una mano tapa el logo

Lo natural, como en una foto real, es que **se vea sólo la parte del logo que la mano no tapa**, a su tamaño de
siempre. El operador lo pidió así al ver una mano sobre el logo de Karo: «la vista real sería que se viera solo la
parte de logo que no tapa la mano». Por eso el kit trae vistas con oclusión: el modelo ve cómo queda el logo
parcialmente cubierto y lo respeta.

Si aun así la foto sale con un logo inventado, existe una herramienta que borra el logo falso y pone el oficial
**por detrás** de la mano, siguiendo los pliegues y la luz de la tela. Y si eso no queda limpio, la foto se vuelve a
hacer. Lo que nunca se hace es poner un logo más chico al lado de la mano para que «quepa».

> Detalle técnico: [Selección de referencias de marca](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) · `pnpm foto:isotipo` (oclusión, pliegues, relieve y escorzo)

## Las expresiones de Nexa

Nexa tiene **25 expresiones**, todas casi de frente y aprobadas por el operador el 2026-10-03. Se agrupan por lo que
cuenta la foto:

| Para contar… | Expresiones |
|---|---|
| Un éxito | euforia, alivio, orgullo sereno, «te lo dije» |
| El problema antes de resolverlo | hartazgo, agobio, alarma, confusión |
| Foco y trabajo | concentración, determinación, explicando |
| Lo social | bienvenida, mirada hacia la derecha, mirada hacia la izquierda |
| Lo cotidiano | carcajada, risa elegante, sorprendida, escéptica, pensativa, neutra, preocupada, convicción, escucha empática, curiosa, complicidad |

Siguen disponibles las ocho expresiones del Character Bible.

**Por qué ahora Nexa cambia de pose.** Antes todas sus expresiones venían de una misma foto en tres cuartos, y el
modelo terminaba copiando esa pose: la misma posición, sólo volteando la cara. Ahora el sistema le muestra primero su
cara de frente y después la expresión, sólo para el gesto. La pose y el giro de la cabeza los decide la escena.
En una foto de grupo la expresión no viaja: el gesto de Nexa también lo describe la escena.

**Por qué su cara ya no sale afinada.** La referencia de frente que se usaba era un poco más estrecha que el resto de
sus fotos aprobadas, y el modelo la copiaba. Se corrigió la referencia y se dejó escrito que su cara es un óvalo
suave, algo más ancho que largo de los ojos hacia abajo. Además existe un medidor (`pnpm foto:rostro`) que compara la
proporción de la cara en una foto nueva con la de sus fotos aprobadas.

Las expresiones nuevas se hicieron describiendo **la causa** del gesto (qué le pasa), no los músculos de la cara. Un
intento anterior con instrucciones musculares fue rechazado: «se ven muy IA, rasgos muy ficticios; Nexa debe tener sí
o sí rasgos reales».

> Detalle técnico: [Ficha del Character Bible de Nexa](../../operations/brand-photography/NEXA_CHARACTER_BIBLE_FICHA_V1.md) · `ai-generations/_identidad-nexa/LEEME.md` · expresiones en `ai-generations/_identidad-nexa/5-expresiones-frente/` · medidor `scripts/foto/rostro.mjs`

## Dónde viven las imágenes

| Qué | Dónde | Cómo se usa |
|---|---|---|
| **Lo aprobado** (referencias de personas, prendas, expresiones) | El **canon**: un almacenamiento en la nube de Efeonce | Cada imagen queda sellada con una huella. Cuando se arma una foto, el sistema la baja sola si falta en la computadora, o la reemplaza si hay una versión aprobada más nueva. Si la copia local era distinta, no la borra: la deja aparte, porque puede ser trabajo nuevo |
| **Lo no aprobado** (pruebas, descartes, exploración) | El **archivo**: otro almacenamiento en la nube | Se archiva para liberar espacio y se puede recuperar cuando haga falta. Archivar no es borrar |

Esto responde a una pregunta del operador («¿necesitas sí o sí que estén en local?»): las imágenes pasan por la
computadora cuando se genera una foto, pero sólo como una copia temporal; no hace falta guardar todo en el repositorio.
El 2026-10-03 se liberó más de 1,3 GB archivando pruebas.

> Detalle técnico: [Almacenamiento de `ai-generations/`](../../operations/AI_GENERATIONS_STORAGE_V1.md) · `scripts/foto/canon-sync.mjs` · `scripts/foto/assets.lock.json` · [Recuperar y archivar](../../manual-de-uso/creative/recuperar-y-archivar-ai-generations.md)

## Qué se hace al sumar algo nuevo

Algo nuevo sólo cuenta como aprobado cuando el operador lo aprobó, quedó **sellado** y se **publicó en el canon**. Lo
demás se archiva. Según el caso:

| Si se suma… | Qué se hace, en simple |
|---|---|
| **Una vista nueva de una prenda** | Se crea editando una vista ya aprobada, se revisa el logo letra por letra al 100 %, se registra cuándo usarla y se sella |
| **Un personaje nuevo del elenco** | Se escribe su ficha, el operador elige entre candidatos con piel real, se hacen sus vistas editando la elegida y se registra en el elenco |
| **Una expresión nueva de Nexa** | Se crea desde su cara de frente describiendo la causa del gesto, se mide la proporción de la cara y se registra |
| **Una persona nueva con proporción de cara declarada** | Se mide su cara en sus fotos aprobadas y se deja escrita esa proporción |

En todos los casos se corren las pruebas, se archiva la exploración y se documenta en la carpeta correspondiente.

> Detalle técnico: [manual, «Al sumar algo nuevo»](../../manual-de-uso/marketing/fotografia-de-marca-efeonce.md#al-sumar-algo-nuevo) · [Selección de referencias de marca](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md) · [elenco §7](../../operations/brand-photography/EFEONCE_BRAND_CAST_V1.md)
