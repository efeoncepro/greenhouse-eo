# TASK-2043 — Dock inferior de las landings (wireframe)

> Contrato visual del mecanismo `efeonce.landing-dock`. Se deriva del diseño aprobado en el canvas «Mega menú
> efeoncepro.com», [claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj](https://claude.ai/artifact/FiyK4Uqrt8vqnSMw6qvgMj),
> versión 80, fila «Dock inferior de las landings». Aprobación del operador, textual: «Apruebo el dock en vidrio;
> pásaselo a la sesión del menú para construirlo en AXIS y en las landings».
>
> - Arquitectura: [`PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md) §Dock inferior de las landings.
> - Flujo: [`TASK-2043-landing-dock-flow.md`](../flows/TASK-2043-landing-dock-flow.md) (nodo del flujo maestro de EPIC-055).
> - Motion: [`TASK-2043-landing-dock-motion.md`](../motion/TASK-2043-landing-dock-motion.md).

## Visual Direction Contract

- **Modo:** `source-led`. La fuente duradera es el canvas citado arriba, con sus tableros:

  | Tablero | Medida | Muestra |
  |---|---|---|
  | «Hoy: siete docks, siete estilos» (DockHoy) | 1440×800 | Inventario del antes: Redes Sociales e Influencers en escritorio, seis landings en teléfono |
  | «Dock · escritorio, en vidrio» (DockEscritorio) | 1440×1452 | Vidrio claro sobre una sección clara (Redes Sociales), vidrio oscuro sobre navy (HubSpot) y sobre fotos (Influencers) |
  | «Dock · teléfono, en vidrio» (DockTelefono) | 1680×888 | Inicio sin línea, SEO en vidrio claro con tinta blanca, Inbound con dos botones y Performance |
  | Nota teal de reglas de la fila | — | Vidrio, tono, medidas, botones, posición y visibilidad |

- **Sistema:** La órbita y los tokens de AXIS. El vidrio es el de la isla del menú global (`axisSiteNav.island`), nunca
  una receta nueva. Poppins para todo el dock.
- **Sesión de fidelidad:** «Rediseño de Menú» mide la paridad con `getComputedStyle` a 1440 y 390 en el Lab y en cada
  landing real.
- **Objetivos:** escritorio 1440×900 y 1366×768; teléfono 390×844 y 360×740.

## Layout

### Escritorio (más de 768 px)

```text
                 ┌───────────── vidrio · radio 24 · padding 8 (24 a la izquierda con texto) ─────────────┐
                 │ SIGUIENTE PASO            ┌────────────────────┐ ┌──────────────────────┐             │
  centrado ────▶ │ Activa creators con …     │ Agenda una reunión │ │ Cuéntanos tu campaña │  alto 61    │
                 │ (15/500, antetítulo 11/600)└── principal 45 ────┘ └──── secundario 45 ───┘  (63 borde) │
                 └───────────────────────────────────────────────────────────────────────────────────────┘
                                              20 px al borde inferior
```

| Región | Medida | Detalle |
|---|---|---|
| Barra | `width: max-content`, máximo `100% − 80px`, a 20 px del borde | Radio 24; padding 8, o 8 8 8 24 cuando lleva texto; alto 61 (63 con el borde). |
| Texto (opcional) | Una línea, con elipsis si no cabe | 15/500, interlineado 1,3; antetítulo opcional 11/600 en mayúsculas, tracking .08em, opacidad .7; 8 px antes del primer botón. |
| Botón principal | 45 de alto, padding 0 18, radio 16 | Poppins 15/600. Acento de la línea de la landing con su tinta (blanca en Engine). Sin línea: el botón del agendador de la isla (blanco en oscuro, navy en claro). |
| Botón secundario (opcional) | Igual | Vidrio del botón del menú en oscuro; transparente con borde `rgba(0,26,51,.16)` y texto navy en claro. |

### Teléfono (hasta 768 px)

```text
┌──────────────────── 12 px a cada borde ────────────────────┐
│ ┌───────────────────────┐ ┌───────────────────────┐        │
│ │  Agenda una reunión   │ │      Diagnóstico      │ alto 61│
│ └───────────────────────┘ └───────────────────────┘        │
└──────────── 12 px + área segura al borde inferior ─────────┘
```

- Sin texto. Los botones se reparten el ancho (`flex: 1 1 0`, padding 0 12) y usan la etiqueta corta si la landing la
  declara (`shortLabel`).
- `presence: 'desktop' | 'phone'` deja el dock en un solo lado del corte de 768 px.

## Content Slots

| Slot | Fuente | Regla |
|---|---|---|
| Nombre accesible | `label` del documento | Nombre del `aside`; describe el paso, no el diseño. |
| Línea | `line` | Una de las líneas de la línea gráfica (`growth`, `brand`, `engine`, `voice`, `revenue-hubspot`, `revenue-salesforce`); ausente en el inicio. |
| Antetítulo y texto | `text.eyebrow`, `text.text` | Sólo escritorio; el copy es el de la landing, sin cambios. |
| Acciones | `actions[0]` (principal) y `actions[1]` (secundaria) | Agendar es siempre la principal y usa el agendador nativo con `cta-location="landing_dock"`; el resto son enlaces. |
| Etiqueta corta | `actions[].shortLabel` | Sólo teléfono; requiere visto bueno del operador porque es copy. |

### Copy por landing (el actual de cada una)

| Landing | Presencia hoy | Texto | Principal | Secundario |
|---|---|---|---|---|
| Redes Sociales | escritorio | «¿Listo para crecer en social?» | «Reunión» (agendador) | «Auditoría» → `#auditoria` |
| Influencers | ambos | «Siguiente paso» / «Activa creators con derechos claros» | «Agenda una reunión» (agendador) | «Cuéntanos tu campaña» → formulario |
| Inicio | teléfono | — | «Agenda una reunión» (agendador, sin línea) | — |
| SEO | teléfono | — | «Diagnostica tu visibilidad» → `#grader` | — |
| Inbound | teléfono | — | «Agenda una reunión» (agendador) | «Diagnóstico» → `#diagnostico` |
| Servicios HubSpot | teléfono | — | «Agendar reunión» (agendador) | «Ir al formulario» → `#agenda-form` |
| Performance | teléfono | — | «Agenda un diagnóstico» → `#diagnostico` | — |

## States

| Estado | Qué se ve | Cómo se llega |
|---|---|---|
| Oculto antes del hero | Nada; fuera del orden de tabulación | Carga de la página con el hero a la vista |
| Visible | Dock en su tono | El fondo del hero queda sobre la mitad de la ventana |
| Oculto cerca del final | Nada | Formulario o CTA final a 120 px o menos de la ventana |
| Oculto con el menú | Nada | Un mega o el onepage del menú global abiertos |
| Oculto con cookies | Nada | El banner de cookies está a la vista |
| Tono claro / oscuro | Vidrio claro u oscuro | Lo que hay detrás: tono declarado, luminancia o foto (oscuro) |
| Sin JavaScript | Dock visible y fijo; enlaces | `@media (scripting: none)` |
| Agendador sin superficie | El botón sigue su enlace de respaldo | Superficie no configurada o renderer sin respuesta |
| Movimiento reducido | Aparece sin desplazarse | `prefers-reduced-motion: reduce` |

## Implementation Mapping

- Primitive: `efeonce.landing-dock` en `@efeoncepro/axis-ui-primitives` (`landingDockHtml`, `landing-dock.css`,
  `landing-dock.js`), tokens `axisLandingDock`, esquema `landing-dock.v1` en `@efeoncepro/axis-ui-contracts`.
- Sitio: módulo «Dock de landing» en el plugin `eo-elementor-widgets` (`efeonce-public-site-runtime`): documento por
  página en el meta `_eo_landing_dock` (con marcadores de inicio, final y agendador), port PHP validado contra
  `fixtures/landing-dock/cases.json`, impresión en `wp_footer`, un lanzador `<greenhouse-cta>` oculto con
  `cta-location="landing_dock"` y el puente que abre el agendador al escuchar `axis-landing-dock:cta`.
- Copia fijada de AXIS en `assets/vendor/axis/landing-dock/<versión>/` con `VERSION.json` y sha256.
- Retiro de los siete docks viejos en el mismo paso en que cada landing recibe el nuevo.

## GVC Scenario Plan

- Lab: `apps/lab/src/test/e2e/landing-dock.spec.ts` en AXIS (carril `site-nav`), demos
  `/demos/landing-dock/<social|influencers|hubspot|home|seo>/` y `?cookies=1`.
- Sitio: Playwright contra cada landing en vivo a 1440×900 y 390×844 (y 768/769 en el corte): oculto sobre el hero,
  visible a mitad de página, oculto en el formulario, oculto con el mega y el onepage, tono sobre claro, navy y foto,
  agendador abierto desde el dock con `cta-location="landing_dock"`, cero docks viejos en el DOM.
- Markers: `data-capture="landing-dock"` en el dock.
- Scroll-width: `scrollWidth == clientWidth` con el dock visible.
- Evidencia: capturas por landing y ancho, y el visto bueno de la sesión «Rediseño de Menú».

## Design Decision Log

- **Una primitive, no siete:** el dock vive en AXIS y cada landing sólo declara su documento. Alternativas descartadas:
  ajustar los siete estilos a mano en cada landing (vuelven a divergir) y un componente del tema hijo (valores de
  diseño fuera de AXIS).
- **El vidrio es el de la isla:** dos recetas aprobadas en el menú; una tercera sería otra decisión de diseño.
- **Presencia por página:** la nota del canvas define cómo es el dock en cada ancho, no en qué páginas aparece. Se
  conserva la presencia de hoy hasta que el operador decida (consulta de la sesión de fidelidad, 2026-10-23).
- **Foto = oscuro:** el vidrio oscuro se lee sobre cualquier foto y el claro no sobre una foto oscura.
- **Agendador:** Inbound, HubSpot e Influencers usan su propio CTA; Redes Sociales e Inicio usan el del menú
  (`site-nav-discovery-meeting`) porque agenda con la misma página de HubSpot (`efeoncepro/agenda-discovery`, scheduler
  `discovery`) que la pestaña embebida de Social y que `/agenda/` del Inicio. SEO y Performance siguen como enlaces a su
  formulario porque no agendan.
- **Etiquetas cortas en teléfono:** son copy; pendientes del operador (Influencers).
