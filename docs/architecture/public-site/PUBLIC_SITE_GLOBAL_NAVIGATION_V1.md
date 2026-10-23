# Navegación global del sitio público V1

Estado: **En producción en todo `efeoncepro.com` desde el 2026-10-23 00:09 UTC** (`eo_site_nav_enabled=on`), salvo
`/blog/` (#18456), que conserva la cabecera de Ohio porque esa página es de `TASK-1802`. AXIS
`@efeoncepro/axis-ui-primitives` 0.7.13 y `@efeoncepro/axis-ui-contracts` 0.7.12 publicados (primitives 0.7.13 en el tema desde 04:28 UTC); plugin «EO Navegación»
activo con el documento en la revisión 4; agendador nativo en vivo. Pendientes en §Pendientes.

Encendido: el operador decidió prenderlo en todo el sitio sin piloto de una página. El barrido del 2026-10-23 cubrió 52
páginas publicadas y 3 posts de Glitch, en 1440 y 390: todas responden 200, con el menú nuevo, sin la cabecera de Ohio,
con panel y onepage que abren y con `gh_site_nav_opened` llegando al `dataLayer`. Lo que encontró fuera del menú quedó
como estaba: recursos 404 dentro de páginas antiguas (formularios de HubSpot borrados, un ícono de iconify, uploads
faltantes) y desborde horizontal de contenedores de Elementor en cinco páginas antiguas o de demo (`/home-2/`,
`/demo-landing-2024/`, `/partnership/`, `/landing-loop-marketing/` —que hoy responde 301, §Redirecciones— y
`/home-2-2/`).

Fidelidad: la sesión «Rediseño de Menú» midió en vivo y aprobó tamaños, tipografía, íconos, isla y estados en 1440,
1280, 1200, 1024, 834 y 390; el círculo del onepage en 1440, 1680, 1920, 2000 y 2560; y «Estás aquí» en 10 páginas de
servicio.

Dueño: Sitio público / WordPress + AXIS

Decisión: [PDR-027 — Navegación global del sitio, portable entre sitios](../../public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md)

Programa: [EPIC-055](../../epics/in-progress/EPIC-055-public-site-global-navigation.md)

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
| Plugin (WordPress) | Fuente de verdad del documento: validación, revisiones, WP-CLI, copia pública y render PHP idéntico al de AXIS. | No sube fotos a GCP ni decide en qué páginas aparece el menú. |
| Adaptador (cada sitio) | Lee el documento, pinta el menú, monta el CTA de su superficie, decide en qué páginas aplica y con qué estado arranca, y apaga el encabezado anterior. | No duplica la lógica del primitive ni estiliza dentro del menú. |
| Edición gobernada (Greenhouse) | `pnpm public-website:site-nav`: trae el documento vivo, lo cambia por selectores, sube fotos, revisa, previsualiza y aplica contra la revisión base. | No guarda una copia que compita con la viva; escribe sólo por el servicio de guardado del plugin. |

Precedente directo: `EfeonceMention` (contrato `efeonce.mention`, `@efeoncepro/axis-ui-primitives` ≥ 0.6.9), con
copia exacta del CSS en WordPress y envoltura Astro en Think. Ver [PRIMITIVES.md](PRIMITIVES.md).

## Superficies y estados

### Cabecera

| Estado | Comportamiento | Alto |
|---|---|---|
| Arriba | Transparente sobre el hero. Cápsula y botón de vidrio. El hero sube hasta el borde. | 96 px |
| Bajando | Se oculta para no tapar la lectura. | — |
| Subiendo | Vuelve como una **isla de vidrio flotante** centrada, a 12 px del borde, que cambia de tono según la sección que tiene debajo (§Isla de vidrio). Reemplaza la barra navy sólida, aprobado por el operador el 2026-10-18. | isla de 61 px |

**Estado inicial (decide el anfitrión).** El primitive pinta el estado que le pide el adaptador. En `efeoncepro.com`:

- **Hero oscuro sin el espaciador de Ohio:** arranca `top`, transparente y en vidrio sobre el hero.
- **Página con el espaciador de Ohio o con hero claro:** arranca `fixed`, como isla clara y sólida. Las páginas de hero
  claro están listadas en `EO_SITE_NAV_LIGHT_HERO_PAGES` (251078, 242261, 223787, 223841, 21460 y 19820).

Corrección del 2026-10-23: las páginas de hero claro arrancaban en la barra de vidrio y el logo blanco no se leía en
`/servicios/posicionamiento-seo/`. Una página nueva de hero claro se agrega a esa lista.

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
  línea, más un borde interior suave en la tarjeta. La página se reconoce por el enlace del propio servicio (§Reglas del
  documento); medido en vivo en 10 páginas de servicio el 2026-10-23.
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

- **Apertura:** un menú a pantalla completa que nace del botón como un círculo. El círculo crece hasta la esquina más
  lejana de la ventana (§Motion, regla del radio).
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

**Radio del círculo del onepage (AXIS primitives 0.7.10, 2026-10-23).** El círculo crece hasta la esquina de la ventana
más lejana al centro de la hamburguesa. El JS lo calcula al abrir y en cada cambio de tamaño y lo escribe en
`--asn-op-r`, medido dentro de la caja del onepage para que el desplazamiento del anfitrión (`--axis-site-nav-offset`)
mantenga el centro sobre la hamburguesa. Sin JS el radio es `150vmax`. El token `axisSiteNav.motion.onepage.radiusPx`
(1720) queda como la medida del tablero de 1440 y ya no es el radio. Corrige un defecto que el operador vio en vivo: por
encima de unos 1.500 px de ancho quedaba una esquina sin cubrir. Verificado en 1440, 1680, 1920, 2000 y 2560.

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

**Cómo se decide el tono** (AXIS primitives 0.7.13). Al hacer scroll, el primitive mira el primer elemento de la página
bajo la línea media de la isla, en la posición final de la isla y no en la de la cabecera mientras entra, y cambia el
tono en 300 ms:

1. **Se salta** lo que no es la página: el propio menú, el chrome fijo o sticky del anfitrión (barra del tema, chat,
   aviso de cookies, el dock de landings) y los elementos que no se ven (`checkVisibility` con visibilidad y opacidad).
2. **Si lo primero es `<html>`**, un diálogo modal (el agendador) dejó la página inerte: la isla **conserva su tono**.
   Sin esta guarda, un anfitrión que pinta `<html>` volvía clara la isla detrás del diálogo y después de cerrarlo.
3. **`data-site-nav-tone="light|dark"`** en el elemento o un ancestro decide, si existe.
4. **Si no, el fondo**, subiendo por los ancestros hasta que uno decida:
   - un degradado decide por la luminancia media de sus paradas opacas;
   - una imagen de fondo cuenta como oscura;
   - un color decide sólo si tiene alfa de al menos 0,5: un velo de 5 % de blanco sobre navy sigue siendo navy;
   - luminancia mayor a 0,5 es claro.

Si nada decide, el tono no cambia. En efeoncepro.com el adaptador no marca secciones con `data-site-nav-tone`: el tono
sale del fondo. La lectura de degradados y chrome fijo (0.7.12) corrigió la isla clara sobre la franja E-E-A-T navy de
`/servicios/posicionamiento-seo/`, que encontró la sesión de fidelidad; la guarda del diálogo (0.7.13) la encontró la
sesión del dock. El dock de landings (`TASK-2043`) lee su tono de la misma forma (§Dock inferior de las landings).

**Cómo verificarlo:** en un navegador en primer plano (Playwright headless sirve). Un panel del navegador oculto, como
el panel Browser de la app de escritorio colapsado, corre la página en segundo plano, sin `requestAnimationFrame` ni
eventos de scroll: el tono no se actualiza y el bloqueo de scroll del agendador parece trabado. No es un defecto del
sitio. En este tema, `window.scrollTo(0, y)` sin `behavior: 'instant'` es suave y puede no moverse en una espera corta.

**Medidas publicadas (AXIS primitives 0.7.8):** la isla de escritorio mide 61 px más el borde (63 px), con los ítems
sueltos, sin cápsula propia dentro de la isla, y el botón del agendador de 45 px.

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
            // Desde la revisión 3 (2026-10-23) Loop Marketing enlaza a Inbound; /landing-loop-marketing/ responde 301.
            { "id": "loop-marketing", "label": "Loop Marketing", "description": "…", "href": "/agencia-inbound-marketing/",
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
- **«Estás aquí» sale del enlace del servicio** (AXIS contracts y primitives 0.7.9, 2026-10-23). Cuando ningún matcher
  de contexto coincide, la página cuyo `href` de servicio es la misma ruta en el sitio marca ese servicio y su línea,
  sin declararlo. Cuenta como ruta del sitio un `href` relativo a la raíz, o `https` en `site` o en `www.` + `site`.
  Reglas:
  - un servicio nuevo se marca apenas existe;
  - otro host (`think.efeoncepro.com`) nunca marca una página del sitio;
  - dos servicios con la misma URL no marcan nada;
  - la ruta de la página puede llegar absoluta;
  - `aria-current="page"` sigue la misma regla de host.

  La normalización está en el export `siteNavLocalPath` de `@efeoncepro/axis-ui-contracts`; el render PHP del plugin la
  replica.
- **`context.matchers`** queda para las excepciones: una página que no es el enlace de un servicio, o que debe marcar
  otra cosa. Cuando existe, gana. Es dato, no lógica. El de Loop Marketing se quitó en la revisión 3.
- **Límites:** máximo dos niveles de profundidad en el onepage y un solo panel abierto. El esquema rechaza estructuras
  más profundas.
- **Sin HTML libre en los textos.** El esquema sólo acepta texto plano y enlaces declarados.
- **Enlaces seguros:** relativos al sitio, fragmento, `https` o `mailto`. Se rechazan `javascript:`, `//host` y `http`.
- **Íconos:** `glyph` es un glifo de Trazo del catálogo de AXIS; uno desconocido es un error del documento.
- **Paneles:** un primario sin `panel` es enlace directo; `lines`, `editorial` y `dropdown` son los únicos paneles. Los
  hijos del onepage salen del panel, o de `onepage.items` en un enlace directo, como Contacto. En un panel editorial,
  `onepage.items` reemplaza a los formatos cuando el onepage dice otra cosa. Recursos lo usa: en el canvas sus hijos
  llevan descripciones propias y el tercero es el Efeonce AI Visibility Report, no el formato «Herramientas».
- **Marca de contexto:** «Estás aquí», con mayúscula inicial, como en todos los tableros del canvas.

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

Plugin propio `efeonce-public-site-runtime/wp-content/plugins/eo-site-nav/` (`TASK-2041`, prefijo `EOSN_`), **activo
en efeoncepro.com desde el 2026-10-22**. Contiene el tipo de contenido privado con revisiones nativas, el servicio de
guardado, la REST `eo/v1/site-nav`, el validador (35 casos de paridad con AXIS) y el render PHP `EOSN_Render`, idéntico
byte a byte a `siteNavHtml` (17 casos de paridad). Ambas paridades corren contra la versión de AXIS copiada en el tema:
hoy primitives 0.7.13 con contracts 0.7.12. Su suite de Playground
(`tests/playground/run-eo-site-nav.sh`) corre 49 verificaciones. Se despliega con el carril acotado de abajo.

**El documento vivo es la fuente de verdad.** Revisión vigente: 4.

| Revisión | Cambio |
|---|---|
| 1 | Documento inicial. |
| 2 | Posts reales en las tarjetas de línea y títulos de lectura acortados. |
| 3 | Loop Marketing enlaza a Inbound. |
| 4 | «Surround Discovery™» en lugar de la entidad HTML; primer uso real de `pnpm public-website:site-nav`. |

En el runtime, `manifests/site-nav/build-efeoncepro-document.mjs` sólo sirvió para el arranque: se niega a correr sin
`--bootstrap` y conserva anotados los títulos publicados de las lecturas que se acortaron.
`manifests/site-nav/efeoncepro.com.json` es un espejo del vivo, que se refresca con `site-nav pull --mirror`. Ninguno
de los dos se edita para cambiar el menú (§Edición gobernada).

- **Deploy:**
  1. `pnpm public-website:export-live-code`, que incluye `eo-site-nav` en `TARGETS`.
  2. `node scripts/public-website/build-site-nav-plugin-package.cjs <baseline>`: empaqueta los archivos del plugin
     versionados en git, con su sha256 y el del archivo vivo (`previousSha256`), y se niega si hay cambios sin commit.
  3. `pnpm public-website:wpcli -- --eval-file scripts/public-website/deploy-site-nav-plugin-package.php --input-file
     <zip> --input-file <manifest> --wp-user 12`.

  El deploy valida la lista de rutas y los hashes, aborta si lo vivo cambió, respalda en un `.tar` del `/tmp` remoto,
  escribe el archivo principal al final y activa. Antes de activar limpia la caché de la lista de plugins: WP-CLI la
  lee al arrancar, y sin limpiarla la activación falla con «cabecera no válida» (pasó el 2026-10-22).
  Rollback: `wp plugin deactivate eo-site-nav` y restaurar el `.tar`.

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
- **Guardado a prueba de filtros del anfitrión (corrección del 2026-10-23):**
  - **JSON en ASCII escapado.** Los caracteres no ASCII y `&`, `<`, `>`, `'` y `"` se guardan escapados, así que ningún
    filtro de contenido puede alterarlo. Antes, `wp_encode_emoji` convertía «™» en `&#x2122;`, que el menú pintaba
    literal.
  - **«Sin cambios»** se decide comparando con el documento guardado.
  - **Lectura de vuelta.** Después de guardar, el documento se relee y debe dar el mismo hash; si no, el guardado
    falla con `eosn_storage_altered`.
  - **Revisiones por ID.** Las revisiones nativas se ubican por su ID, no comparando contenido. Las revisiones 2 y 3
    habían perdido su número porque un filtro del anfitrión alteró el JSON guardado; se repararon en producción con
    `scripts/public-website/site-nav/repair-revision-meta.php` (de un solo uso, sólo metadatos).
- **Validación:** contra el esquema `site-nav.v1`, copiado del contrato de AXIS con versión fijada. Si no pasa, no se
  guarda nada.
- **Admin (pendiente):** pantalla estructurada en Ajustes. Edita líneas, servicios, hijos, textos, fotos por recorte,
  alt y CTA, y muestra la vista previa y el historial. No usa «Apariencia → Menús». Falta construirla en `TASK-2041`
  con la dirección B (vista previa en vivo) y el árbol de la dirección A. Mientras tanto, el menú se cambia con
  `pnpm public-website:site-nav` (§Edición gobernada).
- **WP-CLI:**

  | Comando | Uso |
  |---|---|
  | `wp eo-nav export [--revision=N]` | Exporta el documento vigente o una revisión. |
  | `wp eo-nav validate --file=<ruta>` | Valida un documento sin guardarlo. |
  | `wp eo-nav apply --file=<ruta> --message="…"` | Guarda una nueva revisión con autor y mensaje. |
  | `wp eo-nav revisions` / `wp eo-nav restore <revisión>` | Lista revisiones y vuelve a una anterior. |

  Son la capa baja. Para cambiar el menú se usa `pnpm public-website:site-nav`, que escribe por el mismo servicio de
  guardado y agrega revisión base, revisión de enlaces y fotos, previsualización y purga (§Edición gobernada). Si un agente los corre directo, lo hace con
  `pnpm public-website:wpcli`, después de `pnpm public-website:ssh-check` y con la foto previa del documento. Escribir
  exige `--user` con la capability, y `apply --dry-run` valida sin guardar. `export --resolved` muestra Recursos como
  los vería el menú.
- **Copia pública:** `GET /wp-json/eo/v1/site-nav` (`?site=` opcional). Devuelve sólo el documento publicado, con
  `ETag`, `304` ante `If-None-Match` y `404` si el sitio no tiene documento.
- **Caché en efeoncepro.com (medida el 2026-10-22):**
  - El plugin envía `Cache-Control: public, max-age=300`, pero el borde de Kinsta (Cloudflare, `ki-cache-type: Edge`)
    lo reescribe como `public, max-age=0, s-maxage=86400` y guarda la copia hasta un día.
  - Lo que la mantiene al día es la purga de cada guardado: `purge_complete_caches()` limpia la caché del sitio y la del
    CDN, y el borde vuelve a pedir la REST al origen unos 40 s después. Medido en vivo: HIT con `age` creciente → `MISS`
    a los 43 s → HIT con `age: 10`. Un consumidor (Think, otro sitio) ve un guardado en menos de un minuto.
  - Kinsta omite esa purga si el autopurge del sitio está desactivado. Hoy está activo; el plugin debe pasar
    `force` para no depender de eso (pendiente de TASK-2041).
  - El borde de Kinsta se refresca entre unos 40 s y 2 min después de la purga. Un archivo PHP que ya existía y cambió
    puede tardar 1 a 2 min más por OPcache.
  - La REST es la lectura para Think y otros sitios. Publicarla además en el bucket de AXIS es una decisión abierta de
    PDR-027 (punto 3).
- **Permisos:** escribir requiere `manage_options` o una capability propia (`eo_manage_site_nav`). La REST pública es de
  sólo lectura.

Así se cumple Full API Parity: personas (admin, cuando exista) y agentes (WP-CLI y la CLI de Greenhouse) usan el mismo
command de guardado y la misma validación. Un MCP podrá llamar a esa misma puerta más adelante, sin lógica paralela.

## Edición gobernada desde Greenhouse (`pnpm public-website:site-nav`)

Es la forma de cambiar el menú vivo (`scripts/public-website/site-nav/cli.ts`). Trabaja sobre el documento publicado y
deja sus archivos de trabajo en `tmp/site-nav/`, que no se versiona. Su primer uso real produjo la revisión 4.

| Comando | Qué hace |
|---|---|
| `pull [--revision n] [--keep] [--mirror]` | Trae el documento vivo, o una revisión, como base de trabajo; `--mirror` refresca el espejo del runtime. |
| `show [selector]` | Muestra el documento o una parte. |
| `set` / `unset <selector> <campo[.sub]> <valor>` | Cambia o quita un campo. |
| `glyphs` · `glyph service:<id> <nombre>` | Lista el catálogo Trazo (60 glifos) y asigna uno a un servicio. |
| `photo <selector> --file --alt [--slug] [--crops mm,op,card] [--position] [--dry-run]` | Recorta (mm 880×472, op 996×1080, card 880×496), sube a `gs://efeonce-group-axis-public-media/site-nav/v1/` con `--no-clobber` y caché inmutable, y escribe las URLs. Si el nombre existe, sube `.vN`. |
| `add <padre> services\|lines\|items\|formats --json '{…}' [--after id\|--first]` · `remove` · `move` | Agrega, quita o reordena nodos. |
| `patch <ops.json>` | Aplica operaciones RFC 6902 (`add`, `replace`, `remove`). |
| `check` | Corre el validador del plugin, comprueba que enlaces y fotos respondan, que no haya entidades HTML y que los títulos de tarjeta quepan. |
| `fit` | Pinta en 1440, 1280 y 1200, recorre cada línea y lista los textos recortados. |
| `diff` | Compara con la base, por id. |
| `preview [--open soluciones] [--line growth]` | Capturas de escritorio y teléfono. |
| `apply --message [--dry-run]` | Ensayo en el servidor y después guardado contra la revisión base. Un guardado concurrente nunca se pisa. Purga. |
| `verify [--path]` | Revisa el menú publicado. |
| `revisions` · `restore <n> --message` | Lista revisiones y restaura una como revisión nueva. |

Selectores: `primary|line|service|format|item|case|reading|featured|strip|onepage:<id>`, `header`, `cta`, `logo` y
`footer`.

Las escrituras en producción (subir fotos, `apply` y `restore`) necesitan el go del operador. El script de guardado del
carril SSH/WP-CLI es `apply-site-nav-document.php` (entrada: documento + `{baseRevision, message, dryRun}`).

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
- **CTA publicado (2026-10-23, `scripts/growth/publish-site-nav-meeting-cta.ts`):**
  - CTA `site-nav-discovery-meeting`: acción `open_meeting_scheduler`, superficie de reuniones
    `fhsf-efeonce-lead-gen-web`, agendador `discovery` y rutas `/**`.
  - Superficie WordPress `csur-eb834d53-fd99-4f6b-9615-979e329e7d37`, que sólo admite ese CTA, con orígenes
    `efeoncepro.com` y `www.efeoncepro.com`.
  - La clave vive en Greenhouse en `.auth/site-nav-meeting-cta-surface.json` (permisos 0600, fuera de git). Volver a
    correr el publicador la rota, y la opción de WordPress debe seguirla con `set-site-nav-scheduler.php`.
- **Montaje en el sitio (en vivo desde el 2026-10-23):**
  - **Lanzador.** Un solo `<greenhouse-cta>` oculto por página, impreso en `wp_footer`, sólo cuando la opción
    `eo_site_nav_scheduler` tiene un `{cta, surface (csur-…), key}` válido. La opción se escribe con
    `set-site-nav-scheduler.php` (entrada `{cta, surface, key}` o `{"clear":true}`), que nunca imprime la clave y purga.
  - **Renderer.** `https://greenhouse.efeoncepro.com/growth-cta/renderer-latest.js` se carga cuando el navegador está
    ocioso o cuando el visitante se dirige al CTA. En las landings que ya lo cargan queda una sola copia.
  - **Clic antes de tiempo.** Si el renderer no está listo, el clic espera hasta 2,5 s.
  - **Lanzador vacío.** Si el lanzador queda vacío (`data-ghc-state="empty"`, por ejemplo CTA pausado u origen
    equivocado), el enlace va de inmediato a `/agenda/`.
- **`cta-location`:** el lanzador es uno y lleva `cta_location: site_nav`, porque el renderer lo lee al montar y no al
  hacer clic. El punto de entrada (`menu_header`, `menu_mega` o `menu_onepage`) viaja en `gh_site_nav_clicked`
  (§Medición).
- **Secuencia al abrir:** el menú cierra el mega o el onepage **antes** de abrir el diálogo y suelta su bloqueo de
  scroll. Al cerrar el diálogo, el foco vuelve al control que lo abrió o, si ya no se ve, a uno visible.
- **Piel del diálogo:** el diálogo que abre el lanzador del menú se marca `data-eo-meeting-skin="site"` y usa
  `assets/css/meeting-dialog.css` del tema. Es el marco aprobado para Inbound el 2026-10-18: sin contenedor, el agendador
  flotando sobre la página difuminada y un solo botón redondo para cerrar, con la paleta de `/agenda/` (acento
  `#36c8bf`, Growth). Lleva peso `:root` para ganarle a la piel de una landing; el diálogo del CTA propio de una landing
  conserva la suya.
- **Isla con el diálogo abierto:** la isla conserva su tono mientras el diálogo está abierto y después de cerrarlo
  (AXIS primitives 0.7.13, §Isla de vidrio). Verificado en vivo con Playwright a 1440 en
  `/servicios/posicionamiento-seo/`: isla `fixed` y oscura sobre la franja E-E-A-T con el agendador abierto, al cerrar
  con «Cerrar agenda» y con Escape, también con `<html>` pintado de blanco; el bloqueo de scroll del agendador
  (`overflow: hidden` en `<html>`) se libera al cerrar.
- **Verificado en vivo:** cabecera, mega y onepage de teléfono (pantalla completa); Escape y cerrar;
  `gh_site_nav_clicked` más `greenhouse_cta_clicked` y `greenhouse_cta_action_started` con `cta_location: site_nav`; sin
  errores en la página.
- **Otro consumidor del mismo CTA:** el dock de landings (`TASK-2043`) de Inicio y Redes Sociales declara
  `scheduler.source: "site_nav"`: lee la misma opción `eo_site_nav_scheduler`, monta su propio lanzador con
  `cta-location="landing_dock"` y usa la misma piel del diálogo. Rotar la clave con `set-site-nav-scheduler.php` cubre
  también esos docks.
- **Respaldo:** sin JavaScript, sin superficie o con el lanzador vacío, el botón es un enlace normal a `/agenda/`, la
  landing de agenda con «La órbita», indexable, que monta el mismo agendador nativo en línea y queda fuera de los menús
  por decisión del operador. Detalle: [landing Agenda](../../documentation/public-site/agenda.md).

## Medición

Eventos que emite el primitive y empuja el adaptador al `dataLayer`:

| Evento | Cuándo |
|---|---|
| `site_nav_open` | Se abre un panel; lleva `panel` (`soluciones`, `recursos`, `nosotros` u `onepage`). |
| `site_nav_line_view` | Se ve una línea; lleva `line`. |
| `site_nav_click` | Clic en un destino; lleva `target_type` (`logo`, `primary`, `line`, `service`, `case`, `reading`, `dropdown`, `format`, `resource`, `featured`, `strip`, `onepage`, `social`, `legal` o `cta`) y `target`. |
| `site_nav_cta` | Intención de agendar; lleva `cta_location` (`menu_header`, `menu_mega` o `menu_onepage`). El primitive cierra lo abierto, suelta el scroll y despacha además el evento DOM cancelable `axis-site-nav:cta`, que el sitio usa para abrir su agendador. |

En efeoncepro.com el adaptador (`TASK-2042`) los empuja con la convención del sitio, `gh_<objeto>_<acción>` en pasado:

| Evento del primitive | En el `dataLayer` | Parámetros que pasan |
|---|---|---|
| `site_nav_open` | `gh_site_nav_opened` | `panel` |
| `site_nav_line_view` | `gh_site_nav_line_viewed` | `line` |
| `site_nav_click` | `gh_site_nav_clicked` | `target_type`, `target` |
| `site_nav_cta` | No se empuja | — |

`site_nav_cta` queda fuera porque el mismo clic ya llega como `gh_site_nav_clicked` con `target_type: cta` y el punto de
entrada en `target`, y el agendador que abre emite su propia familia `greenhouse_cta_*`; empujarlo contaría el clic dos
veces y reviviría el rail legado `gh_cta_clicked`. Sólo pasan esas claves, con 100 caracteres como máximo: ids y
etiquetas del menú, nunca lo que escribe un visitante. Ningún evento del menú es key event.

Estado (2026-10-23): en producción se verificó `gh_site_nav_opened` en el `dataLayer` en el barrido de 55 URL, y
`gh_site_nav_clicked` en la prueba del agendador. El agendador emite `greenhouse_cta_*` con `cta_location: site_nav`. **Falta el alta en GTM y GA4**
de `gh_site_nav_*`, que pasa por la skill de medición con confirmación humana antes de publicar el contenedor. Registro:
[TRACKING-PLAN.md §CTAs](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md#ctas).

## Adaptador WordPress

Adaptador del tema `ohio-child`, archivo `inc/site-nav.php` (`TASK-2042`).

- **Enganche:** sobrescribe `parts/headers/header-style-1..8.php`. Cada parte imprime el menú o, si no aplica,
  requiere la parte original de Ohio.
- **Render una vez:** el menú se prepara una sola vez en el hook `wp`, antes de imprimir nada. Ante cualquier falla
  (plugin ausente, documento ausente o inválido, error de render) queda el encabezado de Ohio y se registra en el log
  como `[eo-site-nav] …`. Nunca sale una cabecera vacía.
- **Interruptor:** opción `eo_site_nav_enabled` (`off` / `pilot` / `on`) más `eo_site_nav_pilot_pages` para el piloto.
  En `off` o fuera de la lista, el sitio sigue con el encabezado de Ohio sin cambios. `/blog/` (#18456) está excluida
  siempre. Hoy: `on`.
- **Estado inicial:** hero oscuro sin espaciador → `top` en vidrio; espaciador de Ohio o hero claro
  (`EO_SITE_NAV_LIGHT_HERO_PAGES`) → `fixed` como isla clara sólida (§Cabecera).
- **Assets sólo donde se pinta el menú:**
  - archivos de AXIS con versión fijada en `assets/vendor/axis/site-nav/0.7.13/`, con un `VERSION.json` que lleva el
    sha256 de cada archivo, copiados del paquete publicado por `scripts/vendor-axis-site-nav.mjs` (PDR-024; nunca
    `-latest` ni registry);
  - las fuentes del menú;
  - `site-nav-host.css`, que sólo desplaza la cabecera bajo la barra de admin;
  - el módulo del anfitrión `site-nav-host.js`;
  - `meeting-dialog.css`, la piel del diálogo del agendador (§Agendador).
- **Render:** el de `EOSN_Render` del plugin, idéntico a `siteNavHtml` de la versión copiada (17 casos de paridad contra
  primitives 0.7.13 y contracts 0.7.12). Los enlaces salen en el HTML del servidor; `site-nav.js` se copia tal cual (no importa nada) y sólo mejora.
- **Contrato del anfitrión** (AXIS, [PRIMITIVES.md](PRIMITIVES.md)): el anfitrión nunca estiliza dentro de
  `.axis-site-nav`. Sus únicas entradas son `--axis-site-nav-offset` y `--axis-site-nav-z`. El anfitrión carga las
  fuentes: Bricolage Grotesque con ejes `opsz` y `wght` 200–800 (el menú no usa el eje de ancho) y Poppins 300–700.
- **Aislamiento del anfitrión** (AXIS primitives 0.7.8): cada regla del menú lleva peso de id
  (`:not(#axis-site-nav-isolation)`), y la raíz devuelve los valores del navegador para tipografía heredada, enlaces y
  su hover, botones, listas, márgenes de `li`, `vertical-align` de imágenes y `overflow-wrap`/`word-break`. Una prueba
  de navegador inyecta una hoja hostil copiada de Ohio.
- **Variantes de Ohio por página:** resueltas con el estado inicial de arriba; una página nueva que no encaje se
  corrige con la lista de héroes claros.
- **Doctrina:** al pasar a `on` en todo el sitio, se actualiza la referencia `native-navigation.md` de la skill del
  sitio. Su regla de conservar el menú de Ohio queda reemplazada para el encabezado global.

### Carriles de despliegue y operación

Todos van por SSH/WP-CLI con archivos de entrada, sha256, guarda de deriva y respaldo `.tar`. Ver la skill
`efeonce-public-site-wordpress` y `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`.

| Carril | Scripts | Notas |
|---|---|---|
| Plugin | `build-site-nav-plugin-package.cjs` + `deploy-site-nav-plugin-package.php` | §Plugin. |
| Plugin del dock | `build-landing-dock-plugin-package.cjs` + `deploy-landing-dock-plugin-package.php` | `eo-landing-dock`; §Dock inferior de las landings. |
| Tema | `build-site-nav-theme-package.cjs` + `deploy-site-nav-theme-package.php` | Lista permitida: `functions.php`, `inc/site-nav.php`, `header-style-1..8`, `site-nav-host.css`, `meeting-dialog.css`, `site-nav-host.js` y los archivos de AXIS copiados. Exige las 8 partes de cabecera de Ohio. Nunca cambia el interruptor; si no existe, lo crea en `off`. |
| Línea base | `export-live-code-baseline.ts` | Conserva `assets/vendor/axis/**` de `ohio-child` para que la guarda de deriva vea los archivos fijados. Incluye el plugin `eo-landing-dock` y su copia de AXIS. |
| Interruptor | `set-site-nav-switch.php` | Entrada `{"mode":"on"\|"pilot"\|"off","pilot":[ids]}`. Se niega a `on` sin plugin, adaptador y documento. Purga Kinsta e imprime el valor anterior. |
| Agendador | `set-site-nav-scheduler.php` | §Agendador. |
| Documento | `apply-site-nav-document.php` | §Edición gobernada. |
| Redirecciones | `create-yoast-redirect.php` | §Redirecciones. |

**Rollback:** `set-site-nav-switch.php` con `{"mode":"off"}` devuelve el encabezado de Ohio en todo el sitio. Probado
sólo en Playground; falta comprobarlo en producción.

### Subir la versión de AXIS en el tema

Ningún repo tiene los paquetes de AXIS instalados; la copia se hace desde el paquete publicado. Receta usada para
0.7.12 y 0.7.13:

1. `npm pack @efeoncepro/axis-ui-primitives@<v> @efeoncepro/axis-brand-assets@0.4.30`, con un `.npmrc` temporal (0600)
   armado desde `gh auth token` y borrado apenas termina.
2. En el runtime: `node scripts/vendor-axis-site-nav.mjs --primitives <pkg> --brand <pkg> --version <v> --source "…"`,
   que deja la carpeta `assets/vendor/axis/site-nav/<v>/` con su `VERSION.json` (sha256 de cada archivo).
3. Cambiar `EO_SITE_NAV_AXIS` en `inc/site-nav.php` y `git rm` la carpeta anterior.
4. Regenerar los datos de paridad con `node tests/fixtures/site-nav/generate-render-data.mjs <checkout de AXIS en el
   tag>`, correr las dos pruebas de paridad PHP (render y validador) y hacer commit.
5. `pnpm public-website:export-live-code` → `build-site-nav-theme-package.cjs <línea base>` →
   `deploy-site-nav-theme-package.php` (archivos de entrada `package.zip` y `manifest.json`).
6. `set-site-nav-switch.php` con `{"mode":"on"}` para purgar: conserva el modo e imprime el valor anterior.

El dock de las landings fija su propia copia de AXIS en el plugin `eo-landing-dock` (hoy primitives 0.7.14, contratos
0.7.12), independiente de la del tema; se sube con `scripts/vendor-axis-landing-dock.mjs` (§Dock inferior de las landings).

### Redirecciones (Loop Marketing → Inbound)

El operador decidió el 2026-10-23 que la landing de Loop Marketing no está optimizada. Desde la revisión 3, el servicio
enlaza a `/agencia-inbound-marketing/` y su matcher se quitó. `/landing-loop-marketing/` responde 301 hacia esa página
por Yoast Premium; la página 248840 quedó `noindex` para salir del sitemap, y el mu-plugin
`efeonce-redirect-query-passthrough` conserva la query UTM.

`create-yoast-redirect.php` recibe `{origin, target, noindexPostId?, dryRun?}`, usa sólo la API de Yoast Premium, se
niega si el origen ya existe o el destino no está publicado, relee lo guardado y purga.

## Adaptador Think (cuando se pida)

- **Componente:** uno de Astro que lee la copia pública al construir (o con caché del servidor) y llama al mismo render
  de AXIS.
- **Agendador:** monta su propio `<greenhouse-cta>` con su superficie (`GREENHOUSE_CTA_SURFACE_ID` y su clave desde
  `astro:env/server`, como `GrowthCtaDock.astro`).
- **Enlaces:** los relativos se resuelven contra `https://efeoncepro.com`, salvo los que el documento marque como
  propios de Think.

## Implementación en AXIS (`TASK-2040`)

Construido en `axis-design-system` (commits `8327593`, `0c8a230` y `5e97c59`, 2026-10-22) y publicado en GitHub
Packages. Versiones que importan al sitio:

| Versión (tag) | Qué trae |
|---|---|
| primitives 0.7.8 (`v0.7.8`; el tag `v0.7.2` ya estaba tomado) | Isla de escritorio de 61 px + borde (63) con ítems sueltos y botón del agendador de 45 px; desplazamiento del anfitrión `--axis-site-nav-offset`; aislamiento del anfitrión con prueba de hoja hostil (§Adaptador WordPress). |
| contracts 0.7.9 + primitives 0.7.9 (`v0.7.9`) | «Estás aquí» desde el `href` del servicio, regla de host y export `siteNavLocalPath` (§Reglas del documento). |
| primitives 0.7.10 (`v0.7.10`) | Radio del círculo del onepage hasta la esquina más lejana (§Motion). |
| primitives/contracts 0.7.12 (`v0.7.12`; el tag `v0.7.11` se detuvo antes de publicar) | Lectura del tono de la isla: un degradado decide por la luminancia media de sus paradas opacas, una imagen de fondo cuenta como oscura, un color con alfa menor a 0,5 no decide y el chrome fijo o sticky del anfitrión (barra del tema, chat, aviso de cookies, el dock de landings) se salta. Corrige la isla clara sobre la franja E-E-A-T navy de `/servicios/posicionamiento-seo/`, verificado en vivo. Copiada en `ohio-child` de 04:07 a 04:28 UTC del 2026-10-23. |
| primitives 0.7.13 (`v0.7.13`) | La isla conserva su tono con un diálogo modal abierto (el agendador): se saltan los elementos no visibles (`checkVisibility`) y, si lo primero bajo la isla es `<html>`, el tono no cambia; en un anfitrión que pinte `<html>` la isla se volvía clara detrás del diálogo y después de cerrarlo. Misma guarda que el dock. Verificado en vivo con Playwright: oscura sobre la franja E-E-A-T con el agendador abierto, al cerrar con el botón y con Escape, también con `<html>` pintado de blanco; el bloqueo de scroll se libera al cerrar. Es la versión copiada en `ohio-child` desde el 2026-10-23 04:28 UTC. |

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
- El tono de la isla sigue `data-site-nav-tone` y, si falta, el fondo de lo que tiene debajo (§Isla de vidrio, regla
  completa de 0.7.12 y 0.7.13).
- El JS lee los tiempos de las variables CSS en `ms` o `s`, porque un minificador puede reescribir `150ms` como `.15s`.

Notas de verificación y límites: `docs/quality/site-nav.md` en AXIS. Contrato del anfitrión:
[PRIMITIVES.md](PRIMITIVES.md).

Diseño aprobado, no defecto: bajo 1440 px la descripción de un servicio ocupa una línea con puntos suspensivos (en
1280 se cortan contenidos, redes sociales, medios, performance e inbound, igual en el Lab que en vivo); en 1440 debe ir
completa. Es el tablero Mega1280 del canvas, confirmado por la sesión de fidelidad el 2026-10-23. `site-nav fit` lista
esos cortes de 1280 como esperados y sólo falla en 1440.

## Dock inferior de las landings (`TASK-2043`)

El segundo cromo del sitio: la barra de vidrio fija abajo que acompaña la lectura de una landing con su siguiente paso.
Reemplaza los siete docks que cada landing dibujaba por su cuenta. Lo aprobó el operador en el canvas (versión 80, fila
«Dock inferior de las landings»): «Apruebo el dock en vidrio; pásaselo a la sesión del menú para construirlo en AXIS y
en las landings».

**Relación con el menú.** El dock se salta el menú (`[data-axis-site-nav]`) al leer su propio tono y los dos leen el
tono de la misma forma (§Isla de vidrio). El dock se retira mientras un panel o el onepage del menú están abiertos. En
Inicio y Redes Sociales abre el agendador del menú (§Agendador). Funcionamiento y operación del dock:
[Dock de las landings](../../documentation/public-site/dock-de-landings.md) y
[Operar el dock de las landings](../../manual-de-uso/public-site/operar-dock-de-landings.md).

| Capa | Dónde | Qué hace |
|---|---|---|
| Mecanismo | AXIS: tokens `axisLandingDock`, contrato `efeonce.landing-dock`, esquema `landing-dock.v1`, `@efeoncepro/axis-ui-primitives/landing-dock` (`landingDockHtml`), `./landing-dock.css`, `./landing-dock.js` | Render de servidor, CSS aislado con peso de id y JS sin dependencias. Vidrio = las dos recetas de la isla (`axisSiteNav.island`). |
| Documento | `efeonce-public-site-runtime/manifests/landing-dock/<landing>.json` | Documento `landing-dock.v1` con el copy de la landing, marcadores de inicio y final, agendador y dock viejo que reemplaza. Sin claves. |
| Sitio | Plugin `eo-landing-dock` | Meta `_eo_landing_dock` por página: con él pinta el dock (port PHP byte a byte igual a AXIS), un lanzador `<greenhouse-cta cta-location="landing_dock">` oculto y retira del HTML el dock viejo; sin él, la página queda como estaba. `wp eo-dock`. |
| Operación | `pnpm public-website:landing-dock` | `preview` sobre la landing real sin escribir, `snapshot`, `on`/`off` con `--confirm`, `verify`, `status`. |

**Estado (2026-10-23).** En vivo en las siete landings: AXIS `v0.7.12` a `v0.7.14` (primitives 0.7.14, contracts
0.7.12, tokens 0.6.9, registry 0.7.5) y plugin `eo-landing-dock` con la copia 0.7.14. Encendidas una por una con
snapshot y aprobadas en vivo por la sesión de fidelidad: Inbound (04:07 UTC), HubSpot, Performance, Inicio, Redes
Sociales, SEO e Influencers (04:47 UTC). Presencia de hoy por decisión del operador («Dejar como hoy») e Influencers con un
solo botón en teléfono («Un solo botón»).

**Las siete landings.**

| Landing | Página | Presencia | Acciones (principal · secundaria) | Agendador | Parada | Dock viejo retirado |
|---|---|---|---|---|---|---|
| Redes Sociales | 251300 | escritorio | «Reunión» · «Auditoría» → `#auditoria` (texto «¿Listo para crecer en social?») | menú (`site-nav-discovery-meeting`) | — | `div#ghrs-sticky` |
| Influencers | 251627 | ambos (teléfono: sólo la principal) | «Agenda una reunión» · «Cuéntanos tu campaña» → `#conversion` (antetítulo «Siguiente paso») | propio (`influencer-discovery-meeting`) | `#conversion` | `div#sticky-cta` |
| Inicio | 251731 | teléfono | «Agenda una reunión» (sin línea) | menú (`site-nav-discovery-meeting`) | — | `div[data-sticky-cta]` |
| SEO | 251078 | teléfono | «Diagnostica tu visibilidad» → `#grader` | — | `#grader` | `div.mcta` |
| Inbound | 242601 | teléfono | «Agenda una reunión» · «Diagnóstico» → `#diagnostico` | propio (`inbound-discovery-meeting`) | — | `nav.mbar` |
| Servicios HubSpot | 244079 | teléfono | «Agendar reunión» · «Ir al formulario» → `#agenda-form` | propio (`hubspot-discovery-meeting`) | — | `nav.mdock` |
| Performance | 251997 | teléfono | «Agenda un diagnóstico» → `#diagnostico` | — | `#diagnostico` | `nav.mbar` |

Todas sirven AXIS primitives 0.7.14 desde el plugin `eo-landing-dock`; el agendador del dock mide
`cta-location="landing_dock"`. La vuelta atrás, por landing o global, está en el párrafo «Vuelta atrás» de esta
sección.

**Comportamiento.** Aparece cuando el fondo del hero queda sobre la mitad de la ventana; se retira a 120 px del
formulario o CTA final; un marcador de parada (`stop`) lo deja oculto desde el destino de su botón hasta el final
(SEO `#grader`, Performance `#diagnostico`, Influencers `#conversion`; Inicio e Inbound sin parada, como sus docks
anteriores); con un panel o el onepage del menú abiertos y cuando el banner de cookies de HubSpot
(`#hs-eu-cookie-confirmation`) se superpone con su lugar. El tono sigue lo que tiene detrás (`data-site-nav-tone`,
fondo al menos medio opaco, paradas de gradiente; foto = oscuro), salta el cromo fijo del anfitrión y conserva su tono
mientras un diálogo modal (el agendador) deja la página inerte. Escritorio: centrado a 20 px; teléfono (≤ 768 px): a 12 px de los bordes, sin texto, con
los botones repartidos según su etiqueta. `presence` deja el dock sólo en escritorio o sólo en teléfono.

**Agendador.** El primitive no lo abre: emite `axis-landing-dock:cta` y el script del plugin abre el `<greenhouse-cta>`
oculto. Inbound, HubSpot e Influencers usan su propio CTA de reunión; Redes Sociales e Inicio el del menú
(`site-nav-discovery-meeting`), que agenda con la misma página de HubSpot (`efeoncepro/agenda-discovery`, scheduler
`discovery`) que tenían. Todos miden `cta-location="landing_dock"`. SEO y Performance siguen como enlaces a su
formulario porque no agendan.

**Invariantes del dock.** Un dock por página; el viejo y el nuevo nunca conviven (el viejo sólo se quita mientras el
nuevo está encendido); el copy es el de cada landing y una etiqueta corta de teléfono es copy (operador); ningún valor
de diseño del dock vive en el plugin ni en el tema; la clave de una superficie nunca entra a un repositorio (se lee del
HTML en vivo al aplicar).

**Vuelta atrás.** Por landing: `pnpm public-website:landing-dock off <landing> --confirm` (borra el meta, purga y
verifica que el dock viejo volvió). Global: desactivar el plugin. Antes de encender una landing se guarda un snapshot
de la página (contenido, datos de Elementor y meta del dock) en `greenhouse-eo/tmp/landing-dock/snapshots/`.

**Despliegue del plugin.** `node scripts/public-website/build-landing-dock-plugin-package.cjs <baseline>` (la línea base
de `export-live-code` incluye el plugin y su copia de AXIS; el armado rechaza una copia local de AXIS) y
`deploy-landing-dock-plugin-package.php` por `pnpm public-website:wpcli`: lista de rutas permitidas, hashes, guarda de
deriva, respaldo `.tar`, archivo principal al final y activación. El deploy nunca escribe la config de un dock: sin meta
`_eo_landing_dock` ninguna página cambia. Después, `pnpm public-website:landing-dock purge` (una URL puede tardar
cerca de un minuto). La copia de AXIS vive en `assets/vendor/axis/landing-dock/<versión>/` con `VERSION.json` (sha256),
copiada del paquete publicado por `scripts/vendor-axis-landing-dock.mjs`; el `.gitignore` del runtime tiene una
excepción para ese directorio.

**Medición.** El primitive emite `landing_dock_view`, `landing_dock_click` y `landing_dock_cta`; `landing-dock-host.js`
empuja sólo el clic, como `gh_landing_dock_clicked` con `target_type` y `target` (40 caracteres como máximo). El
agendador que abre emite `greenhouse_cta_*` con `cta_location: landing_dock`, que reemplaza `inbound_mobile_dock` y
`hubspot_mobile_dock`. Falta el alta de `gh_landing_dock_clicked` en GTM y GA4 (con confirmación humana antes de
publicar el contenedor). Registro: [TRACKING-PLAN.md §CTAs](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md#ctas).

**Landing nueva.** Un dock en otra landing usa este mismo dock: un archivo `manifests/landing-dock/<landing>.json` en el
runtime y el alta de la página en la lista permitida del plugin (`EOLD_PAGES`, filtrable con `eo_landing_dock_pages`),
nunca un dock propio.

**Pendientes del dock.** Retirar el código de los siete docks antiguos (hoy sólo se quitan del HTML mientras el nuevo
está encendido); un puente del agendador compartido entre `site-nav-host.js` y `landing-dock-host.js`; alta de
`gh_landing_dock_clicked` en GTM y GA4.

## Invariantes

1. **Una sola fuente de verdad del menú:** el documento vivo del plugin. Ningún otro archivo editable compite con él:
   el constructor del runtime sólo sirve para el arranque y el JSON del runtime es un espejo.
2. **HTML de servidor primero:** ningún destino depende de JavaScript para existir.
3. **Sin React** en el sitio público; JS liviano sin framework.
4. **AXIS con versión fijada** en cada sitio; los valores de diseño salen de tokens, nunca HEX ni px a mano en el sitio.
5. **Un panel abierto a la vez**; el mega y el onepage nunca juntos.
6. **Fotos versionadas e inmutables**, cargadas al abrir y nunca al entrar.
7. **Rollback en un paso:** apagar el interruptor devuelve el encabezado de Ohio.
8. **La clave del agendador** nunca sale del sitio que la usa ni se escribe en documentos, commits o mensajes.
9. **El anfitrión no estiliza dentro del menú:** sólo pasa `--axis-site-nav-offset` y `--axis-site-nav-z` y carga las
   fuentes.
10. **El menú se cambia con `pnpm public-website:site-nav`** (o el admin cuando exista), contra la revisión base;
    nunca editando el JSON guardado ni el espejo.

## Rollout y rollback

| Paso | Qué se verifica | Estado | Vuelta atrás |
|---|---|---|---|
| Contrato y primitive publicados en AXIS | Lab, pruebas de teclado y foco, 390 px y contraste. | Hecho: 0.7.8 a 0.7.13. | Versión anterior del paquete. |
| Plugin desplegado (`off`) | Documento inicial validado, revisiones, REST pública, WP-CLI. | Hecho 2026-10-22. | Desactivar el plugin. |
| Fotos en el bucket | Lectura pública, caché inmutable, alt. | En uso en el menú vivo. | Nada que revertir: objetos nuevos e inmutables. |
| Piloto (`pilot`, una página) | Desktop y 390 px, sin scroll horizontal, agendador abre y devuelve foco, eventos en `dataLayer`, Core Web Vitals sin regresión. | Omitido por decisión del operador. | Interruptor a `off`. |
| Todo el sitio (`on`) | Variantes de Ohio resueltas, landings, Glitch, 404, archivo. | Hecho 2026-10-23 00:09 UTC; barrido de 55 URL. `/blog/` excluida. | Interruptor a `off` + purga de Kinsta (probado sólo en Playground). |
| Agendador nativo | Abre desde cabecera, mega y onepage; Escape; foco; eventos. | Hecho 2026-10-23. | Opción `eo_site_nav_scheduler` con `{"clear":true}`: el botón vuelve a ser enlace a `/agenda/`. |

## Pendientes

- Alta en GTM y GA4 de `gh_site_nav_*`, con confirmación humana antes de publicar el contenedor.
- Medir Core Web Vitals contra la cabecera anterior.
- Comprobar en producción la vuelta a `off` (sólo se probó en Playground).
- Admin de `TASK-2041` (dirección B con vista previa en vivo y el árbol de la dirección A).
- Destino de la copia pública: REST de WordPress sola, o también en el bucket (PDR-027, punto abierto 3).
- Orden de los servicios por línea (Inbound quedó en Revenue).
- Si las respuestas aprobadas por línea («Tu squad», «Visible»…) viven también en el menú.
- URL real del canal de YouTube: hoy el sitio apunta a `facebook.com/colabrio`, un resto del tema.
- Influencer y Performance no tienen lectura propia en el blog y muestran la de su línea.

Resueltos: el alcance en todo el sitio (PDR-027, 2026-10-18) y el encendido sin piloto (operador, 2026-10-23). El
corte de descripciones bajo 1440 px es el diseño aprobado (tablero Mega1280: `white-space: nowrap; overflow: hidden;
text-overflow: ellipsis`; §Implementación en AXIS). El dock inferior de las landings quedó en vivo con `TASK-2043`
(§Dock inferior de las landings). Las tarjetas de línea de Growth, Engine y Voice usan posts reales; 10 de los 16 títulos de lectura que la tarjeta cortaba se
acortaron con las palabras del propio post, y todos los títulos de tarjeta caben en 1440, 1366, 1280 y 1200.

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
- Funcionamiento en lenguaje simple: [Navegación global del sitio](../../documentation/public-site/navegacion-global-del-sitio.md).
- Medición: [TRACKING-PLAN.md §CTAs](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md#ctas).
