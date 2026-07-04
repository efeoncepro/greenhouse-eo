# Incrustar un formulario de Growth en un sitio (WordPress / Astro)

> **Tipo:** Manual de uso / runbook operativo
> **Version:** 1.4 — 2026-07-01 (Codex, Ohio child theme Growth Forms host layer)
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
> el mismo nivel de pulido (dropdowns premium, CTA teal, focus/ARIA y microcopy de diagnostico);
> AEO solo agrega guards extra por ser una landing publica critica.

## Vista previa interna (antes de tocar un sitio)

Greenhouse → **Design System → Growth Forms renderer**
(`/design-system/growth-forms-renderer`, solo equipo interno). Muestra el mismo core
que veran los sitios publicos, con las composiciones (estatico / condicional /
multi-paso) y estados (cargando / error / no disponible) desde fixtures.

## WordPress (Elementor)

1. Edita la pagina con **Elementor**.
2. En el buscador de widgets escribe **"Growth Form"** (categoria **Greenhouse**) y
   arrastralo a la pagina.
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
   foco/ARIA y la prueba publica/fail-closed que aplique al formulario.

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
  (el secreto se muestra una sola vez; guardalo aqui, nunca en git ni en el navegador).
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

> **Propagación de tokens (TASK-1298 — leer si overrideás tokens vía CSS scoped).** El
> renderer monta el contenido en un `<div class="ghf-root">`. Desde el fix `hosted` del
> renderer, ese wrapper **NO** re-declara los tokens cuando está dentro de un host
> `<greenhouse-form>`, así que un override en `greenhouse-form { --ghf-* }` **propaga**
> a todo el contenido (es el patrón canónico). En la versión previa del renderer (servida
> hasta que el fix llegue a prod) el wrapper interno llevaba `.ghf-scope` y re-declaraba los
> tokens, sombreando el override; el workaround forward-compatible es targetear también el
> scope: `greenhouse-form, greenhouse-form .ghf-scope { --ghf-* }`. Si overrideás tokens y
> no ves el cambio en el contenido (solo en el borde del host), es esto: agregá el selector
> `.ghf-scope`. Mismo motivo aplica a `appearance="bare"`: cubre el host; el workaround lo
> extiende al scope interno.

**Modo claro/oscuro — gotcha importante:** por defecto el renderer sigue el modo del SO
del visitante (`prefers-color-scheme`). Si tu sección es una **banda clara**, un visitante
con el SO en oscuro vería el formulario oscuro y descuadrado. Forzá claro en el embed:

```html
<greenhouse-form form-key="…" surface="…" locale="es-CL" color-scheme="light"> … </greenhouse-form>
```

(Hoy `color-scheme` solo fuerza **light**; no hay forzar-dark.)

**Atributo de conveniencia `appearance` (TASK-1297, disponible):** `appearance="surface"`
(por defecto, comportamiento actual) o `appearance="bare"` (chromeless: el renderer queda
con fondo transparente, sin escribir `--ghf-bg: transparent` a mano). Para integrar el
renderer dentro de una card del host sin card-on-card, preferí `appearance="bare"` sobre el
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

**Identidad estable `form-key` (TASK-1297, recomendado):** además de `form="<slug>"`, el
renderer acepta `form-key="<UUID>"` — la identidad opaca, estable e inmutable del formulario
(no cambia por nueva versión, rename de slug ni nuevo surface). Preferila sobre `slug` para
embeds y mutaciones; `slug` queda como alias humano/backward-compatible. La misma ruta pública
(`/api/public/growth/forms/{ref}`) resuelve por slug **o** por form-key (UUID) — no hay endpoint
nuevo. El `form-key` es público/opaco; **NUNCA** es el HubSpot destination form GUID (server-only).
El catálogo del selector (`InsertableFormCatalogEntryVm.formKey`) ya lo expone.

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
