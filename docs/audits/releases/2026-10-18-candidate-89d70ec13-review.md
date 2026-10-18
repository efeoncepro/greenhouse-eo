# Revisión del lote y CI — candidato89d70ec13, 18-10-2026

Pedido: revisar el lote completo y dejar CI verde, sin desplegar ni publicar GTM; commit propio.
Skill de release + QA/arquitectura aplicadas; sin cambiar severidades, flags, políticas ni IAM.
[Paquete](../../operations/releases/google-ads-2026-10-18/README.md) ·
[Manifest de revisión](../../operations/releases/google-ads-2026-10-18/candidate-89d70ec13-review.json).

## Candidato fijo y cobertura

Se revisa **`89d70ec13b6bed14db8a08797a928bcc6b70856f`**, ya en origin/develop, contra main
`9690efad0c1b9d70d9b168d41131857e686b0f81`. Incluye el paquete328178e15. No se hace push,
merge, PR ni despliegue para probarlo: CI/CI Deep se ejecutan por workflow_dispatch y ambos
headSha se comprobaron contra el candidato. No se disparó production-release ni un workflow deploy.

El corte anterior b8cdf8b1f tenía1.406 archivos netos. El candidato tiene **1.445**;39 incorporados
después de aquel corte. Se usa diff **two-dot** entre árboles. Three-dot devuelve1.673 y arrastra
historia del merge-base: no es el alcance del release. Renames se cuentan una vez por registro;
con no-renames aparecen1.449 entradas. No se suman ambos inventarios.

| Grupo | Archivos | Revisión y evidencia |
| --- | ---: | --- |
| Aplicación |79 |51 fuentes +28 tests; revisión del diff por límites de dominio y CI global |
| Herramientas operativas |179 | Entry points, efectos explícitos, identidad/secretos, contratos y sintaxis según formato |
| Documentación/contexto |361 | Owners/ADR, pendientes, secuencias de activación, coherencia con código/DB |
| Skills |168 | Inventario y contrato canónico de espejos; no exigir igualdad a adapters distintos |
| Assets/evidencia |655 | Inventario, hashes y estructura; no nueva aprobación visual/comercial |
| CI |1 | GTM drift, sólo lectura; permisos, scopes, triggers y ausencia de publicación |
| Configuración |2 | package.json sólo agrega comandos; gitignore protege archivos de tokens/inspect |
| **Total** |**1.445** | Todos inventariados, sin incorporar WIP sin commit al candidato |

Inventario individual: `Documents/google-ads-release-package-2026-10-18/release-review/candidate-89d70ec13-files.jsonl`.
Incluye path/status/rename, blob SHA, SHA-256/tamaño, grupo y checks aplicados. SHA-256 del inventario:
`143b5fae92fc129cd28152f8fea63807bf2f7105438d86f1b1e24f4d3e87b058`.
Se procesaron143.303.886 bytes y101 binarios. No se ejecutó contenido de los artefactos.

## Comprobaciones y revisión de código

- Escaneo de todos los textos contra patrones concretos de claves privadas, tokens GitHub/Slack,
  API keys Google y URLs firmadas:0 coincidencias. No es una certificación exhaustiva de seguridad.
  JSON del lote:0 errores de parseo.
- Sintaxis sin ejecución:79 JS/CJS/MJS,34 PHP,3 Python y41 SVG válidos;0 fallos.
- Gate canónico `pnpm skills:mirrors` PASS. La comparación ingenua de79 pares encontró7 bundles
  distintos y2 adapters sin homónimo Claude; no son las parejas byte-identical declaradas por
  el manifest canónico. No se sobrescribieron adapters ni cambios de otros agentes.
- `git diff --check` del lote señala espacios finales en4 líneas de3 scripts de operator tooling;
  se clasifican como estilo informativo. Lint CI decide el contrato ejecutable; no se reformateó
  trabajo ajeno para hacer parecer menor el diff.
- No cambia pnpm-lock, servicios, workflows de despliegue, src/lib/auth ni src/lib/release.
  Tampoco hay migraciones ejecutables nuevas en migrations/. Los SQL pendientes sí afectan la
  compatibilidad del worker: ver el blocker siguiente.

Revisión por área:

| Área | Conclusión del diff |
| --- | --- |
| Forms/Meetings | Recibo Ads sólo tras persistencia; dedupe/replay no lo repiten; respuestas private/no-store |
| Consentimiento/EC | Cuatro estados Google y GPC; material EC en memoria reservada, sin ordinary dataLayer/GA4 |
| Política/UI | Opt-in Ads independiente, default-OFF, sourceVersion revalidada; edición conserva destinos/config |
| HubSpot receipts | ID por ocurrencia y CAS; GET paginado/portal48713323; correlación débil no se presenta como exacta |
| Meta receipts | Header y observación saneados, sin cuerpos/PII; falta de recibo no reenvía un POST aceptado |
| CLI Ads | Target6862539491, identidad Ads/Cloud fijadas; catálogo cerrado, validateOnly, journal durable y readback |
| CLI Meta | Assets propios y ownership checks; comandos de escritura explícitos, receipts y sin replay automático |
| GSC/valor orgánico | Filtros aditivos; metodología GSC×CPC separada, cobertura explícita, CPC ausente=null |
| BytePlus | Operación directa opt-in; borrador/final separados y errores saneados; no generación realizada |
| Renderers | Radios nativos, iconos/copy y CSS de cabecera; tests en CI. No se autoriza rollout de hosts por revisar código |
| Sitio público/tooling | Compiladores/instaladores fuera del runtime; no se ejecutaron PHP de publicación ni formularios reales |

Verificación del delta de reparación:92 tests focales PASS, typecheck PASS y migration-marker-gate
PASS (681 migraciones,0 errores; dos warnings legacy ajenos al delta). Faltaba registrar el
flag Ads en el ledger: añadido como default-OFF con gates pendientes, sin cambiar valor live;
flags audit estricto PASS (178 registrados). Task lint PASS sin errores/warnings; lifecycle sigue
in-progress. Closure detecta owners presentes; su aviso genérico de lifecycle no exige mover ni
renumerar la task, cuyo estado no cambió.

No se identificó un fallo de código que exija relajar un gate. La validez operativa sigue
condicionada a schema, host assets, Preview/EC y autorización del lote.

## Blocker de schema confirmado por lectura

Consulta sólo de information_schema a través de src/lib/db,18/10 a17:38:40UTC. No se consultaron
contactos ni se escribieron filas. **Ausentes las tres columnas requeridas:**

- `greenhouse_growth.form_destination_attempt.provider_submission_id`
- `greenhouse_growth.form_destination_attempt.provider_receipt_json`
- `greenhouse_growth.measurement_delivery.provider_receipts_json`

Impacto verificado en código y tests: `dispatchPendingSubmissions` exige el nuevo storage antes
de leer backlog/hacer POST; `insertAttempt` ya referencia provider_receipt_json. Meta comprueba
su storage antes del claim. Un checkbox de tracing deshabilitado **no elimina** estas dependencias.
El worker compatible no debe desplegarse antes de las expansiones. La verificación posterior
descubrió que un despliegue anterior ya introdujo este código en el servicio compartido:
`ops-worker-00780-rhp`, tráfico100%, GIT_SHA9a8f1e1bf, dispatch Forms y Meta ON.
El run39123656917 del18/10 a11:32UTC figura success y ejecutó Deploy ops-worker; no fue disparado
por esta revisión. El servicio es único para staging y producción según su deploy.sh.

**Incidencia actual confirmada:** al17:44:57UTC, muestra acotada de100 logs de la última ventana2h
contiene34 errores por provider_submission_id ausente y33 respuestas502 del dispatcher. La
muestra alcanzó su límite: son conteos observados, no totales de toda la ventana. Readback de
backlog17:45UTC:2 submissions accepted pendientes, ninguna delivery de medición queued/sending
de las últimas24h. No se inspeccionaron contactos ni se infirió demanda real desde ese conteo.

## Reparación autorizada y readback

Julio confirmó **«Autorizar las dos expansiones SQL»** en esta conversación. Se aplicaron únicamente
las expansiones preparadas, con timestamps nuevos y `pnpm pg:connect:migrate`:

- [HubSpot native receipts](../../../migrations/20261018174803715_hubspot-native-form-receipts.sql):
  dos columnas/default, dos constraints, índice parcial, función y trigger.
- [Meta receipts](../../../migrations/20261018174804112_meta-event-receipts.sql):
  columna/default, array acotado, constraint y función/trigger append-only ligados al CAS.

El preflight `migrate:status` no tenía migraciones antes; tras crear los archivos mostró exactamente
estas dos. Se copiaron ambos cuerpos Up/Down preservando sus markers. Los `.pending` se retiran
en esta entrega junto con su sustitución versionada; el test de preservación apunta al archivo real.
Los Down siguen siendo forward-only y fallan deliberadamente: conservar evidencia al revertir código.
No se tocó el contenido funcional del SQL revisado. Kysely regeneró sólo las tres columnas nuevas.

La condición original pedía un release compatible: el readback independiente del servicio confirmó
que ese código **ya estaba sirviendo** en el worker compartido y fallaba por schema ausente.
La autorización específica repara esa dependencia sin promover main, desplegar otro worker ni
habilitar un opt-in. Plan aprobado fuera de Git:
`Documents/google-ads-release-package-2026-10-18/release-review/schema-repair/plan.json`.

Readback posterior17:49:51UTC: tres columnas presentes, tres constraints validadas, índice presente,
ambas funciones y dos triggers habilitados. Ledger del runner contiene las dos migraciones;
`migrate:status` posterior sin pendientes. Ningún cambio de grants ni backfill.

Recuperación automática observada: scheduler existente respondió **HTTP200 a17:50:01UTC**,
segundo ciclo también200 a17:52:01UTC, sin errores de columnas en la ventana posterior
a17:48:40UTC. Al17:50:22UTC, backlog accepted/
routed/retrying vacío y sin deliveries queued/sending recientes. No hubo POST manual ni replay.
Readback exacto de las dos ocurrencias por fecha de creación truncada a milisegundo:
ambas están `delivered`, **cero destinos directos habilitados y cero attempts de proveedor**.
Es entrega al ledger; no se presenta como envío a HubSpot ni como confirmación externa.
La revisión servida sigue `ops-worker-00780-rhp`/9a8f1e1bf; no se cambiaron flags ni GTM.
Esta evidencia certifica recuperación del dispatcher; no certifica identidad nativa HubSpot,
recibo Graph, matching ni atribución publicitaria. Provisión/campo/mapping HubSpot y checkbox
GTM de recibo Meta conservan sus gates independientes.

La revisión del lote corresponde a89d70ec13. Las migraciones, el puntero del test y los tipos
regenerados de esta entrega son un delta local posterior, validado aparte; su commit no hereda
por inferencia el CI remoto de89d y requerirá CI del nuevo candidato antes de promover.

## CI del SHA exacto

| Ejecución | Estado | Alcance |
| --- | --- | --- |
| [CI push39144419403](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39144419403) | PASS | Lint/typecheck/gates/tests; Build y size gate omitidos por regla develop |
| [CI manual39150476967](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39150476967) | **PASS** | Lint/typecheck/gates,20.765 tests PASS,616 skip,0 fallos; build y size gate PASS, sin deploy |
| [CI Deep39150479431](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39150479431) | **FAIL** | Timeout15000ms en replay agregado del corpus del cotizador; corrección local descrita abajo |

Artifact del primer run leído independientemente:2.172 archivos de test PASS,20.765 tests
aprobados,616 omitidos y0 fallos; el artifact de CI manual confirma los mismos conteos.
No convertir omitted en passed. Build y tamaño de funciones quedaron aprobados en el run manual.

## Corrección del timeout de CI Deep

Deep falló en `pricing-v3-market-floor.test.ts:226`: un único test reproducía los52 artefactos
del corpus dentro de un límite de15s. Se conservan todos los archivos y la comparación exacta
de valores, claves y orden; cada artefacto pasa ahora a un caso separado, con el mismo timeout
global. El guard del mínimo de17 artefactos sigue presente. Sin cambios de cálculo, fixtures,
aserciones, cobertura ni workflows. No se resuelve aumentando límites ni omitiendo casos.

Verificación local V8:138 casos PASS,9.34s; lint y typecheck del delta comprobados aparte.
Para cerrar el CI remoto hace falta publicar el commit correctivo en una referencia de validación
`codex/*`, sin mover develop/main, y ejecutar sólo CI/CI Deep. Se revisaron todos los triggers
push: las ramas de despliegue son develop/main; ninguna coincide con esa referencia. La integración
Git de Vercel puede generar Preview independientemente: se prepara un bloqueo exacto de esa
rama mediante `git.deploymentEnabled=false` en el mapa de `vercel.json`, conforme al
[contrato CI](../../architecture/GREENHOUSE_CI_COST_SIGNAL_GUARDRAILS_V1.md). Sin bloqueo Vercel no
se considera seguro el push. Debe comprobarse después que no hay deployment para el SHA. La skill
de release exige aprobación explícita del push; pendiente antes de esa mutación. El checkout
compartido se conserva. CI verde del padre no se atribuye al commit nuevo.

## Política de release y siguiente paso

El único YAML nuevo, `.github/workflows/gtm-drift.yml`, usa schedule/manual, token WIF de GTM,
scope tagmanager.readonly y `gtm:snapshot --check`; no crea/publica versiones. El classifier
conserva su decisión `requires_break_glass` por cloud_release. Revisarlo no equivale a conceder
la capability de override ni a registrarla. No se cambió el classifier ni se agregó un marker
para eludir un dominio irreversible.

Después de CI: mantener candidato identificado, schema antes de worker y autorización del lote
antes de promover. Los prerequisitos Ads del paquete conservan sus gates independientes. No se
aplican cambios a fuentes, hosts, Ads o GTM para producir un resultado verde. La reparación DB
se autorizó aparte y se verificó contra el dispatcher existente.


### Candidato correctivo y trabajo concurrente

El commit correctivo `244652cb6` contiene sólo20 archivos propios (22 paths contando movimientos).
El checkout compartido recibió, además, fuentes de assets del menú y ocho documentos AXIS de otras
unidades. Se revisó el delta de160 entradas desde89d; no se alteró ese trabajo. Inventario de244:
1.581 archivos netos, escaneo de credenciales y parseo JSON sin hallazgos. SHA-256 del inventario:
`68415b91255c692b6ef1cd79c7b3b57301dd10d467b5f833208ad14001ce7b4f`.
Los132 assets adicionales son fuentes HTML/JSON/texto, sin nuevos binarios; no nueva aprobación visual.
La guarda de Vercel se prepara en un commit posterior antes de cualquier push. El CI futuro debe
fijarse a ese SHA final, no heredar el resultado de89d ni244 por parentesco.
