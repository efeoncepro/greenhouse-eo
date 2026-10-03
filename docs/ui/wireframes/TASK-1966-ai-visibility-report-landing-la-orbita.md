# TASK-1966 — Landing del Efeonce AI Visibility Report con «La órbita» · Wireframe

## Meta

- Task: `docs/tasks/to-do/TASK-1966-ai-visibility-report-landing-la-orbita.md`
- Surface: `think.efeoncepro.com/brand-visibility` — repo `efeonce-think`, `src/pages/brand-visibility/index.astro`
  (+ `src/components/BrandVisibilityFormDock.astro`, `src/components/EfeonceSlogan.astro`).
- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/visual-directions/TASK-1966-ai-visibility-report-landing-la-orbita-direction.md`
- Fuente aprobada: canvas «Marcas SEO y AEO de Efeonce», artboard `HeroAssessment.dc.html` (2026-09-29), con el cambio
  de nombre y de logo decidido por el operador el 2026-10-02.
- Fuera de este wireframe: la página del informe `/brand-visibility/r/<token>`, el correo y el PDF (TASK-1938).

## Desktop Target

1440 × 900 (y 1280 × 900). Hero navy Engine plano, dos columnas implícitas: voz a la izquierda, órbita a la derecha.

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│  [Efeonce | AI Visibility Report]  (lockup, 34 px)                      Cómo funciona ↓  │  ← header
│                                                                                          │
│                                                               ╭───────────────╮          │
│   ○ ¿Te recomiendan las IA?            (Poppins 300, 30 px)  ╱   órbita Engine  ╲ ●      │
│                                                             │   (vacía, fuera   │        │
│   Averígualo●                (Bricolage 760, 128 px)        │    de eje, sale   │        │
│                                                             │    por la derecha)│        │
│   Medimos cómo aparece tu marca en las respuestas de         ╲                 ╱         │
│   ChatGPT, Claude, Gemini, Perplexity y Google,               ╰───────────────╯          │
│   y quién ocupa el lugar que te toca.                                                    │
│                                                                                          │
│   (●)(●)(●)(●)(●)   motores                                                              │
│                                                                                          │
│   [ Empezar mi análisis → ]   Recibes tu AI Visibility Report en pantalla.               │
└──────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────────────────────── tarjeta del formulario gobernado ────────────────────────────┐
│  Completa tus datos y comienza el análisis                                                │
│  <greenhouse-form form-key=…>  (sin cambios de contrato; sólo la piel de la tarjeta)      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
  Framework (5 niveles, paleta Engine, íconos sin degradé) → Vista previa del informe
  (sin la órbita CSS) → Pie navy: logo Efeonce + «Empower your Engine» debajo, al 64 % del logo.
```

- La órbita es la única de la página. Ningún texto entra al anillo en 1440 ni en 1280: si en 1280 el lead roza el anillo,
  se desplaza la órbita (no se encoge el texto).
- El CTA baja con ancla a `#brand-visibility-form` (mismo destino que el `scroll-cue` actual, que se retira porque el CTA
  cumple su papel).

## Mobile Target

390 × 844, compuesto mobile-first.

```
┌──────────────────────────────┐
│ [Efeonce | AI Visibility …]  │  lockup completo, ≥ 24 px de alto
│                         ╭──  │
│                        ╱  ●  │  órbita recortada arriba a la derecha, halo más tenue
│ ○ ¿Te recomiendan las IA?    │
│ Averígualo●                  │  clamp(): ≥ 3× la pregunta, sin cortar la palabra
│ Medimos cómo aparece tu      │
│ marca en las respuestas…     │
│ (●)(●)(●)(●)(●)              │
│ [ Empezar mi análisis → ]    │  zona del pulgar, ancho completo
│ Recibes tu AI Visibility     │
│ Report en pantalla.          │
├──────────────────────────────┤
│ Tarjeta del formulario       │
└──────────────────────────────┘
```

- «Cómo funciona» se oculta en el encabezado móvil (el CTA y el scroll cumplen); el framework sigue accesible por scroll.
- Sin scroll horizontal de página a 390 px (la órbita se recorta con `overflow: hidden` en el contenedor del hero).

## Action Hierarchy

1. **Primaria:** «Empezar mi análisis →» (botón blanco sobre navy, texto navy) → baja al formulario.
2. **Primaria real de conversión:** el envío del formulario gobernado `<greenhouse-form>` (sin cambios).
3. **Secundaria:** «Cómo funciona» (enlace de texto en el encabezado) → baja al framework.
4. **Terciaria:** enlace «Conoce más en efeoncepro.com» del pie y el logo de la firma → `efeoncepro.com`.

## Visual Fidelity Mapping

| Artboard aprobado | Implementación | Diferencia aceptada |
|---|---|---|
| Lockup «Efeonce \| AEO Assessment» | lockup «Efeonce \| AI Visibility Report» (negativo) | decisión del operador 2026-10-02 |
| Pregunta con anillo-viñeta en Engine | igual; viñeta como `span` decorativo `aria-hidden` | ninguna |
| «Averígualo» 128 px + esfera Engine | igual en 1440; `clamp()` en anchos menores | tamaño fluido |
| Lead con remate en negrita blanca | igual | ninguna |
| Cinco motores en círculos blancos | `EngineAvatarGroup` existente sobre fondo blanco circular | se reutiliza el componente |
| Botón «Empezar mi assessment →» | «Empezar mi análisis →» | el nombre del proceso ya no es «assessment» en esta página |
| «El resultado llega como un AI Visibility Report.» | «Recibes tu AI Visibility Report en pantalla.» | coherente con el nombre de la página |
| Órbita como imagen a la derecha | `orbit-engine-dark-screen.svg` oficial | archivo canónico en vez del blob del canvas |
| Sin formulario en el artboard | tarjeta del formulario bajo el hero | el artboard sólo diseñó el hero |

## Copy Ledger

Copy local de la página (Think no tiene capa `src/lib/copy`; vive en constantes del frontmatter de `index.astro`).

| Id | Texto (es-CL, tuteo) | Dónde |
|---|---|---|
| `meta.title` | `Efeonce AI Visibility Report · ¿Te recomiendan las IA?` | `<title>` y Open Graph |
| `meta.description` | `Mide cómo ChatGPT, Claude, Gemini, Perplexity y Google entienden, citan y recomiendan tu marca. Recibe tu AI Visibility Report con acciones.` | meta description |
| `hero.question` | `¿Te recomiendan las IA?` | pregunta |
| `hero.answer` | `Averígualo` | respuesta (h1 junto con la pregunta) |
| `hero.lead` | `Medimos cómo aparece tu marca en las respuestas de ChatGPT, Claude, Gemini, Perplexity y Google, y quién ocupa el lugar que te toca.` | lead |
| `hero.cta` | `Empezar mi análisis` | CTA primario |
| `hero.ctaNote` | `Recibes tu AI Visibility Report en pantalla.` | descriptor del CTA |
| `header.howItWorks` | `Cómo funciona` | enlace secundario |
| `preview.snapshotTitle` | `AI Visibility Report` | cabecera de la vista conceptual (antes «Brand Visibility») |
| `footer.slogan` | `Empower your Engine` | firma |
| `jsonld.service.name` | `Efeonce AI Visibility Report` + `alternateName: Brand Visibility Grader` | JSON-LD |

El resto del copy de las secciones inferiores y del formulario se conserva; sólo se reemplaza cualquier mención visible
de «Brand Visibility Grader».

## State Copy

| Estado | Copy visible | Comportamiento / recuperación |
|---|---|---|
| ready | Hero completo; tarjeta «Completa tus datos y comienza el análisis» con el formulario cargado | el usuario completa y envía |
| loading | «Preparando el formulario.» (fallback del `<greenhouse-form>`, sin cambios) | el web component reemplaza el fallback al cargar |
| empty | no aplica a datos: la landing es estática; si no hay motores declarados, la fila de motores no se renderiza | sin hueco visual; el CTA sigue |
| partial | si el renderer del formulario no carga, queda el fallback con el texto anterior y el resto de la página funciona | el usuario puede recargar; sin promesa de informe |
| error | errores de validación y de envío los muestra el formulario gobernado con su copy propio | foco y reintento los maneja el web component |
| denied | Turnstile o el guard de abuso rechaza: mensaje del formulario gobernado | el usuario reintenta; no hay copy nuevo en la página |

## Accessibility Contract

- Un solo `h1`: pregunta + respuesta dentro del mismo encabezado (la pregunta como `span` previo), para que el lector
  lea «¿Te recomiendan las IA? Averígualo».
- Viñeta del anillo, esfera de la respuesta y órbita: decorativas, `aria-hidden="true"`; el SVG de la órbita es `<img alt="">`.
- Lockup con `alt="Efeonce AI Visibility Report"` (el SVG ya trae `role="img"` y `aria-label`).
- Contraste: blanco y `#cfe4fa` sobre `#091951` ≥ 4,5:1; el acento Engine sólo en gráficos o texto ≥ 24 px (≈ 3,6:1).
- El CTA es un `<a href="#brand-visibility-form">` con foco visible (anillo de 2 px blanco con separación); objetivo ≥ 44 px.
- Respeto de `prefers-reduced-motion`: la página no agrega movimiento; el desplazamiento al ancla es instantáneo con
  movimiento reducido.

## Implementation Mapping

- Route / surface: `efeonce-think` `src/pages/brand-visibility/index.astro`.
- Assets: copiar sin modificar desde `greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets@0.4.10/assets/` a
  `efeonce-think/public/branding/products/`: `ai-visibility-report-lockup-negative.svg`,
  `orbit-engine-dark-screen.svg`; reutilizar `public/branding/efeonce-logo-negative.svg` (verificar byte a byte contra el
  paquete). Registrar versión y sha256 en `public/branding/products/README.md` o equivalente.
- Tokens: variables CSS de la línea Engine declaradas una vez (módulo de tokens de Think) con procedencia.
- Componentes:
  - `index.astro`: nuevo encabezado, hero, metadatos, JSON-LD; retira `HeroAnswerLens`, `scroll-cue`, eyebrow y la
    `snapshot-orbit`.
  - `EfeonceSlogan.astro`: prop `word` (`Growth` por defecto, `Engine` aquí) y dimensionado por el ancho del logo.
  - `BrandVisibilityFormDock.astro`: sólo la piel de la tarjeta (paleta Engine); sin tocar el `<greenhouse-form>` ni el
    panel de análisis.
- Data reader / command: ninguno nuevo; el formulario sigue siendo `fdef-ai-visibility-grader`.
- API parity: no aplica (no hay acción de negocio nueva).
- States to implement: los de State Copy.

## GVC Scenario Plan

- Herramienta: `node scripts/verify-brand-visibility-landing.mjs <url> <label>` de `efeonce-think` (Playwright), extendido
  con aserciones de esta task; GVC de Greenhouse no aplica porque la superficie no es del portal.
- Quality profile: premium (dossier y scorecard aunque el runner sea el de Think).
- Viewports: desktop 1440 × 1024, laptop 1280 × 900, mobile 390 × 844.
- Required captures: hero 1440, hero 1280, hero 390, página completa 1440 y 390, foco en el CTA.
- Required `data-capture` markers: `brand-visibility-landing`, `brand-visibility-hero`, `brand-visibility-form`,
  `brand-visibility-trust`, `brand-visibility-report-preview`, `brand-visibility-footer` (se conservan).
- Assertions: scroll-width (`scrollWidth <= clientWidth`) en los tres anchos; un solo `h1`; el lockup visible con su alt;
  ningún texto visible «Brand Visibility Grader»; ningún elemento `.snapshot-orbit` ni `HeroAnswerLens`; la caja de la
  órbita no se intersecta con las cajas de texto del hero; `<greenhouse-form>` presente con su `form-key`.
- Review dossier: `docs/ui/reviews/TASK-1966-ai-visibility-report-landing-la-orbita.scorecard.json` + capturas en
  `efeonce-think/.captures/`.
- Baseline decision: baseline nuevo; surface ID `think.brand-visibility.landing`.

## Design Decision Log

- **Decisión:** reconstruir el hero según el artboard aprobado, con el lockup del Report por decisión del operador
  (2026-10-02).
- **Alternativas consideradas:** (a) mantener el lockup de AEO Assessment, como dice el ADR de naming y el artboard —
  descartada por el operador; (b) receta web A «lente gigante» con foto — no aplica: no hay foto aprobada para esta
  pieza y el artboard específico ya resolvió el hero sin foto; (c) CTA en grupo de selección con corchetes (norma web
  §4.1) — se pospone: el artboard aprobado para esta landing usa el botón, y la selección exige un colaborador con rol.
- **Por qué este patrón:** la pareja pregunta–respuesta y la órbita única son la forma propia de la línea; el lockup
  pone la submarca junto a Efeonce sin que firme.
- **Reuse / extend / new:** reuse `EngineAvatarGroup`, `<greenhouse-form>`; extend `EfeonceSlogan` (prop `word`);
  one-off la composición del hero.
- **Riesgos abiertos:** el panel de análisis del formulario dibuja anillos propios (queda fuera; follow-up); la página del
  informe sigue diciendo «Brand Visibility» hasta su propia task.
