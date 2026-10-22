# Navegación global del sitio público V1

Estado: **Mecanismo AXIS construido (`TASK-2040`, 2026-10-22, sin publicar) · plugin y puesta en el sitio pendientes**

Dueño: Sitio público / WordPress + AXIS

Decisión: [PDR-027 — Navegación global del sitio, portable entre sitios](../../public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md)

Programa: [EPIC-055](../../epics/to-do/EPIC-055-public-site-global-navigation.md)

Diseño aprobado: canvas «Mega menú efeoncepro.com» —
[claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj](https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj), versión 67 al 2026-10-18.
Sus notas «Cómo se comporta», «Accesible y medible», «Un solo menú, siete anchos», «Movimiento», «Cómo se
construye» y «Agendar desde el menú» son la especificación de comportamiento. Este documento las fija como contrato
técnico.

Runtimes: `efeoncepro.com` (WordPress/Kinsta, tema `ohio-child`, repo `efeoncepro/efeonce-public-site-runtime`) y,
cuando se pida, `think.efeoncepro.com` (Astro, repo `efeonce-think`).

## Propósito

Define cómo se construye una navegación global del sitio que:

1. reemplaza el encabezado del tema Ohio en `efeoncepro.com`;
2. se escribe **una vez** como mecanismo portable en AXIS;
3. se alimenta de **un solo documento de datos**, que editan personas desde WordPress y agentes por comandos;
4. puede usarse en Think u otro sitio con un adaptador delgado, sin reescribir comportamiento ni contenido.

Este documento no autoriza por sí solo una mutación de WordPress, un release del runtime ni una publicación de AXIS.
Cada fase lo hace dentro de su tarea, con sus gates.

## Capas y fronteras

```text
              AXIS (repo axis-design-system)
   ┌──────────────────────────────────────────────────────┐
   │ contrato efeonce.site-nav + esquema site-nav.v1      │
   │ primitive @efeoncepro/axis-ui-primitives/site-nav    │
   │   · render HTML de servidor (función pura)           │
   │   · site-nav.css (tokens AXIS, receta de vidrio)     │
   │   · site-nav.js (mejora progresiva, sin framework)   │
   │ Lab: /patterns/efeonce.site-nav/                     │
   └──────────────────────────────────────────────────────┘
          ▲ versión fijada, copiada (PDR-024)        ▲ versión fijada
          │                                          │
 WordPress (efeonce-public-site-runtime)      Think (efeonce-think), más adelante
 ┌──────────────────────────────────┐        ┌──────────────────────────────┐
 │ plugin «EO Navegación»           │ JSON   │ envoltura Astro              │
 │   · documento site-nav.v1        │───────▶│   · lee la copia pública     │
 │   · admin · WP-CLI · revisiones  │ público│   · su propio CTA del        │
 │   · copia pública                │        │     agendador                │
 │ adaptador de encabezado          │        └──────────────────────────────┘
 │   (ohio-child)                   │
 └──────────────────────────────────┘
          ▲ URLs de fotos
 gs://efeonce-group-axis-public-media/site-nav/v<N>/
```

| Capa | Responsabilidad | No hace |
|---|---|---|
| Contrato y esquema (AXIS) | Estructura del documento, estados, roles ARIA, eventos que emite y tokens que consume. | No guarda contenido ni sabe de WordPress. |
| Primitive (AXIS) | Pinta el menú desde un documento válido y le agrega comportamiento: hover con intención, teclado, foco, scroll, onepage y movimiento reducido. | No pide datos a la red y no conoce el agendador; sólo expone el hueco del CTA. |
| Plugin (WordPress) | Fuente de verdad del documento: validación, revisiones, admin, WP-CLI y copia pública. | No pinta el menú ni sube fotos a GCP. |
| Adaptador (cada sitio) | Lee el documento, llama al render de AXIS, monta el CTA de su superficie, decide en qué páginas aplica y apaga el encabezado anterior. | No duplica la lógica del primitive. |

Precedente directo: `EfeonceMention` (contrato `efeonce.mention`, `@efeoncepro/axis-ui-primitives` ≥ 0.6.9), con
copia exacta del CSS en WordPress y envoltura Astro en Think. Ver [PRIMITIVES.md](PRIMITIVES.md).

## Superficies y estados

### Cabecera

| Estado | Comportamiento | Alto |
|---|---|---|
| Arriba | Transparente sobre el hero. Cápsula y botón de vidrio. El hero sube hasta el borde. | 96 px |
| Bajando | Se oculta para no tapar la lectura. | — |
| Subiendo | Vuelve como una **isla de vidrio flotante** centrada, a 12 px del borde, que cambia de tono según la sección que tiene debajo (§Isla de vidrio). Reemplaza la barra navy sólida, aprobado por el operador el 2026-10-18. | isla de 61 px |

Contenido de la cabecera de escritorio, de izquierda a derecha:

1. **Hamburguesa:** convive con la cápsula en escritorio, según la «Opción 2» del operador del 2026-10-17.
2. **Logo:** 164 px de ancho arriba y 128 px en la isla de la cabecera fija.
3. **Cápsula:** Inicio, Nosotros ▾, Soluciones ▾, Recursos ▾ y Contacto.
4. **Botón «Agenda tu diagnóstico».**

Las flechas avisan qué abre algo; Inicio y Contacto son enlaces directos.

### Mega menú «Soluciones»

- **Panel:** un rectángulo redondeado flotante que cae como cortina desde el botón y oscurece el fondo.
- **Columnas:**
  - Izquierda: líneas de servicio (Growth, Brand, Engine, Voice, Revenue).
  - Centro: servicios de la línea activa.
  - Derecha: foto, respuesta y caso de la línea o del servicio con foco.
  - Franja inferior al final.
- **«Estás aquí»:** dentro de una landing, el panel abre en su línea y lo marca con un anillo fino en el acento de la
  línea, más un borde interior suave en la tarjeta.
- **Respuestas por servicio:** aprobadas el 2026-10-17 (Ciclo a ciclo, Con datos, Primer paso, A escala, Cada semana,
  A diario, Los correctos, Sin fricción, Arriba, Citado, Por resultado, Bien usado, Sin perseguir).
- **Esferas:** dos en el panel (titular y respuesta), como excepción aprobada el 2026-10-18 que no se extiende a otras
  piezas.

### Mega menú «Recursos» (editorial)

- **Mismo panel** que Soluciones.
- **Columnas:**
  - Izquierda: formatos (Glitch, Marketing con Manzanitas, Herramientas, Guías descargables).
  - Centro: lo último de ese formato.
  - Derecha: un destacado.
- **Franja inferior:** invita a suscribirse a Glitch y lleva a **la suscripción del blog**, que es la misma lista que
  Glitch (decisión del operador, 2026-10-20; se recibe Glitch cada lunes). El menú no tiene formulario ni lista propia:
  su destino es un enlace del documento: `strip.cta` del panel editorial, con `action: "link"` y `fallbackHref`.
  Apunta a `/blog/` hasta que el hub del blog (`TASK-1802`) publique un ancla estable para su banda de suscripción; no
  se inventa un `#id`. Lo fija `TASK-2041`. Fuente de la
  decisión: `TASK-1802` (Delta 2026-10-20).
- **Glitch** se nombra con su logo oficial negativo de AXIS. El resto de su línea gráfica no entra al menú.
- **Esfera:** una sola por panel, en el acento de Growth.
- **Contenido dinámico:** según el formato, la lista y a veces el destacado siguen a los últimos posts (§Datos dinámicos).

### Desplegable «Nosotros»

Una tarjeta de 360 px bajo el botón, con tres destinos: Quiénes somos, Partners y Portafolio. Usa la misma cortina,
más corta (450 ms), y la flecha aparece al pasar el mouse.

### Onepage (hamburguesa)

- **Apertura:** un menú a pantalla completa que nace del botón como un círculo.
- **Contenido:** Inicio, Nosotros, Soluciones (líneas y servicios), Recursos y Contacto, con hijos. A la derecha, foto y
  respuesta («un protagonista a la vez»).
- **Pie:** redes y legales.
- **Bloqueo de scroll:** bloquea el scroll de la página mientras está abierto.
- **Cierre:** con la X en el mismo lugar, con Esc o al elegir un destino.

### Tableta y teléfono

| Ancho | Navegación |
|---|---|
| ≥ 1440 px | Cápsula + mega menú de tres columnas con tope de 1.360 px centrado. |
| 1280–1439 px | Mega menú fluido de tres columnas (280 · resto · 380). |
| 1181–1279 px | Mega menú en dos columnas; la foto y la respuesta salen y el caso baja a la franja inferior. |
| 1024–1180 px | Sólo hamburguesa; onepage con foto angosta. |
| 769–1023 px | Sólo hamburguesa; onepage sin foto. El botón del agendador sigue en la cabecera. |
| ≤ 768 px | Hamburguesa de 48 px; onepage sin foto, que se abre en círculo (750 ms). El agendador vive al pie del menú y toma el acento de la línea abierta. |

Las medidas salen de las notas del canvas: logo, cápsula de 575 px y botón de 216 px suman 1.083 px, así que bajo
1.181 px la cabecera queda apretada.

**Altura:** con `(max-height: 799px)` el menú entra en modo compacto. El panel usa
`max-height: calc(100dvh − 128px)` y la columna central tiene `overflow-y: auto`.

## Interacción y accesibilidad

- **Apertura por mouse:** el panel abre tras 150 ms de intención o con clic, y cierra 300 ms después de salir.
- **Cambio entre paneles:** con un panel abierto, pasar a otro botón lo cambia sin espera. Nunca hay dos menús abiertos,
  tampoco un mega y el onepage a la vez.
- **Teclado:**
  - Tab llega al disparador; Enter o ↓ abre.
  - ↑ ↓ recorren las líneas; → entra a los servicios.
  - Esc cierra y devuelve el foco al disparador.
- **Foco en el onepage:** queda contenido mientras está abierto y vuelve a la hamburguesa al cerrar.
- **ARIA:** `aria-expanded` y `aria-controls` en cada disparador, y `aria-hidden` con `tabindex=-1` en el contenido
  cerrado. El onepage es `role="dialog"` con `aria-modal="true"`.
- **Cápsula oculta:** bajo 1.181 px se oculta con `display:none`, para que el teclado no la recorra. La hamburguesa
  existe siempre en el DOM.
- **Tacto:** con `(hover: none)` se desactiva la apertura por hover y la vista previa por servicio; el toque abre y
  cierra.
- **Cambio de ancho:** si la ventana cruza 1.181 px con un menú abierto, el menú se cierra y el foco vuelve al botón
  visible.
- **Intención dentro de listas:** 90 ms, para que cruzar en diagonal no cambie la línea ni el servicio.
- **Foco por servicio:** el anillo fino del acento rodea el ícono, el nombre avanza 4 px y el resto baja a 55 %. Al
  salir de la lista vuelve el contenido de la línea.
- **Íconos:** catálogo Trazo de AXIS, 22 px, en reposo y sin esfera.
- **Contraste:** el texto sobre el vidrio da ≥ 4,5:1 en navy, negro y navy con resplandor (medido 12,2 a 18,3 el
  2026-10-18). En fotos, el peor punto medido fue 4,3, con promedio 6,1, sobre un indicador ámbar. Queda como control
  de QA en fotos claras.

## Motion

Tokens de `axisMotion`:

- `emphasized`: `cubic-bezier(0.2,0,0,1)`, para entradas.
- `emphasizedAccelerate`: `cubic-bezier(0.3,0,0.8,0.15)`, para salidas.

| Pieza | Comportamiento |
|---|---|
| Hamburguesa | Dos trazos de largo distinto que intercambian largo al pasar el mouse y se cruzan en X al abrir (450 ms). Sobre la X, el mouse la gira 90°. El botón no se mueve. |
| Onepage, abrir | Círculo desde el botón hasta cubrir la pantalla (800 ms). La página detrás retrocede a 97 %. Después, en cascada: logo y botón (260 ms), ítems cada 60 ms, líneas cada 45 ms; la foto se revela de derecha a izquierda y la respuesta llega al final (680 ms). |
| Onepage, cerrar | El contenido sale en 150 ms y el círculo vuelve al botón (550 ms, `emphasizedAccelerate`, retardo de 120 ms). Cerrado, el círculo mide 0 px: nunca deja un disco navy detrás del botón. |
| Onepage, foto | La foto nueva entra en 600 ms y se acerca 4 % en 9 s; nunca se aleja. |
| Mega, abrir | Cortina desde el botón (550 ms). El fondo se oscurece y la flecha gira. En cascada: líneas cada 40 ms, texto, foto que se revela de arriba abajo, respuesta y caso; la franja inferior al final. |
| Mega, cerrar | 300 ms después de salir, se recoge hacia arriba en 300 ms. |
| Mega, cambio de línea | El contenido anterior se apaga en 150 ms y el nuevo sube, con los servicios cada 40 ms; foto, respuesta y caso relevan en ese orden. |
| Fotos | Cruce con espera de carga: la foto anterior se queda hasta que la nueva cargó. |
| Botón del agendador | En vidrio: al pasar el mouse se ilumina y sube 1 px; al presionar baja a 98 %. En la isla oscura es blanco y al pasar el mouse pasa a `#cfe4fa`; en la isla clara es navy y pasa a `#023c70`. En ambos sube 1 px (250 ms). |
| Cambio de tono de la isla | Fondo, borde, sombra, texto, logo y botón cruzan de oscuro a claro (o al revés) en 300 ms `emphasized` cuando cambia la sección bajo la isla. |

**Movimiento reducido:** sin desplazamientos y con cambios instantáneos. La cabecera aparece y desaparece sin deslizarse.

## Receta de vidrio

Una sola receta para la cápsula, el botón del agendador y la hamburguesa. Se aprobó el 2026-10-18 tras probarla en navy,
negro, navy con resplandor y fotos:

```css
background: linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.03));
backdrop-filter: blur(20px) saturate(160%) brightness(.54);
border: 1px solid rgba(255,255,255,.10);
box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 -1px 0 rgba(255,255,255,.03), 0 8px 24px rgba(0,8,20,.24);
```

El botón del agendador usa el mismo material con un relleno algo mayor (`.12`→`.04`), borde `.18` y canto `.34`. La
hamburguesa abierta queda sólo con un anillo fino, sin relleno. Los valores pasan a tokens de AXIS en la fase del
contrato. El CSS del sitio nunca los repite a mano.

## Isla de vidrio (cabecera fija)

Al subir, la cabecera no vuelve como barra de ancho completo: vuelve como **una sola isla de vidrio flotante** con
hamburguesa, logo (128 px), cápsula y botón del agendador. Se aprobó el 2026-10-18 en reemplazo de la barra navy
sólida, que el operador encontró poco premium. Se comparó con una barra de vidrio de ancho completo y con islas
separadas: estas últimas se ven recargadas sobre el contenido.

**Cambia de tono según lo que tiene debajo**, porque un vidrio oscuro sobre una sección clara se vuelve gris y el
texto blanco pierde contraste:

- **Tono oscuro**, sobre fotos y secciones oscuras: texto y logo blancos y botón del agendador blanco con texto navy.
- **Tono claro**, sobre secciones claras: logo en versión navy, texto navy, hover de ítems `rgba(0,26,51,.06)`,
  botón del agendador navy con texto blanco y hamburguesa con trazos navy sobre `rgba(0,26,51,.06)`.

```css
/* Isla: centrada, 12 px del borde, radio 24, alto 61 */
top: 12px; width: min(1180px, 100% - 48px); border-radius: 24px; padding: 8px 8px 8px 72px; /* 24px sin hamburguesa */

/* Tono oscuro (sobre fotos y secciones oscuras) */
background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.04));
backdrop-filter: blur(28px) saturate(170%) brightness(.48);
border: 1px solid rgba(255,255,255,.12);
box-shadow: inset 0 1px 0 rgba(255,255,255,.22), 0 16px 40px rgba(0,8,20,.30);

/* Tono claro (sobre secciones claras) */
background: rgba(255,255,255,.72);
backdrop-filter: blur(28px) saturate(180%);
border: 1px solid rgba(0,26,51,.08);
box-shadow: 0 10px 30px rgba(0,26,51,.10);
```

**Cómo se decide el tono:** cada sección de la página declara `data-site-nav-tone="light|dark"`. El primitive mira qué
sección queda bajo la línea media de la isla al hacer scroll y cambia el tono en 300 ms. Si una sección no lo declara,
el primitive mide la luminancia de su color de fondo: mayor a 0,5 es claro (decidido en el Lab, `TASK-2040`). Mide en
la posición final de la isla y no en la de la cabecera mientras entra. En WordPress el adaptador (`TASK-2042`) marca las
secciones de cada plantilla; la luminancia es sólo el respaldo.

**En el teléfono** es la misma isla con márgenes de 12 px, que lleva el logo y la hamburguesa; el botón del agendador
sigue al pie del onepage.

El mega menú y el desplegable de Nosotros caen desde la isla (panel a 84 px del borde superior). El círculo del onepage
nace del centro de la hamburguesa dentro de la isla.

Demostración aprobada: video de la sesión del 2026-10-18, con la variante «C · Una sola isla que cambia de tono».

## Modelo de datos — documento `site-nav.v1`

Un documento JSON por sitio. El esquema definitivo es `site-nav.v1.schema.json` (JSON Schema 2020-12), exportado por
`@efeoncepro/axis-ui-contracts` como objeto (`siteNavJsonSchema`) y como archivo, para que el plugin valide lo mismo que
AXIS (`TASK-2040`). `validateSiteNav` lo interpreta y agrega ids únicos y matchers que apuntan a algo real. El documento
completo de ejemplo, con el contenido del canvas, es `siteNavExample`. Forma abreviada:

```jsonc
{
  "schema": "site-nav.v1",
  "site": "efeoncepro.com",
  "revision": 12,                        // la asigna el plugin
  "updatedAt": "2026-10-18T15:00:00Z",
  "locale": "es-CL",
  "header": {
    "logo": { "label": "Efeonce", "href": "/" },
    "cta": { "label": "Agenda tu diagnóstico", "action": "open_meeting_scheduler", "fallbackHref": "/agenda/" }
  },
  "primary": [
    { "id": "inicio", "label": "Inicio", "href": "/", "onepage": { "show": false } },
    { "id": "nosotros", "label": "Nosotros", "href": "/about-us-efeonce/", "panel": "dropdown",
      "onepage": { "eyebrow": "¿QUIÉNES SOMOS?", "answer": "Crecer", "photo": { "op": "…", "alt": "…" } },
      "items": [ { "id": "partners", "label": "Partners", "description": "…", "href": "/partnership/", "photo": { "op": "…", "alt": "…" } } ] },
    { "id": "soluciones", "label": "Soluciones", "href": "/servicios/", "panel": "lines", "eyebrow": "¿QUÉ NECESITAS HOY?",
      "lines": [
        { "id": "growth", "label": "Growth", "question": "¿Lo medimos?", "accent": "growth", "answer": "Siempre",
          "eyebrow": "GROWTH · EFEONCE", "title": "Crecer con método", "description": "…",
          "photo": { "mm": "https://storage.googleapis.com/efeonce-group-axis-public-media/site-nav/v1/growth-mm.webp",
                     "op": "…/growth-op.webp", "alt": "…" },
          "case": { "kind": "PARA LEER", "title": "…", "meta": "…", "href": "…" },
          "services": [
            { "id": "loop-marketing", "label": "Loop Marketing", "description": "…", "href": "/landing-loop-marketing/",
              "glyph": "medicion", "answer": "Ciclo a ciclo", "photo": { "mm": "…", "op": "…", "alt": "…" },
              "reading": { "kind": "PARA LEER", "title": "…", "href": "…" } }
          ] }
      ],
      "strip": { "text": "¿No sabes por dónde empezar?", "cta": { "label": "Agenda tu diagnóstico", "action": "open_meeting_scheduler", "fallbackHref": "/agenda/" },
                 "links": [ { "label": "Ver todas las soluciones", "href": "/servicios/" } ] } },
    { "id": "recursos", "label": "Recursos", "href": "/blog/", "panel": "editorial", "eyebrow": "¿QUÉ QUIERES LEER O USAR?",
      "formats": [
        { "id": "glitch", "label": "Glitch", "question": "IA y marketing, cada lunes", "href": "/glitch/", "brandMark": "glitch",
          "eyebrow": "EL MAGAZINE SEMANAL", "title": "La semana, sin ruido", "description": "…",
          "source": { "kind": "wp-category", "ref": "glitch" }, "items": [ { "meta": "FLASH · 28 SEP", "title": "…", "href": "…" } ],
          "featured": { "kind": "LO ÚLTIMO", "title": "…", "excerpt": "…", "cta": "Leer el Flash", "href": "…", "photo": { "card": "…", "alt": "…" } } }
      ],
      // La suscripción del blog, misma lista que Glitch: sólo un enlace del documento.
      "strip": { "text": "llega cada lunes a tu correo.", "brandMark": "glitch",
                 "cta": { "label": "Suscríbete a Glitch", "action": "link", "fallbackHref": "/blog/" }, "links": [ { "label": "Ir al blog", "href": "/blog/" } ] } },
    { "id": "contacto", "label": "Contacto", "href": "/contacto/",
      "onepage": { "eyebrow": "¿HABLAMOS?", "answer": "Cuando quieras", "items": [ { "id": "agenda", "label": "Agenda una reunión", "description": "…", "href": "/agenda/" } ] } }
  ],
  "onepage": { "footer": { "social": [ { "network": "linkedin", "label": "Efeonce en LinkedIn", "href": "https://…" } ],
                           "legal": [ { "label": "Privacidad", "href": "/politica-de-privacidad/" } ], "copyright": "© 2026 Efeonce Group SpA" } },
  "context": { "matchers": [ { "path": "/agencia-creativa/", "line": "brand", "service": "agencia-creativa" } ] }
}
```

Reglas del documento:

- **Enlaces relativos al sitio** cuando son internos. Así el mismo documento sirve en otro host, y cada adaptador los
  resuelve contra su origen o el de `efeoncepro.com`.
- **Fotos con URL absoluta** del bucket de AXIS o de la biblioteca de WordPress. Cada foto con sus recortes y su texto
  alternativo, que es obligatorio.
- **`context.matchers`** dice en qué ruta se marca «Estás aquí»; es dato, no lógica.
- **Límites:** máximo dos niveles de profundidad en el onepage y un solo panel abierto. El esquema rechaza estructuras
  más profundas.
- **Sin HTML libre en los textos.** El esquema sólo acepta texto plano y enlaces declarados.
- **Enlaces seguros:** relativos al sitio, fragmento, `https` o `mailto`. Se rechazan `javascript:`, `//host` y `http`.
- **Íconos:** `glyph` es un glifo de Trazo del catálogo de AXIS; uno desconocido es un error del documento.
- **Paneles:** un primario sin `panel` es enlace directo; `lines`, `editorial` y `dropdown` son los únicos paneles. Los
  hijos del onepage salen del panel (o de `onepage.items` en un enlace directo, como Contacto).

### Datos dinámicos (Recursos)

Lo último de cada formato se resuelve **en el servidor del sitio**, al pintar el menú, a partir de `source`. Lo hace
`EOSN_Resources` del plugin (`TASK-2041`). Qué sigue a los posts, por formato (acordado con la sesión del menú el
2026-10-22):

| Formato | `source` | Lista (centro) | Destacado |
|---|---|---|---|
| Glitch | `wp-category` `glitch` | Dinámica | Dinámico: título, extracto, enlace, sello y CTA. Conserva el `kind` y la foto de marca del documento. |
| Marketing con Manzanitas | `wp-post-type` `post` | Dinámica, sin las categorías que ya tienen formato propio (Glitch) | Fijo: presenta un formato evergreen con su foto de marca. |
| Herramientas | `think-feed` `tools` | Fija | Fijo. Think no expone feed (verificado el 2026-10-22); queda pendiente en el repo de Think. |
| Guías descargables | sin `source` | Fija | Fijo. |

- **Tipo de edición de Glitch:** sale del prefijo del título. «Glitch Flash: X» se muestra como `FLASH · 28 SEP`,
  «Glitch #17: X» como `EDICIÓN 17 · 28 JUL`, y un post sin prefijo como `GLITCH · fecha`. El prefijo se quita del
  título que se pinta. El CTA del destacado sigue al tipo: «Leer el Flash», «Leer la edición» o «Leer en Glitch». El
  filtro `eo_site_nav_resource_edition` reemplaza al parser si Glitch pasa a subcategorías (`TASK-1337`).
- **Fechas:** se toman del instante GMT del post y se muestran en `America/Santiago`, con la zona puesta explícitamente,
  y con el mes abreviado en mayúsculas. efeoncepro.com no tiene zona horaria configurada (para WordPress, la hora local
  es UTC), así que la zona del sitio no sirve. Ejemplo: un post de las 02:00 UTC del 28 es del 27 en Chile.
- **Caché:** transient de 12 min. Se invalida al publicar, despublicar (papelera incluida), editar o borrar un post
  publicado y al cambiarlo de categoría.
- **Fallas:** si la fuente falla o viene vacía, se usa lo fijo del documento; una falla se recuerda 2 min. El menú
  nunca queda vacío ni bloquea la página. Los textos se recortan a los límites del esquema y los enlaces quedan
  relativos. El resultado sigue cumpliendo `site-nav.v1` (probado).
- **Extensión:** `eo_site_nav_resolve_source` puede entregar cualquier fuente, por ejemplo un futuro feed de Think.
- El navegador no consulta la REST de WordPress.

## Plugin «EO Navegación» (fuente de verdad)

Plugin propio `efeonce-public-site-runtime/wp-content/plugins/eo-site-nav/` (`TASK-2041`, prefijo `EOSN_`). Slices
1 a 3 construidos y probados en WordPress Playground el 2026-10-22, sin desplegar.

- **Servicio de guardado (`EOSN_Store::save`):** es la única puerta de escritura. Sigue este orden:
  1. permiso;
  2. mensaje obligatorio;
  3. validación;
  4. idempotencia por hash del contenido (sin `revision` ni `updatedAt`);
  5. conflicto si la revisión base del documento no es la vigente, revisado de nuevo bajo un bloqueo;
  6. revisión nativa con autor y mensaje;
  7. copia publicada con `ETag`;
  8. purga.

  El primer guardado de un sitio no compara la base porque no hay nada que pisar. Restaurar guarda el contenido de una
  revisión como revisión nueva y nunca reescribe la historia. kses no toca el JSON.
- **Lectura sin usuario:** el documento es privado, pero se lee sin sesión porque el adaptador pinta el menú a
  visitantes anónimos.
- **Purga:** usa el objeto de Kinsta que ve PHP. Si no está, el resultado lo dice y `wp eo-nav` corre
  `kinsta cache purge --all`. Qué expone Kinsta desde una petición web se verifica en vivo en el Slice 4.

- **Almacenamiento:** un tipo de contenido privado (`eo_site_nav`, no público, sin URL) con **revisiones nativas de
  WordPress**, una entrada por sitio. Las revisiones dan autor, fecha y vuelta atrás sin tabla propia.
- **Validación:** contra el esquema `site-nav.v1`, copiado del contrato de AXIS con versión fijada. Si no pasa, no se
  guarda nada.
- **Admin:** pantalla estructurada en Ajustes. Edita líneas, servicios, hijos, textos, fotos por recorte, alt y CTA, y
  muestra la vista previa y el historial. No usa «Apariencia → Menús».
- **WP-CLI:**

  | Comando | Uso |
  |---|---|
  | `wp eo-nav export [--revision=N]` | Exporta el documento vigente o una revisión. |
  | `wp eo-nav validate --file=<ruta>` | Valida un documento sin guardarlo. |
  | `wp eo-nav apply --file=<ruta> --message="…"` | Guarda una nueva revisión con autor y mensaje. |
  | `wp eo-nav revisions` / `wp eo-nav restore <revisión>` | Lista revisiones y vuelve a una anterior. |

  Los agentes los corren con `pnpm public-website:wpcli`, después de `pnpm public-website:ssh-check` y con la foto
  previa del documento. Escribir exige `--user` con la capability, y `apply --dry-run` valida sin guardar. `export
  --resolved` muestra Recursos como los vería el menú.
- **Copia pública:** `GET /wp-json/eo/v1/site-nav` (`?site=` opcional). Devuelve sólo el documento publicado, con
  `ETag`, `304` ante `If-None-Match`, `Cache-Control: public, max-age=300` y `404` si el sitio no tiene documento. Es la lectura para Think y otros sitios. La publicación adicional en el bucket de AXIS es una
  decisión abierta de PDR-027 (punto 3).
- **Permisos:** escribir requiere `manage_options` o una capability propia (`eo_manage_site_nav`). La REST pública es de
  sólo lectura.

Así se cumple Full API Parity: personas (admin) y agentes (WP-CLI) usan el mismo command de guardado y la misma
validación. Una herramienta de Greenhouse o MCP podrá llamar a esa misma puerta más adelante, sin lógica paralela.

## Fotos

- **Destino:** `gs://efeonce-group-axis-public-media/site-nav/v<N>/<slug>-<recorte>[.vK].webp`, servido desde
  `https://storage.googleapis.com/efeonce-group-axis-public-media/site-nav/...`. El bucket es público
  (`allUsers:objectViewer`), con acceso uniforme y multirregión EE. UU.
- **Caché de un año:** `Cache-Control: public, max-age=31536000, immutable`, sólo en `site-nav/`. Nunca se sobrescribe
  un objeto: si una foto cambia, se sube como archivo nuevo.
- **Recortes:**

  | Recorte | Medida | Uso |
  |---|---|---|
  | `mm` | 880×472 | panel del mega |
  | `card` | 880×496 | tarjeta del mega |
  | `op` | 996×1080 | onepage escritorio |

  Todos en webp. La tableta horizontal usa el mismo `op` encuadrado con `object-position: 62% 50%`, como el tablero
  Tableta1024 del canvas; no hay recorte propio (`op-s` se retiró el 2026-10-22: nadie lo pintaba). Tableta vertical y
  teléfono no llevan foto.
- **Carga:** las fotos se precargan al abrir el panel, nunca al cargar la página. La foto anterior se queda hasta que la
  nueva cargó.
- **Quién sube:** agentes u operadores con credenciales de GCP. El plugin no sube a GCP.
- **Fuente de las fotos:** las 57 fotos que hoy usa el canvas tienen su archivo en
  `ai-generations/2026-10-18_menu-sitio/web/` y otras carpetas de `ai-generations`; las 17 restantes se bajan del canvas.
  Sólo se usan las aprobadas.

## Agendador

- **Motor:** Growth CTA `<greenhouse-cta>` con la acción `open_meeting_scheduler`, que abre el agendador nativo
  `<efeonce-meeting-scheduler>`.
- **Superficie y clave por sitio:** una para el encabezado global de `efeoncepro.com` y otra para cada sitio que se
  sume. La clave es secreta: nunca va a documentos, commits ni mensajes. La allowlist de origen cubre todas las páginas
  donde aparece el menú.
- **`cta-location`** por punto de entrada: `menu_header`, `menu_mega` y `menu_onepage`, para medir.
- **Secuencia al abrir:** el menú cierra el mega o el onepage **antes** de abrir el diálogo y suelta su bloqueo de
  scroll; el lanzador queda montado para que el foco vuelva al cerrar.
- **Piel del diálogo:** la del agendador de `/agencia-inbound-marketing/` (diálogo transparente, fondo navy con brillo y
  cerrar de vidrio). Hoy está con alcance de esa landing en `scripts/public-website/inbound-source/page.css` y se sube a
  una primitive compartida del sitio.
- **Respaldo:** sin JavaScript o sin superficie, el botón es un enlace normal a `/agenda/`.
  **Delta 2026-10-20:** `/agenda/` ya no es el piloto aislado `noindex`: es la landing rediseñada con «La órbita»,
  indexable, que monta el mismo agendador nativo en línea. Queda fuera de los menús por decisión del operador; este
  botón será el que la enlace. Detalle: [landing Agenda](../../documentation/public-site/agenda.md).

## Medición

Eventos que emite el primitive y empuja el adaptador al `dataLayer`:

| Evento | Cuándo |
|---|---|
| `site_nav_open` | Se abre un panel; lleva `panel` (`soluciones`, `recursos`, `nosotros` u `onepage`). |
| `site_nav_line_view` | Se ve una línea; lleva `line`. |
| `site_nav_click` | Clic en un destino; lleva `target_type` (`logo`, `primary`, `line`, `service`, `case`, `reading`, `dropdown`, `format`, `resource`, `featured`, `strip`, `onepage`, `social`, `legal` o `cta`) y `target`. |
| `site_nav_cta` | Intención de agendar; lleva `cta_location` (`menu_header`, `menu_mega` o `menu_onepage`). El primitive cierra lo abierto, suelta el scroll y despacha además el evento DOM cancelable `axis-site-nav:cta`, que el sitio usa para abrir su agendador. |

Los nombres finales y su alta en GTM y GA4 se cierran en la tarea del adaptador, con la skill de medición. No se envía
PII.

## Adaptador WordPress

- **Ubicación:** override del encabezado en `ohio-child`. El punto exacto de enganche del header de Ohio se confirma en
  el discovery de la tarea; queda **[verificar]**.
- **Interruptor:** opción `eo_site_nav_enabled` (`off` / `pilot` / `on`) más una lista de páginas para el piloto. En
  `off` o fuera de la lista, el sitio sigue con el encabezado de Ohio sin cambios.
- **Assets de AXIS:** copiados con versión fijada en `assets/vendor/axis/<versión>/`, según PDR-024; nunca `-latest`
  ni registry.
- **Render:** port PHP de `siteNavHtml`, desde el documento, validado contra el fixture del paquete
  (`packages/primitives/fixtures/site-nav/agencia-creativa.html`): una sola fuente de marcado (decidido en `TASK-2040`).
  Los enlaces salen en el HTML del servidor; `site-nav.js` se copia tal cual (no importa nada) y sólo mejora.
- **Variantes de Ohio por página:** encabezado transparente u oscuro y logo fijo, controlados por metas de Ohio y ACF.
  Se inventarían y cada una se resuelve con un estado del primitive (arriba o isla, en tono oscuro o claro) o se documenta como
  excepción.
- **Despliegue:** release acotado por SSH. Primero se exporta el código vivo, se arma el paquete con guarda
  `previousSha256` y se despliega con respaldo; después se resetea OPcache y se purga Kinsta. Ver la
  skill `efeonce-public-site-wordpress` y `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`.
- **Doctrina:** al pasar a `on` en todo el sitio, se actualiza la referencia `native-navigation.md` de la skill del
  sitio. Su regla de conservar el menú de Ohio queda reemplazada para el encabezado global.

## Adaptador Think (cuando se pida)

- **Componente:** uno de Astro que lee la copia pública al construir (o con caché del servidor) y llama al mismo render
  de AXIS.
- **Agendador:** monta su propio `<greenhouse-cta>` con su superficie (`GREENHOUSE_CTA_SURFACE_ID` y su clave desde
  `astro:env/server`, como `GrowthCtaDock.astro`).
- **Enlaces:** los relativos se resuelven contra `https://efeoncepro.com`, salvo los que el documento marque como
  propios de Think.

## Implementación en AXIS (`TASK-2040`)

Construido en `axis-design-system` (commits `8327593`, `0c8a230` y `5e97c59`, 2026-10-22); se publica con el próximo
release de paquetes.

| Pieza | Export |
|---|---|
| Tokens | `axisSiteNav` en `@efeoncepro/axis-tokens`: vidrio, isla en dos tonos, medidas, breakpoints y tiempos sobre `axisMotion`. |
| Contrato y esquema | `AXIS_SITE_NAV_CONTRACT`, `siteNavJsonSchema`, `validateSiteNav`, `siteNavIssues`, `resolveSiteNavContext` y `siteNavExample` en `@efeoncepro/axis-ui-contracts`; archivo `site-nav.v1.schema.json`. |
| Render | `siteNavHtml` y `siteNavLinks` en `@efeoncepro/axis-ui-primitives/site-nav`. |
| Estilos | `@efeoncepro/axis-ui-primitives/site-nav.css`. |
| Comportamiento | `enhanceSiteNav` y `createSiteNav` en `@efeoncepro/axis-ui-primitives/site-nav.js`. |
| Lab | `/patterns/efeonce.site-nav/` y demos `/demos/site-nav/<contexto>-<cabecera>/`; suite `playwright.site-nav.config.ts`. |

Decidido en el Lab:

- La cabecera se oculta en 300 ms y vuelve como isla en 400 ms.
- Con un mega abierto, un scroll de más de 48 px lo cierra.
- El tono de la isla sigue `data-site-nav-tone`; si falta, la luminancia del fondo.
- El JS lee los tiempos de las variables CSS en `ms` o `s`, porque un minificador puede reescribir `150ms` como `.15s`.

Notas de verificación y límites: `docs/quality/site-nav.md` en AXIS.

## Invariantes

1. **Una sola fuente de verdad del menú:** el documento del plugin. Ningún otro archivo editable compite con él.
2. **HTML de servidor primero:** ningún destino depende de JavaScript para existir.
3. **Sin React** en el sitio público; JS liviano sin framework.
4. **AXIS con versión fijada** en cada sitio; los valores de diseño salen de tokens, nunca HEX ni px a mano en el sitio.
5. **Un panel abierto a la vez**; el mega y el onepage nunca juntos.
6. **Fotos versionadas e inmutables**, cargadas al abrir y nunca al entrar.
7. **Rollback en un paso:** apagar el interruptor devuelve el encabezado de Ohio.
8. **La clave del agendador** nunca sale del sitio que la usa.

## Rollout y rollback

| Paso | Qué se verifica | Vuelta atrás |
|---|---|---|
| Contrato y primitive publicados en AXIS | Lab, pruebas de teclado y foco, 390 px y contraste. | Versión anterior del paquete. |
| Plugin desplegado (`off`) | Documento inicial validado, revisiones, REST pública, WP-CLI. | Desactivar el plugin. |
| Fotos en el bucket | Lectura pública, caché inmutable, alt. | Nada que revertir: objetos nuevos e inmutables. |
| Piloto (`pilot`, una página) | Desktop y 390 px, sin scroll horizontal, agendador abre y devuelve foco, eventos en `dataLayer`, Core Web Vitals sin regresión. | Interruptor a `off`. |
| Todo el sitio (`on`) | Variantes de Ohio resueltas, landings, blog, Glitch, 404, archivo. | Interruptor a `off` + purga de Kinsta. |

## Pendientes antes de construir

Vienen de la nota «Por confirmar» del canvas y de PDR-027:

- ~~Alcance en todo el sitio y piloto primero~~: decididos por el operador el 2026-10-18 (PDR-027, Accepted).
- Destino de la copia pública: REST de WordPress sola, o también en el bucket (PDR-027, punto abierto 3).
- Orden de los servicios por línea (Inbound quedó en Revenue).
- Si las respuestas aprobadas por línea («Tu squad», «Visible»…) viven también en el menú.
- URL real del canal de YouTube: hoy el sitio apunta a `facebook.com/colabrio`, un resto del tema.
- Títulos reales de las lecturas sugeridas; hoy son provisorios.
- Influencer y Performance no tienen lectura propia en el blog y muestran la de su línea.

## Referencias

- Canvas y notas: [claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj](https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj).
- Decisión: [PDR-027](../../public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md).
- AXIS en el sitio: [PDR-024](../../public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md).
- Mecanismos, no estéticas: [PDR-026](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md).
- Precedente portable: [PRIMITIVES.md](PRIMITIVES.md) §`EfeonceMention`.
- Cromo compartido: [PUBLIC_MISCELLANEOUS_SURFACES_V1.md](PUBLIC_MISCELLANEOUS_SURFACES_V1.md).
- Agendador: [GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md](../GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md).
- Estrategia de widgets: [wordpress-custom-widgets-react-strategy.md](../../documentation/public-site/wordpress-custom-widgets-react-strategy.md).
- Acceso a Kinsta: [PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md](../agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md).
