# TASK-2059 — Contrato de primera sala Rooms

- Visual direction mode: repo-native-benchmark
- Product Design asset: `docs/ui/visual-directions/TASK-2059-rooms-first-experience-direction.md`

## Desktop Target

1440×900. Cabecera ligera, lockup oficial y marca de demostración. Columna editorial junto a una pieza dominante, título y siguiente acción claros. Inventario completo de la muestra bajo el relato. Vista interna con salas y permisos efectivos sin convertir el contenido en dashboard.

## Mobile Target

390×844 y 320px. Orden contexto, título, pieza y acción. Navegación de capítulos accesible y ancho acotado. Lectura editorial en una columna; detalle en diálogo con regreso a la pieza y sin scroll horizontal de página.

## Action Hierarchy

Primaria: explorar la propuesta. Secundarias: abrir pieza, leer artículo, ver radiografía/evidencia. Gestión: ver salas y consultar permisos según can. El selector de persona está rotulado como demostración y nunca autentica un usuario real.

## Visual Fidelity Mapping

La órbita desde AXIS: fuentes Bricolage/Poppins, navy/papel, acento Growth, Button y Dialog/Tabs publicados. Tokens traducidos en adapter Rooms. Arte ficticio conserva su composición independiente y ratios originales; no reproduce una propuesta cliente.

## Copy Ledger

Copy de interfaz: `../efeonce-rooms/src/lib/copy/rooms.ts`. Muestra comercial: `../efeonce-rooms/src/server/fixtures.ts`. Distinguir «Demostración», «Contenido de ejemplo», «Sin medición» y «Acceso restringido»; no prometer guardado, envío ni publicación inexistentes.

## State Copy

| State | Copy y recuperación |
|---|---|
| ready | «Explorar propuesta», capítulo y edición identificados; abrir detalle o cambiar capítulo |
| loading | «Cargando la sala…»; región de estado sin porcentaje ficticio |
| empty | «Todavía no hay salas disponibles»; volver al inicio |
| partial | «Muestra de demostración» y «Sin medición»; conservar contenido disponible y contexto |
| error | «No pudimos abrir esta sala»; reintentar o volver |
| denied | «No tienes acceso a esta vista»; volver a una vista permitida sin filtrar contenido |

## Accessibility Contract

Un h1 por pantalla; skip link, navegación con nombres, foco visible y vuelta al disparador de Dialog. Escape cierra el detalle. Sin datos internos en payload cliente. Reduced motion elimina transiciones y el contenido no reproduce sonido automáticamente. Axe incluye revisión de incomplete y contraste medido sobre superficies sólidas.

## Implementation Mapping

Runtime nuevo autorizado `../efeonce-rooms`, main. App Router en src/app; componentes RoomExperience/OperatorWorkspace en src/components; DTO browser-safe desde src/domain/contracts.ts. Reader server-side y can de TASK-2058; el frontend recibe permisos efectivos. Adapter visual en src/styles; ningún import a componentes Greenhouse.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/rooms-first-experience.scenario.ts`
- Latest capture manifest: `.captures/2026-10-25T21-13-43_rooms-first-experience/manifest.json`
- Latest review dossier: `.captures/2026-10-25T21-13-43_rooms-first-experience/review-dossier.md`
- AXIS and ViewTransitions verification: `docs/ui/reviews/TASK-2059-rooms-first-experience/motion-axis/review.md`

Quality profile: premium. Escenario ejecutable del consumidor `../efeonce-rooms/tests/experience.spec.ts`. Desktop 1440×900, mobile 390×844, tablet 1024×768 y 320px. Capturas entrada, pieza, lectura, radiografía, workspace y acceso restringido. Markers data-capture: room-entry, room-stage, room-detail, editorial-reader, evidence-panel, operator-workspace. Assertions de scroll-width/scrollWidth, foco, Escape, regreso, fuente cargada, permisos y ausencia de notas en cliente. Review dossier: docs/ui/reviews/TASK-2059-rooms-first-experience/. Baseline decision: primera implementación sin baseline aprobado; surface ID rooms.first-experience. No aceptar automáticamente los píxeles como diseño aprobado.

## Design Decision Log

2026-10-25: dirección editorial seleccionada frente a 3D y dashboard; la UI se construye después de base mínima, antes de persistencia. Can y proyecciones cliente/operador/admin desde el primer corte. Datos sintéticos permiten revisar sin tocar CRM ni medios cliente. Se reusan primitives publicados; nuevas composiciones sólo del dominio Rooms. Riesgo pendiente: feedback visual del operador y conexión real Efeonce ID.

2026-10-25, continuación: Button, Badge y CountBadge publicados de AXIS; logo oficial más legible; paginación de piezas en el visor y ViewTransition de React para cambios de capítulo/pieza. Los cambios de persona hacen navegación de documento completo. Movimiento reducido, navegador sin API y documento oculto conservan la actualización inmediata. La entrada del diálogo conserva texto opaco; el movimiento no reduce su contraste. GVC final: cuatro tamaños, 68 frames, cero hallazgos. Esta evidencia local no certifica login federado ni aceptación visual del operador.
