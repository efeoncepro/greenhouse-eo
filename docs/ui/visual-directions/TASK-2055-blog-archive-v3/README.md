# Archivo del blog v3 — direcciones visuales (TASK-2055)

> Estado: **dirección D (Órbita + Índice) APROBADA por el operador** (2026-10-24, canvas v75: «Bien, me parece todo»). Implementación: TASK-2055.

## Dónde verlas

En el mismo canvas de la portada, para que el archivo nazca del mismo sistema:
«Portada Blog Efeonce» (`https://claude.ai/artifact/SmmJZC39UTJ9m6PD5x7tui`), página **«Archivo del blog ·
direcciones»** (versión 71 del canvas). Las páginas v3/v2/v1 de la portada no se tocaron.

Copia congelada: `direcciones-2026-10-24.tar.gz` (los tres tableros `Archivo-{A,B,C}.dc.html`, el generador
`gen_directions.py` y el CSS de la portada que reutiliza). Empaquetado para que Tailwind no escanee el marcado.

## Qué comparten las tres

- **Mismo vocabulario que la portada v3, valores literales:** el CSS base, el riel (`.card`), las filas del archivo
  (`.arch-row`), los botones v4 (`.ab`, `.nl`, `.roll`/`.ax`), los chips, el segmentado y el buscador con haz (`.sf`,
  `.beamsvg`) se copian del tablero `Portada-v3` (líneas de `portada.css` citadas en el generador). Lo nuevo (migas,
  chips con cantidad y estado activo, paginación, cifras, tarjeta de grilla, alcance del buscador) usa sólo colores,
  radios, tipos y curvas que ya están en la portada.
- **Datos reales** del tema HubSpot leídos de efeoncepro.com el 2026-10-24: 12 entradas, sus formatos (`eo_format`:
  4 artículos, 4 guías, 2 casos, 2 novedades), minutos de lectura con la regla del sitio
  (`EO_CM_Util::reading_minutes`, 200 palabras por minuto), sus imágenes destacadas actuales y la participación del
  tema (12 de 44, 27 %). Las portadas son las que tienen hoy los artículos (muchas, de la línea antigua): el diseño
  tiene que verse bien con ellas.
- **Descripción del tema:** ningún tema tiene descripción en WordPress hoy. Va como marcador visible porque la regla
  de indexación depende de ella (tema indexable sólo con descripción y ≥ N entradas).
- Header y footer canónicos del sitio, dibujados sólo como reserva de lugar (mismo desvío 1 de la portada).
- Un H1 por vista, migas en español, filtros por formato, paginación, cierre con «Otros temas del blog».

## Las tres direcciones

| | A · Índice | B · Órbita | C · Buscador |
|---|---|---|---|
| Idea | El archivo por año de la portada convertido en página: tipográfico, denso, para escanear. | La órbita de temas convertida en cabecera: el tema en su color sobre navy y una grilla de tarjetas del riel. | El tema es una búsqueda acotada: el buscador de «Pregúntale al blog» con el tema como alcance, tres recientes en tarjetas y el resto en lista. |
| Cabecera | Clara (`#f7f8f6`), nombre en Bricolage 184 px, tres cifras (publicaciones, %, lo último). | Oscura (`#001a33`), nombre en el color del tema, arco de participación a la derecha. | Clara, nombre a 120 px, buscador con chip «En HubSpot ×» y tarjeta tipográfica «12 lecturas». |
| Resultados | Filas `.arch-row` agrupadas por año, año gigante fijo a la izquierda. | Grilla de tarjetas: la primera ancha con imagen; guías como tarjeta de minutos; novedades tipográficas. | 3 tarjetas del riel + filas `.arch-row` con año en la fecha. |
| Depende de imágenes | No. | Sí (mitigado con tarjetas tipográficas). | Poco (sólo las 3 recientes). |
| Búsqueda (`?s=`) | Cabecera con el término y el campo editable; mismas filas. | Cabecera oscura con el término; misma grilla. | Natural: es la misma vista sin alcance. |
| Riesgo | Menos impacto visual en temas con pocas entradas. | Más peso y más alto de página; portadas antiguas muy visibles. | Dos patrones de resultado en una página. |

## Dirección D · Órbita + Índice (elegida por el operador para desarrollar, 2026-10-24)

Recomendación aceptada por el operador: **cabecera oscura de B + una pieza destacada + filas de A + cierre «Otros
temas» en navy** (la página empieza y termina oscura, el contenido claro al medio, como el ritmo de la portada). De C
sólo queda el buscador para la vista de búsqueda. Página «Archivo del blog · D · Órbita + Índice» del canvas
(versión 75), seis vistas a 1440 y 390; capturas de revisión en `capturas/`.

| Vista | Cabecera | Destacada | Lista |
|---|---|---|---|
| Tema (HubSpot) | Nombre en el color del tema, descripción y ficha corta (publicaciones, la última); debajo, barra de formato con el segmentado de la portada | «Lo más reciente» | Por año, año gigante fijo; fila sin tema |
| Etiqueta (inbound) | Nombre en blanco, una línea de contexto, cifras y formatos | «Lo más reciente» | Por año; la fila muestra el tema |
| Autor (Julio Reyes) | Foto del perfil con anillo, nombre, cargo y bio de WordPress, cifras y formatos | «Lo último de Julio» | Por año; tema o logo de Glitch |
| Búsqueda («Inbound») | Término entre comillas, buscador editable con haz, «19 resultados», formatos | «Mejor resultado» | Por relevancia, fecha completa, término resaltado |
| Tema vacío (Redes Sociales) | Copy del tema vacío y enlace al tema que lo contiene | — | «Mientras tanto»: último Glitch + una guía + un artículo |
| Búsqueda sin resultados («metaverso») | «Nada sobre «metaverso», todavía.», buscador, preguntas frecuentes como chips, el Spark | — | «Mientras tanto, para empezar» |

Decisiones tomadas con el operador en esta ronda:

- **Portada de sección** (3.er comentario del operador, «¿cómo la mejorarías?», v75): la publicación destacada sube a la cabecera como tarjeta blanca montada sobre el borde navy/blanco (imagen 16:9 o 4:3 según la portada), las cifras quedan en una fila bajo la descripción, el filtro de formato va alineado a la izquierda bajo el texto y desaparece la banda «Lo más reciente». Descripción de HubSpot propuesta (pendiente de aprobación como texto de WordPress): «Cómo usamos HubSpot para ordenar ventas, marketing y servicio: casos reales, guías paso a paso y lo que aprendimos implementándolo.»
- **Cabecera tipográfica con ficha corta** (2.º comentario del operador sobre B, «no me gusta cómo se ve»): sin número gigante ni chips en la cabecera; ficha de dos cifras con filetes (valores del bloque de eventos de la portada) y filtro por formato en una barra propia con `.segc` (en móvil, chips deslizables). No se usa un anillo decorativo: la línea gráfica prohíbe la órbita como adorno.
- **Sin porcentaje del tema** (comentario del operador sobre B): en una página de tema no le dice nada al lector. Se
  reemplaza por la cantidad, la fecha de lo último y el desglose por formato, que además filtra.
- **«Publicaciones», no «lecturas» ni «artículos»:** «Artículos» es un formato (filtro) y «lecturas» no nombra bien
  guías, casos ni Glitch. Es el término que ya usa el archivo de la portada («Todo el archivo · 44 publicaciones»).
  La órbita de la portada sigue diciendo «lecturas»: alinear es decisión aparte.
- **La destacada se adapta a la forma de la imagen:** las portadas cuadradas (casi todas las antiguas) van en el panel
  casi cuadrado; las 16:9 (ANAM, banners de Glitch) en un panel 16:9 más ancho, para no recortar el texto que llevan
  dentro. En «Mientras tanto» la tarjeta de Glitch lleva la imagen arriba.
- Paleta de líneas según `EO_CM_Util::TOPICS` tras el cambio del 2026-10-24 (inbound magenta, IA azul, novedades
  turquesa); en implementación, `line_of()` + `palette_for()` (resolvedor de la sesión de Analytics).
- «Mientras tanto, para empezar» y no «lo más leído»: no medimos lecturas por entrada en el sitio.

Revisión visual local (renderizador del gate de la portada + Playwright): 12 tableros sin desborde
(`scrollWidth === clientWidth`) y sin imágenes rotas. Aprobada el 2026-10-24; implementación en TASK-2055.

## Variante Glitch del tema — PROPUESTA (2026-10-24, canvas versión 79)

Pedido del operador: «solo en esta, el mismo diseño pero más Glitch, más sus elementos gráficos»; y luego «no te vayas a
todo gigante, que gigante no es necesariamente elegante o premium». Sólo para `/category/glitch/` (= `/glitch/`, el
archivo del newsletter). Tableros «Tema · Glitch (variante, propuesta)» a 1440 y 390 en la página D, a la derecha de las
seis vistas. Fuente y generador en `variante-glitch-2026-10-24.tar.gz` (`gen_glitch.py` sobre `gen_d.py`, empaquetado
porque Tailwind escanea los archivos de texto del repo); capturas `capturas/variante-glitch-{1440,390}.jpg`. Valores de
[GLITCH_GRAPHIC_LINE_V1](../../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md).

| # | Elemento | Cómo quedó |
|---|---|---|
| 1 | Título | Wordmark oficial negativo (430 px a 1440, 230 px a 390); su manzana es la única esfera de la página |
| 2 | Cifras | Cabecera de Glitch: «EDICIÓN / #17» (# en 300 blanco, número en 800 condensado verde) y «NO ESPERA AL LUNES / estela + FLASH» (asset del token), a 52 px |
| 3 | Muletilla | «sin anestesia.» en Guttery verde, rotada −4°, cerrando la descripción |
| 4 | Falla en bytes | Celdas navy de 8 px que caen del borde inferior del bloque oscuro (60 px, determinista). **Uso nuevo de la falla: requiere el visto bueno del operador** |
| 5 | Filas | Placa navy «#17» en la columna de fecha (el verde nunca va sobre blanco); el prefijo «Glitch #N:» sale del título porque la placa lo dice; las notas quedan sin placa. Filtro Ediciones 7 · Flash 1 · Notas 2 |
| 6 | Suscripción | Banner navy tras la lista: «Ocho noticias cada lunes, / con punto de vista.» (contraste de pesos), muletilla «nos vemos el lunes.», textura de bytes verde en la esquina y la **misma píldora que se transforma de la portada**, en blanco con el logo: «Suscríbete a [logo de Glitch]» (versión 79, pedido del operador; en verde la manzana del logo desaparece). Implementarlo pide un rótulo con logo y tono blanco en el renderer `inline_pill`; si se aprueba, la portada se alinea igual. Es el mismo `<greenhouse-form>` `inline_pill` y el mismo formulario de suscripción a Glitch ya en producción en `/blog/`, con su aviso de privacidad; si el formulario no está conectado, el banner se oculta |

Escala contenida tras el comentario del operador (versión 77): wordmark de 620 a 430 px, cifras de 84 a 52 px, titular
del banner de 64 a 46 px, borde de bytes de 96 a 60 px. Revisión local: sin desborde a 1440 ni a 390, un H1, Guttery
cargada. Datos reales del 2026-10-24. Sin código: espera la aprobación del operador.
