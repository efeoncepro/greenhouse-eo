# Greenhouse Hiring / ATS Architecture V1

## Acceso al test del candidato — asignación, recuperación y aviso (TASK-1746/1747/1757)

Contrato vigente. Cubre el write de recuperación, su carril de lectura, el único camino de asignación y el
aviso al candidato cuando su credencial se rota. Cronología en `docs/changelog/` y en las tasks dueñas.

### Write: un solo command, dos canales excluyentes

El write canónico es `recoverCandidateTestAccess`; serializa por assessment, revalida
assessment→application→candidate facet y separa `email` de `secure_link`. Ambos canales rotan una sola versión
de credencial bajo la misma transacción que receipt/audit/outbox; el enlace manual se revela una vez en la
respuesta y nunca se persiste. El adapter Product API
`POST /api/hiring/assessments/[id]/access-recovery` exige sesión humana allowlisted, capability por canal,
lectura de application y assessment antes de lookup, Origin exacto, body cerrado e idempotencia acotada.

La frontera candidata usa `/public/assessment/access#access=…` → exchange POST → cookie `__Host-` HttpOnly
y rutas posteriores sin token. Rotar invalida sesiones anteriores; el reloj de PG gobierna start-by, plazo de
respuesta, gracia de 30 minutos y 24 horas post-start cuando no existe límite. El abuso se controla con techo
IP previo y presupuesto por credencial/sesión válida bajo locks; nunca se persisten IP o bearer raw. Retención
de sesiones/buckets tiene owner diario en ops-worker, loop acotado, readback y señal de residuo.

### Read: la disponibilidad es su propio carril, y es MÁS estrecho que el write

`GET /api/hiring/assessments/[id]/access-recovery?applicationId=…[&reason=…]` responde
`{ availability, canRecoverByEmail, canRevealSecureLink }` desde el mismo reader que ya consumía el POST
(`getAssessmentAccessRecoveryAvailability`). Existe para que la capacidad "explicar por qué NO se puede
recuperar" no quede UI-only: sin él, ni Nexa ni MCP ni un segundo consumidor alcanzan el juicio.

Su puerta **no** es `hiring.assessment.read`. Esa capability la porta todo tenant interno por el routeGroup
`internal` —collaborator, designer, people_viewer incluidos—, y el DTO expone si la candidata retiró su
consentimiento, si su decisión no se le comunicó y si el proveedor bloqueó su correo. La puerta es
`hiring.assessment.read` + `hiring.application.read` + **al menos una** de las dos capabilities de
recuperación. `applicationId` es obligatorio y se compara contra el aggregate, igual que en el POST: un test
que no pertenece a esa postulación se responde como inexistente, sin confirmar que existe en otro lado.

`reason` es opcional y validado contra el enum. Importa porque la elegibilidad es reason-dependent: un
assessment `expired` sólo es recuperable con `token_expired_before_start`, así que la lectura sin motivo
no puede probar el caso más común del incidente del 2026-08-19.

### El DTO nombra la causa; nunca la colapsa

`AssessmentAccessRecoveryAvailability` vive en el vocabulario isomorfo, no en el módulo server. Cada canal
declara `blockedBy` sobre un enum cerrado —`assessment_not_eligible`, `no_candidate_email`,
`provider_blocked`, `quota_exhausted`, `cooldown`— porque un `available: false` que colapsa cinco causas con
cinco remedios distintos deja a la superficie sin nada que decir salvo el peor default posible ("no tienes
permiso", a alguien que sí lo tiene). Es el noveno patrón canónico aplicado al DTO.

El cooldown es **por canal**: `cooldownUntil` (correo) y `secureLinkCooldownUntil` viajan separados porque el
command los filtra por canal. Compartir un solo campo hacía que un correo recién enviado apagara el enlace
seguro por 60 s sin motivo.

`contracts.ts` quedó partido: `vocabulary.ts` es isomorfo (enums, tipos, TTLs, cuotas, el DTO y las funciones
puras de elegibilidad y de aviso) y `contracts.ts` es la mitad server que necesita `node:crypto` y re-exporta
el vocabulario. Sin esa partición el navegador re-declara el vocabulario y nacen dos fuentes de verdad.

### Asignación: el camino legacy está retirado, no sólo escondido

Application 360 asigna por el camino gobernado propose→confirm de TASK-1719: el servidor resuelve la
plantilla desde la política de la vacante y el diálogo es preview + confirmación. El preview expone
`blockingReasonCode` y la superficie lo renderiza y deshabilita el confirm — cubre tres causas que ningún
otro campo delata (política en `draft`, plantilla inactiva, candidatura ya decidida), y `draft` es el estado
en que nace toda política.

`POST /api/hiring/assessments` con `method='candidate_test'` responde **410** (`assessment_legacy_assignment_retired`):
dejaba que el cliente eligiera plantilla y devolvía el token crudo a cualquier consumidor con la capability,
así que sacarlo de la UI no cerraba nada. `method='interviewer_scorecard'` sigue vivo por esa misma ruta.

### Aviso al candidato cuando su acceso se rota (TASK-1757)

Emitir un enlace seguro **mata la credencial anterior** y la entrega en mano al operador. Si esa entrega
falla, la persona queda sin acceso, sin saber por qué y con el plazo corriendo — y la elegibilidad permite
recuperar en `in_progress`, así que puede estar respondiendo en otra pestaña.

El tipo `hiring_assessment_access_rotated` cuelga del evento de dominio
`hiring.assessment.access_recovery_recorded` vía la projection `hiring_assessment_access_rotated_email`
(ops-worker, domain `notifications`), no del route handler: cualquier consumidor del command avisa por
construcción. El dedupe es por **recuperación** (`recoveryId`), no por assessment ni por evento — con
`assessmentId` una segunda rotación sería indistinguible de la primera y la persona no se enteraría de la
más reciente.

La decisión de avisar es una función pura isomorfa, `decideAssessmentAccessRotationNotice`, con cinco
motivos de omisión: `not_secure_link` (el correo de recuperación ya lleva el aviso y la credencial),
`operator_declared_delivery_failed` (evidencia más fresca que el webhook), `no_candidate_email`,
`provider_blocked` y `credential_already_expired` (fail-closed: sin vencimiento legible NO se asume vigente).
Vive en el vocabulario y no en el consumer a propósito: `predictAssessmentAccessRotationNotice` delega en la
misma función para que el operador vea **antes de confirmar** si el candidato va a ser avisado — si no, manda
el WhatsApp diciendo "te llegó un correo" cuando ningún correo salió.

El predicado "el proveedor bloqueó esta dirección" tiene fuente única en `provider-block.ts`
(`BLOCKING_PROVIDER_STATUSES` + sus generadores SQL): estaba escrito dos veces verbatim y el tercer
copy-paste es cómo se convierte en tres que divergen en silencio.

El correo candidate-facing gana `Reply-To`: `CANDIDATE_REPLY_TO_EMAIL_TYPES` + `resolveCandidateReplyToAddress`
(`HIRING_CANDIDATE_REPLY_TO_EMAIL`, default `people@efeoncepro.com`) en la plataforma de correo. Antes **no
existía** y una respuesta del candidato caía en la dirección de envío del proveedor. El párrafo "responde este
correo y lo reponemos" no es cortesía: es la condición que hace legítimo un aviso sin credencial.

Señal acompañante: `hiring.assessment.access_recovery.rotation_unnotified` (módulo `hiring`, steady 0).
Kill-switch: fila `email_type_config.hiring_assessment_access_rotated`, flipeable con
`pnpm hiring:email-type` (dry-run por defecto) sin redeploy.

### Invariantes operativos para agentes — Acceso al test del candidato

- **NUNCA** construir ni renderizar el enlace del candidato en la superficie del operador. La única URL con
  credencial la arma el servidor justo antes de enviar el correo, y el enlace revelado llega ya armado desde
  la respuesta del command: la vista lo muestra, no lo compone. Gate de FUENTE:
  `src/views/greenhouse/hiring/assessment-credential-source-gate.test.ts` (una captura sólo prueba la rama
  que se renderizó; la garantía vive en el código).
- **NUNCA** re-abrir un camino de asignación que deje al cliente elegir plantilla o devuelva el token crudo.
  Asignar un `candidate_test` pasa SIEMPRE por propose→confirm.
- **NUNCA** gatear un read de recuperación sólo con `hiring.assessment.read`: exige al menos una de las dos
  capabilities de recuperación **y** el binding a `applicationId` contra el aggregate.
- **NUNCA** colapsar en un booleano las causas por las que un canal no está disponible. Si agregas una causa,
  agrégala al enum `AssessmentAccessRecoveryChannelBlock` y dale su frase.
- **NUNCA** meter el enlace, el token ni nada derivable de ellos en el aviso de rotación. El canal existe
  justamente para entregar la credencial por una vía donde el operador verifica identidad. Cinco tests
  anti-fuga lo hacen cumplir con la fila de origen envenenada.
- **NUNCA** escribir el `delivery_id` del aviso en el ledger de recuperaciones: es append-only, IDs-only, y
  el CHECK de schema prohíbe un `delivery_id` en una fila `secure_link`. La traza del aviso es su fila de
  `email_deliveries` (`source_entity = recoveryId`).
- **NUNCA** predecir el aviso con una copia del criterio. Predicción y envío delegan en
  `decideAssessmentAccessRotationNotice`.
- **NUNCA** duplicar el predicado de buzón bloqueado: importarlo de `provider-block.ts`.
- **SIEMPRE** recordar que en `email_type_config` una fila **AUSENTE significa ENCENDIDO**
  (`resolveEmailTypeConfig` es fail-open): el seed `enabled = FALSE` es la puerta, no una formalidad.

### Estado de rollout

`hiring_assessment_access_recovery` y sus dos capabilities están vivas; la migración TASK-1746 y el índice
único de intents quedaron aplicados el 2026-08-19, y el canal de correo del recovery se habilitó ese mismo
día. El aviso de rotación shipeó apagado por seed (migración `20260820045834971`) y se **prendió el
2026-08-20 con autorización del CEO**, tras verificar contra PG que el ledger de recuperaciones estaba vacío
(sin historial no hay ráfaga de backfill en el primer drenaje). `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED`
sigue OFF en el ops-worker, así que el correo de asignación conserva el link legacy; su cutover espera el
readback Resend `click_tracking=false` y los smokes de href. Detalle por flag y runtime:
`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

Pendiente de evidencia runtime: ejercitar una rotación real con el flag ON (TASK-1757) y las ramas de
TASK-1747 que ninguna captura puede dar contra datos sintéticos.

## Purpose

Definir la arquitectura canónica del dominio `Hiring / ATS` dentro de Greenhouse como capa de fulfillment de talento para Efeonce.

Este documento fija:

- cómo debe modelarse la demanda de talento antes de HR o Staff Aug
- cuáles son los objetos canónicos del dominio
- qué ownership conserva cada módulo vecino
- cómo se resuelve el handoff hacia `member`, `assignment` y `placement`
- qué surfaces UI deberían existir
- cómo debe convivir una landing pública de vacantes con el ATS interno

## Status

- Lifecycle: `Architecture`
- State: `Canonical`
- Domain: `agency` + `people` + `hris` + `staff augmentation` + `finance` + `capacity`
- Date: `2026-04-11`

## Delta 2026-08-26 — TASK-1751: la fase de gracia deja de prometer lo que el servidor no puede aceptar

La rendición del candidato entra en `submit_grace` al cruzar `answerDeadline` y sigue viva hasta
`closeDeadline`. La fase existe desde `TASK-1363`; lo que se fija acá es **qué puede ofrecer esa fase**,
porque prometía un envío que el servidor rechaza y un reintento que nunca podía funcionar.

Precisión de alcance, porque la premisa escrita el 2026-08-19 no se sostuvo entera: de los cuatro defectos
que la task declaraba, **dos fueron refutados contra el código** — el reloj ya seguía el scroll (`.sessionBar`
es `sticky` desde `bc69e5a75`) y los avisos de 5 y 1 minuto nunca fueron sólo `srOnly` (hay un canal visible
en paralelo dentro del reloj). Los dos que quedaron en pie son los del **guardado**, y son el daño real del
caso fuente. El Delta de la task dueña conserva la refutación con su verificación.

### El envío exige la evaluación COMPLETA, y eso decide qué puede ofrecer la superficie

`submitPublicAssessmentWithClient` (`public-taking.ts:651-657`) lanza `assessment_incomplete` (400) ante
cualquier pregunta del set público sin respuesta guardada. No es una validación de UI adelantada al servidor:
es el servidor. Y durante la gracia ya no se puede guardar nada nuevo, así que **con respuestas faltantes
enviar es imposible** — por eso el CTA de envío **no se renderiza** en esa rama
(`AssessmentTakingClient.tsx:764`). Ofrecer el botón sería repetir exactamente la mentira que la task vino a
corregir: un affordance que el servidor va a rechazar.

La completitud se deriva **en cliente** desde `responses` (`savedAnswerCount` / `canSubmitEverything`,
`AssessmentTakingClient.tsx:254-255`). No hay campo nuevo en el DTO público: sus tres bloques declaran
allowlists **exactos** afirmados por `public-boundary.test.ts:199-224` (`assessment`, cada `response`, `timing`),
y ensanchar la frontera pública para ahorrarse un `filter` en el cliente es el peor de los dos costos.

### El guardado se protege ANTES del plazo, porque reaccionar al cruce es imposible por construcción

El autosave de texto abierto es un debounce que **se reinicia con cada tecla**: quien escribe de corrido sin
pausar nunca lo dispara, y no pierde los últimos milisegundos sino la respuesta entera. La protección es una
ventana preventiva (`PREEMPTIVE_SAVE_WINDOW_SECONDS = 30`, intervalo fijo de 5 s leyendo del ref para que
escribir no reinicie el intervalo). **No extiende ningún plazo**: guarda antes, texto escrito a tiempo.

El flush reactivo —guardar *al cruzar* `answerDeadline`— es **imposible por construcción**, y conviene dejarlo
escrito para que nadie lo reintente como si fuera el arreglo obvio:

- el ancla temporal del cliente es `timing.databaseNowAt`, que el servidor toma **al construir la respuesta**,
  mientras que la referencia monotónica (`window.performance.now()`) se fija en el cliente **después** de la
  latencia (`AssessmentTakingClient.tsx:258-270`). El reloj del cliente va detrás del servidor ≥1 RTT;
- el corte del servidor es `nowMs >= Date.parse(answer)` (`instances.ts:578-580`), **sin epsilon**.

Un guardado disparado por el cruce sale, en el mejor caso, con el plazo ya cumplido: llega a `assessment_not_open`.
Lo implementable es preventivo, nunca reactivo.

### El mensaje genérico del endpoint público es la decisión correcta; la verdad se construye en el cliente

El endpoint público responde `{ok, code, message}` con `message` **genérico a propósito** —es una superficie sin
autenticación— y el test anti-leak lo fija (`route.test.ts:146-161`: sólo esas tres claves, `message` constante,
ni el `message` interno ni los `details` viajan). La tentación al arreglar un error mudo es aflojar ese `message`
"para que diga la verdad": eso debilita la frontera pública y filtra estado interno del assessment a quien tenga
el token.

La verdad se construye **en el cliente, desde el `code`**, agrupada por lo que la persona puede hacer y no por
código: `assessment_not_open` y `assessment_incomplete` son los dos casos donde reintentar **no puede funcionar
nunca**, y cada uno nombra su causa y su salida real; todo lo demás —red, 429, fallo de sistema— conserva el
mensaje reintentable. Es el noveno patrón canónico aplicado al cliente en vez de al DTO, porque acá el DTO no
puede ensancharse.

### `readOnly` sobre `disabled` en el campo congelado es accesibilidad, no estilo

Durante la gracia todo control se congela — eso no cambia. Lo que cambia es **cómo**: el textarea pasa a
`readOnly` (`AssessmentTakingClient.tsx:746`) porque `disabled` lo saca del tab order y saca su contenido del
árbol de accesibilidad; durante la gracia eso significa que quien usa lector de pantalla **no puede releer lo
que escribió**, justo cuando el mensaje le pide copiar su texto antes de salir. Congelar es obligatorio; ocultar
el texto, no.

La asimetría con radio/checkbox es **deliberada y es el contrato**: `readonly` no aplica a
`<input type="radio|checkbox">` por spec HTML, así que esos dos conservan `disabled`. El test de contrato afirma
exactamente dos `disabled={!canAnswer}` más el `readOnly`
(`AssessmentTakingClient.timing-contract.test.ts:12-24`): la cuenta baja de 3 a 2 a propósito, y verla bajar no
es una regresión. Como `disabled` lo pintaba el navegador y este módulo nunca tuvo `.textArea:disabled`, la señal
visual de campo congelado se repuso explícitamente (`.textArea:read-only`).

### Lo que sólo se ve mirando el frame

La primera captura premium de esta superficie destapó cuatro defectos que ningún test veía, y dos de ellos eran
**pre-existentes**, no introducidos por la task: el contador de caracteres usaba `--text-disabled` (2.43:1 contra
blanco, bajo el 4.5:1 de AA, `serious` en axe) siendo texto secundario y no deshabilitado; y el textarea se
apoyaba en el `placeholder` como nombre accesible —el anti-patrón que la propia guía de UX writing prohíbe—, lo
que quedó al descubierto recién al ocultar el placeholder en solo lectura, porque un campo congelado no puede
invitar a escribir. Los otros dos: el ícono de la banda era un avión de papel (`tabler-send`) sobre un texto que
dice que **no** se puede enviar, y la superficie no declaraba su recipe de composición. Regla transferible: en
una superficie candidate-facing, la evidencia visual no es la formalidad del cierre — es el único gate que ve
contradicciones de significado y contraste.

### Invariantes operativos para agentes — Rendición del candidato: gracia y guardado

- **NUNCA** ofrecer "enviar lo que alcanzaste a guardar" sin verificar completitud: el servidor exige la
  evaluación **completa** (`assessment_incomplete`), y durante la gracia lo faltante ya no se puede guardar. Si
  el envío no puede prosperar, el CTA no se renderiza.
- **NUNCA** agregar al DTO público un campo derivable de lo que ya viaja. Los bloques `assessment`, `responses`
  y `timing` tienen allowlists exactos testeados; la completitud se deriva en cliente.
- **NUNCA** intentar un flush "al cruzar el plazo": el cliente va ≥1 RTT detrás del servidor y el corte de
  `instances.ts` es `>=` sin epsilon. La única protección implementable es **preventiva** (guardar antes), y no
  extiende ningún plazo.
- **NUNCA** aflojar el `message` genérico del endpoint público para "que diga la verdad". La verdad se construye
  en el cliente desde el `code`; el mensaje del servidor está fijado por un test anti-leak.
- **NUNCA** mostrar un camino de reintento para `assessment_not_open` ni `assessment_incomplete`: reintentar no
  puede funcionar nunca, y ofrecerlo esconde la salida real (pedir que le repongan el acceso).
- **NUNCA** convertir el `readOnly` del textarea congelado en `disabled` "por consistencia": saca el contenido
  del árbol de accesibilidad. La asimetría con radio/checkbox es el contrato, no una excepción olvidada.
- **NUNCA** cerrar un cambio en esta superficie sólo con tests verdes: dos de los cuatro defectos visuales que la
  captura destapó eran pre-existentes y ninguno era detectable sin mirar el frame.

### Estado de rollout

| Pieza | Estado |
|---|---|
| Guardado preventivo, gracia honesta (CTA condicional + conteo derivado), error que nombra su causa, `readOnly` accesible y sus tests de contrato | **en `develop`** — commits `67c6d2688`…`06622b5e6` |
| Evidencia visual `submit_grace` (desktop 1440 + móvil 390, 6 frames, primera línea base de la fase) + scorecard 4.54 | **capturada y promovida a baseline** |
| Promoción a producción | **pendiente** — al 2026-08-26 el árbol de `origin/main` conserva la versión anterior del cliente, del módulo CSS y del diccionario de copy |

Follow-up declarado por el propio scorecard (no resuelto): el anillo de foco de la card compite con el tono de
la banda durante la gracia. Queda escrito en `nextAction`, no cerrado a ojo.

---

## Delta 2026-08-23 — TASK-1754: el eje de ETAPA queda en seis valores y las etapas terminales tienen fuente única

Cierra el eje que el delta de `TASK-1765` dejó abierto: allá quedó el DESENLACE, acá la ETAPA.
Decisión, método de verificación y estado por pieza:
[`GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1`](GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md)
§3, §14.1 y §18.

### El vocabulario vigente

`HIRING_APPLICATION_STAGES` (`src/types/hiring.ts`) — **seis** valores, uno por columna del kanban:
`sourced` · `screening` · `shortlisted` · `interview` · `decision_pending` · `closed`.

Sobre ellos siguen valiendo los dos subconjuntos que ya existían: `HIRING_PIPELINE_STAGES` es lo
escribible como cambio de etapa (los cinco primeros; `closed` sólo por command), y
`DECISION_STAGE` mapea los seis desenlaces a `'closed'`.

Los siete literales retirados salen **por dos razones distintas**, y mezclarlas confunde el modelo:

| Salen | Razón |
|---|---|
| `qualified`, `client_review` | **Absorbidos** por `shortlisted`. El tablero mostraba seis columnas sobre trece etapas, y tres se veían como «Evaluación»: los movimientos humanos caían en `qualified`, que ninguna automatización vigila, mientras las quince políticas configuradas en `shortlisted` nunca disparaban |
| `selected`, `backup`, `rejected`, `withdrawn`, `handoff_ready` | **Espejos terminales.** Dejaron de ser etapas al nacer el eje de desenlace: hoy todo recorrido terminado escribe `stage='closed'` y su desenlace vive en `decision` |

### Fuente única de etapas terminales

`TERMINAL_APPLICATION_STAGES` (`src/types/hiring.ts`) es un `ReadonlySet` con **una** etapa,
`closed`. Antes eran **tres copias verbatim** del mismo `Set` —en `assessment/instances.ts`,
`assessment/public-session/store.ts` y `assessment/access-recovery/vocabulary.ts`—, que hoy la
importan. Se conserva aunque el `CHECK` del invariante de `TASK-1765` la vuelva redundante con la
comprobación de `decision`: es la guarda que sigue siendo correcta si ese invariante se relaja.

### Mapas de relaciones entre etapas: se revisan, no se podan

`STAGES_DOWNSTREAM_OF_TRIGGER` (`assessment/assignment-policy/readers.ts`) quedó
`shortlisted → [interview, decision_pending]` e `interview → [decision_pending]`, tipado con
`HiringApplicationStage`. Fue **reescrito, no podado**: declaraba `client_review` como aguas
**abajo** de `shortlisted` y el colapso la absorbió **dentro**, de modo que mandaba a la cola humana
postulaciones que la reconciliación automática sí puede recuperar. Regla transferible: cuando un
colapso fusiona dos literales, cualquier mapa de relaciones entre etapas se revisa entero — borrar el
nombre no arregla una relación que cambió de sentido.

### Deuda declarada — monitor de equidad

`FAIRNESS_REPORTABLE_STAGES` **conserva** `qualified`, `client_review` y `selected` porque
`getSelectionFairness` usa `input.stage ?? 'selected'` como default, y re-apuntar el cubo terminal al
eje de desenlace cambia **qué mide** el four-fifths rule. El reader **falla ruidoso**
(`hiring_fairness_stage_retired`, 422, `actionable: false`) en vez de devolver cero: un cero
silencioso en una métrica de equidad se lee como «no hay impacto adverso», la conclusión contraria a
la verdad. **Condición de retiro:** `TASK-1365` cierra **antes** de prender
`HIRING_FAIRNESS_MONITOR_ENABLED` en producción. Detalle en el ADR §18.

### Estado de rollout

| Pieza | Estado |
|---|---|
| Enum TS en seis + los tres consumers apuntados a `TERMINAL_APPLICATION_STAGES` + mapa de aguas abajo reescrito | **aplicado** |
| Contract del `CHECK` (`migrations/20260823111250596_task-1754-stage-vocabulary-contract.sql`, commit `50b742341`) | **APLICADO 2026-08-23** — el `CHECK` de la base quedó en los **seis** valores, así que `HIRING_APPLICATION_STAGES` vuelve a ser su espejo |

Su autorización no vino de contar filas sino del **contrato de la superficie desplegada**: en
`origin/main` (release `304371f73`) hay exactamente tres escritores de `hiring_application.stage`,
los tres acotados por tipo, y la unión de lo escribible son los seis que quedan. El método completo,
con su falso positivo típico (un `stage = $n` en un `WHERE` es filtro, no escritura), está en el
ADR §14.1.

### Invariantes operativos para agentes — Eje de etapa

- **NUNCA** derivar la alcanzabilidad de un literal desde el contenido de la tabla. Se deriva de los
  **escritores del release desplegado**; «cero filas» sólo dice que nadie lo escribió todavía.
- **NUNCA** re-copiar el conjunto de etapas terminales: se importa `TERMINAL_APPLICATION_STAGES`.
- **NUNCA** podar un literal fusionado de un mapa de relaciones entre etapas sin revisar si el
  colapso cambió el sentido de la relación.
- **NUNCA** retirar `qualified`, `client_review` o `selected` de `FAIRNESS_REPORTABLE_STAGES` ni
  prender `HIRING_FAIRNESS_MONITOR_ENABLED` antes de que `TASK-1365` re-apunte el cubo terminal.
- **NUNCA** asumir que un filtro por `stage` valida su valor: el lane programático de `TASK-1718`
  lo acepta como string libre, así que un literal retirado devuelve **cero en silencio**.

---

## Delta 2026-08-22 — TASK-1765: el eje de DESENLACE, su causa gobernada y el cierre como command

Implementa `GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1` §4/§4.1/§5/§6. El
pipeline pasa a modelar **dos ejes ortogonales**: `stage` es *dónde va la persona en el recorrido*, y
el desenlace es *cómo terminó ese recorrido*.

### El desenlace, y por qué el campo no se llama como el concepto

El campo físico conserva el nombre `decision` (el rename a `outcome` está deferido, ADR §11), pero el
concepto es **desenlace**. `withdrawn` y `unresponsive` **no son decisiones de Efeonce**, así que
**NUNCA** leer esa columna como «lo que Efeonce decidió»: significa «cómo terminó el proceso».

Seis valores: `selected`, `backup_selected`, `not_selected`, `rejected`, `withdrawn`, `unresponsive`.

Las dos distinciones que se ganaron su existencia porque cambian una consecuencia real:

- **`not_selected` ≠ `rejected`.** `rejected` es un juicio sobre la persona. Usarlo para quien llegó
  al final y no quedó porque el cupo lo tomó otra la saca del Talent Pool por defecto, sesga a
  cualquier revisor futuro que lea su historia, e **infla la tasa de rechazo de su cohorte
  demográfica** en el análisis de impacto adverso. `not_selected` es la población objetivo del
  Talent Pool.
- **`unresponsive` ≠ `withdrawn`.** A quien deja de responder había que inventarle un retiro que no
  declaró o un juicio que no hubo. Las dos son atribución falsa. `unresponsive` no atribuye conducta
  y **no manda correo**.

`on_hold` deja de ser desenlace: una pausa no es un cierre. Vivía en el enum *y* mapeaba a la etapa
`decision_pending`, así que la misma fila decía «terminó» y «sigue viva». Una pausa se registra
moviendo la **etapa** a `decision_pending`.

### La causa, y por qué es enum y no prosa

`decision_cause` es **obligatoria en `not_selected` y prohibida en los otros cinco**. No es opcional:
es una **bicondicional**, garantizada por `hiring_application_decision_cause_pairing_check`.

| Causa | Qué pasó | ¿Cuenta en el embudo de equidad? |
|---|---|---|
| `capacity_filled` | El cupo lo tomó otra persona | **sí** — el proceso concluyó y hubo comparación |
| `opening_closed` | Se cerró la búsqueda | **no** — el proceso no concluyó |
| `process_cancelled` | Se canceló el proceso | **no** |

Es enum gobernado porque **hay consumidores que ramifican por ella** (el embudo de equidad y el
cuerpo del correo). Texto libre acá haría irreproducible el análisis de impacto adverso.

**La vacante entra SIEMPRE como causa, JAMÁS como desenlace.** Etiquetar a una persona con el estado
de la vacante es el defecto que este eje viene a cerrar.

### Cerrar es decidir: el cambio de etapa pierde `closed` por TIPO

El guard anterior era una **denylist** de cuatro literales, y como toda lista de excepciones falló
por lo que no enumeraba: por ahí se colaron `closed` y `handoff_ready`. Arrastrar una tarjeta a
«Cerrado» escribía `closed` **sin decisión** — sin evento, sin correo, sin arrancar el reloj de
retención, y congelando el borrado de los documentos de esa persona en **todas** sus postulaciones,
porque el detector de retención cruza por `identity_profile_id`.

La denylist **se borró, no se amplió**. Nace `HIRING_PIPELINE_STAGES` —el subconjunto escribible como
cambio de etapa— y el tipo lo hace cumplir en compilación. **Una etapa nueva nace NO escribible**
hasta que alguien la agregue deliberadamente. `createHiringApplication` se acota igual: una
postulación nace en el recorrido.

Error canónico: `hiring_application_close_requires_outcome` (422, `actionable: false`) — reintentar
el mismo `PATCH` no lo resuelve; la acción real es decidir el desenlace.

### Contrato del command

`decideHiringApplication` conserva su transacción única y suma la causa:
`SELECT ... FOR UPDATE` → detección de replay → validación de opening → snapshot de assessment →
`UPDATE` con `decision`, `decision_cause` y `stage='closed'` **en el mismo statement** (la
bicondicional no admite estados intermedios) → `jsonb_set` del historial → `publishOutboxEvent`.

- La causa entra en `sameReplayPayload`: **misma clave de idempotencia con distinta causa ⇒ 409**, no
  un replay silencioso. Cerrar «porque el cupo lo tomó otra persona» y «porque cancelamos el proceso»
  son hechos distintos, cuentan distinto en el embudo y mandan cuerpos de correo distintos.
- `hiring.application.decided` suma `cause` al payload. La causa es un enum, no PII; la **razón** de
  la decisión y el nombre del candidato nunca entran.

### Un `EmailType` por desenlace; la causa modula el cuerpo

El selector de `send.ts` era un ternario binario que colapsaba todo lo no-seleccionado en
«rechazado»: el primer `not_selected` habría mandado un correo de **rechazo** a quien nadie rechazó, y
el log append-only habría firmado ese hecho falso. Ahora es un **mapa explícito con no-op declarado**:
un desenlace sin tipo propio **nace mudo**. `hiring_decision_not_selected` lo crea `TASK-1762` con su
fila de `email_type_config` y su seed en el `ops-worker` (**NO** en Vercel).

### Estado de rollout

| Pieza | Estado |
|---|---|
| Expand del `CHECK`, `decision_cause`, `archived_at`, índice parcial | **aplicado** |
| Command con causa + colapso de `DECISION_STAGE` a `closed` | **aplicado** |
| Cambio de etapa sin `closed`, por tipo | **aplicado** |
| Señal `hiring.application.closed_without_outcome` | **aplicada** (hoy `warning`: 32 sintéticas de `TASK-1748` + 1 etapa espejo) |
| Contract del enum (retirar `on_hold` del `CHECK`) | **pendiente** — post-release |
| `CHECK` del invariante `(stage='closed') = (decision IS NOT NULL)` | **pendiente** — espera a `TASK-1748` |
| Escritor de `archived_at` (`archiveSyntheticRecords`, `TASK-1748`) | **code complete** — sin desplegar |
| Backfill de las 32 filas sintéticas de `closed` a `archived_at` | **pendiente** — espera al despliegue del filtro de `TASK-1748` |

**La cadena completa se ejecutó el 2026-08-23, en ese orden**: contract del enum → filtro de
`TASK-1748` desplegado → backfill del eje de archivado → `CHECK` del invariante.
`docs/tasks/pending-migrations/` quedó **vacía** (sólo su `README`). La condición que gobernaba la
cadena —aplicar un contract sólo DESPUÉS del release que retira su escritor (`ISSUE-161`)— se
cumplió y **sigue vigente como regla**: lo que cambió es el hecho, no el invariante.

### Invariantes operativos para agentes — Eje de desenlace

- **NUNCA** un `stage='closed'` sin desenlace declarado. Cerrar pasa por `decideHiringApplication`.
- **NUNCA** etiquetar a una persona con el estado de la vacante: la vacante es **causa** de
  `not_selected`, jamás desenlace.
- **NUNCA** usar `rejected` donde no hubo juicio sobre la persona — ni por capacidad, ni por
  cancelación, ni por silencio.
- **NUNCA** registrar el silencio como `withdrawn`: es atribuirle a alguien una decisión que no tomó.
- **NUNCA** dejar la causa como texto libre, ni escribirla en un `UPDATE` distinto al del desenlace.
- **NUNCA** archivar escribiendo `closed`: archivar es `archived_at`, un eje aparte.
- **NUNCA** ampliar una denylist de etapas: el conjunto escribible se define por **inclusión**.
- **NUNCA** reusar el `EmailType` de un desenlace para otro — el sistema ramifica por ese valor
  (kill-switch, perfil de footer, selector de envío).
- **NUNCA** aplicar un contract de enum antes del release que retira el valor del código. «Cero
  filas» no es «nadie lo escribe»: la alcanzabilidad sale del **contrato de la superficie
  desplegada**. Ocurrió el 2026-08-22; detalle en `GREENHOUSE_DATABASE_TOOLING_V1.md`.

---

## Delta 2026-08-17 — TASK-1740: contenido público estructurado + fundación JobPosting/canonical

La proyección pública de una vacante deja de depender del parser heurístico de prosa como única
fuente y gana su fundación SEO técnica. Tres piezas, todas sobre el command/reader canónicos
existentes (cero endpoints nuevos, cero capabilities nuevas, cero eventos nuevos):

- **Bloque de contenido estructurado versionado** (`hiring_opening.public_content_json`, JSONB):
  `PublicOpeningContent` v1 — promesa, intro, outcomes, trabajo, essentials/learnables, evidencia,
  modelo remoto, proceso, beneficios y compensación estructurada opcional (`currency` ISO 4217 +
  min/max + unitText). Validador canónico `src/lib/hiring/public-careers/public-content.ts`: write
  path estricto (422 `hiring_opening_public_content_invalid`, re-validado SIEMPRE en el store) y
  read path leniente (bloque corrupto o versión desconocida degrada a `null` = fallback legacy de
  prosa, nunca rompe la página pública). El write viaja por `updateHiringOpening` (el PATCH interno
  ya lo transporta) bajo `hiring.opening.write`.
- **Elegibilidad remota por país** (`hiring_opening.public_remote_eligible_countries`, TEXT[] con
  CHECK de forma alpha-2): países ISO 3166-1 reales validados con `isValidCountryCode`. Es el
  ÚNICO habilitador del schema remoto; `public_hiring_region` (texto libre: `LATAM`, `Global`)
  jamás se convierte en país. La publicación NO se bloquea por falta de países (los 2 openings
  vivos son `LATAM` y deben poder re-publicarse): el schema simplemente se omite.
- **Canonical + JSON-LD `JobPosting`** (`src/lib/hiring/public-careers/job-posting.ts`,
  server-only, puro): nace de EXACTAMENTE el mismo `PublicOpeningPayload` visible (no existe un
  segundo texto SEO). Fail-closed: remota sin países elegibles, híbrida/presencial sin
  `public_city`+`public_country`, o sin `publishedAt`/descripción → `null` (sin schema). Salario
  sólo desde compensación estructurada (`compensationBand` texto libre nunca se emite);
  `directApply` y `validThrough` NUNCA se emiten (flujo con paso intermedio; sin expiración real —
  el retiro es el 404 del unpublish). `employmentType` por mapeo exacto conservador
  ("Jornada completa"→FULL_TIME; "Contrato indefinido" se omite). `hiringOrganization` = marca
  Efeonce desde el brand SSOT (`EFEONCE_BRAND_NAME`/`EFEONCE_URL_HTTPS`), no la razón social.
  Emisión gated por `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` **y**
  `CAREERS_DETAIL_EDITORIAL_V2_ENABLED` (Vercel-only, default OFF, ledger);
  el canonical explícito de la leaf publicada NO depende del flag.

**Invariantes:**

- **NUNCA** exponer contenido nuevo fuera de `buildPublicOpeningPayload()` (allowlist con set
  cerrado de llaves + sentinels internos en el test anti-leak).
- **NUNCA** emitir `TELECOMMUTE` sin ≥1 país en `public_remote_eligible_countries`, ni convertir
  región libre en país, ni bloquear publish por falta de países (omitir, no bloquear).
- **NUNCA** derivar `baseSalary` de `public_compensation_band`; sólo `content.compensation`
  estructurado y aprobado. Beneficios no son compensación.
- **NUNCA** emitir `directApply` ni `validThrough`; el lifecycle honesto es published → 404.
- **NUNCA** exigir el contrato editorial v2 para RE-publicar una vacante que ya estuvo al aire
  (grandfathering, `requiresEditorialV2ForPublish` en `public-careers/publishability.ts`). El
  contrato v2 es la barra de calidad de toda vacante que se publica **por primera vez**
  (`published_at IS NULL`); aplicarlo también al re-publicar convierte una regla de autoría en una
  **interrupción de servicio**: una vacante viva —`EO-OPN-0009` y `EO-OPN-0061` tenían 15 y 33
  postulantes en proceso al 2026-08-17— que se pausa por cualquier motivo quedaría en 404 hasta
  reescribir su bloque completo. La señal es `published_at`, que sólo escribe el publish, así que
  una vacante nueva no puede saltarse v2 por esta vía. El operador desde brief
  (`vacancy-publication-operator`) **sí** exige v2 siempre: siempre crea una vacante nueva.
- **NUNCA** despublicar con `PATCH`/`visibility`: el guard de publicabilidad responde 422. El camino
  canónico es `unpublishOpening` (`DELETE …/publish?mode=paused|closed`).
- **NUNCA** poner el país de la entidad empleadora en `jobLocation` de una vacante remota para
  "dejar claro el anclaje contractual": `jobLocation` significa dónde se realiza físicamente el
  trabajo, así que Google dejaría de clasificarla como remota y la mostraría como empleo presencial
  en esa ciudad. El anclaje contractual se declara en el contenido visible (`content.remoteModel`);
  la elegibilidad, en `applicantLocationRequirements` — que admite uno o varios países y sigue siendo
  `TELECOMMUTE` válido.
- **NUNCA** prender `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` sin que el renderer (TASK-1741)
  muestre el bloque estructurado en la página visible. **El orden es renderer primero, schema
  después**: el builder de JSON-LD ya consume `content`, pero `view-model.ts` y
  `components/greenhouse/careers/**` no lo consumían antes de TASK-1741, así que el schema habría
  emitido a Google un párrafo — el `remoteModel` ya poblado — que el candidato no veía. El config
  ahora aplica un **interlock técnico**: schema ON sólo es efectivo cuando el renderer editorial
  también está ON. Eso protege la paridad aun ante una combinación de env vars equivocada. TASK-1741
  no necesita el flag de schema para desarrollarse:
  `content` y `remoteEligibleCountries` viajan en el payload público SIEMPRE, sin flag, pero su
  **orden de encendido no es libre**.
- **NUNCA** dejar que un bloque estructurado PARCIAL reemplace la prosa legacy en la descripción del
  schema. Sólo un bloque con **narrativa núcleo completa** (`promise` + `intro` + `outcomes` + `workItems`) la
  reemplaza; un bloque parcial (el estado normal mientras el contenido editorial no se autora) la
  **complementa**. Reemplazarla degradaba la descripción a un fragmento del rol — bug cazado con el
  primer artefacto real, 2026-08-17.
- **SIEMPRE** que el HTML de la descripción JSON-LD se genere, sale del mismo payload visible
  (escape XSS + `serializeJsonLd` que neutraliza `</script>`).
- El renderer (TASK-1741) consume `content` con fallback legacy; fixture canónica
  `src/lib/hiring/public-careers/editorial-opening.fixture.ts`.

Indexing API/sitemap quedan explícitamente FUERA (decisión + autorización + quota son follow-up;
runbook de decisión en `docs/manual-de-uso/hr/operar-careers-publicas.md`).

## Delta 2026-08-12 — TASK-1688 (ADR): completitud de contacto del candidato — ubicación física y contrato

**Decisión (Accepted 2026-08-12).** Los tres datos que el apply público aceptaba pero el command
descartaba quedan persistidos así:

| Dato               | Ubicación física                                                                           | Semántica                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Teléfono           | `greenhouse_hiring.candidate_facet.phone_e164` (TEXT NULL)                                 | Contacto durable **person-first**, normalizado E.164; opcional                                                |
| País de residencia | `greenhouse_hiring.candidate_facet.residence_country_code` (TEXT NULL, CHECK `^[A-Z]{2}$`) | **Autodeclarado** ISO 3166-1 alpha-2; requerido en UI para postulaciones nuevas; NULL = legacy "No informado" |
| Mensaje            | `greenhouse_hiring.hiring_application.candidate_message` (TEXT NULL, CHECK ≤4000)          | Contexto de **esa** postulación; nunca se copia al facet                                                      |

**Alternativas rechazadas:** inferir país desde prefijo telefónico/IP/CV (dato insuficiente y
engañoso — prohibido); guardar todo en la aplicación (el contacto es de la persona, no de una
postulación); backfill de filas históricas (imposible de forma fiable; se muestra "No informado").

**Invariantes:**

- **Un solo parser/command** para ambas entradas: `parsePublicHiringApplication` →
  `submitPublicHiringApplication`. Careers estándar y el native Growth Form (projection TASK-1372)
  consumen exactamente el mismo contrato; no existe write path alterno.
- **Expand/contract del país:** la UI lo exige (`required`); el parser lo acepta
  opcional-pero-validado contra el SSOT `src/lib/locale/countries.ts` (sin truncación — `'Chile'`
  truncado daría `'CH'`=Suiza; longitud ≠ 2 → rechazo). El flip a requerido-en-parser es un paso
  de rollout explícito tras verificar ambas superficies en producción.
- **El país de residencia puede servir como hint de formato local del teléfono, NUNCA al revés**
  (residencia jamás se infiere del prefijo).
- **Anti-wipe:** el upsert del facet usa `COALESCE(EXCLUDED.x, existente)` — una entrada opcional
  omitida nunca borra un valor previo de la misma persona.
- **PII interna:** los tres campos se leen sólo en Application 360 (gate `hiring.application.read`
  existente); el teléfono se muestra completo ahí (la finalidad es operar el contacto; el email
  conserva su máscara actual). Nunca aparecen en `PublicOpeningPayload`, clientes, analítica ni logs.
- Sin flag nuevo: es corrección contractual del intake ya gateado por
  `HIRING_PUBLIC_APPLICATIONS_ENABLED`.
- **Rollout:** a producción el 2026-08-12 (release `393144e9f`, manifest `released`): el campo
  «País de residencia» está vivo en el form custom productivo y el Growth Form
  `efeonce-careers-application` v4 quedó publicado con el campo (en el form nativo cae en la
  sección «Datos adicionales» del renderer — deuda visual menor conocida). El flip a
  requerido-en-parser sigue pendiente (ventana de observación), igual que la revisión
  Legal/Privacy de retención/aviso de los 3 campos.

## Delta 2026-08-12 — TASK-1689: emails transaccionales del ciclo de vida (consumers reactivos)

Los eventos del pipeline que ya se emitían como audit tienen consumers de email en el
**ops-worker** (domain `notifications`, lane `ops-reactive-notifications`), detrás de
`HIRING_LIFECYCLE_EMAILS_ENABLED` (default OFF al nacer; ON en producción desde 2026-08-12 — ver
Rollout abajo; vive SOLO en el worker) + kill-switch por tipo en
`greenhouse_notifications.email_type_config` (seed aplicado; `hiring_decision_rejected` pausable
independiente):

| Evento                             | Consumer                                     | Email                                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hiring.application.created`       | `hiring_application_created_emails`          | aviso interno a People (buzón `HIRING_INTERNAL_NOTIFICATIONS_EMAIL`, default `people@efeoncepro.com`) + acuse al candidato                                            |
| `hiring.assessment.assigned`       | `hiring_assessment_assigned_email`           | link de evaluación al candidato — SOLO `method=candidate_test` (un scorecard de entrevistador JAMÁS emailea al candidato)                                             |
| `hiring.assessment.submitted`      | `hiring_assessment_submitted_internal_email` | aviso al buzón interno de People cuando un `candidate_test` queda completado y listo para revisión; incluye CTA a Application 360, nunca score ni decisión automática |
| `hiring.application.stage_changed` | `hiring_stage_changed_email`                 | avance de etapa — SOLO allowlist candidate-facing (`shortlisted`→"Preselección", `interview`→"Entrevista"); etapas internas nunca llegan a copy                       |
| `hiring.application.decided`       | `hiring_application_decided_email`           | `selected` (felicitación) / `rejected` (agradecimiento); anti-stale: re-verifica la decisión vigente en PG antes de enviar                                            |

**Invariantes:**

- La política (flag, buzón interno, allowlist de etapas, resolver de recipient) vive en
  `src/lib/hiring/notifications/**`; los consumers (`src/lib/sync/projections/hiring-lifecycle-emails.ts`)
  son thin wrappers. Todo envío pasa por `sendEmail` canónico; dedupe explícito con
  `wasEmailAlreadySent(eventId, entityId, email)` — un replay del dispatcher nunca re-envía.
- **El token del candidate_test nunca viaja por el outbox** (sincroniza a BigQuery). El consumer usa
  `reissueCandidateTestTokenForEmail` (`assessment/instances.ts`): rota hash+expiry y marca `sent`
  SOLO si el estado sigue en `assigned`/`sent`, y SIEMPRE después del check de dedupe (rotar tras un
  envío exitoso invalidaría el link entregado). `in_progress`/`submitted`/`expired` → skip honesto.
- Eventos re-leídos de PG por ID: PII (email/nombre del candidato, título de vacante) se resuelve al
  consumir; los mensajes del reactive log y las capturas (`captureWithDomain('hiring')`) llevan sólo IDs.
- El aviso de test completado se deriva sólo de la transición durable `submitted` (o `scored` si el
  worker procesa el evento después de la corrección) y exige `submitted_at`. Rechaza scorecards,
  estados previos y expirados; deduplica por evento + assessment + buzón interno. El subject es
  `Test completado: {candidato} — {vacante}` y el cuerpo no expone respuestas ni score.
- Candidate-facing emails envían como **Efeonce** (AGENCY_BRANDED); el aviso interno usa el sender
  plataforma. Templates en `src/emails/Hiring*.tsx` (es/en; default es). La variante `selected` mantiene paridad
  HTML/texto plano, personaliza nombre + vacante y expresa la secuencia `selección → carta oferta aceptada →
  contrato`; la ilustración remota es decorativa (`alt=""`), secundaria y nunca porta la decisión ni los próximos pasos.
- Rollout: ledger `FEATURE_FLAG_STATE_LEDGER.md` — flip exige ejercicio end-to-end + revisión
  humana de Talent del copy (especialmente el rechazo). **El flip se ejecutó el 2026-08-12**: flag
  ON en el ops-worker (rev `ops-worker-00548-x52`, default `true` en `deploy.sh`), ejercicio E2E
  real EO-APP-0090 (5 tipos `status=sent`; `hiring_decision_selected` cubierto por tests hasta su
  primer uso real) y release `393144e9f` a producción. Quedan abiertos: revisión Legal/Privacy de
  retención/aviso, flip del país a requerido-en-parser y scorecard GVC formal.

**Extensión 2026-08-15:** el consumer de `hiring.assessment.submitted`, el tipo
`hiring_assessment_submitted_internal` y su migración aditiva de kill-switch están desplegados en la
revisión activa `ops-worker-00557-hfp`; el flag general y los siete tipos están habilitados, incluido
el destinatario interno `people@efeoncepro.com`. La evidencia de configuración no sustituye el smoke:
el único evento `submitted` previo a este consumer quedó publicado sin reacción y, por política de no
backfill, no se reenvía. Owner People/Operations debe verificar la primera entrega real al completar un
`candidate_test` nuevo y revisar `email_deliveries` + `outbox_reactive_log`. Hasta entonces este séptimo
correo está operativo pero sin evidencia de entrega productiva; no cambia score, etapa ni decisión.

## Delta 2026-07-16 — TASK-1385: AI-assisted vacancy public copy (propose→confirm)

La redacción del payload público de una vacante ahora tiene asistencia IA gobernada, extendiendo
el patrón propose→confirm de TASK-1361 con el kind `opening_public_copy` en el MISMO ledger
(`hiring_assessment_ai_proposal`, CHECK ampliado; eventos `hiring.assessment.ai_proposed/confirmed`
reusados — el payload lleva `kind`):

- **Propose**: `proposeOpeningPublicCopy` (`src/lib/hiring/vacancy-ai/**`) redacta los campos de
  copy `public_*` desde una proyección **allowlist-safe** (`VacancyPromptInput`, copia explícita
  campo a campo): demanda (rol/skills/idioma/tz/duración), hechos públicos ya seteados del opening
  y competencias+pesos de un `templateId` opcional. La IA **NUNCA** recibe `budget_band`,
  `rate_band`, `risk_notes`, `internal_notes`, owner ni referencias de cliente (test negativo con
  sentinels en `vacancy-ai/prompt.test.ts`). La IA propone **COPY, no hechos**: ubicación/modalidad/
  compensación nunca se inventan (compensación jamás se propone). Prompt con voz Efeonce (context
  pack 05/09) + checklist anti-sesgo de avisos (género/edad/proxies/job-related), versión
  `hiring_vacancy_ai_public_copy.v1`, provider Anthropic `claude-sonnet-5` (seam
  `HIRING_VACANCY_AI_COPY_MODEL`), adapter honest-degrade. Dedupe por digest (mismo mecanismo 1383).
- **Confirm**: la rama `opening_public_copy` de `confirmAiProposal` aplica el copy (merge con
  `publicCopyOverride` humano) vía **`updateHiringOpening`** (writer canónico, ahora acepta un
  `PoolClient` externo para atomicidad con la marca de la propuesta). El LLM nunca escribe el
  opening; `note` de la propuesta nunca se persiste al opening; **el publish sigue siendo la acción
  humana de TASK-355/1371 con su gate 422** intacto.
- **API/parity**: `POST /api/hiring/openings/[id]/ai/propose-public-copy` (capability nueva
  `hiring.opening.ai_assist`, grant tier operador hiring); el confirm reusa la ruta de proposals
  1361 con capability least-privilege por kind (`opening_public_copy` ⇒ `hiring.opening.write`).
  Registro del actionKey en Nexa = consecuencia de parity (follow-up, mismo criterio que 1361).
- **Flag**: `HIRING_VACANCY_AI_ENABLED` default OFF, **hermano deliberado** de
  `HIRING_ASSESSMENT_AI_ENABLED` (no hereda el gate regulatorio EU AI Act del scoring — el copy de
  vacante no decide sobre personas; el riesgo de sesgo del aviso lo gobierna el checklist + confirm
  humano). Ledger de flags actualizado.

## Delta 2026-07-13 — TASK-1363: Assessment Taking + Review Surface

El assessment dejó de ser sólo motor y ahora tiene dos superficies runtime sobre los mismos primitives de dominio:

- **Candidato público:** `/assessment/[token]` (compat `/public/assessment/[token]`) + `GET/POST /api/public/assessment/[token]`. El wrapper público consume `resolveAssessmentByToken`, `startAssessment`, `saveResponse` y `submitAssessment`; no reimplementa scoring. Payload browser-safe en `src/lib/hiring/assessment/public-taking.ts`: preguntas públicas, respuestas propias, timer/accommodation y contexto mínimo. Nunca viajan `answer_key_json`, `rubric_json`, token hash ni datos internos.
- **Asignación real:** la plantilla de assessment puede ser la recomendada del rol/opening, pero la ejecución siempre es `template × hiring_application`. No existe un "assessment de la vacante" con respuestas compartidas; cada candidato obtiene su propia instancia, token, estado, tiempo y scorecard.
- **Guard de completitud:** `submitPublicAssessment` verifica que todas las preguntas del set público tengan respuesta guardada antes de llamar `submitAssessment`; evita que una UI/cliente salte pasos y cierre una instancia incompleta.
- **Accommodations:** el tiempo efectivo se deriva de `accommodations_json` (`extraMinutes`, `timeExtensionMinutes`, `additionalMinutes`, `extendedTimeMinutes`, `timeMultiplier`, `extendedTimeMultiplier`, `extendedTimePercent`, `timeExtensionPercent`) y se refleja en timer, banner público y expiración server-side.
- **Operador interno:** Application 360 (`/agency/hiring/applications/[id]`, tab `Evaluación`) carga `reviewItems` y `competencyModules` desde `GET /api/hiring/assessments/[id]`. El scorecard es advisory, con barras/radar + tabla sr-only, y la cola/drawer de corrección mantiene anti-anclaje: pregunta/respuesta/rúbrica antes de la sugerencia IA.
- **Contrato de error público:** errores públicos son genéricos y no revelan si el token expiró, fue usado o no existe; el diagnóstico interno queda en logging/capture del dominio.
- **Evidencia local:** GVC candidate `.captures/2026-07-13T14-44-45_task1363-assessment-taking-runtime`; GVC operator desktop/mobile `.captures/2026-07-13T14-44-04_task1363-assessment-review-runtime`; lint/typecheck/build/Vitest full verdes. Rollout remoto queda pendiente de push/deploy, no de arquitectura.

## Delta 2026-07-13 — TASK-1400: resolución gobernada de blockers de Hiring Activation

El bridge de TASK-770 ganó el contrato programático para que UI/Nexa no simulen "resolver blocker":

- **Reader actionable:** `getHiringActivationDetail()` ahora devuelve `blockers[]` browser-safe con `key`, `source`, `status`, payload schema, capability requerida, action contract y surface alternativa. `readyToActivate` sigue derivado live desde Workforce Activation; no se persiste readiness paralelo.
- **Command:** `resolveHiringActivationBlocker` ejecuta sólo acciones recuperables que componen primitives existentes: `retry-create-member` → `createMemberForHiringActivation`; `retry-open-onboarding` → `openOnboardingForHiringActivation`. Legal data, handoff no aprobado y readiness lanes ajenas quedan `not_resolvable` con deep link/surface alternativa.
- **API:** `POST /api/hr/hiring-activation/[id]/resolve-blocker` se sirve por el route-handler canónico `[action]`. La autorización es por acción delegada, no coarse admin: `workforce.member.intake.update:update` para member retry y `hr.onboarding_instance:create` para onboarding retry.
- **Audit/PII:** el request event trail guarda actor, blocker/action, digest SHA-256 del payload normalizado y shape redacted; no guarda valores sensibles ni `value_full`. El payload permitido V1 sólo acepta `reason` opcional, y legal/PII se redirige a su primitive dueño.
- **Invariantes:** resolver blocker no activa members, no completa intake, no auto-mergea identidad y no escribe payroll/compensation/access. Reintentos son state-safe por los commands delegados; el audit registra intentos con digest para trazabilidad.

## Delta 2026-07-10 — TASK-1383: Assessment Engine hardening + invariante de versionado de templates

Auditoría 2026-07-10 (código real + specs downstream) → hardening pre-TASK-1363:

- **Idempotencia a nivel DB de las respuestas**: UNIQUE parciales `(assessment_id, question_id)` / `(assessment_id, competency_id) WHERE question_id IS NULL` + upsert en `saveResponse`/`recordScorecardRating`. El autosave repetido ya no puede duplicar filas ni sesgar el AVG del score final.
- **Expiración operativa**: `token_expires_at` (+14d al asignar) + time-limit (`started_at + time_limit_minutes`) enforceados en resolve/start/save/submit → transición real a `expired`. El primer save auto-arranca el timer; `submitAssessment` exige `in_progress`.
- **Anti-anclaje implementado** en `listResponses` (scorecard ajeno oculto hasta cerrar el propio) — antes solo estaba prometido en el docstring.
- **`needs_human_rating` del tipo REAL en DB** (la superficie pública de 1363 no es fuente de verdad); anti-leak de `buildPublicQuestion` ahora testeado.
- **SME gate auditable** (`status_changed_by/at`); **dedupe del ledger IA** por `(kind, input_digest)` implementado y live-tested.
- **Snapshot del assessment en la decisión**: `decideHiringApplication` persiste server-side `prerequisitesSnapshot.assessment` (score/matchScore/scoredInstances/capturedAt) — el score al decidir queda reconstruible (pre-TASK-1364).

**Invariante nuevo — Template Versioning (pre-TASK-1364/1365):** un `hiring_assessment_template` con instancias es **INMUTABLE** en contenido y módulos (trigger DB; solo `status` muta). Editar = crear versión nueva con `version` + `supersedes_template_id`. **NUNCA** editar in-place un template usado: la correlación validez/fairness por `template_id` asume contenido congelado.

**Invariante complementario — el versionado NO congela el instrumento (auditoría 2026-08-17).** Lo que el trigger congela es la **declaración** (nombre, módulos, pesos); las **preguntas se resuelven en vivo** en cada render, save y submit vía `PUBLIC_ASSESSMENT_QUESTION_RESOLUTION_SQL`, sin snapshot ni caché. Dos consecuencias que ningún gate detecta:

- **Un módulo cuya competencia no tiene preguntas activas no desaparece.** El resolvedor conserva la fila con `question_id IS NULL` y el mapper registra la competencia antes del `continue`: el candidato **ve la sección vacía**, y `submitPublicAssessment` sólo exige responder las preguntas resueltas, así que el **examen encogido se envía sin error** y se puntúa sobre una fracción del peso declarado. Detectado en dos plantillas activas (45% y 25% del peso ciego), archivadas por `migrations/20260817103353922_archive-questionless-module-templates.sql`.
- **Archivar o insertar una pregunta cambia el examen del siguiente candidato** sin tocar template ni versión (el orden es `match de nivel → tipo → created_at DESC`), y a mitad de rendición falla ruidosamente contra el candidato: `404 assessment_question_not_found` al guardar, `400 assessment_incomplete` al enviar.

**NUNCA** declarar sano un instrumento contando módulos: **SIEMPRE** ejercitar el resolvedor real contra la plantilla. Señal canónica de la clase: `hiring.assessment.template_module_without_questions` (steady=0; `error` con una sola plantilla rota, `warning` en el precursor de competencias sin banco). El snapshot inmutable por instancia sigue pendiente — es prerrequisito declarado para expandir la automatización de assignment más allá del canary.

**Quién asigna la plantilla y cómo (TASK-1719):** la vinculación vacante→plantilla es una **policy versionada por opening** y el assignment pasa por **un solo command idempotente** que resuelve la plantilla server-side — el caller (persona, agente o integración) **NUNCA** entrega `templateId`. Manual (propose→confirm con effect digest y expiry enforceado) y automático (consumer reactivo por entrada a etapa, flag `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED` sólo en ops-worker, default OFF) convergen en ese command. La cancelación pre-inicio invalida el token y **libera el cupo de unicidad**, que es lo que la hace recuperación real. La comunicación al candidato la decide **un solo consumer** (`hiring_stage_changed_candidate_comms`, que absorbió al de TASK-1689): una por movimiento, ni cero ni dos. Contrato completo, invariantes y matriz de riesgo: [`GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`](GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md).

Verificación: 6 live guards E2E contra PG real (idempotencia, expiración, anti-anclaje, inmutabilidad, dedupe) + anti-leak unit + suite full.

## Delta 2026-07-10 — TASK-770: bridge de activación hiring→HRIS implementado

El loop `internal_hire` quedó cerrado end-to-end (falta solo la UI, TASK-1368):

- **Bridge:** `src/lib/workforce/hiring-activation/**` — mapping durable `greenhouse_hr.hiring_activation_request` (UNIQUE por handoff) + trail append-only. Commands `review → create-member → open-onboarding → complete` + `cancel` (`POST /api/hr/hiring-activation/[id]/[action]`), flag `HIRING_ACTIVATION_ENABLED` ON en Production desde 2026-07-14 (`dpl_Grm71rLhwyyURq9ar7jf87i7DGzF`).
- **Member core source-neutral** (`member-core.ts`): hermano del cascade D-2 del SCIM — lanes por `identity_profile_id` → email legacy sin profile → reactivación de inactivo → INSERT espejo SCIM (`active=TRUE`, `workforce_intake_status='pending_intake'`, membership operating entity, `member.created`). Drift → `blocked` con código (`ambiguous_identity|member_conflict|member_already_active`), NUNCA auto-merge. Discoverability D-2 por construcción (profile poblado → SCIM backfillea `azure_oid` sin duplicar).
- **Recalibración importante:** `members.active`/`status` NO son GENERATED (verificado live; el `Generated<>` de kysely = "tiene default"). La regla "activación solo vía `completeWorkforceMemberIntake` + readiness" es de GOBERNANZA — el bridge la honra: nunca escribe `workforce_intake_status='completed'` (test estático lo garantiza) y `complete` solo verifica la evidencia.
- **REUSA, no reconstruye:** checklist vía `createOnboardingInstance` (TASK-030, sin template aplicable → `blocked:onboarding_template_missing`); case vía el propio `completeWorkforceMemberIntake`; readiness live en el detail reader (`ready_to_activate` derivado, nunca persistido).
- **Capabilities:** 1 nueva `hiring.activation.review` (execute; hr routeGroup ∪ EFEONCE_ADMIN ∪ HR_MANAGER); create-member reusa `workforce.member.intake.update`; open-onboarding reusa `hr.onboarding_instance`.
- **Señal:** `workforce.hiring_activation_stuck` (member creado, ficha sin completar >7d; steady=0) — namespace workforce, deconflictada de las señales hiring de 356.
- **Smoke E2E contra PG real verde** (`scripts/hiring/_sanity-hiring-activation.ts`): cola → claim → member pending_intake (1 por persona, replay sin duplicado) → checklist → complete bloqueado sin intake → complete con evidencia (`downstreamRef=member:<id>`).

## Delta 2026-07-10 — TASK-356: HiringHandoff implementado (aggregate + consumer reactivo + bridges)

El nodo N10 del master flow (handoff decisión→downstream) pasó de spec a runtime:

- **Aggregate:** `greenhouse_hiring.hiring_handoff` (UNIQUE por `hiring_application_id`, `decision_id` ancla del supersede, CHECK state/destination/blocked_reason, `completed` exige `downstream_ref`) + `hiring_handoff_audit` append-only (triggers anti-UPDATE/DELETE). Migración `20260710173221695`.
- **Dominio:** `src/lib/hiring/handoff/**` — state-machine dual (command: `pending→approved→[in_setup]→completed`, `pending|approved|blocked→cancelled`, `blocked` NUNCA por command; system: supersede/revocación/reopen), `materializeHandoffFromApplication` (tx propia, lee snapshot actual, upsert guardado por `decision_id`+`state`), `transitionHiringHandoff` (command gobernado por capability `hiring.handoff.approve`, idempotente por target state).
- **Consumer reactivo:** `hiring_handoff_materialize` (domain `people`, trigger SOLO `hiring.application.decided`). **SIN flag** — un no-op es terminal en `outbox_reactive_log`. Solo `decision='selected'` materializa; `backup_selected|rejected|withdrawn|on_hold` → no-op explícito o revocación (pending→cancelled; post-aprobación→`blocked:decision_revoked`). Supersede post-aprobación → `blocked:decision_superseded_after_approval` (nunca overwrite). Destinos sin owner V1 (`contractor`→EPIC-013, `partner`, `internal_reassignment`) nacen `blocked:destination_not_supported`.
- **Bridges (flag `HIRING_HANDOFF_BRIDGES_ENABLED` ON en Production desde 2026-07-14; `enabled:false` explícito si se apaga):** `listInternalHireReadyForOnboarding()` (cola para TASK-770), `getHiringJourneyForPerson()` (journey Person 360, sin flag), `listStaffAugmentationHandoffIntents()` (el owner llama `createStaffAugPlacement` explícito y completa con `downstream_ref`). El Reliability AI Observer en `ops-worker` también lee este flag para `hiring.internal_hire_awaiting_onboarding`; revision productiva `ops-worker-00488-fvl`.
- **Command API:** `POST /api/hiring/handoffs/[id]/(approve|setup|complete|cancel)`.
- **Reliability:** módulo `hiring` nuevo (ReliabilityModuleKey) con `hiring.handoff_blocked_stale` (48h) + `hiring.internal_hire_awaiting_onboarding` (72h SLA); las 2 señales de TASK-1362 migraron de `documents` → `hiring`.
- **Eventos:** `hiring.handoff.*` (7, v1, audit-only) — ver `GREENHOUSE_EVENT_CATALOG_V1.md` Delta 2026-07-10.
- **Copy:** `src/lib/copy/hiring.ts` = contrato de presentación es-CL de los códigos estables (770 renderiza desde ahí, nunca el código crudo).
- **Boundary verificado por test:** el dominio solo escribe `hiring_handoff`/`hiring_handoff_audit`/outbox — nunca `members`/`assignments`/`placements`/`payroll_*`/`compensation_versions`/`final_settlements`/`contractor_engagements`/`providers`/`expenses` (boundary.test.ts estático + asserts runtime).

## Delta 2026-07-10 — Candidate document capture: scan/quarantine, resolver unificado y retención (TASK-1362)

### Contexto: superficie abierta, no preventivo

El upload público de CV (TASK-354/1367) estaba vivo validando con `file.type` — el MIME que declara el navegador.
Ningún byte se inspeccionaba. Un binario renombrado a `.pdf` entraba al bucket privado y quedaba `attached`. El
escaneo dejó de ser un preventivo y se implementó como remediación, antes que el resto de la task.

### Escaneo de assets — puerto provider-neutral

`src/lib/storage/asset-scan/` es un puerto (mismo patrón que la signature platform de TASK-490):

- `structural` — magic bytes, coherencia MIME↔contenido, hazards de PDF (`/Launch`, `/EmbeddedFile`, `/RichMedia`,
  `/XFA` bloquean; `/JavaScript` y `/OpenAction` son advisory porque los emiten exportadores legítimos). Corre
  SIEMPRE, in-process, sin infraestructura.
- `clamav-http` — behind `ASSET_MALWARE_SCAN_ENABLED` (default OFF en código; **ON en staging y producción desde
  2026-08-12**, ver Delta 2026-08-12). Composición, no reemplazo: el peor veredicto gana.

Lifecycle: `pending → scan → attached | quarantined`. `quarantined` es terminal — los bytes se preservan para triage
forense, el asset nunca se adjunta y `downloadPrivateAsset` lo rechaza sin importar la capability del actor.

`greenhouse_core.asset_scan_results` es append-only por trigger: sólo las columnas `resolution_*` (triage humano)
pueden mutar. Outbox `asset.quarantined`; signal `storage.asset_scan.open_quarantine` (steady 0; `infected`/`error`
escalan a error).

### Invariantes operativos para agentes — Candidate document capture

- **NUNCA** confiar en `file.type` (ni en la extensión) para decidir el tipo de un upload. Es un valor del cliente. El
  tipo real lo determinan los magic bytes vía `scanAssetBytes`.
- **NUNCA** adjuntar un asset que venga de la web pública sin escanearlo. El camino ergonómico es
  `scanAndGateUploadedAsset` (`src/lib/storage/asset-scan/gate.ts`), que opera sobre **bytes + assetId** (NO sobre un
  `File`) para que cualquier upload lo pueda reusar. La red de seguridad es estructural:
  `attachAssetToAggregate` **rechaza** los contextos `hiring_application_cv` / `hiring_candidate_portfolio_file` sin un
  veredicto `clean` registrado (`asset_scan_required` / `asset_scan_blocking:<verdict>`). Un camino de upload nuevo
  (Growth Forms, TASK-1372/1373) que olvide el gate **falla en el attach**, no pasa en silencio.
- **NUNCA** asumir que reusar `submitPublicHiringApplication` arrastra el escaneo: sólo escanea cuando se le pasa un
  `File`. Un consumer reactivo del worker nunca tiene bytes (sólo JSON de PG), así que el escaneo debe ocurrir en el
  upload síncrono y el worker adjuntar un asset ya escaneado.
- **NUNCA** decidir "el último veredicto gana" mirando el scan más reciente: dos scans con el mismo `scanned_at` se
  desempatan por `scan_id` y un `clean` podría taparle el paso a un `infected`. El guard agrega sobre TODOS los
  veredictos del asset; un bloqueante `open` veta el attach hasta que el triage humano lo resuelva.
- **NUNCA** degradar en silencio a "sin antivirus": con `ASSET_MALWARE_SCAN_ENABLED=true` y sin
  `ASSET_MALWARE_SCAN_ENDPOINT`, el veredicto es `error` (bloqueante). Fail-closed.
- **NUNCA** hacer fallar la postulación porque su archivo quedó en cuarentena: confirmaría al atacante qué payload fue
  rechazado. La postulación se acepta; el documento se resuelve como `quarantined` y el signal levanta la mano.
- **NUNCA** hacer `UPDATE`/`DELETE` sobre `asset_scan_results` fuera de las columnas `resolution_*` (el trigger aborta).
- **NUNCA** autorizar documentos de candidato por routeGroup. El predicado canónico es
  `canAccessHiringCandidateDocument` (capability `hiring.application.read` + `client_*` denegado por `tenantType`).
  El check por routeGroup `hr` le daba los CV a roles sin ninguna capability de Hiring (`hr_payroll`).
- **NUNCA** anclar un documento de candidato por `member_id`: un candidato no tiene member hasta el handoff
  (TASK-356). Se ancla por `identity_profile_id` / `candidate_facet_id` / `application_id`.
- **NUNCA** pedir el documento de identidad en el apply público. `captureCandidateIdentityDocument` exige actor
  autenticado Y una decisión favorable (`selected`/`backup_selected`) — el guardrail es código, no comentario.

### Delta 2026-08-11 — ClamAV provisionado (TASK-1378)

El adapter `clamav-http` dejó de ser código latente: existe el servicio Cloud Run `services/clamav/` y el adapter se
ejerció contra él. **El flag `ASSET_MALWARE_SCAN_ENABLED` sigue OFF en Vercel** — el flip es rollout pendiente.
_(Superado por el Delta 2026-08-12: el flag está ON en staging y producción.)_

**El puerto de escaneo NO es de Hiring.** `scanAssetBytes` recibe bytes y devuelve un veredicto; no sabe de vacantes.
Hoy lo consumen `hiring/public-careers/cv-upload.ts` y `growth/forms/file-uploads.ts`, y el guard del attach exige
veredicto limpio para `hiring_application_cv`, `hiring_candidate_portfolio_file`, `proposal_rfp` y
`proposal_deliverable` (TASK-1392). Extenderlo a otro contexto es agregarlo a `SCAN_REQUIRED_ATTACH_CONTEXTS` y llamar
al gate en su upload — no hay trabajo de ClamAV involucrado. Prender el flag sube la cobertura de **todos** esos
caminos a la vez.

Invariantes del servicio (contrato completo en `services/clamav/` + `deploy-contract.test.ts`):

- **NUNCA** desplegar el scanner con `--allow-unauthenticated`: recibiría bytes de cualquiera. La postura canónica es
  ingress abierto + `--no-allow-unauthenticated` + `roles/run.invoker` sólo para `greenhouse-portal@`, y el adapter
  presenta un ID token OIDC (`fetchGoogleIdTokenForAudience`). El `deploy.sh` aborta si detecta `allUsers`.
- **NUNCA** restringir su ingress a la VPC. Vercel sale por internet pública: el servicio quedaría inalcanzable y, con
  el flag ON, eso es fail-closed sobre **todas** las subidas gateadas.
- **NUNCA** quitar el startup probe HTTP contra `/ready`. Cloud Run da CPU plena sólo hasta que el probe pasa; el shim
  abre el puerto en ~1 s, así que con el probe TCP por defecto clamd queda cargando 3,6 M de firmas con CPU throttled y
  **nunca termina**, con el servicio reportando `Ready=True`. No es un problema de memoria (verificado con 4 GiB).
- **NUNCA** aplicar configuración del servicio sólo con `gcloud run services update`: `deploy.sh` usa `--set-env-vars`
  destructivo y el próximo deploy la borra en silencio. Todo cambio vuelve al script.
- **NUNCA** dejar `min-instances=0` en el runtime que atiende uploads reales: el primer scan pagaría 30-60 s de carga
  de firmas y el adapter corta a los 10 s. El override existe sólo para enfriar staging después del gate.
- **NUNCA** dar por buena la frescura de las firmas sin mirar `/health`: `signatureAgeHours` es el dato. Un ClamAV con
  firmas viejas da falsa confianza, que es peor que no tenerlo.
- **NUNCA** exponer `value_full` de un documento de identidad por el resolver. Sale sólo por el reveal auditado de
  TASK-784 (capability + reason ≥5 chars + audit append-only).
- **NUNCA** crear una columna de portafolio nueva: `candidate_facet.portfolio_url`/`linkedin_url` existen desde
  TASK-1367 y ya vienen saneados (`isSafeHttpUrl`, https-only, sin fetch server-side).
- **NUNCA** borrar documentos de candidatos automáticamente. `retention.ts` detecta y alerta; el borrado de PII de
  personas reales es un comando gobernado con humano en el loop (owner People Ops).

### Delta 2026-08-12 — Scanner LIVE en staging y producción (TASK-1378 cerrada; ISSUE-150 resuelta)

El flip ocurrió: **`ASSET_MALWARE_SCAN_ENABLED=true` en staging Y producción de Vercel desde 2026-08-12**
(Production desde el redeploy `greenhouse-aivcug5f5`). Toda subida gateada (`hiring_application_cv`,
`hiring_candidate_portfolio_file`, `proposal_rfp`, `proposal_deliverable`) corre la composición
`structural + clamav-http` — el peor veredicto gana — contra el servicio Cloud Run único `clamav`
(us-east4, `min=1`, invoker sólo `greenhouse-portal@`; ver `cloud-infrastructure/CLOUD_RUN.md` §`clamav`).

El flip falló DOS veces el 2026-08-11 (`docs/issues/resolved/ISSUE-150-*`): (1) el código OIDC vivía sólo en
develop mientras producción sirve main; (2) producción corre `GCP_AUTH_PREFERENCE=service_account_key` (postura
transicional, TASK-800) y `resolveGoogleIdTokenProvider` (`src/lib/google-credentials.ts`) no tenía rama de
service account key — caía a impersonación ambiente, que exige ADC (inexistente en Vercel) → excepción en ~21 ms
→ fail-closed `scanner_auth_failed` bloqueando CVs reales. Staging no lo mostró porque sin la preferencia usa la
rama WIF: **una prueba de credencial vale sólo para la rama de credencial que ejercita**. Fix en main (release
`a90951dba`, run 31544667630): el resolver enruta por `getGoogleIdTokenProviderPlan(env)` (exportado, testeable
sin red) con 4 planes — `wif` → `service_account_key` → `ambient_impersonated` → `ambient_adc` — alineado con
`getGoogleCredentialSource`; la rama nueva usa `createGoogleAuth({ env }).getIdTokenClient(audience)` (la SA key
firma su propio JWT, sin ADC ni impersonación).

Endpoint de diagnóstico: **`GET /api/internal/health/scanner-auth`**
(`src/app/api/internal/health/scanner-auth/route.ts`; guard `?key=CRON_SECRET` o tenant agency autenticado).
Acuña el ID token **en el runtime donde corre** para la audiencia del scanner y reporta `flagEnabled`,
`credentialPlan`, `credentialDiagnostics` y `mint{ok,durationMs,claims(aud/azp/email/expiresInSeconds)}` — nunca
el token crudo. Con `?probe=scan` además hace un POST real de bytes limpios a `<endpoint>/scan` con el token y
reporta `probe{ok,httpStatus,scanStatus,durationMs}`. No toca el path de uploads ni puede crear cuarentenas.

Verificación de cierre en 3 capas desde el runtime real: (1) diagnóstico pre-flip verde en producción;
(2) post-flip `flagEnabled=true` + `mint.ok` 94 ms + `probe.ok` 147 ms; (3) postulación de prueba por el
formulario público real → `asset_scan_results` con `scanner=structural+clamav-http`, `verdict=clean`, asset
`attached`, 129 ms.

Invariante del bug class (detalle en `agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` §ID tokens OIDC
hacia Cloud Run): **NUNCA** prender un flag que dependa de una credencial sin correr el diagnóstico EN cada
runtime destino — si los environments difieren en `GCP_AUTH_PREFERENCE` (o cualquier selector de source), el
gate de staging NO cubre producción.

### Resolver unificado

`resolveCandidateDocuments` (`src/lib/hiring/documents/`) reúne archivos + enlaces + identidad enmascarada. Un
primitive, muchos consumers (desk TASK-355, handoff TASK-356, Nexa/MCP por construcción vía
`GET /api/hiring/candidate-facets/[candidateFacetId]/documents`). No degrada en silencio: si una fuente falla, la
excepción sube — "sin documentos" y "la consulta falló" no pueden verse iguales.

Detalle load-bearing: los assets `pending`/`quarantined` tienen `owner_aggregate_id = NULL` (el INSERT lo deja así),
así que el resolver los encuentra por `metadata_json->>'candidateFacetId'`. Omitir esa rama haría desaparecer del desk
justo los documentos bloqueados por el escáner.

### Retención (Ley 21.719)

Política declarada: **12 meses** desde `rejected`/`withdrawn`. Consentimiento retirado vence sin ventana. Los
contratados quedan fuera (les aplica la retención laboral). Signal `hiring.candidate_document.retention_overdue`
(warning; `consent_withdrawn` escala a error). El borrado es follow-up gobernado.

## Delta 2026-07-09 — Structured vacancy publication operator (TASK-1371)

Hiring vacancy publication now has a canonical backend-data operator:
`src/lib/hiring/vacancy-publication-operator.ts`. It accepts a structured brief
and supports `dryRun | execute | publish`; CLI wrapper
`pnpm hiring:publish-vacancy --file <brief.json>` and internal endpoint
`POST /api/hiring/vacancy-publications` must reuse this command.

The public opening projection gained additive structured fields:
`public_work_mode`, `public_hiring_region`, `public_city`, `public_country`,
`public_office_location`, `public_area`, `public_skill_tags`,
`public_compensation_band` and internal `publication_source_ref`.
`public_location_mode` remains legacy compatibility only and must be derived
from structured fields, not authored as free copy. `publishOpening` now guards
required public structured fields before an opening can become `public_listed`.

Compensation is explicitly optional in V1: `public_compensation_band` can be
provided, but publish does not require it until finance/payroll/legal define the
approved band governance.

## Why This Document Exists

Efeonce no necesita un ATS corporativo genérico aislado del resto del negocio.

Greenhouse opera un ecosistema de agencias con dos grandes stakeholders:

- `colaboradores`
- `clientes`

Y la demanda de talento aparece en cuatro combinaciones reales:

- interno + `on_demand`
- interno + `on_going`
- cliente/staffing + `on_demand`
- cliente/staffing + `on_going`

Por eso el dominio no puede modelarse solo como `job posting -> applicant -> hire`.

La capa correcta debe resolver:

- intake de demanda
- búsqueda y shortlist
- evaluación
- decisión
- handoff

sin duplicar `Person`, `People`, `HRIS`, `Staff Augmentation`, `Finance` ni `Team Capacity`.

## Canonical Positioning

### Naming

- `ATS` queda aceptado como shorthand conversacional.
- El nombre arquitectónico preferido del dominio es `Hiring`.
- La capa upstream de demanda ya no debe modelarse solo como `StaffingRequest`; el nombre canónico más amplio pasa a ser `TalentDemand`.

Regla:

- `StaffingRequest` puede existir como subtipo, vista o alias funcional de una `TalentDemand`
- pero el objeto raíz del dominio debe soportar tanto necesidades internas como de staffing

## Core Thesis

Greenhouse debe tratar `Hiring / ATS` como una capa canónica de fulfillment de talento.

En una frase:

> `Hiring / ATS` gobierna la conversión de una demanda de talento en una cobertura seleccionada y lista para handoff; `HRIS` gobierna la persona ya incorporada; `Staff Augmentation` gobierna el placement vendido y operado.

## Non-Negotiable Rules

1. `Hiring / ATS` no reemplaza `People`; reutiliza `Person` como raíz humana canónica.
2. `Hiring / ATS` no reemplaza `HRIS`; activa o enriquece el journey hasta el punto donde corresponde crear o promover `member`.
3. `Hiring / ATS` no reemplaza `Staff Augmentation`; prepara el resultado que luego deriva en `assignment` y `placement`.
4. El intake debe modelarse como demanda explícita, no como notas sueltas o vacantes aisladas.
5. La unidad visual del pipeline debe ser `Application`, no la persona sola ni el opening solo.
6. El handoff hacia runtime operativo debe ser explícito y auditable.
7. `Finance`, `Payroll`, `Cost Intelligence` y `Team Capacity` siguen siendo dueños de su verdad; `Hiring / ATS` consume y contextualiza.
8. El dominio debe soportar una entrada pública para candidatos sin exponer datos internos del pipeline.

## Demand Matrix

La demanda debe poder expresarse sobre cuatro cuadrantes sin cambiar de modelo:

| Stakeholder | Engagement  | Ejemplo                                                 | Destino probable                           |
| ----------- | ----------- | ------------------------------------------------------- | ------------------------------------------ |
| `internal`  | `on_demand` | refuerzo temporal para un delivery o iniciativa interna | reassignment, contractor, partner          |
| `internal`  | `on_going`  | contratación estable o capacidad estructural            | internal hire, internal reassignment       |
| `client`    | `on_demand` | cobertura puntual para un cliente o proyecto acotado    | contractor, staff augmentation, partner    |
| `client`    | `on_going`  | servicio continuo o squad estable                       | staff augmentation, internal hire, partner |

## Canonical Objects Involved

### `TalentDemand`

Objeto raíz de demanda.

Debe capturar:

- `stakeholderType`
  - `internal`
  - `client`
- `engagementType`
  - `on_demand`
  - `on_going`
- `fulfillmentMode`
  - `internal_reassignment`
  - `internal_hire`
  - `staff_augmentation`
  - `contractor`
  - `partner`
- `demandOrigin`
  - `client_request`
  - `prospect_request`
  - `replacement`
  - `expansion`
  - `capacity_gap`
  - `manual_internal`
- contexto comercial u operativo:
  - `organizationId?`
  - `clientId?`
  - `spaceId?`
  - `businessUnit?`
  - `serviceId?`
- intención de cobertura:
  - `requestedRole`
  - `requestedSeats`
  - `requestedSkills`
  - `targetStartDate`
  - `priority`
  - `duration`
  - `timezone`
  - `language`
  - `budgetBand?`
  - `rateBand?`

### `HiringOpening`

Opening concreto derivado de una demanda.

Reglas:

- una `TalentDemand` puede abrir cero, uno o varios openings
- un opening no reemplaza a la demanda
- el opening debe poder cerrarse o pausarse sin destruir la demanda madre

Capas adicionales recomendadas:

- `visibility`
  - `internal_only`
  - `private_sourcing`
  - `public_listed`
- `publicationStatus`
  - `draft`
  - `ready_for_review`
  - `published`
  - `paused`
  - `closed`
- `public copy`
  - `publicTitle`
  - `publicSummary`
  - `publicDescription`
  - `publicRequirements`
  - `publicLocationMode`
  - `publicEmploymentMode`
  - `applyUrl?` solo si existe desvío externo excepcional

Regla:

- no todo opening debe ser público
- el opening público es una proyección controlada del opening interno, no otra identidad

### `Person`

Raíz humana canónica del grafo Greenhouse.

Regla:

- `Hiring / ATS` no crea una identidad humana paralela
- un candidato externo debe poder vivir como `Person` temprana o parcial

### `CandidateFacet`

Faceta de reclutamiento asociada a `Person`.

Debe capturar:

- `source`
- `readiness`
- `availability`
- `seniority`
- `expectedRate`
- `portfolio/cv assets`
- señales de verificación o confianza
- signals de bench, historial y elegibilidad

### `HiringApplication`

Relación `Person -> Opening`.

Esta es la unidad transaccional del pipeline.

Debe capturar:

- `applicationId`
- `openingId`
- `personId`
- `ownerUserId`
- `stage` — seis valores; ver `Lifecycle Model` y el delta de `TASK-1754`
- `score`
- `matchScore`
- `blockingIssues`
- `nextStepAt`
- `source`
- notas y explainability

### `HiringEvaluation`

Entidad de evaluación.

Debe capturar:

- entrevista
- scorecard
- feedback
- pruebas
- checks relevantes

Regla:

- no reducir toda la evaluación a comments sueltos dentro de `application`

### `HiringDecision` — el DESENLACE

Cómo terminó el recorrido de la persona. El campo físico conserva el nombre `decision`, pero **NUNCA**
se lee como «lo que Efeonce decidió»: `withdrawn` y `unresponsive` no son decisiones de Efeonce.

Seis valores:

- `selected`
- `backup_selected`
- `not_selected` — exige `decision_cause` (`capacity_filled` · `opening_closed` · `process_cancelled`);
  la causa está prohibida en los otros cinco
- `rejected`
- `withdrawn`
- `unresponsive`

`on_hold` **dejó de ser desenlace**: una pausa no es un cierre, y se registra moviendo la ETAPA a
`decision_pending`. **Pendiente post-release:** sigue en el `CHECK` de la base a propósito, porque
`origin/main` todavía ofrece «Dejar en espera» (`ISSUE-161`).

### `HiringHandoff`

Contrato explícito de salida del dominio.

Debe indicar:

- qué application fue seleccionada
- cuál es el destino operativo
- qué prerequisites siguen pendientes
- qué módulo recibe ownership del siguiente tramo

### `HiringSignal`

Señales operativas o institucionales del dominio.

Ejemplos:

- `shortlist_ready`
- `coverage_risk`
- `opening_stalled`
- `capacity_gap_detected`
- `handoff_ready`

## Structural Decisions

### 1. Demand-first, not opening-first

El módulo no debe arrancar desde vacantes sueltas.

La secuencia canónica recomendada es:

`talent_demand -> hiring_opening -> person(candidate facet) -> hiring_application -> hiring_decision -> hiring_handoff`

### 2. Person-first, not candidate-first

`candidate` no debe ser una identidad humana paralela.

La distinción correcta es:

- `Person core`
- `CandidateFacet`
- `Member facet`
- `Commercial / Delivery facets`

### 3. Application is the pipeline unit

El kanban y las colas operativas deben mover `applications`.

No deben mover:

- personas genéricas sin contexto
- openings como si fueran candidatos

### 4. Handoff is a first-class object

El paso hacia HR, Staffing o procurement no debe resolverse con side effects implícitos.

Debe existir `HiringHandoff` explícito para auditar:

- quién fue seleccionado
- para qué demanda/opening
- con qué destino
- con qué prerequisitos pendientes

### 5. Demand must not require a fully canonized client on day 0

La demanda debe poder nacer aunque el cliente todavía esté en estado prospecto o pre-canonización.

Campos aceptables en ese estado:

- `prospectRef`
- `dealRef`
- `externalAccountRef`
- `requestedCompanyName`

Regla:

- la búsqueda no debe bloquearse por no tener aún `organization/client/space` consolidados

## Lifecycle Model

### TalentDemand lifecycle

- `draft`
- `qualified`
- `open`
- `sourcing`
- `partially_fulfilled`
- `fulfilled`
- `stalled`
- `cancelled`
- `archived`

### HiringOpening lifecycle

- `draft`
- `active`
- `paused`
- `filled`
- `cancelled`
- `closed`

### HiringApplication lifecycle

Seis etapas, una por columna del kanban. `closed` significa «el recorrido terminó» y el desenlace
dice cómo — ver `HiringDecision` y el delta de `TASK-1754`.

- `sourced`
- `screening`
- `shortlisted` — absorbió `qualified` y `client_review`; **dispara la policy de assessment**
- `interview`
- `decision_pending`
- `closed` — escribible **sólo** por el command de decisión

Los siete literales históricos (`qualified`, `client_review`, `selected`, `backup`, `rejected`,
`withdrawn`, `handoff_ready`) salieron del enum TS, y el `CHECK` de la base los angostó el 2026-08-23
con `migrations/20260823111250596_task-1754-stage-vocabulary-contract.sql` (commit `50b742341`).

### HiringHandoff lifecycle

- `pending`
- `approved`
- `in_setup`
- `completed`
- `blocked`
- `cancelled`

## Handoff Rules By Fulfillment Mode

### `internal_reassignment`

Destino esperado:

- ajuste de capacity / assignment / team allocation

Regla:

- no crear `member` nuevo
- no crear `placement`

### `internal_hire`

Destino esperado:

- activación de `member facet`
- onboarding interno
- posterior asignación operativa

Regla:

- `Hiring / ATS` no se vuelve owner del onboarding HR

### `staff_augmentation`

Destino esperado:

- creación o enlace de `assignment`
- luego `placement`

Regla:

- `Hiring / ATS` no crea un `placement` como efecto colateral silencioso
- el carril correcto es `selected application -> handoff -> assignment -> placement`

### `contractor`

Destino esperado:

- engagement contractual
- setup operativo
- provider/procurement lane si aplica

### `partner`

Destino esperado:

- coordinación con provider / partner
- eventual linking a provider-facing runtime

## Ownership Boundaries

### With People

`People` sigue siendo owner de:

- identidad humana
- historial longitudinal de persona
- facetas visibles de perfil y relaciones

`Hiring / ATS` devuelve a `People`:

- demanda cubierta o intentada
- openings donde participó
- history de applications y decisions
- readiness y señales de cobertura

### With HRIS

`HRIS` sigue siendo owner de:

- `member`
- contract taxonomy
- onboarding interno
- lifecycle laboral formal
- payroll readiness

`Hiring / ATS` no debe:

- crear payroll truth
- absorber onboarding
- redefinir contract type como source of truth

### With Staff Augmentation

`Staff Augmentation` sigue siendo owner de:

- `placement`
- onboarding con cliente
- relación comercial-operativa activa
- margin y governance del placement

`Hiring / ATS` solo prepara la cobertura previa.

### With Team Capacity / Agency

`Team Capacity` y `Agency` siguen siendo sources de:

- capacity gap
- over/under allocation
- forecast de necesidad
- señales de bottleneck

`Hiring / ATS` consume esas señales para abrir o priorizar demanda.

### With Finance / Payroll / Cost Intelligence

Estos módulos siguen siendo owners de:

- costo canónico
- compensation truth
- loaded cost
- margin y explain financiero

`Hiring / ATS` puede consumir:

- bands
- impacto esperado
- riesgo económico

pero no recalcular localmente toda la economía.

## Recommended UI Surfaces

### 0. Public Vacancies Landing

Surface pública para atraer candidatos y permitir postulación.

Objetivo:

- listar openings publicables
- permitir discovery por rol, seniority, modalidad y ubicación
- abrir detalle público de cada vacante
- capturar postulaciones hacia el ATS interno

Reglas:

- esta landing no expone `TalentDemand` completa
- no expone score, owners internos, rate bands internos, riesgo, notas ni contexto sensible de cliente
- consume solo la proyección pública del opening

Bloques recomendados:

- hero o first fold con búsqueda
- filtros por:
  - área
  - seniority
  - modalidad
  - ubicación/timezone
  - tipo de vínculo
- lista de vacantes
- detalle público de vacante
- CTA claro de postulación

### 0.1 Public Opening Detail

Vista pública por vacante.

Debe mostrar solo campos publicables:

- título
- resumen
- responsabilidades
- requisitos
- nice-to-have
- modalidad
- ubicación / timezone
- tipo de engagement
- seniority
- proceso esperado

No debe mostrar:

- score interno
- owners internos
- shortage/risk
- cliente si el caso requiere confidencialidad
- economics internos
- señales internas del pipeline

### 0.2 Public Apply Flow

Formulario público de postulación.

Debe permitir:

- datos básicos de contacto
- CV / portfolio / links
- disponibilidad
- compensation expectations si aplica
- consentimiento y autorización de tratamiento
- source attribution

Resultado canónico:

- crear o reconciliar `Person`
- activar o actualizar `CandidateFacet`
- crear `HiringApplication` contra el `HiringOpening`

Regla:

- una postulación pública no debe crear un aggregate paralelo de candidato
- entra al mismo pipeline interno que sourcing manual, referral o bench

### 1. Demand Desk

Lista institucional de demandas y openings.

Debe responder rápido:

- qué requests están abiertas
- cuál es su origen
- qué stakeholder espera cobertura
- cuáles están stalled o sin owner claro

### 2. Talent Pool

Vista unificada de talento evaluable.

Debe mezclar:

- internos
- bench
- externos
- freelancers
- históricos verificados
- partners cuando aplique

#### V1 person-first — TASK-1723 a TASK-1726

La V1 está operativa en producción para búsqueda interna y cubre candidatos externos e históricos conservando una
sola persona canónica.
`greenhouse_hiring.talent_pool_membership` gobierna lifecycle/purpose; consentimientos, actividad y evidencia son
append-only o proyecciones con lineage. Aplicaciones, assessments, documentos y contacto permanecen en sus fuentes.

Superficies consumidoras del mismo contrato:

- candidato: `/public/careers/talent-profile/[token]`, limitado a consentimiento futuro, disponibilidad y retiro;
- operador: `/agency/hiring/talent-pool`, búsqueda person-first + profile + invitación `propose → confirm`;
- App API: search/profile más commands idempotentes de availability, consent request/withdraw e invite
  propose/confirm bajo `/api/platform/app/hiring/talent-pool/{id}/...`;
- agentes: adapter read-only `greenhouse-hiring` en Efeonce MCP, siempre delegado a una persona interna; canary
  productivo allow search/profile `200` y deny base-only `403` verificados el 2026-08-16.

El Banco expone cada CV al operador dentro de su sidecar mediante un reader exacto
`applicationId → assetId` y el visor privado canónico. Nunca reutiliza el resolver histórico por
`candidateFacetId`: una persona puede tener varias postulaciones y varios CV. Application 360 conserva
`?tab=documents` como contexto adicional, pero ya no es necesario abandonar el Banco para revisar el archivo.

El acceso de agentes al documento es un contrato separado (`TASK-1718` y
`GREENHOUSE_CANDIDATE_REVIEW_PACKET_DELEGATED_ACCESS_DECISION_V1.md`): capability
`hiring.candidate.review.read`, App API delegada, purpose cerrado y proyección derivada únicamente sobre un PDF
privado `attached` cuyo último scan sea `clean`. Conserva hash/versión, minimiza correo, teléfono e identidad-like
antes de persistir texto y nunca contiene bytes, identidad legal, respuestas del test, notas libres o contacto. El
gateway sólo federa `hiring.applications.review.list` y `hiring.application.review_packet.get`; no consulta PG/GCS
ni abre URLs del candidato. Reader, proyección y provider nacen apagados y su uso sobre CV real exige gate trazable
de Security/Privacy/Talent/Identity/MCP.

La búsqueda sólo sirve DTOs allowlisted: identidad visible mínima, lifecycle, disponibilidad, coverage/freshness y
evidencia estructurada. Excluye correo, teléfono, CV/raw text, notas, economics, respuestas, answer keys y atributos
protegidos. No produce fit score, ranking ni decisión adversa. `active_process` permite operar la postulación vigente,
pero sólo un consentimiento `future_opportunities` vigente permite recontactar o invitar a otra opening.

Canon y rollout: `GREENHOUSE_TALENT_POOL_FULL_API_PARITY_DECISION_V1.md`; tasks `TASK-1723`–`TASK-1726`; flags
separados projection/search/self-service/invite/MCP. Producción mantiene los cinco flags internos ON desde
2026-08-16 (`projection`, `search`, `MCP`, `self-service` e `invite`) por autorización operativa del CEO. El
self-service y la invitación siguen consent-gated, tokenizados/reversibles y no producen contacto automático,
movimiento de etapa ni asignación de test. La V1 no autoriza todavía
adapters de bench, internos, freelancers o partners: requieren su propio source adapter y policy.

### 3. Pipeline Board

Vista kanban de `applications`.

Regla UI:

- la tarjeta del board debe representar una `HiringApplication`
- no una persona suelta
- no un opening como pseudo-candidato

Contrato de retorno contextual:

- `openingId` selecciona la vacante y `focusApplication` es una pista efímera para regresar desde
  Application 360 a la tarjeta exacta; no constituyen estado persistente ni una segunda fuente de verdad.
- El reader resuelve primero `focusApplication` y fija fuera de los límites paginados la cadena exacta
  postulación → vacante → demanda. El contexto de la postulación prevalece sobre un `openingId` contradictorio;
  la política canónica de procedencia sigue aplicando y nunca se amplía por navegar.
- Si el foco no existe o no es visible bajo la policy de procedencia vigente, la vista declara que no pudo
  ubicarlo. Nunca enfoca silenciosamente otra tarjeta como si fuera la original.
- Una vez consumido, `focusApplication` se retira de la URL sin crear una nueva entrada de historial. El enlace
  durable sigue siendo el pipeline de la vacante; el foco sólo coordina scroll, focus visible y anuncio accesible.

Brecha de conformidad conocida (2026-08-24): las consultas de aplicaciones del snapshot de Pipeline, incluido
el lookup exacto de `focusApplication`, todavía no agregan `archived_at IS NULL`, por lo que una postulación
archivada puede permanecer o reaparecer en el board aunque la cola secuencial sí la excluya. Esto contradice el
eje canónico `archived_at` («si el registro se muestra») y no constituye una excepción al modelo. Hasta
corregirlo, ningún consumidor debe interpretar el snapshot o el pin de foco como autorización para reexponer
postulaciones archivadas.

### 4. Application 360

Vista detallada de una application.

Bloques mínimos:

- overview
- evaluations
- timeline
- notes
- blockers
- decision
- handoff

Contrato de revisión secuencial:

- Anterior/Siguiente recorre sólo postulaciones no archivadas de la **misma vacante y etapa** que la postulación
  abierta. El orden es estable: `created_at DESC, application_id ASC`; se recalcula en cada request y no persiste
  un cursor que pueda quedar stale después de un cambio de etapa o archivado.
- El reader de navegación devuelve únicamente identificadores, posición y total. Nunca incorpora score, afinidad,
  ranking, recomendación IA, contacto ni otros datos del expediente; los readers de Application 360 conservan la
  propiedad de PII, evaluaciones y ceguera anti-anclaje.
- El retorno a Pipeline usa la pestaña existente con `openingId + focusApplication`, de modo transversal para
  cualquier vacante. No agrega un botón paralelo ni obliga a reconstruir el camino pasando por Demand Desk.
- La navegación a otra ficha protege borradores locales sin guardar antes de abandonar la postulación. Esta
  protección es un contrato de interacción; no convierte el estado de formulario en estado del dominio Hiring.

### 5. Demand 360

Vista detallada de la demanda.

Bloques mínimos:

- requester / stakeholder
- contexto organization/space/service
- openings
- shortlist
- risk
- fulfillment progress

### 6. Handoffs

Cola explícita de salida del dominio.

Debe responder:

- qué candidatos ya fueron elegidos
- quién está listo para HR
- quién está listo para assignment / placement
- qué casos siguen bloqueados

### 7. Publication Desk

Surface interna para gobernar qué openings se publican externamente.

Debe responder:

- qué openings están listos para publicarse
- qué openings ya están publicados
- cuáles están pausados o vencidos
- qué copy pública o compliance falta antes de publicar

Acciones esperadas:

- revisar copy pública
- aprobar publicación
- pausar
- cerrar
- ver métricas de conversión básicas

## Public Candidate Entry Model

### Public entry is a controlled lens, not a second ATS

La landing pública de vacantes no debe modelarse como módulo separado del ATS.

Debe ser:

- una surface pública de discovery
- una surface pública de apply
- conectada al mismo dominio `Hiring / ATS`

### Publication model

Cada `HiringOpening` debe poder distinguir entre:

- truth interna del opening
- payload público derivado

Campos internos siempre canónicos:

- owner
- stakeholder
- demand origin
- budget/rate
- risk
- notes
- shortlist logic

Campos publicables derivados:

- title
- description
- requirements
- location/mode
- seniority
- visible hiring process notes

### Candidate source normalization

El ATS debe registrar la fuente de entrada del candidato.

Fuentes mínimas:

- `public_careers`
- `manual`
- `referral`
- `bench_internal`
- `partner`
- `hubspot`
- `import`

### Privacy, consent and abuse guardrails

La entrada pública debe contemplar:

- consentimiento explícito de tratamiento de datos
- retención y borrado según policy
- assets privados para CV/portfolio cuando corresponda
- rate limiting / captcha / anti-spam
- email verification opcional si el volumen lo justifica

Regla:

- el ATS no debe abrir write lanes públicos sin guardrails mínimos de abuso y consentimiento

### Multi-tenant / brand stance

La primera iteración recomendada es:

- una landing pública de marca Efeonce / Greenhouse
- openings publicados desde el dominio central

Se permite evolución futura hacia:

- lenses por cliente o por practice
- branding parcial por demand/opening

Pero no conviene arrancar con micrositios por tenant como requisito base del dominio.

## Event Model

## Aggregate types recomendados

- `talent_demand`
- `hiring_opening`
- `hiring_application`
- `hiring_evaluation`
- `hiring_handoff`
- `hiring_signal`
- `person`

## Outbox events recomendados

### Demand lifecycle

- `talent_demand.created`
- `talent_demand.updated`
- `talent_demand.status_changed`
- `talent_demand.opening_created`
- `talent_demand.fulfilled`

### Opening lifecycle

- `hiring.opening.created`
- `hiring.opening.updated`
- `hiring.opening.status_changed`
- `hiring.opening.closed`
- `hiring.opening.published`
- `hiring.opening.unpublished`

### Candidate facet lifecycle

- `hiring.candidate_facet.created`
- `hiring.candidate_facet.updated`
- `hiring.candidate_facet.archived`
- `hiring.candidate_facet.promoted_to_member`

### Application lifecycle

- `hiring.application.created`
- `hiring.application.stage_changed`
- `hiring.application.shortlisted`
- `hiring.application.selected`
- `hiring.application.rejected`
- `hiring.application.withdrawn`
- `hiring.application.handoff_ready`

### Public application lifecycle

- `hiring.public_application.submitted`
- `hiring.public_application.confirmed`
- `hiring.public_application.deduplicated`

### Handoff lifecycle

- `hiring.handoff.created`
- `hiring.handoff.approved`
- `hiring.handoff.blocked`
- `hiring.handoff.completed`

### Signal lifecycle

- `hiring.signal.shortlist_ready`
- `hiring.signal.coverage_risk`
- `hiring.signal.opening_stalled`
- `hiring.signal.capacity_gap_detected`
- `hiring.signal.handoff_ready`

## Decisions Locked By This Document

1. **`Hiring / ATS` es un dominio canónico propio de Greenhouse** y no una nota futura difusa colgada de `Staff Augmentation`.
2. **El objeto raíz del dominio es `TalentDemand`**, no el opening aislado.
3. **`StaffingRequest` queda absorbido como subtipo o lectura especializada de `TalentDemand`** para casos de staffing.
4. **`Person` sigue siendo la raíz humana canónica**; `candidate` vive como faceta, no como identidad paralela.
5. **`HiringApplication` es la unidad transaccional del pipeline** y la unidad visual del kanban.
6. **`HiringHandoff` es obligatorio como contrato de salida del dominio** antes de tocar `member`, `assignment` o `placement`.
7. **`Hiring / ATS` no es owner de `member`, `assignment`, `placement`, `compensation` ni `margin`**.
8. **La demanda puede nacer sin cliente totalmente canonizado** mientras exista trazabilidad hacia prospecto/deal/upstream.
9. **El dominio debe soportar interno vs cliente y on-demand vs on-going sin cambiar de objeto raíz**.
10. **El dominio debe soportar una landing pública de vacantes y postulación** sin crear un pipeline paralelo al ATS interno.
11. **El opening público es una proyección controlada del `HiringOpening` interno**, no una identidad nueva.
12. **La primera iteración recomendada de la landing pública es centralizada y de marca Efeonce**, no multi-tenant por cliente desde el día 1.
13. **El rollout inicial debe priorizar publicación controlada y guardrails de consentimiento/abuso** antes de abrir variaciones más complejas de portal público.

## Relationship To Existing Research

- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md` sigue siendo válido como research reactivo y evento-driven.
- Esta spec eleva a arquitectura canónica tres decisiones:
  - el dominio deja de verse solo como mini ATS para Staff Aug
  - `TalentDemand` generaliza al `StaffingRequest`
  - el handoff explícito pasa a ser contrato obligatorio

## References

- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`

## Delta 2026-07-07 — TASK-353: Domain foundation implementada (schema `greenhouse_hiring`)

La foundation transaccional del dominio quedó materializada (local-first, verificada contra PG dev). Schema nuevo **`greenhouse_hiring`** con 4 aggregates:

- **`talent_demand`** (`demand_id` `tdmn-{uuid}`, `public_id` `EO-TDM-####`) — objeto raíz. `stakeholder_type` (internal/client) × `engagement_type` (on_demand/on_going) × `fulfillment_mode` (5) × `demand_origin` (6); contexto comercial nullable (`organization_id` FK, `space_id` FK, `client_id`, `business_unit`, `service_id`) + refs pre-canonización (`prospect_ref`/`deal_ref`/`external_account_ref`/`requested_company_name`); intención de cobertura (`requested_role`, `requested_seats`, `requested_skills[]`, `target_start_date`, `priority`, bands); `status` (9-state lifecycle).
- **`hiring_opening`** (`opening_id` `opng-{uuid}`, `EO-OPN-####`) — deriva de `talent_demand` (FK RESTRICT). Truth interna (`internal_title`, `budget_band`, `rate_band`, `risk_notes`, `internal_notes`, `owner_user_id`) **separada** del payload público allowlist (`public_title`, `public_summary`, `public_description`, `public_requirements`, `public_nice_to_have`, `public_location_mode`, `public_employment_mode`, `public_seniority`, `public_process_notes`, `apply_url`). `visibility` (3) + `publication_status` (5) + `status` (6).
- **`candidate_facet`** (`candidate_facet_id` `cndf-{uuid}`, `EO-CND-####`) — **person-first**: FK `identity_profile_id → greenhouse_core.identity_profiles(profile_id)` **UNIQUE** (una Person = a lo más una faceta). `source` (7), `readiness` (5), `expected_rate`, consent/retención, `verification_signals_json`. NO existe root `candidates`.
- **`hiring_application`** (`application_id` `happ-{uuid}`, `EO-APP-####`) — unidad del pipeline. FKs a `hiring_opening` + `identity_profile_id` + `candidate_facet_id`; **UNIQUE(opening_id, identity_profile_id)** (dedupe estructural). `stage` (13-state), score/match_score, `blocking_issues[]`, `dedupe_fingerprint` (apply idempotente TASK-354); **snapshot de decisión embebido** (`decision`, `decision_at`, `decision_by`) + **snapshot de handoff** (`selected_destination`, `tentative_start_date`, `expected_legal_entity`, `expected_context`, `prerequisites_snapshot_json`) para TASK-356 — sin crear `member`/`assignment`/`placement`.

**Boundary respetado:** esta task NO escribe `member`/`assignment`/`placement`/payroll/compensation truth. Compensation/rate son propuesta/snapshot.

**Store canónico:** `src/lib/hiring/` (SQL crudo parametrizado + normalizadores + `HiringValidationError`; cada write publica outbox event v1 en la misma tx). Publication contract: `buildPublicOpeningPayload()` allowlist-only (test anti-leak) + `publishOpening`/`unpublishOpening` + `listPublicOpenings`/`getPublicOpeningByPublicId` (consumidos por TASK-354).

**API baseline interna:** `/api/hiring/{demands,openings,candidate-facets,applications}` (+ `openings/[id]/publish`), dual-gate `requireInternalTenantContext` + `can()`.

**Capabilities V1 (8, seedeadas en `capabilities_registry` + grants en `runtime.ts`):** `hiring.demand.{read,write}`, `hiring.opening.{read,write,publish}`, `hiring.application.{read,write,decide}`. Grant: internal ∪ EFEONCE*ADMIN ∪ HR_MANAGER ∪ EFEONCE_OPERATIONS (∪ EFEONCE_ACCOUNT en read/write; publish/decide least-privilege sin comercial). NUNCA `client*\*`. `hiring.application.decide` queda seedeada/grantada ahora y su endpoint dedicado llega con el desk interno (TASK-355).

**Views (TASK-355, implementadas en dev):** `gestion.hiring`, `gestion.hiring_demand`, `gestion.hiring_pipeline`, `gestion.hiring_publication` y `gestion.hiring_application_detail` viven en `VIEW_REGISTRY`, `role_view_assignments` y el manifest de reachability junto con las rutas `/agency/hiring/**`. Los viewCodes mantienen namespace de navegación `gestion.*`; la ruta conserva ownership de producto bajo `agency`. El acceso visible no reemplaza las capabilities finas de cada reader/command.

**Desk interno (TASK-355, complete):** Demand, Pipeline, Application 360 y Publication comparten `CompositionShell` y consumen el dominio `src/lib/hiring/**`; el Kanban representa `HiringApplication`, ofrece drag más menú operable por teclado y persiste con rollback. `decideHiringApplication` bloquea la fila, exige reason humana estructurada, actualiza el snapshot vigente, agrega `explainability_json.decisionHistory[]` append-only y publica `hiring.application.decided` v1 en la misma transacción. El review de assessment consume TASK-1360/1361; Documentos mantiene PII enmascarada por defecto, abre CV/portafolio mediante el reader de TASK-1362 y reserva el reveal auditado de identidad para TASK-1714/1715. Documentación funcional: `docs/documentation/hr/hiring-desk.md`; manual: `docs/manual-de-uso/hr/operar-hiring-desk.md`.

### Invariantes operativos para agentes — Hiring / ATS foundation

- **NUNCA** crear un root paralelo `candidates`; el candidato vive como `candidate_facet` anclada a `identity_profile_id` (UNIQUE). La creación/reconciliación de Person desde contacto crudo es el apply público (TASK-354), no este dominio.
- **NUNCA** exponer un campo interno del opening al público fuera de `buildPublicOpeningPayload()` (allowlist-only). Agregar un campo público = extender esa función + su test anti-leak.
- **NUNCA** escribir `member`/`assignment`/`placement`/payroll/compensation desde `src/lib/hiring/**`. El handoff downstream es explícito (TASK-356), no side effect.
- **NUNCA** publicar un opening sin `public_title` (guard 422 en `publishOpening`).
- **SIEMPRE** publicar el outbox event en la misma tx que el write del aggregate (patrón del store); `captureWithDomain(err, 'hiring', …)` para observabilidad.

## Delta 2026-07-08 — Assessment (competency testing) + Candidate Document Capture

Extensión del dominio con dos capacidades pedidas por operación: **tests que rinde el candidato** y **carga de documentos**. Programa de tasks: `TASK-1360` (engine), `TASK-1361` (AI assist), `TASK-1362` (doc capture), `TASK-1363` (taking/review UI). Diseño detallado + ejemplo Account Manager en `EPIC-011 → Delta 2026-07-08`.

### Assessment = dos mecanismos sobre un modelo de competencias

El objeto canónico `HiringEvaluation` (ya nombrado arriba) se generaliza a **assessment** con dos métodos que producen el mismo output (resultados por competencia):

- `candidate_test` — cuestionario versionado con answer-key + scoring que el candidato rinde (remoto, tokenizado).
- `interviewer_scorecard` — un evaluador humano registra ratings por competencia.

Modelo canónico (schema `greenhouse_hiring`):

- **Competency catalog** — reutilizable, agnóstico de cargo. Dos ejes **ortogonales** (NUNCA en un solo enum): `category` (`attitudinal` | `aptitude` | `skill`) × `level` (`nociones` | `intermedio` | `avanzado`).
- **Question bank** — por competencia+nivel, `type` ∈ `single_choice`|`multi_choice`|`likert`|`situational`|`open_text`. `answer_key`/`rubric` **sensible**: se persiste separada de lo que ve el candidato (misma disciplina allowlist que el opening público). Objetivo (`single/multi/likert`) auto-corregido; `situational`/`open_text` corrección humana (o IA-propuesta, TASK-1361).
- **Assessment template** — composición de módulos `competencia + nivel objetivo + peso` (ej. "Account Manager L2"). Reutilizable por rol/vacante como plan de evaluación, no como instancia ejecutada.
- **Assessment instance** — plantilla ⨯ `hiring_application` → estados `assigned → sent → in_progress → submitted → scored | expired`; token single-use + tiempo límite para el modo remoto. Este es el objeto que se asigna, rinde, guarda respuestas y se corrige.
- **Response** + **competency result** — respuestas por pregunta; resultado por competencia + overall que **rueda hacia** `hiring_application.score` / `match_score` / `explainability_json` (SSOT del headline en la postulación; el assessment es el detalle que lo alimenta).

### Document capture — reutilización, no plataformas nuevas

- **CV / portafolio (archivo)**: plataforma de assets privados existente (`greenhouse_core.assets` + `GREENHOUSE_PRIVATE_ASSETS_BUCKET`), contextos hiring nuevos anclados por `application_id`/`candidate_facet_id`/`identity_profile_id` (el candidato NO tiene `member` → NO anclar por member). Portafolio-enlace = campo en `candidate_facet`.
- **Delta 2026-07-09 (TASK-354):** el apply público ya acepta CV PDF opcional (máx. 10 MB) como `hiring_application_cv_draft` → `hiring_application_cv`, adjunto a `hiring_application`. Sigue pendiente TASK-1362 para portfolio-file, identidad y scan/quarantine formal.
- **Delta 2026-07-13 (TASK-1372):** Growth Forms application forms now own the reusable public upload path. The public submit route scans bytes while it still has the `File`, stores only a safe uploaded-file descriptor in `greenhouse_growth.form_submission.normalized_fields_json`, and the reactive projection `growth_hiring_application_from_submission` calls `submitPublicHiringApplication` with a pre-scanned private CV asset. Internal application creation is not a `form_destination`; smoke verified destination rows `0`, asset private/attached and scan `clean`.
- **Documento de identidad**: reutiliza `greenhouse_core.person_identity_documents` (TASK-784) anclado al `identity_profile_id` del candidato, patrón enmascarado/revelar + capability `person.legal_profile.reveal_sensitive` + audit; imagen escaneada como `evidence_asset_id`. Capturado **post-decisión** (no en apply público).
- Net-new: **quarantine/scan** de uploads públicos (no existe en la plataforma de assets hoy).

### Invariantes operativos para agentes — Assessment + Doc Capture

- **NUNCA** exponer `answer_key`/`rubric` en el payload que ve el candidato (allowlist como el opening público).
- **NUNCA** mezclar `category` y `level` en un solo enum (ejes ortogonales).
- **NUNCA** dejar que un score de assessment alimente payroll/ICO/bonus, ni que auto-rechace una postulación — es input a decisión humana.
- **NUNCA** anclar un asset/identity-doc de candidato por `member_id` (usar `identity_profile_id`/`candidate_facet_id`/`application_id`).
- **NUNCA** IA que puntúa como verdad final: `propose → confirm` (humano confirma) + eval baseline (TASK-1361).
- **SIEMPRE** reutilizar `person_identity_documents` para identidad (no crear tabla de docs de identidad en `greenhouse_hiring`).

### As-built — TASK-1360 Assessment Engine (2026-07-08, engine completo)

El engine (no la UI, no la IA) quedó implementado tal como el diseño de arriba. Estado real: **code complete; rollout de migraciones a staging/prod pendiente vía release pipeline** (aplicadas en dev).

- **7 tablas** en `greenhouse_hiring` (reusan `touch_updated_at()`, marker `-- Up Migration` + DO block anti pre-up-marker): `hiring_competency` (`key` UNIQUE, `category` CHECK), `hiring_question` (`answer_key_json`/`rubric_json` sensibles, `status` `draft|sme_review|active|retired` — nace `draft`, gate SME), `hiring_assessment_template`, `hiring_assessment_template_module` (`weight`, `target_level` nullable, UNIQUE `(template,competency)`), `hiring_assessment` (`public_id` `EO-ASM-####`, `method` `candidate_test|interviewer_scorecard`, `access_token_hash` sha256 single-use, `accommodations_json`, estados `assigned→sent→in_progress→submitted→scored|expired`), `hiring_assessment_response` (`auto_score` + `needs_human_rating` + `human_score`), `hiring_competency_result` (UNIQUE `(assessment,competency)`).
- **Seeds**: 16 competencias (9 skill · 4 attitudinal · 3 aptitude) + plantilla `atpl-account-manager-l2` (9 módulos, weight=100).
- **Dominio** `src/lib/hiring/assessment/**`: `store.ts` (catálogo/banco/plantillas + `buildPublicQuestion` allowlist sin `answer_key`), `instances.ts` (asignar/rendir + token hash nunca en view model + anti-anclaje del scorecard), `scoring.ts` (`computeObjectiveScore` PURA 0-100 + `rollupCompetencyResultsToApplication` helper único ponderado, ADVISORY sobre `hiring_application`).
- **3 capabilities** `hiring.assessment.{read,author,score}` (catálogo + runtime grants + `capabilities_registry` seed, mismo PR; guard `capability-grant-coverage.test.ts` verde). read+author → tier operador; score → tier gobernanza (`execute`), NUNCA `client_*`.
- **7 rutas** internas `/api/hiring/assessments/**` (competencies · questions · templates · assign+list · `[id]` · `[id]/score`), dual-gate + `toHiringErrorResponse` es-CL.
- **Eventos** `hiring.assessment.{template_created,assigned,submitted,scored}` + `hiring.competency_result.updated` (aggregate types en `event-catalog`).
- Divergencia menor vs diseño: `hiring_assessment_response` agrega `human_score` explícito (además de `auto_score` + `needs_human_rating`) para separar puntaje objetivo del corregido por humano. Sin otra divergencia estructural.

### As-built — TASK-1361 Assessment AI Assist (2026-07-08, capa IA gobernada)

La capa IA (generar preguntas + sugerir puntaje, `propose → confirm`) quedó implementada como **capa de dominio hiring** que consume la infra LLM compartida (`src/lib/ai/*`), NO como tool del motor conversacional de Nexa (espeja el AEO grader `src/lib/growth/ai-visibility/**`). Estado real: **code complete + flag OFF; migraciones en dev, rollout staging/prod vía release pipeline; requiere eval baseline verde + sign-off HR/Legal antes del flip** (hiring-AI = alto riesgo EU AI Act).

- **1 tabla** additive `hiring_assessment_ai_proposal` (append-only ledger; `kind` `question_draft|response_score`, `status` `proposed|confirmed|rejected`, `provider`/`model`/`prompt_version` trazables, `input_digest` sha256 nunca-PII, índice parcial de cola pendiente).
- **Dominio** `src/lib/hiring/assessment/ai/**`: `state.ts` (máquina pura terminal-once), `proposal-store.ts` (ledger + outbox + `FOR UPDATE`), `confirm.ts` (`confirmAiProposal` = ÚNICO write; atómico vía `createQuestion`/`recordHumanScore` con `client` opcional), `config.ts` (flag + seam de modelo: grading `claude-sonnet-5`, generación `gemini-2.5-flash-lite`, override por env), `contracts.ts` (JSON Schema + sanitizers puros = frontera de enforcement), `prompt.ts` (contenido = DATA anti-injection), `providers.ts` (adapters honest-degrading, deps inyectables), `generate-questions.ts` + `score-response.ts` (propose commands, flag-gated), `eval/` (runner puro + dataset curado versionado).
- **Boundary duro:** el LLM PROPONE evidencia; el humano confirma. El LLM nunca escribe el banco (`createQuestion` nace `draft`, gate SME) ni el score (`recordHumanScore`, humano fija el valor). Nunca payroll/ICO, nunca auto-rechaza. La respuesta del candidato va al LLM por allowlist de texto (`extractAnswerText`), nunca identity docs.
- **1 capability** `hiring.assessment.ai_assist` (execute, tier operador, seed + grant + coverage) + **4 rutas** `/api/hiring/assessments/ai/**` (questions/propose, score/propose, proposals GET, proposals/[id]/confirm con capability least-privilege por kind).
- **Eventos** `hiring.assessment.ai_proposed` + `ai_confirmed` (aggregate `hiring_assessment_ai_proposal`).
- **Flag** `HIRING_ASSESSMENT_AI_ENABLED` default OFF (gatea solo los propose paths; el confirm/read de la cola no). Eval de cutover: `scripts/hiring/assessment-scoring-eval.ts`.
- **Parity:** satisfecha a nivel capability/contrato gobernado; el registro del actionKey de Nexa (para operar el confirm desde el chat) queda como **follow-up** (requiere `NexaActionDefinition` completo; espeja TASK-1212 `author_quote`).

### As-built — TASK-1367 Careers Apply Intake Service (2026-07-08, split backend de TASK-354)

La puerta de entrada pública de candidatos (el service backend; la careers UI es TASK-354). Estado real: **code complete + flag OFF; migración additive aplicada en dev, rollout staging/prod vía release pipeline; requiere `TURNSTILE_SECRET` + sign-off consent (Ley 21.719) antes del flip.**

- **Migración additive:** `candidate_facet.portfolio_url`/`linkedin_url` (V1 links-only; el upload de archivo es TASK-1362) + tabla append-only `hiring_application_intake_events` (ventanas de rate-limit por `email_hash`/`ip_hash` + audit SIN PII cruda). consent/source columns ya existían (TASK-353).
- **Dominio** `src/lib/hiring/public-careers/**`: `schema.ts` (`parsePublicHiringApplication` PURO, single SoT, NO Zod — consent obligatorio + email + URLs https browser-safe), `submit-application.ts` (`submitPublicHiringApplication`), `abuse-guard.ts` (rate-limit + intake events), `config.ts` (flag + salts + límites). Reader nuevo `resolvePublishedOpeningIdByPublicId` (published-gated) + `reconcileCandidateFacet` extendido para los links.
- **Flujo (MULTI-STEP IDEMPOTENTE, no single-transaction):** resolver `opening_id` interno (gated) → reconcile Person (`createIdentityProfile` email-first) → `candidate_facet` (source=`public_careers`, consent granted, links) → `hiring_application` (dedupe `UNIQUE(opening_id, identity_profile_id)`). Los 3 son commits separados; el retry es seguro (reconcile por email + upsert por identity_profile_id + dedupe UNIQUE). Efectos pesados (scoring/email/handoff) async, NO en el submit.
- **Endpoint** `POST /api/public/hiring/applications` (público, sin sesión, gate=anti-abuse no capability): flag → parse → Turnstile → rate-limit → validación → submit. **Respuestas SIEMPRE genéricas** (duplicado → mismo `accepted` 202; nunca revela dedupe/estado/existencia previa/PII). Reusa el shared security core `src/lib/growth/public-submission/*`.
- **Flag** `HIRING_PUBLIC_APPLICATIONS_ENABLED` default OFF (404 invisible). Consumer: careers UI (TASK-354).

## Delta 2026-07-10 — Auditoría integral del motor (governance + E2E) + hardening de concurrencia

Auditoría completa del motor hiring (2 pasadas independientes: gobernanza/capabilities + trazado E2E de flujos). Hallazgos cerrados en el mismo ciclo:

- **Governance (ALTA):** el tier de capabilities de gobernanza (`opening.publish`, `application.decide`, `assessment.score`, `handoff.approve`) otorgaba por `hasRouteGroup('internal')` — cualquier usuario interno podía decidir contrataciones. Ahora es role-only: `EFEONCE_ADMIN` / `HR_MANAGER` / `EFEONCE_OPERATIONS` (`src/lib/entitlements/runtime.ts`).
- **Consent (ALTA, Ley 21.719):** `reconcileCandidateFacet` pisaba `consent_status` a `not_captured` en upserts sin consent explícito (borraba `granted`/`withdrawn` y desarmaba la base de retención). Ahora el consent solo cambia con valor explícito (`COALESCE($n, existente)` con el param crudo — NO `EXCLUDED`, que ya viene coalescado). Verificado live en las 4 transiciones.
- **Activation retry (ALTA):** `completeHiringActivation` con request `active` pero `transitionHiringHandoff('complete')` post-commit fallido quedaba en dead-end (early return). El replay ahora solo es total con handoff `completed`; si no, re-corre la transición.
- **Concurrencia scoring:** `submitAssessment`/`finalizeAssessment` leen status con `FOR UPDATE`; finalize valida status finalizable (`submitted`/`in_progress`); `recordHumanScore` rechaza correcciones sobre instancias terminales (guard en el propio UPDATE con join al assessment).
- **TOCTOU:** `materializeHiringHandoff` lockea la application (`FOR UPDATE`) antes del snapshot (serializa vs decide concurrente); los commands de activación re-verifican el handoff DENTRO de la tx (`lockConsumableHandoffInTx`).
- **Decide context:** `selected`/`backup_selected` sobre opening `closed`/`cancelled` → 409; los stages decision-owned (`selected`/`backup`/`rejected`/`withdrawn`) ya no se setean vía PATCH de stage (los define el command decide).
- **Retention:** el reader de retención excluye candidatos con postulaciones ABIERTAS en otros openings (una postulación viva reactiva la base de retención).
- **Unicidad estructural** (migración `20260710223640237`): índice único parcial de instancias de assessment abiertas por (application, template) + único de `members.identity_profile_id` (Person-first: re-hire = reactivación, nunca member paralelo). Pre-check live: 0 duplicados.
- **Otros:** carrera del apply dedupe → 409 tipado (no 502); signal `hiring.internal_hire_awaiting_onboarding` honesto con bridges OFF (no ruido); `reviewHiringActivation` reabre requests `cancelled` con audit; boundary test domain-wide recursivo (`src/lib/hiring/boundary-domain.test.ts`); `finalizeAssessment` emite `hiring.competency_result.updated` (estaba declarado y nunca se emitía).

Áreas confirmadas sólidas sin cambios: state machine del handoff, pipeline de apply público (anti-abuse + respuestas genéricas), scan/quarantine de CV, gating por evidencia del complete, boundary contractor/payroll.

## Delta 2026-07-13 — TASK-1365 Fairness Monitoring (privacy-safe, code complete)

El assessment agrega monitoreo de adverse impact sin convertir demografía en input de decisión. La captura voluntaria vive en `greenhouse_hiring.hiring_demographic_selfid`, separada de `hiring_application`, respuestas, score y scorecard; el único adapter candidato resuelve `application_id` + `identity_profile_id` server-side desde el token vigente del assessment y nunca acepta esos IDs en el request.

- **Policy fail-closed:** `HIRING_FAIRNESS_MONITOR_ENABLED` default OFF. Con flag ON siguen siendo obligatorios `HIRING_FAIRNESS_POLICY_VERSION`, `HIRING_FAIRNESS_RETENTION_DAYS` y `HIRING_FAIRNESS_ALLOWED_CATEGORIES_JSON`. Sin cualquiera de ellos, captura y reader rechazan la operación; categorías son keys allowlisted sin texto libre.
- **Read model agregado:** `greenhouse_hiring.assessment_fairness` reconstruye el máximo avance de cada application usando estado actual + outbox histórico, agrupa por cohort month × dimensión × categoría × stage × template y aplica `HAVING COUNT(DISTINCT application_id) >= 10` antes de exponer filas. La view no contiene identity/application/assessment/candidate IDs.
- **Regla 4/5 + drift:** `getSelectionFairness` exige al menos dos categorías reportables por dimensión, calcula tasa de avance, ratio contra la tasa máxima y alerta bajo `0.8`; drift compara la ventana actual contra la inmediatamente anterior de igual cantidad de meses. Observa y evidencia: nunca escribe application, score, decisión ni cuota.
- **Access:** `hiring.assessment.fairness_read` es role-only para `EFEONCE_ADMIN`, `HR_MANAGER`, `EFEONCE_OPERATIONS`; no se hereda de `internal`, `hiring.assessment.read` ni roles cliente.
- **Scope prospectivo + audit/evidence:** cada registro queda anclado a la application que presentó el consentimiento (`UNIQUE application_id+dimension_key`, con trigger DB que comprueba la misma identity). Así un consentimiento posterior no proyecta atributos sobre postulaciones históricas. La captura registra audit append-only y **no publica self-ID al outbox**. Los snapshots agregados viven append-only en `greenhouse_hr.assessment_fairness_evidence`; un verdict adverso emite `hiring.assessment.fairness.adverse_impact_detected` con scope agregado.
- **Rollout:** migraciones `20260713165547000` + hardening `20260713173500000` aplicadas en la instancia Cloud SQL compartida por dev/staging. SHA `242f8a5d8` live en Vercel staging (`dpl_AuMv2KrDuMKXt5GUp91gr1QZhQLq`) con policy exclusivamente sintetica, retencion 30 dias y categorias `synthetic_cohort: group_a|group_b`; reader autenticado `HTTP 200` y smoke DB verde. La policy publica vigente no cubre categorias demograficas sensibles ni esta finalidad especifica, por lo que captura real y produccion permanecen bloqueadas; prod no tiene las variables. No hay backfill: la cohorte es prospectiva.

Invariante duro para agentes: ningún consumer de decisión/scoring puede importar o consultar `hiring_demographic_selfid`; API/Nexa/People Ops consumen exclusivamente `getSelectionFairness` y su DTO agregado.

## Delta 2026-08-15 — TASK-1714/1715: reveal de identidad del candidato + panel de Documentos real

El tab **Documentos** de la Application 360 (nodo **N5** del master UI flow) era el único de sus cuatro
tabs sin reader: renderizaba tres filas escritas a mano y un "Revelar" implementado como `useState`
local. El motivo que el operador escribía se descartaba y la entrada de auditoría que el banner
prometía nunca se escribía. TASK-1362 construyó el sustrato con `UI impact: none` y dejó fuera de
alcance "la UI de subir/ver documentos… desk TASK-355"; TASK-355 ya estaba cerrada. El cable quedó
sin dueño hasta acá.

### El reveal de identidad de un candidato no existía (TASK-1714)

El reveal auditado de TASK-784 se ancla a `memberId`, y un candidato no tiene member hasta el handoff.
Resultado: el dominio podía **escribir** su RUT (`captureCandidateIdentityDocument`) y **mostrarlo
enmascarado** (`resolveCandidateDocuments`), pero nadie podía leerlo legítimamente — así que el dato
salía por un canal fuera del portal, sin capability, sin motivo y sin trail.

- **Capability propia y estrecha:** `hiring.candidate.reveal_identity`, grant **role-only**
  (`EFEONCE_ADMIN` ∪ `HR_MANAGER` ∪ `EFEONCE_OPERATIONS`), deliberadamente **sin** routeGroup
  `internal` — ese routeGroup lo porta todo tenant interno, así que incluirlo convertiría el reveal de
  PII en permiso de facto universal. **NO** se reusó `person.legal_profile.reveal_sensitive`: vive en
  el módulo `hr`, sólo la portan `FINANCE_ADMIN`/`EFEONCE_ADMIN`, y granteársela al tier de Hiring
  abriría el reveal sobre **toda** persona del módulo (colaboradores, ex-colaboradores, direcciones).
- **Anti-IDOR:** `revealCandidateIdentityDocument` verifica que el `documentId` pertenezca al
  `identity_profile_id` del `candidateFacetId` del path. Un documento ajeno responde **`404`, no
  `403`** — un `403` confirmaría su existencia a quien sondea. Se consulta con `includeArchived: true`
  a propósito, para que un documento archivado del propio candidato reciba el `409` que explica la
  causa en vez de un `404` que afirmaría que no existe.
- **Sin duplicar maquinaria:** el audit append-only y el evento de outbox los escribe
  `revealPersonIdentityDocument` (TASK-784). No hay evento nuevo.
- **No idempotente por diseño:** cada reveal es un acceso real y deja su propia entrada. El doble
  disparo lo evita el cliente bloqueando el CTA, no el servidor deduplicando.

### El panel: dos clases de dato, dos velocidades (TASK-1715)

El modelo canónico de `src/lib/hiring/documents/types.ts` distingue `CandidateDocumentFile`
(`downloadUrl`) de `CandidateIdentityDocument` (`displayMask`). El mockup las aplastó en una sola
"cosa sensible con candado". La corrección: **un archivo se ABRE** —la capability de la pantalla
(`hiring.application.read`) ya autorizó, y la ruta del asset re-verifica— y **la identidad se REVELA**.
Un candado que no protege nada enseña al operador a ignorar los candados que sí protegen.

- **`buildCandidateDocumentsViewModel`** (`src/lib/hiring/documents/view-model.ts`) traduce el paquete
  del dominio a filas ya decididas. Eleva la **ausencia** a estado propio (`missing`) junto a los tres
  del escáner: la UI antes mostraba "Enmascarado" para los cuatro, así que un archivo bloqueado por el
  antivirus y un candidato que nunca adjuntó CV se veían idénticos —y el reclutador culpaba al
  candidato por una falla del sistema.
- **El reader se resuelve en la page**, no en el componente: es `server-only` y es un reader canónico
  del 360, que no degrada en silencio. Su fallo viaja como `documentsFailed` y el panel lo dice; jamás
  se muestra como "sin documentos".
- **El affordance sigue a la capability:** sin `hiring.candidate.reveal_identity` el botón no se
  dibuja. Un botón que siempre falla es peor que ningún botón.
- **El valor revelado vive sólo en memoria del componente.** Un remount vuelve a enmascarado y exige
  otro reveal, que escribe otra entrada: el trail refleja accesos reales, no sesiones abiertas.

### El visor vive dentro del portal, sobre el motor del navegador

`GreenhouseDocumentPreview` (`src/components/greenhouse/documents/`) muestra el documento en un diálogo
sobre un blob same-origin traído con la sesión del usuario. No es una puerta nueva: la ruta del asset
re-autoriza en cada request.

- **NO usa `react-pdf`.** Se intentó primero —ya estaba en el repo con dos consumidores— y **no arranca
  bajo `pnpm dev`**, que corre `next dev --webpack`: `pdfjs-dist` v5 es ESM y el interop de webpack lo
  rompe al evaluarlo (`TypeError: Object.defineProperty called on non-object` en `pdf.mjs`), con el
  import dinámico rechazando en silencio; `transpilePackages` no alcanza. **No está verificado bajo
  Turbopack** (lo que usa `pnpm build`) — de eso depende si `CertificatePreviewDialog` y
  `ContractorSupportDocumentsPanel` están rotos para los usuarios o sólo en desarrollo. Es la primera
  pregunta de `TASK-1716`.
- **Y aun sin ese bug, el motor nativo gana acá:** 0 KB de JS contra ~400 KB de pdf.js + worker, render
  fuera del hilo principal, y zoom/búsqueda/impresión que el operador ya sabe usar. `react-pdf` sólo se
  justifica cuando necesitemos algo que el navegador no da: anotar el CV, o render inline en móvil.
- **El hueco de móvil se cierra por CAPACIDAD, no por viewport:** `navigator.pdfViewerEnabled === false`
  es la respuesta del propio navegador a "¿sé pintar un PDF embebido?". Cuando dice que no, el diálogo
  lo declara y ofrece Abrir/Descargar, y ni siquiera descarga los bytes. Un marco en blanco sería la
  misma degradación silenciosa que esta task vino a eliminar.

### Invariantes operativos para agentes — Candidate documents UI + reveal

- **NUNCA** anclar el reveal de un candidato por `member_id` ni reusar la ruta member-scoped de
  TASK-784. El ancla es `candidate_facet_id` → `identity_profile_id`.
- **NUNCA** responder `403` cuando un `documentId` existe pero es de otra persona: es `404`, y la
  distinción vive sólo en el log interno (sin PII).
- **NUNCA** granteear `person.legal_profile.reveal_sensitive` al tier de Hiring para resolver un caso
  de candidato — abre el reveal sobre todo el módulo HR. La capability correcta es
  `hiring.candidate.reveal_identity`.
- **NUNCA** resolver documentos de candidato dentro de un componente: el reader es `server-only` y se
  consume en la page, que además captura su fallo como estado explícito.
- **NUNCA** colapsar `quarantined`, `pending`, `legacy_unscanned` y la ausencia en un mismo mensaje.
  Son cuatro situaciones con causas y acciones distintas.
- **NUNCA** poner un candado sobre un archivo que la capability de la pantalla ya autorizó a leer.
- **NUNCA** persistir el valor de identidad revelado fuera del estado del componente.
- **NUNCA** mostrar un marco de documento vacío: si el navegador no embebe PDF, decirlo y ofrecer la
  salida.
- **SIEMPRE** que se agregue un consumidor del visor, pasar por `GreenhouseDocumentPreview` en vez de
  recrear el fetch→blob→render (hoy hay tres implementaciones paralelas; `TASK-1716` las unifica).

## Delta 2026-08-16 — Expediente de Evaluación (TASK-1735, code complete)

Nueva capa per-application de narrativa de evaluación, en dos piezas:

**1. Notas append-only** — `greenhouse_hiring.hiring_application_note` (`hnote-*`): `kind`
CHECK (`cv_analysis|assessment_review|interview_note|general`), `body_md` ≤8000, `author_user_id`,
`source` (`human|agent`), `context_json` (referencias: `proposalId`/`assessmentId`/`supersedesNoteId` —
nunca cuerpos duplicados). Trigger `prevent_hiring_note_mutation` + grants sin UPDATE/DELETE
(verificado live). Primitive: `src/lib/hiring/application-notes.ts` (`recordHiringApplicationNote`
acepta tx participante; `listHiringApplicationNotes`). API: `GET/POST /api/hiring/applications/[id]/notes`.
Evento `hiring.application.note_recorded` (payload IDs-only, sin consumers reactivos V1).

**2. Dossier agéntico propose→confirm** — `greenhouse_hiring.hiring_application_dossier_proposal`
(`hdsp-*`, terminal-once `proposed→confirmed|rejected`, único `proposed` activo por
`application_id+input_digest`). `src/lib/hiring/dossier-ai/`: packet assembler con **allowlist
explícita** (CV = texto redactado de la proyección TASK-1718, nunca el PDF; assessment: respuestas +
scores efectivos + rationale referenciado; journey de stages. PROHIBIDO nombre/contacto/identidad
legal/self-ID — el assembler ni los consulta), generación vía `generateStructuredAnthropic` (default
`claude-sonnet-5`, override `HIRING_DOSSIER_AI_MODEL`, prompt `hiring_evaluation_dossier.v1`), output
con evidencia citada + sección `noVerificable`. `proposeEvaluationDossier` idempotente por digest
(modelo efectivo incluido); `confirmEvaluationDossier` materializa la nota `source='agent'`
ATÓMICAMENTE (misma tx que la marca de la propuesta) con provenance completo en `context_json`.
API: `GET/POST /api/hiring/applications/[id]/dossier`. Flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED`
default OFF (Vercel-only, gatea SOLO el propose; ledger actualizado).

**Autorización:** lectura `hiring.application.read`; escritura/propose/confirm capability
`hiring.application.annotate` (tier gobernanza role-only: EFEONCE_ADMIN + HR_MANAGER +
EFEONCE_OPERATIONS).

**Invariantes duros:** **NUNCA** candidate-facing ni en el review packet MCP de TASK-1718 (allowlist
intacta); **NUNCA** el LLM escribe una nota directo (confirm humano SIEMPRE); **NUNCA** tocar
score/match_score/explainability_json (la nota es narrativa, no score); **NUNCA** demográficos en
notas (boundary TASK-1365). El scorecard display fix relacionado (global "Parcial" mientras haya
competencias pendientes) es ISSUE-159 / `scorecard-summary.ts`. UI del expediente: task consumer
ui-ux follow-up (placement contractado en la spec de TASK-1735 §Superficie UI).

### Contrato candidate-facing del scoring IA (TASK-1734 Slice 5)

El candidato **solo ve rendición y confirmación de envío**: preguntas públicas (`buildPublicQuestion`),
sus propias respuestas, timing/accommodations y el `status` del assessment. **NUNCA** ve score
(auto/humano/efectivo), resultados por competencia, propuestas IA, rationale, confidence, clase de
riesgo, estado de revisión, answer key ni rubric — ni por la vista pública, ni por el route
`/api/public/assessment/[token]` (errores genéricos `PUBLIC_MESSAGES`, 404 anti-oracle), ni por los
emails del ciclo (el interno `hiring_assessment_submitted_internal` existe pero sin score), ni por los
DTOs candidate/client (careers público, talent pool self-service, review packet MCP de TASK-1718).

La **denylist de campos prohibidos vive como contrato ejecutable** en
`src/lib/hiring/assessment/public-boundary.test.ts` (constante compartida en
`public-boundary.contract.ts`, deep-scan de keys + sentinels): un campo nuevo de resultado/scoring se
agrega a esa constante y las suites del boundary (vista pública, route público,
`hiring-lifecycle-emails-antileak`, `candidate-boundary`, `proposal-authz-boundary`) lo cubren solas.
El reader interno `listAiProposals` sigue global (authz en el route vía `hiring.assessment.read`);
el reader run-scoped con resource+purpose exacto es del Slice 4.

## Delta 2026-08-16 (2) — Scoring IA a escala (TASK-1734, code complete / rollout gated)

El propose→confirm individual de TASK-1361 escala a un **run asíncrono, durable e idempotente por
`hiring_assessment` exacto**: aggregate `greenhouse_hiring.hiring_assessment_ai_scoring_run` (+ `_item`,
`_event` append-only), a lo más un run activo por assessment + digest inmutable de inputs/policy/**modelo
EFECTIVO**. El wiring vive en el **ops-worker existente** (ADR D4): proyección reactiva
`hiring_assessment_ai_scoring_run_enqueue` sobre `hiring.assessment.submitted` + drain con claim atómico y
fan-out acotado **reutilizando el scorer canónico de 1361** (nunca un segundo scorer). El **risk router**
versionado clasifica cada propuesta como `mandatory_review` / `quality_sample` (muestra **CIEGA
ESTRUCTURAL**: el revisor puntúa sin ver la propuesta) / `batch_eligible`; policy OFF ⇒ todo es
`mandatory_review`. La confirmación de run (`confirm_run` vía
`POST /api/hiring/assessments/ai/scoring-runs/[runId]`, capability `hiring.assessment.score`) exige
excepciones y muestra cerradas y escribe un **manifest append-only** con `sawProposalBeforeScoring` por
resolución humana (anti-anclaje); los scores confirmados aplican por el camino canónico 1361/1360. El
candidato jamás ve nada (denylist ejecutable `public-boundary.contract.ts`, sin flag — prohibido por
contrato). Promoción **bloqueada** por `pnpm hiring:ai:promotion-gate` hasta gold set humano de Talent con
doble rating + adjudicación. 3 flags default-OFF en el ledger, scheduler `ops-assessment-ai-drain` pausado,
rollback por `pnpm hiring:ai:run-rollback` + flags nuevos (nunca el master). Detalle completo: ADR
`GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md` · runbook
`docs/operations/runbooks/assessment-ai-scoring-rollout.md` · señales `hiring.assessment_ai.*` (5, steady=0).

## Delta 2026-08-16 (3) — Identidad de intake canonicalizada (TASK-1736, code complete / rollout gated)

La identidad del candidato en el intake se separa en **tres capas** (ADR
`GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`): **evidencia submitted**
application-scoped e inmutable (`greenhouse_hiring.candidate_identity_intake_evidence`, append-only con
trigger anti-mutación), **display person-first** corregible (`identity_profiles.full_name`) y **search key**
derivada/versionada que jamás fusiona personas. Normalización estructural determinista (NFC + whitespace +
controles/bidi) + casing SOLO `high_confidence` (degenerado evidente, reglas culturales conservadoras);
todo lo ambiguo deriva `needs_review`. El sticky name se cierra con `reconcileCandidateIdentityDisplayName`
(compare-and-set + audit `candidate_identity_display_audit`; una corrección humana SIEMPRE gana). La
corrección manual es la capability nueva `hiring.candidate.correct_display` (role-only: EFEONCE_ADMIN +
HR_MANAGER + EFEONCE_OPERATIONS). La remediación histórica es `dry-run → allowlist humana → apply CAS en
lotes de 1 → rollback` vía `pnpm hiring:candidates:remediate-display`, independiente del flag
`HIRING_CANDIDATE_IDENTITY_NORMALIZATION_ENABLED` (Vercel-only, default OFF — gatea solo el writer del
intake). Primitives: `src/lib/hiring/candidate-intake/**`. Señales `hiring.candidate_identity.*` (2,
steady=0) · runbook `docs/operations/runbooks/candidate-identity-rollout.md` · funcional
`docs/documentation/hr/identidad-de-candidatos-intake.md` · manual
`docs/manual-de-uso/hr/operar-remediacion-nombres-candidatos.md`.

**⚠️ Cambio de semántica del primitive 360 `createIdentityProfile` — afecta a TODOS los consumers
(A3, auditoría 2026-08-16).** El fix del sticky name cambió el `ON CONFLICT (profile_id) DO UPDATE`
de `organization-store.ts` a `full_name = COALESCE(full_name existente, EXCLUDED.full_name)`: el
primitive ahora **preserva** el `full_name` vigente y sólo llena vacíos. Esto rige para **todo**
consumer del primitive — HubSpot contacts, finance suppliers, org memberships, no sólo Hiring: un
rename en el sistema externo **ya no refresca** `full_name` vía `ON CONFLICT`. El refresh legítimo
exige un camino de reconcile propio del dominio (hoy sólo Hiring lo tiene:
`reconcileCandidateIdentityDisplayName`, CAS + audit); dotar de reconcile a los demás dominios es un
follow-up declarado (ver Delta de enmiendas del ADR
`GREENHOUSE_CANDIDATE_IDENTITY_INTAKE_CANONICALIZATION_DECISION_V1.md`).

**Auditoría doble 2026-08-16 — remediación completada:** el apply histórico persiste actor + motivo
en el audit del reconcile (no sólo los valida); existe rollback per-record real
(`rollbackCandidateIdentityRemediation` / CLI `--rollback <auditId>`: CAS del before-value del audit
`reconcile/applied`, registrado como corrección humana; discrepancia ⇒ `needs_review` sin mutar); el
retry de un apply exitoso es idempotente (`already_canonical` cuenta como éxito); el edge de display
vacío materializa el placeholder neutro `Candidato` + `needs_review` (jamás un display invisible); la
evidencia trunca defensivamente a 400 chars pre-INSERT y el capture a Sentry de esa capa viaja
sanitizado (code/constraint PG, jamás DETAIL con PII).

## Delta 2026-08-16 (4) — Tab Expediente + gate anti-anclaje server-enforced (TASK-1737, code complete / rollout gated)

El Expediente de Evaluación (TASK-1735) gana consumer UI y **cierra el gate BLOQUEANTE** que su
Delta (3) dejó abierto: un evaluador con `hiring.application.read` podía leer el análisis con
scores antes de rendir su propio scorecard, debilitando el invariante anti-anclaje de TASK-1383.

**Predicado único (no duplicar el SQL).** El estado "¿el scorecard PROPIO del viewer en esta
application está cerrado?" se extrajo a `getOwnScorecardStateForApplication(applicationId,
viewerUserId)` en `src/lib/hiring/assessment/instances.ts`. Lo consumen los TRES caminos:
`listResponses`, `listPeerScorecardResults` (ratings, TASK-1383) e
`isViewerBlindForApplicationEvaluation` (expediente, TASK-1737). `CLOSED_SCORECARD_STATUSES =
['submitted','scored']`. Un operador **sin** scorecard asignado (reclutador/People Ops) NO activa
el predicado.

**Contrato del reader.** `listHiringApplicationNotes(applicationId, viewerUserId?)` devuelve
`HiringApplicationNotesView = { notes, hiddenNoteCount, viewerBlindUntilScorecardSubmitted }`.
Para el viewer bloqueado omite (a) las notas de `HIRING_SCORE_BEARING_NOTE_KINDS` de OTROS
autores y (b) **toda** nota `source='agent'` (el análisis IA lee scores por construcción). Las
notas propias del viewer y las `general` ajenas SIEMPRE pasan. **Sin `viewerUserId` no filtra** —
espejo exacto de `listResponses`, para que las llamadas server-internas (el confirm del dossier
lee notas) no se rompan.

**Contrato de las rutas.** `GET /notes` pasa `tenant.userId` como viewer y sirve el payload ya
filtrado. `GET /dossier` evalúa el predicado ANTES de leer la propuesta y, bajo bloqueo, responde
`{ aiEnabled, proposal: null, viewerBlindUntilScorecardSubmitted: true, hiddenNoteCount }`.

**Invariantes para agentes:**

- **NUNCA** implementar el anti-anclaje del expediente como filtro client-side ni duplicar el SQL
  del predicado: la ceguera vive en el reader, así que Nexa/MCP y cualquier consumer futuro la
  heredan por construcción (lección estructural del blind sample de TASK-1734).
- **NUNCA** bloquear el expediente entero bajo el predicado: el bloqueo es fino (score-bearing
  ajeno + `agent`) para que el evaluador siga anotando su propia entrevista.
- **NUNCA** confundir `notes: null` (el reader FALLÓ — la page observa con `captureWithDomain` y
  degrada honesto) con expediente vacío.
- La UI es cliente delgado: `src/views/greenhouse/hiring/ApplicationDossierPanel.tsx` sólo
  renderiza DTOs y llama las rutas; cero lógica de negocio.

Superficie: tab `expediente` de `/agency/hiring/applications/[applicationId]` (rename de
`activity`, alias `?tab=activity` preservado). Copy en `hiringDesk.application.expediente.*`
(56 claves, parity es-CL/en-US). Dirección visual
`docs/ui/visual-directions/TASK-1737-application-expediente-direction.md` · funcional
`docs/documentation/hr/expediente-de-evaluacion.md` · manual
`docs/manual-de-uso/hr/operar-expediente-de-evaluacion.md`. **Rollout gated:**
`HIRING_EVALUATION_DOSSIER_AI_ENABLED` sigue OFF en producción (dueño TASK-1735; con el flag OFF
la UI muestra el estado honesto `ai-off`) y la evidencia visual del panel de propuesta con datos
reales queda pendiente de staging.

## Delta 2026-08-17 — Contratos que el primer uso real corrigió (TASK-1735, TASK-1734, TASK-1738)

Tres correcciones de contrato descubiertas al ejercer el dominio con datos reales, no por tests.
Las tres comparten una misma lección: **un contrato implícito se rompe en silencio**, y lo hace
justo donde nadie está mirando.

### 1. La nota del expediente no se trunca en silencio (TASK-1735, límite 20000)

El primer confirm humano de producción-local (propuesta `hdsp-384b740a`) persistió la nota en
exactamente **8000 caracteres** — el techo del CHECK `hiring_application_note_body_md_check` —
mientras el markdown del borrador medía 8240. `renderEvaluationDossierMarkdown` recortaba antes del
insert y el análisis quedó cortado a mitad de frase. **El panel no lo delataba** porque renderiza
desde `proposedJson`; todo consumer del `bodyMd` (API, export, Nexa, MCP) leía un documento
incompleto.

- **Migración aditiva**: CHECK del body a `1..20000` (widening puro — 8000 era conservador sin
  fundamento para narrativa de evaluación con evidencia citada). Aplicada y verificada contra PG real.
  `HIRING_APPLICATION_NOTE_BODY_MAX` es el espejo exacto del CHECK.
- **El write path falla loud**: `assertDossierBodyWithinLimit` → 400 `hiring_dossier_body_too_long`
  con el largo real en un mensaje es-CL. **Truncar sin avisar es justo el bug que produjo esto.**
- **Reparación append-only**: `scripts/hiring/repair-truncated-dossier-notes.ts` reconstruye el texto
  íntegro desde el `proposed_json` del ledger y registra una nota **NUEVA** vía
  `recordHiringApplicationNote` con `context_json.supersedesNoteId` + `reason='truncation_repair'`.
  Idempotente. La fila superada **no se muta** — el ledger sigue siendo append-only.

**Invariante para agentes:** **NUNCA** recortar un cuerpo para que quepa en un CHECK. Si no cabe,
el write falla con el largo real. Un documento mutilado que se ve entero en una pantalla es peor
que un error.

### 2. La nota superada se muestra como historia, no como vigente (TASK-1735)

Reparar generó el problema derivado: dos notas, una correcta y una truncada, ambas visibles como
vigentes. El reader deriva `supersededByNoteId` **desde la nota posterior**
(`context_json.supersedesNoteId`), nunca mutando la fila superada, y el panel la marca con el chip
**"Versión superada"** + tratamiento atenuado.

**Invariante para agentes:** en un ledger append-only, el estado "superado" se **deriva en el
reader** desde la referencia de la fila posterior. **NUNCA** agregar una columna mutable
`superseded` a la fila vieja: eso convierte el append-only en un update disfrazado.

### 3. La escala de `perCriterion` se declara, no se supone (TASK-1734, policy `v1_1`)

`per_criterion_contradictory` disparaba en **11 de 14** items del primer run real — y disparaba
justo en las respuestas **BUENAS**. El scorer devolvía **aportes ponderados que SUMAN el score
global** (91 = 18+25+25+23, la escala que la rúbrica del banco declara en su propio texto) y el
router los comparaba contra su **PROMEDIO**. Con 4 criterios de 25 puntos, un 91 sano tiene promedio
22,75 → delta 68 ≫ 25 → contradicción falsa **por construcción**: cuanto mejor la respuesta, más
contradictoria se veía. Efecto: `batch_eligible` muerto y el operador revisando todo a mano — el
subsistema perdía su razón de ser.

La causa no fue un `mean` mal tipeado: fue un **contrato implícito**. El prompt v1 pedía "el puntaje
por criterio" y el schema declaraba 0–100 por criterio; _aporte ponderado_ y _nota independiente_
eran lecturas igual de válidas, y el modelo alternaba entre ambas según la calidad de la respuesta.

- **Contrato**: escala declarada `weighted_contribution` (`weight` + `score` ≤ `weight`); el schema
  exige `weight` y el sanitizer normaliza y acota el drift de escala propia.
- **Prompt**: pide la escala explícitamente (`...scoring.v2`; las proposals v1 quedan stale).
- **`summarizeCriterionContribution`**: única traducción aportes → score global implicado.
- **Router**: compara contra el implicado, bajo policy `...risk_policy.v1_1`.
- **Workbench**: el aporte se lee **sobre su peso** (`18 / 25`), no como nota suelta.

Replay de los 14 proposals reales: **11/14 → 2/14**, y las 2 restantes son contradicciones reales
del modelo (global 21 con aportes que implican 65).

**Invariante para agentes:** **NUNCA** dejar que un consumer infiera la escala de un valor devuelto
por un LLM. La escala se **declara en el contrato** (nombre del modo + `weight`), se valida en el
schema y se traduce en UN solo helper. Un prompt ambiguo produce un dato ambiguo, y el modelo
alterna entre lecturas sin avisar.

### 4. Instrumento del gold set y su hallazgo de volumen (TASK-1734)

El gate de promoción sigue **bloqueante**, pero ya no por falta de instrumento: `pnpm
hiring:ai:gold-set-sample` entrega muestreo estratificado por competencia × banda sobre respuestas
reales anonimizadas (semilla determinística, casos difíciles incluidos, **estratos incompletos
declarados sin rellenar**), la rúbrica de anclaje conductual BARS derivada del banco real y el
protocolo de rating en ciego con sus 3 rutas y su alcance honesto. El gate es consciente de ruta.

**Hallazgo del muestreo real:** la DB tiene **11 respuestas humanas calificadas contra un piso de
49**. La ruta A (doble rating independiente + adjudicación) **no es ejecutable hoy por falta de
DATOS, no de personas**. El carril uno-a-uno es el modo correcto ahora mismo y es precisamente lo
que genera esa materia prima.

**Invariante para agentes:** **NINGÚN** rating humano puede ser generado por un agente. El
instrumento se entrega **vacío**. Y **NUNCA** describir el gold set como "pendiente de personas"
cuando está pendiente de **volumen**: son bloqueos distintos con planes de acción distintos.

### 5. El frame real como evidencia (TASK-1738)

Correr GVC sobre un run **REAL** con `claude-sonnet-5` destapó lo que ningún test verde atrapó:
`manifestSummary` renderizaba `{a}/{a}` y por lo tanto **decía siempre 100%** mientras los gates
debajo decían "faltan 10" — exactamente el bug class que esa superficie existe para impedir —,
`warning.main` como texto daba 1,74:1 en las dos frases más load-bearing, la cobertura honesta se
iba con el scroll y `sx={{ ms: 1 }}` no aplicaba margen alguno porque `ms` no existe en MUI.

**Invariante para agentes:** una superficie cuyo propósito es **no mentir sobre cobertura** debe
verificarse mirando el frame real con datos reales. Los tests verdes no vieron ninguno de estos
cinco defectos.

Funcional `docs/documentation/hr/expediente-de-evaluacion.md` +
`docs/documentation/hr/scoring-ia-de-assessments.md` + `docs/documentation/hr/gold-set-rubrica-de-anclaje.md` ·
manual `docs/manual-de-uso/hr/operar-expediente-de-evaluacion.md` +
`docs/manual-de-uso/hr/operar-scoring-ia-assessments.md` +
`docs/manual-de-uso/hr/calificar-gold-set-de-referencia.md`.

## Delta 2026-08-17 (2) — Seniority público canónico y separado de assessments (TASK-1741)

- **Status:** `Accepted` · **Owner:** Talent/Hiring · **Scope:** `hiring_opening.public_seniority`,
  publicación canónica, AI vacancy copy y Careers · **Reversibility:** `two-way` · **Confidence:** `high`
  · **Validated as of:** `2026-08-17`.
- **Decisión:** el seniority candidate-facing usa exactamente `Junior`, `Semi-senior`, `Senior` o
  `Lead`. El nivel interno de assessment (`L1/L2/L3`) permanece en `hiring_opening.seniority` y en
  templates; nunca cruza a `public_seniority`. `Intermedio` queda reservado para proficiency de una
  habilidad, no para el nivel del rol. Si `public_title` declara explícitamente un nivel, debe coincidir.
- **Enforcement:** `src/lib/hiring/public-seniority.ts` es la regla browser/server-safe; selector humano,
  JSON Schema + sanitizer de IA, `updateHiringOpening`, `publishOpening`, readers públicos fail-closed y
  CHECK `hiring_opening_public_seniority_check` la consumen o espejan. La migración gobernada calibra los
  valores legacy conocidos `L2` e `Intermedio` a `Semi-senior` y aborta ante cualquier valor desconocido.
- **Alternativas rechazadas:** mostrar texto libre (permitió el leak `L2`); traducir en el renderer
  (oculta corrupción y deja API/schema divergentes); reutilizar el nivel de assessment (mezcla una rúbrica
  interna con lenguaje de mercado).
- **Consecuencia:** una vacante inválida falla en escritura/publicación y una fila corrupta no aparece ni
  acepta postulaciones por el reader público. El renderer conserva el valor exacto, sin reinterpretarlo.
- **Revisit when:** Efeonce necesite un nivel público adicional sustentado por arquitectura de carrera y
  benchmarking; debe agregarse de forma atómica a contrato, UI, IA, CHECK, docs y migración.

## Delta 2026-08-17 (3) — Arquitectura editorial canónica de vacantes v2 (TASK-1740/1741)

- **Status:** `Accepted` · **Owner:** Talent/Hiring + Public Careers · **Scope:** contenido público,
  publicación, renderer y JobPosting · **Reversibility:** `two-way` para renderer, `expand-only` para writes
  · **Confidence:** `high` · **Validated as of:** `2026-08-17`.
- **Decisión:** todas las vacantes nuevas usan la misma arquitectura de información mediante
  `PublicOpeningContent.version=2`. El contrato exige promesa, misión, 3–5 outcomes, 4–8 work items,
  essentials, evidencia, modelo de trabajo, colaboración y proceso. Puede añadir máximo tres secciones
  tipadas (`narrative|bullets|milestones`) después del trabajo. Contexto corporativo y beneficios globales
  se resuelven desde `standard-content.ts`; el opening guarda sólo adiciones del rol.
- **Enforcement:** el parser acepta sólo v2 en writes; `publishOpening` exige v2 completo y países ISO en
  remoto; el vacancy publication operator deriva las proyecciones legacy; renderer y JobPosting consumen
  la misma evidencia resuelta. V1 es read-only y conserva fallback por sección para filas publicadas.
- **Alternativas rechazadas:** plantilla libre por vacante (drift y regresión visual); bloques HTML/CTA
  arbitrarios (superficie insegura e imposible de comparar); duplicar beneficios y texto corporativo en
  cada opening (desactualización); mantener v2 y prosa como dos superficies editables (claims divergentes).
- **Consecuencia:** la complejidad del rol cambia el contenido y hasta tres bloques de profundidad, no la
  arquitectura ni los CTA. Un humano o agente recibe 422 antes de publicar una vacante incompleta.
- **Revisit when:** datos reales demuestren que tres bloques o los tres formatos no cubren una familia de
  roles; el cambio debe versionar el contrato y preservar paridad HTML/JobPosting.

## Delta 2026-08-18 — Careers público en producción (TASK-1740/1741 released)

- **Status:** `Accepted` · **Owner:** Talent/Hiring + Public Careers · **Scope:** rollout, publishability,
  guardrails · **Reversibility:** `two-way` (flags) · **Confidence:** `high` · **Validated as of:**
  `2026-08-18`.
- **Release y evidencia:** el manifest `fa54670470c1` quedó en estado `released` (run `32127499151`,
  watchdog OK 4/4 workers) y promovió TASK-1740 + TASK-1741 junto al batch acumulado de EPIC-011. Cinco
  flags quedaron ON en Production, incluidos `CAREERS_DETAIL_EDITORIAL_V2_ENABLED` y
  `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED`. El JSON-LD emitido por las vacantes vivas (`EO-OPN-0009`,
  `EO-OPN-0061`, ambas autoradas en v2 completo) pasó `validator.schema.org` con **0 errores y 0
  advertencias**. El interlock se mantiene: el schema no se emite con el renderer OFF.
- **Grandfathering de publicación (`requiresEditorialV2ForPublish`):** el contrato v2 se exige sólo en la
  **primera** publicación de una vacante (`published_at IS NULL`). Exigirlo también al republicar convertiría
  una regla de autoría en una interrupción de servicio: una vacante viva con postulantes en proceso que se
  pausa por cualquier motivo quedaría en 404 hasta reescribir su bloque completo. `published_at` es la señal
  honesta de "ya estuvo al aire" — sólo la escribe el publish, así que una vacante nueva no puede saltarse v2
  por esta vía. Alternativa rechazada: un flag de excepción por vacante (crea una puerta trasera permanente
  al contrato y depende de que alguien recuerde cerrarla).
- **Guardrail de paridad JSON-LD↔HTML (`careers-schema-visible-parity.test.tsx`):** la paridad se verifica
  contra el **DOM renderizado**, no contra el view-model ni el builder. Un test que compara dos derivaciones
  del mismo objeto pasa aunque el renderer nunca haya pintado el hecho; sólo el DOM prueba que lo que Google
  lee está efectivamente visible para la persona. Es la defensa contra el bug class de "schema que promete lo
  que la página no muestra".
- **Observabilidad de la degradación v2:** un `public_content_json` ilegible ya no se traga en silencio —
  `normalize` emite `captureWithDomain(error, 'hiring', …)` con la versión declarada y el motivo (sin PII ni
  payload: el contenido público puede traer copy aprobado, y un log no es el lugar para volcarlo) antes de
  degradar al fallback de prosa legacy. La degradación sigue siendo el comportamiento correcto; lo que cambia
  es que ahora es observable en vez de invisible.

## Delta 2026-08-18 — Procedencia de datos (TASK-1739)

El dominio incorpora `data_origin` (`real|synthetic_seed|smoke_test|demo`) como **hecho declarado en
el nacimiento del dato**, ortogonal a `source` (canal de llegada). Dos raíces —`identity_profiles`
(persona) y `talent_demand`/`hiring_opening` (demanda)— más una copia derivada por trigger en
`hiring_application`, que es donde el desk filtra.

Invariantes duros:

- **`real` es el default y no se discute.** Omitir la declaración deja el dato visible; el default
  inverso ocultaría un candidato real en silencio.
- **La postulación no elige su procedencia**: la deriva un trigger desde sus dos raíces y gana el
  no-real. Entre dos no-real distintas gana la **más protectora**, para que una fila derivada nunca
  quede sujeta a una purga más agresiva que la de sus raíces.
- **Marcar una raíz obliga a propagar** en la misma transacción: el trigger no dispara si nadie toca
  la fila dependiente, así que sin propagación la copia queda obsoleta en el 100 % de los marcados.
  Detector: señal `hiring.data_quality.data_origin_derivation_drift` (steady 0).
- **Una vacante no-real NUNCA se publica** (`publishOpening`, 422). Es la pieza preventiva: ocho
  vacantes de smoke llegaron a estar publicadas en el careers real.
- **El gold set excluye sintéticos sin flag ni opt-in.** Es evidencia de un gate de promoción. Al
  auditar la base ya existía una respuesta `smoke_test` con `human_score`, elegible para la muestra.
- **La retención y el compliance son CIEGOS a la procedencia**, y la procedencia **nunca gatea
  comunicaciones** (eso lo decide el consentimiento).
- **Nunca se marca sintética a una persona con vida laboral** (members, contractor, finiquito,
  relación legal): tocaría payroll.
- **Purga archive-first.** `hiring_assessment` cascadea desde la postulación, así que un DELETE
  destruiría respuestas calificadas por humanos. El lane de borrado exige cero dependientes sobre los
  **diez** verificados contra PG y aborta la corrida completa si una fila no califica.

#### Delta 2026-08-22 (`TASK-1748`) — archivar tiene eje propio, y el filtro llegó al Banco de Talento

- **Archivar NUNCA escribe `stage`.** `archiveSyntheticRecords` escribe `hiring_application.archived_at`
  (`candidate_facet.status='archived'`, `hiring_opening.status='cancelled'` en las otras dos entidades),
  y la guarda de idempotencia lee ese eje. La versión anterior archivaba con `stage='closed'`, y ese
  `UPDATE` es el origen de las 32 filas `closed` sin desenlace de la auditoría del vocabulario.
- **El archivado cubre las TRES entidades**, cada una sobre allowlist explícita: omitir la lista no
  escribe nada. `closed`/`filled` de una vacante NO se reescriben — son desenlaces declarados. Una
  vacante que se cancela cierra también su `publication_status`.
- **El Banco de Talento filtra por procedencia**, y el predicado viaja por JOIN a `identity_profiles`:
  `candidate_facet` **no tiene** `data_origin` propio, lo hereda de la persona.
- **La projection del Banco de Talento NO gatea su filtro por el flag**, a propósito:
  `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` es Vercel-only y `reconcileTalentPoolProjection` corre en el
  `ops-worker` de Cloud Run, donde lo leería `undefined`, o sea OFF en silencio.
- **Se filtran los caminos que CREAN; el que CORRIGE converge.** El `UPDATE` de ciclo de vida incluye a
  las membresías sintéticas y las reclasifica a un estado no servible en vez de excluirlas: excluirlas
  las congelaba en el estado que tuvieran, y una congelada en `pool_eligible` habría quedado visible
  sin que ninguna corrida pudiera corregirla.
- **La señal `hiring.talent_pool.integrity` cuenta sólo población real** en
  `facets_without_membership`: desde que la projection no proyecta sintéticos a propósito, una ficha
  sintética sin membresía dejó de ser un atraso. Los contadores de consentimiento y retiro **no** se
  filtran — la procedencia gobierna la visibilidad, jamás el consentimiento.

#### Delta 2026-08-23 — la procedencia se declara al NACER, y hay un caso donde `real` es obligatorio

- **El guardrail mira donde el dato NACE.** `hiring-data-origin-gate` barría `scripts/` y
  `tests/e2e/`, pero no los `*.live.test.ts` de `src/**` — que fabrican datos contra la MISMA
  instancia que comparten dev, staging y producción. Ahí se coló el defecto que el gate existe para
  impedir: **19 sitios en 10 archivos** creaban demanda o vacante sin declarar `dataOrigin`, o sea
  naciendo `real`. Mientras el teardown alcanza a correr no se nota; cuando muere a mitad —se cae el
  proxy, se aborta la corrida— lo que queda es indistinguible de un candidato o un cargo de verdad,
  y **ninguna señal posterior recupera la procedencia con certeza**.
- **El gate exige que la procedencia esté DECLARADA, no un valor concreto.** Es deliberado: lo que se
  persigue es el *default silencioso*, no el valor. Un `real` escrito a mano con su motivo al lado es
  información; el default es la ausencia de información.
- 🔴 **Ejercitar la publicación EXIGE fabricar una vacante genuinamente `real`.** No es descuido de
  los tests: `publishOpening` rechaza toda vacante no-real (422), y esa guarda **no es negociable**
  —una vacante de smoke publicada que atrape a un candidato externo lo deja **pinneado por FK**,
  porque la evidencia de identidad es append-only y no se deshace—. Consecuencia: los tests de
  publicación (`store`, `candidate-intake/canary`, `public-careers/submit-application`) y
  `data-origin/mark` —que siembra real a propósito, porque su objeto de prueba es marcarlo— declaran
  `dataOrigin: 'real'` **explícito y con su razón escrita**. **NUNCA** "corregirlos" a `smoke_test`:
  rompe lo que prueban.
- ⚠️ **Hueco conocido, sin dueño:** el único rastro que separa esas vacantes reales-por-necesidad de
  una vacante de verdad es la **convención de autor** (`user-live-test`), que el detector usa como
  señal alta. Es una convención **sin enforcement**: si alguien cambia el autor, el rastro se pierde
  y esas filas quedan indistinguibles. Merece ser una condición verificable —gate o columna—, no un
  acuerdo.
- **Al escribir un `*.live.test.ts` de este dominio, nunca compares un `COUNT(*)` global entre dos
  instantes.** Los archivos corren EN PARALELO contra una sola base: un total global lo mueve el
  archivo vecino haciendo lo correcto, y el gate falla por el trabajo ajeno. Compara **ids** o relee
  las MISMAS filas. Corregido así en `dead-end-supersede.live.test.ts` y en `mark.live.test.ts`.

Flag `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` (Vercel-only, default OFF) gatea sólo el filtro de desk y
talent pool. Docs: funcional `docs/documentation/hr/procedencia-de-datos-hiring.md`; manual
`docs/manual-de-uso/hr/operar-procedencia-de-datos-hiring.md`.

## Delta 2026-08-26 — TASK-1773: el eje de desenlace gana carril gobernado (`code complete, rollout pendiente`)

Cerrar una postulación se podía operar **sólo desde el portal**: ni `api/platform/app/**`, ni MCP, ni
Nexa. Violación directa de Full API Parity, y el agravante es que ninguna de las cuatro tasks del eje
de desenlace (`TASK-1748`, `TASK-1754`, `TASK-1762`, `TASK-1765`) lo declaró como pendiente — tampoco
la auditoría que las revisó. Esta task federa la decisión **INDIVIDUAL** y deja un guard para que la
omisión no pueda repetirse en silencio.

Código: `src/lib/hiring/decision-parity.ts` (propose/confirm + lectura del desenlace),
`src/lib/api-platform/resources/app-hiring-application-decision.ts` (adaptador del lane `app`),
`src/lib/nexa/actions/hiring-decision.ts` (acción gobernada),
`src/lib/hiring/capability-parity-manifest.ts` (guard de parity). Rutas del lane `app`:
`GET …/hiring/applications/{applicationId}/outcome`, `POST …/decision/propose`, `POST …/decision/confirm`.

### El lane es un ADAPTADOR, no una segunda implementación

- **Ninguna regla de decisión se reimplementa fuera de `decideHiringApplication`.** Causa obligatoria en
  `not_selected` y prohibida en los otros cinco, destino de etapa, idempotencia, historial append-only,
  evento y elección del tipo de correo siguen viviendo en el command, y ahí se quedan. El recurso del
  lane valida transporte y autorización, traduce el error de dominio y delega; la acción de Nexa hace lo
  mismo. **NUNCA** agregar a un adaptador una regla de negocio que la UI no tendría: si un consumer la
  necesita, va al command, donde la comparten todos.
- Autorización del lane: `tenantType === 'efeonce_internal'` **más** la capability real
  `hiring.application.decide` (`read` para la lectura, `execute` para propose/confirm). No una capability
  paralela «de agente».

### La propuesta es EFÍMERA, no una entidad — `Migration: none`

- El guard es un **digest del estado actual** (`hdp-<sha256:24>` sobre `applicationId | stage | decision |
  decisionCause | archivedAt | desenlace propuesto | causa propuesta`) que `propose` calcula y `confirm`
  **recalcula contra el estado de AHORA**. Si alguien decidió, archivó o movió la postulación entre medio,
  las huellas no coinciden y la confirmación falla con **409 `hiring_decision_proposal_stale`**.
- 🔴 **NUNCA crear una tabla de propuestas de decisión.** El contraste con el Banco de Talento es
  deliberado: allá la invitación se persiste (`talent_pool_invitation`) porque **una invitación ES una
  entidad con ciclo de vida propio** —se envía, se acepta, caduca, se audita—. Una propuesta de decisión
  no lo es: **nace y muere dentro de un gesto humano**. Persistirla agregaría una tabla que habría que
  limpiar y un estado que puede quedar huérfano, a cambio de nada.
- La revalidación va **antes** de la escritura y **fuera** de la transacción del command: si el estado
  cambió, se falla sin abrir transacción. El `FOR UPDATE` y el replay por `idempotencyKey` del command
  siguen cubriendo la carrera fina donde siempre estuvieron.
- El código de error **no se aplana a `bad_request`**: se agregó `hiring_decision_proposal_stale` al enum
  `ApiPlatformErrorCode` para que el consumer distinga «tu payload está mal» de «el mundo cambió, vuelve
  a proponer».

### Nexa tiene autoridad MÁS ANGOSTA que el portal

- 🔴 **Nexa sólo cierra una postulación ABIERTA; re-decidir una cerrada es humano.** El prólogo
  compartido por `buildPreview` y `execute` propone y bloquea con `NexaActionBlockedError` + deep link al
  Hiring Desk cuando `alreadyClosed`.
- **El motivo es mecánico, no filosófico**, y conviene registrarlo porque explica por qué NO se resolvió
  de otra forma: el contrato compartido de acciones de Nexa (`NexaActionPreviewResult` =
  `{title, summary, metrics}`) **no puede cargar estado del preview al execute**, así que la huella no
  sobrevive el viaje. Sin ella, una confirmación tardía podría pisar en silencio una decisión que otra
  persona tomó entre medio — y el command permite re-decidir a propósito, porque un humano puede cambiar
  de opinión.
- **Se acotó la autoridad del agente en vez de debilitar el guard o de tocar el contrato compartido**,
  que cargan otras seis acciones. El `execute` **RE-PROPONE en el punto de mutación**: si alguien decidió
  entre el preview y el confirm, `alreadyClosed` bloquea ahí. Mismo resultado que habría dado la huella,
  sin ensanchar la superficie. **NUNCA** «arreglar» esto ensanchando `NexaActionPreviewResult` para un
  solo consumer.
- Ventana corta a propósito (`expirationSeconds: 300`), `sensitivity: 'high'`, capability real
  `hiring.application.decide` y `tenantType === 'efeonce_internal'`.

### Confirmar es fail-closed para agentes delegados

- 🔴 **`confirm` rechaza `authSource === 'sister_platform_oauth'` con 403.** Un token delegado puede
  **leer** el desenlace y **proponer** una decisión; **confirmar exige sesión humana**.
- No es una omisión: **`efeonce.mcp.hiring.write` no existe en código**. Está propuesto en
  `TASK-1720`/`TASK-1722` como clase de blast-radius. El grant revocable por organización y por persona ya
  existe (`greenhouse_core.external_capability_grants`, `TASK-1631`, 2026-09-04); el scope sigue bloqueado hasta
  que el emisor propio y el gateway multi-issuer lo porten en un token (EPIC-044: `TASK-1829`/`TASK-1831`/
  `TASK-1832`) (actualizado 2026-09-04, TASK-1631). Es el mismo reparto que rige en el resto de Hiring: el agente propone y lee, el
  humano confirma. **NUNCA** cablear un scope de escritura delegado a este carril antes de ese token con grant.

### El manifiesto de parity vuelve obligatoria la pregunta

- `src/lib/hiring/capability-parity-manifest.ts` obliga a que **toda capability `hiring.*` que el código
  chequee con `can()`** aparezca declarada como `federated` (con `evidence` = ruta del lane `app`, que el
  test verifica que **exista**), `deliberately-internal` (con razón) o `pending` (con razón). El test
  barre el código y rompe si hay una sin declarar, si una `federated` apunta a una ruta inexistente, si
  una no-federada calla su razón, o si el manifiesto acumula entradas muertas.
- **No declara si algo DEBE federarse**: declara que alguien lo pensó y dejó escrito el porqué. Un
  `deliberately-internal` honesto vale tanto como un `federated`; **lo inaceptable es el silencio**, que
  es exactamente como nació este hueco.
- ⚠️ **NUNCA meter un scope OAuth delegado en ese manifiesto.** `hiring.candidate.review.read` NO va ahí:
  es un scope que se verifica con `oauthCapabilities.includes(...)`, no una capability de `can()`. **Son
  dos planos de autorización distintos** y mezclarlos es el error que el propio guard destapó al
  escribirse. La ruta de review ya queda cubierta por `hiring.application.read`.
- **NUNCA** agregar una capability de hiring sin declarar su parity en el mismo PR — el test rompe, y
  esa es la intención.

### Lo que esta task NO federa

- 🔴 **El cierre MASIVO por capacidad sigue sin federarse** (`TASK-1762`, resuelto 2026-08-23). Su gate es
  una confirmación humana contra un digest fresco, y bajo el AI Act la selección es alto riesgo con
  supervisión obligatoria. El carril gobernado de la cohorte expone `preview` y `status` — **lecturas**:
  un agente puede explicar a cuántas personas tocaría un cierre y cómo va uno en vuelo, **jamás
  dispararlo**. Esta task cubre la decisión **individual**, que conserva su propio contrato.
- Las capabilities marcadas `pending` en el manifiesto **no tienen carril** y así está declarado; no
  asumir que existe uno por analogía con éstas.

### Estado — `code complete, rollout pendiente`

`NEXA_HIRING_ACTIONS_ENABLED` **nace OFF en todos los environments** (runtime lector: **Vercel
únicamente**, `src/lib/nexa/flags.ts`; fila registrada en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)
y depende además del master `NEXA_ACTION_RUNTIME_ENABLED`. Prender exige sign-off: bajo el AI Act la
selección es alto riesgo con supervisión humana obligatoria. **Falta evidencia de runtime contra
staging** — el lane `app` y la acción de Nexa están cubiertos por tests, no por un ejercicio real contra
el deployment activo. **NUNCA** presentar este carril como operativo.
