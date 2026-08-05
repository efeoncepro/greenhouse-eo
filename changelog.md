# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-08-05 — Growth SEO (EPIC-022): capabilities + entitlement per-org + chokepoint de costo (TASK-1301)

- 5 capabilities `growth.seo.*` seedeadas (catálogo + registry + grants; coverage verde) y módulo `seo_v1`
  en el catálogo del client portal (parity `data_sources` al union TS).
- Chokepoint único `enforceSeoRunEntitlement` per-org (tier/allowance/budget con env-knobs, consumer-agnóstico
  para UI/Nexa/MCP) verificado con smoke E2E contra PG real. Full suite 10076/0 + build prod verdes.

## 2026-08-05 — Growth SEO (EPIC-022): schema fundacional aplicado + mandato Full API Parity/MCP

- TASK-1299: migración `20260805134439202` aplicada en `greenhouse-pg-dev` — 8 tablas `seo_*` en
  `greenhouse_growth` (config + serie temporal append-only por `capture_date`), UNIQUEs de idempotencia,
  triggers anti-mutation, GRANTs least-privilege, `db.d.ts` regenerado. Smoke live verificado con rollback.
- Directiva del operador: todo el módulo SEO nace Full API Parity y usable por MCP. Se creó `TASK-1645`
  (lane ecosystem + MCP tools, espejo TASK-1086), exit criterion nuevo en EPIC-022 y DoD consumer-agnóstico
  en TASK-1301.

## 2026-08-05 — Agent Context Governance: la rotación respeta también el presupuesto de líneas

- Se corrigió `scripts/maintenance/rotate-handoff-context.mjs`: el plan de Handoff ahora conserva las sesiones más
  recientes hasta cumplir tanto el límite de sesiones como el límite de 600 líneas.
- Se agregó una prueba de regresión para el caso que rompía CI: 20 sesiones o menos, pero `Handoff.md` demasiado
  largo. La rotación canónica vuelve a resolver el warning que `docs:context-check:strict` reporta.

## 2026-08-05 — Registro maestro de partnerships y providers

- Se creó [`EFEONCE_PARTNERSHIP_REGISTRY_V1.md`](docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md) como fuente
  operativa para registrar estados, evidencia, owners y próximos pasos de Google Cloud, Claude, OpenAI, BytePlus,
  Runway, ElevenLabs, FLUX, AWS, Salesforce, HubSpot y demás relaciones.
- El refresh de Google Cloud corrige la interpretación comercial: Efeonce está registrada en Partner Network Hub,
  pero la due diligence sigue en curso, las rutas aparecen como `Registrado` y no hay aún un nivel Select/Premier/
  Diamond ni capacidad para crear oportunidades.
- Se documentó el plan de activación: Services/Co-sell como ruta principal, Artificial Intelligence como primera
  competencia, un pod interno pequeño, dos casos Google-ready y reventa con Ingram/Xvantage como carril paralelo.

## 2026-08-05 — Nexa: se retiró el modo "Compacto" (el chat viejo que sobrevivió al cutover)

- El selector "Modo de Nexa" queda en **Panel** (piso incondicional) y **Lateral**. El modo `dock`
  ("Compacto") era el panel efímero previo a TASK-1078 — runtime local, sin historial persistido — que
  quedó como opción del selector después de que el panel ampliable pasó a ser el comportamiento base.
- Salió también su código muerto en `NexaFloatingButton` (Drawer mobile / Card desktop / adapter local /
  auto-envío de semilla) y el flag de cutover `NEXA_FLOATING_EXPANDABLE_ENABLED` + su mirror
  `NEXT_PUBLIC_*`, cuyo único fallback era ese modo. **Env vars huérfanas en Vercel: pendiente borrarlas.**
- `coerceNexaInteractionMode('dock', …)` → `expandible`, así que ninguna preferencia legacy rompe el
  layout. Migración `20260805110418197`: filas `dock` → NULL + CHECK cerrado a `('expandible','lane')`,
  aplicado y verificado contra Cloud SQL (0 filas afectadas; ningún usuario estaba en ese modo).
- Hallazgo documentado como deuda: el `focusRef` + pregunta semilla de TASK-1182 vivía **solo** en el
  panel legacy, así que el CTA "Pregúntale a Nexa" ya estaba inoperante en producción antes del retiro
  (el modo default era `expandible`). Los CTAs siguen abriendo el chat; portar el ancla al runtime
  persistente queda pendiente.
- Gates: `pnpm local:check`, `pnpm test` (10.064 pass) y `pnpm build` verdes; menú verificado en runtime
  con Playwright (solo Panel/Lateral, switch a Lateral y vuelta con PATCH 200, cero errores de consola).

## 2026-08-04 — Globe: inventario de imagen por ruta para GPT Image 2, Seedream y Nano Banana

- La skill compartida `greenhouse-globe-model-fleet` ahora enlaza cuatro fichas machine-readable de imagen, espejadas
  para Codex y Claude: GPT Image 2, Seedream 5 Pro, Nano Banana 2 y Nano Banana Pro.
- “Imagen 2 de ChatGPT” quedó resuelto como OpenAI `gpt-image-2`; Google `imagen-2` no tiene routeId, adapter ni
  binding en Globe y no se documenta como integración.
- El runtime auditado conserva identidades separadas: Seedream T2I (`ref/still/rrss-v1`) por Fal está disponible;
  Seedream Edit (`ref/still/reference-v1`) tiene adapter/provider cableados pero el último reader readback lo devuelve
  `gated` por binding deshabilitado; Nano Banana Pro usa `gemini-3-pro-image` en `global`; Nano Banana 2 usa
  `gemini-3.1-flash-image` en `global`; GPT Image 2 usa `openai.gpt-image-2` con `poll`.
- Las fichas declaran capacidades de proveedor que todavía no son rutas públicas: edición multipart de OpenAI, edición/
  video-to-image de Nano Banana y Seedream 5 Lite. También conservan como blocker el circuito `not_found` de Nano
  Banana Pro. No cambió el runtime de Globe, secrets, bindings, rates, deploy ni disponibilidad; el reader sigue siendo
  la autoridad live.

## 2026-08-04 — Globe: la promoción de una ruta vuelve a poder sellarse (y el sello deja de quemar promociones)

- **Una promoción se moría con la evidencia perfecta** (`efeonce-globe@38c528d`). El último paso de la saga de
  ADR-009 —el canary que sella la promoción— devolvía `internal_error` 500 aunque la corrida, el intento, el output
  retenido y la decisión de governance estuvieran todos donde debían. Como `activated` no es terminal y la ventana
  vence, **cada promoción quedaba condenada a revertirse sola: 10 de 12 históricas terminaron `rolled_back`**,
  varias segundos después de su vencimiento. El diseño no se relajó; lo que faltaba era que su último paso pudiera
  ejecutarse.
- **La causa era de forma, no de datos.** El resolver del canary hace JOIN por linaje contra la vista
  `generated_asset_rights_authority_effective`, que proyectaba **3 columnas** mientras el consumidor usa **14**:
  PostgreSQL fallaba en **planificación** con `42703`, así que ningún dato podía salvarlo. La migración `0050` la
  lleva a **16 columnas** —todo el linaje más `rights_policy_purpose`— y la razón es de dominio: **una corrección
  corrige los DERECHOS, no el origen.** La tabla de correcciones no tiene columnas de linaje y tiene FK a la base,
  así que el linaje es invariante por construcción; el `UNION ALL` anterior lo perdía por accidente.
- **La migración committeada no arreglaba nada, y no se veía leyéndola.** Dos defectos fatales, hallados
  ejercitándola contra PG real dentro de una transacción con `ROLLBACK`: `CREATE OR REPLACE VIEW` **no puede
  reordenar ni renombrar** columnas (aborta con `42P16`, así que va `DROP` + `CREATE` sin `CASCADE`, re-otorgando
  los GRANT), y el runner de migraciones de Globe **ejecuta el archivo completo sin parsear markers**, de modo que
  la sección `-- Down Migration` re-creaba la vista rota tres líneas después de arreglarla — y habría quedado
  registrada como aplicada.
- **Reintentar el sello ya no quema una promoción.** El checkpoint `activated → verifying_canary` se escribía
  **antes** de leer la evidencia, que es una lectura pura; y de `verifying_canary` no se vuelve. Ahora se lee
  primero y el checkpoint cubre sólo el sello.
- **Un `DatabaseError` deja de ser un 500 opaco:** las clases de infraestructura (`08`, `40`, `53`, `55`, `57`) →
  `dependency_unavailable`; las deterministas (`42703`, `23505`, …) siguen en `internal_error`, **que es la
  verdad** — prometer reintento sobre un defecto de código manda a reintentar para siempre. Todo error de Postgres
  emite además su SQLSTATE en `globe.dispatch.database_error`.
- **La frontera consumidor↔schema queda cubierta por los dos lados**, probada en rojo y en verde: `consumidor ⊆
  contrato declarado` (test sin base, en cada `pnpm check`) y `contrato ⊆ vista real` (bloque `DO`, en cada apply),
  más un test en vivo opt-in que ejecuta la query real. El defecto vivía exactamente entre los dos gates.
- **Runtime: las dos rutas de video quedaron promovidas, selladas y habilitadas.**
  `ref/motion/reference-v1` (Gemini Omni Flash) quedó **`canary_passed`** — promoción sellada, binding habilitado,
  circuito cerrado. `ref/video/frames-v1` (Veo 3.1) también quedó **`canary_passed`** (revisión 9, terminal:
  ya no expira): canary con run `d2788195…`, attempt `68a75b70…`, output `sha256:3a49d5ba…`, governance
  `eligible` y **32 créditos reservados = 32 gastados**; salida 720p / 8 s / 16:9 / `silent` con `inputMode
  {kind:'frames', hasEndFrame:false}` y primer cuadro tomado de un output ya gobernado, declarado como
  `authorizedInputs` con `rights: internal-owned`.
- **El canary de Veo no se produjo desde la UI del Producer**, sino por el **carril gobernado**, con los commands
  canónicos del spine (`estimate` → `prepare` → `execute`). La UI sigue sin poder producirlo: el botón «Usar como
  referencia» del feed no despacha ningún command y sin referencia el estimado no se calcula; la subida ingesta
  pero Asset Governance falla en `inspecting` con la causa enmascarada. **Ambos bloqueos son ajenos a TASK-1641**
  y quedaron registrados aparte; ya no ponen en riesgo la promoción, pero **el Scope 1 de TASK-1641 —un canary de
  ruta arbitraria canónico y committeado— sigue pendiente**, y la generación desde el Producer para rutas con
  entrada obligatoria sigue bloqueada.

## 2026-08-04 — Globe: el inventario de video deja de mezclar modelos y variantes

- La skill compartida `greenhouse-globe-model-fleet` ahora enlaza fichas auditadas para Gemini Omni, Veo 3.1 y
  Seedance 2.0, además de FLUX 3; Codex y Claude reciben el mismo método y la misma separación de evidencias.
- La auditoría confirma que las rutas públicas de Seedance usan `seedance-2.0` (text-to-video) y
  `seedance-2.0-r2v` (R2V). `seedance-2.0-i2v` / `bytedance/seedance-2.0/mini/image-to-video` existe solo en
  el adapter Fal para `video-extend`, sin routeId público, binding gobernado ni canary de producción.
- La ruta sellada de Veo usa `veo-3.1-generate-001`; `veo-3.1-fast-generate-001` queda documentado como superficie
  Lab separada. Omni queda documentado como `gemini-omni-flash-preview` por Vertex Interactions, con sus límites de
  contrato actuales y sus superficies proveedoras diferidas.
- No cambió el runtime de Globe, el catálogo, los adapters, los secrets ni la disponibilidad. Las fichas son mapas de
  evidencia; `globe.producer.fleet.list` conserva la autoridad live.

## 2026-08-04 — Globe: skill compartida para integrar modelos por ruta

- **ADR-023 implementa `greenhouse-globe-model-fleet`** como skill espejada para Codex y Claude, con contrato de
  route cards, schema, validador determinista y gate de paridad. La primera ficha machine-readable es FLUX 3 Video.
- La ficha separa evidencia del proveedor, cables de integración y disponibilidad live; no crea catálogo, adapter,
  rate ledger ni promoción paralelos. FLUX 3 permanece gated y el runtime de Globe no fue modificado.

## 2026-08-04 — Globe: la captura de completitud tenía trece huecos y ningún contrato escrito

- **ADR-021 nace porque el contrato no existía.** Ningún doc de arquitectura mencionaba «webhook»: la captura de
  completitud vivía sólo en el código, y esa ausencia dejó acumular **13 defectos** sin que nadie los viera —
  tres terminaban en un asset **generado, facturado e irrecuperable**, y ninguno producía error visible.
- **Cada proveedor avisa distinto, y eso es la decisión**: Fal por webhook **por request**, OpenAI **no emite
  eventos de imagen** (su `poll` es correcto por diseño), Vertex sólo por operación de larga duración.
- **12 de 13 cerrados y desplegados**, verificados con una generación real (run `completed`, experimento
  `candidate_ready`, governance `eligible`). Queda D12, que ya no es pérdida sino ventana de latencia.
- **Convergencia terminal como invariante enumerable** (`TASK-1469`): 4 experimentos huérfanos → 0, y tres
  señales de outbox pasaron de imprimirse a mirarse. `outboxDeadLetter` **medía filas en vez de intentos** —
  decía 3 para uno.
- **Cierre documental**: ADR-021 + doc funcional + manual + dos runbooks + las dos skills espejadas y el overlay
  de arquitectura, donde se corrigieron **cuatro contradicciones activas**.
- **FLUX 3 queda documentado y gated:** Fal expone once endpoints activos (cinco estándar, cinco drafts y
  `draft-enhance`), mientras BFL mantiene el producto/API directo en Early Access. `TASK-1642` y su propuesta
  registran la discrepancia de namespace, keyframes, `duration: auto`, audio evidence, `draft_cache`, rates,
  rights, evaluación, canary y rollback; el runtime de Globe no fue modificado.

## 2026-08-04 — Globe Asset Governance: la latencia deja de multiplicarse por el cron

- **ISSUE-137 resuelto en runtime** con `efeonce-globe@d78ce01`: Terraform cambió
  `asset_governance_schedule` de `*/5` a `*/1`; plan/apply supervisados quedaron en `0 to destroy` y
  el Scheduler live en `southamerica-east1` lee `*/1 * * * * ENABLED`.
- Verificación post-arreglo sin gasto nuevo: el video durable terminó en `candidate_ready` en
  `473,958 s / 7,90 min`, governance en `183,780 s`, output retenido y settlement exacto de 16
  créditos. La imagen post-arreglo midió `472 s / 183 s`; la coincidencia entre modalidades confirma
  que el cuello era cadence-bound, no size-bound. El drain loop no se tocó.

## 2026-08-03 — Globe Producer: una corrida deja de morir esperando, y la pieza deja de quedar «generando»

- **Una corrida que espera a Asset Governance ya no se confunde con un fallo** (`deffbd4`, `bbbc9c1`; los tres
  runtimes en `d58bc6f`). El paso donde se verifica el output —C2PA, scan, elegibilidad— es una espera, no un
  error, y tres capas lo trataban como error hasta matarlo: el nombre real se borraba camino al genérico, el
  genérico caía en la clase «no clasificado» con tope 3, y al tercer intento la corrida moría **con el gasto ya
  hecho**. El caso medido: una imagen aceptada y cobrada (748 → 738 créditos) murió esperando algo que el día
  anterior había tardado doce entregas y terminado bien. Ahora la espera conserva su nombre, se reconoce como
  espera, y **abandonar después de cobrar exige más margen que abandonar antes** — que es una diferencia de
  plata, no de código.
- **Y vuelve a mirar en segundos en vez de minutos.** El backoff creciente existe para no martillar un sistema
  caído; governance no está caído, está trabajando. Aplicárselo sólo agregaba latencia **después** de que la
  pieza ya estaba lista: en la décima entrega el techo de 5 minutos la dejaba terminada y sin publicar todo ese
  rato. Una espera vuelve a mirar a los 10 segundos; un error conserva el backoff, que es donde sirve.
- **Una pieza cuya corrida muere ya no queda «generando» para siempre** (`bbbc9c1`). La corrida y el experimento
  son registros distintos y sus estados divergían: el sistema marcaba la corrida como fallida y nadie tocaba el
  experimento, que es lo que la pantalla lee. Ahora un cierre terminal cierra su experimento con el motivo real.
  No toca créditos a propósito: la liquidación ya decidió y meter dinero ahí arriesgaría un segundo movimiento.
- **El composer ya no reconstruye su paleta de comandos en cada tecla** (`011d0eb`, `ISSUE-136` resuelto).
  Escribir en el prompt encadenaba decenas de actualizaciones y React cortaba con su error #185 una vez por
  sesión. La pantalla respondía igual, así que ninguna verificación visual lo habría visto — **lo encontró el
  operador preguntando si alguien había abierto la UI**, tras cuatro despliegues declarados «verificados en
  runtime». El canary del composer ahora escucha la consola y escribe tecla por tecla; antes hacía las dos cosas
  mal y por eso no lo vio.
- Estado honesto: **las dos señales de salud de la outbox (`outboxDeadLetter`, `outboxRetryStorm`) se calculan en
  cada vuelta del worker y no las lee nada** — no hay métrica ni alerta que las consuma. Todo lo que se encontró
  hoy lo encontró un humano preguntando, no el sistema avisando. Es el próximo paso recomendado de `ISSUE-135`,
  que sigue abierto por eso.
- Los códigos de rechazo del contrato creativo de ruta y el rechazo sin cobro de un control no honrado quedaron
  registrados en la entrada siguiente de este mismo día; acá sólo se registra lo que ocurrió después.

## 2026-08-03 — Globe Producer: el contrato creativo de ruta empieza a aplicarse

- Cinco commits de Globe desplegados a producción y verificados contra la revisión activa (`8986b45`, `ac1999f`,
  `e300c4e`, `1b580f8`, `91d1f71`; API `00194-l4s` → `00197-f9z` y el worker con el digest de cada SHA).
  `pnpm check` + `pnpm build` en exit 0 en todos; `outboxDeadLetter` se mantuvo en 1 —el preexistente— y
  `retryStorm` en 0 después de cada despliegue, así que ningún rollout mató una corrida viva.
- **Cuando algo se rechaza, ahora dice qué lo rechazó** (`8986b45`). Un solo código del contrato de ruta colapsaba
  nueve causas con remedios opuestos —re-preparar, cambiar la operación, cambiar el asset, convertir el archivo— y
  se abre en ocho códigos propios. Media type y MIME quedan separados porque uno pide otro asset y el otro pide
  convertir el que ya tienes. La tabla de causas está probada en rojo y una aserción de unicidad impide la recaída.
  Es la décima aparición del bug class de `ISSUE-127`, cerrada.
- **Una corrida con un fallo determinista muere al primer intento** (`ac1999f`). De las 35 razones que el compiler
  sabe nombrar, sólo dos estaban clasificadas en la política de reintentos: las otras 33 gastaban tres entregas
  cada una en algo que jamás iba a cambiar. Quedan 38 `terminal`, 3 `transient` y 2 `unknown` con su razón
  declarada, y un test rompe el build si una razón nueva nace sin clasificar. El tope de `ISSUE-135` había estado
  escondiendo el defecto: tres reintentos no llaman la atención de nadie.
- **Duración, relación de aspecto y resolución dejan de ser controles creativos** (`e300c4e`, catálogo
  1.6.0 → 1.7.0, ADR-022 Delta (b)). Son forma de salida y su dueño ya era `RouteConstraintsV1`/`OutputShapeV1`;
  declararlas dos veces era duplicar el SSOT dentro del mismo contrato. Nace `valueShape` en el descriptor, que es
  lo que permite validar un control antes del gasto.
- **Un solo vocabulario de dirección creativa** (`1b580f8`). El brief pide y el contrato de ruta declara si se
  honra: los dos lados quedan alineados 1:1 (`light` → `lighting`, `framing` → `composition`, más los controles e
  ingredientes que sólo existían de un lado), con un test que impide que vuelvan a divergir.
- **Un pedido que la ruta no honra da error sin cobrar** (`91d1f71`, ADR-022 Delta (c), primera mitad). La
  compilación del prompt deja de ser un molde único: recibe el contrato de la ruta y rechaza antes del estimate y
  de la reserva. Pedir estilo en una operación de upscale antes generaba ignorando lo pedido y cobraba igual.
  Además el peso ordena la oración y ya no viaja al modelo como texto (`[weight=0.820]`), que un encoder de
  difusión lee como palabras y no condiciona.
- Estado honesto: **TASK-1633 sigue `in-progress`, con 10 de 17 criterios cerrados**. Falta el eje de aplicación
  por ruta —la compilación todavía no vive detrás del adapter y no existe `promptCompilerRevision` en ningún
  fingerprint—, el Slice 4 de rutas legacy y los mecanismos declarados con evidencia por proveedor. Los canaries de
  Omni siguen bloqueados por el transporte, que pertenece a `TASK-1504`; por eso el peso reordenado es una mejora
  razonada, no verificada.

## 2026-08-02 — Contrato route-driven del Producer y corrección planificada de Omni

- Se registró TASK-1633 como foundation backend-critical: operación, slots/roles de entrada, controles creativos,
  mecanismo `native-parameter|prompt-semantic|reference-conditioned|preprocessed|postprocessed|unsupported` y
  output contract pasan a ser dato versionado de ruta consumido por UI/BFF/SDK/MCP/CLI/workers.
- TASK-1504 quedó corregida documentalmente: Omni no demuestra `{video,audio}` separado, reference-to-video acepta
  imágenes, duración/ratio deben llegar a Vertex y text/image/reference requieren rutas/promociones independientes;
  edit/continuidad permanecen en TASK-1573.
- TASK-1552 conserva ownership único del composer: prompt persistente, referencias transversales, cámara separada
  de motion transfer y modelo estable. El rollout exige una generación UI nueva de Seedance y una Omni con cobro,
  playback, retención, lineage y governance verificados, sin repetir evaluación/promoción/fondeo de Seedance.
- TASK-1469 puede avanzar en paralelo con TASK-1633 y debe cerrar antes de TASK-1632; el wake event-driven queda
  explícitamente post-Omni estable/canary-confirm. No hubo código, provider calls, gasto, deploy ni runtime.
- La reserva provisional Finance `TASK-1633…1643` nunca se materializó; sus candidatas deben reenumerarse desde
  TASK-1634 si se confirman.

## 2026-08-02 — Cotización headless y composición opcional de Proposal Studio

- ADR-021 quedó aceptado: Finance Core nace con plan de cuentas versionado, entidad/ledger, períodos, money/FX/UF,
  dimensiones, eventos económicos y contratos de diario; Cost Subledger es la primera vertical y General
  Accounting extiende después la misma foundation. No se autorizó posting, migraciones ni sustitución de Nubox/SII.
- El ADR propuesto de cotización agentic define el límite headless: kernel determinista compartido,
  consumidores UI/Nexa/API/MCP/agentes y autonomía graduada sin bypass de identidad, approval ni auditoría.
- Proposal Studio distingue evaluación económica interna, versión de cotización, paquete económico congelado
  y proyección client-facing. Las propuestas pueden ser técnicas solas, económicas solas, separadas,
  combinadas o mixtas; cualquier monto embebido deriva del mismo SSOT económico.
- Se registraron como gaps —no como capacidad implementada— el `quote_id` universal post-GO, el snapshot
  parcial de cabecera, el cross-check económico y la proyección de render incompletos. La skill de licitaciones
  quedó alineada en Codex y Claude.
- El orden se corrige a Finance Core reference → Economic Event/journal shadow → Live Cost Subledger → Profile
  Resolution/CostCard/golden set → `TASK-609` read-only → economic package/Proposal → MCP/provider y writes
  gobernados → Q2C/actual-vs-standard → General Accounting. No hubo cambios de schema ni runtime.
- `EPIC-012` y `EPIC-029` registran 11 candidatos sin IDs reservados; tras asignar TASK-1633 a Globe deben
  reenumerarse desde TASK-1634 si superan el checkpoint de confirmación del task planner.
- En SKY se agregó una V2 técnica append-only enriquecida de 29 láminas con evidencia viva por enlace y estado local
  `workshop_only`; se recuperaron Stack Operativo, diagnóstico, escalera IA, informe, Content Hub, portal y prueba social.
  El primer borrador comprimido de 17 láminas se conserva como histórico; se construyó también la económica V2 separada: Core de **CLP 3.000.000 netos/mes sin IVA**,
  IVA 19% de **CLP 570.000** y total mensual con IVA de **CLP 3.570.000**, con newsletter incluida, Addons
  separados, deck `PricingFull` de 9 láminas y Excel generado. La validación de capacidad y margen sigue
  pendiente antes del registro productivo.
- Actualización 2026-08-03: Word queda únicamente como contexto del flujo actual en documentación interna;
  la técnica, la económica, ambos decks, el Excel y el correo proponen Notion/Content Hub para grilla, briefs,
  fuentes, comentarios, estados, QA, aprobaciones y ciclo de vida. Se recompusieron los decks, se regeneró el
  Excel desde su JSON fuente y la síntesis quedó en HubSpot como nota `114121518673` sobre el deal `62535094842`;
  no se alteraron la etapa ni el monto del deal. El cierre sigue `workshop_only`.

## 2026-08-02 — Gemini Omni: evidencia legal corregida y checkpoint durable

- Globe `62337b483` quedó en `main` con driver gobernado y simetría de configuración/secret/IAM entre API y
  Producer worker para `ref/motion/reference-v1 / vertex-omni / gemini-omni-flash-preview / preview`; CI
  `30743786928` terminó verde.
- Globe `fa286dbd` corrigió la idempotencia de `auto-promote` para incorporar la atestación/policy sin duplicar la
  route revision; CI `30744034457` terminó verde. API `30744857697` y worker `30744857698` quedaron desplegados;
  OpenTofu aplicó `1 add, 2 change, 0 destroy`, sin deploy de Studio.
- `auto-promote` `30745031010`, policy reader `30745219391` y la saga
  `promotion_922157fa-b708-45cc-8bbf-b08d761afb21` terminaron correctamente. La policy
  `arp_8090d31ae570c016f84cad0f7aee09ba84578f1dbd3622074a38cfa03a839ff5` conserva la atestación corregida,
  `no-sublicense` y el digest de términos exacto; los readbacks finales reconciliaron saga `activated` rev. 7,
  readiness promovido, route rev. 7, binding habilitado y circuito cerrado.
- El candidato de evaluación retenido no se reutilizó como canary productivo.
- La atestación anterior declaraba sublicencia y términos genéricos incorrectos. El Producer autenticado firmó
  una nueva atestación inmutable con uso comercial/entrega permitidos, sublicencia denegada y digest exacto
  `sha256:04e949c5…e53d4b`. El Producer sigue mostrando 784 créditos y el modelo exacto, pero `Elementos` está
  deshabilitado en dos pestañas con `Todavía no hay un modelo publicado para este modo`; no se ejecutó gasto,
  run, output ni `canary-confirm`. Queda pendiente una única ejecución cuando la superficie gobernada lo exponga.
- TASK-1632 permanece separada y `to-do`: formaliza dentro de Globe el wake event-driven desde completion del
  proveedor hasta Asset Governance; no es un handoff Greenhouse ni reabre TASK-1614.

## 2026-08-02 — Cierres canónicos: TASK-1614 y Proposal Studio

- Se agregó `proposal-studio.json` al workspace scaffoldeado y `pnpm tender:canonical-gate <slug>` como gate
  fail-closed: `deck:compose`/`.captures` se reconocen como taller, no como cierre productivo.
- El gate exige Proposal registrada con actor humano, `ResolvedCompositionManifest` usado por un render job,
  PDF/previews versionados en el asset store, vínculo `proposal_assets` y verificación autenticada en Portal/API.
- `pnpm qa:gates --changed` detecta el workspace modificado y reporta `BLOCK` si la cadena no está completa.
  Brightcell quedó registrada honestamente como `workshop_only`; no se mutó runtime ni se creó una Proposal.
- TASK-1614 quedó `complete` tras un canary único de Seedance R2V: run `bbe6dfff…`, output MP4
  `sha256:93adbf46…`, 16 créditos, playback/governance verificados y saga `promotion_557d…` en `canary_passed` rev. 9
  (`30742268557`).

## 2026-08-01 — Cierre de WIP documental y comercial

- Se registraron ADR-019 (evaluación asíncrona durable de Globe, Accepted e implementada) y ADR-020 (export a
  Salesforce Marketing Cloud Content Builder, Proposed y sin autorización runtime), ambos enlazados desde los
  índices canónicos.
- Brightcell LIC-95 quedó consistente: implementación única + tres paquetes mensuales, propuesta/deck económico
  separados, IVA explícito, HubSpot Free acotado y gate de Finance. El Composer produjo 9 láminas y todas fueron
  revisadas visualmente sin recortes antes del cierre.
- Polpaico LIC-6533 quedó clasificada como discovery interno en HOLD/NO-BID provisional. Se retiró el stub
  económico renderizable de monto cero, se corrigieron referencias a decks inexistentes y se minimizaron enlaces
  profundos/identificadores personales; no se emitió ni envió una oferta.

## 2026-08-01 — Studio Credits operativo por UI y OAuth PKCE

- Greenhouse `develop` y Globe `main` quedaron desplegados con migraciones y OAuth activos. La operación live
  `23db5b0e-89dd-4661-9b8d-c12f9be4ad7a` aseguró 800 créditos efectivos sobre cap 1500 mediante un único acto
  atribuido, sin segundo confirmante obligatorio ni break-glass.
- `ensure-funded` crea o reutiliza el pool mensual determinístico dentro de la misma transacción económica. La UI
  Greenhouse, el CLI OAuth PKCE y Producer devolvieron 800 efectivos, funding 800, cap/remaining 1500 y cero
  blockers. ISSUE-124 pasó a resolved.
- Globe conserva `main` como rama predeterminada/integración/release; Greenhouse permanece en `develop`. No se
  creó ningún worktree ni se ejecutó un release completo de Greenhouse. El contrato quedó endurecido en el
  `AGENTS.md` y CI de Globe, el proceso/template/planners de tasks y las 97 tasks activas de EPIC-028; el helper
  histórico de sincronización de worktrees quedó retirado fail-closed, pre-commit dejó de crear stashes temporales
  y el harness Codex ahora detecta regresiones.
- El worker de expiry quedó promovido desde Globe `main` con scheduler minutely, flag y observabilidad activos.
  El digest `sha256:d8295862…bae9` pasó deploy exacto, canary y OpenTofu sin drift. Dos holds históricos
  `submission_unknown` se reconcilian/difieren con `failed=0`; no se liberan a ciegas.

## 2026-08-01 — Studio Credits: workbench y self-view desplegados

- TASK-1483 agrega proyecciones fail-closed de pools, grants, budgets, forecast, alertas y ledger, contexto de
  audience/período/freshness, preview antes del ensure y evidencia navegable sin duplicar lógica económica.
- TASK-1628 endurece el self-status con coverage/freshness, aislamiento del daily fence, loading/retry/last-good
  stale, ARIA/foco/click-away y cifra efectiva visible en mobile.
- Pasaron GVC premium desktop/mobile para el workbench, su drawer mobile y Producer (14 frames), además de
  teclado, reduced motion, accesibilidad, overflow y runtime. Greenhouse `f899d951b` quedó Ready en staging y
  Globe `e31518b430b8` desplegó API/Studio con SHA exacto y tráfico 100 %.
- El smoke Chrome autenticado confirmó ambas superficies, readback 800/800/1500/0/0, daily fence 500/120/380 y
  cero errores de consola. Fue sólo lectura: no hubo nuevo fondeo, release completo de Greenhouse ni worktree.

## 2026-08-01 — Operación multiagente: checkout compartido único

- Se retiraron dos worktrees temporales de MCP creados incorrectamente y se prohibieron los worktrees, checkouts
  aislados y carpetas clonadas como workaround operativo. Ante WIP, conflictos o divergencias, los agentes deben
  preservar el checkout compartido y pedir dirección al operador.
- El contrato se canonizó en `REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`, con routers, prompts, skills y la
  memoria global de Claude alineados; el modelo histórico de worktrees quedó explícitamente superseded.
- Globe ADR-018 queda actualizado como dirección **continuity-first y native-first para Android/iOS**: React Native +
  Expo development builds/CNG para la companion, web/PWA como fallback, desktop para composición profunda y Globe
  cloud como autoridad. El vertical slice debe validar PKCE, deep links, captura, upload interrumpible, push
  reconciliable, handoff y compatibilidad binary/API; la skill existente `greenhouse-globe`, los docs
  funcional/manual y Handoff contienen las invariantes. No hay app publicada ni cambios de runtime, flags, auth,
  push, billing, créditos, providers, distribución ni rollout externo.

## 2026-08-01 — TASK-1630: convergencia del control plane de créditos de Globe

- Se registró `TASK-1630` como umbrella P0 y se rebaselinaron TASK-1468/1482/1483/1586/1628/1629 contra el runtime
  observado: ledger histórico, funding vigente, caps/holds y operaciones de fondeo dejan de tratarse como una sola
  cifra implícita.
- La secuencia queda fijada como truth/ensure-funded → holds/expiry/settlement → lifecycle/status/recovery →
  autoridad one-shot + adapters one-command → workbench Greenhouse → self-view Producer → paridad
  MCP/comercial. Globe conserva la máquina de estados económica; Greenhouse sólo proyecta/adapta.
- ADR-015 ahora aprueba que una instrucción atribuida del CEO pueda autorizar una operación acotada y que el
  mismo agente autenticado puede proponer y confirmar end-to-end cuando la política del workspace no exige segundo
  confirmante. La autoridad one-shot y sus carriles `oauth|browser` están desplegados y verificados live para el
  workspace interno; clientes externos y fondeo comercial siguen gated.
- La primera corrección ejecutable ya cierra el aislamiento de workspace: API Platform conserva los bindings
  emitidos por OAuth y tanto el bearer como las rutas admin rechazan un `globeWorkspaceId` no vinculado antes de
  invocar el broker. No hubo fondeo, deploy, migración, release ni promoción a `main`.
- El workbench Greenhouse conecta `Asegurar capacidad` a la misma state machine one-shot y agrega recovery
  readback-first para `outcome_unknown`; TASK-1483 y TASK-1628 cerraron rollout y smoke live.
- TASK-1630 cerró live: MCP `globe.credits.funding.ensure` pasó OAuth/Entra + WIF + RFC 8693 + Greenhouse command;
  los dos outcomes antiguos liberaron 14+16 mediante decisions Finance gobernadas; los 500.000 se conservaron
  append-only y se retiraron de toda proyección operativa UI/API/CLI/MCP.
- La documentación funcional y el manual quedaron reconciliados con el sistema live: UI recomendada, paridad
  API/CLI/MCP sobre un solo ledger, autoridad CEO one-shot, `ensure` readback-first y saldo posterior a Seedance
  `800 → 784` bajo cap 1500. Studio Credits no se presentan como dinero, revenue ni tokens de proveedor.

## 2026-08-01 — Efeonce MCP: Globe fleet reader end-to-end

- Se habilitó únicamente `globe.producer.fleet.list`: el gateway llama el reader canónico `POST /v1/readers`,
  sin importar base de datos, storage ni SDKs de proveedor. La respuesta conserva rutas de disponibilidad pero no
  house, provider slug, costo de vendor ni margen.
- Studio Credits reutiliza este mismo gateway mediante el write interno one-shot `globe.credits.funding.ensure`;
  no se creó otro MCP. El acceso de clientes externos continúa gated por identidad B2B/multitenant.
- Globe `#84` (`001ce1b`) quedó desplegado como `globe-api-internal-00179-qcz`; el gateway `ce593f2` como
  `efeonce-mcp-gateway-00009-9c6`, ambos con tráfico 100%. El canary Entra PKCE real pasó initialize, discovery
  y la tool de fleet por `https://mcp.efeonce.org/mcp`.
- El principal downstream tiene exclusivamente `globe.producer.catalog.read` y el binding
  `greenhouse-org:efeonce`. No se habilitaron writes, runs, assets, review, delivery, créditos ni reveal-house.
- El gateway limita inicialmente Cloud Run a `concurrency=80` y `maxScale=5` efectivo. Clientes externos siguen
  bloqueados: el cliente interno Entra emite ambos scopes incluso cuando solicita el base, por lo que falta
  separar asignación/consentimiento de entitlements y repetir el deny con identidad base-only.
- La skill espejo `efeonce-mcp-platform` y sus matrices de verificación ahora codifican esa excepción internal-only
  y exigen evidencia real de entitlement/revocación base-only antes de cualquier rollout B2B.
- La decisión de identidad cliente y `TASK-1631` aclaran la relación con el login Greenhouse: los runtimes,
  cookies, sesiones y audiencias permanecen separados, pero un cliente existente se enlaza al mismo
  `identity_profile` y Account 360. La coexistencia inicial debe converger después al mismo plano externo de
  autenticación; no se permite una segunda identidad o contraseña permanente. La revisión ahora documenta que
  Greenhouse ya tiene NextAuth + broker OAuth sister-platform reutilizable, pero todavía no un authorization server
  MCP público: TASK-1631 compara WorkOS, broker extraído independientemente a `auth.efeonce.org` y hybrid, sin
  compartir cookie/`NEXTAUTH_SECRET` ni hacer que un release Greenhouse sea el rollback de OAuth externo.
- Las skills de arquitectura globales y locales (`arch-architect` de Claude y `software-architect-2026` de Codex)
  ahora cargan el router MCP, el provider dueño y este mismo gate antes de proponer otra tool, OAuth surface o
  binding cross-runtime.

## 2026-08-01 — Efeonce MCP: gateway independiente, OAuth Entra y front door

- Se creó `efeoncepro/efeonce-mcp` como repo privado independiente con Node 24, TypeScript, Fastify, SDK MCP
  v2, CI, container no-root, OpenTofu y delivery keyless por GitHub WIF. El PR `#2` quedó fusionado a `main`
  en `d9c0c69` con CI verde.
- El gateway corre en Cloud Run `efeonce-group/southamerica-west1`; un canary Entra authorization code + PKCE
  validó resource, issuer, audience y scope reales: initialize `200` y Globe sin scope `403`.
- Se promovió el Global External ALB sobre `34.111.78.237`; Cloud Run acepta sólo tráfico del load balancer y
  `mcp.efeonce.org` ya resuelve desde HostGator y resolvers públicos. El certificado administrado quedó `ACTIVE`;
  health/discovery OAuth respondieron `200` y `/mcp` anónimo rechazó `401` como corresponde.
- Globe ya tiene su primer reader operativo; el resto de capabilities y cualquier write permanece fuera del
  gateway hasta sus gates propios. El gateway no importa lógica, DB, storage ni credenciales de Globe.
- Se incorporó la skill espejo `efeonce-mcp-platform` para Codex y Claude: enruta gateway, OAuth, edge e
  integración de providers hacia las skills dueñas, y mantiene una verificación mecánica de paridad.

## 2026-08-01 — Globe: recuperación del source of truth OAuth/PKCE y evaluación durable

- Se reconstruyó sobre `develop` el código preservado del Admin CLI OAuth público + PKCE, las rutas API Platform,
  la procedencia autenticada y la recuperación idempotente de fondeo, sin repetir ninguna mutación de runtime.
- El trabajo administrativo que usó históricamente `TASK-1616` se renumeró a `TASK-1629` para no colisionar con
  MiniMax H3. Las migraciones ya aplicadas conservan sus nombres históricos `task-1616-*`.
- Se reconciliaron los checkpoints de TASK-1614 sobre evaluación durable, lineage/rights, recuperación sistémica
  y el requisito de un canary nuevo desde Producer; el candidato retenido no sustituye esa prueba.
- Actualización 2026-08-02: 16 créditos dieron `allowed=true`, 800 efectivos y cero blockers, sin fondeo ni cambio
  de policy. La saga expirada se recuperó fail-closed y `promotion_557d4df1-994e-45ac-92f7-7ef885aa967e` quedó
  activada con binding/circuit revision 5.
- El canary no se disparó: el Studio live oculta referencias posteriores a la octava. Globe `main` `595f0cb`
  elimina el recorte y prueba la décima referencia con rights/lineage e idempotencia; tests y CI
  `30733665167` verdes, deploy manual no ejecutado. Reader `30733996145` confirmó saga rev 7 activa hasta
  `2026-08-02T10:54:43.570Z` y Chrome volvió a medir ocho referencias live, sin generar. TASK-1614 sigue
  `in-progress`, rollout pendiente.

## 2026-08-01 — AXIS Lab: Astro 7 con foundation documental y testing

- `axis-design-system/apps/lab` dejó Vite vanilla y ahora usa Astro `7.1.6` con salida estática para Vercel,
  Content Loader, rutas por pattern, MDX, sitemap/SEO, Vitest y Playwright desktop/mobile.
- La referencia se genera desde tokens/registry publicados; conserva HTML/CSS y un script vanilla mínimo,
  sin adapters de Greenhouse/Globe, Actions ni SSR.
- Se actualizaron la task `TASK-1590`, las skills AXIS, la arquitectura, el runbook y el handoff. Fixtures
  visuales completos por contrato siguen pendientes.
- Rollout público completado en `axis-design-system-lab.vercel.app`; el primer slice Greenhouse `colors`
  ya tiene referencia token-backed en `/references/colors/` y su inventario de migración quedó documentado.

## 2026-08-01 — Globe Producer: pie de la aplicación, paginación del feed y seis defectos de superficie

- El **pie de la aplicación volvió al Producer**: el port a React había perdido el `.producer-footer` del payload legacy y con él el wordmark de Efeonce. Se trajo `efeonce-positive.svg` desde `public/branding/logo-full.svg` como par exacto del negativo (mismo `viewBox` y trazados, sólo cambia la tinta) y se registró en el allowlist de `assets.ts` y en `PROVENANCE.md`; el logo cambia de tinta con el tema, que es tematizable desde TASK-1613.
- El **feed puede volver hacia atrás**. El backend paginaba por cursor keyset desde TASK-1525 y el cliente ignoraba el `nextCursor`, así que el histórico era inalcanzable. Verificado en vivo: 25 → 50 piezas. Se descartó scroll infinito (vuelve inalcanzable el pie y mueve el contenido bajo el cursor con piezas generándose) y páginas numeradas (offset es incorrecto cuando entran items por arriba).
- El **anillo de créditos mide el ciclo y no el stock**: con 500.836 de 501.110 el arco de consumo medía 0,197° de 360 — invisible por física. El glifo pasó de `sparkles` (el genérico de IA) a `flame`. Mientras el período no tenga tope asignado el aro queda **neutro** en vez de inventar un denominador.
- Además: barra del documento tokenizada y `scroll-behavior: smooth`, barra del composer que se revela en hover, `⌘K` como una unidad, y los controles de selección de las cards centrados y apagados honestamente hasta que el compare se porte desde el legacy.
- Lecciones registradas en la skill `greenhouse-globe` y en el `Delta 2026-08-01` de TASK-1559: el `padding` que el UA da a todo `<button>` sin preflight (rompe sólo bajo 29 px de caja), `margin:auto` + `flex-wrap`, que `space-between` reparte hijos, y que un velo por alfa no es un hueco.

## 2026-07-31 — GitHub Actions: presupuesto mensual de la organización actualizado

- Con confirmación humana y método de pago verificado, el presupuesto externo de Actions de `efeoncepro` pasó de USD 0 a **USD 20 mensuales**; `Stop usage when budget limit is reached` y las alertas permanecen activados. La evidencia y el procedimiento están en [`cloud-cost-intelligence-finops.md`](docs/documentation/operations/cloud-cost-intelligence-finops.md) y [`github-actions-budget.md`](docs/manual-de-uso/operations/github-actions-budget.md).

## 2026-07-31 — Brightcell: segunda licitación con Artifact Composer y método reusable

- Se documentó Brightcell como el segundo caso de licitación armado con Artifact Composer y catálogo de plantillas, después de SKY.
- Se consolidó el flujo reusable `intake/evidencia → narrativa → deck-plan → assets/mockups → composición → auditoría visual → validación`.
- Se reforzaron las skills de licitaciones, deck-studio, SEO/AEO, diseño e imagen con las lecciones de Grader/X-Ray/Greenhouse, mockups honestos, assets extraíbles y protección de decks previos.
- La salida client-facing queda separada de investigación, métricas ilustrativas, manifiestos vacíos y archivos `-INTERNO`.

## 2026-07-31 — Globe: modo claro en producción, y dos defectos que sólo aparecieron mirando

- **Cuatro PRs mergeados y desplegados** en `efeonce-globe`: #8 (modo claro + consolidación del `:root`),
  #15 (todo paquete compila antes de testear + gate), #25 (el lecho de las piezas deja el azul del
  prototipo) y #27 (scrims y escenario). Revisión activa `00122-lwd`. Verificado visualmente por el operador.
- 🔴 **Dos defectos llegaron a producción y ni la suite ni el barrido de contraste los vieron**, y los dos
  venían de lo mismo: **tratar como superficie algo que no lo es**.
  - Los **scrims** voltearon con el modo y en claro pasaron a `#eceaf1`. Un scrim claro deja de ser un
    scrim: existe para que el texto blanco se lea sobre un medio **arbitrario**, y el medio es arbitrario
    en los dos modos. El título de la pieza destacada quedó blanco sobre casi blanco. El barrido declara
    los gradientes «no medibles» a propósito —para no inventar fallos— y el defecto cayó en ese hueco.
  - El **escenario** de la pieza tampoco es superficie. Hoy es el mismo magenta en ambos modos, lo que
    además le deja al producto una sola identidad.
- **Lección que se repitió tres veces en el día:** se declaró «presencia equivalente» midiendo el PASO de
  la rampa contra el canvas. Esa medición era del **token, no de lo que renderiza** — ignoraba la
  composición por alfa. *Un número sobre el token no describe el píxel.* Los tres defectos aparecieron
  **mirando**, no testeando.
- **ADR-017 v2.1** canoniza los dos invariantes nuevos (§6 «Lo que NO voltea con el modo» y §7 «La familia
  del escenario es magenta») y generaliza el hallazgo: **una receta que fabrica color en runtime es un
  literal con disfraz** que ningún drift guard de literales puede ver.
- ✅ **Drift cerrado el mismo día.** `axis-tokens@0.2.4` porta las **tres** familias de acento, leídas del
  archivo de Figma en alta resolución (en baja, `#f1d1dd` se lee como `#f101dd`). Globe consume
  `axisAccentRamp.magenta` y borró su copia; el valor servido quedó **byte-identical**. `TASK-1615`
  cerrada. Los nueve pasos de orchid ya en el paquete coincidían **exactamente** con el archivo — cero
  drift ahí, lo que valida el método de lectura.
- **Queda abierto para diseño:** si coral y magenta merecen rol (coral está a **14°** del rojo de
  `danger`), y si scrim/escenario se canoniza en AXIS como grupo **sin variante por modo** — que la firma
  del token impida el error, en vez de un comentario que pida no cometerlo.

## 2026-07-31 — Globe: modo claro promovido (entrada previa del mismo día)

- **El modo claro está en producción.** PR #8 mergeado (`f3357d2`) y desplegado en `globe-studio-internal`
  rev `00118-cfh`; el guardrail del propio workflow confirma que la imagen se construyó desde ese SHA.
  Falta sólo la verificación visual del operador — la superficie está tras SSO.
- **El lecho de las piezas** (PR #25) retira el último sobreviviente de la paleta jubilada: una función
  que derivaba un tono del id de cada pieza, con su ventana anclada al cian `#4db8ff` que ADR-017 v2.0
  retiró. Ningún guard podía verlo — no hay azul *escrito*, hay una receta que lo fabrica en runtime.
  Ahora es un token, con familia **magenta** elegida por medición: orchid no está libre (es el acento) y
  coral está a 14° del rojo de error.
- **Todo paquete que compila, compila antes de testear** (PR #15). Ocho de diez tenían el agujero, y el
  `test` raíz construía al consumidor antes que a sus dependencias — desde un `dist` limpio nunca
  funcionó. Gate nuevo para que el paquete once no pueda olvidarlo.
- 🔴 **Drift encontrado:** AXIS declara **tres** familias de acento para Globe (Coral, Magenta, Orchid) y
  **sólo orchid llegó al código**. `TASK-1615` lo cierra; mientras tanto la rampa magenta vive local en
  Globe como deuda declarada, no como drift silencioso.

## 2026-07-31 — Globe: modo claro con interruptor de apariencia (TASK-1613)

- Interruptor en el menú de cuenta del Producer. El tema es **un bloque de override** sobre las claves
  del `@theme` (31 de 198 tokens), habilitado por `TASK-1612`. El modo oscuro no se movió ni un hex.
- 🔴 **El tematizado es opt-in por superficie** (`ShellOptions.themable`, default `false`). El share
  board —donde el cliente ve la pieza— heredaba el modo del `localStorage` sin tener interruptor propio.
  No se veía mal: se veía bien en claro, y por eso ningún barrido de contraste lo habría encontrado.
- Cerró 2 regresiones de contraste medidas **contra control**: `--success` usado como texto (2,54:1) y
  el interruptor propio (4,2:1). AXIS 0.2.3 separa fill de tinta (`axisBrandSemanticInk`).
- El isotipo pasa a servirse como máscara: el SVG es monocromo, así que su color no es la marca sino una
  decisión de render; en negativo sobre canvas claro era blanco sobre blanco.
- Barrido de contraste nuevo, con veredicto comparativo: falla sólo si el claro introduce un fallo que
  el oscuro no tiene. Quedan 14 textos que fallan en **ambos** modos (`--faint` a 40% de alpha) — deuda
  preexistente, no de este cambio.
- `@efeoncepro/axis-tokens@0.2.3` publicada y el pin de Globe subido. PR en `efeonce-globe`: [#8](https://github.com/efeoncepro/efeonce-globe/pull/8), pendiente de revisión humana.

## 2026-07-31 — Globe: el `:root` del payload cliente proyecta sobre el `@theme` (TASK-1612)

- El payload emitía sus custom properties desde dos mecanismos con nombres distintos (`--canvas` en el
  `:root` del shell, `--color-canvas` en el `@theme` del bundle), así que no podía re-tematizarse: mover
  uno no movía al otro y un tema alternativo habría exigido cada override dos veces. Hoy cada hoja
  renombrada se emite como `--canvas: var(--color-canvas, #25293c)` y un solo override mueve la utilidad
  y el CSS plano a la vez. Es el paso previo que ADR-017 fijaba para cualquier modo claro; **no decide
  ningún valor** y su criterio de éxito era cero cambio visual.
- **Cero cambio visual, medido contra control.** El diff por bytes resultó inválido —el arnés de captura
  no es determinista—; por píxeles, toda diferencia aparece igual o mayor en un control de dos corridas
  del mismo código, y `globe-theme.generated.css` quedó byte-identical.
- No se proyectan los namespaces passthrough ni las que ya derivan, y las dos exclusiones salen de medición:
  proyectar `--text-xs` emite `var(--text-xs, …)` —referencia circular— y reprodujo el incidente de ADR-016
  con los mismos números **con los tests unitarios en verde**; sólo el canario de browser lo vio.
- Instrumentos nuevos, los dos verificados poniéndolos rojo: `gates/root-theme-equivalence.test.ts`
  (compara por clave; su primera versión comparaba valores y dejaba pasar una utilidad borrada) y
  `scripts/legacy-fallback-canary.mjs` (renderiza el `:root` sin Tailwind, la condición de las superficies
  legacy, y mide el payoff del override único).
- ADR-016 y ADR-017 quedaron reescritos en el cuerpo: la consecuencia que declaraban aceptada está cerrada.

## 2026-07-30 — Globe: documentación y skills sincronizadas con seis rutas de imagen

- Se reconciliaron ADR-013, EPIC-028, el barrido WIP, task activa, documentación funcional, manuales, ledger,
  runtime handoff y evidencia con las promociones reales de Seedream, Nano Banana Pro/2, GPT Image 2/1.5 y Recraft.
- Las skills gemelas `greenhouse-globe` y `greenhouse-ai-creative-rights-governance` incorporan identidad exacta,
  atestación/política inmutable, promoción distinta de delivery, diagnósticos seguros y canary real desde UI.
- El caso Recraft queda como regla reusable: `application/octet-stream` sólo se admite para una salida SVG esperada
  después de validar bytes; el asset se sirve con CSP sandbox. No se amplió la allowlist MIME global.
- No hubo mutaciones de runtime. `TASK-1553` sigue abierta sólo por receipts cross-task de `TASK-1468`/`TASK-1578`.

## 2026-07-30 — Globe: Recraft v4.1 promovido y probado desde Producer

- `ref/still/vector-v1` quedó disponible con evaluación, revisión humana, derechos, rate de 4 créditos,
  binding, readiness y circuito gobernados.
- La generación real desde la UI autenticada es `b5631c86-707a-41d9-8ecc-ef61caa8200c`; terminó
  `completed/retained` y el Producer muestra el SVG, `Listo`, `Guardada` y descarga habilitada.
- El smoke detectó que Fal transporta el SVG como `application/octet-stream`. Globe `84d6a8e`
  admite esa combinación sólo para la salida SVG esperada, verifica los bytes y añade CSP sandbox.
- Worker, API y Studio se desplegaron con éxito. La flota de imagen queda en seis rutas ejercitadas;
  TASK-1553 sigue `in-progress` sólo por los receipts transversales TASK-1468/TASK-1578.

## 2026-07-30 — AI Creative Rights & Enterprise Governance

- Se creó la skill canónica `.codex/skills/greenhouse-ai-creative-rights-governance/` con companion Claude y referencias para enterprise rights framework, provider vetting y contrato/consentimiento.
- Se incorporaron gates para inputs, planes comerciales, provenance, voz/likeness, música, disclosure, indemnidad, rights pack y estados de release.
- Se sincronizaron `AGENTS.md`, `CLAUDE.md`, `project_context.md`, `Handoff.md` y `docs/operations/agent-context-router.json`.
- La skill no autoriza claims legales ni venta automática: cláusulas, indemnidad y jurisdicciones requieren `legal-privacy-ip-operator`/Legal.
- Se añadió la decisión propuesta [`GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1`](docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md): no-training, retention, zero-retention, no human access, residency, isolation, subprocesadores, deletion y AI Data Protection Pack quedan separados y sujetos a evidencia por ruta.
- Se sincronizaron Creative Services, Creative Studio/Globe, el manual de pilotos AI, Legal/IP y los routers para no prometer “no se procesan” cuando el compromiso real es procesamiento por provider/endpoint/plan aprobado.

## 2026-07-30 — Globe: Nano Banana Pro promovido en el carril gobernado

- Se firmó la revisión humana desde el Producer autenticado y se propuso `ref/still/nanobanana-pro-v1` al operador.
- Se promovió el readiness y se creó/activó el binding de producción mediante los comandos canónicos; el selector live lo muestra como `Disponible`.
- El resto de la flota conserva sus gates honestos: no se forzaron rutas sin evaluación exacta, driver gobernado o dependencia externa resuelta.

## 2026-07-30 — Globe: Nano Banana 2 promovido y probado desde Producer

- Vertex habilitó de hecho `gemini-3.1-flash-image`: el probe oficial devolvió HTTP 200 y se retiró
  el bloqueo histórico de allowlist.
- Se añadieron rates, driver gobernado, endpoint exacto, derechos comerciales, evaluación 5/5,
  revisión humana y promoción de readiness/binding/circuito.
- La generación real desde la UI autenticada es
  `ce06f8b4-ebe9-43b6-9d47-8e4cc901f49a`, 10 créditos.
- El smoke detectó y corrigió en Globe `1fb57285` un off-by-one en la reconstrucción del hash
  durable de Vertex; CI `30565123529` y worker `30565166238` quedaron verdes. El mismo run terminó
  `completed/retained`, la UI mostró `Listo` y el output fue
  `sha256:b8a0eb45289558a2cb99e9989fa401aa794035c709505b10c58fba34e0768c1e`.
- El Producer ofrece simultáneamente cinco modelos de imagen. TASK-1553 permanece `in-progress`
  por los receipts pendientes de TASK-1468/TASK-1578.

## 2026-07-30 — Creative Velocity y producción modular

- Se profundizó el benchmark de Creative Velocity contra Superside, Publicis, WPP, VML, Monks, DEPT, Dentsu,
  Accenture Song y referentes de Chile/LatAm.
- Se creó [`EFEONCE_CREATIVE_VELOCITY_MODULAR_PRODUCTION_ADDENDUM_V1`](docs/services/creative-services/EFEONCE_CREATIVE_VELOCITY_MODULAR_PRODUCTION_ADDENDUM_V1.md).
- Se documentaron lanes Social/Campaign/Performance Creative/Content Operations Velocity, Dedicated Creative Pod,
  primer valor, dos velocidades y el roadmap de Modular Production.
- Se registró la implementación observada en SKY con Adobe Express, SharePoint y assets reutilizables como capability
  de delivery probada, separada de un producto futuro.
- Se actualizaron Creative Practice en `.codex` y `.claude`, además de las skills de business model, customer model
  y pricing. Estado: `Approved for validation`; no se habilita venta self-service ni pricing público.
- Se creó la simulación sintética [`Creative Velocity Buying Simulation — Banco BICE V1`](docs/audits/commercial/EFEONCE_CREATIVE_VELOCITY_BUYING_SIMULATION_BANCO_BICE_V1.md), con artefactos, objeciones, respuestas y criterios de validación.
- Se actualizó el estado de SKY: el operador autoriza nombrarlo como caso de éxito; claims, métricas, assets,
  screenshots, nombres, URLs y pricing siguen sujetos a evidencia y alcance específico.
- Se documentó `Embedded Managed Pod / Embedded Creative Capacity` como modalidad integrada culturalmente al equipo
  interno, con frontera explícita frente a Staff Augmentation, cost-to-serve de integración y métricas de fit/adoption.
- Se incorporó `Fully Managed Creative Capacity`: fee mensual integral donde Efeonce absorbe equipo, infraestructura,
  licencias, costos laborales, provisionales, reemplazos y soporte. El modelo aplica globalmente, con parametrización
  legal, laboral, fiscal, monetaria y de procurement por jurisdicción.

## 2026-07-30 — Creative Services: benchmark de mercado y arquitectura Creative Operations

- Se documentó el benchmark fechado [`CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-30`](docs/audits/commercial/CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-30.md), con referentes globales, digitales/productizados, Chile/LatAm, fuentes de compradores, confidence, límites y patrones adoptables.
- Se aceptó [`EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_DECISION_V1`](docs/architecture/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_DECISION_V1.md): Creative Operations organiza la oferta en Creative Velocity, Brand & Campaign Systems, Content Production System y AI Creative Operations.
- Se creó [`EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2`](docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md), con escalera diagnóstico/proyecto exploratorio → sprint → Managed Creative Capacity → lane especializado → Studio/portfolio expansion, paquetes, ICP, proof system, rights, economics y gates.
- Se sincronizaron `README`, `project_context`, `DECISIONS_INDEX`, Creative Studio Business Model y las copias `.codex`/`.claude` de `creative-practice`. Estado honesto: `Approved for validation`; no habilita pricing público, checkout, venta self-serve ni claims no verificados.
- Se aclaró la arquitectura como **híbrida**: el catálogo plano permanece como índice de reconocimiento rápido; las cuatro rutas orientan la conversación y los paquetes/modalidades convierten la ruta en una compra scopeable.
- Las skills `creative-practice` ahora explican operativamente las tres capas, el orden de calificación y un ejemplo de recorrido desde servicio reconocible hasta ruta, sprint, Managed Capacity y expansión.
- Se creó [`CREATIVE_SERVICES_OPERATING_MODEL_V1`](docs/services/creative-services/EFEONCE_CREATIVE_SERVICES_OPERATING_MODEL_V1.md), que profundiza oferta, modelo de creación/captura de valor, ICP/JTBD, buying group, delivery/RACI, capacity, pricing/economics, rights, proof, renovación y gates de madurez.

## 2026-07-30 — TASK-1600: ownership de color transferido a AXIS

- AXIS publica la paleta portable completa y Greenhouse consume `@efeoncepro/axis-tokens@0.2.1` mediante adapters; `0.2.0` queda como publicación manual histórica y `v0.2.1` fue regularizada con el pipeline gobernado (`30525304584`, success), incluyendo publish idempotente.
- GVC staging pasó rampas light en 1440/390, captura dark real en 1440/390 y dos capturas repetidas fueron pixel-identical; queda una diferencia de altura del full-page histórico pendiente de aprobación/re-baseline.
- Finance PDF y report-artifact comparados contra el parent commit: raster diff 144 dpi = 0 píxeles. Rollback rehearsal sobre `0.1.5` pasó 43 tests.

## 2026-07-29 — Social Media: modelo de negocio y Product Service V1

- Se documentó Social Media como servicio recurrente humano y gestionado por personas, con estrategia, contenido,
  publicación, community management, escucha, reporting y aprendizaje.
- Se añadieron el Product Service Contract, Business Model y Pricing Integrity Pack con packaging por capacidad,
  hipótesis de bandas, economics, guardrails y gates de validación.
- Se añadió el benchmark comercial [`Social Media Service Market Research`](docs/audits/commercial/SOCIAL_MEDIA_SERVICE_MARKET_RESEARCH_2026-07-29.md), con agencias globales, Chile/LATAM, tendencias, patrones de venta, pricing público y confidence/limitaciones.
- Se añadió el [`Social Media Subservices Catalog V1`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_SUBSERVICES_CATALOG_V1.md), que detalla dirección, editorial, contenido, publishing, community, listening, trendjacking, social search, measurement, activaciones y fronteras con otras líneas.
- Se documentó [`Search + Social Visibility Composition V1`](docs/business-models/search-visibility-360/SEARCH_SOCIAL_VISIBILITY_COMPOSITION_V1.md) como composición propuesta entre Search Visibility 360 y Social Media, con workflow compartido, RACI, wedges, economics separados y gates para evaluar un futuro Product Service compuesto.
- Se añadió el [`Social Media Operating Model`](docs/services/creative-services/EFEONCE_SOCIAL_MEDIA_OPERATING_MODEL_V1.md), con squad, capacidad, onboarding, cadence, SLA, community/care, crisis y fallbacks.
- Se añadió el [`Social Media Customer Model Integrity Pack`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md), con beachhead B2B experto, buying group, anti-ICP, triggers y motion de validación.
- Se añadió el [`Search + Social Measurement Contract`](docs/business-models/search-visibility-360/SEARCH_SOCIAL_MEASUREMENT_CONTRACT_V1.md), con Social Search, ownership, instrumentación, confidence y gates contra claims causales.
- Se añadió un [`Pricing Validation Addendum`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_PRICING_VALIDATION_ADDENDUM_2026-07-29.md) con ladder revisada, escenarios de economics y condiciones comerciales de prueba; sigue sujeto a Finance.
- Se documentó el [`Differentiation & Positioning V1`](docs/business-models/creative-services/EFEONCE_SOCIAL_MEDIA_DIFFERENTIATION_POSITIONING_V1.md): autoridad y demanda, Social + Search, squad gobernado, transparencia, enemigo commodity, proof system y claims permitidos.
- Se incorporó **Efeonce Run & Gun Studio** como ventaja real de delivery de Social Media: equipos profesionales, captura en terreno y producción social-first componible con SOW, derechos y economics propios.
- Se creó [`Efeonce Run & Gun Production — Offer V1`](docs/services/creative-services/EFEONCE_RUN_AND_GUN_PRODUCTION_OFFER_V1.md) con Content Capture Day, Executive/Interview Capture, Social-First Production Sprint y Brand Story/Campaign Capture; la capability se normalizó como Efeonce Run & Gun Studio.
- Globe / Creative Studio quedó explícitamente fuera de la promesa y pricing base actual; Paid Social, Creator/UGC
  y Producción Especial quedaron como módulos separados.
- Estado honesto: `Approved for validation`; no habilita precios públicos ni venta self-serve.

La continuidad consolidada de esta sesión y el índice histórico mensual quedan reflejados en [`Handoff.md`](Handoff.md)
y [`docs/changelog/internal/2026-07.md`](docs/changelog/internal/2026-07.md).

## 2026-07-29 — Release Cloud Build: autenticación privada AXIS en workers

- El release orchestrator `30465872005` reveló `ERR_PNPM_FETCH_401` en los builds Cloud Run de `ops-worker`,
  `commercial-cost-worker` e `ico-batch-worker`: faltaba autorización para `@efeoncepro/axis-tokens`.
- Los tres deploy scripts ahora usan el secreto read-only existente `axis-packages-read-token` mediante `secretEnv` y
  `.npmrc` efímero; los Dockerfiles montan BuildKit secret en ambas capas `pnpm install`, sin token en imagen o runtime.
- La primera corrida autenticada aún respondió `401`: el PAT estaba sano, pero el heredoc no quoted expandía `$$` al
  PID del shell antes de que Cloud Build pudiera resolver `secretEnv`. Los scripts ahora preservan el doble dólar
  requerido por Cloud Build y un test de contrato cubre los tres consumidores.
- `.dockerignore` y `.gcloudignore` excluyen `.npmrc`; el gate de contratos impide que el secreto efímero viaje en el
  contexto de Docker o en un upload local accidental.
- `artifact-worker`, cuarto build unit que instala el `package.json` raíz, adoptó el mismo montaje BuildKit; el gate
  ahora exige AXIS auth en todas las etapas `pnpm install` de los cuatro workers.
- Se concedió acceso Secret Manager sólo al service account de Cloud Build de Greenhouse. Validaciones locales de
  contratos de workers, tests focales y los cuatro builds reales pasaron.
- PR #166 promovió todo `develop` a `main` en `0b4bdd6acb401ef0b108e27f1a8f1d80c469a0ed`. El orquestador oficial
  `30473069894` terminó verde sin bypass, dejó el manifest
  `0b4bdd6acb40-2608542b-b1e5-4b3b-b24e-5036501dfef1` en `released`, verificó Vercel Production, Cloud Run y
  `/api/auth/health`. Azure aplicó sus skips canónicos `no_infra_diff`.
- El watchdog conserva un falso positivo conocido para `ops-worker`: su diff de rutas runtime desde el SHA
  desplegado al target es vacío y el orquestador aplicó el change-gate, por lo que no corresponde redeploy label-only.

## 2026-07-29 — Globe: contrato tipográfico del payload cliente + jerarquía del Producer (TASK-1599)

- Tres commits desplegados y verificados en vivo sobre `globe-studio-internal-00100-9kq` (imagen
  `b9112a80985d`) en `https://globe.efeoncepro.com/producer`, con sesión real a 1440px.
- **`68a2cbe`** — 13 sitios del payload pedían Geist@700 con sólo Poppins 700 · Geist 400 · Geist 600
  cargados: el navegador **sintetiza** el corte faltante, deforma el trazo y no falla ningún gate. Dos
  gates nuevos cierran la clase: uno aparea familia×peso **en el sitio de uso** (la declaración de
  `@font-face` estaba sana; el defecto era quién pedía qué) y otro rechaza la utilidad de fuente que el
  theme no puede generar (`font-normal`/`font-medium` no emitían CSS). Más `tabular-nums` en siete
  números vivos.
- **`d009871`** — jerarquía del Producer. El panel de créditos **no se rompía por el número**: llevaba
  `max-w-full`, y sobre un elemento `absolute` esa medida resuelve contra el bloque contenedor —el
  `<details>`, o sea el ancho del disparador—; los tres síntomas eran un bug. Y `Listo` vs `Completada`
  eran **dos ejes** del contrato (`coarseProgress` vs `state`), no dos palabras: `stateCompleted` quedó
  huérfana y se borró.
- **`b9112a8`** — cierre de una regresión propia: bajar las acciones del prompt al flujo desbordó el
  cuerpo y un renglón quedó cortado contra el riel translúcido; se resolvió con el token `--rail-scrim`
  en el SSOT. Más `Math.floor` en el donut, que con `round` decía `100 %` junto a `Gastado 166`.
- Verificación: build 0 · eslint 0 · `node --test` 129/129 · canario de motor 8/8 · canario del composer
  163/163 · revisión humana en vivo tras cada despliegue.
- **Quedan tres puntos abiertos sin dueño**: el preflight de Tailwind no se emite, así que
  `b, strong { font-weight: bolder }` pide el corte fuerte por herencia y es invisible a un gate que
  escanea `className`; la fuga del `axis-pilot-canary` deja `pnpm test` sin terminar y un huérfano en el
  puerto 4326 por corrida; y el H9 del feed, cuyo `…` no es CSS (`DISPLAY_TITLE_MAX_LENGTH = 96` recorta
  por conteo de caracteres antes de que exista layout, así que ningún ancho lo arregla).
- Detalle de runtime: `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`.

## 2026-07-29 — Release preflight: corrección de latencia del check Sentry

- La causa del timeout persistente de `sentry_critical_issues` era la consulta de hasta 100 issues, que tardaba
  8,5–9,1 s en Sentry aunque no hubiera resultados; el presupuesto externo e interno anterior era de 6 s.
- El check ahora solicita 10 resultados, suficiente para detectar el umbral bloqueante `>=10`, mantiene la semántica
  estricta ante errores, usa un deadline API de 15 s y un presupuesto de runner de 20 s. El runner reporta el budget
  efectivo de cada check.
- El cambio está en `develop`; todavía no se ha repetido el orchestrator ni se ha desplegado producción.

## 2026-07-29 — PR #164: promoción completa y release detenido por evidencia de smoke

- PR #164 promovió todo `develop` a `main` en `e711fe2560e3a7c2e7e8639e07a8a394e9582cdb`; no hubo cherry-picks ni
  release aislado de AXIS.
- CI/CI Deep, Vercel READY y los gates de governance pasaron. El orchestrator `30452322643` detuvo el proceso en
  preflight por falta de smoke asociado al SHA de `main`; el smoke manual `30452463889` pasó verde posteriormente.
- Queda pendiente reintentar el orchestrator sin bypass cuando la API de GitHub Actions responda. No hubo manifest,
  deploy de workers ni promoción parcial.

## 2026-07-29 — PR #164: bloqueo persistente del preflight Sentry

- Smoke manual `30452463889` pasó y staging fue recuperado a `READY` mediante redeploy del deployment existente del
  proyecto Greenhouse; Production permaneció READY.
- Los orchestrators `30452924614`, `30453278402` y `30453818726` fallaron antes del manifest por
  `sentry_critical_issues` timeout de 6 s; el último ya no tuvo bloqueos de smoke ni staging.
- El rollout queda pendiente. No se activó `bypass_preflight`; requiere `platform.release.bypass_preflight` y razón
  auditada de al menos 20 caracteres.

## 2026-07-29 — PR #164: autenticación de paquetes privados y gobierno de release

- Los workflows con instalación de dependencias privadas usan `GITHUB_TOKEN` con `packages: read` y un `.npmrc`
  efímero en `$RUNNER_TEMP`; no se versionan tokens ni se exponen credenciales en runtime o artefactos.
- Vercel `efeonce-7670142f/greenhouse-eo` recibió `NPM_RC` cifrado para Preview (`develop`) y Production, siguiendo
  el runbook de AXIS. La credencial operator-owned es temporal y requiere reemplazo por una identidad read-only antes
  del rollout externo.
- `CLAUDE.md` quedó bajo el techo estricto de 35k tokens (34.945) y la auditoría de contenido quedó sin huérfanas;
  el detalle del Design System vive en `docs/architecture/ui-platform/README.md`.

## 2026-07-29 — EPIC-028: cinco workstreams comerciales añadidos

- Se añadieron `TASK-1593`–`TASK-1597` como policy tasks dentro de EPIC-028: enterprise ICP/design partners, Agency
  Workflow Sprint, Campaign Variant Workflow, Distribution/Activation y Packaging/Unit Economics.
- Las tasks consumen los gates comerciales existentes sin duplicarlos y mantienen el runtime, pricing público,
  checkout, reseller rights, co-selling y clientes externos bloqueados.
- El orden recomendado es `TASK-1595 → TASK-1594`; `TASK-1593`, `TASK-1596` y `TASK-1597` avanzan en paralelo documental.

## 2026-07-29 — EPIC-028: revisión de alineación con la visión de mercado

- Se auditó lo construido y lo pendiente del epic frente a la estrategia de Globe: enterprise como ICP estratégico,
  beachhead operativo por unidad, agencias como canal, e-commerce/DTC como wedge y creators/SMB como distribución.
- Veredicto: la fundación de producto, gobernanza y operación está alineada; la arquitectura comercial, distribución,
  verticalización y exit criteria de negocio todavía están incompletos.
- Se recomendó añadir dentro del mismo epic workstreams de enterprise design partners, Agency Workflow Sprint,
  Campaign Variant Workflow, activation/distribution y packaging/economics, sin duplicar owners técnicos.

## 2026-07-29 — Globe: estrategia de mercado, distribución y monetización V1

- Se integraron los benchmarks de Higgsfield y Magnific en una estrategia de segmentos, oportunidades, distribución
  masiva, ventas B2B/enterprise, canales, packaging y validación.
- Se fijó enterprise marketing organizations como ICP estratégico; mid-market o una unidad enterprise como beachhead
  operativo; agencias/productoras como canal multiplicador; e-commerce/DTC como vertical wedge; creators y SMB como
  adquisición y aprendizaje inicial.
- Se documentaron loops de artifact/template/creator/referral/content/integration/agency, límites entre software,
  Product Service, managed/co-operated y canal, revenue architecture, cost-to-serve y pilotos de 90 días.

## 2026-07-29 — Globe Producer: craft, densidad y tres bugs que sólo vio el despliegue

- Composer del Producer desplegado a `globe-studio-internal` (`00095`→`00097`): glow con reposo propio y
  rampa de fondo **invertida** (`--field` es más oscuro que el panel, así que la rampa heredada oscurecía
  al interactuar), pozo único sin el borde de fábrica del navegador en el `<textarea>`, ritmo interno
  16/20/32, y bloque de modelo+formato de **471 a 302 px** con jerarquía por consecuencia.
- Miniaturas de Dirección: ocho stills con globo generados con `pnpm ai:image`, mismo sujeto y ocho
  tratamientos, `aspect-video`. Pendiente regenerarlas por el Still Model Lab para procedencia gobernada.
- Proporción pasa a **taxonomía por forma, no por plataforma** (corrección del operador: Globe no produce
  sólo para social). Calidad deja de mostrar el enum crudo `standard`/`high`.
- Header a una fila en la banda 768–1024: **121 → 67 px**. Riel `sticky` funcionando bajo `lg`
  (`overflow-hidden` lo anulaba). Anillo de créditos devuelto al trigger, que el port había perdido.
- Bloque de referencias: el menú ordena por disponibilidad, el copy deja de prometer influencia y anclaje
  —ninguna de las dos existe— y cada ficha muestra su miniatura real.
- **Gate nuevo**: `tailwind-theme.test.ts` falla si una utilidad consume un namespace que el theme vació y
  el SSOT no repobló. Verificado en ambos sentidos. Nació de seis `backdrop-blur-*` computando `none`.
- ⚠️ Tres defectos aparecieron **sólo al desplegar**, con gates verdes: el `.npmrc` que no llegaba al
  `pnpm deploy --prod`, las miniaturas dando 404 por no estar en `assets.ts`, y el feed montando un MP4 en
  un `<img>`. Registrados con su patrón en
  [`GLOBE_PRODUCER_VERIFICATION_BLIND_SPOTS_2026-07-29.md`](docs/audits/globe/GLOBE_PRODUCER_VERIFICATION_BLIND_SPOTS_2026-07-29.md).
- **TASK-1552 Slice 3 sigue abierta**; nada de esto la cierra.

## 2026-07-29 — Magnific: Go-to-Market, workflows y expansión de plataforma documentados

- Se añadió una auditoría comercial sobre el wedge de upscaling, PLG, content/community, Flows/Agents, plugins, API, MCP,
  Business, Enterprise, services y value capture.
- Se clasificaron adquisición, integración, contributors, affiliates, Creative Partners, casos de agencia y enterprise;
  la evidencia pública no permite llamar partnership formal a la mayoría de esas relaciones ni validar claims de escala.
- El patrón transferible para Globe queda definido como `builder experto → workflow → runner → pod/workspace`, con
  derechos, provenance, QA, aprobación, costos y accountability; no se copian créditos, unlimited ni logos.

## 2026-07-29 — Higgsfield: Go-to-Market, partnerships, advertising y expansión vertical documentadas

- Se añadió una auditoría comercial que analiza el GTM completo: PLG/self-serve, content-led education, agency-led
  adoption, enterprise sales y ecosystem distribution; además separa partnerships formales, proveedores,
  integraciones, workshops, creator programs y case studies.
- Se documentó Advertising como beachhead de alta frecuencia: URL-to-Ad, variantes, workflows de campaña y expansión
  hacia Team/Enterprise, con agencias como multiplicadores y enablement como acelerador de adopción.
- La implicancia para Globe queda en validación: wedge estrecho, partnership taxonomy explícita, memoria de workflow,
  derechos/provenance y accountability Efeonce; Higgsfield puede ser capability provider, no dueño del resultado.
- Las skills de GTM, business model y research incorporan el patrón transferible `cuña → activación → workflow →
  agencia/pod → enterprise → expansión`, con traducción `adoptar | adaptar | descartar` y anti-copia explícita.

## 2026-07-29 — TASK-1591: adapters AXIS opt-in verificados

- AXIS publicó `0.1.4` con los contratos `efeonce.status` y `efeonce.progress` gobernados para Greenhouse y Globe.
- Greenhouse fija los tres paquetes privados y expone adapters MUI/Vuexy; Globe fija los mismos paquetes y expone adapters Tailwind/token classes.
- Se añadieron fixtures opt-in en `/design-system/axis-adapters` y `/_axis-pilot`, con evidencia desktop/mobile, teclado, reduced motion y sin overflow.
- El rollout productivo permanece separado; el PAT operator-owned vence el 2026-08-27 y debe rotarse antes de uso externo durable.

## 2026-07-29 — Creator Influence & Content: modelo operativo documentado

- Se documentó el submodelo de Influencers, Creators & UGC dentro de Media & Distribution, con cinco ofertas:
  Creator Intelligence, Influencer Activation, Creator Content & UGC, Creator Partnership Program y Amplification & Whitelisting.
- Se añadieron ficha de servicio, arquitectura operativa no-runtime, documentación funcional y manual de operación,
  separando audiencia, assets, derechos, pass-through, paid usage, RACI, gates y medición.
- La skill social de Creator/UGC quedó enlazada al modelo canónico; el estado permanece `Approved for validation` y
  no habilita pricing público ni venta general.

## 2026-07-29 — Creator Influence & Content: arquitectura de fees y comisiones

- Se añadió el `Pricing Integrity Pack V1` con bandas internas de validación, fee fijo, pass-through transparente,
  coordinación de terceros, performance fee condicionado, mínimos y condiciones de pago.
- Se fijó como hipótesis el modelo `fee base + pass-through`; las comisiones no pueden ser ocultas ni sustituir el
  delivery fee. Finance, Legal y Commercial deben validar cost-to-serve, derechos, atribución y willingness-to-pay.

## 2026-07-29 — Creator Influence & Content: benchmark de mercado y modelo escalable

- Se investigaron agencias y plataformas líderes, incluyendo Aspire, NeoReach, Upfluence, CreatorIQ e Influentials,
  además de referencias públicas de pricing y guidance de disclosure/rights.
- Se añadió el benchmark comercial con patrones adoptados y descartados: end-to-end modular, rights at signing,
  paid amplification, affiliate con tracking, transparencia y source of truth portable; fuera quedan per-post,
  performance-only, comisión oculta y porcentaje de media spend.
- El modelo propio queda orientado a capacidad gobernada por lane, no a volumen de publicaciones, y permanece en
  `Approved for validation`.

## 2026-07-29 — Creator Influence & Content: bandas y porcentajes de validación

- El Pricing Integrity Pack pasó a V1.1 con bandas por lane: Creator Fit Brief USD 500–1.000, Intelligence USD
  1.500–4.000, Activations USD 3.000–12.000, Content Engine USD 4.000–8.000/mes y Partnership USD 6.000–15.000/mes.
- Se fijaron como hipótesis operativas 10–15% para coordinación de pass-through, 15% para management medio,
  5–15% para creator affiliate, 2–5% para Efeonce success fee, 15–35% por 30 días de paid usage y 15–30% por exclusividad.
- Las skills Codex/Claude de Creator/UGC ahora incluyen las bandas, porcentajes, regla de no doble cobro y prohibición
  de presentar estos números como pricing público.

## 2026-07-29 — Creator Influence & Content: simulación end-to-end documentada

- Se añadió un caso comercial sintético para una campaña de perfume masculino con tres deportistas chilenos.
- El caso recorre intake, casting, vetting, contacto con representantes, negociación, derechos, producción,
  amplificación, medición, presupuesto de planificación y decisión go/no-go.
- Se enlazó desde la documentación funcional, el manual de operación, el índice de auditorías comerciales y las
  skills Codex/Claude de Creator/UGC. No constituye caso de éxito, disponibilidad confirmada ni cotización aprobada.

## 2026-07-29 — Globe: CEO conditional-go para primer servicio comercial gestionado

Se formalizó la autorización CEO para sacar Globe al mercado mediante un `Managed Creative Production Sprint powered by
Globe`: un cliente, un workflow y una ruta promovida, operado por Efeonce, con SOW/factura directa y sin acceso directo
del cliente al runtime. El contrato operativo queda en `docs/services/creative-studio/`; `TASK-1480` continúa
`in-progress` hasta reunir evidencia route-specific y ejecutar el primer sprint.

Corrección de fuente de verdad: el cliente inicial es **SKY Agencia Creativa**, con módulos `agencia_creativa` +
`globe`. La licitación SKY Blog/Wherex queda fuera del rollout; el brief correcto vive en
`docs/services/creative-studio/SKY_GLOBE_DESIGN_PARTNER_PILOT_BRIEF_V1.md`.

## 2026-07-28 — Contrato de producción visual social para reportes

- Se documentó el contrato técnico, funcional y operativo para producir posts de Instagram con reportes reales,
  incluyendo el patrón proof-first/score dominante, crop nativo 4:5, logo único, composición determinística y gates
  contra tarjetas azules, dashboards ilegibles, clipping y decoración genérica.
- Se sincronizaron las skills Codex/Claude de `design-studio`, `social-media-studio` y
  `greenhouse-ai-image-generator`.
