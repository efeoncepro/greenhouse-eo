# TASK-2064 — Dirección visual source-led V4

- Visual direction mode: source-led
- Product Design asset: `docs/ui/visual-directions/TASK-2064-efeonce-id-login-v4-rooms.md`

## Product Design Source

Mode: `source-led`. Fuente durable: `docs/ui/wireframes/TASK-1964-login-v4-premium-access.md`, implementación `src/views/Login.tsx` y `src/views/login/`. Canvas aprobado 2026-10-02 `29ef89d6-a399-4c9e-bea4-0ff71cdebeaf`, LoginV4/MobileV4/AccessMotion. Julio eligió expresamente esta dirección el 2026-10-25 para Auth con Rooms primero. No se requiere nueva ronda de alternativas.

## Desktop Target

1440×960: formulario papel en panel 440–620px, máximo contenido 380px; Efeonce centrado y contexto de entrada. Escenario foto lateral con radio y aire del V4. Métodos reales, sin contraseña ni Google inexistentes.

## Mobile Target

390×844: logo, título, métodos/correo y acción antes de escenario; fotografía como tarjeta debajo. Sin scroll horizontal. No comprimir desktop.

## Action Hierarchy

Efeonce principal. Entra a Rooms sólo con RP validado; neutral Entra a Efeonce. Passkey y Microsoft disponibles, correo siempre como recuperación real. Enlace de retorno sólo servidor confiable.

## Visual Fidelity Mapping

Papel/navy/acento y geometría desde efeonceGraphicLine; radios/espaciado del adapter tokenizado. WOFF2 exactos de src/assets/fonts/web, fotografía aprobada de public/images/login. Logo SVG oficial positivo. Sin efectos decorativos nuevos.

## Decision Log

Se descarta mantener Nocturno para login por pedido explícito. Se descarta importar JSX/MUI/Next por frontera runtime. Consent/step-up conservan su shell hasta unidad propia; no cambia la semántica de consentimiento.

## Implementation Mapping


- Route / surface: `src/lib/auth-server/persons/pages.ts`, `/login`.
- Primitive / variant / kind: HTML Efeonce ID / login-v4 / first-party-neutral-or-rooms.
- Component candidates: renderer login-v4, assets allowlisted, CSS generado y controller nonce.
- Copy source: `src/lib/copy/auth-server-login-v4.ts`.
- Data reader / command: sesiones y comandos existentes; contexto RP del backend TASK-1834.
- API parity: mismos endpoints de passkey y magic link, sin nueva lógica de negocio.
- Access / capability: autenticación no concede acceso Rooms; callback consumidor mantiene autorización.
- States to implement: neutral, Rooms, error, sin Microsoft, sin JS, reduced motion y foto sin novedades.


## GVC Scenario Plan


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


## Design Decision Log


- Decision: adoptar V4 elegida expresamente por Julio el 2026-10-25, Rooms primero.
- Alternatives considered: conservar Nocturno editorial o incrustar Next/MUI; descartadas por dirección explícita y frontera runtime.
- Why this pattern: misma identidad visual con adapter seguro del issuer.
- Reuse / extend / new primitive: extender renderer existente; fuentes y fotos oficiales, sin nueva familia de componentes.
- Open risks: CSP de imágenes, tipografía exacta, retorno contextual y no romper consentimiento.


## State Inventory


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


## Copy Ledger

Copy UI en src/lib/copy/auth-server-login-v4.ts; métodos y resultados existentes en auth-server.ts/auth-server-login.ts. «Entra a Efeonce», «Entra a Rooms» y «Identidad protegida por Efeonce ID» separan marca, destino e identidad. Los métodos no implementados no se muestran.

## State Copy

| State | Copy y recuperación |
|---|---|
| ready | «Entra a Efeonce» o «Entra a Rooms»; elegir Microsoft/passkey/correo disponible |
| loading | «Validando tu llave de acceso…» del controller; esperar o cancelar ceremonia nativa |
| empty | Sin novedades: fotografía sin texto ni pestañas; acceso sigue disponible |
| partial | WebAuthn no disponible: mensaje del dispositivo y enlace por correo disponible |
| error | Email inválido o ceremonia cancelada: mensaje asociado y reintento/correo |
| denied | Acceso revocado: renderer existente ofrece volver al inicio; no filtra datos |

## Accessibility Contract

Un h1, labels persistentes, correo con autocomplete username, estados aria-live polite; foco visible sin depender del color. Formulario antes de escenario en DOM. Fotografía con alt; SVG decorativo oculto cuando procede. Carrusel con control de pausa, sin avance en reduced motion. Contraste se mide sobre píxeles además de axe; teclado y JS ausente conservan correo.
