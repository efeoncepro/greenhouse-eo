# Efeonce Globe — Client Application Decision V1

- **Decision:** ADR-014
- **Status:** Accepted — implementación gated por `TASK-1556`; el host comercial sigue diferido por ADR-004
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

- **Slice 0 — el seam + los gates + la validación de Vite 8.** Build Vite → assets servidos por `assets.ts` con nonce; módulo SSOT de tokens; lint de estilos (hex crudo = error) y de a11y. **Las dos compuertas de la Decisión punto 1 se resuelven acá y son criterio de salida**: (a) `react-router@8.3.0` funciona sobre Vite 8 (piso declarado `Vite 7+`, compat con 8 sin confirmar); (b) un **smoke de producción real** que ejercite las dependencias en el browser, no sólo CI. Cualquiera de las dos en rojo ⇒ **fallback a `vite@7.3.x` el mismo día**, registrado como Delta en esta ADR. Resto del criterio de salida: CSP, SSO, `pnpm check`, `pnpm build` y el canary verdes, y el flag apaga el payload nuevo sin dejar rastro.
- **Slice 1 — share board.** La cara del cliente, primero. Sale del CSS de una línea, adopta el SSOT de tokens, deja de auto-rotularse "Producer", estrena su primer canary visual. Se arregla `/legal/terms` (o se saca el link).
- **Slice 2 — launch + error.** Superficies públicas, chicas, sobre los mismos tokens. Un 404 en un browser deja de ser JSON.
- **Slice 3 — composer.** La superficie interna más caliente (`TASK-1552`/`TASK-1555` aterrizan ahí).
- **Slice 4 — feed + viewer.** El slice de concurrencia: watermark, epoch, refresh de sesión. Los contratos del Delta de ADR-005 entran como asserts, no como comentarios.
- **Slice 5 — library, colecciones, batch; y retiro.** Se eliminan `producer-controller.ts`, `producer-client.ts` y los cuatro `:root`; `studio-web` queda como BFF puro + serving. El flag se retira con el código.
- **Fuera del strangler:** Storyboard (`TASK-1547`), Video Effectiveness (`TASK-1540`) y delivery (`TASK-1472`) **no se portan** — nacen en el payload nuevo.

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
