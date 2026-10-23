# TASK-2039 — Landings que alimentan su formulario (señales de la página → Growth Form)


## Delta 2026-10-23

- El dock de teléfono de Inbound pasa al dock compartido `efeonce.landing-dock` (TASK-2043): al migrarlo, su lanzador del
  agendador mide `cta-location="landing_dock"` en lugar de `inbound_mobile_dock`. `inbound_hero` e `inbound_closing` no
  cambian. Cualquier comparación de placements de esta task debe leer `landing_dock` desde la fecha de la migración
  (Inbound migró el 2026-10-23 a las 04:07 UTC).

## Delta 2026-10-18

- La landing de inbound quedó en producción con el formulario `efeonce-inbound-diagnostic` (form key `70dc185f…`, HubSpot
  `direct`), que ya trae los campos que la hija B precargaría: `loopStage` (etapa del ciclo), `crm` y `country`. Falta la
  parte de señales (marcado de la página + precarga); el formulario, su destino y la fila del plan de medición ya existen.
- La misma landing lanza el CTA de reunión `inbound-discovery-meeting` (`open_meeting_scheduler`) desde tres placements,
  distinguidos por `cta-location`: `inbound_closing`, `inbound_hero` e `inbound_mobile_dock`. Eso mide el placement, no
  precarga nada: la precarga desde el host (el alcance de esta task) sigue sin implementar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `umbrella`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno; idea aprobada por el operador 2026-10-18 para hacer después; hijas por crear`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none para crear las hijas; la hija del renderer se coordina con TASK-2038`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Las landings públicas de Efeonce hacen preguntas («¿Dónde se te rompe?», «¿Qué vende tu empresa?», «¿Dónde
vendes?», qué plan te interesa) que hoy no llegan a ninguna parte. Este paraguas convierte esas interacciones en
señales que precargan el Growth Form de la misma página: la persona llega al formulario con sus respuestas ya
puestas y editables, y sólo completa sitio, nombre y correo. La landing pasa a ser el formulario.

## Why This Task Exists

- Las preguntas interactivas de las landings son decorativas: la persona responde arriba y abajo vuelve a llenar
  un formulario que no sabe nada de lo que respondió. Se pierde contexto comercial y se suma fricción.
- El motor ya tiene la pieza base y ya hay un precedente funcionando, pero nada lo convierte en un patrón que
  cualquier landing pueda adoptar con poco trabajo:
  - `<greenhouse-form>` acepta `initial-values`, restringido a campos declarados (`src/growth-forms-renderer/element.ts:184`,
    `src/growth-forms-renderer/renderer.ts:186`), y soporta campos `hidden` y `multiselect`.
  - Content Marketing ya precarga su formulario desde la página y deja de actualizarlo al primer input
    (`.claude/skills/greenhouse-growth-forms/references/CONTENT_MARKETING_HOST_AND_RENDERER.md`).
- Cambiar `initial-values` después de cargar dispara `attributeChangedCallback` → recarga del contrato y remount
  (`src/growth-forms-renderer/element.ts:80`). Sirve antes de que la persona escriba; después, borraría lo escrito. No
  existe una forma de aplicar una señal a un campo sin remount ni de respetar los campos ya tocados.
- El operador lo pidió como capacidad transversal: «todas nuestras landing se pueden beneficiar».

## Goal

- Un contrato reusable de «señales de la landing → campos del Growth Form», con reglas de transparencia, edición y
  PII definidas una vez.
- Un piloto completo en la landing de inbound marketing (`/agencia-inbound-marketing/`) que lo pruebe de punta a
  punta, incluida la entrega a HubSpot.
- Un camino documentado para que cada landing de servicio lo adopte sólo con configuración y marcado del host.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `.claude/skills/greenhouse-growth-forms/SKILL.md` (contrato del renderer, API pública, destinos HubSpot, medición)
- `.claude/skills/greenhouse-growth-forms/references/CONTENT_MARKETING_HOST_AND_RENDERER.md` (precedente de precarga)
- `docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md`

Reglas obligatorias:

- La precarga sólo escribe campos declarados en el contrato publicado del formulario; nunca valores que la persona ya
  editó.
- Nada se envía hasta el submit; todo valor precargado queda visible y editable, salvo campos `hidden` de contexto
  declarados en el contrato.
- Nunca PII en el marcado del host, en atributos ni en telemetría; la telemetría sigue la allowlist `gh_form_*`.
- El host (WordPress/Astro) sólo emite señales; validación, consentimiento, destinos y medición siguen en Growth
  Forms (Full API Parity: el formulario es una capability gobernada, no lógica del host).

## Normative Docs

- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` (toda fila de formulario nuevo antes de publicar)
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `scripts/growth/hubspot-destinations.registry.ts` (modelo: `efeonce-performance-diagnostic`)

## Dependencies & Impact

### Depends on

- Growth Forms runtime y API pública vigentes (`src/lib/growth/forms/**`, `src/growth-forms-renderer/**`).
- `TASK-2038` (renderer en AXIS): define dónde vive la fuente del renderer cuando se cree la hija A.

### Blocks / Impacts

- Landings de servicio con Growth Form: inbound (piloto), performance, agencia de medios, SEO, AEO, creativa,
  influencers, redes sociales, desarrollo web, alcance HubSpot y contenido.
- `TASK-1359` (instrumentación de funnel multipaso de Growth Forms): comparte medición de formularios; coordinar
  eventos para no duplicar.

### Files owned

- `docs/tasks/to-do/TASK-2039-landing-signals-prefill-growth-forms.md`

## Current Repo State

### Already exists

- `initial-values` en `<greenhouse-form>` con filtro por campos declarados (`src/growth-forms-renderer/element.ts`).
- Campos `hidden`, `multiselect` y `select` en el renderer (`src/growth-forms-renderer/renderer.ts`).
- Precedente de precarga desde la página en Content Marketing (referencia de la skill).
- Registro de destinos HubSpot por formulario y script `pnpm growth:forms:activate-hubspot-destinations`.
- Prototipo de la landing de inbound con preguntas interactivas (artifact del operador, no en el sitio).

### Gap

- No hay API para aplicar una señal sin remount ni regla de «no sobrescribir lo tocado».
- No hay convención declarativa para que el marcado del host emita señales (cada host escribiría su propio script).
- No hay confirmación visible estándar («Anotado para tu diagnóstico») ni regla de cuántas señales usar.
- No existe el formulario `efeonce-inbound-diagnostic` ni su destino HubSpot.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/growth-forms-renderer/**` (renderer) y el host WordPress de efeoncepro.com (señales)
- Future candidate home: `ui-package`
- Boundary: (renderer en AXIS según TASK-2038) el renderer expone la API de señales; los hosts sólo marcan elementos o llaman esa API; contrato,
  validación y destinos siguen en `src/lib/growth/forms/**`
- Server/browser split: las señales viven en el navegador (renderer y host); en el servidor sólo cambia el contrato del formulario nuevo, publicado con los commands existentes
- Build impact: none
- Extraction blocker: la fuente del renderer se mueve con TASK-2038; la hija A debe implementarse donde viva en ese momento

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Crear la hija A: API de señales en el renderer

- Task `ui-ux` o `standard` según Discovery: método del elemento para aplicar señales sin remount, que respeta los
  campos ya tocados; enlace declarativo (atributos en botones y enlaces del host) y un evento de confirmación que el
  host pueda mostrar.
- Coordinada con TASK-2038 para implementarse donde viva el renderer.

### Slice 2 — Crear la hija B: piloto en la landing de inbound marketing

- Formulario `efeonce-inbound-diagnostic` (sitio, nombre, correo, mercado, CRM, etapa, categoría, interés; fuentes de
  datos opcional), destino HubSpot propio, marcado de señales en la landing, confirmación visible y fila del plan de
  medición.
- Mientras la hija A no exista, el piloto puede usar `initial-values` hasta el primer input (patrón Content Marketing).

### Slice 3 — Crear la hija C: patrón documentado y adopción por landing

- Documento del patrón (qué señales, máximo 4 o 5, transparencia, PII, medición) y checklist de adopción.
- Lista priorizada de landings a migrar, una fila por landing con sus señales.

## Out of Scope

- Implementar código en esta task: es un paraguas; el código vive en las hijas.
- Cambiar validación de servidor, consentimiento, destinos existentes o el contrato de medición `gh_form_*`.
- Rediseñar visualmente las landings: cada hija de landing conserva su diseño aprobado.
- Personalizar el resto de la landing según las señales (por ejemplo, reordenar secciones); se evalúa después.

## Detailed Spec

Mapa de señales del piloto (landing de inbound, versión del prototipo del 2026-10-18):

| Interacción en la landing | Campo del formulario | Tipo |
|---|---|---|
| Tarjeta de «¿Dónde se te rompe?» | etapa (Definir, Adaptar, Amplificar, Optimizar) | `select` (tarjetas `radio` cuando lleguen a producción) |
| «¿Qué vende tu empresa?» | categoría | `text` |
| «¿Dónde vendes?» | mercado principal | `select` |
| Botón de un plan | interés (diagnóstico, una etapa, ciclo completo) | `select` |
| Fuentes del diagrama de datos (opcional) | fuentes de datos | `multiselect` |

Reglas del patrón: cada clic conserva su comportamiento original (por ejemplo, bajar a la etapa) y suma la señal;
se muestra una confirmación breve; en móvil, una barra fija con el conteo de respuestas lleva al formulario.

## Rollout Plan & Risk Matrix

Impact-only (paraguas sin cambio de runtime propio). Cada hija declara su rollout completo.

### Slice ordering hard rule

- Slice 1 (hija A) y Slice 2 (hija B) pueden crearse en paralelo; la hija B no depende de A para el piloto.
- Slice 3 (hija C) se crea después de que el piloto pruebe el patrón en producción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una señal sobrescribe lo que la persona escribió | UI / Growth Forms | medium | regla de no sobrescribir campos tocados en la hija A; en el piloto, dejar de actualizar al primer input | no signal — QA de la hija |
| Opción precargada no existe en el formulario HubSpot y el lead cae a dead-letter | integration | medium | opciones derivadas del `field_schema` con el registro de destinos; smoke de secure-submit | `form_destination_attempt` con 400 `VALUE_NOT_IN_FIELD_DEFINITION` |
| Telemetría con valores de campo | measurement | low | allowlist `gh_form_*`; señales del host sin valores libres | revisión del plan de medición |

### Feature flags / cutover

Sin flag en este paraguas; cada hija decide su flag o cutover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | cancelar o retirar la hija A antes de tomarla | inmediato | si |
| Slice 2 | cancelar o retirar la hija B antes de tomarla | inmediato | si |
| Slice 3 | cancelar o retirar la hija C antes de tomarla | inmediato | si |

### Production verification sequence

N/A en el paraguas: cada hija trae su propia secuencia (staging, smoke de envío y destino HubSpot, release).

### Out-of-band coordination required

- Propiedades y formulario HubSpot nuevos para el piloto (hija B), con el script gobernado del registro.
- Publicación de la página en WordPress (sitio público) con autorización del operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen las hijas A, B y C como tasks registradas y enlazadas desde esta task.
- [ ] La hija A declara la API de señales (aplicar sin remount, no sobrescribir campos tocados, evento de confirmación) y su coordinación con TASK-2038.
- [ ] La hija B declara el formulario `efeonce-inbound-diagnostic`, su destino HubSpot y su fila del plan de medición.
- [ ] La hija C declara el patrón (máximo de señales, transparencia, PII, medición) y la lista priorizada de landings.

## Verification

- Revisión manual del operador de las tres hijas.
- `pnpm task:lint --task TASK-2039`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] TASK-2038 y TASK-1359 recibieron Delta si las hijas cambian su alcance

## Follow-ups

- Personalizar otras secciones de la landing según las señales (por ejemplo, destacar el plan de la etapa elegida).

## Open Questions

- ¿Las fuentes de datos se piden en el piloto o quedan para una segunda iteración?
- ¿La confirmación visible es un estilo del renderer o del host? Lo decide la hija A con la línea gráfica.
