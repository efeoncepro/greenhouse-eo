# TASK-1966 — Landing del Efeonce AI Visibility Report con «La órbita»

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1966-ai-visibility-report-landing-la-orbita.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-1966-ai-visibility-report-orbit-motion.md`
- Backend impact: `none`
- Epic: `EPIC-020`
- Status real: `Hero interactivo y ancho acotado publicados y verificados el 2026-10-04: Think 6aab907/56a300a, Vercel success. Hover azul profundo 06449ca validado y comprometido sólo local; push pendiente. Formulario productivo Entrega primero; candidato Marca primero sin activar. Sin nuevo envío real.`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `efeonce-think main: 56a300a publicado, 06449ca local; Greenhouse develop: documentación local sin push en este cierre`

## Refinamiento posterior · estado vigente 2026-10-04

El cierre original del 03/10 permanece histórico. Los deltas posteriores autorizados están documentados en
[UX](../../ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita/ux-revision-2026-10-04/README.md) y
[hero, pantalla amplia y hover](../../ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita/hero-demo-2026-10-04/README.md).

- [x] Think `09e1976` y `6aab907`: recorrido UX y hero demostrativo publicados; pausa directa con clic/Enter/espacio, sin enlace «Cómo funciona» ni pie visible. La descripción accesible conserva que es un ejemplo.
- [x] Think `56a300a`: shell máximo 1360 px y escena máxima 500 px publicados, Vercel success y readback público 1710/2560 sin overflow, formulario en y=678.
- [x] Think `06449ca`: hover primario azul Engine profundo con texto blanco, contraste 6,80:1; sólo dos declaraciones CSS. CUA, type-check (0 errores/warnings, 17 hints) y build PASS. Commit local.
- [ ] Publicar y verificar en producción el hover `06449ca`: requiere push del operador; este cierre sólo autoriza commit.
- [ ] Activar el contrato candidato Marca primero y hacer readback gobernado: producción conserva Entrega primero. QA con envíos bloqueados no acredita activación.

El error de formulario en localhost:4331 fue diagnosticado como CORS; se mantiene la allowlist productiva.
El harness :4332 sirve contrato candidato y renderer real con POST deshabilitado. No hay nuevo smoke de envío/PDF/correo.

## Summary

La landing pública `think.efeoncepro.com/brand-visibility`, donde está el formulario del diagnóstico de visibilidad en
IA, sigue presentándose como «Brand Visibility Grader» con un hero genérico. El operador decidió el 2026-10-02 que la
página se llama **Efeonce AI Visibility Report** y lleva ese logo. Esta task cambia el nombre, pone el lockup oficial y
brandea la página con la línea gráfica «La órbita» en su línea Engine, según el artboard ya aprobado.

## Why This Task Exists

El ADR de naming (2026-09-29) y el canvas «Marcas SEO y AEO de Efeonce» aprobaron las submarcas y un hero para esta
landing, pero quedó «aprobada en el canvas; no implementada» (`efeonce-graphic-line` → `applications.md` §B3c). Hoy la
página publica el nombre histórico en el eyebrow, el `<title>` y el JSON-LD; usa un degradé navy, un chip amarillo,
una lupa con resplandor que no es la lente de la línea, el eslogan de la línea Growth y una segunda órbita CSS en la
vista previa del informe. El prospecto llega a una pieza que no se reconoce como de la familia SEO/AEO de Efeonce.

## Goal

- La página se llama Efeonce AI Visibility Report en todo lo visible y en metadatos, sin romper la URL ni lo indexado.
- El encabezado lleva el lockup oficial `Efeonce | AI Visibility Report` desde `@efeoncepro/axis-brand-assets`.
- El hero sigue el artboard aprobado: pregunta–respuesta, una sola órbita Engine, CTA al formulario.
- Las secciones inferiores y la firma quedan en la paleta y las reglas de la línea Engine.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md` (§Decision y §Delta 2026-09-29) — se le agrega un delta
  con la decisión del 2026-10-02.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — el formulario y el flujo
  submit → run → informe no cambian.
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` — Think es el render público.

Reglas obligatorias:

- Las reglas duras de la skill `efeonce-graphic-line` (una sola órbita, ningún texto la cruza, el arco sólo mide un dato
  real, Efeonce firma, valores sólo desde tokens, archivos de marca sólo desde `@efeoncepro/axis-brand-assets`).
- La submarca nunca firma: el lockup va en el encabezado; la firma del pie es el logo de Efeonce.
- No se renombran rutas, ids de formulario ni contratos (`/brand-visibility`, `fdef-ai-visibility-grader`), como manda
  el ADR de naming.

## Normative Docs

- `.claude/skills/efeonce-graphic-line/SKILL.md` + `references/criteria.md` + `references/applications.md` §B3c +
  `references/qa-checklist.md`.
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md` §4.1 (Web).
- `docs/ui/visual-directions/TASK-1966-ai-visibility-report-landing-la-orbita-direction.md`.
- Canvas «Marcas SEO y AEO de Efeonce», artboard `HeroAssessment.dc.html`.
- `efeonce-think/README.md` (deploy y verificación).

## Dependencies & Impact

### Depends on

- `@efeoncepro/axis-brand-assets` 0.4.10 (instalado en `greenhouse-eo/node_modules`): lockup y órbita Engine.
- `TASK-1327` (complete): la landing y el embed del formulario gobernado.

### Blocks / Impacts

- `TASK-1938` (PDF del informe con La órbita): misma familia visual; sin solape de archivos.
- `TASK-1332` y `TASK-1338` (to-do) tocan la página del informe `/brand-visibility/r/[token].astro`, no esta landing.
- Docs funcionales de growth que nombran la landing.

### Files owned

- `efeonce-think:src/pages/brand-visibility/index.astro`
- `efeonce-think:src/lib/ai-visibility-landing-tokens.ts`
- `efeonce-think:src/components/EfeonceSlogan.astro`
- `efeonce-think:src/components/BrandVisibilityFormDock.astro` (sólo estilos de la tarjeta)
- `efeonce-think:public/branding/products/*` (assets copiados)
- `efeonce-think:scripts/verify-brand-visibility-landing.mjs`
- `docs/ui/wireframes/TASK-1966-ai-visibility-report-landing-la-orbita.md`
- `docs/ui/visual-directions/TASK-1966-ai-visibility-report-landing-la-orbita-direction.md`

## Current Repo State

### Already exists

- `efeonce-think/src/pages/brand-visibility/index.astro` (1583 líneas): hero con `HeroAnswerLens`, framework de cinco
  niveles, vista previa del informe, pie con `EfeonceSlogan` («Empower your Growth»).
- `efeonce-think/src/components/BrandVisibilityFormDock.astro`: tarjeta con `<greenhouse-form>` y panel de análisis.
- `efeonce-think/public/branding/products/aeo-assessment-lockup-negative.svg` (precedente de copia de lockup).
- `greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/ai-visibility-report-lockup-{negative,positive,white}.svg`
  y `assets/orbit/orbit-engine-dark-screen.svg`.
- `efeonce-think/scripts/verify-brand-visibility-landing.mjs` (capturas 1440/1280/390 + scroll-width).

### Gap

- Nombre histórico visible y en metadatos; sin lockup de submarca; hero fuera de la línea; dos órbitas; eslogan Growth.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-think` (`src/pages/brand-visibility/index.astro` y componentes), deploy Vercel `efeonce-think`.
- Future candidate home: `public`
- Boundary: la página consume el formulario gobernado de Greenhouse por el web component `greenhouse-form`; no consume readers ni commands nuevos.
- Server/browser split: página Astro estática; sin secretos ni SDKs de proveedores en el cliente.
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: prospecto (marketing, marca o growth de una empresa) que llega desde una campaña, el blog o una propuesta.
- Momento del flujo: primera impresión, antes de dejar sus datos.
- Resultado perceptible esperado: reconoce de inmediato una pieza de Efeonce, entiende la promesa en una frase y baja al formulario.
- Friccion que debe reducir: titular de cinco líneas, nombre técnico «Grader», visual genérico que no se asocia a Efeonce.
- No-goals UX: cambiar el formulario, el panel de análisis, la página del informe o el flujo de envío.

### Surface & system decision

- Surface: `think.efeoncepro.com/brand-visibility`.
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — sitio público Astro, no portal Greenhouse.
- Primitive decision: `one-off` — composición del hero; `extend` — `EfeonceSlogan` (prop `word`); `reuse` — `EngineAvatarGroup`, `<greenhouse-form>`.
- Adaptive density / The Seam: `no aplica` — no hay cards del portal.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `local one-off` — constantes del frontmatter de `index.astro` (Think no tiene capa de copy compartida); ledger en el wireframe.
- Access impact: `none`

### State inventory

- Default: hero + tarjeta del formulario lista.
- Loading: fallback del formulario «Preparando el formulario.».
- Empty: no aplica a datos (página estática); sin motores, la fila no se renderiza.
- Error: lo maneja el formulario gobernado.
- Degraded / partial: si el renderer del formulario no carga, queda el fallback y el resto de la página funciona.
- Permission denied: rechazo de Turnstile/guard lo comunica el formulario.
- Long content: la respuesta usa `clamp()` y no corta «Averígualo»; el lead se ajusta en líneas.
- Mobile / compact: composición mobile-first a 390 px (wireframe).
- Keyboard / focus: CTA y enlaces con foco visible; orden encabezado → CTA → formulario.
- Reduced motion: la órbita muestra el cuadro final; el ancla salta sin desplazamiento suave.

### Interaction contract

- Primary interaction: «Empezar mi análisis» baja al formulario.
- Hover / focus / active: CTA blanco con cambio de tono en hover y anillo de foco de 2 px; enlaces subrayan en hover.
- Pending / disabled: no aplica en la página; el envío lo gobierna el formulario.
- Escape / click-away: no aplica.
- Focus restore: tras el ancla, el foco pasa al encabezado de la tarjeta del formulario.
- Latency feedback: no aplica (navegación por ancla).
- Toast / alert behavior: no aplica.

### Motion & microinteractions

Contrato vigente: escena DOM/CSS continua de 12 s específica de esta landing, con SVG oficial intacto, pausa manual por botón transparente y suspensión fuera de pantalla/pestaña. Sin JS o con movimiento reducido queda estática. Detalle y evidencia en el [motion spec](../../ui/motion/TASK-1966-ai-visibility-report-orbit-motion.md). Los puntos siguientes conservan la especificación inicial del 03/10, sustituida por ese contrato.

- Motion primitive: `CSS` oficial de AXIS (snapshot con hash en Think)
- Enter / exit: entrada de la órbita finita (2 s), cuadro final fijo; salida ninguna.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: transiciones de color de hover del CSS existente.
- Reduced-motion fallback: `scroll-behavior: auto` con movimiento reducido.
- Non-goal motion: escena de lupa GSAP, animación del texto, iconos, parallax y loops. Pedido del 2026-10-03 amplía la landing a motion oficial de la órbita.

### Implementation mapping

- Route / surface: `efeonce-think` `src/pages/brand-visibility/index.astro`.
- Primitive / variant / kind: hero one-off; `EfeonceSlogan word="Engine"`.
- Component candidates: `index.astro`, `EfeonceSlogan.astro`, `BrandVisibilityFormDock.astro` (estilos).
- Copy source: Copy Ledger del wireframe.
- Data reader / command: ninguno.
- API parity: no aplica.
- Access / capability: ninguna.
- States to implement: los del inventario.

### GVC scenario plan

Plan inicial del 03/10; el delta del 04/10 amplía QA local hasta 2560 px y readback público a 1710/2560. Evidencia vigente en el dossier hero enlazado arriba.

- Scenario file: `efeonce-think/scripts/verify-brand-visibility-landing.mjs` (extendido).
- Route: `/brand-visibility`
- Viewports: 1440×1024, 1280×900, 390×844
- Quality profile: `premium`
- Required steps: carga, foco en el CTA, salto al formulario.
- Required captures: hero en los tres anchos, página completa 1440 y 390, foco del CTA.
- Required `data-capture` markers: los seis existentes de la landing.
- Assertions: sin scroll horizontal; un `h1`; lockup visible; sin «Brand Visibility Grader» visible; sin `.snapshot-orbit`; órbita sin intersección con el texto del hero.
- Scroll-width checks: `scrollWidth <= clientWidth` en los tres anchos.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` y foco del CTA.
- Review dossier: `docs/ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita.scorecard.json`
- Baseline decision / surface ID: baseline nuevo, `think.brand-visibility.landing`.

### Design decision log

- Decision: hero del artboard aprobado con el lockup del Report (operador, 2026-10-02).
- Alternatives considered: lockup de AEO Assessment (descartado por el operador); receta web A con foto (sin foto aprobada); CTA en grupo de selección (pospuesto).
- Why this pattern: pareja pregunta–respuesta y órbita única son la forma propia de la línea; la submarca acompaña sin firmar.
- Reuse / extend / new primitive: reuse `EngineAvatarGroup`/`<greenhouse-form>`, extend `EfeonceSlogan`, one-off hero.
- Open risks: los anillos del panel de análisis y la página del informe quedan fuera (follow-ups).

### Visual verification

- GVC scenario: `verify-brand-visibility-landing.mjs`
- Viewports: 1440, 1280, 390
- Required captures: ver GVC scenario plan.
- Required `data-capture` markers: los seis existentes.
- Scroll-width check: sí, tres anchos.
- Accessibility/focus checks: un `h1`, alt del lockup, decorativos `aria-hidden`, foco visible, contraste medido.
- Before/after evidence: captura de producción actual vs localhost.
- Known visual debt: panel de análisis y página del informe.
- Visual scorecard: `docs/ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Nombre, logo y metadatos

- Copiar sin modificar el lockup y la órbita Engine desde `@efeoncepro/axis-brand-assets` 0.4.10 a `public/branding/products/`, con versión y sha256 registrados.
- Encabezado con el lockup `Efeonce | AI Visibility Report` (reemplaza Efeonce + Think).
- `<title>`, description, Open Graph y JSON-LD con el nombre nuevo; `alternateName` con el histórico.
- Retirar todo texto visible «Brand Visibility Grader» / «Brand Visibility» de la landing.

### Slice 2 — Hero con La órbita

- Fondo navy Engine plano; pregunta–respuesta con viñeta y esfera Engine; lead; motores; CTA y su descriptor.
- Órbita oficial a la derecha, única, sin cruce con el texto; retirar `HeroAnswerLens`, el eyebrow y el `scroll-cue`.
- Composición mobile-first a 390 px.

### Slice 3 — Secciones inferiores, tarjeta del formulario y firma

- Paleta Engine en framework, vista previa y tarjeta del formulario; retirar degradés teal/amarillo y la `snapshot-orbit`.
- `EfeonceSlogan` con `word` y tamaño por ancho del logo; pie con «Empower your Engine».
- Tokens de la línea declarados una vez con procedencia.

### Slice 4 — Verificación y documentación

- Extender `verify-brand-visibility-landing.mjs` con las aserciones del wireframe; capturas y scorecard.
- Delta en el ADR de naming, en `applications.md` §B3c de la skill (y su espejo) y en la doc funcional de growth.

## Out of Scope

- El `<greenhouse-form>`, su definición, validación, Turnstile y el flujo submit → run → informe.
- El panel de análisis del formulario (sus anillos y su movimiento).
- La página del informe `/brand-visibility/r/<token>`, el correo de entrega y el PDF (TASK-1938).
- Renombrar rutas, ids o contratos técnicos.
- El push a `main` de `efeonce-think` (deploy de producción): requiere aprobación explícita del operador.

## Detailed Spec

El detalle de composición, tokens, copy y estados vive en el wireframe y en la dirección visual declarados en `## Status`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. El Slice 2 depende de los assets del Slice 1; la verificación del Slice 4 corre sobre el resultado de los tres.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Romper el embed del formulario al tocar la tarjeta | UI / lead capture | low | sólo estilos; el verify asserta el `<greenhouse-form>` con su `form-key` | verify falla; caída de envíos en el formulario |
| Perder posicionamiento por cambio de título | public site / SEO | low | URL igual, `alternateName` con el nombre histórico, canonical intacto | Search Console de la URL |
| Push accidental a producción | release | low | trabajo local; push sólo con aprobación | deploy nuevo en Vercel |
| Scroll horizontal por la órbita en móvil | UI | medium | contenedor con `overflow: hidden`, aserción scroll-width | verify falla |

### Feature flags / cutover

- Sin flag — cambio de presentación estático, reversible con revert del commit; cutover al deploy aprobado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit en `efeonce-think` + push | < 5 min | si |
| Slice 2 | revert del commit + push | < 5 min | si |
| Slice 3 | revert del commit + push | < 5 min | si |
| Slice 4 | revert de docs | < 5 min | si |

También se puede promover el deployment anterior en Vercel (`efeonce-think`, scope `efeonce-7670142f`).

### Production verification sequence

1. Localhost (`pnpm dev`) + `verify-brand-visibility-landing.mjs` en 1440/1280/390.
2. Aprobación del operador con las capturas.
3. Push a `main` de `efeonce-think` → Vercel; verificar SHA del deployment y correr el verify contra `https://think.efeoncepro.com/brand-visibility`.
4. Envío de prueba del formulario sólo si el operador lo pide (crea lead real).

### Out-of-band coordination required

- Aprobación del operador para el push a `main` de `efeonce-think`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El encabezado muestra el lockup oficial `ai-visibility-report-lockup-negative.svg`, byte a byte igual al de `@efeoncepro/axis-brand-assets` 0.4.10.
- [x] Ningún texto visible de la landing dice «Brand Visibility Grader»; `<title>` y JSON-LD usan «Efeonce AI Visibility Report».
- [x] La URL sigue siendo `/brand-visibility` y el canonical no cambia.
- [x] El hero tiene un solo `h1` con la pregunta y la respuesta; la respuesta mide ≥ 3× la pregunta en 1440 y en 390.
- [x] Hay exactamente una órbita en la página y la caja de su círculo visible no se intersecta con el texto del hero en 1440, 1280 y 390.
- [x] No existen `HeroAnswerLens`, `.snapshot-orbit` ni el eyebrow amarillo.
- [x] El pie muestra el logo de Efeonce con «Empower your Engine» debajo, al 64 % del ancho del logo.
- [x] El acento Engine no aparece en texto menor a 24 px.
- [x] `<greenhouse-form>` sigue presente con el mismo `form-key` y `surface`.
- [x] Sin scroll horizontal (`scrollWidth <= clientWidth`) en 1440, 1280 y 390.
- [x] `UI ready` es `yes` y `pnpm task:lint --task TASK-1966` pasa sin hallazgos (2026-10-03: 0 errores, 0 warnings).
- [x] Capturas desktop y 390 px miradas y scorecard ≥ 4,2 de promedio (gate vigente más estricto: promedio 4,53, piso 4,3; revisión propia; operador aceptó y autorizó publicación el 2026-10-03).

Evidencia de los criterios visuales: [dossier local](../../ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita/README.md), `metrics.json` y hashes. La caja transparente del SVG no se cuenta como el círculo visible.

## Verification

- `pnpm task:lint --task TASK-1966` (Greenhouse)
- `efeonce-think`: `pnpm build` y `pnpm check` [verificar el script de tipos en `package.json`]
- `node scripts/verify-brand-visibility-landing.mjs http://localhost:4331/brand-visibility task-1966 (extendido; no ejecutado en esta corrida, ver equivalente CUA en dossier)`
- Checklist `references/qa-checklist.md` de la skill `efeonce-graphic-line`.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (1938 y 1332/1338 fuera; formulario gobernado conservado)
- [x] el deploy de producción de `efeonce-think` se hizo con aprobación del operador, o la task queda `code complete, rollout pendiente`

## Follow-ups

- Llevar el nombre y el lockup a la página del informe `/brand-visibility/r/<token>` y al correo de entrega.
- Rediseñar el panel de análisis del formulario con la línea (sus anillos compiten con la órbita del hero).

## Delta 2026-10-02

- Decisión del operador: la landing se llama **Efeonce AI Visibility Report** y lleva ese logo (antes, según el ADR y el artboard, «Efeonce AEO Assessment»).

## Delta 2026-10-03 — Primero la landing

- Alcance confirmado por el operador: landing. Se preservaron cambios locales previos de `index.astro` y `EfeonceSlogan`; este último no fue editado por Codex.
- Se completó la paleta Engine inferior, lockup en el preview, eliminación de estilos de órbita/barras heredados, ancho del logo móvil y espacio previo al formulario. CTA con destino/foco correctos; scroll inmediato.
- Build y type-check pasan; capturas y geometría CUA en 1440/1280/430/390/360. Verificador reusable extendido y revisado sintácticamente; no corrido con Chromium en esta sesión.
- CDP identifica CORS `MissingAllowOriginHeader` en la carga del formulario desde localhost. No se cambió el backend ni CORS, no se hizo submit. Aceptación visual del operador y deploy/readback autorizados siguen pendientes.
- TASK-1938 (PDF) y TASK-1332/1338 (reporte web) mantienen su alcance; no se tocaron sus runtimes.

## Delta 2026-10-03 — Motion ligero en la landing

- El operador pidió adaptar la animación anterior o evaluar su peso. Preview local: órbita oficial animada por CSS de AXIS, una reproducción de 2 s, sin escena de lupa ni bucles GSAP. Aceptación de esta adaptación reducida pendiente.
- `EngineHeroOrbit.astro` + `engine-orbit-motion.ts`; 3004 bytes SVG/CSS (938 gzip local), cero JS de motion añadido. No se midieron FPS ni batería del diseño anterior.
- Entrada/final en 1440/390, reducido final inmediato; geometría 360/430/1280 sin overflow ni cruce. Build y type-check pasan. Contrato y evidencia en el Motion doc declarado.

### Ajuste del pie — 2026-10-03

Por corrección del operador, el eslogan se acerca al logo: se elimina la suma accidental del gap global (8,8 px) y se ajusta la caja de texto. Se mantiene el margen canónico de 1,35 cuerpos y ancho 64 %. Verificado en 1440/390: separación entre cajas 14,37 px; capturas en el dossier `slogan/`. Cambio CSS local, sin publicación.

### Pie con AEO — 2026-10-03

Propuesta aprobada por el operador: reemplazar «Método de análisis» por logo oficial AEO pequeño, pregunta y enlace al servicio (`https://efeoncepro.com/aeo-2/`, destino verificado vivo). Efeonce sigue firmando; AEO ocupa una columna de contexto. Pesos del pie aligerados a 600/400/500 y título legal en caja normal, con foco visible. CUA en 1440/390 sin overflow, SVG oficial cargado; build y tipos pasan. Evidencia `footer-aeo/` del dossier. Local, sin commit/push/deploy.

## Publicación aprobada — 2026-10-03

- Operador: «Ok, empujemos». Se publicó únicamente la landing y 18 archivos de dependencias/verificación; los 13 commits locales de otras corridas no se empujaron. Checkout aislado `/tmp/efeonce-think-landing-release-20261003`, rama `codex/ai-visibility-landing-release`, baseline `be8d484`.
- Commit/remote main: `f4426d24836fb84ff2a4da695f868ea924a26ec1`. Vercel `dpl_U5u9LKwxMffHxZPBkEukTnUXgWAG`, target `production`, `READY`; status GitHub Vercel success asociado al mismo SHA. No workflow GitHub Actions aplicable ni orchestrator Greenhouse: Think tiene auto-deploy propio.
- Build y tipos del checkout aislado pasan (110 archivos, 0 errores, 0 warnings, 15 hints). Primera compilación con symlink de dependencias falló; se instaló el lockfile congelado y se validó con dependencias propias. `diff --check` pasa para código; el lockup SVG oficial conserva un espacio final de fábrica para mantener identidad byte a byte.
- CUA sobre `https://think.efeoncepro.com/brand-visibility`: 1440/1280/390, sin overflow ni cruce órbita/copy, un h1 y una órbita, assets cargados; CTA enfoca encabezado del formulario y conserva hash. Formulario real cargado (primer paso Entrega), mismo form-key/surface; no submit. Pie AEO visible y enlace correcto. Capturas y métricas en el dossier `production/`.
- Main local del checkout original conserva los 13 commits y el WIP; ahora diverge del remote. Integrar este commit aislado antes de su próximo push; no reset/rebase realizado en la rama compartida. Servidor temporal detenido. Docs Greenhouse locales, sin push.
