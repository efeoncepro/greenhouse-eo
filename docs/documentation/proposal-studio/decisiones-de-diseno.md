# Proposal Studio — decisiones de diseño (y las alternativas rechazadas)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-12 por Claude
> **Ultima actualizacion:** 2026-07-12 por Claude
> **Documentacion tecnica:** [GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md](../../architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md) · [GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md) · [ISSUE-121](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md) · [TASK-1391](../../tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md)

## Para qué sirve este documento

Casi todas las decisiones del Proposal Studio tienen una alternativa que **parecía más simple** y que
se descartó por una razón concreta. Este documento deja escritas esas razones, para que nadie las
re-descubra pagando el mismo precio.

---

## 1 · Dónde corre el render pesado: **Cloud Run Job**

**La decisión:** el render (un Chromium completo, ~25-32 segundos, 2 vCPU / 2 GiB) corre en un
**trabajo dedicado de Cloud Run** — `artifact-worker` —, una ejecución por deck.

| Alternativa | Por qué no |
|---|---|
| **Dentro de Vercel** (una ruta de API) | Un render de 30 segundos con un navegador completo no cabe en el modelo de ejecución de una ruta web. Y si cupiera, competiría con el tráfico del portal. |
| **Dentro del `ops-worker`** | ⛔ **El peor de todos.** El `ops-worker` es quien publica los eventos del outbox. Un deck pesado ahí **bloquea el publicador de eventos de toda la plataforma** — y todo lo asíncrono de Greenhouse deja de correr. |
| **Un servicio HTTP de larga duración** | Un servicio que espera peticiones tiene que estar prendido. El render es esporádico: un Job que arranca, hace su trabajo y muere es exactamente el perfil. |

**El detalle que se cuidó:** el nombre. `artifact-worker`, **no** `tender-worker`. Renombrar un servicio
de Cloud Run después **no es un rename**: es un servicio nuevo (con su identidad, su workflow, su
historial) y el viejo queda de zombi. Y el nombre viejo contradecía al motor: el worker renderiza
**catálogos**, no un dominio. Costo de decidirlo antes del primer deploy: **cero**.

> **Detalle técnico:** `services/artifact-worker/**`. La excepción de frontera (crear un deployable
> nuevo durante EPIC-027) está autorizada y documentada; no se crean deployables por conveniencia.

---

## 2 · Quién elige el trabajo: **el worker lo reclama**, no el despachador se lo asigna

**La decisión:** el despachador solo dice "hay trabajo, arranca" (`jobs.run` simple). **El worker
elige cuál** tomar, con un reclamo atómico en la base de datos (`FOR UPDATE SKIP LOCKED`).

**La alternativa que se intentó primero:** que el despachador le pasara el ID del trabajo al Job como
variable de entorno. **Falló en el primer smoke real**: ejecutar un Cloud Run Job con variables
sobreescritas exige el permiso `run.jobs.runWithOverrides`, que **no viene** con el rol de invocador.

Y ahí estaba la bifurcación:

- **Camino fácil:** darle más permisos al despachador.
- **Camino elegido:** **rediseñar para necesitar menos permiso.**

El worker que reclama su propio trabajo resultó ser **además más robusto**: dos ejecuciones simultáneas
**jamás** toman el mismo trabajo, por construcción. La solución con menos privilegio fue también la
mejor.

> **El aprendizaje durable: siempre preferir rediseñar para necesitar MENOS privilegio antes que
> escalar los permisos.**

> **Detalle técnico:** `claimNextRenderJobForExecution` en
> `src/lib/commercial/tenders/proposals/render-jobs.ts`. Origen:
> [ISSUE-121 §1](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md).

---

## 3 · Cómo se ejecuta el código en el contenedor: **`tsx` sobre el árbol fuente**

**La decisión:** el worker corre el código fuente directamente (`tsx`), sin empaquetarlo previamente
con un bundler.

| Alternativa | Por qué no |
|---|---|
| **Bundle con esbuild** | Un bundle esconde de qué depende realmente el código. El motor lee su catálogo desde el **sistema de archivos** (plantillas, contratos, fuentes, imágenes): un bundler no arrastra esos archivos, y descubres el faltante **en producción**. |

**Y aquí está la lección que lo respalda**, porque el contenedor mordió igual: el Dockerfile copiaba
**un** archivo auxiliar, pero ese archivo requería a su vecino. El contenedor **moría al arrancar**.

La respuesta no fue "copiar también el vecino". Fue un **selftest de la imagen**:

> **Cada vez que se construye la imagen, la imagen se prueba a sí misma dentro del pipeline** — carga
> el catálogo completo, verifica las 13 fuentes por checksum, arranca Chromium y hace un render de
> prueba. **Si falla, no hay deploy.**

*"Compiló y el Dockerfile se ve bien"* **no es evidencia**.

> **Detalle técnico:** `services/artifact-worker/Dockerfile` + `selftest.ts` + `deploy-contract.test.ts`.
> Origen: [ISSUE-121 §2](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md).

---

## 4 · Cómo se ordena la cola: **deadline + envejecimiento**, nunca FIFO

**La decisión:** prioridad por **deadline más próximo**, con **envejecimiento** para los trabajos sin
plazo. Los vencidos no compiten: se cierran de forma gobernada.

| Alternativa | Por qué no |
|---|---|
| **FIFO ciego** (primero el que llegó) | ⛔ Los dos perfiles de carga son **opuestos**. Un deck de licitación es **raro, pesado y con plazo duro** (si no entra hoy, **pierdes el proceso**). Un lote de 30 carruseles es **frecuente y sin urgencia**. Con FIFO, **el batch social hambrea el deck del bid que vence mañana**. |
| **Solo prioridad por deadline** | Los trabajos sin plazo **nunca correrían**. Prioridad sin envejecimiento es **hambruna con otro nombre**. |

**Un matiz sobre los pesos:** los valores concretos (cuántos minutos de envejecimiento, qué pesos por
catálogo) se fijan **con datos reales de carga**, no a ojo. Hoy la capacidad medida es: **10-15 renders
por hora** operando conservador, con un techo del despachador de **30 por hora** (uno cada dos minutos).

**Lo que queda abierto:** un lote de 30 carruseles con **una ejecución por pieza** significa 30 arranques
en frío de una imagen con Chromium — el arranque domina el trabajo útil. Es probable que ese destino
quiera **lotes por ejecución**. Se decide **con datos**, no antes.

> **Detalle técnico:** `selectNextRenderJobForDispatch` / `claimNextRenderJobForExecution` en
> `render-jobs.ts`; cierre de vencidos en `render-dispatch.ts`; señal
> `artifact.render.queue.starvation` (estable en cero).

---

## 5 · Cómo se calcula el hash del manifiesto: **serialización canónica**

**La decisión:** el hash del manifiesto se calcula sobre una serialización **canónica** (claves
ordenadas, en profundidad).

| Alternativa | Por qué no |
|---|---|
| **`JSON.stringify` directo** | ⛔ El manifiesto viaja por la base de datos como JSONB, y **PostgreSQL reordena las claves**. Con un hash sensible al orden, el drift check daba **falso positivo permanente** después del viaje de ida y vuelta: el sistema decía que el manifiesto había cambiado cuando no había cambiado nada. |

Ese bug no fue teórico: **apareció en la primera corrida real**, y bloqueó todo el pipeline con un
rechazo que era mentira.

> **Nunca hashear con `JSON.stringify` contenido que viaja por JSONB.** O el drift check miente — y un
> guard que miente es peor que no tenerlo.

> **Detalle técnico:** `hashResolvedManifest` en `render-jobs.ts`. Origen:
> [ISSUE-121](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md) y
> [TASK-1391 · Delta (d)](../../tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md).

---

## 6 · Quién reintenta: **el dominio**, no la infraestructura

**La decisión:** el reintento es un comando del dominio (`retryProposalRenderJob`). Cloud Run tiene los
reintentos automáticos **en cero**.

| Alternativa | Por qué no |
|---|---|
| **Dejar que Cloud Run reintente** | La infraestructura no sabe **por qué** falló. Reintentaría igual un timeout (que puede pasar) que una violación de audiencia (que **produciría exactamente el mismo rechazo**, tres veces, gastando CPU y ensuciando la historia del trabajo). |

Por eso los códigos de falla están partidos en dos familias, y las **no reintentables**
(audiencia, accesibilidad, semántica, peso, geometría, drift) exigen **un manifiesto nuevo**: hay que
corregir el contenido, no volver a intentar lo mismo.

Y hay un beneficio de auditoría: los intentos que muestra una propuesta son **los intentos reales de
negocio**, no ruido de la plataforma.

> **Detalle técnico:** `NON_RETRYABLE_FAILURES` y `retryProposalRenderJob` en `render-jobs.ts`.

---

## 7 · Cómo se habilita la capacidad: **entitlement por organización**, no por rol

**La decisión:** la capacidad se habilita asignando el **módulo `proposal_studio_v1` a una
organización**. Sin esa asignación **nadie opera propuestas** — ni un administrador.

| Alternativa | Por qué no |
|---|---|
| **Gatearlo por rol** | ⛔ **Un rol no se factura; un módulo sí.** Si la puerta es un rol, la capacidad **no se convierte en producto vendible**: para servir a un cliente Globe habría que rehacer la autorización. |

Es el mismo modelo que ya usa el AI Visibility Grader, por la misma razón. Y encaja con las otras tres
costuras multi-tenant que se dejaron puestas desde el día uno:

| Costura | Hoy (Efeonce) | Mañana (as-a-service) | Si NO se dejaba hoy |
|---|---|---|---|
| **Brand pack como input** | AXIS | El pack del cliente | **AXIS horneado = imposible servir a un cliente** |
| **Dueño de organización en todo** | Una sola organización | N organizaciones aisladas | Un filtro por organización **agregado tarde siempre deja un lector sin filtrar** |
| **Entitlement por organización** | Interno | Módulo contratable | Un gate por rol **no se convierte en producto** |

Estado real: el módulo está **activo para Efeonce Group SpA** desde el 2026-07-12. Para cualquier otra
organización sigue apagado — **por diseño, no por olvido**.

> **Detalle técnico:** `module_assignments` (`proposal_studio_v1`) + capabilities
> `commercial.proposal.{read,manage,gate}`. Contrato en el
> [ADR §5](../../architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md).

---

## 8 · Cómo se llama el objeto: **`Proposal`**, no `Tender` ni `TechnicalProposal`

**La decisión:** el objeto se llama **`Proposal`**, y "licitación" es un **origen** (`public_tender`),
junto a `private_rfp` y `direct_sales`. Los estados terminales son **`won` / `lost`**.

| Alternativa | Por qué no |
|---|---|
| **`Tender`** (licitación) | Obliga a llamar "licitación" a una venta directa. **El vocabulario mentiría** — y en un documento comercial el vocabulario es contrato. |
| **`TechnicalProposal`** | Nombra **una de las tres partes** (técnica / económica / administrativa) para referirse **al todo**. Choca con el lenguaje que ya usan clientes y evaluadores. |
| **Terminales `awarded` / `not_awarded`** | Es vocabulario de licitación pública. **Una venta directa no se "adjudica": se gana o se pierde.** Dejarlo sería hornear en la base de datos un supuesto que **ya sabemos falso**. |

**El copy visible se resuelve por origen, no por el estado:** *"Adjudicada"* si es licitación pública,
*"Ganada"* si es venta directa. El estado es genérico; la palabra que ve el usuario es contextual.

**Por qué se decidió cuando se decidió:** era el único momento en que costaba cero. **Apenas existe la
tabla, esos nombres quedan grabados en un historial que se declara inmutable**, y cambiarlos significa
migrar un enum **y reescribir historia que prometimos no reescribir**.

---

## Los seis aprendizajes de ISSUE-121 (el primer deploy)

El primer smoke real del pipeline en la nube **falló cinco veces seguidas, cada vez una capa más
adentro**. Ninguno de los cinco bugs era visible en local. Los cinco eran de la **misma clase raíz**:

> **"El contenedor y la nube difieren de la máquina del autor — y nos enteramos en runtime."**

Se resolvieron todos el mismo día, cada uno **de raíz** y con un guard permanente. El sexto intento
renderizó al primer intento.

| # | Qué pasó | Qué dejó |
|---|---|---|
| 1 | Faltaba un permiso de IAM para ejecutar el Job con variables sobreescritas | **El worker reclama su trabajo** (menos privilegio, más robusto) |
| 2 | El contenedor moría al arrancar: faltaba un archivo auxiliar | **La imagen se prueba a sí misma** en el pipeline de build |
| 3 | Chromium como root en un contenedor no arranca sin `--no-sandbox` | El flag en el **launch canónico uniforme**, nunca condicionado al ambiente |
| 4 | Falsas "imágenes ausentes": el gate juzgaba sin esperar la carga (el SSD local lo escondía; la nube lo expuso) | **Un gate que depende de la velocidad del disco no es un gate: es una moneda** |
| 5 | Dos plantillas viajaron con la ruta absoluta del Mac del autor horneada | **Un catálogo es dato portable o no es un catálogo** (guard mecánico) |
| — | (En la corrida local previa) el hash del manifiesto era sensible al orden de claves | **Serialización canónica** |

**Los seis "nunca / siempre" que quedaron:**

1. **NUNCA** declarar "listo" un deployable nuevo **sin ejecutarlo en su runtime real**. Los cinco bugs
   eran invisibles en local **por construcción** (IAM real, sistema de archivos del contenedor, root,
   latencia de disco, filesystem del autor). El smoke real no es un trámite: **es donde vive esta clase
   de bug**.
2. **SIEMPRE** que se construye una imagen, la imagen **se prueba a sí misma** en el pipeline.
3. **NUNCA** un gate de calidad juzga un estado asíncrono **sin esperar su resolución de forma
   determinista** (con techo, jamás con un sleep ni con un juicio inmediato).
4. **NUNCA** un hash de contenido con `JSON.stringify` sobre datos que viajan por JSONB.
5. **SIEMPRE** preferir **rediseñar para necesitar menos privilegio** antes que escalar permisos.
6. **Un catálogo es dato portable o no es un catálogo** — y se hace cumplir con un test, no con una
   convención.

> **Detalle técnico:** [ISSUE-121](../../issues/resolved/ISSUE-121-artifact-worker-first-deploy-bug-class.md)
> (los cinco síntomas, sus causas raíz y sus guards) ·
> [TASK-1391 · Delta (e)](../../tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md)
> (la evidencia de staging).

---

## Lo que sigue abierto (declarado, no escondido)

| Pregunta | Estado |
|---|---|
| ¿Qué hacemos el día que un RFP exija PDF/UA? | Hoy la respuesta honesta es **"fallamos cerrado y no ofertamos"**. Si pasa, hay que evaluar un destino de salida que sí produzca PDF con tags. |
| ¿El destino `png-set` quiere **lotes por ejecución**? | Probablemente sí (el arranque en frío de Chromium domina). **Se decide con datos de carga.** |
| Producción | **Apagada a propósito.** Requiere integrar el workflow de deploy al control de releases + sign-off del operador. |
| Las 71 altas de color del brand pack | Marcadas como *propuestas*, pendientes de validación en Figma. |
