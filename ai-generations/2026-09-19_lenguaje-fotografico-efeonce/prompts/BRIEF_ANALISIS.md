# Brief común — Lenguaje fotográfico premium de Efeonce (análisis, 2026-09-19)

## Objetivo del operador (textual, resumido)
- Que una foto, incluso por su colorimetría, se sienta de Efeonce (agencia).
- Debe verse PREMIUM, sofisticada, moderna, "agencia A1 de clase mundial", coherente con cómo se vende Efeonce.
- Firma: un leve desenfoque de un elemento en primer plano entre cámara y foco, PLANEADO desde la toma (no forzado ni añadido), donde siempre va el logo centrado.
- La colorimetría NO es "vestir a la gente de navy".
- Le gusta: el color natural (sin grade añadido), el "set tonal" (T3, sala verde bosque monocromática), y el estilo de color/limpieza de los sets y oficinas de los podcasts de marketing de EE. UU.
- Nueva exigencia: el sistema debe funcionar (a) cuando el equipo usa uniforme de marca y otros no, (b) cuando nadie usa nada de marca, (c) sin personas (objetos, espacios, producto, 3D, still life).

## Paleta de marca Efeonce (SSOT: .claude/skills/content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md §2)
Azules profundos: tinta #022A4E, navy #023C70, azul medio #024C8F, azul activo #0375DB · naranja de energía #F55D01 ·
plomo oscuro #263448, plomo medio #505964/#515150, blanco. Secundarios: verde #6EC207, teal #12AFA2, magenta #BB1954,
púrpura #633F93, gris #DBDBDB. Líneas: Reach #ff6500, Globe #bb1954, Wave #0375db. Eslogan gris #848484.
Navy #023C70 = Lab L25 a+5 b−34,7 h278 (verificado).

## Uniforme / vestuario (decidido por el operador, ver .claude/skills/efeonce-brand-studio/SKILL.md §Vestuario)
Frente a cliente: polo piqué navy #023c70 con emblema bordado. Formal: camisa blanca + softshell/blazer navy.
Evento: polera navy. Producción: hoodie, polera royal, gorra. Kits en OneDrive 13- Branding.

## Imágenes de prueba (todas GPT Image 2.5 Flare, 1152x1440). Carpeta base:
/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/143a7f51-4687-4d67-bb4f-c8a2abcf7cd9/scratchpad/look/
- ejemplos/ej1-retrato-oficio-raw.png, ejemplos/ej2-mesa-trabajo-raw.png — ronda 1 (navy en ropa, color natural). Al operador le gustaron más sin grade.
- asiento/A2-mesa-plate.png, asiento/B-silla-plate.png, asiento/C2-escritorio-plate.png — ronda "asiento en la mesa" (navy en ropa). Operador: "va por allí pero en colorido... el navy en ropa no es la colorimetría".
- territorios/T1b-galeria-plate.png (luz de galería, cálido claro), territorios/T2-sombra-plate.png (claroscuro), territorios/T3-tonal-plate.png (set verde tonal) — operador eligió T3 como la que más captura.
- paleta/P1-tinta-plate.png (sala muros azul tinta + acento naranja), paleta/P2-podcast-plate.png (set podcast azul), paleta/P3-claro-plate.png (oficina clara + sofá azul) — última ronda. Mi lectura: el azul salió más saturado/brillante que el tinta pedido.
- Versiones con logo compuesto: mismos nombres con -firmada.png.
- Prompts exactos: asiento/batch*.json, territorios/batch*.json, paleta/batch.json, ejemplos/batch.json.

## Herramientas locales
- sharp disponible: /Users/jreye/Documents/greenhouse-eo/node_modules/sharp (usar require con esa ruta).
- asiento/medir.mjs <img> '<json boxes fracciones>' → gradiente Sobel (nitidez) por caja.
- asiento/firmar.mjs → firma logo centrado, elige color por contraste.
- look/efeonce-look.mjs check <img> → métricas Lab (sombras, altas luces, croma, acento). Umbrales son de una propuesta V1 ya descartada en parte; úsalas como instrumento, no como verdad.

## Reglas vigentes que no se discuten
- Logo = SVG oficial compuesto después (nunca generado), centrado, una vez, contraste ≥ 4,5:1, sobre lecho desenfocado.
- Regla de marca en escena y los 5 soportes rechazados: .claude/skills/social-media-studio/references/brand-in-scene.md (§Primer plano desenfocado).
- Specs de cámara en prompt se interpretan de forma laxa (greenhouse-ai-image-generator).
- Nada de esto está aprobado; es análisis para decidir.
