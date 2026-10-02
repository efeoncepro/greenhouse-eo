# TASK-1951 — Coreografía original X-Ray ampliada

## Estado verificado de la superficie — 2026-09-30

La experiencia extendida está construida y la **muestra Think** está publicada. Evidencia de
release conservada en `../efeonce-think/.captures/aeo-xray-selector/release.json`:
commit `be8d4841e1124818bd7f4c88d0d7ad7b970e5122`, deployment
`dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB`, estado READY/Production y alias `think.efeoncepro.com`.
No registrar aquí el enlace completo del caso ni tokens. Esto no demuestra un rollout de
Greenhouse: sus grants, flags, migración y assets privados conservan estado propio pendiente.
El sample `sample_…` está incluido en Think y no hace una petición/grant Greenhouse; retirarlo
requiere remover registry/medios y redeploy. Es distribución no listada, no acceso autenticado.
Las rutas legacy y el renderer original se conservan. Arquitectura y detalle operativo:
`docs/think/radiografia-aeo-architecture.md` y `docs/think/aeo-xray-release-handoff.md`.

## Meta

- Status: implemented
- Owner task: TASK-1951
- Related wireframe: `docs/ui/wireframes/TASK-1951-aeo-xray.md`
- Related flow: `docs/ui/flows/TASK-1951-aeo-xray-flow.md`
- Motion type: microinteraction
- Primary primitive / library: CSS View Transitions originales + estado nativo Think + WAAPI del dialog de entrada.
- Copy source: UI/payload, nunca texto generado por animación.

## Motion Brief

Conservar la revelación②→③: la pieza leída se convierte en espécimen bajo el instrumento. Marco y riel quedan estables. El acoplamiento hace visible causa→dato; los átomos conservan procedencia. Motion orienta y explica, no simula crecimiento ni rendimiento bancario.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| Pieza②→③ | Siguiente | Lectura ancha→split conservando identidad | Experience/Article/Landing | Sí |
| Instrument | Entrada③ | Entrada lateral original | Instrument | Sí |
| Fuente bloque | Hover/focus | Tinte+barra, chip→N | Original coupling | Sí |
| Destino | Selección | Outline+pulso+origen← | Instrument | Sí |
| Hoja móvil | Activación | Hoja, chip↓ y origen↑ | Instrument | Sí |
| CTA lectura | Scroll | pending→floating→done original | Experience | Sí |
| Riel | Paso | Activo visible, marco estable | Experience | Sí |
| Átomo | Linaje | Señal semántica del padre | Atoms | Sí, no efecto decorativo |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| Bloque | Punto discreto | Tinte/chip | Igual+focus visible | Fija | Origen persistente | No spinner | Evidencia honesta |
| Instrument | Mapa | Destino relevante | Enlaces accesibles | Pin | Pila relacionada | Sin shimmer | Fuente/faltante |
| CTA lectura | Pending | Respuesta normal | Outline | Navega | Paso actual | Estado original | Done al fin |
| Hoja | Cerrada | No abre | Control visible | Abre | Dialog | Sin espera artificial | Cierra/restaura |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Narrativa |②lectura |③radiografía | CSS original/token AXIS | xr-article y hero compartidos; marco estable | Cambio inmediato |
| Máquina |③entrada | Instrument visible | original reveal | Entrada derecha, texto legible | Visible inmediato |
| Acoplar | Map | Focused/pinned | original feedback | Fuente susurra, destino marca; ajenos colapsan | Mismo borde/cuenta sin pulso |
| Hoja | Closed | Open | original sheet | Hoja+backdrop independientes | Dialog inmediato |
| Volver | Pin/hoja | Map/cerrado | original feedback | Focus restore | Igual inmediato |

## Primitive & Token Mapping

- Primitive: Experience/Article/Instrument/Atoms originales; Landing conserva identidad shared transition del espécimen.
- Imports allowed: CSS y tokens AXIS existentes, helpers Think.
- Imports forbidden: MUI, Framer/GSAP/Lottie añadidos sólo para duplicar coreografía.
- Timing tokens: conservar valores originales y mapear una vez a AXIS; no duraciones arbitrarias por cliente.
- Easing tokens: original/system; reduce elimina desplazamiento y pulso.
- Layout animation: View Transition del espécimen entre documentos; no animar height de artículo entero en JS.
- CSS properties: shared view-transition-name para pieza/hero, transform panel, outline/tinte de selección; texto siempre AA.
- GSAP/Lottie justification: no necesarios; original CSS ya resuelve relato.

## Reduced Motion Contract

prefers-reduced-motion reduce elimina morph, pulso, smooth scroll y entrada lateral. Cuatro pantallas y misma selección/cuenta/foco siguen disponibles. No depender de animationend/transitionend. Sin soporte View Transitions, navegación normal inmediata; no ocultar contenido mientras se espera animación.

## Accessibility & Feedback

Intermediate-frame contrast: AA preserved; texto opaco y superficies sólidas. Fuente usa tinte+barra, destino outline+marca, chips con flechas y cuenta; significado no depende de movimiento/color. Hover no mueve foco. Escape, Enter/Space, pin y cerrar equivalentes touch/teclado. Hoja contiene foco y lo restaura; riel activo siempre visible. Cue de scroll sólo panel cuando pila excede alto, no dos scrolls de documento.

## Performance Guardrails

Conservar implementación CSS original. Sin geometría en bucle mousemove, sin timers de cifras, parallax o videos autoplay. El recorrido ilustrativo usa timers de fases, no métricas que cuenten como resultados. No reanimar marco/riel al elegir pieza. SSR muestra hero seleccionado y contenido estable sin esperar JS. En móvil hoja sólo durante interacción, no capas compositor enormes. QA de lectura y panel-only scroll.

## GVC / Micro Evidence

- Scenario file: `../efeonce-think/scripts/verify-aeo-xray-v2.mjs`; complementos reales `verify-aeo-xray-motion.mjs`, `verify-aeo-xray-curtain.mjs`, `verify-aeo-xray-value.mjs` y `verify-aeo-xray-media.mjs`.
- Route: fixture local y `/aeo-xray/r/[token]?step=...&artifact=...`; los cuatro pasos originales.
- Viewports: desktop1440×1000, mobile390×844 touch y compact320×780 para overflow/medios.
- Quality profile: premium
- Required steps: oportunidad→lectura→radiografía→atomización, landing y artículo, selector conserva paso, back/reload/deep-link④, foco/pin/Escape, fuente, negativo revocado.
- Required captures: cuatro pantallas desktop/móvil; primer fold y pieza completa; radiografía enfocada/mapa/hoja; átomo social; negativo sin contenido.
- Required `data-capture` markers: xray-case, xray-artifact, xray-instrument, xray-atoms, xray-status; conservar hooks originales y class atom.
- Assertions: original SKY sin regresión; cuenta exacta; cero referencias huérfanas; pieza íntegra; fuentes fechadas; no datos bancarios inventados, secretos, analytics de token o schema bancario activo.
- Scroll-width checks: documento sin overflow; tabla/JSON con overflow interno anunciado.
- Accessibility/focus checks: teclado y touch equivalentes, foco visible y restaurado, headings/tablas semánticos, no-JS legible, AA medido.
- Reduced-motion evidence: recorrido completo con reduce; misma selección, texto y foco, sin depender de animationend.
- Review dossier: required; capturas/JSON reales en `../efeonce-think/.captures/aeo-xray-{v2,motion,curtain,value,media,selector}/`; el dossier y scorecard premium formal permanecen pendientes, no se infieren de tests.
- Baseline: surfaceId aeo-xray, sólo tras primer fold aprobado y cuatro pasos verificados.

- Required frame labels: reading-wide, transition-midpoint, radiography-final, hover, pinned, map, mobile-sheet, reduced-final.
- Intermediate-frame axe/contrast evidence: inspeccionar transición②→③y hoja; no certificar sólo frame final.

## Design Decision Log

La coreografía original es parte funcional del producto. Se descarta una apertura genérica de inspector como sustituto de②→③. No motion nuevo decorativo; ampliación a landing conserva misma gramática.

## Acceptance Checklist

- [x] Coreografía original y fallback, estados e imports definidos.
- [x] Geometría intermedia de View Transition y reduce:49 checks en motion; telón/foco/entrada gradual:44 checks en curtain y frames/GIF de producción.
- [ ] Scorecard y auditoría de contraste de todos los frames continuos: no se infiere de estas suites.
- [ ] CTA lectura y panel-only scroll originales sin regresión.

## Motion final: apertura, oportunidad y selección

| Elemento | Implementación/token | Destino/criterio | Reduce / sin JS |
|---|---|---|---|
| Telón | `--xr-motion-curtain: 1400ms`, `--xr-motion-curtain-ease: cubic-bezier(0.65,0,0.35,1)` | Dialog `translateY(0)` → `translateY(-100%)`; main56px →0; finish tras `lift.finished` | Reduce inmediato; noJS cierra form `method=dialog` |
| La oportunidad → La pieza | `--xr-motion-open`, `xr-article`/hero compartidos | Mismo contenido abre desde el preview, sin convertir otro artifact | Navegación/lectura completa inmediata |
| Otra pieza | `data-xray-direction=artifact` | Quita shared names a contenido distinto y mantiene shell/rail | Mismo paso y nueva pieza |
| Selector pill | `--xr-motion-control:300ms`, `xr-artifact-selection` | Indicador activo se mueve; labels con snapshots y z-index2 | Estado activo inmediato |
| Pregunta/respuesta/fuente | Fases query/answer/source del Opportunity | Demo comienza después del telón; botón Repetir; fuente ancla la respuesta | Contenido completo, no espera por timers |

### Corrección de unidades verificada en producción

El CSS fuente `1400ms` puede salir del optimizador como `1.4s`. WAAPI recibe milisegundos:
`parseFloat(value)` sin conversión producía1.4ms y la apertura parecía un salto. Leer la unidad
(`endsWith('ms') ? 1 : 1000`) antes de llamar a `animate`. No certificar este bug por devserver:
conservar build y readback productivo, imagen a mitad del desplazamiento y apertura publicada.
Evidencia de frames/GIF: `../efeonce-think/.captures/aeo-xray-selector/curtain-strip.png`,
`live-curtain-lift.png` y `apertura-publicada.gif`. Una captura final no demuestra duración.

El dialog conserva foco y bloquea scroll mientras está abierto. Doble activación no reinicia;
Escape levanta; cambio a reduce o document.hidden finaliza; navegación limpia sin reabrir.
Al terminar enfoca H1 con preventScroll. before-swap quita open del próximo documento para
que snapshot de Back/cambio de artifact no capture otro telón. SessionStorage por pathname.

### Stacking del selector durante View Transition

El indicador tiene snapshot `xr-artifact-selection`. Los iconos/labels llevan names propios y
`view-transition-class: xr-artifact-option`; `::view-transition-group(.xr-artifact-option)`
se dibuja arriba mediante z-index2. El orden DOM/z-index del link solo no resuelve el top layer:
se detectó indicador blanco cubriendo el texto activo en frames intermedios. Ambos snapshots
old/new evitan mezcla/fade y conservan labels legibles durante300ms. Revisar frames, teclado,
activo aria-current y compact320px. Archivos de evidencia `live-strip*.png` y
`selector-publicado.png` en el mismo directorio selector.

### Qué no se certifica por estas pruebas

Los49 checks motion y44 checks curtain preservados cubren comportamiento de la muestra.
No son una scorecard de diseño, una auditoría global WCAG ni prueba del grant Greenhouse.
No añadir herramientas de animación para recrear el motion existente; WAAPI aquí controla el
movimiento real del dialog, View Transitions la continuidad de la entidad entre rutas.
