# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-26 — Berel: noviembre y diciembre quedan producidos y atomizados

**Estado vivo observado:** [`Noviembre 26`](https://app.notion.com/p/3c839c2fefe78166b1ccef16538c46c6) contiene N43–N47 y 45 tareas; [`Diciembre 26`](https://app.notion.com/p/3c839c2fefe78160992fd31d5b96feb0), N48–N50 y 27 tareas. En conjunto: 8 reescrituras, 32 banners, 32 derivados y 32 subítems sociales.

**QA de Notion:** cuatro derivados por artículo; tareas sociales `Sin empezar`, subítems `En curso`; fechas sociales 15 de noviembre y 13 de diciembre. Se compararon los 32 pares tarea/subítem y los 32 conservaron igualdad exacta de cuerpo, además de proyecto, tarea principal y relaciones inversas.

**Drift vivo de calendario:** la relectura posterior devolvió las 40 tareas preexistentes de artículo/banner —25 de noviembre y 15 de diciembre— en `Listo para diseñar` con fecha `2026-09-11`. Contradice los meses del proyecto. No se corrigió porque esta pasada solo autoriza repo/docs; Operaciones de contenido debe confirmar la fecha y, si corresponde, restaurarla por la vía canónica con lectura posterior.

**Gates abiertos del cliente:** N48 es archivo de 2024 y requiere vigencia/derechos; N49 requiere revisión institucional y no admite CTA comercial; N50 espera confirmar consolidación y canónica. No se produjo arte, no se publicó en CMS y no se programaron redes. Evidencia: [`auditoría fechada`](docs/audits/seo/BEREL_NOVEMBER_DECEMBER_2026_CONTENT_PRODUCTION_2026-08-26.md).

## 2026-08-26 — TASK-1773: el eje de desenlace gana carril gobernado

**Estado: `code complete, rollout pendiente`.** Sin push. `pnpm test` 12.098 verdes, `build` exit 0, `local:check` exit 0, `task:lint` 0/0.

**Lo que falta para operarlo:** `NEXA_HIRING_ACTIONS_ENABLED` nace OFF (prenderlo exige sign-off: bajo el AI Act la selección es alto riesgo con supervisión obligatoria) y falta ejercitar el loop contra staging con la persona agente de menor privilegio. La escritura por MCP queda **diferida con razón**: su registro vive en el repo hermano `efeonce-mcp` y `efeonce.mcp.hiring.write` está bloqueado hasta `TASK-1631`.

**No re-descubrir:** la spec pedía copiar el patrón del Banco de Talento y **no calza** —no hay tabla de propuestas de decisión y `Migration: none`—, por eso el guard es un digest efímero. Y Nexa tiene autoridad más angosta que el portal a propósito: sólo cierra una postulación abierta, porque su contrato de acciones no puede cargar la huella del preview al execute.

**Lo que queda visible y con nombre:** el manifiesto de parity declara **18 capabilities `hiring.*` sin carril**. Es el barrido que la propia task pedía en sus Follow-ups.

## 2026-08-26 — TASK-1751: la rendición del assessment deja de perder respuestas

**Estado: `complete`.** Sin push. `pnpm test` completo verde (12.062), `local:check` exit 0, los cuatro gates de UI en PASS, scorecard 4.54.

**Lo que dejó la captura premium, y es el argumento a favor de correrla:** cuatro defectos que ningún test veía — contraste AA pre-existente de 2.43:1 en el contador, el placeholder haciendo de **nombre accesible** del textarea (anti-patrón de años), un ícono de «enviar» sobre un mensaje de «no puedes enviar», y la superficie sin declarar su recipe. Un quinto hallazgo era del gate, no del código: el stepper ya vive en un scroller contenido, así que se declaró la excepción en vez de romper el patrón. Seed ejecutado y limpiado, residuo verificado en cero.

**No re-descubrir:** de los 4 defectos declarados **2 no existían** (el reloj ya era `sticky`; los avisos nunca fueron sólo `srOnly`), y la copy que el wireframe proponía —«puedes enviar lo que alcanzaste a guardar»— es **falsa**: el servidor exige la evaluación completa, así que con faltantes enviar es imposible y el CTA no se renderiza. Detalle en el `## Delta 2026-08-26` de la spec.

**Riesgo residual:** el guardado preventivo nunca se ejercitó contra runtime real; su respaldo son tests unitarios más el test del borde `answer_deadline − ε` que esta task agregó porque no existía.

## 2026-08-26 — Hiring: auditoría de estado real y corrección de la contabilidad documental

**Sólo documentación; runtime intacto.** Detalle completo, método y hechos verificados: [`auditoría fechada`](docs/audits/hiring/GREENHOUSE_HIRING_DOMAIN_STATE_AUDIT_2026-08-26.md).

**El error que hay que no repetir.** `main` promueve por **squash**, así que los SHAs de `develop` no quedan como ancestros aunque el contenido esté desplegado. Leer `rev-list --count origin/main..origin/develop` como «trabajo sin desplegar» produjo un diagnóstico falso. Para saber si algo está en producción, comparar **blobs por ruta**, no contar commits. Último release: `709e15f66` (2026-08-23).

**Estado real:** las 7 tasks `in-progress` no tienen código pendiente salvo dos fixes puntuales; lo que falta es evidencia y verificación. `TASK-1771` está en producción y sólo debe su verification sequence; `TASK-1719` sólo la evidencia del monitor de 7 días (ventana ya transcurrida); `TASK-1757`, una sola rotación real.

**Corregido:** `.claude/rules/hiring.md` (auto-load, afirmaba en presente un `CHECK` aplicado el 08-23), el ledger de flags, ocho entradas de `docs/tasks/README.md`, seis `Status real`, la paridad de `Child Tasks` de `EPIC-011` y el alcance de `TASK-1751`, que perdió la mitad de su premisa.

**Pendiente con dueño, por retorno:** (1) `TASK-1746` — `purge_assessment_access_recovery` con **cero callers**: la retención de 12 meses no se ejecuta; único hallazgo con filo legal. (2) `TASK-1718` — el fix H-10 sigue sin escribirse. (3) `TASK-1742` — re-verificar el canary tras los fixes del 08-19. (4) `HIRING_VACANCY_AI_ENABLED` — ON en Production hace 41 días **sin** el smoke de staging que era su precondición: decidir si se corre o se declara superado. (5) `TASK-1747` — re-auditar sus 8 hallazgos «abiertos»; es triage, no código.

**Verificación.** `pnpm ops:lint --changed`: 6 tasks `errors=0 warnings=0`, warning de paridad de `EPIC-011` cerrado. `pnpm task:lint --task TASK-1751` verde. Sin gate de runtime: el cambio no toca runtime.

## 2026-08-26 — Berel: producción creativa de octubre creada y auditada en Notion

**Estado vivo:** [`Produccion Creativa - Octubre 26`](https://app.notion.com/p/3c839c2fefe7813c9450e2f35cb4021e) está `En curso`: 8 artículos N35–N42, 32 banners, 32 derivados y 32 subítems sociales. Fechas: 7, 14 y 16 de octubre, respectivamente.

**Evidencia y siguiente paso:** producción editorial N35–N42 completa para revisión. La lectura final corrigió 54 fechas y validó las 18 filas nuevas más la paridad de 8 tareas/subítems. N41–N42 aún son soft-404: bloquear enlaces, CMS y redes hasta QA. Detalle: [`auditoría fechada`](docs/audits/seo/BEREL_OCTOBER_2026_CONTENT_PRODUCTION_2026-08-26.md).

## 2026-08-25 — Vacaciones contractor por aniversario y mensajes TeamBot 1:1

**Sólo documentación y skills en esta pasada; no se cambió runtime.** Se documentó el caso acotado de Melkin Hernandez (`hire_date=2025-07-15`) y Andrés Carlosama (`hire_date=2025-11-11`), ambos `contractor` + `international` + `deel`. Sus perfiles muestran 15 días disponibles, 0 usados y 0 reservados. Nexa ya les comunicó individualmente que los 15 días se vinculan al primer aniversario, con Daniela como supervisora inmediata y al menos cinco días hábiles de anticipación.

**Drift abierto:** el runtime entrega hoy 15 días fijos incluso a Andrés antes del aniversario; la carta global de beneficios describe 15 días anuales prorrateados y progresión por antigüedad; la comunicación aprobada del caso usa el primer aniversario. No se generalizó ninguna de las tres como política nueva. Auditoría: `docs/audits/payroll/CONTRACTOR_VACATION_ANNIVERSARY_AUDIT_2026-08-25.md`.

**TeamBot:** `pnpm teams:announce` sigue siendo group/channel-only y el CLI 1:1 existente es exclusivo de pagos. Para un one-off genérico aprobado, las skills y el runbook admiten únicamente un puente temporal sobre el dispatcher/audit writers canónicos, con Entra revalidado, card-only, preview/confirmación, idempotencia, deduplicación y `source_sync_runs`. `succeeded` no es read receipt. Los mensajes recurrentes convergen a Notification Hub `dynamic_user`.

**Pendiente con dueño:** People + Payroll + Legal deben decidir la política contractual de vacaciones para contractors Deel; después corresponde corregir precedencia/cálculo, reconciliar saldos y alinear carta, acuerdos y copy. No se abrió ADR porque aún no hay decisión aceptada.

## 2026-08-25 — Metodología SEO editorial documentada + caso de cliente; el motor ya existía

**Sólo docs y skills.** Sin runtime tocado. Origen: un research completo de SEO/AEO para un cliente de la práctica, ejecutado de punta a punta en esta sesión (diagnóstico competitivo, línea base medida en Search Console, backlog de striking distance, cinco briefs editoriales depositados en el sistema editorial del cliente).

**El hallazgo que reordena el trabajo futuro.** El carril de striking distance **no era una capacidad por construir**: `keyword-opportunities-reader.ts` (`TASK-1302`) ya calcula el mismo score —clics incrementales contra la curva de CTR de la propia organización— y `/admin/growth/seo/keywords` (`TASK-1308`) ya lo expone, con la canibalización marcada aparte como caso de consolidación. Se reimplementó a mano con un script desechable antes de descubrirlo. La conexión de Search Console del cliente estaba activa y acumulando desde el 2026-07-31, y nadie había corrido la superficie para esa cuenta. La página está gateada por `isSeoModuleEnabled` + `enforceSeoRunEntitlement`, así que la verificación correcta tiene dos partes: que la capacidad exista **y** que esté habilitada para la organización.

**Qué se escribió y quién es dueño de qué** (separación deliberada para no duplicar):

- Oficio → skill `seo-aeo`, `modules/02` y `modules/07` (dos carriles, tres trampas de GSC, curva propia, inflación de clústeres) + la gotcha de que el mensaje de cuota agotada de Semrush MCP afirma falta de acceso al plan.
- Proceso → `docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md` (488 líneas).
- Operación paso a paso → `docs/manual-de-uso/growth/producir-serie-de-briefs-seo.md`.
- Caso de cliente → `docs/audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md` (491 líneas) + `docs/audits/seo/README.md` + registro en el índice de auditorías.
- Venta y estado de cuenta → skill `seo-aeo-practice`, `efeonce/ESTADO_ACTUAL.md`.

**Deriva de skills, resuelta.** `seo-aeo` no estaba versionada del lado Claude (vivía a nivel de usuario, fuera de git) y `seo-aeo-practice` divergía desde antes. Al reconciliarlas byte a byte se descubrió que **la dirección del drift era la inversa de la supuesta**: en `seo-aeo` la copia `.codex` era superconjunto estricto y la de Claude había perdido contenido; en `seo-aeo-practice` se eliminaron siete afirmaciones falsas de la copia `.codex` sobre el alcance comercial de un cliente real. Ambas quedaron **registradas en el manifiesto de `scripts/skills/validate-mirrored-skills.mjs`**, que ya corría en `local:check`: la protección es de pre-push y no depende de que alguien se acuerde (verificado con un test negativo).

**Pendiente, con dueño.** (a) Reconciliar las dos skills — decisión del operador, no se forzó. (b) Correr `/admin/growth/seo/keywords` para el cliente y usar esa cifra como oficial en vez del script ad-hoc. (c) En el sistema editorial del cliente quedan sin definir el estado de lifecycle de los cinco slots y sus enlaces; se dejaron intactos a propósito.

**Verificación.** Cinco briefs verificados en el sistema del cliente por un agente distinto al que los escribió, sobre una lista cerrada de puntos. Las rutas, readers, componentes y tasks citados se comprobaron en disco. No se ejecutó ningún gate de runtime porque el cambio no toca runtime.

**Pendiente de decisión del operador:** `seo-aeo-practice/modules/03_OFERTA.md` (líneas 55, 207, 245) sigue afirmando que el AEO «lo regalamos adentro», **idéntico en ambas copias** — no era drift, así que quedó fuera del alcance de esa pasada. Contradice la corrección del 2026-08-15, pero sus frases son generales sobre la arquitectura de la oferta y no sobre el cliente del caso: no se sabe si la generalización es falsa o si sólo lo era la inferencia. **Resolverlo cambia cómo la práctica cotiza a toda la cartera.**

**Corrección que hay que registrar porque se afirmó de más.** Se presentó la cadencia propia del cliente como argumento de la ventana, con tres fechas. Al reverificar en vivo, una **no existe** (su ruta es otro soft 404, 200 sin `<title>` ni JSON-LD) y las dos reales están a **dos meses** de distancia: no hay patrón propio. La ventana se sostiene, pero **exclusivamente** por el calendario del mercado, verificado con fuente primaria. Corregido en el caso, el modelo operativo y el brief.

**Qué se escribió** (misma separación de carriles): oficio → `seo-aeo` (`modules/02`, `04`, `05`, `07`, `ANTIPATTERNS.md`); atomización → `content-marketing-studio` (`modules/04`, `05`); proceso → modelo operativo **v1.2** (§9 nueva, renumeración de las tres últimas); operación → runbook **v1.1**; caso → `docs/audits/seo/BEREL_COLOR_DEL_ANO_2027_2026-08-25.md`, aparte del diagnóstico porque **caduca por fecha dura** (diagnóstico a v1.1 con el puntero). Detalle temático en el changelog del mismo día.

**Cinco bloqueantes abiertos, todos del lado del cliente** — fecha contradictoria entre la propiedad de la tarea y su cuerpo (la tardía invalida el claim diferenciador) · el material dice «candidato», la confirmación llegó verbal · falta la ficha técnica, que **bloquea cuatro H2** y no sale del sitio público (verificado: el código no existe, la ruta de producto no resuelve) · falta quién firma · la URL de destino **ya devuelve 200 con título vacío**. Detalle y dueño en el caso.

**Alcance del encargo confirmado, cambia entregables futuros.** El canal social del cliente existe pero **lo opera otra agencia**: Efeonce entrega insumo (texto e imagen) y no publica. Por eso el plan de distribución es un paquete de handoff y no una parrilla, y la medición social no es nativa.

**Verificación.** Depósito comprobado por conteo mecánico (13 secciones dentro del desplegable, 38 tablas con envoltorio indentado, 725 filas intactas). **Dos ediciones intermedias sacaron contenido del desplegable devolviendo éxito**: se detectaron por el conteo, no a ojo. Gate de espejos verde. Sin gate de runtime.

**El hallazgo de fondo:** la entidad de marca recurrente del cliente (su color del año) tiene su ficha ancla con **cero enlaces editoriales entrantes y cero salientes**; ningún satélite enlaza a su ficha y ningún ciclo encadena al siguiente. Lo que parecía enlazado era el **pie de página global**, presente en 113/113 páginas. Eso reencuadró la entidad de «pieza de calendario» a **clúster que compone autoridad cada año**, con su kit reutilizable ya escrito.

**🔴 Corrección a un número que reporté como medido.** Dije «0,38 enlaces editoriales por artículo». Al intentar replicar el grafo desde el dataset intermedio **la cifra filtrada no es reproducible**: da 112 enlaces y los porcentajes previos al filtro. Lo cualitativo se sostiene con ambos conteos —el grafo está roto y la entidad está huérfana de cualquier forma— pero **la cifra fina no se le pasa al cliente** hasta rehacer la extracción declarando el criterio exacto de «cuerpo editorial». Queda como límite y recomendación en el audit.

**Dónde quedó:** modelo operativo **v1.3** · **`SEO_CONTENT_BRIEF_STRUCTURE_V1.md`** (nuevo, techo 12.000 car.) · runbook **v1.2** · caso **`BEREL_ARQUITECTURA_AUTORIDAD_2026-08-25.md`** (nuevo) + los dos audits hermanos actualizados · oficio en `seo-aeo`, `content-marketing-studio` y `copywriting`, **esta última registrada por primera vez en el manifiesto de espejos (11→12)**: su copia `.codex` no cargaba la skill por frontmatter incompleto, y eso no falla con error. Detalle temático en el changelog del día.

**🔴 Lo único que no espera calendario editorial:** un artículo **ya publicado** del cliente sobre recámaras infantiles afirma que un producto _«no tiene olor, es anti-viral, anti-bacterial y anti-hongos»_ y que otro _«resiste más de 60,000 ciclos de lavado»_, **sin método ni norma**. Son claims de salud en una página viva. Verificado en ficha: plomo y COV < 50 g/L. Los dos claims publicados: **SIN DATO**. Revisar contra ficha y retirar si no los sostiene.

**Pendiente del cliente:** fichas técnicas por línea (sin ellas dos piezas no se publican y esperan) · un mismo código de color con dos nombres distintos en artículos distintos · el destino `/articulos/color-berel-2027` devolviendo 200 con título vacío · leer el estudio de Profeco antes de citarlo. **Sin GSC en toda la pasada:** el carril de striking distance sigue sin correr para esta cuenta, así que toda la priorización es de demanda de terceros. **Semrush inoperante** (5 intentos en serie, sin poder distinguir cuota de plan).

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

| Métrica                          | Antes | Después                                                 |
| -------------------------------- | ----- | ------------------------------------------------------- |
| `awaiting_terminal`              | 5     | **3** (+12 en `awaiting_terminal_excluded_archived`)    |
| `assignment_dead_ends`           | 1     | **0**                                                   |
| `active_process_predicate_drift` | 0     | **0** (`canonical` 50, `archived_gap` 40; 90 − 40 = 50) |

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
