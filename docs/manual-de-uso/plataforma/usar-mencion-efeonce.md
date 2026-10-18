# Usar la Mención Efeonce en cualquier host

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-10-18 por Claude
> **Ultima actualizacion:** 2026-10-18 por Claude
> **Documentacion tecnica:** [Registro de primitives del sitio público — `EfeonceMention`](../../architecture/public-site/PRIMITIVES.md#efeoncemention-contract) ·
> [Runbook de paquetes AXIS, corte 2026-10-18](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md) ·
> [PDR-026](../../public-site/decisions/PDR-026-cada-landing-deriva-su-patron-de-diseno.md)

## Para qué sirve

La Mención Efeonce es un enlace dentro del texto hacia un servicio o producto de Efeonce. Se ve como el nombre del
servicio con el isotipo de Efeonce delante, sobre una pastilla suave en el color de la línea de servicio. Al pasar el
cursor, el isotipo se inclina un poco. No necesita JavaScript.

Su dueño es AXIS (contrato `efeonce.mention`). Todos los hosts —el sitio WordPress, Think y cualquier producto en React o
HTML— usan el mismo marcado y el mismo CSS del paquete `@efeoncepro/axis-ui-primitives`. Nació en la landing Inbound y
se promovió a AXIS el 2026-10-18 para usarla en todo el ecosistema.

## Antes de empezar

- El destino tiene que ser de Efeonce: una ruta del mismo sitio (`/servicios/...`) o una URL `https` en `efeoncepro.com`,
  `efeonce.org` o uno de sus subdominios. Cualquier otro enlace se escribe como enlace normal.
- Decide la **línea** según el servicio del que habla la página o la sección: `growth` (por defecto), `brand`, `engine`,
  `voice`, `revenue-hubspot` o `revenue-salesforce`.
- Decide la **superficie** según el fondo donde va el texto: `light` (por defecto) o `dark`.
- En hosts Astro, la versión mínima del paquete es `0.6.9`. No uses `0.6.8` (ver «Problemas comunes»).
- Para verla en todas las combinaciones, abre la página `/patterns/efeonce.mention/` del Lab de AXIS: muestra uso en
  párrafo sobre fondo oscuro y claro, la matriz de 6 líneas × 2 superficies y el código de consumo.

## Paso a paso

### En WordPress (efeoncepro.com)

El CSS ya se carga en todo el sitio: el plugin `eo-elementor-widgets` encola el estilo `axis-mention` en el frontend, en
la vista previa de Elementor y en el editor de bloques. Sólo tienes que escribir el marcado:

```html
<a class="axis-mention" href="/agencia-inbound-marketing/" data-line="revenue-hubspot" data-surface="dark">inbound marketing</a>
```

1. Escribe el enlace con la clase `axis-mention`, el `href` de Efeonce y los atributos `data-line` y `data-surface`.
2. Si la mención vive en una plantilla compilada de una landing (como Inbound, en
   `includes/inbound/templates/metodo.html`), el marcado sale con el paquete del plugin; en el contenido de la página
   sólo cambian el texto y el `href`.
3. Revisa la página en escritorio y a 390 px de ancho: la mención no debe desbordar la línea.

**De dónde sale el CSS.** `assets/css/axis-mention.css` del plugin es una copia byte a byte de `dist/mention.css` de
`@efeoncepro/axis-ui-primitives` `0.6.9`, con una cabecera que registra la versión y el sha256 del original
(`baacdd7053ec7c6b70a881cefb32cae03b77ca8e77ca94c4d311fa8f0f8cee4f`). WordPress no instala el paquete: usa esa copia.

**Cómo actualizar la copia** cuando AXIS publique una versión nueva:

1. Toma `dist/mention.css` de la versión publicada del paquete.
2. Calcula su sha256 (`shasum -a 256 mention.css`).
3. Reemplaza el contenido de `assets/css/axis-mention.css` por el archivo nuevo, sin tocarlo, y actualiza la cabecera
   con la versión y el sha256 nuevos.
4. Despliega el plugin por el carril acotado del sitio público y verifica en vivo las páginas que usan la mención.

### En Think (Astro)

Think fija `@efeoncepro/axis-ui-primitives` `0.6.9` y trae el componente `EfeonceMention`, que arma el marcado y carga el
CSS del paquete:

```astro
---
import EfeonceMention from '../components/EfeonceMention.astro'
---
<p>Mira el <EfeonceMention label="informe de visibilidad" href="https://think.efeoncepro.com/insights/muestra" line="growth" surface="light" /> de tu marca.</p>
```

Las props son las de la mención: `label`, `href`, `line`, `surface` y `newTab`. Si el `href` no es de Efeonce, el build
falla. Para revisar el aspecto, usa la preview noindex
[`https://think.efeoncepro.com/preview/mention`](https://think.efeoncepro.com/preview/mention) (sin barra final: con
barra responde 308). En producción desde el 2026-10-18 (commit `f603060`): responde 200 con 3 menciones, `noindex`, sin
desborde a 1440 y `astro check` sin errores. El `mention.css` que carga es idéntico (mismo sha256) a la copia de WordPress.

### En React o HTML (cualquier otro producto)

Instala `@efeoncepro/axis-ui-primitives` con versión exacta y carga su CSS una vez:

```tsx
import '@efeoncepro/axis-ui-primitives/mention.css'
import { Mention } from '@efeoncepro/axis-ui-primitives/react'

<Mention label="inbound marketing" href="https://efeoncepro.com/agencia-inbound-marketing/" line="revenue-hubspot" surface="light" />
```

Sin React, `mentionHtml({ label, href, line, surface })` devuelve el mismo `<a>` como texto; `mentionAttributes` y
`mentionTree` dan los atributos o el árbol, y `mentionCss` el CSS como texto. El texto del enlace sale siempre de
`label`. Con `newTab: true` el enlace abre en otra pestaña con `rel="noopener"`.

## Qué significan los estados o señales

| Señal | Significado |
| --- | --- |
| Isotipo + pastilla en el color de la línea | La mención está bien cargada. |
| El isotipo se inclina al pasar el cursor | Comportamiento normal. Con «reducir movimiento» activo no se inclina. |
| Borde e isotipo en el color de enlace del sistema | Modo de alto contraste (forced colors): es lo esperado. |
| Error `NOT_EFEONCE_HREF` | El destino no es de Efeonce. Usa un enlace normal. |
| Error `LABEL_REQUIRED` | Falta el texto de la mención. |
| Error `INVALID_LINE` o `INVALID_SURFACE` | La línea o la superficie no están entre los valores permitidos. |
| Error `INVALID_OPTION` o `INVALID_INPUT` | `newTab` no es `true`/`false`, o no se pasaron opciones. |

## Qué no hacer

- No la uses para destinos externos, anclas (`#`), `mailto:`, `tel:` ni `http`. El contrato los rechaza.
- No la uses como botón ni como llamado a la acción: es una referencia dentro del texto.
- No pongas muchas: pocas por sección, con textos cortos de 2 a 4 palabras.
- No elijas el color por gusto: sigue la línea de la que habla la página o la sección.
- No copies ni edites el CSS dentro de una landing o un producto. En WordPress, la copia sólo se reemplaza entera desde
  el paquete, con versión y sha registrados.
- No uses la clase legada `eo-mention`: se retiró el 2026-10-18 junto con su CSS y su isotipo local.
- No tomes el aspecto de la landing Inbound como plantilla para otras: la mención es un mecanismo compartido, no un
  estilo de landing (PDR-026).

## Problemas comunes

- **El build de Astro cae con `ENAMETOOLONG`.** Pasa con `0.6.8`: la pasada CSS de alias de tsconfig de Astro 7 intenta
  leer como archivo el `url("…")` entre comillas de la máscara del isotipo. Sube a `0.6.9` o superior, que usa la URL sin
  comillas.
- **El tema del host repinta el enlace** (subrayado, color o fondo de los enlaces del tema). El CSS ya usa una clase
  doble y `background-image: none` para resistirlo. Si aun así cambia, revisa que el estilo `axis-mention` esté cargado
  en esa vista. Para ajustar el color en un caso puntual, el host puede definir en el enlace
  `--axis-mention-accent`, `--axis-mention-tint`, `--axis-mention-tint-hover` o `--axis-mention-ink`; nunca reescribas las
  reglas del CSS.
- **No aparece el isotipo.** Falta el CSS en esa página (por ejemplo, un host nuevo que no importó `mention.css`) o la
  clase no es `axis-mention`.
- **Se ve con el color equivocado.** Revisa `data-line` y `data-surface`: un texto sobre fondo oscuro necesita
  `data-surface="dark"`.

## Referencias técnicas

- AXIS: tokens `axisMention` (`packages/tokens/src/mention.ts`), contrato `efeonce.mention`
  (`packages/contracts/src/mention.ts`), primitive en `packages/primitives/src/mention*.ts`, calidad en
  `docs/quality/mention.md`.
- Versiones publicadas: tag `v0.7.5` (tokens `0.6.5`, contracts `0.7.5`, registry `0.7.3`, primitives `0.6.8`) y tag
  `v0.6.9` (primitives `0.6.9`). Detalle en el
  [runbook de paquetes AXIS](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).
- WordPress: `wp-content/plugins/eo-elementor-widgets/includes/eo-mention.php` y `assets/css/axis-mention.css` en el
  repo `efeonce-public-site-runtime`.
- Think: `src/components/EfeonceMention.astro` en el repo `efeonce-think`.
- Caso fuente: [landing Inbound Marketing](../public-site/operar-inbound-marketing.md).
