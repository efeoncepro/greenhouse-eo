# Incrustar un formulario de Growth en un sitio (WordPress / Astro)

> **Tipo:** Manual de uso / runbook operativo
> **Version:** 1.11 — 2026-10-24 (Claude, receta de la píldora `inline_pill` en un anfitrión con plantilla propia, portada del blog)
> **Doc funcional:** [docs/documentation/growth/motor-formularios-publicos.md](../../documentation/growth/motor-formularios-publicos.md)
> **Arquitectura:** [GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md) §19 + §Delta TASK-1231

## Para que sirve

Mostrar un formulario publicado de Greenhouse Growth Forms en un sitio publico
(WordPress o Astro) usando el **renderer portable** `<greenhouse-form>`. El sitio no
copia ni cambia el formulario: solo lo incrusta. Los campos, validacion, pasos,
consentimiento y destino del lead viven en Greenhouse.

## Antes de empezar

1. El formulario tiene que estar **publicado** en Greenhouse (TASK-1232 / API admin).
2. Tiene que existir una **host surface** registrada para ese sitio, con el origen del
   sitio en su allowlist (ej. `wordpress-public` para WordPress, `astro` para Astro).
3. El **flag publico** `GROWTH_FORMS_PUBLIC_API_ENABLED` tiene que estar ON en el
   environment de Greenhouse que el sitio apunta (staging: ON; produccion: ON para
   rollouts aprobados; AEO `/aeo-2/` ya usa el motor por `<greenhouse-form>`).
4. El **CSP del sitio** debe permitir cargar el script y llamar a la API desde el
   origen de Greenhouse (ver "CSP" abajo).

> Nota vigente: la landing AEO `/aeo-2/` ya usa `<greenhouse-form>` live por
> `form-key` desde TASK-1298. El cutover fue gobernado con backup Elementor,
> `Document::save()`, Kinsta purge, `heroans` guard y `pnpm public-website:verify-aeo-live-contract`.
> La variante visual `diagnostic_premium` es reusable para otros formularios que necesiten
> el mismo nivel de pulido (dropdowns premium, focus/ARIA y microcopy gobernado). El CTA consume el color
> primario semantico de cada superficie; no es teal por definicion. En Influencer es Core Blue.
> AEO solo agrega guards extra por ser una landing publica critica.

## Configuración comercial y medición son pasos distintos

Incrustar un formulario publicado no habilita automáticamente Meta/Google matching. En los dos
hosts Efeonce aprobados, usar la [política administrable por API, CLI o panel](configurar-medicion-conversiones.md)
para esa versión/surface, con campos tipados y destinos explícitos. Las altas compatibles no
requieren otra publicación de código o GTM. Un nuevo host, evento, proveedor o tipo de campo
puede requerir cambios gobernados. Conservar en el host el bridge de consentimiento canónico;
no leer contacto ni construir CAPI desde Elementor/Astro o dataLayer. GA4, publicidad y entrega
a HubSpot se verifican por separado. La elección publicitaria no condiciona el envío del formulario.

## Vista previa interna (antes de tocar un sitio)

Greenhouse → **Design System → Growth Forms renderer**
(`/design-system/growth-forms-renderer`, solo equipo interno). Muestra el mismo core
que veran los sitios publicos, con las composiciones (estatico / condicional /
multi-paso) y estados (cargando / error / no disponible) desde fixtures.

## WordPress (Elementor)

1. Edita la pagina con **Elementor**.
2. En el buscador de widgets escribe **"Growth Form"** (categoria **Greenhouse**) y
   arrástralo a la pagina.
3. En el panel del widget:
   - **Formulario (catálogo)**: elige de la lista desplegable un formulario publicado de
     Greenhouse. Cada opcion muestra el nombre, la version y si esta listo para recibir
     leads (ej. `Lead Gen - Web — v1 · listo para recibir leads`). **Ya no escribes el
     slug a mano** (TASK-1259).
   - **Surface (catálogo)**: elige la host surface activa donde se mostrara (o deja
     "Surface por defecto del sitio").
   - **Idioma**: `Español (CL)` o `English (US)`.
   - **URL de contacto (fallback sin JS)**: opcional; se muestra si el navegador
     bloquea JavaScript.
   - **Slug manual / Surface manual (fallback)**: solo aparecen si no eliges del
     catalogo o si el catalogo no esta disponible. Para casos avanzados o de respaldo.
   - **Runtime (avanzado)** — normalmente no se toca: canal (`preview`/`beta`/`stable`),
     Greenhouse base URL, embed key.
   - **Marca** (pestaña Estilo): color de acento + ancho maximo.
4. Publica la pagina. El widget vive en el plugin **EO Elementor Widgets**
   (`greenhouse_growth_form`).

> El widget solo emite `<greenhouse-form …>` y carga el bundle pineado de Greenhouse.
> Nunca cambia campos ni destinos.

### Host interactivo y presentación Content Marketing

El módulo `greenhouse_content_conversion` incrusta el mismo `<greenhouse-form>` por `form-key` y
`surface`, con `appearance="bare"` y `color-scheme="light"`. La variante `content_marketing` y sus
ayudas de paso se publican en Growth Forms, no se escriben como campos HTML de Elementor.
Su [contrato runtime](../../architecture/growth-public-forms-runtime-contract.md#content-marketing-presentación-host-y-distribución-del-renderer)
identifica el consumer y el bundle fijado; no sustituyas otros bundles del sitio por éste como parte
de una edición de landing.

Cuando el host tiene tabs o un patcher de DOM, trata el contenedor del formulario como **opaco**:
conserva el nodo y deja que el renderer controle sus descendientes. Verifica que actualizar el host
no remonte el custom element ni borre lo escrito. `initial-values` sirve para un prefill público
(por ejemplo, el modo seleccionado); no es un canal para PII ni debe cambiarse tras iniciar la edición.
Comprueba un select nativo al entrar al paso y al volver: su valor visual debe coincidir con el estado.

El bundle del consumer debe compilarse desde el renderer canónico; no copies su lógica dentro del
widget. Registra URL/hash, controla la caché y evita dos registros del mismo custom element. Montaje,
validación vacía y paso siguiente no prueban captura aceptada, entrega ni medición GA4.

### Capa compartida Ohio para Growth Forms

En el sitio publico Efeonce, el child theme `ohio-child` debe cargar una capa compartida
de compatibilidad para Growth Forms. Esta capa esta live en Kinsta desde el rollout acotado
del 2026-07-01:

- runtime repo: `efeonce-public-site-runtime`;
- CSS: `wp-content/themes/ohio-child/assets/css/growth-forms-host.css`;
- enqueue: `wp-content/themes/ohio-child/inc/enqueue-and-layout.php`, handle
  `ohio-child-growth-forms-host`;
- backup remoto inmediato del rollout: `/tmp/greenhouse-growth-forms-host-layer-20260701T103729Z`;
- scope permitido: `.eo-growth-form`, `.gh-growth-form-host`,
  `.gh-aeo-growth-form-host`, `.gh-aeo-growth-form-card` + descendiente
  `<greenhouse-form>`.

Esta capa existe para que Ohio no vuelva a imponer estilos globales de
`input/select/button` sobre el renderer. No mueve logica a WordPress: no define campos,
validacion, destinos, mapping HubSpot, Turnstile ni microcopy contractual. El renderer y
el render contract siguen siendo la fuente de verdad.

**Íconos de etiqueta y Ohio.** El CSS global de Ohio inyecta texto en cualquier `[data-icon]`. Por eso
el renderer dibuja los íconos de etiqueta como SVG sin ese atributo (commit `ab622e958`, pendiente de
release). Si en una landing ves palabras sueltas junto a una etiqueta («user ID»), revisa qué bundle
se está sirviendo antes de tocar CSS de la página.

### Cuándo llega a los sitios un cambio del renderer

El bundle `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js` se construye en el
`prebuild` de Greenhouse. Un cambio en `src/growth-forms-renderer/**` llega a WordPress y Astro **sólo
con el próximo release de producción de Greenhouse**, aunque ya esté en `develop` (hasta que
`TASK-2038` mueva el renderer a AXIS). Antes de prometer un ajuste visual en una landing, confirma que
el bundle servido lo trae (busca en él una clase o texto propio del cambio).

Para ver el resultado en la landing real antes de ese release, o antes de publicar una versión nueva
del formulario, usa la previsualización por intercepción: un navegador Playwright que responde
`GET /api/public/growth/forms/<formKey>` con el contrato modificado y, si cambió el renderer,
`renderer-latest.js` con el build local de `pnpm renderer:build`. Pasos en
[Operar el motor de formularios](operar-motor-formularios.md#cambiar-el-diseño-de-un-formulario-publicado-opciones-visibles-pasos-íconos).

### Aplicar Editorial Premium Brief

Para un brief comercial de alta intencion, usa la composicion
[Editorial Premium Brief](../../ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md):

1. Incrusta con `appearance="bare"`, `color-scheme="light"`, `form-key` y `surface` estables.
2. Usa una sola card exterior; no anides otra card alrededor del renderer.
3. Reserva Poppins 700 para el titulo editorial y Geist 600/400 para la interfaz y lectura.
4. Mapea el submit al primary de la superficie; Influencer usa azul, no teal.
5. Deja caret, valor seleccionado, listbox, teclado, ARIA y validacion en el renderer.
6. Usa iconos lineales semanticos sin discos. Las banderas requieren SVG crisp, centrado optico y alternativa de
   texto; nunca comuniques el mercado solo por bandera.
7. Verifica desktop, 390 px, dropdown abierto, focus/error, reduced motion, cero overflow y que un submit vacio no
   haga POST ni cree lead.

No copies decoradores page-scoped, observadores o selectores por label desde otra landing. Si iconos por opcion se
repiten, promuevelos a metadata browser-safe del contrato y al renderer.

Regla operativa:

1. Para nuevas landings en WordPress, envolver el embed en una de las clases host
   compartidas y usar `form-key`, `surface`, `locale`, `color-scheme="light"` y
   `appearance` segun la composicion.
2. Si un form se rompe por Ohio, primero ajustar esta capa o el renderer de forma
   transversal. No crear CSS page-scoped por formulario salvo excepcion documentada.
3. Antes de desplegar cambios del child theme, correr `pnpm public-website:export-live-code`
   + `pnpm public-website:diff-runtime` para confirmar que no se pisara drift de
   produccion. Luego leer `pnpm public-website:runtime-status`: si
   `releaseSafety.fullRepoDeploySafe=false` o `eo-elementor-widgets` aparece como
   `repo_pending_release`, no lo mezcles en el rollout del child theme.
4. Validar con desktop + mobile 390, `scrollWidth == clientWidth`, dropdown abierto,
   foco/ARIA y la prueba publica/fail-closed que aplique al formulario. Para selects
   premium, abrir al menos un dropdown y confirmar que el menu queda arriba de las filas
   siguientes, la opcion selected/hover mantiene texto oscuro legible y no aparece overflow.

### Configurar el catálogo del selector (una vez por sitio)

El desplegable de formularios sale del **catálogo gobernado de Greenhouse** (TASK-1258),
que el plugin consulta **server-side** (el navegador del editor nunca ve la credencial).
Para que el desplegable se pueble, configura estas constantes en `wp-config.php`:

```php
define( 'GREENHOUSE_GROWTH_CATALOG_SURFACE_ID', 'fhsf-efeonce-lead-gen-web' ); // host surface de este sitio
define( 'GREENHOUSE_GROWTH_CATALOG_EMBED_KEY', '<secreto>' );                  // embed key per-site (se mintea en Greenhouse)
// Opcional — por defecto apunta a produccion:
// define( 'GREENHOUSE_GROWTH_CATALOG_BASE_URL', 'https://greenhouse.efeoncepro.com' );
```

- La **embed key** se genera en Greenhouse con `pnpm growth:forms:embed-key --surface-id <id>`
  (el secreto se muestra una sola vez; guárdalo aqui, nunca en git ni en el navegador).
- Si las constantes no estan o el catalogo no responde, el panel lo dice y caes al
  **slug manual** (los embeds existentes siguen funcionando, sin romperse).
- El catalogo requiere que `GROWTH_FORMS_CATALOG_API_ENABLED` este ON en el entorno
  Greenhouse al que apunta el plugin. En produccion eso va por el release control plane.

## Astro

```astro
---
import GrowthForm from '@components/interactive/GrowthForm.astro';
---
<GrowthForm
  form="ai-visibility-intake"
  surface="astro"
  locale="es-CL"
  channel="preview"
  fallbackUrl="https://efeoncepro.com/contacto"
/>
```

Componente: `src/components/interactive/GrowthForm.astro` (repo `efeonce-web`). Fixture
de paridad no-routable: `src/pages/_growth-form-parity.astro`.

## Tematización y composición de card (transversal — cualquier sitio)

> Esta receta es **transversal**: sirve para AEO y para cualquier landing/host. El
> renderer es el mismo para todos los sitios; lo único que cambia por sitio es este CSS
> scoped. No la copies como CSS "de AEO": es el patrón canónico de incrustación.

**El renderer NO dibuja una card.** No trae borde, sombra, radio ni padding alrededor del
formulario; solo un relleno de fondo (`--ghf-bg`, blanco en claro / oscuro en dark) y los
estilos de los campos. Esto significa dos cosas:

1. **Composición de card recomendada (Opción A):** si tu sección ya tiene una card
   aprobada (borde + sombra + radio + padding), deja **esa** card como la única superficie
   visible y mete el renderer adentro **transparente**. No le des chrome de card al
   renderer (evita "card sobre card" y deja un solo dueño del estilo de card).

   ```css
   .mi-seccion greenhouse-form {
     --ghf-bg: transparent;   /* la card visible es la del host, no el renderer */
   }
   ```

2. **Tipografía consistente con el sitio:** el renderer usa `system-ui` por defecto.
   Si tu sitio usa otra familia (ej. DM Sans en Ohio), pásala por token para que el
   formulario no se sienta "de otra tipografía":

   ```css
   .mi-seccion greenhouse-form {
     --ghf-font: "DM Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
   }
   ```

**Tokens themables** (CSS custom properties, NUNCA hex inline; valores reales en
`src/growth-forms-renderer/styles.ts`): `--ghf-font`, `--ghf-bg`, `--ghf-fg`,
`--ghf-muted`, `--ghf-accent` (+`--ghf-accent-contrast`), `--ghf-field-bg`, `--ghf-border`
(+`--ghf-border-strong`), `--ghf-error` (+`--ghf-error-bg`), `--ghf-success`,
`--ghf-celebration`,
`--ghf-radius`, `--ghf-gap`, `--ghf-focus`. El widget Elementor ya expone acento + ancho
máximo en la pestaña **Estilo**; el resto se ajusta con CSS scoped al contenedor.

> **Propagación de tokens (TASK-1298 — leer si overrideas tokens vía CSS scoped).** El
> renderer monta el contenido en un `<div class="ghf-root">`. Desde el fix `hosted` del
> renderer, ese wrapper **NO** re-declara los tokens cuando está dentro de un host
> `<greenhouse-form>`, así que un override en `greenhouse-form { --ghf-* }` **propaga**
> a todo el contenido (es el patrón canónico). En la versión previa del renderer (servida
> hasta que el fix llegue a prod) el wrapper interno llevaba `.ghf-scope` y re-declaraba los
> tokens, sombreando el override; el workaround forward-compatible es targetear también el
> scope: `greenhouse-form, greenhouse-form .ghf-scope { --ghf-* }`. Si overrideas tokens y
> no ves el cambio en el contenido (solo en el borde del host), es esto: agrega el selector
> `.ghf-scope`. Mismo motivo aplica a `appearance="bare"`: cubre el host; el workaround lo
> extiende al scope interno.

> **Override con variante de estilo activa (caso 2026-10-15, `/agencia-creativa/`).** Cuando la
> versión publicada declara un `styleVariant` (por ejemplo `diagnostic_premium`), la variante
> re-declara los tokens `--ghf-*` en `.ghf-root[data-ghf-style-variant]`, así que un override sólo
> sobre `greenhouse-form` (o `.ghf-scope`) **no gana**. En el diagnóstico creativo el botón vivo salió
> teal `#36c8bf` en vez del azul del diseño. El selector correcto es:
>
> ```css
> .mi-seccion greenhouse-form :is(.ghf-scope, .ghf-root[data-ghf-style-variant]) {
>   --ghf-accent: …; /* token de la superficie, nunca hex inventado */
> }
> ```
>
> Con ese selector el CTA quedó `#0375db`, como el canvas aprobado. Verifica siempre el color
> computado del botón en vivo, no sólo el borde del host.

**Modo claro/oscuro — gotcha importante:** por defecto el renderer sigue el modo del SO
del visitante (`prefers-color-scheme`). Si tu sección es una **banda clara**, un visitante
con el SO en oscuro vería el formulario oscuro y descuadrado. Fuerza claro en el embed:

```html
<greenhouse-form form-key="…" surface="…" locale="es-CL" color-scheme="light"> … </greenhouse-form>
```

(Hoy `color-scheme` solo fuerza **light**; no hay forzar-dark.)

**Atributo de conveniencia `appearance` (TASK-1297, disponible):** `appearance="surface"`
(por defecto, comportamiento actual) o `appearance="bare"` (chromeless: el renderer queda
con fondo transparente, sin escribir `--ghf-bg: transparent` a mano). Para integrar el
renderer dentro de una card del host sin card-on-card, prefiere `appearance="bare"` sobre el
token CSS.

```html
<greenhouse-form form-key="<UUID>" surface="<surfaceId>" locale="es-CL" appearance="bare" color-scheme="light"></greenhouse-form>
```

**Success Card / Thank-you card:** si la versión publicada declara
`successBehavior.presentation="success_card"`, el renderer pinta `.ghf-success-card`, el mark
SVG de celebración tipo party popper, el icono calendario para acciones `schedule`, motion con
fallback reduced-motion y telemetry allowlisted. El host no debe reimplementar esa card: solo debe
componerla dentro de su superficie visible, trust/no-JS y layout. Si un host necesita ocultar CTAs
externos duplicados tras el success, hazlo con CSS/JS scoped al host; si se repite en otro sitio,
promueve el patrón al renderer antes de copiarlo.

**Dropdown premium / listbox:** los selects custom del renderer son parte del contrato Growth Forms,
no del host. Cuando un select se abre, el renderer marca el field con `data-overlay-open="true"` y
eleva `.ghf-select-list` para que no quede atrapada debajo de otros campos o filas del grid. No
soluciones un dropdown enterrado con CSS page-scoped en WordPress; primero corrige el renderer o la
capa compartida Ohio. El smoke visual debe probar `aria-expanded="true"`, menu visible, selected/hover
legible y `scrollWidth == clientWidth`.

**Identidad estable `form-key` (TASK-1297, recomendado):** además de `form="<slug>"`, el
renderer acepta `form-key="<UUID>"` — la identidad opaca, estable e inmutable del formulario
(no cambia por nueva versión, rename de slug ni nuevo surface). Prefiérela sobre `slug` para
embeds y mutaciones; `slug` queda como alias humano/backward-compatible. La misma ruta pública
(`/api/public/growth/forms/{ref}`) resuelve por slug **o** por form-key (UUID) — no hay endpoint
nuevo. El `form-key` es público/opaco; **NUNCA** es el HubSpot destination form GUID (server-only).
El catálogo del selector (`InsertableFormCatalogEntryVm.formKey`) ya lo expone.

## Formulario en línea (píldora) y reservas por evento

**Antes de empezar:** el formulario debe estar publicado con la presentación `inline_pill` (un solo campo de correo,
consentimiento como aviso). El renderer `1.2.0` está en producción desde el release `40b330175855` (2026-10-24).

1. **Publicar el formulario del evento** (uno por evento): copiar `scripts/growth/forms/examples/webinar-aeo-2026-11-12.json`,
   ajustar `slug`, `eventKey`, `eventDateLabel`, `capacity`, `overCapacity` (`waitlist` o `reject`),
   `showRegistrationsCount`, `surfaceId` y `origins`, y correr
   `pnpm growth:forms:publish-event-registration -- --config <archivo>` (dry-run: dice si pasa el gate). Con el
   veredicto OK, repetir con `--apply`. Anotar el `form_key` que imprime. El destino HubSpot va aparte, por el registry
   de destinos.
2. **Incrustar:** `<greenhouse-form class="eo-inline-pill eo-inline-pill--event" form-key="<form_key>" surface="<surface>"
   locale="es-CL" color-scheme="dark" appearance="bare">` con un enlace de respaldo adentro (sin JavaScript se ve el
   enlace). Darle al elemento el ancho de su columna (480 px o más para el diseño de escritorio). Si el anfitrión tiene
   plantilla propia, seguir la receta de abajo.
3. **Color:** sólo tokens (`--ghf-inline-tone`, `--ghf-inline-on-tone` y, para el hover exacto,
   `--ghf-inline-tone-hover/-active`). Piel de referencia: `scripts/growth/forms/fixtures/inline-pill-host-skin.css`.
4. **Conteo de reservas (opcional):** leer `GET https://greenhouse.efeoncepro.com/api/public/growth/forms/<form_key>/registrations-count`
   y mostrar `display` sólo si `shown` es `true`. No pedirlo más de una vez por carga de página (se cachea 10 min).
5. **Verificar:** abrir, escribir un correo de prueba en staging, enviar y ver «¡Lugar reservado!» → «Te esperamos el …».

**Estados:** reposo (botón), abierto (campo + «Reservar»), enviando (cargador), éxito (relleno + check), listo (mensaje
final). En lista de espera: «¡Estás en la lista!» → «Te avisamos si se libera un lugar». Cupo lleno con `reject`: «Ya no
quedan cupos para este evento.» bajo la píldora, sin «Reintentar».

**Qué no hacer:** no copiar la animación en CSS de la página (vive en el renderer); no poner casillas de consentimiento
(la píldora no las dibuja y el contrato no publica); no inyectar `event_key` desde la página (el servidor lo impone);
no mostrar el conteo si `shown` es `false`.

### Receta: incrustar la píldora en un anfitrión con plantilla propia

Caso fuente: la portada del blog (`/blog/`, plugin `eo-blog-home`, 2026-10-24), que tiene su propio runtime de
plantilla, un reset de estilos y columnas flex. Cada paso corrige un problema que se vio en vivo.

1. **Cargar el renderer una vez por página**, desde Greenhouse, nunca copiado al sitio. En WordPress:
   `wp_enqueue_script( 'gh-growth-forms-renderer-latest', '<origen de Greenhouse>/growth-forms/renderer-latest.js', … )`
   (en la portada lo hace `includes/class-eobh-front.php`). Si la página ya lo carga otro widget, reusar el mismo handle.
2. **Proteger el elemento del runtime del anfitrión.** Si la plantilla re-renderiza su DOM (morph, autoplay de un
   slider, plantillas reactivas), marcar `<greenhouse-form>` para que ese motor no lo toque. En la portada es
   `data-dc-keep`: sin él, el autoplay del slider borraba el formulario ya renderizado.
3. **No resetear ni estilar dentro del formulario.** Todo lo que hay dentro de `<greenhouse-form>` es del renderer. Si
   el anfitrión tiene un reset del tipo `#raiz :is(h1,…,button,input,…) { all: revert }`, excluir el formulario con
   `:not(greenhouse-form *)`. En la portada, el reset con especificidad de ID anuló los estilos del renderer (texto
   duplicado, píldora aplastada) y hubo que desconectar la suscripción en minutos.
4. **Darle ancho al elemento.** `display: block` y un ancho explícito: en una columna flex que encoge a su contenido, el
   formulario colapsa. En la portada: 480 px (el ancho abierto del canvas, `max-width: 100%`) en escritorio, ancho
   completo en móvil, y ancho de columna en el pie.
5. **Alinear con tokens, no con selectores internos.** La suscripción se alinea a la derecha por defecto; para la
   izquierda, en el contenedor: `--ghf-inline-align: flex-start; --ghf-inline-note-align: left;` (así queda el tablero
   de tablet de la portada).
6. **Poner un respaldo hijo.** Un `<a class="ghf-fallback" href="…">` con la forma de la píldora en reposo y, si el
   diseño lo lleva, el aviso (`aria-hidden="true"`) reservando su lugar. Se ve sin JavaScript y mientras carga el
   renderer, sin salto visual; al montar, el renderer reemplaza los hijos.
7. **Tono con tokens:** `--ghf-inline-tone`, `--ghf-inline-on-tone`, `--ghf-inline-tone-hover`,
   `--ghf-inline-tone-active` (Glitch: `#6ec207`, `#8bd13a`, `#a6dd68`, sobre `#001a33`); tipografía con `--ghf-font`.
8. **Verificar** en los anchos reales del anfitrión (sin desborde de 320 a 1920 px) y con el formulario real antes de
   publicar. La portada lo prueba sin exponerlo con
   `node scripts/public-website/blog-v3/preview/serve.cjs --subscribe <form_key>` (proxy local de sólo lectura, sin
   envíos posibles).

Piel completa de referencia: `efeonce-public-site-runtime` →
`wp-content/plugins/eo-blog-home/assets/css/eobh-host.css`. Para conectar la suscripción de la portada se usa
`pnpm public-website:blog-home subscription <form_key> --apply`; publicar la versión de Glitch está en
[operar-motor-formularios.md](./operar-motor-formularios.md#publicar-la-suscripción-a-glitch-como-píldora-task-20532054).

**Envío real:** el captcha (Turnstile) rechaza navegadores automatizados, así que la prueba de envío la hace una persona.
No intentes eludirlo. Al 2026-10-24 el primer envío real de la suscripción a Glitch está pendiente.

## Que significan los estados (lo que vera el visitante)

- **Cargando**: un esqueleto del formulario (no un spinner de pagina).
- **Listo**: el formulario con sus campos; el boton siempre esta habilitado.
- **Error de campo**: borde + texto rojo debajo del campo, "que paso + como se arregla".
- **Enviando**: el boton dice "Enviando…" y no permite doble envio.
- **Exito**: mensaje en linea o redireccion, segun lo defina el formulario.
- **No disponible**: si el formulario no esta publicado o el origen no esta autorizado,
  muestra "Formulario no disponible" (nunca una caja vacia).
- **Sin JavaScript**: muestra el mensaje/link de contacto del fallback.

## Que NO hacer

- **No** edites el HTML del formulario ni "arregles" un campo en el sitio: todo viene
  del formulario publicado en Greenhouse. Si algo esta mal, se corrige en Greenhouse.
- **No** pongas el formulario dentro de un `<iframe>`: rompe la medicion (GTM/dataLayer)
  y la accesibilidad. El renderer va en el DOM de la pagina.
- **No** apuntes a un canal `stable` antes de aprobar el smoke; deja `preview`/`beta`.
- **No** copies el bundle del renderer al sitio: siempre se carga desde Greenhouse
  (asi todos los sitios quedan en la misma version).
- **No** arregles dropdowns premium con `z-index` local de una landing: el overlay/listbox vive en
  el renderer y debe quedar reusable para todos los hosts.
- **No** construyas tarjetas de opciones en el host ni conviertas un `select` en botones con JS de la
  landing: declara el campo como `radio` en una versión nueva del formulario y el renderer lo dibuja
  como tarjetas en cualquier estilo.
- **No** restaures el bridge AEO `/aeo-2/` salvo rollback explicito del operador usando
  el backup documentado. Cualquier cambio futuro sobre AEO exige backup Elementor,
  protección del hero y `pnpm public-website:verify-aeo-live-contract`.

## Problemas comunes

- **"Formulario no disponible"**: el formulario no esta publicado, el origen del sitio
  no esta en la allowlist de la surface, o el flag `GROWTH_FORMS_PUBLIC_API_ENABLED`
  esta OFF en ese environment.
- **El navegador bloquea el fetch por CORS (falta `Access-Control-Allow-Origin`)**: el
  origen del host cross-origin no esta en ninguna surface `active`. Desde TASK-1335 el
  transporte CORS es la **union gobernada** de `origin_allowlist_json` de las surfaces
  `active` (SoT = `greenhouse_growth.form_host_surface`), no un literal en el codigo. Para
  autorizar un host nuevo se **agrega su origen a la surface correspondiente** (DATA, via
  migracion/seed additive), NUNCA se edita el route helper. El cambio queda vigente tras el
  refresh del cache (~90s) o el proximo cold start del runtime.
- **No carga nada / consola con error de CSP**: el CSP del sitio bloquea el script o la
  API de Greenhouse (ver CSP).
- **El submit vuelve `captcha_failed`**: si el form declara `security.captcha`, verifica
  que el site key publico de Turnstile viva en el render contract y que el secret
  server-side `TURNSTILE_SECRET` este configurado en el environment de Greenhouse.
- **Autocompletar no funciona**: revisa que el formulario publicado declare
  `autocomplete`/`inputMode` por campo (vienen del render_contract).
- **El desplegable se mete debajo de otro campo o se ve con contraste raro**: confirma que el bundle
  del renderer incluye el contrato `data-overlay-open` y que el host no esta anulando `.ghf-field` /
  `.ghf-select-list`. La solucion correcta es shared renderer/host layer, no CSS local de pagina.

## CSP

El bundle se carga cross-origin desde Greenhouse. El CSP del sitio debe permitir:

- `script-src` → el origen de Greenhouse (para `renderer-<canal>.js`).
- `script-src` → `https://challenges.cloudflare.com` si el form usa Turnstile invisible.
- `connect-src` → el origen de Greenhouse (para la API publica de render/submit).

## Referencias tecnicas

- Core portable: `greenhouse-eo` → `src/growth-forms-renderer/**`
  (build `pnpm renderer:build`).
- Widget WordPress: `efeonce-public-site-runtime` →
  `wp-content/plugins/eo-elementor-widgets/includes/widgets/class-eo-growth-form-widget.php`.
- Wrapper Astro: `efeonce-web` → `src/components/interactive/GrowthForm.astro`
  (+ `docs/growth-form-parity.md`).
- Operar el motor (publicar, flags, entrega): [operar-motor-formularios.md](./operar-motor-formularios.md).
