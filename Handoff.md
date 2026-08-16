# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

### Cuenta candidata + `/my` longitudinal — ADR/arquitectura aceptados, runtime pendiente (2026-08-16)

Se formalizó bajo `EPIC-011` la continuidad candidato→colaborador: una persona conserva el mismo
`identity_profile_id`, principal/login, perfil profesional e historia; `candidate_facet` y `member` son facetas
aditivas y `/my` se compone por capabilities. Selección no crea cuenta ni `member`; TASK-770/activation agrega la
faceta laboral y refresca la sesión. El perfil profesional pasa a ser person-scoped y cada application conserva
status publicado, CV snapshot, preguntas y expectativa económica propios.

Canon nuevo: ADR `GREENHOUSE_CANDIDATE_ACCOUNT_LONGITUDINAL_MY_DECISION_V1.md` + arquitectura
`GREENHOUSE_CANDIDATE_SELF_SERVICE_LONGITUDINAL_MY_ARCHITECTURE_V1.md`, indexados en DECISIONS_INDEX. Backlog
registrado y lint verde: `TASK-1727` identity/session → `1728` professional profile + `1729` application contract
→ `1730` `/my` UI; `1731` activation continuity → `1732` People 360 reader → `1733` People 360 UI. Las dos tasks UI
tienen direction, wireframe, flow y motion contract, pero `UI ready: no`; no existe JSX, schema, flag, migración ni
rollout de esta iniciativa todavía.

Primer paso recomendado: ejecutar `TASK-1727` con auditoría live de schema/auth y threat model. No abrir
`/api/my/*` actual a candidatos, no crear `member` al aplicar y no iniciar `TASK-1730` antes de 1728/1729. La
auditoría detectó hipótesis brownfield sobre `handoff_id|hiring_handoff_id`, linkage de `candidate_facet.member_id`
y session/magic-link hardening; TASK-1731/1727 deben verificarlas contra runtime antes de afirmar o corregir.

### Banco de Talento — producción operativa; contacto explícito y reversible (2026-08-16)

`TASK-1723`–`TASK-1726` quedaron implementadas end-to-end. El encendido operativo autorizado por el CEO se promovió
con `20245888625b8dc979cf2f747f5ef9d7999df6e5` / run `31953851353`, que terminó `released`; Vercel productivo
`dpl_CTxG3tx66S159tazMSyNiGSmqzHJ` está `READY` y `/api/auth/health` devolvió 200. PostgreSQL tiene cero
migraciones pendientes. El backfill/reconciler conserva 52 memberships (50 `active_process`, 2 `needs_reconsent`)
y no crea consentimiento futuro. Los flags Vercel de invite/self-service están en `true`; el worker declara
self-service en `ops-worker-00563-ghv` (Ready=True, change-gated porque las rutas runtime no cambiaron). Watchdog:
`aggregateSeverity=ok`, `drift_count=0`.

Dos superficies quedaron verificadas: candidato 1440/390 en
`.captures/2026-08-16T08-52-56_hiring-talent-pool-self-service` (desplegada fail-closed) y operador 1440/390
con fixtures sintéticos en `.captures/2026-08-16T12-22-58_hiring-talent-pool-desk`. Hiring Desk permite
buscar/filtrar, abrir ficha, leer evidencia/availability y abrir el CV exacto de la postulación dentro del Banco.
No rankea, decide, mueve etapa, asigna test ni copia contacto/CV al índice de búsqueda.

Efeonce MCP publica `hiring.talent_pool.search` y `hiring.talent_pool.profile.get` para persona interna delegada.
Canary OAuth real: search/profile `200`; cliente base-only `66985833-14e9-438e-add4-b740e84e9a64` obtuvo `403`
sin Hiring. Durante el rollout se detectaron y corrigieron dos fallos fail-closed: host inválido del canary y policy
persistida con revalidación `0` en vez del mínimo `15`. Projection/search/MCP están ON; invite/self-service están ON
detrás de flags independientes. La confirmación futura es explícita, tokenizada y reversible; no hay backfill,
contacto automático ni acceso externo/B2B. La revisión jurídica formal de copy, policy, TTL y retención queda como
sign-off residual si la política interna la exige.

El barrido documental posterior a la activación sincronizó arquitectura Hiring, API reference, manual del Banco,
EPIC-011/038, TASK-1718/1723/1724/1725, feature/release ledgers y las skills espejo de Talent, MCP y release en
`.codex/skills` y `.claude/skills`. No se modificó runtime; el estado anterior sigue siendo la evidencia operativa.

La auditoría `greenhouse-talent-people-operator` confirmó person-first, cero ranking/decisión adversa, DTO MCP sin
contacto/CV, invitación mediante `HiringApplication` canónica y tests sólo por application. Detectó un fail-open
latente en el rate guard público; quedó corregido para usar bucket compartido sin IP y negar cuando falla el store.

La promoción ampliada puso en producción el reader exacto `applicationId → assetId` y el visor privado del sidecar,
sin mezclar documentos de otras postulaciones. Para agentes, TASK-1718 desplegó App API, proyección minimizada,
OAuth/capability separados y dos tools MCP read-only, pero `HIRING_CANDIDATE_REVIEW_READER_ENABLED`,
`HIRING_CANDIDATE_REVIEW_PROJECTION_ENABLED` y `GREENHOUSE_HIRING_CANDIDATE_REVIEW_ENABLED` permanecen OFF;
no hubo backfill ni lectura de CV real. Build, CI/Deep, smoke E2E, 197/197 pruebas focales Greenhouse, 56/56 MCP,
watchdog y GVC sintético desktop/390 están verdes. El escenario visual usa un harness que responde 404 en producción porque
las máscaras de diff no borraban PII de los PNG/ARIA; la evidencia previa con datos reales fue retirada a Papelera.
El theme dejó de importar el fallback residual Public Sans: títulos y texto usan únicamente Poppins + Geist.

### Aviso interno al completar test — LIVE, primera entrega real pendiente (2026-08-15)

Se extendió el pipeline reactivo de Hiring para que `hiring.assessment.submitted` envíe una sola
notificación interna al buzón configurado de People (default `people@efeoncepro.com`). El consumer re-lee PG,
acepta sólo `candidate_test` en `submitted|scored` con `submitted_at`, deduplica antes de
enviar y lleva a Application 360; no incluye score ni cambia la etapa. Incluye template, preview,
tipo transaccional, kill-switch aditivo, tests y las tres capas documentales.

Validación: 34/34 tests focales, registry de templates, ESLint focal y `pnpm typecheck` verdes.
Auditoría read-only del pack actual de Content Creator: 11 preguntas, 8 competencias, 90 minutos,
pesos=100, sin prompts vacíos/duplicados, sin opciones inválidas y sin
leak de answer key/rúbrica. El smoke sintético completó `assigned → in_progress → submitted`,
rechazó el submit incompleto, persistió 11/11 respuestas, auto-scoreó 1, encoló 10 para revisión y
emitió un solo evento; cleanup verificado en cero. No se tocaron tests ni estados de candidatos reales.
La migración quedó aplicada en Cloud SQL y la configuración `hiring_assessment_submitted_internal` está habilitada;
el release `0fe2420ed894` terminó en el manifest `released` (run `31915501771`), con Vercel y watchdog verdes.
El séptimo correo está vivo,
pero no se ejercitó una entrega real de candidato: People/Operations debe verificar la primera entrega
futura (delivery + `outbox_reactive_log`) sin reprocesar el evento histórico; si falla, debe pausar sólo
ese tipo de correo.

### Los documentos del candidato: un candado que no protegía nada (2026-08-15)
El operador abrió la ficha de una postulante y encontró que para ver su CV había que "REVELAR" —y que
ni siquiera había visor. Tenía razón dos veces, y la segunda era peor: **ese candado era decorativo**.
`Application360View.tsx:1144` construía tres filas con literales, y el "Revelar" de `:355` era un
`useState` local. El motivo que el operador escribía **se descartaba**, y el banner que prometía "deja
una entrada de auditoría" mentía: no se escribía ninguna.
**El sustrato existía desde `TASK-1362` y nadie lo enchufó.** Esa task cerró con `UI impact: none`
declarando fuera de alcance "la UI de subir/ver documentos… desk `TASK-355`", y 355 ya estaba cerrada.
El cable quedó en el aire, sin dueño, y ninguna task abierta lo recogía.
**Lo que se cerró.** `TASK-1714` abrió el reveal auditado para candidatos —no existía: el de
`TASK-784` se ancla a `memberId` y un candidato no tiene member hasta el handoff, así que el RUT salía
por mail cuando People Ops preparaba el contrato, que es justo lo que el reveal existe para evitar—.
`TASK-1715` cableó el panel al reader real. Ambas cerradas y pusheadas.
**La decisión que el operador corrigió.** Mi contrato original decía "el CV se abre en pestaña nueva".
Estaba mal: rompe el contexto de evaluación y delega los 12 estados al visor del sistema, donde no
podemos decir nada honesto sobre un 403 o una cuarentena. El CV ahora se lee **dentro del portal**. Y
mi método falló antes que la decisión: elegí "visor del browser" **sin buscar el primitive existente**
—el repo ya tenía dos consumidores de `react-pdf`—, violando la regla de lookup-antes-de-construir.

**`react-pdf` no se pudo usar, y el hallazgo es más grande que esta task.** No arranca bajo
`pnpm dev` (= `next dev --webpack`): `pdfjs-dist` v5 es ESM y el interop de webpack lo rompe al
evaluarlo, con el import dinámico **rechazando en silencio**. `transpilePackages` no alcanza.
⚠️ **No está verificado bajo Turbopack, que es lo que usa `pnpm build`** — de eso depende si
`CertificatePreviewDialog` y `ContractorSupportDocumentsPanel` están rotos **para los usuarios** o
sólo para quien desarrolla. Es el Slice 1 de `TASK-1716`, junto con sus dos bugs de worker distintos
(uno resuelve con `new URL` sobre un especificador de módulo, el otro desde un CDN público que saca
bytes de documentos privados del perímetro).

**Cuatro defectos que ni los tests ni el build veían, y sí la captura.** (1) PG entrega `Date` donde
el tipo dice `string`: el sort del view-model reventaba en runtime **con los mocks en verde** — la
clase de bug que CLAUDE.md advierte y que igual me comí. (2) `variant='tonal'` rinde 3.69:1, bajo AA.
(3) **`sx` NO mapea `outlineColor` a la paleta**: emitía `primary.main` como CSS inválido y el anillo
de foco no se dibujaba. (4) El diálogo mostraba **dos** "Abrir en pestaña nueva" — lo vio el árbol de
accesibilidad, no la vista. GVC premium verde en ambos viewports al cierre (exit 0, rubric pass).

**Y un aviso operativo:** una sesión concurrente de Codex corrió `git commit` mientras yo tenía
cambios en staging y **se llevó parte de mi trabajo dentro de `1ed8ea36d`**, un commit titulado sobre
growth-seo. El código está completo y pusheado; el mensaje de ese commit no describe lo que contiene.
El índice de git es compartido: `git add` no es una reserva.

### Benchmark de suites AEO + `ISSUE-158` — el relevamiento terminó auditándonos (2026-08-15)

El operador pidió dejar de afirmar ventajas competitivas sin verificarlas, después de corregirme dos
veces. El benchmark de ~30 suites vive ahora en `.claude/skills/seo-aeo-practice/references/` —
**5 archivos, 1.231 líneas**, con convención de confianza `[V]`/`[I]`/`[C]`/`no verificado`. La puerta
de entrada es `BENCHMARK_SUITES_AEO_2026-08.md` (índice + qué podemos y qué no podemos decir + qué
descubrió sobre nosotros): **es el único que hay que abrir para vender**. Los otros cuatro —métodos y
transparencia, pure-plays, incumbentes, precios y LatAm— se abren sólo si hace falta el detalle.
⚠️ **La sección de Moz está marcada en rojo como borrador no verificado** (su sitio bloquea el
fetcher): su claim más fuerte es un negativo y no debe salir a material comercial sin comprobarlo.

**Lo que refutó de lo nuestro.** «Conectar Search Console» es table stakes. «Curva de CTR propia»
tampoco diferencia: **seoClarity la documenta y la vende** y **Sistrix `CTR Potenziale` lee el GSC del
cliente**. «Cubrir LATAM» tampoco: Otterly publica 65+ países con México, Chile y Colombia; Evertune
además declara **servidores en el país seleccionado**; Semrush nombró Chile en su release del
2026-05-14. **La frase que SÍ resiste es la combinación**: nadie proyecta el alza de clics de un
**cambio de posición** con la curva del propio GSC — Sistrix, que tiene la curva real, modela snippet
a **posición constante**. Es un negativo, o sea la afirmación más fácil de equivocar: re-verificar
antes de usarla comercialmente. Corregido en la auditoría y en `TASK-1700` (`ac45c9f70`), cuya
**fórmula no cambia** — el hallazgo la valida.

**`ISSUE-158` (nuevo, `295b80cba`).** Ninguno de los cuatro adapters de `answer_engines` pasa
ubicación geográfica al LLM, y ese resultado se le reporta a Berel como su visibilidad **en México**
contra un KPI contratado de 15-25 citaciones/mes. Recaída de `ISSUE-152` una capa más arriba.
⚠️ **El delta no está medido**: Slice 1 es medirlo antes de tocar nada. Contexto que lo hace urgente:
la ubicación sola movió 97% vs 51% de menciones en la misma pregunta según medición independiente.

**La ironía que dejó la 2.ª tanda, y es la más incómoda:** medir con motor propio **tampoco**
diferencia — Semrush, Ahrefs, Botify y Sistrix también consultan los motores ellos mismos, y varios
declaran explícitamente que **NO usan la API** porque no representa lo que ve el usuario (le falta el
system prompt de consumidor y la navegación por defecto). O sea: **ellos scrapean la interfaz y
nosotros llamamos la API.** Es consenso de mercado en contra de nuestro método, no una opinión
suelta. Y un corolario duro: **nuestro score no es comparable con el de otra herramienta** — en
Gemini el solapamiento entre marcas mencionadas y dominios citados baja al 30%, y Evertune mide bajo
conciencia no asistida. Miden objetos distintos.

**Y el espejo incómodo:** corremos **N=1** donde Evertune corre **100 por prompt** con ±1pt, y
nuestra propia calibración pidió N≥3 (`TASK-1704`). Medido por terceros: **56,9% de los dominios da
resultado distinto al re-medirse** (oscilación media 30,8 pts) y **52% de las marcas #1 cambian en el
mismo prompt**. Un score de una corrida sin intervalo de confianza es ruido con falsa precisión.

**Dos cosas del mercado con fecha.** Adobe cerró la compra de **Semrush** el 2026-04-28 (~USD 1,9-2B)
y Sitecore compró Scrunch. Y **desde el 2026-09-15 Cloudflare bloquea por defecto** los bots de
training y agentes en dominios nuevos con publicidad: **va a mover la visibilidad de clientes que no
hicieron nada**, y ningún vendor lo contempla. Es aviso proactivo disponible.

**Corrección del expediente Berel** (skill, `295b80cba`): contrató **SEO + AEO** en los tres
escenarios — el riesgo no es que regalemos el AEO, es **under-delivery contra un KPI contratado** con
el grader sin correr desde el 2026-07-17. Fee cerrado: MXN 60.000 de lista → 13,3% de descuento →
**MXN 52.000**; los 89.960 fueron mes y medio de arranque a lista. Bajamos precio **sin bajar
alcance**, que es justo lo que la regla de pricing ya prohibía.

**Estado real del grader, medido contra PG el 2026-08-15** (corrige mi propia frase «sin correr desde
el 2026-07-17», que sonaba a que Berel no tiene nada):

| | dato |
|---|---|
| Última corrida del motor, **para cualquiera** | **2026-07-17 — hace 29 días.** El grader lleva un mes inactivo, no sólo para Berel |
| Corridas de Berel | **3, todas `partial`, ninguna `succeeded`** |
| Informe vigente de Berel | ✅ **sí lo hay**: la del 17-jul tiene score y `public_delivery_state='ready'`. Las dos del 29-jun quedaron sin score y en `unavailable` — casos de `ISSUE-155`, ya superados |
| `run_kind` de las 3 corridas de Berel | **`public_diagnostic`** — el mismo tipo que el diagnóstico gratuito de prospecto. **No existe un tipo de corrida de monitoreo contratado** |
| Estado dominante del motor | **`partial` en 25 de 45 corridas (56%)**; `succeeded` sólo 19 |
| Sky Airlines | 2 corridas, ambas `partial`, hace 47 días |

👉 **El problema no es que Berel no tenga informe: es que tiene uno de hace 29 días contra un
compromiso MENSUAL, y que lo que se le entrega es estructuralmente el diagnóstico gratuito de
prospecto corrido a mano.** El siguiente ya está vencido. Y el 56% de `partial` explica por qué
`ISSUE-155` no es exótico.

**Pendiente:** todo en `develop`, **sin push**. Lo operacionalmente urgente no es código: correr el
grader de Berel y decidir si la cadencia contratada se sostiene a mano o necesita `TASK-1707`.

### Favicon canónico — cerrado y empujado (2026-08-15)

`/favicon.ico` respondía **404** desde el 2026-07-30: el commit `879fb9058` borró el `.ico` heredado
de Vuexy sin reemplazarlo, dejando la marca declarada sólo como SVG vía `metadata.icons`. El
navegador pide esa ruta de forma implícita **siempre**, así que en cada carga recibía la página de
not-found (105 KB) y mientras tanto pintaba el ícono viejo — el "doble favicon" que reportó el
operador.

Los tres íconos pasan a **file convention** de Next (`src/app/{favicon.ico,icon.svg,apple-icon.png}`),
generados desde el SVG de marca con `pnpm branding:favicon`
(`scripts/branding/build-favicon.mjs`, idempotente). Se sacó `metadata.icons` del layout: teniéndolo
en ambos lados compiten. Verificado en dev — los tres en `200`, un solo set de `link[rel*=icon]` en
el DOM. `pnpm local:check` y `pnpm docs:context-check:strict` verdes.

**Trampa que costó un intento previo de arreglo:** la base de favicons del navegador es persistente y
separada del caché de páginas; no se refresca ni con recarga forzada. Al verificar un favicon, NO
confiar en el navegador propio — usar `curl -I /favicon.ico` y contar los `link[rel*=icon]` del DOM.
Invariante en `agent-invariants/DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`; doc funcional en
`docs/documentation/plataforma/favicon-iconografia-pestana.md`.

**Pendiente:** está en `develop`. Producción sigue sirviendo el 404 hasta el próximo release.

### TASK-1665 COMPLETE — lente `Descubrir` (cerrada 2026-08-15)

Slices 0–5 en `develop` y **empujados** (`fd7c53402` … `ac65a050c`). Verde: `pnpm local:check`,
`pnpm ui:code-lint --changed`, `pnpm task:lint --task TASK-1665` (`template=1 errors=0 warnings=0`),
`pnpm test` completo (10.763 passed) y `pnpm build` de producción (exit 0, autorizado por el
operador el 2026-08-15).

**Lo construido.** Conmutador de lentes (`KeywordLensTabs`), builder + banda de costo, estado de
corrida (8 estados) y canvas de candidatos venían de los slices previos. El Slice 4 agrega el drawer
de decisión (`AdaptiveSidecarLayout` + `ContextualSidecar`) con las cinco acciones gobernadas contra
sus commands canónicos: `trackKeywords(intent='target'|'opportunity')`, `createGroundedQueryDraft`,
`recordKeywordDiscoveryAction('dismissed')` y navegación read-only a Rendimiento.

**Decisiones load-bearing (no revertir sin leer el porqué):**

- **`preferredMode='temporary'`** y no `overlay`/`push`: el `Drawer` de MUI aporta focus trap,
  `Escape`, click-away y el **apilado de modales** que hace que `Escape` cierre primero la
  confirmación y sólo después el drawer — la cascada exacta del wireframe. `overlay` no tiene focus
  trap (habría que reimplementarlo a mano) y `push` encogería una tabla de nueve columnas.
- **Una acción = un command.** Seguir NO escribe además `promoted_to_tracking`: el `alreadyTracked`
  del reader ya deriva del set monitoreado, que es su SSOT. Escribirlo abriría un segundo almacén
  del mismo hecho y, sin transacción cruzada, una falla parcial los dejaría en desacuerdo.
- **Cero optimistic update + outcome POR keyword.** `trackKeywords` responde 200 con la keyword
  rebotada por techo; el mapeo vive en `keyword-discovery-action.ts` (con test), no en JSX.
- **`Descartar` sí pide confirmación**: el contrato decía "no si es reversible" y **no lo es** — el
  log es append-only y no existe `undismissed`; lo que ocurre es que cualquier decisión posterior lo
  supersede. No se inventó un "deshacer" que el command no sostiene.
- **Corrección al borrador del flow:** los outcomes reales son `tracked | already_tracked |
  intent_changed | capacity_exceeded | invalid`. El flow citaba `declared` / `already_target`, que
  nunca existieron en el primitive.

**Slice 5 cerrado el 2026-08-15** (`78b6f8c09`). ADC renovada con el runner canónico
(`pnpm gcloud:auth:playwright -- --force`, ambos carriles). Captura
`.captures/2026-08-15T12-53-49_growth-seo-keyword-discovery`: **desktop `exitCode 0` sin hallazgos,
mobile `exitCode 0`**, 16 frames, 5/5 assertions. Scorecard **4.55 / PASS**. `pnpm test` completo:
**10.763 passed, 0 failed**.

**Lo que la captura destapó y el resto de la cadena no** — cuatro defectos con lint, tipos y build en
verde:

1. **Contraste 3.71:1** del trigger `Detalles` sobre el tinte de hover de la fila. Sobre blanco daba
   4.59:1, así que sólo existía con el puntero encima. Descartados **con medición**: `primary.dark`
   (4.42:1 — MUI lo deriva oscureciendo `main`, no toma el navy de marca) y la variante tonal
   (**3.69:1**, 10 violaciones por frame: pinta `primary.main` sobre tinte primary). Quedó
   `text.primary` + chevron.
2. **`MetricStrip` con 5 ítems**: reparte `repeat(N,1fr)` y en 460px degradaba el texto de ayuda a una
   cinta de una palabra por línea.
3. **Trigger duplicado** (tabla `md+` + card `xs`): sin `:visible` la captura a 390px enganchaba el
   botón de la tabla oculta.
4. **Jerarquía plana** entre `Descartar` y las acciones constructivas.

**Drift corregido en tooling compartido** (`scripts/frontend/lib/scenario.ts`): el contrato del DSL
decía que el teclado sobre UI no-mutante está permitido por default, pero gateaba **todo** `press` —
lo que empujaba a marcar `mutating:true` un scenario que no muta nada, y eso desactiva el gate para
siempre en ese archivo. Ahora distingue **NAVEGAR vs ACTIVAR**: `Escape`/`Tab` pasan,
`Enter`/`Space` siguen gateados. Con test. (La auditoría del 2026-08-15 acotó la excepción: las
flechas y `Home`/`End` volvieron a quedar gateadas porque SÍ cambian el valor de un
`RadioGroup`/`Slider`/`<select>`.)

**No se tocó** el `MuiTabs-list` de `SeoSearchVisibilityTabs` (TASK-1306), origen de los 10 warnings
de mobile: es `variant='scrollable'`, el desborde es intencional y lo comparten las cuatro pantallas
SEO — merece su propia decisión.

**Cierre 2026-08-15:** `pnpm build` (producción Turbopack) ejecutado con autorización del operador →
**verde (exit 0)**. Task Closing Quality Gate completo (suite 10.763 + build). Lifecycle movido a
`complete/` con README/registry sincronizados. No hay flag nuevo que prender: la lente va con el
`GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED` de TASK-1664, ON desde el 2026-08-14. La captura GVC corrió
contra local con dato vivo; la lente ya es operable en staging/producción por el flag existente.

**Impacto cruzado registrado:** `TASK-1660` ya no debe construir el conmutador de lentes (delta en su
spec, con la forma exacta y la prohibición del `TabList` de `@mui/lab`), y la reclasificación de
intención (`intent_changed`) quedó declarada como suya.

### Auditoría post-cierre de TASK-1665 (2026-08-15) — 13 fixes aplicados + 4 tasks derivadas

Dos auditorías independientes (skills `arch-architect` y `seo-aeo`/`dataforseo-operator`) sobre el
código ya mergeado. **Ambas `CONDITIONAL PASS`:** cero errores de dominio, cero violaciones de
frontera; todo lo hallado fue **cableado** — capacidades que el primitive ya servía y la UI no
consumía, y promesas de la superficie que el runtime no cumplía.

**Los tres que de verdad tocaban la promesa central**, ya corregidos: (1) el `catch {}` del builder
se tragaba el `CanonicalApiError` del camino de gasto, con un comentario que documentaba una
garantía falsa —cuando el queue rebota NO se inserta corrida, así que la «banda de estado» que el
comentario invocaba muestra la anterior o nada—; (2) `budgetRemainingUsd` estaba hardcodeado en
`null`, así que la banda prometía el cupo y siempre decía «no disponible» pese a que
`enforceSeoRunEntitlement` ya lo servía; (3) el drawer guardaba el objeto candidato en vez del id y
quedaba obsoleto tras la reproyección, mostrando los CTAs de gasto habilitados sobre algo ya
confirmado. Más: exclusión mutua entre acciones, polling de corrida viva, sincronización de
`?discoveryRun=`, `coverageNotice`/`deduped` del bridge (un draft con huecos se anunciaba como éxito
pleno), conteo honesto «50 de 312», `◑` fuera de las cifras de costo, `stale` con política real en
el contrato, y el DSL de captura acotado a `Escape`/`Tab` (las flechas SÍ cambian el valor de un
`RadioGroup`/`Slider`, así que un scenario no-mutante podía ejecutar un write).

**Derivado:** `TASK-1692` (writers de los action kinds — hoy nadie escribe
`selected_for_grounded_query`/`selected_for_target`/`promoted_to_tracking`, así que un tercio del
modelo de estados es inalcanzable y el ledger sólo captura descartes), `TASK-1693` (paginación por
cursor + los 3 modos de seed no cableados), `TASK-1694` (barrera de enlaces en la API, dedup
cross-método, asimetría del filtro de volumen), `TASK-1695` (techo del bridge vs su regla de
cobertura, y voseo del system prompt del autor grounded).

**Evidencia GVC de los fixes** (`.captures/2026-08-15T14-51-29_growth-seo-keyword-discovery`):
desktop y mobile `exitCode 0`, **0 hallazgos**, **5/5 assertions**, 16 frames, con el cupo real del
gate en pantalla. Requirió levantar el dev server por Bash en background: `preview_start` queda
colgado tras el helper de permisos de la app (tres intentos, 0% CPU y sin procesos hijos) — si te
pasa lo mismo, ese es el atajo.

**La captura destapó dos defectos EN LOS PROPIOS FIXES**, con lint, tipos y tests verdes: (a) el
cupo recién cableado era invisible porque vivía dentro de la rama `estimate`, que es `null` sin
seeds — la cifra que responde «¿me cabe?» sólo aparecía después de armar la pregunta; el cupo es un
hecho del período, no de la consulta; (b) salía `US$48.3602`, porque `formatUsd` usa 4 decimales
para costos por fila (USD 0.00012) y eso en decenas de dólares se lee como error de formato. Los dos
sólo se ven mirando el frame.

Verde: `pnpm local:check`, 382 tests de `growth/seo` + DSL de captura, suite completa 10.768. El
detalle completo, con evidencia por hallazgo, quedó en el delta 2026-08-15 de la spec en
`complete/`.

### TASK-1659 COMPLETE — intención declarada de una keyword (2026-08-14)

Salió de intentar tomar **TASK-1665** (workbench `Descubrir`): la auditoría destapó que dos de
sus cinco acciones de candidato — `Declarar objetivo` / `Seguir oportunidad` — citaban
`trackKeywords(intent=...)` **que no existía**. El operador eligió parar 1665 e implementar 1659
primero, así que el workbench queda con su contrato completo cuando se retome.

Los 3 slices en `develop` (SIN push): migración `20260814221022082` (aplicada — base compartida,
migrar desde local ES el cambio productivo), command y las 3 lanes. **16/16 contra PG real**
(incluido el invariante de las DOS filas tras un cambio de intención) + suite **10.747 verde**.

**Diseño load-bearing:** `intent` (`target|opportunity`, CHECK cerrado) es ortogonal a `source`
(procedencia del write) y va en columna propia con autoría separada — `intent_declared_by` ≠
`created_by` porque un agente puede declarar por encargo, y un CHECK acopla ambas a la existencia
de `intent`. **Sin backfill y sin default**: la ausencia se propaga hasta la UI, y es el *caller*
quien declara (la lente Oportunidades manda `intent: 'opportunity'` explícito). **Cambiar la
intención cierra la membresía y abre otra** con `clock_timestamp()` — el dato de reporte es "es
objetivo desde marzo, y en marzo estaba en la 45" —, **no consume cupo** y emite outbox aunque
`activeKeywordCount` no se mueva. Outcome propio `intent_changed`. `[verificar]` de capability
resuelto: reusa `growth.seo.target.configure`. Sin flags, sin scope nuevo en Entra.

**Desbloquea TASK-1660** (lente Objetivos) — `Blocked by: none`, con delta de lo que puede dar por
sentado.

**TASK-1665 queda con su auditoría escrita en el archivo** (cinco supuestos que no resistieron el
repo). Los tres que más cuestan si se descubren tarde: no existe ningún `?view=` en el dashboard,
así que el conmutador de lentes hay que **crearlo**; "Dificultad ◑ N/100" está **superseded por
ISSUE-152** (va "Barrera de enlaces" en niveles, y el filtro `maxDifficulty` sale del contrato de
URL); y `Objetivos` sigue en `to-do`, así que `Descubrir` es la **segunda** lente y el link "Ver en
Objetivos" no tiene destino. Además `Motion: none` es incorrecto: falta el contrato de motion.

**Rollout cerrado:** `pnpm build` verde, push a `develop` hecho y **CI 8/8 en verde**. No hay flags
que prender.

**Propagación documental (3 subagentes):** regla auto-load `growth-seo.md` (4.ª cláusula del write),
skills `dataforseo-operator` + `efeonce-mcp-platform` (con sus espejos Codex, `skills:mirrors` verde),
arquitectura §7, API Platform, master flow EPIC-022 §5/§6, epic file, doc funcional y manual del MCP.

**Impacto cruzado detectado — dos cosas que valen más que el resto:**
- `TASK-1662` (keyword gap): su taxonomía es **binaria** ("no aparece" vs "aparece peor") y ahora es
  ternaria. Un `target` en la posición 60 cae en "no aparece" pero **no es un hallazgo, es un
  compromiso en curso**: presentarlo como gap en la reunión de primera vez le vende al cliente algo
  que ya le prometimos. El tercer estado va en el contrato del reader, no en la superficie.
- `TASK-1690` (superficie cliente): `selectFeaturedRankSeries` ordena por mejor posición y corta en 5,
  así que un objetivo en la 60 es **estructuralmente imposible de destacar** y entra al promedio como
  fracaso permanente.
- Menores, con delta escrito: `TASK-1667` (usa `objective` donde el valor canónico es `target`; funde
  intención declarada con search intent estimado en una columna; y cita "readers de 1659" que no
  existen — 1659 entregó un *command*) y `TASK-1669` (`intent` es homónimo dentro del mismo bundle de
  evidencia).

**Deuda documental declarada, NO cerrada:** el doc funcional y el manual del MCP no enumeran las tools
de TASK-1664/1666 (`get_seo_keyword_discovery`, `discover_seo_keywords`, `get_seo_grounded_query_draft`,
`prepare_seo_grounded_queries`); el manual sigue diciendo "10 de lectura + 2 de escritura". Se corrigió
la afirmación falsa de alcance ("nada que escriba"), pero el inventario le toca al cierre de esas tasks.
`TASK-1667` y `TASK-1669` están `legacy=1` en `task:lint` (les faltan markers ZONE) — preexistente.

### Auditoría SEO/AEO post-cierre 1664+1666 — CORREGIDA (2026-08-14)

Tri-auditoría por subagentes con skills SEO (craft 1664 · AEO craft 1666 · economics DataForSEO).
Veredictos: economics LOW risk sin blockers de gasto; 1664 sólido con 4 defaults que congelaban
contrato; 1666 con 2 blockers de producto medidos en el smoke real. **Todo corregido y commiteado
en `develop` (SIN push): commits `3ada31d57` (Lote B/1666) + `522460b17` (Lote A/1664).**

- **1666 v2:** cerebro grounded `aeo-author.seo-grounded.v2` (cobertura obligatoria por seed,
  verificada con `computeSeoSeedCoverage` → `seedCoverage`/`coverageNotice` en el resultado);
  sanitizer normaliza competidor literal → `{{competitor}}` y marca literal fuerza
  `namesBrand=true`; pisos grounded (≥50% discovery + 4 fanOutTypes). `aeo-author.v1` intacto.
- **1664:** orden accionable (oportunidad medida ● primero; desempate por linkBarrier, no KD);
  idempotency key `auto-` con ciclo `YYYY-MM`; spend fence sobre el remanente real;
  `related_keywords` depth 2; `order_by relevance` de keywords_for_site verificado contra
  sandbox DataForSEO; DTO +`cpcUsd`/`competitionLevel`; `excludeTracked` en las 3 lanes.
- Gateway `efeonce-mcp@5ae17ab` (wording idempotencia mensual; deploy dispatch sigue diferido al
  próximo release develop→main). Deltas + backlog V1.1 en los dos task files.
- **Próximo paso: TASK-1665 (workbench UI)** — el contrato del reader ya quedó estable post-fix.

### TASK-1666 COMPLETE — puente SEO → grounded queries AEO (2026-08-14)

End-to-end en la misma sesión que 1664: suite completa **10.721 verde**, sanity PG real **16/16
con autoría LLM real** (1 llamada Gemini, centavos) sobre candidatos reales del smoke de 1664 —
draft baseline (USD 0, aviso obligatorio) + draft grounded v2 con **15 preguntas evaluadas a mano**
(naturales, seeds como tema — 0 copias 1:1 —, no-leading limpio), refs opacas verificadas en
`grounding_sources_json`, active intacto, cero grader runs, dedupe real USD 0.

**Diseño load-bearing:** authoring AEO extendido backward-compatible (cerebro grounded versionado
aparte `aeo-author.seo-grounded.v1`; `aeo-author.v1` **byte a byte intacto** — probado); bridge =
adapter con doble capability, anti-oracle, `contextRef` sha256 canónico e idempotencia por modo
esperado con `pg_advisory_xact_lock` en conexión fijada (un baseline previo NO bloquea re-generar
grounded). 🔴 **Write máquina (ecosystem/MCP) = `aeo_forbidden` FAIL-CLOSED hasta TASK-1631**: la
capability humana de prompt sets no se fabrica para la máquina (documentado en lane/tool/parity).

**Rollout:** el lane app/ecosystem viaja con el deploy de Vercel del próximo push de develop (este
cierre lo incluye); gateway federado (`efeonce-mcp@ac778e8`, 41/41 tests, canary con denies del
puente) — su **deploy dispatch va con el próximo release develop→main** (junto con el de 1664).
Cero flags nuevos. **Desbloqueada: TASK-1665 (`Blocked by: none`)** — el workbench ya tiene sus
dos dependencias completas.

### TASK-1664 COMPLETE — keyword discovery: code complete, rollout PENDIENTE (2026-08-14)

End-to-end autorizado y ejecutado en una sesión: 6 slices en `develop` (SIN push), suite completa
10.693 verde, sanity PG real 27/27 (tx abortada, cero filas de prueba), **smoke live con gasto
real**: corrida `seokdr-2e3e06e6-…` Berel MX (1 seed × `keyword_suggestions` × limit 10) →
`succeeded`, 10 candidatos, **USD 0.0132 ≤ 0.0612 estimado**, ledger labs atribuido, `keyword_info`
inline persistido en el store 1661 (top-up 0 llamadas), re-enqueue deduped USD 0, cero auto-track.

**Diseño load-bearing:** candidates guardan SOLO procedencia (la métrica vive en
`seo_keyword_market_data`, escrita por el writer canónico nuevo `persistKeywordMarketData` —
`captureKeywordMarketData` refactorizado para usarlo); despacho = Cloud Scheduler
`ops-seo-keyword-discovery-drain` (**nace PAUSADO**, declarativo en `deploy.sh`) → drain con claim
atómico; outbox = trazabilidad, no cola.

**Rollout EJECUTADO Y VERIFICADO (2026-08-14, autorización "termina todo lo que está pendiente"):**
push de develop → Ops Worker Deploy verde ×2 con verificación por paso — base (rev `00552`:
scheduler PAUSED + flag `false`) y flip (rev `00553`: flag `true` + scheduler **ENABLED**);
**primer tick del drain disparado y observado en logs** (`pending=0 processed=0`, no-op = costo
cero con cola vacía); flag en Vercel `Production` + `staging`; CI del push verde (incluye build).
**Gateway federado** (`efeonce-mcp@0a8c5e4`: provider `getKeywordDiscovery`/`discoverKeywords`,
puerta HTTP exige `efeonce.mcp.seo.write` para el write, parity 12 tools, canary ampliado, tests
40/40) y **canary contra staging COMPLETO VERDE** — la lectura de discovery sirvió la corrida real
del smoke y los denies 404/400 respondieron correcto. **Único pendiente externo:** dispatch del
deploy del gateway cuando el próximo release develop→main lleve el lane a producción (antes, las
tools federadas darían 404 upstream — lección TASK-1661). Sin enqueue automático: ON + cola vacía
= costo cero; cada corrida pasa preview + gate. Desbloqueadas: TASK-1666, TASK-1667
(`Blocked by: none`) y 1665 sólo espera 1666.

### Release a producción 2026-08-14 — `3754a17d3b1d` RELEASED

`release_id=3754a17d3b1d-4ae924ca-eb20-4c54-9ddb-e15a7ecfe26a`, run `31793370954`, PR #192.
**Manifest `released`** (verificado en `greenhouse_sync.release_manifests`, no sólo en GitHub).
Pasó a la primera: 0 retries, 0 runs quemados. E2E agente 1h04m; workflow 11m33s.

**Verificado en runtime, no asumido:** 4 workers Cloud Run `Ready=True` (3 con el target SHA;
`ops-worker` en `9edd4a0e1e0f` = **residual change-gated legítimo**, diff de rutas runtime vacío —
NO forzar redeploy, runbook §4.1) · watchdog 3/3 `ok` · `/api/auth/health` 200 · **canary del
gateway contra PRODUCCIÓN completo verde**, incluida la tool nueva
(`keyword-market-data: market=available found=2/2 asOf=2026-08-13 servedMarket=2484/es`).

**Break-glass usado con razón verificada** (no formulaica): `db_migrations` es dominio irreversible,
pero la migración `20260813171143226` ya figuraba en `pgmigrations` (2026-08-13 21:13Z) y hay UNA
sola instancia Cloud SQL — el dominio era reconciliación de archivos con un estado ya realizado.
Rollback = revert del PR #192, sin undo de schema.

**Gateway MCP:** deploy dispatchado (`efeonce-mcp` run `31794233777`, sha `c4e0fcd`) DESPUÉS de
confirmar el lane vivo en producción. Verificar que cierre y correr el canary contra
`mcp.efeonce.org`.

**Pendiente menor:** primer run del scheduler `ops-seo-keyword-market-data` el día 15 08:00 CLT
(esperado `already_fresh`, costo ~0).

### ISSUE-152 + ISSUE-153 resueltos — mercado de Berel corregido + contrato multi-mercado (2026-08-13)

**Berel migrado a México** (autorización del operador: "Berel es de México" + "solucionalo
end-to-end"): `seot-berel-mx` activo con 31 keywords, `seot-berel-fase0` (CL) pausado con sus 238
snapshots íntegros. Verificado con capturas reales (USD ~0.14): 31/31 rankings MX — **#1 en sus
términos de marca** —, mercado 30/31, ledger atribuido. El cron diario toma MX solo desde el
próximo ciclo (itera targets `active`).

**Contrato multi-mercado shipped** (`bc7cafe77`): helper canónico `resolve-target.ts` (los 4
`LIMIT 1` copy-pasteados migrados), lane con `?market=` + 409 `multiple_markets`/`market_not_found`,
`meta.servedMarket` en toda respuesta, 9 MCP tools con `market` opcional. Suite 10.629 verde.

**Pendientes que dejaron estos cierres (no bloqueantes):**
- Selector de mercado en la UI admin (cockpit/keywords) — producto, para cuando una org
  multi-mercado se materialice; declarado en ISSUE-153 §Follow-up.
- Guardrail de alta de target (contrastar volumen del nombre de marca vs mercados vecinos) —
  ISSUE-152 §4.
- `keyword_difficulty`: RESUELTO, y desde `fc0019e43` ya **no gobierna la presentación**. La UI
  muestra **Barrera de enlaces: Baja/Media/Alta** derivada por `deriveLinkBarrier`
  (`src/lib/growth/seo/keyword-market-data.ts`) desde el perfil de enlaces del top-10 real
  (`avg_backlinks_info`), ponderando **diversidad de dominios referentes + page rank, nunca el
  conteo de enlaces** — explícitamente NO la KD. `classifyLinkBarrier` fue eliminada.

### TASK-1661 — datos de mercado por keyword: code complete, rollout PENDIENTE (2026-08-13)

`greenhouse_growth.seo_keyword_market_data` **ya existe en la base** (migración `20260813171143226`
aplicada; base compartida dev/staging/prod). `readKeywordOpportunities` ya no cablea
`market: 'unavailable'`. Commits: `261b2919a` (schema) · `739734512` (fetch) · `efc76b8b0` (reader,
worker, MCP, señal + fix). Suite completa 10.616 verde; sanity PG 13/13.

**Rollout EJECUTADO Y VERIFICADO EN RUNTIME (2026-08-13 noche):** push de develop (14 commits) →
8 workflows verdes incl. Ops Worker Deploy; revisión `ops-worker-00551-pc2` con el flag `true`;
scheduler `ops-seo-keyword-market-data` **ENABLED** (`0 8 15 * *`). **Canary del gateway contra
staging: COMPLETO VERDE** — la tool federada respondió `market=available found=2/2 asOf=2026-08-13
servedMarket=2484/es` (México, el mercado corregido) + deny anti-oracle OK. Gateway pusheado
(`efeonce-mcp@c4e0fcd`; su deploy es `workflow_dispatch`, NO automático). **Pendientes:** (1) el
próximo release develop→main lleva el lane a producción → recién entonces **dispatch del deploy
del gateway** para que la tool federada viva en `mcp.efeonce.org` sin 404 upstream; (2) verificar
el primer run del scheduler el día 15 (esperado: `already_fresh`, costo ~0).

**Riesgo de la KD 0: CERRADO por `fc0019e43`.** La KD dejó de gobernar la presentación: se persiste
verbatim, pero la barrera se deriva del perfil de enlaces del top-10, no de ella. Verificado contra el
proveedor: `pintura` y `pintura para piso` (ambas KD=0) ahora separan en `high` y `low`.

**Gasto real ya incurrido en verificación: USD ~0.05** (dry-run gratis + corrida real + una llamada
de diagnóstico + la corrida con el defecto que se corrigió).

**Desbloqueadas por este cierre:** `TASK-1662` y `TASK-1664` pasaron a `Blocked by: none`. 1664 tiene
además su spec recalibrada (commit `a98aaf4c7`): entitlement `seo_v2`, IDs `TEXT`, despertador por
Cloud Scheduler y el boundary de ownership del dato de mercado.

### Credencial de partner en el deck + los aprendizajes documentados (2026-08-13)

**Sin commitear todavía: conviven con el WIP del deck ANAM/HubSpot en el árbol.** El badge de HubSpot
rompía `catalog-portability.test.ts` (apuntaba a `public/` con `../../../../../`). Corregido: el asset
vive en `catalogs/deck-axis/assets/partners/` y el slot resuelve por clave cerrada
(`partner-badge-asset`, espejo de `client-logo-asset`). Suite del composer verde: 18 archivos, 223 tests.

**Lo que necesita quien siga:**

1. 🔴 **`pnpm composer:visual-gate` sigue rojo en DOS láminas, y ninguna es regresión.**
   `BackCoverFull` (1.787 px) driftea porque **declarar un slot mueve el frame del probe**: el gate
   compone con slots sintéticos y para cualquier `asset` usa `assets/url-lum.svg` — por eso aparece una
   burbuja de URL dentro de la caja del badge. Es delta intencional del carril ANAM, a declarar en
   `BASELINE_DELTAS.md`. `NarrativeSplit` (58.846 px) es **baseline viejo en `HEAD`**: su plantilla está
   commiteada desde `f7761988f` y limpia en el árbol. **No congelé**: el runbook prohíbe `--freeze` con
   el composer sucio por otro agente, y lo está.
2. **El dueño del carril ANAM decide si mis cambios viajan con su commit o van aparte.** Son 4 archivos:
   el SVG copiado, `back-cover-full.html`, `back-cover-full.slots.json` y `resolvers.ts`.
3. **Queda una duplicación de asset por decidir:** el badge existe ahora en `public/branding/partners/…`,
   en `src/lib/brand-assets/` (módulo TS, untracked) y dentro del catálogo. Tres hogares para un SVG.

### TASK-1310 CERRADA — portal SEO del cliente completo; su propio scorecard estaba equivocado (2026-08-12)

**`complete`, promoción `develop → main` pendiente.** Con ella el módulo SEO tiene sus dos caras
(4 tabs de operador + portal cliente) y la pata visible del exit criterion de parity queda cubierta.
Los 4 gates UI en verde: `design-contract:lint` · `ui:code-lint` · `ui:visual-gate` · `ui:quality`
**PASS 4.52**. Verificado con **sesión de cliente real de la organización contratada**: 3 superficies
× 2 viewports, `qualityFindings` **vacío** en las seis corridas.

**Lo que necesita quien siga:**

1. 🔴 **Un scorecard es una foto con fecha, no un estado.** El de esta task bloqueaba con 2.29 sobre
   capturas de las 10:25 del 08-08, y el commit `5f622386d` de las 19:29 ya había ejecutado los 7
   lotes premium. Cuatro días el veredicto vigente describió una UI inexistente. **Ante una task con
   auditoría abierta: medir antes de rehacer.** Acá casi rehago trabajo terminado.
2. **Los gates no ven contradicciones de contenido.** El informe anunciaba "Aún no hay una posición
   media para leer" con `#13.3` al lado, con `exitCode 0` y axe limpio. Causa: tres renders del mismo
   modelo derivando cada uno su regla. Ahora se deriva una vez (`resolveSeoLeadTitle`) con test de
   regresión. **Mirar el frame no es opcional.**
3. **Para verificar una superficie client-gated hace falta la persona de ESA organización.** La
   genérica `agent-client@…` recibe la card de bloqueo y se lee como defecto de producto. La de Berel
   ya existía: `agent-berel-client@greenhouse.efeonce.org`. El mapeo usuario↔organización **no** está
   en `client_users`/`clients`/`organizations` — está en `greenhouse_serving.session_360`, que es
   donde el runtime mismo lo resuelve. La sonda `scripts/growth/_sanity-seo-client-population.ts`
   deja esa consulta lista.
4. **Fix global de paso:** el FAB "volver arriba" del layout `(dashboard)` no tenía nombre accesible
   (`button-name`, *critical*) en **todas** las rutas del portal. Cerrado con label del namespace
   `aria` canónico (`756d9970d`).
5. 🔴 **`pnpm test` está rojo en el árbol por trabajo AJENO:** `catalog-portability.test.ts` falla por
   un `../../../../../public/branding/...` en `deck-axis/back-cover-full.html`, WIP no commiteado del
   deck ANAM/HubSpot (en HEAD hay cero ocurrencias). El guardrail hace su trabajo: ese path escapa del
   catálogo. 10.588 tests pasan. No lo toqué — no es mío, y quien lo tenga en curso debe verlo.
6. **Follow-up con dato, sin task todavía:** la superficie cliente tiene **una sola organización**
   (Efeonce tiene assignment pero es tenant interno y `requireClientTenantContext()` lo excluye). Con
   N=1 nadie delata que `connection.state` se decide con **GSC** mientras el Resumen deriva de **rank
   snapshots**: un cliente con Search Console conectado y captura de rank sin correr —**el día 1 de
   todo cliente nuevo**— ve el KPI principal en "sin dato" con el Quadrant poblado debajo.

### Sika México LIC-1120 — paquete de bid preparado, sin precio ni envío (2026-08-12)

Se creó [`docs/commercial/tenders/sika-lic-1120/`](docs/commercial/tenders/sika-lic-1120/): originales en OneDrive, evidencia Wherex, admisibilidad, blueprint interno, técnica, estructura económica y deck de taller. La propuesta se enfoca en continuidad comercial: Search por intención y ubicación → landing/ficha de destino → canal de atención → medición y optimización; **no** promete transferir 50% de ventas. El deck técnico de ocho láminas pasó slots y revisión visual local, pero sigue siendo taller (sin `Proposal`/render gobernado). La pregunta propia continúa en **0/1 respondidas** al 12-08 11:14: faltan fecha/destino/stock por cierre, línea base/fuente de ventas y canal autorizado. **Corrección 2026-08-13:** el brief confirma MXN 100–150 mil para desarrollo y ejecución, pero no dice explícitamente que incluya pauta; una lectura anterior atribuye creatividad/pauta/fee a la respuesta del comprador, y debe revalidarse antes de fijar precio. No existe cotización aprobada. Wherex muestra 45 días, pero también condiciona el crédito a lo convenido con Sika: no asumirlo como término cerrado. La oferta Wherex sigue en edición, sin adjuntos, términos aceptados ni envío; tab queda en handoff.
