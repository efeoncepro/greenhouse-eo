# Efeonce Globe — Administración desde Greenhouse (créditos y capabilities) Decision V1

- **Decision:** ADR-015
- **Status:** **Partially implemented — carril de fondeo VIVO y ejercido end-to-end** (2026-07-26). **Slice A entregado** (fase de negación; cierra la mitad de diagnóstico de `ISSUE-124`). **Slice B entregado y VERIFICADO CON UN CASO REAL**: fondeo mensual `propose` → `confirm` punta a punta SIN break-glass, confirmado por el operador con su sesión real (grant +100 `posted`, tope 400→800, asiento de ledger, en UNA transacción; `confirm` en 905 ms tras cerrar el defecto 7 de TASK-1566 — el self-deadlock del store transaccional). **El retiro del §10 quedó EJECUTADO el mismo día** (rev `00114-k4t`): el caller genérico (y el broker, que cae en esa clase) perdió `grant.issue`/`grant.correct`/`policy.manage`/`budget.manage`, con la señal `globe.credit_admin.caller_authority_drift` en dos capas (runtime + test de disyunción) y verificada en cero; **Slice C ejecutado** (scripts de firma cliente eliminados). D (KMS), E completo (identidades disjuntas por unidad), F-H pendientes como hardening. Ver Delta 2026-07-26 (3) y TASK-1566 Delta (7).
- **Date:** 2026-07-26
- **Owner:** Greenhouse control plane (superficie, identidad, desired access, entitlements) + Efeonce Globe (autoridad, firma, ejecución, evidencia)
- **Scope:** La **administración de Globe desde Greenhouse** en sus dos mitades: **(a) créditos** — fondear el mes, emitir grants, publicar/superseder política de presupuesto, presupuestos de proyecto; y **(b) capabilities por usuario** — qué puede hacer cada persona dentro de cada workspace de Globe. Cubre la topología de identidades de las dos plataformas, el carril de transporte, el modelo de aprobación y firma, la atomicidad de la mutación, la observabilidad de la negación y la superficie de administración en el portal. **NO** cubre el ledger comercial en sí (TASK-1468), el spend fence de seguridad del Lab, la promoción de rutas (ADR-009/ADR-010), el payload de browser (ADR-014) ni el rollout comercial externo (TASK-1480).
- **Reversibility:** **mixta, y hay que decirlo.** Two-way: el carril, los comandos, la superficie del portal y los flags (todos default-OFF, strangler sobre lo que existe). **One-way en dos puntos**: (1) el **formato de la evidencia de aprobación** — pasar de HMAC simétrico a firma asimétrica KMS obliga a un verificador dual durante la transición y a decidir qué pasa con las aprobaciones históricas; (2) **retirarle al caller genérico la autoridad de crédito** toca un carril vivo (el mismo por el que hoy corre la reconciliación de tenancy) y su rollback es una edición de IAM + un deploy, no un flag.
- **Confidence:** **Alta** para el diagnóstico y la topología (verificados contra el código de los **dos** repos el 2026-07-26, con `file:line`). **Media** para la mitad de capabilities, que depende de un gate ajeno (`tenancy_mode = enforced`, ver Contexto §7). **Baja** para el dimensionamiento de la superficie del portal hasta que exista su Discovery.
- **Related:** ADR-001 (`GREENHOUSE_CONNECTIVITY_V1.md`) — separa federación humana de federación keyless de workload; esta ADR **usa** esa separación y no la modifica. ADR-006 (`EFEONCE_GLOBE_PERSISTED_TENANCY_PROJECTION_DECISION_V1.md`) — la proyección de tenancy es el vehículo de la mitad de capabilities. ADR-009 / ADR-010 — el patrón de identidades disjuntas y de saga durable que esta ADR **reusa en vez de inventar**. ADR-005 §3/§4 — trust boundary, sigue normativo. ADR-014 § `Alcance real del ADR pendiente` — el encuadre que esta ADR ejecuta. `ISSUE-124`. `TASK-1468`, `TASK-1511`, `TASK-1521`, `TASK-1527`, `TASK-1535`, `TASK-1480`.

---

## Contexto (baseline verificado 2026-07-26 contra el código de los dos repos, no contra la doc)

### 1. La dirección del operador

**Greenhouse debe poder administrar los créditos y las capabilities de los usuarios de Globe**, y esa administración vive en Greenhouse, no en un CLI. Esto **no contradice la frontera; la usa**: el reparto declarado ya dice que Greenhouse es el *único control plane operativo* — identidad, desired access state, bindings de workspace/cliente, governance cross-plataforma — y Globe es *runtime, ejecución y evidencia*.

Lo que la frontera prohíbe no es que Greenhouse administre. Es que lo haga **por impersonación implícita**: sin contrato, sin superficie declarada, con una identidad prestada y con poder de forjar aprobaciones. Esta ADR convierte el admin implícito en admin gobernado.

### 2. 🔴 Corrección de los deltas del 2026-07-26: la autoridad de crédito YA está concedida a la identidad que Greenhouse puede impersonar

El Delta (3) de ADR-014 dijo que las dos SAs que el API allowlistea con forma de maker-checker son `globe-promotion-promoter@` y `globe-promotion-checker@`, que pertenecen al saga de promoción de **modelos**, y concluyó que *"habilitarlo pide dos identidades propias de credit-admin, disjuntas, con su binding en Terraform"*. **Estaba mirando el lugar equivocado.** La cadena real, verificada:

| Eslabón | Evidencia |
|---|---|
| `greenhouse-portal@efeonce-group` tiene `roles/iam.serviceAccountTokenCreator` sobre `greenhouse-globe-caller` | `efeonce-globe/infra/terraform/iam.tf:16-20` + `variables.tf:43` |
| `greenhouse-globe-caller` está en el allowlist de callers del API | `infra/terraform/cloud_run_services.tf:260-267` |
| Ese SA resuelve al principal genérico `globe:service:internal-caller` | `apps/studio-web/src/app.ts:3457` (`internalServicePrincipal`) |
| Ese principal carga **toda** la autoridad de administración de crédito | `app.ts:3545-3563`: `globe.credits.grant.issue`, `globe.credits.grant.correct`, `globe.credits.policy.manage`, `globe.credits.budget.manage`, `globe.credits.pool.manage` |
| …y además `globe.lab.experiment.run` | `app.ts:3515` — o sea **la misma identidad puede fondear y gastar** |

**No es que falte una capability. Es que sobra: una sola identidad tiene el fondeo y el gasto, y Greenhouse puede asumirla.** Lo único que hoy la detiene es **un secreto que no puede leer** (`secretmanager.versions.access` sobre `globe-credit-approval-secret`, denegado — verificado en el Delta (4) con evidencia convergente).

Esto no debilita la conclusión de los deltas: la **agrava**. "Falta una identidad" es un hueco; "una identidad tiene las dos mitades y su único freno es una llave" es un control que depende enteramente de la custodia de un archivo.

Lo que del Delta (3) **sí sigue en pie**: los comandos existen, el verificador existe, el script existe, y el carril **nunca fue ejercitado**.

### 3. 🔴 El maker-checker de crédito es VACUO para cualquier caller de workload

`packages/domain/src/credit-administration.ts`, función `approval()`:

```ts
if (a.proposedBy === c.actor.principalId || Date.parse(a.expiresAt) <= d.now() || !d.approval.verify(c, p, a))
  throw new CreditAdministrationError('maker_checker_required');
```

El primer término compara `proposedBy` contra `context.actor.principalId`. Para un caller de workload ese valor es la **constante** `'globe:service:internal-caller'` (`app.ts:3503`). Una aprobación con `proposedBy: 'julio.reyes@efeonce.org'` — o con cualquier string que no sea esa constante — **pasa el chequeo trivialmente**.

La única atadura real es el HMAC sobre `proposedBy` (`apps/studio-web/src/credit-admin-approval.ts`). O sea: **un solo proceso que conozca el secreto es maker y checker a la vez, con sólo poner otro string.** Eso es exactamente lo que el Delta (4) describió como *"declara dos nombres, pero no hay dos actores"* — ahora con el mecanismo, no con la intuición.

**Corolario de diseño, y es el que ordena toda esta ADR:** la disyunción de actores **no puede vivir del lado de Globe** con los principals que existen, porque son constantes por clase de workload. Tiene que vivir donde hay identidades humanas reales, entitlements y auditoría: **Greenhouse**. Esto no es una concesión — es la razón técnica por la que el encuadre del operador (*"el humano aprueba en Greenhouse y Globe ejecuta"*) es el correcto y no sólo el conveniente.

### 4. HMAC compartido: leer implica forjar, y no existe superficie que firme

`createHmacCreditAdminApproval` es HMAC-SHA256 **simétrico** sobre `(workspaceId, proposedBy, proposedAt, expiresAt, payload)`. La infra lo custodia bien y lo dice por escrito: los secretos de aprobación *"are published out-of-band and never enter Terraform state; only api_runtime can read them"* (`infra/terraform/secrets.tf:100-110`).

Ese radio es **correcto**, y es justamente lo que vuelve inoperable cualquier CLI. Y hay un segundo hecho verificado: **no existe ninguna superficie que firme.** `.sign(` no aparece en `app.ts`; los únicos consumidores del firmador son `main.ts` (que construye el *verificador*), su test, y `scripts/raise-credit-monthly-cap.mjs` — un script que por contrato no puede leer el secreto.

**El verificador está cableado; el firmador no existe como superficie.** El carril no está bloqueado por permisos: está incompleto.

Y el break-glass documentado (`GLOBE_RUNTIME_HANDOFF.md:220`, ejercido al menos tres veces) es un camino soportado — lo que lo vuelve un problema es la frecuencia: **break-glass ejercido tres veces para la misma clase de acto ya no es excepción, es la operación normal por la puerta de emergencia**, y cada uso está a una revocación olvidada de volverse permanente.

### 5. El lane `sister-platform` existe y está probado — pero para tenancy, no para crédito

Las 8 surfaces canónicas (`GLOBE_SURFACES`) incluyen `sister-platform`. Está `available` en **exactamente una** familia de capabilities: la de tenancy (`packages/domain/src/tenancy.ts:23`). En crédito está `policy-blocked` en las tres familias:

| Familia | Coverage de `sister-platform` | Fuente |
|---|---|---|
| Tenancy | **`available`** | `tenancy.ts:23` |
| Credit administration (pools, grants, política, budgets) | `policy-blocked` | `credit-administration.ts:33` |
| Credit ledger | `policy-blocked` | `credit-ledger.ts:27,31` |
| Promoción de producción | `policy-blocked` | `production-promotion-operation.ts:31` |

**No hay que inventar el carril: hay que publicar los comandos ahí.** Y `policy-blocked` significa lo que dice — declarado, gobernado, apagado — no "falta el contrato". La distancia entre hoy y el carril gobernado es un flip de coverage acompañado de la topología de identidades que lo justifique.

### 6. La administración de capabilities POR USUARIO no existe hoy: el desired state es una constante por workspace

`src/lib/globe/tenancy-reconciler.ts:216`:

```ts
desiredCapabilities: policy.capabilities
```

donde `policy` sale de una sola fila: `sister_platform_oauth_clients.policy_json` para `client_id='globe'` (`DESIRED_WORKSPACES_SQL:509-515`). **Todo miembro de todo workspace bindeado recibe el mismo set** — el `capabilityScopes` del grant OAuth.

O sea: *"administrar las capabilities de los usuarios de Globe"* **no es afinar algo que existe**. Es **introducir la dimensión por-miembro**, que hoy no está modelada en ninguno de los dos lados. Globe ya tiene el receptor (`issueGrant(workspaceId, memberId, capability, expiresAt, reasonCode, …)` en `TenancyProjectionStorePort`); Greenhouse no tiene el emisor.

### 7. 🔴 Y esa dimensión sería INERTE hoy — la mitad de capabilities está bloqueada por un gate ajeno

- `tenancy_mode` tiene default **`"shadow"`** (`infra/terraform/variables.tf:125-136`).
- En `shadow`, la proyección **observa y nunca niega**: `observeShadow(...)` compara `brokerCapabilities` contra `projectedCapabilities` y sigue (`tenancy.ts:105`).
- `resolveBrokerWorkspaces` sólo consulta los bindings proyectados cuando el modo es `enforced` (`app.ts:4154-4158`).

**Consecuencia dura: una superficie de administración de capabilities por usuario, shippeada sobre `shadow`, promete un control que el runtime ignora.** Es la misma clase de falla del flag declarado-y-no-cableado (`client_app_enabled`, `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`), un nivel más arriba: no un flag que no llega al contenedor, sino **una decisión de acceso que llega y no se aplica**. La promoción a `enforced` es un gate zero-drift propio (`TASK-1511`) y **es prerrequisito**, no un follow-up.

Hay además un techo estructural que hay que respetar: el broker acopla `capabilityScopes ⊆ requiredScopes` (`src/lib/sister-platforms/oauth-policy.ts`), y los dos repos hardcodean su lista de scopes (`GLOBE_PRODUCER_CAPABILITY_SCOPES` ↔ `PRODUCER_HUMAN_CAPABILITY_SCOPES`) — la lección de ADR-010 que tumbó todo el login. **Por lo tanto la diferenciación por usuario NO puede vivir en el token** (el grant OAuth es todo-o-nada por cliente): vive **sólo** en la proyección. El grant OAuth es el **techo**; la proyección es el **piso**.

### 8. La taxonomía de conflicto colapsada, medida (y es la pieza de ISSUE-124)

`apps/studio-web/src/dispatch.ts` § `handlerErrorToApiCode` (líneas ~304-320) colapsa **tres** clases de error de dominio en `conflict`:

| Clase | Qué colapsa |
|---|---|
| `CreditLedgerError` | todo lo que no sea `dependency_unavailable`/`invalid_request`/`not_found` — o sea **`insufficient_balance` y `budget_denied`** |
| `CommercialCreditLifecycleError` | todo salvo `shape_required` — `approval_stale`, `approval_invalid`, `hard_cap_exceeded` |
| `CreditAdministrationError` | todo salvo `invalid_request`/`not_found`/`dependency_unavailable` — **incluyendo `maker_checker_required`** |

Es **deliberado** (no filtrar saldos ni política por un transporte compartido) y es la causa de la ambigüedad de `ISSUE-124`. El desambiguador existe — `globe.credits.budget.evaluate` devuelve un `reason` tipado (`pool_paused | pool_exhausted | project_cap_exceeded | month_cap_exceeded | policy_unavailable`) — pero está `policy-blocked` en la superficie `ui`.

**Y el tercer renglón es nuevo respecto de lo que ADR-014 registró:** una aprobación vencida, con digest que no calza o con proponente igual al ejecutor devuelve **el mismo 409** que un conflicto de fase del store. El operador de `ISSUE-124` reportó *"aprobación maker/checker"* válida y recibió 409 — con esta taxonomía, **`maker_checker_required` es indistinguible de `pool_paused`**. La observabilidad del conflicto no es un extra del diseño objetivo: es **prerrequisito**, porque sin ella el carril nuevo hereda exactamente el mismo diagnóstico ciego.

---

## Decisión

### 1. Greenhouse es la SUPERFICIE de administración; Globe es la AUTORIDAD

El operador administra donde ya vive — con sus entitlements, su sesión humana real y su auditoría. La decisión la **verifica, firma y ejecuta** el runtime de Globe. Greenhouse manda una **intención autorizada y atribuida** (quién, con qué entitlement, sobre qué workspace, con qué correlación); nunca una aprobación ya firmada.

**Invariante duro, no negociable:** la llave de aprobación **nunca sale del runtime de Globe**, y **ningún actor obtiene aprobación y ejecución a la vez**.

### 2. El carril es `sister-platform`, no impersonación del caller genérico — y el caller genérico PIERDE la autoridad de crédito

- Los comandos y readers de administración de crédito y de capability grant se publican con coverage `sister-platform: 'available'`, y Greenhouse los consume como cualquier otro consumer del spine. Sin credenciales prestadas, sin secretos compartidos.
- **Y la contraparte, que es la mitad que de verdad cierra el hueco:** el principal genérico `globe:service:internal-caller` **deja de cargar** `globe.credits.grant.issue`, `globe.credits.grant.correct`, `globe.credits.policy.manage` y `globe.credits.budget.manage` (`app.ts:3554-3562`). Esas capabilities se mueven a la clase de workload del ejecutor. Publicar el carril nuevo sin retirar el viejo deja **dos** caminos a la misma autoridad, y el viejo es el que no tiene gates.
- `globe.credits.pool.manage` **se queda** donde ya está y como está: el `tenancy-operator` es hoy el checker independiente de activar/pausar un pool (`app.ts:3487-3497`), y esa disyunción ya funciona. No se toca lo que ya está bien.

### 3. Topología de identidades: una identidad por propósito, ninguna con dos mitades

Cuatro identidades nuevas. La regla que las ordena: **la que reconcilia tenancy no es la que mueve plata, la que firma no es la que muta, y la que muta no puede firmar.**

| Identidad | Lado | Propósito | Autoridad | Lo que NO puede |
|---|---|---|---|---|
| `greenhouse-globe-admin@efeonce-group` | Greenhouse | Broker de administración. **Distinta de `greenhouse-portal@`** (el reconciliador de tenancy) | `serviceAccountTokenCreator` **sólo** sobre `globe-admin-broker` | No reconcilia tenancy, no invoca Cloud Run directo, no lee ningún secreto de Globe |
| `globe-admin-broker@efeonce-globe` | Globe (ingress) | Clase de workload que recibe las intenciones de Greenhouse. Principal `globe:service:admin-broker` | Readers de crédito + `globe.credits.funding.propose` + `globe.tenancy.grant.propose`. **Read-only y propose-only** | **No confirma, no muta, no firma, no corre el Producer, no gasta** |
| `globe-credit-approver@efeonce-globe` | Globe (firma) | Mintea la evidencia de aprobación con KMS, y sólo si hay una confirmación humana atribuida (más el segundo confirmador cuando la política del workspace lo exija) | `roles/cloudkms.signerVerifier` sobre la clave de aprobación + `SELECT` sobre la tabla de propuestas | **Ninguna capability de crédito. Cero DML sobre agregados de crédito o ledger** |
| `globe-credit-executor@efeonce-globe` | Globe (mutación) | Ejecuta el confirm | `globe.credits.funding.confirm`, `grant.issue`, `grant.correct`, `policy.manage`, `budget.manage` + DML | **No puede firmar** (sólo `publicKeyViewer`: verifica, no produce) |

**La disyunción se realiza como separación física, no como convención.** El aprobador corre en **su propia unidad de ejecución** (`apps/credit-approver`, Cloud Run service IAM-private, una sola superficie estrecha: *"dada esta propuesta verificada, firma su aprobación"*). Si aprobador y ejecutor viven en el mismo proceso corriendo como `api_runtime`, la disyunción es **cosmética** — `api_runtime` tendría las dos mitades y volveríamos al punto de partida con más YAML.

Precedente que se reusa, no se inventa: `apps/asset-governance` y `apps/media-derivatives` ya son unidades Cloud Run keyless separadas (ADR-007/ADR-008), y ADR-009/ADR-010 ya tienen **cuatro** SAs disjuntas para el saga de promoción. Costo honesto: **un deployable más en Globe**. Es del lado de Globe y no toca la frontera de deployables de `EPIC-027`, que gobierna `greenhouse-eo`.

### 4. La llave de aprobación pasa a KMS asimétrico: leer deja de implicar forjar — **pero es HARDENING, no prerrequisito**

> **Delta 2026-07-26 (2).** Este punto se secuenció mal en la primera versión: iba **antes** del comando, como si
> el comando dependiera de él. **No depende.** El invariante *"la llave nunca sale del runtime de Globe"* **ya es
> cierto hoy** — el secreto está en el env del api y sólo `api_runtime` lo lee. Lo que falta no es una llave mejor:
> es **una superficie que firme adentro**. KMS mejora la postura de un carril que ya funciona (con HMAC, quien
> verifica puede forjar), y por eso va **después** del Slice B. Ponerlo antes fue lo que dejó al operador pagando
> break-glass para llegar al mismo lugar.

Se reemplaza el HMAC compartido por una clave **asimétrica de KMS** (`EC_SIGN_P256_SHA256`, Cloud KMS, región del proyecto de Globe), con `asymmetricSign` concedido **exclusivamente** a `globe-credit-approver`.

Por qué es la propiedad correcta, dicha sin adorno: **con un HMAC, quien puede verificar puede forjar** — son la misma operación con la misma llave. Con firma asimétrica, **verificar y forjar se separan**: el ejecutor, el auditor, un futuro verificador del lado de Greenhouse y cualquier revisión forense pueden **comprobar** una aprobación con la clave pública, y **ninguno** puede producir una. La evidencia se vuelve independientemente verificable para siempre sin repartir poder de firma.

Transición, y es el punto one-way de esta ADR: durante el corte el verificador acepta **ambos** formatos (HMAC legacy + firma KMS), con un contador de uso del legacy y una **fecha de retiro declarada**. Cuando el contador quede en cero por N días, el HMAC se retira y `api_runtime` **pierde** `secretmanager.versions.access` sobre `globe-credit-approval-secret`. Un verificador dual sin fecha de retiro es un verificador simétrico con pasos extra.

### 5. El comando gobernado `propose → confirm`: UN humano confirma, el agente nunca — y el segundo humano es POLÍTICA, no invariante

> **Delta 2026-07-26, dirección del operador — y corrige la primera versión de este punto, que exigía dos
> humanos distintos.** El operador es hoy CEO y product owner del presupuesto de Globe, y exigir un segundo
> humano costó **dos horas de fricción para sumar créditos y terminar un trabajo**. Eso no es disciplina: es un
> control mal ubicado, y su efecto medible fue empujar la operación al break-glass — tres veces para el mismo
> acto. **Un control que nadie puede satisfacer no protege: desvía.**

El maker-checker estaba **fusionando dos amenazas distintas**, y sólo una justifica su costo:

| Amenaza | Qué la detiene | Costo para el operador |
|---|---|---|
| **T1 — un agente o proceso comprometido funde sin intención humana** | el LLM **propone**, jamás confirma; la mutación exige una confirmación humana atribuida | **un clic** |
| **T2 — el aprobador fabrica la evidencia o el ejecutor la falsifica** | aprobador ≠ ejecutor, **entre service accounts**, en unidades separadas | **cero** (es IAM) |
| **T3 — un humano con autoridad funde sin testigo** | un segundo humano | **dos horas, y hoy es insatisfacible** |

**T1 y T2 se quedan como invariantes duros** — no cuestan nada y son los que de verdad impiden que algo se
autofinancie. **T3 pasa a ser política**: `requireSecondConfirmer`, declarada **por workspace y por umbral de
créditos**, con default **OFF** en el workspace interno owner-operated. Se prende donde un segundo actor
**existe y significa algo**: workspaces de cliente, o por encima de un techo declarado.

Lo que queda, entonces:

1. **Un agente (o el operador) propone.** `propose` es read-only, devuelve el plan legible y expira.
2. **El operador confirma.** Una sesión humana real de Greenhouse, con su entitlement y su audit. **Un actor
   humano + una máquina** — que es exactamente el loop de acción gobernada que la plataforma ya usa para Nexa,
   no una excepción inventada para esto.
3. **Globe verifica, firma internamente (KMS) y ejecuta.** El aprobador no muta; el ejecutor no firma.

**Y esto es lo que elimina el break-glass como operación normal**, que era el objetivo real de esta ADR. Hoy el
operador necesita break-glass porque **no puede firmar**; con un confirmador humano el camino normal funciona y el
break-glass vuelve a ser lo que su nombre dice.

**Lo que reemplaza la prevención con detección** (el trade correcto cuando el aprobador es el dueño): audit
append-only atribuido en los dos lados, la señal de reliability, y un **techo por operación** que sí escala a un
segundo actor cuando el monto lo amerita. Así funciona cualquier tesorería real — umbral de aprobación, no dual
control universal.

**El invariante que NO se relaja, y hay que decirlo fuerte:** el LLM **nunca** cruza el gate de confirmación.
Bajar de dos humanos a uno **no** habilita que un agente confirme solo: sigue habiendo exactamente una
confirmación humana, y sin ella no hay mutación.

Dos comandos, un solo punto de mutación:

- **`globe.credits.month.fund.propose`** — capability `globe.credits.funding.propose`, coverage `sister-platform: available` + `ui: available`. **Read-only.** Evalúa contra la política, el pool y el ledger vivos y devuelve un **plan legible**: grant propuesto, tope resultante, disponible resultante, y el `reason` actual de `budget.evaluate`. Persiste una **propuesta durable** con `proposalId`, fingerprint del payload y `expiresAt`. **No firma y no muta.**
- **`globe.credits.month.fund.confirm`** — capability `globe.credits.funding.confirm`. **El ÚNICO punto de mutación.** Verifica que la propuesta exista, no esté vencida y su fingerprint calce; que las dos atribuciones humanas sean **distintas** y ambas autorizadas; pide la firma al aprobador; **verifica la firma**; aplica la mutación (punto 6); hace readback; devuelve el estado resultante.

El maker-checker vive donde hay identidades reales:

1. **Quien propone** —el operador o un agente con su autorización— compone la intención. Greenhouse valida el entitlement, la registra append-only y llama `propose` por el carril `sister-platform`. Si el proponente es un agente, **queda atribuido como tal**: proponer no es confirmar.
2. **El operador confirma** en el portal, con sesión humana real. **Cuando `requireSecondConfirmer` está ON** para ese workspace o el monto pasa el techo declarado, el confirmador debe ser distinto del proponente humano — y esa disyunción se enforcea con constraint en Postgres **y** se re-verifica en Globe. Con la política OFF (default en el workspace interno owner-operated) **basta una confirmación humana**, y lo que se enforcea es que el confirmador **sea humano**, no que sea otro.
3. **Globe (executor)** verifica, obtiene la firma del aprobador, ejecuta y hace readback.

Esto arregla tres cosas a la vez: una intención = un comando (hoy son tres actos y dos firmas); cualquier agente puede **proponer** con la autorización del operador sin tocar `gcloud`, Secret Manager ni impersonación; y el maker-checker se vuelve **más fuerte**, porque desaparece el secreto en manos de clientes y aparece la comparación entre **dos actores autenticados** en vez de entre dos strings.

**Y por Full API Parity la capability nace con contrato gobernado**, así que la UI del portal, Nexa y MCP la operan por construcción — Nexa con el loop `propose → confirmación humana → execute`, donde el LLM **nunca** cruza el gate de confirmación.

### 6. Atomicidad: UNA transacción Postgres para grant + asiento de ledger + política; el intent durable cubre lo que no puede estar en la transacción

El script de la sesión anterior emitía el grant y **después** movía el tope: si el primero pasaba y el segundo fallaba, quedaba un estado parcial recuperable pero no diseñado. La forma correcta:

- **Los tres writes van en una sola transacción de Postgres**: `credit_grants` (grant posted) + el asiento de allocation del ledger + `credit_budget_policies` (publish/supersede). Están **todos en la base de Globe**, así que la atomicidad real es posible y no hay que degradarla a saga. Costo concreto y verificable: hoy `CreditAdministrationStorePort` y `CreditAdministrationLedgerPort` **no pueden compartir transacción** — `issueCreditGrant` hace `store.issueGrant` → `await ledger.allocate` → `store.markGrantPosted` como tres llamadas independientes. El confirm necesita una variante transaction-scoped que enhebre el `TransactionPort` de `packages/database` por los dos ports.
- **Lo que no puede estar en la transacción** — la llamada de firma al aprobador — ocurre **antes** de abrirla, y el readback **después**. Eso deja exactamente un modo de falla parcial: la transacción commiteó y el cliente no vio la respuesta. Se cubre con la **clave de idempotencia derivada del `proposalId`** + readback, no con un reintento a ciegas.
- **Grant y política siguen siendo comandos independientes** para el resto de los casos de uso (fondear sin mover el tope, o mover el tope sin fondear son intenciones legítimas y distintas). Lo que `credits.month.fund` agrega es la **intención compuesta**, atómica, para el caso que hoy exige tres actos.
- **Concurrencia optimista resuelta en el dominio, no en el caller.** `supersedePolicy` ya exige `expectedPolicyId` + `expectedVersion`; el confirm los resuelve leyendo la política vigente **dentro** de la transacción, en vez de hacérselos adivinar al cliente sobre una vista stale.

### 7. Capabilities por usuario: desired state per-member en Greenhouse, vocabulario de Globe, techo el grant OAuth

- **Greenhouse es dueño del desired access state por miembro.** Tabla de governance nueva, **append-only**, con `(workspaceId, userId, globeCapability, effectiveFrom, effectiveTo, reasonCode, grantedBy, confirmedBy)`. Se ancla al objeto canónico **`Persona`** vía `client_users.user_id` — **extiende, no paraleliza** (regla dura del modelo 360).
- **El vocabulario sigue siendo de Globe.** Greenhouse ya importa `GLOBE_CAPABILITIES` de `@efeonce-globe/contracts` (`tenancy-reconciler.ts:6`) y ya falla fuerte ante una capability desconocida (`globe_tenancy_capability_invalid`, línea 352). Ese import **es** el mirror y no hay que crear una lista a mano. Y `parseGlobeCapabilities` **descarta** lo que no reconoce — un broker no puede inventar capabilities — así que una validación laxa del lado de Greenhouse no produce un error: produce una **desaparición silenciosa**. Por eso la validación es **write-time y fail-closed en Greenhouse**, no reconcile-time.
- **El grant OAuth es el techo; la proyección es el piso.** Por el acoplamiento `capabilityScopes ⊆ requiredScopes` del broker, una capability que el token no presenta no se puede conceder por usuario: `desiredPerMember ⊆ policy.capabilityScopes`, enforceado en el write. Ampliar el techo sigue exigiendo el **rollout de 3 pasos zero-downtime** de ADR-010, sin excepción.
- **Reconciliación:** el reconciliador existente deja de derivar `desiredCapabilities` de la política y pasa a leerlas per-member. Los grants ya son revisionados, expirables y con historia acotada append-only (ADR-006). No hay primitive nueva del lado de Globe.
- 🔴 **Esta mitad NO se habilita hasta `tenancy_mode = enforced`** (Contexto §7). Antes de eso la superficie se puede construir y correr en **shadow con un reporte de divergencia visible**, pero **no puede presentarse al operador como control efectivo**. Un toggle que no niega nada es peor que su ausencia.

### 8. Break-glass con expiración, motivo, aprobación y revocación automática — y su propio contador

El break-glass no se prohíbe: se le pone reloj y testigo. Deja de ser un `add-iam-policy-binding` que alguien tiene que acordarse de deshacer y pasa a ser un procedimiento con **expiración por construcción**: motivo obligatorio, autorización humana atribuida, TTL corto, **revocación automática** al vencer y **readback del corte verificado** (no se asume que la revocación propagó — la lección ya registrada del rollout de TASK-1503).

Y lleva **su propio contador y su propia señal**: `globe.credit_admin.break_glass_active` (steady = 0). El diagnóstico que importa no es *"¿se usó?"* sino *"¿se está usando como operación normal?"* — tres usos para la misma clase de acto ya respondieron eso una vez, y sin contador la respuesta la da la memoria de quien estuvo.

### 9. Observabilidad del conflicto: la fase de negación se hace legible sin filtrar saldos

Prerrequisito, no extra (Contexto §8). Tres movimientos, en orden de valor:

1. **Una razón de fase estable y sanitizada** acompaña al `conflict` de los comandos de administración de crédito: distingue `approval_stale` / `approval_invalid` / `maker_checker_required` / `pool_paused` / `pool_exhausted` / `month_cap_exceeded` / `project_cap_exceeded` / `policy_unavailable` / `replay_fingerprint_mismatch`. **Es un enum cerrado**, no prosa: sin SQL, sin saldos, sin payload. El 409 sigue siendo 409 — lo que cambia es que el operador sabe **qué fase** lo produjo.
2. **`globe.credits.budget.evaluate` y `budget.availability.get` pasan a `ui: available`** para principals de administración. Son readers, devuelven un `reason` tipado y `policyAvailable` vs `ledgerAvailable` — y **son exactamente lo que hoy obliga a sondear por el lane privado**. Que el desambiguador viva fuera del alcance de quien tiene que diagnosticar es el bug, no una protección.
3. **El plan del `propose` incluye la evaluación**, así que el operador ve *por qué* está bloqueado **antes** de proponer, no después de un 409.

Esto **cierra la mitad de diagnóstico de `ISSUE-124`** y evita que el carril nuevo herede la misma ceguera.

### 10. Rollout: flags default-OFF, shadow antes de enforced, y el retiro del carril viejo al final

- `GLOBE_CREDIT_ADMIN_LANE_ENABLED` declarado en `variables.tf` con default `false` — **nunca sólo en `terraform.tfvars`**, que está gitignoreado. Y **cableado a los recursos** antes de considerarlo prendible: si `grep -rn <flag> infra/terraform/` devuelve una sola línea, esa línea es su declaración y no está conectado a nada.
- Orden no negociable: **carril nuevo verde con un caso real → retiro de la autoridad de crédito del caller genérico → retiro del HMAC**. Al revés se corta el único camino operable antes de tener el reemplazo.
- La mitad de capabilities espera `tenancy_mode = enforced` y su gate zero-drift propio.

---

## Alternativas consideradas

| Alternativa | Decisión |
|---|---|
| **Darle `secretmanager.versions.access` a `greenhouse-portal@` y seguir con los scripts** | **Rechazada, y es la tentación fuerte porque son 5 minutos.** `greenhouse-portal@` es la identidad de runtime del control plane de **Greenhouse**; usarla para administrar el crédito de **Globe** es admin implícito cross-plataforma. Que no pueda leer el secreto no es el problema: es el síntoma de que esa identidad no tiene por qué poder hacerlo. Y no arregla nada de lo que importa — el maker-checker seguiría colapsado en un proceso (Contexto §3) y el HMAC seguiría siendo forjable por quien lo lee. |
| **Ampliar el radio del secreto HMAC a una SA dedicada de credit-admin** | **Rechazada.** Es la versión mejor peinada de la anterior. Mantiene la propiedad de raíz — **leer implica forjar** — y sólo cambia quién tiene ese poder. La salida no es ampliar el radio: es mover la firma adentro y volverla asimétrica. |
| **Reusar `globe-promotion-promoter@` / `globe-promotion-checker@` por tener forma de maker-checker** | **Rechazada.** Pertenecen al saga de promoción de **modelos** (ADR-009 / TASK-1527, `locals.tf:9-14`). Reusarlas sería tomar prestada una separación de deberes ajena para autorizar **gasto**, y su disyunción está diseñada contra otro riesgo. ADR-010 ya estableció que una clase de workload nueva merece su identidad propia y disjunta. |
| **Aprobador y ejecutor como dos identidades dentro del mismo servicio, impersonadas por `api_runtime`** | **Rechazada por ser disyunción cosmética.** Si `api_runtime` necesita `tokenCreator` sobre las dos, tiene las dos mitades y el control no existe — sólo hay más YAML. La disyunción se paga con una unidad de ejecución separada o no se paga. |
| **Un solo comando `credits.month.fund` sin `propose`** | **Rechazada, y el motivo sobrevive al cambio a un solo confirmador.** Sin propuesta durable el humano confirmaría **un payload, no un plan evaluado** — no vería el tope resultante, el disponible resultante ni la razón actual de `budget.evaluate`, que es justamente lo que evita proponer a ciegas y comerse un 409. Y desaparece la ventana de expiración, que es lo que impide confirmar sobre un estado que ya cambió. La propuesta no existe para darle trabajo a un segundo actor: existe para que la confirmación sea informada. |
| **Una saga distribuida para grant + política** (el diseño objetivo del Delta (4)) | **Rechazada tras verificar el sustrato — y esto corrige el diseño objetivo.** El delta pedía *"comandos independientes con readback y reconciliación explícita del estado parcial"*, razonable si los agregados vivieran en stores distintos. **Viven los tres en el mismo Postgres de Globe**, así que la atomicidad real es alcanzable y una saga sería aceptar un estado parcial que no hace falta aceptar. Los comandos independientes **se conservan** para las intenciones simples; lo que se corrige es que la intención compuesta **no** necesita saga. |
| **Administrar créditos desde un CLI mejorado en vez de una superficie en el portal** | **Rechazada.** Un CLI no tiene identidad humana verificable, ni entitlement, ni auditoría, ni un segundo actor — es precisamente el conjunto de propiedades que el maker-checker necesita. Y viola Full API Parity al revés: la capability existiría sin superficie gobernada. Los dos scripts de la sesión anterior se **retiran** cuando exista el comando; su premisa (firmar desde el cliente) contradice el diseño. |
| **Diferenciar capabilities por usuario en el token OAuth** | **Rechazada por un hecho técnico duro.** El broker acopla `capabilityScopes ⊆ requiredScopes`: un scope otorgable-pero-opcional no es representable, y agregarlo lo vuelve **requerido para todos**. Es exactamente el mecanismo que tumbó todo el login de Globe en ADR-010. La diferenciación por usuario vive en la proyección; el token es el techo. |
| **Modelar las capabilities de Globe en el `capabilities_registry` de Greenhouse** | **Rechazada.** Volvería a Greenhouse autoridad del **vocabulario** de Globe, y como `parseGlobeCapabilities` descarta lo desconocido, un drift no daría error: daría desaparición silenciosa. Greenhouse es dueño del **desired state**; Globe del vocabulario. Compartir el registry es una decisión de frontera con su propia ADR. |
| **Esperar a que el mes reinicie y no construir nada** | **Rechazada como estrategia, aceptada como mitigación de hoy.** El reinicio del mes libera el tope y desbloquea imagen/video sin tocar nada, y por eso no hay urgencia de break-glass. Pero deja intacta la causa: una identidad con las dos mitades y una llave como único freno. |

---

## Los 4 pilares

### Safety

- **Qué puede salir mal:** que un actor —humano o proceso— se **autofinancie**. Es el riesgo central y el único que justifica todo el aparato: quien puede fondear y gastar con la misma identidad puede convertir presupuesto en gasto sin testigo.
- **Gates:** (1) capabilities dedicadas y **disjuntas** por propósito, nunca un rol admin amplio; (2) `propose` read-only vs `confirm` como único punto de mutación; (3) una **confirmación humana autenticada** de Greenhouse —el LLM nunca la cruza— más un **segundo confirmador distinto** cuando `requireSecondConfirmer` o el techo por operación lo exijan, enforceado con constraint en Postgres **y** re-verificado en Globe; (4) firma **asimétrica** en KMS accesible sólo por el aprobador, que no puede mutar; (5) ejecutor que no puede firmar; (6) el broker de administración es una identidad **distinta** del reconciliador de tenancy; (7) el caller genérico **pierde** la autoridad de crédito; (8) break-glass con TTL, motivo, aprobación, revocación automática y readback del corte.
- **Blast radius si sale mal:** hoy — **plataforma completa**: una sola identidad impersonable con fondeo + gasto, frenada por la custodia de un archivo. Después — acotado a **un workspace por intención**, con una confirmación humana atribuida, una firma no forjable, y audit append-only que hace el fondeo reconstruible aunque el aprobador sea el dueño del presupuesto.
- **Tres casos de abuso y la capa que los detiene:** *(a)* un agente intenta fondear con la sesión del operador → el `propose` **no muta** y el `confirm` exige una confirmación **humana** que el agente no puede emitir (y con `requireSecondConfirmer` ON, además un segundo actor); *(b)* alguien lee la clave para forjar una aprobación → con KMS asimétrico leer la pública sólo permite **verificar**; *(c)* un proceso comprometido intenta ser maker y checker → el aprobador (que no puede mutar) verifica la disyunción antes de firmar, y el ejecutor no puede fabricar la firma.
- **Verificado por:** el guard de disyunción de callers (`app.ts:1222`, ya existente para tenancy operator vs broker) extendido a las clases nuevas; test de cobertura capability↔grant; señal `globe.credit_admin.caller_authority_drift` (steady = 0) que detecta si el caller genérico volvió a cargar autoridad de crédito.
- **Residual risk, nombrado:** el compromiso **simultáneo** del aprobador y del ejecutor sigue permitiendo el acto — ninguna separación de deberes sobrevive a eso, y no se está mitigando. Segundo residual, más probable: el break-glass sigue existiendo, y su expiración automática mitiga el olvido pero no el mal uso deliberado dentro de la ventana. Tercero: el `propose` filtra **agregados de presupuesto** (tope, disponible, razón) al plano de Greenhouse — es la señal que el operador necesita y es una ampliación consciente de lo que hoy sale por el transporte.

### Robustness

- **Idempotencia:** sí. Clave derivada del `proposalId` (`fund:<proposalId>`), a una operación por propuesta. Un `confirm` repetido devuelve el estado resultante, no un segundo grant. Se reusa el patrón `grant:<grantId>` que `issueCreditGrant` ya aplica al asiento de ledger.
- **Atomicidad:** **una** transacción Postgres para grant + asiento + política. Exige enhebrar el `TransactionPort` de `packages/database` por `CreditAdministrationStorePort` y `CreditAdministrationLedgerPort`, que hoy no pueden compartirla (punto 6).
- **Protección de carrera:** concurrencia optimista existente (`expectedPolicyId` + `expectedVersion`, `expectedVersion` de pool y budget) resuelta **dentro** de la transacción; `SELECT ... FOR UPDATE` sobre la política vigente del workspace; la idempotencia vive en SQL (`ON CONFLICT DO NOTHING` + re-lectura), **nunca** read-then-write — entre réplicas eso es una carrera cuyo síntoma visible sería un grant duplicado, y los servicios corren a `maxScale=3`.
- **Cobertura de constraints:** `CHECK` de que confirmante ≠ proponente en la tabla de propuestas de Greenhouse; `CHECK` de `expiresAt > proposedAt`; `UNIQUE` sobre `(workspaceId, proposalId)`; índice parcial `UNIQUE` sobre la política activa por workspace; `CHECK` de estado de la propuesta contra su máquina de estados; FK del desired state per-member contra `client_users.user_id` y contra el workspace bindeado.
- **Verificado por:** test de concurrencia con dos `confirm` simultáneos sobre la misma propuesta (uno gana limpio); test de que una propuesta vencida se rechaza con la fase correcta; test de que el fingerprint alterado se rechaza; test de la transacción parcial (fallo del publish de política deja **cero** grant). Todos registrados en el script `test` de su package — en Globe los scripts **enumeran los archivos a mano**, y un test no registrado no corre y deja la suite verde por no haberlo mirado.

### Resilience

- **Política de reintento:** el `confirm` **no se reintenta a ciegas**. Ante timeout del cliente se **lee el estado primero** (la lección ya canonizada: un `execute` síncrono puede exceder el timeout del cliente y completar bien en el servidor; reintentar ahí gasta de nuevo). La firma de KMS sí se reintenta, acotada con backoff, porque es previa a la transacción y no tiene efecto.
- **Dead letter:** una propuesta que expira sin confirmarse queda en estado terminal `expired` — **append-only**, nunca borrada — y visible en la superficie. Un `confirm` que falla después de firmar deja la propuesta en `confirm_failed` con la razón de fase, resumible por idempotencia.
- **Señales de reliability** (steady = 0 las cuatro primeras): `globe.credit_admin.break_glass_active`; `globe.credit_admin.caller_authority_drift` (el caller genérico volvió a cargar crédito); `globe.credit_admin.partial_funding_state` (grant posteado sin su política — debería ser imposible por la transacción, y por eso mismo su aparición es la señal de que la transacción se rompió); `globe.credit_admin.legacy_hmac_approval_used` (mide el retiro del HMAC y **es lo que le da fecha real** al punto 4); y `globe.credit_admin.capability_desired_drift` (desired per-member vs proyectado), que en `shadow` es el reporte de divergencia del punto 7.
- **Audit trail:** append-only en **los dos lados**. Greenhouse registra la propuesta, la confirmación y el entitlement ejercido; Globe registra la mutación con `correlationId`, `idempotencyKey`, fingerprint y la **firma** como evidencia verificable. La cadena causal mínima se conserva: `greenhouse auth audit id → intención atribuida → correlation id → command id → grant/policy id`.
- **Procedimiento de recuperación:** runbook en `docs/operations/creative-studio/`, con el orden explícito (leer estado → decidir → reusar la clave de idempotencia) y la prohibición de SQL manual sobre agregados de crédito.

### Scalability

- **Big-O del hot path:** la administración de crédito **no es un hot path** — son unidades de intenciones por mes, no por segundo. El `propose` es O(1) sobre índices existentes (política vigente por workspace + candidatos de funding por pool). El único punto de contención real es la **política activa por workspace**, serializada a propósito por el `FOR UPDATE`: es exactamente lo que debe ser serial.
- **Cobertura de índices:** los existentes de `credit_pools` / `credit_grants` / `credit_budget_policies` por `(workspace_id, status)`; nuevo índice de la tabla de propuestas por `(workspace_id, state, expires_at)` para el barrido de expiración.
- **Caminos async:** el barrido de expiración de propuestas y la revocación automática del break-glass son **cron**, no request path. Del lado de Greenhouse van por **Cloud Scheduler + ops-worker**, no por Vercel cron: son async-críticos y Vercel no corre crons en staging.
- **Costo a 10x:** lineal y despreciable. La única pieza con costo marginal nuevo es **KMS** (por operación de firma, unidades por mes) y **una unidad Cloud Run más** con `minScale=0` — o sea costo ~cero en reposo. El escalamiento que sí importa es **de personas**: la mitad de capabilities crece O(miembros × capabilities) en el desired state, y la proyección de Globe ya está dimensionada para eso (grants revisionados con historia acotada, ADR-006).
- **Paginación:** los readers de propuestas, grants y desired state per-member nacen paginados por cursor con orden estable, no `OFFSET`.

### Cuando los pilares chocan (nombrado, no resuelto en silencio)

- **Safety vs Resilience — y acá está la lección más cara de esta ADR.** La primera versión exigía **dos humanos distintos**, y en una organización donde el aprobador ES el dueño del presupuesto eso no frenó un abuso: frenó **el trabajo**, y desvió la operación al break-glass tres veces. **Un control que nadie puede satisfacer no protege, desvía** — y el desvío es peor que la ausencia, porque el break-glass otorga MÁS autoridad que el camino que reemplaza y depende de que alguien se acuerde de revocarlo. Resolución: el segundo humano baja de invariante a **política por workspace y por umbral**, default OFF donde no hay segundo actor; T1 (el agente nunca confirma) y T2 (aprobador ≠ ejecutor entre service accounts) se quedan porque **cuestan cero al operador**; y la prevención que se retira se reemplaza con **detección** (audit atribuido + señal + techo). El break-glass se conserva sólo como válvula, con TTL y contador — y el objetivo declarado es que su contador quede en cero, porque ahora el camino normal funciona.
- **Safety vs Scalability de proceso.** Una unidad de ejecución más y una clave de KMS son complejidad operativa real, agregada para un flujo de baja frecuencia. Se acepta porque el activo protegido no es la frecuencia sino el **poder de fondeo**, y porque la alternativa medida —una sola identidad con las dos mitades— ya está en producción hoy.

---

## Dependencies & Impact

- **Depende de:**
  - **Bloqueante para la mitad de capabilities:** `tenancy_mode = enforced` y su gate zero-drift (`TASK-1511`). En `shadow` esa mitad es inerte.
  - **No bloqueante:** el ledger comercial durable (`TASK-1468`) ya existe y es el que la política consulta. El carril `sister-platform` ya existe y está probado en tenancy. Cloud KMS **no está habilitado** hoy en el proyecto de Globe (`grep kms infra/terraform/` = 0) — hay que sumarlo a `local.enabled_services`, y si el recurso nuevo no tiene arista implícita hacia la API, darle `depends_on` explícito y **arreglar la carrera en el HCL**, no reintentar a ciegas.
  - Ampliar el techo de scopes OAuth, si la administración por usuario lo necesita, exige el **rollout de 3 pasos zero-downtime** de ADR-010.
- **Impacta a:**
  - `ISSUE-124` — el punto 9 cierra su mitad de diagnóstico (la fase de negación deja de ser opaca). El guard de "un solo grant activo" que el issue descarta sigue siendo un tema aparte.
  - `src/lib/globe/tenancy-reconciler.ts` — deja de derivar `desiredCapabilities` de la política del cliente OAuth (línea 216) y pasa a leerlas per-member.
  - `apps/studio-web/src/app.ts` — `internalServicePrincipal` pierde la autoridad de crédito del caller genérico y gana dos clases de workload nuevas.
  - `packages/domain/src/credit-administration.ts` — coverage de `sister-platform`, comandos nuevos, `CreditApprovalVerifierPort` con verificador dual, ports transaction-scoped.
  - `scripts/raise-credit-monthly-cap.mjs` y `scripts/fund-internal-credit-month.mjs` — **se retiran** cuando el comando exista; su premisa (firmar desde el cliente) contradice el diseño.
  - `TASK-1521` (runtime comercial) y `TASK-1480` (readiness comercial) — el fondeo de un workspace de cliente pasa por este carril.
- **No impacta:** ADR-005 §3/§4 (trust boundary), ADR-014 (payload de browser), ADR-009/ADR-010 (saga y attestation de promoción, cuyas identidades **no se reusan**), el spend fence de seguridad del Lab, el provider boundary, la frontera de deployables de `EPIC-027` (el deployable nuevo es de Globe).
- **Archivos owned por esta decisión:** en Globe — `packages/{contracts,domain}/src/credit-administration.ts`, `apps/studio-web/src/{app,main,credit-admin-approval,dispatch}.ts`, `apps/credit-approver/**` (nuevo), `infra/terraform/{locals,iam,secrets,kms,cloud_run_services,variables}.tf`. En Greenhouse — `src/lib/globe/` (broker de administración + desired state per-member), `src/lib/sister-platforms/globe-oauth-grants.ts`, la superficie de administración en `/admin/*` y su capability en `src/lib/entitlements/runtime.ts` + `capabilities_registry`.

---

## Reglas duras

- **NUNCA** dejar que una identidad cargue a la vez autoridad de **fondeo** y de **gasto**. Hoy `globe:service:internal-caller` las tiene las dos (`app.ts:3515` + `3554-3562`); retirárselas es parte de esta decisión, no un follow-up.
- **NUNCA** darle `secretmanager.versions.access` sobre un secreto de aprobación de Globe a `greenhouse-portal@` ni a ninguna identidad de Greenhouse. La llave de aprobación **nunca sale del runtime de Globe**.
- **NUNCA** usar el reconciliador de tenancy (`greenhouse-portal@`) para administrar crédito ni capabilities de Globe: una identidad por propósito, y la que reconcilia tenancy no es la que mueve plata.
- **NUNCA** reusar las identidades del saga de promoción de modelos (`globe-promotion-*`) para autorizar gasto: su separación de deberes está diseñada contra otro riesgo.
- **NUNCA** dejar que un **agente o proceso** proponga y confirme: la confirmación es de un humano autenticado, siempre, y el LLM no la cruza. El **segundo humano** es política (`requireSecondConfirmer` por workspace + techo por operación), **no invariante** — exigirlo donde no hay segundo actor no protege, desvía al break-glass (Delta 2026-07-26). Y **NUNCA** apoyar ninguna de las dos disyunciones sólo en `approval.proposedBy !== context.actor.principalId`: para un caller de workload ese chequeo es **vacuo**, porque el principalId es una constante por clase (Contexto §3).
- **NUNCA** volver a un esquema de aprobación **simétrico**: con HMAC, quien verifica puede forjar. La firma es asimétrica y `asymmetricSign` es exclusivo del aprobador.
- **NUNCA** dejar un verificador dual (HMAC + KMS) sin **fecha de retiro declarada** y sin la señal que mide el uso del legacy: un dual sin retiro es un esquema simétrico con pasos extra.
- **NUNCA** emitir el grant y mover la política en dos transacciones dentro de la intención compuesta: los tres writes viven en la misma base y van en **una** transacción.
- **NUNCA** reintentar un `confirm` tras un timeout del cliente sin leer primero el estado: el servidor puede haber completado.
- **NUNCA** presentar al operador un control de capabilities por usuario mientras `tenancy_mode` sea `shadow`: la proyección observa y no niega, así que el toggle **mentiría**.
- **NUNCA** conceder por usuario una capability fuera del `capabilityScopes` del grant OAuth: `parseGlobeCapabilities` la **descarta en silencio**, así que la validación es write-time y fail-closed en Greenhouse, nunca reconcile-time.
- **NUNCA** agregar un capability scope al grant del broker de Globe en un solo movimiento: es el rollout de 3 pasos zero-downtime de ADR-010, o se cae todo el login.
- **NUNCA** modelar las capabilities de Globe en el `capabilities_registry` de Greenhouse: Greenhouse es dueño del **desired state**, Globe del **vocabulario**.
- **NUNCA** crear una identidad paralela para las personas de Globe: el desired state per-member se ancla al `Persona` canónico vía `client_users.user_id`.
- **NUNCA** convertir el break-glass en camino normal, ni concederlo sin motivo, aprobación, TTL, revocación automática y **readback del corte verificado**.
- **NUNCA** exponer saldos, política cruda, SQL ni payload en la razón de fase del conflicto: es un **enum cerrado** y sanitizado.
- **NUNCA** declarar el carril "prendido" sin verificar las dos cosas de siempre: que el flag esté **cableado** (`grep` en `infra/terraform/` devuelve más que su declaración) y que la **imagen desplegada** contenga el código que lo lee.
- **SIEMPRE** retirar la autoridad vieja **después** de que la nueva esté verde con un caso real, y **nunca** antes: al revés se corta el único camino operable.
- **SIEMPRE** registrar cada test nuevo en el script `test` de su package en Globe: los scripts enumeran los archivos a mano, y un test no registrado deja la suite verde por no haberlo mirado.
- **SIEMPRE** que esta capability nazca, nace con contrato gobernado por Full API Parity: la UI del portal, Nexa y MCP la operan por construcción, y Nexa **nunca** cruza el gate de confirmación.

---

## Lo que deliberadamente NO se decide

- **La forma exacta de la superficie de administración en el portal** (ruta, layout, jerarquía, motion). Necesita su Discovery de UI con las skills de product-design y su verificación GVC. Lo que esta ADR fija es que **existe**, dónde vive la autoridad y qué contrato consume.
- **El modelo de roles de administración de crédito del lado de Greenhouse** — si el proponente y el confirmante son dos capabilities distintas (`globe_admin.credit_funding.propose` / `.confirm`) sobre los ROLE_CODES existentes, o si merece un rol nuevo. Se decide con la task, contra los 14 ROLE_CODES reales.
- **Qué pasa con las aprobaciones HMAC históricas** cuando el legacy se retire: se conservan como evidencia verificable con el secreto archivado, o se marcan como verificables-sólo-hasta-la-fecha-de-corte. Es una decisión de retención, no de arquitectura.
- **Si el aprobador es una unidad Cloud Run o un Cloud Run Job invocado por request.** Esta ADR fija la **separación física**; la forma la elige la task contra el perfil de latencia real del `confirm`.
- **Si la administración de crédito llega a cubrir workspaces de cliente externos**, y con qué gates comerciales adicionales. Hoy el alcance es el workspace interno y `greenhouse-org:efeonce`; los externos siguen gated por `TASK-1480`.
- **Si el desired state per-member se convierte en la fuente de un modelo de "perfiles" de Globe** (paquetes de capabilities con nombre) en vez de capabilities suelta por persona. Es una capa de conveniencia encima del mismo primitive; se decide cuando haya más de un puñado de miembros.
- **El guard de "un solo grant activo"** que `ISSUE-124` descarta como causa. Esta ADR cierra la ambigüedad del diagnóstico, no la política de emisión.

---

## Gatillos de revisión

- **Si `tenancy_mode` no llega a `enforced`** antes de que la superficie de capabilities esté lista: **no shippear esa mitad**. Shippear la mitad de créditos sola es correcto y deja la de capabilities esperando su gate — nunca al revés, y nunca presentando un control inerte.
- **Si la señal `globe.credit_admin.legacy_hmac_approval_used` no llega a cero** en la ventana declarada: no retirar el HMAC y reabrir esta ADR con la evidencia de quién lo sigue usando y por qué.
- **Si `globe.credit_admin.break_glass_active` marca un cuarto uso** para esta clase de acto después del cutover: el carril nuevo no está resolviendo el problema que motivó la ADR. Detener y revisar, no seguir por inercia.
- **Si la separación física del aprobador se vuelve impracticable** (latencia del `confirm`, costo operativo del deployable): reabrir con la medición, **no** colapsarla a impersonación dentro de un proceso — esa alternativa ya está rechazada por ser cosmética.
- **Si `TASK-1480` da go antes de que este carril esté cerrado:** el fondeo de un workspace de cliente pasaría por break-glass. Reabrir prioridades.

---

## Roadmap por slices

> 🔴 **Re-secuenciado 2026-07-26 (2) — la primera versión de este roadmap tenía un error de orden que costó un
> break-glass evitable.** Ponía **KMS y la topología de identidades ANTES del comando**, como si el comando
> dependiera de ellos. **No depende.** El runtime de Globe **ya tiene el secreto en su env** y **ya tiene el
> verificador cableado**: lo único que falta es **una superficie que firme adentro**. Y el lane hacia Globe **ya
> funciona hoy sin IAM nuevo** — `greenhouse-portal@` ya puede impersonar `greenhouse-globe-caller`
> (`iam.tf:16-20`, verificado). Y como **Greenhouse es la superficie**, el operador confirma con su sesión de
> Greenhouse: **no necesita ninguna capability de Globe**, así que tampoco necesita el rollout de 3 pasos de
> scopes OAuth que yo había puesto como techo.
>
> **Consecuencia:** el comando gobernado es **construible ahora**, contra el HMAC existente — que ya nunca sale
> del runtime, porque eso ya es cierto hoy. **KMS asimétrico, aprobador ≠ ejecutor y el broker dedicado son
> HARDENING: mejoran la postura, no habilitan la capacidad.** Secuenciarlos primero es lo que dejó al operador
> pagando el break-glass por cuarta vez para llegar al mismo lugar.
>
> **Regla que se deriva y que vale más que este roadmap:** cuando una ADR de gobernanza bloquea una capacidad que
> la gente necesita **hoy**, el primer slice es **la capacidad gobernada**, y el endurecimiento de su postura va
> después. Al revés, la gobernanza no se adopta: se esquiva.

- **Slice A — la fase de negación (✅ ENTREGADO 2026-07-26).** Razón de fase cerrada y sanitizada acompañando al
  `conflict` en las tres clases de error de crédito; `approval()` separa sus tres fallas; los nueve
  `err('conflict')` del store nombran su fase, con drift guard. **Cierra la mitad de diagnóstico de `ISSUE-124`.**
  Cero identidades, cero KMS, cero flags. El flip de `ui: available` **salió** de este slice: no arreglaba nada
  (`#authorize` evalúa coverage antes que capability, así que habría cambiado `policy_blocked` por
  `access_denied`) y se reasignó al Slice F.
- **Slice B — `credits.month.fund.propose` / `.confirm` sobre el HMAC existente. ESTE ES EL QUE DESBLOQUEA.**
  Los dos comandos, la propuesta durable con su máquina de estados, la firma **dentro del runtime** (el api ya
  tiene el secreto), grant + asiento de ledger + política publish/supersede en **UNA transacción Postgres**, los
  ports transaction-scoped, idempotencia en SQL por `proposalId`, readback y tests de concurrencia. Coverage
  `sister-platform: available`. **Criterio de salida: el fondeo del mes ejecutado con UNA confirmación humana y
  CERO break-glass.**
- **Slice C — la superficie de confirmación en Greenhouse.** ⚠️ **Regla de ordenamiento que `ISSUE-126` hizo
  explícita, y que este slice DEBE respetar:** las capabilities nuevas (`globe.credits.funding.propose`/`.confirm`)
  viven en el vocabulario de Globe, y Greenhouse lo consume como **tarball `file:` vendorizado**. Agregarlas al
  `capabilityScopes` del broker **antes** de re-vendorizar el tarball reproduce `ISSUE-126` exactamente: el
  reconciliador de tenancy tumba la reconciliación completa del workspace con `globe_tenancy_capability_invalid`.
  **Primero se re-vendoriza el vocabulario en Greenhouse (`pnpm worker:build-contract-gate` verde), después se
  mueve el scope.** Y ojo: el tarball está pinneado en `0.0.1` y **cambia de contenido sin cambiar de versión**, así
  que el lockfile no delata el drift. El broker (`src/lib/globe/**`, reusando
  `createGreenhouseGlobeClient` sobre el lane que ya funciona), la capability de Greenhouse + su grant en el mismo
  PR, la tabla append-only de intenciones, y el punto donde el operador confirma. **Sin scope OAuth nuevo en
  Globe: el humano confirma con su identidad de Greenhouse, no con una capability de Globe.** Retiro de los dos
  scripts de firma cliente.
- **Slice D — endurecimiento de la firma: KMS asimétrico y verificador dual.** Habilitar `cloudkms`, la clave, el
  aprobador como unidad separada con `signerVerifier`, el verificador que acepta ambos formatos con **fecha de
  retiro declarada** y la señal que mide el uso del legacy. **Mejora la postura de un carril que ya funciona** —
  con HMAC, quien verifica puede forjar; con firma asimétrica, verificar y forjar se separan.
- **Slice E — endurecimiento de la topología: las cuatro identidades disjuntas y el retiro de la autoridad
  vieja.** Broker de administración distinto del reconciliador de tenancy, aprobador y ejecutor disjuntos por
  unidad de ejecución, guard de disyunción de callers extendido, y el caller genérico **pierde** las cuatro
  capabilities de crédito con su señal de drift vigilando. **Sólo con el Slice B verde.**
- **Slice F — el desambiguador al alcance del operador.** `budget.evaluate` y `budget.availability.get` en `ui`
  **con** su capability en el grant humano (rollout de 3 pasos de ADR-010), o por la vía que no requiera ampliarlo
  (la razón viajando en el estimado, que el humano ya consume). Decidir la vía con evidencia.
- **Slice G — capabilities por usuario.** Bloqueado por `tenancy_mode = enforced` (`TASK-1511`) **y por `ISSUE-126`,
  que es el gate más duro de los dos.** 🔴 Descubierto el 2026-07-26: la reconciliación Greenhouse→Globe **lleva
  dos días fallando cada 5 minutos con su Cloud Scheduler en `ENABLED`** (`globe_tenancy_capability_invalid`,
  causado por drift de contenido del tarball `file:` de `@efeonce-globe/contracts` — 51 capabilities instaladas vs
  65 vivas — disparado por el rollout de scopes de ADR-010 el 2026-07-24). Con `shadow` la proyección observa y no
  niega, así que nada se cayó; **en `enforced` una proyección stale DENIEGA TODO.** Flipear `enforced` hoy sería un
  outage de todo el acceso humano a Globe. **Cerrar `ISSUE-126` + su señal de frescura es prerrequisito del flip**,
  no un follow-up.
  Desired state per-member en Greenhouse anclado al `Persona` canónico, validación write-time contra el techo OAuth,
  reconciliador leyendo per-member, señal de divergencia y la superficie por persona. Desired state
  per-member en Greenhouse anclado al `Persona` canónico, validación write-time contra el techo OAuth,
  reconciliador leyendo per-member, señal de divergencia y la superficie por persona.
- **Slice H — break-glass gobernado y retiro del HMAC.** TTL, motivo, autorización atribuida, revocación
  automática, readback del corte y su contador. El HMAC se retira cuando la señal del legacy esté en cero por la
  ventana declarada, con `api_runtime` perdiendo el acceso al secreto.

> **Delta 2026-07-26 (3) — el Slice B quedó VERIFICADO CON UN CASO REAL, y eso activa la regla de retiro del §10.**
> El primer fondeo mensual real corrió punta a punta por el carril: `propose` (plan legible: tope 400→800,
> disponible 344→444, gastado 166) → `confirm` **en 905 ms**, confirmado por el operador con su **sesión real**
> (atribución `user-efeonce-admin-julio-reyes` en las dos filas de `globe_credit_funding_intents`), grant `posted`
> +100 + política cap-800 + asiento de ledger en **una** transacción, `pg_locks` 0/0/0 después. Sin break-glass.
> Antes hubo que cerrar el **defecto 7 de TASK-1566**: los stores transaccionales abrían conexiones propias dentro
> de la transacción del confirm (`markGrantPosted` re-pedía el advisory lock desde otra conexión → cuelgue con el
> crédito del workspace bloqueado). Regla que quedó escrita: dentro de la transacción, NINGÚN port abre conexión
> propia.
>
> Dos hechos medidos que ajustan el §5 (idempotencia): el broker de Greenhouse exige **clave de idempotencia
> propia** para el confirm (reusar la del propose → `409 already_recorded`), y su anti-replay es **por propuesta**
> — registrada la decisión, ningún confirm posterior pasa, con cualquier clave. El replay idempotente del dominio
> de Globe queda inalcanzable a través del broker; el invariante (ningún segundo grant) se garantiza en dos capas
> y se verificó (`count(grants)=1` tras dos replays).
>
> Consecuencia de rollout: la condición del §10 («carril nuevo verde con un caso real») está cumplida → procede el
> **retiro de las 4 capabilities de crédito del caller genérico** (`grant.issue`/`grant.correct`/`policy.manage`/
> `budget.manage`) con su señal de drift, y el **retiro de los scripts de firma cliente** (Slice C). El resto del
> Slice E (identidades disjuntas por unidad de ejecución) y el Slice D (KMS) siguen pendientes como hardening.
> Runbook operativo: `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`; explicación funcional:
> `docs/documentation/creative-studio/fondeo-gobernado-creditos-globe.md`.
