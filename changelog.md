# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-09-10 — Las seasonalities entran al catálogo como línea propia de marca

`PDR-020` rev 1.4 cierra la reconciliación con el plan de seasonalities 2026–2027: se conserva como línea propia
y permanente porque su trabajo es marca, no como compromiso previo con vencimiento. Son **seasonalities, no
efemérides**, y la distinción es operativa: una efeméride es una fecha conmemorativa puntual, mientras una
seasonality es una temporada con comportamiento propio de audiencia y mercado, con ventana y variación por país.
La unidad de trabajo es la ventana, no el día — por eso Navidad se entrega en octubre — y una temporada puede
sostener más de una pieza. Lo que la distingue del post
genérico de efeméride es que cada fecha demuestra una disciplina de la casa — Halloween es un envase que pierde
personalidad por imitación, el Día de la Usabilidad son fricciones digitales como obstáculos físicos, el Óscar es
retirar una luz para cambiar una escena — y ese es el estándar declarado de la línea. Canal-hogar Instagram,
métrica sends y saves, nunca seguidores. Único ajuste operativo: LinkedIn deja de recibir la misma pieza con otro
caption y recibe el argumento profesional desarrollado, sólo cuando la disciplina es legible para un comprador.
No se fusiona con trendjacking: misma familia cultural, economía de producción opuesta. Alcance, fechas,
responsables y entregas del plan no cambian, y sigue pendiente la conciliación tarea/calendario de MET-2339–2342.
No se produjo, programó ni publicó nada.

## 2026-09-10 — Canales propios de Efeonce quedan bajo un sistema editorial declarado

`PDR-020` fija el sistema editorial de los canales propios de marca: un motor compartido con un rol por canal
(blog el activo, LinkedIn el comprador, YouTube la profundidad, Instagram craft y cultura, Threads conversación
viva, Glitch la propiedad), catálogo propio de formatos por canal y franquicias con canal-hogar que viajan como
corte y nunca como copia. Los territorios se heredan de la taxonomía de `PDR-019` sin taxonomía social paralela;
el educativo nace en LinkedIn y el blog recibe la versión answer-first; el blog queda declarado multiformato con
casos, tools, webinars, ebooks y data studies; los casos de éxito se modelan en tres profundidades con canonical
en el blog y compuerta de aprobación del cliente. El vocero de talking head es Julio Reyes.
[Decisión](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md), delta de impacto en
`TASK-1802`, cross-links en `PDR-003/004/005/019`, drift de Thought Territories registrado en el context pack y
diez archivos de skills reconciliados con espejo Claude/Codex, incluido el hueco de Threads que no existía en la
mecánica de plataforma. Quedan siete decisiones pendientes y un conflicto declarado sin resolver con el plan
estacional 2026–2027, que sigue vigente. No se abrió ninguna cuenta, no se produjo contenido, no se programó nada
y no se autorizó publicación.

## 2026-09-10 — Finance: nómina agosto al valor real de Global66 y TASK-1858

Con autorización del operador, los dos pagos de nómina de agosto que Payroll había registrado en USD con tasa
estimada quedaron superseded y reemplazados por lo que salió de Global66 el 03/09 (800.730 y 1.114.423 más las
comisiones de cambio), pagados en la moneda del expense al tipo de cambio realizado; Global66 septiembre queda
`reconciled`. Se crea `TASK-1858` como cierre formal de la recuperación.

## 2026-09-10 — Finance: tercera pasada (sueldo accionista, Berel MXN, fee HubSpot, Deel mayo–julio)

Nace `finance:ledger-adjust` (cobros en moneda nativa con vínculo a fila, comisiones, pagos directos a un member y
supersede de settlements) sobre el command compartido `linkStatementRow`; los expenses anclados aceptan
USD/MXN con tipo de cambio explícito y `createMemberPaymentExpense` registra pagos a un colaborador sin entry
de Payroll. Datos: sueldo accionista 2×1.000.000 reemplaza los traspasos al CCA; Berel folios 51/52/53 cobrados
en MXN; comisión HubSpot cerrada con la fee de recepción estimada; Deel REC-2026-8/9/10 al CCA.

## 2026-09-10 — Finance: segunda pasada de conciliación (honorarios brutos, Deel al CCA, payable backdated, Banco de Chile)

El plan de conciliación suma `honorarios_gross_paid`, `income_receipt`, `link_existing_payment` y
`link_existing_leg`; nacen `finance:record-deel-receipts` (recibos Deel con tarjeta personal → cuenta corriente
accionista) y `finance:contractor-settle` (boleta on-behalf → readiness → obligación reactiva → orden pagada con
la fecha del banco), más el adapter `bancochile_cuenta_vista_text`. Datos: Humberly julio/agosto como brutos sin
retención; Deel REC-2026-11/12/13; Valentina EO-CPAY-0002 pagado el 07/09; comisión HubSpot Q2 2026 como
ingreso; Banco de Chile FAN Emprende anclado e importado. Seis períodos `reconciled`. Pendiente de despliegue:
el ops-worker recomputa saldos con el código previo a ISSUE-169.

## 2026-09-10 — Finance: recuperación de conciliación agosto–septiembre 2026

Cuatro meses sin cartola se resolvieron re-anclando cada instrumento con una OTB bank-authoritative al inicio de
agosto (Global66 al 31/07 y la TC al cierre de ciclo 06/08) en vez de reconstruir mayo–julio. Nacen los adapters
de cartola (`santander_cartola_xlsx`, `santander_tc_movimientos_xlsx`, `santander_tc_estado_cuenta_text`,
`global66_xls`) detrás de `parseBankStatementFile`; la ruta de import acepta archivo/texto y el drawer suma la
pestaña «Archivo del banco» (la lista CSV ahora calza con el parser). CLIs canónicas nuevas:
`finance:instrument:create`, `finance:import-statement`, `finance:reconcile-rows` (plan JSON) y
`finance:declare-otbs --file`. Se corrigió `ISSUE-169` (cuentas USD/MXN sumaban CLP; el día genesis de la OTB no
materializaba movimientos), el opening canónico del período honra la OTB, las filas idénticas del mismo día ya no
colapsan al importar y las factorías de settlement aceptan fechas partidas y MXN. Créditos V1
(`src/lib/finance/loans.ts`): Crédito FOGAPE Santander registrado con su desembolso como settlement `funding`.
Datos: `banco-chile-clp` registrada, 9 períodos ago/sep importados, 77 filas conciliadas por plan, tres períodos
`reconciled`; las discrepancias de nómina y dos cobros quedan escaladas al operador (follow-up propuesto `TASK-1858`, sin registrar aún).

## 2026-09-10 — TASK-1604: pack SEO/Arte y vacantes reconciliadas

Se agregó el pack versionado de evaluación para SEO Specialist Senior y Director(a) de Arte Senior: seis
competencias aditivas, nueve preguntas SEO con rúbricas BARS en `sme_review`, scorecard de portfolio/caso para
Arte, migración y operador local/readback. El guard de materialización ahora cuenta sólo las preguntas exactas
del pack; la reutilización de templates exige un único match de role hint, módulos, niveles y pesos y falla
cerrado ante colisiones. Las vacantes `EO-OPN-0674/0675` fueron publicadas por una operación separada y se
releyeron `active|published|public_listed`, rutas 200, pero continúan con cero policies, templates del pack y
assessments. Task, registry, epic, documentación funcional y handoff reflejan esa frontera; TASK-1604 sigue
`in-progress` hasta SME, template/binding y Quality Gate.

## 2026-09-10 — TASK-1832: retiro bloqueado y contrato shared-CIMD documentado

Readback live conserva la organización sintética aislada: registro/binding `1/1`, purpose drift `0/0`, dos
profiles run-owned fuera de Person 360 y un único grant read-only activo. La muestra dejó de ser steady:
`auth.oauth.refresh_reuse_detected` reportó 93 eventos/24h sobre el CIMD compartido de Codex. El cleanup dry-run
no mutó y añadió `oauth_client_not_run_owned`; el mismo cliente tiene 8 artefactos canary y 35 de otros sujetos.
Task, manifiesto, runbook, manual, doc funcional y skills Claude/Codex ahora prohíben remover ese blocker o
aplicar el helper client-scoped. El retiro exige primero planner/delete/readback sujeto-específicos y prueba de
preservación del cliente/hijos ajenos, además del diagnóstico de refresh; no hubo revoke, cleanup apply, gate
OFF, push ni deploy. El gateway 1.4.0 usa los tres paquetes MCP v2 oficiales 2.0.0, todavía latest en npm al
momento del chequeo.

## 2026-09-10 — TASK-1852: canal MCP delegado vivo; TASK-1857 Creative Hub

Canal delegado completo fuera del primitive: scope Entra `efeonce.mcp.client_services.write` (Admin) en la app recurso MCP,
`efeonce-mcp-client-services` en la allowlist de consumers de Vercel Production (redeploy `greenhouse-naxc5guq3`) y
federación en `efeonce-mcp` 1.4.0 (PR #9 provider `greenhouse-client-services` con preview/apply/rollback; PR #10 corrige
`efeonce.gateway.status`, que omitía el provider; revisión `00052-slt`, 174 tests). Verificado en producción por
`efeonce.gateway.status`). Canary humano punta a punta y apply de Sky ejecutados ~07:40Z por el canal (`EO-APC-ECD63852`, `delegated_oauth`, 0 altas, replay idempotente). `scopes.ts` del auth-server suma
`efeonce.mcp.client_services.write` a las clases de escritura MCP (paridad con `efeonce-mcp/src/config.ts`).
Decisión del operador: Creative Hub ES el módulo de Sky → `TASK-1857` (ui-ux; wireframe v2 de cinco bloques cliente + dirección visual C «hoja de trabajo creativa» con component mapping por bloque sobre el surface system; sin JSX) y Delta en `TASK-1687`.
[Auditoría](docs/audits/client-portal/TASK-1852_ROLLOUT_2026-09-09.md) §Canal MCP delegado.
Barrido documental por dos subagentes (32 archivos): skills `efeonce-mcp-platform` (+referencias, espejo `.codex`),
`greenhouse-teams-message-operator`, `teams-bot-platform`, `efeonce-customer-experience`; arquitectura MCP §25, invariantes MCP §11,
sister platforms §16 (registro de clientes de exchange), gap ledger de parity, Teams/Notification Hub, client lifecycle §9,
Pilot Engagement (`bundled_modules`), docs funcionales y manuales de portal/comunicaciones, DECISIONS_INDEX.

## 2026-09-09 — TASK-1852: habilitación común de servicios

Implementados inventario/preview, apply y compensación por organización/persona/servicio con commands
canónicos, locks, snapshot e idempotencia atómica. App/CLI/MCP/Nexa reutilizan el dominio; escritura
delegada denegada y writes nuevos apagados. JOIN comercial corregido, procedencia agent preservada
durante refresh y audit App acepta cliente nulo de sesión interna. Suite inicial 290 tests, PostgreSQL local y smoke
HTTP autenticado; [QA y matriz Berel/Sky](docs/audits/client-portal/TASK-1852_IMPLEMENTATION_QA_2026-09-09.md).
Rollout autorizado y alcance Berel/Sky confirmado por el operador; permiso de compensación EFEONCE_ADMIN
corregido, 392 tests passed. Servicio Berel sincronizado por command; resolver HubSpot vigente y
normalizador conservan importes ausentes NULL. [Estado del despliegue](docs/audits/client-portal/TASK-1852_ROLLOUT_2026-09-09.md).
PR #231/main `5726ce9d90` en Production; orquestador `34416904936` success y manifest `released`.
CI/Deep/build, cinco workers Ready, health, watchdog sin drift y siete canaries HTTP verdes. Excepción
de compensación autorizada y auditada. Altas OFF; mapping comercial y certificación cliente pendientes.
Tres contactos Berel quedaron seleccionados en HubSpot pero aún sin usuario Greenhouse; tres usuarios Sky
activos fueron confirmados, sin login observado. [Dossier de discovery](docs/audits/client-portal/TASK-1852_CLAUDE_DISCOVERY_2026-09-09.md).
2026-09-10 (local, sin push): `declareCommercialTerms` acepta `bundledModules` validados contra el catálogo activo y
gana contrato App `/api/platform/app/commercial/services/{serviceId}/terms` + CLI; Berel y Sky declarados con importes
NULL. `inviteClientPortalUser` gana `delivery: 'deferred'` + `deliverClientPortalInvitation` (ruta `portal-users/deliver`);
tres personas Berel provisionadas sin correo. El lane App acepta autoridad humana `delegated_oauth`
(`client_services.enablement.write`, exchange RFC 8693 con cliente dedicado sembrado por migración) y el recibo registra
`authority`; el preview distingue `person_invitation_pending`. Preview Sky limpio en producción; apply pendiente de sesión
humana y flag. Chats grupales de Berel y Sky registrados como destino `chat_group` del Teams bot (`ready`, pertenencia
verificada por Graph read-only; ruta `lifecycle/teams/chat`; migración que relaja el CHECK legado). Invitaciones Berel
bloqueadas por decisión del operador hasta tener interfaces. Política de preferencias `client_service_default_v1` aplicada a las seis personas (ruta `portal-users/notification-preferences`). **Release 2026-09-10:** PR #232 → main `f69b9d32`, orquestador `34431792218`, manifest `released` 03:16Z, flag `CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED=true` horneada, canary de contrato 5/5 en producción. [Readback](docs/audits/client-portal/TASK-1852_MAPPING_PROVISIONING_READBACK_2026-09-10.json).

## 2026-09-09 — Planificación estacional Efeonce y continuidad editorial

Documentadas 13 piezas 2026–2027 con conceptos, tareas, calendario y readback fechado en
[registro social](docs/audits/social/EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027.md).
Social Media incorpora guía de efemérides, metáforas visuales y briefs; Notion explicita la aplicación
del flujo existente a pares tarea/calendario, con fechas separadas y detección de divergencias.
Skills espejadas Claude/Codex. Cuatro tareas tienen asignaciones nuevas aún no copiadas al calendario;
se documenta el pendiente sin mutaciones Notion. Producción, aprobación y publicación siguen abiertas.

## 2026-09-09 — Portal de servicios: EPIC-046 e integración con Efeonce Insights

Registrados [EPIC-046](docs/epics/to-do/EPIC-046-client-services-visibility-and-self-service.md) y
[ADR](docs/architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md): Berel SEO/marketing de
contenidos y Sky diseño digital, primero visibilidad y después solicitudes/briefs. Cinco tasks nuevas
registradas y tres existentes por reutilizar, sin cambiar asignaciones ni desplegar.
Baseline fechado de catálogo, acceso y destinos 404; fuentes, permisos, contratación y estados separados.
El operador aprueba la dirección y añade Insights como hito obligatorio: autogestión cliente y gestión
interna comparten dominio/historial, con permisos distintos y token limitado a una edición. EPIC-045,
arquitectura/ADR, TASK-1845/1846/1848/1849 y flow/wireframe sincronizados; sin otro builder o motor.
Ampliación del operador: email de Insights con resumen/deep link, in-app y Teamsbot en esta fase;
móvil posterior. Hito N/P09 reutiliza Hub y sus dueñas, distingue entrega/consulta/acción y exige
preferencias, destino autorizado y dedupe. TASK-690/693/1848/1849 actualizadas; sin envíos reales.
El operador autoriza el registro: TASK-1852–1856 creadas con templates, contratos UI/backend y
criterios; TASK-1852 ↔ TASK-1834 enlazadas para identidad/contexto/deep links y rollout nativo
condicional. Inicio por 1852 con login vigente probado; commit documental autorizado, sin implementación, push ni deploy.
Diseño UI ampliado por pedido del operador: ocho documentos TASK-1854/1856 con pantallas H0/S1 y R0–R5,
campos de contenidos/SEO/diseño, deep links, recovery, adjuntos, copy, responsive y motion causal.
Primitives verificadas en código; tareas/backend/epic alineados. UI ready no hasta integración/primer fold/GVC;
umbral premium vigente ≥4.5, sin declarar capturas, scorecard ni funcionalidad desplegada.
Asignación Claude/Codex documentada en EPIC-022/045/046: modelo, esfuerzo y revisión por task/carril;
Astra para fronteras críticas, Sol para integración, Opus para UI/editorial y Fable para TASK-1669.
Reglas comunes en EPIC-046: un editor por archivos, continuidad de owner y sin ejecución/rollout implícitos.
Commit completo autorizado: incluye el movimiento previo de TASK-1690 a in-progress; lifecycle, registro y README conciliados, sin avance de implementación.

## 2026-09-08 — GPT Image 2.5 entra a la doc como capacidad de proveedor, no como camino disponible

OpenAI publicó `gpt-image-2.5-sunburst` y `gpt-image-2.5-flare`. La matriz de capacidades, la spec del
generador visual, el doc operativo, el ledger de la flota Globe y cuatro skills espejadas quedaron al
día contra la doc oficial, no contra la prensa.

Lo que cambia el trabajo real: OpenAI declara que **la calculadora de GPT Image 2 no estima el consumo
de 2.5** y que tarifas por token iguales no implican costo por imagen igual. Eso rompe la estimación
previa al gasto — el compiler de Globe reserva créditos ANTES de generar, y con 2.5 esa reserva no
tiene fuente documentada. Quedó registrado como bloqueador de integración, no como detalle de pricing.
Tampoco hay Batch ni rate limits publicados, así que `gpt-image-2` no se retira.

Se documentaron dos trampas silenciosas del helper local, verificadas leyendo el código: por env var,
`OPENAI_IMAGE_MODEL=gpt-image-2.5-*` no pasa el allowlist y cae a `gpt-image-2` sin avisar; por flag
CLI, `--model` se castea sin validar, así que el modelo sí viaja pero la resolución se degrada a la
rama legacy y se inyecta `input_fidelity`, que la guía de OpenAI excluye de Sunburst y Flare.

Inventariando el dominio apareció un tercer defecto de la misma forma: `DEFAULT_IMAGE_PROVIDER` apunta
a `imagen-4.0-generate-001`, que la arquitectura declara bloqueado. `TASK-1850` se creó y se supersedió
el mismo día por `TASK-1851`, que toma el contrato entero: partirlo habría dejado el mismo archivo con
dos dueños y el mismo invariante declarado en dos lugares. El hallazgo del auditor de flags —ciego a
`ENABLE_ASSET_GENERATOR` porque su patrón exige sufijo `_ENABLED` y éste lleva prefijo `ENABLE_`— NO
generó task: `TASK-1782` ya posee ese bug class y recibió un Delta. `TASK-278` recibió otro: sus
entregables existen en el repo con 0 de 11 criterios tildados.

También quedó por escrito lo que 2.5 NO mejora: OpenAI no afirma mejora de tipografía ni de texto
multilingüe, las cuatro limitaciones declaradas siguen vigentes, y el system card mide una mejora de
seguridad sin significancia estadística con Abuse peor que 2.0.

## 2026-09-08 — Efeonce Insights: arquitectura y programa multiformato

Extensión: skill operativa y distribución MCP/harness exigibles al cierre, con fuente común, routing,
versionado y evaluación de agente sin historial. Se integra en TASK-1845/1848/1849; no agrega tareas.

[EPIC-045](docs/epics/to-do/EPIC-045-efeonce-insights-multiformat-intelligence.md) formaliza cinco tasks
TASK-1845–1849: evidencia/adapters, render durable, catálogos deck/A4, acceso/correo/recurrencia y biblioteca/web.
ADR y arquitectura fijan dominio Greenhouse + Artifact Worker, tres salidas de primera clase, snapshots,
API/UI/MCP, co-branding y grants revocables. TASK-1672/1673 conservan integración de auditoría técnica SEO.
Sólo planificación autorizada; sin implementación, emisión de reportes ni rollout.

## 2026-09-08 — TASK-1844: autoridad interna multiorganización activada

Greenhouse resuelve autoridad por objetivo con consentimiento v2; gateway 1.3.0 descubre organizaciones
permitidas y revalida cada llamada sin ampliar `efeonce.mcp.read`. Expand/contract aplicadas y cohorte de
una persona ON. Codex, Claude Code, Claude hospedado/Desktop: A/B, negativos, refresh y revocación verificados.
Rollback/restore servido probado; Claude Code requiere login tras OFF. CIMD extendido de Claude admite
PKCE/refresh y rechaza JWT bearer; OAuth 150 passed. PR 230/main `45f6910e3`, orquestador `34281143424`
success, manifest released, Vercel exacto y watchdog 5/5. Fixtures retiradas; conexiones definitivas conservadas.
[QA y límites](docs/audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md).
Manual interno, documentación funcional/técnica, API, runbooks y skills Codex/Claude reconciliados; [cobertura](docs/audits/mcp/TASK-1844_DOCUMENTATION_SKILLS_CLOSURE_2026-09-08.md).

## 2026-09-08 — Berel cierra la doctrina de recuperación y QA editorial preventivo

La skill Berel y el gate client-visible incorporan el barrido obligatorio de todo el mes aun sin comentarios,
rechazo de links Notion/metadatos operativos en la zona vigente, preservación de análisis y specs congeladas,
edición/restauración segura y verificación del propio reporte. La
[auditoría fechada](docs/audits/seo/BEREL_CONTENT_HUB_EDITORIAL_LEAK_RECOVERY_2026-09-08.md) consolida octubre,
noviembre y diciembre, distingue el typo `segundasegunda` del contenido real y documenta `pintura sana` como
problema de claridad —no como palabra inexistente en México—. El contrato genérico de Notion añade baseline y
readback de discusiones para reemplazos/restauraciones; no hubo nuevas escrituras en Notion, Drupal ni Frame.io.

## 2026-09-08 — Berel adopta una propuesta de colaboración mensual y canales con función única

Efeonce aprobó internamente proponer desde septiembre una dinámica simplificada para Berel: Notion como fuente
central del trabajo, Frame.io para revisión visual/audiovisual, Teams para avisos y bloqueos, y correo para informe
mensual y cierre formal. Dos cortes mensuales alimentan una reunión de 45 minutos dentro de los primeros siete días
hábiles del mes siguiente; no se impone un SLA genérico de tres días para feedback. El contrato, módulo 19 y skills
espejo dejan separado lo aprobado internamente de la aceptación pendiente del cliente; no hubo cambio en Notion,
envío de correo, calendario ni alcance contratado.

## 2026-09-07 — Berel: comentarios, recuperación de octubre y contrato visual corregido

La skill espejo `berel-content-production` incorpora el delta del Playbook vivo para comentarios: claridad antes
que ingenio, una sección por intención, reubicación con costura, contenido evergreen y evaluación del diagnóstico
del cliente sin aceptar mecánicamente su remedio. `Atendido` queda separado de `resolved`; Efeonce prueba
decisión/cambio + respuesta + readback y el cliente cierra el hilo. Las 25 observaciones del lote se clasificaron
por causa primaria: claridad/estructura 10, precisión de producto 7, voz/localización 5 y alcance editorial 3.

El barrido preventivo de los diez artículos de octubre reveló una regresión propia: al retirar notas internas se
habían eliminado fichas visuales contextuales y reescrito copy no solicitado. Se restauraron byte a byte los siete
artículos sin comentarios; en los tres comentados se recuperaron historia y fichas sin deshacer títulos ni cambios
justificados. La lectura final de esos diez y del artículo centinela de herrería confirmó 44 fichas N1–N4 intactas,
30 hilos conservados y 59 comentarios, incluida la respuesta que faltaba. De las zonas editoriales se retiraron
solo notas de agente y operación ajena a la narrativa; no se modificaron assets, Frame.io ni Drupal.

Aclaración del operador del 2026-09-08: los toggles de Research/análisis/plan son evidencia obligatoria y siempre
permanecen en la página. La limpieza se limita al toggle editorial de artículo, reescritura o tutorial, donde no
pueden colarse notas de agente o texto ajeno a la narrativa. Skills y gate se alinearon con esta frontera; las
specs contextuales siguen protegidas y el análisis no se vuelve a tratar como fuga.

Segunda revisión preventiva: 11/11 páginas conservaron evidencia, 44 fichas N1–N4 y 12 fotos de paso; 30 hilos
y 59 comentarios permanecieron íntegros. Se corrigieron ocho fragmentos de planificación fuera de lugar en Día
de Muertos, Psicología del color y App Color Berel mediante reemplazos quirúrgicos; la delimitación de cluster
se movió al análisis. Gate final 11/11, sin cambios en arte, tareas, estados, Frame.io ni Drupal.

La causa raíz también quedó cerrada en los espejos Claude/Codex: las fichas N1–N4 son parte obligatoria del
artículo y se copian literalmente a las tareas visuales. Una vez producido el arte, composición, copy, ALT,
archivo, formato y posición quedan congelados hasta una conciliación explícita con diseño. El gate distingue
fichas de notas internas, exige exactamente N1–N4 completas y conserva la jerarquía de toggles.

## 2026-09-07 — TASK-1813 despliega discovery OAuth nativo/base-only y ensaya rollback

`efeonce-mcp` `1.2.0` deja Efeonce ID como único authorization server anunciado cuando el carril nativo está
activo, fija el bootstrap en `efeonce.mcp.read` y entrega scopes adicionales por challenge 403. Retira el shim
DCR/metadata AS del gateway, `OAUTH_PUBLIC_CLIENT_ID` y `MCP_REQUIRED_SCOPES` como controles de deploy, sin
retirar validación Entra legacy ni modificar grants, providers o tool surface. El harness conductual pasa
154/154 sin omitidos; CI `34162827740` construyó además el contenedor. El deploy manual `34162885950` dejó
`cd229069` en `efeonce-mcp-gateway-00047-8b5` / `sha256:608a4789…b29e`, 100 % Ready. El canary productivo
confirmó PRM root/path base-only, shim `404`, `/register` `404` y MCP anónimo `401`. El rollback movió 100 % a
`00046-6n2`, reprodujo el contrato anterior, restauró 100 % a `00047-8b5` y repitió los asserts nuevos.
Claude Code `2.1.263` refrescó con scope base único e invocó una lectura sin gasto. Codex `0.153.4` canary emitió
un token CIMD externo sólo con `efeonce.mcp.read` y ejecutó status + lectura SEO sin gasto; Claude.ai repitió una
lectura hospedada base-only con `no_entitlement` y uso cero. Claude Desktop `1.46388.4` y ChatGPT hospedado
repitieron `get_seo_entitlement` post-cutover: respuesta visible `ok=true`, `no_entitlement`, allowance/presupuesto
cero; sus familias renovaron con scope único y Cloud Run correlacionó `POST /mcp` 200 contra `00047-8b5`. En un
flujo separado, `jreyes@efeoncepro.com` autenticó con Microsoft y llegó al consentimiento corporativo sólo para
`Efeonce`; el code expiró sin intercambio, token ni dispatch. La autoridad interna multiorganización queda en
TASK-1844/U19. No hubo cambios Entra ni widening. La skill MCP y sus referencias Claude/Codex quedaron alineadas
con el rollout servido y ese límite. [Task y evidencia](docs/tasks/complete/TASK-1813-efeonce-mcp-oauth-client-interoperability.md).

## 2026-09-07 — EPIC-044 asume entrada multiproducto y consentimiento por relying party

La dirección descubierta en TASK-1834 dejó de ser un supuesto local de Greenhouse. El nuevo ADR Accepted
`EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` fija el contrato de EPIC-044: cada producto conserva
URL, contexto, destino, sesión y autorización; una cohorte first-party habilitada redirige server-side al único
login visible de Efeonce ID y puede usar fast path si la sesión satisface assurance. Sólo una clasificación
`first_party_sign_in` registrada y server-owned omite consentimiento delegado para establecer identidad. MCP y
terceros conservan consentimiento por cliente/scope, step-up, grants y tokens/audiencias propios.

EPIC-044 y TASK-1829/1830/1831/1833/1834/1840/1841/1842 quedaron sincronizadas según su ownership; TASK-1834
permanece como primer consumer Greenhouse y no como dueña de la policy transversal. Las skills MCP y Design
Studio apuntan al ADR y preservan las prohibiciones de iframe, quinto provider, vestíbulo y contexto controlado
por el browser. El ADR nativo anterior mantiene su historia y sólo agrega un delta fechado. Este cambio es
documental: no implementa OIDC first-party, no cambia login, flags, datos ni runtime, y no hizo commit, push ni
deploy.

## 2026-09-07 — TASK-1832: Claude Code y Claude.ai completan OAuth y lectura real

La falla de Claude Code quedó atribuida a `2.1.186`: esa versión pedía el catálogo completo descubierto.
Anthropic corrigió el comportamiento desde `2.1.196`; el CLI local quedó en `2.1.263` con
`oauth.scopes="efeonce.mcp.read"`. Un login nuevo completó PKCE S256, consentimiento de la organización canary,
catálogo de dos tools read-only y `get_seo_entitlement=no_entitlement`; el write no estuvo disponible. Una
repetición posterior al TTL rotó la familia sin widening: dos access/refresh, uno rotado y uno activo. El warning
SEP-2352 del cliente sobre una credencial aún sin sello `issuer` se conserva como observación no bloqueante.

Claude.ai agregó el custom connector remoto con un segundo DCR público exclusivo, `software_id=run_id`, callback
hospedado exacto, secret vacío, OAuth siempre requerido y Streamable HTTP. Se eligió el cliente propio en vez del
CIMD compartido detectado por Anthropic para preservar el contrato de borrado. El consentimiento fue base-only,
las mismas dos tools quedaron visibles y una llamada aprobada devolvió `no_entitlement` con todos los contadores
en cero. La repetición post-TTL rotó una vez y conservó el scope. Claude Desktop `1.46388.4` abrió el chat desde
la app nativa, pidió aprobación propia y ejecutó la misma lectura sobre el conector remoto.

El dry-run incorporó ambos DCR: 22 clientes, 21 codes/consents, 29 access/refresh, 18 sesiones, 14 magic links,
2 passkeys, 5 challenges y 4 contexts; `unexpectedRefs=0`. La documentación y las skills MCP ahora distinguen
versión/local/hospedado, DCR run-owned frente a CIMD compartido, serialización observable de
schemas/annotations/security, probe vacío 401/400 y refresh real post-TTL. TASK-1832 continúa en observación y no
se cierra antes del cleanup/readback cero. La matriz técnica cliente quedó completa; sólo siguen abiertos la
ventana de observación y el retiro controlado.

Un barrido documental posterior eliminó estados vivos que todavía presentaban Claude, el emisor o la
federación como pendientes y dejó los detalles mutables en el manifest. Las skills espejadas ahora exigen
monitoreo read-only, distinguen superficies Claude compartidas de clientes OAuth persistidos y prohíben
adelantar el cleanup antes de `delete_after`. La muestra de observación de 12:09:54Z mantuvo `unexpectedRefs=0`,
cero contaminación 360/comercial y sólo los blockers esperados de la ventana; no cambió runtime ni flags.

## 2026-09-07 — TASK-1832: ChatGPT completa el OAuth hospedado y el gateway endurece el probe vacío

ChatGPT ya funciona de punta a punta con el authorization server y el gateway productivos. La app hospedada
`Efeonce` se registró por DCR, mostró la organización canary exacta y autorizó sólo `efeonce.mcp.read`. Tras
actualizar su definición importó exactamente dos tools read-only —estado del gateway y entitlement SEO— y
ejecutó ambas: `ready` y `no_entitlement` con presupuesto cero, sin ninguna escritura. La familia OAuth rotó dos
veces después del TTL inicial y mantuvo siempre el scope base; el cliente terminó con dos refresh usados y uno
activo. Esto sustituye la hipótesis de que la ausencia de `offline_access` impediría continuidad: el
comportamiento hospedado real no lo solicitó ni lo necesitó.

La primera actualización de ChatGPT reveló un borde de protocolo: su `POST /mcp` con JSON vacío fallaba en el
parser de Fastify antes de autenticar y el handler global lo convertía en 500. El gateway `v1.1.2`, commit
`171965c99034`, ahora autentica primero ese probe y devuelve 401 con el challenge canónico sin bearer, o 400
`invalid_request` con bearer válido. `pnpm check` pasó 153/153, CI `34111553554` y deploy `34111643880`
terminaron verdes; `efeonce-mcp-gateway-00046-6n2` sirve 100 % y la repetición hospedada respondió 200 sin nuevos 500. El gateway usa los paquetes MCP v2 estables `2.0.0`; no se hizo downgrade al paquete monolítico v1.

El dry-run posterior agregó el DCR de ChatGPT al contrato de retiro: 20 clientes, 19 codes/consents, 25
access/refresh tokens, 18 sesiones, 14 magic links, 2 passkeys, 5 challenges y 4 contexts;
`unexpectedRefs=0`, sin contaminación comercial/360. Claude Code continúa fail-closed por scopes adicionales y
de escritura en `TASK-1813`; Claude Desktop/web no está certificado. TASK-1832 sigue en observación hasta los
siete días, cleanup/readback cero desde `2026-09-13T19:43:30Z` y apagado de ambos gates.

## 2026-09-06 — TASK-1832 entra en observación productiva con retiro verificable

La organización canary dedicada ya recorre el mismo emisor y gateway productivos que usaría un cliente, pero
sigue fuera de Account/Person 360 y de toda superficie comercial. Vercel/auth-server sirven `fb5fc082aa92`; el
gateway sirve `8438c5fa87ed`; ambos gates canary están ON. M365, Gmail personal autorizado, magic link, passkey
Chrome/Safari, consentimiento, PKCE, refresh, revocación de familia, base-only, internal-only y revocación de
authority en `19.272 s` tienen evidencia live. Codex 0.153.4 completó una lectura MCP real sin gasto.
El E2E Playwright productivo pasó `1/1` en Chrome con listener loopback real: DCR+PKCE, consentimiento, JWT,
MCP initialize/list/call, refresh, revocación y logout `401`, sin persistir storage state ni tokens.

Claude Code 2.1.186 pidió scopes desconocidos y de escritura antes del consentimiento; el emisor lo rechazó y
el defecto volvió a TASK-1813. No se amplió la allowlist. La expiración natural recibió `401 invalid_token`
después de `899 s`, antes de rotar o revocar la familia; otra ceremonia exigió el `organization_id` exacto y
confirmó el fixture servido. Los clientes hospedados siguen abiertos, igual que siete días de observación y el
cleanup final. El dry-run post-Playwright enumera 19 DCR y todo el grafo auth/identity, con
`unexpectedRefs=0`; se niega correctamente mientras authority/auth están activas. Los cuatro DCR usados por
error con una sesión interna siguen siendo run-owned y el cleanup conserva esa identidad compartida. El wordmark
ausente del correo se restauró como asset público compartido y quedó visible en Gmail; no se eliminará con el
fixture. El readback dejó las sesiones humanas canary activas en cero y conserva sólo la passkey necesaria para
la observación. Quedó activa una automatización diaria silenciosa para vigilar la ventana y ejecutar el retiro
sólo desde `delete_after` con todas las precondiciones verdes.
Los cinco consentimientos Playwright y las dos familias emitidas durante los intentos se revocaron por el store
canónico; los cinco DCR quedaron en el manifest para el cleanup final.

El preflight del cliente hospedado agregó un riesgo específico a TASK-1813: el emisor anuncia y entrega refresh
tokens rotativos, pero discovery no publica `offline_access`, recomendado por OpenAI para conservar la conexión.
No se alteró runtime ni se amplió el catálogo; la fila ChatGPT exige ceremonia hospedada y renovación post-TTL.

El push de endurecimiento `b69f5297d` mostró una colisión real del entorno compartido: el workflow staging
`34071542507` desplegó `auth-server-00042-hp5` con el gate canary OFF sobre el Cloud Run único. El intervalo
fail-closed duró desde 01:07:25Z hasta 01:15:47Z y no concedió acceso. El dispatch production `34072064873`,
fijado al SHA released `fb5fc082aa92`, restauró `auth-server-00043-ndg`, 100 % de tráfico, `Ready=True`, gate ON;
`readyz` y preflight OAuth/MCP pasaron. Para evitar repetición durante la observación, se eliminaron los overrides
staging/production y quedó una sola variable GitHub de repositorio en `true`; Vercel staging continúa OFF. El
cleanup final debe apagar esa variable y Vercel Production antes del readback de gates.

Una lectura posterior del control plane mostró que esa última afirmación documental era falsa: la variable
Vercel del environment custom staging estaba en `true`. Se corrigió su valor exacto a `false`; el primer
redeploy de recuperación fue `dpl_6UUXxsT7eS4EL44kkLWuDrHFqKDT` y la build final de `develop@c75a07f`,
`dpl_D9mkjQLE1a26H4TXQ2HX7wXWMpLf`, quedó READY desde `2026-09-07T02:03:16.160Z`, tomó los aliases de staging
y respondió 200 en `/api/auth/session`. Production permaneció `true` y no se redeployó. La evidencia cubre
config/build; el deny flow-level de staging no se infiere.

## 2026-09-06 — TASK-1835 completa: Efeonce ID tiene cara, y el gate de accesibilidad estaba ciego

`auth.efeonce.org` sirve su experiencia visible: login con passkey, Microsoft y enlace por correo;
consentimiento que dice a qué dominio viaja el código; step-up, alta de segundo factor, recuperación,
sesión y errores. Desplegado y verificado en vivo.

Tres hallazgos valieron más que el trabajo planificado:

- **El login por passkey no existía.** Backend completo y copy escrito desde el 2026-09-04, con los
  cuatro ids `login_passkey_*` huérfanos: ninguna pantalla ofrecía el método.
- 🔴 **El gate de accesibilidad reportaba `violations: 0` sin medir nada.** axe devuelve todo en
  `incomplete` cuando el fondo es un degradado con pseudo-elemento, y el gate lo informaba como cero.
  Debajo había texto a **1.53:1** en la ficha de aplicación del consentimiento — justo lo que tiene
  que leerse. Causa raíz: una clase de texto compartida entre el lienzo oscuro y la tarjeta clara.
  **Aplica a cualquier superficie con fondo compuesto, no sólo al emisor.**
- **El servidor contaba los códigos de respaldo restantes y la pantalla los ignoraba.** Alguien podía
  quemar el último y enterarse el día que perdiera el teléfono.

Un cuarto hallazgo fue mío y lo corregí el mismo día: agregué al pie de todas las pantallas un enlace
a las licencias de las fuentes, porque su id de copy estaba huérfano. Construir una interfaz para
justificar un copy muerto es el razonamiento al revés —el copy se borra—, y encima el lugar era la
pantalla donde alguien decide si confía para entrar. Retirado; los `.txt` se siguen sirviendo, que es
donde la licencia se cumple.

Mecanismos que quedan corriendo: `pnpm auth-server:verify-contrast` (mide sobre los píxeles
renderizados; 365 textos, 0 bajo el piso WCAG) y `pnpm auth-server:verify-passkey` (14/14 en navegador
real). El patrón «runtime sin React» queda registrado en `ui-platform/PATTERNS.md` para que ningún
otro servicio Efeonce arranque un segundo sistema visual.

GVC premium 29 fixtures × 2 viewports (58 capturas); scorecard 4.63 / piso 4.5; los cuatro gates
`ui:*` PASS; suite del emisor 427.

Follow-up abierto: **`TASK-1842`** — ninguna persona puede crear una passkey todavía, así que el botón
nuevo le queda inerte y cada entrada sigue siendo un correo. Bloqueada por `TASK-1834`.

## 2026-09-06 — TASK-1832: schema canary aplicado fuera del checkpoint, sin fixture

`pnpm pg:connect:migrate` se ejecutó por error como si sólo levantara el proxy y aplicó las dos migraciones de
TASK-1832. El readback inmediato confirmó registry/bindings canary en cero, purpose sin drift y los 30 perfiles
`smoke_test` preservados en identidad pero excluidos de Person 360. No se crearon organización, cuentas, grants,
sesiones ni tokens; flags OFF/default, sin push/deploy. Se detuvieron nuevas mutaciones externas y quedó
documentada la decisión pendiente de conservar el schema adelantado o autorizar una migración compensatoria.
La implementación local pasó 144/144 tests focales, typecheck, lint sin errores y build; el gateway hermano pasó
152/152 tests sin skips y build. `secrets:audit` local no acredita runtime: 6/8 saludables, con `NEXTAUTH_URL`
local inválida y `CRON_SECRET` ausente; TASK-1832 no cambió secretos.
[Evidencia](docs/audits/mcp/TASK-1832_SCHEMA_APPLY_READBACK_2026-09-06.md).

**Decisión posterior:** el operador resolvió conservar el schema aditivo y autorizó completar el rollout
sintético: commit/push, promoción, deploys, gates, fixture dedicado, buzones controlados, sesiones canary,
revocación y cleanup. La autorización no incorpora clientes ni habilita writes; la task sigue pendiente hasta
matriz runtime, retiro demostrable y siete días de señales estables.

## 2026-09-06 — TASK-1832: carril oscuro desplegado y fixture removible iniciado

Greenhouse `develop` y el gateway MCP ya sirven consumers compatibles con los dos gates canary apagados. El
auth-server quedó en `auth-server-00034-85c` y el gateway en `efeonce-mcp-gateway-00041-7dq`; metadata/readyz y
los SHAs servidos fueron releídos. Antes del primer write se versionó el manifiesto con IDs exactos. Después, los
commands crearon una organización dedicada `inactive/other/disqualified`, su registro temporal y un binding
`canary`; el readback da `1/1`, purpose drift cero y ninguna persona `smoke_test` visible en Person 360. El dry-run
de retiro encontró sólo las referencias esperadas y se negó mientras root/authority siguen activos.

Para M365, el operador eligió un alias preexistente compartido. No colisiona con perfiles; la invitación definitiva
fue entregada, quedó visible y se aceptó mediante el POST scanner-safe. El profile resultante es exclusivamente
`smoke_test`, permanece fuera de Person 360 y recibió el único grant read-only permitido, personal y expirante con
el binding. El magic link también fue entregado, pero no se consumió todavía porque el Mac quedó bloqueado. Una
invitación preparatoria a plus-address se revocó sin aceptación y permanece inventariada para el cleanup. El gate
sigue OFF y producción no se promueve antes de completar correo Google, sesión/passkey y negativas en staging. La
primera CI del commit falló en el gate de navegación porque el smoke OAuth usaba `page.goto` directo; el fix local
ya usa el helper transitorio compartido y pasa el gate focal. Durante una consulta, el CLI de Vercel imprimió un
cursor sensible: no se reutilizó ni se conserva en evidencia; su posible rotación queda como acción de higiene.

## 2026-09-06 — La certificación sintética se separa del primer piloto cliente

TASK-1832 ya no usa a una organización cliente real para descubrir defectos. La certificación técnica externa
se ejecutará con cuentas controladas por Efeonce, personas marcadas `smoke_test`, una organización canary no
cliente y un binding de propósito explícito, recorriendo el mismo issuer, invitación, sesión, consentimiento,
PKCE, token, gateway y autorización que producción. La matriz conserva clientes MCP reales, M365/Google,
Chrome/Safari y casos negativos; su resultado demuestra preparación técnica, no adopción comercial.

TASK-1841 queda como unidad separada para el primer piloto consentido: una organización ya existente en Account
360, un administrador y una capability read-only vigente, sólo después de cerrar certificación, assurance y UI.
El cliente recibe onboarding y soporte normales, no tareas de QA, y nunca debe entregar tokens o logs. Esa
decisión documental inicial no creó correos, cuentas, bindings, migraciones, invitaciones, flags ni rollout; el
apply de schema posterior queda registrado por separado en la entrada anterior.

## 2026-09-06 — El gate de versión del gateway medía media superficie, y el scope nuevo no se anunciaba entero

Dos defectos que sólo aparecieron al revisar lo construido, y que compartían la misma forma: un mecanismo que protegía menos de lo que su nombre sugería.

El gate que obliga a mover la versión del gateway cuando cambia su lista de herramientas comparaba únicamente las que vienen federadas desde Greenhouse. Las que el gateway define por su cuenta no lo movían, así que dos herramientas nuevas crecieron el servidor con el gate en verde y la versión congelada. Ahora la medición se toma del servidor construido y cubre nombres y descripciones, porque editar una descripción cambia qué decide llamar un agente. Se probó viéndolo fallar en los dos casos, no viéndolo pasar.

El segundo: al agregar el permiso para administrar personas de una organización, quedó anunciado sólo en una de sus dos formas. La que faltaba es justamente la que otorga el emisor propio, del que dependen las herramientas delegadas, así que un cliente que armara su solicitud desde el descubrimiento nunca habría pedido el permiso.

## 2026-09-06 — Efeonce ID: la invitación externa y la autoridad delegada del cliente, en producción

Quien invita a una persona externa ya no le pasa el enlace a mano: el sistema manda el correo en el mismo acto en que genera el token, la respuesta deja de traerlo salvo una revelación gobernada de una hora que queda auditada, y el ciclo de vida es observable (reenviar rota el token anterior, el rebote se registra, la caducidad se ve, tres señales nuevas). El administrador designado de una organización cliente pasa a tener autoridad real sobre su propia gente por una lane del ecosistema, mediada por el gateway y decidida siempre por Greenhouse, nunca por lo que diga la llamada. La página de consentimiento del autorizador ahora muestra a qué host va a volver la persona.

Release `b3e324cb5c8d-3cfce865`, un solo intento. Ambos flags encendidos en producción con redeploy, y un canary contra la superficie real: la misma llamada pasó de responder «no existe» a pedir el binding y a negar por falta de autoridad. La federación de las dos herramientas nuevas quedó desplegada en el gateway, que subió a la versión 1.1.0.

## 2026-09-06 — Efeonce ID: follow-ups de TASK-1837 cerrados y lane delegada federada en PR (gateway)

Revocar un binding limpia y audita al administrador designado; el dominio `external-access` tiene boundary test
de escrituras; el emisor declara el scope `efeonce.mcp.identity.write` (clase «administrar a las personas de mi
organización», step-up); la lane delegada acepta `organizationId` y suma reenviar/revocar delegados (nunca a sí
mismo; una persona ligada se revoca como miembro). En `efeonce-mcp` quedó abierto el PR #3 con las tools
`identity.invitations.list` / `identity.invitation.create` (sólo issuer nativo, población externa). Tasks
derivadas: TASK-1838 (consola del administrador del cliente) y TASK-1839 (convergencia con la invitación del
portal). Producción sigue esperando el release.

## 2026-09-06 — Efeonce ID: invitación externa verificada end-to-end en staging (TASK-1837)

Con los flags ON en Vercel staging y un binding de prueba sobre el emisor real, el recorrido completo corrió sin que
nadie tocara el token: correo real en Outlook, aceptación en `auth.efeonce.org`, persona externa nueva con admin
designado, magic link y sesión viva; rebote forzado con `bounced@resend.dev` marcado `bounced` y la señal
`identity.external_invitation.undelivered` observada encendiéndose; reenvío que rota, revelación de 1 h, y la lane
delegada ejercitada con el token del gateway (200/403/422/201, correo real). Al cierre el binding se revocó y la
sesión murió (401). Producción espera el release y el flip de flags; la federación de la lane en `efeonce-mcp` sigue
pendiente. [Evidencia](docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md).

## 2026-09-06 — Efeonce ID: el sistema entrega la invitación externa; autoridad delegada del cliente (TASK-1837)

`issueExternalInvitation` envía el correo (`external_access_invitation`, token_sensitive, marca Efeonce) después
de confirmar la transacción y devuelve `delivery` en vez de exponer el secreto; la URL de aceptación se deriva del
`issuer_url` del environment (`/i/<token>`), nunca de una env var. Reenviar rota el token; revelarlo es una
excepción auditada de 1 h con capability propia. El rebote de Resend deja `delivery_status='bounced'` por una
proyección reactiva y tres señales nuevas vuelven observable el ciclo de vida. `designated_admin` pasa a conferir
autoridad real: un solo admin vigente por binding y una lane ecosystem para que invite a su propia gente (403/422
fail-closed). El consentimiento muestra el host del `redirect_uri` (MUST del protocolo). Migración additive y dos
flags default OFF. **Migración aplicada 2026-09-06 y verificada; smoke live `--apply` verde contra PG real
(reenvío, revelación, entrega fallida, delegada, admin cleared; `token_revealed` encendida ok→warning); build de
producción ✔.** Pendiente: binding externo real + flag en staging + correo real (decisión del operador) y
federación de la lane delegada en el gateway. Skills actualizadas (espejo `.claude`/`.codex`): `efeonce-mcp-platform`
(SKILL + native-authority + verification-matrix) y `greenhouse-qa-release-auditor/security-qa`. Commits `5518d868e…db5a0adf3`.

## 2026-09-05 — Efeonce ID: acceso Microsoft y publicación certificados

Corrección posterior `21aa12608` promovida por PR226 a main `456d9accf`, auth `00032-h45` y
manifest `456d9accffb6-3b09047e-c37f-4ac7-acbc-0e463e1610fd` released (run `34005056894` success):
`/login` directo reutiliza el botón de Claude y retorna a sesión autenticada; 235 pruebas pasan.
Botón visible y clic hacia Microsoft verificados en público a1440/390; nuevo canary humano directo
pendiente. Un primer run quedó aborted por deploys concurrentes de develop; el retry cerró sin bypass,
cinco servicios con el SHA exacto y watchdog `ok`. Barrido de tres subagentes consolida TASK1836+1831 en ADRs, docs
funcionales, manuales, runbook, tasks/epic, skills espejo e invariantes. [Evidencia y límites](docs/audits/2026-09-06-task-1836-1831-consolidated-evidence.md).

PR225 integra las reparaciones OIDC, lector de consentimiento interno y origen/CSP del formulario.
Release `08acfb2c6`, run `34000876213`, manifest `released` sin override. CI, Deep, smoke,
Vercel Production y health aprobados; watchdog operativo 5/5, drift0. Canary final sobre gateway36:
emisión de token, lectura propia, rechazo de otra organización y revocación efectiva en6.633s.
El piloto conserva gv5 y su vencimiento original; todos los tokens de prueba quedaron revocados.
No se declaran completas las matrices externas/multicontexto ni UI/WebKit. Evidencia:
[TASK-1836](docs/tasks/in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md).

## 2026-09-05 — MCP gateway: cartel propio del servidor (title, websiteUrl, íconos Efeonce)

El gateway se anunciaba como `efeonce-mcp 0.1.0` sin título, sitio ni ícono. Declara ahora su
`Implementation` completo y sirve el isotipo Efeonce desde su propio origen, con `src` derivados de
`MCP_PUBLIC_URL` y nunca como `data:` URI (el SDK estampa el `serverInfo` en cada resultado del
carril moderno). Tras el estudio de contenedor, el asset es UNO: isotipo blanco sobre placa navy
opaca 512×512 (marca al 76%, safe area 12%, sin radio horneado). Se retiran la variante dark y el
campo `theme` — la placa opaca no los necesita y el spec no define si `theme` describe el fondo del
ícono o el del cliente, cosa que ningún cliente permite falsificar. Un ícono sólo se declara si sus bytes cargaron: asset ausente
deja al gateway sin ícono + WARNING, nunca una promesa que responde 404. El `Dockerfile` copia
`assets/` y un test lo afirma, porque ningún test de runtime ve el contenido de la imagen.
`pnpm check` verde (131 tests) y ambas guardas falsificadas. **Desplegado** (`815df9b`, revisión
`efeonce-mcp-gateway-00036-5wc`): `/icon-512.png` 200 `image/png` con bytes idénticos al repo y sin
challenge, protected-resource 200, `POST /mcp` sin token 401, ruta retirada 404 y `auth.efeonce.org`
intacto. Sabido: ningún cliente Claude renderiza `icons` hoy — se declara porque es correcto.
Detalle y razones en
[`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
§Delta 2026-09-05.

## 2026-09-05 — TASK-1836: diagnóstico cerrado del rechazo JWT corporativo

El callback real pasó el intercambio upstream y fue rechazado por jwtVerify; no se emitió token MCP.
Se añaden causas internas fijas para firma/clave/algoritmo, claims requeridos, issuer/audience y tiempo,
sin conservar payload/cause ni relajar verificaciones. Respuesta pública sin detalles sensibles.
20 pruebas focales y106 de auth correctas; revisión independiente sin hallazgos materiales. Emisor OFF
tras el fallo, diagnóstico aún local y causa exacta pendiente de comprobar en runtime. Tsc y bundle
del emisor correctos; build Next compiló pero se interrumpió en tipos, sin acreditarlo completo.

Actualización21:48Z: diagnóstico desplegado confirma jwt_expired. Corrección local sustituye
max_age=0 por prompt=login, conserva exp estricto y auth_time firmado/fresco; elimina orden
no requerido auth_time<=iat. Emisor OFF rev19; nuevo canary y rollout pendientes.

Actualización22:04Z: SSO Microsoft correcto en runtime. Consentimiento bloqueado por lector
externo usado para organización interna; corrección local agrega proyección interna mínima y
selección/verificación explícita de población. Readback PG real y150pruebas correctos;
publicación/token/canary final pendientes, emisorOFF rev22.

Actualización22:19Z: consentimiento visible tras publicar reader. Envío del formulario
rechazado por Origin:null bajo no-referrer, reproducido con navegador real. Corrección local
HTMLstrict-origin conserva CSRF y no envía rutas/query en Referer; canarytoken pendiente.

Actualización22:44Z: canary interno real completo con09def4fc4: Microsoft, consentimiento,
token y lectura propia correctos, foreigndeny, refreshrotativo, revocacióntoken10.151s,
retirogrant<=11s y gatewayOFFdeny<=20s. Piloto restauradoON, gv5 y expiración original;
tokenspruebarevocados. Promociónformal main y matricesamplias externas/UI pendientes.

## 2026-09-05 — TASK-1836: reparación de integridad aplicada en PG

Migración CLI `20260905183812333` aplicada: población explícita e inmutable, verificación de evidencia
y grants internos con caducidad. Piloto gv 2 → 3; reconciliación actual audit/outbox para binding y
grant, con actor/razón, sin extender autoridad ni fabricar historia. Repetición 0/0; señales de
escrituras sin evidencia y mezcla ambas cero. Resolver externo devuelve `internal_population`;
gateway comprende el rechazo sin fallback. Pruebas: 118 unitarias, 20 live y 1 live adicional de
recuperación. Publicación pendiente mientras Claude termina WIP UI que bloqueó el build compartido;
emisor interno OFF. Commit completo `7d704f483` autorizado por el operador, incluido Berel.

## 2026-09-05 — TASK-1836: autoridad corporativa nativa y límites de autenticación

Backend implementado con Entra OIDC, procedencia de sesión persistida, contexto delegado por cliente/binding,
consentimiento aislado y refresh sin rejuvenecer auth_time. Enrolamiento interno gobernado sobre la
persona y organización propias, grants personales con vigencia y reader sin caché positiva. Tres migraciones
aplicadas en PG compartido; pruebas reales de persistencia/identidad/GC y UV ligado a sesión. Tras aviso de Claude se añaden
límites passkey y limpieza SECURITY DEFINER acotada de estado vencido; auditoría y familias refresh vivas
se conservan. App Entra, secreto y KMS dedicados preparados con cohorte upstream individual. Emisor
y gateway publicados con gates internos OFF; sin acceso MCP interno real todavía. Gateway con 114 pruebas y JWKS acotado; first fold UI con
GVC anónimo sin credenciales, pendiente aprobación visual. Consentimiento revalida binding/step-up
y reader externo excluye grants vencidos. DTO canónico integrado en authorize, POST y renderer;
permisos separados por organización y fallos sin fallback. Retorno OAuth/Microsoft conectado con flag y validación de URL; code/refresh revalidan scopes actuales del cliente. Guard de origen protege sesiones y factores, con regresiones de login CSRF; shell consume fuentes/licencias y CSS bajo CSP estricta; segundo factor TOTP/UV y alta con QR local integrados. Cuatro GVC desktop/móvil y seis checks de navegador pasan con factores ficticios. Primer despliegue autorizado con gates OFF; recheck por jti agrega revocación del token a la validación de contexto antes de activar la cohorte. El piloto ya tiene enrollment y grant de lectura temporal, por el command interno (integración auditora compartida reabierta posteriormente). Se restauran seis permisos release faltantes del rol administrador (execute ya existía), con negativos para los otros roles y Finance sólo lectura de resultados. CLI exige motivo para excepciones y lo conserva en manifest/auditoría; no inventa identidad Greenhouse desde GitHub actor. Pruebas focales 46 passed y typecheck correcto. Actualización operativa: PR #222 / main1086fe40 released por run33978290957; CI/Deep/E2E y watchdog5/5 correctos. Reader y emisor internos ON; GC ON con scheduler y ejecución real confirmada, once tablas y cero borrados. Motivo de excepción releído en manifest y auditoría PG. Activación del gateway detenida por intento de sobrescribir tag inmutable; flags restaurados OFF y fix de reutilización por digest publicado en dd04f470, 125 pruebas correctas, nuevo deploy en curso. Login Microsoft/MFA completado, callback propio rechazado. Follow-up local con openid profile, reloj JWT posterior al intercambio y diagnóstico cerrado; 65 pruebas y typecheck correctos. Emisor temporalmente OFF durante publicación; token, canaries y rollback aún pendientes. [Runbook](docs/operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md).

Estado actualizado: PR #223 / main a6866250 released por run33982717767, sin override, health y watchdog5/5 correctos. Corrección OIDC y CSRF publicadas; emisor permanece OFF por hallazgo de integridad confirmado. El audit interno existe pero faltaba audit externo canónico para binding/grant; detector nuevo mide2 en PG. Decisión A: población persistida y primitives transaccionales compartidas, recuperación aislada, reconciliación actual con procedencia sin fabricar historia. Implementación local: 146 tests integrados y typecheck correctos, migración SQL13/13 y commands live TEMP correctos; endurecimiento de guard final/último canary de poblaciones en validación. No se aplicó la migración ni reconciliación real. Criterio auditado de TASK-1836 reabierto; Claude dejó ownership a Codex.

## 2026-09-04 — Berel: feedback de septiembre promovido a la skill de producción

Lectura integral del Playbook Producción vivo y contraste con Recomendaciones Cliente, Reglas del cliente
y Aprendizajes del feedback. Las skills espejo Claude/Codex incorporan voz pública sin lenguaje interno,
la rama para productos nuevos/de awareness, vocabulario técnico/público inequívoco, Kelvin homologado,
tablas y CTA accionables, render oficial del empaque, datos faltantes solo como pendientes internos,
correcciones de catálogo y separación Notion → CMS → publicación → URL viva. Se conserva la precedencia
vigente frente a reglas antiguas del Playbook (`Enlace`, `/search`, longitud). No se editaron artículos,
assets ni Drupal y no se declara ninguna publicación.

## 2026-09-04 — TASK-1830: autenticación de personas externas del emisor, sin contraseñas (viva desde el 05)

**Delta 2026-09-05 — activada, y el correo del magic link estaba muerto.** El operador prendió ambos
flags (revisión `auth-server-00007-cxb`) y la superficie quedó viva. El canary nuevo
`pnpm auth-server:person-auth:canary` —que ejercita el contrato HTTP contra el host desplegado, no el
SQL contra la base— encontró en su primera corrida que el enlace de acceso fallaba con
`RESEND_API_KEY is not configured`: el `deploy.sh` declaraba el `*_SECRET_REF` sin montar el secreto,
y `sendEmail` usa el cliente síncrono, que lee un secreto ya resuelto. Arreglado en `deploy.sh`,
pendiente de redeploy.

Nadie se habría enterado: la respuesta al pedir un enlace es 202 idéntica exista o no el correo, así
que un correo muerto no se reporta solo (misma clase que `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`). De
ahí la regla generalizable: **toda superficie cuya respuesta es deliberadamente indistinguible
necesita una verificación externa de su efecto**, porque por diseño renunció a reportarlo.

Verificado en vivo por primera vez (22 ok / 0 fallidos): consumo del enlace y su uso único, sesión
sin filtrar el sujeto, passkey con `uv` abriendo en `step_up`, TOTP con secreto cifrado por KMS,
anti-replay y muerte de la sesión al revocar el link. El canary comprueba además que la señal de
sesión huérfana **se enciende** al revocar —un detector que sólo se ve en `ok` es una afirmación— y
distingue tres estados: verde, rojo e **incompleto**, porque un canary con pasos omitidos no es
verde. Pendiente: redeploy, organización elegible para el carril de tokens, passkey en dos
navegadores y el límite de tasa del reto de passkey anónimo.

Cuatro slices en `develop` detrás de `AUTH_SERVER_PERSON_AUTH_ENABLED=false`: sesión propia
(`__Host-efeonce_auth`) que implementa el `SubjectSessionPort` que dejaba a `authorize` en
`login_required` desde TASK-1829; magic link con patrón selector/verificador (15 min, un uso, consumo
por POST tras página intermedia porque los escáneres de correo abren los GET); passkeys con
credenciales descubribles —sin `allowCredentials`, que sería un oráculo de existencia— y contador
anti-clonación; TOTP de step-up cifrado con la llave KMS **simétrica** `auth-server-totp-envelope`
creada el mismo día (la de firma es EC y no cifra), con AAD `<environment>|<subject>` verificada
contra la llave real; recuperación por re-invitación auditada, sin self-service de reset.

8 tablas `greenhouse_auth` aplicadas y verificadas contra PG real, capability
`identity.auth_person.revoke` con su ruta admin por Full API Parity y 3 señales `auth.person.*`.
Desviaciones declaradas: ledger propio `person_auth_attempts` (el del portal tiene CHECK cerrados de
NextAuth y GRANT a otro rol) y `sha256`+timing-safe en vez de bcrypt (un KDF lento no agrega nada
sobre 256 bits y sí 300-800 ms de CPU en un endpoint no autenticado).

Cuatro defectos los encontró el trabajo, no una revisión: la librería de WebAuthn lanzaba al
retroceder el contador y dejaba **viva** la credencial clonada; `deactivateOrphanSourceLinks` no se
llamaba al aceptar una re-invitación, así que el subject anterior seguía autenticando y la
recuperación no recuperaba nada; `epochTolerance` de `otplib` va en `verify` y el `epoch` en
segundos; y un código mal formado hacía responder 500 a un endpoint público de autenticación.

Falta rollout: prender el flag en staging (exige `AUTH_SERVER_OAUTH_ENABLED=true` + environment
`efeonce-auth` en `active`), verificar que el correo sale de verdad por Resend y probar passkey en
dos navegadores.

## 2026-09-04 — Release `9100bbd2765d` a producción: EPIC-044 (auth-server + OAuth code complete) y TASK-1631

PR #221 squash `9100bbd27`, orquestador `33893120972` (un run, sin retry), manifest `released` 16:39:40Z. `auth-server` en producción (`/readyz` 200, JWKS 2 kid, superficie OAuth 404 con `AUTH_SERVER_OAUTH_ENABLED=false`), TASK-1631 lane ecosystem verificado en prod, 4/4 workers + auth-server Ready (dos change-gated con árbol idéntico). Post-release: `AUTH_SERVER_JWKS_URL` en Vercel Production+staging con redeploy; environment `efeonce-auth` registrado `draft` por command (`pnpm auth-server:register-issuer-environment`). El watchdog aprendió el change-gate del `auth-server` (espejo por servicio + test de paridad con los workflows). Ledger de tiempos y de flags actualizados. Barrido documental del release: control plane, playbook (anti-patterns #17/#18), runbooks y manuales del orquestador/watchdog/auth-server, ADR nativo, contrato OAuth, `CLOUD_RUN.md`, EPIC-044, rule `auth-server` y skills `efeonce-mcp-platform` (+espejo Codex), `greenhouse-production-release` y `greenhouse-backend`.

## 2026-09-04 — TASK-1829 (EPIC-044 U02): superficie OAuth del emisor propio, code complete detrás de flag

`auth.efeonce.org` gana su protocolo, detrás de `AUTH_SERVER_OAUTH_ENABLED=false` (`services/auth-server/deploy.sh`):
metadata RFC 8414 + OIDC con `issuer` idéntico al origen y `client_id_metadata_document_supported`, CIMD como
registro primario (URL `client_id`, anti-SSRF, cache 24 h + etag), DCR RFC 7591 sólo para clientes públicos,
clientes confidenciales pre-registrados por command (`pnpm auth-server:register-client` · `POST /api/admin/auth-server/oauth-clients`),
`authorize` con PKCE S256 obligatorio, consentimiento por (sujeto, cliente, scope) y step-up para escrituras,
access JWT ES256 de 15 min firmado en KMS HSM (`iss sub aud azp scope gv jti`), refresh opaco rotativo 30/90 d
con detección de reuso que revoca la familia, revoke RFC 7009, introspect RFC 7662 y `POST /oauth/consent`.
Siete tablas nuevas en `greenhouse_auth` (aplicadas) y dos capabilities (`identity.auth_client.register`,
`identity.auth_consent.revoke`, EFEONCE_ADMIN). Las primitives puras del broker sister-platform se extrajeron a
`src/lib/auth-server/oauth/primitives.ts` sin cambiar su contrato. Tres señales `auth.oauth.*` (steady 0).
`gv = max(grantsVersion)` de memberships `bound` (TASK-1631); sin binding, `access_denied`. Hasta TASK-1830
`authorize` responde `login_required`: ningún token para persona real todavía. Contrato:
[EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1](docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md). Rollout
pendiente: release del runtime a `main`, fila del emisor en `external_identity_environments`, flag ON en staging.

## 2026-09-04 — Método de informes SEO/AEO y continuidad de Berel

Se incorpora el [modelo de informes para clientes](docs/operations/SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md)
a las skills SEO/AEO y Berel, espejadas para Claude/Codex: lectura de auditorías y Content Hub, voz de agencia
que redacta/publica, límites GSC/GA4/DataForSEO, validez de preguntas y probes del Grader y readback Notion/Markdown.
Se conserva la [auditoría de agosto](docs/audits/seo/BEREL_AUDITORIA_SEO_AEO_AGOSTO_2026.md) como caso fechado.
El método no implementa las correcciones del Grader ni del sitio; esas acciones siguen pendientes.
Se añade `report-studio` para Claude/Codex, registrada en router y gate de espejos: fuentes primarias, siete módulos, plantillas, evaluación editorial y preflight PDF con pruebas negativas. Berel conserva 55 páginas A4 con marca/contacto completos, cobertura On-time, gráficos y acabado reproducible; revisión y evidencia en su carpeta de informe. Entrega local, sin envío.

## 2026-09-04 — TASK-1631 (EPIC-044 U04): binding de identidad externa aplicado, commands, API y señales

Migración aditiva aplicada en `greenhouse_core` (environments registry, bindings Account 360, grants provider-neutral con
`profile_id` opcional, invitaciones con `token_hash`, audit y resolution log append-only, índice único parcial de subjects
`external_idp:%`) más forward-fix del CHECK `linked_consistent`. Dominio `src/lib/identity/external-access/**`: seis
commands idempotentes en una transacción (estado + audit + outbox, `grants_version` sube en cada cambio de autoridad) y el
reader `resolveExternalAccess(environment, subject)` que deniega fail-closed y registra sólo denials. Seis capabilities
`identity.external_*` (sólo `efeonce_admin`), rutas admin `/api/admin/identity/external-access/**`, lane ecosystem
`GET /api/platform/ecosystem/identity/binding` para el gateway (TASK-1831) y cuatro señales `identity.external_binding.*`.
Smoke live `pnpm identity:external-access:smoke` verificó bind → grant → invite → accept → resolve → revoke contra PG real.
Estado: code complete, rollout pendiente (deploy + señales en `/admin/operations`).
Barrido documental del mismo día: skills `efeonce-mcp-platform`/`seo-aeo-practice`/`talent`/`growth-cro` (+ espejos), regla
`.claude/rules/identity-external-access.md`, AGENTS.md, docs de API (OpenAPI + referencia), 18 docs de arquitectura y 10
manuales/docs funcionales: «fail-closed hasta TASK-1631» pasa a «hasta el emisor + gateway multi-issuer de EPIC-044; el grant
ya existe». Backfill de paridad `capabilities_registry` (11 capabilities ajenas).

## 2026-09-04 — TASK-1828: runtime del authorization server propio desplegado en staging y publicado en el front door del gateway

Slices 0–2 de `TASK-1828` (EPIC-044): llave ES256 con protección **HSM** en Cloud KMS (`auth-server-es256`, versión 1
activa) y SA `auth-server@` con permiso de firma sólo sobre esa llave; schema `greenhouse_auth` (`signing_keys` con una
sola `active` por índice parcial + `signing_key_events` append-only) aplicado; `src/lib/auth-server/keys` (firma vía
KMS con CRC32C, DER→JOSE, `kid` RFC 7638, verificación local obligatoria, rotación `active→retiring→retired`) con token
real firmado por el HSM y verificado con el JWKS servido desde PG; `services/auth-server` (node:http, `/healthz`,
`/readyz`, `/.well-known/jwks.json`, Host allowlist) desplegado en Cloud Run `us-east4` con `AUTH_SERVER_ENABLED=false`;
`Auth Server Deploy` registrado en `RELEASE_DEPLOY_WORKFLOWS` y cableado en `production-release.yml`; host
`auth.efeonce.org` publicado como segundo host del LB del gateway (`efeonce-mcp` `6a144a5`: 3 recursos nuevos, 2
in-place, 0 destruidos; `mcp.efeonce.org` intacto); señales `auth.issuer.jwks_unreachable` y
`auth.signing_keys.lifecycle` en el control plane; runbook `docs/operations/runbooks/auth-server.md`. Producción del
emisor queda `code complete, rollout pendiente` (release control plane).

## 2026-09-03 — Globe: pausa reversible del reconciliador externo de tenancy

`ops-globe-tenancy-reconcile` (`efeonce-group/us-east4`) quedó `PAUSED` a las 22:26:05Z, sin eliminar su
definición ni modificar cron, destino o identidad. Deja de programar llamadas hacia Globe con SQL detenido.
`services/ops-worker/deploy.sh` declara la pausa deseada localmente; sin commit/push/deploy en esta ejecución,
la protección frente a futuros despliegues aún requiere promoción. Reinicio y sincronización source/runtime:
[runbook](docs/operations/creative-studio/GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md).
TASK-1807 sigue abierta; ahorro posterior al corte pendiente de Billing Export.

## 2026-09-03 — EPIC-044: authorization server propio de Efeonce (ADR aceptado) y siete tasks nuevas

Decisión del operador: Efeonce construye y opera su propio authorization server en `auth.efeonce.org`; no se compra
un IdP. Nuevo ADR `EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` (Accepted) supersede la composición WorkOS del
ADR de federación y conserva sus invariantes, binding y contrato del gateway. `EPIC-044` (`in-progress`) agrupa
TASK-1626/1631/1813 y crea TASK-1828 (runtime Cloud Run + front door + KMS HSM + JWKS), TASK-1829 (metadata, CIMD, DCR
compat, PKCE, tokens ES256, refresh, revocación, consentimiento), TASK-1830 (passkeys, magic link, TOTP, recuperación),
TASK-1831 (gateway multi-issuer `AuthContext`), TASK-1832 (canaries + primera cohorte), TASK-1833 (red-team, pentest,
rotación, runbooks, privacidad V2) y TASK-1834 (convergencia del login cliente). `TASK-1631` re-alcanzada a binding/grants.
`DECISIONS_INDEX`, registries y READMEs sincronizados. Delta posterior el mismo día: el emisor se publica como segundo host
del front door del gateway (sin LB ni Armor nuevos, ≈ USD 15/mes adicionales medidos contra el billing export) —
ADR §Delta 2026-09-03 y TASK-1828 actualizados.

## 2026-09-03 — TASK-1349: un `identity_only` ejecutado no es hecho de salida; purga de sujetos sintéticos (PR #220)

Incidente «colaboradores fantasma» ~17:50Z: la pre-nómina de septiembre mostró seis `Colaborador <uuid>` «sin
contrato» — sujetos sintéticos de `review-execute.live.test.ts`, inactivos con compensación abierta, admitidos por el
roster relajado de Slice 2 y rescatados por `hasDecidedExitFact`, que contaba su caso `identity_only` ejecutado como
salida decidida. Fix `0233f81e7` (`policy.ts` exige lane ≠ `identity_only`; `policy.test.ts`; el live test cierra
compensación y desactiva en `afterAll`), en producción con PR #220 (`a824d073a`, manifest released 19:30:49Z). Datos:
9 compensaciones cerradas con `closeCompensationVigencyAtExit`; 18:37Z purga de los 12 sujetos (253 filas,
`scripts/workforce/purge-task1349-live-subjects.sql`, predicado sintético explícito; 265→253 members, 0 reales).
Docs: `LIVE_TESTS_AGENT_INVARIANTS.md` §3 (nunca dejar compensación abierta en un sujeto sintético),
`PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`, decisión (2) en `GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`,
runbook `offboarding-recovery.md` (readback previo por sujeto, lección Valentina; harness vs commands por `tsx`).

## 2026-09-03 — Contratos y skills de reingreso sincronizados

Arquitectura, invariantes, manuales, documentación funcional y runbooks reflejan compensación bruta/snapshots,
proporcionales autorizados, identidad longitudinal, recuperación transaccional y verificación de consumidores.
Skills de Payroll, Talent, Finance, Release, QA y arquitectura actualizadas para Codex/Claude; nuevo espejo
Finance con gate. Tareas e índices ya no prescriben restaurar Valentina por SQL ni presentan la guarda como
pendiente de deploy. [Cobertura documental](docs/audits/payroll/VALENTINA_DOCUMENTATION_SKILLS_CLOSURE_2026-09-03.md).
Sin nuevas mutaciones de datos, flags o release. Prorrateo automático, resolución de ID público en off-cycle,
UI TASK-1814 y bug de correlación de releases conservan su condición pendiente.

## 2026-09-03 — Corrección de reingreso y recuperación de disponibilidad

Las actualizaciones de member confirman identidad y auditoría de forma transaccional; la proyección legal no reabre relaciones terminadas. Recovery y detector comparten vigencia real de episodios. Comando compensatorio con preview, hash de estado e idempotencia sustituye el SQL puntual. [Decisión y contrato](docs/architecture/GREENHOUSE_WORKFORCE_REENTRY_RECOVERY_DECISION_V1.md). Vercel Production y worker corregidos verificados; Valentina restaurada 18:38:48Z, contratos/pagos/usuario intactos. Proyecciones People completadas 18:42:05Z sin reabrir employee ni alterar datos protegidos. Release `33795564223` cerrado, manifest released 19:30:49Z, health success y watchdog ok; readback final intacto.

## 2026-09-03 — TASK-1349 en producción (release `62356c9b7fd4`) — revisión contractual de offboarding, elegibilidad por episodio y writeback de lifecycle

Cierre operativo posterior: Maggie y María Fernanda revisadas como despido y ejecutadas con fechas 29/06 y
29/07; reader 4/4, unresolved=0 y nómina agosto lista. Runbook, manual, documentación funcional y skills
Payroll/Talent Codex/Claude distinguen casos manuales del recovery SCIM y cierre de conciliación Finance.
[Evidencia y método](docs/audits/payroll/MAGGIE_MARIA_FERNANDA_OFFBOARDING_CLOSURE_2026-09-03.md).

Cierra el circuito SCIM → decisión → nómina → lifecycle que la auditoría del 03/09 encontró incompleto (ISSUE-117,
near miss del 06/07). Nómina: el resolver de elegibilidad elige el caso gobernante por relevancia temporal, sirve
`contract_type_snapshot` (el threshold `international_internal` era inalcanzable), detecta reingresos y deja de tratar
`members.active=false` como filtro histórico (un inactivo con salida el 02/06 conserva mayo íntegro); una salida sin
resolver relevante al período mantiene al colaborador proyectado pero **bloquea calcular/aprobar** (readiness
`unresolved_exit_signal`, `calculatePayroll` 409) y una falla del resolver ya no incluye a todos en silencio.
Offboarding: command `reviewOffboardingCase` (`access_only` | `relationship_ended`, causal y fechas explícitas,
`expectedUpdatedAt`, audit + outbox), guard «sin revisión no se aprueba» en el state machine, executor lane-aware
(solo acceso no toca compensación/relación/member; término real termina relación con fecha real y desactiva member
detrás de `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED`, OFF), proyecciones honestas en la cola, tres señales
nuevas, guards de ownership en SCIM y backfill BQ, capability `workforce.offboarding.review_case` (seed aplicado),
rutas HR + carril `app`, y `pnpm workforce:offboarding:recovery` (dry-run ejecutado sobre la cohorte real; nada
aplicado). Tras el release la nómina de septiembre bloqueará hasta resolver Felipe y Maria Fernanda: es el control
buscado. **Rollout 2026-09-03:** PR #219 squash, orquestador `33779259694` `released` 16:45Z, `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED`
ON en Production+staging tras live smoke sintético (`review-execute.live.test.ts`). Pendiente del operador: recovery
por allowlist (bloqueada al agente por permisos), causal de Felipe, conciliación Finance, UI TASK-1814.

## 2026-09-03 — TASK-1806 seguimiento: alerta Teams determinista para drift de metodología ETV

Nuevo cron `ops-seo-etv-drift-watch` (Cloud Scheduler, diario 12:00 America/Santiago, sin flag) en el
ops-worker: lee la señal existente `seo.etv_methodology.drift` y avisa a Microsoft Teams sólo si
`severity=error`, vía el dispatcher determinista `sendManualTeamsAnnouncement` y un destino nuevo
`growth-seo-reliability-alerts` (mismo canal "EO - Admin" que `production-release-alerts`). Antes,
la única forma de enterarse era abrir `/admin/operations`. Verificado en vivo (rev `ops-worker-00637-2ww`):
respondió `warning`/`alerted:false`, correcto para el estado actual de la señal.

## 2026-09-03 — TASK-1806: Improved ETV de DataForSEO en producción (rebaseline versionado)

Release `bda12be7e33a` (PR #218, orquestador `33758619690`, manifest `released` 13:14Z, watchdog `ok`). El módulo
SEO sirve desde hoy `improved_layout_clickstream_v2` en los siete caminos consumidores: ops-worker (`deploy.sh`,
rev `00636-h6w`) y Vercel Production+staging con ambos selectores en improved; canary de contrato 13:15:26Z sobre
los lanes de Berel. Antes: contract de schema ETV aplicado (`20260903103858964`), shadow `exact_ab` de 26 requests
(USD 1,095) evaluado contra Search Console — improved 6× mejor calibrado en Berel (err. rel. 49 % vs 321 %),
Jaccard 1,0 en páginas/subdominios, historia continua —, memo de decisión y aprobación del operador; drill de
rollback en staging; rebaseline acotado (historia improved de Berel y Comex, USD 0,2568). Las cifras de tráfico
estimado bajan ≈ 60 % por cambio de fórmula del proveedor, no por pérdida real; cada cifra declara `etvMethodology`.
Efeonce se mide aparte de los clientes (guard de organización en celdas bulk). Writers `rowsWritten` ahora cuentan
filas insertadas. Legacy sólo vuelve como rollback antes del corte 2026-11-01T00:00:00Z.

## 2026-09-03 — Berel: cobertura por negocio, skills sincronizadas y minería trazable

Decisión local del operador 2026-09-02: fortalecer elección, protección y aplicación, manteniendo color
y paletas. [Estrategia](docs/operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md), inventario de 49 cuerpos,
modelo/brief/manual/funcional y skills espejo Berel/SEO-AEO/DataForSEO actualizados; Playbook Notion
ampliado y releído. [Discovery](docs/audits/seo/BEREL_CAPILLARY_KEYWORD_MINING_2026-09-02.md):
14 runs Labs, 1.517 keywords distintas, 13 SERPs y 52 PAA; costo reportado US$1,23572.
Mapa propuesto de 27 intenciones, no 27 artículos aprobados. No tracking, calendario, CMS ni release.
Ampliación 2026-09-03: skill Berel y espejos incorporan completitud técnica por macropaso, correcciones
acotadas y conciliación de producto; se retira la inferencia «campo CMS vacío = tiempo inexistente».
Control técnico y caso Berelex Semibrillante en módulos 12/13; N29 corregido en Notion, artes y
derivados pendientes, sin publicación. Evidencia: [QA de guardrails](docs/audits/seo/BEREL_TUTORIAL_GUARDRAILS_2026-09-03.md).
Clasificación de piezas: 51 tareas corregidas y releídas; la skill exige tipo/canal/formato
y excluye principales del conteo visual. [Auditoría y límites](docs/audits/seo/BEREL_PIECE_COUNT_CLASSIFICATION_2026-09-03.md).
Tipo/canal obligatorios desde la creación de cada tarea visual, incluidos bloqueados; requisitos y
checklists explícitos en banners, sociales y fotos. Se mantiene el esquema y la agrupación existentes.
Distribución: cuatro opciones, no cuatro derivados obligatorios; módulo 15 y matrices por artículo.
Playbooks Social/Producción en Notion alineados, Instagram Story corregido, contrato 8 artículos
de 3.000–5.000 palabras/50 gráficas/3 videos y cortesía extendida a nov/dic registrados. Octubre
excluido. Aclaración: 50 incluyen blog/RRSS; Blog/Facebook/Instagram/Pinterest. Priorización N52→Navidad
aprobada: 4 banners N52 fuera del paquete, 4 banners y 2 sociales N59 creados. Distribución 50 gráficas

- 3 videos por mes, con reservas técnicas/editoriales; 193 páginas modificadas releídas, sin pérdida de historial.

Corrección de numeración verificada: [mapa por ID y readback 179/179](docs/audits/seo/BEREL_EDITORIAL_NUMBERING_2026-09-03.md).
Skill Berel módulo 16: bloques mensuales completos, reserva de slots, cambios coordinados y aliases
de archivos; no numerar por orden de trabajo. Se preserva el corte histórico descrito arriba.
Complemento de `1fcc2ade3`: metodología de research SEO/AEO y DataForSEO versionada con su referencia
canónica de minería, gate de espejos y documentación de priorización/brief/operación; sin cambios runtime.

## 2026-09-03 — TASK-1805 en producción: foundation ETV versionada desplegada, selección legacy explícita

Release `5ec4cf769977` (run `33698245254`): readers/lane/MCP sirven `etvMethodology`, señal `seo.etv_methodology.drift`,
readback del selector en `/health` del ops-worker, selectores `legacy_static_v1` explícitos en Vercel y worker,
gateway sincronizado. Canary de contrato en producción verde. Contract de schema parqueado con condición de 7 días
(precondición de `TASK-1806`). Improved ETV no activado.

## 2026-09-02 — TASK-1805: la fórmula detrás de `etv` pasa a ser identidad del hecho (foundation, todavía legacy)

DataForSEO cambia el cálculo de `etv` bajo el mismo campo y corta legacy el `2026-11-01T00:00:00Z` sin exponer
versión. Greenhouse deja de depender del default: una policy pura endpoint-aware construye `use_improved_etv`
explícito por request (falla cerrado ante familia ignorada/no habilitada, config inválida o legacy desde el
corte), las tres tablas ETV ganan versión + evidencia + instante UTC + policy (expand aplicado; filas previas
`legacy_static_v1` por contrato, nunca por fecha; guard de corte en la base), los siete caminos consumidores la
persisten, readers/API/MCP sirven UNA fórmula con `etvMethodology` y `not_available_for_method`, la señal
`seo.etv_methodology.drift` compara configurado vs solicitado en Vercel y ops-worker, y un evaluador
dry-run/replay compara valor, membresía del top-N, traffic cost y prospecto sin gastar. Contract de schema
parqueado hasta el release. Estado: code complete, rollout pendiente; Improved ETV NO activado (`TASK-1806`).

## 2026-09-02 — DCR deprecado en MCP `2026-07-28`: el shim del gateway se queda, pero deja de ser el futuro

La revisión Current del protocolo marcó Dynamic Client Registration como `Deprecated` (PR #2858),
migración a Client ID Metadata Documents, retiro más temprano en la primera revisión publicada en o
después de 2027-07-28. El shim se mantiene porque la excepción está redactada para nuestro caso exacto:
DCR se retiene _"for backwards compatibility with authorization servers that do not support Client ID
Metadata Documents"_, y Entra no soporta ninguno de los dos — su única vía oficial es el pre-registro,
que es justo lo que `POST /register` devuelve.

Lo que cierra la pregunta de fondo: **CIMD no es implementable en la capa del shim.** Es capacidad del
authorization server, el AS es Entra, y el gateway espeja `authorize`/`token` en lugar de proxearlos;
soportarlo exige emitir los tokens, o sea el broker que `TASK-1631` ya está eligiendo con CIMD entre sus
requisitos. No hay task paralela que abrir.

En el camino aparecieron tres cosas que la evaluación no buscaba. La misma revisión agregó texto que no
existía en `2025-11-25` —el `issuer` de la metadata debe ser idéntico al identificador con que se
construyó la well-known URL— y los nuestros difieren desde que el shim existe; funciona sólo porque los
clientes todavía no lo aplican. El `client_id` estático compartido, con `http://localhost` sin puerto
entre sus redirect URIs y el consentimiento cacheado por Entra, reproduce la forma del confused deputy
aunque la letra del `MUST` no ate: lo acota que ese cliente no lleve scopes de escritura, una regla
escrita por otra razón que resulta ser la que limita el daño a lectura. Y esa misma aplicación se llama
"Local Canary Client" cuando es el cliente compartido de producción, de modo que quien la audite por el
nombre concluirá lo contrario de lo que debe.

El horizonte del shim no lo fija el calendario de la spec sino el día que un cliente endurezca
cualquiera de las dos validaciones. Para ese día queda declarado un plan B de pre-registro puro que no
toca Entra ni el modelo de tokens.

## 2026-09-02 — un release quedó huérfano en `main` y se recuperó sin ensuciar el control plane

La promoción `develop→main` (PR #215, 726 archivos, 1490 commits, 2 migraciones) entró a `main` a las
`20:51:04Z` y quedó **sin manifest**: la sesión que la promovía fue archivada por accidente antes de dispatchar
el orquestador. Otra sesión la retomó con autorización directa del operador y cerró el ciclo: run `33683893124`
completed/success en 11m50s, `release_id` `375f56e24187-546f452b-c60f-4617-9974-9c87760c3ab9`, estado final
`released`, con los dos gates `production` aprobados en 34 s y post-release health verde.

Tres verificaciones que no se dieron por hechas. El skip del `ops-worker` (51 s, step `Deploy` en `skipped`) se
validó con el **diff de árbol completo** y con `pnpm worker:deploy-path-gate` —1451 archivos del bundle, todos
cubiertos; `src/mcp` no entra, lo sirve Vercel—, no con la lista del change-gate. El `data_missing=4` del
watchdog se trató como falta de evidencia y no como drift: la lectura autoritativa fue `pnpm release:workers`,
3/4 workers en el target. Y el canary de contrato del lane MCP `skills` se corrió **después** del `released`,
con asserts que sólo el contrato nuevo puede producir.

Flags: `GROWTH_SEO_SITE_FINDINGS_ENABLED` prendido en el ops-worker con los dos pasos, tras probar **por blob**
que el evaluador desplegado es idéntico al de `main`. `HIRING_FAIRNESS_MONITOR_ENABLED` NO se prendió: daría
cero en silencio en una métrica de equidad hasta que cierre `TASK-1365`.

## 2026-09-02 — la práctica Salesforce se canoniza como oferta por outcomes y lifecycle

La práctica Revenue Operations & CRM incorpora una arquitectura comercial Salesforce en cuatro fases:
Diagnose & Architect, Implement & Integrate, Activate & Adopt y Operate & Evolve. El contrato separa CRM core,
Marketing Cloud Engagement y Marketing Cloud Next; define carriles de solución, ICP/anti-ICP, operator y buying
group, delivery, métricas, límites de claims y gates de madurez. El estado queda `Approved for validation`: no
autoriza todavía partnership, badge, certificaciones, reventa, pricing, casos ni Product Service comercialmente
aprobado sin evidencia y sign-offs propios.

## 2026-09-02 — MCP: el manual de uso viaja por el protocolo (TASK-1804, released)

La superficie MCP gana un segundo canal de conocimiento de uso: un manifiesto de manuales
(`skill-manifest.ts`) hermano del de tools, tres `SKILL.md` publicables en `docs/mcp/skills/`
(`seo-spend-discipline`, `seo-visibility-reading`, `competitor-loop`), la tool `get_greenhouse_skill`,
el recurso `skill://efeonce/<name>/SKILL.md` y la lane ecosystem `GET /api/platform/ecosystem/mcp/skills[/{name}]`,
todos sobre el mismo reader. Los cuerpos viajan en el bundle como artefacto generado (`pnpm mcp:skills:generate`
/ `mcp:skills:check`): leerlos del filesystem exigía `outputFileTracingIncludes` y Vercel rechazó el build (función sola
de 397 MB). Publicar es un acto explícito (drift manifiesto↔filesystem no construye el
servidor), un binding de cliente no sabe que los manuales existen (404 anti-oráculo) y la fuga de contenido
interno la controla un test. Las `instructions` del handshake rutean al manual en vez de contener el
procedimiento de gasto. El gateway federa la tool con su propio guard de paridad no-SEO (desplegado,
`efeonce-mcp-gateway-00028-pmx`) y la lane salió a producción en el release `375f56e24` del mismo día, con canary de
contrato verde contra producción. Sin Entra, flag ni persistencia nuevos. Follow-up del mismo día: un agente Claude Code
real cargó el manual por el front door OAuth, y el catálogo creció a seis manuales (discovery→tracking, salud técnica,
diagnóstico de prospecto) sin tocar la tool ni el gateway; los seis salieron a producción en el segundo release del día
(`4379c495013f`) con canary de contrato verde. Barrido documental posterior por subagentes: manuales de uso del
inventario MCP/gateway/provider SEO, docs funcionales de API Platform y gateway, deltas en arquitectura API/ADR del
gateway/patrones canónicos/arquitectura SEO, skills `dataforseo-operator` y `seo-aeo-practice`, y README/AGENTS del
repo `efeonce-mcp`.

## 2026-09-02 — ANAM: entrega premium de Emma y soporte explícito de tres meses

Se consolidó el cierre de la landing, identidad y handoff de Emma en dos PDF de cinco páginas: una especificación
técnica y una guía funcional. Los HTML/CSS son la fuente editable; los PDF, el master para cliente. Se revisaron
diez páginas rasterizadas, fuentes Poppins/Geist embebidas, composición, overflow y pies con sitio, correo,
teléfono y dirección. La captura final de la landing quedó versionada y los borradores Word supersedidos fueron
excluidos del paquete.

El borrador de correo para Óscar, María Paz, Pablo y Marco explica los cambios de landing e identidad, la matriz
de routing y el límite de las pruebas E2E. Quedó listo, no enviado. También registra el SharePoint consolidado
como compromiso pendiente para esta semana.

La documentación y las skills espejo ahora fijan el soporte de Customer Agent y KPI en tres meses, del
2026-08-13 al 2026-11-12 inclusive. Soporte cubre el alcance construido; nuevas funcionalidades, KPI, workflows,
automatizaciones, integraciones, rediseños e innovación requieren un alcance separado. No se cambió runtime
HubSpot, no se envió correo, no se creó SharePoint y no se hizo push.
