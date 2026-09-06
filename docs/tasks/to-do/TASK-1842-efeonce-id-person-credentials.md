# TASK-1842 — Efeonce ID: credenciales de la persona (alta de passkey y dispositivos)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1842-efeonce-id-person-credentials.md`
- Flow: `docs/ui/flows/TASK-1842-efeonce-id-person-credentials-flow.md`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-044`
- Status real: `Registrada 2026-09-06 por el barrido de superficie de EPIC-044 (sesión greenhouse-eo-06, durante TASK-1835). Backend completo desde 2026-09-04 y sin ninguna superficie. NO bloquea la certificación: scripts/auth-server/external-passkey-canary.ts (TASK-1832) ya ejecuta registro y login con una passkey de plataforma real en Chrome persistente, dentro del origen real y sin CDP ni autenticador de software; ese runner declara en su cabecera que existe así porque la superficie de alta no existe. Lo que bloquea es el uso por una PERSONA. Corregida el mismo día tras la pregunta del operador: la primera versión describía sólo la pantalla del emisor, sin puerta desde Greenhouse — una capacidad inalcanzable, el mismo error que esta task existe para cerrar. El alcance ahora incluye la sección Cómo entras en /my/profile. La ruta del emisor deja de llamarse /account/* (colisionaba con TASK-1838, que usa esa palabra para la organización) y pasa a /credentials. UI ready: no hasta acordar con TASK-1838 la composición del área autenticada del emisor. NADA IMPLEMENTADO: los commits que mencionan esta task (da4a6db0a y siguientes) sólo la CREAN y la corrigen; por eso el lint avisa de progreso stale y por eso ningún checkbox está tildado. Es correcto.`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la superficie donde una persona **crea y retira sus propias credenciales**: alta de passkey
y listado de dispositivos con su retiro. Es el único tramo del recorrido de EPIC-044 que permite
dejar de depender del correo para volver a entrar.

**Son dos piezas, no una.** La pantalla vive en el emisor (`auth.efeonce.org/credentials`) porque el
dato no puede vivir en otro lado: `/auth/passkeys/*` exige la cookie `__Host-efeonce_auth`, que por
regla del navegador sólo existe en ese host, y una passkey autentica a la **identidad**, no a un
producto — la misma sirve para Greenhouse, para Globe y para el MCP. Pero **la puerta está en
Greenhouse**, dentro de `/my/profile`, que es donde la persona ya va. Dónde se guarda el dato y dónde
empieza la persona no son la misma pregunta; construir sólo la pantalla del emisor deja una página
que nadie encuentra.

## Why This Task Exists

El backend está completo desde el 2026-09-04 —`POST /auth/passkeys/register/{start,finish}`,
`GET /auth/passkeys`, tope por persona, rate limit propio, contador anti-clonación— y `TASK-1835`
puso el botón «Entrar con mi passkey» en `/login`. Falta la pantalla intermedia: **nadie tiene dónde
crear la credencial**, así que ese botón no le sirve a ninguna persona invitada y cada entrada exige
un correo nuevo.

No es una omisión de una task concreta: es el resultado de que el inventario S0–S10 del flujo maestro
no tiene ningún nodo para las credenciales de la persona, y de que 15 de las 17 tasks de EPIC-044
declaran `UI impact: none`. Toda capacidad visible que no entró en el `## Scope` de `TASK-1835` o
`TASK-1838` quedó sin dueño por construcción. Esta task cierra el caso más caro de esa clase y
registra el nodo que faltaba.

**Y por poco lo repite.** La primera versión de esta task describía sólo la pantalla del emisor, sin
ninguna puerta desde Greenhouse: exactamente una capacidad sin forma de llegar a ella. Lo detectó el
operador preguntando «si el perfil de usuario está en Greenhouse, ¿por qué esto va fuera?». Por eso
el punto de entrada es parte del alcance y de los criterios, no un detalle de implementación.

## Goal

- Sección **«Cómo entras»** en `/my/profile` de Greenhouse: muestra el estado de acceso de la
  persona y la lleva a gestionarlo. Es el punto de entrada; sin él la pantalla del emisor es inalcanzable.
- `auth.efeonce.org/credentials` server-rendered bajo `__Host-efeonce_auth`, en el shell «Efeonce ID»,
  donde la persona agrega una passkey, ve sus dispositivos y retira el que quiera, y vuelve a Greenhouse.
- Command canónico de retiro por credencial con audit — hoy sólo existe el corte de emergencia por
  admin, que no es autoservicio.
- Nodo `S11 · Credenciales de la persona` incorporado al flujo maestro de `EPIC-044`.
- Gate de cobertura endpoint→consumidor que impida que vuelva a nacer una capacidad del emisor sin
  superficie ni exclusión declarada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/ui-platform/PATTERNS.md` → §`Runtime sin React — shell «Efeonce ID»` (TASK-1835)
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

Reglas obligatorias:

- **Una clase, una superficie.** El shell tiene lienzo oscuro y tarjeta clara; reusar una clase de
  texto entre ambos arrastra el color del otro. Costó 1.53:1 en la ficha de aplicación y 3.28:1 en el
  pie, ambos en TASK-1835.
- **El contraste se mide sobre píxeles**, no con axe: con fondo en degradado axe devuelve todo en
  `incomplete` y el gate lo informa como `violations: 0`. Mecanismo: `pnpm auth-server:verify-contrast`.
- **El JS del navegador es artefacto generado con drift guard y se sirve por nonce**, y la forma
  canónica de servir la página **exige el nonce en su tipo de entrada**: sin eso el navegador lo
  bloquea en silencio y el control queda pintado y muerto.
- **Ninguna pantalla es un callejón sin salida**; las terminales se declaran con su razón.
- **NUNCA** se retira una credencial por SQL ni desde la UI sin command con audit.
- **NUNCA** se ofrece el alta dentro de `/oauth/authorize` ni del step-up.

## Normative Docs

- `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md` (flujo maestro; esta task agrega su nodo)
- `docs/tasks/in-progress/TASK-1830-efeonce-auth-external-person-authentication.md` (contratos de passkey/sesión)
- `docs/tasks/in-progress/TASK-1835-efeonce-id-login-consent-screens.md` (shell, primitives y mecanismos de verificación)
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`

## Dependencies & Impact

### Depends on

- `TASK-1830`: `/auth/passkeys/{register,authenticate}/*`, `GET /auth/passkeys`, sesión `__Host-efeonce_auth`.
- `TASK-1835`: shell, primitives, `styles.generated.ts`, harness `pnpm auth-server:dev-ui`,
  `pnpm auth-server:verify-contrast`, `pnpm auth-server:verify-passkey`.

### Blocks / Impacts

- `TASK-1841` (U16, primer piloto cliente): sin esta superficie la persona depende del correo en cada entrada.
- `TASK-1838` (consola del administrador del cliente): comparte el área autenticada del emisor; **acordar el shell del área antes de que la segunda empiece**.
- `TASK-1832`: **no la bloquea** — su canary ya ejercita la ceremonia real en Chrome.

### Files owned

- `src/views/greenhouse/my/MyProfileView.tsx` (sección «Cómo entras» — lado Greenhouse)
- `src/lib/copy/` del lado Greenhouse para esa sección (dominio `my`), separado del copy del emisor
- `src/lib/auth-server/persons/pages.ts` (extender) y su controlador de navegador nuevo + artefacto generado
- `src/lib/auth-server/persons/routes.ts` (ruta y command de retiro)
- `src/lib/copy/auth-server.ts` (ids `credentials_*`) + módulo derivado para el navegador
- `scripts/auth-server/dev-ui-server.ts` (fixtures)
- `scripts/frontend/scenarios/task1842-*.scenario.ts`
- `docs/ui/{wireframes,flows,reviews}/TASK-1842-*`
- Gate de cobertura endpoint→consumidor `[verificar]` ubicación exacta al implementar

## Current Repo State

### Already exists — verificado 2026-09-06

- Endpoints de alta y listado, con tope, rate limit y contador anti-clonación (`persons/passkeys.ts`, `persons/routes.ts`).
- `scripts/auth-server/external-passkey-canary.ts` (TASK-1832, sin commitear al 2026-09-06): registro y login con passkey de plataforma real en Chrome persistente.
- Shell, primitives y los dos verificadores de TASK-1835.

### Gap

- Cero superficie: ningún HTML llama `register/*` ni `GET /auth/passkeys`.
- Sin command de retiro por credencial `[verificar]`; `revokePersonAuthState` es corte por admin.
- El flujo maestro no tiene nodo para esta pantalla.
- Nada impide que vuelva a nacer una capacidad del emisor sin superficie.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: **dos deployables**. La puerta en el app Next de Greenhouse (`src/views/greenhouse/my/**`, MUI/Composition Shell); la pantalla en `src/lib/auth-server/persons/**`, servida por `services/auth-server/**` (shell HTML propio, sin React). **Dos stacks de UI distintos en una sola task** — quien la tome no debe intentar compartir componentes entre ambos lados: comparten el recorrido, no el código
- Future candidate home: `worker`
- Boundary: la plantilla recibe DTOs ya resueltos; jamás lee store, KMS ni sesión
- Server/browser split: server-rendered; el único JS es el controlador WebAuthn generado y servido por nonce
- Build impact: ninguna dependencia nueva
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: persona de una organización cliente, ya autenticada, que quiere dejar de depender del correo.
- Momento del flujo: después de entrar por magic link; nunca en medio de una autorización.
- Resultado perceptible: tiene una forma de volver a entrar que no pasa por el correo, y puede quitarla.
- Fricción que reduce: un correo por cada entrada.
- No-goals UX: gestión de sesiones, consentimientos otorgados, cambio de correo, alta de TOTP (ya vive en el step-up).

### Surface & system decision

- Surface: sección en `/my/profile` (Greenhouse) → `GET /credentials` en `auth.efeonce.org` → vuelta a Greenhouse
- Nav placement (Greenhouse): dentro de `/my/profile`, ya alcanzable desde el avatar (`route-reachability-manifest.ts:497`); no agrega destino nuevo al sidebar
- Nav placement (emisor): se alcanza desde Greenhouse y desde la pantalla de sesión; no es un destino que se teclee
- Composition Shell: `no aplica` — shell HTML propio de TASK-1835
- Primitive decision: `reuse` (`.id-surface`, `.id-section`, `.id-organizations`, `.id-primary/.id-secondary`)
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog: la confirmación de retiro es inline, sin overlay
- Copy source: `src/lib/copy/auth-server.ts`
- Access impact: `none` — la sesión ya resuelta decide

### State inventory

Default (con credenciales) · Empty (ninguna; el alta es la acción principal) · Loading (ceremonia,
botón `aria-busy`) · Error (`failed` con reintento) · Degraded (`unsupported`, sin reintento) ·
Permission denied (sin sesión → login con 401) · Long content (tope de credenciales, nombres largos
truncados con `title`) · Mobile (fila → bloque apilado) · Keyboard (recorrido completo, foco inicial
en el título) · Reduced motion (significado idéntico).

### Interaction contract

Primaria «Agregar una passkey»; secundaria «Retirar» con confirmación que nombra el dispositivo y,
si es la última, advierte la vuelta al correo. Sin doble submit. Foco recuperado tras cada acción.
Mensajes por `role=alert` (errores) y `role=status` (confirmaciones), una sola región viva.

### Motion & microinteractions

- Motion primitive: `CSS`, heredado del shell. Sin motion propio → sin contrato de motion.
- Reduced-motion: los cambios de estado son inmediatos; el pending se comunica por texto y `aria-busy`.

### Implementation mapping

- Renderer nuevo en `persons/pages.ts` + controlador generado servido por nonce.
- Reader `GET /auth/passkeys`; commands `register/{start,finish}`; retiro `[verificar]`.
- API parity: el retiro nace como command canónico y la pantalla es un consumer más.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1842-credentials-empty.scenario.ts` y hermanos (uno por estado)
- Viewports: 1440×1000 y 390×844 · Quality profile: `premium`
- Fixtures en el harness: vacío, una, varias, tope, ceremonia fallida, retiro confirmado
- Markers: `id-shell`, `id-credentials`, `id-actions`, `id-status`
- Assertions: `scrollWidth === clientWidth`; ningún `credentialId` crudo en el DOM; el retiro nombra su dispositivo
- Review dossier: `pnpm fe:capture:review <capture-dir>` obligatorio

### Design decision log

- Decisión: dos superficies conectadas — puerta en `/my/profile` (Greenhouse, MUI/Composition Shell) y pantalla en `auth.efeonce.org/credentials` (shell HTML del emisor). Sin dirección visual nueva en ninguna de las dos.
- Descartado: llamar `/account/*` a la ruta del emisor. `TASK-1838` usa esa palabra para la ORGANIZACIÓN del cliente; la misma palabra para «tus llaves» y «tu empresa» confundió al operador en la primera lectura, que es exactamente lo que una pantalla de identidad no puede permitirse.
- Alternativas descartadas: colgar el alta del step-up (ata la configuración al peor momento) y meterla en la consola de TASK-1838 (esa es de la organización, ésta es de la persona).
- Reuse / extend / new: `reuse` de primitives; clase nueva sólo si se genera desde el SSOT.
- Riesgo abierto: composición del área compartida con `TASK-1838`.

### Visual verification

- GVC scenario: `task1842-credentials-empty` (raíz de la familia)
- Required captures: un estado por fixture × 2 viewports + teclado + reduced-motion
- Scroll-width check: en todas
- Accessibility/focus: orden de tabulación, foco inicial, `role=alert|status`, contraste por píxeles
- Visual scorecard: `docs/ui/reviews/TASK-1842-efeonce-id-person-credentials.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/fidelity/template resistance >= 4.5`

## Backend/Data Contract

- Source of truth: `greenhouse_auth.passkey_credentials` (TASK-1830)
- Contract surface: `GET /auth/passkeys` (existente) + command de retiro por credencial `[verificar]`
- Data invariants: una credencial pertenece a un solo `subject`; el retiro es **lógico** (`revokedAt`), nunca `DELETE`; el tope por persona se respeta en el alta
- Tenant/access boundary: la sesión `__Host-efeonce_auth` decide; una persona sólo ve y retira lo suyo
- Idempotency/concurrency: retirar dos veces la misma credencial es idempotente
- Sensitive data: **NUNCA** loggear ni renderizar `subject` crudo, challenges ni clave pública; el `credentialId` no sale al DOM
- Audit/signal: el retiro deja registro; evaluar señal de «persona sin ninguna credencial» `[verificar]`
- Runtime evidence: ejercicio real contra el emisor desplegado antes de cerrar

## Hybrid Execution Justification

- **Why not split**: la única pieza backend es un command de retiro por credencial que **puede no
  hacer falta** (`[verificar]` en Discovery: quizá ya exista). Abrir una task `backend-data` para un
  command que tal vez no se escribe, y que nadie más consume, cuesta más coordinación que valor —
  y dejaría la superficie bloqueada por una foundation vacía. Todo lo demás ya existe desde
  TASK-1830: alta y listado son endpoints vivos, y esta task es su primer consumer.
- **Primary execution profile**: `ui-ux`. La entrega es una pantalla; el backend es una arista.
- **Contract boundary**: la plantilla recibe DTOs resueltos y jamás toca store, KMS ni sesión. El
  retiro entra como command canónico en `src/lib/auth-server/persons/**` con audit, consumible por
  cualquier cliente (Full API Parity), no como handler acoplado al botón.
- **Risk controls**: el retiro es lógico (`revokedAt`), nunca `DELETE`; idempotente; una persona sólo
  alcanza lo suyo por la sesión ya resuelta; se ejercita contra el emisor desplegado antes de cerrar.
  Si Discovery encuentra que el command exige schema nuevo o toca autoridad, **se parte en dos** y
  esta task queda bloqueada por esa foundation.

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

### Slice 1 — La puerta en Greenhouse y la lectura en el emisor

Sección **«Cómo entras»** en `/my/profile` (`src/views/greenhouse/my/MyProfileView.tsx`): dice con qué
puede entrar la persona hoy y lleva al emisor. Se construye PRIMERO, porque una pantalla sin puerta es
una pantalla que nadie encuentra.

En el emisor: ruta `/credentials` bajo sesión, renderer server-side, lista desde `GET /auth/passkeys`,
estado vacío, retorno a Greenhouse, fixtures y capturas GVC de los estados de lectura.

### Slice 2 — Alta de la passkey

Controlador WebAuthn generado con drift guard y servido por nonce, CTA primario, los dos estados de
fallo diferenciados, tope alcanzado, y el caso sin JavaScript (la lista se ve, el CTA no).

### Slice 3 — Retiro y cierre

Command de retiro por credencial con audit `[verificar]`, confirmación que nombra el dispositivo y
advierte cuando es la última, nodo `S11` en el flujo maestro, scorecard, gates `ui:*` y el gate de
cobertura endpoint→consumidor.

## Out of Scope

- Gestión de sesiones y logout multiproducto (`TASK-1840`).
- Consola del administrador del cliente (`TASK-1838`).
- Alta de TOTP: ya vive en el step-up.
- Cambio de correo, perfil, o cualquier autoadministración más allá de las credenciales.
- Notificación por correo al agregar o quitar un passkey (follow-up declarado de `TASK-1830`).

## Detailed Spec

El wireframe y el flow declarados en `Status` son el contrato de diseño: layout, estados, copy ids,
recorridos y contrato con el backend. **Implementar desde ellos, nunca freehand.**

**El gate de cobertura** (Slice 3) es la pieza que impide la recurrencia. Precedente exacto en el
repo: `src/lib/entitlements/capability-grant-coverage.test.ts` (TASK-935) guarda la clase
«declarada y verificada pero nunca concedida → desplegada y muerta», y su auditoría encontró 13
casos. El análogo acá: **fallar cuando una ruta del emisor o un id de copy de `auth-server*` no tiene
ningún consumidor y no está declarada como sólo-API**. Al 2026-09-06 el barrido encontró seis
capacidades de esa clase en EPIC-044.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → 2 → 3. El alta no se construye antes de que la lectura esté capturada: sin la lista, el
alta no tiene dónde mostrar su resultado. `UI ready: yes` sólo al cerrar Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El controlador se sirve sin nonce y queda muerto en silencio | identity / UI | medium | El nonce es campo obligatorio del tipo de entrada (patrón `renderLoginPageResponse`); test de CSP por página | test de CSP rojo |
| Clase de texto compartida entre lienzo y tarjeta rompe contraste | UI / a11y | medium | `pnpm auth-server:verify-contrast` sobre píxeles; ya atrapó 1.53:1 y 3.28:1 | gate rojo |
| El retiro deja a la persona sin ninguna forma de entrar | identity | medium | La confirmación advierte cuando es la última; el correo sigue disponible siempre | señal de persona sin credenciales `[verificar]` |
| Colisión de composición con `TASK-1838` en el área autenticada del emisor | UI | medium | Acordar el shell del área antes de Slice 1 | revisión cruzada |
| La pantalla del emisor se construye sin la puerta y queda inalcanzable | UI | **high** | La puerta es Slice 1 y criterio de aceptación, no un detalle; `pnpm route-reachability-gate` cubre el lado Greenhouse | la pantalla existe y nadie la usa |
| `credentialId` expuesto en el DOM | identity | low | Assertion de captura + revisión | GVC rojo |

### Feature flags / cutover

Sin flag propio: la superficie viaja con el runtime y sólo es alcanzable con sesión.
**Advertencia operativa:** el push a `develop` que toque `src/lib/**` despliega el Cloud Run ÚNICO
que sirve `auth.efeonce.org` en vivo — el push ES el despliegue.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; la ruta desaparece, sin datos tocados | < 15 min | sí |
| Slice 2 | revert PR; las credenciales creadas siguen siendo válidas para login | < 15 min | sí |
| Slice 3 | revert PR; el retiro vuelve a ser sólo por admin | < 15 min | sí |

### Production verification sequence

1. Local: harness + GVC premium + `verify-contrast` + `verify-passkey` + scorecard.
2. Staging/emisor: alta real con una passkey de plataforma en Chrome y en Safari/WebKit; listado y retiro reales; la credencial retirada deja de autenticar.
3. Producción: con el release del runtime; verificación con la persona canary de `TASK-1832` antes de cualquier persona real.

### Out-of-band coordination required

- Acuerdo de composición del área autenticada del emisor con `TASK-1838`.
- Coordinación con `TASK-1832` para no pisar su canary de passkey mientras corre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] **La persona llega sin escribir ninguna dirección a mano**: desde `/my/profile` en Greenhouse ve «Cómo entras», llega a la pantalla del emisor y vuelve. Verificado en el recorrido completo, no por partes.
- [ ] Una persona con sesión puede crear su primera passkey desde `/credentials` y volver a entrar con ella sin recibir ningún correo, verificado en Chrome **y** en Safari/WebKit contra el emisor desplegado.
- [ ] `pnpm route-reachability-gate` en verde con la sección nueva de Greenhouse.
- [ ] La lista muestra nombre, tipo, alta y último uso de cada credencial, y ningún `credentialId` crudo aparece en el DOM.
- [ ] El retiro pasa por un command con audit; retirar dos veces es idempotente; la fila desaparece y la credencial deja de autenticar.
- [ ] La confirmación de retiro nombra el dispositivo, y cuando es la última advierte que se vuelve a depender del correo.
- [ ] Los dos fallos de la ceremonia están diferenciados: `unsupported` retira el CTA y no ofrece reintento; `failed` lo conserva.
- [ ] Sin JavaScript la lista se ve y el CTA de alta no se renderiza.
- [ ] Copy visible únicamente desde `src/lib/copy/auth-server.ts`, validado con `greenhouse-ux-writing`; lo que viaje al navegador se **deriva**, no se transcribe.
- [ ] `pnpm auth-server:verify-contrast` y `pnpm auth-server:verify-passkey` en verde con la superficie nueva incluida.
- [ ] GVC premium desktop 1440 + móvil 390 capturado y **mirado** para cada estado; dossier revisado; sin scroll horizontal.
- [ ] Scorecard con promedio ≥ 4.5, piso ≥ 4 y ≥ 4.5 en jerarquía, economía de superficies, impacto visual, fidelidad y resistencia a template.
- [ ] `pnpm design-contract:lint`, `pnpm ui:code-lint --changed`, `pnpm ui:visual-gate` y `pnpm ui:quality` en verde para `TASK-1842`.
- [ ] `UI ready` pasa a `yes` sólo con mapping, GVC scenario plan y decision log completos, y `pnpm task:lint --task TASK-1842` sin findings.
- [ ] El flujo maestro de `EPIC-044` incorpora el nodo `S11 · Credenciales de la persona` con su dueño.
- [ ] El gate de cobertura endpoint→consumidor falla ante una ruta del emisor o un id de copy sin consumidor y sin exclusión declarada, y se lo ve **encenderse** con un caso real, no sólo pasar.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm vitest run src/lib/auth-server`
- `pnpm auth-server:dev-ui` + `AGENT_AUTH_BASE_URL=http://127.0.0.1:19036 pnpm fe:capture task1842-<fixture> --env=local`
- `pnpm auth-server:verify-contrast` · `pnpm auth-server:verify-passkey`
- `pnpm design-contract:lint --task TASK-1842` · `pnpm ui:code-lint --changed` · `pnpm ui:visual-gate --task TASK-1842` · `pnpm ui:quality --task TASK-1842`
- `pnpm task:lint --task TASK-1842`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si hubo aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` actualizado si cambió comportamiento visible
- [ ] chequeo de impacto cruzado (`TASK-1838`, `TASK-1840`, `TASK-1841`)
- [ ] flujo maestro de `EPIC-044` y `PATTERNS.md` actualizados

## Follow-ups

- Notificación por correo al agregar o quitar un passkey (declarado como follow-up de `TASK-1830`).
- Reconciliación completa del inventario S0–S10 contra lo que el backend expone: esta task cierra una
  de las seis capacidades sin superficie que encontró el barrido del 2026-09-06; las otras
  (listado de consentimientos por la persona, UI de logout multiproducto) siguen sin dueño.

## Open Questions

- ¿Existe un command de retiro por credencial o hay que construirlo? `revokePersonAuthState` es corte
  de emergencia por admin, no autoservicio. **Resolver en Discovery antes de Slice 3.**
- ¿El área autenticada del emisor la compone esta task o `TASK-1838`? La primera que llegue define el shell del
  área; hay que acordarlo, no descubrirlo al segundo intento.
