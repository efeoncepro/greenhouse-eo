# Efeonce Globe — Client Application Decision V1

- **Decision:** ADR-014
- **Status:** Accepted — Slices 0 y 1 **entregados y SIRVIENDO** (`TASK-1556`, `TASK-1558`, cutover 2026-07-25, revisión `00071-6vp`); las otras cuatro superficies siguen en el payload legacy; el host comercial sigue diferido por ADR-004
- **Date:** 2026-07-25
- **Owner:** Efeonce Creative Technology / Globe (código) + Greenhouse control plane (gobierno documental)
- **Scope:** **TODO el payload de browser de Efeonce Globe** — las cinco superficies HTML que existen hoy (`launch`, `studio`, `error`, `producer`, `share`) y toda superficie humana futura, con énfasis en las **client-facing**: share boards read-only, Storyboard Sequence Canvas con `client_review`, Video Effectiveness `client-operated`/`co-operated` y delivery packages. **NO** cubre el host, el BFF, la sesión, el trust boundary, la API privada ni la infraestructura.
- **Reversibility:** two-way — el cambio vive dentro de `apps/studio-web`, detrás de un flag default-OFF, con los dos payloads coexistiendo durante el strangler. Cero DB, cero IAM/WIF, cero Terraform, cero contrato de API.
- **Confidence:** Alta para el diagnóstico y la frontera (verificados contra código y runtime 2026-07-25); media para la secuencia de slices hasta que `TASK-1556` complete Discovery.
- **Related:** ADR-004 (`EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`) — esta ADR **ejerce su gatillo de framework y deja intacta su parte de host**; ADR-005 (`EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`) — trust boundary y target de producto siguen normativos; ADR-003 (naming client-facing); ADR-012 / SPEC-012 (Storyboard Studio); ADR-011 / SPEC-011 (Video Effectiveness); `TASK-1505`, `TASK-1522`, `TASK-1526`, `TASK-1540`, `TASK-1547`, `TASK-1552`, `TASK-1555`, `TASK-1472`, `TASK-1521`, `TASK-1480`.

## Contexto (baseline verificado 2026-07-25 contra el código, no contra la doc)

### El sustrato

Las superficies humanas de Globe se sirven como **HTML compuesto por concatenación de strings en el servidor**, con el código del browser **serializado con `Function.prototype.toString()`**:

- `apps/studio-web/src/producer-controller.ts` (**4.999 líneas**, donde vive toda la interacción) declara en su encabezado `// studio-web intentionally compiles without lib.dom` y a continuación **`type HTMLElement = any`**, `type Event = any`, `declare const window: any` y un shim de `document` escrito a mano con seis métodos. **La capa donde viven los bugs de UI no tiene verificación de tipos.**
- `buildProducerControllerSource()` retorna `` `;(${browserController.toString()})(...)` ``: el cuerpo **no puede importar nada**. El propio código documenta el impuesto (TASK-1555): *"the controller body is serialized with `.toString()`, so it cannot close over the copy module. The fleet copy travels as a serialized parameter."*
- **Cero archivos `.css` en todo el repo. Cero bundlers** (`vite|webpack|esbuild|rollup|parcel|next|tailwind|postcss` no aparecen en ninguno de los 11 `package.json`). El build es `tsc -p tsconfig.json`. No hay HMR.

### Hay cinco superficies HTML, no una — y la que ve el cliente es la más débil

| Ruta | ¿Sesión? | Render | Quién la ve |
|---|---|---|---|
| `/producer` | **sí** (SSO + gate interno) | `producer-ui.ts` (621 líneas) | **operador interno** |
| `/studio` | **sí** | `ui.ts` | operador interno |
| `/` (launch) | no | `ui.ts` | público (umbral de login) |
| `/auth/callback` (4 ramas de error) | no | `ui.ts` | público |
| **`/shares/:shareId`** | **NO** — evaluada *antes* del guard de sesión | **`public-share-ui.ts`** | 🔴 **cliente externo, portador del bearer** |

**Producer no es UI de cliente.** `isEligibleInternalIdentity` (`app.ts:3905-3912`) exige `tenantId === 'efeonce'` **y** `organization.tenantType === 'efeonce_internal'` **y** `roles.length === 0`; sin eso el callback devuelve 403. Un cliente **no puede obtener sesión en Globe**. El copy lo confirma: *"Este despliegue interno controlado no está abierto a clientes externos"* (`ui.ts:20`).

**La única cara real de Globe hacia un cliente es el share board**, y su estado es el peor del repo:

- **15 líneas de archivo**, con **3.071 caracteres de CSS comprimidos en una sola línea** (`public-share-ui.ts:11`) y 2.096 de script en otra.
- **Los tokens de marca están re-tipeados a mano y ya driftearon**: `--surface` `.62` acá vs `.5` en Producer; `--line` `.18` vs `.12`; nombres divergentes (`--blue`/`--orange` vs `--action`/`--warm`). Nadie los cambió a propósito: **se separaron solos**, que es exactamente lo que pasa cuando no hay SSOT ni gate.
- **Se auto-rotula `Producer`** (`public-share-ui.ts:12`): el cliente ve una página marcada con el nombre de una superficie interna.
- Duplica `escapeHtml` por tercera vez (`ui.ts:136`, `producer-ui.ts:402`, `public-share-ui.ts:1`).

Y hay un cuarto sistema de tokens: `producer-ui.ts` declara **dos `:root` distintos dentro del mismo archivo** (`:461` y `:518`). **Cambiar un color de marca hoy exige editar cuatro bloques literales en tres archivos.** Bonus verificado: el footer de Producer apunta a `/legal/terms`, ruta inexistente que cae en el handler genérico y devuelve **JSON crudo** (`{error:{code:'not_found'}}`) a un browser.

### El craft existe, pero es inaplicable — y ya está midiendo drift

La auditoría contra la barra 2026 (`modern-ui`) sobre `producer-ui.ts` da un resultado más matizado que "está mal hecho":

| Señal | Estado |
|---|---|
| Capa de tokens semánticos (`--canvas`, `--surface`, `--action`, `--focus`, `--duration-short`, `--ease-enter`, `--radius-*`) | ✅ existe, ~30 custom properties |
| `:focus-visible` | ✅ 19 usos — disciplina de foco real |
| `aria-live` / `aria-busy` / `role="status"` | ✅ 9 / 2 / 4 |
| `prefers-reduced-motion`, `forced-colors` | ⚠️ 2 y 1 — presentes pero delgados |
| **Hex crudo bypasseando los tokens** | 🔴 **184 ocurrencias, 63 colores únicos** en un solo archivo |
| OKLCH / `color-mix` | 🔴 0 / 1 — sin ramp derivable (`modern-ui` §4) |
| `@container` | 🔴 0 — los componentes responden al viewport, no a su slot (`modern-ui` §6) |
| `prefers-color-scheme` | 🔴 0 — dark-only, nunca decidido como producto |
| `role="alert"` | 🔴 0 — no existe el canal asertivo que `authentication_required` necesita |

**El diagnóstico correcto no es "no hay tokens": es que 30 tokens conviven con 63 colores literales que los evaden 184 veces, y nada puede detenerlo.** Greenhouse tiene `design:lint`, `design-contract:lint`, `ui:code-lint`, `ui:visual-gate` y `ui:quality`; **Globe no tiene ninguno de los cinco** — verificado, sus `package.json` no exponen un solo gate de UI. **No se puede lintear un `String.raw`.** El craft que existe lo sostiene quien se acuerda, y la evidencia dice que ya no se acordó 184 veces.

### El horizonte de producto es client-facing, y está todo por construir

- **Share boards read-only** (`TASK-1522`/`TASK-1472`): *"A share board is a revocable, expiring, read-only grant over an allowlisted projection"*. La UI consumer es el Slice 5 de `TASK-1505`, no shippeada.
- **Storyboard Sequence Canvas** (`TASK-1547`, ADR-012): audiencia declarada *"creative author, internal reviewer, **scoped client reviewer**"*; lifecycle con estado **`client_review`**; *"Client commenting requires an authenticated, scoped and revocable collaboration grant"*; y el listón explícito: *"The product must support collaboration similar in immediacy to **Frame.io** — comments, mentions, visual markup and masked edit intent"*. Markup vectorial y máscaras.
- **Video Effectiveness** (`TASK-1540`, ADR-011): *"client or co-operator authorized for one workspace video"*, con modos `client-operated` y `co-operated`.
- **Delivery packages** (`TASK-1472`) y exports de Storyboard (`TASK-1548`): entregables al cliente.

Las cuatro están en `to-do` o en diseño. **Ninguna línea de UI cliente está escrita todavía** — y las tasks ya les exigen **GVC premium**, viewports `1440×1000` + `390×844`, `scrollWidth <= clientWidth`, scorecard promedio ≥4.5 con fidelidad ≥4.5, y `greenhouse-ui-review` + `greenhouse-ui-enterprise-review` sin `BLOCK`. Ese estándar es hoy **inauditable en el repo donde la UI vive**.

### La decisión se está tomando por acumulación

ADR-004 dejó constancia de que *"the target Next.js architecture never materialized — the running reality is the Node server"*, y difirió el framework del frontend cliente con este gatillo: *"decide when `TASK-1505`'s client UI is built and its framework chosen, and before `TASK-1480` Production"*. **El gatillo ya se disparó**: la UI de `TASK-1505` se está construyendo ahora (`1519`, `1525`, `1526`, `1552`, `1553`, `1554`, `1555`) y `TASK-1555` ya escribe el patrón como arquitectura establecida — *"arquitectura Globe = HTML-template + controller vanilla-JS + CSS inline; NO React/JSX"*. Es el modo de falla que ADR-004 fue escrita para evitar (*"freezes an accidental pilot into architecture"*), ocurriendo en su eje de framework.

## Decisión

1. **Todo el payload de browser de Globe migra a una aplicación cliente tipada y componetizada, compilada a assets estáticos.** Aplica a las cinco superficies actuales y a toda superficie humana futura. Se termina la composición por strings y la serialización por `.toString()`. El cliente compila con `lib.dom` y el mismo `strict` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` del monorepo.

   **Stack pineado, verificado contra el registry npm el 2026-07-25 — todas las versiones EXACTAS, sin `^`:**

   - **`vite@8.1.x`, validado en el Slice 0, con `7.3.x` como fallback documentado.** Vite 8.0 (2026-03-12) no fue un major de bump de Node: fue un **cambio de motor** — reemplazó Rollup (~10 años de batalla) + esbuild por **Rolldown**, un proyecto Rust de 2 años y 10 meses. Riesgos verificados: [rolldown#9330](https://github.com/rolldown/rolldown/issues/9330) (~7× de memoria **en dev**, abierto desde 2026-05-09); semántica CJS estricta que produce `TypeError: e is not a function` **en el browser, pasando CI**; y **output no determinista entre minors** (chunking/DCE).

     **Aun así se entra por 8, y la razón es que Globe es greenfield en esta dependencia.** Entrar por 7 no evita Rolldown: lo **agenda para el peor momento**. Vite 7 no tiene LTS y baja de tier cuando salga Vite 9 (cadencia ~9-12 meses), así que la migración es inevitable — la única variable es si se paga con 3 archivos o con 200. Y los tres riesgos se atenúan fuerte en greenfield: la rotura CJS muerde sobre **dependencias heredadas**, y una app nueva (React + router + capa de canvas) tiene superficie CJS casi nula; la memoria es dev-only y local; el no determinismo importa si el tamaño de bundle es contractual, y acá no lo es. **El precedente de Angular (`vite@7.3.6` pineado) NO aplica**: Angular arrastra una base instalada enorme y usa Vite sólo para su dev server.

     **Dos compuertas obligatorias en el Slice 0**, ambas resolubles en horas: (1) **compatibilidad `react-router@8.3.0` ↔ Vite 8** — RR8 declara `Vite 7+` como piso y la compatibilidad con 8 **no está confirmada**; (2) **smoke de producción real que ejercite las dependencias**, no sólo CI — es lo único que atrapa el `e is not a function`. **Si cualquiera falla, se cae a `7.3.x` el mismo día** (recibe *"important fixes + security patches"* por política oficial) y se reagenda la subida a Vite 8 para cuando `rolldown#9330` cierre. Que el costo de equivocarse sea de horas y no de meses es precisamente lo que justifica entrar por 8.
   - `react@19.2.8` · **`react-router@8.3.0`** en framework mode con **SSR apagado** (v8.0 del 2026-06-17; ciclo mayor anual declarado, releases *"regulares, predecibles y sobre todo aburridas"*, y el modo no obliga a SSR).

     **Router — decidido, no diferido (`TASK-1556` Slice 1, 2026-07-25).** Gana **React Router**, y el rationale
     honesto importa más que el veredicto: el argumento a favor de `@tanstack/react-router` es su type-safety de
     **search params como estado tipado y validado**, y esa ventaja **no se puede evaluar en el Slice 1** — el seam
     tiene una ruta trivial sin estado en la URL. La superficie que discriminaría entre ambos es el **composer**
     (selección de modelo, filtros, comparación de candidatos), que llega varios slices después. Se decide igual
     ahora, con la evidencia que sí existe —madurez, ciclo predecible y **compuerta (a) verde**— porque dejar la
     decisión abierta durante meses es cómo se termina decidiendo por inercia, que es justo lo que esta ADR existe
     para evitar. El costo de cambiar sigue siendo bajo mientras el codebase sea chico; si el composer produce
     evidencia material a favor de TanStack Router, se supersede con esa evidencia sobre la mesa, no antes.

     ✅ **Compuerta (b) RESUELTA (2026-07-25):** el bundle real, servido por el renderer de shell real
     bajo la CSP estricta real, corre en Chromium: HTTP 200, React hidrata, el router resuelve, el
     estado actualiza, **cero console errors, cero page errors, cero requests fallidos**. La semántica
     CJS estricta de Rolldown **no mordió**. Arnés reproducible:
     `efeonce-globe` `pnpm --filter @efeonce-globe/studio-client seam:smoke` +
     `greenhouse-eo` `node scripts/frontend/globe-client-seam-gate.mjs`.

     **Con las dos compuertas verdes, el fallback a `vite@7.3.x` queda retirado: se sigue con Vite 8.1.5.**

     ✅ **Compuerta (a) RESUELTA (2026-07-25):** `react-router@8.3.0` compila limpio sobre `vite@8.1.5` — 73
     módulos, 284 kB crudo / 90 kB gzip, 65 ms. Era el unknown que esta ADR marcaba explícitamente sin confirmar
     (RR8 declara `Vite 7+` como piso y nadie había verificado el 8). **El fallback a `7.3.x` ya no es necesario
     por este motivo**; sigue vigente sólo si la compuerta (b) —el smoke de producción que ejercita las
     dependencias en el browser— encontrara la semántica CJS estricta de Rolldown.
   - `babel-plugin-react-compiler@1.0.0` **pineado exacto**, habilitado **después** de que `eslint-plugin-react-hooks` pase limpio sobre el módulo de canvas — el compilador asume las Rules of React y un editor vectorial es justo donde más se rompen.
   - `@tanstack/react-router` es sustituto aceptable de React Router si Discovery prefiere su type-safety; **`@tanstack/react-start` NO** (ver alternativas).

   **Higiene obligatoria de la dependencia** (deriva del análisis de riesgo, abajo): **NUNCA** correr el dev server con `--host` / `server.host` — **13 de los 19 advisories históricos de Vite son bypasses de `server.fs.deny` o lectura arbitraria del dev server, y todos exigen exponerlo a la red**; se enforce-a con gate en CI. Pin exacto + lockfile + soak de 7-14 días antes de subir parches. Preservar `rollupOptions` y evitar APIs exclusivas de Rolldown, para conservar la puerta de salida lateral.

2. **Las superficies client-facing tienen prioridad sobre las internas.** El orden de migración lo fija quién mira la pantalla, no cuánto código tiene: **el share board va primero**, aunque sean 15 líneas, porque es la única cara comercial de Globe y es la que peor está. Producer se porta después, y las superficies nuevas (Storyboard, Video Effectiveness, delivery) **nacen** en el payload nuevo.

3. **Un SSOT de tokens para todo Globe, con drift guard.** Los cuatro bloques `:root` paralelos (dos en `producer-ui.ts`, uno en `ui.ts`, uno en `public-share-ui.ts`) colapsan en un único módulo de tokens del repo, alimentado por AXIS. Un color de marca se cambia en **un** lugar. Nuevos tokens en OKLCH con variantes derivadas por `color-mix`, no hex literal.

4. **La migración trae la maquinaria de gates, no sólo el framework.** El payload nuevo nace con lint de estilos/tokens (hex crudo = error, no advertencia), lint de a11y de componentes, y el canary/fixture visual extendido a **cada** superficie client-facing. **Sin gates, esta ADR sólo cambia la sintaxis del mismo problema.** El estándar premium que las tasks ya exigen pasa de aspiracional a verificable.

5. **El host, el BFF y el trust boundary NO se tocan.** Sigue siendo *browser → BFF same-origin `studio-web` → API IAM-private*, en Cloud Run, detrás del mismo ALB y el mismo SSO. **ADR-005 puntos 3 y 4 siguen normativos sin cambio**: el browser nunca llama la API privada, nunca recibe credencial de workload, y la política de surface se enforce-a en ingress/dispatch. El share board conserva su carril actual: token en el fragment, promovido a header `Globe-Share`, `credentials:'omit'`, bytes por `/v1/shares/:id/media`. Esta ADR cambia **qué se le manda al browser**, no **quién tiene autoridad**.

6. **El bundle se sirve por el mecanismo que ya existe, con la misma CSP.** `assets.ts` ya es un allowlist explícito de assets estáticos y ya sirve una hoja de estilos externa. La CSP vigente (`app.ts:2495`) es `script-src 'nonce-<n>'; style-src 'nonce-<n>'`, y un `<script nonce>` / `<link rel=stylesheet nonce>` externo **está permitido por esa misma política** — el shell ya lo hace hoy con `tabler-icons.min.css`. **La postura de CSP se preserva exactamente**, verificado contra el código.

7. **Se separan los dos ejes que ADR-004 dejó atados.** ADR-004 difirió "host + framework" como un bulto. Esta ADR responde **sólo la mitad de framework** y **deja la de host intacta**. Es el punto central: componentes React **portan** a otro host si `TASK-1480` lo pide; templates de string **se reescriben**. Quedarse en el patrón actual es la opción que **cierra** la puerta que ADR-004 quiso dejar abierta.

8. **Globe no importa primitives de Greenhouse.** El payload materializa sus tokens y componentes **dentro de `efeonce-globe`**. Esto no es preferencia: `TASK-1540` ya lo fija — *"Globe extiende su propio shell/viewer/review; **no importa CompositionShell, MUI/AXIS o primitives de Greenhouse**"* — y la regla dura de boundary no se relaja. Compartir un paquete de UI cross-repo sería una decisión de frontera con su propia ADR.

9. **Strangler con flag default-OFF, nunca big bang.** `GLOBE_CLIENT_APP_ENABLED` se declara en `infra/terraform/variables.tf` con default `false` — **nunca sólo en `terraform.tfvars`**, que está gitignoreado y volvería invisible el estado real del flag. Los dos payloads coexisten hasta que el último slice retire el viejo.

## Alternativas consideradas

| Alternativa | Decisión |
| --- | --- |
| **Seguir en el patrón actual y acumular** | **Rechazada.** Produce el estado medido hoy: 63 colores literales evadiendo 30 tokens, cuatro `:root` paralelos, tokens del share ya drifteados, cero gates posibles. Hace impracticable el Sequence Canvas de `TASK-1547` (markup vectorial + máscaras + inmediatez Frame.io) y cierra la puerta que ADR-004 dejó abierta a propósito. |
| **Migrar el shell web/BFF a Next.js en Vercel ahora** | **Rechazada — sin novedad respecto de ADR-004.** Migración de runtime/auth/WIF de alto blast radius que parte el trust boundary en dos nubes y no arregla nada real. |
| **Next.js 16 self-hosted sobre Cloud Run** | **Rechazada, y por una razón distinta a la de ADR-004 — hay que corregir el registro.** El argumento viejo *"Next fuera de Vercel es un campo minado"* **quedó desactualizado**: la Adapter API es estable desde 2026-03-25, el adapter de Vercel usa el mismo contrato público *"no private hooks or special integration path"*, hay test suite compartido y Google Cloud está entre los partners; `next start` es baseline soportado *"without limitations"*. El motivo real de rechazo es otro y es estructural: **`studio-web` YA ES el BFF** — deriva el principal humano, mintea el contrato de delegación, sostiene la sesión SSO y llama la API IAM-private con identidad de workload. Adoptar Next obliga a (a) que Next **sea** el BFF, reescribiendo el trust boundary de ADR-005 §3, o (b) correr Next **detrás** del BFF, duplicando el runtime Node por cero ganancia. Se suma que el beneficio principal de RSC/SSR es SEO y first paint de visitantes nuevos, y Globe no cobra ninguno (todo detrás de SSO). Nota justa: si algún día Globe **necesitara** SSR, Next self-hosted es hoy una opción legítima y esta ADR no la cierra. |
| **Astro** | **Rechazada por un hecho técnico duro, no por preferencia.** (1) **La CSP de Astro es hash-only: no soporta nonces.** La CSP viva de Globe es `script-src 'nonce-<n>'` emitida por el BFF; si Astro emite su propia política hash-based, el browser aplica la **intersección** y los scripts propios de Astro quedan bloqueados por la política nonce — habría que reescribir quién es dueño de la CSP. (2) **Astro se autoexcluye por escrito** de este caso: su doc dice que otros frameworks *"excel at… logged-in admin dashboards, inboxes, social networks"*. (3) Sirve para 1 de las 5 superficies (el share board), y su propio ecosistema pone el umbral del split de stacks en ~200 páginas de contenido. Astro sigue siendo la elección correcta para `efeonce-think`, no para Globe. |
| **TanStack Start** | **Rechazada por señal de gobernanza, no por calidad.** Sigue en **Release Candidate** a julio 2026: el RC se anunció el 2025-09-23, no hay post de GA, la pregunta por la ETA lleva dos planteos sin respuesta de maintainers ([router#5999](https://github.com/TanStack/router/discussions/5999)) y no hay usuarios de producción nombrados y de escala. El `1.168.x` de npm **no significa GA** — TanStack numera `1.x` desde el inicio. Además su valor central (SSR + server functions) es exactamente lo que Globe no necesita. **`@tanstack/react-router` solo, sin Start, sí es candidato maduro.** |
| **Migrar sólo el share board y dejar el resto** | **Rechazada.** Es la tentación obvia (es el más chico y el más client-facing), pero dejaría **cinco** sistemas de tokens en vez de cuatro y ningún gate compartido. El share se hace **primero**, no **sólo**. |
| **Arreglar el patrón actual: prender `lib.dom`, dejar de serializar con `.toString()`** | **Rechazada, pero es la alternativa seria.** Quitar la serialización obliga a introducir un bundler igual; llegado ese punto ya se eligió tener build step, y lo único que queda por decidir es si además se obtiene modelo de componentes, CSS real, gates y HMR. Paga casi todo el costo por una fracción del beneficio. |
| **Web Components / Lit** | **Rechazada, no descartable.** Daría componentes, tipos, build y gates sin framework. Se descarta porque la base de skills del ecosistema y la ruta futura a Next son React. Queda viva si se quiere reducir dependencia de framework. |

## Por qué no se elige "lo más de frontera" (investigación web, 2026-07-25)

**Frontera y correcto no son la misma pregunta, y en 2026 apuntan a lados distintos.** Lo más de frontera para UI React hoy es el modelo RSC/SSR de Next.js con Partial Prerendering — y es exactamente el que su propio vendor puso en duda. Vercel, en el anuncio de *Instant Navigations* (2026-06-25), escribió: *"One of the most common frustrations we hear about Next.js apps is that navigations feel slow"* y reconoció *"the long-standing (**and valid!**) criticism that Server Components can make apps feel unresponsive"*. El arreglo existe pero exige `cacheComponents` + `partialPrefetching`, ambos en **16.3, que a esta fecha sigue en preview/canary**. Señal convergente e independiente: el equipo de TanStack publicó el **2026-07-24** que **removió RSC de su propio sitio** por *"tradeoffs de runtime y de forma de código que ya no querían"*.

Para una consola autenticada el balance es nítido: de los cuatro argumentos a favor de SSR, Globe no cobra ninguno. SEO — no, todo detrás de SSO. First paint de visitante nuevo — no, sesiones largas. Ocultar credenciales — ya lo hace el BFF. Cascadas de fetch — real, pero se resuelve con prefetch en el router sin servidor de render. Y hay un argumento **activo en contra**: un editor con markup vectorial es estado cliente pesado y mutable, donde la hidratación es costo puro y el mismatch es una clase de bug evitable.

**El único punto donde la frontera sí paga, y se adopta:** el **React Compiler 1.0** (estable 2025-10-07, recomendado para producción por el equipo React, medido en Meta con interacciones **>2,5× más rápidas** y cargas ~12% mejores). Un feed vivo + un canvas es el perfil exacto donde la memoización automática rinde. Se adopta con las dos cautelas que el propio equipo publica: versión **pineada exacta** y `eslint-plugin-react-hooks` limpio antes de habilitarlo.

## ¿Se puede apostar un producto comercial a Vite? (due diligence, 2026-07-25)

**Sí, y el hecho que ordena todo el análisis es que Vite es dependencia de BUILD-TIME, no de runtime.** La salida son JS/CSS/HTML estáticos: **nada de Vite se despacha a producción**. Ningún CVE del dev server toca la postura productiva; si el proyecto fuera capturado o abandonado, Globe sigue despachando con el output que ya tiene y dispone de 12-24 meses para migrar. El modo de falla es *"nuestro tooling se degrada"*, no *"el producto se cae"*. Ese filtro disuelve la mayor parte del riesgo aparente. Lo que queda, queda registrado acá.

**Lo sólido**

- **Escala y permanencia.** Vite superó a webpack en descargas npm en julio 2025 y hoy corre entre **2,5× y 3× por encima** (las fuentes discrepan en el absoluto — Snyk ~116M/semana, la API de npm reporta bastante más; se registra el ratio, no el número). **React deprecó Create React App en febrero 2025 recomendando Vite**; Shopify shippea Hydrogen con Vite por defecto.
- **Es infraestructura compartida, no una opción más** — y se sostiene a la verificación mecánica de los manifiestos npm: **Astro, Nuxt y Vitest lo declaran como dependencia dura**; Angular lo usa (pineado exacto) para su dev server; SvelteKit, React Router, Storybook y TanStack lo declaran como peer. Si Vite se rompe, se rompe medio ecosistema — y por eso medio ecosistema tiene incentivo de arreglarlo. Es el argumento de robustez más fuerte que existe acá.
- **Satisfacción y retención** (State of JS 2025): retención ~97%, sentimiento neto muy positivo. La gente que lo adopta se queda.
- **MIT en todo el stack**, sin CLA agresivo: el fork siempre queda disponible como salida.

**Lo débil, sin maquillar**

- **No hay LTS ni fechas EOL publicadas.** El soporte se decide por tier automático, no por calendario. Para procurement es un hallazgo negativo duro: no se puede poner una fecha en un plan de riesgo.
- **No hay fundación ni TSC ni charter.** Vite **no está en OpenJS** ni en ninguna otra. Tras la adquisición de **VoidZero por Cloudflare (2026-06-04)** los compromisos publicados —MIT perpetuo, neutralidad de vendor, fondo de USD 1M administrado por el core team— son **unilaterales y revocables**, no estructura vinculante. Ninguna de las tres fuentes primarias dice quién controla los derechos de publicación en npm.
- **Bus factor concentrado.** El núcleo de contribución de Vite era VoidZero, y hoy son todos empleados de un mismo empleador. La diversidad que el proyecto invoca está en la cola larga, no en el núcleo.
- **Clase de CVE recurrente:** 13 de 19 advisories históricos son bypasses de `server.fs.deny` o lectura arbitraria del **dev server**, sin SLA de respuesta publicado. Mitigable de raíz (ver punto 1 de la Decisión): todos exigen el dev server expuesto a la red.
- **Cloudflare también compró Astro** (2026-01-16). Globe corre en **GCP**: su cadena de build pasa a tener dueño que compite con su cloud. Contrapeso honesto: Next.js **no** depende de Vite, así que el escenario de captura más dañino no tiene target estructural.

**La conclusión operativa** es la que está en la Decisión punto 1: **el riesgo real no es Vite, es Rolldown** — y la respuesta correcta no es esquivarlo quedándose una major atrás, porque eso no lo evita, sólo lo **agenda para cuando el codebase sea grande**. Se entra por Vite 8 **en greenfield**, donde la superficie CJS es mínima y el costo de retroceder son horas, con las dos compuertas del Slice 0 y `7.3.x` como fallback escrito. Test de gobernanza a 12 meses: si a junio 2027 el fondo de USD 1M no desembolsó a mantenedores no-Cloudflare y no apareció fundación ni TSC, el riesgo de gobernanza sube de amarillo a naranja y esta ADR se revisa.

## Los 4 pilares

### Safety

El patrón actual es **activamente peor** para safety, no neutral: el archivo de 4.999 líneas que renderiza affordances gateadas por capability (`capabilityButton(...)`, estados `available|gated|blocked`, la taxonomía `house` que ADR-003 declara operator-only con `resolveRouteAudience` fail-closed a `client`) compila con `any` en todo lo que toca el DOM. Un tipado real cierra en compilación la clase "la UI muestra como disponible algo gateado" y "se filtra `house` a audiencia cliente". Agravante de scope: la superficie **sin sesión** (share) es la que hoy tiene menos estructura y más duplicación — es la que un atacante externo puede mirar en detalle.

La autoridad **no se mueve**: ADR-005 punto 4 sigue mandando — coverage es metadata, el enforcement es fail-closed en ingress/dispatch. Un bug de UI podía y sigue pudiendo *mentir visualmente*, nunca *conceder*. La CSP se preserva verbatim. El blast radius de la migración está contenido a la capa de render de un app: cero DB, cero IAM/WIF, cero Terraform, cero contrato de API.

### Robustness

El argumento más fuerte sale de la propia ADR-005: su Delta exige que `authentication_required`, `not_found`, `access_denied` y `dependency_unavailable` **no colapsen en un preview roto genérico**, y que `authentication_required` sea UX de reautenticación y no "falta el medio". Los cuatro códigos ya aparecen en el controlador (5/5/3/5 usos) — o sea el contrato se está sosteniendo **a mano, sin tipos, en 5.000 líneas imperativas**. Es exactamente la disciplina que se erosiona con cada slice. Un componente que recibe una **unión discriminada de estados** convierte el colapso en error de compilación. Señal de que la erosión ya empezó: `role="alert"` = **0**, así que hoy no existe el canal asertivo que `authentication_required` necesita para anunciarse (`state-design`: `role="alert"` para lo que el usuario debe reaccionar, `role="status"` para lo informativo).

### Resilience

**El riesgo real de esta decisión, declarado sin adorno.** El payload actual implementa comportamientos concurrentes difíciles y ya verificados en vivo: refresh de sesión single-flight con **a lo sumo un** reintento preservando body/correlation/idempotency; reconciliación del feed por watermark (`feed.live.changes`); cancelación de resultados tardíos por **epoch por operación**, para que elegir B nunca sea sobrescrito por la respuesta de A. Una reescritura puede regresarlos.

Mitigaciones, en orden: (a) están **descritos como contrato** en ADR-005 y en los invariantes de Globe, no sólo en el código; (b) el seam existe — `producer-client.ts` es una unidad separada, así que el transporte se porta antes que el render; (c) `producer-controller.test.ts` (1.065 líneas), `producer-ui.test.ts`, `producer:gvc:fixture` y `producer-ui-canary` son la red de regresión. Costo honesto: parte de esa suite prueba funciones que emiten strings y **se invalida** con el port; cada slice debe reponer cobertura equivalente **antes** de retirar la vieja, nunca después. Contrapeso: el share board hoy **no tiene ninguna** red de regresión visual, así que ahí la migración sólo puede sumar.

### Scalability

No es escalabilidad de tráfico (eso lo gobiernan `maxScale` y los stores durables, ya resueltos por `TASK-1465`/`TASK-1508`) sino **escalabilidad de producto**, que es la que decide si Globe funciona como producto comercial. El horizonte son tres superficies nuevas, todas client-facing, todas sin escribir. Construir el Structured Sequence Canvas —markup vectorial, anclas por revisión, máscaras no destructivas, *"inmediatez similar a Frame.io"*— como DOM imperativo serializado en un string no es un tradeoff: es inviable. Y el costo marginal de cada feature sobre el payload actual crece con el tamaño del controlador; sobre componentes, no.

## Dependencies & Impact

- **Depende de:** nada bloqueante. `assets.ts`, la CSP con nonce y el gate SSO existen y no cambian.
- **Impacta a:** `TASK-1552`/`TASK-1555` (aterrizan en el composer — coordinar para no portar dos veces); `TASK-1505` Slice 5 (UI del share, que debería nacer en el payload nuevo); `TASK-1547`, `TASK-1540`, `TASK-1548`, `TASK-1472` (nacen en el payload nuevo); `TASK-1526` (feed/viewer) por el slice de concurrencia.
- **No impacta:** ADR-004 en su parte de host (sigue diferida), ADR-005 puntos 3-4, ADR-009/ADR-010, la API Contract Spine, la infra.
- **Archivos owned por la migración:** `apps/studio-web/src/{ui,producer-ui,producer-controller,producer-client,public-share-ui}.ts` + el nuevo directorio de cliente + entradas nuevas en `assets.ts`.

## Roadmap por slices (strangler)

> **Mapeo de numeración — leer antes de citar un número de slice.** Este roadmap numera por
> **superficie**; `TASK-1556` numera por **paso de fundación**. No son off-by-one: el **Slice 0 de esta
> ADR** lo entregan los **Slices 1-3 de `TASK-1556`** (seam · tokens+copy · gates), y el **Slice 1 de
> esta ADR** (share board) es el **Slice 4 de la task**. Citá siempre "Slice N de `TASK-1556`" o
> "Slice N de ADR-014", nunca "Slice N" a secas — decir "implementado hasta el Slice 3" significa
> cosas opuestas en cada esquema.
>
> **Estado 2026-07-25:** el **Slice 0** está entregado (`bf1df21`…`4bf631e`) y el **Slice 1**
> está **SIRVIENDO** — el cutover se ejecutó y quedó verificado. Las otras cuatro superficies
> (`launch`, `studio`, `error`, `producer`) siguen en el payload legacy.
>
> La cadena de cutover que está más abajo **se conserva como registro**: documenta que encender una
> superficie de este programa **no es "un `apply`"**, y el próximo slice la va a necesitar entera.

- **Slice 0 — el seam + los gates + la validación de Vite 8.** Build Vite → assets servidos por `assets.ts` con nonce; módulo SSOT de tokens; lint de estilos (hex crudo = error) y de a11y. **Las dos compuertas de la Decisión punto 1 se resuelven acá y son criterio de salida**: (a) `react-router@8.3.0` funciona sobre Vite 8 (piso declarado `Vite 7+`, compat con 8 sin confirmar); (b) un **smoke de producción real** que ejercite las dependencias en el browser, no sólo CI. Cualquiera de las dos en rojo ⇒ **fallback a `vite@7.3.x` el mismo día**, registrado como Delta en esta ADR. Resto del criterio de salida: CSP, SSO, `pnpm check`, `pnpm build` y el canary verdes, y el flag apaga el payload nuevo sin dejar rastro.
- **Slice 1 — share board. ✅ SIRVIENDO (`TASK-1558`, cutover 2026-07-25).** La cara del cliente, primero. Sale del CSS de una línea, adopta el SSOT de tokens, deja de auto-rotularse "Producer", estrena su primer canary visual. Se arregla `/legal/terms` (o se saca el link). Lo que existe hoy: las seis primitives base (inventario abajo), los tokens de tipografía en el SSOT (`--font-display`/`--font-body`, escala de cuatro pasos, pesos derivados de `GLOBE_FONT_FACES`), el gate de diseño extendido a tipografía y a pesos sin `@font-face` —y caminando `.css` además de `.ts`/`.tsx`— y un canary visual de **seis estados × tres anchos** (1440×1000, 390×844, 320×844) con assertion de no-fuga sobre el **HTML servido** (sin slug, `house`, costo, margen, "Producer", ISO 8601 ni enum crudo), que encontró dos bugs reales antes del commit. Scorecard 4,71 promedio, piso 4, cinco dimensiones en 5. **LIVE y verificado 2026-07-25** (revisión `00071-6vp`, imagen `85dac33b03b1`): el flag quedó cableado
(`cloud_run_services.tf` + `variables.tf`), la imagen contiene `TASK-1556`+`1558`+`1562`, y
`GLOBE_CLIENT_APP_ENABLED = "true"` está en el spec de la revisión viva. `/shares/*` sirve
`/assets/app/index-*.js` —el bundle cliente, no `public-share-ui.ts`— y el asset llega por CDN con hit
de edge, así que `TASK-1557` y `TASK-1558` se validan mutuamente en vivo por primera vez.

**React monta bajo la CSP estricta real con CERO errores de consola**, desktop 1440 y mobile 390, sin
scroll horizontal en ninguno, con Geist cargando desde el `@font-face` del SSOT. Cero fugas en 7 sondas
sobre el HTML servido. Y "Reintentar" está **correctamente ausente** en un estado no reintentable: la
regla de estados operando en producción, no en un test.

🔴 **Lo que NO está verificado, y no puede automatizarse:** que una pieza real renderice, el transporte
del grant (fragmento → header → resolve), que el token desaparezca de la barra, que **la hidratación de
`TASK-1562` efectivamente llegue**, y los estados vencido/revocado. El token del grant se guarda como
`hashSecret(token)`, así que **ningún share existente tiene token recuperable** desde la DB, y crear uno
requiere sesión de Globe por OAuth. **Los 6 puntos de verificación del runbook necesitan una persona —
es una propiedad permanente del diseño, no una limitación temporal.**
- **Slice 2 — launch + error.** Superficies públicas, chicas, sobre los mismos tokens. Un 404 en un browser deja de ser JSON.
- **Slice 3 — composer.** La superficie interna más caliente (`TASK-1552`/`TASK-1555` aterrizan ahí).
- **Slice 4 — feed + viewer.** El slice de concurrencia: watermark, epoch, refresh de sesión. Los contratos del Delta de ADR-005 entran como asserts, no como comentarios.
- **Slice 5 — library, colecciones, batch; y retiro.** Se eliminan `producer-controller.ts`, `producer-client.ts` y los cuatro `:root`; `studio-web` queda como BFF puro + serving. El flag se retira con el código.
- **Fuera del strangler:** Storyboard (`TASK-1547`), Video Effectiveness (`TASK-1540`) y delivery (`TASK-1472`) **no se portan** — nacen en el payload nuevo.

### La cadena real del cutover — EJECUTADA 2026-07-25 (se conserva como registro)

**Encender el share board NO era un `tofu apply`.** Se creía que sí —lo decía la propia `TASK-1558`— y
era falso. Los seis pasos se ejecutaron completos; esto queda escrito porque **el próximo slice los va
a necesitar enteros**, y porque el modo de falla que evitó vale más que el resultado. Lo verificado hoy sobre `main` de `efeonce-globe`:

- `client_app_enabled` aparece **una sola vez** en todo `infra/terraform/`: su propia declaración en
  `variables.tf:188`. **No está cableado a ningún recurso.**
- `GLOBE_CLIENT_APP_ENABLED` no aparece en ningún `.tf` ni en el spec del Cloud Run
  `globe-studio-internal`.
- La imagen desplegada (`45235ccb62ca`) es **anterior** al commit de `TASK-1556`: no tiene el bundle,
  no tiene `renderShell` y no lee esa variable.
- Por lo tanto, cambiar el default a `true` y correr `tofu apply` daría **plan vacío** y producción
  idéntica. Es exactamente el modo de falla de `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` en Greenhouse:
  el registro dice ON y la realidad es OFF, en silencio.

**La cadena, en este orden:**

1. Cablear `GLOBE_CLIENT_APP_ENABLED = tostring(var.client_app_enabled)` en el `.tf` del servicio.
2. `TASK-1562` — hidratación de la proyección del share.
3. Desplegar `origin/main` vía `deploy-internal.yml` (**requiere autorización humana**).
4. Flip del default a `true` + `tofu apply`.
5. Verificar con un grant real, contra el servicio vivo.
6. Retirar el legacy (`TASK-1560`).

**Por qué `TASK-1562` va antes del flip, y por qué no es cosmética.** Hidrata `modelLabel`,
`reviewStatus` y `comments`: **el grant los pide, el dominio los proyecta y el operador puede
crearlos**, pero `resolveForShare` devuelve sólo `{ target, mediaType }` y los descarta en silencio en
**todos** los shares de producción. El board viejo tapaba el agujero con un `if (!value) continue` que
nunca ve un valor; el board nuevo, al declarar "Sin dato", **destapó un bug que llevaba tiempo ahí — no
lo introdujo**. Sin `1562`, el cutover cambiaría "sin panel" por "panel con tres huecos declarados" en
la **única** superficie que ve un cliente externo.

## Las primitives nacidas — inventario y **propuesta** de promoción (TASK-1558, 2026-07-25)

`TASK-1556` declaró estas primitives y **deliberadamente no las construyó**: diseñar una librería de
componentes sin una superficie a la que sirva es cómo se llega a doce props que nadie usa. Nacieron
sirviendo al share board.

**Su promoción a primitives de plataforma se PROPONE, no se asume.** Una primitive con un solo
consumer es una **hipótesis** de reutilización, no un hecho — y lo único que la convierte en hecho es
el segundo consumer. Hasta entonces, "primitive" es una aspiración sobre un componente local.

| Primitive | Qué es | Estado |
|---|---|---|
| `Chip` | Marcador de estado no interactivo | Propuesta |
| `Eyebrow` | Rótulo pequeño sobre un bloque | Propuesta |
| `FactList` | Pares dato/valor | Propuesta |
| `CommentList` | Hilo de comentarios con marca temporal | Propuesta |
| `StateBlock` | Bloque de estado con acción opcional | **La más probable** de promover: los estados aparecen en toda superficie |
| `MediaStage` | Presentación de la pieza (imagen/video/audio) | Propuesta |

**Lo que NO se construyó, y por qué importa más que lo que sí:** el scope listaba una primitive
`Surface`. La dirección aprobada no la necesita — el riel de lectura se separa con **una línea** y no
tiene fondo propio, precisamente para que la página nunca apile una tarjeta sobre otra. Entregar un
`Surface` sin uso habría invitado a la siguiente superficie a envolver todo en él, que es exactamente
la composición que la dirección rechaza. Llega cuando una superficie realmente lo necesite.

**Frontera dura, sin excepciones:** acá **no** se importan primitives de Greenhouse, `CompositionShell`,
MUI ni AXIS, y nunca se van a importar. Globe materializa sus propios tokens y componentes (punto 8 de
esta ADR y `TASK-1540`). Compartir la librería de UI entre los dos productos ataría el ritmo de
evolución de uno al del otro.

**Cómo se promueve una:** cuando una segunda superficie la consuma **sin modificarla**. Si el segundo
consumer necesita una prop nueva, eso no es promoción — es la señal de que la abstracción todavía no
estaba lista, y la prop nueva es la evidencia.

## Reglas duras

- **NUNCA** reintroducir `Function.prototype.toString()` para serializar código de browser, ni tunelear copy/tokens como parámetros JSON por falta de imports.
- **NUNCA** declarar tipos DOM como `any` ni shims de `document`/`window` a mano: el payload compila con `lib.dom` y el `strict` del monorepo.
- **NUNCA** escribir una superficie humana nueva de Globe como template de string a partir de esta ADR.
- **NUNCA** declarar un `:root` de tokens fuera del módulo SSOT, ni un color literal en una superficie: el hex crudo es error de lint, no advertencia. Cambiar un color de marca se hace en **un** lugar.
- **NUNCA** dejar una superficie client-facing sin canary visual: el share board fue durante meses la única cara comercial de Globe y no tenía ninguno.
- **NUNCA** mover el host, la sesión, el BFF ni el trust boundary dentro de esta migración: ADR-005 puntos 3 y 4 siguen normativos y un cambio ahí necesita su propia ADR. El share conserva token-en-fragment + header `Globe-Share` + `credentials:'omit'`.
- **NUNCA** aflojar la CSP para acomodar el bundle: se sirve con `nonce`, jamás `'unsafe-inline'` ni `'strict-dynamic'` sin ADR nueva.
- **NUNCA** meter lógica de autoridad en el cliente: coverage sigue siendo metadata y el enforcement vive en ingress/dispatch. La audiencia `client` sigue omitiendo `house` por `resolveRouteAudience`, server-side.
- **NUNCA** colapsar `authentication_required` / `not_found` / `access_denied` / `dependency_unavailable` en un estado genérico (Delta ADR-005): el componente recibe unión discriminada, y lo que exige reacción del usuario se anuncia con `role="alert"`, no `role="status"`.
- **NUNCA** devolver JSON crudo a una ruta que un browser puede pedir: si es alcanzable por navegación, tiene página.
- **NUNCA** dejar que el bundle sea requisito para leer la propuesta de valor o para autenticarse.** Con SSR apagado, la superficie pública de entrada (`launch`) debe emitir su **first fold crítico —logo, headline, CTA y poster— como contenido estático del shell HTML** que sirve `studio-web`, y la app hidrata encima sin reflow. Descubierto al auditar `TASK-1524`, cuyo requisito *"el CTA está disponible sin esperar JS"* colisiona de frente con una SPA ingenua. Aplica a `launch` y `error`; **no** aplica a las consolas autenticadas, donde el bundle es la aplicación.
- **NUNCA** importar primitives, `CompositionShell`, MUI o AXIS de `greenhouse-eo` dentro de Globe (`TASK-1540`): los tokens se materializan en Globe.
- **NUNCA** retirar una superficie vieja antes de que su reemplazo tenga cobertura equivalente (test + canary + fixture): la migración no puede reducir la red de regresión.
- **NUNCA** dejar el estado real del flag en `terraform.tfvars` (gitignoreado): se declara en `variables.tf` con default `false`.
- **NUNCA** tratar el flip de `client_app_enabled` como "un `apply`". Antes del flip hay que verificar que la variable esté **cableada a un recurso** (`grep` en `infra/terraform/` debe devolver más que su propia declaración) y que la **imagen desplegada** contenga el payload. Un flag declarado y no cableado produce plan vacío: el registro queda diciendo ON con producción sirviendo lo viejo.
- **SIEMPRE** importar los tipos del cliente desde `packages/contracts`; jamás redeclarar shapes en el payload.
- **SIEMPRE** portar por slice: transporte primero, render después, retiro al final. Y client-facing antes que interno.

## Lo que deliberadamente NO se decide

- **El host del frontend comercial.** Sigue diferido por ADR-004 punto 3, con Vercel + Next como candidato vivo, a decidirse antes de `TASK-1480`. Esta ADR sólo hace que esa decisión siga siendo **posible**.
- **Si Globe adopta light mode.** Hoy es dark-only (`prefers-color-scheme` = 0) y nunca se decidió como producto; dark-first es legítimo (Linear, Vercel). Se declara como **decisión pendiente** de la superficie cliente, no como defecto, y el SSOT de tokens del Slice 0 debe nacer capaz de expresar el segundo ramp sin refactor.
- **Si Globe llega a consumir un paquete de UI compartido con Greenhouse.** Sería una decisión de frontera cross-repo con su propia ADR, y hoy `TASK-1540` la prohíbe. Mientras exista un solo consumidor, cualquier reutilización cross-repo es **hipótesis, no hecho**.
- **Si el Sequence Canvas necesita una capa canvas/WebGL** encima del DOM: lo decide `TASK-1547` con su Discovery. Dato para ese Discovery: las herramientas de esa clase (Figma y equivalentes) **renderizan a canvas, no a DOM**, y el camino trillado en React es una capa tipo `react-konva` u homóloga; la elección de framework de esta ADR no prejuzga esa capa, sólo la habilita.
- **Si alguna superficie llega a necesitar SSR de verdad.** Esta ADR **no cierra** Next.js self-hosted: la Adapter API estable (2026-03-25) y `next start` lo volvieron una opción legítima fuera de Vercel. Se rechaza hoy porque colisiona con el BFF existente, no porque sea inviable. Si esa necesidad aparece, supersede con ADR nueva.
- **Si alguna superficie de Globe llega a necesitar SSR.** Hoy no: consolas autenticadas y un share board de un solo activo, ninguno indexable.
- **La librería de estado/data-fetching del cliente:** la elige `TASK-1556` en Discovery, contra los contratos de feed/session existentes.

## Gatillos de revisión

- **Host comercial:** el de ADR-004, sin cambios — antes de `TASK-1480` Production.
- **Si el Slice 4 no logra reproducir los invariantes de concurrencia** (watermark, epoch, single-flight) con cobertura equivalente: detener el strangler, dejar feed/viewer en el payload viejo y reabrir esta ADR con la evidencia.
- **Si `TASK-1480` da go antes de que los slices client-facing (1 y 2) estén cerrados:** el share board se expone comercialmente en su estado actual — reabrir prioridades, no continuar por inercia.
- **Si aparece la necesidad de SSR/edge o de light mode en una superficie humana:** supersede con ADR nueva; nunca reescribir el historial.

## Delta 2026-07-25 — El Producer se reconstruye source-led, y el retiro se mide por capacidad ejecutable

> **Qué cambia:** el Slice 3 (composer) y el Slice 4 (feed + viewer) de esta ADR dejan de describirse como
> *ports* del payload vanilla y pasan a ser trabajo **`source-led`** contra `approved-prototype.dc.html`.
> El criterio de retiro del payload viejo pasa de "cuando el feed porte" a **paridad de capacidad
> verificada por un test ejecutable**. Lo que NO cambia: el orden client-facing-primero, el flag, el
> trust boundary, ni ninguna de las reglas duras de arriba.

### La evidencia que fuerza el cambio

Medido el 2026-07-25 contra el repo, no contra la doc:

| Hecho | Medición |
|---|---|
| Contratos `producer`/`lab`/`credits`/`run` que existen server-side | **74** |
| Contratos que el payload vanilla efectivamente **despacha** | **38** |
| Contratos que el vanilla **gatea y NUNCA despacha** (promesas muertas) | **12** |
| Contratos con contrato server-side y cero consumidores | ~24 |

> #### 🔴 Corrección del mismo día — decía 12 y son 38
>
> La primera versión de este Delta afirmaba **12**, y estaba mal. El error tiene interés porque el modo de
> fallar es sutil: `producer-client.ts` es el **transporte** y expone métodos tipados para un puñado de
> capabilities más un `reader(id, query)` / `command(id, payload)` **genérico**. La UI
> (`producer-controller.ts`) usa ese camino genérico para **29 capabilities más**, pasando el id como
> argumento — ninguna aparece como literal en el transporte.
>
> Medí el transporte, vi 15 strings, y declaré 12 tras excluir 3. El inventario de paridad y su drift guard
> heredaron el error: **el guard pasaba en verde porque medía el archivo que yo elegí, no la realidad.** Es el
> anti-patrón de *"el gate es el test de regresión del primer consumidor"* aplicado a mi propio gate.
>
> **Consecuencia si no se corregía:** `TASK-1560` habría podido borrar el payload viejo con el reemplazo
> cubriendo 12 de 38 — retirando una superficie cuya capacidad el sucesor no tiene. Ahora el guard lee los dos
> archivos y clasifica por camino de despacho, con un piso numérico que atrapa la re-subestimación.
>
> **Y el argumento estratégico se debilita, así que se corrige también:** decir "el vanilla es un subconjunto
> chico, rebuildearlo arriesga poco" era más fuerte de lo que la evidencia sostiene. 38 de 74 es la mitad del
> target, no una fracción menor. La decisión `source-led` **se mantiene** —el prototipo sigue siendo la
> autoridad de forma, y el vanilla nunca implementó las 74— pero el riesgo de perder capacidad al reconstruir
> es mayor de lo que declaré, y por eso `TASK-1564` lleva una regla de reconciliación explícita de cinco
> clases en vez de un juicio caso por caso.

Las 38 viven enumeradas, con su razón y la **superficie** que las tiene que cubrir, en
`apps/studio-client/src/data/legacy-parity.ts`. El reparto: composer 14 · viewer 6 · library 6 · credits 4 ·
feed 4 · review 4. O sea **el composer es el cuello de botella del retiro**, y eso es un dato, no una
intuición.

Y lo que la UI aprobada muestra como acción con contrato ya construido y **cero** consumidores:
`lab.experiment.relaunch` (Recrear) · `lab.experiment.children`/`.tree` (Serie) ·
`producer.review.share.create` (Compartir board) · `lab.experiment.variate` ·
`producer.style.*` (5, estilos/presets) · `producer.library.*` (14, biblioteca/colecciones/bulk/export) ·
`lab.prompt.enhance`/`.history` · `feed.live.list`/`.changes` (el feed vivo).
Sin contrato todavía: sólo el retoque regional (`TASK-1497`, `in-progress`).

**La lectura correcta no es "el diseño está adelantado al backend". Es la inversa: el backend corrió
adelante y el payload vanilla es el cuello de botella.** Esa inversión es la que invalida el encuadre de
port: portar el vanilla congela una fracción del target aprobado y deja ~60 contratos gobernados sin
consumidor, que es precisamente el modo de falla que ADR-004 describía —*"freezes an accidental pilot
into architecture"*— aplicado a la capa de UI.

### Decisión

1. **El feed, el viewer y el composer se construyen `source-led` contra `approved-prototype.dc.html`**
   (`docs/ui/visual-sources/TASK-1505/`, SHA-256 `7d0d689b…10e93f`, verificado). Su README ya declara la
   autoridad: *"the complete approved target… not permission to reduce scope"*. El payload vanilla deja de
   ser la referencia visual y queda reducido a **una sola función**: la lista de 12 contratos que el
   reemplazo tiene que seguir llamando.
2. **Los invariantes temporales se portan del vanilla, no del prototipo.** El prototipo es un HTML con
   fixtures: no tiene watermark, ni epoch, ni refresh single-flight. Esos tres viven en
   `producer-client.ts` y son lo único genuinamente irreemplazable de ese archivo. Ya están portados con
   18 tests (`TASK-1559` Slice 1, `85c0d1f`).
3. **La convivencia se resuelve por RUTA, no por flag.** `client_app_enabled` ya está en `true` desde el
   cutover del share board, así que un flag global ya no puede separar las dos generaciones del Producer.
   El vanilla conserva `/producer`; el payload nuevo crece en rutas propias hasta alcanzar paridad.
4. **El retiro del payload viejo (`TASK-1560`) se gatea por PARIDAD DE CAPACIDAD EJECUTABLE.**

### El criterio de retiro, y por qué no es un grep

La primera versión de este criterio era "cuando un `grep` encuentre las 12 capabilities en el payload
nuevo". **Está mal, y vale registrar por qué:** un `grep` prueba que el string aparece en el archivo, no
que exista una llamada, que sea alcanzable, ni que esté autorizada. Pasaría con el id escrito en un
comentario. Es el anti-patrón de *"el gate es el test de regresión del primer consumidor"*: un gate que se
satisface editando texto no mide capacidad.

El criterio canónico:

- **`LEGACY_PRODUCER_CAPABILITY_PARITY`** — un array declarado en `apps/studio-client/src/data/`, con los
  12 ids **y la razón de cada uno**, que es el inventario contra el que se mide.
- **El test recorre ese array y ejercita el dispatch del payload nuevo**, afirmando que cada id sale
  efectivamente a la red con su forma correcta (reader vs command, idempotency donde aplique). Un id sin
  camino de llamada **falla el test**, no pasa por estar escrito.
- **Un drift guard** afirma que el inventario declarado coincide con lo que el vanilla llama de verdad, así
  que agregar una capability al vanilla sin agregarla al inventario rompe el build en vez de erosionar el
  criterio en silencio.
- El retiro **no** exige paridad con las 74. Exige paridad con las **12** más los tres invariantes
  temporales cubiertos. Todo lo demás que la UI aprobada promete es trabajo nuevo, no deuda de port, y no
  puede bloquear el retiro de un archivo que tampoco lo hacía.

### Alternativas rechazadas

| Alternativa | Decisión |
|---|---|
| **Portar el feed vanilla tal cual y llamarlo paridad** | **Rechazada — se intentó y falló el 2026-07-25.** El resultado tenía 4 de ~15 elementos de la card y 0 de sus 8 acciones. Y el fallo de método fue peor que el resultado: se construyó desde un fragmento de CSS en vez de desde la superficie renderizada, y se declaró "geometría preservada" sin haber capturado nunca la línea base. Registrado en `85c0d1f`. |
| **Rehacer todo desde el prototipo, ignorando el vanilla** | **Rechazada.** Perdería los tres invariantes temporales, que el prototipo no tiene porque usa fixtures. Son el activo real de ese archivo y su regresión es silenciosa. |
| **Retirar el vanilla cuando el nuevo "esté completo"** | **Rechazada por infalsable.** "Completo" contra 74 contratos no llega nunca, y el vanilla nunca los cumplió. El criterio tiene que ser lo que el vanilla efectivamente hace. |
| **Separar por flag en vez de por ruta** | **Rechazada por el hecho.** El flag global ya está en `true`; separar dos generaciones del Producer con él exigiría un segundo flag, que es una palanca por superficie disfrazada de palanca de payload. |
| **Retirar `/producer` y redirigir al nuevo antes de la paridad** | **Rechazada.** Es el big bang que la regla dura de esta ADR prohíbe: no se retira una superficie vieja antes de que el reemplazo tenga cobertura equivalente. |

### 4-Pillar Score

#### Safety

- **Qué puede salir mal:** el payload nuevo consume un contrato que el vanilla no consumía y expone una
  capacidad que nadie autorizó como visible, o renderiza un identificador de wire al lado equivocado de la
  frontera de audiencia.
- **Gates:** cada capability sigue gateada server-side por su propia autorización — la UI nueva no puede
  ampliar nada. **Frontera de audiencia nueva y verificada:** `ProducerLiveFeedRouteLabelV1` es
  `{ routeId, model? }`, o sea que el item del feed **transporta el slug de wire**; se renderiza
  `model.name`/`version` y nunca `routeId`. Es el mismo hallazgo que `TASK-1562` hizo en la proyección del
  share, un nivel más arriba.
- **Blast radius si sale mal:** una superficie interna del Producer, tenant Efeonce. No cruza a cliente:
  el share board es la única superficie client-facing y es otra ruta con otro payload.
- **Verificado por:** assertion de no-fuga en el canary sobre el DOM servido (mismo patrón que
  `globe-share-board-canary.mjs`) + el test de paridad, que afirma qué se llama y por lo tanto también
  qué NO.
- **Riesgo residual:** el prototipo aprobado promete acciones cuya autorización fina todavía no está
  mapeada a capability visible (Serie, Compartir board). Se construyen **gated**, y una acción sin
  capability resuelta se renderiza como no disponible con su razón — nunca como ejecutable.

#### Robustness

- **Idempotencia:** obligatoria por construcción en el transporte nuevo — un `command` sin
  `idempotencyKey` falla en la llamada y no sale a la red. `execute` gasta; que sea imposible de escribir
  vale más que detectarlo en el ledger.
- **Atomicidad:** sin cambio. Las transacciones viven server-side; el browser no compone escrituras.
- **Protección de carrera:** epoch por operación (una respuesta superada se descarta) + refresh
  single-flight keyed por epoch con ≤1 reintento + reconciliación por `stableKey` donde gana la `revision`
  más alta, así que la entrega fuera de orden no revierte la pantalla.
- **Cobertura de invariantes:** 18 tests en `producer-feed-reconciler.test.ts` y
  `governed-transport.test.ts`, incluida la concurrencia (N llamadas con sesión rotada → un refresh, un
  reintento cada una, body/correlation/idempotency preservados).
- **Verificado por:** esos tests + el drift guard del inventario de paridad.

#### Resilience

- **Política de reintento:** acotada y explícita — un reintento después de un refresh exitoso, y ninguno
  más. Ante timeout de un command que gasta: **leer estado primero**, nunca reintentar a ciegas.
- **Dead letter:** no aplica en el cliente; el trabajo durable vive en `governed-run-lifecycle`.
- **Señal de fiabilidad:** el ciclo del feed se reprograma **siempre**, incluso tras un fallo — un feed que
  deja de reanudar tras el primer 503 se congela sin decirlo, que es peor que un reintento de más. El
  fallo de lectura del hilo se loggea en vez de callarse.
- **Trail de auditoría:** sin cambio — el audit vive server-side por command.
- **Recuperación:** una marca que el backend ya no reconoce **invalida el watermark** y fuerza `list`
  completo; perder el delta explícitamente es correcto, aplicar uno inválido saltearía en silencio.
- **Degradación honesta:** cuatro estados distinguibles (`loading`/`empty`/`degraded`/`denied`), con
  Reintentar **sólo** donde reintentar puede funcionar.

#### Scalability

- **Big-O del camino caliente:** el feed pasa de `O(n)` por ciclo —`asset.list` completo cada vez, que es
  lo que hace hoy— a `O(delta)` con `feed.live.changes`. Es la mejora principal y es la razón por la que
  el reader existía.
- **Cobertura de índice:** sin cambio; los readers son server-side y ya paginados por cursor.
- **Caminos async:** sin cambio.
- **Costo a 10x:** sub-lineal respecto de hoy, porque el volumen por ciclo deja de depender del tamaño del
  feed y pasa a depender de la tasa de cambio.
- **Paginación:** por cursor (`nextCursor`), no `OFFSET`. El tope de la reconciliación
  (`MAX_SHARE_COMMENTS` es del share; el feed usa `nextCursor` + su propio límite) acota la respuesta.

### Reglas duras que agrega este Delta

- **NUNCA** describir trabajo del Producer como "port" desde el payload vanilla: el vanilla es una
  fracción del target aprobado (38 de 74 contratos, corregido de un 12 mal medido) y tratarlo como referencia
  congela esa fracción.
- **NUNCA** construir una superficie del Producer sin haber capturado antes su línea base **renderizada**.
  Un fragmento de CSS no es la superficie, y declarar "geometría preservada" sin before/after es una
  afirmación no falsable.
- **NUNCA** gatear el retiro del payload viejo con un criterio satisfacible editando texto (un `grep`, un
  comentario, una constante). El criterio es un test que ejercita el dispatch.
- **NUNCA** renderizar `routeId` en una superficie del Producer: el ancla pública es `route.model`, y el
  `routeId` es el identificador de wire que ADR-003 mantiene afuera.
- **NUNCA** encodear `producer` en el contrato de una primitive nacida en este trabajo: Storyboard
  (`TASK-1547`) y Video Effectiveness (`TASK-1540`) son consumidores futuros, y mientras haya un solo
  consumidor la reutilización es hipótesis, no hecho.
- **SIEMPRE** portar los invariantes temporales **desde el vanilla** y la forma visual **desde el
  prototipo**. Son dos fuentes distintas para dos preguntas distintas, y confundirlas es lo que produjo el
  intento fallido del 2026-07-25.

### Lo que este Delta deliberadamente NO decide

- **El alcance del composer.** Es el otro consumidor grande del prototipo aprobado y de los ~60 contratos
  sin consumidor (`prompt.enhance`, `prompt.history`, `style.*`, `recipe.*`, `reference.analyze`,
  `experiment.variate`). Necesita su propia evaluación de alcance: `TASK-1552` y `TASK-1555` ya aterrizaron
  ahí sobre el payload viejo, así que hay trabajo desplegado que este Delta no puede reencuadrar sin leerlo.
- **Si el retoque regional entra en la primera generación del feed nuevo.** Depende de `TASK-1497`, que no
  tiene capability todavía.
- **Si la biblioteca (`producer.library.*`, 14 contratos) es parte del feed o una superficie hermana.** El
  prototipo las muestra juntas; el contrato las separa.

### Estado de los slices — 2026-07-25

| Slice de esta ADR | Superficie | Estado |
|---|---|---|
| 1 | Share board (client-facing) | **LIVE** — revisión `globe-studio-internal-00071-6vp`, imagen `85dac33b03b1` |
| 2 | Hidratación de la proyección del share | **LIVE** (`TASK-1562`) |
| 3 | Composer | **no empezado** — es el próximo, y es donde se cobran los ~60 contratos sin consumidor |
| 4 | Feed + viewer | **code complete, rollout pendiente** (`TASK-1559`): 4 slices cerrados y verificados en browser; falta push a `main` + deploy |

**El Slice 4 no reemplaza `/producer`.** Vive en `/producer/feed` y `/producer` sigue sirviendo el vanilla,
por una razón que vale escribir acá y no sólo en la task: **el payload nuevo todavía no tiene composer**.
Servirlo en `/producer` dejaría a un operador interno sin la superficie que gasta creditos — una regresión de
capacidad disfrazada de migración. El reemplazo de `/producer` es un evento único, después del Slice 3, y se
gatea por el criterio ejecutable de `legacy-parity.ts`.

**Consecuencia para el rollback del Slice 4:** `client_app_enabled` ya no sirve como interruptor — está en
`true` desde el Slice 1, así que apagarlo apagaría el share board del cliente. El rollback de una ruta
aditiva es revertir su commit y redeployar, y eso es aceptable *porque* es aditiva: no toca ninguna
superficie existente. Un slice que sí modificara `/producer` necesitaría otro interruptor antes de shippear.
