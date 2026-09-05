# TASK-1835 — Efeonce ID: login, consentimiento y recuperación Motion Contract

## Delta 2026-09-05 — dirección aprobada «Nocturno editorial» (implementada)

El operador eligió la dirección **A · Nocturno editorial** entre tres exploradas en un lienzo de
diseño, y ya está en el producto (`802b5b869`, `501f54b52`, `300d3c5cf`). Lo que cambia respecto de
lo escrito arriba, que describía la tarjeta centrada sobre fondo claro:

- **Composición del login.** El lienzo ENTERO es el campo de marca —degradado radial sobre la rampa
  azul de AXIS más un grano de 1px— y la tarjeta clara flota encima. Desde 64rem se abre en dos: el
  panel de marca a la izquierda con el logotipo institucional en negativo, kicker, titular con
  palabra acentuada y línea de confianza; el formulario a la derecha. Bajo 64rem el panel se retira
  y queda el campo con la tarjeta y la marca arriba.
- **El formulario va PRIMERO en el DOM**; el orden visual lo pone CSS, para que el foco y los
  lectores de pantalla lleguen antes al campo que al mensaje de marca.
- **Sólo el login cambia de composición.** Consentimiento, verificación, step-up y error conservan la
  columna centrada: son decisiones puntuales, no una bienvenida.
- **El campo de marca se fija en claro y oscuro.** La tarjeta re-declara los tokens claros en su
  subárbol; el resto de las pantallas conserva el sistema claro/oscuro con los neutrales de AXIS.

- **Transiciones de control.** 150 ms con curva desacelerada `cubic-bezier(.2,0,0,1)` sobre
  `background-color`, `border-color` y `box-shadow`. Nada de transform ni de entradas escenificadas:
  la pantalla se sirve completa desde el servidor.
- **Estados agregados** (antes no existían): `:disabled` / `[aria-disabled]`, `button[aria-busy]`,
  `::placeholder` tokenizado, `input:disabled` y la neutralización del autocompletado de Chrome.
  El hover del secundario dejó el overlay casi invisible y se apoya en el acento.
- `prefers-reduced-motion: reduce` sigue apagando toda animación y transición.


## Meta

- Status: `draft`
- Owner task: TASK-1835
- Related wireframe: docs/ui/wireframes/TASK-1835-efeonce-id-login-consent-screens.md
- Related flow: docs/ui/flows/TASK-1835-efeonce-id-login-consent-screens-flow.md
- Motion primitive: `CSS` (sin GSAP/Framer/Lottie: el runtime no ejecuta JS salvo WebAuthn)
- Token source: duraciones y easing del SSOT de motion del portal exportados a `styles.generated.ts`; ningún valor literal en las plantillas.

## Motion Brief

El motion de Efeonce ID es de **confianza y ritmo**, no de espectáculo: una entrada sutil de la
tarjeta para asentar la página, feedback inmediato al enviar, y ningún elemento que se mueva
mientras la persona lee permisos o escribe un código. Todo lo demás es navegación server-side sin
transiciones. Cualquier motion que retrase la decisión, o que comunique estado sólo por
animación, está prohibido.

## Motion Inventory

| Elemento | Motion | Trigger | Duración / easing (token) | Reduced motion |
|---|---|---|---|---|
| Tarjeta (`IdCard`) | Entrada estática por defecto; opacidad sólo si la revisión la justifica | Carga de página | `motionCss.duration.short` / `motionCss.ease.standard` | Sin transición |
| Botón primario | Pending: cambio de copy + `aria-busy` + atenuación por token | Submit | `motionCss.duration.instant` | Inmediato (igual) |
| Anillo de foco | Aparece sin transición | Foco por teclado | — | — |
| `IdStatus` inline | Aparece en su lugar (sin deslizar) | Error/confirmación | `motionCss.duration.short` opacidad | Inmediato |
| Contador de reintento (`slow_down`, «Pedir un enlace nuevo» tras 60 s) | Texto que cambia | Tiempo | sin animación | — |

## Microinteraction States

- Hover: botones y enlaces cambian de color por token; sin escala ni sombra creciente.
- Focus: anillo de 2 px por token, visible en todos los fondos; sin animación de aparición.
- Active: botón primario baja un tono por token durante la pulsación.
- Pending: copy «Confirmando…»/«Enviando…»/«Verificando…» + `aria-busy=true` + botones deshabilitados; sin spinner obligatorio (si hay indicador, es decorativo y se oculta con reduced motion).
- Error inline: aparece bajo el campo sin truncar ni limitar la cantidad de líneas; el campo conserva su valor.

## Transition Specs

- Entre pantallas: navegación server-side (302/303) sin transición de vista; no se usa View Transitions API.
- Cambio de método de login: nueva página; sin morph.
- Consent → aplicación: redirect inmediato; no hay pantalla de «éxito» intermedia (la certeza la da la aplicación cliente).

## Primitive & Token Mapping

| Token de motion (SSOT) | Uso | Valor literal prohibido |
|---|---|---|
| `motionCss.duration.instant` | pending, foco | `0ms`/`50ms` en CSS de plantilla |
| `motionCss.duration.short` | entrada de tarjeta, estados inline | `160ms` escrito a mano |
| `motionCss.ease.standard` | todas las transiciones | `cubic-bezier(...)` literal |

Los nombres exactos se resuelven en el lookup de tokens de Slice 1 (`src/components/greenhouse/motion/core/tokens.ts` y el
contrato de motion de la UI Platform, `docs/architecture/ui-platform/MOTION.md`); si el SSOT no
expone un token de motion runtime-agnóstico, se agrega ahí primero y el generador lo exporta.

## Reduced Motion Contract

- `@media (prefers-reduced-motion: reduce)`: entrada de la tarjeta y opacidad de `IdStatus` sin transición; pending sólo por texto y `aria-busy`.
- Ningún estado depende de la animación para entenderse: todo estado tiene texto.
- Evidencia: capturas GVC con la preferencia activada para las 11 fixtures.

## Accessibility & Feedback

- Regiones vivas (`role=alert|status`) reciben el texto sin animación de entrada que retrase el anuncio.
- El foco no se mueve por animación: los cambios de foco son inmediatos y documentados en el flow.
- Contraste durante hover/active/disabled ≥ 4.5:1 (disabled con texto legible + `aria-disabled`).

## Performance Guardrails

- CSS generado ≤ 12 KB inline por página; sin `@import`, sin fuentes de terceros por defecto.
- Sólo propiedades compositables (`opacity`, `transform`) en transiciones; nada de `height`/`top`.
- Sin JS de motion; el único script (WebAuthn, TASK-1830) no anima.

## GVC / Micro Evidence

- Capturas de `consent` y `login` en 1440 y 390 con la entrada completada, en pending y con reduced motion.
- Frame de foco por teclado en «Permitir», «Cancelar», campo de correo y campo de código.
- Assert: ningún elemento con `transition` sobre propiedades no compositables; ningún `transition` bajo reduced motion.

## Design Decision Log

- Decision: motion mínimo, sólo CSS, tokens del SSOT, reduced-motion como estado de primera clase.
- Alternatives considered: animación de «éxito» al conceder (rechazada: no hay pantalla de éxito, el redirect es inmediato); spinner obligatorio en pending (rechazado: texto + `aria-busy` es más robusto y accesible).
- Why this pattern: una superficie de identidad debe sentirse estable; el motion sólo asienta y confirma.
- Reuse / extend / new primitive: tokens existentes del SSOT; sin primitive de motion nueva.
- Open risks: generación de aliases CSS desde `motionCss` sin importar React/MUI en runtime.
- Follow-up: lookup de tokens en Slice 1.

## Acceptance Checklist

- [ ] Ninguna duración/easing literal en `src/lib/auth-server/oauth/pages/**`.
- [ ] Reduced motion verificado en GVC para todas las fixtures.
- [ ] Pending comunicado por texto + `aria-busy` en cada formulario.
