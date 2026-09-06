# TASK-1842 — Wireframe: credenciales de la persona en Efeonce ID

> **Dirección visual:** «Nocturno editorial», aprobada por el operador el 2026-09-05 y ya implementada.
> Esta superficie **no abre una dirección nueva**: reutiliza el shell del emisor y sus primitives.

- Product Design asset: docs/ui/visual-directions/TASK-1835-efeonce-id-direction.md — dirección «Nocturno editorial», aprobada 2026-09-05. Evidencia de partida: las 29 fixtures capturadas de TASK-1835 (`scripts/frontend/scenarios/task1835-runtime-*.scenario.ts`), en particular el alta del segundo factor (`task1835-runtime-enroll-secrets`), que es la pantalla más parecida a la que se construye acá.
- Visual direction mode: `repo-native-benchmark`

## Por qué esta pantalla existe

El backend está completo desde 2026-09-04 (`POST /auth/passkeys/register/{start,finish}`,
`GET /auth/passkeys`, tope por persona, rate limit, contador anti-clonación) y el botón «Entrar con
mi passkey» vive en `/login` desde TASK-1835. Lo que falta es **la pantalla donde una persona crea la
credencial**.

**No es un bloqueo de la certificación.** `scripts/auth-server/external-passkey-canary.ts`
(TASK-1832) ya ejecuta registro y login con una passkey de plataforma real en Chrome persistente,
dentro del origen real y sin CDP ni autenticador de software — la capacidad está probada. Ese runner
declara en su propia cabecera por qué existe así: *«el backend no tiene superficie de alta todavía
(follow-up de TASK-1835)»*, y arranca la sesión con un magic link de bootstrap. Es un guion, no una
pantalla.

Lo que bloquea es el **uso por una persona**: quien recibe una invitación no tiene ningún camino para
registrar su passkey, así que depende del correo en **cada** entrada, y el botón de `/login` no le
sirve nunca. Eso pesa sobre el primer piloto cliente (U16, `TASK-1841`) y sobre la promesa del
producto —«sin contraseñas»—, no sobre el canary.

## La puerta está en Greenhouse

**Dos superficies, un recorrido.** La pantalla vive en el emisor porque el dato no puede vivir en otro
lado: `/auth/passkeys/*` exige la cookie `__Host-efeonce_auth`, que por regla del navegador sólo
existe en `auth.efeonce.org`, y una passkey autentica a la **identidad** —sirve igual para Greenhouse,
Globe y el MCP—, no a un producto.

Pero la persona **no empieza ahí**. Empieza en `/my/profile` de Greenhouse, que ya existe, ya está
protegida por la vista `mi_ficha.mi_perfil` y ya es alcanzable desde el avatar
(`route-reachability-manifest.ts:497`). Ahí va una sección **«Cómo entras»**:

```
Mi perfil  ›  Cómo entras
  Correo          nombre@empresa.com        · siempre disponible
  Passkey         2 dispositivos             [ Gestionar ]  →  emisor
```

`Gestionar` lleva a `auth.efeonce.org/credentials` y la pantalla del emisor devuelve a Greenhouse al
terminar. Es el patrón de la cuenta de Google: vive en otro sitio, se llega desde el producto, nadie
teclea la dirección.

**Sin esa sección, esta pantalla no existe para nadie.** Construir sólo el lado del emisor sería
repetir el error que esta task viene a cerrar. Los dos lados usan stacks distintos —MUI/Composition
Shell en Greenhouse, shell HTML en el emisor— y **no comparten componentes**: comparten el recorrido.

## Desktop Target

1440×1000. Una tarjeta centrada sobre el campo azul, sin panel editorial (ese es sólo de `/login`).
Dos secciones dentro de la misma tarjeta, separadas por el filo de `.id-section`:

1. **Tus formas de entrar** — lista de credenciales. Por cada una: nombre del dispositivo, tipo,
   fecha de alta y último uso, y un control de retiro. Cuando no hay ninguna, el estado vacío es la
   pieza principal: explica qué resuelve una passkey (entrar sin esperar un correo) y su CTA es el
   alta.
2. **Agregar una passkey** — CTA primario que dispara la ceremonia WebAuthn, con la región de estado
   `role=status` inmediatamente debajo.

Ancho de la tarjeta igual al del resto del emisor. Sin scroll interno: con el tope de credenciales
por persona la lista tiene largo acotado por contrato.

## Mobile Target

390×844. Tarjeta a ancho completo con márgenes de 16 px. Cada credencial pasa de fila a bloque
apilado (nombre arriba, metadatos debajo en línea fina, retiro al pie como secundario a ancho
completo). CTA de alta a ancho completo. `scrollWidth === clientWidth` obligatorio.

## Action Hierarchy

- Primaria: **Agregar una passkey** (`POST /auth/passkeys/register/start` → ceremonia → `finish`).
- Secundaria: **Retirar** por credencial — destructiva y con confirmación explícita que nombra el
  dispositivo. Nunca «¿Estás seguro?»: dice qué deja de funcionar.
- Terciaria: volver a la sesión.
- **Nunca** hay un control que retire la última credencial sin decir que quedará dependiendo del
  correo.

## Visual Fidelity Mapping

| Elemento | Primitive existente | Token |
|---|---|---|
| Tarjeta y campo | `.id-surface` sobre `.id-canvas` | shell de TASK-1835 |
| Secciones | `.id-section` + `h2` | escala tipográfica del SSOT |
| Lista de credenciales | `.id-organizations` (misma gramática de lista con icono + bloque) | `--id-bg`, `--id-border` |
| Metadatos de la credencial | `.id-muted` + `.id-note-fine` | `bodySm` |
| CTA de alta | `.id-primary` + `ICON_KEY` | `--id-accent` |
| Retiro | `.id-secondary` | `--id-danger` sólo en la confirmación |
| Estado de la ceremonia | `role=status` + `aria-live=polite` | — |

**Ningún valor literal**: color, tipografía y espaciado salen de `styles.generated.ts`. Si hace falta
una clase nueva, se genera desde `scripts/auth-server/styles.ts` — y **nunca** se reutiliza una clase
de texto entre el lienzo y la tarjeta (costó 1.53:1 en TASK-1835).

## Copy Ledger

Todo en `src/lib/copy/auth-server.ts` (es-CL, tuteo), validado con `greenhouse-ux-writing`. Lo que
viaje al navegador se **deriva** del SSOT en un módulo aparte, como `auth-server-login.ts` — nunca se
transcribe (TASK-1835 encontró 15 ids fósiles nacidos justo de transcribir).

| Id | Contenido esperado |
|---|---|
| `credentials_title` | Título de la pantalla |
| `credentials_intro` | Qué es una passkey, en una línea, sin jerga |
| `credentials_empty_title` · `credentials_empty_body` | Estado vacío: hoy dependes del correo |
| `credentials_add_cta` | Verbo + objeto |
| `credentials_device_added` · `credentials_device_last_used` | Etiquetas de metadatos |
| `credentials_remove_cta` · `credentials_remove_confirm_*` | Retiro y su confirmación, que nombra el dispositivo |
| `credentials_last_one_warning` | Al retirar la última: vuelves a depender del correo |
| `credentials_add_pending` · `credentials_add_failed` · `credentials_unsupported` | Estados de la ceremonia; `unsupported` **no** ofrece reintento |
| `credentials_limit_reached` | Se alcanzó el tope por persona |

## State Copy

| Estado | Qué se ve |
|---|---|
| Vacío | Sin credenciales: el alta es la acción principal de la pantalla |
| Con credenciales | Lista + alta secundaria |
| Ceremonia en curso | `role=status` con texto; el botón queda `aria-busy` y deshabilitado |
| No soportado | Se retira el CTA y se explica; el correo sigue siendo el camino |
| Falló / cancelada | Mensaje **con** reintento — distinto de no soportado |
| Tope alcanzado | El alta se deshabilita con su razón, no desaparece |
| Retiro confirmado | La fila desaparece y se confirma en `role=status` |
| Sin JavaScript | El CTA de alta no se renderiza (no podría cumplir); la lista **sí** se ve, porque es server-rendered |

## Accesibilidad

Un `h1`; `main` con `aria-labelledby`; la lista como `ul` con un `li` por credencial; el control de
retiro nombra el dispositivo en su `aria-label` (no «Retirar» a secas, que se repite N veces); una
sola región viva; foco visible; ceremonia anunciada por texto, nunca sólo por animación.

## Implementation mapping

- Ruta: `GET /credentials` en el emisor, detrás de sesión `__Host-efeonce_auth`.
- Renderer: `src/lib/auth-server/persons/pages.ts` (o un módulo hermano), server-rendered.
- Controlador de navegador: artefacto generado con drift guard y servido por nonce, igual que
  `login-controller` y `step-up-controller`. La forma canónica de servir la página **exige el nonce
  en su tipo de entrada** (patrón `renderLoginPageResponse`): sin eso el navegador bloquea el script
  en silencio y el CTA queda pintado y muerto.
- Reader: `GET /auth/passkeys` ya existe y devuelve `credentialId`, `deviceName`, `deviceType`,
  `backedUp`, `createdAt`, `lastUsedAt` y el tope.
- Retiro: **[verificar]** si existe un command de retiro por credencial. `revokePersonAuthState` es
  corte de emergencia por admin, no autoservicio; si no existe, la task lo declara como su única
  pieza backend y lo construye con audit.

## GVC scenario plan

- Fixtures nuevas en `scripts/auth-server/dev-ui-server.ts`: vacío, una credencial, varias, tope
  alcanzado, ceremonia fallida, retiro confirmado.
- Escenarios `task1842-*` con `qualityProfile: 'premium'`, desktop 1440 y móvil 390.
- `pnpm auth-server:verify-contrast` y `pnpm auth-server:verify-passkey` deben seguir en verde: la
  primera mide 365 textos sobre píxeles renderizados y ya atrapó dos regresiones de contraste en la
  sesión que la creó.

## Design decision log

- **Decisión**: extender el shell «Efeonce ID» con un área autenticada `/account/*`, sin dirección
  visual nueva.
- **Alternativas descartadas**: (a) colgar el alta del step-up — lo ata al momento en que un scope de
  escritura ya frenó a la persona, que es justo cuando no quiere configurar nada; (b) meterlo en la
  consola del administrador de TASK-1838 — esa es de la organización, ésta es de la persona.
- **Riesgo abierto**: `TASK-1838` y esta comparten el área autenticada del emisor;
  las dos deben acordar su shell antes de que la segunda empiece.
