# TASK-1741 — Dirección visual del detalle editorial de Careers

## Fuente y tesis seleccionada

- Modo: `repo-native-benchmark`.
- Dirección elegida: **Editorial dossier**.
- Tesis: la vacante debe leerse como una oportunidad de trabajo concreta, no como una landing corporativa ni como una ficha genérica de job board. El primer fold prioriza rol, seniority público, promesa, modalidad y el CTA ya existente; el cuerpo convierte la evidencia del puesto en un ritmo editorial abierto.
- Surface: `/public/careers/[publicId]` dentro de `CareersPublicShell`.
- Rigor: `ui-standard`.

## Decision

Seleccionar `Editorial dossier`: role-first, evidence-led, dos CTA existentes y una composición abierta que evita tanto el job board genérico como la landing de marca.

## Alternativas comparadas

### A. Editorial dossier — seleccionada

- Orden: título y nivel → promesa/misión → facts operativos → CTA existente.
- Jerarquía: outcomes y trabajo son el núcleo; skills, remoto, beneficios y proceso completan la decisión.
- Densidad media, ancho de lectura controlado y una sola rail de resumen.
- Hero inmersivo, secciones abiertas, banda de beneficios y rail contenido.
- Dos columnas en desktop; secuencia lineal en 390 px, con CTA temprano y resumen al final.
- Firma: numeración editorial sutil en outcomes, contraste tipográfico entre esencial y aprendible, benefits band sin card soup.
- Firma del bloque remoto: un único panel tonal con explicación `async-first`, facts operativos y un resumen
  geográfico compacto. Globo y contador cargan la semántica; una pila de hasta cinco banderas SVG circulares
  controladas aporta ritmo visual y la lista completa permanece disponible mediante disclosure nativo. Los
  assets salen de `circle-flags` 2.8.3 (MIT), se empaquetan localmente y nunca dependen de emojis o un CDN.

### B. Marketplace de talento — rechazada

- Prioriza metadata y filtros; optimiza comparar muchas vacantes, no comprender una.
- Rechazo: normaliza Efeonce como job board y reduce la capacidad inbound del aviso.

### C. Agencia cinematográfica — rechazada

- Prioriza manifiesto/imagen de marca y depende de assets/motion.
- Rechazo: aumenta peso y riesgo visual sin ayudar a decidir qué hará la persona.

## Desktop target — 1440 px

1. Header público existente.
2. Hero navy: eyebrow, `h1`, seniority público, facts candidate-facing, promesa y CTA verde existente.
3. Body en grid con columna editorial y rail sticky existente con el segundo CTA azul.
4. Secuencia: misión → resultados → trabajo → esenciales/aprendibles/evidencia → remoto/países → compensación aprobada → beneficios → proceso.

## Mobile target — 390 px

- Hero en una columna y CTA verde antes del cuerpo.
- Facts con wrap; ningún carrusel horizontal.
- Secciones abiertas en el mismo orden semántico del DOM.
- Rail no sticky al final, con el segundo CTA existente.
- Ninguna sección vacía, ningún tercer CTA y `scrollWidth === clientWidth`.

## Token mapping

- Hero/background/text/accent: variables semánticas navy, surface, text y green ya definidas en Careers.
- Display/body: Poppins y Geist mediante variables vigentes.
- Espaciado/radio/elevación: variables locales existentes; ninguna escala paralela.

## Anti-patterns

- Card soup, rails de color decorativos, manifesto corporativo primero, stock, motion ornamental, tercer CTA, truncado semántico y cualquier valor visual literal nuevo.

## Mapeo al sistema y primitives

- Decisión: `extend` local; no crear primitive global.
- Reusar `CareersPublicShell`, Next `Link`, botones, chips, summary rail y HTML semántico existentes.
- No introducir MUI/CompositionShell en la ruta pública ni añadir breadcrumb.
- Superficies: hero `immersive`; secciones `open`; beneficios `band`; rail `contained`.
- Poppins de display y Geist de lectura mediante variables existentes.
- Color, espaciado, radios, elevación y estados sólo desde variables de Careers. No editar `.root`, agregar HEX ni crear motion nueva.

## Contrato de contenido y fallback

- El contenido estructurado gana por sección cuando está completo.
- Un bloque parcial complementa la prosa legacy; nunca elimina requisitos, descripción o proceso disponibles.
- No se truncan listas en la vista de detalle cuando el schema usa la lista completa.
- `remoteModel`, países elegibles y compensación estructurada son visibles si alimentan `JobPosting`.
- Los países se resuelven a nombres localizados; sus códigos ISO no son el label visible. Las banderas SVG son
  decorativas, usan un mapa estático de los 20 países aprobados y degradan a un globo neutro si aparece un código
  sin asset. La lista completa vive en el DOM dentro de `details/summary`, de modo que el resumen visual no oculta
  ni contradice la elegibilidad de `JobPosting`.
- Labels estables viven en `src/lib/copy/*`; hechos del rol sólo vienen del payload público.
- `publicSeniority` es candidate-facing y obligatorio al publicar; nunca se sustituye por el nivel interno.

## Acción, accesibilidad y guardas

- Exactamente dos links con `opening.applyHref`: hero y rail.
- Un `h1`, secciones con `h2`, listas reales, foco visible, contraste AA y orden DOM lógico.
- La separación esencial/aprendible no depende sólo del color; reduced motion conserva el significado.
- No tocar el formulario, su página ni sus estilos.
- No modificar selectores agrupados detail/apply; clases nuevas `.editorial*` aisladas.
- Flag server-side default OFF.
- El schema sólo se activa con el renderer activo; rollback: schema OFF primero, renderer OFF después.

## Checkpoint del primer fold

Implementar hero, promesa, facts, CTA existente y comienzo de outcomes en 1440/390. Capturar e inspeccionar antes de completar el resto. Decisión requerida: `ACCEPT FIRST FOLD` o `REVISE` con regiones específicas.

## Evidencia final

- GVC `premium`, 1440×1200 y 390×844; first fold/full page, foco, overflow, headings, console/hydration/HTTP y reduced motion.
- Fixture completa en tests y estado real parcial en staging; la falta de contenido aprobado se declara, no se rellena.
- Scorecard: promedio ≥4.5; ninguna dimensión <4; jerarquía, economía de superficies, impacto visual, fidelidad y resistencia a plantilla genérica ≥4.5.
