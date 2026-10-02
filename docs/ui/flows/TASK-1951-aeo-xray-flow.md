# TASK-1951 — Flujo del X-Ray original ampliado

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
- Intended route / surface: Think SSR compartido y muestras originales.
- Flow type: cross-route
- Primary primitives: Experience, Article, Landing, Instrument, Atoms.
- Copy source: UI Think y payload validado.

## Flow Brief

El mismo relato de cuatro pasos lleva de una oportunidad comprobable a la pieza, su radiografía y sus derivados. Landing/artículo es una selección dentro de ese relato. Leer precede a inspeccionar; atomización demuestra reutilización real. La edición compartida no concede acciones bancarias ni edición de contenidos.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| ①La oportunidad | Oportunidad | SERP+diagnóstico+CTA | Contexto compacto, evidencia completa | Experience |
| ②Pieza | Leer | Artefacto íntegro ancho completo | Hero apilado, TOC | Article/Landing |
| ③Radiografía | Explicar | Split acoplado | Hoja cerrada inicialmente | Instrument+pieza |
| ④Átomos | Reutilizar | Social protagonista | Social primero visualmente | Atoms |
| Acceso | Proteger | Sin contenido si denegado | Igual | StatusScreen |

## Flow Map

1. Entry: resolver el carril (fixture DEV, sample Think o edición/grant), modelo validado, artifact y step allowlisted; entrada por defecto①. En primera visita al primer paso, mostrar telón modal; deep-link o navegación interna lo omiten.
2. Primary action:①Siguiente→②pieza completa, CTA original pending→floating→done durante lectura.
3. Transition:②→③misma pieza encoge a espécimen; hero seleccionado SSR y máquina revela datos.
4. User decision: hover/focus explora, click fija, Escape vuelve al mapa; selector cambia pieza conservando paso.
5. Completion:③Siguiente→④derivados con linaje; enlaces al bloque padre permiten volver a comprobar.
6. Recovery / exit: anterior/back/reload/deep-link preservan paso y pieza válidos; acceso revocado elimina contenido.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Siguiente | Cada paso | Paso siguiente | Enter | Frase narrativa |
| Elegir pieza | Selector secundario | Mismo paso/nueva pieza | Enter | Limpia bloque inválido |
| Hover/focus bloque | Espécimen③ | Datos relacionados | Tab/focus | No roba foco |
| Click bloque | Espécimen③ | Selección fijada | Enter/Space | Chip cuenta exacta |
| Escape/mapa | Instrument | Mapa global | Escape | No perder pieza |
| Linaje átomo |④ | Bloque padre③ | Enter | Ref artifact+block |
| TOC |② | Sección | Enter | Hash+scroll-margin |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| loading | Resolución | Enlace | Reader | Sin payload previo |
| gap | Paso① | Acceso válido | Siguiente | SERP fechado |
| reading | Paso② | Paso/pieza | Siguiente | Sin instrumento |
| map | Paso③reposo | Ruta radiografía | Hover/focus/click | Hero SSR/máquina completa |
| focused | Acoplamiento temporal | Hover/focus | Salir/fijar | Ajeno colapsado, cuenta |
| pinned | Acoplamiento fijo | Click/Enter | Escape/mapa | Origen persistente |
| atoms | Paso④ | Siguiente/deep-link | Linaje/anterior | Artefactos y procedencia |
| error | Fallo transitorio | Reader | Reintentar | Mensaje seguro |
| denied | Sin acceso | Grant inválido/revocado | Nuevo enlace | Sin cliente |

Dirty no aplica; no editor. La hoja móvil es presentación del estado③, no quinto paso.

## Routing Contract

- Route changes: query step enum original `''|articulo|radiografia|atomizacion` y artifact; hash bloque validado.
- Canonical URL: enlace propio Think; nunca canonical hacia banco.
- Deep-link behavior: cada paso direccionable,④centra riel activo; sólo IDs en edición.
- Back button behavior: vuelve al paso/pieza previo; ningún modal atrapa historia.
- Reload behavior: revalida modelo y reader según carril (grant si aplica), conserva estado permitido; sin localStorage de payload. El telón recuerda entrada por ruta/caso en sessionStorage; es preferencia, no autorización.
- Shareability: edición fija y URLs por paso, navegación relativa sin filtración referrer/telemetría.

## Focus & Accessibility

Marco estable y foco normal del documento al navegar. Acoplamiento hover no mueve foco; teclado dispone de misma selección/fijación. Móvil abre dialog sólo al activar bloque, focus trap y cierre visible; restaurar origen. Escape sale de pin/mapa o cierra hoja según estado, nunca navegación sorpresa. TOC y linaje usan enlaces reales. Anunciar cuenta breve; no leer JSON completo. Reduced motion conserva destino sin desplazamiento.

## Data & Command Boundaries

Reader SSR: sample local resuelto por registro Think o reader gobernado TASK-1950 según carril. Composición AXIS no es autoridad. En carril grant, el grant limita edición y assets propios; step/artifact no amplían scope. Emisión/revocación gobernada fuera de Think. El sample sólo se retira mediante redeploy. Datos de SERP/KW conservan país, fecha, dispositivo y límites; derivados no simulan alcance medido. Cache no-store; sin token en analytics.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | Enlace no disponible | Nuevo enlace | Sin cliente |
| not found / empty | Muestra no disponible | Volver | Sin IDs |
| partial / degraded | Fuente o átomo faltante señalado | Leer evidencia presente | No inventar producción |
| stale data | Fecha visible | Fuente oficial | No mutar snapshot |
| timeout / API error | Error temporal | Reintentar | Sin fallback revocado |
| dirty exit | No aplica | Navegar | Lector |

## GVC Scenario Plan

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

## Design Decision Log

Recorrido original4 y coreografía obligatorios. Selector de pieza amplía el contenido, no reemplaza pasos. Se descarta dossier paralelo. Átomos con genealogía son parte del mínimo, no backlog opcional.

## Acceptance Checklist

- [x] Cuatro pasos, pieza, linaje, salida, recuperación y permisos especificados.
- [x] Back/forward, cambio de pieza, linaje y noJS constan en `aeo-xray-motion/verification.json`; teclado/media y foco constan en las suites media/v2.
- [ ] Readback de grant revocado en producción Greenhouse: pendiente de su rollout, no se deduce del sample.
- [ ] Captura formal de reload y dossier de aceptación completo: no certificada por esta actualización.
- [ ] Móvil④activo visible, social primero, sin alteración DOM.

## Flujo final de entrada y distribución

1. **Telón:** logo oficial del cliente sobre azul profundo, `Esto preparamos para ti:`, botón
   `Haz click aquí`, lockup Efeonce AEO abajo y burbuja URL. Dialog modal con foco; Enter/click y
   Escape levantan pantalla. Formulario nativo permite cerrar sin JS. Storage bloqueado no atrapa.
2. **Apertura:** telón sube durante 1400ms y el contenido acompaña desde 56px hacia su posición.
   `xray:curtain-opening` prepara pregunta inicial; `xray:curtain-opened` inicia el recorrido de
   respuesta/fuente. Preferencia reduce abre inmediato y conserva contenido/foco en el H1.
3. **La oportunidad:** bloque narrativo y pregunta → respuesta → fuente, botón Repetir y preview
   de la pieza. La aclaración visible dice que es ilustrativo, no resultado de un buscador.
   Observación SEO real con fecha/metodología queda separada del recorrido de demostración.
4. **Selector pill:** Landing/Artículo con iconos y activo claro, links reales y `aria-current`.
   Conserva etapa; cambia entidad de contenido sin convertir una landing en el artículo por morph.
5. **Contenido:** landing con hero y módulos inferiores; artículo con respuesta/TOC, bloques,
   tablas/FAQ/fuentes y dos banners contextuales. DataForSEO no aparece como fuente editorial
   financiera, pero se conserva provenance de investigación. CTA enlaza el canal oficial real.
6. **Radiografía:** el mapa conserva alcance/estado/fecha; pregunta → respuesta → fuente → plan
   de verificación. `implemented` se refiere a la muestra, no al sitio cliente. JSON-LD inerte.
7. **Derivados:** cuatro formatos gráficos con preview ampliable/descargable, video vertical real
   seleccionable con poster y control play, pausa al cambiar formato y enlaces al bloque padre.
8. **Cierre:** aviso de demostración y autoría Efeonce al final, footer compacto con privacidad y
   servicios, cierre narrativo siguiente sin gran espacio vacío ornamental.

### Evidencia disponible y límite

`aeo-xray-motion/verification.json` contiene 49 checks; `aeo-xray-curtain/verification.json`
44; `aeo-xray-media/verification.json`113 y `aeo-xray-value/verification.json`87. Son evidencia
conservada de las respectivas corridas, no checks ejecutados de nuevo al redactar este contrato.
La revocación del sample no se prueba con un grant; negativos de reader/grant son otro carril.
No marcar aprobación del banco, model release individual o scorecard premium formal por estos datos.
