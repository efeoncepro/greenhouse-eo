# Archivo del blog v3 — direcciones visuales (TASK-2055)

> Estado: **tres direcciones en revisión del operador** (2026-10-24). Ninguna aprobada todavía; no se escribe código
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

Las variantes de etiqueta (`noindex`), autor (foto y bio del perfil, como la portada) y búsqueda (campo editable,
`noindex, follow`) se diseñan sobre la dirección elegida, a 1440 y 390, antes de implementar.
