# TASK-1834 — Dirección visual: un solo login Greenhouse, operado por Efeonce ID

## Meta

- Estado: `selected v2 — first-fold pendiente`
- Fecha de decisión: `2026-09-07`
- Owner: `TASK-1834`
- Modo: `repo-native-benchmark`
- Superficies: entry route Greenhouse `/login`, login contextual de `auth.efeonce.org`, callback, selección de contexto y recovery Greenhouse.
- Fuente visible: runtime actual de Greenhouse y `auth.efeonce.org`, contrastados antes de esta decisión.
- Readiness: `UI ready: no` hasta contar con first fold implementado, GVC desktop/mobile, teclado, reduced motion y scorecard.

## Decisión de producto

La persona entra a **Greenhouse**, pero no debe atravesar una pantalla Greenhouse para luego encontrar otra pantalla
de login. Para las cohortes habilitadas, Greenhouse `/login` inicia inmediatamente una authorization transaction y
redirige al issuer. La **única superficie de autenticación visible** está servida por Efeonce ID y se presenta como:

- producto/destino: `Greenhouse`;
- tarea: `Entra a Greenhouse`;
- confianza: `Identidad protegida por Efeonce ID`;
- métodos: Microsoft, passkey, correo u otro método habilitado por policy.

La jerarquía mental permanece separada aunque la experiencia sea una:

1. **Producto:** Greenhouse — destino y contexto visible.
2. **Identidad:** Efeonce ID — servicio que verifica a la persona.
3. **Método:** Microsoft, passkey o correo — forma concreta de verificarla.
4. **Autorización:** Greenhouse — determina organización, contexto y permisos después del callback.

Resultado: **una pantalla, una cuenta y una experiencia; dos sesiones y autoridades técnicas separadas**.

## Corrección respecto de la dirección v1

La v1 del mismo día conservaba un first fold Greenhouse con CTA `Continuar` antes del login contextual. Aunque esa
pantalla no capturaba credenciales, era un vestíbulo: obligaba a confirmar dos veces la misma intención y hacía
perceptible la arquitectura interna. La dirección v2 la reemplaza.

- El CTA `Continuar` deja de ser el target convergido.
- `/login` se vuelve un entry/orchestration endpoint para cohortes habilitadas, no una vista intermedia.
- Las cohortes no habilitadas siguen viendo exclusivamente el login legacy; tampoco atraviesan dos pantallas.
- El recovery legacy se abre sólo ante solicitud o fallo y usa una ruta que no auto-redirige de nuevo.

## Evidencia que origina la decisión

- El problema inicial no era espacio sino taxonomía: Efeonce ID no pertenece al mismo nivel que sus métodos.
- Reemplazar el quinto provider por un CTA genérico corregía la jerarquía, pero agregaba un click y una página sin
  decisión real.
- OIDC ya usa el navegador para llevar a la persona desde el relying party al authorization server; no exige un
  vestíbulo visible en el producto.
- Una sesión vigente del issuer puede completar la autenticación sin mostrar login; un vestíbulo Greenhouse
  impediría que ese fast path se sintiera realmente inmediato.
- Passkeys son origin/RP-ID scoped. Mantener la ceremonia en `auth.efeonce.org` conserva el boundary existente y
  evita duplicar WebAuthn en cada producto.
- Un iframe o widget cross-origin agregaría problemas de clickjacking, cookies, foco y validación de origen; no es
  la integración seleccionada.

## Trabajos de usuario

| Persona | Trabajo real | Recorrido visible esperado |
|---|---|---|
| Sesión Efeonce ID vigente | Abrir Greenhouse | Ningún login; retorno casi inmediato al producto |
| Sin sesión, método disponible | Entrar a Greenhouse | Una pantalla `Entra a Greenhouse` con métodos |
| Microsoft sin sesión upstream | Autenticarse corporativamente | Pantalla Greenhouse contextual y, si Microsoft lo exige, UI propia de Microsoft |
| Passkey enrolada | Verificarse sin correo | Ceremonia del browser desde el origen canónico del issuer |
| Más de un contexto | Elegir cuál espacio abrir | Selector post-auth dentro de Greenhouse; no es otro login |
| Cohorte no migrada | Seguir entrando con el método actual | Sólo login legacy; no ve el flujo nuevo |
| Fallo del issuer | Recuperar acceso | Recovery Greenhouse estable sin loop de redirección |

## Alternativas comparadas

| Alternativa | Descripción | Ventaja | Costo / riesgo | Decisión |
|---|---|---|---|---|
| A. Quinto provider | `Continuar con Efeonce ID` junto a Microsoft/Google en Greenhouse | Cambio local pequeño | Mezcla producto, identity plane y métodos; provider soup | Rechazada |
| B. Vestíbulo contextual | Greenhouse muestra `Continuar`; después el issuer muestra métodos | Explica explícitamente el handoff | Dos puertas, click sin decisión y SSO perceptiblemente lento | Rechazada; sustituye v1 |
| C. Login contextual directo | `/login` inicia OIDC; issuer sirve la única pantalla `Entra a Greenhouse` o retorna sin UI si ya hay sesión | Una experiencia, SSO real, boundary seguro y renderer reusable | Exige routing/fallback cuidadosos y RP presentation confiable | **Seleccionada** |

La alternativa C no equivale a un redirect ciego global. Es server-initiated, contextual, cohort-gated, observable y
reversible. La ruta legacy permanece disponible durante la migración y el recovery evita loops.

## First fold seleccionado — contextual Efeonce ID

```text
┌──────────────────────────────── auth.efeonce.org ───────────────────────────────┐
│ Efeonce ID                                                     Ayuda            │
│                                                                                │
│                         [ marca Greenhouse ]                                   │
│                                                                                │
│                           Entra a Greenhouse                                   │
│                Elige cómo quieres verificar tu identidad.                     │
│                                                                                │
│                    [ Continuar con Microsoft ]                                 │
│                    [ Usar mi passkey ]                                         │
│                                                                                │
│                  ─────────────── o ───────────────                             │
│                  Correo                                                        │
│                  [ nombre@empresa.com                    ]                     │
│                  [ Recibir un enlace por correo          ]                     │
│                                                                                │
│                     Identidad protegida por Efeonce ID                         │
│                           Volver a Greenhouse                                  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Lectura y jerarquía

1. Greenhouse es el primer nombre visual y el H1 contiene el destino.
2. Los métodos son las únicas decisiones principales.
3. Efeonce ID funciona como señal de confianza, no como otro destino.
4. `Volver a Greenhouse` cancela sin depender del botón Back.
5. No se muestra consentimiento OAuth para el sign-in first-party sin scopes delegados.

### Contexto RP confiable

El issuer recibe una presentation profile desde el cliente y la transaction validados:

- `productKey` allowlisted;
- `displayName` canónico;
- asset local/versionado identificado por key, nunca logo URL remoto;
- label de retorno y redirect exacto registrados;
- clase `first_party_sign_in`, distinta de un cliente MCP/delegated consent.

Un query param libre no puede cambiar nombre, logo, copy, return URL ni clase de confianza.

## Variantes visibles

| Variante | Qué ve la persona |
|---|---|
| Sesión vigente y assurance suficiente | Ninguna pantalla; callback directo a Greenhouse |
| Sin sesión | First fold contextual de arriba |
| Login directo del issuer | `Entra a Efeonce`, sin marca Greenhouse fabricada |
| Método Microsoft | La UI de Microsoft sólo si el upstream necesita interacción |
| Passkey | Prompt nativo del navegador sobre el issuer |
| Correo | Campo + estado anti-enumeración `Revisa tu correo` |
| Más de un contexto | Selector Greenhouse después del callback |
| Deny | Error Greenhouse genérico con recuperación |
| Issuer degradado | Recovery Greenhouse; no reintento automático infinito |
| Cohorte legacy | Login Greenhouse actual; nunca pasa primero por el flujo nuevo |

## Mobile — 390 px

- Una sola columna y el mismo orden semántico.
- Marca Greenhouse, H1 y primer método deben entrar en el primer viewport razonable sin comprimir tipografía.
- Cada método mantiene el touch target canónico; labels pueden envolver.
- Campo de correo conserva label visible y teclado apropiado.
- Confianza/retorno permanecen después de métodos; no quedan fijos sobre contenido.
- `scrollWidth === clientWidth`; zoom y fuente ampliada no ocultan recovery.

## Copy canónico propuesto

| Superficie / estado | Elemento | Copy |
|---|---|---|
| Issuer contextual | H1 | `Entra a Greenhouse` |
| Issuer contextual | Apoyo | `Elige cómo quieres verificar tu identidad.` |
| Método | Microsoft | `Continuar con Microsoft` |
| Método | Passkey | `Usar mi passkey` |
| Método | Correo | `Recibir un enlace por correo` |
| Confianza | Disclosure | `Identidad protegida por Efeonce ID` |
| Cancelar | Link | `Volver a Greenhouse` |
| Correo enviado | Estado | `Revisa tu correo para continuar` |
| Greenhouse multicontexto | H1 | `Elige el espacio que quieres abrir` |
| Recovery | H1 | `No pudimos completar el acceso` |
| Recovery | Apoyo | `Inténtalo otra vez o usa temporalmente otro método.` |
| Recovery | Primaria | `Intentar de nuevo` |
| Recovery | Secundaria | `Usar un método anterior` |

El copy final vive en `src/lib/copy/*`. Los errores no distinguen cuenta inexistente, vínculo inactivo, principal
ambiguo, organización no elegible o revocación.

## Estado y comportamiento

| Estado | Superficie dueña | Resultado visible |
|---|---|---|
| entry_legacy | Greenhouse | login actual para cohorte no habilitada |
| entry_redirect | Greenhouse server | 302 inmediato; no HTML intermedio ni flash de login |
| issuer_session_fast_path | Efeonce ID | no UI; code hacia callback |
| issuer_authentication | Efeonce ID | único login contextual Greenhouse |
| issuer_method_pending | Efeonce ID/upstream | sólo el método elegido queda busy |
| returning | Greenhouse server | valida protocolo y autoridad antes de emitir sesión |
| one_context | Greenhouse | home autorizado |
| many_contexts | Greenhouse | selector de opciones elegibles |
| zero_contexts | Greenhouse | deny genérico, sin identidad en URL |
| recovery | Greenhouse | retry o método anterior, sin auto-redirect |
| direct_issuer | Efeonce ID | login neutral `Entra a Efeonce` |

## Mapping de primitives y tokens

| Necesidad | Decisión | Fuente |
|---|---|---|
| Entry route | `extend` server-side | Greenhouse login page/provider initiation; no nuevo first fold |
| Shell del issuer | `reuse` | `src/lib/auth-server/persons/pages.ts` |
| Contexto de producto | `extend` | `clientContext(...)` / presentation profile validado |
| Métodos y estados | `reuse` | dirección/renderer completados por TASK-1835 |
| Marca Greenhouse | `reuse` | asset institucional local/versionado + tokens del renderer |
| Recovery legacy | `reuse/extend` | `src/views/Login.tsx`, sólo como fallback/legacy |
| Alertas cerradas | `reuse` | regiones existentes y copy centralizado |
| Selector de contexto | `reuse/extend` | patrón de lista seleccionable; lookup obligatorio antes de JSX |

No se introduce una primitive nueva por defecto. No se copia el renderer Efeonce ID a React/Greenhouse. Spacing,
color, tipografía, radios, foco, elevación y motion salen de tokens existentes.

## Accesibilidad y seguridad perceptible

- Un H1 y landmarks estables en la única pantalla de login.
- Visible label y accessible name coinciden para cada método.
- Pending usa copy/`aria-busy`, no sólo spinner.
- Prompt WebAuthn nace de una acción con nombre explícito; fallback sigue disponible.
- Errores y selector reciben foco al montar.
- No hay iframe, popup obligatorio ni back como única salida.
- Reduced motion conserva resultados y nunca demora redirect/focus.
- La URL canónica `auth.efeonce.org` y el disclosure consistente ayudan a reconocer el servicio de identidad.

## Anti-patrones prohibidos

- Renderizar una pantalla Greenhouse con sólo `Continuar` antes del login contextual.
- Mostrar `Continuar con Efeonce ID` como hermano de Microsoft/Google.
- Mostrar consentimiento OAuth para el sign-in first-party sin scopes delegados.
- Duplicar la UI de passkey/magic link del issuer dentro de cada producto.
- Iframe o popup como camino obligatorio.
- Confiar application branding/return URL desde browser input.
- Auto-redirigir desde la página de recovery y crear un loop.
- Enviar a cohortes no migradas por el nuevo flujo antes de tener recovery.
- Elegir organización por email, browser o primera fila.
- Hacer que logout local cierre silenciosamente otros productos.

## Plan GVC y scorecard

- Baselines: login Greenhouse legacy y login directo actual de `auth.efeonce.org`.
- Viewports: `1440x900` y `390x844`.
- Prueba no visual: `/login` habilitado responde redirect sin HTML/flash intermedio; cohorte legacy sirve sólo legacy.
- Capturas issuer: contextual Greenhouse; directo neutral; método pending; correo enviado; passkey unsupported/failed;
  upstream error; retorno/cancelación.
- Capturas Greenhouse post-auth: recovery, deny, selector multicontexto y home entry.
- Pruebas: teclado, semántica, `prefers-reduced-motion: reduce`, zoom, copy largo y scroll width.
- Continuidad obligatoria: el único login debe responder inequívocamente «estoy entrando a Greenhouse».
- Scorecard: `docs/ui/reviews/TASK-1834-greenhouse-login-convergence-native-issuer.scorecard.json`.

## Decision log

- 2026-09-07 v1: se rechazó el quinto provider y se seleccionó un handoff con vestíbulo Greenhouse.
- 2026-09-07 v2: el operador cuestionó la doble pantalla; el vestíbulo se rechaza por no contener una decisión.
- 2026-09-07 v2: se selecciona entry redirect contextual por cohorte + una única pantalla issuer-hosted.
- 2026-09-07 v2: login first-party no muestra consentimiento delegado; MCP/terceros conservan consentimiento.
- 2026-09-07 v2: `UI ready` permanece `no`; dirección no sustituye first fold ni evidencia GVC.
