# TASK-1724 — Talent Pool Consent and Candidate Self-Service

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1724-talent-pool-consent-self-service.md`
- Flow: `docs/ui/flows/TASK-1724-talent-pool-consent-self-service-flow.md`
- Motion: `docs/ui/motion/TASK-1724-talent-pool-consent-self-service-motion.md`
- Backend impact: `migration|command|api`
- Epic: `EPIC-011`
- Status real: `Complete y desplegada en producción; self-service habilitado por CEO el 2026-08-16, con flags Vercel/worker en true, token/receipt verificados y rollback documentado`
- Rank: `TBD`
- Domain: `hr|ui|content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agrega consentimiento opcional e independiente para futuras oportunidades al apply de Careers y una superficie
tokenizada para consultar estado, renovar, actualizar disponibilidad o retirar el perfil. Es cliente del contrato
TASK-1723: no guarda consentimiento en componentes ni crea una cuenta paralela de candidato.

## Execution Evidence — 2026-08-16

- Opt-in opcional agregado al apply sin precheck ni efecto sobre la postulación; request/confirmación, disponibilidad y
  withdrawal usan commands canónicos y receipt/readback autoritativo.
- Self-service público bilingüe implementado con token acotado, estados anti-oracle y rate limit; la migración expandió
  el ledger append-only para soportar `requested` sin reescribir historia.
- GVC premium pasó en 1440×1000 y 390×844 con teclado y reduced motion en
  `.captures/2026-08-16T08-52-56_hiring-talent-pool-self-service`.
- La superficie quedó habilitada tras release `20245888625b8dc979cf2f747f5ef9d7999df6e5` / run `31953851353`, con
  `HIRING_TALENT_POOL_SELF_SERVICE_ENABLED=true` en Vercel y worker. Smoke read-only de token inválido conserva el
  anti-oracle `404 talent_pool_link_unavailable`; no se envió correo a una persona real durante el flip.
- La auditoría Talent posterior al rollout cerró el último borde anti-abuse: si falta IP se usa un bucket opaco
  compartido y si PostgreSQL no puede aplicar el rate limit la solicitud se niega, nunca queda ilimitada.

## Why This Task Exists

El consentimiento actual autoriza tratamiento “para este proceso de selección” y enlaza a `/privacy`, URL que hoy
devuelve 404; el aviso vigente vive en `/politica-de-privacidad/`. Incorporar candidatos al banco sin separar purposes,
vigencia y retiro produciría una experiencia ambigua y un riesgo de recontacto no autorizado.

El backend necesita una UI igualmente clara: aceptar el banco no puede ser condición para postular y retirarse no
puede requerir contactar manualmente a People. La solución V1 evita un portal/login nuevo y usa un enlace tokenizado,
anti-oracle y de alcance limitado.

## Goal

- Separar visual, semántica y técnicamente el consentimiento de la postulación del opt-in a futuras oportunidades.
- Permitir al candidato leer purpose/vigencia/estado, actualizar disponibilidad y retirar o renovar su perfil.
- Corregir el aviso de privacidad en ambos renderers de Careers y probar el link real.
- Entregar una superficie pública bilingüe, accesible, anti-abuse y verificable en desktop/390px.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`

Reglas obligatorias:

- El opt-in futuro es opcional, independiente, no preseleccionado y no altera aceptación/resultado de la postulación.
- La UI no deriva `eligible/contactable`, no interpreta token ni persiste legal state optimistamente; sólo consume TASK-1723.
- Invalid/expired/replayed token usa respuesta anti-oracle y no confirma existencia de persona/email/postulación.
- Withdrawal es tan accesible como opt-in y conserva receipt/readback; la UI no promete borrado inmediato de audit obligatorio.
- Copy reusable vive en dictionaries; status/purpose/expiry nunca se truncan ni dependen sólo de color.

## Normative Docs

- `DESIGN.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/visual-directions/TASK-1724-talent-pool-consent-self-service.md`
- `docs/ui/wireframes/TASK-1724-talent-pool-consent-self-service.md`
- `docs/ui/flows/TASK-1724-talent-pool-consent-self-service-flow.md`
- `docs/tasks/complete/TASK-354-public-careers-landing-apply-intake.md`
- `docs/tasks/complete/TASK-1688-careers-application-contact-completeness.md`
- `docs/operations/hiring/2026-08-12-revision-privacidad-contacto-careers.md`
- `https://efeoncepro.com/politica-de-privacidad/`

## Dependencies & Impact

### Depends on

- `TASK-1723` para DTO público, token, commands, anti-oracle errors, receipts y lifecycle.
  Sus primitives, schema y policy ya están materializados en development; esta task extiende el token/receipt público
  sin cambiar el aggregate.
- `src/lib/hiring/public-careers/growth-form-contract.ts` y Careers apply existente.
- `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts` y public Careers shell.

### Blocks / Impacts

- Habilita `pool_eligible` y withdrawal verificable antes del invite productivo de TASK-1723/1725.
- Corrige el enlace de privacidad de Careers/Growth Form; TASK-1397/1398 mantienen su scope de Career Alerts.
- No desbloquea campañas masivas ni acceso de clientes externos.

## Hybrid Execution Justification

La task es híbrida de forma intencional y acotada: el token verificable, receipt, endpoints públicos y proyección
de correo son el boundary server-side indispensable para que la UI no interprete identidad, consentimiento ni
lifecycle en el browser. Separarlos dejaría una pantalla simulada o empujaría policy al cliente. El aggregate,
policy, commands internos y Full API Parity siguen siendo de TASK-1723; TASK-1724 sólo agrega el adapter público y
su consumer visual, con rollout único y reversible detrás de `HIRING_TALENT_POOL_SELF_SERVICE_ENABLED`.

### Files owned

- `src/app/(public)/careers/**` *(extensión apply y nueva route tokenizada; path exacto se confirma en Plan Mode)*
- `src/lib/hiring/public-careers/growth-form-contract.ts`
- `src/lib/copy/dictionaries/es-CL/careers.ts`
- `src/lib/copy/dictionaries/en-US/careers.ts`
- components públicos route-local bajo la feature Careers/Talent Pool
- escenarios GVC, docs funcionales y manuales de candidato/People aplicables

## Current Repo State

### Already exists

- Careers ofrece apply custom y Growth Form canónico, con consentimiento obligatorio, Turnstile y confirmación genérica.
- El public shell y los dictionaries bilingües ya existen; TASK-1688 persiste contacto/residencia/mensaje.
- El copy dice “para este proceso de selección” y `growth-form-contract.ts` construye `${EFEONCE_URL_HTTPS}/privacy`.

### Gap

- No existe consentimiento independiente de Talent Pool ni status/receipt autogestionable.
- No existe route tokenizada para renovar, actualizar disponibilidad o retirar membership.
- El link de privacidad del form apunta a una URL live inexistente.
- No hay GVC/focus/mobile evidence para el flujo nuevo.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `Careers público en src/app/(public) y renderer/contract público existente`
- Future candidate home: `public`
- Boundary: `DTO y commands públicos tokenizados de TASK-1723; Client Components sólo renderizan estado y envían intents`
- Server/browser split: `browser recibe payload allowlisted y receipt; token verification, membership, contact, audit y policy permanecen server-only`
- Build impact: `none; reusa MUI/AXIS y renderer existente`
- Extraction blocker: `routing público, Turnstile/token y commands viven junto al public intake Greenhouse`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: `candidato externo sin sesión`
- Momento del flujo: `durante apply o al abrir un enlace self-service`
- Resultado perceptible esperado: `comprende purpose/estado/vigencia y puede aceptar, actualizar o retirar sin ambigüedad`
- Friccion que debe reducir: `consentimiento bundled, links rotos y dependencia de People para ejercer retiro`
- No-goals UX: `candidate account, vacancy feed, ranking, profile gamification o promesas de contacto`

### Surface & system decision

- Surface: `Careers apply + /public/careers/talent-profile/[token]`
- Nav placement: `none` — entrada contextual desde apply/email; no agrega navegación pública global
- Composition Shell: `no aplica` al apply embebido; self-service reusa shell público y materializa la semántica
  `settingsFlow` en una trust sheet route-local, sin importar chrome del dashboard
- Primitive decision: `reuse` — public form controls, GreenhouseButton, Alert/Dialog y SurfaceRecipe existentes
- Adaptive density / The Seam: `no aplica` — una columna de confianza, no cards adaptables
- Floating/Sidecar/Dialog decision: `Dialog sólo para withdrawal; sin sidecar/floating surface`
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/careers.ts`
- Access impact: `startup policy` — token público de alcance único, anti-oracle y rate-limited

### State inventory

- Default: `apply sin opt-in; self-service con status autoritativo`
- Loading: `skeleton estable sin revelar identidad`
- Empty: `n/a; token no válido usa unavailable genérico`
- Error: `validation, conflict, rate-limited, dependency unavailable y generic failure`
- Degraded / partial: `estado visible; datos opcionales unknown sin falsear vigencia`
- Permission denied: `misma respuesta anti-oracle que invalid/expired`
- Long content: `purpose/policy/expiry wrap completo; sin ellipsis`
- Mobile / compact: `acciones apiladas, withdrawal visible secundario, 390px sin overflow`
- Keyboard / focus: `labels/descriptions, error focus, dialog trap/restore y live receipt`
- Reduced motion: `cambio instantáneo con mismo receipt/status`

### Interaction contract

- Primary interaction: `join/renew/update/withdraw según allowedActions del DTO`
- Hover / focus / active: `tokens canónicos y focus visible`
- Pending / disabled: `bloqueo por command en vuelo; nunca por consentimiento no opcional`
- Escape / click-away: `cierra dialog de withdrawal sin ejecutar`
- Focus restore: `trigger de withdrawal o heading del receipt tras éxito`
- Latency feedback: `pending textual + receipt/readback autoritativo`
- Toast / alert behavior: `errores persistentes inline; toast sólo como complemento`

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: `feedback de estado tokenizado, sin coreografía no trivial`
- Layout morph: `none`
- Stagger: `none`
- Timing / easing token: `tokens UI existentes`
- Reduced-motion fallback: `swap inmediato`
- Non-goal motion: `confetti, countdown, celebratory or persuasive animation`

### Consulted design stack

- Orchestrator: `greenhouse-ai-design-studio` (`ui-standard`, repo-native benchmark).
- Architecture/implementation: `greenhouse-ui-orchestrator`, `greenhouse-product-ui-architect`,
  `greenhouse-portal-ui-implementer`, `greenhouse-vuexy-ui-expert`, AXIS adapter contract.
- UX/craft: `greenhouse-ux-content-accessibility`, `modern-ui-greenhouse-overlay`,
  `greenhouse-typography-accessibility`, `motion-design-greenhouse-overlay` and
  `greenhouse-microinteractions-auditor`.
- Modern platform guidance: Chrome `modern-web-guidance` guides `required-field-feedback` and `html`, mapped to
  MUI/AXIS rather than copied literally.
- Primitive decision: `reuse`; no new primitive. One Poppins page identity, Geist operational text, persistent live
  region, post-interaction validation and MUI Dialog focus lifecycle.

### Implementation mapping

- Route / surface: `Careers apply y nueva route tokenizada bajo src/app/(public)/careers`
- Primitive / variant / kind: `public form + SurfaceRecipe settingsFlow + Dialog`
- Component candidates: `CareersApplyClient/public renderer existentes; components route-local`
- Copy source: `careers dictionaries es-CL/en-US`
- Data reader / command: `TASK-1723 self-service status/consent/availability/withdrawal`
- API parity: `UI es consumer; reglas sólo en primitives TASK-1723`
- Access / capability: `scoped token + Turnstile/rate limit donde corresponda; sin capability interna`
- States to implement: `unchecked, active, needs_reconsent, withdrawn, expired, invalid, pending, conflict, error`

### GVC scenario plan

- Scenario file: `scripts/frontend-capture/scenarios/hiring-talent-pool-self-service.*`
- Route: `Careers apply + /public/careers/talent-profile/[fixture-token]`
- Viewports: `1440x1000 y 390x844`
- Quality profile: `premium`
- Required steps: `opt-in, validation, active read, availability update, withdrawal confirm/receipt`
- Required captures: `unchecked, active, needs_reconsent, withdrawn, invalid/expired y error`
- Required `data-capture` markers: `talent-pool-opt-in|status|purpose|primary-action`
- Assertions: `privacy 200, independence, console/axe clean, focus restore y anti-oracle copy`
- Scroll-width checks: `scrollWidth <= clientWidth en ambos viewports`
- Reduced-motion / focus evidence: `obligatoria para dialog y receipt`
- Review dossier: `docs/ui/reviews/TASK-1724-talent-pool-consent-self-service/`
- Baseline decision / surface ID: `nuevo baseline tras first-fold acceptance; no sobrescribe Careers baseline existente`

### Design decision log

- Decision: `two-moment trust flow: opt-in corto + self-service tokenizado`
- Alternatives considered: `checkbox-only; portal/account de candidato`
- Why this pattern: `separa purpose y hace withdrawal usable sin introducir identity runtime nuevo`
- Reuse / extend / new primitive: `reuse; extensión route-local del Careers form`
- Open risks: `copy/TTL requieren Legal/Privacy y abogado habilitado antes de rollout`

### Visual verification

- GVC scenario: `hiring-talent-pool-self-service`
- Viewports: `1440 y 390`
- Required captures: `los seis estados definidos en wireframe`
- Required `data-capture` markers: `talent-pool-opt-in|status|purpose|primary-action`
- Scroll-width check: `obligatorio`
- Accessibility/focus checks: `WCAG 2.2 AA, error focus, dialog, live receipt`
- Before/after evidence: `Careers apply actual vs opt-in separado; self-service nueva`
- Known visual debt: `none accepted at close`
- Visual scorecard: `docs/ui/reviews/TASK-1724-talent-pool-consent-self-service.scorecard.json`
- Quality threshold: `average >= 4.5; no dimension <4; hierarchy/surface economy/impact/fidelity/template resistance >=4.5`

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

### Slice 1 — Copy, privacy link y apply opt-in

- Extender ambos renderers con consentimiento opcional independiente y dictionaries bilingües aprobados.
- Reemplazar `/privacy` por la URL vigente y probar status/rel/target.

### Slice 2 — Self-service states and actions

- Implementar route/surface para active/needs-reconsent/withdrawn/expired/invalid y commands autorizados.
- Añadir withdrawal dialog, receipts, conflict recovery y anti-oracle errors.

### Slice 3 — First fold, GVC y accessibility closure

- Ejecutar first-fold checkpoint desktop/mobile y corregir jerarquía/densidad antes de estados exhaustivos.
- Completar GVC premium, scorecard ≥4.5, keyboard/focus/reduced-motion y scroll-width.

## Out of Scope

- Backend, schema, token issuance, email/repermission campaign o eligibility policy (TASK-1723).
- Talent Pool Desk (TASK-1725), MCP (TASK-1726), vacancy feed o candidate account/login.
- Cambiar Career Alerts TASK-1397/1398, assessment consent o lifecycle emails TASK-1689.
- Asumir que opt-in mejora posibilidades, prometer contacto o mostrar información interna.

## Detailed Spec

El apply conserva el checkbox actual como obligatorio para la postulación y agrega un segundo control opcional con
purpose/TTL/withdrawal breves. La self-service route recibe un token opaco y sólo muestra el DTO allowlisted. Nunca
muestra email, application status, assessment result o razones internas; el receipt puede usar un reference ID opaco.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1723 policy/DTO → Slice 1 copy/opt-in con flag OFF → Slice 2 self-service → Slice 3 evidence → rollout ON
  gobernado (completado el 2026-08-16).
- No habilitar opt-in ni enviar links hasta que privacy/purpose/TTL y URL pública estén aprobados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Consentimiento bundled/confuso | UI/privacy | medium | controles independientes + user test/GVC | `hiring.talent_pool_consent_violation` |
| Token revela existencia | public/auth | low | anti-oracle states + tests | access/security capture |
| Link privacy roto | public | medium | live HTTP smoke en ambos renderers | synthetic link check |
| Withdrawal no refleja estado | UI/API | low | receipt + authoritative readback | reconciliation signal TASK-1723 |

### Feature flags / cutover

- Usa el flag público de Talent Pool definido en TASK-1723; el estado live es ON desde 2026-08-16 y se revierte a OFF
  de forma independiente. El link de privacidad correcto puede shippear antes.
- Rollback: flag OFF oculta opt-in/self-service sin alterar memberships/audit existentes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Ocultar opt-in por flag; conservar corrección privacy URL | <5 min | sí |
| 2 | Deshabilitar route/actions; mantener backend/audit | <5 min | sí |
| 3 | Revert UI/GVC changes sin tocar data | <10 min | sí |

### Production verification sequence

1. Verificar policy/commands TASK-1723 en staging y URL de privacidad 200.
2. El rollout productivo actual ya tiene flag ON; para rollback deploy flag OFF y confirma apply legacy sin cambios.
3. Ejecutar GVC/axe/keyboard/anti-oracle desktop+390 con fixture/cohorte allowlisted.
4. Ejercitar opt-in, readback, update, withdrawal y token replay con cuenta sintética.
5. Activar gradualmente; monitorear errors/consent violations antes de ampliar.

### Out-of-band coordination required

- People y Legal/Privacy aprueban copy, purpose, TTL y recovery; abogado habilitado valida postura aplicable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Consentimiento de postulación y opt-in futuro son controles independientes, sin precheck ni efecto sobre submit.
- [x] `/privacy` dejó de emitirse y ambos renderers enlazan a la política canónica.
- [x] Self-service cubre active/needs_reconsent/withdrawn/expired/invalid/pending/conflict/error sin filtrar existencia.
- [x] Join/renew/update/withdraw consumen TASK-1723 y muestran receipt/readback autoritativo.
- [x] Wireframe/flow/visual direction existen y pasan los checks aplicables.
- [x] Primitive decision es reuse y no nace account, store ni business rule client-side.
- [ ] Copy reusable vive en dictionaries es-CL/en-US y fue revisado por People/Privacy.
- [x] Keyboard, focus, dialogs, live regions, 200% zoom y reduced motion cumplen el contrato local.
- [x] GVC premium 1440/390 cubre estados y `scrollWidth <= clientWidth`; consola/axe limpios.
- [x] Scorecard cumple average ≥4.5 y floors de la skill; enterprise verdict no es BLOCK.
- [x] Flag/rollback y fail-closed productivo fueron ejercitados; el smoke externo se ejecutará sólo al aprobar el rollout amplio.

## Verification

- `pnpm task:lint --task TASK-1724`
- `pnpm ui:wireframe-check --task TASK-1724`
- `pnpm ui:flow-check --task TASK-1724`
- `pnpm ui:readiness-check --task TASK-1724`
- `pnpm design-contract:lint`
- `pnpm ui:code-lint`
- `pnpm ui:visual-gate`
- `pnpm ui:quality --task TASK-1724`
- `pnpm fe:capture hiring-talent-pool-self-service --env=staging`
- `pnpm qa:gates --changed`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] Documentación Careers/People y privacy review reflejan el comportamiento live y el gate externo pendiente.

## Follow-ups

- Candidate account/feed sólo si existe evidencia de recurrencia y un ADR de identidad; no se deriva de esta UI.

## Open Questions

- Ninguna de producto abierta; purpose/TTL exactos se fijan en el ADR TASK-1723 y se consumen, no se inventan aquí.
