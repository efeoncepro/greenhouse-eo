# EPIC-028 — Producer V3: Unified Studios

## Normalización de la solicitud

- Objetivo: elevar Globe frente a las referencias líderes en creación multimodal, especialmente en la relación entre composer, muro de candidatos, stage de medios e inspección de assets.
- Decisión de producto: Producer V3 es un shell unificado con Image Studio, Video Studio y Audio Studio. No es un rewrite total ni tres productos aislados.
- Loop principal: entrar al contexto → definir intención → preparar y estimar → generar → revisar candidatos → inspeccionar/refinar → organizar/reusar/revisar.
- No se inventan contratos server-side. La UI consume lectores, comandos, capabilities y RouteCreativeContractV1 ya gobernados por Globe.
- Estado de esta dirección: contrato de diseño listo para handoff; no habilita implementación por sí solo ni implica que las tasks de runtime estén completas.

## Mode and source

- Mode: repo-native-benchmark.
- Durable sources:
  - [TASK-1523 direction](TASK-1523-globe-creative-suite-experience-logic-direction.md)
  - [TASK-1505 approved direction](TASK-1505-globe-creative-producer-approved-direction.md)
  - [Composer style reference](../GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md)
  - [Premium UI delivery standard](../GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md)
  - [Creative Studio architecture](../../architecture/creative-studio/README.md)
  - [Client motion contract](../../architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md)
  - [Client application decision](../../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md)
  - [TASK-1552](../../tasks/in-progress/TASK-1552-globe-producer-composer-focused-creation.md)
  - [TASK-1633](../../tasks/in-progress/TASK-1633-globe-producer-operation-input-control-contract.md)
- Provenance / approval: consolida las decisiones locales vigentes de EPIC-028, TASK-1505 y TASK-1523; requiere validación GVC antes de implementación.
- Selected frame/state: desktop first fold de una sesión activa, con composer visible, PreviewStage dominante y Candidate Wall contextual.

## Alternatives

| Dirección | Composición | Fortaleza | Riesgo |
|---|---|---|---|
| A. Creative Control Room + editorial media stage | Composer persistente, stage grande, wall de candidatos y sidecar contextual | Une creación, juicio visual y continuidad de sesión | Requiere disciplina de densidad |
| B. Chat-led creative canvas | Conversación principal con resultados embebidos | Reduce la barrera inicial y favorece exploración | Oculta controles, estado, coste y comparación |
| C. Technical generation console | Controles densos, diagnósticos y parámetros visibles | Potente para operadores expertos | Se percibe como herramienta técnica y fragmenta la experiencia |

## Decision

Se elige **Creative Control Room + editorial media stage**. El prompt y la intención siguen siendo el punto de entrada, pero el resultado recibe suficiente espacio para ser juzgado, comparado y reutilizado. El chat puede existir como ayuda secundaria; el grafo técnico queda para diagnóstico futuro. La elección preserva la dirección editorial de TASK-1523 y la composición prompt-first de TASK-1552.

## Visual thesis

- First-fold reading order: contexto de proyecto/sesión → studio activo → intención/composer → estimate y Generate → PreviewStage → Candidate Wall → acciones de asset.
- Dominant decision: elegir si una idea merece refinarse, compararse, reutilizarse o revisarse.
- Density: núcleo compacto; capacidades adicionales en docks y sidecars; no convertir el composer en un formulario infinito.
- Depth model: stage editorial abierto, superficies contenidas para controles y sidecar; máximo tres superficies visualmente contenidas en el first fold.
- Typography role: Poppins solo para títulos de display y momentos editoriales; Geist para controles, datos, estados y lectura continua. Usar tokens AXIS/Globe, nunca valores literales.
- Color role: base neutral/deep-blue institucional y un accent semántico; estados también expresados con texto, icono y estructura.
- Signature details: stage dominante, Candidate Wall como filmstrip/contact sheet, estimate honesto, status persistente y acción de inspección que abre el mismo Asset Workspace.

## Information architecture

1. Global Producer shell: identidad Globe, workspace, contexto y navegación de salida.
2. Entry Hub: empezar una sesión, continuar una sesión reciente, elegir intención o abrir un proyecto existente.
3. Project / Session: proyecto y sesión visibles como contexto estable; la sesión conserva prompt, inputs, candidatos, lineage y estado.
4. Three studios under one shell:
   - Image Studio: composición, referencias, variaciones, Focus + Compare y edición regional gobernada.
   - Video Studio: frames/inputs declarados por la ruta, movimiento, duración, formato, Poster/Video Hero, timeline y MediaDock.
   - Audio Studio: script/voice/inputs declarados por la ruta, duración/formato y Sonic Canvas con waveform real y AudioDock.
5. Candidate Wall / Session Feed: continuidad de candidatos y sesiones dentro del feed/viewer existente; no es una segunda library, feed o viewer.
6. Asset Workspace: inspección contextual de un asset, lineage, provenance, derechos, compare, reuse, review y acciones gobernadas.

## Shell, recipes and primitives

- CompositionShell: aplicar la anatomía de shell unificado con modo leadPlusContext en desktop y focused con contexto temporal en mobile. En Globe se usa el runtime/primitivas nativas equivalentes; no se importan componentes Greenhouse MUI al sibling runtime.
- Recipe: híbrido command-center + review-studio, con composer como lead de acción, PreviewStage como lead visual y AdaptiveSidecar para contexto/inspección.
- AdaptiveSidecar: sidecar in-flow en desktop; drawer temporal en 390px; se abre para inspect, compare, rights/provenance y controles que no deben competir con la intención.
- PreviewStage: superficie dominante para el resultado activo. Se adapta a still, poster/video/timeline o waveform/audio sin cambiar el shell.
- Reuse: Globe Producer shell, tokens AXIS/Tailwind v4, feed/viewer, MediaDock, action rail, existing readers/commands y native asset identity.
- Extend: ProducerViewer hacia Asset Workspace, sidecar para revisión contextual, Candidate Wall para modality-aware cards y PreviewStage para los tres medios.
- New primitive: ninguno fundacional. Solo se permite un wrapper registrado de StudioModeFrame si el registry actual no puede expresar las slots del shell; no lleva lógica de negocio ni contrato nuevo.

## Composer contract

El composer común conserva cinco bloques:

1. Qué quieres crear: prompt, mejora/propuesta y acceso a historial/dock.
2. De qué partes: referencias y slots de input visibles.
3. Cómo se ve: dirección creativa y controles que el RouteCreativeContractV1 declare.
4. En qué formato sale: shape, finish, ratio/duración/resolución/formato y cantidad cuando el contrato lo permita.
5. Rail fijo: estimate, crédito/capacidad, estado y Generate como acción primaria.

La presencia, orden y copy de controles se deriva de operation, inputSlots, inputCombinations, creativeControls y outputContract. Nunca se renderizan ramas por provider slug, model slug o nombre interno. Un control no soportado se omite o se explica como no disponible; no se simula.

## Studio differentiation

| Studio | Composer | PreviewStage | Candidate Wall / Workspace |
|---|---|---|---|
| Image | prompt + references; direction; quality/count/ratio/finish según descriptor | still grande, zoom, Focus + Compare | contact sheet, lineage, compare y edición regional solo si está gobernada |
| Video | prompt + frames/inputs declarados; motion/elements/duration/ratio/resolution/audio según descriptor | Poster/Video Hero, controles de reproducción, timeline y MediaDock | poster/preview real, duración/dimensiones/audio presence, sin autoplay de toda la pared |
| Audio | script/voice/inputs declarados; duration/format y controles creativos declarados | Sonic Canvas, waveform/peaks reales y AudioDock de reproducción única | estado de reproducción, duración/formato, provenance y reuse; sin controles de cámara |

## States and content posture

Todos los studios deben expresar ready, loading, empty, partial, warning, stale, success, error, denied y unavailable/degraded. Loading comunica qué se espera; partial declara qué falta; stale atenúa la acción de reutilizar sin borrar el estado; error conserva inputs y ofrece recovery. Nunca se presenta una estimación, waveform, poster, duración o provenance fabricada como dato real.

La copy es breve y verbal: Crear, Estimar, Generar, Revisar, Comparar, Reusar, Descargar, Solicitar revisión, Ver provenance. Los estados usan texto y no solo color. El copy reusable se implementa desde src/lib/copy y la nomenclatura institucional desde src/config/greenhouse-nomenclature.ts.

## Responsive, accessibility and rights

- Desktop first fold: 1440×1000; el stage conserva el foco, el composer no se desplaza fuera de la decisión y el sidecar no roba el lead.
- Mobile: 390px; el shell se recompone a contexto → intención/composer → estimate/Generate → stage → filmstrip. El sidecar pasa a drawer, el wall a carrusel/filmstrip navegable y no aparece scroll horizontal.
- Keyboard: orden lógico por contexto, studio, composer, rail, stage, candidates y sidecar; Enter activa; Space reproduce/pausa donde corresponda; Escape cierra drawer/compare y restaura foco; focus visible siempre.
- Reduced motion: elimina aurora, parallax y transiciones ornamentales; conserva cambio de estado, loading persistente, selección, focus, error y reproducción mediante cambios estáticos/instantáneos.
- Rights/provenance: cada asset expone estado de asset governance, lineage, hashes/run/revision cuando el reader los entrega, C2PA/content credentials cuando existan, derechos y restricciones. rights_unverified no se muestra como aprobado. Release states son operativos: approved-commercial, approved-with-restrictions, proof-only, blocked e incident-replacement. Review humano y evidencia preceden delivery; promoción no equivale a aprobación.

## Anti-patterns

- Tres apps aisladas o tres rutas que dupliquen shell, feed o viewer.
- Composer genérico con todos los controles de todos los medios.
- Branches de UI por provider/model slug.
- Segundo feed, viewer o library.
- Card wallpaper, autoplay wall, DAW/editor de video completo o grafo técnico como experiencia principal.
- Badges de derechos inferidos por apariencia, nombre de archivo o proveedor.

## First-fold and GVC

- Desktop scenario: Entry Hub → abrir sesión → elegir studio → editar prompt → cambiar un control declarado → ver estimate → Generate → observar estado → abrir candidato en Asset Workspace.
- Modality scenarios: repetir el recorrido para Image, Video y Audio comprobando que cambian slots, stage y controles sin cambiar el shell.
- Review scenario: Candidate Wall → abrir PreviewStage → compare/review/reuse → inspeccionar lineage y provenance.
- Mobile scenario: 390px, mismo recorrido con drawer, filmstrip y focus restore.
- Reduced-motion scenario: misma secuencia con motion reducido y estado equivalente.
- Evidence: captures de first fold, loading, partial, error, success, denied y derechos; markers producer-composer, prompt-bar, reference-tray, route, output-shape, estimate, generate-primary, candidate-wall, preview-stage y asset-workspace.

## Acceptance signature

- Dirección reconocible en desktop y 390px.
- Jerarquía, economía de superficies, impacto, fidelidad y resistencia a template genérico con promedio mínimo 4.5/5 y ninguna dimensión bajo 4/5.
- Sin overflow horizontal, sin hover-only, con keyboard/reduced-motion y estados honestos.
- La implementación consume primitives/recipes/contratos existentes y deja el siguiente paso en las tasks mapeadas.
