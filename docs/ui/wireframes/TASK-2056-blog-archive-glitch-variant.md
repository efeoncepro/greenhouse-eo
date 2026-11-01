# TASK-2056 — Archivo del blog: variante Glitch del tema · wireframe

> Fuente visual aprobada: tableros «Tema · Glitch (variante, propuesta)» a 1440 y 390 del canvas «Portada Blog Efeonce»
> (`https://claude.ai/artifact/SmmJZC39UTJ9m6PD5x7tui`, página «Archivo del blog · D · Órbita + Índice», versión 79),
> aprobados por el operador el 2026-10-24 («No, implementemos Glitch así entonces»). Copia congelada, generador y
> capturas: `docs/ui/visual-directions/TASK-2055-blog-archive-v3/` (`variante-glitch-2026-10-24.tar.gz`,
> `capturas/variante-glitch-{1440,390}.jpg`). Valores de la línea: `GLITCH_GRAPHIC_LINE_V1` y el token `glitchLine`.
> Este wireframe describe regiones, datos y copy; los valores visuales salen del canvas.

## Superficie

| Vista | Ruta | Tablero 1440 / 390 |
|---|---|---|
| Tema Glitch | `/category/glitch/`, `/glitch/` (misma consulta; canonical a `/category/glitch/`), `…/page/N/`, `?formato=` | `Archivo-D-tema-glitch-*` |

Mismo esqueleto que la vista «tema» de TASK-2055: header y footer canónicos, cabecera navy con la destacada montada,
filtro, lista por año, «Otros temas del blog». Lo que cambia está abajo; todo lo demás es la vista «tema».

## Regiones (de arriba abajo)

```text
┌─ header canónico del sitio ─────────────────────────────────────────────────────────────┐
├─ CABECERA navy (archive-head) ──────────────────────────────────────────────────────────┤
│ Inicio / Blog / Temas / Glitch                                                          │
│ ▬ EL NEWSLETTER DE EFEONCE                                   ┌──────────────────────┐   │
│ [wordmark Glitch negativo, 430 px · H1 alt="Glitch"]          │ portada del último    │   │
│ El resumen semanal de Efeonce … qué hacer con eso,            │ post (16:9 o 4:3)     │   │
│   sin anestesia.  ← Guttery verde, −4°                        │ LO MÁS RECIENTE       │   │
│ ┌ EDICIÓN ─────────┬ NO ESPERA AL LUNES ──────┐               │ ▬ Glitch  Flash       │   │
│ │ #17              │ [estela] FLASH            │               │ título · min · fecha  │   │
│ │ la última, 28 jul│ el último, 28 sep 2026    │               └──────────────────────┘   │
│ └──────────────────┴───────────────────────────┘                                         │
├─ borde: falla en bytes (celdas navy que caen sobre el blanco, 60 px; 44 px en 390) ───────┤
├─ FILTRO (archive-filter): Todo 10 · Ediciones 7 · Flash 3 ───────────────────────────────┤
├─ LISTA (archive-list): 2026 · 10 publicaciones en Glitch                                  │
│   [#17]  Agente rompe la jaula, …                                 Edición · 10 min  →     │
│   28 jul                                                                                  │
│   10 jul  GPT-5.6 y ChatGPT Work: …  (estela + FLASH)             Flash · 6 min     →     │
│   «Mostrando las 10 publicaciones» (sin paginador cuando cabe en una página)              │
├─ BANNER navy (archive-subscribe) ────────────────────────────────────────────────────────┤
│ ▬ SUSCRÍBETE                                   nos vemos el lunes.  ← Guttery verde       │
│ Ocho noticias cada lunes,   (Bricolage 300)    [ Suscríbete a [logo Glitch]  → ]  blanca  │
│ con punto de vista.         (800 condensado verde)  Al suscribirte aceptas la política…  │
│ Lo que cambió en IA, marketing y tecnología…    textura de bytes verde en la esquina     │
├─ OTROS TEMAS navy (archive-topics), sin Glitch ──────────────────────────────────────────┤
└─ footer canónico ────────────────────────────────────────────────────────────────────────┘
```

En 390: cabecera en una columna (wordmark 230 px, cifras en dos columnas, la destacada debajo), filas con la placa y la
fecha en una línea, banner en una columna con la píldora a todo el ancho.

## Datos

| Hueco | Fuente | Regla |
|---|---|---|
| Wordmark | `assets/img` del plugin (`glitch` negativo) | imagen con `alt="Glitch"` dentro del H1 |
| Descripción + muletilla | descripción de la categoría | si termina en «, sin anestesia.», se separa: el texto queda hasta «eso,» y «sin anestesia.» va en Guttery; si no, sin muletilla |
| Edición | post de formato edición con el mayor número «Glitch #N» publicado | número sin ceros a la izquierda en la cabecera; la fecha corta «28 jul 2026» |
| Flash | post de formato Flash más reciente | fecha corta; sin Flash, la celda no se pinta |
| Placa de fila | subformato + número del título | edición `#N` tal como se publicó (`#02`); Flash estela + FLASH (todo Glitch sin número es Flash desde el 2026-10-24; antes «nota sin placa»); edición sin número reconocible → como nota |
| Título de fila | título publicado | sin el prefijo «Glitch #N:», con la primera letra en mayúscula |
| Filtro | cuentas por subformato | `?formato=edicion|flash` (mismo mecanismo de TASK-2055) |
| Banner | `subscribe` del adaptador de la portada | se pinta sólo con `live`; píldora `<greenhouse-form>` con `inline-label-logo` |

## Copy (es-CL, tuteo)

| Id | Texto |
|---|---|
| `gl.eyebrow` | El newsletter de Efeonce |
| `gl.edition.label` | Edición |
| `gl.edition.sub` | la última, {fecha} |
| `gl.flash.label` | No espera al lunes |
| `gl.flash.sub` | el último, {fecha} |
| `gl.sub.eyebrow` | Suscríbete |
| `gl.sub.title` | Ocho noticias cada lunes, / con punto de vista. |
| `gl.sub.body` | Lo que cambió en IA, marketing y tecnología, y qué hacer con eso. Cada lunes en tu correo, gratis. |
| `gl.sub.mul` | nos vemos el lunes. |
| píldora | textos del formulario de Glitch (Growth Forms): «Suscríbete a Glitch» / «Suscribirme» / «¡Listo!» / «Ya estás suscrito a Glitch» y su aviso |
| filtro | Ediciones · Flash |

## Accesibilidad

- Un H1: la imagen del wordmark con `alt="Glitch"`.
- Las cifras llevan `aria-label` legible («Edición 17»); la estela es decorativa (`alt=""`).
- El borde de bytes y la textura son `aria-hidden`.
- La píldora conserva el nombre accesible «Suscríbete a Glitch» aunque el rótulo muestre el logo.
- Contraste: verde sólo sobre navy; sobre blanco, las placas son bloques navy.

## Responsive

- Tableros 1440 y 390; fluido de 320 a 1920 sin scroll horizontal (gate de desborde).
- El borde de bytes se recorta al centro (`xMidYMin slice`): las celdas siguen cuadradas en cualquier ancho.
