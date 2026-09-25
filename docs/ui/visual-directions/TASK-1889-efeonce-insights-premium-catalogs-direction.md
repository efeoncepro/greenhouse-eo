# TASK-1889 — Catálogos premium de Efeonce Insights: dirección visual aprobada

## Mode and source

- Mode: `source-led`
- Durable source: hojas versionadas en este repo, exportadas del canvas aprobado el 2026-09-25:
  - [`a4-estructura.png`](./TASK-1889-efeonce-insights-premium-catalogs/a4-estructura.png) — portada navy, portada
    blanca de visibilidad, portada blanca creativa, contraportada, apertura de capítulo, resumen, lectura y plan.
  - [`a4-graficos.png`](./TASK-1889-efeonce-insights-premium-catalogs/a4-graficos.png) — páginas A4 de las familias
    de gráfico y la apertura del capítulo 02.
  - [`deck-graficos-y-prosa.png`](./TASK-1889-efeonce-insights-premium-catalogs/deck-graficos-y-prosa.png) — las 17
    láminas 16:9 equivalentes.
  - [`a4-escala-de-grises.png`](./TASK-1889-efeonce-insights-premium-catalogs/a4-escala-de-grises.png) — prueba de
    impresora en gris.
- Provenance / approval: canvas «Gráficos de Efeonce Insights» (Artifact de tipo Design, privado del operador,
  <https://claude.ai/artifact/M2GiA4NdBfgGkiAvwPjZYb>, versión 36). El operador aprobó página por página durante la
  sesión del 2026-09-24/25 y cerró con «así quiero que se vea un informe». El Artifact es la fuente editable; las
  hojas de arriba son la copia durable que este contrato exige.
- Selected frame/state: estado `ready` con datos de ejemplo coherentes entre sí (Google top 10 = 26; la IA nombra la
  marca en 31 de 50 respuestas; 19 citas con enlace). Las cifras son ilustrativas y **no** autorizan familias: eso lo
  decide la matriz de TASK-1888.

## Alternatives

1. **Catálogos v1 de TASK-1847** — ficha de evidencia (deck) + cuaderno analítico (A4), sobrios, casi monocromos. En
   producción desde 2026-09-24.
2. **Recolor de v1** — mismo esqueleto con la paleta AXIS aplicada. Probado en el canvas y rechazado por el operador:
   «sólo les estás cambiando el color».
3. **Premium editorial (seleccionada)** — cifra principal protagonista, panel navy de cierre, color con rol en los
   datos, portadas por módulo y contraportada institucional.

## Decision

Se adopta la dirección 3. Hereda de v1 la lógica de ficha (deck) y de cuaderno (A4): una conclusión por superficie,
procedencia visible y tabla equivalente. Cambia la jerarquía y el color: cada página abre con su cifra principal,
cierra con «Lo que significa / Próximo paso» y usa el color para decir qué es cada serie. La dirección 2 se rechaza
porque el color sin rol no agrega lectura, y el tablero impreso sigue rechazado como en TASK-1847.

## Visual thesis

- First-fold reading order (página de gráfico A4): antetítulo con ícono de métrica → cifra principal con bajada → título
  que afirma la conclusión y su lead → gráfico con leyenda → nota → fila de unidad/fuente/cobertura → panel navy
  «Lo que significa / Próximo paso» → pie institucional con folio «NN / total».
- Dominant decision: la cifra principal (Poppins 700, gran tamaño) y la frase que la interpreta.
- Density: media en deck (una idea por lámina); media-alta en A4, con aire en márgenes de 68 px.
- Depth model: plano. Profundidad sólo en portadas y aperturas (halo radial suave y una órbita fina); los paneles
  de cierre son planos con esquinas redondeadas; sin sombras de card.
- Typography role: Poppins para cifras, títulos, antetítulos en versalitas espaciadas y el panel de cierre; Geist
  para lectura y datos (`tabular-nums`). Eslogan «Empower your Growth» con los pesos del SSOT de marca.
- Color role:
  - Estructura y tipografía: navy manda. En papel, acento navy `#023c70`; en navy, acento teal `#36c8bf`.
  - Datos: actual = navy (papel) / teal (navy); anterior o referencia = teal profundo (papel) / periwinkle (navy);
    oportunidad = coral; ausencia = rayado neutro, nunca un color.
  - Teal y coral tienen la misma luminosidad: nunca son lo único que separa dos series (rayado, etiqueta directa o
    forma).
- Signature details:
  - órbita fina con un arco teal y un punto (la portada abre el recorrido, la contraportada lo cierra en el punto
    opuesto);
  - panel navy redondeado de cierre en Poppins;
  - pestaña lateral con el número de capítulo;
  - logos de canal en discos blancos (legibles en papel y en navy);
  - medidor de 270° con remates redondos compensados, sin sumar valor.

## Desktop target

Documento A4 (794×1123 px a 96 dpi) y lámina 16:9 (1280×720). No son vistas del portal:

- **A4 — portada navy:** logo en negativo + «Insights» teal, órbita arriba a la derecha, «Lectura de Efeonce», título
  en tres líneas, bajada, pie con «Preparado para» + logo del cliente, eslogan y línea de confidencialidad.
- **A4 — portada blanca:** bloque navy a sangre en el 55 % superior con logo, período, órbita cortada por el borde y
  la línea «Qué mide este informe»; título en navy de marca sobre papel; «Preparado para» con el logo del cliente en
  grande; pie. Variante de visibilidad con logos de canal como satélites; variante creativa sin logos.
- **A4 — contraportada:** navy, órbita centrada con arco en el punto opuesto al de la portada, logo y eslogan al
  centro, pie centrado con URL, redes, correo, teléfonos, dirección, mercados y línea legal.
- **A4 — apertura de capítulo, resumen, lectura y plan:** ver `a4-estructura.png`.
- **Deck:** fondo navy; columna izquierda con antetítulo, cifra principal, bajada y título; panel derecho redondeado
  con el gráfico y su fuente; franja inferior «Lo que significa / Próximo paso»; pie con logo, edición, URL y folio.

## Mobile target

No aplica al documento: el PDF se lee a tamaño físico. La lectura web de la misma edición es `InsightWebModelV1`
(TASK-1849 y TASK-1875), fuera de esta dirección.

## Token mapping

| Cue | Canonical token / primitive / recipe | Deviation |
|---|---|---|
| Fondo navy a sangre | `--axis-deck-navy-920` (#001a33) | ninguna |
| Acento en papel / título de portada blanca | `--axis-ppt-blue-800` (#023c70) | ninguna |
| Texto de páginas en papel | `--axis-ppt-indigo-950` (#020061) | ninguna |
| Acento en navy / dato actual en navy | `--axis-deck-teal-500` (#36c8bf) | ninguna |
| Halo y anillos de órbita | `--axis-deck-recipe-cover-halo-teal` (#72ded8) | ninguna |
| Dato anterior en papel | `--axis-deck-teal-650` (#1f9e94) | ninguna |
| Dato anterior en navy | `--axis-deck-blue-310` (#8aa8d8) | ninguna |
| Oportunidad en papel / en navy | `--axis-ppt-orange-500` (#d97757) / `--axis-ppt-red-300` (#ff7063) | ninguna |
| Texto secundario en navy | `--axis-deck-ice-200` (#b9c9e9) | ninguna |
| Papel de páginas interiores | `--axis-deck-surface-50` (#f7f8fa) | ninguna |
| Filetes, gris de etiquetas y borde punteado (#dde3ec, #6b7f99, #b7c3d3) | sin token en `report-tokens.css` | agregar al brand pack con rol, no literal |
| Roles de dato (actual/anterior/oportunidad/ausencia × papel/navy) | tokens semánticos nuevos del catálogo | nacen en TASK-1889 |

## Anti-patterns

- Colorear sin rol: dos series que sólo se distinguen por un tono de la misma luminosidad.
- Teal como acento en papel (el operador lo rechazó: el navy manda en blanco).
- `#001a33` como acento en papel: se lee negro.
- Card soup: tarjetas con borde sobre fondo gris para cada cifra.
- Cifras escritas a mano en la plantilla o datos de ejemplo en producción.
- Una portada por servicio: la portada es una sola y cambia por módulos.
- Logo del cliente en positivo sobre navy.

## Acceptance signature

- Average ≥ 4.5/5; hierarchy, surface economy, visual impact, fidelity and generic-template resistance each ≥ 4.5/5;
  no dimension below 4/5.
- Fidelity ≥ 4/5 contra las hojas de este directorio, página por página.
- Generic-template resistance ≥ 4/5.
- Evidencia en color y en escala de grises a tamaño físico; reduced-motion no aplica (documento sin animación).
