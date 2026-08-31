# TASK-1799 — Landing Content Marketing & Content Ops — Wireframe

## Meta

- Product Design asset: `docs/ui/visual-directions/TASK-1799-landing-content-marketing-content-ops.md`
- Visual direction mode: `repo-native-benchmark`
- Surface: public service landing
- Primary actor: operador de Marketing que investiga y audita proveedores
- Secondary actor: CMO que aprueba la recomendación
- Primary conversion: conversación cualificada sobre la operación de contenidos
- UI rigor: `ui-standard`

## Estado de implementación — 2026-08-31

Este wireframe conserva la planificación previa. El export Claude Design aprobado prevalece sobre
sus dibujos: hero centrado con palabra dinámica y trece módulos Elementor `hero`, `proof`, `problem`,
`system`, `atomization`, `hub`, `review`, `editorial`, `modes`, `ecosystem`, `business`, `faq`, `conversion`.
La raíz implementada es `.gh-content-module`, con `[data-content-module]` y markers `[data-capture]`.
No renombrar selectors ni volver a la composición preliminar para hacer coincidir el dibujo histórico.

[Implementación canónica](../../architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md) ·
[Auditoría y pendientes](../../audits/public-site/2026-08-31-content-marketing-publication.md).

## Brief

La landing hace visible un partnership de Content Marketing. El visitante debe pasar de «necesito
piezas» a «necesito un sistema y un equipo extendido». Notion, Frame.io y CMS aparecen como evidencia
de transparencia y capacidad operativa. La página mantiene fronteras claras con Inbound y servicios
especialistas, y prepara al operador para defender la elección ante su CMO.

## Desktop Target — 1440x1000

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ OHIO HEADER                                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ R0 HERO / MIDNIGHT                                                           │
│ eyebrow                  ┌────────── idea / insight ──────────────┐          │
│ H1 partner, no piezas    │ research → brief → mother content     │          │
│ subcopy                  │       ↘ reel · post · story · banner  │          │
│ [CTA primary] [see]      └───────────────────────────────────────┘          │
│ micro-proof / scope                                                    ↓     │
├──────────────────────────────────────────────────────────────────────────────┤
│ R1 PROOF BAND: visible operation · client stack · flexible ownership        │
├──────────────────────────────────────────────────────────────────────────────┤
│ R2 OPERATOR PROBLEM                │ fragmented pieces / versions / owners    │
├──────────────────────────────────────────────────────────────────────────────┤
│ R3 CONTENT SYSTEM / LOCALIZED PINNED STAGE                                  │
│ chapter rail       [living artifact transforms with each chapter]            │
├──────────────────────────────────────────────────────────────────────────────┤
│ R4 CONTENT HUB / PAPER        │ approved proof frame + what client can do     │
├──────────────────────────────────────────────────────────────────────────────┤
│ R5 CREATIVE REVIEW            │ frame/version/comment/approval                │
├──────────────────────────────────────────────────────────────────────────────┤
│ R6 ONE IDEA, MANY EXPRESSIONS / interactive channel selector                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ R7 BLOG & EDITORIAL OPS        R8 CMS OPS / verified capability              │
├──────────────────────────────────────────────────────────────────────────────┤
│ R9 OPERATING MODES / responsibility matrix                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ R10 ECOSYSTEM / spoke links, one boundary sentence each                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ R11 INTERNAL CASE FOR CMO / outcomes, governance, what changes               │
├──────────────────────────────────────────────────────────────────────────────┤
│ R12 PROOF + FAQ                                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ R13 CONVERSION / MIDNIGHT [form or scheduler host]                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ OHIO FOOTER                                                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

First-fold contract:

- H1, proposition and primary CTA are visible without scroll at common 1440×900/1000 viewports.
- The nucleus stage has greater visual mass than a normal illustration but never pushes the CTA below
  the fold.
- The following proof band peeks into the fold, signalling operational substance.
- Maximum one contained commercial CTA. The secondary is link/ghost treatment.

## Mobile Target — 390x844

```text
┌──────────────────────────────┐
│ OHIO HEADER                  │
├──────────────────────────────┤
│ eyebrow                      │
│ H1                           │
│ subcopy                      │
│ [CTA primary — full width]   │
│ [Mira cómo trabajamos]       │
│ compact idea stage           │
│ proof line                   │
├──────────────────────────────┤
│ operator problem             │
├──────────────────────────────┤
│ 01 research                  │
│  │ artifact                  │
│ 02 strategy                  │
│  │ artifact                  │
│ … vertical causal chapters  │
├──────────────────────────────┤
│ Content Hub proof            │
├──────────────────────────────┤
│ Review proof                 │
├──────────────────────────────┤
│ channel selector             │
│ selected derivative          │
├──────────────────────────────┤
│ Blog / CMS                   │
├──────────────────────────────┤
│ responsibility matrix        │
├──────────────────────────────┤
│ ecosystem / CMO / FAQ        │
├──────────────────────────────┤
│ conversion host              │
└──────────────────────────────┘
```

- Cero pinning, horizontal page scroll o carousel obligatorio.
- El orden semántico coincide con el visual.
- Los derivados y modos usan controles táctiles, pero el estado inicial ya comunica el conjunto.
- Las capturas se recortan por intención; no se achica un dashboard desktop hasta hacerlo ilegible.

## Action Hierarchy

1. `Conversemos sobre tu operación de contenidos` — primary, hero + cierre.
2. `Mira cómo trabajamos` — secondary, ancla a R3.
3. Seleccionar formato derivado o modo — exploración, no conversión.
4. Enlaces a SEO/AEO/Social/Influencer/Inbound/Creative — terciarios y contextuales.
5. FAQ disclosures — utility.

No habrá CTA distinto por sección. Cuando el primario reaparece conserva label, destino e intención.

## Layout skeleton

### R0 — Hero: partner + sistema

- Eyebrow comercial/indexable.
- H1 candidato: `Content Marketing para equipos que necesitan un partner, no otro proveedor de piezas.`
- Subcopy candidato: `Investigamos, planificamos, producimos, atomizamos y publicamos contigo, con una
  operación visible desde el research hasta cada formato y canal.`
- Stage «idea madre» con cinco expresiones visibles.
- Micro-proof sólo con claims comprobables.

### R1 — Prueba temprana

Tres afirmaciones máximo: `Operación visible`, `Trabajamos en tu stack`, `Tú eliges quién publica`.
No logos sin contexto. Si se muestran, cada uno lleva un qualifier de capacidad, no partnership.

### R2 — El problema que reconoce el operador

Contrastar el estado actual fragmentado con un sistema: briefs dispersos, versiones por chat, piezas
sin adaptación, CMS como cuello de botella y reportes que no alimentan el siguiente ciclo.

### R3 — El sistema de contenidos

Siete capítulos con artefacto, decisión y salida:

| Paso | Artefacto visible | Decisión que demuestra |
|---|---|---|
| Research | fuentes, preguntas, competencia, audiencia | por qué crear |
| Estrategia | objetivo, tema, canal, CTA | qué debe mover |
| Producción | contenido madre + dirección creativa | qué historia contar |
| Revisión | versión, comentario, aprobación | quién decide |
| Atomización | derivados adaptados | cómo amplificar sin copiar |
| Publicación | CMS/canal/metadata/QA | cómo llega bien |
| Aprendizaje | señales y decisión siguiente | qué cambia después |

### R4 — Content Hub

Mostrar que el cliente puede ver brief, research, fuentes, estado, comentarios, artículo y derivados.
Copy de cierre: la transparencia reduce seguimiento, no elimina conversaciones.

### R5 — Revisión creativa

Una escena Frame.io-like aprobada o conceptual: asset, versión, comentario localizado y resolución.
Explica banners, reels, posts e historias. No implica administración de RRSS.

### R6 — Una idea, muchas expresiones

Selector de canal con una idea constante y adaptaciones reales de estructura/ratio/copy. El default
muestra al menos cuatro outputs; la selección profundiza uno. No usar un simple resize como prueba de
atomización.

### R7/R8 — Blog & Editorial Operations + CMS Operations

- Blog: estrategia, calendario, briefs, redacción, edición, SEO/AEO, publicación y mantenimiento.
- CMS: carga, formato, assets, metadata, enlaces, schema cuando aplica y QA.
- CMS nombrados sólo tras verificación. `Modyo` permanece `[verificar]` hasta confirmar el naming.

### R9 — Tres modos de colaboración

Matriz RACI simplificada:

| Responsabilidad | Operado por Efeonce | Co-operado | Content Engine |
|---|---|---|---|
| Research/estrategia | Efeonce + cliente | conjunto | Efeonce entrega sistema |
| Producción | Efeonce | compartida | Efeonce entrega assets/copy |
| Aprobación | cliente | cliente | cliente |
| Publicación/distribución | Efeonce según alcance | compartida | cliente |
| Medición/aprendizaje | conjunto | conjunto | handoff o revisión pactada |

Los nombres finales se validan con usuarios; la responsabilidad no puede quedar ambigua.

### R10 — Ecosistema

Cada spoke responde una sola pregunta y enlaza:

- SEO: cómo se descubre.
- AEO: cómo se entiende y cita.
- Redes Sociales: cómo se opera la presencia.
- Influencer: cómo se activa credibilidad/distribución con terceros.
- Inbound: cómo el contenido alimenta journeys y captura.
- Agencia Creativa: cómo se resuelve craft/campaña fuera del always-on editorial.

### R11 — Business case para el CMO

El operador puede compartir seis outcomes sin cifras inventadas: visibilidad de trabajo, velocidad de
aprobación, consistencia de marca, reutilización inteligente, gobierno y aprendizaje acumulativo.
Incluir «qué cambia en los primeros 30 días» sólo si el proceso real puede sostenerlo; si no, usar
«cómo empieza el trabajo» sin plazo.

### R12 — Proof + FAQ

Casos o artefactos aprobados antes que logos. FAQ responde alcance, equipo, CMS, aprobación,
publicación, medición, IA y diferencia con social/inbound.

### R13 — Conversión

Una superficie final, sin card dentro de card. Formulario mínimo y/o agenda canónica según decisión de
Growth. Copy de privacidad, estados y recovery son del host gobernado.

## Visual Fidelity Mapping

| Thesis | Region | Visual expression | Failure mode |
|---|---|---|---|
| Partner | R0/R4/R9 | decisiones, comentarios y RACI visibles | decir «partner» sin evidencia |
| System | R3 | continuidad de artefacto y pasos | timeline genérico de agencia |
| Atomization | R6 | misma idea, estructuras por canal | resize/copy-paste |
| Transparency | R4/R5 | sources, status, versions, comments | dashboard falso o PII |
| Strategic value | R11 | outcomes y gobernanza | métricas inventadas |
| Immersion | R0/R3/R13 | stage, depth, causal motion | efectos que retrasan lectura |

## Copy Ledger

| ID | Region | Candidate copy / intent | Status |
|---|---|---|---|
| cm.eyebrow | R0 | Content Marketing · Content Ops | validate keyword language |
| cm.h1 | R0 | Content Marketing para equipos que necesitan un partner, no otro proveedor de piezas. | candidate |
| cm.subhead | R0 | Research, estrategia, producción, atomización y publicación en una operación visible. | candidate |
| cm.cta.primary | R0/R13 | Conversemos sobre tu operación de contenidos | candidate |
| cm.cta.secondary | R0 | Mira cómo trabajamos | candidate |
| cm.system.title | R3 | Una idea no debería terminar en una pieza. | candidate |
| cm.hub.title | R4 | Ve el trabajo, las decisiones y lo que sigue. | candidate |
| cm.atomization.title | R6 | La misma idea. Una expresión propia para cada canal. | candidate |
| cm.modes.title | R9 | Tú eliges cuánto operamos contigo. | candidate |
| cm.cmo.title | R11 | Una operación que también puedes defender internamente. | candidate |

Todo copy visible requiere validación SEO, legal, brand y responsive. Los candidates no son autorización
de publish.

## State Copy

| State | Title / signal | Recovery |
|---|---|---|
| ready | El sistema completo y CTA están disponibles | continuar/explorar |
| loading | Estamos preparando el siguiente paso | esperar o volver al contenido; sólo host dinámico |
| empty | Todavía no hay una selección | elegir un formato o continuar con el overview |
| partial | Parte de la evidencia no está disponible | leer la metodología y continuar sin claim faltante |
| error | No pudimos cargar este paso | reintentar o seguir con el contenido estático |
| denied | Este material no es público | mostrar demo conceptual aprobada, nunca pedir acceso |
| JS-off | Todos los capítulos y formatos aparecen estáticos | enlaces y formulario siguen operativos |
| reduced-motion | La transformación se presenta por estados finales | navegación ancla normal |
| proof-unapproved | Ejemplo conceptual de la operación | no presentar como cliente/caso |
| form-loading | Enviando tu solicitud | host canónico controla live region |
| form-empty | Completa los campos requeridos | foco en primer error |
| form-error | No pudimos enviar tu solicitud | reintentar/canal de recovery vigente |
| scheduler-unavailable | No pudimos cargar la agenda | recovery nativo, sin HubSpot expuesto |
| success | Recibimos tu solicitud | siguiente paso real y verificable |

## Accessibility Contract

- Un H1; headings por región sin saltos artificiales.
- Header, main, nav in-page cuando aplica, sections, figures y footer semánticos.
- Stage/SVG decorativo `aria-hidden`; la transformación tiene equivalente textual adyacente.
- Selector de formatos usa patrón tabs o buttons correcto, con estado seleccionado y keyboard.
- Foco visible en fondos midnight/paper; no hover-only.
- Contraste AA en texto y estados intermedios; el glow nunca es el único borde de foco.
- `prefers-reduced-motion` elimina pinning/transforms y deja contenido final.
- Capturas tienen alt que describe propósito, no cada píxel; detalles sensibles se redactan en el asset.
- Formularios conservan labels reales, error summary/live region y focus management del host.

## Implementation Mapping

- WordPress `page_id=242603` es el default de preservación hasta decidir ruta.
- Root selector estable: `.gh-content-marketing` o equivalente aprobado, sin CSS global.
- HTML crítico vive en Elementor/widget render, no se inserta tarde por JS.
- Candidate pattern: `IdeaAtomizationStage`; no se registra como primitive antes de audit/reuso.
- Reusar Growth Form/CTA/Meetings según registry público.
- Assets en runtime público con lineage, licencia/aprobación, alt y fallback.
- JS se limita a progresión, selector y microinteracciones; la semántica no depende de él.

## GVC Scenario Plan

- Quality profile: `premium`.
- Viewports: desktop 1440×1000 y mobile 390×844.
- Review dossier: first fold, full page, R3, R4/R5, R6 states, R9, R11, R13, keyboard,
  reduced motion y JS-off.
- Baseline: captura fechada de la página live legacy; repo-native candidate tras first-fold acceptance.
- Scroll-width checks: `documentElement.scrollWidth <= clientWidth` desktop y mobile.
- Runtime checks: console/network, broken assets, H1/canonical/schema, CTA/form negative path.
- Quality threshold: average ≥4.5, ninguna dimensión <4 y críticas ≥4.5.

## Design Decision Log

- Selected: Sistema de Contenidos Vivo / La idea que se multiplica.
- Rejected: revista cinética porque oculta ops; command center porque parece software/fábrica autónoma.
- Surface recipe: narrative service landing + localized operational stage.
- Primitive choice: `reuse + landing-pattern`, no private Greenhouse primitives en WordPress.
- Conversion choice: meeting-qualified primary; exploration secondary.
- Blogging choice: module by default; satellite only with distinct intent/demand.
- Route choice: unresolved by design; evidence gate in Slice 1.
- First-fold checkpoint: must be recorded as `ACCEPT FIRST FOLD` or `REVISE` before full build.
