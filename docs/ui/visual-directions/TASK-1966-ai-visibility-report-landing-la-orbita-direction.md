# TASK-1966 — Landing del Efeonce AI Visibility Report con «La órbita» · Dirección visual

> **Tipo:** dirección visual (repo-native-benchmark). **Creado:** 2026-10-02 por Claude (Opus 5.5).
> **Superficie:** `think.efeoncepro.com/brand-visibility` (repo `efeonce-think`, `src/pages/brand-visibility/index.astro`).

## Modo y fuente

- **Modo:** `repo-native-benchmark`. La dirección no se inventa: se ancla en tres fuentes ya aprobadas por el operador.
- **Fuente 1 — artboard aprobado:** canvas [«Marcas SEO y AEO de Efeonce»](https://claude.ai/artifact/3wPmSbb24fm1pJqAPcv9ac),
  artboard `project/HeroAssessment.dc.html` («Landing del AEO Assessment», 1440 × 900), aprobado el 2026-09-29 junto con
  las cuatro submarcas («están aprobados todos»). Es la composición de este hero.
- **Fuente 2 — norma web de la línea:** `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.1
  (una pareja pregunta–respuesta por hero; respuesta de 1 a 3 palabras y ≥ 3× la pregunta; teléfono mobile-first).
- **Fuente 3 — submarcas SEO/AEO:** skill `efeonce-graphic-line` → `criteria.md` («Submarcas de producto SEO/AEO») y
  `applications.md` §B3c: línea **Engine**, lockups `*-lockup-*` de `@efeoncepro/axis-brand-assets`, la submarca nunca firma.
- **Decisión del operador 2026-10-02 que modifica la fuente 1:** la página se llama **Efeonce AI Visibility Report** y
  lleva ese logo (no el de AEO Assessment que muestra el artboard). Se conserva todo lo demás del artboard.

## Decision

La landing deja de ser un hero de producto genérico (degradé navy, eyebrow amarillo, lupa con resplandor, titular de
cinco líneas) y pasa a ser una pieza de la familia SEO/AEO de Efeonce en la línea **Engine**:

1. **Encabezado:** el lockup oficial `ai-visibility-report-lockup-negative.svg` (Efeonce | AI Visibility Report) a la
   izquierda; enlace de texto «Cómo funciona» a la derecha que baja al framework.
2. **Hero:** fondo navy Engine plano; pregunta chica «¿Te recomiendan las IA?» con el anillo de la línea como viñeta;
   respuesta grande «Averígualo» en Bricolage Grotesque con la esfera Engine cerrando la palabra; lead de una frase;
   motores; CTA principal.
3. **La órbita:** una sola en toda la página, la órbita Engine oficial `orbit-engine-dark-screen.svg`, fuera de eje a la
   derecha, sin texto que la cruce. Es órbita **vacía** (decorativa): no lleva arco de medida porque la landing no tiene
   un dato real.
4. **Debajo del hero:** las secciones existentes (formulario, framework de cinco niveles, vista previa del informe) se
   pasan a la paleta Engine y retiran sus degradés teal/amarillo y la segunda órbita CSS de la vista previa.
5. **Firma:** pie con el logo de Efeonce y el eslogan «Empower your Engine» debajo, al 64 % del ancho del logo.

## Desktop target

- Viewport de referencia 1440 × 900 (artboard aprobado); debe sostenerse en 1280.
- Márgenes laterales 96 px en 1440 (token de márgenes del sitio Think si existe; si no, `clamp()` proporcional).
- Encabezado a 64 px del borde superior; lockup a 34 px de alto.
- Bloque de voz en la columna izquierda (≈ 660 px), comenzando cerca del 28 % de la altura.
- Órbita a la derecha, con su centro desplazado hacia la derecha y arriba (criterio §7: «la órbita fuera de eje»);
  puede salir del borde derecho. La voz nunca entra al anillo.
- El formulario queda debajo del hero, en su tarjeta, a todo el ancho del contenedor.

## Mobile target

- 390 × 844 compuesto mobile-first (norma §4.1: «nada de escritorio encogido»).
- Lockup en una línea a ≥ 24 px de alto; si no cabe, se usa el mismo archivo más chico, **nunca** el isotipo solo ni un
  lockup armado a mano.
- Órbita detrás, recortada arriba a la derecha y con menor opacidad de halo; la voz debajo de ella sin cruzarla.
- Respuesta «Averígualo» a ≥ 3× la pregunta y sin cortar la palabra (tamaño fluido con `clamp()`).
- CTA en la zona del pulgar; los motores en una fila que no desborda.

## Token mapping

| Elemento | Valor | Fuente |
|---|---|---|
| Fondo del hero y del pie | navy Engine `#091951` | `efeonceGraphicLine` línea Engine (fondo oscuro), reflejado en el artboard aprobado |
| Acento (anillo-viñeta, esfera de la respuesta, órbita) | Engine `#0375db` | línea Engine; sólo en gráficos y texto ≥ 24 px (mide ≈ 3,6:1 sobre `#091951`) |
| Texto secundario sobre navy | `#cfe4fa` | artboard aprobado |
| Texto principal sobre navy | `#ffffff` | artboard aprobado |
| Tipografía de la respuesta | Bricolage Grotesque 760, interletrado −0,035 em | artboard aprobado; Think ya carga `@fontsource-variable/bricolage-grotesque` |
| Tipografía de voz y cuerpo | Poppins 300/400/500/600 | artboard aprobado; Think carga `@fontsource/poppins` |
| Lockup | `ai-visibility-report-lockup-negative.svg` | `@efeoncepro/axis-brand-assets` 0.4.10, copiado sin modificar |
| Órbita | `orbit/orbit-engine-dark-screen.svg` | `@efeoncepro/axis-brand-assets` 0.4.10, copiado sin modificar |
| Logo de la firma | `efeonce-logo-negative.svg` | `@efeoncepro/axis-brand-assets` 0.4.10 |
| Eslogan | «Empower your Engine», ancho = 0,64 × ancho del logo, separado 1,35 veces su cuerpo | `efeonceGraphicLine.motion.layout.sloganOfLogo` / `sloganGapOfFont` |

Think no depende de los paquetes AXIS (decisión práctica de TASK-1325: tokens copiados). Los valores se declaran **una
sola vez** como variables CSS en un módulo de tokens de Think (`src/lib/report-tokens.ts` o uno hermano para la línea),
con comentario de procedencia (paquete y versión). Ningún HEX suelto en el CSS de la página.

## Anti-patterns

- Dos órbitas en la página (la órbita del hero + la `snapshot-orbit` de la vista previa, o los anillos del panel de
  análisis visibles a la vez que la órbita del hero).
- Texto que cruza la órbita, en cualquier ancho.
- Arco de medida o esfera posicionada como si fuera un puntaje: la landing no tiene dato.
- La lupa con mango y resplandor (`HeroAnswerLens`): no es la lente de la línea (la lente lleva arco y esfera).
- El lockup armado a mano (logo Efeonce + texto «AI Visibility Report» en HTML) o editado; el isotipo junto al logo.
- El acento Engine en texto menor a 24 px.
- Eslogan «Empower your Growth» en una pieza Engine, o el eslogan a cuerpo fijo, al lado o encima del logo.
- Degradés de lavado, chips amarillos de eyebrow y teal como acento: no pertenecen a la línea Engine.
- La URL `efeoncepro.com` como texto suelto donde corresponde la burbuja oficial.
