# Agencia Creativa — rollout de módulos Elementor (2026-10-15)

> **Tipo de documento:** Audit / evidencia de rollout
> **Version:** 1.0
> **Creado:** 2026-10-15 por Claude
> **Contrato técnico:** [AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md](../../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md)

**Publicado y verificado el 2026-10-15.** El cuerpo de `https://efeoncepro.com/agencia-creativa/` (página
`249582`, publicada e indexada) se reemplazó por el diseño de canvas aprobado por el operador, como 15
widgets nativos `greenhouse_creativa_*`, uno por contenedor full-width. Header/footer Ohio sin cambios;
`/agencia-creativa-v2/` (`251279`) sin cambios ni redirección.

## Identidad de la mutación

| Dato | Valor |
| --- | --- |
| Página | `249582` |
| Hash antes | `cdc078d25a3ba71df65e3597ba8354f3aa3b826e061ebdf5dd61e31f90c01c90` |
| Hash después | `3b8e8e03070a5ca22066dd78552ab3af96e64bba631fac463f0f7aca045a56ad` |
| Snapshot de rollback | `_gh_creativa_before_20261015_143257` (elements, settings, metas) |
| Snapshot del intento fallido | `_gh_creativa_before_20261015_142950` |
| Runtime | commit `8ed6626`; loader desplegado vivo **sin commit** (comparte archivo con WIP ajeno) |
| Greenhouse | commit `c7aac361e`; formulario publicado aparte en `fa62b4fdd` |
| Contrato de paquete | `creativa-elementor-release.v1` |
| Carril | `pnpm public-website:ssh-check` → `pnpm public-website:wpcli -- --eval-file … --input-file … --wp-user 12` |

Metas Ohio aplicadas con el mismo contrato que Home/v2 (título y breadcrumbs ocultos, sin wrapper ni top
padding, márgenes full-width `0px`, logo `light_variant`, menú custom con texto `rgba(255,255,255,0.78)`).
Page settings: `hide_title=yes` y `custom_css` desde `page-custom.css`. `_thumbnail_id=249672` restaurado.
Yoast intacto.

## Incidente del primer intento

| Momento | Hecho |
| --- | --- |
| Publicación 1 | El publisher tomó el snapshot `_gh_creativa_before_20261015_142950` y llamó `Document::save` |
| Falla | Fatal `TypeError: array_merge(): Argument #2 must be of type array, string given` en `elementor/includes/managers/controls.php:846`, módulos `portafolio` y `equipo`: un campo media/video de repeater ausente de la fila 1 recibió default string |
| Estado parcial | `Document::save` ya había escrito los page settings (58 claves, incluido el `custom_css` nuevo sobre el layout **viejo**), borrado `_thumbnail_id` y descartado `_elementor_controls_usage`. `_elementor_data` quedó intacto |
| Recuperación (~2 min) | Restaurados page settings, controls usage y thumbnail desde `_gh_creativa_before_20261015_142950`; verificado igual al snapshot; purga |
| Corrección | La clase base fuerza defaults array en media/video; el stub de prueba rechaza defaults no-array en URL/Media (raíz y repeaters); el publisher hace preflight de controles y render de todos los widgets antes de escribir |
| Publicación 2 | Limpia; hash final `3b8e8e03…a56ad` |

Lecciones: `Document::save` escribe settings antes que elements, así que un error de controles deja la
página a medio escribir; el preflight debe ocurrir antes de cualquier escritura; Elementor elimina
`_thumbnail_id` al guardar y hay que restaurarlo.

## Verificación en vivo

- Desktop 1440 y móvil 390: `scrollWidth == clientWidth`.
- Los 15 módulos renderizan con su media.
- Tabs operan con clic y flechas; copias de loop del marquee presentes.
- El formulario `efeonce-creative-diagnostic` renderiza desde el contrato gobernado; CTA `#0375db` tras
  corregir el override de tokens (antes salía teal `#36c8bf`).
- Reduced motion: animaciones `none` y 0 de 15 videos reproduciéndose.
- Exactamente un `h1`.
- Hashes de Home y v2 sin cambios; chrome global sin cambios.
- Local: `php tests/creativa-modules.test.php` (15 módulos, 188 checks de campos editables, repeaters,
  escaping, URL, medidor, embed y fallback del formulario).

## Límites

- **Envío real pendiente:** ningún envío humano desde navegador todavía (Turnstile bloquea la
  automatización). No se afirma `form_destination_attempt=succeeded` ni se cambió la fila del TRACKING-PLAN.
- **Fidelidad del formulario frente al canvas** (verificado en código y en vivo): una columna, selects en
  «¿Qué te frena hoy?» y «¿Cuándo quieres partir?», sin iconos, checkbox de consentimiento del renderer y
  URL de privacidad cruda. La mayor parte es **configuración**: la versión publicada usa `select` y no
  declara iconos, aunque el renderer soporta `type: 'radio'` como tarjetas (`ghf-choice-group--cards`) y
  `presentation.icon`; las dos columnas se activan con `@container (min-width: 520px)` y el formulario
  midió 516 px dentro de la tarjeta host de 588 px (36 px de padding); la URL cruda es copy del formulario.
  Brechas reales del renderer: look exacto de chip/pill, checkbox estilo AXIS `axis-choice` y listbox custom
  más allá de `country_select`. Remediación (versión nueva con radio + iconos conservando los valores de
  opción, más ajuste de la tarjeta host) **no ejecutada**.
- **Contenido sin validar por el operador:** cifra Sky 94 % (el caso publicado dice 88 %; la nota al pie
  cita «caso publicado de Sky Airline, métricas de entrega de 12 meses»); permisos de uso de trabajo de
  Sky, Berel, GORE, Bresler, Eusari, Marca Chile y Pabellón y de la imagen/videos del avión Sky; claims
  «nada más que firmar», «aunque no trabajemos juntos» y «Sin compromiso».
- **Yoast:** título «Agencia Creativa en LATAM» y descripción con «más de 120 marcas» sin actualizar.
- **Editor:** no se probó editar, guardar y recargar desde la interfaz Elementor.
- **Versionado:** el loader vivo no está en el commit runtime; reconstruir desde git no reproduce el vivo.
- Los tar de `/tmp` del deploy son temporales.
