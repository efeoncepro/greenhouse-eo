# TASK-2040 — Navegación global del sitio (wireframe)

> Contrato visual del mecanismo `efeonce.site-nav`. Se deriva del diseño aprobado en el canvas «Mega menú
> efeoncepro.com», [claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj](https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj),
> versión 67 del 2026-10-18. El canvas es la fuente visual; este documento fija regiones, estados y medidas para
> construir sin volver a decidir.
>
> - Arquitectura: [`PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md).
> - Flujo maestro: [`EPIC-055-public-site-global-navigation-UI-FLOW.md`](../flows/EPIC-055-public-site-global-navigation-UI-FLOW.md).
> - Motion: [`TASK-2040-site-nav-motion.md`](../motion/TASK-2040-site-nav-motion.md).

## Visual Direction Contract

- **Modo:** `source-led`. La fuente duradera es el canvas citado arriba, con sus tableros:

  | Tablero | Medida |
  |---|---|
  | «Menú completo · escritorio» | 1440×900 |
  | «Escritorio · mega menú (Soluciones, Recursos y Nosotros)» | 1440×900 |
  | «Escritorio · mega menú Recursos» | 1440×900 |
  | «Escritorio · desplegable Nosotros» | 1440×440 |
  | «1280 × 720 · mega menú fluido y compacto» | 1280×720 |
  | «1181–1279 · mega menú en dos columnas» | 1200×760 |
  | «Menú onepage · escritorio (hamburguesa)» | 1440×900 |
  | «1024–1180 · onepage en tableta horizontal» | 1024×768 |
  | «769–1023 · onepage en tableta vertical» | 834×1112 |
  | «Menú onepage · teléfono» | 390×844 |
  | «Arriba», «Bajando» y «Subiendo» (cabecera al hacer scroll) | — |
  | «Mapa de breakpoints del menú» | — |
  | «Sistema del menú: contenido, piezas y movimiento» | — |

- **Sistema:** La órbita (design system `efeonceorbit` del canvas) y tokens de AXIS. Poppins para navegar y Bricolage
  sólo en titulares de panel. Navy `#001a33` como fondo de paneles y cabecera fija.
- **Aprobaciones del operador** en hilos del canvas:
  - 2026-10-17: «Opción 2», la cápsula con mega menús convive con la hamburguesa del onepage en escritorio.
  - 2026-10-18: receta de vidrio homologada, logo a 164 px, hover del botón del agendador, fotos por servicio y dos
    esferas en el panel de Soluciones como excepción.
- **Objetivos:** desktop 1440×900 y 1366×768; móvil 390×844 y 360×740.

## Layout

### Cabecera

| Región | Arriba (96 px) | Isla al subir (61 px, a 12 px del borde) |
|---|---|---|
| Contenedor | Ancho completo, transparente sobre el hero. | Una isla centrada, `min(1180px, 100% − 48px)`, radio 24, padding 8 (72 a la izquierda para la hamburguesa). Vidrio que cambia de tono: oscuro sobre fotos y secciones oscuras, claro sobre secciones claras. |
| Hamburguesa | Círculo de 48 px de vidrio en x=40, centrado vertical. | 44 px dentro de la isla (x=8). En tono claro, trazos navy sobre `rgba(0,26,51,.06)`. |
| Logo | 164 px de ancho, a 116 px del borde. | 128 px. Negativo en tono oscuro y navy en tono claro. |
| Cápsula | Centrada por `space-between`. Padding 4, ítems 10×16 a 15 px/500, radio 20. Vidrio. | Ítems sin vidrio propio; texto blanco u navy según el tono. |
| Botón agendador | Vidrio, 13×20 a 15 px/600, radio 20. | 11×18, radio 16. Blanco con texto navy en tono oscuro; navy con texto blanco en tono claro. |

Bajando: la cabecera sale de vista. Subiendo: entra la versión fija.

### Mega «Soluciones»

```text
┌ panel flotante · radio 16 · tope 1.360 px · max-height calc(100dvh − 128px) ───────────────────────┐
│ LÍNEAS (280)          │ SERVICIOS de la línea (fluido)               │ FOTO 440×236 (mm)           │
│ ● Growth   (acento)   │ [ícono Trazo 22] Loop Marketing  «Ciclo a…» │ respuesta (Bricolage, ●)    │
│   Brand               │ [ícono] Content Marketing                    │ caso: título + enlace       │
│   Engine              │ …                                            │                             │
│   Voice / Revenue     │ (columna con overflow-y: auto)               │ «Estás aquí» si aplica      │
├───────────────────────┴──────────────────────────────────────────────┴─────────────────────────────┤
│ FRANJA INFERIOR: diagnóstico + contacto                                                            │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- 1280–1439: tres columnas fluidas (280 · resto · 380).
- 1181–1279: dos columnas; la foto y la respuesta salen y el caso baja a la franja.

### Mega «Recursos»

Mismo panel. Columnas:

- **Izquierda:** formatos (Glitch con su logo negativo, Marketing con Manzanitas, Herramientas, Guías descargables).
- **Centro:** lo último del formato, como lista de notas.
- **Derecha:** tarjeta destacada con foto de 440×248 (`card`), tipo, título, extracto y CTA.

La franja inferior invita a suscribirse a Glitch. Una sola esfera, en Growth.

### Desplegable «Nosotros»

Tarjeta de 360 px bajo su botón, con padding 8, radio 16 y fondo navy. Tiene tres filas (nombre 17/600 y descripción
14/400 `#cfe4fa`) con flecha al hover.

### Onepage

- **Panel:** a pantalla completa, fondo `#001a33`.
- **Columna izquierda** (desde x=96, ancho ~740):
  - Cabecera interna con logo y X en la misma posición que la hamburguesa.
  - Ítems principales.
  - Al elegir Soluciones, sus líneas y servicios. Al elegir Recursos o Nosotros, sus hijos.
  - Pie de 64 px con redes (círculos de 40 px), © y Privacidad.
- **Columna derecha** (x=610, 830×900): foto `op` y respuesta de la línea (Voice) superpuesta abajo.
  - En tableta horizontal la foto es angosta.
  - En tableta vertical y teléfono no hay foto.
- **Máximo dos niveles.**

### Teléfono (390)

- Cabecera con logo y hamburguesa de 48 px.
- El onepage abre en círculo, sin foto.
- El botón del agendador va al pie del menú, con el acento de la línea abierta.

## Content Slots

Todo texto, enlace y foto viene del documento `site-nav.v1` (ver arquitectura §Modelo de datos). El primitive sólo
trae etiquetas de sistema:

| Etiqueta | Texto |
|---|---|
| `aria-label` de la hamburguesa | «Abrir menú» / «Cerrar menú» |
| Navegación principal | «Principal» |
| Diálogo del onepage | «Menú del sitio» |
| Marca de contexto | «estás aquí», en minúsculas |

## States

| Estado | Qué se ve |
|---|---|
| Por defecto | Cabecera arriba, todo cerrado. |
| Panel abierto | Un solo panel. Fondo atenuado `rgba(0,10,22,.62)` a opacidad 0,6. Flecha girada. |
| Línea o servicio con foco | Anillo de acento en el ícono, nombre +4 px y el resto al 55 %. La columna derecha cambia. |
| Foto cargando | La foto anterior se queda hasta que la nueva cargó. Nunca un hueco. |
| Foto ausente o con error | La columna derecha muestra sólo respuesta y caso. Ningún ícono de imagen rota. |
| Recursos sin datos dinámicos | Muestra el `featured` fijo del documento. |
| Etiquetas largas | Se cortan en dos líneas como máximo, con elipsis. La cápsula no crece más de 575 px. |
| Contexto «Estás aquí» | La línea o el servicio de la landing actual se marca al abrir. |
| Sin JavaScript | Los enlaces de la cápsula y del onepage existen en el HTML. Los disparadores son enlaces a su página índice (`/soluciones/`, `/blog/`, `/about-us-efeonce/` [verificar destinos]). El botón del agendador es un enlace a `/agenda/`. |
| Teclado | Foco visible `2px #72ded8` con offset 3. |
| Movimiento reducido | Sin desplazamientos; cambios instantáneos. |
| Tacto (`hover: none`) | Abre y cierra por toque, sin vista previa por servicio. |

## Implementation Mapping

- **Paquete:** `@efeoncepro/axis-ui-primitives`, export `site-nav` (render de servidor), `site-nav.css` y `site-nav.js`.
  Sigue el patrón de `mention.ts`, `mention-css.ts` y `mention-react.ts` en `packages/primitives/src`; aquí sin React.
- **Contrato:** `efeonce.site-nav` en `@efeoncepro/axis-ui-contracts`, con el esquema `site-nav.v1` exportado como JSON
  Schema para que el plugin de WordPress lo valide.
- **Tokens:** receta de vidrio, alturas de cabecera, tamaños de logo y tiempos de motion en `axis-tokens`, con un nombre
  de grupo por definir en la task. No van como literales en el CSS del sitio.
- **Íconos:** catálogo Trazo de AXIS (`resolveIcon`), 22 px.
- **Logo:** `@efeoncepro/axis-brand-assets`. Glitch con su logo negativo oficial.
- **Lab:** `/patterns/efeonce.site-nav/`, con el documento de ejemplo del canvas y los ajustes «Contexto» y «Cabecera».

## GVC Scenario Plan

GVC es la herramienta de captura del portal. En AXIS la evidencia equivalente se toma con Playwright sobre la página del
Lab, con el mismo plan:

- **Superficie:** Lab `/patterns/efeonce.site-nav/` (surface ID `axis-lab-site-nav`).
- **Viewports:** 1440×900, 1366×768, 1280×720, 1180×820, 1024×768, 834×1112, 390×844 y 360×740.
- **Pasos:**
  1. Cabecera arriba.
  2. Abrir Soluciones por hover y por teclado.
  3. Cambiar de línea y poner foco en un servicio.
  4. Abrir Recursos y Nosotros.
  5. Abrir el onepage, recorrer un hijo y cerrar con Esc.
  6. Hacer scroll abajo y arriba para ver la cabecera fija.
- **Marcadores `data-capture`:** `site-nav-header`, `site-nav-mega`, `site-nav-dropdown`, `site-nav-onepage`.
- **Verificaciones:**
  - `scrollWidth` igual a `clientWidth` en todos los viewports.
  - Foco visible en cada paso de teclado.
  - Contraste del texto sobre el vidrio ≥ 4,5:1 en navy, negro y una foto clara.
  - Movimiento reducido sin desplazamientos.
- **Dossier y baseline:** el dossier va adjunto a la task. La baseline es nueva, sin comparación previa.

## Design Decision Log

| Decisión | Por qué |
|---|---|
| Cápsula y hamburguesa juntas en escritorio («Opción 2») | El operador quiere los dos accesos: mega para explorar y onepage para recorrer todo. |
| Una sola receta de vidrio, esmerilada y oscurecida | Se probó en navy, negro, resplandor y fotos. El vidrio navy se veía distinto en cada pieza y el gris sin saturación quedaba opaco y bajaba el contraste. |
| Logo a 164 px | A 148 px quedaba liviano frente a controles de 48 a 53 px; a 176 px compite con la cápsula. |
| Onepage cerrado con círculo de 0 px | A 24 px dejaba un disco navy detrás de la hamburguesa y rompía el vidrio. |
| Fotos cargadas al abrir, nunca al entrar | El menú tiene unas 35 fotos en dos recortes; cargarlas al inicio castiga la carga de la página. |
| Cápsula oculta con `display:none` bajo 1.181 px | Evita que el teclado recorra elementos invisibles. |
| Dos esferas en el panel de Soluciones | Excepción aprobada; no se extiende a otros paneles. Recursos lleva una. |
| UI de producto como elementos abstraídos y no capturas, en las fotos | Regla del operador para las fotos phygital (AVR). Es del contenido, no del primitive. |
