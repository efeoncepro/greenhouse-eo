# TASK-1951 — Extensión íntegra del AEO X-Ray original

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
- Product Design asset: `docs/ui/visual-directions/aeo-xray-pichincha-2026-09-30.md`
- Visual direction mode: repo-native-benchmark
- Intended consumers: evaluador comercial y técnico del banco.
- Copy source: payload versionado y diccionario Think; paquete editorial externo.
- Primitive decision: Experience, Article, Instrument y Atoms originales; añadir Landing al mismo recorrido.
- UI ready target: implemented en muestra publicada; scorecard premium formal y rollout gobernado pendientes.

## Brief

Extender el X-Ray original completo para componer casos por tokens y acceso por cliente. El recorrido conserva cuatro pantallas: La oportunidad, La pieza, La radiografía, Dónde más vive. La landing complementa al artículo dentro del paso de pieza; ambos tienen radiografía y derivados. No crear una V2 paralela. Canon `docs/think/radiografia-aeo-architecture.md`. Demostración Efeonce, no autoría/publicación/aprobación del banco.

## Desktop Target

1440×1000. Experience conserva marco y riel4 pegajoso.①SERP+diagnóstico+evidencia y CTA integrado;②Article/Landing a ancho completo sin instrumento;③espécimen con Instrument a derecha, hero seleccionado SSR;④linaje y artefactos social/video/imágenes en su hábitat. Selector landing/artículo secundario conserva paso. El artefacto social es central y más ancho. Tipografía editorial cliente dentro de pieza; instrumento Efeonce.

## Mobile Target

390×844. Riel centra paso activo incluso en entrada directa④.②lectura íntegra, TOC disclosure, hero apilado sin cortar manos/rostro.③contenido primero, hoja de Instrument cerrada hasta interacción; sin JS instrumento abajo.④social primero visualmente, DOM/payload estable. CTA y controles completos, sin densidad de dashboard.

## Action Hierarchy

- Primary: Siguiente con frase narrativa al siguiente paso original.
- Secondary: seleccionar pieza dentro del paso, inspeccionar bloque, fuentes y volver.
- Destructive: ninguna en lector compartido.
- Selection vs action: hover/focus señala, click fija; selector pieza conserva paso y limpia selección inválida.
- Pending / disabled: CTA de lectura conserva secuencia pending→floating→done original; grant denegado nunca conserva contenido privado.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Original X-Ray cuatro pantallas | Experience/Article/Instrument/Atoms | Coreografía y jerarquía completas | Dashboard/tab único sustituto |
| Marca cliente | AXIS brand tokens y Landing/Article | Pieza reconocible | Hex y font por componente |
| Marco Efeonce | tokens originales Think/AXIS | Autoría del método | Instrumento coloreado como banco |
| Fotografía real | asset descriptor/provenance | Gesto cotidiano y encuadre | IA v1 rechazada/recorte automático |
| Slab editorial | displayFontFamily licenciada | Voz editorial | Prelo sin permiso verificado |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| Marco | marca+selector+riel4 | Orientar y distinguir autoría | Experience | flow/case/ui |
| ① | SERP/diagnóstico/evidencia | Justificar piezas | Experience original | opportunity/sources |
| ② | pieza completa | Evaluar contenido | Article o Landing | artifacts/blocks |
| ③ | espécimen+máquina | Revelar implementación | Article/Landing + Instrument | graph/annotations |
| ④ | social/video/imágenes | Mostrar reutilización | Atoms | parent artifact/block refs |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| ui.disclaimer | footer | Demostración preparada por Efeonce | cliente autorizado | Niega autoría/alojamiento banco |
| flow.steps | riel | La oportunidad / La pieza / La radiografía / Dónde más vive | paso actual | Cuatro trabajos distintos |
| flow.next | pie | Siguiente + frase narrativa | siguiente paso | CTA original grande |
| ui.piece | ②③④ | Landing / Artículo | pieza activa | Selector secundario |
| instrument.count | ③ | → {count} datos | grafo real | Móvil↓; destino←/↑ |
| evidence.status | ③④ | Propuesto / Implementado / Verificado / Medido | ámbito y fecha | Muestra≠banco |
| source.date | evidencia | Consultada el {date} | fuente | Sin fecha no inventar |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Muestra para {cliente} | Recorrido disponible | Siguiente | Edición autorizada |
| loading | Abriendo la muestra | Preparando contenido | Esperar | Sin spinner artificial SSR |
| empty | Esta muestra no está disponible | No hay contenido listo | Enlace actualizado | Sin IDs |
| partial | Evidencia parcial | Puedes leer la pieza y fuentes disponibles | Consultar fuentes | Grant válido |
| error | No pudimos abrir la muestra | Inténtalo nuevamente | Reintentar | Sin errores técnicos |
| denied | Este enlace no está disponible | Solicita uno actualizado | Volver | Sin contenido cliente |

## Accessibility Contract

Preservar headings/cápsula/FAQ/tablas/fuentes originales. Un H1 por pantalla, H2/H3 reales; tablas caption/th. Riel aria-current step, selector pieza aria-current coherente. Controles de bloque con nombre y cuenta, selección no sólo color. Escape vuelve a mapa y cierra hoja según estado; focus restore al origen. Instrumento desktop no modal, móvil dialog con foco contenido. No robar foco al hover. JSON-LD visible como texto, no schema activo del banco. No-JS contenido y fuentes completos; AA y reduce medidos.

## Implementation Mapping

- Route / surface: wrapper SSR compartido `/aeo-xray/r/[token]`, query step y artifact; rutas originales `/muestras/[slug]/[...step]` conservadas.
- Primitives: `src/components/aeo-xray/Experience.astro`, Article, Instrument, Atoms; Landing amplía el espécimen. No directorio/producto paralelo.
- Variants / kinds: landing/article en②③ y derivados de ambas en④; bloques tipados sin HTML arbitrario.
- Component candidates: extender los originales y adapter de payload; mantener scripts/CSS/hook de regresión.
- Copy source: payload editorial + diccionario Think.
- Data reader / command: sample registry Think o reader TASK-1950 SSR según carril; emisión/revocación de grants sólo Greenhouse.
- API parity: mismo modelo validado y scopes; UI no decide autoridad.
- Access / capability: según carril: grant de edición fija o sample no listado; bearer del reader server-side y sin logs/referrer.
- Runtime consumers: Think render, Greenhouse autoridad, AXIS contrato/tokens.
- Print/email/PDF considerations: mail enlaza pasos, sin publicar al sitio del banco; conservar URLs por paso.
- GVC markers: originales + xray-case/artifact/instrument/atoms/status.

## GVC Scenario Plan

- Scenario file: `../efeonce-think/scripts/verify-aeo-xray-v2.mjs`; complementos reales `verify-aeo-xray-motion.mjs`, `verify-aeo-xray-curtain.mjs`, `verify-aeo-xray-value.mjs` y `verify-aeo-xray-media.mjs`.
- Route: fixture local y `/aeo-xray/r/[token]?step=...&artifact=...`; los cuatro pasos originales.
- Viewports: desktop 1440x1000 y mobile 390px (390x844) touch.
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

## Design Decision Log

Decisión vigente: extender íntegramente el original. La propuesta anterior de dossier independiente se descartó por perder recorrido y atomización. Fotografía generada v1 rechazada; candidatos reales con fuente/licencia y QA de encuadre antes de reemplazo. Sin editor visual para piloto.

## Acceptance Checklist

- [x] Original4, primitives, copy, datos y accesibilidad definidos.
- [x] Piece/article completo, TOC, inspector y foco: JSON v2 preservado; social, banners y playback real:113 checks media; recorrido original:49 checks motion.
- [ ] Dossier formal de aceptación de todos los frames desktop/móvil: pendiente, separado de las suites.
- [ ] SKY sin regresión; back/reload/revocado/no-JS verificados.
- [ ] Scorecard promedio≥4.5, ningún eje<4; jerarquía/economía/impacto/fidelidad≥4.5.

## Layout final implementado

- **Entrada:** dialog fullscreen azul profundo, marca cliente y pregunta/invitación centradas,
  CTA pill con flecha arriba, firma Efeonce AEO más abajo y burbuja URL oficial. Safe areas y
  viewport pequeño/landscape permiten ver/scrollar la salida; logos no se reconstruyen en texto.
- **Cabecera:** lockup Efeonce AEO y logo Banco Pichincha, edición X-Ray con icono/descriptor en
  una segunda línea; selector segmentado Landing/Artículo con iconos. Riel original4 debajo.
  Demostración se explica al final, sin banner de autoría robando ancho del header.
- **La oportunidad:** stage navy con tesis/CTA, tarjeta clara de demo pregunta→respuesta→fuente
  y preview editorial. Observación/metodología debajo, diferenciada de la respuesta ilustrativa.
- **Landing:** header cliente compacto, hero horizontal fiel a referencia, CTA amarillo/navy,
  módulos de beneficios y tasas por moneda, condiciones/requisitos/proceso, FAQ, enlaces y cierre.
  Íconos semánticos orientan módulos; información útil continúa más allá del banner.
- **Artículo:** respuesta inicial, hero editorial, byline y fecha, TOC, contenido extenso con
  encabezados y tablas/FAQ, dos banners contextuales, CTA y fuentes públicas. No crédito
  DataForSEO como fuente de condiciones. SEO, ALT y marcado mostrados deben coincidir con pieza.
- **Radiografía:** la pieza queda como espécimen a la izquierda y máquina a derecha. Nuevos
  mapas de valor y anotaciones conservan scopes/states. Móvil abre hoja sólo tras interacción.
- **Dónde más vive:** galería de formatos feed/Story/reel con artwork real, ampliación/descarga,
  selector imagen/video, poster/control play y linaje. Elementos originales Atoms conservados.
- **Footer:** cierre compacto con lockup/autoría/demostración y links privacidad/servicios,
  evita grandes vacíos y alinea recorrido siguiente con el ancho útil.

### Copy y estados adicionales

| Copy id actual Think | Ubicación | Texto / función |
|---|---|---|
| welcome.title | Telón | Esto preparamos para ti: |
| welcome.enter | Telón | Haz click aquí |
| opportunity.nav | Rail① | La oportunidad |
| opportunity.demoNote | Demo① | Recorrido ilustrativo con contenido de esta muestra. No es un resultado de un buscador. |
| opportunity.replay | Demo① | Repetir |
| statuses.implemented | Inspector | Implementado en la muestra |
| value.checkBefore | Verificación | Aprobación/publicación/rastreo antes de medir; esta muestra queda fuera de buscadores |

### Artefactos disponibles y aceptación honesta

Implementación, media y motion tienen suites/capturas reales en `.captures/aeo-xray-*` de Think.
El scorecard premium formal no se generó: se conserva pendiente. Assets entregados en sample
son exports publicados; los masters y expedientes no entran por eso en el carril público.
El logo y fotografías de referencia no convierten esta demo en una publicación del banco.
