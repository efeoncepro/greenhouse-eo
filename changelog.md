# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-07-26 — Customer Model Operator para Codex y Claude

- Se creó la skill transversal `efeonce-customer-model-operator` en `.codex/skills/` y `.claude/skills/`.
- Se cubrieron ICP, segmentación, beachhead, JTBD, triggers, WTP, buyer personas, buying group, stakeholder map,
  decision/paper process, procurement readiness, qualification, evidence, adopción, retención, expansión y gates.
- Se añadió el `Customer Model Integrity Pack` reusable, con evidence ledger, confidence, owners, falsadores y handoffs.
- Business model, GTM, commercial, research, pricing y agency quedaron conectados a la nueva capa; las ofertas concretas
  siguen siendo responsables de aportar evidencia y mantener sus boundaries.

## 2026-07-26 — Pricing transversal para Codex y Claude

- Se creó la skill agnóstica `efeonce-pricing-operator` en `.codex/skills/` y `.claude/skills/`.
- Se consolidaron patrones investigados de value-based/cost-floor pricing, productized services, capacity,
  managed delivery, T&M/fixed/milestone/usage/outcome/hybrid, credits, AI cost controls, margin waterfall,
  discount governance, versionado y validación.
- Business model, GTM, commercial, Finance, Creative Practice y SEO/AEO Practice quedaron enrutados al companion;
  sus reglas específicas siguen siendo dueñas de sus respectivas líneas.

## 2026-07-26 — Primera aplicación de pricing a Wave

- Se probó `efeonce-pricing-operator` sobre las cinco familias de Wave y sus seis delivery models.
- Se creó `docs/business-models/wave/WAVE_PRICING_INTEGRITY_PACK_V1.md` con métricas candidatas, revenue
  architecture, economics, experimentos y gates de aprobación.
- El resultado es `hypothesis_only`: no se aprobaron tarifas, claims, márgenes ni venta general.

## 2026-07-26 — Pricing específico para Search Visibility 360

- Se creó `SEARCH_VISIBILITY_360_PRICING_INTEGRITY_PACK_V1.md` como aplicación específica de la skill general de
  pricing a Search Visibility 360.
- El pack separa diagnóstico, foundation, operación, transparencia/plataforma, capacidad de contenido y expansión;
  evita usar artículos como unidad pública y trata SEO+AEO como producto integrado.
- Verdict: `hypothesis_only`, pendiente de Finance, evidencia de willingness-to-pay, capacidad y aprobación comercial.

## 2026-07-26 — Business Model Integrity Pack para Search Visibility 360

- Se creó `SEARCH_VISIBILITY_360_BUSINESS_MODEL_INTEGRITY_PACK_V1.md` para completar customer/value, oferta, delivery,
  revenue, economics, data/IP, evidence, scale y capital sin convertir hipótesis en decisiones.
- El modelo canónico ahora enlaza su Integrity Pack y mantiene `Draft`; el verdict actual es `model_incomplete`.

## 2026-07-25 — Wave portfolio y boundaries documentados

- Se formalizó Wave como marca de producto de Efeonce para cinco familias: Search Visibility 360, Web Experience 360,
  Measurement & Analytics, Agent Systems & Platforms y Digital Automation & Integrations.
- Se fijó que CRM/RevOps pertenece a Efeonce Digital/Kortex; Wave sólo entrega capas técnicas conectadas.
- Se documentó la frontera con Globe (contenido/producción) y Reach (medios/distribución), manteniendo Efeonce como
  masterbrand externa.
- Canon: `docs/architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md` y
  `docs/business-models/wave/WAVE_BUSINESS_MODEL_V1.md`.
- Se separaron product service, delivery model, engagement, operating mode y composición del ecosistema; Wave puede
  operar Managed Squad, Staff Augmentation y otros modelos sin cambiar el ownership de la oferta.

## 2026-07-25 — Globe: el payload de browser deja de ser un string (ADR-014, foundation)

`TASK-1556` cerrada. Nació `apps/studio-client` en `efeonce-globe` (Vite + React + React Router, SSR
apagado) compilando a assets estáticos que sirve el **mismo** `studio-web`; host, BFF, sesión SSO, CSP por
nonce, ALB y API privada sin tocar. Con el flag `client_app_enabled` en `false` **ningún comportamiento
cambia**: es fundación, no superficie.

Globe estrena SSOT de tokens con drift ledger, capa de copy locale-keyed, ESLint acotado (jsx-a11y +
rules-of-hooks) y 3 gates de diseño como tests — los 6 verificados **mordiendo**. React Compiler activado.
Las dos compuertas de la ADR cerraron verdes, así que el fallback a `vite@7.3.x` se retira.

El share board, la única superficie que ve un cliente, se separó a `TASK-1558`: necesita dirección visual
aprobada y no existe.

## 2026-07-25 — Globe: `/assets/*` sale por CDN (TASK-1557)

Carril CDN acotado a `/assets/*` sobre el ALB existente, aplicado y verificado en vivo con hits del
edge. El backend del shell SSO conserva `enable_cdn = false` y el path matcher es un allowlist cuyo
default apunta al backend sin caché: si una regla no matchea, el request cae hacia el lado seguro.
La política de caché la sigue declarando el origen (`USE_ORIGIN_HEADERS`), para no crear una segunda
fuente de verdad. Nada autenticado se cachea, verificado path por path.

## 2026-07-25 — Globe: /producer convertido a React y el bug que dejaba todo command inoperante

- Header y composer de `/producer` convertidos 1:1 reutilizando `producerStyles` verbatim: selector de flota
  con isotipo real y filtrado por modalidad, formato de salida con chips y stepper, Sugerencias, presets,
  Seed y Modo. `/producer` sigue en legacy (flag en `false`).
- Causa raíz: el transporte inventaba la cabecera `x-globe-idempotency-key`; la plataforma usa
  `x-idempotency-key`. El BFF rechazaba todos los commands sin lanzar, así que el fallo no dejaba rastro.
  Ni `Generar` ni `Mejorar` funcionaban. Corregido y verificado en vivo.
- La API (`globe-api-internal`) estaba desfasada del web varios commits, y el dispatch de commands ocurre
  ahí. Ambos servicios al día.
- Observabilidad: se otorgó `roles/logging.logWriter` a las runtime SAs (sin él el servicio corre mudo) y se
  agregó la señal de arranque. Localización de rechazos en handler y envelope, con el nombre del campo.
- Un rechazo de la salida del enhancer ya no se reporta como `invalid_request` del caller.
- La skill `greenhouse-globe` (Claude y Codex) suma siete reglas duras nuevas: cabeceras al portar,
  `idempotencyKey` en el cuerpo, el deploy por servicio, `textPayload` vs logs JSON, `logging.logWriter`,
  el estilado por atributo de la hoja legacy y los controles de salida sin `<select>`.

## 2026-07-25 — Globe: regresión del feed cerrada y mecanismo de conversión de `/producer` a React

- Se cerró la regresión visual de `/producer/feed` portándola del legacy (autoridad de lo ya probado en
  producción, no del prototipo): grid con filas parejas, reposo de card con su sombra, guard de `<img>` sin
  `src`, toggle de selección, clamp del título, fecha en el pie y washes de vuelta a la familia azul.
  Desplegado y verificado: revisión `globe-studio-internal-00078-5gs`.
- Dos bugs que sólo se ven con la obra cargada: `.pf__badge` sin `z-index` (el thumbnail tapaba "Destacada")
  y su relleno dependiente de un media oscuro para ser legible.
- Se montó el mecanismo para convertir `/producer` **sin recrear**: `renderShell` acepta
  `extraStyles`/`extraStylesheets` y la rama React sirve `producerStyles` del legacy **verbatim** + iconos
  Tabler, con flag propio `GLOBE_CLIENT_PRODUCER_ENABLED` (default off, cableado).
- `/v1/session` publica `identity {name,email}` hermana del `principal` (presentación, no autoridad).
- `/producer` sigue sirviendo el legacy: la conversión de la superficie está pendiente. Decisión en ADR-014
  § Delta 2026-07-25 (2); checkpoint en `TASK-1505`.

## 2026-07-25 — Skills de investor readiness y business model

- Se crearon `.codex/skills/efeonce-investor-readiness/` y `.codex/skills/efeonce-business-model-operator/`
  con operating loops, gates, templates, fuentes verificadas, escenarios de evaluación y validadores locales.
- Se actualizó el routing de `AGENTS.md`, `CLAUDE.md`, `efeonce-agency`, `project_context.md` y
  `docs/business-models/README.md`. El cambio no autoriza instrumentos financieros, emisiones, spinouts,
  pricing, ventas ni transferencia de IP.
- Se endurecieron los artefactos: templates del pack de inversión, source catalogs, validadores de ledger y
  data room, acceptance criteria/protocol de evals, y drafts `Draft` de Efeonce Group, Growth Platform, AEO
  y Search Visibility 360 sin inventar datos financieros o de tracción.
- Se redactó la arquitectura canónica de modelos de negocio: corporativo, plataforma, capability/oferta,
  packaging y submodelos, con ownership, gates y reglas de consolidación.

## 2026-07-25 — Cutover del share board de Globe: LIVE, y las dos precondiciones que faltaban (TASK-1558 Slice 3 + TASK-1562)

- **El share board nuevo esta sirviendo.** `client_app_enabled` en `true`, revision
  `globe-studio-internal-00071-6vp`, imagen `85dac33b03b1`. La pagina paso de 6.095 bytes de HTML
  concatenado a 2.446 de shell, el rotulo interno `Producer` desaparecio del DOM servido, y el footer
  existe por primera vez.
- **Precondicion 1: el flag estaba declarado y conectado a NADA.** `grep -rn client_app_enabled
  infra/terraform/*.tf` devolvia **una sola linea**, su propia declaracion. Cambiar su default a `true`
  habria producido un **plan vacio**: el env var nunca llegaba al contenedor, y el cutover habria quedado
  como un commit que dice "prendido" con produccion sirviendo lo viejo — el modo de falla de
  `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`, donde el ledger decia ON y la realidad era OFF.
  **Heuristica reutilizable:** si el grep de un flag devuelve una sola linea, esa linea es su declaracion
  y no esta cableado; un flag conectado aparece al menos dos veces.
- **Precondicion 2: la imagen desplegada era anterior incluso a TASK-1556**, o sea sin bundle y sin leer
  esa variable. Otra sesion habia reportado que "lo unico que quedaba era el flip"; verificado contra el
  runtime, faltaban tres cosas.
- **La cadena se ejecuto en el orden que importa:** cablear (revision `00069`, flag en `false`) → hidratar
  la proyeccion → desplegar (revision `00070`, **share board todavia legacy con el flag OFF**, o sea el
  strangler verificado en vivo y no afirmado) → flip (revision `00071`). Los dos planes: `0 to add,
  1 to change, 0 to destroy`, sin replace de Cloud Run.
- **TASK-1562 — la proyeccion del share dejaba el panel vacio en produccion.** `resolveForShare` devolvia
  `{ target, mediaType }`, y `project()` solo emite un field si el grant lo autoriza **y** la fuente lo
  trae: `modelLabel`, `reviewStatus` y `comments` se descartaban en **todos** los shares, aunque el
  Producer pide los cuatro fields y el operador puede crear los comentarios. Nada fallaba y nada loggeaba.
- **El nombre del modelo sale del catalogo, no del intento.** `attempt.model` es el modelId —el valor que
  `model-readiness` compara contra `route.modelId`— y es un identificador de wire; `RouteModelIdentityV1`
  del catalogo es el ancla publica con drift guards que rechazan cualquier cosa con forma de slug. Leerlo
  del intento habria shippeado el slug a una superficie cliente, que es lo que ADR-003 prohibe.
- **Reglas de audiencia client:** los comentarios borrados se descartan (`getThread` sirve el hilo interno,
  donde un borrado es historial; para un cliente es algo que alguien retiro); orden ascendente por
  `createdAt` y tope de 20 conservando el **comienzo**, porque los ultimos veinte de un hilo largo son
  decisiones sin premisa; y el hilo degrada solo — store caido cuesta el panel, nunca la pieza.
- **Verificacion en vivo contra el front door real**, 3 anchos (1440, 390 y **320**, el piso de WCAG
  1.4.10): estado terminal correcto, un solo `role="alert"`, Reintentar ausente donde no aplica, fuentes de
  Globe cargadas, `scrollWidth <= clientWidth`, cero fuga en el DOM servido, axe **0 violations**, y la CSP
  de produccion sin rechazar nada.
- **Lo que NO se verifico, y por que importa:** el estado `ready` con un **grant real**. Crear uno exige
  sesion interna en el Producer sobre un output existente y no es alcanzable headless. Es el unico punto
  pendiente del runbook, y es exactamente la razon por la que `TASK-1560` (retiro de `public-share-ui.ts`)
  sigue bloqueada: ADR-014 exige cobertura equivalente en runtime antes de retirar lo viejo.
- Rollback vigente: `default = false` + `tofu apply`, <10 min, y vuelve `public-share-ui.ts` intacto
  porque no se retiro.

## 2026-07-25 — Globe: el CDN de assets es lo único que cambió en runtime; el payload cliente NO está servido

- **Cambio real en runtime — `TASK-1557` (cerrada):** Cloud CDN path-scoped sobre `/assets/*` en
  `globe.efeoncepro.com`, **aplicado y verificado en vivo** (hits del edge). Nada autenticado se cachea, y el
  invariante quedó como test (`front-door-contract.test.ts`) en vez de comentario. Detalle:
  [`GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
- 🔴 **El share board y el payload cliente NO cambiaron nada para ningún usuario.** `TASK-1556` (foundation) y
  `TASK-1558` Slices 1-2 están en `main` de `efeonce-globe`, pero **ninguna superficie sirve sobre el payload
  nuevo**: el cliente externo sigue viendo `public-share-ui.ts`, el template viejo. Es construcción, no entrega.
- **Se corrigió una creencia equivocada: el cutover no es "un `tofu apply`".** `client_app_enabled` no estaba
  cableado a ningún recurso (aparecía sólo en su propia declaración) y la imagen desplegada del shell
  (`45235ccb62ca`) es anterior a `TASK-1556`, así que no lee la variable. El flip solo habría dado plan vacío y
  producción idéntica — el modo de falla de `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`. La cadena real (cablear →
  `TASK-1562` → deploy con **autorización humana** → flip + apply → verificar con grant real → retirar legacy)
  vive en [`operar-share-board-globe.md`](docs/manual-de-uso/creative-studio/operar-share-board-globe.md) **v1.1**;
  la v1.0 afirmaba lo contrario.
- **`TASK-1562` reclasificada:** `resolveForShare` descarta en silencio `modelLabel`/`reviewStatus`/`comments`
  en todos los shares de producción, aunque el grant los pide y el dominio los proyecta. Es un bug con impacto
  de cliente, no una condición estética del cutover.
- **Cierres documentales:** `TASK-1554` (reader de flota de modelos) cerró con doc funcional
  [`efeonce-globe-producer-flota-modelos.md`](docs/documentation/creative-studio/efeonce-globe-producer-flota-modelos.md)
  y manual [`operar-flota-modelos-producer-globe.md`](docs/manual-de-uso/creative-studio/operar-flota-modelos-producer-globe.md).
  `TASK-1561` cerró el gate de diseño (tipografía + frontera declarada). El selector de modelo del Producer
  (`TASK-1555`) quedó como desplegable compacto con isotipo real: la galería se implementó y el operador la
  rechazó al verla. Nuevas: `TASK-1559`, `TASK-1560`, `TASK-1562`.

## 2026-07-25 — TASK-1558: el share board de Globe, la cara del cliente, reconstruida (ADR-014 Slice 1)

- **La única superficie que un cliente externo ve de Globe deja de ser 15 líneas con 3.071 caracteres de CSS
  en una sola línea.** Reconstruida como componentes tipados sobre el SSOT de tokens del payload cliente
  (`efeonce-globe` `a336ff5`). Nacen las primeras primitives de Globe —`Chip`, `Eyebrow`, `FactList`,
  `CommentList`, `MediaStage`, `StateBlock`— sirviendo a esta superficie; su promoción a plataforma se
  **propone**, no se asume. `Surface` NO se entregó: la dirección elegida no la necesita y una primitive con
  un solo consumer y ningún rol visual es una hipótesis.
- **Dirección visual aprobada: B "lámina montada"** (passepartout + riel de líneas). Tres direcciones
  renderizadas con los tokens y las fuentes reales y miradas en los dos targets, no comparadas en prosa.
  **A se rechazó por descalificante**: `object-fit: cover` recorta la pieza y la viñeta le altera el color, o
  sea corrompe el artefacto que el cliente vino a juzgar. **C** degradaba la pieza a ilustración de documento
  y su fila de chips prometía filtros en una superficie read-only.
- **Cuatro defectos verificados en la línea base, arreglados:** cards anidadas en el panel (card-on-card, que
  el estándar de entrega trata como fallo de diseño); valores crudos al cliente (`changes_requested` y
  `2026-08-01T18:00:00.000Z` iban directo a `textContent`); el rótulo interno `Producer`; y la ausencia total
  de footer. La línea base "antes" se capturó antes de tocar nada — no existía.
- **El estado que no existía y es el que ADR-005 pide de verdad: `partial`.** Si fallan los bytes, el
  `.catch(fail)` de hoy tira **también** los hechos y los comentarios ya recibidos y pinta un mensaje
  genérico — que es exactamente el "preview roto genérico" que la Delta prohíbe. Ahora el riel sobrevive
  legible y sólo el stage degrada, con un Reintentar acotado a los bytes.
- **Recalibración de la spec: los cuatro códigos de error NO son distinguibles, y es correcto.**
  `publicShareError` (`app.ts:4143`) colapsa inválido/vencido/revocado/de-otro-target/denegado en **un 404 no
  enumerable a propósito**, y sólo deja el 503 aparte para que el cliente pueda reintentar. Enumerarlos en la
  UI reconstruiría el oráculo de grants que el colapso existe para evitar; además el `Out of Scope` de la
  task prohíbe tocar el BFF. La regla de ADR-005 que se citaba gobierna el **feed del Producer**
  (autenticado), no el share público. La unión discriminada real tiene 5 miembros.
- **Tipografía al SSOT, con escala.** `--font-display`/`--font-body`, cuatro pasos sin huérfanos, leading,
  pesos limitados a los tres cuts cargados, tracking y measure. La base sube a **16px**: el producer pone el
  texto de lectura en ~13.6px, bajo el piso de 14px supplementary, y eso es defendible en una consola interna
  donde el operador vive todo el día — no en la superficie que un cliente lee una vez, en un dispositivo
  desconocido, para juzgar trabajo creativo. El riel se ensanchó a 22-27rem porque 52ch a 16px lo exige: a
  24rem daban ~40 caracteres por línea, bajo el piso de 45.
- **El gate de diseño pasa de 6 a 8 reglas y ahora camina `.css`.** Era el único lugar donde un hex, una
  duración o una fuente podían seguir tipeándose a mano — un gate que deja de aplicar en cuanto el payload
  gana su primer `.css` no es un gate. Reglas nuevas: tipografía literal, y **peso sin `@font-face`** (faux
  bold renderiza, shippea y pasa todos los demás gates). Las cuatro verificadas rompiéndolas a propósito.
  Y una lección de método: la primera versión de la regla de tipografía usaba un lookahead negativo cuyo
  `\s*` retrocedía a ancho cero, así que **reportaba toda línea correctamente tokenizada**; una regla que
  enrojece código compliant se apaga sola.
- **`/legal/terms` retirado — y no estaba donde la spec decía.** El link roto que devolvía JSON crudo a un
  browser vivía en el footer del **Producer** (`producer-ui.ts:82`), no en el share board, que no tiene ni
  footer ni un solo `<a>`. Se retiró (ADR-014 lo prohíbe explícitamente) y el test que **fijaba su presencia**
  quedó invertido, no borrado: un assert sobre la presencia de algo perpetúa el defecto cuando nadie pregunta
  si debería estar.
- **Primer canary visual de la superficie: 6 estados × 3 anchos** (1440, 390 y **320**, el piso de WCAG
  1.4.10), con assertions de no-fuga sobre el HTML servido, overflow medido **por panel** y no sólo en el
  documento, y Reintentar/`role=alert` verificados por estado. Encontró dos bugs reales antes del commit: el
  chip "Sólo lectura" decidía el ancho de la página a 320px, y el bloque de estado de `partial` quedaba pegado
  arriba en vez de centrado. Scorecard 4,71 promedio, piso 4.
- **Estado honesto: code complete, rollout pendiente.** `client_app_enabled` sigue en `false` y el payload
  viejo responde idéntico — **con test**, no como afirmación. Faltan el `terraform apply` del flip y el retiro
  de `public-share-ui.ts`, que va después del flip verificado con un grant real.
- **Brechas declaradas, no silenciadas:** no hay captions de video/audio porque `CreativeShareBoardV1` no
  transporta pista (WCAG 1.2.2; `eslint-disable` justificado, cerrarlo es cambio de contrato); el `h1` usa un
  fallback para toda pieza y los comentarios van sin autor porque la proyección no tiene esos campos, y
  inventarlos en la superficie donde un cliente juzga trabajo sería fabricar evidencia.

## 2026-07-24 — Globe flota multi-modelo: principio en EPIC-028 + TASK-1553 + canary real Nano Banana Pro

- **EPIC-028 corregido:** se plantó el principio (faltaba) del **catálogo multi-modelo extensible** — Globe corre los
  mejores modelos coexistiendo y creciendo, sin sustituir; **update** (bump de versión, reemplaza) ≠ **add** (modelo/tier
  nuevo, coexiste); compatible con el non-goal "no mejor global" (el catálogo ofrece, la selección es explícita o por
  contrato de fidelidad). Delta + Outcome nuevos.
- **`TASK-1553` (to-do, backend-data):** vehículo del principio — **resolución de modelo por-ruta** en los adapters (hoy
  resuelven por-capacidad → dos modelos del mismo proveedor no coexisten). Selector UI = consumer `TASK-1552`.
- **Defaults frontier actualizados** (updates legítimos, sin borrar Seedream): OpenAI `gpt-image-1→gpt-image-2`
  (`acb0776`), Vertex Nano Banana `gemini-2.5-flash-image→gemini-3-pro-image` (`46ab5ab`).
- **Canary real (TASK-1535):** Nano Banana Pro (`gemini-3-pro-image`) genera **imágenes reales** en el proyecto Globe
  vía endpoint `global`; Nano Banana 2 (`gemini-3.1-flash-image`) 404 (falta allowlist del proyecto, ask a Google).
  Provider flip revertido a `composite`; sin IAM break-glass sucio.
- **Skill `greenhouse-globe` actualizada** (.claude + .codex): sección "Flota de modelos" (roster, seam route→model,
  gotchas del canary) + 2 fixes de drift (composite rutea imagen→Fal, no "default Vertex"; Vertex image default es
  `gemini-3-pro-image`). Bloqueo para implementar: el classifier del entorno bloquea ediciones de código en Globe.

## 2026-07-24 — Globe: promoción comercial por atestación (ADR-010) — golden briefs + docs (TASK-1535)

- **Slice 5 (fleet enablement) — golden briefs para las 6 rutas reference-conditioned pendientes:**
  `ref/still/reference-v1`, `ref/motion/reference-v1`, `ref/video/frames-v1`, `ref/video/motion-v1`,
  `ref/voice/change-v1`, `ref/voice/translate-v1`. Se agregaron 3 rúbricas (`preserve-set-v1`,
  `voice-transform-v1`, `voice-translation-v1`) y 2 contratos de fidelidad aditivos (`voice-transform`,
  `voice-translation`) al enum — todos los consumers validan membresía, ninguno hace switch exhaustivo. Cada
  fixture lleva una referencia sintética `rights: 'test-fixture'` (aceptada sin puerto de assets, el caso del
  harness). El test del **segundo consumidor** corre las 6 end-to-end y asserta que la referencia autorizada
  **sobrevive** al manifiesto puntuado (`input_lineage_intact`). Globe `pnpm check` (domain 337/0) + build verde.
  Commit Globe `f62c2e4`.
- **Slice 6 (docs closure):** doc funcional [`efeonce-globe-promocion-comercial-atestacion.md`](docs/documentation/creative-studio/efeonce-globe-promocion-comercial-atestacion.md)
  + manual [`operar-promocion-comercial-atestacion-globe.md`](docs/manual-de-uso/creative-studio/operar-promocion-comercial-atestacion-globe.md),
  ambos indexados. Triple documentación completa (ADR-010 técnica + funcional + manual).
- **Pendiente (único gate abierto de TASK-1535):** el **canary facturable** (acceptance criterion de evidencia
  runtime) implica **gasto real** de proveedor y/o promoción comercial a un workspace de cliente real — requiere
  autorización explícita del operador; no se ejecuta de forma autónoma. La lane ya se probó en vivo con proveedor
  interno (canary de lane + 2 atestaciones comerciales firmadas por el CEO). Task sigue `in-progress` por este gate.

## 2026-07-24 — Globe formaliza Storyboard Studio y Narrative Preproduction

- ADR-012/SPEC-012 establecen Storyboard Studio como surface propia, no como capability aislada de Producer o
  Video Effectiveness. Narrative Preproduction posee Brief/Script/Storyboard/revisiones/review/handoffs; media
  generation, análisis, asset governance, scheduling y delivery conservan sus dueños.
- La experiencia seleccionada es Editorial Sequence Desk: Brief, Outline, Guion, Storyboard y Review sobre un
  Structured Sequence Canvas responsive. Comentarios y markup vectorial se anclan a revisiones exactas; un mask
  crea una intención de edición que Producer estima/ejecuta, sin mutar assets desde Storyboard.
- Los shots pueden combinar contribuciones capturadas, grabadas, generativas, licenciadas, de archivo y
  determinísticas como `mixed-origin realization`; no se reutiliza el término comercial `Hybrid`. La IA propone
  diffs y humanos aplican, aprueban, ejecutan e incorporan.
- `TASK-1542` cerró el contrato documental y `TASK-1543…1550` registran dominio durable, colaboración, propuestas,
  handoffs, canvas, exports, rollout cliente y el Realization Orchestrator que coordinará ProductionPlans con
  Producer sin mutar Storyboard. El grafo quedó parallel-first: el primer fold avanza con fixtures, Video
  Effectiveness y paquetes de export se habilitan por slice, y exports `policy-blocked` no frenan el primer piloto.
  No hubo cambios de runtime ni habilitación externa.

## 2026-07-24 — Globe separa la paridad de avatar canónico de Producer

- `TASK-1551` extrae el avatar de cuenta de `TASK-1505`: Greenhouse seguirá siendo el único source of truth de la
  foto sincronizada desde Entra/Graph y Globe la consumirá mediante descriptor OAuth, reader self-only y BFF
  same-origin.
- El contrato prohíbe hardcode, copias de la foto, acceso browser-side a Graph/GCS/URLs privadas y lookups por
  user id arbitrario. Trigger y panel usarán la foto cuando exista e iniciales como fallback.
- Es planificación/contrato, no implementación ni deploy. `TASK-1505` recupera un cierre propio de Producer; la
  evidencia de avatar queda aislada en `TASK-1551`.

## 2026-07-24 — ANAM publica ajustes del agente, backlog comercial y metas nativas

- Las directrices de Seguimiento y Calidad y el handoff neutral del Customer Agent fueron publicadas; la landing
  continúa operativa y el routing interno no se expone al visitante.
- Se publicó `ANAM — Backlog comercial (PILOTO)` con 575 Negocios abiertos, 205.005,55 UF nominales y 77.134,72
  UF ponderadas, conservando separados Growth, Renovación, montos nominales y ponderados.
- HubSpot Goals ahora contiene adjudicación Growth (24.600 UF/año), correos semanales y reuniones semanales para
  siete responsables. El panel comercial recibió nueve gráficos: agregado, evolución y responsable por cada meta.
- Llamadas tipificadas, oportunidades/ofertas, tasa de cierre y Fidelización permanecen sin meta nativa cuando la
  plantilla o el contrato de datos no permiten una representación fiel. Notion y la documentación ANAM registran
  el motivo y el siguiente gate.
- Los espejos Codex/Claude de `hubspot-as-a-service` incorporan el playbook reusable de Goals/metainformes,
  reconciliación de propagación, límites de templates y fallback de comunicación cuando Outlook permite lectura
  pero deniega la creación de borradores.

## 2026-07-24 — Globe: derivados de media versionados + entrega por Range (TASK-1528)

- ADR-008 build units 1-3 desplegados y verificados internal-only (SPEC-010): 6 perfiles gobernados de media
  (image thumb/preview, video poster/transcode 720p, audio waveform-peaks/AAC), cada parámetro explícito, con
  identidad exacta inmutable — cambiar cualquier componente crea un record nuevo, nunca sobrescribe.
- Nuevo Cloud Run Job `globe-media-derivatives` (`apps/media-derivatives`, ffmpeg pinneado por versión) que produce
  las versiones con leases/fencing y upload content-addressed a un bucket separado con `ifGenerationMatch=0` +
  reconciliación de 412. Nuevo gateway `GET /v1/media/:sha256` con Range 200/206/416 nativo (passthrough a GCS, sin
  buffer) y media tickets principal-bound (secreto propio, TTL 120s).
- Migración `0029`; flags `GLOBE_MEDIA_DERIVATIVES_ENABLED`/`GLOBE_MEDIA_RANGE_GATEWAY_ENABLED` ON post-canary;
  `tofu plan` No changes. Canary con imagen/video/audio reales: 6 ready/0 failed, Range/negativos/idempotencia
  probados. Desbloquea TASK-1529 (orphan GC). No habilita comercial (TASK-1480). El original nunca se toca.

## 2026-07-23 — Globe formaliza autoría humana y propósito creativo

- Creative Studio Business Model V1.1 fija al equipo creativo como protagonista, al operador como punto de vista
  y a Globe como guía que absorbe prompt engineering, routing, parámetros, estimate, retries y trazabilidad sin
  asumir gusto, derechos, presupuesto, aprobación ni publicación.
- El modelo económico no cambia: la doctrina fortalece gobierno/plataforma, capacidad humana e IP y conserva
  Studio Credits como operaciones gobernadas. Otras agencias quedan como hipótesis B2B2B con gates de tenancy,
  confidencialidad, rights, marca, accountability y margen; no nace un cuarto modelo ni acceso externo.
- ADRs, EPIC-028, contexto de producto/marca/ICP/ASaaS y las tasks `1530…1534` quedan alineados a la misma
  experiencia: source preservado, provenance visible y aceptación humana.

## 2026-07-23 — Agenda pública aclara la duración de la reunión

- `/agenda/` reemplaza la etiqueta redundante `Efeonce · conversación inicial` por `Reunión de 30 minutos`.
  La mutación quedó respaldada en Elementor, purgada en Kinsta y verificada live en escritorio y 390 px sin
  errores ni desbordes; el scheduler, booking y GTM no cambiaron.

## 2026-07-23 — Globe Producer genera las tres modalidades y cierra dos causas raíz

- El Producer internal-only generó y recuperó Image, Video y Audio reales desde la UI; cinco runs terminaron,
  el feed hidrató nueve outputs y el viewer sirvió/reprodujo media desde GCS privado por grants gobernados.
- El catálogo publica 10 rutas, pero sólo Seedream 5 Pro, Seedance 2.0 y ElevenLabs Multilingual v2 están
  promovidas durablemente. Las otras siete conservan su gate de evidencia/revisión/binding/canario.
- Se corrigieron hidratación/selección/render del viewer, modalidad multimedia y recuperación de sesión/CSRF.
  Una sesión realmente expirada muestra CTA de reautenticación y vuelve al feed sin repetir gasto.
- Asset Governance dejó de tratar media válida sin manifest C2PA como outage y ahora recupera proyecciones
  terminales sin perder rights. El Job desplegado aplicó 3 trabajos, promovió 1 y falló 0.
- El worker supersedió seis reconciliaciones terminales mediante primitive gobernada, queue age quedó en cero
  sobre trabajo reclamable y las alertas quedaron `failure=ERROR`, `queue age=WARNING`.
- La auditoría de promoción confirmó que 0/7 rutas pendientes cumplen hoy todos los gates. El tooling separa
  `stage|promote|activate|rollback`; `TASK-1527…1529` poseen operación durable, derivados/Range y lifecycle/GC.
  Clientes externos siguen cerrados.

## 2026-07-23 — Globe Producer promovido hasta sus gates reales internal-only

- `TASK-1519` quedó completa: el bridge humano browser → BFF same-origin → API IAM-private tiene IAM/env/secrets,
  grants, CSRF, spoofing/workspace denial y revocación verificados en vivo sin exponer credenciales.
- Migraciones `0001…0023`, Producer Worker y Asset Governance Job quedaron desplegados por workflows keyless con
  imágenes inmutables; governance procesó una cola vacía en verde y ambos schedulers permanecen cerrados/pausados.
- Tenancy avanzó a `shadow` y registró drift del broker, por lo que `enforced` no se habilitó. Library writes y
  bulk sí avanzaron con smoke durable/partial-failure; export y purge permanecen OFF.
- La superficie Producer está desplegada y su dry-run vivo estimó 32 créditos, pero no ejecutó proveedores:
  readiness no tiene attestations y tenancy efectiva negó acceso. Provenance, Style DNA, review/share positivo y
  la contención cross-réplica siguen bloqueados sin inputs reales o autorización; cero gasto en esta etapa.
- Globe `main` y Greenhouse `develop` pasan suites/build, CI y OpenTofu `No changes`; Production y clientes
  externos permanecen explícitamente fuera de alcance.

## 2026-07-22 — Globe Style DNA desplegado internal-only

- TASK-1494 completa el carril local de Reference Intelligence: identidad tenant-safe desde provenance,
  resolución privada content-addressed, paleta determinística versionada y análisis semántico Vertex por el
  mismo `CreativeProviderAdapter`, detrás de spend fence y kill switch.
- La versión de análisis queda fijada por contrato para impedir cache-busting; command/reader, perfiles,
  conditioning, estilos versionados y auto-route conservan Full API Parity, derechos y errores saneados.
- Suites, build, CI, migración y despliegues canónicos pasan en `a5e128935577`; API/Studio sirven el 100% y los
  negativos live validan `not_found`, `invalid_request` y aislamiento cross-workspace. El canary positivo queda
  bloqueado honestamente porque el workspace no tiene assets gobernados elegibles; no se eluden ingesta,
  readiness ni rights para fabricar uno.

## 2026-07-22 — Globe Producer aprobado implementado localmente sin recortar el diseño

- `efeonce-globe/apps/studio-web` materializa el baseline completo de TASK-1505: composer cross-modal,
  referencias privadas, rutas/shapes/estimate/hard cap, Style DNA, library editorial, viewer/compare,
  recreate/inpaint, bulk, créditos, review/comments/share, estados honestos, command palette y onboarding.
- La revisión source-led restauró paleta, jerarquía, superficies, Tabler self-hosted, wordmark/isotype Globe,
  logo Efeonce oficial, hero/masonry, motion y microinteracciones. Evidencia desktop/390/reduced-motion y score
  enterprise 4.72/5: `docs/ui/reviews/TASK-1505/`.
- El composer ahora exige estimate vigente antes de generar, conserva conditioning, incorpora seed
  lock/input/reroll y negative prompt, y mantiene seis modos asset-dependent fail-closed mediante el reader de
  provenance del workspace.
- La UI no oculta deuda con un botón decorativo: referencias image/video usan rutas genuinas separadas, policy
  count/media pre-spend, handles autorizados, resolución de bytes server-side y lineage por hash. Compare quedó
  alineado al reader `globe.lab.experiment.get`; el input de cantidad oculto salió del recorrido de foco.
- El runtime local completo pasa `pnpm check` y `pnpm build` (Studio Web 185/185 dentro del full check).
  TASK-1504 queda reconocida como code-complete local; TASK-1519/1520/1522 y
  TASK-1505 mantienen lifecycle `in-progress` porque rollout no está aplicado.
- Estado operativo honesto: faltan migrations `0010…0016`, secrets, buckets/IAM, grants, flags,
  scheduler/worker, acceso de proveedores y canarios internal. No hubo deploy, provider spend ni promoción
  comercial; TASK-1521 sigue siendo el gate externo.

## 2026-07-22 — Globe Producer rebaselined al diseño aprobado completo

- El HTML aprobado de Claude Design quedó versionado como baseline source-led ejecutable bajo
  `docs/ui/visual-sources/TASK-1505/`, con procedencia y hashes. `TASK-1505`, wireframe, flow, motion y dirección
  visual preservan el producto completo: composer Image/Video/Audio, library/viewer, collections/batch,
  budgets, provenance/lineage, review/share y operator UX. `UI ready` continúa `no` hasta runtime, scenario,
  dossier, baseline promovido y evidencia premium desktop/390 px.
- `ADR-005`, la arquitectura del Creative Producer y `EPIC-028` separan el target aprobado del estado runtime:
  `TASK-1500…1503` están disponibles, `TASK-1504` sigue local/in-progress y no desplegada; el browser aún no
  tiene bridge ni capabilities humanas. Se adopta browser → same-origin `studio-web` BFF → API IAM-private,
  delegación server-derived, surface enforcement fail-closed y jobs/outbox durables para gasto.
- El backlog distribuye el gap sin duplicar ownership: `TASK-1519` human bridge/enforcement, `TASK-1520`
  library/collections/bulk y `TASK-1521` runtime comercial; se reespecifican `1467/1469/1472/1493/1494/1496/
  1497/1498` para ingest/provenance, jobs, collaboration, recipes, styles, recreate, inpaint y feed/lineage.
- No se implementó ni desplegó runtime en este ajuste. La secuencia recomendada quedó canónica en `EPIC-028` y
  la arquitectura del Producer.

## 2026-07-22 — Skill de arquitectura gobernada y evaluable

- `software-architect-2026` conserva su identificador por compatibilidad, pero adopta un método year-neutral y
  progresivamente revelado: concerns, quality scenarios, vistas, contratos distribuidos, fitness functions,
  operabilidad y assurance de sistemas agentic.
- Se reemplazan defaults volátiles por resolución basada en evidencia, catálogo de fuentes con fechas de revisión,
  validator local y un harness externo de 16 escenarios/64 criterios para regresión ciega. La skill de Claude no
  se modifica y mantiene governance independiente.
- Canon: [`GREENHOUSE_SOFTWARE_ARCHITECT_SKILL_GOVERNANCE_V1.md`](docs/architecture/GREENHOUSE_SOFTWARE_ARCHITECT_SKILL_GOVERNANCE_V1.md).

## 2026-07-22 — Efeonce Embed Runtime formalizado como programa portable (EPIC-035)

- Assurance arquitectónica posterior supersede la ubicación cloud de V1 sin abandonar el runtime: el ADR V2 obliga a
  endurecer primero Vercel y hace que `TASK-1515` compare Vercel endurecido con Firebase Hosting en un proyecto GCP
  dedicado bajo la misma organización/billing. Firebase en `efeonce-group` queda no autorizado; dedicated project no
  significa otra cuenta ni otro control plane.
- El epic/tasks agregan owner por concern, checkpoint humano antes de provisioning, identidad exacta de workflow,
  single-writer con relectura live, sintaxis Firebase correcta, provenance, SLO visual-to-preview/live, synthetics
  externos y matriz 2048/1440/820/390. `TASK-1517` sube a esfuerzo Alto por el coupling de deep selectors.
- Forms, CTAs y Meetings dejan de tratarse como tres problemas de publicación separados: el ADR y la arquitectura
  nuevos definen un protocolo común, releases independientes, `assets.efeoncepro.com` como origen neutral y
  Greenhouse como control/API/data plane. El provider seleccionado no recibe PII, bookings, submissions ni lógica
  server-side.
- La decisión no afirma un cutover: primero corrige la carrera manifest→asset del carril Vercel de Meetings, luego
  exige scorecard/provider checkpoint, promoción exacta, rollback y costo, seguido por dual-publish. Vercel permanece
  como current/fallback rail hasta que la evidencia determine otra cosa y los legacy URLs conservan shims.
- `EPIC-035` ordena la ejecución en cinco tasks registradas: `TASK-1514` foundation, `1515` provider gate/keyless, `1516`
  Meetings, `1517` Forms y `1518` CTA/fleet closure; incluyen fixtures WordPress + Think/Astro, GTM/CMP, teclado,
  reduced motion, overflow y verdad server-side. No se provisionó cloud, cambió DNS ni ejecutó release.
- Canon: [`GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md`](docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md),
  [`GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`](docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md) y
  [`EPIC-035`](docs/epics/to-do/EPIC-035-efeonce-embed-runtime.md).

## 2026-07-22 — Globe ya deja sacar lo que produce, y la puerta la pone el dominio (TASK-1503, live)

- El Creative Producer estrena su **output side**: un reader gobernado devuelve una ficha de la pieza más un
  pase HMAC efímero (**nunca bytes en el JSON**), y `GET /v1/outputs/:sha256` canjea ese pase para streamear
  los bytes con `Content-Type`/`Content-Disposition`. Además `favorite` (idempotente por estado deseado) y
  `copyAsReference` (certifica `derived-internal` con los derechos del padre heredados, cero bytes y cero
  gasto), bajo la capability propia `globe.producer.assets.operate` — deliberadamente **no** la del Model Lab,
  que es de gasto.
- La parte que importa: el depósito es **content-addressed y tenant-blind**, y guarda piezas producidas **y**
  bytes de referencias de entrada de todos los workspaces mezclados. Así que la autorización no puede vivir
  ahí: vive en `authorizeOwnedOutput`, que gatea contra los `outputHashes` retenidos que el workspace posee y
  **nunca** contra `authorizedInputHashes`. Todo rechazo colapsa a `not_found` — cualquier respuesta más fina
  sería un oráculo para sondear un bucket compartido. La ruta de serving reusa ese mismo helper en vez de
  copiar la política.
- Delta al spec: las anotaciones quedaron **durables** (migración `0003`) en vez de in-memory. El spec las
  difería a `TASK-1465`, que ya shipeó sin cubrirlas, y con los servicios en 3 réplicas un store en memoria no
  es "volátil" sino no determinista: una estrella escrita en una réplica es invisible en otra.
- **Desplegado y ACTIVO el mismo día** en `globe-api-internal` (rev `00016-8dr`): secreto HMAC creado
  out-of-band, migración `0003` aplicada, env y kill switch gobernados en Terraform — el flag vive en el
  default de la variable, en git, y no en un `terraform.tfvars` gitignoreado (probado planeando sin él).
  Canario 14/14 con bytes reales servidos, más el negativo private-ingest en su forma precisa: un hash que
  **sí** está en el bucket y que el workspace declaró como *input* responde `not_found`, mientras el output
  propio de esa misma corrida sí se sirve. La impersonación necesaria para el canario se otorgó y revocó en
  dos ventanas acotadas, con el corte verificado.
- Lo que **no** cambió: `ui`/`mcp` siguen `policy-blocked` (bridge/enforcement en `TASK-1519`, integración UI en `TASK-1505`) y el uso comercial/externo
  sigue siendo un programa aparte (`TASK-1480` ← 1477/1478/1479/1482). Hallazgo del rollout: ampliar
  `GLOBE_ENVIRONMENT` más allá de `internal_smoke` era un bloqueo duro en código sin dueño; ahora lo posee `TASK-1521`.
- Spec: [`docs/tasks/complete/TASK-1503-globe-governed-output-retrieval-asset-actions.md`](docs/tasks/complete/TASK-1503-globe-governed-output-retrieval-asset-actions.md).

## 2026-07-21 — Cloud Run de Globe bajo Terraform y un cap de 1 instancia que nadie sabía que existía (TASK-1508)

- Los dos servicios Cloud Run de Globe entraron a Terraform por import brownfield (cero destroy/replace) y
  `deploy-internal.yml` quedó reducido a desplegar sólo la imagen: se acabó el doble escritor sobre ingress, runtime SA,
  env, secretos y escala. Anti-drift probado en dos ciclos de deploy, uno por servicio, con `tofu plan` en `No changes`.
- Adoptarlos destapó que ambos estaban capados a **1 instancia efectiva**: Cloud Run aplica el menor entre el ceiling a
  nivel servicio y el de revisión, y `--max-instances` escribe uno u otro según el subcomando de `gcloud`. Corregido a
  3/3 y ambos campos bajo IaC. Consecuencia registrada: el spend fence cross-réplica de `TASK-1465` nunca se ejercitó.
- Spec: [`docs/tasks/complete/TASK-1508-globe-cloud-run-iac-deploy-ownership.md`](docs/tasks/complete/TASK-1508-globe-cloud-run-iac-deploy-ownership.md).

## 2026-07-21 — Globe estrena front door internal-only en globe.efeoncepro.com (TASK-1507)

- El shell interno de Globe pasa a servirse por `https://globe.efeoncepro.com` detrás de un Global External ALB +
  serverless NEG (`southamerica-west1`), con certificado administrado activo y 301 HTTP→HTTPS; el ingress del web
  quedó en `internal-and-cloud-load-balancing`, así que el hostname `*.run.app` dejó de ser alcanzable por browser y
  sólo persiste en el allowlist OAuth como camino de rollback. El plan Terraform fue aditivo puro, sin tocar los
  servicios Cloud Run ni `maxScale`, y `globe-api-internal` sigue sin custom domain, IAM-private y con audience
  derivada de `run.app`. Sigue siendo internal-only: no habilita Production ni clientes externos.
- Greenhouse ganó la primitive aditiva `updateSisterPlatformOAuthRedirectUris` en el broker de sister platforms + el
  CLI `pnpm sister-platform:redirect`, que amplía el allowlist de redirect URIs en una transacción sin rotar el
  client secret ni reemplazar el array. Fuente canónica:
  [`docs/tasks/complete/TASK-1507-globe-internal-front-door-alb-terraform.md`](docs/tasks/complete/TASK-1507-globe-internal-front-door-alb-terraform.md)
  y continuidad de runtime en
  [`docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).

## 2026-07-21 — Globe materializa modos operativos y accountability versionada (TASK-1466)

- Globe incorporó SPEC-008: assignments append-only por workspace/run para `client-operated`, `co-operated` y
  `efeonce-managed`, ocho responsabilidades explícitas, contexto comercial sin pricing, commands/readers Full API
  Parity, replay idempotente, optimistic concurrency y audit atómico. `pnpm check && pnpm build` pasó en
  `efeonce-globe`; migración `0002` aplicada en Cloud SQL, deploys internos Ready y smoke autenticado confirmaron
  assign/replay/conflict/change/readers, tenant denial y dos auditorías durables. Los grants temporales fueron revocados;
  no se habilitaron UI, MCP, clientes externos ni producción comercial.

## 2026-07-21 — Scheduler completa foundation runtime y Temporal Operations Desk (TASK-1509/1510)

- Growth CTA incorpora la acción aditiva `open_meeting_scheduler` sin alterar `book_meeting`: autoridad `surface + scheduler key`
  validada server-side, proyección browser-safe, lazy load consent-aware con Save-Data/2G, task surface dialog/full-screen,
  foco/scroll/escape gobernados, recuperación nativa y continuidad del mismo scheduler al cerrar/reabrir. El cockpit puede
  autorarla. GVC `.captures/2026-07-21T11-22-29_growth-cta-native-meeting` pasó desktop/mobile, 10 frames,
  teclado/reduced-motion y continuidad al reabrir; ese checkpoint precedió el rollout nativo documentado más abajo.
- La UI evolucionó a **Temporal Operations Desk**: dossier compacto, grilla mensual continua con gramática de
  hoy/selección/densidad, inspector de horarios y booking brief sin card-on-card. Se agregó foco roving y teclado
  de calendario, se eliminó el flash de 400 ms causado por la animación phase-wide y se unificó iconografía en el
  subset Tabler sin SVG inline. GVC premium `2026-07-21T10-31-38_native-meeting-scheduler`: 36 frames command/split/guided,
  exit 0 y score enterprise 4.66/5; baseline/rollout continúan sujetos a aprobación humana.
- El carril amplio dejó de dibujar la órbita decorativa recortada: conserva sólo un resplandor tonal estático, amplía
  el espacio para mantener `Conversemos` completo y usa la marca monocroma gobernada de Microsoft Teams en turquesa,
  sin el disco morado de las variantes contenidas. La evidencia
  GVC `.captures/2026-07-22T00-40-24_native-meeting-scheduler` pasó 45 frames en 1440/820/390; el suplemento
  `.captures/manual/TASK-1510-scheduler-rail/reference-2048-v2.png` cubre 2048×1135. Teclado, reduced motion y overflow están verdes;
- El renderer público quedó desacoplado del release de Greenhouse. El proyecto estático dedicado
  `efeonce-public-renderers` publica JS+CSS content-addressed con hashes/SRI, cache inmutable, puntero estable revalidado,
  promoción por alias y rollback directo. `/agenda/` consume el loader estable y mantiene Greenhouse sólo como API;
  un `prebuild` o deploy no relacionado ya no puede cambiar su estética. Release live inicial `2fbea2b39b555c5762e6`,
  backup Elementor `_gh_backup_before_agenda_public_renderer_20260722T075004Z`.
- El scheduler dejó de imponer `America/Santiago`: detecta la zona IANA del visitante y la propaga de forma
  consistente por config, availability y booking de HubSpot. Santiago queda como fallback de surface. Se agregó
  canonicalización de aliases, rechazo pre-provider de zonas inválidas, validación de `bookingTimezone` y cobertura
  de DST/date-only. Los campos usan ahora un subset portable Iconify/Tabler generado en build, sin SVG manual;
  70 pruebas focales, typecheck, lint y build productivo verdes.
- El formulario heredó la política anti-correo-personal/desechable de Growth Forms sin duplicar listas: feedback
  debounced y accesible en cliente, endpoint gobernado por surface/origin + rate limit y revalidación autoritativa
  dentro del booking antes de CAPTCHA, disponibilidad, ledger o HubSpot. El correo no entra a URL ni telemetría.
- La validación del formulario ahora es progresiva y reactiva: campos vírgenes neutrales, error accionable al blur,
  recuperación inmediata mientras se corrige, consentimiento on-change y correo en fases sintaxis→verificación
  corporativa. El carril estable de estado combina copy, ARIA live y Tabler success/error/pending sin depender de color
  ni mover el layout. GVC `2026-07-21T11-37-07_native-meeting-scheduler` pasó 39 frames en 1440/820/390.
- La confirmación dejó de ser una alerta dentro del calendario: un receipt server-confirmed recompone todo el shell,
  muestra rango horario/zona/duración/Teams y próximos pasos sin PII ni IDs internos. La primera pasada de header oscuro
  + card fue descartada por feedback visual; la dirección final usa una superficie luminosa continua, banda temporal
  abierta y motion espacial/reduced-motion. GVC `2026-07-21T12-01-53_native-meeting-scheduler`: 45 frames, exit 0.
- Una auditoría final de copy, UX writing, CRO y criterio comercial centralizó también los textos dinámicos y reemplazó
  jerga interna por acciones y expectativas verificables: conversación de 30 min por Teams, zona horaria local, correo
  de empresa, recuperación accionable y `Reservar horario`. La revisión GTM mantuvo identidad semántica independiente
  del copy, cero PII/slot exacto y `generate_lead` sólo desde recibo server-confirmed; workspace 6 sigue sin publicar.
  GVC final `2026-07-21T12-18-17_native-meeting-scheduler`: 45 frames en 1440/820/390, exit 0.

- La migración dev quedó aplicada y leída de vuelta; un race live de PostgreSQL probó un único claim, conflicto
  semántico, replay único y cero residuo. Se provisionó el secreto HMAC dedicado con acceso del runtime y se verificó
  el resolver canónico; HubSpot Scheduler continúa online sobre Office 365 con disponibilidad real.
- El runtime del scheduler fue promovido y activado en staging y producción: ambos flags están ON y el binding piloto
  `fhsf-efeonce-lead-gen-web`/`discovery` quedó activo. Configuración y disponibilidad reales respondieron desde el
  origen público permitido y respetaron la zona del visitante (`America/New_York` en la verificación). La landing
  pública conservaba entonces el embed/link HubSpot mientras se completaba la mutación WordPress; el corte native-only
  posterior se documenta más abajo. No se publicó GTM ni se creó una reserva durante esa activación.
- El piloto público aislado quedó disponible en `/agenda/` (WordPress `251583`, `noindex`): montó inicialmente el scheduler
  con disponibilidad real, Turnstile y un enlace de respaldo que fue retirado en el corte native-only posterior. El host usa el template normal de Ohio
  —no Canvas— y una corrección page-scoped para el margen del root Elementor; Playwright confirmó desktop y 390 px sin
  overflow ni errores de consola. No se promovió a Contacto/RRSS, no se publicó GTM ni se creó una reserva.
- El host de `/agenda/` se refinó como focused booking canvas conservando la navegación y el footer global completo del sitio: un H1, sin title/breadcrumb/sidebar heredados y sin prefooter. Se retiraron 35 reglas locales que alteraban el footer. La captura final `.captures/2026-07-21T23-44-01-104Z_agenda-focused-booking-canvas` validó 1440/820/390, `scrollWidth===clientWidth`, teclado, reduced motion y cero errores; no hubo booking, GTM publish, release ni commit.
- La navegación mensual ya no colapsa el calendario cuando HubSpot devuelve un mes sin slots: conserva el mes solicitado,
  la grilla semántica completa, los controles de recuperación y un estado vacío específico. La regresión julio→agosto
  quedó cubierta con 31 días no disponibles, restauración de foco y revisión visual desktop/390 sin overflow. PR #162
  fue liberado en producción (`ddd3094538e7`, run `29848667096`); el smoke en la sesión Chrome autenticada del operador
  confirmó agosto completo en `https://efeoncepro.com/agenda/`, sin crear una reserva ni publicar GTM.
- El scheduler pasa a una experiencia **native-only** en todos sus tamaños y activaciones: se eliminaron el enlace hijo y el
  respaldo visible de `/agenda/`, y tanto el renderer portable como Growth CTA resuelven fallas mediante `Reintentar`, sin abrir
  la UI de HubSpot. Elementor se guardó vía `Document::save()` con backup
  `_gh_backup_before_agenda_native_only_20260721T170615Z`; el readback confirmó un host y cero enlaces HubSpot. HubSpot continúa
  como provider invisible de disponibilidad/reserva. Las 75 pruebas focales, typecheck, lint, build y GVC premium
  `.captures/2026-07-21T17-02-42_native-meeting-scheduler` quedaron verdes. PR #163 fue liberado en producción
  (`fbe8a9c76a74`, run `29854833210`, manifest `released`); el smoke Chrome post-release confirmó cero enlaces/copy
  HubSpot, la grilla completa de agosto y `overflow=0`, sin crear una reserva.
- La UI elevó el calendario a `Calendar Command Center`: densidad por fecha, agenda agrupada por período, resumen
  vivo, formulario desktop de dos columnas, mobile compacto y motion causal/reduced-motion. GVC premium
  `2026-07-21T09-02-04_native-meeting-scheduler`: 24 frames, exit 0, runtime/enterprise/a11y/layout/performance verdes.
- GTM workspace descartable ID 6 quedó compilado y sincronizado en preview con 10 DLVs allowlisted,
  `gh_meeting_step_reached` y `generate_lead` receipt-gated. No se creó versión ni se publicó; los flags y el binding
  del piloto están ON, de forma independiente al estado de publicación de GTM.
- El cierre documental crea la skill dueña `greenhouse-growth-meetings` y alinea arquitectura/PDR, CTA, GTM, WordPress,
  release, documentación funcional, manuales, tasks e índices con el contrato native-only y sus gates pendientes.

## 2026-07-21 — Scheduler adopta recipes adaptativas y atribución por intención (TASK-1510)

- El renderer separó estado de booking, modo de activación y layout. Resuelve `guided|split|command` desde su propio
  contenedor con hysteresis; cambios de `activation-mode`/`max-recipe` conservan nodos, selección e intent.
- La receta `guided` presenta calendario y agenda como planos progresivos con retorno/foco semántico. Se eliminó el
  `date_selected` automático y los eventos incorporan `presentation_variant` + `activation_mode` allowlisted.
- Los datos del asistente usan ahora controles icon-led de 56 px, estados focus/error integrados y consentimientos
  modernos con hit area real de 44 px; el CTA guiado dejó de cubrir el resumen en móvil.
- GVC premium local `2026-07-21T09-35-05_native-meeting-scheduler` pasó 22 frames desktop/mobile con targets de
  44 px, teclado, reduced motion, layout, a11y, performance y enterprise rubric verdes.
- GTM workspace descartable ID 6 fue actualizado a 10 DLVs y ambos tags; readback/quick preview quedaron verdes.
  Continúa sin versión ni publicación. `book_meeting` permanece navigation-only; el adapter CTA nativo será un kind nuevo.

## 2026-07-21 — Scheduler nativo adopta calendario mensual (TASK-1510)

- El prototipo portable reemplaza la dirección abstracta “Time Horizon” por un calendario mensual semántico,
  agenda diaria y resumen inline; el GVC premium local pasó 24 frames en 1440 px y 390 px, teclado, foco, contraste,
  reduced motion, enterprise rubric y cero errores runtime/overflow.
- El funnel emite eventos allowlisted sin PII y reserva `gh_meeting_booking_confirmed` para un recibo confirmado
  server-side. La activación pública sigue pendiente del dossier staging/full-state, preview/read-back de GTM,
  runtime real de TASK-1509 y piloto gobernado; los flags permanecen apagados.

## 2026-07-21 — HubSpot Scheduler equivalence conditional pass (TASK-1366)

- El spike de booking nativo probó en runtime calendario Office 365, Teams, contacto/reunión CRM y links
  nativos de cancelación/reprogramación mediante Scheduler `2026-03`; el harness fail-closed mantiene PII/IDs
  redacted y no otorga consentimiento de marketing opcional.
- `HubSpotMeetingEmbed` sigue como fallback: no hubo cambio de landing/GTM. La productización posterior debe
  cubrir adapter server-side, idempotencia/abuso, atribución consentida, observabilidad y QA del inbox invitado.
  Canon: `docs/tasks/complete/TASK-1366-hubspot-scheduler-booking-equivalence.md` + `PDR-009`.

## 2026-07-20 — Globe: edit/refine cross-model generalizado (TASK-1490)

- Refinar un candidato del Model Lab pasó a ser **una sola semántica** para todo modelo editable
  (`editFrom = { experimentId }`); el paradigma nativo — stateful por sesión vs. reference-based — lo resuelve el
  seam según qué proveedor ejecuta, y el cambio queda registrado en el manifest, nunca en silencio. Habilita
  **edit cross-model** (refinar un candidato de un motor con otro). Task:
  `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md`.
- Se descubrió y cerró el prerrequisito que la task daba por hecho: los outputs del proveedor **nunca se
  persistían**, así que el paradigma reference-based fallaba en runtime. Ahora se retienen content-addressed.
- Skill `greenhouse-globe` (Claude + Codex) actualizada con el patrón de edit generalizado, sus reglas duras y la
  lección de método: un campo de evidencia que nace debe verificarse **hasta el manifest**, no sólo en el adapter.
- Implementación en el repo hermano `efeonce-globe` (verificada en vivo por el seam); rollout del servicio
  desplegado pendiente — ver `Handoff.md`.

## 2026-07-19 — EPIC-028 · Globe Still Model Lab — recommendation matrix en vivo (TASK-1459)

- `TASK-1459` COMPLETE. El golden brief still (`rrss-key-visual-still`, contrato `flexible-style`) se corrió **por el harness de evaluación real** (`globe.lab.evaluation.evaluate` vía el seam) contra **dos motores reales** con generación facturable: **Vertex Nano Banana** (`gemini-2.5-flash-image`, 10cr, **7s**, objective pass) vs **Fal Seedream 5 Pro** (10cr, **138s**, objective pass) — ambos `objective_pass_pending_human`. Recommendation matrix: candidatos válidos al mismo costo; diferenciador objetivo = latencia (Nano Banana ~20× más rápido); craft (`brand-anchor`/`exploration-breadth`) queda a revisión humana (el harness nunca auto-elige ganador creativo).
- **Bug encontrado por la corrida:** el `route_stable` del `FalCreativeAdapter` fallaba porque devolvía el slug del modelo como `actualRoute` en vez del route del contrato de fidelidad (el slug va en `model`). Corregido → `actualRoute=request.route` (como Vertex). Motion/audio (TASK-1460/1461) esperan la resolución hash→bytes (sus briefs parten de una imagen/referencia). `pnpm check` verde.

## 2026-07-19 — EPIC-028 · Globe Fal adapter model expansion + canary en vivo (TASK-1488)

- `TASK-1488` COMPLETE en `../efeonce-globe`. Expande el `FalCreativeAdapter` (TASK-1487): `CREATIVE_CAPABILITIES` +3 (`image-upscale`, `video-upscale`, `model-3d-generate`) y `FAL_ROUTING` con modelos verificados **contra las skills** (fuente tested): Seedream 5 Pro/Lite (image), Recraft v4.1 `text-to-vector`, Topaz upscale (imagen/video), Hyper3D Rodin v2.5 `text-to-3d`, Seed Audio (audio, reverify), ElevenLabs (speech), Seedance 2.0 (video).
- **Bug de slug descubierto y corregido en vivo:** los modelos **ByteDance** en Fal usan slug **SIN** prefijo `fal-ai/` (`bytedance/seedream/v5/pro/text-to-image`); con el prefijo el submit pasa (200) pero el result da 404. La skill `greenhouse-ai-image-generator` lo tenía bien; el catálogo doc (`GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`) lo tenía mal — se corrigió el prefijo + se agregó la regla dura.
- **Canary Fal verificado EN VIVO** por el seam con la key Fal existente del repo (excepción temporal documentada; retiro = Globe provisiona su propia key): `image-generate` → Seedream 5 Pro, `candidate_ready`, `provider=fal`, `actualRoute=bytedance/seedream/v5/pro/text-to-image`, `estimated==actual==10`, `sha256:f9d9a216…`, fence liquidó. `pnpm check` verde (30 tests creative-runner con las 10 caps).
- **Los 10 modelos verificados en vivo (ninguno sin verificar):** 6 text-driven generados end-to-end con hash real (Seedream 5 Pro, Recraft v4.1, Seed Audio, ElevenLabs TTS, Hyper3D Rodin v2.5, Seedance 2.0) + 4 input-requiring con slug 422 (Seedream edit, Topaz image/video, Seedance i2v). Fixes: Seed Audio vive en `fal-ai/seed-audio` (usa `prompt`); poll budget 450s (3D/video tardan minutos); 422 en el result → `provider_failed` (content-policy del audio nativo de Seedance).

## 2026-07-19 — EPIC-028 · Globe Fal provider adapter + Composite router (TASK-1487)

- `TASK-1487` COMPLETE (code-complete, rollout gated) local-first en `../efeonce-globe`. Segundo `CreativeProviderAdapter` real: `FalCreativeAdapter` conecta el stack **no-Google** vía la queue API de Fal — **Seedream 5** (`image-generate`/`image-edit`), **Recraft** (`image-vectorize`), **Seedance 2.0** (`video-generate`/`video-extend`) y **ElevenLabs** (`audio-generate`/`speech-synthesize`) — las 7 capabilities. Secreto propio de Globe (`GLOBE_FAL_API_KEY`, nunca `greenhouse-fal-api-key`), inyectado; queue con el gotcha `status_url`/`response_url` (nunca reconstruir desde el slug); output descargado server-side → `sha256` (nunca URL pública); error mapping sanitizado.
- `CompositeProviderAdapter` combina Vertex + Fal: capabilities Fal-only (vector/audio/voz) por `supports()`; overlap image/video por **política explícita** (`DEFAULT_COMPOSITE_POLICY`: default Vertex Google-native; Seedream/Seedance vía `GLOBE_LAB_PROVIDER=fal`); `poll` vuelve al hijo que emitió el run. Provider-selection `GLOBE_LAB_PROVIDER` = `fake|vertex|fal|composite` (default `fake`).
- 29 tests de `creative-runner` (Vertex + Fal + Composite) con transportes mockeados (cero red, cero gasto); `pnpm check` + `pnpm build` verdes; el fake sigue default. Desbloquea **audio** (TASK-1461, corrige el Delta de 1486) + motores alternativos still/motion (TASK-1459/1460). Canary Fal billable en vivo gated por el secreto Fal de Globe. Inputs que requieren bytes (edit/vectorize/i2v) → `inputs_unavailable` hasta la resolución hash→bytes (follow-up).

## 2026-07-19 — EPIC-028 · Globe Model Lab real Vertex provider adapter (TASK-1486)

- `TASK-1486` COMPLETE (**code-complete, rollout gated**) local-first en `../efeonce-globe` (sin push; en greenhouse-eo sólo lifecycle/doc). Primer `CreativeProviderAdapter` real: `VertexCreativeAdapter` (`apps/creative-runner/src/vertex-adapter.ts`) reemplaza el `FakeReferenceAdapter` detrás del `LabRunner` sin tocar dominio ni contrato.
- Routing capability→modelo **dentro del adapter** (`image-generate`→`gemini-2.5-flash-image`; `video-generate`/`video-extend`→`gemini-omni-flash-preview` región `global`); `supports()`=false para `image-vectorize`/`audio-generate`/`speech-synthesize` (boundary Google-native explícito). Keyless (ADC/WIF, `getAccessToken` inyectado + `google-auth-library` lazy); `estimate` sin red, `submit` única facturable, `poll` → hashes (nunca URL pública); error mapping sanitizado (404/429/403 → reason tipada).
- Provider-selection `GLOBE_LAB_PROVIDER` (default **`fake`**, reversible al instante); 15 tests del adapter con transporte mockeado (cero red, cero gasto); `pnpm check` + `pnpm build` verdes; el path fake sigue default (model-lab.test.ts pasa). El **canary billable en vivo** queda gated por humano (go-live checklist: Vertex enablement en `efeonce-globe` + SA `aiplatform.user` + budget + flags). Desbloquea el carril still/motion de TASK-1459/1460; audio (1461) sigue pendiente de adapter no-Google.

## 2026-07-19 — EPIC-028 · Globe Golden Briefs & Evaluation Harness (TASK-1458)

- `TASK-1458` COMPLETE local-first en el repo hermano `../efeonce-globe` (sin push; en greenhouse-eo sólo lifecycle/doc). Segunda capability de negocio sobre el spine: `globe.lab.evaluation.run` (SPEC-003) — **consume** el Model Lab (TASK-1457) para volver un intento en evidencia repetible y comparable **por contrato de fidelidad**.
- Fixtures still/motion/audio versionados con derechos declarados (licencia/consentimiento/uso); rúbricas que separan checks objetivos automáticos de criterios humanos declarados (nunca auto-puntúa craft). El comando `evaluate` corre el golden brief por `runModelLabExperiment` (reusa el camino real del Lab, sus guardrails y el provider seam) y puntúa el manifest.
- El verdict nunca es un "passed" creativo: sólo `objective_fail` u `objective_pass_pending_human` (revisión humana obligatoria); no declara un modelo globalmente mejor. Reportes versionados, workspace-scoped y con limitaciones declaradas (proveedor fake, muestra única). `pnpm check` + `pnpm build` verdes (11 tests de evaluación + suites del monorepo sin fallos). Fake canary: cero gasto, cero infra; `ui`/`mcp` `policy-blocked`.

## 2026-07-19 — Surface Recipes adopta planos de lectura sin degradar CTA

- `SurfaceRecipe` convierte los recipes oficiales en composición ejecutable sobre `CompositionShell`; el canvas gris queda como gutter y la lectura sostenida vive en work planes equilibrados.
- `/growth/ctas` consume el recipe conservando sus paneles maduros como benchmark de no regresión; se redujo card-on-card, se tokenizaron títulos/sombras/colores y Growth usa un icono semántico.
- El Lab de recipes y sus contratos técnico, funcional y operativo declaran el antipatrón de texto flotando sobre `background.default`. El baseline visual anterior no se promovió automáticamente: requiere aprobación humana de la nueva dirección.
- La segunda pasada corrige accesibilidad en sus dueños compartidos: navegación con botones nativos y Escape, Search/Notifications con microcopy ARIA canónico, Settings con `listbox→option`, footer interno correcto para Growth y contraste tokenizado en CTA. El shell desktop/mobile queda verificado; authoring profundo y nuevos baselines siguen como checkpoint pendiente.

## 2026-07-19 — EPIC-028 completa credits operations y Design System propio de Globe

- `TASK-1468` queda como kernel append-only; `TASK-1482` administra pools, grants, project budgets, policies
  y forecast sin crear un segundo saldo ni un pre-check fuera de la reserva transaccional.
- `TASK-1483` define el Runway Control Plane y separa credits operations del workbench creativo `TASK-1474`.
- `TASK-1480` debe emitir un decision record firmado; `TASK-1484` implementa después
  packages/pricing/billing/tax/revenue/payments y permanece bloqueada sin habilitar cobros/clientes.
- `TASK-1485` formaliza Design System Globe: Greenhouse gobierna decisions/registry/lifecycle/QA/evidence;
  Globe posee tokens seleccionados, patterns, components, motion y runtime sin heredar Greenhouse UI.

## 2026-07-19 — Worker builds adoptan inputs determinísticos y toolchain único

- Los cuatro workers Cloud Run copian `vendor/` antes de cada instalación, y sus workflows observan package,
  lockfile, Docker/Cloud Build ignores y `vendor/**`; `ico-batch` deja de omitir esos cambios.
- `pnpm worker:build-contract-gate` verifica pnpm SoT, existencia/Git/SHA-512 de dependencias `file:`, orden
  Docker, contextos y triggers. El runtime-deps gate cubre ahora también Artifact Worker y detectó/corrigió su
  import directo de `playwright` que dependía accidentalmente de un transitive.
- El registry privado definitivo permanece gobernado por `TASK-1473`; no se improvisaron tokens ni se saltaron
  sus blockers. El vendoring temporal queda reproducible y con condición explícita de retiro.

## 2026-07-19 — EPIC-028 adopta ejecución paralela bajo el harness de Greenhouse

- Model Lab/craft, plataforma gobernada y validación comercial avanzan en paralelo; probar una ruta bajo sandbox
  ya no espera al ledger/workbench completo, mientras su promoción a UI/MCP conserva un gate enterprise aparte.
- Greenhouse registra `TASK-1456…1485` y conserva tasks, hooks, lint, QA, planes, lifecycle, handoff y cierre
  cross-repo. Globe posee código/runtime/evidencia y mantiene un execution plan referencial, no un backlog paralelo.
- La primera wave prepara gobierno, sandbox/fixtures e IaC simultáneamente; el primer motion comercial es un
  Sample Sprint Efeonce-managed, no Studio Access ni créditos comerciales.
- Full API Parity queda convertida en gate de nacimiento, no follow-up de UI/MCP: `TASK-1481` crea el API
  Contract Spine/trusted context/conformance antes del primer provider call; `TASK-1457` prueba el primer
  canary por API/SDK→command→adapter→runner y `TASK-1473` queda como packaging/certificación sin business logic.

## 2026-07-19 — Globe ya existe como producto interno visible

- TASK-1455 convirtió el callback técnico de Globe en una shell branded live: raíz anónima, OAuth Greenhouse,
  callback `303 /studio`, sesión/revalidación, logout y recovery/revocación sin exponer tokens al browser.
- El runtime `globe-studio-internal-00006-445` sirve 100% del tráfico no productivo desde Node 24, min 0/max 1;
  build `fd79b83e-eafc-4fb1-93c9-ddf6309c4c17`, digest `sha256:7b213f7d…c8f4a`.
- Dirección `Orbital Threshold` usa los SVG/font assets canónicos con proveniencia. GVC premium live pasó
  1440×1000 y 390×844, teclado, reduced motion, axe, layout, runtime, performance y rubric enterprise;
  scorecard 4,73/5, floor 4,5 y cero overflow.
- Continúa internal-only y sin Production, clientes, projects, runs, providers, DB ni asset bucket. El siguiente
  slice funcional debe especificar el workbench real sin reabrir identidad o brand foundation.

## 2026-07-19 — Creative Studio formaliza el primer Business Model del repo

- Nace `docs/business-models/` con índice, lifecycle, fronteras y template canónico; Strategy conserva
  doctrina, Services el alcance operable, Commercial las transacciones y Finance/CPQ los precios por cliente.
- Creative Studio separa tres ejes que antes estaban mezclados: modelo de delivery (`Managed Squad`, `Staff
  Augmentation`, `Studio Access`), forma de engagement (`On-Going`, `On-Demand`, `Sample Sprint`) y modo
  operativo por run (`efeonce-managed`, `co-operated`, `client-operated`).
- Studio Credits quedan definidos como operaciones generativas gobernadas, no horas, piezas, tokens, moneda ni
  derechos. El modelo está aprobado para shadow ledger/pilotos; pricing público, checkout, top-ups, impuestos y
  acceso externo siguen bloqueados por Finance/Legal/EPIC-028.
- Provider-neutral deja explícitamente de significar provider-oculto: estimate, approval e historial muestran
  provider/modelo/version, readiness y fallbacks reales; siguen privados costo vendor, margen, keys y prompt/IP.
- El modelo se propagó a 20 skills en ambos runtimes: doctrina comercial/agencia; diseño, imagen, social,
  contenido, copy, decks y Digital Marketing; motion, audio y HyperFrames; Finance, Legal/IP, Talent, Tenders, GTM y Research.
  Nuevos módulos operativos cubren lifecycle, retries/refunds, derechos, ejemplos por pieza y finishing
  determinístico a cero credits sin convertirlo en costo cero. La matriz `EFEONCE_CREATIVE_STUDIO_SKILL_ADOPTION_V1.md`
  registra ownership, cobertura, validación y skills auditadas sin cambio.

## 2026-07-19 — Routing HubSpot de email y secuencias por API canonizado

- Las skills `hubspot-as-a-service` y `hubspot-solutions-partner`, espejadas para Codex/Claude, distinguen
  marketing directo, automatización legítima por formulario, email de ventas 1:1 y enrollment de secuencias.
  Marketing Starter no obtiene Single-Send; Sales Hub Professional sí puede inscribir contactos vía API bajo
  seat, inbox, permisos, scopes, consentimiento y límites de envío verificados.

## 2026-07-19 — Changelog interno adopta ventana activa e historia verificable

- `changelog.md` deja de ser un monolito append-only de 11.256 líneas y conserva hasta 60 entradas recientes;
  el estado completo previo al corte quedó preservado byte-for-byte con manifest SHA-256 bajo
  `docs/changelog/internal/legacy/`.
- `pnpm docs:context-rotate --apply` rota Handoff y changelog de forma independiente, mueve entradas completas
  a shards mensuales con hash, actualiza sus índices y aborta la reescritura ante edición concurrente.
- `pnpm docs:context-check:strict` y el workflow de governance ahora aplican budget, formato, orden, pointers e
  integridad; el prompt operativo de Codex y `implement-task` de Claude declaran explícitamente la ventana,
  archivo, rotación y gate del changelog, y CI verifica esos pointers. `docs/changelog/CLIENT_CHANGELOG.md`,
  `CLAUDE.md` y su CI permanecen fuera de este cambio.

## 2026-07-19 — Creative Studio: portfolio enterprise y routing agentic gobernado

- Una flota auditó documentación oficial de Google Cloud, Fal y la arquitectura de control para definir un
  portafolio profesional de imagen, video, audio, localización, post, capas y 3D. Google nativo queda directo
  por GCP; Fal sólo cubre rutas no-Google exactas; OpenAI se mantiene directo.
- Se añadieron el portfolio enterprise y un registry JSON de research para agentes. Separan capability estable,
  route candidate, tier, lifecycle y readiness; ninguna ruta ejecuta hasta `production_approved`.
- La skill `design-studio` en Codex/Claude incorpora routing enterprise, tres carriles Gemini Image, endpoints
  Seedream/FLUX/Ideogram/Kling/PixVerse/ElevenLabs/Bria exactos, Seedance 2.5 bloqueado y workbenches externos
  en `watch`.
- Se endurecieron los contratos de costo, privacidad, derechos, aprobación single-use, no-double-spend,
  observabilidad, DR y agent permissions. No se creó runtime, adapter, credencial ni gasto; EPIC-028 sigue siendo
  la frontera de implementación.

## 2026-07-19 — Efeonce Globe inicia construcción como Creative Studio hermano

- Se fijó **Efeonce Globe** como nombre canónico interno del Creative Studio y EPIC-028 pasó a `in-progress`.
- Se creó el repositorio privado `efeoncepro/efeonce-globe` y el único proyecto GCP inicial `efeonce-globe`,
  aislado de Greenhouse, con billing y APIs base pero sin workloads, datos, buckets, secretos ni gasto de providers.
- El monorepo foundation en Node 24 incorpora contratos UI/MCP, dominio de runs, provider boundary, media QC,
  runner async, CI y gobernanza. CI remota verde; IAM/WIF, budgets, IaC y primer vertical slice siguen pendientes.

## 2026-07-19 — Globe queda alcanzable desde Greenhouse como piloto interno

- TASK-1454 generalizó el broker OAuth de sister platforms mediante policy validada por client, preservó Kortex y
  registró Globe con audiencia `efeonce_internal`, capability namespaced y claims mínimos sin roles Greenhouse.
- Se aplicó la migración aditiva aprobada, se desplegaron callback web y API privada en Cloud Run y se verificaron
  PKCE/replay, acceso humano interno, denegación de tenant cliente, revocación convergente, correlación y audience
  exacto/incorrecto. El bridge Vercel OIDC → WIF → Google ID token opera sin service-account keys.
- Globe permanece activo sólo como piloto interno no productivo. No se habilitaron clientes externos, Production,
  providers creativos, DB ni buckets. La UI/branding con logo canónico continúa en una task `ui-ux` separada.

## 2026-07-19 — Contexto de agentes migra a router con preservación verificable

- `AGENTS.md`, `project_context.md` y `Handoff.md` dejan de operar como monolitos append-only: ahora separan
  reglas transversales, estado vigente y continuidad activa con carga por dominio.
- Los cuatro archivos anteriores al corte quedaron preservados byte-for-byte con manifest SHA-256 bajo
  `docs/operations/agent-context-history/2026-07-19/`; `Handoff.archive.md` pasa a ser índice.
- `pnpm docs:context-check:strict` aplica budgets, máximo 20 sesiones, targets y hashes; la rotación futura usa
  `pnpm docs:context-rotate --apply`, conserva por fecha, indexa shards con hash y aborta ante ediciones
  concurrentes; un workflow CI independiente evita reacreción.
- `CLAUDE.md` y su CI no fueron modificados; su pointer existente abre el operating model y los entrypoints
  `.claude/commands/implement-task.md` + documentation governor aplican el nuevo protocolo, verificado por CI.

## 2026-07-19 — Campaign Layout Compiler V1 ejecutable

- Se añadió `pnpm creative:layout` con modos `plan|compile|check` para convertir contratos YAML/JSON en fuentes
  SVG editables, underlays, masters, manifests/hashes, contact sheet y QA, sin llamadas a modelos.
- El compiler bloquea inputs faltantes y checkpoints de anchor/layout/finish; el release humano sigue separado.
  Paths relativos y SHA-256 hacen portable el relevo, y un baseline MAE opcional protege migraciones de masters.
- High Frequency se recompiló en `16:9`, `4:5` y `9:16` sin nueva inferencia: QA `3/3`, desviación normalizada
  `0,001096–0,001155` contra los masters previos, bajo el gate `0,002`.
- Sus 84 binarios (`148861636` bytes) se archivaron en el bucket privado canónico de GCP; Git conserva el
  manifiesto remoto con tamaño/SHA-256, contratos, QA, scripts y SVG editables, sin sumar esos assets a Vercel.
- Se sincronizaron contrato técnico, documentación funcional, manual y skills Codex/Claude. Es tooling
  out-of-band: no cambia runtime, IAM, secretos, despliegue ni activación en medios.

## 2026-07-19 — Layout Design & Finishing canonizado para producción estática premium

- El método `anchor → layout contract → clean plate por ratio → bounded finish → composición determinística
→ mastering → QA` se incorporó al canon multimodal, con documentación funcional y manual operativo.
- `design-studio` suma el módulo 13 y un contrato YAML reusable; `greenhouse-ai-image-generator` adopta el
  mismo routing. Codex y Claude quedaron espejados.
- Regla dura: Seedream Pro termina material/luz/color/atmósfera; GPT Image 2 corrige geometría/safe zones o
  regiones protegidas; copy, logo, CTA, legal y locale nunca se devuelven al modelo después de componerlos.
- El piloto High Frequency produjo `16:9`, `4:5` y `9:16`, pasó QA `3/3`, obtuvo `47/50` y registró costo
  incremental estimado de `USD 0,27`. Es benchmark observado, no SLA. No cambia runtime, IAM ni despliegue.

## 2026-07-18 — Worked example E2E de campaña visual multimodal

- Se produjo y versionó `ai-generations/2026-07-18_high-frequency-campaign-e2e/`: brief, fuentes,
  prompts, scripts, contratos de relevo, lineage, costo, QA, review board y paquete final.
- El routing validado usa Seedream 5 Lite para divergencia, Seedream 5 Pro para el mundo visual,
  GPT Image 2 para plates directos y Gemini Omni Flash para clean motion; Sharp/fontkit/FFmpeg resuelven
  copy, marca, end cards y exports. La topología es estrella, sin derivados en cadena.
- Se entregaron 18 stills (digital, A2 y OOH), 2 heroes motion de 15 s, 2 masters de 10 s y 2 bumpers
  de 6 s. Los heroes combinan el clean shot aprobado con claims exactos, una pared de formatos reales
  y end card determinísticos; agregarlos no requirió nueva inferencia. El clip Omni inicial de 3 s queda
  como technical probe y no como asset. QA `18/18 + 6/6`, audio de heroes medido en `-16.3/-16.4 LUFS`
  y true peak `-2.0/-2.2 dBFS`, score `47.4/50`, ZIP V3 reproducible y costo generativo release estimado
  de `USD 2.9650`. La auditoría endurecida mide los seis MP4 y deja masters/bumpers explícitamente pendientes
  de normalización por destino; Seedance 2.0 queda como fallback sólo para una nueva toma, ángulo o continuidad
  física ausente. La entrega
  queda aprobada como creative release; media activation sigue fuera de alcance hasta definir
  audience, offer, landing, tracking, presupuesto, legal, escucha humana y experimento.

## 2026-07-18 — Secondary Tidal Teal tokenizado y validado

- Se reemplazó el secondary lime/green por una familia Tidal Teal propia: ramp `100→900`
  `#DDF9F5→#083F3D`, anchor `500 #12AFA2`, opacidades derivadas y aliases semánticos por modo.
  Light usa `700 #0B726C` + blanco (5.77:1); dark usa `400 #3BCBBD` + Midnight (7.25:1).
- `mergedTheme` resuelve secondary por modo; Colors, Buttons, Chips, nomenclatura/chart secondary y
  Careers consumen el SoT. La antigua cláusula verde de TASK-1053 queda supersedida por
  `GREENHOUSE_SECONDARY_TEAL_COLOR_DECISION_V1.md`; AXIS Figma requiere reconciliación upstream.
- El Colors Lab ahora expone el mapping funcional, corrige 142 atributos ARIA inválidos y 53
  contrast findings preexistentes. Nuevo GVC `design-system-colors` desktop/mobile con accessibility,
  layout y runtime gates; baseline durable de cuatro frames, rerun con drift `0.00%`. Buttons y Chips
  también pasaron sus escenarios desktop/mobile y fueron inspeccionados.
- `ui:code-lint` permite HEX sólo en fuentes canónicas de color y fixtures de drift, manteniendo el
  bloqueo en consumers. El kill-switch canónico es `NEXT_PUBLIC_GREENHOUSE_SECONDARY_TEAL_ENABLED=false`;
  unset/default = Tidal Teal. El flag lime anterior queda retirado.

## 2026-07-18 — Método híbrido Seedream 5 ↔ GPT Image 2 para campañas still

- `design-studio` y `greenhouse-ai-image-generator` ahora diseñan una secuencia de manos:
  Seedream Lite para divergencia, Seedream Pro para materialidad/atmósfera, GPT Image 2 para
  estructura/reparación/adaptación y composición determinista para copy/logo/legal.
- Se agregaron módulo de producción, referencia técnica y contrato YAML de relevo, espejados para
  Codex/Claude. El flujo usa anchors aprobados, topología estrella, gates representativos por lote y
  un executor destino explícito; evita cadenas de derivados y comparaciones uno-a-uno sin operación.
- Dos pruebas reales validaron ambos sentidos. Los assets permanecen en `.captures` (gitignored);
  no se cambió runtime, IAM, secretos ni deploy. El puente GPT local → Fal usa upload temporal
  `fal-cdn-v3`, sin bucket público ni expansión de permisos GCP.

## 2026-07-18 — TASK-1453: Premium Agentic UI Platform

- Se cerró la causa sistémica de la UI genérica: nuevas interfaces `ui-standard`/`ui-platform` parten de Visual Direction + surface recipe + Composition Shell, no de un grid MUI. MUI/Vuexy quedan como foundation accesible, no como autor visual.
- Se incorporaron seis recipes y ocho primitives compuestas, Lab `/design-system/surface-recipes`, semántica `data-ui-surface`, presupuesto de máximo tres superficies `contained` en el first fold y blockers explícitos para card-on-card, mobile serializado y ausencia de impacto visual.
- Cuatro gates separan contrato, código, evidencia y calidad. GVC premium revisa desktop/390 px, enterprise rubric y dossier de catorce dimensiones; aceptación: media ≥4.5/5, piso ≥4 y cinco dimensiones críticas ≥4.5. ADR y reglas de Codex/Claude sincronizados.
- Hardening posterior al repro cross-agent: `ui:code-lint` reconoce `customShadows` como
  compatibilidad Vuexy sólo fuera de primitives, exime tamaños ópticos de glyphs Tabler
  y preserva números de línea reales en `--changed`; sombras literales y tipografía
  inline siguen bloqueadas.

## 2026-07-18 — TASK-1430: cockpit operator de CTAs (autoría gobernada + métricas + kill switches) — code complete

- `/growth/ctas` evoluciona a cockpit master-detail (CompositionShell `split` con nueva prop
  `splitTemplateColumns`): inventario con filtros/teclado + detalle con lifecycle completo, kill
  switches global/surface operables (reason auditado), preview del renderer canónico, superficies,
  supresión y versiones. Autoridad visual: proyecto Claude Design «Cockpit de CTAs» (instrucción
  del operador), traducido a tokens del theme.
- Autoría gobernada de 8 pasos en drawer (intención→…→revisión) consumiendo la metadata del Action
  Registry TASK-1431 (cero enum paralelo); preview harness con scrubber de density (umbrales reales
  560/400), claro/oscuro, hosts Think/WordPress y matriz pairwise; el mount degradado bloquea la
  revisión. Dirty-close con confirmación; submit server-confirmed.
- Métricas de marketing pedidas por el operador, resueltas SERVER-side: `getCtaMarketingMetrics`
  (impresiones Tier B viewed, clics, conversiones solo `server_confirmed`, CTR/tasa + deltas
  ventana-a-ventana, guard `impressions_undercounted` que evita % imposibles) wired a
  `CtaDetailVm.metrics`; `authorDraftCta` acepta `suppressionPolicy`. SQL vivo verificado (gate
  TASK-893). GETs admin + POST author des-gateados de `GROWTH_CTA_ENGINE_ENABLED` (el flag gobierna
  exposición pública). GVC desktop+mobile mirados. Arch §28 + skill actualizada (ambos espejos).
  Rollout pendiente: push + smoke staging.
