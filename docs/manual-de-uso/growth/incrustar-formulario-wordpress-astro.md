# Incrustar un formulario de Growth en un sitio (WordPress / Astro)

> **Tipo:** Manual de uso / runbook operativo
> **Version:** 1.1 — 2026-06-30 (Codex, AEO `/aeo-2/` live bridge note)
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
   environment de Greenhouse que el sitio apunta (staging: ON; produccion: ON solo
   para rollouts aprobados; AEO `/aeo-2/` ya usa el motor por bridge HTML).
4. El **CSP del sitio** debe permitir cargar el script y llamar a la API desde el
   origen de Greenhouse (ver "CSP" abajo).

> Nota vigente: la landing AEO `/aeo-2/` no usa todavia el widget generico
> `greenhouse_growth_form`. Usa un host bridge HTML con Turnstile invisible porque el
> renderer portable `<greenhouse-form>` aun no emite `captchaToken`. Ese bridge debe
> consultar `/verify-email` antes de Turnstile para respetar el gate corporativo del
> form (`corporate_email` + `emailPolicy.block_field`) y debe mostrar validación inline
> por campo, no solo un status global. Cuando el renderer soporte Turnstile, se debe
> migrar ese host a `<greenhouse-form form="efeonce-aeo-diagnostic"
> surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL">` sin mover campos, validacion,
> mapping ni destinos a WordPress.

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
- **No** reemplaces el bridge AEO `/aeo-2/` por el widget generico hasta que el renderer
  emita `captchaToken`; hacerlo rompe el submit con Turnstile.

## Problemas comunes

- **"Formulario no disponible"**: el formulario no esta publicado, el origen del sitio
  no esta en la allowlist de la surface, o el flag `GROWTH_FORMS_PUBLIC_API_ENABLED`
  esta OFF en ese environment.
- **No carga nada / consola con error de CSP**: el CSP del sitio bloquea el script o la
  API de Greenhouse (ver CSP).
- **Autocompletar no funciona**: revisa que el formulario publicado declare
  `autocomplete`/`inputMode` por campo (vienen del render_contract).

## CSP

El bundle se carga cross-origin desde Greenhouse. El CSP del sitio debe permitir:

- `script-src` → el origen de Greenhouse (para `renderer-<canal>.js`).
- `connect-src` → el origen de Greenhouse (para la API publica de render/submit).

## Referencias tecnicas

- Core portable: `greenhouse-eo` → `src/growth-forms-renderer/**`
  (build `pnpm renderer:build`).
- Widget WordPress: `efeonce-public-site-runtime` →
  `wp-content/plugins/eo-elementor-widgets/includes/widgets/class-eo-growth-form-widget.php`.
- Wrapper Astro: `efeonce-web` → `src/components/interactive/GrowthForm.astro`
  (+ `docs/growth-form-parity.md`).
- Operar el motor (publicar, flags, entrega): [operar-motor-formularios.md](./operar-motor-formularios.md).
