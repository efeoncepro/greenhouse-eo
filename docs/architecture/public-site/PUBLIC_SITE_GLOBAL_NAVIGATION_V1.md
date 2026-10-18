# Navegación global del sitio público V1

Estado: **Propuesta · sin implementar**

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
| Subiendo | Aparece fija, sólida en navy Efeonce (`#001a33`), con borde inferior suave y logo claro. El botón del agendador pasa a sólido blanco. | 72 px |

Contenido de la cabecera de escritorio, de izquierda a derecha:

1. **Hamburguesa:** convive con la cápsula en escritorio, según la «Opción 2» del operador del 2026-10-17.
2. **Logo:** 164 px de ancho arriba y 140 px en la cabecera fija.
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
- **Franja inferior:** invita a suscribirse a Glitch.
- **Glitch** se nombra con su logo oficial negativo de AXIS. El resto de su línea gráfica no entra al menú.
- **Esfera:** una sola por panel, en el acento de Growth.
- **Contenido dinámico:** el centro y el destacado se alimentan de los últimos posts (§Datos dinámicos).

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
| Botón del agendador | En vidrio: al pasar el mouse se ilumina y sube 1 px; al presionar baja a 98 %. En sólido: pasa a `#cfe4fa` y sube 1 px (250 ms). |

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

## Modelo de datos — documento `site-nav.v1`

Un documento JSON por sitio. El esquema vive en el contrato de AXIS y el plugin lo valida antes de guardar. Esta forma
indica la intención; el esquema definitivo se fija en la tarea del contrato:

```jsonc
{
  "schema": "site-nav.v1",
  "site": "efeoncepro.com",
  "revision": 12,                        // la asigna el plugin
  "updatedAt": "2026-10-18T15:00:00Z",
  "header": {
    "logo": { "variant": "negative", "href": "/" },
    "cta": { "label": "Agenda tu diagnóstico", "action": "open_meeting_scheduler", "fallbackHref": "/agenda/" }
  },
  "primary": [
    { "id": "inicio", "label": "Inicio", "href": "/" },
    { "id": "nosotros", "label": "Nosotros", "panel": "dropdown", "items": [ /* 3 destinos con descripción */ ] },
    { "id": "soluciones", "label": "Soluciones", "panel": "lines", "lines": [
      { "id": "growth", "label": "Growth", "accent": "growth", "answer": "…",
        "photo": { "mm": "https://storage.googleapis.com/efeonce-group-axis-public-media/site-nav/v1/growth-mm.webp",
                   "op": "…/growth-op.webp", "alt": "…" },
        "case": { "label": "…", "href": "…" },
        "services": [
          { "id": "loop", "label": "Loop Marketing", "href": "…", "glyph": "loop", "answer": "Ciclo a ciclo",
            "photo": { "mm": "…", "op": "…", "alt": "…" }, "reading": { "label": "…", "href": "…" } }
        ] }
    ] },
    { "id": "recursos", "label": "Recursos", "panel": "editorial", "formats": [
      { "id": "glitch", "label": "Glitch", "brandMark": "glitch-negative", "source": { "kind": "wp-category", "ref": "glitch" },
        "featured": { "title": "…", "href": "…", "photo": { "mm": "…", "alt": "…" } } }
    ] },
    { "id": "contacto", "label": "Contacto", "href": "/contacto/" }
  ],
  "onepage": { "footer": { "social": [ /* redes */ ], "legal": [ /* enlaces */ ] } },
  "context": { "matchers": [ { "path": "/servicios/loop-marketing/", "line": "growth", "service": "loop" } ] }
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

### Datos dinámicos (Recursos)

El centro y el destacado de Recursos muestran lo último de cada formato. Se resuelven **en el servidor del sitio**, al
pintar el menú, a partir de `source` (categoría de WordPress, o feed de Think para Glitch y las herramientas), con caché
corta (transient de 10 a 15 min). Si la fuente falla, se usa el `featured` fijo del documento; el menú nunca queda vacío
ni bloquea la página. El navegador no consulta la REST de WordPress.

## Plugin «EO Navegación» (fuente de verdad)

Plugin propio en `efeonce-public-site-runtime/wp-content/plugins/` (nombre de directorio por definir en la tarea).

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
  previa del documento.
- **Copia pública:** `GET /wp-json/eo/v1/site-nav`. Devuelve sólo el documento publicado, con `ETag` y
  `Cache-Control` corto. Es la lectura para Think y otros sitios. La publicación adicional en el bucket de AXIS es una
  decisión abierta de PDR-027.
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
  | `op-s` | por definir | onepage de tableta horizontal |

  Todos en webp. Tableta vertical y teléfono no llevan foto.
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

## Medición

Eventos que emite el primitive y empuja el adaptador al `dataLayer`:

| Evento | Cuándo |
|---|---|
| `site_nav_open` | Se abre un panel; lleva `panel` (`soluciones`, `recursos`, `nosotros` u `onepage`). |
| `site_nav_line_view` | Se ve una línea; lleva `line`. |
| `site_nav_click` | Clic en un destino; lleva `target_type` (`service`, `case`, `reading`, `resource`, `diagnosis` o `contact`) y `target`. |

Los nombres finales y su alta en GTM y GA4 se cierran en la tarea del adaptador, con la skill de medición. No se envía
PII.

## Adaptador WordPress

- **Ubicación:** override del encabezado en `ohio-child`. El punto exacto de enganche del header de Ohio se confirma en
  el discovery de la tarea; queda **[verificar]**.
- **Interruptor:** opción `eo_site_nav_enabled` (`off` / `pilot` / `on`) más una lista de páginas para el piloto. En
  `off` o fuera de la lista, el sitio sigue con el encabezado de Ohio sin cambios.
- **Assets de AXIS:** copiados con versión fijada en `assets/vendor/axis/<versión>/`, según PDR-024; nunca `-latest`
  ni registry.
- **Render:** en PHP, desde el documento. Los enlaces salen en el HTML del servidor; `site-nav.js` sólo mejora.
- **Variantes de Ohio por página:** encabezado transparente u oscuro y logo fijo, controlados por metas de Ohio y ACF.
  Se inventarían y cada una se resuelve con un estado del primitive (arriba, fija o sólida) o se documenta como
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

- Alcance en todo el sitio y piloto primero (PDR-027, decisiones abiertas 1 y 2).
- Destino de la copia pública: REST de WordPress sola, o también en el bucket (PDR-027, decisión abierta 3).
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
