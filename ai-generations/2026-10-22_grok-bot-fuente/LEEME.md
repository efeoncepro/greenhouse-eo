# Grok Bot (xAI) — fuente oficial · 2026-10-22

Primer paso del [método de bibliotecas de poses 3D](../../.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md)
(antes: Clawd, Codex, Gigi). **Aquí no hay nada generado con IA**: sólo material oficial y renders determinísticos
de sus propios SVG. Todavía no se copió a OneDrive ni se commiteó.

## 1. Qué es «Grok Bot»

**Grok Bot** es el producto de agentes persistentes de xAI (lanzado el **11-08-2026**, Mac/iOS y web, acceso
anticipado para suscriptores de pago). Su mascota **no es un personaje ilustrado ni de campaña**: es el **avatar
del propio bot**, un ícono **dibujado en código** —«un circulito con dos ojos»— que cambia de forma, color y
expresión según el estado del agente. Lo diseñó y animó **Benji Taylor, head of design de X y SpaceXSI**, con
Grok Build (sus posts del 11-08 y 29-08-2026). Cada usuario elige color y forma de cada bot.

Verificado: producto, fecha, autor, que es código (no ilustración), las 8 formas, la paleta y los 6 estados (todo
en la página oficial y en el video del autor). Inferido: que el nombre «Grok Bot» en el pedido se refiere a este
avatar (no hay otra mascota de xAI con ese nombre; los «Companions» —Ani, Rudy— son otra cosa y se retiraron en
2026).

> La página oficial firma como **SpaceXSI** y Benji se presenta como head of design de @spacexsi: xAI aparece con
> esa marca en 2026. No se investigó más allá; confirmar el nombre de la empresa antes de usarlo en copy.

## 2. De dónde salió cada archivo

| Archivo | Origen |
|---|---|
| `fuente/grok-bot-icono-animado-benji-taylor-2026-08-11-1458.mp4` | Video del autor, 1458×1458, 60 fps, 30,75 s. Post [x.com/benjitaylor/status/2087227155076046995](https://x.com/benjitaylor/status/2087227155076046995); archivo `video.twimg.com/amplify_video/2087226908824236032/…` obtenido vía `api.fxtwitter.com`. **La fuente principal** (equivale al spritesheet de Codex). |
| `cuadros/grok-bot-video-01…14-*.png` | Cuadros clave del video (ffmpeg, 1 fps; `cuadros/video-benji/` tiene los 31). |
| `fuente/grok-bot-hoja-8-formas-x-ai-designing-3x.png` | **Hoja de modelo oficial**: las 8 formas, de [x.ai/news/designing-grok-bot](https://x.ai/news/designing-grok-bot) (3-09-2026), capturada a 3× con Playwright. |
| `fuente/formas-svg-oficial/*.svg` + `-2048.png` | El SVG **exacto** de cada forma, tomado del DOM ya animado por el JS oficial de esa página (los ojos sólo tienen trazo en runtime) y pintado con las 3 reglas del CSS oficial del módulo (`head: fill var(--fg)`, `eye: fill var(--bg)`). PNG 2048, fondo transparente. Script `brief/render-svg.cjs`. |
| `fuente/estados-svg-oficial/*` | Igual, para los 6 estados del «Avatar motion system» de la misma página (en negro tinta). |
| `fuente/grok-bot-xai-designing-og.png`, `…-introducing-og.png` | Imágenes OG oficiales de las dos notas (`x.ai/images/news/…`). La segunda trae el lockup «Grok Bot» con el bot blanco. |
| `fuente/grok-bot-exploraciones-de-estilo-x-ai-descartadas.png` | Exploraciones de estilo **descartadas** por xAI (caras, clay, pixel art). Contexto, **no** referencia de identidad. |
| `brief/` | HTML/texto de las páginas, SVG crudos, CSS, scripts y capturas intermedias. `brief/descartado-svg-estatico-sin-ojos/` = primer render desde el HTML estático (sin ojos): no usar; se puede borrar. |

## 3. Anatomía medida (del SVG oficial, no de memoria)

| | |
|---|---|
| **Cuerpo** | Una sola silueta plana y llena, sin contorno, sin brillo, sin extremidades, sin boca. Por defecto un **círculo** (diámetro 228,5 u. en un viewBox de 259). Ocho formas oficiales: círculo, huevo/blob, squircle, píldora, triángulo redondeado, hexágono redondeado, nube, gota. |
| **Ojos** | **Dos cápsulas** del color del fondo (la cara es un recorte: `#F5F5F5` sobre la UI clara). En reposo, cada cápsula mide ≈ 20 % del diámetro de largo y ≈ 6 % de ancho, **inclinadas ~25° («\\»)** y ubicadas en el **cuadrante superior derecho** (centros en x ≈ 60 % y 81 %, y ≈ 30 % y 25 %), la derecha más alta: el bot «mira arriba a la derecha». Separación ≈ 22 % del diámetro. |
| **Expresión** | La expresión es sólo ojos + forma: reposo (cápsulas inclinadas), trabajando (cápsulas verticales al centro), esperando (guiones horizontales con estelas de color), entrecerrados, ojos grandes de frente, ojos redondos, guiño; **bloqueado = el cuerpo se vuelve «!»**, **pensando = tres puntos**, **listo = arcos de color orbitando** (rosa, violeta, verde, amarillo, cian). Aviso = punto azul en el borde. |
| **«Giro»** | No hay vistas de perfil ni espalda: es un ícono 2D. El código aplica `perspective + rotateX/rotateY` y desplaza los ojos para sugerir giro. |
| **Paleta** (`--fg` de los SVG) | azul `#1084FE` · naranja `#FF6700` · turquesa `#00BCA6` · rojo `#FF263C` · rosa `#FF309B` · violeta `#9159FE` · ámbar `#FF9800` · café `#97683D` · verde `#00C972` · gris `#A3A3A3` · tinta `#09090B` (muestreado del video) · ojos `#F5F5F5`. |

## 4. Material 3D propuesto

Anatomía **blanda y redondeada** → **vinilo suave**, como Codex, pero más simple: el círculo pasa a **esfera de
vinilo mate**, color plano sin degradado; los ojos como **cápsulas a ras, blancas y satinadas** (no pintura sobre
la superficie, sino incrustación). La personalidad está en la posición y la inclinación de los ojos, así que el
prompt debe fijarlas con los números de §3. Las otras siete formas, como cuerpos extruidos de bordes muy
redondeados («fichas» gruesas), no como esferas. Color por defecto para la serie: **tinta `#09090B`** (el del
autor y del motion system) o el **azul `#1084FE`** del lockup; decidirlo en el canvas.

## 5. Límites de marca

- [xAI Brand Guidelines](https://x.ai/legal/brand-guidelines) (14-02-2025): xAI es dueña de «xAI», «Grok», sus
  combinaciones y logos; no usar las marcas de forma que sugiera respaldo o relación, ni crear marcas nuevas junto
  a las suyas; **antes de mencionarlos en materiales de prensa, escribir a legal@x.ai**. La guía no menciona al
  avatar de Grok Bot; es arte de xAI igual.
- Igual que con Clawd/Codex: interpretación 3D para exploración y orgánico aprobado; validar con xAI antes de pautar.

## 6. Huecos y dudas

- El **video de lanzamiento** de [x.ai/news/introducing-grok-bot](https://x.ai/news/introducing-grok-bot)
  (`media.x.ai/v1/website/260810_2245_bw_dr_cursor_bot_edit_v8-…mp4`) lo bloquea Cloudflare a `curl` (403); se
  baja desde un navegador si hace falta.
- No existe vista de espalda ni de perfil oficial: habrá que inventarlas en 3D (para una esfera lisa, la espalda es
  la esfera sin ojos).
- El render del estado «done» recorta los arcos fuera del viewBox; el cuadro 12/13 del video los muestra completos.
- Existen recreaciones de la comunidad en GitHub (`grokbot`, `grokhead`, `grokbot-animation`): **no son fuente**.
