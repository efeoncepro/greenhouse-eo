# TASK-1118 — Composition Shell V2: cross-route composition ("move to new interface")

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform`
- Blocked by: `TASK-1114 (substrato V1 in-place) estable + adoptado` — V2 es la mitad riesgosa, se hace despues de que el in-place este probado
- Branch: `task/TASK-1118-composition-shell-v2-cross-route`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La segunda mitad del Composition Shell: la transicion **cross-route** ("mover a una interfaz nueva", modelo Google **AI Mode**) — distinta del transform **in-place** de V1 (modelo AI Overviews). Usa **cross-document View Transitions + App Router** para que pasar a otra superficie morphee con continuidad (shared elements persisten cross-route) en vez de cortar.

## Why This Task Exists

El operador separo explicitamente dos motions: (1) **transformar la superficie existente** (V1, in-place — shipped en TASK-1114) y (2) **mover a una interfaz nueva** (esto). El ADR las dejo como V1/V2 y el mercado las ship por separado (AI Overviews in-place vs AI Mode dedicado, con un bridge entre ambas). V1 cubre (1); falta (2): la transicion de ruta con continuidad, el bridge "Seguir con Nexa" aterrizando en la lente dedicada con el contexto transferido.

## Goal

- Transicion cross-route fluida (shared elements persisten entre superficies, no cut).
- El `bridge` (puente a la lente dedicada) aterriza con continuidad espacial + contexto transferido.
- Degradacion honesta donde cross-document View Transitions no este soportado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_UI_PLATFORM_V1.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`
- `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`

Reglas obligatorias:

- Reusar los helpers de View Transitions existentes; no crear un router/motion subsystem paralelo.
- No romper el contrato V1 in-place; V2 es aditivo y distinto del transform dentro de una misma superficie.
- `prefers-reduced-motion` + fallback honesto: cut instantaneo sin soporte o con reduced motion.
- No hand-wirear namespaces reservados `gh-region-*`; respetar `greenhouse/no-ad-hoc-layout-morph`.
- Cualquier bridge de dominio (Nexa u otro) consume el modo cross-route; el modo V2 debe quedar domain-neutral.

## Normative Docs

- `DESIGN.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/GREENHOUSE_UI_DELIVERY_LOOP_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `scripts/frontend/scenarios/_README.md`

## Dependencies & Impact

### Depends on

- `TASK-1114` — substrato V1 estable + al menos un consumer real adoptado.
- `TASK-1117` — rich choreography in-place como precedente de motion/reduced-motion.
- `TASK-1119` — hardening V1.1 y lint `greenhouse/no-ad-hoc-layout-morph`.
- Bridge de lente conversacional descrito en `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`.

### Blocks / Impacts

- Experiencia completa "augmentar in-place -> profundizar en lente dedicada" (AI Overviews -> AI Mode).
- Futuras tasks de Nexa/Knowledge que necesiten aterrizar en una surface dedicada sin perder contexto.
- Governance de Composition Shell como primitive platform-level.

### Files owned

- `src/components/greenhouse/primitives/composition-shell/**`
- `src/hooks/useViewTransitionRouter.ts`
- `scripts/frontend/scenarios/**`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`

## Current Repo State

### Already exists

- Substrato V1 in-place documentado en la arquitectura de Composition Shell.
- `useViewTransitionRouter` / `ViewTransitionLink` como helpers existentes de transicion.
- GVC V1.5 con gates `quality.layout`, `quality.runtime`, `quality.keyboard` y baseline diff opt-in.
- Lint `greenhouse/no-ad-hoc-layout-morph` warning-first para evitar namespaces de morph ad-hoc.

### Gap

- No hay transicion cross-route con continuidad de shared elements.
- No existe contrato de bridge que aterrice en la surface dedicada con contexto transferido.
- La degradacion cross-browser/reduced-motion para cross-document View Transitions no esta probada con GVC.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: operador interno o usuario de producto que profundiza desde una surface activa hacia una lente dedicada.
- Momento del flujo: una respuesta/momento/region de la interfaz ofrece "Seguir con Nexa" o equivalente y navega a una ruta dedicada.
- Resultado perceptible esperado: la transicion se siente como continuidad espacial del mismo trabajo, no como cambio brusco de pagina.
- Friccion que debe reducir: perdida de contexto, orientacion rota al navegar y sensacion de "abrir otra app".
- No-goals UX: no redisenar la surface destino completa ni resolver el transform in-place V1.

### Surface & system decision

- Surface: Composition Shell primitive + bridge cross-route de una surface consumidora.
- Composition Shell: `aplica` — V2 extiende el substrato como owner del modelo de regiones/transiciones.
- Primitive decision: `extend` — extender `CompositionShell`/controller con modo cross-route; no crear primitive paralela.
- Adaptive density / The Seam: `no aplica` para el modo de navegacion; consumers con cards siguen obligados a usar card-density.
- Floating/Sidecar/Dialog decision: no aplica; esto es navegacion cross-route, no surface contextual transitoria.
- Copy source: `src/lib/copy/*` si el bridge introduce CTA reusable como "Seguir con Nexa"; texto local solo si es specimen/lab.
- Access impact: `routeGroups|views` si la surface dedicada requiere ruta/view nueva; entitlements solo si el consumer agrega accion nueva.

### State inventory

- Default: navegador soporta cross-document VT y ejecuta morph con shared elements correctos.
- Loading: transicion conserva orientacion mientras App Router resuelve la ruta; fallback no debe mostrar skeleton incoherente.
- Empty: si falta contexto transferido, la surface destino muestra estado honesto de contexto no disponible.
- Error: si falla el bridge/context payload, navegar sin romper y registrar degradacion.
- Degraded / partial: browsers sin soporte o reduced-motion caen a cut instantaneo con foco correcto.
- Permission denied: si el destino no es accesible, mantener recovery via access-denied canonico y no iniciar morph enganoso.
- Long content: la transicion no debe depender del scroll exacto; usar anchors/regions estables.
- Mobile / compact: el bridge debe funcionar en 390px sin scroll horizontal de pagina ni shared element fuera de viewport.
- Keyboard / focus: activation por teclado, focus restore/landing en heading o region principal de destino.
- Reduced motion: desactiva morph/stagger y usa navegacion instantanea.

### Interaction contract

- Primary interaction: activar un bridge cross-route desde una region/momento hacia una surface dedicada.
- Hover / focus / active: affordance clara del bridge, focus ring visible y sin movimiento decorativo obligatorio.
- Pending / disabled: si la transferencia de contexto no esta lista, pending state breve o fallback a destino sin contexto.
- Escape / click-away: no aplica a la navegacion; no debe quedar overlay temporal colgado.
- Focus restore: al llegar a destino, foco programatico en landmark/heading principal; al volver, preservar origen cuando el router lo permita.
- Latency feedback: si App Router demora, feedback honesto sin spinners globales innecesarios.
- Toast / alert behavior: solo para degradacion recuperable; no usar toast para explicar una transicion normal.

### Motion & microinteractions

- Motion primitive: `framer layout|CSS`
- Enter / exit: shared elements hacen morph cross-route; fallback cut.
- Layout morph: cross-document View Transitions con nombres estables derivados del controller, no hardcode local.
- Stagger: solo en destino si no retrasa primer paint; debe apagarse con reduced motion.
- Timing / easing token: usar tokens de motion existentes; no ms/easing hardcodeados de Figma.
- Reduced-motion fallback: navegacion instantanea, foco correcto, sin morph.
- Non-goal motion: no introducir GSAP ni animaciones cinematicas nuevas para V2.

### Visual verification

- GVC scenario: nuevo scenario cross-route para el bridge piloto; usar route runtime o mockup deterministico si el runtime depende de datos.
- Viewports: desktop y mobile 390px como minimo.
- Required captures: before/origin, during/transition si GVC puede capturar, settled/destination, fallback reduced-motion.
- Required `data-capture` markers: origin bridge, shared element, destination lead/primary region y degraded/fallback state.
- Scroll-width check: Playwright/GVC debe medir `scrollWidth <= clientWidth` en desktop y mobile 390px.
- Accessibility/focus checks: keyboard activation, focus landing, visible focus ring y reduced-motion.
- Before/after evidence: captura del cut actual vs morph V2 cuando exista piloto.
- Known visual debt: cross-document VT puede no exponer frames intermedios de forma estable en todos los browsers; documentar evidencia disponible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Cross-document View Transitions wiring

- Extender el Composition Shell/controller para declarar un modo cross-route domain-neutral.
- Habilitar morph cross-route de shared elements via App Router + helpers existentes.
- Mantener V1 in-place byte-compatible para consumers existentes.

### Slice 2 — Bridge con transferencia de contexto

- Implementar un bridge piloto ("Seguir con Nexa" u otro consumer aprobado) que transfiere contexto a la surface dedicada.
- Aterrizar con continuidad espacial y estado inicial coherente; no reiniciar el trabajo del usuario.
- Degradar si el contexto no puede transferirse, sin bloquear la navegacion.

### Slice 3 — Degradacion, a11y y GVC

- Fallback honesto sin soporte cross-document VT y con `prefers-reduced-motion`.
- Focus routing cross-route y activacion por teclado.
- Scenario GVC desktop + mobile + reduced-motion/fallback con markers estables.

## Out of Scope

- Transform in-place V1 (`TASK-1114`).
- Hardening V1.1 (`TASK-1119`).
- Fluidity in-place (`TASK-1117`).
- Adaptive Card density (`TASK-1115`) salvo validar que consumers no lo rompen.
- Redisenar Nexa, Knowledge o cualquier surface destino completa.

## Detailed Spec

V2 debe tratar el cross-route composition como capacidad del Composition Shell, no como un truco local de un CTA.

Principios:

- El shell/controller define identidad de shared elements y regiones transferibles.
- El consumer define el bridge y payload de contexto.
- La surface destino acepta contexto inicial y puede recuperarse si el payload falta/expira.
- Si el browser no soporta cross-document VT, la navegacion sigue siendo correcta.
- Reduced-motion gana siempre sobre cualquier morph.

El primer piloto debe ser deliberadamente acotado: un origin, un bridge, un destino, una familia de shared elements. El agente que tome la task debe confirmar el consumer real durante Discovery y registrar si el piloto sera runtime o mockup deterministico.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (modo cross-route neutral) -> Slice 2 (bridge piloto) -> Slice 3 (fallback/a11y/GVC).
- Slice 2 no puede shippear sin fallback basico de Slice 3 si el bridge queda accesible en runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cross-document VT inconsistente entre browsers | UI | medium | fallback cut honesto + reduced-motion + GVC fallback | GVC `quality.runtime` + manual browser note |
| Continuidad rota por shared element mismatch | UI | medium | nombres derivados del controller + markers + scenario GVC | GVC visual diff / frames settled |
| Acoplar V2 a Nexa o un dominio especifico | UI/architecture | low | Composition Shell domain-neutral; bridge vive en consumer | review de arquitectura |
| Foco perdido despues de navegar | Accessibility | medium | focus landing en heading/landmark + keyboard scenario | GVC `quality.keyboard` |
| Scroll horizontal en mobile por shared element o destino | UI/layout | medium | `minWidth:0`, clip/auto donde corresponda, scrollWidth check 390px | Playwright `scrollWidth > clientWidth` |

### Feature flags / cutover

Feature flag default OFF para cualquier bridge runtime. El modo platform puede mergear aditivo si no cambia consumers existentes; el primer consumer visible debe activarse staged despues de GVC desktop/mobile.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR o dejar modo cross-route sin consumer visible | <10 min | si |
| Slice 2 | Apagar flag del bridge/runtime consumer + redeploy si aplica | <10 min | si |
| Slice 3 | Revert scenario/fallback si solo tooling; si runtime falla, apagar flag de Slice 2 | <10 min | si |

### Production verification sequence

1. Validar local con GVC desktop + mobile 390px del bridge piloto.
2. Validar reduced-motion/fallback.
3. Validar `scrollWidth <= clientWidth` en desktop y 390px.
4. Deploy staging con flag OFF si aplica; confirmar sin regresion de V1.
5. Activar flag en staging; ejecutar GVC/runtime smoke.
6. Promover a produccion solo con sign-off visual y rollback claro.

### Out-of-band coordination required

N/A para foundation platform. Si el bridge piloto usa una ruta nueva visible por rol, coordinar view/access seed con el owner del dominio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Execution profile: ui-ux` y `UI impact: motion` quedan declarados con `## UI/UX Contract` completo.
- [ ] El modo cross-route extiende `CompositionShell`/controller; no nace un subsystem paralelo.
- [ ] El bridge piloto transfiere contexto y la surface destino puede recuperarse si falta payload.
- [ ] Reduced-motion y browsers sin soporte cross-document VT degradan a cut instantaneo con foco correcto.
- [ ] GVC desktop + mobile captura origin, destination settled y fallback/reduced-motion.
- [ ] Se midio `scrollWidth <= clientWidth` en desktop y mobile 390px.
- [ ] Copy visible reusable del bridge vive en `src/lib/copy/*` si se introduce CTA runtime.

## Verification

- `pnpm local:check:ui`
- `pnpm task:lint --task TASK-1118`
- `pnpm fe:capture <scenario> --env=local`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] evidencia GVC y scroll-width quedaron referenciados en la task/handoff

## Follow-ups

- Evaluar promocion del bridge piloto a pattern/lab si un segundo dominio adopta cross-route composition.
- Si el payload de contexto se vuelve reusable, crear task separada para contrato tipado de context handoff.

## Open Questions

- Confirmar el primer consumer piloto durante Discovery: Nexa/Knowledge parece natural, pero la task debe tomar el consumer que este menos acoplado y mas verificable.
