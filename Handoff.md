# Handoff activo

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

## 2026-08-19 — Hallazgos post-Codex sobre el bloque 1745/1746: guard corregido y ledger reconciliado

Codex cerró el paquete de recuperación de acceso (`5d5eb2f9c` + `f4b5f622f`). Una revisión posterior
encontró tres cosas que no estaban en su alcance; las dos primeras ya quedaron corregidas en `b2ff2b33e`.

**El guard de la migration de TASK-1746 tenía un hueco.** No verificaba la tabla de buckets ni las cuatro
funciones de acceso público, que su propio Down sí dropea. La regla generalizada quedó en
`GREENHOUSE_DATABASE_TOOLING_V1.md` §"El guard anti pre-up-marker debe ser simétrico con el Down". Como la
migration **todavía no se aplica**, se corrigió en el archivo original: no hay forward-fix pendiente.

**El ledger de flags mentía en dos filas.** Corregidas contra runtime real, no contra el doc:
`HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` está en `true` en la revisión activa `ops-worker-00585-nv6` (la fila
del snapshot decía OFF), y `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` está `<NO SET>` en esa misma
revisión — OFF de verdad, no sólo por default declarado — y ya tiene fila en `§ Pendientes de acción`.
Nota operativa: la revisión activa ya no es la `00576-7zz` del flip original; el flag sobrevivió a deploys
posteriores porque está declarado en `deploy.sh`, que es exactamente para lo que sirve declararlo ahí.

**Riesgo abierto — `--reporter=basic` da falso verde.** En vitest 4.1.0 el reporter ya no existe: el comando
falla al cargarlo y **sale con exit code 0**. Si alguien lo mete en un gate, ese gate pasa siempre. Los tests
reales del dominio están verdes (439 pass, 42 skipped por falta de proxy PG). No se corrigió nada porque no
está en ningún gate hoy; queda anotado para que nadie lo introduzca.

**Estado del bloque: code complete, rollout pendiente.** Nada del rollout se ejecutó: ninguna migración
aplicada, ningún secreto provisionado, el webhook de Resend sigue sin registrar y ningún flag cambió de
estado. El orden completo está en `docs/operations/runbooks/resend-email-lifecycle-rollout.md` y el siguiente
paso es suyo, no de código: aplicar las dos migraciones + el índice concurrente con readback.

**Owner del siguiente paso: operador.** El rollout cruza Vercel, Cloud Run y un proveedor externo con gates
humanos; no es candidato a automatización desatendida.

## 2026-08-19 — Ronda de documentación post-release: lo que quedó y la deuda que se hizo visible

Tres subagentes cerraron los huecos que dejó el release de TASK-1739. Lo que el siguiente agente
necesita saber:

**El catálogo de patrones tiene un octavo.** Antes de inventar una forma propia para "declarar un hecho
que no se puede inferir después", léelo: obliga a elegir entre propagar en transacción o hacer que los
readers críticos lean la raíz.

**El módulo Hiring emite 16 señales de reliability y sólo 5 estaban documentadas.** Ahora hay inventario
con dueño; quedan 8 sin delta propio (`talent_pool.integrity`, `assessment.template_module_without_questions`,
`assessment.assignment_health` y las 5 de `assessment_ai.*`). Ninguna está rota: es deuda documental.

**Mover una task a `complete/` rompe punteros.** Cinco quedaron colgando, incluido uno dentro del reader
de una señal productiva. Al cerrar una task, correr `grep -rn 'in-progress/TASK-####' src/ scripts/ docs/`
antes de dar por terminado.

**Deuda viva de TASK-1739** en `TASK-1748`: los readers del Banco de Talento no filtran por procedencia
—hoy las 11 personas sintéticas quedan fuera por su `lifecycle_status`, no por el filtro—, el archivado
escribe sólo sobre la postulación, y las 9 huérfanas del lane B siguen sin decisión.

## 2026-08-19 — Working contract para operar engagements On-Demand sin confundirlos con Projects

Se documentó la ontología `Organization → Engagement → Project/Campaign → Task` en
`docs/business-models/EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md`. La decisión de trabajo preserva Projects y
Campaigns como contenedores de tareas en Notion para un cliente; el Engagement es el compromiso comercial que
gobierna términos, capacidad, accountability, economics y cierre. On-Going y On-Demand comparten los mismos objetos
operativos: un engagement puede contener uno o varios Projects/Campaigns.

La activación venta→Delivery usa una `Ficha de Activación del Engagement` como snapshot ejecutable —sin reemplazar
quote/SOW/contrato— y provisiona sólo la diferencia sobre la Organization. `Product Service` queda como
clasificación condicional: campaña audiovisual, plan de medios, brandbook u otro deliverable/servicio conserva su
categoría y madurez real. La Gantt es una vista opcional según complejidad, no un requisito ni otro SSOT.

Estado honesto: **diseño conceptual Proposed; cero cambio de runtime**. El repo ya tiene `services`, phases,
progress, outcomes, lineage, asignación de equipo por `service_id` y `notion_project_id`, pero `engagement_kind` no
distingue un contrato regular On-Going de uno regular On-Demand y el catálogo documenta ambos como `retainer`.

Siguiente iteración: elegir 2–3 familias reales de engagements On-Demand, probar casos multi-capability y decidir si
una root row de `services` sigue siendo el aggregate o si hace falta un Engagement superior. Cualquier schema/sync,
Finance, access, team o Notion writeback requiere task + ADR; no implementar desde este handoff.

## 2026-08-19 — TASK-1739 cerrada en producción: qué queda vivo después del cierre

El filtro de procedencia ya opera en producción (`HIRING_SYNTHETIC_DATA_FILTER_ENABLED` ON, release PR #203
sobre `30301816955f`, watchdog `ok`) y el marcado/archivado está aplicado con autorización del CEO. Lo que
sigue importando no es lo hecho sino lo que cambia el terreno para el siguiente que toque Hiring.

**El desk se ve vacío a propósito y eso va a parecer un bug.** Pasó de 24 vacantes / 79 postulaciones a 2 / 47.
Si HR o cualquier agente reporta "desaparecieron candidatos", la respuesta no es apagar el flag: es mirar
`data_origin`. Revertir es un `false` + redeploy en menos de 5 minutos, pero hacerlo devuelve los fantasmas al
pipeline y vuelve a contaminar toda lectura downstream.

**Riesgo abierto #1 — el smoke bloqueado.** `scripts/hiring/verify-growth-forms-application-smoke.ts` NO corre:
declara `smoke_test` y la guarda del write path le prohíbe publicar. Es correcto, no es una regresión que
arreglar. Sus únicas dos salidas legítimas son que deje de necesitar la superficie pública real o que limpie lo
que crea. **Marcar su vacante como `real` para destrabarlo NO es una salida** — fabrica otra vez fantasmas
indistinguibles de una vacante verdadera, que es exactamente el problema que esta task cerró.

**Riesgo abierto #2 — falsa garantía de autorización.** Las capabilities `hiring.data_origin.mark`/`.purge`
están deferidas a propósito: la operación es hoy por CLI con actor registrado y sin superficie API/UI. Quien
construya el consumer (badge, toggle, vista de administración, ruta Nexa/MCP) las declara **en ese mismo PR**,
con grant a ≥1 rol real; declararlas antes sólo simula un control que ningún `can()` verifica.

**Decisión pendiente del operador — lane B de la purga.** Las 9 huérfanas siguen archivadas, no borradas. Es la
única mutación irreversible de la task y su valor marginal es bajo, porque archivar ya las saca de toda lectura.
El protocolo está intacto (`plan → allowlist → sign-off → apply`, abort total si una sola fila tiene dependiente
auditable); ejecutarlo requiere decisión humana explícita, no la inercia de "quedaba pendiente".

**Próximo paso concreto**: cerrar el impacto cruzado que no cabía en el dominio de edición del cierre — registrar
el cierre en `EPIC-011`, agregar el `## Delta` a `TASK-1734` (el sampler del gold set ya excluye sintéticos por
construcción, no por suerte) y anotar `scripts/hiring/purge-task-1378-test-applications.ts` como superado por el
CLI genérico. Y vigilar `hiring.data_quality.synthetic_records_aging` durante 7 días: steady `0`.

## 2026-08-18 — Incident response: delivery de Resend y recuperación de test planificadas

Discovery read-only confirmó que Resend **sí despacha** (393 IDs de proveedor), pero Greenhouse no captura
su lifecycle: no hay webhook registrado en la cuenta productiva, no hay secreto de firma operativo y las
proyecciones históricas no tienen ningún `delivered`/bounce/engagement. `sent` significa aceptación de la API,
no entrega al buzón. El handler existe pero debe corregir su resolución asíncrona de secretos antes de activar
el webhook, porque hoy puede responder `200 ignored` durante cold start.

Quedan creados `ISSUE-160`, ADR aceptado el 2026-08-19
`GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md` y tres tasks compactas:
`TASK-1745` (webhook/reconciliación), `TASK-1746` (ADR aceptado; command de recovery con rotación,
capabilities separadas y enlace fragment→sesión HttpOnly; implementación local en curso) y `TASK-1747`
(consumer Application 360). Gates de las tres tasks
verdes. `TASK-1745` está ahora `in-progress`: el preflight confirmó que el dedupe existente no es
transaccional y que un fallo posterior puede perder el evento en un retry. El fix preservará el sender
outbound como boundary independiente y activará el webhook sólo después de un canary firmado. Todavía no hay
cambio de runtime ni configuración externa.

El Slice 1 de `TASK-1746` quedó code-complete y validado localmente tras cinco rondas independientes de
Arquitectura, Talento y Seguridad: capabilities separadas, eligibility fail-closed, locks
assessment→application→candidate facet, receipt idempotente, events automáticos append-only, deadline
revalidado al commit con reloj real, retención candidate/workforce y purga gobernada. La migración sigue sin
aplicarse; no debe promoverse antes del command token-safe y de smokes PG que prueben ACL, constraints
diferidas, concurrencia y transiciones de retención. Evidencia local: 200 tests, ESLint, TypeScript, marker
gate 586/0, lint operativo y diff-check verdes.

El Slice 2A de `TASK-1746` también quedó code-complete local y validado por Arquitectura, Talento y Seguridad
sin P0/P1/P2. La capa global de email ahora clasifica los tipos que transportan credenciales, persiste un intent
redactado antes de rotar, bloquea batch/retry genérico y distingue rechazo del proveedor de aceptación incierta.
Assessment assignment y Talent Pool verification comparten claim atómico por evento+entidad; un replay o dos
workers concurrentes no vuelven a rotar. El índice único todavía no existe en runtime: antes de desplegar estos
writers debe correrse `scripts/operations/task-1746-create-token-intent-index.sql` y conservar su readback
`unique/valid/ready`. Ninguna migración, índice, secret, webhook ni configuración runtime se aplicó en este slice.

El Slice 2B de `TASK-1746` quedó code-complete local y validado sin P0/P1/P2 por Arquitectura, Talento y
Seguridad. El recovery email liga intent+receipt+rotación bajo una transacción, mantiene el deadline de tests
iniciados y no persiste el bearer. Replay y reconciliación solo proyectan evidencia durable; nunca reenvían ni
rotan, y Platform Health detecta receipts divergentes después de 15 minutos. El tipo de correo sigue OFF y sin
adapter productivo. Próximo paso: Slice 3, con fragment exchange, sesión HttpOnly, auth/capability server-side y
smoke de tracking. Migración, índice y runtime continúan sin aplicar.

El Slice 3A de `TASK-1746` también quedó code-complete local y auditado sin P0/P1/P2. Cada token ahora rota
con una versión explícita y la sesión candidata persiste solo un digest opaco ligado a esa versión; una nueva
emisión invalida las sesiones anteriores. El dominio distingue start-by, deadline de respuestas y 30 minutos
de gracia de envío; no-limit cierra a las 24 horas. El reloj autoritativo viene de PG y el navegador lo proyecta
con tiempo monotónico, por lo que un equipo adelantado o atrasado no congela ni extiende el test. Legacy
GET/start/save/submit y SELF-ID conservan elegibilidad, consentimiento y audit bajo los mismos locks y la misma
transacción. El feature continúa OFF y la migración no está aplicada. El siguiente slice debe construir la
limpieza síncrona `#access`, exchange→cookie HttpOnly, rutas token-free y Product API antes de cualquier smoke o
activación.

El Slice 3B quedó code-complete/dormant y reauditaron Arquitectura, Talento y Seguridad hasta P0/P1/P2=0. Ya
existen bootstrap pre-React que borra `#access`, exchange same-origin acotado, cookie `__Host-` HttpOnly, página y
API token-free, CSP enforced y protección ante maintenance/trailing slash. La sesión conserva elegibilidad y reloj;
un fence por public ID impide que dos pestañas con assessments distintos muten la instancia equivocada. El modal
de envío reutiliza MUI Dialog con foco, Escape, trap y reduced motion. El correo inicial **no cambia todavía**:
`HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` nace OFF en el ops-worker y OFF conserva el enlace legacy. El
workflow del worker incluye notifications en trigger, latest-SHA y drift-check. Antes del flip siguen obligatorios
migración+índice, cuatro rutas live, `click_tracking=false` verificado en Resend, rate limit público y smokes
PG/browser/href. No se aplicó migración, no se desplegó ni se cambió ninguna env.

El Slice 4 de `TASK-1746` quedó code-complete local y reauditaron Arquitectura, Talento y Seguridad hasta
P0/P1/P2=0. Existe un único command `recoverCandidateTestAccess` para email o enlace seguro; la Product API exige
sesión humana canónica, capabilities por canal antes de lookup, lineage exacta, Origin/JSON/idempotencia cerrados y
errores anti-oracle. El enlace manual rota el mismo assessment y se revela una vez; replay nunca devuelve el bearer.
El rate limit usa techo IP confiable de Vercel más bucket por credential/sesión válida, sin amplificación por tokens
aleatorios; savepoints conservan la cuota pero revierten cualquier write parcial. El owner diario de retención drena
buckets con readback y señal. Documentación, manuales y skills de Talento/Arquitectura/Secret Hygiene quedaron
sincronizados, incluido el runbook global `docs/operations/runbooks/resend-email-lifecycle-rollout.md`.

**Handoff a Claude:** no implementar de nuevo TASK-1745/1746. Slice 4 quedó versionado en
`5d5eb2f9c`; el siguiente bloque es TASK-1747 (UI Application 360). Antes de cualquier rollout: aplicar
migración TASK-1745, luego migración `20260819072130586`, ejecutar/verificar el índice concurrente de TASK-1746,
desplegar app+worker dormantes, configurar webhook firmado global de Resend, verificar `click_tracking=false`, hacer
smokes PG/browser/email consentidos y recién entonces habilitar capability/email type/cutover. Hoy no se aplicó ni
activó nada; el correo inicial continúa por el enlace legacy y `sent` no prueba entrega.

## 2026-08-18 — Hiring AI y candidate review MCP: runtime reconciliado

El release `7e7a474217eb` (run `32193134959`) dejó `global_provisional` activo para assessments elegibles de
todas las vacantes: ops-worker `00584-r4x`, 100% tráfico, concurrencia 1, cap 1000 y scheduler cada 2 minutos.
Exception policy y batch confirm siguen OFF; nada muta el score efectivo ni llega al postulante. El dossier está
ON en producción y auto-propone con Google `gemini-2.5-flash`/prompt v2 cuando CV limpio y assessment puntuado
están listos; nunca auto-confirma.

Candidate review MCP también quedó activo internal-only con applicationId exacto, chunks minimizados/redactados,
hash, purpose y audit. Canary OAuth/MCP 200 y borde sin auth 401. B2B y todos los writes siguen bloqueados.

Lifecycle honesto: TASK-1743 cerró code complete con GVC 4,82/5, pero la compactación final de barras
`20964b72a..3616cb5b8` es posterior al SHA productivo y viaja en el siguiente release ordinario. TASK-1742 y
TASK-1718 permanecen in-progress por cooldown/rollback/sign-offs; no se inventaron aprobaciones. El release
classifier omitió rutas Hiring del ops-worker y exigió corrección manual; verificar siempre parity 4/4 por SHA.

## 2026-08-18 — TASK-1739: procedencia de datos de Hiring, slices 1-4 y 6 implementados

Ocho commits. Lo que ya opera: la procedencia existe como HECHO declarado en el nacimiento del dato
(dos raíces, persona y demanda) con copia derivada por trigger en la postulación; los readers del desk
dejan de contar fantasmas detrás de flag; el gold set los excluye SIN flag; hay marcado gobernado con
allowlist humana; y un gate mecánico impide que un seed nuevo cree datos sin declarar.

**Nada cambió todavía para el operador**: el flag nace OFF y nadie marcó nada. Estado correcto:
`code complete, rollout pendiente`.

**Lo que falta y por qué no lo hice**: el apply del marcado exige que un humano pode la allowlist
línea a línea —ese es el punto del protocolo, no un trámite—; el flip del flag en producción exige
**aviso previo a HR**, porque 12 de 14 vacantes son sintéticas por autor y el desk no perderá "algunas
filas" sino casi todas las vacantes; y el Slice 5 (purga) está prohibido por la propia task hasta que
el Slice 4 esté aplicado y verificado. Falta además la triple documentación y las dos capabilities
(`hiring.data_origin.mark`/`.purge`), que hoy no tienen consumer porque la operación es por CLI.

**Dry-run real listo para revisar**: 34 candidatos, todos de confianza ALTA — 12 demandas y 12
vacantes por autor (8 de ellas marcadas además como "estuvo publicada" en el careers real) y 10
personas por dominio de correo reservado. Cero falsos positivos: ningún `@efeoncepro.com`, ninguna
coincidencia por nombre. Correr `pnpm hiring:data:mark-synthetic` para verlo.

**Tres cosas que aparecieron al construir**, todas en los commits:

- La guarda de publicación **bloqueó el smoke que causó el problema**: `verify-growth-forms-application-smoke.ts`
  creó las 8 vacantes fantasma publicadas y no tiene teardown. Queda bloqueado a propósito, con sus dos
  salidas legítimas registradas como follow-up. Destrabarlo marcando su vacante como `real` no es una.
- El guard de frontera del dominio atrapó mi tabla de audit sin declarar. Declarada.
- Corriendo la suite con live tests aparecieron **dos roturas preexistentes** de
  `submit-application.live.test.ts` que CI nunca vio (sólo corren con PG): `publicSeniority` obligatorio
  desde TASK-1740 y `residenceCountryCode` requerido desde el flip de TASK-1688. Ambas reparadas.

## 2026-08-18 — Canary de identidad y smoke del expediente: los dos pendientes declarados, cerrados

Los dos flags que se prendieron "ON con pendiente" ya tienen su verificación. Ambas filas del ledger
quedaron actualizadas con la evidencia.

**Canary TASK-1736 — verde, 4/4.** Se ejecutó como live test gobernado
(`HIRING_CANARY_T1736=1 pnpm vitest run src/lib/hiring/candidate-intake/canary.live.test.ts`), no por el
endpoint público. La razón importa: la base es UNA sola para dev/staging/prod y el ops-worker de correos
es el mismo, así que postular contra `EO-OPN-0009`/`EO-OPN-0061` habría dejado un candidato falso
—indeleble— en una vacante con candidatos en proceso. Verificado además que **no salió ningún correo**.

**Lo que el canary enseñó y el runbook no decía.** Con el flag ON, la evidencia y el audit son
append-only **por grant** (`greenhouse_runtime` no tiene DELETE) y esas filas pinnean por FK toda la
cadena application → facet → Person → opening → demand. O sea: **el canary no puede limpiarse a sí
mismo**. Mi teardown lo intentó y falló en silencio porque tenía `.catch(() => undefined)` — ese swallow
está eliminado y ahora reporta el residuo a gritos. El runbook lleva la advertencia y el residuo exacto.

**Residuo pendiente (bloqueado por la misma credencial que ISSUE-159).** Sujeto 100% sintético:
Person `identity-…-canary-t1736-1787066079713-live-test-invalid`, application `happ-ffebd53b…`,
opening `EO-OPN-0101` **ya despublicado** (`internal_only`, el listado público volvió a tener sólo las 2
vacantes reales), más 2 filas de evidencia y 3 de audit. Registrado como **Delta en TASK-1739**, que es su
hogar natural: su lane de purga ya distingue archivar-con-historia de borrar-huérfanos, y este es su primer
objetivo concreto. `purge-test-facets` NO sirve acá (exige cero postulaciones y consent `not_captured`).

**Smoke del expediente (TASK-1735) — verificado sobre el caso real, sin escribir nada nuevo.** El
propose→confirm post-fix ya había ocurrido el 17-ago 00:12: la nota `hnote-d710c072` guardó sus 8240
caracteres completos (termina en punto) contra los 8000 de `hnote-e2fd7280`, y lleva `supersedesNoteId` +
`repairedFullLength` en su `context_json`. Queda **sólo la revisión humana del primer expediente real**:
es el gate de supervisión humana, no lo puede firmar un agente.

**Fix de paso:** `evidence_coverage_gap` ahora filtra `source='public_careers'`. Contaba todas las
postulaciones, pero la evidencia sólo nace del intake público — cada carga manual desde el desk la habría
dejado en `warning` para siempre. Test de regresión sobre el SQL. `local:check` EXIT=0.

## 2026-08-18 — Las dos vacantes vivas ya están en el contrato editorial v2

Autoradas y publicadas con `PublicOpeningContent` v2 completo por el command canónico. Antes tenían
sólo `workModel` poblado y toda la hoja caía al fallback de prosa; ahora sirven las 13 secciones del
formato canónico, incluida **"Cómo se ve un buen primer año"** — los outcomes observables, que es el
campo que el formato agrega y que ninguna de las dos declaraba.

Casi todo se **derivó de la prosa ya aprobada** (descripción, requisitos, deseables, notas de
proceso), que es reestructurar, no inventar. Los tres hechos que no existían en ninguna fuente los
resolvió el CEO, tal como exige la receta (`job-offer-recipe.md` §0: *"if a fact cannot be resolved,
carry `needs confirmation` and stop before publication"*): **Account Manager reporta al CEO**,
**Content Creator a la Creative Operations Lead**, y el **compromiso de respuesta es de 3 a 4
semanas**. Ese último es el campo que más pesa: es donde la vacante deja de vender y se compromete —
y hoy hay 35 postulaciones sin revisar, así que el compromiso es deliberadamente conservador.

Corregido de paso: `EO-OPN-0061` publicaba "Contrato indefinido" como jornada, que con vinculación
internacional sólo es exacto para Chile. Ahora dice "Jornada completa" —la dedicación sí es
universal— y la forma contractual se explica en el modelo de trabajo. Efecto colateral correcto:
`employmentType: FULL_TIME` en el schema, que antes se omitía por ambiguo.

Verificado en producción: ambas 200, las 13 secciones presentes, JSON-LD de 5756 y 4508 caracteres
con los outcomes incluidos, `baseSalary` sólo en Content Creator (la única con rango aprobado) y
`employmentType: FULL_TIME` en las dos.

## 2026-08-18 — Careers público EN PRODUCCIÓN: hoja editorial + JobPosting, con 4 flags prendidos

Release `fa54670470c1` (`released`, run `32127499151`, 8m31s). Batch de EPIC-011: TASK-1740 +
TASK-1741 + el acumulado 1719/1734/1735/1736 + `ISSUE-159`. Watchdog `OK` con **4/4 workers
synced** (el residual change-gated del `ops-worker` lo clasificó solo, diff de rutas runtime vacío).

**Verificado en producción real, no en el generador:** las dos vacantes emiten `JobPosting` con
`TELECOMMUTE`, 20 países, `hiringOrganization: Efeonce`, canonical correcto y sin
`directApply`/`validThrough`/`baseSalary`; la hoja editorial se sirve con sus secciones; una vacante
cerrada responde 404 sin schema. El calificador de beneficios ("se formaliza según tu modalidad de
contratación y país de residencia") aparece en el HTML **y** en el schema, desde la misma fuente.

**Flags prendidos en Production** (con redeploy `greenhouse-4qu4swddd` — sin él quedan inertes):
`CAREERS_DETAIL_EDITORIAL_V2_ENABLED`, `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED`,
`HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED`, `HIRING_EVALUATION_DOSSIER_AI_ENABLED`. Los dos
últimos se prendieron por autorización explícita del CEO **con sus verificaciones aún pendientes**:
el canary del runbook de identidad y el smoke propose/confirm del expediente. Están anotados en el
ledger como ON-con-pendiente, no como cerrados.

**El quinto flag se prendió DESPUÉS de cumplir sus precondiciones, no saltándolas.** Primero quedó
apagado porque `services/ops-worker/deploy.sh` exige tres y sólo se cumplía una. A instrucción del
CEO ("resuelve lo que haga falta para prenderlo de forma robusta"), se resolvieron las otras dos:
la policy del canary `EO-OPN-0009` se reconfiguró a `on_stage_entry`/`shortlisted` (cap 3/60 min) y
se habilitó por command canónico —`configureOpeningAssessmentPolicy` la devuelve a `draft` a
propósito, así que son dos llamadas y quedó en `policy_version=2`—, y el cancel/recovery se ejercitó
con `cancel.live.test.ts` **5/5 contra PG real** en vez de cancelarle el test a un candidato real,
que le habría matado el enlace. Recién entonces: default `true` en `deploy.sh` (SoT, porque
`--set-env-vars` es destructivo y un flip out-of-band se evapora en silencio) **más**
`gcloud run services update`, verificado en la revisión activa `ops-worker-00576-7zz`.

⚠️ **Ahora sí dispara**: mover una postulación de esa vacante a `shortlisted` le asigna el test
automáticamente. Las 5 que ya están en esa etapa tienen test abierto (4/5), así que la señal del
canary llega cuando Talent mueva a alguien de los 10 `sourced`. El tope de 3 por hora es
deliberadamente conservador: un movimiento en lote mayor deja a los excedentes con el aviso genérico
de avance, sin prueba — conviene calibrarlo con Talent antes de un batch grande.

**Dos aprendizajes operativos para el runbook:** (1) el clasificador de permisos bloquea
`vercel env add`/`redeploy` hasta que el operador autoriza expresamente en el chat — no es credencial
ni scope; (2) `vercel env add <FLAG> Production` falla con `api_error: specify at least one
Environment`: **el entorno estándar va en minúscula** (`production`), mientras el custom (`staging`)
respeta su nombre literal.

**Sigue pendiente de decisión del CEO:** monitor de equidad (capturaría categorías protegidas bajo
una política que sólo existe en versión de pruebas), scoring por lotes (bloqueado por falta de gold
set calificado, no de permiso) y lectura de CVs por agentes (sin firmas de privacidad/seguridad).

## 2026-08-17 — Barrido de cierre: lo que estaba a medias, y el incidente que nadie había registrado

Tres auditorías paralelas sobre TASK-1719, el rollout de 1740/1741 y el estado general del
dominio. Se empujaron 7 commits a `develop` (CI verde antes del push, pre-push limpio).

**Lo más grave no era ninguna de las tres tasks: era un fixture.** Los `*.live.test.ts` de hiring
anclaban con `SELECT profile_id FROM identity_profiles WHERE active = true LIMIT 1`. Sin `ORDER BY`
el sujeto es no determinista, y la base es **única para dev, staging y producción**: cayó sobre un
colaborador ACTIVO y `reconcileCandidateFacet` le fabricó ficha de candidato, membresía de Banco de
Talento y evento de consentimiento con `consent_status=not_captured`. Una persona real registrada
como candidata sin postular ni aceptar nada. Cerrado con `live-test-identity.ts` (perfil sintético
dedicado, idempotente, verificado contra PG) y **`ISSUE-159`** abierto ANTES de purgar, porque la
purga borra la evidencia del propio incidente. **La ficha contaminada sigue viva**: el `--apply` del
script de purga muere en `ECONNRESET` abriendo su cliente TCP con perfil `ops`, y el camino canónico
no sirve (runtime no tiene DELETE, por diseño).

**Otros dos cierres del lado 1740/1741:** los beneficios publicados ya llevan el calificador que el
charter exige ("se formaliza según tu modalidad de contratación y país de residencia") — importa
porque fuera de Chile la vinculación es internacional y publicar "15 días de vacaciones" en seco
presenta un equivalente contractual como derecho estatutario; y la degradación del contenido v2 dejó
de ser silenciosa (emite señal sólo cuando la versión es conocida, o sea cuando es anomalía real).

**TASK-1719 — el Handoff estaba desactualizado en su punto más caro:** el backlog del consumer **ya
se drenó solo** a las 13:54Z de hoy (23 eventos, 22 `stale` por la ventana de 24 h y 1 no-op, cero
correos). Ese era el bloqueador principal declarado. Lo que sí falta y nadie había escrito: la policy
del canary está en `mode=manual`, así que **prender el flag hoy es un no-op**; y el default de
`deploy.sh:458` sigue en `false`, con lo que un flip por `--update-env-vars` se evapora en el próximo
deploy del ops-worker (que se redespliega cada pocas horas — mismo patrón que borró
`GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`). Además el canary no produce señal: las 5 postulaciones
`shortlisted` ya tienen test abierto, así que hace falta que Talent mueva a alguien de `sourced`.

**Riesgos vivos que quedan documentados, no cerrados:** retención Ley 21.719 sin comando de borrado
(sólo hay un reader que reporta vencimiento); CVs `legacy_unscanned` descargables mientras
`ASSET_MALWARE_SCAN_ENABLED` sigue bloqueado por ClamAV no provisionado (TASK-1378 sin decidir); y
TASK-1718 con código en producción tras flags cerrados y sus sign-offs abiertos.

## 2026-08-17 — Grandfathering: una vacante viva no se cae por una regla de autoría

Revisión de TASK-1741 sobre el checkout compartido. El renderer editorial quedó bien (typecheck
limpio, 974 tests verdes, migración de seniority aplicada, el texto de la vía contractual sobrevivió
íntegro vía mapeo `remoteModel`→`workModel`), y **codificaron como candado el invariante de secuencia
que TASK-1740 sólo había documentado**: el schema no puede emitirse sin el renderer editorial ON.
Verifiqué la paridad empíricamente comparando frase por frase el JSON-LD contra el DOM renderizado:
alineado en ambas vacantes.

**El hallazgo que sí requería acción:** `publishOpening` pasó a exigir contenido editorial v2 de
forma incondicional, y las dos vacantes publicadas son v1. Consecuencia: pausarlas las dejaba en 404
hasta reescribir el bloque entero — con **15 postulantes en `EO-OPN-0009` y 33 en `EO-OPN-0061`**,
o sea cortando el canal de procesos vivos. Autorizado por el CEO, se implementó **grandfathering**:
`requiresEditorialV2ForPublish(published_at)` exige v2 sólo en la primera publicación. Verificado
contra las filas reales: ambas pueden republicarse, y una vacante nueva con el mismo contenido sigue
bloqueada (contraprueba en el mismo script). El operador desde brief conserva v2 obligatorio porque
siempre crea vacantes nuevas.

**Guardrail nuevo:** el invariante central del dominio (HTML visible ≡ JSON-LD) no tenía test que lo
defendiera —el schema se testeaba aislado y la página aislada—, así que agregar un párrafo sólo-schema
pasaba en verde. Ahora hay un test que cruza ambos lados sobre el DOM renderizado.

**Pendientes que quedan del lado de TASK-1741 (reportados, no corregidos):** editar `publicContent`
de una vacante publicada v1 obliga a migrarla entera a v2; el read path v2 traga excepciones con
`catch → null`, así que el día que exista contenido v2 una validación más estricta lo haría
desaparecer de la página **sin señal**; y toda vacante nombra 8 marcas de partners sin el gate de
vigencia por vacante que pide el charter, además de publicar beneficios sin su calificador
"se formaliza según tu modalidad y país" — relevante para vinculación internacional.

## 2026-08-17 — TASK-1741 tomada en develop tras auditoría paralela

El operador autorizó expresamente ejecutar en el checkout compartido `develop`, sin cambiar de rama,
y usar subagentes. Tres auditorías read-only revisaron contrato público/SEO y readiness UI. Antes del
renderer se corrigieron los blockers de TASK-1740: la proyección pública ya no selecciona ni usa
`internal_title`/`seniority`, `publicSeniority` es obligatorio al publicar, un opening publicado no
puede invalidarse mediante PATCH, los bloques parciales no borran la prosa legacy y la compensación
rechaza monedas/tipos falsos. Tests focales (53) y TypeScript verdes. TASK-1741 está ahora
`in-progress`, `UI ready: yes`, con dirección durable `Editorial dossier`; implementación secuencial
por solapamiento causal entre view model, copy, renderer y CSS. El formulario queda fuera de alcance.

## 2026-08-17 — TASK-1740 code complete: contenido público estructurado + fundación JobPosting

Slices 1-4 en `develop` local (4 commits, sin push). El opening gana `public_content_json`
(`PublicOpeningContent` v1: promesa/outcomes/trabajo/essentials/learnables/evidencia/modelo
remoto/proceso/beneficios/compensación estructurada; write 422 estricto, read leniente con fallback
legacy de prosa) y `public_remote_eligible_countries` (ISO alpha-2 reales — `LATAM`/`Global` se
rechazan, verificado en vivo contra PG). El detalle público emite canonical explícito siempre y
`JobPosting` JSON-LD detrás de `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` (Vercel-only, OFF, en
ledger), con builder fail-closed desde el MISMO payload visible: remota sin países o presencial sin
city+country ⇒ sin schema (hoy NINGUNA vacante viva emite schema — ambas son `LATAM` sin país, y eso
es lo correcto, no un bug). Sin directApply, sin validThrough, salario sólo estructurado; el retiro
es el 404 del unpublish. Decisiones: omitir schema en vez de bloquear publish (bloquear rompería
re-publicar los 2 openings vivos); `hiringOrganization` = marca Efeonce del brand SSOT
(`EFEONCE_BRAND_NAME` nuevo). El PATCH interno transporta los campos sin cambio de ruta (parity).
TASK-1741 quedó desbloqueada con fixture (`editorial-opening.fixture.ts`) y delta en su spec.

**Actualización mismo día:** el CEO decidió **20 países** (toda Latinoamérica **excepto Cuba** + US +
ES) y precisó la vía contractual: **Chile con contrato laboral local, fuera de Chile vía internacional
con pago directo de Efeonce** (`international_internal`, sin EOR). Eso quedó en la elegibilidad
estructurada Y en el contenido visible (`content.remoteModel`) de ambas vacantes — porque el país de
la entidad **no va en `jobLocation`**: ponerlo ahí haría que Google dejara de tratar la vacante como
remota y la mostrara como empleo presencial en Santiago. El anclaje contractual se declara en el
contenido; la elegibilidad, en `applicantLocationRequirements`.

**Precondición de secuencia entre los dos flags (la pregunta "¿no hay que prender el flag para 1741?"
tiene respuesta doble):** TASK-1741 **no** necesita el flag de schema para desarrollarse — `content` y
`remoteEligibleCountries` viajan en el payload público siempre, sin flag. Pero el orden inverso sí es
obligatorio: **el renderer va primero**. Verificado que `view-model.ts` y
`components/greenhouse/careers/**` todavía NO consumen `content`, mientras el builder de JSON-LD sí; por
lo tanto prender `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` antes de 1741 emitiría a Google el
`remoteModel` (ya poblado en las 2 vacantes) sin estar visible en la página — la desalineación
HTML↔schema que el propio dominio prohíbe, y una desviación de las guías de Google. Con el flag OFF no
hay desalineación activa: el dato espera a su consumidor. Documentado como invariante duro en ADR,
manual, ledger, ambas tasks y las skills.

**El primer artefacto real destapó un bug del builder** (patrón real-artifact): un bloque estructurado
PARCIAL —sólo `remoteModel`, que es exactamente el estado mientras el contenido editorial no se
autora— hacía que la descripción del JSON-LD dejara de incluir la prosa del rol y quedara reducida a
ese párrafo. Corregido: un bloque parcial **complementa** la prosa legacy y sólo un bloque con
narrativa núcleo la reemplaza. Validado con el JSON-LD renderizado real de ambas vacantes (flag
prendido en local y restaurado a OFF; cero campos requeridos faltantes). El `pnpm build` fue
autorizado y salió verde. **Pendiente de rollout (bloquea `complete`):**
push/release + flag staging→Rich Results Test→producción + smoke lifecycle desplegado — **retenido a
propósito: el operador decidió que el release espera a TASK-1741 y viajan juntos.** Runbook: manual
`operar-careers-publicas.md` §Contenido estructurado y schema de Google.

## 2026-08-17 — Tasks creadas para vacantes públicas: contrato SEO primero, renderer después

Se registraron `TASK-1740` y `TASK-1741` como una partición deliberada. `TASK-1740` es la base
backend/data: modela contenido candidato-facing allowlist-safe, fallback legacy, lifecycle y
canonical/`JobPosting` desde el mismo contenido visible; no toca el formulario ni habilita Indexing
API sin autorización/quota. `TASK-1741` es solamente el consumer UI: renderer editorial incremental
de `/public/careers/[publicId]`, detrás de flag y con GVC 1440/390, que preserva URL, formulario y
exactamente los dos CTA existentes (hero verde y resumen azul; sin CTA final). Ambas exigen que
remote/global use países elegibles reales y nunca invente salario, beneficios o condiciones de
contrato. El wireframe es `docs/ui/wireframes/TASK-1741-public-careers-editorial-detail-renderer.md`.

## 2026-08-17 — Ajustes razonables: ahora se pueden otorgar, y se pueden pedir

Cierra la Open Question 7 del ADR de TASK-1719. `accommodations_json` estaba cableado end-to-end
**en lectura** desde TASK-1360 —lector TS, predicado SQL de vencimiento, banner al candidato— pero
**17 instancias, las 17 vacías**: nunca se le concedió un ajuste a nadie porque no se podía. La
única palanca era alargar el límite de la plantilla, que se lo alarga a toda la cohorte. Pesa más
desde que la prueba se manda en Preselección: se le pide trabajo a más gente.

Decisiones que valen releer antes de tocar esto:

- **El motivo NO se persiste, y es decisión, no omisión.** Un ajuste revela por naturaleza una
  condición protegida; guardarlo crea el dato con el que después se discrimina. Se guarda sólo el
  arreglo (minutos, quién, cuándo). La constancia narrativa va al expediente.
- **Capability role-only (People), no la genérica de autorar.** En esta plataforma "usuario interno"
  incluye diseñadores y colaboradores: con la genérica cualquiera concedería tiempo extra.
- **Se cerró un contrato implícito**: la lectura aceptaba SEIS grafías del mismo hecho. Queda una.
  Seguro de narrar porque 0 filas usaban ninguna.
- **Divergencia latente encontrada al unificar**: el lector TS redondeaba y el SQL truncaba — un
  valor fraccionario habría mostrado un contador y vencido con otro. Ambos truncan; hay test vivo.
- **La otra mitad, que la doc daba por hecha sin serlo**: el correo NO invitaba a pedir el ajuste.
  Uno que nadie sabe que puede pedir no es un ajuste, y quienes preguntan igual son los que ya se
  sienten con derecho — el sesgo que esto corrige. Ahora lo invita en ambos idiomas y dice que no
  hay que explicar por qué.

Pendiente declarado: sin UI, sin aviso automático al candidato (avisar es acto humano, igual que en
cancelación), y **sólo cubre tiempo extra** — formatos accesibles son trabajo de accesibilidad de la
pantalla de rendición, no de este campo.

## 2026-08-17 — La etapa canónica del candidate test es `shortlisted`, no `interview`

Decidido con la lente de talent a pedido del operador, y verificado contra la base ANTES de
argumentarlo: hay **0 postulaciones en `interview`** (42 `sourced`, 9 `shortlisted`, 7 `screening`),
y las pruebas existentes se asignaron en `screening`/`shortlisted`. El ejemplo que yo había escrito
en el manual (`triggerStage: "interview"`) habría configurado una automatización que no se dispara.

Dos razones independientes, ambas en el invariante 21 del ADR: (a) la ganancia de validez está en
**combinar** entrevista estructurada + muestra de trabajo, y esa ganancia sólo aparece si la prueba
llega ANTES —si no, se entrevista a ciegas y la evidencia llega cuando ya no cambia ninguna
pregunta—; (b) el momento del filtro es una decisión de **equidad**: una prueba no pagada aplicada
temprano no sesga por el puntaje, sesga por quién logra completarla, y ese sesgo es invisible en las
métricas de scoring porque esas personas nunca llegan a tener una.

`screening` queda fuera del allowlist **a propósito**: no es candidate-facing, así que un assignment
bloqueado ahí degradaría a silencio y rompería "ni cero ni dos". Hay test que lo fija con su razón.

Sin cambio de schema: las dos policies de la base ya eran `shortlisted` (fixtures de test). Esas dos
quedaron **`disabled` por el command gobernado** — eran las únicas de la base, ambas `enabled` +
`on_stage_entry` sobre openings `LIVE-TEST`, o sea una mina para el canary.

Pendiente que esta decisión vuelve más urgente: **el write path de ajustes razonables**. La doctrina
exige poder dar tiempo extra o formato accesible; hoy el campo existe sin forma de escribirlo, así
que no se puede acomodar a nadie sin alargar el límite para todos.

## 2026-08-17 — TASK-1719 code complete: asignación de tests por etapa (Slices 0-5)

Se cerró el código de los seis slices. Antes de esto la task tenía la fundación (policy + command)
pero **el command no tenía un solo llamador**: era un motor sin llave. Ahora hay superficie manual
(propose→confirm con effect digest y expiry enforceado a 30 min), cancelación gobernada, consumer
reactivo de etapa y cola de reconciliación con endpoint propio.

Decisiones que cambian el contrato y no estaban en la spec:

- **Slices 4 y 5 colapsaron en UNA pieza.** El ADR exige un consumer único que absorba el correo de
  etapa; mantenerlos separados es justamente lo que produce cero correos o dos.
  `hiring_stage_changed_email` (TASK-1689) fue **reemplazado** por
  `hiring_stage_changed_candidate_comms`. El `handler` key cambió.
- **Ventana de accionabilidad de 24 h.** Un `stage_changed` más viejo no comunica ni asigna: va a la
  cola humana. Es regla de dominio y además hace segura la primera corrida del consumer nuevo, cuya
  Phase A barre todo el histórico del event type.
- **`_occurredAt` se inyecta ahora en el payload reactivo** (`parsePayload`). La fila ya lo traía y
  no se exponía, así que ninguna projection podía saber la edad de lo que procesaba. Con test propio:
  sin esa inyección la ventana sería código muerto que nunca dispara, con build y tests verdes.
- **`already_assigned` es ambiguo** y la ambigüedad manda cero o dos correos. El fan-in lo desambigua
  leyendo el LEDGER (replay propio ⇒ callar; `existing_open_instance` ⇒ degradar). El deduplicador de
  emails NO cubre este caso: los dos correos viajan con `sourceEventId` distintos.
- **Cancelar libera el cupo de unicidad** (`cancelled` fuera del predicado del índice parcial), que es
  lo que la vuelve recuperación real y no sólo un cierre. Verificado contra PG.

Hallazgo colateral, ya corregido y commiteado aparte: **dos plantillas de assessment activas eran
irrenderizables** (5 preguntas para 8 módulos y 6 para 5) — el módulo sin preguntas no desaparece, el
candidato ve la sección vacía y el examen encogido se envía sin error. Archivadas + señal
`hiring.assessment.template_module_without_questions`. Precursor vivo: **6 competencias sin banco**.

**Estado: `code complete, rollout pendiente`.** `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` nace OFF (SoT
`services/ops-worker/deploy.sh`, sólo ops-worker — prenderlo en Vercel no hace nada) y toda policy nace
`draft`+`manual`. Falta lo operacional: declarar la policy del canary, drenar el backlog del consumer,
flip y monitor 7 días. Con el flag OFF el candidato **sigue recibiendo** el aviso de avance: apagarlo
es rollback seguro, no apagón. Manual: `docs/manual-de-uso/hr/operar-asignacion-de-tests.md`.

## 2026-08-17 — Beneficios globales de Efeonce documentados para vacantes

Las skills espejo de Talent y Payroll ahora comparten el `Efeonce Candidate Benefits Charter`: 15 días
hábiles de vacaciones remuneradas más un día por cada año continuo cumplido hasta 20 para todos los
colaboradores globales; dos días flotantes, 16 horas de atención médica, dos días de bienestar, duelo,
deber cívico, matrimonio/unión civil, 10 semanas para la madre/persona que da a luz y 2 para el padre/progenitor no gestante (adopción/cuidado: 4/2), mudanza, desarrollo y apoyo para
trabajo remoto/salud mental. Los feriados corporativos son los de Chile y van aparte de vacaciones; una cobertura preacordada recibe descanso compensatorio. La carta permite comunicar el baseline global en vacantes,
pero prohíbe afirmar que todos los permisos ya se autogestionan o calculan en Greenhouse. Payroll/Legal debe
incorporar cada beneficio al instrumento contractual o del proveedor según país/modalidad antes de operarlo.
La carta ahora define año/prorrateo, carry-over, continuidad de servicio, familia, retorno postparto, equivalencia contractor y wallets: aprendizaje US$500/año, conectividad/coworking US$50/mes y salud mental US$300/año. El aporte de equipo (US$400/36 meses) sigue siendo política aprobada, pero se conversa en entrevista u oferta y no aparece en el copy estándar de vacantes. La ley local es overlay que puede mejorar, nunca reducir, el baseline. No hubo cambio de runtime, schema,
contratos ni política configurada.

## 2026-08-17 — Skill de Talent reforzada para vacantes públicas e inbound

Las skills espejo `greenhouse-talent-people-operator` de Claude/Codex incorporan un protocolo
evidence-led para vacantes públicas: evidence packet, benchmark de roles comparables, ledger de
claims, estructura de conversión, medición por fuente y gates de publicación global/remota. La
referencia nueva `references/inbound-recruiting-job-ad-research.md` ahora documenta el playbook
completo: propuesta y prueba, realistic preview, experiencia de candidato, Talent Pool con
consentimiento, compensación/condiciones como señales de confianza y experimentación por outcome,
con fuerza y límites de la evidencia explícitos. No hubo cambio de runtime, schema, beneficios ni
publicación de vacante. Pendiente operativo: completar los datos reales del Senior Visual Designer
antes de redactar/publicar su opening.
