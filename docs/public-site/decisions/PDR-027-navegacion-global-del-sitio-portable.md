# PDR-027 — Navegación global del sitio, portable entre sitios

> **Tipo:** Product Decision Record de plataforma del sitio público.
> **Estado:** Accepted · 2026-10-18 · el operador decidió el alcance y el piloto el mismo día (§Decisiones del operador). Queda
> abierta sólo la copia pública en el bucket, que se decide en la fase de Think.
> **Ejecución:** [EPIC-055](../../epics/to-do/EPIC-055-public-site-global-navigation.md) con tres tasks: `TASK-2040`
> (mecanismo en AXIS), `TASK-2041` (plugin, contenido y fotos) y `TASK-2042` (puesta en el sitio). Las siete fases de
> §Fases se reparten entre esas tres tasks.
> **Arquitectura:** [Navegación global del sitio público V1](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md).
> **Diseño aprobado:** canvas «Menú del sitio» —
> [claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj](https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj) (versión 67 al
> 2026-10-18). Tablero de referencia: «Menú completo · escritorio» (cápsula con mega menús + hamburguesa con onepage),
> más Recursos, Nosotros, 1280/1200, tableta 1024/834 y móvil.
> **Runtime afectado:** `efeonce-public-site-runtime` (tema `ohio-child` y plugins propios, Kinsta) hoy; `efeonce-think`
> (Astro) u otro sitio cuando el operador lo pida.
> **Relacionados:** [PDR-024](PDR-024-axis-en-el-sitio-publico-composicion-agentica.md) (AXIS en el sitio, Draft) ·
> [PDR-026](PDR-026-cada-landing-deriva-su-patron-de-diseno.md) (mecanismos, no estéticas) ·
> [PRIMITIVES.md](../../architecture/public-site/PRIMITIVES.md) (precedente `EfeonceMention`) ·
> [arquitectura de Growth Meetings](../../architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md).
> **Skills:** `efeonce-public-site-wordpress`, `axis-design-system`, `efeonce-graphic-line`, `greenhouse-growth-ctas`,
> `seo-aeo`, `modern-web-guidance`, `web-perf-design`, `astro`.

## Contexto

El 2026-10-18 se cerró en un canvas el diseño de la nueva navegación de `efeoncepro.com`:

- **Escritorio:** una cápsula de vidrio con Inicio, Nosotros, Soluciones, Recursos y Contacto. Soluciones, Recursos y
  Nosotros abren mega menús con foto por servicio, y la cabecera se vuelve fija al bajar. El botón «Agenda tu
  diagnóstico» abre el agendador nativo.
- **Onepage:** una hamburguesa abre un menú a pantalla completa con líneas, servicios, hijos y fotos. Convive con la
  cápsula en escritorio («Opción 2» del operador).
- **Tableta y móvil:** tienen sus propias variantes.
- **Vidrio:** cápsula, botón y hamburguesa comparten una sola receta, probada sobre navy, negro, resplandor y fotos, con
  contraste medido.

El operador pidió dos cosas: publicarlo en WordPress y que, más adelante, Think u otro sitio que elija pueda usar el
mismo menú «con sus propiedades y capacidades».

Hechos verificados el 2026-10-18:

1. **El encabezado actual viene del tema padre Ohio, con el menú clásico de WordPress.** Es el término 61, «Menu 1»,
   renderizado como `#menu-primary` y `#mobile-menu`. Ohio ya tiene un mega menú propio, y en «Soluciones» está activado
   pero sin fotos ni descripciones. `ohio-child` no sobrescribe el encabezado.
2. **La doctrina vigente prohíbe reemplazarlo.**
   - `native-navigation.md` dice «Keep Ohio's existing menu rendering; do not replace global chrome».
   - `runtime-and-discovery.md` dice que se use el mega menú de Ohio «before building a custom mega menu».
   - `PUBLIC_MISCELLANEOUS_SURFACES_V1.md` trata el encabezado como cromo compartido.
3. **El compilador canvas → Elementor existe, pero sólo para cuerpos de página.** Su regla es conservar el encabezado y
   el pie de Ohio.
4. **AXIS no tiene contrato ni primitive de navegación.** Lo más cercano es el campo `nav` de
   `efeonce.surface-composition`, que describe el encabezado dibujado dentro de un hero compuesto; no es un menú en
   ejecución.
5. **Ya hay un precedente de mecanismo portable.** `EfeonceMention` siguió el camino landing → AXIS
   (`efeonce.mention`, `@efeoncepro/axis-ui-primitives` ≥ 0.6.9) → cada sitio. WordPress lleva una copia exacta del CSS
   del paquete y Think tiene una envoltura Astro delgada.
6. **El sitio no admite una aplicación React.** `wordpress-custom-widgets-react-strategy.md` sólo permite JS liviano o
   la Interactivity API.
7. **El agendador exige una superficie y una clave por sitio.** El botón usa Growth CTA
   (`<greenhouse-cta>`, `renderer-latest.js`, acción `open_meeting_scheduler`), y la autoridad depende del sitio. Hoy
   cada CTA está atado a una landing; no hay uno para todo el sitio.
8. **El contenido del menú no existe como dato compartido.**
   - En WordPress vive en los ítems del término 61, cuyos metadatos no alcanzan para líneas ni fotos por recorte.
   - En `efeonce-web` hay un `nav.ts` escrito a mano, sin relación con WordPress.
   - Think no tiene encabezado.
9. **Ya existe un bucket público de AXIS que sirve para las fotos.** Es `gs://efeonce-group-axis-public-media`, de lectura
   pública (`allUsers` con `storage.objectViewer`), multirregión EE. UU. y con acceso uniforme. Ya guarda firma de correo,
   motion del logo, kit de Nexa, Glitch, Sparks y perfiles sociales. Sus objetos salen hoy con `Cache-Control: public,
   max-age=300`.

## Decisión

**La navegación global se construye una vez como mecanismo portable y cada sitio la consume con un adaptador delgado.
El contenido del menú es un solo documento de datos con una sola fuente de verdad.**

### 1. Tres capas

| Capa | Qué es | Dónde vive |
|---|---|---|
| **Mecanismo** | Cápsula, mega menús, onepage, cabecera fija, vidrio, motion, teclado, foco, movimiento reducido y estados de tableta y móvil. HTML que se renderiza en el servidor, CSS y JS liviano, sin React. | AXIS: contrato nuevo (nombre propuesto `efeonce.site-nav`), primitive en `@efeoncepro/axis-ui-primitives`, página en el Lab. |
| **Contenido** | Un documento de navegación con ítems, líneas, servicios, hijos, descripción, fotos por recorte, texto alternativo e intención del CTA. Lo valida el esquema del contrato. | Plugin propio de WordPress (§2), con copia pública para otros sitios. |
| **Adaptador** | Pieza de cada sitio que lee el documento, pinta el mecanismo y conecta el CTA de su propia superficie. | WordPress: parte del tema `ohio-child` o plugin del runtime. Think: envoltura Astro, cuando se pida. |

Es el mismo camino de `EfeonceMention`: el diseño se aprueba en un sitio, el mecanismo se sube a AXIS y cada sitio lo
consume. Un cambio de diseño se hace una vez en AXIS, y cada sitio sube su versión fijada.

### 2. El contenido: un plugin con tres puertas

Un plugin propio, nombre de trabajo «EO Navegación», en `efeonce-public-site-runtime`, guarda el menú como **un solo
documento**, validado contra el esquema del contrato. Ese documento es la fuente de verdad, y tiene tres puertas que
escriben o leen lo mismo:

1. **Admin de WordPress, para personas.** Una pantalla estructurada que respeta el diseño: líneas, servicios, hijos,
   descripción, foto por recorte y CTA. No se usa «Apariencia → Menús», porque no guarda esa estructura.
2. **Comandos WP-CLI, para agentes.** Por ejemplo `wp eo-nav export`, `wp eo-nav validate --file` y
   `wp eo-nav apply --file`, por la vía gobernada de siempre: `pnpm public-website:wpcli`, foto previa, validación contra
   el esquema y, si falla, no aplica nada. El «archivo de datos» es lo que se exporta e importa, nunca una segunda fuente
   editable. Una herramienta de Greenhouse o MCP podrá llamar a esta misma puerta más adelante.
3. **Copia pública, para otros sitios.** Cada guardado publica el documento en JSON. Think, o el sitio que se elija, lo
   lee de ahí y no depende de que WordPress esté arriba. El destino final de esa copia se decide en la fase de Think
   (§Decisiones abiertas, punto 3).

Cada guardado, de una persona o de un agente, queda como **revisión con autor y fecha**, y se puede volver a una
anterior. La exportación puede guardarse en el repo del runtime como respaldo y para revisar diferencias, nunca como
fuente editable.

### 3. Las fotos: bucket público de AXIS

- **Destino:** `gs://efeonce-group-axis-public-media/site-nav/v<N>/`, servido por
  `https://storage.googleapis.com/efeonce-group-axis-public-media/site-nav/...`. Las URLs van en el documento de
  navegación.
- **Nombres versionados e inmutables:** una foto nunca se sobrescribe. Si cambia, se sube como archivo nuevo (por
  ejemplo `guias-mm.v2.webp`) y se actualiza el documento.
- **Caché de un año:** `Cache-Control: public, max-age=31536000, immutable`, sólo para la carpeta `site-nav/`. No se
  cambia la caché de los objetos que ya existen en el bucket.
- **Recortes por foto:**

  | Recorte | Medida | Uso |
  |---|---|---|
  | `op` | 996×1080 | onepage |
  | `mm` | 880×472 | mega menú |
  | `mm` de tarjeta | 880×496 | tarjeta del mega |
  | móvil | por definir | móvil |

  Todos en webp. El bucket no redimensiona.
- **Quién sube:** la subida a ese bucket la hacen agentes u operadores con credenciales de GCP. El plugin no sube al
  bucket, para no poner credenciales de GCP en Kinsta. Una persona en el admin puede elegir una foto de la biblioteca de
  WordPress, que pasa por el CDN de Kinsta; esa URL también funciona en otros sitios.
- **Coordinación:** la subida se hace en la fase de fotos, coordinada con cualquier sesión que esté tocando AXIS en ese
  momento.
- **Cloud CDN con dominio propio:** queda fuera por ahora. Exige un balanceador de carga con costo fijo, y se puede
  agregar después cambiando sólo la base de las URLs.

### 4. El CTA

«Agenda tu diagnóstico» usa Growth CTA con una **superficie y una clave propias para el encabezado global de cada
sitio**: una para `efeoncepro.com` y otra para Think cuando toque. La clave es secreta y no se copia a documentos,
commits ni mensajes. Si falta, el botón cae a un enlace normal a `/agenda/`.

### 5. Invariantes

- **SEO:** los enlaces del menú vienen en el HTML del servidor; el JavaScript sólo mejora. Ningún destino depende de JS
  para existir.
- **Sin React** en el sitio público. AXIS se consume con versión fijada, copiada a `assets/vendor/axis/<versión>/` como
  dice PDR-024, nunca con `-latest`.
- **Una sola fuente de verdad** del menú, que es el documento del plugin. Prohibido un segundo archivo editable que
  compita con él.
- **Las fotos del menú se cargan al primer hover o al abrir**, no todas al entrar a la página.
- **Accesibilidad:**
  - Teclado completo.
  - `aria-expanded` en cada disparador.
  - Foco contenido dentro del onepage y devuelto al cerrar.
  - Escape cierra.
  - Respeta el movimiento reducido.
  - Contraste del texto sobre el vidrio ≥ 4,5:1 en los fondos habituales. El peor caso medido el 2026-10-18 fue 4,3
    en un solo punto, sobre una foto con luz ámbar, con promedio 6,1; queda como control en la QA.
- **Mecanismo, no estética, según PDR-026.** El contrato fija comportamiento y estructura; la piel sale de los tokens de
  AXIS y de la línea gráfica.

### 6. Qué cambia en la doctrina

Esta decisión, aceptada el 2026-10-18, **reemplaza para el encabezado global** la regla de `native-navigation.md` de conservar
el menú de Ohio y la recomendación de usar su mega menú. El cambio de un ítem de menú pasa a hacerse en el documento del
plugin, no en el término 61. Las reglas sobre landings sueltas no cambian: ninguna landing crea su propia navegación.

## Decisiones del operador

Decididas el 2026-10-18:

1. **Alcance: se reemplaza el encabezado de Ohio en todo el sitio** (landings, blog, Glitch, 404 y archivos). El
   operador lo confirmó después de revisar las alternativas:
   - ampliar el mega menú nativo de Ohio no soporta el diseño ni es portable;
   - un encabezado de Elementor queda atado a WordPress y sin edición gobernada para agentes;
   - meter la cápsula dentro del encabezado de Ohio deja dos encabezados que se pisan.

   Ohio hoy tiene variantes de encabezado por página (transparente, oscuro, logo fijo), que se inventarían y resuelven
   una por una en `TASK-2042`.
2. **Piloto: primero en una sola página**, detrás del interruptor `eo_site_nav_enabled`, antes de todo el sitio. El go a
   todo el sitio lo da el operador después de revisar el piloto.

Queda abierta:

3. **Copia pública del documento:** servirla desde el propio WordPress o publicarla también en el bucket de AXIS. Se
   decide en la fase de Think. Publicarla en el bucket exige credenciales de GCP en Kinsta, o un paso de sincronización
   fuera de WordPress.

## Fases

| Fase | Entrega | Perfil |
|---|---|---|
| F1 | Contrato `efeonce.site-nav` y su esquema de datos, extraídos del canvas: estados de arriba y fija, tres megas, onepage, tableta y móvil. | AXIS |
| F2 | Primitive en `axis-ui-primitives`, página del Lab y pruebas de teclado, foco, movimiento reducido, 390 px y contraste. | AXIS, interfaz |
| F3 | Plugin «EO Navegación»: documento, pantalla del admin, comandos WP-CLI, revisiones y copia pública. | runtime del sitio, datos |
| F4 | Fotos en el bucket (`site-nav/v1/`, nombres versionados, caché inmutable, recorte móvil) y carga del documento inicial. | operación |
| F5 | Adaptador WordPress en piloto, en una página detrás de un interruptor, más la superficie del CTA del encabezado global. | runtime del sitio, interfaz |
| F6 | Todo el sitio con release acotado por SSH, respaldo y rollback (apagar el interruptor devuelve el encabezado de Ohio). | runtime del sitio |
| F7 | Adaptador Think, cuando el operador lo pida. | Think |

Reparto en tasks (EPIC-055):

| Task | Fases |
|---|---|
| `TASK-2040` | F1 y F2 |
| `TASK-2041` | F3 y F4 |
| `TASK-2042` | F5 y F6 |

F7 queda como follow-up de la épica.

## Consecuencias

- **Lo que se gana:**
  - El menú se construye una vez y cualquier sitio lo usa sin rehacerlo.
  - Personas y agentes editan lo mismo, con historial y vuelta atrás.
  - Las fotos no dependen de WordPress.
- **Lo que cuesta:**
  - Construir el primitive, el plugin y la pantalla del admin.
  - Inventariar las variantes de encabezado de Ohio.
  - Una superficie de CTA por sitio.
  - Mantener el esquema en AXIS.
- **Lo que no implica:** no migra el sitio a Astro, no introduce React y no toca el contenido de las páginas.

## Fuentes

- Canvas «Menú del sitio», versiones 50 a 67, con las aprobaciones del operador del 2026-10-17 y 2026-10-18 registradas en
  sus hilos de comentarios.
- Discovery del 2026-10-18, que cubrió:
  - `.claude/skills/efeonce-public-site-wordpress/references/{native-navigation,runtime-and-discovery,source-led-elementor-patterns,custom-elementor-widgets}.md`
  - `docs/documentation/public-site/wordpress-custom-widgets-react-strategy.md`
  - `docs/architecture/public-site/PRIMITIVES.md`
  - `packages/contracts/src/surface-composition.ts` de AXIS
  - `src/growth-cta-renderer/contract.ts`
  - `efeonce-think/src/components/GrowthCtaDock.astro`
  - `efeonce-web/src/lib/nav.ts`
- Bucket: `gcloud storage buckets get-iam-policy gs://efeonce-group-axis-public-media` y cabeceras de un objeto público
  medidas el 2026-10-18.
