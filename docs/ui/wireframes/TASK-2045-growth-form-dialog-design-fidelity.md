# TASK-2045 — Growth Forms y Growth CTA: formulario diseñado en diálogo — wireframe

> Superficie: `<greenhouse-form>` (renderer de Growth Forms) dentro del diálogo que abre `<greenhouse-cta>` con la
> acción `open_growth_form` y `presentation: 'dialog'`. Sitio público (WordPress/Elementor, Astro), fuera del portal.
> Diseño de referencia: popup «Quiero ser partner» del canvas «Partners — Efeonce», versión 14
> (`https://claude.ai/artifact/JTxu8GHSsrTU2LqXSvwCrp`), clases `.pmodal`, `.pmodal-card`, `.pgrid2`, `.pf`,
> `.pconsent`, `.pm-close`. Línea gráfica: La órbita (skill `efeonce-graphic-line`).

## Visual Direction Contract

- **Fuente de la dirección:** el popup aprobado del canvas de Partners. Es la referencia de aceptación: el formulario
  real tiene que verse igual que el del canvas a 1440 y a 390, sin CSS de parche en la landing más allá de los tokens y
  hooks que esta task publica.
- **Lo que el renderer debe reproducir:** tarjeta navy (`#001a33`) con borde agua translúcido y la esquina inferior
  izquierda casi recta (`28px 28px 28px 6px`, la forma de La órbita); grilla de dos columnas con «Sitio web» en media
  columna; campos de 48 px de alto con radio de 12 px, fondo `rgba(207,228,250,.05)` y borde `rgba(207,228,250,.22)`;
  etiquetas de 13 px en peso 500; placeholder al 45 %; foco con borde `#36c8bf` y halo de 3 px; casilla de
  consentimiento compacta de 18 px con el enlace dentro de la frase; botón primario «Enviar propuesta» con flecha.
- **Lo que pone la landing y no el renderer:** el anillo del eyebrow, el punto del título y la flecha del botón son
  piel de la marca, aplicada por hooks estables (`data-ghf-*`, `data-ghcta-*`). El renderer no dibuja marca de
  Efeonce por su cuenta; los valores entran como tokens `--ghf-*` y `--ghcta-dialog-*`.
- **Por qué así:** el problema de origen es que un diseño de canvas «no se puede usar» con Growth Forms. Si la
  fidelidad depende de CSS a medida por landing, el problema vuelve en el siguiente diseño. Tokens + hooks + contrato
  (TASK-2044) hacen que el siguiente diseño sólo declare valores.
- **Lo que no cambia:** el look por defecto de los formularios vivos (`efeonce-media-diagnostic`,
  `efeonce-inbound-diagnostic`, `efeonce-hubspot-scope`). Todo valor nuevo tiene un default igual al actual.

## Layout

### Escritorio (≥ 761 px)

```
┌──────────────────────── velo: rgba(0,8,20,.72) + blur 10px ─────────────────────────┐
│                                                                                     │
│        ┌──────────────────── tarjeta 640 px máx · padding 44/44/40 ───────────┐      │
│        │                                                         ( × ) 44px  │      │
│        │  ◯ ¿Eres una plataforma?                 ← eyebrow (dialog.eyebrow) │      │
│        │  Sumémonos●                              ← título 48px Bricolage    │      │
│        │  Cuéntanos qué tecnología ofreces…       ← bajada 15px, máx 460px   │      │
│        │                                                                     │      │
│        │  Nombre y apellido        │ Correo de trabajo        ← half · half  │      │
│        │  [ Tu nombre          ]   │ [ tu@empresa.com     ]                  │      │
│        │  Empresa o plataforma     │ Sitio web                ← half · half  │      │
│        │  [ Nombre de la plat… ]   │ [ https://           ]                  │      │
│        │  ¿Qué ofreces y a quién le sirve?                    ← full         │      │
│        │  [ Tu tecnología, el problema que resuelve…       ]  96px           │      │
│        │                                                                     │      │
│        │  ☐ Acepto que Efeonce use estos datos …, según su política de       │      │
│        │    privacidad.                            ← consent compact + link  │      │
│        │                                                                     │      │
│        │  [ Enviar propuesta → ]                   ← submit, alineado inicio │      │
│        └─────────────────────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

- Diálogo centrado; la tarjeta hace scroll propio si no cabe (`max-height: calc(100vh - 48px)`), nunca la página.
- Separaciones: 28 px entre la bajada y la grilla, `18px 20px` dentro de la grilla, 20 px antes del consentimiento,
  24 px antes del botón.

### Teléfono (≤ 760 px)

```
┌──────────── velo ────────────┐
│                              │
│                              │
│ ┌─ hoja inferior ──────────┐ │  ← se alinea abajo, radio 24 24 6 6, padding 32/20/28
│ │                    ( × ) │ │
│ │ ◯ ¿Eres una plataforma?  │ │
│ │ Sumémonos●               │ │
│ │ Cuéntanos…               │ │
│ │ Nombre y apellido        │ │  ← todo a una columna: `half` colapsa a `full`
│ │ [                    ]   │ │
│ │ Correo de trabajo        │ │
│ │ …                        │ │
│ │ ☐ Acepto …               │ │
│ │ [ Enviar propuesta → ]   │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- Hoja inferior pegada al borde (12 px de margen), con scroll interno y teclado en pantalla sin tapar el campo activo
  (`scroll-padding` y `interactive-widget=resizes-content` cuando el sitio lo declare).

## Content Slots

| Slot | Fuente | Copy del caso Partners | Notas |
|---|---|---|---|
| Eyebrow | `open_growth_form.dialog.eyebrow` (TASK-2044) | «¿Eres una plataforma?» | opcional; texto plano |
| Título | `open_growth_form.dialog.title`, si falta el titular del CTA | «Sumémonos.» | es el nombre accesible del diálogo |
| Bajada | `open_growth_form.dialog.lead` | «Cuéntanos qué tecnología ofreces y a quién le sirve. Revisamos cada propuesta con el equipo de la línea que corresponda.» | opcional |
| Campos | versión publicada del formulario | Nombre y apellido · Correo de trabajo · Empresa o plataforma · Sitio web · ¿Qué ofreces y a quién le sirve? | `presentation.width` por campo |
| Placeholder | campo del formulario | «Tu nombre», «tu@empresa.com», «Nombre de la plataforma», «https://», «Tu tecnología, el problema que resuelve y el tipo de cliente» | color por `--ghf-placeholder` |
| Consentimiento | casilla con `{privacyLink}` y `privacyLinkLabel` | «Acepto que Efeonce use estos datos para responder mi propuesta, según su {privacyLink}.» → «política de privacidad» | `presentation: 'compact'` |
| Botón | `submitLabel` del formulario | «Enviar propuesta» | flecha por hook de la landing |
| Éxito: ícono | `success_card.presentation.icon` | `orbit` (arco de La órbita) | `none` y `celebration` también válidos |
| Éxito: título y cuerpo | `success_card` | «Recibido.» · «Gracias por escribirnos. Revisamos tu propuesta y te contactamos por correo.» | |
| Éxito: acción | `success_card.actions[]` con `kind: 'dismiss'` | «Cerrar» | cierra el diálogo |
| Cerrar (×) | microcopy del renderer del CTA (`copy.ts`) | aria-label «Cerrar» | 44 × 44 px |

Todo el copy de producto sale del contrato (formulario o CTA) o del diccionario del renderer; nada se escribe en el
markup de la landing.

## States

| Estado | Qué se ve | Disparador |
|---|---|---|
| Cerrado | sólo el botón del CTA en la página; `<greenhouse-form>` no existe en el DOM | carga de la página |
| Abriendo | velo y tarjeta entran (ver motion); el formulario se monta y pide su contrato | clic o Enter/Espacio en el botón |
| Cargando contrato | esqueleto de la grilla con la forma real de los campos dentro de la tarjeta | entre el montaje y la respuesta |
| Listo | formulario completo, foco en el primer campo | contrato recibido |
| Validación | mensaje bajo el campo, borde de error con token; el foco va al primer campo inválido | envío con errores |
| Desafío de Turnstile | el widget aparece **dentro** de la tarjeta, bajo el botón, sin salir del diálogo | el servidor pide desafío |
| Enviando | botón deshabilitado con indicador; el diálogo no se cierra con Escape ni con clic fuera | envío |
| Éxito | la tarjeta cambia al estado de éxito, el foco pasa al título «Recibido.» | respuesta OK |
| Error de envío | alerta dentro de la tarjeta con acción de reintentar; los datos se conservan | fallo de red o servidor |
| Contrato no disponible | mensaje y enlace de respaldo del CTA (si lo declara); el diálogo se puede cerrar | formulario sin versión publicada o error 4xx/5xx |
| Cerrando | la tarjeta sale; el foco vuelve al botón que la abrió | ×, Escape, clic en el velo, «Cerrar» |
| Sin JS | el botón del CTA es un enlace al respaldo (página del formulario o correo) | JS no disponible |

## Implementation Mapping

| Pieza del diseño | Dónde vive | Cómo |
|---|---|---|
| Diálogo, velo, tarjeta, × | `src/growth-cta-renderer/` (nuevo módulo de diálogo junto a `slide-in.ts` y `disclosure-focus.ts`) | `<dialog>` nativo con `showModal()`; `::backdrop` con `--ghcta-dialog-backdrop`; tarjeta con `--ghcta-dialog-surface`, `--ghcta-dialog-radius`, `--ghcta-dialog-border`, `--ghcta-dialog-shadow`, `--ghcta-dialog-max-width`, `--ghcta-dialog-padding` |
| Encabezado del diálogo | `src/growth-cta-renderer/renderer.ts` | lee `presentation` y `dialog` de la acción (TASK-2044); hooks `data-ghcta-dialog-eyebrow`, `-title`, `-lead` |
| Montaje del formulario | `src/growth-cta-renderer/action.ts` | crea `<greenhouse-form>` al abrir (no en la carga), con `form-slug`, `surface`, `color-scheme` heredado del CTA |
| Grilla y ancho por campo | `src/growth-forms-renderer/renderer.ts` | `presentation.width` (`half`/`full`) manda; `auto` conserva `fieldPrefersFullWidth` |
| Tokens del campo | `src/growth-forms-renderer/styles.ts` | nuevos `--ghf-field-min-height`, `--ghf-field-radius` (ya existe radio de campo: verificar y reutilizar), `--ghf-label-size`, `--ghf-label-weight`, `--ghf-placeholder`, `--ghf-btn-radius`; defaults = valores actuales |
| Esquema oscuro | `src/growth-forms-renderer/element.ts` + `styles.ts` | `color-scheme="dark"` aceptado y bloque de tokens oscuros; hoy sólo se honra `light` |
| Consentimiento compacto con enlace | `src/growth-forms-renderer/renderer.ts` | `presentation: 'compact'` = casilla nativa de 18 px con `accent-color` por token; el marcador se reemplaza por un `<a>` creado con DOM (nunca `innerHTML`); sin el párrafo de enlace aparte |
| Éxito con órbita y «Cerrar» | `src/growth-forms-renderer/renderer.ts` | `icon: 'orbit'` dibuja el arco de La órbita en SVG con tokens; `dismiss` emite `ghf:dismiss` y el CTA cierra el diálogo |
| Turnstile | `src/growth-forms-renderer/turnstile.ts` | contenedor dentro del formulario, no en `document.body` |
| Piel de la landing | CSS de la landing (Partners) | sólo tokens y pseudo-elementos sobre los hooks; ningún selector interno del renderer |
| Fixture | `src/growth-forms-renderer/__fixtures__/` o Lab del renderer `[verificar ubicación del Lab de Growth Forms]` | reproduce el popup de Partners con un contrato de prueba |

## GVC Scenario Plan

- Escenario: fixture «partners-dialog» servido por el Lab o la página de prueba del renderer; captura con Playwright
  (`pnpm fe:capture` no aplica al sitio público; usar el Playwright del renderer).
- Viewports: 1440×900, 1024×768, 390×844, 360×740.
- Pasos y capturas: cerrado → abierto (listo) → validación (correo inválido) → enviando → éxito → cerrado (foco
  devuelto). En 390, además, con el teclado en pantalla simulado sobre «¿Qué ofreces…?».
- Comparación: lado a lado con el board del canvas v14 a los mismos anchos; diferencias de medida ≤ 2 px en alto de
  campo, radios, paddings y separaciones.
- Aserciones: `scrollWidth == clientWidth` con el diálogo abierto; el `body` no hace scroll mientras está abierto;
  `<greenhouse-form>` ausente antes de abrir; ningún `gh_form_viewed` antes de abrir; Turnstile dentro del `<dialog>`;
  axe sin violaciones en abierto y en éxito.
- Marcadores `data-capture`: `growth-cta-dialog`, `growth-form`.

## Design Decision Log

| Decisión | Alternativas | Por qué |
|---|---|---|
| Presentación `dialog` de la acción `open_growth_form` | usar la colocación `popup_modal`; un modal propio de la landing | `popup_modal` es interruptiva (aparece sola, con tope de frecuencia y restricciones móviles); el modal propio rompe la promesa de no adaptar nada |
| `<dialog>` nativo | div con `role="dialog"` y trampa de foco a mano | el nativo da inert de fondo, Escape y `::backdrop`; menos código y menos fallas de foco |
| Montar el formulario al abrir | montarlo oculto en la carga | evita `gh_form_viewed` falsos, ahorra la petición del contrato y no inicializa Turnstile fuera de la vista |
| Tokens + hooks, marca en la landing | que el renderer traiga el look de Efeonce | el renderer sirve a cualquier diseño y a otras marcas; la marca se declara, no se codifica |
| `half` colapsa a una columna bajo 520 px de contenedor | respetar `half` siempre | en teléfono dos columnas de 160 px no se pueden escribir; el canvas también colapsa |
| Glifo `orbit` en el renderer | imagen subida por la landing | es un glifo de marca reutilizable y liviano en SVG con tokens; una imagen no hereda el color del esquema |
