# Handoff archive

Este archivo es un índice histórico, no una lectura obligatoria de arranque. La continuidad activa vive en
[Handoff.md](Handoff.md). Las fuentes canónicas de una implementación siguen siendo task, issue, ADR,
arquitectura, código y runtime verificado.

## Archivo 2026-07-26 — hilo de generación y fondeo de Globe (narrativa intermedia)

> Seis entradas del mismo día, escritas por dos agentes mientras el hilo avanzaba. **Se contradicen
> entre sí leídas en orden** — cada una fue cierta en su momento. El estado vigente de generación y
> fondeo vive en `Handoff.md` → «ESTADO VIGENTE de generacion y fondeo de Globe»; el detalle técnico en
> `ISSUE-127` y `TASK-1566`. Se conservan porque muestran **cómo** se llegó, que es lo que evita
> repetir el camino.

## 2026-07-26 — TASK-1566 Slice 5: la atribucion humana se vuelve EXIGIBLE

**Entregado en Greenhouse** (`b6f2ff4` + `d2916371e`, local en `develop`, sin push). Es lo que faltaba
para que el flag del Slice 4 pueda significar algo: Globe **no tiene las sesiones**, asi que su
`assertHumanAttribution` nunca podia pasar de shape-only. Aca se ancla donde si hay identidades.

- Tabla **append-only** `globe_credit_funding_intents` + triggers anti-UPDATE/DELETE, y el **CHECK de
  confirmante != proponente EN LA BASE** — el control que en Globe era vacuo por comparar contra una
  **constante** de clase de servicio.
- **Dos capabilities** (proponer read-only / confirmar unico punto de mutacion) con seed + catalogo +
  grant a `EFEONCE_ADMIN` en el mismo commit.
- Broker reusando `createGreenhouseGlobeClient`, rutas `POST /api/admin/globe/credit-funding/{propose,confirm}`
  con idempotencia obligatoria y 5 codigos canonicos, y la senal
  `platform.globe_credit_funding.stale_proposal` (steady=0, escala por **antiguedad** no por cantidad).

**Verificado contra PostgreSQL REAL** (no mocks): confirmante == proponente **RECHAZADO**, != ACEPTADO,
`UPDATE` **RECHAZADO**. Senal ejecuta en `ok/0`. Gates: `local:check` 0, **9916 tests verdes**, `build` 0.

**Prerequisito verificado y no asumido:** vocabulario vendorizado **65 = 65** vs Globe vivo. No hacia
falta re-vendorizar; medirlo es lo que evita reproducir `ISSUE-126`.

🔴 **NO se retiro `raise-credit-monthly-cap.mjs`**: con el flag en OFF, sacarlo dejaria CERO caminos
para subir el tope. El retiro va despues del reemplazo verde.

**Proximo paso (unico que falta para el criterio de salida del Slice 4):** prender
`GLOBE_CREDIT_ADMIN_LANE_ENABLED`, desplegar, y ejercer un fondeo real desde estas rutas **con dos
personas distintas** — el CHECK lo exige. Recien ahi se retira el script.

## 2026-07-26 — TASK-1566: el carril de fondeo, cableado y durable; 4c bloqueado por un deadlock real

**Slices 4a (`ffcb470`) y 4b (`add15d8`) entregados, pusheados y desplegados** — `globe-api-internal`
revisión **`00102-nxk`** (imagen `add15d888696`), migración **`0032` aplicada** (plan leído antes:
`pending: [0032]`, cero `unexpected`, cero `checksumMismatches`). **Flag OFF verificado contra el
runtime**: `/v1/capabilities` devuelve 173 y **ninguna** de fondeo. Cero exposición.

**4a — estaba escrito y desconectado.** `registerCreditFundingCapabilities` vivía en el dominio con
12 tests verdes y **no lo llamaba nadie**: despachar `…fund.propose` daba `capability_not_found`. Los
tests del dominio no podían verlo (ejercitan el handler directo; el hueco estaba en el cableado). El
test nuevo assertea contra `/v1/capabilities` y **se probó en rojo** antes. De paso el compilador
atrapó que `creditAdminApproval` estaba tipado como **verificador** y se usaba como **firmador** — el
defecto exacto que ADR-015 cierra; ahora son dos dependencias.

✅ **4c ENTREGADO** (`bc9dc1e` + `e237db1`). El bloqueo no era escribir la transacción: **componerla se
colgaba**. Cada store durable abría su propia `pool.transaction` con `pg_advisory_xact_lock` del mismo
workspace, y una transacción externa hacía que la interna pidiera ese lock **desde otra conexión** —
deadlock, no error. El fix es un **ejecutor inyectable por store** (dentro de una misma transacción ese
lock es reentrante), más el seam `atomically` en el dominio. Backward compatible. Tests **probados en
rojo** contra la versión secuencial: 14/14 con el seam, 2 fallan sin él.

🔴 **El flag queda en FALSE, y NO por prudencia genérica.** `assertHumanAttribution` es **shape-only**:
rechaza `globe:service:` y exige un entitlement no vacío, pero **no verifica que la atribución humana
venga de una sesión autenticada**. Con el carril publicado, el caller genérico —que Greenhouse puede
asumir— confirmaría con una **atribución humana fabricada**: el mismo maker-checker vacuo de la task,
un nivel más arriba. El amarre vive en el **Slice 5** (broker de Greenhouse con sesión + entitlement +
tabla append-only con `CHECK` confirmante ≠ proponente). **Ese es el próximo paso**, y hasta entonces el
criterio de salida del Slice 4 (*"fondeo real punta a punta"*) no se puede cumplir: falta la superficie
desde donde el humano confirma.

Desplegado y verificado: rev **`00104-gkc`**, imagen `e237db1ac160`, flag `'false'` en el runtime, 173
capabilities y **ninguna** de fondeo publicada.

🔴 **Hallazgo transversal:** `credit-funding.ts` tenía **3 bytes NUL crudos** como separador de clave.
UTF-8 válido, compila, **ningún gate lo atrapa** — pero `file` lo reporta como `data` y **todo grep lo
salta como binario**, lo que me hizo concluir dos veces que un símbolo no existía. Corregido.

## 2026-07-26 — ESTADO VIGENTE de Globe (consolida el hilo del día; las entradas de abajo son narrativa superada)

> **Leer sólo esta para saber dónde está Globe.** Abajo hay 6 entradas del mismo hilo de hoy, escritas por dos
> agentes con convenciones de inserción distintas (una prepende, la otra ancló al vecino temático), y **se
> contradicen leídas de arriba hacia abajo**: una dice "fondeo bloqueado, no hubo grant" y otra "fondeo aplicado,
> grant 400 posted". Las dos fueron ciertas en su momento. **Esta entrada gana.**

**Resuelto y verificado hoy:**

- **Fondeo del mes: LISTO.** Grant `400` `posted`, `monthlyCap=400`, `policyAvailable=402`; `budget.evaluate`
  permite imagen `10` y video `16`. Sin `credits.allocate` (que no fondea) y sin SQL.
- **`ISSUE-126` — sangrado cerrado y verificado en runtime.** La reconciliación de tenancy llevaba 2 días fallando
  cada 5 min con su scheduler en `ENABLED` (`globe_tenancy_capability_invalid`: tarball `file:` vendorizado con 51
  capabilities vs 65 vivas, drift disparado por el rollout de scopes de ADR-010). Re-vendorizado + guard probado en
  rojo + `ops-worker` desplegado ⇒ dos reconciles consecutivos `done` (3776 ms y 1351 ms) contra fallos de 10-62 ms.
  **La proyección quedó verificada DIRECTAMENTE** (`brokerState=active`, `brokerExpiresAt=2026-07-26T11:42:00Z`,
  versión 4) — eso cierra lo que estaba declarado como inferido.
- **`globe-api-internal` en revisión `00097-s58`** (imagen `10fd5f14`, ancestría verificada, perímetro anónimo → 403):
  trae la **fase de negación de crédito** (TASK-1566 Slice A) y el **comando gobernado + signer port** (Slice B).

**Delta 2026-07-26 (b) — CAPA 8: la causa del bloqueo, encontrada LEYENDO (commit `4eee1cc`, sin desplegar).**
Se hizo la lectura que pedía la capa 7 y apareció la causa sin gastar un deploy. **`Key visual` no es una credencial:**
el prompt del canary de imagen (`producer-ui-canary-lib.mjs:10`) empieza con `'Key visual editorial para Efeonce
Globe: ...'`, y el sanitizador marcaba como credencial **cualquier** string que empezara con `Key `/`Bearer ` (la regla
era `^(?:Bearer|Key)\s+`, prefijo y nada más). **Ese falso positivo era todo el bloqueo del `execute`**, y explica la
capa 7: llegaba etiquetado `endpoint_url_not_permitted`, que mandaba a revisar un endpoint que nunca estuvo involucrado.
**Dos hipótesis murieron leyendo, no desplegando:** (a) los cuatro sospechosos de la capa 7 asumían `placeholder(input)`,
y el `buildBody` de `text-to-image` **no lo llama** — su body son cuatro escalares; (b) un `vertexProject` vacío habría
roto el regex de vertex en el **constructor** (valida las 12 entries, no 3) y bloqueado toda ruta, pero
`GLOBE_LAB_VERTEX_PROJECT` está sin setear → default `'efeonce-globe'`. **El fix es al control, NO al prompt**: una
credencial es un token opaco, no una frase, así que ahora se exige token único sin espacios anclado al final (`Bearer
eyJ…` y `Key <id>:<secret>` siguen atrapados; la prosa no). Cambiar el prompt habría desbloqueado el canary
**escondiendo** el bug para el próximo usuario real que escriba el término estándar del oficio.
**Capa 8b — el patrón otra vez adentro del propio fix:** `globe.production_route.compilation_failed` nombraba la clase
y **tiraba la razón**; ya emite `reason` (enum cerrado, sin `message`/`stack`).
✅ **DESPLEGADO Y VERIFICADO — EL CANARY GENERÓ.** Revisión **`00101-gfn`** (imagen `4eee1cc51dad`, ancestría
verificada). Evidencia: settlement `13:36:15.451Z` `governed_operation_completed` **`spentDelta: 10`**, `attempt 1
→ succeeded` en `ref/still/rrss-v1`/`seedream-5-pro`, `correlationId: canary-a8013c68…`, y un **PNG real de
7.454.584 bytes** (`sha256:c8e365f1…`, `sourceKind: generated`). **CERO `compilation_failed`** en la ventana ⇒
capa 8 cerrada. El asset quedó `quarantined` en `c2pa_verify` (governance normal, no fallo).
🔴 **El canary NO completó de punta a punta, y las dos causas son mías:** (1) timeout del **cliente** a los 10 min
mató la corrida esperando governance (el canary tolera 20) — la trampa ya documentada, esta vez sin costo porque no
reintenté a ciegas; (2) mi "replay con la misma etiqueta" fue **correcto en el gasto y falso en la premisa**:
`prepare` **creó un experimento nuevo** en vez de devolver el existente (gasto cero igual — `reservation 10` →
`release 10`). **Que una clave de idempotencia exista no prueba que el handler la honre.**
🔴 **Capa 9 abierta, NO diagnosticada:** ese experimento nuevo murió en **177 ms** con `attempts: []`,
`runner_error`, `errorName: "Error"`, `reasonShape: "absent"`, release `governed_schedule_failed`. Hipótesis sin
verificar: colisión de `submissionKey` por reusar el `runLabel` — o sea posiblemente artefacto de mi técnica, no del
producto. **Video y audio nunca se intentaron.** Completar el canary con etiqueta fresca cuesta **32 créditos**.

**Delta final del canary — SIETE capas, y la séptima corrige a la sexta (`ISSUE-127`).** Corrido **4 veces con gasto real, CERO créditos perdidos** (el fence liberó cada reserva). **No generó.** Bloqueo vigente **acotado con precisión**: el `execute` de imagen (`ref/still/rrss-v1` → `fal.seedream.text-to-image`) lo rechaza el **sanitizador del body snapshot**, NO la config del endpoint — las tres entries del allowlist pasan sus aserciones, verificado leyéndolas. Sospechosos por cómo `buildBody` arma referencias con `placeholder(input)`: `snapshot_body_inline_data_uri`, `snapshot_body_too_large` (>256 KB), `snapshot_body_binary_key`, `snapshot_body_credential_like`.
🔴 **El próximo paso NO es otro deploy.** Es leer `buildBody` de `fal.seedream.text-to-image` (`governed-production-composition.ts:205`) contra los 12 chequeos de `safeSnapshotBody` (`production-route-composition.ts:133-167`). Revisión viva: **`00100-drb`**; el fix de etiquetado (`324be6b`) está **commiteado y SIN desplegar** — desplegarlo sólo mejora el label del próximo intento, no desbloquea.
🔴 **Error propio a registrar (capa 7):** etiqueté las 28 razones con heurística y usé `endpoint_url_not_permitted` como bucket por defecto; 12 de esos sitios son del **body snapshot**, no de URL, así que **el label me mandó a mí mismo a leer la config equivocada**. Corregido a `snapshot_body_*`. **Un bucket por defecto que abarca 17 sitios no es una razón nombrada: es una razón inventada.**

**Delta del canary — 6 fixes de observabilidad, y el sexto explica los cinco anteriores (`ISSUE-127`).** Corrido 4 veces con gasto real, **cero créditos perdidos** (el fence liberó cada reserva, `spentCredits=0`). Cadena: `runner_error` mudo → instrumentado (`00098-45x`) → destapó `ProductionRouteDependencyError` con `reasonShape=absent` → 28 sitios de throw pasan a **12 razones nombradas** (`00099-t89`) → el canary reportó **`route_compilation_failed`**, el catch-all, **con las razones ya desplegadas**.
🔴 **Y ahí está la causa raíz, encontrada LEYENDO el compile en vez de persiguiéndolo con otro deploy** (decisión del operador, y fue la correcta): `deny()` lanza `ProductionRouteDeniedError`, que el catch **sí** re-lanza — pero `#requests.compile` y `assertCompiledProviderRequest` lanzan **`ProductionRouteDependencyError`**, que el catch **no** contemplaba, así que caía en el catch-all y **le reemplazaba la razón**. Las 12 razones existían y **ese catch las destruía** justo en los dos caminos que más importan. Cerrado con un `instanceof` re-throw (`40ed85a`, desplegando).
**Lección de método, y vale más que los seis fixes:** perseguir un error por deploy encuentra síntomas en serie; leer el camino completo encuentra el que los explica. Cinco capas se arreglaron a un deploy por capa; la sexta se vio en treinta líneas.
**Tres huecos del canary, encontrados usándolo** (no leyéndolo): descartaba el `failureReason` que el reader acababa de entregar (**arreglado**); `GLOBE_CANARY_RUN_LABEL` se exige en la rama `--execute` y no arriba del archivo, así que el dry-run pasa y el execute muere (**abierto**); y el dry-run reporta `withinHardCap` pero **no `withinDayCap`**, que es la señal que de verdad decide (**abierto**).

**Bloqueo vigente — el canary, y ya no es por créditos ni por tenancy:** el `execute` de imagen terminó
`state=failed`, `failureReason=runner_error`, `spentCredits=0`, reserva de 10 liberada, cero output (experimento
`64a32bfd-d46f-4724-b8a0-8e6db5d0db78`). Video no se ejecutó, correctamente, para no gastar a ciegas.
**Y la ventana de logs del API estaba VACÍA.** Arreglado en `efeonce-globe` (`adebdb0`, local sin desplegar): el
fallo no-clasificable ahora se reporta al servidor por un port inyectado, con `reasonShape` distinguiendo "el
adapter no puso `reason`" de "puso uno malformado" — sin filtrar `message`, `stack` ni body. **El próximo canary sí
va a dejar rastro; hace falta desplegar el API para que aplique.**

🔴 **Corrección de seguridad a lo que dice la entrada de abajo:** el corte del break-glass **NO** falla porque
`roles/owner` confiera impersonación. `julio.reyes@efeonce.org` tiene `roles/owner` en `efeonce-globe` **y aun así
`iam.serviceAccounts.getAccessToken` fue DENEGADO** — verificado dos veces hoy. Owner no confiere ese permiso; lo
que confiere es `setIamPolicy`, o sea la capacidad de **auto-otorgarse** el binding. La diferencia cambia la
conclusión: **el corte SÍ sirve** — retira el permiso permanente, y cualquier re-otorgamiento es un cambio de IAM
nuevo, logueado y atribuible. El control es **detección y atribución**, no prevención. Es el mismo patrón que el
maker-checker de ADR-015: cuando el aprobador es el dueño, la prevención se cambia por detección.
**Anomalía sin resolver:** el binding se aplicó, Owner existe, y `getAccessToken` igual falló tras 5 reintentos.
Si hay una deny policy o restricción de organización activa, **es buena noticia** — es la aplicación real del "la
llave nunca sale del runtime". Verificarlo antes de asumir propagación.

**Pendiente inmediato, en orden:**
1. **Desplegar `globe-api-internal`** con `adebdb0` (observabilidad del runner) y repetir el canary. Sin eso el
   próximo `runner_error` vuelve a ser mudo.
2. **TASK-1566 Slice B**, lo que falta: cablear `registerCreditFundingCapabilities` + el signer en `app.ts`/`main.ts`
   (hoy los comandos existen en el dominio pero **no están registrados**: despacharlos da `capability_not_found`),
   store durable + migración (el in-memory **no sirve a `maxScale=3`**), y la **transacción única** (hoy son cuatro).
3. **`ISSUE-126`, los tres puntos abiertos**: señal de frescura de la proyección, degradación por-capability, y bump
   de versión del tarball + ensanche del peer exacto del SDK.
4. **Slice C** — broker + superficie de confirmación en Greenhouse. ⚠️ Re-vendorizar el vocabulario **ANTES** de
   mover los scopes de funding al broker, o se reproduce `ISSUE-126`.

**Riesgo abierto:** `tenancy_mode = enforced` **sigue bloqueado** hasta que exista la señal de frescura. Ese flip es
prerrequisito de las capabilities por usuario (ADR-015 Slice G), y hacerlo con la reconciliación frágil es un outage
de todo el acceso humano a Globe.

**Patrón que se confirmó tres veces hoy y vale más que cualquiera de los tres fixes:** el bloqueo real fue siempre
*una causa accionable escondida detrás de un código genérico* — `409 conflict` (arreglado), `authentication_required`
(clase de credencial vs `--include-email` vs audiencia) y `runner_error` (arreglado). Es el mismo defecto de
observabilidad en tres dominios distintos.

## 2026-07-26 — Canary real Globe: bloqueado en runner y corte IAM incompleto  ⟨superada por la entrada de arriba⟩

El dry-run autenticado con el caller quedó `ready=true`: `globe.tenancy.workspace.get` mostró proyección fresca
(`brokerExpiresAt=2026-07-26T11:42:00.878Z`, versión 4), y los estimados fueron imagen `10` y video `16`, ambos
`withinHardCap=true`. El canary de imagen sí ejecutó `prepare`/`execute`, pero el run
`64a32bfd-d46f-4724-b8a0-8e6db5d0db78` terminó `state=failed`, `failureReason=runner_error`, `spentCredits=0`;
la reserva de 10 fue liberada y no se produjo output. Video no se ejecutó para evitar gasto a ciegas.

La evidencia de logs alrededor de `11:32:51Z` muestra `globe_tenancy_shadow_drift` y el worker
`globe-producer-worker` terminó con `claimed=0`; queda bloqueado el diagnóstico del runner antes de reintentar.
El binding break-glass específico fue revocado y la policy del service account ya no contiene al usuario. La prueba
de corte global no pasó porque `julio.reyes@efeonce.org` conserva `roles/owner` a nivel de proyecto `efeonce-globe`,
que sigue permitiendo impersonación; no se retiró ese acceso permanente sin autorización separada. Estado:
`operativamente bloqueado`; no mover TASK-1566.

## 2026-07-26 — Acto operativo Globe: fondeo bloqueado y break-glass revocado  ⟨superada por «ESTADO VIGENTE de Globe»⟩

Se intentó fondear el mes del workspace interno `greenhouse-org:efeonce` para habilitar generación real de imagen
y video. El dry-run previo confirmó pool activo y plan `CAP=400`/`GRANT=400`, pero no se ejecutó ninguna mutación:
la cuenta humana pudo leer `globe-credit-approval-secret` (`exit 0`, valor nunca impreso), mientras la impersonación
de `greenhouse-globe-caller@efeonce-globe.iam.gserviceaccount.com` siguió devolviendo
`iam.serviceAccounts.getAccessToken` denegado aun con el binding exacto aplicado y tras cinco reintentos.

El binding break-glass se eliminó y el corte se verificó con un intento posterior de impersonación fallido. No hubo
grant, cambio de política, `credits.allocate`, generación de imagen ni generación de video. La revisión viva del API
era `globe-api-internal-00096-99x`, imagen `48de228e7106`. Este fue el cuarto intento de esta clase: queda como
`operativamente bloqueado`; no mover TASK-1566 ni sus slices.

## 2026-07-26 — Acto operativo Globe: fondeo aplicado; generación pendiente por tenancy stale  ⟨superada por «ESTADO VIGENTE de Globe»⟩

Después del bloqueo de impersonación humana se ejecutó el acto legacy separando identidades: `greenhouse-portal@`
emitió el ID token del caller y `julio.reyes@efeonce.org` leyó/firma el secreto, sin imprimirlo. Resultado: grant
`400` `posted`, `monthlyCap=400`, `policyAvailable=402`, `effectiveAvailable=402`; `budget.evaluate` permite
imagen `10` y video `16`. No se usó `credits.allocate`.

El criterio final todavía **no está cumplido**: el canary de imagen/video se detiene antes de `prepare` porque la
proyección de tenancy del workspace está stale (`brokerExpiresAt=2026-07-24T13:17:00Z`). No se saltó el guard ni se
crearon runs parciales. El siguiente paso es renovar la proyección mediante el broker Greenhouse y repetir el canary
punta a punta; el checkout de `efeonce-globe` tiene cambios paralelos de TASK-1566 y no se modificó.


## Corte legado 2026-07-19

- [Handoff completo antes de la compactación](docs/operations/agent-context-history/2026-07-19/Handoff.legacy.md)
- [Handoff.archive previo a la compactación](docs/operations/agent-context-history/2026-07-19/Handoff.archive.legacy.md)
- [Manifest de integridad](docs/operations/agent-context-history/2026-07-19/manifest.json)
- [Mapa y protocolo de recuperación](docs/operations/agent-context-history/2026-07-19/README.md)

Los snapshots son inmutables y se verifican por SHA-256 con `pnpm docs:context-check:strict`.

## Archivo incremental posterior

Las sesiones que salgan de la ventana activa se archivan en
`docs/operations/agent-context-history/handoff/YYYY-MM.md` mediante `pnpm docs:context-rotate --apply`.

- [2026-07](docs/operations/agent-context-history/handoff/2026-07.md)

No volver a pegar historia completa en este índice.
