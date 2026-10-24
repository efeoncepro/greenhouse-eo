# Archivo del blog v3 — direcciones visuales (TASK-2055)

> Estado: **dirección D (Órbita + Índice) en revisión del operador** (2026-10-24). Sin aprobar todavía; no se escribe código
> de la plantilla hasta que el operador elija y apruebe el canvas final.

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
(versión 74), seis vistas a 1440 y 390; capturas de revisión en `capturas/`.

| Vista | Cabecera | Destacada | Lista |
|---|---|---|---|
| Tema (HubSpot) | Nombre en el color del tema, descripción y ficha corta (publicaciones, la última); debajo, barra de formato con el segmentado de la portada | «Lo más reciente» | Por año, año gigante fijo; fila sin tema |
| Etiqueta (inbound) | Nombre en blanco, una línea de contexto, cifras y formatos | «Lo más reciente» | Por año; la fila muestra el tema |
| Autor (Julio Reyes) | Foto del perfil con anillo, nombre, cargo y bio de WordPress, cifras y formatos | «Lo último de Julio» | Por año; tema o logo de Glitch |
| Búsqueda («Inbound») | Término entre comillas, buscador editable con haz, «19 resultados», formatos | «Mejor resultado» | Por relevancia, fecha completa, término resaltado |
| Tema vacío (Redes Sociales) | Copy del tema vacío y enlace al tema que lo contiene | — | «Mientras tanto»: último Glitch + una guía + un artículo |
| Búsqueda sin resultados («metaverso») | «Nada sobre «metaverso», todavía.», buscador, preguntas frecuentes como chips, el Spark | — | «Mientras tanto, para empezar» |

Decisiones tomadas con el operador en esta ronda:

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
(`scrollWidth === clientWidth`) y sin imágenes rotas. Pendiente: aprobación del operador del canvas D antes de
escribir la plantilla.
