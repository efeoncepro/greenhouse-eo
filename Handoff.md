# Handoff activo

Historia anterior: [Handoff.archive.md](Handoff.archive.md).

## TASK-1633 / ADR-022 — auditoría arquitectónica y dónde viaja el valor de un control (2026-08-02)

- **Auditoría con `arch-architect` contra `ISSUE-126`/`127`/`135`.** El eje de inputs está bien resuelto y no se
  tocó. Tres hallazgos, por costo de revertir: (1) `creativeControls` no era un eje nuevo sino el **tercero** que
  expresa lo mismo que `StructuredBriefV1` y `RouteConstraintsV1`; (2) los cinco códigos de error canónicos que la
  task promete **tienen cero ocurrencias** — el compiler colapsa nueve causas accionables en
  `route_creative_contract_mismatch`, décima aparición del bug class de `ISSUE-127`; (3) ese rechazo **no está en
  `TERMINAL_CODES`** pese a ser determinista, así que cae a `unknown` con tope 3 — versión atenuada de las 705
  entregas de `ISSUE-135`, y en el mismo camino de materialización de inputs.
- **ADR-022 Delta (b) aceptado:** `creativeControls` **declara soporte y nunca transporta valores**. El valor de
  dirección viaja por el canal que ya existe, `prompt XOR structuredBrief`, y los controles que el brief no tiene
  (`camera`, `lens`, `motion`, `timing`, `audio-direction`, `negative-prompt`) entran como ingredientes nuevos.
  `duration`/`aspect-ratio`/`resolution` salen de los controles: su dueño es `RouteConstraintsV1`/`OutputShapeV1`.
  `RouteCreativeIntentV1` **no gana campo de controles**.
- **Lo que desempató no fue lo que esperábamos.** La hipótesis era que el store de recetas de `TASK-1493` tenía
  datos cuya migración decidía el asunto. Lectura pura contra producción: **0 recetas, 0 workspaces**; en cambio
  `prompt_history` con **144 entradas** activas ese día. El argumento correcto resultó ser otro: la regla de
  exclusión mutua **ya corre en producción** (`producer-client.ts:1191`, `producer_prompt_contract_invalid`) y un
  campo de valores en el intent la eludiría por el costado, habilitando dos direcciones contradictorias sin error
  observable.
- **ADR-022 Delta (c) aceptado — el prompt efectivo también se compila por ruta.** El mismo defecto que la task
  corrige en inputs seguía intacto en el único eje que **todas** las rutas consumen: `compileStructuredBrief`
  (`structured-briefs.ts:142`) es global y corre en `domain` antes del adapter, contra la regla del propio ADR de
  que sólo los adapters traducen; el puerto lo delata en su firma (`compile(raw)`, `app.ts:1416`, sin ruta).
  Decidido: compilación por ruta detrás del adapter con revisión propia en el fingerprint, el peso **ordena pero
  no se imprime** (hoy se emite `[weight=0.820]` y el encoder lo lee como texto: no condiciona), el rol del slot
  informa el texto compilado (hoy se valida y muere ahí), y `native-parameter` gana siempre que exista. **Cuál
  dialecto es mejor no se decide, se mide** con el Evaluation Harness (`TASK-1458`).
- **Dos mediciones que lo sostienen:** **13 de 17 rutas** heredan `PROMPT_CONTROLS` sin evidencia propia, y
  **ningún adapter manda campo negativo nativo** (cero `negative_prompt` en `apps/creative-runner/src`) — así que
  `negative-prompt: prompt-semantic` es una promesa heredada, y la negación en texto tiende a reforzar lo que
  niega. El cambio es de **firma**, no de arquitectura: el puerto ya existe y la implementación por defecto
  preserva el texto actual de todas las rutas.
- **Hallazgo lateral para `TASK-1552`:** la capability de guardar/reutilizar recetas existe desde el 2026-07-22 y
  tiene **cero uso porque nunca tuvo UI**; y el composer usa el brief de forma degradada — el prompt entero entra
  como un solo ingrediente `subject` de peso 1, con la composición ponderada construida y sin ejercer.
- Task actualizada con Slice 3.5, `valueShape`, criterio 7 desmarcado (su guard es de autoría del catálogo, no de
  ejecución) y dos criterios nuevos. Corregido el delta previo: el fingerprint **sí** incluye roles y ordinales.
- **Reparto de alcance para que 1633 tenga un cierre alcanzable.** Una foundation no puede quedar abierta
  esperando trabajo que no controla:
  - **`TASK-1504` (Delta b)** recibe el **canary de Omni** y la simetría API/worker del transporte. El bloqueo es
    suyo y es P0: la identidad declara `vertex-omni` mientras `app.ts:4173,4175` inyectan Generative Language, así
    que hoy cobraría por una identidad distinta de la aprobada. Sus rutas nuevas declaran mecanismos con evidencia
    en vez de heredar el default.
  - **`TASK-1552` (Delta b)** recibe la medición del composer —**el descriptor ya le llega al navegador y la UI lo
    ignora**, `mode` es índice numérico, `references` es lista plana sin rol, 3.064 líneas— y tres capacidades
    pagadas sin superficie: recetas guardadas en **0** desde el 2026-07-22, composición ponderada ejercida al
    mínimo, y el campo de exclusión ofrecido sin mecanismo nativo en ninguna ruta.
  - **`ISSUE-127`** registra su **décima** aparición, con el agravante de que los cinco nombres correctos ya
    estaban escritos en la spec de 1633 y la implementación los colapsó igual.
  - **`ISSUE-135`** registra que la clasificación necesita una **regla de nacimiento**, no otra fila: el tope
    funcionó y por eso el defecto queda invisible. Abrir razones y clasificarlas es un solo trabajo.
- 1633 conserva: eje de aplicación, Slice 4, razones nombradas y mecanismos por ruta. Suelta el canary.
- **Ejecutado el mismo día — Slices 1 y 2 en Globe, `code complete, rollout pendiente`:**
  - `efeonce-globe@8986b45` — ocho códigos, uno por causa. Media type y MIME separados porque el remedio difiere
    (otro asset vs convertir el que tienes); `route_creative_contract_incomplete` con código propio porque «llegó a
    medias» se resuelve re-preparando, no es un desajuste. Tabla de causas **probada en rojo** + aserción de
    unicidad contra la recaída. Cierra `ISSUE-127` en Globe.
  - `efeonce-globe@ac1999f` — el hallazgo que amplió el slice: de **35 razones del compiler, sólo 2 estaban
    clasificadas**. 38 pasan a `terminal`, 3 a `transient`, 2 quedan `unknown` **con su razón declarada**. Test que
    rompe el build si una razón nueva nace sin clasificar, probado en rojo en ambas direcciones. Cierra el punto de
    clasificación de `ISSUE-135`; sus dos señales siguen abiertas.
  - **Por qué estaba invisible:** el tope de ISSUE-135 hizo su trabajo. Tres reintentos no llaman la atención de
    nadie — así es como una red de seguridad esconde el problema que contiene.
  - Sin migración (se registran como `route_dependency_unavailable`). `pnpm check` + `pnpm build` exit 0;
    `creative-runner` 270 → 282.
- **ROLLOUT EJECUTADO Y VERIFICADO EN RUNTIME (2026-08-02).** `ac1999f` en `origin/main`, CI verde sobre ese SHA;
  `globe-api-internal` en revisión **`00194-l4s`** con imagen `…:ac1999f2ea16` y 100 % del tráfico (responde 403,
  vivo y protegido); `globe-producer-worker` con digest `sha256:c3c48db2…` etiquetado al mismo SHA.
  **Blast radius medido, no supuesto:** el cambio altera cuándo muere un job, así que se verificó contra la outbox
  viva — `outboxDeadLetter` estaba en **1 desde 2,5 h ANTES** del deploy y venía bajando (5 → 3 → 1) por la limpieza
  de ISSUE-135; post-deploy sigue en 1, `outboxRetryStorm` en 0, worker con `claimed=0`. **El rollout no mató
  ninguna corrida.**
  Método a recordar: la lectura directa a PG no estaba disponible (**ADC vencida, `invalid_rapt`** — el gcloud CLI
  seguía vivo, sólo el ADC caducó), así que la evidencia salió del payload estructurado del worker. Salió mejor: da
  la **serie temporal**, y era la serie —no el valor— la que probaba que el dead letter no era nuestro.
- Greenhouse: `ops:lint --changed` verde sobre las 3 tasks.

## TASK-1631 / MCP — canon de scopes, CIMD como registro primario y benchmark de proveedor (2026-08-02)

- **Cambio de invariante en el ADR propuesto** `EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (sigue
  `Proposed`, sin aceptar): **DCR quedó deprecado en la spec MCP vigente** y el orden normativo pasa a
  pre-registro → **CIMD** → DCR → manual (`SHOULD` para CIMD contra `MAY` para DCR, verificado 2026-08-02). Un
  proveedor con DCR y sin CIMD ya **no cumple** el requisito. Afecta el criterio de selección, no el runtime.
- **Riesgo de `subject` pairwise descartado con medición:** los once candidatos SaaS emiten `public`. El único
  `pairwise` es Entra —carril interno— y particiona por **App ID**, no por sector identifier del estándar, así que
  desktop y web con la misma App Registration comparten `sub`; el identificador estable cross-app sigue siendo
  `oid`+`tid`, que el write de fondeo ya usa. Se corrigió la advertencia previa sobre host de redirect.
- **Canon de scopes sincronizado, drift cero verificado por grep** en 15 archivos (arquitectura, runbook, doc
  funcional, manual de operador, `GLOBE_RUNTIME_HANDOFF`, TASK-1473/1626/1631, plan, ambos espejos de
  `efeonce-mcp-platform` y el overlay Codex-only `software-architect-2026`). Lo verificado es co-emisión **base +
  reader**; el write interno `efeonce.mcp.globe.credits.funding.ensure` es un tercer scope declarado, flag-gated,
  con consentimiento propio y **no** verificado en esa co-emisión. `pnpm skills:mirrors` verde.
- **Hallazgo de seguridad que TASK-1631 ahora gobierna:** el verificador del gateway es single-issuer, descarta el
  `subject` (`clientId = azp ?? sub`) y fusiona `roles` dentro de `scopes`. Con un segundo issuer eso permitiría
  que un scope string externo satisficiera una tool internal-only. La task exige autoridad calificada por issuer,
  contexto con `issuer`/`subject`/`clientId`/`audience`/`delegatedScopes`/`roles` separados y binding por
  `(issuer, subject)`. Nada de esto está implementado: es diseño gated.
- **Benchmark de proveedor con precios oficiales:** WorkOS confirmado a **USD 99/mes planos** en 1/5, 5/25 y 20/100
  (el costo lo fija el custom domain, no el volumen; organizaciones sin cargo ni tope). Runner-up Stytch (USD 0
  base, precio de dominio no público). Logto y FusionAuth descartados por no soportar DCR. Curva a modelar:
  SSO/SAML de WorkOS a **USD 125 por conexión/mes**.
- **TASK-1631 quedó `template=1, errors=0, warnings=0`** tras reescritura completa (antes linteaba `legacy`) más
  cuatro rondas de revisión cruzada. Sigue `to-do` y **bloqueada por tres gates**: aceptación del ADR, aprobación
  de proveedor/plan con costo presentado, y **revisión de privacidad/subprocesador** — gate nuevo, porque es el
  primer flujo que rutea PII de personas de organizaciones cliente a un procesador externo.
- Sin cambios de runtime, secretos, DNS ni provisión externa. Commits: `746999fed`, `8533fd533`, `1c7dcce3a`,
  `0155f1f77`, `6f57819ca`, `385cbf76b`.

## Finance Core + Cost Accounting + cotización agentic — planificación (2026-08-02)

- [ADR-021](docs/architecture/GREENHOUSE_FINANCE_CORE_ACCOUNTING_FOUNDATION_DECISION_V1.md) aceptado; `EPIC-012`
  es owner. Sus 11 candidatas no estaban reservadas y deben reenumerarse desde TASK-1634 al confirmarlas.

## TASK-1633 — Fases 1-2 cerradas y desplegadas; canary bloqueado por IAM (2026-08-02)

- Continuidad tomada desde el handoff de Codex. Estado: **`code complete, rollout pendiente`**.
- Globe `main@b062d6f` con CI verde y **desplegado**: API `globe-api-internal-00192-nmh` (imagen `b062d6f2df11`)
  y Producer worker desde el mismo SHA. Ambas service accounts tienen `roles/aiplatform.user`.
- Cerrado: endurecimiento de `authority`/`ordered`/`audioPackaging` (los tres estaban declarados y sin validar);
  las tres suites del plan (fingerprint en seis ejes, placeholder faltante, conformance Seedance/Omni/Veo);
  `inputCombinations` cumpliendo ADR-022 (el ADR declara *conjuntos* y sólo uno era representable); **Omni por
  Vertex ADC** con el endpoint aprobado atado al snapshot (falla cerrado antes de gastar si diverge); y la
  precedencia de lineage que el operador detectó (lo verificado gana sobre la intención del caller).
- `pnpm check` y `pnpm build` exit 0. contracts 48 · domain 450 · creative-runner 270 · studio-web 290.
- 🔴 **Bloqueo abierto:** los canaries facturables de Seedance y Omni **no corrieron**. Acuñar el ID token del
  canary exige impersonar `greenhouse-globe-caller@` y devuelve `IAM_PERMISSION_DENIED`; la identidad local es un
  usuario y no existe binding de `serviceAccountTokenCreator`. No se auto-otorgó el rol. Preferencia de
  desbloqueo: dos generaciones desde el Producer en el Chrome autenticado del operador (la skill declara que ésa
  es la prueba de salida), o el operador corre el canary, o grant temporal con readback. Detalle en la task.

## TASK-1633 — contrato route-driven del Producer y orden de estabilización (2026-08-02)

- ADR-022 aceptado. Globe tiene WIP **sin commit** sobre `main@a24910c`: contrato, assignments y fingerprints.
  Falta el gate raíz.
- P0: Vertex ADC simétrico API/worker, identidades Omni separadas y UI sin mezcla operación/modelo/inputs.
  Runtime previo: saga/readiness/binding/circuito reconciliados, 784 créditos; sin canary Omni ni `canary-confirm`.
  No repetir evaluación, candidato retenido ni fondeo.
- Continuidad Claude: cerrar foundation; luego Vertex/UI/deploy y canaries Seedance + Omni. Greenhouse
  `develop@23fcdf54a` contiene tres commits MCP locales: staging por path. Estado completo:
  [`plan`](docs/tasks/plans/TASK-1633-plan.md) ·
  [`task`](docs/tasks/in-progress/TASK-1633-globe-producer-operation-input-control-contract.md) ·
  [`runtime`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).

## Gate canónico de licitaciones / Brightcell (2026-08-02)

- Se agregó `pnpm tender:canonical-gate <slug>` y el registro durable `proposal-studio.json`. Una salida de
  `pnpm deck:compose` bajo `.captures/` queda explícitamente en `workshop_only`; no es Proposal ni asset productivo.
- El gate solo pasa con `status=verified`, `proposalId`, render job `client_facing` completado, PDF/previews
  versionados en `proposal_assets` y verificación autenticada del Portal/API. `pnpm qa:gates --changed` lo ejecuta
  y reporta `BLOCK` si falta la cadena.
- Brightcell quedó documentada en `workshop_only`; regularización pendiente en Proposal Studio. No se ejecutó
  creación de Proposal, render productivo, gcloud ni ADC durante esta implementación.

## WIP saneado — Globe, Brightcell y Polpaico (2026-08-01)

- ADR-019 `Accepted`; ADR-020 `Proposed`. Brightcell: **no enviar** hasta Finance. Polpaico: `HOLD / NO-BID`, sin precio/deck emitible. Detalle en `changelog.md`.

## TASK-1614 — canary cerrado (2026-08-02)

- TASK-1614 está completa: Seedance motion terminó `canary_passed` con 16 créditos, playback/governance y lineage.
  No reabrir su evaluación/promoción/fondeo; el próximo Seedance es sólo la regresión UI exigida por TASK-1633.

## Studio Credits — fondeo enterprise UI/API/CLI/MCP y readback convergente (2026-08-01)

- Saldo vigente esperado: 784 de cap 1500; no fondear. UI/CLI/MCP comparten ledger y todo transporte ambiguo exige
  readers antes de reintentar. Contrato/runbook: [`fondeo`](docs/manual-de-uso/creative-studio/fondear-creditos-globe.md)
  y [`evidencia`](docs/operations/creative-studio/evidence/2026-08-01/README.md). Sin rollout externo.

## Checkout compartido único — worktrees prohibidos (2026-08-01)

- Se eliminaron los dos worktrees temporales creados erróneamente bajo `/private/tmp/greenhouse-mcp-push.*` y el
  worktree de rescate `/Users/jreye/.codex/worktrees/ecd5/greenhouse-eo`, que estaba limpio, 777 commits detrás y
  0 por delante de `develop`. Greenhouse conserva un único checkout en `develop`; Globe uno en `main`.
- Todo agente debe operar sólo en el checkout compartido actual. No puede crear, usar, integrar, limpiar ni
  eliminar worktrees, checkouts aislados o carpetas clonadas; si el estado compartido bloquea, debe detenerse y
  pedir dirección al operador. Canon:
  `docs/architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`.
- Se retiró el drift que todavía inducía Globe `develop`: `efeonce-globe/AGENTS.md` ahora fija `main` como rama
  única de trabajo/integración/release, CI sólo acepta push a `main`, EPIC-028 declara el contrato por repositorio
  y el helper `worktree-sync` quedó retirado fail-closed. `pnpm codex:task-hook:check` bloquea la reintroducción
  de ramas por task o comandos activos de worktree; el pre-commit ejecuta `lint-staged --no-stash` para no apartar
  WIP ajeno. Un commit no autoriza deploy automáticamente.

## Globe — ADR-018: continuidad móvil native-first como dirección, no rollout (2026-08-01)

- [ADR-018](docs/architecture/creative-studio/EFEONCE_GLOBE_MOBILE_CONTINUITY_APPLICATION_DECISION_V1.md) fija Globe como **continuity-first y native-first para Android/iOS**: React Native + Expo development builds/CNG es la dirección tecnológica de la companion; web/PWA queda como fallback. No se creó una skill nueva, no hay app/runtime rollout y el vertical slice requiere PKCE, deep links, captura, upload interrumpible, push reconciliable, handoff, compatibilidad binary/API, task, policy, owner y gates. Funcional/manual: [`mobile continuity`](docs/documentation/creative-studio/efeonce-globe-mobile-continuidad.md) · [`validación`](docs/manual-de-uso/creative-studio/operar-globe-continuidad-movil.md).

## Efeonce MCP — reader y write one-shot de Studio Credits verificados (2026-08-01)

- `mcp.efeonce.org`, el reader Globe y el write interno one-shot están operativos; clientes externos siguen gated
  por TASK-1631.
- TASK-1631 separa sesiones, no identidades: un `identity_profile` + Account 360; linking, revocación y convergencia
  posterior del login Greenhouse preceden el rollout.

## AXIS — guía visual agent-facing publicada (2026-08-01)

- `efeoncepro/axis-design-system` publicó `DESIGN.md` en `main` mediante `0e3c4d6`.
- El documento sigue el formato alpha de Google, pero es una proyección generada desde `packages/tokens`,
  no un segundo SSOT. `pnpm design:generate` lo regenera y `pnpm design:check` detecta drift; CI lo valida.
- Las skills AXIS de Codex y Claude, el runbook, la arquitectura UI y `project_context.md` ya apuntan a la
  guía. Greenhouse conserva su `DESIGN.md` separado como contrato específico MUI/Vuexy.
- `TASK-1590` llevó el Lab desde Vite vanilla a Astro `7.1.6`: salida estática, Content Loader tipado,
  catálogo y rutas por pattern, documentación MDX, sitemap, metadata SEO, script vanilla mínimo, Vitest y
  Playwright desktop/mobile. No hay React, SSR, Actions, secretos ni imports desde Greenhouse/Globe.
- Verificado en el repo AXIS: `pnpm install --frozen-lockfile`, `pnpm design:check`, `pnpm build`,
  `pnpm typecheck`, `pnpm test`, `pnpm lint`, `git diff --check` y preview local HTTP 200.
- Estado honesto: el runtime base está desplegado, pero la migración del catálogo Greenhouse sigue abierta.
  Las entradas no reconstruidas son `reference skeletons`; no se retira `/design-system` hasta cerrar parity
  contractual, funcional, estética, motion, accesibilidad y evidencia de consumidor. `TASK-1382` no es dependencia.
- Rollout realizado el 2026-08-01: deployment `dpl_8TohYh27fJizvDVC3MV5aoemvFPK`, alias público
  `https://axis-design-system-lab.vercel.app`, `READY`, Astro/output `apps/lab/dist`, Node 24. Se retiró la
  protección SSO del proyecto porque el Lab ya tenía decisión explícita de ser público; `/`, `/docs/`,
  `/references/colors/` y `/sitemap-index.xml` responden `200`.
- Empezó la migración Greenhouse → AXIS: `colors`, `typography`, `geometry` y `elevation` ya tienen referencias
  token-backed en `/references/colors/`, `/references/typography/`, `/references/geometry/` y
  `/references/elevation/`; el inventario y el triage están en
  [`AXIS_GREENHOUSE_LAB_MIGRATION_INVENTORY_V1.md`](docs/architecture/AXIS_GREENHOUSE_LAB_MIGRATION_INVENTORY_V1.md).
- El primer bloque pure-UI tiene contratos publicados; `button`, `chip`, `breadcrumbs`, `floating-surface`, `motion` y
  `charts` y `disclosure` están documentados como `candidate parity`; `loaders` sigue siendo skeleton. La
  migración continúa y `/design-system` permanece como fallback hasta cerrar parity visual y de consumidores.
- También quedaron publicados `motion` y `border-beam` como contratos portables; `motion` ya tiene una reconstrucción
  de candidate parity en AXIS (`95bc3f2`): seis duraciones, cuatro easings, cuatro variantes, replay, estado
  manual sin motion y E2E responsive/reduced-motion. `microinteractions` sigue fuera
  del traslado inicial porque mezcla múltiples primitivas y estados de producto.
- `composition-shell` y `card-density` ya tienen fixtures estáticos en AXIS; el shell de Portal y su telemetría
  siguen excluidos del Lab público.
- El catálogo pure-UI también cubre `charts`, `roadmap-timeline`, `team-avatar-group` y `surface-recipes`; aún
  faltan las comparaciones visuales contra consumidores antes de retirar el fallback Greenhouse.
- `gradients` ya tiene fixture portable y `utilities` ahora se representa mediante `efeonce.activity-timeline`,
  sin datos operativos ni registros de auditoría.
- `brand-logos` ya tiene el gate público de provenance; los assets reales no se trasladan hasta tener source,
  licencia y checksum aprobados.
- `buttons` ya tiene una reconstrucción de candidate parity en AXIS (`b1c9869`): boards light/dark, 152 controles,
  matrices completas y E2E responsive/reduced-motion; falta el compare visual/computed contra Greenhouse MUI/Vuexy.
- `chips` ya tiene una reconstrucción de candidate parity en AXIS (`028dba2`): boards light/dark, 72 especímenes,
  avatar/closable, feedback atoms, spotlight/signal motion y reduced-motion; falta el compare visual/computed y
  provenance del avatar sintético.
- `breadcrumbs` ya tiene una reconstrucción de candidate parity en AXIS (`6979641`): cuatro ports, overflow nativo,
  variantes/kinds, hit area cómoda, motion sutil y reduced-motion; falta el compare visual/computed contra Greenhouse.
- `floating-surface` ya tiene una reconstrucción de candidate parity en AXIS (`72d03f4`): seis variantes V1, roles
  tooltip/menu/dialog, menú, editor dirty-safe, motion anchored y reduced-motion; falta compare visual/computed y
  focus return real contra el consumer Greenhouse.
- `disclosure` ya tiene una reconstrucción de candidate parity en AXIS (`0.1.1`): cuatro triggers con rotación/morph,
  contextualEditor, actionMenu, Escape, outside press, focus return, dirty guard y quickPeek explícitamente fuera de
  scope; falta compare visual/computed contra Greenhouse y canary del consumer.
- `leaderboard` ya tiene contrato y fixture estática con datos sintéticos; `brand-motion` ya tiene contrato y
  referencia orbital HTML/CSS sin SVG privado ni GSAP. El Lab queda en 27 páginas y 21 contratos; build, lint,
  typecheck, tests y 32 E2E pasan (4 escenarios con skip por proyecto). `axis.efeonce.org` ya resuelve a `76.76.21.21` y el smoke HTTPS devuelve `200`.
  La siguiente continuidad debe continuar con `handoff`, `microinteractions` y las superficies con API.

## Globe Producer — seis defectos de superficie, el pie de la app y la paginación del feed (2026-08-01)

Sesión reportada por el operador **mirando la pantalla**. Tres PRs mergeados y **desplegados**:
[#66](https://github.com/efeoncepro/efeonce-globe/pull/66), [#69](https://github.com/efeoncepro/efeonce-globe/pull/69),
[#73](https://github.com/efeoncepro/efeonce-globe/pull/73) — main `8989074`, verificado en vivo en
`globe.efeoncepro.com`.

**Lo entregado:** barra del documento tokenizada + `scroll-behavior: smooth` y barra del composer que se revela
en hover; anillo de créditos con hueco opaco que ahora mide el **ciclo** y no el stock, con `flame` en vez del
`sparkles` genérico de IA; `⌘K` como unidad (8 px → 2); controles de selección de las cards centrados y
honestamente apagados; **pie de la aplicación** con el wordmark de Efeonce, que el port a React había perdido;
barra del feed con alturas uniformes y alineada; y **paginación hacia atrás** del feed (25 → 50 piezas
verificado en vivo).

🔴 **Dos veces el mismo patrón en un día: la capability existe y la UI consume la mitad.** El compare de las
cards tiene su diálogo sólo en el legacy, y el feed tenía cursor keyset en el backend desde `TASK-1525` con el
`nextCursor` ignorado. Antes de declarar que «falta» una capacidad en el Producer, **verificar si ya está en el
contrato y sólo falta cablearla**.

🔴 **Regla del feed que no se ve desde el cliente:** una página hacia atrás no puede mover el `watermark` — el
backend lo calcula desde el último item, que hacia atrás es el más viejo, y adoptarlo hace re-traer todo lo ya
visto con la pantalla viéndose perfecta. Por eso el modo (`sync`/`changes`/`older`) viaja explícito.

⚠️ **Trampa operativa que costó reencauzar trabajo:** `gh pr merge --delete-branch` deja al agente en `main`
**local**, que en `efeonce-globe` suele estar viejo y divergente; se siguió editando sobre esa base sin notarlo.
Después de cualquier merge, `git rev-parse --abbrev-ref HEAD` antes de seguir.

⚠️ **Merge a `main` NO despliega.** `deploy-internal.yml` es `workflow_dispatch` manual: el operador vio el
`sparkles` viejo después del merge y eso es indistinguible de «el cambio no funcionó».

**Documentado en:** la skill `greenhouse-globe` (ambas copias, con el catálogo de las seis clases de defecto y
las trampas operativas) y el `Delta 2026-08-01` de
[`TASK-1559`](docs/tasks/in-progress/TASK-1559-globe-feed-viewer-client-port.md).

**Abierto:** (1) la píldora «N nuevas» — las novedades siguen entrando solas y empujando el contenido;
(2) **el anillo de créditos hoy no comunica capacidad operativa** porque el reader no expresa correctamente
período, funding, caps y holds. La decisión ya no está abierta: TASK-1482 corrige la verdad, TASK-1586 publica el
self-status y TASK-1628 lo consume sin matemática local;
(3) el `main` local del operador sigue divergente con 2 duplicados de trabajo ya mergeado.

## MiniMax H3 — documentación y task de integración Globe (2026-07-31)

- Fal live confirmó tres endpoints comerciales activos: `minimax/h3/text-to-video`,
  `minimax/h3/image-to-video` y `minimax/h3/reference-to-video`, con snapshot de precio de
  `USD 0,26/s`. La consulta y los probes fueron de catálogo/validación; no hubo generación.
- Se documentó la propuesta en [`EFEONCE_GLOBE_MINIMAX_H3_INTEGRATION_PROPOSAL_V1.md`](docs/architecture/creative-studio/EFEONCE_GLOBE_MINIMAX_H3_INTEGRATION_PROPOSAL_V1.md).
- Se creó [`TASK-1616`](docs/tasks/to-do/TASK-1616-globe-minimax-h3-fleet-producer-integration.md),
  todavía `to-do`: integra las tres rutas, referencias image/video/audio, contratos, Producer,
  ingest/retrieval, rates, rights, evaluación, canary y promoción. No se ejecutó código de Globe.
- Siguiente paso: tomar `TASK-1616` con su goal/preflight, revisar ADR y ejecutar el plan en
  `efeonce-globe`; no marcar H3 `available` antes de los gates de onboarding y promoción.

## Fal challenger models — documentación y tasks Globe (2026-07-31)

- La consulta autenticada de Fal confirmó rutas activas para Kling 3/O3, Grok Imagine Video, Wan 2.7 y FLUX.2 Max/Edit; no existe endpoint exacto `Flux 3` en el snapshot.
- Se documentó la matriz de capacidades y reutilización/extensión en [`EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md`](docs/architecture/creative-studio/EFEONCE_GLOBE_FAL_CHALLENGER_MODELS_PRODUCER_INTEGRATION_PROPOSAL_V1.md).
- Se crearon `TASK-1617` Kling, `TASK-1618` Grok, `TASK-1619` Wan y `TASK-1620` FLUX.2. Son tasks separadas porque sus schemas, derechos, rates, outputs y canarios no son intercambiables; comparten el seam Fal y las extensiones de Producer de `TASK-1616`/`TASK-1573`.
- No se ejecutó código ni generación. Antes de implementar cada task se debe revalidar OpenAPI y pricing autenticados; todas las rutas parten `gated`.

## Imagen — expansión Fal y decisión Runway (2026-07-31)

- El ledger vigente de Globe contiene seis rutas raster disponibles: Seedream 5 Pro/ Edit, Nano Banana Pro/2 y GPT Image 2/1.5; Recraft v4.1 está promovido para vector.
- Se descartó Runway de esta ola: no está disponible en Fal y requeriría un proveedor directo, credenciales, billing y adapter propios; solo debe abrirse si un benchmark demuestra una ventaja de Gen-4.5 frente a Seedance/Veo.
- Se documentó la expansión en [`EFEONCE_GLOBE_IMAGE_FLEET_EXPANSION_PROPOSAL_V1.md`](docs/architecture/creative-studio/EFEONCE_GLOBE_IMAGE_FLEET_EXPANSION_PROPOSAL_V1.md) y se crearon `TASK-1621` Ideogram, `TASK-1622` Recraft Raster, `TASK-1623` Qwen Image 2 y `TASK-1624` Grok Image. FLUX.2 queda cubierto por `TASK-1620`.
- Se intentó lanzar una nueva flota de subagentes, pero el pool de hilos permaneció saturado por agentes completados no liberables desde esta sesión. La investigación se completó con catálogo Fal autenticado, OpenAPI/documentación oficial y lectura del runtime Globe; no se editaron repositorios hermanos ni se generaron assets.

## GitHub Actions — presupuesto de billing actualizado (2026-07-31)

- Se actualizó en GitHub el presupuesto de Actions de `efeoncepro` / Efeonce Group de USD 0 a **USD 20 mensuales**.
- Verificación: fila `Actions` muestra `$0 spent`, `$20.00 budget` y `Stop usage: Yes`; alertas y método de pago quedan configurados en GitHub.
- El límite es de gasto metered adicional y no aumenta los 2.000 minutos incluidos; el reset de la cuota reportada ocurre el 2026-08-01.
- Referencias: [`cloud-cost-intelligence-finops.md`](docs/documentation/operations/cloud-cost-intelligence-finops.md) y [`github-actions-budget.md`](docs/manual-de-uso/operations/github-actions-budget.md).

## Brightcell — continuidad de la segunda licitación con Artifact Composer (2026-07-31)

- Brightcell es el segundo deck de licitación producido con Artifact Composer y plantillas cerradas; SKY Blog 2026 es el primer caso de referencia.
- El método consolidado es: `intake/evidencia → narrativa → deck-plan → assets/mockups → composición → auditoría visual → validación`.
- La narrativa SEO/AEO usa `AEO Grader → X-Ray → Greenhouse` como diagnóstico, intervención y operación mensual; los mockups siguen rotulados como conceptuales hasta contar con runs o URLs reales.
- El deck Brightcell vive en `docs/commercial/tenders/brightcell-lic-95/` y sus salidas compuestas en `.captures/brightcell-bid-v13/`; SKY no fue sustituida.
- Las skills actualizadas son `deck-studio`, `seo-aeo`, `design-studio` y `greenhouse-ai-image-generator`; revisar sus patrones antes de iniciar la tercera licitación.

## TASK-1613 — modo claro de Globe con interruptor (2026-07-31, complete)

Interruptor de apariencia en el menú de cuenta del Producer. Habilitado por `TASK-1612`: desde que el
`:root` proyecta sobre el `@theme`, un tema es **un bloque de override** sobre las claves del theme — se
emiten sólo los **31 de 198** tokens que cambian. El modo oscuro no se movió ni un hex.

🔴 **Lo que hay que saber si alguien agrega una superficie:** el tematizado es **opt-in**
(`ShellOptions.themable`, default `false`). El share board heredaba el modo del `localStorage` sin tener
interruptor propio, y le habría mostrado al cliente la pieza sobre un fondo que el diseñador no aprobó.
**No se veía mal** — se veía perfectamente bien en claro, y por eso ningún barrido de contraste lo
habría encontrado. Hay gate que afirma el bi-condicional.

Lección del instrumento: el primer barrido de contraste reportó 61 fallos y casi todos eran mentira.
Sin control comparativo, un barrido sólo dice que el diseño tiene deuda; y un gradiente no se mide con
un número. Con las dos correcciones: claro y oscuro fallan en los MISMOS 14 textos (`--faint` a 40% de
alpha, deuda preexistente que este cambio no tocó).

**PROMOVIDO Y VERIFICADO 2026-07-31.** Cuatro PRs mergeados y desplegados en `efeonce-globe`: **#8**
(modo claro + consolidación del `:root`, `f3357d2`), **#15** (todo paquete compila antes de testear),
**#25** (el lecho de las piezas deja el azul del prototipo, `e27ffbe`) y **#27** (scrims y escenario,
`adc3941`). Revisión activa `00122-lwd`. El operador confirmó el resultado visual en vivo.

🔴 **Dos defectos aparecieron DESPUÉS del primer despliegue, y ni la suite ni el barrido los vieron.**
Los dos venían de tratar como SUPERFICIE algo que no lo es:

1. **Los scrims voltearon con el modo** y en claro pasaron a `#eceaf1`. Un scrim claro deja de ser un
   scrim: existe para que el texto blanco se lea sobre un medio ARBITRARIO, y el medio es arbitrario en
   los dos modos. El título de la pieza destacada quedó blanco sobre casi blanco, en producción. El
   barrido de contraste declara los gradientes «no medibles» a propósito, y el defecto cayó en ese hueco.
2. **El escenario de la pieza tampoco es superficie.** Hoy es el mismo magenta en ambos modos, lo que
   además le deja al producto una sola identidad.

**Lección que se repitió tres veces en el día:** se declaró «presencia equivalente» midiendo el PASO de
la rampa contra el canvas. Esa medición era del TOKEN, no de lo que RENDERIZA — ignoraba la composición
por alfa. **Un número sobre el token no describe el píxel.** Los tres defectos aparecieron MIRANDO.

**Drift CERRADO el mismo día.** `axis-tokens@0.2.4` porta las tres familias de acento leídas del archivo
en alta resolución; Globe subió el pin, consume `axisAccentRamp.magenta` y borró su copia local (PR #32,
rev `00123-gtv`). El valor servido no cambió —los mismos cinco hex, theme generado byte-identical—: sólo
cambió de quién es. `TASK-1615` cerrada.

Verificación cruzada que vale conservar: los nueve pasos de **orchid** que ya estaban en el paquete
coinciden EXACTAMENTE con el archivo. Cero drift ahí, lo que valida el método de lectura y descarta que
el problema fuera de transcripción y no de omisión.

**Queda abierto para el equipo de diseño** (escrito en `EFEONCE_AXIS_SURFACE_SCALE_AND_ACCENT_PROPOSAL_V1.md`):
si coral y magenta merecen rol —coral está a 14° del rojo de `danger` y es la más saturada—, y si el grupo
scrim/escenario se canoniza en AXIS **sin variante por modo**, para que la firma del token impida el error
en vez de un comentario que pida no cometerlo.

⚠️ Al rebasear sobre `origin/main` apareció que **su CI ya estaba rojo**: `packages/domain/dist` está
desactualizado respecto de `evaluation.ts` (`observeInvalidRequest` existe en el source y no en el
compilado). Se resuelve reconstruyendo el paquete; no es de estas tasks.

⚠️ Instalar desde GitHub Packages en local necesita el token por entorno — el `.npmrc` del repo lo
documenta pero con la variable de `setup-node`, que pnpm NO lee. La forma que funciona es
`env "npm_config_//npm.pkg.github.com/:_authToken=$(gh auth token)" pnpm install`.

## TASK-1612 — emisor de `:root` de Globe consolidado (2026-07-31, complete)

El payload cliente de Globe emitía sus custom properties desde dos mecanismos con nombres distintos
(`--canvas` en el `:root` del shell, `--color-canvas` en el `@theme` del bundle), así que no podía
re-tematizarse: mover uno no movía al otro. Hoy el `:root` **proyecta** sobre el `@theme` y un solo
override mueve utilidad y CSS plano a la vez — el paso previo que ADR-017 fijaba para cualquier modo claro.

**Cerrada con cero cambio visual, medido contra control.** El diff por bytes resultó inválido (el arnés
de captura no es determinista); por píxeles, toda diferencia observada aparece igual o mayor en un control
de dos corridas del mismo código. `globe-theme.generated.css` quedó byte-identical.

**Lo que hay que saber si alguien toca esto:** proyectar los namespaces passthrough emite
`--text-xs: var(--text-xs, …)` —referencia circular— y reproduce el incidente de ADR-016 con los tests
unitarios EN VERDE. Sólo el canario de browser lo ve. El fallback del `var()` es load-bearing: las
superficies legacy sirven ese `:root` sin Tailwind.

Instrumentos nuevos: `gates/root-theme-equivalence.test.ts` y `scripts/legacy-fallback-canary.mjs`, los dos
verificados poniéndolos rojo. Sin rollout pendiente — es cambio de repo, sin flags ni migraciones.

Commits en `efeonce-globe`: `422a768`, `362d6e1`. **Sin push** (local-first).

## 2026-07-30 — Globe: el theme del design system entra al payload (ADR-017 v2.0)

El runtime de Globe estaba pintado con una paleta que **no es la del design system**: `--action #4db8ff`
venía de un prototipo de Claude Design y no ocupa ningún rol. La marca real, definida por el equipo en el
Figma de AXIS, es **naranja `#FF6500`** con secondary morado `#4A108C`; las superficies (`body-bg`
`#25293C` / `paper` `#2F3349`) ya existen como tokens globales e incluso están en `@efeoncepro/axis-tokens`
byte por byte. **El chasis no se desatura: se adopta.**

ADR-017 quedó reescrito en v2.0 —no como delta al final, sino en el cuerpo— y decide: dark-only por
colorimetría (con condiciones de reapertura escritas), adopción del theme, arquitectura de superficie de
cuatro planos con la regla **«el contenedor del contenido se hunde; las piezas suben a `paper`»** (variante
C, la única que funciona en dark y en claro: 1,379 / 1,193 contra 1,157/1,067 y 1,192/1,118), presupuesto
del naranja, y tres reglas medidas — el CTA lleva **texto oscuro** (blanco da 2,95:1 y falla), la sombra de
marca no es la de superficie (elevar un header con la teñida produce un halo naranja), y el morado **no es
legible en dark** salvo `orchid-300` (4,80:1).

🔴 **El bloqueante es upstream y no es de Globe:** `@efeoncepro/axis-tokens` es **mono-marca**
(`axisRamp.primary[500]` es el azul de Greenhouse) y **no contiene la marca de Globe**, mientras el Figma ya
está modelado multi-marca. `TASK-1485` quedó re-scopeada con un **Slice 0 fuera de Globe** (AXIS publica
estructura multi-marca + los cuatro planos + el mapeo dark de `secondary`) y con `Out of Scope` explícito:
declarar los valores en Globe «mientras tanto» es teclearlos dos veces — el defecto que ya hizo divergir
`warning` y `danger` sin que nada lo detectara.

Documentos: ADR-017 v2.0, propuesta a AXIS con las mediciones
(`EFEONCE_AXIS_SURFACE_SCALE_AND_ACCENT_PROPOSAL_V1`), `TASK-1485` (summary/dependencies/scope reescritos)
y las filas de registry/README. Sin cambios de runtime. Queda abierto el **momento de marca**: adoptar el
theme deja el chasis correcto pero anónimo, y eso es composición — pertenece a `TASK-1523`.

## 2026-07-30 — Globe: documentación y skills reconciliadas con el rollout real

La arquitectura ADR-013, el epic, la auditoría WIP, los contratos funcionales/manuales, el ledger, el handoff
runtime, la evidencia y las skills gemelas de Globe/derechos quedaron reconciliados con el estado posterior a los
canaries de hoy. Se retiraron como estado vigente los bloqueos ya resueltos de OpenAI y Nano Banana 2, la dirección
rechazada de galería y el supuesto de que Recraft sólo vivía en el Lab.

El contrato reusable nuevo es fail-closed: un MIME genérico sólo puede aceptarse cuando la ruta exacta espera SVG
y los bytes verifican como SVG; el serving usa CSP sandbox. La prueba de salida de una promoción de modelo exige una
generación real desde la UI autenticada, además de evaluación, derechos, binding/readiness/circuito y readbacks.
No hubo cambios de runtime en este cierre documental. `TASK-1553` permanece `in-progress` únicamente por receipts de
`TASK-1468`/`TASK-1578`.

## 2026-07-30 — Globe: Recraft v4.1 promovido y probado desde Producer

Recraft v4.1 quedó disponible en `ref/still/vector-v1` con rate de 4 créditos, evaluación,
revisión humana, derechos comerciales, binding, readiness y circuito gobernados. La generación real
se inició desde el Producer con la sesión autenticada del operador: run
`b5631c86-707a-41d9-8ecc-ef61caa8200c`, `completed/retained`. La UI muestra el SVG, `Listo`,
estado `Guardada` y descarga habilitada.

El smoke detectó que Fal declara `image/svg+xml` en el payload pero su CDN transporta el archivo como
`application/octet-stream`. Globe `84d6a8e` resuelve la causa sin abrir el ingest: limita la excepción
a la salida SVG esperada, verifica los bytes y sirve el asset con CSP sandbox. Worker, API y Studio
quedaron desplegados con éxito. TASK-1553 conserva su único criterio transversal pendiente de
TASK-1468/TASK-1578. Detalle:
[`GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).

## 2026-07-30 — Globe: flota de imagen completa con Nano Banana 2

Nano Banana 2 (`gemini-3.1-flash-image`) dejó de estar bloqueado por allowlist y quedó promovido en
`ref/still/nanobanana-2-v1`: evaluación exacta 5/5, derechos comerciales, revisión humana, binding,
readiness y circuito gobernados. La prueba real salió desde Producer con la sesión autenticada del
operador, run `ce06f8b4-ebe9-43b6-9d47-8e4cc901f49a`, 10 créditos.

El smoke encontró un off-by-one en la reconstrucción del hash durable de Vertex. Globe `1fb57285`
lo corrigió con una regresión focal; CI `30565123529` y worker `30565166238` quedaron verdes. El
mismo run terminó `completed/retained` y la UI mostró `Listo`. La flota
de imagen queda en seis modelos disponibles: Seedream 5 Pro, Nano Banana Pro, Nano Banana 2,
GPT Image 2, GPT Image 1.5 y Recraft v4.1. TASK-1553 continúa `in-progress` sólo por los receipts transversales
TASK-1468/TASK-1578. Detalle:
[`GLOBE_RUNTIME_HANDOFF.md`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).

## 2026-07-30 — Skill AI Creative Rights & Enterprise Governance

Se creó `.codex/skills/greenhouse-ai-creative-rights-governance/` y su companion `.claude/skills/greenhouse-ai-creative-rights-governance/` para gobernar producción generativa enterprise en imagen, video, audio, música, voz, likeness, copy y medios híbridos. Incluye clasificación A–D, gates de inputs/providers/contratos, no-training vs retention/zero-retention/no-human-access/residency/isolation, estados `approved-commercial`/`approved-with-restrictions`/`proof-only`/`blocked`/`incident-replacement`, rights pack, AI Data Protection Pack, checklist de consentimiento y matriz de vetting de proveedores con baseline fechado 2026-07-30. El contrato canónico propuesto vive en [`GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1`](docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md). Estado: documentación completa para validación; adopción runtime, provider allowlist y cláusulas contractuales requieren validación de Legal/IP, Security, Operations, Finance y Commercial.

## 2026-07-30 — Efeonce Talent Assurance: documentación propuesta

La auditoría de selección en Berel se documentó como un gap de `Hiring Quality Assurance`, no como una falla
general de retención: las salidas fueron despidos por falta de conocimiento/capacidad, mientras diseño muestra
estabilidad. Se propuso `Efeonce Talent Assurance` como capa transversal para proteger el significado de
`Verificado por Efeonce` frente a cliente/operador y colaborador.

Artefactos:

- [`GREENHOUSE_HIRING_QUALITY_ASSURANCE_AUDIT_2026-07-30`](docs/audits/hiring/GREENHOUSE_HIRING_QUALITY_ASSURANCE_AUDIT_2026-07-30.md)
- [`GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1`](docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_DECISION_V1.md) — `Proposed`, no runtime autorizado todavía
- [`GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1`](docs/architecture/GREENHOUSE_EFEONCE_TALENT_ASSURANCE_ARCHITECTURE_V1.md) + [`EPIC-038`](docs/epics/to-do/EPIC-038-efeonce-talent-assurance-agentic-quality-system.md) — target agentic-by-design y programa de ejecución
- [`EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1`](docs/business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md) — economics y gate de viabilidad, sin cifras aprobadas
- [`efeonce-talent-assurance`](docs/documentation/hr/efeonce-talent-assurance.md)
- [`operar-efeonce-talent-assurance`](docs/manual-de-uso/hr/operar-efeonce-talent-assurance.md)

La propuesta conecta selección, verificación, onboarding, performance, continuidad y economics. Pendiente: checkpoint
humano de la decisión, creación de tasks con IDs formales y validación de thresholds/economics con Talent,
Operations, Commercial y Finance.

Restricción añadida: EPIC-038 es una capa de assurance sobre capacidades existentes. No autoriza crear ATS, HRIS,
skills registry, portfolio vault, performance system, cost ledger, identidad verificada paralela ni agent runtime
separado. Toda task futura debe justificar reuse/extend antes de proponer un objeto nuevo.

## 2026-07-30 — Fully Managed Creative Capacity global

Se incorporó al modelo que Efeonce absorbe equipo, computadores, infraestructura, licencias, contratación, costos
laborales, provisionales, reemplazos, continuidad y soporte; el cliente paga un fee mensual por una capacity
envelope definida. La modalidad se denomina `Fully Managed Creative Capacity`; “llave en mano” queda como explicación
comercial, no como unidad contractual.

El modelo aplica en todos los países donde Efeonce opera. La oferta es global, pero payroll, impuestos, moneda, FX,
privacidad, derechos laborales, proveedores, seguros, DPA, procurement y working capital deben parametrizarse por
jurisdicción. Estado: `Approved for validation`.

## 2026-07-30 — Embedded Creative Capacity

Se canonizó `Embedded Managed Pod` como configuración de Creative Velocity: un pod externalizado que trabaja
integrado al equipo y cultura del cliente, mientras Efeonce conserva staffing, gobierno, QA y accountability. No es
Staff Augmentation.

El operating model está en [`EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1`](docs/services/creative-services/EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1.md).
Incluye fit cultural bidireccional, Brand/Business Immersion Pack, rituales, RACI, pricing, métricas de fit/adoption,
riesgos y gates de validación.

## 2026-07-30 — Creative Velocity: simulación Banco BICE y caso SKY autorizado

Se creó [`EFEONCE_CREATIVE_VELOCITY_BUYING_SIMULATION_BANCO_BICE_V1`](docs/audits/commercial/EFEONCE_CREATIVE_VELOCITY_BUYING_SIMULATION_BANCO_BICE_V1.md), una simulación sintética de validación comercial para David Bachman, María Teresa Arraztoa, Rodrigo Espinoza y Pamela Fuenzaliza en Banco BICE. Incluye artefactos, demo modular, objeciones, respuestas, señales de compra/no compra y criterios de cierre.

El operador confirmó autorización para nombrar a SKY como caso de éxito. SKY queda usable como referencia de capability y experiencia modular; cada claim, métrica, asset, screenshot, nombre, URL y pricing conserva su propio gate de evidencia y alcance de uso.

## 2026-07-30 — Creative Velocity: benchmark profundizado y Modular Production

La investigación adicional confirma que Creative Velocity está alineado con el mercado en capacidad recurrente,
content supply chain, modular production, performance creative e IA; su diferenciación potencial está en la claridad
de compra, Creative Operations, memoria, rights/provenance, telemetría y soporte de producto para equipos in-house.

Se documentó el addendum [`EFEONCE_CREATIVE_VELOCITY_MODULAR_PRODUCTION_ADDENDUM_V1`](docs/services/creative-services/EFEONCE_CREATIVE_VELOCITY_MODULAR_PRODUCTION_ADDENDUM_V1.md).
SKY demuestra una capability modular de configuración de assets con Adobe Express, SharePoint y herramientas
complementarias. Esto queda clasificado como delivery probado; la productización independiente permanece en roadmap.

La escalera de validación es Diagnostic → Sprint → Managed Capacity/Flex → Dedicated Creative Pod → Performance
Creative Lane o Modular Production Lane → Creative Studio/Production System. Estado honesto: **Approved for
validation**. Falta documentar y autorizar el caso SKY, validar primer valor, capacity envelope, cost-to-serve,
rights/provenance, portabilidad, soporte y gates de producto antes de `Commercially approved`.

## 2026-07-30 — Creative Services: benchmark y arquitectura de oferta V2

Se documentó la investigación de mercado 2026 y se adoptó la recomendación de reorganizar Creative Services bajo
Creative Operations. Las fuentes primarias, confidence y límites están en
[`CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-30`](docs/audits/commercial/CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-30.md).

La decisión aceptada está en
[`EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_DECISION_V1`](docs/architecture/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_DECISION_V1.md)
y el contrato de oferta en
[`EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2`](docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md).
La arquitectura de presentación es híbrida: el catálogo plano permite reconocimiento rápido; las rutas `Creative
Velocity`, `Brand & Campaign Systems`, `Content Production System` y `AI Creative Operations` orientan la venta;
los paquetes y modalidades convierten la ruta en una compra scopeable. La escalera es diagnóstico/proyecto
exploratorio → sprint → Managed Creative Capacity → lane especializado → Studio/portfolio expansion.

Estado honesto: **documentación y arquitectura completas para validación; oferta aún no Commercially approved**.
Siguen pendientes cohortes pagadas, willingness-to-pay, loaded cost/capacidad/margen, rights/legal, proof formal de
SKY y gates de Globe/Studio Access. Próximo paso ejecutable: producir los briefs comerciales de Creative Velocity
Diagnostic, Capture Sprint y Campaign Sprint y someterlos a Finance, Legal/IP, Operations y Commercial.

El detalle operativo ahora vive en [`CREATIVE_SERVICES_OPERATING_MODEL_V1`](docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OPERATING_MODEL_V1.md): Product Services, paquetes, creación/captura de valor, ICP/JTBD, buying group, delivery/RACI, capacity, pricing/economics, rights, proof, renewal y gates.

## 2026-07-30 — TASK-1600: implementación y release gobernado regularizado

TASK-1600 ya migró Greenhouse al paquete AXIS `0.2.1` (sucesor compatible de la publicación manual histórica
`0.2.0`), invirtió el drift gate y dejó
los tests de contraste/semántica, typecheck, build, PDFs, capturas GVC light/dark y rollback rehearsal verdes.
El frame de rampas compara 0.00% desktop y 0.01% mobile; queda pendiente aprobación o re-baseline explícito
para la diferencia de altura del full-page histórico (12 px desktop, 2 px mobile). El commit Greenhouse es
`f4163965e`; Axis está publicado en `main` (`dba1922`). El tag `v0.2.1` existe y el run gobernado
`30525304584` terminó en `success` tras ejecutar build, typecheck, tests, contrato tag↔versión y publish
idempotente. `0.2.0` queda documentada como publicación manual legacy sin tag propio.

## 2026-07-30 — AXIS: migración de credenciales y release productivo cerrados

Estado honesto: **complete**. La migración Axis quedó operativa con el secreto
`projects/efeonce-group/secrets/axis-packages-read-token` activo. El secreto legacy de `efeonce-globe` fue
eliminado y el PAT legacy fue revocado después de verificar el release. El PAT temporal de migración sigue
activo como medida interina; la identidad de máquina continúa pendiente únicamente antes del rollout externo.

El release productivo `30502476429` terminó en `success` sobre
`41fa94846d0ca18a0f83529dc90cdc2da15a632d`. CI, deep verification, Playwright smoke, workers, HubSpot,
Vercel y health checks quedaron verdes. Los canaries del piloto usan `playwright-core` con
`channel: 'chrome'`; el rollback interno de `globe-studio-internal` y `globe-api-internal` fue ejercitado,
verificado y restaurado.

Fuente operativa: [`AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`](docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md)
y [`AXIS_CONTINUITY_MAP_2026-07-29.md`](docs/operations/AXIS_CONTINUITY_MAP_2026-07-29.md).

## 2026-07-29 — Social Media: modelo, diferenciación y Run & Gun consolidados

Se creó el modelo inicial de Social Media como servicio humano, recurrente y gestionado por un Managed Squad:

- [`Product Service Contract`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_PRODUCT_SERVICE_CONTRACT_V1.md)
- [`Business Model`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_BUSINESS_MODEL_V1.md)
- [`Pricing Integrity Pack`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_PRICING_INTEGRITY_PACK_V1.md)
- [`Market Research`](docs/audits/commercial/SOCIAL_MEDIA_SERVICE_MARKET_RESEARCH_2026-07-29.md)
- [`Subservices Catalog`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_SUBSERVICES_CATALOG_V1.md)
- [`Search + Social Visibility Composition`](docs/business-models/search-visibility-360/SEARCH_SOCIAL_VISIBILITY_COMPOSITION_V1.md)
- [`Social Media Operating Model`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_OPERATING_MODEL_V1.md)
- [`Social Media Customer Model`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md)
- [`Search + Social Measurement Contract`](docs/business-models/search-visibility-360/SEARCH_SOCIAL_MEASUREMENT_CONTRACT_V1.md)
- [`Pricing Validation Addendum`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_PRICING_VALIDATION_ADDENDUM_2026-07-29.md)
- [`Differentiation & Positioning`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_DIFFERENTIATION_POSITIONING_V1.md)

El servicio opera sin Globe. Globe queda como capacidad futura opcional y no forma parte de la promesa ni del pricing
base. Paid Social, Creator/UGC, crisis, 24/7 y Producción Especial son módulos separados. Estado honesto:
**`Approved for validation`**: la documentación, diferenciación y guardrails están consolidados; faltan validación
comercial, capacidad, cost-to-serve, pricing aprobado y pilotos. No es `Commercially approved` ni habilita venta self-serve.

La investigación recomienda como beachhead B2B experto con voceros accesibles, oferta compleja y necesidad de
autoridad/demanda. Siguiente paso: validar composición real del squad, SLA de community, cost-to-serve, margen,
pricing y dos pilotos de tres meses con Strategy, Commercial, Finance, Legal/IP y Operations.

Actualización de posicionamiento: Efeonce cuenta con **Efeonce Run & Gun Studio** y equipos profesionales para producción
rápida en terreno. Se documentó como ventaja de delivery componible con Social Media, con SOW y derechos propios
cuando implica jornadas, crew, movilidad, talentos o postproducción ampliada.

Se productizó la oferta candidata en [`Efeonce Run & Gun Production — Offer V1`](docs/services/creative-services/EFEONCE_RUN_AND_GUN_PRODUCTION_OFFER_V1.md), con cuatro paquetes, unidad de valor por jornada/sprint gobernado, scope, dependencias, quality gates, derechos, fallbacks y métricas de validación. **Efeonce Run & Gun Studio** nombra la capability/infraestructura; **Efeonce Run & Gun Production** nombra el servicio comercial. Pricing y capacidad exacta siguen pendientes de Finance/Operations.

La continuidad canónica y los índices ya enlazan el paquete completo: diferenciación y posicionamiento, Run & Gun,
operación, medición Search + Social, pricing validation y customer model. No se modificaron modelos ni skills en esta
actualización; sólo se sincronizaron índices y continuidad documental.

## Sesión 2026-07-29 — Release completo: develop promovido y producción verificada

Estado honesto: **complete**. PR #166 promovió todo `develop` a `main` mediante el merge
`0b4bdd6acb401ef0b108e27f1a8f1d80c469a0ed`; no hubo cherry-picks ni release parcial de AXIS. CI, CI Deep,
Playwright smoke, CLAUDE/context governance y Vercel pasaron para ese SHA. El orquestador oficial
`30473069894`, sin bypass ni break-glass, terminó `success` y dejó el manifest
`0b4bdd6acb40-2608542b-b1e5-4b3b-b24e-5036501dfef1` en `released`. El intento obsoleto `30465872005` quedó
cancelado.

Vercel Production está READY en `dpl_EkXUC1oCddYWvtWxB5sJVY7qXfkd`
(`greenhouse-7i34pkv5e-efeonce-7670142f.vercel.app`) y `greenhouse.efeoncepro.com/api/auth/health` responde
`200`. Cloud Run quedó Ready en `commercial-cost-worker-00411-q6j`, `ico-batch-worker-00234-58d` y
`hubspot-greenhouse-integration-00124-drd`, todos trazados al SHA de main. `ops-worker-00507-b4g` permanece
Ready en `49ea5741aec1`: el job oficial calculó diff vacío entre ese commit y el target para todas sus rutas runtime,
por lo que aplicó el change-gate canónico y omitió un redeploy label-only. El watchdog local sigue reportando ese
caso conocido como `worker_revision_drift`; no existe drift de código desplegable.

La causa raíz de los `401` no era un PAT vencido. El secreto es un PAT clásico válido: GitHub `/user` y el tarball
privado exacto respondieron `200`. El heredoc no quoted expandía `$$` al PID del shell antes de entregar el config a
Cloud Build, produciendo bearer tokens numéricos. Los deploy scripts ahora preservan el doble dólar para que Cloud
Build inyecte el secreto real. `ops-worker`, `commercial-cost-worker`, `ico-batch-worker` y el job staging-only
`artifact-worker` usan `secretEnv` → `.npmrc` efímero → BuildKit secret; `.npmrc` está excluido de los contextos y
los gates cubren los cuatro build units. Builds reales, imágenes sin token/runtime env y revisiones Cloud Run fueron
verificados.

La ubicación en `efeonce-globe` fue un acoplamiento legado deliberado y temporal; ya fue retirado. El secreto
activo vive en `efeonce-group`, el PAT legacy fue revocado y no se debe recrear el secreto en Globe por inercia.
El PAT temporal de migración permanece activo hasta la sustitución por una identidad de máquina antes del
rollout externo.
