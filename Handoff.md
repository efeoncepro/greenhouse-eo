# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-25 — Metodología SEO editorial documentada + caso de cliente; el motor ya existía

**Sólo docs y skills.** Sin runtime tocado. Origen: un research completo de SEO/AEO para un cliente de la práctica, ejecutado de punta a punta en esta sesión (diagnóstico competitivo, línea base medida en Search Console, backlog de striking distance, cinco briefs editoriales depositados en el sistema editorial del cliente).

**El hallazgo que reordena el trabajo futuro.** El carril de striking distance **no era una capacidad por construir**: `keyword-opportunities-reader.ts` (`TASK-1302`) ya calcula el mismo score —clics incrementales contra la curva de CTR de la propia organización— y `/admin/growth/seo/keywords` (`TASK-1308`) ya lo expone, con la canibalización marcada aparte como caso de consolidación. Se reimplementó a mano con un script desechable antes de descubrirlo. La conexión de Search Console del cliente estaba activa y acumulando desde el 2026-07-31, y nadie había corrido la superficie para esa cuenta. La página está gateada por `isSeoModuleEnabled` + `enforceSeoRunEntitlement`, así que la verificación correcta tiene dos partes: que la capacidad exista **y** que esté habilitada para la organización.

**Qué se escribió y quién es dueño de qué** (separación deliberada para no duplicar):
- Oficio → skill `seo-aeo`, `modules/02` y `modules/07` (dos carriles, tres trampas de GSC, curva propia, inflación de clústeres) + la gotcha de que el mensaje de cuota agotada de Semrush MCP afirma falta de acceso al plan.
- Proceso → `docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md` (488 líneas).
- Operación paso a paso → `docs/manual-de-uso/growth/producir-serie-de-briefs-seo.md`.
- Caso de cliente → `docs/audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md` (491 líneas) + `docs/audits/seo/README.md` + registro en el índice de auditorías.
- Venta y estado de cuenta → skill `seo-aeo-practice`, `efeonce/ESTADO_ACTUAL.md`.

**Riesgo documental abierto: dos skills con copias divergentes en el repo.**
- `seo-aeo` entró ahora al lado Claude (nunca había estado versionada ahí; vivía a nivel de usuario, fuera de git). Quedaron 24 de 27 archivos idénticos entre `.claude` y `.codex`. **Siguen divergiendo `SKILL.md`, `SOURCES.md` y `modules/01_SEO_TECHNICAL.md`**, con contenido propio en ambas direcciones — la copia Claude trae un sello de frescura más nuevo (extracción JSON-LD de Google verificada 2026-08-21) que la de Codex no tiene. Reconciliarlos es una fusión con criterio, no una copia.
- `seo-aeo-practice` diverge desde antes: 390 líneas en `.claude` contra 246 en `.codex`. **La copia de Codex no tiene la corrección estructural del 2026-08-15 sobre el alcance del cliente** y sigue afirmando algo que esa corrección declaró invertido. Quedó una advertencia en su encabezado. Un agente que cargue la copia de Codex razonará sobre un alcance equivocado con un cliente real.

**Pendiente, con dueño.** (a) Reconciliar las dos skills — decisión del operador, no se forzó. (b) Correr `/admin/growth/seo/keywords` para el cliente y usar esa cifra como oficial en vez del script ad-hoc. (c) En el sistema editorial del cliente quedan sin definir el estado de lifecycle de los cinco slots y sus enlaces; se dejaron intactos a propósito.

**Verificación.** Cinco briefs verificados en el sistema del cliente por un agente distinto al que los escribió, sobre una lista cerrada de puntos. Las rutas, readers, componentes y tasks citados se comprobaron en disco. No se ejecutó ningún gate de runtime porque el cambio no toca runtime.

**Deriva de espejos: resuelta estructuralmente, no a mano.** `seo-aeo` y `seo-aeo-practice` quedaron reconciliadas byte a byte y **registradas en el manifiesto de `scripts/skills/validate-mirrored-skills.mjs`** (8 → 10 skills). Ese gate ya corría en `local:check`, así que la protección es de pre-push y no depende de que alguien se acuerde; se verificó con un test negativo (drift introducido a propósito → exit 1). Al reconciliar se descubrió que la dirección del drift era la inversa de la supuesta: en `seo-aeo` la copia `.codex` era superconjunto estricto y la de Claude había perdido contenido; en `seo-aeo-practice` se eliminaron siete afirmaciones falsas de la copia `.codex` sobre el alcance comercial de un cliente real.

**Pendiente de decisión del operador, no resuelto:** `.../seo-aeo-practice/modules/03_OFERTA.md` (líneas 55, 207, 245) sigue afirmando que el AEO «lo regalamos adentro», **idéntico en ambas copias**, así que no era drift y quedó fuera del alcance de esta pasada. Contradice la corrección del 2026-08-15 en el mismo sentido que lo que se limpió, pero sus frases son afirmaciones generales sobre la arquitectura de la oferta y no sobre el cliente del caso: no se sabe si la generalización es falsa o si solo lo era la inferencia sobre ese cliente. Resolverlo cambia cómo la práctica cotiza a toda la cartera.

## 2026-08-24 — TeamBot: `@todos` en chats grupales queda descartado

Un envío real a `EO Team` confirmó que el contrato histórico era falso: Bot Framework aceptó `<at>todos</at>` con el `chatId` como `mentioned.id`, pero Teams publicó `todos` como texto plano en una burbuja separada, sin arroba ni notificación colectiva. La burbuja provino de combinar `activity.text` con la Adaptive Card.

La documentación oficial de Microsoft establece que los bots en chats grupales admiten menciones a usuarios, pero no `@everyone`. Se corrigieron arquitectura, invariante Ops, runbook, `TASK-716`, contexto durable y las skills espejadas de plataforma/operación. El diseño de `TASK-716` ahora usa `none | explicit_users`; prohíbe `everyone_in_chat` y `mentioned.id=<chatId>`.

**Estado:** corrección documental completa; el soporte local no confirmado de `--mention-all` se retiró antes del commit y no existe en el runtime versionado. No se realizó un segundo envío.

## 2026-08-24 — ISSUE-163 + TASK-1774: el mecanismo de baja tiene dueño

**Sólo docs.** Continuación directa de la revisión de `TASK-1764`. Sin runtime tocado, sin push.

**Barrido por dominio y superficie antes de reservar el ID** (la regla que evita duplicadas):
ninguna task viva declara `Files owned` sobre `/api/account/email-preferences` ni `unsubscribe.ts`.
`TASK-383` posee `delivery.ts` **sólo** para instrumentación Sentry. `TASK-1397` y `TASK-993`
**dependen** de las primitivas, no las poseen. `TASK-1745` está `complete` y cubre entrega, no opt-out.

**El origen no era una regresión.** `TASK-269` está `complete` con su criterio
`- [ ] POST /api/account/email-preferences permite toggle…` **sin marcar** y sin la página de
preferencias que su Slice planeaba. Por eso el registro correcto es `ISSUE-163` (defecto de runtime)
con `TASK-1774` como dueña del fix — no un slice dentro de la umbrella de footers.

**Decisión de diseño load-bearing de `TASK-1774`: el `GET` NO muta.** Los escáneres de seguridad
corporativos prefetchean los enlaces de un correo; un `GET` que da de baja convierte ese prefetch en
baja involuntaria. La confirmación intermedia elimina la clase entera. El one-click de RFC 8058 sí muta
sin confirmar, porque es el contrato del estándar y lo dispara una acción deliberada en el cliente.

**Partición declarada para no crear un cuarto decisor:** 1774 posee el MECANISMO; el registro de policy
de la foundation de `EPIC-042` posee el DECISOR (mata el default `?? 'broadcast'` y colapsa los tres
decisores actuales). Matar ese default sin registro dejaría el sistema sin decisor, así que **no**
entró en 1774.

**La superficie de preferencias por tipo quedó como lane 7 del epic, sin ID reservado.** Se declara
explícitamente ahí porque un follow-up sin dueño es exactamente cómo se perdió la primera vez.

**Tres Deltas de impacto cruzado:**
- `TASK-1397` (Career Alerts) — `Blocked by: none` → `TASK-1774`. Declaraba que las primitivas proveen
  «signed opt-out»; la mitad es falsa. Es la primera suscripción opt-in real del sistema, donde el
  opt-out es la contrapartida del consentimiento que la propia task modela.
- `TASK-1650` — el drift de dirección pasó de deuda de una superficie a **dependencia dura de
  `EPIC-042`**: en cuanto una cohorte se promueva, esa dirección se imprime en correos productivos.
- `TASK-993` — pregunta al Discovery: ¿destinatarios explícitos o lista? Define si depende de 1774.

**Hallazgo preexistente, corregido después a pedido del operador:** `TASK-993` daba `errors=1 warnings=4`
en `task:lint` por ser anterior a la plantilla vigente (no declaraba `Execution profile` ni `UI impact`).
Verificado primero que era idéntico antes y después de mi Delta — no lo introduje. Luego se completó al
formato vigente: `backend-data`, `Backend impact: api|command|sync`, más contratos Modular Placement y
Backend/Data. **Decisión de alcance dentro de esa corrección:** la afordancia visible del Slice 6 (botón
«Reenviar email a Finanzas» en el modal de corrida mensual) **salió a follow-up `ui-ux` con ID por
reservar**, en vez de escribirle un wireframe acá. Razón: el propio slice la modelaba como opcional
(«otherwise leave UI minimal and rely on endpoint response»), el Goal decía «desde la UI **o** API», y el
modelo operativo pide `backend-data` primero y `ui-ux` después. Inventar un doc de diseño para una acción
secundaria, sin pasar por las skills de producto, habría sido exactamente el doc-para-pasar-el-gate que el
contrato de tasks prohíbe. El endpoint se conserva completo. `task:lint` de las 7 tasks tocadas:
`errors=0 warnings=0`.

**Gates:** `task:lint` 1764/1274/1774 `template=1 errors=0 warnings=0`; `docs:context-check:strict`
verde tras rotar.

## 2026-08-24 — TASK-1764 revisada contra runtime: el gobierno sobrevive, las precondiciones no

**Sólo docs.** `TASK-1764` sigue `to-do`; no se tocó runtime. Revisión con `arch-architect` +
`greenhouse-email` + skills de marca, con cinco verificadores adversariales sobre el código real.

**Lo que sobrevivió intacto:** legacy por defecto, cohorts ≤4 tipos, prohibición de big-bang sobre
`EmailLayout`, rollback por tipo. Es la mayor parte del documento y es lo que contiene el blast
radius. No lo toqué.

**Lo que cambió — cinco precondiciones que el diseño daba por resueltas:**

1. **El unsubscribe no es accionable por ningún método** (link GET → 405; POST one-click RFC 8058 →
   500 por `request.json()` sobre form-urlencoded; POST bien formado → 400 porque lee `action`/
   `emailType` del body y la URL los lleva en el query). No hay página, ni middleware, ni consumer del
   endpoint. Y el default `?? 'broadcast'` lo agrega **solo** a cualquier tipo nuevo enviado a >1
   destinatario: fail-open donde la ADR exige fail-closed. → precondición bloqueante, fuera de la
   umbrella, **ID por reservar**.
2. **Tres decisores** gobiernan el unsubscribe (`EMAIL_PRIORITY_MAP`, `BROADCAST_EMAIL_TYPES`, rama
   batch/secuencial) y ya divergen: `weekly_executive_digest` lleva baja con varios destinatarios y no
   la lleva con uno. Cero tests de coherencia; `EMAIL_PRIORITY_MAP` no aparece en ningún test del repo.
3. **`en-US.emails` es alias del objeto es-CL** (`dictionaries/en-US/index.ts:37`), con comentario que
   difiere la localización "a la child task del rollout de emails" — que es ésta. El bug ya es visible.
   Mismo bug class que `TASK-1754` (Hiring Desk); su test de paridad es el molde.
4. **Cero archivos de correo tocan identidad legal**, y el repo tiene **tres** políticas de ausencia
   distintas (finiquito 409, contractors catch mudo, PDF footer degrada). Adoptada la tercera en la ADR.
   `TASK-1650` (dirección `of 05` vs `Of 1105`) queda como dependencia dura del epic.
5. **Multi-runtime:** 20 tipos ops-worker, 6 Vercel, 3 ambos, 1 sin emisor
   (`payroll_liquidacion_v2`). Lo que migró en `TASK-254`/`773`/`775` fue el drenaje async, no "los
   correos".

**Marca — la pregunta no estaba abierta.** `EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`
(Accepted) ya la responde. `TASK-1274` planteaba "Efeonce **o** Greenhouse", que es un error de capa:
Greenhouse **sí** es marca del portafolio (platform brand). Reanclada a `EPIC-042` como child 0, Open
Question cerrada, regla dura corregida. Hallazgo que la abarata: `AGENCY_FROM_ADDRESS` y
`DEFAULT_EMAIL_FROM` son **la misma dirección** y sólo difieren en display name — adoptar `Efeonce`
como remitente único **borra** la bifurcación en vez de agregar lógica.

**Dos supuestos míos que la verificación refutó, y el operador corrigió antes:** el masthead ya usa el
wordmark de Efeonce en las 30 plantillas (la deuda es de copy, no de logo; y sí existe logo Greenhouse,
en `public/images/greenhouse/SVG/`, usado en el sidebar); y el footer **sí** tiene red de regresión —
vive en un archivo cubierto por `EmailLayout.test.tsx` y por los 17 snapshots de
`EmailTemplateBaseline`. El hueco de cobertura es de **cuerpo** (11 plantillas), no de pie, y pertenece
a las cohorts.

**Decisiones abiertas del operador (bloquean ejecución, no redacción):** ID de la task de unsubscribe ·
dirección `of 05` vs `Of 1105` (`TASK-1650`) · display name definitivo del remitente único ·
`payroll_liquidacion_v2`, ¿futuro o huérfano?

**Gates:** `task:lint` 1764/1274 `template=1 errors=0 warnings=0`; `ops:lint --changed` sin findings
propios (los 14 warnings de epic son parity preexistente de otros epics).

## 2026-08-24 — TASK-1130 rescopada: la mitad estaba cerrada y la otra mitad creció

**Estado: `to-do`, subida a P1.** No abrí ISSUE nuevo: el drift ya tenía dueña y era ella.

**Re-medí en vez de copiar.** La task traía el diagnóstico de junio (19 fallos en 8 archivos). Hoy:
`pnpm test` sin env = **0 fallos**; con `.env.local` sourceado = **23 fallos en 17 archivos**. Creció
porque nacieron tests nuevos que asumen entorno limpio — que es el argumento de la task: **la
fragilidad no se estabiliza, se acumula.**

**Cerrado por `c28e8bead`:** carril `live` serializado, `pnpm test:live` con env acotado, contrato
documentado. Marcado tachado en la task para que nadie lo rehaga. **El diseño que quedó NO es el que
proponía** (no hay `GREENHOUSE_TEST_LIVE` ni scrub en `setup.ts`): en vez de limpiar el entorno
después de contaminarlo, el runner no lo contamina. Eso protege al agente que usa `test:live`; **no**
hace hermético a `pnpm test`, que es el corazón de la task y sigue intacto.

**Slice 0 cerrado por hallazgo:** `EmailTemplateBaseline` estaba «pendiente de clasificar» desde
junio. **Es fuga de entorno**, no drift de snapshot — el diff es un solo token,
`…-greenhouse-public-media-prod` vs `…-dev`, por `GREENHOUSE_MEDIA_BUCKET`/`GREENHOUSE_PUBLIC_MEDIA_BUCKET`.

**Cuatro categorías nuevas, con causa verificada archivo por archivo.** Dos hallazgos de la A no
existían en junio y uno es serio: `growth/forms/pii/encryption.test.ts` verifica «sin key → throw,
NUNCA degrada a sin-cifrado» y **resuelve** con el entorno cargado. Es un test de garantía de
seguridad que el entorno silencia.

**Categoría E, nueva:** con env sourceado `pnpm test` corre los dos proyectos —1600 unit + 44 live—
y el proxy muere con `ECONNRESET`. Los mismos archivos pasan con `pnpm test:live`. Es la consecuencia
directa de que `pnpm test` no sea hermético: con entorno limpio esos live se saltarían solos.

**El drift creció 11× y ahora tiene dos direcciones.** TS→DB: 11 capabilities sin fila
(growth/commercial/platform); junio reportaba 1. DB→TS, dirección nueva y más peligrosa: 3
`data_sources` sembrados que el union TS no reconoce — un portal cliente puede tener un módulo que el
código no resuelve. **No las sembré a ciegas**: el grant correcto lo sabe su dueño.

**Hallazgos abiertos a sus dueños**, que es lo que hace accionable el rescope:
`TASK-1509` (`in-progress`) recibió el Delta de la precondición vencida del agendador — el test
afirma que la superficie no está configurada y hoy sí lo está con datos productivos reales; la
corrección **no** es editar el esperado. `TASK-824` está `complete`, así que su drift quedó sin dueño
activo: lo rastrea TASK-1130 hasta que alguien lo tome.

## 2026-08-24 — Hiring: retorno durable y revisión secuencial implementados localmente

**Estado: commit `631b53c77` publicado en `origin/develop`; rollout detenido por brecha de conformidad.** La pestaña
`Pipeline` sigue siendo el único retorno, pero ahora fija la postulación exacta fuera de límites, consume el
foco de URL y degrada honestamente si el origen no resuelve. Application 360 agrega Anterior/Siguiente dentro
de la misma vacante+etapa, excluye archivadas y protege cambios sin guardar; el orden es cronológico estable,
nunca score/IA. GVC local PASS 1440/390 px en
`.captures/2026-08-24T12-19-59_task355-hiring-application-360` (24 frames por viewport, videos, recorrido
`1 de 2 → 2 de 2 → Pipeline`, morph y foco exacto; runtime 0/0/0/0). Build de producción, typecheck,
ESLint focal y 13 tests focales verdes. La auditoría posterior detectó que el snapshot de Pipeline y el lookup
de foco no filtran `archived_at IS NULL`; una archivada puede reaparecer aunque la cola secuencial la excluya.
Arquitectura, documentación funcional/manual/UI y skills Talent/Motion/GVC quedan sincronizadas. Pendiente:
corregir y verificar ambos readers antes de autorizar release; este turno documental no modifica código.

## 2026-08-23 — Los live tests dejan de pisarse: eran cuatro causas, y una la causaba yo

**Estado: `complete`.** Sin rollout pendiente — es infraestructura de tests, no runtime.

El rojo que había reportado como «contención en la base compartida» tenía **cuatro causas
independientes**, y la etiqueta que le puse escondía tres:

1. **Pool de fixtures compartido.** Tres archivos de `assignment-policy` resolvían su sujeto con
   `ORDER BY ip.profile_id LIMIT n` sobre un pool de **3 perfiles sintéticos**: tomaban los mismos y
   se invalidaban las propuestas entre sí. Canónico nuevo: `resolveLiveTestCandidateFixture(scope)`
   en `live-test-identity.ts` — el sujeto se DERIVA de un scope textual, así que un archivo nuevo
   queda aislado sin coordinación. Se descartó serializar (castiga a toda la suite) y repartir con
   `OFFSET` (se rompe con el cuarto archivo).
2. **Paralelismo por archivo sobre UNA sola base.** Los live tests corren contra la única instancia
   Cloud SQL que comparten dev/staging/prod. `vitest.config.ts` los separa en un proyecto `live` con
   `fileParallelism: false`; los ~12.000 unitarios conservan su paralelismo.
3. **Contaminación de entorno — la causaba mi propio método.** `set -a; source .env.local` exporta
   ~85 variables y tumbaba **15 tests unitarios en 4 dominios ajenos** que afirman DEFAULTS. Nace
   **`pnpm test:live`**, que pasa sólo acceso a base y **rechaza cualquier `*_ENABLED`**. El test que
   afirmaba «nace disabled» ahora garantiza su precondición en `beforeEach` en vez de heredarla.
4. **Proxy caído disfrazado de suite rota.** Sin Cloud SQL Proxy los tests **pasan** y la suite igual
   sale roja, porque quien no conecta es el teardown. `test:live` hace preflight TCP.

**Bug propio destapado por el parity test de TASK-611:** había agregado las dos capabilities de
capacidad al catálogo TS **sin su fila en `capabilities_registry`** — justo lo que ese test existe
para atrapar. Sembradas; el `Down` las deprecia, no las borra.

**Evidencia:** `pnpm test` (CI, sin env) 1590 archivos / 12051 tests, 0 fallos. `pnpm test:live` 44
archivos serializados: de 6 fallos intermitentes a **3 estables**.

**Los 3 restantes NO son míos y fallan aislados también** — estaban escondidos en la sopa paralela y
ahora son visibles y deterministas: 11 capabilities de growth/commercial/platform sin seed en
`capabilities_registry`, 3 `data_sources` de client-portal (`TASK-824`) y una aserción propia de
`TASK-1509`. Sin dueño asignado; candidatos a ISSUE si el operador lo decide.

## 2026-08-23 — TASK-1762: el cierre por capacidad ya no marca a nadie como rechazado

**Estado: `code complete, rollout pendiente`.** Slices 1–5 en `develop` local, **sin push**. Tres
migraciones aplicadas y verificadas contra PG. **Los dos flags están OFF y el correo nace apagado**,
así que hoy no cambia nada para nadie.

**El hallazgo que cambió el diseño.** El ADR afirmaba que no existía fuente de verdad del número de
cupos. Era falso: `hiring_opening.requested_seats` existe desde TASK-353 y **el operador la ve y la
edita como «Cupos»** en el Demand Desk (`DemandDeskView.tsx:981` y `:1240`). Por eso
`hiring_opening_capacity` **NO guarda conteo** — sólo el opt-in y su gobernanza — y `unmanaged` se
expresa como ausencia de política vigente, no como un `NULL`. Un `target_seats` propio habría sido
un segundo «Cupos» decidiendo el cierre de 36 personas mientras la pantalla muestra el primero. El
ADR quedó enmendado en sitio y `Accepted`.

**Lo construido:** política + preview con digest + confirm durable + reconciler + correo propio.
El desenlace que escribe es `not_selected` + `capacity_filled`, **nunca `rejected`**. Un `EmailType`
propio (`hiring_decision_not_selected`) con kill-switch independiente, y la promesa del Banco de
Talento sólo con consentimiento **re-leído al enviar**.

**Tres frenos independientes**, y la independencia es lo que permite un canary: cerrar la cohorte
SIN notificarla. `HIRING_OPENING_CAPACITY_CLOSURE_ENABLED` (ejecución) ·
`HIRING_CAPACITY_FILLED_EMAIL_ENABLED` (sólo correo) · fila de `email_type_config`. **Los dos flags
viven en el `ops-worker`, no en Vercel.**

**Dos bugs que sólo aparecieron ejecutando de verdad:**

1. `runGreenhousePostgresQuery` devuelve el array **ya desempaquetado**: `.rows[0]` compila, pasa
   typecheck y revienta en runtime. Lo cazó el live test corrido **con credenciales** — sin ellas
   decía `skipped`, que a ojo se ve igual que verde.
2. **El `Down` del seed hacía `DELETE`**, y con `checkEmailTypeEnabled` fail-open eso **encendía**
   el correo en vez de deshacerlo — en el peor momento, porque uno hace rollback cuando algo ya va
   mal. Hallazgo de `greenhouse-eo-e8` auditando. Corregido a `enabled = FALSE` antes de commitear.
   **El defecto venía heredado del precedente TASK-1757, que copié fielmente** junto con su cita a
   una función inexistente. Reusar un precedente transmite también sus defectos.

**Bloqueadores reales del rollout, no agenda:**

- **El canary no es ejercitable hoy**: las dos vacantes vivas tienen **0 `selected`**, así que la
  capacidad nunca está llena y el confirm se niega correctamente.
- **`TASK-1764` sigue `to-do`**: sin ella el `EmailType` nuevo cae al perfil de footer **legacy en
  silencio**. Bloquea sólo el correo, no el cierre.
- Falta sign-off de Talent y Privacidad sobre el copy y el gate de consentimiento.

**Decisión tomada, antes implícita:** el cierre masivo **no se federa** como acción de agente. Bajo
el AI Act, selección es alto riesgo con supervisión humana obligatoria. El carril expone `preview` y
`status` como lecturas.

**Deuda ajena señalada, no tocada:** el seed de TASK-1757 tiene el mismo `Down` con `DELETE`. e8
midió que su fila está hoy `enabled=true`, así que **no hay riesgo vivo** —borrarla la deja en el
mismo estado efectivo—: es una trampa latente que se arma sólo si alguien pausa ese correo y después
revierte. Limpieza, no urgencia.

Próximo paso: `TASK-1763` (consumer UI) recibe el DTO del preview y el command sin duplicar reglas.

## 2026-08-23 — Release a producción `709e15f6688e`: los follow-ups de Hiring quedaron vivos

**Estado: `released`.** Manifest `709e15f6688e-639df794-8604-4053-8fcf-d2419cfedcc4`, orquestador
`32668879867` (un solo run, sin retry), PR #206 squash a `main` como
`709e15f6688e521549c0376f11b08340737f37a7`. 140 archivos, 73 de código, 5 migraciones. Segundo
release del día, sobre el `304371f73407` de la madrugada.

**Qué quedó vivo en producción:** contract del enum de decisión e invariante de cerrado (TASK-1765),
contract del vocabulario de etapas (TASK-1754), backfill del archivo sintético sobre el eje nuevo y
allowlist de la purga (TASK-1748), callejón de intentos en la asignación de assessment (TASK-1755),
predicado canónico de proceso activo con su señal de reliability (TASK-1772) y las fronteras del
EPIC-011 (TASK-1773).

**Sin flags que prender.** `HIRING_FAIRNESS_MONITOR_ENABLED` **queda OFF a propósito**: TASK-1754
Slice F le puso condición de retiro explícita hasta que cierre TASK-1365, porque su default
`input.stage ?? 'selected'` apunta a una etapa que el contract retiró y devolvería **cero en
silencio** en una métrica de equidad — que se lee como «no hay impacto adverso», la conclusión
contraria a la verdad.

**Evidencia de estabilidad (no sólo el health check):** watchdog 3/3 signals `ok` con
`drift_count=0`; `/api/auth/health` 200 con los tres providers `ready`; Vercel
`dpl_HRDEBU5MDSTswRjX6V6bWPGK4Det` Ready y aliased a `greenhouse.efeoncepro.com`; Sentry con **cero
issues activos** en la ventana del release; **321 eventos de outbox `published`** desde el dispatch,
sin `dead_letter` ni backlog >10min; **145 eventos reaccionados con `con_error=0`**. Los `degraded`
del dashboard de operaciones se verificaron por timestamp y son fallos de **abril–mayo 2026** —
deuda previa, no del release. `ops-worker` quedó change-gated en `181aaf4f75ca` con diff vacío
contra la lista real del gate y `Ready=True`: residual de etiqueta, no drift.

**Render verificado con sesión, no sólo con un 307.** Como el árbol de `main` y `develop` quedó
idéntico (`b34bca9490…`), staging sirve el mismo código: `/agency/hiring/pipeline` responde HTTP 200
sin marcadores de error y con las **seis etapas** de TASK-1754 en el HTML.

**Dos defectos de la documentación de release corregidos en este mismo cierre:**

1. **El comando que verifica el `ops-worker` usaba una lista de rutas que no existe en ningún gate.**
   Skill y runbook arrastraban 7 entradas (`src/lib/ops` y `scripts/ops-worker` ni siquiera figuran
   en el array real); el gate son las ~28 de `WORKER_RUNTIME_PATHS` en `ops-worker-deploy.yml`,
   entre ellas `src/lib/reliability`, `src/lib/hiring/talent-pool` y `src/lib/sync` — **las tres
   tocadas por este release**. La lista corta devolvía «vacío» sin haber mirado. Ahora el comando
   **extrae la lista del workflow** y exige un sanity sin `--`, porque un diff vacío por SHA no
   resuelto se ve igual que uno vacío por ausencia de drift.
2. **`-X ours` duplicó contenido documental y las dos verificaciones duras no lo vieron.** Salieron
   ambas vacías y el merge igual resucitó 8 tasks en su lifecycle viejo y duplicó un bloque de 10
   líneas del manual de Hiring Desk que `develop` ya tenía: `-X ours` sólo decide los hunks en
   conflicto, y uno de `main` que aplica limpio en otra parte entra como adición silenciosa. Se
   resolvió con `git reset --hard HEAD@{1}` + `git merge origin/main -s ours`. **El default del Paso
   A pasa a ser `-s ours` cuando `main ⊆ develop`**, y la auditoría correcta es
   `git diff HEAD@{1} HEAD --name-status` completo, no sólo las rutas de código.

Tiempos en `docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` (~1h10m E2E, workflow 12m45s,
manifest 9m50s). Skills Claude/Codex actualizadas en paridad total.

## 2026-08-23 — TASK-1772: los dos predicados convergieron, y convergieron al valor equivocado

**Estado: `code complete, rollout pendiente`.** Slices 1-5 en `develop` local, **sin push**:
`0794b6ff1`, `31f04ed42`, `03a33a55a`, `d430990df`, `1206c0f44`. `ISSUE-162` cerrado y movido a
`resolved/`. La task ya está en `complete/` porque no depende de flags, migraciones ni deploy: es un
cambio de LECTURA sin escrituras, y su efecto ya es visible contra la base compartida.

**La condición que `TASK-1765` dejó escrita se cumplió, y su conclusión igual estaba mal.** Decía
«cuando los dos predicados converjan, el cambio es puramente de claridad». Convergieron (82 y 82) — y
convergieron contando como vivas 32 postulaciones archivadas. La respuesta no era ninguno de los dos
candidatos: **son TRES ejes**, y el tercero (`archived_at`) nació el mismo día que el ADR sin que
ningún consumidor lo incorporara. **Cuando una task deja una deuda con la condición «cuando A y B
converjan esto es cosmético», la condición se verifica midiendo: dos predicados pueden converger y
estar los dos mal.**

**Daño real medido, no aritmética de dashboard:** 5 personas **reales** figuraban `active_process` en
el Banco de Talento —o sea buscables e invitables— únicamente por una postulación archivada. Pasan a
`needs_reconsent` (54 → 49).

**Once copias, no ocho.** La spec contaba 8; la segunda familia agregó 2 más (`ISSUE-162`) y la
onceava la encontró **calibrar el gate del Slice 4**, no un barrido manual: un docstring que se
declaraba «espejo VERBATIM» de la señal y había dejado de serlo. Correr el gate y mirar qué encuentra
completó un inventario que dos barridos manuales dejaron corto.

**Un defecto que casi cometo dentro de su propio arreglo:** la primera versión le recortaba una mitad
a la conjunción con `split(' AND ').at(-1)` para que `dead-ends.ts` compusiera sólo visibilidad. Eso
sobrevive a que el predicado crezca un eje y suelta `archived_at` **en silencio**. Los ejes se
exportan como piezas nombradas: componerlas falla al compilar, recortar strings no falla.

**Declarados FUERA con su razón** (un `grep` es un inventario, no una prueba): `documents/retention.ts`
—ese `NOT EXISTS` protege de la purga, migrarlo la haría más agresiva y borrar no es reversible—,
`store.ts:1341` (guard de un write) y `hiring-application-outcome-signals.ts` (mide otra pregunta).

**Readback:** `awaiting_terminal` 13 → 3 sobre base limpia; `drift` 0; Banco de Talento 54 → 49.
Gate probado en las dos direcciones (falla sobre reintroducción, pasa sobre el árbol migrado).

**Residuo RESUELTO, y el arreglo fue la capacidad, no la limpieza.** Mi primera corrida de live
tests murió a mitad (proxy Cloud SQL caído) y dejó 8 postulaciones de humo sin archivar
(`EO-APP-0234`…`0241`). Limpiarlas exigía mutar las 43 no-reales + 16 fichas + 18 vacantes, porque
`--archive` mandaba el plan entero.

La capacidad ya existía y el CLI la pisaba: `ApplyPurgeInput` recibe allowlist en los tres niveles y
su contrato dice «Omitirlo NO archiva ninguna». `a913a6998` hace que el CLI la respete —`--archive`
EXIGE `--allowlist`, el plan completo queda tras un `--all` explícito— y mueve la validación a la
biblioteca con 7 tests. El carril de BORRADO **no** acepta allowlist ni `--all`: archivar es
reversible, borrar no, y ahí lo que decide no es QUÉ considerar sino SI califica.

Readback **medido** (2026-08-23T17:54:19Z), no esperado:

| Métrica | Antes | Después |
|---|---|---|
| `awaiting_terminal` | 5 | **3** (+12 en `awaiting_terminal_excluded_archived`) |
| `assignment_dead_ends` | 1 | **0** |
| `active_process_predicate_drift` | 0 | **0** (`canonical` 50, `archived_gap` 40; 90 − 40 = 50) |

El `assignment_dead_ends = 1` que otra sesión leyó como «apareció un callejón de una persona real»
era `EO-APP-0241`, `smoke_test`, de este mismo residuo. Verificado por columnas nombradas antes de
concluir.

**Rollout VERIFICADO en runtime (2026-08-23T18:18Z), no sólo desplegado.** Push
`099ada848..181aaf4f7`, CI 10/10 en verde incluidos los cuatro deploys de workers Cloud Run. El
ops-worker corrió la projection del Banco de Talento con el predicado nuevo:

```
active_process = 47 · needs_reconsent = 26
membresías active_process SÓLO por una postulación archivada = 0   ← el defecto, cerrado
```

⚠️ **No dio el 49 que anuncié, y la diferencia no es un error del cambio.** Entre la medición del
dry-run y ésta se archivaron las 8 del residuo y otra sesión marcó fixtures como sintéticos, así
que la población se movió por dos causas legítimas. Lo que vale como evidencia NO es el total sino
el invariante: **cero** membresías activas por un registro archivado, medido directamente. Un total
absoluto sobre una base que varias sesiones mutan no es reproducible; el invariante sí.

**Deuda destapada, sin dueño:** `assign.live.test.ts` y `propose-confirm.live.test.ts` crean fixtures
**sin declarar `dataOrigin`**, así que nacen `real`. El gate `hiring-data-origin-gate` barre
`scripts/` y `tests/e2e/`, **no** `src/**/*.live.test.ts`.

**Gates:** `pnpm lint` y `pnpm typecheck` limpios · `hiring` + `reliability` 1.908 verdes ·
`task:lint` `errors=0 warnings=0` · gate de source 0 hallazgos. `pnpm test` completo y `pnpm build`
**no** se corrieron (el build consume ~30 GB y espera autorización del operador).

## 2026-08-23 — EPIC-042: el mockup aprobado ya gobierna la implementación futura de footers

**Estado: documentación y skill completas; runtime sin cambios.** `TASK-1764` continúa como umbrella y la ADR
sigue `Proposed`: todavía no existe la child foundation ejecutable ni se habilitó ningún footer gobernado.

La ruta `/admin/emails/footer-profiles/mockup`, su vista/data, el SSOT de marca, los PNG transparentes y los
contratos UI quedaron registrados como baseline aprobado. Los cinco perfiles visuales mapean a siete `purpose`;
suscripción opcional y marketing conservan reglas distintas. Toda child futura debe demostrar paridad 720/390,
Outlook Desktop Windows/OWA, Gmail, un cliente WebKit e imágenes bloqueadas, con fallback accesible de RRSS.

La auditoría final cubrió 10 estados desktop/mobile: cero overflow, contraste mínimo 4.51:1, targets 24/32 px,
foco visible, headings `h1 → h2 → h3`, listas/tablas nativas y GVC 1440/iPhone 13 sin errores de consola, página,
hidratación o red. Esto valida el mockup local; no es evidencia de React Email ni de entrega.

La skill espejo `greenhouse-email` ahora carga este contrato, corrige `broadcast !== marketing`, fija Efeonce como
masterbrand y conserva rollout legacy/cohorts sin big bang. Siguiente paso: aceptar la ADR y recién entonces abrir
la child foundation byte-idéntica; el mockup no prueba React Email, envío, deploy ni provider.

## 2026-08-23 — TASK-1771: el carril automático tiene reversa; el gate vivo casi manda un correo

**Estado: `code complete, rollout pendiente`.** Slices 1-4 en `develop` local, sin push: `617d18df7`,
`146242339`, `d5914c841`, `0f558666a`. Más `ISSUE-162` (`9d1db5252`) y la recalibración de la spec
(`12868f9c7`). Nada desplegado, así que la task **no se mueve a `complete`**.

**Dos premisas de la spec estaban muertas al empezar, y las dos cambiaban decisiones.** La restricción de
orden («va ANTES del colapso de `TASK-1754`») ya no aplica: esa task cerró y aplicó su contract. Y las 4 filas
en callejón **ya no están `closed`** — `TASK-1748` cambió el archivado para sellar `archived_at` en vez de
escribir la etapa, así que volvieron a cumplir `stage = trigger_stage`. La decisión no cambia (**sin
backfill**, siguen siendo smoke), pero el filtro de procedencia del reader dejó de ser higiene: sin él la
métrica nacía en 2 y su steady = 0 era inalcanzable el primer día.

**La condición de avance es «hoy resolvería `assigned`», no «difiere de lo registrado»**, y no es preferencia.
Ejercitando el resolver real contra PG sobre las cuatro filas: dos dicen `volume_cap` y hoy evaluarían
`policy_disabled`. Con el criterio laxo el command las libera para volver a quemar la clave con otra razón —
y cada ciclo inútil **gasta una de las tres recuperaciones de esa persona**, así que le consume el presupuesto
a quien dice ayudar.

**🔴 El gate vivo asignó de verdad en una versión intermedia** y dejó un `hiring.assessment.assigned` en
estado `pending` —el evento del que cuelga el correo al candidato— apuntando a una instancia que el teardown
ya había borrado. El publisher corre **cada 2 minutos sobre la base compartida**. Se retiró con
verify-then-delete; readback posterior 0. La causa no fue el teardown: el encabezado del test **afirmaba** que
nunca llegaba a `assigned`, y eso era cierto cuando se escribió. **Un comentario no es una guarda.** Quedó
enforced (la policy se apaga antes del reintento + assert de cero instancias).

**Un verde falso que vale para todos:** leí «exit 0» de `pnpm typecheck | grep | head` — era el exit del
`head`. Un import roto pasó como verde. **Nunca leer el exit code de un comando encadenado.** Lo cacé por una
ausencia en `git diff --cached --stat`, no por un gate.

**Gates:** `pnpm lint` exit 0 · `pnpm typecheck` exit 0 · `src/lib/hiring` + `src/lib/reliability` 1.812
verdes · gate vivo 2/2 en dos corridas seguidas, `awaiting_terminal` = 13 antes y después. `pnpm test`
completo y `pnpm build` **no** se corrieron (el build consume ~30 GB y espera autorización).

**Pendiente bloqueante para cerrar:** release + la `Production verification sequence` + la migración del
`COMMENT` de `superseded_at`, parqueada en `docs/tasks/pending-migrations/` con su condición (**el release que
despliega el command ya ocurrió**, verificado contra `origin/main`). Aplicarla antes describiría en la base una
capacidad que el runtime desplegado no tiene — el error simétrico de `ISSUE-161`.

## 2026-08-23 — TASK-1754 Slice F: el contract está escrito y revisado; falta aplicarlo

**Estado: `code complete, migración pendiente de aplicar`.** `pnpm pg:connect:migrate` quedó bloqueado por
el clasificador de permisos y espera autorización del operador. **El `CHECK` de la base sigue admitiendo
las trece etapas**; el candado de seis vive hoy sólo en la aplicación.

**El método que autorizó a angostar, y que hay que reusar.** No fue contar filas —«cero filas» no es «nadie lo
escribe»— sino el contrato de la superficie desplegada: en `origin/main` hay **tres** escritores de
`hiring_application.stage`, los tres acotados por tipo (`store.ts:1249`/`1340` vía
`assertEnum(HIRING_PIPELINE_STAGES)`; `decide.ts:299` vía `DECISION_STAGE` → siempre `closed`). La unión son los
seis que quedan. El `stage = $n` de `store.ts:666` es un **filtro**, no una escritura: el falso positivo típico
de un grep laxo.

**Lo que cambió además del enum 13 → 6.** `TERMINAL_APPLICATION_STAGES` nace como fuente única (antes tres
copias verbatim en los guards de assessment). `STAGES_DOWNSTREAM_OF_TRIGGER` se **reescribió, no se podó**:
`client_review` figuraba aguas abajo de `shortlisted` y el colapso la absorbió dentro, así que mandaba a la
cola humana postulaciones que la reconciliación sí recupera.

**Deuda declarada a propósito.** `FAIRNESS_REPORTABLE_STAGES` conserva tres literales muertos: son el default
de `getSelectionFairness` (`input.stage ?? 'selected'`) y re-apuntar su cubo terminal cambia **qué mide** el
four-fifths rule, lo que no cabe en un contract de vocabulario. Mitigación: falla ruidoso
(`hiring_fairness_stage_retired`, 422) en vez de devolver cero, que en equidad se lee como «no hay impacto
adverso». Condición en el ledger: `TASK-1365` cierra **antes** de prender `HIRING_FAIRNESS_MONITOR_ENABLED`.

**Corrección posterior al commit (`ddb38d3a6`).** El `.sql` quedó dentro de `migrations/` porque la premisa
era aplicarlo en la misma sesión; al bloquearse el comando esa premisa murió y el archivo pasó a ser una mina:
una migración committeada y sin aplicar **no espera su turno** — el próximo `migrate:up` de cualquier sesión la
aplica sin su readback. Movida a `docs/tasks/pending-migrations/` con su condición y su readback en el
encabezado. **Regla: si no se aplica en la misma sesión que la escribe, no vive en `migrations/`.**

**Gates:** `typecheck` limpio, `pnpm lint` limpio, suite del dominio 1.236 verdes. El guard derivado
`stage-enum-check-parity.live.test.ts` **falla a propósito** ahora (enum 6 ≠ `CHECK` 13): es el readback que
se pone verde al aplicar. Readback previo tomado: 13 valores, **0 filas** en las siete etapas retiradas.

## 2026-08-23 — El dominio de Hiring está en producción; faltan tres migraciones y su autorización

**Release verificado.** `304371f734076e2bfc96529712d2fa63a179bf84` (PR #205), orchestrator run `32610182477`
success, manifest `304371f73407-ef375a47-…` en `released` (9m49s), watchdog `ok` con `drift_count=0`, health 200. Un solo run, sin retry. Subieron TASK-1765, TASK-1754, TASK-1748 y TASK-1755, más el fix de la regresión
de retención de la Ley 21.719 para `not_selected` — que se volvía viva justo cuando el release habilitaba el
desenlace, así que viajó dentro.

**Lo que falta, y por qué no lo hice.** Las tres migraciones de `docs/tasks/pending-migrations/` siguen sin
correr. Sus dos precondiciones están **verificadas contra `origin/main`**, no contra el working tree: `main` ya
no ofrece `on_hold` en el eje de Hiring (los hits que quedan son dos comentarios que documentan el retiro y un
`case` del pipeline de servicios, otro enum), y el filtro de procedencia corre en los dos runtimes — en el
`ops-worker` con código byte-idéntico, verificado con diff completo, no con la lista del change-gate. El orden
es cadena: contract del enum → backfill → invariante, con readback esperado **`1 → 0`** (si sale 33, el backfill
no corrió y se para). **Mutan la base compartida de producción y son irreversibles: esperan autorización
directa del operador.** Mientras no corran, las cuatro tasks se quedan en `in-progress/`, que es su estado
correcto.

**Dos cosas del camino que valen para el próximo release.** El merge canónico `-X ours` resucitó cuatro
archivos en su ubicación de lifecycle vieja (ISSUE-160 en `open/`, TASK-1745 en `in-progress/`, TASK-1747 y
TASK-1748 en `to-do/`): no es el modify/delete conocido, y **las dos verificaciones duras no lo detectan porque
son sobre código** — hay que buscar duplicados de lifecycle a mano. Y el bloqueador real estuvo antes del
dispatch: staging en `Canceled` por los pushes docs-only del día, resuelto tocando un doc de
`deployControlDocs` que el release necesitaba igual, no con un bypass.

**El hueco del change-gate quedó medido por otra sesión** en la Delta de `TASK-930` (`72c681a3c`): 62 rutas que
el `ops-worker` importa contra 24 vigiladas, 33 sin cubrir, incluida `src/lib/postgres/client`. Un release que
toque una de esas puede dejar el worker viejo con el watchdog en `ok`.

## 2026-08-22 — TASK-1748: archivar dejó de fingir cierres, y el orden de sus slices no era preferencia

Estado correcto: **`code complete, rollout pendiente`**. Slices 1 y 2 en `develop` local, sin push:
`1d0b4e32a`, `b0415ef50`, `5fd8e5245`, `afed7098f`. `pnpm test` completo → **11.960 verdes**; `pnpm lint` y
`pnpm typecheck` → 0 errores; `pnpm build` **no** se corrió (pendiente de autorización del operador, ~30 GB).

**Lo que cambió.** `archiveSyntheticRecords` archivaba escribiendo `stage='closed'`, y ese `UPDATE` es el origen
de las 32 filas `closed` sin desenlace que ensuciaron el diagnóstico de la auditoría del vocabulario. Ahora
escribe `archived_at` —eje propio— y cubre las tres entidades sobre allowlist explícita. El Banco de Talento
filtra por procedencia, con el predicado viajando por JOIN a `identity_profiles` porque `candidate_facet` no
tiene `data_origin` propio.

**El hallazgo que reordena el trabajo, y la spec decía lo contrario.** El `Slice 1` y el `Slice 2` **no son
independientes**. La migración del Slice 2 devuelve las 32 filas fuera de `closed`; el predicado
`stage NOT IN ('rejected','withdrawn','closed')` de `talent-pool/projection.ts` pasa entonces a dar
`has_active_application = true` para sus 11 fichas, la projection las reclasifica a `active_process` —que sí es
servible— y esa projection corre **cada 5 minutos** por Cloud Scheduler. Sin el filtro desplegado arriba, la
migración **causa** el defecto que la task vino a cerrar. Por eso quedó parqueada en
`docs/tasks/pending-migrations/` con condición de **código desplegado en los dos runtimes** (Vercel para los
readers, `ops-worker` para la projection), no de datos.

**Dos reglas nuevas que valen fuera de esta task:**

- **Se filtran los caminos que CREAN; el que CORRIGE converge.** La primera versión excluía las membresías
  sintéticas del `UPDATE` de ciclo de vida, y eso no las excluía: las **congelaba**. Una congelada en
  `pool_eligible` habría quedado visible para siempre sin que ninguna corrida pudiera sacarla.
- **Un filtro nuevo puede sacar de su steady a una señal que no tocaste.** `hiring.talent_pool.integrity` cuenta
  fichas activas «aún no proyectadas»; desde que la projection no proyecta sintéticos a propósito, esa premisa
  es falsa y la señal habría quedado en `warning` permanente — una alarma que no puede volver a cero entrena a
  ignorar el tablero.

**Trampa cara, verificada en `src/lib/postgres/client.ts` junto con la sesión de TASK-1765/1754:** anidar
`withGreenhousePostgresTransaction` **no aísla nada**. El helper llama `acquireGreenhouseTransactionClient()`
incondicionalmente, así que la transacción de adentro toma otra conexión y hace su propio `COMMIT`; el
`ROLLBACK` de afuera no la alcanza. Envolví un `reconcileTalentPoolProjection({apply:true})` creyendo que se
revertía y **commiteó contra la base compartida**. Efecto medido: idéntico a un tick del cron (441 filas de
evidencia borradas y reinsertadas iguales, 0 membresías creadas, 0 reclasificadas). Sin daño, verificado
post-corrida.

**Siguiente paso:** el release. Después, en este orden: aplicar la migración parqueada del cambio de eje →
readback (`0` no-real en `closed`, invariante 33 → 1) → correr el archivado de 11 fichas + 14 vacantes por CLI →
recién ahí el `CHECK` de `TASK-1765`. El `Slice 3` (lane B, borrado irreversible) tiene **doble bloqueo**:
sign-off del operador y esa migración — hoy el plan reporta `deletable=0` porque las 32 siguen en `closed` y el
lane exige `stage='sourced'`.

**Deuda abierta que toca este dominio:** 12 live tests de hiring crean vacantes sin declarar `dataOrigin`, así
que nacen `real` y publicables en la base compartida; `pnpm hiring:data-origin-gate` no las ve porque sólo barre
`scripts/` y `tests/e2e/`. Dos perfiles de identidad sintéticos (`identity-live-test-hiring-fixture` y el smoke
de TASK-354) siguen marcados `real` y esperan el marcado gobernado. Queda propuesto como trabajo aparte.
