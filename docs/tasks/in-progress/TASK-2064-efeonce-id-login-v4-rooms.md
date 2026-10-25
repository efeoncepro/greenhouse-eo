# TASK-2064 — Efeonce ID: login V4 con Rooms como primer consumidor

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Visual direction: `docs/ui/visual-directions/TASK-2064-efeonce-id-login-v4-rooms.md`
- Wireframe: `docs/ui/wireframes/TASK-2064-efeonce-id-login-v4-rooms.md`
- Flow: `docs/ui/flows/TASK-2064-efeonce-id-login-v4-rooms-flow.md`
- Motion: `docs/ui/motion/TASK-2064-efeonce-id-login-v4-rooms-motion.md`
- Backend impact: `none`
- Epic: `EPIC-044`
- Status real: `Implementación y QA local completos 2026-10-25: V4 neutral/Rooms, GVC premium42 frames,116 tests y55 rangos contraste verdes. Pendientes rollout, login real y contrato del feed de novedades; no desplegado.`
- Rank: `TBD`
- Domain: `identity|ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Lleva la pantalla V4 renovada de Greenhouse al login de Efeonce ID, con Rooms como primer contexto de producto. Conserva métodos reales y la frontera first-party/MCP; no migra el login del portal en esta entrega.

## Why This Task Exists

El issuer tiene shell Nocturno editorial mientras Greenhouse ya tiene V4 aprobado. Portar JSX importaría Next/MUI al runtime node:http y copiar controles agregaría métodos inexistentes. El adapter HTML debe reutilizar la composición y sus fuentes reales sin alterar autenticación.

## Goal

- Login V4 fiel en escritorio/móvil, neutral o contextual Rooms.
- Métodos, CSP, tokens, marca y sesiones preservados.
- Evidencia visual y funcional local; rollout separado y honesto.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`.
- `docs/architecture/ui-platform/PATTERNS.md` — runtime sin React.
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`.
- UI no infiere contexto desde query; lo recibe resuelto del issuer. MCP conserva consentimiento delegado.

## Normative Docs

- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.
- `docs/ui/wireframes/TASK-1964-login-v4-premium-access.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.

## Dependencies & Impact

### Depends on

- TASK-1834 para resolver contexto first-party; harness puede verificar UI antes de activación.
- TASK-1964 como fuente elegida; TASK-1835 conserva métodos/contratos funcionales.

### Blocks / Impacts

- TASK-1834 adopción Rooms; login issuer neutral y contextual.

### Files owned

- `src/lib/auth-server/persons/pages.ts`, `login-controller.ts` y generado.
- `src/lib/auth-server/oauth/pages/` render/assets/estilos y módulos V4.
- `scripts/auth-server/` generadores UI y harness.
- `src/lib/copy/auth-server-login-v4.ts`.
- `docs/ui/` TASK-2064 y esta task.

## Current Repo State

### Already exists

- V4 en `src/views/Login.tsx`; fotos oficiales `public/images/login/`; fuentes web versionadas.
- Issuer HTML, CSP por hash/nonce, tests de drift y harness de renderers reales.

### Gap

- Resuelto local: issuer presenta V4/contexto y WOFF2 renovados. Falta verificar release e integración real; novedades quedan en fallback oficial.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/auth-server/oauth/pages` y `persons`; runtime `services/auth-server`.
- Future candidate home: `remain-shared`
- Boundary: adapter visual issuer; no dependencia runtime de Next/MUI ni stores del portal.
- Server/browser split: servidor escapa DTO validado; controller browser sólo maneja interacción y endpoints existentes.
- Build impact: assets oficiales y CSS/JS generados bundleados; sin filesystem public en Cloud Run.
- Extraction blocker: mantener generadores/drift/CSP y renderer en misma unidad.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: persona que entra desde Rooms o visita directamente Efeonce ID.
- Momento del flujo: autenticación en el issuer antes de volver al producto.
- Resultado perceptible esperado: la pantalla V4 aprobada de Greenhouse se reconoce en Auth y presenta sólo métodos reales.
- Friccion que debe reducir: saltos visuales entre productos y un segundo login innecesario.
- No-goals UX: contraseña, Google no implementado, selector de productos o consentimiento delegado en first-party.

### Surface & system decision

- Surface: `/login` de Auth; neutral y contextual Rooms.
- Nav placement: `none` — entry de autenticación existente.
- Composition Shell: `no aplica` — runtime node:http sin React, patrón Efeonce ID de PATTERNS.md.
- Primitive decision: `extend` — renderer HTML y controlador nonce existentes; adapter CSS desde AXIS.
- Adaptive density / The Seam: `no aplica` — formulario de acceso, no workbench.
- Floating/Sidecar/Dialog decision: ninguno; WebAuthn conserva la UI del browser.
- Copy source: `src/lib/copy/auth-server-login-v4.ts` y contratos existentes.
- Access impact: `none` — backend resuelve sesión y RP; UI no otorga permiso.

### State inventory

- Default: Efeonce principal, Rooms sólo con contexto validado; Microsoft elegible, passkey soportada y correo.
- Loading: estado anunciado y acción bloqueada mientras espera; nunca animación con tiempo mínimo artificial.
- Empty: sin novedades, fotografía oficial sin titulares inventados.
- Error: email inválido y error passkey visibles, próximos pasos existentes.
- Degraded / partial: sin JS/WebAuthn queda correo; fallo editorial no impide acceso.
- Permission denied: los errores del issuer conservan su renderer y salida funcional.
- Long content: campos y texto envuelven sin cortar ni crear scroll horizontal.
- Mobile / compact: formulario primero; foto debajo; botón en primer pliegue 390×844.
- Keyboard / focus: orden DOM igual a lectura, focus-visible, error asociado al campo.
- Reduced motion: imagen fija, transiciones mínimas, carousel pausado.

### Interaction contract

- Primary interaction: autenticar con passkey o solicitar enlace por correo; Microsoft sólo si policy lo ofrece.
- Hover / focus / active: borde y halo desde tokens, sin saltos de tamaño.
- Pending / disabled: sólo durante operación, estado aria-live.
- Escape / click-away: ceremonia nativa del navegador; cancelación conserva correo.
- Focus restore: al mismo control tras fracaso de ceremonia.
- Latency feedback: mensaje real del controller; no contador ficticio.
- Toast / alert behavior: estado inline aria-live, error asociado por aria-describedby.

### Motion & microinteractions

- Motion primitive: `CSS` + controlador DOM.
- Enter / exit: translate corto sin reducir contraste ni bloquear primer paint.
- Layout morph: responsive por breakpoint V4 de 1024px.
- Stagger: sólo foto/contexto; formulario siempre visible.
- Timing / easing token: efeonceGraphicLine.motion, contrato V4 TASK-1964.
- Reduced-motion fallback: ninguna animación de entrada o imagen.
- Non-goal motion: no transition cross-origin garantizada ni delay artificial.

### Implementation mapping

- Route / surface: `src/lib/auth-server/persons/pages.ts`, `/login`.
- Primitive / variant / kind: HTML Efeonce ID / login-v4 / first-party-neutral-or-rooms.
- Component candidates: renderer login-v4, assets allowlisted, CSS generado y controller nonce.
- Copy source: `src/lib/copy/auth-server-login-v4.ts`.
- Data reader / command: sesiones y comandos existentes; contexto RP del backend TASK-1834.
- API parity: mismos endpoints de passkey y magic link, sin nueva lógica de negocio.
- Access / capability: autenticación no concede acceso Rooms; callback consumidor mantiene autorización.
- States to implement: neutral, Rooms, error, sin Microsoft, sin JS, reduced motion y foto sin novedades.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/auth-login-v4-issuer.scenario.ts`.
- Route: `/login` en harness local real del issuer.
- Viewports: desktop 1440×960, laptop 1280×800, mobile 390×844.
- Quality profile: `premium`.
- Required steps: abrir neutral y Rooms, teclado, estado inválido, revisar fotografía y fuentes.
- Required captures: first-fold, full-page, error y reduced-motion.
- Required `data-capture` markers: `login-form`, `login-stage`, `id-passkey`, `id-status`.
- Assertions: login visible; no errores CSP; correo usable; destino validado.
- Scroll-width checks: `scrollWidth <= clientWidth` en cada viewport.
- Reduced-motion / focus evidence: captura con preferencia reduce y foco visible.
- Review dossier: `docs/ui/reviews/TASK-2064-efeonce-id-login-v4-rooms/`.
- Baseline decision / surface ID: source-led TASK-1964 V4; nuevo issuer separado del portal.

### Design decision log

- Decision: adoptar V4 elegida expresamente por Julio el 2026-10-25, Rooms primero.
- Alternatives considered: conservar Nocturno editorial o incrustar Next/MUI; descartadas por dirección explícita y frontera runtime.
- Why this pattern: misma identidad visual con adapter seguro del issuer.
- Reuse / extend / new primitive: extender renderer existente; fuentes y fotos oficiales, sin nueva familia de componentes.
- Open risks: CSP de imágenes, tipografía exacta, retorno contextual y no romper consentimiento.

### Visual verification

- GVC scenario: auth-login-v4-issuer, premium.
- Viewports: 1440×960 y 390×844; laptop 1280×800.
- Required captures: default, Rooms, error, reduced-motion.
- Required `data-capture` markers: login-form, login-stage, id-passkey.
- Scroll-width check: no overflow horizontal en todos los targets.
- Accessibility/focus checks: labels, keyboard, WebAuthn fallback y contraste medido sobre píxeles.
- Before/after evidence: fuente V4 versionada y renderer issuer anterior en git.
- Known visual debt: TASK-1964 sigue abierto; no heredar su cierre.
- Visual scorecard: `docs/ui/reviews/TASK-2064-efeonce-id-login-v4-rooms/scorecard.json`.
- Quality threshold: average >= 4.5; floor >= 4; hierarchy/fidelity/surface economy/impact/template resistance >= 4.5.

<!-- ZONE 2 — PLAN MODE -->

## Plan

UI enterprise-ready guard: no cierre sin GVC premium desktop/móvil, frames inspeccionados, contraste y CSP. Ejecución secuencial dentro del subagente UI; backend y consumer poseen archivos disjuntos. Auditoría: fuente V4 aprobada, métodos del issuer conservados, fotos ya producidas pese a comentario stale. Primero contrato/readiness, después assets/render/first fold, después comportamiento y verificación. Sin commit ni deploy.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Contrato y first fold

- Documentar fuente y contextos; generar assets/fonts/CSS; renderer V4 responsive.

### Slice 2 — Interacción y QA

- Preservar passkey/correo/Microsoft, CSP y estados; GVC y pruebas de no regresión.

## Detailed Spec

El renderer recibe LoginProductContext sólo del resolver servidor, escapa displayName y verifica esquema HTTPS del retorno. Assets y fuentes oficiales son allowlist build-time con hashes. El formulario conserva POST y controller nonce; el backend y registry OIDC pertenecen a TASK-1834.

## Backend/Data Contract

Backend impact none: este consumer no altera DB, API, schema, grants, sesiones ni commands. Sólo presenta DTO del backend existente y del resolver TASK-1834; tests verifican formularios y CSP sin cambiar autorización.

## Out of Scope

- Backend OIDC, migración Greenhouse, despliegue, nuevos métodos y altas de usuarios.
- Rediseño de consentimiento/step-up/error; mantienen shell funcional actual.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contrato/readiness → first fold visual → integración estados → gates → rollout separado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| CSP bloquea asset/controller | Auth | medium | bundles same-origin, nonce/hash y browser QA | console CSP |
| Branding falso | Auth | medium | contexto sólo de registro servidor, escape | test contrato |
| Novedades bloquean acceso | Auth | low | fallback fotografía sin dependencia de DB | login responde |
| Regresión consentimiento | MCP | low | renderer sólo estado login, suite existente | tests UI |

### Feature flags / cutover

Sin nuevo flag visual: cambio renderer de login; deploy no realizado por esta unidad. Habilitación first-party mantiene gates de TASK-1834.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert renderer/assets al commit anterior | < 15 min | sí |
| 2 | revert controller y regenerar, misma API | < 15 min | sí |

### Production verification sequence

1. Gates local UI/contratos y GVC sobre renderer real.
2. Release autorizado del issuer, identidad sin cambios implícitos.
3. Probes login, assets, CSP y métodos; retorno RP y consentimiento MCP en carriles separados.

### Out-of-band coordination required

Sesión Rooms posee consumer; root coordina integración y release. No nuevos clientes ni secrets por UI.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Readiness aprobado con fuente V4 y contratos completos; `ui:readiness-check` template1 legacy0.
- [x] Neutral y Rooms se distinguen sin branding de query ni métodos ficticios; renderer tests + GVC.
- [x] First fold desktop/móvil preserva composición V4 con fuentes/foto oficiales; [revisión](../../ui/reviews/TASK-2064-efeonce-id-login-v4-rooms/README.md).
- [x] CSP, formulario, exposición de passkey/Microsoft, teclado y reduced motion verificados localmente;8 checks browser y116 tests. Autenticación real pendiente abajo.
- [x] Consentimiento y páginas existentes conservan regresiones verdes; suite UI y harness con/sin JS.
- [x] Evidencia visual/scorecard y estado rollout registrados en dossier; no desplegado.
- [ ] Release y autenticación real Efeonce ID→Rooms verificados; dependen del rollout TASK-1834/2065.
- [ ] Fuente pública bounded de novedades definida e integrada; hoy fallback oficial y fixtures sólo para QA.

## Verification

- `pnpm ui:readiness-check --task TASK-2064`.
- Tests auth-server UI, assets y controller; typecheck/lint focal.
- GVC premium auth-login-v4-issuer y revisión de contraste.

## Closing Protocol

- [x] Lifecycle y ubicación honestos; falta rollout mantiene in-progress.
- [ ] README/registry/epic/Handoff sincronizados por root.
- [ ] Impacto TASK-1834/2063/1964/1835 revisado.
- [x] QA visual y funcional adjunto con límites.

### Verificación integrada posterior del coordinador

La sesión dueña de Rooms confirmó E2E OIDC real TASK-2065: navegador Chrome, issuer19334 y Rooms19335, PostgreSQL de ambos runtimes; entry/callback/sesión, 0/1/N, permisos separados, logout y revocación PASS. No equivale a login Microsoft/passkey contra proveedores reales ni rollout cloud. Dossier integrado: `docs/audits/identity/2026-10-25-auth-rooms-first-local.md`.
