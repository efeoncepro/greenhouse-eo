# TASK-2083 — Rooms: página «el acceso se detuvo»

Diseño de implementación escrito el 2026-10-31 desde el código en `efeonce-rooms`, rama
`claude/rooms-durable-internal-access` (sin push). No hay artboard propio en el canvas aprobado: la página pertenece a
la familia de la invitación «Entra.» (TASK-2068) y del artboard `Estados` («Estados · carga, error y acceso») del canvas
«Efeonce Rooms — UI» (`https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d`). Aprobada por el operador el 2026-10-31 («Ok») tras la corrección de pesos del titular: `UI ready: yes`.

## Problema

El 2026-10-31 el primer login real del dueño terminó en `identity_unbound` y el navegador mostró JSON crudo:
`{"error":{"code":"identity_unbound","message":"…"}}`. Una persona que vuelve de Efeonce ID no debe ver un objeto de
API: debe saber qué pasó, si es culpa suya o nuestra, y qué hacer.

## Visual Direction Contract

- Visual direction mode: source-led
- Product Design asset: `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`
- Línea gráfica: «La órbita» (skill `efeonce-graphic-line`), canon «Titulares largos en Bricolage: contraste de pesos».
- Source durable: escena oscura de la invitación (`InvitationStage`), primitivas de TASK-2079 `Orbit` y `DepthLayers`.
- Diferencia deliberada: la órbita va como **anillo sin esfera** (`measure={{ value: 0, total: 1 }}`). La esfera es la
  llegada; aquí todavía no ocurre. Así la página dice «aún no» con la misma forma que en la sala dice «llegaste».
- Quality profile: `premium`.

## Rutas y superficies

| Ruta | Qué muestra | Quién llega |
|---|---|---|
| `/auth/error?reason=<código>&ref=<uuid>` | `AccessIssueStage` | Redirección 303 desde `/login` o `/auth/callback` cuando falla y el navegador no pidió sólo JSON |

Sólo se leen `reason` (lista cerrada `ACCESS_ISSUE_REASONS` en `src/domain/auth-contracts.ts`; otro valor se muestra
como `unavailable`) y `ref` (UUID; si no lo es, no se muestra referencia). Nada más del query llega a la página. La
página es terminal: no redirige sola a ningún lado, así no hay bucles con el callback.

## Composición (escritorio, 1440 × 900)

Escena de `100dvh` sobre `--room-ground` con `DepthLayers` (parallax órbita ± 7 px, texto ± 14 px; apagado en táctil y
movimiento reducido) y grano fijo. Filas: encabezado, cuerpo y pie.

1. **Encabezado** (relleno 36/80): lockup `rooms-lockup-white.svg` 211 × 24 a la izquierda; ojal «Acceso a Rooms» a
   la derecha (Poppins 12, 0,14 em, mayúsculas, atenuado).
2. **Cuerpo** en dos columnas (`1fr` + hasta 520 px, separación 64, máximo 1280 centrado):
   - **Izquierda — el gesto**: anillo sin esfera de radio 230 alrededor de una palabra en Bricolage 760 de 168 px
     (−0,05 em) con el punto en teal: «Casi.», «Otra vez.», «Pausa.», «Espera.» o «Aún no.» según el motivo. Es
     decorativa (`aria-hidden`).
   - **Derecha — lo que pasó**: `h1` con el título del motivo en **dos pesos** (Bricolage 40 px, `text-wrap: balance`):
     la parte que introduce en `--room-weight-light` (340) y la idea principal en `--room-weight-bold` (740), mismo
     tamaño y color (canon «Titulares largos en Bricolage: contraste de pesos»; revisión del operador 2026-10-31:
     «Bricolaje en párrafos es muy denso… debe jugar con sus contrastes en pesos»). «Efeonce ID» va con espacio duro. Párrafo
     con qué hacer (Poppins 16, interlineado 1,6, hasta 52 ch, atenuado), acciones y, abajo, la referencia.
3. **Referencia** (sobre una regla `--room-line-dark`): ojal «Referencia», código corto en Bricolage 28 tabular
   (`XXXX-XXXX`, los ocho primeros del UUID en mayúsculas), botón fantasma «Copiar referencia» (copia el UUID entero)
   y «Si pides ayuda, comparte esta referencia.».
4. **Pie** (relleno 0/80/36): «¿Sigues sin poder entrar? Escríbele a quien te dio acceso a Rooms.».

## Desktop Target

1440 × 900 y 1280 × 800: dos columnas; el texto nunca cruza el anillo (el anillo vive en su propia columna).

## Mobile Target

- ≤ 1180 px: una columna centrada; palabra 132 px; anillo de radio 230 en un héroe de 420 px de alto.
- ≤ 600 px (390 × 844): palabra 76 px, anillo de radio 128 (`useCompactViewport`), héroe de 300 px, título 28 px,
  párrafo 15 px, código 24 px, rellenos de 16 px; el ojal del encabezado se oculta. Sin scroll horizontal.

## Action Hierarchy

| Motivo | Palabra | Acción principal | Por qué |
|---|---|---|---|
| `identity_unbound` | Casi. | «Volver a entrar» (contorno) | Necesita que alguien le dé acceso primero; volver a entrar sirve después |
| `invalid_transaction`, `invalid_identity`, `invalid_request`, `forbidden` | Otra vez. | «Volver a entrar» (sólida, flecha) | Empezar de nuevo lo resuelve |
| `unavailable` | Espera. | «Reintentar» (sólida, flecha) | Fallo nuestro y transitorio |
| `rate_limited` | Pausa. | «Volver a entrar» (contorno) | Hay que esperar cinco minutos |
| `disabled`, `configuration` | Aún no. | ninguna | Volver a entrar no lo arregla |

«Volver a entrar» y «Reintentar» llevan a `/login?returnTo=/rooms` (navegación de documento, no router).

## Visual Fidelity Mapping

| Elemento | Fuente en código | Regla |
|---|---|---|
| Fondo, halo, teal, papel, atenuado | Tokens de `src/styles/theme.ts` (`--room-ground`, `--room-halo`, `--room-teal`, `--room-paper`, `--room-muted-dark`, `--room-line-dark`) | Ningún hex en el componente ni en `access-issue.css` |
| Anillo sin esfera | `Orbit` de TASK-2079 con `measure={{ value: 0, total: 1 }}`, radio 230 (128 en compacto) | Se dibuja una vez; sin esfera porque la llegada no ocurrió; nunca indica espera |
| Profundidad | `DepthLayers` (+ su `Grain`) | Parallax sólo con puntero fino y sin movimiento reducido |
| Palabra («Casi.», «Otra vez.»…) | `--room-font-display` (Bricolage 760, 168 px; 132 y 76 en anchos menores), `span` decorativo | El punto en `--room-teal`; no se parte en pesos (respuesta corta) |
| Titular `h1` | Bricolage 40 px (28 en móvil): `lead` en `--room-weight-light`, `key` en `--room-weight-bold` | Mismo tamaño y color; `text-wrap: balance`; «Efeonce ID» con espacio duro |
| Cuerpo, ayuda, pie | `--room-font-body` (Poppins 16/13 px) | Cuerpo hasta 52 ch, atenuado |
| Código de solicitud / referencia | Bricolage 700, 28 px, `tabular-nums` | Formato `XXXX-XXXX`; la referencia muestra 8 caracteres del UUID |
| Botones | `Button` de `@efeoncepro/axis-ui-primitives/react`, `line="growth" surface="dark"` | Sólido con flecha cuando volver a entrar resuelve; contorno cuando es secundario; fantasma para copiar |
| Lockup | `/brand/rooms-lockup-white.svg` de `@efeoncepro/axis-brand-assets` | 211 × 24; nunca animado |

## Copy Ledger

Todo en `ACCESS_ISSUE_COPY` de `src/lib/copy/rooms.ts` (es-CL neutro, tuteo, sin voseo). Cada motivo tiene `word`,
`title` (`{ lead, key }`: introducción liviana e idea principal) y `body`; comunes: `eyebrow`, `reference`, `referenceHelp`, `copy`, `copied`, `login`, `retry`, `footer`,
`skip`. El título distingue culpa: «No pudimos…» cuando es nuestro, «Este intento…venció» cuando es el tiempo, y en
`identity_unbound` deja claro que la identidad sí se verificó y falta el acceso de Rooms.

## State Copy

| Estado | Copy visible | Comportamiento y recuperación |
|---|---|---|
| ready | `identity_unbound` con código: «Casi.», «Entraste con Efeonce ID, pero Rooms todavía no te reconoce.», el cuerpo con pedir acceso, «Volver a entrar», «Código de solicitud» `XXXX-XXXX`, «Copiar código» y «Compártelo con quien administra Rooms en Efeonce…» | La persona copia el código y se lo pasa a un administrador; cuando le confirman, «Volver a entrar» lleva a `/login?returnTo=/rooms` y entra |
| loading | Sin estado de carga propio: la página se renderiza en el servidor con sólo `reason`, `ref` y `code` | Si el navegador tarda, se ve el fondo y el anillo dibujándose; no hay datos que esperar |
| empty | Sin `ref` ni `code` válidos (por ejemplo `disabled` desde `/login`): no se muestra el bloque de referencia; el pie «¿Sigues sin poder entrar? Escríbele a quien te dio acceso a Rooms.» queda | El motivo y su acción bastan; nada queda vacío ni con guiones |
| partial | `identity_unbound` sin código (tope de 200 solicitudes por hora): el bloque muestra «Referencia» con 8 caracteres del UUID y «Si pides ayuda, comparte esta referencia.» | El administrador busca la referencia en los logs (`rooms.auth.browser_error`) y puede dar acceso por identidad explícita |
| error | `unavailable`: «Espera.», «No pudimos verificar tu acceso ahora.», «Es un problema de nuestro lado…» y «Reintentar». `configuration`: «Aún no.» sin botón | «Reintentar» vuelve a `/login`; en configuración, la referencia es lo que sirve para soporte |
| denied | `identity_unbound` es el estado denegado principal (ver ready). `invalid_transaction`, `invalid_identity`, `invalid_request` y `forbidden`: «Otra vez.» y «Volver a entrar». `rate_limited`: «Pausa.», «Hiciste varios intentos seguidos.», «Por seguridad, espera cinco minutos…» y «Volver a entrar» en contorno | Nunca se revela si un correo o una persona existen; un motivo desconocido se muestra como `unavailable` |
| Copiado | El botón cambia a «Código copiado» o «Referencia copiada» y se anuncia en `role="status"` | Si el portapapeles falla, el botón no cambia y el código sigue visible para copiarlo a mano |

## Accessibility Contract

- `h1` es el título del motivo; la palabra grande y la órbita son `aria-hidden`.
- Enlace «Saltar al contenido» a `#main-content` (`tabIndex=-1`).
- Botones AXIS con foco visible sobre oscuro; objetivos ≥ 24 px.
- La confirmación de copia se anuncia en `role="status"`.
- `prefers-reduced-motion`: sin entrada de la palabra ni del cuerpo; la órbita usa su propio fallback.
- `robots: noindex, nofollow` y `referrer: no-referrer`.

## Implementation Mapping

| Pieza | Archivo |
|---|---|
| Lista de motivos y validación de la referencia | `src/domain/auth-contracts.ts` (`ACCESS_ISSUE_REASONS`, `accessIssueReason`, `accessIssueReference`) |
| Redirección desde login/callback (navegador) y JSON para clientes que piden sólo JSON | `src/server/auth/http.ts` (`wantsPage`) y `src/server/auth/root-runtime.ts` |
| Registro buscable de la referencia | `console.warn` estructurado `rooms.auth.browser_error` con `target`, `code` y `correlationId`, sin datos de entrada |
| Página | `src/app/auth/error/page.tsx` |
| Escena | `src/components/access-issue-stage.tsx` |
| Estilos | `src/styles/access-issue.css` (tokens de `theme.ts`) |
| Copy | `src/lib/copy/rooms.ts` → `ACCESS_ISSUE_COPY` |

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/rooms-access-issue.scenario.ts` (Greenhouse).
- Ruta: `/auth/error?reason=identity_unbound&ref=7b6ef4e7-a936-4ec6-84ac-9865732e40d3&code=K7M29QXA`; anónima, sin datos reales.
- Quality profile: premium
- Viewports: desktop 1440 × 900, laptop 1280 × 800 y mobile 390 × 844.
- Required captures: `identity-unbound` y la sonda de teclado `keyboard-login-then-copy` por viewport.
- Required `data-capture` markers: `access-issue` y `access-issue-reference`.
- Assertions: `h1` visible, bloque de referencia visible, sin error boundary; accesibilidad, objetivos ≥ 24 px y runtime sin errores.
- Scroll-width checks: `scrollWidth <= clientWidth` en los tres anchos (layout del perfil premium); verificado sin scroll horizontal.
- Reduced-motion / focus evidence: `reducedMotionCheck` y sonda Tab de «Volver a entrar» a «Copiar código» con anillo visible.
- Comando: `AGENT_AUTH_BASE_URL=<origen local de Rooms> pnpm fe:capture rooms-access-issue --env=local`. Contra un `next start` del build; el `next dev` ajeno puede servir copy viejo tras un cambio de rama.
- Review dossier: `.captures/2026-10-31T16-33-22_rooms-access-issue/index.html` (local, no versionado); aprobación del operador en el chat del 2026-10-31.
- Baseline decision / surface ID: `rooms.access-issue`; la captura aprobada del 2026-10-31 es la referencia, sin baseline de píxeles.

## Design Decision Log

- 2026-10-31 — Revisión del operador: «Bricolaje en párrafos es muy denso, debe sí o sí jugar con sus contrastes en
  pesos». El titular se parte en introducción liviana e idea principal en negrita, sin cambiar copy ni tamaño.
- 2026-10-31 — Aprobada («Ok») sobre la captura con el contraste de pesos.

- **Decisión:** escena oscura de la familia de la invitación, anillo sin esfera, una palabra y el motivo a la derecha.
- **Alternativas:** reutilizar `StateSurface` (claro, pensado para 404/500 dentro del producto; no distingue motivos)
  o `AccessState` (sólo título y un botón a `/login`, que en `identity_unbound` haría un bucle inútil).
- **Por qué:** la persona viene de Efeonce ID y entra a Rooms por primera vez; la escena debe ser la misma puerta que
  la invitación, y el motivo cambia la acción correcta.
- **Reuse / extend / new:** reusa `Orbit`, `DepthLayers` y `Button` AXIS; componente nuevo de página, sin primitive
  nueva.
- **Riesgos abiertos:** la referencia hoy es el `correlationId` (sólo útil si se buscan los logs del runtime). Con
  TASK-2082 la referencia de `identity_unbound` pasa a ser el código de la solicitud de acceso.
