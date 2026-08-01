# TASK-1628 — Globe Producer Credit Capacity Self-View

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1628-globe-producer-credit-capacity-self-view.md`
- Flow: `docs/ui/flows/TASK-1628-globe-producer-credit-capacity-self-view-flow.md`
- Motion: `docs/ui/motion/TASK-1628-globe-producer-credit-capacity-self-view-motion.md`
- Backend impact: `contract-extension`
- Epic: `EPIC-028`
- Status real: `Contrato/UI endurecidos y GVC premium local aceptado; rollout puntual de esta ampliación pendiente`
- Rank: `next.6`
- Domain: `creative|ui|finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Corrige el panel de créditos del Producer para mostrar capacidad efectiva, consumo/cap del período, funding
vigente y fence diario como dimensiones separadas. Producer permanece read-only: consume
`CreditCapacitySelfStatusV1`, nunca abre readers administrativos ni calcula el cap en browser.

## Why This Task Exists

El header actual usa el saldo/usage del ledger para derivar el ciclo y llegó a mostrar `0 / —` o una cifra
histórica como disponible. La auditoría comprobó que `spentInPeriod` y `policyAvailable` actuales tampoco sirven
como sustituto: el primero agrega toda la historia y el segundo sólo suma grants. Abrir esos DTOs a `ui` haría
visible un número incorrecto y ampliaría innecesariamente la superficie administrativa.

## Goal

- Mostrar como cifra primaria la capacidad efectiva para producir ahora.
- Explicar separadamente ledger histórico, cap/spent/held, funding vigente y daily fence.
- Mostrar una razón tipada y una acción segura ante bloqueo, partial o stale.
- Mantener fondeo/pools/grants/policies fuera de Globe; usuarios autorizados reciben deep link a Greenhouse.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`
- `docs/ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md`

Reglas obligatorias:

- Greenhouse administra; Globe Producer sólo observa su propia capacidad y enlaza al control plane.
- El browser no deriva monthly cap, remaining, funding eligibility ni effective available.
- `partial|stale|unknown` nunca se transforma en cero.
- Studio Credits, daily fence y saldo ledger son conceptos distintos y no usan metáforas de wallet/token/dinero.
- Tailwind v4 consume únicamente tokens del theme; cero valores visuales literales en `className`.

## Normative Docs

- `docs/tasks/complete/TASK-1482-globe-credit-pools-grants-budget-administration.md`
- `docs/tasks/complete/TASK-1586-globe-credit-denial-disambiguator-operator.md`
- `docs/tasks/in-progress/TASK-1483-globe-credits-operations-workbench.md`
- `docs/tasks/in-progress/TASK-1559-globe-client-feed-viewer-search-arrivals.md`

## Dependencies & Impact

### Depends on

- TASK-1482 ya publica un snapshot con período y decisión coherentes con reserve en Globe `main`.
- TASK-1586 ya publica `CreditCapacitySelfStatusV1`, redactado y workspace-scoped, además de SDK y wiring.
- Producer React/Tailwind y `CreditsPopover` existentes.

### Blocks / Impacts

- Corrige la comprensión del gasto antes de TASK-1532 one-click generate.
- No bloquea el workbench Greenhouse TASK-1483.

### Files owned

- `../efeonce-globe/packages/contracts/src/credit-administration.ts`
- `../efeonce-globe/packages/domain/src/credit-capacity.ts`
- `../efeonce-globe/packages/database/src/stores/spend-fence.ts`
- `../efeonce-globe/apps/studio-web/src/app.ts`
- `../efeonce-globe/apps/studio-client/src/surfaces/producer/ProducerHeader.tsx` (`CreditsPopover` local)
- tests/fixtures de la surface Producer asociados al status.
- wireframe, flow y evidencia GVC de TASK-1628 en Greenhouse.

No posee commands de fondeo, pools, policy ni ledger. Sólo extiende de forma aditiva el reader self existente y
su read port no mutante del daily fence; no crea otra autoridad económica.

## Current Repo State

### Already exists

- Producer tiene chip/anillo, popover y estados visuales de créditos en `ProducerHeader.tsx`.
- El payload React/Tailwind y sus gates están desplegados internal-only.
- Greenhouse puede actuar como destino administrativo y TASK-1483 define `/admin/globe/credits`.

### Gap

- El header deriva el ciclo desde `usage.allocated + usage.adjusted` y presenta saldo ledger como cifra primaria.
- No distingue funding vigente, monthly cap, holds y daily fence.
- No representa coverage/freshness ni razones tipadas de bloqueo.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: `../efeonce-globe/apps/studio-client/src/surfaces/producer/**`
- Future candidate home: `ui-package`
- Boundary: `CreditCapacitySelfStatusV1` browser-safe; Producer sólo formatea y navega
- Server/browser split: `policy/readers/auth server-side; status redactado y render browser-side`
- Build impact: `none`
- Extraction blocker: `Producer vive en el payload React/Tailwind de Globe y consume su BFF/session`

## Hybrid Execution Justification

La UI no puede representar funding, ledger histórico, daily fence ni el umbral low sin inventar matemática o
exponer DTOs administrativos. La extensión backend es aditiva, read-only y pertenece al mismo reader self que la
surface consume; separarla dejaría una task UI bloqueada por otro artefacto sin valor autónomo. No modifica schema,
ledger ni commands y se verifica como una sola unidad contractual reader → BFF → Producer.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: creative user, creative lead y operador con acceso administrativo.
- Momento del flujo: antes de generar y al inspeccionar capacidad desde el header.
- Resultado perceptible esperado: saber si puede producir ahora y por qué no, sin interpretar contabilidad.
- Fricción que debe reducir: cifra ledger engañosa, `0 / —`, límites mezclados y CTA administrativo ausente.
- No-goals UX: fondear dentro de Producer, administrar pools o exponer vendor cost/margin.

### Surface & system decision

- Surface: `ProducerHeader` + extensión del `CreditsPopover` existente.
- Composition Shell: `no aplica` — es un control contextual del header existente.
- Primitive decision: `extend` — extender el popover/chip actual, no crear otro widget.
- Adaptive density / The Seam: `aplica` — compact header + popover rico en desktop/mobile.
- Floating/Sidecar/Dialog decision: popover existente; sin drawer/modal administrativo.
- Copy source: copy locale-keyed del payload Globe.
- Access impact: self-status workspace-scoped y sin authority Greenhouse. El deep link es navegación no
  autorizante en el rollout interno; Greenhouse siempre revalida sesión/entitlements al entrar.

### State inventory

- Default: effective available, período y estado `Disponible|Bajo`.
- Loading: skeleton estable sin cero provisional.
- Empty: policy/funding ausentes con razón y acción segura.
- Error: sanitized, retry sólo para read.
- Degraded / partial: conserva unknown y freshness; nunca inventa cap.
- Permission denied: sin detalles de otros workspaces.
- Long content: reasons/copy sin truncar evidencia necesaria.
- Mobile / compact: chip compacto y popover dentro del viewport.
- Keyboard / focus: trigger/escape/click-away/focus restore.
- Reduced motion: actualización instantánea sin count-up desde null.

### Interaction contract

- Primary interaction: abrir popover para descomponer capacidad.
- Hover / focus / active: tokens AXIS y focus visible.
- Pending / disabled: trigger sigue accesible mientras refresca; muestra freshness.
- Escape / click-away: cierra y restaura foco.
- Focus restore: al trigger del header.
- Latency feedback: status settle reemplaza skeleton; no optimistic capacity.
- Toast / alert behavior: cambios de read no usan toast; bloqueo material usa reason inline.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: transición existente del popover.
- Layout morph: `none`.
- Stagger: `none`.
- Timing / easing token: token existente del payload.
- Reduced-motion fallback: apertura/cierre inmediato.
- Non-goal motion: count-up, donut animado desde cero o celebración.

Contrato detallado:
`docs/ui/motion/TASK-1628-globe-producer-credit-capacity-self-view-motion.md`.

### Implementation mapping

- Route / surface: Globe `/producer`, `ProducerHeader` y `CreditsPopover`.
- Primitive / variant / kind: extensión del chip/popover actual.
- Component candidates: `ProducerHeader.tsx`; extraer sólo si el tamaño/coverage justifica un componente local.
- Copy source: locale/copy del payload Globe.
- Data reader / command: `CreditCapacitySelfStatusV1`; cero commands.
- API parity: self-status deriva del mismo snapshot de TASK-1482/TASK-1586.
- Access / capability: lectura propia; el deep link admin no concede ni transporta capability y Greenhouse
  revalida acceso obligatoriamente.
- States to implement: healthy, low, blocked, no-policy, partial/stale, daily fence, permission/error.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/globe-producer-credit-capacity-self-view.scenario.ts`
- Route: `/producer`
- Viewports: `1440x1000|390x844`
- Quality profile: `premium`
- Required steps: abrir popover, navegar teclado y verificar que el deep link no transporte authority.
- Required captures: todos los estados del inventory.
- Required `data-capture` markers: trigger, effective, period-cap, funding, ledger, fence, blocker/action.
- Assertions: cifra primaria effective, zero-math, no admin actions, redaction.
- Scroll-width checks: `scrollWidth === clientWidth` a 390 px.
- Reduced-motion / focus evidence: apertura/cierre y restore.
- Review dossier: `docs/ui/reviews/TASK-1628-globe-producer-credit-capacity-self-view.scorecard.json`
- Baseline decision / surface ID: `globe.producer.credit-capacity-self-view` tras primera captura aceptada.

### Design decision log

- Decision: extender el control existente y cambiar la cifra primaria a effective available.
- Alternatives considered: abrir los DTOs admin actuales; crear una pantalla admin en Globe; mantener ledger.
- Why this pattern: menor superficie, frontera ADR-015 correcta y comprensión inmediata.
- Reuse / extend / new primitive: extend; no nueva primitive base.
- Open risks: status self-view debe existir antes de JSX y no puede degradar unknown a cero.

### Visual verification

- GVC scenario: `globe-producer-credit-capacity-self-view`.
- Viewports: 1440×1000 y 390×844.
- Required captures: healthy, ledger-positive/effective-zero, expired funding, cap exhausted, stale/partial, fence.
- Required `data-capture` markers: los declarados en el scenario plan.
- Scroll-width check: obligatorio.
- Accessibility/focus checks: keyboard, escape, click-away, restore y labels no cromáticos.
- Before/after evidence: ledger primario/denominador derivado → effective/status semántico.
- Known visual debt: none accepted without task/owner.
- Visual scorecard: `docs/ui/reviews/TASK-1628-globe-producer-credit-capacity-self-view.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5`

## Backend/Data Contract

- Backend impact es una extensión aditiva del reader existente, sin migration ni command nuevo: el self-status
  incorpora agregados redactados de funding/ledger, clasificación server-side y una lectura no mutante del daily
  fence. Activa coverage `ui` sólo al final y coordina el scope humano read-only
  `globe.credits.capacity.self.read`. TASK-1482/TASK-1586 ya entregaron la autoridad económica y el wiring base en
  Globe `main`; todavía no están live.
- La implementación UI consume exclusivamente ese DTO browser-safe. Si el rollout coordinado de scope o la
  conformance reader↔reserve falla, la surface permanece fail-closed y no introduce un fallback local.
- No se agregan write paths, secretos, cookies exportadas, queries directas ni derivaciones de autoridad en el
  cliente.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Detailed Spec

1. Resolver el self-status por el BFF/session existente y conservar `coverage`, `asOf`, período y blocking reasons
   como tipos explícitos; ninguna cifra desconocida se normaliza a cero.
2. Sustituir la lectura primaria del chip por `effectiveAvailable` y un estado semántico; mantener el ledger como
   contexto histórico/contable secundario.
3. Extender `CreditsPopover` dentro de `ProducerHeader.tsx` con filas separadas para período
   (`spent|held|cap|remaining`), funding vigente, ledger y daily fence.
4. La única navegación administrativa es un deep link no autorizante a Greenhouse para el rollout interno. No
   transporta tokens/authority ni depende de un boolean inventado en Globe; Greenhouse revalida acceso al entrar.
5. Reusar la transición CSS existente del popover con tokens del payload, apertura inmediata bajo reduced motion,
   foco restaurado y cero count-up/donut animado.
6. Validar primero estados con fixtures deterministas y GVC premium desktop/mobile; después ejecutar un canary
   live con la sesión Chrome autenticada indicada por el operador antes del cutover interno.

## Scope

### Slice 1 — Self-status adapter in Producer

- Consumir `CreditCapacitySelfStatusV1` por el BFF/session existente.
- Mantener datos parciales/stale tipados y tests de redacción/shape.

### Slice 2 — Header y popover

- Cifra primaria effective available y estado semántico.
- Descomposición ledger, cap/spent/held, funding y daily fence.
- Reason tipado; deep link no autorizante a `/admin/globe/credits`, con revalidación en destino.

### Slice 3 — Visual/runtime evidence

- Tests de estados, keyboard/focus/reduced motion y no local math.
- GVC premium desktop/mobile y canary interno con status real.

## Out of Scope

- Cambiar caps, fondear, emitir grants, administrar pools/policies o reconciliar ledger.
- Abrir los DTOs administrativos actuales a `ui`.
- Calcular `monthlyCap = spentInPeriod + policyAvailable`.
- Checkout, pricing, payment, clientes externos o automatización de rollover.

## Rollout Plan & Risk Matrix

Slice 1 → Slice 2 → Slice 3. Self-status debe pasar conformance antes de cambiar la cifra primaria.

El scope OAuth se promueve en cuatro movimientos sin downtime:

1. Greenhouse agrega el scope sólo a `allowedScopes`; todavía no lo requiere ni lo concede.
2. Globe despliega el request del scope con coverage UI aún `policy-blocked`; login debe seguir sano.
3. Greenhouse agrega el scope a `requiredScopes` y `capabilityScopes`; token/login se verifican nuevamente.
4. Globe activa coverage UI y la surface; hasta entonces el reader no aparece disponible en el browser.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Mostrar ledger como spendable | UI/credits | high | self-status semántico + source scan | GVC/contract test |
| Unknown aparece como cero | UI | medium | union tipada + fixtures partial | state test |
| Filtrar admin internals | access | low | DTO redactado + shape test | redaction test |
| Romper header mobile | UI | medium | extend existente + GVC 390 px | overflow assertion |

- Feature flags / cutover: usar gate/canary del payload Producer existente; no abrir admin writes.
- Rollback: revert UI/adaptor y volver al estado neutro, nunca al saldo histórico como “disponible”.
- Production verification: local → GVC → internal canary → release gobernado si corresponde.
- Out-of-band coordination required: el scenario determinista no depende de perfil; el canary live usa
  exclusivamente la sesión Chrome autenticada indicada por el operador.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] `Execution profile`, UI impact, wireframe y flow reflejan el cambio visible real.
- [x] Producer consume `CreditCapacitySelfStatusV1` y no los DTOs administrativos ambiguos.
- [x] La cifra primaria es effective available; ledger histórico se muestra sólo como dimensión secundaria.
- [x] Cap/spent/held, funding y daily fence aparecen separados y con razones tipadas.
- [x] `partial|stale|unknown` nunca se convierte en cero ni en estado healthy.
- [x] No existe command/CTA de fondeo en Globe; el deep link no transporta authority y Greenhouse revalida acceso.
- [x] El browser no calcula cap, remaining, funding eligibility ni effective available.
- [x] Loading, healthy, low, blocked, no-policy, expired, partial/stale, permission y error están cubiertos.
- [x] Keyboard, focus restore, reduced motion y 390 px sin overflow pasan.
- [x] GVC desktop/mobile usa fixtures deterministas sin perfil; el canary live usa exclusivamente la sesión
  Chrome autenticada indicada por el operador.

## Verification

- `pnpm task:lint --task TASK-1628`
- `pnpm ui:wireframe-check --task TASK-1628`
- `pnpm ui:flow-check --task TASK-1628`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- GVC `globe-producer-credit-capacity-self-view` en 1440×1000 y 390×844.

## Closing Protocol

- [ ] `UI ready: yes` sólo después de mapping, GVC plan, decision log y checks verdes.
- [ ] Lifecycle/carpeta, README, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] No se crea ni usa un worktree aislado.

## Follow-ups

- TASK-1532 consume estimate/revalidación antes de generar; no redefine la capacidad.
- Cualquier administración adicional pertenece a TASK-1483 en Greenhouse.

## Delta 2026-08-01 — rebaseline completo por TASK-1630

La premisa anterior `monthlyCap = spentInPeriod + policyAvailable` quedó invalidada por auditoría de código. La
task ya no abre los readers administrativos existentes ni modifica grants OAuth. Se convierte en consumer UI del
self-status corregido, preserva Producer como read-only y reubica toda administración en Greenhouse.

## Checkpoint 2026-08-01 — self-view enterprise completo en local

- `CreditCapacitySelfStatusV1` distingue `complete|partial|unavailable` y freshness real. Un fallo del daily
  fence degrada sólo esa dimensión; un fence agotado agrega blocker tipado sin falsear la capacidad económica.
- El popover implementa loading, retry, last-good stale, partial, denied y error; Escape/click-away cierran,
  restauran foco y exponen ARIA de expansión, busy/live y progressbar semántico.
- Mobile conserva la cifra efectiva. El detalle muestra período UTC real, cap/spent/held, funding, ledger,
  daily cap y freshness; no contiene comandos administrativos.
- Tests de dominio/fecha/fixture y GVC premium desktop + 390 px pasaron. Evidencia local:
  `.captures/2026-08-01T21-45-11_globe-producer-credit-capacity-self-view`.
- Veredicto: `PASS` local. La task permanece `in-progress` hasta desplegar esta ampliación desde Globe
  `main` y repetir el smoke en la sesión Chrome autenticada.
