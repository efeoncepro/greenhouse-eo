---
name: greenhouse-globe
description: >-
  Implementa, audita y opera Efeonce Globe, plataforma hermana gobernada por Greenhouse. Úsala para Producer
  UI/BFF, API Contract Spine, trusted context, provider adapters, Model Lab y readiness, generación y retrieval,
  GCS privado, Asset Governance/C2PA/rights, workers Cloud Run, Cloud SQL, IaC keyless y rollout comercial.
---

# Efeonce Globe — Ingeniero de plataforma hermana

Eres ingeniero senior de **Efeonce Globe** (nombre de producto; *Creative Studio* es su descriptor funcional). Tu trabajo es implementar sobre el repo hermano `efeonce-globe` respetando su contrato de arquitectura, sin re-decidir la forma que ya está construida. La pieza más repetida será **extender el API Contract Spine que TASK-1481 dejó montado**: las tasks `TASK-1457…1480` (~23) agregan capabilities encima de él.

## 🔴 Encuadre del producto — leer ANTES que cualquier detalle técnico

**Efeonce Globe es un PRODUCTO COMERCIAL de la agencia Efeonce. NO es un lab interno, un piloto, un experimento ni una prueba de concepto.** Declaración canónica: **ADR-010** (`docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md` §Context) — *"Efeonce Globe is now a **commercial product**, not an internal lab"* — reafirmada en ADR-004 (*"Efeonce Globe is, and will remain, a commercial product"*) y ADR-013.

Lo que sí es acotado es el **estadio de rollout**: hoy el runtime corre `internal_smoke`, desplegado internal-only, con clientes externos gated por `TASK-1480`. **Estadio de rollout ≠ naturaleza del producto, y colapsarlos es el error recurrente de esta plataforma.** El estadio dice hasta dónde llegó el despliegue; no dice qué es el producto ni cuál es su techo.

Consecuencias operativas, no retóricas:

- Al escribir doc, tasks, ADRs o **copy visible**, describí el estado con precisión (*"desplegado internal-only"*, *"runtime en `internal_smoke`"*, *"gated por TASK-1480"*) y **NUNCA** con encuadre de piloto/lab/experimento/no-productivo. El copy visible no dice `piloto`, `internal` ni `foundation` (TASK-1523/1524).
- **NUNCA** dimensiones infraestructura, UX, seguridad ni calidad "porque es interno". Se dimensiona para el producto comercial que es; si hay brecha, se declara como **deuda con dueño** (`TASK-1521` runtime comercial, `TASK-1480` readiness comercial), no como diseño correcto.
- El modelo de negocio es real y está escrito: `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md` (cinco líneas de ingreso, tres modalidades de delivery, tres modos operativos) + `..._CREDIT_MODEL_V1.md`.

Los contratos de esta skill están contrastados con código y runtime real. El estado mutable —revisiones, digests,
flags, rutas promovidas, canarios y bloqueos— vive en
`docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`; nunca se infiere desde un número histórico de esta
skill.

> **LEER PRIMERO antes de asumir que un modelo/proveedor "no está" o "hay que integrarlo":**
> `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md` — el **ledger canónico de la flota de modelos**
> (qué modelo/proveedor está integrado, en qué **carril** — Model Lab vs producción gobernada —, validado cuándo y
> con qué evidencia, y qué falta para llevarlo al Producer). Los proveedores del Lab (Vertex imagen/Veo/Omni, Fal
> Seedream/Seedance, ElevenLabs, etc.) están integrados y validados en vivo desde 2026-07-19/20 — **no re-integrar**;
> lo que suele faltar es el **driver gobernado + promoción ADR-009** por ruta. Actualiza ese ledger al integrar,
> validar o promover cualquier modelo.
>
> **Desde `TASK-1554` (COMPLETE) el ledger ya no es la única autoridad:** el **SoT LIVE** de disponibilidad de
> modelos es el reader **`globe.producer.fleet.list`** (contrato `packages/contracts/src/producer-fleet.ts`,
> proyección `packages/domain/src/producer-fleet.ts`); el ledger es el **SoT humano**. **Si divergen, manda el
> reader** — y la divergencia es señal de que el ledger quedó desactualizado, no al revés.

## Producer UI + media gobernada — contrato operativo

- El flujo humano es `browser autenticado → BFF same-origin → API IAM-private`. Persona, workspace, surface,
  correlación e idempotencia se derivan o preservan server-side; el browser no porta credenciales de workload.
- La sesión/CSRF puede rotar por login en otra pestaña. El cliente refresca sesión con single-flight compartido y
  reintenta **como máximo una vez**, conservando body, correlation e idempotency. Un timeout de gasto primero se
  reconcilia por reader; nunca se re-ejecuta a ciegas.
- Feed/library se hidrata por identidad exacta `(experimentId, sha256)` y por
  `attempts[].outputs`; sólo un output exacto `retained: true` puede renderizarse. El viewer cancela resultados
  tardíos con un epoch por operación para que seleccionar B nunca sea sobrescrito por la respuesta de A.
- Los bytes viven en GCS privado, content-addressed (`sha256:<digest>`) y tenant-blind. El objeto no concede
  autoridad: propiedad, workspace, estado y elegibilidad salen del dominio/Postgres. No hay URL pública ni nombre
  de bucket/objeto en el contrato cliente.
- Retrieval usa descriptor gobernado + grant corto en `x-globe-retrieval-grant`, fetch same-origin y Blob URL;
  query sólo existe como compatibilidad. Se revalida propiedad e integridad antes de servir.
- Asset Governance procesa `inspection → malware → C2PA → rights` en un Job keyless, durable y fenced. En
  `c2patool` 0.26.60, un MP4/MP3 válido sin manifest devuelve nonzero `No claim found`: se normaliza como
  `unverified/c2pa_manifest_absent`, no como outage ni `unsupported`. Sólo `Trusted` habilita badge C2PA.
- La protección de datos enterprise es una dimensión separada de C2PA/rights: provider/model/endpoint/plan exactos,
  no-training/no-improvement, retención, zero-retention, acceso humano, región, subprocesadores, aislamiento y
  eliminación se verifican por ruta. Canon: `docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md`.
- Antes de crear otra revisión, el worker reconcilia proyecciones terminales no aplicadas y recupera autoridad de
  rights desde evidencia durable; requeue/replay son revisionados e idempotentes, nunca SQL manual.
- **Recuperación después de timeout o fallo:** preserva `idempotencyKey` y `correlationId`; consulta primero el
  reader de estado y la evidencia del attempt. Si el servidor completó, continúa desde ese estado. Si quedó
  terminal sin finalizar, usa el command gobernado de reconciliación/requeue con la misma identidad lógica. Nunca
  repitas `execute`, reserves créditos otra vez ni alteres filas a mano para “destrabar” una corrida.
- **Diagnóstico seguro:** conserva códigos y razones curadas server-side (`errorName`, control y `reasonShape`
  cuando corresponda), pero nunca imprime mensajes upstream, stacks, cuerpos, tokens, cookies, URLs firmadas ni
  secretos. Verifica cada salto por su reader, audit y manifest; una respuesta sanitizada sin señal operable no
  basta para diagnosticar.
- **SVG servido por Fal:** Fal puede declarar `image/svg+xml` en el resultado y entregar el objeto CDN como
  `application/octet-stream`. Acepta ese MIME genérico **sólo** cuando la salida esperada por la ruta es SVG,
  valida los bytes como SVG antes del ingest y rechaza cualquier otra combinación. Sirve el SVG retenido con CSP
  `sandbox`; no generalices esta excepción a otros tipos ni confíes sólo en extensión, URL o header.
- El cierre proporcional exige `pnpm check && pnpm build`, test nuevo registrado en el script del package,
  imagen/digest/policy verificados y canario UI de Image/Video/Audio/vector con feed, viewer/playback, MIME/hash,
  governance y `tofu plan` sin drift.
- Gaps de escala vigentes: derivados de preview (thumbnail/poster/transcode/waveform), Range/streaming real,
  política explícita de visibilidad mientras governance está pendiente y reconciliación/GC de objetos huérfanos.
  Se diseñan como arquitectura versionada; no se resuelven cargando originales completos ni con excepciones UI.

### 🔴 Trampas de verificación del payload cliente — medidas, no teóricas

Los siete defectos de la auditoría inicial pasaron con **build verde, cuatro gates de diseño verdes y canary de browser verde** (la lista de abajo ya creció con lo medido después, mismo patrón).
El patrón: los gates comprueban que *el código dice lo correcto*, no que *el runtime hace lo correcto*.
Detalle y evidencia: [auditoría 2026-07-29](../../../docs/audits/globe/GLOBE_PRODUCER_VERIFICATION_BLIND_SPOTS_2026-07-29.md).

**El caso propio y fechado (2026-07-29):** la regresión la introdujimos nosotros y apareció **MIRANDO, no
testeando** — `pnpm build`, ESLint, **129 tests** y **tres canarios** en verde, con un renglón cortado a media
letra en pantalla. Mirar el frame renderizado no es la cortesía del cierre: para esta clase de defecto es el
único instrumento que existe.

- **`assets.ts` es la autoridad de lo que producción sirve.** Un archivo en `public/` que no esté listado
  ahí **no existe para el runtime**, por más que el canary lo sirva — el harness tiene su PROPIO allowlist.
  Ocho miniaturas dieron 404 en producción mientras se veían perfectas en local. **No hay test que lo guarde.**
- **El canary cachea el bundle al arrancar** (`loadClientBundle()`). Tras cualquier build, comparar el hash
  en disco (`ls dist/client/*.js`) contra el servido (`curl .../producer | grep index-`) ANTES de reportar
  que algo está listo. «Lo verifiqué hace un rato» no es garantía de «es lo que estás viendo».
- **Un namespace del theme vaciado y no repoblado** hace que la utilidad compile y la propiedad computa su
  valor inicial. Ya hay gate (`tailwind-theme.test.ts`); la lista de vaciados está en el archivo generado y
  **es la autoridad — no suponerla**.
- **Un harness que no puede ejercer la funcionalidad no puede protegerla.** Si un aserto pasa sobre una
  superficie que el fixture no sabe construir, el aserto no vale: primero se enseña al fixture.
- **Nombrar los guards por su razón, no por su caso — y la razón es el DATO, no la lista de casos.** `isAudio`
  dejó fuera a video; `hasPoster` con `!== 'audio'` volvió a fallar con video, y `&& !== 'video'` habría
  fallado con un GLB. Lo que cierra la familia entera es **`posterFor(item, thumbnails)`**, que decide por los
  **BYTES** (`output.mimeType`) en vez de por una lista negra de modalidades — forward-compatible con las que
  traiga `TASK-1569`. **El contraejemplo importa igual:** `isAudio` **sí** se nombra por modalidad en el feed y
  está bien, porque la onda de audio es **cómo se ve el audio**, no un póster de reemplazo. No lo "generalices".
- **Un test dedicado puede no cubrir lo que su nombre promete.** El gate tenía un aserto de pesos sintetizados,
  verde, y trece sitios pedían igual un corte de Geist inexistente: colapsaba las tres caras cargadas en un
  `Set` de pesos, o sea era **ciego a la familia** (`--weight-display: 700` pasaba porque *Poppins* lo tiene, y
  Tailwind lo exponía después como `font-bold` aplicable a cualquier elemento). Antes de confiar en un aserto
  por su nombre, lee **qué aparea**.
- **Hay defectos que ningún gate PUEDE ver, y a veces el remedio es un reset, no un gate.** El proyecto no
  emite el preflight de Tailwind, así que la hoja del navegador aplicaba `b, strong { font-weight: bolder }`:
  un `<strong>` en un contenedor a 600 computaba **900** — faux bold **sin que ninguna clase lo dijera**. El
  gate escanea `className`, no elementos HTML: le era **estructuralmente invisible**, porque el peso entraba
  por el **nombre del elemento**. Apareció **tres veces el mismo día** en sitios distintos. **Cerrado el
  2026-07-29 (`403d346`)** declarando `b, strong { font-weight: var(--weight-semibold) }` en `@layer base`,
  sin adoptar preflight: cuando el defecto lo inyecta el navegador, una regla de base que lo vuelva imposible
  hace innecesario el gate. **La categoría sigue viva:** otro elemento HTML con default propio del UA reabre
  el agujero con los gates verdes.
- **Varios síntomas juntos dentro de un contenedor acusan al CONTENEDOR, no a los contenidos.** El panel de
  créditos parecía tres bugs —donut desbordado, encabezado clippeado, celdas superpuestas— y era **uno**:
  `max-w-full` sobre un `absolute`, que resuelve porcentajes contra su bloque contenedor, y ahí es el
  `<details>` — o sea **el ancho del disparador**. Con la pastilla en 157 px, los 352 px del panel quedaban en
  ~150. Arreglarlo destapó un segundo (bajo ~510 px de viewport el panel arrancaba en `x = -120`), y el mismo
  `max-w-full` roto estaba en el menú de cuenta: **un bug de contenedor rara vez vive en un solo contenedor**.
- **Dos campos del contrato que coinciden pueden ser dos EJES distintos.** `Listo` y `Completada` no eran dos
  palabras: el contrato trae `coarseProgress` y `state` por separado y declara `terminal` tanto para
  `retained-asset` como para `terminal-run{completed}` — coincidían por casualidad. `stateCompleted` era el otro
  eje filtrándose; quedó huérfana y se borró. Un segundo eje se gana la línea sólo cuando **aporta lo que el
  primero esconde** (acá: que la corrida **no** entregó).
- **Un número que se muestra al lado de sus propios operandos no se redondea.** El porcentaje del donut usaba
  `Math.round` y mostraba `100 %` con la celda vecina diciendo `Gastado 166`: es **`Math.floor`**. Y la cifra
  sale de una primitive (`src/format/credits.ts`, `creditReadout`): `Intl.NumberFormat('es-CL')` anclado al
  locale **del producto** —no al del navegador, que leería `500,444` como cuatro órdenes de magnitud menos—,
  exacta mientras quepa y abreviada desde 1.000.000, con el umbral **medido** contra la celda más angosta. Su
  test afirma un **presupuesto de caracteres** (barre 0→1e12, falla sobre 7): un test de formato se rompe con
  cada ajuste cosmético y no protege el slot; el presupuesto sí.
- **El pipeline de build sólo se ejercita al desplegar.** `--mount=type=secret` es POR-RUN: `pnpm deploy
  --prod` re-resuelve dependencias y necesita su propio `.npmrc`. Publicar e instalar en local no prueba nada.
- **Ningún aserto compara la proporción de un control contra sus hermanos.** Un stepper midió 768 px donde
  sus pares miden 68, con todo verde.

#### Seis defectos de superficie medidos el 2026-08-01, y ninguno lo veía un gate

El operador señaló cuatro cosas mirando la pantalla; las cuatro tenían causa distinta de la aparente. Sirven
como catálogo porque **cada una es una CLASE, no un caso**.

- 🔴 **Sin preflight, el `padding: 1px 6px` que el navegador le da a todo `<button>` sigue vivo y ninguna
  clase lo declara.** Rompe **sólo** cuando la caja es tan chica que el glifo no entra: con 26 px de botón y
  borde de 1 px quedan **12 px** de contenido para un glifo de **15**, y el control queda 1,5 px corrido. De
  **219 botones** de la superficie era el ÚNICO afectado — los de 30 px absorben el mismo padding. **El
  umbral es 29 px para un glifo de 15**; cualquier control de ícono nuevo por debajo hereda el defecto. Misma
  familia que `b, strong { font-weight: bolder }`: el defecto lo inyecta el UA y los gates escanean
  `className`, así que le son **estructuralmente invisibles**.
- 🔴 **`margin-inline-start: auto` + `flex-wrap` deja un hueco muerto al envolver.** El empuje a la derecha es
  correcto mientras el elemento quepa en la línea; cuando baja a la suya **se lleva el empuje** y queda pegado
  a la derecha (medido: 239 px de hueco bajo el título). Se resuelve con `justify-content: space-between` en
  el contenedor, que separa a los extremos cuando comparten línea y alinea al inicio cuando cada uno queda
  solo — sin una media query que adivine el punto de quiebre.
- 🔴 **…pero `space-between` reparte HIJOS.** Aplicarlo a un contenedor con **cuatro** hijos sueltos separó
  también el contador de su título (196 px → 463 px, con 267 px entre un dato y la palabra que lo explica).
  **Arreglar la alineación creó una regresión de agrupamiento.** Lo correcto es envolver lo que es un grupo
  para que el contenedor tenga los dos hijos que el reparto supone.
- 🔴 **Un velo por alfa NO es un hueco.** El centro del anillo de créditos usaba `bg-surface-soft`
  (`rgba(255,255,255,.03)`): funciona sobre el canvas oscuro y sobre un `conic-gradient` saturado **deja pasar
  el color entero**. Con el glifo en `text-action` —el MISMO naranja— el resultado era un disco liso. **El
  popover del mismo componente ya lo había resuelto con `surface-solid`, y el trigger no heredó su token**:
  antes de inventar una solución, mirar si la pieza hermana ya la tiene.
- 🔴 **Una forma puede estar bien elegida para el dato equivocado.** Ese anillo además era correcto: con
  500.836 disponibles de 501.110, el arco de «no disponible» mide **0,197° de 360** — 0,05 px de trazo. Para
  mover UN grado hay que gastar 1.392 créditos. **Un donut responde «¿qué fracción queda?» y con un stock
  grande esa respuesta es 99,9 % durante meses.** Se cambió el eje: mide el CICLO (consumo del período), que
  arranca en cero. Y cuando el período no tiene tope, **no se sustituye el denominador por el consumo
  observado** —«gastado / gastado» daría 100 % y diría «agotado» cuando no se sabe nada—: aro neutro.
- ⚠️ **Un ícono no es decoración cuando nombra qué se mide.** `sparkles` es con lo que TODO producto anuncia
  «esto tiene IA»: no dice nada del dato. Se eligió `flame` —el quemador que mantiene el globo en el aire—
  por metáfora del producto y no de la categoría, sin reusar el isotipo, que ya significa Globe y «generando».
  Descartados con su motivo: `gauge` (círculo con aguja dentro de un anillo = ruido), `coins` (dinero literal,
  y Globe no revende tokens), `battery` (lenguaje de dispositivo). **Los ocho candidatos se renderizaron a
  tamaño real en el runtime antes de decidir** — a 16 px varias hipótesis mueren solas.

#### El feed: el backend paginaba y el cliente usaba medio contrato (2026-08-01)

Segunda vez en el mismo día que aparece el patrón «la capability existe y la UI no la consume» (la primera
fue el compare de las cards). `globe.producer.feed.live.*` pagina por **cursor keyset** (`updatedAt` +
`stableKey`) con `nextCursor` desde TASK-1525; `nextFeedRead` sólo resolvía el eje del FUTURO (marca →
`changes`) y **el `nextCursor` para retroceder se ignoraba**. El feed crecía sin techo por arriba y el
histórico era inalcanzable. **No faltaba paginación: estaba a medio cablear.**

- 🔴 **Una página hacia atrás NO puede mover el `watermark`.** El backend lo calcula desde el **último** item
  de la página, y en dirección `older` el último es el **MÁS VIEJO**: adoptarlo hace retroceder la marca y el
  próximo ciclo re-trae todo lo ya visto, con la pantalla viéndose perfecta. Los dos ejes viven en el mismo
  objeto y avanzan en direcciones **opuestas**, así que el modo (`sync` | `changes` | `older`) viaja
  explícito y nunca se infiere. Simétrico: un delta de novedades no toca el cursor del pasado. E invalidar la
  marca **conserva** el cursor del pasado — son fallos de ejes distintos.
- **NUNCA scroll infinito en el Producer:** vuelve inalcanzable el pie de la aplicación y, con piezas
  generándose y reordenándose en vivo, mueve el contenido bajo el cursor. **Ni páginas numeradas:** con items
  entrando por arriba, la página 2 cambia de contenido sola — offset es incorrecto por construcción, y por eso
  el backend eligió cursor.

#### Trampas operativas de la sesión (cuestan tiempo, no código)

- 🔴 **`gh pr merge --delete-branch` te deja en `main` LOCAL**, que en este repo suele estar viejo y
  divergente. Se siguió editando sobre esa base sin notarlo, y los cambios quedaron sobre archivos que no
  tenían los fixes previos. Después de cualquier merge: **`git rev-parse --abbrev-ref HEAD`** antes de seguir
  editando. La salida es `git diff > patch` → rama nueva desde `origin/main` → `git apply --3way`.
- 🔴 **El CSP del payload bloquea el atributo `style` de HTML parseado, pero NO el CSSOM.** Un
  `innerHTML` con `style="…"` se ignora en silencio (los estilos no aplican y nada falla); `el.style.setProperty(…)`
  sí funciona. Vale para cualquier verificación visual inyectada desde el browser.
- ⚠️ **Los estilos inline no sobreviven al feed vivo.** Con `GLOBE_PRODUCER_LIVE_FEED_ENABLED=true` React
  re-renderiza solo cada 4 s y borra lo inyectado; para mirar un fix antes de desplegarlo hay que inyectar una
  **hoja `<style>`**, que sí sobrevive.
- 🔴 **Merge a `main` NO despliega.** `deploy-internal.yml` es `workflow_dispatch` manual y toma el servicio
  como input. Un operador que mira la pantalla después de un merge ve la revisión ANTERIOR — y eso es
  indistinguible de «el cambio no funcionó». Confirmar siempre con
  `gcloud run services describe … --format='value(status.latestReadyRevisionName)'` y comparar el commit de la
  imagen contra `origin/main`.

## Boundary: Globe es plataforma hermana, no un módulo de Greenhouse

Esta es la regla que gobierna todo lo demás. Interiorízala antes de tocar código.

- **Globe es una plataforma hermana gobernada por Greenhouse, no un módulo de Greenhouse.** No corre dentro de `greenhouse-eo`, no comparte su runtime ni su build.
- **Reparto de responsabilidad:**
- **Greenhouse = único control plane operativo.** Registra EPICs, `TASK-###`, dependencias, lifecycle, hooks, lint, QA, cierre documental y handoff — incluso cuando la implementación vive en `efeonce-globe`.
  - **Globe = código, runtime, infraestructura, datos, ejecución creativa y evidencia técnica.** Posee creative assets, rights/provenance, compositions, runs, provider adapters, quality evidence, approvals y creative credits.

## Composición con Wave Experience LaunchOps

Globe es un product service de Efeonce que combina plataforma, especialistas creativos y capacidad de delivery.
Puede participar como capability composable dentro de `Experience LaunchOps`, el product service de Wave. La
arquitectura canónica está en
`docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GLOBE_CREATIVE_PRODUCTION_INTEGRATION_V1.md`.

La frontera es estricta:

- Wave posee `LaunchContract`, `ExperienceSpec`, Brand/Search/Measurement Contracts, ensamblaje en CMS/DXP,
  governance, release, rollback y evidencia de lanzamiento.
- Globe posee dirección y producción creativa, variantes, composiciones, rights/provenance y evidencia de calidad.
- Globe entrega `CreativeAssetPack`, `AssetManifest` y `AssemblyManifest`; un archivo sin destino, metadata,
  derechos y evidencia no es un output productivo completo.
- Wave puede consumir assets del cliente u otros proveedores; Globe no es dependencia obligatoria de Wave.
- Los niveles deben distinguirse: `asset-ready` (Globe), `experience-ready` (Globe + mapping) y `launch-ready`
  (Wave + integración, gates y release).
- Globe puede entregarse como `Studio Access`/platform-enabled, Creative Production, `Managed Squad` o `Staff
  Augmentation`. Managed Squad implica dirección y accountability de Efeonce/Globe; Staff Augmentation implica
  dirección cotidiana del cliente y no hereda automáticamente el SLA de Managed Squad.

### Creative Production Contract

Cuando Globe participe en un lanzamiento, Wave deriva un `CreativeProductionContract` con objetivo, audiencia,
mercado, canal, Brand Contract, slots/componentes, requisitos Search/Measurement, formatos, restricciones legales,
ventana y criterios de aceptación. Globe responde con outputs versionados, manifests, variantes, rights status,
provenance, quality evidence, excepciones y dependencias.

Workers creativos pueden proponer y producir; especialistas humanos conservan dirección, craft y decisión sobre
claims sensibles, derechos, compliance, marca y publicación. No conviertas esta composición en una integración ad
hoc desde la UI ni pases URLs públicas, credenciales o secretos entre plataformas.
- **Greenhouse es dueño de:** identidad de ecosistema, desired access state, workspace/client bindings y governance cross-plataforma. Globe recibe esa identidad como *broker*, no la reemplaza.
- **NUNCA** compartas base de datos, sesión/cookie, bucket, secreto de provider, service-account key ni rol admin implícito entre Globe y Greenhouse.
- **El registry de tasks es SOLO de Greenhouse.** Globe **no** crea un segundo namespace, registry, lifecycle ni harness de trabajo. Su execution plan referencia las `TASK-###` de Greenhouse; no las duplica.
- **UI, MCP, CLI, scripts y E2E usan los mismos commands, readers y policies.** MCP es un adapter, no un backend alterno.

## Repos y primeras lecturas

- La **skill** (este archivo, META: instrucciones para agentes) vive en `greenhouse-eo`: `.codex/skills/greenhouse-globe/SKILL.md` (Codex) y `.claude/skills/greenhouse-globe/SKILL.md` (Claude).
- El **código, infra y evidencia técnica** de Globe viven en el repo hermano `efeonce-globe` (por convención local `/Users/jreye/Documents/efeonce-globe`, GitHub `efeoncepro/efeonce-globe`).
- **La documentación gobernante de Globe vive en `greenhouse-eo`** (control plane documental, EPIC-028 / TASK-1492), bajo la convención `creative-studio/`:
  - Arquitectura + ADR: `docs/architecture/creative-studio/**` (índice: `docs/architecture/creative-studio/README.md`).
  - Runbooks / operaciones: `docs/operations/creative-studio/**`.
  - Doc funcional: `docs/documentation/creative-studio/**`. Manuales: `docs/manual-de-uso/creative-studio/**`. Modelo de negocio: `docs/business-models/creative-studio/**`.

Antes de implementar, lee lo que la task necesite, en este orden:

1. La `TASK-###` canónica en `docs/tasks/**` (Greenhouse es el control plane; ejecuta su hook / Plan Mode).
2. La **doc gobernante de Globe, en Greenhouse**: empieza por `docs/architecture/creative-studio/README.md` (índice + mapa doc↔repo) y de ahí la arquitectura vigente (`EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`, `PLATFORM_FOUNDATION_V1.md`, `GREENHOUSE_CONNECTIVITY_V1.md` ADR-001, `EFEONCE_GLOBE_MODEL_LAB_V1.md`, `EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`, `EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md`); runbooks/plan de ejecución en `docs/operations/creative-studio/**`.
3. En `efeonce-globe` (solo runtime): `README.md`/`AGENTS.md` (reducidos a puntero, remiten aquí); el **código** del spine — `packages/contracts/src/index.ts`, `packages/domain/src/index.ts`, `apps/studio-web/src/dispatch.ts`, `apps/studio-web/src/app.ts`, `packages/sdk/src/index.ts`, `packages/provider-contract/src/index.ts`; la **infra** en `infra/terraform/`; la **evidencia técnica** en `docs/operations/` (bootstrap, QA audits, brand-shell).
4. En `greenhouse-eo`: el programa `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` y sus ADR/arquitectura `EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_{DECISION,ARCHITECTURE}_V1.md`.

Si docs, task y runtime discrepan, manda la arquitectura vigente + el runtime verificado; actualiza la doc **en Greenhouse** (nunca en Globe) antes de implementar si el drift cambia un contrato.

> **Regla dura (control plane documental, EPIC-028 / TASK-1492):** **NUNCA** crees ni mantengas documentación gobernante — arquitectura, ADR, runbooks, handoff, changelog, doc funcional — dentro de `efeonce-globe/docs/**` ni en su raíz. Toda esa doc vive en `greenhouse-eo` bajo `creative-studio/`. En `efeonce-globe` solo queda **código, infra (Terraform) y evidencia técnica** (bootstrap/QA/brand-shell), más `README.md`/`AGENTS.md` reducidos a puntero. El **cierre documental** de cualquier `TASK-###` de Globe se hace en Greenhouse, no en Globe.

## Monorepo y build system

`efeonce-globe` es un **monorepo TypeScript modular con Node 24 nativo** (Node `>=24 <25`, pnpm `10.32.1`). No usa framework de app ni bundler pesado; el runtime es TS nativo sobre Node.

Estructura real:

- `packages/contracts` — schemas versionados + vocabulario canónico (source of truth de tipos del spine).
- `packages/domain` — `CapabilityRegistry`, trusted context, state machines, dispatch transport-neutral.
- `packages/sdk` — cliente server-oriented del API privada (+ subpath `@efeonce-globe/sdk/google-auth`, server-only).
- `packages/provider-contract` — interfaz `CreativeProviderAdapter` y `CreativeCapability` semánticas.
- `packages/database`, `packages/media-qc` — persistencia y QC de media.
- `apps/studio-web` — shell + BFF/API HTTP + transport MCP (el único servidor HTTP; SDK/MCP/CLI son clientes de él).
- `apps/studio-client` — **el payload de browser** (ADR-014 / `TASK-1556`): Vite 8.1.5 + React 19.2.8 + React Router 8.3.0, SSR apagado, compilado a assets estáticos que sirve `studio-web`. Acá viven el **SSOT de tokens** (`src/tokens/tokens.ts`), la **capa de copy** (`src/copy/`), las **primitives** (`src/primitives/index.tsx`), las **superficies** (`src/surfaces/**`) y los **gates de UI** (`src/gates/`). Toda superficie humana nueva nace acá. **Estado del programa: ver §ADR-014 más abajo — el payload existe pero todavía NO sirve ninguna superficie en el runtime vivo.**
- `apps/asset-governance`, `apps/media-derivatives` — Cloud Run Jobs de governance y de derivados de media.
- `apps/creative-runner` — Cloud Run Job que ejecuta el trabajo de media (llama providers).

### AXIS: foundation compartida y consumo del payload

AXIS es la foundation portable gobernada desde Greenhouse, no un runtime compartido ni un motivo para importar MUI/Vuexy en Globe. El paquete privado y el Lab viven en `../axis-design-system`; Globe consume contratos/registry mediante un adapter local Tailwind y conserva sus tokens en `tokens.ts`. No cruces implementaciones entre repositorios ni conviertas el adapter en un segundo design system.

- El SSOT local de diseño del payload sigue siendo `apps/studio-client/src/tokens/tokens.ts`. Los valores de UI deben resolverse como tokens semánticos del theme Tailwind v4; no uses valores literales de diseño en `className` (`text-[#hex]`, `p-[13px]` o equivalentes).
- Para paquetes privados usa versiones fijadas y el registry scoped `@efeoncepro:registry=https://npm.pkg.github.com`. Nunca hagas públicos los paquetes ni guardes tokens en código, lockfiles generados, artefactos o logs.
- El acceso de Cloud Build usa el secreto `projects/efeonce-globe/secrets/axis-packages-read-token` y el service account de build autorizado a ese secreto. Materializa `.npmrc` solo durante la instalación en el workspace efímero; nunca pases el token como Docker build argument ni lo copies a la imagen.
- `TASK-1591` tiene el piloto de adapters opt-in verificado en Globe con paquetes `0.1.4`: `AxisStatus` y `AxisProgress`, evidencia desktop/390 px/teclado/reduced-motion/accesibilidad y rollback por versión. No confundas este piloto con promoción de producto.

**Toolchain (verificado en `tsconfig.base.json`):** `module`/`moduleResolution` NodeNext, `strict`, más `verbatimModuleSyntax`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables`. Escribe código que satisfaga estos flags (p.ej. con `exactOptionalPropertyTypes` no pasas `undefined` a una prop opcional — usá spread condicional `...(x !== undefined ? { x } : {})`, patrón usado en todo el spine).

**Tests: `node --test`, NO Vitest.** Los tests son `*.test.ts` ejecutados directo por Node (p.ej. `node --test src/index.test.ts`). No introduzcas Vitest, Jest ni otro runner. **Trampa de la suite (lección de método, cuesta un verde falso):** los scripts `test` de cada package **ENUMERAN los archivos a mano** — no hay glob ni descubrimiento. Un `*.test.ts` nuevo que no se agrega a ese script **NUNCA corre**, y la suite queda **verde por no haberlo mirado**, que es el peor de los verdes. Al agregar un test, agrégalo también al script `test` del package y confirma que aparece en la salida del run.

**La suite termina sola desde el 2026-07-29 (`403d346`) — y el workaround del puerto quedó retirado.** El canary `axis-pilot-canary` hacía `server.kill('SIGTERM')` sobre el wrapper de `pnpm`, pero `pnpm exec vite` **no es un proceso, son tres** (el wrapper, su `node` y el `vite` nieto): el nieto sobrevivía reteniendo los pipes, el event loop de Node **nunca drenaba** y `pnpm test` **no retornaba**, dejando además un huérfano en el puerto **4326** por corrida (llegaron a acumularse doce, uno de tres días). Hoy el canary usa `detached: true` para hacer al hijo líder de su grupo, `process.kill(-pid, …)` para señalar al **grupo entero** y **espera** la muerte con escalón a `SIGKILL` — sin ese `await` el proceso puede terminar antes de que el nieto suelte el puerto, que es el mismo bug con otro disfraz; en Windows se conserva `server.kill()`. Medido: `pnpm --filter @efeonce-globe/studio-client test` → **exit 0 en 29 s**, 129/129, tres canarios verdes, cero huérfanos en el 4326. **No sigas corriendo los canarios por separado ni liberando el puerto a mano:** un workaround vigente para un bug muerto hace pagar el costo dos veces. La lección de método sí queda: un runner que hay que matar a mano entrena a leer «se colgó» como normal — que es exactamente cómo un cuelgue real pasa desapercibido.

**Convención de extensiones de import (crítica, el compilador la exige):**

- `.js` en imports **source↔source dentro de los packages** (NodeNext resuelve al `dist/*.js` compilado; los packages exponen `exports: "./dist/index.js"`).
- `.ts` en `apps/studio-web` (su tsconfig activa `allowImportingTsExtensions` + `rewriteRelativeImportExtensions`; p.ej. `import { readPublicAsset } from './assets.ts'`).
- `.ts` en **TODOS los tests** (`node --test` corre TS directo).

**Gate de cierre (correr en `efeonce-globe`):**

```bash
cd ../efeonce-globe
pnpm check   # = pnpm typecheck && pnpm test  (tsc NodeNext strict + node --test en todos los packages/apps)
pnpm build   # = pnpm -r build
```

Al **agregar una dependencia de workspace** (`workspace:*`), corré `pnpm install` para relinkear. Globe **no consume el build de `greenhouse-eo`**; son toolchains independientes — no corras aquí los comandos de Greenhouse (`pnpm local:check`, etc.) esperando validar Globe.

## El API Contract Spine (TASK-1481) — el corazón

TASK-1481 dejó montado un **spine machine-readable** que las capabilities extienden. Entenderlo bien es la mitad del trabajo.

### Full API Parity por nacimiento

Cada capability de negocio **nace** con: schemas versionados (`packages/contracts`), un command/reader transport-neutral (`packages/domain`, vía `CapabilityRegistry`), trusted context server-derived, path privado HTTP + SDK, coverage matrix machine-readable y conformance. No hay "primero la UI, después el contrato".

**Las 8 surfaces canónicas** (`GLOBE_SURFACES`): `ui`, `http`, `sdk`, `mcp`, `cli`, `worker`, `sister-platform`, `e2e`. Cada capability declara un estado de coverage por **cada** surface, en un `Record<GlobeSurface, SurfaceCoverageState>` — omitir una surface es **error de compilación**, no un gap silencioso.

**Los 3 (y solo 3) estados de coverage** (`SurfaceCoverageState`): `'available'`, `'policy-blocked'`, `'not-applicable'`. **`'missing'` es deliberadamente irrepresentable en el tipo.** Una surface que aún no se implementa es `policy-blocked` (declarada, gobernada, apagada), **nunca** "falta el contrato". El dispatch falla cerrado sobre `policy-blocked` con el error canónico `policy_blocked`.

### Trusted context vs untrusted payload

El caller manda `CommandRequestEnvelopeV1` / `ReaderRequestEnvelopeV1`. Estos envelopes **NO llevan actor, capability ni workspace de autoridad** — solo `command`/`reader`, `correlationId`, `idempotencyKey` (commands) y un `workspaceSelection?` **no confiable**.

La autoridad se deriva server-side:

- `AuthenticatedPrincipalV1` lo produce el middleware de autenticación (sesión Greenhouse en modo `web`, ID token de Cloud Run en modo `api`). Sus `capabilities` (namespaced) y `workspaceBindings` son la superficie de autoridad; las capabilities salen del *broker grant* vía `parseGlobeCapabilities` (que **descarta** strings desconocidas — un broker no puede inventar capabilities), nunca hardcodeadas.
- `deriveTrustedContext({ principal, workspaceSelection, correlationId })` valida el `workspaceSelection` contra `workspaceBindings`: si no está bindeado → `TrustedContextError` (deny + audit), no un guess. Sin selección y con exactamente un binding, usa ese; ambigüedad o ausencia se **niegan**.
- `TrustedCommandContextV1` es **branded** (`__globeTrusted`) y server-only: **solo** `deriveTrustedContext` lo produce. Un request body no puede estructuralmente hacerse pasar por trusted context — el spoofing de actor/workspace/capabilities no es representable en la firma de dispatch.

### Auth en `api` mode — defense in depth (rollout fase 2, verificado en vivo 2026-07-20)

En `api` mode el perímetro (Cloud Run IAM) es la **primera** puerta, no la única: un servicio Cloud Run puede correr con `invokerIamDisabled: True`, que **salta el invoker check del perímetro por completo** — y entregaría el service principal (que lleva `globe.lab.experiment.run`, capacidad de **gasto real**) al internet abierto, a un toggle de distancia. Por eso la app **también verifica el ID token del caller en-app** (`resolveDispatchPrincipal` → `verifyWorkloadCaller`), como segunda capa:

- **Verificación LOCAL**, no round-trip. `IdTokenVerifier` es un **port inyectable** (prod = `createGoogleIdTokenVerifier`: `google-auth-library` `OAuth2Client.verifyIdToken` contra las claves públicas de Google **cacheadas** con su TTL, un client por proceso). **NUNCA** un `tokeninfo` por request: sería un SPOF externo síncrono en el hot path (descartado por red-team `arch-architect`).
- **Dos gates fail-closed:** `apiExpectedAudience` (env `GLOBE_API_EXPECTED_AUDIENCE`, multi-valor por los dos formatos de URL `run.app`, EXPLÍCITO — nunca derivado de `publicBaseUrl`, que en api mode es placeholder) **y** `apiCallerServiceAccounts` (env `GLOBE_API_CALLER_SERVICE_ACCOUNTS`, allowlist de emails de SA). Cualquiera de los dos vacío ⇒ **NADIE entra** (`access_denied` 403). Se exige además `email_verified`.
- **El ID token viaja en `Authorization`, NUNCA `X-Serverless-Authorization`.** Cloud Run **CONSUME** `X-Serverless-Authorization` (su propio invoker check; no lo reenvía al contenedor) y **REENVÍA** `Authorization`; la re-verificación en-app sólo puede leer lo reenviado. El SDK manda el `cloud-run-id-token` en `Authorization` (`applyAuthMaterial`). Regla verificada en vivo: con X-Serverless el perímetro pasa pero la app rechaza al caller legítimo con **401** (X-Serverless queda solo como fallback defensivo para el caso `invokerIamDisabled` on, donde Cloud Run reenvía todo).

**Dónde vive el Model Lab.** La ejecución sigue en **`api` mode** y el browser entra sólo por el BFF same-origin.
Desde TASK-1519, `LAB_COVERAGE.ui` está `available` para grants humanos acotados; MCP continúa separado. El browser
nunca recibe la capability de workload ni llama la API IAM-private directamente.

**`invokerIamDisabled` — matiz + gobierno IaC.** Para un servicio **web** con SSO (`globe-studio-internal`) tenerlo **on** es correcto: un browser no presenta ID token, la app autentica por su sesión-cookie. Para un servicio **`api` mode** debe estar **OFF** (perímetro activo) y la verificación en-app es la segunda capa. El flag **ya está gobernado por IaC**: **TASK-1508 adoptó los dos servicios Cloud Run a Terraform** (import brownfield). Antes los creaba sólo el workflow de deploy y nada prevenía drift.

### Las capas del spine

```
packages/contracts   → schemas + vocabulario (tipos, versión, error codes, surfaces)
packages/domain      → CapabilityRegistry + deriveTrustedContext + dispatch* + state machines
apps/studio-web      → transporte HTTP privado (/v1/commands, /v1/readers, /v1/capabilities)
                       autentica → deriva principal → dispatch por surface 'http'
packages/sdk         → cliente tipado del API (SDK/MCP/CLI son clientes de la surface http)
packages/provider-contract + apps/creative-runner → el borde de providers
```

El **transporte HTTP es una sola surface del servidor**: SDK, MCP y CLI son clientes de él, así que el dispatch por HTTP siempre usa la surface `'http'`; el coverage por-surface (`sdk`/`mcp`/…) se declara en el manifest, no se re-deriva de quién llama.

## Cómo agregar una capability (el flujo que repiten TASK-1457…1480)

Este es el camino exacto. Seguilo; no inventes uno paralelo.

1. **Schemas en `packages/contracts`.** Definí los tipos versionados de payload/outcome (command) o query/data (reader). Reusá `CommandResultV1` / `ReaderResultV1` como sobre. Extendé el vocabulario (`GLOBE_CAPABILITIES`, error codes, etc.) acá si hace falta — este package es el source of truth de tipos.
2. **Registrá el command/reader en `packages/domain`** vía `registry.registerCommand({ descriptor, requiredCapability, handler })` o `registry.registerReader(...)`. El patrón canónico es cómo `createGlobeSpineRegistry()` puebla el registry: un `CapabilityDescriptorV1` (con `capability`, `kind`, `summary`, `coverage`), la `requiredCapability` (una `GlobeCapability`), y el `handler(context, payload) => outcome`. El handler recibe el `TrustedCommandContextV1` ya derivado y autorizado.
3. **Volteá el coverage** del descriptor de `policy-blocked` → `available` en las surfaces que realmente shippeás (y `not-applicable` donde de verdad no aplica). Nunca dejes una surface sin declarar. Una capability reservada pero no implementada se queda `policy-blocked` en sus surfaces ejecutables (así nace el fixture `globe.run.prepare` en el spine).
4. **El handler llama a `packages/provider-contract` → `apps/creative-runner`** para cualquier trabajo de provider. **NUNCA** instancies un SDK de provider directo desde el handler, la UI, MCP, CLI, scripts ni tests.
5. **Método SDK tipado** en `packages/sdk` (o reusá `dispatchCommand` / `dispatchReader` del `GlobeClient`). Los commands exigen `idempotencyKey`.
6. **Granteá la `requiredCapability`** para que aparezca en `AuthenticatedPrincipalV1.capabilities` del broker grant. La autorización final la hace `#authorize` del registry: chequea coverage de la surface → `trustedContextHasCapability` → falla cerrado si el handler falta bajo un estado `available`.
7. **El harness manifest-driven de conformance la ejercita sola** — no escribas un backdoor de test que llame al provider o al handler saltándose el spine.

## El ejemplo trabajado — Model Lab (TASK-1457): la primera capability real sobre el spine

El flujo de arriba es abstracto. El **Model Lab** es su primera instancia real y el patrón a copiar: una capability con estado externo y un provider detrás. Vive en `packages/domain/src/model-lab.ts` (+ `spend-fence.ts`), con el runner en `apps/creative-runner/src/index.ts` y el wiring en `apps/studio-web/src/app.ts`. Léelo como la plantilla de "cómo se ve una capability terminada".

**Qué es.** Una sola capability de autoridad — `globe.lab.experiment.run`
(`GLOBE_LAB_EXPERIMENT_CAPABILITY`) — gobierna sus commands/readers. Coverage actual: `ui`, `http`, `sdk`,
`cli`, `worker` y `e2e` disponibles; MCP conserva su gate y `sister-platform` es `not-applicable`.

**Ports + inyección de dependencias (el patrón a repetir).** El dominio no conoce impls concretas: define **ports** y recibe todo por `ModelLabDependencies` — `ExperimentStorePort` (persistencia workspace-scoped), `SpendFencePort` (fence de gasto), `LabRunnerPort` (el seam del provider) y `LabKillSwitchPort` (`() => boolean`), más `now`/`newId`. El transporte inyecta las impls reales (`app.ts`: `InMemoryExperimentStore`, `LabSpendFence`, `LabRunner(new FakeReferenceAdapter)`, `killSwitch: () => labEnabled`); los tests inyectan dobles. Cuando una capability nueva toque estado externo o un provider, **replica esta forma**: define ports en el dominio, inyecta impls desde el transporte/runner, prueba con dobles — nunca acoples el handler a una DB, un bucket o un SDK concretos.

**El provider seam.** El **único** lugar donde se invoca un provider es el `LabRunner` (`apps/creative-runner`), detrás del command `execute`. Hoy corre con `FakeReferenceAdapter`: determinístico, hermético (cero I/O de red), gasto cero — el "output" es un `sha256` estable del request. El provider real se enchufa **reemplazando el adapter** (`CreativeProviderAdapter`), sin tocar el dominio ni el command. **NUNCA** un SDK de provider directo desde el handler/UI/MCP/CLI/scripts/tests.

**Los guardrails, como patrones reusables.** Cuatro defensas nacen acá y son plantilla para toda capability cara:

- **Hard spend fence** (`LabSpendFence` / `SpendFencePort`): aborta *antes* de gastar. Cap doble — por-run (`hardCapCredits`) y por-workspace-día (UTC) — con `reserve` → `settle`/`release` idempotentes. Es un fence de **seguridad**, **NO** el credit ledger comercial (eso es TASK-1468, durable y append-only). Es in-memory y resetea al reiniciar: aceptable para un Lab interno acotado, reemplazado por el ledger durable antes de cualquier exposición externa.
- **Private-ingest**: un input cruza el API solo como **content hash + postura de derechos declarada**, nunca como bytes crudos. `validateAuthorizedInputs` exige `inputId`, `sha256`, `mediaType` conocido (`image|video|audio|text`) y `rights` declarados (`internal-owned|licensed|test-fixture`), con tope de 16 inputs; cualquier entrada malformada rechaza el request.
- **Kill switch fail-closed**: `GLOBE_LAB_ENABLED` (env, default **OFF**). Con el lab apagado, cada command/reader hace `assertLabEnabled` y lanza `DispatchError('surface_policy_blocked')` → `policy_blocked`. Apagado = negado, no "roto".
- **State machine**: `canTransitionExperiment` / `EXPERIMENT_TRANSITIONS` gobierna `prepared → estimated → reserved → running → candidate_ready|failed` (+ `cancelled`); `transition()` lanza ante un salto ilegal. `candidate_ready` es un **candidato técnico, jamás una aprobación**. Un id cross-workspace o desconocido es `capability_not_found` (nunca revelar existencia fuera del scope); un `execute` sobre un experimento ya ejecutado es replay idempotente que devuelve la vista actual.

**Error de dominio → API code.** `InvalidExperimentRequestError` **no** es un código de `DispatchError`: el transporte (`handlerErrorToApiCode` en `dispatch.ts`) lo mapea al canónico `invalid_request`. Ese es el patrón para errores de validación de payload propios de una capability — una clase de error de dominio + su mapeo explícito en el transporte, nunca prosa cruda ni un throw sin traducir.

## El segundo ejemplo — Evaluation Harness (TASK-1458): una capability que CONSUME otra

Si el Model Lab muestra "capability con estado + provider", el **Evaluation Harness** (SPEC-003, `EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`) muestra el patrón **"capability sobre capability"**: `globe.lab.evaluation.run` no reimplementa la ejecución de experimentos — la **reusa**. Vive en `packages/domain/src/evaluation.ts`; el wiring en `app.ts` le pasa **las mismas** `ModelLabDependencies` que al Lab más un `EvaluationReportStorePort`.

- **Reuso vía helper programático, no vía dispatch.** El Lab exporta `runModelLabExperiment({ context, request, deps })` (reusa `prepareExperiment` + `executeExperiment`). El comando `evaluate` lo llama para correr un golden brief por el camino real del Lab (con todos sus guardrails: kill switch, spend fence, private-ingest, provider seam) y obtener un `ExperimentAttemptManifestV1` fresco que puntúa. Cuando una capability nueva deba orquestar otra, **exportá un helper de dominio y reusalo** — nunca re-dispatchés por el registry desde dentro de un handler ni dupliques la lógica.
- **Dato vs motor (el test del segundo consumidor, ya aplicado).** Los **fixtures** (golden briefs still/motion/audio, con `license`/`consent`/`permittedUse` declarados) y las **rúbricas** son **dato versionado**; el motor de checks no tiene un `switch` por fixture. Dos contratos de fidelidad distintos (image `flexible-style` y audio `audio-foley`) fluyen por el **mismo** motor — eso es la evidencia de reutilización, no una promesa.
- **Separar lo objetivo de lo humano; el verdict nunca auto-aprueba craft.** `objectiveChecks` (automáticos, deterministas sobre el manifest) van separados de `humanCriteria` (declarados, **sin** `pass`/`score` — nunca auto-respondidos). El verdict es sólo `objective_fail` u `objective_pass_pending_human` (pendiente de humano). El harness **NUNCA** declara un modelo globalmente mejor; cada report es **versionado**, **workspace-scoped** y **declara sus limitaciones** (proveedor fake, muestra única).
- **Coverage + capability idénticos al patrón.** `globe.lab.evaluation.run` en `GLOBE_CAPABILITIES`; `EVAL_COVERAGE` con `ui`/`mcp` `policy-blocked`, `http`/`sdk`/`cli`/`worker`/`e2e` `available`, `sister-platform` `not-applicable`; grant en el service principal. Reusa `InvalidExperimentRequestError → invalid_request` para validación de payload y `capability_not_found → not_found` para fixture/rúbrica/report desconocido o cross-workspace.

### Evaluación durable con inputs reales (TASK-1614, regla vigente desde 2026-07-31)

Una evaluación durable no puede confundir el dato hermético del fixture con el activo que el provider debe
consumir. Los handles `sha256:*` con `rights=test-fixture` sólo sirven cuando el resolver conoce sus bytes; en
runtime real se parte de un output retenido y autorizado, se convierte mediante
`globe.producer.asset.copyAsReference` y se pasa el handle completo como `authorizedInputs` a
`globe.lab.evaluation.evaluate`. El experimento y el reporte persisten esos inputs efectivos, conservan cantidad,
modalidad y orden, y verifican `input_lineage_intact`. Ante un timeout, consulta experimento, run y reporte antes de
considerar otro intento.

Antes del gasto, el compiler debe resolver una política durable `purpose=evaluation` para la tupla exacta
`workspace + route + provider + model + version + sourceKind + time`; una policy de producción no la sustituye y
una policy `appliesTo=generated` no autoriza por sí sola un derivado. El policy id/version/digest/purpose forma
parte del snapshot y del fingerprint. El `ProducerReferenceHandleV1` se resuelve además al `assetId` canónico,
verificando workspace, hash, medio, retención, Asset Governance y derechos del output fuente; ese padre queda en
`generatedAssetParents`. Los outputs de evaluación pueden verse internamente, pero no descargarse como attachment
ni entrar a un share board.

Si el provider produjo bytes pero falló la finalización, no reintentes el webhook ni edites el run inmutable:
recupera provider attempt, output retenido, asset/rights proyectados y evaluation report por sus readers. Repara
lineage/rights mediante el carril canónico y crea un run nuevo sólo después del rollout. El workflow keyless expone
`copy-reference:caller`, `evaluate:caller`, `run-get:caller` y `run-cancel:caller`; son commands de la API Contract
Spine, no SQL ni llamadas directas al provider.

## El tercer ejemplo trabajado — Provider adapters reales (TASK-1486/1487/1488): el provider seam con motores reales

Los dos ejemplos anteriores corren sobre `FakeReferenceAdapter` (hermético, gasto cero). TASK-1486/1487/1488 enchufan **motores reales** sobre el mismo `CreativeProviderAdapter`, **sin tocar el dominio ni el command** — exactamente lo que promete el provider seam. Son el patrón a copiar cuando agregues un provider nuevo. Todos viven en `apps/creative-runner/src/*`.

**`VertexCreativeAdapter` (TASK-1486) — Google-native, keyless.** En `vertex-adapter.ts`. Implementa el contrato completo (`providerId` / `supports` / `estimate` / `submit` / `poll`) y hace el **routing capability→modelo Vertex DENTRO del adapter** (por-capacidad, un modelo fijo hoy — ver "Flota de modelos" para el seam route→model de TASK-1553): `image-generate → gemini-3-pro-image` (Nano Banana Pro, **actualizado** desde `gemini-2.5-flash-image` el 2026-07-24); `video-generate → gemini-omni-flash-preview` en la región **`global`** (us-east4 y us-central1 devuelven `NOT_FOUND` para estos modelos — usa `global`). Es **keyless**: autentica por **ADC/WIF** con un `getAccessToken` inyectado (la runtime SA tiene `aiplatform.user`), **cero API key**. Reparto de los métodos: `estimate` **no toca red**; `submit` es la **única llamada facturable**; `poll` devuelve **hashes** de output, **nunca una URL pública**. Verificado en vivo.

**`FalCreativeAdapter` (TASK-1487) — motores no-Google, key propia de Globe.** En `fal-adapter.ts`. Habla con la **queue API** de Fal (`submit` / `status` / `result` / `download`). **Gotcha crítico:** usa el `status_url` / `response_url` que Fal devuelve en la respuesta del `submit`; **nunca reconstruyas esas URLs desde el slug** (la ruta de queue no es derivable del slug). La key es **propia de Globe** — `GLOBE_FAL_API_KEY`, inyectada — **nunca** `greenhouse-fal-api-key` (el secreto de Greenhouse no cruza el boundary; es la regla de no compartir secretos de provider entre plataformas).

**`CompositeProviderAdapter` (TASK-1487) — combina Vertex + Fal por política.** En `composite-adapter.ts`. Compone los dos adapters (y registra también `openai`, `vertex-video`, `vertex-omni`): las capabilities **Fal-only** se resuelven por `supports()`; el **overlap** image/video se resuelve por **política explícita** (`DEFAULT_COMPOSITE_POLICY`) — hoy **image-generate/image-edit → Fal Seedream** y `video-generate` de la ruta reference → `vertex-omni` (el comentario histórico "default Vertex" quedó desactualizado; verificar el código). El `poll` **vuelve al hijo que emitió el run** — no re-rutea; respeta qué adapter hizo el `submit`. Este es el patrón para "un adapter que agrega varios providers": routing por `supports()` + política declarada para el overlap + poll fiel al emisor.

**Las 10 capabilities (TASK-1488) y la regla dura del slug ByteDance.** TASK-1488 lleva `CREATIVE_CAPABILITIES` a 10 (suma `image-upscale`, `video-upscale`, `model-3d-generate`). **REGLA DURA verificada en vivo:** los modelos **ByteDance en Fal usan el slug SIN el prefijo `fal-ai/`** (p.ej. `bytedance/seedream/v5/pro/text-to-image`); el resto — Recraft, Topaz, ElevenLabs, Hyper3D, y `fal-ai/seed-audio` — **sí** lleva `fal-ai/`. Para **verificar si un slug existe** antes de cablearlo: `POST {}` (body vacío) a `https://fal.run/<slug>` → **404 = inexistente**, **422 = existe** (falló la validación del payload, no el ruteo). El provider activo del Lab se elige con **`GLOBE_LAB_PROVIDER`** = `fake | vertex | fal | composite` (default **`fake`**): el default sigue siendo hermético / gasto cero, y prender un motor real es una decisión explícita de env.

**Eval real → recommendation matrix (TASK-1459).** Con adapters reales enchufados, el **Evaluation Harness** deja de correr solo contra el fake: el mismo **golden brief** se corre por el harness contra **múltiples motores** y produce una **recommendation matrix** (costo / latencia / ajuste al objetivo). El **craft sigue yendo a juicio humano** — el harness **nunca auto-gana** un modelo (coherente con el verdict `objective_pass_pending_human`). **Detalle de contrato que mordió en vivo:** el `actualRoute` que reporta un adapter debe ser el **route del contrato de fidelidad** (`== proposedRoute` cuando no hubo fallback), **NO el slug del modelo** — el slug va en el campo `model`. Confundirlos fue un bug real corregido en el adapter Fal.

**Track B — resolución hash→bytes + frontera de video Vertex (verificado en vivo 2026-07-19).** El command público sigue llevando **solo hashes**; el `LabRunner` resuelve los `authorizedInputs` a bytes en el único punto de invocación (`FixtureInputResolver` para test-fixtures; `GcsInputResolver` keyless content-addressed con verificación de integridad para inputs reales; `RightsRoutedInputResolver`) y los adjunta al request (`resolvedInputs`, server-internal, nunca cruza la API). Con eso los golden briefs con input (ancla motion, ref de contacto audio) **corren** en vez de `inputs_unavailable`; Vertex los inlinea (`inlineData`), Fal los sube a Fal storage → URL. El primer canary en vivo dio: **Fal Seedance 2.0** = motor motion, **Fal Seed Audio** = motor audio (ambos `objective_pass_pending_human`). **REGLA DURA:** el adapter Vertex de `generateContent` **NO puede servir video** — `gemini-omni-flash-preview` solo es invocable por la **Interactions API** y Veo usa `predictLongRunning`; da **400** por `generateContent`. Se removió `video-*` de `VERTEX_ROUTING` (`supports(video)=false`, misma frontera que audio); el video rutea a Fal. Un adapter Vertex video dedicado (Veo/Omni-Interactions) es follow-up; la capa completa de provenance/rights/retención es TASK-1467.

## Veo + Omni (video) — los motores de video Vertex reales (verificado en vivo 2026-07-20)

El follow-up que el Track B anunció ("un adapter Vertex video dedicado") está **implementado y verificado en vivo**: son **dos adapters nuevos** en `apps/creative-runner/src/*`, cada uno con su **propia frontera de invocación** — ninguno pasa por `generateContent` (ese adapter es image-only y da **400** con video). El ancla de video del Lab (`GLOBE_LAB_VIDEO_ANCHOR`) elige cuál corre.

**`VertexVideoAdapter` (Veo) — keyless, long-running.** En `vertex-video-adapter.ts`. Model `veo-3.0-fast-generate-001`, región `us-central1`. Como el video **no** es servible por `generateContent`, el adapter usa el par **`:predictLongRunning` → poll `:fetchPredictOperation`** hasta que la operación completa, y extrae el video del resultado (base64 inline o `gcsUri`). Es **keyless** igual que el adapter de imagen (ADC/WIF, runtime SA con `aiplatform.user`). **Frontera i2v vs t2v (regla dura):** en image-to-video el **primer frame se siembra** desde la referencia resuelta por Track B (el input hash→bytes); en **text-to-video NO se puede inlinear una imagen** — Veo da **400** si un request t2v trae imagen. Verificado en vivo: golden brief motion → `objective_pass_pending_human`, **32 créditos**.

**`VertexOmniAdapter` (Omni) — Interactions API, dos superficies.** En `vertex-omni-adapter.ts`. Model `gemini-omni-flash-preview` (el modelo reasoning-native state-of-the-art), invocado por la **Interactions API** — **NO** `generateContent`, **NO** `predictLongRunning`. Tiene **dos superficies con capacidades distintas**:

- **(1) Keyless Vertex — solo GENERATE.** `aiplatform.googleapis.com/v1beta1/projects/{p}/locations/{global|us-central1}/interactions`, **ADC Bearer, cero key**. Sirve `text_to_video` e `image_to_video`. **NO** sirve el edit stateful: `previous_interaction_id` → **400 "do not support"**; `GET /interactions/{id}` → **500**.
- **(2) Gemini Developer API — full, incl. STATEFUL EDIT.** `generativelanguage.googleapis.com/v1beta/interactions?key=`, con **API key** desde Secret Manager `globe-gemini-api-key` (esta superficie **exige** key: OAuth se rechaza con `ACCESS_TOKEN_SCOPE_INSUFFICIENT`). Es la **única** superficie que hace **edit stateful** (`previous_interaction_id` + `store:true`). Ojo: `generativelanguage` **no es Vertex** — por eso no contradice la regla "Vertex es keyless"; son dos superficies físicas distintas.

Request canónico: `{ model, input, response_format:{ type:video, aspect_ratio }, generation_config:{ video_config:{ task } }, background:false, store, stream:false }`; la respuesta llega en `steps[].model_output.content[].video.{data|uri}`. Es **unary síncrono** (~35-60s), no long-running. Specs del modelo: 3-10s / 720p / 24fps / 16:9|9:16 / con audio / **USD 0.10 por segundo**. Verificado en vivo: generate keyless por el seam → `objective_pass_pending_human` **40 créditos**; edit stateful (crear store → editar) → **200 completed** con video.

**Ancla de video del Composite.** `GLOBE_LAB_VIDEO_ANCHOR` = `fal` (default, Seedance) | `vertex-video` (Veo) | `vertex-omni` (Omni). Es **fidelity-aware**: un contrato `preserve-set` va siempre a **Seedance**; `anchor`/`flexible` van al motor ancla elegido. La matriz motion por el seam: **Omni 40cr, Veo 32cr, Seedance 20cr**, los tres `objective_pass_pending_human` (el harness nunca auto-gana un motor).

**Claridad de billing/superficie (regla dura de registrar).** El video de Omni **no tiene tier gratis** (USD 0.10/s, solo pago). La **Gemini Developer API** (`generativelanguage`) usa **Prepay/Postpay + API key** y es **hoy la única superficie de edit**. **"GEAP"** es solo el rebrand de **Vertex AI** (keyless pay-as-you-go, hoy solo generate). Y **"Gemini Enterprise"** (por-asiento, ~USD 25/seat) es el **producto sucesor de Agentspace, SIN relación** con la Interactions video API — **NUNCA** comprarlo para esto. Secrets: `globe-gemini-api-key` (edit) + `globe-fal-api-key` (Fal), inyectados por Secret Manager, `secretAccessor` de la runtime SA, trackeados en Terraform.

## Lab edit-command — stateful edit por el seam (verificado en vivo 2026-07-20, commit `a765d55`)

El seam del Model Lab ahora enhebra **edit stateful de punta a punta**: un `execute` puede encadenar sobre el output de un `execute` anterior. Es **aditivo y server-internal** — no cambia el contrato público.

**Los campos (aditivos, server-internal).** En `packages/contracts`: `PrepareExperimentPayloadV1.previousInteractionId` (opcional) + `ExperimentAttemptManifestV1.providerRunRef` (el run id del provider desde el que un edit posterior encadena). En `packages/provider-contract`: `ProviderAttemptResult.providerRunRef` + `CreativeProviderRequestV1.previousInteractionId`. El `toProviderRequest` del runner pasa `previousInteractionId` al request; el manifest expone `providerRunRef`. Un edit es simplemente un `prepare` con `previousInteractionId` seteado → `execute`.

**`VertexOmniAdapter` es DUAL-TRANSPORT.** Recibe dos transports inyectados: `transport` (Vertex keyless — generate) y `editTransport` (Gemini-key — edit). Un edit (con `previousInteractionId` presente) rutea a `editTransport`; si no hay `editTransport` inyectado, **falla cerrado con `edit_unavailable`** — nunca cae al keyless, que no sabe editar.

**Gotcha cross-surface (regla dura, encontrada y arreglada en vivo).** Un interaction id emitido por **Vertex keyless NO es editable en la superficie Gemini** (`generativelanguage`): son **namespaces de id distintos**. Por eso un generate que quiera ser **editable** (`store:true`) también corre en la **superficie Gemini** (no en Vertex keyless), o la cadena se rompe. El adapter lo resuelve con `useEditSurface = (isEdit || store) && editTransport`. `studio-web` cablea `store:true` + el `editTransport` Gemini desde `globe-gemini-api-key`.

**Evidencia en vivo (por el seam completo).** `prepare(video-generate, store)` → `execute` → `candidate_ready` con `providerRunRef=v1_…` → `prepare(previousInteractionId)` → `execute` → EDIT `candidate_ready`, con video nuevo + id encadenable. Real.

## Edit / refine cross-model — TASK-1490 (live-verified 2026-07-20)

El edit dejó de ser específico de Omni. Hay **una sola semántica** y el mecanismo se resuelve adentro.

**El contrato.** `PrepareExperimentPayloadV1.editFrom = { experimentId }` es lo ÚNICO que un caller dice: no nombra paradigma, sesión ni modelo. El caller **sí** declara `capability`/`referenceRoute`/`hardCapCredits` del edit — eso es exactamente lo que habilita el **edit cross-model** (refinar un candidato de Seedream con Nano Banana); heredarlos del padre lo impediría. `previousInteractionId` quedó **deprecado** y es **mutuamente excluyente** con `editFrom` (mandar ambos = `invalid_request`, jamás precedencia silenciosa). **No** hay command `edit` dedicado: un edit ES un experimento (misma autoridad, mismo fence, misma state machine, mismo manifest); un command aparte sería duplicar el guardrail sin agregar semántica de autoridad.

**Los dos paradigmas y quién elige.** *Stateful* = el proveedor guarda la sesión y se encadena por id (Omni `previous_interaction_id`). *Reference-based* = el output del padre se re-inyecta como base; es el que hace posible el cross-model porque no depende de ninguna sesión. El **dominio** resuelve el padre y deriva `editSource` server-side; el **runner** elige usando el único dato que sólo él tiene en ese momento: **qué proveedor va a ejecutar**. Un handle de sesión sólo significa algo para quien lo emitió, así que se hilvana **únicamente** cuando el proveedor ejecutante es el del padre; cualquier otro caso cae a reference-based y queda registrado en `editMode` — **nunca en silencio**.

**La pieza que faltaba (y que la task daba por hecha): retención de outputs.** Antes de TASK-1490 los adapters hasheaban los bytes de salida y los **descartaban**, así que el hash de un candidato no resolvía a nada: reference-based fallaba en runtime, no en compilación. `OutputIngestPort` + `GcsOutputIngest` (espejo de `InputResolverPort`, en el mismo y único punto de invocación) los persisten content-addressed bajo el mismo `sha256` que publica el manifest; `outputsRetained` lo declara. Un fallo de storage NUNCA destruye un candidato ya pagado: degrada a `outputsRetained: false`.

**Encadenabilidad la certifica el ADAPTER.** Un id puede existir y no ser editable en ningún lado (el keyless de Vertex emite ids que después rechaza). Sólo el adapter conoce sus superficies → reporta `providerRunChainable` junto a `providerRunSurface`; el dominio lee un booleano y nunca aprende vocabulario de proveedor.

**Multi-referencia.** Cada ruta declara su tope de referencias y **falla cerrado** al excederlo. Omni acepta sets **combinados imagen+vídeo** en un `reference_to_video` ("este sujeto, con esta cámara") — verificado en vivo en **ambas** superficies. El set siempre va **edit base primero** (el orden es condicionamiento).

**`GLOBE_LAB_OMNI_EDITABLE`** (default OFF) reemplazó el `store:true` hardcodeado. Un generate editable DEBE correr en la superficie Gemini, así que prenderlo saca **todo** generate de Omni del keyless hacia facturación por API key. Default OFF es seguro sólo **porque** los outputs se retienen.

**Reglas duras del edit:**
- **NUNCA** metas la base de un edit en `authorizedInputs` — ese campo es declaración del caller y su significado no puede cambiar entre generate y edit (rompe `input_lineage_intact`, el tope `MAX_AUTHORIZED_INPUTS` y la desambiguación de referencias del adapter). Viaja como `editReference`.
- **NUNCA** blanquees un derivado como `internal-owned`: es `derived-internal` (postura que un caller no puede declarar) + los derechos heredados del padre, para que un input `licensed` siga restringiendo a sus descendientes.
- **NUNCA** hilvanes un handle de sesión hacia un proveedor que no lo emitió, ni confíes en un `providerRunRef` sin `providerRunChainable`.
- **NUNCA** trunques un set de referencias para que entre: truncar devuelve trabajo que parece correcto y no lo es.
- **SIEMPRE** rechazá un edit imposible en `prepare` (padre desconocido/cross-workspace → `not_found` sin revelar existencia; sin candidato; **sin ninguna afordancia**; media no editable; profundidad excedida), antes de que el fence reserve.

**Lección de método (vale más que el código).** Dos defectos sobrevivieron una suite unitaria en verde y sólo aparecieron gastando plata real: `providerRunChainable` se calculaba en el adapter y el runner no lo copiaba (todo edit stateful degradaba en silencio), y todo fallo del runner colapsaba a `runner_error` (el fallo más común de un edit era indistinguible de cualquier otro). Cuando un campo de evidencia nace, **verificá que haga el viaje completo hasta el manifest** — un test de adapter que lo afirma no prueba que llegue.

**Primer deploy keyless de la app.** `studio-web` quedó desplegado en Cloud Run `globe-studio-internal` rev `00007-jrr` (Ready), **privado**; `GLOBE_LAB_PROVIDER` sigue en `fake` en el servicio desplegado (los engines están desplegados pero **OFF** — prenderlos es un flip de flag gobernado). Deploy vía `.github/workflows/deploy-internal.yml` (keyless WIF → Cloud Build → Cloud Run).

## El cuarto ejemplo — Producer Route Catalog (TASK-1500): dato gobernado + naming client-facing

Los tres ejemplos anteriores son capabilities con provider detrás. El **Producer Route Catalog** muestra el patrón **"dato versionado + readers gobernados"** (sin provider): el catálogo de rutas del Creative Producer que `TASK-1501/1502/1505` consumen. Vive en `packages/{contracts,domain}/src/producer-catalog.ts`.

**Qué es.** `PRODUCER_ROUTE_CATALOG` es **dato versionado** (`PRODUCER_CATALOG_VERSION`; agregar una ruta = editar el array, el motor del reader no tiene `switch` por ruta), expuesto por dos readers gobernados — `globe.producer.catalog.list` / `globe.producer.catalog.get` — bajo la capability `globe.producer.catalog.read`. Cada ruta declara: `capability` semántica, `constraints` de output-shape **discriminados por modalidad** (image/video/audio — una rama que no calza es error de compilación bajo `exactOptionalPropertyTypes`), `specialty`, `audioCapable`, `inputModes` y su naming (ver abajo). Los helpers in-process `resolveRouteConstraints` / `getProducerRoute` / `listProducerRoutes` son el **SSOT** que `TASK-1501` (validación de shape fail-closed pre-spend) y `TASK-1502` (`costo = f(ruta, shape)`) reusan **sin re-dispatch por el registry** — mismo patrón "helper de dominio, no re-dispatch" del Evaluation Harness. Coverage: `ui`/`mcp` `policy-blocked` hasta el gate de `TASK-1505`; internas `available`.

**Invariante de naming (client-facing por defecto) — REGLA DURA.** Cada ruta lleva dos identidades de display y sólo una es pública:

- `model` = `{ name, version? }` (p.ej. "Seedance" · "2.0") es **CLIENT-FACING / PÚBLICO**. Mostrar el modelo real es **ancla de posicionamiento** de la suite (el ICP enterprise sabe qué modelo da mejor calidad) — es deliberado, no una fuga. `version` es etiqueta libre opcional ("2.0", "5 Pro", "Multilingual v2", o ausente).
- `house` (taxonomía interna de Efeonce, p.ej. "Studio Motion I") es **OPERATOR-ONLY**, gateado por la capability dedicada `globe.producer.route.reveal_house`. `resolveRouteAudience` (`operator`|`client`) fail-closes a `client`; la proyección client **omite** `house`.
- El **slug de wire del proveedor** (`bytedance/seedance-2.0/text-to-video`), el **costo vendor** y el **margen** **NUNCA** salen — por ninguna surface. Un drift guard aborta la carga del catálogo si un slug se filtra en `routeId`/`model`/`house`.

**La distinción que muerde (colisión de término `model`).** El **nombre** del modelo (`"Seedance"`) es público y **≠** el **slug** de wire (`"bytedance/seedance-2.0/text-to-video"`, prohibido). Ojo: el campo `model` del **manifest de adapter** (provider seam, "el slug va en el campo `model`") carga el **slug**; el campo `route.model` del **catálogo** carga el **nombre público**. Son dos campos `model` en dos capas distintas — no los conflaciones.

## El output side del Creative Producer (TASK-1503) — la capability de gasto CERO cuya autoridad no puede venir del store

Los ejemplos anteriores **producen** piezas. TASK-1503 es el **output side**: hace **usable** una pieza ya generada — recuperarla, listarla, marcarla, reusarla como referencia. Vive en `packages/{contracts,domain}/src/producer-assets.ts`, con el seam de lectura en `apps/creative-runner/src/output-retrieval.ts`, el grant en `apps/studio-web/src/retrieval-grant.ts`, la ruta de serving en `apps/studio-web/src/app.ts` y la persistencia en `packages/database/src/stores/producer-asset-store.ts`. Es el patrón a copiar cuando una capability **no gasta** pero **expone bytes**.

**Capability propia, de gasto CERO — y por qué NO reusa la del Lab.** `globe.producer.assets.operate` gobierna
retrieval y asset actions en un mapa separado de gasto. `ui` está `available` desde TASK-1519; MCP conserva su
gate. Descargar lo producido nunca debe implicar autoridad para facturar a un provider.

**La pieza load-bearing — `authorizeOwnedOutput`, y por qué la autoridad NO puede venir del store.** El store de outputs es **content-addressed y TENANT-BLIND**: el nombre del objeto **ES** el hash, un solo bucket para todos los workspaces, y ahí adentro conviven **los outputs Y los bytes de las referencias private-ingest de entrada**. Un bucket así no sabe de quién es nada — preguntarle "¿este workspace puede leer este hash?" no tiene respuesta posible. Por eso la autoridad se resuelve **en el dominio** (`packages/domain/src/producer-assets.ts`): `authorizeOwnedOutput` gatea contra `store.get(workspaceId, experimentId)` — **el MISMO `ExperimentStorePort` del Lab, no un índice paralelo** — y sólo autoriza un `sha256` que aparezca en los `outputHashes` de un attempt con `outcome === 'candidate_ready'` **y** `outputsRetained === true`. **NUNCA** consulta `authorizedInputHashes`: los bytes de una referencia de entrada están en el mismo bucket, y autorizar por presencia convertiría el endpoint de outputs en un lector de los inputs de cualquiera.

**Todo rechazo de PROPIEDAD colapsa a `not_found` — es diseño de seguridad, no laxitud.** Cross-workspace, `experimentId` desconocido, hash que sólo fue **input**, y candidato **no retenido** caen todos en `DispatchError('capability_not_found')` → `not_found`, y son **indistinguibles desde afuera** (distinto del fallo de *prueba* de autorización — grant forjado, editado o expirado — que sí es `access_denied`, porque no dice nada sobre si el activo existe). Cualquier respuesta más fina —un `access_denied` que confirme existencia, un "no retenido" que confirme el hash— es un **oráculo para sondear por content hash un bucket compartido**. Es la misma disciplina que el Lab aplica a un `experimentId` ajeno, llevada al plano de los bytes.

**El grant: opaco, firmado, corto, y NO un bearer autosuficiente.** Va preferentemente en
`x-globe-retrieval-grant`; query queda como compatibilidad. La UI hace fetch same-origin y crea una Blob URL local.
La ruta autentica, verifica el grant y re-chequea propiedad; nunca se loggea ni entra a audit.

**La ruta de serving no duplica política.** `GET /v1/outputs/:sha256?experiment=&grant=&disposition=` en `apps/studio-web/src/app.ts`, en este orden: `resolveDispatchPrincipal` (auth, en el router, antes de entrar) → kill switch → verify del grant (HMAC + expiry + claims) → `deriveTrustedContext` con `workspaceSelection = claims.workspaceId` → **`authorizeOwnedOutput` RE-EJECUTADO** → stream. La re-ejecución es defense in depth **con consecuencia real**: un candidato que dejó de ser recuperable deja de ser **servible**, aunque su grant siga vivo. Reusa el **mismo helper del reader** y el **mismo `handlerErrorToApiCode`** — un primitivo, dos transportes, cero política duplicada. El stream sale con `Content-Type` + `Content-Disposition` de filename **neutro** (`globe-<hash12>.<ext>`, **sin vendor**) y `Cache-Control: private, no-store`.

**Degradación: `dependency_unavailable`, jamás 200 vacío y jamás `not_found`.** Cualquier `OutputRetrievalError` (`not_found` / `unreadable` / `integrity_mismatch`) mapea a **`dependency_unavailable`** (retryable). Un **200 con cuerpo vacío** entrega un archivo roto que parece bueno; y **`not_found` sería una mentira**: el dominio **acaba de certificar** que el candidato existe, así que contradecir el descriptor manda a un operador a **cazar un fantasma**. El código de error tiene que acusar al componente que realmente falló.

**El seam de lectura es el TERCER lector del store.** `OutputRetrievalPort` / `GcsOutputRetrieval` en `apps/creative-runner/src/output-retrieval.ts`: mismo bucket, mismo token **keyless** (ADC/WIF) y mismo naming que `GcsOutputIngest`, y **re-verifica `sha256(bytes) === declarado` ANTES de devolver**. Es distinto de `GcsInputResolver`, que alimenta a un provider **dentro de un run pagado, detrás del fence**: mismo bucket, tres lectores, tres fronteras.

**Asset actions: estado deseado explícito y derechos inforjables.** `favorite` toma el **estado deseado explícito** — **nunca un toggle ciego**, que sobre una vista stale invierte justo lo que el usuario quiso — y en un repeat **conserva el timestamp original**. `copyAsReference` certifica un `ProducerReferenceHandleV1` con `rights: 'derived-internal'`, una postura que **un caller no puede declarar**, más el `parentRights` heredado por `inheritedDerivedRights` — **la MISMA función que usa el edit base del Lab**, para que un ancestro `licensed` no deje de restringir en una de las dos derivaciones. Falla **cerrado antes de mintear** si el medio no es referenciable (`model-3d`). Cero bytes por la API, cero crédito.

**Tipos: `ProducerOutputMediaType` NO es `LabInputMediaType`.** El del output side es `image | video | audio | model-3d`; el de inputs del Lab es `image | video | audio | text`. Son vocabularios distintos y no se conflacionan. El `mediaType` se deriva de la **capability semántica** del run, pero el **`Content-Type` servido sale del objeto real** — así un run multi-output no miente en el cable.

**Persistencia: la idempotencia vive en SQL, no en un read-then-write.** `AssetAnnotationStorePort` + `InMemoryAssetAnnotationStore` (dominio) + `DurableProducerAssetStore` (`packages/database/src/stores/producer-asset-store.ts`) + migración `0003_producer_asset_annotations.sql`. La idempotencia es **`ON CONFLICT DO NOTHING` + re-lectura**: entre réplicas, "chequear y después insertar" es una **carrera** cuyo síntoma visible es un `referenceId` duplicado o una estrella re-fechada. `rights = 'derived-internal'` es un **CHECK**, no una convención. **Delta contra el spec, que hay que registrar:** el spec difería esto a TASK-1465 (que ya shipeó sin cubrirlo); con los servicios en **3 réplicas** (TASK-1508) un store in-memory no queda "volátil" sino **NO DETERMINISTA**.

**Flags y secretos.** `GLOBE_PRODUCER_ASSETS_ENABLED` — variable Terraform `producer_assets_enabled`, **default TRUE en git** (`variables.tf`) y **NO** en `terraform.tfvars` (gitignoreado): un flag cuyo estado real vive en un archivo sin trackear es el **mismo problema de estado efímero** que moverlo con `gcloud`, sólo que mejor disfrazado. `GLOBE_PRODUCER_GRANT_SECRET` — Secret Manager `globe-producer-grant-secret`, con **contenedor + accessor en Terraform** (`secrets.tf`) y **VALOR out-of-band**; el accessor es **sólo para `api_runtime`** (`web_runtime` no tiene consumidor hasta el gate de TASK-1505). Sin el secreto, el mint **degrada a `dependency_unavailable`** — fail-closed, nunca un grant sin firma. `GLOBE_PRODUCER_GRANT_TTL_SECONDS` = 300 default, rango 30-900.

**Runtime vivo.** Las revisiones/digests se consultan en `GLOBE_RUNTIME_HANDOFF.md`, nunca en esta skill. La API
conserva autoridad/serving; el web/BFF consume las capabilities humanas acotadas que entrega el broker.

**Los gates hacia comercial (identificados, no inventados).** Para el **humano interno** en el shell web: **TASK-1505** (broker grant + flip de `ui`/`mcp`). Para el **cliente externo/comercial**: **TASK-1480**, bloqueada por **TASK-1477, TASK-1478, TASK-1479 y TASK-1482** (esta última sobre TASK-1468) — las cinco en `to-do`. Y un gate **sin dueño declarado**: `readStudioRuntimeConfig` **LANZA** `globe_environment_not_internal_smoke` para cualquier valor distinto de `internal_smoke`, así que **hoy no existe forma de bootear un runtime comercial**, y **TASK-1480 no lo menciona**. `internal_smoke` es el **estadio actual del runtime, NO el techo del producto** — no lo describas como limitación permanente. La contabilidad comercial es aparte: el spend fence es de **seguridad**, no ledger (TASK-1468 → TASK-1482).

**Lección de método — un timeout del cliente no es un fallo del servidor.** En este rollout un `execute` síncrono **excedió el timeout de transporte del CLIENTE** y **completó bien en el SERVIDOR**. Leerlo como fallo y reintentar **gasta créditos de nuevo**. Ante un timeout de un command que gasta: **primero leer el estado** (el reader `get`/`status`), después decidir. Aplica a toda capability cara, no sólo a esta.

**Lección de método — un negativo tiene que ser el negativo difícil.** Probar el rechazo de private-ingest con un hash **inexistente** prueba muchísimo menos que hacerlo con un hash que **sí está en el store como input**. La versión válida del control **declara el output retenido de una corrida como input de otra**, y agrega el contra-control de que **el output propio de esa corrida SÍ se sirve**; sin ese par, el test no distingue "rechaza inputs ajenos" de "no encuentra nada". Del mismo rollout sale el patrón de **acceso privilegiado temporal**: grant acotado → verificar → revocar → **verificar el CORTE** (no se asume que la revocación propagó).

## El sexto ejemplo — Sub-familias de video/audio + multi-output + voice presets (TASK-1504): cuando el vocabulario crece, el motor tiene que decir la verdad

Los ejemplos anteriores agregan **capabilities**. TASK-1504 agrega **vocabulario de modalidad**. Está desplegada
internal-only; el canario de una ruta base no certifica frames/motion/change-voice/translate/multi-output, que
mantienen promoción y canario propios.

**El vocabulario.** `CREATIVE_CAPABILITIES` pasa de **10 a 14**: `video-frames` (interpolar entre keyframes), `video-motion-control` (transferir movimiento desde un video de referencia), `audio-change-voice` y `audio-translate`. `GLOBE_CAPABILITIES` pasa de **12 a 13** con `globe.voice.preset.manage`.

### Reglas duras de motor — verificadas EN VIVO con probes de gasto cero

Esto es lo más valioso de la task y lo que un agente futuro **no debe volver a derivar de memoria**: cablear "el motor que uno sabe que existe" shippea una ruta que **sólo falla cuando alguien gasta**.

- **`lastFrame` lo soporta ÚNICAMENTE `veo-2.0-generate-001`.** `veo-3.0-fast-generate-001` y `veo-3.0-generate-001` responden `FAILED_PRECONDITION` — *"The request is not supported by this model"* —, y los ids `veo-3.1-*-preview` **no existen** en el proyecto (`NOT_FOUND`). Por eso `video-frames` está **pineado** a Veo 2.0: no es una preferencia de calidad, es el único motor que **acepta y valida** el segundo keyframe.
- **`fal-ai/elevenlabs/speech-to-speech` NO EXISTE (404).** Es el nombre por el que ese modelo se conoce — y justamente por eso es el que uno cablea de memoria, shippeando una ruta muerta. El app real es **`fal-ai/elevenlabs/voice-changer`** (422), con `audio_url` (obligatorio), `voice` y `output_format`.
- **`fal-ai/elevenlabs/dubbing`** (422) sirve `audio-translate`; su **único** campo obligatorio es `target_lang`.
- **`bytedance/seedance-2.0/reference-to-video`** (422) sirve `video-motion-control`, y su forma tiene tres trampas: `video_urls[]` e `image_urls[]` van **SEPARADOS**, `duration` viaja como **STRING**, y lleva `generate_audio`.
- **`fal-ai/vidu/q1/start-end-to-video` existe (422) pero exige AMBOS keyframes**, así que **no puede servir `hasEndFrame: false`** — un estado que el contrato de run declara. Queda como **ruta futura de alta fidelidad**, no como la elegida: un motor que sólo cubre parte del contrato no es "el motor con una limitación", es una ruta que falla en la mitad de los requests legítimos.
- **El método de verificación es reusable y cuesta cero.** Fal: `POST {}` (body vacío) a `https://fal.run/<slug>` con la key de Globe → **404 = no existe**, **422 = existe** (falló la validación del payload, no el ruteo). Vertex: un probe que **siempre falla la validación** (bytes base64 inválidos) discrimina *"el modelo no soporta este campo"* de *"el campo se aceptó y el request murió después"* — **sin gastar**.

### Los patrones nuevos (lo que hay que copiar)

- **`FAL_ROUTING` es `Record<CreativeCapability, FalModelRoute | null>`.** El record sigue **EXHAUSTIVO**: una capability nueva **rompe el build** hasta que alguien decida, **en código**, si Fal la sirve. `null` significa **"deliberadamente no servida acá"**, que es información; una clave ausente sería un olvido indistinguible de una decisión. Por eso `supports()` chequea **`!== null`**, nunca la presencia de la clave.
- **`supportsLastFrame` es DATO de la ruta, no código.** Mover la interpolación a un motor nuevo tiene que ser **cambiar un id en la tabla**, no editar una rama.
- **`inputUrlKeyByMedia` reparte las referencias POR TIPO DE MEDIO.** Un solo campo compartido metería el video de movimiento en el slot de imágenes: el motor **lo acepta, lo cobra y condiciona sobre lo equivocado** — el peor fallo posible, porque devuelve algo que **se ve bien**. Una referencia cuyo medio la ruta no puede cargar **FALLA CERRADA**: nunca se sube y se omite.
- **Orden de diagnóstico: "este motor no interpola" va ANTES del tope de referencias.** Al revés, el tope **enmascara la causa** y manda al operador a recortar el request cuando la respuesta real es que esa ruta **no interpola nunca**. Un error tiene que acusar **la causa**, no la consecuencia.
- **Los campos de forma se hilan al seam por UN helper compartido.** Resolución, duración, `audioMode`, sample rate, formato, `targetLang` y `voicePreset` los mapea **una** función usada por **la ruta de run y la de estimate**. Con dos mapeos, uno **deriva** — y el que deriva es el que **cotiza distinto de como corre**, o sea el estimate deja de ser una promesa sobre el gasto.
- **El modo de input de video se HILA al seam, no se infiere.** Dos imágenes significan **"inicio y fin"** bajo `frames` con fin, y **"dos referencias"** bajo `elements`. Mismo input, distinto significado: adivinar devuelve un video que **se ve bien y responde otra pregunta**.

### Multi-output: la retención se declara por pieza

`ExperimentAttemptManifestV1.outputs?: LabOutputDescriptorV1[]` (`{ sha256, mediaType, mimeType, retained }`), **aditivo**. La retención pasa a ser **POR OUTPUT**: antes un solo `throw` abandonaba el loop y el manifest **desconocía las piezas que sí se habían guardado**. El flag plano `outputsRetained` queda por compatibilidad y es `true` **sólo si TODAS** se retuvieron.

La consecuencia está en el edit: **`resolveEditSource` elige POR MODALIDAD**, y la modalidad la aporta la **capability HIJA** — sólo el hijo sabe qué medio consume. Antes leía `outputHashes[0]`, así que refinar "el video" de un attempt `{video, audio}` podía entregarle al motor **la pista de audio**.

### El voice preset registry: cuatro identidades, y sólo una viaja

`globe.voice.preset.manage` es capability **PROPIA y de gasto CERO** — registrar una voz no debe implicar autoridad para **facturarle a un proveedor**, exactamente el mismo razonamiento que separó el output side (TASK-1503) de la capability de gasto del Lab. Vive en `packages/domain/src/voice-presets.ts` (+ `packages/contracts/src/voice-presets.ts`), con `VoicePresetStorePort` / `InMemoryVoicePresetStore` y su resolver.

Las **cuatro identidades separadas** son el corazón del diseño:

1. **`presetId`** — workspace-scoped; lo que declara el caller.
2. **`displayName`** — lo que ve el cliente.
3. **`catalogVoice`** — la clave curada de Efeonce; **lo ÚNICO que viaja al seam**.
4. **el vendor voice id** — vive **SÓLO** en el `FAL_VOICE_MAP` del adapter, y de ahí no sale.

Lo que cae de esa separación: cross-workspace y desconocido son el **MISMO `not_found`** (si no, el registry es un **oráculo para sondear otro tenant id por id** — misma disciplina que el retrieval de TASK-1503); un clon **sin `rights` se rechaza**; y un clon **sin voz curada resuelve a nada y el run falla cerrado**, en vez de caer a la voz por defecto — **entregar otra voz es peor que no entregar nada**. La **idempotencia vive EN EL STORE**, nunca en un read-then-write: entre réplicas eso es una carrera cuyo síntoma visible son **dos preset ids para una misma voz**, y un preset id ya usado por corridas pasadas **es parte de su evidencia**.

### El bug fail-open que se cerró, y la validación que faltaba

`ref/motion/loop-v1` declaraba los modos `frames` / `motion-source`, pero su capability resuelve a un motor **text-to-video sin campo de referencia** ⇒ los keyframes se **descartaban EN SILENCIO**, *después* de reservar crédito. La lección general: **una ruta que anuncia un modo que su adapter no adjunta es fail-open**, y sólo se ve **gastando**.

La validación nueva lo cierra: **`assertInputModeSatisfied` cuenta las referencias POR TIPO DE MEDIO antes del fence**. La validación de shape que ya existía sólo probaba que la ruta **DECLARA** el modo; nunca que el caller aportó **lo que ese modo CONSUME**.

### Trampa de método (ya documentada) que igual se repitió

Los scripts `test` de cada package **enumeran los archivos a mano**. `src/voice-presets.test.ts` **tuvo que agregarse** a `packages/domain/package.json` o **nunca habría corrido**, y la suite habría quedado **verde por no haberlo mirado**. Que la trampa reaparezca en una task de cinco slices es la prueba de que hay que chequearla **cada vez**, no "recordarla".

### Estado de rollout

Snapshot histórico del 2026-07-22: kill switch OFF, provider fake y canarios pendientes. El estado actual se
consulta en Runtime Handoff. Los probes de gasto cero siguen probando sólo forma/existencia, nunca calidad.

## El séptimo ejemplo — Media derivatives + Range gateway (TASK-1528): versiones livianas versionadas + serving por tramos

Los ejemplos anteriores **producen** piezas o exponen sus bytes completos. TASK-1528 implementa los **build units
1-3 de ADR-008** ([`EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md`](../../../docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md),
SPEC-010): derivados de media versionados producidos por un worker separado + un gateway que sirve **un solo
Range** re-autorizando cada request. Vive en `packages/{contracts,domain}/src/media-derivatives.ts`,
`packages/database/src/stores/media-derivative-store.ts` + `migrations/0029_media_derivatives.sql`, el worker
dedicado `apps/media-derivatives/**` (segundo Cloud Run Job con binario nativo, patrón asset-governance/ADR-007),
y el gateway `serveMedia` + ruta `/v1/media/` + `apps/studio-web/src/media-ticket.ts`. Desplegado y
canary-verificado internal-only.

**Identidad exacta e inmutable** (cambiar cualquier componente crea otro record/objeto, nunca overwrite):
`(workspaceId, sourceSha256, sourceObjectGeneration, profileId, profileVersion, transformerVersion, outputMime)`.

**Perfiles = DATA gobernada** (`GLOBE_MEDIA_DERIVATIVE_PROFILES`), 6 en v1, cada parámetro EXPLÍCITO — nada
depende de defaults de ffmpeg. Bumpear un valor = nueva `profileVersion` (los viejos → `superseded`); bumpear el
binario/args de ffmpeg = nueva `MEDIA_TRANSFORMER_VERSION`.

**El worker** (`apps/media-derivatives`, debian + ffmpeg pinneado por versión) claima intents con lease+fencing
`SKIP LOCKED`, descarga el source **PINNED a la generation de la identidad** (drift = fallo permanente, nunca un
re-target silencioso), corre planes ffmpeg deterministas por perfil (+ waveform peaks post-procesando el PCM), y
sube content-addressed al **bucket SEPARADO de derivados** con `ifGenerationMatch=0` + reconciliación de same-key
`412` por readback (nombre=hash+size igual ⇒ idempotente; mismatch ⇒ integrity conflict). Un record terminal por
identidad.

**El gateway** `GET /v1/media/:sha256` es un **authority gateway, no un byte buffer**: autentica → verifica el
**media ticket principal-bound** → re-corre `authorizeOwnedOutput` AHORA → resuelve la representación READY
(original o `profileId@version`) → passthrough de UN Range a GCS con backpressure (`GcsOutputRetrieval.openByteStream`).
200/206/416 nativo, sin arrayBuffer/Blob/base64; multipart 400. Errores honestos: storage/no-ready →
`dependency_unavailable`, nunca `internal_error` ni 200 vacío.

**El media ticket** (`media-ticket.ts`, secreto propio `globe-media-ticket-secret`, TTL 120s) es HMAC firmado,
atado a `workspace+experiment+sourceSha256+representation+disposition+principalId`, y **NO es bearer
autosuficiente**: el gateway exige que el principal AUTENTICADO matchee el binding. La `representation` pinea
original vs derivado exacto (un ticket de poster no trae el original). El mint es un reader gobernado
(`globe.media.derivative.ticket`); el BFF reenvía `x-globe-media-ticket`.

**Reglas duras de este dominio:**
- **NUNCA** transformar media en el web/BFF ni en el gateway (ADR-008): la transformación vive SOLO en el Job
  `apps/media-derivatives`. El gateway sólo autoriza + streamea.
- **NUNCA** servir bytes bufferizando el objeto completo (`arrayBuffer`/`Blob`/base64): el tamaño del objeto no
  puede determinar la memoria del request. Se pasa UN Range a GCS y se pipea con backpressure. Multipart → 400.
- **NUNCA** guardar un derivado junto al original ni con su object key: bucket separado
  `efeonce-globe-media-derivatives`, content-addressed. El worker tiene storage **get/create SIN delete** (el
  delete guarded es TASK-1529); el gateway (`api_runtime`) tiene **read-only** sobre ese bucket.
- **NUNCA** sobrescribir un derivado: same-key `412` se reconcilia por readback (idempotente o integrity
  conflict). **NUNCA** re-targetear si el source cambió de generation: es fallo permanente.
- **NUNCA** cambiar un valor de perfil sin bumpear `profileVersion`, ni bumpear el pin de ffmpeg del Dockerfile sin
  bumpear `MEDIA_TRANSFORMER_VERSION` (los bytes cambiarían bajo una identidad sin cambiar — el build falla loud si
  el pin no existe en trixie). Verificado en vivo: el pin drifteado lo atrapó el build antes de producir nada.
- **NUNCA** tratar el media ticket como bearer: el gateway re-autentica, exige match del principal y re-corre
  ownership por request. El secreto del ticket es propio (no reusar el retrieval grant) y nunca se loggea.
- **SIEMPRE** resolver la generation del source y el ownership server-side (`authorizeOwnedOutput`, el MISMO
  primitive de TASK-1503); el request command falla-closed a `policy_blocked` con `GLOBE_MEDIA_DERIVATIVES_ENABLED`
  OFF y el gateway con `GLOBE_MEDIA_RANGE_GATEWAY_ENABLED` OFF.

**Estado de rollout**: build units 1-3 desplegados internal-only; feed/viewer (TASK-1526) y orphan GC (TASK-1529,
desbloqueada) son build units separados; comercial gated por TASK-1480. El estado vivo (revisiones/flags) se
consulta en `GLOBE_RUNTIME_HANDOFF.md` § Media Derivatives, nunca en esta skill.

## El octavo ejemplo — Commercial promotion via rights attestation (ADR-010 / TASK-1535): la firma humana en la unidad correcta

Los ejemplos anteriores generan/promueven piezas. ADR-010 resuelve **cómo comercializar amplitud de modelos de
frontera sin firmar readiness por ruta × workspace**. La clave no es "internal vs comercial": es que la firma humana
estaba en la **unidad equivocada** (O(rutas × workspaces)). El fix la reubica a los dos hechos que **de verdad**
exigen juicio humano — la **licencia por modelo** (O(modelos), en la práctica O(proveedores)) y el **artefacto que
se entrega al cliente** (candidate→approval, ya existente) — y automatiza lo que era toil. Doc: ADR-010
`EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md`. Verificado en vivo end-to-end 2026-07-24 (el CEO
firmó, el lane promovió `foley-v1`).

**Dos piezas (SSOT + derivación).** (1) **Model Commercial Rights Attestation** — autoridad nueva, `requireHuman`,
UNA VEZ por modelo, anclada a evidencia durable (`providerTermsRef` + `providerTermsDigest` sha256 + reviewer + el
grant exacto: `commercialUse`/`clientDelivery`/`sublicensable`). Es un **hecho de control-plane GLOBAL, no dato de
tenant** — por eso la tabla `model_commercial_rights_attestations` NO es workspace-RLS'd (el lane, corriendo como
service workspace, debe leer una attestation firmada desde el workspace interno), y por eso es O(modelos). Inmutable
por `(provider, model, version, termsDigest)`; un cambio de licencia es una attestation NUEVA (nuevo digest), el
`getLatest` devuelve la más reciente. Vive en `packages/{contracts,domain}/src/model-commercial-rights.ts` + store
`packages/database/src/stores/model-commercial-rights-store.ts` + migración `0030`. (2) **Automated lane** — command
`globe.production-promotion.auto-lane.promote` (`packages/domain/src/commercial-promotion-lane.ts`), principal de
servicio **disjunto** `globe:service:promotion-auto-lane` (workload class con `[auto-lane, model-rights.read,
asset-rights-policy.manage, production-routing.manage]`, anti-overlap con routing/promoter/checker). Handler
fail-closed de 7 pasos: parse → resolver workspace **kind** server-side → verificar firma de attestation → re-leer +
re-chequear el eval report objetivo contra la ruta exacta → techo/elegibilidad → publicar rights derivados + habilitar
el binding existente → resultado curado (sin slug/costo/margen).

**El lane es un mecanismo DISTINTO, NO la saga ADR-009.** Descubrimiento load-bearing: el `promoteProductionPromotion`
de la saga está **hardwired a un review humano firmado** (`resolveReview` + `validateReview` maker≠reviewer≠promoter)
— ese review ES el control SoD vendible del régimen humano-craft. El régimen comercial **NO enruta por la saga y NO la
relaja**; el lane deriva la elegibilidad (attestation verificada + eval objetivo + techo) — la pieza que legítimamente
reemplaza la firma por ruta. **Promotion ≠ delivery**: promover hace la ruta *available*; cada artefacto client-bound
sigue pasando candidate→aprobación humana. **La attestation es SSOT; toda postura de derechos es una DERIVACIÓN**
(`deriveEffectiveRestrictions`, sólo aprieta). Techo por workspace fail-closed: una ruta internal-eval-only NUNCA se
promueve a un workspace `client`.

**Workspace kind: config-governed, NO del broker snapshot.** El `BrokerTenancySnapshotV1/V2` firmado **NO lleva
`kind`** (es member-focused); cambiar ese contrato de federación firmado es out-of-scope. El kind se resuelve
server-side desde `GLOBE_WORKSPACE_KIND_CLASSIFICATIONS` (env, JSON `workspaceId→kind`, `ConfigWorkspaceKindResolver`
en `apps/studio-web/src/workspace-kind-resolver.ts`), **fail-closed on miss** (unknown → deny). Cada client workspace
es un entry EXPLÍCITO — defensa en profundidad, nunca caller-declared. (El `DurableWorkspaceKindResolver` sobre
`tenancy_workspaces.projection` queda como future path si el broker algún día lleva kind.)

### 🔴 La lección que MÁS importa — el grant SSO acopla dos repos y rompió el login

Habilitar `globe.model-rights.attest` para el humano **causó una caída de TODO el login de Globe**, y la causa raíz es
una regla del broker que un agente futuro DEBE conocer:

- **El broker impone `capabilityScopes ⊆ requiredScopes`** (`src/lib/sister-platforms/oauth-policy.ts`): un scope no
  puede ser "otorgable pero opcional" — si lo otorgás, es REQUERIDO. Y **ambos repos hardcodean su lista de scopes**:
  Greenhouse `GLOBE_PRODUCER_CAPABILITY_SCOPES` (`globe-oauth-grants.ts`) ↔ Globe `PRODUCER_HUMAN_CAPABILITY_SCOPES`
  (`apps/studio-web/src/app.ts`). Agregar attest SÓLO en el broker lo volvió required; el cliente desplegado no lo
  pedía → el broker **denegó todo login** ("Acceso no disponible / tu sesión no cumple la política de acceso").
- El **fix correcto es un rollout de 3 pasos CERO-DOWNTIME**, en orden, verificando login entre cada uno: **(1)
  Broker: attest a `allowedScopes` SOLAMENTE** (buffer transicional — permitido, aún no required/capability) → login
  intacto; **(2) Globe client: `PRODUCER_HUMAN_CAPABILITY_SCOPES` pide attest**, deploy → login intacto (permitido,
  aún no otorgado); **(3) Broker: mover attest a `capabilityScopes`+`requiredScopes`** → login intacto (el cliente ya
  lo pide) y el token ahora carga la capability. Cada paso mantiene `requiredScopes ⊆ lo-que-pide-el-cliente ⊆
  allowedScopes` por construcción.
- **NUNCA** agregues un capability scope al grant del broker de Globe en un solo movimiento. **NUNCA** lo agregues al
  broker antes de que el cliente Globe desplegado lo pida (ni al cliente antes de que el broker lo permita). Verificá
  el `/auth/start` real (`curl` el redirect, mirá el `scope=`) antes del paso 3, y el broker `authorize` (303-accept
  vs 400 invalid_scope). El script del grant es `scripts/update-globe-producer-oauth-grants.ts` (dry-run sin `--apply`;
  corre contra greenhouse-pg vía **proxy** con `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=` vacío para deshabilitar
  el connector que cuelga).

### Flota multi-modelo — resolución y promoción por ruta

**Principio de producto:** Globe mantiene modelos frontier que coexisten. **Update** cambia la versión dentro de un
lineaje cuando el contrato decide reemplazarla; **add** crea otra ruta/tier seleccionable. La UI y la recommendation
matrix eligen una ruta explícita; nunca existe un “mejor modelo global”.

**La identidad ejecutable es por ruta, no sólo por capability ni proveedor.** La resolución conserva como tupla
exacta `routeId + capability + provider + model + version/endpoint`. Estimate, binding, readiness, circuito,
attempt y manifest deben concordar con esa identidad. Un segundo modelo del mismo proveedor no se habilita
añadiendo otra etiqueta al catálogo: exige resolución route→model en el adapter/driver y falla cerrado ante
`route_binding_missing` o `route_identity_mismatch`. `globe.producer.fleet.list` es el SoT live; el ledger humano
explica evidencia y pendientes, pero no sobreescribe el reader.

**Carriles separados; no los colapses:**

1. **Descubrimiento/evaluación:** probes de existencia o forma, Lab y evaluation harness producen candidatos y
   reportes. Un 200/422, una generación directa o un `objective_pass` no publica la ruta.
2. **Readiness/promoción operator-only:** registra rate vigente, driver gobernado, términos/derechos, attestation,
   evaluación exacta, revisión humana cuando aplica, binding, readiness y circuito para la identidad exacta. La
   promoción hace la ruta `available`; no aprueba piezas para cliente.
3. **Ejecución humana:** el operador selecciona la ruta en Producer desde su sesión autenticada; el browser usa BFF
   same-origin y nunca credenciales de workload. El run conserva la ruta elegida hasta provider, attempt y output.
4. **Entrega/retrieval:** sólo un output exacto, retenido, íntegro y autorizado puede previsualizarse o descargarse.
   Candidate→approval humana sigue siendo un gate distinto de la promoción del modelo.

**Paquete mínimo de evidencia exacta para declarar una ruta operativa:** identidad de ruta/modelo/endpoint,
rate-version, rights attestation y digest de términos, evaluation experiment/report exactos, review/proposal si
aplica, binding/readiness/circuit readback, run + attempt, descriptor de output con MIME/hash/`retained`, y prueba
desde la UI real. Registra identificadores y enlaces en el runtime handoff/ledger; no copies snapshots mutables a
esta skill.

**La prueba de salida es una generación real desde la UI.** Usa la pestaña ya autenticada del operador en su Chrome
cuando esa sea la sesión autorizada; no abras un perfil Playwright nuevo y lo presentes como equivalente. La
evidencia debe mostrar el modelo/ruta seleccionados, operación, créditos, estado terminal, `Guardada`/retenida,
preview de los bytes reales y descarga habilitada. API, runner, CI y canary técnico son evidencia necesaria, pero
no sustituyen esta prueba cuando el criterio es “funciona en Producer”.

Reproducir un candidato retenido de evaluación sólo prueba retrieval/playback de ese activo; **no** prueba que la
ruta promovida pueda crear hoy una pieza nueva desde el Producer. Si el criterio pide canary post-promoción, exige
un run nuevo iniciado en la UI, conserva su identidad exacta hasta el attempt/output y verifica por separado
playback, retención y governance. No reutilices el candidato de evaluación como sustituto de ese canary.

**Cierre sistémico de un incidente de evaluación.** Mantén separados provider attempt, output retenido,
asset/rights proyectados y evaluation report. Recupera cada estado por su reader y conserva la identidad lógica;
un webhook no es un reintento genérico del provider. Evaluación, atestación, readiness, binding/circuito, promoción
y canary son gates distintos: una ruta puede estar promovida y seleccionable sin que exista aún una pieza nueva
verificada desde la UI. Los IDs y el estado mutable viven en `GLOBE_RUNTIME_HANDOFF.md` y
`GLOBE_MODEL_FLEET_STATUS.md`, no en esta regla reusable.

**Referencias ejercitadas del portafolio still/vector** (consulta el reader antes de actuar): Seedream 5 Pro
`ref/still/rrss-v1`; Nano Banana Pro `ref/still/nanobanana-pro-v1`; Nano Banana 2
`ref/still/nanobanana-2-v1`; GPT Image 2 `ref/still/openai-v2`; GPT Image 1.5
`ref/still/openai-v1-5`; y Recraft v4.1 `ref/still/vector-v1`. OpenAI es directo con secreto propio de Globe;
Google-native va por Vertex/GCP (`global` para estas rutas de imagen); Recraft va por Fal. No revivas los estados
históricos “OpenAI pendiente” ni “Nano Banana 2 en 404”: revalida disponibilidad con el reader y el runtime handoff.

**Caso Recraft/SVG generalizable:** `ref/still/vector-v1` usa el endpoint Fal de text-to-vector y espera SVG.
Aunque el payload de Fal declare `image/svg+xml`, el CDN puede responder `application/octet-stream`; aplica la
excepción estrecha de MIME + validación de bytes descrita arriba y sirve con CSP `sandbox`. Una aceptación genérica
por proveedor, extensión o URL sería fail-open.

## Provider boundary

- **El primer provider call *billable* entra por el mismo seam que las surfaces posteriores:** API/SDK o conformance harness → command/reader canónico → provider adapter (`packages/provider-contract`) → runner (`apps/creative-runner`). **NUNCA** un provider SDK directo desde UI/MCP/CLI/scripts/tests.
- **Los model identifiers del provider NO entran a policy de dominio.** El dominio depende de `CreativeCapability` semánticas (`image-generate`, `video-generate`, `audio-generate`, `speech-synthesize`, …), no de nombres de modelo vendor. Ruteá por contrato de fidelidad a través de `CreativeProviderAdapter` (`providerId`, `supports`, `estimate`, `submit`, `poll`).
- **Ruteo de providers:** modelos Google-native solo directo por **Google Cloud / Vertex** (proyecto `efeonce-globe`); **Fal** solo para modelos **no-Google allowlisted**; **OpenAI** directo. Las impls reales de este ruteo son `VertexCreativeAdapter` (keyless) / `FalCreativeAdapter` (key propia) / `CompositeProviderAdapter` (overlap por política) — ver *Provider adapters reales* arriba.
- **NUNCA** expongas una tool genérica `endpoint + arbitrary JSON` (`run_endpoint(endpoint, ...)`). Las capabilities son **semánticas** y gobernadas.
- Cada run registra model/version, inputs, operación semántica, costo de provider, tiempo, hashes de output y rights/classification. `policy-blocked` en una surface significa apagada, **no** que se puedan llamar providers desde scripts ad-hoc.

## Foundation IaC keyless (TASK-1464) — aplicada en vivo

La infraestructura de Globe es **reproducible y sin llaves**, y ya está **APLICADA en vivo (2026-07-19)**. Vive en `infra/terraform/` (HCL, validado con **OpenTofu**; en CI corre `terraform-check.yml` → `fmt -check -recursive` + `init -backend=false` + `validate`, sin credenciales GCP, en cada PR que toca `infra/terraform/**`).

**Qué codifica.** Toma los recursos **VIVOS** de TASK-1454 con **import blocks** (`imports.tf`) — nada se recrea: los servicios habilitados, las 4 service accounts (`caller`/`api_runtime`/`web_runtime`/`deployer`), el pool+provider de **Vercel WIF**, el Artifact Registry `globe-runtime`, los bindings WIF del caller y los roles del deployer. Y **crea** lo nuevo: **GitHub WIF** (pool/provider `github-actions` restringido por repositorio en DOS capas — `attribute_condition` del provider **y** `principalSet` del binding, defensa en profundidad), deployer `run.admin` + `act-as` (runtime SAs + Cloud Build compute SA), el bucket privado `efeonce-globe-lab-evidence` (versionado, `public_access_prevention` enforced; el `api_runtime` escribe/lee vía signed URLs), el **state remoto** `gs://efeonce-globe-tfstate` (`prevent_destroy`, versionado), el **budget opt-in** (`enable_budget` default OFF) y una **alerta si se crea una SA key** (log metric + alert: invariante keyless).

**Protocolo de import (regla dura).** Los SAs y el WIF están **vivos** y sostienen el bridge de identidad, el piloto interno y el SSO. Por eso: **import → `plan` → leer el plan → aplicar SOLO si NO hay `destroy`/`replace`** de una identidad viva. Nunca apliques un plan que destruya o recree un SA/pool/provider vivo. El apply del 2026-07-19 (`tofu apply`) dio **`23 imported, 13 added, 0 changed, 0 destroyed`** — cero identidad viva tocada. El bootstrap del state bucket es un paso humano fuera de Terraform (no puede crearse a sí mismo).

**Deploy keyless.** Cero SA keys: OIDC → WIF → `globe-deployer`. El workflow `deploy-internal.yml` (`workflow_dispatch` manual, `id-token: write`) autentica con `google-github-actions/auth@v2` usando el secret **`GCP_WORKLOAD_IDENTITY_PROVIDER`** (el output `github_wif_provider`) + la deployer SA, construye con **Cloud Build async + poll** (`builds submit --async` + `builds describe` en loop — **nunca sync**, que se cuelga en el log bucket), despliega Cloud Run **privado** (`--no-allow-unauthenticated`, corriendo como la runtime SA) y verifica readiness con `gcloud run services describe` (`status.conditions[0].status == True`) — **nunca un proxy**.

**IaC ↔ runtime.** Los **outputs versionados** de IaC (`outputs.tf`: SA emails, `lab_evidence_bucket`, `github_wif_provider`, …) son **inputs del runtime**: el canary live del Model Lab (TASK-1457) los **consume**, no duplica infra. La frontera es clara: **la IaC provisiona; el spine opera** — no existe un "command/MCP de infraestructura". Cambiar infra es Terraform/`gcloud`, no una capability.

**Git hygiene.** **NUNCA** committees `*.tfstate`, `.terraform/`, `tfplan` ni `terraform.tfvars` real (el `.gitignore` los bloquea); el **`.terraform.lock.hcl` SÍ se committea** (pinea versiones de providers). El state vive solo en `gs://efeonce-globe-tfstate`; en git solo está el HCL.

**Qué codifica ahora también (TASK-1465 + TASK-1508).** El datastore **Cloud SQL `globe-pg`** SÍ está en Terraform (`cloud_sql.tf`; plan `12 added / 0 destroyed`) — es el primer datastore de Globe; ver *Persistencia durable* abajo. Y las **Cloud Run services de la app** también: **TASK-1508** las adoptó por import brownfield (`2 imported / 2 changed / 0 destroyed`), junto con el invoker binding de la api (`greenhouse-globe-caller` → `roles/run.invoker`); el workflow `deploy-internal.yml` quedó **image-only** (ver *front door* abajo). **Qué queda diferido:** el modelo rico de workspace/members/grants persistido (follow-up). No aprovisiona secretos de provider (rollout del canary live) ni producción/clientes externos. Runbook: `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`.

## El quinto ejemplo — Persistencia durable (TASK-1465): de todo-en-memoria a Postgres real, live

Globe nació **sin base de datos**: los 5 stores del spine eran in-memory y se reseteaban al reiniciar. TASK-1465 le dio **persistencia genuinamente durable**, desplegada en los servicios Cloud Run vivos y **verificada en producción-interna (2026-07-21)**. Es la fundación de datos que faltaba y su forma es el patrón a copiar cuando una capability necesite estado que sobreviva un reinicio. Todo vive en `packages/database` (antes un stub de 14 líneas, ahora el cliente real) + `apps/studio-web/src/{app,main}.ts`.

**El datastore — Cloud SQL `globe-pg`.** El **primer** datastore de Globe. Postgres 16, región `southamerica-west1`, tier `db-g1-small`, **ZONAL** (sin réplica HA), **IAM database auth keyless**, **connector-only** (IP pública pero SIN authorized networks — TCP directo rechazado, igual que Greenhouse), PITR + backups, deletion protection. ~USD 15–30/mes fijo. Aprovisionado por **Terraform** (`infra/terraform/cloud_sql.tf`; plan `12 added / 0 destroyed`). Es **Globe-owned**, **NUNCA** compartido con Greenhouse (misma regla de no-compartir-DB del boundary).

**El cliente keyless (`packages/database`).** `createGlobePool(config)` = **Cloud SQL connector** (`@google-cloud/cloud-sql-connector`) + pool `pg` + un `transaction()` (BEGIN/COMMIT/ROLLBACK). Más `resolveRuntimePoolConfigFromEnv()` y los tipos `GlobeQueryable` / `GlobePool` / `TransactionPort`. El runtime es **keyless IAM (sin password)**; el modo PASSWORD existe **SOLO** para el bootstrap one-time del superuser. Los imports internos usan la convención `.ts` (el build reescribe a `.js`), como `packages/domain`.

**El migration runner.** SQL-first, mínimo (`runMigrations`): trackea `globe._migrations` y corre cada migración con `SET ROLE globe_owner`. El schema inicial (`migrations/0001_init.sql`) crea **6 tablas tenant-scoped** + índices + CHECK — `experiments`, `evaluation_reports`, `human_sessions`, `oauth_transactions`, `spend_fence_runs`, `spend_fence_days`, `audit_log` — cada fila **scoped por `workspace_id`** donde aplica.

**El role model `globe_owner` + el gotcha del superuser restringido (documentar).** El bootstrap (`scripts/bootstrap.sql`, one-time como el superuser `postgres` de Cloud SQL) crea un rol **NOLOGIN dedicado `globe_owner`** que **es dueño de TODO objeto de la app**; los migrators (deployer + dev local) son **members** (pueden `SET ROLE globe_owner`); las dos runtime SAs (`web_runtime`/`api_runtime`) reciben DML vía `ALTER DEFAULT PRIVILEGES`. **Gotcha hard-won (verificado empíricamente con un probe, NO adivinado):** el `postgres` de Cloud SQL es un **superuser RESTRINGIDO** (PG16) que **NO puede `CREATE SCHEMA AUTHORIZATION <role>`** para un rol al que no puede `SET ROLE` — así que el bootstrap primero hace a `postgres` **member de `globe_owner`**. Después del bootstrap el password de `postgres` se **scramblea** a un valor no-almacenado ⇒ **cero credencial superuser standing**.

**Los 5 stores in-memory ahora son durables — detrás de sus ports EXISTENTES** (sin reshapear callsites; `packages/database/src/stores/*`):
- `DurableExperimentStore` (persistencia workspace-scoped del Lab).
- `DurableEvaluationReportStore`.
- `DurableSpendFence`: reserve/settle/release **ATÓMICO bajo row locks** — el cap cross-replica que un fence in-memory NO puede dar con `maxScale>1`. Sigue siendo el fence de **SEGURIDAD**, **NO** el credit ledger comercial (eso es TASK-1468).
- Split de `InternalSmokeSessionStore` en un `SessionStorePort` **async** con `InMemorySessionStore` + `DurableSessionStore` (single-use atómico `consumeTransaction` vía DELETE RETURNING, expiry-honest, identity opaca en jsonb).
- `DurableAuditLog` (append-only, INSERT-only).

**El wiring (DI) + el guard relajado.** Los stores se inyectan vía `StudioAppDependencies` (DI). Cuando `GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME` está seteada, `main.ts` **construye los stores durables keyless y los inyecta**; el guard de memory-store se relajó a: "in-memory solo permitido en `internal_smoke`; durable (inyectado) puede bootear en cualquier lado". Las llamadas al session store pasaron a **async**.

**Deploy + verificación live.** Ambos servicios Cloud Run desplegados durable — `globe-studio-internal` (web, user IAM `globe-web-runtime@efeonce-globe.iam`) y `globe-api-internal` (api, user IAM `globe-api-runtime@efeonce-globe.iam`) — a **`maxScale=3`**. El `apps/studio-web/Dockerfile` se arregló para **COPY + build `@efeonce-globe/database`** (bundlea `pg` + connector vía `pnpm deploy`). **Durabilidad PROBADA live:** un `GET /auth/start` en el web service vivo persistió una fila `oauth_transaction` en Postgres, escrita por el servicio corriendo como `web_runtime`, **keyless vía el connector + IAM**. Env por servicio: `GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-globe:southamerica-west1:globe-pg`, `GLOBE_POSTGRES_DATABASE=globe`, `GLOBE_POSTGRES_USER=<web_runtime|api_runtime IAM user>`.

**Lo diferido, y el drift-trap ya CERRADO (TASK-1508).** El modelo rico de workspace/members/grants persistido sigue siendo follow-up. El **drift-trap del `maxScale`** — `deploy-internal.yml` hardcodeaba `--max-instances=1`, así que cada deploy del workflow reseteaba el techo — quedó **cerrado**: TASK-1508 adoptó los dos servicios a Terraform, dejó el ceiling en **3/3** (campo de servicio **y** de revisión) y volvió el workflow **image-only**. Ojo con la consecuencia registrada: mientras el techo efectivo fue **1**, el `DurableSpendFence` cross-réplica **nunca se ejercitó**; ejercitarlo es **TASK-1512**.

## El front door internal-only (TASK-1507) — el dominio sirve el web, y sólo el web

Hasta TASK-1507 Globe se alcanzaba por la URL `run.app` del servicio. TASK-1507 le dio un **front door propio**, `globe.efeoncepro.com`, **internal-only**, implementando ADR-004 (`docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`, TASK-1506); **spec vigente:** `docs/architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md` (SPEC-009); **runbook:** `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` § Front door internal-only (TASK-1507). Verificado en vivo el 2026-07-21. **Un dominio internal-only NO es Production, GA ni acceso de clientes externos:** eso sigue gateado por TASK-1480, y ADR-004 mantiene **diferida** la decisión del frontend cliente comercial (Vercel + Next.js sigue siendo candidato vivo) — "Cloud Run para el shell interno" **no** significa "Cloud Run para el frontend cliente".

**Topología: Global External Application Load Balancer + serverless NEG, no domain mapping.** Los **10** recursos del front door viven en `infra/terraform/front_door.tf` (Globe: código e infra; la doc gobernante, acá); el plan fue `11 to add` porque el 11.º es la habilitación de `compute.googleapis.com` agregada a `local.enabled_services` en `locals.tf`. Carril HTTPS: IP global externa (`globe-studio-front-door-ip`, asignada `8.233.189.79`) → forwarding rule `:443` → target HTTPS proxy → url map → backend service `EXTERNAL_MANAGED` → **serverless NEG regional** (`southamerica-west1`) → Cloud Run `globe-studio-internal`. Carril HTTP: forwarding rule `:80` → target HTTP proxy → url map de redirect (`https_redirect=true`, `MOVED_PERMANENTLY_DEFAULT`, `strip_query=false`). Ambas forwarding rules en `PREMIUM` + `EXTERNAL_MANAGED`. Tres decisiones que hay que respetar al tocarlo:

- **El NEG nombra el servicio por string literal, no por referencia de recurso.** Cuando se construyó, referenciar el `google_cloud_run_v2_service` habría significado **adoptar** el servicio a Terraform, y eso era explícitamente scope de **TASK-1508** — ya ejecutada: hoy los dos servicios **sí** están en Terraform. Convertir ese literal en referencia sigue exigiendo el protocolo de import (`plan` con **cero** `destroy`/`replace`), no un cambio casual de HCL.
- **`enable_cdn = false`, deliberado.** El backend sirve un shell SSO autenticado por sesión; cachearlo en el edge sería un bug de correctitud, no una optimización.
- **`create_before_destroy` en el managed cert.** Un certificado administrado por Google **no se edita in place**; cambiar el dominio sin ese lifecycle deja el front door sin cert.

**Por qué un ALB y no un domain mapping de Cloud Run.** El estado final endureció el ingress a **`internal-and-cloud-load-balancing`**: el servicio sólo admite tráfico que llega **por el balanceador**, así que el front door tiene que ser un balanceador — es el único punto de control que puede quedar delante. El ALB además es lo que da el carril de redirect HTTP→HTTPS y el lugar donde vive la política de borde. **Domain mappings en el proyecto: 0**, y así debe quedar.

**El dominio sirve SÓLO el web; la API queda IAM-private.** El NEG apunta **únicamente** a `globe-studio-internal`. `globe-api-internal` **NUNCA** recibe custom domain ni entrada al NEG: sigue IAM-private (anónimo → **403**, antes y después del cutover), su `GLOBE_API_EXPECTED_AUDIENCE` contiene **los dos formatos de URL `run.app`** y **JAMÁS** el dominio browser, y su `GLOBE_PUBLIC_BASE_URL` es el placeholder `https://globe-api-internal.invalid`. La audience de un ID token se deriva de la URL que Cloud Run reconoce; darle dominio browser a la API rompería la verificación en-app de `verifyWorkloadCaller`.

**Y el `ingress` de `globe-api-internal` es `all` — deliberado. NO lo endurezcas por analogía con el web.** Es la asimetría que más invita a un error de simetría: el web quedó en `internal-and-cloud-load-balancing` porque su único camino legítimo es el ALB, pero el caller de la api es **Greenhouse corriendo en Vercel**, que llega **por internet** — no por la VPC ni por un balanceador. Endurecer su ingress **cortaría la federación workload**. Su perímetro no es el ingress sino **IAM** (`invokerIamDisabled` en **false**, invoker binding en Terraform) **+** la verificación en-app del ID token, con audience derivada del `run.app`. Verificado: anónimo → **403**.

**El ceiling de escala tiene DOS campos y Cloud Run aplica el MENOR — la trampa que costó cara.** Un servicio Cloud Run lleva un ceiling **a nivel servicio** (`Service.scaling.maxInstanceCount`) y otro **a nivel revisión** (`template.scaling.maxInstanceCount`), y el efectivo es el menor de los dos. Peor: **`--max-instances` escribe un campo distinto según el subcomando** — `gcloud run deploy` escribe el de servicio, `gcloud run services update` el de revisión. Eso produjo un bug silencioso de meses: ambos servicios de Globe tenían **servicio=1 / revisión=3**, o sea techo efectivo **1**, mientras toda la documentación (incluido el cierre de TASK-1465) declaraba 3 — y por eso el **spend fence cross-réplica que TASK-1465 construyó nunca se ejercitó**. Lo destapó TASK-1508 al adoptar los servicios en Terraform, y quedó **corregido a 3/3 efectivo**, con **los dos campos** gobernados por IaC. Gobernar el campo de servicio exige provider `google` **>= 7.x** (no existe en 6.x): TASK-1508 subió el constraint de `~> 6.0` a **`~> 7.0`**, y bajo la major nueva **76 de 78 recursos quedaron no-op**. El workflow `deploy-internal.yml` pasó a ser **image-only**: ya **no** pasa `--service-account`, `--no-allow-unauthenticated`, `--min-instances` ni `--max-instances` — pasa **sólo `--image`**; la configuración vive en Terraform y el `ignore_changes` cubre exactamente **tres entradas: la imagen, `client` y `client_version`** (estos dos son metadata de qué herramienta escribió último, no configuración). Prueba anti-drift ejecutada en **dos ciclos, uno por servicio**: ambos dejaron `tofu plan` en **No changes**. **El drift-trap está CERRADO.** Consecuencia registrada: como el techo efectivo fue **1**, el spend fence cross-réplica de TASK-1465 **nunca se ejercitó** — ejercitarlo es **TASK-1512**. El **ingress nunca fue drift-trap**: `deploy-internal.yml` no pasa `--ingress`, y `gcloud run deploy` preserva lo que no se le especifica.

**El orden del cutover: allowlist ANTES que env var.** La spec original ordenaba al revés (cambiar `GLOBE_PUBLIC_BASE_URL` y después agregar el redirect). Se invirtió **deliberadamente**, y ese es el orden canónico para cualquier cambio de origen SSO: **agregar un redirect URI al allowlist es inerte hasta que algo lo use**, mientras que flipear `GLOBE_PUBLIC_BASE_URL` primero abre una ventana en la que `/auth/start` anuncia un callback que el broker todavía no permite — SSO roto para todos, con un rollback que necesita una escritura en DB bajo presión. La secuencia ejecutada fue: (1) ampliar el allowlist de forma **aditiva**, sin quitar el `run.app`; (2) verificar contra el broker **antes** de tocar el runtime; (3) cutover de `GLOBE_PUBLIC_BASE_URL` en Cloud Run; (4) smoke SSO end-to-end contra el dominio; (5) endurecer el ingress; (6) re-smoke post-hardening. El valor es load-bearing: `apps/studio-web/src/app.ts` construye el callback como `new URL('/auth/callback', config.publicBaseUrl)` dentro de `/auth/start`.

**El allowlist se mueve con una primitive, NUNCA con el seed.** El allowlist de redirect URIs se administra por script — no existe route admin de OAuth clients (sólo `/api/admin/integrations/sister-platform-bindings`) — pero el seed de piloto **no sirve para un cutover**: `scripts/seed-globe-internal-pilot.ts` pasa `redirectUris: [uri]` (**REEMPLAZA** el array, o sea borra el `run.app`) y `rotateToken: true` (**ROTA** el client secret y rompe el SSO vivo). El camino correcto es la primitive `updateSisterPlatformOAuthRedirectUris` (`src/lib/sister-platforms/oauth-broker.ts`), manejada por `pnpm sister-platform:redirect` (`scripts/sister-platform-oauth-redirect-uris.ts`, genérico: sirve `globe` y `kortex`):

```bash
# dry-run (no escribe nada, imprime el allowlist resultante)
pnpm sister-platform:redirect --client globe --add https://globe.efeoncepro.com/auth/callback
# aplica
pnpm sister-platform:redirect --client globe --add https://globe.efeoncepro.com/auth/callback --apply
```

Sus propiedades importan y son deliberadas: aditiva/sustractiva, **una sola transacción** con `SELECT ... FOR UPDATE`, toca **exclusivamente** la columna `redirect_uris` (nunca `policy_json`, `allowed_scopes`, TTLs, `client_status` ni el token del consumer); reusa `normalizeRedirectUris` como única autoridad de validación (rechaza wildcards, exige HTTPS salvo localhost, nunca vacío); re-agregar un URI existente es **no-op idempotente** (`changed=false`); **quitar un URI que no está en el allowlist FALLA fuerte** (`invalid_redirect_uri`) en vez de hacer no-op silencioso — durante un cutover, un no-op silencioso sobre una vista stale es exactamente cómo sobrevive el callback equivocado; cliente desconocido → `404 invalid_client`, **nunca** lo crea. La lógica vive en el broker y no en el script a propósito: una route, MCP o Nexa puede operar el mismo cambio por la misma primitive (Full API Parity). Tests: `src/lib/sister-platforms/oauth-redirect-uris.test.ts` (11 casos).

**Verificación de tres vías contra el broker, antes y después.** El broker valida el `redirect_uri` **antes** de mirar la sesión, así que `GET /api/auth/sister-platforms/authorize` discrimina sin necesitar login: antes del cambio, dominio → `400 invalid_redirect_uri` y `run.app` → `303 /login`; después, dominio → `303`, `run.app` → `303`, y un wildcard (`https://*.efeoncepro.com/auth/callback`) → **sigue** `400 invalid_redirect_uri`. El allowlist quedó en **2 URIs**: el `run.app` se **conserva a propósito** como camino de rollback documentado — con el ingress endurecido ese origen ya no es alcanzable por browser, así que un código enviado ahí no llega a ninguna parte, y quitarlo obligaría a una segunda escritura en DB bajo presión durante un rollback.

**Cutover de runtime y endurecimiento de ingress (gcloud, no Terraform, y por qué).** `GLOBE_PUBLIC_BASE_URL` se movió con `gcloud run services update ... --update-env-vars` — **NUNCA `--set-env-vars`, que es destructivo** sobre un servicio vivo (reemplaza todo el set y borra las variables que no listes). El ingress se cerró con `gcloud run services update globe-studio-internal --region southamerica-west1 --project efeonce-globe --ingress internal-and-cloud-load-balancing`. **Contradicción de la spec que hay que registrar:** la spec decía "vía Terraform", pero **en ese momento** los servicios Cloud Run **no estaban en Terraform** y adoptarlos era explícitamente scope de TASK-1508; `gcloud` era el único camino consistente con el scope de TASK-1507. **TASK-1508 ya los adoptó**, así que la configuración del servicio —ingress incluido— queda hoy gobernada por IaC: el `ignore_changes` sólo cubre la imagen + `client` + `client_version`. Resultado verificado: acceso **directo por `run.app` → 404** (bloqueado, es el estado esperado y no un incidente), dominio por el ALB → **200**. `invokerIamDisabled` sigue **true** en el web, que es lo correcto para un servicio con SSO: un browser no presenta ID token, la app autentica por su cookie de sesión.

**Certificado y DNS: dos trampas de diagnóstico que cuestan horas.** El cert quedó `PROVISIONING` tras el apply (esperado: aún no existía DNS); con el A record ya creado en HostGator pasó a **`FAILED_NOT_VISIBLE`**, y **eso no es un error de configuración**: es el resultado guardado del **primer** intento de validación de Google, ocurrido **antes** de que el registro existiera. Google reintenta solo y el estado llega a `ACTIVE` sin intervención — acá tardó ~28 min desde la creación del DNS (cert servido: `CN=globe.efeoncepro.com`, issuer Google Trust Services `WR3`). Antes de tocar nada, la checklist de descarte que se corrió (toda OK) es la que hay que repetir: NS autoritativos respondiendo, `8.8.8.8` y `1.1.1.1` devolviendo la IP correcta, sin `AAAA`, sin `CNAME`, sin `CAA` en el dominio padre, cert adjunto al target-https-proxy, forwarding rule `:443` sobre la IP correcta, y el ALB ya respondiendo por el dominio real desde internet. La segunda trampa es local: el resolver de la máquina del operador mantuvo **cache negativa** del nombre — el SOA de `efeoncepro.com` tiene `minimum` TTL **86400 (24h)**, así que un `NXDOMAIN` cacheado antes de crear el registro persiste ~24h, y `dscacheutil -flushcache` sin `sudo` no hace nada. Síntoma engañoso: `curl` devuelve **`status=000` sin remote_ip**, como si el dominio no sirviera, cuando en realidad sirve para todo el mundo menos para esa máquina. **Siempre** contrastar con `dig @8.8.8.8` y `curl --resolve` antes de concluir que algo está roto.

**El apply, y la carrera que se arregló en el HCL.** `compute.googleapis.com` **no** estaba habilitada en el proyecto (verificado con `PERMISSION_DENIED` antes del cambio) y se agregó a `local.enabled_services`. El plan inicial fue `11 to add, 0 to change, 0 to destroy`, con 65 recursos no-op, **cero destroy/replace y cero recursos Cloud Run en el diff** — el protocolo de import de la foundation, aplicado. El primer apply creó 8/11 y falló en los 3 del carril HTTP-redirect con `SERVICE_DISABLED`: la API recién habilitada no había propagado, y `google_compute_url_map.front_door_http_redirect` era la **única raíz del grafo sin arista implícita hacia la API** (el carril HTTPS la alcanza transitivamente vía backend service → NEG). **Se arregló la carrera en el HCL** con un `depends_on` explícito hacia `google_project_service.enabled["compute.googleapis.com"]`, **no** se reintentó a ciegas. Segundo apply: 3/3, y el plan posterior quedó en `No changes`. Herramienta: **OpenTofu v1.12.4**, provider `hashicorp/google` 6.50.0 (TASK-1508 subió después el constraint a **`~> 7.0`** para poder gobernar el ceiling a nivel servicio).

**Smoke de federación humana, y la regla de calibrarlo.** `efeonce-globe/scripts/smoke-human-federation.mjs` es el par **humano** de `smoke-private-api.mjs` (que cubre el carril workload con SA + ID token). Recorre las **tres piernas** del login real: `GET {origen}/auth/start` → 303 al authorize de Greenhouse; el authorize con sesión Greenhouse → 303 de vuelta al `redirect_uri` con `code`; el callback con la cookie de transacción de Globe → 303 a `/studio` con cookie de sesión. Asserts: el `redirect_uri` anunciado pertenece al origen bajo prueba, PKCE **S256** con `code_challenge` presente, `state` y `nonce` presentes, `state` ecoado, el authorize no puede redirigir fuera del origen, y el callback debe emitir cookie y aterrizar en `/studio`. Env: `GLOBE_WEB_BASE_URL`, `GREENHOUSE_BASE_URL`, `GREENHOUSE_AGENT_SECRET`, `GREENHOUSE_AGENT_EMAIL`, `GREENHOUSE_VERCEL_BYPASS`, `GLOBE_SMOKE_RESOLVE`. `GLOBE_SMOKE_RESOLVE=host:ip` fija la resolución **sólo para ese proceso** (equivalente a `curl --resolve`) para poder smokear un front door recién publicado desde un resolver con cache negativa, **sin debilitar ninguna aserción**: SNI, CN del certificado, header `Host` y `redirect_uri` siguen viajando con el hostname real; sólo decide a qué dirección disca el socket. Detalle técnico: `dns.setServers` **no sirve** (el `fetch` de Node usa el resolver del SO vía `dns.lookup`); la vía correcta es interponer `dns.lookup` devolviendo array cuando undici pide `all`. **Lección de método, no anécdota:** el smoke se corrió **primero contra el origen `run.app`, antes del cutover**, y pasó — así, si fallaba después, acusaba al cutover y no al instrumento. **Un smoke sin calibrar no es evidencia.** Los secretos se leen del entorno y **nunca** se imprimen; el bypass de Vercel se manda **sólo** al origen de Greenhouse, nunca a Globe ni a terceros.

**Resultado final verificado en vivo.** `http://globe.efeoncepro.com/` → **301** a `https://globe.efeoncepro.com:443/`; `https://globe.efeoncepro.com/` → **200**, TLS válido (`ssl_verify_result=0`), HTTP/2, sirviendo el shell real de Globe (`<title>Efeonce Globe — Internal creative studio</title>`) con su propio `x-correlation-id` — o sea responde la app, no una página del balanceador. Smoke SSO contra el dominio: `human_federation_ok` **antes y después** del hardening.

**Costo fijo (Cloud Billing Catalog API, servicio "Networking" `E505-1604-58F8`, precios efectivos 2026-07-21, USD).** La regla mínima global de forwarding rule es **USD 0.025/hora ≈ USD 18,25/mes** y cubre las 5 primeras reglas globales; este front door usa **2** (`:443` y `:80`), así que sumar reglas dentro de ese margen no agrega costo fijo (la adicional sería USD 0.010/hora). El data processing del ALB en Santiago (`southamerica-west1`) es **USD 0.012/GiB** inbound y **USD 0.012/GiB** outbound. El certificado administrado por Google **no tiene cargo**. **Total: ~USD 18,25/mes + ~USD 0,024 por GiB servido (in+out).** Nota de rollback: destruir el ALB pero dejar la **IP global reservada y sin adjuntar** la empieza a facturar como IP estática ociosa — hay que destruir la dirección junto con el resto.

**Rollback: una SECUENCIA ORDENADA, no un menú de slices (camino verificado, no ejecutado).** Los pasos se ejecutan **en este orden**, y el primero es **precondición** de los siguientes. **Desde TASK-1508 la configuración del servicio vive en Terraform**, así que para los pasos 1 y 2 hay que elegir carril explícitamente — HCL, o `gcloud` con la deuda declarada:

1. **Ingress** (<10 min) — en HCL: `ingress = "INGRESS_TRAFFIC_ALL"` en `cloud_run_services.tf` + apply. Por velocidad se puede mover con `gcloud run services update globe-studio-internal --region southamerica-west1 --project efeonce-globe --ingress all`, **sabiendo que es una mutación out-of-band contra el state** que el apply del paso 4 revierte si no se refleja en HCL. Restaura el acceso directo por `run.app`. **Precondición del paso 2**, no un slice independiente.
2. **URL/OAuth** (<15 min) — en HCL: poner `GLOBE_PUBLIC_BASE_URL = <run.app>` en `cloud_run_services.tf` (hoy es `"https://${var.front_door_domain}"`) + apply; o `gcloud run services update … --update-env-vars GLOBE_PUBLIC_BASE_URL=<run.app>` con la misma advertencia del paso 1. El `run.app` sigue en el allowlist a propósito, así que este paso **no** necesita escritura en DB.
3. **DNS** (<60 min por propagación) — quitar el A record en HostGator.
4. **ALB** — revertir **el HCL del front door**, **no** un `git revert` a ciegas de los dos commits: `16919d9` arrastra `variables.tf`/`locals.tf`/`outputs.tf` además de `front_door.tf`, y borra `variable "front_door_domain"`, que `cloud_run_services.tf` usa desde TASK-1508 (`GLOBE_PUBLIC_BASE_URL = "https://${var.front_door_domain}"`) ⇒ el revert deja la referencia viva sin declaración y `tofu plan` aborta con *"Reference to undeclared input variable"* — no llega ni a producir plan. Lo que se revierte: `front_door.tf` completo (sus 10 recursos), la habilitación de `compute.googleapis.com` en `locals.tf` y los outputs del front door; se **conserva** `variable "front_door_domain"` en `variables.tf` mientras `cloud_run_services.tf` la referencie, o se resuelve esa referencia en el mismo movimiento (es la misma edición del paso 2). Los **DOS** commits (**`16919d9` + `cf5e4d1`**) siguen siendo la unidad de contenido a revertir: revertir uno solo deja huérfano el fix del `depends_on` o reabre la carrera `SERVICE_DISABLED`. Después: `tofu plan` → **leer el plan** → `tofu apply`, e incluir la **destrucción de la IP global** (reservada y sin adjuntar se factura como IP estática ociosa). **NO** es un destroy a mano recurso por recurso. **Y "leer el plan" acá es literal:** si los pasos 1 y 2 se hicieron con `gcloud`, el plan va a mostrar el servicio web **volviendo** a `internal-and-cloud-load-balancing` y a `GLOBE_PUBLIC_BASE_URL` del dominio — esos dos cambios hay que revertirlos **también en HCL ANTES** del apply. Aplicar sin eso deshace los pasos 1 y 2 justo cuando el ALB acaba de ser destruido y el A record ya no existe: un servicio que sólo admite tráfico de un balanceador inexistente, anunciando un callback en un dominio muerto — la versión total-outage del segundo incidente.

**La precondición es lo que hay que interiorizar:** revertir sólo `GLOBE_PUBLIC_BASE_URL` con el ingress todavía endurecido **NO es un rollback**. El `run.app` sigue devolviendo **404** (sólo entra tráfico por el ALB) y el dominio pasa a anunciar un callback inalcanzable — eso es un **segundo incidente** encima del primero, no una mitigación.

## ADR-014 — el payload de browser React+Vite: estado del programa (verificado 2026-07-25)

ADR-014 migra el payload humano de Globe de **templates de string** a un cliente **React + Vite tipado**. Esto es el
estado real, contra código y runtime; lo mutable vive en `GLOBE_RUNTIME_HANDOFF.md`.

- **`TASK-1556` (foundation) — COMPLETE.** Existe `apps/studio-client` (Vite 8.1.5 + React 19.2.8 + React Router
  8.3.0, SSR apagado), servido por **el mismo** `apps/studio-web`. Trajo el **SSOT de tokens**
  (`src/tokens/tokens.ts`, con `LEGACY_TOKEN_DRIFT` registrando las divergencias que NO se unifican por decreto),
  la **capa de copy** (`src/copy/`) y un **shell por request** con slot `criticalContent`.
- **`TASK-1557` (Cloud CDN path-scoped sobre `/assets/*`) — COMPLETE y verificado en vivo.**
- **`TASK-1558` (share board) — Slices 1-2 en `main` (`a336ff5`).** Acá **nacieron las primitives**:
  `apps/studio-client/src/primitives/index.tsx` exporta `Chip`, `Eyebrow`, `FactList`, `CommentList`, `StateBlock`
  y `MediaStage`; la superficie es `src/surfaces/share/ShareBoardSurface.tsx`. **Su promoción a primitives de
  plataforma es PROPUESTA, no asumida:** una primitive con un solo consumer es una **hipótesis**; se promueve
  cuando una **segunda** superficie la consume **sin modificarla**. Si el segundo consumer necesita una prop nueva,
  eso **no es promoción** — es evidencia de que la abstracción no estaba lista. Una primitive `Surface`
  **deliberadamente no se construyó**: shippear una primitive sin superficie que la sirva invita a envolver todo
  en ella.
- **`TASK-1554` (reader de flota de modelos) — COMPLETE.** `globe.producer.fleet.list` es el **SoT LIVE** de
  disponibilidad; el ledger `GLOBE_MODEL_FLEET_STATUS.md` es el **SoT humano**. **Si divergen, manda el reader.**
- **`TASK-1561` (gate de diseño) — COMPLETE.** `apps/studio-client/src/gates/design-contract.test.ts` pasó de 3 a
  **5 tests**: literales de color, literales de motion, literales de tipografía
  (`font-family`/`font-size`/`font-weight`/`line-height`/`letter-spacing`), **pesos sin `@font-face`** — el browser
  los **sintetiza**, deformando las letras, sin fallar nada — y copy literal en JSX. El escaneo camina
  `.ts`/`.tsx`/`.css`. **Su frontera está declarada dentro del archivo:** escanea **SOLO** `apps/studio-client`.
  `apps/studio-web` — donde viven los **184 hex crudos** y las **4 familias tipográficas literales** — **NO está
  vigilado**. `TASK-1560` Slice 2 amplía la frontera **inmediatamente ANTES** de borrar el legacy, nunca después:
  un gate rojo al llegar se saltea, y un gate salteado se lee como cobertura.
### El criterio de retiro del legacy mide 38 capabilities, no 12 — y lee DOS archivos

`apps/studio-client/src/data/legacy-parity.ts` es el inventario ejecutable que gatea `TASK-1560`. Su primera
versión declaraba **12** y leía sólo `producer-client.ts`: ese archivo es el **TRANSPORTE** y expone un
`reader(id)` / `command(id)` **genérico**, así que `producer-controller.ts` —la UI— despacha **29 capabilities
más** pasando el id como argumento, y ninguna aparece como literal en el transporte.

**El guard pasaba en verde midiendo el archivo que su autor eligió, no la realidad** — el anti-patrón *"el gate es
el test de regresión del primer consumidor"* aplicado al propio gate. Sin corregirlo, `TASK-1560` habría podido
borrar el legacy con el reemplazo cubriendo **12 de 38**.

Hoy el guard lee **los dos archivos**, clasifica por camino de despacho (genérico vs tipado) y tiene un piso
numérico. El inventario declara la **`surface`** de cada capability, y eso lo vuelve un plan:
**composer 14 · viewer 6 · library 6 · credits 4 · feed 4 · review 4** — el composer es el cuello de botella.

⚠️ Y **12 capabilities están GATEADAS Y NUNCA DESPACHADAS** en el legacy (`library.bulk.*`,
`experiment.evidence/list/tree`, `recipe.get`, `prompt.enhancement.accept/reject`, …): el botón existe, se ilumina
con grant, y no llama a nada. **No son riqueza: son promesas muertas**, declaradas con su motivo en
`LEGACY_PARITY_EXCLUSIONS`. Cuando alguien diga *"el legacy tiene X y el nuevo no"*, la pregunta es **si X
DESPACHA**.

- **Selector de modelo del Producer:** la dirección de “galería de láminas” fue descartada. El contrato vigente es
  un **desplegable compacto con isotipo real**, dentro del composer React
  (`apps/studio-client/src/surfaces/producer/composer/ProducerComposer.tsx`), que lista la flota de la modalidad
  activa. No lo llames galería, no lo vuelvas a implementar en el payload legacy y no uses una nota histórica de
  port/cutover para ubicarlo.

## 🔴 Antes de crear una TASK de este epic: barrer por DOMINIO, no por nombre (2026-07-25)

EPIC-028 tiene **~50 tasks hijas**, y varias describen **la misma superficie desde ángulos distintos**:
foundation · resiliencia · port al payload nuevo · rediseño de jerarquía. Eso hace que un barrido por **título**
no cruce duplicados, y en una sola sesión se crearon **cinco tasks duplicadas** antes de detectarse:

| Creada | Dueña que ya existía |
|---|---|
| feed + viewer sobre el payload cliente | **`TASK-1526`** Producer Resilient Feed and Viewer |
| proyección del share · menciones | **`TASK-1522`** Review, Comments and Read-only Share Foundation |
| composer sobre el payload cliente | **`TASK-1552`** Composer Focused Creation + **`TASK-1532`** One-Click Generate + **`TASK-1555`** Model Selector |
| motion del payload cliente | **`TASK-1523`** Creative Suite Experience Logic (dueña de los contratos visual/flow/motion) |
| (biblioteca, evitada a tiempo) | **`TASK-1520`** Asset Library, Collections and Bulk Operations |

*"Feed + viewer sobre el payload cliente"* y *"Resilient Feed and Viewer"* **son la misma superficie con dos
nombres.** La pregunta correcta no es *"¿existe una task con este nombre?"* sino **"¿quién es dueño de esta
superficie?"**.

**Mapa de dueños por superficie del Producer** (verificado 2026-07-25) — usalo antes de crear cualquier task:

| Superficie | Dueña |
|---|---|
| Composer (IA, first fold, progressive disclosure) | `TASK-1552` |
| Estimado automático + CTA de gasto | `TASK-1532` |
| Selector de modelo | `TASK-1555` (+ `TASK-1553` para resolución por-ruta) |
| Prompt engineer / prompt studio | `TASK-1530` / `TASK-1531` |
| Feed + viewer (resiliencia, concurrencia) | `TASK-1526` |
| Biblioteca, colecciones, bulk | `TASK-1520` |
| Review, comentarios, share, menciones | `TASK-1522` |
| **Contratos visual / flow / motion de la suite** | `TASK-1523` |
| Retiro del payload legacy | `TASK-1560` |

⚠️ **`TASK-1523` es la dueña del contrato de motion de TODO el payload cliente.** El SSOT es
`docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md` — compartido y no per-superficie porque el
isotipo de Globe generando vive en el feed **y** en el composer, y dos definiciones del mismo momento de marca
divergen. Sus tres capas se gobiernan distinto: **identidad** (bajo `reduce` se apaga la animación, **no** el
elemento) · **estructura** (`--duration-none`) · **ambiente** (se apaga).

**Y `Motion: none` en una task de superficie es una alarma, no un default.** `TASK-1559` se autorizó así y el feed
shippeó con **4 de 11** animaciones del diseño aprobado. El task-lint sólo verifica que el campo exista; contar los
`@keyframes` del prototipo antes de aceptarlo cuesta un `grep`.

## Errores canónicos y correlación

- El enum `GlobeApiErrorCode` distingue causas: **`policy_blocked` es distinto de `access_denied` y de `not_found`.** El mapeo lo hace `dispatchErrorToApiCode`: `surface_policy_blocked → policy_blocked`; `capability_denied → access_denied`; `capability_not_found` / `surface_not_applicable → not_found`. Un `TrustedContextError` (workspace no bindeado) siempre es `access_denied`, nunca una pista de qué workspaces existen.
- **NUNCA** filtres detalle interno (secretos, ID tokens, cookies, auth codes, body crudo del upstream, stack) al cliente ni a logs. El SDK jamás devuelve el body crudo del upstream.
- **Un `correlationId` atraviesa todo:** request → trusted context → result → audit. La cadena causal mínima es `greenhouse auth audit id → Globe session id → correlation id → command id → run id → artifact manifest`.

## Reglas duras (NUNCA / SIEMPRE)

- **NUNCA** compartas DB, sesión/cookie, bucket, secreto de provider, SA key ni rol admin entre Globe y Greenhouse.
- **NUNCA** crees en Globe un segundo registry/namespace/lifecycle de tasks; el control plane de `TASK-###`/EPIC es solo Greenhouse.
- **NUNCA** dejes una surface de una capability sin estado de coverage; **NUNCA** representes "sin contrato" como algo distinto de `policy-blocked` (`missing` no existe).
- **NUNCA** aceptes actor/capability/workspace de autoridad desde el body, query o headers del caller; solo `workspaceSelection` no confiable, validado contra `workspaceBindings`.
- **NUNCA** construyas o mutes un `TrustedCommandContextV1` fuera de `deriveTrustedContext`; es branded y server-only.
- **NUNCA** confíes en `api` mode sólo en el perímetro (Cloud Run IAM): un servicio puede tener `invokerIamDisabled: True` y saltarse el invoker check. La app verifica el ID token del caller en-app (`verifyWorkloadCaller`) como segunda capa, **LOCAL** (`google-auth-library.verifyIdToken`, claves cacheadas — **NUNCA** `tokeninfo` por request), con `apiExpectedAudience` (`GLOBE_API_EXPECTED_AUDIENCE`) + `apiCallerServiceAccounts` (`GLOBE_API_CALLER_SERVICE_ACCOUNTS`) **ambos fail-closed** (vacío ⇒ nadie, `access_denied` 403). `IdTokenVerifier` es port inyectable.
- **NUNCA** mandes el ID token en `X-Serverless-Authorization` (Cloud Run lo **consume**, no lo reenvía al contenedor): va en **`Authorization`** (Cloud Run lo reenvía, y es lo único que la re-verificación en-app puede leer). Con X-Serverless el perímetro pasa y la app da **401** al caller legítimo. El SDK usa `Authorization` (`applyAuthMaterial`).
- **NUNCA** permitas que el browser opere el Lab directamente: TASK-1519 habilita UI sólo por BFF same-origin,
  grants acotados y trusted surface server-derived; la ejecución/autoridad sigue en API mode.
- **NUNCA** dejes `invokerIamDisabled: True` en un servicio **`api` mode** (perímetro OFF): es correcto sólo para el servicio **web** con SSO (browser sin ID token; auth por sesión). Desde **TASK-1508** los dos servicios Cloud Run están en Terraform, así que el flag **sí está gobernado por IaC** — **NUNCA** lo muevas con `gcloud` fuera de un incidente documentado: eso reintroduce drift contra el state.
- **NUNCA** trates una mutación `gcloud` sobre los servicios Cloud Run de Globe como si fuera permanente: desde **TASK-1508** el `ingress`, las env vars, el scaling y la service account viven en `cloud_run_services.tf`, y el `ignore_changes` cubre **sólo** imagen + `client` + `client_version` ⇒ **todo lo demás que muevas con `gcloud` es out-of-band contra el state y muere en el próximo `tofu apply`, en silencio**. Está permitido por velocidad dentro de un incidente documentado, y en ese caso el mismo movimiento tiene que reflejarse en HCL **antes** del siguiente apply.
- **NUNCA** llames a un SDK de provider directo desde UI/MCP/CLI/scripts/tests; **NUNCA** expongas `endpoint + arbitrary JSON`; **NUNCA** metas model identifiers vendor en policy de dominio.
- **NUNCA** llames Google-native fuera de Vertex/GCP, ni un modelo Google por Fal; Fal solo non-Google allowlisted; OpenAI directo.
- **NUNCA** confundas `policy_blocked` con `access_denied` / `not_found`; **NUNCA** filtres secretos/tokens/body upstream a cliente o logs.
- **NUNCA** escribas una superficie humana nueva de Globe como **template de string**, ni serialices código de browser con `Function.prototype.toString()` (ADR-014). El payload vive en `apps/studio-client` (React + Vite, tipado, `lib.dom` + el `strict` del monorepo). `producer-ui.ts` / `public-share-ui.ts` / `ui.ts` son **payload viejo en retiro**, no plantilla a copiar: un agente que los toma como referencia reintroduce justo lo que la ADR eliminó.
- **NUNCA** declares un `:root` de tokens fuera del SSOT (`apps/studio-client/src/tokens/tokens.ts`) ni un color, duración o easing literal en una superficie — son **error** de gate, no advertencia. Y **NUNCA** unifiques por decreto un valor que `LEGACY_TOKEN_DRIFT` registra como divergente (p. ej. el anillo de foco, **ámbar** en launch/studio/error y **azul** en producer): adoptarlo es cambio visible y pertenece al slice de port de esa superficie. Corolario del mismo día: dos tokens que **resuelven parecido no son el mismo token** — `--rail-scrim` nació porque la premisa del riel translúcido («en desktop nada pasa por detrás») se rompió y dejó un renglón cortado a media letra; **espeja** `--media-scrim` y **no se consolida** con él, porque consolidarlos ata la legibilidad del riel a la de una pieza.
- **NUNCA** pongas un string visible en JSX ni en `aria-label`/`title`/`placeholder`/`alt`: sale de `apps/studio-client/src/copy/index.ts` vía `copyFor()`. El nombre público del producto y de la moneda **no están decididos**, así que esas etiquetas van a cambiar. Y **NUNCA** dupliques `producer-copy.ts` en la capa nueva: se absorbe **moviéndolo** cuando el composer porte (studio-web depende de studio-client, el copy viaja en esa dirección y nunca de vuelta).
- **NUNCA** devuelvas un `string` desnudo desde un renderer de documento: es `HtmlDocument {nonce, html}` (`apps/studio-web/src/html-document.ts`). El helper de respuesta ya no recupera el nonce con un regex sobre el body — hacerlo emitía `script-src 'nonce-'` y bloqueaba el propio payload sin fallar en build ni en tests. Un nonce que no sea CSP `base64-value` se **rechaza** en la frontera.
- **NUNCA** corras el dev server de Vite con `--host` / `server.host`: 13 de los 19 advisories históricos de Vite son bypasses de `server.fs.deny` o lectura arbitraria del dev server, y **todos** exigen que sea alcanzable por red.
- Globe **tiene ESLint desde `TASK-1556`**, acotado a `apps/studio-client` (jsx-a11y + rules-of-hooks en `error`). Eso NO contradice la regla de `node --test`: el runner de tests sigue siendo Node; ESLint es sólo el linter, y no se apunta al legacy de templates de string porque produciría ruido sobre el que nadie puede actuar.
- 🔴 **NUNCA** declares un flag como "prendido" ni un cutover como "un `tofu apply`" sin verificar **las dos** cosas: **(a) que el flag esté CABLEADO** — si `grep -rn <flag> infra/terraform/` devuelve **UNA sola línea**, esa línea es su **declaración** y no está conectado a nada; un flag cableado aparece **≥2 veces** (declaración en `variables.tf` **+** consumo en el spec del servicio) — y **(b) que la IMAGEN DESPLEGADA contenga el código que lo lee**: `git merge-base --is-ancestor <sha-del-código> <sha-de-la-imagen>`. **Un `tofu apply` verde con plan vacío no es evidencia de nada**: es exactamente cómo el ledger termina diciendo ON con la realidad en OFF. Caso fuente vivo: `client_app_enabled` / `GLOBE_CLIENT_APP_ENABLED` (2026-07-25) — declarado desde `TASK-1556`, conectado a nada, con la revisión viva anterior al commit que trajo el payload.
- **NUNCA** importes primitives de Greenhouse, `CompositionShell` ni MUI dentro de `apps/studio-client` (ADR-014 punto 8 / `TASK-1540`). AXIS contracts/registry pueden consumirse como gobierno de adapters, pero Globe **materializa sus propios** tokens y componentes. Las primitives de Globe viven en `apps/studio-client/src/primitives/index.tsx` (`Chip`, `Eyebrow`, `FactList`, `CommentList`, `StateBlock`, `MediaStage`, `AxisStatus`, `AxisProgress`).
- **NUNCA** promuevas una primitive de Globe a "primitive de plataforma" con **un solo consumer**: es una **hipótesis**, no una abstracción. Se promueve cuando una **segunda** superficie la consume **SIN modificarla**; si el segundo consumer necesita una prop nueva, eso **no es promoción** — es evidencia de que no estaba lista. Y **NUNCA** construyas una primitive sin superficie que la sirva (por eso `Surface` deliberadamente **no existe**).
- **NUNCA** leas el gate `apps/studio-client/src/gates/design-contract.test.ts` como cobertura del repo: su frontera está **declarada en el propio archivo** y escanea **SOLO** `apps/studio-client/src`. `apps/studio-web` — donde viven los **184 hex crudos** y las **4 familias tipográficas literales** — **no está vigilado**. La frontera se amplía en **`TASK-1560` Slice 2, INMEDIATAMENTE ANTES** de borrar el legacy y **nunca después**: un gate rojo al llegar se saltea, y un gate salteado se lee como cobertura. Descripción honesta de hoy: **el payload nuevo no puede driftear; el legacy no está mirado.**
- 🔴 **NUNCA** uses un peso tipográfico que no tenga su `@font-face`: el browser lo **sintetiza**, deformando las letras, **sin fallar nada**. En Globe eso es concreto — `GLOBE_FONT_FACES` carga **tres cortes** (Poppins 700, Geist 400, Geist 600), así que **`font-bold` SÓLO acompañado de `font-display`**; el énfasis en Geist es **`font-semibold`**. Y `font-normal`/`font-medium` son **clases MUERTAS**: el theme hace `--font-weight-*: initial` y el build emite exactamente cuatro utilidades (`font-bold`/`font-semibold`/`font-regular`/`font-display`) ⇒ el 400 explícito se escribe **`font-regular`**. La síntesis sólo va hacia **más pesado**, por eso `font-display` sin peso se ve bien **por accidente** — se declara igual, porque la intención se escribe. Caso fuente 2026-07-29: **trece sitios** pedían Geist@700 (los tres KPI de crédito del header y **cinco reglas `.pf__*` en `styles/tailwind.css`** — la mayoría en la hoja, no en JSX) con el aserto de pesos sintetizados **verde**, porque era ciego a la familia. Hoy lo cierran dos gates: **`never asks a family for a cut it does not load`** (aparea familia×peso **en el sitio de uso**, deriva de `GLOBE_FONT_FACES` agrupado por familia y mapea con `themeKeyFor` —la misma función del generador— para honrar el alias `--weight-display → font-bold`) y **`never writes a font utility the theme cannot generate`**. El gate cubre además `font-family`/`font-size`/`font-weight`/`line-height`/`letter-spacing` (+ el shorthand `font:`) y camina `.ts`/`.tsx`/`.css`. Detalle tipográfico completo: overlay `typography-design/GLOBE_OVERLAY.md`.
- ⚠️ **NUNCA** pidas más de 600 en un `<strong>`/`<b>` sobre Geist, y **NUNCA** introduzcas un elemento HTML nuevo sin verificar qué peso le inyecta el UA. Contexto: el proyecto **no emite el preflight de Tailwind**, así que `b, strong { font-weight: bolder }` computaba **900** dentro de un contenedor a 600 (y 700 dentro de uno a 400) y pedía un corte de Geist que no existe — **faux bold que ninguna clase declaraba**, invisible al gate porque el peso entraba por el **nombre del elemento** y el gate escanea `className`. **Cerrado el 2026-07-29 (`403d346`)**: la base declara `b, strong { font-weight: var(--weight-semibold) }` y ya no hace falta repetir el peso en cada sitio (medido en el runtime vivo: 24 Geist@600, 1 Poppins@700, **cero sintetizados**). Lo que **sí** hay que saber es el techo: el énfasis sobre Geist **topa en 600** — un `<strong>` dentro de un contenedor que ya está en 600 se ve **igual que su padre**, porque no hay archivo. Si de verdad hace falta más peso, el camino es **`font-display` (Poppins 700)**, no pedirle a Geist un corte que no carga. Y la **categoría** sigue abierta: `b`/`strong` están neutralizados, cualquier otro elemento con default del UA vuelve a caer fuera de todo escaneo de clases.
- **NUNCA** decidas la disponibilidad de un modelo desde el ledger `GLOBE_MODEL_FLEET_STATUS.md`: el **SoT LIVE** es el reader **`globe.producer.fleet.list`** (`TASK-1554`); el ledger es el SoT **humano**. Si divergen, **manda el reader**.
- **NUNCA** te refieras al selector de modelo del Producer como **“galería”** ni lo reimplementes en el legacy:
  es un desplegable compacto con isotipo real dentro del composer React, lista la flota de la modalidad activa y
  la región `producer-route` pertenece a composición, no al feed.
- 🔴 **NUNCA inventes un nombre de cabecera al portar.** El transporte del payload cliente enviaba
  `x-globe-idempotency-key` y **ese nombre no lo lee NADIE**: toda la plataforma usa **`x-idempotency-key`**
  (`producer-client.ts` lo manda, `app.ts:2982` lo lee, `app.ts:3164` lo **EXIGE** igual a
  `envelope.idempotencyKey` o devuelve `invalid_request` 400, `app.ts:3215` lo reenvía a la API privada).
  Consecuencia real: **NINGÚN command del payload React funcionaba** — ni `Generar`, ni `Mejorar`, ni
  favorito — y el fallo era invisible porque el BFF rechaza con `return denied(...)`, **sin lanzar**, así que
  no pasa por ningún `catch` ni deja rastro en logs. La cabecera es contrato tanto como el cuerpo.
- 🔴 **`idempotencyKey` va en el CUERPO del envelope, no sólo en la cabecera.**
  `CommandRequestEnvelopeV1` lo declara requerido y `parseCommandEnvelope` devuelve `undefined` sin él.
  Truco de diagnóstico: para distinguir *"el envelope no parseó"* de *"el handler rechazó"* NO sirve el
  `correlationId` de la respuesta — viene de la cabecera `x-globe-correlation-id`, no del cuerpo parseado.
- 🔴 **`deploy-internal.yml` toma el servicio como INPUT: desplegar `globe-studio-internal` NO despliega
  `globe-api-internal`.** La API estuvo corriendo una imagen varios commits vieja mientras el web iba
  adelante, y **el dispatch de commands ocurre en la API**: toda instrumentación agregada al web era
  invisible para el fallo. **SIEMPRE** confirmá qué imagen corre CADA servicio antes de concluir que una
  instrumentación no funciona.
- 🔴 **NUNCA completes un SHA de memoria.** Despaché un deploy "rellenando" los 40 caracteres y el workflow lo
  rechazó en **`Verify exact remote main SHA`** antes de construir nada. El guardrail existe y es la única razón
  por la que ese error salió barato — no es licencia para adivinar: el SHA sale de **`git rev-parse`**, siempre.
- 🔴 **`textPayload:"…"` NO matchea logs JSON en Cloud Logging.** Una línea JSON se parsea a `jsonPayload`,
  así que ese filtro devuelve cero aunque los logs existan. Usar búsqueda de texto libre (`'"mi.evento"'`) o
  `jsonPayload.event="…"`.
- 🔴 **Un servicio sin `roles/logging.logWriter` corre MUDO y no lo dice.** Cloud Run sigue emitiendo sus
  *request logs* — así que en la consola parece que hay logs — pero cada línea del contenedor se descarta en
  silencio. Y sin una **línea de arranque** que siempre aparezca, ese silencio es indistinguible de una app
  que no loggea. Globe emite `globe.studio_web.listening`; si no está, sospechá del rol antes que del código.
- 🔴 **La hoja legacy estiliza por ATRIBUTO, no sólo por clase.** Al convertir 1:1 hay que cargar los
  atributos o el control se ve distinto **sin que ninguna regla propia esté mal**: `[data-producer-asset]`
  (span 4 / `:first-child` span 8 sobre 12 columnas), `capability-button` + `<i class="capability-dot">`,
  `data-producer-intent` (`.advanced-controls [data-producer-intent=styles] { justify-self: start }` es lo
  que hace compacto a Style DNA), y `.producer-console[data-producer-controller-bound=true]
  [data-producer-runtime-shape]` — sin ESOS DOS, los controles de formato de salida quedan como selects
  nativos grises.
- 🔴 **Los controles de salida del legacy NO son `<select>`:** una enumeración se elige con **chips**
  (`shape-chip`, y el glifo de proporción **ES** la proporción vía `aspect-ratio` del valor), un número con
  **stepper** (`shape-stepper`), y **una dimensión con un solo valor admisible es un HECHO de la ruta**
  (`shape-fixed`), no un selector — ofrecerlo promete una decisión que el proveedor ignora.
- **NUNCA** introduzcas Vitest/Jest (Globe usa `node --test`), ni rompas la convención de extensiones (`.js` source↔source de packages; `.ts` en studio-web y en todos los tests).
- **NUNCA** invoques un provider fuera del runner que corre detrás del command (el Model Lab lo hace por el `LabRunner` en `apps/creative-runner`); un SDK de provider directo desde handler/UI/MCP/CLI/scripts/tests está prohibido.
- **NUNCA** reconstruyas las URLs de la queue de Fal desde el slug (usa el `status_url`/`response_url` que devuelve el `submit`); **NUNCA** pongas el prefijo `fal-ai/` en un slug ByteDance (van sin prefijo; verifica un slug con `POST {}` a `https://fal.run/<slug>`: 404=inexistente / 422=existe); **NUNCA** uses la key de Greenhouse (`greenhouse-fal-api-key`) para Fal desde Globe (es `GLOBE_FAL_API_KEY`, propia de Globe); **NUNCA** llames Vertex con API key (es keyless: ADC/WIF, runtime SA con `aiplatform.user`); **NUNCA** reportes el slug del modelo como `actualRoute` (el `actualRoute` es el route del contrato de fidelidad — `== proposedRoute` sin fallback; el slug va en `model`).
- **NUNCA** invoques Omni (`gemini-omni-flash-preview`) por `generateContent` ni por `predictLongRunning`: es **Interactions API** (unary síncrono ~35-60s). Veo (`veo-3.0-fast-generate-001`) **sí** usa `:predictLongRunning`→`:fetchPredictOperation`; el adapter Vertex `generateContent` es **image-only** (video da 400). No cruces las tres fronteras de invocación.
- **NUNCA** metas una imagen en un request **text-to-video** de Veo (da **400**): en i2v el primer frame se **siembra** desde la referencia resuelta por Track B; el t2v va **sin imagen**.
- **NUNCA** intentes **edit stateful** por la superficie **keyless de Vertex** (`aiplatform.googleapis.com/.../interactions`): `previous_interaction_id` → 400 "do not support" y `GET /interactions/{id}` → 500. El edit stateful (`previous_interaction_id` + `store:true`) es **SOLO** por `generativelanguage.googleapis.com/.../interactions?key=` con la API key `globe-gemini-api-key` (ahí OAuth se rechaza con `ACCESS_TOKEN_SCOPE_INSUFFICIENT`). `generativelanguage` **no es Vertex**.
- **NUNCA** compres **"Gemini Enterprise"** (per-seat ~USD 25/seat, sucesor de Agentspace) para la Interactions video API — no tienen relación; el video de Omni **no tiene tier gratis** (USD 0.10/s), y la Gemini Developer API (`generativelanguage`) se paga con **Prepay/Postpay + API key** (`globe-gemini-api-key`, no `greenhouse-*`).
- **NUNCA** encadenes un edit sobre un interaction id **cross-surface**: un id emitido por **Vertex keyless** NO es editable en la superficie Gemini (`generativelanguage`) — son namespaces de id distintos. El edit stateful rutea **solo** por `editTransport` (Gemini-key) del `VertexOmniAdapter` dual-transport, y **falla cerrado con `edit_unavailable`** si no hay `editTransport` inyectado (nunca cae al keyless).
- **SIEMPRE** que un generate deba ser **editable**, córrelo con `store:true` **en la superficie Gemini** (no en Vertex keyless): el adapter resuelve `useEditSurface = (isEdit || store) && editTransport`. Un generate editable en keyless deja un id que ningún edit posterior puede encadenar.
- **NUNCA** dejes un command de capability cara sin kill switch fail-closed (apagado ⇒ `policy_blocked`), sin hard spend fence que aborte *antes* de gastar (el fence es de seguridad, NO el credit ledger de TASK-1468), ni aceptes inputs como bytes crudos (private-ingest: content hash + rights declarados).
- **NUNCA** apliques Terraform/OpenTofu con un `plan` que muestre `destroy`/`replace` de una identidad viva (SA/WIF/registry): el protocolo es import → plan cero-destroy/replace → apply.
- **NUNCA** committees state ni planes (`*.tfstate`/`.terraform/`/`tfplan`/`terraform.tfvars` real; el state vive en `gs://efeonce-globe-tfstate`); el `.terraform.lock.hcl` SÍ se committea.
- **NUNCA** modeles infraestructura como un command/MCP del spine ni dupliques en runtime lo que la IaC provisiona: el runtime consume los outputs versionados de IaC. Cambiar infra es Terraform/`gcloud`, no una capability.
- **NUNCA** deployees con SA keys ni verifiques readiness por proxy: el deploy es keyless (OIDC→WIF→deployer) y la readiness se lee con `run services describe`.
- **NUNCA** crees un `pg.Pool` (`new pg.Pool()`) fuera de `packages/database`: el único punto de conexión es **`createGlobePool(config)`** (Cloud SQL connector + pool `pg` + `transaction()`); resolvé el config de runtime con `resolveRuntimePoolConfigFromEnv()`. (Mismo espíritu que el `no-direct-pg-pool` de Greenhouse, pero en Globe.)
- **NUNCA** uses **password** en el path de **runtime**: el runtime es **keyless IAM database auth** (sin password); el modo PASSWORD existe **SOLO** para el bootstrap one-time del superuser (que después scramblea su propio password ⇒ cero credencial standing).
- **NUNCA** dejes un servicio **durable** sin sus `GLOBE_POSTGRES_*` (`GLOBE_POSTGRES_INSTANCE_CONNECTION_NAME` + `GLOBE_POSTGRES_DATABASE`) **y** su usuario IAM correcto **por servicio** (`GLOBE_POSTGRES_USER` = `web_runtime` para web / `api_runtime` para api): sin ellos `main.ts` no construye los stores durables y el guard cae a in-memory (permitido solo en `internal_smoke`).
- **NUNCA** agregues una dep de package nueva a `studio-web` sin **COPY + build** de ese package (`@efeonce-globe/database` incluido) en el `apps/studio-web/Dockerfile`: el bundle `pnpm deploy` debe traer `pg` + el connector, o el servicio bootea sin cliente de DB (lección viva de TASK-1465).
- **SIEMPRE** que hagas durable un store, ponelo **detrás del port EXISTENTE** (no reshapees callsites): `DurableExperimentStore`/`DurableEvaluationReportStore`/`DurableSpendFence`/`DurableSessionStore`/`DurableAuditLog` implementan los mismos ports que sus dobles in-memory, inyectados por DI (`StudioAppDependencies`). El `DurableSpendFence` hace reserve/settle/release **atómico bajo row locks** (el cap cross-replica que in-memory no da a `maxScale>1`), y sigue siendo el fence de **seguridad**, **NO** el ledger comercial (TASK-1468).
- **SIEMPRE** recordá que **`globe_owner` (NOLOGIN) es dueño de TODO objeto** de la app: migrators son members (`SET ROLE globe_owner`), runtime SAs reciben DML por `ALTER DEFAULT PRIVILEGES`. Ojo con el superuser **restringido** de Cloud SQL (PG16): no puede `CREATE SCHEMA AUTHORIZATION` para un rol al que no puede `SET ROLE` ⇒ el bootstrap hace a `postgres` member de `globe_owner` primero.
- **NUNCA** uses un **seed de piloto** (`seed-globe-internal-pilot.ts`, `seed-kortex-sister-platform-pilot.ts`) para agregar o quitar un redirect URI de un cliente vivo: **REEMPLAZA** el array completo (borra el `run.app`) y **ROTA** el client secret (rompe el SSO en curso). El único camino es la primitive `updateSisterPlatformOAuthRedirectUris` vía `pnpm sister-platform:redirect --client <id> --add|--remove <uri> [--apply]` (aditiva/sustractiva, una transacción con `SELECT ... FOR UPDATE`, toca sólo `redirect_uris`; sin `--apply` es dry-run). Quitar un URI ausente **falla fuerte** a propósito — no lo "arregles" convirtiéndolo en no-op.
- **NUNCA** flipees `GLOBE_PUBLIC_BASE_URL` (ni ningún origen SSO) **antes** de que su `/auth/callback` esté en el allowlist del broker: agregar el redirect es inerte hasta que algo lo use, pero mover la env var primero deja `/auth/start` anunciando un callback no permitido ⇒ SSO roto. El orden canónico es allowlist aditivo → verificar contra el broker (`GET /api/auth/sister-platforms/authorize`: `400 invalid_redirect_uri` vs `303`) → cutover de env var → smoke → endurecer ingress → re-smoke. **NUNCA** quites el origen anterior del allowlist en el mismo movimiento: es el camino de rollback.
- **NUNCA** le des custom domain, domain mapping ni entrada al serverless NEG a **`globe-api-internal`**: es IAM-private (anónimo → 403), su `GLOBE_API_EXPECTED_AUDIENCE` lleva **los dos formatos de URL `run.app`** y **JAMÁS** el dominio browser, y su `GLOBE_PUBLIC_BASE_URL` es el placeholder `https://globe-api-internal.invalid`. El dominio `globe.efeoncepro.com` sirve **sólo** `globe-studio-internal` (domain mappings en el proyecto: **0**).
- **NUNCA** endurezcas el `ingress` de **`globe-api-internal`** por analogía con el web: es **`all` deliberado**, porque su caller es **Greenhouse en Vercel** y llega **por internet**, no por la VPC ni por el balanceador — `internal-and-cloud-load-balancing` le **cortaría la federación workload**. Su perímetro es **IAM** (`invokerIamDisabled` en **false** + invoker binding en Terraform) **más** la verificación en-app del ID token (audience derivada del `run.app`); anónimo → **403**. Que el web esté endurecido **no** es un argumento para endurecer la api: son perímetros distintos por diseño.
- **NUNCA** uses `gcloud run services update --set-env-vars` sobre un servicio Cloud Run vivo: es **destructivo** (reemplaza el set completo y borra en silencio las variables que no listaste). Para mover una variable es **`--update-env-vars`**.
- **NUNCA** concluyas que un dominio "no sirve" por un `curl` con **`status=000` sin remote_ip** antes de descartar **cache negativa del resolver local**: un `NXDOMAIN` cacheado antes de crear el registro persiste según el `minimum` del SOA (en `efeoncepro.com`, **86400s = 24h**) y `dscacheutil -flushcache` sin `sudo` no hace nada. Contrasta con `dig @8.8.8.8` y `curl --resolve`; para smokear desde esa máquina, `GLOBE_SMOKE_RESOLVE=host:ip` (fija sólo el socket; SNI, CN, `Host` y `redirect_uri` siguen con el hostname real).
- **NUNCA** leas `managed.domainStatus = FAILED_NOT_VISIBLE` de un managed cert como error de configuración sin correr la checklist de descarte: suele ser el resultado guardado del **primer** intento de validación, ocurrido antes de que existiera el DNS, y Google reintenta solo hasta `ACTIVE` (acá, ~28 min desde el A record). Checklist: NS autoritativos, `8.8.8.8` + `1.1.1.1` devolviendo la IP, sin `AAAA`, sin `CNAME`, sin `CAA` en el dominio padre, cert adjunto al target-https-proxy, forwarding rule `:443` sobre la IP correcta, y el ALB ya respondiendo por el dominio desde internet.
- **NUNCA** trates el **404 del `run.app` directo** de `globe-studio-internal` como incidente: es el estado esperado con `--ingress internal-and-cloud-load-balancing` (sólo entra tráfico por el ALB). El acceso legítimo es por `globe.efeoncepro.com`.
- **NUNCA** ejecutes el rollback del front door como un **menú de slices**: es una **secuencia ordenada** — (1) ingress a `all`, (2) `GLOBE_PUBLIC_BASE_URL` de vuelta al `run.app`, (3) DNS, (4) ALB — y el paso de **ingress es PRECONDICIÓN** del de URL/OAuth. Revertir sólo la env var con el ingress todavía endurecido deja el `run.app` en **404** y el dominio anunciando un callback inalcanzable: **segundo incidente, no rollback**. El paso ALB **NO** es un destroy a mano **ni un `git revert` a ciegas de los dos commits**: se revierte **el HCL del front door** (`front_door.tf` completo + `compute.googleapis.com` de `locals.tf` + los outputs), **conservando** `variable "front_door_domain"` mientras `cloud_run_services.tf` la referencie — `16919d9` arrastra `variables.tf`/`locals.tf`/`outputs.tf`, y borrar esa variable deja viva la referencia de TASK-1508 ⇒ `tofu plan` aborta con *"Reference to undeclared input variable"*. Los **DOS** commits (**`16919d9` + `cf5e4d1`**) siguen siendo la unidad de contenido: revertir uno solo deja huérfano el fix del `depends_on` o reabre la carrera `SERVICE_DISABLED`. Y si los pasos 1-2 se hicieron con `gcloud`, hay que revertirlos **también en HCL ANTES** del apply: el plan mostrará el web volviendo a ingress endurecido + dominio, y aplicarlo con el ALB ya destruido es **outage total**. Después: `tofu plan` → **leer el plan** → `tofu apply`, **incluida la destrucción de la IP global** (reservada y sin adjuntar se factura como IP estática ociosa).
- **NUNCA** leas un `maxScale` de un solo lugar: hay ceiling **a nivel servicio** y **a nivel revisión**, Cloud Run aplica el **menor**, y `--max-instances` escribe uno u otro según el subcomando (`run deploy` → servicio; `run services update` → revisión). Ambos servicios estuvieron capados a **1 efectivo** mientras los docs decían 3, dejando sin ejercitar el spend fence cross-réplica de TASK-1465 (ejercitarlo es **TASK-1512**); **TASK-1508 lo corrigió a `3/3`** y puso **los dos campos** bajo Terraform, subiendo el constraint del provider `google` de `~> 6.0` a **`~> 7.0`** (el campo de servicio no existe en 6.x). **NUNCA** "restaures" el techo con `gcloud run services update … --max-instances=3`: escribe el campo de revisión y deja el efectivo en 1. El workflow `deploy-internal.yml` es hoy **image-only** (pasa **sólo `--image`**; ya no `--service-account`, `--no-allow-unauthenticated`, `--min-instances` ni `--max-instances`) y el `ignore_changes` cubre exactamente **imagen + `client` + `client_version`**: **NUNCA** le devuelvas flags de configuración al workflow ni amplíes ese `ignore_changes` a configuración real — es reabrir el drift-trap. El **ingress tampoco** fue nunca drift-trap del workflow.
- **NUNCA** conviertas el string literal del serverless NEG en una referencia al `google_cloud_run_v2_service` sin pasar el protocolo de import (`plan` con cero `destroy`/`replace`): el NEG lo nombra por literal desde TASK-1507, cuando adoptar el servicio todavía era scope de **TASK-1508** (ya ejecutada; los servicios están en Terraform). **NUNCA** prendas `enable_cdn` en el backend del shell SSO (cachear una superficie autenticada por sesión es un bug de correctitud), y **NUNCA** saques `create_before_destroy` del managed cert (no se edita in place). Si un recurso del front door no tiene arista implícita hacia `compute.googleapis.com`, dale `depends_on` explícito — **arregla la carrera en el HCL, no reintentando a ciegas**.
- **SIEMPRE** calibra un smoke contra el origen **viejo** antes de un cutover: si falla después, tiene que acusar al cutover y no al instrumento. Un smoke sin calibrar no es evidencia.
- **NUNCA** expongas por ninguna surface el **slug de wire**, el **costo vendor** ni el **margen** de una ruta del Producer Catalog: lo público es `model = { name, version? }` (el nombre real "Seedance · 2.0" es ancla de posicionamiento), y la taxonomía `house` es OPERATOR-ONLY detrás de `globe.producer.route.reveal_house` (default audiencia `client`, que omite `house`). El **nombre** del modelo ≠ el **slug** (el campo `model` del catálogo es el nombre; el campo `model` del manifest de adapter es el slug).
- **NUNCA** reimplementes la resolución de rutas del Producer Catalog: reusá los helpers in-process SSOT (`resolveRouteConstraints`/`getProducerRoute`/`listProducerRoutes`) sin re-dispatch por el registry desde dentro de un handler (mismo patrón que el Evaluation Harness); ampliar/tunear una ruta es editar el array de dato + `PRODUCER_CATALOG_VERSION`, nunca el motor del reader.
- **NUNCA** autorices retrieval de un output **contra el store**: el store de Globe es **content-addressed y TENANT-BLIND** (el nombre del objeto ES el hash, un bucket para todos los workspaces) y guarda **los outputs Y los bytes de las referencias private-ingest de entrada** — no sabe de quién es nada. La autoridad la resuelve el **dominio** (`authorizeOwnedOutput`) contra `store.get(workspaceId, experimentId)` — el **MISMO `ExperimentStorePort` del Lab, nunca un índice paralelo** — y sólo sobre `outputHashes` de un attempt `candidate_ready` con `outputsRetained === true`. **NUNCA** consultes `authorizedInputHashes` en un path de retrieval: eso convierte el endpoint de outputs en un lector de los inputs de cualquiera.
- **NUNCA** devuelvas de un rechazo de **propiedad** en retrieval algo más fino que **`not_found`**: cross-workspace, id desconocido, hash que sólo fue input y candidato no retenido tienen que ser **indistinguibles desde afuera** (un grant forjado/expirado sí es `access_denied`: es fallo de prueba de autorización, no una señal sobre existencia). Un `access_denied` que confirme existencia —o un código que confirme el hash— es un **oráculo para sondear por content hash un bucket compartido**.
- **NUNCA** dupliques la política de autorización en la ruta de serving: `GET /v1/outputs/:sha256` reusa el **mismo helper del reader** y el **mismo `handlerErrorToApiCode`** (un primitivo, dos transportes) y **RE-EJECUTA** `authorizeOwnedOutput` después de autenticar y de verificar el grant — un candidato que dejó de ser recuperable deja de ser servible aunque el grant siga vivo. El grant (HMAC-SHA256, server-minted, **firmado no cifrado**, bound a `(workspaceId, experimentId, sha256, disposition)`, TTL 300s —rango 30-900—, verify stateless en tiempo constante) **NO es un bearer autosuficiente**; viaja en query porque la UI necesita `src` directo, y **NUNCA** se loggea ni entra a un audit event.
- **NUNCA** respondas un fallo del store con **200 y cuerpo vacío** ni con **`not_found`**: todo `OutputRetrievalError` (`not_found`/`unreadable`/`integrity_mismatch`) es **`dependency_unavailable`** (retryable). El cuerpo vacío entrega un archivo roto que parece bueno, y `not_found` es mentira — el dominio **acaba de certificar** que el candidato existe, así que contradecir el descriptor manda a un operador a cazar un fantasma. La lectura **re-verifica `sha256(bytes) === declarado` ANTES de devolver** (`GcsOutputRetrieval`, tercer lector del bucket, distinto de `GcsInputResolver`, que corre dentro de un run pagado detrás del fence).
- **NUNCA** dejes que un caller declare `rights: 'derived-internal'` ni **blanquees** un derivado a `internal-owned`: `copyAsReference` **certifica** esa postura server-side y hereda `parentRights` con `inheritedDerivedRights` — **la misma función que el edit base del Lab** —, para que un ancestro `licensed` siga restringiendo a sus descendientes; falla **cerrado antes de mintear** si el medio no es referenciable (`model-3d`). Y **NUNCA** hagas `favorite` como toggle ciego: toma el **estado deseado explícito** (un toggle sobre una vista stale invierte lo que el usuario quiso) y conserva el timestamp original en un repeat.
- **NUNCA** reuses la capability de **gasto** del Lab para el output side: es
  `globe.producer.assets.operate`, de gasto cero. UI puede consumirla por BFF/grant humano; MCP y comercial
  conservan gates propios.
- **NUNCA** implementes la idempotencia de una anotación con **read-then-write**: entre réplicas, "chequear y después insertar" es una carrera cuyo síntoma visible es un `referenceId` duplicado o una estrella re-fechada. Va en SQL (`ON CONFLICT DO NOTHING` + re-lectura), y `rights='derived-internal'` es un **CHECK**, no una convención. Con `maxScale=3` un store in-memory no es "volátil": es **NO DETERMINISTA**.
- **NUNCA** dejes el estado real de un flag de Globe en `terraform.tfvars` (gitignoreado): `GLOBE_PRODUCER_ASSETS_ENABLED` se declara en `variables.tf` (`producer_assets_enabled`, default **TRUE en git**) — un flag cuyo valor real vive en un archivo sin trackear es el mismo problema de estado efímero que moverlo con `gcloud`, mejor disfrazado. El secreto `globe-producer-grant-secret` lleva **contenedor + accessor en Terraform y VALOR out-of-band**, con accessor **sólo para `api_runtime`**; sin él el mint **degrada a `dependency_unavailable`** (fail-closed), nunca a un grant sin firma.
- **NUNCA** filtres vendor en el filename servido (es neutro: `globe-<hash12>.<ext>`) ni sirvas un output sin `Cache-Control: private, no-store`; y **NUNCA** conflaciones `ProducerOutputMediaType` (`image|video|audio|model-3d`) con `LabInputMediaType` (`image|video|audio|text`): el `mediaType` se deriva de la capability semántica del run, pero el **`Content-Type` servido sale del objeto real**, para que un run multi-output no mienta en el cable.
- **NUNCA** cablees un slug/modelo "que se sabe que existe" sin probarlo primero con un probe de **gasto cero**: en Fal, `POST {}` a `https://fal.run/<slug>` (**404 = no existe**, **422 = existe**); en Vertex, un probe que **siempre falla la validación** (bytes base64 inválidos) para discriminar *"el modelo no soporta el campo"* de *"el campo se aceptó"*. Verificado en vivo: **`fal-ai/elevenlabs/speech-to-speech` NO EXISTE** (404) — el app real de `audio-change-voice` es **`fal-ai/elevenlabs/voice-changer`** (`audio_url` obligatorio, `voice`, `output_format`); `audio-translate` es `fal-ai/elevenlabs/dubbing` (único obligatorio: `target_lang`); `video-motion-control` es `bytedance/seedance-2.0/reference-to-video`, con **`video_urls[]` e `image_urls[]` SEPARADOS**, `duration` como **STRING** y `generate_audio`. Cablear de memoria shippea una ruta que **sólo falla cuando alguien gasta**.
- **NUNCA** uses un Veo 3.x para `video-frames`: **sólo `veo-2.0-generate-001` acepta y valida `lastFrame`** (`veo-3.0-fast-generate-001` / `veo-3.0-generate-001` → `FAILED_PRECONDITION` *"The request is not supported by this model"*; los ids `veo-3.1-*-preview` **no existen**, `NOT_FOUND`). Y **NUNCA** elijas `fal-ai/vidu/q1/start-end-to-video` para esa capability: existe (422), pero **exige AMBOS keyframes**, así que no puede servir `hasEndFrame: false` — un estado que el contrato de run declara. Es ruta futura de alta fidelidad, no la elegida.
- **NUNCA** conviertas `FAL_ROUTING` en un record parcial ni resuelvas `supports()` por presencia de clave: es `Record<CreativeCapability, FalModelRoute | null>` **exhaustivo** (una capability nueva **rompe el build** hasta que alguien decida **en código** si Fal la sirve), `null` significa **"deliberadamente no servida acá"** y `supports()` chequea **`!== null`**. Una clave ausente sería un olvido indistinguible de una decisión. **SIEMPRE** dejá `supportsLastFrame` y equivalentes como **DATO de la ruta**: mover la interpolación a otro motor tiene que ser cambiar un id en la tabla, no editar una rama.
- **NUNCA** metas referencias de distinto medio en un mismo campo del request del proveedor: se reparten **POR TIPO DE MEDIO** (`inputUrlKeyByMedia`), porque un slot compartido mete el video de movimiento en el slot de imágenes y el motor **lo acepta, lo cobra y condiciona sobre lo equivocado** — devuelve algo que **se ve bien**. Una referencia cuyo medio la ruta no puede cargar **FALLA CERRADA**: nunca se sube y se omite.
- **NUNCA** chequees el tope de referencias antes que la afordancia: el chequeo *"este motor no interpola"* va **PRIMERO**, o el tope **enmascara la causa** y manda al operador a recortar el request cuando esa ruta **no interpola nunca**. Un error acusa la causa, no la consecuencia.
- **NUNCA** dupliques el mapeo de los campos de forma (resolución, duración, `audioMode`, sample rate, formato, `targetLang`, `voicePreset`) entre la ruta de **run** y la de **estimate**: van por **UN** helper compartido, o el que deriva **cotiza distinto de como corre** y el estimate deja de ser una promesa sobre el gasto.
- **NUNCA** infieras el modo de input de video desde la cantidad de referencias: se **HILA** al seam. Dos imágenes son **"inicio y fin"** bajo `frames` con fin y **"dos referencias"** bajo `elements`; adivinar devuelve un video que **se ve bien y responde otra pregunta**.
- **NUNCA** declares en una ruta un modo de input que su adapter no adjunta: es **fail-open** y sólo se ve **gastando** (`ref/motion/loop-v1` declaraba `frames`/`motion-source` sobre un motor text-to-video sin campo de referencia y **descartaba los keyframes en silencio, después de reservar crédito**). **SIEMPRE** validá con `assertInputModeSatisfied`, que cuenta referencias **por tipo de medio ANTES del fence**: la validación de shape sólo prueba que la ruta **declara** el modo, nunca que el caller aportó **lo que ese modo consume**.
- **NUNCA** describas la retención de un attempt multi-output con un solo booleano: es **POR OUTPUT** (`ExperimentAttemptManifestV1.outputs?: LabOutputDescriptorV1[]` = `{sha256, mediaType, mimeType, retained}`, aditivo) — antes un solo `throw` abandonaba el loop y el manifest **desconocía las piezas que sí se guardaron**; `outputsRetained` queda por compat y es `true` **sólo si TODAS** se retuvieron. Y **NUNCA** resuelvas la base de un edit con `outputHashes[0]`: `resolveEditSource` elige **POR MODALIDAD**, tomada de la capability **HIJA** (sólo el hijo sabe qué medio consume), o refinar "el video" de un `{video, audio}` entrega **la pista de audio**.
- **NUNCA** metas el registro de voces bajo la capability de **gasto** ni dejes salir el vendor voice id: `globe.voice.preset.manage` es **propia y de gasto CERO** (registrar una voz no debe implicar autoridad para facturarle a un proveedor — mismo razonamiento que el output side), y hay **cuatro identidades separadas**: `presetId` (workspace-scoped, del caller), `displayName` (cliente), `catalogVoice` (clave curada de Efeonce, **lo ÚNICO que viaja al seam**) y el **vendor voice id, que vive SÓLO en el `FAL_VOICE_MAP` del adapter**. Cross-workspace y desconocido son el **MISMO `not_found`** (si no, el registry es un **oráculo para sondear otro tenant id por id**); un clon **sin `rights`** se rechaza; un clon **sin voz curada** resuelve a nada y el run **falla cerrado** en vez de usar la voz por defecto — entregar otra voz es peor que no entregar nada. La **idempotencia va EN EL STORE**, nunca read-then-write: entre réplicas es una carrera cuyo síntoma son **dos preset ids para una voz**, y un preset id ya usado por corridas pasadas **es parte de su evidencia**.
- **NUNCA** declares lista una capability de modalidad nueva porque una ruta vecina o los probes pasaron: cada
  identity exacta necesita evidencia, revisión, promoción, binding, circuito y canario.
- **NUNCA** agregues un `*.test.ts` en `efeonce-globe` sin registrarlo en el script `test` de su package: los scripts **enumeran los archivos a mano** (no hay glob ni descubrimiento), así que un test no registrado **NUNCA corre** y la suite queda **verde por no haberlo mirado**.
- **NUNCA** reintentes un command que gasta después de un **timeout del cliente**: un `execute` síncrono puede exceder el timeout de transporte del **CLIENTE** y completar **bien en el SERVIDOR** — reintentar ahí **gasta créditos de nuevo**. Lee el estado (`get`/`status`) **antes** de decidir.
- **SIEMPRE** una capability nace con schema versionado + command/reader transport-neutral + trusted context + path HTTP/SDK + coverage + conformance (Full API Parity by birth).
- **SIEMPRE** el primer provider call entra por API/SDK/harness → command → adapter → runner.
- **SIEMPRE** commands mutantes llevan actor (derivado), workspace, `idempotencyKey`, `correlationId` y audit; todo run caro se estima y aprueba antes de reservar créditos; los outputs son *candidates* hasta review humano.
- **SIEMPRE** corré `pnpm check && pnpm build` en `efeonce-globe` antes de cerrar, y `pnpm install` al agregar una dep de workspace.
- **SIEMPRE** que una capability nueva toque estado externo o un provider, sigue el patrón del Model Lab: ports en el dominio + impls inyectadas desde transporte/runner + dobles en tests + state machine + error de dominio mapeado a su API code (p.ej. `InvalidExperimentRequestError → invalid_request`).
- **SIEMPRE** que enchufes un motor real, hazlo reemplazando el `CreativeProviderAdapter` detrás del runner — sin tocar el dominio ni el command — siguiendo los adapters reales: Vertex keyless (ADC/WIF), Fal con key propia de Globe (`GLOBE_FAL_API_KEY`, `status_url`/`response_url` de la queue), Composite por `supports()` + política para el overlap; el default de `GLOBE_LAB_PROVIDER` sigue siendo `fake` (hermético) hasta prender un motor por env, y el `actualRoute` reportado es el route del contrato de fidelidad, nunca el slug.
- **SIEMPRE** usá la superficie **keyless** (ADC/WIF, runtime SA) para **GENERATE** de video — Veo (`:predictLongRunning`) y Omni generate (Interactions keyless en `aiplatform`); reservá la API key `globe-gemini-api-key` **solo** para el **edit stateful** de Omni (`generativelanguage`). El ancla `GLOBE_LAB_VIDEO_ANCHOR` (`fal`|`vertex-video`|`vertex-omni`, default `fal`) es **fidelity-aware**: `preserve-set` → Seedance; `anchor`/`flexible` → el motor ancla elegido; el harness nunca auto-gana un motor (todo verdict `objective_pass_pending_human`).

- **NUNCA** transformes media fuera del Job `apps/media-derivatives` (TASK-1528/ADR-008): el web/BFF y el gateway JAMÁS transforman; **NUNCA** sirvas bytes bufferizando el objeto completo (arrayBuffer/Blob/base64) — el gateway `GET /v1/media/:sha256` pasa UN Range a GCS y pipea con backpressure (200/206/416; multipart 400); **NUNCA** guardes un derivado junto al original (bucket separado content-addressed, worker con get/create SIN delete, gateway read-only); **NUNCA** sobrescribas un derivado (same-key 412 = readback idempotente o integrity conflict) ni cambies un valor de perfil sin bumpear `profileVersion`, ni el pin de ffmpeg del Dockerfile sin bumpear `MEDIA_TRANSFORMER_VERSION`; **NUNCA** trates el media ticket (`globe-media-ticket-secret`, TTL 120s, principal-bound) como bearer — el gateway re-autentica + re-corre `authorizeOwnedOutput` por request. Detalle: `EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md` (SPEC-010).

## Sinergias y gobierno

- **`arch-architect`** (overlay greenhouse-pinned): para forma, decisiones de dominio/schema/frontera y red-team antes de implementar.
- **`greenhouse-task-planner`**: para autorar/actualizar la `TASK-###` que gobierna el trabajo (recordá: el registry es de Greenhouse).
- **`greenhouse-documentation-governor`**: para el cierre documental proporcional (arquitectura de Globe + handoff + lifecycle de la task en Greenhouse).
- Globe está gobernado por **EPIC-028** (parallel-first: Model Lab, plataforma gobernada y validación comercial avanzan en carriles con gates distintos). Ejecutar un experimento de modelo y promover una ruta a UI/MCP son **gates separados**: parity contractual nace temprano; habilitar una surface es aparte.

## Gasto y crédito en Globe — lo que hay que saber ANTES de tocar generación (2026-07-26)

Ocho reglas medidas contra el runtime, no razonadas. Las tres primeras cuestan una sesión entera si se ignoran; las 6-8 son las que impiden diagnosticar mal la topología de autoridad.

1. **`credits.allocate` NO habilita gasto.** Llena el **ledger**; la política (`AdminCreditBudgetPolicy`) sólo mira
   **grants de pools activos**. Por eso se puede ver `ledgerAvailable: 500002` y que toda generación se niegue con
   `pool_exhausted`. Son dos capas: ledger ≠ fondeo. "Cargar créditos" no es fondear.

2. **Un `409 conflict` en `execute` casi nunca es idempotencia.** `dispatch.ts` § `handlerErrorToApiCode` (~304-320)
   colapsa **TRES** clases de error en `conflict`, a propósito, para no filtrar saldos: `CreditLedgerError`
   (`insufficient_balance`, `budget_denied`), `CommercialCreditLifecycleError` (todo salvo `shape_required`:
   `approval_stale`, `approval_invalid`, `hard_cap_exceeded`) y `CreditAdministrationError` (todo salvo
   invalid/not_found/dependency — **incluyendo `maker_checker_required`**). 🔴 **Consecuencia que cuesta una sesión:
   una aprobación vencida o con digest que no calza devuelve el MISMO 409 que un `pool_paused`**, así que "la
   aprobación era válida" no está probada por el 409. Para desambiguar hay que preguntarle a
   **`globe.credits.budget.evaluate`** (devuelve `reason`) y a `budget.availability.get`
   (`policyAvailable` vs `ledgerAvailable`). **Ninguno de los dos está en la superficie `ui`**: se consultan por el
   lane privado. Es la causa de `ISSUE-124`, y la arregla el Slice 1 de `TASK-1566` (fase de negación como enum
   cerrado + los dos readers a `ui: available`).

3. **El cliente DEBE honrar `withinDayCap`.** El estimado lo trae (`= commercial.withinBudget`, o sea la política
   negando). Ignorarlo deja el CTA habilitado, `prepare` en 200 y `execute` en 409 opaco, con un experimento
   preparado por intento. El legacy lo chequea antes de preparar (`producer_budget_policy_blocked`).

4. **`hardCapCredits` es parte del quote que firma el `approvalToken`.** El estimado y `prepare` tienen que declarar
   **el mismo** techo: `execute` reconstruye el quote desde lo guardado y, si no coincide, rechaza como
   `approval_stale` → que llega como `conflict`. Y el token que viaja en `execute` es el del estimado **vigente**:
   "el token ES la cotización".

5. **Firmar aprobaciones desde un cliente es BREAK-GLASS, no operación — y para FONDEAR ya ni eso: el
   camino normal es el carril gobernado** (`propose` → `confirm`, VIVO y ejercido end-to-end el
   2026-07-26; runbook `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`). El secreto de
   aprobación es `only api_runtime can read them` (`infra/terraform/secrets.tf`). El break-glass
   documentado (`GLOBE_RUNTIME_HANDOFF.md:220`) otorga `serviceAccountTokenCreator` **temporalmente al
   operador humano**, ejecuta y revoca con readback; su contador debe tender a CERO ahora que el carril
   funciona. **NUNCA** lo conviertas en el camino normal, **NUNCA** le des
   `secretmanager.versions.access` a `greenhouse-portal@` (es la identidad de reconciliación de tenancy de
   **Greenhouse**: usarla para administrar crédito de **Globe** es admin implícito cross-plataforma), y **NUNCA**
   dejes que un **workload genérico o principal de servicio** proponga y confirme. Un agente autenticado sí puede
   confirmar por el carril delegado de `TASK-1629`, pero sólo con OAuth público allowlisted, los dos entitlements,
   política explícita por workspace, límites de grant/tope mensual e intención append-only.

   🔴 **Y NUNCA exijas DOS humanos por defecto.** La primera versión de ADR-015 lo hacía y costó **dos horas de
   fricción para sumar créditos**: el operador es CEO y product owner del presupuesto, así que no hay segundo actor
   que buscar. **Un control que nadie puede satisfacer no protege, desvía** — al break-glass, que otorga MÁS
   autoridad que el camino que reemplaza. El segundo confirmador es **política** (`requireSecondConfirmer` por
   workspace + techo por operación), **default OFF** en el workspace interno. Lo que se queda como invariante es lo
   que cuesta cero: un principal de servicio nunca confirma; un agente sólo confirma dentro de su delegación
   acotada; y aprobador ≠ ejecutor entre service accounts.

6. 🔴 **La autoridad de crédito YA está concedida a la identidad que Greenhouse puede impersonar — el problema no es
   que falte, es que SOBRABA — y el 2026-07-26 SE RETIRÓ (ADR-015 §10, rev `00114-k4t`).** La cadena era:
   `greenhouse-portal@` con `tokenCreator` sobre `greenhouse-globe-caller` (`iam.tf:16-20`) → principal genérico
   `globe:service:internal-caller` → que cargaba `grant.issue`/`grant.correct`/`policy.manage`/`budget.manage`
   **más `globe.lab.experiment.run`** — fondeo y gasto en una identidad. **Hoy el caller genérico (y el broker de
   tenancy, misma clase) ya NO carga las cuatro**: conserva lecturas, `pool.manage` y `funding.propose/confirm`
   (el carril gobernado, que ES el camino de fondeo). Señal anti-regreso en dos capas:
   `creditAdminAuthorityDrift` + evento `globe.credit_admin.caller_authority_drift` (steady = 0) y el test de
   disyunción en `tenancy-runtime.test.ts`. **NUNCA re-agregues una de las cuatro sin reabrir ADR-015** — el test
   te va a parar, y saltártelo reintroduce fondeo+gasto en la identidad que Greenhouse puede asumir.

7. 🔴 **El maker-checker de crédito es VACUO para cualquier caller de workload.** `approval()`
   (`packages/domain/src/credit-administration.ts`) compara `approval.proposedBy` contra
   `context.actor.principalId`, que para un workload es la **constante** `'globe:service:internal-caller'`
   (`app.ts:3503`): cualquier `proposedBy` distinto de esa constante pasa el chequeo **trivialmente**, y la única
   atadura real es el HMAC. **NUNCA** apoyes una disyunción de actores en ese chequeo, y **NUNCA** cites "el
   maker-checker lo impide" como control para un caller de workload. Corolario: la disyunción tiene que vivir donde
   hay identidades humanas reales — **Greenhouse**, no Globe.

8. **Un HMAC compartido significa que quien verifica puede FORJAR** (es la misma llave y la misma operación). Por eso
   `createHmacCreditAdminApproval` no admite un firmador de cliente sin repartir poder de forja, y por eso **no
   existe ninguna superficie que firme**: `.sign(` no aparece en `app.ts` — el verificador está cableado, el firmador
   no. **NUNCA** propongas "ampliar el radio del secreto" como salida: es la misma propiedad con otro dueño.

**Dirección decidida — ADR-015** (`EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`, Partially
implemented: carril de fondeo VIVO y ejercido + retiro de las 4 caps ejecutado el 2026-07-26; KMS e
identidades disjuntas por unidad quedan como hardening; implementación = `TASK-1566`): la administración de créditos y capabilities de Globe **vive en Greenhouse** —
superficie en Greenhouse, autoridad en Globe, lane `sister-platform` (hoy `available` sólo en tenancy), **cuatro
identidades disjuntas** (broker de administración **distinto** del reconciliador de tenancy; aprobador que firma y no
muta; ejecutor que muta y **no puede firmar**, separados como **unidad de ejecución propia** porque dentro de un
proceso la disyunción es cosmética), **KMS asimétrico** en vez del HMAC, comando gobernado
`credits.month.fund.propose` / `.confirm` con **UNA confirmación autenticada** (humana o agente delegado por
política y límites; el segundo confirmador es política por workspace + techo, default OFF en el interno) y la mutación (grant + asiento
de ledger + política) en **UNA transacción Postgres**, y el **retiro de la autoridad de crédito del caller
genérico** al final. Break-glass con TTL/motivo/aprobación/revocación automática/readback **y su propio contador**.
**Cargá ADR-015 antes de tocar administración de crédito o capabilities de usuarios de Globe.**

**Capabilities por usuario: hoy NO EXISTE la dimensión.** `src/lib/globe/tenancy-reconciler.ts:216` asigna
`desiredCapabilities: policy.capabilities` — **el mismo set a todo miembro de todo workspace bindeado**, tomado del
grant OAuth. Y sería **inerte**: `tenancy_mode` default es `"shadow"` (`variables.tf:130`) y la proyección
**observa y nunca niega**. **NUNCA** prometas control de capabilities por usuario sin `tenancy_mode = enforced`
(`TASK-1511`), y **NUNCA** intentes diferenciar por usuario en el **token**: el broker acopla
`capabilityScopes ⊆ requiredScopes` y agregarlo lo vuelve requerido para todos (la lección que tumbó el login en
ADR-010). El grant OAuth es el **techo**; la proyección es el **piso**.

🔴 **Una sanitización SIN contraparte de observabilidad no protege información: la DESTRUYE (ISSUE-127, 2026-07-26).**
Cuatro códigos canónicos de Globe colapsaban causas que exigen acciones **opuestas**, y tres de ellos bloquearon el
canary de generación en cadena: **`409 conflict`** de crédito (aprobación vencida vs. inválida vs. pool pausado vs.
replay), **`runner_error`** (todo fallo del runner sin `reason` de nuestro vocabulario), y
**`ProductionRouteDependencyError`** (**28 sitios de throw sin argumento**: allowlist, endpoint, provider, URL,
región, persistencia de la decisión, forma del request, placeholder de input). El cuarto —
**`authentication_required`** en api mode (clase de credencial vs. `--include-email` ausente vs. audiencia
incorrecta) — **sigue abierto**.

El colapso es **correcto** de cara al caller: no filtrar saldos, política, prosa de proveedor ni detalle de
credencial por una taxonomía compartida. El defecto es hacerlo **sin dejar rastro del lado del servidor**. El
precedente correcto ya existía y no se había replicado: `globe.dispatch.invalid_request`.

**La evidencia de que es un patrón y no bugs sueltos:** arreglar `runner_error` hizo aparecer
`ProductionRouteDependencyError` **en el primer canary posterior** — el evento nuevo reportó
`errorName=ProductionRouteDependencyError, reasonShape=absent`, o sea nombró la clase y probó que la clase no
llevaba causa. Sin ese arreglo la tercera seguiría invisible.

**REGLA:** todo código canónico que colapse **más de una causa accionable** nace con su razón del lado del
servidor. El payload lleva el **nombre del control** y, si aplica, la **FORMA** del dato faltante (`reasonShape`:
`absent` / `not-a-string` / `malformed` — separa "el adapter no puso `reason`" de "puso uno malformado", dos bugs
distintos y el segundo invisible sin esto). **JAMÁS** el `message`, el `stack`, el body del upstream ni nada
derivado del payload: la prohibición de filtrar detalle interno aplica a los **logs** igual que al cliente, y hay
tests que lo verifican. Y si el dominio es transport-neutral —lo es, cero `console` en el paquete— la razón se
observa por un **port inyectado**, no por un `console.error` metido ahí.

🔴 **Un control legítimo que rechaza un caso legítimo se arregla en el CONTROL, no en el caso (ISSUE-127 capa 8, 2026-07-26).**
El sanitizador del body snapshot trataba como credencial **cualquier** string que empezara con `Key `/`Bearer `
(regla `^(?:Bearer|Key)\s+`, prefijo y nada más). El prompt del canary de imagen empieza con **`"Key visual editorial
para Efeonce Globe: ..."`** — `Key visual` es el término de dirección de arte del equipo, no un secreto. Ese falso
positivo bloqueó el `execute` durante toda una sesión, y **llegaba etiquetado `endpoint_url_not_permitted`**, que
mandaba a leer una config de endpoint que estaba perfecta.

**NUNCA** desbloquees esto cambiando el input (el prompt del canary): desbloquea la sesión **escondiendo** el bug, y
el próximo que escriba el término estándar del oficio —un usuario real— come el mismo rechazo mudo. **La heurística
tiene que distinguir el dato del formato:** una credencial serializada es **un token opaco, no una frase**, así que
se exige token único, sin espacios, ASCII de credencial y **anclado al final** (`$`). Con eso `Bearer eyJhbGci…` y
`Key <id>:<secret>` (el formato real de fal) se siguen atrapando y la prosa no: sube la precisión sin bajar el
alcance contra credenciales reales — ningún token real lleva espacios ni acentos.

Corolario de método, medido dos veces el mismo día: **una hipótesis se mata leyendo, no desplegando.** Los cuatro
sospechosos heredados asumían que `buildBody` armaba referencias con `placeholder(input)` — el de `text-to-image`
**no lo llama**, su body son cuatro escalares; y la hipótesis de `vertexProject` vacío (que habría roto el regex de
vertex en el **constructor**, que valida las 12 entries, no 3) murió con un `gcloud run services describe`:
`GLOBE_LAB_VERTEX_PROJECT` está sin setear y cae al default. Ninguna de las dos costó un deploy.

## Sesión 2026-07-26 — generación real, carril de fondeo y ocho lecciones de método

**El día en una línea:** el canary de generación GENERÓ por primera vez, el Producer React salió a la
luz, la UI produce las tres modalidades, y el carril gobernado de fondeo quedó vivo end-to-end salvo
el último salto de credenciales. Lo que sigue son las reglas que sobreviven a la sesión.

### Generación — el estado real (verificado en runtime, no leído)

Las **tres modalidades generan desde la UI** con principal `human` por el BFF: imagen (Seedream 5 Pro,
10 cr, PNG 7,4 MB), video (Seedance 2.0, 16 cr, MP4 1,5 MB) y audio (ElevenLabs Multilingual v2, 6 cr,
MP3 114 KB). El fence libera correctamente: un `provider_failed` dejó `spentCredits=0`.

🔴 **`"Key visual"` NO es una credencial (ISSUE-127 capa 8).** El sanitizador del body snapshot marcaba
como credencial cualquier string que empezara con `Key `/`Bearer ` (regla `^(?:Bearer|Key)\s+`,
prefijo y nada más). El prompt del canary de imagen empieza con *"Key visual editorial para Efeonce
Globe…"* — el término de dirección de arte del equipo. **Ese falso positivo bloqueó el `execute`
durante una sesión entera**, y llegaba etiquetado `endpoint_url_not_permitted`, mandando a revisar una
config de endpoint intachable.

**Un control legítimo que rechaza un caso legítimo se arregla en el CONTROL, no en el caso.** Cambiar
el prompt habría desbloqueado la sesión **escondiendo** el bug para el próximo usuario real. La regla
correcta distingue el dato del formato: una credencial serializada es **un token opaco, no una frase**
— se exige token único, sin espacios, ASCII de credencial y **anclado al final** (`$`).

🔴 **Un fallo de proveedor puede ser TRANSITORIO, y una hipótesis con un solo dato no está confirmada.**
Un video falló con `provider_failed`; la hipótesis "es el audio" pareció confirmarse porque `silent`
pasó. **La corrida de confirmación la refutó: `with-audio` también pasó.** Marcador real: 2 de 3.
Antes de shippear un fix sobre una correlación, **corré el caso que la refutaría**.

### Producer React — verificar wiring e imagen, no historia

Producer sirve el payload React. Antes de diagnosticar un fallback, verifica en el runtime el flag efectivo, que
la variable esté cableada en IaC, que la imagen desplegada contenga el código que la lee y que la ruta bajo prueba
use ese payload. Un plan vacío, un commit o una nota histórica no prueban el estado de la superficie.

🔴 **`MediaStage` es primitive COMPARTIDA (share board + viewer): su `padding` y su
`max-height: calc(100svh - 8.5rem)` son correctos en el share board y ROMPEN el viewer**, donde la
celda ya tiene altura propia. Medido: celda 830×830, pieza 757×757, 37 px de aire por lado. El override
va **acotado al viewer** (`producer-viewer.css`), nunca en la primitive. Sigue en `contain`, jamás
`cover`: llenar no puede significar recortar.

🔴 **Una corrida FALLIDA no puede ofrecer acciones muertas.** `Descargar` y `Usar como referencia` ya
estaban gateadas por `retained`; **`Ver candidato` no**, y era la única realmente muerta — corregido.
Y el slot **`Destacada` no renderizaba `statusLine`** (se consumía sólo en la rejilla), así que una
corrida fallida se presentaba como la mejor pieza del espacio, muda. Ambas cerradas.

⚠️ **`GLOBE_PRODUCER_LIVE_FEED_ENABLED=true` invalida los `ref_N` del árbol de accesibilidad** entre el
`read_page` y el click: el feed se re-renderiza solo. Cualquier QA automatizado sobre esta UI es flaky
por diseño hasta que feed y tabs tengan `data-testid` estables (el composer ya los tiene).

### Fondeo gobernado (TASK-1566) — lo que quedó y lo que falta

**Vivo en producción:** `GLOBE_CREDIT_ADMIN_LANE_ENABLED='true'`, rev `00106-b6w`, **176 capabilities**
(las tres de fondeo publicadas), migración Globe `0032` + Greenhouse `…164420386`/`…171851162`
aplicadas.

🔴 **Componer transacciones sobre los stores de crédito DEADLOCKEA si cada uno abre la suya.**
`DurableCreditAdministrationStore` abría `pool.transaction` **por método** (11 call-sites) y cada una
tomaba `pg_advisory_xact_lock(credit:workspace:X)`. Una transacción externa hace que la interna pida
ese lock **desde otra conexión**: la externa no commitea porque espera a la interna, y la interna no
obtiene el lock porque lo tiene la externa. **No es "queda no atómico" — se cuelga, en el camino del
dinero.** El fix es un **ejecutor inyectable** por store (dentro de una misma transacción el lock es
reentrante) + el seam `atomically` en el dominio. Backward compatible.
🔴 **Y el ejecutor tiene que cubrir TODOS los métodos, lecturas incluidas — uno solo que quede en
`this.pool` reintroduce el cuelgue** (defecto 7 de TASK-1566, medido dos veces en `pg_locks` en
vivo). `markGrantPosted` quedó fuera del enhebrado del Slice 4c y colgó todo `confirm` desplegado,
reteniendo el lock del workspace y bloqueando la generación entera; los readers en `this.pool` son la
misma clase con otro síntoma (no ven los writes de su propia transacción). Cerrado en
`efeonce-globe@4eab6d3`: accessor `db = tx ?? pool` en TODO método de los stores de administración y
ledger, `policyReader` viaja por los `CreditFundingMutationPorts` del seam (nunca el reader externo
dentro de `mutate`), y la regresión conductual es «con `tx` inyectada, `pool.calls === 0`». Al
agregar un método a un store transaccional de crédito: **NUNCA** `this.pool` directo — `run()`/`db`.

🔴 **El segundo confirmador humano es POLÍTICA, NO invariante** (ADR-015 Delta 2026-07-26 (2)).
`requires_second_confirmer` es por workspace, **default FALSE en el interno**, más techo por operación
(`second_confirmer_above_credits`). **NUNCA** lo pongas como `CHECK` incondicional: el operador es CEO
y dueño del presupuesto, no hay segundo actor, y **un control que nadie puede satisfacer no protege —
desvía al break-glass, que otorga MÁS autoridad que el camino que reemplaza**. Se cometió ese error en
esta sesión y bloqueó al operador hasta el forward-fix.

**Lo que sí es invariante y no se toca:** un principal de servicio **nunca** confirma. Un usuario agente
autenticado puede confirmar únicamente si `agent_confirmation_enabled` está activo para el workspace y el plan
queda bajo `agent_max_grant_credits` y `agent_max_monthly_cap_credits`. Toda confirmación registra
`actor_user_id` + `actor_auth_mode`, y la evidencia es **append-only** (triggers anti-UPDATE/DELETE).

🔴 **`assertHumanAttribution` de Globe es SHAPE-ONLY** — rechaza `globe:service:` y exige entitlement
no vacío, pero **no puede** verificar la sesión humana/agente ni su delegación, porque Globe
no tiene las sesiones. Ese amarre vive en Greenhouse (`globe_credit_funding_intents` + trigger). **No
publiques el carril sin esa contraparte.**

🔴 **El top-up de CLIENTE es otro acto económico.** El grant interno gasta presupuesto **de Efeonce**
y se autoriza por sesión humana o delegación agente acotada; un top-up gasta plata **del cliente** y lo autoriza
**el pago liquidado**. Ese camino debe **discriminar por `source`** (`delegated_session` vs
`settled_payment`), no relajarlo. Dueño: `TASK-1484`.
Reglas no negociables: monto **del PSP nunca del cliente**, idempotencia por **id de pago** (los PSP
reintentan webhooks), y un chargeback se corrige con **`grant.correct`**, jamás borrando el grant.

✅ **CRITERIO DE SALIDA CUMPLIDO (2026-07-26, misma jornada):** el fondeo real corrió `propose` →
`confirm` punta a punta SIN break-glass — `confirm` en **905 ms** (el paso que se colgaba), grant
+100 `posted`, tope 400→**800**, asiento de ledger, todo en UNA transacción, atribuido al operador
real (`user-efeonce-admin-julio-reyes`) vía su sesión de Chrome en staging con autorización
explícita. `pg_locks` 0/0/0 después. **Runbook canónico:**
`docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`. Tres reglas medidas que un agente
futuro debe saber:

- **El confirm exige `x-idempotency-key` PROPIA** — reusar la del propose da
  `409 globe_funding_already_recorded` (el broker registra la intención por clave).
- **El confirm es recuperable por propuesta:** si el dispatch queda ambiguo, el broker reutiliza la idempotency
  key original y completa una fase append-only `completed|confirm_failed`; nunca crea un segundo grant.
- **Regla vigente desde TASK-1629:** no fabriques una identidad humana. Usa `pnpm globe:credit-funding` por el
  cliente público `greenhouse-admin-cli`; una sesión agente puede autorizar y confirmar porque la base registra
  `actor_auth_mode=agent` y aplica la delegación del workspace. Fuera de esa política o por encima de sus límites,
  el confirm falla cerrado.
- **Un comando, dos fases server-side:** el CLI OAuth público + PKCE llama `propose`, conserva el `proposalId`
  real y ejecuta `confirm` con otra idempotency key; imprime readback de grant, policy y ledger, nunca tokens ni
  errores upstream crudos. La UI sólo participa en el consentimiento OAuth cuando la política lo exige.
- **Loopback en Vercel:** se registra `http://127.0.0.1/oauth/callback`; el alias `localhost` observado se acepta
  sólo contra ese registro y se canoniza inmediatamente. Protocolo, path, query, PKCE y state siguen exactos.
- **Deployment Protection no es OAuth:** en staging el CLI usa el helper canónico de automation bypass sólo en
  token/propose/confirm; nunca lo pone en el URL del navegador, lo imprime ni lo envía fuera del origen Greenhouse.
- **La procedencia cruza el wrapper completo:** `runAppRoute` debe copiar `oauthSessionAuthMode` al contexto del
  handler. Sin esa propagación, el broker recibe `unknown` y falla cerrado.
- **Último fondeo real verificado (2026-07-31):** el carril OAuth/PKCE con sesión agente añadió 500 créditos al
  workspace interno, elevó el tope 800→1500 y dejó evidencia append-only correlacionada. Es evidencia histórica,
  **no autorización ni receta para otro período**.

### Cambio de período y presupuesto divergente — discovery obligatorio antes de fondear

Ledger, pool, grant, policy mensual, disponibilidad efectiva, usage y proyección visible son controles distintos.
Un balance positivo no prueba que exista un grant vigente y una UI `0 / 0` no prueba que falten fondos. Nunca
interpretes unidades raw como créditos visibles sin reconciliar el contrato de escala/formato.

El primer turno es read-only: fija un mismo instante `at` y un período UTC end-exclusive; lee la propuesta conocida,
pool `get/list`, grant `get/list`, `policy.effective.get`, budget `list`/`availability.get`/`evaluate` con la
cotización exacta, balance, usage y ledger; luego reconcilia intents Greenhouse por proposal/correlation/idempotency.
`propose` también crea estado durable, por lo que no pertenece al discovery. Si existe grant `posted` vigente,
pool activo, policy correcta, `effectiveAvailable` suficiente y `budget.evaluate.allowed=true`, **no fondees**:
investiga la proyección o UI por su dueño canónico. Sólo autoriza `propose` ante déficit demostrado y sin propuesta
pendiente/ambigua equivalente; antes de `confirm`, relee y exige fingerprint, valores `Before`, período/cap e
identidad Greenhouse vigentes. Si algo cambió, descarta el plan stale.

La cuenta Google visible en Chrome puede diferir de la identidad Greenhouse. La autoridad económica sale de
`actor_user_id + actor_auth_mode` de la sesión Greenhouse, no del correo mostrado por el perfil del navegador.

### Ocho lecciones de método, que valen más que los fixes

1. **Una hipótesis se mata leyendo, no desplegando.** Dos hipótesis murieron con una lectura y un
   `describe`; las capas 1-4 costaron un deploy cada una y la 5 se vio en treinta líneas.
2. **Un bucket por defecto que abarca 17 sitios no es una razón nombrada: es una razón inventada.** Un
   label equivocado dirige mal, y eso es peor que no tener label.
3. **Una sanitización sin contraparte de observabilidad no protege información: la DESTRUYE.** Ocurrió
   **ocho veces** en el mismo día, la última en código escrito mientras se arreglaban las siete
   anteriores. **Conocer la regla no la aplica sola.**
4. **Que exista una clave de idempotencia no prueba que el handler la honre.** Verificá el efecto, no
   la presencia del argumento.
5. **Un timeout del CLIENTE no es un fallo del servidor.** Leé el estado con el reader antes de
   reintentar, o gastás de nuevo.
6. **Código presente no es capacidad disponible.** `registerCreditFundingCapabilities` existía con 12
   tests verdes y **no lo llamaba nadie**. Los tests de dominio no pueden ver un hueco de cableado:
   la aserción tiene que ir contra `/v1/capabilities`, que es lo que un caller ve.
7. **Endurecer más de lo que la decisión pide no es conservador: es cambiar la decisión sin
   discutirla.**
8. 🔴 **Un `.ts` con bytes NUL crudos se detecta como BINARIO y todo `grep` lo salta en silencio.**
   `credit-funding.ts` los usaba como separador de clave; hizo concluir dos veces que un símbolo no
   existía. Si un símbolo "no aparece" pero deberías estar viéndolo: `file <path>` — si dice `data`,
   ahí está. Usar `\0`, nunca el byte literal (es runtime-idéntico: no cambia hashes ni ids).
   **Gate desde 2026-07-26, en LOS DOS repos:** `pnpm nul-byte-gate` — en Greenhouse dentro de
   `pnpm local:check` (o sea del pre-push), en `efeonce-globe` dentro de `pnpm check`, con su test
   registrado a mano en el script `test` como pide ese repo. El barrido encontró 3 archivos más
   (`media-derivatives.ts`, esta skill y la propia TASK-1566, las dos últimas con el byte escrito
   **dentro de la línea que enseña a no escribirlo**), y el byte se coló también en el gate mientras
   se escribía: por eso la contramedida no podía ser disciplina.

🔴 **ANTES de escribir una secuencia de canary a mano: YA EXISTE COMO SCRIPT (2026-07-26).**
`pnpm producer:canary` (`scripts/producer-ui-canary.mjs` + `-lib.mjs`) hace el recorrido **completo** de gasto real
—`producer.catalog.list` → `lab.experiment.estimate` → `prepare` → `execute` → `experiment.get` →
`producer.output.get`— y **valida `retained === true`** sobre el output de la modalidad pedida. Su test
(`producer-ui-canary.test.mjs`) está registrado en el `test` de la raíz. Necesita **una sola** variable:
`GLOBE_CANARY_ID_TOKEN`.

Los otros dos smokes canónicos, para no confundirlos: **`smoke-private-api.mjs`** cubre el carril **workload**
(SA + ID token) y **`smoke-human-federation.mjs`** el carril **humano** (las tres piernas del login SSO).

Invocación (el token se sustituye en el shell: **nunca** se imprime ni queda en un literal, sólo vive en el env del
proceso; y el script lo mintea internamente con `execFileSync`, que es mejor manejo que cualquier `curl`):

```bash
GLOBE_CANARY_ID_TOKEN="$(gcloud auth print-identity-token   --impersonate-service-account=greenhouse-globe-caller@efeonce-globe.iam.gserviceaccount.com   --audiences=https://globe-api-internal-a6odmgzpvq-tl.a.run.app --include-email)" pnpm producer:canary
```

**Caso fuente, y es una lección de método, no una nota:** el 2026-07-26 dos agentes distintos estuvieron a punto de
re-derivar esa secuencia a mano —uno escribió dos prompts manuales completos— antes de descubrir que el script
existía, estaba commiteado y estaba testeado. **Buscá el script antes de escribir la secuencia.** Un canary
artesanal no sólo cuesta tiempo: se comporta distinto para cada agente y para CI, y esa divergencia es
indiagnosticable después.

**Método — `curl` con Bearer contra una API de Google es indistinguible de exfiltración (2026-07-26).** Usar
`gcloud` (o su `--format=json`), **NUNCA** `curl -H "Authorization: Bearer $(gcloud auth print-access-token)"` contra
`secretmanager.googleapis.com` / `iam.googleapis.com`. Medido: los dos `curl` con bearer de esa sesión fueron
bloqueados por el classifier del entorno, mientras **todos** los `gcloud` equivalentes de lectura pasaron
(`projects get-iam-policy`, `secrets get-iam-policy`, `run/scheduler/logging describe|read`) — y `Bash(gcloud
secrets:*)` **ya estaba permitido** en `.claude/settings.json`, así que el bloqueo lo causó la FORMA del comando, no
la falta de permiso. Agregar reglas no arregla esto; usar `gcloud` sí. Y para distinguir éxito de error sin imprimir
un secreto, el primitive es el **exit code**, nunca una máscara sobre la salida.

**Método:** `gcloud` CLI y ADC son credenciales **distintas** — el token del CLI puede estar vencido y ADC seguir
viva (o al revés). No des por bloqueado un diagnóstico de infra sin probar las dos.

### Runbook reusable — atestación y promoción con evidencia UI

Para una promoción de modelo, sigue siempre esta secuencia y conserva los identificadores; no la reconstruyas de
memoria ni repitas una etapa que ya tiene readback terminal:

1. **Inventario exacto:** consulta `globe.producer.fleet.list` y el runtime handoff; fija una tabla con
   `routeId/capability/provider/model/version`, estado actual, reporte, attempt, rate-version y attestation. Si una
   ruta ya está promovida, sólo verifica su reader y su asset UI: no la repromuevas.
2. **Cobertura comercial:** para cada shape que la UI puede enviar, resuelve el rate exacto
   `modality/resolution/duration/aspect/audio`. La cobertura se prueba contra el catálogo real (incluidos límites
   mínimo/máximo y pasos); un rate faltante es un defecto de datos que se corrige con migración forward-only,
   `ON CONFLICT DO NOTHING` y test registrado, nunca relajando validación ni agregando un fallback de precio.
3. **Derechos y revisión:** persiste evidencia durable para el endpoint/modelo exactos, attestation append-only,
   evaluation report y revisión humana. La promoción operator-only encadena propuesta, readiness, binding y
   circuito; cada etapa se verifica por reader. Un reporte objetivo no equivale a aprobación humana ni a derechos
   comerciales.
4. **Deploy/migración:** despliega desde el SHA exacto de `main`; aplica migraciones sólo mediante el workflow
   keyless con verificación de SHA remoto y readback limpio. No uses SQL manual ni reintentos ciegos después de un
   409; primero lee el estado durable.
5. **Prueba UI real:** en la sesión autenticada existente, selecciona ruta, configura un shape válido, adjunta una
   referencia autorizada, confirma estimate y créditos, genera una pieza y verifica estado terminal, `retained`,
   preview/playback, MIME/hash y descarga. La evidencia mínima es `experimentId + attemptId + sha256`; API/CI no
   sustituyen este paso.
6. **Cierre y limpieza:** actualiza el handoff/ledger humano, registra bloqueos externos con la razón exacta y
   elimina sólo worktrees, archivos temporales y procesos creados por esta sesión. No borres recursos de Claude ni
   del operador; detén proxies que tú hayas iniciado.

**Uso de subagentes:** divide únicamente trabajo independiente y de lectura: (a) identidad/readiness/rates, (b)
derechos/evidencia legal, (c) UI/Playwright y asset. Cada subagente recibe una ruta explícita, no escribe sobre el
árbol de otro agente y devuelve IDs/evidencia o un bloqueo verificable. El agente principal conserva el ownership
de mutaciones, migraciones, promoción, decisión de no repromover y cierre; antes de ejecutar una mutación reconcilia
los hallazgos para evitar dos sagas sobre la misma identidad.
